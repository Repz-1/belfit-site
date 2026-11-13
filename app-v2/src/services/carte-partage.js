import { SILHOUETTE_FACE, SILHOUETTE_DOS, SILHOUETTE_FACE_F, SILHOUETTE_DOS_F } from '../data/silhouette.js';
import { COULEURS_ATHLETE } from '../components/Stats.jsx';
import { GROUPES } from '../store/entrainement.js';
import { sexe } from '../store/perso.js';

// ============================================================
// CARTE DE SEANCE A PARTAGER — Raci, 13/11 (idee 4).
// Une image 1080 x 1920 (format story) : logo, titre, les deux
// silhouettes coloriees sur les muscles travailles, et le recap.
// Dessinee dans un canvas a partir des MEMES traces que l'app
// (data/silhouette.js) : aucune image a telecharger, ca marche hors
// ligne. Le recap reste un constat (duree, exercices, series).
// ============================================================

const W = 1080, H = 1920;
const CREME = '#F8F2E8', JAUNE = '#FAC408', FOND = '#151515', ETEINT = '#34302B';
const POLICE = "'Satoshi', -apple-system, 'Segoe UI', Roboto, sans-serif";
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function chargerImage(src) {
  return new Promise((ok) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => ok(null);
    im.src = src;
  });
}

function silhouette(ctx, chemins, x, y, echelle, actifs) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(echelle, echelle);
  chemins.forEach((p) => {
    const on = p.g !== 'tete' && actifs.has(p.g);
    ctx.fillStyle = on ? (COULEURS_ATHLETE[p.g] || JAUNE) : ETEINT;
    ctx.fill(new Path2D(p.d));
  });
  ctx.restore();
}

function texteAjuste(ctx, txt, maxL, taille, poids) {
  let t = taille;
  ctx.font = `${poids} ${t}px ${POLICE}`;
  while (ctx.measureText(txt).width > maxL && t > 40) { t -= 4; ctx.font = `${poids} ${t}px ${POLICE}`; }
  return t;
}

/** Les chiffres du recap : [{ v, l }]. */
export function chiffresDe(s) {
  const exos = (s.exos || []).filter((e) => (e.series || e.sets || []).length);
  const series = exos.reduce((n, e) => n + (e.series || e.sets || []).length, 0);
  const min = s.duree ? Math.max(1, Math.round(s.duree / 60)) : 0;
  return [
    min ? { v: String(min), l: 'minutes' } : null,
    { v: String(exos.length), l: exos.length > 1 ? 'exercices' : 'exercice' },
    { v: String(series || s.nbSeries || 0), l: 'séries' },
  ].filter(Boolean);
}

/** Dessine la carte et la rend en PNG (Blob). */
export async function creerCarte(s) {
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // Fond : noir du logo, avec un halo chaud discret derriere les corps.
  ctx.fillStyle = FOND; ctx.fillRect(0, 0, W, H);
  const halo = ctx.createRadialGradient(W / 2, 980, 60, W / 2, 980, 760);
  halo.addColorStop(0, 'rgba(248,106,12,0.20)');
  halo.addColorStop(1, 'rgba(21,21,21,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);

  const logo = await chargerImage('/belfit-logo-bf.png');
  if (logo) ctx.drawImage(logo, 80, 96, 200, 200 * logo.height / logo.width);
  ctx.textBaseline = 'alphabetic';

  // Date et titre.
  const d = new Date((s.iso || '') + 'T12:00:00');
  const date = isNaN(d) ? '' : JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()];
  ctx.fillStyle = 'rgba(248,242,232,0.62)';
  ctx.font = `600 40px ${POLICE}`;
  ctx.fillText(date.charAt(0).toUpperCase() + date.slice(1), 80, 400);
  const titre = String(s.titre || 'Séance').replace(/^.*?[—–-]\s+/, '') || 'Séance';
  ctx.fillStyle = CREME;
  texteAjuste(ctx, titre, W - 160, 96, 800);
  ctx.fillText(titre, 80, 500);

  // Les deux silhouettes (viewBox 120 x 300), cote a cote.
  const actifs = new Set(s.muscles || []);
  const femme = sexe.value === 'f';
  const ech = 2.75, larg = 120 * ech, haut = 300 * ech;
  const ecart = 70, x0 = (W - (2 * larg + ecart)) / 2, y0 = 580;
  silhouette(ctx, femme ? SILHOUETTE_FACE_F : SILHOUETTE_FACE, x0, y0, ech, actifs);
  silhouette(ctx, femme ? SILHOUETTE_DOS_F : SILHOUETTE_DOS, x0 + larg + ecart, y0, ech, actifs);

  // Muscles travailles : pastille de couleur + nom.
  const noms = GROUPES.filter((g) => actifs.has(g.k));
  let yM = y0 + haut + 70;
  ctx.font = `600 34px ${POLICE}`;
  const largeurs = noms.map((g) => 30 + ctx.measureText(g.label).width);
  const total = largeurs.reduce((a, b) => a + b, 0) + Math.max(0, noms.length - 1) * 40;
  let xM = (W - total) / 2;
  noms.forEach((g, i) => {
    ctx.fillStyle = COULEURS_ATHLETE[g.k] || JAUNE;
    ctx.beginPath(); ctx.arc(xM + 9, yM - 11, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = CREME; ctx.fillText(g.label, xM + 30, yM);
    xM += largeurs[i] + 40;
  });

  // Chiffres.
  const ch = chiffresDe(s);
  const yC = 1700, colL = (W - 160) / ch.length;
  ch.forEach((o, i) => {
    const cx = 80 + colL * i + colL / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = CREME; ctx.font = `800 88px ${POLICE}`;
    ctx.fillText(o.v, cx, yC);
    ctx.fillStyle = 'rgba(248,242,232,0.62)'; ctx.font = `600 32px ${POLICE}`;
    ctx.fillText(o.l, cx, yC + 52);
  });
  ctx.textAlign = 'left';
  // Fine ligne jaune et adresse.
  ctx.fillStyle = JAUNE; ctx.fillRect(80, 1560, 64, 6);
  ctx.fillStyle = 'rgba(248,242,232,0.62)'; ctx.font = `600 34px ${POLICE}`;
  ctx.textAlign = 'right'; ctx.fillText('belfit.be', W - 80, 1574); ctx.textAlign = 'left';

  return new Promise((ok) => c.toBlob((b) => ok(b), 'image/png'));
}

/** Partage natif si le telephone le permet, sinon telechargement. */
export async function partagerCarte(blob, titre) {
  const fichier = new File([blob], 'belfit-seance.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
      await navigator.share({ files: [fichier], title: titre || 'Ma séance BelFit' });
      return 'partage';
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'annule';
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'belfit-seance.png';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'telecharge';
}
