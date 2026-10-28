// MOLLIE (24/10) : le bouton « Payer » n'apparait dans l'application que si
// mollieEtat repond autorise:true pour le compte connecte.
// Remplace Lemon Squeezy : Bancontact obligatoire (Raci).
// Paiements UNIQUES, pas d'abonnement : 1er mois 80 EUR ; mois suivant
// 60 EUR seulement pour un client deja paye, tant que son acces
// nutrition est ouvert (44 jours apres le dernier paiement).
// La cle Mollie ne quitte jamais le serveur :
//   firebase functions:secrets:set MOLLIE_API_KEY   (test_... puis live_...)
// Appels directs a l'API REST Mollie (fetch natif de Node 22), sans
// dependance supplementaire.
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const reduction = require("./reduction");

const MOLLIE_API_KEY = defineSecret("MOLLIE_API_KEY");
const MOLLIE_TEST_EMAILS = defineSecret("MOLLIE_TEST_EMAILS");
const API = "https://api.mollie.com/v2";
const REGION = "europe-west1";
// 22/10 Raci : acces nutrition = mois paye + 2 semaines = 44 jours apres
// le dernier paiement. Le 60 EUR n'est accepte que pendant cet acces.
// Identique a app-v2/src/store/coach.js et functions/index.js (JOURS_ACCES).
const JOURS_ACCES = 44;
// Montants fixes COTE SERVEUR : le navigateur n'envoie que le produit.
const PRODUITS = {
  plan: {montant: "80.00", description: "BelFit - 1er mois de coaching alimentaire"},
  maj: {montant: "60.00", description: "BelFit - Mois suivant de coaching alimentaire"},
};
const RETOUR = "https://www.belfit.be/v2/?onglet=premium&coach=questionnaire&type=";
const WEBHOOK = "https://" + REGION + "-repz-baf60.cloudfunctions.net/mollieWebhook";

function db() { return admin.firestore(); }

// GARDE-FOU (24/10) : avec une cle « test_ », un faux paiement reussi ouvrirait
// le coaching et l'IA illimitee en production. Tant que la cle est une cle de
// test, seuls les e-mails de la liste secrete MOLLIE_TEST_EMAILS (adresses
// separees par des virgules, secret Firebase : jamais dans le depot, qui est
// public) peuvent creer ET activer un paiement. L'e-mail doit etre VERIFIE
// dans le jeton Firebase : sinon n'importe qui s'inscrirait avec l'adresse
// d'un autre. Les adresses ne sont jamais logguees.
// Avec une cle « live_ », seul l'interrupteur OUVERT_A_TOUS (ci-dessous)
// ouvre le paiement a tous les comptes ; sans lui, la liste reste la seule
// a pouvoir payer. Ouvrir a tous = decision separee de Raci : passer
// OUVERT_A_TOUS a true, dans un commit a part.
const OUVERT_A_TOUS = false;
function cleDeTest() { return MOLLIE_API_KEY.value().startsWith("test_"); }
function emailListe(email, verifie) {
  if (!email || verifie !== true) return false;
  const liste = String(MOLLIE_TEST_EMAILS.value() || "").split(",")
      .map((x) => x.trim().toLowerCase()).filter(Boolean);
  return liste.includes(String(email).trim().toLowerCase());
}
function paiementPermis(email, verifie) {
  if (cleDeTest()) return emailListe(email, verifie);
  return OUVERT_A_TOUS || emailListe(email, verifie);
}

async function mollie(chemin, options = {}) {
  const r = await fetch(API + chemin, {
    ...options,
    headers: {"Authorization": "Bearer " + MOLLIE_API_KEY.value(), "Content-Type": "application/json"},
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error("Mollie " + r.status + " " + (d.detail || "")); e.status = r.status; throw e; }
  return d;
}

// Jeton Firebase de l'en-tete Authorization : {uid, email, verifie} ou null.
async function lireJeton(req) {
  const h = req.get("Authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  try {
    const d = await admin.auth().verifyIdToken(token);
    return {uid: d.uid, email: d.email || null, verifie: d.email_verified === true};
  } catch (e) { return null; }
}
function entetes(req, res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(204).send(""); return true; }
  if (req.method !== "POST") { res.status(405).json({ok: false}); return true; }
  return false;
}

// Relit un paiement Mollie deja lu (p) et, s'il est paye, ouvre le coaching
// et l'IA illimitee UNE seule fois. Partage par le webhook et mollieEtat
// (retour du client). Retourne {statut, activee}.
async function traiterPaiement(p) {
  const uid = p.metadata && p.metadata.uid;
  const type = p.metadata && p.metadata.type === "maj" ? "maj" : "plan";
  const refCmd = db().collection("commandes").doc(p.id);
  // On n'active que si la commande a ete creee par le serveur (donc par un
  // compte autorise) ; en mode test, pour un e-mail de la liste.
  const cmd0 = await refCmd.get();
  // 28/10 : si la commande porte un montant (toujours le cas depuis les codes de
  // reduction), Mollie doit avoir encaisse EXACTEMENT ce montant : sinon rien n'est ouvert.
  const attendu = cmd0.exists ? reduction.montantAttendu(cmd0.data()) : NaN;
  const montantOk = Number.isNaN(attendu) || reduction.texteVersCents(p.amount && p.amount.value) === attendu;
  const autorise = cmd0.exists && cmd0.data().source === "mollie" && cmd0.data().uid === uid && montantOk &&
    (!cleDeTest() || emailListe(cmd0.data().email, true));
  if (cmd0.exists && !montantOk) console.error("Montant inattendu, commande non activee :", p.id);
  // Code de reduction eventuel (ecrit par le serveur a la creation du paiement).
  const nomCode = cmd0.exists && cmd0.data().type !== "maj" ? (cmd0.data().code || null) : null;
  const refCode = nomCode ? db().collection("codesReduction").doc(nomCode) : null;
  // Historique (pas un verrou) : une ligne par usage, cle = la commande.
  const refPers = nomCode && uid ? db().collection("reductionsPersonne").doc(p.id) : null;
  // Idempotence : la commande n'est activee qu'une seule fois.
  const r = await db().runTransaction(async (tx) => {
    const s = await tx.get(refCmd);
    const sCode = refCode ? await tx.get(refCode) : null;
    const sPers = refPers ? await tx.get(refPers) : null;
    const deja = !!(s.exists && s.data().activeLe);
    const maj = {statut: p.status, majLe: new Date().toISOString()};
    const nouveau = p.status === "paid" && !deja && !!uid && autorise;
    if (nouveau) maj.activeLe = maj.majLe;
    if (s.exists) tx.set(refCmd, maj, {merge: true});
    // Le code n'est « utilise » QU'ICI, a la confirmation du paiement par Mollie.
    if (sCode && sCode.exists) {
      const c = sCode.data();
      if (nouveau && c.statut !== "utilise") {
        tx.update(refCode, {statut: "utilise", utilisePar: uid, utiliseLe: maj.majLe, commande: p.id, ...reduction.vide});
        if (refPers && !(sPers && sPers.exists)) tx.set(refPers, {uid, code: nomCode, commande: p.id, pourcent: c.pourcent, le: maj.majLe});
      } else if (nouveau && c.commande !== p.id) {
        console.error("CONFLIT code de reduction : paye deux fois", nomCode, p.id); // paiement honore, a revoir a la main
      } else if (["canceled", "failed", "expired"].includes(p.status) && c.statut !== "utilise" &&
          c.reservePar === uid && c.reserveCommande === p.id) {
        tx.update(refCode, reduction.vide);   // paiement mort : le code redevient libre
      }
    }
    return {nouveau, deja};
  });
  if (r.nouveau) {
    await db().collection("users").doc(uid).set({
      commandeCoach: {type, payeLe: p.paidAt || new Date().toISOString(),
        montant: p.amount.value + " EUR", commande: p.id, source: "mollie"},
    }, {merge: true});
    const refQ = db().collection("quotasIA").doc(uid);
    const sq = await refQ.get();
    const fin = sq.exists && sq.data().illimiteJusqu ? Date.parse(sq.data().illimiteJusqu) : 0;
    // Fin = paiement + 44 j, sans cumul (jamais raccourcie).
    const fin44 = (Date.parse(p.paidAt) || Date.now()) + JOURS_ACCES * 864e5;
    await refQ.set({illimiteJusqu: new Date(Math.max(fin44, fin || 0)).toISOString()}, {merge: true});
    console.log("Commande Mollie payee :", uid, type, p.id);
  }
  return {statut: p.status, activee: r.nouveau || r.deja};
}

// Adresse IP de l'appelant (freinage des essais de codes).
function ipDe(req) { return String((req.get && req.get("x-forwarded-for")) || req.ip || "?").split(",")[0].trim(); }
// Petite attente apres un mauvais code : ralentit la devinette (REDUCTION_DELAI_MS=0 dans les tests).
const attenteEchec = () => new Promise((r) => setTimeout(r, Number(process.env.REDUCTION_DELAI_MS != null ? process.env.REDUCTION_DELAI_MS : 600)));

// 0) Le client saisit un code : le serveur dit s'il est valable et a quel prix.
//    LECTURE SEULE (rien n'est reserve ni consomme ici). Memes garde-fous que le paiement :
//    jeton Firebase, compte autorise a payer, freinage des essais (8 / 15 min, par compte et par IP).
exports.verifierCodeReduction = onRequest(
    {region: REGION, cors: true, secrets: [MOLLIE_API_KEY, MOLLIE_TEST_EMAILS]},
    async (req, res) => {
      if (entetes(req, res)) return;
      const refus = (motif, extra = {}) => res.status(reduction.STATUT_HTTP[motif] || 403)
          .json({ok: false, motif, message: reduction.MESSAGES[motif], ...extra});
      try {
        const j = await lireJeton(req);
        if (!j) { refus("auth"); return; }
        if (!paiementPermis(j.email, j.verifie)) { refus("test"); return; }
        const corps = req.body || {};
        const type = corps.type === "maj" ? "maj" : "plan";
        const code = reduction.normaliserCode(corps.code);
        const cles = reduction.clesEssais(j.uid, ipDe(req));
        if (await reduction.tropDEssais(cles)) { refus("essais"); return; }
        const r = await reduction.verifier({uid: j.uid, code, type});
        if (!r.ok) {
          if (reduction.MOTIFS_ESSAI_RATE.has(r.motif)) { await reduction.noterEchec(cles); await attenteEchec(); }
          refus(r.motif); return;
        }
        res.json({ok: true, code: r.code, pourcent: r.pourcent, base: r.base, reduction: r.reduction, montant: r.montant});
      } catch (e) {
        console.error("verifierCodeReduction :", e);
        res.status(500).json({ok: false, motif: "serveur", message: reduction.MESSAGES.serveur});
      }
    },
);

// 1) Le client clique « Payer » : on cree le paiement et on renvoie
//    l'adresse de la page Mollie (Bancontact, cartes...).
exports.creerPaiementMollie = onRequest(
    {region: REGION, cors: true, secrets: [MOLLIE_API_KEY, MOLLIE_TEST_EMAILS]},
    async (req, res) => {
      if (entetes(req, res)) return;
      try {
        const j = await lireJeton(req);
        if (!j) { res.status(401).json({ok: false, motif: "auth"}); return; }
        const uid = j.uid; const email = j.email;
        if (!paiementPermis(j.email, j.verifie)) { res.status(403).json({ok: false, motif: "test"}); return; }
        const type = (req.body || {}).type === "maj" ? "maj" : "plan";
        const p = PRODUITS[type];
        let montant = p.montant;
        let leCode = null; let prixCode = null;
        // Code de reduction : revalide ICI (rien du navigateur n'est cru), reserve, puis le
        // montant est recalcule depuis le pourcentage enregistre au serveur.
        const saisi = (req.body || {}).code;
        if (saisi != null && String(saisi).trim() !== "") {
          const refus = (motif) => { res.status(reduction.STATUT_HTTP[motif] || 403).json({ok: false, motif, message: reduction.MESSAGES[motif]}); };
          if (type === "maj") { refus("maj"); return; }
          leCode = reduction.normaliserCode(saisi);
          const cles = reduction.clesEssais(uid, ipDe(req));
          if (await reduction.tropDEssais(cles)) { refus("essais"); return; }
          const rr = await reduction.reserver({uid, code: leCode});
          if (!rr.ok) {
            if (reduction.MOTIFS_ESSAI_RATE.has(rr.motif)) { await reduction.noterEchec(cles); await attenteEchec(); }
            refus(rr.motif); return;
          }
          prixCode = rr; montant = rr.montant;
        }
        if (type === "maj") {
          // 60 EUR : refuse sans paiement anterieur ou acces nutrition ferme.
          const u = await db().collection("users").doc(uid).get();
          const paye = u.exists && u.data().commandeCoach && u.data().commandeCoach.payeLe;
          const fin = paye ? Date.parse(paye) + JOURS_ACCES * 864e5 : NaN;
          if (!(fin > Date.now())) { res.status(403).json({ok: false, motif: "maj"}); return; }
        }
        let paiement;
        try {
          paiement = await mollie("/payments", {
            method: "POST",
            body: JSON.stringify({
              amount: {currency: "EUR", value: montant},
              description: p.description,
              redirectUrl: RETOUR + type,
              webhookUrl: WEBHOOK,
              locale: "fr_BE",
              metadata: {uid, type},
            }),
          });
        } catch (e) {
          if (leCode) await reduction.liberer({uid, code: leCode}).catch(() => {});   // le paiement n'a pas demarre
          throw e;
        }
        await db().collection("commandes").doc(paiement.id).set({
          uid, email, type, montant, statut: paiement.status,
          source: "mollie", mode: paiement.mode, creeLe: new Date().toISOString(),
          ...(leCode ? {code: leCode, pourcent: prixCode.pourcent, montantBase: p.montant, reduction: prixCode.reduction} : {}),
        });
        if (leCode) await reduction.attacherCommande({uid, code: leCode, commande: paiement.id});
        res.json({ok: true, url: paiement._links.checkout.href, ...(leCode ? {montant, reduction: prixCode.reduction} : {})});
      } catch (e) {
        console.error("creerPaiementMollie :", e);
        res.status(500).json({ok: false, motif: "serveur"});
      }
    },
);

// 2) Mollie previent (corps : id=tr_xxx). On ne croit PAS le corps :
//    on relit le paiement chez Mollie avec la cle secrete.
exports.mollieWebhook = onRequest(
    {region: REGION, cors: false, secrets: [MOLLIE_API_KEY, MOLLIE_TEST_EMAILS]},
    async (req, res) => {
      try {
        const id = String((req.body || {}).id || "");
        if (!/^tr_[A-Za-z0-9]+$/.test(id)) { res.status(200).send("ok"); return; }
        let p;
        try { p = await mollie("/payments/" + encodeURIComponent(id)); } catch (e) {
          if (e.status === 404) { res.status(200).send("ok"); return; } // id inconnu : rien a faire
          throw e;
        }
        await traiterPaiement(p);
        res.status(200).send("ok");
      } catch (e) {
        console.error("mollieWebhook :", e);
        res.status(500).send("error"); // Mollie reessaiera
      }
    },
);

// 3) Etat pour le client (jeton Firebase obligatoire).
//    - autorise : ce compte peut-il payer ? (le bouton n'apparait que si oui)
//    - mode     : « test » ou « live » (l'app affiche « mode test »)
//    - retour:true : etat du dernier paiement de ce compte, relu chez Mollie
//      (le client revient de la page Mollie, payee, annulee ou echouee). Le
//      client n'ouvre le questionnaire que si activee:true.
exports.mollieEtat = onRequest(
    {region: REGION, cors: true, secrets: [MOLLIE_API_KEY, MOLLIE_TEST_EMAILS]},
    async (req, res) => {
      if (entetes(req, res)) return;
      try {
        const j = await lireJeton(req);
        if (!j) { res.status(401).json({ok: false, autorise: false, motif: "auth"}); return; }
        const out = {ok: true, autorise: paiementPermis(j.email, j.verifie), mode: cleDeTest() ? "test" : "live"};
        if ((req.body || {}).retour === true) {
          const q = await db().collection("commandes").where("uid", "==", j.uid).get();
          const l = q.docs.map((d) => ({id: d.id, ...d.data()})).filter((x) => x.source === "mollie")
              .sort((a, b) => String(b.creeLe).localeCompare(String(a.creeLe)));
          if (!l.length) {
            out.paiement = {statut: "aucune", activee: false};
          } else {
            const c = l[0];
            let statut = c.statut; let activee = !!c.activeLe;
            if (!activee) {
              try { const r = await traiterPaiement(await mollie("/payments/" + encodeURIComponent(c.id))); statut = r.statut; activee = r.activee; } catch (e) { console.error("mollieEtat relecture :", e.message); }
            }
            out.paiement = {statut, type: c.type, activee};
          }
        }
        res.json(out);
      } catch (e) {
        console.error("mollieEtat :", e);
        res.status(500).json({ok: false, autorise: false, motif: "serveur"});
      }
    },
);
