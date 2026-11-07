// Saisie alimentaire : aucun role ni aucune date ne rouvre le drapeau.
import { readFileSync } from 'fs';
import { encodageFermePour } from '../app-v2/src/store/acces-nutrition.js';

let code = 0;
const ok = (c, m) => { console.log((c ? 'ok ' : 'KO ') + m); if (!c) code = 1; };

ok(encodageFermePour(false) === true, 'drapeau off : ferme');
ok(encodageFermePour(true) === false, 'drapeau on : ouvert');
ok(encodageFermePour(false) === true, 'aucun second argument de role');

const src = readFileSync(new URL('../app-v2/src/store/acces-nutrition.js', import.meta.url), 'utf8');
ok(!src.includes('saisiePersonnel') && !src.includes('role-personnel'), 'plus d exception de role');
ok(!/estCompteIllimite\(/.test(src.split('export const encodageFerme')[1] || ''), 'la date sans fin ne rouvre pas encodageFerme');
ok(src.includes('cloudNutritionPermis'), 'la synchro ne depend pas de ce drapeau');
const journal = readFileSync(new URL('../app-v2/src/store/journal.js', import.meta.url), 'utf8');
ok(/function semerPlan[\s\S]*lectureSeule\.peek\(\)/.test(journal) && !/function semerPlan[\s\S]{0,400}encodageFerme/.test(journal), 'semerPlan livre le plan meme si la saisie est fermee');
process.exit(code);
