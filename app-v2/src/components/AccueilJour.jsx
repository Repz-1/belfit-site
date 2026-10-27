import { useEffect, useState } from 'preact/hooks';
import { prenomUtilisateur } from './Entete.jsx';
import { langue } from '../i18n/index.js';
import { composerAccueil, lireDernier, ecrireDernier } from '../services/accueil-messages.js';
import { momentBruxelles } from '../services/accueil-frequence.js';
import '../styles/accueil-jour.css';

/**
 * Ecran de bienvenue : logo BelFit, « Bonjour, {prenom} », une petite phrase
 * selon l'heure de Bruxelles. Aucune donnee de l'app. Se ferme seul (~3,4 s,
 * en fondu) ou d'un tap. Le dernier message est memorise pour ne pas se
 * repeter deux fois de suite.
 */
export function AccueilJour({ onFin }) {
  const [m] = useState(() => {
    const r = composerAccueil({ heure: momentBruxelles().heure, prenom: prenomUtilisateur(), dernier: lireDernier(), lang: langue.peek() });
    ecrireDernier(r);
    return r;
  });
  const [vu, setVu] = useState(false);
  const [sort, setSort] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setVu(true));
    const t1 = setTimeout(() => setSort(true), 2800);
    const t2 = setTimeout(onFin, 3450);
    return () => { cancelAnimationFrame(r); clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div class={'acc-voile' + (vu ? ' acc-vu' : '') + (sort ? ' acc-sort' : '')} role="status" aria-live="polite"
      onClick={onFin} data-tranche={m.tranche} data-index={m.index}>
      <div class="acc-carte">
        <img class="acc-logo" src="/belfit-logo-bf.png" alt="BelFit" />
        <div class="acc-titre">
          {m.salut}{m.prenom ? ',\u00a0' : ''}{m.prenom ? <span class="acc-nom">{m.prenom}</span> : null}{m.interro ? '\u00a0?' : ''}
        </div>
        {m.phrase ? <div class="acc-sous">{m.phrase}</div> : null}
      </div>
    </div>
  );
}
