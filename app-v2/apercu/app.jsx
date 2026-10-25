// Banc d'essai de la VRAIE App (main.jsx), avec une session simulee.
// L'apercu normal monte les pages une par une : il ne peut pas
// montrer ce qui vit dans App (volet profil, reglages, rail).
import { render } from 'preact';
import '../src/styles.css';
import '../src/styles/design-system.css';
import '../src/styles/journal-socle.css';
import { utilisateur, authPrete } from '../src/services/firebase.js';
import { donneesPretes, objectifs, repas, calculBaseFait, dateJour, repasAffiches, journalDUnJourPasse } from '../src/store/journal.js';
import { histoJours, weightLog, ajouterPesee } from '../src/store/stats.js';
import { App, AccueilGarde } from '../src/main.jsx';
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

utilisateur.value = { uid: 'test', email: 'coach@belfit.be', displayName: new URLSearchParams(location.search).has('sansprenom') ? '' : 'Raci', getIdToken: async () => 'jeton-de-test', metadata: { creationTime: new Date().toISOString() } };
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
authPrete.value = true;
donneesPretes.value = true;
calculBaseFait.value = true;
try { localStorage.setItem('belfit_v2_apercu_premium', '1'); } catch (e) {}
// Programme d'entrainement simule (onglet Coach > Tes seances).
try { const pe = localStorage.getItem('belfit_v2_apercu_entrainement'); if (pe) programmeActif.value = JSON.parse(pe); } catch (e) {}

// Firebase repond en differe et remet `utilisateur` a null : on
// maintient la session simulee le temps du test.
// ?gratuit : simule un compte non payant (test du lancement, 24/09).
const ACCUEIL = new URLSearchParams(location.search).has('accueil');
// ?accueil : simule le #splash de la vraie page (retire apres 1,5 s) : la carte doit l'attendre.
if (ACCUEIL) { const sp = document.createElement('div'); sp.id = 'splash'; document.body.appendChild(sp); setTimeout(() => sp.remove(), 1500); }
const GRATUIT = new URLSearchParams(location.search).has('gratuit');
if (GRATUIT) estPremium.value = false;
const faux = utilisateur.value;
setInterval(() => {
  if (!utilisateur.value) utilisateur.value = faux;
  authPrete.value = true;
  donneesPretes.value = true;
  calculBaseFait.value = true;
  if (ACCUEIL) programmeCharge.value = true;
  if (!GRATUIT) estPremium.value = true;   // l'effet Firestore le remettait a false
}, 100);

// Acces des tests Playwright (cloture de la veille, 21/10).
window.__banc = { weightLog, ajouterPesee, repasAffiches, journalDUnJourPasse, dateJour, repas, histoJours, programme, programmeBrut, programmeCharge, dossierCoach, objectifs, utilisateur };

// L'accueil du matin/soir (voile plein ecran) n'est monte que sur demande (?accueil) :
// il recouvrirait l'ecran et fausserait les autres tests selon l'heure.
render(<><App />{ACCUEIL ? <AccueilGarde /> : null}</>, document.getElementById('app'));
