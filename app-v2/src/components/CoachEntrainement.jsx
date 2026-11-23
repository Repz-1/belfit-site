// ============================================================
// COACHING ENTRAINEMENT — cote client (21/11, Raci, maquette validee).
//
// Le programme vient de l'espace coach (mode bleu). Le client choisit
// sa seance, note SEULEMENT ses poids (disques d'un cote a la barre,
// poids d'un haltere, poids affiche a la poulie ou a la machine) et
// coche ses series. Sans programme : la page se montre floutee,
// « Non disponible pour ton compte ».
// ============================================================
import { useState, useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import { entrainementCoach, dossierCoach } from './BelfitPlus.jsx';
import { QuestionnaireCoach, effacerBrouillon } from './QuestionnaireCoach.jsx';
import { getApps } from 'firebase/app';
import { utilisateur } from '../services/firebase.js';
import { signalerQuestionnaire } from '../services/mollie.js';
import { carnetCoach, carnetCharge, noterSeance, dernierPour, derniereNote } from '../store/carnet-coach.js';
import { DISQUES, totalBarre, texteDisques, pasCharge, kgTexte, repsParSerie, repsTexte } from '../data/charge-coach.js';
import { t } from '../i18n/index.js';
import { PhotoExo } from './PhotoExo.jsx';
import { createPortal } from 'preact/compat';

/** 21/11 Raci : le mouvement s'explique mieux en boucle. Les deux photos
 *  (depart / arrivee) s'enchainent toutes seules, comme une petite video. */
function AnimExo({ imgId, alt = '' }) {
  return (
    <div class="ce-anim">
      <PhotoExo imgId={imgId} n={0} taille={640} prioritaire alt={alt} />
      <PhotoExo imgId={imgId} n={1} taille={640} prioritaire alt="" class="ce-anim-b" />
    </div>
  );
}

/** Le meme mouvement en grand, plein ecran ; toucher ferme. */
function PhotoGrande({ imgId, nom, fermer }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') fermer(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);
  return createPortal(
    <div class="ce-plein" role="dialog" aria-label={nom} onClick={fermer}>
      <button type="button" class="ce-plein-x" aria-label="Fermer" onClick={fermer}>×</button>
      <AnimExo imgId={imgId} alt={nom} />
      <p class="ce-plein-nom">{nom}</p>
    </div>,
    document.body,
  );
}
import { EXERCISES } from '../data/exercices.js';
import '../styles/coach-entrainement.css';

// 21/11 Raci : toucher un exercice montre ses photos (depart / arrivee).
// Programmes plus anciens sans imgId : on le retrouve par le nom.
let IMG_PAR_NOM = null;
// 23/11 : la photo de la BASE passe avant celle gardee dans le programme, pour
// qu'une photo corrigee dans la base le soit aussi dans les programmes deja envoyes.
function imgDe(x) {
  if (!IMG_PAR_NOM) { IMG_PAR_NOM = {}; Object.values(EXERCISES).forEach((l) => l.forEach((e) => { IMG_PAR_NOM[e.nom] = e.imgId; })); }
  // Exercice connu de la base : sa photo (ou son absence voulue) fait foi.
  return x.nom in IMG_PAR_NOM ? (IMG_PAR_NOM[x.nom] || null) : (x.imgId || null);
}

const isoJour = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

function depuisTxt(iso) {
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (isNaN(j)) return '';
  return j <= 0 ? t('ce_aujourdhui') : new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}

/** Valeur d'une ligne du carnet, lisible : « 100 kg (2 × 20) ». */
function valeurTxt(x) {
  if (!x) return '';
  if (Array.isArray(x.series)) return x.detail ? x.detail + ' kg' : '';
  if (x.kg === null || x.kg === undefined) return x.detail || '';
  return kgTexte(x.kg) + ' kg' + (x.detail ? ' (' + x.detail + ')' : '');
}

/** 23/11 Raci : note du client sur l'exercice, pendant ou apres (ressenti,
 *  douleur, reglage de la machine). Repliee par defaut ; la note de la seance
 *  precedente reste visible pour s'en souvenir. Le coach la lit dans son carnet. */
function NoteExo({ valeur, avant, maj }) {
  const [ouvert, setOuvert] = useState(!!valeur);
  return (
    <div class="ce-note-exo">
      {avant && !valeur && <p class="ce-note-avant">{t('ce_note_avant', { n: avant })}</p>}
      {ouvert || valeur
        ? <textarea class="ce-note-champ" rows={2} maxLength={300} value={valeur} placeholder={t('ce_note_ph')}
            onInput={(ev) => maj(ev.currentTarget.value)} />
        : <button type="button" class="ce-note-bt" onClick={() => setOuvert(true)}>{t('ce_note_bt')}</button>}
    </div>
  );
}

/** Etat de saisie d'une seance. 21/11 Raci : un poids PAR SERIE (serie 1 a
 *  10+5, serie 2 a 25...). Une serie neuve part de zero ; on peut reprendre la
 *  precedente d'un geste. Seule la seance deja notee aujourd'hui est rechargee. */
const serieVide = () => ({ disques: [], kg: 0, reps: null, fait: false });
function etatInitial(seance, cle) {
  const jour = carnetCoach.peek()[cle];
  const e = {};
  (seance ? seance.exos : []).forEach((x) => {
    const deja = jour && jour.exos && jour.exos[x.id];
    const n = Math.max(1, +x.series || 3);
    const series = Array.from({ length: n }, (_, i) => {
      const d = deja && Array.isArray(deja.series) ? deja.series[i] : null;
      return d ? { disques: Array.isArray(d.disques) ? d.disques.slice() : [], kg: +d.kg || 0, reps: Number.isFinite(+d.reps) && d.reps !== null ? +d.reps : null, fait: !!d.fait } : serieVide();
    });
    const actif = Math.max(0, series.findIndex((y) => !y.fait));
    // 23/11 Raci : une note du client par exercice (ressenti, douleur, reglage machine).
    e[x.id] = { series, actif: actif === -1 ? 0 : actif, note: (deja && typeof deja.note === 'string') ? deja.note : '' };
  });
  return e;
}

/** Charge d'une serie, lisible : « 50 kg · 1 × 10 + 1 × 5 » ou « — ». */
// 23/11 Raci : le client note aussi les REPETITIONS faites a chaque serie.
const repsFaites = (v) => (v.reps !== null && v.reps !== undefined && v.reps > 0 ? v.reps + ' reps' : '');
function chargeSerie(type, v) {
  const r = repsFaites(v);
  const c = chargeSeule(type, v);
  return r && c ? c + ' · ' + r : r || c;
}
function chargeSeule(type, v) {
  if (type === 'corps') return '';
  if (type === 'barre') return v.disques.length ? kgTexte(totalBarre(v.disques)) + ' kg · ' + texteDisques(v.disques) : t('ce_barre_seule') + ' · 20 kg';
  return v.kg > 0 ? kgTexte(v.kg) + ' kg' : '—';
}
const kgSerie = (type, v) => (type === 'barre' ? totalBarre(v.disques) : type === 'corps' ? null : v.kg);

// 23/11 : questionnaire entrainement. Le coach l'ouvre apres reception du virement
// (questEntOuvert, champ serveur) ; le client le remplit ici. Rien sur le paiement.
function etatQuestEnt() {
  const d = dossierCoach.value || {};
  const ouvert = d.questEntOuvert && d.questEntOuvert.le;
  const q = d.questEnt;
  const envoye = q && q.envoyeLe;
  return { ouvert: !!ouvert, aRemplir: !!ouvert && (!envoye || envoye < ouvert), envoye: !!ouvert && !!envoye && envoye >= ouvert, q };
}
function precedentesEnt(q) {
  if (!q || !q.reponses) return null;
  const r = {};
  Object.entries(q.reponses).forEach(([id, v]) => {
    if (!v || typeof v !== 'object') return;
    const { texte, section, question, ...brut } = v;
    if (Object.keys(brut).length) r[id] = brut;
  });
  return Object.keys(r).length ? r : null;
}
function envoyerQuestEnt(reponses, alerte, extra = {}) {
  const q = { type: 'entrainement', reponses, alerteSante: !!alerte, consentements: extra.consentements || {}, envoyeLe: new Date().toISOString() };
  dossierCoach.value = { ...dossierCoach.value, questEnt: q };
  const u = utilisateur.value;
  if (!u || !getApps().length) return Promise.resolve();
  return import('firebase/firestore').then(({ getFirestore, doc, setDoc, deleteField }) =>
    setDoc(doc(getFirestore(getApps()[0]), 'users', u.uid), { questionnaireEntrainement: q, brouillonEnt: deleteField() }, { merge: true }))
    .then(() => { signalerQuestionnaire('entrainement'); })   // e-mail au coach (serveur, une fois)
    .catch((e) => console.warn('questionnaire entrainement non envoye', e));
}
function CarteQuestEnt({ etat, ouvrir }) {
  if (etat.aRemplir) return (
    <div class="ce-voile-carte ce-quest" role="status">
      <p class="ce-voile-t">{t('ce_quest_t')}</p>
      <p class="ce-voile-txt">{t('ce_quest_txt')}</p>
      <button type="button" class="ce-quest-bt" onClick={ouvrir}>{t('ce_quest_bt')}</button>
    </div>
  );
  return (
    <div class="ce-voile-carte ce-quest" role="status">
      <p class="ce-voile-t">{t('ce_quest_ok_t')}</p>
      <p class="ce-voile-txt">{t('ce_quest_ok_txt')}</p>
    </div>
  );
}

function Indisponible({ ouvrir }) {
  const etat = etatQuestEnt();
  return (
    <div class="ce-indispo">
      <div class="ce-flou" aria-hidden="true">
        <p class="ce-h">{t('ce_titre')}</p>
        {[['Squat', '4 × 6-8', '2 × 20'], ['Leg press', '3 × 10-12', '120 kg'], ['Lat pulldown', '3 × 10', '55 kg']].map(([n, s, v]) => (
          <div class="ce-carte"><b>{n}</b><span>{s} · {v}</span></div>
        ))}
      </div>
      <div class="ce-voile">
        {etat.ouvert ? <CarteQuestEnt etat={etat} ouvrir={ouvrir} /> : (
        <div class="ce-voile-carte" role="status">
          <span class="ce-cadenas" aria-hidden="true">
            <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
          </span>
          <p class="ce-voile-t">{t('ce_indispo_t')}</p>
          <p class="ce-voile-txt">{t('ce_indispo_txt')}</p>
        </div>
        )}
      </div>
    </div>
  );
}

function SaisieBarre({ v, maj }) {
  const tot = totalBarre(v.disques);
  return (
    <div class="ce-saisie">
      <p class="ce-lib">{t('ce_disques')}</p>
      <div class="ce-pile">
        {v.disques.length ? v.disques.map((d, i) => {
          const c = DISQUES.find((x) => x.kg === d) || DISQUES[0];
          return <button type="button" class="ce-disque" style={{ background: c.c, color: d === 5 ? '#151515' : '#fff' }}
            aria-label={kgTexte(d) + ' kg'} onClick={() => maj({ disques: v.disques.filter((_, k) => k !== i) })}>{kgTexte(d)}</button>;
        }) : <span class="ce-vide">{t('ce_barre_seule')}</span>}
      </div>
      <div class="ce-ajouts">
        {DISQUES.map((d) => <button type="button" class="ce-plus-disque" onClick={() => maj({ disques: [...v.disques, d.kg].sort((a, b) => b - a) })}>+{kgTexte(d.kg)}</button>)}
      </div>
      <p class="ce-total">{t('ce_total', { kg: kgTexte(tot) })} · {texteDisques(v.disques)}</p>
    </div>
  );
}

/** Version A (23/11) : grande case Charge. Barre = total + par cote, les disques
 *  se montrent au toucher ; autres types = − / + avec le pas de l'app. */
function CaseCharge({ type, v, ouvert, basculer, maj }) {
  if (type === 'barre') {
    const tot = totalBarre(v.disques);
    const cote = v.disques.reduce((a, d) => a + d, 0);
    return (
      <button type="button" class={'ce-a-case ce-a-charge ce-a-case-bt' + (ouvert ? ' ouvert' : '')} onClick={basculer} aria-expanded={ouvert}>
        <span class="ce-a-lib">{t('ce_charge')}</span>
        <b class="ce-a-gros">{kgTexte(tot)} kg</b>
        <span class="ce-a-aide">{cote ? t('ce_par_cote', { kg: kgTexte(cote) }) : t('ce_barre_seule')} · {ouvert ? t('ce_fermer_disques') : t('ce_disques_bt')}</span>
      </button>
    );
  }
  const pas = pasCharge(type, v.kg);
  return (
    <div class="ce-a-case ce-a-charge">
      <span class="ce-a-lib">{t(type === 'halteres' ? 'ce_haltere' : type === 'kettlebell' ? 'ce_kettlebell' : 'ce_poids')}</span>
      <div class="ce-a-pm">
        <button type="button" aria-label="−" onClick={() => maj({ kg: Math.max(0, Math.round((v.kg - pas) * 100) / 100) })}>−</button>
        <input type="number" inputMode="decimal" min="0" max="500" step="0.5" value={v.kg || ''} placeholder="0"
          onChange={(ev) => maj({ kg: Math.max(0, Math.min(500, +String(ev.target.value).replace(',', '.') || 0)) })} />
        <button type="button" aria-label="+" onClick={() => maj({ kg: Math.round((v.kg + pas) * 100) / 100 })}>+</button>
      </div>
      <span class="ce-a-aide">kg</span>
    </div>
  );
}
function CaseReps({ v, cible, maj }) {
  const base = parseInt(String(cible || ''), 10);
  const val = v.reps !== null && v.reps !== undefined ? v.reps : null;
  const poser = (n) => maj({ reps: Math.max(0, Math.min(200, n)) });
  return (
    <div class="ce-a-case ce-a-reps">
      <span class="ce-a-lib">{t('ce_reps_faites')}</span>
      <div class="ce-a-pm">
        <button type="button" aria-label="−" onClick={() => poser((val === null ? (base || 1) : val) - 1)}>−</button>
        <input type="number" inputMode="numeric" min="0" max="200" step="1" value={val === null ? '' : val}
          placeholder={Number.isFinite(base) ? String(base) : '—'}
          onChange={(ev) => { const z = String(ev.target.value).trim(); maj({ reps: z === '' ? null : Math.max(0, Math.min(200, Math.round(+z) || 0)) }); }} />
        <button type="button" aria-label="+" onClick={() => poser((val === null ? (base || 0) - 1 : val) + 1)}>+</button>
      </div>
      <span class="ce-a-aide">{t('ce_objectif', { r: cible })}</span>
    </div>
  );
}

/** Repetitions faites sur la serie : − / + ; part des reps visees (premier nombre). */
function SaisieReps({ v, cible, maj }) {
  const base = parseInt(String(cible || ''), 10);
  const val = v.reps !== null && v.reps !== undefined ? v.reps : null;
  const poser = (n) => maj({ reps: Math.max(0, Math.min(200, n)) });
  return (
    <div class="ce-saisie ce-ligne ce-reps-faites">
      <p class="ce-lib">{t('ce_reps_faites')}</p>
      <div class="ce-pas">
        <button type="button" aria-label="−" onClick={() => poser((val === null ? (base || 1) : val) - 1)}>−</button>
        <input type="number" inputMode="numeric" min="0" max="200" step="1" value={val === null ? '' : val}
          placeholder={Number.isFinite(base) ? String(base) : '—'}
          onChange={(e) => { const s = String(e.target.value).trim(); maj({ reps: s === '' ? null : Math.max(0, Math.min(200, Math.round(+s) || 0)) }); }} />
        <span>reps</span>
        <button type="button" aria-label="+" onClick={() => poser((val === null ? (base || 0) - 1 : val) + 1)}>+</button>
      </div>
    </div>
  );
}

function SaisieKg({ type, v, maj }) {
  const pas = pasCharge(type, v.kg);
  const lib = type === 'halteres' ? 'ce_haltere' : type === 'kettlebell' ? 'ce_kettlebell' : 'ce_poids';
  return (
    <div class="ce-saisie ce-ligne">
      <p class="ce-lib">{t(lib)}</p>
      <div class="ce-pas">
        <button type="button" aria-label="−" onClick={() => maj({ kg: Math.max(0, Math.round((v.kg - pas) * 100) / 100) })}>−</button>
        <input type="number" inputMode="decimal" min="0" max="500" step="0.5" value={v.kg}
          onChange={(e) => maj({ kg: Math.max(0, Math.min(500, +String(e.target.value).replace(',', '.') || 0)) })} />
        <span>kg</span>
        <button type="button" aria-label="+" onClick={() => maj({ kg: Math.round((v.kg + pas) * 100) / 100 })}>+</button>
      </div>
    </div>
  );
}

export function CoachEntrainement() {
  const ent = entrainementCoach.value;
  const seances = ent && Array.isArray(ent.seances) ? ent.seances : [];
  const auj = new Date();
  const jourAuj = auj.getDay();
  const parDefaut = () => { const s = seances.find((x) => x.jour === jourAuj); return (s || seances[0] || {}).id || null; };
  const [choix, setChoix] = useState(parDefaut);
  const seance = seances.find((s) => s.id === choix) || seances[0] || null;
  const cle = seance ? isoJour(auj) + '|' + seance.id : '';
  const [saisie, setSaisie] = useState(() => etatInitial(seance, cle));
  const [enregistre, setEnregistre] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [grande, setGrande] = useState(null); // { imgId, n, nom }
  // Changement de seance, nouveau programme, ou carnet charge apres coup : on repart du carnet.
  const livre = ent && ent.livreLe;
  const charge = carnetCharge.value;
  useEffect(() => { setSaisie(etatInitial(seance, cle)); setEnregistre(false); }, [cle, livre, charge]);
  const [remplir, setRemplir] = useState(false);
  const [disques, setDisques] = useState(null);   // exercice dont les disques sont ouverts
  const etatQ = etatQuestEnt();

  if (remplir) return (
    <QuestionnaireCoach type="entrainement" precedentes={precedentesEnt(etatQ.q)}
      onFermer={() => setRemplir(false)}
      onTermine={(reponses, alerte, extra) => { envoyerQuestEnt(reponses, alerte, extra); effacerBrouillon('entrainement'); setRemplir(false); }} />
  );
  if (!ent || !seances.length) return <Indisponible ouvrir={() => setRemplir(true)} />;

  const jours = t('ce_jours').split(',');
  // Modifie la serie i de l'exercice id ; `actif` change la serie en cours.
  const majSerie = (id, i, champ) => { setEnregistre(false); setSaisie((s) => {
    const e = s[id]; const series = e.series.map((y, k) => (k === i ? { ...y, ...champ } : y));
    return { ...s, [id]: { ...e, series } };
  }); };
  const activer = (id, i) => setSaisie((s) => ({ ...s, [id]: { ...s[id], actif: i } }));
  const cocher = (id, i) => { setEnregistre(false); setSaisie((s) => {
    const e = s[id]; const fait = !e.series[i].fait;
    const series = e.series.map((y, k) => (k === i ? { ...y, fait } : y));
    // Serie cochee : on passe a la suivante, qui part de zero.
    const actif = fait && i === e.actif && i + 1 < series.length ? i + 1 : e.actif;
    return { ...s, [id]: { ...e, series, actif } };
  }); };
  const majNote = (id, note) => { setEnregistre(false); setSaisie((s) => ({ ...s, [id]: { ...s[id], note: note.slice(0, 300) } })); };
  const enregistrer = () => {
    const exos = {};
    seance.exos.forEach((x) => {
      const e = saisie[x.id] || { series: [] };
      const series = e.series.map((y) => ({ ...(x.type === 'barre'
        ? { kg: totalBarre(y.disques), disques: y.disques, fait: y.fait }
        : { kg: x.type === 'corps' ? null : y.kg, fait: y.fait }), ...(y.reps > 0 ? { reps: y.reps } : {}) }));
      const kgs = series.map((y) => y.kg).filter((k) => k !== null && k > 0);
      const avecReps = series.some((y) => y.reps > 0);
      const note = String(e.note || '').trim();
      exos[x.id] = { nom: x.nom, reps: String(x.reps || ''), series, faites: series.map((y) => y.fait), ...(note ? { note } : {}),
        kg: kgs.length ? Math.max(...kgs) : null,
        // « 20×10 / 25×8 » (kg × reps) ; reps seules pour le poids du corps.
        detail: kgs.length || avecReps ? series.map((y) => (y.kg ? kgTexte(y.kg) : (x.type === 'corps' ? '' : '–')) + (y.reps > 0 ? (y.kg ? '×' : '') + y.reps : '')).join(' / ') : '' };
    });
    noterSeance(cle, { date: isoJour(auj), seance: seance.nom, le: new Date().toISOString(), exos });
    setEnregistre(true);
  };

  return (
    <div class="ce-page">
      <p class="ce-h">{t('ce_titre')}</p>
      <p class="ce-sous">{t('ce_recu', { q: depuisTxt(ent.livreLe) })}</p>
      {etatQ.aRemplir && (
        <div class="ce-bandeau-quest" role="status">
          <p>{t('ce_quest_bandeau')}</p>
          <button type="button" onClick={() => setRemplir(true)}>{t('ce_quest_bt')}</button>
        </div>
      )}

      {seances.length > 1 && (
        <div class="ce-seances" role="tablist">
          {seances.map((s) => (
            <button type="button" role="tab" aria-selected={s.id === seance.id} class={s.id === seance.id ? 'on' : ''} onClick={() => setChoix(s.id)}>
              <b>{s.nom}</b>
              {s.jour !== null && s.jour !== undefined && <span>{s.jour === jourAuj ? t('ce_aujourdhui') : jours[s.jour]}</span>}
            </button>
          ))}
        </div>
      )}

      {seance.exos.map((x) => {
        const e = saisie[x.id] || { series: [serieVide()], actif: 0 };
        const a = Math.min(e.actif, e.series.length - 1);
        const v = e.series[a];
        const prec = dernierPour(x.id, cle);
        const avant = a > 0 ? e.series[a - 1] : null;
        const vide = x.type === 'barre' ? !v.disques.length : !(v.kg > 0);
        const avantPlein = avant && (x.type === 'barre' ? avant.disques.length : avant.kg > 0);
        const rs = repsParSerie(x.reps, e.series.length);
        return (
          <section class="ce-carte ce-a" key={x.id}>
            {/* 23/11 Raci (version A) : tableau des series + saisie de la serie en cours. */}
            <header class="ce-a-tete">
              <b class="ce-a-nom">{x.nom}</b>
              <span class="ce-a-sous">{t('ce_n_series', { n: e.series.length })} · {t('ce_type_' + x.type)}
                {imgDe(x) && <button type="button" class="ce-a-voir" aria-expanded={photo === x.id}
                  onClick={() => setPhoto(photo === x.id ? null : x.id)}>{t('ce_voir')} {photo === x.id ? '▴' : '▾'}</button>}
              </span>
              {prec && <span class="ce-a-sous">{t('ce_derniere', { v: valeurTxt(prec) })}</span>}
            </header>
            {photo === x.id && imgDe(x) && (
              <button type="button" class="ce-vignette" aria-label={x.nom}
                onClick={() => setGrande({ imgId: imgDe(x), nom: x.nom })}>
                <AnimExo imgId={imgDe(x)} alt={x.nom} />
              </button>
            )}
            {x.note && <p class="ce-consigne">{x.note}</p>}
            <div class="ce-a-tab" role="table">
              <div class="ce-a-ligne ce-a-hd" role="row">
                <span>{t('ce_col_serie')}</span><span>{t('ce_col_obj')}</span><span class="ce-a-c-charge">{x.type === 'corps' ? '' : t('ce_col_charge')}</span><span class="ce-a-c-reps">{t('ce_col_reps')}</span><span />
              </div>
              {e.series.map((y, i) => (
                <div role="row" class={'ce-a-ligne' + (i === a ? ' on' : '') + (y.fait ? ' fait' : '')} onClick={() => activer(x.id, i)}>
                  <span class="ce-a-num">{i + 1}</span>
                  <span><i class="ce-a-obj">{rs[i]}</i></span>
                  <span class="ce-a-val ce-a-c-charge">{x.type === 'corps' ? '' : (x.type === 'barre' ? (y.disques.length || y.fait) : kgSerie(x.type, y) > 0) ? kgTexte(kgSerie(x.type, y)) + ' kg' : '—'}</span>
                  <span class="ce-a-val ce-a-c-reps">{y.reps > 0 ? y.reps : '—'}</span>
                  <button type="button" class={'ce-coche' + (y.fait ? ' on' : '')} aria-pressed={y.fait}
                    aria-label={t('ce_serie_n', { n: i + 1 })} onClick={(ev) => { ev.stopPropagation(); cocher(x.id, i); }}>✓</button>
                </div>
              ))}
            </div>
            <div class="ce-a-saisie">
              <p class="ce-a-encours">{t('ce_en_cours', { n: a + 1 })}
                {vide && avantPlein && <button type="button" class="ce-reprendre"
                  onClick={() => majSerie(x.id, a, x.type === 'barre' ? { disques: avant.disques.slice(), reps: avant.reps } : { kg: avant.kg, reps: avant.reps })}>{t('ce_comme', { n: a })}</button>}
              </p>
              <div class={'ce-a-cases' + (x.type === 'corps' ? ' seule' : '')}>
                {x.type !== 'corps' && <CaseCharge type={x.type} v={v} ouvert={disques === x.id}
                  basculer={() => setDisques(disques === x.id ? null : x.id)} maj={(c) => majSerie(x.id, a, c)} />}
                <CaseReps v={v} cible={rs[a]} maj={(c) => majSerie(x.id, a, c)} />
              </div>
              {x.type === 'barre' && disques === x.id && <SaisieBarre v={v} maj={(c) => majSerie(x.id, a, c)} />}
              <button type="button" class={'ce-a-valider' + (v.fait ? ' ok' : '')} onClick={() => { if (!v.fait) { cocher(x.id, a); setDisques(null); } }}>
                {v.fait ? t('ce_validee', { n: a + 1 }) : t('ce_valider', { n: a + 1 })}
              </button>
              <NoteExo valeur={e.note || ''} avant={derniereNote(x.id, cle)} maj={(nv) => majNote(x.id, nv)} />
            </div>
          </section>
        );
      })}

      {grande && <PhotoGrande {...grande} fermer={() => setGrande(null)} />}

      {ent.note && (
        <section class="ce-note"><b>{t('ce_mot')}</b><p>{ent.note}</p></section>
      )}

      <button type="button" class={'ce-enregistrer' + (enregistre ? ' ok' : '')} onClick={enregistrer}>
        {enregistre ? '✓ ' + t('ce_enregistre') : t('ce_enregistrer')}
      </button>
    </div>
  );
}

// 21/11 Raci : la bascule vit en haut de la page Aujourd'hui (l'alimentation),
// pas dans l'onglet Coach, et pas de cinquieme onglet. Choix memorise.
const CLE_ESPACE = 'belfit_jour_espace';
let espaceInitial = 'alim';
try { if (localStorage.getItem(CLE_ESPACE) === 'ent') espaceInitial = 'ent'; } catch (e) { /* rien */ }
export const espaceJour = signal(espaceInitial);
export function choisirEspaceJour(e) {
  espaceJour.value = e;
  try { localStorage.setItem(CLE_ESPACE, e); } catch (x) { /* rien */ }
}

/** Bascule Alimentation / Entrainement, tout en haut de la page Aujourd'hui. */
export function BasculeCoach({ espace = espaceJour.value, choisir = choisirEspaceJour }) {
  return (
    <div class="ce-bascule" role="tablist">
      <button type="button" role="tab" aria-selected={espace === 'alim'} class={espace === 'alim' ? 'on-alim' : ''} onClick={() => choisir('alim')}>{t('ce_alim')}</button>
      <button type="button" role="tab" aria-selected={espace === 'ent'} class={espace === 'ent' ? 'on-ent' : ''} onClick={() => choisir('ent')}>{t('ce_ent')}</button>
    </div>
  );
}
