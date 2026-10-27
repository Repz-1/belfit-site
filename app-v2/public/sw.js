// ============================================================
// SERVICE WORKER v2
// Deux strategies, selon la nature du fichier :
//  - Documents HTML : RESEAU d'abord (cache en secours hors-ligne).
//    Le HTML pointe vers les fichiers de code : s'il est perime,
//    toute l'app reste bloquee sur une ancienne version.
//  - Assets /assets/* : CACHE d'abord. Leur nom contient un hash
//    unique par version, ils sont donc immuables : aucun risque
//    de servir du perime, et l'ouverture reste instantanee.
// ============================================================
const CACHE = 'belfit-v2-396';
// Photos d'exercices (/img/exercices/, voir components/PhotoExo.jsx) :
// cache a part, qui SURVIT aux nouvelles versions. Elles ne changent
// pas d'une version a l'autre — les reprendre a chaque deploiement
// couterait des Mo pour rien. Quand elles sont regenerees, leur URL
// change (?v=PHOTOS_VERSION) ; changer aussi ce nom pour vider l'ancien.
const CACHE_PHOTOS = 'belfit-photos-exos-1';
const PHOTOS_MAX = 400; // ~ 4 a 10 Mo au plus

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(c => c !== CACHE && c !== CACHE_PHOTOS).map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Polices distantes : cache d'abord, pour toujours. Elles ne
  // changent jamais et elles ne doivent plus dependre du reseau a
  // chaque ouverture (Raci, 02/09).
  if (url.host === 'api.fontshare.com' || url.host === 'cdn.fontshare.com' ||
      url.host === 'fonts.gstatic.com' || url.host === 'fonts.googleapis.com') {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const enCache = await cache.match(req);
        if (enCache) return enCache;
        const rep = await fetch(req);
        // opaque (no-cors) inclus : on le garde tel quel, il sert.
        if (rep && (rep.status === 200 || rep.type === 'opaque')) cache.put(req, rep.clone());
        return rep;
      }).catch(() => fetch(req)),
    );
    return;
  }

  // Photos d'exercices : cache d'abord. Seules les reponses 200 sont
  // gardees — un 404 laisse PhotoExo retomber sur la photo distante.
  if (url.origin === self.location.origin && url.pathname.startsWith('/img/exercices/')) {
    e.respondWith(
      caches.open(CACHE_PHOTOS).then(async (cache) => {
        const enCache = await cache.match(req);
        if (enCache) return enCache;
        const rep = await fetch(req);
        if (rep && rep.status === 200) {
          await cache.put(req, rep.clone());
          // Plafond : les plus anciennes sortent d'abord.
          const cles = await cache.keys();
          for (const k of cles.slice(0, Math.max(0, cles.length - PHOTOS_MAX))) await cache.delete(k);
        }
        return rep;
      }).catch(() => fetch(req)),
    );
    return;
  }

  if (!url.pathname.startsWith('/v2/')) return; // ne touche pas au site actuel

  const estDocument = req.mode === 'navigate' || req.destination === 'document';

  if (estDocument) {
    // Reseau d'abord : toujours la derniere version de l'app
    e.respondWith(
      // cache:'reload' : le reseau est interroge en ignorant le cache
      // HTTP (GitHub Pages garde le HTML 10 minutes). Sans cela,
      // chaque deploiement restait invisible pendant ce delai — la
      // source de tous les « tu n'as rien fait » a repetition.
      (async () => {
        const reseau = fetch(new Request(req, {cache: 'reload'}))
          .then(rep => {
            const copie = rep.clone();
            caches.open(CACHE).then(c => c.put(req, copie));
            return rep;
          });
        // 2,5 s : au-dela, le reseau n'est plus une reponse, c'est une
        // attente. On sert le cache et on laisse la requete finir en
        // arriere-plan — elle alimentera le prochain lancement.
        const patience = new Promise(r => setTimeout(() => r(null), 2500));
        const gagnant = await Promise.race([reseau.catch(() => null), patience]);
        if (gagnant) return gagnant;
        const enCache = await caches.match(req);
        return enCache || reseau;
      })()
    );
    return;
  }

  // Assets immuables (nom hashe) : cache d'abord, telechargement sinon
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const enCache = await cache.match(req);
      if (enCache) return enCache;
      const rep = await fetch(req);
      if (rep && rep.status === 200) cache.put(req, rep.clone());
      return rep;
    })
  );
});
