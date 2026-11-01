import { useState, useEffect, useRef } from 'preact/hooks';
import { connexion, connexionGoogle, connexionApple, APPLE_ACTIF, inscription, messageErreurAuth, envoyerLienReinitialisation } from '../services/firebase.js';
import { t, langue } from '../i18n/index.js';
import { signal } from '@preact/signals';

// Force du mot de passe : memes regles qu'en v1 (index.html).
// 8 caracteres minimum, avec majuscule, minuscule, chiffre et symbole.
function mdpValide(pw) {
  return pw.length >= 8 && /[a-z]/.test(pw) && /[A-Z]/.test(pw)
    && /[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw);
}
function scoreMdp(pw) {
  let s = 0;
  if (/[a-z]/.test(pw)) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  if (pw.length < 8) s = Math.min(s, 2);   // longueur insuffisante = plafonne
  return Math.min(s, 4);
}
/** Ce qui manque encore, enonce simplement. */
function manquesMdp(pw) {
  const m = [];
  if (pw.length < 8) m.push('8 caractères');
  if (!/[A-Z]/.test(pw)) m.push('majuscule');
  if (!/[a-z]/.test(pw)) m.push('minuscule');
  if (!/[0-9]/.test(pw)) m.push('chiffre');
  if (!/[^a-zA-Z0-9]/.test(pw)) m.push('symbole');
  return m;
}

// Un message d'accueil tire au sort a l'ouverture, comme une salutation
// qui ne se repete pas mot pour mot chaque jour. Fige au montage : il ne
// doit pas changer sous les yeux pendant que la personne tape.

// Ecran de connexion / inscription — sobre, palette BelFit.

/** Oeil d'affichage du mot de passe — meme geste et meme trace qu'en v1. */
function ChampMotDePasse({ valeur, onInput, placeholder, autocomplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div class="pw-wrap">
      <input
        type={visible ? 'text' : 'password'} placeholder={placeholder} value={valeur}
        onInput={onInput} required autocomplete={autocomplete}
      />
      <button
        type="button" class="pw-eye" onClick={() => setVisible(!visible)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      >
        <svg viewBox="0 0 24 24">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  );
}

/**
 * Message d'erreur hors du composant. Une inscription qui echoue apres
 * la creation du compte demonte puis remonte cet ecran : un etat local
 * disparaitrait avec lui, et la personne se retrouverait devant un
 * formulaire vierge, sans la moindre explication.
 */
export const erreurPersistante = signal('');
const CLE_EMAIL = 'belfit_dernier_email';

// Fond « aurore » commun a tous les ecrans de connexion (28/09) : Raci
// voyait l'ecran de connexion en noir uni, sans la maquette validee.
function Aurore() {
  return (
    <>
      <div class="la-aurore" aria-hidden="true"><i class="la-b la-b1" /><i class="la-b la-b2" /><i class="la-b la-b3" /><i class="la-b4" /></div>
      <div class="la-voile" aria-hidden="true" />
    </>
  );
}

export function LoginScreen() {
  // Un programme construit pendant l'accueil attend d'etre sauvegarde :
  // on ouvre directement l'inscription, prenom deja rempli.
  // Accueil sombre (28/09, maquette validee) pour un nouveau venu ; celui
  // qui s'est deja connecte sur cet appareil retombe sur la connexion.
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(CLE_EMAIL) ? 'connexion' : 'accueil'; } catch (e) { return 'accueil'; }
  });
  
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem(CLE_EMAIL) || ''; } catch (e) { return ''; }
  });
  const [prenom, setPrenom] = useState('');
  const [mdp, setMdp] = useState('');
  const [mdp2, setMdp2] = useState('');
  const [consent, setConsent] = useState(false);
  const [erreurLocale, setErreurLocale] = useState('');
  const erreur = erreurLocale || erreurPersistante.value;
  const setErreur = (v) => { setErreurLocale(v); erreurPersistante.value = v; };
  const [chargement, setChargement] = useState(false);
  // Recuperation de mot de passe : champ dedie et message de reussite,
  // comme le formulaire separe de la v1 (recoveryForm).
  const [emailRecup, setEmailRecup] = useState(() => {
    try { return localStorage.getItem(CLE_EMAIL) || ''; } catch (e) { return ''; }
  });
  const [msgOk, setMsgOk] = useState('');

  // Etat du nom d'utilisateur : 'vide' | 'invalide' | 'verif' | 'libre' | 'pris'

  const valider = async (e) => {
    e.preventDefault();
    setErreur('');
    erreurPersistante.value = '';
    if (mode === 'inscription') {
      if (!mdpValide(mdp)) {
        setErreur('Mot de passe trop faible : 8 caractères min avec majuscule, minuscule, chiffre et symbole');
        return;
      }
      if (mdp !== mdp2) { setErreur('Les deux mots de passe ne correspondent pas'); return; }
      if (!prenom.trim()) { setErreur(t('js_enter_firstname')); return; }
      if (!consent) { setErreur("Merci d'accepter la politique de confidentialité pour créer ton compte"); return; }
    }
    setChargement(true);
    try {
      if (mode === 'connexion') await connexion(email.trim(), mdp);
      else await inscription(email.trim(), mdp, prenom.trim());
      try { localStorage.setItem(CLE_EMAIL, email.trim()); } catch (e) { /* tant pis */ }
      // onAuthStateChanged fera basculer l'app tout seul
    } catch (err) {
      setErreur(messageErreurAuth(err.code));
    }
    setChargement(false);
  };

  // La v1 remplace le formulaire de connexion par celui-ci dans la meme
  // carte : ni bouton Google, ni separateur, juste l'adresse et l'envoi.
  if (mode === 'recuperation') {
    const envoyer = async (e) => {
      e.preventDefault();
      setErreur(''); setMsgOk(''); setChargement(true);
      try {
        await envoyerLienReinitialisation(emailRecup, langue.value);
        setMsgOk(t('recup_ok'));
        // Retour automatique a la connexion apres 3 s, comme en v1.
        setTimeout(() => { setMode('connexion'); setMsgOk(''); }, 3000);
      } catch (err) {
        setErreur(t('recup_erreur'));
      }
      setChargement(false);
    };

    return (
      <div class="login-fond login-fond--accueil"><Aurore /><div class="login-ecran login-ecran--aurore">
        <img src="/belfit-logo-bf.png" alt="BelFit" class="login-logo" />
        <h1 class="login-titre">{t('recup_titre')}</h1>

        <form onSubmit={envoyer} class="login-form">
          {erreur && <div class="login-erreur">{erreur}</div>}
          {msgOk && <div class="login-ok">{msgOk}</div>}
          <input
            type="email" placeholder={t('email')} value={emailRecup}
            onInput={e => setEmailRecup(e.currentTarget.value)} required
            autocomplete="email" autocapitalize="none" spellcheck={false}
          />
          <button type="submit" class="login-btn" disabled={chargement}>
            {chargement ? t('recup_envoi') : t('recup_envoyer')}
          </button>
        </form>

        <button
          class="login-bascule"
          onClick={() => { setMode('connexion'); setErreur(''); setMsgOk(''); }}
        >
          {t('recup_retour')}
        </button>
      </div></div>
    );
  }

  const logoGoogle = (
    <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41 35.4 44 30.2 44 24c0-1.2-.1-2.4-.4-3.5z"/></svg>
  );

  const logoApple = (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z"/></svg>
  );
  const boutonApple = (classe) => APPLE_ACTIF && (
    <button class={classe + ' bt-apple'} onClick={async () => {
      setErreur('');
      try { await connexionApple(); }
      catch (e) { setErreur(messageErreurAuth(e && e.code)); }
    }}>{logoApple}Continuer avec Apple</button>
  );

  // ----- Accueil d'un nouveau venu : aurore aux couleurs du logo -----
  // (maquette « A sans cadre » validee le 28/09, contenu remonte vers le centre)
  if (mode === 'accueil') {
    return (
      <div class="login-fond login-fond--accueil">
        <Aurore />
        <div class="login-accueil">
          <img src="/belfit-logo-bf.png" alt="BelFit" class="la-logo" />
          <p class="la-marque">BELFIT</p>
          <div class="la-bloc">
            <h1 class="la-titre">Mange juste.<br /><span>Progresse vraiment.</span></h1>
            <p class="la-sous">Journal, séances et un vrai coach, dans une seule app.</p>
            <button class="la-cta" onClick={() => { setMode('inscription'); setErreur(''); }}>Créer mon compte</button>
            <button class="la-google" onClick={async () => {
              setErreur('');
              try { await connexionGoogle(); }
              catch (e) { setErreur(messageErreurAuth(e && e.code)); }
            }}>{logoGoogle}{t('auth_google')}</button>
            {boutonApple('la-google')}
            {erreur && <div class="login-erreur">{erreur}</div>}
            <p class="la-deja">Déjà un compte ? <button onClick={() => { setMode('connexion'); setErreur(''); }}>Se connecter</button></p>
          </div>
          <p class="la-pied"><a href="https://www.belfit.be/cgv.html" target="_blank" rel="noopener">Conditions</a> · <a href="https://www.belfit.be/confidentialite.html" target="_blank" rel="noopener">Confidentialité</a></p>
        </div>
      </div>
    );
  }

  return (
    <div class="login-fond login-fond--accueil"><Aurore /><div class="login-ecran login-ecran--aurore">
      <img src="/belfit-logo-bf.png" alt="BelFit" class="login-logo" />
      {/* Raci, 31/10 : plus de titre d'accueil sur l'ecran de connexion. */}
      {mode !== 'connexion' && (
        <h1 class="login-titre">
          {prenom ? `Garde ton programme, ${prenom}` : t('hello_new')}
        </h1>
      )}

      <button
        class="login-google"
        onClick={async () => {
          setErreur('');
          try { await connexionGoogle(); }
          catch (e) { setErreur(messageErreurAuth(e && e.code)); }
        }}
      >
        <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41 35.4 44 30.2 44 24c0-1.2-.1-2.4-.4-3.5z"/></svg>
        {t('auth_google')}
      </button>
      {boutonApple('login-google')}
      <div class="login-ou"><span>{t('ou')}</span></div>

      <form onSubmit={valider} class="login-form">
        {mode === 'inscription' && (
          <input
            type="text" placeholder={t('register_firstname_ph')} value={prenom}
            onInput={e => setPrenom(e.currentTarget.value)} required
            autocomplete="given-name" maxLength={30}
          />
        )}
        <input
          type="email"
          placeholder={t('email')}
          value={email}
          onInput={e => setEmail(e.currentTarget.value)} required
          autocomplete={mode === 'connexion' ? 'username' : 'email'}
          autocapitalize="none" spellcheck={false}
        />

        <ChampMotDePasse
          placeholder={t("mdp")} valeur={mdp}
          onInput={e => setMdp(e.currentTarget.value)}
          autocomplete={mode === 'connexion' ? 'current-password' : 'new-password'}
        />

        {mode === 'inscription' && (
          <>
            <div class="login-pw-jauge">
              <div
                class="login-pw-bar"
                style={{
                  width: mdp ? ['25%', '45%', '70%', '100%'][Math.max(0, scoreMdp(mdp) - 1)] : '0',
                  background: ['#DC2626', '#F97316', '#F7B500', '#10B981'][Math.max(0, scoreMdp(mdp) - 1)],
                }}
              />
            </div>
            <div class={'login-pseudo-note' + (mdp && mdpValide(mdp) ? ' login-pseudo-note--libre' : '')}>
              {!mdp
                ? '8 caractères min, avec majuscule, minuscule, chiffre et symbole.'
                : mdpValide(mdp) ? '✓ Mot de passe solide' : 'Manque : ' + manquesMdp(mdp).join(', ')}
            </div>

            <ChampMotDePasse
              placeholder="Confirmer le mot de passe" valeur={mdp2}
              onInput={e => setMdp2(e.currentTarget.value)} autocomplete="new-password"
            />

            <label class="login-consent">
              <input
                type="checkbox" checked={consent}
                onChange={e => setConsent(e.currentTarget.checked)}
              />
              <span>
                {t('register_consent').split('{link}')[0]}
                <a href="https://www.belfit.be/confidentialite.html" target="_blank" rel="noopener">{t('privacy_policy')}</a>
                {t('register_consent').split('{link}')[1]}
              </span>
            </label>
          </>
        )}

        {erreur && <div class="login-erreur">{erreur}</div>}
        <button type="submit" class="login-btn" disabled={chargement || (mode === 'inscription' && !consent)}>
          {chargement ? '…' : (mode === 'connexion' ? t('connexion') : t('inscription'))}
        </button>
      </form>

      {/* Raci, 31/10 : « S'inscrire » devient un vrai bouton secondaire. */}
      {mode === 'connexion' ? (
        <div class="login-inscr">
          <p class="login-inscr-q">{t('pas_compte_q')}</p>
          <button
            type="button"
            class="login-btn-sec"
            onClick={() => { setMode('inscription'); setErreur(''); setMdp2(''); setConsent(false); }}
          >
            {t('sinscrire')}
          </button>
        </div>
      ) : (
        <button
          class="login-bascule"
          onClick={() => { setMode('connexion'); setErreur(''); setMdp2(''); setConsent(false); }}
        >
          {t('deja_compte')}
        </button>
      )}

      {/* « Mot de passe oublie » reste volontairement en retrait (v1). */}
      {mode === 'connexion' && (
        <button
          class="login-oubli"
          onClick={() => { setMode('recuperation'); setErreur(''); setMsgOk(''); }}
        >
          {t('mdp_oublie')}
        </button>
      )}
    </div></div>
  );
}
