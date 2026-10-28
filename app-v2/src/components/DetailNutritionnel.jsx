import { detailTotal, CLES_DETAIL } from '../data/aliments.js';
import { accesDecouverte, joursRestantsDecouverte, enDecouverte } from '../services/decouverte.js';
import { ongletActif } from './BottomNav.jsx';
import { repasOuvertId } from './MealCard.jsx';
import { lectureSeule } from '../store/acces-nutrition.js';

// ============================================================
// DETAIL NUTRITIONNEL D'UN REPAS
// Au-dela des quatre macros : fibres, sucres, graisses saturees,
// sel. Offert pendant la periode de decouverte, puis Premium.
//
// Parti pris : on n'affiche jamais un chiffre qu'on ne sait pas.
// Un aliment sans donnee n'est pas compte comme un zero, et si le
// total ne porte que sur une partie du repas, on le dit. Un « 0 g
// de fibres » faux vaut moins que pas de chiffre du tout.
// ============================================================

const ICONES = {
  fibres: <svg viewBox="0 0 24 24"><path d="M5 19c8 0 14-5 14-14-9 0-14 5-14 14z" /><path d="M5 19c3-4 6-6 10-8" /></svg>,
  sucres: <svg viewBox="0 0 24 24"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" /></svg>,
  satures: <svg viewBox="0 0 24 24"><path d="M12 3.5c3.6 4.2 5.5 7 5.5 9.5a5.5 5.5 0 11-11 0c0-2.5 1.9-5.3 5.5-9.5z" /></svg>,
  sel: <svg viewBox="0 0 24 24"><path d="M8.5 9h7l1 11.5h-9z" /><path d="M9.5 9V6.5a2.5 2.5 0 015 0V9" /><path d="M11 4.5h2" /></svg>,
};

const LIBELLES = {
  fibres: 'Fibres',
  sucres: 'Sucres',
  satures: 'Graisses saturées',
  sel: 'Sel',
};

// Une trace non nulle arrondie a 0,0 g se lit comme une absence de
// sel ou de sucre, ce qui est faux. On distingue donc trois cas :
// zero exact, trace sous le seuil d'affichage, et valeur normale.
function valeur(v) {
  if (v === 0) return '0 g';
  if (v < 0.05) return '< 0,1 g';
  if (v < 10) return v.toFixed(1).replace('.', ',') + ' g';
  return Math.round(v) + ' g';
}

export function DetailNutritionnel({ ings }) {
  const { total, connus, nbAliments } = detailTotal(ings);
  const dispos = CLES_DETAIL.filter(k => connus[k] > 0);

  // Aucun aliment du repas ne porte l'information : plutot que
  // d'afficher un tableau de tirets, on explique ou la trouver.
  if (dispos.length === 0) {
    return (
      <div class="dn">
        <div class="dn-tete"><span class="dn-titre">Détail nutritionnel</span></div>
        <p class="dn-absent">
          Aucun aliment de ce repas ne porte encore ce détail. Les produits ajoutés
          par scan du code-barres l'apportent automatiquement.
        </p>
      </div>
    );
  }

  const ouvert = accesDecouverte.value;

  return (
    <div class="dn">
      <div class="dn-tete">
        <span class="dn-titre">Détail nutritionnel</span>
        {ouvert && enDecouverte.value && !lectureSeule.value && (
          <span class={'dn-offert' + (joursRestantsDecouverte.value <= 2 ? ' dn-offert--fin' : '')}>
            Offert {joursRestantsDecouverte.value} j
          </span>
        )}
        {!ouvert && <span class="dn-pro">✦ PRO</span>}
      </div>

      <div class={'dn-lignes' + (ouvert ? '' : ' dn-lignes--verrou')}>
        {dispos.map(k => (
          <div class="dn-ligne" key={k}>
            <span class="dn-ic" aria-hidden="true">{ICONES[k] || null}</span>
            <span class="dn-lb">{LIBELLES[k]}</span>
            {ouvert ? (
              <span class="dn-val">{valeur(total[k])}</span>
            ) : (
              <span class="dn-cadenas" aria-hidden="true">
                <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
              </span>
            )}
          </div>
        ))}
      </div>

      {ouvert && dispos.some(k => connus[k] < nbAliments) && (
        <p class="dn-partiel">
          Calculé sur les aliments qui portent l'information — les autres ne sont pas comptés.
        </p>
      )}

      {/* Moment n°2 : la fin de la fenetre approche. Ligne de statut,
          pas banniere — la fleche seule signale que c'est cliquable. */}
      {ouvert && enDecouverte.value && joursRestantsDecouverte.value <= 2 && (
        <button class="dn-rappel" onClick={() => { repasOuvertId.value = null; ongletActif.value = 'premium'; }}>
          Accès Premium : {joursRestantsDecouverte.value} jour{joursRestantsDecouverte.value > 1 ? 's' : ''} restant{joursRestantsDecouverte.value > 1 ? 's' : ''}
        </button>
      )}

      {!ouvert && (
        <button class="dn-cta" onClick={() => { repasOuvertId.value = null; ongletActif.value = 'premium'; }}>
          Débloquer le détail nutritionnel
        </button>
      )}
    </div>
  );
}
