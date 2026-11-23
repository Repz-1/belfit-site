// ============================================================
// STATS — ENTRAINEMENT DU COACH (22/11, Raci).
// La carte Entrainement des Stats ne compte plus QUE les seances du
// programme envoye par le coach (decision de Raci : les seances libres
// de S'entrainer n'y vont plus ; elles restent enregistrees sur le compte).
// Sans programme coach : carte floutee, « Non disponible pour ton compte ».
// « Historique par seance » : la meme seance, semaine apres semaine, poids
// serie par serie — sans fleche ni record (on n'incite pas a monter).
// ============================================================
import { useState, useEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { entrainementCoach } from './BelfitPlus.jsx';
import { carnetCoach } from '../store/carnet-coach.js';
import { choisirEspaceJour } from './CoachEntrainement.jsx';
import { allerOnglet } from './BottomNav.jsx';
import { kgTexte, repsTexte } from '../data/charge-coach.js';
import { t } from '../i18n/index.js';
import '../styles/coach-entrainement.css';

const isoJ = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const lundiDe = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };

/** Repetitions a compter pour une serie : premier nombre de la cible (« 8-10 » -> 8), 10 sinon. */
function repsDe(r) { const m = /\d+/.exec(String(r || '')); return m ? +m[0] : 10; }

/** Index des exercices du programme : id -> { reps, type }. */
function indexProgramme(ent) {
  const ix = {};
  (ent && ent.seances || []).forEach((s) => (s.exos || []).forEach((x) => { ix[x.id] = x; }));
  return ix;
}

/** Kg souleves d'une seance notee : poids x reps des series cochees. */
export function tonnageEntree(e, ix) {
  let kg = 0;
  Object.keys(e.exos || {}).forEach((id) => {
    const x = e.exos[id] || {}; const reps = repsDe(x.reps || (ix[id] && ix[id].reps));
    if (Array.isArray(x.series)) x.series.forEach((y) => { if (y && y.fait && y.kg > 0) kg += y.kg * reps; });
    else if (x.kg > 0) kg += x.kg * reps * (Array.isArray(x.faites) ? x.faites.filter(Boolean).length : 0);
  });
  return kg;
}

/** Jours (AAAA-MM-JJ) ou une seance du coach a ete notee. */
export function joursCoach() {
  const s = new Set();
  Object.values(carnetCoach.value || {}).forEach((e) => { if (e && e.date) s.add(e.date); });
  return s;
}

export function CarteEntrainementCoach() {
  const [histo, setHisto] = useState(false);
  const ent = entrainementCoach.value;
  const carnet = carnetCoach.value || {};
  const entrees = Object.values(carnet).filter((e) => e && e.date);
  const ix = indexProgramme(ent);
  const l0 = lundiDe(new Date());
  const sem = Array.from({ length: 8 }, (_, k) => {
    const debut = new Date(l0); debut.setDate(l0.getDate() - 7 * (7 - k));
    const fin = new Date(debut); fin.setDate(debut.getDate() + 7);
    const liste = entrees.filter((e) => e.date >= isoJ(debut) && e.date < isoJ(fin));
    return { cle: isoJ(debut), lb: debut.getDate() + '/' + (debut.getMonth() + 1), n: liste.length,
      kg: liste.reduce((a, e) => a + tonnageEntree(e, ix), 0) };
  });
  const cette = sem[7];
  const maxKg = Math.max(1, ...sem.map((x) => x.kg));
  const prevues = ent && ent.seances ? ent.seances.length : 0;
  const ouvrir = () => { choisirEspaceJour('ent'); allerOnglet('journal'); };

  if (!ent || !prevues) {
    return (
      <div class="stat-card acc-blue ce-st-bloque">
        <div class="ce-flou" aria-hidden="true">
          <h2><span>{t('st_train')}</span></h2>
          <div class="stat-summary"><div class="stat-box"><div class="sb-val">3/4</div></div><div class="stat-box"><div class="sb-val">12 480 kg</div></div></div>
          <div class="chart-zone"><div class="chart">{[30, 45, 40, 60, 55, 70, 66, 80].map((h, i) => <div class="chart-bar-wrap" key={i}><div class="chart-bar charge" style={{ height: h + 'px' }} /></div>)}</div></div>
        </div>
        <div class="ce-voile ce-voile-st"><div class="ce-voile-carte" role="status">
          <span class="ce-cadenas" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg></span>
          <p class="ce-voile-t">{t('ce_indispo_t')}</p>
          <p class="ce-voile-txt">{t('ce_st_indispo')}</p>
        </div></div>
      </div>
    );
  }

  return (
    <div class="stat-card acc-blue">
      <h2><span>{t('st_train')}</span></h2>
      <div class="card-sub">{t('ce_st_sub')}</div>
      {entrees.length ? (
        <>
          <div class="stat-summary">
            <div class="stat-box"><div class="sb-val">{cette.n}/{prevues}</div><div class="sb-lbl">{t('ce_st_semaine')}</div></div>
            <div class="stat-box"><div class="sb-val">{Math.round(cette.kg).toLocaleString('fr-BE')} kg</div><div class="sb-lbl">{t('ce_st_kg')}</div></div>
          </div>
          <div class="chart-zone"><div class="chart">
            {sem.map((x) => (
              <div class="chart-bar-wrap" key={x.cle}>
                <div class="chart-bar charge" style={{ height: Math.max(3, Math.round((x.kg / maxKg) * 88)) + 'px' }} />
                <div class="chart-day">{x.lb}</div>
              </div>
            ))}
          </div></div>
          <button type="button" class="ce-st-lien" onClick={() => setHisto(true)}>{t('ce_st_histo')} <span aria-hidden="true">›</span></button>
        </>
      ) : (
        <div class="ce-st-vide">
          <p>{t('ce_st_vide')}</p>
          <button type="button" class="ce-st-lien" onClick={ouvrir}>{t('ce_st_cta')} <span aria-hidden="true">›</span></button>
        </div>
      )}
      {histo && <HistoriqueSeances fermer={() => setHisto(false)} />}
    </div>
  );
}

/** Page plein ecran : une seance, ses exercices, 4 dernieres fois cote a cote. */
function HistoriqueSeances({ fermer }) {
  const ent = entrainementCoach.value;
  const seances = ent && ent.seances || [];
  const [choix, setChoix] = useState(seances[0] && seances[0].id);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') fermer(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);
  const seance = seances.find((s) => s.id === choix) || seances[0];
  const carnet = carnetCoach.value || {};
  // Les 4 dernieres fois ou CETTE seance a ete notee (cle « date|idSeance »).
  const fois = Object.keys(carnet).filter((k) => seance && k.endsWith('|' + seance.id)).sort().reverse().slice(0, 4).map((k) => carnet[k]);
  const dateCourte = (d) => { const [, m, j] = d.split('-'); return (+j) + '/' + (+m); };
  const val = (e, x, i) => {
    const v = e && e.exos && e.exos[x.id];
    if (!v) return '—';
    if (Array.isArray(v.series)) {
      const y = v.series[i]; if (!y) return '—';
      if (x.type === 'corps') return y.fait ? '✓' : '—';
      return y.kg > 0 ? kgTexte(y.kg) : (y.fait ? '✓' : '—');
    }
    return i === 0 && v.kg ? kgTexte(v.kg) : '—';  // ancien format : un seul poids
  };
  return createPortal(
    <div class="ce-histo" role="dialog" aria-label={t('ce_st_histo')}>
      <div class="ce-histo-tete">
        <button type="button" class="ce-histo-retour" onClick={fermer}>‹ {t('ce_retour')}</button>
        <p class="ce-h">{t('ce_st_histo')}</p>
      </div>
      <div class="ce-seances" role="tablist">
        {seances.map((s) => (
          <button type="button" role="tab" aria-selected={s.id === seance.id} class={s.id === seance.id ? 'on' : ''} onClick={() => setChoix(s.id)}><b>{s.nom}</b></button>
        ))}
      </div>
      {!fois.length && <p class="ce-sous">{t('ce_histo_vide')}</p>}
      {fois.length > 0 && seance.exos.map((x) => {
        const n = Math.max(+x.series || 1, ...fois.map((e) => (e.exos && e.exos[x.id] && e.exos[x.id].series || []).length));
        return (
          <section class="ce-carte" key={x.id}>
            <header><div><b>{x.nom}</b><span>{t('ce_series', { n: x.series, r: repsTexte(x.reps, x.series) })}{x.type !== 'corps' ? ' · kg' : ''}</span></div></header>
            <table class="ce-tab">
              <thead><tr><th />{fois.map((e) => <th key={e.date}>{dateCourte(e.date)}</th>)}</tr></thead>
              <tbody>
                {Array.from({ length: n }, (_, i) => (
                  <tr key={i}><td class="ce-tab-s">{t('ce_serie_n', { n: i + 1 })}</td>{fois.map((e) => <td key={e.date}>{val(e, x, i)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>,
    document.body,
  );
}
