// Onglet Coach (26/09, maquette validee par Raci).
// L'app est entierement gratuite ; ce qui se vend, c'est le plan ecrit
// par le coach : 80 EUR le premier, 60 EUR la mise a jour. Paiement
// unique, sans abonnement ni prelevement.
import { useState, useEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { utilisateur } from '../services/firebase.js';
import { getApps } from 'firebase/app';
import { BelfitPlus, chargerProgramme, programme, programmeCharge, progOuvert, dossierCoach } from './BelfitPlus.jsx';
import { QuestionnaireCoach, effacerBrouillon } from './QuestionnaireCoach.jsx';
import { Entete } from './Entete.jsx';
import { PlanEnPreparation } from './PlanEnPreparation.jsx';
import '../styles/coach-page.css';
import { etatCoach, demandeQuestionnaire, DELAI_QUESTIONNAIRE, marquerPaye } from '../store/coach.js';
import { SuiviClient } from './SuiviClient.jsx';
import { CarteProgramme, allerVers } from './Entrainer.jsx';
import { programmeActif } from '../store/programme.js';
import { ongletActif } from './BottomNav.jsx';
import { Icone } from './IconesCoach.jsx';

// Onglets du coaching (20/10, Raci) : visibles seulement pour un client
// qui a un plan ou une commande. Le choix est memorise sur l'appareil.
const CLE_VUE = 'belfit_coach_vue';
const VUES = [['programme', 'Ton programme'], ['seances', 'Tes séances'], ['suivi', 'Mon suivi']];
function vueMemorisee() {
  try { const v = localStorage.getItem(CLE_VUE); return VUES.some(x => x[0] === v) ? v : null; } catch (e) { return null; }
}

/** « Tes seances » : le programme d'entrainement du client, avec les
 *  composants de S'entrainer. Pas d'historique, pas de chrono. */
function TesSeances() {
  const today = new Date();
  const iso = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const aller = (nom, params) => { ongletActif.value = 'entrainer'; allerVers(nom, params); };
  if (programmeActif.value) return <div class="pg-entrainer sv-seances"><CarteProgramme today={today} todayIso={iso} allerVers={aller} /></div>;
  return (
    <div class="cp-carte sv-seances-vide">
      <p class="cp-nom">Pas encore de programme d'entraînement</p>
      <p class="cp-txt">Réponds à 4 questions et l'app te propose un programme adapté à ton objectif et à ton matériel. Le coaching entraînement est inclus.</p>
      <button class="cp-bt cp-bt--or" onClick={() => aller('questionnaire')}>Créer mon programme</button>
    </div>
  );
}

// Liens LemonSqueezy des deux produits a paiement unique.
// A REMPLIR par Raci une fois les produits crees. Vides : le bouton
// ouvre un e-mail au coach, rien n'est casse.
export const LIENS_COACH = { plan: '', maj: '' };
const MAIL = 'contact@belfit.be';
// Interrupteur (26/09, demande de Raci) : questionnaire en relecture,
// masque en ligne tant qu'il n'est pas valide. true = commandes ouvertes.
export const COMMANDES_OUVERTES = false;

function joursDepuis(iso) {
  if (!iso) return null;
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return isNaN(j) ? null : Math.max(0, j);
}

// Regle du delai : voir store/coach.js (7 jours pour remplir le
// questionnaire ; au-dela, la file, detaillee dans les CGV / FAQ).

// Retour de LemonSqueezy : le paiement renvoie directement vers le
// questionnaire (redirect_url). On retient le retour sur l'appareil,
// le webhook pouvant arriver apres le client.
const RETOUR = 'https://belfit.be/v2/?onglet=premium&coach=questionnaire&type=';
function lireRetour() {
  try {
    const u = new URLSearchParams(location.search);
    if (u.get('coach') !== 'questionnaire') return null;
    const type = u.get('type') === 'maj' ? 'maj' : 'plan';
    marquerPaye(type);
    history.replaceState(null, '', location.pathname);
    return type;
  } catch (e) { return null; }
}
// Lu une seule fois, au chargement du module : la page peut etre montee
// plusieurs fois (rail des onglets), l'URL est deja nettoyee la 2e fois.
// Il n'est oublie qu'a la fermeture ou a l'envoi du questionnaire.
let retourEnAttente = lireRetour();

function urlPaiement(lien, type) {
  const u = utilisateur.value;
  let url = lien + '?checkout[billing_address][country]=BE'
    + '&checkout[product_options][redirect_url]=' + encodeURIComponent(RETOUR + type);
  if (u) {
    url += '&checkout[custom][uid]=' + encodeURIComponent(u.uid);
    if (u.email) url += '&checkout[email]=' + encodeURIComponent(u.email);
  }
  return url;
}

// Les reponses partent dans la fiche du client (users/{uid}), la ou
// le coach depose deja les plans. Une copie reste sur l'appareil.
function envoyerQuestionnaire(type, reponses, alerte, extra = {}) {
  const q = { type, reponses, alerteSante: !!alerte, allergieGrave: !!extra.allergieGrave,
    consentements: extra.consentements || {}, envoyeLe: new Date().toISOString() };
  try { localStorage.setItem('belfit_qc_dernier', JSON.stringify(q)); } catch (e) { /* rien */ }
  dossierCoach.value = { ...dossierCoach.value, questionnaire: q, brouillon: null };
  const u = utilisateur.value;
  if (!u || !getApps().length) return Promise.resolve();
  // Le brouillon distant est efface avec l'envoi : plus rien a reprendre.
  return import('firebase/firestore').then(({ getFirestore, doc, setDoc, deleteField }) =>
    setDoc(doc(getFirestore(getApps()[0]), 'users', u.uid), { questionnaireCoach: q, brouillonCoach: deleteField() }, { merge: true }))
    .catch(e => console.warn('questionnaire non envoye', e));
}

export function CoachPage() {
  const [achat, setAchat] = useState(null);      // modale de paiement : 'plan' | 'maj' | null
  const [adulte, setAdulte] = useState(null);    // question eliminatoire : 'oui' | 'non'
  const [tca, setTca] = useState(null);          // suivi pour un trouble alimentaire : 'oui' | 'non'
  const [consent, setConsent] = useState(false);
  const [consent2, setConsent2] = useState(false);
  const [remplir, setRemplir] = useState(() => retourEnAttente);  // questionnaire ouvert
  const [vueChoisie, setVueChoisie] = useState(vueMemorisee);
  const choisirVue = (v) => { setVueChoisie(v); try { localStorage.setItem(CLE_VUE, v); } catch (e) { /* rien */ } };
  // Clients invites par lien (02/10) : memes verifications qu'a l'achat
  // (18 ans, trouble alimentaire, retractation), avant le questionnaire.
  const cmdInv = dossierCoach.value.commande;
  const invite = !!(cmdInv && cmdInv.source === 'invitation');
  const [accordInv, setAccordInv] = useState(() => { try { return JSON.parse(localStorage.getItem('belfit_accord_inv') || 'null'); } catch (e) { return null; } });
  const ouvrirQuestionnaire = (type) => {
    if (invite && !(accordInv && accordInv.code === cmdInv.commande)) { setAdulte(null); setTca(null); setConsent(false); setConsent2(false); setAchat('invitation:' + type); return; }
    setRemplir(type);
  };
  useEffect(() => { if (!programmeCharge.value) chargerProgramme(); }, []);
  // Appui sur le bandeau depuis une autre page : ouvrir le questionnaire.
  useEffect(() => {
    if (demandeQuestionnaire.value) { ouvrirQuestionnaire(demandeQuestionnaire.value); demandeQuestionnaire.value = null; }
  }, [demandeQuestionnaire.value]);

  if (progOuvert.value) return <BelfitPlus />;
  if (remplir) {
    return (
      <QuestionnaireCoach type={remplir}
        onFermer={() => { retourEnAttente = null; setRemplir(null); }}
        onTermine={(reponses, alerte, extra) => {
          // Accords donnes par un client invite : joints au questionnaire.
          const ex = invite && accordInv ? { ...extra, consentements: { ...((extra && extra.consentements) || {}), invitation: accordInv } } : extra;
          envoyerQuestionnaire(remplir, reponses, alerte, ex);
          effacerBrouillon(remplir);
          retourEnAttente = null;
          setRemplir(null);
        }} />
    );
  }

  const pr = programme.value;
  const j = pr ? joursDepuis(pr.livreLe) : null;
  const { aRemplir, enPrep, tardif, type: typePaye, payeLe: payeLeEtat } = etatCoach(dossierCoach.value, pr);
  const occupe = aRemplir || enPrep;

  const ouvrirAchat = t => { setAdulte(null); setTca(null); setConsent(false); setConsent2(false); setAchat(t); };
  const aAchat = !!pr || !!payeLeEtat;
  const vue = aAchat ? (vueChoisie || (pr ? 'suivi' : 'programme')) : 'programme';
  const viaInv = !!achat && achat.startsWith('invitation:');
  const typeAchat = viaInv ? achat.slice(11) : achat;
  const bloque = typeAchat === 'plan' && (adulte === 'non' || tca === 'oui');
  const eligible = typeAchat === 'maj' || (adulte === 'oui' && tca === 'non');
  const accepterInv = () => {
    const a = { code: cmdInv.commande, le: new Date().toISOString(), adulte: typeAchat === 'plan' ? true : null,
      tcaSuivi: typeAchat === 'plan' ? false : null, demarrageImmediat: true, cgv: true };
    try { localStorage.setItem('belfit_accord_inv', JSON.stringify(a)); } catch (e) { /* rien */ }
    setAccordInv(a); setAchat(null); setRemplir(typeAchat);
  };
  const payer = () => {
    const lien = LIENS_COACH[achat];
    if (!lien) {
      const sujet = achat === 'maj' ? 'Continuer mon coaching (mois suivant)' : 'Mon premier mois de coaching';
      window.location.href = `mailto:${MAIL}?subject=${encodeURIComponent(sujet)}`;
    } else {
      window.location.href = urlPaiement(lien, achat);
    }
  };
  const Choix = ({ val, set }) => (
    <div class="cp-oui-non">
      {['oui', 'non'].map(v => (
        <button type="button" class={'qc-chip' + (val === v ? ' on' : '')} aria-pressed={val === v} onClick={() => set(v)}>{v === 'oui' ? 'Oui' : 'Non'}</button>
      ))}
    </div>
  );

  // Questionnaire envoye, plan pas encore livre : ecran dedie (26/09).
  if (enPrep && !pr) {
    return (
      <div class="pg-coach">
        <Entete />
        <PlanEnPreparation payeLe={payeLeEtat} questionnaire={dossierCoach.value.questionnaire} commande={dossierCoach.value.commande} />
      </div>
    );
  }

  return (
    <div class="pg-coach">
      <Entete />
      <h1 class="cp-titre">Ton coach</h1>
      {aAchat ? (
        <div class="prog-onglets" role="tablist">
          {VUES.map(([k, l]) => <button type="button" role="tab" aria-selected={vue === k} class={vue === k ? 'actif' : ''} onClick={() => choisirVue(k)}>{l}</button>)}
        </div>
      ) : <p class="cp-sous">L'app est gratuite. Le plan sur mesure, c'est moi.</p>}
      {vue === 'suivi' && <SuiviClient onContinuer={() => ouvrirAchat('maj')} onNouveau={() => ouvrirAchat('plan')} />}
      {vue === 'seances' && <TesSeances />}
      {vue === 'programme' && (<>

      {!pr && (
      <div class="cp-carte cp-profil cp-hero cp-hero--achat">
        <div class="cp-hero-id">
          <span class="cp-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
          </span>
          <div>
            <p class="cp-nom">BelFit</p>
            <p class="cp-txt">Nutrition et préparation physique</p>
          </div>
        </div>
        {!pr && !occupe && (
          <div class="cp-chiffres">
            <div><b>48 h</b><span>plan livré</span></div>
            <div><b>1 mois</b><span>ajustements inclus</span></div>
            <div><b>0</b><span>abonnement</span></div>
          </div>
        )}
      </div>
      )}

      {aRemplir && (
        <div class="cp-carte cp-carte--or">
          <p class="cp-nom">{invite ? 'Invitation de ton coach' : 'Paiement reçu'}</p>
          <p class="cp-txt">Remplis ton questionnaire pour que je prépare ton plan. {tardif
            ? 'Ton délai de 7 jours est passé : ta demande rejoint la file.'
            : `Livraison sous 48 h si tu le remplis dans les ${DELAI_QUESTIONNAIRE} jours suivant ton paiement.`}</p>
          <button class="cp-bt cp-bt--or" onClick={() => ouvrirQuestionnaire(typePaye)}>Remplir mon questionnaire</button>
        </div>
      )}
      {enPrep && (
        <div class="cp-carte cp-attente">
          <p class="cp-nom">Plan en préparation</p>
          <p class="cp-txt">Questionnaire reçu. Ton coach prépare ton plan, livré dans l'app sous 48 h.</p>
        </div>
      )}

      {pr && (
        <>
          <p class="cp-sec">MON PLAN</p>
          <div class="cp-carte">
            <div class="cp-ligne"><span class="cp-nom">Mon plan</span><span class="cp-txt">{pr.kcal} kcal</span></div>
            <p class="cp-txt">{j === null ? 'Reçu récemment' : j === 0 ? "Reçu aujourd'hui" : `Reçu il y a ${j} jour${j > 1 ? 's' : ''}`}</p>
            <button class="cp-bt cp-bt--or" onClick={() => { progOuvert.value = true; }}>Voir mon plan</button>
          </div>
        </>
      )}

      {!pr && !occupe && (
        <>
          <p class="cp-sec">COMMENT ÇA MARCHE</p>
          <div class="cp-carte cp-etapes">
            <div class="cp-etape"><span class="cp-n"><Icone nom="bolt" taille={16} /></span><span class="cp-txt">Tu paies ton 1er mois de coaching alimentaire en ligne (80 €).</span></div>
            <div class="cp-etape"><span class="cp-n"><Icone nom="list-check" taille={16} /></span><span class="cp-txt">Tu réponds au questionnaire.</span></div>
            <div class="cp-etape"><span class="cp-n"><Icone nom="flame" taille={16} /></span><span class="cp-txt">Je t'écris ton plan, livré dans l'app sous 48 h.</span></div>
          </div>
        </>
      )}

      {/* 21/10 Raci : plus de tarifs dans Ton programme pour un client qui a deja un plan. Le 60 € n'apparait que dans Mon suivi. */}
      {!occupe && !pr && <p class="cp-sec">TARIFS</p>}
      {!occupe && !pr && (
        <div class="cp-carte cp-carte--or cp-offre">
          <div class="cp-ligne"><span class="cp-nom">Premier mois</span><span class="cp-prix">80 €</span></div>
          <p class="cp-txt">{'Un mois de coaching : bilan complet, plan alimentaire écrit pour toi, livré sous 48 h, ajustements inclus pendant le mois.'}</p>
          {COMMANDES_OUVERTES
            ? <button class="cp-bt cp-bt--or" onClick={() => ouvrirAchat('plan')}>Demander mon plan</button>
            : <button class="cp-bt cp-bt--gris" disabled>Bientôt disponible</button>}
        </div>
      )}
      {!occupe && !pr && <p class="cp-pied">Paiement au mois. Sans abonnement, sans prélèvement : tu décides de continuer. Accès nutrition inclus pendant ton mois payé et les 2 semaines qui suivent.</p>}
      </>)}

      {achat && createPortal(
        <div class="pg-coach cp-portail"><div class="cp-voile" onClick={(e) => { if (e.target === e.currentTarget) setAchat(null); }}>
          <div class="cp-modale" role="dialog" aria-modal="true">
            <p class="cp-nom">{typeAchat === 'maj' ? 'Mois suivant · 60 €' : (pr ? 'Nouveau mois · 80 €' : 'Premier mois · 80 €')}</p>
            <p class="cp-txt">{viaInv ? 'Paiement par virement, après ton questionnaire. Ton plan est préparé dès réception.' : 'Paiement sécurisé, sans abonnement. Tu remplis ensuite ton questionnaire.'}</p>
            {/* 02/10 : avantage IA annonce explicitement avant le paiement. */}
            <p class="cp-txt cp-inclus">Inclus : analyses IA (photo et micro) illimitées pendant ton mois de coaching et les 2 semaines qui suivent (44 jours à partir {viaInv ? 'de la réception du virement' : 'du paiement'}).</p>
            {typeAchat === 'plan' && (
              <div class="cp-elim">
                <p class="cp-q">As-tu 18 ans ou plus ?</p>
                <Choix val={adulte} set={setAdulte} />
                <p class="cp-q">Es-tu suivi actuellement pour un trouble alimentaire ?</p>
                <Choix val={tca} set={setTca} />
              </div>
            )}
            {typeAchat === 'plan' && adulte === 'non' && (
              <p class="qc-alerte">Le plan coach est réservé aux 18 ans et plus. L'app, elle, reste gratuite pour toi.</p>
            )}
            {typeAchat === 'plan' && adulte !== 'non' && tca === 'oui' && (
              <p class="qc-alerte">Merci de ta confiance. Pendant un suivi en cours, un plan chiffré peut faire plus de mal que de bien : parle de ton alimentation avec le professionnel qui te suit. L'app reste gratuite pour toi.</p>
            )}
            {!bloque && eligible && (
              <>
                {/* Droit belge (CDE art. VI.53, 1°) : la retractation se perd a
                    la livraison seulement si le client demande expressement un
                    demarrage immediat et reconnait cette perte AVANT de payer.
                    Deux cases distinctes, decochees. Texte a faire valider. */}
                <label class="cp-consent">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>Je demande que mon coach commence mon plan dès réception de mon {viaInv ? 'virement' : 'questionnaire'}, pour une livraison sous 48 h. Je reconnais perdre mon droit de rétractation de 14 jours une fois le plan livré.</span>
                </label>
                <label class="cp-consent">
                  <input type="checkbox" checked={consent2} onChange={(e) => setConsent2(e.target.checked)} />
                  <span>J'accepte les <a href="https://www.belfit.be/cgv.html" target="_blank" rel="noopener">conditions et la FAQ</a>. Je comprends que ce plan n'est pas un avis médical.</span>
                </label>
                {viaInv
                  ? <p class="cp-txt cp-petit">Livraison sous 48 h après la réception du virement. Détails dans les conditions générales.</p>
                  : <p class="cp-txt cp-petit">Questionnaire à remplir dans les {DELAI_QUESTIONNAIRE} jours suivant le paiement pour une livraison sous 48 h. Détails dans les conditions générales.</p>}
                <button class="cp-bt cp-bt--or" disabled={!consent || !consent2} onClick={viaInv ? accepterInv : payer}>{viaInv ? 'Continuer vers le questionnaire' : 'Continuer vers le paiement'}</button>
              </>
            )}
            <button class="cp-bt cp-bt--gris" onClick={() => setAchat(null)}>{bloque ? 'Fermer' : 'Annuler'}</button>
          </div>
        </div></div>,
        document.body
      )}
    </div>
  );
}
