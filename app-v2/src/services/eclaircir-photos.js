// ============================================================
// PHOTOS D'EXERCICES : CORRECTION DE LUMINOSITE
//
// Raci, 7/10 : « les images sont tres sombres ». Mesure faite sur les
// 372 photos du catalogue (free-exercise-db, premiere vue) : luminance
// moyenne mediane 67/255, et 268 photos sur 372 sous 80. Ce sont des
// photos de salle sous-exposees ; l'ecran de seance ajoutait en plus
// un voile noir de 48 a 94 %.
//
// Une correction GAMMA plutot que brightness() : elle releve les
// ombres et les tons moyens sans bruler les blancs (255 reste 255).
// brightness(1.3) donnait la meme mediane mais grisait les fonds et
// cramait les maillots blancs — c'est ce que la passe du 15/08 avait
// constate en s'arretant a 1,08.
//   exposant 0,65 : mediane 67 -> 99, photos sous 80 : 268 -> 83.
//
// Le filtre SVG est pose une seule fois dans le document, au
// chargement du module, AVANT tout rendu qui le reference : une
// reference CSS vers un filtre absent peut masquer l'element.
// color-interpolation-filters="sRGB" : sans lui le calcul se fait en
// lumiere lineaire et l'exposant n'a plus l'effet mesure.
// ============================================================
export const ID_FILTRE_PHOTOS = 'bf-eclaircir';
const EXPOSANT = 0.65;

export function poserFiltrePhotos() {
  if (typeof document === 'undefined' || !document.body) return;
  if (document.getElementById(ID_FILTRE_PHOTOS)) return;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  const filtre = document.createElementNS(ns, 'filter');
  filtre.setAttribute('id', ID_FILTRE_PHOTOS);
  filtre.setAttribute('color-interpolation-filters', 'sRGB');
  const transfert = document.createElementNS(ns, 'feComponentTransfer');
  for (const canal of ['feFuncR', 'feFuncG', 'feFuncB']) {
    const f = document.createElementNS(ns, canal);
    f.setAttribute('type', 'gamma');
    f.setAttribute('amplitude', '1');
    f.setAttribute('exponent', String(EXPOSANT));
    f.setAttribute('offset', '0');
    transfert.appendChild(f);
  }
  filtre.appendChild(transfert);
  svg.appendChild(filtre);
  document.body.appendChild(svg);
}

poserFiltrePhotos();
