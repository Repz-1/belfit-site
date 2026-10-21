import { portionJournal } from '../services/coach-local.js';
import { useState, useRef, useEffect } from 'preact/hooks';
import { VERSION_APP } from '../version.js';
import { auth } from '../services/firebase.js';
import { DB, NOMS_ALIMENTS } from '../data/aliments.js';
import { repas, ajouterIngredient } from '../store/journal.js';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { createPortal } from 'preact/compat';

const API = 'https://europe-west1-repz-baf60.cloudfunctions.net/transcrireVocal';

// --- Conversion WAV 16 kHz mono (Gemini n'accepte pas le WebM) ---
function encoderWav(samples, sr) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const txt = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  txt(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); txt(8, 'WAVE');
  txt(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  txt(36, 'data'); v.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

async function versWav(blob) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const decode = ctx.decodeAudioData(await blob.arrayBuffer());
  const garde = new Promise((_, rej) => setTimeout(() => rej(new Error('decode>5s')), 5000));
  const ab = await Promise.race([decode, garde]).catch(e => { try { ctx.close(); } catch (x) {} throw e; });
  const cible = 16000, canal = ab.getChannelData(0), ratio = ab.sampleRate / cible;
  const n = Math.floor(canal.length / ratio), out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = canal[Math.floor(i * ratio)];
  try { ctx.close(); } catch (e) {}
  return encoderWav(out, cible);
}

// Trouve l'aliment de la base le plus proche du nom dicte
function trouverAliment(nom) {
  const n = (nom || '').toLowerCase().trim();
  if (!n) return null;
  if (DB[nom]) return nom;
  const exact = NOMS_ALIMENTS.find(a => a.toLowerCase() === n);
  if (exact) return exact;
  const contient = NOMS_ALIMENTS.find(a => a.toLowerCase().includes(n) || n.includes(a.toLowerCase()));
  return contient || null;
}

export function VocalModal({ fermer, repasId }) {
  const [etat, setEtat] = useState('pret'); // pret | ecoute | analyse | resultat
  const [props, setProps] = useState([]);
  const [msg, setMsg] = useState('');
  const rec = useRef(null), flux = useRef(null), morceaux = useRef([]);
  const minuteurAuto = useRef(null);

  // Fermer la modale (croix, voile) coupait l'interface mais PAS le
  // micro : l'enregistrement continuait en arriere-plan, notification
  // systeme a l'appui. Le demontage arrete tout, sans envoyer.
  useEffect(() => () => {
    clearTimeout(minuteurAuto.current);
    try { if (rec.current && rec.current.state !== 'inactive') { rec.current.onstop = null; rec.current.stop(); } } catch (e) {}
    try { flux.current && flux.current.getTracks().forEach(t => t.stop()); } catch (e) {}
  }, []);

  const [erreur, setErreur] = useState('');
  const [diag, setDiag] = useState('');

  useEffect(() => {
    const morceauxDiag = ['v' + VERSION_APP, location.host];
    morceauxDiag.push(navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? 'API ✓' : 'API ✗');
    morceauxDiag.push(typeof MediaRecorder !== 'undefined' ? 'Enreg. ✓' : 'Enreg. ✗');
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' })
        .then(r => setDiag([...morceauxDiag, 'micro: ' + r.state].join(' · ')))
        .catch(() => setDiag(morceauxDiag.join(' · ')));
    } else setDiag(morceauxDiag.join(' · '));
  }, []);

  const demarrer = async () => {
    setErreur('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErreur('Micro indisponible dans ce navigateur.');
      return;
    }
    // Chaque etape annonce ce qu'elle fait : un blocage cesse d'etre
    // un mystere, il a un nom a l'ecran.
    setMsg('Demande du micro…');
    try {
      flux.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setMsg('');
      // NotAllowedError sans invite = le site est BLOQUE dans Chrome :
      // aucune demande ne s'affichera tant que le reglage n'est pas leve.
      setErreur(e && e.name === 'NotAllowedError'
        ? 'Micro bloqué pour belfit.be. Dans Chrome : ⋮ → Paramètres du site → Micro → Autoriser, puis recharge.'
        : 'Micro inaccessible (' + ((e && e.name) || 'erreur') + ').');
      return;
    }
    try {
      morceaux.current = [];
      let mime = 'audio/webm';
      if (typeof MediaRecorder === 'undefined') throw new Error('MediaRecorder absent de ce navigateur');
      if (!MediaRecorder.isTypeSupported(mime)) mime = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      rec.current = mime ? new MediaRecorder(flux.current, { mimeType: mime }) : new MediaRecorder(flux.current);
      rec.current.ondataavailable = e => { if (e.data.size) morceaux.current.push(e.data); };
      rec.current.onstop = () => { envoyer().catch(err => { setEtat('pret'); setMsg(''); setErreur('Analyse impossible. Vérifie ta connexion et réessaie.'); console.error('vocal', err); }); };
      rec.current.start();
      setEtat('ecoute'); setMsg("Je t'écoute… (appuie pour terminer)");
      // Personne ne doit pouvoir laisser le micro ouvert : 15 s maximum,
      // puis l'analyse part toute seule.
      clearTimeout(minuteurAuto.current);
      minuteurAuto.current = setTimeout(() => { if (rec.current && rec.current.state === 'recording') arreter(); }, 15000);
    } catch (e) {
      flux.current && flux.current.getTracks().forEach(t => t.stop());
      setMsg('');
      setErreur('Enregistreur en échec : ' + ((e && (e.name + ' — ' + e.message)) || e));
    }
  };

  const arreter = () => {
    clearTimeout(minuteurAuto.current);
    setEtat('analyse'); setMsg('Analyse en cours…');
    let stoppe = false;
    try {
      if (rec.current && rec.current.state !== 'inactive') { rec.current.stop(); stoppe = true; }
    } catch (e) {
      setEtat('pret'); setMsg('');
      setErreur('Arrêt en échec : ' + ((e && e.name) || e));
    }
    try { flux.current && flux.current.getTracks().forEach(t => t.stop()); } catch (e) {}
    // stop() sans enregistreur actif : onstop ne viendra jamais, on ne
    // laisse pas l'ecran en 'analyse' pour l'eternite.
    if (!stoppe) { setEtat('pret'); if (!erreur) { setMsg(''); setErreur("Rien n'a été enregistré."); } }
  };

  const envoyer = async () => {
    if (!morceaux.current.length) {
      setEtat('pret'); setMsg('');
      setErreur("Micro ouvert mais aucun son capté — vérifie qu'une autre app n'occupe pas le micro.");
      return;
    }
    // L'analyse annonce chaque etape : si ca coince, l'ecran dit OU.
    setMsg('Conversion audio…');
    let blob = new Blob(morceaux.current, { type: rec.current?.mimeType || 'audio/webm' });
    let type = 'audio/wav';
    try { blob = await versWav(blob); } catch (e) { type = (rec.current?.mimeType || 'audio/webm').split(';')[0]; }
    const b64 = await new Promise(r => { const f = new FileReader(); f.onloadend = () => r(String(f.result).split(',')[1] || ''); f.readAsDataURL(blob); });
    setMsg('Envoi (' + Math.round(b64.length * 0.75 / 1024) + ' Ko)…');
    let token = '';
    try { token = await auth.currentUser.getIdToken(); } catch (e) {}
    try {
      // 30 s maximum : un serveur qui ne repond pas devient une erreur
      // nommee, plus jamais une roue qui tourne pour l'eternite.
      const coupe = new AbortController();
      const minuteur = setTimeout(() => coupe.abort(), 30000);
      const rep = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ audioBase64: b64, mimeType: type }),
        signal: coupe.signal,
      }).finally(() => clearTimeout(minuteur));
      setMsg('Analyse en cours…');
      if (rep.status === 403) { setMsg(''); setEtat('pret'); setErreur('Réservé Premium (serveur).'); return; }
      // Quota IA du jour atteint (02/10) : compte par le serveur.
      if (rep.status === 429) { let lim = ''; try { lim = (await rep.json()).limite || ''; } catch (e) {} setMsg(''); setEtat('pret'); setErreur('Tu as utilisé tes ' + lim + ' analyses IA d\'aujourd\'hui. Reviens demain.'); return; }
      if (!rep.ok) {
        // « Serveur en échec (HTTP 502) » n'apprend rien a personne et
        // laisse croire a une panne de l'app. Le 502 le plus frequent
        // vient d'un refus de Gemini — credits epuises, quota atteint —
        // ce que l'utilisateur ne peut ni comprendre ni corriger.
        // On dit ce qui se passe et ce qu'il peut faire ; le detail
        // technique part dans la console pour le debogage.
        let corps = ''; try { corps = (await rep.text()).slice(0, 300); } catch (e) {}
        console.error('transcrireVocal', rep.status, corps);
        setMsg(''); setEtat('pret');
        setErreur(
          rep.status === 502 || rep.status === 503
            ? 'La reconnaissance vocale est momentanément indisponible. Réessaie dans quelques minutes — tu peux saisir ton repas à la main en attendant.'
            : rep.status === 429
              ? 'Trop de demandes d’un coup. Attends une minute et réessaie.'
              : rep.status >= 500
                ? 'Le service ne répond pas correctement. Réessaie plus tard.'
                : 'Transcription impossible. Vérifie ta connexion et réessaie.'
        );
        return;
      }
      const { aliments } = await rep.json();
      const trouves = (aliments || []).map(a => {
        const cle = trouverAliment(a.aliment);
        if (!cle) return null;
        const d = DB[cle];
        // 04/10 : aliment a l'unite = nombre de pieces au journal.
        const portion = portionJournal(cle, a.quantite, a.unite);
        return { cle, portion: Math.round(portion * 10) / 10, dit: a.aliment };
      }).filter(Boolean);
      if (!trouves.length) { setMsg("Aucun aliment reconnu, reformule"); setEtat('pret'); return; }
      setProps(trouves); setEtat('resultat'); setMsg('');
    } catch (e) {
      setMsg(''); setEtat('pret');
      setErreur(e && e.name === 'AbortError'
        ? 'Le serveur n\'a pas répondu en 30 s (fonction froide ou en panne).'
        : 'Envoi impossible : ' + ((e && (e.name + ' — ' + e.message)) || e));
    }
  };

  const ajouterTout = () => {
    const cible = repasId
      ? repas.value.find(x => x.id === repasId)
      : repas.value[repas.value.length - 1];
    if (!cible) return;
    props.forEach(p => ajouterIngredient(cible.id, p.cle, p.portion));
    fermer();
  };

  return createPortal(
    <>
      <div class="voile montre" onClick={fermer} />
      <div class="modale modale-ia montre">
        <button class="calc-fermer" onClick={fermer} aria-label="Fermer">✕</button>
        <h3>Ajout vocal</h3>
        <p class="ia-sous">Dis ce que tu as mangé, naturellement — « 150 grammes de riz et un œuf ».</p>

        {etat !== 'resultat' && (
          <div class="vocal-zone">
            <button
              class={`vocal-mic ${etat === 'ecoute' ? 'actif' : ''}`}
              disabled={etat === 'analyse'}
              onClick={etat === 'ecoute' ? arreter : demarrer}
              aria-label={etat === 'ecoute' ? 'Arrêter' : 'Parler'}
            >
              {etat === 'ecoute' ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="7.5" y="7.5" width="9" height="9" rx="1.6" fill="currentColor" stroke="none" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="9.4" y="2.6" width="5.2" height="10.2" rx="2.6" />
                  <path d="M6 11.5a6 6 0 0012 0" />
                  <path d="M12 17.5v3.4" />
                  <path d="M8.8 20.9h6.4" />
                </svg>
              )}
            </button>
            <div class={`vocal-msg ${etat === 'ecoute' ? 'ecoute' : ''}`}>{msg || 'Appuie et parle'}</div>
            {erreur && <div class="ia-erreur">{erreur}</div>}
            <div class="ia-diag">{diag}</div>
          </div>
        )}

        {etat === 'resultat' && (
          <>
            {props.map((p, i) => (
              <div class="idee" key={i}>
                <div class="idee-info">
                  <div class="idee-nom">{p.cle}</div>
                  <div class="idee-mac">{p.portion} {DB[p.cle] && DB[p.cle].unit ? (DB[p.cle].unitLabel || 'pièce') + (p.portion > 1 ? 's' : '') : 'g'} · reconnu : « {p.dit} »</div>
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

// Bouton d'ouverture (gate Premium)
export function VocalBouton() {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button
        class="vocal-lien"
        onClick={() => { if (estPremium.value) setOuvert(true); else ongletActif.value = 'premium'; }}
      >🎤 Ajout vocal {!estPremium.value && <i class="pro-inline">✦ PRO</i>}</button>
      {ouvert && <VocalModal fermer={() => setOuvert(false)} />}
    </>
  );
}
