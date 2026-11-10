/* BELFIT service worker — reseau d'abord, jamais de reponse vide.
 *
 * Un respondWith qui se termine sans Response (undefined) devient
 * net::ERR_FAILED dans Chrome. C'etait le cas hors ligne, ou si le
 * reseau echouait, pour une page absente du cache : le secours
 * ./app.html n'existe plus (404, pas precache).
 *
 * coach.html n'est jamais servi depuis le cache : une copie ancienne
 * ne doit pas passer pour l'espace coach a jour. Hors ligne, une page
 * explicite le dit. Les autres pages HTML gardent leur copie hors
 * ligne. /v2/ n'est pas intercepte.
 *
 * L'activation (skipWaiting + claim) prend la main des qu'une
 * navigation recharge le worker. Elle ne touche ni localStorage,
 * ni IndexedDB (session), ni Firestore : seul l'ancien cache
 * du worker (belfit-vNNN precedent) est retire.
 */
const CACHE = 'belfit-v676';
const CORE = ['./index.html','./i18n.js','./i18n-strings.js','./manifest.json','./icon-192-v9.png','./icon-512-v9.png','./belfit-logo-bf.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

// Seulement les caches du worker racine (belfit-v665, belfit-v666...).
// belfit-v2-* et les photos restent : un autre worker les gere.
function cacheRacine(nom) {
  return /^belfit-v\d+$/.test(nom);
}

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => cacheRacine(k) && k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

function estCoach(url) {
  return url.pathname === '/coach.html';
}

function pageIndisponible(url) {
  const coach = estCoach(url);
  const titre = coach ? 'Espace coach indisponible' : 'Page indisponible';
  const texte = coach
    ? 'Le réseau n’a pas répondu. Aucun dossier n’est affiché depuis une ancienne copie. Réessaie dans un instant : ta session n’est pas effacée.'
    : 'Cette page n’a pas pu être chargée.';
  const html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'
    + titre + '</title></head><body style="margin:0;font-family:system-ui,sans-serif;background:#F4F3F0;color:#16130F;padding:28px">'
    + '<h1 style="font-size:22px">' + titre + '</h1><p>' + texte + '</p></body></html>';
  return new Response(html, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // L'app /v2/ a son propre cache. L'intercepter figeait son HTML.
  if (url.pathname.startsWith('/v2/')) return;

  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith((async () => {
      const coach = estCoach(url);
      try {
        // Ne pas rappeler fetch(requestNavigate, {cache}). Chrome peut
        // rejeter cet objet et, sans Response de secours, afficher ERR_FAILED.
        const res = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin', redirect: 'follow' });
        if (res && res.ok && !coach) {
          const copie = res.clone();
          caches.open(CACHE).then(c => c.put(req, copie)).catch(() => {});
        }
        if (res) return res;
      } catch (err) { /* reseau coupe ou cache du navigateur illisible */ }
      if (!coach) {
        try {
          const enCache = await caches.match(req);
          if (enCache) return enCache;
        } catch (err) { /* cache illisible */ }
      }
      return pageIndisponible(url);
    })());
    return;
  }

  e.respondWith(
    caches.match(req).then(r => {
      if (r) return r;
      return fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => new Response('', { status: 504, statusText: 'offline' }));
    })
  );
});
