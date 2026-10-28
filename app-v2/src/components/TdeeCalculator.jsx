import { useState, useRef } from 'preact/hooks';
import { calculerBesoins, NIVEAUX_ACTIVITE, INTENSITES, OBJECTIFS } from '../data/tdee.js';
import { setObjectifs, calculBaseFait, poidsCalcul, objectifs, profilBesoins } from '../store/journal.js';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { createPortal } from 'preact/compat';
import { sexe } from '../store/perso.js';
import { ecritureBloquee, lectureSeule } from '../store/acces-nutrition.js';

// Calculateur de besoins. Le resultat se recalcule a chaque frappe (pas de bouton
// "Calculer" : reactif). "Appliquer" pousse le resultat dans les objectifs du jour.
// Les trois repartitions par objectif sont retirees le 9/09 (Raci) :
// « tu repartis tout simplement sans rien ajouter ». L'objectif est
// deja choisi ailleurs, et les macros a l'ecran portent deja un
// rapport — c'est celui-la qu'on met a l'echelle.

/** Largeur d'un champ de pastille, en caracteres, pour qu'il se moule
 *  sur son chiffre au lieu d'occuper une case fixe.
 *
 *  Retiree par erreur le 9/09 en meme temps que le bloc des trois
 *  repartitions — elle etait rangee entre REPARTITIONS et grammesDe.
 *  Consequence : « larg is not defined » a l'ouverture du
 *  calculateur, l'app plantait apres son premier affichage et plus
 *  aucun bouton ne repondait. Le build passait : une fonction absente
 *  ne se voit qu'a l'execution. */
function larg(v) {
  return Math.max(1, String(v == null ? '' : v).length) + 0.6 + 'ch';
}

/**
 * Part d'une macro dans les calories du jour, arrondie a l'entier.
 * Les trois parts peuvent totaliser 99 ou 101 : chacune est juste,
 * c'est l'arrondi qui ne tombe pas rond. Mieux vaut trois chiffres
 * exacts qu'un total force a 100.
 */
/**
 * La couronne des macros. Maquette C, retenue par Raci le 9/09 —
 * inspiree de la fiche MyFitnessPal qu'il m'a envoyee : « c'est pour
 * analyser la page et voir ce qu'elle a en plus de la mienne ».
 *
 * Trois chiffres alignes disent combien de chaque macro, jamais leur
 * RAPPORT : il fallait le calculer de tete. L'anneau le montre. Les
 * segments sont proportionnels aux CALORIES de chaque macro, pas aux
 * grammes — 100 g de lipides ne pesent pas comme 100 g de glucides.
 */
const R_ANNEAU = 50;
const C_ANNEAU = 2 * Math.PI * R_ANNEAU;
function Anneau({ prot, carbs, lip, centre }) {
  const kp = (+prot || 0) * 4, kg = (+carbs || 0) * 4, kl = (+lip || 0) * 9;
  const tot = kp + kg + kl;
  // Rien de saisi : l'anneau reste une piste vide plutot que de
  // disparaitre — sa place ne bouge pas d'une frappe a l'autre.
  const seg = tot > 0
    ? [kp / tot, kg / tot, kl / tot].map(x => x * C_ANNEAU)
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
      {/* Raci, 9/09 : « mettre le chiffre principal en tres grand au
          centre, et en dessous, en plus petit, kcal / jour. Le donut
          ne sert plus seulement de decoration, il porte l'information
          principale. » L'etiquette OBJECTIF / TES MACROS disparait :
          elle volait la place au chiffre pour dire ce que le contexte
          dit deja. */}
      <div class="bs-anneau-mid">
        <b>{centre}</b>
        <span>kcal / jour</span>
      </div>
    </div>
  );
}

/** Une ligne de legende : pastille, nom, grammes, part. */
function LigneMacro({ teinte, nom, g, part }) {
  return (
    <div class="bs-lg">
      <i class="bs-lg-pt" style={{ background: teinte }} />
      <span class="bs-lg-n">{nom}</span>
      <span class="bs-lg-g">{g}g</span>
      <span class="bs-lg-p">{part}</span>
    </div>
  );
}

function partDe(kcalMacro, kcalTotal) {
  if (!kcalTotal) return '';
  return Math.round((kcalMacro / kcalTotal) * 100) + ' %';
}

export function TdeeCalculator({ montre, fermer, retour }) {
  // Le formulaire rouvre sur ce qui a ete saisi la derniere fois. Les
  // valeurs en dur ne servent plus que de point de depart au tout
  // premier passage.
  const [f, setF] = useState(() => ({
    sexe: sexe.value || 'h', age: 25, poids: 75, taille: 175, masseGrasse: '',
    activiteBase: 1.3, joursEntrainement: 4, intensiteEntrainement: 0.03, ajustement: 300,
    ...(profilBesoins.value || {}),
  }));
  const [applique, setApplique] = useState(false);
  // 'calc' : formule Mifflin-St Jeor. 'manuel' : saisie directe des
  // 4 valeurs — reserve Premium, toujours (ajustement fin continu).
  const [mode, setMode] = useState('calc');
  // Options avancees repliees par defaut : masse grasse et jours
  // d'entrainement ne concernent qu'une minorite.
  const [avance, setAvance] = useState(false);
  // Le resultat n'existe qu'apres demande (Raci, 9/09). Toucher une
  // valeur le retire : afficher un chiffre calcule sur d'anciennes
  // entrees serait pire que ne rien afficher.
  const [calcule, setCalcule] = useState(false);
  const [man, setMan] = useState(() => ({ ...objectifs.value }));

  // Les PROPORTIONS de depart, figees a l'ouverture. C'est la
  // correction du 21/08 : le rapport etait relu dans l'etat courant a
  // chaque frappe, donc il se detruisait lui-meme. En tapant « 4000 »,
  // le premier « 4 » ramenait les macros a 0-1-0 ; le « 0 » suivant
  // les mettait a l'echelle de CES valeurs-la, et ainsi de suite. On
  // arrivait a 4000 kcal avec 0 g de proteines et 1000 g de glucides.
  // Fige, le rapport survit a la saisie chiffre par chiffre.
  const partRef = useRef(null);
  if (partRef.current === null) {
    const o = objectifs.value;
    const base = (+o.prot || 0) * 4 + (+o.carbs || 0) * 4 + (+o.lip || 0) * 9;
    partRef.current = base > 0
      ? { prot: (+o.prot || 0) / base, carbs: (+o.carbs || 0) / base, lip: (+o.lip || 0) / base }
      : null;
  }

  const majMan = (cle, val) => setMan(o => {
    const v = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
    // Une macro saisie a la main fait foi : elle redefinit le rapport,
    // sinon la frappe suivante sur les calories l'ecraserait.
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
    // Changer les calories repartit les macros dans les MEMES
    // proportions qu'au depart. Elles sont celles de l'utilisateur,
    // jamais une formule : on ne fait que les mettre a l'echelle.
    if (v === '' || v <= 0 || !partRef.current) return { ...o, kcal: v };
    const r = partRef.current;
    return {
      kcal: v,
      prot: Math.round(r.prot * v),
      carbs: Math.round(r.carbs * v),
      lip: Math.round(r.lip * v),
    };
  });
  const kcalMacros = Math.round((+man.prot || 0) * 4 + (+man.carbs || 0) * 4 + (+man.lip || 0) * 9);
  const kcalVise = +man.kcal || 0;
  const ecart = kcalMacros - kcalVise;
  // 50 kcal : le seuil qui existait deja pour la mention d'ecart. En
  // dessous, c'est l'arrondi des grammes, pas une erreur de saisie.
  const ecartVisible = kcalVise > 0 && Math.abs(ecart) > 50;
  // Macros toutes a zero : « Repartir » est la seule sortie, il ne
  // doit pas dependre du seuil d'ecart.


  const macroManquante = kcalVise > 0 &&
    [man.prot, man.carbs, man.lip].some(v => (+v || 0) === 0);

  // Les macros suivent les calories. Elles gardent LEURS proportions
  // (celles affichees a l'instant, pas un ratio type) : on ne fait que
  // les mettre a l'echelle. Sans ce geste, la ligne d'ecart constatait
  // un probleme sans rien offrir pour le regler (Raci, 23/08).
  // Trois macros a zero : il n'y a plus de rapport a mettre a
  // l'echelle. Ni la frappe des calories ni « Repartir » ne pouvaient
  // en sortir — l'ecran devenait un cul-de-sac (Raci, 02/09). Cette
  // repartition de secours n'est pas un conseil nutritionnel, juste
  // un point de depart modifiable : 25 % de lipides comme le
  // calculateur, 2 g/kg de proteines ramenes a une part de 25 %, le
  // reste en glucides.
  const REPARTITION_SECOURS = { prot: 0.25, carbs: 0.50, lip: 0.25 };

  const repartir = () => setMan(o => {
    const base = (+o.prot || 0) * 4 + (+o.carbs || 0) * 4 + (+o.lip || 0) * 9;
    const cible = +o.kcal || 0;
    if (cible <= 0) return o;
    // Une macro a zero rend le rapport degenere : mise a l'echelle, la
    // seule qui reste porte toutes les calories (3500 kcal -> 389 g de
    // lipides et rien d'autre). On repart alors du socle.
    const degenere = base <= 0 || [o.prot, o.carbs, o.lip].some(v => (+v || 0) === 0);
    if (degenere) {
      const suite = {
        kcal: cible,
        prot: Math.round((cible * REPARTITION_SECOURS.prot) / 4),
        carbs: Math.round((cible * REPARTITION_SECOURS.carbs) / 4),
        lip: Math.round((cible * REPARTITION_SECOURS.lip) / 9),
      };
      const nb = suite.prot * 4 + suite.carbs * 4 + suite.lip * 9;
      partRef.current = { prot: suite.prot / nb, carbs: suite.carbs / nb, lip: suite.lip / nb };
      return suite;
    }
    const f = cible / base;
    const suite = {
      kcal: cible,
      prot: Math.round((+o.prot || 0) * f),
      carbs: Math.round((+o.carbs || 0) * f),
      lip: Math.round((+o.lip || 0) * f),
    };
    const nb = suite.prot * 4 + suite.carbs * 4 + suite.lip * 9;
    if (nb > 0) {
      partRef.current = { prot: suite.prot / nb, carbs: suite.carbs / nb, lip: suite.lip / nb };
    }
    return suite;
  });

  // Le sens inverse : les calories se calent sur les macros. C'est le
  // chemin qui creait l'ecart au depart — une macro corrigee a la main
  // laissait les calories sur leur ancienne valeur.
  const calerCalories = () => setMan(o => ({ ...o, kcal: kcalMacros }));

  const choisirMode = (m) => {
    if (m === 'manuel' && !estPremium.value) {
      fermer();
      ongletActif.value = 'premium';
      return;
    }
    setMode(m);
  };

  // Le sexe remonte au profil : il sert au calcul, mais aussi a la
  // silhouette de Stats. Le choisir ici suffit, sans avoir a le redire
  // ailleurs — il n'etait ecrit nulle part jusqu'au 17/08.
  const maj = (cle, val) => {
    if (cle === 'sexe') sexe.value = val;
    setCalcule(false);
    setF(o => ({ ...o, [cle]: val }));
  };
  const num = (cle, val) => maj(cle, val === '' ? '' : parseFloat(val));

  const r = calculerBesoins({
    ...f,
    age: +f.age || 25, poids: +f.poids || 75, taille: +f.taille || 175,
    masseGrasse: f.masseGrasse === '' ? NaN : +f.masseGrasse,
    joursEntrainement: Math.max(0, +f.joursEntrainement || 0),
  });

  // Bornes de simple bon sens, larges a dessein : il ne s'agit pas de
  // juger un corps, seulement d'attraper une frappe qui a derape.
  const partProt = r.kcal ? (r.prot * 4) / r.kcal : 0;
  const alerte =
    (+f.poids < 30 || +f.poids > 250) ? 'Poids inhabituel : vérifie la valeur saisie.'
      : (+f.taille < 120 || +f.taille > 230) ? 'Taille inhabituelle : vérifie la valeur saisie.'
        : (+f.age < 14 || +f.age > 100) ? 'Âge inhabituel : vérifie la valeur saisie.'
          // Seuil a 30 % : le cas reel de Raci (147 kg au lieu de 97)
          // tombait a 34 % et passait sous un seuil de 35. A 97 kg il
          // est a 28 %, donc silence. Un avertissement, jamais un
          // refus : une seche legitime peut monter haut.
          : partProt > 0.30 ? `Les protéines font ${Math.round(partProt * 100)} % de tes calories, c'est beaucoup. Vérifie ton poids.`
            : null;

  // Un objectif calorique sans aucune macro n'est pas un objectif :
  // les barres du Journal n'ont plus rien a mesurer.
  const macrosVides = mode === 'manuel' && kcalVise > 0 && kcalMacros === 0;

  const appliquer = () => {
    if (macrosVides) return;
    if (ecritureBloquee()) return;   // alimentation fermee : calcul consultable, pas applicable
    if (mode === 'manuel') {
      setObjectifs({ kcal: +man.kcal || 0, prot: +man.prot || 0, carbs: +man.carbs || 0, lip: +man.lip || 0 });
      // Pas de calculBaseFait ni de poidsCalcul : la saisie manuelle
      // n'est ni le calcul offert, ni une base pour le rappel de recalcul.
    } else {
      setObjectifs({ kcal: r.kcal, prot: r.prot, carbs: r.carbs, lip: r.lip });
      calculBaseFait.value = true;   // le calcul offert est consomme
      poidsCalcul.value = +f.poids || null;
      profilBesoins.value = { ...f };   // pour rouvrir sur ces valeurs
    }
    setApplique(true);
    setTimeout(() => { setApplique(false); fermer(); }, 1100);
  };

  return createPortal(
    <>
      <div class={`voile voile--fonce ${montre ? 'montre' : ''}`} onClick={fermer} />
      <div class={`modale modale-calc ${montre ? 'montre' : ''}`}>
        {/* La feuille occupe quasi tout l'ecran : le voile n'est plus une
            sortie atteignable, il faut une sortie explicite.
            Ouvert depuis une page, on annonce OU l'on retourne : une
            croix ne dit pas d'ou l'on vient, et le calculateur peut
            s'ouvrir depuis le Journal comme depuis Mon programme. */}
        {retour ? (
          <button class="calc-retour" onClick={fermer}>← {retour}</button>
        ) : (
          <button class="calc-fermer" onClick={fermer} aria-label="Fermer">✕</button>
        )}
        <h3>Mes besoins</h3>

        <div class="calc-modes" role="group">
          <button class={mode === 'calc' ? 'active' : ''} onClick={() => choisirMode('calc')}>Calculé</button>
          <button class={mode === 'manuel' ? 'active' : ''} onClick={() => choisirMode('manuel')}>
            Manuel{!estPremium.value && <span class="calc-pro">PRO</span>}
          </button>
        </div>

        {mode === 'manuel' ? (
          <div class="calc-grille">
            {/* La meme couronne qu'en mode calcule : elle bouge a chaque
                frappe et rend visible le rapport des trois macros,
                qu'aucun des chiffres saisis ne donne. */}
            <div class="bs-hero pleine">
              <Anneau prot={man.prot} carbs={man.carbs} lip={man.lip} centre={kcalMacros} />
              <div class="bs-leg">
                <LigneMacro teinte="var(--mac-prot)" nom="Protéines"
                  g={+man.prot || 0} part={partDe((+man.prot || 0) * 4, kcalMacros)} />
                <LigneMacro teinte="var(--mac-carbs)" nom="Glucides"
                  g={+man.carbs || 0} part={partDe((+man.carbs || 0) * 4, kcalMacros)} />
                <LigneMacro teinte="var(--mac-lip)" nom="Lipides"
                  g={+man.lip || 0} part={partDe((+man.lip || 0) * 9, kcalMacros)} />
              </div>
            </div>
            <label class="pleine">Calories (kcal)
              <input type="number" value={man.kcal} onInput={e => majMan('kcal', e.currentTarget.value)} />
            </label>
            <label>Protéines (g)
              <input type="number" value={man.prot} onInput={e => majMan('prot', e.currentTarget.value)} />
            </label>
            <label>Glucides (g)
              <input type="number" value={man.carbs} onInput={e => majMan('carbs', e.currentTarget.value)} />
            </label>
            <label>Lipides (g)
              <input type="number" value={man.lip} onInput={e => majMan('lip', e.currentTarget.value)} />
            </label>
            <div class="calc-note pleine">
              {/* « P×4 + G×4 + L×9 = 4503 kcal » est un reste de
                  tableur : le total est deja au centre de l'anneau.
                  Ne reste que ce qu'on ne voit pas — l'ecart avec
                  l'objectif saisi (Raci, 9/09). */}
              {ecart === 0
                ? <>Tes macros tombent juste sur {kcalVise} kcal.</>
                : Math.abs(ecart) <= 50
                  ? <><b>{Math.abs(ecart)} kcal</b> d'écart avec ton objectif — c'est l'arrondi des grammes.</>
                  : null}
              {/* L'ecart porte son chiffre et son sens : « ecart avec tes
                  calories » disait qu'il y avait un probleme sans dire
                  lequel, ni de combien, ni comment en sortir. */}
              {ecartVisible && (ecart < 0
                ? <> — il manque <b>{-ecart} kcal</b> pour atteindre {kcalVise}.</>
                : <> — <b>{ecart} kcal</b> de trop par rapport à {kcalVise}.</>)}
              {/* Raci, 9/09 : « ou est le bouton repartir les calories ? »
                  Il ne sortait que sur un ecart de plus de 50 kcal ou
                  une macro vide. A 4503 pour 4500 vises, rien ne le
                  declenchait — alors que changer la repartition de ses
                  4500 kcal est un geste normal, pas un depannage. Il
                  s'affiche des qu'un objectif calorique est pose.
                  « Calories → N » reste conditionne a l'ecart : lui ne
                  sert vraiment qu'a rattraper un desaccord. */}
              {kcalVise > 0 && (
                <div class="calc-accorder">
                  <button type="button" class="ac-fort" onClick={repartir}>
                    Répartir les {kcalVise} kcal
                  </button>
                  {(ecartVisible || macroManquante) && kcalMacros > 0 && (
                    <button type="button" onClick={calerCalories}>Calories → {kcalMacros}</button>
                  )}
                </div>
              )}

              {/* Raci, 9/09 : « tu repartis tout simplement sans rien
                  ajouter ». Le bouton ouvrait trois objectifs — perte
                  de poids, maintien, prise de masse — alors que
                  l'objectif est deja choisi ailleurs et que les macros
                  affichees portent deja un rapport. Repartir, c'est
                  mettre CE rapport a l'echelle des calories visees,
                  pas en proposer un autre. Un appui, rien a lire. */}
            </div>
          </div>
        ) : (
        <>
          {alerte && <p class="calc-alerte">{alerte}</p>}

          <div class="bs-pastilles">
            <label class="bs-p bs-p--menu">
              <select value={f.sexe} onChange={e => maj('sexe', e.currentTarget.value)}>
                <option value="h">Homme</option>
                <option value="f">Femme</option>
              </select>
            </label>
            <label class="bs-p">
              <input type="number" value={f.age} style={{ width: larg(f.age) }}
                onInput={e => num('age', e.currentTarget.value)} />
              <i>ans</i>
            </label>
            <label class="bs-p">
              <input type="number" value={f.poids} style={{ width: larg(f.poids) }}
                onInput={e => num('poids', e.currentTarget.value)} />
              <i>kg</i>
            </label>
            <label class="bs-p">
              <input type="number" value={f.taille} style={{ width: larg(f.taille) }}
                onInput={e => num('taille', e.currentTarget.value)} />
              <i>cm</i>
            </label>

            {avance && (
              <label class="bs-p bs-p--large">
                <input type="number" value={f.masseGrasse} placeholder="—" style={{ width: larg(f.masseGrasse || '00') }}
                  onInput={e => num('masseGrasse', e.currentTarget.value)} />
                <i>% de masse grasse</i>
              </label>
            )}

            <div class="bs-titre">Ton objectif</div>
            <label class="bs-p bs-p--large bs-p--menu">
              <select value={f.ajustement} onChange={e => num('ajustement', e.currentTarget.value)}>
                {OBJECTIFS.map(o => <option value={o.val}>{o.label}</option>)}
              </select>
            </label>

            {/* Raci, 9/09 : « faudrait demander la question de l'objectif
                en premier ». Il commande tout le reste — le signe de
                l'ajustement, la repartition des macros — et le lire en
                dernier laissait croire que le calcul etait fait avant
                qu'on ait dit ce qu'on cherchait. */}
            {/* Raci, 9/09 : « activite physique : peu actif etc. Ensuite
                je demanderais s'il fait du sport et la frequence, et
                ainsi calculer en fonction de tous ces parametres. »

                Les deux variables existaient — activiteBase pour la
                journee, joursEntrainement x intensite pour le sport —
                mais le sport etait enterre dans les options avancees,
                avec une intensite figee a 0,03 que personne ne voyait.
                Le calcul n'a pas change ; la question, oui. Deux
                etiquettes separent ce qui ne se melange pas : ce qu'on
                fait toute la journee, et ce qu'on fait a la salle. */}
            <div class="bs-titre">Au quotidien, hors sport</div>
            <label class="bs-p bs-p--large bs-p--menu">
              <select value={f.activiteBase} onChange={e => num('activiteBase', e.currentTarget.value)}>
                {NIVEAUX_ACTIVITE.map(n => <option value={n.val}>{n.label}</option>)}
              </select>
            </label>

            <div class="bs-titre">Du sport ?</div>
            <div class="bs-oui-non">
              <button type="button" class={+f.joursEntrainement > 0 ? '' : 'on'}
                onClick={() => num('joursEntrainement', 0)}>Non</button>
              <button type="button" class={+f.joursEntrainement > 0 ? 'on' : ''}
                onClick={() => num('joursEntrainement', f.joursEntrainement > 0 ? f.joursEntrainement : 3)}>
                Oui
              </button>
            </div>
            {+f.joursEntrainement > 0 && (
              <>
                <label class="bs-p">
                  <input type="number" value={f.joursEntrainement} style={{ width: larg(f.joursEntrainement) }}
                    onInput={e => num('joursEntrainement', e.currentTarget.value)} />
                  <i>séances / sem.</i>
                </label>
                <label class="bs-p bs-p--menu">
                  <select value={f.intensiteEntrainement}
                    onChange={e => num('intensiteEntrainement', e.currentTarget.value)}>
                    {INTENSITES.map(n => <option value={n.val}>{n.label.split(' — ')[0]}</option>)}
                  </select>
                </label>
              </>
            )}
          </div>

          <button class="calc-avance" onClick={() => setAvance(!avance)}>
            {avance ? 'Masquer les options avancées' : 'Afficher les options avancées'}
          </button>

          {/* Le calcul se demande. Tant qu'on ne l'a pas demande, la
              fiche ne bouge pas pendant la saisie. */}
          {!calcule ? (
            <button class="calc-lancer" onClick={() => setCalcule(true)}>
              Calculer mes besoins
            </button>
          ) : (
            <>
              <div class="bs-hero">
                <Anneau prot={r.prot} carbs={r.carbs} lip={r.lip} centre={r.kcal} />
                <div class="bs-leg">
                  <LigneMacro teinte="var(--mac-prot)" nom="Protéines"
                    g={r.prot} part={partDe(r.prot * 4, r.kcal)} />
                  <LigneMacro teinte="var(--mac-carbs)" nom="Glucides"
                    g={r.carbs} part={partDe(r.carbs * 4, r.kcal)} />
                  <LigneMacro teinte="var(--mac-lip)" nom="Lipides"
                    g={r.lip} part={partDe(r.lip * 9, r.kcal)} />
                </div>
              </div>
              <p class="bs-s">
                Base {r.bmr} · Dépense {r.tdee} · {(OBJECTIFS.find(o => +o.val === +f.ajustement) || {}).label}
              </p>
            </>
          )}
        </>
        )}

        {/* « Appliquer » ne s'offre qu'une fois le chiffre obtenu : en
            mode calcule il n'y a rien a appliquer avant. */}
        {(mode === 'manuel' || calcule) && (
          <div class="calc-barre">
            <button class="calc-appliquer" onClick={appliquer} disabled={macrosVides} aria-disabled={lectureSeule.value ? 'true' : undefined}>
              {applique ? '✓ Appliqué !' : 'Appliquer aux objectifs'}
            </button>
          </div>
        )}
      </div>
    </>
  , document.body);
}
