// Captures 01/11 « 80 € tout le temps » : Mon suivi (acces ouvert / ferme) et CGV. Donnees de test locales.
import { spawn } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const OUT = '/workspace/belfit-site/captures-80/';
const s1 = spawn('python3', ['-m', 'http.server', '8098', '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
const s2 = spawn('python3', ['-m', 'http.server', '8097'], { stdio: 'ignore', detached: true });
await new Promise(r => setTimeout(r, 1200));
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const jour = n => new Date(Date.now() - n * 86400000).toISOString();
const plan = { kcal: 2400, prot: 180, carbs: 250, lip: 70, livreLe: jour(25), repas: [{ nom: 'Déjeuner', ings: [{ name: 'Riz', portion: 150 }] }] };
async function suivi(nom, joursPaye) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-BE' });
  await ctx.route(/cloudfunctions\.net/, r => r.request().method() === 'OPTIONS'
    ? r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } })
    : r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, autorise: true, mode: 'live' }) }));
  const p = await ctx.newPage();
  await p.goto('http://localhost:8098/app.html');
  await p.evaluate(([pl, d]) => { localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(pl)); localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify(d)); },
    [plan, { questionnaire: { envoyeLe: jour(joursPaye - 1) }, commande: { payeLe: jour(joursPaye), type: 'plan' } }]);
  await p.goto('http://localhost:8098/app.html'); await p.waitForTimeout(1800);
  await p.locator('.bn-item').last().tap(); await p.waitForTimeout(900);
  const e = p.locator('.sv-etape'); await e.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  await e.screenshot({ path: OUT + nom + '.png' });
  await p.screenshot({ path: OUT + nom + '-ecran.png' });
  await ctx.close();
}
await suivi('suivi-acces-ouvert-j20', 20);
await suivi('suivi-acces-ferme-j50', 50);
const p = await nav.newPage({ viewport: { width: 900, height: 1200 }, locale: 'fr-BE' });
await p.goto('http://localhost:8097/cgv.html'); await p.waitForTimeout(800);
const h = p.locator('h3', { hasText: 'Services et prix' }); await h.scrollIntoViewIfNeeded();
const bb = await h.boundingBox();
await p.screenshot({ path: OUT + 'cgv-services-et-prix.png', fullPage: true, clip: { x: 0, y: bb.y + (await p.evaluate(() => scrollY)) - 20, width: 900, height: 520 } });
await p.screenshot({ path: OUT + 'cgv-haut.png' });
await nav.close(); for (const s of [s1, s2]) try { process.kill(-s.pid); } catch (e) {}
