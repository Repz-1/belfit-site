// Cloture de la journee : veille vide / remplie, aujourd'hui vide, double clic (21/10, v616).
// Prerequis : apercu construit (npx vite build --config apercu.config.js dans app-v2).
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { aujourdhuiBxl, ajouterJours } from '../app-v2/src/store/plans-par-date.js';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const srv = spawn('python3',['-m','http.server','8091','--directory','app-v2/apercu/construit'],{stdio:'ignore',detached:true});
await new Promise(r=>setTimeout(r,1500));
let code=0; const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m); if(!c) code=1;};
const nav = await chromium.launch({executablePath: process.env.CHROME || '/usr/bin/google-chrome'});
const ctx = await nav.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,locale:'fr-BE'});
await ctx.addInitScript(() => localStorage.setItem('belfit_v2_apercu_stats', JSON.stringify({ histoJours: { '2026-01-01': { kcal: 1999, prot: 1, carbs: 1, lip: 1 } }, weightLog: [] })));
const page = await ctx.newPage();
page.on('pageerror', e => { console.log('ERREUR JS', e.message); code=1; });
page.on('dialog', d => d.accept());
await page.goto('http://localhost:8091/app.html'); await page.waitForTimeout(2000);
// 27/10 : la cle du journal = jour de Bruxelles (etait le jour UTC)
const AUJ = aujourdhuiBxl();
const VEILLE = ajouterJours(AUJ, -1);
const btn = page.locator('button.cal-reset');
const regler = (date, plein) => page.evaluate(([date, plein]) => {
  const b = window.__banc; b.dateJour.value = date;
  b.repas.value = b.repas.value.map((r,i) => ({ ...r, ings: plein && i===0 ? [{ id: 900, name: 'Avoine', portion: 70 }] : [] }));
}, [date, plein]);
const etat = () => page.evaluate(() => ({ d: window.__banc.dateJour.value, h: JSON.stringify(window.__banc.histoJours.value) }));
const pause = () => page.waitForTimeout(500);
// (a)
await regler(AUJ, false); await pause();
ok(await btn.isDisabled(), '(a) aujourd\'hui vide : bouton inactif');
// (b)
await regler(VEILLE, false); await pause();
ok(await btn.isEnabled(), '(b) veille vide : bouton actif');
ok((await page.locator('.cal-retard').count()) === 1, '(b) message jour_non_cloture affiche');
await btn.evaluate(b => b.scrollIntoView({ block: 'center' }));
await page.locator('section.cal').screenshot({ path: '/workspace/shots/cloture-veille.png' });
let av = await etat(); await btn.click({ force: true }); await pause(); let ap = await etat();
ok(ap.d === AUJ, '(b) clic : passe a aujourd\'hui');
ok(ap.h === av.h, '(b) histoJours inchange');
ok(await btn.isDisabled(), '(b) ensuite aujourd\'hui vide : bouton inactif');
// (c)
await regler(VEILLE, true); await pause();
await btn.click({ force: true }); await pause(); ap = await etat();
const h = JSON.parse(ap.h);
ok(h[VEILLE] && h[VEILLE].kcal > 0, '(c) veille remplie enregistree sous ' + VEILLE + ' (' + (h[VEILLE]||{}).kcal + ' kcal)');
ok(!h[AUJ], '(c) rien sous la date du jour');
ok(ap.d === AUJ, '(c) passage a aujourd\'hui');
// (d) cloture d'aujourd'hui rempli, puis double clic
await regler(AUJ, true); await pause();
await btn.click({ force: true }); await pause(); const apres1 = await etat();
const e1 = JSON.parse(apres1.h)[AUJ];
ok(e1 && e1.kcal > 0, '(d) premiere cloture enregistree');
ok(await btn.isDisabled(), '(d) bouton inactif apres cloture');
await btn.click({ force: true, clickCount: 2 }).catch(()=>{}); await btn.dispatchEvent('click'); await pause();
const apres2 = await etat();
ok(apres2.h === apres1.h, '(d) entree histoJours intacte apres double clic');
ok(JSON.parse(apres2.h)['2026-01-01'].kcal === 1999, 'historique ancien intact');
await nav.close(); try { process.kill(-srv.pid); } catch {} srv.kill(); process.exit(code);
