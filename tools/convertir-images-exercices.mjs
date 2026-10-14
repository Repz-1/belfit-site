#!/usr/bin/env node
/**
 * Photos d'exercices hebergees chez nous, eclaircies une par une.
 *
 * Source : free-exercise-db (github.com/yuhonas/free-exercise-db),
 * licence Unlicense (domaine public) — copie, modification et
 * redistribution libres, sans attribution obligatoire.
 *
 * Pour chaque imgId cite dans app-v2/src/data/exercices.js et chaque
 * vue (0 = depart, 1 = fin), produit dans img/exercices/<imgId>/ :
 *   <n>-240.webp : petit cote 240 px  (vignette 116 px de la liste, x2)
 *   <n>-640.webp : largeur 640 px     (fiche et seance guidee)
 *
 * Eclaircissement PAR IMAGE (Raci, 7/10 : « les images sont tres
 * sombres » ; luminance mediane du catalogue 67/255) :
 *   1. niveaux : point noir = 0,5e centile (plafonne a 24, pour ne
 *      pas boucher les ombres), point blanc = 99,5e centile (jamais
 *      sous 200, pour ne pas bruler une photo deja claire) ;
 *   2. gamma calcule pour amener la mediane vers CIBLE, borne a
 *      [0,42 ; 1] : on n'assombrit jamais, et l'exposant minimal evite
 *      les noirs laiteux sur les photos les plus sombres ;
 *   3. legere remontee de saturation (le gamma desature).
 * Une meme table est appliquee aux trois canaux : les teintes restent.
 *
 *   npm i --no-save sharp      (comme convertir-images-aliments.mjs)
 *   node tools/convertir-images-exercices.mjs [--force]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(ICI, '..');
const SORTIE = path.join(RACINE, 'img', 'exercices');
const CACHE = path.join(RACINE, '.cache-exercices'); // brut telecharge, hors depot
const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const CIBLE = 116;
const QUALITE = { 240: 66, 640: 62 };
const FORCE = process.argv.includes('--force');

const src = fs.readFileSync(path.join(RACINE, 'app-v2/src/data/exercices.js'), 'utf8');
const ids = [...new Set([...src.matchAll(/imgId:\s*'([^']+)'/g)].map(m => m[1]))].sort();
console.log(`${ids.length} exercices, ${ids.length * 2} vues.`);

async function telecharger(id, n) {
  const f = path.join(CACHE, id, n + '.jpg');
  if (fs.existsSync(f)) return f;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  for (let essai = 1; essai <= 3; essai++) {
    const r = await fetch(BASE + id + '/' + n + '.jpg');
    if (r.ok) { fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); return f; }
    if (r.status === 404) return null;
    await new Promise(ok => setTimeout(ok, 800 * essai));
  }
  return null;
}

function centile(hist, total, p) {
  let cumul = 0;
  for (let v = 0; v < 256; v++) { cumul += hist[v]; if (cumul >= total * p) return v; }
  return 255;
}

// Table de correction pour une image (calculee sur sa version 640).
function table(data, canaux) {
  const hist = new Uint32Array(256);
  const n = data.length / canaux;
  for (let i = 0; i < data.length; i += canaux) {
    hist[Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])]++;
  }
  const noir = Math.min(24, centile(hist, n, 0.005));
  const blanc = Math.max(200, centile(hist, n, 0.995));
  const niv = v => Math.min(1, Math.max(0, (v - noir) / (blanc - noir)));
  // mediane apres niveaux
  const med0 = centile(hist, n, 0.5);
  const med = Math.max(1, niv(med0) * 255);
  let g = Math.log(CIBLE / 255) / Math.log(med / 255);
  g = Math.min(1, Math.max(0.42, g));
  const lut = new Uint8Array(256);
  for (let v = 0; v < 256; v++) lut[v] = Math.round(255 * Math.pow(niv(v), g));
  return { lut, noir, blanc, g, avant: med0 };
}

function lum(data, canaux) {
  let s = 0;
  for (let i = 0; i < data.length; i += canaux) s += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  return s / (data.length / canaux);
}

const stats = [];
let poids = { 240: 0, 640: 0 }, manquants = [];
let file = [];
for (const id of ids) for (const n of [0, 1]) file.push([id, n]);

async function traiter([id, n]) {
  const d640 = path.join(SORTIE, id, `${n}-640.webp`);
  const d240 = path.join(SORTIE, id, `${n}-240.webp`);
  const brut = await telecharger(id, n);
  if (!brut) { manquants.push(id + '/' + n); return; }
  if (!FORCE && fs.existsSync(d640) && fs.existsSync(d240)) {
    poids[640] += fs.statSync(d640).size; poids[240] += fs.statSync(d240).size; return;
  }
  fs.mkdirSync(path.dirname(d640), { recursive: true });
  const { data, info } = await sharp(brut).resize({ width: 640, withoutEnlargement: true })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { lut, g, avant } = table(data, info.channels);
  const avantMoy = lum(data, info.channels);
  for (let i = 0; i < data.length; i++) data[i] = lut[data[i]];
  const apresMoy = lum(data, info.channels);
  const corrige = () => sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .modulate({ saturation: 1.08 });
  await corrige().webp({ quality: QUALITE[640], effort: 5 }).toFile(d640);
  await corrige().resize({ width: 240, height: 240, fit: 'outside' })
    .webp({ quality: QUALITE[240], effort: 5 }).toFile(d240);
  poids[640] += fs.statSync(d640).size; poids[240] += fs.statSync(d240).size;
  stats.push({ id, n, avant: Math.round(avantMoy), apres: Math.round(apresMoy), g: +g.toFixed(2), medianeAvant: avant });
}

// 8 telechargements en parallele : poli envers GitHub, assez rapide.
const ouvriers = Array.from({ length: 8 }, async () => { while (file.length) await traiter(file.shift()); });
await Promise.all(ouvriers);

stats.sort((a, b) => a.avant - b.avant);
fs.writeFileSync(path.join(CACHE, 'stats.json'), JSON.stringify(stats, null, 1));
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] ?? 0; };
console.log(`Vues traitees cette fois : ${stats.length}. Manquantes a la source : ${manquants.length} ${manquants.join(', ')}`);
if (stats.length) {
  console.log(`Luminance moyenne, mediane du catalogue : ${med(stats.map(s => s.avant))} -> ${med(stats.map(s => s.apres))}`);
  console.log(`Vues sous 80 : ${stats.filter(s => s.avant < 80).length} -> ${stats.filter(s => s.apres < 80).length}`);
}
console.log(`Poids : 240 = ${(poids[240] / 1048576).toFixed(1)} Mo, 640 = ${(poids[640] / 1048576).toFixed(1)} Mo`);
