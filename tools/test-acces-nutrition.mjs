// Blocage de l'alimentation (option B : historique en lecture seule) — cote application.
// ETATS SIMULES dans le banc d'essai (aucun vrai compte, aucun serveur). DONNEES DE TEST uniquement.
// Prerequis : apercu construit (npx vite build --config apercu.config.js dans app-v2).
// NB : depuis v639 le drapeau BLOCAGE_ALIMENTATION est a true (blocage allume, OK Raci 29/10) ;
// l'interrupteur « distant » simule (config/acces) reste teste en plus.
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const PORT = 8098;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
await new Promise(r => setTimeout(r, 1500));
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const J = 86400000;

async function ouvrir(ctxOpts = {}) {
  const { horloge, ...opts } = ctxOpts; const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE', timezoneId: 'Europe/Brussels', ...opts });
  const PLAN_VIDE = [1, 2, 3, 4].map(i => ({ id: i, nom: ['Petit déjeuner', 'Déjeuner', 'Dîner', 'Collations'][i - 1], type: i === 4 ? 'collation' : 'repas', cle: ['pdej', 'dej', 'diner', 'snack'][i - 1], fixe: true, ouvert: false,
    ings: i < 3 ? [{ id: i * 10, name: i === 1 ? 'Avoine' : 'Riz cuit', portion: 70 }] : [] }));
  await ctx.addInitScript((r) => { if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', '1'); localStorage.setItem('belfit_v2_apercu_repas', JSON.stringify(r)); } }, PLAN_VIDE);
  const page = await ctx.newPage();
  if (horloge) await page.clock.install({ time: new Date() });
  page.on('pageerror', e => { console.log('ERREUR JS', e.message); code = 1; });
  page.on('dialog', d => d.accept());
  await page.goto('http://localhost:' + PORT + '/app.html'); await page.waitForTimeout(2200);
  // Le chargement local du banc peut ecraser les repas de test : on les remet jusqu'a ce qu'ils tiennent.
  for (let i = 0; i < 8; i++) {
    await page.evaluate((r) => { window.__banc.repas.value = r; }, PLAN_VIDE);
    await page.waitForTimeout(400);
    if (await page.evaluate(() => window.__banc.repas.value.some(x => x.ings.length))) break;
  }
  return { ctx, page };
}
const lire = (page) => page.evaluate(() => {
  const b = window.__banc, a = b.accesNut;
  return { ro: a.lectureSeule.value, offre: a.offreVisible.value, cause: a.causeFermeture.value, flag: a.BLOCAGE_ALIMENTATION,
    carte: !!document.querySelector('.vr-carte'), texte: (document.querySelector('.vr-carte') || {}).innerText || '',
    ajoutRepas: !!document.querySelector('.ajout-repas'), nbIngs: b.repas.value.reduce((n, r) => n + (r.ings || []).length, 0) };
});
// Tente TOUTES les ecritures alimentaires : l'etat doit rester identique si ferme.
const tenter = (page) => page.evaluate(() => {
  const b = window.__banc, j = b.jrn, p = b.perso;
  const snap = () => JSON.stringify([b.repas.value, j.objectifs.value, b.histoJours.value, p.favoris.value, p.usages.value, p.plats.value]);
  const avant = snap();
  const r1 = b.repas.value[0], i1 = r1.ings[0];
  j.setPortion(r1.id, i1 && i1.id, 999); j.ajouterIngredient(r1.id, 'Riz cuit', 100); j.ajouterPlat(r1.id, { nom: 'x', ings: [{ name: 'Riz cuit', portion: 50 }], portions: 1 }, 1);
  j.remplacerAliment(r1.id, i1 && i1.id, 'Poulet cuit'); j.basculerCuisson(r1.id, i1 && i1.id); j.supprimerIngredient(r1.id, i1 && i1.id);
  j.ajouterRepas('collation'); j.supprimerRepas(r1.id); j.validerRepas(r1.id); j.semerPlan([{ nom: 'Petit déjeuner', ings: [{ name: 'Avoine', portion: 70 }] }]);
  j.annulerValidation(r1.id); j.sauterRepas(r1.id); j.mangeAutreChose(r1.id); j.remettrePrevu(r1.id); j.renommerRepas(r1.id, 'Autre'); j.nouvelleJournee();
  j.setObjectifs({ kcal: 1234, prot: 1, carbs: 1, lip: 1 });
  p.basculerFavori('Riz cuit'); p.noterUsage('Riz cuit'); p.enregistrerPlat({ id: 9, nom: 'P', ings: [], portions: 1 }); p.supprimerPlat(9);
  return snap() === avant;
});
// Ouvre le premier repas et compte les entrees « scan / voix / photo » (2 boutons .mc-scan quand tout est ouvert, photo retiree v638).
const ouvrirRepas = async (page) => { await page.locator('.mc-tete').first().click(); await page.waitForTimeout(800); return page.evaluate(() => ({ entrees: document.querySelectorAll('.mc-scan').length, champsLecture: document.querySelectorAll('.mc-ing-champ--lecture').length })); };
const simuler = (page, f) => page.evaluate(f); const pause = (page) => page.waitForTimeout(500);

// ---- 0. Livraison : drapeau a true (v639), blocage actif meme sans interrupteur distant ----
{
  const src = readFileSync(new URL('../app-v2/src/store/acces-nutrition.js', import.meta.url), 'utf8');
  ok(/export const BLOCAGE_ALIMENTATION = true;/.test(src), 'drapeau BLOCAGE_ALIMENTATION = true dans le code livré (v639)');
  const { ctx, page } = await ouvrir();
  await simuler(page, () => { const a = window.__banc.accesNut; a.poserBlocageDistant(false); a.poserAcces('test', null); });
  await pause(page);
  const s = await lire(page);
  ok(s.flag === true && s.ro && s.offre, 'drapeau seul (interrupteur distant a false) : alimentation en lecture seule + offre');
  ok(await tenter(page) === true, 'drapeau seul : aucune écriture alimentaire ne passe');
  await ctx.close();
}
// ---- 1. Jamais payé ----
{
  const { ctx, page } = await ouvrir();
  await simuler(page, () => { const a = window.__banc.accesNut; a.poserBlocageDistant(true); a.poserAcces('test', null); });
  await pause(page);
  const s = await lire(page);
  ok(s.ro && s.offre && s.cause === 'jamais', 'jamais payé : lecture seule + offre');
  ok(s.carte && /Alimentation.*payante/.test(s.texte) && /entraînement reste offert/.test(s.texte), 'jamais payé : bulle « Alimentation : payante » + entraînement offert');
  ok(/Bientôt disponible/.test(s.texte) && !/Voir l'offre/.test(s.texte), 'achat fermé : « Bientôt disponible » (rien ne s’ouvre)');
  ok(!/€/.test(s.texte) && !/gratuit/i.test(s.texte), 'carte : aucun prix, jamais « gratuit »');
  ok((s.texte.match(/coach/gi) || []).length <= 1, 'carte : le mot « coach » pas répété');
  ok(!s.ajoutRepas, 'jamais payé : pas de « ajouter un repas »');
  ok(await tenter(page) === true, 'jamais payé : AUCUNE écriture alimentaire ne passe (17 actions + favoris/plats)');
  await simuler(page, () => window.__banc.accesNut.commandesSimulees.value = true); await pause(page);
  ok(/Voir l'offre/.test((await lire(page)).texte), 'achat ouvert (simulé) : bouton « Voir l’offre »');
  // Eau libre
  const eau = await page.evaluate(() => { const j = window.__banc.jrn; j.eau.value = 0; j.ajouterEau(0.5); return j.eau.value; });
  ok(eau === 0.5, 'eau : reste libre (par défaut, à confirmer par Raci)');
  const eau0 = await page.evaluate(async () => { const j = window.__banc.jrn, a = window.__banc.accesNut; j.eau.value = 1; j.eauDate.value = '2000-01-01'; a.poserAcces('test', Date.now() + 864e5); await new Promise(r => setTimeout(r, 100)); a.poserAcces('test', null); await new Promise(r => setTimeout(r, 100)); return j.eau.value; });
  ok(eau0 === 0, 'eau : repart à zéro chaque jour tant que l’alimentation est fermée');
  // Cles envoyees au cloud
  const cles = await page.evaluate(() => { const a = window.__banc.accesNut; const o = { repas: 1, objectifs: 1, histoJours: 1, courses: 1, customFoods: 1, plats: 1, favoris: 1, usages: 1, seances: 1, poids: 1, eau: 1, reglages: 1 }; return Object.keys(a.sansNutrition(o)); });
  ok(JSON.stringify(cles) === JSON.stringify(['seances', 'poids', 'eau', 'reglages']), 'envoi cloud : clés alimentation retirées, séances/poids/eau/réglages gardés');
  await ctx.close();
}
// ---- 2. Expire ----
{
  const { ctx, page } = await ouvrir();
  await simuler(page, (t) => { const a = window.__banc.accesNut; a.poserBlocageDistant(true); a.poserAcces('test', t); }, Date.now() - 3 * J);
  await page.evaluate((t) => { const a = window.__banc.accesNut; a.poserAcces('test', t); }, Date.now() - 3 * J); await pause(page);
  const s = await lire(page);
  ok(s.ro && s.offre && s.cause === 'expire' && /terminé/.test(s.texte), 'expiré : lecture seule + carte « accès terminé »');
  ok(/consult/i.test(s.texte), 'expiré : la carte dit que l’historique reste consultable');
  ok(s.nbIngs > 0, 'expiré : l’historique reste VISIBLE');
  ok(await tenter(page) === true, 'expiré : aucune écriture alimentaire');
  const e = await ouvrirRepas(page);
  ok(e.entrees === 0 && e.champsLecture > 0, 'expiré : repas ouvert = scan, voix et photo ABSENTS, quantités en lecture seule');
  await ctx.close();
}
// ---- 3. Actif / illimite / proprietaire ----
for (const [nom, delta] of [['actif (+10 jours)', 10 * J], ['illimité / propriétaire (9999-12-31)', null]]) {
  const { ctx, page } = await ouvrir();
  await page.evaluate((d) => { const a = window.__banc.accesNut; a.poserBlocageDistant(true); a.poserAcces('test', d === null ? a.FIN_ILLIMITEE_MS : Date.now() + d); }, delta); await pause(page);
  const s = await lire(page);
  ok(!s.ro && !s.offre && !s.carte && s.ajoutRepas, nom + ' : tout est ouvert, aucune carte');
  ok(await tenter(page) === false, nom + ' : les écritures passent');
  const e = await ouvrirRepas(page);
  ok(e.entrees === 2 && e.champsLecture === 0, nom + ' : repas ouvert = scan et voix présents (photo retirée v638)');
  await ctx.close();
}
// ---- 4. Acces inconnu (premier lancement, hors ligne, sans copie) ----
{
  const { ctx, page } = await ouvrir();
  await page.evaluate(() => { const a = window.__banc.accesNut; a.poserBlocageDistant(true); a.chargerAccesLocal('inconnu'); }); await pause(page);
  const s = await lire(page);
  ok(s.ro && !s.offre && !s.carte, 'accès inconnu : lecture seule par prudence, SANS carte d’offre');
  ok(await tenter(page) === true, 'accès inconnu : aucune écriture');
  await ctx.close();
}
// ---- 5. Invite ----
{
  const { ctx, page } = await ouvrir();
  await page.evaluate(() => { const a = window.__banc.accesNut; a.poserBlocageDistant(true); a.poserAccesInvite(); }); await pause(page);
  const s = await lire(page);
  ok(s.ro && s.offre, 'invité : fermé + offre');
  await ctx.close();
}
// ---- 6. Hors ligne : la copie locale prend le relais ----
{
  const { ctx, page } = await ouvrir();
  await page.evaluate((f) => { const a = window.__banc.accesNut; a.poserBlocageDistant(true); a.poserAcces('hl', f); }, Date.now() + 20 * J);
  await page.reload(); await page.waitForTimeout(2000);
  await page.evaluate(() => { window.__banc.accesNut.chargerAccesLocal('hl'); }); await pause(page);
  let s = await lire(page);
  ok(!s.ro, 'hors ligne : accès actif gardé en copie locale -> ouvert');
  await page.evaluate((f) => { const a = window.__banc.accesNut; a.poserAcces('hl2', f); }, Date.now() - J);
  await page.evaluate(() => { window.__banc.accesNut.chargerAccesLocal('hl2'); }); await pause(page);
  s = await lire(page);
  ok(s.ro && s.offre && s.cause === 'expire', 'hors ligne : accès expiré en copie locale -> fermé');
  ok(await page.evaluate(() => window.__banc.accesNut.blocageDistant.value === true), 'hors ligne : interrupteur gardé en copie locale');
  await ctx.close();
}
// ---- 7. Un acces qui expire pendant la session ferme l'alimentation ----
{
  const { ctx, page } = await ouvrir({ horloge: true });
  await page.evaluate(() => { const a = window.__banc.accesNut; a.poserBlocageDistant(true); a.poserAcces('test', Date.now() + 90 * 1000); });
  ok(!(await lire(page)).ro, 'session : accès encore valable');
  await page.clock.fastForward(5 * 60 * 1000); await pause(page);
  ok((await lire(page)).ro, 'session : l’accès expire -> lecture seule sans recharger');
  await ctx.close();
}
// ---- 8. Etats simules (?verrou=) ----
for (const [v, attendu] of [['jamais', true], ['expire', true], ['ouvert', false]]) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/app.html?verrou=${v}`); await page.waitForTimeout(1800);
  ok((await lire(page)).ro === attendu, `banc ?verrou=${v} -> lecture seule = ${attendu}`);
  await ctx.close();
}
// ---- 9. Offre unique inchangee ----
{
  const { execSync } = await import('child_process');
  const modifies = execSync('git status --porcelain app-v2/src functions mollie* 2>/dev/null; git diff --name-only origin/main -- app-v2/src', { encoding: 'utf8' });
  // 31/10 (v643) : CoachPage.jsx recoit le masquage de l'app Android (TWA). Les prix
  // eux-memes ne doivent pas bouger : memes montants « NN € » qu'origin/main.
  ok(!/PremiumPage|store\/coach\.js|ListeOffres|cgv/.test(modifies), 'offre unique (80 € / 60 €) : fichiers de l’offre non modifiés');
  const prix = t => (t.match(/\d+ €/g) || []).sort().join(',');
  let avant = ''; try { avant = execSync('git show origin/main:app-v2/src/components/CoachPage.jsx', { encoding: 'utf8' }); } catch (e) { avant = ''; }
  const apres = (await import('fs')).readFileSync('app-v2/src/components/CoachPage.jsx', 'utf8');
  ok(!avant || prix(avant) === prix(apres), 'offre unique : montants de CoachPage.jsx identiques à origin/main');
  const src = readFileSync(new URL('../app-v2/src/components/CoachPage.jsx', import.meta.url), 'utf8');
  ok(/Premier mois<\/span>/.test(src) && /<span class="cp-prix">80 €<\/span>/.test(src) && /Mois suivant · 60 €/.test(src), 'page d’offre : un seul plan, 80 € (1er mois) et 60 € (mois suivant), inchangé');
}
await nav.close(); try { process.kill(-srv.pid); } catch (e) {}
process.exit(code);
