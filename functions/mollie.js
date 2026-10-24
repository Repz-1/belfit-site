// MOLLIE — SERVEUR SEULEMENT (24/10) : aucun bouton cote client tant que
// MOLLIE_ACTIF est false dans l'application.
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

// GARDE-FOU MODE TEST (24/10) : avec une cle « test_ », un faux paiement
// reussi ouvrirait le coaching et l'IA illimitee en production. Tant que la
// cle est une cle de test, seuls les e-mails de la liste secrete
// MOLLIE_TEST_EMAILS (adresses separees par des virgules, secret Firebase :
// jamais dans le depot, qui est public) peuvent creer ET activer un
// paiement. L'e-mail doit etre VERIFIE dans le jeton Firebase : sinon
// n'importe qui s'inscrirait avec l'adresse d'un autre. Avec une cle
// « live_ », la garde ne s'applique plus. Les adresses ne sont jamais logguees.
function cleDeTest() { return MOLLIE_API_KEY.value().startsWith("test_"); }
function emailAutorise(email, verifie) {
  if (!cleDeTest()) return true;
  if (!email || verifie !== true) return false;
  const liste = String(MOLLIE_TEST_EMAILS.value() || "").split(",")
      .map((x) => x.trim().toLowerCase()).filter(Boolean);
  return liste.includes(String(email).trim().toLowerCase());
}

async function mollie(chemin, options = {}) {
  const r = await fetch(API + chemin, {
    ...options,
    headers: {"Authorization": "Bearer " + MOLLIE_API_KEY.value(), "Content-Type": "application/json"},
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("Mollie " + r.status + " " + (d.detail || ""));
  return d;
}

// 1) Le client clique « Payer » : on cree le paiement et on renvoie
//    l'adresse de la page Mollie (Bancontact, cartes...).
exports.creerPaiementMollie = onRequest(
    {region: REGION, cors: true, secrets: [MOLLIE_API_KEY, MOLLIE_TEST_EMAILS]},
    async (req, res) => {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      if (req.method === "OPTIONS") { res.status(204).send(""); return; }
      if (req.method !== "POST") { res.status(405).json({ok: false}); return; }
      try {
        const h = req.get("Authorization") || "";
        const token = h.startsWith("Bearer ") ? h.slice(7) : "";
        let uid; let email = null; let verifie = false;
        try { const d = await admin.auth().verifyIdToken(token); uid = d.uid; email = d.email || null; verifie = d.email_verified === true; } catch (e) { res.status(401).json({ok: false, motif: "auth"}); return; }
        if (!emailAutorise(email, verifie)) { res.status(403).json({ok: false, motif: "test"}); return; }
        const type = (req.body || {}).type === "maj" ? "maj" : "plan";
        const p = PRODUITS[type];
        if (type === "maj") {
          // 60 EUR : refuse sans paiement anterieur ou acces nutrition ferme.
          const u = await db().collection("users").doc(uid).get();
          const paye = u.exists && u.data().commandeCoach && u.data().commandeCoach.payeLe;
          const fin = paye ? Date.parse(paye) + JOURS_ACCES * 864e5 : NaN;
          if (!(fin > Date.now())) { res.status(403).json({ok: false, motif: "maj"}); return; }
        }
        const paiement = await mollie("/payments", {
          method: "POST",
          body: JSON.stringify({
            amount: {currency: "EUR", value: p.montant},
            description: p.description,
            redirectUrl: RETOUR + type,
            webhookUrl: WEBHOOK,
            locale: "fr_BE",
            metadata: {uid, type},
          }),
        });
        await db().collection("commandes").doc(paiement.id).set({
          uid, email, type, montant: p.montant, statut: paiement.status,
          source: "mollie", mode: paiement.mode, creeLe: new Date().toISOString(),
        });
        res.json({ok: true, url: paiement._links.checkout.href});
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
        const p = await mollie("/payments/" + encodeURIComponent(id));
        const uid = p.metadata && p.metadata.uid;
        const type = p.metadata && p.metadata.type === "maj" ? "maj" : "plan";
        const refCmd = db().collection("commandes").doc(p.id);
        // Paiement de test : on n'active que si la commande a ete creee par le
        // serveur pour un e-mail autorise (sinon on la note sans rien activer).
        const cmd0 = await refCmd.get();
        const autorise = !cleDeTest() || (cmd0.exists && emailAutorise(cmd0.data().email, true));
        // Idempotence : la commande n'est activee qu'une seule fois.
        const activer = await db().runTransaction(async (tx) => {
          const s = await tx.get(refCmd);
          const deja = s.exists && s.data().activeLe;
          const maj = {statut: p.status, majLe: new Date().toISOString()};
          if (p.status === "paid" && !deja && uid && autorise) maj.activeLe = maj.majLe;
          tx.set(refCmd, maj, {merge: true});
          return !!maj.activeLe;
        });
        if (activer) {
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
        res.status(200).send("ok");
      } catch (e) {
        console.error("mollieWebhook :", e);
        res.status(500).send("error"); // Mollie reessaiera
      }
    },
);
