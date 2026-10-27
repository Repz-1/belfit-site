// Ecran de bienvenue : parties pures (banque de messages, tranches, tirage, frequence).
// Sans navigateur. Lancer : node tools/test-accueil-messages.mjs
import { BANQUE, TRANCHES, trancheDe, salutationDe, choisirIndex, composerAccueil, lireDernier, ecrireDernier, rendreTexte, estLong } from '../app-v2/src/services/accueil-messages.js';
import { momentBruxelles, absenceLongue, ABSENCE_MS } from '../app-v2/src/services/accueil-frequence.js';
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const tr = (iso) => trancheDe(momentBruxelles(new Date(iso)).heure);

// --- Tranches : bornes 4h59 / 5h / 9h / 12h / 14h / 18h / 21h59 / 22h, hiver (UTC+1) puis ete (UTC+2)
for (const [nom, deca, jour] of [['hiver', '+01:00', '2026-12-10'], ['ete', '+02:00', '2026-07-10']]) {
  const t = (hm) => tr(jour + 'T' + hm + ':00' + deca);
  ok(t('04:59') === 'nuit' && t('05:00') === 'tot', nom + ' : 4h59 = nuit, 5h00 = tot');
  ok(t('08:59') === 'tot' && t('09:00') === 'fin_matinee', nom + ' : 8h59 = tot, 9h00 = fin de matinee');
  ok(t('11:59') === 'fin_matinee' && t('12:00') === 'midi', nom + ' : 11h59 = fin de matinee, 12h00 = midi');
  ok(t('13:59') === 'midi' && t('14:00') === 'apres_midi', nom + ' : 13h59 = midi, 14h00 = apres-midi');
  ok(t('17:59') === 'apres_midi' && t('18:00') === 'soir', nom + ' : 17h59 = apres-midi, 18h00 = soir');
  ok(t('21:59') === 'soir' && t('22:00') === 'nuit', nom + ' : 21h59 = soir, 22h00 = nuit');
  ok(t('00:00') === 'nuit' && t('23:59') === 'nuit', nom + ' : minuit et 23h59 = nuit');
}
// L'heure de l'appareil / l'UTC ne comptent pas : 21h30 UTC en ete = 23h30 a Bruxelles = nuit
ok(tr('2026-07-10T21:30:00Z') === 'nuit' && tr('2026-12-10T21:30:00Z') === 'nuit' && tr('2026-12-10T20:59:00Z') === 'soir', 'tranche calculee sur Bruxelles, pas sur l\'UTC');
// Passage a l'heure d'hiver (25/10/2026, 03h -> 02h) : 4h59 reste nuit, 5h00 tot
ok(tr('2026-10-25T04:59:00+01:00') === 'nuit' && tr('2026-10-25T05:00:00+01:00') === 'tot', 'jour du changement d\'heure : bornes inchangees');
ok(trancheDe(NaN) === 'fin_matinee' && trancheDe(24) === 'nuit' && trancheDe(-1) === 'nuit', 'heure invalide : repli sans erreur');

// --- Salutation
ok(salutationDe('tot') === 'Bonjour' && salutationDe('apres_midi') === 'Bonjour' && salutationDe('soir') === 'Bonsoir' && salutationDe('nuit') === 'Bonsoir', 'Bonjour jusqu\'a 17h59, Bonsoir ensuite');

// --- Banque : invariants
const NB = '\u00a0';
ok(TRANCHES.length === 6 && TRANCHES.every(k => BANQUE[k]), '6 tranches, toutes avec une banque');
let tous = [];
for (const k of TRANCHES) {
  const L = BANQUE[k]; tous = tous.concat(L.map(e => e.t));
  const nt = L.filter(e => e.taquin).length, np = L.filter(e => e.t.includes('{p}')).length;
  ok(L.length === 8, k + ' : 8 messages (' + L.length + ')');
  ok(nt >= 2 && nt <= 4, k + ' : environ un tiers de taquins (' + nt + '/' + L.length + ')');
  ok(np >= 2 && np <= 4, k + ' : le prenom n\'apparait que parfois (' + np + '/' + L.length + ')');
  ok(L.some(e => /^Bon(jour|soir) \{p\}$/.test(e.t)), k + ' : contient « Bonjour/Bonsoir {prenom} »');
}
ok(new Set(tous.filter(t => !t.includes('{p}'))).size === tous.filter(t => !t.includes('{p}')).length, 'aucun message en double (hors modeles a prenom)');
{ // meme apres suppression du prenom, aucun doublon dans une tranche
  const bad = TRANCHES.filter(k => { const r = BANQUE[k].map(e => rendreTexte(e.t, '')); return new Set(r).size !== r.length; });
  ok(bad.length === 0, 'sans prenom : aucun doublon dans une tranche' + (bad.length ? ' (' + bad + ')' : ''));
}
ok(tous.every(t => !/\d/.test(t)), 'aucun chiffre dans aucun message');
const INTERDITS = /kilo|\bkg\b|poids|maigr|gros|gras|régime|regime|calor|kcal|\bminc|silhouette|corps|ventre|saut[ée]|culpab|honte|paresseu|flemm|nul\b|\bcon\b|merde|putain|bordel|santé|guéri|soigne|perdre|manger|mange|faim|estomac|déjeuner|dîner|repas|assiette|grignot|gourmand|nourri|appétit|bouff/i;
const mauvais = tous.filter(t => INTERDITS.test(t));
ok(mauvais.length === 0, 'aucun mot interdit (nourriture, poids, regime, corps, culpabilite, sante, vulgarite…)' + (mauvais.length ? ' : ' + mauvais.join(' | ') : ''));
const mots = (t) => rendreTexte(t, 'Raci').replace(/[,.?!:]/g, ' ').split(/\s+/).filter(Boolean);
const longs = tous.filter(t => mots(t).length > 6);
ok(longs.length === 0, 'messages courts : 6 mots maximum' + (longs.length ? ' : ' + longs.join(' | ') : ''));
const tropLongs = tous.filter(t => rendreTexte(t, 'Raci').length > 34);
ok(tropLongs.length === 0, 'messages courts : 34 caracteres maximum' + (tropLongs.length ? ' : ' + tropLongs.join(' | ') : ''));
ok(tous.every(t => /^[A-ZÉÀ]/.test(t) && /[.?!}]$/.test(t.replace(/\{p\}$/, '}'))), 'majuscule au debut, ponctuation a la fin (sauf « Bonjour {prenom} »)');
ok(!tous.some(t => /\b(vous|votre|vos)\b/i.test(t)), 'tutoiement : jamais « vous »');
ok(BANQUE.nuit.some(e => e.t === 'Encore debout ?' && e.taquin) && BANQUE.nuit.some(e => e.t === 'Demain est un autre jour.'), 'exemples de Raci presents : « Encore debout ? », « Demain est un autre jour. »');

// --- Composition : UN SEUL texte, plus de titre + phrase
const fixe = (x) => () => x;
let r = composerAccueil({ heure: 8, prenom: 'Raci', tirage: fixe(0) });
ok(r.tranche === 'tot' && r.index === 0 && r.texte === 'Bonjour Raci' && r.pieces.length === 2 && r.pieces[1].gras && r.pieces[1].t === 'Raci' && !('phrase' in r) && !('titre' in r), 'tot + prenom : « Bonjour Raci », prenom isole en gras, aucun titre/phrase separes');
r = composerAccueil({ heure: 19, prenom: 'Raci', tirage: fixe(0) });
ok(r.texte === 'Bonsoir Raci', 'soir : « Bonsoir Raci »');
r = composerAccueil({ heure: 10, prenom: '', tirage: fixe(0) });
ok(r.texte === 'Bonjour' && r.pieces.length === 1 && !r.pieces[0].gras, 'sans prenom : « Bonjour » seul, sans espace ni virgule');
for (const p of [undefined, null, '   ']) ok(composerAccueil({ heure: 10, prenom: p, tirage: fixe(0) }).texte === 'Bonjour', 'prenom ' + JSON.stringify(p) + ' : « Bonjour »');
r = composerAccueil({ heure: 23, prenom: 'Raci', tirage: fixe(0.2) }); // index 1
ok(r.index === 1 && r.texte === 'Encore debout' + NB + '?' && r.taquin && r.pieces.length === 1, 'nuit : « Encore debout ? » (sans prenom dans le modele)');
r = composerAccueil({ heure: 23, prenom: 'Raci', tirage: fixe(5 / 8) }); // index 5 « Encore là, {p} ? »
ok(r.texte === 'Encore là, Raci' + NB + '?' && r.taquin, 'nuit avec prenom : « Encore là, Raci ? »');
r = composerAccueil({ heure: 23, prenom: '', tirage: fixe(5 / 8) });
ok(r.texte === 'Encore là' + NB + '?' && r.pieces.length === 1, 'nuit sans prenom : « Encore là ? » (repli propre)');
r = composerAccueil({ heure: 14, prenom: '', tirage: fixe(6 / 8) });
ok(r.texte === 'Encore un peu.', 'sans prenom : « Encore un peu, {p}. » -> « Encore un peu. »');
r = composerAccueil({ heure: 12, prenom: 'Raci', tirage: fixe(1 / 8) });
ok(r.pieces.map(x => x.t).join('') === r.texte && r.pieces.map(x => x.t).join('') === 'Bonne pause, Raci.', 'pieces recomposent exactement le texte');
r = composerAccueil({ heure: 9, prenom: 'Raci', lang: 'en', tirage: fixe(0) });
ok(r.texte === 'Good morning Raci' && !r.taquin, 'anglais : salutation seule');
r = composerAccueil({ heure: 20, prenom: '', lang: 'nl', tirage: fixe(0) });
ok(r.texte === 'Goedenavond', 'neerlandais sans prenom : « Goedenavond »');
r = composerAccueil({ heure: 10, prenom: 'Raci', kcal: 2000, repas: 3, eauL: 2, tirage: fixe(0) });
ok(!/\d/.test(r.texte), 'aucune donnee n\'entre meme si on en fournit');
ok(!!composerAccueil({}) && !!composerAccueil({ heure: 'x', tirage: () => NaN }), 'jamais d\'erreur sur entree vide ou invalide');
ok(!estLong('Encore debout ?') && !estLong('Bonjour Raci') && estLong('Demain est un autre jour.'), 'classe « long » (> 18 car.) pour reduire la taille');
// toutes les combinaisons rendent, avec et sans prenom, sans « {p} » ni espace double
{
  let bad = 0;
  for (const k of TRANCHES) for (const e of BANQUE[k]) for (const p of ['Raci', '']) {
    const t = rendreTexte(e.t, p); if (/[{}]/.test(t) || /\s\s/.test(t) || /^\s|\s$/.test(t) || /,\s*[.?!]|,$/.test(t)) bad++;
  }
  ok(bad === 0, 'les 96 rendus (avec/sans prenom) sont propres : ni accolade, ni espace double, ni virgule orpheline');
}

// --- Jamais deux fois le meme message de suite (toutes les tranches, tous les tirages possibles)
{
  let bad = 0, tot = 0;
  for (const k of TRANCHES) {
    const h = { tot: 6, fin_matinee: 10, midi: 12, apres_midi: 15, soir: 20, nuit: 23 }[k];
    const n = BANQUE[k].length;
    for (let dernier = 0; dernier < n; dernier++) for (let q = 0; q < 200; q++) {
      const m = composerAccueil({ heure: h, prenom: 'R', dernier: { tranche: k, index: dernier }, tirage: fixe(q / 200) });
      tot++; if (m.index === dernier || m.index < 0 || m.index >= n) bad++;
    }
  }
  ok(bad === 0, 'jamais le meme message deux fois de suite (' + tot + ' cas, 0 repetition)');
  // tous les autres messages restent atteignables
  const vus = new Set(); for (let q = 0; q < 100; q++) vus.add(composerAccueil({ heure: 12, dernier: { tranche: 'midi', index: 3 }, tirage: fixe(q / 100) }).index);
  ok(vus.size === BANQUE.midi.length - 1 && !vus.has(3), 'les 7 autres messages restent tous atteignables');
  ok(composerAccueil({ heure: 12, dernier: { tranche: 'soir', index: 3 }, tirage: fixe(0.5) }).index === 4, 'le dernier d\'une AUTRE tranche n\'exclut rien');
  ok(choisirIndex(1, fixe(0.9), 0) === 0 && choisirIndex(0) === 0, 'liste d\'un seul element ou vide : pas de boucle');
  ok(choisirIndex(8, fixe(1), 7) < 8 && choisirIndex(8, fixe(-3), null) === 0 && choisirIndex(8, fixe(NaN), 2) !== 2, 'tirage hors bornes ou NaN : rattrape');
}
// Tirage reel (Math.random) : enchainer 500 fois avec memoire → jamais de repetition, tout est utilise
{
  const stock = new Map(); const s = { getItem: (k) => stock.has(k) ? stock.get(k) : null, setItem: (k, v) => stock.set(k, v) };
  let prec = null, rep = 0; const vus = new Set();
  for (let i = 0; i < 500; i++) { const m = composerAccueil({ heure: 15, prenom: 'R', dernier: lireDernier(s) }); if (prec === m.index) rep++; prec = m.index; vus.add(m.index); ecrireDernier(m, s); }
  ok(rep === 0 && vus.size === BANQUE.apres_midi.length, 'Math.random + memoire : 500 affichages, 0 repetition, 8/8 messages vus');
  ok(lireDernier({ getItem: () => 'pas du json{' }) === null && lireDernier({ getItem: () => { throw new Error('x'); } }) === null, 'memoire illisible : ignoree sans erreur');
}

// --- Frequence : a froid, ou > 30 min d'absence
const T = Date.parse('2026-10-27T10:00:00Z');
ok(ABSENCE_MS === 30 * 60 * 1000, 'seuil d\'absence : 30 min');
ok(!absenceLongue(T, T + 5 * 60e3) && !absenceLongue(T, T + 30 * 60e3) && absenceLongue(T, T + 30 * 60e3 + 1) && absenceLongue(T, T + 3 * 3600e3), 'absence : 5 min non, 30 min pile non, 30 min + 1 ms oui, 3 h oui');
ok(!absenceLongue(null, T) && !absenceLongue(undefined, T) && !absenceLongue(NaN, T), 'absence inconnue : on ne reaffiche pas');
console.log(code ? 'ECHEC' : 'OK'); process.exit(code);
