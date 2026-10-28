// CODES DE REDUCTION (28/10, demande de Raci) : « Code de reduction » sous le prix
// de 80 EUR. Un code = un pourcentage, UNE seule utilisation, UNE personne.
//
// REGLES (decidees par Raci) :
//  - le code vaut « pour le mois en question » : sur les 80 EUR d'un plan, premier
//    mois OU mois rachete plus tard ; jamais sur la mise a jour a 60 EUR ;
//  - chaque CODE ne sert qu'UNE fois au total ; une personne peut en utiliser un
//    autre plus tard, pour un autre mois (28/10, reponse de Raci : pas de limite a vie) ;
//  - le montant paye est calcule ICI, cote serveur, a partir du code valide :
//    le navigateur n'envoie jamais de montant.
//
// CYCLE D'UN CODE (collection codesReduction/{CODE}, fermee au client) :
//   libre --(le client clique « payer »)--> reserve 70 min pour CE compte
//   reserve --(paiement Mollie « paid »)--> utilise   (definitif, transaction)
//   reserve --(paiement annule / echoue / expire)--> libre
//   reserve --(70 min sans issue)--> libre (reservation echue, lue comme libre)
// Pourquoi une reservation et non « utilise des la saisie » : quelqu'un qui
// abandonne la page de paiement ne doit pas bruler son code. Pourquoi pas
// « utilise seulement a la confirmation » : deux personnes pourraient payer au
// prix reduit avec le meme code. 70 min > 1 h, la duree maximale d'une session
// Bancontact chez Mollie (carte : 30 min).
//
// Ce fichier ne definit AUCUNE fonction deployee : ce sont des briques partagees
// par mollie.js (verification, paiement) et reduction-admin.js (creation).
const crypto = require("crypto");

const PRIX_BASE_CENTS = {plan: 8000};   // 80,00 EUR : meme valeur que PRODUITS dans mollie.js
const POURCENT_MAX = 90;                // au-dela : le prix tomberait trop bas pour Mollie (voir MIN_CENTS)
// Minimum accepte pour un paiement reduit. Mollie accepte des 0,01-0,02 EUR (Bancontact : 0,02),
// mais un code qui rend le plan quasi gratuit est un autre cas (voir « invitation » du coach) :
// refuse proprement plutot que deviner. 90 % de 80 EUR = 8,00 EUR : toujours au-dessus.
const MIN_CENTS = 100;
const RESERVATION_MS = 70 * 60 * 1000;
const ESSAIS_MAX = 8;                   // mauvais codes tolerés ...
const FENETRE_MS = 15 * 60 * 1000;      // ... par fenetre de 15 min, par compte ET par adresse IP

const MESSAGES = {
  vide: "Saisis ton code de réduction.",
  inconnu: "Ce code n'existe pas. Vérifie la saisie (lettres et chiffres, sans espace).",
  utilise: "Ce code a déjà été utilisé.",
  desactive: "Ce code n'est plus actif.",
  expire: "Ce code a expiré.",
  reserve: "Ce code est en cours d'utilisation sur un autre paiement. Réessaie dans une heure.",
  maj: "Les codes de réduction ne s'appliquent pas à la mise à jour à 60 €.",
  minimum: "Ce code ne peut pas être utilisé en ligne. Écris à contact@belfit.be.",
  essais: "Trop d'essais. Réessaie dans quelques minutes.",
  auth: "Connecte-toi pour utiliser un code.",
  test: "Le paiement n'est pas encore ouvert pour ce compte.",
  serveur: "Le code n'a pas pu être vérifié. Réessaie dans un instant.",
};
const STATUT_HTTP = {vide: 400, inconnu: 404, utilise: 409, desactive: 409, expire: 409, reserve: 409, maj: 403, minimum: 422, essais: 429, auth: 401, test: 403, serveur: 500};
// Motifs qui comptent comme « essai rate » (devinette possible) pour le freinage.
const MOTIFS_ESSAI_RATE = new Set(["inconnu", "utilise", "desactive", "expire", "reserve"]);

/** « marc 10 », « Marc-10 », « MARC10 » -> « MARC10 » : majuscules, sans accent ni separateur. */
function normaliserCode(x) {
  return String(x == null ? "" : x).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase().replace(/[^A-Z0-9]/g, "");
}
const codeBienForme = (c) => c.length >= 4 && c.length <= 32;

const centsVersTexte = (c) => (c / 100).toFixed(2);
/** « 80.00 » -> 8000 (entier ; NaN si illisible). */
function texteVersCents(t) {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(t == null ? "" : t).trim());
  return m ? parseInt(m[1], 10) * 100 + parseInt((m[2] || "0").padEnd(2, "0"), 10) : NaN;
}

/** Prix apres reduction, en centimes entiers (jamais de flottants). */
function calculerPrix(baseCents, pourcent) {
  if (!Number.isInteger(baseCents) || baseCents <= 0) return {ok: false, motif: "serveur"};
  if (!Number.isInteger(pourcent) || pourcent < 1 || pourcent > POURCENT_MAX) return {ok: false, motif: "minimum"};
  const reductionCents = Math.round(baseCents * pourcent / 100);
  const montantCents = baseCents - reductionCents;
  if (montantCents < MIN_CENTS) return {ok: false, motif: "minimum"};
  return {ok: true, baseCents, reductionCents, montantCents, pourcent,
    base: centsVersTexte(baseCents), reduction: centsVersTexte(reductionCents), montant: centsVersTexte(montantCents)};
}

const statutEffectif = (d, maintenant) => {
  if (d.statut === "utilise") return "utilise";
  if (d.reservePar && Date.parse(d.reserveJusqu) > maintenant) return "reserve";
  return "libre";
};

/** Le code (document ou null) peut-il servir a CE compte maintenant ? Pur. */
function evaluerCode(d, uid, maintenant) {
  if (!d) return {ok: false, motif: "inconnu"};
  if (d.actif === false) return {ok: false, motif: "desactive"};
  if (d.expire && maintenant > Date.parse(d.expire)) return {ok: false, motif: "expire"};
  const s = statutEffectif(d, maintenant);
  if (s === "utilise") return {ok: false, motif: "utilise"};
  if (s === "reserve" && d.reservePar !== uid) return {ok: false, motif: "reserve"};
  return {ok: true};
}

const db = () => require("firebase-admin").firestore();
const cCodes = () => db().collection("codesReduction");
const cEssais = () => db().collection("essaisCodes");
const vide = {reservePar: null, reserveJusqu: null, reserveCommande: null};

/** Cles de freinage : le compte et l'adresse IP (hachee : l'IP n'est jamais stockee en clair). */
function clesEssais(uid, ip) {
  return ["u_" + uid, "i_" + crypto.createHash("sha256").update(String(ip || "?")).digest("hex").slice(0, 24)];
}
async function tropDEssais(cles, maintenant = Date.now()) {
  for (const c of cles) {
    const s = await cEssais().doc(c).get();
    if (s.exists && maintenant - Date.parse(s.data().depuis) <= FENETRE_MS && s.data().n >= ESSAIS_MAX) return true;
  }
  return false;
}
async function noterEchec(cles, maintenant = Date.now()) {
  for (const c of cles) {
    const ref = cEssais().doc(c);
    await db().runTransaction(async (tx) => {
      const s = await tx.get(ref);
      const d = s.exists ? s.data() : null;
      const frais = d && maintenant - Date.parse(d.depuis) <= FENETRE_MS;
      tx.set(ref, {n: frais ? d.n + 1 : 1, depuis: frais ? d.depuis : new Date(maintenant).toISOString()});
    });
  }
}

/** Lecture seule : le code est-il utilisable, et a quel prix ? Aucune ecriture. */
async function verifier({uid, code, type, maintenant = Date.now()}) {
  if (type === "maj") return {ok: false, motif: "maj"};
  if (!codeBienForme(code)) return {ok: false, motif: code ? "inconnu" : "vide"};
  const s = await cCodes().doc(code).get();
  const d = s.exists ? s.data() : null;
  const ev = evaluerCode(d, uid, maintenant);
  if (!ev.ok) return ev;
  const prix = calculerPrix(PRIX_BASE_CENTS.plan, d.pourcent);
  return prix.ok ? {...prix, code} : prix;
}

/** Reserve le code pour ce compte (transaction : un seul gagnant). Libere ses autres reservations. */
async function reserver({uid, code, maintenant = Date.now()}) {
  if (!codeBienForme(code)) return {ok: false, motif: "inconnu"};
  const refC = cCodes().doc(code);
  return db().runTransaction(async (tx) => {
    const sC = await tx.get(refC);
    const autres = await tx.get(cCodes().where("reservePar", "==", uid));
    const d = sC.exists ? sC.data() : null;
    const ev = evaluerCode(d, uid, maintenant);
    if (!ev.ok) return ev;
    const prix = calculerPrix(PRIX_BASE_CENTS.plan, d.pourcent);
    if (!prix.ok) return prix;
    autres.docs.forEach((x) => { if (x.id !== code) tx.update(x.ref || cCodes().doc(x.id), vide); });
    tx.update(refC, {reservePar: uid, reserveJusqu: new Date(maintenant + RESERVATION_MS).toISOString(), reserveCommande: null});
    return {...prix, code};
  });
}
/** Associe le paiement Mollie cree a la reservation (pour la liberer si le paiement echoue). */
async function attacherCommande({uid, code, commande}) {
  const ref = cCodes().doc(code);
  await db().runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (s.exists && s.data().reservePar === uid && s.data().statut !== "utilise") tx.update(ref, {reserveCommande: commande});
  });
}
/** Libere la reservation d'un compte (le paiement n'a pas pu demarrer). */
async function liberer({uid, code}) {
  const ref = cCodes().doc(code);
  await db().runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (s.exists && s.data().reservePar === uid && s.data().statut !== "utilise") tx.update(ref, vide);
  });
}

/** Pourcentage reduit paye : verification d'integrite d'un paiement Mollie. */
function montantAttendu(cmd) { return cmd && cmd.montant != null ? texteVersCents(cmd.montant) : NaN; }

/* ----------------------- administration (reduction-admin.js) ----------------------- */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // sans I, O, 0, 1
const codeAleatoire = (n = 8) => Array.from(crypto.randomBytes(n), (b) => ALPHABET[b % ALPHABET.length]).join("");
function nouveauDocument({pourcent, note, expire}) {
  return {pourcent, actif: true, statut: "libre", cree: new Date().toISOString(),
    note: String(note || "").slice(0, 80), expire: expire || null,
    ...vide, utilisePar: null, utiliseLe: null, commande: null};
}

module.exports = {
  PRIX_BASE_CENTS, POURCENT_MAX, MIN_CENTS, RESERVATION_MS, ESSAIS_MAX, FENETRE_MS, MESSAGES, STATUT_HTTP, MOTIFS_ESSAI_RATE,
  normaliserCode, codeBienForme, centsVersTexte, texteVersCents, calculerPrix, statutEffectif, evaluerCode,
  clesEssais, tropDEssais, noterEchec, verifier, reserver, attacherCommande, liberer, montantAttendu,
  codeAleatoire, nouveauDocument, vide,
};
