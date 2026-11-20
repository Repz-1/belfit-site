import { signal, effect } from '@preact/signals';
import { PREMIUM_OUVERT } from '../acces-libre.js';
import { utilisateur } from '../services/firebase.js';
import { getApps } from 'firebase/app';
import { t } from '../i18n/index.js';
import { Entete } from './Entete.jsx';
import { BelfitPlus } from './BelfitPlus.jsx';

// Statut Premium lu depuis Firestore (ecrit par le webhook LemonSqueezy)
export const estPremium = signal(false);

// Periode de test : l'acces complet pour tout le monde, sans compte
// Premium ni paiement. Un seul interrupteur, dans acces-libre.js.
// Pose avant tout le reste : ni le cache, ni Firestore, ni l'apercu ne
// doivent pouvoir le contredire.
if (PREMIUM_OUVERT) estPremium.value = true;

// Permet de simuler l'etat Premium pour inspecter l'interface dans un
// navigateur de test. Sans cela, seule la version gratuite est visible
// et tout le contenu Premium se code a l'aveugle.
// N'a aucun effet en production : le drapeau n'est jamais pose par l'app,
// et le serveur reste seul juge des acces reels.
let apercuPremium = false;
try {
  apercuPremium = localStorage.getItem('belfit_v2_apercu_premium') === '1';
  if (apercuPremium) estPremium.value = true;
} catch (e) { /* stockage indisponible */ }

// Cache partage avec la v1 (app.html) : elle ecrit repz_premium apres
// avoir verifie Firestore. MAIS ce drapeau est pose PAR APPAREIL, pas
// par compte : si un membre Premium se deconnecte et qu'un autre compte
// se connecte sur le meme telephone, le drapeau seul ferait passer le
// nouveau venu pour Premium. On ne fait donc confiance au cache que si
// l'uid memorise a cote correspond au compte reellement connecte.
const CLE_PREM_V1 = 'repz_premium';
const CLE_PREM_UID = 'belfit_v2_prem_uid';

effect(() => {
  if (PREMIUM_OUVERT) { estPremium.value = true; return; }
  if (apercuPremium) return;          // l'apercu garde la main
  const u = utilisateur.value;
  if (!u) { estPremium.value = false; return; }   // deconnecte : jamais Premium

  // Demarrage rapide : le cache ne vaut que pour le MEME compte.
  try {
    estPremium.value = localStorage.getItem(CLE_PREM_V1) === '1' &&
      localStorage.getItem(CLE_PREM_UID) === u.uid;
  } catch (e) { estPremium.value = false; }

  // Puis Firestore tranche (source de verite, ecrite par le webhook).
  // Firestore en differe : voir services/sync.js pour la raison (170 Ko gzip)
  import('firebase/firestore').then(({ getFirestore, doc, getDoc }) =>
    getDoc(doc(getFirestore(getApps()[0]), 'users', u.uid)))
    .then(s => {
      const prem = s.exists() && s.data().premium === true;
      estPremium.value = prem;
      // Cache tenu a jour, avec l'uid proprietaire du drapeau.
      try {
        if (prem) {
          localStorage.setItem(CLE_PREM_V1, '1');
          localStorage.setItem(CLE_PREM_UID, u.uid);
        } else {
          localStorage.removeItem(CLE_PREM_V1);
          localStorage.removeItem(CLE_PREM_UID);
        }
      } catch (e) {}
    })
    .catch(() => {});   // hors ligne : le demarrage rapide fait foi
});

import { useState } from 'preact/hooks';
import '../legacy/premium.scoped.css';
import '../styles/premium-theme.css';

// Formules — liens LemonSqueezy repris tels quels du v1 (plans.html)
const FORMULES = {
  trimestriel: {
    lien: 'https://belfit.lemonsqueezy.com/checkout/buy/62c379de-5b7e-4a8d-868f-87595f4d7733',
    duree: '3 mois', parMois: '6,66', total: '19,99 € facturés', eco: '\u221217 %',
  },
  annuel: {
    lien: 'https://belfit.lemonsqueezy.com/checkout/buy/b66fe18e-6b2a-4953-ab29-d5b4ab99e04a',
    duree: '12 mois', parMois: '3,99', total: '47,88 € facturés', eco: '\u221250 %',
  },
};
// Les economies affichees sont calculees sur le tarif mensuel reel
// (7,99 €/mois) : 6,66 = -17 %, 3,99 = -50 %. Rien d'invente.

export function PremiumPage() {
  const u = utilisateur.value;
  const [formule, setFormule] = useState('annuel');   // formule mise en avant
  const [payOuvert, setPayOuvert] = useState(false);
  const [consent, setConsent] = useState(false);
  const [consentErr, setConsentErr] = useState(false);

  const construireUrl = (lien) => {
    let url = lien + '?checkout[billing_address][country]=BE';
    if (u) {
      url += '&checkout[custom][uid]=' + encodeURIComponent(u.uid);
      if (u.email) url += '&checkout[email]=' + encodeURIComponent(u.email);
    }
    return url;
  };

  const payer = () => setPayOuvert(true);
  const allerAuPaiement = () => {
    if (!consent) { setConsentErr(true); return; }
    window.location.href = construireUrl(FORMULES[formule].lien);
  };

  const dejaPremium = estPremium.value;

  let prenom = '';
  try { prenom = localStorage.getItem('repz_firstName') || ''; } catch (e) {}

  const Check = () => (
    <span class="ck"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M8.4 12.3l2.4 2.4 4.6-5" /></svg></span>
  );
  const Ligne = ({ nom, note, gratuit }) => (
    <div class="cmp-ligne">
      <span class="c-nom">
        {nom}
        {note && <em class="c-note">{note}</em>}
      </span>
      <span class="c-cell">{gratuit === true ? <Check /> : (gratuit || '—')}</span>
      <span class="c-cell on c-prem"><Check /></span>
    </div>
  );

  // Un abonne ne lit pas une page de vente : il entre dans son espace.
  // Pendant la periode de test, tout le monde est dans ce cas : la page
  // de vente n'a rien a proposer a quelqu'un qui a deja tout.
  if (PREMIUM_OUVERT || dejaPremium) return <BelfitPlus />;

  return (
    <div class="pg-premium">
      {/* Meme en-tete que le Journal : marque, prenom, profil et
          reglages. La barre precedente (fleche + logo centre) etait
          propre a cette page et faisait lire Premium comme un
          ailleurs ; c'est un onglet de l'app, pas une destination. */}
      <Entete />

      {/* Ouverture : le titre, une phrase, rien d'autre. Le cadran,
          son halo et le fond sombre sont retires — c'etait une
          banniere, pas un debut de page produit. */}
      <section class="prem-ouverture">
        <svg width="0" height="0" aria-hidden="true" style="position:absolute">
          <defs>
            <linearGradient id="premOr" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--or)' }} />
              <stop offset="54%" stop-color="var(--orange)" />
              <stop offset="100%" stop-color="var(--orange-fonce)" />
            </linearGradient>
          </defs>
        </svg>
        <h1 class="prem-titre">Premium</h1>
        <p class="prem-sous">Le meilleur de BelFit.</p>
      </section>

      {/* Ce que Premium change au quotidien. Formule en promesses,
          pas en liste de fonctionnalites : une fonctionnalite se
          compare, une promesse se ressent. Le delai annonce ici est
          celui deja affiche dans le tableau ci-dessous — aucune
          nouvelle promesse n'est faite. */}
      <p class="prem-lb">Ce que ça change</p>
      <div class="prem-promesses">
        <div class="pp">
          <span class="pp-ic">
            <svg class="pp-arc" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18.5" fill="none" stroke="url(#premOr)" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="86 116.2" transform="rotate(-90 20 20)" /></svg>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 20.5V8.4a2 2 0 012-2h9a2 2 0 012 2v12.1" /><path d="M9 6.4V4.6a3 3 0 016 0v1.8" /><path d="M9.5 12.6h5M9.5 16.2h3" /></svg>
          </span>
          <div>
            <h3>Un plan écrit pour toi</h3>
            <p>Ton coach construit ton plan alimentaire à partir de tes chiffres et de tes habitudes. Livré sous 24 à 48 h.</p>
          </div>
        </div>
        <div class="pp">
          <span class="pp-ic">
            <svg class="pp-arc" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18.5" fill="none" stroke="url(#premOr)" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="86 116.2" transform="rotate(-90 20 20)" /></svg>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8.8A2 2 0 015.5 6.8h1.8l1.2-2h7l1.2 2h1.8a2 2 0 012 2v8.4a2 2 0 01-2 2h-13a2 2 0 01-2-2z" /><circle cx="12" cy="13" r="3.4" /></svg>
          </span>
          <div>
            <h3>Encoder sans y penser</h3>
            <p>Photo, voix ou code-barres. Un repas complet se saisit en quelques secondes, pas en trois minutes.</p>
          </div>
        </div>
        <div class="pp">
          <span class="pp-ic">
            <svg class="pp-arc" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18.5" fill="none" stroke="url(#premOr)" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="86 116.2" transform="rotate(-90 20 20)" /></svg>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 19.5v-6.2" /><path d="M9.8 19.5V4.5" /><path d="M15.1 19.5v-9.4" /><path d="M20.4 19.5v-3.4" /></svg>
          </span>
          <div>
            <h3>Comprendre ce que tu manges</h3>
            <p>Fibres, sucres, graisses saturées, sel. Et des statistiques sans limite de durée pour voir ce qui marche vraiment.</p>
          </div>
        </div>
        <div class="pp">
          <span class="pp-ic">
            <svg class="pp-arc" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18.5" fill="none" stroke="url(#premOr)" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="86 116.2" transform="rotate(-90 20 20)" /></svg>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h2l1.6 9.2a1.6 1.6 0 001.58 1.3h7.6a1.6 1.6 0 001.57-1.26L20 8H6.4" /><circle cx="9.6" cy="19.4" r="1.4" /><circle cx="16.8" cy="19.4" r="1.4" /></svg>
          </span>
          <div>
            <h3>Ne plus improviser tes courses</h3>
            <p>Des idées de repas qui collent à tes macros restantes, et une liste de courses qui se construit toute seule.</p>
          </div>
        </div>
      </div>

      <p class="prem-lb">En détail</p>
      <div class="cmp">
        <span class="cmp-plaque" aria-hidden="true" />
        <div class="cmp-tete"><span></span><span class="h-gratuit">GRATUIT</span><span class="h-prem">PREMIUM</span></div>
        <div class="cmp-corps ouvert">
          <Ligne nom="Journal & macros" gratuit={true} />
          <Ligne nom="Plan alimentaire par ton coach" note="livré sous 24-48 h" />
          <Ligne nom="Programmes d'entraînement" gratuit={true} />
          <Ligne nom="Saisir les aliments par photo" />
          <Ligne nom="Ajout vocal" />
          <Ligne nom="Scan code-barres" />
          <Ligne nom="Détail nutritionnel complet" gratuit="7 jours" />
          <Ligne nom="Idées recettes intelligentes" />
          <Ligne nom="Courses intelligentes" />
          <Ligne nom="Stats illimitées" gratuit="7 jours" />
        </div>
      </div>

      {dejaPremium ? (
        <div class="deja-prem">
          <div class="dp-title">Membre Premium</div>
          <div class="dp-sub">Tout est débloqué — merci de faire grandir BELFIT</div>
        </div>
      ) : (
        <>
          <div class="formules">
            {['annuel', 'trimestriel'].map((k) => {
              const f = FORMULES[k];
              return (
                <div key={k} class={'fo' + (formule === k ? ' sel' : '')} onClick={() => setFormule(k)}>
                  {k === 'annuel' && <span class="fo-badge">LE PLUS CHOISI</span>}
                  <div class="fo-gauche">
                    <div class="fo-dur">{f.duree}</div>
                    <div class="fo-total">{f.total}</div>
                    {f.eco && <div class="fo-eco">{f.eco}</div>}
                  </div>
                  <div class="fo-mois">{f.parMois}&nbsp;€<small>/mois</small></div>
                </div>
              );
            })}
          </div>

          <button class="continuer" onClick={payer}>
            S'ABONNER — {FORMULES[formule].parMois} € / MOIS
            <small>{FORMULES[formule].duree === '1 mois' ? 'Sans engagement' : FORMULES[formule].total.replace(' facturés', '') + ' en un paiement'}</small>
          </button>


          {/* Code a usage unique. Le code n'est jamais compare dans le
              navigateur : « une seule fois » se decide au serveur, dans
              une transaction. Deux appareils qui envoient le meme code
              a la meme seconde produisent un gagnant et un perdant. */}
          <ChampCode />

          <p class="legal">
            <svg class="l-bouclier" viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.5 9.2-8 11-4.5-1.8-8-6-8-11V5l8-3z" /><path d="M9 12l2 2 4-4" /></svg>
            Paiement sécurisé. Facturation auto-renouvelable. Annulez à tout moment.
            <span class="l-liens"><a href="https://www.belfit.be/confidentialite.html" target="_blank" rel="noopener">Confidentialité & Conditions</a></span>
          </p>
        </>
      )}

      {payOuvert && (
        <div class="pay-overlay show" onClick={(e) => { if (e.target.classList.contains('pay-overlay')) setPayOuvert(false); }}>
          <div class="pay-modal">
            <button class="pay-close" onClick={() => setPayOuvert(false)} aria-label="Fermer">✕</button>
            <div class="pay-title">Finaliser ton abonnement</div>
            <div class="pay-sub">Tu vas être redirigé vers le paiement sécurisé.</div>
            <label class={'pay-consent' + (consentErr ? ' err' : '')}>
              <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); if (e.target.checked) setConsentErr(false); }} />
              <span>J'accepte les <a href="https://www.belfit.be/confidentialite.html" target="_blank" rel="noopener">conditions d'utilisation</a> et je confirme avoir lu l'<a href="https://www.belfit.be/confidentialite.html#sante" target="_blank" rel="noopener">avertissement santé</a> (BELFIT n'est pas un service médical).</span>
            </label>
            <button class="pay-btn" disabled={!consent} onClick={allerAuPaiement}>Continuer vers le paiement</button>
          </div>
        </div>
      )}
    </div>
  );
}
/**
 * Saisie d'un code Premium.
 *
 * Le code part tel quel vers utiliserCode, qui verifie le jeton
 * Firebase, ouvre une transaction sur codesPremium/{CODE} et n'ecrit
 * premium qu'en admin. Rien ici ne sait quels codes existent : la
 * collection est fermee au client par les regles Firestore.
 */
function ChampCode() {
  const [ouvert, setOuvert] = useState(false);
  const [code, setCode] = useState('');
  const [etat, setEtat] = useState(null);      // null | 'envoi' | 'ok' | raison
  const envoyer = async () => {
    const u = utilisateur.value;
    if (!u || !code.trim()) return;
    setEtat('envoi');
    try {
      const jeton = await u.getIdToken();
      const r = await fetch('https://europe-west1-repz-baf60.cloudfunctions.net/utiliserCode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jeton },
        body: JSON.stringify({ code }),
      });
      const d = await r.json();
      setEtat(d.ok ? 'ok' : (d.raison || 'erreur'));
    } catch {
      setEtat('erreur');
    }
  };

  const MESSAGES = {
    inconnu: 'Ce code n\'existe pas.',
    deja_utilise: 'Ce code a déjà servi.',
    expire: 'Ce code a expiré.',
    erreur: 'Impossible de vérifier le code. Réessaie.',
  };

  if (!ouvert) {
    return (
      <button class="code-lien" onClick={() => setOuvert(true)}>J'ai un code</button>
    );
  }

  return (
    <div class="code-bloc">
      {etat === 'ok' ? (
        <p class="code-ok">Code accepté. Ton accès Premium est activé.</p>
      ) : (
        <>
          <div class="code-ligne">
            <input
              class="code-champ" type="text" inputMode="text" autoCapitalize="characters"
              placeholder="Ton code" value={code} maxLength={32}
              onInput={(e) => { setCode(e.target.value); if (etat && etat !== 'envoi') setEtat(null); }}
            />
            <button class="code-btn" onClick={envoyer} disabled={etat === 'envoi' || !code.trim()}>
              {etat === 'envoi' ? '…' : 'Valider'}
            </button>
          </div>
          {etat && etat !== 'envoi' && <p class="code-err">{MESSAGES[etat] || MESSAGES.erreur}</p>}
        </>
      )}
    </div>
  );
}


