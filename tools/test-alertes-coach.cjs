// Alertes coach (01/11) : e-mail paiement + questionnaire, une seule fois. Stubs, aucun envoi reel.
process.env.GCLOUD_PROJECT = "repz-baf60";
const path = require("path");
const RACINE = path.resolve(__dirname, "..");
const adminPath = require.resolve("firebase-admin", {paths: [path.join(RACINE, "functions")]});
const store = {};
const fsStub = {collection: (c) => ({doc: (d) => { const k = c + "/" + d; return {
  get: async () => ({exists: k in store, data: () => store[k]}),
  set: async (v) => { store[k] = v; }, delete: async () => { delete store[k]; }}; }})};
fsStub.runTransaction = async (fn) => fn({get: (r) => r.get(), set: (r, v) => r.set(v)});
const adminStub = {auth: () => ({verifyIdToken: async (t) => { if (t !== "tok") throw new Error("x"); return {uid: "u1", email: "client@example.test"}; },
  getUser: async () => ({displayName: "", email: "client@example.test"})}), firestore: () => fsStub, apps: [1], initializeApp() {}};
require.cache[adminPath] = {id: adminPath, filename: adminPath, loaded: true, exports: adminStub};
const A = require(path.join(RACINE, "functions", "alertes-coach.js"))._interne;
let mails = []; let refuse = false;
const envoyer = async (c) => { if (refuse) return {ok: false, status: 500}; mails.push(c); return {ok: true}; };
const deps = {envoyer};
let code = 0; const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) code = 1; };
const rep = () => ({code: 200, body: null, set() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, send(b) { this.body = b; return this; }});
(async () => {
  const p = {id: "tr_1", amount: {value: "80.00"}, paidAt: "2026-11-01T09:00:00Z"};
  await A.alertePaiement(p, {uid: "u1"}, deps);
  ok(mails.length === 1 && mails[0].to[0] === "contact@belfit.be" && /Nouveau paiement 80,00 € – questionnaire en attente/.test(mails[0].subject) && /client@example.test/.test(mails[0].text), "paiement : 1 e-mail à contact@belfit.be avec e-mail client");
  await A.alertePaiement(p, {uid: "u1"}, deps);
  ok(mails.length === 1, "webhook rejoué : pas de second e-mail");
  refuse = true; await A.alertePaiement({...p, id: "tr_2"}, {uid: "u1"}, deps); refuse = false;
  ok(!store["alertesCoach/paiement_tr_2"], "Resend refuse : verrou retiré (nouvel essai possible)");
  await A.alertePaiement({...p, id: "tr_2"}, {uid: "u1"}, deps);
  ok(mails.length === 2, "nouvel essai après refus : envoyé");
  const h = A.gestionnaireQuestionnaire(deps);
  const req = (tok) => ({method: "POST", get: (k) => k === "Authorization" ? "Bearer " + tok : ""});
  let r = rep(); await h(req("mauvais"), r); ok(r.code === 401, "questionnaire sans jeton : 401");
  r = rep(); await h(req("tok"), r); ok(r.body.envoye === false && mails.length === 2, "pas de questionnaire : rien");
  store["users/u1"] = {questionnaireCoach: {envoyeLe: "2026-11-01T09:10:00Z", reponses: {prenom: "Raci"}, alerteSante: true}};
  r = rep(); await h(req("tok"), r); ok(r.body.envoye === true && /Questionnaire reçu/.test(mails[2].subject) && /Raci/.test(mails[2].text) && /santé/.test(mails[2].subject), "questionnaire : e-mail (nom, alerte santé)");
  r = rep(); await h(req("tok"), r); ok(r.body.envoye === false && mails.length === 3, "même questionnaire rappelé : pas de doublon");
  store["users/u1"].questionnaireCoach.envoyeLe = "2026-12-15T09:00:00Z";
  r = rep(); await h(req("tok"), r); ok(mails.length === 4, "nouveau questionnaire (mois suivant) : nouvel e-mail");
  process.exit(code);
})();
