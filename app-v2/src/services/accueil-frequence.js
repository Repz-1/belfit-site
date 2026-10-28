// Ecran de bienvenue : quand l'afficher (28/10, Raci).
//  - a une ouverture « a froid » de l'app (chargement de la page) SUR CINQ seulement
//    (Raci : « sur 5 ouvertures il faut le faire 1 seule fois ») ;
//  - et au retour au premier plan SEULEMENT apres plus de 30 min d'absence
//    (un simple aller-retour vers une autre appli ne le relance pas), avec la MEME
//    frequence : chaque retour compte comme une ouverture de plus.
//
// Regle exacte : un compteur local (localStorage « belfit_accueil_n », de 0 a 4) compte les
// ouvertures. Le message est montre quand il vaut 0 : donc a la TOUTE PREMIERE ouverture
// (compteur absent ou illisible), puis aux 6e, 11e, 16e... Le compteur avance d'un cran a
// chaque ouverture, qu'on montre le message ou non. Un rechargement dans les 60 s qui
// suivent un comptage (deconnexion, retour de paiement, rechargement de la page) n'est PAS
// une nouvelle ouverture : ni compte, ni message. Stockage indisponible : tirage 1 sur 5
// (rare, jamais a chaque fois).
//
// La decision est prise UNE fois par ouverture, AVANT le premier rendu, par le petit script
// de app-v2/index.html (copie conforme de `decider` ci-dessous, verifiee par
// tools/test-accueil-frequence.mjs). main.jsx ne fait que LIRE window.__accueilOuverture.
// Seuls les retours apres longue absence appellent `decider` depuis main.jsx.
// Heure de Bruxelles via Intl (pas l'heure de l'appareil, pas l'UTC).
export const ABSENCE_MS = 30 * 60 * 1000;

/** `masqueA` = instant (ms) ou l'app est passee en arriere-plan, null si inconnu. */
export function absenceLongue(masqueA, maintenant) {
  return typeof masqueA === 'number' && Number.isFinite(masqueA) && maintenant - masqueA > ABSENCE_MS;
}

let FMT = null;
const fmt = () => FMT || (FMT = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', hourCycle: 'h23',
}));

/** { jour: 'AAAA-MM-JJ', heure: 0-23 } a Bruxelles. */
export function momentBruxelles(d = new Date()) {
  const p = {};
  fmt().formatToParts(d).forEach((x) => { p[x.type] = x.value; });
  return { jour: p.year + '-' + p.month + '-' + p.day, heure: parseInt(p.hour, 10) % 24 };
}

export const UNE_SUR = 5;
export const CLE_COMPTEUR = 'belfit_accueil_n';
export const CLE_INSTANT = 'belfit_accueil_t';
export const DELAI_RECHARGEMENT_MS = 60 * 1000;

/**
 * Faut-il montrer le message a cette ouverture ? Avance le compteur (une seule fois par appel).
 * `stockage` : localStorage (ou un faux), `maintenant` : ms, `tirage` : () => [0, 1) (repli).
 * Ne leve jamais d'exception.
 */
export function decider(stockage, maintenant = Date.now(), tirage = Math.random) {
  try {
    const t = parseInt(stockage.getItem(CLE_INSTANT), 10);
    if (t >= 0 && maintenant - t >= 0 && maintenant - t < DELAI_RECHARGEMENT_MS) return false;
    let n = parseInt(stockage.getItem(CLE_COMPTEUR), 10);
    if (!(n >= 0)) n = 0;
    const montrer = n % UNE_SUR === 0;
    stockage.setItem(CLE_COMPTEUR, String((n % UNE_SUR + 1) % UNE_SUR));
    stockage.setItem(CLE_INSTANT, String(maintenant));
    return montrer;
  } catch (e) {
    try { return Number(tirage()) < 1 / UNE_SUR; } catch (e2) { return false; }
  }
}
