// Banc d'essai : selecteur d'exercices, onglets de muscles.
import { render } from 'preact';
import '../src/styles.css';
import '../src/styles/design-system.css';
import '../src/legacy/selection-exercices.scoped.css';
import { langue } from '../src/i18n/index.js';
import { SelectionExercices } from '../src/components/SelectionExercices.jsx';
langue.value = new URLSearchParams(location.search).get('lang') || 'fr';
render(<SelectionExercices />, document.getElementById('app'));
