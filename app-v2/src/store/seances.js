import { signal, effect } from '@preact/signals';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';
import { aujourdhuiBxl } from './plans-par-date.js';

// ============================================================
// STORE DES SEANCES ENREGISTREES
// Une seance = ce qui reste une fois l'entrainement termine :
//   { id, iso, ts, titre, duree, muscles, exos, nbSeries, tonnage, records }
//   - duree   : secondes
//   - exos    : [{ nom, mKey, sets:[{w,r}] }]
//   - records : noms des exercices ou un nouveau max a ete pose
// Persiste dans users/{uid}.v2Data.seances, meme mecanique
// local-first que le journal et le calendrier des muscles.
// ============================================================

export const seances = signal([]);
export const seancesPretes = signal(false);

// Plafond : une seance pese ~400 octets, 300 tiennent largement
// dans le document Firestore sans menacer la limite de 1 Mo.
const MAX_SEANCES = 300;

// L'ancien journal v1 vivait sous une cle localStorage GLOBALE,
// donc partagee par tous les comptes de l'appareil. On ne la reprend
// qu'une seule fois, pour le premier compte qui se connecte : sans ce
// marqueur, un deuxieme compte heriterait des seances du premier.
const CLE_V1 = 'repz_sessionLog';
const MARQUE_REPRISE = 'belfit_v2_seances_reprises';

function tonnageDe(exos) {
  let t = 0;
  (exos || []).forEach(e => (e.sets || []).forEach(s => {
    const w = parseFloat(s.w), r = parseInt(s.r, 10);
    if (!isNaN(w) && !isNaN(r)) t += w * r;
    const dw = parseFloat(s.dw), dr = parseInt(s.dr, 10);
    if (!isNaN(dw) && !isNaN(dr)) t += dw * dr;
  }));
  return Math.round(t);
}

function nbSeriesDe(exos) {
  return (exos || []).reduce((n, e) => n + ((e.sets || []).length), 0);
}

/** Seances du journal v1, converties au format v2. */
function reprendreV1() {
  try {
    if (localStorage.getItem(MARQUE_REPRISE)) return [];
    const brut = localStorage.getItem(CLE_V1);
    localStorage.setItem(MARQUE_REPRISE, '1');
    if (!brut) return [];
    const vieilles = JSON.parse(brut);
    if (!Array.isArray(vieilles)) return [];
    return vieilles.map((s, i) => ({
      id: 'v1-' + (s.ts || i),
      iso: s.iso || aujourdhuiBxl(new Date(s.ts || Date.now())),
      ts: s.ts || Date.now(),
      titre: s.titre || 'Séance',
      duree: s.duree || 0,
      muscles: [],           // le format v1 ne les portait pas
      exos: s.exos || [],
      nbSeries: nbSeriesDe(s.exos),
      tonnage: tonnageDe(s.exos),
      records: [],
    }));
  } catch (e) { return []; }
}

let uidSe = null, pretSe = false;

effect(() => {
  const u = identite.value;

  // Identite momentanement nulle = rafraichissement de jeton ou
  // coupure reseau, PAS une deconnexion. On bloque les ecritures mais
  // on garde uidSe : sans ca, chaque clignotement relancait un
  // chargement concurrent, et le plus lent ecrasait le plus complet.
  if (!u) { pretSe = false; seancesPretes.value = false; return; }

  if (u === uidSe) {
    // Meme compte, donnees deja en memoire : rien a recharger.
    if (pretSe) return;
    if (seances.value.length) { pretSe = true; seancesPretes.value = true; return; }
  } else {
    // Vrai changement de compte : on vide, sinon les seances du
    // precedent seraient reecrites dans le document du suivant.
    seances.value = [];
  }

  uidSe = u; pretSe = false; seancesPretes.value = false;
  chargerDonnees(u).then(d => {
    if (uidSe !== u) return;
    const chargees = (d && Array.isArray(d.seances)) ? d.seances : null;

    // Une lecture qui ne rapporte rien n'efface jamais ce qu'on a
    // deja : elle peut avoir ete lancee avant la derniere ecriture.
    if (!chargees && seances.value.length) { pretSe = true; seancesPretes.value = true; return; }

    const reprises = chargees ? [] : reprendreV1();
    seances.value = chargees || reprises;
    pretSe = true;
    seancesPretes.value = true;
    // La reprise n'a lieu qu'une fois : on la persiste tout de suite,
    // sinon le marqueur la rendrait irrecuperable au prochain demarrage.
    if (reprises.length) sauvegarder(u, { seances: reprises });
  });
});

effect(() => {
  const l = seances.value;
  const u = identite.value;
  if (!u || !pretSe) return;
  sauvegarder(u, { seances: l });
});

/**
 * Enregistre une seance terminee. Les champs derives (tonnage,
 * nombre de series) sont calcules ici : l'ecran de liste n'aura
 * rien a recalculer.
 */
export function enregistrerSeance(s) {
  const seance = {
    id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 7),
    iso: s.iso || aujourdhuiBxl(),
    ts: Date.now(),
    titre: s.titre || 'Séance',
    duree: s.duree || 0,
    muscles: s.muscles || [],
    exos: s.exos || [],
    nbSeries: nbSeriesDe(s.exos),
    tonnage: typeof s.tonnage === 'number' ? s.tonnage : tonnageDe(s.exos),
    records: s.records || [],
  };
  // La plus recente en tete : c'est l'ordre d'affichage attendu.
  seances.value = [seance, ...seances.value].slice(0, MAX_SEANCES);
  // Le calendrier et le mannequin lisent cette liste EN DIRECT, via
  // services/muscles-jour.js. La seance n'ecrit plus ses muscles dans
  // muscleLog : recopier fondait les deux sources, et supprimer la
  // seance laissait alors sa couleur sur le jour a jamais (Raci,
  // 22/08 : « il m'affiche 4 muscles, c'est faux »).
  return seance;
}

export function supprimerSeance(id) {
  seances.value = seances.value.filter(s => s.id !== id);
}

/**
 * La seance deja enregistree ce jour-la sous le meme nom, s'il y en a
 * une. Raci, 5/09 : plutot qu'un remplacement automatique dans une
 * fenetre de cinq minutes — qui decidait a sa place et ratait la
 * correction faite deux heures plus tard — l'appelant demande. C'est
 * lui qui sait s'il refait la seance ou s'il corrige la precedente.
 */
export function seanceMemeJour(iso, titre) {
  return seances.value.find(s => s.iso === iso && s.titre === titre) || null;
}

/**
 * Efface tout l'historique. Raci, 5/09 : « il m'est impossible de
 * supprimer toutes les seances en une fois » — apres une serie
 * d'essais, il fallait les retirer une par une. L'appelant demande
 * confirmation : rien ici ne peut etre annule.
 */
export function viderSeances() {
  seances.value = [];
}

export function seancesDuJour(iso) {
  return seances.value.filter(s => s.iso === iso);
}
