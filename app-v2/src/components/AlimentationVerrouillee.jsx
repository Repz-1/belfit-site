// Carte d'offre affichee AU-DESSUS de l'historique (en lecture seule) quand
// l'acces nutrition n'est pas ouvert. Sobre : vert BelFit, un trait jaune fin,
// un seul bouton, aucun prix (le prix et le bon tarif sont sur la page de
// l'offre, qui connait le cas du client). Visible seulement si le blocage est
// applique (voir store/acces-nutrition.js).
import { allerOnglet } from './BottomNav.jsx';
import '../styles/alimentation-verrouillee.css';
import { APP_ANDROID, MSG_INACTIF } from '../services/app-android.js';

export function AlimentationVerrouillee({ cause = 'jamais', fin = null, commandesOuvertes = true }) {
  const expire = cause === 'expire';
  // App Android (Play) : message neutre, sans offre, sans lien, sans prix.
  if (APP_ANDROID) {
    return (
      <div class="vr-carte" role="region" aria-label="Alimentation" data-android-inactif>
        <span class="vr-trait" aria-hidden="true" />
        <p class="vr-kicker">ALIMENTATION</p>
        <p class="vr-txt">{MSG_INACTIF}{expire ? ' Tes anciens repas restent consultables ci-dessous.' : ''}</p>
      </div>
    );
  }
  // Raci, 31/10 : carte compacte au style de la carte d'offre de la vitrine,
  // sans titre, toujours avec le bouton d'achat (jamais « Bientot disponible ») :
  // il mene a l'onglet de l'offre (parcours Mollie existant).
  const puces = expire
    ? [fin ? `Accès terminé le ${fin}` : 'Accès terminé', 'Tes anciens repas restent consultables', 'Entraînement offert']
    : ['Tu remplis un questionnaire personnalisé', 'Ton plan repas sur mesure, livré sous 48 h', 'Entraînement offert'];
  return (
    <div class="vr-carte vr-bulle" role="region" aria-label="Alimentation">
      {puces.length > 0 && <ol class="vr-puces">{puces.map(t => <li key={t}>{t}</li>)}</ol>}
      <button class="vr-btn" onClick={() => allerOnglet('premium')}>{expire ? 'Reprendre mon programme' : 'Débloquer mon programme'}</button>
    </div>
  );
}
