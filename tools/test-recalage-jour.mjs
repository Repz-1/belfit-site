// 29/10 Raci (option B) : « Je choisis ce repas » -> l'ecart est reparti sur
// les repas encore prevus ; le total du jour = total du plan ; les repas
// manges / sautes / « autre chose » ne bougent JAMAIS.
// Lancer : node tools/test-recalage-jour.mjs
const racine = new URL('../app-v2/', import.meta.url).pathname;
const R = await import(racine + 'src/services/recalage-jour.js');
const A = await import(racine + 'src/services/autre-idee.js');
let code = 0, nOk = 0; const ok = (c, m) => { if (c) nOk++; else { console.log('✗ ' + m); code = 1; } };

// Petit generateur deterministe
let graine = 42; const alea = () => (graine = (graine * 1103515245 + 12345) % 2147483648) / 2147483648;
const PLATS = [
  [['Flocons avoine', 110], ['Banane', 140], ['Lait 1/2 écrémé', 250]],
  [['Riz cuit', 250], ['Poulet cuit', 180], ['Brocoli', 150]],
  [['Pomme de terre cuite', 300], ['Saumon cuit', 150], ['Brocoli', 200]],
  [['Oeuf entier M (50g)', 3], ['Pain complet', 80], ['Fromage blanc 0%', 200]],
  [['Pâtes blanches cuites', 280], ['Boeuf hache 5% cuit', 150]],
];
const CRENEAUX = [['Petit-déjeuner', 'pdej'], ['Collation matin', 'snack'], ['Déjeuner', 'dej'], ['Collation', 'snack'], ['Dîner', 'diner']];
const { DB } = await import(racine + 'src/data/aliments.js');
for (const p of PLATS) for (const [n] of p) if (!DB[n]) { console.log('aliment inconnu (test) : ' + n); process.exit(1); }

function jour(nb, echelle) {
  return Array.from({ length: nb }, (_, k) => ({
    id: k + 1, nom: CRENEAUX[k][0], cle: CRENEAUX[k][1], duPlan: true, prevu: true, type: 'repas',
    ings: PLATS[(k + Math.floor(alea() * 5)) % 5].map(([name, q], j) => ({ id: (k + 1) * 1000 + j, name, portion: DB[name].unit ? Math.max(1, Math.round(q * echelle)) : Math.round(q * echelle / 5) * 5 })),
  }));
}
const tous = A.preferencesDe(null);
let le2 = 0; let scen = 0, maxEcart = 0, mode = { A: 0, B: 0 }, horsTol = 0;
const TOL = 5;
for (let s = 0; s < 400; s++) {
  const nb = 3 + Math.floor(alea() * 3);
  let l = jour(nb, 0.8 + alea() * 0.8);
  const T = R.totalPlanJour(l);
  // Etats des repas avant le repas choisi : manges / sautes / autre chose
  const cible = Math.floor(alea() * nb);
  const avant = {};
  for (const r of l) if (r.id - 1 < cible) {
    const x = alea();
    if (x < 0.6) r.prevu = false;                           // mange
    else if (x < 0.8) { r.prevu = false; r.saute = true; }  // saute
    else { r.remplace = true; r.ingsPlan = r.ings; r.ings = [{ id: 1, name: 'Banane', portion: 120 }]; }
  }
  // Parfois un repas APRES est deja mange aussi (hors ordre)
  if (alea() < 0.2 && cible + 1 < nb) l[cible + 1].prevu = false;
  for (const r of l) if (!R.estAjustable(r) && r.id - 1 !== cible) avant[r.id] = JSON.stringify(r);
  // Defilement : 1 a 3 idees, rien ne doit bouger ailleurs
  const x = l[cible];
  const kPlan = R.kcalDe(x.ings);
  const vues = new Set(); let idee = null;
  const tours = 1 + Math.floor(alea() * 3);
  for (let t = 0; t < tours; t++) {
    const p = A.prochaineIdee(kPlan, tous, vues, idee && idee.nom, x.cle);
    if (!p) break; idee = p;
  }
  if (!idee) continue;
  const autresAvant = JSON.stringify(l.filter(r => r.id !== x.id));
  l = l.map(r => r.id === x.id ? { ...r, ingsPlan: r.ings, idee: { nom: idee.nom, kcal: idee.kcal, cible: idee.cible }, ings: idee.ings.map(i => ({ name: i.name, portion: i.portion })) } : r);
  ok(JSON.stringify(l.filter(r => r.id !== x.id)) === autresAvant, 'defilement : rien ne change ailleurs');
  ok(Math.abs(idee.kcal - kPlan) / kPlan <= 0.0701, 'defilement : idee a ±7 %');
  // Confirmation
  const res = R.confirmerIdeeJour(l, x.id, A.calerParNom);
  scen++; mode[res.mode]++;
  const apres = res.liste;
  const e = Math.abs(R.totalJourPrevu(apres) - T);
  maxEcart = Math.max(maxEcart, e); if (e <= 2) le2++;
  if (e > TOL) { horsTol++; if (horsTol < 3) console.log("  ecart", e.toFixed(1), "scenario", s, res.mode, JSON.stringify(apres.map(r => [r.nom, r.prevu, r.saute, r.remplace, !!r.idee, Math.round(R.kcalPlan(r)), Math.round(R.kcalDe(r.ings)), Math.round(R.contribution(r))]))); }
  for (const id in avant) ok(JSON.stringify(apres.find(r => r.id === +id)) === avant[id], 'repas mange/saute/autre chose INCHANGE (scenario ' + s + ')');
  const xx = apres.find(r => r.id === x.id);
  ok(xx.idee.confirme, 'idee confirmee');
  if (res.mode === 'B') ok(JSON.stringify(xx.ings.map(i => [i.name, i.portion])) === JSON.stringify(l.find(r => r.id === x.id).ings.map(i => [i.name, i.portion])), 'mode B : le repas choisi garde ses quantites');
  for (const r of apres) if (r.ajuste) for (const i of r.ings) ok(i.portion > 0 && (DB[i.name].unit ? Number.isInteger(i.portion) : i.portion % 5 === 0), 'arrondi 5 g / piece entiere');
  for (const r of apres) if (r.ajuste) ok(R.kcalDe(r.ingsOrig) === R.kcalPlan(r), 'plan d\'origine garde (ingsOrig)');
  // Revenir au plan : tout revient au plan exact
  const ret = R.recalerJour(apres.map(r => { if (r.id !== x.id) return r; const n = { ...r, ings: r.ingsPlan }; delete n.idee; delete n.ingsPlan; return n; })).liste;
  for (const r of ret) if (R.estAjustable(r)) ok(R.kcalDe(r.ings) === R.kcalPlan(r) && !r.ajuste, 'annulation : retour exact au plan');
  ok(Math.abs(R.totalJourPrevu(ret) - T) <= TOL, 'annulation : total = plan');
  // Puis on mange le repas suivant ajuste et on saute le dernier : le total reste juste
  const suiv = apres.find(r => R.estAjustable(r));
  if (suiv) {
    let l2 = apres.map(r => r.id === suiv.id ? { ...r, prevu: false } : r);
    const fige = JSON.stringify(l2.find(r => r.id === suiv.id));
    const dern = [...l2].reverse().find(r => R.estAjustable(r));
    if (dern) l2 = l2.map(r => r.id === dern.id ? { ...r, prevu: false, saute: true } : r);
    l2 = R.recalerJour(l2).liste;
    ok(JSON.stringify(l2.find(r => r.id === suiv.id)) === fige, 'repas ajuste PUIS mange : ne bouge plus');
    if (l2.some(R.estAjustable)) { const e2 = Math.abs(R.totalJourPrevu(l2) - T); maxEcart = Math.max(maxEcart, e2); if (e2 > TOL) horsTol++; }
  }
}
// Exemple de Raci : 3100 kcal, petit-dej 650 -> idee 580 -> +70 sur la suite
{
  const l = [
    { id: 1, nom: 'Petit-déjeuner', cle: 'pdej', duPlan: true, prevu: true, ings: [{ name: 'Flocons avoine', portion: 110 }, { name: 'Banane', portion: 140 }, { name: 'Lait 1/2 écrémé', portion: 250 }] },
    { id: 2, nom: 'Déjeuner', cle: 'dej', duPlan: true, prevu: true, ings: [{ name: 'Riz cuit', portion: 300 }, { name: 'Poulet cuit', portion: 200 }, { name: 'Brocoli', portion: 150 }] },
    { id: 3, nom: 'Dîner', cle: 'diner', duPlan: true, prevu: true, ings: [{ name: 'Pomme de terre cuite', portion: 400 }, { name: 'Saumon cuit', portion: 200 }, { name: 'Brocoli', portion: 200 }] },
  ];
  const T = R.totalPlanJour(l);
  const l2 = l.map(r => r.id === 1 ? { ...r, ingsPlan: r.ings, idee: { nom: 'x', cible: 0 }, ings: [{ name: 'Flocons avoine', portion: 80 }, { name: 'Banane', portion: 140 }, { name: 'Lait 1/2 écrémé', portion: 250 }] } : r);
  const res = R.confirmerIdeeJour(l2, 1);
  console.log(`exemple : plan ${Math.round(T)} kcal, idee ${Math.round(R.kcalDe(l2[0].ings))} au lieu de ${Math.round(R.kcalPlan(l[0]))} -> total ${Math.round(R.totalJourPrevu(res.liste))} (mode ${res.mode}, ${res.ecartReparti > 0 ? '+' : ''}${res.ecartReparti} kcal reparties)`);
  ok(Math.abs(R.totalJourPrevu(res.liste) - T) <= TOL, 'exemple Raci exact');
  // Dernier repas : option A
  const l3 = l.map(r => r.id < 3 ? { ...r, prevu: false } : { ...r, ingsPlan: r.ings, idee: { nom: 'inconnue', cible: 0 }, ings: [{ name: 'Pâtes blanches cuites', portion: 300 }, { name: 'Poulet cuit', portion: 150 }] });
  const r3 = R.confirmerIdeeJour(l3, 3);
  ok(r3.mode === 'A' && Math.abs(R.totalJourPrevu(r3.liste) - T) <= TOL, 'dernier repas : option A, total exact');
}
console.log(`${scen} scenarios confirmes (B: ${mode.B}, A: ${mode.A}), ${nOk} verifications OK, ecart max du total jour : ${maxEcart.toFixed(1)} kcal, hors ±${TOL} kcal : ${horsTol}, ecart <= 2 kcal : ${le2}/${scen}`);
if (horsTol) code = 1;
console.log(code ? 'ECHEC' : 'OK');
process.exit(code);
