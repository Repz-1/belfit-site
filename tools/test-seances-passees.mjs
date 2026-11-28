// « Mes seances passees » en tete de Stats (28/11). Depuis la racine :
//   node tools/test-seances-passees.mjs
// Prerequis : apercu construit (npx vite build --config apercu.config.js dans app-v2).
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { existsSync } from 'fs';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const PORT = 8131;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise(r => setTimeout(r, 1500));
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/google-chrome'].find(existsSync);
const nav = await chromium.launch({ executablePath: exe });
const iso = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const lundi = (() => { const d = new Date(); return (d.getDay() + 6) % 7; })();   // jours depuis lundi
const prog = { livreLe: new Date().toISOString(), seances: [
  { id: 'sA', nom: 'Séance A', exos: [{ id: 'e1', nom: 'Développé couché', type: 'barre', series: 3, reps: '8' }, { id: 'e2', nom: 'Poulie triceps', type: 'poulie', series: 2, reps: '12' }] },
  { id: 'sB', nom: 'Séance B', exos: [{ id: 'e3', nom: 'Squat', type: 'barre', series: 2, reps: '6' }] },
] };
const en = (d, s, exos) => ({ date: d, seance: s, le: d + 'T10:00:00Z', exos });
const carnet = {
  [iso(lundi + 7) + '|sA']: en(iso(lundi + 7), 'Séance A', { e1: { nom: 'Développé couché', series: [{ kg: 50, reps: 8, fait: true }, { kg: 50, reps: 7, fait: true }, { kg: 50, reps: 6, fait: true }] }, e2: { nom: 'Poulie triceps', series: [{ kg: 25, reps: 12, fait: true }, { kg: 25, reps: 11, fait: true }] } }),
  [iso(lundi) + '|sA']: en(iso(lundi), 'Séance A', { e1: { nom: 'Développé couché', series: [{ kg: 50, reps: 9, fait: true }, { kg: 50, reps: 8, fait: true }, { kg: 50, fait: false }] }, e2: { nom: 'Poulie triceps', note: 'Épaule un peu raide', series: [{ kg: 25, reps: 12, fait: true }, { kg: 25, reps: 12, fait: true }] } }),
};
try {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE', deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  p.on('pageerror', e => ok(false, 'erreur JS ' + e.message));
  await p.goto(`http://localhost:${PORT}/stats.html`); await p.waitForTimeout(1500);
  await p.evaluate(([pr, c]) => { window.__banc.entrainementCoach.value = pr; window.__banc.carnetCoach.value = c; }, [prog, carnet]);
  await p.waitForTimeout(600);
  // Bulle « Ton programme d'entrainement est arrive » : on la ferme.
  const plusTard = p.getByText('Plus tard'); if (await plusTard.count()) { await plusTard.first().tap(); await p.waitForTimeout(400); }
  ok(await p.locator('.ce-pp').count() === 1, 'carte « Mes séances passées » affichée');
  const txt = await p.locator('.ce-pp').innerText();
  ok(/1\/2/.test(txt) && /séances cette semaine/.test(txt), 'compte de la semaine (1/2)');
  ok(await p.locator('.ce-pp-barre i').count() === 2 && await p.locator('.ce-pp-barre i.on').count() === 1, 'barre de semaine 1 sur 2');
  ok(await p.locator('.ce-pp-vide, .ce-pp-auj, .ce-pp-jours .ce-pp-tuile').count() === 7, 'toute la semaine : 7 jours');
  ok(await p.locator('.ce-pp-auj, .ce-pp-jours .ce-pp-tuile small', { hasText: "Aujourd'hui" }).count() >= 1, 'aujourd\'hui marqué');
  ok(await p.locator('.ce-pp-tuile.on').count() === 1 && await p.locator('.ce-pp-tuile.afaire', { hasText: 'Séance B' }).count() === 1, 'séance faite + séance B à faire');
  ok(/✓ 4\/5/.test(txt), 'séries faites 4/5');
  ok(!/Développé couché/.test(txt) && !/Comparer/.test(txt), 'à l\'ouverture : seulement le jour de séance, pas de « Comparer »');
  const y0 = await p.locator('.ce-pp').boundingBox(); const y1 = await p.locator('.score-card').boundingBox().catch(() => null);
  const yp = await p.locator('.stat-card.acc-green').boundingBox(); const yk = await p.locator('.stat-card.acc-orange').boundingBox();
  ok(yp.y < y0.y && (!y1 || (y0.y < y1.y && y1.y < yk.y)), 'ordre : poids, séances, note, calories');
  await p.screenshot({ path: '/tmp/m/stats-pp.png' });
  await p.locator('.ce-pp-jours .ce-pp-tuile.on').first().tap(); await p.waitForTimeout(400);
  const ouvert = await p.locator('.ce-pp').innerText();
  ok(/Développé couché/.test(ouvert) && /50 kg × 9/.test(ouvert) && /25 kg × 12/.test(ouvert) && /pas faite/.test(ouvert) && /Épaule un peu raide/.test(ouvert), 'toucher la séance : elle se déplie (charges, reps, note)');
  ok(await p.locator('.ce-ppp, .ce-histo').count() === 0, 'aucune page plein écran ne s\'ouvre');
  await p.screenshot({ path: '/tmp/m/stats-pp-ouvert.png' });
  await p.locator('.ce-pp-jours .ce-pp-tuile.on').first().tap(); await p.waitForTimeout(300);
  ok(!/Développé couché/.test(await p.locator('.ce-pp').innerText()), 'toucher encore : elle se replie');
  await p.locator('.ce-pp-tout').tap(); await p.waitForTimeout(300);
  ok(await p.locator('.ce-pp-avant .ce-pp-tuile.on').count() === 1, 'semaines d\'avant : la séance de la semaine passée apparaît');
  await p.locator('.ce-pp-avant .ce-pp-tuile.on').tap(); await p.waitForTimeout(300);
  ok(/50 kg × 8/.test(await p.locator('.ce-pp-avant').innerText()), '…et se déplie aussi');
  await p.evaluate(() => { window.__banc.entrainementCoach.value = null; }); await p.waitForTimeout(300);
  ok(await p.locator('.ce-pp').count() === 0, 'sans programme d\'entraînement : pas de carte');
} catch (e) { ok(false, e.message.split('\n')[0]); }
await nav.close(); try { process.kill(-srv.pid); } catch {}
process.exit(code);
