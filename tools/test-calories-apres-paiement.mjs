// Captures 390 px : nouveau client SANS plan coach, avant puis juste apres le paiement (acces simule).
// ETATS SIMULES, aucun vrai compte. Usage : build apercu puis node tools/capture-calories-paiement.mjs <suffixe>
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { mkdirSync } from 'fs';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const PORT = 8099, SORTIE = '/workspace/belfit-site/captures-calories/', SUF = process.argv[2] || 'x';
mkdirSync(SORTIE, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise(r => setTimeout(r, 1200));
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE', timezoneId: 'Europe/Brussels' });
const p = await ctx.newPage();
await p.goto(`http://localhost:${PORT}/app.html?verrou=jamais&cmd&nouveau`); await p.waitForTimeout(2500);
// Nouveau client : jamais de calcul, objectifs par defaut, aucun plan coach.
await p.evaluate(() => { const b = window.__banc; b.programme.value = null; b.jrn.calculBaseFait.value = false; b.jrn.objectifs.value = { kcal: 4300, prot: 217, carbs: 538, lip: 96 }; });
await p.waitForTimeout(800);
const bandeau = (e) => p.evaluate((e) => { const b = document.createElement('div'); b.textContent = 'EXEMPLE · ' + e; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c00;color:#fff;font:700 11px sans-serif;text-align:center;padding:2px'; document.body.appendChild(b); }, e);
await bandeau(SUF + ' · avant paiement (accès fermé)');
await p.screenshot({ path: `${SORTIE}${SUF}-1-avant-paiement.png` });
await p.evaluate(() => { window.__banc.accesNut.etatSimule.value = 'ouvert'; });
await p.waitForTimeout(1200);
await bandeau(SUF + ' · juste après paiement, plan coach pas encore livré');
await p.screenshot({ path: `${SORTIE}${SUF}-2-apres-paiement.png` });
const calc = await p.evaluate(() => !!document.querySelector('[class^="bs-"]'));
console.log((calc ? '✗ ' : '✓ ') + 'apres paiement sans plan coach : pas d ecran de calcul des calories');
// 01/11 : pas d'objectif par defaut (4300) -> « Plan en préparation ».
const carte = await p.evaluate(() => (document.querySelector('.cal') || {}).innerText || '');
const page = await p.evaluate(() => document.body.innerText);
const prep = /Plan en préparation/.test(carte) && !/4300|4 300/.test(carte) && !/Recommandé 8/.test(page);
console.log((prep ? '✓ ' : '✗ ') + 'apres paiement sans plan coach : « Plan en préparation », pas de 4300 kcal');
await p.screenshot({ path: `${SORTIE}plan-en-preparation.png` });
// Plan coach livre -> objectif du coach affiche normalement.
await p.evaluate(() => { const b = window.__banc; b.programme.value = { kcal: 2450, prot: 160, carbs: 280, lip: 75 }; b.jrn.objectifs.value = { kcal: 2450, prot: 160, carbs: 280, lip: 75 }; });
await p.waitForTimeout(800);
const carte2 = await p.evaluate(() => (document.querySelector('.cal') || {}).innerText || '');
const livre = /2450|2 450/.test(carte2) && !/Plan en préparation/.test(carte2);
console.log((livre ? '✓ ' : '✗ ') + 'plan coach livre : objectif du coach affiche');
await nav.close(); try { process.kill(-srv.pid); } catch (e) {}
process.exit(calc || !prep || !livre ? 1 : 0);
