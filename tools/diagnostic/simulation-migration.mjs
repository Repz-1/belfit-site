// SIMULATION de la migration de l'acces nutrition (29/10) : LECTURE SEULE.
// Reutilise planifier() de tools/migration-acces-nutrition.mjs (meme logique,
// meme sens que le script lance SANS --execute) mais ce fichier ne fait que des get().
//
// Le depot est PUBLIC : le journal ne contient QUE des nombres et des dates,
// jamais d'e-mail ni d'uid. Le client a duree fixe (adresse + date) est lu dans
// la charge utile de l'evenement GitHub (inputs.compte / inputs.jusqu), jamais
// en argument ni en variable de step.
//
// SIMULATION_FACTICE=1 : donnees inventees, sans Firebase (test local).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { planifier, finDeJourBruxelles } from '../migration-acces-nutrition.mjs';

if (process.argv.some((x) => x.startsWith('--execute') || x.startsWith('--confirme'))) {
  console.error('Simulation seulement : --execute est refuse ici.'); process.exit(2);
}

const FIN_ILLIMITEE_MS = Date.UTC(9999, 11, 31);
const COACHS = ['coach@belfit.be', 'contact@belfit.be']; // deja publics (functions/index.js)
const jour = (m) => (m >= FIN_ILLIMITEE_MS ? 'sans fin' : new Intl.DateTimeFormat('fr-BE', { timeZone: 'Europe/Brussels', dateStyle: 'short' }).format(new Date(m - 1))); // fin = 00:00 le lendemain -> jour inclus

function entrees() {
  try {
    const ev = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    return ev.inputs || {};
  } catch { return { compte: process.env.SIM_COMPTE || '', jusqu: process.env.SIM_JUSQU || '' }; }
}

async function lire() {
  if (process.env.SIMULATION_FACTICE === '1') {
    const j = Date.now() + 20 * 864e5;
    return [
      { uid: 'a', email: 'coach@belfit.be', user: {}, quota: null },
      { uid: 'b', email: 'x@ex.be', user: { accesPro: { jusqu: null } }, quota: null },
      { uid: 'c', email: 'k@ex.be', user: {}, quota: { illimiteJusqu: j } },
      { uid: 'd', email: 'z@ex.be', user: {}, quota: null },
    ];
  }
  const exiger = createRequire(new URL('../../functions/package.json', import.meta.url));
  const admin = exiger('firebase-admin');
  admin.initializeApp({ projectId: 'repz-baf60' });
  const db = admin.firestore();
  const [us, qs] = await Promise.all([db.collection('users').get(), db.collection('quotasIA').get()]);
  const quotas = new Map(qs.docs.map((d) => [d.id, d.data()]));
  const emails = new Map();
  const ids = us.docs.map((d) => d.id);
  for (let i = 0; i < ids.length; i += 100) {
    const r = await admin.auth().getUsers(ids.slice(i, i + 100).map((uid) => ({ uid })));
    r.users.forEach((x) => emails.set(x.uid, x.email || ''));
  }
  return us.docs.map((d) => ({ uid: d.id, email: emails.get(d.id) || '', user: d.data(), quota: quotas.get(d.id) || null }));
}

async function principal() {
  const inp = entrees();
  const clients = [];
  const compte = String(inp.compte || '').trim().toLowerCase();
  if (compte) {
    const finMs = finDeJourBruxelles(inp.jusqu);
    if (finMs === null) { console.error('jusqu invalide (AAAA-MM-JJ).'); process.exit(2); }
    clients.push({ email: compte, finMs });
  }
  const comptes = await lire();
  const sans = planifier(comptes, {});
  const avec = planifier(comptes, { clients });
  const parUid = new Map(); avec.ecrire.forEach((x) => parUid.set(x.uid, x));
  const raisonIgn = new Map(); avec.ignorer.forEach((x) => raisonIgn.set(x.uid, x.raison));
  const compter = (arr, f) => arr.reduce((m, x) => { m[f(x)] = (m[f(x)] || 0) + 1; return m; }, {});
  const dejaAJour = avec.ignorer.filter((x) => x.raison === 'déjà à jour').length;

  console.log("SIMULATION (lecture seule) : rien n'est ecrit.");
  console.log(`Comptes lus : ${comptes.length}`);
  console.log(`Acces a ecrire (avec client a duree fixe) : ${avec.ecrire.length}`);
  console.log(`Deja a jour : ${dejaAJour}`);
  console.log(`Bloques a l'allumage (aucun acces valable) : ${comptes.length - avec.ecrire.length - dejaAJour}`);
  console.log('Raisons des acces :', JSON.stringify(compter(avec.ecrire, (x) => x.raison)));
  console.log("Fins d'acces (jour, Bruxelles) :", JSON.stringify(compter(avec.ecrire, (x) => jour(x.fin))));
  console.log('Raisons ignorees :', JSON.stringify(compter(avec.ignorer, (x) => x.raison)));
  console.log(`Sans le client a duree fixe : ${sans.ecrire.length} acces a ecrire`);
  if (compte) {
    const c = comptes.find((x) => String(x.email).toLowerCase() === compte);
    if (!c) console.log('Client a duree fixe : compte INTROUVABLE');
    else { const e = parUid.get(c.uid); console.log(`Client a duree fixe : trouve ; ${e ? "acces jusqu'au " + jour(e.fin) + ' inclus (' + e.raison + ')' : "pas d'acces : " + raisonIgn.get(c.uid)}`); }
  }
  COACHS.forEach((m, i) => {
    const c = comptes.find((x) => String(x.email).toLowerCase() === m);
    if (!c) { console.log(`Compte coach ${i + 1} : introuvable`); return; }
    const e = parUid.get(c.uid);
    const ap = c.user && c.user.accesPro ? 'accesPro present' : "pas d'accesPro";
    console.log(`Compte coach ${i + 1} : trouve ; ${ap} ; ${e ? 'acces ' + jour(e.fin) + ' (' + e.raison + ')' : 'SERAIT BLOQUE : ' + raisonIgn.get(c.uid)}`);
  });
}

principal().catch((e) => { console.error('Echec :', e && e.message); process.exit(1); });
