// Banc d'essai de « Ma progression » (13/11) : douze seances fictives.
import { render } from 'preact';
import '../src/styles.css';
import { seances } from '../src/store/seances.js';
import { MaProgression } from '../src/components/MaProgression.jsx';

const iso = (j) => { const d = new Date(); d.setDate(d.getDate() - j); return d.toISOString().slice(0, 10); };
const l = [];
for (let k = 0; k < 12; k++) {
  const w = 50 + Math.round(k * 1.5 / 2.5) * 2.5;
  l.push({ id: 's' + k, iso: iso(84 - k * 7), titre: 'Pecs', exos: [
    { nom: 'Développé Couché (Barre)', mKey: 'pecs', series: [{ w: String(w), r: '10' }, { w: String(w), r: String(9 - (k % 2)) }, { w: String(w - 5), r: '10' }] },
    { nom: 'Pompes', mKey: 'pecs', series: [{ w: '', r: String(15 + k) }] },
  ] });
}
seances.value = l.reverse();
render(<MaProgression />, document.getElementById('app'));
