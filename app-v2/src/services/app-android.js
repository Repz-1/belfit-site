// Mode « app Android » (TWA Google Play, v643).
// L'app Play ouvre /v2/?source=twa (start_url du twa-manifest) ; Chrome
// transmet aussi le referrer android-app://be.belfit.app au premier chargement.
// Regle Google Play (Paiements) : aucun achat de service numerique hors
// Play Billing dans l'app. Dans ce mode on masque donc TOUS les prix, boutons
// d'achat, codes de reduction, virements et liens de paiement (Mollie reste
// sur le web). Memorise en sessionStorage seulement : le stockage d'une TWA
// est celui de Chrome pour l'origine, un localStorage ferait fuir le mode
// vers le site web ouvert ensuite dans Chrome.
const CLE = 'belfit_source_twa';
const PAQUET = 'android-app://be.belfit.app';

export function detecterAppAndroid(loc, referrer, store) {
  let oui = false;
  try { oui = new URLSearchParams(loc.search || '').get('source') === 'twa'; } catch (e) { /* rien */ }
  if (!oui && typeof referrer === 'string' && referrer.startsWith(PAQUET)) oui = true;
  try {
    if (oui) store && store.setItem(CLE, '1');
    else if (store && store.getItem(CLE) === '1') oui = true;
  } catch (e) { /* stockage indisponible */ }
  return oui;
}

export const APP_ANDROID = typeof window !== 'undefined'
  ? detecterAppAndroid(window.location, document.referrer, (() => { try { return window.sessionStorage; } catch (e) { return null; } })())
  : false;

if (APP_ANDROID && typeof document !== 'undefined') document.documentElement.classList.add('app-android');

// Message neutre (aucun prix, aucun lien, aucune incitation a acheter ailleurs).
export const MSG_INACTIF = "Ton programme n'est pas encore actif.";
