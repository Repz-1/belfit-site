// 25/11 « Tu as quoi a portee de main ? » : le repas recalcule tient les kcal
// du plan (±8 %) quand un feculent est choisi, et le regime filtre les proteines.
import { calculerRepas, groupesPour } from '../app-v2/src/services/mes-aliments.js';
import { preferencesDe } from '../app-v2/src/services/autre-idee.js';
let ko = 0; const ok = (c, m) => { if (!c) { ko++; console.log('ECHEC ' + m); } };
const cas = [
  [{ proteine: ['Blanc de poulet (cuit)'], feculent: ['Riz basmati (cuit)'], legumes: ['Courgette'] }, { kcal: 600, prot: 45 }, 'diner'],
  [{ proteine: ['Saumon cuit'], feculent: ['Pomme de terre (cuite)'], legumes: ['Haricots verts'] }, { kcal: 617, prot: 45 }, 'diner'],
  [{ proteine: ['Oeuf entier M (50g)'], feculent: ['Pain complet'], legumes: [] }, { kcal: 450, prot: 30 }, 'pdej'],
  [{ proteine: ['Skyr'], feculent: ["Flocons d'avoine"], legumes: ['Banane'] }, { kcal: 500, prot: 35 }, 'pdej'],
];
for (const [c, t, cr] of cas) { const r = calculerRepas(c, t, cr); ok(r && Math.abs(r.kcal - t.kcal) <= t.kcal * 0.08, `${t.kcal} kcal -> ${r && r.kcal}`); }
ok(calculerRepas({ proteine: [], feculent: ['Riz basmati (cuit)'], legumes: [] }, { kcal: 600, prot: 40 }, 'diner') === null, 'sans proteine -> null');
const veg = groupesPour('diner', preferencesDe({ regime: { valeur: 'Végétarien' } }))[0].items.map(i => i.l);
ok(!veg.includes('Poulet') && veg.includes('Tofu'), 'vegetarien : proteines vegetales seulement');
const vegan = groupesPour('diner', preferencesDe({ regime: { valeur: 'Végan' } }))[0].items.map(i => i.l);
ok(!vegan.includes('Œufs'), 'vegan : pas d\'oeufs');
console.log(ko ? ko + ' echec(s)' : '✓ mes-aliments : tout passe'); process.exit(ko ? 1 : 0);
