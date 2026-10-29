// Captures 390 px : « Autre idée » -> « Je choisis ce repas » -> repas suivants ajustés.
// DONNÉES DE TEST (plan d'exemple ~3100 kcal, aucun vrai compte). Bandeau « EXEMPLE ».
// Usage : npx vite build --config apercu.config.js (app-v2), puis node tools/capture-recalage-jour.mjs
import { createRequire } from 'module'; import { spawn } from 'child_process'; import { mkdirSync } from 'fs';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const SORTIE = process.env.SHOTS || '/workspace/shots-recalage/'; mkdirSync(SORTIE, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', '8096', '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
await new Promise(r => setTimeout(r, 1500));
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const VIDE = [
  { id: 1, nom: 'Petit déjeuner', type: 'repas', cle: 'pdej', fixe: true, ouvert: false, ings: [] },
  { id: 2, nom: 'Déjeuner', type: 'repas', cle: 'dej', fixe: true, ouvert: false, ings: [] },
  { id: 3, nom: 'Dîner', type: 'repas', cle: 'diner', fixe: true, ouvert: false, ings: [] }];
const I = (a) => a.map(([name, portion]) => ({ name, portion }));
const PLAN = { kcal: 3100, prot: 190, carbs: 380, lip: 85, livreLe: new Date().toISOString(), version: 1, repas: [
  { nom: 'Petit-déjeuner', ings: I([['Flocons avoine', 80], ['Banane', 120], ['Lait 1/2 écrémé', 250], ['Whey', 30]]) },
  { nom: 'Déjeuner', ings: I([['Riz cuit', 340], ['Poulet cuit', 200], ['Brocoli', 150], ['Huile olive', 10]]) },
  { nom: 'Collation', ings: I([['Fromage blanc 0%', 300], ['Flocons avoine', 80], ['Pomme', 150], ['Amandes', 25]]) },
  { nom: 'Dîner', ings: I([['Pomme de terre cuite', 450], ['Saumon cuit', 180], ['Brocoli', 200]]) } ] };
const dossier = { commande: { payeLe: new Date(Date.now() - 3 * 864e5).toISOString() }, questionnaire: { envoyeLe: new Date(Date.now() - 5 * 864e5).toISOString(), reponses: { regime: { valeur: 'Tout' }, allergie: { valeur: 'Non, aucune' } } } };
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-BE', timezoneId: 'Europe/Brussels' });
await ctx.addInitScript(([pl, d, rb]) => { if (sessionStorage.getItem('init')) return; sessionStorage.setItem('init', '1'); localStorage.clear();
  localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(pl)); localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify(d)); localStorage.setItem('belfit_v2_apercu_repas', JSON.stringify(rb)); }, [PLAN, dossier, VIDE]);
const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERREUR JS', e.message));
await p.goto('http://localhost:8096/app.html?verrou=ouvert'); await p.waitForTimeout(2600);
const bandeau = (e) => p.evaluate((e) => { let b = document.getElementById('ex-b'); if (!b) { b = document.createElement('div'); b.id = 'ex-b'; document.body.appendChild(b); } b.textContent = 'EXEMPLE · ' + e + ' · données de test'; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c00;color:#fff;font:700 11px sans-serif;text-align:center;padding:2px'; }, e);
const carte = (nom) => p.locator('.mc', { hasText: new RegExp('^\\s*' + nom) }).first();
const etat = async (t) => console.log(t, (await p.locator('.mc .mc-titre, .mc .mc-sous').allInnerTexts()).join(' | '));
const voir = async (nom) => { await carte(nom).scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -90)); await p.waitForTimeout(400); };
await etat('avant');
await voir('Petit-déjeuner'); await bandeau('1. Plan du jour (~3100 kcal)'); await p.screenshot({ path: SORTIE + '1-avant-390.png' });
// On fait defiler jusqu'a une idee a au moins 40 kcal du plan (pour montrer la compensation).
for (let k = 1; k <= 25; k++) {
  await carte('Petit-déjeuner').locator('.mc-idee-btn', { hasText: 'Autre idée' }).click(); await p.waitForTimeout(500);
  const kc = parseInt((await carte('Petit-déjeuner').locator('.mc-idee-kcal b').innerText()).replace(/\D/g, ''), 10);
  console.log('idee', k, kc);
  if (Math.abs(kc - 646) >= 40) break;
}
await voir('Petit-déjeuner'); await bandeau('2. Défilement des idées : rien ne change ailleurs'); await p.screenshot({ path: SORTIE + '2-defilement-390.png', fullPage: true });
await etat('defilement');
await carte('Petit-déjeuner').locator('.mc-idee-choisir').click(); await p.waitForTimeout(900);
await voir('Petit-déjeuner'); await bandeau('3. Après « Je choisis ce repas »'); await p.screenshot({ path: SORTIE + '3-choisi-390.png' });
await voir('Déjeuner'); await bandeau('4. Repas suivants ajustés'); await p.screenshot({ path: SORTIE + '4-ajustes-390.png' });
await voir('Collation'); await bandeau('5. Collation et dîner ajustés · total = plan'); await p.screenshot({ path: SORTIE + '5-suite-390.png' });
await etat('apres');
console.log('message :', await carte('Petit-déjeuner').locator('.mc-idee-msg').innerText().catch(() => '-'));
await nav.close(); try { process.kill(-srv.pid); } catch (e) {} process.exit(0);
