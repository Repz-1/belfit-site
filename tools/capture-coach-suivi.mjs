// Captures 390 px de l'onglet Coach AVEC un plan (donnees de demonstration locales, serveur simule).
// node tools/capture-coach-suivi.mjs <prefixe> : <prefixe>-suivi / -seances / -programme / -questionnaire / -questionnaire2 .png dans /workspace/shots/
import { spawn } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const pre = process.argv[2] || 'coach-clair';
const PORT = 8099;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise(r => setTimeout(r, 1200));
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const jour = n => new Date(Date.now() - n * 86400000).toISOString();
const planDemo = { kcal: 2400, prot: 180, carbs: 250, lip: 70, livreLe: jour(10), note: 'Données de test : continue comme ça, on ajuste dans trois semaines.',
  repas: [{ nom: 'Petit déjeuner', ings: [{ name: 'Skyr', portion: 200 }] }, { nom: 'Déjeuner', ings: [{ name: 'Riz', portion: 150 }] }, { nom: 'Dîner', ings: [{ name: 'Poulet', portion: 150 }] }] };
const f = n => `/workspace/shots/${pre}-${n}.png`;
async function ouvrir(dossier, stats, url, plan = planDemo) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
  await ctx.route(/cloudfunctions\.net/, r => r.request().method() === 'OPTIONS'
    ? r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } })
    : r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, autorise: true, mode: 'test' }) }));
  const p = await ctx.newPage();
  await p.goto('http://localhost:' + PORT + '/app.html');
  await p.evaluate(([pl, d, s]) => {
    if (pl) localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(pl));
    localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify(d));
    if (s) localStorage.setItem('belfit_v2_apercu_stats', JSON.stringify(s));
  }, [plan, dossier, stats]);
  await p.goto(url || 'http://localhost:' + PORT + '/app.html'); await p.waitForTimeout(1800);
  if (!url) { await p.locator('.bn-item').last().tap(); await p.waitForTimeout(800); }
  return p;
}
const banniere = p => p.evaluate(() => { const b = document.createElement('div'); b.textContent = 'DONNÉES DE TEST · serveur simulé'; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c00;color:#fff;font:700 11px sans-serif;text-align:center;padding:2px'; document.body.appendChild(b); });
const pes = [['2026-10-01', 82.4], ['2026-10-08', 81.9], ['2026-10-15', 81.2], ['2026-10-22', 80.6]].map(([iso, kg]) => ({ iso, kg }));
const payeOk = { questionnaire: { envoyeLe: jour(9) }, commande: { payeLe: jour(10), type: 'plan' } };
let p = await ouvrir(payeOk, { histoJours: {}, weightLog: pes });
await banniere(p);
await p.screenshot({ path: f('suivi') });
await p.evaluate(() => document.querySelector('.pan-scroll:has(.pg-coach)').scrollTo(0, 700)); await p.waitForTimeout(400);
await p.screenshot({ path: f('suivi-bas') });
await p.evaluate(() => document.querySelector('.pan-scroll:has(.pg-coach)').scrollTo(0, 0));
for (const [vue, nom] of [['Tes séances', 'seances'], ['Ton programme', 'programme']]) {
  await p.locator('.prog-onglets button', { hasText: vue }).tap(); await p.waitForTimeout(600);
  await p.screenshot({ path: f(nom) });
}
await p.context().close();
// Paiement recu, questionnaire a remplir
p = await ouvrir({ questionnaire: null, commande: { payeLe: jour(1), type: 'plan' } }, null, undefined, null);
await banniere(p);
await p.screenshot({ path: f('paiement-recu') });
await p.locator('.cp-bt', { hasText: 'Remplir mon questionnaire' }).tap(); await p.waitForTimeout(900);
await p.screenshot({ path: f('questionnaire') });
await p.evaluate(() => document.querySelector('.pan-scroll:has(.pg-coach)').scrollTo(0, 750)); await p.waitForTimeout(400);
await p.screenshot({ path: f('questionnaire-milieu') });
await p.evaluate(() => document.querySelector('.pan-scroll:has(.pg-coach)').scrollTo(0, 99999)); await p.waitForTimeout(400);
await p.screenshot({ path: f('questionnaire-bas') });
const lignes = p.locator('.qc-ligne-inexistante');
if (await lignes.count()) { await lignes.nth(0).tap(); await p.waitForTimeout(700); await p.screenshot({ path: f('questionnaire2') }); }
await nav.close(); try { process.kill(-srv.pid); } catch (e) {}
