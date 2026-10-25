// Banc d'essai de la VRAIE App (main.jsx), avec une session simulee.
// L'apercu normal monte les pages une par une : il ne peut pas
// montrer ce qui vit dans App (volet profil, reglages, rail).
import { render } from 'preact';
import '../src/styles.css';
import '../src/styles/design-system.css';
import '../src/styles/journal-socle.css';
import { utilisateur, authPrete } from '../src/services/firebase.js';
import { donneesPretes, objectifs, repas, calculBaseFait, dateJour } from '../src/store/journal.js';
import { histoJours } from '../src/store/stats.js';
import { App } from '../src/main.jsx';
import { programmeActif } from '../src/store/programme.js';
import { estPremium } from '../src/components/PremiumPage.jsx';
import { programme } from '../src/components/BelfitPlus.jsx';


utilisateur.value = { uid: 'test', email: 'coach@belfit.be', displayName: 'Raci', getIdToken: async () => 'jeton-de-test', metadata: { creationTime: new Date().toISOString() } };
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
const GRATUIT = new URLSearchParams(location.search).has('gratuit');
if (GRATUIT) estPremium.value = false;
const faux = utilisateur.value;
setInterval(() => {
  if (!utilisateur.value) utilisateur.value = faux;
  authPrete.value = true;
  donneesPretes.value = true;
  calculBaseFait.value = true;
  if (!GRATUIT) estPremium.value = true;   // l'effet Firestore le remettait a false
}, 100);

// Acces des tests Playwright (cloture de la veille, 21/10).
window.__banc = { dateJour, repas, histoJours, programme };

render(<App />, document.getElementById('app'));
