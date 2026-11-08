// Carte en haut de chaque page (08/11, maquette A validee) :
// rappelle au client qui a paye de remplir son questionnaire. Une
// carte, un bouton ouvre le questionnaire. Disparait des l'envoi.
import { useEffect } from 'preact/hooks';
import { chargerProgramme, programme, programmeCharge, dossierCoach } from './BelfitPlus.jsx';
import { etatCoach, demandeQuestionnaire } from '../store/coach.js';
import { ongletActif } from './BottomNav.jsx';

export function BandeauCoach() {
  useEffect(() => { if (!programmeCharge.value) chargerProgramme(); }, []);
  const e = etatCoach(dossierCoach.value, programme.value);
  if (!e.aRemplir || demandeQuestionnaire.value) return null;
  const titre = e.tardif ? 'Ta demande a rejoint la file' : 'Ton questionnaire t’attend';
  return (
    <section class="bandeau-coach" aria-label="Questionnaire coach">
      <div class="bandeau-coach-haut">
        <div class="bandeau-coach-titre">{titre}</div>
        {!e.tardif && <span class="bandeau-coach-delai">{e.restants} jour{e.restants > 1 ? 's' : ''}</span>}
      </div>
      <p class="bandeau-coach-txt">Ton coach en a besoin pour préparer ton plan.</p>
      <button type="button" class="bandeau-coach-bouton" onClick={() => { demandeQuestionnaire.value = e.type; ongletActif.value = 'premium'; }}>
        Remplir mon questionnaire
      </button>
    </section>
  );
}
