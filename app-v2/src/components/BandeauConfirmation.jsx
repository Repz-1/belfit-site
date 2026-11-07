import { useState, useEffect, useRef } from 'preact/hooks';
import {
  utilisateur, adresseAConfirmer,
  envoyerMailVerification, rafraichirUtilisateur,
} from '../services/firebase.js';
import { t, langue } from '../i18n/index.js';

/**
 * Relance de confirmation d'adresse. Ni mur ni fenetre : une bande fine
 * et ecartable, qui laisse l'application entierement accessible — le
 * parti pris de Lifesum, MyFitnessPal et Foodvisor. Un blocage juste
 * apres l'inscription couterait des utilisateurs sans rien garantir.
 */
export function BandeauConfirmation() {
  const [masque, setMasque] = useState(() => {
    try { return sessionStorage.getItem('belfit_conf_masque') === '1'; } catch (e) { return false; }
  });
  const [texte, setTexte] = useState('');
  const [etat, setEtat] = useState('');
  const envoiFait = useRef(false);

  const visible = !masque && adresseAConfirmer(utilisateur.value);

  const dire = (res) => {
    const e = res && res.etat === 'deja' ? 'deja' : 'accepte';
    setEtat(e);
    setTexte(e === 'deja' ? t('conf_deja') : t('conf_accepte'));
  };
  const direEchec = (e) => {
    setEtat('erreur');
    setTexte(e && e.message === 'trop_tot' ? t('conf_trop_tot') : t('conf_erreur'));
  };

  useEffect(() => {
    if (!visible) return undefined;
    // Premier envoi : la personne vient de s'inscrire. Un echec reste visible.
    if (!envoiFait.current) {
      envoiFait.current = true;
      envoyerMailVerification(langue.value).then(dire).catch(direEchec);
    }
    // La confirmation se fait souvent sur un autre appareil : on relit
    // l'etat du compte plutot que d'attendre un retour ici.
    const minuteur = setInterval(() => { rafraichirUtilisateur().catch(() => {}); }, 15000);
    return () => clearInterval(minuteur);
  }, [visible]);

  if (!visible) return null;

  const renvoyer = async () => {
    try { dire(await envoyerMailVerification(langue.value)); }
    catch (e) { direEchec(e); }
  };

  const fermer = () => {
    try { sessionStorage.setItem('belfit_conf_masque', '1'); } catch (e) {}
    setMasque(true);
  };

  return (
    <div class="bandeau-conf">
      <span class="bc-txt">{texte || t('conf_bandeau')}</span>
      {etat !== 'deja' && <button class="bc-action" onClick={renvoyer}>{t('conf_renvoyer')}</button>}
      <button class="bc-fermer" onClick={fermer} aria-label="Fermer">×</button>
    </div>
  );
}
