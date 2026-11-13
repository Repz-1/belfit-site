// Banc d'essai de la seance guidee (13/11) : champs a boutons − / +,
// series en plus ou en moins, feuille « Pas ce materiel ? ». L'ecran
// est monte dans un conteneur transforme, comme dans le rail des
// onglets, pour verifier que les feuilles s'ouvrent bien en plein ecran.
import { render } from 'preact';
import '../src/styles.css';
import '../src/styles/design-system.css';
import '../src/styles/journal-socle.css';
import { utilisateur, authPrete } from '../src/services/firebase.js';
import { langue } from '../src/i18n/index.js';
import { SeanceGuidee } from '../src/components/SeanceGuidee.jsx';

langue.value = 'fr';
utilisateur.value = { uid: 'test', email: 'coach@belfit.be', displayName: 'Raci', metadata: { creationTime: new Date().toISOString() } };
authPrete.value = true;
try { localStorage.clear(); } catch (e) {}

render(
  <div style={{ transform: 'translateX(0)', willChange: 'transform', padding: '16px', background: '#F4F3F0', minHeight: '100vh' }}>
    <SeanceGuidee seanceId="masse-3j-0" titre="Pecs" retour={() => {}} />
  </div>,
  document.getElementById('app')
);
