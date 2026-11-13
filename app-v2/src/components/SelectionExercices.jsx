import { useState, useEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { MUSCLES, EXERCISES, NIVEAUX, LIEUX, OPTIONS_DOMICILE,
         convientAuLieu, materielPrecis,
         NIVEAUX_PRATIQUE, PROTOCOLES } from '../data/exercices.js';
import { signal } from '@preact/signals';

// Niveau de pratique : un seul choix pour toute la seance. Retenu
// d'une seance a l'autre — il ne change pas d'un jour a l'autre.
export const niveauPratique = signal(
  (() => { try { return localStorage.getItem('belfit_niveau') || 'intermediaire'; } catch (e) { return 'intermediaire'; } })()
);
function choisirNiveau(k) {
  niveauPratique.value = k;
  try { localStorage.setItem('belfit_niveau', k); } catch (e) {}
}

// Lieu d'entrainement (Raci, 15/10) : « En salle » ou « A domicile »,
// et a domicile le materiel qu'on a. Retenu comme le niveau : on
// s'entraine en general au meme endroit. Par defaut En salle, qui
// montre tout — exactement ce que faisait l'ancien « Tout ».
const CLE_LIEU = 'belfit_lieu';
const TOUTES_OPTIONS = OPTIONS_DOMICILE.map(o => o.key);
function lireLieu() {
  try {
    const v = JSON.parse(localStorage.getItem(CLE_LIEU) || 'null');
    if (v && (v.lieu === 'salle' || v.lieu === 'domicile')) {
      const options = (v.options || []).filter(k => TOUTES_OPTIONS.includes(k));
      return { lieu: v.lieu, options: options.length ? options : TOUTES_OPTIONS };
    }
  } catch (e) {}
  return { lieu: 'salle', options: TOUTES_OPTIONS };
}
export const lieuEntrainement = signal(lireLieu());
function poserLieu(v) {
  lieuEntrainement.value = v;
  try { localStorage.setItem(CLE_LIEU, JSON.stringify(v)); } catch (e) {}
}


import { retourEntrainer } from './Entrainer.jsx';
import { t } from '../i18n/index.js';
import { GROUPES } from '../store/entrainement.js';
import '../legacy/selection-exercices.scoped.css';
import { PhotoExo } from './PhotoExo.jsx';
import '../styles/seance-jour.css';
import { selectionExos, poserBrouillon, abandonnerSeance, seanceRefs } from '../store/seance-active.js';

// Garde l'ordre deja pose (celui du coach : polyarticulaires d'abord)
// et ajoute les nouveaux a la fin, au lieu de retrier par muscle.
function gardeOrdre(refs) {
  const cle = (r) => r.mKey + ':' + r.i;
  const voulus = new Set(refs.map(cle));
  const avant = (seanceRefs.value || []).filter((r) => voulus.has(cle(r)));
  const deja = new Set(avant.map(cle));
  return avant.concat(refs.filter((r) => !deja.has(cle(r))));
}
import { allerVers } from './Entrainer.jsx';
import { ongletActif } from './BottomNav.jsx';

// ==========================================================
// ECRAN "Choisir mes exercices" — transpose a l'identique du v1
// (ma-seance.html, ecran 1). Meme markup, meme CSS ; l'etat
// (muscle courant, filtre, selection) passe en hooks Preact.
// ==========================================================

const EQUIP = {
  barre: 'Barre', halteres: 'Haltères', machine: 'Machine / poulie',
  poulie: 'Poulie', rien: 'Poids du corps', traction: 'Poids du corps',
  kettlebell: 'Kettlebell', elastique: 'Élastique',
};
const equipLabel = (mat) => EQUIP[mat] || (mat ? mat[0].toUpperCase() + mat.slice(1) : '—');
// Libelle du materiel EXACT : un elastique ne s'affiche plus « Halteres ».
export const equipDe = (ex) => equipLabel(materielPrecis(ex));

// 12/11 : l'effet de focale (vignettes qui grandissent au centre de
// l'ecran, 5/09) est retire avec les grandes fiches : en lignes
// compactes de 56 px, il n'y a plus rien a agrandir.

export function SelectionExercices() {
  const [muscle, setMuscle] = useState(0);          // index dans MUSCLES
  const [jeter, setJeter] = useState(false);
  // Copie locale : on n'ecrit PAS dans le signal pendant le rendu.
  const brut = selectionExos.value;
  const selection = {};
  MUSCLES.forEach(m => { selection[m.key] = brut[m.key] || new Set(); });

  const [recherche, setRecherche] = useState('');
  // Fiche d'exercice : index dans le groupe courant, ou null.
  // Toucher la vignette OUVRE la fiche au lieu d'ajouter — voir le
  // commentaire sur .ex-photo plus bas.
  const [fiche, setFiche] = useState(null);
  // 12/11 : lieu, materiel et niveau passent derriere « Filtres ».
  const [filtres, setFiltres] = useState(false);

  const mKey = MUSCLES[muscle].key;
  const { lieu, options } = lieuEntrainement.value;
  const exoVisible = (ex) => convientAuLieu(ex, lieu, options);
  // A domicile, on coche ce qu'on a. La derniere case ne se decoche
  // pas : « rien du tout » ne montrerait aucun exercice.
  const basculerOption = (k) => {
    const on = options.includes(k);
    if (on && options.length === 1) return;
    poserLieu({ lieu, options: on ? options.filter(x => x !== k) : [...options, k] });
  };
  // Liste vide a domicile : quelles cases ajouter pour en avoir ?
  const nbSiOption = (k) => (EXERCISES[mKey] || [])
    .filter(ex => convientAuLieu(ex, 'domicile', [k])).length;

  // Recherche par MOTS, insensible aux accents, a la casse et a
  // l'ordre : « couche incline » trouve « Developpe Couche Incline
  // (Haltere) », « poulie triceps » trouve « Extension Triceps
  // (Poulie) ». Meme principe que la recherche d'aliments.
  const normaliser = (x) => x.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ');
  const mots = normaliser(recherche).split(/\s+/).filter(Boolean);
  const correspond = (ex) => {
    if (!mots.length) return true;
    const cible = normaliser(ex.nom);
    return mots.every(m => cible.includes(m));
  };

  const liste = (EXERCISES[mKey] || [])
    .map((ex, i) => ({ ex, i }))
    .filter(o => exoVisible(o.ex) && correspond(o.ex))
    // Affichage alphabetique : les noms traduits le 12/11 ne sont plus
    // a leur place dans la base, ou l'ordre (les positions) ne change pas.
    .sort((a, b) => a.ex.nom.localeCompare(b.ex.nom, 'fr'));

  // Une recherche porte sur TOUT le catalogue, pas sur le seul muscle
  // affiche : chercher « squat » depuis l'onglet Pecs ne doit pas
  // renvoyer une liste vide. On indique alors ou se trouvent les
  // resultats plutot que de laisser l'ecran muet.
  const ailleurs = mots.length && !liste.length
    ? MUSCLES.filter(m => m.key !== mKey)
        .map(m => ({ m, n: (EXERCISES[m.key] || []).filter(correspond).length }))
        .filter(o => o.n > 0)
    : [];

  const nomNiveau = (NIVEAUX_PRATIQUE.find(n => n.key === niveauPratique.value) || {}).label || '';
  const resumeFiltres = (lieu === 'domicile'
    ? 'À domicile' + (options.length < TOUTES_OPTIONS.length
        ? ' · ' + OPTIONS_DOMICILE.filter(o => options.includes(o.key)).map(o => o.label).join(', ')
        : '')
    : 'En salle') + ' · ' + nomNiveau;

  const nbSelectionnes = Object.values(selection).reduce((n, s) => n + s.size, 0);

  const basculer = (i) => {
    const prev = selectionExos.value;
    const copie = { ...prev, [mKey]: new Set(prev[mKey] || []) };
    if (copie[mKey].has(i)) copie[mKey].delete(i);
    else copie[mKey].add(i);
    selectionExos.value = copie;
    const refs = [];
    MUSCLES.forEach(m => {
      [...(copie[m.key] || [])].sort((a, b) => a - b)
        .forEach(idx => refs.push({ mKey: m.key, i: idx }));
    });
    if (refs.length) {
      poserBrouillon({ refs: gardeOrdre(refs), origine: 'libre' });
    } else {
      abandonnerSeance();
    }
  };

  const stars = (lvl) => {
    lvl = lvl || 2;
    return (
      <div class="ex-stars">
        {[1, 2, 3].map(k => <span key={k} class={k <= lvl ? 'on' : ''}>★</span>)}
        <em>{NIVEAUX[lvl]}</em>
      </div>
    );
  };

  return (
    <div class="pg-selection">
      <div class="top">
        <button class="back-btn" onClick={retourEntrainer}>←&nbsp; {t('ml_retour')}</button>
        <h1>Choisir mes exercices</h1>
      </div>

      <div class="ex-recherche">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" />
        </svg>
        <input type="search" value={recherche} placeholder="Chercher un exercice"
          onInput={(e) => setRecherche(e.currentTarget.value)} />
        {recherche && (
          <button class="ex-recherche-vider" onClick={() => setRecherche('')}
            aria-label="Effacer">×</button>
        )}
      </div>

      {/* Grille des muscles conservee (15/08 : jamais de bande
          defilante, tout visible d'un coup). */}
      <div class="muscle-grille">
        {MUSCLES.map((m, i) => (
          (EXERCISES[m.key] || []).length > 0 && (
            <button key={m.key} class={'muscle-case' + (i === muscle ? ' active' : '')}
              aria-pressed={i === muscle}
              onClick={() => setMuscle(i)}>{m.label}</button>
          )
        ))}
      </div>

      {/* 12/11 Raci (« Ok vazy ») : le lieu, le materiel et le niveau
          ne sont plus etales avant le premier exercice. Ils sont repris
          de la derniere fois (retenus sur l'appareil) et resumes ici en
          une ligne ; on les change dans la feuille « Filtres ». */}
      <p class="section-hint">
        <button type="button" class="ex-filtres" onClick={() => setFiltres(true)}
          aria-label="Modifier les filtres">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
          {resumeFiltres}
        </button>
        <span key={nbSelectionnes}
          class={'hint-compte' + (nbSelectionnes > 0 ? ' actif' : '')}>
          {nbSelectionnes} sélectionné{nbSelectionnes > 1 ? 's' : ''}
        </span>
      </p>
      {mots.length > 0 && liste.length > 0 && (
        <p class="ex-trouves">{liste.length} exercice{liste.length > 1 ? 's' : ''} trouvé{liste.length > 1 ? 's' : ''}</p>
      )}

      <div class="ex-list">
        {liste.length === 0 ? (
          <div style="text-align:center;color:#6b7280;font-size:14px;padding:34px 20px;line-height:1.5">
            <span style="display:block;font-size:44px;margin-bottom:10px">💪</span>
            {mots.length ? 'Aucun exercice ne correspond.'
              : lieu === 'domicile' ? `Rien pour ${MUSCLES[muscle].label.toLowerCase()} avec ce matériel.`
              : 'Aucun exercice pour ce matériel.'}
            {/* Liste vide a domicile : on propose d'un geste ce qui en
                donnerait — Poids du corps d'abord (rien a acheter),
                puis le reste, chacun avec son nombre d'exercices. */}
            {!mots.length && lieu === 'domicile' && (
              <div class="ex-ailleurs ex-vide-domicile">
                {[...OPTIONS_DOMICILE].sort((a, b) => (b.key === 'corps') - (a.key === 'corps'))
                  .filter(o => !options.includes(o.key) && nbSiOption(o.key) > 0).map(o => (
                  <button key={o.key} class={o.key === 'corps' ? 'principal' : ''} onClick={() => basculerOption(o.key)}>
                    + {o.label} ({nbSiOption(o.key)})
                  </button>
                ))}
                <button onClick={() => poserLieu({ lieu: 'salle', options })}>En salle</button>
              </div>
            )}
            {ailleurs.length > 0 && (
              <div class="ex-ailleurs">
                {ailleurs.map(o => (
                  <button key={o.m.key} onClick={() => setMuscle(MUSCLES.indexOf(o.m))}>
                    {o.m.label} ({o.n})
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : liste.map(({ ex, i }) => {
          const sel = selection[mKey].has(i);
          const sets = (ex.meta || '').replace(/\s*×\s*/g, ' • ');
          return (
            <div class={'ex-item' + (sel ? ' selected' : '')} key={mKey + '-' + i}>
              {/* La vignette ouvre la FICHE, elle n'ajoute pas. Voir
                  l'exercice avant de le choisir est la premiere
                  chose qu'on veut faire ; il fallait auparavant
                  l'ajouter a sa seance pour decouvrir a quoi il
                  ressemblait, donc s'engager avant de savoir. */}
              <div class="ex-photo" role="button" tabIndex={0}
                aria-label={'Voir ' + ex.nom}
                onClick={() => setFiche(i)}>
                <PhotoExo imgId={ex.imgId} taille={240} />
              </div>
              <div class="ex-info" onClick={() => setFiche(i)}>
                <div class="ex-name">{ex.nom}</div>
                <div class="ex-equip">{equipDe(ex)}</div>
                {/* Raci, 14/10 (« corrige tout ») : la mention ne
                    s'affiche que si l'exercice NE convient PAS a tous.
                    Depuis le 7/08 les cartes sont neutres — le niveau
                    regle le volume, pas le choix de l'exercice — donc
                    aujourd'hui aucune carte ne la porte : elle repetait
                    la meme phrase sous chaque nom. Un exercice reserve
                    a un public declare `reserve: '<texte>'` dans
                    data/exercices.js. */}
                {ex.reserve && <div class="ex-sets">{ex.reserve}</div>}
              </div>
              <button class="ex-add" onClick={() => basculer(i)} aria-label="Ajouter">{sel ? '✓' : '+'}</button>
            </div>
          );
        })}
      </div>

      <FicheExercice
        mKey={mKey}
        ex={fiche != null ? (EXERCISES[mKey] || [])[fiche] : null}
        choisi={fiche != null && selection[mKey].has(fiche)}
        basculer={() => { if (fiche != null) basculer(fiche); }}
        fermer={() => setFiche(null)} />

      {createPortal(
        <div class={'session-bar pg-selection-portail' + (nbSelectionnes === 0 || ongletActif.value !== 'entrainer' ? ' hidden' : '')}
          onClick={() => {
            const refs = [];
            MUSCLES.forEach(m => {
              [...(selection[m.key] || [])].sort((a, b) => a - b)
                .forEach(i => refs.push({ mKey: m.key, i }));
            });
            if (!refs.length) return;
            poserBrouillon({ refs: gardeOrdre(refs), origine: 'libre' });
            allerVers('maseance');
          }}>
          <span class="count">{nbSelectionnes} exercices sélectionnés</span>
          <button class="vider" type="button" onClick={(e) => {
            e.stopPropagation();
            setJeter(true);
          }}>{t('sea_abandonner')}</button>
          <span class="go">Ma séance →</span>
        </div>,
        document.body
      )}
      {filtres && createPortal(
        <div class="ex-feuille-voile" onClick={() => setFiltres(false)}>
          <div class="ex-feuille" role="dialog" aria-label="Filtres" onClick={(e) => e.stopPropagation()}>
            <div class="ex-feuille-poignee" aria-hidden="true" />
            <p class="ex-feuille-titre">Où t'entraînes-tu ?</p>
            <div class="filter-tabs lieu-rangee" role="group" aria-label="Où t'entraînes-tu ?" data-sans-swipe>
              {LIEUX.map(l => (
                <button key={l.key} class={'filter-tab' + (l.key === lieu ? ' active' : '')}
                  aria-pressed={l.key === lieu}
                  onClick={() => poserLieu({ lieu: l.key, options })}>{l.label}</button>
              ))}
            </div>
            {lieu === 'domicile' && (
              <div class="materiel-rangee" role="group" aria-label="Matériel à la maison" data-sans-swipe>
                {OPTIONS_DOMICILE.map(o => {
                  const on = options.includes(o.key);
                  return (
                    <button key={o.key} class={'materiel-case' + (on ? ' active' : '')}
                      role="checkbox" aria-checked={on}
                      onClick={() => basculerOption(o.key)}>
                      <span class="materiel-coche" aria-hidden="true">{on ? '✓' : ''}</span>{o.label}
                    </button>
                  );
                })}
              </div>
            )}
            <p class="ex-feuille-titre">Ton niveau</p>
            <div class="niv-rangee" role="group" aria-label="Niveau de pratique" data-sans-swipe>
              {NIVEAUX_PRATIQUE.map(n => (
                <button key={n.key}
                  class={'niv-tab' + (niveauPratique.value === n.key ? ' active' : '')}
                  onClick={() => choisirNiveau(n.key)}>{n.label}</button>
              ))}
            </div>
            <p class="ex-feuille-note">Le niveau règle les séries de chaque exercice. Tout est retenu pour la prochaine fois.</p>
            <button type="button" class="ex-feuille-ok" onClick={() => setFiltres(false)}>Voir les exercices</button>
          </div>
        </div>,
        document.body
      )}
      {jeter && createPortal(
        <div class="sj-voile" onClick={() => setJeter(false)}>
          <div class="sj-voile-carte" onClick={(e) => e.stopPropagation()}>
            <p>{t('sea_abandonner_t')}</p>
            <p>{t('sea_abandonner_q')}</p>
            <button class="sj-go sj-go--danger" type="button" onClick={() => { abandonnerSeance(); setJeter(false); }}>
              {t('sea_abandonner_ok')}
            </button>
            <button class="sj-annuler" type="button" onClick={() => setJeter(false)}>
              {t('sea_abandonner_no')}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


// ============================================================
// FICHE D'EXERCICE
// Photo en grand, identite, et l'ajout depuis ici : on decide en
// voyant le mouvement, pas en lisant son nom. La base fournit deux
// vues par exercice (depart et fin) — les montrer toutes les deux
// dit le mouvement, la que la vignette seule ne montre qu'une pose.
// ============================================================
function FicheExercice({ mKey, ex, choisi, basculer, fermer }) {
  if (!ex) return null;
  const vues = ex.imgId ? [0, 1] : [];
  // Direction A (validee par Raci le 7/08) : le bandeau prend la
  // couleur du groupe musculaire — la meme palette que le calendrier.
  const groupe = GROUPES.find(g => g.k === mKey);
  const couleur = (groupe && groupe.c) || '#151515';
  return createPortal(
    <div class="exo-fiche" onClick={(e) => { if (e.target === e.currentTarget) fermer(); }}>
      <div class="exo-fiche-carte exo-fiche--bande">
        <div class="exo-fiche-bande" style={{ background: couleur }}>
          <div class="exo-fiche-muscle">{groupe ? groupe.label : ''}</div>
          <h2>{ex.nom}</h2>
          <button class="exo-fiche-fermer" onClick={fermer} aria-label="Fermer">×</button>
        </div>

        <div class="exo-fiche-vues">
          {vues.map(n => (
            <div key={n} class="exo-fiche-vue">
              <PhotoExo imgId={ex.imgId} n={n} taille={640} prioritaire />
            </div>
          ))}
        </div>

        <div class="exo-fiche-meta">
          <span>{equipDe(ex)}</span>
          {groupe && (
            <span class="exo-fiche-chip-mus" style={{ background: couleur + '1f', color: couleur }}>
              {groupe.label}
            </span>
          )}
        </div>

        {/* Le niveau se choisit aussi ici, devant l'exercice. Meme
            reglage global que la rangee du haut : un seul niveau pour
            la seance, modifiable d'ou l'on veut. Aucun choix n'est
            obligatoire — l'ajout marche dans tous les cas. */}
        <div class="exo-fiche-niveaux" role="group" aria-label="Niveau de pratique">
          {NIVEAUX_PRATIQUE.map(n => (
            <button key={n.key}
              class={'niv-tab' + (niveauPratique.value === n.key ? ' active' : '')}
              onClick={() => choisirNiveau(n.key)}>{n.label}</button>
          ))}
        </div>

        {/* Le detail serie par serie du niveau choisi. En Libre, pas
            de schema : la personne compose ses series elle-meme. */}
        {PROTOCOLES[niveauPratique.value] ? (
          <ol class="exo-series">
            {PROTOCOLES[niveauPratique.value].series.map((se, k) => (
              <li key={k} class={se.degressive ? 'degressive' : ''}>
                <i class="exo-serie-n">{k + 1}</i>
                <b>{se.pct != null ? se.pct + ' %' : se.reps + ' reps'}</b>
                {se.note && <span>{se.note}</span>}
              </li>
            ))}
          </ol>
        ) : (
          <p class="exo-series-libre">Compose tes séries comme tu veux : ajoute, enlève, choisis tes charges.</p>
        )}

        <button class={'exo-fiche-ajout' + (choisi ? ' retire' : '')}
          onClick={() => { basculer(); fermer(); }}>
          {choisi ? 'Retirer de ma séance' : 'Ajouter à ma séance'}
        </button>
      </div>
    </div>,
    document.body
  );
}
