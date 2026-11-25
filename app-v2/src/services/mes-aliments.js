// 25/11 Raci (maquette validee « Vendu ») : « Tu as quoi a portee de main ? »
// Sur un repas du plan coach, le client coche ce qu'il a ; le repas est
// recalcule pour garder les kcal (et viser les proteines) du repas du plan.
//
// Regles de Raci :
//  - une proteine est OBLIGATOIRE ;
//  - vegetarien / vegan : seules les proteines compatibles sont proposees
//    (meme filtre que « Autre idee » : regime, allergies, refus du questionnaire) ;
//  - feculent et legumes FACULTATIFS.
//
// Module PUR (aucun composant, aucun Firebase) : testable sous Node.
import { DB, macrosOf } from '../data/aliments.js';
import { limitesPortion } from '../data/portions.js';
import { raisonExclusion, estPetitDej } from './autre-idee.js';

// k = cle de la base, l = libelle court affiche, e = pictogramme.
const P = (k, l, e) => ({ k, l, e });

const REPAS = {
  proteine: [
    P('Blanc de poulet (cuit)', 'Poulet', '🍗'),
    P('Blanc de dinde (cuit)', 'Dinde', '🦃'),
    P('Boeuf hache 5% cuit', 'Bœuf haché 5%', '🥩'),
    P('Steak cuit', 'Steak', '🥩'),
    P('Porc filet (cuit)', 'Filet de porc', '🍖'),
    P('Saumon cuit', 'Saumon', '🍣'),
    P('Cabillaud (cuit)', 'Cabillaud', '🐟'),
    P('Thon naturel boite', 'Thon', '🐟'),
    P('Crevettes (cuites)', 'Crevettes', '🦐'),
    P('Oeuf entier M (50g)', 'Œufs', '🥚'),
    P('Tofu', 'Tofu', '🧊'),
    P('Tempeh', 'Tempeh', '🟫'),
    P('Steak de soja', 'Steak de soja', '🌱'),
    P('Lentilles (cuites)', 'Lentilles', '🫘'),
    P('Pois chiches (cuits)', 'Pois chiches', '🫘'),
  ],
  feculent: [
    P('Riz basmati (cuit)', 'Riz', '🍚'),
    P('Pâtes blanches cuites', 'Pâtes', '🍝'),
    P('Pâtes complètes cuites', 'Pâtes complètes', '🍝'),
    P('Pomme de terre (cuite)', 'Pommes de terre', '🥔'),
    P('Patate douce (cuite)', 'Patate douce', '🍠'),
    P('Quinoa (cuit)', 'Quinoa', '🌾'),
    P('Pain complet', 'Pain', '🍞'),
  ],
  legumes: [
    P('Brocoli (cuit)', 'Brocoli', '🥦'),
    P('Courgette', 'Courgette', '🥒'),
    P('Haricots verts', 'Haricots verts', '🫛'),
    P('Tomate', 'Tomates', '🍅'),
    P('Épinards cuits', 'Épinards', '🥬'),
    P('Carotte', 'Carottes', '🥕'),
    P('Poivron', 'Poivron', '🫑'),
    P('Champignons', 'Champignons', '🍄'),
    P('Salade verte', 'Salade', '🥗'),
  ],
};

const MATIN = {
  proteine: [
    P('Oeuf entier M (50g)', 'Œufs', '🥚'),
    P('Skyr', 'Skyr', '🥛'),
    P('Fromage blanc 0%', 'Fromage blanc', '🥛'),
    P('Cottage cheese', 'Cottage', '🧀'),
    P('Whey', 'Whey', '🥤'),
    P('Jambon de dinde', 'Jambon de dinde', '🥓'),
    P('Saumon fume', 'Saumon fumé', '🍣'),
    P('Tofu soyeux', 'Tofu soyeux', '🧊'),
  ],
  feculent: [
    P("Flocons d'avoine", "Flocons d'avoine", '🥣'),
    P('Pain complet', 'Pain complet', '🍞'),
    P('Pain de seigle', 'Pain de seigle', '🍞'),
    P('Galette de riz', 'Galettes de riz', '🍘'),
    P('Crème de riz', 'Crème de riz', '🥣'),
  ],
  legumes: [
    P('Banane', 'Banane', '🍌'),
    P('Pomme', 'Pomme', '🍎'),
    P('Fraises', 'Fraises', '🍓'),
    P('Myrtilles', 'Myrtilles', '🫐'),
  ],
};

const HUILE = "Huile d'olive";

/** Les trois groupes a afficher pour ce repas, filtres par le regime/allergies.
 *  @returns [{ cle, titre, statut, items }] */
export function groupesPour(creneau, prefs) {
  const matin = estPetitDej(creneau);
  const src = matin ? MATIN : REPAS;
  const ok = (it) => !!DB[it.k] && !(prefs && raisonExclusion({ nom: it.l, ings: [{ n: it.k, l: it.l }] }, prefs));
  return [
    { cle: 'proteine', titre: 'Protéine', statut: 'Obligatoire', items: src.proteine.filter(ok) },
    { cle: 'feculent', titre: 'Féculent', statut: 'Facultatif', items: src.feculent.filter(ok) },
    { cle: 'legumes', titre: matin ? 'Fruits' : 'Légumes', statut: 'Facultatif', items: src.legumes.filter(ok) },
  ];
}

/** Totaux d'une liste au format journal ({ name, portion }). */
export function totauxIngs(ings) {
  let kcal = 0, prot = 0, carbs = 0, lip = 0;
  for (const i of ings || []) {
    const m = macrosOf({ name: i.name, portion: i.portion });
    kcal += m.kcal || 0; prot += m.prot || 0; carbs += m.carbs || 0; lip += m.lip || 0;
  }
  return { kcal, prot, carbs, lip };
}

// grammes -> portion du journal (pieces pour un aliment a l'unite), arrondie
// au pas de la famille et bornee aux portions humaines.
function portionDe(cle, grammes) {
  const d = DB[cle], lim = limitesPortion(cle);
  const brut = d.unit ? grammes / d.unit : grammes;
  const q = Math.round(brut / lim.step) * lim.step;
  return Math.min(lim.max, Math.max(lim.min, q));
}
const grammesDe = (cle, portion) => DB[cle].unit ? portion * DB[cle].unit : portion;
const par100 = (cle, champ) => (DB[cle][champ] || 0) / 100;

/**
 * Calcule le repas.
 * @param choix { proteine: [cle], feculent: [cle], legumes: [cle] }
 * @param cible { kcal, prot } du repas du PLAN
 * @param creneau cle du repas ('pdej'…) ou son nom
 * @returns { ings [{ name, portion, l }], kcal, prot, carbs, lip } ou null sans proteine
 */
export function calculerRepas(choix, cible, creneau) {
  const prots = (choix.proteine || []).filter(k => DB[k]);
  if (!prots.length || !(cible.kcal > 0)) return null;
  const fecs = (choix.feculent || []).filter(k => DB[k]);
  const legs = (choix.legumes || []).filter(k => DB[k]);
  const matin = estPetitDej(creneau);
  const lignes = new Map();          // cle -> portion
  const pose = (k, g) => lignes.set(k, portionDe(k, g));

  // 1. Legumes (ou fruits le matin) : quantite fixe, partagee.
  const totLeg = matin ? 150 : (cible.kcal < 350 ? 150 : 200);
  legs.forEach(k => pose(k, totLeg / legs.length));
  // 2. Cuisson : une cuillere d'huile (pas au petit-dejeuner).
  if (!matin) lignes.set(HUILE, cible.kcal < 400 ? 5 : 10);

  const somme = () => totauxIngs([...lignes].map(([name, portion]) => ({ name, portion })));
  // 3. Proteines et feculents : quelques passes pour converger.
  for (let n = 0; n < 6; n++) {
    const sansProt = totauxIngs([...lignes].filter(([k]) => !prots.includes(k)).map(([name, portion]) => ({ name, portion })));
    const besoinP = Math.max(0, (cible.prot || 0) - sansProt.prot);
    const kcalSansProt = sansProt.kcal;
    prots.forEach(k => {
      const pg = par100(k, 'prot');
      let g = pg > 0 ? (besoinP / prots.length) / pg : 100;
      // Sans feculent, la proteine porte aussi les calories du repas.
      if (!fecs.length) g = Math.max(g, ((cible.kcal - kcalSansProt) / prots.length) / par100(k, 'kcal'));
      // Jamais plus de proteine que le budget calorique ne le permet.
      g = Math.min(g, Math.max(0, cible.kcal - kcalSansProt) / prots.length / par100(k, 'kcal'));
      pose(k, g);
    });
    if (fecs.length) {
      const sansFec = totauxIngs([...lignes].filter(([k]) => !fecs.includes(k)).map(([name, portion]) => ({ name, portion })));
      const reste = Math.max(0, cible.kcal - sansFec.kcal);
      fecs.forEach(k => pose(k, (reste / fecs.length) / par100(k, 'kcal')));
    }
  }

  // 4. Ajustement fin, au pas de chaque aliment, vers les kcal du plan.
  let k0 = somme().kcal;
  const reglables = fecs.length ? fecs : prots;
  for (let n = 0; n < 40 && Math.abs(k0 - cible.kcal) > 8; n++) {
    let best = null;
    for (const k of [...reglables, ...(matin ? [] : [HUILE])]) {
      const lim = limitesPortion(k), q0 = lignes.get(k);
      for (const dir of [1, -1]) {
        const q = q0 + dir * lim.step;
        if (q < lim.min || q > lim.max) continue;
        const nk = k0 - macrosOf({ name: k, portion: q0 }).kcal + macrosOf({ name: k, portion: q }).kcal;
        const e = Math.abs(nk - cible.kcal);
        if (e < Math.abs(k0 - cible.kcal) - 0.5 && (!best || e < best.e)) best = { k, q, nk, e };
      }
    }
    if (!best) break;
    lignes.set(best.k, best.q); k0 = best.nk;
  }

  const libelle = (k) => {
    for (const g of [REPAS, MATIN]) for (const l of Object.values(g)) { const it = l.find(x => x.k === k); if (it) return it.l; }
    return k === HUILE ? "Huile d'olive" : k;
  };
  const ordre = [...prots, ...fecs, ...legs, HUILE];
  const ings = ordre.filter(k => lignes.has(k)).map(k => ({ name: k, portion: lignes.get(k), l: libelle(k) }));
  const t = totauxIngs(ings);
  return { ings, kcal: Math.round(t.kcal), prot: Math.round(t.prot), carbs: Math.round(t.carbs), lip: Math.round(t.lip) };
}

/** Pictogramme d'un aliment (pour la liste du resultat). */
export function pictoDe(cle) {
  if (cle === HUILE) return '🫒';
  for (const g of [REPAS, MATIN]) for (const l of Object.values(g)) { const it = l.find(x => x.k === cle); if (it) return it.e; }
  return '🍽️';
}

/** Poids affiche d'une ligne (« 160 g », « 3 œufs · 150 g »). */
export function detailLigne(i) {
  const g = Math.round(grammesDe(i.name, i.portion));
  if (DB[i.name] && DB[i.name].unit) return { nom: i.portion + ' œuf' + (i.portion > 1 ? 's' : ''), qte: '≈ ' + g };
  return { nom: i.l, qte: String(g) };
}
