// MIGRATION CIBLEE de l'acces nutrition : n'ecrit QUE pour les comptes donnes a la main.
// Jamais tous les comptes : sans liste explicite, le script refuse de tourner.
// Depot PUBLIC : le journal ne contient que des nombres et des dates (aucun e-mail, aucun uid).
// Les adresses sont lues dans la charge utile de l'evenement GitHub (inputs), jamais en argument.
//   inputs.illimites : adresses (separees par des virgules) -> acces sans fin
//   inputs.compte + inputs.jusqu : client a duree fixe (fin du jour incluse, Bruxelles)
//   inputs.confirme : OUI pour ecrire ; sinon simulation.
// Jamais de raccourcissement : on n'ecrit que si la nouvelle fin est plus tardive.
// Jamais de creation : un compte (Auth ou users/{uid}) absent est signale, pas cree.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { planifier, finDeJourBruxelles } from '../migration-acces-nutrition.mjs';

const FIN_ILLIMITEE_MS = Date.UTC(9999, 11, 31);
const jour = (m) => (m >= FIN_ILLIMITEE_MS ? 'sans fin' : new Intl.DateTimeFormat('fr-BE', { timeZone: 'Europe/Brussels', dateStyle: 'short' }).format(new Date(m - 1)) + ' inclus');
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : (typeof v === 'number' ? v : null));

const inp = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')).inputs || {};
const liste = (t) => String(t || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
const illimites = liste(inp.illimites);
const compte = String(inp.compte || '').trim().toLowerCase();
const execute = String(inp.confirme || '') === 'OUI';
if (!illimites.length && !compte) { console.error('Aucune liste de comptes : arret (jamais tous les comptes).'); process.exit(2); }
const clients = [];
if (compte) {
  const finMs = finDeJourBruxelles(inp.jusqu);
  if (finMs === null || !/^\d{4}-\d{2}-\d{2}$/.test(String(inp.jusqu || '').trim())) { console.error('jusqu invalide (AAAA-MM-JJ).'); process.exit(2); }
  clients.push({ email: compte, finMs });
}
const demandes = [...new Set([...illimites, ...(compte ? [compte] : [])])];

const exiger = createRequire(new URL('../../functions/package.json', import.meta.url));
const admin = exiger('firebase-admin');
admin.initializeApp({ projectId: 'repz-baf60' });
const db = admin.firestore();

const comptes = []; let introuvables = 0;
for (const mail of demandes) {
  let u;
  try { u = await admin.auth().getUserByEmail(mail); } catch (e) { introuvables++; continue; }
  const [ud, qd] = await Promise.all([db.collection('users').doc(u.uid).get(), db.collection('quotasIA').doc(u.uid).get()]);
  if (!ud.exists) { introuvables++; continue; }
  comptes.push({ uid: u.uid, email: mail, user: ud.data(), quota: qd.exists ? qd.data() : null });
}
const plan = planifier(comptes, { illimites, clients, seulement: true });

console.log(execute ? 'ECRITURE REELLE (comptes listes seulement)' : "SIMULATION : rien n'est ecrit");
console.log(`Comptes demandes : ${demandes.length} · trouves : ${comptes.length} · introuvables (non crees) : ${introuvables}`);
console.log(`A ecrire : ${plan.ecrire.length} · ignores : ${plan.ignorer.length}`);
let ecrits = 0, refuses = 0;
for (const x of plan.ecrire) {
  console.log(`- acces ${jour(x.fin)} (${x.raison})`);
  if (!execute) continue;
  const ref = db.collection('users').doc(x.uid);
  await db.runTransaction(async (t) => {
    const d = await t.get(ref);
    if (!d.exists) { refuses++; return; }
    const act = ms(d.get('accesNutritionJusqu'));
    if (act !== null && act >= x.fin) { refuses++; return; } // jamais raccourcir
    t.update(ref, { accesNutritionJusqu: admin.firestore.Timestamp.fromMillis(x.fin) });
    ecrits++;
  });
}
plan.ignorer.forEach((x) => console.log(`- ignore : ${x.raison}`));
if (execute) console.log(`Ecrits : ${ecrits} · non ecrits (deja plus tard ou disparu) : ${refuses}`);
