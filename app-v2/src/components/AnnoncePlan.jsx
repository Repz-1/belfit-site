import { createPortal } from 'preact/compat';
import { useState, useEffect } from 'preact/hooks';
import { utilisateur } from '../services/firebase.js';
import { programmeBrut, programmeCharge, progOuvert } from './BelfitPlus.jsx';
import { allerOnglet } from './BottomNav.jsx';

// ============================================================
// ANNONCE « PLAN RECU » (Raci, 9/11) — le client est prevenu dans
// l'app quand son coach lui envoie un plan, en plus de l'e-mail.
//
// Une fenetre, une seule fois par envoi : l'envoi est reconnu par
// `programme.livreLe` (horodatage pose par deposerProgramme). On garde
// le dernier livreLe vu, par compte, dans ce telephone :
//   - rien de vu + plan recent  -> « Ton plan coach est arrivé »
//   - autre livreLe deja vu     -> « Ton plan coach a été mis à jour »
//   - rien de vu + plan ancien  -> on note sans rien montrer (nouveau
//     telephone, ou plans livres avant cette version).
// ============================================================

const CLE = (uid) => 'belfit_v2_planVu_' + uid;
const RECENT_MS = 3 * 24 * 3600 * 1000;

function apercuCoach() {
  try {
    return !!(localStorage.getItem('belfit_v2_apercu_programme') || localStorage.getItem('belfit_v2_apercu_dossier'));
  } catch (e) { return false; }
}

/** Decide quoi montrer. Rend null | 'nouveau' | 'maj'. Pur : testable. */
export function annonceAMontrer(livreLe, vu, maintenant) {
  if (!livreLe || livreLe === vu) return null;
  if (vu) return 'maj';
  const t = Date.parse(livreLe);
  if (!(t > 0) || maintenant - t > RECENT_MS) return null;
  return 'nouveau';
}

export function AnnoncePlan() {
  const [annonce, setAnnonce] = useState(null);   // { type, livreLe, uid, note }
  const u = utilisateur.value;
  const charge = programmeCharge.value;
  const brut = programmeBrut.value;

  useEffect(() => {
    if (!u || !u.uid || !charge || apercuCoach()) return;
    const livreLe = brut && brut.livreLe;
    if (!livreLe) return;
    let vu = null;
    try { vu = localStorage.getItem(CLE(u.uid)); } catch (e) {}
    const type = annonceAMontrer(livreLe, vu, Date.now());
    if (!type) {
      // Plan ancien jamais note sur ce telephone : on le note en silence.
      if (livreLe !== vu) { try { localStorage.setItem(CLE(u.uid), livreLe); } catch (e) {} }
      return;
    }
    setAnnonce({ type, livreLe, uid: u.uid, note: (brut.note || '').trim() });
  }, [u && u.uid, charge, brut && brut.livreLe]);

  if (!annonce) return null;

  const noter = () => {
    try { localStorage.setItem(CLE(annonce.uid), annonce.livreLe); } catch (e) {}
    setAnnonce(null);
  };
  const voir = () => {
    noter();
    allerOnglet('premium');
    progOuvert.value = true;
  };

  const maj = annonce.type === 'maj';
  const note = annonce.note.length > 160 ? annonce.note.slice(0, 157).trimEnd() + '…' : annonce.note;

  return createPortal((
    <div class="ap-voile" onClick={noter}>
      <div class="ap-carte" role="dialog" aria-modal="true" aria-labelledby="ap-titre" onClick={(e) => e.stopPropagation()}>
        <div class="ap-pastille" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </div>
        <h2 id="ap-titre" class="ap-titre">{maj ? 'Ton plan coach a été mis à jour' : 'Ton plan coach est arrivé'}</h2>
        <p class="ap-texte">{maj
          ? 'Ton coach a modifié ton plan alimentaire. La nouvelle version est prête.'
          : 'Ton coach t’a préparé ton plan alimentaire. Il est prêt, tu peux le consulter.'}</p>
        {note && <p class="ap-note">« {note} »</p>}
        <button class="ap-bt" onClick={voir}>Voir mon plan</button>
        <button class="ap-plus-tard" onClick={noter}>Plus tard</button>
      </div>
    </div>
  ), document.body);
}
