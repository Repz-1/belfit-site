// Banc d'essai de la VRAIE App (main.jsx), avec une session simulee.
// L'apercu normal monte les pages une par une : il ne peut pas
// montrer ce qui vit dans App (volet profil, reglages, rail).
import { render } from 'preact';
import '../src/styles.css';
import '../src/styles/design-system.css';
import '../src/styles/journal-socle.css';
import { utilisateur, authPrete } from '../src/services/firebase.js';
import { donneesPretes, objectifs, repas, calculBaseFait, dateJour, repasAffiches, journalDUnJourPasse, eau } from '../src/store/journal.js';
import { histoJours, weightLog, ajouterPesee } from '../src/store/stats.js';
import '../src/main.jsx';   // VRAI demarrage : main.jsx se rend lui-meme dans #app et retire le vrai #splash
import { programmeActif } from '../src/store/programme.js';
import { estPremium } from '../src/components/PremiumPage.jsx';
import { programme, programmeBrut, programmeCharge, dossierCoach, poserLecteurProgramme } from '../src/components/BelfitPlus.jsx';

// Banc de la relecture du plan (27/10) : si la page pose window.__lecteur, la
// lecture de users/{uid} est SIMULEE par lui (aucun acces a Firestore).
//   window.__lecteur = { docs: { uid: document }, delai: { uid: ms }, panne: false, appels: 0 }
if (window.__lecteur) {
  poserLecteurProgramme(async (uid) => {
    const L = window.__lecteur;
    L.appels++; (L.parUid = L.parUid || {})[uid] = (L.parUid[uid] || 0) + 1;
    if (L.delai && L.delai[uid]) await new Promise((r) => setTimeout(r, L.delai[uid]));
    if (L.panne) throw new Error('reseau simule');
    const d = L.docs[uid];
    return d ? JSON.parse(JSON.stringify(d)) : null;
  });
}

const FAUX = { uid: 'test', email: 'coach@belfit.be', displayName: new URLSearchParams(location.search).has('sansprenom') ? '' : 'Raci', getIdToken: async () => 'jeton-de-test', metadata: { creationTime: new Date().toISOString() } };
objectifs.value = { kcal: 2712, prot: 165, carbs: 344, lip: 75 };
let n = 0;
const ing = (name, portion) => ({ id: ++n, name, portion });
repas.value = [
  { id: 1, nom: 'Petit déjeuner', type: 'repas', cle: 'pdej', fixe: true, ouvert: false, ings: [ing('Avoine', 70), ing('Whey', 30)] },
  { id: 2, nom: 'Déjeuner', type: 'repas', cle: 'dej', fixe: true, ouvert: false, ings: [ing('Riz cuit', 125), ing('Poulet cuit', 95)] },
  { id: 3, nom: 'Dîner', type: 'repas', cle: 'diner', fixe: true, ouvert: false, ings: [] },
  { id: 4, nom: 'Collations', type: 'collation', cle: 'snack', fixe: true, ouvert: false, ings: [] },
];
// Journal du banc remplace par les tests (22/10) : ?repas -> localStorage.
try { const rj = localStorage.getItem('belfit_v2_apercu_repas'); if (rj) repas.value = JSON.parse(rj); } catch (e) {}
try { const dj = localStorage.getItem('belfit_v2_apercu_datejour'); if (dj) dateJour.value = dj; } catch (e) {}
// ---- Demarrage simule (banc de la sequence splash -> accueil) ----
// Les signaux de session sont verrouilles : Firebase (sans reseau) ne peut plus les
// remettre a zero ; seule cette page les ecrit, avec les delais voulus.
//   ?auth=ms      Firebase repond au bout de ms (defaut 300)
//   ?donnees=ms   les donnees du journal sont pretes au bout de ms (defaut 800)
//   ?sansutilisateur   Firebase repond « personne » (ecran de connexion)
//   ?sansprenom   utilisateur sans prenom
const P = new URLSearchParams(location.search);
const dAuth = Number(P.get('auth') || 300), dDon = Number(P.get('donnees') || 800);
const verrouiller = (sig) => {
  const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(sig), 'value');
  Object.defineProperty(sig, 'value', { get() { return d.get.call(this); }, set() { /* ignore */ }, configurable: true });
  return (v) => d.set.call(sig, v);
};
const ecrireU = verrouiller(utilisateur), ecrireAuth = verrouiller(authPrete), ecrireDon = verrouiller(donneesPretes);
ecrireU(null); ecrireAuth(false); ecrireDon(false);
try { localStorage.setItem('belfit_v2_apercu_premium', '1'); } catch (e) {}
setTimeout(() => { ecrireU(P.has('sansutilisateur') ? null : FAUX); ecrireAuth(true); }, dAuth);
const regler = () => { calculBaseFait.value = true; programmeCharge.value = true; estPremium.value = true; };
setTimeout(() => { ecrireDon(true); regler(); setInterval(regler, 100); }, dDon);   // l'effet Firestore remet estPremium a false
window.__banc = { dAuth, dDon, eau, repas };
