import { useState, useRef, useEffect } from 'preact/hooks';
import { calculerBesoins } from '../data/tdee.js';
import { setObjectifs, calculBaseFait, poidsCalcul, objectifs, profilBesoins } from '../store/journal.js';
import '../styles/besoins.css';
import { sexe } from '../store/perso.js';
import { SANS_COMPTE } from '../acces-invite.js';
import { deconnexion } from '../services/firebase.js';
import { signal } from '@preact/signals';
import { allerOnglet } from './BottomNav.jsx';
import { origineCalc } from './BelfitPlus.jsx';
import { ecritureBloquee, lectureSeule } from '../store/acces-nutrition.js';

export const besoinsOuverts = signal(false);

// ============================================================
// BESOINS — A taille : un chiffre, six questions, un bouton.
// ============================================================

const JOURS = [0, 1, 2, 3, 4, 5, 6];
const ACT = {
  assis: [
    { val: 1.2, label: 'Bureau' },
    { val: 1.3, label: 'Un peu de marche' },
  ],
  debout: [
    { val: 1.45, label: 'Un peu' },
    { val: 1.55, label: 'Souvent' },
  ],
  physique: [
    { val: 1.6, label: 'Léger' },
    { val: 1.75, label: 'Intense' },
  ],
};
const SOUS = {
  perte: [
    { val: -300, label: 'Sèche douce' },
    { val: -500, label: 'Sèche' },
  ],
  prise: [
    { val: 300, label: 'Propre' },
    { val: 500, label: 'Masse' },
  ],
};

const R_ANNEAU = 50;
const C_ANNEAU = 2 * Math.PI * R_ANNEAU;

function Anneau({ prot, carbs, lip, centre }) {
  const kp = (+prot || 0) * 4, kg = (+carbs || 0) * 4, kl = (+lip || 0) * 9;
  const tot = kp + kg + kl;
  const seg = tot > 0
    ? [kp / tot, kg / tot, kl / tot].map((x) => x * C_ANNEAU)
    : [0, 0, 0];
  const traits = [
    { c: 'var(--mac-prot)', l: seg[0], o: 0 },
    { c: 'var(--mac-carbs)', l: seg[1], o: -seg[0] },
    { c: 'var(--mac-lip)', l: seg[2], o: -(seg[0] + seg[1]) },
  ];
  return (
    <div class="bs-anneau">
      <svg viewBox="0 0 118 118" aria-hidden="true">
        <circle cx="59" cy="59" r={R_ANNEAU} fill="none" stroke="var(--piste-anneau, #EFEAE0)" stroke-width="11" />
        {traits.map((t, i) => (
          <circle key={i} cx="59" cy="59" r={R_ANNEAU} fill="none" stroke={t.c} stroke-width="11"
            stroke-dasharray={`${t.l.toFixed(1)} ${(C_ANNEAU - t.l).toFixed(1)}`}
            stroke-dashoffset={t.o.toFixed(1)} />
        ))}
      </svg>
      <div class="bs-anneau-mid">
        <b>{centre}</b>
        <span>kcal</span>
      </div>
    </div>
  );
}

function Roue({ min, max, pas, valeur, onChange, unite, rapport = 0.7 }) {
  const piste = useRef(null);
  const cadre = useRef(null);
  const drag = useRef(null);
  const H = 44;
  const vals = [];
  for (let v = min; v <= max + 1e-6; v += pas) vals.push(Math.round(v * 10) / 10);
  const idxDe = (v) => {
    let i = 0, d = Infinity;
    vals.forEach((x, n) => {
      const e = Math.abs(x - v);
      if (e < d) { d = e; i = n; }
    });
    return i;
  };
  const poser = (top) => {
    const el = piste.current;
    if (!el) return;
    const i = Math.max(0, Math.min(vals.length - 1, Math.round(top / H)));
    el.scrollTop = i * H;
    const v = vals[i];
    if (v !== valeur) onChange(v);
  };

  useEffect(() => {
    const el = piste.current;
    if (el) el.scrollTop = idxDe(valeur) * H;
  }, []);

  useEffect(() => {
    const box = cadre.current;
    if (!box) return;
    const move = (e) => {
      if (!drag.current || !piste.current) return;
      const t = e.touches && e.touches[0];
      const y = t ? t.clientY : e.clientY;
      if (y == null) return;
      piste.current.scrollTop = drag.current.top - (y - drag.current.y) * drag.current.rapport;
      if (e.cancelable) e.preventDefault();
    };
    box.addEventListener('touchmove', move, { passive: false });
    return () => box.removeEventListener('touchmove', move);
  }, []);

  const down = (e) => {
    const el = piste.current;
    if (!el) return;
    const y = e.clientY;
    drag.current = { y, top: el.scrollTop, rapport };
    if (e.pointerId != null) e.currentTarget.setPointerCapture(e.pointerId);
  };
  const movePtr = (e) => {
    if (!drag.current || !piste.current) return;
    if (e.pointerType === 'touch') return;
    piste.current.scrollTop = drag.current.top - (e.clientY - drag.current.y) * drag.current.rapport;
  };
  const up = (e) => {
    if (!drag.current || !piste.current) return;
    poser(piste.current.scrollTop);
    drag.current = null;
    if (e.pointerId != null) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) { /* deja relache */ }
    }
  };

  return (
    <div class="bs-roue-cadre" ref={cadre}
      onPointerDown={down} onPointerMove={movePtr} onPointerUp={up} onPointerCancel={up}>
      <div class="bs-roue" ref={piste}>
        {vals.map((v) => {
          const txt = (Math.round(v * 10) / 10).toFixed(pas < 1 ? 1 : 0).replace(/\.0$/, '');
          return (
            <div class={'bs-roue-item' + (v === valeur ? ' on' : '')} key={v}>{txt} {unite}</div>
          );
        })}
      </div>
    </div>
  );
}

function familleDe(n) {
  if (n < 0) return 'perte';
  if (n > 0) return 'prise';
  return 'maintien';
}

function famActDe(n) {
  if (n <= 1.3) return 'assis';
  if (n < 1.6) return 'debout';
  return 'physique';
}

export function Besoins() {
  const p = profilBesoins.value || {};
  const peutFermer = besoinsOuverts.value;
  const [f, setF] = useState({
    sexe: p.sexe || sexe.value || 'h',
    age: p.age || 30,
    poids: p.poids || 75,
    taille: p.taille || 175,
    activiteBase: p.activiteBase || 1.45,
    joursEntrainement: p.joursEntrainement ?? 4,
    ajustement: p.ajustement ?? 300,
  });
  const [mode, setMode] = useState(p.mode === 'manuel' ? 'manuel' : 'calc');
  const [roue, setRoue] = useState(null);
  const [actOuvert, setActOuvert] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [man, setMan] = useState({
    kcal: p.kcal || 0, prot: p.prot || 0, carbs: p.carbs || 0, lip: p.lip || 0,
  });
  const partRef = useRef(null);

  const maj = (cle, val) => {
    if (cle === 'sexe') sexe.value = val;
    setF((o) => ({ ...o, [cle]: val }));
  };

  const r = calculerBesoins({
    ...f,
    age: +f.age || 30, poids: +f.poids || 75, taille: +f.taille || 175,
    masseGrasse: NaN,
    intensiteEntrainement: 0.03,
    joursEntrainement: Math.max(0, +f.joursEntrainement || 0),
  });

  const passerManuel = () => {
    const suite = { kcal: r.kcal, prot: r.prot, carbs: r.carbs, lip: r.lip };
    const base = suite.prot * 4 + suite.carbs * 4 + suite.lip * 9;
    partRef.current = base > 0
      ? { prot: suite.prot / base, carbs: suite.carbs / base, lip: suite.lip / base }
      : { prot: 0.25, carbs: 0.5, lip: 0.25 };
    setMan(suite);
    setRoue(null);
    setMode('manuel');
  };

  const majMan = (cle, val) => setMan((o) => {
    const v = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
    if (cle !== 'kcal') {
      const suite = { ...o, [cle]: v };
      const base = (+suite.prot || 0) * 4 + (+suite.carbs || 0) * 4 + (+suite.lip || 0) * 9;
      if (base > 0) {
        partRef.current = {
          prot: (+suite.prot || 0) / base,
          carbs: (+suite.carbs || 0) / base,
          lip: (+suite.lip || 0) / base,
        };
      }
      return suite;
    }
    if (v === '' || v <= 0) return { ...o, kcal: v };
    const p = partRef.current || { prot: 0.25, carbs: 0.5, lip: 0.25 };
    return {
      kcal: v,
      prot: Math.round(p.prot * v),
      carbs: Math.round(p.carbs * v),
      lip: Math.round(p.lip * v),
    };
  });

  const aff = mode === 'manuel' ? man : r;
  const kcalAff = Math.round(+aff.kcal || 0);
  const kcalMacros = Math.round((+aff.prot || 0) * 4 + (+aff.carbs || 0) * 4 + (+aff.lip || 0) * 9);
  const centre = mode === 'manuel' ? kcalMacros : kcalAff;
  const fam = familleDe(+f.ajustement);
  const famAct = famActDe(+f.activiteBase);
  const toggleRoue = (cle) => {
    setActOuvert(null);
    setRoue((x) => x === cle ? null : cle);
  };

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const oh = html.style.overflow, ob = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';
    return () => {
      html.style.overflow = oh;
      body.style.overflow = ob;
      html.style.overscrollBehavior = '';
      body.style.overscrollBehavior = '';
    };
  }, []);

  useEffect(() => {
    if (!roue) return;
    const fermer = (e) => {
      if (e.target.closest('.bs-roue-cadre, .bs-trio')) return;
      e.preventDefault();
      e.stopPropagation();
      setRoue(null);
    };
    document.addEventListener('pointerdown', fermer, true);
    return () => document.removeEventListener('pointerdown', fermer, true);
  }, [roue]);

  const poserFamille = (famille) => {
    if (famille === 'perte') maj('ajustement', +f.ajustement < 0 ? f.ajustement : -300);
    else if (famille === 'prise') maj('ajustement', +f.ajustement > 0 ? f.ajustement : 300);
    else maj('ajustement', 0);
  };

  const poserAct = (famille) => {
    if (actOuvert === famille) { setActOuvert(null); return; }
    setActOuvert(famille);
    const liste = ACT[famille];
    const cur = +f.activiteBase;
    if (!liste.some((s) => s.val === cur)) maj('activiteBase', liste[0].val);
  };

  const valider = () => {
    if (ecritureBloquee()) return;   // alimentation fermee : calcul consultable, pas applicable
    setEnvoi(true);
    if (mode === 'manuel') {
      setObjectifs({
        kcal: +man.kcal || 0,
        prot: +man.prot || 0,
        carbs: +man.carbs || 0,
        lip: +man.lip || 0,
      });
    } else {
      setObjectifs({ kcal: r.kcal, prot: r.prot, carbs: r.carbs, lip: r.lip });
      poidsCalcul.value = +f.poids || null;
    }
    profilBesoins.value = mode === 'manuel'
      ? { ...f, mode: 'manuel', kcal: +man.kcal, prot: +man.prot, carbs: +man.carbs, lip: +man.lip }
      : { ...f, mode: 'calc' };
    calculBaseFait.value = true;
    besoinsOuverts.value = false;
  };

  const fermer = () => {
    besoinsOuverts.value = false;
    if (origineCalc.value === 'programme') {
      origineCalc.value = null;
      allerOnglet('plus');
    }
  };

  return (
    <div class={'pg-besoins' + (roue ? ' roue-on' : '')}>
      {peutFermer && (
        <button class="bs-fermer" type="button" onClick={fermer} aria-label="Fermer">×</button>
      )}
      <div class="bs-haut">
        <Anneau prot={aff.prot} carbs={aff.carbs} lip={aff.lip} centre={centre} />
        <div class="bs-macs">
          <span><i style={{ background: 'var(--mac-prot)' }} />{Math.round(+aff.prot || 0)} P</span>
          <span><i style={{ background: 'var(--mac-carbs)' }} />{Math.round(+aff.carbs || 0)} G</span>
          <span><i style={{ background: 'var(--mac-lip)' }} />{Math.round(+aff.lip || 0)} L</span>
        </div>
        <p class="bs-kicker">Tes besoins</p>
      </div>

      <div class="bs-corps">
        <div class="bs-carte">
        {mode === 'calc' ? (
          <div class="bs-form">
            <div class="bs-seg" role="group" aria-label="Sexe">
              <button class={f.sexe === 'h' ? 'on' : ''} onClick={() => maj('sexe', 'h')}>Homme</button>
              <button class={f.sexe === 'f' ? 'on' : ''} onClick={() => maj('sexe', 'f')}>Femme</button>
            </div>

            <div class="bs-trio">
              <button class={'bs-chip' + (roue === 'age' ? ' on' : '')} onClick={() => toggleRoue('age')}>
                {f.age} ans
              </button>
              <button class={'bs-chip' + (roue === 'poids' ? ' on' : '')} onClick={() => toggleRoue('poids')}>
                {String(f.poids).replace(/\.0$/, '')} kg
              </button>
              <button class={'bs-chip' + (roue === 'taille' ? ' on' : '')} onClick={() => toggleRoue('taille')}>
                {f.taille} cm
              </button>
            </div>
            {roue === 'age' && <Roue key="age" min={16} max={80} pas={1} valeur={+f.age} unite="ans" onChange={(v) => maj('age', v)} />}
            {roue === 'poids' && <Roue key="poids" min={40} max={180} pas={1} valeur={+f.poids} unite="kg" onChange={(v) => maj('poids', v)} />}
            {roue === 'taille' && <Roue key="taille" min={140} max={210} pas={1} valeur={+f.taille} unite="cm" onChange={(v) => maj('taille', v)} />}

            {!roue && (
              <>
                <div class="bs-pills" role="group" aria-label="Au quotidien">
                  <button class={famAct === 'assis' ? 'on' : ''} onClick={() => poserAct('assis')}>Assis</button>
                  <button class={famAct === 'debout' ? 'on' : ''} onClick={() => poserAct('debout')}>Debout</button>
                  <button class={famAct === 'physique' ? 'on' : ''} onClick={() => poserAct('physique')}>Physique</button>
                </div>
                {actOuvert && (
                  <div class="bs-sous" role="group">
                    {ACT[actOuvert].map((s) => (
                      <button key={s.val} class={+f.activiteBase === s.val ? 'on' : ''}
                        onClick={() => { maj('activiteBase', s.val); setActOuvert(null); }}>{s.label}</button>
                    ))}
                  </div>
                )}

                <p class="bs-etape">Sport par semaine</p>
                <div class="bs-jours" role="group" aria-label="Sport par semaine">
                  {JOURS.map((j) => (
                    <button key={j} class={+f.joursEntrainement === j ? 'on' : ''}
                      onClick={() => maj('joursEntrainement', j)}>{j}</button>
                  ))}
                </div>

                <p class="bs-etape">Objectif</p>
                <div class="bs-fam" role="group" aria-label="Objectif">
                  <button class={fam === 'perte' ? 'on' : ''} onClick={() => poserFamille('perte')}>Perte</button>
                  <button class={fam === 'maintien' ? 'on' : ''} onClick={() => poserFamille('maintien')}>Maintien</button>
                  <button class={fam === 'prise' ? 'on' : ''} onClick={() => poserFamille('prise')}>Prise</button>
                </div>
                {SOUS[fam] && (
                  <div class="bs-sous" role="group">
                    {SOUS[fam].map((s) => (
                      <button key={s.val} class={+f.ajustement === s.val ? 'on' : ''}
                        onClick={() => maj('ajustement', s.val)}>{s.label}</button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div class="bs-form">
            <label class="bs-kcal-man">
              <input type="number" inputMode="numeric" value={man.kcal}
                onInput={(e) => majMan('kcal', e.currentTarget.value)} />
              <span>kcal</span>
            </label>
            <div class="bs-macros-man">
              <label>P<input type="number" inputMode="numeric" value={man.prot}
                onInput={(e) => majMan('prot', e.currentTarget.value)} /></label>
              <label>G<input type="number" inputMode="numeric" value={man.carbs}
                onInput={(e) => majMan('carbs', e.currentTarget.value)} /></label>
              <label>L<input type="number" inputMode="numeric" value={man.lip}
                onInput={(e) => majMan('lip', e.currentTarget.value)} /></label>
            </div>
          </div>
        )}
        <button class="bs-valider" onClick={valider} disabled={envoi || lectureSeule.value || (mode === 'manuel' && !(+man.kcal > 0))}>
          {envoi ? '…' : "C'est parti"}
        </button>
        {/* 02/10 (Raci) : plus de saisie manuelle des calories, le calcul
            est le seul chemin. passerManuel reste en place, inutilise. */}
        {mode !== 'calc' && (
          <button class="bs-lien" type="button" onClick={() => setMode('calc')}>Revenir au calcul</button>
        )}
        {!peutFermer && (
          <button class="bs-lien" type="button" onClick={() => deconnexion()}>Se déconnecter</button>
        )}
        </div>
      </div>
    </div>
  );
}

const DEFAUT_KCAL = 4300;
export function besoinsRequis() {
  if (SANS_COMPTE) return false;
  if (calculBaseFait.value) return false;
  if (lectureSeule.value) return false;   // alimentation fermee : pas de calcul force
  const o = objectifs.value || {};
  return o.kcal === DEFAUT_KCAL && o.prot === 217 && o.carbs === 538 && o.lip === 96;
}
