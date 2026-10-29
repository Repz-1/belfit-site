// 25/10 : bouton « Autre idee » sous un repas du plan.
// Partie 1 (Node) : moteur de propositions (±7 %, regime, allergies, refus) + etat du journal.
// Partie 2 (navigateur, apercu construit requis) : le bouton, l'annulation, les captures 390 px.
// DONNEES FICTIVES (banc de test). Lancer depuis la racine : node tools/test-autre-idee.mjs
import { spawn } from 'child_process';
import { createRequire } from 'module';
const racine = new URL('../app-v2/', import.meta.url).pathname;
const exigerApp = createRequire(racine + 'package.json');
const SHOTS = process.env.SHOTS || '/workspace/shots';
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const A = await import(racine + 'src/services/autre-idee.js');
const { DB, macrosOf } = await import(racine + 'src/data/aliments.js');
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const T = (idee) => norm(idee.nom + ' ' + idee.ings.map(i => i.n + ' ' + i.l).join(' ')) + ' ';
const tout = A.toutesLesIdees();
const rep = (o) => o;   // reponses du questionnaire (format reel : { id: { valeur | valeurs | autre } })
const TOUT = A.preferencesDe(null);

// ---- Liste ----
ok(tout.length === 40 && A.toutesLesIdees('pdej').length >= 12, `la liste compte ${tout.length} idées (4 catégories : ` + [...new Set(tout.map(i => i.catLabel))].join(', ') + ')');
ok(tout.every(i => i.ings.every(g => DB[g.n])), 'tous les ingrédients des idées existent dans la base');
const vege = tout.filter(i => i.cat === 'vege');
ok(vege.length > 0 && vege.every(A.estVegetarienne), `« Végé » = végétarien : les ${vege.length} idées Végé n'ont ni viande ni poisson`);
ok(tout.filter(i => i.cat !== 'vege').some(i => !A.estVegetarienne(i)), 'les autres catégories contiennent bien de la viande/poisson');

// ---- ±7 % ----
for (const cible of [250, 350, 450, 500, 600, 750]) {
  const l = A.proposables(cible, TOUT);
  const hors = l.filter(x => Math.abs(x.calage.kcal - cible) / cible > 0.07);
  ok(hors.length === 0, `cible ${cible} kcal : ${l.length} idées proposables, toutes à ±7 % (écart max ${l.length ? Math.max(...l.map(x => Math.abs(x.calage.kcal - cible) / cible * 100)).toFixed(1) : '–'} %)`);
  // kcal affichees = kcal reelles recalculees depuis les aliments du journal
  const faux = l.filter(x => Math.abs(A.kcalIngs(x.calage.ings) - x.calage.kcal) > 3);
  ok(faux.length === 0, `cible ${cible} : kcal affichées = kcal recalculées avec les aliments du journal`);
}
ok(A.proposables(500, TOUT).length >= 15, 'à 500 kcal, au moins 15 idées proposables (' + A.proposables(500, TOUT).length + ')');
ok(A.proposables(40, TOUT).length === 0 && A.proposables(0, TOUT).length === 0, 'cible absurde (40 kcal, 0 kcal) : aucune idée, pas d\'erreur');
const vues = new Set(); const noms = [];
for (let k = 0; k < 6; k++) noms.push(A.prochaineIdee(500, TOUT, vues, null).nom);
ok(new Set(noms).size === 6, 'six « Autre idée » de suite = six idées différentes');
ok(A.prochaineIdee(500, TOUT, new Set(), noms[0]).nom !== noms[0], 'jamais la même idée que l\'actuelle');

// ---- Regime ----
const pv = A.preferencesDe(rep({ regime: { valeur: 'Végétarien' } }));
const lv = A.proposables(500, pv);
ok(lv.length > 0 && lv.every(x => A.estVegetarienne(x.idee)), `Végétarien : ${lv.length} idées à 500 kcal, aucune avec viande/poisson`);
const pg = A.preferencesDe(rep({ regime: { valeur: 'Végan' } }));
ok(A.proposables(500, pg).every(x => !/\boeuf|lait(?! de coco)|fromage|skyr|yaourt|whey|cheddar|mozzarella|beurre(?! (de )?(cacahu|amande))/.test(T(x.idee))), 'Végan : aucun œuf ni produit laitier');
const pp = A.preferencesDe(rep({ regime: { valeur: 'Sans porc' } }));
ok(A.proposables(500, pp).every(x => !/jambon|bacon|porc|lardon/.test(T(x.idee))), 'Sans porc : pas de jambon/bacon');

// ---- Allergies declarees (liste du questionnaire) ----
const ALL = {
  'Œuf': /\boeuf|omelette|cantonais/, 'Poisson': /saumon|thon|cabillaud|poisson|surimi/, 'Crustacés / mollusques': /crevette|crabe|moule/,
  'Lait / lactose': /lait(?! de coco)|fromage|skyr|yaourt|whey|cheddar|mozzarella|creme|beurre(?! (de )?cacahu)/,
  'Gluten / blé': /pain|pates|avoine|wrap|tortilla|boulgour|semoule|couscous/, 'Arachide': /cacahu|arachide/,
  'Fruits à coque': /amande|noix|noisette/, 'Soja': /soja|tofu|cantonais/,
};
for (const [lib, re] of Object.entries(ALL)) {
  const pr = A.preferencesDe(rep({ allergie: { valeur: 'Oui' }, allergies: { valeurs: [lib] } }));
  const avant = A.proposables(500, TOUT).filter(x => re.test(T(x.idee))).length;
  const l = A.proposables(500, pr);
  ok(l.length > 0 && l.every(x => !re.test(T(x.idee))), `allergie « ${lib} » : ${avant} idée(s) écartée(s), plus aucune dans les ${l.length} restantes`);
}
// Plusieurs allergies + texte libre « Autre »
const pm = A.preferencesDe(rep({ allergie: { valeur: 'Oui' }, allergies: { valeurs: ['Œuf', 'Autre'], autre: 'banane, kiwi' }, allergiePrecis: { valeur: 'allergique au céleri' } }));
ok(pm.familles.has(0) && pm.mots.includes('banane') && pm.mots.includes('kiwi') && pm.mots.includes('celeri'), 'allergies : liste + « Autre » libre + précision lues (' + pm.mots.join(', ') + ')');
ok(A.proposables(500, pm).every(x => !/banane|\boeuf|omelette/.test(T(x.idee))), 'allergie banane + œuf : aucune idée avec banane ni œuf');
// « Non, aucune » : les cases cochees avant ne comptent plus
const pn = A.preferencesDe(rep({ allergie: { valeur: 'Non, aucune' }, allergies: { valeurs: ['Œuf'] } }));
ok(pn.familles.size === 0, '« Non, aucune » : la liste d\'allergies est ignorée');

// ---- Aliments refuses (texte libre) ----
const refus = (txt) => A.preferencesDe(rep({ refuses: { valeur: txt } }));
let l = A.proposables(500, refus('poulet, saumon'));
ok(l.length > 0 && l.every(x => !/poulet|saumon/.test(T(x.idee))), 'refus « poulet, saumon » : aucune idée avec poulet ni saumon');
l = A.proposables(500, refus('Je ne mange pas de viande'));
ok(l.length > 0 && l.every(x => !/poulet|boeuf|steak|dinde|jambon|bolognaise/.test(T(x.idee))), 'refus « Je ne mange pas de viande » : aucune viande');
l = A.proposables(500, refus('fromage et thon'));
ok(l.every(x => !/fromage|cheddar|mozzarella|thon/.test(T(x.idee))), 'refus « fromage et thon » : ni fromage (cheddar, mozzarella…) ni thon');
l = A.proposables(500, refus('les oeufs'));
ok(l.every(x => !/\boeuf|omelette/.test(T(x.idee))), 'refus « les oeufs » (pluriel) : aucun œuf');
l = A.proposables(500, refus('riz'));
ok(l.every(x => !/riz/.test(T(x.idee))) && l.length > 0, 'refus « riz » : aucune idée avec riz');
ok(A.proposables(500, refus('coriandre')).length === A.proposables(500, TOUT).length, 'refus d\'un aliment absent des idées (coriandre) : rien n\'est écarté à tort');
ok(A.proposables(500, refus('')).length === A.proposables(500, TOUT).length, 'refus vide : rien n\'est écarté');
ok(A.preferencesDe({}).familles.size === 0, 'questionnaire vide : pas d\'erreur');

// ---- Etat du journal (store reel, Firebase remplace par un bouchon) ----
const esbuild = exigerApp('esbuild');
const sortie = '/tmp/journal-test-autre-idee.mjs';
await esbuild.build({
  entryPoints: [racine + 'src/store/journal.js'], bundle: true, format: 'esm', platform: 'node', outfile: sortie, logLevel: 'silent',
  plugins: [{ name: 'bouchons', setup(b) {
    b.onResolve({ filter: /services\/(firebase|sync)\.js$|store\/stats\.js$/ }, a => ({ path: a.path, namespace: 'bouchon' }));
    b.onLoad({ filter: /.*/, namespace: 'bouchon' }, () => ({ resolveDir: racine, loader: 'js', contents: `
      import { signal } from '@preact/signals';
      export const identite = signal(null); export const chargerDonnees = async () => null; export const sauvegarder = () => {};
      export const enregistrerJour = () => {}; export const utilisateur = signal(null);` }));
  } }],
});
globalThis.window = globalThis; globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { addEventListener() {}, visibilityState: 'visible' }; globalThis.addEventListener = () => {};
let J;
try { J = await import(sortie); } catch (e) { console.log('(journal non chargeable sous Node : ' + e.message + ')'); }
if (J) {
  const PLAN = [{ nom: 'Déjeuner', ings: [{ name: 'Riz cuit', portion: 150 }, { name: 'Poulet cuit', portion: 130 }] }];
  J.repas.value = [{ id: 2, nom: 'Déjeuner', type: 'repas', cle: 'dej', fixe: true, ouvert: false, ings: [] }];
  J.semerPlan(PLAN);
  const get = () => J.repas.value.find(r => r.cle === 'dej');
  const plan0 = JSON.stringify(get().ings);
  const cible = A.kcalIngs(get().ings);
  const p1 = A.prochaineIdee(cible, TOUT, new Set(), null);
  J.appliquerIdee(get().id, p1);
  ok(get().idee && get().idee.nom === p1.nom && get().prevu === true, 'appliquerIdee : le repas reste « prévu », avec l\'idée');
  ok(JSON.stringify(get().ingsPlan) === plan0, 'le plan d\'origine est conservé (ingsPlan identique)');
  ok(get().ings.length === p1.ings.length && Math.abs(A.kcalIngs(get().ings) - p1.kcal) < 2, 'les aliments du repas = ceux de l\'idée (kcal ' + Math.round(A.kcalIngs(get().ings)) + ')');
  const p2 = A.prochaineIdee(cible, TOUT, new Set([p1.nom]), p1.nom);
  J.appliquerIdee(get().id, p2);
  ok(JSON.stringify(get().ingsPlan) === plan0 && get().idee.nom === p2.nom, 'une 2e idée garde le PLAN d\'origine (pas la 1re idée)');
  J.semerPlan([{ nom: 'Déjeuner', ings: [{ name: 'Riz cuit', portion: 200 }, { name: 'Poulet cuit', portion: 130 }] }]);
  ok(get().idee && get().idee.nom === p2.nom && get().ings.length === p2.ings.length, 'un nouveau semis du plan n\'écrase pas l\'idée choisie');
  ok(get().ingsPlan[0].portion === 200, '… mais le retour pointe sur le plan à jour');
  J.annulerIdee(get().id);
  ok(!get().idee && !get().ingsPlan && get().ings[0].portion === 200 && get().prevu === true, 'annulerIdee : le plan revient (plan à jour), idée et ingsPlan retirés');
  J.semerPlan(PLAN); J.appliquerIdee(get().id, p1); J.mangeAutreChose(get().id);
  ok(get().remplace && !get().idee && JSON.stringify(get().ingsPlan) === plan0, '« Mangé autre chose » après une idée : le PLAN (pas l\'idée) est mis de côté');
  J.remettrePrevu(get().id);
  ok(JSON.stringify(get().ings) === plan0, '… et « remettre en prévu » rend le plan');
  J.appliquerIdee(get().id, p1); J.sauterRepas(get().id);
  J.appliquerIdee(get().id, p2);
  ok(get().saute && !get().idee ? true : get().saute === true && get().idee.nom === p1.nom, 'repas sauté : « Autre idée » n\'agit pas');
  // Repas libre (hors plan) : jamais touche
  J.repas.value = [{ id: 9, nom: 'Libre', type: 'repas', fixe: false, ouvert: false, ings: [{ id: 1, name: 'Banane', portion: 100 }] }];
  J.appliquerIdee(9, p1);
  ok(!J.repas.value[0].idee && J.repas.value[0].ings.length === 1, 'repas hors plan : « Autre idée » n\'agit pas');
}
if (process.env.SANS_NAVIGATEUR) process.exit(code);

// ---- Navigateur ----
const { chromium } = exigerApp('playwright');
const srv = spawn('python3', ['-m', 'http.server', '8096', '--directory', racine + 'apercu/construit'], { stdio: 'ignore', detached: true });
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
async function ouvrir(reponses, nomCtx) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-BE', timezoneId: 'Europe/Brussels' });
  await ctx.addInitScript(([pl, d, rb]) => {
    localStorage.clear();
    localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(pl));
    localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify(d));
    localStorage.setItem('belfit_v2_apercu_repas', JSON.stringify(rb));
  }, [PLAN, dossier(reponses), VIDE]);
  const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('ERREUR JS', e.message); code = 1; });
  await p.goto('http://localhost:8096/app.html?verrou=ouvert');   // blocage allume (v639) : acces simule ouvert await p.waitForTimeout(2600);
  return [ctx, p];
}
const carte = (p, nom) => p.locator('.mc', { hasText: new RegExp('^\\s*' + nom) }).first();
const etat = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.__banc.repas.value)));

// 1) Sans restriction
let [ctx, p] = await ouvrir({ regime: { valeur: 'Tout' }, allergie: { valeur: 'Non, aucune' } });
ok(await p.locator('.mc-plan').count() === 3, 'plan semé : 3 repas prévus');
ok(await p.locator('.mc-idee-btn', { hasText: 'Autre idée' }).count() === 3, 'un bouton « Autre idée » discret sous chacun des 3 repas');
const avant = await etat(p);
const dej = avant.find(r => r.cle === 'dej');
const kcalPlan = await p.evaluate(() => { const r = window.__banc.repas.value.find(x => x.cle === 'dej'); return r.ings.reduce((s, i) => s + (i.kcal || 0), 0); });
await carte(p, 'Déjeuner').scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -120)); await p.waitForTimeout(300);
await p.screenshot({ path: SHOTS + '/autre-idee-1-boutons-390.png' });
await carte(p, 'Déjeuner').locator('.mc-idee-btn', { hasText: 'Autre idée' }).click(); await p.waitForTimeout(600);
let apres = await etat(p); let d2 = apres.find(r => r.cle === 'dej');
ok(!!d2.idee && JSON.stringify(d2.ingsPlan) === JSON.stringify(dej.ings), 'clic : l\'idée remplace le déjeuner, le plan est gardé dans ingsPlan');
ok(JSON.stringify(apres.find(r => r.cle === 'diner').ings) === JSON.stringify(avant.find(r => r.cle === 'diner').ings) && JSON.stringify(apres.find(r => r.cle === 'pdej').ings) === JSON.stringify(avant.find(r => r.cle === 'pdej').ings), 'les autres repas du jour ne bougent pas');
const txt = await carte(p, 'Déjeuner').innerText();
ok(/Idée du jour/i.test(txt) && /kcal/.test(txt) && /plan : \d+ kcal/.test(txt), 'affichage : nom, kcal réelles et kcal du plan — « ' + txt.replace(/\s+/g, ' ').slice(0, 170) + ' »');
ok(/Vérifie les ingrédients/.test(txt), 'message « Vérifie les ingrédients » affiché');
const kcalIdeeAff = +(/(\d+) kcal\s*·\s*plan/.exec(txt) || [])[1];
const planKcal = +(/plan : (\d+) kcal/.exec(txt) || [])[1];
ok(Math.abs(kcalIdeeAff - planKcal) <= Math.max(15, planKcal * 0.02), `écart affiché ${kcalIdeeAff} vs ${planKcal} kcal = ${((kcalIdeeAff - planKcal) / planKcal * 100).toFixed(1)} % (≤ 2 % ou 15 kcal)`);
const sous = await carte(p, 'Déjeuner').locator('.mc-sous').innerText();
ok(new RegExp('Prévu · ' + kcalIdeeAff + ' kcal').test(sous), 'la carte annonce « ' + sous + ' » (kcal de l\'idée)');
await p.screenshot({ path: SHOTS + '/autre-idee-2-propose-390.png' });
const nom1 = d2.idee.nom;
await carte(p, 'Déjeuner').locator('.mc-idee-btn', { hasText: 'Autre idée' }).click(); await p.waitForTimeout(500);
d2 = (await etat(p)).find(r => r.cle === 'dej');
ok(d2.idee.nom !== nom1 && JSON.stringify(d2.ingsPlan) === JSON.stringify(dej.ings), 'deuxième clic : autre idée (' + d2.idee.nom + '), plan toujours intact');
await carte(p, 'Déjeuner').locator('.mc-idee-btn--retour').click(); await p.waitForTimeout(500);
apres = await etat(p); d2 = apres.find(r => r.cle === 'dej');
ok(!d2.idee && !d2.ingsPlan && JSON.stringify(d2.ings) === JSON.stringify(dej.ings), '« Revenir au plan » : le déjeuner est identique au plan d\'origine');
ok(JSON.stringify(apres) === JSON.stringify(avant), 'tout le journal est revenu à l\'identique');
ok(await carte(p, 'Déjeuner').locator('.mc-idee-txt').count() === 0, 'plus de bandeau d\'idée après annulation');
// Idée puis « Mangé » : les kcal de l'idée comptent
await carte(p, 'Déjeuner').locator('.mc-idee-btn', { hasText: 'Autre idée' }).click(); await p.waitForTimeout(500);
const kcalIdee = (await etat(p)).find(r => r.cle === 'dej').idee.kcal;
await carte(p, 'Déjeuner').locator('.mc-plan-btn--mange').click(); await p.waitForTimeout(500);
const tot = await p.evaluate(() => { const r = window.__banc.repas.value.find(x => x.cle === 'dej'); return { prevu: r.prevu, n: r.ings.length }; });
ok(tot.prevu === false && tot.n > 0, '« Mangé » après une idée : repas validé avec les aliments de l\'idée');
ok(await carte(p, 'Déjeuner').locator('.mc-idee-btn').count() === 0, 'repas mangé : plus de bouton « Autre idée »');
const sousMange = await carte(p, 'Déjeuner').locator('.mc-sous').innerText();
ok(sousMange.includes(Math.round(kcalIdee) + ' kcal') || Math.abs(+(/(\d+) kcal/.exec(sousMange) || [])[1] - kcalIdee) <= 1, 'la carte compte ' + sousMange);
await ctx.close();

// 2) Allergie œuf + refus de poulet, 5 clics : jamais ni œuf ni poulet
[ctx, p] = await ouvrir({ regime: { valeur: 'Tout' }, allergie: { valeur: 'Oui' }, allergies: { valeurs: ['Œuf'] }, refuses: { valeur: 'poulet' } });
const vusNoms = [];
for (let k = 0; k < 5; k++) {
  await carte(p, 'Dîner').locator('.mc-idee-btn', { hasText: 'Autre idée' }).click(); await p.waitForTimeout(350);
  const r = (await etat(p)).find(x => x.cle === 'diner');
  vusNoms.push(r.idee ? r.idee.nom + ' ‖ ' + r.ings.map(i => i.name).join(', ') : '(aucune)');
}
console.log('  idées proposées (dîner, allergie œuf + refus poulet) :\n   - ' + vusNoms.join('\n   - '));
ok(vusNoms.every(n => n !== '(aucune)' && !/\boeuf|omelette|cantonais|poulet/i.test(norm(n))), 'allergie œuf + refus poulet : 5 idées proposées, aucune avec œuf ni poulet');
await p.screenshot({ path: SHOTS + '/autre-idee-3-allergie-390.png' });
await ctx.close();

// 3) Végétarien : uniquement du végé
[ctx, p] = await ouvrir({ regime: { valeur: 'Végétarien' }, allergie: { valeur: 'Non, aucune' } });
const noms3 = [];
for (let k = 0; k < 4; k++) {
  await carte(p, 'Déjeuner').locator('.mc-idee-btn', { hasText: 'Autre idée' }).click(); await p.waitForTimeout(350);
  const r = (await etat(p)).find(x => x.cle === 'dej'); noms3.push(r.idee ? r.idee.nom : '(aucune)');
}
const catDe = (n) => (tout.find(i => i.nom === n) || {}).cat;
console.log('  idées (végétarien) : ' + noms3.join(' | '));
ok(noms3.every(n => n !== '(aucune)' && A.estVegetarienne(tout.find(i => i.nom === n))), 'régime Végétarien : toutes les idées proposées sont végétariennes');
await ctx.close();

// 4) Rien de proche : message clair, plan intact
[ctx, p] = await ouvrir({ regime: { valeur: 'Végan' }, allergie: { valeur: 'Oui' }, allergies: { valeurs: ['Soja', 'Gluten / blé', 'Arachide', 'Fruits à coque'] }, refuses: { valeur: 'riz, pomme de terre, quinoa, lentilles, pois chiches, haricots, banane, avoine, tomate' } });
await carte(p, 'Dîner').locator('.mc-idee-btn', { hasText: 'Autre idée' }).click(); await p.waitForTimeout(500);
const msg = await carte(p, 'Dîner').innerText();
const rd = (await etat(p)).find(x => x.cle === 'diner');
ok(/Pas d'autre idée proche/.test(msg) && !rd.idee, 'aucune idée compatible : message « Pas d\'autre idée proche… », plan intact (' + (msg.match(/Pas d'autre idée[^\n]*/) || [''])[0] + ')');
await p.screenshot({ path: SHOTS + '/autre-idee-4-aucune-390.png' });
await ctx.close();
// 5) 29/10 Raci : petit-déjeuner = idées du matin UNIQUEMENT (jamais de pâtes bolognaise)
[ctx, p] = await ouvrir({ regime: { valeur: 'Tout' }, allergie: { valeur: 'Non, aucune' } });
await p.waitForTimeout(2000);   // laisse le semis du plan se stabiliser
const nomsPdej = new Set(A.toutesLesIdees('pdej').map(i => i.nom));
const vusPdej = [];
for (let k = 0; k < 12; k++) {
  const avantNom = ((await etat(p)).find(x => x.cle === 'pdej').idee || {}).nom || null;
  await carte(p, 'Petit-déjeuner').locator('.mc-idee-btn', { hasText: 'Autre idée' }).click();
  // Attend que l'idee change (le 1er clic apres chargement est parfois lent).
  await p.waitForFunction((a) => { const r = window.__banc.repas.value.find(x => x.cle === 'pdej'); return r.idee && r.idee.nom !== a; }, avantNom, { timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(200);
  const r = (await etat(p)).find(x => x.cle === 'pdej');
  vusPdej.push(r.idee ? r.idee.nom : '(aucune)');
  if (k < 3) { await carte(p, 'Petit-déjeuner').scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -80)); await p.waitForTimeout(800);
    await p.screenshot({ path: SHOTS + '/autre-idee-5-petit-dej-' + (k + 1) + '-390.png' }); }
}
console.log('  idées proposées (petit-déjeuner) :\n   - ' + vusPdej.join('\n   - '));
ok(vusPdej.every(n => nomsPdej.has(n)) && !vusPdej.some(n => /bolognaise|poulet|pâtes/i.test(n)), 'petit-déjeuner : 12 clics, uniquement des idées du matin');
await ctx.close();
await nav.close(); try { process.kill(-srv.pid); } catch {} srv.kill(); process.exit(code);
