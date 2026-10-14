// ============================================================
// PHOTO D'EXERCICE
// Les photos sont servies par BelFit (img/exercices/, a la racine du
// site comme img/aliments/), deja redimensionnees en WebP et
// eclaircies une par une par tools/convertir-images-exercices.mjs.
// Raci, 7/10 : « les images sont tres sombres » ; avant, chaque
// vignette etait un JPEG de 850 px tire de GitHub, puis eclairci au
// rendu par un filtre identique pour toutes.
//
// Deux tailles, choisies par l'usage plutot que par srcset : la
// vignette (116 px, cadree en cover) n'a besoin que du petit cote 240,
// la fiche et la seance de la largeur 640.
//
// SECOURS : si le fichier local manque (nouvel exercice pas encore
// converti), l'image retombe sur la photo d'origine distante, et
// SEULEMENT dans ce cas recoit le filtre gamma au rendu
// (services/eclaircir-photos.js) — une photo locale n'est jamais
// eclaircie deux fois.
// ============================================================
import { useState, useEffect } from 'preact/hooks';
import { IMG_BASE } from '../data/exercices.js';
import '../services/eclaircir-photos.js';
import '../styles/photo-exo.css';

// Changer ce numero quand les images sont regenerees : l'URL change,
// le cache du service worker (cache d'abord) ne sert plus l'ancienne.
export const PHOTOS_VERSION = 1;
export const PHOTOS_BASE = '/img/exercices/';

export function urlPhoto(imgId, n = 0, taille = 640) {
  return `${PHOTOS_BASE}${imgId}/${n}-${taille}.webp?v=${PHOTOS_VERSION}`;
}
export function urlPhotoDistante(imgId, n = 0) {
  return `${IMG_BASE}${imgId}/${n}.jpg`;
}

// Dimensions intrinseques (photos source 3:2) : reservent la place
// avant le chargement, sans saut de mise en page.
const DIM = { 240: [360, 240], 640: [640, 427] };

export function PhotoExo({ imgId, n = 0, taille = 640, class: classe = '', alt = '', prioritaire = false }) {
  const [secours, setSecours] = useState(false);
  useEffect(() => setSecours(false), [imgId, n, taille]);
  if (!imgId) return null;
  const [w, h] = DIM[taille] || DIM[640];
  return (
    <img
      class={'photo-exo ' + classe}
      src={secours ? urlPhotoDistante(imgId, n) : urlPhoto(imgId, n, taille)}
      width={w} height={h} alt={alt} draggable={false}
      loading={prioritaire ? 'eager' : 'lazy'} decoding="async"
      data-secours={secours ? '1' : undefined}
      onError={() => { if (!secours) setSecours(true); }}
    />
  );
}
