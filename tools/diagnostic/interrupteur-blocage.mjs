// INTERRUPTEUR config/acces { blocage } — lecture, allumage ou extinction.
// Ecrit seulement si inputs.confirme === 'OUI' et action allumer/eteindre.
// Ne touche a rien d'autre (aucun compte, aucun acces). Journal : etat seulement.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const inp = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')).inputs || {};
const action = String(inp.action || 'lire');
if (!['lire', 'allumer', 'eteindre'].includes(action)) { console.error('action invalide'); process.exit(2); }
const ecrire = action !== 'lire' && String(inp.confirme || '') === 'OUI';

const exiger = createRequire(new URL('../../functions/package.json', import.meta.url));
const admin = exiger('firebase-admin');
admin.initializeApp({ projectId: 'repz-baf60' });
const ref = admin.firestore().doc('config/acces');

const etat = async () => { const d = await ref.get(); return d.exists ? 'existe, blocage=' + (d.get('blocage') === true) : 'absent (blocage=false)'; };
console.log('Avant : config/acces ' + await etat());
if (action === 'lire') { console.log('Mode lecture : rien ecrit.'); process.exit(0); }
if (!ecrire) { console.log('Simulation : ecrirait blocage=' + (action === 'allumer') + ' (confirme=OUI pour ecrire).'); process.exit(0); }
await ref.set({ blocage: action === 'allumer', majLe: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
console.log('Ecrit : blocage=' + (action === 'allumer'));
console.log('Apres : config/acces ' + await etat());
