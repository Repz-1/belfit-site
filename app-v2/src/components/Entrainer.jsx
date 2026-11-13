import { useState } from 'preact/hooks';
import { mesSeances, commencerCreation, lancerMaSeance, musclesDe } from '../store/mes-seances.js';
import { useRetour } from '../services/retour.js';
import { signal, effect } from '@preact/signals';
import { GROUPES, muscleLog, basculerMuscle, borneCalendrier, texteSur } from '../store/entrainement.js';
import { compteDuJour, musclesDuJour, musclesParJour } from '../services/muscles-jour.js';
import { estPremium } from './PremiumPage.jsx';
import { enDecouverte } from '../services/decouverte.js';
import { ongletActif } from './BottomNav.jsx';
import { Entete } from './Entete.jsx';
import { createPortal } from 'preact/compat';
import { BodyMap, COULEURS_ATHLETE } from './Stats.jsx';
import { DetailSeance } from './Seances.jsx';
import { programmeActif, seancePrevue, musclesPrevus, musclesDeSeancePrevue, estSeancePecs, completerMusclesPecs, planifierSeance, planifs, progParId, normaliserJours } from '../store/programme.js';
import { seancesDuJour, seances, enregistrerSeance } from '../store/seances.js';
import { SESSION_EXOS } from '../data/sessionExos.js';
import { portraitSeanceDuJour, ETAT, demandeVueEntrainer, seanceRefs, seanceActive, abandonnerSeance } from '../store/seance-active.js';
import { recapFaite } from './CarteSeanceJour.jsx';
import { t } from '../i18n/index.js';
import '../styles/seance-jour.css';

/* ------------------------------------------------------------
   Fonds de cartes : charges a la PREMIERE visite de l'onglet.
   Les quatre panneaux du rail sont montes des le demarrage — c'est
   ce qui rend le glissement lateral instantane — donc ces quatre
   jpg (658 ko) partaient au chargement du Journal, pour un ecran
   que l'utilisateur n'avait pas encore ouvert.
   On ne demonte pas le composant (cela casserait le geste) : on
   retarde seulement l'attribut background-image.
   Le drapeau est pose au niveau module et ne retombe jamais :
   revenir sur l'onglet ne doit rien recharger ni reafficher de
   fondu. loading="lazy" n'existe pas pour un fond CSS, d'ou ce
   passage par le signal deja importe.
   ------------------------------------------------------------ */
let fondsVus = false;
function fond(fichier) {
  if (!fondsVus && ongletActif.value === 'entrainer') fondsVus = true;
  return fondsVus ? `background-image:url('/img/${fichier}')` : '';
}
import '../legacy/entrainer.scoped.css';
import '../styles/entrainer-carte.css';
import '../styles/entrainer-accueil.css';
import '../styles/entrainer-athlete.css';

// ==========================================================
// PAGE S'ENTRAINER — portage a l'identique de entrainements.html.
// Meme markup, memes classes, meme CSS : seul l'etat passe en signals.
// ==========================================================

// Pile de vues, equivalent de la navigation par URL de la v1
// ('accueil' -> 'programmes' -> 'seance'), avec fleche retour.
export const vueEntrainer = signal({ nom: 'accueil', params: null });

// Fiche d'un jour a ouvrir des le retour sur S'entrainer. Sert au
// chemin « Planifier mes seances » : on revient sur l'onglet et la
// fiche du jour s'ouvre, sans ecran supplementaire.
export const jourAOuvrir = signal(null);

// Ouverture directe d'un ecran par l'adresse, pour partager un lien
// ou tester sans traverser l'accueil :
//   belfit.be/v2/?onglet=entrainer&vue=selection
// Liste FERMEE : une valeur inconnue laisse l'accueil, elle ne peut
// pas ouvrir un ecran vide. Les vues qui exigent des parametres
// (planifier, seanceDetail) en sont volontairement exclues — sans
// leur `prog` ou leur `seanceId` elles s'afficheraient a blanc.
// Lu une seule fois au chargement, et sans toucher a l'historique :
// le retour ramene a l'accueil comme depuis n'importe quel ecran.
// 'questionnaire' est revenu le 26/08, mais comme OFFRE : on y accede
// par l'aiguillage de la bibliotheque, plus en passage oblige.
const VUES_ADRESSABLES = ['selection', 'questionnaire'];
{
  const demandee = new URLSearchParams(location.search).get('vue');
  if (VUES_ADRESSABLES.includes(demandee)) {
    vueEntrainer.value = { nom: demandee, params: null };
  }
}

export function allerVers(nom, params = null) {
  vueEntrainer.value = { nom, params };
  window.scrollTo(0, 0);
}
effect(() => {
  const d = demandeVueEntrainer.value;
  if (!d) return;
  allerVers(d.nom, d.params);
  demandeVueEntrainer.value = null;
});
export function retourEntrainer() {
  vueEntrainer.value = { nom: 'accueil', params: null };
  window.scrollTo(0, 0);
}

// ---- Utilitaires de date, repris tels quels de la v1 ----
const wlIso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const wlIsoToDate = (iso) => { const p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
const COULEUR = Object.fromEntries(GROUPES.filter(g => g.k !== 'repos').map(g => [g.k, g.c]));

/**
 * « aujourd'hui », « hier », « il y a 3 j », puis la date courte.
 * Raci le 12/08 : la pastille « Dernière » etait trop longue.
 */
function quandCourt(iso, isoAuj) {
  const jours = Math.round((wlIsoToDate(isoAuj) - wlIsoToDate(iso)) / 86400000);
  if (jours <= 0) return t('today').toLowerCase();
  if (jours === 1) return t('yesterday').toLowerCase();
  if (jours < 7) return t('days_ago', { n: jours });
  return jourCourt(wlIsoToDate(iso));
}

function jourCourt(d) {
  return `${t('days_short').split('|')[d.getDay()]} ${d.getDate()} ${t('months_min').split('|')[d.getMonth()]}`;
}
function jourLong(d) {
  return `${t('days_long').split('|')[d.getDay()]} ${d.getDate()} ${t('months_long').split('|')[d.getMonth()]}`;
}
const nomMuscle = (k) => t('mus_' + k);

// ==========================================================
// CARTE DE PILOTAGE DU PROGRAMME (classes cp-*)
//
// Raci, 24/08 : « je viens surtout pour piloter mon programme ». La
// zone d'action ne le permettait pas — un bouton jaune « Demarrer une
// seance » qui ne nommait pas la seance, et le programme relegue en
// carte secondaire. On ne savait ni ce qu'on faisait aujourd'hui, ni
// ce qui venait apres.
//
// La carte ecrit la semaine du programme : une ligne par jour
// affecte, avec son etat. Elle ne remplace RIEN d'autre : le
// calendrier du mois et les mannequins restent en dessous, entiers.
//
// Trois etats seulement, ceux de la maquette validee : FAIT,
// AUJOURD'HUI, A VENIR. Un jour passe non fait ne porte pas de badge
// — inventer un « manque » serait un jugement que Raci n'a pas
// demande.
// ==========================================================
/**
 * Y a-t-il une seance posee a la main dans la semaine en cours ?
 * La carte ne doit s'afficher que si elle a quelque chose a montrer :
 * sinon elle renverrait null et la zone d'action disparaitrait
 * entierement, sans que le bloc de secours prenne le relais.
 */
function poseeCetteSemaine(today) {
  const l = new Date(today);
  l.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  for (let k = 0; k < 7; k++) {
    const d = new Date(l);
    d.setDate(l.getDate() + k);
    const iso = wlIso(d);
    if (planifs.value[iso]) return true;
    // Un jour NOTE compte aussi. Raci, 26/08 : « si je note Épaules
    // pour demain, c'est un jour programme ». Les pastilles sont le
    // chemin le plus court pour planifier ; elles doivent donc peser
    // autant qu'une seance posee.
    if (musclesDuJour(iso).some(m => m !== 'repos')) return true;
  }
  return false;
}

// v682 : l'accueil ne monte plus cette carte. Seance du jour, seance
// libre et programme sont sous le bonhomme. Le bloc « Rien de prévu »
// n'est plus affiché.
export function CarteProgramme({ today, todayIso, allerVers }) {
  const actif = programmeActif.value;
  const prog = actif && progParId(actif.id);
  const aff = prog ? normaliserJours(actif.jours, prog.seances.length) : {};

  // Lundi de la semaine affichee, meme calcul que « Ta semaine ».
  const lundi = new Date(today);
  lundi.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  // Les jours de la semaine qui portent une seance, qu'elle vienne du
  // PROGRAMME ou d'une seance posee a la main sur le calendrier.
  //
  // Raci, 26/08 : « j'ai programme deux seances et elles ne s'affichent
  // pas dans mon programme ». Elles etaient bien enregistrees, mais la
  // carte ne lisait que le programme actif : une seance posee sur une
  // date precise n'existait nulle part ici. Une date posee a la main
  // PRIME sur le programme — c'est une decision explicite contre une
  // regle (store/programme.js).
  const lignes = [];
  for (let k = 0; k < 7; k++) {
    const d = new Date(lundi);
    d.setDate(lundi.getDate() + k);
    const iso = wlIso(d);
    const pose = planifs.value[iso];
    const idx = aff[d.getDay()];
    const marques = musclesDuJour(iso).filter(m => m !== 'repos');
    let seance = null;
    // `lancable` : la ligne porte-t-elle une vraie seance, avec ses
    // exercices ? Un jour simplement NOTE n'en a pas — le bouton ne
    // doit donc pas promettre de la demarrer.
    let lancable = true;
    let seanceId = null;
    if (pose) { seance = { titre: pose.titre, sub: pose.sub || '' }; seanceId = pose.seanceId; }
    else if (prog && idx !== undefined) { seance = prog.seances[idx]; seanceId = actif.id + '-' + idx; }
    else if (marques.length) {
      // Jour note a la main depuis le calendrier : les muscles
      // deviennent le titre. C'est la planification la plus rapide
      // qui soit, et elle etait invisible ici jusqu'au 26/08.
      seance = { titre: marques.map(nomMuscle).join(', '), sub: '' };
      lancable = false;
    }
    if (!seance) continue;
    lignes.push({
      iso,
      jour: t('days_short').split('|')[d.getDay()].toUpperCase(),
      seance,
      lancable,
      seanceId,
      // L'avenir d'abord : un jour futur reste « a venir » meme s'il
      // porte deja des muscles notes. Sans cette priorite, noter
      // « Épaules » pour demain le comptait comme deja fait.
      // Raci, 5/09 : « comment l'utilisateur distingue un mardi d'un
      // mercredi ». Un jour passe non fait et un jour a venir
      // s'ecrivaient a l'identique — rien ne disait lequel etait
      // derriere soi. Quatrieme etat : « passe ». Il ne juge pas, il
      // situe dans le temps ; la ligne s'eteint, sans croix ni mot.
      etat: iso > todayIso ? 'venir'
        : (marques.length ? 'fait' : (iso === todayIso ? 'auj' : 'passe')),
      auj: iso === todayIso,
    });
  }

  // Sans programme ET sans seance posee, la carte n'a rien a dire :
  // le bloc d'action d'origine reprend la main.
  if (!prog && !lignes.length) return null;

  const duJour = lignes.find(l => l.auj && l.lancable && l.seanceId);
  // Une seance a-t-elle deja ete enregistree aujourd'hui ?
  //
  // Raci, 5/09 : « si je selectionne de nouveau un autre muscle pour
  // le jour en cours, il est de nouveau disponible pour refaire une
  // seance ». Je comparais les TITRES : changer la seance du jour
  // dans la planification donnait un titre different, donc plus de
  // correspondance, donc la tuile reproposait « Demarrer ». On ne
  // regarde plus quoi a ete fait, mais SI quelque chose l'a ete —
  // une seance par jour, quel qu'en soit le nom. */
  const faitAuj = seancesDuJour(todayIso)[0] || null;

  // « Semaine 2 sur 8 » : depuis la date d'adoption, en semaines
  // pleines. La duree du programme est un texte (« 8 semaines ») —
  // on en tire le nombre, et on se tait s'il n'y en a pas.
  let semaine = null, total = null;
  if (prog && actif.depuis) {
    const dep = wlIsoToDate(actif.depuis);
    dep.setDate(dep.getDate() - ((dep.getDay() + 6) % 7));
    semaine = Math.floor((lundi - dep) / 604800000) + 1;
    if (semaine < 1) semaine = 1;
    const m = /(\d+)/.exec(prog.duree || '');
    if (m) total = Number(m[1]);
  }

  return (
    <div class="cp">
      {/* Point 6 (23/09) : « Modifier le programme en cours » est
          retire ; c'est le NOM du programme qui ouvre sa gestion
          (jours, changer, abandonner). Une ligne de moins, et l'acces
          reste a l'endroit ou l'on lit ce dont il s'agit. */}
      {prog ? (
        <button class="cp-nom cp-nom--lien" onClick={() => allerVers('planifier', { prog: actif.id })}>
          {prog.name}<span class="cp-nom-fl" aria-hidden="true">&rsaquo;</span>
        </button>
      ) : <div class="cp-nom">{t('cp_posees_t')}</div>}
      {/* Raci, 5/09 : « 1 seance faite cette semaine » est retiree.
          La barre juste en dessous mesure deja l'avancee, et le
          calendrier compte les seances jour par jour. Reste la seule
          chose que ni l'un ni l'autre ne dit : ou l'on en est dans
          les huit semaines. */}
      <div class="cp-av">
        {semaine && (total
          ? t('cp_semaine', { n: semaine, t: total })
          : t('cp_semaine_seule', { n: semaine }))}
      </div>
      {semaine && total && (
        <div class="cp-barre">
          <span style={{ width: Math.min(100, Math.round(semaine / total * 100)) + '%' }} />
        </div>
      )}

      {/* Maquette C, retenue par Raci le 5/09 : « on va enlever et
          laisser juste la seance d'aujourd'hui ». La semaine entiere
          etait ecrite ligne par ligne — un jour fait, un jour manque,
          un jour a venir, tous a la meme taille, et l'action du jour
          coincee au milieu. Les etats se ressemblaient au point qu'on
          ne distinguait plus un mardi passe d'un mercredi a venir.
          La carte ne montre plus que le jour courant, en tuile : ce
          qu'on doit faire maintenant. Le calendrier du mois, juste en
          dessous, dit deja le reste de la semaine — couleur par jour,
          coche sur les jours notes. */}
      {duJour && !faitAuj ? (
        <button class="cp-tuile" onClick={() => allerVers('seanceDetail',
          { seanceId: duJour.seanceId, titre: duJour.seance.titre, depuis: 'journal' })}>
          <span class="cp-tuile-j">{t('cp_auj')} · {jourLong(today).toUpperCase()}</span>
          <span class="cp-tuile-t">{duJour.seance.titre}</span>
          <span class="cp-tuile-go">
            {t('cp_demarrer_simple')}
            <span class="cp-demarrer-fl" aria-hidden="true">&rsaquo;</span>
          </span>
        </button>
      ) : faitAuj ? (
        /* Raci, 5/09 : « une fois que la seance est faite elle doit
           etre indiquee comme realisee ». La tuile garde sa place et
           son noir, mais elle ne propose plus de lancer ce qui est
           deja derriere soi : elle constate. */
        <div class="cp-tuile cp-tuile--fait">
          <span class="cp-tuile-j">{t('cp_auj')} · {jourLong(today).toUpperCase()}</span>
          <span class="cp-tuile-t">{faitAuj.titre}</span>
          <span class="cp-tuile-fait">✓ {t('cp_realisee')}{recapFaite({ duree: faitAuj.duree, tonnage: faitAuj.tonnage }) ? ' · ' + recapFaite({ duree: faitAuj.duree, tonnage: faitAuj.tonnage }) : ''}</span>
        </div>
      ) : null}

      {/* Le bouton nomme ce qu'il lance. Jour de repos : il garde le
          libelle generique plutot que de disparaitre — une seance
          libre reste possible n'importe quel jour. */}
      {/* Le bouton fait ce qu'il dit, en un seul appui. Il passait par
          un ecran intermediaire qui reposait un choix deja pose ici :
          la seance du jour est au-dessus, la seance libre juste en
          dessous. Raci, 26/08 : « supprime cette page, elle ne sert a
          rien ». « Demarrer X » ouvre X ; « Seance libre » ouvre les
          exercices. */}
      {/* Le pave noir ne subsiste que les jours SANS seance prevue :
          il n'y a alors aucune ligne du jour pour le porter. */}
      {!duJour && (
        <button class="cp-go" onClick={() => allerVers('selection')}>
          {t('tr_start_session')}
        </button>
      )}
      {/* « Demarrer une seance » reste accessible meme avec un
          programme actif (Raci, 26/08). Un programme dit ce qui est
          prevu, il n'interdit pas de faire autre chose : rentrer un
          jour de repos, doubler une seance, s'entrainer sans savoir
          d'avance. Le retirer fermait cette porte. Il est en second
          rang, pas en premier — la seance du jour reste l'action
          principale. */}
      {/* Raci, 5/09 : « tu intervertis ces deux-la ». « Modifier le
          programme en cours » parle du bloc au-dessus — les trois
          lignes de la semaine — donc il le suit immediatement.
          « Seance libre » n'a rien a voir avec le programme : il
          descend, separe par un filet, pour qu'on ne le lise pas
          comme une troisieme option du programme. */}
      {/* Sans programme, ce lien s'adresse a quelqu'un qui ne sait pas
          quoi faire : il ouvre les quatre questions, qui menent au
          programme correspondant a son objectif. Pas de carrefour
          intermediaire (Raci, 26/08). */}
      {!prog && (
        <button class="cp-gerer" onClick={() => allerVers('questionnaire')}>
          {t('cp_choisir')}
        </button>
      )}
      {duJour && (
        <button class="cp-libre" onClick={() => allerVers('selection')}>
          {t('tr_start_session')}
        </button>
      )}
    </div>
  );
}

// ==========================================================
// Journal d'entrainement : semaine, mois a la demande (classes wlog-*)
// ==========================================================
/**
 * Accueil de S'entrainer — proposition de mise en page du 7/10.
 *
 * Raci, 7/10 : « je n'aime pas toute la mise en page ». Le calendrier
 * du mois occupait presque tout l'ecran, la barre coach se fondait
 * dans les gris et collait aux blocs voisins, la hierarchie ne se
 * lisait pas. Rien n'est RETIRE, tout est reordonne :
 *   1. barre coach, EN TETE comme avant (Raci, 7/10), mais detachee
 *      des gris voisins et espacee
 *   2. carte du jour (graphite) — date, etat de la semaine, « Seance
 *      libre », « Trouver mon programme » en second. Avec un programme
 *      actif : la carte de pilotage, telle que validee le 5/09
 *      (maquette C, carte blanche et tuile noire), sans retouche
 *   3. calendrier : la SEMAINE par defaut (sept jours, memes disques
 *      que le mois), « Voir le mois » deplie le calendrier complet,
 *      inchange — navigation, planification, legende
 *   4. semaine + silhouette, comme avant
 * Le resume (« 2 seances cette semaine · derniere : hier ») vit DANS
 * la carte du jour et non au-dessus : Raci avait refuse des pastilles
 * flottant entre l'en-tete et l'action (21/08, regle R43).
 */
/**
 * Muscles a poser sur le schema quand rien n'est encore enregistre.
 *
 * Un jour A VENIR (vendredi « pecs + biceps », par exemple) colorie
 * tous les muscles de la seance prevue : pectoraux, triceps (regle
 * des developpes) et biceps. Le schema de la semaine s'arretait a
 * aujourd'hui, donc cette seance restait invisible.
 *
 * Aujourd'hui ou un jour passe : seule une seance pecs se voit avant
 * d'etre faite, avec tous ses muscles — pas seulement pecs et triceps.
 * Jambes, dos, epaules restent gris tant que la seance n'est pas faite.
 */
function musclesDuSchema(iso, aujourdhui) {
  const prevu = seancePrevue(iso);
  if (prevu) {
    const tous = musclesDeSeancePrevue(prevu).filter(k => COULEUR[k]);
    if (iso > aujourdhui && tous.length) return tous;
    // Les triceps ajoutes par la regle pecs ne doivent pas masquer
    // une seance qui est vraiment une seance pecs.
    const sans = tous.filter(k => k !== 'triceps');
    if (estSeancePecs(prevu.titre, sans)) return tous;
  }
  if (iso !== aujourdhui) return [];
  const cles = (seanceRefs.value || []).map(r => r && r.mKey).filter(Boolean);
  const titre = (seanceActive.value && seanceActive.value.titre) || '';
  if (!estSeancePecs(titre, cles)) return [];
  return completerMusclesPecs(cles, titre).filter(k => COULEUR[k]);
}

function JournalEntrainement({ ouvrirJour, ouvrirSeance }) {
  const [offset, setOffset] = useState(0);
  // Le mois du journal, replie : la semaine tient sur une seule rangee.
  const [moisOuvert, setMoisOuvert] = useState(false);
  const [jeter, setJeter] = useState(false);
  // Toucher un muscle le colorie, sans ecrire dans le journal.
  const [choisis, setChoisis] = useState({});
  const choisirMuscle = (k) => {
    if (!k || k === 'tete') return;
    setChoisis((s) => ({ ...s, [k]: !s[k] }));
  };

  // Source unique : marquage manuel + seances enregistrees, reunis a
  // la lecture (services/muscles-jour.js). Le calendrier ne depend
  // plus d'une recopie faite a la fin de la seance.
  const log = musclesParJour();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIso = wlIso(today);
  const ref = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  // Raci, 5/09 : « Septembre 2026 » beaucoup plus discret, en « Sept
  // 2026 ». Le mois etait le texte le plus gros de la carte alors
  // qu'on le lit une fois ; ce sont les jours qu'on regarde. Le point
  // des abreviations saute — « SEPT. 2026 » ferait deux ponctuations
  // pour trois mots.
  const moisCourt = t('months_short').split('|')[ref.getMonth()].replace('.', '');
  const titre = moisCourt + ' ' + ref.getFullYear();
  // Le calendrier ne retient plus que deux semaines : le mois de la
  // borne est le dernier qui contienne quelque chose. On compare sur
  // « AAAA-MM » plutot que sur des dates, la borne pouvant tomber au
  // milieu d'un mois.
  const avantBorne = wlIso(ref).slice(0, 7) <= borneCalendrier().slice(0, 7);
  // Vers l'avant : on planifie. Le calendrier s'arretait au mois
  // courant, on ne pouvait donc rien poser au-dela du 31 (Raci,
  // 26/08). Douze mois d'avance suffisent a tout programme, et
  // bornent la navigation pour qu'un appui repete ne parte pas a
  // l'infini.
  const apresBorne = offset >= 12;

  /**
   * Un jour du calendrier, tel qu'il se dessine dans le MOIS comme
   * dans la SEMAINE : les deux vues partagent exactement les memes
   * disques, couleurs et marques. `vus` (facultatif) recueille les
   * couleurs affichees, pour la legende courte de la semaine.
   */
  const etatCal = portraitSeanceDuJour().etat;
  const enLiveCal = etatCal === ETAT.BROUILLON || etatCal === ETAT.EN_COURS;
  const cellule = (iso, j, vus) => {
    const vals = (log[iso] || []).filter(v => COULEUR[v] || v === 'repos');
    const repos = vals.includes('repos');
    let muscles = vals.filter(v => v !== 'repos');
    const futur = iso > todayIso;

    // Seances PREVUES par le programme actif (Raci, 10/08 : « le
    // programme apparait dans le calendrier »). Elles ne colorent que
    // les jours ou rien n'a encore ete note : ce qui a reellement ete
    // fait prime toujours sur ce qui etait prevu.
    let prevu = null;
    if (!muscles.length && !repos) {
      prevu = seancePrevue(iso);
      if (prevu) muscles = musclesDeSeancePrevue(prevu).filter(k => COULEUR[k]);
    }

    // Une seule couleur par jour, plus un compte (Raci, 26/08).
    // Le demi-disque a deux couleurs montrait DEUX muscles sur trois,
    // quatre ou cinq, sans jamais dire qu'il en manquait. On echange
    // la deuxieme couleur contre le nombre exact : le jour se lit
    // d'un coup, le detail se lit dans la fiche.
    let cls = 'wlog-cell', style = {};
    if (muscles.length >= 1) {
      cls += ' seance';
      const c = COULEUR[muscles[0]];
      style = { background: c, color: texteSur(c) };
    }
    else if (repos) cls += ' repos';

    // Un jour planifie se lit en CREUX : contour de la couleur du
    // muscle, interieur vide. Sans cette difference, le calendrier
    // affirmerait qu'une seance a eu lieu alors qu'elle est
    // seulement prevue. La couleur passe par le style en ligne :
    // `currentColor` dans la feuille ne la transporte pas.
    if (prevu) {
      cls += ' planifie';
      const c = COULEUR[muscles[0]] || '#736C63';
      style = { background: 'none', boxShadow: `inset 0 0 0 2px ${c}`, color: c };
    }
    if (iso === todayIso) cls += ' today';
    if (futur) cls += ' futur' + (muscles.length || repos ? ' prevu' : '');
    if (vus) {
      if (muscles.length && COULEUR[muscles[0]]) vus.add(muscles[0]);
      if (repos) vus.add('repos');
    }
    return (
      <div key={iso} class={cls} style={style}
        onClick={(e) => { e.stopPropagation(); ouvrirJour(iso); }}>
        {/* Jour de repos : une COCHE VERTE, pas le chiffre (Raci,
            10/08 — les trois nuances proposees se ressemblaient
            toutes). Le repos est une decision tenue, pas une case
            vide : la coche le dit d'un coup d'oeil. Le numero du
            jour se lit toujours par sa position dans la grille. */}
        {repos ? <i class="wlog-coche" aria-label={t('mus_repos')}>✓</i> : j}
        {/* Le badge compte ce que la couleur ne montre pas. */}
        {muscles.length > 1 && <i class="wlog-more">+{muscles.length - 1}</i>}
        {iso === todayIso && enLiveCal && <i class="wlog-alerte" aria-label={t('sj_badge_brouillon')}>!</i>}
      </div>
    );
  };

  // Grille du mois, semaine demarrant le lundi
  const njours = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  const decal = (new Date(ref.getFullYear(), ref.getMonth(), 1).getDay() + 6) % 7;
  const cellules = [];
  for (let i = 0; i < decal; i++) cellules.push(<div key={'v' + i} />);
  for (let j = 1; j <= njours; j++) {
    cellules.push(cellule(wlIso(new Date(ref.getFullYear(), ref.getMonth(), j)), j));
  }

  const portrait = portraitSeanceDuJour();
  const enLive = portrait.etat === ETAT.BROUILLON || portrait.etat === ETAT.EN_COURS;
  const reprendre = () => allerVers(
    portrait.origine === 'programme' ? 'seanceDetail' : 'maseance',
    portrait.seanceId ? { seanceId: portrait.seanceId, titre: portrait.titre } : null
  );

  // Silhouette de la semaine : meme logique qu'avant (v680/v681) pour
  // savoir QUELS muscles sont concernes (note ou seance prevue, pecs
  // ajoute les triceps). Le rendu ne distingue plus fait et programme :
  // chaque groupe a sa couleur des qu'il est concerne, ou touche.
  const lundi = new Date(today);
  lundi.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const dimanche = new Date(lundi);
  dimanche.setDate(lundi.getDate() + 6);
  const compteFait = {};
  const comptePrevu = {};
  let seancesSemaine = 0;
  for (const d = new Date(lundi); d <= dimanche; d.setDate(d.getDate() + 1)) {
    const isoJ = wlIso(d);
    const vals = (log[isoJ] || []).filter(v => v !== 'repos' && COULEUR[v]);
    if (vals.length && isoJ <= todayIso) seancesSemaine++;
    if (vals.length) vals.forEach(k => { compteFait[k] = (compteFait[k] || 0) + 1; });
    else musclesDuSchema(isoJ, todayIso).forEach(k => {
      if (!compteFait[k]) comptePrevu[k] = (comptePrevu[k] || 0) + 1;
    });
  }
  Object.keys(comptePrevu).forEach(k => { if (compteFait[k]) delete comptePrevu[k]; });
  const groupesCouleur = GROUPES.filter(g => COULEUR[g.k]);
  const aFaire = groupesCouleur.filter(g => comptePrevu[g.k]);

  const actif = programmeActif.value;
  const prog = actif && progParId(actif.id);
  const aff = prog ? normaliserJours(actif.jours, prog.seances.length) : {};
  const poseAuj = planifs.value[todayIso];
  const idxAuj = aff[today.getDay()];
  let seanceAuj = null;
  let seanceIdAuj = null;
  if (poseAuj && poseAuj.seanceId) { seanceAuj = poseAuj; seanceIdAuj = poseAuj.seanceId; }
  else if (prog && idxAuj !== undefined) {
    seanceAuj = prog.seances[idxAuj];
    seanceIdAuj = actif.id + '-' + idxAuj;
  }
  const faitAuj = seancesDuJour(todayIso)[0] || null;
  const peutLancer = !!(seanceAuj && seanceIdAuj && !faitAuj && !enLive);
  let semaineProg = null, totalProg = null;
  if (prog && actif.depuis) {
    const dep = wlIsoToDate(actif.depuis);
    dep.setDate(dep.getDate() - ((dep.getDay() + 6) % 7));
    semaineProg = Math.floor((lundi - dep) / 604800000) + 1;
    if (semaineProg < 1) semaineProg = 1;
    const m = /(\d+)/.exec(prog.duree || '');
    if (m) totalProg = Number(m[1]);
  }
  const recapAuj = faitAuj ? recapFaite({ duree: faitAuj.duree, tonnage: faitAuj.tonnage }) : '';
  // 12/11 : « Jour 1 — Pecs / Triceps » -> « Pecs / Triceps » dans la carte du jour.
  const titreCourt = (x) => String(x || '').replace(/^.*?[—–-]\s+/, '') || String(x || '');
  const musclesAuj = peutLancer
    ? musclesDeSeancePrevue({ seanceId: seanceIdAuj, titre: seanceAuj.titre, exos: seanceAuj.exos }).filter(k => COULEUR[k]).slice(0, 4)
    : [];
  const objectifSemaine = prog ? Object.keys(aff).length : 0;
  const travailles = groupesCouleur.filter(g => compteFait[g.k]).map(g => nomMuscle(g.k).toLowerCase());
  const nomZone = (k) => (k === 'avantBras' ? t('ath_avant_bras') : nomMuscle(k));
  const legende = Object.keys(COULEURS_ATHLETE).filter((k) => compteFait[k] || comptePrevu[k] || choisis[k]);

  const joursSem = [];
  for (let k = 0; k < 7; k++) {
    const d = new Date(lundi);
    d.setDate(lundi.getDate() + k);
    const iso = wlIso(d);
    const marques = (log[iso] || []).filter(v => COULEUR[v]);
    const repos = (log[iso] || []).includes('repos') && !marques.length;
    const fait = marques.length > 0 && iso < todayIso;
    const auj = iso === todayIso;
    joursSem.push(
      <button type="button" key={iso}
        class={'ath-jour' + (auj ? ' auj' : '') + (fait ? ' fait' : '')}
        onClick={() => ouvrirJour(iso)}>
        <span class="ath-dow">{t('days_short').split('|')[d.getDay()]}</span>
        <span class="ath-num">{repos ? '✓' : d.getDate()}</span>
      </button>
    );
  }

  return (
    <>
      {/* 12/11 Raci : la page repond a UNE question — « qu'est-ce que je
          fais aujourd'hui ? ». Date, semaine, puis la carte du jour et
          son seul bouton. Les silhouettes viennent apres : la recompense,
          plus l'obstacle. */}
      <header class="ath2-tete">
        <h1>{t('days_long').split('|')[today.getDay()]} {today.getDate()} {t('months_long').split('|')[today.getMonth()]}</h1>
        {prog && semaineProg ? <span>{totalProg
          ? t('cp_semaine', { n: semaineProg, t: totalProg })
          : t('cp_semaine_seule', { n: semaineProg })}</span> : null}
      </header>

      <section class="ath-week" aria-label={t('tr_week_title')}>
        <div class="ath-jours">{joursSem}</div>
      </section>

      <section class="ath2-jour">
        {enLive ? (
          <>
            <div class="ath2-kicker"><span class="ath2-badge">!</span>{portrait.etat === ETAT.EN_COURS ? t('ent2_kicker_cours') : t('ent2_kicker_brouillon')}</div>
            <h2 class="ath2-titre">{portrait.titre || t('seance_jour')}</h2>
            <p class="ath2-meta">{[
              portrait.nExos ? portrait.nExos + ' ' + t(portrait.nExos > 1 ? 'ms_exercises' : 'ms_exercise') : '',
              portrait.etat === ETAT.EN_COURS ? '' : t('sj_pas_commencee'),
            ].filter(Boolean).join(' · ')}</p>
            <button type="button" class="ath2-go" onClick={reprendre}>
              {portrait.etat === ETAT.EN_COURS ? t('sj_reprendre_seance') : t('sj_continuer_seance')}
            </button>
            <button type="button" class="ath2-lien" onClick={() => setJeter(true)}>
              {portrait.etat === ETAT.EN_COURS ? t('sj_abandon_seance') : t('sj_abandon_brouillon')}
            </button>
          </>
        ) : faitAuj ? (
          <>
            <div class="ath2-kicker">✓ {t('ent2_kicker_faite')}</div>
            <h2 class="ath2-titre">{titreCourt(faitAuj.titre) || t('seance_jour')}</h2>
            {recapAuj ? <p class="ath2-meta">{recapAuj}</p> : null}
            <button type="button" class="ath2-go ath2-go--calme" onClick={() => ouvrirSeance && ouvrirSeance(faitAuj)}>
              {t('ent2_voir_seance')}
            </button>
          </>
        ) : peutLancer ? (
          <>
            <div class="ath2-kicker">{t('ent2_kicker_jour')}</div>
            <h2 class="ath2-titre">{titreCourt(seanceAuj.titre)}</h2>
            {seanceAuj.sub ? <p class="ath2-meta">{seanceAuj.sub}</p> : null}
            {musclesAuj.length > 0 && (
              <div class="ath2-muscles">
                {musclesAuj.map(k => <span key={k}><i style={{ background: COULEUR[k] }} />{nomMuscle(k)}</span>)}
              </div>
            )}
            <button type="button" class="ath2-go" onClick={() => allerVers('seanceDetail',
              { seanceId: seanceIdAuj, titre: seanceAuj.titre, depuis: 'journal' })}>
              {t('ent2_commencer')}
            </button>
          </>
        ) : prog ? (
          <>
            <div class="ath2-kicker">{t('ent2_kicker_jour')}</div>
            <h2 class="ath2-titre">{t('ent2_repos')}</h2>
            <p class="ath2-meta">{t('ent2_repos_txt')}</p>
            <button type="button" class="ath2-go ath2-go--calme" onClick={() => allerVers('selection')}>
              {t('ent2_seance_plus')}
            </button>
          </>
        ) : (
          <>
            <div class="ath2-kicker">{t('ent2_kicker_jour')}</div>
            <h2 class="ath2-titre">{t('ent2_sans_prog')}</h2>
            <p class="ath2-meta">{t('ent2_sans_prog_txt')}</p>
            <button type="button" class="ath2-go" onClick={() => allerVers('questionnaire')}>
              {t('ent2_choisir_prog')}
            </button>
          </>
        )}
      </section>

      <div class="ath2-tuiles">
        <button type="button" class="ath2-tuile" onClick={() => allerVers('selection')}>
          <b>{t('ent2_autre')}</b>
          <span>{t('ent2_autre_txt')}</span>
        </button>
        <button type="button" class="ath2-tuile"
          onClick={() => (prog ? allerVers('planifier', { prog: actif.id }) : allerVers('questionnaire'))}>
          <b>{t('ent2_prog')}</b>
          <span>{prog ? prog.name : t('ent2_prog_txt_sans')}</span>
        </button>
        {/* 13/11 : la courbe de chaque exercice (idee 3 de Raci). */}
        <button type="button" class="ath2-tuile ath2-tuile--large" onClick={() => allerVers('progression')}>
          <b>Ma progression</b>
          <span>La courbe de chaque exercice que tu as fait</span>
        </button>
      </div>

      {/* 13/11 Raci : « creer une seance carrement », comme Hevy.
          Composee une fois, relancee en un toucher. */}
      <section class="ms-section">
        <div class="ath2-sem-tete">
          <h2>Mes séances</h2>
          {mesSeances.value.length > 0 && (
            <button type="button" class="ath2-cal" onClick={() => { commencerCreation(null); allerVers('selection', { creation: true }); }}>+ Créer</button>
          )}
        </div>
        {mesSeances.value.length ? (
          <div class="ms-liste">
            {mesSeances.value.map(s => {
              const n = (s.exos || []).length;
              return (
                <div key={s.id} class="ms-carte">
                  <button type="button" class="ms-lancer" onClick={() => { if (lancerMaSeance(s)) allerVers('maseance'); }}>
                    <b>{s.nom}</b>
                    <span>{n} exercice{n > 1 ? 's' : ''} · {musclesDe(s).join(', ')}</span>
                  </button>
                  <button type="button" class="ms-modif" aria-label={'Modifier ' + s.nom}
                    onClick={() => { commencerCreation(s); allerVers('selection', { creation: true }); }}>Modifier</button>
                  <button type="button" class="ms-go" aria-label={'Commencer ' + s.nom}
                    onClick={() => { if (lancerMaSeance(s)) allerVers('maseance'); }}>▶</button>
                </div>
              );
            })}
          </div>
        ) : (
          <button type="button" class="ms-vide" onClick={() => { commencerCreation(null); allerVers('selection', { creation: true }); }}>
            <b>+ Créer une séance</b>
            <span>Choisis tes exercices une fois, donne-lui un nom, relance-la en un toucher.</span>
          </button>
        )}
      </section>

      <section class="ath2-semaine">
        <div class="ath2-sem-tete">
          <h2>{t('ent2_semaine')}</h2>
          <button type="button" class="ath2-cal" aria-expanded={moisOuvert ? 'true' : 'false'}
            onClick={() => { if (moisOuvert) setMoisOuvert(false); else { setOffset(0); setMoisOuvert(true); } }}>
            {moisOuvert ? t('ent_voir_semaine') : t('ent_voir_mois')}
          </button>
        </div>
        <div class="ath2-sem-corps">
          <div class="ath-corps">
            <BodyMap rendu="athlete" compte={{}} fait={compteFait} prevu={comptePrevu}
              choix={choisis} onMuscle={choisirMuscle} />
          </div>
          <div class="ath2-bilan">
            <div class="ath2-compte"><b>{seancesSemaine}</b>
              <span>{objectifSemaine ? t('ent2_seances_sur', { t: objectifSemaine }) : t(seancesSemaine > 1 ? 'ent2_seances' : 'ent2_seance')}</span></div>
            {objectifSemaine > 0 && (
              <div class="ath2-barre"><i style={{ width: Math.min(100, Math.round(seancesSemaine / objectifSemaine * 100)) + '%' }} /></div>
            )}
            <p class="ath2-note">{travailles.length
              ? t('ent2_travailles') + ' ' + travailles.join(', ')
              : t(aFaire.length ? 'ent2_prevus' : 'ent2_rien')}</p>
          </div>
        </div>
        {legende.length > 0 && (
          <div class="ath-legende">
            {legende.map((k) => (
              <span key={k}><i class="ath-lg" style={{ background: COULEURS_ATHLETE[k] }} />{nomZone(k)}</span>
            ))}
          </div>
        )}
      </section>

      {jeter && createPortal((
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
        </div>
      ), document.body)}

      {moisOuvert && (
        <div class="ath-mois">
          <div class="wlog-cal-head">
            <button type="button" class={'wlog-nav' + (avantBorne ? ' off' : '')} aria-label={t('ent_sem_prec')}
              onClick={(e) => { e.stopPropagation(); if (!avantBorne) setOffset(offset - 1); }}>‹</button>
            <div class="wlog-cal-titre">{titre}</div>
            <button type="button" class={'wlog-nav wlog-nav--avant' + (apresBorne ? ' off' : '')} aria-label={t('ent_sem_suiv')}
              onClick={(e) => { e.stopPropagation(); if (!apresBorne) setOffset(offset + 1); }}>›</button>
          </div>
          <div class="wlog-grid">
            {t('days_min').split('|').map((j, i) => <div key={'wd' + i} class="wlog-wd">{j}</div>)}
            {cellules}
          </div>
          <div class="wlog-legende">
            {GROUPES.filter(g => COULEUR[g.k]).map(g => (
              <span key={g.k}><i class="dot" style={{ background: COULEUR[g.k] }} />{nomMuscle(g.k)}</span>
            ))}
            <span><i class="dot repos" />{t('mus_repos')}</span>
            <span><i class="dot today" />{t('today')}</span>
          </div>
        </div>
      )}

    </>
  );
}

// ==========================================================
// Modale de selection des muscles d'une journee
// ==========================================================
/**
 * Fenetre d'un jour. Elle depend desormais du TYPE de jour.
 *
 * Raci le 10/08 : « on est le 12, et quand je clique jusqu'au 16 c'est
 * la page du 12 qui s'ouvre ». Mesure : seul le titre changeait. Le
 * corps — silhouette de la semaine et liste des huit muscles — etait
 * rigoureusement identique du 12 au 16, puisqu'ils appartiennent a la
 * meme semaine. Le titre fait une ligne, le corps occupe l'ecran :
 * c'etait bien la meme page.
 *
 * Trois cas, comme dans l'organigramme :
 *   passe      -> ce qui a ete fait, exercices et charges
 *   aujourd'hui-> la seance prevue, avec de quoi la demarrer
 *   a venir    -> ce qui est prevu
 * Le marquage manuel des muscles reste accessible dans les trois :
 * c'est lui qui colore le calendrier quand on s'entraine ailleurs.
 */
/**
 * Ce que le bouton annonce sous « Programmer cette seance ».
 *
 * A quatre groupes, « Epaules · Trapezes · Triceps · Abdos » passait
 * sur deux lignes et deformait le bouton (Raci, 26/08). On nomme tant
 * que ca tient, on compte ensuite :
 *   1        -> « Pecs »
 *   2        -> « Pecs, Dos »
 *   3 et +   -> « Pecs, Dos +2 »
 * Les deux premiers noms restent : ils situent la seance mieux qu'un
 * nombre seul, et le « +N » dit ce qui manque sans le cacher.
 */
function resumeMuscles(cles) {
  const noms = cles.map(nomMuscle);
  if (noms.length <= 2) return noms.join(', ');
  return noms.slice(0, 2).join(', ') + ' +' + (noms.length - 2);
}

/** « 16:02 » — l'heure d'enregistrement d'une seance. */
function heureDe(ts) {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function ModaleMuscles({ iso, fermer, ouvrirSeance }) {
  // Empilee dans la pile de retours : le bouton Android et la touche
  // Echap la ferment, au lieu de changer l'onglet SOUS elle. Le hook
  // doit etre appele avant tout retour anticipe — d'ou le `!!iso`
  // plutot qu'un `if (!iso) return null` place au-dessus.
  useRetour(!!iso, fermer);
  // Ces deux etats sont declares AVANT le retour anticipe : sinon le
  // nombre de hooks change entre un rendu sans `iso` et un rendu avec,
  // ce que Preact n'accepte pas.
  const [choixOuvert, setChoixOuvert] = useState(false);
  const [rattrapage, setRattrapage] = useState(false);
  if (!iso) return null;
  const sel = muscleLog.value[iso] || [];
  const isoAuj = wlIso(new Date());
  const type = iso < isoAuj ? 'passe' : (iso === isoAuj ? 'auj' : 'futur');
  const faites = seancesDuJour(iso);
  const prevue = seancePrevue(iso);

  // Les seances proposables : celles du programme actif. Sans
  // programme, la liste est vide et on le dit plutot que d'ouvrir un
  // choix sans choix.
  const actif = programmeActif.value;
  const prog = actif ? progParId(actif.id) : null;
  const sessionsProgramme = prog
    ? prog.seances.map((sa, i) => ({ seanceId: `${actif.id}-${i}`, titre: sa.titre, sub: sa.sub, index: i }))
    : [];

  /**
   * Raci, 5/09 : « ca ne fonctionne pas, car s'il remplace il n'y en a
   * pas d'autre — les autres muscles ont deja ete attitres aux autres
   * jours ». « Remplacer par une autre seance » proposait les quatre
   * seances du programme, y compris celles deja posees ailleurs dans
   * la semaine : en choisir une la mettait sur DEUX jours. Ne restent
   * que les seances qui ne sont nulle part, et le bouton disparait
   * quand il n'y en a aucune — ce qui est le cas d'un programme
   * entierement place, justement celui de Raci.
   */
  const joursPris = prog ? normaliserJours(actif.jours, prog.seances.length) : {};
  const indexAilleurs = new Set();
  const jourDuIso = (() => {
    const [a, m, j] = iso.split('-').map(Number);
    return new Date(a, m - 1, j).getDay();
  })();
  Object.keys(joursPris).forEach(jr => {
    if (Number(jr) !== jourDuIso) indexAilleurs.add(joursPris[jr]);
  });
  // La seance deja prevue ICI sort aussi de la liste : « remplacer »
  // par elle-meme ne remplace rien.
  const sessionsLibres = sessionsProgramme.filter(sa =>
    !indexAilleurs.has(sa.index) && !(prevue && prevue.index === sa.index));

  // La fiche ne montre QUE le jour ouvert (Raci, 16/08). Elle a
  // agrege la semaine entiere pendant un temps : on ouvrait mardi et
  // la silhouette se colorait de lundi, ce qui rend un jour vide
  // indiscernable d'un jour charge. La lecture hebdomadaire n'est pas
  // perdue pour autant — c'est exactement ce que porte la carte
  // « Ta semaine » de la page S'entrainer, avec sa propre silhouette.
  //
  // Deux sources pour un meme jour, reunies : les pastilles cochees a
  // la main, et les muscles DEDUITS des exercices des seances
  // enregistrees. Sans la deduction, faire une seance pecs sans
  // cocher la pastille laissait le corps gris.
  const jour = wlIsoToDate(iso);
  const compte = compteDuJour(iso);
  // Rien encore enregistre. Un jour a venir colorie tous les muscles
  // de la seance prevue. Une seance pecs d'aujourd'hui ou d'un jour
  // passe colorie aussi les siens (pectoraux, triceps, biceps).
  if (!Object.keys(compte).some(k => k !== 'repos' && compte[k] > 0)) {
    musclesDuSchema(iso, isoAuj).forEach(k => { compte[k] = 1; });
  }
  // PORTAIL VERS document.body. Le rail des onglets porte
  // will-change:transform et z-index:1 : il cree un contexte
  // d'empilement, donc le z-index 100 de la modale ne valait que
  // DEDANS, et la barre de navigation (z-index 80, mais hors du
  // rail) passait devant ses boutons. Montee au niveau du corps,
  // elle recouvre tout ce qu'elle doit recouvrir.
  return createPortal(
    <div class="ml-overlay show" onClick={(e) => { if (e.target.classList.contains('ml-overlay')) fermer(); }}>
      <div class="ml-modal">
        <h3 class="ml-date">{jourLong(jour)}</h3>
        <div class="ml-type">
          {type === 'passe' ? t('ml_passe') : type === 'auj' ? t('ml_auj') : t('ml_futur')}
        </div>

        {/* ---- Ce qui a ete FAIT ce jour-la ----
            Raci, 5/09 : « il n'est pas cense me montrer tous les
            exercices sous forme de liste ». Sur un jour a plusieurs
            seances, la fiche deroulait jusqu'a six exercices CHACUNE :
            quatre « Jour 2 » et un « Jour 4 » empiles, marques « 1 min »
            a chaque fois, illisibles. Une ligne par seance, et un
            bouton qui ouvre son detail — c'est la qu'on lit les
            exercices, les series et le tonnage.

            La croix de suppression est retiree le 5/09 : « lorsque je
            la supprime elle revient comme non faite ; si la seance a
            ete faite elle ne doit pas etre supprimable ». Effacer un
            entrainement reel faisait mentir le calendrier et la tuile
            du jour, qui repassait a « Demarrer ». Une seance se
            corrige en la refaisant : l'enregistrement ecrase celui du
            jour. */}
        {faites.length > 0 && (
          <div class="ml-fait">
            {faites.map(sa => (
              <div key={sa.id} class="ml-fait-s">
                <button class="ml-fait-ouvrir"
                  onClick={() => { fermer(); ouvrirSeance && ouvrirSeance(sa); }}>
                  <span class="ml-fait-t">{sa.titre}</span>
                  {/* L'heure distingue deux seances du meme jour qui
                      portent le meme nom (Raci, 5/09). */}
                  <span class="ml-fait-h">{heureDe(sa.ts)}</span>
                  <span class="ml-fait-fl" aria-hidden="true">&rsaquo;</span>
                </button>
              </div>
            ))}
          </div>
        )}


        {/* ---- Ce qui est PREVU ---- */}
        {!faites.length && prevue && (
          <div class="ml-prevu">
            <div class="ml-prevu-t">{prevue.titre}</div>
            <div class="ml-prevu-s">{prevue.sub}</div>
            {/* Jour passe : cette seance etait au programme, elle n'a
                jamais ete enregistree. Sans cette ligne, elle se lisait
                comme une seance FAITE — le titre du bloc dit « ce que
                tu as fait » — et contredisait les muscles affiches
                dessous (Raci, 22/08). */}
            {type === 'passe' && <div class="ml-prevu-non">{t('ml_prevu_non')}</div>}
            {/* Raci, 5/09 : « je veux qu'il soit possible de demarrer
                uniquement la seance du jour en cours ». Un jour futur
                se lisait mais se lançait aussi : la seance se serait
                enregistree a la date d'aujourd'hui, pas a la sienne.
                Seul AUJOURD'HUI porte le bouton. */}
            {type === 'auj' && (
              <button class="ml-prevu-b" onClick={() => {
                fermer();
                allerVers('seanceDetail', { seanceId: prevue.seanceId, titre: prevue.titre, depuis: 'journal' });
              }}>{t('ml_demarrer')}</button>
            )}
            {type === 'futur' && (
              <div class="ml-prevu-non">
                {t('ml_prevu_futur', { j: jourLong(new Date(iso + 'T12:00:00')) })}
              </div>
            )}
          </div>
        )}

        {/* ---- Rien fait, rien prevu ---- */}
        {!faites.length && !prevue && (
          <p class="ml-rien">
            {type === 'passe' ? t('ml_rien_passe') : t('ml_rien_futur')}
          </p>
        )}

        {/* ---- Poser une seance sur CETTE date ----
            Raci le 10/08 : « en cliquant sur une des dates je
            pourrais programmer une seance ». Le programme donne un
            rythme regulier ; ceci sert a ce qui n'y rentre pas —
            rattraper, ajouter un jour, poser une seance enregistree.
            Reserve au present et au futur : on ne planifie pas hier. */}
        {type !== 'passe' && !faites.length && (
          /* Sans programme actif, il n'y a aucune seance a poser : la
             fiche ne propose rien et laisse la place aux pastilles,
             qui font deja le travail. Le renvoi vers le questionnaire
             a ete retire le 26/08 — « Ou trouver un programme complet »
             ne voulait rien dire a cet endroit, et « Trouver mon
             programme » est deja sur la page d'accueil. */
          !sessionsLibres.length ? null
          : choixOuvert ? (
            <div class="ml-choix">
              <div class="ml-choix-t">{t('ml_choisir')}</div>
              {sessionsLibres.map(sa => (
                <button key={sa.seanceId} class="ml-choix-l"
                  onClick={() => { planifierSeance(iso, sa); setChoixOuvert(false); }}>
                  <span class="ml-choix-n">{sa.titre}</span>
                  <span class="ml-choix-s">{sa.sub}</span>
                </button>
              ))}
              <button class="ml-choix-annul" onClick={() => setChoixOuvert(false)}>{t('cancel')}</button>
            </div>
          ) : (
            <button class="ml-programmer" onClick={() => setChoixOuvert(true)}>
              {prevue ? t('ml_remplacer') : t('ml_programmer')}
            </button>
          )
        )}

        {/* Rattrapage (23/09) : une seance du programme faite sans
            l'app. Elle s'enregistre sur CE jour, avec ses exercices —
            le calendrier, la tuile et la progression la comptent. Sans
            programme, les pastilles plus bas font deja ce travail. */}
        {type === 'passe' && !faites.length && sessionsProgramme.length > 0 && (
          rattrapage ? (
            <div class="ml-choix">
              <div class="ml-choix-t">{t('ml_rattraper_t')}</div>
              {sessionsProgramme.map(sa => (
                <button key={sa.seanceId} class="ml-choix-l"
                  onClick={() => {
                    const exos = (SESSION_EXOS[sa.seanceId] || []).map(r => {
                      const k = String(r).indexOf(':');
                      return { mKey: r.slice(0, k), nom: r.slice(k + 1), fait: true, sets: [] };
                    });
                    enregistrerSeance({ iso, titre: sa.titre, muscles: [...new Set(exos.map(e => e.mKey))], exos });
                    setRattrapage(false);
                  }}>
                  <span class="ml-choix-n">{sa.titre}</span>
                  <span class="ml-choix-s">{sa.sub}</span>
                </button>
              ))}
              <button class="ml-choix-annul" onClick={() => setRattrapage(false)}>{t('cancel')}</button>
            </div>
          ) : (
            <button class="ml-programmer" onClick={() => setRattrapage(true)}>{t('ml_rattraper')}</button>
          )
        )}

        {/* Retirer une seance posee a la main sur cette date. */}
        {prevue && prevue.main && !faites.length && (
          <button class="ml-retirer" onClick={() => planifierSeance(iso, null)}>
            {t('ml_retirer')}
          </button>
        )}

        {/* Silhouettes toujours a gauche. Les centrer quand la legende
            est vide faisait sauter la mise en page d'une disposition a
            l'autre au premier muscle coche : Raci a tranche pour une
            seule position, le 26/08. */}
        <div class="ml-corps">
          <BodyMap compte={compte} />
          <div class="ml-legende">
            {/* La legende ne liste plus les neuf groupes dont sept
                eteints : elle nomme ce qui a ete travaille, et le dit
                quand il n'y a rien. Une liste de gris demande de
                chercher les rares pastilles allumees. */}
            {/* Le titre ne s'affiche que s'il annonce quelque chose : un
                en-tete seul au-dessus du vide fait chercher ce qui
                manque (Raci, 22/08). La silhouette grise suffit. */}
            {GROUPES.some(g => COULEUR[g.k] && compte[g.k]) && (
              <div class="ml-legende-titre">{t('ml_ce_jour')}</div>
            )}
            {GROUPES.filter(g => COULEUR[g.k] && compte[g.k]).map(g => (
              <span key={g.k} class="fait">
                <i class="dot" style={{ background: COULEUR[g.k] }} />
                {nomMuscle(g.k)}
              </span>
            ))}
            {/* Pas de « rien de note » ici : le haut de la fiche le dit
                deja, et la silhouette entierement grise le montre. Trois
                fois la meme information sur un demi-ecran. */}
          </div>
        </div>
        {/* « Noter les muscles TRAVAILLES » est au passe : sur un jour
            a venir, il decrivait une action impossible et masquait le
            fait qu'on peut decider ici meme ce qu'on fera (Raci,
            26/08). Le titre suit donc le jour. */}
        <div class="ml-groups-titre">{t(type === 'futur' ? 'ml_noter_futur' : 'ml_noter')}</div>
        <div class="ml-groups">
          {GROUPES.map(g => (
            <button key={g.k}
              class={'ml-chip' + (sel.includes(g.k) ? ' on' : '')}
              // Texte blanc sur les neuf couleurs : 1,82 sur le jaune
              // des epaules, 2,43 sur le cyan des triceps — illisible
              // (Raci, 26/08). Meme calcul que le calendrier : la
              // luminance decide. Huit couleurs sur neuf passent au
              // noir, seul le violet des abdos garde le blanc.
              style={sel.includes(g.k) && g.k !== 'repos'
                ? { background: g.c, borderColor: g.c, color: texteSur(g.c) } : {}}
              onClick={() => basculerMuscle(iso, g.k)}>
              {COULEUR[g.k] && <i class="ml-pt" style={{ background: COULEUR[g.k] }} aria-hidden="true" />}
              {nomMuscle(g.k)}
            </button>
          ))}
        </div>
        {/* Raci, 26/08 : « si j'ai envie de decider que tel jour je fais
            tel muscle ». Les pastilles enregistrent deja, mais rien ne
            le disait : on cochait sans savoir que le jour venait
            d'entrer dans « Mes seances planifiees ». Le recapitulatif
            nomme ce qui est retenu, et le dit au bon temps. */}
        {/* « Programmer cette seance » est retire le 5/09 (Raci) :
            « Confirmer suffit ». Il apparaissait des la premiere
            pastille cochee, juste au-dessus de « Confirmer », et les
            deux faisaient la meme chose — fermer la fiche. Les
            pastilles ayant deja enregistre au tap, un seul bouton de
            sortie suffit. */}
        {/* Sortie de la fiche. Cinq etats successifs : haut-gauche
            (17/08), disque noir flottant en bas a droite (22/08),
            ligne de titre (26/08, refuse), barre pleine largeur
            (maquette C, 26/08), puis cette rangee de deux — Raci le
            5/09 : « un bouton Confirmer a cote de Retour, et retire
            Effacer ». « Effacer » disparait : la fiche se decoche
            pastille par pastille, et il refermait la fiche au lieu de
            rendre la main. Les deux boutons ferment la fiche ; les
            pastilles ayant deja enregistre au tap, « Confirmer » ne
            valide pas un formulaire, il clot le geste. */}
        <div class="ml-sortie">
          <button class="ml-retour" onClick={fermer}>←&nbsp; {t('ml_retour')}</button>
          <button class="ml-confirmer" onClick={fermer}>{t('ml_confirmer')}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ==========================================================
// Modale Premium bienveillante (identique v1)
// ==========================================================
function ModalePremium({ montre, fermer }) {
  if (!montre) return null;
  return (
    <div class="premium-overlay show" onClick={(e) => { if (e.target.classList.contains('premium-overlay')) fermer(); }}>
      <div class="premium-modal">
        <div class="pm-icon">💪</div>
        <h3>{t('tr_prem_title')}</h3>
        <p>{t('tr_prem_body')}</p>
        <button class="pm-btn" onClick={() => { fermer(); ongletActif.value = 'premium'; }}>
          {t('support_unlock')}
        </button>
        <button class="pm-close" onClick={fermer}>{t('later')}</button>
      </div>
    </div>
  );
}

// ==========================================================
// Page
// ==========================================================
export function Entrainer() {
  const [jourOuvertLocal, setJourOuvertLocal] = useState(null);
  // Une demande venue d'ailleurs prime sur l'etat local le temps d'un
  // rendu, puis on la consomme : sans quoi la fiche se rouvrirait a
  // chaque retour sur l'onglet.
  const jourOuvert = jourAOuvrir.value || jourOuvertLocal;
  const setJourOuvert = (v) => { jourAOuvrir.value = null; setJourOuvertLocal(v); };
  const [premium, setPremium] = useState(false);
  // Vues internes a l'onglet : liste plein ecran et detail d'une
  // seance. Pas de detour par vueEntrainer — ces deux ecrans partent
  // du journal et y reviennent.
  const [seanceOuverte, setSeanceOuverte] = useState(null);
  useRetour(!!seanceOuverte, () => setSeanceOuverte(null));

  const fermerSeance = () => setSeanceOuverte(null);

  if (seanceOuverte) {
    return (
      <div class="pg-entrainer pg-entrainer--carte">
        <Entete retour={fermerSeance} />
        <DetailSeance seance={seanceOuverte} />
      </div>
    );
  }

  // DECISION RACI (26/07) : la partie entrainement est GRATUITE en
  // entier — questionnaire, programmes, seances. Les anciens verrous
  // (Premium jour 1 sur le sur-mesure, fenetre decouverte sur les
  // programmes) sont leves ; le Premium reste sur la nutrition.
  const verrou = (e, dest) => { e.preventDefault(); allerVers(dest); };
  const locked = '';

  return (
    <div class="pg-entrainer pg-entrainer--carte pg-entrainer--athlete">
      <Entete />
      {/* Pas de bloc-titre sous la barre : comme le Journal, la barre
          puis le contenu. Le nom de l'onglet est deja dans la
          navigation du bas — le repeter en 31 px coutait un tiers
          d'ecran avant la premiere carte. */}

      {/* Les cartes « Seance libre » et « Creer mon programme » ont
          ete retirees le 10/08 a la demande de Raci. Elles occupaient
          les deux tiers du premier ecran pour deux liens et
          repoussaient le calendrier en troisieme position, replie.
          Leurs deux destinations vivent maintenant dans la zone
          d'action, sous le bonhomme. Aucune n'est perdue. */}
      <JournalEntrainement ouvrirJour={setJourOuvert}
        ouvrirSeance={setSeanceOuverte} />

      <ModaleMuscles iso={jourOuvert} fermer={() => setJourOuvert(null)}
        ouvrirSeance={setSeanceOuverte} />
      <ModalePremium montre={premium} fermer={() => setPremium(false)} />
    </div>
  );
}
