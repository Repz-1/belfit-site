// Captures 390 px de l'ecran de bienvenue (banc d'essai, DONNEES DE TEST, banniere « EXEMPLE »).
// Chaque message est montre a 2 instants de l'animation (figee par l'API Web Animations).
// Lancer depuis la racine du depot, apercu construit. SHOTS = dossier de sortie.
import { spawn } from 'child_process';
import { copyFileSync } from 'fs';
import { createRequire } from 'module';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const PORT = 8097, SHOTS = process.env.SHOTS || '/workspace/shots';
copyFileSync('belfit-logo-bf.png', 'app-v2/apercu/construit/belfit-logo-bf.png');
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
await new Promise(r => setTimeout(r, 1500));
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const bandeau = (page, txt) => page.evaluate((t) => { const d = document.createElement('div'); d.textContent = t; d.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#d00;color:#fff;font:700 12px sans-serif;text-align:center;padding:4px 6px;pointer-events:none'; document.body.appendChild(d); }, txt);
// [nom, heure Bruxelles, tirage, sansprenom, libelle]
const CAS = [
  ['tot-bonjour-prenom', '2026-10-27T07:10:00+01:00', 0, false, 'tôt le matin · « Bonjour Raci »'],
  ['tot-taquin', '2026-10-27T07:10:00+01:00', 0.4, false, 'tôt le matin · taquin'],
  ['fin-matinee', '2026-10-27T10:30:00+01:00', 0.15, false, 'fin de matinée'],
  ['midi-taquin', '2026-10-27T12:30:00+01:00', 0.5, false, 'midi · taquin'],
  ['apres-midi-taquin', '2026-10-27T15:30:00+01:00', 0.6, false, 'après-midi · taquin'],
  ['soir-taquin', '2026-10-27T20:00:00+01:00', 0.3, false, 'soir · taquin'],
  ['soir-sans-prenom', '2026-10-27T19:00:00+01:00', 0, true, 'soir · sans prénom'],
  ['nuit-encore-debout', '2026-10-27T23:30:00+01:00', 0.2, false, 'nuit · « Encore debout ? »'],
];
for (const [nom, quand, rnd, sans, lib] of CAS) {
  for (const [inst, ms] of [['1', 500], ['2', 2000]]) {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE', timezoneId: 'Europe/Brussels', deviceScaleFactor: 1 });
    await ctx.addInitScript((r) => { Math.random = () => r; }, rnd);
    const page = await ctx.newPage();
    await page.clock.install({ time: new Date(quand) });
    await page.goto('http://localhost:' + PORT + '/app.html?accueil' + (sans ? '&sansprenom' : ''));
    await page.waitForSelector('.acc-voile', { timeout: 8000 });
    await page.waitForTimeout(1000); // le voile a fini son fondu d'entree
    await page.evaluate((t) => { document.querySelectorAll('.acc-voile *').forEach(e => e.getAnimations().forEach(a => { a.pause(); a.currentTime = t; })); }, ms);
    await bandeau(page, 'EXEMPLE · ' + lib + ' · animation figée à ' + (ms / 1000).toFixed(1) + ' s · données de test');
    await page.waitForTimeout(150);
    await page.screenshot({ path: SHOTS + '/accueil-' + nom + '-' + inst + '.png' });
    console.log(nom, inst, (await page.locator('.acc-msg').innerText()).replace(/\s+/g, ' '));
    await ctx.close();
  }
}
await nav.close(); try { process.kill(-srv.pid); } catch (e) {}
