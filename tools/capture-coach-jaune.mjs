// Capture 390 px de l'onglet Coach (compte autorise, serveur simule).
// node tools/capture-coach-jaune.mjs <nom> ; apercu deja construit.
import { spawn } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const nom = process.argv[2] || 'coach-jaune';
const PORT = 8098;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise(r => setTimeout(r, 1200));
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
await ctx.route(/cloudfunctions\.net/, r => r.request().method() === 'OPTIONS'
  ? r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } })
  : r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, autorise: true, mode: 'test' }) }));
const p = await ctx.newPage();
await p.goto(`http://localhost:${PORT}/app.html`); await p.waitForTimeout(1800);
await p.locator('.bn-item').last().tap(); await p.waitForTimeout(700);
const etiq = () => p.evaluate(() => { const b = document.createElement('div'); b.textContent = 'DONNÉES DE TEST · serveur simulé'; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c00;color:#fff;font:700 11px sans-serif;text-align:center;padding:2px'; document.body.appendChild(b); });
await etiq();
await p.screenshot({ path: `/workspace/shots/${nom}-haut.png` });
await p.evaluate(() => document.querySelector('.cp-offre').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
await p.screenshot({ path: `/workspace/shots/${nom}.png` });
await nav.close(); try { process.kill(-srv.pid); } catch (e) {}
