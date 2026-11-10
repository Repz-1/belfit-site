import { muscleLog } from '../store/entrainement.js';
import { seances } from '../store/seances.js';
import { completerMusclesPecs } from '../store/programme.js';

// ============================================================
// MUSCLES D'UN JOUR — source unique.
//
// Raci, 22/08 : « si je clique sur le 21 aout il m'affiche 4 muscles,
// c'est faux ». La fiche ne lisait pourtant que le jour ouvert. Le
// defaut etait en amont : une seance terminee RECOPIAIT ses muscles
// dans muscleLog (store/seances.js -> noterMuscles). Deux sources
// fondues en une, et plus moyen de les separer ensuite :
//   - supprimer la seance laissait ses muscles colorer le jour pour
//     toujours ;
//   - un jour pouvait donc porter des muscles qu'aucune seance ni
//     aucune pastille ne justifie plus.
//
// Desormais muscleLog ne contient QUE le marquage manuel. Ce qui a
// ete fait se deduit des seances enregistrees, a la lecture. Rien
// n'est recopie, donc rien ne survit a une suppression.
// ============================================================

/** Muscles deduits d'une seance : ceux annonces + ceux de ses exercices. */
function musclesDeSeance(sa) {
  const out = [];
  (sa.muscles || []).forEach(k => { if (k && k !== 'repos') out.push(k); });
  (sa.exos || []).forEach(e => { if (e && e.mKey && e.mKey !== 'repos') out.push(e.mKey); });
  // Une seance pecs (developpes, pompes, chest) doit colorer les
  // pectoraux ET les triceps. Le muscle principal seul laissait
  // le bras arriere gris.
  completerMusclesPecs(out, sa && sa.titre).forEach(k => {
    if (k && !out.includes(k)) out.push(k);
  });
  return out;
}

/**
 * Compte par muscle pour UN jour : chaque pastille cochee vaut 1,
 * chaque exercice enregistre vaut 1. C'est ce compte qui donne son
 * intensite au mannequin.
 */
export function compteDuJour(iso) {
  const compte = {};
  (muscleLog.value[iso] || []).forEach(k => {
    if (k !== 'repos') compte[k] = (compte[k] || 0) + 1;
  });
  (seances.value || []).forEach(sa => {
    if (sa.iso !== iso) return;
    musclesDeSeance(sa).forEach(k => { compte[k] = (compte[k] || 0) + 1; });
  });
  return compte;
}

/** Liste sans doublon des muscles d'un jour, repos compris. */
export function musclesDuJour(iso) {
  const jour = new Set((muscleLog.value[iso] || []));
  (seances.value || []).forEach(sa => {
    if (sa.iso !== iso) return;
    musclesDeSeance(sa).forEach(k => jour.add(k));
  });
  // On ne se repose pas le jour ou l'on s'est entraine.
  if (jour.size > 1) jour.delete('repos');
  return [...jour];
}

/** { iso: [muscles] } sur tout l'historique — pour le calendrier et les stats. */
export function musclesParJour() {
  const out = {};
  Object.entries(muscleLog.value || {}).forEach(([iso, vals]) => {
    out[iso] = [...new Set((vals || []).filter(Boolean))];
  });
  (seances.value || []).forEach(sa => {
    const ded = musclesDeSeance(sa);
    if (!ded.length || !sa.iso) return;
    const jour = new Set((out[sa.iso] || []).filter(k => k !== 'repos'));
    ded.forEach(k => jour.add(k));
    out[sa.iso] = [...jour];
  });
  return out;
}
