import { signal, computed, effect } from '@preact/signals';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';

// ============================================================
// STORE STATS v2
// weightLog : [{iso:'2026-07-17', kg:97}]  (pesees)
// histoJours : {'2026-07-17': {kcal, prot, carbs, lip}}  (journees cloturees)
// ============================================================

export const weightLog = signal([]);
export const histoJours = signal({});

// Apercu local : meme convention que belfit_v2_apercu_premium, pour
// verifier les ecrans de statistiques sans dependre de Firestore.
let apercuStats = false;
try {
  const faux = localStorage.getItem('belfit_v2_apercu_stats');
  if (faux) {
    const d = JSON.parse(faux);
    if (d && d.histoJours) histoJours.value = d.histoJours;
    if (d && d.weightLog) weightLog.value = d.weightLog;
    apercuStats = true;
  }
} catch (e) { /* stockage indisponible : chemin normal */ }
let uidSt = null, pretSt = false;

effect(() => {
  // En apercu, les donnees viennent du stockage local : la
  // synchronisation les ecraserait au premier rendu.
  if (apercuStats) return;
  const u = identite.value;
  if (!u) { pretSt = false; return; }
  if (u === uidSt && pretSt) return;
  uidSt = u; pretSt = false;
  chargerDonnees(u).then(d => {
    if (uidSt !== u) return;
    weightLog.value = (d && d.weightLog) || [];
    // FUSION, pas remplacement. La bascule de journee (journal.js)
    // peut archiver la veille dans histoJours AVANT que ce chargement
    // ne se termine : chaque module fait son propre appel Firestore
    // et l'ordre des reponses n'est pas garanti. Ecraser avec le
    // disque detruisait alors l'archive fraiche — les repas ayant
    // deja ete remis a zero et sauvegardes, la journee entiere etait
    // perdue. Vecu par Raci au matin du 4 aout : « tout s'est
    // efface ». Ce qui est en memoire est plus recent que le disque,
    // il prime.
    histoJours.value = { ...((d && d.histoJours) || {}), ...histoJours.value };
    pretSt = true;
    // Si une archive a ete posee avant ce point, elle n'a jamais ete
    // sauvegardee (pretSt etait faux) : on la persiste maintenant.
    if (Object.keys(histoJours.value).length !== Object.keys((d && d.histoJours) || {}).length) {
      sauvegarder(u, { weightLog: weightLog.value, histoJours: histoJours.value });
    }
  });
});

effect(() => {
  if (apercuStats) return;
  const w = weightLog.value, h = histoJours.value;
  const u = identite.value;
  if (!u || !pretSt) return;
  sauvegarder(u, { weightLog: w, histoJours: h });
});

export function ajouterPesee(kg) {
  // Meme format d'entree que la v1 (app.html / saveWeightNutri) :
  // { iso, date (jj mois court fr), weight }
  const val = parseFloat(kg) || 0;
  const iso = new Date().toISOString().slice(0, 10);
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const sansAuj = weightLog.value.filter(p => p.iso !== iso);
  weightLog.value = [...sansAuj, { iso, date, weight: val }]
    .sort((a, b) => a.iso.localeCompare(b.iso));
}

export function enregistrerJour(totaux, isoForce) {
  // isoForce : utilise par la bascule automatique de journee, qui archive
  // la journee ECOULEE (donc pas la date du jour).
  const iso = isoForce || new Date().toISOString().slice(0, 10);
  // Jamais une journee vide a la place d'une journee deja enregistree
  // (double clic sur « Cloturer la journee », 21/10).
  if (!(Math.round(totaux?.kcal || 0) > 0)) return false;
  histoJours.value = { ...histoJours.value, [iso]: {
    kcal: Math.round(totaux.kcal), prot: Math.round(totaux.prot),
    carbs: Math.round(totaux.carbs), lip: Math.round(totaux.lip),
  }};
  return true;
}

// --- Derives ---

