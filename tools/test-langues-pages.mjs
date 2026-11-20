// Pages du site et ecran de connexion /v2/ : en neerlandais puis en anglais,
// aucun texte francais visible (hors noms propres, prix, e-mail, BCE).
// Depuis la racine : node tools/test-langues-pages.mjs
// Le dossier v2/ doit avoir ete construit (npx vite build dans app-v2).
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { createRequire } from 'module';

const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const RACINE = new URL('..', import.meta.url).pathname;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.webp': 'image/webp',
};
const srv = createServer((q, r) => {
  const url = decodeURIComponent(q.url.split('?')[0]);
  let f = join(RACINE, url);
  try { if (statSync(f).isDirectory()) f = join(f, 'index.html'); } catch (e) { /* fichier */ }
  if (!existsSync(f)) { r.writeHead(404); r.end('404'); return; }
  r.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
  r.end(readFileSync(f));
});
await new Promise((res) => srv.listen(0, '127.0.0.1', res));
const PORT = srv.address().port;

const PAGES = ['/', '/cgv.html', '/mentions-legales.html', '/suppression-compte.html', '/confidentialite.html', '/v2/'];
// Mots francais qui ne sont ni neerlandais ni anglais. Les noms propres
// (BelFit, Mollie, Bancontact, GitHub, BCE) et les prix ne sont pas ici.
// Mots propres au francais. « abonnement » est aussi neerlandais,
// « questionnaire » et « conditions » sont aussi anglais : ils ne
// comptent pas comme un reste de francais.
// Pas d'articles courts (le, la, un) : en JavaScript, \b coupe sur un
// accent, donc « le » matcherait la fin de « artificiële ».
const FR = /\b(vous|votre|vos|notre|nous|une|dans|avec|cette|sont|pour|chez|aujourd'hui|également|légales|supprimer|données|entraînement|entraîner|acheter|ouvrir|contacter|confidentialité|rétractation|virement|livré|livraison|remboursement|hébergeur|éditeur|siège|mentions|paiement)\b/i;

let code = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const chrome = process.env.PW || '/usr/local/bin/google-chrome';
const nav = await chromium.launch({
  executablePath: chrome,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

for (const langue of ['nl', 'en']) {
  for (const page of PAGES) {
    const ctx = await nav.newContext({ locale: langue === 'nl' ? 'nl-BE' : 'en-GB' });
    await ctx.addInitScript((l) => {
      localStorage.setItem('repz_lang', l);
      localStorage.setItem('belfit_v2_langue', l);
    }, langue);
    const p = await ctx.newPage();
    const erreurs = [];
    p.on('pageerror', (e) => erreurs.push(e.message));
    await p.goto('http://127.0.0.1:' + PORT + page, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await p.waitForTimeout(600);
    const texte = await p.evaluate(() => document.body.innerText);
    const htmlLang = await p.evaluate(() => document.documentElement.lang || '');
    const fautes = [];
    let m;
    const re = new RegExp(FR.source, 'gi');
    while ((m = re.exec(texte))) fautes.push(m[0]);
    const uniques = [...new Set(fautes.map((s) => s.toLowerCase()))];
    ok(uniques.length === 0 && erreurs.length === 0,
      langue + ' ' + page + (uniques.length ? ' encore en français : ' + uniques.join(', ') : '')
      + (erreurs.length ? ' erreur JS : ' + erreurs[0] : '')
      + ' [lang=' + htmlLang + ']');
    await ctx.close();
  }
}

await nav.close();
srv.close();
process.exit(code);
