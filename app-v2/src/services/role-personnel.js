// Personnel autorise a saisir dans l'app alors que l'encodage client est coupe.
// Meme liste que functions/index.js estCoachAutorise : adresse confirmee,
// pas la date d'acces « sans fin » (un client PRO illimite a la meme date).
const PERSONNEL = ['coach@belfit.be', 'contact@belfit.be'];

export function saisiePersonnel({ email, emailVerified } = {}) {
  if (emailVerified !== true) return false;
  const e = String(email || '').trim().toLowerCase();
  return PERSONNEL.includes(e);
}

/** true = la saisie alimentaire est fermee. Le drapeau client prime sur toute duree. */
export function encodageFermePour(encodageActif, personnel) {
  if (encodageActif) return false;
  if (personnel) return false;
  return true;
}
