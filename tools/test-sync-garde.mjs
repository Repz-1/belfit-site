// Le garde-fou d'ecriture est le vrai module utilise par sync.js.
import { readFileSync } from 'fs';
import { ecritureAutorisee } from '../app-v2/src/services/sync-garde.js';

let code = 0;
const ok = (c, m) => { console.log((c ? 'ok ' : 'KO ') + m); if (!c) code = 1; };

ok(ecritureAutorisee('a', 'a', false) === false, 'avant lecture cloud : pas d ecriture');
ok(ecritureAutorisee('a', 'b', true) === false, 'autre compte : pas d ecriture');
ok(ecritureAutorisee('a', 'a', true) === true, 'meme compte apres lecture : ecriture');

const sync = readFileSync(new URL('../app-v2/src/services/sync.js', import.meta.url), 'utf8');
ok(sync.includes('ecritureAutorisee(uid, uidEtat, cloudLu)'), 'sync.js appelle le module teste');
ok(sync.includes('enableIndexedDbPersistence'), 'persistance locale reste dans un essai isole');
process.exit(code);
