// Quoi faire d'un code d'invitation deja memorise, selon la reponse
// du serveur. Pur : pas de reseau, pas de stockage.
// Le code reste en place tant que le bon compte peut encore reussir
// (adresse a confirmer, mauvais compte actuellement connecte).

const OUBLIER = new Set(['utilisee', 'inconnue', 'code']);
const SILENCE = new Set(['adresse', 'deja_commande']);

const MESSAGES = {
  utilisee: 'Ce lien d\'invitation a déjà été utilisé par un autre compte. Demande un nouveau lien à ton coach.',
  inconnue: 'Ce lien d\'invitation n\'est pas valide. Demande un nouveau lien à ton coach.',
  code: 'Ce lien d\'invitation n\'est pas valide. Demande un nouveau lien à ton coach.',
  adresse: 'Ce lien est réservé à une autre adresse e-mail. Connecte-toi avec l\'adresse choisie par ton coach. Rien n\'a été activé.',
  deja_commande: 'Ce compte a déjà un coaching. Le lien offert n\'a pas été utilisé.',
};

/** @returns {{ garder: boolean, silence: boolean, message: string|null }} */
export function suiteInvitation(motif) {
  if (!motif) return {garder: true, silence: false, message: null};
  return {
    garder: !OUBLIER.has(motif),
    silence: SILENCE.has(motif),
    message: MESSAGES[motif] || null,
  };
}

/** Garde le code, retire seulement le parametre invitation. */
export function lireInvitationUrl(search) {
  const p = new URLSearchParams(search || '');
  const code = (p.get('invitation') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) return {code: null, search: p.toString()};
  p.delete('invitation');
  return {code, search: p.toString()};
}
