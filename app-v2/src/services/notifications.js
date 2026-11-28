// ============================================================
// NOTIFICATIONS (28/11, Raci) — cote app.
//
// Le client les active dans Reglages. On demande la permission du
// telephone, on enregistre le service worker dedie (/v2/push-sw.js,
// portee /v2/push/ : il ne controle aucune page), puis Firebase
// Messaging donne un jeton qu'on range dans users/{uid}.pushJetons.
// Le serveur (functions/notifications.js) envoie a ces jetons.
//
// Le choix est memorise sur le telephone : a chaque ouverture, si les
// notifications sont actives, le jeton est rafraichi en silence (il
// peut changer) — jamais de demande de permission sans geste du client.
// ============================================================
import { signal } from '@preact/signals';
import { app, utilisateur } from './firebase.js';

const CLE = 'belfit_notifs';
const PORTEE = '/v2/push/';
/** 'indispo' | 'off' | 'on' | 'bloque' | 'attente' */
export const etatNotifs = signal(etatInitial());

function possible() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}
function etatInitial() {
  if (!possible()) return 'indispo';
  if (Notification.permission === 'denied') return 'bloque';
  let voulu = false;
  try { voulu = localStorage.getItem(CLE) === '1'; } catch (e) {}
  return voulu && Notification.permission === 'granted' ? 'on' : 'off';
}

/** Cle courte et stable d'un jeton (champ Firestore). */
function cleJeton(j) {
  let h = 0;
  for (let i = 0; i < j.length; i++) h = (h * 31 + j.charCodeAt(i)) | 0;
  return 'j' + (h >>> 0).toString(36) + j.length.toString(36);
}

async function jeton() {
  const reg = await navigator.serviceWorker.register('/v2/push-sw.js', { scope: PORTEE });
  const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
  if (!(await isSupported())) throw new Error('indispo');
  return getToken(getMessaging(app), { serviceWorkerRegistration: reg });
}

async function enregistrer(j) {
  const u = utilisateur.peek();
  if (!u || !u.uid || !j) return;
  const { getFirestore, doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(getFirestore(app), 'users', u.uid), {
    pushJetons: { [cleJeton(j)]: { jeton: j, le: new Date().toISOString(), ua: navigator.userAgent.slice(0, 120) } },
  }, { merge: true });
}

/** Geste du client : demande la permission et active. Rend l'etat final. */
export async function activerNotifs() {
  if (!possible()) { etatNotifs.value = 'indispo'; return 'indispo'; }
  etatNotifs.value = 'attente';
  try {
    const p = await Notification.requestPermission();
    if (p !== 'granted') { etatNotifs.value = p === 'denied' ? 'bloque' : 'off'; return etatNotifs.value; }
    const j = await jeton();
    await enregistrer(j);
    try { localStorage.setItem(CLE, '1'); } catch (e) {}
    etatNotifs.value = 'on';
  } catch (e) {
    console.warn('Notifications :', e);
    etatNotifs.value = e && e.message === 'indispo' ? 'indispo' : 'off';
  }
  return etatNotifs.value;
}

export async function desactiverNotifs() {
  try { localStorage.setItem(CLE, '0'); } catch (e) {}
  etatNotifs.value = 'off';
  try {
    const reg = await navigator.serviceWorker.getRegistration(PORTEE);
    const { getMessaging, getToken, deleteToken } = await import('firebase/messaging');
    const m = getMessaging(app);
    const j = reg ? await getToken(m, { serviceWorkerRegistration: reg }).catch(() => null) : null;
    if (j) {
      const u = utilisateur.peek();
      if (u && u.uid) {
        const { getFirestore, doc, updateDoc, deleteField } = await import('firebase/firestore');
        await updateDoc(doc(getFirestore(app), 'users', u.uid), { ['pushJetons.' + cleJeton(j)]: deleteField() }).catch(() => {});
      }
      await deleteToken(m).catch(() => {});
    }
  } catch (e) { /* rien : le serveur retire seul un jeton mort */ }
}

/** A l'ouverture : jeton rafraichi en silence si le client les a activees. */
export function rafraichirNotifs() {
  if (etatInitial() !== 'on') return;
  const essai = () => { if (utilisateur.peek()) jeton().then(enregistrer).catch(() => {}); };
  setTimeout(essai, 6000);
}
