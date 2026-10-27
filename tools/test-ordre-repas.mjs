// Ordre d'affichage de « Tes repas » avec un plan coach (27/10) :
// les repas du plan en premier (Repas 1 -> 6), les creneaux par defaut VIDES masques
// (affichage seulement : aucune donnee supprimee), un creneau rempli reste visible.
// Prerequis : apercu construit (npx vite build --config apercu.config.js dans app-v2).
// TOUTES les donnees sont FICTIVES (banc de test, comptes et plans d'exemple).
import { createRequire } from 'module';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { ajouterJours } from '../app-v2/src/store/plans-par-date.js';
import { modeleRebond } from '../app-v2/src/data/modele-rebond.js';
import { macrosOf } from '../app-v2/src/data/aliments.js';
const exiger = createRequire(import.meta.url);
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const dossierApercu = 'app-v2/apercu/construit';
if (!existsSync(dossierApercu + '/app.html')) { console.log('✗ apercu non construit'); process.exit(1); }
const { chromium } = exiger('../app-v2/node_modules/playwright');
const srv = spawn('python3', ['-m', 'http.server', '8094', '--directory', dossierApercu], { stdio: 'ignore', detached: true });
await new Promise((res) => setTimeout(res, 1500));
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const SHOTS = process.env.SHOTS || '/workspace/shots';

const tot = (v) => v.repas.reduce((t, rp) => { for (const i of rp.ings) { const m = macrosOf(i); t.k += m.kcal; t.p += m.prot; t.c += m.carbs || 0; t.l += m.lip || 0; } return t; }, { k: 0, p: 0, c: 0, l: 0 });
const REBOND_EX = modeleRebond().map((v, i) => ({ ...v, debut: ajouterJours('2026-11-03', 7 * i), kcal: Math.round(tot(v).k), prot: Math.round(tot(v).p), carbs: Math.round(tot(v).c), lip: Math.round(tot(v).l) }));
const PROG = { kcal: REBOND_EX[0].kcal, prot: REBOND_EX[0].prot, carbs: REBOND_EX[0].carbs, lip: REBOND_EX[0].lip, repas: REBOND_EX[0].repas, livreLe: '2026-10-27T09:00:00.000Z', version: 1, note: 'Exemple (banc de test)', versions: REBOND_EX };
const DEFAUTS = () => [
  { id: 1, nom: 'Petit déjeuner', type: 'repas', cle: 'pdej', fixe: true, ings: [], ouvert: false },
  { id: 2, nom: 'Déjeuner', type: 'repas', cle: 'dej', fixe: true, ings: [], ouvert: false },
  { id: 3, nom: 'Dîner', type: 'repas', cle: 'diner', fixe: true, ings: [], ouvert: false },
  { id: 4, nom: 'Collations', type: 'collation', cle: 'snack', fixe: true, ings: [], ouvert: false },
];
const NOMS_PLAN = ['Repas 1', 'Repas 2', 'Repas 3', 'Repas 4', 'Repas 5', 'Repas 6'];
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function ouvrir(quand, prog, repasBanc, nom) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-BE' });
  await ctx.addInitScript(([p, rb]) => {
    localStorage.clear();
    localStorage.setItem('belfit_v2_apercu_repas', JSON.stringify(rb));
    localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(p));
    localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify({ questionnaire: null, commande: null }));
  }, [prog, repasBanc]);
  const page = await ctx.newPage();
  page.on('pageerror', (er) => { console.log('ERREUR JS (' + nom + ')', er.message); code = 1; });
  page.on('dialog', (d) => d.accept());
  await page.clock.setFixedTime(new Date(quand));
  await page.goto('http://localhost:8094/app.html'); await page.waitForTimeout(2200);
  // Particularite du banc : le journal de test se charge APRES le plan ; on remet
  // le journal du client et on rejoue le semis, comme l'appli le fait pour un vrai compte.
  await page.evaluate((rb) => {
    localStorage.removeItem('belfit_v2_plan_seme_test');
    window.__banc.repas.value = rb;
    window.__banc.programme.value = JSON.parse(localStorage.getItem('belfit_v2_apercu_programme'));
  }, repasBanc);
  await page.waitForTimeout(700);
  return { page, ctx };
}
const titres = (p) => p.evaluate(() => [...document.querySelectorAll('.pg-journal h3.mc-titre')].map((e) => e.textContent.trim()));
const donnees = (p) => p.evaluate(() => window.__banc.repas.value.map((x) => ({ id: x.id, nom: x.nom, prevu: !!x.prevu, saute: !!x.saute, remplace: !!x.remplace, duPlan: !!x.duPlan, g: x.ings.map((i) => i.name + ':' + i.portion).join(',') })));
const photo = async (o, nom, texte) => {
  await o.page.evaluate((t) => { const b = document.createElement('div'); b.id = 'banc-ex'; b.textContent = t; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c00;color:#fff;font:700 11px sans-serif;text-align:center;padding:3px'; document.body.appendChild(b); }, texte);
  await o.page.setViewportSize({ width: 390, height: 2300 });   // fenetre haute : toute la liste « Tes repas » sur une capture
  await o.page.evaluate(() => { const e = [...document.querySelectorAll('.jr-repas-kicker')][0]; if (e) { e.scrollIntoView(); window.scrollBy(0, -40); } });
  await o.page.waitForTimeout(300);
  await o.page.screenshot({ path: SHOTS + '/' + nom + '.png' });
  await o.page.evaluate(() => document.getElementById('banc-ex')?.remove());
  await o.page.setViewportSize({ width: 390, height: 844 });
};
const LUN = '2026-11-03T09:00:00Z';   // lundi 3 nov. 2026, 10h belge : semaine 1
const EX = (s) => 'EXEMPLE · date simulée : ' + s + ' · données de test';

// ---- 1. Plan actif, journal aux 4 creneaux vides ----
let o = await ouvrir(LUN, PROG, DEFAUTS(), 'ordre');
let t = await titres(o.page);
ok(eq(t, NOMS_PLAN), '1. 6 repas du plan en haut, Repas 1 -> 6, et rien d\'autre : ' + t.join(' | '));
let d = await donnees(o.page);
ok(d.length === 10 && ['Petit déjeuner', 'Déjeuner', 'Dîner', 'Collations'].every((n) => d.some((x) => x.nom === n && x.g === '' && !x.duPlan)), '1. les 4 creneaux vides sont toujours dans les donnees (masques a l\'affichage, rien supprime)');
ok(d.filter((x) => x.duPlan).length === 6 && d.filter((x) => x.duPlan).every((x) => x.prevu), '1. les 6 repas du plan sont « Prévu »');
ok(await o.page.locator('.ajout-repas').count() === 1, '1. « Ajouter un repas » toujours la');
const obj = await o.page.evaluate(() => JSON.stringify(window.__banc.objectifs.value));
ok(obj === JSON.stringify({ kcal: PROG.kcal, prot: PROG.prot, carbs: PROG.carbs, lip: PROG.lip }), '1. objectifs (dial) = ceux du plan : ' + obj);
const dial1 = await o.page.locator('section.cal').innerText();
await photo(o, 'ordre-repas-1-plan-en-haut', EX('lun. 3 nov. 2026 · semaine 1'));

// ---- 2. Le dial et les totaux ne bougent pas avec l'affichage ----
await o.page.evaluate(() => { window.__banc.programme.value = null; });
await o.page.waitForTimeout(400);
// plan retire : l'affichage n'est plus derive, les defauts reviennent a leur place d'origine
t = await titres(o.page);
ok(t.slice(0, 4).join('|') === 'Petit déjeuner|Déjeuner|Dîner|Collations' && t.length === 10, '2. plan retire : les 4 creneaux par defaut reviennent (tout le journal visible, comme avant) ');
await o.page.evaluate(() => { window.__banc.programme.value = JSON.parse(localStorage.getItem('belfit_v2_apercu_programme')); });
await o.page.waitForTimeout(500);
t = await titres(o.page);
ok(eq(t, NOMS_PLAN), '2. plan de retour : de nouveau Repas 1 -> 6 en haut, defauts masques');
ok((await o.page.locator('section.cal').innerText()) === dial1, '2. le dial (calories, macros) est identique avant/apres masquage');
await o.ctx.close();

// ---- 3. Un creneau par defaut avec des aliments saisis reste visible, sous le plan ----
const avecAliments = DEFAUTS(); avecAliments[1].ings = [{ id: 901, name: 'Avoine', portion: 70 }]; avecAliments[3].ings = [{ id: 902, name: 'Pomme', portion: 150 }];
o = await ouvrir(LUN, PROG, avecAliments, 'aliments');
t = await titres(o.page);
ok(eq(t, [...NOMS_PLAN, 'Déjeuner', 'Collations']), '3. Déjeuner et Collations (avec aliments) restent visibles, sous Repas 1 -> 6 ; Petit déj. et Dîner (vides) masques : ' + t.join(' | '));
d = await donnees(o.page);
ok(d.find((x) => x.nom === 'Déjeuner').g === 'Avoine:70' && d.find((x) => x.nom === 'Collations').g === 'Pomme:150', '3. aliments du client intacts');
// ajout d'un repas a la main (vide) : reste visible
await o.page.evaluate(() => { const b = window.__banc; b.repas.value = [...b.repas.value, { id: 950, nom: 'Mon repas libre', type: 'repas', ings: [], ouvert: false }]; });
await o.page.waitForTimeout(300);
t = await titres(o.page);
ok(t.includes('Mon repas libre') && t.length === 9, '3. un repas ajoute a la main (meme vide) n\'est jamais masque');
await photo(o, 'ordre-repas-3-creneau-rempli', EX('lun. 3 nov. 2026 · Déjeuner et Collations remplis par le client'));
await o.ctx.close();

// ---- 4. Mange / Saute / Mange autre chose conserves, ordre inchange ; puis changement de version ----
o = await ouvrir(LUN, PROG, DEFAUTS(), 'choix');
await o.page.evaluate(() => {
  const b = window.__banc;
  b.repas.value = b.repas.value.map((x) => x.nom === 'Repas 2' ? { ...x, prevu: false } : x.nom === 'Repas 1' ? { ...x, prevu: false, saute: true } : x.nom === 'Repas 4' ? { ...x, remplace: true, ings: [{ id: 5, name: 'Pomme', portion: 150 }], ingsPlan: x.ings } : x);
});
await o.page.waitForTimeout(400);
t = await titres(o.page);
ok(eq(t, NOMS_PLAN), '4. apres Mangé / Sauté / Mangé autre chose : meme ordre Repas 1 -> 6');
await photo(o, 'ordre-repas-4-mange-saute-autre', EX('lun. 3 nov. 2026 · Repas 1 sauté, Repas 2 mangé, Repas 4 autre chose'));
await o.page.clock.setFixedTime(new Date('2026-11-10T09:00:00Z'));
await o.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await o.page.waitForTimeout(900);
t = await titres(o.page); d = await donnees(o.page);
const r = (n) => d.find((x) => x.nom === n);
ok(eq(t, NOMS_PLAN), '4. nouvelle version (10 nov., semaine 2) : toujours Repas 1 -> 6 en haut, defauts masques');
ok(r('Repas 1').saute && !r('Repas 2').prevu && r('Repas 2').g.includes('Riz basmati cru:90') && r('Repas 4').remplace && r('Repas 4').g === 'Pomme:150', '4. semaine 2 : sauté, mangé (quantites d\'avant) et « autre chose » conserves');
ok(r('Repas 3').prevu && r('Repas 3').g.includes('Riz basmati cru:110'), '4. semaine 2 : un repas encore « Prévu » passe aux quantites de la semaine 2 (riz 110 g)');
ok(d.length === 10, '4. toujours 10 entrees dans les donnees');
await o.ctx.close();

// ---- 5. Cloture de la journee ----
o = await ouvrir(LUN, PROG, DEFAUTS(), 'cloture');
await o.page.evaluate(() => { const b = window.__banc; b.repas.value = b.repas.value.map((x) => x.nom === 'Repas 1' ? { ...x, prevu: false } : x); });
await o.page.waitForTimeout(400);
const btn = o.page.locator('button.cal-reset');
ok(await btn.isEnabled(), '5. journee avec un repas mangé : « Clôturer la journée » actif');
await btn.click(); await o.page.waitForTimeout(1200);
const hist = await o.page.evaluate(() => JSON.stringify(window.__banc.histoJours.value));
ok(Object.values(JSON.parse(hist)).some((j) => j.kcal > 0), '5. la cloture enregistre les kcal du repas mangé : ' + hist.slice(0, 80));
t = await titres(o.page); d = await donnees(o.page);
ok(eq(t, NOMS_PLAN), '5. apres cloture : les repas du plan reviennent, Repas 1 -> 6 en haut, defauts masques');
ok(d.filter((x) => x.duPlan).length === 6 && d.filter((x) => x.duPlan).every((x) => x.prevu), '5. apres cloture : les 6 repas du plan sont de nouveau « Prévu »');
await photo(o, 'ordre-repas-5-apres-cloture', EX('lun. 3 nov. 2026 · après « Clôturer la journée »'));
await o.ctx.close();

// ---- 6. Avant la 1re date (aucun plan actif) : les 4 creneaux par defaut ----
o = await ouvrir('2026-10-30T09:00:00Z', PROG, DEFAUTS(), 'avant');
t = await titres(o.page);
ok(eq(t, ['Petit déjeuner', 'Déjeuner', 'Dîner', 'Collations']), '6. avant la 1re date : les 4 creneaux par defaut, comme toujours');
await photo(o, 'ordre-repas-6-sans-plan', EX('ven. 30 oct. 2026 · avant la 1re date du plan'));
await o.ctx.close();

// ---- 7. Plan unique sans versions, avec des noms de creneaux ----
const UNIQUE = { kcal: 2400, prot: 160, carbs: 280, lip: 70, livreLe: '2026-10-20T10:00:00.000Z', version: 1, note: 'Exemple (banc de test)', repas: [
  { nom: 'Dîner', ings: [{ name: 'Avoine', portion: 60 }] }, { nom: 'Petit-déjeuner', ings: [{ name: 'Whey', portion: 30 }] }, { nom: 'Repas 3', ings: [{ name: 'Pomme', portion: 150 }] }] };
o = await ouvrir(LUN, UNIQUE, DEFAUTS(), 'unique');
t = await titres(o.page); d = await donnees(o.page);
ok(eq(t, ['Dîner', 'Petit-déjeuner', 'Repas 3']), '7. plan unique : ordre du plan (Dîner, Petit-déjeuner, Repas 3), pas de doublon, Déjeuner/Collations vides masques : ' + t.join(' | '));
ok(d.length === 5, '7. donnees : 4 creneaux + Repas 3 (rien de supprime)');
await o.ctx.close();

// ---- 8. Fonction pure : cas limites ----
o = await ouvrir(LUN, PROG, DEFAUTS(), 'pur');
const pur = await o.page.evaluate(() => {
  const f = window.__banc.repasAffiches;
  const L = [{ id: 1, nom: 'Petit déjeuner', cle: 'pdej', fixe: true, ings: [] }, { id: 2, nom: 'Repas 2', duPlan: true, prevu: true, ings: [{}] }, { id: 3, nom: 'Repas 1', duPlan: true, prevu: true, ings: [{}] }, { id: 4, nom: 'Ancien', duPlan: true, prevu: false, ings: [{}] }];
  const plan = [{ nom: 'Repas 1' }, { nom: 'Repas 2' }];
  return {
    sansPlan: f(L, null) === L && f(L, []) === L && f(L, undefined) === L,
    sansRepasDuPlan: f([L[0]], plan)[0] === L[0],
    ordre: f(L, plan).map((x) => x.nom),
    entree: L.length,
  };
});
ok(pur.sansPlan && pur.sansRepasDuPlan, '8. sans plan ou sans repas du plan dans le journal : liste rendue telle quelle');
ok(eq(pur.ordre, ['Repas 1', 'Repas 2', 'Ancien']), '8. ordre du plan, ancien repas du plan (deja mange) apres, creneau vide masque : ' + pur.ordre.join(' | '));
ok(pur.entree === 4, '8. la liste d\'origine n\'est pas modifiee');
await o.ctx.close();

await nav.close(); try { process.kill(-srv.pid); } catch {} srv.kill();
process.exit(code);
