// 25/10 : ajout de « Crème de riz » dans la base. Lancer depuis la racine du depot :
//   node tools/test-creme-de-riz.mjs      (apercu construit requis pour la partie navigateur)
// DONNEES FICTIVES pour les captures (banc de test).
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const racine = new URL('../app-v2/', import.meta.url).pathname;
const { DB, NOMS_ALIMENTS, scoreRecherche, facteurCuisson, macrosOf, PAIRES_CUISSON } = await import(racine + 'src/data/aliments.js');
const { limitesPortion, calerPortion } = await import(racine + 'src/data/portions.js');
const { resoudreAliment } = await import(racine + 'src/data/alias-aliments.js');
// coach-local importe Firebase (inutilisable sous Node) : on l'assemble avec esbuild
// en remplacant le seul module qui tire Firebase (store/adaptations) par un bouchon.
const exigerApp = createRequire(racine + 'package.json');
const esbuild = exigerApp('esbuild');
const sortie = '/tmp/coach-local-test-creme.mjs';
await esbuild.build({
  entryPoints: [racine + 'src/services/coach-local.js'], bundle: true, format: 'esm', platform: 'node', outfile: sortie, logLevel: 'silent',
  plugins: [{ name: 'bouchon', setup(b) {
    b.onResolve({ filter: /store\/adaptations\.js$/ }, () => ({ path: 'bouchon-adaptations', namespace: 'bouchon' }));
    b.onLoad({ filter: /.*/, namespace: 'bouchon' }, () => ({ contents: 'export const proposerAdaptation = () => null;', loader: 'js' }));
  } }],
});
const { parserLocal } = await import(sortie);
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const SHOTS = process.env.SHOTS || '/workspace/shots';

// --- Base ---
const d = DB['Crème de riz'];
ok(!!d, 'DB contient « Crème de riz »');
ok(d && d.kcal === 372 && d.prot === 7.7 && d.carbs === 83.1 && d.lip === 0.7, 'valeurs 372 kcal / 7,7 P / 83,1 G / 0,7 L (Open Food Facts 3012003251416)');
ok(d && Math.abs(4 * d.prot + 4 * d.carbs + 9 * d.lip - d.kcal) / d.kcal < 0.03, 'kcal cohérentes avec les macros (±3 %)');
ok(!d.unit && !d.cache, 'aliment au gramme, visible à la recherche');
ok(NOMS_ALIMENTS.includes('Crème de riz'), 'présent dans la liste de recherche');
ok(Object.keys(DB).length === 1112, 'la base compte 1 112 aliments (1 111 + 1)');
const noms = JSON.parse(readFileSync(racine + '../functions/aliments-noms.json', 'utf8'));
ok(noms.length === Object.keys(DB).length && noms.includes('Crème de riz'), 'functions/aliments-noms.json à jour (' + noms.length + ')');
ok(new Set(Object.keys(DB)).size === Object.keys(DB).length, 'aucun doublon de clé');
const m40 = macrosOf({ name: 'Crème de riz', portion: 40 });
ok(Math.round(m40.kcal) === 149 && Math.round(m40.prot) === 3 && Math.round(m40.carbs) === 33, '40 g = 149 kcal · 3 P · 33 G (' + Math.round(m40.kcal) + ' kcal)');

// --- Recherche ---
const top = (q) => NOMS_ALIMENTS.map(n => [scoreRecherche(q, n), n]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).map(([, n]) => n);
for (const q of ['creme de riz', 'crème de riz', 'Crème de Riz', 'cream of rice', 'creme riz', 'crème de ri']) {
  ok(top(q)[0] === 'Crème de riz', `recherche « ${q} » : 1er résultat = Crème de riz (obtenu : ${top(q)[0]})`);
}
ok(top('riz').includes('Crème de riz'), 'recherche « riz » propose aussi la crème de riz');
ok(top('creme').includes('Crème de riz'), 'recherche « creme » propose la crème de riz');
// --- Limites de portion ---
const lim = limitesPortion('Crème de riz');
ok(lim.min === 30 && lim.max === 80 && lim.step === 10 && lim.cle === 'cereale_sec', 'limites 30–80 g, pas 10, famille céréale sèche');
ok(calerPortion('Crème de riz', 200) === 80 && calerPortion('Crème de riz', 5) === 30, 'calage 200 → 80 g, 5 → 30 g');
ok(limitesPortion('Riz cuit').cle === 'feculent' && limitesPortion('Flocons avoine').cle === 'cereale_sec', 'autres familles inchangées (riz cuit, flocons)');
ok(facteurCuisson('Crème de riz') === null && !PAIRES_CUISSON['Crème de riz'], 'pas de bascule cru/cuit (poudre pesée sèche)');
ok(facteurCuisson('Riz basmati') === 2.7, 'le riz garde sa bascule cru/cuit');
// --- Alias et coach ---
for (const q of ['creme de riz', 'crème de riz', 'cream of rice', '40 g de creme de riz']) ok(resoudreAliment(q) === 'Crème de riz', `alias « ${q} » → Crème de riz`);
ok(resoudreAliment('riz') === 'Riz cuit', 'alias « riz » reste Riz cuit');
const r = parserLocal('40 g de creme de riz', {});
ok(r.aliments && r.aliments.length === 1 && r.aliments[0].aliment === 'Crème de riz' && r.aliments[0].quantite === 40, 'coach : « 40 g de creme de riz » → Crème de riz 40 g');
const r2 = parserLocal('du riz et 30 g de cream of rice', {});
ok((r2.aliments || []).map(a => a.aliment).sort().join('|') === 'Crème de riz|Riz cuit', 'coach : riz + cream of rice = deux aliments distincts (' + (r2.aliments || []).map(a => a.aliment).join(', ') + ')');

// --- Navigateur : recherche + saisie de 40 g ---
if (process.env.SANS_NAVIGATEUR) { process.exit(code); }
const exiger = createRequire(racine + 'package.json');
const { chromium } = exiger('playwright');
const srv = spawn('python3', ['-m', 'http.server', '8095', '--directory', racine + 'apercu/construit'], { stdio: 'ignore', detached: true });
await new Promise(r => setTimeout(r, 1500));
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const VIDE = [
  { id: 1, nom: 'Petit déjeuner', type: 'repas', cle: 'pdej', fixe: true, ouvert: false, ings: [] },
  { id: 2, nom: 'Déjeuner', type: 'repas', cle: 'dej', fixe: true, ouvert: false, ings: [] },
  { id: 3, nom: 'Dîner', type: 'repas', cle: 'diner', fixe: true, ouvert: false, ings: [] },
  { id: 4, nom: 'Collations', type: 'collation', cle: 'snack', fixe: true, ouvert: false, ings: [] }];
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-BE', timezoneId: 'Europe/Brussels' });
await ctx.addInitScript((rb) => { localStorage.clear(); localStorage.setItem('belfit_v2_apercu_repas', JSON.stringify(rb)); }, VIDE);
const p = await ctx.newPage();
p.on('pageerror', e => { console.log('ERREUR JS', e.message); code = 1; });
await p.goto('http://localhost:8095/app.html'); await p.waitForTimeout(2600);
await p.locator('.mc').first().click(); await p.waitForTimeout(900);
const champ = p.locator('.mc-ajout input').first();
await champ.click(); await champ.fill('creme de riz'); await p.waitForTimeout(700);
const premier = await p.locator('.mc-res-choix').first().innerText();
ok(/Crème de riz/.test(premier) && /372 kcal/.test(premier), 'navigateur : 1er résultat de « creme de riz » = ' + premier.replace(/\s+/g, ' '));
await p.screenshot({ path: SHOTS + '/creme-de-riz-recherche-390.png' });
await p.locator('.mc-res-choix').first().click(); await p.waitForTimeout(700);
const qte = p.locator('.mc-ing input[type=number]').first();
await qte.fill('40'); await p.waitForTimeout(700);
const ligne = (await p.locator('.mc-ing').first().innerText()).replace(/\s+/g, ' ');
ok(/Crème de riz/.test(ligne) && /149 kcal/.test(ligne), 'navigateur : saisie 40 g → ' + ligne);
ok(await p.locator('.mc-ing-cuisson').count() === 0, 'navigateur : pas de bouton cru/cuit');
await p.screenshot({ path: SHOTS + '/creme-de-riz-40g-390.png' });
await ctx.close(); await nav.close(); try { process.kill(-srv.pid); } catch {} srv.kill(); process.exit(code);
