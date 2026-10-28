import { useState, useEffect, useRef } from 'preact/hooks';
import { repas, totauxRepas, fourchetteRepas, renommerRepas, validerRepas } from '../store/journal.js';
import { macrosOf } from '../data/aliments.js';
import { enregistrerPlat } from '../store/perso.js';
import { Recherche, LigneIngredient, repasOuvertId } from './MealCard.jsx';
import { DetailNutritionnel } from './DetailNutritionnel.jsx';
import { t } from '../i18n/index.js';
import { lectureSeule } from '../store/acces-nutrition.js';

// ============================================================
// PAGE REPAS — encodage plein ecran.
// Toucher un repas dans le Journal ouvre cette page : la
// recherche, la liste des resultats et les aliments encodes
// disposent de tout l'ecran, le clavier ne recouvre plus rien.
// La logique (recherche, favoris, plats, scan, lignes) est
// reutilisee telle quelle depuis MealCard.
// ============================================================


// Anneau du resume : la part de la fourchette conseillee deja
// couverte par le repas. Sans fourchette, l'anneau reste neutre.
function AnneauRepas({ kcal, cible }) {
  const max = cible ? cible.max : 0;
  const part = max > 0 ? Math.min(1, kcal / max) : 0;
  const R = 32, C = 2 * Math.PI * R;
  return (
    <div class="rp-anneau">
      <svg viewBox="0 0 74 74">
        {/* Degrade jaune -> orange du logo. Un id fixe suffit : la page
            repas n'est montee qu'une fois a la fois. */}
        <defs>
          <linearGradient id="rp-degrade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="var(--rp-jaune)" />
            <stop offset="100%" stop-color="var(--or)" />
          </linearGradient>
        </defs>
        <circle cx="37" cy="37" r={R} fill="none" stroke="var(--rp-piste)" stroke-width="6" />
        <circle
          cx="37" cy="37" r={R} fill="none" stroke="url(#rp-degrade)" stroke-width="6"
          stroke-linecap="round"
          stroke-dasharray={`${(part * C).toFixed(1)} ${C.toFixed(1)}`}
        />
        {/* Repere du minimum recommande : sans lui l'anneau ne dit pas
            vers quoi il se remplit. Le maximum est la boucle complete. */}
        {cible && cible.min > 0 && (() => {
          const a = (cible.min / max) * 2 * Math.PI;
          const x1 = 37 + Math.cos(a) * (R - 5), y1 = 37 + Math.sin(a) * (R - 5);
          const x2 = 37 + Math.cos(a) * (R + 5), y2 = 37 + Math.sin(a) * (R + 5);
          return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#B7A98C" stroke-width="2" stroke-linecap="round" />;
        })()}
      </svg>
      <div class="rp-anneau-c"><span /></div>
    </div>
  );
}

export function MealPage() {
  const id = repasOuvertId.value;
  const r = repas.value.find(x => x.id === id);

  const [edite, setEdite] = useState(false);
  // Alimentation fermee : la fiche se consulte, sans recherche ni modification.
  const ro = lectureSeule.value;
  const [enrego, setEnrego] = useState(false);
  const [nomPlat, setNomPlat] = useState('');
  const [garde, setGarde] = useState(false);

  // Repas supprime ou page fermee : rien a afficher.
  useEffect(() => { if (id !== null && !r) repasOuvertId.value = null; }, [id, r]);
  if (!r) return null;

  const tot = totauxRepas(r);
  // Chaque ligne affiche des valeurs arrondies : l'en-tete doit etre LEUR
  // somme, pas l'arrondi de la somme exacte, sinon 6+1+11 « fait 19 » et
  // l'utilisateur qui verifie conclut que l'app compte mal.
  const totAff = { kcal: 0, prot: 0, carbs: 0, lip: 0 };
  for (const ing of r.ings) {
    const m = macrosOf(ing);
    totAff.kcal += Math.round(m.kcal); totAff.prot += Math.round(m.prot);
    totAff.carbs += Math.round(m.carbs); totAff.lip += Math.round(m.lip);
  }
  const vide = r.ings.length === 0;
  const f = fourchetteRepas(r.cle);

  const enregistrerCommePlat = () => {
    const nom = nomPlat.trim();
    if (!nom) return;
    enregistrerPlat({
      id: Date.now(),
      nom,
      portions: 1,
      ings: r.ings.map(i => ({ name: i.name, portion: i.portion })),
    });
    setEnrego(false); setNomPlat('');
    setGarde(true); setTimeout(() => setGarde(false), 2200);
  };

  // ---- Retour par glissement (Raci) ----------------------------
  // La page suit le doigt vers la droite et se referme au-dela d'un
  // tiers d'ecran (ou sur un geste vif). Verrou exigeant : un
  // defilement vertical ou un depart sur un champ n'enclenche rien,
  // et le rail des onglets ignore desormais cette couche.
  const gl = useRef(null);
  const [dx, setDx] = useState(0);
  const [glisse, setGlisse] = useState(false);

  const debut = (e) => {
    if (e.touches.length !== 1) return;
    if (e.target.closest && e.target.closest('input, select, textarea, .mc-resultats, .fr-plein, .cp-overlay')) return;
    gl.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, verrou: null, t: Date.now(), dx: 0 };
  };
  const bouge = (e) => {
    const g = gl.current;
    if (!g || e.touches.length !== 1) return;
    const ex = e.touches[0].clientX - g.x, ey = e.touches[0].clientY - g.y;
    if (!g.verrou) {
      if (Math.abs(ey) > 12 && Math.abs(ey) > Math.abs(ex)) { gl.current = null; return; }
      if (ex > 14 && Math.abs(ex) > Math.abs(ey) * 1.6) { g.verrou = 'h'; setGlisse(true); }
      else return;
    }
    g.dx = Math.max(0, ex);
    setDx(g.dx);
  };
  const fin = () => {
    const g = gl.current;
    gl.current = null;
    setGlisse(false);
    if (!g || g.verrou !== 'h') { setDx(0); return; }
    const vif = g.dx > 60 && (Date.now() - g.t) < 320;
    if (g.dx > window.innerWidth / 3 || vif) {
      setDx(window.innerWidth);
      setTimeout(() => { repasOuvertId.value = null; setDx(0); }, 180);
    } else setDx(0);
  };

  return (
    <div
      class="app-scroll couche-repas pg-journal"
      onTouchStart={debut}
      onTouchMove={bouge}
      onTouchEnd={fin}
      onTouchCancel={fin}
      style={dx ? {
        transform: 'translateX(' + dx + 'px)',
        transition: glisse ? 'none' : 'transform 180ms cubic-bezier(.22,.8,.28,1)',
      } : undefined}
    >
      <div class="rp-colonne">

        {/* Topbar : retour + titre (crayon pour renommer) */}
        <div class="rp-topbar">
          <button class="rp-retour" onClick={() => { repasOuvertId.value = null; }} aria-label="Retour">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          {edite && !ro ? (
            <input
              class="rp-titre-champ"
              value={r.nom}
              onInput={e => renommerRepas(r.id, e.currentTarget.value)}
              onBlur={() => setEdite(false)}
              onKeyDown={e => e.key === 'Enter' && setEdite(false)}
              autoFocus
            />
          ) : (
            <h1 class="rp-titre" onClick={() => { if (!ro) setEdite(true); }}>{r.nom}</h1>
          )}
          {/* Une seule sortie : la barre du bas. Un second « Terminer »
              ici laissait croire que la fleche retour annulait quelque
              chose — tout est sauve en continu, rien n'est annulable. */}
          <span class="rp-terminer-esp" />
        </div>

        {/* Resume : total du repas + repere recommande */}
        <div class="rp-resume">
          <AnneauRepas kcal={tot.kcal} cible={f} />
          <div class="rp-resume-txt">
            <div class={'rp-kcal' + (totAff.kcal > 999 ? ' rp-kcal--long' : '')}>{totAff.kcal}<span>kcal</span></div>
            <div class="rp-reco">{f ? <><b>{f.min}–{f.max} kcal</b><span>{t('mc_reco')}</span></> : ' '}</div>
          </div>
          <div class="rp-macros">
            <div class="rp-macro">
              <b>{totAff.prot}<i>g</i></b><em>{t('protein')}</em><s style="background:var(--proteines)" />
            </div>
            <div class="rp-macro">
              <b>{totAff.carbs}<i>g</i></b><em>{t('carbs')}</em><s style="background:var(--glucides)" />
            </div>
            <div class="rp-macro">
              <b>{totAff.lip}<i>g</i></b><em>{t('fat')}</em><s style="background:var(--lipides)" />
            </div>
          </div>
        </div>

        {/* Recherche : la meme brique que la carte, avec tout l'ecran pour elle */}
        {!ro && <Recherche repasId={r.id} phCourt />}

        {/* Aliments deja encodes */}
        {!vide && (
          <div class="rp-section">
            <div class="rp-section-titre">{t('rp_dans_repas')}</div>
            <div class="rp-liste">
              {r.ings.map(ing => (
                <LigneIngredient key={ing.id} repasId={r.id} ing={ing} />
              ))}
              <div class="rp-total">
                <span class="rp-total-lb">
                  {t('rp_total_court')}
                  <span class="rp-total-val">{totAff.kcal}<span>kcal</span></span>
                </span>
                {!ro && <button class="rp-total-fin" onClick={() => { validerRepas(r.id); repasOuvertId.value = null; }}>
                  {t('rp_terminer')}
                </button>}
              </div>
            </div>
          </div>
        )}

        {/* Enregistrer la composition comme plat reutilisable */}
        {!vide && !ro && (
          <div class="mc-plat rp-plat">
            {garde ? (
              <div class="mc-plat-ok">{'\u2713'} {t('mc_plat_ok')}</div>
            ) : enrego ? (
              <div class="mc-plat-saisie">
                <input
                  class="mc-plat-champ"
                  placeholder={t('mc_plat_nom')}
                  value={nomPlat}
                  onInput={e => setNomPlat(e.currentTarget.value)}
                  onKeyDown={e => e.key === 'Enter' && enregistrerCommePlat()}
                  autoFocus
                />
                <button class="mc-plat-ok-btn" disabled={!nomPlat.trim()} onClick={enregistrerCommePlat}>
                  {t('save')}
                </button>
                <button class="mc-plat-annul" onClick={() => { setEnrego(false); setNomPlat(''); }}>✕</button>
              </div>
            ) : (
              <div class="rp-actions">
                <button class="rp-btn-plat" onClick={() => { setNomPlat(''); setEnrego(true); }}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>
                  {t('mc_plat_btn')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Le detail nutritionnel passe SOUS les deux boutons (Raci,
            16/08). Il s'intercalait entre la liste des aliments et
            « Terminer » : on devait le franchir pour atteindre le
            bouton qu'on etait venu chercher. Fibres, sucres, satures et
            sel se consultent apres coup, pas pendant l'encodage — ils
            sont donc au bout de la page, atteignables sans etre sur le
            passage. */}
        {!vide && <DetailNutritionnel ings={r.ings} />}
      </div>
    </div>
  );
}
