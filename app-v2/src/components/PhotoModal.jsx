import { portionJournal } from '../services/coach-local.js';
import { useState, useRef } from 'preact/hooks';
import { auth } from '../services/firebase.js';
import { DB, NOMS_ALIMENTS } from '../data/aliments.js';
import { repas, ajouterIngredient } from '../store/journal.js';
import { createPortal } from 'preact/compat';

const API = 'https://europe-west1-repz-baf60.cloudfunctions.net/analyserPhoto';

// Reduit la photo a 1024px max et l'encode en JPEG : une photo de
// telephone fait 3-10 Mo, inutile (et trop lourd) pour l'analyse.
async function compresser(fichier) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i); i.onerror = rej;
    i.src = URL.createObjectURL(fichier);
  });
  const max = 1024;
  const ratio = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * ratio);
  c.height = Math.round(img.height * ratio);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  const dataUrl = c.toDataURL('image/jpeg', 0.8);
  return dataUrl.split(',')[1] || '';
}

// Meme appariement que le vocal : nom detecte -> aliment de la base
function trouverAliment(nom) {
  const n = (nom || '').toLowerCase().trim();
  if (!n) return null;
  if (DB[nom]) return nom;
  const exact = NOMS_ALIMENTS.find(a => a.toLowerCase() === n);
  if (exact) return exact;
  const contient = NOMS_ALIMENTS.find(a => a.toLowerCase().includes(n) || n.includes(a.toLowerCase()));
  return contient || null;
}

export function PhotoModal({ fermer, repasId }) {
  const [etat, setEtat] = useState('pret'); // pret | analyse | resultat
  const [props, setProps] = useState([]);
  const [msg, setMsg] = useState('');
  const champ = useRef(null);

  const analyser = async (e) => {
    const fichier = e.target.files && e.target.files[0];
    // Vide le champ TOUT DE SUITE : sinon, reprendre la meme photo
    // apres une erreur ne redeclenche pas onChange (valeur identique)
    // et l'ecran semble ne rien faire.
    if (champ.current) champ.current.value = '';
    if (!fichier) return;
    setEtat('analyse'); setMsg('Analyse de la photo…');
    let b64 = '';
    try { b64 = await compresser(fichier); } catch (err) { setMsg('Photo illisible'); setEtat('pret'); return; }
    let token = '';
    try { token = await auth.currentUser.getIdToken(); } catch (err) {}
    try {
      const rep = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ imageBase64: b64, mimeType: 'image/jpeg' }),
      });
      if (rep.status === 403) { setMsg('Réservé aux membres Premium'); setEtat('pret'); return; }
      // Quota IA du jour atteint (02/10) : compte par le serveur.
      if (rep.status === 429) { let lim = ''; try { lim = (await rep.json()).limite || ''; } catch (e) {} setMsg('Tu as utilisé tes ' + lim + ' analyses IA d\'aujourd\'hui. Reviens demain.'); setEtat('pret'); return; }
      if (rep.status === 404) { setMsg('Service pas encore activé'); setEtat('pret'); return; }
      if (!rep.ok) {
        // Meme fonction Gemini que le vocal, donc memes pannes : un
        // 502 signifie « credits epuises » ou « quota atteint », pas
        // une erreur que l'utilisateur puisse corriger.
        console.error('analyserPhoto', rep.status);
        setMsg(rep.status >= 500
          ? 'Analyse momentanément indisponible. Réessaie dans quelques minutes — tu peux saisir ton repas à la main.'
          : 'Analyse impossible. Vérifie ta connexion et réessaie.');
        setEtat('pret'); return;
      }
      const { aliments } = await rep.json();
      const trouves = (aliments || []).map(a => {
        const cle = trouverAliment(a.aliment);
        if (!cle) return null;
        const d = DB[cle];
        // 04/10 : aliment a l'unite = nombre de pieces au journal.
        const portion = portionJournal(cle, a.quantite, a.unite);
        return { cle, portion: Math.round(portion), dit: a.aliment };
      }).filter(Boolean);
      if (!trouves.length) { setMsg('Rien de reconnu sur la photo, réessaie'); setEtat('pret'); return; }
      setProps(trouves); setEtat('resultat'); setMsg('');
    } catch (err) {
      setMsg('Analyse indisponible pour le moment'); setEtat('pret');
    }
  };

  const majPortion = (i, val) => {
    const n = Math.max(0, parseFloat(String(val).replace(',', '.')) || 0);
    setProps(props.map((p, j) => j === i ? { ...p, portion: n } : p));
  };

  const ajouterTout = () => {
    const cible = repasId
      ? repas.value.find(x => x.id === repasId)
      : repas.value[repas.value.length - 1];
    if (!cible) return;
    props.forEach(p => { if (p.portion > 0) ajouterIngredient(cible.id, p.cle, p.portion); });
    fermer();
  };

  return createPortal(
    <>
      <div class="voile montre" onClick={fermer} />
      <div class="modale modale-ia montre">
        <button class="calc-fermer" onClick={fermer} aria-label="Fermer">✕</button>
        <h3>Photo d'assiette</h3>
        <p class="ia-sous">Prends ton assiette en photo — les quantités sont estimées, ajuste-les avant d'ajouter.</p>

        <input ref={champ} type="file" accept="image/*" capture="environment" style="display:none" onChange={analyser} />

        {etat !== 'resultat' && (
          <div class="vocal-zone">
            <button
              class="vocal-mic"
              disabled={etat === 'analyse'}
              onClick={() => champ.current && champ.current.click()}
              aria-label="Photographier"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3.5 8.5A2.5 2.5 0 016 6h1.9l1.2-1.9a1.6 1.6 0 011.36-.75h3.08c.55 0 1.06.28 1.36.75L16.1 6H18a2.5 2.5 0 012.5 2.5v8A2.5 2.5 0 0118 19H6a2.5 2.5 0 01-2.5-2.5v-8z" />
                <circle cx="12" cy="12.4" r="3.6" />
              </svg>
            </button>
            <div class="vocal-msg">{msg || 'Appuie pour photographier'}</div>
          </div>
        )}

        {etat === 'resultat' && (
          <>
            {props.map((p, i) => (
              <div class="idee" key={i}>
                <div class="idee-info">
                  <div class="idee-nom">{p.cle}</div>
                  <div class="idee-mac">
                    <input
                      class="photo-portion"
                      type="number" inputmode="decimal" min="0"
                      value={p.portion}
                      onInput={(e) => majPortion(i, e.target.value)}
                    /> {DB[p.cle] && DB[p.cle].unit ? (DB[p.cle].unitLabel || 'pièce') + (p.portion > 1 ? 's' : '') : 'g'} · vu : « {p.dit} »
                  </div>
                </div>
                <button onClick={() => setProps(props.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <button class="calc-appliquer" onClick={ajouterTout}>Ajouter au repas</button>
          </>
        )}
      </div>
    </>,
    document.body
  );
}
