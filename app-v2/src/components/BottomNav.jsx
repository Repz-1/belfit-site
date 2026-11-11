import { signal } from '@preact/signals';
import { t } from '../i18n/index.js';
import { repasOuvertId } from './MealCard.jsx';
import { vueEntrainer } from './Entrainer.jsx';
import { useState, useEffect } from 'preact/hooks';
import { ONGLET_VITRINE } from '../acces-invite.js';
import { ecritureBloquee } from '../store/acces-nutrition.js';

// Onglet actif de l'app. Signal global : n'importe quel composant
// peut naviguer (ex : le bouton « Premium » d'une modale).
// L'onglet d'ouverture. 'journal' en temps normal ; 'entrainer' tant
// que les essais publics sont ouverts (voir acces-invite.js).
export const ongletActif = signal(ONGLET_VITRINE);

// Onglet d'ouverture par l'adresse : belfit.be/v2/?onglet=entrainer
// Demande de Raci le 10/08 — un lien qui ouvre directement la page
// S'entrainer, sans passer par le Journal puis un appui.
// Se combine avec ?invite=1. Une valeur inconnue est ignoree plutot
// que de laisser l'application sur un onglet qui n'existe pas.
try {
  const demande = new URLSearchParams(location.search).get('onglet');
  if (['journal', 'entrainer', 'stats', 'premium'].includes(demande)) {
    ongletActif.value = demande;
  }
} catch (e) { /* URL intouchable : on reste sur le journal */ }

// Hauteur de defilement de la page que l'on quitte. Le deck de
// transition est en position fixe : sans cette valeur, la page
// sortante repartirait de son sommet et sauterait verticalement.
export const scrollSortant = signal(0);

// L'app defile dans son propre conteneur (comme les iframes de la v1) :
// le document ne bouge jamais, la barre du navigateur reste stable.
export const defileur = { el: null };
const lireScroll = () => (defileur.el ? defileur.el.scrollTop : (window.scrollY || 0));

/** Changement d'onglet : memorise le defilement avant de basculer. */
export function allerOnglet(cle) {
  // La page repas (plein ecran) recouvre le rail : sans cette
  // fermeture, taper un autre onglet changeait bien l'onglet actif
  // mais l'ecran restait bloque sur l'encodage du repas.
  if (repasOuvertId.value !== null) repasOuvertId.value = null;
  if (cle === 'courses' && ecritureBloquee()) return;   // alimentation fermee
  if (cle === ongletActif.value) return;
  // En QUITTANT S'entrainer, on remet sa vue interne a l'accueil.
  // Sans cela le signal garde le dernier ecran ouvert : on partait
  // depuis « Tous les programmes », on revenait par l'onglet, et la
  // liste des programmes reapparaissait — sans qu'on l'ait demandee et
  // sans comprendre pourquoi. Un onglet doit s'ouvrir sur sa page
  // d'accueil, pas sur l'endroit ou on l'avait laisse trois ecrans
  // plus loin.
  if (ongletActif.value === 'entrainer' && vueEntrainer.value.nom !== 'accueil') {
    vueEntrainer.value = { nom: 'accueil', params: null };
  }
  scrollSortant.value = lireScroll();
  ongletActif.value = cle;
}

// ============================================================
// BARRE DE NAVIGATION
// Quatre onglets de largeur egale. L'etat actif se marque par un
// blanc plein et un point jaune BelFit de 4 px sous le libelle :
// l'accent designe, il ne colore pas. Trace des icones inchange.
// ============================================================
const ONGLETS = [
  {
    k: 'journal', label: 'nav_journal',
    trace: ['M7 3v7a2 2 0 002 2v9', 'M5 3v4', 'M9 3v4', 'M17 3c-1.5 0-3 2-3 5v4h3v9'],
  },
  {
    k: 'entrainer', label: 'nav_train',
    trace: ['M6.5 6.5v11', 'M17.5 6.5v11', 'M3 9v6', 'M21 9v6', 'M6.5 12h11'],
  },
  {
    k: 'stats', label: 'nav_stats',
    trace: ['M4 20V10', 'M10 20V4', 'M16 20v-8', 'M22 20H2'],
  },
  {
    // Une fois l'abonnement actif, l'onglet cesse d'etre une offre
    // pour devenir un espace : « Premium » -> « BelFit+ ». L'ETOILE
    // NE CHANGE PAS — la barre garde son rythme, et l'utilisateur
    // retrouve son onglet a la meme place, sous un autre nom.
    // Le libelle est resolu au rendu, pas ici : ONGLETS est une
    // constante de module, elle serait figee au chargement.
    k: 'premium', label: 'nav_coach',   // 26/09 : app gratuite, l'onglet vend le coaching
    trace: ['M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z'],
  },
];

export function BottomNav() {
  // La barre s'efface pendant le defilement, dans les deux sens, et
  // revient des que la page s'immobilise (Raci, 9/08 : « la barre en bas
  // gene un peu »). Elle revient toujours de son propre chef : on ne
  // peut jamais se retrouver sans navigation. Seuil de 6px pour ignorer
  // le tremblement du doigt.
  //
  // Retour apres 240ms d'immobilite (Raci, 10/08 : « qu'elle
  // reapparaisse rapidement quand j'arrete de defiler »). C'etait
  // 700ms, plus 340ms d'animation : pres d'une seconde d'attente une
  // fois le doigt leve.
  //
  // Et en bas de page, elle ne se cache pas du tout : l'escamotage
  // sert a degager du contenu sous la barre, or arrive en bas il n'y
  // a plus rien a degager. C'est la que l'attente se remarquait le
  // plus, l'inertie du defilement relancant le minuteur a chaque
  // image.
  const [cachee, setCachee] = useState(false);
  useEffect(() => {
    let dernier = 0, minuteur = null, cible = null;
    const suivre = () => {
      const y = cible ? cible.scrollTop : 0;
      // Marge de 4px : le rebond elastique fait depasser le maximum,
      // et un arrondi sub-pixel suffirait a rater l'egalite stricte.
      const restant = cible ? cible.scrollHeight - cible.clientHeight - y : 0;
      if (restant <= 4) {
        clearTimeout(minuteur);
        setCachee(false);
        dernier = y;
        return;
      }
      const ecart = y - dernier;
      // Elle s'efface dans LES DEUX SENS (Raci, 9/08) : c'est le fait de
      // faire defiler qui la range, pas la direction. Elle revient des
      // que la page s'immobilise.
      if (Math.abs(ecart) > 6) {
        setCachee(true);
        dernier = y;
      }
      clearTimeout(minuteur);
      minuteur = setTimeout(() => setCachee(false), 240);
    };
    // Le panneau visible change d'un onglet a l'autre : on ecoute au
    // niveau du document, en phase de capture, plutot que de s'accrocher
    // a un element qui sera remplace.
    const surDefilement = (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('pan-scroll')) {
        cible = e.target; suivre();
      }
    };
    document.addEventListener('scroll', surDefilement, true);
    return () => { document.removeEventListener('scroll', surDefilement, true); clearTimeout(minuteur); };
  }, []);

  return (
    <nav class={'bn' + (cachee ? ' bn--escamotee' : '')}>
      {ONGLETS.map(o => {
        const actif = ongletActif.value === o.k;
        return (
          <button
            key={o.k}
            class={'bn-item bn-item--' + o.k + (actif ? ' bn-item--actif' : '')}
            onClick={() => allerOnglet(o.k)}
            aria-current={actif ? 'page' : undefined}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {o.trace.map((d, i) => <path key={i} d={d} />)}
            </svg>
            <span>{t(o.label)}</span>
            <i class="bn-point" aria-hidden="true" />
          </button>
        );
      })}
    </nav>
  );
}
