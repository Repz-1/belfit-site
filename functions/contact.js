// Formulaire de contact de la vitrine (Raci, 31/10 : « Ok pour modifier le
// serveur pour le formulaire »). Envoie un e-mail a contact@belfit.be via
// Resend, avec le meme expediteur que mailVerification.
// Garde-fous : validation stricte, honeypot, consentement obligatoire,
// limite de frequence par adresse IP (empreinte, jamais l'IP en clair) et
// plafond global journalier. Aucun stockage du message.
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const EXPEDITEUR = "BELFIT <noreply@belfit.be>";
const DESTINATAIRE = "contact@belfit.be";
const ORIGINES = ["https://www.belfit.be", "https://belfit.be"];
const SUJETS = ["Question", "Achat", "Suivi", "Autre"];
const MAX_PAR_HEURE = 3; // par empreinte d'IP
const MAX_PAR_JOUR = 100; // tous visiteurs confondus

const echapper = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
}[c]));
const RE_EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i;

/** Valide le corps recu. Renvoie {ok, champs} ou {ok:false, erreur}. */
function valider(b) {
  if (!b || typeof b !== "object") return {ok: false, erreur: "corps"};
  const txt = (v) => (typeof v === "string" ? v.trim() : "");
  const nom = txt(b.nom); const email = txt(b.email);
  const sujet = txt(b.sujet); const message = txt(b.message);
  if (nom.length < 1 || nom.length > 80 || /[\r\n]/.test(nom)) return {ok: false, erreur: "nom"};
  if (email.length > 120 || !RE_EMAIL.test(email)) return {ok: false, erreur: "email"};
  if (!SUJETS.includes(sujet)) return {ok: false, erreur: "sujet"};
  if (message.length < 5 || message.length > 2000) return {ok: false, erreur: "message"};
  if (b.consentement !== true) return {ok: false, erreur: "consentement"};
  return {ok: true, champs: {nom, email, sujet, message}};
}

/** Compte un envoi dans une fenetre ; false si la limite est atteinte. */
async function compter(db, id, max, dureeMs) {
  const ref = db.collection("contactsLimites").doc(id);
  return db.runTransaction(async (t) => {
    const s = await t.get(ref); const now = Date.now();
    let d = s.exists ? s.data() : null;
    if (!d || now - d.debut > dureeMs) d = {debut: now, n: 0};
    if (d.n >= max) return false;
    t.set(ref, {debut: d.debut, n: d.n + 1, expire: new Date(d.debut + dureeMs)});
    return true;
  });
}

function gestionnaire(deps = {}) {
  return async (req, res) => {
    const origine = req.get("Origin") || "";
    const locale = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origine) && process.env.FUNCTIONS_EMULATOR === "true";
    if (ORIGINES.includes(origine) || locale) res.set("Access-Control-Allow-Origin", origine);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ok: false}); return; }
    try {
      const b = req.body || {};
      // Honeypot : champ invisible rempli = robot. On repond « ok » sans rien envoyer.
      if (typeof b.site === "string" && b.site.trim() !== "") { res.json({ok: true}); return; }
      const v = valider(b);
      if (!v.ok) { res.status(400).json({ok: false, erreur: v.erreur}); return; }
      const db = deps.db || admin.firestore();
      const ip = String(req.get("x-forwarded-for") || req.ip || "").split(",")[0].trim();
      const empreinte = crypto.createHash("sha256").update("belfit-contact|" + ip).digest("hex").slice(0, 32);
      if (!(await compter(db, "ip_" + empreinte, MAX_PAR_HEURE, 3600000))) {
        res.status(429).json({ok: false, erreur: "frequence"}); return;
      }
      if (!(await compter(db, "global", MAX_PAR_JOUR, 86400000))) {
        res.status(429).json({ok: false, erreur: "frequence"}); return;
      }
      const {nom, email, sujet, message} = v.champs;
      const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#16130F">
<h2 style="margin:0 0 12px">Nouveau message du site belfit.be</h2>
<p><b>Nom :</b> ${echapper(nom)}<br><b>E-mail :</b> ${echapper(email)}<br><b>Sujet :</b> ${echapper(sujet)}</p>
<p style="white-space:pre-wrap;border-left:3px solid #F7B500;padding-left:12px">${echapper(message)}</p>
<p style="color:#5C564E;font-size:12px">Consentement RGPD donné. Répondre à ce mail répond directement à l'expéditeur.</p></div>`;
      const envoyer = deps.envoyer || ((corps) => fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {"Authorization": `Bearer ${RESEND_API_KEY.value()}`, "Content-Type": "application/json"},
        body: JSON.stringify(corps),
      }));
      const r = await envoyer({
        from: EXPEDITEUR, to: [DESTINATAIRE], reply_to: email,
        subject: `[Contact BelFit] ${sujet} – ${nom}`, html,
        text: `Nom : ${nom}\nE-mail : ${email}\nSujet : ${sujet}\n\n${message}`,
      });
      if (!r.ok) { console.error("envoyerContact : Resend a refuse", r.status); res.status(502).json({ok: false}); return; }
      res.json({ok: true});
    } catch (e) {
      console.error("envoyerContact :", e);
      res.status(500).json({ok: false});
    }
  };
}

exports.envoyerContact = onRequest(
  {secrets: [RESEND_API_KEY], region: "europe-west1", maxInstances: 3},
  gestionnaire(),
);
exports._test = {valider, gestionnaire};
