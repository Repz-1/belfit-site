// 28/10 « Autre idée » : chaque idée montre ses ingrédients EN GRAMMES (Raci).
// Partie 1 (Node) : toutes les idées, à plusieurs cibles. Partie 2 (navigateur, aperçu construit requis) :
// l'affichage réel à 390 px + captures avec bandeau « EXEMPLE ».
// DONNÉES FICTIVES (banc de test). Lancer depuis la racine : node tools/test-autre-idee-grammes.mjs
import { spawn } from 'child_process';
import { createRequire } from 'module';
const racine = new URL('../app-v2/', import.meta.url).pathname;
const exigerApp = createRequire(racine + 'package.json');
const SHOTS = process.env.SHOTS || '/workspace/shots';
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const A = await import(racine + 'src/services/autre-idee.js');
const { DB } = await import(racine + 'src/data/aliments.js');
const tout = A.toutesLesIdees();

// ---- 1. Données de base : chaque ingrédient a une quantité positive ----
ok(tout.length === 40 && tout.every(i => i.ings.every(g => g.q > 0 && DB[g.n])), 'les 40 idées : chaque ingrédient existe dans la base avec une quantité > 0');

// ---- 2. Après calage sur plusieurs cibles : grammes présents et cohérents ----
const CIBLES = [300, 400, 500, 600, 700];
let nbLignes = 0, nbCalees = 0, pieces = 0;
const deduites = new Map();   // nom d'idée -> lignes à la pièce
for (const cible of CIBLES) {
  for (const idee of tout) {
    const c = A.caler(idee, cible);
    if (!c) continue;
    nbCalees++;
    const libs = Object.fromEntries(c.ings.map(i => [i.name, i.l]));
    const lignes = A.lignesIdee(c.ings, libs);
    if (lignes.length !== idee.ings.length) ok(false, `${idee.nom} : ${lignes.length} lignes pour ${idee.ings.length} ingrédients`);
    let kcal = 0, bon = true;
    lignes.forEach((l, k) => {
      nbLignes++;
      const d = DB[l.name];
      if (!(Number.isInteger(l.grammes) && l.grammes > 0)) bon = false;
      if (!new RegExp(l.pieces ? '^≈ \\d+ g$' : '^\\d+ g$').test(l.detail)) bon = false;
      if (l.pieces) { pieces++; if (!/^\d+ /.test(l.nom) || l.grammes !== Math.round(l.pieces * d.unit)) bon = false; deduites.set(idee.nom, true); }
      kcal += d.kcal * (l.pieces ? l.pieces * d.unit : l.grammes) / 100;
    });
    // les grammes affichés redonnent les kcal annoncées (à l'arrondi près : 1 kcal par ligne)
    if (!bon || Math.abs(kcal - c.kcal) > lignes.length) ok(false, `${idee.nom} @${cible} : grammes incohérents (${Math.round(kcal)} vs ${c.kcal} kcal)`);
    if (!c.parts.every(p => /\d+ ?g/.test(p))) ok(false, `${idee.nom} @${cible} : un libellé sans grammes (${c.parts.join(' | ')})`);
  }
}
ok(nbCalees > 100, `${nbCalees} idées calées (${CIBLES.join('/')} kcal) : toutes avec des grammes entiers > 0`);
ok(nbLignes > 400 && code === 0, `${nbLignes} lignes d'ingrédients vérifiées : grammes présents, somme des grammes × kcal/100 = kcal annoncées`);
ok(pieces > 0 && deduites.size > 0, `${pieces} lignes à la pièce (œufs) : poids affiché « ≈ N g » = pièces × poids d'une pièce (${[...deduites.keys()].length} idées concernées)`);
// Œuf : 1 pièce M = 50 g dans la base BelFit
const oeuf = A.lignesIdee([{ name: 'Oeuf entier M (50g)', portion: 3 }], { 'Oeuf entier M (50g)': 'œuf' })[0];
ok(oeuf.nom === '3 œufs' && oeuf.detail === '≈ 150 g' && oeuf.grammes === 150, `3 œufs -> « ${oeuf.nom} » / « ${oeuf.detail} »`);
const un = A.lignesIdee([{ name: 'Oeuf entier M (50g)', portion: 1 }], { 'Oeuf entier M (50g)': 'œuf' })[0];
ok(un.nom === '1 œuf' && un.detail === '≈ 50 g', `1 œuf -> « ${un.nom} » / « ${un.detail} »`);
const sans = A.lignesIdee([{ name: 'Riz cuit', portion: 150 }, { name: 'Boeuf hache 5% cuit', portion: 120 }], { 'Boeuf hache 5% cuit': 'bœuf haché 5% cuit' });
ok(sans[0].nom === 'Riz cuit' && sans[0].detail === '150 g' && sans[1].nom === 'Bœuf haché 5% cuit' && sans[1].detail === '120 g', 'sans libellé : nom de la base ; avec libellé : nom court avec majuscule');
// idée sans libellés enregistrés (ancien journal) : aucune erreur, le nom de la base sert
const ancien = A.lignesIdee([{ name: 'Oeuf entier M (50g)', portion: 2 }, { name: 'Pain complet', portion: 60 }], undefined);
ok(ancien.length === 2 && ancien[0].detail === '≈ 100 g' && ancien[1].detail === '60 g', 'ancien journal sans libellés : grammes quand même affichés (' + ancien.map(l => l.nom + ' ' + l.detail).join(', ') + ')');
const vide = A.lignesIdee(undefined);
ok(Array.isArray(vide) && vide.length === 0, 'liste vide : pas d\'erreur');
if (process.env.SANS_NAVIGATEUR) process.exit(code);

// ---- 3. Navigateur : ce que Raci voit à 390 px ----
const { chromium } = exigerApp('playwright');
const srv = spawn('python3', ['-m', 'http.server', '8097', '--directory', racine + 'apercu/construit'], { stdio: 'ignore', detached: true });
await new Promise(r => setTimeout(r, 1500));
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const VIDE = [
  { id: 1, nom: 'Petit déjeuner', type: 'repas', cle: 'pdej', fixe: true, ouvert: false, ings: [] },
  { id: 2, nom: 'Déjeuner', type: 'repas', cle: 'dej', fixe: true, ouvert: false, ings: [] },
  { id: 3, nom: 'Dîner', type: 'repas', cle: 'diner', fixe: true, ouvert: false, ings: [] },
  { id: 4, nom: 'Collations', type: 'collation', cle: 'snack', fixe: true, ouvert: false, ings: [] }];
const PLAN = { kcal: 2222, prot: 150, carbs: 220, lip: 70, livreLe: new Date().toISOString(), version: 1, repas: [
  { nom: 'Petit-déjeuner', ings: [{ name: 'Flocons avoine', portion: 80 }, { name: 'Banane', portion: 120 }] },
  { nom: 'Déjeuner', ings: [{ name: 'Riz cuit', portion: 150 }, { name: 'Poulet cuit', portion: 130 }, { name: 'Brocoli', portion: 150 }] },
  { nom: 'Dîner', ings: [{ name: 'Brocoli', portion: 200 }, { name: 'Saumon cuit', portion: 120 }, { name: 'Pomme de terre cuite', portion: 250 }] } ] };
const dossier = (reponses) => ({ commande: { payeLe: new Date(Date.now() - 3 * 864e5).toISOString() }, questionnaire: { envoyeLe: new Date(Date.now() - 5 * 864e5).toISOString(), reponses } });
async function ouvrir(reponses) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-BE', timezoneId: 'Europe/Brussels' });
  await ctx.addInitScript(([pl, d, rb]) => {
    localStorage.clear();
    localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(pl));
    localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify(d));
    localStorage.setItem('belfit_v2_apercu_repas', JSON.stringify(rb));
  }, [PLAN, dossier(reponses), VIDE]);
  const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('ERREUR JS', e.message); code = 1; });
  await p.goto('http://localhost:8097/app.html'); await p.waitForTimeout(2600);
  return [ctx, p];
}
const carte = (p, nom) => p.locator('.mc', { hasText: new RegExp('^\\s*' + nom) }).first();
const bandeau = (p) => p.evaluate(() => {
  if (document.getElementById('bandeau-exemple')) return;
  const b = document.createElement('div'); b.id = 'bandeau-exemple';
  b.textContent = 'EXEMPLE — données fictives, rien de réel';
  b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#1F1F1F;color:#F8CF01;font:700 12px/22px sans-serif;text-align:center;letter-spacing:.04em';
  document.body.appendChild(b);
});

let [ctx, p] = await ouvrir({ regime: { valeur: 'Tout' }, allergie: { valeur: 'Non, aucune' } });
const bouton = carte(p, 'Déjeuner').locator('.mc-idee-btn', { hasText: 'Autre idée' });
const bb = await bouton.boundingBox();
ok(bb.height >= 44 && bb.width >= 120, `bouton « Autre idée » : zone tactile ${Math.round(bb.width)} × ${Math.round(bb.height)} px (≥ 44 px de haut)`);
await carte(p, 'Déjeuner').scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -140)); await p.waitForTimeout(300);
await bandeau(p);
await p.screenshot({ path: SHOTS + '/autre-idee-v2-apres-bouton-390.png' });
await bouton.click(); await p.waitForTimeout(700);
let fiche = carte(p, 'Déjeuner').locator('.mc-idee-fiche');
ok(await fiche.count() === 1, 'après le clic : une fiche d\'idée s\'affiche dans la carte du repas');
const etat = await p.evaluate(() => JSON.parse(JSON.stringify(window.__banc.repas.value.find(r => r.cle === 'dej'))));
const lis = await fiche.locator('.mc-idee-liste li').allInnerTexts();
ok(lis.length === etat.ings.length && lis.length >= 2, `la fiche liste ${lis.length} ingrédients (= ${etat.ings.length} du repas) : « ${lis.join(' | ').replace(/\n/g, ' ')} »`);
const qtes = await fiche.locator('.mc-idee-qte').allInnerTexts();
ok(qtes.every(q => /^(≈ )?\d+ g$/.test(q.trim())), 'chaque ingrédient a sa quantité en grammes : ' + qtes.join(', '));
const somme = qtes.reduce((s, q) => s + parseInt(q.replace(/\D/g, ''), 10), 0);
const attendu = etat.ings.reduce((s, i) => s + (DB[i.name].unit ? i.portion * DB[i.name].unit : i.portion), 0);
ok(somme === Math.round(attendu), `somme des grammes affichés = ${somme} g = poids du repas`);
const txt = await fiche.innerText();
ok(/prot/.test(txt) && /gluc/.test(txt) && /lip/.test(txt) && /kcal/.test(txt) && /plan : \d+ kcal/.test(txt), 'la fiche montre kcal, protéines, glucides, lipides et le rappel du plan');
const kcalFiche = +(/(\d+) kcal/.exec(txt) || [])[1];
const sous = await carte(p, 'Déjeuner').locator('.mc-sous').innerText();
ok(sous.includes(kcalFiche + ' kcal'), `kcal de la fiche (${kcalFiche}) = kcal du repas (« ${sous} »)`);
// alignement : toutes les quantités se terminent au même bord droit
const droits = await fiche.locator('.mc-idee-qte').evaluateAll(es => es.map(e => Math.round(e.getBoundingClientRect().right)));
ok(new Set(droits).size === 1, 'quantités alignées à droite (bord droit identique : ' + droits.join(', ') + ' px)');
// pas de débordement horizontal à 390 px
const debord = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(debord <= 0, 'aucun débordement horizontal à 390 px (' + debord + ')');
const bb2 = await carte(p, 'Déjeuner').locator('.mc-idee-btn', { hasText: 'Revenir au plan' }).boundingBox();
ok(bb2.height >= 44, 'bouton « Revenir au plan » : ' + Math.round(bb2.height) + ' px de haut');
await carte(p, 'Déjeuner').scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -90)); await p.waitForTimeout(300);
await bandeau(p);
await p.screenshot({ path: SHOTS + '/autre-idee-v2-apres-fenetre-grammes-390.png' });
await fiche.screenshot({ path: SHOTS + '/autre-idee-v2-apres-fiche-gros-plan.png' });
// l'état du journal reste valide : « Mangé » compte l'idée
await carte(p, 'Déjeuner').locator('.mc-plan-btn--mange').click(); await p.waitForTimeout(400);
ok(await carte(p, 'Déjeuner').locator('.mc-idee-fiche .mc-idee-qte').count() === 3, 'repas marqué mangé : la fiche et ses grammes restent consultables');
await ctx.close();

// Idée avec des œufs : le poids de la pièce est affiché (≈ N g)
[ctx, p] = await ouvrir({ regime: { valeur: 'Végétarien' }, allergie: { valeur: 'Non, aucune' } });
let trouve = false;
for (let k = 0; k < 10 && !trouve; k++) {
  await carte(p, 'Déjeuner').locator('.mc-idee-btn', { hasText: 'Autre idée' }).click(); await p.waitForTimeout(450);
  const q = await carte(p, 'Déjeuner').locator('.mc-idee-ing').allInnerTexts();
  trouve = q.some(x => /œuf/.test(x));
}
ok(trouve, 'une idée avec œufs a été proposée');
const lignesO = await carte(p, 'Déjeuner').locator('.mc-idee-liste li').allInnerTexts();
ok(lignesO.some(l => /œufs?\s+≈ \d+ g/.test(l.replace(/\n/g, ' '))), 'œufs : nombre de pièces + poids (« ' + lignesO.map(l => l.replace(/\n/g, ' ')).join(' | ') + ' »)');
await carte(p, 'Déjeuner').scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -90)); await p.waitForTimeout(300);
await bandeau(p);
await p.screenshot({ path: SHOTS + '/autre-idee-v2-apres-oeufs-390.png' });
// état pressé (visible pendant l'appui)
const btn = carte(p, 'Déjeuner').locator('.mc-idee-btn', { hasText: 'Autre idée' });
const box = await btn.boundingBox();
await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.waitForTimeout(250);
const t = await btn.evaluate(e => getComputedStyle(e).transform);
ok(t !== 'none', 'état pressé : le bouton se réduit légèrement (' + t + ')');
await p.screenshot({ path: SHOTS + '/autre-idee-v2-apres-bouton-presse-390.png', clip: { x: 0, y: Math.max(0, box.y - 40), width: 390, height: 130 } });
await p.mouse.up();
await ctx.close();

await nav.close(); try { process.kill(-srv.pid); } catch {} srv.kill(); process.exit(code);
