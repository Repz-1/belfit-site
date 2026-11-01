// Test local de functions/contact.js (aucun envoi reel, Firestore simule).
const {_test} = require("../functions/contact.js");
let code = 0; const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) code = 1; };
const store = {};
const db = {collection: () => ({doc: (id) => ({id})}),
  runTransaction: async (f) => f({get: async (r) => ({exists: !!store[r.id], data: () => store[r.id]}), set: (r, d) => { store[r.id] = d; }})};
const envois = [];
const h = _test.gestionnaire({db, envoyer: async (c) => { envois.push(c); return {ok: true}; }});
const appel = async (body, ip = "1.2.3.4", origin = "https://www.belfit.be", method = "POST") => {
  const res = {s: 200, h: {}, b: null, status(x) { this.s = x; return this; }, json(b) { this.b = b; return this; }, send() { return this; }, set(k, v) { this.h[k] = v; }};
  await h({method, body, ip, get: (k) => ({"Origin": origin, "x-forwarded-for": ip}[k])}, res); return res;
};
const bon = {nom: "Jean", email: "jean@example.com", sujet: "Question", message: "Bonjour, une question.", consentement: true, site: ""};
(async () => {
  let r = await appel(bon); ok(r.s === 200 && r.b.ok && envois.length === 1, "message valide : envoyé");
  ok(envois[0].to[0] === "contact@belfit.be" && envois[0].from === "BELFIT <noreply@belfit.be>" && envois[0].reply_to === "jean@example.com", "destinataire, expéditeur, réponse à");
  ok(r.h["Access-Control-Allow-Origin"] === "https://www.belfit.be", "CORS belfit.be");
  r = await appel({...bon, nom: "<b>x</b>"}, "9.9.9.1"); ok(!/<b>x/.test(envois[1].html), "HTML échappé");
  for (const [k, v, e] of [["email", "pasunmail", "email"], ["consentement", false, "consentement"], ["sujet", "Spam", "sujet"], ["message", "x".repeat(2001), "message"], ["nom", "", "nom"], ["nom", "a\nBcc: x", "nom"]]) {
    r = await appel({...bon, [k]: v}, "5.5.5.5"); ok(r.s === 400 && r.b.erreur === e, "refus " + k);
  }
  const n = envois.length; r = await appel({...bon, site: "http://spam"}, "6.6.6.6"); ok(r.s === 200 && envois.length === n, "honeypot : ok silencieux, rien envoyé");
  for (let i = 0; i < 3; i++) r = await appel(bon, "7.7.7.7");
  ok(r.s === 200, "3 envois / heure acceptés"); r = await appel(bon, "7.7.7.7"); ok(r.s === 429, "4e envoi dans l'heure : 429");
  r = await appel(bon, "1.1.1.1", "https://evil.example"); ok(!r.h["Access-Control-Allow-Origin"], "autre origine : pas d'en-tête CORS");
  r = await appel(bon, "1.1.1.1", "https://www.belfit.be", "GET"); ok(r.s === 405, "GET refusé");
  ok(!Object.keys(store).some(k => k.includes("7.7.7.7")), "IP jamais stockée en clair");
  process.exit(code);
})();
