import { signal } from '@preact/signals';
import { seancePrevue } from './programme.js';
import { SESSION_EXOS } from '../data/sessionExos.js';
import { EXERCISES } from '../data/exercices.js';
import { aujourdhuiBxl } from './plans-par-date.js';

export const adaptationsJour = signal(null);

function isoJour() {
  return aujourdhuiBxl();
}

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const RISQUE_GENOU = /\b(squat|fentes?|hack squat|presse a cuisses|extension jambes)\b/;

function trouver(nom) {
  const cible = norm(nom);
  for (const mKey of Object.keys(EXERCISES)) {
    const i = (EXERCISES[mKey] || []).findIndex((e) => norm(e.nom) === cible);
    if (i >= 0) return { mKey, i, nom: EXERCISES[mKey][i].nom };
  }
  return null;
}

const ALTS_GENOU = [
  trouver('Leg Curl Assis (Machine)'),
  trouver('Leg Curl Allonge (Machine)') || trouver('Leg Curl Allongé (Machine)'),
  trouver('Hip Thrust (Barre)'),
].filter(Boolean);

export function proposerAdaptation(phrase, refsLibre) {
  const n = norm(phrase);
  const genou = /\bmal au genou/.test(n)
    || (/\b(genou|genoux|knee)\b/.test(n) && /\b(mal|douleur|blesse|evite|eviter)\b/.test(n));
  if (!genou) return null;

  const libre = Array.isArray(refsLibre) ? refsLibre : [];
  if (libre.length) {
    const swaps = [];
    let k = 0;
    libre.forEach((r, idx) => {
      const ex = EXERCISES[r.mKey] && EXERCISES[r.mKey][r.i];
      if (!ex || !RISQUE_GENOU.test(norm(ex.nom))) return;
      const vers = ALTS_GENOU[k % ALTS_GENOU.length];
      k += 1;
      if (!vers) return;
      swaps.push({
        source: 'libre',
        idx,
        deNom: ex.nom,
        versNom: vers.nom,
        vers: { mKey: vers.mKey, i: vers.i },
      });
    });
    if (!swaps.length) {
      return {
        motif: 'genou',
        titre: 'Ma seance',
        swaps: [],
        texte: 'Ta seance actuelle n\u2019a pas de squat, fentes ou presse. Rien a changer.',
      };
    }
    return {
      motif: 'genou',
      titre: 'Ma seance',
      swaps,
      texte: 'Pour le genou, on remplace seulement ces mouvements dans Ma seance. Le programme ne bouge pas.',
    };
  }

  const prevue = seancePrevue(isoJour());
  if (!prevue) {
    return {
      motif: 'genou',
      titre: 'Ma seance',
      swaps: [],
      texte: 'Compose d\u2019abord ta seance (S\u2019entrainer), ou ecris-le ici quand squat / fentes sont dans la liste.',
    };
  }
  const refs = SESSION_EXOS[prevue.seanceId] || [];
  const swaps = [];
  let k = 0;
  refs.forEach((ref) => {
    const nom = String(ref).split(':').slice(1).join(':');
    if (!RISQUE_GENOU.test(norm(nom))) return;
    const vers = ALTS_GENOU[k % ALTS_GENOU.length];
    k += 1;
    if (!vers) return;
    swaps.push({
      source: 'programme',
      de: ref,
      deNom: nom,
      versNom: vers.nom,
      vers: { mKey: vers.mKey, i: vers.i },
    });
  });
  if (!swaps.length) {
    return {
      motif: 'genou',
      titre: prevue.titre,
      swaps: [],
      texte: 'Seance programme : ' + prevue.titre + '. Rien de risqué pour le genou.',
    };
  }
  return {
    motif: 'genou',
    titre: prevue.titre,
    swaps,
    texte: 'Seance programme : ' + prevue.titre + '. On change ces mouvements aujourd\u2019hui seulement.',
  };
}
