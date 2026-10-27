import { useState, useRef, useEffect } from 'preact/hooks';
import { weightLog, histoJours, ajouterPesee } from '../store/stats.js';
import { objectifs } from '../store/journal.js';
import { musclesParJour } from '../services/muscles-jour.js';
import { setLog } from './SeanceTracker.jsx';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif, allerOnglet } from './BottomNav.jsx';
import { seances } from '../store/seances.js';
import { statsAvOuvertes } from './StatsAvancees.jsx';
import { t } from '../i18n/index.js';
import { Entete } from './Entete.jsx';
import { SILHOUETTE_FACE, SILHOUETTE_DOS, SILHOUETTE_FACE_F, SILHOUETTE_DOS_F } from '../data/silhouette.js';
import { sexe } from '../store/perso.js';
import { aujourdhuiBxl, ajouterJours } from '../store/plans-par-date.js';
import '../legacy/stats.scoped.css';

// ==========================================================
// PAGE MES STATS — portage a l'identique de mes-stats.html (v1).
// Regle : la v1 est la reference absolue. Memes cartes, meme
// silhouette (dos, avant-bras, mains inclus), memes graphiques,
// meme modale « muscles du jour », meme bouton pesee.
// ==========================================================

const LIMITE_GRATUIT = 7;
const COL = { pecs: '#EF4444', dos: '#F97316', epaules: '#F7B500', trapezes: '#EA8C00', biceps: '#10B981', triceps: '#06B6D4', jambes: '#3B82F6', abdos: '#7A45E8' };

// 27/10 : « aujourd'hui » = jour de Bruxelles, calendrier sans decalage horaire.
const isoNDaysAgo = (n) => ajouterJours(aujourdhuiBxl(), -n);
const jourCourt = (iso) => new Date(iso + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
// Pesees : v1 = {iso, date, weight} ; tolere l'ancien format v2 {iso, kg}
const poidsDe = (e) => parseFloat(e.weight ?? e.kg) || 0;

// ---------- Etat vide (v1 .chart-empty) ----------
function Vide({ texte, cta, onCta }) {
  return (
    <div class="chart-empty">
      <div>{texte}<br /><button class="ce-btn" onClick={onCta}>{cta}</button></div>
    </div>
  );
}

// ---------- Silhouette : decalque de la planche de Raci ----------
// v1 : <div class="bodymap">svg + legende</div> — la legende vit DANS .bodymap (118px)
/* Exportee : la modale des muscles de S'entrainer l'affiche aussi,
   pour qu'on voie sur le corps ce qu'on est en train de cocher. */

// Le ton clair d'un groupe : sa couleur melangee de blanc. Il sert au
// relief interne (vaste interne, colonne, tibia) sans ajouter de
// couleur au code : un groupe au repos garde donc un relief gris.
const CLAIR = {};
const eclaircir = (hex) => {
  if (CLAIR[hex]) return CLAIR[hex];
  const n = parseInt(hex.slice(1), 16);
  const m = (d) => Math.round(d + (255 - d) * 0.42).toString(16).padStart(2, '0');
  return (CLAIR[hex] = `#${m((n >> 16) & 255)}${m((n >> 8) & 255)}${m(n & 255)}`);
};

export function BodyMap({ compte, onClick }) {
  // Les traces viennent de data/silhouette.js, genere par tools/tracer.py
  // a partir de la planche de Raci. Ici on ne fait que colorer : aucune
  // geometrie n'est ecrite a la main, donc retoucher la silhouette veut
  // dire relancer le tracer, jamais editer ce fichier.
  // Le gris de repos vient du CSS : sur le fond anthracite de
  // S'entrainer, le #DDE1E7 d'origine devient un corps blanc eclatant
  // au milieu d'une page sombre. La variable permet a chaque page de
  // donner le sien sans que le composant ait a savoir ou il est monte.
  const REPOS = 'var(--bm-repos, #DDE1E7)';
  const col = (k) => (compte[k] > 0 ? (COL[k] || '#F7B500') : REPOS);
  const colBras = () => {
    if (compte.biceps > 0) return COL.biceps;
    if (compte.triceps > 0) return COL.triceps;
    return REPOS;
  };
  const teinte = (p) => {
    if (p.g === 'tete') return '#151515';
    const c = p.g === 'avantBras' ? colBras() : col(p.g);
    return p.t === 'clair' ? eclaircir(c) : c;
  };
  // Deux modeles decalques, un par planche. Sans reponse au profil on
  // garde le masculin — c'etait le seul jusqu'ici, et inventer un
  // defaut feminin serait tout aussi arbitraire. Le choix se fait dans
  // les reglages ou au calcul des besoins.
  const femme = sexe.value === 'f';
  const vue = (chemins, nom) => (
    <div class="bm-vue">
      <svg viewBox="0 0 120 300" xmlns="http://www.w3.org/2000/svg" class="bm-svg">
        {chemins.map((p, i) => <path key={i} fill={teinte(p)} d={p.d} />)}
      </svg>
      <span class="bm-vue-nom">{nom}</span>
    </div>
  );

  return (
    <div class="bodymap bodymap--double" onClick={onClick}>
      {vue(femme ? SILHOUETTE_FACE_F : SILHOUETTE_FACE, t('bm_face'))}
      {vue(femme ? SILHOUETTE_DOS_F : SILHOUETTE_DOS, t('bm_dos'))}
      {/* Le choix de silhouette a quitte cet endroit (Raci, 17/08 :
          « ne le mets plus dans la page mannequin meme ou sur un jour
          de calendrier »). BodyMap est monte a trois endroits — carte
          de la semaine, fiche d'un jour, Stats — donc les boutons
          apparaissaient trois fois, y compris en ouvrant un jour au
          hasard du calendrier. Ils vivent desormais dans Reglages,
          section AFFICHAGE, au premier niveau. */}
    </div>
  );
}


// ---------- Courbe du poids : periode + tendance ----------
// Les barres mentaient deux fois : l'echelle demarrait a min-1 (un
// ecart reel de 2,7 % s'affichait comme un rapport de 3,5), et l'axe
// horizontal ignorait les dates (5 jours d'ecart occupaient la meme
// largeur qu'un seul). Une courbe calee sur le temps corrige les deux.
const PERIODES = [
  { k: '1s', jours: 7 }, { k: '1m', jours: 31 },
  { k: '3m', jours: 92 }, { k: '1a', jours: 366 },
];
// La tendance n'a de sens qu'avec assez de points : lissee sur 4
// pesees, elle inventerait une forme. Seuil pose par Raci le 7/08.
const MIN_TENDANCE = 10;

const isoMoins = (n) => ajouterJours(aujourdhuiBxl(), -n);

/** Moyenne mobile centree sur 7 jours, en unites de temps reelles. */
function tendance(pts) {
  return pts.map(p => {
    const t0 = new Date(p.iso).getTime();
    const fen = pts.filter(q => Math.abs(new Date(q.iso).getTime() - t0) <= 3.5 * 86400000);
    return { iso: p.iso, v: fen.reduce((a, q) => a + q.v, 0) / fen.length };
  });
}

function CourbePoids({ points }) {
  const L = 330, H = 150;
  if (points.length === 1) {
    const p = points[0];
    return (
      <div class="gr">
        <svg viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none">
          <circle class="gr-dern" cx={L / 2} cy={H / 2} r="5" />
          <text class="gr-bulle" x={L / 2 + 10} y={H / 2 + 4}>{p.v}</text>
        </svg>
      </div>
    );
  }
  const vs = points.map(p => p.v);
  const min = Math.min(...vs), max = Math.max(...vs);
  // Au moins 2 kg d'amplitude : sans ce plancher, une serie plate
  // remplirait tout le cadre et transformerait 200 g en falaise.
  const demi = Math.max(1, (max - min) / 2 + .3);
  const centre = (min + max) / 2;
  const bas = centre - demi, haut = centre + demi;
  const t0 = new Date(points[0].iso).getTime();
  const t1 = new Date(points[points.length - 1].iso).getTime();
  const X = (iso) => (t1 === t0 ? L / 2 : ((new Date(iso).getTime() - t0) / (t1 - t0)) * (L - 46));
  const Y = (v) => 18 + (1 - (v - bas) / (haut - bas)) * (H - 40);
  const chemin = (arr) => arr.map((p, i) => `${i ? 'L' : 'M'}${X(p.iso).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');

  const assez = points.length >= MIN_TENDANCE;
  const lisse = assez ? tendance(points) : null;
  const dernier = points[points.length - 1];

  return (
    <div class="gr">
      <svg viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="grRemplissage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#F86A0C" stop-opacity=".22" />
            <stop offset="100%" stop-color="#F86A0C" stop-opacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1="18" x2={L} y2="18" stroke="#EDE9E2" />
        <line x1="0" y1={H / 2} x2={L} y2={H / 2} stroke="#EDE9E2" />
        <line x1="0" y1={H - 22} x2={L} y2={H - 22} stroke="#EDE9E2" />

        <path d={`${chemin(points)} L${X(dernier.iso).toFixed(1)},${H} L0,${H} Z`} fill="url(#grRemplissage)" />
        <path class={'gr-ligne' + (assez ? ' pale' : '')} d={chemin(points)} fill="none" />
        {points.map(p => (
          <circle key={p.iso} class={'gr-pt' + (assez ? ' pale' : '')}
            cx={X(p.iso)} cy={Y(p.v)} r={assez ? 2.5 : 3.5} />
        ))}

        {lisse && <path class="gr-tendance" d={chemin(lisse)} fill="none" />}

        <circle class={'gr-dern' + (assez ? ' sombre' : '')}
          cx={X(dernier.iso)} cy={Y(assez ? lisse[lisse.length - 1].v : dernier.v)} r="5" />
        <text class="gr-bulle" x={Math.min(X(dernier.iso) + 10, L - 34)}
          y={Y(assez ? lisse[lisse.length - 1].v : dernier.v) + 4}>{dernier.v}</text>

        <text class="gr-axe" x={L - 44} y="21">{haut.toFixed(1)}</text>
        <text class="gr-axe" x={L - 44} y={H - 19}>{bas.toFixed(1)}</text>
      </svg>
    </div>
  );
}

// ---------- Modale poids : copie v1 (weightModal, app.html) ----------
export function WeightModal({ fermer }) {
  const l = weightLog.value || [];
  const last = l.length ? parseFloat(poidsDe([...l].sort((a, b) => a.iso.localeCompare(b.iso))[l.length - 1])) : null;

  const MIN = 30, MAX = 150;
  const borne = (v) => Math.min(MAX, Math.max(MIN, Math.round(v * 10) / 10));
  const [val, setVal] = useState(borne(last || 80));
  const [manuel, setManuel] = useState(false);
  const [texte, setTexte] = useState('');
  const repete = useRef(null);

  // Appui long : premiere marche tout de suite, puis repetition rapide.
  const demarrerPas = (sens) => {
    setVal(v => borne(v + sens * 0.1));
    let delai = setTimeout(function tourne() {
      setVal(v => borne(v + sens * 0.1));
      delai = setTimeout(tourne, 70);
      repete.current = delai;
    }, 420);
    repete.current = delai;
  };
  const arreterPas = () => { clearTimeout(repete.current); repete.current = null; };
  useEffect(() => () => clearTimeout(repete.current), []);

  const validerManuel = () => {
    const v = parseFloat(String(texte).replace(',', '.'));
    setManuel(false);
    if (!isNaN(v)) setVal(borne(v));
  };

  const enregistrer = () => {
    if (!val || val <= 0) { alert(t('js_weight_invalid')); return; }
    ajouterPesee(val);
    fermer();
  };

  const delta = last !== null ? +(val - last).toFixed(1) : null;

  return (
    <div class="modal-overlay show wm2-voile" onClick={(e) => { if (e.target === e.currentTarget) fermer(); }}>
      <div class="wm2">
        <div class="wm2-poignee" />

        <div class="wm2-rang">
          <button
            class="wm2-pas" aria-label="Moins"
            onPointerDown={() => demarrerPas(-1)}
            onPointerUp={arreterPas} onPointerLeave={arreterPas} onPointerCancel={arreterPas}
          ><svg viewBox="0 0 24 24"><path d="M5.5 12h13" /></svg></button>

          {manuel ? (
            <div class="wm2-valeur wm2-valeur--champ">
              <input
                type="number" inputMode="decimal" step="0.1" min={MIN} max={MAX}
                value={texte} autoFocus
                onInput={(e) => setTexte(e.currentTarget.value)}
                onBlur={validerManuel}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              />
            </div>
          ) : (
            <button class="wm2-valeur wm2-valeur--btn"
              onClick={() => { setTexte(val.toFixed(1)); setManuel(true); }}>
              {val.toFixed(1).replace('.', ',')}<span>kg</span>
            </button>
          )}

          <button
            class="wm2-pas" aria-label="Plus"
            onPointerDown={() => demarrerPas(1)}
            onPointerUp={arreterPas} onPointerLeave={arreterPas} onPointerCancel={arreterPas}
          ><svg viewBox="0 0 24 24"><path d="M12 5.5v13M5.5 12h13" /></svg></button>
        </div>

        <div class="wm2-delta-zone">
          {delta !== null && delta !== 0 ? (
            <span class={'wm2-delta' + (delta < 0 ? ' baisse' : ' hausse')}>
              {delta > 0 ? '+' : '\u2212'}{Math.abs(delta).toFixed(1)} kg {t('wm2_depuis')}
            </span>
          ) : <span class="wm2-delta neutre">{last !== null ? t('wm2_pareil') : '\u00a0'}</span>}
        </div>

        <button class="wm2-ok" onClick={enregistrer}>{t('save')}</button>
        <button class="wm2-annuler" onClick={fermer}>{t('cancel')}</button>
      </div>
    </div>
  );
}

export function Stats() {
  const [modalePoids, setModalePoids] = useState(false);
  // Periode du graphique de poids : puce rapide ou intervalle libre.
  const [periode, setPeriode] = useState('3m');
  const [periodeK, setPeriodeK] = useState('1s');
  const [libre, setLibre] = useState({ ouvert: false, du: '', au: '' });
  const prem = estPremium.value;

  const poidsData = weightLog.value || [];
  const histoBrut = histoJours.value || {};
  // v1 : history = [{iso, date, kcal, ...}] ; store v2 = {iso: {kcal,...}}
  const histoire = Object.entries(histoBrut).map(([iso, v]) => ({ iso, ...(v || {}) }));
  // Marquage manuel ET seances enregistrees : depuis le 22/08 la
  // seance n'ecrit plus dans muscleLog, elle se lit en direct.
  const mLog = musclesParJour();
  // setLog v2 : { iso: [{ex, series:[{kg,reps}]}] }
  // -> vue par exercice, meme forme que la v1 : { nom: [{iso, sets:[{w,r}]}] }
  const setLogJours = setLog.value || {};
  const setLogAll = {};
  Object.keys(setLogJours).sort().forEach(iso => {
    (setLogJours[iso] || []).forEach(e => {
      if (!e || !e.ex) return;
      const sets = (e.series || []).map(s => ({ w: s.kg, r: s.reps }));
      if (!sets.length) return;
      (setLogAll[e.ex] = setLogAll[e.ex] || []).push({ iso, sets });
    });
  });
  // « Seance faite ce jour » (remplace le sessionLog v1) : au moins une serie notee
  const seanceFaite = (iso) => (setLogJours[iso] || []).some(e => (e.series || []).length);

  // ================= Score global sur 7 jours (v1 calcScores) =================
  const j7 = Array.from({ length: 7 }, (_, i) => isoNDaysAgo(i));
  const jourActif = (iso) =>
    histoire.some(e => e.iso === iso) ||
    (mLog[iso] && mLog[iso].length && !(mLog[iso].length === 1 && mLog[iso][0] === 'repos')) ||
    seanceFaite(iso) ||
    poidsData.some(w => w.iso === iso);

  const joursEncodes = j7.filter(iso => histoire.some(e => e.iso === iso)).length;
  const nutrition = Math.round(joursEncodes / 7 * 100);
  const trainJours = j7.filter(iso =>
    (mLog[iso] && mLog[iso].length && !(mLog[iso].length === 1 && mLog[iso][0] === 'repos')) ||
    seanceFaite(iso)).length;
  const entrainement = Math.min(100, Math.round(trainJours / 4 * 100));

  const p14 = poidsData.filter(w => w.iso >= isoNDaysAgo(14)).sort((a, b) => a.iso.localeCompare(b.iso));
  // Le calcul precedent comparait la derniere pesee a une « cible » qui
  // etait elle-meme la derniere pesee : l'ecart valait toujours zero, la
  // condition etait toujours vraie, et ce score affichait 100 % quoi
  // qu'il arrive des deux pesees en 14 jours. Il ne mesurait rien
  // (trouve le 9/08 en relisant le code sur demande de Raci).
  // Il mesure desormais ce qu'il annonce : la FREQUENCE de pesee sur
  // 14 jours, une pesee tous les deux jours valant le maximum.
  const scorePoids = Math.min(100, Math.round(p14.length / 7 * 100));
  const pesees14 = p14.length;
  const joursActifs = j7.filter(jourActif).length;
  const regularite = Math.round(joursActifs / 7 * 100);
  const global = Math.round((nutrition + entrainement + scorePoids + regularite) / 4);
  const rienDuTout = !histoire.length && !poidsData.length && !Object.keys(setLogJours).length && !Object.keys(mLog).length;

  // ================= Poids =================
  let poidsTri = [...poidsData].sort((a, b) => a.iso.localeCompare(b.iso));
  if (!prem && poidsTri.length > LIMITE_GRATUIT) poidsTri = poidsTri.slice(-LIMITE_GRATUIT);

  // Fenetre choisie. « Poids actuel » reste la derniere pesee connue,
  // meme hors periode : c'est ton poids, pas une statistique de la
  // fenetre. « Variation » se lit en revanche SUR la periode affichee.
  const bornes = (() => {
    if (periode === 'libre' && libre.du && libre.au) return { du: libre.du, au: libre.au };
    const def = PERIODES.find(x => x.k === periode) || PERIODES[2];
    return { du: isoMoins(def.jours), au: '9999' };
  })();
  const poidsPeriode = poidsTri
    .filter(d => d.iso >= bornes.du && d.iso <= bornes.au)
    .map(d => ({ iso: d.iso, v: poidsDe(d) }));

  const poidsActuel = poidsTri.length ? poidsDe(poidsTri[poidsTri.length - 1]) : 0;
  const poidsDebut = poidsPeriode.length ? poidsPeriode[0].v : poidsActuel;
  const finPeriode = poidsPeriode.length ? poidsPeriode[poidsPeriode.length - 1].v : poidsActuel;
  const diff = (finPeriode - poidsDebut).toFixed(1);

  // ================= Calories =================
  // Maquette validee par Raci le 8/08 : le graphe s'adapte a la periode
  // au lieu d'empiler une barre par journee jusqu'a deborder de l'ecran
  // (les deux dernieres colonnes finissaient a 394 et 422 px pour 390).
  // Le pas d'agregation garantit AU PLUS 13 colonnes :
  //   1 sem -> 1 barre / jour (7, jours vides compris)
  //   1 mois -> 1 barre / semaine (5) · 3 mois -> 13 · 1 an -> 1 / mois (12)
  const kcalTri = [...histoire].sort((a, b) => (a.iso || '').localeCompare(b.iso || ''));
  const parIso = {};
  kcalTri.forEach(d => { if (d.iso) parIso[d.iso] = parseInt(d.kcal || 0); });
  const midi = (iso) => new Date(iso + 'T12:00:00Z');   // jour civil, sans decalage
  const colsK = [];
  if (periodeK === '1s') {
    // 7 jours civils, les jours sans saisie gardent leur colonne (vide) :
    // les supprimer decalait la lecture et cachait les trous.
    for (let i = 6; i >= 0; i--) {
      const iso = isoNDaysAgo(i);
      colsK.push({ cle: iso, v: parIso[iso] ?? null,
        lb: midi(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }) });
    }
  } else if (periodeK === '1m' || periodeK === '3m') {
    const nb = periodeK === '1m' ? 5 : 13;
    for (let i = nb - 1; i >= 0; i--) {
      const auj = aujourdhuiBxl();
      const lundi = ajouterJours(auj, -((midi(auj).getUTCDay() + 6) % 7) - i * 7);
      let somme = 0, n = 0;
      for (let j = 0; j < 7; j++) {
        const v = parIso[ajouterJours(lundi, j)];
        if (v != null) { somme += v; n++; }
      }
      colsK.push({ cle: lundi, v: n ? Math.round(somme / n) : null,
        lb: `${parseInt(lundi.slice(8, 10), 10)}/${parseInt(lundi.slice(5, 7), 10)}` });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const auj = aujourdhuiBxl();
      const m = new Date(Date.UTC(+auj.slice(0, 4), +auj.slice(5, 7) - 1 - i, 1, 12));
      const pref = m.toISOString().slice(0, 7);
      let somme = 0, n = 0;
      Object.keys(parIso).forEach(iso => { if (iso.startsWith(pref)) { somme += parIso[iso]; n++; } });
      colsK.push({ cle: pref, v: n ? Math.round(somme / n) : null,
        lb: m.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }) });
    }
  }
  const valsK = colsK.map(c => c.v).filter(v => v != null);
  const objKcalJ = +objectifs.value.kcal || 0;
  const moyKcal = valsK.length ? Math.round(valsK.reduce((a, b) => a + b, 0) / valsK.length) : 0;
  // Un « 0 » ne distingue pas « rien mange » de « rien encode ». On garde
  // la valeur seulement si la journee a ete renseignee (Raci, 9/08).
  const derniereEntree = kcalTri.length ? kcalTri[kcalTri.length - 1] : null;
  const derniereKcal = derniereEntree ? parseInt(derniereEntree.kcal || 0) : 0;
  const derniereRenseignee = !!derniereEntree && derniereKcal > 0;
  // Le trait d'objectif doit toujours tenir dans le cadre.
  const maxK = Math.max(objKcalJ || 1, ...(valsK.length ? valsK : [1])) * 1.08;


  // Le calcul de la progression par exercice vivait ici (v1
  // renderExoProg). Retire avec sa carte le 16/08 : topSet, nomsExos,
  // histExo, le record et l'ecart depuis la premiere seance n'avaient
  // plus aucun lecteur. setLogAll reste utilise plus haut, pour compter
  // les jours d'entrainement.

  // Rampe de progression : ardoise -> or -> vert, interpolation continue.
  // Jamais de rouge : sous 40 le gris dit « pas assez de donnees », pas « echec ».
  const ANCRES_TEINTE = [
    [0, [126, 135, 148]], [40, [176, 138, 60]], [58, [245, 168, 0]],
    [74, [217, 162, 28]], [100, [63, 158, 107]],
  ];
  const teinteScore = (v) => {
    v = Math.max(0, Math.min(100, v));
    for (let i = 0; i < ANCRES_TEINTE.length - 1; i++) {
      const [a, ca] = ANCRES_TEINTE[i], [b, cb] = ANCRES_TEINTE[i + 1];
      if (v <= b) {
        const t2 = (v - a) / (b - a);
        return ca.map((x, k) => Math.round(x + (cb[k] - x) * t2));
      }
    }
    return ANCRES_TEINTE[ANCRES_TEINTE.length - 1][1];
  };
  const rgbScore = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
  // La barre part de la teinte d'ou l'on vient et finit sur celle ou l'on va.
  const degradeScore = (v) =>
    `linear-gradient(90deg, ${rgbScore(teinteScore(Math.max(0, v - 12)))}, ${rgbScore(teinteScore(Math.min(100, v + 18)))})`;
  const cGlobal = teinteScore(global);
  const R_ARC = 11, C_ARC = 2 * Math.PI * R_ARC;

  return (
    <div class="pg-stats">
      <div class="container">
        {/* Meme en-tete que le Journal et S'entrainer : fleche
            retour, prenom, profil et reglages — une seule source.
            L'ancien app-header (logo-bandeau 55 px, boutons 27) et
            le bloc-titre « Mes stats » disparaissent, comme sur
            S'entrainer : le nom de l'onglet est deja dans la
            navigation du bas. */}
        <Entete />

        {/* NOTE DE PROGRESSION GLOBALE */}
        {!rienDuTout && (
          <div class="score-card" style={{ '--halo': `rgba(${cGlobal[0]},${cGlobal[1]},${cGlobal[2]},.30)` }}>
            <div class="score-head"><div>
              <div class="score-title">{t('st_score_title')}</div>
              <div class="score-val">
                <span>{global}</span><small> %</small>
                <span class="score-arc">
                  <svg viewBox="0 0 26 26">
                    <circle class="piste" cx="13" cy="13" r={R_ARC} />
                    <circle class="trace" cx="13" cy="13" r={R_ARC}
                            stroke={rgbScore(cGlobal)}
                            stroke-dasharray={`${C_ARC * global / 100} ${C_ARC}`} />
                  </svg>
                </span>
              </div>
            </div></div>
            <div class="score-note">
              {global >= 85 ? t('st_note_a') : global >= 70 ? t('st_note_b') : global >= 40 ? t('st_note_c') : t('st_note_d')}
            </div>
            {/* Chaque ligne porte son chiffre brut : on voit d'ou vient la
                note au lieu de la subir (Raci, 9/08). */}
            <div class="score-rows">
              {/* Chaque barre mene la ou on l'ameliore (23/09). */}
              {[[t('st_row_nutrition'), nutrition, `${joursEncodes}/7 ${t('st_det_jours')}`, () => allerOnglet('journal')],
                [t('st_row_training'), entrainement, `${trainJours} ${trainJours === 1 ? t('st_det_seances').replace(/s$/, '') : t('st_det_seances')}`, () => allerOnglet('entrainer')],
                [t('st_row_weight'), scorePoids, `${pesees14} ${pesees14 === 1 ? t('st_det_pesees').replace(/^(\S+?)s\b/, '$1') : t('st_det_pesees')}`, () => setModalePoids(true)],
                [t('st_row_regularity'), regularite, `${joursActifs}/7 ${t('st_det_actifs')}`, () => allerOnglet('journal')]].map(([l, v, d, aller]) => (
                <button type="button" class="score-bloc score-bloc--lien" key={l} onClick={aller}>
                  <div class="score-row">
                    <div class="sr-lbl">{l}</div>
                    <div class="sr-bar"><div class="sr-fill" style={{ width: v + '%', background: degradeScore(v) }} /></div>
                    <div class="sr-val">{v}%</div>
                  </div>
                  <div class="sr-det">{d}<span class="sr-fl" aria-hidden="true">&rsaquo;</span></div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* POIDS */}
        <div class="stat-card acc-green">
          <h2><span>{t('st_weight')}</span></h2>
          <div class="card-sub">{t('st_weight_sub')}</div>
          {poidsTri.length ? (
            <>
              <div class="stat-summary">
                <div class="stat-box"><div class="sb-val">{poidsActuel} kg</div><div class="sb-lbl">{t('st_cur_weight')}</div></div>
                <div class="stat-box"><div class="sb-val">{diff > 0 ? '+' + diff : diff} kg</div><div class="sb-lbl">{t('st_variation')}</div></div>
              </div>
              <div class="per">
                {PERIODES.map(x => (
                  <button key={x.k} class={periode === x.k ? 'on' : ''}
                    onClick={() => { setPeriode(x.k); setLibre(l => ({ ...l, ouvert: false })); }}>
                    {t('per_' + x.k)}
                  </button>
                ))}
              </div>
              <button class={'per-libre' + (periode === 'libre' ? ' on' : '')}
                onClick={() => setLibre(l => ({ ...l, ouvert: !l.ouvert }))}>
                {t('per_libre')}
              </button>

              {libre.ouvert && (
                <div class="per-panneau">
                  <label>{t('per_du')}
                    <input type="date" value={libre.du} max={libre.au || undefined}
                      onInput={(e) => setLibre(l => ({ ...l, du: e.currentTarget.value }))} />
                  </label>
                  <label>{t('per_au')}
                    <input type="date" value={libre.au} min={libre.du || undefined}
                      onInput={(e) => setLibre(l => ({ ...l, au: e.currentTarget.value }))} />
                  </label>
                  <button class="per-ok" disabled={!libre.du || !libre.au}
                    onClick={() => { setPeriode('libre'); setLibre(l => ({ ...l, ouvert: false })); }}>
                    {t('per_ok')}
                  </button>
                </div>
              )}

              {poidsPeriode.length ? (
                <>
                  <CourbePoids points={poidsPeriode} />
                  <div class="gr-jours">
                    <span>{jourCourt(poidsPeriode[0].iso)}</span>
                    <span>{jourCourt(poidsPeriode[poidsPeriode.length - 1].iso)}</span>
                  </div>
                  {poidsPeriode.length < MIN_TENDANCE && (
                    <div class="gr-note">{t('st_tendance_bloquee', { n: poidsPeriode.length })}</div>
                  )}
                </>
              ) : <div class="gr-vide">{t('per_vide')}</div>}
            </>
          ) : <Vide texte={t('st_no_weight')} cta={t('st_add_weight')} onCta={() => setModalePoids(true)} />}
          {/* Le bouton permanent ne s'affiche QUE s'il y a deja une pesee.
              En etat vide il doublait le bouton de l'etat vide, juste en
              dessous, vers la meme modale — et il proposait de « modifier »
              un poids qui n'existe pas encore (R5, tranche par Raci le
              23/08). Des la premiere pesee, il reprend sa place. */}
          {poidsTri.length > 0 && (
            <button class="weight-add-btn" onClick={() => setModalePoids(true)}>{t('st_weight_add')}</button>
          )}
        </div>

        {/* CALORIES */}
        <div class="stat-card acc-orange">
          <h2><span>{t('st_kcal')}</span></h2>
          <div class="card-sub">{t('st_kcal_sub')}</div>
          {kcalTri.length ? (
            <>
              <div class="stat-summary">
                <div class="stat-box">
                  <div class="sb-val">{moyKcal}</div>
                  <div class="sb-lbl">{t('st_moyenne_sur').replace('{n}', valsK.length)}</div>
                </div>
                <div class="stat-box">
                  <div class={'sb-val' + (derniereRenseignee ? '' : ' sb-val--vide')}>
                    {derniereRenseignee ? derniereKcal : t('st_derniere_vide')}
                  </div>
                  <div class="sb-lbl">{t('st_last_day')}</div>
                </div>
              </div>
              <div class="per per--kcal">
                {['1s', '1m', '3m', '1a'].map(k => (
                  <button key={k} class={periodeK === k ? 'on' : ''}
                    onClick={() => setPeriodeK(k)}>{t('per_' + k)}</button>
                ))}
              </div>
              <div class="chart-zone">
                {objKcalJ > 0 && (
                  /* Meme echelle que les barres : pied a 16 px (rangee
                     des jours), 88 px de plot. La ligne coupe donc
                     exactement les barres qui depassent l'objectif. */
                  <div class="chart-cible" style={{ bottom: Math.round(16 + (objKcalJ / maxK) * 88) + 'px' }}>
                    <span>{t('goal').toLowerCase()} {objKcalJ}</span>
                  </div>
                )}
                <div class="chart">
                  {colsK.map(c => {
                    // Hauteur en PIXELS : en %, le flex de la colonne
                    // compressait toutes les barres hautes a la meme
                    // taille (mesure : 2511 et 2785 rendaient 88 px
                    // chacune) — le graphe n'encodait plus rien.
                    // 88 px = plot reel (130 - rangee valeurs - jours).
                    const h = c.v == null ? 3 : (c.v / maxK) * 88;
                    // Sable desature : jour vide ou tres en dessous de
                    // l'objectif — on voit le creux sans alerte rouge.
                    const creuse = c.v == null || (objKcalJ > 0 && c.v < objKcalJ / 2);
                    return (
                      <div class="chart-bar-wrap" key={c.cle}>
                        {colsK.length <= 7 && <div class="chart-val">{c.v == null ? '—' : c.v}</div>}
                        <div class={'chart-bar kcalbar' + (creuse ? ' kcalbar--creuse' : '')}
                             style={{ height: Math.max(3, Math.round(h)) + 'px' }} />
                        <div class="chart-day">{c.lb}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : <Vide texte={t('st_no_day')} cta={t('st_save_day')} onCta={() => { ongletActif.value = 'journal'; }} />}
        </div>

        {/* La carte « Progression par exercice » a ete retiree le 16/08
            (Raci) : elle refaisait ce que l'onglet S'entrainer montre
            deja — le detail d'une seance y affiche les series et
            signale les records. En etat vide elle ne portait plus
            qu'un bouton « Lancer une seance », a un pouce de l'onglet
            S'entrainer de la barre du bas.
            Ce qui disparait avec elle et n'existe nulle part ailleurs :
            le graphique de charge d'UN exercice suivi dans le temps, et
            l'ecart depuis la premiere seance. Les records restent
            visibles seance par seance, mais plus leur courbe. */}
        {/* ENTRAINEMENT (23/09) : une courbe de volume par semaine, pas
            le detail par exercice retire le 16/08. Le tonnage est fiable
            depuis v546 (les seances guidees s'enregistraient a 0 kg). */}
        {(() => {
          const lundiDe = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
          const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          const l0 = lundiDe(new Date());
          const sem = Array.from({ length: 8 }, (_, k) => {
            const debut = new Date(l0); debut.setDate(l0.getDate() - 7 * (7 - k));
            const fin = new Date(debut); fin.setDate(debut.getDate() + 7);
            const liste = seances.value.filter(s => s.iso >= iso(debut) && s.iso < iso(fin));
            return { cle: iso(debut), lb: debut.getDate() + '/' + (debut.getMonth() + 1), n: liste.length,
              kg: liste.reduce((a, s) => a + (s.tonnage || 0), 0) };
          });
          const cette = sem[7];
          const maxKg = Math.max(1, ...sem.map(x => x.kg));
          return (
            <div class="stat-card acc-blue">
              <h2><span>{t('st_train')}</span></h2>
              <div class="card-sub">{t('st_train_sub')}</div>
              {seances.value.length ? (
                <>
                  <div class="stat-summary">
                    <div class="stat-box"><div class="sb-val">{cette.n}</div><div class="sb-lbl">{t('st_train_semaine')}</div></div>
                    <div class="stat-box"><div class="sb-val">{Math.round(cette.kg).toLocaleString('fr-BE')} kg</div><div class="sb-lbl">{t('st_train_tonnage')}</div></div>
                  </div>
                  <div class="chart-zone">
                    <div class="chart">
                      {sem.map(x => (
                        <div class="chart-bar-wrap" key={x.cle}>
                          <div class="chart-bar charge" style={{ height: Math.max(3, Math.round((x.kg / maxKg) * 88)) + 'px' }} />
                          <div class="chart-day">{x.lb}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : <Vide texte={t('st_train_vide')} cta={t('st_train_cta')} onCta={() => allerOnglet('entrainer')} />}
            </div>
          );
        })()}

        {prem && (
          <button type="button" class="st-avancees" onClick={() => { statsAvOuvertes.value = true; }}>
            {t('st_avancees')} <span aria-hidden="true">&rsaquo;</span>
          </button>
        )}

        {/* INVITATION PREMIUM */}
        {!prem && (
          <div class="premium-invite">
            <div class="pi-icon"><svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" /></svg></div>
            <h3>{t('st_prem_title')}</h3>
            <p dangerouslySetInnerHTML={{ __html: t('st_prem_body') }} />
            <button class="pi-btn" onClick={() => { ongletActif.value = 'premium'; }}>{t('support_unlock')}</button>
            <div class="locked-note">{t('st_locked_note')}</div>
          </div>
        )}
      </div>

      {modalePoids && <WeightModal fermer={() => setModalePoids(false)} />}
    </div>
  );
}
