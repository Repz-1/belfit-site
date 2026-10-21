// Etat du coaching partage entre la page Coach et le bandeau affiche
// en haut de chaque page (26/09). Une seule regle de calcul, pour que
// le bandeau et la page ne se contredisent jamais.
import { signal } from '@preact/signals';
import { utilisateur } from '../services/firebase.js';

// Delai pour remplir le questionnaire apres paiement (regle de Raci).
export const DELAI_QUESTIONNAIRE = 7;

// Demande d'ouverture du questionnaire depuis n'importe quelle page
// (appui sur le bandeau). La page Coach la consomme.
export const demandeQuestionnaire = signal(null);

// Marque « paiement recu » posee au retour du paiement (27/09) : elle
// appartient a UN compte. Posee avant que la session soit connue, elle
// est rattachee au premier compte vu pendant ce meme chargement ; une
// marque sans compte d'un chargement precedent est ignoree. Sans cela,
// un autre compte ouvert sur le meme telephone heritait du paiement.
let retourCeChargement = false;
export function marquerPaye(type) {
  retourCeChargement = true;
  const u = utilisateur.peek();
  try { localStorage.setItem('belfit_qc_paye', JSON.stringify({ type, le: new Date().toISOString(), uid: u ? u.uid : null })); } catch (e) { /* rien */ }
}
export function payeLocal() {
  let m = null;
  try { m = JSON.parse(localStorage.getItem('belfit_qc_paye')); } catch (e) { return null; }
  if (!m) return null;
  const u = utilisateur.peek();
  if (!u) return null;
  if (m.uid) return m.uid === u.uid ? m : null;
  if (!retourCeChargement) return null;
  m.uid = u.uid;
  try { localStorage.setItem('belfit_qc_paye', JSON.stringify(m)); } catch (e) { /* rien */ }
  return m;
}

function jours(iso) {
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return isNaN(j) ? 0 : Math.max(0, j);
}
const avant = (a, b) => !a || (b && new Date(a) < new Date(b));

/**
 * @param dossier { commande, questionnaire } ; @param pr plan livre ou null
 * aRemplir : paye, questionnaire pas encore envoye depuis ce paiement.
 * enPrep   : questionnaire envoye, plan pas encore livre depuis.
 */
export function etatCoach(dossier, pr) {
  const { commande: cmd, questionnaire: q } = dossier || {};
  const local = payeLocal();
  const payeLe = (cmd && cmd.payeLe) || (local && local.le) || null;
  const type = (cmd && cmd.type) || (local && local.type) || 'plan';
  const aRemplir = !!payeLe && avant(q && q.envoyeLe, payeLe);
  const enPrep = !!payeLe && !aRemplir && avant(pr && pr.livreLe, q.envoyeLe);
  const ecoules = payeLe ? jours(payeLe) : 0;
  return {
    payeLe, type, aRemplir, enPrep,
    tardif: aRemplir && ecoules >= DELAI_QUESTIONNAIRE,
    restants: Math.max(0, DELAI_QUESTIONNAIRE - ecoules),
  };
}

// Fenetre de mise a jour (Raci, 27/09) : chaque paiement couvre son mois
// + 2 mois. La mise a jour a 60 EUR reste possible jusqu'a 3 mois apres
// le DERNIER paiement ; au-dela, c'est un nouveau plan a 80 EUR.
export const MOIS_MAJ = 3;
/** Date limite de la mise a jour, ou null (pas de plan, pas de paiement). */
export function majJusqua(dossier, pr) {
  if (!pr) return null;
  const e = etatCoach(dossier, pr);
  const base = e.payeLe || pr.livreLe;
  if (!base) return null;
  const d = new Date(base);
  d.setMonth(d.getMonth() + MOIS_MAJ);
  return d;
}

// Fin de l'acces PRO (28/09) : la plus lointaine entre la fenetre du
// dernier paiement coach et un acces offert ou debloque par code.
// Acces illimite : date tres lointaine (illimite = true).
export function finAcces(dossier, pr) {
  const dates = [];
  const m = majJusqua(dossier, pr);
  if (m) dates.push(m);
  const a = dossier && dossier.accesPro;
  if (a) {
    if (!a.jusqu) return { fin: new Date(8.64e15), illimite: true };
    dates.push(new Date(a.jusqu));
  }
  if (!dates.length) return null;
  return { fin: new Date(Math.max(...dates.map((d) => d.getTime()))), illimite: false };
}

// 21/10 Raci : Mon suivi n'affiche des dates (mois, 60 €) que pour un
// paiement REEL enregistre par le serveur (commandeCoach.payeLe). Ni la
// date de livraison du plan, ni un paiement note seulement sur ce
// telephone ne suffisent.
export function payeLeReel(dossier) {
  const c = dossier && dossier.commande;
  const v = c && c.payeLe;
  return v && !isNaN(new Date(v).getTime()) ? v : null;
}
/** Date limite du tarif 60 €, d'apres le seul paiement reel. */
export function limite60(dossier) {
  const p = payeLeReel(dossier);
  if (!p) return null;
  const d = new Date(p); d.setMonth(d.getMonth() + MOIS_MAJ);
  return d;
}

// ---- Espace suivi client (20/10) ----------------------------------
// Petits calculs de l'onglet « Mon suivi ». Aucune donnee nouvelle :
// tout part de la commande, du plan livre, des pesees et du journal.

/** Debut et fin du mois de coaching en cours, a partir du paiement
 *  reel seulement, et jours restants. null sans paiement. */
export function moisCoaching(dossier, pr, maintenant = Date.now()) {
  const base = payeLeReel(dossier);
  if (!base) return null;
  const debut = new Date(base);
  if (isNaN(debut.getTime())) return null;
  const fin = new Date(debut); fin.setMonth(fin.getMonth() + 1);
  const restants = Math.max(0, Math.ceil((fin.getTime() - maintenant) / 86400000));
  const total = Math.max(1, Math.round((fin - debut) / 86400000));
  return { debut, fin, restants, total, fini: maintenant >= fin.getTime() };
}

/** Le bilan du mois s'ouvre 4 jours avant la fin du mois de coaching. */
export function dateBilan(mois) {
  if (!mois) return null;
  const d = new Date(mois.fin); d.setDate(d.getDate() - 4);
  return d;
}

/** Poids au debut du plan (derniere pesee avant la livraison, sinon la
 *  premiere apres) et poids actuel. Points de la courbe depuis le debut. */
export function poidsDepuisPlan(log, depuisIso) {
  const l = (log || []).filter(p => p && p.iso && +p.kg > 0).slice().sort((a, b) => a.iso < b.iso ? -1 : 1);
  if (!l.length) return null;
  const d = (depuisIso || '').slice(0, 10);
  let i = -1;
  for (let k = 0; k < l.length; k++) if (!d || l[k].iso <= d) i = k;
  if (i < 0) i = 0;
  const pts = l.slice(i);
  const debut = pts[0], actuel = pts[pts.length - 1];
  return { debut, actuel, ecart: Math.round((actuel.kg - debut.kg) * 10) / 10, points: pts.slice(-30) };
}

/** Cle du prochain repas selon l'heure, parmi celles du plan. */
const HEURE_FIN = { pdej: 10, dej: 14, snack: 17, diner: 22 };
export function prochainRepas(cles, heure = new Date().getHours()) {
  const ordre = ['pdej', 'dej', 'snack', 'diner'].filter(c => cles.includes(c));
  return ordre.find(c => heure < HEURE_FIN[c]) || null;
}
