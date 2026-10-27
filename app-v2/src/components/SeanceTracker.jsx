import { useState } from 'preact/hooks';
import { signal, effect } from '@preact/signals';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';
import { t } from '../i18n/index.js';
import { aujourdhuiBxl } from '../store/plans-par-date.js';

// ============================================================
// SUIVI DE SEANCE v2 — journal d'exercices du jour.
// setLog : { '2026-07-17': [{ex:'Développé couché', series:[{kg:80,reps:8},...]}] }
// Local-first + cloud, comme le reste.
// ============================================================

export const setLog = signal({});
let uidS = null, pretS = false;

effect(() => {
  const u = identite.value;
  if (!u) { pretS = false; return; }
  if (u === uidS && pretS) return;
  uidS = u; pretS = false;
  chargerDonnees(u).then(d => {
    if (uidS !== u) return;
    setLog.value = (d && d.setLog) ? d.setLog : {};
    pretS = true;
  });
});

effect(() => {
  const log = setLog.value;
  const u = identite.value;
  if (!u || !pretS) return;
  sauvegarder(u, { setLog: log });
});

const isoAuj = () => aujourdhuiBxl();

function majJour(fn) {
  const d = isoAuj();
  const log = { ...setLog.value };
  log[d] = fn([...(log[d] || [])]);
  if (!log[d].length) delete log[d];
  setLog.value = log;
}

export function SeanceTracker() {
  const [nomEx, setNomEx] = useState('');
  const exos = setLog.value[isoAuj()] || [];

  const ajouterExo = (e) => {
    e.preventDefault();
    const nom = nomEx.trim();
    if (!nom) return;
    majJour(l => [...l, { ex: nom, series: [] }]);
    setNomEx('');
  };
  const ajouterSerie = (i) => majJour(l => l.map((x, j) => {
    if (j !== i) return x;
    const der = x.series[x.series.length - 1] || { kg: 20, reps: 10 };
    return { ...x, series: [...x.series, { ...der }] };
  }));
  const majSerie = (i, s, champ, val) => majJour(l => l.map((x, j) =>
    j !== i ? x : { ...x, series: x.series.map((se, k) => k !== s ? se : { ...se, [champ]: parseFloat(val) || 0 }) }
  ));
  const supprSerie = (i, s) => majJour(l => l.map((x, j) =>
    j !== i ? x : { ...x, series: x.series.filter((_, k) => k !== s) }
  ).filter(x => x.series.length || j !== i || true));
  const supprExo = (i) => majJour(l => l.filter((_, j) => j !== i));

  return (
    <div class="carte">
      <h3 style={{ margin: '0 0 12px', fontSize: '19px', fontWeight: 800 }}>{t('seance_jour')} 🏋️</h3>

      {exos.map((x, i) => (
        <div class="seance-exo" key={i}>
          <div class="seance-exo-tete">
            <span>{x.ex}</span>
            <button onClick={() => supprExo(i)}>✕</button>
          </div>
          {x.series.map((s, k) => (
            <div class="seance-serie" key={k}>
              <span class="num">{k + 1}</span>
              <input type="number" value={s.kg} onInput={e => majSerie(i, k, 'kg', e.currentTarget.value)} /><span class="u">kg</span>
              <span class="x">×</span>
              <input type="number" value={s.reps} onInput={e => majSerie(i, k, 'reps', e.currentTarget.value)} /><span class="u">reps</span>
              <button onClick={() => supprSerie(i, k)}>✕</button>
            </div>
          ))}
          <button class="seance-add-serie" onClick={() => ajouterSerie(i)}>+ Série</button>
        </div>
      ))}

      <form onSubmit={ajouterExo} class="seance-add-exo">
        <input placeholder={t("ajouter_exercice")} value={nomEx} onInput={e => setNomEx(e.currentTarget.value)} />
        <button type="submit">+</button>
      </form>
    </div>
  );
}
