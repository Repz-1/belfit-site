import { useState, useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import { createPortal } from 'preact/compat';
import { EAT_IDEAS, CATEGORIES_IDEES } from '../data/idees.js';
import { limitesPortion } from '../data/portions.js';
import { DB } from '../data/aliments.js';
import { IDEA_PREP } from '../data/preparations.js';
import { objectifs, totauxJourAff, kcalRestantes } from '../store/journal.js';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif, allerOnglet } from './BottomNav.jsx';
import { t } from '../i18n/index.js';
import { quantitesIdee, RATIO_MIN, RATIO_MAX } from '../services/autre-idee.js';

// Macros d'une idee = somme reelle de ses aliments (base DB)
function macrosIdee(idee) {
  return idee.ings.reduce((acc, i) => {
    const d = DB[i.n];
    if (!d) return acc;
    const g = d.unit ? i.q * d.unit : i.q; // aliment a l'unite -> q = nb de pieces
    const f = g / 100;
    return {
      kcal: acc.kcal + d.kcal * f, prot: acc.prot + d.prot * f,
      carbs: acc.carbs + d.carbs * f, lip: acc.lip + d.lip * f, g,
    };
  }, { kcal: 0, prot: 0, carbs: 0, lip: 0 });
}

// Etat partage : la pilule est dans la rangee flottante, le panneau
// reste dans le flux de la page.

// ============================================================
// ADAPTATION DES RECETTES
// Reprise de la logique de la v1 : la portion est reduite tant
// qu'une macro deborde, et une recette qui ne rentre pas meme a
// portion minimale est ecartee. Proposer du gras a quelqu'un deja
// en exces de lipides est un contresens.
// ============================================================
// RATIO_MIN / RATIO_MAX et le calcul des quantites vivent dans
// services/autre-idee.js (partages avec le bouton « Autre idee » du plan).

/**
 * Cible calorique d'une suggestion : TOUJOURS ce qu'il reste, plafonne a
 * une taille de repas plausible pour l'objectif du jour (28 %).
 * L'ancien seuil a 800 kcal basculait sur une « regle du quart » qui
 * proposait 252 kcal quand il en restait 901 — un quart de journee, pas
 * un repas. Plus de seuil, plus de rupture.
 */
function cibleRepas(reste, objKcal) {
  const plafond = objKcal > 0 ? objKcal * 0.28 : 800;
  return Math.max(150, Math.min(reste > 0 ? reste : plafond, plafond));
}
/** Calcule les quantites d'une idee pour un ratio donne. */
function quantites(idee, ratio) {
  const q = quantitesIdee(idee, ratio);
  return { texte: q.parts.join(' · '), kcal: q.kcal, prot: q.prot, carbs: q.carbs, lip: q.lip };
}
/**
 * Adapte une idee au budget calorique restant, PORTIONS PLAFONNEES.
 *
 * Le budget ne peut plus etre atteint en gonflant les grammages : quand
 * les plafonds humains empechent d'y arriver, on l'assume et on le dit
 * (« te laisserait ~N kcal ») au lieu de servir 430 g de patate douce.
 *
 * Les macros ne bloquent ni ne reduisent jamais une portion (decision
 * Raci) ; un depassement notable est signale, hierarchise.
 */
const TOLERANCE_BASSE = 0.85;   // en-deca, on annonce le reliquat

/** Un ecart merite-t-il d'etre dit ? 'none' | 'info' | 'warn'. */
function classerEcart(macro, ecart, objectif) {
  if (ecart <= 0) return 'none';
  // Depasser ses proteines n'a quasi jamais d'importance : on ne le
  // mentionne qu'a partir d'un quart de l'objectif journalier.
  if (macro === 'prot') return objectif > 0 && ecart / objectif > 0.25 ? 'info' : 'none';
  if (!(objectif > 0)) return 'info';
  return ecart / objectif <= 0.10 ? 'info' : 'warn';
}

/** Famille de l'ingredient dominant (proteine) et de la base glucidique. */
function marqueurs(idee) {
  const cles = idee.ings.map(i => limitesPortion(i.n).cle);
  const PROT = ['oeuf', 'thon_boite', 'poisson', 'boeuf', 'volaille', 'tofu', 'charcuterie', 'fromage_fort', 'fromage_frais', 'laitage', 'whey', 'legumineuse'];
  const GLUC = ['pain', 'cereale_sec', 'feculent_cru', 'feculent', 'pdt'];
  return {
    prot: cles.find(c => PROT.includes(c)) || null,
    gluc: cles.find(c => GLUC.includes(c)) || null,
  };
}

function diversifier(liste) {
  const sortie = [], reste = liste.slice();
  while (reste.length) {
    const fenetre = sortie.slice(-2).map(x => marqueurs(x.idee));
    let i = reste.findIndex(x => {
      const m = marqueurs(x.idee);
      const memeProt = m.prot && fenetre.some(f => f.prot === m.prot);
      const glucDejaDeux = m.gluc && fenetre.filter(f => f.gluc === m.gluc).length >= 2;
      return !memeProt && !glucDejaDeux;
    });
    if (i === -1) i = 0;                     // vivier trop maigre : on relache
    sortie.push(reste.splice(i, 1)[0]);
  }
  return sortie;
}

function adapter(idee, restes, cible, objectifs) {
  const base = quantites(idee, 1);
  const ratio = base.kcal > 0
    ? Math.max(RATIO_MIN, Math.min(RATIO_MAX, cible / base.kcal))
    : 1;
  const calc = quantites(idee, ratio);
  if (calc.kcal > cible * 1.15 + 60) return null;   // trop grosse, meme calee

  // Les plafonds ont empeche d'atteindre le budget : on l'annonce.
  const reliquat = calc.kcal < cible * TOLERANCE_BASSE
    ? Math.round(cible - calc.kcal)
    : 0;
  // Symetrique : les MINIMA de portion peuvent faire depasser un petit
  // reste. Une portion humaine ne se coupe pas en deux, on le dit.
  const surplus = calc.kcal > cible * 1.05
    ? Math.round(calc.kcal - cible)
    : 0;

  // Ecart de macro le plus notable, avec son niveau.
  const ecarts = ['prot', 'carbs', 'lip']
    .map(m => {
      const ecart = restes[m] === null ? 0 : Math.round(calc[m] - restes[m]);
      return { m, n: ecart, niveau: classerEcart(m, ecart, objectifs ? objectifs[m] : 0) };
    })
    .filter(e => e.niveau !== 'none')
    .sort((a, b) => (b.niveau === 'warn') - (a.niveau === 'warn') || b.n - a.n);

  return { ...calc, reliquat, surplus, ecart: ecarts[0] || null };
}


/** Fiche detaillee d'une recette : ingredients peses et preparation. */
/**
 * Duree approximative d'une recette, deduite des temps cites dans ses
 * etapes (« 25 min au four », « 5-6 min par face »). On retient le plus
 * long, arrondi aux 5 minutes, avec un minimum de 10.
 * Aucune donnee inventee : si aucun temps n'est mentionne, on n'affiche rien.
 */
function dureeEstimee(prep) {
  if (!prep || !prep.steps) return null;
  const texte = prep.steps.join(' ');
  const trouves = [...texte.matchAll(/(\d+)(?:\s*[-–]\s*(\d+))?\s*min/gi)]
    .map(m => parseInt(m[2] || m[1], 10))
    .filter(n => !isNaN(n) && n < 240);
  if (!trouves.length) return null;
  const max = Math.max(...trouves);
  return Math.max(10, Math.round(max / 5) * 5);
}

/** Nom de fichier image d'une recette : sans accent ni espace. */
function fichierImage(nom) {
  return nom
    .toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')            // ligatures
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '.webp';
}

/**
 * Fiche recette plein ecran.
 * Photo en banniere, informations essentielles dessous, puis le detail.
 * Tant qu'une photo manque, un fond degrade prend sa place : la mise
 * en page reste identique, sans trou ni image cassee.
 */
function FicheRecette({ nom, portion, kcal, prot, fermer, aPrec, aSuiv, prec, suiv, pos, total }) {
  const prep = IDEA_PREP[nom];
  const [photoOk, setPhotoOk] = useState(true);
  const minutes = dureeEstimee(prep);
  // La photo doit se re-tester quand on change de recette.
  useEffect(() => { setPhotoOk(true); }, [nom]);

  return createPortal(
    <div class="fr-plein">
      <div class="fr-defile">

        {/* Banniere : photo si elle existe, degrade sinon */}
        <div class={'fr-banniere' + (photoOk ? '' : ' fr-banniere--vide')}>
          {photoOk && (
            <img
              src={`/img/recettes/${fichierImage(nom)}`}
              alt=""
              onError={() => setPhotoOk(false)}
            />
          )}
          {!photoOk && (
            <svg class="fr-embleme" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 3v7a2 2 0 002 2v9" /><path d="M5 3v4" /><path d="M9 3v4" />
              <path d="M17 3c-1.5 0-3 2-3 5v4h3v9" />
            </svg>
          )}
          <button class="fr-x" onClick={fermer} aria-label="Fermer">✕</button>

          {/* Navigation entre recettes retenues */}
          {total > 1 && (
            <>
              <button class="fr-nav fr-nav--prec" onClick={prec} disabled={!aPrec} aria-label="Recette précédente">‹</button>
              <button class="fr-nav fr-nav--suiv" onClick={suiv} disabled={!aSuiv} aria-label="Recette suivante">›</button>
              <span class="fr-compteur">{pos} / {total}</span>
            </>
          )}
        </div>

        {/* En-tete : titre et informations essentielles */}
        <div class="fr-tete">
          <h2 class="fr-titre">{nom}</h2>
          <div class="fr-meta">
            {minutes && (
              <span>
                <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
                  <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" />
                </svg>
                {minutes} min
              </span>
            )}
            <span>
              <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
                <path d="M12 3C9 7 7 9 7 13a5 5 0 0010 0c0-2-1-3.6-2.5-5-.3 1.2-1 2-2 2.4C13 8 13 5.5 12 3z" />
              </svg>
              {kcal} kcal
            </span>
            <span>
              <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
                <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
              </svg>
              {prot} g prot
            </span>
          </div>
        </div>

        <div class="fr-sep" />

        <div class="fr-corps">
          <div class="fr-sec">{t('ingredients')}</div>
          <ul class="fr-ings">
            {portion.split(' · ').map((x, i) => <li key={i}>{x}</li>)}
          </ul>

          <div class="fr-sec">{t('preparation')}</div>
          <ol class="fr-steps">
            {(prep ? prep.steps : ['Assemble les ingrédients selon tes préférences.'])
              .map((x, i) => <li key={i}>{x}</li>)}
          </ol>

          {prep && prep.tip && <div class="fr-tip">{prep.tip}</div>}
        </div>
      </div>
    </div>,
    document.body
  );
}

export const ideesOuvertes = signal(false);
/** 'premium' quand le panneau est ouvert depuis BelFit+ : un lien
 *  ramene alors a BelFit+ au lieu de laisser la personne sur le
 *  Journal (23/09). Remis a null des que le panneau se ferme. */
export const origineIdees = signal(null);

export function IdeesRepas({ pilulSeule, panneauSeul }) {
  const ouvert = ideesOuvertes.value;
  const setOuvert = (v) => { ideesOuvertes.value = v; if (!v) origineIdees.value = null; };
  const retourPlus = origineIdees.value === 'premium' && ouvert ? (
    <button class="eat-retour-plus" type="button" onClick={() => {
      ideesOuvertes.value = false; origineIdees.value = null; allerOnglet('premium');
    }}>← {t('eat_retour_plus')}</button>
  ) : null;
  const [cat, setCat] = useState(null);
  const [fiche, setFiche] = useState(null);
  const [voirTout, setVoirTout] = useState(false);

  // MEME chiffre que la carte Calories (kcalRestantes, base sur les
  // totaux affiches) : le panneau disait 577 quand la carte disait 576,
  // car il recalculait depuis les totaux exacts non arrondis.
  const reste = kcalRestantes.value;

  // Etat contextuel de la pilule : au moins une recette rentre-t-elle
  // dans les macros restantes ? (premium uniquement, calcul leger)
  const suggestionPrete = (() => {
    if (!estPremium.value) return false;
    const obj = objectifs.value, tot = totauxJourAff.value;
    const restes = {
      prot:  obj.prot  > 0 ? obj.prot  - tot.prot  : null,
      carbs: obj.carbs > 0 ? obj.carbs - tot.carbs : null,
      lip:   obj.lip   > 0 ? obj.lip   - tot.lip   : null,
    };
    if (reste <= 120) return false;      // journee complete : rien a suggerer
    const cible = cibleRepas(reste, obj.kcal);
    return CATEGORIES_IDEES.some(c =>
      EAT_IDEAS[c.k].some(idee => adapter(idee, restes, cible, obj) !== null));
  })();

  // Rangee flottante : la pilule seule.
  if (pilulSeule) {
    return (
      <button class="eat-toggle" onClick={() => setOuvert(!ouvert)}>
        <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
          <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4z" />
          <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
        </svg>
        <span>{t('eat_title')}</span>
        {suggestionPrete && (
          <>
            <span class="eat-sep"></span>
            <span class="eat-etat">{t('eat_etat')}</span>
          </>
        )}
        <span class="eat-fleche">{ouvert ? '\u25B4' : '\u25BE'}</span>
      </button>
    );
  }

  return (
    <div class="eat-zone-wrap">
      <div class="eat-zone" style={panneauSeul ? { display: 'none' } : null}>
        <button class="eat-toggle" onClick={() => setOuvert(!ouvert)}>
          <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
            <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4z" />
            <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
          </svg>
          <span>{t('eat_title')}</span>
          <span class="eat-fleche">{ouvert ? '\u25B4' : '\u25BE'}</span>
        </button>
      </div>

      {retourPlus}

      {ouvert && !estPremium.value && (
        <div class="eat-panneau" onClick={() => { ongletActif.value = 'premium'; }}>
          <p class="eat-intro">Des idées de repas calibrées sur tes macros restantes. <b>Passe en Premium</b> pour les débloquer.</p>
        </div>
      )}

      {ouvert && estPremium.value && reste <= 120 && (
        <div class="eat-panneau">
          <p class="eat-intro eat-fini">{t('eat_done')}</p>
        </div>
      )}

      {ouvert && estPremium.value && reste > 120 && (
    <div class="eat-panneau">
      <p class="eat-intro"
         dangerouslySetInnerHTML={{ __html: t('eat_left').replace('{n}', Math.max(0, reste)) }} />

      <div class="eat-cats">
        {CATEGORIES_IDEES.map(c => (
          <button key={c.k} class={'eat-cat' + (cat === c.k ? ' active' : '')}
                  onClick={() => { setVoirTout(false); setCat(cat === c.k ? null : c.k); }}>
            {c.label}
          </button>
        ))}
      </div>

      {cat && (() => {
        const obj = objectifs.value, tot = totauxJourAff.value;
        const restes = {
          prot:  obj.prot  > 0 ? obj.prot  - tot.prot  : null,
          carbs: obj.carbs > 0 ? obj.carbs - tot.carbs : null,
          lip:   obj.lip   > 0 ? obj.lip   - tot.lip   : null,
        };
        const cible = cibleRepas(reste, obj.kcal);

        const classees = EAT_IDEAS[cat]
          .map(idee => ({ idee, p: adapter(idee, restes, cible, obj) }))
          .filter(x => x.p !== null)
          // Priorite a ce qui remplit la cible calorique ; les proteines
          // departagent ensuite.
          .sort((a, b) => (Math.abs(a.p.kcal - cible) - Math.abs(b.p.kcal - cible)) || (b.p.prot - a.p.prot));

        // Diversite : trois variantes de thon d'affilee n'aident personne.
        // Par fenetre de 3, jamais deux fois la meme proteine principale
        // ni plus de deux fois la meme base glucidique. Si le vivier ne
        // le permet pas, on relache plutot que de ne rien montrer.
        const retenues = diversifier(classees);

        if (!retenues.length) {
          return <div class="eat-note">{t('eat_none_fit')}</div>;
        }

        // Pile VERTICALE (Raci) : le carrousel horizontal se battait
        // avec le glissement de page entre onglets. Les trois
        // meilleures d'abord — le tri a deja fait le travail — et le
        // reste sur demande, dans le sens de defilement de la page.
        const visibles = voirTout ? retenues : retenues.slice(0, 3);
        const cachees = retenues.length - visibles.length;

        return (
        <div class="eat-une">
          <div class="eat-liste">
            {visibles.map(({ idee, p }, i) => (
              <div class="eat-idea" key={idee.nom} onClick={() => setFiche({ liste: retenues, pos: i })}>
                <div class="eat-idea-name">{idee.nom}</div>
                <div class="eat-idea-ex">{p.texte}</div>
                <div class="eat-idea-kcal">
                  ≈ {p.kcal} kcal · <span class="eat-prot ok">{p.prot} g prot</span>
                </div>
                {p.reliquat > 0 && (
                  <div class="eat-note-ligne">{t('eat_reste').replace('{n}', p.reliquat)}</div>
                )}
                {p.surplus > 0 && (
                  <div class="eat-note-ligne">{t('eat_surplus').replace('{n}', p.surplus)}</div>
                )}
                {p.ecart && (
                  <div class={'eat-ecart eat-ecart--' + p.ecart.niveau}>
                    {p.ecart.niveau === 'warn' && <span class="eat-pt">•</span>}
                    {t('eat_over').replace('{m}', t('macro_' + p.ecart.m)).replace('{n}', p.ecart.n)}
                  </div>
                )}
                <span class="eat-open">{t('eat_see')}</span>
              </div>
            ))}
          </div>

          {cachees > 0 && (
            <button class="eat-plus" onClick={() => setVoirTout(true)}>
              {t('eat_more').replace('{n}', cachees)}
            </button>
          )}
        </div>
        );
      })()}

      {fiche && (() => {
        const { liste, pos } = fiche;
        const { idee, p } = liste[pos];
        return (
          <FicheRecette
            nom={idee.nom} portion={p.texte} kcal={p.kcal} prot={p.prot}
            fermer={() => setFiche(null)}
            pos={pos + 1} total={liste.length}
            aPrec={pos > 0} aSuiv={pos < liste.length - 1}
            prec={() => setFiche({ liste, pos: pos - 1 })}
            suiv={() => setFiche({ liste, pos: pos + 1 })}
          />
        );
      })()}
    </div>
      )}
    </div>
  );
}
