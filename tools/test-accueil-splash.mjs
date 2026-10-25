// Accueil du matin / du soir (25/10). Horloge simulee, heure de Bruxelles. DONNEES DE TEST uniquement.
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
const base = { periode: 'matin', prenom: 'Raci' };
let m = composerAccueil({ ...base, kcalObjectif: 2000, prochainRepas: { nom: 'Petit déjeuner', kcal: 386 }, seancesHier: 1 });
ok(m.titre === 'Bonjour Raci' && m.lignes.length === 2 && /Petit déjeuner prévu : 386 kcal/.test(m.lignes[0]), 'matin : prenom + repas prevu reel, 2 lignes max');
ok(!/hier/.test(composerAccueil({ ...base, seancesHier: 0, kcalObjectif: 2000 }).lignes.join(' ')), 'matin : pas de « hier » si aucune seance hier');
m = composerAccueil({ ...base, periode: 'soir', repasValides: 3, kcalJour: 1850, kcalObjectif: 2000, eauL: 2 });
ok(m.titre === 'Bonsoir Raci' && /3 repas validés/.test(m.lignes[0]) && /1\s850 kcal sur 2\s000/.test(m.lignes[1]), 'soir : repas valides + kcal sur objectif');
ok(/1,5 L d.eau/.test(composerAccueil({ ...base, periode: 'soir', eauL: 1.5 }).lignes[0]), 'soir : eau reelle affichee (1,5 L)');
m = composerAccueil({ ...base, periode: 'soir' });
ok(m.titre === 'Bonsoir Raci' && m.lignes.length === 1, 'donnees absentes + prenom : simple « Bonsoir Raci » + un mot');
ok(composerAccueil({ periode: 'soir', prenom: '' }) === null && composerAccueil({ periode: 'matin' }) === null, 'ni prenom ni donnee : rien (pas d\'ecran vide)');
m = composerAccueil({ periode: 'matin', prenom: '', kcalObjectif: 2000 });
ok(m.titre === 'Bonjour' && m.lignes.length === 1, 'prenom absent mais donnee : « Bonjour » + donnee');
ok(composerAccueil({ ...base, kcalObjectif: 2000 }, 'nl').titre === 'Goedemorgen Raci' && composerAccueil({ ...base, kcalObjectif: 2000 }, 'en').titre === 'Good morning Raci', 'langues EN / NL');
const tous = JSON.stringify(m) + JSON.stringify(composerAccueil({ ...base, periode: 'soir', repasValides: 0, eauL: 0 }));
ok(!/pas encore|oubli|manqu|retard|dommage|toujours pas/i.test(tous), 'aucun ton culpabilisant dans les messages produits');

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
ok(/Bonjour Raci/.test(txt) && /Petit déjeuner prévu : \d+ kcal/.test(txt), 'matin : « ' + txt + ' »');
await t.page.waitForTimeout(400); await t.page.screenshot({ path: SHOTS + '/accueil-matin-390.png' });
const fermee = await t.page.waitForSelector('.acc-voile', { state: 'detached', timeout: 4000 }).then(() => true, () => false);
ok(fermee, 'auto-fermeture apres ~2 s');
await t.charger();
ok(await absente(t.page), 'matin, 2e ouverture le meme jour : rien');
// (b) meme appareil, soir 19:00 : cle separee → s'affiche
await t.page.clock.setSystemTime(new Date('2026-10-25T19:00:00+01:00'));
await t.charger();
ok(await visible(t.page), 'soir 19:00 (apres le matin deja vu) : la carte s\'affiche');
const txtS = (await carte(t.page).innerText({timeout:3000})).replace(/\s+/g, ' ');
ok(/Bonsoir Raci/.test(txtS), 'soir : « ' + txtS + ' »');
await t.page.screenshot({ path: SHOTS + '/accueil-soir-390-sans-donnees.png' });
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

// (d) soir avec donnees reelles (repas valides), 20:00. Le banc d'essai recharge parfois le journal
// vide au milieu du test (session simulee qui clignote) : jusqu'a 3 essais, c'est un artefact du banc.
let txtD = '';
for (let essai = 0; essai < 3 && !/repas validés/.test(txtD); essai++) {
  t = await ouvrir({ quand: '2026-10-25T20:00:00+01:00' });
  await t.charger(); await visible(t.page);
  txtD = (await carte(t.page).innerText({ timeout: 3000 }).catch(() => '')).replace(/\s+/g, ' ');
  if (/repas validés/.test(txtD)) { await t.page.waitForTimeout(300); await t.page.screenshot({ path: SHOTS + '/accueil-soir-390.png' }); }
  await t.ctx.close();
}
ok(/Bonsoir Raci/.test(txtD) && /repas validés/.test(txtD), 'soir avec donnees : « ' + txtD + ' »');

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
// (g) prenom absent : avec donnees → « Bonjour » ; sans donnees → rien, et rien n'est marque
t = await ouvrir({ quand: '2026-10-25T08:30:00+01:00', plan: true, vide: true, query: '&sansprenom' }); await t.charger();
const txtG = (await visible(t.page)) ? (await carte(t.page).innerText({timeout:3000})).replace(/\s+/g, ' ') : '';
ok(/^Bonjour [A-Z]/.test(txtG) && !/Bonjour Raci/.test(txtG), 'prenom absent, donnees presentes : « ' + txtG + ' »');
await t.ctx.close();
t = await ouvrir({ quand: '2026-10-25T20:00:00+01:00', vide: true, query: '&sansprenom' }); await t.charger();
ok(await absente(t.page), 'prenom absent ET donnees absentes : aucun ecran');
ok(await t.page.evaluate(() => !Object.keys(localStorage).some(k => k.startsWith('belfit_accueil_'))), 'et rien n\'est marque « vu »');
await t.ctx.close();
// (h) donnees absentes avec prenom : simple repli
t = await ouvrir({ quand: '2026-10-25T20:00:00+01:00', vide: true }); await t.charger();
const txtH = (await visible(t.page)) ? (await carte(t.page).innerText({timeout:3000})).replace(/\s+/g, ' ') : '';
ok(/^Bonsoir Raci/.test(txtH) && /Bonne soirée/.test(txtH), 'donnees absentes, prenom present : « ' + txtH + ' »');
await t.ctx.close();
// (i) prefers-reduced-motion : aucune transition
{
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', locale: 'fr-BE', timezoneId: 'Europe/Brussels' });
  const page = await ctx.newPage(); await page.clock.install({ time: new Date('2026-10-25T08:30:00+01:00') });
  await page.goto('http://localhost:' + PORT + '/app.html?accueil'); await page.waitForSelector('.acc-voile', { timeout: 6000 }).catch(() => {});
  const tr = await page.evaluate(() => { const e = document.querySelector('.acc-voile'); return e ? getComputedStyle(e).transitionDuration : 'absent'; });
  ok(/^0s/.test(tr), 'reduced-motion : transition = ' + tr);
  await ctx.close();
}
await nav.close();
try { process.kill(-srv.pid); } catch (e) {}
console.log(code ? 'ECHEC' : 'OK'); process.exit(code);
