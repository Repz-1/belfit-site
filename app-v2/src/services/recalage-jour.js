// 29/10 Raci (option B, « c'est impératif ») : quand le client CONFIRME une
// « Autre idée » (« Je choisis ce repas »), l'écart de calories avec le plan
// est réparti sur les repas du plan ENCORE PRÉVUS du même jour, pour que le
// total du jour retombe pile sur le total du plan.
//
// Module PUR (aucun composant, aucun Firebase) : testable sous Node.
//
// Règles :
//  - on ne touche JAMAIS un repas mangé, sauté, « Mangé autre chose », ni un
//    repas qui porte lui-même une idée ;
//  - le plan du coach n'est jamais modifié : seules les entrées du journal du
//    jour changent, et la version du plan reste de côté (`ingsOrig`) ;
//  - répartition proportionnelle aux kcal (même ratio pour tous les aliments
//    des repas ajustés), arrondi à 5 g / à la pièce, puis ajustement fin pas à
//    pas pour coller au total ;
//  - tout est RECALCULÉ depuis le plan à chaque fois (jamais d'empilement).
import { DB, macrosOf } from '../data/aliments.js';

export const kcalDe = (ings) => (ings || []).reduce((s, i) => s + macrosOf(i).kcal, 0);

/** Aliments du PLAN pour ce repas (avant toute idée ou ajustement). */
export function planDe(r) {
  return r.ingsOrig || ((r.idee || r.remplace) ? r.ingsPlan : r.ings) || [];
}
export const kcalPlan = (r) => kcalDe(planDe(r));

/** Repas du plan qu'on a le droit d'ajuster. */
export function estAjustable(r) {
  return !!(r.duPlan && r.prevu && !r.saute && !r.remplace && !r.idee && planDe(r).length > 0);
}

/** Ce que le repas pèse dans le total du jour (repas non ajustable). */
export function contribution(r) {
  if (!r.duPlan) return 0;
  if (r.saute || r.remplace) return kcalPlan(r);          // neutre : ce n'est pas une « Autre idée »
  if (r.idee && !r.idee.confirme) return kcalPlan(r);     // idée en cours de choix : neutre
  return kcalDe(r.ings);                                  // mangé, idée confirmée, prévu
}

/** Total prévu du jour = somme des repas du plan (version coach). */
export const totalPlanJour = (liste) => liste.filter(r => r.duPlan).reduce((s, r) => s + kcalPlan(r), 0);

/** Total du jour tel qu'il sera si le client suit le journal (repas sautés / autre chose neutres). */
export const totalJourPrevu = (liste) => liste.filter(r => r.duPlan).reduce((s, r) => s + contribution(r), 0);

const pas = (ing) => (DB[ing.name] && DB[ing.name].unit) ? 1 : 5;
const arrondir = (ing, q) => {
  const p = pas(ing);
  return Math.max(p, Math.round(q / p) * p);
};

/**
 * Met à l'échelle une liste de groupes d'aliments (un groupe = un repas) pour
 * atteindre `cible` kcal au total : ratio commun, arrondi, puis ajustement fin.
 * @returns tableaux d'ings (même ordre)
 */
export function mettreAEchelle(groupes, cible) {
  const base = groupes.reduce((s, g) => s + kcalDe(g), 0);
  const ratio = base > 0 ? Math.max(0, cible / base) : 1;
  const cur = groupes.map(g => g.map(i => ({ ...i, portion: arrondir(i, (parseFloat(i.portion) || 0) * ratio) })));
  let k = cur.reduce((s, g) => s + kcalDe(g), 0);
  for (let n = 0; n < 400 && Math.abs(k - cible) > 1; n++) {
    let best = null;
    cur.forEach((g, gi) => g.forEach((i, ii) => {
      const p = pas(i);
      const avant = macrosOf(i).kcal;
      for (const dir of [1, -1]) {
        const q = i.portion + dir * p;
        if (q < p) continue;
        // Ne pas tordre un aliment : on reste dans ±60 % de sa quantité mise à l'échelle.
        const orig = (parseFloat(groupes[gi][ii].portion) || 0) * ratio;
        if (orig > 0 && (q > orig * 1.6 + p || q < orig * 0.4 - p)) continue;
        const nk = k - avant + macrosOf({ ...i, portion: q }).kcal;
        const e = Math.abs(nk - cible);
        if (e < Math.abs(k - cible) - 0.05 && (!best || e < best.e)) best = { gi, ii, q, nk, e };
      }
    }));
    if (!best) break;
    cur[best.gi][best.ii].portion = best.q; k = best.nk;
  }
  return cur;
}

/**
 * Recalcule les repas encore prévus du jour pour que le total retombe sur le
 * total du plan. Si aucune idée confirmée / aucun écart : les repas ajustés
 * reviennent exactement au plan.
 * @returns { liste, ajustes: [ids], ecartReparti, cibleRestante, sansRepasRestant }
 */
export function recalerJour(liste) {
  const T = totalPlanJour(liste);
  const adj = liste.filter(estAjustable);
  const fixe = liste.filter(r => r.duPlan && !estAjustable(r)).reduce((s, r) => s + contribution(r), 0);
  const cibleRest = T - fixe;
  const base = adj.reduce((s, r) => s + kcalPlan(r), 0);
  if (adj.length === 0) return { liste, ajustes: [], ecartReparti: 0, cibleRestante: cibleRest, sansRepasRestant: true };
  if (Math.abs(cibleRest - base) < 1) {
    // Rien à compenser : retour exact au plan.
    const out = liste.map(r => {
      if (!estAjustable(r) || !r.ingsOrig) return r;
      const n = { ...r, ings: r.ingsOrig.map(i => ({ ...i })) };
      delete n.ingsOrig; delete n.ajuste;
      return n;
    });
    return { liste: out, ajustes: [], ecartReparti: 0, cibleRestante: cibleRest, sansRepasRestant: false };
  }
  const nouv = mettreAEchelle(adj.map(planDe), cibleRest);
  const parId = new Map(adj.map((r, k) => [r.id, nouv[k]]));
  const out = liste.map(r => {
    if (!parId.has(r.id)) return r;
    const plan = planDe(r);
    return { ...r, ingsOrig: plan.map(i => ({ ...i })), ings: parId.get(r.id), ajuste: { kcalPlan: Math.round(kcalDe(plan)) } };
  });
  return { liste: out, ajustes: adj.map(r => r.id), ecartReparti: Math.round(cibleRest - base), cibleRestante: cibleRest, sansRepasRestant: false };
}

/**
 * « Je choisis ce repas » : confirme l'idée du repas `id`, puis compense.
 * S'il ne reste aucun repas à ajuster (dernier repas), option A : l'idée
 * elle-même est calée sur les kcal du plan de ce repas.
 * @param calerIdee optionnel (nomIdee, cible) -> { ings } | null (caler() de autre-idee.js)
 */
export function confirmerIdeeJour(liste, id, calerIdee) {
  let l = liste.map(r => r.id === id && r.idee ? { ...r, idee: { ...r.idee, confirme: true } } : r);
  const x = l.find(r => r.id === id);
  if (!x || !x.idee) return { liste, mode: null };
  const restants = l.filter(estAjustable);
  if (restants.length === 0) {
    const cible = kcalPlan(x);
    let ings = null;
    const c = calerIdee && calerIdee(x.idee.nom, cible);
    if (c && c.ings) ings = c.ings.map(i => ({ name: i.name, portion: i.portion }));
    if (!ings || Math.abs(kcalDe(ings) - cible) > 2) ings = mettreAEchelle([x.ings], cible)[0];
    ings = ings.map((i, k) => ({ ...i, id: (x.ings[k] && x.ings[k].id) || (id * 1000 + 900 + k) }));
    l = l.map(r => r.id === id ? { ...r, ings, idee: { ...r.idee, calee: true } } : r);
    return { liste: l, mode: 'A', ajustes: [id] };
  }
  const res = recalerJour(l);
  return { liste: res.liste, mode: 'B', ajustes: res.ajustes, ecartReparti: res.ecartReparti };
}
