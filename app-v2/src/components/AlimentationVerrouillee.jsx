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
  // Raci, 31/10 : bulle compacte dans le style de la carte d'offre de la vitrine.
  const puces = expire
    ? [fin ? `Accès terminé le ${fin}` : 'Accès terminé', 'Tes anciens repas restent consultables', 'Entraînement offert']
    : ['Plan écrit pour toi sous 48 h', 'Journal et analyses IA', 'Entraînement offert'];
  return (
    <div class="vr-carte vr-bulle" role="region" aria-label="Alimentation">
      <p class="vr-titre">{expire ? 'Alimentation : accès terminé' : 'Alimentation : formule payante'}</p>
      <ul class="vr-puces">{puces.map(t => <li key={t}>{t}</li>)}</ul>
      {commandesOuvertes
        ? <button class="vr-btn" onClick={() => allerOnglet('premium')}>Voir l'offre</button>
        : <span class="vr-btn vr-btn--off" aria-disabled="true">Bientôt disponible</span>}
    </div>
  );
}
