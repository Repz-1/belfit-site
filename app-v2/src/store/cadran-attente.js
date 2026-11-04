// Cadran sans plan actif (v660/v661) : pure, testable (tools/test-cadran-attente.mjs).
import { ajouterJours, jourValide } from './plans-par-date.js';

/** Texte du cadran quand aucun plan n'est actif.
 *  debut : null = aucun plan envoye ; 'bientot' = plan recu sans date ; sinon « AAAA-MM-JJ ». */
export function libellePlanAttente(debut, auj) {
  if (!debut) return 'Plan en préparation';
  if (debut === 'bientot' || !jourValide(debut)) return 'Plan reçu · commence bientôt';
  if (debut <= auj) return 'Plan reçu · commence aujourd’hui';
  if (debut === ajouterJours(auj, 1)) return 'Plan reçu · commence demain';
  const dt = new Date(debut + 'T12:00:00Z');
  const txt = new Intl.DateTimeFormat('fr-BE', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(dt);
  return 'Plan reçu · commence le ' + txt;
}

/** v661 (Raci 04/11) : etat du cadran.
 *  - masquer : pas d'objectif par defaut (4300 kcal) — vrai des que l'alimentation
 *    est reservee au coach (payee OU lecture seule) et qu'aucun plan n'est actif ;
 *  - libelle : « Plan reçu · … » si un plan attend sa date, MEME en lecture seule ;
 *    sinon « Plan en préparation » (client paye) ou « Aucun plan actif » (lecture seule). */
export function etatCadran({ ro, reserve, planActif, prog, auj }) {
  const masquer = !planActif && (ro || reserve);
  if (!masquer) return { masquer: false, libelle: '' };
  const att = prog && prog.enAttente;
  if (att) return { masquer, libelle: libellePlanAttente(jourValide(att.debut) || 'bientot', auj) };
  return { masquer, libelle: ro ? 'Aucun plan actif' : libellePlanAttente(null, auj) };
}
