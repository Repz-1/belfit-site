#!/usr/bin/env node
// ============================================================
// AUDIT BELFIT — verrous permanents.
//
// Regle de travail : chaque bug trouve devient une regle ICI avant
// d'etre considere comme corrige. L'audit lit les fichiers, il ne
// lance pas de navigateur : il attrape les regressions d'ecriture
// (couleur hors palette, declaration ecrasee, doublon) avant qu'on
// ait besoin d'une capture d'ecran pour s'en apercevoir.
//
// Usage : node tools/audit.mjs        (depuis la racine du depot)
// Sortie : 0 si tout passe, 1 s'il reste un ecart.
// ============================================================
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (p) => (existsSync(resolve(RACINE, p)) ? readFileSync(resolve(RACINE, p), 'utf8') : null);

const ecarts = [];
const ok = [];
const signaux = [];   // a regarder, ne fait pas echouer l'audit
const faute = (regle, detail) => ecarts.push({ regle, detail });
const passe = (regle) => ok.push(regle);
const signale = (regle, detail) => signaux.push({ regle, detail });

// Les commentaires citent souvent la couleur qu'ils viennent de
// retirer : les lire ferait echouer R1 sur du texte explicatif.
const sansCommentaires = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

// ------------------------------------------------------------
// PALETTE BELFIT — source de verite du logo, plus les neutres et
// les accents valides par Raci. Toute autre teinte dans une feuille
// de style de page est un ecart jusqu'a preuve du contraire.
// ------------------------------------------------------------
const PALETTE = new Set([
  // logo
  '#151515', '#F8F2E8', '#FAC408', '#F86A0C', '#D71016',
  // onglets (styles.css)
  '#181818', '#191919', '#DFA004', '#DE2F14', '#3D7E5C', '#B07400',
  // texte / matiere
  '#16130F', '#6B655D', '#8A8279', '#A9A29A', '#FAF8F4', '#F4F3F0',
  '#F8CF01', '#B34700', '#F5A800', '#E4610B', '#1D1D1D', '#2E2A20',
  '#E3DED4', '#9A938A', '#4A4A4A', '#FFFFFF', '#FFF', '#000',
]);

// Teintes tolerees hors palette, avec leur justification ecrite.
// Ne rien ajouter ici sans une raison qui tienne en une ligne.
const DEROGATIONS = new Map([
  ['#EF4444', 'palette des groupes musculaires (pecs) — Stats.jsx'],
  ['#F97316', 'palette des groupes musculaires (dos) — Stats.jsx'],
  ['#F7B500', 'palette des groupes musculaires (epaules) — Stats.jsx'],
  ['#10B981', 'palette des groupes musculaires (biceps) — Stats.jsx'],
  ['#06B6D4', 'palette des groupes musculaires (triceps) — Stats.jsx'],
  ['#3B82F6', 'palette des groupes musculaires (jambes) — Stats.jsx'],
  ['#7A45E8', 'palette des groupes musculaires (abdos) — Stats.jsx'],
  ['#EC4899', 'palette des groupes musculaires (cardio) — Stats.jsx'],
  ['#D6D3CB', 'palette des groupes musculaires (repos) — Stats.jsx'],
  ['#FAF8F3', 'fond des pastilles de muscle non selectionnees (R75)'],
  ['#4A443C', 'texte des pastilles de muscle non selectionnees (R75)'],
  ['#F5F3FF', 'fond de pastille de rang, derive du violet abdos'],
  ['#DDD6FE', 'bordure de pastille de rang, derive du violet abdos'],
  ['#6D28D9', 'texte de pastille de rang, derive du violet abdos'],
  ['#E9DCC0', 'barre creuse — journee non enregistree'],
  ['#D8C79E', 'barre creuse — journee non enregistree'],
  ['#FEF2F2', 'note d\'alerte'], ['#FECACA', 'note d\'alerte'],
  ['#B91C1C', 'note d\'alerte'], ['#DC2626', 'note d\'alerte'],
  ['#FFF9E8', 'note de repartition'], ['#F3D98A', 'note de repartition'],
  ['#FFF6EC', 'etat presse'], ['#FBEFC7', 'etat presse'],
  ['#FFF4CC', 'onglet de repartition actif'],
  ['#3A414D', 'courbe de poids — gris ardoise'], ['#1E232D', 'courbe de poids — gris ardoise'],
  ['#7E8794', 'rampe de score — ardoise bas de rampe'],
  ['#3F9E6B', 'rampe de score — vert haut de rampe (decision Raci en attente)'],
  ['#F5F3EE', 'fond de bouton de navigation dans la modale muscles'],
  ['#F1F2F5', 'piste de barre de repartition'],
  ['#E6E8EC', 'bordure d\'onglet de repartition'],
  ['#F4F5F7', 'fond d\'icone d\'etat vide'],
  ['#4B5563', 'libelle de repartition'], ['#475569', 'libelle de modale'],
  ['#CBD5E1', 'bordure de champ de modale'], ['#E2E8F0', 'bouton annuler de modale'],
  ['#F1F5F9', 'bouton effacer de modale'], ['#1A1A1A', 'bouton enregistrer de modale'],
  ['#E9EDF2', 'filet de barre de navigation'], ['#6F6A61', 'libelle de barre de navigation'],
  ['#8A8580', 'texte secondaire de modale'], ['#888', 'chevron de select'],
  ['#312E81', 'barres de charge — indigo profond, choix Raci 10/08 : distingue la charge soulevee des calories'],
  ['#4F46E5', 'barres de charge — indigo profond, choix Raci 10/08'],
  ['#736C63', 'libelle secondaire — 4.88:1 sur creme, remplace #8A8279 mesure a 3.57:1'],
  ['#FFFDF5', "degrade de la carte d'invitation Premium"],
  ['#F3E2A8', 'bordure du bouton « modifier les muscles »'],
  ['#059669', 'REGLE MORTE .chart-bar.weight — voir R7'],
  ['#34D399', 'REGLE MORTE .chart-bar.weight — voir R7'],
]);

// ------------------------------------------------------------
// R1 — Aucune couleur hors palette dans stats.scoped.css.
// Trouve le 9/08 : le bleu #2563EB/#60A5FA des barres « Progression
// par exercice » n'appartenait a aucune palette BELFIT.
// ------------------------------------------------------------
const CSS_STATS = 'app-v2/src/legacy/stats.scoped.css';
{
  const s = lire(CSS_STATS);
  if (!s) faute('R1 palette Stats', `${CSS_STATS} introuvable`);
  else {
    const vues = new Map();
    for (const m of sansCommentaires(s).matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const h = m[0].toUpperCase();
      if (PALETTE.has(h) || DEROGATIONS.has(h)) continue;
      const ligne = s.slice(0, m.index).split('\n').length;
      if (!vues.has(h)) vues.set(h, ligne);
    }
    if (vues.size) {
      for (const [h, l] of vues) faute('R1 palette Stats', `${h} ligne ${l} — hors palette et sans derogation`);
    } else passe('R1 palette Stats');
  }
}

// ------------------------------------------------------------
// R2 — Declaration ecrasee plus bas dans la meme feuille.
// Trouve le 9/08 : `.ce-btn{border:1px solid ...}` (ligne 133) etait
// annule par `.ce-btn{border:none}` (ligne 282). Le commit v296
// annoncait un bouton borde ; a l'ecran il rendait `0px none`.
// La derniere declaration gagne : on verifie ce que voit l'ecran.
// ------------------------------------------------------------
const derniereValeur = (css, selecteur, propriete) => {
  let val = null, ligne = null;
  const re = new RegExp(`${selecteur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?:,[^{]*)?\\{([^}]*)\\}`, 'g');
  for (const m of css.matchAll(re)) {
    const p = new RegExp(`(?:^|;)\\s*${propriete}\\s*:\\s*([^;]+)`, 'i');
    const d = m[1].match(p);
    if (d) { val = d[1].trim(); ligne = css.slice(0, m.index).split('\n').length; }
  }
  return { val, ligne };
};
{
  const s = lire(CSS_STATS);
  if (s) {
    const b = derniereValeur(s, '.pg-stats .ce-btn', 'border');
    if (!b.val || /^none\b|^0(px)?\s+none/.test(b.val)) {
      faute('R2 bordure .ce-btn', `derniere valeur = ${b.val || 'absente'} (ligne ${b.ligne}) — le bouton rend sans contour`);
    } else passe('R2 bordure .ce-btn');

    // R3 — Les barres de charge ne doivent PAS partager la couleur des
    // barres de calories. Trouve le 10/08 : passees en orange « pour
    // unifier », les deux graphiques devenaient indistinguables l'un
    // au-dessus de l'autre. Attendu : l'indigo #312E81 -> #4F46E5.
    const c = derniereValeur(s, '.pg-stats .chart-bar.charge', 'background');
    const k = derniereValeur(s, '.pg-stats .chart-bar.kcalbar', 'background');
    const net = (v) => (v || '').toLowerCase().replace(/\s|!important/g, '');
    if (!c.val || !/#312E81/i.test(c.val)) {
      faute('R3 barres de charge', `derniere valeur = ${c.val || 'absente'} (ligne ${c.ligne}) — attendu le degrade #312E81 -> #4F46E5`);
    } else if (k.val && net(c.val) === net(k.val)) {
      faute('R3 barres de charge', 'charges et calories partagent le meme degrade — les deux graphiques deviennent indistinguables');
    } else passe('R3 barres de charge');
  }
}

// ------------------------------------------------------------
// R4 — Boites de chiffre : un seul traitement.
// Trouve le 9/08 : .exo-pr-box (jaune) et .stat-box (creme) jouaient
// le meme role — un chiffre et son libelle — avec deux matieres.
// ------------------------------------------------------------
{
  const s = lire(CSS_STATS);
  if (s) {
    const a = derniereValeur(s, '.pg-stats .exo-pr-box', 'background');
    const b = derniereValeur(s, '.pg-stats .stat-box', 'background');
    const net = (v) => (v || '').toLowerCase().replace(/\s/g, '');
    if (net(a.val) !== net(b.val)) {
      faute('R4 boites de chiffre', `.exo-pr-box = ${a.val} / .stat-box = ${b.val} — meme role, deux matieres`);
    } else passe('R4 boites de chiffre');
  }
}

// ------------------------------------------------------------
// R5 — Un seul chemin pour ouvrir la pesee.
// Trouve le 9/08 : en etat vide, la carte poids affichait DEUX
// boutons ouvrant la meme modale, l'un sous l'autre.
// Tranche par Raci le 23/08 : en etat vide, seul le bouton de l'etat
// vide reste — il n'y a rien a « modifier » tant qu'il n'y a rien.
// Le bouton permanent revient des la premiere pesee. La regle verifie
// donc qu'il est bien conditionne, pas qu'il a disparu.
// ------------------------------------------------------------
{
  const s = lire('app-v2/src/components/Stats.jsx');
  if (s) {
    const garde = /\{poidsTri\.length > 0 && \(\s*<button class="weight-add-btn"/.test(s);
    if (!garde) faute('R5 pesee — chemin unique', 'le bouton permanent n\'est plus conditionne : il redouble le bouton de l\'etat vide');
    else passe('R5 pesee — chemin unique');
  }
}

// ------------------------------------------------------------
// R6 — VERSION_APP et caches de service worker en phase.
// Convention MESUREE sur les 8 derniers commits (9/08) :
//   app-v2/src/version.js : VERSION_APP = N
//   sw.js (racine)        : belfit-vN
//   app-v2/public/sw.js   : belfit-v2-(N - 232)
// Les deux compteurs avancent ensemble, decales d'une constante.
// ------------------------------------------------------------
const DECALAGE_SW_V2 = 232;
{
  const v = lire('app-v2/src/version.js');
  const swR = lire('sw.js');
  const swV2 = lire('app-v2/public/sw.js');
  const nv = v && v.match(/VERSION_APP\s*=\s*(\d+)/);
  const nr = swR && swR.match(/belfit-v(\d+)['"]/);
  const n2 = swV2 && swV2.match(/belfit-v2-(\d+)['"]/);
  if (!nv || !nr || !n2) faute('R6 version/cache', 'VERSION_APP ou un cache SW illisible');
  else {
    const V = +nv[1];
    const soucis = [];
    if (+nr[1] !== V) soucis.push(`sw.js racine = belfit-v${nr[1]}, attendu belfit-v${V}`);
    if (+n2[1] !== V - DECALAGE_SW_V2) soucis.push(`app-v2 sw.js = belfit-v2-${n2[1]}, attendu belfit-v2-${V - DECALAGE_SW_V2}`);
    if (soucis.length) faute('R6 version/cache', soucis.join(' ; '));
    else passe(`R6 version/cache (v${V})`);
  }
}

// ------------------------------------------------------------
// R9 — Un aliment ne peut pas etre encode deux fois dans un repas.
// Trouve le 10/08 : Avoine encodee a 100 g, un appui sur le meme
// aliment dans la liste de resultats ajoutait une SECONDE ligne de
// 100 g. Le repas affichait alors 760 kcal pour 380 reellement
// manges — la journee comptait faux, ce n'etait pas qu'une liste
// qui s'allonge. La liste de resultats recouvre « DANS CE REPAS » :
// impossible de voir que l'aliment est deja la avant d'appuyer.
// ------------------------------------------------------------
{
  const jsx = lire('app-v2/src/components/MealCard.jsx');
  if (!jsx) faute('R9 doublon d\'aliment', 'MealCard.jsx introuvable');
  else {
    const soucis = [];
    // choisir() doit consulter les ingredients deja presents avant
    // d'appeler ajouterIngredient, et rendre la main si l'aliment
    // y figure deja.
    const m = jsx.match(/const choisir = \(nom\) => \{[\s\S]*?\n  \};/);
    if (!m) soucis.push('choisir() introuvable — la regle ne sait plus quoi verifier');
    else {
      const corps = m[0];
      const iGarde = corps.search(/dejaLa[\s\S]*?return;/);
      const iAjout = corps.indexOf('ajouterIngredient');
      if (iGarde === -1) soucis.push('choisir() n\'a pas de garde sur les aliments deja presents');
      else if (iAjout !== -1 && iAjout < iGarde) soucis.push('choisir() ajoute avant de verifier');
    }
    // Volontairement PAS de marque visible dans la liste : « appuyer
    // puis ajuster » est la regle pour tous les aliments, la signaler
    // sur un seul n'apprend rien (retiree le 10/08 a la demande de
    // Raci). La regle ne verifie donc que le comportement.
    if (soucis.length) faute('R9 doublon d\'aliment', soucis.join(' ; '));
    else passe('R9 doublon d\'aliment');
  }
}

// ------------------------------------------------------------
// R11 — La liste d'aliments courants se remplit toute seule.
// Decision de Raci le 10/08 : l'etoile a cocher est retiree. Elle
// etait collee au nom qu'on tape pour choisir l'aliment, se
// declenchait sans qu'on le veuille — c'est ainsi que l'avoine de
// Raci est devenue favorite sans decision — et rien ne disait ce
// qu'elle faisait. Le comptage des encodages la remplace : l'app
// sait deja ce qu'on mange tous les jours.
// ------------------------------------------------------------
{
  const jsx = lire('app-v2/src/components/MealCard.jsx');
  const store = lire('app-v2/src/store/perso.js');
  const css = lire('app-v2/src/styles/journal-socle.css');
  if (jsx && store && css) {
    const soucis = [];
    // L'etoile est revenue le 10/08 a la demande de Raci — les deux
    // listes coexistent. Ce qui est interdit, c'est son SILENCE :
    // une bascule doit s'annoncer et se defaire d'un geste.
    if (/basculerFavori/.test(jsx)) {
      if (!/mc-avis-fav/.test(jsx)) soucis.push('la bascule de favori n\'affiche aucun retour');
      if (!/maf-annuler/.test(jsx)) soucis.push('la bascule de favori ne peut pas etre annulee');
      if (!/border-left/.test((css.match(/\.mc-res-fav \{[^}]*\}|\.mc-resultats \.mc-res-fav \{[^}]*\}/) || [''])[0])) {
        soucis.push('l\'etoile n\'est plus separee de la zone de choix — c\'est ainsi qu\'on la touchait par megarde');
      }
    }
    // Les deux listes doivent rester distinctes et titrees, sinon on
    // ne sait plus laquelle on regarde ni ce que l'etoile fabrique.
    if (!/fav_titre/.test(jsx) || !/mc_courants/.test(jsx)) {
      soucis.push('les listes favoris / courants ne sont plus titrees separement');
    }
    // Le comptage doit etre appele la ou l'aliment entre vraiment
    // dans un repas, sinon la liste ne se remplit jamais.
    if (!/noterUsage\(nom\)/.test(jsx)) soucis.push('choisir() ne compte pas l\'encodage — la liste des courants resterait vide');
    if (!/export function alimentsCourants/.test(store)) soucis.push('alimentsCourants() absent du store');
    // La reprise des anciennes etoiles ne doit pas sauter : sans
    // elle, des semaines d'habitudes disparaissent d'un coup.
    if (!/export function estFavori/.test(store)) soucis.push('estFavori() absent du store');
    if (soucis.length) faute('R11 aliments courants', soucis.join(' ; '));
    else passe('R11 aliments courants');
  }
}

// ------------------------------------------------------------
// R15 — Acces invite : l'audit reste ROUGE tant qu'il est actif.
// Raci le 10/08 a demande de contourner momentanement l'ecran de
// connexion. Cette regle n'empeche rien : elle refuse simplement de
// laisser l'audit passer au vert pendant ce temps. Un contournement
// d'authentification en ligne ne doit pas pouvoir se faire oublier
// entre deux sessions, ni partir en production par inadvertance.
// Elle passera au vert d'elle-meme quand ACCES_LIBRE reviendra a
// false — le « nouvel ordre ».
// ------------------------------------------------------------
{
  const drapeau = lire('app-v2/src/acces-invite.js');
  const login = lire('app-v2/src/components/LoginScreen.jsx');
  if (drapeau && /ACCES_INVITE\s*=\s*true/.test(drapeau)) {
    faute('R15 acces invite ACTIF',
      'n\'importe qui entre sans compte sur belfit.be — remettre ACCES_INVITE a false pour refermer');
  } else if (drapeau) {
    // Referme : l'entree ne doit pas subsister hors du drapeau, et
    // l'ecran de connexion doit rester le seul chemin.
    const restes = [];
    if (login && /entrerEnInvite/.test(login) && !/ACCES_INVITE/.test(login)) {
      restes.push('LoginScreen appelle encore entrerEnInvite() hors du drapeau');
    }
    if (restes.length) faute('R15 acces invite', restes.join(' ; '));
    else passe('R15 acces invite (referme)');
  }
}

// ------------------------------------------------------------
// R14 — Mecanique du sens de la reglette (composant reserve).
// Raci le 10/08 : grand vers le haut, petit vers le bas — le sens
// d'une toise. La conversion position <-> valeur passe par un seul
// couple de fonctions (posDe / valDe) pour qu'il n'existe qu'un
// endroit ou le sens puisse se contredire : un calcul en dur qui
// reapparaitrait ailleurs ferait diverger l'affichage du reperage.
// ------------------------------------------------------------
{
  // La reglette a DEMENAGE le 12/08 dans son propre fichier : elle a
  // quitte le questionnaire d'entrainement, ramene a quatre
  // questions, et attend le questionnaire de programme alimentaire.
  // La regle a sonne a ce moment-la — signal juste, elle cherchait au
  // mauvais endroit. Elle lit desormais le composant lui-meme.
  const jsx = lire('app-v2/src/components/Reglette.jsx');
  if (jsx) {
    const soucis = [];
    // Le sens ne vit plus dans une table de questions mais dans la
    // prop `inverse`, que l'ecran appelant passera. Ce qu'on verrouille
    // ici, c'est que la MECANIQUE du sens inverse existe toujours.
    if (!/inverse \? max - v : v - min/.test(jsx)) soucis.push('la conversion « grand vers le haut » a disparu');
    if (!/const posDe =/.test(jsx) || !/const valDe =/.test(jsx)) soucis.push('les convertisseurs posDe/valDe ont disparu');
    // Aucun calcul de position en dur ne doit subsister a cote d'eux.
    const dur = jsx.match(/\((?:valeur|v|k) - min\) \* PX/g);
    if (dur) soucis.push(`${dur.length} calcul(s) de position en dur — ils ignorent le sens inverse`);
    if (soucis.length) faute('R14 sens de la reglette', soucis.join(' ; '));
    else passe('R14 sens de la reglette');
  }
}

// ------------------------------------------------------------
// R25 — Le questionnaire tient en quatre questions.
// Wording et choix dictes par Raci le 12/08. Il y en avait neuf :
// taille, poids, age, lieu et duree ont ete retires apres
// verification qu'aucune ne participait au choix du programme ni aux
// besoins caloriques — elles n'alimentaient que des paragraphes de
// conseil. Le lieu ne servait qu'a precocher le materiel, que la
// question 4 demande maintenant directement.
// ------------------------------------------------------------
{
  const quiz = lire('app-v2/src/components/Questionnaire.jsx');
  if (quiz) {
    const soucis = [];
    const m = quiz.match(/const ETAPES = \[([^\]]*)\]/);
    if (!m) soucis.push('ETAPES introuvable');
    else {
      const etapes = m[1].split(',').map(x => x.trim().replace(/'/g, '')).filter(Boolean);
      if (etapes.length !== 4) soucis.push(`${etapes.length} etapes au lieu de 4 : ${etapes.join(', ')}`);
      for (const attendue of ['objectif', 'niveau', 'frequence', 'materiel']) {
        if (!etapes.includes(attendue)) soucis.push(`etape « ${attendue} » absente`);
      }
    }
    // « Force / Performance » n'a pas de programmes a lui : sans ce
    // renvoi, l'objectif ne recommanderait RIEN et l'ecran final
    // resterait vide sans qu'aucune erreur ne se produise.
    if (!/if \(objectif === 'force'\) objectif = 'masse'/.test(quiz)) {
      soucis.push("l'objectif « force » ne renvoie plus vers un programme existant");
    }
    // Le materiel est passe d'un tableau a un choix unique : le reste
    // du code lit toujours une liste, via cette table.
    if (!/MATERIEL_PAR_CHOIX/.test(quiz)) soucis.push('la table materiel -> equipements a disparu');
    // Le questionnaire ne doit plus porter la moindre trace des cinq
    // questions retirees : une question morte dans QUESTIONS ne se
    // voit pas, mais elle finit par etre reactivee ou recopiee.
    for (const morte of ['REGLETTES', 'EQUIP_PAR_LIEU', 'dureeIdeale']) {
      if (new RegExp(`\\b${morte}\\b`).test(quiz)) soucis.push(`${morte} subsiste dans le questionnaire`);
    }
    // La reglette est CONSERVEE, dans son propre fichier : Raci la
    // destine au questionnaire de programme alimentaire pour coach.
    const rg = lire('app-v2/src/components/Reglette.jsx');
    if (!rg || !/export function Reglette/.test(rg)) {
      soucis.push('le composant Reglette a disparu — il est reserve au futur questionnaire nutrition');
    }
    if (soucis.length) faute('R25 questionnaire en 4 questions', soucis.join(' ; '));
    else passe('R25 questionnaire en 4 questions');
  }
}

// ------------------------------------------------------------
// R24 — Deux entrees pour poser une seance au calendrier.
// Raci le 10/08 : « l'application ne cree pas un programme sur
// plusieurs jours ». Verification faite, le programme en couvrait
// bien plusieurs — le defaut etait le CHEMIN : le questionnaire
// s'arretait sur une fiche a lire, et l'adoption vivait deux ecrans
// plus loin derriere « Choisir ce programme ». Deux entrees
// desormais : le questionnaire mene aux jours, et une date du
// calendrier permet d'y poser une seance.
// ------------------------------------------------------------
{
  const quiz = lire('app-v2/src/components/Questionnaire.jsx');
  const entr = lire('app-v2/src/components/Entrainer.jsx');
  const store = lire('app-v2/src/store/programme.js');
  if (quiz && entr && store) {
    const soucis = [];
    if (!/allerVers\('planifier', \{ prog: progId \}\)/.test(quiz)) {
      soucis.push('le questionnaire ne mene plus au choix des jours');
    }
    if (!/planifierSeance\(iso, sa\)/.test(entr)) soucis.push('on ne peut plus poser une seance depuis une date');
    // Une date posee a la main doit primer sur la regle du programme.
    if (!/const pose = planifs\.value\[iso\]/.test(store)) {
      soucis.push('une seance posee a la main ne prime plus sur le programme');
    }
    if (soucis.length) faute('R24 poser une seance', soucis.join(' ; '));
    else passe('R24 poser une seance');
  }
}

// ------------------------------------------------------------
// R23 — Onglet d'ouverture par l'adresse.
// Raci le 10/08 : un lien qui ouvre directement S'entrainer, sans
// passer par le Journal puis un appui. ?onglet=entrainer.
// Une valeur inconnue doit etre IGNOREE : sans la liste blanche,
// ?onglet=nimportequoi laisserait l'application sur un onglet
// inexistant, rail hors ecran et barre sans selection.
// ------------------------------------------------------------
{
  const nav = lire('app-v2/src/components/BottomNav.jsx');
  if (nav) {
    const soucis = [];
    if (!/get\('onglet'\)/.test(nav)) soucis.push('le parametre ?onglet n\'est plus lu');
    if (!/\['journal', 'entrainer', 'stats', 'premium'\]\.includes/.test(nav)) {
      soucis.push('la liste blanche des onglets a disparu — une valeur inconnue passerait');
    }
    if (soucis.length) faute('R23 onglet par l\'adresse', soucis.join(' ; '));
    else passe('R23 onglet par l\'adresse');
  }
}

// ------------------------------------------------------------
// R22 — La fenetre d'un jour depend du type de jour.
// Raci le 10/08 : « on est le 12, et quand je clique jusqu'au 16
// c'est la page du 12 qui s'ouvre ». Mesure alors : seul le titre
// changeait, le corps etait identique d'un jour a l'autre de la meme
// semaine — silhouette hebdomadaire et liste des muscles. Trois cas
// desormais : passe (ce qui a ete fait), aujourd'hui (la seance
// prevue, avec de quoi la demarrer), a venir (ce qui est prevu).
// ------------------------------------------------------------
{
  const jsx = lire('app-v2/src/components/Entrainer.jsx');
  if (jsx) {
    const soucis = [];
    if (!/const type = iso < isoAuj/.test(jsx)) soucis.push('la fenetre ne distingue plus passe, aujourd\'hui et a venir');
    if (!/seancesDuJour\(iso\)/.test(jsx)) soucis.push('un jour passe n\'affiche plus ce qui a ete fait');
    if (!/ml-prevu-b/.test(jsx)) soucis.push('aucun moyen de demarrer la seance prevue depuis un jour');
    // Le marquage manuel doit rester : c'est lui qui colore le
    // calendrier quand on s'entraine hors de l'application.
    if (!/basculerMuscle\(iso, g\.k\)/.test(jsx)) soucis.push('le marquage manuel des muscles a disparu');
    if (soucis.length) faute('R22 fenetre d\'un jour', soucis.join(' ; '));
    else passe('R22 fenetre d\'un jour');
  }
}

// ------------------------------------------------------------
// R21 — Les seances de programme designent leurs exercices par NOM.
// Raci le 10/08 : « dans dos il y a du triceps, jambes, tout est
// mixe ». Cause : sessionExos.js pointait par POSITION dans les
// tableaux de exercices.js. A l'ecriture, dos[0..3] valaient
// Tractions, Rowing barre, Tirage vertical, Rowing haltere ; la base
// a ensuite ete remplacee par 369 exercices tries alphabetiquement et
// les memes positions ont donne « Extension Triceps Incline »,
// « Flexion Buste Avant »… Les 86 seances servaient des exercices
// arbitraires sans qu'aucune erreur ne se produise.
// Un nom ne se decale pas quand la liste est retriee.
// ------------------------------------------------------------
{
  const data = lire('app-v2/src/data/sessionExos.js');
  const detail = lire('app-v2/src/components/SeanceDetail.jsx');
  if (data && detail) {
    const soucis = [];
    // Une reference « groupe:3 » est une position : le format qui a
    // pourri. Toute reference doit porter un nom.
    const positions = [...data.matchAll(/"[a-z]+:(\d+)"/g)];
    if (positions.length) soucis.push(`${positions.length} reference(s) encore par position`);
    if (!/parseInt\(rang, 10\)/.test(detail) === false) soucis.push('SeanceDetail resout encore par position');
    if (soucis.length) faute('R21 exercices par nom', soucis.join(' ; '));
    else passe('R21 exercices par nom');
  }
}

// ------------------------------------------------------------
// R20 — Silhouette double et jour de repos.
// Raci le 10/08 : « fais un bonhomme plus complet, on voit a peine le
// dos, inclus les trapezes » et « pour le jour de repos trouve autre
// chose au lieu du gris ». Le dos se reduisait a deux echardes sur
// une vue de face ; le gris du repos se confondait avec un jour vide.
// ------------------------------------------------------------
{
  const stats = lire('app-v2/src/components/Stats.jsx');
  const entr = lire('app-v2/src/store/entrainement.js');
  const css = lire('app-v2/src/styles/entrainer-carte.css');
  if (stats && entr && css) {
    const soucis = [];
    if (!/bodymap--double/.test(stats)) soucis.push('la silhouette est revenue a une seule vue');
    // Raci le 12/08 : « les formes sont tres geometriques
    // (rectangles), on pourrait le rendre plus anatomique ». Les
    // muscles sont traces au path, pas au rectangle.
    const bloc = (stats.match(/export function BodyMap[\s\S]*?\n\}\n/) || [''])[0];
    const rects = (bloc.match(/<rect class="bp" style/g) || []).length;
    if (rects) soucis.push(`${rects} muscle(s) redessine(s) au rectangle — la silhouette redevient geometrique`);
    // La geometrie a quitte Stats.jsx : les trapezes se verifient
    // maintenant dans les chemins generes, pas dans un appel col().
    const sil = lire('app-v2/src/data/silhouette.js') || '';
    if (!/g: 'trapezes'/.test(sil)) soucis.push('les trapezes ne sont plus dessines');
    if (!/k: 'trapezes'/.test(entr)) soucis.push('le groupe trapezes a disparu de GROUPES');
    // Le repos se lit par une COCHE VERTE, pas par un aplat pale.
    // Raci le 10/08 sur trois nuances proposees : « c'est de la
    // daube, c'est tous les memes ». Un signe, pas une teinte.
    if (!/wlog-coche/.test(stats === null ? '' : lire('app-v2/src/components/Entrainer.jsx') || '')) {
      soucis.push('la coche du jour de repos a disparu');
    }
    if (!/wlog-cell\.repos \{[^}]*#E8F3ED/.test(css)) soucis.push('le fond vert clair du repos a disparu');
    // #26654B sur #E8F3ED : 6.07:1, mesure. Un vert plus clair
    // repasserait sous le minimum lisible.
    if (/wlog-coche[^}]*color: #2F7D5C/.test(css)) soucis.push('le vert de la coche est repasse a 4.39:1');
    if (soucis.length) faute('R20 silhouette et repos', soucis.join(' ; '));
    else passe('R20 silhouette et repos');
  }
}

// ------------------------------------------------------------
// R19 — Fin de seance : les deux branches convergent.
// Organigramme de Raci du 10/08. Deux liaisons etaient coupees :
//  1. Une seance enregistree ne colorait pas le calendrier. Seul
//     muscleLog l'alimente, et rien n'y ecrivait a la fin.
//  2. La branche « programme » n'avait AUCUNE fin de seance :
//     SeanceDetail ne contenait ni bouton Terminer ni enregistrement.
//     On terminait sa seance du jour et il n'en restait rien.
// Ces deux pannes sont silencieuses : aucune erreur, juste un
// calendrier qui reste blanc.
// ------------------------------------------------------------
{
  const seances = lire('app-v2/src/store/seances.js');
  const detail = lire('app-v2/src/components/SeanceDetail.jsx');
  if (seances && detail) {
    const soucis = [];
    // 22/08 : la liaison ne passe plus par une RECOPIE dans muscleLog
    // (voir R46) mais par une lecture directe de la liste des seances.
    // Ce qui doit tenir : la seance porte son jour et ses muscles.
    if (!/iso: s\.iso \|\|/.test(seances) || !/muscles: s\.muscles \|\| \[\]/.test(seances)) {
      soucis.push('la seance enregistree ne porte plus son jour ou ses muscles — le calendrier ne peut plus les deduire');
    }
    if (!/enregistrerSeance\(/.test(detail)) {
      soucis.push('la seance de programme ne s\'enregistre pas — branche sans fin');
    }
    if (soucis.length) faute('R19 fin de seance', soucis.join(' ; '));
    else passe('R19 fin de seance');
  }
}

// ------------------------------------------------------------
// R18 — Le quota gratuit mord a la planification.
// Raci le 10/08 : « un utilisateur gratuit peut programmer maximum 4
// seances a la fois ; s'il clique sur la 5e, un message s'affiche ».
// Le verrou doit apparaitre A L'APPUI, pas en permanence : une limite
// affichee d'avance est un reproche. Et l'ecran doit exister — sans
// lui, adopterProgramme() n'est appelable que par le code.
// ------------------------------------------------------------
{
  const pl = lire('app-v2/src/components/PlanifierProgramme.jsx');
  const prg = lire('app-v2/src/components/Programmes.jsx');
  const main = lire('app-v2/src/main.jsx');
  if (pl && prg && main) {
    const soucis = [];
    if (!/quotaAtteint\(choisis\.length, premium\)/.test(pl)) soucis.push('le quota n\'est plus consulte au moment du choix');
    // Raci le 10/08 : « je veux moi pouvoir dire quel jour, quel
    // muscle, dans quel ordre ». L'affectation doit rester EXPLICITE
    // — { jourSemaine: indexSeance } — et non redevenir une liste ou
    // la position impose la seance.
    if (!/const \[aff, setAff\]/.test(pl)) soucis.push('l\'ordre des seances est redevenu impose par la position');
    if (!/adopterProgramme\(progId, aff\)/.test(pl)) soucis.push('l\'affectation choisie n\'est plus celle qu\'on enregistre');
    const store = lire('app-v2/src/store/programme.js');
    if (store && !/export function normaliserJours/.test(store)) {
      soucis.push('la reprise des anciens programmes (jours en tableau) a disparu');
    }
    if (!/setBloque\(true\); return;/.test(pl)) soucis.push('le 5e jour n\'affiche pas de message');
    if (!/adopterProgramme\(progId, /.test(pl)) soucis.push('la validation n\'adopte plus le programme');
    if (!/vue\.nom === 'planifier'/.test(main)) soucis.push("la vue 'planifier' n'est pas branchee");
    if (!/allerVers\('planifier'/.test(prg)) soucis.push('aucune entree vers la planification depuis la fiche programme');
    // Cul-de-sac trouve le 10/08 en eprouvant le verrou : sur un
    // programme 6 jours, un compte gratuit ne cochait que 4 jours et
    // le bouton d'enregistrement, qui exigeait le compte complet, ne
    // s'allumait jamais. Le plafond doit tenir compte du quota.
    // `pl` est deja lu plus haut dans ce bloc : le redeclarer creait
    // une zone morte temporelle et faisait planter l'audit entier.
    // On enregistre des qu'UN jour est coche. Exiger le compte complet
    // bloquait deux fois : un compte gratuit sur un programme 6 jours
    // (10/08), puis Raci lui-meme, en Premium sur un 5 jours, qui ne
    // voulait s'entrainer que quatre jours cette semaine-la.
    if (pl && !/const complet = choisis\.length >= 1/.test(pl)) {
      soucis.push('l\'enregistrement exige a nouveau un nombre de jours impose');
    }
    if (soucis.length) faute('R18 quota de planification', soucis.join(' ; '));
    else passe('R18 quota de planification');
  }
}

// ------------------------------------------------------------
// R17 — Demarrer une seance : un appui, pas deux.
// L'ecran de choix « Demarrer une seance » a ete supprime le 26/08.
// Il n'avait qu'une option quand aucun programme n'etait actif, et
// avec un programme il reposait un choix deja pose sur la carte : la
// seance du jour en haut, la seance libre juste en dessous. Ce qui
// reste a proteger : le calendrier ne doit pas affirmer qu'une seance
// a eu lieu quand elle est seulement prevue — le planifie se lit en
// creux, le fait en plein.
// ------------------------------------------------------------
{
  const entr = lire('app-v2/src/components/Entrainer.jsx');
  const store = lire('app-v2/src/store/programme.js');
  const main = lire('app-v2/src/main.jsx');
  if (entr && store && main) {
    const soucis = [];
    // Le bouton doit ouvrir directement sa destination.
    if (/allerVers\('demarrer'\)/.test(entr)) soucis.push('l\'ecran de choix intermediaire est revenu');
    if (/vue\.nom === 'demarrer'/.test(main)) soucis.push("la vue 'demarrer' est rebranchee dans le routeur");
    if (!/allerVers\('seanceDetail',\s*\n?\s*\{ seanceId: duJour\.seanceId/.test(entr)) {
      soucis.push('le bouton du jour n\'ouvre plus la seance elle-meme');
    }
    // Le reel prime sur le prevu : on ne planifie que sur un jour vide.
    if (!/if \(!muscles\.length && !repos\)/.test(entr)) {
      soucis.push('une seance prevue peut recouvrir une seance reellement notee');
    }
    // Quota gratuit : 4 seances hebdomadaires, au-dela Premium.
    if (!/SEANCES_LIBRES = 4/.test(store)) soucis.push('le quota gratuit de 4 seances a change sans decision');
    if (soucis.length) faute('R17 demarrer une seance', soucis.join(' ; '));
    else passe('R17 demarrer une seance');
  }
}

// ------------------------------------------------------------
// R16 — La page S'entrainer garde ses deux destinations.
// Refonte du 10/08 : les cartes « Seance libre » et « Creer mon
// programme » sont retirees. Elles etaient les SEULS chemins vers
// `selection` (choix d'exercices) et `questionnaire` (programme sur
// mesure). Retirer une carte sans reprendre sa destination rendrait
// une fonctionnalite entiere inatteignable sans qu'aucune erreur ne
// se produise — le pire genre de panne, silencieuse.
// ------------------------------------------------------------
{
  // La verification porte sur l'ONGLET, pas sur un seul fichier : le
  // 10/08, `selection` est passee derriere l'ecran de choix, elle
  // n'apparaissait donc plus dans Entrainer.jsx. La regle a sonne — a
  // juste titre, la forme avait change — mais la destination restait
  // atteignable. On lit donc les deux fichiers du parcours.
  const jsx = [lire('app-v2/src/components/Entrainer.jsx'),
               lire('app-v2/src/components/DemarrerSeance.jsx')].filter(Boolean).join('\n');
  if (jsx) {
    const soucis = [];
    for (const dest of ['selection', 'questionnaire']) {
      if (!new RegExp(`'${dest}'`).test(jsx)) {
        soucis.push(`la destination '${dest}' n'est plus atteignable depuis S'entrainer`);
      }
    }
    // Le calendrier ne doit pas retrouver d'etat replie : il EST la
    // page maintenant, le masquer derriere un bouton n'a plus de sens.
    if (/wlog-list' \+ \(ouvert/.test(jsx)) soucis.push('le journal est redevenu repliable');
    if (soucis.length) faute('R16 page S\'entrainer', soucis.join(' ; '));
    else passe('R16 page S\'entrainer');
  }
}

// ------------------------------------------------------------
// R13 — Tout composant employe dans du JSX doit exister.
// Trouve le 10/08 : le commit b9b6a68 du 27/07, qui refaisait l'ecran
// de resultat du questionnaire, a supprime la fonction Reglette en
// laissant la balise <Reglette> a sa place. L'etape 3 levait alors
// « Reglette is not defined », le rendu plantait, l'ecran restait
// fige sur l'etape 2 et l'appui sur Continuer semblait sans effet.
// Le questionnaire « Creer mon programme » etait bloque depuis deux
// semaines. `node tools/verif-js.js` ne l'a pas vu : il verifie la
// syntaxe, pas les references.
// ------------------------------------------------------------
{
  const { readdirSync } = await import('node:fs');
  const dossiers = ['app-v2/src/components', 'app-v2/src/pages'];
  const manquants = [];
  for (const dossier of dossiers) {
    let fichiers = [];
    try { fichiers = readdirSync(resolve(RACINE, dossier)).filter(f => f.endsWith('.jsx')); }
    catch (e) { continue; }
    for (const f of fichiers) {
      const src = lire(`${dossier}/${f}`);
      if (!src) continue;
      const propre = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
      // Balises commencant par une majuscule = composants.
      const employes = new Set();
      for (const m of propre.matchAll(/<([A-Z][A-Za-z0-9_]*)[\s/>]/g)) employes.add(m[1]);
      for (const nom of employes) {
        const defini = new RegExp(
          `(function|const|class)\\s+${nom}\\b|\\b${nom}\\b[^\\n]*from\\s+['"]|\\{[^}]*\\b${nom}\\b[^}]*\\}\\s*from`
        ).test(propre);
        if (!defini) manquants.push(`${f} : <${nom}> employe mais ni defini ni importe`);
      }
    }
  }
  if (manquants.length) faute('R13 composant fantome', manquants.join(' ; '));
  else passe('R13 composant fantome');
}

// ------------------------------------------------------------
// R12 — Retour de la barre de navigation.
// Raci le 10/08 : « qu'elle reapparaisse rapidement quand j'arrete de
// defiler, surtout quand je suis en bas ». L'attente etait de 700ms
// plus 340ms d'animation. Deux exigences tenues ici : le delai reste
// court, et arrive en bas la barre ne se cache pas du tout —
// l'escamotage sert a degager du contenu sous la barre, or en bas il
// n'y a plus rien a degager.
// ------------------------------------------------------------
{
  const jsx = lire('app-v2/src/components/BottomNav.jsx');
  const css = lire('app-v2/src/styles/journal-socle.css');
  if (jsx && css) {
    const soucis = [];
    const d = jsx.match(/setCachee\(false\),\s*(\d+)\)/);
    if (!d) soucis.push('delai de retour introuvable');
    else if (+d[1] > 300) soucis.push(`delai de retour de ${d[1]}ms — au-dela de 300ms l'attente se remarque`);
    if (!/restant <= 4/.test(jsx)) soucis.push('la barre se cache encore en bas de page');
    const tr = css.match(/\.bn \{ transition: transform \.(\d+)s/);
    if (!tr) soucis.push('transition de retour introuvable');
    else if (+tr[1] > 30) soucis.push(`animation de retour de .${tr[1]}s — elle s'ajoute au delai`);
    if (soucis.length) faute('R12 retour de la barre', soucis.join(' ; '));
    else passe('R12 retour de la barre');
  }
}

// ------------------------------------------------------------
// R10 — Une ligne de resultat ne lit jamais des valeurs absentes.
// Trouve le 10/08 en instrumentant la console : un favori dont
// l'aliment n'existe plus dans la base — produit renomme, aliment
// scanne puis supprime — passait dans la liste avec saisie, et la
// page plantait sur `.kcal` d'un objet absent. Ecran blanc, pas un
// defaut visuel. La branche sans saisie filtrait deja, l'autre non.
// ------------------------------------------------------------
{
  const jsx = lire('app-v2/src/components/MealCard.jsx');
  if (jsx) {
    const soucis = [];
    // Aucune lecture directe sur le resultat du OU : il peut etre
    // undefined et le point d'acces plante la page entiere.
    if (/\(DB\[nom\]\s*\|\|\s*customFoods\.value\[nom\]\)\s*\./.test(jsx)) {
      soucis.push('lecture directe sur (DB[nom] || customFoods[nom]) — plante si l\'aliment n\'existe plus');
    }
    // Et la liste doit etre filtree sur les DEUX branches.
    if (!/aDesValeurs/.test(jsx)) soucis.push('la liste de resultats n\'ecarte pas les aliments sans valeurs');
    if (soucis.length) faute('R10 resultat sans valeurs', soucis.join(' ; '));
    else passe('R10 resultat sans valeurs');
  }
}

// ------------------------------------------------------------
// R8 — Contraste minimal des libelles de stats.scoped.css.
// Trouve le 10/08 : les petits libelles (« Record x 8 », « Moyenne
// sur 6 jours ») etaient en #8A8279 a 10.5px, soit 3.57:1 sur le
// creme #FAF8F4 — sous le minimum lisible de 4.5:1.
// ------------------------------------------------------------
{
  const css = lire(CSS_STATS);
  if (css) {
    const lum = (h) => {
      const c = [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const contraste = (a, b) => {
      const [l1, l2] = [lum(a), lum(b)];
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    // La regle ne juge QUE les gris de libelle sur fond clair.
    // Un accent (orange, or, rouge, violet) est un choix delibere et
    // se pose souvent sur une pastille noire : le mesurer contre le
    // creme n'aurait aucun sens. Un gris a les trois canaux proches.
    const gris = (h) => {
      const v = [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
      return Math.max(...v) - Math.min(...v) <= 30;
    };
    const FONDS = ['#FFFFFF', '#FAF8F4'];   // la carte blanche, la boite creme
    const propre = sansCommentaires(css);
    const faibles = [];
    // On lit bloc par bloc : un bloc qui pose son propre fond gere
    // son contraste tout seul (bouton desactive, pastille sombre).
    for (const b of propre.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const corps = b[2];
      if (/background/.test(corps)) continue;
      const m = corps.match(/(?:^|;)\s*(?:color|fill)\s*:\s*(#[0-9a-fA-F]{6})/i);
      if (!m) continue;
      const c = m[1].toUpperCase();
      if (lum(c) < 0.12 || !gris(c)) continue;
      const pire = Math.min(...FONDS.map((f) => contraste(c, f)));
      if (pire < 4.5) {
        const ligne = propre.slice(0, b.index).split('\n').length;
        faibles.push(`${c} ligne ${ligne} — ${pire.toFixed(2)}:1 (${b[1].trim().split('\n').pop().trim()})`);
      }
    }
    if (faibles.length) faute('R8 contraste des libelles', faibles.join(' ; '));
    else passe('R8 contraste des libelles');
  }
}

// ------------------------------------------------------------
// R7 — Regles CSS mortes dans stats.scoped.css.
// Trouve le 9/08 : `.chart-bar.weight` porte un degrade vert en
// !important alors qu'aucune classe `weight` n'est plus posee par
// Stats.jsx — la courbe a remplace les barres. Signale seulement :
// un retrait attend la validation de Raci.
// ------------------------------------------------------------
{
  const css = lire(CSS_STATS);
  const jsx = lire('app-v2/src/components/Stats.jsx');
  if (css && jsx) {
    // On compare aux classes REELLEMENT posees dans un attribut class,
    // pas au mot present quelque part dans le fichier : `weight` existe
    // dans `e.weight` (lecture de pesee) et masquait le code mort.
    const posees = new Set();
    for (const m of jsx.matchAll(/class=(?:"([^"]*)"|\{'([^']*)'|\{`([^`]*)`)/g)) {
      (m[1] || m[2] || m[3] || '').split(/[\s+'`]+/).forEach((c) => c && posees.add(c));
    }
    for (const m of jsx.matchAll(/'\s*([a-z0-9-]+)\s*'/g)) posees.add(m[1]);
    const suspectes = ['chart-bar.weight'];
    const mortes = suspectes.filter((c) => css.includes(c) && !posees.has(c.split('.').pop()));
    if (mortes.length) signale('R7 regles CSS mortes', `${mortes.join(', ')} — style defini, classe jamais posee par Stats.jsx`);
    else passe('R7 regles CSS mortes');
  }
}

// ------------------------------------------------------------
// R26 — La silhouette reste un decalque, pas un dessin a la main.
// Trouve le 15/08 : six versions tracees au juge ont toutes rendu des
// formes geometriques (« Lego », « effet os »). La silhouette est
// desormais vectorisee depuis la planche de Raci par tools/tracer.py.
// Trois pieges a tenir :
//   - reecrire de la geometrie dans Stats.jsx annulerait le decalque ;
//   - le fichier genere peut exploser (440 Ko au premier jet, avant
//     decimation des points) et alourdir le bundle ;
//   - un clipPath ou tout autre id casserait les DEUX silhouettes
//     affichees en meme temps sur S'entrainer (carte + modale).
// ------------------------------------------------------------
{
  const stats = lire('app-v2/src/components/Stats.jsx');
  const sil = lire('app-v2/src/data/silhouette.js');
  if (stats && sil) {
    const soucis = [];
    const bloc = (stats.match(/export function BodyMap[\s\S]*?\n\}\n/) || [''])[0];
    const traces = (bloc.match(/d="M[\d\s.-]/g) || []).length;
    if (traces) soucis.push(`${traces} trace(s) ecrit(s) a la main dans BodyMap — la geometrie doit venir de data/silhouette.js`);
    if (!lire('tools/tracer.py')) soucis.push('tools/tracer.py absent : la silhouette ne serait plus regenerable');
    const ko = Math.round(sil.length / 1024);
    if (ko > 120) soucis.push(`data/silhouette.js pese ${ko} Ko — decimer les points dans tracer.py`);
    if (/clipPath|url\(#/.test(bloc)) soucis.push('un clipPath est revenu : les deux silhouettes de S\'entrainer partageraient le meme id');
    const face = (sil.match(/g: '/g) || []).length;
    if (face < 40) soucis.push(`${face} chemins seulement — le decalque a perdu des pieces`);
    if (soucis.length) faute('R26 silhouette decalquee', soucis.join(' ; '));
    else passe('R26 silhouette decalquee');
  }
}

// ------------------------------------------------------------
// R27 — Les vues adressables par ?vue= restent ouvrables a vide.
// Ajoute le 15/08 avec le parametre. Le piege : y inscrire une vue qui
// attend des parametres (planifier veut un `prog`, seanceDetail un
// `seanceId`). Ouverte par l'adresse, elle n'en aurait aucun et
// s'afficherait a blanc — un ecran vide, sans erreur, donc invisible
// en test. La liste doit donc rester fermee et sans ces deux vues.
// ------------------------------------------------------------
{
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  if (ent) {
    const soucis = [];
    const m = ent.match(/const VUES_ADRESSABLES = \[([^\]]*)\]/);
    if (!m) soucis.push('VUES_ADRESSABLES introuvable — le parametre ?vue= a disparu');
    else {
      for (const risque of ['planifier', 'seanceDetail']) {
        if (m[1].includes(risque)) soucis.push(`${risque} est adressable alors qu'elle exige des parametres — elle s'ouvrirait a blanc`);
      }
      // Le routeur des vues est dans main.jsx : c'est lui qui dit
      // quelles vues existent vraiment, pas les appels a allerVers.
      const routeur = lire('app-v2/src/main.jsx') || '';
      for (const v of m[1].match(/'([a-zA-Z]+)'/g) || []) {
        const nom = v.slice(1, -1);
        if (!routeur.includes(`vue.nom === '${nom}'`)) soucis.push(`la vue ${nom} est adressable mais le routeur ne la connait pas`);
      }
    }
    if (soucis.length) faute('R27 vues adressables', soucis.join(' ; '));
    else passe('R27 vues adressables');
  }
}

// ------------------------------------------------------------
// R28 — Le compte des choix reste lisible dans la liste.
// Histoire : le 15/08 le chrono flottant recouvrait la derniere carte
// et la barre « Ma seance ». On l'a reduit, decale, puis remonte dans
// la barre de titre. Le 26/08 Raci a tranche autrement — le chrono
// quitte cet ecran, il n'y a rien a chronometrer pendant qu'on choisit
// ses exercices. Ce qui reste a proteger ici : le compte des choix ne
// doit pas retourner vivre dans la seule barre du bas, masquee a zero.
// ------------------------------------------------------------
{
  const css = lire('app-v2/src/legacy/selection-exercices.scoped.css');
  const jsx = lire('app-v2/src/components/SelectionExercices.jsx');
  if (css && jsx) {
    const soucis = [];
    if (!/hint-compte/.test(jsx)) soucis.push('le compte des choix a quitte la liste — a zero il ne serait plus affiche nulle part');
    // Si le chrono revenait un jour sur cet ecran, il faudrait de
    // nouveau lui trouver une place : en bas il fuyait les boutons
    // « + » a droite puis les vignettes a gauche, et dans une liste
    // qui defile aucune position basse n'est libre.
    if (/body:has\(\.pg-selection\) \.v2-chrono-fab/.test(css))
      soucis.push('le chrono est revenu sur la selection sans que sa place soit retranchee');
    // Sans key, le compte se met a jour mais sans rien qui bouge.
    if (!/key=\{nbSelectionnes\}/.test(jsx))
      soucis.push('le compte n\'est plus remonte a chaque changement : sa mise a jour redevient invisible');
    if (soucis.length) faute('R28 compte des choix', soucis.join(' ; '));
    else passe('R28 compte des choix');
  }
}

// ------------------------------------------------------------
// R29 — Le Journal montre le prochain repas a remplir.
// Demande de Raci le 16/08. Deux pieges :
//   - marquer « le suivant du dernier rempli » au lieu du PREMIER vide.
//     Sauter le dejeuner et remplir le diner laisserait alors le
//     dejeuner sans marque, alors que c'est justement l'oubli a
//     rattraper ;
//   - habiller la marque en jaune ou en orange. Dans le Journal
//     l'accent est le noir ; l'orange appartient a la page d'un repas
//     ouvert (.couche-repas). Une carte criarde sur six ferait lire la
//     couleur avant le contenu.
// ------------------------------------------------------------
{
  const main = lire('app-v2/src/main.jsx');
  const carte = lire('app-v2/src/components/MealCard.jsx');
  const css = lire('app-v2/src/styles/journal-socle.css');
  if (main && carte && css) {
    const soucis = [];
    if (!/find\(r => r\.ings\.length === 0\)/.test(main))
      soucis.push('le repas a suivre n\'est plus le premier vide — un repas saute ne serait plus rappele');
    if (!/aSuivre/.test(carte)) soucis.push('MealCard ne recoit plus aSuivre : plus aucune carte n\'est mise en avant');
    // La coche des repas encodes doit rester sur la vignette : le bord
    // gauche appartient au trait du repas a suivre. Les faire cohabiter
    // sur la meme zone rendrait les deux etats illisibles.
    if (!/mc--fait/.test(carte)) soucis.push('les repas encodes ne portent plus de coche');
    else if (!/\.mc--fait \.mc-vignette::after/.test(css))
      soucis.push('la coche a quitte la vignette — elle entrerait en concurrence avec le trait du repas a suivre');
    const bloc = (css.match(/\.pg-journal \.mc--suivant::before \{[^}]*\}/) || [''])[0];
    if (!bloc) soucis.push('le style du repas a suivre a disparu');
    // Douze pistes ont ete essayees avant celle-ci. Refusees : le cadre
    // noir (la page en compte deja trop), le fond jaune pale, et
    // l'estompage des autres cartes. Retenue : un trait vertical sur le
    // bord gauche, qui ne touche ni au fond ni au texte ni a la taille.
    else if (!/left:\s*0/.test(bloc) || !/width:\s*4px/.test(bloc))
      soucis.push('le trait du bord gauche a disparu : plus rien ne designe le repas a suivre');
    else if (/background:\s*(#1[0-9A-Fa-f]{5}|#000|#F7B500|#FAC408|#F86A0C)/i.test(bloc))
      soucis.push('le trait a change de couleur — le vert est celui de la jauge de calories, deja present dans la page');
    if (soucis.length) faute('R29 repas a suivre', soucis.join(' ; '));
    else passe('R29 repas a suivre');
  }
}

// ------------------------------------------------------------
// R30 — Le detail nutritionnel reste APRES les boutons de fin.
// Deplace le 16/08 a la demande de Raci : place entre la liste des
// aliments et « Terminer », il fallait le franchir pour atteindre le
// bouton qu'on etait venu chercher. Fibres, sucres, satures et sel se
// consultent apres coup, pas pendant l'encodage.
// Le piege : une passe de reorganisation le fait remonter « pour le
// mettre en valeur », et il redevient un obstacle sur le chemin de
// sortie du repas.
// ------------------------------------------------------------
{
  const mp = lire('app-v2/src/components/MealPage.jsx');
  if (mp) {
    const iDetail = mp.indexOf('<DetailNutritionnel');
    const iFin = mp.indexOf('rp-btn-fin');
    if (iDetail < 0) faute('R30 detail nutritionnel en fin de page', 'le detail nutritionnel a disparu de la page repas');
    else if (iDetail < iFin) faute('R30 detail nutritionnel en fin de page', 'il est remonte avant « Terminer » : il barre a nouveau le chemin de sortie');
    else passe('R30 detail nutritionnel en fin de page');
  }
}

// ------------------------------------------------------------
// R31 — Les complements alimentaires restent coherents.
// Ajoutes le 16/08 a la demande de Raci. Deux pieges propres a cette
// famille :
//   - les micronutriments (vitamines, mineraux, creatine) s'etiquettent
//     a 0 kcal. Leur donner des macros par reflexe fausserait le total
//     de la journee pour un comprime ;
//   - les poudres protéinées se vendent a la mesurette. Sans entree
//     « dose », il faut peser 5 g de creatine sur une balance de
//     cuisine, ce que personne ne fait.
// ------------------------------------------------------------
{
  const al = lire('app-v2/src/data/aliments.js');
  if (al) {
    const soucis = [];
    const bloc = al.slice(al.indexOf('COMPLEMENTS ALIMENTAIRES'));
    if (!bloc || bloc.length < 200) soucis.push('la section des complements a disparu');
    else {
      for (const attendu of ['Collagène (peptides)', 'Créatine monohydrate', 'Multivitamines (comprimé)']) {
        if (!bloc.includes(attendu)) soucis.push(`${attendu} absent de la section`);
      }
      // Un comprime de vitamines qui pese dans le total = signe que
      // quelqu'un a rempli les macros au jugé.
      const zeros = bloc.match(/'(Multivitamines|Vitamine D|Magnésium|Zinc|Fer|Probiotiques|Créatine monohydrate)[^']*':\{kcal:(\d+)/g) || [];
      for (const z of zeros) {
        if (!/kcal:0/.test(z)) soucis.push(`${z.split("'")[1]} apporte des calories — les micronutriments s'etiquettent a 0`);
      }
      if (!/unitLabel:'dose'/.test(bloc)) soucis.push('plus aucune entree a la dose : il faudrait peser la creatine au gramme');
    }
    if (soucis.length) faute('R31 complements alimentaires', soucis.join(' ; '));
    else passe('R31 complements alimentaires');
  }
}

// ------------------------------------------------------------
// R32 — La fiche d'un jour ne lit jamais un agregat hebdomadaire.
// Raci, 16/08. Elle a agrege la semaine entiere pendant un temps : on
// ouvrait mardi et la silhouette se colorait de lundi, ce qui rend un
// jour vide indiscernable d'un jour charge. La lecture hebdomadaire
// existe ailleurs — la carte « Ta semaine » de la page S'entrainer.
// Le piege : refaire une boucle sur les jours depuis lundi « pour
// donner du contexte ».
// ------------------------------------------------------------
{
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  if (ent) {
    const soucis = [];
    const i = ent.indexOf('function ModaleMuscles');
    const fiche = i >= 0 ? ent.slice(i, ent.indexOf('\nfunction ', i + 10)) : '';
    if (!fiche) soucis.push('ModaleMuscles introuvable');
    else {
      if (/joursSemaine|lundi\.setDate|tr_week_since/.test(fiche))
        soucis.push('la fiche du jour agrege a nouveau la semaine — un jour vide y devient indiscernable d\'un jour charge');
      // R33 : les muscles des exercices comptent, pas seulement les
      // pastilles cochees. Sans cela, une seance pecs enregistree sans
      // pastille laisse le corps gris.
      if (!/compteDuJour\(iso\)/.test(fiche))
        soucis.push('les muscles des seances enregistrees ne sont plus deduits : une seance non pointee laisse la silhouette grise');
      // R34 : toute fiche ouverte s'empile, sinon le retour Android
      // change l'onglet SOUS elle.
      if (!/useRetour\(!!iso/.test(fiche))
        soucis.push('la fiche ne s\'empile plus dans la pile de retours : le bouton Android changerait l\'onglet sous elle');
    }
    if (soucis.length) faute('R32 fiche du jour', soucis.join(' ; '));
    else passe('R32 fiche du jour');
  }
}

// ------------------------------------------------------------
// R33 — Le balayage de page ne prend pas la main dans une rangee qui
// defile deja horizontalement.
// Raci, 16/08 : « sa swipe toujours ». Les filtres de « Choisir mes
// exercices » changeaient d'onglet quand on faisait glisser les
// pastilles. La cause n'etait pas un oubli isole mais le mecanisme :
// une liste de selecteurs dans main.jsx qu'il faut penser a alimenter
// a chaque ecran. Deux garde-fous generiques l'ont remplacee — le
// marqueur data-sans-swipe, et la detection d'un ancetre a defilement
// horizontal. Le piege serait de les retirer en croyant la liste
// suffisante.
// ------------------------------------------------------------
{
  const main = lire('app-v2/src/main.jsx');
  const sel = lire('app-v2/src/components/SelectionExercices.jsx');
  const css = lire('app-v2/src/legacy/selection-exercices.scoped.css');
  if (main && sel && css) {
    const soucis = [];
    if (!/data-sans-swipe/.test(main))
      soucis.push('main.jsx ne reconnait plus data-sans-swipe : chaque ecran devrait a nouveau etre inscrit a la main');
    if (!/defileHorizontal/.test(main))
      soucis.push('la detection des rangees a defilement horizontal a disparu : les cas non prevus reviendront');
    // La rangee des muscles est devenue une grille : elle n'a plus de
    // defilement a proteger, mais materiel et niveau si.
    if ((sel.match(/data-sans-swipe/g) || []).length < 2)
      soucis.push('les rangees materiel et niveau ne sont plus exclues du balayage');
    // Neuf muscles dans une bande horizontale : on en voyait quatre et
    // rien ne disait que les autres existaient.
    if (!/muscle-grille/.test(sel))
      soucis.push('les muscles sont revenus en bande defilante : cinq groupes sur neuf redeviennent invisibles');
    if (!/\(EXERCISES\[m\.key\] \|\| \[\]\)\.length > 0/.test(sel))
      soucis.push('les groupes sans exercice sont affiches : une case qui ouvre une liste vide est une promesse non tenue');
    if (!/touch-action:\s*pan-y/.test(css))
      soucis.push('pan-y retire des rangees : sur iOS le geste part parfois avant touchstart');
    if (soucis.length) faute('R33 balayage et rangees defilantes', soucis.join(' ; '));
    else passe('R33 balayage et rangees defilantes');
  }
}

// ------------------------------------------------------------
// R34 — Aucun aliment defini deux fois.
// Trouve le 17/08 en verifiant un repas de Raci : le detail
// nutritionnel donnait 1,2 g de graisses saturees pour un repas qui en
// contient 2,6. L'huile de lin avait ses valeurs CIQUAL depuis
// toujours, mais une seconde definition ajoutee la veille — sans
// detail — l'ecrasait. En JS la derniere gagne, en silence.
//
// Object.keys ne peut pas voir ces doublons : l'objet les a deja
// fusionnes. Il faut lire le SOURCE.
// ------------------------------------------------------------
{
  const src = lire('app-v2/src/data/aliments.js');
  if (src) {
    const compte = new Map();
    for (const m of src.matchAll(/^ {4}'([^']+)':\{/gm)) {
      compte.set(m[1], (compte.get(m[1]) || 0) + 1);
    }
    const doubles = [...compte].filter(([, n]) => n > 1);
    // Les 36 doublons anterieurs au 17/08 sont connus et attendent
    // l'arbitrage de Raci (certains ecarts sont enormes : la sauce
    // samourai existe a 120 et a 540 kcal). Le seuil bloque toute
    // NOUVELLE apparition sans exiger de les traiter d'un coup.
    if (doubles.length > 36) {
      faute('R34 aliments en double',
        `${doubles.length} aliments definis plusieurs fois (36 connus) — le dernier ecrase le premier en silence : ` +
        doubles.slice(0, 6).map(([k, n]) => `${k}×${n}`).join(', '));
    } else if (doubles.length) {
      signale('R34 aliments en double', `${doubles.length} doublons connus, en attente d'arbitrage — aucun nouveau`);
    } else {
      passe('R34 aliments en double');
    }
  }
}

// ------------------------------------------------------------
// R35 — Le detail nutritionnel ne contient que des valeurs relevees.
// Raci, 17/08 : « je pense pas que c'est juste ». Le calcul l'etait —
// c'etaient les SOURCES qui ne l'etaient pas. La veille, pour combler
// les cases vides des poudres protéinées, j'avais estime leurs fibres,
// sucres, satures et sel. Or une whey passe de 0,2 a 1,2 g de sel
// selon la marque et le procede : le total prenait alors l'air complet
// tout en etant faux, ce qui est pire qu'un total partiel annonce
// comme tel — l'app sait dire « calcule sur les aliments qui portent
// l'information ».
//
// Les huiles gardent leur detail : le profil en acides gras est une
// propriete du corps gras, pas de la marque.
//
// Regle : dans la section des complements, aucune poudre protéinée ne
// porte de champ de detail.
// ------------------------------------------------------------
{
  const src = lire('app-v2/src/data/aliments.js');
  if (src) {
    const i = src.indexOf('COMPLEMENTS ALIMENTAIRES');
    const bloc = i >= 0 ? src.slice(i) : '';
    const fautifs = [];
    for (const m of bloc.matchAll(/^ {4}'([^']+)':\{([^}]*)\},/gm)) {
      const [, nom, val] = m;
      if (/huile|oméga|krill|mct/i.test(nom)) continue;   // profil lipidique : releve
      if (/nutrimuscle/i.test(nom)) continue;             // detail lu sur l'etiquette officielle de la marque
      if (/créatine|multivitamines|vitamine|magnésium|zinc|fer |probiotiques|caféine|électrolytes/i.test(nom)) continue; // zeros vrais
      if (/fibres:|sucres:|satures:|sel:/.test(val)) fautifs.push(nom);
    }
    if (fautifs.length) {
      faute('R35 detail nutritionnel estime',
        `${fautifs.length} complement(s) portent un detail qui n'a pas ete releve : ` + fautifs.slice(0, 5).join(', '));
    } else {
      passe('R35 detail nutritionnel estime');
    }
  }
}

// ------------------------------------------------------------
// R36 — La seance libre vide donne une issue.
// Audit du parcours demande par Raci le 17/08. Quatre des cinq points
// etaient deja en place ; celui-ci ne l'etait pas. L'ecran affichait
// « Aucun exercice selectionne. » et rien d'autre : la seule sortie
// etait la fleche retour en haut a gauche, qui se lit comme un abandon
// plutot que comme la suite du parcours.
// ------------------------------------------------------------
{
  const ms = lire('app-v2/src/components/MaSeance.jsx');
  if (ms) {
    const i = ms.indexOf('empty-session');
    const bloc = i >= 0 ? ms.slice(i - 400, i + 700) : '';
    if (!bloc) faute('R36 seance libre vide', 'l\'etat vide a disparu');
    else if (!/empty-session-cta/.test(bloc))
      faute('R36 seance libre vide', 'plus de bouton dans l\'etat vide : on y arrive sans savoir quoi faire');
    else if (!/allerVers\('selection'\)/.test(bloc))
      faute('R36 seance libre vide', 'le bouton de l\'etat vide ne mene plus au choix des exercices');
    else passe('R36 seance libre vide');
  }
}

// ------------------------------------------------------------
// R37 — Un onglet s'ouvre sur sa page d'accueil.
// Raci, 17/08 : « il continue a revenir sur cette page parfois »,
// capture de « Tous les programmes » a l'appui. vueEntrainer est un
// signal de module : il gardait le dernier ecran ouvert. On partait de
// la liste des programmes vers un autre onglet, on revenait par la
// barre du bas, et la liste reapparaissait — sans qu'on l'ait demandee.
// ------------------------------------------------------------
{
  const nav = lire('app-v2/src/components/BottomNav.jsx');
  if (nav) {
    if (!/vueEntrainer\.value = \{ nom: 'accueil'/.test(nav))
      faute('R37 onglet et vue interne', 'quitter S\'entrainer ne remet plus sa vue a l\'accueil : on y revient sur le dernier ecran ouvert');
    else passe('R37 onglet et vue interne');
  }
}

// ------------------------------------------------------------
// R38 — Le programme actif se supprime sans refaire le questionnaire.
// Raci, 17/08 : « je ne trouve pas comment supprimer ». Le bouton
// d'abandon existait dans l'ecran de planification, mais on n'y
// arrivait qu'apres avoir repondu aux quatre questions — autant dire
// qu'il etait cache. La carte « Mon programme » mene desormais droit
// a la planification quand un programme est actif.
// ------------------------------------------------------------
{
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  const pl = lire('app-v2/src/components/PlanifierProgramme.jsx');
  if (ent && pl) {
    const soucis = [];
    if (!/programmeActif\.value\s*\r?\n?\s*\? allerVers\('planifier'/.test(ent.replace(/\s+/g, ' ').replace(/ \? /g, ' ? ')) &&
        !/programmeActif\.value \? allerVers\('planifier'/.test(ent.replace(/\s+/g, ' ')))
      soucis.push('la carte « Mon programme » ne mene plus a la planification : la suppression redevient inaccessible');
    if (!/abandonnerProgramme\(\)/.test(pl))
      soucis.push('le bouton d\'abandon a disparu de la planification');
    if (soucis.length) faute('R38 supprimer son programme', soucis.join(' ; '));
    else passe('R38 supprimer son programme');
  }
}

// ------------------------------------------------------------
// R39 — La silhouette suit le sexe du compte.
// Raci, 17/08 : « si c'est une femme on fait comment ? ». Le sexe
// existait pour Mifflin-St Jeor mais vivait dans l'etat local du
// calculateur : l'app le redemandait a chaque visite et l'oubliait
// aussitot. Il est devenu une donnee de compte, et la silhouette en
// depend.
// Deux pieges :
//   - donner a `sexe` une valeur par defaut dans le store. Vide veut
//     dire « pas encore repondu » ; un defaut 'h' afficherait un corps
//     masculin a une utilisatrice qui n'a rien choisi, sans distinction
//     possible avec un choix reel ;
//   - oublier de remonter le choix du calculateur vers le profil, ce
//     qui laisserait le champ vide a jamais.
// ------------------------------------------------------------
{
  const perso = lire('app-v2/src/store/perso.js');
  const stats = lire('app-v2/src/components/Stats.jsx');
  const bes = lire('app-v2/src/components/Besoins.jsx');
  const sil = lire('app-v2/src/data/silhouette.js');
  if (perso && stats && bes && sil) {
    const soucis = [];
    if (!/export const sexe = signal\(''\)/.test(perso))
      soucis.push('le sexe n\'est plus une donnee de compte, ou porte un defaut : « vide » doit rester distinct d\'un choix');
    if (!/sexe: sexe\.value/.test(perso))
      soucis.push('le sexe n\'est plus synchronise avec le compte : il se perdrait au changement d\'appareil');
    if (!/SILHOUETTE_FACE_F/.test(sil))
      soucis.push('le modele feminin a disparu du fichier genere');
    if (!/femme \? SILHOUETTE_FACE_F/.test(stats))
      soucis.push('la silhouette ne suit plus le sexe : tout le monde revoit le modele masculin');
    if (!/sexe\.value = val/.test(bes))
      soucis.push('le calculateur ne remonte plus le sexe au profil : le champ resterait vide a jamais');
    // Trois endroits proposent le choix ; deux d'entre eux ne
    // l'ecrivaient nulle part avant le 17/08. Le reglage est le seul
    // qu'on aille chercher volontairement.
    const tdee = lire('app-v2/src/components/TdeeCalculator.jsx') || '';
    const reg = lire('app-v2/src/components/Reglages.jsx') || '';
    if (!/sexe\.value = val/.test(tdee))
      soucis.push('le calculateur TDEE propose le sexe sans l\'ecrire : le choix y serait perdu');
    if (!/acc_sexe/.test(reg))
      soucis.push('le reglage de silhouette a disparu du compte : plus moyen d\'en changer apres coup');
    // Sans cette question, une utilisatrice ne voit jamais son modele :
    // rien d'autre ne permet de deviner le sexe, et le reglage du
    // compte suppose qu'on soit alle le chercher.
    // Le choix a quitte BodyMap (Raci, 17/08). Le composant est monte
    // a trois endroits — carte de la semaine, fiche d'un jour, Stats —
    // donc les boutons apparaissaient trois fois, y compris en ouvrant
    // un jour au hasard du calendrier.
    if (/bm-sexe/.test(stats))
      soucis.push('les boutons de silhouette sont revenus dans BodyMap : ils s\'afficheraient sur chaque jour du calendrier');
    // Ils doivent etre au PREMIER niveau des reglages : sous
    // « Parametres du compte », Raci ne les trouvait pas.
    if (!/set_sec_affichage/.test(reg))
      soucis.push('la section AFFICHAGE a disparu des reglages : le choix de silhouette redevient introuvable');
    if (soucis.length) faute('R39 silhouette et sexe', soucis.join(' ; '));
    else passe('R39 silhouette et sexe');
  }
}

// ------------------------------------------------------------
// R40 — La fiche d'un jour a une fleche de retour.
// Raci, 17/08. Elle ne se fermait qu'en touchant a cote : un geste
// qu'il faut deviner, et qui rate souvent puisque la fiche occupe
// presque tout l'ecran. Le bouton Android la fermait deja (R32), mais
// rien ne le disait a l'ecran.
// ------------------------------------------------------------
{
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  const css = lire('app-v2/src/legacy/entrainer.scoped.css');
  if (ent && css) {
    const i = ent.indexOf('function ModaleMuscles');
    const fiche = i >= 0 ? ent.slice(i, ent.indexOf('\nfunction ', i + 10)) : '';
    const soucis = [];
    if (!/class="ml-retour"/.test(fiche))
      soucis.push('la fleche de retour a disparu : la fiche ne se ferme plus qu\'en touchant a cote');
    if (!/\.ml-modal \.ml-retour/.test(css))
      soucis.push('le style de la fleche a disparu');
    if (soucis.length) faute('R40 fleche de la fiche du jour', soucis.join(' ; '));
    else passe('R40 fleche de la fiche du jour');
  }
}

// ------------------------------------------------------------
// R41 — Le calendrier ne retient que deux semaines.
// Raci, 17/08 : « retiens les dates du calendrier uniquement de la
// semaine precedant la semaine en cours ». Les jours notes au-dela
// sont effaces au chargement, et l'effacement remonte au compte —
// sinon ils reviendraient au demarrage suivant.
//
// Le piege : elaguer le FUTUR avec le passe. On y planifie des
// seances ; une purge symetrique viderait le programme de la semaine
// a venir. La borne ne coupe que vers l'arriere.
// ------------------------------------------------------------
{
  const st = lire('app-v2/src/store/entrainement.js');
  if (st) {
    const soucis = [];
    if (!/export function borneCalendrier/.test(st))
      soucis.push('la borne du calendrier a disparu : l\'historique repart sans limite');
    if (!/jour >= borne/.test(st))
      soucis.push('l\'elagage ne compare plus a la borne');
    if (/jour <= borne|jour > borne\)/.test(st))
      soucis.push('l\'elagage coupe dans le mauvais sens : il emporterait les seances planifiees');
    if (!/sauvegarder\(u, \{ muscleLog: elague \}\)/.test(st))
      soucis.push('les jours elagues ne sont pas effaces cote compte : ils reviendraient au prochain chargement');
    // La fleche de recul doit s'eteindre a la borne : un mois vide
    // qu'on peut atteindre se lit comme une perte de donnees.
    const ent2 = lire('app-v2/src/components/Entrainer.jsx') || '';
    if (!/avantBorne/.test(ent2))
      soucis.push('la fleche de recul du calendrier ne s\'arrete plus a la borne : elle ouvre des mois vides');
    if (soucis.length) faute('R41 fenetre du calendrier', soucis.join(' ; '));
    else passe('R41 fenetre du calendrier');
  }
}

// ------------------------------------------------------------
// R42 — S'entrainer tient sur trois gris et trois graisses.
// Releve du 17/08 avant la passe typographique : 5 graisses, 13
// tailles et 11 couleurs de texte sur un seul ecran. Chaque ajout
// avait apporte sa nuance, et l'ensemble ne disait plus quelle
// information comptait. Deux gris venaient meme d'ailleurs (#334155,
// #CBD5E1, herites du calendrier) et tiraient vers le bleu sur un
// fond creme.
// La regle verifie les tokens plutot que de recompter le rendu : si
// quelqu'un reintroduit une couleur en dur, elle ne s'appuiera sur
// aucun d'eux.
// ------------------------------------------------------------
{
  const css = lire('app-v2/src/styles/entrainer-carte.css');
  if (css) {
    const soucis = [];
    for (const jeton of ['--txt-1', '--txt-2', '--txt-3']) {
      if (!css.includes(jeton)) soucis.push(`${jeton} a disparu : la page perd sa palette de texte`);
    }
    const propre = sansCommentaires(css);
    // Les gris bleutes du calendrier ne doivent pas revenir.
    if (/#334155|#CBD5E1/i.test(propre))
      soucis.push('un gris bleute est revenu sur S\'entrainer : il jure avec le fond creme');
    // Les jetons doivent POINTER vers le systeme de design. La
    // premiere version en inventait trois de plus, proches mais
    // differents de --texte / --texte-2 / --texte-3 : c'est exactement
    // le probleme qu'ils pretendaient resoudre, un cran plus haut.
    if (!/--txt-1:\s*var\(--texte\)/.test(propre))
      soucis.push('les gris de S\'entrainer ne pointent plus vers le systeme de design : deux palettes a tenir en phase a la main');
    const ent = lire('app-v2/src/styles/entete-commune.css') || '';
    if (/color:\s*#191919/.test(sansCommentaires(ent)))
      soucis.push('l\'en-tete reprend un noir en dur au lieu de --texte');
    // Les cartes des deux pages doivent porter la MEME ombre. Mesure
    // du 17/08 : celles de S'entrainer n'en avaient aucune et leur
    // bordure etait a 6 % d'opacite — d'ou l'impression de deux
    // niveaux de finition entre les onglets.
    if (!/0 6px 18px rgba\(60, 50, 40, \.07\)/.test(propre))
      soucis.push('les cartes de S\'entrainer ont perdu l\'ombre du Journal : les deux onglets se remettent a diverger');
    // La carte d'action porte le MEME graphite que le cadran des
    // calories : deux graphites voisins se remarquent des qu'on passe
    // d'un onglet a l'autre.
    if (!/\.ent-action \{[^}]*var\(--degrade-graphite\)/.test(propre.replace(/\s+/g, ' ')))
      soucis.push('la carte d\'action n\'utilise plus le degrade graphite du systeme : elle divergerait du cadran du Journal');
    if (/\.ent-prog-t \{[^}]*color:\s*#(16130F|181818)/i.test(propre.replace(/\s+/g, ' ')))
      soucis.push('le texte de « Mon programme » est repasse en noir : illisible sur graphite');
    if (soucis.length) faute('R42 typographie de S\'entrainer', soucis.join(' ; '));
    else passe('R42 typographie de S\'entrainer');
  }
}

// ------------------------------------------------------------
// R43 — Le haut de S'entrainer reste degage.
// Raci, 21/08, capture a l'appui : les deux pastilles de resume
// flottaient entre l'en-tete et la carte d'action, de largeurs
// inegales, et cassaient l'alignement du haut. Elles comptent les
// seances du MOIS AFFICHE au calendrier — leur place est sous son
// titre, pas au-dessus du bouton du jour.
// Les emoji qui les precedaient sont retires : un halterophile et un
// biceps en couleur ne disaient rien que le texte ne dise deja.
// ------------------------------------------------------------
{
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  if (ent) {
    const soucis = [];
    const i = ent.indexOf('function JournalEntrainement');
    const bloc = i >= 0 ? ent.slice(i, ent.indexOf('\nfunction ', i + 10)) : ent;
    // Raci, 5/09 : « finalement ca aussi ca sert a rien ». Les deux
    // pastilles sont supprimees — le calendrier montrait deja ce
    // qu'elles racontaient. Ce qui reste a proteger : qu'elles ne
    // remontent pas au-dessus de la carte d'action, la ou elles
    // dealignaient le haut de page en aout.
    if (/wlog-resume/.test(bloc))
      soucis.push('les pastilles de resume sont revenues sous le titre du calendrier');
    if (/class="wlog-sum"/.test(bloc))
      soucis.push('le haut de page porte de nouveau quelque chose avant la carte d\'action');
    if (/wlog-sum-vide|first_session_t/.test(bloc))
      soucis.push('le bandeau « Ta premiere seance t\'attend » est revenu au-dessus de la carte');
    if (/🏋|💪|👋/.test(bloc))
      soucis.push('un emoji est revenu en haut de S\'entrainer');
    if (soucis.length) faute('R43 haut de S\'entrainer', soucis.join(' ; '));
    else passe('R43 haut de S\'entrainer');
  }
}

// ------------------------------------------------------------
// R44 — L'en-tete n'a que deux colonnes tant que le prenom est retire.
// Raci, 21/08 : « on enleve le bonjour + nom pour le moment ». Le
// piege est dans la grille : avec « 1fr auto 1fr » et deux enfants
// seulement, les icones se placent dans la colonne du MILIEU et
// laissent un vide a droite. Les deux changements vont ensemble — si
// l'un revient sans l'autre, l'en-tete se casse.
// ------------------------------------------------------------
{
  const jsx = lire('app-v2/src/components/Entete.jsx');
  const css = lire('app-v2/src/styles/entete-commune.css');
  if (jsx && css) {
    // Le rendu compte, pas le commentaire qui conserve la ligne.
    const actif = jsx.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    const troisColonnes = /grid-template-columns:\s*1fr auto 1fr/.test(sansCommentaires(css));
    const prenomRendu = /class="j-prenom"/.test(actif);
    if (prenomRendu !== troisColonnes) {
      faute('R44 en-tete et prenom', prenomRendu
        ? 'le prenom est rendu mais la grille n\'a que deux colonnes : il ecrasera les icones'
        : 'le prenom est retire mais la grille en garde trois : les icones se calent au milieu et laissent un vide a droite');
    } else passe('R44 en-tete et prenom');
  }
}

// ------------------------------------------------------------
// R45 — Le rapport des macros survit a la saisie chiffre par chiffre.
// Raci, 21/08 : « j'ai modifie mes calories mais les macros n'ont
// toujours pas change ». Elles changeaient — mais mal.
//
// Le rapport etait relu dans l'ETAT COURANT a chaque frappe, donc il
// se detruisait lui-meme. En tapant « 4000 » sur un objectif de 3562
// kcal : le premier « 4 » ramenait les macros a 0 g de proteines,
// 1 g de glucides ; le « 0 » suivant les mettait a l'echelle de CES
// valeurs-la. Resultat final : 4000 kcal, 0 g de proteines, 1000 g de
// glucides.
//
// Le rapport est desormais fige a l'ouverture (useRef) et ne bouge que
// si l'utilisateur saisit une macro a la main.
// ------------------------------------------------------------
{
  const tdee = lire('app-v2/src/components/TdeeCalculator.jsx');
  if (tdee) {
    const soucis = [];
    if (!/partRef/.test(tdee))
      soucis.push('le rapport des macros n\'est plus fige : il se detruira a nouveau frappe par frappe');
    // Le symptome exact : recalculer la base depuis `o` dans la branche kcal.
    const branche = (tdee.match(/if \(cle !== 'kcal'\)[\s\S]*?\}\);/) || [''])[0];
    if (/const base = \(\+o\.prot/.test(branche.slice(branche.indexOf('Changer les calories'))))
      soucis.push('la branche des calories relit les macros courantes : le rapport se detruit a chaque frappe');
    if (soucis.length) faute('R45 rapport des macros', soucis.join(' ; '));
    else passe('R45 rapport des macros');
  }
}

// ------------------------------------------------------------
// R46 — Un jour ne porte que ce qui le justifie encore.
// Raci, 22/08 : « si je clique sur le 21 aout il m'affiche 4 muscles,
// c'est faux ». La fiche ne lisait pourtant que ce jour-la. Le defaut
// etait en amont : enregistrerSeance RECOPIAIT les muscles de la
// seance dans muscleLog. Deux sources fondues en une, impossible a
// separer ensuite — supprimer la seance laissait sa couleur sur le
// jour, definitivement, sans qu'aucune pastille ne l'explique.
// Regle : muscleLog ne contient QUE le marquage manuel ; ce qui a ete
// fait se deduit des seances a la lecture (services/muscles-jour.js).
// ------------------------------------------------------------
{
  const src = lire('app-v2/src/services/muscles-jour.js');
  const seances = lire('app-v2/src/store/seances.js');
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  const st = lire('app-v2/src/components/Stats.jsx');
  const sa = lire('app-v2/src/components/StatsAvancees.jsx');
  const soucis = [];
  if (!src) soucis.push('services/muscles-jour.js a disparu : plus de source unique');
  else {
    for (const f of ['compteDuJour', 'musclesDuJour', 'musclesParJour']) {
      if (!new RegExp('export function ' + f).test(src)) soucis.push(`${f}() a disparu`);
    }
    // La deduction se fait jour par jour : filtrer sur sa.iso !== iso.
    if (!/sa\.iso !== iso/.test(src)) soucis.push('la deduction ne filtre plus sur le jour : elle agregerait plusieurs jours');
  }
  if (seances && /noterMuscles/.test(seances)) {
    soucis.push('la seance recopie a nouveau ses muscles dans muscleLog : une seance supprimee laissera sa couleur pour toujours');
  }
  if (ent && !/const log = musclesParJour\(\)/.test(ent)) {
    soucis.push('le calendrier ne lit plus la source unique');
  }
  if (st && /muscleLog\.value/.test(st)) soucis.push('Stats relit muscleLog brut : les seances enregistrees en seraient absentes');
  if (sa && /muscleLog\.value/.test(sa)) soucis.push('Stats avancees relit muscleLog brut : les seances enregistrees en seraient absentes');
  if (soucis.length) faute('R46 muscles du jour', soucis.join(' ; '));
  else passe('R46 muscles du jour');
}

// ------------------------------------------------------------
// R47 — La sortie de la fiche ne recouvre rien.
// Quatre positions successives : haut-gauche (17/08), disque noir
// flottant en bas a droite (22/08), ligne de titre (26/08, refuse),
// et enfin une barre pleine largeur sous les boutons — maquette C,
// Raci le 26/08. Le disque flottant passait par-dessus « Effacer » et
// « Enregistrer » et frolait la barre systeme d'Android. Ce qui reste
// a proteger : elle existe, elle est apres les boutons dans le DOM
// comme a l'ecran, elle ne flotte pas, et elle ne reprend pas le noir
// reserve a l'action principale.
// ------------------------------------------------------------
{
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  const css = lire('app-v2/src/legacy/entrainer.scoped.css');
  const soucis = [];
  if (ent) {
    const i = ent.indexOf('function ModaleMuscles');
    const fiche = i >= 0 ? ent.slice(i, ent.indexOf('\nfunction ', i + 10)) : '';
    if (!/class="ml-retour"/.test(fiche)) soucis.push('la fiche n\'a plus de sortie a l\'ecran');
    else if (fiche.indexOf('class="ml-retour"') < fiche.indexOf('class="ml-btns"')) {
      soucis.push('la sortie est remontee au-dessus des boutons');
    }
    if (!/ml_retour/.test(fiche)) soucis.push('la barre a perdu son mot : une fleche nue ne dit pas ou elle mene');
  }
  if (css) {
    const bloc = (css.match(/\.ml-modal \.ml-retour \{[^}]*\}/) || [''])[0];
    if (/position: fixed|position: absolute/.test(bloc)) soucis.push('la sortie flotte de nouveau au-dessus du contenu');
    // La fiche est centree depuis le 26/08 : collee en bas, ses
    // boutons frolaient la barre systeme d'Android.
    if (!/align-items:center/.test((css.match(/\.ml-overlay\{[^}]*\}/) || [''])[0])) soucis.push('la fiche est redescendue coller au bas de l\'ecran');
    // Les silhouettes gardent une position unique, a gauche : les
    // centrer quand la legende est vide faisait sauter la mise en page
    // au premier muscle coche.
    if (/\.ml-corps--seul/.test(css)) soucis.push('la variante centree des silhouettes est revenue');
    // La hauteur est bornee par l'overlay, qui reserve les encoches ;
    // la carte se contente de ne pas le depasser.
    if (!/\.ml-modal\{[\s\S]{0,220}?max-height:100%/.test(css)) soucis.push('la fiche centree ne borne plus sa hauteur : elle depassera de l\'ecran');
    const bloc2 = (css.match(/\.ml-overlay\{[^}]*\}/) || [''])[0];
    if (!/safe-area-inset-bottom/.test(bloc2)) soucis.push('la fiche centree ne reserve plus les encoches');
    // Le fond doit s'effacer : une carte centree sur un voile pale se
    // confond avec la page qu'elle recouvre.
    const voile = /background:rgba\(\d+,\s*\d+,\s*\d+,\s*\.(\d+)\)/.exec(bloc2);
    if (!voile || Number('0.' + voile[1]) < 0.65) soucis.push('le voile derriere la fiche est trop pale : la page continue de se lire');
    if (!/width: 100%/.test(bloc)) soucis.push('la barre n\'occupe plus toute la largeur');
    if (/#16130F|#151515/.test(bloc)) soucis.push('la sortie reprend le noir reserve a « Enregistrer »');
    // « Effacer » ne doit pas concurrencer la sortie : c'est un lien,
    // pas un pave pleine largeur.
    const clear = (css.match(/\.ml-btns \.ml-clear\{[^}]*\}/) || [''])[0];
    if (!/background:none/.test(clear)) soucis.push('« Effacer » redevient un pave plein qui pese autant que « Retour »');
    if (!/min-height:44px/.test(clear)) soucis.push('« Effacer » passe sous la cible tactile de 44 px');
  }
  if (soucis.length) faute('R47 sortie de la fiche', soucis.join(' ; '));
  else passe('R47 sortie de la fiche');
}

// ------------------------------------------------------------
// R48 — Un ecart annonce doit se chiffrer et se combler.
// Raci, 23/08 : ses objectifs disaient 4000 kcal et 218/428/96, soit
// 3448 kcal de macros. La feuille affichait « — ecart avec tes
// calories » : ni le chiffre, ni le sens, ni de quoi le corriger. Elle
// constatait le probleme et laissait l'utilisateur avec. Regle : la
// note porte le nombre de kcal manquantes ou en trop, et les deux
// sorties (macros -> calories, calories -> macros) sont a un geste.
// Rien n'est recalcule d'office : les proportions restent celles de
// l'utilisateur, mises a l'echelle.
// ------------------------------------------------------------
{
  const jsx = lire('app-v2/src/components/TdeeCalculator.jsx');
  const css = lire('app-v2/src/styles.css');
  const soucis = [];
  if (!jsx) soucis.push('TdeeCalculator.jsx introuvable');
  else {
    if (!/const ecart = kcalMacros - kcalVise/.test(jsx)) soucis.push('l\'ecart n\'est plus calcule');
    if (!/il manque/.test(jsx) || !/de trop/.test(jsx)) soucis.push('l\'ecart ne dit plus son sens ni son chiffre');
    if (!/const repartir = /.test(jsx)) soucis.push('« Repartir » a disparu : l\'ecart redevient constate sans issue');
    if (!/const calerCalories = /.test(jsx)) soucis.push('le sens inverse (calories calees sur les macros) a disparu');
    // La repartition met a l'echelle, elle n'impose aucun ratio type.
    if (/0\.3\s*\*\s*cible|ratio par defaut/.test(jsx)) soucis.push('un ratio type est impose : les proportions doivent rester celles de l\'utilisateur');
  }
  if (css && !/\.calc-grille>\.pleine\{grid-column:1 \/ -1\}/.test(css)) {
    soucis.push('la note d\'ecart retombe dans la demi-colonne : ses boutons s\'empilent a cote de Lipides');
  }
  if (soucis.length) faute('R48 ecart macros/calories', soucis.join(' ; '));
  else passe('R48 ecart macros/calories');
}

// ------------------------------------------------------------
// R49 — retiree.
// v537 (Raci, 20/09) : « suppression du mode invite ». Cette regle
// protegeait l'entree sans compte ; elle est retiree par decision.
// Le compte devient obligatoire — ce qui ferme aussi la perte de
// donnees du 12/09, quand un vidage de cache avait tout efface
// faute de copie dans le cloud.
// ------------------------------------------------------------

// ------------------------------------------------------------
// R50 — La carte de programme nomme ce qu'elle lance.
// Raci, 24/08 : « je viens surtout pour piloter mon programme ». Le
// bouton « Demarrer une seance » ne disait pas laquelle, et le
// programme etait relegue sous lui en carte secondaire. La carte de
// pilotage ecrit la semaine du programme et nomme la seance du jour.
// Deux garde-fous : elle ne s'affiche QUE si un programme est actif
// (sans programme, le bloc d'origine reste le chemin), et le
// calendrier du mois comme « Ta semaine » restent sous elle, entiers
// — Raci les a explicitement gardes.
// ------------------------------------------------------------
{
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  const css = lire('app-v2/src/styles/entrainer-carte.css');
  const soucis = [];
  if (ent) {
    if (!/function CarteProgramme/.test(ent)) soucis.push('la carte de pilotage a disparu');
    // Raci, 5/09 : « on va enlever et laisser juste la seance
    // d'aujourd'hui » (maquette C). La semaine ligne par ligne est
    // supprimee — un jour passe non fait et un jour a venir
    // s'ecrivaient a l'identique. Le calendrier du mois, juste en
    // dessous, dit deja le reste de la semaine.
    if (/lignes\.map\(/.test(ent)) {
      soucis.push('la semaine est de nouveau ecrite ligne par ligne dans la carte');
    }
    if (!/class="cp-tuile"/.test(ent)) {
      soucis.push('la tuile du jour a disparu : plus rien ne lance la seance');
    }
    if (!/class="cp-tuile-go">[\s\S]{0,60}t\('cp_demarrer_simple'\)/.test(ent)) {
      soucis.push('« Demarrer la seance » a disparu de la tuile du jour');
    }
    if (!/t\('cp_rien_auj'\)/.test(ent)) {
      soucis.push('un jour sans seance prevue n\'affiche plus rien du tout');
    }
    // Raci, 5/09 : « une fois que la seance est faite elle doit etre
    // indiquee comme realisee », et « il doit etre possible de
    // demarrer uniquement la seance du jour en cours ».
    if (!/class="cp-tuile cp-tuile--fait"/.test(ent)) {
      soucis.push('la tuile propose encore de lancer une seance deja enregistree');
    }
    if (!/const faitAuj = seancesDuJour\(todayIso\)\[0\]/.test(ent)) {
      soucis.push('la tuile reproposera de demarrer des qu\'on change la seance du jour');
    }
    if (!/\{type === 'auj' && \(\s*\n?\s*<button class="ml-prevu-b"/.test(ent)) {
      soucis.push('une seance d\'un autre jour peut de nouveau etre demarree depuis le calendrier');
    }
    // Raci, 26/08 : un programme dit ce qui est prevu, il n'interdit
    // pas de faire autre chose. La seance libre doit rester joignable.
    if (!/class="cp-libre"/.test(ent)) {
      soucis.push('« Demarrer une seance » a disparu : avec un programme actif, plus moyen de s\'entrainer hors programme');
    }
    // La carte ne s'affiche que s'il y a quelque chose a piloter :
    // un programme actif OU une seance posee dans la semaine (R55).
    // Sans l'un des deux, le bloc d'action d'origine reprend la main.
    if (!/\(programmeActif\.value \|\| poseeCetteSemaine\(today\)\)/.test(ent)) {
      soucis.push('la carte n\'est plus conditionnee : sans programme ni seance posee, il ne resterait aucun chemin');
    }
    if (!/class="ent-bloc"/.test(ent)) soucis.push('le calendrier ou « Ta semaine » a saute — Raci les a gardes');
  }
  if (css && !/\.cp-tuile \{/.test(css)) soucis.push('la tuile du jour a perdu son style');
  if (css && !/\.cp-repos \{/.test(css)) soucis.push('le jour sans seance n\'a plus de mise en forme');
  if (soucis.length) faute('R50 carte de programme', soucis.join(' ; '));
  else passe('R50 carte de programme');
}

// ------------------------------------------------------------
// R51 — Replacer une seance doit pouvoir aboutir.
// Raci, 26/08 : « je clique sur replacer, changer et je ne peux rien
// modifier ». Sur un programme complet, chaque seance etait deja
// posee quelque part, donc toutes les autres apparaissaient grisees
// « deja placee un autre jour » : le seul choix offert etait celui
// deja en place. Un ecran de modification ou rien ne se modifie.
// Choisir une seance posee ailleurs echange desormais les deux jours.
// ------------------------------------------------------------
{
  const pl = lire('app-v2/src/components/PlanifierProgramme.jsx');
  const soucis = [];
  if (pl) {
    if (/disabled=\{pris\}/.test(pl)) {
      soucis.push('les seances placees ailleurs sont a nouveau desactivees : l\'ecran redevient un cul-de-sac');
    }
    if (!/const ailleurs = Object\.keys\(n\)/.test(pl)) {
      soucis.push('l\'echange de deux jours a disparu de affecter()');
    }
  }
  // La feuille legacy/planifier.scoped.css n'etait importee nulle part :
  // ses regles vivent depuis le 5/09 dans styles/entrainer-carte.css.
  const css = lire('app-v2/src/styles/entrainer-carte.css');
  if (css && !/\.pl-abandon \{/.test(css)) {
    soucis.push('« Abandonner ce programme » n\'a plus de style : bouton brut de navigateur');
  }
  // Raci, 5/09 : « plus possible de modifier le jour qui a deja ete
  // fait, et pas de deuxieme seance le meme jour ».
  if (pl && !/if \(v === jourFait\) return;/.test(pl)) {
    soucis.push('un jour deja entraine peut de nouveau etre replace');
  }
  if (pl && !/t\('pl_jour_fait'\)/.test(pl)) {
    soucis.push('rien n\'indique qu\'un jour est verrouille parce qu\'il a ete fait');
  }
  if (css && !/\.pl-autre \{/.test(css)) {
    soucis.push('« Changer de programme » est redevenu un lien souligne');
  }
  // Maquette A (Raci, 5/09) : « aucune distinction entre les
  // differents parametres ». Trois groupes distincts — la semaine en
  // une carte, les actions, et l'irreversible a part.
  if (css && !/\.pl-jours \{[^}]*background: #FFF/.test(css)) {
    soucis.push('les jours sont redevenus sept cartes flottantes au lieu d\'une seule');
  }
  if (pl && !/class="pl-sect"/.test(pl)) {
    soucis.push('l\'etiquette de section a disparu : plus rien n\'annonce la semaine ni le compte');
  }
  if (pl && !/class="pl-zone-danger"/.test(pl)) {
    soucis.push('« Abandonner » est retourne dans le groupe des reglages');
  }
  if (pl && !/t\('pl_abandon_perte'\)/.test(pl)) {
    soucis.push('« Abandonner » ne dit plus ce qu\'il efface');
  }
  // « Changer de programme » refait les quatre questions (Raci, 5/09).
  // Il ouvrait la fiche du programme COURANT : on ne changeait rien.
  if (pl && !/allerVers\('questionnaire'\)/.test(pl)) {
    soucis.push('« Changer de programme » ne refait plus le questionnaire');
  }
  if (pl && /allerVers\('programmes'/.test(pl)) {
    soucis.push('« Changer de programme » rouvre la bibliotheque supprimee');
  }
  if (soucis.length) faute('R51 replacer une seance', soucis.join(' ; '));
  else passe('R51 replacer une seance');
}

// ------------------------------------------------------------
// R52 — La barre des onglets ne recouvre aucune page.
// Raci, 26/08 (capture annotee) : sur « Quels jours ? », la barre des
// quatre onglets flottait par-dessus « Modifier mon programme » et
// cachait entierement « Abandonner ce programme ». La barre est en
// position fixe : toute page a onglets doit reserver sa hauteur en
// bas, sinon son dernier element devient invisible ET intouchable.
// La regle liste les pages plein ecran et exige la reserve.
// ------------------------------------------------------------
{
  const soucis = [];
  const pages = [
    ['pg-planifier', 'app-v2/src/styles/entrainer-carte.css'],
    ['pg-programmes', 'app-v2/src/legacy/programmes.scoped.css'],
  ];
  for (const [cls, fichier] of pages) {
    const css = lire(fichier);
    if (!css) continue;
    const bloc = (css.match(new RegExp('\\.' + cls + '\\s*\\{[^}]*\\}')) || [''])[0];
    // Deux facons acceptables de reserver : la variable de hauteur de
    // la nav, ou un fond de page d'au moins 100 px en dur.
    const enDur = (bloc.match(/padding:[^;]*?(\d+)px\s*;/) || [])[1];
    if (!/hauteur-nav/.test(bloc) && !(enDur && Number(enDur) >= 100)) {
      soucis.push(`.${cls} ne reserve pas la hauteur de la barre d'onglets : son dernier bouton est recouvert`);
    }
  }
  if (soucis.length) faute('R52 barre d\'onglets', soucis.join(' ; '));
  else passe('R52 barre d\'onglets');
}

// ------------------------------------------------------------
// R53 — Un libelle nomme sa destination.
// 26/08 : le lien du bas de « Quels jours ? » a ete rebaptise
// « Modifier mon programme ». Il ouvre la bibliotheque « Tous les
// programmes » — on n'y modifie rien, on en choisit un autre. Raci
// l'a suivi et s'est retrouve ailleurs que ce que le mot promettait.
// La regle relie le libelle a la vue ouverte : tant que le bouton
// mene a 'programmes', il doit parler de CHANGER, pas de modifier.
// ------------------------------------------------------------
{
  const pl = lire('app-v2/src/components/PlanifierProgramme.jsx');
  const str = lire('app-v2/src/legacy/strings.js');
  const soucis = [];
  if (pl && str) {
    const versBiblio = /class="pl-autre" onClick=\{\(\) => allerVers\('programmes'\)\}/.test(pl);
    const m = /pl_autre:"([^"]*)"/.exec(str);
    const libelle = m ? m[1].toLowerCase() : '';
    if (versBiblio && /modifier|adapter/.test(libelle)) {
      soucis.push(`« ${m[1]} » ouvre la bibliotheque des programmes : le mot promet une modification qui n'a pas lieu`);
    }
  }
  if (soucis.length) faute('R53 libelle et destination', soucis.join(' ; '));
  else passe('R53 libelle et destination');
}

// ------------------------------------------------------------
// R54 — Plus de barre orange du v1 dans la V2.
// Raci, 26/08 : « elle revient trop souvent et elle fait partie de la
// V1 ». La topbar-app (maison + pastille Premium) etait recopiee de
// programmes.html sur deux ecrans V2 : elle faisait un SECOND en-tete
// au-dessus de celui de l'app, et son bouton maison sortait de la
// navigation par onglets. Ses deux destinations existent ailleurs :
// la fleche retour de l'ecran, et l'onglet BelFit+ de la barre du bas.
// Retiree avec ses regles CSS. Rien ne la remplace.
// ------------------------------------------------------------
{
  const soucis = [];
  for (const f of ['Programmes', 'SeanceDetail', 'Entrainer', 'Stats', 'PremiumPage']) {
    const src = lire(`app-v2/src/components/${f}.jsx`);
    if (src && /class="topbar-app"|class="topbar-home"|class="premium-pill"/.test(src)) {
      soucis.push(`${f}.jsx a repose la barre orange du v1`);
    }
  }
  if (soucis.length) faute('R54 barre v1', soucis.join(' ; '));
  else passe('R54 barre v1');
}

// ------------------------------------------------------------
// R55 — Une seance posee a la main compte autant qu'un programme.
// Raci, 26/08 : « j'ai programme deux seances et elles ne s'affichent
// pas dans mon programme ». Elles etaient bien enregistrees dans
// planifs, mais la carte de pilotage ne lisait que programmeActif :
// une seance posee sur une date precise n'apparaissait nulle part.
// Et le questionnaire de 4 questions est retire : « Mon programme »
// ouvre la bibliotheque, on ne passe plus par un peage pour atteindre
// une liste qu'on peut lire directement.
// ------------------------------------------------------------
{
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  const dm = lire('app-v2/src/components/DemarrerSeance.jsx');
  const soucis = [];
  if (ent) {
    if (!/const pose = planifs\.value\[iso\]/.test(ent)) {
      soucis.push('la carte ne lit plus les seances posees a la main');
    }
    // Raci, 26/08 : « si je note Épaules pour demain, c'est un jour
    // programme ». Les pastilles du calendrier sont le chemin le plus
    // court pour planifier : elles doivent nourrir la carte.
    if (!/else if \(marques\.length\)/.test(ent)) {
      soucis.push('un jour simplement note dans le calendrier n\'apparait plus comme jour programme');
    }
    // Un jour futur reste « a venir » meme s'il porte deja des muscles.
    if (!/etat: iso > todayIso \? 'venir'/.test(ent)) {
      soucis.push('un jour futur note serait compte comme deja fait');
    }
    // Un jour note n'a pas d'exercices : le bouton ne doit pas
    // promettre de le demarrer.
    if (!/l\.auj && l\.lancable/.test(ent)) {
      soucis.push('le bouton promet de demarrer un jour simplement note, qui n\'a aucun exercice');
    }
    if (!/function poseeCetteSemaine/.test(ent)) {
      soucis.push('sans garde-fou, la carte peut renvoyer null et faire disparaitre toute la zone d\'action');
    }
    // Le questionnaire a d'abord ete retire (il etait obligatoire),
    // puis remis comme choix, puis branche en direct sur le lien de la
    // carte (Raci, 26/08) : celui qui clique « Trouver mon programme »
    // ne sait pas quoi faire, les quatre questions SONT la reponse.
    // Ce qui reste interdit : qu'il barre la route du gros bouton.
    if (/class="cp-go"[\s\S]{0,300}allerVers\('questionnaire'\)/.test(ent)) {
      soucis.push('le questionnaire barre de nouveau le bouton principal');
    }
  }
  if (dm && /allerVers\('questionnaire'\)/.test(dm)) soucis.push('le questionnaire redevient un passage oblige depuis Demarrer une seance');
  if (soucis.length) faute('R55 seances posees', soucis.join(' ; '));
  else passe('R55 seances posees');
}

// ------------------------------------------------------------
// R56 — Plus d'ecran-peage avant la liste des programmes.
// Raci, 26/08 : « cet ecran doit disparaitre, il faisait partie de la
// V1, enleve-le a jamais ». Il visait « Tous les programmes » et ses
// trois cartes d'objectif — Prendre du muscle / Perdre du poids / Me
// remettre en forme. Trois cartes a lire, un appui de plus, pour
// atteindre une liste de quatorze programmes qui tient dans un ecran
// filtre par niveau. Meme peage que le questionnaire, retire le meme
// jour. Les categories restent dans les DONNEES (classement,
// recommandation) mais n'ont plus d'ecran.
// ------------------------------------------------------------
{
  const pr = lire('app-v2/src/components/Programmes.jsx');
  const soucis = [];
  if (pr) {
    if (/ecran === 'cats'|setEcran\('cats'\)|class="cat-card"|class="cat-list"/.test(pr)) {
      soucis.push('l\'ecran des trois objectifs est revenu');
    }
    // Depuis le 26/08 l'entree est l'aiguillage a deux voies (R59) :
    // la liste reste a UN appui, sans ecran d'objectifs entre les deux.
    if (!/useState\(vise \? 'seances' : 'progs'\)/.test(pr)) {
      soucis.push('l\'entree de la bibliotheque a change sans passer par R59');
    }
    // Le Full body debutant est range dans « forme » ET repousse dans
    // « masse » : a plat, il sortait deux fois.
    if (!/!TOUS\.some\(x => x\.id === p\.id\)/.test(pr)) {
      soucis.push('la liste a plat n\'est plus dedoublonnee : Full body apparaitra deux fois');
    }
  }
  if (soucis.length) faute('R56 bibliotheque a plat', soucis.join(' ; '));
  else passe('R56 bibliotheque a plat');
}

// ------------------------------------------------------------
// R57 — Les trapezes sont un groupe entier, pas une pastille.
// Raci, 26/08 : « inclure les trapezes comme muscle supplementaire
// dans la liste des muscles ». Ils existaient depuis le 10/08 dans le
// calendrier et sur les silhouettes, mais PAS dans le selecteur
// d'exercices : on pouvait noter une seance de trapezes apres coup,
// jamais en monter une. Les cinq Shrug etaient ranges sous « dos ».
// Un muscle doit exister partout ou les autres existent : selecteur,
// deduction depuis un titre, couleur de stats.
// ------------------------------------------------------------
{
  const ex = lire('app-v2/src/data/exercices.js');
  const pg = lire('app-v2/src/store/programme.js');
  const st = lire('app-v2/src/components/Stats.jsx');
  const gr = lire('app-v2/src/store/entrainement.js');
  const soucis = [];
  if (ex) {
    if (!/\{key:'trapezes', label:'Trapèzes'\}/.test(ex)) soucis.push('trapezes absent de MUSCLES : pas d\'onglet dans le selecteur');
    const m = /^  trapezes: \[/m.exec(ex);
    const n = m ? (ex.slice(m.index, ex.indexOf('\n  ],', m.index)).match(/\{nom:/g) || []).length : 0;
    if (n < 5) soucis.push(`le groupe trapezes ne compte que ${n} exercices (5 attendus)`);
    const md = /^  dos: \[/m.exec(ex);
    if (md && /nom:'Shrug/.test(ex.slice(md.index, ex.indexOf('\n  ],', md.index)))) {
      soucis.push('des Shrug sont revenus dans « dos » : ils y seraient comptes comme du dos');
    }
  }
  if (pg && !/trapezes: \['trapèze'/.test(pg)) soucis.push('un titre « Trapezes » ne colore plus le calendrier');
  if (st && /trapezes: '#F7B500'/.test(st)) soucis.push('les trapezes reprennent la teinte des epaules dans Stats');
  if (gr && !/k: 'trapezes'/.test(gr)) soucis.push('trapezes a disparu des GROUPES');
  if (soucis.length) faute('R57 trapezes', soucis.join(' ; '));
  else passe('R57 trapezes');
}

// ------------------------------------------------------------
// R58 — La fleche d'une seance recule d'UNE page.
// Raci, 26/08 : depuis « Seance A », le retour sautait deux crans et
// atterrissait sur la bibliotheque au lieu de la liste des seances du
// programme. `allerVers('programmes')` etait appele sans parametre :
// la bibliotheque s'ouvrait donc a plat, comme si l'on n'avait jamais
// choisi de programme. L'identifiant de seance vaut « progId-index » ;
// on en retire l'index pour rouvrir la page du programme.
// ------------------------------------------------------------
{
  // 5/09 : la bibliotheque est supprimee. Le retour d'une seance ne
  // reconstruit plus rien — il rend la main a S'entrainer, d'ou qu'on
  // vienne. Ce qui reste a proteger : qu'il n'y retourne jamais.
  const m = lire('app-v2/src/main.jsx');
  const soucis = [];
  if (m) {
    if (!/retour=\{retourEntrainer\}/.test(m)) {
      soucis.push('le retour d\'une seance ne rend plus la main a S\'entrainer');
    }
    if (/allerVers\('programmes'/.test(m)) {
      soucis.push('le routeur rouvre la bibliotheque supprimee');
    }
  }
  if (soucis.length) faute('R58 retour d\'une seance', soucis.join(' ; '));
  else passe('R58 retour d\'une seance');
}

// ------------------------------------------------------------
// R59 — Deux voies vers un programme, aucune imposee.
// Raci, 26/08 : « si je clique sur Choisir un programme, il doit me
// proposer si je veux faire le questionnaire ; si oui les 4 questions,
// sinon acces direct aux programmes par niveau ». Le questionnaire
// avait ete retire le matin meme parce qu'il etait OBLIGATOIRE. Il
// revient comme choix. Les deux voies doivent rester joignables.
// ------------------------------------------------------------
{
  const pr = lire('app-v2/src/components/Programmes.jsx');
  const css = lire('app-v2/src/legacy/programmes.scoped.css');
  const soucis = [];
  if (pr) {
    // Raci, 5/09 : l'aiguillage est supprime. « L'utilisateur n'est
    // pas cense acceder a ca » — il s'intercalait entre le bouton et
    // la bibliotheque, et son retour redescendait un empilement que
    // personne n'avait monte. La bibliotheque s'ouvre donc en premier.
    if (/ecran === 'intro'/.test(pr)) soucis.push('l\'aiguillage « Par ou veux-tu commencer ? » est revenu');
    if (!/useState\(vise \? 'seances' : 'progs'\)/.test(pr)) {
      soucis.push('la bibliotheque ne s\'ouvre plus directement');
    }
  }
  if (css && !/\.prog-card/.test(css)) soucis.push('les cartes de programme ont perdu leur style');
  // Le libelle du lien doit annoncer le carrefour, pas une seule de
  // ses branches : « Choisir un programme » promettait un catalogue.
  // Le lien de la carte mene DIRECTEMENT aux quatre questions : celui
  // qui clique ne sait pas quoi faire, un carrefour de plus le
  // renverrait a son indecision.
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  if (ent && !/: allerVers\('questionnaire'\)\)/.test(ent)) {
    soucis.push('le lien de la carte n\'ouvre plus directement les quatre questions');
  }
  const str = lire('app-v2/src/legacy/strings.js');
  if (str && /cp_choisir:"Choisir un programme"/.test(str)) {
    soucis.push('le lien promet un catalogue alors qu\'il ouvre les quatre questions');
  }
  if (soucis.length) faute('R59 deux voies', soucis.join(' ; '));
  else passe('R59 deux voies');
}

// ------------------------------------------------------------
// R60 — La chaine de publication reste verrouillee.
// Constat du 26/08 : la CI ne lancait que verif-js.js. L'audit, qui
// porte toutes les regressions deja payees, restait un outil
// facultatif a cote de la porte de production. Il doit etre DEVANT.
// Cette regle verifie aussi que la source de verite existe : une IA
// qui lit un README perime peut decider que la V2 est abandonnee.
// ------------------------------------------------------------
{
  const soucis = [];
  const ci = (lire('.github/workflows/deploy.yml') || '');
  if (ci) {
    if (!/node tools\/verif-js\.js/.test(ci)) soucis.push('verif-js ne tourne plus dans la CI');
    if (!/node tools\/audit\.mjs/.test(ci)) soucis.push('l\'audit ne bloque plus le deploiement');
    const iAudit = ci.indexOf('tools/audit.mjs');
    const iBuild = ci.indexOf('npm run build');
    if (iAudit > -1 && iBuild > -1 && iAudit > iBuild) soucis.push('l\'audit tourne apres le build : trop tard');
  }
  if (!lire('ETAT-DU-PROJET.md')) soucis.push('la source de verite ETAT-DU-PROJET.md a disparu');
  const rm = lire('app-v2/README.md');
  if (rm && !/^> \*\*ARCHIVE/.test(rm)) soucis.push('le README v2 perime n\'est plus marque ARCHIVE');
  if (!lire('tools/sync-version.mjs')) soucis.push('le script de synchronisation des versions a disparu');
  if (soucis.length) faute('R60 chaine de publication', soucis.join(' ; '));
  else passe('R60 chaine de publication');
}

// ------------------------------------------------------------
// R61 — Le chrono n'apparait qu'ou il sert.
// Raci, 26/08 : « afficher le chrono seulement sur la page principale
// de S'entrainer et pendant une seance ». Il flottait sur six ecrans,
// dont la bibliotheque et le choix des exercices, ou il n'y avait rien
// a chronometrer. Il doit aussi passer AU-DESSUS de la barre des
// quatre onglets, pas la toucher.
// ------------------------------------------------------------
{
  const m = lire('app-v2/src/main.jsx');
  const st = lire('app-v2/src/styles.css');
  const soucis = [];
  if (m) {
    const n = (m.match(/<RestTimer \/>/g) || []).length;
    // L'ecran 'seance' (SeanceTracker) etait orphelin : aucun
    // allerVers('seance') n'existait. Retire le 5/09, avec son chrono.
    // 23/09 : la seance en cours a son repos integre (±30 s, arreter),
    // pour tous les parcours. Le chrono flottant ne reste que sur
    // l'accueil.
    if (n !== 1) soucis.push('le chrono est monte ' + n + ' fois au lieu de 1 (accueil)');
    if (!/<Entrainer \/><RestTimer \/>/.test(m)) soucis.push('le chrono a quitte l\'accueil de S\'entrainer');
    for (const [vue, comp] of [['le choix des exercices', 'SelectionExercices'],
                               ['la planification', 'PlanifierProgramme'], ['« Demarrer une seance »', 'DemarrerSeance']]) {
      if (new RegExp('<' + comp + '[^>]*\\/><RestTimer').test(m)) soucis.push('le chrono est revenu sur ' + vue);
    }
  }
  // Le bouton doit degager la barre des quatre onglets.
  if (st && !/\.v2-chrono-fab\{position:fixed;bottom:calc\(90px \+ 1mm/.test(st)) {
    soucis.push('le chrono est redescendu sur la barre des onglets');
  }
  if (soucis.length) faute('R61 chrono la ou il sert', soucis.join(' ; '));
  else passe('R61 chrono la ou il sert');
}

// ------------------------------------------------------------
// R62 — Aucun ecran qui ne fait que reposer une question.
// Raci, 26/08 (capture barree) : « supprime cette page, elle ne sert a
// rien ». L'ecran « Demarrer une seance » affichait une seule carte
// — Seance libre — et un lien vers les programmes, alors que les deux
// choix etaient deja cote a cote sur la carte de pilotage. Un appui de
// plus pour arriver au meme endroit.
// ------------------------------------------------------------
{
  const soucis = [];
  if (lire('app-v2/src/components/DemarrerSeance.jsx')) soucis.push('l\'ecran intermediaire est revenu');
  const css = lire('app-v2/src/styles/entrainer-carte.css');
  if (css && /\.pg-demarrer/.test(css)) soucis.push('ses styles sont revenus sans son ecran');
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  if (ent && /'demarrer'/.test(ent)) soucis.push('un bouton pointe encore vers l\'ecran supprime');
  if (soucis.length) faute('R62 pas d\'ecran-peage', soucis.join(' ; '));
  else passe('R62 pas d\'ecran-peage');
}

// ------------------------------------------------------------
// R63 — La carte ne repete pas ce qui se lit deja.
// Raci, 26/08 : « les rubriques sont trop collees, je n'aime pas la
// mise en page ». Quatre lignes portaient le meme sous-titre mot pour
// mot, et deux pastilles « A VENIR » disaient ce que l'absence de
// marque disait deja. Maquette A retenue : une marque au plus par
// ligne, un sous-titre seulement s'il informe, des filets fins.
// ------------------------------------------------------------
{
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  const css = lire('app-v2/src/styles/entrainer-carte.css');
  const soucis = [];
  if (ent) {
    // 5/09 : la carte n'a plus de lignes de semaine. Ce qui reste a
    // proteger : qu'aucune des repetitions d'aout n'y revienne avec
    // elles.
    if (/cp_venir/.test(ent)) soucis.push('la pastille « a venir » est revenue');
    if (/l\.seance\.sub/.test(ent)) soucis.push('le sous-titre « N exercices · ~M min » est revenu');
    if (/sub: t\('cp_note'\)/.test(ent)) soucis.push('« Note depuis le calendrier » est revenu sur chaque ligne');
  }
  if (css) {
    if (/\.cp-e-venir/.test(css)) soucis.push('le style de la pastille « a venir » traine encore');
  }
  if (soucis.length) faute('R63 carte sans repetition', soucis.join(' ; '));
  else passe('R63 carte sans repetition');
}

// ------------------------------------------------------------
// R64 — Cru/cuit se corrige sans tout refaire.
// Raci, 26/08 : « on ne peut pas modifier directement ». Les 84
// aliments qui portent leur cuisson dans leur nom se voyaient refuser
// la bascule — leur nom disait la cuisson, donc plus rien a convertir.
// Qui avait choisi la mauvaise entree devait la supprimer et
// recommencer. La bascule change maintenant d'entree : valeurs
// exactes de la base, aucun facteur devine.
// ------------------------------------------------------------
{
  const al = lire('app-v2/src/data/aliments.js');
  const mc = lire('app-v2/src/components/MealCard.jsx');
  const jn = lire('app-v2/src/store/journal.js');
  const soucis = [];
  if (al) {
    if (!/export const PAIRES_CUISSON/.test(al)) soucis.push('les paires cru/cuit ne sont plus calculees');
    // La bascule ne doit jamais renvoyer vers une entree masquee :
    // l'aliment deviendrait introuvable a la recherche.
    if (!/if \(DB\[n\]\.cache\) continue;/.test(al)) soucis.push('la bascule peut renvoyer vers un aliment masque');
    // Raci, 26/08 : « precise pommes de terre cru, c'est ecrit cuit ou
    // rien ». Un aliment cru dont le nom ne dit pas qu'il est cru,
    // alors qu'une version cuite existe, se lit comme un piege.
    const noms = [...al.matchAll(/^\s*'([^']+)':\{([^}]*)\}/gm)];
    const vis = new Set(noms.filter(m => !/cache:true/.test(m[2])).map(m => m[1]));
    const muets = [...vis].filter(n => !/\b(cru|crue|crus|cuit|cuite|cuits|cuites)\b/i.test(n)
      && [' cuit', ' cuite', ' (cuit)', ' (cuite)'].some(x => vis.has(n + x)));
    if (muets.length) soucis.push(muets.length + ' aliment(s) crus ne le disent pas alors que leur version cuite existe : ' + muets.slice(0, 4).join(', '));
  }
  if (jn && !/export function remplacerAliment/.test(jn)) soucis.push('le changement d\'entree a disparu du store');
  if (mc) {
    if (!/PAIRES_CUISSON\[ing\.name\]/.test(mc)) soucis.push('la ligne ne cherche plus son jumeau');
    if (!/remplacerAliment\(repasId, ing\.id, paire\.autre\)/.test(mc)) soucis.push('la bascule ne change plus d\'entree');
    // Les deux bascules ne doivent jamais s'afficher ensemble.
    if (!/const paire = fc \? null : PAIRES_CUISSON/.test(mc)) soucis.push('les deux bascules peuvent s\'afficher sur la meme ligne');
  }
  if (soucis.length) faute('R64 bascule cru/cuit', soucis.join(' ; '));
  else passe('R64 bascule cru/cuit');
}

// ------------------------------------------------------------
// R65 — Aucun bloc ne s'affiche pour dire qu'il est vide.
// Mesure du 26/08 : « Seances enregistrees » occupait 119 px de haut
// pour annoncer qu'il n'y avait rien a montrer, juste sous un bouton
// « Seance libre » qui proposait deja d'en creer une.
// ------------------------------------------------------------
{
  const soucis = [];
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  if (ent && /<BlocSeances/.test(ent)) {
    soucis.push('l\'encart « Seances enregistrees » est revenu en tete de S\'entrainer');
  }
  const seDet = lire('app-v2/src/components/Seances.jsx');
  if (seDet && /class="det-suppr"/.test(seDet)) {
    soucis.push('la suppression est revenue dans le detail d\'une seance : la faille se deplace, elle ne se ferme pas');
  }
  const se = lire('app-v2/src/components/Seances.jsx');
  if (se && /export function BlocSeances/.test(se)) {
    soucis.push('le composant de l\'encart a ete recree : il finira par etre rebranche');
  }
  if (soucis.length) faute('R65 pas de bloc vide', soucis.join(' ; '));
  else passe('R65 pas de bloc vide');
}

// ------------------------------------------------------------
// R66 — Le calendrier reste tapable au doigt.
// Mesure du 26/08 : les cases faisaient 38 px, la norme tactile est
// 44. Sur 324 px de large, sept colonnes n'y arrivent qu'en
// resserrant les gouttieres horizontales a 2 px — (324 - 12) / 7 =
// 44,5. Le max-width de la case est le plafond a surveiller : le
// remettre a 38 annulerait tout sans rien casser de visible.
// ------------------------------------------------------------
{
  const css = lire('app-v2/src/legacy/entrainer.scoped.css');
  const soucis = [];
  if (css) {
    const cell = (css.match(/\.wlog-cell\{[^}]*\}/) || [''])[0];
    const mw = (cell.match(/max-width:(\d+)px/) || [])[1];
    if (!mw || Number(mw) < 44) soucis.push('la case du calendrier repasse sous 44 px (max-width ' + (mw || '?') + ')');
    const grille = (css.match(/\.wlog-grid\{[^}]*\}/) || [''])[0];
    const gap = (grille.match(/gap:\d+px (\d+)px/) || [])[1];
    if (!gap || Number(gap) > 2) soucis.push('la gouttiere horizontale depasse 2 px : les cases ne tiennent plus a 44');
    // Le badge doit pouvoir accueillir deux caracteres (« +3 ») :
    // une largeur fixe le recouperait.
    const more = (css.match(/\.pg-entrainer \.wlog-more\{[^}]*\}/) || [''])[0];
    if (!/min-width:\d+px/.test(more)) soucis.push('le badge du jour multi-muscles a une largeur fixe : « +3 » y serait coupe');
    const dot = (css.match(/\.wlog-legende \.dot\{[^}]*\}/) || [''])[0];
    const d = (dot.match(/width:(\d+)px/) || [])[1];
    if (!d || Number(d) < 12) soucis.push('les pastilles de legende sont redescendues sous 12 px');
  }
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  if (ent && !/wlog-more">\+\{muscles\.length - 1\}/.test(ent)) {
    soucis.push('le badge ne dit plus combien de muscles ne sont pas montres');
  }
  if (ent && /conic-gradient\(\$\{COULEUR/.test(ent)) {
    soucis.push('le demi-disque a deux couleurs est revenu');
  }
  if (soucis.length) faute('R66 calendrier tapable', soucis.join(' ; '));
  else passe('R66 calendrier tapable');
}

// ------------------------------------------------------------
// R67 — Le chiffre reste lisible sur son disque.
// Mesure du 26/08 : le chiffre etait blanc sur les dix couleurs. Sur
// le jaune des epaules, 1,82 de contraste — illisible. Le chiffre
// sombre y donne 10,06. On ne repeint pas la palette (c'est
// l'identite du calendrier et de la legende), on choisit le texte par
// la luminance. Cette regle recalcule les dix paires : une couleur
// ajoutee demain sans verification serait attrapee ici.
// ------------------------------------------------------------
{
  const st = lire('app-v2/src/store/entrainement.js');
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  const soucis = [];
  if (st) {
    if (!/export function texteSur/.test(st)) soucis.push('le choix du texte par luminance a disparu');
    const lum = (hex) => {
      const v = (i) => parseInt(hex.slice(i, i + 2), 16) / 255;
      const f = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
      return 0.2126 * f(v(1)) + 0.7152 * f(v(3)) + 0.0722 * f(v(5));
    };
    const faibles = [];
    for (const m of st.matchAll(/c: '(#[0-9A-Fa-f]{6})'/g)) {
      const l = lum(m[1]);
      const meilleur = Math.max(1.05 / (l + 0.05), (l + 0.05) / 0.0575);
      if (meilleur < 4.5) faibles.push(m[1] + ' (' + meilleur.toFixed(2) + ')');
    }
    if (faibles.length) soucis.push('couleur(s) illisibles quel que soit le texte pose dessus : ' + faibles.join(', '));
  }
  if (ent && !/color: texteSur\(c\)/.test(ent)) soucis.push('le calendrier repose un chiffre blanc sur toutes les couleurs');
  // Stats redeclare la palette de son cote : les deux doivent
  // s'accorder, sinon un muscle change de couleur d'un onglet a
  // l'autre.
  const stt = lire('app-v2/src/components/Stats.jsx');
  if (st && stt) {
    for (const m of st.matchAll(/k: '(\w+)',\s*label: '[^']*',\s*c: '(#[0-9A-Fa-f]{6})'/g)) {
      const dansStats = new RegExp(m[1] + ": '(#[0-9A-Fa-f]{6})'").exec(stt);
      if (dansStats && dansStats[1].toUpperCase() !== m[2].toUpperCase()) {
        soucis.push(m[1] + ' : ' + m[2] + ' dans le calendrier, ' + dansStats[1] + ' dans Stats');
      }
    }
  }
  if (soucis.length) faute('R67 lisibilite des disques', soucis.join(' ; '));
  else passe('R67 lisibilite des disques');
}

// ------------------------------------------------------------
// R68 — On peut planifier au-dela du mois courant.
// Raci, 26/08 : « je peux pas programmer une seance pour le mois
// prochain ». La fleche droite du calendrier s'eteignait des le mois
// courant : le passe etait bride volontairement (deux semaines), mais
// l'avenir l'etait par accident, alors que c'est justement la qu'on
// planifie. Douze mois d'avance, borne pour qu'un appui repete ne
// parte pas a l'infini.
// ------------------------------------------------------------
{
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  const soucis = [];
  if (ent) {
    if (/\(offset === 0 \? ' off' : ''\)/.test(ent)) soucis.push('le calendrier se referme de nouveau sur le mois courant');
    if (!/const apresBorne = offset >= \d+;/.test(ent)) soucis.push('la borne avant a disparu');
    if (!/if \(!apresBorne\) setOffset\(offset \+ 1\)/.test(ent)) soucis.push('la fleche droite n\'avance plus');
    // Elle porte une action que sa jumelle n'a pas : planifier.
    if (!/wlog-nav wlog-nav--avant/.test(ent)) soucis.push('la fleche du mois suivant a perdu sa distinction');
  }
  const cssE = lire('app-v2/src/legacy/entrainer.scoped.css');
  if (cssE && !/\.wlog-nav--avant\{/.test(cssE)) {
    soucis.push('la fleche du mois suivant ressemble de nouveau a celle du passe');
  }
  // Les rubriques doivent respirer entre elles.
  const css = lire('app-v2/src/styles/entrainer-carte.css');
  if (css) {
    const m = (css.match(/\.pg-entrainer--carte \.ent-bloc \{ margin-bottom: (\d+)px/) || [])[1];
    if (!m || Number(m) < 22) soucis.push('les rubriques se recollent (margin ' + (m || '?') + 'px)');
  }
  if (soucis.length) faute('R68 planifier a l\'avance', soucis.join(' ; '));
  else passe('R68 planifier a l\'avance');
}

// ------------------------------------------------------------
// R69 — Aucun bouton ne promet ce qu'il ne peut pas tenir.
// Raci, 26/08 (capture entouree) : « comment je fais pour programmer
// une seance ? ». « Programmer une seance ce jour-la » ouvrait un
// panneau qui repondait « cree d'abord un programme » — deux appuis
// pour arriver a un mur, sans dire ou aller ensuite. Sans programme,
// le bouton mene desormais aux quatre questions, et rappelle qu'on
// peut aussi programmer un jour en cochant ses muscles.
// ------------------------------------------------------------
{
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  const soucis = [];
  if (ent) {
    if (/ml_pas_de_prog/.test(ent)) soucis.push('le cul-de-sac « cree d\'abord un programme » est revenu');
    // Raci, 26/08 : « Ou trouver un programme complet, ca ne veut rien
    // dire » — retire de la fiche. « Trouver mon programme » vit sur
    // l'accueil, la fiche d'un jour n'a pas a le repeter.
    if (/ml_prog_dabord|ml_ou_cocher/.test(ent)) {
      soucis.push('le renvoi vers le questionnaire est revenu dans la fiche d\'un jour');
    }
    if (!/!sessionsLibres\.length \? null/.test(ent)) {
      soucis.push('la fiche propose de nouveau quelque chose alors qu\'il n\'y a aucune seance a poser');
    }
    if (!/const sessionsLibres = sessionsProgramme\.filter/.test(ent)) {
      soucis.push('le choix reproposait des seances deja posees un autre jour : elles seraient sur deux jours');
    }
    // Raci, 26/08 : « si j'ai envie de decider que tel jour je fais tel
    // muscle ». Les pastilles enregistrent des le tap, mais rien ne le
    // disait. Le recapitulatif nomme ce qui est retenu.
    // Raci a corrige le 26/08 : ce n'est pas un resume, c'est
    // l'action. Elle nomme ce qu'elle programme et remplace
    // « Enregistrer », qui ne faisait que refermer la fiche — deux
    // boutons pour le meme geste.
    // Raci, 5/09 : « Confirmer suffit ». « Programmer cette seance »
    // apparaissait des la premiere pastille, juste au-dessus de
    // « Confirmer », et les deux refermaient la fiche. Deux boutons
    // pour un seul geste — le meme defaut qu'« Enregistrer » en aout.
    if (/class="ml-prog-seance"/.test(ent)) {
      soucis.push('« Programmer cette seance » est revenu : il double « Confirmer »');
    }
    // A quatre groupes, l'enumeration passait sur deux lignes et
    // deformait le bouton : on nomme les deux premiers, on compte le
    // reste.
    if (!/function resumeMuscles\(cles\)/.test(ent)) soucis.push('le resume des muscles choisis a disparu');
    // « Enregistrer » a ete supprime : il ne faisait que refermer, ce
    // que « Retour » fait deja. Et « Effacer » n'apparait que s'il y a
    // quelque chose a effacer.
    if (/class="ml-save"/.test(ent)) soucis.push('« Enregistrer » est revenu : il double « Retour »');
    // Raci, 5/09 : « Effacer » retire pour de bon. Il refermait la
    // fiche apres avoir tout decoche, alors que les pastilles se
    // decochent une a une sans quitter l'ecran. La sortie est une
    // rangee de deux : « Retour » et « Confirmer ».
    if (/class="ml-clear"/.test(ent)) soucis.push('« Effacer » est revenu dans la fiche d\'un jour');
    if (!/class="ml-sortie"/.test(ent)) soucis.push('la rangee de sortie « Retour / Confirmer » a disparu');
    if (!/class="ml-confirmer"/.test(ent)) soucis.push('« Confirmer » a disparu a cote de « Retour »');

  }
  if (soucis.length) faute('R69 pas de promesse vide', soucis.join(' ; '));
  else passe('R69 pas de promesse vide');
}

// ------------------------------------------------------------
// R70 — Aucune page ne colle sa sortie contre la barre d'etat.
// Raci, 26/08 : « une fois qu'il me donne le choix de quel muscle
// pour quel jour, je ne peux plus revenir en arriere, je suis oblige
// de choisir ». La fleche etait bien la, visible — mais calee a y=0,
// donc sous la barre d'etat d'Android, hors d'atteinte du doigt.
// L'ecran paraissait sans issue. Toute page qui pose une sortie en
// haut doit reserver env(safe-area-inset-top).
// ------------------------------------------------------------
{
  const pages = [
    ['pg-planifier', 'app-v2/src/styles/entrainer-carte.css'],
    ['pg-programmes', 'app-v2/src/legacy/programmes.scoped.css'],
  ];
  const soucis = [];
  for (const [cls, f] of pages) {
    const css = lire(f); if (!css) continue;
    const bloc = (css.match(new RegExp('\\.' + cls + '\\s*\\{[^}]*\\}')) || [''])[0];
    if (!/safe-area-inset-top/.test(bloc)) {
      soucis.push('.' + cls + ' ne reserve pas la barre d\'etat : sa fleche de retour sera hors d\'atteinte');
    }
  }
  if (soucis.length) faute('R70 sortie atteignable', soucis.join(' ; '));
  else passe('R70 sortie atteignable');
}

// ------------------------------------------------------------
// R71 — L'ecran de placement se quitte, et previent avant.
// Raci, 26/08 : « je ne peux plus revenir en arriere, je suis oblige
// de choisir ». Le disque de 40 px se confondait avec le fond et se
// calait sous la barre d'etat. Il porte maintenant son mot. Et sortir
// apres avoir place quelque chose demande confirmation — mais pas si
// rien n'a ete touche : une question posee pour rien en est une de
// trop.
// ------------------------------------------------------------
{
  const pl = lire('app-v2/src/components/PlanifierProgramme.jsx');
  const css = lire('app-v2/src/styles/entrainer-carte.css');
  const soucis = [];
  if (pl) {
    if (!/class="pl-retour"/.test(pl)) soucis.push('l\'ecran n\'a plus de sortie visible');
    if (!/ml_retour/.test(pl)) soucis.push('la sortie a perdu son mot : un disque nu passait inapercu');
    if (!/touche \? setQuitter\(true\) : retourEntrainer\(\)/.test(pl)) {
      soucis.push('la sortie ne distingue plus « rien touche » de « placement en cours »');
    }
    if (!/setTouche\(true\)/.test(pl)) soucis.push('poser une seance ne marque plus l\'ecran comme modifie');
  }
  if (css) {
    if (!/\.pg-planifier \.pl-conf-oui/.test(css)) soucis.push('la confirmation retombe aux boutons bruts du navigateur');
  }
  // Aucune sortie ne se reduit a un chevron nu : Raci ne les trouvait
  // pas, trois fois de suite. Elles portent toutes leur mot.
  for (const f of ['app-v2/src/components/SelectionExercices.jsx',
                   'app-v2/src/components/Programmes.jsx',
                   'app-v2/src/components/PlanifierProgramme.jsx']) {
    const c = lire(f);
    if (!c) continue;
    for (const m of c.matchAll(/<button class="(back-btn|v2-retour|pl-retour)"[^>]*>([\s\S]{0,60}?)<\/button>/g)) {
      if (!/ml_retour|Retour/.test(m[2])) soucis.push(f.split('/').pop() + ' : une sortie est reduite a un chevron nu');
    }
  }
  const st = lire('app-v2/src/styles.css');
  if (st && !/\.v2-retour--mot, \.back-btn\{/.test(st)) soucis.push('les sorties ont perdu leur style commun');
  if (soucis.length) faute('R71 quitter le placement', soucis.join(' ; '));
  else passe('R71 quitter le placement');
}

// ------------------------------------------------------------
// R72 — Un code Premium se verifie au serveur, jamais dans la page.
// La V1 portait JETAIME et BELFIT1 en clair dans le JS public de
// plans.html : n'importe qui lisant la source s'offrait l'abonnement.
// Le code part maintenant vers utiliserCode, qui ouvre une transaction
// sur codesPremium/{CODE} et n'ecrit premium qu'en admin — meme
// chemin que les webhooks de paiement. La collection est fermee au
// client : lisible, elle se laisserait enumerer.
// ------------------------------------------------------------
{
  const pp = lire('app-v2/src/components/PremiumPage.jsx');
  const fn = lire('functions/index.js');
  const rules = lire('firestore.rules');
  const soucis = [];
  if (pp) {
    if (!/utiliserCode/.test(pp)) soucis.push('la page n\'appelle plus la verification serveur');
    // Un code en dur dans le composant = la faille de la V1, reprise.
    const bloc = (pp.match(/function ChampCode\(\)[\s\S]*?\n\}/) || [''])[0];
    if (/===\s*'[A-Z0-9]{4,}'|includes\('[A-Z0-9]{4,}'\)/.test(bloc)) {
      soucis.push('un code est compare dans le navigateur : il serait lisible dans la source');
    }
  }
  if (fn) {
    if (!/exports\.utiliserCode/.test(fn)) soucis.push('la fonction utiliserCode a disparu');
    const f = (fn.match(/exports\.utiliserCode[\s\S]*?\n\);/) || [''])[0];
    if (!/runTransaction/.test(f)) soucis.push('l\'usage unique n\'est plus garanti par une transaction');
    if (!/verifyIdToken/.test(f)) soucis.push('le code s\'utilise sans compte connecte');
    if (!/utilise: true/.test(f)) soucis.push('le code n\'est plus marque comme consomme');
  }
  if (rules && !/match \/codesPremium\/\{code\}[\s\S]{0,80}?allow read, write: if false;/.test(rules)) {
    soucis.push('la collection des codes n\'est plus fermee au client');
  }
  if (soucis.length) faute('R72 code premium', soucis.join(' ; '));
  else passe('R72 code premium');
}

// ------------------------------------------------------------
// R73 — La periode de test ouverte s'annonce, et s'ouvre des deux
// cotes a la fois.
// Un acces gratuit pour tous ne doit pas se decouvrir six mois plus
// tard dans un fichier oublie : tant qu'il est ouvert, l'audit le
// rappelle a chaque build. Et l'interface et le serveur doivent porter
// la meme valeur — sinon l'app promet le micro et le serveur repond
// 403, ou l'inverse : Gemini facture des comptes gratuits.
// ------------------------------------------------------------
{
  const cli = lire('app-v2/src/acces-libre.js');
  const srv = lire('functions/index.js');
  const soucis = [];
  const vCli = cli && /export const PREMIUM_OUVERT = (true|false);/.exec(cli);
  const vSrv = srv && /^const PREMIUM_OUVERT = (true|false);/m.exec(srv);
  if (!vCli) soucis.push('l\'interrupteur de l\'interface a disparu');
  if (!vSrv) soucis.push('l\'interrupteur du serveur a disparu');
  if (vCli && vSrv && vCli[1] !== vSrv[1]) {
    soucis.push('interface ' + vCli[1] + ' mais serveur ' + vSrv[1] + ' : le micro et la photo ne suivront pas');
  }
  const pp = lire('app-v2/src/components/PremiumPage.jsx');
  if (pp && !/if \(PREMIUM_OUVERT \|\| dejaPremium\)/.test(pp)) {
    soucis.push('la page de vente reste affichee alors que tout est offert');
  }
  if (soucis.length) faute('R73 periode de test', soucis.join(' ; '));
  else if (vCli && vCli[1] === 'true') {
    signale('R73 periode de test', 'ACCES COMPLET OUVERT A TOUS — pensez a refermer avant le lancement, et a verifier l\'alerte de budget Firebase (Gemini est facture a chaque scan, vocal et photo).');
  } else passe('R73 periode de test');
}

// ------------------------------------------------------------
// R74 — retiree.
// v537 (Raci, 20/09) : « suppression du mode invite ». Cette regle
// protegeait l'entree sans compte ; elle est retiree par decision.
// Le compte devient obligatoire — ce qui ferme aussi la perte de
// donnees du 12/09, quand un vidage de cache avait tout efface
// faute de copie dans le cloud.
// ------------------------------------------------------------

// ------------------------------------------------------------
// R75 — Les pastilles non selectionnees restent visibles.
// Raci, 26/08 : « trop fantomes ». La bordure etait a
// rgba(28,24,18,.055) sur fond blanc, soit 1,12 de contraste : elle
// n'existait pas a l'ecran, et les mots flottaient sans forme. Une
// pastille qu'on ne voit pas ne se lit pas comme un bouton.
// ------------------------------------------------------------
{
  const soucis = [];
  const lum = (hex) => {
    const v = (i) => parseInt(hex.slice(i, i + 2), 16) / 255;
    const f = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * f(v(1)) + 0.7152 * f(v(3)) + 0.0722 * f(v(5));
  };
  const surBlanc = (a) => {
    // rgba(28,24,18,alpha) fondu sur blanc
    const m = (c) => Math.round(c * a + 255 * (1 - a));
    const hex = '#' + [28, 24, 18].map(c => m(c).toString(16).padStart(2, '0')).join('');
    return 1.05 / (lum(hex.toUpperCase()) + 0.05);
  };
  for (const f of ['app-v2/src/legacy/entrainer.scoped.css', 'app-v2/src/legacy/stats.scoped.css']) {
    const css = lire(f); if (!css) continue;
    const bloc = (css.match(/\.ml-chip\{[^}]*\}/) || [''])[0];
    if (!bloc) continue;
    const a = (bloc.match(/border:[^;]*rgba\(28,\s*24,\s*18,\s*\.(\d+)\)/) || [])[1];
    if (!a) { soucis.push(f.split('/').pop() + ' : bordure de pastille illisible dans la feuille'); continue; }
    const c = surBlanc(Number('0.' + a));
    if (c < 1.5) soucis.push(f.split('/').pop() + ' : bordure des pastilles a ' + c.toFixed(2) + ', invisible sur le fond');
  }
  const ce = lire('app-v2/src/legacy/entrainer.scoped.css');
  if (ce) {
    // « Repos » ne s'etire plus sur toute la largeur : seul sur sa
    // ligne, il se lisait comme un bouton d'action.
    if (/\.ml-chip\.repos\{[^}]*grid-column:1 \/ -1/.test(ce)) {
      soucis.push('« Repos » est de nouveau etire seul sur sa ligne');
    }
  }
  // Texte des pastilles selectionnees : choisi par luminance, pas
  // blanc partout (1,82 sur le jaune des epaules).
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  if (ent && !/borderColor: g\.c, color: texteSur\(g\.c\)/.test(ent)) {
    soucis.push('le texte des pastilles selectionnees redevient blanc sur toutes les couleurs');
  }
  // Titres de section en casse normale : en capitales espacees ils
  // criaient plus fort que la question qu'ils posent (Raci, 26/08).
  const cc = lire('app-v2/src/styles/entrainer-carte.css');
  if (cc) {
    const bloc = (cc.match(/\.ml-groups-titre \{[^}]*\}/) || [''])[0];
    if (/text-transform: uppercase/.test(bloc)) soucis.push('le titre des muscles repasse tout en capitales');
  }
  if (soucis.length) faute('R75 pastilles visibles', soucis.join(' ; '));
  else passe('R75 pastilles visibles');
}

// ------------------------------------------------------------
// R76 — Les etiquettes de la fiche « Mes besoins » se lisent.
// Raci, 26/08 : « la presentation est trop formulaire administratif ».
// « POIDS (KG) » en capitales espacees a 11 px se lit moins bien que
// « Poids (kg) » a 12,5. Les textes sont ecrits proprement dans le
// JSX ; c'etait la feuille qui les mettait en majuscules. Aucun champ
// n'est retire : ils servent tous au calcul.
// ------------------------------------------------------------
{
  const css = lire('app-v2/src/styles.css');
  const jsx = lire('app-v2/src/components/TdeeCalculator.jsx');
  const soucis = [];
  if (css) {
    const bloc = (css.match(/\.calc-grille label\{[^}]*\}/) || [''])[0];
    if (/text-transform:uppercase/.test(bloc)) soucis.push('les etiquettes repassent en capitales');
    const t = (bloc.match(/font-size:([\d.]+)px/) || [])[1];
    if (!t || Number(t) < 12) soucis.push('les etiquettes redescendent sous 12 px');
  }
  // Les six champs restent, mais deux sont replies : les cacher ne les
  // neutralise pas, le calcul continue de les lire.
  for (const champ of ['f.sexe', 'f.age', 'f.poids', 'f.taille', 'f.activiteBase', 'f.ajustement']) {
    if (jsx && !jsx.includes(champ)) soucis.push('l\'entree « ' + champ + ' » a disparu du calcul');
  }
  if (jsx) {
    // Les deux champs avances existent toujours, sous forme de
    // pastilles : « % gras » et « seances / sem. ».
    for (const [cle, nom] of [['f.masseGrasse', 'masse grasse'], ['f.joursEntrainement', 'jours d\'entrainement']]) {
      if (!jsx.includes(cle)) soucis.push('le champ avance « ' + nom + ' » a ete supprime au lieu d\'etre replie');
    }
    if (!/\{avance && \(/.test(jsx)) soucis.push('les options avancees ne sont plus repliees');
    if (!/useState\(false\)/.test(jsx)) soucis.push('les options avancees s\'ouvrent par defaut');
    if (!/partDe\(r\.prot \* 4, r\.kcal\)/.test(jsx)) soucis.push('les macros ont perdu leur part en pourcentage');
  }
  // Maquette A (Raci, 02/09) : le resultat en tete, les entrees en
  // pastilles. L'ancienne grille etiquetee se lisait comme un
  // formulaire administratif.
  if (jsx) {
    if (!/class="bs-hero"/.test(jsx)) soucis.push('la carte de resultat en tete a disparu');
    // La couronne montre le RAPPORT des macros, que trois chiffres
    // alignes ne donnaient pas (maquette C, 9/09).
    if (!/function Anneau\(/.test(jsx)) soucis.push('la couronne des macros a disparu');
    // Raci, 9/09 : « un bouton Calculer, et ensuite appliquer aux
    // objectifs ». Le resultat se recalculait a chaque frappe, ce qui
    // faisait sauter la fiche.
    if (!/class="calc-lancer"/.test(jsx)) soucis.push('« Calculer mes besoins » a disparu : le resultat redevient permanent');
    if ((jsx.match(/class="bs-hero"/g) || []).length > 1) {
      soucis.push('le bloc de resultat est de nouveau en double : un anneau s\'affichera avant tout calcul');
    }
    // L'objectif commande le signe de l'ajustement et la repartition
    // des macros : il se demande avant le reste.
    const iObj = jsx.indexOf('>Ton objectif<');
    const iQuo = jsx.indexOf('>Au quotidien, hors sport<');
    const iSport = jsx.indexOf('>Du sport ?<');
    if (iObj < 0 || iQuo < 0 || iSport < 0) {
      soucis.push('un des trois groupes de questions a disparu');
    } else if (!(iObj < iQuo && iQuo < iSport)) {
      soucis.push('l\'ordre des questions a change : l\'objectif doit venir en premier');
    }
    if (!/setCalcule\(false\)/.test(jsx)) {
      soucis.push('modifier une valeur ne retire plus le resultat : il resterait calcule sur d\'anciennes entrees');
    }
    if (!/\(mode === 'manuel' \|\| calcule\)/.test(jsx)) {
      soucis.push('« Appliquer » s\'offre avant qu\'un chiffre existe');
    }
    // Les deux modes doivent porter LES MEMES teintes : sinon on croit
    // que les proportions ont change alors qu'elles n'ont pas bouge.
    if ((jsx.match(/var\(--mac-prot\)/g) || []).length < 2) {
      soucis.push('les deux modes n\'utilisent plus les memes teintes de macro');
    }
    if (!/kp \/ tot, kg \/ tot, kl \/ tot/.test(jsx)) {
      soucis.push('les segments ne sont plus proportionnels aux calories : 100 g de lipides pesent double');
    }
    if (/>\s*P×4 \+ G×4 \+ L×9/.test(jsx)) {
      soucis.push('la formule de tableur est revenue sous les champs');
    }
    if (!/class="bs-pastilles"/.test(jsx)) soucis.push('les entrees sont redevenues des champs etiquetes');
    if (/mode === 'calc' && \(\s*<div class="calc-res">/.test(jsx)) soucis.push('l\'ancien bloc de resultats est revenu sous les champs');
  }
  if (css) {
    const p = (css.match(/^\.bs-p\{[^}]*\}/m) || [''])[0];
    if (!/min-height:44px/.test(p)) soucis.push('les pastilles passent sous la cible tactile de 44 px');
    // Une surcharge de hauteur ailleurs annulerait la cible sans que
    // la regle ci-dessus le voie.
    for (const m of css.matchAll(/\.bs-p\b[^{}]*\{([^}]*)\}/g)) {
      const h = (m[1].match(/min-height:\s*(\d+)px/) || [])[1];
      if (h && +h < 44) soucis.push('une surcharge ramene les pastilles a ' + h + ' px');
    }
    if (/\.modale-calc\{background:#1C1812/.test(css)) {
      soucis.push('la fiche est repassee en sombre : le rendu que Raci a refuse le 9/09');
    }
    // La feuille est a `padding-bottom:0` : la barre collee fournit sa
    // marge. Avant le calcul cette barre n'existe pas, donc le bouton
    // doit porter la sienne — sinon il tombe a ras de l'arrondi.
    if (!/\.calc-lancer\{[^}]*margin-bottom:calc\(14px/.test(css)) {
      soucis.push('« Calculer mes besoins » n\'a plus sa marge basse : il se superposera au bord de la carte');
    }
    if (!/\.voile--fonce\{background:rgba\(12,10,8,\.62\)/.test(css)) {
      soucis.push('le voile a perdu son assombrissement : la fiche claire flotte dans du creme');
    }
    if (!/\.bs-anneau\{/.test(css)) soucis.push('la couronne des macros a perdu son style');
    if (!/--mac-prot:/.test(css)) soucis.push('les teintes par macro ont disparu : l\'anneau devient illisible');
    // Les menus sont en appearance:none : sans le chevron dessine,
    // rien n'indique qu'ils s'ouvrent. Un « background: » en raccourci
    // pose apres la regle du chevron l'efface silencieusement.
    if (/\.calc-grille input,\.calc-grille select\{[^}]*[^-]background:/.test(css)) {
      soucis.push('un fond en raccourci efface le chevron des menus du mode manuel');
    }
    if (!/\.bs-p--menu::after/.test(css)) soucis.push('les pastilles-menu n\'annoncent plus qu\'elles s\'ouvrent');
    // Le bouton reste colle en bas : sur les petits ecrans le contenu
    // depasse encore, il ne doit pas partir avec le defilement.
    if (!/\.calc-barre\{position:sticky/.test(css)) soucis.push('le bouton « Appliquer » n\'est plus colle en bas');
    if (!/@media \(min-height: 780px\)[\s\S]{0,320}?\.modale-calc\{[\s\S]{0,200}?top:32px/.test(css)) {
      soucis.push('la fiche est recentree verticalement : elle sautera de nouveau a chaque changement de hauteur');
    }
    if (/\.modale-calc\{[^}]*translate\(0,-50%\)/.test(css)) {
      soucis.push('le centrage par translate(-50%) est revenu');
    }
    const cible = (css.match(/\.calc-res-ligne\.cible strong\{[^}]*\}/) || [''])[0];
    const t = (cible.match(/font-size:(\d+)px/) || [])[1];
    if (!t || Number(t) < 22) soucis.push('l\'objectif ne ressort plus du bloc de resultats');
  }
  // Le formulaire doit rouvrir sur les valeurs saisies : initialise en
  // dur a 75 kg, il repartait de zero a chaque ouverture et une
  // correction fermee sans appliquer etait perdue (Raci, 02/09).
  if (jsx) {
    if (!/\.\.\.\(profilBesoins\.value \|\| \{\}\)/.test(jsx)) soucis.push('le formulaire ne rouvre plus sur les valeurs saisies');
    if (!/profilBesoins\.value = \{ \.\.\.f \}/.test(jsx)) soucis.push('le formulaire n\'est plus enregistre a l\'application');
    // Une saisie aberrante doit se signaler : 147 kg au lieu de 97
    // donnaient 324 g de proteines sans un mot.
    if (!/class="calc-alerte"/.test(jsx)) soucis.push('une saisie aberrante ne s\'annonce plus');
    // Un objectif calorique sans aucune macro n'est pas un objectif :
    // le Journal affichait « 218g / 0g » et plus une seule barre.
    if (!/const macrosVides = mode === 'manuel'/.test(jsx)) soucis.push('un objectif sans macros peut de nouveau etre applique');
    if (!/disabled=\{macrosVides\}/.test(jsx)) soucis.push('le bouton reste actif alors qu\'il ecrirait des macros a zero');
    if (!/if \(macrosVides\) return;/.test(jsx)) soucis.push('le garde-fou n\'existe que dans le bouton, pas dans l\'action');
    // Un rapport degenere (une macro a zero) mettait toutes les
    // calories sur la seule qui restait : 3500 kcal -> 389 g de
    // lipides. « Repartir » doit repartir du socle dans ce cas, et
    // rester atteignable.
    if (!/const degenere = base <= 0 \|\| \[o\.prot, o\.carbs, o\.lip\]/.test(jsx)) {
      soucis.push('un rapport degenere n\'est plus rattrape : une seule macro portera toutes les calories');
    }
    if (!/\{kcalVise > 0 && \(\s*\n?\s*<div class="calc-accorder">/.test(jsx)) {
      soucis.push('« Repartir » redevient conditionnel : il disparaitra des que les macros tombent juste');
    }
    if (/const REPARTITIONS = \[/.test(jsx)) {
      soucis.push('le choix d\'objectif est revenu dans « Repartir » : il en refait une question');
    }
    if (!/class="ac-fort" onClick=\{repartir\}/.test(jsx)) {
      soucis.push('« Repartir » ne repartit plus directement');
    }
    if (/class="calc-alerte">Renseigne au moins/.test(jsx)) soucis.push('le message du bas est revenu sous le bouton');
  }
  if (css) {
    if (!/\.calc-accorder \.ac-fort\{/.test(css)) soucis.push('« Repartir » a perdu son poids visuel');
    const seuil = (jsx.match(/partProt > (0\.\d+)/) || [])[1];
    if (!seuil || Number(seuil) > 0.30) soucis.push('le seuil d\'alerte sur les proteines est trop haut : le cas reel a 34 % passerait');
  }
  const jn = lire('app-v2/src/store/journal.js');
  if (jn && !/profilBesoins: profilBesoins\.value/.test(jn)) {
    soucis.push('le profil des besoins n\'est plus sauvegarde avec le journal');
  }
  if (soucis.length) faute('R76 etiquettes des besoins', soucis.join(' ; '));
  else passe('R76 etiquettes des besoins');
}

// ------------------------------------------------------------
// R78 — La fiche d'un jour ne deroule pas les exercices.
// Raci, 5/09 : sur le 5 septembre, cinq seances empilees — quatre
// « Jour 2 » et un « Jour 4 » — chacune deroulant jusqu'a six
// exercices, chacune marquee « 1 min ». « C'est a ne rien comprendre.
// Ca ne doit plus jamais apparaitre. » Une ligne par seance, un
// bouton « Voir la seance » qui ouvre son detail. La duree ne
// s'affiche plus ici : sur des essais d'une minute elle brouille au
// lieu d'informer.
// ------------------------------------------------------------
{
  const ent = lire('app-v2/src/components/Entrainer.jsx');
  if (ent) {
    const soucis = [];
    const i = ent.indexOf('function ModaleMuscles');
    const bloc = i >= 0 ? ent.slice(i, ent.indexOf('\nfunction ', i + 10)) : ent;
    if (/class="ml-fait-e"/.test(bloc)) {
      soucis.push('les exercices sont de nouveau deroules sous chaque seance');
    }
    if (/class="ml-fait-d"/.test(bloc)) {
      soucis.push('la duree « 1 min » est revenue a cote du titre de la seance');
    }
    if (/class="ml-fait-voir"/.test(bloc)) {
      soucis.push('le bouton « Voir la seance » pleine largeur est revenu : trois lignes par seance');
    }
    if (!/class="ml-fait-ouvrir"/.test(bloc)) {
      soucis.push('la ligne d\'une seance n\'ouvre plus son detail');
    }
    if (/class="ml-fait-x"/.test(bloc)) {
      soucis.push('la croix de suppression est revenue : une seance faite redeviendrait non faite');
    }
    if (soucis.length) faute('R78 fiche d\'un jour sans liste', soucis.join(' ; '));
    else passe('R78 fiche d\'un jour sans liste');
  }
}

// ------------------------------------------------------------
// R79 — La seance se deroule, elle ne se coche pas.
// Raci, 5/09 : « Demarrer la seance fera demarrer la seance en
// partant du principe que l'utilisateur est au sport et qu'il veut
// commencer. Et pour chaque serie tu feras en sorte qu'il puisse
// faire suivant suivant suivant jusqu'a l'exercice suivant. »
// La liste a cocher demandait de se souvenir apres coup de ce qu'on
// avait fait ; le deroule avance avec la seance. Ce qui doit tenir :
// un seul bouton, un enregistrement en fin de parcours seulement, et
// une reprise si l'on quitte l'ecran au milieu.
// ------------------------------------------------------------
{
  const sg = lire('app-v2/src/components/SeanceGuidee.jsx');
  const main = lire('app-v2/src/main.jsx');
  const css = lire('app-v2/src/styles/seance-guidee.css');
  const soucis = [];
  if (!sg) soucis.push('l\'ecran de seance guidee a disparu');
  else {
    if (!/const suivant = \(\) => \{/.test(sg)) soucis.push('« Suivant » ne valide plus la serie');
    if (!/setRepos\(reposPour\(/.test(sg)) soucis.push('le repos ne se declenche plus entre deux series');
    // Raci, 5/09 : « le chrono apparait sur la MEME page et je peux
    // l'arreter a n'importe quel moment, en plus de pouvoir le
    // prolonger ou le raccourcir ». Il occupait tout l'ecran et
    // cachait l'exercice en cours.
    if (/repos > 0 \? \(/.test(sg)) soucis.push('le repos reprend tout l\'ecran au lieu d\'un bandeau');
    if (!/\{repos > 0 && \(/.test(sg)) soucis.push('le bandeau de repos a disparu');
    if (!/class="sg-repos-x"/.test(sg)) soucis.push('le repos ne peut plus etre arrete');
    // Raci, 5/09 : « je veux pouvoir revenir sur une serie quelconque
    // pour modifier charge et/ou reps, mais elle ne doit plus pouvoir
    // se relancer si elle a deja ete faite ».
    if (!/const enCorrection = iSerie < faites\.length/.test(sg)) {
      soucis.push('on ne distingue plus une serie relue d\'une serie a faire');
    }
    if (!/const corriger = \(\) => \{/.test(sg)) soucis.push('une serie posee ne peut plus etre corrigee');
    if (!/onClick=\{enCorrection \? corriger : suivant\}/.test(sg)) {
      soucis.push('revenir sur une serie deja faite la relancerait');
    }
    if (!/setRepos\(r => r \+ 30\)/.test(sg) || !/setRepos\(r => Math\.max\(1, r - 30\)\)/.test(sg)) {
      soucis.push('le repos ne peut plus etre prolonge ni raccourci');
    }
    // La seance ne s'ecrit qu'a la fin : tant qu'on n'y est pas, elle
    // est en cours. Sans ca on retombe dans l'entre-deux d'aout, ou
    // une seance commencee disparaissait en quittant l'ecran.
    if (!/ecrireEnCours\(/.test(sg)) soucis.push('la seance en cours n\'est plus sauvegardee : quitter l\'ecran perdrait tout');
    if (!/lireEnCours\(cleCours\)/.test(sg)) soucis.push('une seance interrompue ne se reprend plus');
    if (!/oublierEnCours\(\)/.test(sg)) soucis.push('la seance reste « en cours » apres avoir ete enregistree');
    // Raci, 5/09 : « termine c'est termine ». Atteindre l'ecran de fin
    // vaut enregistrement ; il ne reste ni bouton pour confirmer ni
    // bouton pour revenir en arriere, seulement le retour au menu.
    if (!/dejaEcrit\.current = true;\s*enregistrer\(\);/.test(sg)) {
      soucis.push('l\'ecran de fin n\'enregistre plus tout seul');
    }
    if (/setTermine\(false\)/.test(sg)) soucis.push('« Reprendre » est revenu : une seance terminee se rouvrirait');
    // 23/09 (Raci, point 1) : une seule fin pour tous les parcours —
    // enregistrer puis rendre la main a S'entrainer, sans ecran Bravo.
    if (!/enregistrer\(\);\s*revenir\(\);/.test(sg)) soucis.push('la fin ne rend plus la main a S\'entrainer');
    if (/sg-scene-fin|setRebours\(/.test(sg)) soucis.push('l\'ecran de fin bloquant est revenu');
    // Raci, 5/09 : « prevoir un temps de repos entre les differents
    // exercices ». Je supposais que le deplacement d'un poste a
    // l'autre suffisait.
    if (!/setRepos\(reposPour\(refs\[iExo \+ 1\]\.ex\.nom\)\)/.test(sg)) {
      soucis.push('on enchaine deux exercices sans aucun repos');
    }
    // Raci, 5/09 : « un bouton dans le cas ou l'utilisateur ne
    // possede pas le materiel — proposer un equivalent machine si
    // c'etait une machine, et vice-versa halteres ».
    if (!/class="sg-swap"/.test(sg)) soucis.push('le remplacement faute de materiel a disparu');
    if (!/function equivalents\(mKey, ex\)/.test(sg)) {
      soucis.push('plus rien ne calcule d\'exercice equivalent');
    }
    if (!/const GESTES = \[/.test(sg)) {
      soucis.push('les equivalences ne se font plus par geste : elles retomberont sur des mouvements sans rapport');
    }
    if (!/seanceMemeJour\(iso, titre/.test(sg)) soucis.push('un second enregistrement du jour n\'ecrase plus le premier');
    if (/class="sd-fini"|class="sd-conflit"|class="sd-terminer"/.test(sg)) {
      soucis.push('les ecrans intermediaires supprimes le 5/09 sont revenus');
    }
  }
  if (main && /SeanceDetail/.test(main)) soucis.push('la liste a cocher est rebranchee dans le routeur');
  if (css && !/\.sg-go \{/.test(css)) soucis.push('le bouton unique a perdu son style');
  if (soucis.length) faute('R79 seance guidee', soucis.join(' ; '));
  else passe('R79 seance guidee');
}

// ------------------------------------------------------------
// R80 — Les programmes DEBUTANT ne tiennent que sur machine.
// Raci, 5/09 : « j'ai simule un programme prise de muscle pour
// debutant, il m'a donne uniquement des exercices polyarticulaires ;
// je voudrais que tout soit a base de machine tout le long ». Squat
// barre, souleve, developpe couche et tractions demandent une
// technique qu'un debutant n'a pas : la machine tient la trajectoire
// a sa place. La regle lit la base d'exercices, pas une liste ecrite
// a la main — elle suit donc les futures modifications.
// ------------------------------------------------------------
{
  const se = lire('app-v2/src/data/sessionExos.js');
  const ex = lire('app-v2/src/data/exercices.js');
  if (se && ex) {
    const soucis = [];
    // Les identifiants des programmes de niveau Debutant.
    const DEBUTANTS = ['deb-full-3j', 'deb-2j', 'seche-2j'];
    // Nom -> materiel, releve dans la base.
    const mat = new Map();
    for (const m of ex.matchAll(/\{nom:'([^']+)'[^}]*?mat:'([^']+)'/g)) mat.set(m[1], m[2]);
    for (const id of DEBUTANTS) {
      const bloc = se.match(new RegExp('"' + id + '-\\d+": \\[([^\\]]*)\\]', 'g')) || [];
      if (!bloc.length) { soucis.push('le programme debutant ' + id + ' n\'a plus de seances'); continue; }
      for (const b of bloc) {
        for (const m of b.matchAll(/"[a-z]+:([^"]+)"/g)) {
          const materiel = mat.get(m[1]);
          if (!materiel) soucis.push(id + ' : « ' + m[1] + ' » est introuvable dans la base');
          else if (materiel !== 'machine') {
            soucis.push(id + ' : « ' + m[1] + ' » n\'est pas sur machine (' + materiel + ')');
          }
        }
      }
    }
    // Machine ne veut pas dire simple. La base classe les mouvements
    // par niveau : un programme debutant ne doit contenir que du
    // niveau 1.
    const niveaux = new Map();
    for (const m of ex.matchAll(/\{nom:'([^']+)'[^}]*?lvl:(\d+)/g)) niveaux.set(m[1], +m[2]);
    for (const id of DEBUTANTS) {
      const bloc = se.match(new RegExp('"' + id + '-\\d+": \\[([^\\]]*)\\]', 'g')) || [];
      for (const b of bloc) {
        for (const m of b.matchAll(/"[a-z]+:([^"]+)"/g)) {
          const n = niveaux.get(m[1]);
          if (n && n > 1) soucis.push(id + ' : « ' + m[1] + ' » est de niveau ' + n);
        }
      }
    }
    if (soucis.length) faute('R80 debutant sur machine', soucis.join(' ; '));
    else passe('R80 debutant sur machine');
  }
}

// ------------------------------------------------------------
// R81 — Le filet de diagnostic reste en place.
// Le 9/09, `larg()` est partie avec le bloc des trois repartitions du
// calculateur : elle etait rangee au milieu. Le build passait — une
// fonction absente ne se voit qu'a l'execution. « Mes besoins » ne
// s'ouvrait plus, l'app plantait apres son premier affichage, et plus
// aucun bouton ne repondait, pas meme l'engrenage. Raci a cherche
// longtemps pour un nom de dix caracteres.
//
// J'ai tente une regle qui verifie que tout appel est defini : elle
// prenait url(), rotate(), async et des mots francais dans des
// chaines pour des fonctions — cinquante fausses alertes. Une regle
// qui crie faux se fait ignorer, donc elle n'existe pas. Ce qui reste,
// et qui a effectivement trouve la panne en une capture d'ecran :
// l'erreur s'affiche A L'ECRAN. Sur telephone la console est hors
// d'atteinte ; sans ce bandeau on cherche a l'aveugle.
// ------------------------------------------------------------
{
  const m = lire('app-v2/src/main.jsx');
  const soucis = [];
  if (m) {
    if (!/function montrerErreur\(/.test(m)) soucis.push('le bandeau d\'erreur a disparu');
    if (!/addEventListener\('error'/.test(m)) soucis.push('les exceptions ne sont plus attrapees');
    if (!/addEventListener\('unhandledrejection'/.test(m)) {
      soucis.push('les promesses rejetees passent de nouveau sous silence');
    }
  }
  if (soucis.length) faute('R81 erreurs visibles a l\'ecran', soucis.join(' ; '));
  else passe('R81 erreurs visibles a l\'ecran');
}

// ------------------------------------------------------------
// R82 — L'editeur de plat est une carte, pas un ecran plein.
// Raci, 9/09 : « epurer cette page, la rendre non scrollable,
// assombri autour comme les autres ». C'etait le dernier ecran de
// l'app a recouvrir tout sans dire d'ou l'on venait, et ses deux
// phrases d'aide prenaient quatre lignes pour redire ce que les
// etiquettes disaient deja.
// ------------------------------------------------------------
{
  const jsx = lire('app-v2/src/components/MesPlats.jsx');
  const css = lire('app-v2/src/styles/journal-socle.css');
  const soucis = [];
  if (jsx) {
    if (/class="mp-aide"/.test(jsx)) {
      soucis.push('les phrases d\'aide longues sont revenues sous les etiquettes');
    }
    if (!/t\('mp_aide_poids_court'\)/.test(jsx) || !/t\('mp_aide_portions_court'\)/.test(jsx)) {
      soucis.push('l\'aide courte a disparu : plus rien ne precise le poids ni les portions');
    }
  }
  if (css) {
    const bloc = (css.match(/\.mp-plein \{[^}]*\}/) || [''])[0];
    if (!/background: rgba\(12, 10, 8, \.55\)/.test(bloc)) {
      soucis.push('l\'editeur est redevenu un ecran plein sans voile');
    }
    if (!/\.mp-defile \{[^}]*max-width: 460px/.test(css)) {
      soucis.push('la carte reprend toute la largeur : elle ne se lit plus comme une modale');
    }
    if (!/@media \(max-height:720px\)[\s\S]{0,600}?\.mp-ing\{/.test(css)) {
      soucis.push('le palier petit ecran a disparu : la carte defilera des trois ingredients');
    }
    // Les cibles tactiles ne se resserrent pas : c'est la regle posee
    // apres les erreurs de frappe de fin aout.
    for (const m of css.matchAll(/\.mp-compteur button\s*\{([^}]*)\}/g)) {
      const h = (m[1].match(/height:\s*(\d+)px/) || [])[1];
      if (h && +h < 44) soucis.push('les boutons de portions passent a ' + h + ' px');
    }
  }
  if (soucis.length) faute('R82 editeur de plat', soucis.join(' ; '));
  else passe('R82 editeur de plat');
}

// ------------------------------------------------------------
// R83 — « Terminer » vit sur la ligne du total.
//
// Raci, 9/09, apres cinq tentatives : « j'ai une idee, le bouton
// Terminer on va le placer la » — au milieu de la ligne « Total
// repas », dans la place vide entre le libelle et la valeur.
//
// C'est la premiere solution qui tient, et pour une raison que je
// n'avais pas vue : elle ne cherche pas a garder le bouton en place,
// elle le met LA OU L'ON REGARDE DEJA. La ligne du total suit
// immediatement le dernier aliment encode — plus aucune carte a
// traverser — et le total est a sa droite, donc on voit ce qu'on
// valide sans rien dupliquer.
//
// Les impasses, pour qu'aucune ne soit re-tentee : en fin de page il
// descendait avec la liste ; en `sticky` il n'avait aucune course
// (dernier enfant) ; en `fixed` il passait sous le clavier, puis
// flottait au milieu des aliments quand j'ai corrige par
// visualViewport (Chrome redimensionnait deja, le clavier etait
// compte deux fois) ; dans l'en-tete, puis en-tete collant, refuse a
// l'usage. Un pave numerique maison et une feuille par aliment ont
// aussi ete proposes et refuses.
// ------------------------------------------------------------
{
  const mp = lire('app-v2/src/components/MealPage.jsx');
  const css = lire('app-v2/src/styles/journal-socle.css');
  const soucis = [];
  if (mp) {
    if (!/class="rp-total-fin"/.test(mp)) {
      soucis.push('« Terminer » a quitte la ligne du total');
    }
    if (/class="rp-btn-fin"/.test(mp) || /class="rp-fin-haut"/.test(mp)) {
      soucis.push('un second « Terminer » est revenu : deux sorties pour un seul geste');
    }
    if (!/t\('rp_total_court'\)/.test(mp)) {
      soucis.push('le libelle long est revenu : la ligne devient trop chargee sur un ecran de 360');
    }
    // Variante B : la valeur est DANS le libelle, a gauche.
    if (!/class="rp-total-lb">[\s\S]{0,200}class="rp-total-val"/.test(mp)) {
      soucis.push('le total a quitte le libelle : il se retrouvera de nouveau a droite du bouton');
    }
    if (/window\.visualViewport/.test(mp)) {
      soucis.push('la mesure du clavier est revenue : plus rien ne flotte, elle n\'a plus d\'objet');
    }
  }
  if (css) {
    const act = (css.match(/\.pg-journal \.rp-actions \{[^}]*\}/) || [''])[0];
    if (/position: (fixed|sticky)/.test(act)) {
      soucis.push('la barre du bas est redevenue flottante : impasses 2, 3 et 4');
    }
    const tb = (css.match(/\.pg-journal \.rp-topbar \{[^}]*\}/) || [''])[0];
    if (/position: sticky/.test(tb)) soucis.push('l\'en-tete est redevenu collant : impasse 5');
    const fin = (css.match(/\.pg-journal \.rp-total-fin \{[^}]*\}/) || [''])[0];
    const h = (fin.match(/min-height: (\d+)px/) || [])[1];
    if (!h || +h < 44) soucis.push('« Terminer » passe sous la cible tactile de 44 px');
    if (!/flex: none/.test(fin)) {
      soucis.push('le bouton reprend la place libre : il repousse le total contre le bord (variante A, ecartee)');
    }
    const lb = (css.match(/\.pg-journal \.rp-total-lb \{[^}]*\}/) || [''])[0];
    if (!/flex: 1 1 auto/.test(lb)) {
      soucis.push('le libelle ne prend plus la place libre : le bouton ne sera plus cale a droite');
    }
  }
  if (soucis.length) faute('R83 « Terminer » sur la ligne du total', soucis.join(' ; '));
  else passe('R83 « Terminer » sur la ligne du total');
}

// ------------------------------------------------------------
// R84 — La focale des vignettes ne recouvre jamais rien.
// Raci, 9/09 : « l'agrandissement fait bien lors du defilement, mais
// ca reste trop petit », puis, apres l'avoir pousse a x1,38 :
// « superposition ». `transform: scale()` ne pousse pas ses voisins —
// la mise en page ignore l'echelle — donc toute valeur au-dessus de 1
// fait recouvrir les lignes d'a cote.
//
// L'effet est inverse : la vignette du centre est a sa taille POSEE,
// que la ligne reserve, et ce sont les autres qui retrecissent. Le
// contraste est le meme et le debordement devient impossible.
// ------------------------------------------------------------
{
  const jsx = lire('app-v2/src/components/SelectionExercices.jsx');
  const css = lire('app-v2/src/legacy/selection-exercices.scoped.css');
  const soucis = [];
  if (jsx) {
    const max = (jsx.match(/const MAX = ([\d.]+);/) || [])[1];
    if (!max) soucis.push('le plafond d\'echelle a disparu de la focale');
    else if (+max > 1) soucis.push('l\'echelle monte a ' + max + ' : les vignettes recouvriront leurs voisines');
    if (!/requestAnimationFrame\(appliquer\)/.test(jsx)) {
      soucis.push('la focale ne passe plus par requestAnimationFrame : la liste tressautera');
    }
    if (!/capture: true/.test(jsx)) {
      soucis.push('le defilement n\'est plus ecoute en capture : rien ne bougera dans un conteneur interne');
    }
  }
  if (css) {
    const ph = (css.match(/\.pg-selection \.ex-photo\{[^}]*\}/) || [''])[0];
    const t = (ph.match(/width:(\d+)px/) || [])[1];
    const it = (css.match(/\.pg-selection \.ex-item\{ min-height: (\d+)px/) || [])[1];
    if (!t) soucis.push('la vignette n\'a plus de taille fixe : la focale n\'a plus de reference');
    else if (!it || +it < +t) {
      soucis.push('la ligne ne reserve plus la hauteur de la vignette (' + t + ' px)');
    }
  }
  if (soucis.length) faute('R84 focale sans recouvrement', soucis.join(' ; '));
  else passe('R84 focale sans recouvrement');
}

// ------------------------------------------------------------
// R85 — Une seance libre commencee survit a la fermeture de l'app.
// Raci, 9/09 : « j'avais deux trois exercices dans seance libre, j'ai
// quitte la page pour venir te parler, et au retour les exercices ne
// sont plus la ». seanceRefs et selectionExos ne vivaient qu'en
// memoire : Chrome decharge un onglet passe en arriere-plan et la
// selection partait avec. La seance GUIDEE avait sa reprise depuis le
// 5/09 ; la libre n'en avait aucune.
// ------------------------------------------------------------
{
  // v535 (Raci, 20/09) : la reprise a demenage de MaSeance.jsx vers
  // store/seance-active.js, qui unifie seance libre et guidee en
  // quatre etats — brouillon, prevue, en cours, faite. La regle suit
  // la fonction la ou elle vit desormais.
  const sa = lire('app-v2/src/store/seance-active.js');
  const soucis = [];
  if (!sa) soucis.push('store/seance-active.js a disparu : plus rien ne reprend une seance');
  else {
    if (!/const CLE_LIBRE = 'belfit_seance_libre'/.test(sa)) {
      soucis.push('la seance libre n\'est plus conservee sur le disque');
    }
    if (!/signal\(reprise\.refs\)/.test(sa)) soucis.push('les exercices choisis ne repartent plus de la reprise');
    if (!/signal\(reprise\.selection\)/.test(sa)) soucis.push('la selection ne repart plus de la reprise');
    if (!/new Set\(e\.selection\[k\]\)/.test(sa)) {
      soucis.push('les Set ne sont plus rebatis a la lecture : la selection sera inutilisable');
    }
    if (!/effect\(/.test(sa)) soucis.push('la sauvegarde n\'est plus automatique');
  }
  if (soucis.length) faute('R85 reprise de la seance libre', soucis.join(' ; '));
  else passe('R85 reprise de la seance libre');
}

// ------------------------------------------------------------
// R86 — La ligne d'un aliment ne se chevauche pas.
// Raci, 9/09, deux passes sur la meme ligne. D'abord « 26P · 132C ·
// 1… » : les macros etaient tronquees. J'ai elargi avec `min-width`
// sur l'element — sauf que la ligne est une GRILLE : la piste restait
// a 72 px et le contenu debordait sur la colonne voisine, celle de la
// croix. « La croix pour fermer est superposee avec le reste. »
// Dans une grille, c'est la PISTE qui porte la largeur. Et la croix
// agrandissait sa zone de frappe avec `margin: -8px` sur ses quatre
// cotes : le retrait horizontal la faisait mordre sur les macros.
// ------------------------------------------------------------
{
  const css = lire('app-v2/src/styles/journal-socle.css');
  const soucis = [];
  if (css) {
    const grille = (css.match(/\.pg-journal \.mc-ing \{[^}]*\}/) || [''])[0];
    const pistes = (grille.match(/grid-template-columns: ([^;]+);/) || [])[1] || '';
    const cols = pistes.trim().split(/\s+/);
    const mac = parseInt(cols[3] || '0', 10);
    const croix = parseInt(cols[4] || '0', 10);
    if (!mac || mac < 96) soucis.push('la piste des macros repasse sous 96 px : elles seront tronquees');
    if (!croix || croix < 34) soucis.push('la croix n\'a plus sa colonne de 34 px : elle remontera sur les macros');
    if (/\.mc-ing-macros \{[^}]*min-width: [1-9]/.test(css)) {
      soucis.push('une largeur minimale est remise sur l\'element : dans une grille, elle fait deborder la piste');
    }
    if (/\.pg-journal \.mc-ing-del \{[^}]*margin: -\d+px;/.test(css)) {
      soucis.push('la croix reprend un retrait sur ses quatre cotes : elle mordra sur les macros');
    }
    const rpIng = (css.match(/\.pg-journal \.rp-liste \.mc-ing \{[^}]*\}/) || [''])[0];
    const p = (rpIng.match(/padding: (\d+)px 0/) || [])[1];
    if (!p) soucis.push('le rembourrage des lignes n\'est plus lisible dans la feuille');
    else if (+p < 8) {
      soucis.push('les lignes passent a ' + p + ' px de rembourrage : sous 8 px, le champ de poids se touche au millimetre');
    }
    const champ = (css.match(/\.pg-journal \.mc-ing input \{[^}]*\}/) || [''])[0];
    const hc = (champ.match(/(?:min-)?height: (\d+)px/) || [])[1];
    if (hc && +hc < 40) {
      soucis.push('le champ de poids descend a ' + hc + ' px : c\'est la variante D, ecartee');
    }
  }
  if (soucis.length) faute('R86 ligne d\'aliment sans chevauchement', soucis.join(' ; '));
  else passe('R86 ligne d\'aliment sans chevauchement');
}

// ------------------------------------------------------------
// R77 — Rien d'exterieur ne bloque le premier affichage.
// Audit du 02/09 : deux feuilles de style distantes (fontshare et
// Google) etaient chargees en <link rel="stylesheet"> ordinaire. Le
// navigateur ne peignait rien avant leur retour — deux domaines, deux
// DNS, deux TLS avant le premier pixel, et un ecran fige de plusieurs
// secondes quand le reseau traine. Le service worker les ignorait en
// plus, donc elles repartaient sur le reseau a chaque lancement.
// ------------------------------------------------------------
{
  const html = lire('app-v2/index.html');
  const sw = lire('app-v2/public/sw.js');
  const mn = lire('app-v2/src/main.jsx');
  const soucis = [];
  if (html) {
    // Toute feuille distante doit etre hors du chemin critique.
    // Le <noscript> ne compte pas : il ne s'applique que sans
    // JavaScript, cas ou l'application ne demarre de toute facon pas.
    const sansNoscript = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
    for (const m of sansNoscript.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)) {
      const t = m[0];
      if (/https?:\/\//.test(t) && !/media="print"/.test(t)) {
        soucis.push('une feuille de style distante bloque de nouveau la peinture');
      }
    }
    if (/fonts\.googleapis\.com/.test(html)) soucis.push('la feuille Google est revenue : Manrope n\'est plus utilisee nulle part');
  }
  if (sw) {
    if (!/api\.fontshare\.com/.test(sw)) soucis.push('le service worker ne met plus les polices en cache');
    if (!/setTimeout\(\(\) => r\(null\), 2500\)/.test(sw)) soucis.push('le HTML peut de nouveau attendre le reseau sans limite');
  }
  if (mn) {
    if (/setTimeout\(partir, 1300\)/.test(mn)) soucis.push('le splash est revenu a un delai fixe');
    const pl = (mn.match(/const PLANCHER = (\d+);/) || [])[1];
    if (!pl) soucis.push('le splash n\'a plus de plancher');
    else if (Number(pl) < 1000) soucis.push('le plancher du splash est retombe a ' + pl + ' ms : le logo passe trop vite');
    if (!/const PLAFOND = 5000;/.test(mn)) soucis.push('le splash peut rester coince si un rendu echoue');
  }
  // Manrope ne doit plus etre citee : sa feuille n'est plus chargee.
  for (const f of ['app-v2/src/styles.css', 'app-v2/src/legacy/stats.scoped.css',
                   'app-v2/src/legacy/journal.scoped.css', 'app-v2/src/legacy/entrainer.scoped.css']) {
    const c = lire(f);
    if (c && /font-family:\s*'Manrope'/.test(c)) soucis.push(f.split('/').pop() + ' demande Manrope, qui n\'est plus chargee');
  }
  if (soucis.length) faute('R77 demarrage sans peage', soucis.join(' ; '));
  else passe('R77 demarrage sans peage');
}

// ------------------------------------------------------------
// R87 — Les photos d'exercices ne sont pas noyees dans le noir.
// Raci, 7/10 : « les images sont tres sombres ». Les photos du
// catalogue sont sous-exposees (luminance mediane 67/255) et la seance
// guidee les passait sous un voile noir de 48 a 94 %. Depuis le 14/10
// elles sont servies par BelFit (img/exercices/), eclaircies une par
// une a la conversion (tools/convertir-images-exercices.mjs) ; le
// filtre gamma au rendu ne sert plus qu'au secours distant.
// ------------------------------------------------------------
{
  const soucis = [];
  const ph = lire('app-v2/src/components/PhotoExo.jsx');
  const mod = lire('app-v2/src/services/eclaircir-photos.js');
  const pcss = lire('app-v2/src/styles/photo-exo.css');
  const sel = lire('app-v2/src/components/SelectionExercices.jsx');
  const sg = lire('app-v2/src/components/SeanceGuidee.jsx');
  const cssSel = lire('app-v2/src/legacy/selection-exercices.scoped.css');
  const cssSg = lire('app-v2/src/styles/seance-guidee.css');
  const sw = lire('app-v2/public/sw.js');
  const data = lire('app-v2/src/data/exercices.js');
  if (!ph) soucis.push('components/PhotoExo.jsx a disparu');
  else {
    if (!/export const PHOTOS_BASE = '\/img\/exercices\/'/.test(ph)) soucis.push('les photos ne sont plus servies depuis /img/exercices/');
    if (!/onError=\{\(\) => \{ if \(!secours\) setSecours\(true\); \}\}/.test(ph)) soucis.push('plus de secours vers la photo distante si le fichier local manque');
    if (!/loading=\{prioritaire \? 'eager' : 'lazy'\}/.test(ph)) soucis.push('les vignettes ne se chargent plus a la demande');
    if (!/width=\{w\} height=\{h\}/.test(ph)) soucis.push('les photos n\'annoncent plus leurs dimensions : la liste sautera au chargement');
  }
  if (!mod || !/color-interpolation-filters', 'sRGB'/.test(mod)) soucis.push('le filtre de secours (eclaircir-photos.js) a disparu ou calcule en lumiere lineaire');
  if (!pcss || !/\.photo-exo\[data-secours\] \{ filter: url\(#bf-eclaircir\)/.test(pcss)) soucis.push('la photo distante de secours n\'est plus eclaircie');
  for (const [nom, c] of [['le choix des exercices', sel], ['la seance guidee', sg]]) {
    if (!c) continue;
    if (!/import \{ PhotoExo \} from '\.\/PhotoExo\.jsx'/.test(c)) soucis.push(nom + ' n\'utilise plus PhotoExo');
    if (/IMG_BASE\}\$\{/.test(c)) soucis.push(nom + ' recharge la photo distante directement');
  }
  // Jamais deux fois : une photo locale deja eclaircie ne recoit pas le filtre.
  for (const [nom, c] of [['selection-exercices.scoped.css', cssSel], ['seance-guidee.css', cssSg]]) {
    if (c && /url\(#bf-eclaircir\)/.test(c)) soucis.push(nom + ' eclaircit de nouveau des photos deja corrigees');
  }
  if (cssSg) {
    const voile = (cssSg.match(/\.sg-voile \{[^}]*\}/) || [''])[0];
    const haut = (voile.match(/rgba\(15, 15, 15, ([\d.]+)\) 100%/) || [])[1];
    if (!voile) soucis.push('le voile de la seance guidee a disparu : le texte ne se lit plus');
    else if (haut && +haut > 0.35) soucis.push('le voile assombrit de nouveau le haut de la photo (' + haut + ')');
  }
  if (sw && !/c !== CACHE && c !== CACHE_PHOTOS/.test(sw)) soucis.push('le service worker efface le cache des photos a chaque version');
  // Chaque exercice du catalogue a ses quatre fichiers.
  if (data) {
    const ids = [...new Set([...data.matchAll(/imgId:\s*'([^']+)'/g)].map(m => m[1]))];
    const manque = [];
    for (const id of ids) for (const f of ['0-240', '0-640', '1-240', '1-640']) {
      if (!existsSync(resolve(RACINE, 'img/exercices', id, f + '.webp'))) manque.push(id + '/' + f);
    }
    if (manque.length) soucis.push(manque.length + ' photo(s) non converties (node tools/convertir-images-exercices.mjs) : ' + manque.slice(0, 3).join(', '));
  }
  if (soucis.length) faute('R87 photos d\'exercices lisibles', soucis.join(' ; '));
  else passe('R87 photos d\'exercices lisibles');
}

// ------------------------------------------------------------
// R88 — Les chiffres sont en DM Mono, pas en Courier.
// Raci, 14/10 (« corrige tout ») : Fontshare ne sert pas DM Mono, la
// demande revenait vide et chaque valeur chiffree de l'app tombait sur
// la police a chasse fixe du systeme. DM Mono est desormais hebergee
// avec l'app (licence OFL jointe).
// ------------------------------------------------------------
{
  const st = lire('app-v2/src/styles.css');
  const html = lire('app-v2/index.html');
  const soucis = [];
  for (const w of [400, 500]) {
    if (!existsSync(resolve(RACINE, `app-v2/src/fonts/dm-mono-${w}.woff2`))) soucis.push(`dm-mono-${w}.woff2 a disparu`);
    if (st && !new RegExp(`font-family:'DM Mono';font-style:normal;font-weight:${w};font-display:swap;\\s*src:url\\('\\./fonts/dm-mono-${w}\\.woff2'\\)`).test(st)) soucis.push(`DM Mono ${w} n'est plus declaree dans styles.css`);
  }
  if (!existsSync(resolve(RACINE, 'app-v2/src/fonts/OFL-DM-Mono.txt'))) soucis.push('la licence OFL de DM Mono n\'accompagne plus la police');
  if (html && /dm-mono/.test(html)) soucis.push('index.html redemande DM Mono a Fontshare, qui ne la sert pas');
  if (soucis.length) faute('R88 police des chiffres', soucis.join(' ; '));
  else passe('R88 police des chiffres');
}

// ------------------------------------------------------------
// R89 — Seance libre, passe du 14/10 (Raci : « corrige tout »).
// En-tete compact sur une ligne, mention de niveau seulement quand
// elle dit quelque chose, barre « Ma seance » au jaune de l'app,
// commandes secondaires de la seance guidee lisibles sur une rangee.
// Ce qui ne doit PAS revenir : le chrono de cette page (retire le
// 26/08) et un deuxieme bouton principal a cote de « Suivant ».
// ------------------------------------------------------------
{
  const sel = lire('app-v2/src/components/SelectionExercices.jsx');
  const css = lire('app-v2/src/legacy/selection-exercices.scoped.css');
  const sg = lire('app-v2/src/components/SeanceGuidee.jsx');
  const sgc = lire('app-v2/src/styles/seance-guidee.css');
  const soucis = [];
  if (sel) {
    if (/>Convient à tous les niveaux</.test(sel)) soucis.push('« Convient a tous les niveaux » repete de nouveau sous chaque exercice');
    if (!/muscle-grille/.test(sel) || !/hint-compte/.test(sel) || !/ex-recherche/.test(sel) || !/niv-rangee/.test(sel) || !/filter-tabs/.test(sel)) soucis.push('un controle de l\'en-tete a disparu');
  }
  if (css) {
    if (!/\.pg-selection \.top h1\{ font-size:20px; white-space:nowrap;/.test(css)) soucis.push('le titre repasse sur deux lignes');
    const barre = (css.match(/\.session-bar\.pg-selection-portail\{[^}]*\}/) || [''])[0];
    if (!/background:#FAC408/.test(barre)) soucis.push('la barre « Ma seance » a quitte le jaune de « Suivant »');
  }
  if (sgc) {
    const sec = (sgc.match(/\.sg-sec button \{[^}]*\}/) || [''])[0];
    if (!/color: #2A2520/.test(sec) || !/white-space: nowrap/.test(sec)) soucis.push('les commandes secondaires de la seance redeviennent pales ou passent sur deux lignes');
  }
  if (sg) {
    if ((sg.match(/class="sg-go"/g) || []).length > 1) soucis.push('un second bouton principal est apparu a cote de « Suivant »');
    if (/sg-chrono|v2-timer-big/.test(sg)) soucis.push('le chrono est revenu sur la seance guidee (retire le 26/08)');
  }
  if (soucis.length) faute('R89 seance libre epuree', soucis.join(' ; '));
  else passe('R89 seance libre epuree');
}

// ------------------------------------------------------------
// Rapport
// ------------------------------------------------------------
for (const r of ok) console.log(`  ok    ${r}`);
for (const g of signaux) console.log(`  note  ${g.regle} : ${g.detail}`);
for (const e of ecarts) console.log(`  ECART ${e.regle} : ${e.detail}`);
console.log(ecarts.length
  ? `\n${ecarts.length} ecart(s) — audit en echec.`
  : `\n${ok.length} regles, aucun ecart.`);
process.exit(ecarts.length ? 1 : 0);
