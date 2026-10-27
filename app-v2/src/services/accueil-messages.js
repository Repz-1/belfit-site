// Ecran de bienvenue : UN SEUL message court par apparition, selon l'heure de
// Bruxelles (Raci, 27/10 : « Bonjour Raci », « Demain est un autre jour »,
// « Encore debout ? » — pas de titre + phrase, pas de phrases longues).
//
// MODULE PUR : aucune dependance, heure et tirage injectables, donc testable
// sous Node. Aucune donnee du client n'entre ici (ni chiffre, ni etat).
//
// Regles de redaction (verifiees par tools/test-accueil-messages.mjs) :
//  - 6 mots maximum, tutoiement, francais avec accents ;
//  - jamais un mot sur la nourriture, le poids, le corps, le regime, un repas
//    saute, la culpabilite, la sante ; pas de chiffre ; rien de vulgaire ;
//  - le ton taquin reste sur l'heure, le cafe, le canape, la motivation, la
//    salle, le lit : complice et bienveillant, jamais blessant.
//
// Une entree : { t: texte, taquin?: true }. `{p}` = place du prenom ; sans
// prenom, « , {p} » / « {p} » disparait proprement (« Bonjour Raci » -> « Bonjour »).
// Les espaces avant ? ! : sont rendues insecables a la composition.

export const TRANCHES = ['tot', 'fin_matinee', 'midi', 'apres_midi', 'soir', 'nuit'];

export const LIBELLES_TRANCHES = {
  tot: 'Tôt le matin (5 h – 9 h)',
  fin_matinee: 'Fin de matinée (9 h – 12 h)',
  midi: 'Midi (12 h – 14 h)',
  apres_midi: 'Après-midi (14 h – 18 h)',
  soir: 'Soir (18 h – 22 h)',
  nuit: 'Nuit / tard (22 h – 5 h)',
};

export const BANQUE = {
  tot: [
    { t: 'Bonjour {p}' },
    { t: 'Belle journée en vue.' },
    { t: 'Petit à petit, ça avance.' },
    { t: 'Le café est prêt ?', taquin: true },
    { t: 'Déjà debout, {p} ?', taquin: true },
    { t: 'Ton lit s’en remettra.', taquin: true },
    { t: 'Les lève-tôt ont de l’avance.' },
    { t: 'On y va doucement, {p}.' },
  ],
  fin_matinee: [
    { t: 'Bonjour {p}' },
    { t: 'Belle matinée à toi.' },
    { t: 'Le canapé a perdu, bravo.', taquin: true },
    { t: 'Deuxième café ? Aucun jugement.', taquin: true },
    { t: 'Tu es dans le rythme.' },
    { t: 'Content de te revoir, {p}.' },
    { t: 'La motivation t’a rejoint ?', taquin: true },
    { t: 'Un étirement, et on repart.' },
  ],
  midi: [
    { t: 'Bonjour {p}' },
    { t: 'Bonne pause, {p}.' },
    { t: 'Prends une vraie pause.' },
    { t: 'Midi : lève le nez de l’écran.', taquin: true },
    { t: 'La sieste te fait de l’œil ?', taquin: true },
    { t: 'Content de te retrouver, {p}.' },
    { t: 'Rien ne presse. Respire.' },
    { t: 'Même les héros font une pause.', taquin: true },
  ],
  apres_midi: [
    { t: 'Bonjour {p}' },
    { t: 'Bel après-midi à toi.' },
    { t: 'Petit coup de mou ? On connaît.', taquin: true },
    { t: 'Un pas après l’autre.' },
    { t: 'La salle t’attend. Sans pression.', taquin: true },
    { t: 'La motivation a pris sa pause ?', taquin: true },
    { t: 'Encore un peu, {p}.' },
    { t: 'Prends un instant pour souffler.' },
  ],
  soir: [
    { t: 'Bonsoir {p}' },
    { t: 'Belle soirée à toi.' },
    { t: 'Le canapé t’appelle.', taquin: true },
    { t: 'Content de te retrouver, {p}.' },
    { t: 'Respire, la journée est finie.' },
    { t: 'Toujours là ? Respect.', taquin: true },
    { t: 'La série peut attendre un peu.', taquin: true },
    { t: 'Un moment rien que pour toi.' },
  ],
  nuit: [
    { t: 'Bonsoir {p}' },
    { t: 'Encore debout ?', taquin: true },
    { t: 'Demain est un autre jour.' },
    { t: 'Ton oreiller s’impatiente.', taquin: true },
    { t: 'Tout est calme, prends ton temps.' },
    { t: 'Encore là, {p} ?', taquin: true },
    { t: 'Les bonnes idées arrivent tard.' },
    { t: 'Prends soin de toi ce soir.' },
  ],
};

/** Tranche horaire (heure de Bruxelles, entier 0-23). Bornes : 5, 9, 12, 14, 18, 22. */
export function trancheDe(heure) {
  const h = Number(heure);
  if (!Number.isFinite(h)) return 'fin_matinee';
  const hh = ((Math.floor(h) % 24) + 24) % 24;
  if (hh >= 5 && hh < 9) return 'tot';
  if (hh >= 9 && hh < 12) return 'fin_matinee';
  if (hh >= 12 && hh < 14) return 'midi';
  if (hh >= 14 && hh < 18) return 'apres_midi';
  if (hh >= 18 && hh < 22) return 'soir';
  return 'nuit';
}

const SALUTS = {
  fr: { jour: 'Bonjour', soir: 'Bonsoir' },
  en: { jour: 'Good morning', soir: 'Good evening' },
  nl: { jour: 'Goedemorgen', soir: 'Goedenavond' },
};

/** « Bonjour » jusqu'a 17 h 59, « Bonsoir » ensuite (soir et nuit). */
export function salutationDe(tranche, lang = 'fr') {
  const S = SALUTS[lang] || SALUTS.fr;
  return tranche === 'soir' || tranche === 'nuit' ? S.soir : S.jour;
}

/**
 * Index tire dans [0, n), jamais `exclu` (le message de la fois precedente).
 * `tirage` renvoie un nombre dans [0, 1) (Math.random par defaut).
 */
export function choisirIndex(n, tirage = Math.random, exclu = null) {
  if (!(n > 0)) return 0;
  const aExclure = Number.isInteger(exclu) && exclu >= 0 && exclu < n && n > 1;
  const pool = aExclure ? n - 1 : n;
  let r = Number(tirage());
  if (!Number.isFinite(r) || r < 0) r = 0;
  if (r >= 1) r = 0.999999;
  let i = Math.floor(r * pool);
  if (aExclure && i >= exclu) i += 1;
  return i;
}

const NBSP = '\u00a0';
/** Texte final : prenom insere (ou retire proprement), ponctuation haute insecable. */
export function rendreTexte(modele, prenom) {
  const p = String(prenom || '').trim();
  const t = p ? modele.replace('{p}', p) : modele.replace(/,?\s*\{p\}/, '');
  return t.replace(/ ([?!:;])/g, NBSP + '$1');
}
/** Pieces [{ t, gras }] : le prenom (s'il est la) est isole pour etre mis en 600. */
export function piecesDe(modele, prenom) {
  const p = String(prenom || '').trim();
  if (!p || !modele.includes('{p}')) return [{ t: rendreTexte(modele, ''), gras: false }];
  const [av, ap] = modele.split('{p}');
  const norm = (x) => x.replace(/ ([?!:;])/g, NBSP + '$1');
  return [av && { t: norm(av), gras: false }, { t: p, gras: true }, ap && { t: norm(ap), gras: false }].filter(Boolean);
}
/** Message long (> 18 car.) : l'ecran le met un cran plus petit pour tenir sur 1-2 lignes. */
export const estLong = (texte) => String(texte).length > 18;

/**
 * ctx = { heure (Bruxelles, 0-23), prenom, tirage?, dernier? ({tranche, index}), lang? }
 * -> { tranche, index, texte, pieces, prenom, taquin, long }
 * Ne renvoie jamais null. Hors francais : salutation seule (la banque est en francais).
 */
export function composerAccueil(ctx = {}) {
  const lang = SALUTS[ctx.lang] ? ctx.lang : 'fr';
  const tranche = trancheDe(ctx.heure);
  const prenom = String(ctx.prenom || '').trim();
  const liste = BANQUE[tranche];
  const exclu = ctx.dernier && ctx.dernier.tranche === tranche ? ctx.dernier.index : null;
  const index = choisirIndex(liste.length, ctx.tirage, exclu);
  const e = liste[index];
  const modele = lang === 'fr' ? e.t : salutationDe(tranche, lang) + ' {p}';
  const texte = rendreTexte(modele, prenom);
  return { tranche, index, texte, pieces: piecesDe(modele, prenom), prenom, taquin: lang === 'fr' && !!e.taquin, long: estLong(texte) };
}

// --- Memoire du dernier message (localStorage), jamais bloquante ---
export const CLE_DERNIER = 'belfit_accueil_dernier';
export function lireDernier(stock) {
  try {
    const s = stock || localStorage;
    const v = JSON.parse(s.getItem(CLE_DERNIER) || 'null');
    return v && typeof v.tranche === 'string' && Number.isInteger(v.index) ? v : null;
  } catch (e) { return null; }
}
export function ecrireDernier(m, stock) {
  try { (stock || localStorage).setItem(CLE_DERNIER, JSON.stringify({ tranche: m.tranche, index: m.index })); } catch (e) {}
}
