import { useEffect, useRef, useState } from 'preact/hooks';
import { planCoachActif } from './BelfitPlus.jsx';
import { signal } from '@preact/signals';

export const ouvrirCalcDemande = signal(false);
import { repas, objectifs, totauxJourAff, kcalRestantes, donneesPretes, poidsCalcul, rappelIgnoreA, dateJour, nouvelleJournee, journalDUnJourPasse } from '../store/journal.js';
import { weightLog, enregistrerJour } from '../store/stats.js';
import { IdeesRepas } from './IdeesRepas.jsx';
import { lectureSeule } from '../store/acces-nutrition.js';
import { t } from '../i18n/index.js';
import { aujourdhuiBxl } from '../store/plans-par-date.js';

// 27/10 : horloge grossiere (30 s + retour sur l'app) pour que la mise en
// avant de « Clôturer la journée » apparaisse seule apres minuit, sans
// attendre qu'autre chose redessine la carte.
const horlogeJour = signal(0);
if (typeof document !== 'undefined') {
  const tic = () => { horlogeJour.value = Date.now(); };
  setInterval(tic, 30000);
  document.addEventListener('visibilitychange', tic);
}

function useNombreAnime(cible, duree = 650) {
  const [valeur, setValeur] = useState(cible);
  const depart = useRef(cible);
  const debut = useRef(0);
  const image = useRef(0);
  useEffect(() => {
    if (valeur === cible) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValeur(cible);
      return;
    }
    depart.current = valeur;
    debut.current = performance.now();
    const avancer = (maintenant) => {
      const p = Math.min(1, (maintenant - debut.current) / duree);
      const e = 1 - Math.pow(1 - p, 3);
      setValeur(Math.round(depart.current + (cible - depart.current) * e));
      if (p < 1) image.current = requestAnimationFrame(avancer);
    };
    image.current = requestAnimationFrame(avancer);
    return () => cancelAnimationFrame(image.current);
  }, [cible]);
  return valeur;
}

export function palierDepassement(surplus) {
  if (surplus <= 0) return null;
  if (surplus <= 150) return 'jaune';
  if (surplus <= 300) return 'orange';
  return 'rouge';
}
const DEGRADE = { jaune: 'url(#calJaugeJaune)', orange: 'url(#calJaugeOrange)', rouge: 'url(#calJaugeAlerte)' };

function Anneau({ ratio, palier, enfant }) {
  const ARC = 371;
  const CIRC = 515.2;
  const rempli = Math.min(1, Math.max(0, ratio));
  const [pret, setPret] = useState(false);
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPret(true); return;
    }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setPret(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  const trace = pret ? rempli : 0;
  return (
    <div class="cal-anneau">
      <svg width="184" height="184" viewBox="0 0 190 190" class="cal-anneau-svg">
        <defs>
          <linearGradient id="calJauge" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#34D399" />
            <stop offset="100%" stop-color="#0DA271" />
          </linearGradient>
          <linearGradient id="calJaugeJaune" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FCD34D" />
            <stop offset="100%" stop-color="#EAB308" />
          </linearGradient>
          <linearGradient id="calJaugeOrange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FDBA74" />
            <stop offset="100%" stop-color="#EA7C1B" />
          </linearGradient>
          <linearGradient id="calJaugeAlerte" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FCA5A5" />
            <stop offset="100%" stop-color="#EF5350" />
          </linearGradient>
        </defs>
        <circle cx="95" cy="95" r="82" fill="none" stroke="#DCECDF" stroke-width="13" stroke-linecap="round" stroke-dasharray={`${ARC} 144.2`} transform="rotate(140 95 95)" class="cal-anneau-piste" />
        <circle cx="95" cy="95" r="82" fill="none" stroke={palier ? DEGRADE[palier] : 'url(#calJauge)'} stroke-width="13" stroke-linecap="round" stroke-dasharray={`${(trace * ARC).toFixed(1)} ${CIRC}`} transform="rotate(140 95 95)" class="cal-anneau-lueur" aria-hidden="true" />
        <circle cx="95" cy="95" r="82" fill="none" stroke={palier ? DEGRADE[palier] : 'url(#calJauge)'} stroke-width="13" stroke-linecap="round" stroke-dasharray={`${(trace * ARC).toFixed(1)} ${CIRC}`} transform="rotate(140 95 95)" class="cal-anneau-trace" />
      </svg>
      <div class="cal-anneau-centre">{enfant}</div>
    </div>
  );
}

function Macro({ nom, valeur, cible, teinte }) {
  const affiche = useNombreAnime(Math.round(valeur));
  const ratio = cible > 0 ? Math.min(1, valeur / cible) : 0;
  const depasse = cible > 0 && valeur > cible;
  return (
    <div class="cal-macro">
      <div class="cal-macro-nom">{nom}</div>
      <div class="cal-macro-val">
        <b style={{ color: depasse ? 'var(--alerte)' : teinte }}>{affiche}g</b>
        <span> / {Math.round(cible)}g</span>
      </div>
      <div class="cal-macro-piste">
        <div class="cal-macro-jauge" style={{ width: (ratio * 100) + '%', background: depasse ? 'var(--alerte)' : teinte }} />
      </div>
    </div>
  );
}

export function DayDashboard() {
  // Alimentation fermee : on consulte le dernier journal enregistre, sans action.
  const ro = lectureSeule.value;
  const obj = objectifs.value;
  const tot = totauxJourAff.value;
  const restant = kcalRestantes.value;
  const pret = donneesPretes.value;
  const surplus = Math.max(0, -restant);
  const palier = palierDepassement(surplus);
  const depasse = palier !== null;
  const atteint = !depasse && restant <= 50 && tot.kcal > 0;
  const vide = tot.kcal === 0;
  const chiffre = useNombreAnime(Math.abs(Math.round(restant)));
  const consommees = useNombreAnime(Math.round(tot.kcal));
  const ratio = obj.kcal > 0 ? tot.kcal / obj.kcal : 0;
  const d = new Date();
  const jours = t('days_long').split('|');
  const moisCourt = t('months_min').split('|');
  const isoAuj = aujourdhuiBxl();
  const retard = !!dateJour.value && dateJour.value !== isoAuj;
  horlogeJour.value;   // abonnement : la carte se redessine apres minuit
  // 27/10 : journal d'un jour PASSE -> le bouton de cloture est mis en avant.
  const aCloturer = journalDUnJourPasse(dateJour.value);
  // Journal vide (0 kcal, aucun aliment) : rien a cloturer (21/10).
  const journalVide = !(Math.round(tot.kcal || 0) > 0) && !repas.value.some(r => (r.ings || []).length);
  // Bloque seulement si vide ET aujourd'hui : une veille vide (jour rate)
  // doit pouvoir etre cloturee pour passer a aujourd'hui (21/10, v616).
  const clotureBloquee = journalVide && !retard;
  const dOuvert = retard ? new Date(dateJour.value + 'T00:00') : d;
  const dateTexte = retard
    ? `${jours[dOuvert.getDay()] || ''} ${dOuvert.getDate()} ${moisCourt[dOuvert.getMonth()] || ''}`
    : `${t('today')}, ${d.getDate()} ${moisCourt[d.getMonth()] || ''}`;
  const dateTexteAff = ro
    ? `Journal du ${(jours[dOuvert.getDay()] || '').toLowerCase()} ${dOuvert.getDate()} ${moisCourt[dOuvert.getMonth()] || ''}`.replace(/\s+/g, ' ').trim()
    : dateTexte;
  const jourOuvert = retard
    ? `${(jours[dOuvert.getDay()] || '').toLowerCase()} ${dOuvert.getDate()} ${moisCourt[dOuvert.getMonth()] || ''}`.trim()
    : '';

  return (
    <>
    <section class={'carte carte--relief cal' + (pret ? '' : ' cal--chargement')}
             data-palier={palier || 'ok'}>
      <span class="cal-capte" aria-hidden="true" />
      <span class="cal-eclats" aria-hidden="true" />
      <div class="cal-date">
        <svg viewBox="0 0 24 24" class="cal-date-ic" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="17" rx="3" />
          <path d="M3 10h18M8 2.5v4M16 2.5v4" />
        </svg>
        <span>{dateTexteAff}</span>
      </div>
      <div class="cal-corps">
        <div class="cal-cote">
          <div class="cal-cote-lb">{t('consumed')}</div>
          <div class="cal-cote-val">{consommees}</div>
        </div>
        <Anneau ratio={ratio} palier={palier} enfant={
          <>
            <div class={'cal-num' + (palier ? ' cal-num--' + palier : '')}>{chiffre}</div>
            <div class="cal-num-lb">
              {vide ? t('kcal_left') : depasse ? t('kcal_over') : atteint ? t('kcal_reached') : t('kcal_left')}
            </div>
          </>
        } />
        <div class="cal-cote">
          <div class="cal-cote-lb">{t('goal')}</div>
          <div class="cal-cote-val">{Math.round(obj.kcal)}</div>
        </div>
      </div>
      <div class="cal-trait" />
      <div class="cal-macros">
        <Macro nom={t('proteins')} valeur={tot.prot}  cible={obj.prot}  teinte="var(--mac-prot)" />
        <Macro nom={t('carbs')}    valeur={tot.carbs} cible={obj.carbs} teinte="var(--mac-carbs)" />
        <Macro nom={t('fats')}     valeur={tot.lip}   cible={obj.lip}   teinte="var(--mac-lip)" />
      </div>
      {!ro && <RappelRecalcul />}
      {!ro && <div class="cal-action">
        <IdeesRepas pilulSeule />
      </div>}
      {retard && !ro && (
        <div class="cal-retard">{t('jour_non_cloture').replace('{j}', jourOuvert)}</div>
      )}
      {!ro && <button class={'cal-reset' + (aCloturer ? ' cal-reset--rappel' : '')} disabled={clotureBloquee}
        aria-disabled={clotureBloquee ? 'true' : undefined}
        onClick={() => {
        if (clotureBloquee) return;
        if (!confirm(t('confirm_new_day'))) return;
        // enregistrerJour refuse une journee a 0 kcal : rien n'est archive.
        if (!journalVide) enregistrerJour(totauxJourAff.value, dateJour.value);
        nouvelleJournee();
      }}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12a9 9 0 0115.5-6.2M21 12a9 9 0 01-15.5 6.2" />
          <path d="M18.5 3v3h-3M5.5 21v-3h3" />
        </svg>
        <span>{t('cloturer_journee')}</span>
      </button>}
    </section>
    </>
  );
}

const SEUIL_RECALCUL_KG = 3;

function RappelRecalcul() {
  const base = poidsCalcul.value;
  const log = weightLog.value;
  // Plan coach actif (27/09) : pas d'invitation a recalculer.
  if (planCoachActif.value) return null;
  if (!base || !log.length) return null;
  const actuel = parseFloat(log[log.length - 1].weight ?? log[log.length - 1].kg);
  if (!isFinite(actuel)) return null;
  if (Math.abs(actuel - base) < SEUIL_RECALCUL_KG) return null;
  const ignore = rappelIgnoreA.value;
  if (ignore != null && Math.abs(actuel - ignore) < SEUIL_RECALCUL_KG) return null;
  const aller = () => { ouvrirCalcDemande.value = true; };
  return (
    <div class="cal-rappel">
      <button class="cal-rappel-corps" onClick={aller}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12a9 9 0 0115.5-6.2M21 12a9 9 0 01-15.5 6.2" />
          <path d="M18.5 3v3h-3M5.5 21v-3h3" />
        </svg>
        <span>
          {t('recalc_hint')
            .replace('{avant}', Math.round(base))
            .replace('{maintenant}', Math.round(actuel))}
        </span>
      </button>
      <button class="cal-rappel-fermer" aria-label={t('chrono_fermer')} onClick={() => { rappelIgnoreA.value = actuel; }}>✕</button>
    </div>
  );
}
