// Ecran de bienvenue : quand l'afficher (28/10, Raci).
//  - une fois a chaque ouverture « a froid » de l'app (chargement de la page) ;
//  - et au retour au premier plan SEULEMENT apres plus de 30 min d'absence
//    (un simple aller-retour vers une autre appli ne le relance pas).
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
