import { signal, effect } from '@preact/signals';
import { PREMIUM_OUVERT } from '../acces-libre.js';
import { utilisateur } from '../services/firebase.js';
import { getApps } from 'firebase/app';
import { BelfitPlus } from './BelfitPlus.jsx';

// Statut Premium lu depuis Firestore (ecrit par le webhook LemonSqueezy)
export const estPremium = signal(false);

// Periode de test : l'acces complet pour tout le monde, sans compte
// Premium ni paiement. Un seul interrupteur, dans acces-libre.js.
// Pose avant tout le reste : ni le cache, ni Firestore, ni l'apercu ne
// doivent pouvoir le contredire.
if (PREMIUM_OUVERT) estPremium.value = true;

// Permet de simuler l'etat Premium pour inspecter l'interface dans un
// navigateur de test. Sans cela, seule la version gratuite est visible
// et tout le contenu Premium se code a l'aveugle.
// N'a aucun effet en production : le drapeau n'est jamais pose par l'app,
// et le serveur reste seul juge des acces reels.
let apercuPremium = false;
try {
  apercuPremium = localStorage.getItem('belfit_v2_apercu_premium') === '1';
  if (apercuPremium) estPremium.value = true;
} catch (e) { /* stockage indisponible */ }

// Cache partage avec la v1 (app.html) : elle ecrit repz_premium apres
// avoir verifie Firestore. MAIS ce drapeau est pose PAR APPAREIL, pas
// par compte : si un membre Premium se deconnecte et qu'un autre compte
// se connecte sur le meme telephone, le drapeau seul ferait passer le
// nouveau venu pour Premium. On ne fait donc confiance au cache que si
// l'uid memorise a cote correspond au compte reellement connecte.
const CLE_PREM_V1 = 'repz_premium';
const CLE_PREM_UID = 'belfit_v2_prem_uid';

effect(() => {
  if (PREMIUM_OUVERT) { estPremium.value = true; return; }
  if (apercuPremium) return;          // l'apercu garde la main
  const u = utilisateur.value;
  if (!u) { estPremium.value = false; return; }   // deconnecte : jamais Premium

  // Demarrage rapide : le cache ne vaut que pour le MEME compte.
  try {
    estPremium.value = localStorage.getItem(CLE_PREM_V1) === '1' &&
      localStorage.getItem(CLE_PREM_UID) === u.uid;
  } catch (e) { estPremium.value = false; }

  // Puis Firestore tranche (source de verite, ecrite par le webhook).
  // Firestore en differe : voir services/sync.js pour la raison (170 Ko gzip)
  import('firebase/firestore').then(({ getFirestore, doc, getDoc }) =>
    getDoc(doc(getFirestore(getApps()[0]), 'users', u.uid)))
    .then(s => {
      const prem = s.exists() && s.data().premium === true;
      estPremium.value = prem;
      // Cache tenu a jour, avec l'uid proprietaire du drapeau.
      try {
        if (prem) {
          localStorage.setItem(CLE_PREM_V1, '1');
          localStorage.setItem(CLE_PREM_UID, u.uid);
        } else {
          localStorage.removeItem(CLE_PREM_V1);
          localStorage.removeItem(CLE_PREM_UID);
        }
      } catch (e) {}
    })
    .catch(() => {});   // hors ligne : le demarrage rapide fait foi
});

// 20/11 : les formules Lemon Squeezy (3 et 12 mois) et la page de
// vente qui les portait sont retirees. Seul reste l'abonnement passe :
// estPremium (ci-dessus) et le lien « mes commandes » dans Reglages.
// L'onglet affiche l'espace BelFit+ (plan coach), achete via Mollie.
export function PremiumPage() {
  return <BelfitPlus />;
}
