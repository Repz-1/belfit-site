// ============================================================
// MES SEANCES PASSEES (28/11, Raci) — rubrique en tete de Stats
// pour les clients du coaching entrainement.
//
// Carte (maquette « 1 », validee 28/11) : carte blanche, accents
// bleus. La semaine en cours : seances notees (tuile bleue pleine)
// puis seances du programme pas encore faites (pointilles).
// Une tuile notee ouvre la page plein ecran de CETTE seance :
// serie par serie, a cote de la meme seance la fois d'avant.
// Remplace « Historique par seance » (Stats) et le lien « Mes seances
// passees » de la page seance (mal place, dit Raci 28/11).
// Rien n'incite a monter les poids : les chiffres sont juste poses
// cote a cote (regle du 13/11).
// ============================================================
import { useState, useEffect, useRef } from 'preact/hooks';
import { createPortal } from 'preact/compat';
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
/** « Jeudi 27 novembre » */
const jourLong = (iso) => maj(enDate(iso).toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' }));

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

export function CarteSeancesPassees() {
  const [ouverte, setOuverte] = useState(null);
  const ent = entrainementCoach.value;
  const prevues = ent && Array.isArray(ent.seances) ? ent.seances : [];
  if (!prevues.length) return null;
  const toutes = entreesTriees();
  const lundi = lundiDe(new Date());
  const l0 = isoJ(lundi);
  const auj = isoJ(new Date());
  const semaine = toutes.filter((e) => e.date >= l0);
  const faitesIds = new Set(semaine.map((e) => e.idSeance));
  const restantes = prevues.filter((s) => !faitesIds.has(s.id));
  // 28/11 (2e version, Raci) : la semaine entiere d'un coup d'oeil,
  // un jour par ligne. Jour note = grosse ligne bleue ; jour passe
  // sans seance = « Repos » en fin ; aujourd'hui entoure de bleu.
  const jours = Array.from({ length: 7 }, (_, k) => { const d = new Date(lundi); d.setDate(d.getDate() + k); return isoJ(d); });
  const dim = enDate(jours[6]);
  const plage = lundi.getDate() + (lundi.getMonth() !== dim.getMonth() ? ' ' + lundi.toLocaleDateString(loc(), { month: 'short' }) : '')
    + ' – ' + dim.getDate() + ' ' + dim.toLocaleDateString(loc(), { month: 'short' });
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
          const nomJ = maj(dd.toLocaleDateString(loc(), { weekday: 'short' }).replace(/\.$/, '')) + '.';
          if (du.length) {
            return du.map((e) => {
              const c = compte(e);
              // 28/11 (3e version, Raci : « je la vois pas sans toucher ») :
              // charges et repetitions de chaque exercice visibles sous la seance.
              return (
                <div class="ce-pp-bloc" key={e.cle}>
                  <button type="button" class="ce-pp-tuile on" onClick={() => setOuverte(e.cle)}>
                    <span class="ce-pp-date"><small>{j === auj ? t('ce_pp_aujourdhui') : nomJ}</small><b>{dd.getDate()}</b></span>
                    <span class="ce-pp-corps">
                      <b>{e.seance}</b>
                      {c.n > 0 && <span class="ce-pp-j">✓ {t('ce_pp_series', { f: c.f, n: c.n })}</span>}
                    </span>
                    <span class="ce-pp-cmp">{t('ce_pp_comparer')} ›</span>
                  </button>
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
                      </div>
                    ))}
                  </div>
                </div>
              );
            });
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
              <span class="ce-pp-date-l">{nomJ} {dd.getDate()}</span>
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
      {toutes.length > 0 && (
        <button type="button" class="ce-pp-tout" onClick={() => setOuverte(toutes[toutes.length - 1].cle)}>
          {t('ce_pp_tout')}
        </button>
      )}
      {ouverte && <PageSeancePassee cleDepart={ouverte} fermer={() => setOuverte(null)} />}
    </div>
  );
}

/** Page plein ecran : une seance notee, serie par serie, a cote de la fois d'avant. */
function PageSeancePassee({ cleDepart, fermer }) {
  const [cle, setCle] = useState(cleDepart);
  const pastilles = useRef(null);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') fermer(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);
  // La pastille choisie reste visible (la plus recente est a droite).
  useEffect(() => {
    const on = pastilles.current && pastilles.current.querySelector('.on');
    if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [cle]);
  const toutes = entreesTriees();
  const i = toutes.findIndex((e) => e.cle === cle);
  const e = toutes[i];
  if (!e) return null;
  // La fois d'avant = la meme seance du programme, notee plus tot.
  const avant = toutes.slice(0, i).reverse().find((x) => x.idSeance === e.idSeance);
  const ent = entrainementCoach.value;
  const sp = (ent && ent.seances || []).find((s) => s.id === e.idSeance);
  // Ordre du programme si la seance existe encore, sinon celui du carnet.
  const ids = sp ? sp.exos.map((x) => x.id).filter((id) => e.exos && e.exos[id]) : Object.keys(e.exos || {});
  const typeDe = (id) => { const x = sp && sp.exos.find((y) => y.id === id); return x ? x.type : ''; };
  const c = compte(e);
  // 28/11 : ni charge ni reps notees -> « faite » (avant : « ✓ ✓ »).
  const val = (x, k, type) => texteSerie(x && Array.isArray(x.series) ? x.series[k] : null, type);
  return createPortal(
    <div class="ce-histo ce-ppp" role="dialog" aria-label={e.seance}>
      <div class="ce-ppp-tete">
        <button type="button" class="ce-ppp-retour" onClick={fermer} aria-label={t('ce_retour')}>‹</button>
        <div>
          <p class="ce-ppp-titre">{e.seance}</p>
          <p class="ce-ppp-sous">{jourLong(e.date)}{c.n > 0 ? ' · ' + t('ce_pp_series', { f: c.f, n: c.n }) : ''}</p>
        </div>
      </div>
      <div class="ce-ppp-pastilles" ref={pastilles}>
        {toutes.map((x) => (
          <button type="button" key={x.cle} class={x.cle === cle ? 'on' : ''} onClick={() => setCle(x.cle)}>{jourCourt(x.date)}</button>
        ))}
      </div>
      {ids.map((id) => {
        const x = e.exos[id]; const xa = avant && avant.exos && avant.exos[id];
        const type = typeDe(id);
        const n = Math.max((x.series || []).length, (xa && xa.series || []).length);
        return (
          <section class="ce-ppp-carte" key={id}>
            <b class="ce-ppp-nom">{x.nom}</b>
            <div class="ce-ppp-l ce-ppp-th">
              <span>{t('ce_pp_serie')}</span>
              <span>{avant ? jourCourt(avant.date) : ''}</span>
              <span class="ce-ppp-moi">{jourCourt(e.date)}</span>
            </div>
            {Array.from({ length: n }, (_, k) => {
              const a = val(xa, k, type); const m = val(x, k, type);
              return (
                <div class="ce-ppp-l" key={k}>
                  <span class="ce-ppp-n">{k + 1}</span>
                  <span class="ce-ppp-avant">{a ? (a.pas ? t('ce_pp_pasfaite') : a.txt) : ''}</span>
                  <span class={m && !m.pas ? 'ce-ppp-fait' : 'ce-ppp-pas'}>{m ? (m.pas ? t('ce_pp_pasfaite') : <>{m.txt} <i>✓</i></>) : '—'}</span>
                </div>
              );
            })}
            {x.note && <p class="ce-ppp-note"><b>{t('ce_pp_note')}</b> {x.note}</p>}
          </section>
        );
      })}
    </div>,
    document.body,
  );
}
