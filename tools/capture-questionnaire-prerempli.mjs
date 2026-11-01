// 01/11 : client qui revient (nouveau paiement apres un ancien questionnaire) : questionnaire pre-rempli. Donnees de test.
import { spawn } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const OUT = '/workspace/belfit-site/captures-prerempli/';
const srv = spawn('python3', ['-m', 'http.server', '8096', '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
await new Promise(r => setTimeout(r, 1200));
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const j = n => new Date(Date.now() - n * 864e5).toISOString();
const R = (id, section, question, v, texte) => [id, { ...v, texte, section, question }];
const reponses = Object.fromEntries([
  R('prenom', 'Toi', 'Prénom', { valeur: 'Raci' }, 'Raci'), R('age', 'Toi', 'Âge', { valeur: '30' }, '30'), R('sexe', 'Toi', 'Sexe', { valeur: 'Homme' }, 'Homme'),
  R('objectif', 'Ton objectif', 'Ton objectif principal', { valeur: 'Prendre du muscle' }, 'Prendre du muscle'),
  R('echeance', 'Ton objectif', 'Tu as une échéance ?', { valeur: 'Pas de date' }, 'Pas de date'),
  R('poids', 'Tes mesures', 'Poids actuel', { valeur: '78' }, '78'), R('taille', 'Tes mesures', 'Taille', { valeur: '180' }, '180'),
  R('activite', 'Tes mesures', "Niveau d'activité", { valeur: 'Debout ou marche au travail' }, 'Debout ou marche au travail'),
  R('repasVoulus', 'Ton rythme', 'Repas', { valeur: 4 }, '4'), R('reveil', 'Ton rythme', 'Réveil', { valeur: '6h30' }, '6h30'),
]);
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-BE' });
await ctx.route(/cloudfunctions\.net/, r => r.request().method() === 'OPTIONS' ? r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } })
  : r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, autorise: true, mode: 'live' }) }));
const p = await ctx.newPage();
await p.goto('http://localhost:8096/app.html');
await p.evaluate(([d, pl]) => { localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify(d)); localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(pl)); },
  [{ questionnaire: { type: 'plan', envoyeLe: j(49), reponses }, commande: { payeLe: j(0), type: 'plan' } },
   { kcal: 2600, prot: 170, carbs: 300, lip: 75, livreLe: j(47), repas: [{ nom: 'Déjeuner', ings: [{ name: 'Riz', portion: 150 }] }] }]);
await p.goto('http://localhost:8096/app.html'); await p.waitForTimeout(1800);
await p.locator('.bn-item').last().tap(); await p.waitForTimeout(900);
await p.evaluate(() => { const els = [...document.querySelectorAll('.bandeau-coach-txt')]; const e = els.find(x => { const r = x.getBoundingClientRect(); return r.top >= 0 && r.left >= 0 && r.left < innerWidth; }) || els[0]; (e.closest('button,a,[role=button]') || e).click(); }); await p.waitForTimeout(900);
await p.screenshot({ path: OUT + 'recap-prerempli.png' });
await p.evaluate(() => document.querySelector('.pan-scroll:has(.pg-qc), .pan-scroll')?.scrollTo(0, 650)); await p.waitForTimeout(300);
await p.screenshot({ path: OUT + 'recap-prerempli-milieu.png' });
await nav.close(); try { process.kill(-srv.pid); } catch (e) {}
