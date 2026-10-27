import { signal, computed } from '@preact/signals';
import { useState } from 'preact/hooks';
import { t } from '../i18n/index.js';
import { weightLog, histoJours } from '../store/stats.js';
import { objectifs } from '../store/journal.js';
import { aujourdhuiBxl, ajouterJours } from '../store/plans-par-date.js';
import { musclesParJour } from '../services/muscles-jour.js';
import { Entete } from './Entete.jsx';
import { useRetour } from '../services/retour.js';
import '../styles/stats-avancees.css';

// ============================================================
// STATISTIQUES AVANCEES - l'avantage Premium annonce par BelFit+.
//
// Regle du 7/08 (Raci) : zero doublon avec la page Stats gratuite.
// Le gratuit trace deja la courbe de poids, les barres de calories
// et le record par exercice ; les rejouer ici ne valait pas un
// abonnement. Cette page fait donc ce que le gratuit NE PEUT PAS
// faire : CROISER les donnees. Ce que tu manges face a ce que tu
// peses donne ton metabolisme reel, mesure - pas la formule de
// l'onboarding - et une projection datee du poids. Tout vient de
// ce que l'application enregistre deja (weightLog, histoJours,
// muscleLog) : les chiffres existent des le premier jour.
//
// Presentation << verdict d'abord >> : la synthese graphite repond
// a << est-ce que ca marche ? >>, les cartes expliquent ensuite.
// ============================================================

export const statsAvOuvertes = signal(false);

const PERIODES = [
  { k: 7, lb: '7 j' }, { k: 30, lb: '30 j' },
  { k: 90, lb: '90 j' }, { k: 0, lb: 'Tout' },
];

/** Bornes de la periode. 0 = depuis le premier jour connu. */
function depuis(jours) {
  if (!jours) return '0000-01-01';
  return ajouterJours(aujourdhuiBxl(), -jours + 1);
}

/** Moyenne mobile : le poids oscille d'un kilo d'un jour a l'autre,
 *  seule la moyenne lissee laisse voir une tendance. */
function lissage(pts, fenetre = 7) {
  return pts.map((p, i) => {
    const deb = Math.max(0, i - fenetre + 1);
    const tranche = pts.slice(deb, i + 1);
    const m = tranche.reduce((s, x) => s + x.kg, 0) / tranche.length;
    return { iso: p.iso, kg: m };
  });
}

/** Pente en kg par semaine, par moindres carres sur les points
 *  lisses. Une simple difference entre le premier et le dernier
 *  point serait a la merci d'une seule pesee aberrante. */
function penteHebdo(pts) {
  if (pts.length < 3) return null;
  const t0 = new Date(pts[0].iso).getTime();
  const xs = pts.map(p => (new Date(p.iso).getTime() - t0) / 86400000);
  const ys = pts.map(p => p.kg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  if (!den) return null;
  return (num / den) * 7;
}

export function StatsAvancees({ fermer }) {
  const [periode, setPeriode] = useState(30);
  useRetour(true, fermer);   // retour Android = fermer cet ecran, pas changer d'onglet dessous
  const borne = depuis(periode);

  // --- Poids ---
  const pesees = weightLog.value
    .filter(p => p.iso >= borne)
    // Le store v2 ecrit { iso, kg } ; les pesees importees de la v1
    // portent { iso, weight }. Ne lire que p.weight donnait kg
    // undefined sur toute donnee v2 : la courbe, la pente hebdo et
    // l'ecart de poids tombaient a NaN, et le SVG refusait de tracer.
    // Stats.jsx tolerait deja les deux formes, pas celui-ci.
    .map(p => ({ iso: p.iso, kg: parseFloat(p.kg ?? p.weight) || 0 }))
    .sort((a, b) => a.iso.localeCompare(b.iso));
  const lisse = lissage(pesees);
  const pente = penteHebdo(lisse);
  const ecartPoids = pesees.length >= 2
    ? pesees[pesees.length - 1].kg - pesees[0].kg : null;

  // --- Journees ---
  const jours = Object.entries(histoJours.value)
    .filter(([d]) => d >= borne)
    .sort((a, b) => a[0].localeCompare(b[0]));
  const nbJours = jours.length;
  const moy = (cle) => nbJours
    ? Math.round(jours.reduce((s, [, v]) => s + (v[cle] || 0), 0) / nbJours) : 0;
  const moyKcal = moy('kcal');
  const obj = objectifs.value;

  // --- Regularite ---
  const total = periode || Math.max(nbJours, 1);
  let serie = 0, meilleure = 0;
  const setJours = new Set(jours.map(j => j[0]));
  const aujBxl = aujourdhuiBxl();
  for (let i = 0; i < (periode || 365); i++) {
    if (setJours.has(ajouterJours(aujBxl, -i))) { serie++; meilleure = Math.max(meilleure, serie); }
    else serie = 0;
  }

  // --- Metabolisme reel : le croisement que le gratuit ne fait pas.
  // Bilan energetique : 1 kg de masse ~ 7700 kcal. Si tu manges
  // moyKcal par jour et que ton poids bouge de `pente` kg/semaine,
  // ton corps depense moyKcal - pente*7700/7 par jour. C'est le
  // TDEE mesure sur TES donnees, pas une formule de population.
  // Fiabilite minimale : 7 journees renseignees ET 5 pesees sur la
  // periode, sinon le calcul repose sur du bruit.
  const tdeeReel = (nbJours >= 7 && pesees.length >= 5 && pente !== null && moyKcal)
    ? Math.round(moyKcal - (pente * 7700) / 7) : null;
  const cibleKcalObj = obj && obj.kcal ? obj.kcal : null;

  // --- Projection : ou serait le poids dans 30 jours a ce rythme.
  const dernierPoids = pesees.length ? pesees[pesees.length - 1].kg : null;
  let projection = null;
  if (dernierPoids !== null && pente !== null && Math.abs(pente) >= 0.05) {
    const dCible = new Date(ajouterJours(aujourdhuiBxl(), 30) + 'T12:00:00Z');
    projection = {
      kg: dernierPoids + (pente / 7) * 30,
      date: dCible.toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', timeZone: 'UTC' }),
    };
  }

  // --- Muscles ---
  const muscles = {};
  const journal = musclesParJour();
  Object.entries(journal).forEach(([d, vals]) => {
    if (d < borne) return;
    (Array.isArray(vals) ? vals : []).forEach(m => {
      if (m === 'repos') return;
      muscles[m] = (muscles[m] || 0) + 1;
    });
  });
  const topMuscle = Object.entries(muscles).sort((a, b) => b[1] - a[1])[0];
  const seances = Object.keys(journal)
    .filter(d => d >= borne && (journal[d] || []).some(v => v !== 'repos')).length;

  const assez = nbJours > 0 || pesees.length > 0;

  return (
    <div class="pg-statsav">
      <Entete retour={fermer} />
      <div class="sa-corps">
        {/* Une seule fleche, celle de l'en-tete : deux boutons pour la
            meme action ne donnent pas un choix, ils font hesiter.
            Celle-ci recevait `true` au lieu d'une fonction et
            retombait sur le repli « aller au Journal » (Raci, 7/08). */}
        <h1 class="sa-titre">Statistiques avancées</h1>
        <p class="sa-sous">Ta progression sur la durée, pas seulement cette semaine.</p>

        <div class="sa-periodes">
          {PERIODES.map(p => (
            <button key={p.k} class={periode === p.k ? 'on' : ''}
                    onClick={() => setPeriode(p.k)}>{p.lb}</button>
          ))}
        </div>

        {!assez && (
          <div class="sa-vide">
            Pas encore assez de données sur cette période. Renseigne tes repas
            et tes pesées : les tendances apparaissent au bout de quelques jours.
          </div>
        )}

        {assez && (
          <>
            {/* Le verdict : un chiffre et une phrase. */}
            <section class="sa-synthese">
              <p class="sa-lb">
                {periode ? `Sur ${periode} jours` : 'Depuis le début'}
              </p>
              <p class="sa-gros">
                {ecartPoids === null ? '—'
                  : (ecartPoids > 0 ? '+' : '') + ecartPoids.toFixed(1) + ' kg'}
              </p>
              <p class="sa-phrase">
                {pente === null
                  ? 'Ajoute quelques pesées pour voir ta tendance.'
                  : Math.abs(pente) < 0.05
                    ? 'Ton poids est stable.'
                    : `Tu ${pente < 0 ? 'descends' : 'montes'} de ${Math.abs(pente * 1000).toFixed(0)} g par semaine, régulièrement.`}
              </p>
              <div class="sa-grille">
                <div><b>{moyKcal || '—'}</b><span>kcal / jour en moyenne</span></div>
                <div><b>{nbJours}{periode ? ` / ${total}` : ''}</b><span>jours renseignés</span></div>
                <div><b>{seances}</b><span>séances</span></div>
                <div><b>{meilleure}</b><span>jours d'affilée</span></div>
              </div>
            </section>

            {/* METABOLISME REEL — la carte que le gratuit ne peut pas
                offrir : elle croise les repas et les pesées. */}
            <section class="sa-carte">
              <h3>
                <i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3s4.5 4 4.5 8a4.5 4.5 0 01-9 0c0-1.4.6-2.6 1.3-3.6.3 1.1 1 1.9 1.9 1.9 1 0 1.6-.9 1.3-2.2A6 6 0 0012 3z" /></svg></i>
                Ton métabolisme réel
              </h3>
              <p class="sa-cs">Mesuré sur tes repas et tes pesées, pas sur une formule</p>
              {tdeeReel !== null ? (
                <>
                  <div class="sa-tdee">
                    <b>{tdeeReel}</b><span>kcal / jour dépensées</span>
                  </div>
                  <div class="sa-lignes">
                    <div class="sa-ligne"><span class="sa-n">Tu manges en moyenne</span>
                      <span class="sa-v">{moyKcal} kcal</span></div>
                    <div class="sa-ligne"><span class="sa-n">Ton poids évolue de</span>
                      <span class="sa-v">{pente > 0 ? '+' : ''}{(pente * 1000).toFixed(0)} g / sem</span></div>
                    {cibleKcalObj && (
                      <div class="sa-ligne"><span class="sa-n">Ton objectif actuel</span>
                        <span class="sa-v">{cibleKcalObj} kcal</span></div>
                    )}
                  </div>
                  {cibleKcalObj && (
                    <p class="sa-note">
                      {Math.abs(cibleKcalObj - tdeeReel) < 120
                        // 03/10 : c'est l'objectif qui est en maintenance, pas
                        // forcement la personne (elle peut manger moins).
                        ? 'Ton objectif correspond à ta dépense réelle : si tu le tiens, ton poids restera stable.'
                        : cibleKcalObj > tdeeReel
                          ? `Ton objectif est ${cibleKcalObj - tdeeReel} kcal au-dessus de ta dépense : surplus réel d'environ ${Math.round((cibleKcalObj - tdeeReel) / 7700 * 7000)} g par semaine si tu le tiens.`
                          : `Ton objectif est ${tdeeReel - cibleKcalObj} kcal sous ta dépense : déficit réel d'environ ${Math.round((tdeeReel - cibleKcalObj) / 7700 * 7000)} g par semaine si tu le tiens.`}
                    </p>
                  )}
                </>
              ) : (
                <p class="sa-note">
                  Il faut au moins 7 journées renseignées et 5 pesées sur la période
                  pour mesurer ta dépense sans bruit. Continue, ça arrive vite.
                </p>
              )}
            </section>

            {/* PROJECTION — à ce rythme, où tu seras dans 30 jours. */}
            {projection && (
              <section class="sa-carte">
                <h3>
                  <i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 19L19 4M19 4h-6M19 4v6" /></svg></i>
                  À ce rythme
                </h3>
                <p class="sa-cs">Projection sur ta tendance des dernières semaines</p>
                <div class="sa-tdee">
                  <b>{projection.kg.toFixed(1)}</b><span>kg le {projection.date}</span>
                </div>
                <p class="sa-note">
                  Une projection, pas une promesse : elle suppose que ton rythme
                  actuel de {pente > 0 ? '+' : ''}{(pente * 1000).toFixed(0)} g
                  par semaine se maintient.
                </p>
              </section>
            )}

            {topMuscle && (
              <section class="sa-carte">
                <h3>
                  <i aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="16" rx="2.5" /><path d="M3.5 9h17M8 2.5v4M16 2.5v4" /><path d="M8.5 13.5l2 2 4-4" /></svg></i>
                  Régularité
                </h3>
                <p class="sa-cs">Ce que tu as le plus travaillé</p>
                <div class="sa-ligne"><span class="sa-n">Muscle le plus sollicité</span>
                  <span class="sa-v">{topMuscle[0]}</span></div>
                <div class="sa-ligne"><span class="sa-n">Séances sur la période</span>
                  <span class="sa-v">{seances}</span></div>
                <div class="sa-ligne"><span class="sa-n">Plus longue série</span>
                  <span class="sa-v">{meilleure} j</span></div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
