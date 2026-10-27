// Plans par date (26/10) : un plan en plusieurs versions, chacune avec un jour
// de debut ; l'appli applique la bonne selon la date du jour (Bruxelles).
// Partie 1 : logique pure (aucun navigateur).   Partie 2 : l'appli dans un
// navigateur, a deux dates simulees (apercu construit : npx vite build
// --config apercu.config.js dans app-v2 ; sinon la partie 2 est sautee).
// TOUTES les donnees ci-dessous sont FICTIVES (banc de test).
import { createRequire } from 'module';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import {
  dateBruxelles, jourValide, ajouterJours, aDesVersions, choisirVersion, prochaineVersion, resoudreProgramme,
} from '../app-v2/src/store/plans-par-date.js';
import { modeleRebond } from '../app-v2/src/data/modele-rebond.js';
import { DB, macrosOf } from '../app-v2/src/data/aliments.js';
const exiger = createRequire(import.meta.url);
const PV = exiger('../functions/plans-versions.js');

let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const repasDe = (nom, g) => [{ nom, ings: [{ name: 'Avoine', portion: g }] }];
const V = (debut, g, libelle) => ({ debut, libelle, kcal: g * 10, prot: 1, carbs: 1, lip: 1, repas: repasDe('Repas 1', g) });
// 5 versions fictives, dates d'exemple (le vrai coach les saisit lui-meme).
const BRUT = {
  kcal: 2100, prot: 150, carbs: 220, lip: 70, livreLe: '2026-10-20T10:00:00.000Z', version: 1, repas: repasDe('Repas 1', 100),
  versions: [V('2026-11-02', 100, 'S1'), V('2026-11-09', 120, 'S2'), V('2026-11-16', 140, 'S3'), V('2026-11-23', 160, 'S4'), V('2026-11-30', 180, 'S5-8')],
};
const g = (pr) => pr && pr.repas[0] && pr.repas[0].ings[0].portion;

// ---- 1. Jour de Bruxelles (et le piege UTC) ----
ok(dateBruxelles(new Date('2026-10-26T23:30:00Z')) === '2026-10-27', 'Bruxelles : 23h30 UTC (hiver, 00h30 belge) = jour suivant');
ok(dateBruxelles(new Date('2026-10-26T22:59:59Z')) === '2026-10-26', 'Bruxelles : 22h59 UTC = encore le 26 (heure d\'hiver, 23h59 belge)');
ok(dateBruxelles(new Date('2026-10-26T23:00:00Z')) === '2026-10-27', 'Bruxelles : 23h00 UTC (00h00 belge) = le 27');
ok(dateBruxelles(new Date('2026-07-14T22:00:00Z')) === '2026-07-15', 'Bruxelles : 22h00 UTC en ete (00h00 belge) = jour suivant');
ok(dateBruxelles(new Date('2026-07-14T21:59:59Z')) === '2026-07-14', 'Bruxelles : 21h59 UTC en ete = encore le 14');
ok(dateBruxelles(new Date('2026-10-25T23:30:00Z')) === '2026-10-26', 'Bruxelles : nuit du passage a l\'heure d\'hiver');
ok(jourValide('2026-02-31') === null && jourValide('2026-11-02') === '2026-11-02' && jourValide('') === null && jourValide(null) === null, 'jourValide refuse les dates fausses');
ok(ajouterJours('2026-11-02', 7) === '2026-11-09' && ajouterJours('2026-12-28', 7) === '2027-01-04', 'ajouterJours : +7 jours, passage d\'annee');

// ---- 2. Avant la 1re date ----
let r = resoudreProgramme(BRUT, '2026-11-01');
ok(r.enAttente && r.enAttente.debut === '2026-11-02', 'avant la 1re date, sans ancien plan : en attente, avec la date de depart');
ok(r.kcal === 0 && r.repas.length === 0, 'avant la 1re date, sans ancien plan : aucun repas, aucun objectif');
r = resoudreProgramme({ ...BRUT, precedent: { kcal: 1800, prot: 120, carbs: 200, lip: 60, repas: repasDe('Repas 1', 77), livreLe: '2026-09-01T10:00:00.000Z' } }, '2026-11-01');
ok(!r.enAttente && r.kcal === 1800 && g(r) === 77, 'avant la 1re date, avec ancien plan : l\'ancien plan reste actif');
ok(r.prochaine && r.prochaine.debut === '2026-11-02', 'avant la 1re date : la prochaine etape est annoncee');
ok(r.versionCle === 'precedent' && r.livreLe === '2026-09-01T10:00:00.000Z', 'ancien plan : repere de semis propre, livreLe de l\'ancien plan');

// ---- 3. Le jour J et entre deux dates ----
r = resoudreProgramme(BRUT, '2026-11-02');
ok(g(r) === 100 && r.versionActive.index === 0 && r.versionActive.n === 1 && r.versionActive.total === 5, 'le jour de la 1re date : version 1 active');
r = resoudreProgramme(BRUT, '2026-11-08');
ok(g(r) === 100, 'veille de la 2e date : version 1 encore active');
r = resoudreProgramme(BRUT, '2026-11-09');
ok(g(r) === 120 && r.versionActive.n === 2, 'le jour de la 2e date : version 2');
r = resoudreProgramme(BRUT, '2026-11-18');
ok(g(r) === 140 && r.versionActive.n === 3 && r.prochaine.debut === '2026-11-23', 'entre deux dates : version 3, prochaine etape le 23 nov.');
ok(r.kcal === 1400 && r.versionCle === 'v3@2026-11-16', 'les objectifs viennent de la version active ; repere de semis change avec la version');

// ---- 4. Dernier palier maintenu 4 semaines (et au-dela) ----
const cles = new Set();
for (const j of ['2026-11-30', '2026-12-07', '2026-12-14', '2026-12-21', '2026-12-27', '2027-03-01']) {
  const x = resoudreProgramme(BRUT, j); cles.add(x.versionCle);
  ok(g(x) === 180 && x.versionActive.n === 5 && !x.prochaine, 'dernier palier actif le ' + j + ' (aucune etape suivante)');
}
ok(cles.size === 1, 'le dernier palier ne change pas de repere pendant les semaines 5 a 8 (pas de resemis)');
// ---- 5. Version sans date ----
const SD = { ...BRUT, versions: [V('2026-11-02', 100), V(null, 999, 'sans date'), V('2026-11-16', 140), V('', 888)] };
ok(g(resoudreProgramme(SD, '2026-11-10')) === 100, 'une version sans date n\'est pas appliquee (entre deux dates)');
ok(g(resoudreProgramme(SD, '2027-01-01')) === 140 && resoudreProgramme(SD, '2027-01-01').versionActive.n === 3, 'une version sans date n\'est jamais appliquee, meme tout a la fin');
const TOUT_SD = { ...BRUT, versions: [V(null, 100), V(undefined, 120)] };
r = resoudreProgramme(TOUT_SD, '2026-11-10');
ok(r.enAttente && r.enAttente.debut === null && r.kcal === 0 && r.repas.length === 0, 'toutes sans date : rien n\'est applique, l\'appli attend une date');
ok(choisirVersion(TOUT_SD.versions, '2026-11-10') === null && prochaineVersion(TOUT_SD.versions, '2026-11-10') === null, 'toutes sans date : ni version choisie, ni prochaine');
ok(g(resoudreProgramme({ ...TOUT_SD, precedent: { kcal: 1800, prot: 1, carbs: 1, lip: 1, repas: repasDe('Repas 1', 77) } }, '2030-01-01')) === 77, 'toutes sans date mais ancien plan : on garde l\'ancien plan');
// dates dans le desordre / egales
const DESORDRE = { ...BRUT, versions: [V('2026-11-16', 140), V('2026-11-02', 100), V('2026-11-16', 150)] };
ok(g(resoudreProgramme(DESORDRE, '2026-11-17')) === 150, 'meme date : la version qui vient apres dans la liste l\'emporte');
ok(g(resoudreProgramme(DESORDRE, '2026-11-05')) === 100, 'versions dans le desordre : on compare par date, pas par rang');

// ---- 6. Changement de jour a minuit de Bruxelles ----
const MINUIT = { ...BRUT, versions: [V('2026-11-02', 100), V('2026-11-09', 120)] };
const a = (iso) => g(resoudreProgramme(MINUIT, dateBruxelles(new Date(iso))));
ok(a('2026-11-08T22:59:59Z') === 100, 'minuit belge (hiver) : 23h59 belge le 8 nov. = version 1');
ok(a('2026-11-08T23:00:00Z') === 120, 'minuit belge (hiver) : 00h00 belge le 9 nov. = version 2');
ok(a('2026-11-09T00:30:00Z') === 120, 'creneau 00h-02h belge : la version 2 est deja la, alors que la date UTC est encore le 8/9');
const ETE = { ...BRUT, versions: [V('2026-07-01', 100), V('2026-07-15', 120)] };
const e = (iso) => g(resoudreProgramme(ETE, dateBruxelles(new Date(iso))));
ok(e('2026-07-14T21:59:59Z') === 100 && e('2026-07-14T22:00:00Z') === 120, 'minuit belge (ete) : bascule a 22h00 UTC');

// ---- 7. Client a plan unique : strictement comme avant ----
const UNIQUE = { kcal: 2100, prot: 150, carbs: 220, lip: 70, livreLe: '2026-10-20T10:00:00.000Z', version: 1, repas: repasDe('Repas 1', 100), note: 'x' };
for (const j of ['2020-01-01', '2026-11-02', '2035-01-01']) ok(resoudreProgramme(UNIQUE, j) === UNIQUE, 'plan unique : meme objet rendu le ' + j + ' (rien de change)');
ok(resoudreProgramme(null, '2026-11-02') === null && resoudreProgramme(undefined, '2026-11-02') === null, 'pas de plan : rien');
ok(!aDesVersions(UNIQUE) && !('versionCle' in resoudreProgramme(UNIQUE, '2026-11-02')), 'plan unique : pas de repere de version (le marqueur de semis reste dateJour|livreLe)');
ok(!aDesVersions({ ...UNIQUE, versions: [] }) && resoudreProgramme({ ...UNIQUE, versions: [] }, '2026-11-02').kcal === 2100, 'versions vide = plan unique');
ok(resoudreProgramme(BRUT, '2026-11-18') === resoudreProgramme(BRUT, '2026-11-18'), 'meme plan + meme jour : meme resultat memorise (les effets ne rejouent pas)');

// ---- 8. Controle cote serveur (functions/plans-versions.js) ----
const bonne = { debut: '2026-11-02', libelle: ' S1 ', kcal: 3000, prot: 250, carbs: 300, lip: 90, repas: repasDe('Repas 1', 60) };
let n = PV.normaliserVersions([bonne, { ...bonne, debut: 'pas une date' }, { ...bonne, debut: '2026-02-31' }, { ...bonne, debut: undefined }]);
ok(n.ok && n.versions.length === 4 && n.versions[0].debut === '2026-11-02' && n.versions.slice(1).every((v) => v.debut === null), 'serveur : une date absente ou fausse devient null (jamais inventee)');
ok(n.versions[0].libelle === 'S1', 'serveur : libelle nettoye');
ok(PV.normaliserVersions([]).motif === 'versions' && PV.normaliserVersions('x').motif === 'versions' && PV.normaliserVersions(new Array(13).fill(bonne)).motif === 'versions', 'serveur : 0 ou plus de 12 versions refuse (motif versions)');
ok(PV.normaliserVersions([{ ...bonne, kcal: 99999 }]).motif === 'valeurs' && PV.normaliserVersions([{ ...bonne, kcal: 0 }]).motif === 'valeurs', 'serveur : calories hors bornes refusees (motif valeurs)');
ok(PV.normaliserVersions([{ ...bonne, repas: [] }]).motif === 'repas' && PV.normaliserVersions([{ ...bonne, repas: [{ nom: 'a', ings: [] }] }]).motif === 'repas', 'serveur : version sans aliment refusee (motif repas)');
ok(PV.premiereVersion(PV.normaliserVersions([{ ...bonne, debut: '2026-11-09', libelle: 'B' }, { ...bonne, debut: '2026-11-02', libelle: 'A' }]).versions).libelle === 'A', 'serveur : la plan « de tete » est la 1re version par date');
ok(PV.premiereVersion(PV.normaliserVersions([{ ...bonne, debut: null, libelle: 'X' }, { ...bonne, debut: null, libelle: 'Y' }]).versions).libelle === 'X', 'serveur : sans aucune date, la 1re de la liste');
const ex = PV.ancienPlan({ kcal: 1800, prot: 1, carbs: 1, lip: 1, repas: repasDe('R', 5), livreLe: 'L' });
ok(ex && ex.kcal === 1800 && ex.livreLe === 'L', 'serveur : l\'ancien plan unique est garde comme « precedent »');
ok(PV.ancienPlan({ kcal: 1, versions: [bonne], precedent: { kcal: 1700, repas: repasDe('R', 5), livreLe: 'P' } }).livreLe === 'P', 'serveur : un nouveau depot garde l\'ancien « precedent » (pas la version 1 d\'avant)');
ok(PV.ancienPlan(null) === null && PV.ancienPlan({ kcal: 0, repas: [] }) === null, 'serveur : pas d\'ancien plan -> null');

// ---- 9. Modele « rebond apres seche » ----
const M = modeleRebond();
ok(M.length === 8 && M.every((v) => v.debut === '' && v.repas.length === 6), 'modele : 8 versions, 6 repas chacune, AUCUNE date');
const tot = (v) => v.repas.reduce((t, rp) => { for (const i of rp.ings) { const m = macrosOf(i); t.k += m.kcal; t.p += m.prot; } return t; }, { k: 0, p: 0 });
ok(M.every((v) => v.repas.every((rp) => rp.ings.every((i) => DB[i.name]))), 'modele : tous les aliments existent dans la base de l\'app');
const T = M.map(tot);
ok(T.every((t, i) => i === 0 || t.k > T[i - 1].k), 'modele : les calories montent a chaque version (' + T.map((t) => Math.round(t.k)).join(' → ') + ')');
ok(Math.abs(T[0].k - 3230) < 120 && Math.abs(T[7].k - 4255) < 120, 'modele : ~3 230 kcal en S1 et ~4 255 en S8 (estimation du partenaire, a +-120 pres)');
ok(M.every((v) => v.repas.every((rp) => rp.ings.reduce((s, i) => s + DB[i.name].carbs * i.portion / 100, 0) >= 40)), 'modele : des glucides dans CHAQUE repas, a chaque version (au moins 40 g)');
ok(M.every((v) => v.repas.every((rp) => rp.ings.every((i) => !/Riz soufflé|Skyr|Riz thai|olive/i.test(i.name)))) && M.every((v) => v.repas.every((rp) => rp.ings.every((i) => i.name !== 'Riz basmati cru' || i.portion <= 150))), 'modele : riz basmati (jamais plus de 150 g par repas), creme de riz, pas de riz souffle ni de skyr ni d\'huile d\'olive');
ok(T.every((t) => t.p > 235 && t.p < 280), 'modele : proteines autour de 240-270 g, bien sous les 329 g du plan actuel (' + T.map((t) => Math.round(t.p)).join(' / ') + ' g)');
ok(M[1].repas[1].ings[1].portion === 110 && M[1].repas[2].ings[1].portion === 110 && M[5].repas[5].ings.find((i) => i.name === 'Noix').portion === 25 && M[7].repas[1].ings[1].portion === 150 && M[7].repas[4].ings[1].portion === 500 && M[5].repas[3].ings[0].portion === 110, 'modele : les ajouts cumules (riz 110 g en S2, noix 25 g et creme de riz 110 g en S6, pommes de terre 500 g et riz 150 g en S8)');
ok(M[0] !== modeleRebond()[0] && (M[0].repas[0].ings[0].portion = 1, modeleRebond()[0].repas[0].ings[0].portion === 30), 'modele : chaque appel rend une copie neuve');

// ---- 10. L'appli, a deux dates simulees ----
const dossierApercu = 'app-v2/apercu/construit';
if (!existsSync(dossierApercu + '/app.html')) { console.log('— apercu non construit : partie navigateur sautee'); process.exit(code); }
const { chromium } = exiger('../app-v2/node_modules/playwright');
const srv = spawn('python3', ['-m', 'http.server', '8093', '--directory', dossierApercu], { stdio: 'ignore', detached: true });
await new Promise((res) => setTimeout(res, 1500));
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const REBOND_EX = modeleRebond().map((v, i) => ({ ...v, debut: ajouterJours('2026-11-02', 7 * i), kcal: Math.round(tot(v).k), prot: Math.round(tot(v).p), carbs: 300, lip: 90 }));
const PROG = { kcal: REBOND_EX[0].kcal, prot: REBOND_EX[0].prot, carbs: 300, lip: 90, repas: REBOND_EX[0].repas, livreLe: '2026-10-26T09:00:00.000Z', version: 1, note: 'Exemple (banc de test)', versions: REBOND_EX };
const VIDE = [{ id: 1, nom: 'Repas 1', type: 'repas', fixe: true, ouvert: false, ings: [] }];
const SHOTS = process.env.SHOTS || '/workspace/shots';
async function ouvrir(quand, prog, repasBanc, nom, ecran) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-BE' });
  await ctx.addInitScript(([p, rb]) => {
    localStorage.clear();
    localStorage.setItem('belfit_v2_apercu_repas', JSON.stringify(rb));
    localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(p));
    localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify({ questionnaire: null, commande: null }));
  }, [prog, repasBanc]);
  const page = await ctx.newPage();
  page.on('pageerror', (er) => { console.log('ERREUR JS (' + nom + ')', er.message); code = 1; });
  await page.clock.setFixedTime(new Date(quand));
  await page.goto('http://localhost:8093/app.html' + (ecran || '')); await page.waitForTimeout(2200);
  // Particularite du banc : le journal de test se charge APRES le plan et remet
  // ses repas par defaut. On remet le journal du client et on rejoue le semis,
  // comme le fait l'appli quand le journal d'un vrai compte est pret.
  await page.evaluate((rb) => {
    localStorage.removeItem('belfit_v2_plan_seme_test');
    window.__banc.repas.value = rb;
    window.__banc.programme.value = JSON.parse(localStorage.getItem('belfit_v2_apercu_programme'));
  }, repasBanc);
  await page.waitForTimeout(700);
  return { page, ctx };
}
const lire = (p) => p.evaluate(() => window.__banc.repas.value.map((x) => ({ nom: x.nom, prevu: !!x.prevu, saute: !!x.saute, remplace: !!x.remplace, g: x.ings.map((i) => i.name + ':' + i.portion).join(',') })));
const photo = async (o, nom, texte) => {
  await o.page.evaluate((t) => { const b = document.createElement('div'); b.id = 'banc-ex'; b.textContent = t; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c00;color:#fff;font:700 11px sans-serif;text-align:center;padding:3px'; document.body.appendChild(b); }, texte);
  await o.page.screenshot({ path: SHOTS + '/' + nom + '-haut.png' });
  await o.page.evaluate(() => { const e = [...document.querySelectorAll('*')].filter((x) => /^tes repas$/i.test((x.textContent || '').trim())).pop(); if (e) { e.scrollIntoView(); window.scrollBy(0, -40); } });
  await o.page.waitForTimeout(300);
  await o.page.screenshot({ path: SHOTS + '/' + nom + '.png' });
  await o.page.evaluate(() => document.getElementById('banc-ex')?.remove());
};
// Semaine 1 : lundi 3 nov. 2026, 10h belge
let o = await ouvrir('2026-11-03T09:00:00Z', PROG, VIDE, 'sem1');
let rp = await lire(o.page);
ok(rp.length === 6 && rp[0].g.includes('Whey:30') && rp[1].g.includes('Riz basmati cru:90'), 'appli, 3 nov. (semaine 1) : 6 repas « prevus » de la version 1 (riz 90 g)');
ok(rp.every((x) => x.prevu), 'appli, semaine 1 : tout est « prevu »');
const kc1 = await o.page.evaluate(() => window.__banc.programme.value.versionActive.n + '/' + window.__banc.programme.value.kcal);
ok(kc1.startsWith('1/'), 'appli, semaine 1 : version 1 active (kcal ' + kc1.split('/')[1] + ')');
await photo(o, 'plans-appli-semaine1-alimentation', 'EXEMPLE · date simulée : lun. 3 nov. 2026 · données de test');
await o.ctx.close();
// Semaine 5 : lundi 30 nov. 2026
o = await ouvrir('2026-11-30T09:00:00Z', PROG, VIDE, 'sem5');
rp = await lire(o.page);
ok(rp.length === 6 && rp[1].g.includes('Riz basmati cru:130') && rp[3].g.includes('Crème de riz:90') && rp[5].g.includes('Noix:15'), 'appli, 30 nov. (semaine 5) : repas de la version 5 (riz 130 g, creme de riz 90 g, noix 15 g)');
await photo(o, 'plans-appli-semaine5-alimentation', 'EXEMPLE · date simulée : lun. 30 nov. 2026 · données de test');
await o.ctx.close();
// Avant la 1re date, sans ancien plan
o = await ouvrir('2026-10-30T09:00:00Z', PROG, VIDE, 'avant');
rp = await lire(o.page);
ok(rp.length === 1 && rp[0].g === '', 'appli, avant la 1re date, sans ancien plan : aucun repas pose');
await o.ctx.close();
// Sans date : rien n'est applique
o = await ouvrir('2026-12-05T09:00:00Z', { ...PROG, versions: PROG.versions.map((v) => ({ ...v, debut: null })) }, VIDE, 'sansdate');
rp = await lire(o.page);
ok(rp.length === 1 && rp[0].g === '', 'appli, versions sans date : aucun repas pose');
await o.ctx.close();
// Rien n'ecrase la saisie du client : Mange / Saute / Mange autre chose, puis changement de version
o = await ouvrir('2026-11-03T09:00:00Z', PROG, VIDE, 'saisie');
await o.page.evaluate(() => {
  const b = window.__banc;
  b.repas.value = b.repas.value.map((x, i) => i === 1 ? { ...x, prevu: false } : i === 0 ? { ...x, prevu: false, saute: true } : i === 3 ? { ...x, remplace: true, ings: [{ id: 5, name: 'Pomme', portion: 150 }], ingsPlan: x.ings } : x);
});
await o.page.evaluate(() => { window.__banc.programme.value = JSON.parse(localStorage.getItem('belfit_v2_apercu_programme')); });   // plan renvoye a l'identique : rien ne bouge
await o.page.waitForTimeout(500);
rp = await lire(o.page);
ok(!rp[1].prevu && rp[0].saute && rp[3].remplace && rp[3].g === 'Pomme:150', 'appli : « Mange », « Saute », « Mange autre chose » conserves');
// la version change (on avance l'horloge de la page jusqu'au 10 nov., 10h belge)
await o.page.clock.setFixedTime(new Date('2026-11-10T09:00:00Z'));
await o.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await o.page.waitForTimeout(800);
rp = await lire(o.page);
ok(!rp[1].prevu && rp[1].g.includes('Riz basmati cru:90'), 'changement de version : un repas deja mange garde ses quantites d\'avant (riz 90 g, pas 110)');
ok(rp[0].saute, 'changement de version : un repas saute reste saute');
ok(rp[3].remplace && rp[3].g === 'Pomme:150', 'changement de version : « mange autre chose » conserve');
ok(rp[2].prevu && rp[2].g.includes('Riz basmati cru:110'), 'changement de version : un repas encore « prevu » passe aux quantites de la version 2 (riz 110 g)');
await o.ctx.close();
await nav.close(); try { process.kill(-srv.pid); } catch {} srv.kill();
process.exit(code);
