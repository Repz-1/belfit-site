// « Autre idée » (25/10) : proposer, sous un repas du plan, un autre repas
// de la liste d'idées (data/idees.js) aux calories proches de ce repas.
//
// Module PUR (aucun composant, aucun Firebase) : testable sous Node.
//
// Garde-fous, dans cet ordre :
//  1. calories : l'idee, remise a l'echelle, doit tomber a ±7 % du repas
//     du plan (les kcal affichees sont celles de l'idee REELLEMENT calee) ;
//  2. regime declare au questionnaire (vegetarien, vegan, sans porc…) ;
//  3. allergies declarees (liste + texte libre) ;
//  4. aliments refuses (texte libre du questionnaire).
// La detection se fait par MOTS-CLES sur les noms d'ingredients : c'est un
// filet de securite, pas une garantie. L'interface dit toujours
// « verifie les ingredients ».
import { EAT_IDEAS, CATEGORIES_IDEES, IDEES_PETIT_DEJ } from '../data/idees.js';
import { DB, macrosOf } from '../data/aliments.js';
import { limitesPortion } from '../data/portions.js';

export const TOLERANCE_KCAL = 0.07;
// Memes bornes que le panneau « Idees repas » (IdeesRepas.jsx).
export const RATIO_MIN = 0.35;
// 1.4 bridait les portions a ~740 kcal maximum : impossible d'honorer
// un reste de 900. Porte a 2.0, toujours realiste (une recette de base
// a 350 kcal plafonne a 700).
export const RATIO_MAX = 2.0;

/**
 * Quantites d'une idee pour un ratio donne, PORTIONS PLAFONNEES.
 * Sortie : { parts (libelles), ings [{ name, portion }], kcal, prot, carbs, lip }.
 * `ings` est au format du journal : portion = grammes, ou nombre de pieces
 * pour un aliment a l'unite.
 */
export function quantitesIdee(idee, ratio) {
  const parts = [], ings = [];
  let kcal = 0, prot = 0, carbs = 0, lip = 0;
  idee.ings.forEach(i => {
    const d = DB[i.n];
    if (!d) return;
    // Plafonds humains : le budget calorique ne peut plus etre atteint
    // en gonflant les grammages (275 g de poulet, 430 g de patate, 6 oeufs).
    const lim = limitesPortion(i.n);
    let q, grammes, libelle;
    if (d.unit) {
      q = Math.min(lim.max, Math.max(lim.min, Math.round(i.q * ratio)));
      grammes = q * d.unit;
      // Piece : on ajoute son poids (Raci, 28/10 : « pas les quantites en grammes »).
      libelle = q + ' ' + i.l + (q > 1 ? 's' : '') + ' (≈ ' + Math.round(grammes) + ' g)';
    } else {
      const brut = Math.round(i.q * ratio / lim.step) * lim.step;
      q = Math.min(lim.max, Math.max(lim.min, brut));
      grammes = q;
      libelle = q + 'g ' + i.l;
    }
    const f = grammes / 100;
    kcal += d.kcal * f; prot += d.prot * f;
    carbs += (d.carbs || 0) * f; lip += (d.lip || 0) * f;
    parts.push(libelle);
    ings.push({ name: i.n, portion: q, l: i.l });
  });
  return { parts, ings, kcal: Math.round(kcal), prot: Math.round(prot), carbs: Math.round(carbs), lip: Math.round(lip) };
}

/** Premiere lettre en majuscule (« poulet cuit » -> « Poulet cuit »). */
const maj = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/**
 * Lignes d'affichage d'une idee : un ingredient par ligne, avec sa quantite
 * en GRAMMES. Un aliment compte a la piece (œuf) garde son nombre de pieces
 * et affiche en plus son poids (poids d'une piece x nombre).
 * @param ings  ingredients du repas au format du journal ({ name, portion })
 * @param libelles  { cle de la base : libelle court } (facultatif)
 * @returns [{ name, nom, grammes, pieces, detail }]
 *   nom      : « Poulet cuit », « 3 œufs »
 *   grammes  : poids total de la ligne (entier)
 *   pieces   : nombre de pieces, ou null pour un aliment pese
 *   detail   : texte du poids a droite, « 150 g » ou « ≈ 150 g » pour une piece
 */
export function lignesIdee(ings, libelles) {
  return (ings || []).map(i => {
    const d = DB[i.name];
    const lib = libelles && libelles[i.name];
    const portion = Number(i.portion) || 0;
    if (d && d.unit) {
      const grammes = Math.round(portion * d.unit);
      const base = lib || (d.unitLabel || 'pièce');
      const nom = portion + ' ' + base + (portion > 1 && !/s$/.test(base) ? 's' : '');
      return { name: i.name, nom, grammes, pieces: portion, detail: '≈ ' + grammes + ' g' };
    }
    const propre = String(i.name).replace(/\s*\(\d+\s*g\)\s*$/, '');
    const nom = maj(lib || propre);
    return { name: i.name, nom, grammes: Math.round(portion), pieces: null, detail: Math.round(portion) + ' g' };
  });
}

// ---------------------------------------------------------------- mots-cles
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe');

// Allergenes : cle = libelle des options du questionnaire (allergies).
const ALLERGENES = [
  { re: /\boeuf|\boeufs|omelette|cantonais|mayonnaise|\bmayo\b|meringue|hollandaise|bearnaise|gribiche|carbonara|caesar/, noms: ['oeuf', 'oeufs'] },
  { re: /lait(?! de coco)|fromage|skyr|yaourt|yogourt|whey|caseine|cheddar|mozzarella|parmesan|emmental|feta|ricotta|kefir|mascarpone|creme(?! de (riz|coco))|beurre(?! (de )?(cacahu|arachide|amande|noix))|quark|gouda|burrata|cottage|faisselle/, noms: ['lait', 'lactose', 'laitier', 'laitiers', 'laitage', 'produits laitiers', 'fromage'] },
  { re: /\bble\b|ble |pain|pates|spaghetti|penne|macaroni|avoine|wrap|tortilla|semoule|boulgour|couscous|seigle|orge|epeautre|biscuit|gateau|granola|cereales|muesli|pizza|brioche|croissant|baguette|burger|panure|panko|farine|crepe|gaufre|pancake|nouilles|galette de ble|cracker|bretzel|cantonais|sauce soja|tamari|teriyaki/, noms: ['gluten', 'ble', 'cereales'] },
  { re: /cacahu|arachide/, noms: ['arachide', 'arachides', 'cacahuete', 'cacahuetes'] },
  { re: /amande|noix|noisette|pistache|cajou|pecan|macadamia|praline|pralin|nutella|pate a tartiner/, noms: ['fruits a coque', 'fruit a coque', 'noix', 'amande', 'amandes', 'noisette', 'noisettes'] },
  { re: /saumon|thon|cabillaud|poisson|sardine|maquereau|truite|merlu|colin|anchois|lieu |aiglefin|dorade|bar |sole|surimi|hareng/, noms: ['poisson', 'poissons'] },
  { re: /crevette|crabe|homard|langoustine|moule|calmar|poulpe|huitre|coquille|surimi/, noms: ['crustaces', 'mollusques', 'fruits de mer', 'crevette', 'crevettes'] },
  { re: /cantonais|soja|tofu|tempeh|edamame|miso/, noms: ['soja', 'tofu'] },
  { re: /sesame|tahini|houmous|hummus/, noms: ['sesame'] },
  { re: /celeri|moutarde|vinaigre|vin /, noms: ['sulfites', 'sulfite', 'celeri', 'moutarde'] },
];
// Correspondance directe libelle du questionnaire -> famille.
const LIBELLE_VERS_FAMILLE = {
  'arachide': 3, 'fruits a coque': 4, 'lait / lactose': 1, 'oeuf': 0, 'poisson': 5,
  'crustaces / mollusques': 6, 'gluten / ble': 2, 'sesame': 8, 'soja': 7, 'sulfites': 9,
};
// Familles d'aliments qu'on peut refuser en texte libre (« je ne mange pas de viande »).
const VIANDE = /poulet|dinde|boeuf|steak|veau|agneau|porc|jambon|bacon|lardon|chorizo|saucisse|salami|charcuterie|bolognaise|chili con carne|burger|canard|lapin|bison/;
const POISSON_MER = ALLERGENES[5].re;
const MER2 = ALLERGENES[6].re;
const PORC = /porc|jambon|bacon|lardon|chorizo|saucisse|saucisson|charcuterie|salami/;
const GROUPES_REFUS = [
  { noms: ['viande', 'viandes'], re: new RegExp(VIANDE.source) },
  { noms: ['porc', 'charcuterie', 'jambon'], re: PORC },
  { noms: ['boeuf', 'viande rouge', 'viandes rouges', 'steak'], re: /boeuf|steak|veau|agneau|bison/ },
  { noms: ['volaille', 'poulet', 'dinde'], re: /poulet|dinde|canard/ },
  { noms: ['poisson', 'poissons'], re: POISSON_MER },
  { noms: ['fruits de mer', 'crustaces'], re: MER2 },
  ...ALLERGENES.map(a => ({ noms: a.noms, re: a.re })),
];

/** Texte de recherche d'une idee : nom + ingredients (cles de la base et libelles). */
export function texteIdee(idee) {
  return norm(idee.nom + ' ' + idee.ings.map(i => i.n + ' ' + (i.l || '')).join(' ')) + ' ';
}

/** Une idee est-elle vegetarienne (ni viande ni poisson ni fruits de mer) ? */
export function estVegetarienne(idee) {
  const t = texteIdee(idee);
  return !(VIANDE.test(t) || POISSON_MER.test(t) || MER2.test(t));
}
/** Vegane : vegetarienne sans oeuf, sans produit laitier (ni miel). */
export function estVegane(idee) {
  const t = texteIdee(idee);
  return estVegetarienne(idee) && !(ALLERGENES[0].re.test(t) || ALLERGENES[1].re.test(t) || /miel/.test(t));
}

// ---------------------------------------------------------------- questionnaire
const val = (r, id) => (r && r[id] || {}).valeur;
const vals = (r, id) => (r && r[id] || {}).valeurs || [];
const libre = (r, id) => String((r && r[id] || {}).autre || '');

/** Decoupe un texte libre en termes (« pas de poisson, coriandre et olives »). */
function termes(texte) {
  return norm(texte)
    .split(/[,;\n\/]+|\bet\b|\bou\b|\+|\./)
    .map(x => x.replace(/\b(je|ne|n|mange|manger|pas|plus|jamais|de|du|des|d|la|le|les|l|un|une|aucun|aucune|aime|aimes|supporte|tolere|allergie|allergique|intolerance|intolerant|a|au|aux|en|evite|eviter|refuse)\b/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(x => x.length >= 3);
}

/**
 * Preferences alimentaires extraites des reponses du questionnaire coach.
 * @param reponses { id: { valeur | valeurs | autre } } ou null
 * @returns { regime, familles: Set<index ALLERGENES>, mots: string[], sansReponse }
 */
export function preferencesDe(reponses) {
  const r = reponses || {};
  const regime = val(r, 'regime') || 'Tout';
  const familles = new Set();
  const mots = [];
  if (val(r, 'allergie') === 'Oui') {
    for (const a of vals(r, 'allergies')) {
      const k = norm(a);
      if (k in LIBELLE_VERS_FAMILLE) familles.add(LIBELLE_VERS_FAMILLE[k]);
      else if (k !== 'autre') mots.push(...termes(a));
    }
    mots.push(...termes(libre(r, 'allergies')));
    mots.push(...termes(String(val(r, 'allergiePrecis') || '')));
  }
  mots.push(...termes(String(val(r, 'refuses') || '')));
  return { regime, familles, mots: [...new Set(mots)], sansReponse: !reponses };
}

function motPresent(terme, texte) {
  if (texte.includes(terme)) return true;
  // pluriel / singulier simple
  const sing = terme.replace(/(s|x)$/, '');
  if (sing.length >= 4 && sing !== terme && texte.includes(sing)) return true;
  return false;
}

/**
 * Raison pour laquelle une idee est ecartee, ou null si elle convient.
 * (Renvoie la raison pour pouvoir l'expliquer dans les tests.)
 */
export function raisonExclusion(idee, prefs) {
  const t = texteIdee(idee);
  const { regime, familles, mots } = prefs;
  if ((regime === 'Végétarien' || regime === 'Végan') && !estVegetarienne(idee)) return 'regime:vegetarien';
  if (regime === 'Végan' && !estVegane(idee)) return 'regime:vegan';
  if ((regime === 'Sans porc' || regime === 'Halal' || regime === 'Casher') && PORC.test(t)) return 'regime:porc';
  for (const f of familles) if (ALLERGENES[f].re.test(t)) return 'allergie:' + ALLERGENES[f].noms[0];
  for (const m of mots) {
    if (motPresent(m, t)) return 'mot:' + m;
    const g = GROUPES_REFUS.find(x => x.noms.includes(m) || x.noms.includes(m.replace(/s$/, '')));
    if (g && g.re.test(t)) return 'mot:' + m;
  }
  return null;
}

// ---------------------------------------------------------------- calories
/** Calories d'une liste d'ingredients du journal ({ name, portion }). */
export function kcalIngs(ings) {
  return (ings || []).reduce((s, i) => s + macrosOf(i).kcal, 0);
}

/** Creneau « petit-dejeuner » ? (cle 'pdej' du journal, ou nom du repas). */
export function estPetitDej(creneau) {
  const n = norm(creneau).replace(/[-_]/g, ' ');
  return n === 'pdej' || /petit|breakfast|ontbijt|matinal/.test(n);
}

/** Toutes les idees, a plat, avec leur categorie.
 *  29/10 Raci : au petit-dejeuner, UNIQUEMENT les idees du matin. */
export function toutesLesIdees(creneau) {
  if (estPetitDej(creneau)) return IDEES_PETIT_DEJ.map(idee => ({ ...idee, cat: 'pdej', catLabel: 'Petit-déjeuner' }));
  const sortie = [];
  for (const c of CATEGORIES_IDEES) for (const idee of EAT_IDEAS[c.k]) sortie.push({ ...idee, cat: c.k, catLabel: c.label });
  return sortie;
}

/**
 * Cale une idee sur une cible : balaie le ratio et garde celui dont les kcal
 * (apres arrondis et plafonds de portion) sont les plus proches de la cible.
 * Renvoie null si l'ecart reste > 7 %.
 */
export function caler(idee, cible) {
  let meilleur = null;
  for (let ratio = RATIO_MIN; ratio <= RATIO_MAX + 1e-9; ratio += 0.01) {
    const q = quantitesIdee(idee, ratio);
    const ecart = Math.abs(q.kcal - cible);
    if (!meilleur || ecart < meilleur.ecart - 1e-9) meilleur = { ...q, ecart, ratio };
  }
  if (!meilleur || cible <= 0 || meilleur.ecart / cible > TOLERANCE_KCAL) return null;
  return meilleur;
}

/**
 * Liste des idees proposables pour un repas, de la plus proche a la plus
 * eloignee de la cible.
 * @param cible kcal du repas du PLAN
 * @param prefs preferencesDe(...)
 * @param creneau cle du repas ('pdej'...) ou son nom ; petit-dejeuner -> idees du matin seulement
 */
export function proposables(cible, prefs, creneau) {
  const sortie = [];
  for (const idee of toutesLesIdees(creneau)) {
    if (raisonExclusion(idee, prefs)) continue;
    const c = caler(idee, cible);
    if (c) sortie.push({ idee, calage: c });
  }
  return sortie.sort((a, b) => a.calage.ecart - b.calage.ecart || a.idee.nom.localeCompare(b.idee.nom, 'fr'));
}

/**
 * Prochaine idee a proposer : la plus proche pas encore vue pour ce repas.
 * @param vues Set de noms deja proposes (mis a jour) ; vide quand la liste a fait le tour.
 * @param actuelle nom de l'idee affichee (jamais re-proposee de suite)
 * @returns { nom, cat, catLabel, ings, kcal, prot, carbs, lip, cible, ecartPct } | null
 */
export function prochaineIdee(cible, prefs, vues, actuelle, creneau) {
  const liste = proposables(cible, prefs, creneau).filter(x => x.idee.nom !== actuelle);
  if (liste.length === 0) return null;
  let choix = liste.find(x => !vues.has(x.idee.nom));
  if (!choix) { vues.clear(); choix = liste[0]; }
  vues.add(choix.idee.nom);
  const c = choix.calage;
  return {
    nom: choix.idee.nom, cat: choix.idee.cat, catLabel: choix.idee.catLabel,
    ings: c.ings, kcal: c.kcal, prot: c.prot, carbs: c.carbs, lip: c.lip,
    cible: Math.round(cible), ecartPct: Math.round((c.kcal - cible) / cible * 1000) / 10,
  };
}
