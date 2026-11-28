// ============================================================
// MES SEANCES PASSEES (28/11, Raci) — rubrique en tete de Stats
// pour les clients du coaching entrainement.
//
// Carte (maquette « 1 », validee 28/11) : carte blanche, accents
// bleus. La semaine en cours : seances notees (tuile bleue pleine)
// puis seances du programme pas encore faites (pointilles).
// Une ligne notee se deplie sur place : charges et reps de chaque exercice
// (28/11 : plus de page « Comparer » plein ecran, a la demande de Raci).
// Remplace « Historique par seance » (Stats) et le lien « Mes seances
// passees » de la page seance (mal place, dit Raci 28/11).
// Rien n'incite a monter les poids : les chiffres sont juste poses
// cote a cote (regle du 13/11).
// ============================================================
import { useState } from 'preact/hooks';
import { entrainementCoach } from './BelfitPlus.jsx';
import { carnetCoach } from '../store/carnet-coach.js';
import { kgTexte } from '../data/charge-coach.js';
import { t, langue } from '../i18n/index.js';
import '../styles/coach-entrainement.css';

const isoJ = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const lundiDe = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const enDate = (iso) => { const [a, m, j] = iso.split('-').map(Number); return new Date(a, m - 1, j); };
const loc = () => ({ en: 'en-GB', nl: 'nl-BE' }[langue.value] || 'fr-BE');
const maj = (s) => s.charAt(0).toUpperCase() + s.slice(1);
/** « Jeu. 27 » */
export function jourCourt(iso) {
  const d = enDate(iso);
  const j = d.toLocaleDateString(loc(), { weekday: 'short' }).replace(/\.$/, '');
  return maj(j) + '. ' + d.getDate();
}

/** Toutes les seances notees, de la plus ancienne a la plus recente : [{ cle, idSeance, ...entree }]. */
function entreesTriees() {
  const c = carnetCoach.value || {};
  return Object.keys(c).filter((k) => c[k] && c[k].date).sort()
    .map((k) => ({ cle: k, idSeance: k.split('|')[1], ...c[k] }));
}
/** Series faites / prevues d'une entree. */
function compte(e) {
  let f = 0, n = 0;
  Object.values(e.exos || {}).forEach((x) => {
    const l = Array.isArray(x.series) ? x.series : (x.faites || []).map((fait) => ({ fait }));
    n += l.length; f += l.filter((y) => y && y.fait).length;
  });
  return { f, n };
}

/** Texte d'une serie : « 50 kg × 9 », « 12 reps », « faite » ; { pas } si non faite. */
function texteSerie(y, type) {
  if (!y) return null;
  if (!y.fait) return { pas: true };
  const kgT = type !== 'corps' && y.kg > 0 ? kgTexte(y.kg) + ' kg' : '';
  const r = y.reps > 0 ? String(y.reps) : '';
  return { txt: kgT && r ? kgT + ' × ' + r : (kgT || (r ? r + ' reps' : t('ce_pp_faite'))) };
}
/** Exercices d'une entree, dans l'ordre du programme : [{ id, nom, type, series }]. */
function exosDe(e) {
  const ent = entrainementCoach.value;
  const sp = (ent && ent.seances || []).find((s) => s.id === e.idSeance);
  const ids = sp ? sp.exos.map((x) => x.id).filter((id) => e.exos && e.exos[id]) : Object.keys(e.exos || {});
  return ids.map((id) => {
    const x = e.exos[id]; const d = sp && sp.exos.find((y) => y.id === id);
    return { id, nom: x.nom, type: d ? d.type : '', series: Array.isArray(x.series) ? x.series : [] };
  });
}

/** Une seance notee : une ligne bleue (jour, nom, series faites). La toucher
 *  deplie, juste dessous, chaque exercice avec ses charges et ses reps.
 *  28/11 (4e version, Raci) : plus de « Comparer » ni de page plein ecran. */
function LigneSeance({ e, libJour, ouverte, basculer }) {
  const c = compte(e);
  const dd = enDate(e.date);
  return (
    <div class={'ce-pp-bloc' + (ouverte ? ' ouvert' : '')}>
      <button type="button" class="ce-pp-tuile on" aria-expanded={ouverte} onClick={basculer}>
        <span class="ce-pp-date"><small>{libJour}</small><b>{dd.getDate()}</b></span>
        <span class="ce-pp-corps">
          <b>{e.seance}</b>
          {c.n > 0 && <span class="ce-pp-j">✓ {t('ce_pp_series', { f: c.f, n: c.n })}</span>}
        </span>
        <span class="ce-pp-fl" aria-hidden="true">›</span>
      </button>
      {ouverte && (
        <div class="ce-pp-detail">
          {exosDe(e).map((x) => (
            <div class="ce-pp-exo" key={x.id}>
              <b>{x.nom}</b>
              <div class="ce-pp-series">
                {x.series.map((y, k) => {
                  const v = texteSerie(y, x.type);
                  return v && v.pas
                    ? <span key={k} class="ce-pp-s pas">{t('ce_pp_pasfaite')}</span>
                    : <span key={k} class="ce-pp-s">{v ? v.txt : '—'}</span>;
                })}
              </div>
              {e.exos[x.id] && e.exos[x.id].note && <p class="ce-pp-note"><b>{t('ce_pp_note')}</b> {e.exos[x.id].note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CarteSeancesPassees() {
  const [ouvertes, setOuvertes] = useState(() => new Set());
  const [avant, setAvant] = useState(false);
  const ent = entrainementCoach.value;
  const prevues = ent && Array.isArray(ent.seances) ? ent.seances : [];
  if (!prevues.length) return null;
  const basculer = (cle) => setOuvertes((o) => { const n = new Set(o); if (n.has(cle)) n.delete(cle); else n.add(cle); return n; });
  const toutes = entreesTriees();
  const lundi = lundiDe(new Date());
  const l0 = isoJ(lundi);
  const auj = isoJ(new Date());
  const semaine = toutes.filter((e) => e.date >= l0);
  const anciennes = toutes.filter((e) => e.date < l0).reverse();
  const faitesIds = new Set(semaine.map((e) => e.idSeance));
  const restantes = prevues.filter((s) => !faitesIds.has(s.id));
  // 28/11 : la semaine entiere d'un coup d'oeil, un jour par ligne. Jour note =
  // ligne bleue (repliee) ; jour passe sans seance = « Repos » ; aujourd'hui entoure.
  const jours = Array.from({ length: 7 }, (_, k) => { const d = new Date(lundi); d.setDate(d.getDate() + k); return isoJ(d); });
  const dim = enDate(jours[6]);
  const plage = lundi.getDate() + (lundi.getMonth() !== dim.getMonth() ? ' ' + lundi.toLocaleDateString(loc(), { month: 'short' }) : '')
    + ' – ' + dim.getDate() + ' ' + dim.toLocaleDateString(loc(), { month: 'short' });
  const nomJ = (iso) => maj(enDate(iso).toLocaleDateString(loc(), { weekday: 'short' }).replace(/\.$/, '')) + '.';
  const nFaites = semaine.length;
  return (
    <div class="ce-pp ce-pp--semaine">
      <div class="ce-pp-tete">
        <h2>{t('ce_pp_titre')}</h2>
        <span class="ce-pp-plage">{plage}</span>
      </div>
      <div class="ce-pp-compte">
        <span class="ce-pp-gros">{nFaites}<span>/{prevues.length}</span></span>
        <span class="ce-pp-legende">{t('ce_pp_cette_semaine')}</span>
      </div>
      <div class="ce-pp-barre" aria-hidden="true">
        {prevues.map((s, k) => <i key={s.id} class={k < nFaites ? 'on' : ''} />)}
      </div>
      <div class="ce-pp-jours">
        {jours.map((j) => {
          const du = semaine.filter((e) => e.date === j);
          const dd = enDate(j);
          if (du.length) {
            return du.map((e) => <LigneSeance key={e.cle} e={e} libJour={j === auj ? t('ce_pp_aujourdhui') : nomJ(j)}
              ouverte={ouvertes.has(e.cle)} basculer={() => basculer(e.cle)} />);
          }
          if (j === auj) {
            return (
              <div class="ce-pp-auj" key={j}>
                <span class="ce-pp-date"><small>{t('ce_pp_aujourdhui')}</small><b>{dd.getDate()}</b></span>
                <span class="ce-pp-rien">{t('ce_pp_rien')}</span>
              </div>
            );
          }
          return (
            <div class="ce-pp-vide" key={j}>
              <span class="ce-pp-date-l">{nomJ(j)} {dd.getDate()}</span>
              <span>{j < auj ? t('ce_pp_repos') : '—'}</span>
            </div>
          );
        })}
      </div>
      {restantes.length > 0 && (
        <div class="ce-pp-tuile afaire">
          <span aria-hidden="true" class="ce-pp-horloge">◷</span>
          <span><b>{t('ce_pp_encore')}</b> {restantes.map((s) => s.nom).join(', ')}</span>
        </div>
      )}
      {/* Les semaines d'avant, depliables de la meme facon. */}
      {anciennes.length > 0 && (
        <button type="button" class="ce-pp-tout" aria-expanded={avant} onClick={() => setAvant((v) => !v)}>
          {avant ? t('ce_pp_masquer') : t('ce_pp_tout')}
        </button>
      )}
      {avant && (
        <div class="ce-pp-jours ce-pp-avant">
          {anciennes.map((e) => <LigneSeance key={e.cle} e={e} libJour={nomJ(e.date)}
            ouverte={ouvertes.has(e.cle)} basculer={() => basculer(e.cle)} />)}
        </div>
      )}
    </div>
  );
}
