// Reinitialisation des repas du plan apres cloture de la journee (25/10, bug signale par Raci).
// Horloge simulee (Europe/Brussels). Prerequis : apercu construit (npx vite build --config apercu.config.js dans app-v2).
// DONNEES DE TEST uniquement.
import { spawn } from 'child_process';
import { createRequire } from 'module';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const PORT = 8093;
const srv = spawn('python3',['-m','http.server',String(PORT),'--directory','app-v2/apercu/construit'],{stdio:'ignore',detached:true});
await new Promise(r=>setTimeout(r,1500));
let code=0; const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m); if(!c) code=1;};
const nav = await chromium.launch({executablePath: process.env.CHROME || '/usr/bin/google-chrome'});
const ctx = await nav.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,locale:'fr-BE',timezoneId:'Europe/Brussels'});
const PLAN = { kcal: 2000, prot: 150, carbs: 220, lip: 60, livreLe: '2026-10-20T10:00:00.000Z', repas: [
  { nom: 'Petit déjeuner', ings: [{ name: 'Avoine', portion: 70 }, { name: 'Whey', portion: 30 }] },
  { nom: 'Déjeuner', ings: [{ name: 'Riz cuit', portion: 125 }, { name: 'Poulet cuit', portion: 95 }] },
  { nom: 'Dîner', ings: [{ name: 'Riz cuit', portion: 100 }, { name: 'Poulet cuit', portion: 100 }] },
]};
const VIDE = [
  { id: 1, nom: 'Petit déjeuner', type: 'repas', cle: 'pdej', fixe: true, ings: [], ouvert: false },
  { id: 2, nom: 'Déjeuner', type: 'repas', cle: 'dej', fixe: true, ings: [], ouvert: false },
  { id: 3, nom: 'Dîner', type: 'repas', cle: 'diner', fixe: true, ings: [], ouvert: false },
  { id: 4, nom: 'Collations', type: 'collation', cle: 'snack', fixe: true, ings: [], ouvert: false },
];
await ctx.addInitScript(([plan, vide]) => {
  if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', '1');
    localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(plan));
    localStorage.setItem('belfit_v2_apercu_repas', JSON.stringify(vide)); }
}, [PLAN, VIDE]);
const page = await ctx.newPage();
page.on('pageerror', e => { console.log('ERREUR JS', e.message); code=1; });
page.on('dialog', d => d.accept());
// Jour J : 25/10/2026 a 20:30 heure de Bruxelles
await page.clock.install({ time: new Date('2026-10-25T20:30:00+01:00') });
await page.goto('http://localhost:'+PORT+'/app.html'); await page.waitForTimeout(2500);
const etat = () => page.evaluate(() => ({ d: window.__banc.dateJour.value, r: window.__banc.repas.value.map(r => ({ nom: r.nom, prevu: !!r.prevu, saute: !!r.saute, duPlan: !!r.duPlan, n: (r.ings||[]).length })), h: window.__banc.histoJours.value }));
const planR = (s) => s.r.filter(r => r.duPlan);
const pause = () => page.waitForTimeout(700);
await pause();
let s = await etat();
ok(planR(s).length === 3 && planR(s).every(r => r.prevu), 'J : les 3 repas du plan arrivent en « Prévu » (' + planR(s).length + ')');
// Tout couche « Mange » via l'interface
for (let i = 0; i < 3; i++) { const b = page.locator('.mc-plan-btn--mange').first(); if (await b.count()) { await b.click(); await page.waitForTimeout(250); } }
s = await etat();
ok(planR(s).every(r => !r.prevu && !r.saute), 'J : tous les repas du plan coches Mange');
await page.screenshot({ path: '/workspace/shots/reinit-' + (process.env.PHASE || 'x') + '-1-tout-mange.png' });
// Cloture le jour J (le soir meme)
const btn = page.locator('button.cal-reset');
await btn.evaluate(b => b.scrollIntoView({ block: 'center' })); await btn.click({ force: true }); await pause();
s = await etat();
const hJ = JSON.stringify(s.h['2026-10-25'] || null);
ok(s.h['2026-10-25'] && s.h['2026-10-25'].kcal > 0, 'J : journee archivee dans histoJours');
await page.screenshot({ path: '/workspace/shots/reinit-' + (process.env.PHASE || 'x') + '-2-apres-cloture-meme-jour.png' });
// (1) cloture le soir meme : le plan doit etre de nouveau « Prevu » (cas Raci)
ok(planR(s).length === 3 && planR(s).every(r => r.prevu && !r.saute), '(1) apres cloture du soir : repas du plan de nouveau « Prevu » decoches (' + JSON.stringify(planR(s).map(r => r.prevu)) + ')');
// (2) on recoche tout, la journee n'est PAS cloturee ; le lendemain (horloge J+1, sans recharger) on cloture
for (let i = 0; i < 3; i++) { const b = page.locator('.mc-plan-btn--mange').first(); if (await b.count()) { await b.click(); await page.waitForTimeout(250); } }
s = await etat();
ok(planR(s).length === 3 && planR(s).every(r => !r.prevu), '(2) J (non cloturee) : tout est de nouveau coche Mange');
const hJavant = JSON.stringify((await etat()).h['2026-10-25']);
await page.clock.setSystemTime(new Date('2026-10-26T08:00:00+01:00')); await page.evaluate(() => { window.__banc.repas.value = [...window.__banc.repas.value]; }); await page.waitForTimeout(1200);
ok((await page.locator('.cal-retard').count()) === 1, '(2) J+1 : le message « journee non cloturee » s\'affiche');
await page.screenshot({ path: '/workspace/shots/reinit-' + (process.env.PHASE || 'x') + '-3-lendemain-avant-cloture.png' });
try { await btn.evaluate(b => b.scrollIntoView({ block: 'center' })); await btn.click({timeout:3000, force:true}); } catch { console.log('   (bouton Cloturer inactif)'); } await pause();
s = await etat();
ok(s.d === '2026-10-26', '(2) apres cloture : on passe a J+1 (' + s.d + ')');
ok(planR(s).length === 3 && planR(s).every(r => r.prevu && !r.saute), '(2) J+1 : repas du plan « Prevu » decoches');
ok(JSON.stringify(s.h['2026-10-25']) === hJavant && s.h['2026-10-25'].kcal > 0, '(2) donnees de J intactes dans histoJours (' + (s.h['2026-10-25']||{}).kcal + ' kcal)');
ok(!s.h['2026-10-26'], '(2) rien archive sous J+1');
await page.screenshot({ path: '/workspace/shots/reinit-' + (process.env.PHASE || 'x') + '-4-lendemain-apres-cloture.png' });
// (3) sans ecraser la saisie : J+1, l'utilisateur saute un repas et en mange un, puis la seed rejoue (nouvelle livraison) -> rien n'est ecrase
try { await page.locator('.mc-plan-btn--saute').first().click({timeout:3000}); await page.waitForTimeout(250);
await page.locator('.mc-plan-btn--mange').first().click({timeout:3000}); await page.waitForTimeout(250); } catch {}
const avant = await etat();
await page.evaluate(() => { const p = window.__banc.programme.value; window.__banc.programme.value = { ...p, livreLe: '2026-10-26T09:00:00.000Z' }; }); await pause();
const apres = await etat();
ok(JSON.stringify(avant.r.map(r => [r.nom, r.prevu, r.saute])) === JSON.stringify(apres.r.map(r => [r.nom, r.prevu, r.saute])), '(3) re-seed : saisie du client (saute / mange) non ecrasee');
await nav.close(); try { process.kill(-srv.pid); } catch {} srv.kill(); process.exit(code);
