import { render } from 'preact';
import { createPortal } from 'preact/compat';
import { useState, useRef, useEffect } from 'preact/hooks';
import { animerGoutte, arreterGoutte } from './services/goutte.js';
import './styles.css';
import './styles/design-system.css';
import './styles/journal-socle.css';
// En dernier : l'en-tete commune passe devant les variantes de page.
import './styles/entete-commune.css';
import { utilisateur, authPrete, deconnexion } from './services/firebase.js';
import { LoginScreen } from './components/LoginScreen.jsx';
import { ACCES_INVITE, ONGLET_VITRINE, demanderConnexion } from './acces-invite.js';
import { VERSION_APP } from './version.js';
import { BandeauConfirmation } from './components/BandeauConfirmation.jsx';
import { repas, objectifs, donneesPretes, calculBaseFait, totauxJourAff, repasAffiches } from './store/journal.js';
import { DayDashboard, ouvrirCalcDemande } from './components/DayDashboard.jsx';
import { CoachBar } from './components/CoachBar.jsx';
// 22/10 Raci : barre de saisie libre des repas masquee sur Aujourd'hui
// (code garde ; true pour la remettre, en bas de page).
const BARRE_REPAS_VISIBLE = false;
import { WaterTracker } from './components/WaterTracker.jsx';
import { MealCard, ouvrirMesPlats } from './components/MealCard.jsx';
import { AddMealModal } from './components/AddMealModal.jsx';
import { RestTimer } from './components/RestTimer.jsx';
import { Questionnaire } from './components/Questionnaire.jsx';
import { PlanifierProgramme } from './components/PlanifierProgramme.jsx';
import { SelectionExercices } from './components/SelectionExercices.jsx';
import { Entrainer, vueEntrainer, retourEntrainer, allerVers } from './components/Entrainer.jsx';
import { Reglages, vueReglages } from './components/Reglages.jsx';
import { StatsAvancees, statsAvOuvertes } from './components/StatsAvancees.jsx';
import { depilerRetour, retourEnAttente } from './services/retour.js';
import { SeanceGuidee } from './components/SeanceGuidee.jsx';
import { seanceRefs } from './store/seance-active.js';
import { Stats } from './components/Stats.jsx';
import { BottomNav, ongletActif, allerOnglet, scrollSortant, defileur } from './components/BottomNav.jsx';
import { t, langue, setLangue, LANGUES } from './i18n/index.js';
import { signal } from '@preact/signals';
import { Entete, voletProfil, prenomUtilisateur } from './components/Entete.jsx';
import { weightLog } from './store/stats.js';

import { PremiumPage, estPremium } from './components/PremiumPage.jsx';
import { CoachPage } from './components/CoachPage.jsx';
import './services/invitation.js';
import { Besoins, besoinsRequis, besoinsOuverts } from './components/Besoins.jsx';
import { origineCalc, planCoachActif, programme, programmeCharge, dossierCoach } from './components/BelfitPlus.jsx';
import { finAcces } from './store/coach.js';
import { IdeesRepas } from './components/IdeesRepas.jsx';
import { Courses, origineCourses } from './components/Courses.jsx';
import { WeightNote } from './components/WeightNote.jsx';
import { MealPage } from './components/MealPage.jsx';
import { repasOuvertId } from './components/MealCard.jsx';
import { MesPlats } from './components/MesPlats.jsx';
import { momentBruxelles, periodeAccueil, cleAccueil, dejaVu } from './services/accueil-cle.js';

export function OngletJournal() {
  const [modale, setModale] = useState(false);
  // Le rappel de recalcul (carte Calories) demande l'ouverture par signal :
  // le composant ne possede pas l'etat de la modale, main.jsx si.
  useEffect(() => { animerGoutte(); return arreterGoutte; }, []);

  // Colonne unique, ordre de lecture descendant :
  // logo -> calories -> actions rapides -> idees recettes -> repas.
  // Seuls la navigation, le bouton d'ajout et l'hydratation sont fixes.
  return (
    <div class="pg-journal">
      <div class="colonne">
        <Entete />
        <DayDashboard />
        {/* La pilule vit dans la carte Calories ; ici, uniquement le
            panneau qui se deplie, juste sous elle. */}
        <IdeesRepas panneauSeul />
        <div class="fente-goutte" aria-hidden="true" />
        <WeightNote />
        <div class="jr-repas-kicker">{t('tes_repas')}</div>
        {/* Le premier repas encore vide est mis en avant : a l'ouverture
            d'une journee c'est le petit-dejeuner, puis la mise en avant
            descend d'elle-meme des qu'un repas recoit son premier
            aliment. Quand tout est rempli, plus rien n'est souligne —
            la journee n'a plus d'etape suivante a montrer.
            Note : c'est bien le PREMIER vide, pas le suivant du dernier
            rempli. Sauter le dejeuner et remplir le diner laisse donc la
            marque sur le dejeuner, ce qui est le rappel utile. */}
        {(() => {
          // 27/10 : avec un plan coach, ses repas passent en premier et les
          // creneaux par defaut vides sont masques (affichage seulement).
          const pr = programme.value;
          const liste = repasAffiches(repas.value, pr && pr.repas);
          const aSuivre = liste.find(r => r.ings.length === 0);
          return liste.map(r => (
            <MealCard key={r.id} r={r}
              aSuivre={aSuivre && r.id === aSuivre.id}
              fait={r.ings.length > 0 && !r.prevu && !r.saute} />
          ));
        })()}
        {/* L'ajout d'un repas vit desormais dans le flux, sous le
            dernier repas — plus de bouton flottant jaune (Raci). */}
        <div class="ajout-repas-rang">
          <button class="ajout-repas" onClick={() => setModale(true)}>
            <svg viewBox="0 0 24 24"><path d="M12 5.5v13M5.5 12h13" /></svg>
            {t('add_meal_btn')}
          </button>
        </div>

        {/* La ligne « Liste de courses » vivait ici. Retiree le 8/08 (Raci) :
            elle allongeait le Journal pour une entree deja presente dans
            BelFit+, et elle ouvrait aux comptes gratuits une fonction que
            le tableau comparatif de l'abonnement annonce comme Premium.
            L'unique acces est desormais la carte de BelFit+. */}
        {/* 22/10 Raci : la barre de saisie libre, tout en bas, masquee. */}
        {BARRE_REPAS_VISIBLE && <CoachBar />}
      </div>

      <div class="fab-rangee">
        <WaterTracker />
      </div>

      {modale && <AddMealModal montre={true} fermer={() => setModale(false)} />}
      {/* Ouvert depuis Mon programme, le calculateur y ramene : sa
          fleche annonce la destination, et la fermeture rebascule sur
          l'onglet BelFit+ ou la page est restee ouverte. Sans ca, on
          atterrissait sur le Journal, trois ecrans plus loin que d'ou
          l'on venait. */}
      {ouvrirMesPlats.value && <MesPlats fermer={() => { ouvrirMesPlats.value = false; }} />}
    </div>
  );
}

export function OngletEntrainer() {
  const vue = vueEntrainer.value;
  // Meme navigation qu'en v1 : une vue a la fois, fleche retour en haut.
  // Le chrono de repos n'apparait qu'a deux endroits (Raci, 26/08) :
  // ici, ou l'on pilote son entrainement, et pendant une seance en
  // cours. Ailleurs — bibliotheque, planification, choix d'exercices,
  // fiche d'une seance — il n'y avait rien a chronometrer : un bouton
  // flottant de plus a eviter du pouce.
  if (vue.nom === 'accueil') {
    return (<><Entrainer /><RestTimer /></>);
  }
  if (vue.nom === 'planifier') {
    return <PlanifierProgramme progId={vue.params && vue.params.prog} />;
  }
  if (vue.nom === 'selection') {
    return <SelectionExercices />;
  }
  // Seance libre ou coach : le meme lecteur guide que le programme
  // (23/09). Le repos est integre au lecteur, reglable ±30 s ; le
  // chrono flottant reste sur l'accueil pour l'usage hors seance.
  // Sans exercice, on va directement au choix — plus d'ecran vide.
  if (vue.nom === 'maseance') {
    if (!seanceRefs.value.length) return <SelectionExercices />;
    return <SeanceGuidee libre />;
  }
  // La bibliotheque des 14 programmes est supprimee (5/09). Plus aucun
  // bouton n'y menait, et elle n'avait jamais ete alignee sur l'
  // identite de V2 : fond degrade, pastilles vertes, cartes a lisere.
  // Les programmes s'atteignent par les quatre questions.
  if (vue.nom === 'questionnaire') {
    return <Questionnaire />;
  }
  // Raci, 5/09 : « Demarrer la seance fera demarrer la seance ». La
  // liste a cocher laisse place au deroule guide — une serie apres
  // l'autre, « Suivant » jusqu'a l'exercice suivant.
  if (vue.nom === 'seanceDetail') {
    const p = vue.params || {};
    // Le retour rend la main a S'entrainer, d'ou qu'on vienne. Il
    // rouvrait la fiche du programme quand on n'arrivait pas du
    // journal — un ecran de plus a traverser pour sortir, et le
    // dernier chemin qui menait encore a la bibliotheque (5/09).
    return (<><SeanceGuidee seanceId={p.seanceId} titre={p.titre}
      retour={retourEntrainer} /></>);
  }
  return (
    <div class="pg-entrainer">
      <button class="v2-retour v2-retour--mot" onClick={retourEntrainer}>←&nbsp; Retour</button>
    </div>
  );
}

/**
 * Banniere d'accès invite. Montee A LA RACINE, a cote de <App/>, et
 * non dedans : App comporte cinq retours anticipes — chargement,
 * connexion, donnees, Besoins, rail — et une banniere posee dans le
 * corps n'aurait ete vue que par le dernier. C'est le piege note le
 * 5/08 : un element qui doit s'afficher PARTOUT doit etre teste
 * depuis chaque branche, ou monte au-dessus d'elles. Elle est aussi
 * hors du rail de navigation, dont le `will-change: transform`
 * detourne le `position: fixed` de tous ses descendants.
 */
function AvisAccesInvite() {
  // La banniere occupe le haut de l'ecran en position fixe : sans
  // marge, elle recouvre l'en-tete de l'application. Vu sur la
  // capture de Raci du 10/08, le logo passait derriere. On decale
  // donc la page de la hauteur exacte de la banniere, mesuree apres
  // rendu — elle tient sur une ou deux lignes selon la largeur.
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const poser = () => {
      const h = el ? Math.ceil(el.getBoundingClientRect().height) : 0;
      document.documentElement.style.setProperty('--haut-avis', h + 'px');
      document.documentElement.classList.toggle('avec-avis', h > 0);
    };
    poser();
    if (!el) return undefined;
    const ro = new ResizeObserver(poser);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.classList.remove('avec-avis');
      document.documentElement.style.removeProperty('--haut-avis');
    };
  });

  if (!ACCES_INVITE) return null;
  return null;
}


/**
 * Accueil du matin / du soir (25/10, Raci). Une carte legere, une fois par
 * periode et par jour, APRES le splash (inchange). Seule la decision vit
 * dans le paquet principal ; la carte (AccueilJour.jsx) est chargee a la
 * demande, donc rien n'est ajoute au demarrage.
 */
export function AccueilGarde() {
  const [carte, setCarte] = useState(null);
  const u = utilisateur.value;
  const pret = authPrete.value && donneesPretes.value && !demanderConnexion.value
    && !besoinsOuverts.value && !(besoinsRequis() && !planCoachActif.value);
  const plan = programmeCharge.value;
  useEffect(() => {
    if (!u || !pret || carte) return undefined;
    const m = momentBruxelles();
    const periode = periodeAccueil(m.heure);
    if (!periode) return undefined;
    const cle = cleAccueil(periode, u.uid);
    if (dejaVu(cle, m.jour)) return undefined;
    let annule = false;
    const debut = Date.now();
    // On attend que le splash soit parti et que le plan soit charge
    // (3 s au plus : sans plan, le message se passe de lui).
    const attendre = () => {
      if (annule) return;
      const splash = document.getElementById('splash');
      const planOk = programmeCharge.value || Date.now() - debut > 3000;
      if (splash || !planOk) { setTimeout(attendre, 150); return; }
      import('./components/AccueilJour.jsx').then((mod) => {
        if (annule) return;
        setCarte({ Carte: mod.AccueilJour, periode, heure: m.heure, cle, jour: m.jour });
      }).catch(() => {});
    };
    attendre();
    return () => { annule = true; };
  }, [u, pret, plan]);
  if (!carte) return null;
  const C = carte.Carte;
  // Reste monte (valeur « carte » gardee) pour ne jamais se rouvrir : on
  // rend null a la fin, la cle « deja vu » est ecrite a l'affichage.
  return <C periode={carte.periode} heure={carte.heure} cle={carte.cle} jour={carte.jour} onFin={() => setCarte({ ...carte, Carte: () => null })} />;
}

export function App() {
  if (!authPrete.value) {
    return <div style={{textAlign:'center',padding:'80px 20px',color:'#b5b0a4',fontWeight:600}}>…</div>;
  }
  // Periode de test sans compte : plutot que d'afficher l'ecran de
  // connexion, on ouvre la session invite et l'app demarre sur le
  // Journal. Un seul interrupteur, dans acces-invite.js.
  // Porte de service : depuis les Reglages, on redemande l'ecran de
  // connexion pour rejoindre son vrai compte.
  if (demanderConnexion.value) {
    return <LoginScreen />;
  }
  if (!utilisateur.value) {
    return <LoginScreen />;
  }

  if (!donneesPretes.value) {
    return <div style={{textAlign:'center',padding:'80px 20px',color:'#b5b0a4',fontWeight:600}}>{t('chargement')}</div>;
  }

  if (ouvrirCalcDemande.value) {
    ouvrirCalcDemande.value = false;
    // Plan coach actif : les objectifs viennent du plan (27/09), le
    // calcul n'est plus ouvert.
    if (!planCoachActif.value) {
      if (estPremium.value || !calculBaseFait.value) besoinsOuverts.value = true;
      else ongletActif.value = 'premium';
    }
  }

  if ((besoinsRequis() && !planCoachActif.value) || besoinsOuverts.value) {
    return <Besoins />;
  }

  const onglet = ongletActif.value;
  const ordre = ['journal', 'entrainer', 'stats', 'premium'];
  const idx = Math.max(0, ordre.indexOf(onglet === 'courses' ? (origineCourses.value || 'journal') : onglet));

  // ============================================================
  // RAIL A 4 PANNEAUX — architecture de la v1 (ses 4 iframes).
  // Les quatre onglets sont montes EN PERMANENCE, chacun avec son
  // propre defilement interne. Changer d'onglet = translater le
  // rail. Aucun montage/demontage -> aucun flash, et chaque onglet
  // garde sa position de scroll, exactement comme la v1.
  // ============================================================
  const railRef = useRef(null);
  const defileurs = useRef({});
  defileur.el = defileurs.current[onglet] || null;

  const poserRail = (avecTransition) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.style.transition = avecTransition
      ? 'transform .32s cubic-bezier(.2,.9,.25,1.07)'   /* courbe et duree v1 */
      : 'none';
    rail.style.transform = 'translateX(' + (idx * -25) + '%)';
  };
  useEffect(() => { poserRail(true); }, [idx]);
  useEffect(() => { poserRail(false); }, []);   /* position initiale sans animation */

  // ============================================================
  // BOUTON RETOUR DU TELEPHONE
  // La v1 empilait des etats d'historique (pushState) pour que le
  // retour Android navigue dans l'app au lieu d'en sortir. Meme
  // principe ici, avec une sentinelle reposee a chaque retour :
  //   • 1 pression  -> un cran en arriere (vue interne, puis onglet)
  //   • 2 pressions rapprochees -> retour direct a l'accueil Journal
  //   • deja a l'accueil -> on laisse le telephone quitter l'app
  // ============================================================
  const dernierRetour = useRef(0);
  useEffect(() => {
    try { history.pushState({ belfit: 1 }, ''); } catch (e) {}

    const onPop = () => {
      const t = Date.now();
      const doublePression = t - dernierRetour.current < 600;
      dernierRetour.current = t;

      const vue = vueEntrainer.value;
      const ongletCourant = ongletActif.value;
      const pageRepas = repasOuvertId.value !== null;
      const enProfondeur = retourEnAttente() || pageRepas
        || vue.nom !== 'accueil' || ongletCourant !== ONGLET_VITRINE;

      // Rien a remonter : on ne repose pas de sentinelle, le
      // telephone peut quitter l'application normalement.
      if (!enProfondeur) return;

      try { history.pushState({ belfit: 1 }, ''); } catch (e) {}

      if (doublePression) {
        // Retour direct a l'accueil, quel que soit l'endroit.
        while (depilerRetour()) { /* ferme tous les ecrans empiles */ }
        repasOuvertId.value = null;
        vueEntrainer.value = { nom: 'accueil', params: null };
        allerOnglet(ONGLET_VITRINE);
        return;
      }

      // Un seul cran en arriere : d'abord le dernier ecran superpose
      // (Reglages, Statistiques avancees, detail de seance...), puis
      // les etats que main.jsx gere lui-meme.
      if (depilerRetour()) { /* ferme */ }
      else if (pageRepas) repasOuvertId.value = null;
      // Le detail d'une seance s'ouvre depuis TROIS endroits : la
      // bibliotheque de programmes, « Demarrer une seance », et la
      // fiche d'un jour du calendrier. Les deux derniers posent
      // depuis:'journal'. Le bouton retour VISIBLE le respectait
      // deja ; celui-ci ne le regardait pas et renvoyait toujours vers
      // « Tous les programmes ». D'ou la page qui revenait sans qu'on
      // l'ait demandee (Raci, 17/08). Les deux retours suivent
      // desormais la meme regle.
      // 5/09 : plus rien ne mene a la bibliotheque. Le retour materiel
      // d'Android y renvoyait encore depuis une fiche de seance, et
      // faisait apparaitre un ecran que l'utilisateur n'avait pas
      // ouvert. Il rend la main a S'entrainer, comme la fleche visible.
      else if (vue.nom === 'seanceDetail') retourEntrainer();
      else if (vue.nom !== 'accueil') retourEntrainer();
      // Le retour ramene sur l'onglet d'OUVERTURE, pas sur un journal
      // ecrit en dur : en mode vitrine il renvoyait sur une page que
      // l'utilisateur n'avait jamais ouverte.
      else allerOnglet(ONGLET_VITRINE);
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ---- Balayage : le rail suit le doigt (v1) ----
  const geste = useRef(null);
  // Zones ou le balayage de page ne doit pas prendre la main.
  //
  // La liste de selecteurs seule ne suffisait pas : il fallait penser a
  // l'alimenter a chaque nouvel ecran, et on l'oubliait — les filtres de
  // « Choisir mes exercices » changeaient d'onglet quand on faisait
  // defiler les pastilles. Deux garde-fous s'y ajoutent donc, qui n'ont
  // rien a declarer :
  //
  //   1. tout element portant data-sans-swipe, pour se signaler soi-meme
  //      sans venir modifier ce fichier ;
  //   2. tout ancetre qui defile HORIZONTALEMENT. Une rangee de chips,
  //      un carrousel, un tableau large : le doigt y fait deja defiler
  //      quelque chose, la page n'a pas a bouger en meme temps. C'est ce
  //      qui rattrape les cas qu'on n'a pas prevus.
  const defileHorizontal = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n.scrollWidth > n.clientWidth + 4) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
      }
    }
    return false;
  };
  const debutTouche = (e) => {
    if (e.touches.length !== 1) return;
    const cible = e.target;
    if (!cible.closest) return;
    if (cible.closest(
      '.modale, .voile, .cp-overlay, .fr-plein, .ml-overlay, .water-modal, .modal-overlay, ' +
      '.premium-overlay, .v2-timer-container, .v2-timer-overlay, .bn, ' +
      '.prog-onglets, .idees-cats, input, select, textarea, .couche-repas, ' +
      '[data-sans-swipe]'
    )) return;
    if (defileHorizontal(cible)) return;
    geste.current = {
      x: e.touches[0].clientX, y: e.touches[0].clientY,
      verrou: null, dx: 0, vx: 0,
      dernierX: e.touches[0].clientX, dernierT: Date.now(),
    };
  };
  const bougeTouche = (e) => {
    const g = geste.current;
    if (!g || e.touches.length !== 1) return;
    const x = e.touches[0].clientX;
    const dx = x - g.x, dy = e.touches[0].clientY - g.y;
    // Decision differree et exigeante : un defilement vertical rapide
    // comporte souvent quelques pixels d'horizontal sur les premiers
    // evenements — la v2 verrouillait alors 'h' et le rail tressautait.
    // On attend 14 px de deplacement et on exige une vraie dominante
    // horizontale (ratio 1.5, comme le ressenti v1) pour prendre la main ;
    // tout le reste est un defilement vertical.
    if (g.verrou === null && (Math.abs(dx) > 14 || Math.abs(dy) > 14)) {
      // Double exigence : dominante horizontale ET tres peu de vertical.
      // Le pouce qui remonte la page en biais a toujours 12 px et plus
      // de vertical au moment de la decision -> defilement, jamais swipe.
      g.verrou = (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dy) < 12) ? 'h' : 'v';
      if (g.verrou === 'h') {
        // Le rail suivra le doigt A PARTIR d'ici : sans cette origine,
        // il sauterait d'un coup du deplacement deja accumule.
        g.dxOrigine = dx;
        // Si une transition est en cours, on repart de la position
        // REELLEMENT affichee du rail : sans cela, couper la
        // transition le ferait claquer d'un coup a sa position
        // theorique (le saut visible quand on enchaine les swipes).
        const rail = railRef.current;
        if (rail) {
          const m = new DOMMatrixReadOnly(getComputedStyle(rail).transform);
          g.baseX = m.m41;                       // translation X reelle, en px
          rail.style.transition = 'none';
          rail.style.transform = 'translateX(' + g.baseX + 'px)';
        }
      }
    }
    if (g.verrou !== 'h') return;
    const maintenant = Date.now();
    if (maintenant - g.dernierT > 30) {
      g.vx = (x - g.dernierX) / (maintenant - g.dernierT);
      g.dernierX = x; g.dernierT = maintenant;
    }
    // Resistance aux extremites, comme la v1 (dx / 3).
    const L = window.innerWidth;
    const minX = (ordre.length - 1) * -L, maxX = 0;
    let cible = g.baseX + (dx - (g.dxOrigine || 0));
    if (cible > maxX) cible = maxX + (cible - maxX) / 3;
    if (cible < minX) cible = minX + (cible - minX) / 3;
    g.dx = dx;
    g.posX = cible;
    const rail = railRef.current;
    if (rail) rail.style.transform = 'translateX(' + cible + 'px)';
  };
  const finTouche = () => {
    const g = geste.current;
    geste.current = null;
    if (!g || g.verrou !== 'h') return;
    const L = window.innerWidth;
    const flick = Math.abs(g.vx) > 0.35;
    // Panneau le plus proche de la position reelle du rail, puis le
    // flick departage (la direction du relacher decide, comme la v1).
    const posX = (typeof g.posX === 'number') ? g.posX : -ordre.indexOf(ongletActif.value) * L;
    let cible = Math.round(-posX / L);
    if (flick) cible = Math.floor(-posX / L) + (g.vx < 0 ? 1 : 0);
    cible = Math.max(0, Math.min(ordre.length - 1, cible));
    if (ordre[cible] !== ongletActif.value) {
      ongletActif.value = ordre[cible];                     /* l'effet [idx] anime le rail */
    } else {
      poserRail(true);                                      /* retour elastique en place */
    }
  };
  const refHandlers = useRef();
  refHandlers.current = { debutTouche, bougeTouche, finTouche };
  useEffect(() => {
    const ts = (e) => refHandlers.current.debutTouche(e);
    const tm = (e) => refHandlers.current.bougeTouche(e);
    const te = () => refHandlers.current.finTouche();
    window.addEventListener('touchstart', ts, { passive: true });
    window.addEventListener('touchmove', tm, { passive: true });
    window.addEventListener('touchend', te, { passive: true });
    window.addEventListener('touchcancel', te, { passive: true });
    return () => {
      window.removeEventListener('touchstart', ts);
      window.removeEventListener('touchmove', tm);
      window.removeEventListener('touchend', te);
      window.removeEventListener('touchcancel', te);
    };
  }, []);

  // Le volet etait une barre posee EN TETE DU CONTENU QUI DEFILE :
  // ouvert depuis le bas d'une page, il s'affichait tout en haut,
  // hors de l'ecran. Et ses cinq elements en ligne debordaient a
  // droite sur 390 px — « Deconnexion » etait coupe. C'est desormais
  // un menu ancre sous le bouton qui l'ouvre, en colonne, avec un
  // voile qui le referme au premier appui a cote.
  // Rendu dans <body> (28/09) : dans la page, un parent transforme (le
  // rail des onglets) empechait le volet d'etre centre a l'ecran.
  const voletUtilisateur = voletProfil.value ? createPortal((
    <>
      <div class="profil-voile" onClick={() => { voletProfil.value = false; }} />
      {/* Icone utilisateur = MON PROFIL (23/09). Qui je suis, ou j'en
          suis, et les deux gestes qui s'y rattachent. La langue et la
          deconnexion n'y sont plus : elles vivent dans les Reglages,
          une seule fois chacune. */}
      {/* Volet profil sombre, lueur d'aurore (28/09, maquette A validee) */}
      <div class="profil-volet pv">
        <div class="pv-lueur" aria-hidden="true" />
        {/* Cadran bleu nuit du journal (28/09, maquette G validee) */}
        {(() => {
          const nom = prenomUtilisateur() || (utilisateur.value ? (utilisateur.value.displayName || utilisateur.value.email || '') : '');
          const o = objectifs.value || {};
          const c = totauxJourAff.value || {};
          const l = weightLog.value || [];
          const der = l.length ? l.slice().sort((x, y) => (x.iso < y.iso ? -1 : 1))[l.length - 1] : null;
          const kg = der ? (der.weight != null ? der.weight : der.kg) : null;
          const pr = programme.value;
          const acces = finAcces(dossierCoach.value, pr);
          const finPro = acces && acces.fin;
          const pro = !!finPro && Date.now() < finPro.getTime();
          const fr = (n) => Math.round(n || 0).toLocaleString('fr-BE');
          const part = o.kcal > 0 ? Math.min(1, (c.kcal || 0) / o.kcal) : 0;
          // Demi-cercle : centre (110,115), rayon 85, de 180° a 0°.
          const ang = Math.PI * (1 - part);
          const fx = (110 + 85 * Math.cos(ang)).toFixed(1), fy = (115 - 85 * Math.sin(ang)).toFixed(1);
          const barre = (lib, val, cible, coul) => (
            <div class="pvg-mb">
              <span class="pvg-ml">{lib}</span>
              <span class="pvg-mv">{fr(val)} / {fr(cible)} g</span>
              <span class="pvg-mt"><i style={{ width: (cible > 0 ? Math.min(100, (val || 0) / cible * 100) : 0) + '%', background: coul }} /></span>
            </div>
          );
          return (
            <>
              <div class="pv-tete">
                <span class="pv-av"><span>{(nom || '?').trim().charAt(0).toUpperCase()}</span></span>
                <div class="pv-id">
                  <b>{nom}{pro && <span class="pv-pro">PRO</span>}</b>
                  {pro
                    ? <span class="pv-fin">{acces.illimite ? 'Accès illimité' : 'Accès jusqu\'au ' + finPro.toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    : <span>{t('compte_gratuit')}</span>}
                </div>
              </div>
              {o.kcal > 0 && (
                <>
                  <svg class="pvg-cadran" viewBox="0 0 220 130" aria-hidden="true">
                    <defs><linearGradient id="pvg-deg" gradientUnits="userSpaceOnUse" x1="25" y1="0" x2="195" y2="0"><stop offset="0" stop-color="#FFD84A" /><stop offset=".5" stop-color="#F86A0C" /><stop offset="1" stop-color="#E53B1E" /></linearGradient></defs>
                    <path d="M25 115 A85 85 0 0 1 195 115" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="12" stroke-linecap="round" />
                    {part > 0.005 && <path d={'M25 115 A85 85 0 0 1 ' + fx + ' ' + fy} fill="none" stroke="url(#pvg-deg)" stroke-width="12" stroke-linecap="round" />}
                    <text x="110" y="92" text-anchor="middle" class="pvg-kc">{fr(c.kcal)}</text>
                    <text x="110" y="112" text-anchor="middle" class="pvg-sur">sur {fr(o.kcal)} kcal</text>
                  </svg>
                  <div class="pvg-macros">
                    {barre('Protéines', c.prot, o.prot, '#F2F3F5')}
                    {barre('Glucides', c.carbs, o.carbs, '#F5A800')}
                    {barre('Lipides', c.lip, o.lip, '#E4610B')}
                  </div>
                </>
              )}
              <div class="pvg-ligne">
                {planCoachActif.value
                  ? <span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>Fixé par ton coach</span>
                  : <span />}
                <span>Poids <b>{kg != null ? String(kg).replace('.', ',') + ' kg' : '—'}</b></span>
              </div>
              {!planCoachActif.value && (
                <button class="pv-bt" onClick={() => {
                  voletProfil.value = false;
                  if (vueReglages.value) { vueReglages.value = null; ongletActif.value = 'journal'; }
                  else ongletActif.value = 'journal';
                  ouvrirCalcDemande.value = true;
                }}>{t('profil_recalc')}<i>›</i></button>
              )}
              {/* 03/10 (Raci) : « Mon compte » retire, doublon de Parametres. */}
            </>
          );
        })()}
      </div>
    </>
  ), document.body) : null;

  const PAGES = { journal: OngletJournal, entrainer: OngletEntrainer, stats: Stats, premium: CoachPage };

  // Les reglages couvrent l'application entiere : ils s'ouvrent
  // depuis l'en-tete, present sur les quatre onglets, et se ferment
  // en revenant exactement d'ou l'on vient.
  // Le volet du bouton profil doit exister ICI AUSSI : l'en-tete des
  // reglages porte la meme icone bonhomme que les onglets, mais cette
  // branche s'arretait a <Reglages /> sans jamais rendre le volet.
  // L'appui basculait le signal... vers rien. C'etait le « je clique
  // sur mon compte et rien ne s'ouvre » de Raci, insaisissable dans
  // les tests parce qu'ils partaient toujours d'un onglet.
  if (vueReglages.value) {
    // key obligatoire : sans elle, Preact recycle le <div class="rail4">
    // du rendu precedent en <div class="ecran-reglages"> — le style
    // inline du balayage (translateX(-25/-50/-75%)) survit au
    // changement de classe et decale tout l'ecran de 97/195/292 px
    // vers la gauche selon l'onglet d'origine. La fleche retour se
    // retrouvait hors ecran : « le retour ne marche pas » (Raci, 8/08).
    // Meme famille que les position:fixed du rail, versant inverse :
    // cette fois c'est le rail qui contamine l'ecran plein.
    return (
      <div class="ecran-reglages" key="ecran-reglages">
        <Reglages />
        {voletUtilisateur}
      </div>
    );
  }
  if (statsAvOuvertes.value) {
    return <StatsAvancees fermer={() => { statsAvOuvertes.value = false; }} />;
  }

  return (
    <>
      {/* Le rail est DETRUIT quand un ecran plein (Reglages,
          Statistiques avancees) prend la main, puis RECREE a la
          fermeture. Sa position n'etait posee que par des effets qui
          ne re-tournent pas au changement de branche : le rail neuf
          restait a translateX(0) — panneau Journal — alors que
          l'onglet actif etait toujours BelFit+. C'etait le « la
          fleche revient dans le journal alimentaire » de Raci (8/08).
          Le ref-callback pose la position des que le noeud existe. */}
      <div class="rail4" key="rail4" ref={(n) => {
        railRef.current = n;
        if (n && !n.style.transform) {
          n.style.transition = 'none';
          n.style.transform = 'translateX(' + (idx * -25) + '%)';
        }
      }}>
        {ordre.map(k => {
          const Page = PAGES[k];
          return (
            <div class="rail-pan" key={k}>
              <div class="pan-scroll" ref={(n) => { defileurs.current[k] = n; if (k === onglet) defileur.el = n; }}>
                <div class="conteneur conteneur--nu">
                  {/* Le volet du bouton profil etait rendu dans le seul
                      panneau Journal du rail. Sur S'entrainer, Stats ou
                      BelFit+, l'appui basculait bien le signal, mais le
                      volet s'ouvrait dans un panneau voisin, hors de
                      l'ecran : le bouton paraissait mort sur trois
                      onglets sur quatre. Il suit desormais l'onglet
                      actif — meme place, meme style, partout. */}
                  {k === onglet && voletUtilisateur}
                  <Page />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {onglet === 'courses' && (
        <div class="app-scroll couche-courses">
          <div class="conteneur conteneur--nu"><Courses /></div>
        </div>
      )}
      <MealPage />
      <BottomNav />
    </>
  );
}

// Le montage n'a lieu que si la page porte le conteneur de l'application.
// L'apercu importe ce fichier pour rendre UNE page a la fois : sans ce
// garde-fou, l'import demarrerait l'application entiere par effet de bord.
const racine = document.getElementById('app');
/**
 * Filet de diagnostic (9/09).
 *
 * Raci : « rien ne se lance », puis « le bouton parametres non plus ne
 * reagit pas ». Deux boutons morts d'un coup, dont l'engrenage : ce
 * n'est pas un bouton, c'est une exception apres le premier
 * affichage. Le DOM reste peint, plus rien n'ecoute, et sur telephone
 * la console est hors d'atteinte — on cherche a l'aveugle.
 *
 * Le bandeau affiche le message et l'endroit. Il ne repare rien : il
 * rend le silence lisible.
 */
function montrerErreur(quoi, ou) {
  try {
    if (document.getElementById('bf-err')) return;
    const n = document.createElement('div');
    n.id = 'bf-err';
    n.setAttribute('style', [
      'position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:99999',
      'background:#A0301E', 'color:#fff', 'padding:12px 14px',
      'font:600 12px/1.45 system-ui,sans-serif', 'white-space:pre-wrap',
      'max-height:45vh', 'overflow:auto',
    ].join(';'));
    n.textContent = 'Erreur — ' + quoi + (ou ? '\n' + ou : '');
    document.body.appendChild(n);
  } catch (e) { /* le filet ne doit jamais etre la cause */ }
}
window.addEventListener('error', (e) => {
  montrerErreur(e.message, (e.filename || '') + ':' + (e.lineno || '') + ':' + (e.colno || ''));
});
window.addEventListener('unhandledrejection', (e) => {
  const r = e && e.reason;
  montrerErreur((r && (r.message || r)) || 'promesse rejetee', r && r.stack ? String(r.stack).split('\n')[1] : '');
});

// BandeauConfirmation a la racine (27/09) : il n'etait monte que dans
// un ecran de S'entrainer rarement ouvert, si bien que le courriel de
// confirmation ne partait jamais a l'inscription (signale par Raci).
if (racine) render(<><AvisAccesInvite /><BandeauConfirmation /><App /><AccueilGarde /></>, racine);

// Retrait du splash.
//
// C'etait un delai FIXE de 1300 ms, pose pour qu'on ait le temps de
// voir le logo (Raci, 8/08). Deux defauts : quand l'app etait prete en
// 200 ms on attendait quand meme, et quand elle tardait les deux temps
// s'additionnaient — le voile partait sur un ecran pas encore peint.
//
// Desormais un PLANCHER : le splash s'efface des que l'interface est
// reellement peinte, jamais avant 700 ms pour qu'on voie le logo,
// jamais apres 5 s pour ne pas rester coince si un rendu echoue.
(function retirerSplash(){
  const s = document.getElementById('splash');
  if (!s) return;
  const depart = Date.now();
  // 700 ms passaient trop vite : on voyait a peine le logo (Raci,
  // 02/09). 1200 ms rejoint la duree percue d'avant, a une difference
  // pres — c'est un PLANCHER, pas un delai : quand le chargement
  // prend plus longtemps, le voile couvre l'attente au lieu de s'y
  // ajouter.
  const PLANCHER = 1200;
  const PLAFOND = 5000;
  let fini = false;

  const partir = () => {
    if (fini) return;
    fini = true;
    s.classList.add('parti');
    setTimeout(() => s.remove(), 300);
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', '#F4F3F0');
  };

  const quandPret = () => {
    const reste = Math.max(0, PLANCHER - (Date.now() - depart));
    setTimeout(partir, reste);
  };

  // Deux images successives : la premiere annonce que le navigateur a
  // calcule la mise en page, la seconde qu'il l'a peinte.
  requestAnimationFrame(() => requestAnimationFrame(quandPret));
  setTimeout(partir, PLAFOND);
})();
