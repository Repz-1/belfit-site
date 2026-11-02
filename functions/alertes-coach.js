// ALERTES COACH (01/11, OK Raci) : un e-mail a contact@belfit.be
//  1) quand Mollie confirme un paiement (une seule fois par commande) ;
//  2) quand le client envoie son questionnaire (une seule fois par envoi).
// Idempotence : un document alertesCoach/{cle} est cree dans une transaction
// AVANT l'envoi ; s'il existe deja, rien ne part. Si Resend refuse, le
// document est retire pour qu'un nouvel appel (webhook rejoue) puisse reessayer.
// Une alerte ratee ne bloque JAMAIS le paiement ni le questionnaire.
const ORIGINES = require("./origines");
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const EXPEDITEUR = "BELFIT <noreply@belfit.be>";
const DESTINATAIRE = "contact@belfit.be";
const COACH = "https://www.belfit.be/coach.html";
const db = () => admin.firestore();

const echapper = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
}[c]));
const cleSure = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 140);

async function envoyerResend(corps) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {"Authorization": `Bearer ${RESEND_API_KEY.value()}`, "Content-Type": "application/json"},
    body: JSON.stringify(corps),
  });
}

/** Envoie l'alerte `cle` une seule fois. Retourne true si un e-mail est parti. */
async function alerterUneFois(cle, {sujet, lignes}, deps = {}) {
  const base = deps.db || db();
  const ref = base.collection("alertesCoach").doc(cleSure(cle));
  const nouveau = await base.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (s.exists) return false;
    tx.set(ref, {sujet, le: new Date().toISOString()});
    return true;
  });
  if (!nouveau) return false;
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#16130F">
<h2 style="margin:0 0 12px">${echapper(sujet)}</h2>
<p>${lignes.map(([k, v]) => `<b>${echapper(k)} :</b> ${echapper(v || "—")}`).join("<br>")}</p>
<p><a href="${COACH}">Ouvrir l'espace coach</a></p></div>`;
  const text = lignes.map(([k, v]) => `${k} : ${v || "—"}`).join("\n") + "\n\nEspace coach : " + COACH;
  try {
    const r = await (deps.envoyer || envoyerResend)({from: EXPEDITEUR, to: [DESTINATAIRE], subject: sujet, html, text});
    if (!r || !r.ok) throw new Error("Resend " + (r && r.status));
    return true;
  } catch (e) {
    console.error("alerte coach non envoyee :", cle, e.message);
    try { await ref.delete(); } catch (e2) { /* rien */ }
    return false;
  }
}

/** Nom et e-mail du client (Auth, puis repli sur le questionnaire). */
async function identite(uid, {email, reponses} = {}) {
  let nom = ""; let mail = email || "";
  try { const u = await admin.auth().getUser(uid); nom = u.displayName || ""; mail = mail || u.email || ""; } catch (e) { /* rien */ }
  const rep = reponses || {};
  const txt = (k) => (rep[k] && typeof rep[k] === "object" ? rep[k].valeur || rep[k].texte || "" : rep[k] || "");
  const nomQ = [txt("prenom"), txt("nom")].filter((x) => typeof x === "string" && x).join(" ");
  return {nom: nomQ || nom, email: mail};
}

/** 1) Paiement confirme par Mollie (appele par traiterPaiement). Ne jette jamais. */
async function alertePaiement(p, {uid, email} = {}, deps = {}) {
  try {
    const id = await identite(uid, {email});
    const montant = p.amount && p.amount.value ? String(p.amount.value).replace(".", ",") + " €" : "";
    return await alerterUneFois("paiement_" + p.id, {
      sujet: `Nouveau paiement ${montant} – questionnaire en attente`,
      lignes: [["Client", id.nom], ["E-mail", id.email], ["Montant", montant], ["Commande Mollie", p.id],
        ["Payé le", p.paidAt || new Date().toISOString()]],
    }, deps);
  } catch (e) { console.error("alertePaiement :", e.message); return false; }
}

/** 2) Questionnaire envoye : l'app appelle cette fonction juste apres l'ecriture.
 *  Le serveur RELIT le questionnaire (rien n'est cru du corps) ; une seule
 *  alerte par envoi (cle = uid + envoyeLe). */
function gestionnaireQuestionnaire(deps = {}) {
  return async (req, res) => {
    res.set("Access-Control-Allow-Origin", ORIGINES.includes(req.headers.origin) ? req.headers.origin : ORIGINES[0]); res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ok: false}); return; }
    let jeton;
    try {
      const h = req.get("Authorization") || "";
      jeton = await admin.auth().verifyIdToken(h.startsWith("Bearer ") ? h.slice(7) : "");
    } catch (e) { res.status(401).json({ok: false}); return; }
    try {
      const s = await (deps.db || db()).collection("users").doc(jeton.uid).get();
      const q = s.exists ? (s.data() || {}).questionnaireCoach : null;
      if (!q || !q.envoyeLe) { res.json({ok: true, envoye: false}); return; }
      const id = await identite(jeton.uid, {email: jeton.email, reponses: q.reponses});
      const envoye = await alerterUneFois("questionnaire_" + jeton.uid + "_" + q.envoyeLe, {
        sujet: "Questionnaire reçu – programme à préparer" + (q.alerteSante || q.allergieGrave ? " (⚠ santé/allergie)" : ""),
        lignes: [["Client", id.nom], ["E-mail", id.email], ["Envoyé le", q.envoyeLe],
          ["Alerte santé", q.alerteSante ? "oui" : "non"], ["Allergie grave", q.allergieGrave ? "oui" : "non"]],
      }, deps);
      res.json({ok: true, envoye});
    } catch (e) {
      console.error("signalerQuestionnaire :", e);
      res.status(500).json({ok: false});
    }
  };
}

exports.signalerQuestionnaire = onRequest(
  {secrets: [RESEND_API_KEY], region: "europe-west1", maxInstances: 3},
  gestionnaireQuestionnaire(),
);
exports.RESEND_API_KEY = RESEND_API_KEY;
exports._interne = {alerterUneFois, alertePaiement, gestionnaireQuestionnaire};
