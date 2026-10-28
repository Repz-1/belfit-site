import { signal, computed, effect } from '@preact/signals';
import { macrosOf } from '../data/aliments.js';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';
import { enregistrerJour } from './stats.js';
import { aujourdhuiBxl } from './plans-par-date.js';
import { ecritureBloquee, lectureSeule } from './acces-nutrition.js';

// ============================================================
// STORE DU JOURNAL v2
// - repas      : liste des repas du jour (source de verite)
// - objectifs  : kcal & macros cibles
// - totauxJour : derive automatiquement de repas
// - persistance localStorage 'belfit_v2_journal' (cle separee de
//   la v1 : le chantier ne touche jamais aux donnees du site live)
// ============================================================

const DEFAUTS = {
  eau: 0, // litres bus aujourd'hui
  objectifs: { kcal: 4300, prot: 217, carbs: 538, lip: 96 },
  repas: [
    { id: 1, nom: 'Petit déjeuner', type: 'repas', cle: 'pdej',  fixe: true, ings: [], ouvert: false },
    { id: 2, nom: 'Déjeuner',       type: 'repas', cle: 'dej',   fixe: true, ings: [], ouvert: false },
    { id: 3, nom: 'Dîner',          type: 'repas', cle: 'diner', fixe: true, ings: [], ouvert: false },
    { id: 4, nom: 'Collations',     type: 'collation', cle: 'snack', fixe: true, ings: [], ouvert: false },
  ],
};

export const repas = signal(structuredClone(DEFAUTS.repas));
export const objectifs = signal(structuredClone(DEFAUTS.objectifs));
export const eau = signal(0);
export const donneesPretes = signal(false);

// Date (ISO) de la journee actuellement affichee. Sert a la bascule
// automatique : le bouton « Commencer une nouvelle journee » a ete retire,
// c'est donc le changement de date qui archive et remet a zero.
export const dateJour = signal(aujourdhui());

// Le calcul de besoins de base est offert UNE fois a tout le monde :
// sans lui, un compte gratuit resterait fige sur les objectifs par defaut.
// Une fois consomme, le recalcul devient une fonction Premium.
export const calculBaseFait = signal(false);
// Poids (kg) saisi lors du dernier calcul de besoins : sert au rappel
// « ton objectif date de X kg » quand le poids reel s'en eloigne.
export const poidsCalcul = signal(null);

/**
 * Ce qui a ete saisi dans « Mes besoins », onglet Calcule.
 *
 * Le formulaire etait initialise en dur a 75 kg / 175 cm / 25 ans et
 * ne gardait rien : a chaque ouverture il repartait de ces valeurs,
 * jamais celles de l'utilisateur. Consequence, on ne pouvait plus
 * verifier ce qui avait produit ses objectifs, et une correction
 * fermee sans appliquer etait perdue (Raci, 02/09).
 */
export const profilBesoins = signal(null);
// Poids auquel le rappel de recalcul a ete ferme. Le rappel se tait
// jusqu'a ce que le poids s'en eloigne d'un nouveau seuil : on signale
// une fois, on n'insiste pas.
export const rappelIgnoreA = signal(null);
// Contenance de la bouteille du suivi d'hydratation (litres).
export const tailleBouteille = signal(1.5);
// Jour (UTC, comme dateJour) de la derniere saisie d'eau. Sert uniquement quand
// l'alimentation est fermee : la cloture est alors impossible, l'eau, elle,
// reste libre et repart de zero chaque jour.
export const eauDate = signal(null);

// 27/10 : « aujourd'hui » = jour de Bruxelles (etait le jour UTC, qui change
// a 01h/02h belges : la cloture et le clignotement arrivaient trop tard).
function aujourdhui() { return aujourdhuiBxl(); }

/**
 * 27/10 Raci : le journal affiche est-il celui d'un jour PASSE (a cloturer) ?
 * Des minuit a Bruxelles, les 24 h sont ecoulees : la cle de date du journal
 * (dateJour, desormais le jour de Bruxelles) est alors anterieure a aujourd'hui.
 * Un journal ouvert a 00h30 recoit directement la cle du nouveau jour : pas
 * de faux positif. Les anciennes cles (jour UTC, avant ce changement) ne sont
 * pas migrees : une ancienne cle « jour J » saisie entre 00h et 01h/02h le
 * jour J+1 est vue comme un journal de la veille, jusqu'a sa cloture (une
 * seule fois, le jour du deploiement).
 */
export function journalDUnJourPasse(cle, maintenant = new Date()) {
  if (!cle || typeof cle !== 'string') return false;
  return cle < aujourdhuiBxl(maintenant);
}

// --- Chargement par compte : quand l'utilisateur change (connexion),
// on charge SES donnees (cloud d'abord, local en secours). ---
let uidCharge = null;
effect(() => {
  const u = identite.value;
  if (!u) { donneesPretes.value = false; return; }
  if (u === uidCharge && donneesPretes.value) return;
  uidCharge = u;
  donneesPretes.value = false;
  chargerDonnees(u).then(d => {
    if (uidCharge !== u) return; // changement de compte entre-temps
    repas.value = migrerRepas(d && d.repas ? d.repas : structuredClone(DEFAUTS.repas));
    objectifs.value = d && d.objectifs
      ? completerMacros(d.objectifs, (d && typeof d.poidsCalcul === 'number') ? d.poidsCalcul : null)
      : structuredClone(DEFAUTS.objectifs);
    eau.value = d && typeof d.eau === 'number' ? d.eau : 0;
    eauDate.value = (d && typeof d.eauDate === 'string') ? d.eauDate : null;
    dateJour.value = (d && d.dateJour) || aujourdhui();
    calculBaseFait.value = !!(d && d.calculBaseFait);
    poidsCalcul.value = (d && typeof d.poidsCalcul === 'number') ? d.poidsCalcul : null;
    profilBesoins.value = (d && d.profilBesoins && typeof d.profilBesoins === 'object') ? d.profilBesoins : null;
    rappelIgnoreA.value = (d && typeof d.rappelIgnoreA === 'number') ? d.rappelIgnoreA : null;
    tailleBouteille.value = (d && typeof d.tailleBouteille === 'number') ? d.tailleBouteille : 1.5;
    donneesPretes.value = true;
  });
});


// ============================================================
// MIGRATION DES DONNEES EXISTANTES
// Les repas enregistres avant l'ajout des cles n'en ont pas :
// sans cle, ni illustration ni fourchette recommandee. On les
// rattache par leur nom, et on complete les repas fixes absents.
// ============================================================
const CLE_PAR_NOM = {
  'petit dejeuner': 'pdej', 'petit déjeuner': 'pdej', 'breakfast': 'pdej', 'ontbijt': 'pdej',
  'dejeuner': 'dej', 'déjeuner': 'dej', 'lunch': 'dej',
  'diner': 'diner', 'dîner': 'diner', 'dinner': 'diner', 'avondeten': 'diner',
  'snacks': 'snack', 'collations': 'snack', 'collation': 'snack', 'tussendoortjes': 'snack',
};

/** Cle d'illustration d'apres le nom d'un repas, meme ecrit librement
 *  (« Petit-déjeuner », « Collation de l'après-midi », « Dîner ») : les
 *  repas d'un plan coach en ont besoin pour garder leur logo (27/09). */
export function cleDuNom(nom) {
  const n = String(nom || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_]/g, ' ').trim();
  if (CLE_PAR_NOM[n]) return CLE_PAR_NOM[n];
  if (/petit|breakfast|ontbijt|matinal/.test(n)) return 'pdej';
  if (/collation|gouter|snack|en cas|tussendoor/.test(n)) return 'snack';
  if (/diner|souper|soir|dinner|avond/.test(n)) return 'diner';
  if (/dejeuner|lunch|midi/.test(n)) return 'dej';
  return null;
}

function migrerRepas(liste) {
  const sortie = liste.map(r => {
    if (r.cle) return r;
    const exacte = CLE_PAR_NOM[(r.nom || '').trim().toLowerCase()];
    if (exacte) return { ...r, cle: exacte, fixe: true };
    const cle = cleDuNom(r.nom);
    return cle ? { ...r, cle } : r;
  });

  // Les quatre repas fixes doivent exister : un ancien enregistrement
  // n'en contenait que trois.
  const presentes = new Set(sortie.map(r => r.cle).filter(Boolean));
  DEFAUTS.repas.forEach(def => {
    if (def.cle && !presentes.has(def.cle)) {
      const id = Math.max(0, ...sortie.map(r => r.id || 0)) + 1;
      sortie.push({ ...structuredClone(def), id });
    }
  });

  // Ordre de la reference : petit dejeuner, dejeuner, diner, collations,
  // puis les repas libres ajoutes par l'utilisateur.
  const rang = { pdej: 0, dej: 1, diner: 2, snack: 3 };
  return sortie.sort((a, b) => (rang[a.cle] ?? 99) - (rang[b.cle] ?? 99));
}

// --- Sauvegarde automatique par compte : local immediat + cloud differe. ---
effect(() => {
  const instantane = { repas: repas.value, objectifs: objectifs.value, eau: eau.value, dateJour: dateJour.value, calculBaseFait: calculBaseFait.value, poidsCalcul: poidsCalcul.value, profilBesoins: profilBesoins.value, rappelIgnoreA: rappelIgnoreA.value, tailleBouteille: tailleBouteille.value, eauDate: eauDate.value };
  const u = identite.value;
  if (!u || !donneesPretes.value) return; // ne pas ecraser avant le chargement
  sauvegarder(u, instantane);
});

// ---------- Derives ----------

export function totauxRepas(r) {
  const t = { kcal: 0, prot: 0, carbs: 0, lip: 0 };
  for (const ing of r.ings) {
    const m = macrosOf(ing);
    t.kcal += m.kcal; t.prot += m.prot; t.carbs += m.carbs; t.lip += m.lip;
  }
  return t;
}

// Repas « prevus » (plan coach charge dans le journal, 27/09) : ils ne
// comptent qu'une fois valides par « Terminer ». Sinon le cadran etait
// plein des le matin et ne servait plus a rien (Raci).
export const totauxJour = computed(() => {
  const t = { kcal: 0, prot: 0, carbs: 0, lip: 0 };
  for (const r of repas.value) {
    if (r.prevu || r.saute) continue;   // 22/10 : un repas saute compte 0
    const tr = totauxRepas(r);
    t.kcal += tr.kcal; t.prot += tr.prot; t.carbs += tr.carbs; t.lip += tr.lip;
  }
  return t;
});

// Peut etre NEGATIVE : c'est le depassement. Le borner a 0 masquait
// le surplus (l'anneau affichait « objectif atteint » a 4588/4300).
// Totaux du jour tels qu'AFFICHES : somme des totaux arrondis de chaque
// repas, pour que le compteur du jour soit exactement la somme des cartes
// que l'utilisateur a sous les yeux (meme principe que dans la page repas).
export const totauxJourAff = computed(() => {
  const t = { kcal: 0, prot: 0, carbs: 0, lip: 0 };
  for (const r of repas.value) {
    if (r.prevu || r.saute) continue;   // 22/10 : un repas saute compte 0
    const m = totauxRepas(r);
    t.kcal += Math.round(m.kcal); t.prot += Math.round(m.prot);
    t.carbs += Math.round(m.carbs); t.lip += Math.round(m.lip);
  }
  return t;
});

export const kcalRestantes = computed(() =>
  objectifs.value.kcal - totauxJourAff.value.kcal
);

// ---------- Actions ----------
// Chaque action remplace repas.value par une NOUVELLE liste :
// ce remplacement declenche la reactivite. Aucune mise a jour
// manuelle de l'ecran n'existe nulle part.

let prochainId = Date.now();

export function setPortion(repasId, ingId, portion) {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  repas.value = repas.value.map(r =>
    r.id !== repasId ? r : {
      ...r,
      ings: r.ings.map(i => i.id !== ingId ? i : { ...i, portion: parseFloat(portion) || 0 })
    }
  );
}

export function ajouterIngredient(repasId, name, portion = 100) {
  if (ecritureBloquee()) return null;   // blocage alimentation : lecture seule
  const id = ++prochainId;
  repas.value = repas.value.map(r =>
    r.id !== repasId ? r : { ...r, ings: [...r.ings, { id, name, portion }] }
  );
  return id;   // l'appelant peut ainsi donner le focus a la nouvelle ligne
}

/**
 * Ajoute un plat enregistre a un repas, en portions.
 * Chaque ingredient entre au prorata : le journal reste une liste
 * d'aliments reels, donc les macros et la liste de courses restent
 * justes sans traitement particulier.
 */
export function ajouterPlat(repasId, plat, nbPortions = 1) {
  if (ecritureBloquee()) return null;   // blocage alimentation : lecture seule
  const part = nbPortions / Math.max(1, plat.portions || 1);
  const lignes = (plat.ings || []).map(i => ({
    id: ++prochainId,
    name: i.name,
    portion: Math.round((i.portion || 0) * part),
    plat: plat.nom,           // trace l'origine, utile a l'affichage
  }));
  repas.value = repas.value.map(r =>
    r.id !== repasId ? r : { ...r, ings: [...r.ings, ...lignes] }
  );
}

/**
 * Bascule un ingredient entre poids cru et poids cuit.
 * La quantite saisie n'est PAS retouchee : on pese son assiette,
 * puis on indique ce que represente ce poids. Modifier le chiffre
 * que la personne vient de taper serait deroutant ; ce sont les
 * calories qui se recalculent, et c'est bien le but.
 */
/**
 * Change l'aliment d'une ligne sans toucher a la quantite pesee.
 * Sert a la bascule cru/cuit des aliments qui portent deja leur
 * cuisson dans leur nom : on passe a l'entree jumelle, dont les
 * valeurs sont exactes, plutot que d'appliquer un facteur devine.
 */
export function remplacerAliment(repasId, ingId, nom) {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  repas.value = repas.value.map(r => r.id !== repasId ? r : {
    ...r,
    ings: r.ings.map(i => i.id !== ingId ? i : { ...i, name: nom, cuit: false }),
  });
}

export function basculerCuisson(repasId, ingId) {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  repas.value = repas.value.map(r => r.id !== repasId ? r : {
    ...r,
    ings: r.ings.map(i => i.id !== ingId ? i : { ...i, cuit: !i.cuit }),
  });
}

export function supprimerIngredient(repasId, ingId) {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  repas.value = repas.value.map(r =>
    r.id !== repasId ? r : { ...r, ings: r.ings.filter(i => i.id !== ingId) }
  );
}

export function ajouterRepas(type) {
  if (ecritureBloquee()) return null;   // blocage alimentation : lecture seule
  const noms = { repas: 'Repas', collation: 'Collation', boisson: 'Boisson' };
  const nb = repas.value.filter(r => r.type === type).length + 1;
  const id = ++prochainId;
  repas.value = [...repas.value, {
    id,
    nom: `${noms[type] || 'Repas'} ${nb}`,
    type,
    ings: [],
    ouvert: true,
  }];
  return id;
}

export function supprimerRepas(repasId) {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  repas.value = repas.value.filter(r => r.id !== repasId);
}

/** Repas prevu -> mange : il compte desormais dans le cadran. */
export function validerRepas(repasId) {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  repas.value = repas.value.map(r => r.id === repasId && r.prevu ? { ...r, prevu: false } : r);
}

/**
 * 22/10 Raci : pose les repas du plan coach dans le journal du jour,
 * en « prevus » (prevu + duPlan), SANS jamais ecraser ce que le client
 * a deja saisi :
 *  - repas du journal de meme nom/cle, vide ou encore « prevu » du plan
 *    -> remplace par la version du plan (meme id) ;
 *  - repas de meme nom/cle deja rempli ou valide -> laisse tel quel ;
 *  - repas du plan absent -> ajoute ;
 *  - ancien repas du plan encore « prevu » absent du nouveau plan -> retire
 *    (jamais mange, il appartenait a l'ancienne livraison).
 * Les autres repas (libres, collations vides...) ne bougent pas.
 */
export function semerPlan(planRepas) {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  const liste = repas.value.map(r => ({ ...r }));
  const nomN = (n) => String(n || '').trim().toLowerCase();
  const cles = new Set();
  let id = Math.max(0, ...liste.map(r => r.id || 0));
  planRepas.forEach((p, k) => {
    const cle = cleDuNom(p.nom);
    cles.add(cle || nomN(p.nom));
    const neuf = (rid) => ({
      id: rid, nom: p.nom, type: cle === 'snack' ? 'collation' : 'repas',
      prevu: true, duPlan: true, cle, fixe: false, ouvert: false,
      ings: (p.ings || []).map((i, j) => ({ id: rid * 1000 + j, name: i.name, portion: i.portion })),
    });
    const i = liste.findIndex(r => (cle && r.cle === cle) || nomN(r.nom) === nomN(p.nom));
    if (i < 0) { liste.push(neuf(++id)); return; }
    const r = liste[i];
    if (r.saute || r.remplace) return;   // 22/10 : choix du client, jamais ecrase
    if (r.idee) {                         // 25/10 : idee choisie -> on garde le choix, le retour pointe sur le plan a jour
      liste[i] = { ...r, ingsPlan: neuf(r.id).ings };
      return;
    }
    if (r.ings.length === 0 || (r.duPlan && r.prevu)) liste[i] = { ...neuf(r.id), fixe: r.fixe, cle: r.cle || cle };
  });
  repas.value = liste.filter(r => !(r.duPlan && r.prevu && !r.remplace && !cles.has(r.cle || nomN(r.nom))));
}

/**
 * 27/10 Raci : ordre d'AFFICHAGE de la liste « Tes repas » quand un plan
 * coach est la. Pure derivation : rien n'est supprime ni deplace dans les
 * donnees du journal (sauvegarde, synchro, totaux, cloture restent tels quels).
 *  - les repas du plan (duPlan) passent en premier, dans l'ordre du plan ;
 *  - les creneaux par defaut (Petit dejeuner...) restes VIDES sont masques ;
 *  - un creneau par defaut deja rempli, et tout repas ajoute a la main
 *    (meme vide), restent visibles, sous les repas du plan.
 * Sans plan actif (avant la 1re date, plan retire) ou sans repas du plan
 * dans le journal, la liste est rendue telle quelle : les defauts reviennent.
 */
export function repasAffiches(liste, planRepas) {
  const plan = Array.isArray(planRepas) ? planRepas : [];
  if (!Array.isArray(liste) || !plan.length || !liste.some(r => r.duPlan)) return liste;
  const nomN = (n) => String(n || '').trim().toLowerCase();
  const rang = (r) => {
    const k = plan.findIndex(p => { const c = cleDuNom(p.nom); return (c && r.cle === c) || nomN(r.nom) === nomN(p.nom); });
    return k < 0 ? plan.length : k;   // ancien repas du plan (deja mange...) : apres ceux du plan
  };
  const creneauVide = (r) => !r.duPlan && r.fixe && (r.ings || []).length === 0;
  const duPlan = liste.map((r, i) => ({ r, i })).filter(x => x.r.duPlan)
    .sort((a, b) => rang(a.r) - rang(b.r) || a.i - b.i).map(x => x.r);
  const autres = liste.filter(r => !r.duPlan && !creneauVide(r));
  return [...duPlan, ...autres];
}

/** 22/10 Raci : decocher un repas du plan -> il redevient « prevu » et
 *  sort du cadran (totauxJour / totauxJourAff ignorent les prevus, la
 *  cloture aussi). Seulement pour les repas venus du plan (duPlan). */
export function annulerValidation(repasId) {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  remettrePrevu(repasId);
}

/** 22/10 Raci : trois issues pour un repas du plan.
 *  - mange (validerRepas) : prevu -> false, compte ;
 *  - saute : saute: true, carte grisee, compte 0 (totaux, cloture) ;
 *  - mange autre chose : remplace: true, les aliments du plan sont mis
 *    de cote (ingsPlan) et le client note ce qu'il a vraiment mange ;
 *    il reste « prevu » (hors cadran) jusqu'a « Terminer ».
 *  remettrePrevu annule chacune d'un geste. Seuls les repas duPlan. */
export function sauterRepas(repasId) {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  repas.value = repas.value.map(r => r.id === repasId && r.duPlan ? { ...r, prevu: false, saute: true } : r);
}
export function mangeAutreChose(repasId) {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  repas.value = repas.value.map(r => r.id !== repasId || !r.duPlan || r.remplace ? r
    : (() => {   // 25/10 : si une « Autre idee » etait choisie, le PLAN reste ce qui est mis de cote
        const n = { ...r, prevu: true, saute: false, remplace: true, ingsPlan: r.idee ? (r.ingsPlan || []) : r.ings, ings: [] };
        delete n.idee;
        return n;
      })());
}
export function remettrePrevu(repasId) {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  repas.value = repas.value.map(r => {
    if (r.id !== repasId || !r.duPlan) return r;
    const n = { ...r, prevu: true };
    delete n.saute;
    if (r.remplace) { n.ings = r.ingsPlan || []; delete n.remplace; delete n.ingsPlan; }
    return n;
  });
}

/** 25/10 « Autre idee » : remplace les aliments d'un repas du plan par ceux
 *  d'une idee aux calories proches, POUR AUJOURD'HUI SEULEMENT.
 *  - le plan d'origine est mis de cote dans `ingsPlan` (jamais perdu) ; si
 *    une autre idee etait deja choisie, on garde le tout premier plan ;
 *  - `idee` = { nom, kcal, cible } sert a l'affichage et a l'annulation ;
 *  - le repas reste « prevu » : il se coche ensuite comme n'importe quel repas.
 *  Seulement un repas du plan, prevu ou mange, ni saute ni « autre chose ». */
export function appliquerIdee(repasId, idee) {
  repas.value = repas.value.map(r => {
    if (r.id !== repasId || !r.duPlan || r.saute || r.remplace) return r;
    const base = r.idee ? (r.ingsPlan || []) : r.ings;
    return {
      // libelles : noms courts des ingredients (« poulet cuit », « œuf »), pour la liste en grammes.
      ...r, idee: { nom: idee.nom, kcal: idee.kcal, cible: idee.cible,
        libelles: Object.fromEntries(idee.ings.filter(i => i.l).map(i => [i.name, i.l])) }, ingsPlan: base,
      ings: idee.ings.map(i => ({ id: ++prochainId, name: i.name, portion: i.portion })),
    };
  });
}
/** Annule « Autre idee » : le repas du plan revient tel qu'il etait prevu. */
export function annulerIdee(repasId) {
  repas.value = repas.value.map(r => {
    if (r.id !== repasId || !r.duPlan || !r.idee) return r;
    const n = { ...r, ings: r.ingsPlan || [] };
    delete n.idee; delete n.ingsPlan;
    return n;
  });
}

export function renommerRepas(repasId, nom) {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  repas.value = repas.value.map(r => r.id !== repasId ? r : { ...r, nom });
}


// 25/10 : compteur de clotures de la session. La cloture vide le journal
// mais dateJour ne change pas toujours (cloture le soir meme avant minuit) : le
// marqueur « une fois par dateJour » du seed du plan ne bougeait donc
// pas et les repas du plan ne revenaient pas en « Prevu ». Ce compteur
// dit au seed de rejouer apres chaque cloture.
export const clotures = signal(0);

export function nouvelleJournee() {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  repas.value = structuredClone(DEFAUTS.repas);
  eau.value = 0;
  dateJour.value = aujourdhui();
  clotures.value = clotures.value + 1;
}

// PLUS DE BASCULE AUTOMATIQUE (Raci, 8/08). L'automatisme du 27/07
// (6967258) archivait et vidait une journee des que sa date differait
// de celle du jour — une journee non terminee disparaissait pendant la
// nuit. La cloture est manuelle : bouton « Cloturer la journee » dans
// la carte Calories. Une journee non cloturee reste ouverte ; la ligne
// de date affiche alors son vrai jour (« vendredi 7 aout »).

// Alimentation fermee : l'eau (libre) se remet a zero chaque nouveau jour.
effect(() => {
  if (!lectureSeule.value || !donneesPretes.value) return;
  const auj = aujourdhui();
  if (eauDate.peek() !== auj && eau.peek() > 0) eau.value = 0;
  if (eauDate.peek() !== auj) eauDate.value = auj;
});

export function ajouterEau(litres) {
  eauDate.value = aujourdhui();
  // Precision au millieme : le pas v1 est de 75 ml (0,075 L).
  eau.value = Math.max(0, Math.round((eau.value + litres) * 1000) / 1000);
}

export function resetEau() {
  eau.value = 0;
}

/**
 * Ecrit les objectifs du jour.
 *
 * Cas particulier : quand on ne change QUE les calories, les macros
 * sont remises a l'echelle dans les memes proportions. Sans cela,
 * l'objectif affiche et les barres de macros racontent deux histoires
 * differentes — vecu par Raci le 7/08 : objectif passe a 4000 kcal,
 * macros restees sur 218/428/96, soit 3448 kcal. Le calculateur le
 * faisait deja de son cote ; d'autres chemins d'ecriture, non. C'est
 * donc ici que ca doit vivre, pour tous les appelants a la fois.
 *
 * Un appelant qui fournit ses macros explicitement (calcul, programme
 * du coach, saisie manuelle complete) n'est jamais retouche : ce qu'il
 * ecrit fait foi.
 */
/**
 * Un objectif calorique sans macros n'est pas un objectif : les trois
 * barres du Journal n'ont plus rien a mesurer et affichent « / 0g »
 * (vecu par Raci le 5/09 : 3500 kcal, macros a zero). Ca arrive quand
 * un enregistrement ancien ou partiel ne porte que les calories.
 * On reconstruit alors la meme repartition que le calculateur :
 * 2,2 g de proteines par kilo (a defaut 25 % des calories), 25 % des
 * calories en lipides, le reste en glucides.
 */
export function completerMacros(o, poids) {
  const kcal = +(o && o.kcal) || 0;
  const somme = (+(o && o.prot) || 0) + (+(o && o.carbs) || 0) + (+(o && o.lip) || 0);
  if (kcal <= 0 || somme > 0) return o;
  const prot = Math.round(+poids > 0 ? poids * 2.2 : (kcal * 0.25) / 4);
  const lip = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - prot * 4 - lip * 9) / 4));
  return { ...o, kcal, prot, carbs, lip };
}

export function setObjectifs(nouveaux) {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  const avant = objectifs.value;
  const macrosFournies = ['prot', 'carbs', 'lip'].some(k => nouveaux[k] != null);
  const kcal = +nouveaux.kcal || 0;

  if (nouveaux.kcal != null && !macrosFournies && kcal > 0) {
    const base = (+avant.prot || 0) * 4 + (+avant.carbs || 0) * 4 + (+avant.lip || 0) * 9;
    if (base > 0) {
      const k = kcal / base;
      objectifs.value = {
        ...avant,
        kcal,
        prot: Math.round((+avant.prot || 0) * k),
        carbs: Math.round((+avant.carbs || 0) * k),
        lip: Math.round((+avant.lip || 0) * k),
      };
      return;
    }
  }
  objectifs.value = completerMacros({ ...avant, ...nouveaux }, poidsCalcul.value);
}

/**
 * Ecart entre l'objectif calorique et la somme des macros, en kcal.
 * Sert a signaler une incoherence plutot qu'a la corriger en douce :
 * des macros posees explicitement appartiennent a qui les a posees.
 */
export function ecartMacros(o = objectifs.value) {
  const somme = (+o.prot || 0) * 4 + (+o.carbs || 0) * 4 + (+o.lip || 0) * 9;
  return Math.round(somme - (+o.kcal || 0));
}

// Part de l'objectif quotidien attribuee a chaque repas fixe.
// Valeurs reprises de la reference.
const PART_REPAS = {
  pdej:  [0.20, 0.30],
  dej:   [0.30, 0.40],
  diner: [0.30, 0.40],
  snack: [0.05, 0.10],
};

/** Fourchette recommandee d'un repas, ou null si le repas est libre. */
export function fourchetteRepas(cle) {
  const part = PART_REPAS[cle];
  if (!part) return null;
  const g = objectifs.value.kcal || 0;
  return { min: Math.round(g * part[0]), max: Math.round(g * part[1]) };
}
