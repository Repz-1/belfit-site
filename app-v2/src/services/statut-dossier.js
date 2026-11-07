// Libelles de la fiche coach. Le badge « Payé » reste celui des
// commandes qui ne sont pas un plan offert. Aucun dossier existant
// n'est relu ni reclasse ici : seul source === 'offert' change l'etiquette.

export function estOffert(d) {
  return !!(d && d.source === 'offert');
}

/** La commande du dossier est un plan offert (pas un paiement). */
export function dossierOffert(dossier) {
  return estOffert(dossier && dossier.commande);
}

/** Date de paiement reel, ou null pour un plan offert. */
export function payeLeHorsOffre(dossier) {
  if (dossierOffert(dossier)) return null;
  const c = dossier && dossier.commande;
  const v = c && c.payeLe;
  return v && !isNaN(new Date(v).getTime()) ? v : null;
}

/** Badge quand le dossier n'est pas dans la file a traiter. */
export function badgeHorsFile(d) {
  if (d && d.livreLe) return ['Livré', 'vert'];
  if (estOffert(d)) return ['Offert', 'vert'];
  return ['Payé', 'ambre'];
}

/** Prefixe de la ligne d'attente, avant la date. */
export function prefixeAttente(d) {
  return estOffert(d) ? 'offert ' : 'payé ';
}
