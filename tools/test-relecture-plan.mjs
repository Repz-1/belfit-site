// Relecture automatique du plan (27/10). Un plan envoye par le coach
// (users/{uid}.programme) doit apparaitre dans l'appli DEJA OUVERTE, au retour
// au premier plan, sans deconnexion. Regles testees :
//   - au plus une relecture par 60 s ; rien si l'onglet n'est pas visible ;
//   - panne reseau : le plan deja charge reste ; programmeCharge ne passe jamais a false ;
//   - contenu identique : memes objets, aucun effet rejoue ;
//   - changement de compte pendant une lecture : le resultat de l'ancien compte est jete ;
//   - apercu local (belfit_v2_apercu_*) : jamais de relecture.
// SIMULE : Firestore est remplace par window.__lecteur (banc apercu/app.jsx), le
// temps par page.clock.setFixedTime, la session par le banc (uid 'test').
// Aucune donnee reelle, aucun reseau. Prerequis : (cd app-v2 && npx vite build --config apercu.config.js).
import { createRequire } from 'module';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
const exiger = createRequire(import.meta.url);
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const dossierApercu = 'app-v2/apercu/construit';
if (!existsSync(dossierApercu + '/app.html')) { console.log('— apercu non construit : test sauté (cd app-v2 && npx vite build --config apercu.config.js)'); process.exit(1); }
const { chromium } = exiger('../app-v2/node_modules/playwright');
const PORT = 8094;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', dossierApercu], { stdio: 'ignore', detached: true });
await new Promise((res) => setTimeout(res, 1500));
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });

// Plans FICTIFS (banc de test), sans versions : comportement « plan unique ».
const plan = (kcal, g, livreLe, note) => ({ programme: { kcal, prot: 150, carbs: 250, lip: 70, livreLe, version: 1, note, repas: [{ nom: 'Repas 1', ings: [{ name: 'Avoine', portion: g }] }] } });
const A = plan(2100, 100, '2026-10-27T10:00:00.000Z', 'Plan A (banc)');
const B = plan(2500, 150, '2026-10-27T10:30:00.000Z', 'Plan B (banc)');
const D = plan(2900, 180, '2026-10-27T11:00:00.000Z', 'Plan D (banc)');
const E = plan(3300, 200, '2026-10-27T11:30:00.000Z', 'Plan E (banc, ancien compte)');
const F = plan(1800, 80, '2026-10-27T12:00:00.000Z', 'Plan F (banc, autre compte)');
const T0 = new Date('2026-10-27T12:00:00Z').getTime();
const VIDE = [{ id: 1, nom: 'Repas 1', type: 'repas', fixe: true, ouvert: false, ings: [] }];

async function ouvrir(lecteur, { apercu = false } = {}) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-BE' });
  await ctx.addInitScript(([l, rb, ap]) => {
    localStorage.clear();
    localStorage.setItem('belfit_v2_apercu_repas', JSON.stringify(rb));
    window.__lecteur = l;
    if (ap) localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(ap));
  }, [lecteur, VIDE, apercu ? A.programme : null]);
  const page = await ctx.newPage();
  page.on('pageerror', (er) => { console.log('ERREUR JS', er.message); code = 1; });
  await page.clock.setFixedTime(T0);
  await page.goto('http://localhost:' + PORT + '/app.html'); await page.waitForTimeout(2500);
  return { page, ctx };
}
const etat = (p) => p.evaluate(() => ({
  kcal: window.__banc.programme.value && window.__banc.programme.value.kcal,
  note: window.__banc.programme.value && window.__banc.programme.value.note,
  obj: window.__banc.objectifs.value.kcal,
  charge: window.__banc.programmeCharge.value,
  // le journal du banc a ses propres repas par defaut : on ne regarde que « Repas 1 » (celui du plan)
  repas: window.__banc.repas.value.filter((r) => r.nom === 'Repas 1').map((r) => r.ings.map((i) => i.name + ':' + i.portion).join(',')).join('|'),
  appels: window.__lecteur.appels,
}));
const quand = (p, s) => p.clock.setFixedTime(T0 + s * 1000);
const retour = async (p) => { await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(700); };

// ---- 1. Scenario principal : un seul compte ('test') ----
const L = { docs: { test: A }, delai: {}, panne: false, appels: 0 };
let { page, ctx } = await ouvrir(L); 
let s = await etat(page);
ok(s.kcal === 2100 && s.obj === 2100 && s.repas === 'Avoine:100', 'depart : plan A affiche (2100 kcal, objectifs recopies, repas pose en « prevu » : avoine 100 g)');
ok(s.charge === true, 'depart : programmeCharge = true');
// Sentinelles : jamais de programmeCharge=false, comptage des changements de `programme`.
await page.evaluate(() => {
  window.__fausse = 0; window.__chg = 0;
  window.__banc.programmeCharge.subscribe((v) => { if (v === false) window.__fausse++; });
  let premier = true; window.__banc.programme.subscribe(() => { if (premier) { premier = false; return; } window.__chg++; });
});
const base = s.appels;
await page.evaluate((b) => { window.__lecteur.docs.test = b; }, B);   // le coach vient d'envoyer le plan B

await quand(page, 30); await retour(page);
s = await etat(page);
ok(s.appels === base && s.kcal === 2100, 'a +30 s : AUCUNE relecture (anti-spam 60 s), le plan A reste');

await quand(page, 59); await retour(page);
s = await etat(page);
ok(s.appels === base && s.kcal === 2100, 'a +59 s : toujours aucune relecture');

await quand(page, 61);
await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); });
await retour(page);
s = await etat(page);
ok(s.appels === base && s.kcal === 2100, 'a +61 s mais onglet NON visible : aucune relecture');
await page.evaluate(() => { delete document.visibilityState; });

await retour(page);   // visible, >60 s
s = await etat(page);
ok(s.appels === base + 1, 'a +61 s, retour visible : une relecture');
ok(s.kcal === 2500 && s.note === 'Plan B (banc)' && s.obj === 2500, 'le plan B s\'affiche SANS rechargement (2500 kcal, objectifs recopies)');
ok(s.repas === 'Avoine:150', 'les repas « prevus » passent au plan B (avoine 150 g)');
ok(await page.evaluate(() => window.__fausse) === 0 && s.charge === true, 'programmeCharge n\'est jamais repasse a false pendant la relecture (pas de clignotement)');

await page.evaluate((c) => { window.__lecteur.docs.test = c; }, D);
await quand(page, 62); await retour(page);
s = await etat(page);
ok(s.appels === base + 1 && s.kcal === 2500, 'a +62 s (1 s apres la relecture) : pas de nouvelle relecture, plan B conservé');
await page.evaluate((b) => { window.__lecteur.docs.test = b; }, B);   // retour au plan B cote serveur

// ---- 2. Panne reseau : on garde le plan ----
await page.evaluate(() => { window.__lecteur.panne = true; });
await quand(page, 130); await retour(page);
s = await etat(page);
ok(s.appels === base + 2, 'panne reseau : la relecture est bien tentee');
ok(s.kcal === 2500 && s.obj === 2500 && s.repas === 'Avoine:150' && s.charge === true, 'panne reseau : le plan B reste affiche (pas remis a null, objectifs et repas intacts)');
ok(await page.evaluate(() => window.__fausse) === 0, 'panne reseau : programmeCharge reste true');
await quand(page, 140); await retour(page);
s = await etat(page);
ok(s.appels === base + 2, 'apres une panne : le delai de 60 s s\'applique aussi (pas de rafale)');

// ---- 3. Contenu identique : rien ne bouge ----
await page.evaluate(() => { window.__lecteur.panne = false; window.__ref = window.__banc.programmeBrut.value; window.__refD = window.__banc.dossierCoach.value; window.__chg = 0; window.__rep = window.__banc.repas.value; });
await quand(page, 210); await retour(page);
s = await etat(page);
ok(s.appels === base + 3, 'plan identique : relecture faite');
ok(await page.evaluate(() => window.__banc.programmeBrut.value === window.__ref && window.__banc.dossierCoach.value === window.__refD), 'plan identique : les signaux gardent le MEME objet (rien ne change)');
ok(await page.evaluate(() => window.__chg) === 0 && await page.evaluate(() => window.__banc.repas.value === window.__rep), 'plan identique : aucun effet rejoue (programme et repas inchanges)');

// ---- 4. Mange / saute ne sont pas ecrases par une relecture identique ; focus et pageshow ----
await page.evaluate(() => { const b = window.__banc; b.repas.value = b.repas.value.map((x) => x.nom === 'Repas 1' ? { ...x, prevu: false } : x); });   // le client a « mange » le repas
await page.evaluate((d) => { window.__lecteur.docs.test = d; }, D);
await quand(page, 280);
await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await page.waitForTimeout(700);
s = await etat(page);
ok(s.kcal === 2900 && s.obj === 2900, 'evenement « focus » : le plan D s\'affiche aussi');
ok(s.repas === 'Avoine:150', 'un repas deja « mange » garde ses quantites (avoine 150 g, pas 180 g)');
await page.evaluate((b) => { window.__lecteur.docs.test = b; }, B);
await quand(page, 350);
await page.evaluate(() => window.dispatchEvent(new Event('pageshow'))); await page.waitForTimeout(700);
s = await etat(page);
ok(s.kcal === 2500, 'evenement « pageshow » : le plan B revient aussi');

// ---- 5. Changement de compte pendant une lecture ----
await page.evaluate(([e, f]) => { window.__lecteur.docs.test = e; window.__lecteur.docs.autre = f; window.__lecteur.delai.test = 1200; }, [E, F]);
await quand(page, 420);
await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));   // lecture lente du compte « test » (plan E)
await page.waitForTimeout(300);
await page.evaluate(() => { window.__banc.utilisateur.value = { uid: 'autre', email: 'autre@exemple.test', getIdToken: async () => 'x', metadata: { creationTime: new Date().toISOString() } }; });
await page.waitForTimeout(2500);
s = await etat(page);
ok(s.kcal === 1800 && s.note === 'Plan F (banc, autre compte)', 'changement de compte pendant la relecture : c\'est le plan du NOUVEAU compte (F), le resultat de l\'ancien (E) est jete');
await ctx.close();

// ---- 6. Apercu local : jamais de relecture ----
const L2 = { docs: { test: B }, delai: {}, panne: false, appels: 0 };
({ page, ctx } = await ouvrir(L2, { apercu: true }));
s = await etat(page);
ok(s.kcal === 2100, 'apercu local : le plan de demonstration (A) est charge depuis le stockage local');
await quand(page, 200); await retour(page);
s = await etat(page);
ok(s.appels === 0 && s.kcal === 2100, 'apercu local : aucune relecture, le plan de demonstration reste');
await ctx.close();

await nav.close(); try { process.kill(-srv.pid); } catch {} srv.kill();
process.exit(code);
