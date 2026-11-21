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
import { entrainementCoach } from './BelfitPlus.jsx';
import { carnetCoach, carnetCharge, noterSeance, dernierPour } from '../store/carnet-coach.js';
import { DISQUES, totalBarre, texteDisques, pasCharge, kgTexte } from '../data/charge-coach.js';
import { t } from '../i18n/index.js';
import '../styles/coach-entrainement.css';

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

/** Etat de saisie d'une seance. 21/11 Raci : un poids PAR SERIE (serie 1 a
 *  10+5, serie 2 a 25...). Une serie neuve part de zero ; on peut reprendre la
 *  precedente d'un geste. Seule la seance deja notee aujourd'hui est rechargee. */
const serieVide = () => ({ disques: [], kg: 0, fait: false });
function etatInitial(seance, cle) {
  const jour = carnetCoach.peek()[cle];
  const e = {};
  (seance ? seance.exos : []).forEach((x) => {
    const deja = jour && jour.exos && jour.exos[x.id];
    const n = Math.max(1, +x.series || 3);
    const series = Array.from({ length: n }, (_, i) => {
      const d = deja && Array.isArray(deja.series) ? deja.series[i] : null;
      return d ? { disques: Array.isArray(d.disques) ? d.disques.slice() : [], kg: +d.kg || 0, fait: !!d.fait } : serieVide();
    });
    const actif = Math.max(0, series.findIndex((y) => !y.fait));
    e[x.id] = { series, actif: actif === -1 ? 0 : actif };
  });
  return e;
}

/** Charge d'une serie, lisible : « 50 kg · 1 × 10 + 1 × 5 » ou « — ». */
function chargeSerie(type, v) {
  if (type === 'corps') return '';
  if (type === 'barre') return v.disques.length ? kgTexte(totalBarre(v.disques)) + ' kg · ' + texteDisques(v.disques) : t('ce_barre_seule') + ' · 20 kg';
  return v.kg > 0 ? kgTexte(v.kg) + ' kg' : '—';
}
const kgSerie = (type, v) => (type === 'barre' ? totalBarre(v.disques) : type === 'corps' ? null : v.kg);

function Indisponible() {
  return (
    <div class="ce-indispo">
      <div class="ce-flou" aria-hidden="true">
        <p class="ce-h">{t('ce_titre')}</p>
        {[['Squat', '4 × 6-8', '2 × 20'], ['Leg press', '3 × 10-12', '120 kg'], ['Lat pulldown', '3 × 10', '55 kg']].map(([n, s, v]) => (
          <div class="ce-carte"><b>{n}</b><span>{s} · {v}</span></div>
        ))}
      </div>
      <div class="ce-voile">
        <div class="ce-voile-carte" role="status">
          <span class="ce-cadenas" aria-hidden="true">
            <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
          </span>
          <p class="ce-voile-t">{t('ce_indispo_t')}</p>
          <p class="ce-voile-txt">{t('ce_indispo_txt')}</p>
        </div>
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
  // Changement de seance, nouveau programme, ou carnet charge apres coup : on repart du carnet.
  const livre = ent && ent.livreLe;
  const charge = carnetCharge.value;
  useEffect(() => { setSaisie(etatInitial(seance, cle)); setEnregistre(false); }, [cle, livre, charge]);

  if (!ent || !seances.length) return <Indisponible />;

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
    return { ...s, [id]: { series, actif } };
  }); };
  const enregistrer = () => {
    const exos = {};
    seance.exos.forEach((x) => {
      const e = saisie[x.id] || { series: [] };
      const series = e.series.map((y) => (x.type === 'barre'
        ? { kg: totalBarre(y.disques), disques: y.disques, fait: y.fait }
        : { kg: x.type === 'corps' ? null : y.kg, fait: y.fait }));
      const kgs = series.map((y) => y.kg).filter((k) => k !== null && k > 0);
      exos[x.id] = { nom: x.nom, series, faites: series.map((y) => y.fait),
        kg: kgs.length ? Math.max(...kgs) : null,
        detail: kgs.length ? series.map((y) => (y.kg ? kgTexte(y.kg) : '–')).join(' / ') : '' };
    });
    noterSeance(cle, { date: isoJour(auj), seance: seance.nom, le: new Date().toISOString(), exos });
    setEnregistre(true);
  };

  return (
    <div class="ce-page">
      <p class="ce-h">{t('ce_titre')}</p>
      <p class="ce-sous">{t('ce_recu', { q: depuisTxt(ent.livreLe) })}</p>

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
        return (
          <section class="ce-carte" key={x.id}>
            <header>
              <div>
                <b>{x.nom}</b>
                <span>{t('ce_series', { n: x.series, r: x.reps })}{prec ? ' · ' + t('ce_derniere', { v: valeurTxt(prec) }) : ''}</span>
              </div>
              <em class="ce-tag">{t('ce_type_' + x.type)}</em>
            </header>
            <ol class="ce-liste">
              {e.series.map((y, i) => (
                <li class={(i === a && x.type !== 'corps' ? 'actif ' : '') + (y.fait ? 'fait' : '')}>
                  <button type="button" class="ce-ligne-serie" onClick={() => activer(x.id, i)} aria-current={i === a}>
                    <span class="ce-num">{t('ce_serie_n', { n: i + 1 })}</span>
                    <span class="ce-val">{chargeSerie(x.type, y)}</span>
                  </button>
                  <button type="button" class={'ce-coche' + (y.fait ? ' on' : '')} aria-pressed={y.fait}
                    aria-label={t('ce_serie_n', { n: i + 1 })} onClick={() => cocher(x.id, i)}>✓</button>
                </li>
              ))}
            </ol>
            {x.type !== 'corps' && (
              <div class="ce-edition">
                <p class="ce-edition-t">{t('ce_serie_n', { n: a + 1 })}
                  {vide && avantPlein && <button type="button" class="ce-reprendre"
                    onClick={() => majSerie(x.id, a, x.type === 'barre' ? { disques: avant.disques.slice() } : { kg: avant.kg })}>{t('ce_comme', { n: a })}</button>}
                </p>
                {x.type === 'barre'
                  ? <SaisieBarre v={v} maj={(c) => majSerie(x.id, a, c)} />
                  : <SaisieKg type={x.type} v={v} maj={(c) => majSerie(x.id, a, c)} />}
              </div>
            )}
            {x.type === 'corps' && <p class="ce-lib ce-corps">{t('ce_corps')}</p>}
          </section>
        );
      })}

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
