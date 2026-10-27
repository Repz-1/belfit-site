// Captures 390 px de la v628 (banc d'essai, DONNEES DE TEST, banniere « EXEMPLE »).
import { spawn } from 'child_process';
import { createRequire } from 'module';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const PORT = 8095, SHOTS = process.env.SHOTS || '/workspace/shots';
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
await new Promise(r => setTimeout(r, 1500));
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const bandeau = (page, txt) => page.evaluate((t) => { const d = document.createElement('div'); d.textContent = t; d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#d00;color:#fff;font:700 12px sans-serif;text-align:center;padding:4px 6px;pointer-events:none'; document.body.appendChild(d); }, txt);
const ctxNeuf = (extra = {}) => nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE', timezoneId: 'Europe/Brussels', deviceScaleFactor: 1, ...extra });
const quoi = process.argv[2] || 'splash';

if (quoi === 'splash') {
  // Instants de l'animation : on fige TOUTES les animations a t (Web Animations API).
  for (const [nom, ms] of [['debut', 450], ['milieu', 1750], ['fin', 2700]]) {
    const ctx = await ctxNeuf(); const page = await ctx.newPage();
    await page.clock.install({ time: new Date('2026-10-27T08:30:00+01:00') });
    await page.goto('http://localhost:' + PORT + '/app.html?accueil');
    await page.waitForSelector('.acc-voile', { timeout: 8000 });
    await page.waitForTimeout(1300); // le voile a fini son fondu d'entree
    await page.evaluate((t) => { document.querySelectorAll('.acc-voile *').forEach(e => e.getAnimations().forEach(a => { a.pause(); a.currentTime = t; }));  }, ms);
    if (process.env.DBG) console.log(nom, await page.evaluate(() => { const v=document.querySelector('.acc-voile'); const c=getComputedStyle(v); return [v.className, c.opacity, c.backgroundImage.slice(0,90), v.getAnimations().length].join(' | '); }));
    await bandeau(page, 'EXEMPLE · animation figée à ' + (ms / 1000).toFixed(2) + ' s (' + nom + ') · données de test');
    await page.waitForTimeout(150);
    await page.screenshot({ path: SHOTS + '/splash-bienvenue-' + nom + '.png' });
    await ctx.close();
  }
}
await nav.close(); try { process.kill(-srv.pid); } catch (e) {}
