import { DB, macrosOf } from '../data/aliments.js';
import { ALIAS, normNom, resoudreAliment, noterManque } from '../data/alias-aliments.js';
import { EAT_IDEAS } from '../data/idees.js';
import { limitesPortion } from '../data/portions.js';
import { proposerAdaptation } from '../store/adaptations.js';
import { EXERCISES } from '../data/exercices.js';

const PORTION = {
  'Pain blanc': 120, 'Frites': 200, 'Poulet cuit': 150,
  'Riz cuit': 200, Banane: 120, 'Oeuf entier M (50g)': 50,
  'Whey Iso': 30, "Huile d'olive": 10, 'Pomme de terre cuite': 200,
  'Viande de kebab': 150,
  // Portions « une » par defaut (23/09) — sans nombre, « une biere »
  // n'est pas 100 g.
  'Biere blonde': 250, 'Bière blonde': 250, 'Cafe noir': 150, 'Café noir': 150, Expresso: 40,
  'Thé noir': 250, 'Café cappuccino': 200, 'Café latte': 250, 'Lait 1/2 écrémé': 250,
  'Jus orange frais': 200, 'Jus pomme': 200, 'Jus de raisin': 200, 'Vin rouge léger': 150, 'Vin blanc sec': 150,
  'Smoothie banane': 300, 'Chocolat chaud maison': 250, Pomme: 150, 'Yaourt nature': 125, Skyr: 150,
  Croissant: 60, 'Gouda': 30, 'Jambon blanc': 40, 'Thon naturel boite': 100, 'Pizza margherita': 350,
  'Burger classique': 250, 'Sushi 6 pieces': 180, 'Omelette nature': 150, 'Lasagnes': 350,
  'Soupe de légumes': 300, 'Compote de pomme': 100, 'Gaufre de Liège': 90, 'Salade verte': 80,
  'Chocolat au lait': 20, 'Lardons': 50, 'Saucisse de Toulouse': 100, 'Boulettes viande': 150,
  'Avocat': 150, 'Pain complet': 80, 'Flocons d\'avoine': 50, 'Beurre de cacahuète': 20, 'Nutella': 20,
  'Miel': 15, 'Confiture': 20, 'Beurre': 10, 'Amandes': 25, 'Noix': 25, 'Barre protéinée': 60,
};

/**
 * Contenants (23/09) : « un verre de lait », « 2 tasses de cafe »,
 * « une canette de coca ». Renvoie une quantite en g/ml, ou null.
 */
const CONTENANTS = { verre: 250, verres: 250, tasse: 150, tasses: 150, bol: 250, bols: 250,
  canette: 330, canettes: 330, bouteille: 500, bouteilles: 500, pinte: 500, pintes: 500 };
const NOMBRES = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5 };
function quantiteContenant(n, mot) {
  const idx = mot ? n.indexOf(mot) : -1;
  if (idx < 0) return null;
  const avant = n.slice(Math.max(0, idx - 30), idx);
  const m = avant.match(/(?:(\d+|un|une|deux|trois|quatre|cinq)\s+)?(verres?|tasses?|bols?|canettes?|bouteilles?|pintes?)\s+(?:de |d )?$/);
  if (!m) return null;
  const nb = m[1] ? (NOMBRES[m[1]] || parseFloat(m[1])) : 1;
  return nb * CONTENANTS[m[2]];
}

const STOP = new Set([
  'que','qui','une','des','les','aux','pour','avec','dans','plus','mais',
  'pas','rien','tout','manger','mange','pris','repas','midi','soir','matin',
  'dis','dit','jai','un','du','de','la','le','cuillere','cuilleres','soupe',
  'cas','cac','grammes','gramme','blanc','verre','verres','bouteille',
  'eau','bu','bois','boire','cl','ml','genou','genoux',
]);

const COMBOS = [
  {
    re: /\b(durum|durums|doner|doner kebab)\b/,
    skip: ['durum', 'durums', 'doner', 'kebab', 'pain'],
    aliments: [
      { aliment: 'Pain blanc', quantite: 120 },
      { aliment: 'Viande de kebab', quantite: 150 },
    ],
    extra: [
      { si: /\b(frite|frites|friet|frieten|fries)\b/, aliment: 'Frites', quantite: 200 },
    ],
  },
];

function repasCle(phrase) {
  const n = normNom(phrase);
  if (n.includes('matin') || n.includes('petit dejeuner')) return 'pdej';
  if (n.includes('midi') || n.includes('dejeuner') || n.includes('lunch')) return 'dej';
  if (n.includes('soir') || n.includes('diner')) return 'diner';
  if (n.includes('snack') || n.includes('collation')) return 'snack';
  const h = new Date().getHours();
  return h < 11 ? 'pdej' : h < 15 ? 'dej' : h < 21 ? 'diner' : 'snack';
}

/**
 * Quantite rattachee A CET aliment (23/09). L'ancienne lecture prenait
 * le premier nombre de la phrase : « 350 g de riz et 250 g de poulet »
 * donnait 350 g aux deux. On lit d'abord juste avant le mot
 * (« 250 g de poulet »), puis juste apres (« poulet 250 g »).
 */
const UNITE_G = '(g|gr|grammes?)';
function quantiteCollee(n, mot) {
  const idx = mot ? n.indexOf(mot) : -1;
  if (idx < 0) return null;
  const avant = n.slice(Math.max(0, idx - 30), idx);
  // « 2 sachets de 125 g de riz » : 2 x 125 (04/10).
  const mMul = avant.match(new RegExp('(\\d+|un|une|deux|trois|quatre|cinq)\\s+(?:sachets?|paquets?|pots?|barquettes?|portions?|boites?|tranches?|pieces?)\\s+(?:de |d )?(\\d+[.,]?\\d*)\\s*' + UNITE_G + '\\s*(?:de |d )?$'));
  if (mMul) return (NOMBRES[mMul[1]] || parseFloat(mMul[1])) * parseFloat(mMul[2].replace(',', '.'));
  const mAv = avant.match(new RegExp('(\\d+[.,]?\\d*)\\s*' + UNITE_G + '\\s*(?:de |d )?$'));
  if (mAv) return parseFloat(mAv[1].replace(',', '.'));
  const apres = n.slice(idx + mot.length, idx + mot.length + 20);
  // « 2 steaks de 150 g » : nombre devant, poids unitaire derriere.
  const nbDevant = avant.match(/(\d+|un|une|deux|trois|quatre|cinq)\s+(?:(?:sachets?|paquets?|pots?|barquettes?|portions?|boites?|tranches?)\s+(?:de\s+|d\s+)?)?$/);
  const poidsDerriere = apres.match(new RegExp('^\\s*de\\s+(\\d+[.,]?\\d*)\\s*' + UNITE_G + '(?![a-z])'));
  if (nbDevant && poidsDerriere) return (NOMBRES[nbDevant[1]] || parseFloat(nbDevant[1])) * parseFloat(poidsDerriere[1].replace(',', '.'));
  const mAp = apres.match(new RegExp('^\\s*(?:: )?(\\d+[.,]?\\d*)\\s*' + UNITE_G + '(?![a-z])'));
  if (mAp) return parseFloat(mAp[1].replace(',', '.'));
  return null;
}

function extraireQuantite(n, apresMot) {
  const collee = quantiteCollee(n, apresMot);
  if (collee != null) return collee;
  const idx = apresMot ? n.indexOf(apresMot) : -1;
  const zone = idx >= 0 ? n.slice(0, idx + apresMot.length + 12) : n;
  const cas = zone.match(/(\d+[\.,]?\d*)\s*(cuillere(?:s)?(?: a soupe)?|cas)\b/);
  if (cas) return parseFloat(cas[1].replace(',', '.')) * 10;
  const cac = zone.match(/(\d+[\.,]?\d*)\s*(cuillere(?:s)? a cafe|cac)\b/);
  if (cac) return parseFloat(cac[1].replace(',', '.')) * 5;
  const g = zone.match(/(\d+[\.,]?\d*)\s*(g|gr|grammes?)\b/);
  if (g) return parseFloat(g[1].replace(',', '.'));
  return null;
}

const NOMBRES_EAU = { un: 1, une: 1, deux: 2 };
export function extraireEau(phrase) {
  const n = normNom(String(phrase || '').replace(/(\d),(\d)/g, '$1.$2')).replace(/(\d) (\d)/g, '$1.$2');
  const parleEau = /\b(eau|water|spa|bu|bois|boire|verre|verres|bouteille|hydrate)\b/.test(n);
  if (!parleEau) return null;
  // « 1 litre », « 1,5 litres », « 1l » (23/09 : « litre » n'etait pas lu)
  const l = n.match(/(\d+(?:[\.,]\d+)?|un|une|deux)\s*(?:l|litres?)\b/);
  if (l && NOMBRES_EAU[l[1]]) return NOMBRES_EAU[l[1]];
  if (l) return parseFloat(l[1].replace(',', '.'));
  const cl = n.match(/(\d+[\.,]?\d*)\s*cl\b/);
  if (cl) return parseFloat(cl[1].replace(',', '.')) / 100;
  const ml = n.match(/(\d+[\.,]?\d*)\s*ml\b/);
  if (ml) return parseFloat(ml[1].replace(',', '.')) / 1000;
  if (/\bbouteille/.test(n)) return 0.5;
  if (/\bverre/.test(n)) return 0.25;
  return 0.25;
}

/**
 * Portion a ecrire au journal (04/10). Les aliments a l'unite (oeuf,
 * dose, canette) se comptent en PIECES dans le journal ; le coach lit
 * des grammes. 50 g d'oeuf = 1 oeuf, pas 50 oeufs (le bug donnait
 * 3 875 kcal pour « 4 jaunes »).
 */
export function portionJournal(cle, quantite, unite) {
  const d = DB[cle];
  if (!d || !d.unit) return Math.round(quantite);
  if (unite === 'piece') return Math.max(1, Math.round(quantite));
  return Math.max(1, Math.round(quantite / d.unit));
}

export function macrosAliments(aliments) {
  return (aliments || []).reduce((t, a) => {
    const m = macrosOf({ name: a.aliment, portion: portionJournal(a.aliment, a.quantite, a.unite) });
    t.kcal += m.kcal; t.prot += m.prot; t.carbs += m.carbs; t.lip += m.lip;
    return t;
  }, { kcal: 0, prot: 0, carbs: 0, lip: 0 });
}

export function proposerRepas(objectifs, totaux, dejaAjoutes = []) {
  const obj = objectifs || {};
  const tot = totaux || {};
  const extra = macrosAliments(dejaAjoutes);
  const resteKcal = (obj.kcal || 0) - (tot.kcal || 0) - extra.kcal;
  if (resteKcal < 280) return null;
  const plafond = (obj.kcal || 2000) * 0.28;
  const cible = Math.max(280, Math.min(resteKcal, plafond));
  let meilleur = null;
  let meilleurScore = Infinity;
  for (const cat of Object.values(EAT_IDEAS)) {
    for (const idee of cat) {
      if (!idee.ings || idee.ings.some((i) => !DB[i.n])) continue;
      const baseKcal = idee.ings.reduce((s, i) => {
        const d = DB[i.n];
        const g = d.unit ? i.q * d.unit : i.q;
        return s + d.kcal * (g / 100);
      }, 0);
      if (baseKcal < 80) continue;
      const ratio = Math.max(0.5, Math.min(1.6, cible / baseKcal));
      const ings = idee.ings.map((i) => {
        const d = DB[i.n];
        const lim = limitesPortion(i.n);
        if (d.unit) {
          return { aliment: i.n, quantite: Math.min(lim.max, Math.max(lim.min, Math.round(i.q * ratio))), unite: 'piece', repasCle: 'diner' };
        }
        const brut = Math.round((i.q * ratio) / lim.step) * lim.step;
        return { aliment: i.n, quantite: Math.min(lim.max, Math.max(lim.min, brut)), unite: 'g', repasCle: 'diner' };
      });
      const m = macrosAliments(ings);
      const score = Math.abs(m.kcal - cible);
      if (score < meilleurScore) {
        meilleurScore = score;
        meilleur = { nom: idee.nom, kcal: Math.round(m.kcal), prot: Math.round(m.prot), carbs: Math.round(m.carbs), lip: Math.round(m.lip), ings };
      }
    }
  }
  return meilleur;
}

const MUSCLE_ALIAS = [
  { k: 'pecs', re: /\b(pecs?|pectoraux?|pectoral|poitrine|chest)\b/ },
  { k: 'biceps', re: /\b(biceps?)\b/ },
  { k: 'triceps', re: /\b(triceps?)\b/ },
  { k: 'dos', re: /\b(dos|dorsaux?|back|lats?)\b/ },
  { k: 'epaules', re: /\b(epaules?|shoulders?|delts?)\b/ },
  { k: 'jambes', re: /\b(jambes?|cuisses?|legs?|quads?|quadriceps?)\b/ },
  { k: 'abdos', re: /\b(abdos?|abdominaux?|abs)\b/ },
  { k: 'trapezes', re: /\b(trapezes?|shrugs?)\b/ },
];

const COMBOS_CORPS = [
  { re: /\b(full ?body|tout le corps|corps entier)\b/, ks: ['pecs', 'dos', 'jambes'] },
  { re: /\b(haut du corps|upper)\b/, ks: ['pecs', 'dos', 'epaules'] },
  { re: /\b(bas du corps|lower)\b/, ks: ['jambes'] },
  { re: /\bpush\b/, ks: ['pecs', 'epaules', 'triceps'] },
  { re: /\bpull\b/, ks: ['dos', 'biceps'] },
];

const LABEL_MUSCLE = {
  pecs: 'Pecs', biceps: 'Biceps', triceps: 'Triceps', dos: 'Dos',
  epaules: 'Épaules', jambes: 'Jambes', abdos: 'Abdos', trapezes: 'Trapèzes',
};

/**
 * Trois listes par muscle, dans l'ordre de priorite (23/09).
 * Raci : « Dos lourd et court » et « Dos endurance » sortaient le meme
 * trio. Le style choisit maintenant la liste, le nombre d'exercices et
 * le schema series × reps × repos, qui suit la seance jusqu'au bout.
 */
const PACKS = {
  pecs: {
    force: ['Développé Couché (Barre)', 'Développé Couché Incliné (Barre)', 'Développé Couché (Haltère)', 'Dips entre Bancs', 'Développé Couché (Machine)'],
    hyper: ['Développé Couché (Barre)', 'Développé Couché Incliné (Haltère)', 'Développé Couché (Machine)', 'Pec Deck (Machine)', 'Écarté (Poulie)', 'Pompes'],
    endu: ['Pompes', 'Développé Couché (Machine)', 'Écarté (Poulie)', 'Pec Deck (Machine)', 'Pompes Inclinées', 'Développé Incliné (Machine)'],
  },
  dos: {
    force: ['Soulevé de Terre (Barre)', 'Tractions', 'Rowing Penché (Barre)', 'Tirage Poitrine Prise Large (Poulie)', 'Rowing Un Bras (Haltère)'],
    hyper: ['Tractions', 'Rowing Penché (Barre)', 'Tirage Poitrine Prise Large (Poulie)', 'Rowing Assis (Poulie)', 'Rowing Un Bras (Haltère)', 'Pull-Over (Barre)'],
    endu: ['Tirage Poitrine Prise Large (Poulie)', 'Rowing Assis (Poulie)', 'Rowing (Machine)', 'Tirage Poitrine Prise Serrée Avant (Poulie)', 'Extension Dos', 'Superman'],
  },
  epaules: {
    force: ['Développé Militaire Debout (Barre)', 'Push Press (Barre)', 'Développé Épaules (Haltère)', 'Élévation Latérale (Haltère)'],
    hyper: ['Développé Militaire Assis (Barre)', 'Élévation Latérale (Haltère)', 'Oiseau Penché Arrière (Haltère)', 'Tirage vers Visage (Poulie)', 'Développé Épaules (Machine)'],
    endu: ['Développé Épaules (Machine)', 'Élévation Latérale (Poulie)', 'Écarté Inversé (Machine)', 'Tirage vers Visage (Poulie)', 'Élévation Latérale (Haltère)'],
  },
  biceps: {
    force: ['Curl Biceps (Barre)', 'Curl Marteau (Haltère)', 'Curl Pupitre (Barre)'],
    hyper: ['Curl Biceps (Barre)', 'Curl Biceps Incliné (Haltère)', 'Curl Marteau (Haltère)', 'Curl Pupitre (Machine)'],
    endu: ['Curl Biceps (Poulie)', 'Curl Marteau Corde (Poulie)', 'Curl Concentré (Haltère)', 'Curl Biceps (Machine)'],
  },
  triceps: {
    force: ['Développé Couché Prise Serrée (Barre)', 'Dips entre Bancs', 'Barre au Front Allongé (Barre EZ)'],
    hyper: ['Barre au Front Allongé (Barre EZ)', 'Extension Triceps Corde (Poulie)', 'Dips (Machine)', 'Extension Triceps au-dessus de la Tête Corde (Poulie)'],
    endu: ['Extension Triceps Corde (Poulie)', 'Extension Triceps (Machine)', 'Kickback Triceps (Haltère)', 'Pompes Prise Serrée'],
  },
  jambes: {
    force: ['Squat (Barre)', 'Soulevé de Terre Jambes Tendues (Barre)', 'Presse à Cuisses (Machine)', 'Fentes (Barre)', 'Hip Thrust (Barre)'],
    hyper: ['Squat (Barre)', 'Presse à Cuisses (Machine)', 'Leg Curl Allongé (Machine)', 'Extension Jambes (Machine)', 'Fentes (Haltère)', 'Extension Mollets Debout (Machine)'],
    endu: ['Goblet Squat (Kettlebell)', 'Fentes (Haltère)', 'Extension Jambes (Machine)', 'Leg Curl Assis (Machine)', 'Presse à Cuisses (Machine)', 'Extension Mollets Debout (Machine)'],
  },
  abdos: {
    force: ['Relevé de Jambes Suspendu', 'Rollout à Genoux (Barre)', 'Crunch (Poulie)'],
    hyper: ['Crunch (Poulie)', 'Relevé de Jambes Suspendu', 'Planche', 'Rotation Russe'],
    endu: ['Planche', 'Crunch Bicyclette', 'Gainage Latéral', 'Ramené de Genoux', 'Crunch'],
  },
  trapezes: {
    force: ['Haussement d’Épaules (Barre)', 'Haussement d’Épaules (Haltère)'],
    hyper: ['Haussement d’Épaules (Barre)', 'Haussement d’Épaules (Haltère)', 'Haussement d’Épaules (Machine)'],
    endu: ['Haussement d’Épaules (Poulie)', 'Haussement d’Épaules (Machine)', 'Haussement d’Épaules (Haltère)'],
  },
};

export const SCHEMAS = {
  force: { cle: 'force', label: 'Force', series: 5, reps: 5, repos: 180, resume: '5 × 5 · repos 3 min' },
  hyper: { cle: 'hyper', label: 'Volume', series: 4, reps: 10, repos: 90, resume: '4 × 10 · repos 1 min 30' },
  endu: { cle: 'endu', label: 'Endurance', series: 3, reps: 15, repos: 45, resume: '3 × 15 · repos 45 s' },
};

function lireStyle(n) {
  const style = /\b(endurance|endu|cardio|leger|legere|circuit|pump|tonifier|tonif\w*|seche)\b/.test(n) ? 'endu'
    : /\b(lourd|lourde|force|forte|max|maxi|puissance|strength|heavy|5x5)\b/.test(n) ? 'force'
      : /\b(volume|hypertrophie|masse|muscle|prise|4x10)\b/.test(n) ? 'hyper'
        : null;
  const duree = /\b(court|courte|rapide|express|vite|30 ?min|20 ?min)\b/.test(n) ? 'court'
    : /\b(long|longue|complete|complet|intense|60 ?min|1h|1 ?heure)\b/.test(n) ? 'long'
      : 'normal';
  return { style, duree };
}

/**
 * Le jour vise (23/09) : « demain », « apres-demain », un jour de la
 * semaine. Rien, « ce soir » ou « aujourd'hui » = aujourd'hui (null).
 * Renvoie { iso, libelle } ou null.
 */
const JOURS_SEM = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
function isoDe(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export function lireJourVise(n, maintenant = new Date()) {
  let dec = null;
  if (/\bapres[- ]?demain\b/.test(n)) dec = 2;
  else if (/\bdemain\b/.test(n)) dec = 1;
  else {
    const i = JOURS_SEM.findIndex((j) => new RegExp('(^| )' + j + '( |$)').test(n));
    if (i >= 0) dec = (i - maintenant.getDay() + 7) % 7;
  }
  if (!dec) return null;
  const d = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + dec);
  const libelle = dec === 1 ? 'demain' : dec === 2 ? 'après-demain'
    : JOURS_SEM[d.getDay()] + ' ' + d.getDate();
  return { iso: isoDe(d), libelle };
}

function nbParGroupe(nMuscles, style, duree) {
  const base = nMuscles === 1 ? 4 : nMuscles === 2 ? 3 : 2;
  let n = base;
  if (style === 'endu') n += 1;
  if (duree === 'court') n = Math.max(nMuscles === 1 ? 3 : 1, base - 1);
  if (duree === 'long') n = base + 2;
  return n;
}

function refParNom(mKey, nom) {
  const n = normNom(nom);
  const dans = (k) => {
    const liste = EXERCISES[k] || [];
    const i = liste.findIndex((e) => normNom(e.nom) === n);
    return i >= 0 ? { mKey: k, i, nom: liste[i].nom } : null;
  };
  return dans(mKey) || Object.keys(EXERCISES).reduce((trouve, k) => trouve || dans(k), null);
}

function extraireMuscles(n) {
  const ks = [];
  for (const c of COMBOS_CORPS) {
    if (c.re.test(n)) c.ks.forEach((k) => { if (!ks.includes(k)) ks.push(k); });
  }
  for (const a of MUSCLE_ALIAS) {
    if (a.re.test(n) && !ks.includes(a.k)) ks.push(a.k);
  }
  return ks;
}

// styleChoisi : reponse a la question « quel objectif ? » (28/09). Sans
// objectif dans la phrase, on le DEMANDE au lieu d'imposer 4 x 10 (Raci).
export function composerSeance(phrase, styleChoisi) {
  const n = normNom(phrase);
  const muscles = extraireMuscles(n);
  if (!muscles.length) return null;
  const veut = /\b(seance|session|workout|entrainement|entraine|train|composer)\b/.test(n)
    || /\bje (veux|vais) faire\b/.test(n)
    || /\bje fais\b/.test(n)
    || /\bfais[- ]moi\b/.test(n)
    || /\b(une|la) seance\b/.test(n);
  if (!veut) return null;

  const lu = lireStyle(n);
  const duree = lu.duree;
  const style = styleChoisi || lu.style;
  if (!style) {
    const titreM = muscles.map((k) => LABEL_MUSCLE[k] || k).join(' + ');
    return {
      action: 'choixStyle',
      phrase,
      titre: titreM,
      texte: 'Séance ' + titreM + ' : quel objectif ?',
      aliments: [],
      local: true,
    };
  }
  const jour = lireJourVise(n);
  const schema = SCHEMAS[style];
  const parGroupe = nbParGroupe(muscles.length, style, duree);
  const refs = [];
  const vus = new Set();
  muscles.forEach((k) => {
    const liste = (PACKS[k] && PACKS[k][style]) || [];
    const mk = k === 'trapezes' ? 'trapezes' : k;
    let pris = 0;
    for (const nom of liste) {
      if (pris >= parGroupe) break;
      const r = refParNom(mk, nom);
      if (!r || vus.has(r.mKey + ':' + r.i)) continue;
      vus.add(r.mKey + ':' + r.i);
      refs.push(r);
      pris += 1;
    }
  });
  if (!refs.length) return null;

  const muscleTitre = muscles.map((k) => LABEL_MUSCLE[k] || k).join(' + ');
  const titre = style === 'hyper' ? muscleTitre : muscleTitre + ' · ' + schema.label;
  return {
    action: 'composerSeance',
    titre,
    muscles,
    style,
    duree,
    schema,
    refs: refs.map((r) => ({ mKey: r.mKey, i: r.i })),
    noms: refs.map((r) => r.nom),
    iso: jour ? jour.iso : null,
    quand: jour ? jour.libelle : null,
    texte: titre + (jour ? ' pour ' + jour.libelle : '') + ' — ' + refs.length + ' exercices · ' + schema.resume + '.',
    aliments: [],
    local: true,
  };
}

/**
 * Liste de courses tiree du journal — v539, reconstruite le 22/09.
 *
 * Le code d'origine n'a jamais ete sauvegarde : le commit a91652c a
 * remplace les 317 lignes de ce fichier par le mot « placeholder », et
 * les quatre restaurations suivantes n'ont remis que des fragments.
 * La fonction est reconstruite a partir de ses tests
 * (tools/test-coach-local.mjs), qui en decrivaient le comportement
 * complet — rien n'est invente au-dela d'eux.
 *
 * Renvoie { action: 'majCourses', jours, pers, noms } :
 *   - jours : « semaine » = 7, « 3 jours » = 3 ; 7 par defaut ;
 *   - pers  : « 2 personnes » = 2 ; 1 par defaut ;
 *   - noms  : les aliments du journal, sans doublon, debarrasses de
 *     leur etat de cuisson — on achete du riz, pas du « riz cuit ».
 */
const DECLENCHEURS_COURSES = /\b(courses?|liste de courses|shopping|boodschappen)\b/;

export function proposerCourses(message, repas = []) {
  const n = normNom(String(message || ''));
  if (!DECLENCHEURS_COURSES.test(n)) return null;

  const mJours = n.match(/(\d+)\s*(jours?|j\b|dagen?|days?)/);
  const jours = mJours ? +mJours[1] : 7;       // « semaine » et defaut
  const mPers = n.match(/(\d+)\s*(personnes?|pers\b|people|personen)/);
  const pers = mPers ? +mPers[1] : 1;

  const vus = new Set();
  const noms = [];
  (repas || []).forEach((r) => {
    ((r && r.ings) || []).forEach((ing) => {
      const nom = String((ing && ing.name) || '')
        .replace(/\s*\((?:cuit|cru)[^)]*\)\s*$/i, '')
        .replace(/\s+(cuit|cuite|cuits|cuites|cru|crue|crus|crues)$/i, '')
        .trim();
      const cle = nom.toLowerCase();
      if (nom && !vus.has(cle)) { vus.add(cle); noms.push(nom); }
    });
  });

  return {
    texte: noms.length
      ? `Ta liste pour ${jours} jour${jours > 1 ? 's' : ''}${pers > 1 ? `, ${pers} personnes` : ''} : ${noms.length} article${noms.length > 1 ? 's' : ''} tires de ton journal.`
      : 'Ton journal est vide : rien a mettre dans la liste pour l\'instant.',
    aliments: [],
    action: 'majCourses',
    jours, pers, noms,
    local: true,
  };
}

/**
 * « Ajoute un repas supplementaire », « une nouvelle collation »,
 * « une boisson en plus » (23/09) : le coach cree une LIGNE dans le
 * journal au lieu de remplir une des quatre lignes fixes.
 * Renvoie 'repas' | 'collation' | 'boisson' | null.
 */
export function lireNouvelleLigne(n) {
  const type = (m) => (/boisson/.test(m) ? 'boisson' : /collation|snack/.test(m) ? 'collation' : 'repas');
  const avant = n.match(/\b(?:nouveau|nouvelle|autre|deuxieme|2e|second|seconde|ajoute un|ajoute une|ajouter un|ajouter une|cree un|cree une|creer un|creer une)\s+(repas|collation|snack|boisson)\b/);
  if (avant) return type(avant[1]);
  const apres = n.match(/\b(repas|collation|snack|boisson)\s+(?:supplementaire|en plus|de plus|en extra|extra)\b/);
  if (apres) return type(apres[1]);
  return null;
}

// Mots que la lecture locale n'a pas compris (04/10) : s'il en reste,
// la barre passe la phrase au coach IA du serveur.
const MOTS_NEUTRES = new Set(['et','avec','puis','aussi','ai','jai','mange','manger','bu','boire','ce','cette',
  'aujourd','hui','ce','matin','midi','soir','sachet','sachets','tranche','tranches','paquet','paquets','pot','pots',
  'portion','portions','boite','boites','piece','pieces','kg','litre','litres','cuillere','cuilleres','soupe',
  'cas','cac','gr','grammes','gramme','des','une','les','pour','petit','dejeuner','diner','collation','snack',
  'deux','trois','quatre','cinq','six','sept','huit','neuf','dix','environ','peu','bien','tout','fait','aussi',
  'cru','crue','crus','crues','cuit','cuite','cuits','cuites','au','aux','sachet',
  'verre','verres','tasse','tasses','bol','bols','canette','canettes','bouteille','bouteilles','pinte','pintes']);
let dernierReste = '';
let portionInconnue = false;

export function parserLocal(message, contexte = {}) {
  dernierReste = ''; portionInconnue = false;
  const r = parserLocalBrut(message, contexte);
  const incompris = dernierReste.split(/\s+/).filter((w) => w.length >= 3 && !/\d/.test(w)
    && !STOP.has(w) && !MOTS_NEUTRES.has(w));
  if (portionInconnue) incompris.push('(portion)');
  return { ...r, incompris };
}

function parserLocalBrut(message, contexte = {}) {
  const brut = String(message || '').trim();
  const n = normNom(brut);
  if (!n) return { texte: '', aliments: [], local: true };

  if (/\b(supprime|supprimer|jette|jeter|annule|annuler|abandonne|abandonner|drop|delete|weggooien)\b/.test(n)
      && /\b(seance|séance|session|workout|entrainement|entraînement)\b/.test(n)) {
    return {
      texte: 'On jette cette séance. Rien ne part au journal.',
      aliments: [],
      action: 'abandonnerSeance',
      local: true,
    };
  }

  if ((/\b(demarre|demarrer|commence|commencer|lance|lancer|start)\b/.test(n)
      && /\b(seance|séance|session|workout)\b/.test(n)
      && !extraireMuscles(n).length)
      || /\bje m.?entraine\b/.test(n)
      || /\btime to (train|workout)\b/.test(n)) {
    return {
      texte: 'On ouvre ta séance du jour.',
      aliments: [],
      action: 'demarrerSeance',
      local: true,
    };
  }

  // Les courses se testent avant la seance : « liste de courses » ne
  // contient aucun muscle, et une phrase de seance ne contient pas le
  // mot « courses » — les deux ne se marchent pas dessus.
  const courses = proposerCourses(brut, contexte.repas);
  if (courses) return courses;

  const composee = composerSeance(brut);
  const seance = composee ? null : proposerAdaptation(brut, contexte.seanceRefs);

  const eauLitres = extraireEau(brut);
  const skip = new Set();
  const vus = new Set();
  const aliments = [];
  const cleRepas = repasCle(brut);
  const push = (cle, q) => {
    if (!cle || !DB[cle] || vus.has(cle)) return;
    vus.add(cle);
    aliments.push({ aliment: cle, quantite: Math.round(q), unite: 'g', repasCle: cleRepas });
  };

  for (const c of COMBOS) {
    if (!c.re.test(n)) continue;
    c.skip.forEach((s) => skip.add(s));
    c.aliments.forEach((a) => push(a.aliment, a.quantite));
    (c.extra || []).forEach((e) => { if (e.si.test(n)) push(e.aliment, e.quantite); });
  }

  // Oeufs (04/10) : « 4 jaunes d'oeufs », « 9 blancs de 30 g »,
  // « 3 oeufs ». Jaune ~17 g, blanc ~33 g ; un oeuf compte en pieces.
  let nOeufs = ' ' + n + ' ';
  const NB = '(\\d+|un|une|deux|trois|quatre|cinq|six|huit|dix)';
  const nb = (x) => NOMBRES[x] || { six: 6, huit: 8, dix: 10 }[x] || parseFloat(x);
  const partie = (re, cle, poidsDefaut) => {
    const m = nOeufs.match(re);
    if (!m) return;
    const poids = m[2] ? parseFloat(m[2].replace(',', '.')) : poidsDefaut;
    push(cle, nb(m[1]) * poids);
    nOeufs = nOeufs.replace(m[0], ' ');
  };
  partie(new RegExp(NB + '\\s+jaunes?(?:\\s+d\\s*oeufs?)?(?:\\s+de\\s+(\\d+[.,]?\\d*)\\s*g)?(?![a-z])'), "Jaune d'oeuf", 17);
  partie(new RegExp(NB + '\\s+blancs?(?:\\s+d\\s*oeufs?)?(?:\\s+de\\s+(\\d+[.,]?\\d*)\\s*g)?(?![a-z])(?!\\s+de\\s+(?:poulet|dinde))'), "Blanc d'oeuf", 33);
  const mOe = nOeufs.match(new RegExp(NB + '\\s+oeufs?(?![a-z])'));
  if (mOe) { push('Oeuf entier M (50g)', nb(mOe[1]) * 50); nOeufs = nOeufs.replace(mOe[0], ' '); }

  // Le texte reconnu est CONSOMME (23/09) : « flocons d'avoine » ne
  // redonne pas « avoine », « pain complet » ne redonne pas « pain »,
  // « jus d'orange » ne redonne pas une orange.
  // Pluriels (04/10) : « 2 steaks », « 3 bananes » -> alias au singulier.
  const cles = Object.keys(ALIAS).flatMap((a) => (a.endsWith('s') || a.includes(' ') ? [a] : [a, a + 's']))
    .sort((a, b) => b.length - a.length);
  let reste = nOeufs;
  for (const a of cles) {
    const sing = ALIAS[a] ? a : a.slice(0, -1);
    if (STOP.has(sing) || skip.has(sing) || a.length < 3) continue;
    const motif = ' ' + a + ' ';
    if (!reste.includes(motif)) continue;
    reste = reste.replace(motif, ' '.repeat(motif.length - 1) + ' ');
    let cle = resoudreAliment(sing);
    const d = cle && DB[cle];
    // « 3 bananes » : 3 portions (04/10), pas une seule.
    const base = PORTION[cle] || (d && d.unit) || 100;
    const iMot = n.indexOf(a);
    const mNb = iMot >= 0 ? n.slice(Math.max(0, iMot - 12), iMot).match(/(\d+|une|un|deux|trois|quatre|cinq|six)\s+$/) : null;
    const nbPieces = mNb ? (NOMBRES[mNb[1]] || { six: 6 }[mNb[1]] || parseFloat(mNb[1])) : 1;
    // « riz ... cru » / « poulet cuit » : la variante dite (04/10).
    const iA = n.indexOf(a);
    const suite = iA >= 0 ? n.slice(iA + a.length, iA + a.length + 24) : '';
    const etat = /^(?:\s+de\s+\d+[.,]?\d*\s*g)?\s+crue?s?\b/.test(suite) ? 'cru'
      : /^(?:\s+de\s+\d+[.,]?\d*\s*g)?\s+cuite?s?\b/.test(suite) ? 'cuit' : null;
    if (etat) {
      const racineNom = cle.replace(/\s*\(?(crue?s?|cuite?s?)\)?\s*$/i, '');
      const essais = etat === 'cru'
        ? [racineNom + ' cru', racineNom + ' crue', racineNom + ' crues', racineNom + ' (cru)', racineNom + ' (crue)']
        : [racineNom + ' cuit', racineNom + ' cuite', racineNom + ' cuites', racineNom + ' (cuit)', racineNom + ' (cuite)'];
      const v = essais.find((x) => DB[x]);
      if (v) cle = v;
    }
    const qDite = quantiteContenant(n, a) || extraireQuantite(n, a);
    // Ni quantite dite, ni portion connue (« un bo bun ») : 100 g serait
    // faux ; le coach IA estime la portion.
    if (!qDite && !PORTION[cle] && !(d && d.unit)) portionInconnue = true;
    push(cle, qDite || base * (nbPieces > 0 && nbPieces < 20 ? nbPieces : 1));
  }
  dernierReste = [...skip].reduce((t, w) => t.replace(new RegExp('\\b' + w + '\\b', 'g'), ' '), reste);
  // Un « verre » de lait ou une « bouteille » de coca n'est pas de
  // l'eau : l'eau ne se compte que si elle est nommee.
  const eauNommee = /\b(eau|water|spa|hydrate)\b/.test(n);
  const eauFinale = aliments.length && !eauNommee ? 0 : eauLitres;

  if (composee) {
    const extra = aliments.length
      ? ' Aussi : ' + aliments.map((a) => a.aliment + ' ' + a.quantite + ' g').join(', ') + '.'
      : '';
    return { ...composee, aliments, eauLitres: eauFinale || 0, texte: composee.texte + extra };
  }

  if (seance) {
    return { texte: seance.texte, aliments, eauLitres: eauFinale || 0, seance, local: true };
  }

  if (!aliments.length && !eauFinale && lireNouvelleLigne(n)) {
    const ligne = lireNouvelleLigne(n);
    const nomType = { repas: 'Repas', collation: 'Collation', boisson: 'Boisson' }[ligne];
    return { texte: 'Nouvelle ligne « ' + nomType + ' » ajoutée au journal.', aliments: [], action: 'creerLigne', ligne, local: true };
  }

  if (!aliments.length && !eauFinale) {
    noterManque(brut);
    return {
      texte: "Pas trouve. Nourriture, eau, ou « j'ai mal au genou ».",
      aliments: [],
      local: true,
    };
  }

  const ligne = lireNouvelleLigne(n);
  if (ligne) {
    const nomType = { repas: 'Repas', collation: 'Collation', boisson: 'Boisson' }[ligne];
    if (!aliments.length) {
      return { texte: 'Nouvelle ligne « ' + nomType + ' » ajoutée au journal.', aliments: [], action: 'creerLigne', ligne, local: true };
    }
    const m = macrosAliments(aliments);
    return {
      texte: 'Nouvelle ligne « ' + nomType + ' » : ' + aliments.map((a) => a.aliment + ' ' + a.quantite + ' g').join(', ')
        + ' \u2248 ' + Math.round(m.kcal) + ' kcal. Verifie puis ajoute.',
      aliments, eauLitres: eauFinale || 0, nouvelleLigne: ligne,
      macros: { kcal: Math.round(m.kcal), prot: Math.round(m.prot), carbs: Math.round(m.carbs), lip: Math.round(m.lip) },
      local: true,
    };
  }

  const macros = macrosAliments(aliments);
  const bits = [];
  if (eauFinale) bits.push(String(eauFinale).replace('.', ',') + ' L d\u2019eau');
  if (aliments.length) bits.push(aliments.map((a) => a.aliment + ' ' + a.quantite + ' g').join(', '));
  let texte = 'Base BelFit : ' + bits.join(' + ') + '.';
  if (aliments.length) {
    texte += ' \u2248 ' + Math.round(macros.kcal) + ' kcal.';
    const obj = contexte.objectifs || {};
    const tot = contexte.totaux || {};
    const reste = (obj.kcal || 0) - (tot.kcal || 0) - macros.kcal;
    if (obj.kcal) {
      texte += reste > 0
        ? ' Il te resterait ' + Math.round(reste) + ' kcal.'
        : ' Ca depasse l\u2019objectif de ' + Math.round(-reste) + ' kcal.';
    }
    texte += ' Verifie puis ajoute.';
  } else texte += ' Verifie puis ajoute.';

  return {
    texte,
    aliments,
    eauLitres: eauFinale || 0,
    macros: { kcal: Math.round(macros.kcal), prot: Math.round(macros.prot), carbs: Math.round(macros.carbs), lip: Math.round(macros.lip) },
    local: true,
  };
}
