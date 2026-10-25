// Accueil du jour : quand l'afficher (25/10, Raci).
// Matin 5h–12h et soir 18h–23h, heure de Bruxelles (Intl, pas l'heure de
// l'appareil ni l'UTC). Une seule fois par periode et par jour : la date
// vue est gardee en local, par compte. Module minuscule : il est dans le
// paquet principal, la carte elle-meme est chargee a la demande.
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

/** 'matin' (5h–12h), 'soir' (18h–23h) ou null. */
export function periodeAccueil(heure) {
  if (heure >= 5 && heure < 12) return 'matin';
  if (heure >= 18 && heure < 23) return 'soir';
  return null;
}

export const cleAccueil = (periode, uid) => 'belfit_accueil_' + periode + '_' + (uid || 'local');

export function dejaVu(cle, jour) {
  try { return localStorage.getItem(cle) === jour; } catch (e) { return false; }
}
export function marquerVu(cle, jour) {
  try { localStorage.setItem(cle, jour); } catch (e) {}
}
