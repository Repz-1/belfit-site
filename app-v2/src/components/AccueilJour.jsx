import { useEffect, useState } from 'preact/hooks';
import { prenomUtilisateur } from './Entete.jsx';
import { langue } from '../i18n/index.js';
import { composerAccueil, lireDernier, ecrireDernier } from '../services/accueil-messages.js';
import { momentBruxelles } from '../services/accueil-frequence.js';
import '../styles/accueil-jour.css';

/**
 * Ecran de bienvenue : petit logo BelFit discret en haut, un SEUL message court
 * (« Bonjour Raci », « Demain est un autre jour »…) selon l'heure de Bruxelles. Aucune donnee de l'app. Se ferme seul (~3,4 s,
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
      <img class="acc-logo" src="/belfit-logo-bf.png" alt="BelFit" />
      <div class="acc-carte">
        <div class={'acc-msg' + (m.long ? ' acc-long' : '')}>
          {m.pieces.map((x) => (x.gras ? <span class="acc-nom">{x.t}</span> : x.t))}
        </div>
      </div>
    </div>
  );
}
