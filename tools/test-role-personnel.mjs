// Encodage : la date « sans fin » ne rouvre pas un client. Seul le personnel confirme.
import { saisiePersonnel, encodageFermePour } from '../app-v2/src/services/role-personnel.js';

let code = 0;
const ok = (c, m) => { console.log((c ? 'ok ' : 'KO ') + m); if (!c) code = 1; };

ok(saisiePersonnel({ email: 'coach@belfit.be', emailVerified: true }) === true, 'coach confirme');
ok(saisiePersonnel({ email: 'CONTACT@belfit.be', emailVerified: true }) === true, 'contact confirme, casse ignoree');
ok(saisiePersonnel({ email: 'coach@belfit.be', emailVerified: false }) === false, 'coach non confirme');
ok(saisiePersonnel({ email: 'client@example.test', emailVerified: true }) === false, 'client confirme n est pas le personnel');
ok(saisiePersonnel({}) === false, 'sans session');

ok(encodageFermePour(false, false) === true, 'drapeau off, client : ferme');
ok(encodageFermePour(false, true) === false, 'drapeau off, personnel : ouvert');
ok(encodageFermePour(true, false) === false, 'drapeau on : ouvert pour un client');

const src = await import('fs').then(fs => fs.readFileSync(new URL('../app-v2/src/store/acces-nutrition.js', import.meta.url), 'utf8'));
ok(!/estCompteIllimite\(a\.jusqu\)/.test(src), 'encodageFerme ne s ouvre plus sur la date sans fin');
ok(src.includes('saisiePersonnel'), 'encodageFerme passe par le role');
process.exit(code);
