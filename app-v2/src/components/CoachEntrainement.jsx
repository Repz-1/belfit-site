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
  if (x.kg === null || x.kg === undefined) return x.detail || '';
  return kgTexte(x.kg) + ' kg' + (x.detail ? ' (' + x.detail + ')' : '');
}

/** Etat de saisie d'une seance : ce jour-la s'il existe, sinon les derniers poids. */
function etatInitial(seance, cle) {
  const jour = carnetCoach.peek()[cle];
  const e = {};
  (seance ? seance.exos : []).forEach((x) => {
    const deja = jour && jour.exos && jour.exos[x.id];
    const prec = deja || dernierPour(x.id, cle);
    const n = Math.max(1, +x.series || 3);
    e[x.id] = {
      disques: prec && Array.isArray(prec.disques) ? prec.disques.slice() : [],
      kg: prec && prec.kg !== null && prec.kg !== undefined && x.type !== 'barre' ? +prec.kg : 0,
      faites: deja && Array.isArray(deja.faites) ? Array.from({ length: n }, (_, i) => !!deja.faites[i]) : Array(n).fill(false),
    };
  });
  return e;
}

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
  const maj = (id, champ) => { setEnregistre(false); setSaisie((s) => ({ ...s, [id]: { ...s[id], ...champ } })); };
  const enregistrer = () => {
    const exos = {};
    seance.exos.forEach((x) => {
      const v = saisie[x.id] || { disques: [], kg: 0, faites: [] };
      if (x.type === 'barre') exos[x.id] = { nom: x.nom, kg: totalBarre(v.disques), detail: texteDisques(v.disques), disques: v.disques, faites: v.faites };
      else if (x.type === 'corps') exos[x.id] = { nom: x.nom, kg: null, detail: '', faites: v.faites };
      else exos[x.id] = { nom: x.nom, kg: v.kg, detail: '', faites: v.faites };
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
        const v = saisie[x.id] || { disques: [], kg: 0, faites: [] };
        const prec = dernierPour(x.id, cle);
        return (
          <section class="ce-carte" key={x.id}>
            <header>
              <div>
                <b>{x.nom}</b>
                <span>{t('ce_series', { n: x.series, r: x.reps })}{prec ? ' · ' + t('ce_derniere', { v: valeurTxt(prec) }) : ''}</span>
              </div>
              <em class="ce-tag">{t('ce_type_' + x.type)}</em>
            </header>
            {x.type === 'barre' && <SaisieBarre v={v} maj={(c) => maj(x.id, c)} />}
            {x.type !== 'barre' && x.type !== 'corps' && <SaisieKg type={x.type} v={v} maj={(c) => maj(x.id, c)} />}
            {x.type === 'corps' && <p class="ce-lib ce-corps">{t('ce_corps')}</p>}
            <div class="ce-faites" aria-label={t('ce_faites')}>
              {v.faites.map((f, i) => (
                <button type="button" class={f ? 'on' : ''} aria-pressed={f} aria-label={t('ce_serie_n', { n: i + 1 })}
                  onClick={() => maj(x.id, { faites: v.faites.map((y, k) => (k === i ? !y : y)) })}>
                  {f ? '✓' : i + 1}
                </button>
              ))}
            </div>
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

/** Bascule Alimentation / Entrainement, tout en haut de l'onglet Coach. */
export function BasculeCoach({ espace, choisir }) {
  return (
    <div class="ce-bascule" role="tablist">
      <button type="button" role="tab" aria-selected={espace === 'alim'} class={espace === 'alim' ? 'on-alim' : ''} onClick={() => choisir('alim')}>{t('ce_alim')}</button>
      <button type="button" role="tab" aria-selected={espace === 'ent'} class={espace === 'ent' ? 'on-ent' : ''} onClick={() => choisir('ent')}>{t('ce_ent')}</button>
    </div>
  );
}
