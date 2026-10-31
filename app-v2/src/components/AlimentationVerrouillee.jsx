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
  return (
    <div class="vr-carte" role="region" aria-label="Alimentation">
      <span class="vr-trait" aria-hidden="true" />
      <p class="vr-kicker">ALIMENTATION</p>
      <h2 class="vr-titre">{expire ? 'Ton accès alimentation est terminé' : "L'alimentation s'ouvre avec ton 1er mois"}</h2>
      <p class="vr-txt">
        {expire
          ? `${fin ? `Il s'est terminé le ${fin}.` : 'Il est terminé.'} Tes anciens repas restent consultables ci-dessous, sans modification possible.`
          : 'Journal des repas, plan prévu, ajout d\u2019aliments et analyses IA.'}
      </p>
      <ul class="vr-liste">
        <li>Plan alimentaire écrit pour toi, livré sous 48&nbsp;h</li>
        <li>Journal et analyses IA pendant 44&nbsp;jours</li>
        <li>L'entraînement reste inclus</li>
      </ul>
      {commandesOuvertes
        ? <button class="vr-bt" onClick={() => allerOnglet('premium')}>Voir l'offre</button>
        : <button class="vr-bt vr-bt--gris" disabled>Bientôt disponible</button>}
      <p class="vr-pied">Sans abonnement, sans prélèvement.</p>
    </div>
  );
}
