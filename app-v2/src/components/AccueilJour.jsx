import { useEffect, useState } from 'preact/hooks';
import { prenomUtilisateur } from './Entete.jsx';
import { langue } from '../i18n/index.js';
import { composerAccueil } from '../services/accueil-message.js';
import { marquerVu } from '../services/accueil-cle.js';
import '../styles/accueil-jour.css';

/**
 * Carte d'accueil : un simple mot de bienvenue (« Bonjour {prenom} » ou
 * « Bienvenue »). Aucune donnee de l'app. `cle` / `jour` : repere « deja vu »
 * ecrit a l'affichage.
 */
export function AccueilJour({ periode, cle, jour, onFin }) {
  const [msg] = useState(() => composerAccueil({ periode, prenom: prenomUtilisateur() }, langue.peek()));
  const [vu, setVu] = useState(false);
  const [sort, setSort] = useState(false);
  useEffect(() => {
    marquerVu(cle, jour);
    const r = requestAnimationFrame(() => setVu(true));
    // Reste ~3 s (la projection dure ~2,5 s), puis disparition douce.
    const t1 = setTimeout(() => setSort(true), 3200);
    const t2 = setTimeout(onFin, 3900);
    return () => { cancelAnimationFrame(r); clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div class={'acc-voile' + (vu ? ' acc-vu' : '') + (sort ? ' acc-sort' : '')} role="status" aria-live="polite" onClick={onFin} data-accueil={periode}>
      <div class="acc-carte">
        <img class="acc-logo" src="/belfit-logo-bf.png" alt="" />
        <h2 class="acc-titre">{msg.titre}</h2>
        <div class="acc-filet" />
      </div>
    </div>
  );
}
