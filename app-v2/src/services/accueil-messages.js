// Ecran de bienvenue : salutation + une petite phrase qui change avec l'heure
// de Bruxelles (28/10, Raci : « plusieurs messages differents, en fonction des
// heures, il est un peu taquin des fois »).
//
// MODULE PUR : aucune dependance, heure et tirage injectables, donc testable
// sous Node. Aucune donnee du client n'entre ici (ni chiffre, ni etat).
//
// Regles de redaction (verifiees par tools/test-accueil-messages.mjs) :
//  - tutoiement, phrases courtes, francais avec accents ;
//  - jamais un mot sur la nourriture a culpabiliser, le poids, le corps, les
//    repas sautes, le regime, l'apparence ; aucune promesse de sante ;
//  - le ton taquin reste sur l'heure, le cafe, le canape, la motivation, la
//    salle : complice et bienveillant, jamais blessant.
//
// Une entree : { t: phrase, taquin?: true, salut?: 'Encore debout', interro?: true }
//   salut   = remplace « Bonjour / Bonsoir » (titre : « Encore debout, Raci ? »)
//   interro = le titre se termine par « ? »

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
    { t: 'Belle journée en vue.' },
    { t: 'On démarre en douceur, ou en force : à toi de choisir.' },
    { t: 'Un grand verre d’eau, et c’est parti.' },
    { t: 'Le café est-il prêt ? On t’attend.', taquin: true },
    { t: 'Petit à petit, ça avance.' },
    { t: 'Ton lit te regrette déjà ? Il s’en remettra.', taquin: true },
    { t: 'Les lève-tôt ont toujours un coup d’avance.' },
    { t: 'Le café d’abord, les grandes décisions ensuite.', taquin: true },
  ],
  fin_matinee: [
    { t: 'Belle matinée à toi.' },
    { t: 'Tu es dans le bon rythme.' },
    { t: 'Le canapé a essayé de te retenir ? Raté.', taquin: true },
    { t: 'Une petite pause, un étirement, et on repart.' },
    { t: 'Ce que tu fais aujourd’hui compte.' },
    { t: 'Deuxième café ? On ne dira rien.', taquin: true },
    { t: 'Content de te revoir.' },
    { t: 'La motivation arrive toujours en retard. Toi, tu es à l’heure.', taquin: true },
  ],
  midi: [
    { t: 'Le déjeuner n’attend pas… et ton estomac non plus.', taquin: true },
    { t: 'Bon appétit, et prends ton temps.' },
    { t: 'Prends une vraie pause, tu l’as bien méritée.' },
    { t: 'Midi pile : le moment de lever le nez de l’écran.', taquin: true },
    { t: 'Content de te retrouver à midi.' },
    { t: 'Rien ne presse : savoure ta pause.' },
    { t: 'La sieste te fait de l’œil ? Garde-la pour plus tard.', taquin: true },
    { t: 'Une petite marche après la pause ? Juste une idée.' },
  ],
  apres_midi: [
    { t: 'Bel après-midi à toi.' },
    { t: 'Tu tiens le bon bout.' },
    { t: 'Le petit coup de mou de l’après-midi ? On le connaît.', taquin: true },
    { t: 'Un pas après l’autre, tu avances.' },
    { t: 'La salle t’attend. Elle ne dira rien si tu arrives en retard.', taquin: true },
    { t: 'Encore un peu, et la soirée est à toi.' },
    { t: 'La motivation a pris sa pause café. On la rappelle ?', taquin: true },
    { t: 'Prends un instant pour souffler, tu y as droit.' },
  ],
  soir: [
    { t: 'Belle soirée à toi.' },
    { t: 'La journée est derrière toi, respire.' },
    { t: 'Le canapé t’appelle ? Il est doué, il faut le reconnaître.', taquin: true },
    { t: 'Content de te retrouver ce soir.' },
    { t: 'Demain se prépare un peu ce soir.' },
    { t: 'Un petit moment pour toi, rien que pour toi.' },
    { t: 'Toujours là en fin de journée ? Respect.', taquin: true },
    { t: 'Ta série du soir peut attendre cinq minutes. Peut-être dix.', taquin: true },
  ],
  nuit: [
    { t: 'La nuit est calme, prends ton temps.' },
    { t: 'Les meilleures idées arrivent tard, paraît-il.', taquin: true, salut: 'Encore debout', interro: true },
    { t: 'Une petite visite avant de dormir ?' },
    { t: 'Ton oreiller commence à s’impatienter.', taquin: true, salut: 'Encore debout', interro: true },
    { t: 'Prends soin de toi ce soir.' },
    { t: 'Demain est un autre jour.' },
    { t: 'On ne dira rien à ton réveil.', taquin: true, salut: 'Encore debout', interro: true },
    { t: 'Tout est calme. C’est le bon moment pour souffler.' },
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

/**
 * ctx = { heure (Bruxelles, 0-23), prenom, tirage?, dernier? ({tranche, index}), lang? }
 * -> { tranche, index, salut, prenom, interro, phrase, taquin, titre }
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
  const avecPhrase = lang === 'fr';
  const salut = avecPhrase && e.salut ? e.salut : salutationDe(tranche, lang);
  const interro = !!(avecPhrase && e.interro);
  const titre = salut + (prenom ? ',' + NBSP + prenom : '') + (interro ? NBSP + '?' : '');
  return { tranche, index, salut, prenom, interro, phrase: avecPhrase ? e.t : '', taquin: !!e.taquin, titre };
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
