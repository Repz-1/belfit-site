// 28/10 : audit EXHAUSTIF et DETERMINISTE du filtre d'allergies / refus de « Autre idée ».
// Aucun hasard, aucun navigateur, aucun reseau : Node seul. Lancer depuis la racine :
//   node tools/test-autre-idee-allergies.mjs
// Principe : une table de verite INDEPENDANTE du filtre (ce que contient reellement chaque aliment,
// derives caches compris : sauce soja = soja + ble, riz cantonais = oeuf + soja + ble…).
// Pour CHAQUE allergie/refus (seul, puis par paires) x CHAQUE cible 300–700 kcal (pas de 1),
// on verifie qu'AUCUNE idee proposee ne contient l'allergene. DONNEES FICTIVES (questionnaire de banc).
const racine = new URL('../app-v2/', import.meta.url).pathname;
const A = await import(racine + 'src/services/autre-idee.js');
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };

// ---- Verite terrain : cle de la base -> etiquettes (jamais deduite des noms par le filtre) ----
const T = {
  'Oeuf entier M (50g)': 'oeuf',
  'Riz cantonais': 'oeuf soja gluten',                 // recette : oeuf + sauce soja (soja + ble)
  'Skyr': 'lait fromage', 'Fromage blanc 0%': 'lait fromage', 'Whey': 'lait', 'Cheddar': 'lait fromage',
  'Mozzarella': 'lait fromage', 'Feta': 'lait fromage',
  'Pain complet': 'gluten', 'Pain blanc': 'gluten', 'Pain hamburger': 'gluten', 'Wrap/Tortilla': 'gluten',
  'Pâtes blanches cuites': 'gluten', 'Boulgour cru': 'gluten', 'Avoine': 'gluten', 'Flocons avoine': 'gluten',
  'Beurre cacahuète': 'arachide', 'Amandes': 'coque',
  'Saumon cuit': 'poisson saumon', 'Saumon fume': 'poisson saumon', 'Thon naturel boite': 'poisson thon',
  'Crevettes': 'crustace', 'Tofu': 'soja',
  'Poulet cuit': 'viande volaille poulet', 'Dinde escalope cuite': 'viande volaille dinde', 'Dinde hachée cuite': 'viande volaille dinde',
  'Jambon de dinde': 'viande volaille dinde', 'Boeuf hache 5% cuit': 'viande boeuf', 'Boeuf hache 15% cuit': 'viande boeuf',
};
// Aliments sans allergene majeur ni viande (liste fermee : un nouvel aliment inconnu fait ECHOUER le test).
const NEUTRES = ['Riz cuit', 'Brocoli', 'Patate douce (cuite)', 'Salade verte', 'Quinoa (cuit)', 'Tomate', 'Pomme de terre cuite', 'Haricots verts',
  'Patate douce', 'Quinoa cru', 'Courgette', 'Épinards', 'Poivron', 'Myrtilles', 'Maïs', 'Banane', 'Galette de riz', 'Sauce tomate',
  'Haricots rouges (cuits)', 'Pois chiches (cuits)', 'Avocat', 'Lentilles (cuites)', 'Épinards frais', 'Lentilles corail', 'Lait de coco',
  'Pois chiches cuits', 'Haricots rouges', 'Haricots noirs', 'Miel'];
const tags = (nom) => nom in T ? T[nom].split(' ') : (NEUTRES.includes(nom) ? [] : null);

const tout = A.toutesLesIdees();
const inconnus = [...new Set(tout.flatMap(i => i.ings.map(g => g.n)).filter(n => tags(n) === null))];
ok(inconnus.length === 0, 'chaque ingrédient de chaque idée est classé dans la table de vérité' + (inconnus.length ? ' — INCONNUS : ' + inconnus.join(', ') : ` (${tout.length} idées)`));
const contient = (ings, etiquette) => ings.some(g => (tags(g.name || g.n) || []).includes(etiquette));

// ---- Scenarios : [libelle, reponses du questionnaire, etiquettes interdites] ----
const Q = (fam, refus) => ({ regime: { valeur: 'Tout' }, allergie: { valeur: fam.length ? 'Oui' : 'Non, aucune' }, allergies: { valeurs: fam }, refuses: { valeur: refus || '' } });
const FAM = { 'Œuf': 'oeuf', 'Lait / lactose': 'lait', 'Gluten / blé': 'gluten', 'Arachide': 'arachide', 'Fruits à coque': 'coque',
  'Poisson': 'poisson', 'Crustacés / mollusques': 'crustace', 'Soja': 'soja' };
const REF = { 'poulet': ['poulet'], 'oeufs': ['oeuf'], 'les œufs': ['oeuf'], 'viande': ['viande'], 'je ne mange pas de viande': ['viande'], 'boeuf': ['boeuf'],
  'dinde': ['dinde'], 'volaille': ['volaille'], 'poisson': ['poisson'], 'saumon': ['saumon'], 'thon': ['thon'], 'fromage': ['fromage'], 'lait': ['lait'],
  'gluten': ['gluten'], 'crevettes': ['crustace'], 'soja': ['soja'], 'cacahuètes': ['arachide'], 'amandes': ['coque'] };
const scen = [];
for (const [f, t] of Object.entries(FAM)) scen.push([`allergie ${f}`, Q([f]), [t]]);
for (const [r, t] of Object.entries(REF)) scen.push([`refus « ${r} »`, Q([], r), t]);
const fams = Object.entries(FAM);
for (let a = 0; a < fams.length; a++) for (let b = a + 1; b < fams.length; b++) scen.push([`allergies ${fams[a][0]} + ${fams[b][0]}`, Q([fams[a][0], fams[b][0]]), [fams[a][1], fams[b][1]]]);
for (const [f, t] of fams) for (const [r, tr] of [['poulet', ['poulet']], ['viande', ['viande']], ['fromage', ['fromage']]]) scen.push([`allergie ${f} + refus « ${r} »`, Q([f], r), [t, ...tr]]);
scen.push(['CAS DU TEST : allergie Œuf + refus poulet', Q(['Œuf'], 'poulet'), ['oeuf', 'poulet']]);
scen.push(['allergie « Autre » texte libre « arachides, œufs »', { allergie: { valeur: 'Oui' }, allergies: { valeurs: ['Autre'], autre: 'arachides, œufs' } }, ['arachide', 'oeuf']]);
scen.push(['précision libre « allergique au poisson et au lait »', { allergie: { valeur: 'Oui' }, allergies: { valeurs: [] }, allergiePrecis: { valeur: 'allergique au poisson et au lait' } }, ['poisson', 'lait']]);

// Calage (quantites par idee et par cible) : independant des preferences, calcule une fois par cible.
const CIBLES = []; for (let k = 300; k <= 700; k++) CIBLES.push(k);
const tousPrefs = A.preferencesDe(null);
const base = new Map(CIBLES.map(c => [c, A.proposables(c, tousPrefs)]));
// Controle de la methode rapide : pour quelques scenarios/cibles, proposables() reel == base filtree par raisonExclusion.
let ecartMethode = 0;
for (const [, rep] of scen.filter((_, i) => i % 9 === 0)) {
  const prefs = A.preferencesDe(rep);
  for (const c of CIBLES.filter(c => c % 50 === 0)) {
    const reel = A.proposables(c, prefs).map(x => x.idee.nom).join('|');
    const rapide = base.get(c).filter(x => !A.raisonExclusion(x.idee, prefs)).map(x => x.idee.nom).join('|');
    if (reel !== rapide) ecartMethode++;
  }
}
ok(ecartMethode === 0, 'méthode rapide du test = proposables() réel (échantillon de scénarios × cibles)');

const fautes = []; let verifs = 0, vides = 0;
for (const [lib, rep, interdits] of scen) {
  const prefs = A.preferencesDe(rep);
  let nbFaute = 0, vu = 0;
  for (const c of CIBLES) for (const x of base.get(c)) {
    if (A.raisonExclusion(x.idee, prefs)) continue;
    verifs++; vu++;
    for (const i of interdits) if (contient(x.calage.ings, i)) { nbFaute++; fautes.push({ scen: lib, cible: c, idee: x.idee.nom, allergene: i }); }
  }
  if (!vu) vides++;
  ok(nbFaute === 0, `${lib} : ${vu} propositions (401 cibles), ${nbFaute} contenant l'allergène`);
}
// Controle sur la fonction reellement appelee par le bouton (prochaineIdee) : plusieurs tours complets.
let fautesBouton = 0, appels = 0;
const cles = scen.filter(([l]) => /^allergie [^+]*$|CAS DU TEST|^refus « (poulet|oeufs|viande|poisson|fromage) »/.test(l));
for (const [lib, rep, interdits] of cles) {
  const prefs = A.preferencesDe(rep);
  for (const c of [300, 400, 450, 500, 550, 600, 700]) {
    const vues = new Set(); let actuelle = null;
    for (let k = 0; k < 25; k++) {
      const p = A.prochaineIdee(c, prefs, vues, actuelle); if (!p) break; appels++; actuelle = p.nom;
      for (const i of interdits) if (contient(p.ings, i)) { fautesBouton++; fautes.push({ scen: lib + ' (bouton)', cible: c, idee: p.nom, allergene: i }); }
    }
  }
}
ok(fautesBouton === 0 && appels > 300, `bouton (prochaineIdee), ${appels} clics simulés : ${fautesBouton} idée avec l'allergène`);
// Non-vacuite : sans filtre, chaque etiquette testee apparait bien dans des idees (sinon le test ne prouverait rien).
for (const t of new Set(scen.flatMap(s => s[2]))) {
  const n = CIBLES.filter(c => base.get(c).some(x => contient(x.calage.ings, t))).length;
  ok(n > 0, `non-vacuité : sans filtre, des idées « ${t} » sont proposées (sur ${n} cibles) — le test peut les détecter`);
}
ok(vides <= 3, `${vides} scénarios sans aucune idée proposable (normal pour les cumuls extrêmes)`);
if (fautes.length) {
  const uniques = [...new Map(fautes.map(f => [f.idee + '|' + f.allergene, f])).values()];
  console.log('  CAS FAUTIFS (idée × allergène) :'); for (const f of uniques) console.log(`   - « ${f.idee} » contient « ${f.allergene} » (scénario « ${f.scen} », cible ${f.cible} kcal)`);
}
console.log(`  ${verifs} propositions vérifiées`);
process.exit(code);
