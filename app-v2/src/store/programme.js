import { signal, effect } from '@preact/signals';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';
import { PROGRAMMES } from '../data/programmes.js';

// `programmeParId` existe aussi dans data/programmes.js ; on garde un
// nom distinct pour eviter deux imports homonymes dans un composant.

// ============================================================
// PROGRAMME ACTIF
//
// Demande de Raci le 10/08 : « le programme créé dans Créer mon
// programme apparaît dans le calendrier, donc prévoir date lors de
// la création ».
//
// Cette notion n'existait NULLE PART avant : le questionnaire
// recommandait un programme, ouvrait sa fiche, et rien n'etait
// retenu. L'application ne savait pas quel programme on suivait, donc
// ne pouvait ni proposer la seance du jour ni colorer le calendrier a
// l'avance.
//
// Ce qui existait deja et n'est pas refait : les 86 seances avec
// leurs listes d'exercices (data/sessionExos.js, cles `{progId}-{n}`).
// Seul le lien manquait.
//
// FORME : { id, jours, depuis }
//   id     — identifiant du programme, ex. 'masse-3j'
//   jours  — AFFECTATION explicite { jourSemaine: indexSeance },
//            0 = dimanche … 6 = samedi. Exemple : { 1:2, 3:0, 5:1 }
//            met la seance 3 le lundi, la 1 le mercredi, la 2 le
//            vendredi.
//
//            C'etait auparavant un simple tableau de jours, ou la
//            position imposait la seance : le premier jour coche
//            recevait la seance 1, le deuxieme la seance 2, etc.
//            Raci le 10/08 : « je veux moi pouvoir dire quel jour,
//            quel muscle, dans quel ordre ». Un ordre impose n'a
//            aucune raison d'etre — on peut vouloir les jambes le
//            lundi et les pecs le vendredi.
//   depuis — date d'adoption (ISO), pour dater le calendrier.
//
// La date decide de la seance du jour. C'est plus simple qu'un
// compteur de rotation, et surtout ca survit a une semaine sautee :
// le mercredi reste le mercredi.
// ============================================================

const isoDuJour = (d) => d.getFullYear() + '-'
  + String(d.getMonth() + 1).padStart(2, '0') + '-'
  + String(d.getDate()).padStart(2, '0');

export const programmeActif = signal(null);

/**
 * Seances posees a la main sur une date precise, hors programme.
 * { '2026-08-18': { seanceId, titre } }
 *
 * Raci le 10/08 : « en cliquant sur une des dates je pourrais
 * programmer une seance ». Le programme donne un rythme hebdomadaire
 * regulier ; ceci sert a tout ce qui n'y rentre pas — rattraper une
 * seance sautee, caler un jour en plus avant les vacances, poser une
 * seance enregistree un jour precis. Une date posee ici PRIME sur le
 * programme : c'est une decision explicite contre une regle.
 */
export const planifs = signal({});

/**
 * Nombre de seances qu'un compte gratuit peut avoir PLANIFIEES a la
 * fois. Precision de Raci le 10/08 : « un utilisateur gratuit peut
 * programmer maximum 4 seances a la fois ; s'il en veut une 5e, il
 * doit payer ». Ce n'est donc pas une limite sur le programme lui-
 * meme mais sur ce qui est pose au calendrier : au 5e jour coche, un
 * message s'affiche au lieu de la coche.
 */
// Raci, 31/10 : l'entrainement est entierement libre. Plus de quota :
// un compte non Premium planifie autant de seances qu'il veut.
export const SEANCES_LIBRES = Infinity;

/** Peut-on encore planifier une seance de plus sans Premium ? */
export function quotaAtteint(nbDejaChoisi, premium) {
  return false;
}

/** Le programme, retrouve par son identifiant. */
export function progParId(id) {
  for (const liste of Object.values(PROGRAMMES)) {
    const p = liste.find(x => x.id === id);
    if (p) return p;
  }
  return null;
}

/**
 * Un programme depasse-t-il le quota gratuit ? Un programme 5j ou 6j
 * demande cinq ou six seances planifiees, donc Premium. C'est le
 * meme quota vu depuis le programme plutot que depuis le calendrier.
 */
export function exigePremium(id) {
  const p = progParId(id);
  return false;
}

let uidP = null, pretP = false;

effect(() => {
  const u = identite.value;
  if (!u) { pretP = false; return; }
  if (u === uidP && pretP) return;
  if (u !== uidP) programmeActif.value = null;
  uidP = u; pretP = false;
  chargerDonnees(u).then(d => {
    if (uidP !== u) return;
    // Le local prime s'il a deja quelque chose : une adoption faite
    // hors ligne ne doit pas etre effacee par un nuage plus ancien.
    programmeActif.value = programmeActif.value || (d && d.programmeActif) || null;
    if (!Object.keys(planifs.value).length) planifs.value = (d && d.planifs) || {};
    pretP = true;
  });
});

function ecrire(v) {
  programmeActif.value = v;
  const u = identite.value;
  if (u) sauvegarder(u, { programmeActif: v });
}

/** Adopter un programme, avec ses jours de la semaine. */
/**
 * Adopter un programme. `jours` est une affectation
 * { jourSemaine: indexSeance }. Un tableau est encore accepte —
 * ancienne forme, position = seance — et converti, pour ne pas
 * perdre les programmes adoptes avant le 10/08.
 */
export function adopterProgramme(id, jours) {
  const p = progParId(id);
  if (!p) return null;
  const aff = normaliserJours(jours, p.seances.length);
  if (!Object.keys(aff).length) return null;
  const v = { id, jours: aff, depuis: isoDuJour(new Date()) };
  ecrire(v);
  return v;
}

/** Accepte l'ancienne forme (tableau) comme la nouvelle (objet). */
export function normaliserJours(jours, nbSeances) {
  const aff = {};
  if (Array.isArray(jours)) {
    [...new Set(jours)].filter(j => j >= 0 && j <= 6).sort((a, b) => a - b)
      .slice(0, nbSeances)
      .forEach((j, i) => { aff[j] = i; });
    return aff;
  }
  for (const [j, i] of Object.entries(jours || {})) {
    const nj = Number(j), ni = Number(i);
    if (nj >= 0 && nj <= 6 && ni >= 0 && ni < nbSeances) aff[nj] = ni;
  }
  return aff;
}

/**
 * Abandonner le programme en cours.
 *
 * Seule l'ADOPTION est annulee : les seances deja faites restent au
 * journal et au calendrier, elles ont eu lieu. Ce qui disparait, ce
 * sont les seances a VENIR que le programme posait sur les jours.
 */
export function abandonnerProgramme() { ecrire(null); }

/**
 * La seance prevue un jour donne, ou null si ce jour est un repos.
 * Retourne { seanceId, titre, sub, index, prog }.
 *
 * On ne planifie rien AVANT la date d'adoption : le calendrier ne
 * doit pas se remplir retroactivement de seances jamais prevues.
 */
/** Poser ou retirer une seance a la main sur une date. */
export function planifierSeance(iso, seance) {
  const p = { ...planifs.value };
  if (seance) {
    p[iso] = { seanceId: seance.seanceId, titre: seance.titre, sub: seance.sub || '' };
    // Seance composee par le coach : ses exercices et son schema
    // voyagent avec elle (23/09), elle n'existe dans aucun programme.
    if (seance.exos) p[iso].exos = seance.exos;
    if (seance.schema) p[iso].schema = seance.schema;
  }
  else delete p[iso];
  planifs.value = p;
  const u = identite.value;
  if (u) sauvegarder(u, { planifs: p });
}

export function seancePrevue(iso) {
  // Une seance posee a la main passe avant le programme.
  const pose = planifs.value[iso];
  if (pose) return { ...pose, index: -1, prog: null, main: true };

  const a = programmeActif.value;
  if (!a || !a.jours) return null;
  if (a.depuis && iso < a.depuis) return null;
  const p = progParId(a.id);
  if (!p) return null;
  const parts = iso.split('-').map(Number);
  const jour = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
  const aff = normaliserJours(a.jours, p.seances.length);
  const index = aff[jour];
  if (index === undefined || index >= p.seances.length) return null;
  const s = p.seances[index];
  return { seanceId: `${a.id}-${index}`, titre: s.titre, sub: s.sub, index, prog: p };
}

/** Les muscles d'une seance prevue, deduits de son titre. */
const MOTS = {
  pecs: ['pec', 'poitrine', 'push'], dos: ['dos', 'pull'], epaules: ['épaule', 'epaule'],
  // Trapezes : groupe a part depuis le 26/08, ils doivent se deduire
  // d'un titre comme les autres.
  trapezes: ['trapèze', 'trapeze', 'shrug'],
  biceps: ['biceps'], triceps: ['triceps'], jambes: ['jambe', 'legs', 'quadri', 'fessier'],
  abdos: ['abdo', 'gainage', 'core'], cardio: ['cardio', 'circuit', 'hiit'],
};
export function musclesPrevus(titre) {
  const t = (titre || '').toLowerCase();
  const out = [];
  for (const [k, mots] of Object.entries(MOTS)) {
    if (mots.some(m => t.includes(m))) out.push(k);
  }
  // « Full body » ne nomme aucun muscle mais les travaille tous :
  // sans ce cas, un programme full body laissait le calendrier vide.
  if (!out.length && /full|complet/.test(t)) return ['pecs', 'dos', 'jambes'];
  return out;
}
