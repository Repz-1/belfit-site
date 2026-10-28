// ADMINISTRATION DES CODES DE REDUCTION (28/10) : creer, desactiver, reactiver, lister.
// Deux entrees : le bloc « Codes de réduction » de la page coach (coach.html, navigateur
// sur belfit.be) et l'outil local tools/codes-reduction.mjs. Pas d'interface dans l'app client.
//
// Acces : le code secret COACH_CODE (celui de l'espace coach, deja pose par le
// deploiement automatique), verifie ICI a temps constant. Il voyage dans le corps
// de la requete HTTPS, jamais dans l'adresse, et l'outil ne l'affiche jamais.
// Freinage : 8 mauvais secrets / 15 min par adresse IP, plus 0,8 s d'attente.
// Rien n'est jamais renvoye qui identifie un client (ni uid, ni e-mail) : seulement
// le code, son pourcentage et son etat.
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const crypto = require("crypto");
const reduction = require("./reduction");

const COACH_CODE = defineSecret("COACH_CODE");
const REGION = "europe-west1";
const essais = new Map();
function trop(ip) {
  const m = Date.now(); const e = essais.get(ip) || {n: 0, depuis: m};
  if (m - e.depuis > 15 * 60 * 1000) { e.n = 0; e.depuis = m; }
  essais.set(ip, e);
  return e.n >= 8;
}
function secretValide(saisi) {
  const attendu = String(COACH_CODE.value() || "");
  if (!attendu || !saisi) return false;
  const h = (x) => crypto.createHash("sha256").update(String(x)).digest();
  return crypto.timingSafeEqual(h(saisi), h(attendu));
}

exports.adminCodesReduction = onRequest(
    {region: REGION, cors: ["https://belfit.be", "https://www.belfit.be"], secrets: [COACH_CODE]},
    async (req, res) => {
      if (req.method !== "POST") { res.status(405).json({ok: false}); return; }
      const ip = String((req.get && req.get("x-forwarded-for")) || req.ip || "?").split(",")[0].trim();
      try {
        const corps = req.body || {};
        if (trop(ip)) { res.status(429).json({ok: false, motif: "attente"}); return; }
        if (!secretValide(corps.code)) {
          essais.get(ip).n += 1;
          await new Promise((r) => setTimeout(r, Number(process.env.REDUCTION_DELAI_MS != null ? process.env.REDUCTION_DELAI_MS : 800)));
          res.status(403).json({ok: false, motif: "secret"}); return;
        }
        essais.delete(ip);
        const col = () => require("firebase-admin").firestore().collection("codesReduction");
        const action = String(corps.action || "");
        const nom = reduction.normaliserCode(corps.nomCode);

        if (action === "creer") {
          const code = nom || reduction.codeAleatoire(8);
          const pourcent = Number(corps.pourcent);
          const expire = corps.expire ? String(corps.expire) : null;
          if (!reduction.codeBienForme(code)) { res.status(400).json({ok: false, motif: "code", detail: "4 à 32 lettres ou chiffres"}); return; }
          if (!Number.isInteger(pourcent) || pourcent < 1 || pourcent > reduction.POURCENT_MAX) {
            res.status(400).json({ok: false, motif: "pourcent", detail: "entier de 1 à " + reduction.POURCENT_MAX}); return;
          }
          // Le prix reduit doit rester payable en ligne (sinon : pas de code, voir « minimum »).
          if (!reduction.calculerPrix(reduction.PRIX_BASE_CENTS.plan, pourcent).ok) { res.status(400).json({ok: false, motif: "minimum"}); return; }
          if (expire && !(Date.parse(expire) > Date.now())) { res.status(400).json({ok: false, motif: "expire"}); return; }
          const ref = col().doc(code);
          const cree = await require("firebase-admin").firestore().runTransaction(async (tx) => {
            if ((await tx.get(ref)).exists) return false;
            tx.set(ref, reduction.nouveauDocument({pourcent, note: corps.note, expire}));
            return true;
          });
          if (!cree) { res.status(409).json({ok: false, motif: "existe"}); return; }
          const p = reduction.calculerPrix(reduction.PRIX_BASE_CENTS.plan, pourcent);
          res.json({ok: true, code, pourcent, montant: p.montant});
          return;
        }
        if (action === "desactiver" || action === "reactiver") {
          if (!reduction.codeBienForme(nom)) { res.status(400).json({ok: false, motif: "code"}); return; }
          const ref = col().doc(nom);
          const ok = await require("firebase-admin").firestore().runTransaction(async (tx) => {
            const s = await tx.get(ref);
            if (!s.exists) return false;
            tx.update(ref, {actif: action === "reactiver"});
            return true;
          });
          if (!ok) { res.status(404).json({ok: false, motif: "inconnu"}); return; }
          res.json({ok: true, code: nom, actif: action === "reactiver"});
          return;
        }
        if (action === "lister") {
          const maintenant = Date.now();
          const docs = (await col().orderBy("cree", "desc").limit(100).get()).docs;
          res.json({ok: true, codes: docs.map((d) => {
            const x = d.data();
            return {code: d.id, pourcent: x.pourcent, actif: x.actif !== false, etat: reduction.statutEffectif(x, maintenant),
              note: x.note || "", cree: x.cree, expire: x.expire || null, utiliseLe: x.utiliseLe || null};
          })});
          return;
        }
        res.status(400).json({ok: false, motif: "action"});
      } catch (e) {
        console.error("adminCodesReduction :", e);
        res.status(500).json({ok: false, motif: "serveur"});
      }
    },
);
