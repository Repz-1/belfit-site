import { useEffect, useState } from 'preact/hooks';
import { prenomUtilisateur } from './Entete.jsx';
import { programme, planCoachActif } from './BelfitPlus.jsx';
import { repas, objectifs, calculBaseFait, eau, totauxJourAff } from '../store/journal.js';
import { portraitSeanceDuJour, ETAT } from '../store/seance-active.js';
import { seancesDuJour } from '../store/seances.js';
import { prochainRepas } from '../store/coach.js';
import { macrosOf } from '../data/aliments.js';
import { langue } from '../i18n/index.js';
import { composerAccueil } from '../services/accueil-message.js';
import { marquerVu } from '../services/accueil-cle.js';
import '../styles/accueil-jour.css';

const isoLocal = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

/** Ce que l'app sait vraiment, rien d'autre. */
export function collecterContexte(periode, heure) {
  const liste = repas.value || [];
  const ctx = { periode, prenom: prenomUtilisateur() };
  if (planCoachActif.value) ctx.kcalObjectif = +programme.value.kcal;
  else if (calculBaseFait.value && objectifs.value) ctx.kcalObjectif = +objectifs.value.kcal || 0;
  const p = portraitSeanceDuJour();
  if (p && p.titre && p.etat !== ETAT.VIDE) ctx.seanceJour = { titre: p.titre, faite: p.etat === ETAT.FAITE };
  if (periode === 'matin') {
    const prevus = liste.filter(r => r.duPlan && r.prevu && !r.saute && !r.remplace && r.cle);
    const cle = prochainRepas(prevus.map(r => r.cle), heure);
    const r = prevus.find(x => x.cle === cle);
    if (r) ctx.prochainRepas = { nom: r.nom, kcal: (r.ings || []).reduce((s, i) => s + macrosOf(i).kcal, 0) };
    const hier = new Date(); hier.setDate(hier.getDate() - 1);
    ctx.seancesHier = seancesDuJour(isoLocal(hier)).length;
  } else {
    ctx.repasValides = liste.filter(r => !r.prevu && !r.saute && (r.ings || []).length).length;
    ctx.kcalJour = Math.round(totauxJourAff.value.kcal || 0);
    ctx.eauL = eau.value || 0;
  }
  return ctx;
}

/** Carte d'accueil. `cle` / `jour` : repere « deja vu » ecrit a l'affichage. */
export function AccueilJour({ periode, heure, cle, jour, onFin }) {
  const [msg] = useState(() => composerAccueil(collecterContexte(periode, heure), langue.peek()));
  const [vu, setVu] = useState(false);
  useEffect(() => {
    if (!msg) { onFin(); return undefined; }
    marquerVu(cle, jour);
    const r = requestAnimationFrame(() => setVu(true));
    const t = setTimeout(onFin, 2200);
    return () => { cancelAnimationFrame(r); clearTimeout(t); };
  }, []);
  if (!msg) return null;
  return (
    <div class={'acc-voile' + (vu ? ' acc-vu' : '')} role="status" aria-live="polite" onClick={onFin} data-accueil={periode}>
      <div class="acc-carte">
        <img class="acc-logo" src="/belfit-logo-bf.png" alt="" />
        <h2 class="acc-titre">{msg.titre}</h2>
        <div class="acc-filet" />
        {msg.lignes.map((l) => <p class="acc-ligne">{l}</p>)}
      </div>
    </div>
  );
}
