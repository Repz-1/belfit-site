// Ecran de bienvenue (28/10) : comportement reel dans le navigateur, horloge simulee.
// DONNEES DE TEST uniquement. Prerequis : apercu construit
//   (cd app-v2 && npx vite build --config apercu.config.js). Lancer depuis la racine du depot.
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { copyFileSync } from 'fs';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const { BANQUE } = await import('../app-v2/src/services/accueil-messages.js');
const PORT = 8094;
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
// Le banc ne sert pas le dossier public : on y met le vrai logo (dossier de banc, hors depot).
copyFileSync('belfit-logo-bf.png', 'app-v2/apercu/construit/belfit-logo-bf.png');
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
await new Promise(r => setTimeout(r, 1500));
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const norm = (s) => s.replace(/\s+/g, ' ').trim();

// opts : { quand, tz, query, rnd (valeur fixe de Math.random), reduit }
async function ouvrir(opts) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE', timezoneId: opts.tz || 'Europe/Brussels', reducedMotion: opts.reduit ? 'reduce' : 'no-preference' });
  await ctx.addInitScript((rnd) => { if (rnd != null) Math.random = () => rnd; }, opts.rnd ?? null);
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('ERREUR JS', e.message); code = 1; });
  await page.clock.install({ time: new Date(opts.quand) });
  const url = 'http://localhost:' + PORT + '/app.html?accueil' + (opts.query || '');
  const charger = async () => { await page.goto(url); await page.waitForTimeout(1200); };
  return { ctx, page, charger };
}
const visible = async (page, ms = 5000) => { try { await page.waitForSelector('.acc-voile', { timeout: ms }); return true; } catch (e) { return false; } };
const absente = async (page) => !(await visible(page, 3500));
const texte = async (page) => norm(await page.locator('.acc-carte').innerText({ timeout: 3000 }));
const fond = (page) => page.evaluate(() => getComputedStyle(document.querySelector('.acc-voile')).backgroundColor);

// (a) 08:30, tirage 0 : « Bonjour, Raci » + 1re phrase du matin tot ; logo reel ; fond creme
let t = await ouvrir({ quand: '2026-10-25T08:30:00+01:00', rnd: 0 }); await t.charger();
ok(await visible(t.page), 'matin 08:30 : l\'ecran s\'affiche a l\'ouverture');
ok(await texte(t.page) === 'Bonjour, Raci ' + BANQUE.tot[0].t, 'texte exact : « ' + await texte(t.page) + ' »');
ok((await t.page.locator('.acc-logo').getAttribute('src')) === '/belfit-logo-bf.png', 'logo reel de l\'app : /belfit-logo-bf.png');
ok(await t.page.evaluate(() => document.querySelector('.acc-logo').complete && document.querySelector('.acc-logo').naturalWidth === 480), 'logo reellement charge (480 px de large)');
ok(await fond(t.page) === 'rgb(247, 244, 239)', 'fond creme #f7f4ef');
// animations : toutes finies (aucune infinie)
await t.page.waitForTimeout(1900);
const inf = await t.page.evaluate(() => [...document.querySelectorAll('.acc-voile, .acc-voile *')].flatMap(e => e.getAnimations()).filter(a => { const c = a.effect.getComputedTiming(); return c.iterations === Infinity; }).length);
ok(inf === 0, 'aucune animation infinie (pas de battement du logo)');
const fermee = await t.page.waitForSelector('.acc-voile', { state: 'detached', timeout: 6000 }).then(() => true, () => false);
ok(fermee, 'disparait tout seul (fondu, ~3,4 s)');
// (b) pas de re-affichage sans rechargement : on reste dans la meme page
await t.page.waitForTimeout(1500);
ok(await t.page.locator('.acc-voile').count() === 0, 'ne revient pas tout seul');
// (c) retour au premier plan : < 30 min = rien, > 30 min = revient
const cacher = (page, ok_) => page.evaluate((hidden) => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' }); document.dispatchEvent(new Event('visibilitychange')); }, ok_);
await cacher(t.page, true); await t.page.clock.fastForward(10 * 60 * 1000); await cacher(t.page, false);
ok(await absente(t.page), 'retour apres 10 min d\'absence : rien');
await cacher(t.page, true); await t.page.clock.fastForward(31 * 60 * 1000); await cacher(t.page, false);
ok(await visible(t.page, 4000), 'retour apres 31 min d\'absence : l\'ecran revient');
await t.page.waitForSelector('.acc-voile', { state: 'detached', timeout: 6000 }).catch(() => {});
// 2e affichage de suite : pas le meme message (tirage fixe 0 mais memoire du dernier)
await cacher(t.page, true); await t.page.clock.fastForward(40 * 60 * 1000); await cacher(t.page, false);
await visible(t.page, 4000);
const t2 = await texte(t.page).catch(() => '');
ok(t2 !== '' && !t2.includes(BANQUE.tot[0].t), 'nouveau tirage (meme tirage 0) : pas le meme message que la fois d\'avant');
await t.ctx.close();

// (d) 2e ouverture a froid (rechargement) : s'affiche de nouveau, et change de message
t = await ouvrir({ quand: '2026-10-25T08:30:00+01:00', rnd: 0 }); await t.charger();
await visible(t.page); const m1 = await texte(t.page);
await t.page.waitForSelector('.acc-voile', { state: 'detached', timeout: 6000 }).catch(() => {});
await t.charger(); await visible(t.page); const m2 = await texte(t.page);
ok(m1 !== m2 && m2.startsWith('Bonjour, Raci'), 'rechargement (ouverture a froid) : reaffiche, message different');
await t.ctx.close();

// (e) tap : ferme tout de suite, ne bloque pas
t = await ouvrir({ quand: '2026-10-25T09:00:00+01:00' }); await t.charger();
ok(await visible(t.page), 'tap : ecran ouvert');
await t.page.tap('.acc-voile'); await t.page.waitForTimeout(100);
ok(!(await t.page.locator('.acc-voile').count()), 'un tap ferme l\'ecran');
await t.ctx.close();

// (f) sans prenom : « Bonjour » seul, sans virgule
t = await ouvrir({ quand: '2026-10-25T10:30:00+01:00', rnd: 0, query: '&sansprenom' }); await t.charger();
ok(await visible(t.page) && await texte(t.page) === 'Bonjour ' + BANQUE.fin_matinee[0].t, 'sans prenom : « ' + await texte(t.page).catch(() => '?') + ' »');
await t.ctx.close();

// (g) tranches : midi, apres-midi, soir, nuit (tirage 0 et variante « Encore debout »)
for (const [q, rnd, att] of [
  ['2026-10-25T12:30:00+01:00', 0, 'Bonjour, Raci ' + BANQUE.midi[0].t],
  ['2026-10-25T15:00:00+01:00', 0, 'Bonjour, Raci ' + BANQUE.apres_midi[0].t],
  ['2026-10-25T20:00:00+01:00', 0, 'Bonsoir, Raci ' + BANQUE.soir[0].t],
  ['2026-10-25T23:30:00+01:00', 0.2, 'Encore debout, Raci ? ' + BANQUE.nuit[1].t],
  ['2026-10-26T02:00:00+01:00', 0, 'Bonsoir, Raci ' + BANQUE.nuit[0].t],
]) {
  t = await ouvrir({ quand: q, rnd }); await t.charger();
  const tx = await visible(t.page) ? await texte(t.page) : '';
  ok(tx.replace(/\u00a0/g, ' ') === att, q.slice(11, 16) + ' : « ' + tx + ' »');
  await t.ctx.close();
}
// (h) fuseau de l'appareil New York, 08:30 a Bruxelles → matin (heure de Bruxelles)
t = await ouvrir({ quand: '2026-10-25T08:30:00+01:00', tz: 'America/New_York', rnd: 0 }); await t.charger();
ok(await visible(t.page) && (await texte(t.page)).startsWith('Bonjour, Raci ' + BANQUE.tot[0].t), 'appareil a New York : tranche de Bruxelles');
await t.ctx.close();
// (i) ete : 23h30 UTC+2 = nuit ; 06h00 UTC+2 = tot
t = await ouvrir({ quand: '2026-07-10T06:00:00+02:00', rnd: 0 }); await t.charger();
ok(await visible(t.page) && (await texte(t.page)).includes(BANQUE.tot[0].t), 'ete 06:00 (UTC+2) : tot le matin');
await t.ctx.close();
// (j) aucune donnee a l'ecran meme avec un plan/de l'eau : jamais de chiffre
t = await ouvrir({ quand: '2026-10-25T08:30:00+01:00', rnd: 0.4 }); await t.charger(); await visible(t.page);
ok(!/\d/.test(await texte(t.page).catch(() => '1')), 'aucun chiffre a l\'ecran');
await t.ctx.close();
// (k) mouvement normal : zoom du logo + montee du texte, une seule fois
t = await ouvrir({ quand: '2026-10-25T08:30:00+01:00' }); await t.charger(); await visible(t.page);
const noms = await t.page.evaluate(() => ['.acc-logo', '.acc-titre', '.acc-sous'].map(s => [...document.querySelector(s).getAnimations()].map(a => a.animationName).join('+') || 'fini').join(','));
ok(/acc-zoom/.test(noms) || noms.startsWith('fini'), 'mouvement normal : animations CSS (' + noms + ')');
await t.ctx.close();
// (l) prefers-reduced-motion : fondu simple, ni zoom ni montee
t = await ouvrir({ quand: '2026-10-25T08:30:00+01:00', reduit: true }); await t.charger(); await visible(t.page);
const r = await t.page.evaluate(() => { const v = document.querySelector('.acc-voile'); const s = ['.acc-logo', '.acc-titre', '.acc-sous'].map(q => document.querySelector(q)); return { an: s.map(e => getComputedStyle(e).animationName).join(), nb: s.reduce((n, e) => n + e.getAnimations().length, 0), tr: getComputedStyle(v).transitionDuration }; });
ok(r.an === 'none,none,none' && r.nb === 0, 'reduced-motion : aucune animation de zoom/montee ' + JSON.stringify(r));
ok(parseFloat(r.tr) > 0, 'reduced-motion : fondu simple conserve (transition ' + r.tr + ')');
ok(await t.page.waitForSelector('.acc-voile', { state: 'detached', timeout: 6000 }).then(() => true, () => false), 'reduced-motion : se ferme aussi tout seul');
await t.ctx.close();
await nav.close();
try { process.kill(-srv.pid); } catch (e) {}
console.log(code ? 'ECHEC' : 'OK'); process.exit(code);
