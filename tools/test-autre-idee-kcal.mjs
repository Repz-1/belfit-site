// 29/10 Raci (option A) : « Autre idée » = MEMES kcal que le repas du plan
// (plan 650 -> idee 650, pas 580). Ecart final <= max(2 %, 15 kcal), sur
// beaucoup de cibles, tous les creneaux et plusieurs profils.
// Lancer : node tools/test-autre-idee-kcal.mjs
const racine = new URL('../app-v2/', import.meta.url).pathname;
const A = await import(racine + 'src/services/autre-idee.js');
const { DB, macrosOf } = await import(racine + 'src/data/aliments.js');
const { limitesPortion } = await import(racine + 'src/data/portions.js');
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };

const profils = {
  tout: A.preferencesDe(null),
  vege: A.preferencesDe({ regime: { valeur: 'Végétarien' } }),
  sansOeuf: A.preferencesDe({ allergie: { valeur: 'Oui' }, allergies: { valeurs: ['Oeuf'] } }),
  sansGluten: A.preferencesDe({ allergie: { valeur: 'Oui' }, allergies: { valeurs: ['Gluten / blé'] } }),
};
const CRENEAUX = ['pdej', 'dej', 'Collation', 'Dîner'];
const CIBLES = [];
for (let c = 200; c <= 1100; c += 25) CIBLES.push(c);
let n = 0, horsTol = 0, maxPct = 0, maxAbs = 0, incoherent = 0, horsPlafond = 0, arrondi = 0, vides = 0, filtre = 0;
for (const cr of CRENEAUX) for (const [pn, prefs] of Object.entries(profils)) for (const cible of CIBLES) {
  const liste = A.proposables(cible, prefs, cr);
  if (!liste.length) { vides++; continue; }
  for (const { idee, calage } of liste) {
    n++;
    if (A.raisonExclusion(idee, prefs)) filtre++;
    const reel = A.kcalIngs(calage.ings);               // kcal notees au journal / affichees
    const e = Math.abs(reel - cible);
    if (e > A.toleranceKcal(cible)) horsTol++;
    maxAbs = Math.max(maxAbs, e); maxPct = Math.max(maxPct, e / cible);
    if (Math.abs(Math.round(reel) - calage.kcal) > 1) incoherent++;
    for (const i of calage.ings) {
      const d = DB[i.name], lim = limitesPortion(i.name);
      if (i.portion < lim.min || i.portion > lim.max) horsPlafond++;
      if (d.unit ? !Number.isInteger(i.portion) : i.portion % 5 !== 0) arrondi++;
    }
  }
}
ok(n > 5000, `${n} propositions (${CIBLES.length} cibles 200→1100 × ${CRENEAUX.length} créneaux × ${Object.keys(profils).length} profils)`);
ok(horsTol === 0, `toutes à ±max(2 %, 15 kcal) de la cible — écart max ${Math.round(maxAbs)} kcal / ${(maxPct * 100).toFixed(1)} %`);
ok(incoherent === 0, 'kcal annoncées = kcal des quantités notées au journal');
ok(horsPlafond === 0, 'quantités dans les plafonds de portion');
ok(arrondi === 0, 'grammes multiples de 5, œufs en pièces entières');
ok(filtre === 0, 'filtres régime/allergies toujours respectés');
console.log(`  (${vides} combinaisons sans idée possible sur ${CIBLES.length * CRENEAUX.length * 4})`);

// Exemple de Raci : petit-dejeuner prevu 650 kcal.
const vues = new Set();
for (let k = 0; k < 5; k++) {
  const p = A.prochaineIdee(650, profils.tout, vues, null, 'pdej');
  ok(p && Math.abs(A.kcalIngs(p.ings) - 650) <= 15, `pdej 650 → « ${p && p.nom} » ${p && p.kcal} kcal`);
}
process.exit(code);
