import { signal, effect } from '@preact/signals';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';
import { EXERCISES, MUSCLES } from '../data/exercices.js';
import { selectionExos, poserBrouillon, abandonnerSeance, seanceActive, ETAT } from './seance-active.js';

// ============================================================
// MES SEANCES — Raci, 13/11 (« creer une seance carrement », comme
// les routines de Hevy).
//
// Une seance composee une fois, nommee, relancee en un toucher. Elle
// est rangee PAR NOM d'exercice ('pecs:Developpe Couche (Barre)'),
// jamais par position : la base peut bouger (traductions, doublons
// retires le 12/11), le nom reste le repere le plus stable. C'est le
// meme format que les seances des programmes (sessionExos.js).
//
//   { id, nom, exos: ['mKey:nom', ...], ts }
//
// Synchronisee avec le compte (champ v2Data.mesSeances) : on la
// retrouve sur un autre telephone.
// ============================================================

export const mesSeances = signal([]);

// Seance en cours de creation ou de modification, hors du brouillon
// du jour : composer une seance a enregistrer ne doit pas toucher a
// celle qu'on a peut-etre deja commencee.
//   { id: null | id existant, nom, ordre: [{ mKey, i }] }
export const creation = signal(null);

let uid = null, pret = false;

effect(() => {
  const u = identite.value;
  if (!u) { pret = false; return; }
  if (u === uid && pret) return;
  uid = u; pret = false;
  chargerDonnees(u).then((d) => {
    if (uid !== u) return;
    mesSeances.value = (d && Array.isArray(d.mesSeances)) ? d.mesSeances : [];
    pret = true;
  });
});

function ecrire(liste) {
  mesSeances.value = liste;
  const u = identite.value;
  if (u) sauvegarder(u, { mesSeances: liste });
}

/** 'mKey:nom' -> { mKey, i }, ou null si l'exercice n'existe plus. */
function refDe(s) {
  const k = s.indexOf(':');
  if (k < 0) return null;
  const mKey = s.slice(0, k), nom = s.slice(k + 1);
  const i = (EXERCISES[mKey] || []).findIndex((e) => e.nom === nom);
  return i < 0 ? null : { mKey, i };
}

export function refsDe(seance) {
  return (seance.exos || []).map(refDe).filter(Boolean);
}

/** Les muscles d'une seance, dans l'ordre de la base, sans doublon. */
export function musclesDe(seance) {
  const ks = new Set((seance.exos || []).map((s) => s.split(':')[0]));
  return MUSCLES.filter((m) => ks.has(m.key)).map((m) => m.label);
}

/** Nom propose quand on n'en tape pas : les muscles travailles. */
export function nomPropose(ordre) {
  const ks = new Set(ordre.map((r) => r.mKey));
  const noms = MUSCLES.filter((m) => ks.has(m.key)).map((m) => m.label);
  return noms.slice(0, 3).join(' · ') || 'Ma séance';
}

export function commencerCreation(seance) {
  creation.value = seance
    ? { id: seance.id, nom: seance.nom, ordre: refsDe(seance) }
    : { id: null, nom: '', ordre: [] };
}

export function basculerCreation(mKey, i) {
  const c = creation.value;
  if (!c) return;
  const deja = c.ordre.some((r) => r.mKey === mKey && r.i === i);
  creation.value = {
    ...c,
    ordre: deja ? c.ordre.filter((r) => !(r.mKey === mKey && r.i === i)) : c.ordre.concat([{ mKey, i }]),
  };
}

/** Enregistre la seance en creation. Retourne false si elle est vide. */
export function enregistrerCreation(nom) {
  const c = creation.value;
  if (!c || !c.ordre.length) return false;
  const exos = c.ordre.map((r) => r.mKey + ':' + EXERCISES[r.mKey][r.i].nom);
  const propre = String(nom || '').trim() || nomPropose(c.ordre);
  const liste = mesSeances.value.slice();
  const k = c.id ? liste.findIndex((s) => s.id === c.id) : -1;
  const s = { id: c.id || ('ms-' + Date.now()), nom: propre, exos, ts: Date.now() };
  if (k >= 0) liste[k] = s; else liste.unshift(s);
  ecrire(liste);
  creation.value = null;
  return true;
}

export function supprimerMaSeance(id) {
  ecrire(mesSeances.value.filter((s) => s.id !== id));
  if (creation.value && creation.value.id === id) creation.value = null;
}

/**
 * Pose la seance comme seance du jour, prete a demarrer. Une seance
 * deja commencee n'est remplacee qu'apres confirmation.
 */
export function lancerMaSeance(seance) {
  const refs = refsDe(seance);
  if (!refs.length) return false;
  const a = seanceActive.value;
  if (a && a.etat === ETAT.EN_COURS
    && !window.confirm('Une séance est déjà en cours. La remplacer par « ' + seance.nom + ' » ?')) return false;
  if (a && (a.etat === ETAT.EN_COURS || a.etat === ETAT.BROUILLON)) abandonnerSeance();
  const sel = {};
  refs.forEach((r) => { (sel[r.mKey] = sel[r.mKey] || new Set()).add(r.i); });
  selectionExos.value = sel;
  poserBrouillon({ refs, origine: 'libre', titre: seance.nom });
  return true;
}
