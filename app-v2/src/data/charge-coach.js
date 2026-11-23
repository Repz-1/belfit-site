// ============================================================
// COACHING ENTRAINEMENT (21/11, Raci) — partage par l'app et par
// l'espace coach (coach.html l'importe tel quel : AUCUNE dependance).
//
// Le client ne note que ses poids, chacun a sa facon :
//   barre     -> les disques d'UN cote (le total se calcule avec la barre)
//   halteres  -> le poids d'un haltere
//   poulie    -> le poids affiche
//   machine   -> le poids affiche
//   kettlebell-> le poids de la kettlebell
//   corps     -> rien a noter, seulement les series faites
// ============================================================

export const TYPES_CHARGE = [
  { k: 'barre', label: 'Barre' },
  { k: 'halteres', label: 'Haltères' },
  { k: 'poulie', label: 'Poulie' },
  { k: 'machine', label: 'Machine' },
  { k: 'kettlebell', label: 'Kettlebell' },
  { k: 'corps', label: 'Poids du corps' },
];

/** Type de charge d'un exercice de la base (nom + champ mat). */
export function typeCharge(nom, mat) {
  const n = String(nom || '').toLowerCase();
  if (/poulie|câble|cable|vis-à-vis/.test(n)) return 'poulie';
  // Kettlebell AVANT haltere : dans la base, les kettlebells portent mat 'halteres'.
  if (/kettlebell/.test(n) || mat === 'kettlebell') return 'kettlebell';
  if (/haltère|haltere/.test(n) || mat === 'halteres') return 'halteres';
  if (/\(barre|barre ez|smith/.test(n) || mat === 'barre') return /smith/.test(n) ? 'machine' : 'barre';
  if (/machine|presse|leg curl|leg extension|pec deck/.test(n) || mat === 'machine') return 'machine';
  if (mat === 'rien' || mat === 'traction' || mat === 'elastique') return 'corps';
  return 'machine';
}

// Memes disques et memes couleurs que le calculateur de la seance guidee.
export const DISQUES = [
  { kg: 25, c: '#D71016' }, { kg: 20, c: '#2563EB' }, { kg: 15, c: '#FAC408' },
  { kg: 10, c: '#059669' }, { kg: 5, c: '#F8F2E8' }, { kg: 2.5, c: '#151515' },
  { kg: 1.25, c: '#9CA3AF' },
];
export const BARRE_KG = 20;

/** Disques d'un cote (liste de kg) -> total avec la barre. */
export function totalBarre(disques, barre = BARRE_KG) {
  const cote = (disques || []).reduce((s, d) => s + (+d || 0), 0);
  return Math.round((barre + 2 * cote) * 100) / 100;
}

const kg = (v) => String(Math.round(v * 100) / 100).replace('.', ',');

/** « 2 × 20 + 1 × 5 » a partir des disques d'un cote. */
export function texteDisques(disques) {
  const parKg = {};
  (disques || []).forEach((d) => { parKg[d] = (parKg[d] || 0) + 1; });
  const l = Object.keys(parKg).map(Number).sort((a, b) => b - a).map((d) => parKg[d] + ' × ' + kg(d));
  return l.length ? l.join(' + ') : 'Barre seule';
}

/** Pas du + / − selon le type et le poids. */
export function pasCharge(type, v) {
  if (type === 'halteres' || type === 'kettlebell') return v < 10 ? 1 : 2;
  if (type === 'poulie') return 2.5;
  return 5;
}

export { kg as kgTexte };

// 23/11 Raci : des repetitions par serie (« 20 / 10 / 6 »). Une seule valeur =
// toutes les series pareilles. Il manque des valeurs ? la derniere se repete.
export function repsParSerie(reps, n) {
  const l = String(reps || '').split('/').map((x) => x.trim()).filter(Boolean);
  if (!l.length) l.push('10');
  return Array.from({ length: Math.max(1, +n || 1) }, (_, i) => l[Math.min(i, l.length - 1)]);
}
/** Texte court : « 10 » si toutes pareilles, sinon « 20 / 10 / 6 ». */
export function repsTexte(reps, n) {
  const l = repsParSerie(reps, n);
  return l.every((x) => x === l[0]) ? l[0] : l.join(' / ');
}
