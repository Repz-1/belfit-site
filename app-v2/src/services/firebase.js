import { initializeApp } from 'firebase/app';
import { demanderConnexion } from '../acces-invite.js';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  signInAnonymously,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import { signal, computed } from '@preact/signals';

// ============================================================
// FIREBASE v2 — SDK modulaire (leger, tree-shakable).
// MEME projet et MEMES comptes que le site actuel : un utilisateur
// existant se connecte avec ses identifiants habituels.
// ============================================================

export const app = initializeApp({
  apiKey: 'AIzaSyAN07MM-t2wIPSwoo0shrV1OfMfIDC-Z0I',
  // belfit.be (02/10) : la fenetre Google affiche notre domaine. Les
  // pages /__/auth/ sont copiees au build (tools/auth-helper.mjs).
  authDomain: 'belfit.be',
  projectId: 'repz-baf60',
  storageBucket: 'repz-baf60.firebasestorage.app',
  messagingSenderId: '403252293048',
  appId: '1:403252293048:web:e7db6aed4ba92f0ebfb34d',
});

// getAuth() laissait Firebase choisir seul ou ranger la session. Si
// IndexedDB est indisponible une seule fois — Chrome Android sous
// pression de stockage, onglet restaure, quota atteint — il retombe
// SILENCIEUSEMENT en memoire : la session meurt au rechargement
// suivant, et l'application demande de se reconnecter sans que
// personne se soit deconnecte. On impose donc la chaine, avec
// localStorage en second : il reste un magasin durable, jamais la
// memoire vive.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  // Sans ce resolveur, initializeAuth refuse popup et redirection Google
  // (auth/argument-error, 01/10). getAuth() l'ajoutait tout seul.
  popupRedirectResolver: browserPopupRedirectResolver,
});


// --- Signaux d'etat : toute l'app peut reagir a la connexion ---
// utilisateur : null = deconnecte, objet = connecte
// authPrete   : false tant que Firebase n'a pas repondu (evite le flash ecran login)
export const utilisateur = signal(null);
export const authPrete = signal(false);
export const sortieDemandee = signal(false);
const CLE_SORTIE = 'belfit_sortie';

export const identite = computed(() => utilisateur.value ? utilisateur.value.uid : null);

function marquerSortie() {
  sortieDemandee.value = true;
  demanderConnexion.value = true;
  try { localStorage.setItem(CLE_SORTIE, '1'); } catch (e) { /* tant pis */ }
}

function sortieEnCours() {
  if (sortieDemandee.value) return true;
  try { return localStorage.getItem(CLE_SORTIE) === '1'; } catch (e) { return false; }
}

function oublierSortie() {
  sortieDemandee.value = false;
  try { localStorage.removeItem(CLE_SORTIE); } catch (e) { /* tant pis */ }
}

onAuthStateChanged(auth, (u) => {
  if (u && sortieEnCours()) {
    utilisateur.value = null;
    demanderConnexion.value = true;
    authPrete.value = true;
    signOut(auth).catch(() => {});
    return;
  }
  if (u) {
    oublierSortie();
    demanderConnexion.value = false;
    utilisateur.value = u;
    authPrete.value = true;
    return;
  }
  if (sortieEnCours() || demanderConnexion.value) {
    utilisateur.value = null;
    demanderConnexion.value = true;
    authPrete.value = true;
    return;
  }
  utilisateur.value = null;
  authPrete.value = true;
});

if (auth.currentUser && !sortieEnCours()) {
  utilisateur.value = auth.currentUser;
  authPrete.value = true;
}

function memoriserPrenom(user) {
  try {
    const prenom = (user.displayName || '').split(' ')[0] || '';
    if (prenom) localStorage.setItem('repz_firstName', prenom);
  } catch (e) {}
}

export async function connexion(identifiant, mdp) {
  oublierSortie();
  const cred = await signInWithEmailAndPassword(auth, String(identifiant || '').trim(), mdp);
  // Seules l'inscription et Google memorisaient le prenom : apres une
  // simple reconnexion l'en-tete disait « Bonjour » tout court.
  memoriserPrenom(cred.user);
  return cred;
}

export async function connexionGoogle() {
  // Meme flux que la v1 : Google avec choix du compte. Popup d'abord ;
  // si le navigateur mobile la bloque, on bascule en redirection
  // (le resultat est recupere au rechargement, voir ci-dessous).
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  oublierSortie();
  try {
    const cred = await signInWithPopup(auth, provider);
    memoriserPrenom(cred.user);
    return cred.user;
  } catch (e) {
    if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user'
      || e.code === 'auth/operation-not-supported-in-this-environment'
      || e.code === 'auth/cancelled-popup-request')) {
      await signInWithRedirect(auth, provider);
      return null;   // la page va se recharger
    }
    throw e;
  }
}

/**
 * Connexion avec Apple (02/10). Le bouton n'apparait que si APPLE_ACTIF :
 * il faut d'abord configurer Apple dans Firebase (Services ID, cle),
 * sinon le clic renverrait une erreur. Meme flux que Google.
 */
export const APPLE_ACTIF = false;
export async function connexionApple() {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  provider.setCustomParameters({ locale: 'fr_FR' });
  oublierSortie();
  try {
    const cred = await signInWithPopup(auth, provider);
    memoriserPrenom(cred.user);
    return cred.user;
  } catch (e) {
    if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user'
      || e.code === 'auth/operation-not-supported-in-this-environment'
      || e.code === 'auth/cancelled-popup-request')) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw e;
  }
}

// Retour de redirection Google : recupere la session au chargement.
getRedirectResult(auth).then(cred => {
  if (cred && cred.user) { memoriserPrenom(cred.user); }
}).catch(() => {});

/**
 * Code de parrainage : tire au sort, sans aucun lien avec le pseudo,
 * le prenom ou l'e-mail — un code ne doit rien reveler de son porteur
 * ni pouvoir etre devine. Alphabet sans caracteres ambigus (ni O/0,
 * ni I/1/L) : le code se dicte a voix haute sans erreur.
 */
function genererCodeParrainage() {
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return 'BF-' + code.slice(0, 4) + '-' + code.slice(4);
}

/**
 * Inscription : prenom + e-mail + mot de passe (le pseudo a ete
 * abandonne le 25/07 — moins de champs, moins de friction).
 */
export async function inscription(email, mdp, prenom) {
  oublierSortie();
  const cred = await createUserWithEmailAndPassword(auth, String(email).trim(), mdp);
  // Le prenom sert a s'adresser a la personne (en-tete, page Premium,
  // e-mails du coach) : displayName = prenom, comme en v1.
  const p = String(prenom || '').trim();
  try { await updateProfile(cred.user, { displayName: p }); } catch (e) {}
  try { localStorage.setItem('repz_firstName', p); } catch (e) {}

  // RGPD : preuve du consentement (horodatage + version de la politique),
  // et code de parrainage tire au sort. Non bloquant : un echec reseau
  // ne doit pas priver l'utilisateur du compte qu'il vient de creer.
  try {
    const { getFirestore, doc, setDoc } = await import('firebase/firestore');
    await setDoc(
      doc(getFirestore(app), 'users', cred.user.uid),
      {
        prenom: p,
        consentRGPD: { accepte: true, date: new Date().toISOString(), version: '2026-07' },
        mon_code_parrainage: genererCodeParrainage(),
      },
      { merge: true }
    );
  } catch (e) { /* non bloquant */ }

  return cred;
}

/**
 * Session anonyme — contournement temporaire de l'ecran de connexion
 * (voir src/acces-libre.js). Firebase delivre un vrai jeton sans mot
 * de passe : les regles Firestore sont satisfaites et l'application
 * fonctionne entierement, mais sur un compte NEUF, pas celui de
 * l'utilisateur. Necessite « Anonymous » active dans la console.
 */
export async function connexionAnonyme() {
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export async function deconnexion() {
  adresseConfirmee.value = false;
  marquerSortie();
  utilisateur.value = null;
  authPrete.value = true;
  try { await signOut(auth); } catch (e) { /* pas de session Firebase (invite) */ }
}

// Messages d'erreur en francais
export function messageErreurAuth(code) {
  const messages = {
    'auth/invalid-email': 'Adresse e-mail invalide',
    'auth/user-not-found': 'Aucun compte avec cet e-mail',
    'auth/wrong-password': 'Mot de passe incorrect',
    'auth/invalid-credential': 'E-mail ou mot de passe incorrect',
    'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail',
    'auth/weak-password': 'Mot de passe trop court (6 caractères min.)',
    'auth/too-many-requests': 'Trop de tentatives, réessaie dans un moment',
    'auth/network-request-failed': 'Pas de connexion internet',
    // Identifiant sans arobase : la resolution du pseudo a echoue.
    'pseudo/pris': 'Ce nom d\'utilisateur est déjà pris',
    'pseudo/invalide': 'Choisis un nom d\'utilisateur valide et disponible',
    'pseudo/reseau': 'Le serveur ne repond pas. Ton compte n\'a pas ete cree — reessaie dans un instant.',
    // Google (01/10) : messages precis au lieu de l'erreur generique.
    'auth/account-exists-with-different-credential': 'Un compte existe déjà avec cet e-mail : connecte-toi avec ton mot de passe',
    'auth/unauthorized-domain': 'Connexion Google refusée sur cette adresse du site',
    'auth/operation-not-allowed': 'Connexion Google désactivée côté serveur',
    'auth/web-storage-unsupported': 'Ton navigateur bloque la connexion Google (navigation privée ?)',
  };
  // Code affiche entre parentheses : une capture suffit pour diagnostiquer.
  return messages[code] || ('Erreur de connexion, réessaie' + (code ? ' (' + code + ')' : ''));
}

/**
 * Envoi du lien de reinitialisation — meme chaine qu'en v1 (index.html).
 * On passe d'abord par la Cloud Function : le courriel part alors de
 * belfit.be, aux couleurs de la marque, et renvoie vers notre propre
 * page. Si ce service ne repond pas, Firebase prend le relais : moins
 * beau, mais personne ne reste bloque devant un ecran muet.
 */
export async function envoyerLienReinitialisation(email, lang) {
  const lg = lang || 'fr';
  let envoye = false;
  try {
    const r = await fetch('https://europe-west1-repz-baf60.cloudfunctions.net/mailReinitialisation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, langue: lg }),
    });
    envoye = r.ok;
  } catch (e) { envoye = false; }

  if (!envoye) {
    try { auth.languageCode = lg; } catch (e) {}
    await sendPasswordResetEmail(auth, email);
  }
}

/** Mise en service de la confirmation d'adresse. Les comptes anterieurs
 *  portent tous emailVerified = false, faute d'avoir jamais ete
 *  sollicites : les bloquer reviendrait a mettre dehors l'integralite
 *  des inscrits d'un coup. Ils restent donc acquis. */
const DEBUT_CONFIRMATION = Date.parse('2026-07-24T00:00:00Z');

/** L'adresse reste-t-elle a confirmer ? Les comptes Google arrivent
 *  deja verifies par Google : on ne leur demande rien. */
export function adresseAConfirmer(u) {
  if (!u || u.emailVerified || adresseConfirmee.value) return false;
  const parMdp = (u.providerData || []).some((p) => p.providerId === 'password');
  if (!parMdp) return false;
  const cree = u.metadata && u.metadata.creationTime;
  if (!cree) return false;              // date illisible : on laisse passer
  return Date.parse(cree) >= DEBUT_CONFIRMATION;
}

/** Demande l'envoi du courriel de confirmation. La Cloud Function
 *  exige le jeton de session : personne ne peut declencher un envoi
 *  vers une adresse qui n'est pas la sienne. */
/** @returns {{etat:'deja'|'accepte', id:string|null}} Accepte = l'API d'envoi a pris le message, pas la boite. */
export async function envoyerMailVerification(lang) {
  const u = auth.currentUser;
  if (!u) throw new Error('pas de session');
  const jeton = await u.getIdToken();
  const r = await fetch('https://europe-west1-repz-baf60.cloudfunctions.net/mailVerification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jeton}` },
    body: JSON.stringify({ langue: lang || 'fr' }),
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 429) { const e = new Error('trop_tot'); e.etat = 'limite'; throw e; }
  if (!r.ok) { const e = new Error('envoi'); e.etat = 'erreur'; throw e; }
  if (d.deja) return { etat: 'deja', id: null };
  return { etat: 'accepte', id: typeof d.id === 'string' ? d.id : null };
}

/** Confirmation constatee pendant la session. Le SDK garde en memoire
 *  un instantane du compte et ne le remplace pas apres reload() : sans
 *  ce drapeau, l'ecran d'attente resterait affiche indefiniment. */
export const adresseConfirmee = signal(false);

/** Relit l'etat du compte cote serveur. */
export async function rafraichirUtilisateur() {
  const u = auth.currentUser;
  if (!u) return false;
  await u.reload();
  if (auth.currentUser && auth.currentUser.emailVerified) {
    adresseConfirmee.value = true;
    return true;
  }
  return false;
}
