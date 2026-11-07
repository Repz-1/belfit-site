// Plan offert : decisions et ecriture sur un Firestore en memoire.
// Aucun reseau, aucun compte reel, aucun appel Mollie.
const path = require("path");
const fs = require("fs");
const I = require(path.join(__dirname, "..", "functions", "invitation-offerte.js"));

let code = 0;
const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) code = 1; };

function memDb() {
  const store = {};
  function ref(p) {
    return {
      path: p,
      get: async () => ({exists: Object.prototype.hasOwnProperty.call(store, p), data: () => store[p]}),
      set: async (v, o) => { store[p] = o && o.merge ? {...(store[p] || {}), ...v} : v; },
    };
  }
  return {
    store,
    collection: (c) => ({doc: (id) => ref(c + "/" + id)}),
    runTransaction: async (fn) => fn({
      get: (r) => r.get(),
      set: (r, v, o) => r.set(v, o),
    }),
  };
}

const CODE = "PLANOFF1";
const MAIL = "client@example.test";
function offre(extra = {}) {
  return {mode: "offert", type: "plan", email: MAIL, montant: "0 EUR", note: "test", utilisePar: null, ...extra};
}

(async () => {
  ok(I.preparerOfferte({email: "  Client@Example.TEST ", note: "  note  "}).email === MAIL, "adresse normalisee");
  ok(I.preparerOfferte({email: "pas-une-adresse"}).motif === "email", "adresse invalide refusee");
  ok(I.preparerOfferte({email: ""}).ok === false, "adresse vide refusee");
  const lien = I.lienInvitation(CODE);
  ok(lien === "https://belfit.be/?invitation=" + CODE && !/coach=|onglet=|mollie/i.test(lien), "lien = invitation seule, pas le retour Mollie");
  ok(I.modeDe({}) === "virement" && I.modeDe({mode: "offert"}) === "offert", "document sans mode = virement, rien n'est migre");

  const bon = {uid: "u1", email: "Client@Example.TEST", verifie: true};
  let db = memDb();
  db.store["invitations/" + CODE] = offre();
  let r = await I.consommer(db, {...bon, code: CODE});
  const cmd = db.store["users/u1"].commandeCoach;
  ok(r.ok && r.mode === "offert" && cmd.source === "offert" && cmd.montant === "0 EUR" && cmd.payeLe && !cmd.virement, "offre : source offert, montant 0, sans virement");
  ok(!db.store["users/u1"].accesNutritionJusqu && !db.store["users/u1"].accesPro && !db.store["quotasIA/u1"], "offre : pas d'acces nutrition, ni PRO, ni quota IA");
  ok(db.store["invitations/" + CODE].utilisePar === "u1" && db.store["invitations/" + CODE].email === MAIL, "offre : lien marque utilise, adresse conservee");
  const payeLe = cmd.payeLe;
  db.store["users/u1"].commandeCoach.marque = "ne-pas-ecraser";
  r = await I.consommer(db, {...bon, code: CODE});
  ok(r.deja === true && db.store["users/u1"].commandeCoach.marque === "ne-pas-ecraser" && db.store["users/u1"].commandeCoach.payeLe === payeLe, "meme compte : idempotent, commande intacte");

  r = await I.consommer(db, {code: CODE, uid: "u2", email: MAIL, verifie: true});
  ok(r.motif === "utilisee" && db.store["invitations/" + CODE].utilisePar === "u1" && !db.store["users/u2"], "autre compte, meme adresse : refuse, lien non reattribue");

  db = memDb();
  db.store["invitations/" + CODE] = offre();
  r = await I.consommer(db, {code: CODE, uid: "u9", email: "autre@example.test", verifie: true});
  ok(r.motif === "adresse" && !db.store["invitations/" + CODE].utilisePar && !db.store["users/u9"], "mauvaise adresse : refuse, lien encore libre");
  r = await I.consommer(db, {code: CODE, uid: "u1", email: MAIL, verifie: false});
  ok(r.motif === "verification" && !db.store["invitations/" + CODE].utilisePar, "adresse non confirmee : refuse, lien encore libre");
  r = await I.consommer(db, {...bon, code: CODE});
  ok(r.ok && db.store["users/u1"].commandeCoach.source === "offert", "apres refus, le bon compte confirme peut encore utiliser le lien");

  db = memDb();
  db.store["invitations/" + CODE] = offre();
  db.store["users/u1"] = {commandeCoach: {source: "mollie", payeLe: "2026-01-01T00:00:00.000Z", commande: "tr_x", type: "plan"}, prenom: "garde"};
  r = await I.consommer(db, {...bon, code: CODE});
  ok(r.motif === "deja_commande" && db.store["users/u1"].commandeCoach.source === "mollie" && db.store["users/u1"].prenom === "garde" && !db.store["invitations/" + CODE].utilisePar, "commande Mollie existante : pas ecrasee, lien non consomme");

  db = memDb();
  db.store["invitations/VIREMENT1"] = {type: "plan", note: "ancien", utilisePar: null};
  r = await I.consommer(db, {code: "VIREMENT1", uid: "u3", email: "qui@example.test", verifie: false});
  const v = db.store["users/u3"].commandeCoach;
  ok(r.ok && r.mode === "virement" && v.source === "invitation" && v.virement && v.virement.montant === 80 && v.virement.statut === "attente" && !v.montant, "invitation sans mode : virement 80, meme sans e-mail confirme");
  ok(!db.store["quotasIA/u3"] && !db.store["users/u3"].accesNutritionJusqu, "virement : toujours pas d'acces nutrition a l'ouverture du lien");

  ok(!I.entreFile({envoyeLe: null, livreLe: null}), "sans questionnaire : pas dans la file");
  ok(I.entreFile({envoyeLe: "2026-11-02T00:00:00.000Z", livreLe: null}), "questionnaire offert envoye : dans la file");
  ok(!I.entreFile({envoyeLe: "2026-11-02T00:00:00.000Z", livreLe: "2026-11-03T00:00:00.000Z"}), "programme livre apres : plus dans la file");

  const index = fs.readFileSync(path.join(__dirname, "..", "functions", "index.js"), "utf8");
  const garde = index.indexOf("if (!codeCoachValide(corps.code))");
  const action = index.indexOf('action === "creerInvitationOfferte"');
  ok(garde > 0 && action > garde, "creerInvitationOfferte n'est atteint qu'apres le code coach");
  ok(!/exports\.creerInvitationOfferte/.test(index), "pas d'endpoint public separe pour creer une offre");
  ok(/invitationOfferte\.consommer\(db/.test(index), "utiliserInvitation passe par le meme controle serveur");
  ok(/if \(!cmd \|\| !cmd\.virement\)/.test(index), "Virement recu exige toujours un virement (l'offre n'en a pas)");

  process.exit(code);
})();
