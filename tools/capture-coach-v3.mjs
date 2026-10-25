// Captures 390 px de l'onglet Coach (compte autorise, serveur simule, bandeau DONNEES DE TEST).
// node tools/capture-coach-bleu.mjs <prefixe> ; apercu deja construit.
// Produit <prefixe>-haut / -tarif / -fenetre / -retour .png dans /workspace/shots/
import { spawn } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const pre = process.argv[2] || 'coach-v3';
const PORT = 8098;
const APP = `http://localhost:${PORT}/app.html`;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise(r => setTimeout(r, 1200));
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
async function ouvrir(url, retourStatut) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
  await ctx.route(/cloudfunctions\.net/, r => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    const corps = JSON.parse(r.request().postData() || '{}');
    const body = { ok: true, autorise: true, mode: 'test' };
    if (corps.retour) body.paiement = { statut: retourStatut || 'canceled', type: 'plan', activee: false };
    return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  });
  const p = await ctx.newPage();
  await p.goto(url); await p.waitForTimeout(1800);
  if (!/coach=/.test(url)) { await p.locator('.bn-item').last().tap(); await p.waitForTimeout(700); }
  await p.evaluate(() => { const b = document.createElement('div'); b.textContent = 'DONNÉES DE TEST · serveur simulé'; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c00;color:#fff;font:700 11px sans-serif;text-align:center;padding:2px'; document.body.appendChild(b); });
  return p;
}
const f = n => `/workspace/shots/${pre}-${n}.png`;
let p = await ouvrir(APP);
await p.screenshot({ path: f('haut') });

const mesure = () => p.evaluate(() => { const sc = (document.querySelector('.pan-scroll:has(.pg-coach)') || document.querySelector('.pan-scroll')); const b = document.querySelector('.cp-offre .cp-bt'), n = document.querySelector('.bn'); const r = b.getBoundingClientRect(), q = n.getBoundingClientRect(); return { top: Math.round(sc.scrollTop), max: Math.round(sc.scrollHeight - sc.clientHeight), boutonBas: Math.round(r.bottom), barreHaut: Math.round(q.top), entier: r.bottom <= q.top - 4 }; });
// Scroll naturel : molette (geste reel), puis repos 1 s (le snap se pose) ; plusieurs offsets
await p.mouse.move(195, 400);
const rap = [];
await p.mouse.wheel(0, 380); await p.waitForTimeout(1100); rap.push(['molette 380', await mesure()]);
await p.screenshot({ path: f('tarif') });
await p.evaluate(() => { const sc = document.querySelector('.pan-scroll:has(.pg-coach)'); sc.scrollTop = 0; }); await p.waitForTimeout(500);
for (const y of [0, 40, 80, 120, 160, 200, 300, 420, 520, 99999]) {
  await p.evaluate((y) => { const sc = document.querySelector('.pan-scroll:has(.pg-coach)'); sc.scrollTop = y; }, y); await p.waitForTimeout(1100);
  const m = await mesure(); rap.push(['scrollTop ' + y, m]);
  if (y === 300) await p.screenshot({ path: f('tarif-milieu') });
  if (y === 420) await p.screenshot({ path: f('tarif-haut-offre') });
}
await p.screenshot({ path: f('tarif-bas') });
console.log(rap.map(([k, m]) => k + ' -> ' + JSON.stringify(m)).join('\n'));
await p.reload(); await p.waitForTimeout(1800); await p.locator('.bn-item').last().tap(); await p.waitForTimeout(700);
await p.evaluate(() => { const b = document.createElement('div'); b.textContent = 'DONNÉES DE TEST · serveur simulé'; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c00;color:#fff;font:700 11px sans-serif;text-align:center;padding:2px'; document.body.appendChild(b); });
await p.evaluate(() => document.querySelector('.cp-offre').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
await p.locator('.cp-bt', { hasText: 'Demander mon plan' }).tap(); await p.waitForTimeout(400);
await p.locator('.cp-modale .qc-chip', { hasText: 'Oui' }).nth(0).tap(); await p.locator('.cp-modale .qc-chip', { hasText: 'Non' }).nth(1).tap(); await p.waitForTimeout(300);
for (const c of await p.locator('.cp-modale input[type=checkbox]').all()) if (!(await c.isChecked())) await c.check();
await p.evaluate(() => { const m = document.querySelector('.cp-modale'); m.scrollTop = m.scrollHeight; }); await p.waitForTimeout(300);
await p.screenshot({ path: f('fenetre') });
await p.context().close();
p = await ouvrir(`${APP}?onglet=premium&coach=questionnaire&type=plan`, 'canceled');
await p.screenshot({ path: f('retour') });
await nav.close(); try { process.kill(-srv.pid); } catch (e) {}
