import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { t } from '../i18n/index.js';

// ============================================================
// CHRONO DE REPOS v2 — reproduit fidelement le chrono v1 :
//   • bouton flottant (FAB) deplaçable, aimante au bord
//   • panneau qui monte avec molettes min/sec (scroll-snap)
//   • affichage 3 actes : 30s respiration / 10s battement / 5s sprint
// Le temps restant est CALCULE depuis un horodatage de fin
// (jamais decremente) : la veille / l'arriere-plan ne le faussent pas.
// ============================================================

const CLE = 'belfit_v2_chrono';
const CLE_POS = 'belfit_v2_chronoPos';
const MINUTES = Array.from({ length: 61 }, (_, i) => i);
const SECONDES = Array.from({ length: 12 }, (_, i) => i * 5);
// Molettes circulaires : la liste est triplee, on navigue dans le
// bloc central et on se recale silencieusement pres des bords.
// De 00 on peut ainsi remonter directement vers 59 (ou 55).
const MIN3 = [...MINUTES, ...MINUTES, ...MINUTES];
const SEC3 = [...SECONDES, ...SECONDES, ...SECONDES];
const H_ITEM = 50;

function chargerEtat() {
  try {
    const s = JSON.parse(localStorage.getItem(CLE));
    if (s && typeof s.preset === 'number') {
      // Ancien format (sans total) : on normalise pour eviter NaN
      return { endAt: s.endAt || null, preset: s.preset, total: (typeof s.total === 'number' ? s.total : s.preset) };
    }
  } catch {}
  return { endAt: null, preset: 90, total: 90 };
}

export function RestTimer({ fab = true, children } = {}) {
  const [etat, setEtat] = useState(chargerEtat);
  const [ouvert, setOuvert] = useState(false);
  const [, tick] = useState(0);

  const fabRef = useRef(null);
  const wheelMinRef = useRef(null);
  const wheelSecRef = useRef(null);
  const verrouRef = useRef(0);          // nb d'evenements de scroll programmatiques a ignorer
  const scrollTimerRef = useRef({ min: null, sec: null });

  const enCours = !!etat.endAt;
  const restant = enCours
    ? Math.max(0, Math.round((etat.endAt - Date.now()) / 1000))
    : etat.total;

  // Persistance
  useEffect(() => {
    try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch {}
  }, [etat]);

  // Re-render 4x/s tant que le chrono tourne
  useEffect(() => {
    if (!enCours) return;
    const it = setInterval(() => tick(x => x + 1), 250);
    return () => clearInterval(it);
  }, [enCours]);

  // Fin du chrono
  useEffect(() => {
    if (enCours && restant <= 0) {
      if (navigator.vibrate) { try { navigator.vibrate([150, 80, 150]); } catch {} }
      setEtat(e => ({ ...e, endAt: null, total: e.preset }));
    }
  }, [restant, enCours]);

  // Vibrations reperes (30s, 10s) + sprint (<=5s)
  useEffect(() => {
    if (!enCours || !navigator.vibrate) return;
    if (restant === 30 || restant === 10) { try { navigator.vibrate(25); } catch {} }
    else if (restant <= 5 && restant > 0) { try { navigator.vibrate(35); } catch {} }
  }, [restant, enCours]);

  const mm = String(Math.floor(restant / 60)).padStart(2, '0');
  const ss = String(restant % 60).padStart(2, '0');
  const classe = !enCours ? '' :
    restant <= 5 ? 't-crit' : restant <= 10 ? 't-warn' : restant <= 30 ? 't-approche' : '';

  // Surbrillance de l'item centre (comme updateWheelSel en v1)
  const majSel = (el) => {
    if (!el) return;
    const i = Math.round(el.scrollTop / H_ITEM);
    el.querySelectorAll('.v2-wheel-item').forEach((it, idx) => it.classList.toggle('sel', idx === i));
  };

  // Recentre la molette dans son bloc du milieu quand on approche
  // d'un bord (saut d'un bloc entier : strictement invisible).
  const recadrer = (el, taille) => {
    if (!el) return;
    const bloc = taille * H_ITEM;
    if (el.scrollTop < bloc * 0.5) { verrouRef.current += 1; el.scrollTop += bloc; }
    else if (el.scrollTop > bloc * 2.5) { verrouRef.current += 1; el.scrollTop -= bloc; }
  };

  // ---- Molettes : positionne sur une valeur (scroll programmatique) ----
  const calerMolettes = useCallback((total) => {
    const wm = wheelMinRef.current, ws = wheelSecRef.current;
    if (!wm || !ws) return;
    // On se place dans le bloc CENTRAL des listes triplees.
    const mi = Math.max(0, MINUTES.indexOf(Math.floor(total / 60)));
    const si = Math.max(0, SECONDES.indexOf(total % 60));
    const cibleM = (MINUTES.length + mi) * H_ITEM;
    const cibleS = (SECONDES.length + si) * H_ITEM;
    // Chaque affectation de scrollTop emettra un evenement scroll :
    // on les comptabilise pour les ignorer, sans fenetre temporelle
    // (un geste utilisateur immediat n'est ainsi jamais perdu).
    if (wm.scrollTop !== cibleM) verrouRef.current += 1;
    if (ws.scrollTop !== cibleS) verrouRef.current += 1;
    wm.scrollTop = cibleM;
    ws.scrollTop = cibleS;
    majSel(wm); majSel(ws);
  }, []);

  // Cale les molettes a l'ouverture du panneau
  useEffect(() => {
    if (ouvert) setTimeout(() => calerMolettes(etat.preset), 40);
  }, [ouvert]);

  // Applique le choix des molettes (vraie manip utilisateur)
  const appliquer = useCallback(() => {
    const wm = wheelMinRef.current, ws = wheelSecRef.current;
    if (!wm || !ws) return;
    const min = MINUTES[Math.round(wm.scrollTop / H_ITEM) % MINUTES.length] || 0;
    const sec = SECONDES[Math.round(ws.scrollTop / H_ITEM) % SECONDES.length] || 0;
    const duree = min * 60 + sec;
    if (duree <= 0) return;
    setEtat(e => {
      if (e.preset === duree && !e.endAt && e.total === duree) return e;   // rien de neuf
      return e.endAt
        // Chrono en cours : on le RELANCE sur la nouvelle duree (plus courte OU plus longue)
        ? { ...e, preset: duree, total: duree, endAt: Date.now() + duree * 1000 }
        : { ...e, preset: duree, total: duree };
    });
  }, []);

  // Listeners de scroll sur les molettes (snap → applique apres 120ms d'inactivite)
  useEffect(() => {
    if (!ouvert) return;
    const attach = (el, key) => {
      if (!el) return () => {};
      const onScroll = () => {
        if (verrouRef.current > 0) { verrouRef.current -= 1; majSel(el); return; }
        majSel(el);
        recadrer(el, key === 'min' ? MINUTES.length : SECONDES.length);
        clearTimeout(scrollTimerRef.current[key]);
        scrollTimerRef.current[key] = setTimeout(appliquer, 140);
      };
      el.addEventListener('scroll', onScroll, { passive: true });
      return () => el.removeEventListener('scroll', onScroll);
    };
    const d1 = attach(wheelMinRef.current, 'min');
    const d2 = attach(wheelSecRef.current, 'sec');
    return () => { d1(); d2(); };
  }, [ouvert, appliquer]);

  // ---- Boutons ----
  const startPause = () => {
    setEtat(e => {
      if (e.endAt) {
        // Pause : on fige le restant
        const r = Math.max(0, Math.round((e.endAt - Date.now()) / 1000));
        return { ...e, endAt: null, total: r };
      }
      const base = e.total > 0 ? e.total : e.preset;
      return { ...e, endAt: Date.now() + base * 1000, total: base };
    });
  };
  const reset = () => setEtat(e => ({ ...e, endAt: null, total: e.preset }));

  // ---- FAB : fixe au-dessus de la barre ----
  // Il etait deplaçable, avec sa position gardee en memoire. Deux
  // defauts : la position enregistree pouvait le loger DERRIERE la
  // barre de navigation, sans moyen de l'en sortir ; et le glissement
  // se declenchait parfois au lieu du clic. Le CSS le pose desormais
  // seul, a 74 px du bas — juste au-dessus de la barre, en toute
  // circonstance. Il flotte, il ne bouge plus.
  useEffect(() => {
    const fab = fabRef.current;
    if (!fab) return;

    // Une position enregistree par l'ancienne version resterait
    // appliquee en style en ligne : on la neutralise une fois.
    try { localStorage.removeItem(CLE_POS); } catch (e) {}
    fab.style.left = ''; fab.style.top = '';
    fab.style.right = ''; fab.style.bottom = '';

    const basculer = () => setOuvert(o => !o);
    fab.addEventListener('click', basculer);
    return () => { fab.removeEventListener('click', basculer); };
  }, []);

  const fabTime = enCours ? `${mm}:${ss}` : '';
  const api = { mm, ss, enCours, restant, ouvrir: () => setOuvert(true) };

  return (
    <>
      {ouvert && <div class="v2-timer-overlay show" onClick={() => setOuvert(false)} />}

      <div class={'v2-timer-container' + (ouvert ? ' show' : '')}>
        <div class="v2-timer-display">
          <div class="v2-timer-scene">
            {/* Onde de choc : une par seconde dans les 10 dernieres.
                La cle forcee relance l'animation a chaque battement. */}
            {enCours && restant <= 10 && restant > 0 && (
              <span class={'v2-onde ' + classe} key={'o' + restant} />
            )}
            {/* La cle change a chaque seconde : sans cela le navigateur
                ne rejoue pas l'animation, la classe restant identique. */}
            <div class={'v2-timer-big ' + classe} key={enCours ? restant : 'arret'}>
              {mm}:{ss}
            </div>
          </div>
          <div class="v2-timer-label">{t('chrono_titre')}</div>
        </div>
        <div class="v2-timer-wheels">
          <div class="v2-wheel-col">
            <div class="v2-wheel" ref={wheelMinRef}>
              <div style="height:50px" />
              {MIN3.map((v, i) => <div key={'m' + i} class="v2-wheel-item">{String(v).padStart(2, '0')}</div>)}
              <div style="height:50px" />
            </div>
            <div class="v2-wheel-unit">{t('chrono_min')}</div>
          </div>
          <div class="v2-wheel-sep">:</div>
          <div class="v2-wheel-col">
            <div class="v2-wheel" ref={wheelSecRef}>
              <div style="height:50px" />
              {SEC3.map((v, i) => <div key={'s' + i} class="v2-wheel-item">{String(v).padStart(2, '0')}</div>)}
              <div style="height:50px" />
            </div>
            <div class="v2-wheel-unit">{t('chrono_sec')}</div>
          </div>
          <div class="v2-wheel-highlight" />
        </div>
        <div class="v2-timer-controls">
          <button class="v2-timer-btn start" onClick={startPause}>
            {enCours ? t('chrono_pause') : (etat.total !== etat.preset && etat.total > 0 ? t('chrono_reprendre') : t('demarrer'))}
          </button>
          <button class="v2-timer-btn reset" onClick={reset}>{t('chrono_reset')}</button>
          <button class="v2-timer-btn reset" onClick={() => setOuvert(false)}>{t('chrono_fermer')}</button>
        </div>
      </div>

      {fab && (
        <button ref={fabRef} class={'v2-chrono-fab' + (enCours ? ' running' : '') + (enCours && restant <= 5 ? ' crit' : '')} aria-label={t('chrono_titre')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 13V9" /><path d="M9 2h6" /></svg>
          <span class="v2-chrono-fab-time">{fabTime}</span>
        </button>
      )}
      {typeof children === 'function' ? children(api) : children}
    </>
  );
}
