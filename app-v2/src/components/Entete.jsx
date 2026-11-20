import { BandeauCoach } from './BandeauCoach.jsx';
import { tx } from '../i18n/ecrans.js';
import '../styles/coach-page.css';
import { signal } from '@preact/signals';
import { utilisateur } from '../services/firebase.js';
import { prenom } from '../store/perso.js';
import { ongletActif } from './BottomNav.jsx';
import { ouvrirReglages } from './Reglages.jsx';
import { t } from '../i18n/index.js';

// Etat du volet profil, partage entre l'en-tete de chaque onglet.
export const voletProfil = signal(false);
export const ouvrirProfil = () => { voletProfil.value = !voletProfil.value; };

/** Prenom de la personne connectee, sinon rien.
 *  Trois sources, dans l'ordre : le compte Firebase, la cle posee a
 *  la connexion, puis le profil local — un compte ancien peut n'avoir
 *  que la troisieme. */
export function prenomUtilisateur() {
  // 1. Le prenom du compte (synchronise) — il suit la personne d'un
  //    appareil a l'autre. 2. Le displayName Firebase. 3. Les cles
  //    locales heritees de la v1, pour les comptes d'avant la synchro.
  if (prenom.value) return prenom.value;
  const u = utilisateur.value;
  const nom = (u && u.displayName) || '';
  if (nom) return nom.split(' ')[0];
  try {
    const cle = localStorage.getItem('repz_firstName');
    if (cle) return cle;
    const prof = JSON.parse(localStorage.getItem('repz_profile') || '{}');
    return (prof && prof.prenom) || '';
  } catch (e) { return ''; }
}

// En-tete commun : marque a gauche, prenom au centre, profil + reglages
// a droite. Le prenom au centre donne le sentiment d'une application qui
// appartient a la personne, plutot que d'un service qui l'accueille.
// Trois colonnes (1fr / auto / 1fr) : le centre reste centre quelle que
// soit la largeur des deux bords.
export function Entete({ retour, sansBandeau } = {}) {
  const p = prenomUtilisateur();
  return (
    <>
    <header class="j-entete j-entete--perso">
      {/* Logo officiel BF (belfit-logo-bf.png) depuis le 8/08 — le meme
          que le splash v1 — logo-symbol.png etait un reste de l'epoque
          REPZ (feuille verte), jamais rebrande.
          CHEMIN ABSOLU obligatoire : en relatif ('../'), le navigateur
          resout une URL differente de celle de index.html et de
          LoginScreen, qui pointent en '/'. Deux URL = deux entrees de
          cache = le logo telecharge deux fois par visite. */}
      {/* UNE SEULE STRUCTURE, prenom ou pas. L'ancienne variante sans
          prenom basculait sur un grand logo-bandeau : deux en-tetes
          differents selon l'etat du stockage local, et des pages qui
          semblaient depareillees d'un onglet a l'autre. Le symbole
          reste, le centre reste (vide au pire), la grille reste. */}
      {retour ? (
        /* Fleche retour a la place du symbole : demande pour les
           onglets secondaires. Meme gabarit que les boutons de
           droite, la grille ne bouge pas. ongletActif n'est lu que
           dans le gestionnaire — le cycle d'import BottomNav ->
           PremiumPage -> Entete -> BottomNav reste inerte au
           chargement, comme dans BelfitPlus. */
        <button
          class="j-btn-icone j-retour"
          onClick={() => {
            // `retour` etait traite comme un simple drapeau : le bouton
            // ramenait toujours a l'onglet Journal. Or les Reglages ne
            // sont pas un onglet, ils recouvrent l'application entiere
            // (main.jsx : `if (vueReglages.value) return <Reglages />`).
            // Changer d'onglet ne les fermait donc pas : un appui ne
            // faisait rien, et la personne finissait par utiliser le
            // retour du telephone, qui quitte l'application.
            if (typeof retour === 'function') retour();
            else ongletActif.value = 'journal';
          }}
          aria-label={tx('Retour')}
        >
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      ) : (
        <img class="j-symbole" src="/belfit-logo-bf.png" alt="BELFIT" />
      )}

      {/* « Bonjour + prenom » retire de toutes les pages (Raci, 21/08,
          « pour le moment »). Le calcul de `p` est conserve juste
          au-dessus : le jour ou on le remet, il n'y a que cette ligne
          a decommenter, et la grille de l'en-tete a repasser a trois
          colonnes dans entete-commune.css.
      <div class="j-prenom">{p ? `${t('greeting')} ${p}` : t('greeting')}</div>
      */}

      <div class="j-entete-actions">
        <button class="j-btn-icone" onClick={ouvrirProfil} aria-label="Profil">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></svg>
        </button>
        <button class="j-btn-icone" onClick={ouvrirReglages} aria-label={tx('Réglages')}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1.03 1.56V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1.11-1.56 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.56-1.03H3a2 2 0 110-4h.09a1.7 1.7 0 001.56-1.11 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34h.01A1.7 1.7 0 0010 4.09V4a2 2 0 114 0v.09a1.7 1.7 0 001.03 1.56h.01a1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87v.01a1.7 1.7 0 001.56 1.03H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.51 1.02z" /></svg>
        </button>
      </div>
    </header>
    {/* Rappel du questionnaire coach, sur toutes les pages (26/09) */}
    {!sansBandeau && <BandeauCoach />}
    </>
  );
}
