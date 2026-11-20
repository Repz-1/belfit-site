import { GROUPES } from '../store/entrainement.js';
import { nomExo } from '../i18n/exercices.js';
import { tx, locale } from '../i18n/ecrans.js';
import { t } from '../i18n/index.js';
import '../styles/seances.css';

// ==========================================================
// SEANCES ENREGISTREES
// Deux vues : la liste (sous le calendrier du journal, et en plein
// ecran) et le detail d'une seance.
// ==========================================================

const COULEUR = Object.fromEntries(GROUPES.filter(g => g.k !== 'repos').map(g => [g.k, g.c]));
const nomMuscle = (k) => t('mus_' + k);

const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

/** « Aujourd'hui », « Hier », sinon « mar 5 août ». */
function libelleJour(isoJour) {
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  if (isoJour === iso(auj)) return t('today');
  const hier = new Date(auj); hier.setDate(auj.getDate() - 1);
  if (isoJour === iso(hier)) return t('yesterday');
  const p = isoJour.split('-').map(Number);
  const d = new Date(p[0], p[1] - 1, p[2]);
  return `${t('days_short').split('|')[d.getDay()]} ${d.getDate()} ${t('months_min').split('|')[d.getMonth()]}`;
}

/** Une duree se lit en minutes. En dessous, autant le dire franchement. */
function duree(sec) {
  if (!sec || sec < 60) return '< 1';
  return String(Math.round(sec / 60));
}

function heure(ts) {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// L'encart « Seances enregistrees » est supprime le 5/09 (Raci) :
// « je ne veux pas voir ca, je veux voir juste la seance Jour 1 qui
// est en dessous ». Il ouvrait l'onglet S'entrainer sur l'historique,
// avant l'action du jour. Ce qui a ete fait se lit dans le calendrier
// — un jour, sa fiche, « Voir la seance » — et dans Stats.

// L'ecran plein « Toutes les seances » est supprime le 5/09 (Raci) :
// « une fleche pour menu deroulant plutot que me retrouver dans une
// autre page ». La liste se rallonge sur place dans BlocSeances.

// ---------- detail d'une seance ----------
export function DetailSeance({ seance }) {
  if (!seance) return null;
  const s = seance;

  return (
    <div class="pg-seances">
      <div class="sea-tete">
        <h2>{tx(s.titre)}</h2>
        <p>{libelleJour(s.iso)} · {heure(s.ts)}</p>
      </div>

      <div class="det-chiffres">
        <div class="det-case"><b>{duree(s.duree)}</b><span>min</span></div>
        <div class="det-case"><b>{s.nbSeries}</b><span>{t('sets')}</span></div>
        <div class="det-case"><b>{s.tonnage.toLocaleString(locale())}</b><span>kg</span></div>
      </div>

      {s.exos.map((e, i) => (
        <div class="det-exo" key={i}>
          <div class="det-exo-tete">
            <span class="det-exo-nom">{nomExo(e.nom)}</span>
            {e.mKey && COULEUR[e.mKey] && (
              <span class="det-exo-mus">
                <i class="dot" style={{ background: COULEUR[e.mKey] }} />{nomMuscle(e.mKey)}
              </span>
            )}
          </div>
          {e.sets && e.sets.length
            ? <div class="det-series">
                {e.sets.map((x, j) => (
                  <span key={j} class={'det-serie' + (s.records.includes(e.nom) ? ' pr' : '')}>
                    {x.w === '' ? '—' : x.w} × {x.r === '' ? '—' : x.r}
                    {(x.dw || x.dr) ? ` → ${tx('dégr.')} ${x.dw || '—'} × ${x.dr || '—'}` : ''}
                  </span>
                ))}
              </div>
            /* Un exercice coche sans charge doit rester visible :
               sinon un gainage disparait de sa propre seance. */
            : <div class="det-exo-vide">{t('sea_no_load')}</div>}
        </div>
      ))}

    </div>
  );
}
