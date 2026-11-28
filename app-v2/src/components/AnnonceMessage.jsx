import { createPortal } from 'preact/compat';
import { useState, useEffect } from 'preact/hooks';
import { utilisateur } from '../services/firebase.js';
import { messageCoach } from './BelfitPlus.jsx';
import { t } from '../i18n/index.js';

// ============================================================
// PETIT MOT DU COACH (Raci, 28/11). Envoye depuis l'espace coach :
// le client le recoit en notification (s'il les a activees) ET ici,
// une fois, a l'ouverture de l'app. Reconnu par messageCoach.le.
// Meme fenetre que « plan recu » (classes ap-*), jamais par-dessus
// une autre annonce. Un mot de plus de 30 jours n'est plus montre.
// ============================================================
const CLE = (uid) => 'belfit_v2_motVu_' + uid;
const VIEUX_MS = 30 * 24 * 3600 * 1000;

/** Pur : faut-il montrer ce mot ? */
export function motAMontrer(m, vu, maintenant) {
  if (!m || !m.le || !m.texte || m.le === vu) return false;
  const q = Date.parse(m.le);
  return q > 0 && maintenant - q <= VIEUX_MS;
}

export function AnnonceMessage() {
  const u = utilisateur.value;
  const m = messageCoach.value;
  const [vu, setVu] = useState(null);
  const [autre, setAutre] = useState(false);
  useEffect(() => {
    if (!u || !u.uid) return;
    try { setVu(localStorage.getItem(CLE(u.uid))); } catch (e) {}
  }, [u && u.uid]);
  useEffect(() => {
    const voir = () => setAutre(!!document.querySelector('.ap-voile:not(.am-voile)'));
    voir();
    const id = setInterval(voir, 800);
    return () => clearInterval(id);
  }, []);
  if (!u || !u.uid || autre || !motAMontrer(m, vu, Date.now())) return null;
  const fermer = () => { try { localStorage.setItem(CLE(u.uid), m.le); } catch (e) {} setVu(m.le); };
  return createPortal((
    <div class="ap-voile am-voile" onClick={fermer}>
      <div class="ap-carte" role="dialog" aria-modal="true" aria-labelledby="am-titre" onClick={(e) => e.stopPropagation()}>
        <div class="ap-sur">Coach BelFit</div>
        <div class="am-logo" aria-hidden="true">B<span>F</span></div>
        <h2 id="am-titre" class="ap-titre">{t('am_titre')}</h2>
        <p class="am-texte">« {m.texte} »</p>
        <button class="ap-bt" onClick={fermer}>{t('am_merci')}</button>
      </div>
    </div>
  ), document.body);
}
