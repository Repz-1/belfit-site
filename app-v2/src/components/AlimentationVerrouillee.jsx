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
  // Raci, 31/10 : bulle compacte (style vitrine) au lieu de la grande carte.
  return (
    <div class="vr-carte vr-bulle" role="region" aria-label="Alimentation">
      <p class="vr-txt">
        <b>{expire ? 'Ton accès alimentation est terminé.' : 'Alimentation : payante.'}</b>{' '}
        {expire
          ? `${fin ? `Fin le ${fin}. ` : ''}Tes anciens repas restent consultables ci-dessous.`
          : 'Plan écrit pour toi sous 48 h, journal et analyses IA.'}
        {' '}<span class="vr-offert">L'entraînement reste offert.</span>
      </p>
      {commandesOuvertes
        ? <button class="vr-lien" onClick={() => allerOnglet('premium')}>Voir l'offre ›</button>
        : <span class="vr-lien vr-lien--gris" aria-disabled="true">Bientôt disponible</span>}
    </div>
  );
}
