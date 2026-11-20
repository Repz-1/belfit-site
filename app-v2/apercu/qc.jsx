// Banc d'essai (20/11) : questionnaire coach, plan en preparation et
// suivi client, dans la langue ?lang=fr|en|nl. ?vue=qc|recap|prep|suivi
import { render } from 'preact';
import '../src/styles.css';
import '../src/styles/design-system.css';
import '../src/styles/coach-page.css';
import { utilisateur, authPrete } from '../src/services/firebase.js';
import { langue } from '../src/i18n/index.js';
import { QuestionnaireCoach } from '../src/components/QuestionnaireCoach.jsx';
import { PlanEnPreparation } from '../src/components/PlanEnPreparation.jsx';
import { SuiviClient } from '../src/components/SuiviClient.jsx';
import { programme } from '../src/components/BelfitPlus.jsx';

const q = new URLSearchParams(location.search);
langue.value = q.get('lang') || 'fr';
utilisateur.value = { uid: 'test', email: 'coach@belfit.be', displayName: 'Raci', metadata: { creationTime: new Date().toISOString() } };
authPrete.value = true;
const vue = q.get('vue') || 'qc';
const envoye = new Date(Date.now() - 6 * 3600e3).toISOString();
const quest = { envoyeLe: envoye, reponses: {
  objectif: { valeur: 'Perdre du gras', texte: 'Perdre du gras', section: 'Ton objectif', question: 'Ton objectif principal' },
  regime: { valeur: 'Flexitarien', texte: 'Flexitarien', section: 'Ce que tu manges', question: 'Régime actuel' },
} };
if (vue === 'suivi') programme.value = { livreLe: envoye, kcal: 2100, prot: 150, carbs: 220, lip: 70, repas: [{ nom: 'Petit déjeuner', ings: [{ name: 'Skyr', portion: 200 }] }, { nom: 'Dîner', ings: [] }] };
render(
  <div class="pg-coach" style={{ padding: '16px', background: '#F4F3F0', minHeight: '100vh' }}>
    {vue === 'qc' && <QuestionnaireCoach type={q.get('type') || 'plan'} onFermer={() => {}} onTermine={() => {}} />}
    {vue === 'prep' && <PlanEnPreparation payeLe={new Date(Date.now() - 864e5).toISOString()} questionnaire={quest} commande={null} />}
    {vue === 'suivi' && <SuiviClient onContinuer={() => {}} onNouveau={() => {}} />}
  </div>,
  document.getElementById('app'));
