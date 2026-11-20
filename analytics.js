/* Mesure d'audience — Google Analytics 4, Consent Mode v2.
   Aucun cookie de mesure tant que la personne n'a pas accepte.
   Pas de publicite : ad_storage, ad_user_data et ad_personalization
   restent refuses. Le choix est memorise sur cet appareil. */
(function () {
  var ID = 'G-09CRELHCFP';
  var CLE = 'belfit_analytics';

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  // Avant le chargement de gtag.js. Sans ce defaut, la bibliotheque
  // deposerait des cookies des le premier affichage.
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });

  var choix = null;
  try { choix = localStorage.getItem(CLE); } catch (e) { choix = null; }
  if (choix === 'accepte') {
    gtag('consent', 'update', { analytics_storage: 'granted' });
  }

  if (!document || typeof document.createElement !== 'function' || !document.head) return;

  var chargeur = document.createElement('script');
  chargeur.async = true;
  chargeur.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(chargeur);
  gtag('js', new Date());
  gtag('config', ID);

  if (choix === 'accepte' || choix === 'refuse') return;

  function memoriser(valeur) {
    try { localStorage.setItem(CLE, valeur); } catch (e) {}
  }

  function retirer(bandeau) {
    if (bandeau && bandeau.parentNode) bandeau.parentNode.removeChild(bandeau);
  }

  function afficher() {
    if (!document.body) return;
    var bandeau = document.createElement('div');
    bandeau.className = 'bf-analytics';
    bandeau.setAttribute('role', 'dialog');
    bandeau.setAttribute('aria-label', 'Mesure d\u2019audience');
    bandeau.innerHTML =
      '<p>BelFit mesure l\u2019audience du site seulement si tu es d\u2019accord. Pas de publicit\u00e9. ' +
      '<a href="/confidentialite.html">Politique de confidentialit\u00e9</a></p>' +
      '<div class="bf-analytics-actions">' +
      '<button type="button" data-choix="refuse">Refuser</button>' +
      '<button type="button" data-choix="accepte">Accepter</button>' +
      '</div>';
    bandeau.addEventListener('click', function (e) {
      var bouton = e.target && e.target.getAttribute && e.target.getAttribute('data-choix');
      if (bouton === 'accepte') {
        memoriser('accepte');
        gtag('consent', 'update', { analytics_storage: 'granted' });
        retirer(bandeau);
      } else if (bouton === 'refuse') {
        memoriser('refuse');
        retirer(bandeau);
      }
    });
    document.body.appendChild(bandeau);
  }

  if (document.body) afficher();
  else document.addEventListener('DOMContentLoaded', afficher);

  var style = document.createElement('style');
  style.textContent =
    '.bf-analytics{position:fixed;z-index:90;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));' +
    'max-width:520px;margin:0 auto;background:#fff;color:#16130F;border:1px solid rgba(22,19,15,.08);' +
    'border-radius:16px;box-shadow:0 8px 32px rgba(22,19,15,.12);padding:14px 14px 12px;' +
    'font-family:Satoshi,Manrope,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}' +
    '.bf-analytics p{margin:0 0 12px;font-size:13.5px;line-height:1.45;font-weight:500}' +
    '.bf-analytics a{color:#8F6200;font-weight:700}' +
    '.bf-analytics-actions{display:flex;gap:8px;justify-content:flex-end}' +
    '.bf-analytics button{font:inherit;font-size:14px;font-weight:700;border-radius:12px;padding:10px 14px;cursor:pointer}' +
    '.bf-analytics button[data-choix="refuse"]{background:#fff;color:#16130F;border:1.5px solid rgba(22,19,15,.16)}' +
    '.bf-analytics button[data-choix="accepte"]{background:#F8CF01;color:#16130F;border:0}';
  document.head.appendChild(style);
})();
