// Accueil : simple mot de bienvenue (27/10, Raci) — « Bonjour {prenom} » / « Bonsoir {prenom} » / « Bienvenue ».
// Aucune donnee dans la carte. Frequence : une fois par periode (matin 5h-12h, soir 18h-23h, heure de Bruxelles) et par jour.
// Horloge simulee. DONNEES DE TEST uniquement.
// Prerequis : apercu construit (npx vite build --config apercu.config.js dans app-v2).
import { spawn } from 'child_process';
import { createRequire } from 'module';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const { momentBruxelles, periodeAccueil } = await import('../app-v2/src/services/accueil-cle.js');
const { composerAccueil } = await import('../app-v2/src/services/accueil-message.js');
const PORT = 8094;
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const SHOTS = process.env.SHOTS || '/workspace/shots';

// ---- 1. Fonctions pures : fenetres et messages ------------------------------
const h = (iso) => periodeAccueil(momentBruxelles(new Date(iso)).heure);
ok(h('2026-10-25T05:00:00+01:00') === 'matin' && h('2026-10-25T11:59:00+01:00') === 'matin', 'fenetre matin 5h00–11h59');
ok(h('2026-10-25T04:59:00+01:00') === null && h('2026-10-25T12:00:00+01:00') === null && h('2026-10-25T14:00:00+01:00') === null, 'hors fenetre : 4h59, 12h, 14h → rien');
ok(h('2026-10-25T18:00:00+01:00') === 'soir' && h('2026-10-25T22:59:00+01:00') === 'soir', 'fenetre soir 18h00–22h59');
ok(h('2026-10-25T23:00:00+01:00') === null && h('2026-10-25T17:59:00+01:00') === null, 'hors fenetre : 17h59, 23h → rien');
ok(h('2026-07-10T06:00:00+02:00') === 'matin' && momentBruxelles(new Date('2026-07-10T23:30:00Z')).jour === '2026-07-11', 'Bruxelles (ete, UTC+2) : 23h30 UTC = lendemain a Bruxelles');
ok(momentBruxelles(new Date('2026-10-25T23:30:00+01:00')).jour === '2026-10-25' && momentBruxelles(new Date('2026-10-25T23:30:00+01:00')).heure === 23, 'minuit non confondu avec 24h');
ok(composerAccueil({ periode: 'matin', prenom: 'Raci' }).titre === 'Bonjour Raci', 'matin + prenom : « Bonjour Raci »');
ok(composerAccueil({ periode: 'soir', prenom: 'Raci' }).titre === 'Bonsoir Raci', 'soir + prenom : « Bonsoir Raci »');
ok(composerAccueil({ periode: 'matin', prenom: '' }).titre === 'Bienvenue' && composerAccueil({ periode: 'soir' }).titre === 'Bienvenue' && composerAccueil({ periode: 'soir', prenom: '   ' }).titre === 'Bienvenue', 'sans prenom : « Bienvenue »');
ok(composerAccueil({ periode: 'matin', prenom: 'Raci' }, 'nl').titre === 'Goedemorgen Raci' && composerAccueil({ periode: 'matin', prenom: 'Raci' }, 'en').titre === 'Good morning Raci' && composerAccueil({ periode: 'soir' }, 'en').titre === 'Welcome', 'langues EN / NL');
{ // la carte ne porte QUE le titre : aucune donnee, aucun conseil, aucun chiffre
  const gros = composerAccueil({ periode: 'matin', prenom: 'Raci', kcalObjectif: 2000, prochainRepas: { nom: 'Petit déjeuner', kcal: 386 }, seancesHier: 2, repasValides: 3, kcalJour: 1850, eauL: 2, seanceJour: { titre: 'Pecs', faite: false } });
  ok(Object.keys(gros).join() === 'titre' && !/\d/.test(gros.titre) && gros.titre === 'Bonjour Raci', 'aucune donnee n\'entre dans le message (meme si on lui en donne)');
}

// ---- 2. Navigateur : comportement reel avec horloge simulee ------------------
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
await new Promise(r => setTimeout(r, 1500));
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const PLAN = { kcal: 2000, prot: 150, carbs: 220, lip: 60, livreLe: '2026-10-20T10:00:00.000Z', repas: [
  { nom: 'Petit déjeuner', ings: [{ name: 'Avoine', portion: 70 }, { name: 'Whey', portion: 30 }] },
  { nom: 'Déjeuner', ings: [{ name: 'Riz cuit', portion: 125 }, { name: 'Poulet cuit', portion: 95 }] },
  { nom: 'Dîner', ings: [{ name: 'Riz cuit', portion: 100 }, { name: 'Poulet cuit', portion: 100 }] },
]};
const VIDE = [
  { id: 1, nom: 'Petit déjeuner', type: 'repas', cle: 'pdej', fixe: true, ings: [], ouvert: false },
  { id: 2, nom: 'Déjeuner', type: 'repas', cle: 'dej', fixe: true, ings: [], ouvert: false },
  { id: 3, nom: 'Dîner', type: 'repas', cle: 'diner', fixe: true, ings: [], ouvert: false },
  { id: 4, nom: 'Collations', type: 'collation', cle: 'snack', fixe: true, ings: [], ouvert: false },
];
// opts : { plan, vide, quand, tz, query, eau }
async function ouvrir(opts) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE', timezoneId: opts.tz || 'Europe/Brussels' });
  await ctx.addInitScript(([plan, vide]) => {
    if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', '1');
      if (plan) localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(plan));
      if (vide) localStorage.setItem('belfit_v2_apercu_repas', JSON.stringify(vide)); }
  }, [opts.plan ? PLAN : null, opts.vide ? VIDE : null]);
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('ERREUR JS', e.message); code = 1; });
  await page.clock.install({ time: new Date(opts.quand) });
  const url = 'http://localhost:' + PORT + '/app.html?accueil' + (opts.query || '');
  const charger = async () => { await page.goto(url); await page.waitForTimeout(1200); if (opts.eau) await page.evaluate((e) => { const r = window.__banc.repas.value; window.__banc.eau.value = e; window.__banc.repas.value = r; }, opts.eau); await page.waitForTimeout(100); };
  return { ctx, page, charger, url };
}
const carte = (page) => page.locator('.acc-voile');
// Presence : on attend jusqu'a 5 s qu'elle apparaisse (le splash/plan prennent ~2 s).
const visible = async (page) => { try { await page.waitForSelector('.acc-voile', { timeout: 5000 }); return true; } catch (e) { return false; } };
// Absence : on observe 3,5 s sans qu'elle ne apparaisse.
const absente = async (page) => { try { await page.waitForSelector('.acc-voile', { timeout: 3500 }); return false; } catch (e) { return true; } };

// (a) Matin 08:30 : 1re ouverture oui, texte vrai, 2e ouverture non
let t = await ouvrir({ quand: '2026-10-25T08:30:00+01:00', plan: true, vide: true });
await t.charger();
ok(await visible(t.page), 'matin 08:30, 1re ouverture : la carte s\'affiche');
const txt = (await carte(t.page).innerText({timeout:3000})).replace(/\s+/g, ' ');
ok(txt === 'Bonjour Raci', 'matin : texte exactement « ' + txt + ' » (rien d\'autre)');
const fermee = await t.page.waitForSelector('.acc-voile', { state: 'detached', timeout: 6000 }).then(() => true, () => false);
ok(fermee, 'auto-fermeture apres ~4 s (disparition douce)');
await t.charger();
ok(await absente(t.page), 'matin, 2e ouverture le meme jour : rien');
// (b) meme appareil, soir 19:00 : cle separee → s'affiche
await t.page.clock.setSystemTime(new Date('2026-10-25T19:00:00+01:00'));
await t.charger();
ok(await visible(t.page), 'soir 19:00 (apres le matin deja vu) : la carte s\'affiche');
const txtS = (await carte(t.page).innerText({timeout:3000})).replace(/\s+/g, ' ');
ok(txtS === 'Bonsoir Raci', 'soir : texte exactement « ' + txtS + ' »');
await t.charger();
ok(await absente(t.page), 'soir, 2e ouverture : rien');
// lendemain matin : de nouveau
await t.page.clock.setSystemTime(new Date('2026-10-26T07:15:00+01:00'));
await t.charger();
ok(await visible(t.page), 'lendemain matin : la carte revient');
await t.ctx.close();

// (c) tap : ferme tout de suite
t = await ouvrir({ quand: '2026-10-25T09:00:00+01:00' });
await t.charger();
ok(await visible(t.page), 'tap : carte ouverte');
await t.page.tap('.acc-voile'); await t.page.waitForTimeout(100);
ok(!(await t.page.locator('.acc-voile').count()), 'un tap ferme la carte');
await t.ctx.close();

// (d) soir avec des repas valides et de l'eau : la carte reste « Bonsoir Raci », sans aucune donnee
t = await ouvrir({ quand: '2026-10-25T20:00:00+01:00', eau: 1.5 });
await t.charger(); await visible(t.page);
const txtD = (await carte(t.page).innerText({ timeout: 3000 }).catch(() => '')).replace(/\s+/g, ' ');
ok(txtD === 'Bonsoir Raci' && !/\d|kcal|repas|eau/i.test(txtD), 'soir avec donnees dans l\'app : « ' + txtD + ' » (aucune donnee affichee)');
ok(await t.page.locator('.acc-ligne').count() === 0, 'aucune ligne de detail dans la carte');
await t.ctx.close();

// (e) hors fenetres : 14:00, 03:00, 12:00, 23:00 → rien
for (const q of ['2026-10-25T14:00:00+01:00', '2026-10-25T03:00:00+01:00', '2026-10-25T12:00:00+01:00', '2026-10-25T23:00:00+01:00']) {
  t = await ouvrir({ quand: q }); await t.charger();
  ok(await absente(t.page), 'hors fenetre ' + q.slice(11, 16) + ' : rien');
  await t.ctx.close();
}
// (f) appareil a New York mais il est 08:30 a Bruxelles → matin (Intl Bruxelles, pas l'heure de l'appareil)
t = await ouvrir({ quand: '2026-10-25T08:30:00+01:00', tz: 'America/New_York', plan: true, vide: true }); await t.charger();
ok(await visible(t.page), 'appareil en fuseau New York, 08:30 a Bruxelles : la carte s\'affiche');
await t.ctx.close();
// (g) prenom absent : « Bienvenue », meme sans aucune donnee
t = await ouvrir({ quand: '2026-10-25T08:30:00+01:00', plan: true, vide: true, query: '&sansprenom' }); await t.charger();
const txtG = (await visible(t.page)) ? (await carte(t.page).innerText({timeout:3000})).replace(/\s+/g, ' ') : '';
ok(txtG === 'Bienvenue', 'prenom absent (matin, plan present) : « ' + txtG + ' »');
await t.ctx.close();
t = await ouvrir({ quand: '2026-10-25T20:00:00+01:00', vide: true, query: '&sansprenom' }); await t.charger();
const txtG2 = (await visible(t.page)) ? (await carte(t.page).innerText({timeout:3000})).replace(/\s+/g, ' ') : '';
ok(txtG2 === 'Bienvenue', 'prenom absent (soir, aucune donnee) : « ' + txtG2 + ' »');
await t.page.waitForSelector('.acc-voile', { state: 'detached', timeout: 6000 }).catch(() => {});
await t.charger();
ok(await absente(t.page), 'prenom absent : une seule fois par periode et par jour (2e ouverture : rien)');
await t.ctx.close();
// (h) donnees absentes avec prenom : toujours « Bonsoir Raci », sans ligne
t = await ouvrir({ quand: '2026-10-25T20:00:00+01:00', vide: true }); await t.charger();
const txtH = (await visible(t.page)) ? (await carte(t.page).innerText({timeout:3000})).replace(/\s+/g, ' ') : '';
ok(txtH === 'Bonsoir Raci', 'donnees absentes, prenom present : « ' + txtH + ' »');
await t.ctx.close();
// (i) prefers-reduced-motion : simple fondu, ni flou, ni zoom, ni balayage
{
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', locale: 'fr-BE', timezoneId: 'Europe/Brussels' });
  const page = await ctx.newPage(); await page.clock.install({ time: new Date('2026-10-25T08:30:00+01:00') });
  await page.goto('http://localhost:' + PORT + '/app.html?accueil'); await page.waitForSelector('.acc-voile', { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => { const v = document.querySelector('.acc-voile'), t = document.querySelector('.acc-titre'); if (!v) return null; const c = getComputedStyle(t); return { an: c.animationName, fl: c.filter, tf: c.transform, tr: getComputedStyle(v).transitionDuration, anims: t.getAnimations().length }; });
  ok(r && r.an === 'none' && r.fl === 'none' && (r.tf === 'none' || r.tf === 'matrix(1, 0, 0, 1, 0, 0)') && r.anims === 0, 'reduced-motion : aucune animation de flou/zoom/balayage ' + JSON.stringify(r));
  ok(r && parseFloat(r.tr) > 0, 'reduced-motion : fondu simple conserve (transition ' + (r && r.tr) + ')');
  await ctx.close();
}
// (j) mouvement normal : l'animation « projection » existe bel et bien (flou qui se precise + balayage)
{
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-BE', timezoneId: 'Europe/Brussels' });
  const page = await ctx.newPage(); await page.clock.install({ time: new Date('2026-10-25T08:30:00+01:00') });
  await page.goto('http://localhost:' + PORT + '/app.html?accueil'); await page.waitForSelector('.acc-voile', { timeout: 6000 }).catch(() => {});
  const noms = await page.evaluate(() => [...document.querySelector('.acc-titre').getAnimations()].map(a => a.animationName).sort().join(','));
  ok(noms === 'acc-balayage,acc-projette', 'animation normale : projection + balayage (' + noms + ')');
  await ctx.close();
}
await nav.close();
try { process.kill(-srv.pid); } catch (e) {}
console.log(code ? 'ECHEC' : 'OK'); process.exit(code);
