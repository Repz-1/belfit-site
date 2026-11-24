import { createPortal } from 'preact/compat';
import { useState, useEffect } from 'preact/hooks';
import { utilisateur } from '../services/firebase.js';
import { entrainementCoach } from './BelfitPlus.jsx';
import { allerOnglet, ongletActif } from './BottomNav.jsx';
import { espaceJour, choisirEspaceJour } from './CoachEntrainement.jsx';
import { t } from '../i18n/index.js';

// ============================================================
// ANNONCE « PROGRAMME D'ENTRAINEMENT RECU » (Raci, 24/11).
// Un envoi est reconnu par entrainementCoach.livreLe. Tant que le client
// n'a pas OUVERT son programme (page Aujourd'hui > Entrainement), la
// fenetre revient a CHAQUE ouverture de l'app. « Plus tard » la ferme
// seulement jusqu'a la prochaine ouverture.
// ============================================================

const CLE = (uid) => 'belfit_v2_entVu_' + uid;
let fermeCetteFois = null;   // livreLe ferme par « Plus tard » (jusqu'au prochain lancement)

function apercuCoach() {
  try { return !!localStorage.getItem('belfit_v2_apercu_entrainement_coach'); } catch (e) { return false; }
}

/** Pur : null | 'nouveau' | 'maj'. vuAvant = un ancien envoi deja ouvert. */
export function annonceEntAMontrer(livreLe, vu, fermeLe) {
  if (!livreLe || livreLe === vu || livreLe === fermeLe) return null;
  return vu ? 'maj' : 'nouveau';
}

export function AnnonceEntrainement() {
  const u = utilisateur.value;
  const ent = entrainementCoach.value;
  const livreLe = ent && Array.isArray(ent.seances) && ent.seances.length ? ent.livreLe : null;
  const ouvert = ongletActif.value === 'journal' && espaceJour.value === 'ent';
  const [vu, setVu] = useState(null);
  const [ferme, setFerme] = useState(fermeCetteFois);
  const [autre, setAutre] = useState(false);   // une autre annonce (plan nutrition) est a l'ecran

  useEffect(() => {
    if (!u || !u.uid) return;
    try { setVu(localStorage.getItem(CLE(u.uid))); } catch (e) {}
  }, [u && u.uid]);

  // Programme ouvert par le client : c'est vu, la fenetre ne revient plus.
  useEffect(() => {
    if (!u || !u.uid || !livreLe || !ouvert) return;
    try { localStorage.setItem(CLE(u.uid), livreLe); } catch (e) {}
    setVu(livreLe);
  }, [u && u.uid, livreLe, ouvert]);

  // Pas deux fenetres l'une sur l'autre : on attend que l'annonce du plan soit fermee.
  useEffect(() => {
    const voir = () => setAutre(!!document.querySelector('.ap-voile:not(.ae-voile)'));
    voir();
    const id = setInterval(voir, 800);
    return () => clearInterval(id);
  }, []);

  if (!u || !u.uid || apercuCoach() || ouvert || autre) return null;
  const type = annonceEntAMontrer(livreLe, vu, ferme);
  if (!type) return null;

  const plusTard = () => { fermeCetteFois = livreLe; setFerme(livreLe); };
  const voirProg = () => {
    choisirEspaceJour('ent');
    allerOnglet('journal');
    try { localStorage.setItem(CLE(u.uid), livreLe); } catch (e) {}
    setVu(livreLe);
  };
  const nb = ent.seances.length;

  return createPortal((
    <div class="ap-voile ae-voile" onClick={plusTard}>
      <div class="ap-carte" role="dialog" aria-modal="true" aria-labelledby="ae-titre" onClick={(e) => e.stopPropagation()}>
        <div class="ap-sur">Coach BelFit</div>
        <div class="ap-pastille" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </div>
        <h2 id="ae-titre" class="ap-titre">{t(type === 'maj' ? 'ae_maj' : 'ae_nouveau')}</h2>
        <p class="ae-txt">{t(nb > 1 ? 'ae_seances' : 'ae_seance', { n: nb })}</p>
        <button class="ap-bt" onClick={voirProg}>{t('ae_voir')}</button>
        <button class="ap-plus-tard" onClick={plusTard}>{t('ae_plus_tard')}</button>
      </div>
    </div>
  ), document.body);
}
