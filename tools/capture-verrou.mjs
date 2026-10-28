// Captures 390 px du blocage de l'alimentation (option B : lecture seule + carte d'offre).
// ETATS SIMULES : aucun compte reel, aucun serveur ; repas = DONNEES DE TEST. Un bandeau rouge le dit.
// Le drapeau BLOCAGE_ALIMENTATION reste a false : le banc force l'etat avec ?verrou=jamais|expire|ouvert
// (&cmd = bouton d'achat ouvert simule, &cmd=0 = ferme).
// Usage : `npx vite build --config apercu.config.js` dans app-v2, puis node tools/capture-verrou.mjs
//         puis rm -rf app-v2/apercu/construit
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { mkdirSync } from 'fs';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const PORT = 8097, SORTIE = '/workspace/shots/';
mkdirSync(SORTIE, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise(r => setTimeout(r, 1200));
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const REPAS = [1, 2, 3, 4].map(i => ({ id: i, nom: ['Petit déjeuner', 'Déjeuner', 'Dîner', 'Collations'][i - 1], type: i === 4 ? 'collation' : 'repas', cle: ['pdej', 'dej', 'diner', 'snack'][i - 1], fixe: true, ouvert: false,
  ings: i === 1 ? [{ id: 11, name: 'Avoine', portion: 70 }, { id: 12, name: 'Whey', portion: 30 }] : i === 2 ? [{ id: 21, name: 'Riz cuit', portion: 125 }, { id: 22, name: 'Poulet cuit', portion: 95 }] : [] }));
const bandeau = (p, e) => p.evaluate((e) => { const b = document.createElement('div'); b.textContent = 'EXEMPLE · ' + e + ' · aucun vrai compte · données de test'; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c00;color:#fff;font:700 11px sans-serif;text-align:center;padding:2px'; document.body.appendChild(b); }, e);
// [nom, etat simule, extra, legende, action apres chargement]
const vues = [
  ['blocage-v2-non-payeur-offre', 'jamais', '&cmd=0', 'Non-payeur · carte d’offre (achat fermé : « Bientôt »)', null],
  ['blocage-v2-non-payeur-offre-achat-ouvert', 'expire', '&cmd', 'Ancien payeur · accès terminé · offre + historique en lecture seule', null],
  ['blocage-v2-non-payeur-repas-lecture-seule', 'expire', '&cmd', 'Non-payeur · repas ouvert : lecture seule, ni scan ni voix ni photo', 'repas'],
  ['blocage-v2-payeur-normal', 'ouvert', '', 'Payeur · tout est ouvert', null],
  ['blocage-v2-payeur-repas-ouvert', 'ouvert', '', 'Payeur · repas ouvert : scan, voix et photo présents', 'repas'],
  ['blocage-v2-entrainement-libre', 'expire', '&cmd', 'Non-payeur · l’entraînement reste LIBRE', 'train'],
  ['blocage-v2-stats-poids-libres', 'expire', '&cmd', 'Non-payeur · poids et statistiques restent LIBRES', 'stats'],
];
for (const [nom, etat, extra, legende, action] of vues) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE', timezoneId: 'Europe/Brussels' });
  await ctx.addInitScript((r) => { if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', '1'); localStorage.setItem('belfit_v2_apercu_repas', JSON.stringify(r)); } }, REPAS);
  const p = await ctx.newPage();
  await p.goto(`http://localhost:${PORT}/app.html?verrou=${etat}${extra}`); await p.waitForTimeout(2200);
  // Le chargement local peut ecraser les donnees du banc : on les remet apres coup (repas et objectifs = DONNEES DE TEST).
  for (let i = 0; i < 8; i++) {
    await p.evaluate((r) => { window.__banc.repas.value = r; window.__banc.jrn.objectifs.value = { kcal: 2712, prot: 165, carbs: 344, lip: 75 }; }, REPAS);
    await p.waitForTimeout(700);
    if (await p.evaluate(() => window.__banc.jrn.totauxJourAff.value.kcal > 0 && window.__banc.jrn.objectifs.value.kcal === 2712)) break;
  }
  try {
    if (action === 'repas') { await p.locator('.mc-tete').first().click({ timeout: 3000 }); await p.waitForTimeout(800); }
    if (action === 'train') { await p.locator('.bn-item').nth(1).tap(); await p.waitForTimeout(1200); }
    if (action === 'stats') { await p.locator('.bn-item').nth(2).tap(); await p.waitForTimeout(1200); }
  } catch (e) { console.log('action impossible', nom, e.message.slice(0, 80)); }
  await bandeau(p, legende);
  await p.screenshot({ path: `${SORTIE}${nom}.png` });
  console.log('capture', nom);
  await ctx.close();
}
await nav.close(); try { process.kill(-srv.pid); } catch (e) {}
