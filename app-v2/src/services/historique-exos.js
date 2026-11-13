import { seances } from '../store/seances.js';

// ============================================================
// HISTORIQUE PAR EXERCICE — Raci, 13/11.
// Lu dans les seances enregistrees (synchronisees avec le compte),
// pas dans l'ancien repz_setLog local : la courbe suit le client
// d'un telephone a l'autre.
//
// Volontairement NEUTRE : on montre ce qui a ete fait, sans jamais
// proposer plus lourd (Raci, 13/11 : « l'app ne doit pas inciter a
// monter les poids »).
// ============================================================

const nombre = (x) => {
  const n = parseFloat(String(x == null ? '' : x).replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

/** Series propres d'un exercice enregistre : [{ w, r }] chiffrees. */
function seriesDe(e) {
  return (e.series || e.sets || [])
    .map((s) => ({ w: nombre(s.w != null ? s.w : s.kg), r: nombre(s.r != null ? s.r : s.reps) }))
    .filter((s) => s.w > 0 || s.r > 0);
}

/** Meilleure serie d'une seance : la plus lourde, puis le plus de reps. */
export function meilleureSerie(sets) {
  return sets.reduce((m, s) => (!m || s.w > m.w || (s.w === m.w && s.r > m.r) ? s : m), null);
}

/**
 * Tous les exercices deja faits, le plus recent d'abord :
 * [{ nom, mKey, n (seances), dernier (iso), meilleure {w,r} }].
 */
export function exercicesFaits() {
  const parNom = {};
  seances.value.forEach((s) => {
    (s.exos || []).forEach((e) => {
      const sets = seriesDe(e);
      if (!e.nom || !sets.length) return;
      const m = meilleureSerie(sets);
      const o = parNom[e.nom] || (parNom[e.nom] = { nom: e.nom, mKey: e.mKey, n: 0, dernier: '', meilleure: null });
      o.n++;
      if (s.iso > o.dernier) o.dernier = s.iso;
      if (!o.meilleure || m.w > o.meilleure.w || (m.w === o.meilleure.w && m.r > o.meilleure.r)) {
        o.meilleure = { ...m, iso: s.iso };
      }
    });
  });
  return Object.values(parNom).sort((a, b) => b.dernier.localeCompare(a.dernier));
}

/** Historique d'un exercice, du plus ancien au plus recent : [{ iso, sets, meilleure }]. */
export function historiqueExo(nom, depuisIso = '') {
  const l = [];
  seances.value.forEach((s) => {
    if (depuisIso && s.iso < depuisIso) return;
    (s.exos || []).forEach((e) => {
      if (e.nom !== nom) return;
      const sets = seriesDe(e);
      if (sets.length) l.push({ iso: s.iso, sets, meilleure: meilleureSerie(sets) });
    });
  });
  return l.sort((a, b) => a.iso.localeCompare(b.iso));
}
