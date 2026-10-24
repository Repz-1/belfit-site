process.env.GCLOUD_PROJECT = "repz-baf60";
const path = require("path");
const RACINE = path.resolve(__dirname, "..");
const adminPath = require.resolve("firebase-admin", {paths: [path.join(RACINE, "functions")]});
const store = {}; // "col/doc" -> data
const fsStub = {collection: (c) => ({where: (champ, op, val) => ({get: async () => ({docs: Object.keys(store).filter(k => k.startsWith(c + "/") && store[k][champ] === val).map(k => ({id: k.slice(c.length + 1), data: () => store[k]}))})}), doc: (d) => { const k = c + "/" + d; return {
  get: async () => ({exists: k in store, data: () => store[k]}),
  set: async (v, o) => { store[k] = o && o.merge ? {...(store[k] || {}), ...v} : v; }, _k: k}; }})};
fsStub.runTransaction = async (fn) => fn({get: (ref) => ref.get(), set: (ref, v, o) => ref.set(v, o)});
const TOKENS = {tok: {uid: "u1", email: "Testeur@Example.TEST", email_verified: true}, autre: {uid: "u3", email: "autre@example.test", email_verified: true}, sansmail: {uid: "u4"}, nonverif: {uid: "u5", email: "testeur@example.test", email_verified: false}};
const adminStub = {auth: () => ({verifyIdToken: async (t) => { if (!(t in TOKENS)) throw new Error("x"); return TOKENS[t]; }}), firestore: () => fsStub, apps: [1], initializeApp() {}};
require.cache[adminPath] = {id: adminPath, filename: adminPath, loaded: true, exports: adminStub};
let appels = [];
let paiementRetour = null;
global.fetch = async (url, opt = {}) => { appels.push({url, body: opt.body && JSON.parse(opt.body)}); 
  if (opt.method === "POST") return {ok: true, json: async () => ({id: "tr_abc123", status: "open", mode: "test", _links: {checkout: {href: "https://mollie.test/pay"}}})};
  if (paiementRetour && paiementRetour.erreur) return {ok: false, status: paiementRetour.erreur, json: async () => ({detail: "x"})};
  return {ok: true, json: async () => paiementRetour}; };
const mol = require(path.join(RACINE, "functions", "mollie.js"));
const EE = require("events");
const rep = () => { const r = new EE(); Object.assign(r, {code: 200, body: null, headers: {}, set(k, v) { this.headers[k] = v; }, setHeader(k, v) { this.headers[k] = v; }, getHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; this.emit("finish"); return this; }, send(b) { this.body = b; this.emit("finish"); return this; }, end() { this.emit("finish"); }}); return r; };
const run = async (fn, req) => { const r = rep(); req.headers = req.headers || {}; req.header = req.get; await fn(req, r); return r; };
const ok = (c, m) => console.log((c ? "✓ " : "✗ ") + m);
const post = (type, tok = "tok") => ({method: "POST", body: {type}, get: (h) => h === "Authorization" ? "Bearer " + tok : ""});
(async () => {
  process.env.MOLLIE_API_KEY = "test_fake"; process.env.MOLLIE_TEST_EMAILS = " liste@example.test , testeur@example.test ";
  let r = await run(mol.creerPaiementMollie, post("plan", "autre")); ok(r.code === 403 && r.body.motif === "test", "clé test, autre e-mail (vérifié) : 403");
  r = await run(mol.creerPaiementMollie, post("plan", "sansmail")); ok(r.code === 403 && r.body.motif === "test", "clé test, jeton sans e-mail : 403");
  r = await run(mol.creerPaiementMollie, post("plan", "nonverif")); ok(r.code === 403 && r.body.motif === "test", "clé test, e-mail autorisé mais NON vérifié : 403");
  ok(appels.length === 0 && !Object.keys(store).some(k => k.startsWith("commandes/")), "refus : aucun appel Mollie, aucune commande créée");
  r = await run(mol.creerPaiementMollie, post("plan", "mauvais")); ok(r.code === 401, "jeton invalide : 401");
    appels = []; r = await run(mol.creerPaiementMollie, post("plan"));
  ok(r.code === 200 && r.body.url === "https://mollie.test/pay", "plan, e-mail autorisé (casse/espaces ignorés) : URL de paiement");
  const b = appels[0].body; ok(b.amount.value === "80.00" && b.amount.currency === "EUR" && b.redirectUrl.startsWith("https://www.belfit.be/v2/") && b.webhookUrl === "https://europe-west1-repz-baf60.cloudfunctions.net/mollieWebhook" && b.metadata.uid === "u1", "montant 80.00 EUR fixé serveur, redirect www, webhook europe-west1");
  ok(store["commandes/tr_abc123"].statut === "open", "commande notée « open »");
  r = await run(mol.creerPaiementMollie, post("maj")); ok(r.code === 403 && r.body.motif === "maj", "60 € refusé sans paiement antérieur");
  store["users/u1"] = {commandeCoach: {payeLe: new Date(Date.now() - 50 * 864e5).toISOString()}};
  r = await run(mol.creerPaiementMollie, post("maj")); ok(r.code === 403 && r.body.motif === "maj", "60 € refusé à 50 jours (accès fermé)");
  store["users/u1"] = {commandeCoach: {payeLe: new Date(Date.now() - 20 * 864e5).toISOString()}};
  appels = []; r = await run(mol.creerPaiementMollie, post("maj")); ok(r.code === 200 && appels[0].body.amount.value === "60.00", "60 € accepté à 20 jours");
  r = await run(mol.creerPaiementMollie, post("montant80")); ok(appels.at(-1).body.amount.value === "80.00", "type inconnu → 80 (jamais un montant venu du client)");
  // webhook
  const paye = (uid) => ({id: "tr_abc123", status: "paid", mode: "test", paidAt: new Date().toISOString(), amount: {value: "80.00"}, metadata: {uid, type: "plan"}});
  delete store["users/u1"]; store["commandes/tr_abc123"] = {uid: "u2", email: "intrus@example.test", source: "mollie"};
  paiementRetour = paye("u2"); r = await run(mol.mollieWebhook, {body: {id: "tr_abc123"}});
  ok(r.code === 200 && !store["users/u2"] && !(store["commandes/tr_abc123"] || {}).activeLe, "webhook test, commande d'un autre e-mail : rien activé");
  delete store["commandes/tr_abc123"]; store["commandes/tr_abc123"] = {uid: "u1", email: "testeur@example.test", source: "mollie"}; paiementRetour = paye("u1"); r = await run(mol.mollieWebhook, {body: {id: "tr_abc123"}});
  ok(store["users/u1"] && store["users/u1"].commandeCoach.source === "mollie" && store["quotasIA/u1"].illimiteJusqu, "webhook payé, commande d'un e-mail autorisé : coaching + IA 44 j activés");
  const fin1 = store["quotasIA/u1"].illimiteJusqu; store["users/u1"] = {}; await run(mol.mollieWebhook, {body: {id: "tr_abc123"}});
  ok(!store["users/u1"].commandeCoach, "webhook rejoué : idempotent (pas de seconde activation)");
  r = await run(mol.mollieWebhook, {body: {id: "../x"}}); ok(r.code === 200, "id invalide ignoré");
  // webhook : id inconnu chez Mollie (404) -> 200, jamais 500
  paiementRetour = {erreur: 404}; r = await run(mol.mollieWebhook, {body: {id: "tr_inconnu"}}); ok(r.code === 200, "webhook : id inconnu de Mollie -> 200 (pas de 500)");
  // mollieEtat
  const etat = (tok, retour) => ({method: "POST", body: retour ? {retour: true} : {}, get: (h) => h === "Authorization" ? "Bearer " + tok : ""});
  r = await run(mol.mollieEtat, etat("mauvais")); ok(r.code === 401 && r.body.autorise === false, "mollieEtat sans jeton valide : 401");
  r = await run(mol.mollieEtat, {method: "GET", get: () => ""}); ok(r.code === 405, "mollieEtat en GET : 405");
  r = await run(mol.mollieEtat, etat("tok")); ok(r.code === 200 && r.body.autorise === true && r.body.mode === "test", "mollieEtat : e-mail autorisé -> autorise:true, mode test");
  for (const t of ["autre", "sansmail", "nonverif"]) { r = await run(mol.mollieEtat, etat(t)); ok(r.code === 200 && r.body.autorise === false, "mollieEtat : " + t + " -> autorise:false"); }
  // retour de paiement : annulé / échoué / expiré / en attente / payé
  const cmd = (id, uid, email, statut, extra = {}) => { store["commandes/" + id] = {uid, email, type: "plan", source: "mollie", statut, creeLe: new Date().toISOString(), ...extra}; };
  for (const st of ["canceled", "failed", "expired"]) {
    for (const k of Object.keys(store)) if (k.startsWith("commandes/")) delete store[k];
    delete store["users/u1"]; delete store["quotasIA/u1"];
    cmd("tr_x1", "u1", "testeur@example.test", "open"); paiementRetour = {id: "tr_x1", status: st, amount: {value: "80.00"}, metadata: {uid: "u1", type: "plan"}};
    r = await run(mol.mollieEtat, etat("tok", true));
    ok(r.body.paiement.statut === st && r.body.paiement.activee === false && !store["users/u1"] && !store["quotasIA/u1"], "retour " + st + " : statut relu chez Mollie, rien activé");
  }
  for (const k of Object.keys(store)) if (k.startsWith("commandes/")) delete store[k];
  cmd("tr_x2", "u1", "testeur@example.test", "open"); paiementRetour = {id: "tr_x2", status: "open", amount: {value: "80.00"}, metadata: {uid: "u1", type: "plan"}};
  r = await run(mol.mollieEtat, etat("tok", true)); ok(r.body.paiement.statut === "open" && r.body.paiement.activee === false && !store["users/u1"], "retour sans avoir payé (open) : rien activé");
  paiementRetour = {id: "tr_x2", status: "paid", paidAt: new Date().toISOString(), amount: {value: "80.00"}, metadata: {uid: "u1", type: "plan"}};
  r = await run(mol.mollieEtat, etat("tok", true)); ok(r.body.paiement.statut === "paid" && r.body.paiement.activee === true && store["users/u1"].commandeCoach.commande === "tr_x2" && store["quotasIA/u1"].illimiteJusqu, "retour payé, webhook pas encore passé : activé par mollieEtat");
  r = await run(mol.mollieEtat, etat("autre", true)); ok(r.body.paiement.statut === "aucune", "retour d'un autre compte : voit seulement SES paiements (aucune)");
  // l'autorisation se perd (liste modifiée) : la commande déjà créée ne s'active pas pour un e-mail retiré
  for (const k of Object.keys(store)) if (k.startsWith("commandes/")) delete store[k]; delete store["users/u1"];
  cmd("tr_x3", "u1", "retire@example.test", "open"); paiementRetour = {id: "tr_x3", status: "paid", paidAt: new Date().toISOString(), amount: {value: "80.00"}, metadata: {uid: "u1", type: "plan"}};
  r = await run(mol.mollieEtat, etat("tok", true)); ok(r.body.paiement.activee === false && !store["users/u1"], "clé test : commande d'un e-mail hors liste jamais activée");
  // clé live : l'interrupteur OUVERT_A_TOUS (false) garde la liste seule autorisée
  process.env.MOLLIE_API_KEY = "live_fake";
  r = await run(mol.mollieEtat, etat("autre")); ok(r.body.autorise === false && r.body.mode === "live", "clé live, interrupteur fermé : autre e-mail -> autorise:false");
  r = await run(mol.mollieEtat, etat("tok")); ok(r.body.autorise === true, "clé live : e-mail de la liste -> autorise:true");
  r = await run(mol.creerPaiementMollie, post("plan", "autre")); ok(r.code === 403, "clé live, interrupteur fermé : autre e-mail refusé (403)");
  r = await run(mol.creerPaiementMollie, post("plan", "sansmail")); ok(r.code === 403, "clé live : jeton sans e-mail refusé");
  r = await run(mol.creerPaiementMollie, post("plan", "tok")); ok(r.code === 200, "clé live : e-mail de la liste accepté");
})();
