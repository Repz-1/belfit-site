// Plan offert cote application : libelles, fenetre de paiement, lien.
// Modules purs. Aucun reseau, aucun compte.
import { readFileSync } from 'fs';
import { badgeHorsFile, prefixeAttente, dossierOffert, payeLeHorsOffre } from '../app-v2/src/services/statut-dossier.js';
import { suiteInvitation, lireInvitationUrl } from '../app-v2/src/services/invitation-reponse.js';

let code = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const le = '2026-11-01T10:00:00.000Z';
const offert = { commande: { source: 'offert', payeLe: le, montant: '0 EUR', type: 'plan', commande: 'PLANOFF1' }, questionnaire: null };
const mollie = { commande: { source: 'mollie', payeLe: le, type: 'plan', commande: 'tr_1' }, questionnaire: null };
const virement = { commande: { source: 'invitation', payeLe: le, type: 'plan', virement: { statut: 'attente', montant: 80 } }, questionnaire: null };

ok(payeLeHorsOffre(offert) === null, 'plan offert : pas un paiement reel');
ok(payeLeHorsOffre(mollie) === le, 'Mollie : payeLe reel conserve');
ok(payeLeHorsOffre(virement) === le, 'virement : payeLe reel conserve');
ok(dossierOffert(offert) && !dossierOffert(mollie) && !dossierOffert(virement), 'seul source offert est un plan offert');
const coachSrc = readFileSync(new URL('../app-v2/src/store/coach.js', import.meta.url), 'utf8');
ok(/return payeLeHorsOffre\(dossier\)/.test(coachSrc), 'payeLeReel delegue au filtre offert');
ok(/if \(!pr \|\| dossierOffert\(dossier\)\) return null/.test(coachSrc), 'fenetre 44 jours fermee pour un plan offert');
ok(/dossier && dossier\.accesPro/.test(coachSrc), 'finAcces lit toujours un acces PRO separe');
const etat = coachSrc.slice(coachSrc.indexOf('export function etatCoach'), coachSrc.indexOf('export const JOURS_ACCES'));
ok(etat.includes('aRemplir') && !etat.includes('dossierOffert'), 'le questionnaire s ouvre aussi pour une offre');
ok(badgeHorsFile({ source: 'offert', payeLe: le })[0] === 'Offert', 'badge Offert');
ok(badgeHorsFile({ source: 'mollie', payeLe: le })[0] === 'Payé', 'Mollie reste Payé');
ok(badgeHorsFile({ source: 'invitation', payeLe: le })[0] === 'Payé', 'virement reste Payé');
ok(badgeHorsFile({ source: 'offert', livreLe: le })[0] === 'Livré', 'offre livree : Livré, pas Payé');
ok(prefixeAttente({ source: 'offert' }) === 'offert ' && prefixeAttente({ source: 'mollie' }) === 'payé ', 'ligne d attente : offert ou payé');

const lu = lireInvitationUrl('?onglet=premium&invitation=ab12cd&coach=questionnaire&type=plan');
ok(lu.code === 'AB12CD' && lu.search.includes('coach=questionnaire') && !lu.search.includes('invitation='), 'le code invitation est garde, le retour Mollie n est pas efface par lui');
ok(lireInvitationUrl('?onglet=premium&coach=questionnaire&type=plan').code === null, 'retour Mollie seul : pas une invitation');
ok(suiteInvitation('adresse').garder && suiteInvitation('adresse').silence, 'mauvais compte : le code reste, sans relancer l alerte');
ok(suiteInvitation('verification').garder && !suiteInvitation('verification').silence, 'e-mail non confirme : le code reste et on reessaie');
ok(!suiteInvitation('utilisee').garder && !suiteInvitation('inconnue').garder, 'lien use ou inconnu : on l oublie');
ok(suiteInvitation('deja_commande').garder && /pas été utilisé/.test(suiteInvitation('deja_commande').message), 'coaching deja en cours : lien non consomme');

const main = readFileSync(new URL('../app-v2/src/main.jsx', import.meta.url), 'utf8');
const iInv = main.indexOf("import './services/invitation.js'");
const iCoach = main.indexOf('import { CoachPage }');
ok(iInv > 0 && iInv < iCoach, 'le code invitation est lu avant le nettoyage du retour Mollie');
const coach = readFileSync(new URL('../coach.html', import.meta.url), 'utf8');
ok(coach.includes('creerInvitationOfferte') && coach.includes('badgeHorsFile') && coach.includes('id="btnOffert"'), 'espace coach : action offerte et badge branches');
ok(coach.includes('Offrir l\'accès PRO') && coach.includes('btnInviter'), 'PRO et invitation virement toujours presents');

process.exit(code);
