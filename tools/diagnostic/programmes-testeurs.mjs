// Programmes de TEST pour les testeurs Google Play (22/11, Raci).
// Depose tools/testeurs/programmes/testeur-NN.json chez le NN-ieme compte
// donne en entree (meme forme que deposerChez, functions/index.js).
//
//   node tools/diagnostic/programmes-testeurs.mjs
//
// Entrees (charge utile de l'evenement GitHub, jamais dans le journal) :
//   comptes  : adresses, separees par virgules ou retours a la ligne (max 13)
//   confirme : « OUI » pour ecrire. Sinon SIMULATION (lecture seule).
//   ecraser  : « OUI » pour remplacer un programme deja present (sinon ignore).
// En test : variables PT_COMPTES / PT_CONFIRME / PT_ECRASER, PT_FACTICE=1 (sans Firebase).
//
// Ce que le script NE fait PAS : aucun e-mail (pas d'appel Resend), aucun
// changement d'acces (accesNutritionJusqu intact), aucune suppression.
// Journal public : numeros et oui/non seulement, aucune adresse.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const PROJET = 'repz-baf60';
const MAX = 13;
const DOSSIER = new URL('../testeurs/programmes/', import.meta.url);

function entrees() {
  let i = {};
  if (process.env.GITHUB_EVENT_PATH) i = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')).inputs || {};
  const comptes = String(process.env.PT_COMPTES || i.comptes || '')
    .split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  return {
    comptes,
    confirme: String(process.env.PT_CONFIRME || i.confirme || 'NON').trim() === 'OUI',
    ecraser: String(process.env.PT_ECRASER || i.ecraser || 'NON').trim() === 'OUI',
  };
}

export function chargerProgramme(n) {
  const p = JSON.parse(readFileSync(new URL(`testeur-${String(n).padStart(2, '0')}.json`, DOSSIER), 'utf8'));
  // Memes bornes que deposerChez.
  const ok = (v, a, b) => Number.isFinite(v) && v >= a && v <= b;
  if (!ok(p.kcal, 800, 8000) || !ok(p.prot, 20, 600) || !ok(p.carbs, 20, 1200) || !ok(p.lip, 10, 400)) throw new Error(`valeurs ${n}`);
  if (!Array.isArray(p.repas) || !p.repas.length || p.repas.length > 12) throw new Error(`repas ${n}`);
  return p;
}

async function principal() {
  const {comptes, confirme, ecraser} = entrees();
  if (!comptes.length) { console.log('Aucun compte : arret.'); process.exit(1); }
  if (comptes.length > MAX) { console.log(`Plus de ${MAX} comptes : arret.`); process.exit(1); }
  if (comptes.some((c) => !c.includes('@'))) { console.log('Entree invalide (adresse attendue) : arret.'); process.exit(1); }
  console.log(confirme ? 'MODE ECRITURE (confirme=OUI)' : 'SIMULATION : aucune ecriture');
  console.log(`ecraser un programme existant : ${ecraser ? 'oui' : 'non'} ; e-mail au client : jamais`);

  const factice = process.env.PT_FACTICE === '1';
  let admin = null; let db = null;
  if (!factice) {
    const require = createRequire(new URL('../../functions/package.json', import.meta.url));
    admin = require('firebase-admin');
    admin.initializeApp({projectId: PROJET});
    db = admin.firestore();
  }
  const bilan = {absents: 0, ecrits: 0, prevus: 0, ignores: 0};
  for (let k = 0; k < comptes.length; k++) {
    const n = k + 1;
    const prog = chargerProgramme(n);
    let uid = null; let d = null;
    if (factice) { uid = n % 4 === 1 ? null : 'uid' + n; d = n === 3 ? {programme: {kcal: 2000, repas: [{}], livreLe: 'x'}} : {}; }
    else {
      try { uid = (await admin.auth().getUserByEmail(comptes[k])).uid; } catch (e) { uid = null; }
      if (uid) { const s = await db.collection('users').doc(uid).get(); d = s.exists ? s.data() : null; }
    }
    if (!uid) { bilan.absents++; console.log(`n°${n} : compte ABSENT -> rien`); continue; }
    const ancien = d && d.programme ? d.programme : null;
    const acces = !!(d && d.accesNutritionJusqu && (d.accesNutritionJusqu.toMillis ? d.accesNutritionJusqu.toMillis() : 0) > Date.now());
    const base = `n°${n} : compte existe ; programme deja present : ${ancien ? 'oui' : 'non'} ; acces nutrition actif : ${acces ? 'oui' : 'non'} ; test ${prog.kcal} kcal`;
    if (ancien && !ecraser) { bilan.ignores++; console.log(`${base} -> IGNORE (programme existant conserve)`); continue; }
    if (!confirme) { bilan.prevus++; console.log(`${base} -> serait ecrit`); continue; }
    const FV = admin.firestore.FieldValue;
    const ecrit = {programme: {...prog, livreLe: new Date().toISOString(), parCoach: 'test-play', versions: FV.delete(), precedent: FV.delete()}};
    if (ancien && Array.isArray(ancien.repas) && ancien.repas.length) {
      // Meme archivage que deposerChez : l'ancien plan reste recuperable.
      const copie = {kcal: ancien.kcal ?? null, prot: ancien.prot ?? null, carbs: ancien.carbs ?? null, lip: ancien.lip ?? null,
        repas: ancien.repas, note: ancien.note || '', livreLe: ancien.livreLe || null, parCoach: ancien.parCoach ?? null,
        archiveLe: new Date().toISOString()};
      const deja = Array.isArray(d.programmesHistorique) ? d.programmesHistorique : [];
      ecrit.programmesHistorique = [copie, ...deja.filter((h) => h && h.livreLe !== copie.livreLe)].slice(0, 12);
    }
    await db.collection('users').doc(uid).set(ecrit, {merge: true});
    bilan.ecrits++;
    console.log(`${base} -> ECRIT`);
  }
  console.log(`Bilan : ${comptes.length} comptes, ${bilan.absents} absents, ${bilan.ignores} ignores, ${confirme ? bilan.ecrits + ' ecrits' : bilan.prevus + ' seraient ecrits'}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await principal();
