// Banc d'essai de la carte de seance a partager (13/11).
import '../src/styles.css';
import { creerCarte } from '../src/services/carte-partage.js';
creerCarte({ iso: '2026-11-13', titre: 'Jour 1 — Pecs / Triceps', duree: 3120, muscles: ['pecs', 'triceps', 'epaules'],
  exos: [{ series: [1, 2, 3, 4] }, { series: [1, 2, 3] }, { series: [1, 2, 3] }, { series: [1, 2, 3, 4] }, { series: [1, 2, 3] }] })
  .then((b) => { const im = document.createElement('img'); im.id = 'carte'; im.src = URL.createObjectURL(b); im.style.width = '100%'; document.getElementById('app').appendChild(im); });
