import { DB, NOMS_ALIMENTS } from './aliments.js';

export function normNom(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cleDb(nom) {
  if (!nom) return null;
  if (DB[nom]) return nom;
  const n = normNom(nom);
  return Object.keys(DB).find((k) => normNom(k) === n) || null;
}

const ALIAS_BRUT = {
  patate: 'Pomme de terre cuite', patates: 'Pomme de terre cuite', pdt: 'Pomme de terre cuite',
  'pomme de terre': 'Pomme de terre cuite', 'pommes de terre': 'Pomme de terre cuite',
  potato: 'Pomme de terre cuite', potatoes: 'Pomme de terre cuite',
  aardappel: 'Pomme de terre cuite', aardappelen: 'Pomme de terre cuite',
  stoemp: 'Stoemp', puree: 'Puree de pommes de terre', mousline: 'Puree de pommes de terre',
  'patate douce': 'Patate douce cuite', 'patates douces': 'Patate douce cuite', 'sweet potato': 'Patate douce cuite',
  riz: 'Riz cuit', rice: 'Riz cuit', rijst: 'Riz cuit', 'riz blanc': 'Riz cuit',
  pates: 'Pates blanches cuites', pate: 'Pates blanches cuites', pasta: 'Pates blanches cuites',
  spaghetti: 'Pates blanches cuites', nouilles: 'Pates blanches cuites',
  // Poudre seche : sans cet alias, « creme de riz » tombait sur « Riz cuit ».
  'creme de riz': 'Crème de riz', 'cream of rice': 'Crème de riz',
  quinoa: 'Quinoa cuit', couscous: 'Couscous cuit', pain: 'Pain blanc', brood: 'Pain blanc',
  pistolet: 'Pistolet (petit pain)', kebab: 'Viande de kebab', doner: 'Viande de kebab',
  frites: 'Frites', frite: 'Frites', friet: 'Frites', frieten: 'Frites', fries: 'Frites',
  poulet: 'Poulet cuit', chicken: 'Poulet cuit', kip: 'Poulet cuit',
  'blanc de poulet': 'Blanc de poulet (cuit)', dinde: 'Blanc de dinde (cuit)',
  boeuf: 'Steak cuit', steak: 'Steak cuit', hache: 'Boeuf hache 15% cuit',
  carbonnade: 'Carbonnade flamande', stoofvlees: 'Carbonnade flamande',
  oeuf: 'Oeuf entier M (50g)', oeufs: 'Oeuf entier M (50g)', egg: 'Oeuf entier M (50g)',
  yaourt: 'Yaourt nature', yogurt: 'Yaourt nature', whey: 'Whey Iso', lait: 'Lait 1/2 ecreme',
  huile: "Huile d'olive", 'huile olive': "Huile d'olive", 'huile arachide': "Huile d'arachide",
  mayo: 'Mayonnaise', ketchup: 'Ketchup',
  chicon: 'Chicons au jambon (gratin)', endive: 'Chicons au jambon (gratin)', witloof: 'Chicons au jambon (gratin)',
  waterzooi: 'Waterzooi de poulet', speculoos: 'Speculoos', boulets: 'Boulets liegeois',
  coca: 'Coca-Cola canette 33cl', biere: 'Biere blonde', pintje: 'Biere blonde', cafe: 'Cafe noir',
  // 23/09 : vocabulaire courant qui tombait a plat (« fromage », « thon »,
  // « the », « un coca »…). Chaque alias pointe un nom qui EXISTE dans
  // la base — verifie par tools/test-coach-vocab.mjs.
  fromage: 'Gouda', kaas: 'Gouda', cheese: 'Gouda', 'fromage blanc': 'Fromage blanc 3%',
  thon: 'Thon naturel boite', tonijn: 'Thon naturel boite', saumon: 'Saumon cuit', zalm: 'Saumon cuit',
  cabillaud: 'Cabillaud cuit', kabeljauw: 'Cabillaud cuit', jambon: 'Jambon blanc', ham: 'Jambon blanc',
  pizza: 'Pizza margherita', salade: 'Salade verte', sla: 'Salade verte', chocolat: 'Chocolat au lait',
  cereales: 'Cereales chocolat', omelette: 'Omelette nature', burger: 'Burger classique',
  hamburger: 'Burger classique', sushi: 'Sushi 6 pieces', sushis: 'Sushi 6 pieces', wrap: 'Wrap/Tortilla',
  lasagne: 'Lasagnes', lasagnes: 'Lasagnes', soupe: 'Soupe de legumes', soep: 'Soupe de legumes',
  compote: 'Compote de pomme', 'creme fraiche': 'Creme fraiche 30%', raisin: 'Raisin frais', raisins: 'Raisin frais',
  cottage: 'Cottage cheese', gaufre: 'Gaufre de Liege', gaufres: 'Gaufre de Liege', wafel: 'Gaufre de Liege',
  boulettes: 'Boulettes viande', boulette: 'Boulettes viande', saucisse: 'Saucisse de Toulouse',
  saucisses: 'Saucisse de Toulouse', lardons: 'Lardons', lard: 'Lardons',
  vin: 'Vin rouge leger', 'vin rouge': 'Vin rouge leger', 'vin blanc': 'Vin blanc sec', wijn: 'Vin rouge leger',
  expresso: 'Expresso', espresso: 'Expresso', the: 'The noir', thee: 'The noir', tea: 'The noir', infusion: 'The noir',
  cappuccino: 'Cafe cappuccino', latte: 'Cafe latte', 'cafe latte': 'Cafe latte',
  fanta: 'Fanta Orange canette 33cl', sprite: 'Sprite canette 33cl', 'ice tea': 'Ice Tea Peche canette 33cl',
  'red bull': 'Red Bull canette 25cl', redbull: 'Red Bull canette 25cl', monster: 'Monster Energy canette 50cl',
  'coca zero': 'Coca-Cola Zero canette 33cl', 'coca light': 'Coca-Cola Light canette 33cl',
  'chocolat chaud': 'Chocolat chaud maison', smoothie: 'Smoothie banane',
  'jus d orange': 'Jus orange frais', 'jus orange': 'Jus orange frais', 'jus de pomme': 'Jus pomme',
  'jus pomme': 'Jus pomme', 'jus de raisin': 'Jus de raisin', proteine: 'Whey Iso', proteines: 'Whey Iso',
  shake: 'Whey Iso', 'steak hache': 'Boeuf hache 15% cuit',
};

export const ALIAS = {};
for (const [k, v] of Object.entries(ALIAS_BRUT)) ALIAS[normNom(k)] = v;

function poser(alias, nom) {
  const a = normNom(alias);
  if (!a || a.length < 4) return;
  if (ALIAS[a]) return;
  ALIAS[a] = nom;
}

function sansCuisson(n) {
  return n
    .replace(/\b(cuites|cuits|cuite|cuit|crues|crus|crue|cru)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

for (const nom of Object.keys(DB)) {
  const n = normNom(nom);
  poser(n, nom);
  const court = sansCuisson(n);
  if (court && court !== n) poser(court, nom);
}

export function resoudreAliment(dit) {
  const n = normNom(dit);
  if (!n) return null;
  if (ALIAS[n]) return cleDb(ALIAS[n]) || ALIAS[n];
  const aliasTries = Object.keys(ALIAS).sort((a, b) => b.length - a.length);
  for (const a of aliasTries) {
    if (a.length < 4) continue;
    if (n === a || n.includes(' ' + a + ' ') || n.startsWith(a + ' ') || n.endsWith(' ' + a)) {
      return cleDb(ALIAS[a]) || ALIAS[a];
    }
  }
  const exact = NOMS_ALIMENTS.find((nom) => normNom(nom) === n);
  if (exact) return exact;
  if (DB[dit]) return dit;
  return null;
}

export function noterManque(phrase) {
  try {
    const cle = 'belfit_alias_manques';
    const liste = JSON.parse(localStorage.getItem(cle) || '[]');
    const n = normNom(phrase);
    if (!n || liste.includes(n)) return;
    liste.push(n);
    localStorage.setItem(cle, JSON.stringify(liste.slice(-80)));
  } catch (e) {}
}
