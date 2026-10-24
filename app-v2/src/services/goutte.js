// ============================================================
// LA GOUTTE D'EAU DU JOURNAL
//
// Elle vit a quai dans sa fente sous la carte Calories. Des que
// l'on fait defiler, elle se disperse en gouttelettes le long du
// bord gauche, y reste, puis se recompose et vient se poser sur
// son quai du bas.
//
// Pourquoi tout est calcule image par image, et rien en CSS :
// une transition CSS joue sur son propre rythme et decroche du
// doigt. En pilotant la deformation depuis la position de
// defilement, la masse se resserre pixel par pixel sous la main,
// et si l'on s'arrete a mi-chemin elle reste a mi-chemin.
// (Raci, 8/08 — apres plusieurs versions en transitions CSS qui
// donnaient toutes une impression de saut.)
//
// Piege connu : .rail4 porte will-change:transform, donc tout
// position:fixed a l'interieur se decale. La rangee est deja
// rebasculee en absolute par journal-socle.css ; on ne touche
// qu'a transform / width / height / left.
// ============================================================

const PASTILLE_L = 92;   // largeur de la pastille (« 1,25 L » tient, 28/09)
const PASTILLE_H = 46;
const AMAS_L     = 12;   // colonne de gouttelettes
// 70px : le creux entre « Pense a te peser » et le premier repas en fait
// 78. Une colonne de 96 debordait sur la carte de repas.
const AMAS_H     = 70;
const QUAI_BAS_M = 196;  // hauteur du quai bas, depuis le bas de l'ecran
const REMONTEE   = 24;   // ce que la goutte gagne au-dessus de sa fente

// Place, taille, decalage et rang d'apparition de chaque perle.
// Rien de synchrone : l'eau ne se divise pas en cadence.
const PROFIL = [
  { t: 0.02, d: 11, x: -1, r: 0.00 },
  { t: 0.17, d: 14, x: -2, r: 0.07 },
  { t: 0.34, d:  9, x:  1, r: 0.19 },
  { t: 0.50, d: 15, x: -2, r: 0.13 },
  { t: 0.66, d:  8, x:  1, r: 0.29 },
  { t: 0.82, d: 12, x: -1, r: 0.23 },
  { t: 0.95, d:  7, x:  0, r: 0.36 },
];

const melange = (a, z, t) => a + (z - a) * t;
const borne   = (v, a, z) => Math.min(z, Math.max(a, v));
const adoucir = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

let boucle = null;

export function animerGoutte() {
  arreterGoutte();

  const sc     = document.querySelector('.pan-scroll');
  const bouton = document.querySelector('.pg-journal .water-fab');
  const fente  = document.querySelector('.pg-journal .fente-goutte');
  if (!sc || !bouton || !fente) return;

  const corps   = bouton.querySelector('.wf-corps');
  const contenu = bouton.querySelector('.wf-contenu');
  const perles  = [...bouton.querySelectorAll('.wf-perles i')];
  if (!corps || !contenu || perles.length !== PROFIL.length) return;

  const rangee = bouton.parentElement;

  // Point d'arrivee releve UNE SEULE FOIS. Toute cible recalculee en
  // continu (pourcentage d'ecran, position d'une carte) remonte avec le
  // defilement et entraine l'amas jusqu'en haut de l'ecran.
  let ancrage = null;
  // Position brute de la fente, telle qu'elle est a l'ecran.
  const fenteY = () => {
    const f = fente.getBoundingClientRect();
    const r = sc.getBoundingClientRect();
    return (f.top - r.top) + (f.height - PASTILLE_H) / 2;
  };
  // Rectangles reellement occupes par la colonne. Un conteneur peut faire
  // toute la largeur alors que son contenu est cale d'un cote : la rangee
  // « Ajouter un repas » en est une, son bouton est a droite. Mesurer le
  // conteneur faisait croire la gouttiere occupee (Raci, 9/08).
  const blocsColonne = () => {
    const r = sc.getBoundingClientRect();
    const out = [];
    sc.querySelectorAll('.pg-journal .colonne > *').forEach(e => {
      if (e.classList.contains('fente-goutte')) return;
      let cible = e;
      const enfants = [...e.children];
      if (enfants.length === 1) {
        const c = enfants[0].getBoundingClientRect();
        if (c.width > 0 && c.width < e.getBoundingClientRect().width * 0.7) cible = enfants[0];
      }
      const b = cible.getBoundingClientRect();
      if (b.height > 2) out.push({ h: b.top - r.top, b: b.bottom - r.top, g: b.left, d: b.right });
    });
    return out;
  };
  const estLibre = (y, blocs, h = PASTILLE_H) => !blocs.some(o =>
    o.d > 12 && o.g < 12 + PASTILLE_L && y < o.b - 1 && y + h > o.h + 1);

  // Ou poser la pastille au repos.
  // La fente est sa place normale. Quand la carte Calories porte le
  // message « journee non cloturee » elle s'allonge et pousse la fente
  // hors de l'ecran ; la pastille doit alors trouver un creux ailleurs.
  // On ne surveille pas une carte en particulier mais TOUT ce qui occupe
  // la colonne : la premiere version ne regardait que la carte sombre et
  // la pastille se posait sur « Pense a te peser » (Raci, 9/08).
  const placeAuRepos = () => {
    const r = sc.getBoundingClientRect();
    const plancher = plafondBarre() - PASTILLE_H - 10;
    const obstacles = blocsColonne();
    const libre = (y) => estLibre(y, obstacles);

    // 1. sa fente — le creux sous « Pense a te peser ». C'est SA place,
    //    message « journee non cloturee » ou pas (Raci, 9/08). On la
    //    ramene dans l'ecran plutot que de la rejeter : avant, un
    //    depassement de 3px suffisait a l'envoyer se poser ailleurs.
    const yf = Math.min(Math.max(fenteY(), 8), plancher);
    if (libre(yf)) return yf;
    // 2. sinon le premier creux entre deux blocs, en partant du haut
    for (let i = 0; i < obstacles.length; i++) {
      const y = obstacles[i].b + 8;
      if (y >= 8 && y <= plancher && libre(y)) return y;
    }
    // 3. sinon le quai bas, s'il est degage
    if (libre(plancher)) return plancher;
    // 4. vraiment aucune place : elle reste dispersee
    return null;
  };
  const quaiHaut = () => { const y = placeAuRepos(); return y === null ? sc.clientHeight - QUAI_BAS_M : y; };
  // Sonde de diagnostic (inerte en production, lue par les tests).
  window.__goutte = () => {
    const r = sc.getBoundingClientRect();
    return { choix: placeAuRepos(), fente: Math.round(fenteY()),
      obstacles: [...sc.querySelectorAll('.pg-journal .colonne > *')]
        .filter(e => !e.classList.contains('fente-goutte'))
        .map(e => { const b = e.getBoundingClientRect();
          return { cl: (e.className||e.tagName).toString().split(' ')[0],
                   h: Math.round(b.top-r.top), b: Math.round(b.bottom-r.top),
                   g: Math.round(b.left), d: Math.round(b.right) }; })
        .filter(o => o.b - o.h > 2) };
  };
  // Le quai du bas cherche lui aussi un creux : sans ca la pastille se
  // posait sur « Ajouter un repas » en fin de defilement (Raci, 9/08).
  const quaiBas = () => {
    const blocs = blocsColonne();
    let y = Math.min(sc.clientHeight - QUAI_BAS_M, plafondBarre() - PASTILLE_H - 10);
    for (let i = 0; i < 40 && !estLibre(y, blocs); i++) y -= 8;
    return y;
  };
  const croisiere = () => {
    if (ancrage === null) ancrage = quaiHaut();
    return ancrage - REMONTEE;
  };

  let cibleY = 0, cibleD = 0, monte = true;

  let hautFixe = null;
  let barreRepos = null;

  // Position de la barre de navigation AU REPOS. Pendant le defilement
  // elle s'escamote sous l'ecran : la lire a ce moment-la fait croire la
  // place libre, la goutte s'y pose, puis la barre revient dessus —
  // c'est exactement le conflit repere par Raci (9/08). On memorise donc
  // sa position quand elle est visible, et on ne lit jamais l'autre.
  const plafondBarre = () => {
    const bn = document.querySelector('.bn');
    if (bn && !bn.classList.contains('bn--escamotee')) {
      barreRepos = bn.getBoundingClientRect().top;
    }
    return barreRepos ?? (sc.clientHeight - QUAI_BAS_M + PASTILLE_H + 10);
  };

  function calculer() {
    const course = Math.max(1, sc.scrollHeight - sc.clientHeight);
    const y = sc.scrollTop;

    // Le point de depart est memorise quand on est en haut : la fente
    // defile avec le contenu, la relire en pleine course faisait deriver
    // la goutte vers le haut de l'ecran.
    if (y < 6 || hautFixe === null) hautFixe = quaiHaut();

    // Course trop courte pour un voyage (grand ecran, peu de contenu) :
    // la dispersion n'aurait pas le temps de s'achever et une demi-
    // pastille traverserait les cartes. La goutte reste alors dans son
    // creux et defile avec lui.
    if (course < 160) { cibleY = quaiHaut(); cibleD = 0; monte = false; return; }

    // Position PROPORTIONNELLE a toute la course : la goutte descend la
    // gouttiere au rythme du defilement. L'ancien decoupage (voyage de
    // 140px puis croisiere figee) concentrait tout le trajet sur le
    // premier geste du pouce — a l'ecran ca faisait un SAUT jusqu'a
    // mi-gouttiere, puis plus rien (Raci, 9/08).
    const t = borne(y / course, 0, 1);
    // Cible basse FIXE pendant le trajet : la recherche de creux lit des
    // blocs en mouvement, elle ne s'applique qu'a l'arrivee.
    const bas = t > 0.95 ? quaiBas()
      : Math.min(sc.clientHeight - QUAI_BAS_M, plafondBarre() - PASTILLE_H - 10);
    cibleY = melange(hautFixe, bas, adoucir(t));
    // Entiere aux deux bouts, gouttelettes entre les deux.
    cibleD = borne(Math.min(y, course - y) / 90, 0, 1);
    monte = false;
    eviterCartes();
  }

  // 22/10 Raci : arretee a un petit defilement (premier repas amene a
  // l'ecran), la goutte encore presque entiere restait sur « Pense a te
  // peser » : la cible proportionnelle ignore les cartes. Si la pastille
  // (meme a moitie formee) chevauche un bloc, on la pose dans le creux
  // libre le plus proche ; s'il n'y en a pas, elle se disperse en
  // gouttelettes dans la gouttiere, ou rien ne la recouvre.
  function eviterCartes() {
    // 0.9 (et non 0.6) : jusqu'a d = 0,86 la pastille reste visible (opacite > 0,15) ;
    // a 0,6 elle etait encore a 40 % et se posait a demi sur une carte (24/10).
    if (cibleD >= 0.9) return;
    const blocs = blocsColonne();
    // hauteur reelle de la forme a moitie dispersee (+ marge d'etirement)
    const h = melange(PASTILLE_H, AMAS_H, cibleD) * 1.1 + 4;
    const haut = 8;
    const bas  = plafondBarre() - h - 10;
    const libre = (y) => y >= haut && y <= bas && estLibre(y, blocs, h);
    if (libre(cibleY)) return;
    for (let k = 4; k <= 160; k += 4) {
      if (libre(cibleY - k)) { cibleY -= k; return; }
      if (libre(cibleY + k)) { cibleY += k; return; }
    }
    cibleD = 1;
  }

  // La forme rattrape sa cible avec un retard souple : c'est cette
  // inertie qui donne la sensation de liquide plutot que de mecanisme.
  let Y = null, D = 0, vit = 0, precY = null, dernierSemis = 0, vivantes = 0;

  function semer(pos, d) {
    if (precY === null) { precY = pos; return; }
    const bond = Math.abs(pos - precY);
    const t = performance.now();
    if (bond > 1.4 && t - dernierSemis > 34 && vivantes < 12) {
      dernierSemis = t;
      const g = document.createElement('i');
      g.className = 'wf-trainee';
      const taille = 3 + Math.random() * 5;
      const recul  = 4 + Math.random() * 14;
      const y = pos + (monte ? recul : -recul);
      const x = melange(22, 3, d) + (Math.random() * 10 - 5);
      g.style.cssText =
        `width:${taille.toFixed(1)}px;height:${taille.toFixed(1)}px;` +
        `left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;` +
        `--vie:${(430 + Math.random() * 260).toFixed(0)}ms`;
      rangee.appendChild(g); vivantes++;
      g.addEventListener('animationend', () => { g.remove(); vivantes--; }, { once: true });
    }
    precY = pos;
  }

  function peindre() {
    if (!document.body.contains(bouton)) { boucle = null; return; }
    // Recalcul a chaque image, pas seulement au defilement : la mise en
    // page bouge sans qu'on defile — le message « journee non cloturee »
    // apparait, une carte se replie, les polices finissent de charger.
    // Une decision prise une seule fois au montage se retrouvait fausse
    // et la pastille restait posee sur « Pense a te peser » (Raci, 9/08).
    calculer();
    if (Y === null) { Y = cibleY; D = cibleD; }

    const avant = Y;
    Y   += (cibleY - Y) * 0.28;
    D   += (cibleD - D) * 0.11;
    vit += (Math.abs(Y - avant) - vit) * 0.22;

    const d = borne(D, 0, 1);
    const h = melange(PASTILLE_H, AMAS_H, d);

    bouton.style.width  = melange(PASTILLE_L, AMAS_L, d).toFixed(1) + 'px';
    bouton.style.height = h.toFixed(1) + 'px';
    bouton.style.left   = melange(12, 0, Math.min(1, d * 1.7)).toFixed(1) + 'px';

    // Ancre par le HAUT dans les deux sens : ainsi l'amas se disperse vers
    // le bas et ne peut jamais remonter jusqu'au cadran Calories.
    const v = Math.min(1, vit / 9);
    bouton.style.transform =
      `translateY(${Y.toFixed(1)}px) scale(${(1 - v * 0.12).toFixed(3)},${(1 + v * 0.22).toFixed(3)})`;

    corps.style.opacity      = (1 - d * 0.99).toFixed(3);
    corps.style.borderRadius = melange(23, 7, d).toFixed(1) + 'px';
    contenu.style.opacity    = borne(1 - d * 2.8, 0, 1).toFixed(3);

    const tps = performance.now() / 1000;
    perles.forEach((p, i) => {
      const f = PROFIL[i];
      const e = borne((d - f.r) / (1 - f.r), 0, 1);
      const taille = f.d * (0.30 + 0.70 * e);
      p.style.width   = taille.toFixed(1) + 'px';
      p.style.height  = (taille * 1.16).toFixed(1) + 'px';
      p.style.left    = (f.x + (1 - e) * 4).toFixed(1) + 'px';
      p.style.top     = (f.t * (h - taille)).toFixed(1) + 'px';
      p.style.opacity = (e * e).toFixed(3);
      const onde = Math.sin(tps * (0.7 + i * 0.13) + i) * 1.7 * e;
      p.style.transform = `translateY(${onde.toFixed(2)}px)`;
    });

    semer(Y, d);
    boucle = requestAnimationFrame(peindre);
  }

  sc.addEventListener('scroll', calculer, { passive: true });
  window.addEventListener('resize', calculer);
  calculer();
  boucle = requestAnimationFrame(peindre);
}

export function arreterGoutte() {
  if (boucle) { cancelAnimationFrame(boucle); boucle = null; }
}
