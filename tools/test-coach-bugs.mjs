// 01/11 Raci : bugs page coach (IA hors de vue, 8 semaines fantomes, « Nouveau » permanent).
// Serveur simule (aucune donnee reelle). SHOTS=dossier pour les captures.
import { spawn } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const PORT = 8137, SHOTS = process.env.SHOTS || '';
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', '.'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise((r) => setTimeout(r, 1200));
let ko = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) ko++; };
const il = (j) => new Date(Date.now() - j * 864e5).toISOString();
const D = [{ uid: 'u1', prenom: 'Client', nom: 'Test', email: 'client@example.test', objectif: 'Perte', envoyeLe: il(0.1), payeLe: il(0.2), aTraiter: true, nouveau: true, programmesHistorique: [],
  reponses: { prenom: { question: 'Prénom', texte: 'Client', section: 'Toi' } } }];
const appels = []; let modeIa = 'ok';
const nav = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'fr-BE' });
await ctx.route(/cloudfunctions\.net/, async (r) => {
  if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
  const c = JSON.parse(r.request().postData() || '{}'); appels.push(c.action);
  let body = { ok: true }, status = 200;
  if (c.action === 'dossiers') body = { ok: true, dossiers: D, complet: true, limite: 300 };
  if (c.action === 'proposer') {
    await new Promise((x) => setTimeout(x, 800));
    if (modeIa === 'ko') { status = 500; body = { ok: false, detail: 'gemini: quota' }; }
    else body = { ok: true, repas: [{ nom: 'Petit-déjeuner', ings: [{ name: c.aliments[0].split(';')[0], portion: 50 }] }, { nom: 'Dîner', ings: [{ name: c.aliments[1].split(';')[0], portion: 100 }] }], cible: { kcal: 1800, prot: 120, carbs: 200, lip: 60 }, remarque: 'Sans poisson.' };
  }
  return r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
});
await ctx.addInitScript(() => localStorage.setItem('belfit_espace_coach', 'TEST'));
const p = await ctx.newPage();
p.on('dialog', (d) => d.accept());
await p.goto(`http://localhost:${PORT}/coach.html`); await p.waitForTimeout(2500);
ok(await p.locator('.dos .nouveau').count() === 1, 'badge « Nouveau » avant ouverture');
ok(await p.locator('#listeVersions .ver').count() === 1, 'etat propre : une seule version au depart');
await p.locator('.dos').first().tap(); await p.waitForTimeout(500);
ok(appels.includes('marquerVu'), 'fiche ouverte : marquerVu envoye au serveur');
ok(await p.locator('.dos .nouveau').count() === 0 && !(await p.locator('#resume .nouveau.compteur').isVisible()), 'badge et compteur « Nouveau » retires');
// Faux plan de 8 semaines deja la (ancien bug) : choisir un client repart a zero.
await p.evaluate(() => document.getElementById('btnModele').click()); await p.waitForTimeout(200);
ok(await p.locator('#listeVersions .ver').count() === 8, 'modele 8 versions seulement sur demande (confirmation)');
modeIa = 'ko';
await p.locator('.ia-go').tap(); await p.waitForTimeout(1500);
ok(await p.locator('#listeVersions .ver').count() === 1, 'choisir le client : plus de semaines fantomes');
const fiche = p.locator('.ia-etat-fiche');
ok(await fiche.isVisible() && /n'a pas pu répondre.*quota/.test(await fiche.innerText()), 'erreur IA lisible sous le bouton : ' + (await fiche.innerText()));
if (SHOTS) { await fiche.scrollIntoViewIfNeeded(); await p.screenshot({ path: SHOTS + '/2-erreur-ia.png' }); }
modeIa = 'ok';
await p.locator('.ia-go').tap(); await p.waitForTimeout(300);
ok(/prépare le plan/.test(await fiche.innerText()), 'attente visible sous le bouton');
if (SHOTS) { await fiche.scrollIntoViewIfNeeded(); await p.screenshot({ path: SHOTS + '/1-ia-en-cours.png' }); }
await p.waitForTimeout(1800);
ok(await p.locator('#listeVersions .ver').count() === 1 && await p.locator('#repas .repas').count() === 2, 'plan IA : 1 version, 2 repas');
ok(/plan unique/.test(await p.locator('#listeVersions').innerText()) && !/sans date : non/.test(await p.locator('#listeVersions').innerText()), 'pas de « sans date : non appliquée »');
ok(await p.locator('#iaEtat').isVisible() && /Relis tout/.test(await p.locator('#iaEtat').innerText()), 'message IA en haut des repas');
if (SHOTS) await p.screenshot({ path: SHOTS + '/3-plan-ia-genere.png' });
await nav.close(); try { process.kill(-srv.pid); } catch (e) {}
console.log(ko ? ko + ' echec(s)' : 'tout bon'); process.exit(ko ? 1 : 0);
