import { signal, effect } from '@preact/signals';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';

// ============================================================
// CARNET DU COACHING ENTRAINEMENT (21/11, Raci).
// Ce que le client note sur le programme envoye par le coach :
//   { 'AAAA-MM-JJ|idSeance': { date, seance, le,
//       exos: { idExo: { nom, kg, detail, disques?, faites: [bool] } } } }
// Vit dans v2Data.carnetCoach (ecrivable par le client), lu par
// l'espace coach (fonction espaceCoach, champ « carnet »).
// On garde les 120 dernieres seances.
// ============================================================

export const carnetCoach = signal({});
/** Le carnet du compte a ete lu (la saisie repart alors des vrais poids). */
export const carnetCharge = signal(false);
let uidC = null, pretC = false;

effect(() => {
  const u = identite.value;
  if (!u) { pretC = false; return; }
  if (u === uidC && pretC) return;
  if (u !== uidC) { carnetCoach.value = {}; carnetCharge.value = false; }
  uidC = u; pretC = false;
  chargerDonnees(u).then((d) => {
    if (uidC !== u) return;
    const distant = (d && d.carnetCoach) || {};
    carnetCoach.value = { ...distant, ...carnetCoach.value };
    pretC = true;
    carnetCharge.value = true;
  });
});

/** Enregistre une seance (remplace la meme seance du meme jour). */
export function noterSeance(cle, entree) {
  const tout = { ...carnetCoach.value, [cle]: entree };
  const cles = Object.keys(tout).sort();
  while (cles.length > 120) delete tout[cles.shift()];
  carnetCoach.value = tout;
  const u = identite.value;
  if (u) sauvegarder(u, { carnetCoach: tout });
}

/** Derniere valeur notee pour cet exercice (hors cle exclue). */
export function dernierPour(idExo, exclure) {
  const c = carnetCoach.value;
  const cles = Object.keys(c).sort().reverse();
  for (const k of cles) {
    if (k === exclure) continue;
    const x = c[k] && c[k].exos && c[k].exos[idExo];
    if (x && (x.kg !== null && x.kg !== undefined || (x.disques && x.disques.length))) return x;
  }
  return null;
}
