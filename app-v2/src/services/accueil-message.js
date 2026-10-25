// Message d'accueil : fonction pure, aucune donnee inventee.
// Chaque ligne n'existe que si la donnee correspondante existe vraiment ;
// jamais de reproche. ctx = {
//   periode: 'matin'|'soir', prenom, kcalObjectif,
//   prochainRepas: {nom, kcal}|null, seanceJour: {titre, faite}|null,
//   seancesHier: nombre, eauL: litres, repasValides: nombre, kcalJour }
const TXT = {
  fr: {
    matin: 'Bonjour', soir: 'Bonsoir',
    seance: 'Séance « {t} » au programme aujourd’hui.',
    seanceFaite: 'Séance « {t} » faite aujourd’hui. Bravo.',
    repas: '{n} prévu : {k} kcal.',
    hier: 'Séance d’hier faite : belle régularité.', hierN: '{n} séances faites hier : belle régularité.',
    obj: 'Objectif du jour : {k} kcal.',
    valides: '{n} repas validé aujourd’hui.', validesN: '{n} repas validés aujourd’hui.',
    kcalSur: '{k} kcal sur {o}.', kcal: '{k} kcal au compteur.',
    eau: '{l} L d’eau aujourd’hui.',
    bonneMatin: 'Belle journée à toi.', bonneSoir: 'Bonne soirée à toi.',
  },
  en: {
    matin: 'Good morning', soir: 'Good evening',
    seance: 'Session “{t}” on the programme today.',
    seanceFaite: 'Session “{t}” done today. Well done.',
    repas: '{n} planned: {k} kcal.',
    hier: 'Yesterday’s session done: great consistency.', hierN: '{n} sessions done yesterday: great consistency.',
    obj: 'Today’s target: {k} kcal.',
    valides: '{n} meal logged today.', validesN: '{n} meals logged today.',
    kcalSur: '{k} kcal of {o}.', kcal: '{k} kcal so far.',
    eau: '{l} L of water today.',
    bonneMatin: 'Have a great day.', bonneSoir: 'Have a good evening.',
  },
  nl: {
    matin: 'Goedemorgen', soir: 'Goedenavond',
    seance: 'Training “{t}” staat vandaag op het programma.',
    seanceFaite: 'Training “{t}” vandaag gedaan. Bravo.',
    repas: '{n} gepland: {k} kcal.',
    hier: 'Training van gisteren gedaan: mooi regelmatig.', hierN: '{n} trainingen gisteren gedaan: mooi regelmatig.',
    obj: 'Doel van vandaag: {k} kcal.',
    valides: '{n} maaltijd genoteerd vandaag.', validesN: '{n} maaltijden genoteerd vandaag.',
    kcalSur: '{k} kcal van {o}.', kcal: '{k} kcal tot nu toe.',
    eau: '{l} L water vandaag.',
    bonneMatin: 'Fijne dag.', bonneSoir: 'Fijne avond.',
  },
};
const mil = (n) => Math.round(n).toLocaleString('fr-BE');
const remplir = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k]);

/** { titre, lignes: [..] } ou null s'il n'y a rien de vrai a dire. */
export function composerAccueil(ctx, lang = 'fr') {
  const T = TXT[lang] || TXT.fr;
  const p = ctx.periode;
  const prenom = (ctx.prenom || '').trim();
  const titre = prenom ? T[p] + ' ' + prenom : T[p];
  const l = [];
  if (p === 'matin') {
    const s = ctx.seanceJour;
    if (s && !s.faite && s.titre) l.push(remplir(T.seance, { t: s.titre }));
    const r = ctx.prochainRepas;
    if (r && r.nom && r.kcal > 0) l.push(remplir(T.repas, { n: r.nom, k: mil(r.kcal) }));
    if (ctx.seancesHier > 0) l.push(ctx.seancesHier > 1 ? remplir(T.hierN, { n: ctx.seancesHier }) : T.hier);
    if (ctx.kcalObjectif > 0) l.push(remplir(T.obj, { k: mil(ctx.kcalObjectif) }));
  } else if (p === 'soir') {
    const s = ctx.seanceJour;
    if (s && s.faite && s.titre) l.push(remplir(T.seanceFaite, { t: s.titre }));
    if (ctx.repasValides > 0) {
      l.push(remplir(ctx.repasValides > 1 ? T.validesN : T.valides, { n: ctx.repasValides }));
      if (ctx.kcalJour > 0) l.push(ctx.kcalObjectif > 0
        ? remplir(T.kcalSur, { k: mil(ctx.kcalJour), o: mil(ctx.kcalObjectif) })
        : remplir(T.kcal, { k: mil(ctx.kcalJour) }));
    }
    if (ctx.eauL > 0) l.push(remplir(T.eau, { l: (Math.round(ctx.eauL * 10) / 10).toLocaleString('fr-BE') }));
  }
  const lignes = l.slice(0, 2);
  if (!lignes.length) {
    // Rien de vrai a rapporter : un simple mot, mais seulement avec un prenom
    // (sinon l'ecran serait vide de sens).
    if (!prenom) return null;
    lignes.push(p === 'matin' ? T.bonneMatin : T.bonneSoir);
  }
  return { titre, lignes };
}
