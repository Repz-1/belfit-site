// Message d'accueil : un simple mot de bienvenue, rien d'autre (27/10, Raci).
// Aucun chiffre, aucune donnee, aucun recap, aucun conseil.
//   « Bonjour {prenom} » (matin) / « Bonsoir {prenom} » (soir),
//   « Bienvenue » quand le prenom n'est pas connu.
const TXT = {
  fr: { matin: 'Bonjour', soir: 'Bonsoir', neutre: 'Bienvenue' },
  en: { matin: 'Good morning', soir: 'Good evening', neutre: 'Welcome' },
  nl: { matin: 'Goedemorgen', soir: 'Goedenavond', neutre: 'Welkom' },
};

/** ctx = { periode: 'matin'|'soir', prenom } → { titre }. Jamais null. */
export function composerAccueil(ctx, lang = 'fr') {
  const T = TXT[lang] || TXT.fr;
  const prenom = ((ctx && ctx.prenom) || '').trim();
  const mot = ctx && T[ctx.periode];
  return { titre: prenom && mot ? mot + ' ' + prenom : T.neutre };
}
