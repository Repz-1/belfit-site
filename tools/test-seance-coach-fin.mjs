// Seance du coach : fin d'exercice et fin de seance (28/11). Depuis la racine :
//   node tools/test-seance-coach-fin.mjs
// Prerequis : apercu construit (npx vite build --config apercu.config.js dans app-v2).
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { existsSync } from 'fs';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const PORT = 8132;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise(r => setTimeout(r, 1500));
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/google-chrome'].find(existsSync);
const nav = await chromium.launch({ executablePath: exe });
const prog = { livreLe: new Date().toISOString(), seances: [
  { id: 'sA', nom: 'Épaules + Triceps', jour: new Date().getDay(), exos: [{ id: 'e1', nom: 'Développé épaules', type: 'machine', series: 3, reps: '10-12/10-12/6-8' }] },
] };
try {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE', deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  p.on('pageerror', e => ok(false, 'erreur JS ' + e.message));
  await p.goto(`http://localhost:${PORT}/stats.html`);
  await p.evaluate(() => localStorage.setItem('belfit_jour_espace', 'ent'));
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate((pr) => { window.__banc.entrainementCoach.value = pr; window.__banc.carnetCoach.value = {}; }, prog);
  await p.waitForTimeout(500);
  const plusTard = p.getByText('Plus tard'); if (await plusTard.count()) { await plusTard.first().tap(); await p.waitForTimeout(300); }
  await p.locator('.bn-item').first().tap(); await p.waitForTimeout(800);
  ok(await p.locator('.ce-a').count() === 1, 'séance du coach affichée');
  for (let i = 0; i < 3; i++) { await p.locator('.ce-coche').nth(i).tap(); await p.waitForTimeout(200); }
  const tab = await p.locator('.ce-a-tab').innerText();
  ok(/\b10\b[\s\S]*\b10\b[\s\S]*\b6\b/.test(tab), 'coché par le rond : reps visées retenues (10, 10, 6)');
  const carte = await p.locator('.ce-a').innerText();
  ok(!/en cours/.test(carte) && /Toutes les séries sont faites/.test(carte), 'exercice fini : saisie repliée');
  const c1 = await p.evaluate(() => Object.values(window.__banc.carnetCoach.value)[0]);
  ok(c1 && c1.exos.e1.series.every((y) => y.fait), 'sauvegarde automatique des 3 séries');
  await p.locator('.ce-enregistrer').tap(); await p.waitForTimeout(300);
  const c2 = await p.evaluate(() => Object.values(window.__banc.carnetCoach.value)[0]);
  ok(c2 && c2.termine === true, 'Terminer : séance marquée terminée');
  ok(/Séance enregistrée/.test(await p.locator('.ce-enregistrer').innerText()), 'bouton : séance enregistrée');
  await p.screenshot({ path: '/tmp/m/seance-finie.png' });
  await p.locator('.ce-a-ligne').nth(1).tap(); await p.waitForTimeout(300);
  ok(/Série 1 en cours/.test(await p.locator('.ce-a').innerText()), 'toucher une ligne rouvre la saisie');
} catch (e) { ok(false, e.message.split('\n')[0]); }
await nav.close(); try { process.kill(-srv.pid); } catch {}
process.exit(code);
