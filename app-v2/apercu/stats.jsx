// Banc d'essai de la page STATS uniquement, avec des donnees semees.
// L'apercu app.html montre la page vide : trois cartes « aucune donnee »,
// ce qui ne dit rien du visuel reel. Ici on seme des pesees, des
// journees cloturees, des muscles et des series pour voir la page pleine.
import { render } from 'preact';
import '../src/styles.css';
import '../src/styles/design-system.css';
import '../src/styles/journal-socle.css';
import { utilisateur, authPrete } from '../src/services/firebase.js';
import { donneesPretes, objectifs, repas, calculBaseFait } from '../src/store/journal.js';
import { weightLog, histoJours } from '../src/store/stats.js';
import { muscleLog } from '../src/store/entrainement.js';
import { setLog } from '../src/components/SeanceTracker.jsx';
import { App } from '../src/main.jsx';
import { estPremium } from '../src/components/PremiumPage.jsx';
import { ongletActif } from '../src/components/BottomNav.jsx';
import { entrainementCoach } from '../src/components/BelfitPlus.jsx';
import { carnetCoach } from '../src/store/carnet-coach.js';
// 28/11 : « Mes seances passees » (tools/test-seances-passees.mjs seme le programme et le carnet).
window.__banc = { entrainementCoach, carnetCoach };

const iso = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

utilisateur.value = { uid: 'test', email: 'coach@belfit.be', displayName: 'Raci', metadata: { creationTime: new Date(Date.now() - 40 * 864e5).toISOString() } };
objectifs.value = { kcal: 3562, prot: 222, carbs: 485, lip: 72 };
repas.value = [];

// --- Pesees : 14 valeurs sur 28 jours, prise de masse lente ---
const pesees = [];
for (let i = 28; i >= 0; i -= 2) pesees.push({ iso: iso(i), kg: +(95.4 + (28 - i) * 0.055 + (i % 4 ? 0.25 : -0.2)).toFixed(1) });
weightLog.value = pesees;

// --- Journees cloturees : 12 des 14 derniers jours ---
const h = {};
[0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13].forEach((i, k) => {
  h[iso(i)] = { kcal: 3300 + ((k * 137) % 520), prot: 205 + (k % 5) * 6, carbs: 450 + (k % 7) * 9, lip: 66 + (k % 4) * 4 };
});
histoJours.value = h;

// --- Muscles travailles ---
muscleLog.value = {
  [iso(0)]: ['pecs', 'triceps'], [iso(1)]: ['dos', 'biceps'], [iso(2)]: ['repos'],
  [iso(3)]: ['jambes'], [iso(4)]: ['epaules', 'abdos'], [iso(5)]: ['pecs', 'dos'],
  [iso(6)]: ['repos'], [iso(7)]: ['jambes', 'abdos'], [iso(9)]: ['dos', 'biceps'],
  [iso(11)]: ['pecs', 'epaules'], [iso(13)]: ['jambes'],
};

// --- Series notees : progression sur un meme exercice ---
const dc = (i, kg) => ({ ex: 'Développé couché (Barre)', series: [{ kg, reps: 8 }, { kg: kg - 5, reps: 10 }, { kg: kg - 10, reps: 12 }] });
const sq = (i, kg) => ({ ex: 'Squat (Barre)', series: [{ kg, reps: 6 }, { kg: kg - 10, reps: 8 }] });
setLog.value = {
  [iso(13)]: [dc(13, 82.5), sq(13, 110)],
  [iso(11)]: [dc(11, 85)],
  [iso(9)]: [sq(9, 115)],
  [iso(7)]: [dc(7, 85), sq(7, 117.5)],
  [iso(5)]: [dc(5, 87.5)],
  [iso(3)]: [sq(3, 120)],
  [iso(1)]: [dc(1, 90), sq(1, 122.5)],
  [iso(0)]: [dc(0, 90)],
};

authPrete.value = true;
donneesPretes.value = true;
calculBaseFait.value = true;
ongletActif.value = 'stats';

const faux = utilisateur.value;
const gele = { w: weightLog.value, h: histoJours.value, m: muscleLog.value, s: setLog.value };
setInterval(() => {
  if (!utilisateur.value) utilisateur.value = faux;
  authPrete.value = true;
  donneesPretes.value = true;
  calculBaseFait.value = true;
  estPremium.value = true;
  // La synchronisation Firestore repond en differe et remet les
  // signaux a vide : on les maintient le temps du test.
  if (!weightLog.value.length) weightLog.value = gele.w;
  if (!Object.keys(histoJours.value).length) histoJours.value = gele.h;
  if (!Object.keys(muscleLog.value).length) muscleLog.value = gele.m;
  if (!Object.keys(setLog.value).length) setLog.value = gele.s;
}, 100);

render(<App />, document.getElementById('app'));
