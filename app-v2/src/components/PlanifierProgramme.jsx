import { useState } from 'preact/hooks';
import { retourEntrainer, allerVers } from './Entrainer.jsx';
import { seancesDuJour } from '../store/seances.js';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import {
  progParId, adopterProgramme, abandonnerProgramme, programmeActif,

  normaliserJours,
} from '../store/programme.js';
import { t } from '../i18n/index.js';

// ==========================================================
// PLANIFIER UN PROGRAMME — choix des jours.
//
// Raci le 10/08 : « le programme cree dans Creer mon programme
// apparait dans le calendrier, donc prevoir date lors de la
// creation », et « un utilisateur gratuit peut programmer maximum 4
// seances a la fois ; s'il en veut une 5e, il doit payer. S'il n'est
// pas premium et qu'il clique sur la 5e seance, un message
// s'affiche ».
//
// C'est l'ecran qui manquait : adopterProgramme() existait et etait
// teste, mais aucune interface ne l'appelait. Sans lui, un programme
// actif ne pouvait etre pose que par le code.
//
// La seance n du programme tombe sur le n-ieme jour coche, dans
// l'ordre de la semaine. On affiche donc le nom de chaque seance en
// face du jour qui la portera : sans cela, on coche des cases sans
// savoir ce qu'on planifie.
// ==========================================================

// Lundi en tete : c'est le debut de semaine du calendrier et du bloc
// « Ta semaine ». Les valeurs restent celles de Date.getDay().
const JOURS = [
  { v: 1, k: 'lun' }, { v: 2, k: 'mar' }, { v: 3, k: 'mer' },
  { v: 4, k: 'jeu' }, { v: 5, k: 'ven' }, { v: 6, k: 'sam' }, { v: 0, k: 'dim' },
];

export function PlanifierProgramme({ progId }) {
  const prog = progParId(progId);
  const premium = estPremium.value;
  const actif = programmeActif.value;
  const [confirmer, setConfirmer] = useState(false);
  // Raci, 26/08 : la sortie doit exister, et prevenir avant de perdre
  // un placement en cours. Rien de touche = on sort sans rien demander,
  // une question posee pour rien est une question de trop.
  const [touche, setTouche] = useState(false);
  const [quitter, setQuitter] = useState(false);

  // Si ce programme est deja actif, on repart de ses jours plutot que
  // d'une feuille blanche : « adapter mon programme » doit montrer ce
  // qui est en place, pas le faire ressaisir.
  // AFFECTATION explicite { jourSemaine: indexSeance }. C'etait une
  // simple liste de jours, ou la position imposait la seance : le
  // premier jour coche recevait la seance 1, le deuxieme la 2…
  // Raci le 10/08 : « je veux moi pouvoir dire quel jour, quel
  // muscle, dans quel ordre ». On choisit donc le jour ET la seance.
  const [aff, setAff] = useState(() =>
    (actif && actif.id === progId && actif.jours)
      ? normaliserJours(actif.jours, (prog && prog.seances.length) || 0)
      : {}
  );
  const [bloque, setBloque] = useState(false);
  const [jourOuvert, setJourOuvert] = useState(null);   // jour dont on choisit la seance

  if (!prog) {
    return (
      <div class="pg-planifier">
        <button class="pl-retour" onClick={retourEntrainer}>←&nbsp; {t('ml_retour')}</button>
        <p class="pl-vide">{t('pl_introuvable')}</p>
      </div>
    );
  }

  const total = prog.seances.length;
  const choisis = Object.keys(aff).map(Number);

  const ouvrirJour = (v) => {
    if (v === jourFait) return;
    if (aff[v] !== undefined) { setJourOuvert(jourOuvert === v ? null : v); return; }
    // Le quota gratuit mord ICI, au moment du 5e jour affecte.
    setBloque(false);
    setJourOuvert(jourOuvert === v ? null : v);
  };

  const affecter = (v, index) => {
    if (v === jourFait) return;   // un jour deja entraine ne se replace plus
    const n = { ...aff };
    if (index === null) delete n[v];
    else {
      // ECHANGE. Raci, 26/08 : « je clique sur replacer et je ne peux
      // rien modifier ». Sur un programme complet, chaque seance est
      // deja posee quelque part : toutes les autres etaient donc
      // grisees « deja placee un autre jour », et le seul choix
      // possible etait celui deja en place. Cul-de-sac total.
      // Choisir une seance posee ailleurs echange desormais les deux
      // jours — c'est ce que « replacer » veut dire.
      const ailleurs = Object.keys(n).map(Number).find(j => n[j] === index && j !== v);
      const avant = n[v];
      n[v] = index;
      if (ailleurs !== undefined) {
        if (avant === undefined) delete n[ailleurs];
        else n[ailleurs] = avant;
      }
    }
    setAff(n);
    setTouche(true);
    setJourOuvert(null);
    setBloque(false);
  };

  /**
   * Le jour qui porte deja cette seance, hors celui qu'on edite, ou
   * undefined. On renvoie le JOUR et non plus un booleen : le menu
   * doit pouvoir dire avec qui l'echange se fera.
   */
  const dejaAilleurs = (index, sauf) => {
    const e = Object.entries(aff).find(([j, i]) => i === index && Number(j) !== sauf);
    return e ? Number(e[0]) : undefined;
  };
  const nomJourDe = (v) => t('day_' + (JOURS.find(j => j.v === v) || {}).k);

  /**
   * Le jour courant est-il verrouille ?
   *
   * Raci, 5/09 : « une fois que la seance est faite elle est faite ;
   * plus possible de modifier le jour qui a deja ete fait ». On
   * pouvait replacer une autre seance sur aujourd'hui apres l'avoir
   * entrainee : le calendrier gardait la seance reelle, mais le
   * programme en annonçait une autre, et la tuile reproposait de la
   * demarrer. Le jour se ferme des qu'il porte un entrainement.
   */
  const auj = new Date();
  const isoAuj = auj.getFullYear() + '-'
    + String(auj.getMonth() + 1).padStart(2, '0') + '-'
    + String(auj.getDate()).padStart(2, '0');
  const jourFait = seancesDuJour(isoAuj).length ? auj.getDay() : null;

  /**
   * Les seances proposees pour un jour donne.
   *
   * Raci, 5/09 : Mercredi porte deja « Jour 1 — Pecs », et en ouvrant
   * Samedi la meme seance revient en tete de liste. Sur un jour vide,
   * la choisir ne l'echange pas — elle la deplace et laisse Mercredi
   * vide. La liste proposait donc de defaire ce qui venait d'etre
   * fait, en l'appelant « echanger ».
   *
   * Sur un jour VIDE on ne montre que ce qui reste a poser. Sur un
   * jour DEJA rempli on garde tout : la, choisir une seance placee
   * ailleurs est un vrai echange, et c'est le seul moyen de permuter
   * deux jours.
   *
   * Cas limite : toutes les seances sont placees et on ouvre un jour
   * vide. Une liste vide serait un cul-de-sac — on remontre tout,
   * sous le nom exact du geste : « deplacer depuis X ».
   */
  const choixDuJour = (v) => {
    const tous = prog.seances.map((sa, i) => ({ sa, i, pris: dejaAilleurs(i, v) }));
    if (aff[v] !== undefined) return tous;
    const libres = tous.filter(c => c.pris === undefined);
    return libres.length ? libres : tous;
  };

  // Un compte gratuit sur un programme 6 jours ne peut cocher que 4
  // jours : exiger le compte complet le laissait devant un bouton
  // eteint qui ne s'allumerait jamais. Cul-de-sac trouve le 10/08 en
  // eprouvant le verrou. On accepte donc un plan partiel, en le
  // disant : les seances au-dela ne sont pas planifiees, elles
  // restent accessibles a la main depuis la fiche du programme.
  const plafond = total; // Raci 31/10 : plus de quota gratuit.
  // On enregistre des qu'UN jour est coche. Exiger le compte complet
  // etait une regle de ma part, pas une demande : Raci, en Premium sur
  // un programme 5 jours, restait a « 4 / 5 » devant un bouton eteint
  // parce qu'il ne voulait s'entrainer que quatre jours cette
  // semaine-la. Personne ne doit etre bloque parce que sa semaine ne
  // rentre pas dans le moule du programme. Le compteur dit ce qui
  // reste non planifie, et ces seances restent posables a la main
  // depuis n'importe quelle date du calendrier.
  const complet = choisis.length >= 1;
  const partiel = choisis.length < total;

  const valider = () => {
    if (!complet) return;
    adopterProgramme(progId, aff);
    retourEntrainer();
  };

  return (
    <div class="pg-planifier">
      <button class="pl-retour" onClick={() => (touche ? setQuitter(true) : retourEntrainer())}>
        ←&nbsp; {t('ml_retour')}
      </button>

      {quitter && (
        <div class="pl-confirme pl-confirme--quitter">
          <p>{t('pl_quitter_q')}</p>
          <div class="pl-confirme-btns">
            <button class="pl-conf-non" onClick={() => setQuitter(false)}>{t('pl_rester')}</button>
            <button class="pl-conf-oui" onClick={retourEntrainer}>{t('pl_quitter_ok')}</button>
          </div>
        </div>
      )}

      <h1 class="pl-titre">{t('pl_titre')}</h1>
      <p class="pl-sous">{prog.name} · {total} {t(total > 1 ? 'sessions' : 'session')}</p>

      {/* Maquette A, retenue par Raci le 5/09 : « aucune distinction
          entre les differents parametres ». Sept jours, deux liens et
          un bouton portaient le meme fond blanc et le meme poids.
          Une etiquette annonce chaque groupe, et le compteur remonte
          ici — en bas de page il disparaissait des qu'on faisait
          defiler, au moment ou l'on en a besoin. */}
      <div class="pl-sect">
        <b>{t('pl_sect_semaine')}</b>
        <i class={complet ? 'ok' : ''}>
          {choisis.length} / {total} {t('pl_jours_choisis')}
        </i>
      </div>

      <div class="pl-jours">
        {JOURS.map(j => {
          const index = aff[j.v];
          const on = index !== undefined;
          const ouvert = jourOuvert === j.v;
          return (
            <div key={j.v} class="pl-jour-bloc">
              <button class={'pl-jour' + (on ? ' on' : '') + (ouvert ? ' ouvert' : '')
                  + (j.v === jourFait ? ' fige' : '')}
                disabled={j.v === jourFait}
                aria-expanded={ouvert ? 'true' : 'false'} onClick={() => ouvrirJour(j.v)}>
                <span class="pl-jour-nom">{t('day_' + j.k)}</span>
                <span class="pl-jour-seance">
                  {j.v === jourFait ? '✓ ' + t('pl_jour_fait')
                    : on ? prog.seances[index].titre : t('pl_choisir_seance')}
                </span>
              </button>

              {ouvert && (
                <div class="pl-menu">
                  {choixDuJour(j.v).map(({ sa, i, pris }) => (
                      <button key={i} class={'pl-menu-l' + (index === i ? ' on' : '')}
                        onClick={() => affecter(j.v, i)}>
                        <span class="pl-menu-n">{sa.titre}</span>
                        <span class="pl-menu-s">
                          {pris === undefined ? sa.sub
                            : on ? t('pl_echanger', { j: nomJourDe(pris) })
                              : t('pl_deplacer', { j: nomJourDe(pris) })}
                        </span>
                      </button>
                  ))}
                  {on && (
                    <button class="pl-menu-vider" onClick={() => affecter(j.v, null)}>
                      {t('pl_jour_vider')}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>


      {partiel && (
        <p class="pl-compte">{t('pl_partiel', { n: total - choisis.length })}</p>
      )}

      <button class="pl-valider" disabled={!complet} onClick={valider}>
        {t('pl_valider')}
      </button>

      {/* Ce lien mene a la BIBLIOTHEQUE, pas a une modification : on y
          choisit un autre programme. Il s'est appele « Modifier mon
          programme » le 26/08 ; Raci a suivi le lien et est tombe sur
          « Tous les programmes ». Un libelle doit nommer sa
          destination, pas l'intention qu'on prete au geste. */}
      {/* « Changer de programme » ouvrait la fiche du programme COURANT :
          on ne changeait rien, on relisait ce qu'on avait deja, et
          c'etait l'un des derniers chemins vers la bibliotheque. Il
          refait les quatre questions, comme « Trouver mon programme »
          (Raci, 5/09). */}
      {actif && actif.id === progId && (
        <button class="pl-autre" onClick={() => allerVers('questionnaire')}>
          {t('pl_autre')}
        </button>
      )}

      {/* Abandonner. On pouvait adopter un programme et le modifier,
          jamais s'en defaire : la seule sortie etait d'en adopter un
          autre par-dessus, ce qui suppose d'en vouloir un (Raci,
          17/08). En dernier, discret, et derriere une confirmation —
          c'est une action qu'on ne fait pas deux fois par mois. */}
      {actif && actif.id === progId && (
        confirmer ? (
          <div class="pl-confirme pl-zone-danger">
            <p>{t('pl_abandon_q')}</p>
            <div class="pl-confirme-btns">
              <button class="pl-conf-non" onClick={() => setConfirmer(false)}>
                {t('cancel')}
              </button>
              <button class="pl-conf-oui" onClick={() => { abandonnerProgramme(); retourEntrainer(); }}>
                {t('pl_abandon_ok')}
              </button>
            </div>
          </div>
        ) : (
          /* Zone a part, separee par un filet : c'est la seule action
             de la page qui efface quelque chose. La phrase dit ce
             qu'on perd — sans elle, « Abandonner » ressemble a un
             troisieme bouton de reglage (Raci, 5/09). */
          <div class="pl-zone-danger">
            <button class="pl-abandon" onClick={() => setConfirmer(true)}>
              {t('pl_abandon')}
            </button>
            <p class="pl-danger-txt">{t('pl_abandon_perte')}</p>
          </div>
        )
      )}
    </div>
  );
}
