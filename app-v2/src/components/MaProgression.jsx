import { useState } from 'preact/hooks';
import { retourEntrainer } from './Entrainer.jsx';
import { PhotoExo } from './PhotoExo.jsx';
import { EXERCISES } from '../data/exercices.js';
import { exercicesFaits, historiqueExo } from '../services/historique-exos.js';
import '../styles/ma-progression.css';

// ============================================================
// MA PROGRESSION — Raci, 13/11 (idee 3 : « la courbe par exercice »).
// La liste des exercices deja faits, puis pour chacun la courbe de sa
// meilleure serie sur trois mois et le detail seance par seance.
// Un constat, jamais une consigne : aucune charge n'est proposee.
// ============================================================

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const dateCourte = (iso) => { const [, m, j] = iso.split('-').map(Number); return j + ' ' + MOIS[m - 1]; };
const kg = (w) => String(Math.round(w * 10) / 10).replace('.', ',');
const serieTxt = (s) => (s.w > 0 ? kg(s.w) + ' kg × ' + s.r : s.r + ' reps');

function imgDe(nom, mKey) {
  const ex = (EXERCISES[mKey] || []).find((e) => e.nom === nom);
  return ex ? ex.imgId : null;
}

function isoIlYa(jours) {
  const d = new Date(); d.setDate(d.getDate() - jours);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** Courbe d'une seule serie : ligne 2 px, points de 8 px, toucher = valeur. */
function Courbe({ points, enReps }) {
  const [actif, setActif] = useState(points.length - 1);
  const W = 340, H = 180, G = 36, D = 10, Hh = 12, B = 26;
  const val = (p) => (enReps ? p.meilleure.r : p.meilleure.w);
  const vs = points.map(val);
  let min = Math.min(...vs), max = Math.max(...vs);
  if (min === max) { min = Math.max(0, min - 5); max = max + 5; }
  const marge = (max - min) * 0.15;
  min = Math.max(0, min - marge); max = max + marge;
  const t0 = Date.parse(points[0].iso), t1 = Date.parse(points[points.length - 1].iso);
  const x = (p) => (points.length === 1 || t1 === t0 ? (G + W - D) / 2 : G + ((Date.parse(p.iso) - t0) / (t1 - t0)) * (W - G - D));
  const y = (v) => Hh + (1 - (v - min) / (max - min)) * (H - Hh - B);
  const graduations = [min, (min + max) / 2, max];
  const chemin = points.map((p, i) => (i ? 'L' : 'M') + x(p).toFixed(1) + ' ' + y(val(p)).toFixed(1)).join(' ');
  const a = points[actif];
  return (
    <div class="mp-courbe">
      <div class="mp-valeur" aria-live="polite">
        <b>{a ? serieTxt(a.meilleure) : ''}</b>
        <span>{a ? dateCourte(a.iso) : ''}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={'Meilleure série par séance, ' + points.length + ' séances'}>
        {graduations.map((g, i) => (
          <g key={i}>
            <line x1={G} x2={W - D} y1={y(g)} y2={y(g)} class="mp-grille" />
            <text x={G - 6} y={y(g) + 4} class="mp-axe" text-anchor="end">{Math.round(g)}</text>
          </g>
        ))}
        <text x={G} y={H - 6} class="mp-axe">{dateCourte(points[0].iso)}</text>
        {points.length > 1 && <text x={W - D} y={H - 6} class="mp-axe" text-anchor="end">{dateCourte(points[points.length - 1].iso)}</text>}
        {a && <line x1={x(a)} x2={x(a)} y1={Hh} y2={H - B} class="mp-repere" />}
        {points.length > 1 && <path d={chemin} class="mp-ligne" />}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(p)} cy={y(val(p))} r={i === actif ? 6 : 4.5} class={'mp-point' + (i === actif ? ' actif' : '')} />
            {/* Zone de toucher plus grande que le point. */}
            <circle cx={x(p)} cy={y(val(p))} r="16" class="mp-cible"
              onClick={() => setActif(i)} onPointerEnter={() => setActif(i)} />
          </g>
        ))}
      </svg>
      <p class="mp-legende">{enReps ? 'Répétitions de ta meilleure série' : 'Charge de ta meilleure série (kg)'}, par séance</p>
    </div>
  );
}

function Detail({ o, retour }) {
  const tous = historiqueExo(o.nom);
  const trois = tous.filter((p) => p.iso >= isoIlYa(92));
  const points = trois.length ? trois : tous.slice(-12);
  const enReps = points.every((p) => !p.meilleure.w);
  return (
    <div class="pg-progression">
      <div class="mp-tete">
        <button class="back-btn" onClick={retour}>←&nbsp; Retour</button>
      </div>
      <h1 class="mp-titre">{o.nom}</h1>
      <p class="mp-sous">{tous.length} séance{tous.length > 1 ? 's' : ''}{trois.length && trois.length < tous.length ? ' · courbe des 3 derniers mois' : ''}</p>
      <Courbe points={points} enReps={enReps} />
      <h2 class="mp-h2">Séance par séance</h2>
      <div class="mp-table">
        {tous.slice().reverse().map((p, i) => (
          <div key={i} class="mp-ligne-t">
            <span class="mp-date">{dateCourte(p.iso)}</span>
            <span class="mp-series">{p.sets.map((x, k) => <i key={k}>{serieTxt(x)}</i>)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MaProgression() {
  const [choisi, setChoisi] = useState(null);
  const liste = exercicesFaits();
  if (choisi) {
    const o = liste.find((x) => x.nom === choisi);
    if (o) return <Detail o={o} retour={() => { setChoisi(null); window.scrollTo(0, 0); }} />;
  }
  return (
    <div class="pg-progression">
      <div class="mp-tete">
        <button class="back-btn" onClick={retourEntrainer}>←&nbsp; Retour</button>
      </div>
      <h1 class="mp-titre">Ma progression</h1>
      <p class="mp-sous">Touche un exercice pour voir ta courbe.</p>
      {!liste.length ? (
        <p class="mp-vide">Termine une séance : tes exercices apparaîtront ici, avec ta courbe pour chacun.</p>
      ) : (
        <div class="mp-liste">
          {liste.map((o) => {
            const img = imgDe(o.nom, o.mKey);
            return (
              <button key={o.nom} class="mp-exo" onClick={() => { setChoisi(o.nom); window.scrollTo(0, 0); }}>
                <span class="mp-photo">{img ? <PhotoExo imgId={img} taille={240} /> : null}</span>
                <span class="mp-txt">
                  <b>{o.nom}</b>
                  <span>{o.n} séance{o.n > 1 ? 's' : ''} · dernière le {dateCourte(o.dernier)}</span>
                </span>
                <span class="mp-fl" aria-hidden="true">›</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
