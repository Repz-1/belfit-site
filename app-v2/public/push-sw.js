// ============================================================
// NOTIFICATIONS — service worker dedie (28/11, Raci).
//
// Il ne fait QUE recevoir les notifications et ouvrir l'app au toucher.
// Portee /v2/push/ : aucune page n'y vit, il ne controle donc aucune
// page et n'intercepte aucun telechargement (pas de cache, rien a voir
// avec les mises a jour de l'app).
//
// Le serveur (functions/notifications.js) envoie des messages « data » :
// { titre, texte, image, icone, badge, url, tag, type }.
// ============================================================
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { const j = e.data ? e.data.json() : {}; d = j.data || j; } catch (err) { d = {}; }
  const titre = d.titre || 'BelFit';
  e.waitUntil(self.registration.showNotification(titre, {
    body: d.texte || '',
    image: d.image || undefined,
    icon: d.icone || '/v2/notif/icone.png',
    badge: d.badge || '/v2/notif/badge.png',
    tag: d.tag || 'belfit',
    renotify: true,
    data: { url: d.url || '/v2/' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const cible = new URL((e.notification.data && e.notification.data.url) || '/v2/', self.location.origin).href;
  e.waitUntil((async () => {
    const fen = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const app = fen.find((c) => c.url.indexOf(self.location.origin + '/v2') === 0);
    if (app) {
      await app.focus();
      try { await app.navigate(cible); } catch (err) { /* page non controlee : on garde le focus */ }
      return;
    }
    await self.clients.openWindow(cible);
  })());
});
