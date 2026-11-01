import { spawn } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire('/workspace/wt-prerempli/app-v2/package.json')('playwright');
const srv = spawn('python3', ['-m', 'http.server', '8101', '--directory', '/workspace/wt-alertes'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise(r => setTimeout(r, 1200));
const nav = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const ctx = await nav.newContext({ viewport: { width: 390, height: 900 }, locale: 'fr-BE' });
const il = (j) => new Date(Date.now() - j * 864e5).toISOString();
const D = [
  { uid: 'a', prenom: 'Sarah', nom: 'Test', objectif: 'Perte', envoyeLe: il(0.2), payeLe: il(0.3), aTraiter: true, nouveau: true, programmesHistorique: [] },
  { uid: 'b', prenom: 'Marc', nom: 'Exemple', email: 'marc@example.test', payeLe: il(0.1), aTraiter: false, nouveau: true, programmesHistorique: [] },
  { uid: 'c', prenom: 'Julie', nom: 'Démo', objectif: 'Prise', envoyeLe: il(20), payeLe: il(21), livreLe: il(19), aTraiter: false, nouveau: false, programmesHistorique: [] },
];
await ctx.route(/cloudfunctions\.net/, r => {
  if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
  const c = JSON.parse(r.request().postData() || '{}');
  const body = c.action === 'dossiers' ? { ok: true, dossiers: D, complet: true, limite: 300 } : { ok: true };
  return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
});
await ctx.addInitScript((k) => localStorage.setItem(k, 'TEST'), process.argv[2]);
const p = await ctx.newPage();
await p.goto('http://localhost:8101/coach.html'); await p.waitForTimeout(2500);
await p.evaluate(() => { const b = document.createElement('div'); b.textContent = 'DONNÉES DE TEST · serveur simulé'; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c00;color:#fff;font:700 11px sans-serif;text-align:center;padding:2px'; document.body.appendChild(b); });
await p.screenshot({ path: '/workspace/belfit-site/captures-alertes/coach-badge-nouveau.png' });
await nav.close(); try { process.kill(-srv.pid); } catch (e) {}
