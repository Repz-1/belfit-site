// ============================================================
// PLAFONDS DE PORTION
// Une suggestion ne doit JAMAIS proposer une quantite qu'un
// humain ne servirait pas. Sans cette table, le generateur
// atteignait son budget calorique en gonflant les grammages :
// 275 g de poulet + 275 g de riz, 430 g de patate douce, 6 oeufs.
// Reference des maxima : portion de restaurant genereuse.
//
// La reconnaissance se fait par mots-cles, comme facteurCuisson :
// la base compte plus de mille aliments et les recettes en
// piochent librement, une table nom-a-nom serait fausse le jour
// ou une recette change d'ingredient.
// ============================================================

// Ordre significatif : la premiere famille qui reconnait gagne.
// Les familles etroites passent donc AVANT les familles larges.
const FAMILLES = [
  // --- Cereale seche en poudre (petit-dejeuner) : poids de la POUDRE ---
  { cle: 'cereale_sec',min: 30,  max: 80,  step: 10, mots: ['creme de riz', 'crème de riz', 'cream of rice'] },

  // --- Matieres grasses et condiments : les plus petits plafonds ---
  { cle: 'huile',      min: 5,   max: 20,  step: 5,  mots: ['huile'] },
  { cle: 'miel',       min: 5,   max: 30,  step: 5,  mots: ['miel', 'sirop', 'confiture'] },
  { cle: 'sauce',      min: 20,  max: 120, step: 10, mots: ['sauce', 'coulis'] },
  { cle: 'beurre_ol',  min: 10,  max: 40,  step: 5,  mots: ['beurre'] },
  { cle: 'oleagineux', min: 10,  max: 40,  step: 5,  mots: ['amande', 'noix', 'noisette', 'pecan', 'cajou', 'pistache', 'graine'] },
  { cle: 'coco',       min: 20,  max: 100, step: 10, mots: ['coco'] },

  // --- Fromages et produits laitiers ---
  { cle: 'fromage_fort', min: 15, max: 60,  step: 5,  mots: ['cheddar', 'parmesan', 'gruyere', 'emmental', 'comte', 'roquefort', 'chevre'] },
  { cle: 'fromage_frais',min: 20, max: 120, step: 10, mots: ['feta', 'mozzarella', 'ricotta'] },
  { cle: 'laitage',    min: 100, max: 400, step: 25, mots: ['skyr', 'yaourt', 'fromage blanc', 'blanc 0%', 'lait'] },
  { cle: 'whey',       min: 15,  max: 60,  step: 5,  mots: ['whey', 'proteine'] },

  // --- Proteines animales ---
  { cle: 'oeuf',       min: 1,   max: 4,   step: 1,  mots: ['oeuf', 'œuf'] },   // en UNITES
  { cle: 'thon_boite', min: 60,  max: 160, step: 20, mots: ['thon'] },
  { cle: 'charcuterie',min: 30,  max: 120, step: 10, mots: ['jambon', 'bacon', 'lardon', 'saumon fume'] },
  { cle: 'poisson',    min: 90,  max: 220, step: 10, mots: ['saumon', 'cabillaud', 'colin', 'merlu', 'crevette', 'poisson', 'sardine', 'maquereau'] },
  { cle: 'boeuf',      min: 90,  max: 220, step: 10, mots: ['boeuf', 'bœuf', 'steak', 'agneau', 'veau'] },
  { cle: 'volaille',   min: 90,  max: 250, step: 10, mots: ['poulet', 'dinde', 'escalope', 'porc'] },
  { cle: 'tofu',       min: 80,  max: 250, step: 10, mots: ['tofu', 'tempeh', 'seitan'] },

  // --- Feculents ---
  { cle: 'pain',       min: 30,  max: 120, step: 10, mots: ['pain', 'tortilla', 'wrap', 'galette', 'biscotte'] },
  { cle: 'cereale_sec',min: 40,  max: 110, step: 10, mots: ['avoine', 'flocons', 'muesli', 'granola'] },
  { cle: 'feculent_cru',min: 50, max: 120, step: 10, mots: ['cru', 'crue'] },   // riz cru, quinoa cru, boulgour cru
  { cle: 'haricot_vert',min: 80, max: 400, step: 20, mots: ['haricot vert', 'haricots vert'] },
  { cle: 'legumineuse',min: 80,  max: 250, step: 10, mots: ['lentille', 'haricot', 'pois chiche', 'feve'] },
  { cle: 'pdt',        min: 100, max: 300, step: 20, mots: ['terre', 'patate'] },
  { cle: 'feculent',   min: 100, max: 250, step: 20, mots: ['riz', 'pate', 'pâte', 'quinoa', 'boulgour', 'semoule', 'couscous', 'polenta'] },

  // --- Fruits et legumes ---
  { cle: 'avocat',     min: 50,  max: 150, step: 25, mots: ['avocat'] },
  { cle: 'fruit',      min: 60,  max: 200, step: 20, mots: ['banane', 'pomme', 'poire', 'myrtille', 'fraise', 'framboise', 'orange', 'mangue', 'raisin', 'kiwi', 'ananas'] },
  { cle: 'legume',     min: 80,  max: 400, step: 20, mots: ['brocoli', 'courgette', 'salade', 'epinard', 'épinard', 'tomate', 'poivron', 'carotte', 'haricot vert', 'chou', 'aubergine', 'champignon', 'concombre', 'oignon', 'mais', 'maïs', 'legume', 'légume'] },
];

const DEFAUT = { min: 30, max: 250, step: 10 };

function mots(nom) {
  return (nom || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/).filter(Boolean);
}

/**
 * Plafonds applicables a un aliment de la base.
 * Pour les aliments comptes a l'unite (oeufs), min/max/step sont
 * exprimes en PIECES ; sinon en grammes.
 */
export function limitesPortion(nom) {
  const m = mots(nom);
  const entier = (nom || '').toLowerCase();
  for (const f of FAMILLES) {
    const touche = f.mots.some(x => x.includes(' ')
      ? entier.includes(x)
      : m.some(w => w.length >= 3 && w.startsWith(x)));
    if (touche) return { min: f.min, max: f.max, step: f.step, cle: f.cle };
  }
  return { ...DEFAUT, cle: 'defaut' };
}

/** Arrondit une quantite au pas de sa famille, bornee par min/max. */
export function calerPortion(nom, q) {
  const l = limitesPortion(nom);
  const cale = Math.round(q / l.step) * l.step;
  return Math.min(l.max, Math.max(l.min, cale));
}
