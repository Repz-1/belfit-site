// « Clôturer la journée » mis en surbrillance quand le journal affiché est celui d'un jour PASSÉ (27/10),
// + cloture d'un journal de la veille avec repas Mangé / Sauté / Mangé autre chose.
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
const srv = spawn('python3', ['-m', 'http.server', '8096', '--directory', dossierApercu], { stdio: 'ignore', detached: true });
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


async function ouvrir(quand, reduit) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-BE', reducedMotion: reduit ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([p, rb]) => {
    localStorage.clear();
    localStorage.setItem('belfit_v2_apercu_repas', JSON.stringify(rb));
    localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(p));
    localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify({ questionnaire: null, commande: null }));
    localStorage.setItem('belfit_v2_apercu_stats', JSON.stringify({ histoJours: { '2026-01-01': { kcal: 1999, prot: 1, carbs: 1, lip: 1 } }, weightLog: [{ iso: '2026-01-02', kg: 80 }] }));
  }, [PROG, DEFAUTS()]);
  const page = await ctx.newPage();
  page.on('pageerror', (er) => { console.log('ERREUR JS', er.message); code = 1; });
  page.on('dialog', (d) => d.accept());
  await page.clock.setFixedTime(new Date(quand));
  await page.goto('http://localhost:8096/app.html'); await page.waitForTimeout(2200);
  await page.evaluate((rb) => {
    localStorage.removeItem('belfit_v2_plan_seme_test');
    window.__banc.repas.value = rb;
    window.__banc.programme.value = JSON.parse(localStorage.getItem('belfit_v2_apercu_programme'));
  }, DEFAUTS());
  await page.waitForTimeout(700);
  return { page, ctx };
}
const regler = async (page, cle) => { await page.evaluate((c) => { window.__banc.dateJour.value = c; }, cle); await page.waitForTimeout(500); };
const tic = async (page, quand) => { await page.clock.setFixedTime(new Date(quand)); await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await page.waitForTimeout(500); };
const aRappel = (page) => page.locator('button.cal-reset.cal-reset--rappel').count().then((n) => n === 1);
const style = (page) => page.locator('button.cal-reset').evaluate((b) => { const s = getComputedStyle(b); return { color: s.color, bg: s.backgroundColor, anim: s.animationName, shadow: s.boxShadow }; });
const lum = (css) => { const m = css.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const photo = async (page, nom, texte) => {
  await page.evaluate((t) => { const b = document.createElement('div'); b.id = 'banc-ex'; b.textContent = t; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c00;color:#fff;font:700 11px sans-serif;text-align:center;padding:3px'; document.body.appendChild(b); }, texte);
  await page.evaluate(() => { const e = document.querySelector('section.cal'); e.scrollIntoView({ block: 'end' }); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: SHOTS + '/' + nom + '.png' });
  await page.evaluate(() => document.getElementById('banc-ex')?.remove());
};
const EX = (s) => 'EXEMPLE · date simulée : ' + s + ' · données de test';
const MER = '2026-11-04T09:00:00Z';   // mercredi 4 nov. 2026, 10h belge

// ---- 1. Journal d'hier : bouton mis en surbrillance ----
let o = await ouvrir(MER, false);
await regler(o.page, '2026-11-03');
ok(await aRappel(o.page), '1. journal d\'hier (3 nov., on est le 4) : « Clôturer la journée » en surbrillance');
let s = await style(o.page);
ok(s.bg === 'rgb(248, 207, 1)' && s.anim === 'cal-reset-halo' && s.shadow !== 'none', '1. or BELFIT + halo anime : ' + s.bg + ' / ' + s.anim);
const c = contraste(s.color, s.bg);
ok(c >= 7, '1. texte lisible : contraste ' + c.toFixed(1) + ':1 (>= 7)');
ok(await o.page.locator('button.cal-reset').isEnabled(), '1. bouton actif');
ok((await o.page.locator('.cal-retard').count()) === 1, '1. la phrase « Cette journée est celle du … » reste affichée');
await photo(o.page, 'cloture-surbrillance-hier', EX('mer. 4 nov. 2026 · journal d\'hier (mar. 3 nov.) · bouton en surbrillance'));

// ---- 2. Journal du jour : aucune surbrillance ----
await regler(o.page, '2026-11-04');
ok(!(await aRappel(o.page)), '2. journal du jour : pas de surbrillance');
s = await style(o.page);
ok(s.anim === 'none' && s.bg === 'rgba(0, 0, 0, 0)', '2. bouton discret comme avant : ' + s.bg + ' / ' + s.anim);
await photo(o.page, 'cloture-surbrillance-jour', EX('mer. 4 nov. 2026 · journal du jour · pas de surbrillance'));
// journal plus ancien (3 jours) : surbrillance aussi
await regler(o.page, '2026-11-01');
ok(await aRappel(o.page), '2. journal vieux de 3 jours : surbrillance');
await o.ctx.close();

// ---- 3. Mouvement reduit : surbrillance fixe, sans animation ----
o = await ouvrir(MER, true);
await regler(o.page, '2026-11-03');
s = await style(o.page);
ok(await aRappel(o.page) && s.anim === 'none' && s.bg === 'rgb(248, 207, 1)', '3. prefers-reduced-motion : aplat or conserve, aucune animation (' + s.anim + ')');
await o.ctx.close();

// ---- 4. Frontiere Bruxelles / UTC (00h-02h belges) ----
// 4 nov. 22h30 belge = 21h30Z : journal du 4 nov., rien a signaler.
o = await ouvrir('2026-11-04T21:30:00Z', false);
await regler(o.page, '2026-11-04');
ok(!(await aRappel(o.page)), '4. 22h30 belges, journal du jour : pas de surbrillance');
await tic(o.page, '2026-11-04T23:30:00Z');   // 00h30 belges le 5 nov. (jour UTC = encore le 4)
ok(!(await aRappel(o.page)), '4. 00h30 belges (jour UTC pas encore change) : toujours rien : pas de faux positif a la bascule');
await regler(o.page, '2026-11-03');
ok(await aRappel(o.page), '4. 00h30 belges, journal du 3 nov. (vraiment passé) : surbrillance');
await regler(o.page, '2026-11-04');
await tic(o.page, '2026-11-05T00:30:00Z');   // 01h30 belges : le jour UTC passe au 5
ok(await aRappel(o.page), '4. 01h30 belges : le journal du 4 nov. est passé, la surbrillance apparait toute seule (carte non touchée)');
await o.ctx.close();
// fonction pure, heure d'ete et d'hiver
o = await ouvrir(MER, false);
const pur = await o.page.evaluate(() => {
  const f = window.__banc.journalDUnJourPasse; const D = (s) => new Date(s);
  return [
    f('2026-07-14', D('2026-07-14T22:30:00Z')),   // 00h30 CEST le 15 : jour UTC = 14
    f('2026-07-14', D('2026-07-14T23:59:00Z')),
    f('2026-07-14', D('2026-07-15T00:10:00Z')),   // 02h10 CEST
    f('2026-07-14', D('2026-07-15T10:00:00Z')),
    f('2026-12-14', D('2026-12-14T23:30:00Z')),   // 00h30 CET le 15
    f('2026-12-14', D('2026-12-15T00:10:00Z')),   // 01h10 CET
    f('2026-12-15', D('2026-12-15T10:00:00Z')),
    f('', D('2026-12-15T10:00:00Z')), f(null), f(undefined), f('2026-12-16', D('2026-12-15T10:00:00Z')),
  ];
});
ok(eq(pur, [false, false, true, true, false, true, false, false, false, false, false]), '4. fonction pure (ete CEST / hiver CET, vide, futur) : ' + pur.join(','));
await o.ctx.close();

// ---- 5. Cloture d'un journal de la veille avec repas Mangé / Sauté / Mangé autre chose ----
o = await ouvrir(MER, false);
const p = o.page;
const planAvant = await p.evaluate(() => window.__banc.repas.value.filter((x) => x.duPlan).map((x) => ({ nom: x.nom, g: x.ings.map((i) => i.name + ':' + i.portion).join(',') })));
await p.evaluate(() => {
  const b = window.__banc;
  b.dateJour.value = '2026-11-03';
  b.repas.value = b.repas.value.map((x) => x.nom === 'Repas 1' ? { ...x, prevu: false }
    : x.nom === 'Repas 2' ? { ...x, prevu: false, saute: true }
    : x.nom === 'Repas 4' ? { ...x, prevu: false, remplace: true, ings: [{ id: 5, name: 'Pomme', portion: 150 }], ingsPlan: x.ings }
    : x.nom === 'Déjeuner' ? { ...x, ings: [{ id: 901, name: 'Avoine', portion: 70 }] } : x);
});
await p.waitForTimeout(600);
const avant = await p.evaluate(() => ({ plan: window.__banc.repas.value.filter((x) => x.duPlan).map((x) => ({ nom: x.nom, g: x.ings.map((i) => i.name + ':' + i.portion).join(',') })), obj: JSON.stringify(window.__banc.objectifs.value), prog: JSON.stringify(window.__banc.programme.value), kcal: document.querySelector('.cal-cote-val').textContent.trim() }));
ok(await aRappel(p), '5. journal d\'hier rempli : surbrillance');
ok(Number(avant.kcal) > 0, '5. le cadran compte les repas mangés (' + avant.kcal + ' kcal consommées)');
await p.locator('button.cal-reset').click(); await p.waitForTimeout(1500);
const apres = await p.evaluate(() => {
  const b = window.__banc;
  return { dj: b.dateJour.value, h: b.histoJours.value, repas: b.repas.value.map((x) => ({ nom: x.nom, prevu: !!x.prevu, saute: !!x.saute, remplace: !!x.remplace, duPlan: !!x.duPlan, g: x.ings.map((i) => i.name + ':' + i.portion).join(',') })), obj: JSON.stringify(b.objectifs.value), prog: JSON.stringify(b.programme.value), poids: JSON.parse(localStorage.getItem('belfit_v2_apercu_stats') || '{}').weightLog };
});
const pl = apres.repas.filter((x) => x.duPlan);
ok(pl.length === 6 && pl.every((x) => x.prevu && !x.saute && !x.remplace), '5. apres cloture : les 6 repas du plan sont de nouveau « Prévu » (ni sauté ni autre chose)');
ok(eq(pl.map((x) => ({ nom: x.nom, g: x.g })), planAvant), '5. ... avec leurs aliments et quantites du plan (Repas 4 : plus la pomme, retour au plan)');
ok(apres.repas.filter((x) => !x.duPlan).every((x) => x.g === ''), '5. creneaux par defaut remis a zero (Déjeuner : l\'avoine du journal clos n\'est plus la)');
ok(apres.dj === new Date().toISOString().slice(0, 10) || apres.dj === '2026-11-04', '5. le journal passe au jour courant : ' + apres.dj);
ok(apres.h['2026-11-03'] && apres.h['2026-11-03'].kcal > 0 && !apres.h['2026-11-04'], '5. la journée close est archivée sous 2026-11-03 (' + (apres.h['2026-11-03'] || {}).kcal + ' kcal), rien sous le 4');
ok(apres.h['2026-01-01'].kcal === 1999, '5. historique ancien intact');
ok(apres.obj === avant.obj && apres.prog === avant.prog, '5. objectifs et plan inchanges');
ok(!(await aRappel(p)), '5. apres cloture : plus de surbrillance');
const t = await p.evaluate(() => [...document.querySelectorAll('.pg-journal h3.mc-titre')].map((e) => e.textContent.trim()));
ok(eq(t, NOMS_PLAN), '5. liste affichee : Repas 1 -> 6 en haut : ' + t.join(' | '));
await o.ctx.close();

await nav.close(); try { process.kill(-srv.pid); } catch {} srv.kill();
process.exit(code);
