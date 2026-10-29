// ACCES NUTRITION — blocage de l'Alimentation sans acces actif (option B,
// choisie par Raci le 27/10 : historique en LECTURE SEULE, plus aucune
// ecriture alimentaire, carte d'offre sobre).
//
// Source de verite : le champ serveur `accesNutritionJusqu` (Timestamp) de
// users/{uid}. Il n'est ecrit que par le serveur (voir firestore.rules).
//
// DEUX INTERRUPTEURS (le blocage n'existe que si l'un des deux est vrai) :
//   - BLOCAGE_ALIMENTATION (ce fichier) : true depuis v639 (allumage 29/10, OK Raci).
//   - config/acces { blocage: true } (Firestore) : l'interrupteur serveur.
// Tant qu'aucun n'est vrai, l'application se comporte exactement comme avant.
import { signal, computed } from '@preact/signals';

export const BLOCAGE_ALIMENTATION = true;

const CLE_ACCES = 'belfit_v2_acces_nutrition_';
const CLE_BLOCAGE = 'belfit_v2_blocage_distant';

/** Acces sans fin : 9999-12-31 (comptes proprietaire et coach). */
export const FIN_ILLIMITEE_MS = Date.UTC(9999, 11, 31);

/** Cles de v2Data qui relevent de l'alimentation. DOIT rester identique a
 *  firestore.rules (nutriCles) — verifie par tools/test-acces-nutrition.mjs.
 *  Non listees = libres : seances, programmes, poids, eau, reglages. */
export const CLES_NUTRITION = [
  'repas', 'objectifs', 'calculBaseFait', 'poidsCalcul', 'profilBesoins',
  'rappelIgnoreA', 'favoris', 'usages', 'plats', 'customFoods', 'courses', 'histoJours',
];

/** Banc d'essai uniquement : force un etat simule ('ouvert' | 'ferme' | 'expire'). */
export const etatSimule = signal(null);
/** Banc d'essai uniquement : simule le bouton d'achat ouvert (true) ou ferme (false). */
export const commandesSimulees = signal(null);

/** Acces connu pour le compte courant. pret=false tant que le serveur n'a pas repondu
 *  (et qu'aucune copie locale n'existe). jusqu = ms, ou null (jamais eu d'acces). */
export const accesNutrition = signal({ pret: false, jusqu: null });
/** Interrupteur serveur lu dans config/acces (copie locale au demarrage). */
export const blocageDistant = signal(lireBlocageLocal());
/** Horloge a la minute : un acces qui expire en cours de session ferme l'alimentation. */
const horloge = signal(Date.now());
if (typeof setInterval === 'function') {
  try { setInterval(() => { horloge.value = Date.now(); }, 60000); } catch (e) { /* tests */ }
}

function lireBlocageLocal() {
  try { return localStorage.getItem(CLE_BLOCAGE) === '1'; } catch (e) { return false; }
}

/** Timestamp Firestore / Date / ms / ISO -> ms (null si illisible). */
export function versMs(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'object' && typeof v.seconds === 'number') return v.seconds * 1000;
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? null : t;
}

/** Pur : l'acces est-il ouvert a `maintenant` ? */
export function accesOuvert(jusquMs, maintenant = Date.now()) {
  return typeof jusquMs === 'number' && jusquMs > maintenant;
}

/** Le blocage est-il applique ? */
export const blocageApplique = computed(() => BLOCAGE_ALIMENTATION || blocageDistant.value || etatSimule.value !== null);

function etatEffectif() {
  const sim = etatSimule.value;
  if (sim) {
    return { pret: true, jusqu: sim === 'ouvert' ? Date.now() + 30 * 864e5 : (sim === 'expire' ? Date.now() - 15 * 864e5 : null) };
  }
  return accesNutrition.value;
}

/** L'alimentation est fermee EN ECRITURE (historique en lecture seule).
 *  Tant que l'acces n'est pas connu, on ferme aussi (prudence) ; la carte
 *  d'offre, elle, n'apparait qu'une fois l'acces connu (voir offreVisible). */
export const lectureSeule = computed(() => {
  if (!blocageApplique.value) return false;
  const a = etatEffectif();
  if (!a.pret) return true;
  return !accesOuvert(a.jusqu, horloge.value);
});

/** La carte d'offre s'affiche : acces connu ET ferme. */
export const offreVisible = computed(() => {
  if (!blocageApplique.value) return false;
  const a = etatEffectif();
  return a.pret && !accesOuvert(a.jusqu, horloge.value);
});

/** 'jamais' (aucun acces n'a jamais ete ouvert) ou 'expire'. */
export const causeFermeture = computed(() => (etatEffectif().jusqu ? 'expire' : 'jamais'));
/** Date de fin (ms) de l'acces expire, ou null. */
export const finAccesMs = computed(() => etatEffectif().jusqu || null);

/** Non reactif : a appeler dans les actions (mutateurs) du store. */
export function ecritureBloquee() {
  return lectureSeule.peek();
}

/** Le cloud peut-il recevoir les cles nutrition ? (sync.js) */
export function cloudNutritionPermis() {
  return !lectureSeule.peek();
}

// ---- Alimentation du signal : serveur d'abord, copie locale en secours ----

export function lireCacheAcces(uid) {
  try {
    const brut = localStorage.getItem(CLE_ACCES + uid);
    if (brut === null) return null;
    const o = JSON.parse(brut);
    return { pret: true, jusqu: typeof o.jusqu === 'number' ? o.jusqu : null };
  } catch (e) { return null; }
}

/** Pose l'acces connu (reponse du serveur) et le garde pour le hors-ligne. */
export function poserAcces(uid, valeurServeur) {
  const jusqu = versMs(valeurServeur);
  accesNutrition.value = { pret: true, jusqu };
  try { localStorage.setItem(CLE_ACCES + uid, JSON.stringify({ jusqu })); } catch (e) {}
}

/** Au changement de compte / hors-ligne : repart de la copie locale (ou inconnu). */
export function chargerAccesLocal(uid) {
  accesNutrition.value = (uid && lireCacheAcces(uid)) || { pret: false, jusqu: null };
}

/** Invite sans compte : aucun acces, jamais. */
export function poserAccesInvite() {
  accesNutrition.value = { pret: true, jusqu: null };
}

export function poserBlocageDistant(actif) {
  blocageDistant.value = !!actif;
  try { localStorage.setItem(CLE_BLOCAGE, actif ? '1' : '0'); } catch (e) {}
}

/** Retire les cles nutrition d'un objet (copie). */
export function sansNutrition(o) {
  const r = { ...o };
  for (const k of CLES_NUTRITION) delete r[k];
  return r;
}
