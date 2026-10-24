// MOLLIE cote application (24/10). Le serveur decide de tout : montant,
// compte autorise, etat du paiement. Ici on ne fait que demander.
//  - paiementOuvert : le serveur dit « ce compte peut payer » -> le bouton
//    Payer devient actif. Sinon l'ecran reste « Bientot disponible ».
//  - payerMollie    : cree le paiement et envoie vers la page Mollie.
//  - verifierRetour : au retour de Mollie (payee, annulee ou echouee), on
//    demande au serveur ce qu'il en est. Rien n'est ouvert sans sa reponse.
// Aucune adresse e-mail, aucune cle dans ce fichier.
import { signal } from '@preact/signals';
import { utilisateur } from './firebase.js';

const BASE = 'https://europe-west1-repz-baf60.cloudfunctions.net/';
export const paiementOuvert = signal(false);   // ce compte peut payer
export const modeTest = signal(false);         // le serveur est en mode test Mollie
// Retour de la page de paiement : null | {type, etat, statut}
//  etat : 'verif' | 'attente' | 'paye' | 'echec' | 'connexion'
export const retourPaiement = signal(null);

async function appeler(nom, corps) {
  const u = utilisateur.peek();
  if (!u || u.isAnonymous || !u.getIdToken) return null;
  const token = await u.getIdToken();
  const r = await fetch(BASE + nom, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(corps || {}) });
  const d = await r.json().catch(() => ({}));
  return { statut: r.status, d };
}

let dejaDemande = null;   // uid pour lequel on a deja demande
export function verifierAcces() {
  const u = utilisateur.peek();
  if (!u || u.isAnonymous) { paiementOuvert.value = false; dejaDemande = null; return Promise.resolve(); }
  if (dejaDemande === u.uid) return Promise.resolve();
  dejaDemande = u.uid;
  return appeler('mollieEtat', {}).then(r => {
    paiementOuvert.value = !!(r && r.statut === 200 && r.d && r.d.autorise === true);
    modeTest.value = !!(r && r.d && r.d.mode === 'test');
  }).catch(() => { paiementOuvert.value = false; dejaDemande = null; });
}

export async function payerMollie(type) {
  const r = await appeler('creerPaiementMollie', { type });
  if (!r || r.statut !== 200 || !r.d.url) throw new Error((r && r.d && r.d.motif) || 'paiement');
  window.location.href = r.d.url;
}

// type = 'plan' | 'maj', lu dans l'adresse de retour. onPaye(type) est appele
// SEULEMENT quand le serveur confirme un paiement reussi et active.
let essais = 0;
let enCours = false;
export function demarrerRetour(type) { essais = 0; retourPaiement.value = { type, etat: 'verif', statut: null }; }
export function verifierRetour(onPaye, relance) {
  const cur = retourPaiement.peek();
  if (!cur || cur.etat === 'paye' || cur.etat === 'echec') return Promise.resolve();
  // Appel venant d'un effet : une seule verification a la fois, et pas de
  // doublon si une attente est deja en cours.
  if (!relance && (enCours || cur.etat === 'attente')) return Promise.resolve();
  const u = utilisateur.peek();
  if (!u || u.isAnonymous) { retourPaiement.value = { ...cur, etat: 'connexion' }; return Promise.resolve(); }
  enCours = true;
  retourPaiement.value = { ...cur, etat: cur.etat === 'attente' ? 'attente' : 'verif', fini: false };
  return appeler('mollieEtat', { retour: true }).then(r => {
    const p = r && r.statut === 200 && r.d && r.d.paiement;
    if (!p) throw new Error('etat');
    if (p.statut === 'paid' && p.activee) {
      retourPaiement.value = { ...cur, etat: 'paye', statut: 'paid' };
      onPaye(cur.type);
    } else if (p.statut === 'open' || p.statut === 'pending' || p.statut === 'authorized') {
      essais++;
      retourPaiement.value = { ...cur, etat: 'attente', statut: p.statut, fini: essais >= 6 };
      if (essais < 6) setTimeout(() => verifierRetour(onPaye, true), 3000);
    } else {
      retourPaiement.value = { ...cur, etat: 'echec', statut: p.statut };
    }
  }).catch(() => {
    retourPaiement.value = { ...cur, etat: 'attente', statut: 'inconnu', fini: true };
  }).finally(() => { enCours = false; });
}
export function reverifierRetour(onPaye) { essais = 0; return verifierRetour(onPaye, true); }
export function fermerRetour() { retourPaiement.value = null; }
