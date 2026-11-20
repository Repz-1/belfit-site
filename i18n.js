/* ===== BELFIT i18n — moteur de traduction partagé (FR / EN / NL) ===== */
(function (global) {
  var LANGS = ['fr', 'en', 'nl'];
  var LANG_LABELS = { fr: 'Français', en: 'English', nl: 'Nederlands' };

  // Détecte la langue : choix mémorisé > langue du téléphone > français par défaut
  function detectLang() {
    try {
      var saved = localStorage.getItem('repz_lang');
      if (saved && LANGS.indexOf(saved) !== -1) return saved;
    } catch (e) {}
    var nav = (navigator.language || navigator.userLanguage || 'fr').toLowerCase();
    if (nav.indexOf('nl') === 0) return 'nl';
    if (nav.indexOf('en') === 0) return 'en';
    return 'fr';
  }

  var current = detectLang();

  function setLang(l) {
    if (LANGS.indexOf(l) === -1) return;
    current = l;
    try { localStorage.setItem('repz_lang', l); } catch (e) {}
    document.documentElement.setAttribute('lang', l);
    applyDom();
    try { window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: l } })); } catch (e) {}
  }

  function getLang() { return current; }
  function langChoisie() { try { return !!localStorage.getItem('repz_lang'); } catch (e) { return false; } }

  // Récupère une traduction : t('cle') — repli FR puis clé brute
  function t(key, vars) {
    var dict = (global.BELFIT_STRINGS && global.BELFIT_STRINGS[current]) || {};
    var fr = (global.BELFIT_STRINGS && global.BELFIT_STRINGS.fr) || {};
    var s = (key in dict) ? dict[key] : (key in fr ? fr[key] : key);
    if (vars) { for (var k in vars) { s = s.replace(new RegExp('{' + k + '}', 'g'), vars[k]); } }
    return s;
  }

  // Applique les traductions aux éléments balisés data-i18n / data-i18n-ph / data-i18n-html
  function applyDom(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    root.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    root.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
  }

  // 20/11 : selecteur FR / EN / NL. Toute page qui contient un element
  // [data-langues] recoit trois boutons ; le choix est memorise (repz_lang)
  // et partage avec l'app (qui le lit a defaut du sien).
  var STYLE_LANGUES = '.bf-langues{display:inline-flex;gap:2px;padding:3px;border-radius:999px;background:#fff;border:1.5px solid #eee9e0}' +
    '.bf-langues button{min-width:36px;height:30px;padding:0 8px;border:0;border-radius:999px;background:none;font:700 12.5px/1 inherit;font-family:inherit;color:#6b7280;cursor:pointer;letter-spacing:.04em}' +
    '.bf-langues button[aria-pressed="true"]{background:#1a1a1a;color:#fff}';
  function poserLangues() {
    var hotes = document.querySelectorAll('[data-langues]');
    if (!hotes.length) return;
    if (!document.getElementById('bf-langues-style')) {
      var st = document.createElement('style'); st.id = 'bf-langues-style'; st.textContent = STYLE_LANGUES;
      document.head.appendChild(st);
    }
    hotes.forEach(function (h) {
      h.innerHTML = '';
      var g = document.createElement('div'); g.className = 'bf-langues'; g.setAttribute('role', 'group');
      g.setAttribute('aria-label', t('lang_choix'));
      LANGS.forEach(function (l) {
        var b = document.createElement('button'); b.type = 'button'; b.lang = l;
        b.textContent = l.toUpperCase(); b.setAttribute('aria-pressed', l === current ? 'true' : 'false');
        b.addEventListener('click', function () { setLang(l); });
        g.appendChild(b);
      });
      h.appendChild(g);
    });
  }
  try { window.addEventListener('langchange', poserLangues); } catch (e) {}

  document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.setAttribute('lang', current);
    applyDom();
    poserLangues();
  });

  // Sync inter-pages / iframes : si la langue change ailleurs, on suit
  try {
    window.addEventListener('storage', function (e) {
      if (e.key === 'repz_lang' && e.newValue && LANGS.indexOf(e.newValue) !== -1 && e.newValue !== current) {
        current = e.newValue;
        document.documentElement.setAttribute('lang', current);
        applyDom();
        poserLangues();
        try { window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: current } })); } catch (err) {}
      }
    });
  } catch (e) {}

  global.BELFIT_I18N = {
    t: t, setLang: setLang, getLang: getLang, langChoisie: langChoisie,
    applyDom: applyDom, LANGS: LANGS, LANG_LABELS: LANG_LABELS, detectLang: detectLang
  };
  // Traduction d'un nom d'aliment de la base (FR = clé canonique, repli FR)
  function trFood(name) {
    if (current === 'fr') return name;
    var db = global.BELFIT_FOODS || {};
    var e = db[name];
    return (e && e[current]) ? e[current] : name;
  }
  global.trFood = trFood;
  global.BELFIT_I18N.trFood = trFood;

  global.t = t; // raccourci
})(window);
