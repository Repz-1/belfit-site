// 01/11 v653 Raci : plan IA a 1505 kcal (cible ignoree) + brouillon perdu en revenant.
// A) logique serveur (extraite de functions/index.js) sur la base de l'app.
// B) page coach, serveur simule. Port 8141. SHOTS=dossier pour les captures.
import { readFileSync } from 'fs';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { DB, NOMS_ALIMENTS } from '../app-v2/src/data/aliments.js';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
let ko = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) ko++; };

// ---- A) serveur
const src = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8');
const fn = (n) => { const i = src.indexOf('function ' + n + '('); let j = src.indexOf('\n}\n', i); return src.slice(i, j + 2); };
const S = new Function(['besoinsDe', 'tableAliments', 'totauxPlan', 'ajusterALaCible'].map(fn).join('\n') + '\nreturn {besoinsDe, tableAliments, totauxPlan, ajusterALaCible};')();
const r1 = (x) => Math.round((+x || 0) * 10) / 10;
const LISTE = NOMS_ALIMENTS.map((n) => { const d = DB[n]; return [n, r1(d.kcal), r1(d.prot), r1(d.carbs), r1(d.lip)].join(';') + (d.unit ? ';pièce=' + d.unit + 'g' : ''); });
const table = S.tableAliments(LISTE);
const nomDe = (re) => NOMS_ALIMENTS.find((n) => re.test(n) && !DB[n].unit);
const TOM = nomDe(/^Tomate/i), CONC = nomDe(/^Concombre/i), RIZ = nomDe(/^Riz.*cuit/i), POUL = nomDe(/^Poulet.*cuit|^Blanc de poulet/i), AVO = nomDe(/^Flocons d.avoine|^Avoine/i);
ok(TOM && CONC && RIZ && POUL && AVO, 'aliments de la base trouves : ' + [TOM, CONC, RIZ, POUL, AVO].join(', '));
ok(Math.round(table.get(TOM).kcal * 1.5) === Math.round(DB[TOM].kcal * 1.5), 'kcal tomate = base de l\'app (' + Math.round(DB[TOM].kcal * 1.5) + ' kcal / 150 g, comme sur la capture)');
const REP = { poids: { valeur: '95' }, taille: { valeur: '188' }, age: { valeur: '28' }, sexe: { valeur: 'Homme' }, activite: { valeur: 'Métier physique' }, seances: { valeur: '5' }, objectif: { valeur: 'Prendre du muscle' } };
const cible = S.besoinsDe(REP);
ok(cible && cible.kcal > 3000, 'cible questionnaire (95 kg, 188 cm, 28 ans, metier physique, 5 seances, prise de muscle) : ' + (cible && cible.kcal) + ' kcal');
const bas = [{ nom: 'Petit-déjeuner', ings: [{ name: AVO, portion: 60 }] }, { nom: 'Déjeuner', ings: [{ name: RIZ, portion: 150 }, { name: POUL, portion: 120 }, { name: TOM, portion: 150 }] },
  { nom: 'Dîner', ings: [{ name: RIZ, portion: 150 }, { name: POUL, portion: 120 }, { name: CONC, portion: 100 }] }];
const k0 = S.totauxPlan(bas, table).kcal;
const aj = S.ajusterALaCible(bas, table, cible.kcal);
const k1 = S.totauxPlan(aj, table).kcal;
ok(k0 < cible.kcal * 0.7, 'plan IA trop bas simule : ' + Math.round(k0) + ' kcal');
ok(Math.abs(k1 - cible.kcal) / cible.kcal <= 0.05, 'apres ajustement : ' + Math.round(k1) + ' kcal (ecart ' + ((k1 - cible.kcal) / cible.kcal * 100).toFixed(1) + ' %)');
ok(aj[1].ings[2].portion === 150 && aj[2].ings[2].portion === 100, 'legumes pas gonfles (tomate 150 g, concombre 100 g)');
const haut = S.ajusterALaCible(aj.map((r) => ({ ...r, ings: r.ings.map((i) => ({ ...i, portion: i.portion * 2 })) })), table, 2000);
ok(Math.abs(S.totauxPlan(haut, table).kcal - 2000) / 2000 <= 0.05, 'plan trop haut ramene a 2000 kcal : ' + Math.round(S.totauxPlan(haut, table).kcal));
ok(/kcalIA/.test(src) && /ecart/.test(src) && /source: "coach"/.test(src), 'serveur : totaux, ecart, kcalIA et cible imposee par le coach renvoyes');

// ---- B) page
const PORT = 8141, SHOTS = process.env.SHOTS || '';
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', '.'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise((r) => setTimeout(r, 1200));
const il = (j) => new Date(Date.now() - j * 864e5).toISOString();
const D = [{ uid: 'u1', prenom: 'Client', nom: 'Test', email: 'client@example.test', objectif: 'Prendre du muscle', envoyeLe: il(0.1), payeLe: il(0.2), aTraiter: true, nouveau: false, programmesHistorique: [], reponses: REP },
  { uid: 'u2', prenom: 'Autre', nom: 'Client', email: 'autre@example.test', envoyeLe: il(0.05), aTraiter: true, programmesHistorique: [], reponses: {} }];
let envoye = null;
const nav = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-BE', timezoneId: 'Europe/Brussels' });
await ctx.route(/cloudfunctions\.net/, async (r) => {
  if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
  const c = JSON.parse(r.request().postData() || '{}'); let body = { ok: true };
  if (c.action === 'dossiers') body = { ok: true, dossiers: D, complet: true, limite: 300 };
  if (c.action === 'proposer') {
    await new Promise((x) => setTimeout(x, 500));
    const t = S.tableAliments(c.aliments); const a = S.ajusterALaCible(bas, t, cible.kcal); const T = S.totauxPlan(a, t);
    body = { ok: true, repas: a, cible, totaux: T, kcalIA: Math.round(S.totauxPlan(bas, t).kcal), ecart: Math.round((T.kcal - cible.kcal) / cible.kcal * 1000) / 10, remarque: 'Test.' };
  }
  if (c.action === 'deposer') { envoye = c; body = { ok: true, mailEnvoye: true }; }
  return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
});
await ctx.addInitScript(() => { if (!sessionStorage.getItem('init')) { localStorage.clear(); sessionStorage.setItem('init', '1'); } localStorage.setItem('belfit_espace_coach', 'TEST'); });
const p = await ctx.newPage(); p.on('dialog', (d) => d.accept()); p.on('pageerror', (e) => ok(false, 'erreur JS ' + e.message));
await p.goto(`http://localhost:${PORT}/coach.html`); await p.waitForTimeout(2500);
const fiche = (i) => p.locator('.dos').nth(i);
await fiche(0).tap(); await p.waitForTimeout(300);
await p.locator('.ia-go').first().tap(); await p.waitForTimeout(1500);
const txtCible = await p.locator('#cible').innerText();
ok(/Cible du client : \d/.test(txtCible) && /écart/.test(txtCible), 'cible et ecart affiches : ' + txtCible.replace(/\n/g, ' / '));
const ec = parseFloat((/écart ([+-]?[\d,]+) %/.exec(txtCible) || [])[1]?.replace(',', '.'));
ok(Math.abs(ec) <= 5, 'plan IA a la cible a 5 % (' + ec + ' %)');
ok(/portions remises à la cible/.test(await p.locator('#iaEtat').innerText()), 'message : l\'IA avait prevu moins, portions remises a la cible');
if (SHOTS) { await p.locator('#titreRepas').scrollIntoViewIfNeeded(); await p.screenshot({ path: SHOTS + '/1-plan-ia-cible-ecart.png' }); await p.locator('#total').scrollIntoViewIfNeeded(); await p.screenshot({ path: SHOTS + '/2-total-plan-ia.png' }); }
// Portion modifiee a la main -> ecart rouge + bouton « Mettre a la cible »
const q = p.locator('.ing-qte input').first(); await q.fill('600'); await p.waitForTimeout(200);
ok(await p.locator('#btnEchelle').count() === 1, 'ecart > 5 % : bouton « Mettre à la cible »');
await p.locator('#btnEchelle').click(); await p.waitForTimeout(200);
const ec2 = parseFloat((/écart ([+-]?[\d,]+) %/.exec(await p.locator('#cible').innerText()) || [])[1]?.replace(',', '.'));
ok(Math.abs(ec2) <= 5, '« Mettre à la cible » : ecart ' + ec2 + ' %');
const kAvant = await p.locator('#total .total-k').innerText();
// Retour en arriere sans envoyer : rechargement de la page, autre client, puis retour
await p.reload(); await p.waitForTimeout(2500);
await fiche(1).tap(); await p.waitForTimeout(200); await p.locator('.detail .second').first().tap(); await p.waitForTimeout(300);
ok((await p.locator('#total .total-k').innerText()).startsWith('0'), 'autre client : plan vide (v652 conserve)');
ok(/Pas de cible/.test(await p.locator('#cible').innerText()), 'autre client sans poids/taille/age : « Pas de cible » affiche');
await fiche(1).tap(); await p.waitForTimeout(200);
await fiche(0).tap(); await p.waitForTimeout(300);
ok(/Brouillon non envoyé/.test(await p.locator('.detail').first().innerText()), 'fiche du client : « Brouillon non envoyé » visible');
await p.locator('.detail .second').first().tap(); await p.waitForTimeout(400);
ok(await p.locator('#total .total-k').innerText() === kAvant, 'brouillon repris apres rechargement : ' + kAvant.replace(/\n/g, ' '));
ok(await p.locator('#brouillonBarre').isVisible(), 'barre « Brouillon repris » + « Jeter le brouillon »');
if (SHOTS) { await p.locator('#choisi').scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -80)); await p.screenshot({ path: SHOTS + '/3-brouillon-repris.png' }); }
// Envoi -> brouillon efface
await p.locator('#btnEnvoi').click(); await p.waitForTimeout(600);
ok(envoye && envoye.repas && envoye.repas.length === 3, 'envoi du brouillon : 3 repas deposes');
ok(await p.evaluate(() => !localStorage.getItem('belfit_coach_brouillon_u1')), 'apres envoi : brouillon supprime');
// Jeter
await p.locator('.ing-qte input').first().fill('100'); await p.waitForTimeout(200);
ok(await p.evaluate(() => !!localStorage.getItem('belfit_coach_brouillon_u1')), 'nouvelle saisie : brouillon re-enregistre');
await p.locator('#btnJeterBrouillon').click(); await p.waitForTimeout(300);
ok(await p.evaluate(() => !localStorage.getItem('belfit_coach_brouillon_u1')) && (await p.locator('#total .total-k').innerText()).startsWith('0'), '« Jeter le brouillon » : plan vide, brouillon supprime');
// sw.js : HTML revalide
ok(/fetch\(req, \{ cache: 'no-cache' \}\)/.test(readFileSync(new URL('../sw.js', import.meta.url), 'utf8')), 'sw.js : HTML en no-cache (plus de vieux coach.html 10 min)');
await nav.close(); process.kill(-srv.pid);
console.log(ko ? ko + ' echec(s)' : 'OK'); process.exit(ko ? 1 : 0);
