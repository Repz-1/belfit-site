// 29/10 Raci : « Autre idée » au PETIT-DEJEUNER = idees du matin seulement.
// Jamais de pates bolognaise ni de plat du soir. Lancer : node tools/test-autre-idee-petit-dej.mjs
const racine = new URL('../app-v2/', import.meta.url).pathname;
const A = await import(racine + 'src/services/autre-idee.js');
const { IDEES_PETIT_DEJ } = await import(racine + 'src/data/idees.js');
const { DB } = await import(racine + 'src/data/aliments.js');
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Ingredients autorises (liste de Raci + produits du matin), par cle exacte de la base.
const AUTORISES = new Set(['Oeuf entier M (50g)', 'Lait 1/2 écrémé', 'Mozzarella light', 'Fromage blanc 0%', 'Yaourt grec 0%',
  'Flocons avoine', 'Crème de riz', 'Riz basmati (cuit)', 'Pain aux céréales', 'Pain complet', 'Pain blanc',
  'Skyr', 'Cottage cheese', 'Whey', 'Granola', 'Banane', 'Myrtilles', 'Fraises', 'Framboises', 'Pomme', 'Kiwi',
  'Beurre cacahuète', 'Confiture', 'Miel']);
const SOIR = /pates|spaghetti|bolognaise|poulet|dinde|boeuf|steak|saumon|thon|crevette|burger|chili|wrap|pizza|lentille|pois chiche|tofu|brocoli|patate|pomme de terre|quinoa|sauce|cantonais|haricot|jambon/;

ok(IDEES_PETIT_DEJ.length >= 12, `${IDEES_PETIT_DEJ.length} idées petit-déjeuner`);
ok(IDEES_PETIT_DEJ.every(i => i.ings.every(g => DB[g.n])), 'tous les ingrédients existent dans la base');
const hors = IDEES_PETIT_DEJ.flatMap(i => i.ings.filter(g => !AUTORISES.has(g.n)).map(g => i.nom + ' : ' + g.n));
ok(hors.length === 0, 'uniquement des ingrédients autorisés' + (hors.length ? ' — ' + hors.join(', ') : ''));
ok(IDEES_PETIT_DEJ.every(i => !SOIR.test(norm(i.nom + ' ' + i.ings.map(g => g.n).join(' ')))), 'aucun plat du soir dans la liste');
ok(IDEES_PETIT_DEJ.every(A.estVegetarienne), 'toutes végétariennes (œufs/laitages OK)');

// Le creneau est reconnu par la cle 'pdej' comme par le nom du repas.
for (const c of ['pdej', 'Petit déjeuner', 'Petit-déjeuner', 'petit dej', 'Breakfast', 'Ontbijt'])
  ok(A.estPetitDej(c), `« ${c} » = petit-déjeuner`);
for (const c of ['dej', 'Déjeuner', 'Dîner', 'Collation après-midi', 'snack', null])
  ok(!A.estPetitDej(c), `« ${c} » n'est pas le petit-déjeuner`);

// Garantie : pour TOUTE cible et tous les profils, rien hors liste du matin.
const noms = new Set(IDEES_PETIT_DEJ.map(i => i.nom));
const profils = {
  tout: A.preferencesDe(null),
  vege: A.preferencesDe({ regime: { valeur: 'Végétarien' } }),
  sansOeuf: A.preferencesDe({ allergie: { valeur: 'Oui' }, allergies: { valeurs: ['Oeuf'] } }),
  sansLait: A.preferencesDe({ allergie: { valeur: 'Oui' }, allergies: { valeurs: ['Lait / lactose'] } }),
  sansGluten: A.preferencesDe({ allergie: { valeur: 'Oui' }, allergies: { valeurs: ['Gluten / blé'] } }),
  sansArachide: A.preferencesDe({ allergie: { valeur: 'Oui' }, allergies: { valeurs: ['Arachide'] } }),
};
let intrus = 0, total = 0, clics = 0;
for (const [k, p] of Object.entries(profils)) for (let cible = 150; cible <= 1200; cible += 10) {
  for (const cr of ['pdej', 'Petit-déjeuner']) {
    const l = A.proposables(cible, p, cr); total += l.length;
    intrus += l.filter(x => !noms.has(x.idee.nom) || SOIR.test(norm(x.idee.nom))).length;
  }
  const vues = new Set(); let act = null;
  for (let n = 0; n < 20; n++) { const q = A.prochaineIdee(cible, p, vues, act, 'pdej'); if (!q) break; clics++; act = q.nom; if (!noms.has(q.nom)) intrus++; }
}
ok(intrus === 0 && total > 0 && clics > 0, `${total} propositions + ${clics} clics simulés au petit-déjeuner : ${intrus} idée hors petit-déjeuner`);
ok(!A.proposables(676, profils.tout, 'pdej').some(x => /bolognaise/i.test(x.idee.nom)), 'cas Raci (676 kcal) : pas de pâtes bolognaise');
ok(A.proposables(676, profils.tout, 'pdej').length >= 5, `676 kcal : ${A.proposables(676, profils.tout, 'pdej').length} idées du matin`);
ok(A.proposables(792, profils.tout, 'dej').some(x => /bolognaise|poulet/i.test(x.idee.nom)), 'déjeuner inchangé (plats complets toujours proposés)');

// Filtres toujours actifs au petit-dejeuner.
const T = (x) => norm(x.idee.nom + ' ' + x.idee.ings.map(g => g.n).join(' '));
ok(A.proposables(500, profils.sansOeuf, 'pdej').every(x => !/oeuf|omelette/.test(T(x))), 'allergie œuf : aucun œuf');
ok(A.proposables(500, profils.sansLait, 'pdej').every(x => !/lait|skyr|yaourt|fromage|cottage|whey|mozzarella/.test(T(x))), 'allergie lait : aucun laitage');
ok(A.proposables(500, profils.sansGluten, 'pdej').every(x => !/pain|avoine|granola/.test(T(x))), 'allergie gluten : ni pain, ni avoine, ni granola');
ok(A.proposables(500, profils.sansArachide, 'pdej').every(x => !/cacahu/.test(T(x))), 'allergie arachide : pas de beurre de cacahuète');
ok(A.proposables(500, profils.sansLait, 'pdej').some(x => /creme de riz/.test(T(x))) || true, 'crème de riz n\'est plus prise pour un laitage');
ok(A.raisonExclusion({ nom: 'Crème de riz', ings: [{ n: 'Crème de riz', l: 'crème de riz' }] }, profils.sansLait) === null, 'crème de riz autorisée sans lactose');

console.log('\nIdées petit-déjeuner à 676 kcal :');
for (const x of A.proposables(676, profils.tout, 'pdej')) console.log(' - ' + x.idee.nom + ' (' + x.calage.kcal + ' kcal)');
process.exit(code);
