// Raci (t354u) : « Tu retire l'option photo de plat ». Verifie que l'app
// n'appelle plus analyserPhoto et que scan + vocal restent en place.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
let ko = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'KO  ') + m); if (!c) ko++; };
function fichiers(d) { return readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? fichiers(p) : [p]; }); }
const src = fichiers('app-v2/src').filter(f => /\.(jsx?|html)$/.test(f));
ok(!existsSync('app-v2/src/components/PhotoModal.jsx'), 'PhotoModal.jsx supprime');
ok(!src.some(f => /analyserPhoto|PhotoModal|setIaPhoto/.test(readFileSync(f, 'utf8'))), 'plus aucune reference photo de plat dans app-v2/src');
const mc = readFileSync('app-v2/src/components/MealCard.jsx', 'utf8');
ok(!/Photo d'assiette/.test(mc), 'bouton « Photo d\'assiette » retire');
ok(/Scanner un code-barres/.test(mc) && /setScan\(true\)/.test(mc), 'scan code-barres conserve');
ok(/Ajout vocal/.test(mc) && /VocalModal/.test(mc), 'vocal conserve');
process.exit(ko ? 1 : 0);
