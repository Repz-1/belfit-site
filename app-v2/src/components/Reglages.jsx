import { signal } from '@preact/signals';
import { codeOuvert, CodeAcces } from './CodeAcces.jsx';
import { SANS_COMPTE, demanderConnexion } from '../acces-invite.js';
import { useRetour } from '../services/retour.js';
import { definirPrenom } from '../store/perso.js';
import { useState, useEffect } from 'preact/hooks';
import { Component } from 'preact';
import { t, langue as langueApp, setLangue } from '../i18n/index.js';
import { utilisateur, auth, app, deconnexion } from '../services/firebase.js';
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { Entete } from './Entete.jsx';
import { VERSION_APP } from '../version.js';
import { PREMIUM_OUVERT } from '../acces-libre.js';
import { APP_ANDROID } from '../services/app-android.js';
import '../styles/reglages.css';
import { sexe } from '../store/perso.js';

// ============================================================
// REGLAGES — portage v2 de parametres.html.
//
// La roue dentee de l'en-tete sortait de la v2 vers la v1 : c'etait
// la derniere page que l'application devait quitter pour fonctionner.
// Tout est repris : compte, abonnement, resiliation avec ses motifs,
// langue, notifications, contact, documents, version,
// deconnexion et suppression.
//
// Les sous-ecrans (compte, resiliation) sont des VUES et non des
// panneaux glissants : la v2 a deja sa pile de navigation, et un
// panneau en position fixe se serait cale sur le rail transforme.
// ============================================================

export const vueReglages = signal(null);   // null | 'compte' | 'resilier'

export function ouvrirReglages() { vueReglages.value = 'menu'; }
export function fermerReglages() { vueReglages.value = null; }

/** Motifs de resiliation. Le bouton de confirmation reste toujours
 *  accessible : resilier ne doit pas etre plus difficile que
 *  souscrire. */
const MOTIFS = [
  { k: 'prix', cle: 'rs_m_prix' },
  { k: 'temps', cle: 'rs_m_temps' },
  { k: 'fonction', cle: 'rs_m_fonction' },
  { k: 'usage', cle: 'rs_m_usage' },
  { k: 'autre', cle: 'rs_m_autre' },
];

const Chevron = () => (
  <svg class="rg-chev" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

function Rangee({ titre, sous, onClick, href, fin, danger }) {
  const dedans = (
    <>
      <span class="rg-txt">
        <span class={'rg-nom' + (danger ? ' rg-nom--danger' : '')}>{titre}</span>
        {sous && <span class="rg-sous">{sous}</span>}
      </span>
      {fin || <Chevron />}
    </>
  );
  if (href) {
    return <a class="rg-rangee" href={href} target="_blank" rel="noopener">{dedans}</a>;
  }
  return <button class="rg-rangee" onClick={onClick}>{dedans}</button>;
}

// ---------- Sous-ecran : compte ----------
function EcranCompte({ retour }) {
  const u = utilisateur.value;
  const [prenom, setPrenom] = useState('');
  const [garde, setGarde] = useState(false);
  const [mdpEnvoye, setMdpEnvoye] = useState(false);
  const [confirmeSuppr, setConfirmeSuppr] = useState(false);

  useEffect(() => {
    try {
      setPrenom(localStorage.getItem('repz_firstName')
        || (JSON.parse(localStorage.getItem('repz_profile') || '{}').prenom) || '');
    } catch (e) { /* stockage indisponible */ }
  }, []);

  const sauver = () => {
    const v = prenom.trim();
    if (!v) return;
    try {
      definirPrenom(v);
      const p = JSON.parse(localStorage.getItem('repz_profile') || '{}');
      p.prenom = v;
      localStorage.setItem('repz_profile', JSON.stringify(p));
    } catch (e) { /* non bloquant */ }
    // Le compte porte aussi le prenom : l'en-tete le lit en premier.
    // Le SDK modulaire n'expose PAS updateProfile sur l'utilisateur :
    // c'est une fonction a part (firebase.js l'importe deja ainsi).
    // La condition etait donc toujours fausse et le prenom n'arrivait
    // jamais jusqu'au compte — il ne vivait que dans le stockage local.
    if (u) {
      import('firebase/auth')
        .then(({ updateProfile }) => updateProfile(u, { displayName: v }))
        .catch(() => {});
    }
    setGarde(true);
    setTimeout(() => setGarde(false), 1200);
  };

  const changerMdp = () => {
    if (!u || !u.email) return;
    import('firebase/auth').then(({ sendPasswordResetEmail }) => {
      sendPasswordResetEmail(auth, u.email).catch(() => {});
      setMdpEnvoye(true);
    });
  };

  return (
    <div class="pg-reglages">
      <Entete retour={retour} />
      <div class="rg-corps">
        {/* Un seul retour : la fleche de l'en-tete (23/09). */}
        <h1 class="rg-titre">{t('set_account')}</h1>

        <div class="rg-carte">
          <div class="rg-champ">
            <span class="rg-lbl">{t('acc_email')}</span>
            <span class="rg-val">{(u && u.email) || '—'}</span>
          </div>
          <div class="rg-champ">
            <span class="rg-lbl">{t('acc_firstname')}</span>
            <input type="text" value={prenom} onInput={(e) => setPrenom(e.target.value)} />
          </div>
          {/* Le reglage de silhouette a quitte cet ecran pour le
              premier niveau des Reglages : il y etait trop enfoui. */}
        </div>

        <button class="rg-principal" onClick={sauver}>
          {garde ? t('saved') : t('save')}
        </button>

        <div class="rg-carte rg-carte--actions">
          <button class="rg-action" onClick={changerMdp}>{t('acc_change_pwd')}</button>
          <button class="rg-action rg-action--danger" onClick={() => setConfirmeSuppr(true)}>
            {t('acc_delete')}
          </button>
        </div>
        {mdpEnvoye && <p class="rg-note">{t('acc_pwd_sent')}</p>}

        {confirmeSuppr && (
          <div class="rg-modale" onClick={(e) => { if (e.target === e.currentTarget) setConfirmeSuppr(false); }}>
            <div class="rg-modale-boite">
              <h3>{t('del_title')}</h3>
              <p>{t('del_body')}</p>
              <button class="rg-principal rg-principal--danger" onClick={() => {
                const c = auth.currentUser;
                if (!c) return;
                c.delete()
                  .then(() => { window.location.href = '/v2/?logout=1'; })
                  .catch(() => { setConfirmeSuppr(false); });
              }}>{t('del_confirm')}</button>
              <button class="rg-lien" onClick={() => setConfirmeSuppr(false)}>{t('cancel')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Sous-ecran : abonnement (23/09) ----------
// « Gerer l'abonnement » ouvrait l'espace BelFit+, ou il n'y a rien a
// gerer. Ici : ce qu'on a, par ou on paie, et comment le changer ou
// l'arreter. La resiliation vit dedans.
const LIEN_PAIEMENT = {
  lemonsqueezy: 'https://app.lemonsqueezy.com/my-orders',
  web: 'https://app.lemonsqueezy.com/my-orders',
  android: 'https://play.google.com/store/account/subscriptions',
  ios: 'https://apps.apple.com/account/subscriptions',
};
const NOM_CANAL = { lemonsqueezy: 'abo_canal_web', web: 'abo_canal_web', android: 'abo_canal_android', ios: 'abo_canal_ios', code: 'abo_canal_code' };
const NOM_FORMULE = { mensuel: 'abo_f_mensuel', trimestriel: 'abo_f_trimestriel', annuel: 'abo_f_annuel' };

function EcranAbonnement({ retour }) {
  const u = utilisateur.value;
  const [d, setD] = useState(null);
  useEffect(() => {
    if (!u) { setD({}); return; }
    import('firebase/firestore').then(async ({ getFirestore, doc, getDoc }) => {
      try {
        const s = await getDoc(doc(getFirestore(app), 'users', u.uid));
        setD(s.exists() ? s.data() : {});
      } catch (e) { setD({}); }
    }).catch(() => setD({}));
  }, [u]);

  const paye = d && d.premium === true;
  const canal = (d && d.source) || null;
  const lien = canal && LIEN_PAIEMENT[canal];

  return (
    <div class="pg-reglages">
      <Entete retour={retour} />
      <div class="rg-corps">
        <h1 class="rg-titre">{t('set_sub')}</h1>
        {d === null ? <p class="rg-note">…</p> : (
          <>
            <div class="rg-carte">
              <div class="rg-champ">
                <span class="rg-lbl">{t('abo_statut')}</span>
                <span class="rg-val">{paye ? t('abo_actif') : (PREMIUM_OUVERT ? t('abo_test') : t('abo_gratuit'))}</span>
              </div>
              {paye && d.formule && (
                <div class="rg-champ">
                  <span class="rg-lbl">{t('abo_formule')}</span>
                  <span class="rg-val">{t(NOM_FORMULE[d.formule] || d.formule)}</span>
                </div>
              )}
              {paye && canal && (
                <div class="rg-champ">
                  <span class="rg-lbl">{t('abo_canal')}</span>
                  <span class="rg-val">{t(NOM_CANAL[canal] || canal)}</span>
                </div>
              )}
            </div>
            {paye ? (
              <div class="rg-carte">
                {lien && !APP_ANDROID && <Rangee titre={t('abo_gerer_paiement')} sous={t('abo_gerer_paiement_sub')} href={lien} />}
                <Rangee titre={t('set_cancel')} sous={t('set_cancel_sub')} danger
                        onClick={() => { vueReglages.value = 'resilier'; }} />
              </div>
            ) : APP_ANDROID ? null : (
              <button class="rg-principal" onClick={() => { fermerReglages(); ongletActif.value = 'premium'; }}>
                {t('abo_voir_offre')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Sous-ecran : resiliation ----------
function EcranResilier({ retour }) {
  const [motif, setMotif] = useState(null);
  const [texte, setTexte] = useState('');

  /** Le motif est la donnee la plus utile de tout ce parcours : on
   *  l'enregistre avant de rediriger, et un echec ne bloque jamais
   *  la resiliation. */
  const noter = async (suite) => {
    try {
      const u = utilisateur.value;
      if (u) {
        const { getFirestore, doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(getFirestore(app), 'users', u.uid), {
          resiliation: {
            motif: motif || 'non_precise',
            precision: texte.trim().slice(0, 500),
            suite, date: new Date().toISOString(),
          },
        }, { merge: true });
      }
    } catch (e) { /* ne doit jamais bloquer */ }
  };

  const confirmer = async () => {
    await noter('resilie');
    window.open('https://app.lemonsqueezy.com/my-orders', '_blank', 'noopener');
  };

  return (
    <div class="pg-reglages">
      <Entete retour={retour} />
      <div class="rg-corps">
        <h1 class="rg-titre">{t('rs_title')}</h1>
        <p class="rg-intro">{t('rs_intro')}</p>

        <div class="rg-motifs">
          {MOTIFS.map((m) => (
            <button
              key={m.k}
              class={'rg-motif' + (motif === m.k ? ' on' : '')}
              onClick={() => setMotif(m.k)}
            >{t(m.cle)}</button>
          ))}
        </div>

        {motif === 'prix' && (
          <div class="rg-offre">
            <h4>{t('rs_o_prix_t')}</h4>
            <p>{t('rs_o_prix_p')}</p>
            <button class="rg-accepte" onClick={() => { noter('offre_prix'); retour(); }}>
              {t('rs_o_prix_b')}
            </button>
          </div>
        )}
        {motif === 'usage' && (
          <div class="rg-offre">
            <h4>{t('rs_o_usage_t')}</h4>
            <p>{t('rs_o_usage_p')}</p>
            <button class="rg-accepte" onClick={() => { noter('offre_usage'); retour(); }}>
              {t('rs_o_usage_b')}
            </button>
          </div>
        )}
        {(motif === 'fonction' || motif === 'autre') && (
          <textarea
            class="rg-texte" rows="3" value={texte}
            placeholder={t('rs_precise_ph')}
            onInput={(e) => setTexte(e.target.value)}
          />
        )}

        <button class="rg-principal rg-principal--danger" onClick={confirmer}>
          {t('rs_confirm')}
        </button>
        <p class="rg-note">{t('rs_note')}</p>
      </div>
    </div>
  );
}

// ---------- Garde-fou d'affichage ----------
// Quand un rendu Preact echoue, le DOM precedent RESTE en place : on
// croit que l'appui n'a rien declenche, alors que l'ecran a plante.
// PIEGE de la premiere version : un try/catch autour de enfant() ne
// protegeait rien — appeler enfant() cree le vnode, il n'execute pas
// le rendu du composant, qui a lieu plus tard dans Preact. Seule une
// vraie frontiere d'erreur (componentDidCatch) intercepte un plantage
// de rendu. C'est ce qu'est cette classe.
class Garde extends Component {
  constructor() { super(); this.state = { erreur: null }; }
  componentDidCatch(e) { this.setState({ erreur: String((e && e.message) || e) }); }
  render() {
    if (this.state.erreur) {
      return (
        <div class="pg-reglages">
          <Entete retour={this.props.retour} />
          <div class="rg-corps">
            <button class="rg-retour" onClick={this.props.retour}>← {t('set_title')}</button>
            <p class="rg-note">Cet écran a rencontré une erreur&nbsp;: {this.state.erreur}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------- Menu principal ----------
export function Reglages() {
  const vue = vueReglages.value;
  // Retour Android : ferme les reglages au lieu de changer l'onglet
  // invisible dessous (meme famille que Statistiques avancees, 8/08).
  useRetour(true, fermerReglages);
  // Changer d'ecran remonte en haut. Les reglages remplacent toute
  // la page : en passant d'une liste longue a un ecran court, le
  // defilement du document restait ou il etait et l'ecran d'arrivee
  // s'affichait hors champ — on avait l'impression que l'appui
  // n'avait rien fait.
  useEffect(() => {
    try { window.scrollTo(0, 0); } catch (e) {}
    const c = document.querySelector('.pg-reglages');
    if (c && c.parentElement) c.parentElement.scrollTop = 0;
  }, [vue]);
  const u = utilisateur.value;
  const prem = estPremium.value;
  const [lg, setLg] = useState(langueApp.value);
  const [pesee, setPesee] = useState(true);
  const [coach, setCoach] = useState(true);
  const [confirmeSortie, setConfirmeSortie] = useState(false);

  useEffect(() => {
    try {
      const n = JSON.parse(localStorage.getItem('belfit_notifs') || '{}');
      setPesee(n.pesee !== false);
      setCoach(n.coach !== false);
    } catch (e) { /* valeurs par defaut */ }
  }, []);

  const sauverNotifs = (p, c) => {
    try { localStorage.setItem('belfit_notifs', JSON.stringify({ pesee: p, coach: c })); }
    catch (e) { /* non bloquant */ }
  };

  const auMenu = () => { vueReglages.value = 'menu'; };
  // Sous-ecran ouvert (compte, resiliation) : le retour Android y
  // revient au menu des reglages — un cran, pas trois.
  const aAbo = () => { vueReglages.value = 'abonnement'; };
  useRetour(vue === 'compte' || vue === 'resilier' || vue === 'abonnement', vue === 'resilier' ? aAbo : auMenu);
  if (vue === 'compte') return <Garde retour={auMenu}><EcranCompte retour={auMenu} /></Garde>;
  if (vue === 'abonnement') return <Garde retour={auMenu}><EcranAbonnement retour={auMenu} /></Garde>;
  if (vue === 'resilier') return <Garde retour={aAbo}><EcranResilier retour={aAbo} /></Garde>;

  return (
    <div class="pg-reglages">
      <Entete retour={fermerReglages} />
      <div class="rg-corps">
        <h1 class="rg-titre">{t('set_title')}</h1>

        <p class="rg-section">{t('set_sec_account')}</p>
        <div class="rg-carte">
          <Rangee titre={t('set_account')} sous={t('set_account_sub')}
                  onClick={() => { vueReglages.value = 'compte'; }} />
          <Rangee titre={t('set_sub')} sous={t('abo_sous')}
                  onClick={() => { vueReglages.value = 'abonnement'; }} />
        </div>

        {/* La silhouette se reglait sous « Parametres du compte », un
            cran plus bas : Raci ne l'y trouvait pas. Elle remonte au
            premier niveau, a cote de la langue — meme nature, un choix
            d'affichage qui se prend une fois et se retrouve vite. */}
        <p class="rg-section">{t('set_sec_affichage')}</p>
        <div class="rg-carte">
          <div class="rg-rangee rg-rangee--inerte">
            <span class="rg-txt">
              <span class="rg-nom">{t('set_lang')}</span>
              <span class="rg-sous">{t('set_lang_sub')}</span>
            </span>
            <span class="rg-seg">
              {['fr', 'en', 'nl'].map((l) => (
                <button key={l} class={lg === l ? 'on' : ''}
                        onClick={() => { setLangue(l); setLg(l); }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </span>
          </div>
          <div class="rg-rangee rg-rangee--inerte">
            <span class="rg-txt">
              <span class="rg-nom">{t('acc_sexe')}</span>
              <span class="rg-sous">{t('set_sexe_sub')}</span>
            </span>
            <span class="rg-seg">
              <button class={sexe.value === 'h' ? 'on' : ''}
                aria-pressed={sexe.value === 'h'}
                onClick={() => { sexe.value = 'h'; }}>{t('acc_homme')}</button>
              <button class={sexe.value === 'f' ? 'on' : ''}
                aria-pressed={sexe.value === 'f'}
                onClick={() => { sexe.value = 'f'; }}>{t('acc_femme')}</button>
            </span>
          </div>
        </div>

        {/* Notifications retirees le 23/09 : les deux bascules
            enregistraient un choix que rien ne lisait. Elles reviennent
            avec l'application native et de vrais rappels. */}

        <p class="rg-section">{t('set_sec_aide')}</p>
        <div class="rg-carte">
          <Rangee titre={t('set_write')} sous={t('set_write_sub')}
                  href="mailto:contact@belfit.be" />
          <Rangee titre={t('set_suggest')} sous={t('set_suggest_sub')}
                  href="mailto:contact@belfit.be?subject=Suggestion" />
          <Rangee titre="J'ai un code" sous="Débloquer l'accès PRO" onClick={() => { codeOuvert.value = true; }} />
          <CodeAcces />
          {!APP_ANDROID && <Rangee titre={t('set_coach_cgv')} href="https://www.belfit.be/cgv.html" />}
          <Rangee titre={t('set_privacy')} href="https://www.belfit.be/confidentialite.html" />
        </div>

        <p class="rg-version">{t('set_ver')} {VERSION_APP}</p>

        {/* Pendant la periode sans compte, l'ecran de connexion n'existe
            plus : ceci le rouvre. Les donnees d'un compte vivent sous
            son uid — la session invite ne les voit pas, elles ne sont
            pas perdues pour autant. */}
        {SANS_COMPTE && (
          <button class="rg-connexion" onClick={() => { demanderConnexion.value = true; }}>
            {t('set_login')}
          </button>
        )}

        {/* Deconnexion confirmee (23/09) : elle efface le journal
            local du telephone. Un appui par erreur ne doit pas suffire. */}
        <button class="rg-deconnexion" onClick={() => setConfirmeSortie(true)}>{t('set_logout')}</button>
        {confirmeSortie && (
          <div class="rg-modale" onClick={(e) => { if (e.target === e.currentTarget) setConfirmeSortie(false); }}>
            <div class="rg-modale-boite">
              <h3>{t('sortie_titre')}</h3>
              <p>{t('sortie_texte')}</p>
              <button class="rg-principal rg-principal--danger" onClick={() => {
                try {
                  ['repz_firstName', 'repz_profile', 'belfit_v2_journal'].forEach(k => localStorage.removeItem(k));
                } catch (e) { /* non bloquant */ }
                setConfirmeSortie(false);
                vueReglages.value = null;
                deconnexion();
              }}>{t('set_logout')}</button>
              <button class="rg-lien" onClick={() => setConfirmeSortie(false)}>{t('cancel')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
