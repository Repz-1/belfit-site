// « Aujourd'hui » du journal = jour de Bruxelles (27/10). Test pur (sans navigateur) de aujourdhuiBxl,
// avec 23:59, 00:00, 00:30 et 01:30 belges, en hiver (CET) et en été (CEST), et aux deux bascules d'heure.
import { aujourdhuiBxl, ajouterJours } from '../app-v2/src/store/plans-par-date.js';
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const cas = [
  // [libelle, instant UTC, jour belge attendu]
  ['hiver 23:59 CET',  '2026-11-04T22:59:00Z', '2026-11-04'],
  ['hiver 00:00 CET',  '2026-11-04T23:00:00Z', '2026-11-05'],
  ['hiver 00:30 CET',  '2026-11-04T23:30:00Z', '2026-11-05'],
  ['hiver 01:30 CET',  '2026-11-05T00:30:00Z', '2026-11-05'],
  ['été 23:59 CEST',   '2026-07-14T21:59:00Z', '2026-07-14'],
  ['été 00:00 CEST',   '2026-07-14T22:00:00Z', '2026-07-15'],
  ['été 00:30 CEST',   '2026-07-14T22:30:00Z', '2026-07-15'],
  ['été 01:30 CEST',   '2026-07-14T23:30:00Z', '2026-07-15'],
  ['été 02:30 CEST',   '2026-07-15T00:30:00Z', '2026-07-15'],
  // 29 mars 2026 : 02h -> 03h (la nuit dure 23 h)
  ['bascule mars 01:59 CET',   '2026-03-29T00:59:00Z', '2026-03-29'],
  ['bascule mars 03:00 CEST',  '2026-03-29T01:00:00Z', '2026-03-29'],
  ['mars 23:59 CEST le 29',    '2026-03-29T21:59:00Z', '2026-03-29'],
  ['mars 00:00 CEST le 30',    '2026-03-29T22:00:00Z', '2026-03-30'],
  // 25 octobre 2026 : 03h -> 02h (la nuit dure 25 h)
  ['bascule oct. 02:30 CEST',  '2026-10-25T00:30:00Z', '2026-10-25'],
  ['bascule oct. 02:30 CET',   '2026-10-25T01:30:00Z', '2026-10-25'],
  ['oct. 23:59 CET le 25',     '2026-10-25T22:59:00Z', '2026-10-25'],
  ['oct. 00:00 CET le 26',     '2026-10-25T23:00:00Z', '2026-10-26'],
  ['oct. 00:00 CEST le 25',    '2026-10-24T22:00:00Z', '2026-10-25'],
  ['nouvel an 00:30 CET',      '2026-12-31T23:30:00Z', '2027-01-01'],
];
for (const [lib, utc, att] of cas) { const r = aujourdhuiBxl(new Date(utc)); ok(r === att, `${lib} (${utc}) -> ${r} (attendu ${att})`); }
ok(aujourdhuiBxl(new Date('x')) !== undefined, 'date invalide : pas d\'exception');
ok(ajouterJours('2026-10-25', 1) === '2026-10-26' && ajouterJours('2026-03-29', -1) === '2026-03-28' && ajouterJours('2026-03-01', -1) === '2026-02-28', 'ajouterJours : calendrier pur, sans decalage d\'heure d\'ete');
// sur 3 jours autour de chaque bascule, les jours se suivent un par un (aucun saut, aucun doublon)
for (const [dep, n] of [['2026-03-27T12:00:00Z', 5], ['2026-10-23T12:00:00Z', 5]]) {
  const vus = []; let t = Date.parse(dep);
  for (let i = 0; i < n * 24; i++, t += 3600e3) { const j = aujourdhuiBxl(new Date(t)); if (vus[vus.length - 1] !== j) vus.push(j); }
  const suit = vus.every((j, i) => i === 0 || j === ajouterJours(vus[i - 1], 1));
  ok(suit && vus.length >= n, `autour de ${dep.slice(0, 10)} : les jours belges se suivent sans saut ni doublon (${vus.join(' ')})`);
}
process.exit(code);
