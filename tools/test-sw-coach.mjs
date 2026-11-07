// Worker racine : ERR_FAILED reproduit, puis correctif.
// Chrome headless local. Aucun compte, aucun reseau BelFit, aucun stockage client reel.
import { createRequire } from 'module';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { once } from 'events';

const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const chrome = process.env.CHROME || '/usr/local/bin/google-chrome';
let code = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };

const SW_BUG = `
const CACHE = 'belfit-v665';
self.addEventListener('install', e => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/v2/')) return;
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-cache' });
        return res;
      } catch (err) {
        const enCache = await caches.match(req);
        return enCache || (await caches.match('./app.html'));
      }
    })());
  }
});
`;
const SW_FIX = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const pages = {
  '/index.html': '<!doctype html><title>index</title><h1>index</h1><script>navigator.serviceWorker.register("/sw.js")</script>',
  '/coach.html': '<!doctype html><title>coach</title><h1 id="ok">coach-frais</h1>',
  '/v2/': '<!doctype html><title>v2</title><h1 id="v2">v2-direct</h1>',
  '/v2/index.html': '<!doctype html><title>v2</title><h1 id="v2">v2-direct</h1>',
};
let swBody = SW_BUG;
const server = createServer((req, res) => {
  const path = req.url.split('?')[0];
  if (path === '/sw.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
    res.end(swBody);
    return;
  }
  if (path === '/i18n.js' || path === '/i18n-strings.js' || path === '/manifest.json' || path.endsWith('.png')) {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
    res.end('ok');
    return;
  }
  const body = pages[path];
  if (!body) { res.writeHead(404); res.end('absent'); return; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const port = server.address().port;
const origin = `http://127.0.0.1:${port}`;

const nav = await chromium.launch({ executablePath: chrome });
const ctx = await nav.newContext();
const page = await ctx.newPage();

async function visiter(url, offline) {
  await ctx.setOffline(!!offline);
  try {
    const res = await page.goto(origin + url, { waitUntil: 'domcontentloaded', timeout: 8000 });
    const texte = await page.locator('body').innerText().catch(() => '');
    return { ok: true, status: res && res.status(), texte };
  } catch (e) {
    return { ok: false, erreur: e.message.split('\n')[0] };
  } finally {
    await ctx.setOffline(false);
  }
}

await page.goto(origin + '/index.html');
await page.waitForFunction(() => navigator.serviceWorker.controller);
await page.evaluate(() => localStorage.setItem('belfit_espace_coach', 'ne-pas-effacer'));
const enLigne = await visiter('/coach.html', false);
ok(enLigne.ok && enLigne.status === 200 && /coach-frais/.test(enLigne.texte), 'worker v665, reseau ouvert : coach repond 200');
const horsCache = await visiter('/page-inconnue.html', true);
ok(!horsCache.ok && /ERR_FAILED/.test(horsCache.erreur), 'worker v665, reseau coupe, sans cache ni app.html : net::ERR_FAILED');
const v2bug = await visiter('/v2/', false);
ok(v2bug.ok && /v2-direct/.test(v2bug.texte), 'worker v665 : /v2/ n est pas remplace');

swBody = SW_FIX;
const bascule = page.evaluate(() => new Promise((resolve) => {
  navigator.serviceWorker.addEventListener('controllerchange', () => resolve('change'), { once: true });
  setTimeout(() => resolve('timeout'), 4000);
}));
await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  await reg.update();
});
const comment = await bascule;
console.log('  (info) bascule worker :', comment);
await page.waitForFunction(async () => (await caches.keys()).includes('belfit-v666'));
const apres = await visiter('/coach.html', false);
ok(apres.ok && apres.status === 200 && /coach-frais/.test(apres.texte), 'apres update du worker : un rechargement ouvre coach');
const session = await page.evaluate(() => localStorage.getItem('belfit_espace_coach'));
ok(session === 'ne-pas-effacer', 'mise a jour du worker : localStorage intact');
const cachesNoms = await page.evaluate(async () => await caches.keys());
ok(cachesNoms.includes('belfit-v666') && !cachesNoms.includes('belfit-v665'), 'cache worker v666 actif, v665 retire (' + cachesNoms.join(',') + ')');

const coupe = await visiter('/coach.html', true);
if (!(coupe.ok && coupe.status === 503 && /Espace coach indisponible/.test(coupe.texte || '') && !/coach-frais/.test(coupe.texte || ''))) {
  console.log('  (vu)', JSON.stringify(coupe));
}
ok(coupe.ok && coupe.status === 503 && /Espace coach indisponible/.test(coupe.texte || '') && !/coach-frais/.test(coupe.texte || ''), 'reseau coupe : page explicite, pas la copie coach, pas ERR_FAILED');
const v2coupe = await visiter('/v2/', true);
ok(!v2coupe.ok && !/Espace coach indisponible/.test(v2coupe.erreur || ''), 'reseau coupe : /v2/ n est pas intercepte par la page du worker');
const autre = await visiter('/page-inconnue.html', true);
if (!(autre.ok && autre.status === 503)) console.log('  (vu autre)', JSON.stringify(autre));
ok(autre.ok && autre.status === 503 && /Page indisponible/.test(autre.texte || ''), 'autre page sans cache : Response 503, pas undefined');

await nav.close();
server.close();
const prep = readFileSync(new URL('./preparer-site.sh', import.meta.url), 'utf8');
ok(prep.includes('app-v2/src/services/statut-dossier.js'), 'publication : le module du badge coach est copie');
ok(SW_FIX.includes("pathname.startsWith('/v2/')") && SW_FIX.includes('belfit-v666'), 'worker publie : v2 exclu, version 666');
process.exit(code);
