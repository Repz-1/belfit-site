// Codes de reduction : logique de prix + validation + flux de paiement SIMULE.
// Aucun appel reseau, aucun vrai Firestore : firebase-admin et fetch sont remplaces.
// Tous les codes ci-dessous (MARC10, TEST15...) sont des CODES DE TEST LOCAUX, jamais crees en base.
process.env.GCLOUD_PROJECT = "repz-baf60";
process.env.REDUCTION_DELAI_MS = "0";
const path = require("path");
const fs = require("fs");
const RACINE = path.resolve(__dirname, "..");
const adminPath = require.resolve("firebase-admin", {paths: [path.join(RACINE, "functions")]});

// ---- Firestore en memoire, avec transactions optimistes (relecture si un document lu a change)
const store = {}; const versions = {};
const bump = (k) => { versions[k] = (versions[k] || 0) + 1; };
const nuage = () => new Promise((r) => setImmediate(r));
function ref(k) {
  const id = k.split("/").slice(1).join("/");
  return {id, _k: k,
    get: async () => { await nuage(); return {exists: k in store, id, ref: ref(k), data: () => (k in store ? JSON.parse(JSON.stringify(store[k])) : undefined)}; },
    set: async (v, o) => { await nuage(); store[k] = o && o.merge ? {...(store[k] || {}), ...v} : JSON.parse(JSON.stringify(v)); bump(k); },
    update: async (v) => { await nuage(); if (!(k in store)) throw new Error("NOT_FOUND " + k); store[k] = {...store[k], ...v}; bump(k); }};
}
function requete(col, filtres, tri, lim) {
  const q = {_col: col, _f: filtres, where: (c, op, v) => requete(col, [...filtres, [c, v]], tri, lim),
    orderBy: (c) => requete(col, filtres, c, lim), limit: (n) => requete(col, filtres, tri, n),
    get: async () => { await nuage(); let ks = Object.keys(store).filter((k) => k.startsWith(col + "/") && filtres.every(([c, v]) => store[k][c] === v));
      if (tri) ks = ks.sort((a, b) => String(store[b][tri]).localeCompare(String(store[a][tri]))); if (lim) ks = ks.slice(0, lim);
      return {docs: ks.map((k) => ({id: k.slice(col.length + 1), ref: ref(k), data: () => JSON.parse(JSON.stringify(store[k]))}))}; }};
  return q;
}
const fsStub = {collection: (c) => ({doc: (d) => ref(c + "/" + d), where: (champ, op, v) => requete(c, [[champ, v]]), orderBy: (c2) => requete(c, [], c2)}),
  runTransaction: async (fn) => {
    for (let essai = 0; essai < 10; essai++) {
      const lus = {}; const ecrits = [];
      const tx = {
        get: async (r) => { if (r._col) { const s = await r.get(); s.docs.forEach((d) => { lus[d.ref._k] = versions[d.ref._k] || 0; }); lus["Q:" + r._col] = Object.keys(store).filter((k) => k.startsWith(r._col + "/")).map((k) => k + "@" + (versions[k] || 0)).join(","); return s; }
          const s = await r.get(); lus[r._k] = versions[r._k] || 0; return s; },
        set: (r, v, o) => ecrits.push(["set", r, v, o]), update: (r, v) => ecrits.push(["update", r, v]),
      };
      const sortie = await fn(tx);
      // validation : rien de lu n'a change depuis
      const change = Object.keys(lus).some((k) => k.startsWith("Q:") ? lus[k] !== Object.keys(store).filter((x) => x.startsWith(k.slice(2) + "/")).map((x) => x + "@" + (versions[x] || 0)).join(",") : (versions[k] || 0) !== lus[k]);
      if (change) continue;
      for (const [t, r, v, o] of ecrits) { if (t === "set") { store[r._k] = o && o.merge ? {...(store[r._k] || {}), ...v} : JSON.parse(JSON.stringify(v)); } else { if (!(r._k in store)) throw new Error("NOT_FOUND"); store[r._k] = {...store[r._k], ...v}; } bump(r._k); }
      return sortie;
    }
    throw new Error("trop de conflits");
  }};
const TOKENS = {
  t1: {uid: "u1", email: "testeur@example.test", email_verified: true},
  t2: {uid: "u2", email: "liste2@example.test", email_verified: true},
  t3: {uid: "u3", email: "liste3@example.test", email_verified: true},
  hors: {uid: "u9", email: "pasdanslaliste@example.test", email_verified: true},
};
const adminStub = {auth: () => ({verifyIdToken: async (t) => { if (!(t in TOKENS)) throw new Error("x"); return TOKENS[t]; }}), firestore: () => fsStub, apps: [1], initializeApp() {}};
require.cache[adminPath] = {id: adminPath, filename: adminPath, loaded: true, exports: adminStub};

let appels = []; let mollieEchoue = false; let paiementRetour = null; let n = 0;
global.fetch = async (url, opt = {}) => {
  appels.push({url, body: opt.body && JSON.parse(opt.body)});
  if (opt.method === "POST") { if (mollieEchoue) return {ok: false, status: 422, json: async () => ({detail: "x"})}; n++; return {ok: true, json: async () => ({id: "tr_t" + n, status: "open", mode: "test", _links: {checkout: {href: "https://mollie.test/pay" + n}}})}; }
  return {ok: true, json: async () => paiementRetour};
};
process.env.MOLLIE_API_KEY = "test_fake"; process.env.MOLLIE_TEST_EMAILS = "testeur@example.test, liste2@example.test, liste3@example.test";
process.env.COACH_CODE = "secret-de-test-local";
const red = require(path.join(RACINE, "functions", "reduction.js"));
const mol = require(path.join(RACINE, "functions", "mollie.js"));
const adm = require(path.join(RACINE, "functions", "reduction-admin.js"));
const EE = require("events");
const rep = () => { const r = new EE(); Object.assign(r, {code: 200, body: null, headers: {}, set(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(b) { this.body = b; this.emit("finish"); return this; }, send(b) { this.body = b; this.emit("finish"); return this; }, setHeader(k, v) { this.headers[k] = v; }, getHeader() {}, end() { this.emit("finish"); }}); return r; };
const run = async (fn, req) => { const r = rep(); req.headers = req.headers || {}; req.header = req.get; await fn(req, r); return r; };
let echecs = 0;
const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) echecs++; };
const req = (tok, corps, ip = "1.1.1.1") => ({method: "POST", body: corps, ip, get: (h) => h === "Authorization" ? "Bearer " + tok : h === "x-forwarded-for" ? ip : ""});
const reqAdmin = (corps, ip = "9.9.9.9") => ({method: "POST", body: corps, ip, get: (h) => h === "x-forwarded-for" ? ip : ""});
const poser = (nom, o = {}) => { store["codesReduction/" + nom] = {pourcent: 10, actif: true, statut: "libre", cree: new Date().toISOString(), note: "", expire: null, reservePar: null, reserveJusqu: null, reserveCommande: null, utilisePar: null, utiliseLe: null, commande: null, ...o}; };
const vider = () => { for (const k of Object.keys(store)) delete store[k]; appels = []; };
const verif = (tok, code, type = "plan", ip) => run(mol.verifierCodeReduction, req(tok, {code, type}, ip));
const payer = (tok, corps, ip) => run(mol.creerPaiementMollie, req(tok, corps, ip));
const webhook = (id) => run(mol.mollieWebhook, {method: "POST", body: {id}, get: () => ""});
const PAYE = (id, uid, v) => ({id, status: "paid", mode: "test", paidAt: new Date().toISOString(), amount: {value: v}, metadata: {uid, type: "plan"}});

(async () => {
  console.log("— logique pure");
  ok(red.normaliserCode("  marc 10 ") === "MARC10" && red.normaliserCode("Marc-10") === "MARC10" && red.normaliserCode("été 15") === "ETE15" && red.normaliserCode(null) === "", "saisie normalisée : trim, majuscules, sans espace ni accent ni tiret");
  const p15 = red.calculerPrix(8000, 15); ok(p15.ok && p15.montant === "68.00" && p15.reduction === "12.00" && p15.base === "80.00", "-15 % sur 80 € : 68,00 € (réduction 12,00 €)");
  ok(red.calculerPrix(8000, 10).montant === "72.00" && red.calculerPrix(8000, 33).montant === "53.60" && red.calculerPrix(8000, 90).montant === "8.00", "-10 % : 72,00 € ; -33 % : 53,60 € ; -90 % : 8,00 € (centimes entiers)");
  for (const bad of [0, 91, 100, 1.5, -5, NaN, "10"]) ok(red.calculerPrix(8000, bad).ok === false, "pourcentage " + JSON.stringify(bad) + " refusé (reste payable en ligne)");
  ok(red.calculerPrix(150, 90).motif === "minimum", "prix final sous 1,00 € : motif « minimum »");
  ok(red.texteVersCents("80.00") === 8000 && red.texteVersCents("68.5") === 6850 && Number.isNaN(red.texteVersCents("abc")), "montants texte ↔ centimes");
  const now = Date.now(); const futur = new Date(now + 1e6).toISOString(); const passe = new Date(now - 1e6).toISOString();
  ok(red.evaluerCode(null, "u1", now).motif === "inconnu" && red.evaluerCode({actif: false}, "u1", now).motif === "desactive" && red.evaluerCode({expire: passe}, "u1", now).motif === "expire" && red.evaluerCode({statut: "utilise"}, "u1", now).motif === "utilise", "évaluation : inconnu / désactivé / expiré / utilisé");
  ok(red.evaluerCode({reservePar: "u2", reserveJusqu: futur}, "u1", now).motif === "reserve" && red.evaluerCode({reservePar: "u1", reserveJusqu: futur}, "u1", now).ok && red.evaluerCode({reservePar: "u2", reserveJusqu: passe}, "u1", now).ok, "réservation : bloque les autres, pas son titulaire, expire seule");
  const cl = red.clesEssais("u1", "1.2.3.4"); ok(!JSON.stringify(cl).includes("1.2.3.4"), "freinage : l'adresse IP n'est jamais stockée en clair");

  console.log("— vérification d'un code (lecture seule)");
  poser("MARC10", {pourcent: 10}); poser("TEST15", {pourcent: 15}); poser("ANCIEN", {statut: "utilise", utilisePar: "u3"}); poser("ARRET", {actif: false}); poser("PERIME", {expire: passe}); poser("BASS", {pourcent: 95});
  let r = await verif("t1", " marc 10 "); ok(r.code === 200 && r.body.ok && r.body.pourcent === 10 && r.body.montant === "72.00" && r.body.base === "80.00", "« marc 10 » (minuscules, espace) → MARC10 : -10 %, 72,00 €");
  ok(store["codesReduction/MARC10"].reservePar === null, "la vérification ne réserve et ne consomme rien");
  r = await verif("t1", "TEST15"); ok(r.body.montant === "68.00", "TEST15 : -15 % → 68,00 €");
  r = await verif("t1", "NOPE99"); ok(r.code === 404 && r.body.motif === "inconnu" && /n'existe pas/.test(r.body.message), "code inconnu : message clair");
  r = await verif("t1", "ANCIEN"); ok(r.body.motif === "utilise" && /déjà été utilisé/.test(r.body.message), "code déjà utilisé : message clair");
  r = await verif("t1", "ARRET"); ok(r.body.motif === "desactive" && /plus actif/.test(r.body.message), "code désactivé : message clair");
  r = await verif("t1", "PERIME"); ok(r.body.motif === "expire", "code expiré : message clair");
  r = await verif("t1", "TEST15", "maj"); ok(r.code === 403 && r.body.motif === "maj" && /60 €/.test(r.body.message), "mise à jour à 60 € : code refusé avec message");
  r = await verif("t1", ""); ok(r.body.motif === "vide", "champ vide : « Saisis ton code »");
  r = await verif("mauvais", "TEST15"); ok(r.code === 401, "sans jeton valide : 401");
  r = await verif("hors", "TEST15"); ok(r.code === 403 && r.body.motif === "test", "compte hors liste de test : refusé (pas d'énumération par n'importe quel compte)");
  r = await run(mol.verifierCodeReduction, {method: "GET", get: () => ""}); ok(r.code === 405, "GET refusé");
  // 28/10 : un client qui a deja paye un mois, ou deja utilise un code, peut en utiliser un autre.
  store["users/u1"] = {commandeCoach: {payeLe: new Date().toISOString()}};
  store["reductionsPersonne/tr_old"] = {uid: "u1", code: "ANCIEN", commande: "tr_old"};
  r = await verif("t1", "TEST15"); ok(r.code === 200 && r.body.ok && r.body.montant === "68.00", "client existant (a déjà payé, a déjà utilisé un code) : un autre code est accepté pour un nouveau mois à 80 €");
  delete store["users/u1"]; delete store["reductionsPersonne/tr_old"];
  r = await verif("t1", "BASS"); ok(r.code === 422 && r.body.motif === "minimum" && /contact@belfit.be/.test(r.body.message), "pourcentage hors limites (donnée corrompue) : refus propre, pas de paiement à 0 €");

  console.log("— anti-devinette");
  vider(); poser("TEST15", {pourcent: 15});
  for (let i = 0; i < 8; i++) await verif("t1", "FAUX" + i, "plan", "5.5.5.5");
  r = await verif("t1", "TEST15", "plan", "5.5.5.5"); ok(r.code === 429 && r.body.motif === "essais", "8 mauvais essais : le 9e est bloqué, même avec le bon code (429)");
  r = await payer("t1", {type: "plan", code: "TEST15"}, "5.5.5.5"); ok(r.code === 429 && appels.length === 0, "le paiement avec code est bloqué aussi, aucun appel Mollie");
  r = await verif("t2", "TEST15", "plan", "5.5.5.5"); ok(r.code === 429, "autre compte, même adresse IP : bloqué (comptes jetables)");
  r = await verif("t3", "TEST15", "plan", "6.6.6.6"); ok(r.code === 200 && r.body.ok, "autre compte, autre adresse : non bloqué");
  ok(await red.tropDEssais(red.clesEssais("u1", "0.0.0.0"), Date.now()) === true && await red.tropDEssais(red.clesEssais("u1", "0.0.0.0"), Date.now() + red.FENETRE_MS + 5000) === false, "le blocage retombe après 15 minutes");
  ok(!Object.keys(store).some((k) => k.startsWith("essaisCodes/") && /5\.5\.5\.5/.test(k)), "aucune adresse IP en clair dans les compteurs");

  console.log("— paiement avec code (Mollie simulé)");
  vider(); poser("MARC10", {pourcent: 10}); poser("TEST15", {pourcent: 15});
  r = await payer("t1", {type: "plan", code: "marc10", montant: "1.00", pourcent: 99, amount: {value: "1.00"}});
  const corpsMollie = appels[0].body;
  ok(r.code === 200 && corpsMollie.amount.value === "72.00" && corpsMollie.amount.currency === "EUR", "montant envoyé à Mollie = 72.00 (calculé serveur), malgré « montant: 1.00 » et « pourcent: 99 » envoyés par le client");
  ok(store["commandes/tr_t1"].code === "MARC10" && store["commandes/tr_t1"].montant === "72.00" && store["commandes/tr_t1"].montantBase === "80.00" && store["commandes/tr_t1"].pourcent === 10, "commande enregistrée avec code, pourcentage, montant de base et montant payé");
  ok(store["codesReduction/MARC10"].reservePar === "u1" && store["codesReduction/MARC10"].reserveCommande === "tr_t1" && store["codesReduction/MARC10"].statut === "libre", "code RÉSERVÉ (pas encore utilisé) tant que le paiement n'est pas confirmé");
  r = await payer("t2", {type: "plan", code: "MARC10"}); ok(r.code === 409 && r.body.motif === "reserve" && appels.length === 1, "deuxième personne, même code pendant la réservation : refusée, aucun 2e paiement Mollie");
  r = await payer("t1", {type: "plan"}); ok(r.code === 200 && appels.at(-1).body.amount.value === "80.00" && !("code" in store["commandes/tr_t2"]), "sans code : 80.00 comme avant");
  appels = [];
  r = await payer("t1", {type: "maj", code: "TEST15"}); ok(r.code === 403 && r.body.motif === "maj" && appels.length === 0 && store["codesReduction/TEST15"].reservePar === null, "60 € + code : refusé côté serveur, aucun appel Mollie, code non réservé");
  store["users/u3"] = {commandeCoach: {payeLe: new Date().toISOString()}};
  r = await payer("t3", {type: "plan", code: "TEST15"}); ok(r.code === 200 && appels.at(-1).body.amount.value === "68.00" && store["codesReduction/TEST15"].reservePar === "u3", "client déjà payant : peut réserver un code pour un nouveau mois à 80 € (68.00)");
  store["codesReduction/TEST15"].reservePar = null; store["codesReduction/TEST15"].reserveJusqu = null; store["codesReduction/TEST15"].reserveCommande = null;
  delete store["users/u3"];
  // réservation d'un autre code par la même personne : l'ancienne est libérée
  r = await payer("t1", {type: "plan", code: "TEST15"});
  ok(r.code === 200 && store["codesReduction/TEST15"].reservePar === "u1" && store["codesReduction/MARC10"].reservePar === null, "même personne, autre code : l'ancienne réservation est libérée (un code à la fois)");
  r = await payer("hors", {type: "plan", code: "MARC10"}); ok(r.code === 403 && r.body.motif === "test", "compte non autorisé : refus avant tout");

  console.log("— confirmation du paiement : le code est consommé");
  vider(); poser("MARC10", {pourcent: 10});
  await payer("t1", {type: "plan", code: "MARC10"}); const id = "tr_t" + n;
  paiementRetour = PAYE(id, "u1", "72.00"); await webhook(id);
  ok(store["codesReduction/MARC10"].statut === "utilise" && store["codesReduction/MARC10"].utilisePar === "u1" && store["codesReduction/MARC10"].commande === id && store["codesReduction/MARC10"].reservePar === null, "paiement confirmé : code « utilisé » (par qui, quand, quelle commande)");
  ok(store["reductionsPersonne/" + id].uid === "u1" && store["reductionsPersonne/" + id].code === "MARC10" && store["users/u1"].commandeCoach.montant === "72.00 EUR" && store["quotasIA/u1"].illimiteJusqu, "usage inscrit à l'historique (clé = commande) ; coaching activé, montant payé 72.00 EUR");
  const avant = JSON.stringify(store["codesReduction/MARC10"]); await webhook(id);
  ok(JSON.stringify(store["codesReduction/MARC10"]) === avant, "webhook rejoué : rien ne change (idempotent)");
  r = await verif("t2", "MARC10"); ok(r.body.motif === "utilise", "autre personne ensuite : « déjà utilisé »");
  // 28/10 : rachat d'un autre mois par la même personne, avec un AUTRE code
  poser("TEST15", {pourcent: 15}); r = await verif("t1", "TEST15"); ok(r.code === 200 && r.body.ok && r.body.montant === "68.00", "après son paiement, la même personne peut utiliser un autre code (autre mois à 80 €)");
  r = await verif("t1", "MARC10"); ok(r.body.motif === "utilise", "…mais pas le même code une 2e fois");
  r = await payer("t1", {type: "plan", code: "TEST15"}); const idR = "tr_t" + n;
  ok(r.code === 200 && appels.at(-1).body.amount.value === "68.00", "rachat avec un 2e code : paiement Mollie à 68.00");
  paiementRetour = PAYE(idR, "u1", "68.00"); await webhook(idR);
  ok(store["codesReduction/TEST15"].statut === "utilise" && store["codesReduction/TEST15"].utilisePar === "u1" && store["users/u1"].commandeCoach.montant === "68.00 EUR", "rachat : 2e code consommé, accès prolongé, montant 68.00 EUR");
  ok(Object.keys(store).filter((k) => k.startsWith("reductionsPersonne/") && store[k].uid === "u1").length === 2, "historique : 2 lignes pour la même personne (MARC10 puis TEST15), aucun blocage");
  poser("TROIS", {pourcent: 5}); r = await verif("t1", "TROIS"); ok(r.code === 200 && r.body.ok, "et un 3e code reste possible : aucune limite à vie");
  r = await payer("t1", {type: "maj", code: "TROIS"}); ok(r.code === 403 && r.body.motif === "maj", "la mise à jour à 60 € reste sans code, même pour un client existant");

  console.log("— paiement qui échoue : le code est rendu");
  for (const st of ["canceled", "failed", "expired"]) {
    vider(); poser("MARC10", {pourcent: 10});
    await payer("t1", {type: "plan", code: "MARC10"}); const i2 = "tr_t" + n;
    paiementRetour = {id: i2, status: st, amount: {value: "72.00"}, metadata: {uid: "u1", type: "plan"}}; await webhook(i2);
    ok(store["codesReduction/MARC10"].reservePar === null && store["codesReduction/MARC10"].statut === "libre" && !Object.keys(store).some((k) => k.startsWith("reductionsPersonne/")) && !store["users/u1"], "paiement " + st + " : code libre, rien activé");
    r = await verif("t2", "MARC10"); if (st === "canceled") ok(r.body.ok === true, "…et une autre personne peut s'en servir");
  }
  vider(); poser("MARC10", {pourcent: 10});
  await payer("t1", {type: "plan", code: "MARC10"}); const i3 = "tr_t" + n;
  paiementRetour = {id: i3, status: "open", amount: {value: "72.00"}, metadata: {uid: "u1", type: "plan"}}; await webhook(i3);
  ok(store["codesReduction/MARC10"].reservePar === "u1", "paiement encore ouvert : la réservation tient");
  store["codesReduction/MARC10"].reserveJusqu = new Date(Date.now() - 1000).toISOString();
  r = await payer("t2", {type: "plan", code: "MARC10"}); ok(r.code === 200 && store["codesReduction/MARC10"].reservePar === "u2", "réservation échue (70 min) : le code est repris par la personne suivante");
  vider(); poser("MARC10", {pourcent: 10}); mollieEchoue = true;
  r = await payer("t1", {type: "plan", code: "MARC10"}); mollieEchoue = false;
  ok(r.code === 500 && store["codesReduction/MARC10"].reservePar === null, "Mollie refuse de créer le paiement : réservation aussitôt libérée");

  console.log("— triche et incohérences");
  vider(); poser("MARC10", {pourcent: 10});
  await payer("t1", {type: "plan", code: "MARC10"}); const i4 = "tr_t" + n;
  paiementRetour = PAYE(i4, "u1", "80.00"); await webhook(i4);
  ok(!store["users/u1"] && store["codesReduction/MARC10"].statut === "libre", "montant encaissé ≠ montant attendu (80.00 au lieu de 72.00) : rien activé, code non consommé");
  vider(); poser("MARC10", {pourcent: 10});
  await payer("t1", {type: "plan", code: "MARC10"}); const i5 = "tr_t" + n;
  paiementRetour = PAYE(i5, "u1", "1.00"); await webhook(i5);
  ok(!store["users/u1"], "paiement de 1.00 pour une commande à 72.00 : rien activé");
  // deux personnes en même temps sur le même code
  vider(); poser("COURSE", {pourcent: 20});
  const [a, b, c] = await Promise.all([red.reserver({uid: "u1", code: "COURSE"}), red.reserver({uid: "u2", code: "COURSE"}), red.reserver({uid: "u3", code: "COURSE"})]);
  const gagnants = [a, b, c].filter((x) => x.ok).length;
  ok(gagnants === 1 && [a, b, c].filter((x) => x.motif === "reserve").length === 2, "3 demandes simultanées du même code : exactement 1 gagnant, 2 refusées (transaction)");
  vider(); poser("DOUBLE", {pourcent: 10});
  await payer("t1", {type: "plan", code: "DOUBLE"}); const j1 = "tr_t" + n;
  store["codesReduction/DOUBLE"].reserveJusqu = new Date(Date.now() - 1).toISOString();
  await payer("t2", {type: "plan", code: "DOUBLE"}); const j2 = "tr_t" + n;
  paiementRetour = PAYE(j2, "u2", "72.00"); await webhook(j2);
  paiementRetour = PAYE(j1, "u1", "72.00"); await webhook(j1);
  ok(store["codesReduction/DOUBLE"].utilisePar === "u2" && Object.keys(store).filter((k) => k.startsWith("reductionsPersonne/")).length === 1 && store["reductionsPersonne/" + j2] && store["users/u1"], "cas rare (réservation échue puis double paiement) : un seul usage enregistré, les deux paiements honorés, conflit journalisé");

  console.log("— administration (outil local)");
  vider();
  let ra = await run(adm.adminCodesReduction, reqAdmin({code: "mauvais", action: "lister"})); ok(ra.code === 403 && !JSON.stringify(ra.body).includes("secret-de-test-local"), "mauvais secret : 403, secret jamais renvoyé");
  ra = await run(adm.adminCodesReduction, {method: "GET", get: () => ""}); ok(ra.code === 405, "GET : 405");
  ok(/cors: \["https:\/\/belfit\.be", "https:\/\/www\.belfit\.be"\]/.test(require("fs").readFileSync(require("path").join(__dirname, "../functions/reduction-admin.js"), "utf8")), "administration appelable depuis la page coach : CORS limité à belfit.be / www.belfit.be");
  ra = await run(adm.adminCodesReduction, reqAdmin({code: "secret-de-test-local", action: "creer", nomCode: "marc 10", pourcent: 10, note: "Marc"}));
  ok(ra.code === 200 && ra.body.code === "MARC10" && ra.body.montant === "72.00" && store["codesReduction/MARC10"].actif === true && store["codesReduction/MARC10"].pourcent === 10, "création : MARC10 -10 % (CODE DE TEST, mémoire locale)");
  ra = await run(adm.adminCodesReduction, reqAdmin({code: "secret-de-test-local", action: "creer", nomCode: "MARC10", pourcent: 20})); ok(ra.code === 409 && store["codesReduction/MARC10"].pourcent === 10, "code déjà existant : refusé, l'ancien n'est pas écrasé");
  for (const bad of [0, 95, 100, 12.5, "x"]) { ra = await run(adm.adminCodesReduction, reqAdmin({code: "secret-de-test-local", action: "creer", nomCode: "ZZZZ", pourcent: bad})); ok(ra.code === 400, "création avec " + JSON.stringify(bad) + " % : refusée"); }
  ra = await run(adm.adminCodesReduction, reqAdmin({code: "secret-de-test-local", action: "creer", pourcent: 15})); ok(ra.code === 200 && /^[A-HJ-NP-Z2-9]{8}$/.test(ra.body.code), "sans nom : code aléatoire de 8 caractères (sans I, O, 0, 1)");
  ra = await run(adm.adminCodesReduction, reqAdmin({code: "secret-de-test-local", action: "desactiver", nomCode: "marc10"})); r = await verif("t1", "MARC10");
  ok(ra.body.actif === false && r.body.motif === "desactive", "désactivation : le code est refusé aussitôt");
  await run(adm.adminCodesReduction, reqAdmin({code: "secret-de-test-local", action: "reactiver", nomCode: "MARC10"})); r = await verif("t1", "MARC10"); ok(r.body.ok === true, "réactivation");
  ra = await run(adm.adminCodesReduction, reqAdmin({code: "secret-de-test-local", action: "desactiver", nomCode: "INCONNU"})); ok(ra.code === 404, "désactiver un code inconnu : 404");
  store["codesReduction/MARC10"].utilisePar = "u1"; store["codesReduction/MARC10"].statut = "utilise";
  ra = await run(adm.adminCodesReduction, reqAdmin({code: "secret-de-test-local", action: "lister"}));
  ok(ra.code === 200 && ra.body.codes.length === 2 && !JSON.stringify(ra.body).includes("u1") && ra.body.codes.some((x) => x.code === "MARC10" && x.etat === "utilise"), "liste : codes, pourcentages, états ; aucun identifiant de client");
  for (let i = 0; i < 8; i++) await run(adm.adminCodesReduction, reqAdmin({code: "x" + i, action: "lister"}, "7.7.7.7"));
  ra = await run(adm.adminCodesReduction, reqAdmin({code: "secret-de-test-local", action: "lister"}, "7.7.7.7")); ok(ra.code === 429, "8 mauvais secrets : l'adresse est bloquée, même avec le bon");

  console.log("— règles Firestore");
  const regles = fs.readFileSync(path.join(RACINE, "firestore.rules"), "utf8");
  for (const col of ["codesReduction", "reductionsPersonne", "essaisCodes"]) ok(new RegExp("match /" + col + "/\\{\\w+\\} \\{\\s*allow read, write: if false;").test(regles), "règles : " + col + " fermée au client (lecture et écriture interdites)");
  console.log(echecs ? "\nÉCHEC (" + echecs + ")" : "\nOK");
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
