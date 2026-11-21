// Onglet Coach (26/09, maquette validee par Raci).
// L'app est entierement gratuite ; ce qui se vend, c'est le plan ecrit
// par le coach : 80 EUR chaque mois (01/11 Raci : plus de mois a 60 EUR). Paiement
// unique, sans abonnement ni prelevement.
import { useState, useEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { utilisateur, authPrete } from '../services/firebase.js';
import { paiementOuvert, modeTest, retourPaiement, payerMollie, reduction, verifierCodeReduction, verifierAcces, demarrerRetour, verifierRetour, reverifierRetour, fermerRetour, signalerQuestionnaire } from '../services/mollie.js';
import { getApps } from 'firebase/app';
import { BelfitPlus, chargerProgramme, programme, programmeCharge, progOuvert, dossierCoach } from './BelfitPlus.jsx';
import { QuestionnaireCoach, effacerBrouillon } from './QuestionnaireCoach.jsx';
import { Entete } from './Entete.jsx';
import { PlanEnPreparation } from './PlanEnPreparation.jsx';
import '../styles/coach-page.css';
import { etatCoach, demandeQuestionnaire, marquerPaye } from '../store/coach.js';
import { SuiviClient } from './SuiviClient.jsx';
import { CarteProgramme, allerVers } from './Entrainer.jsx';
import { programmeActif } from '../store/programme.js';
import { ongletActif } from './BottomNav.jsx';
import { Icone } from './IconesCoach.jsx';
import { APP_ANDROID } from '../services/app-android.js';
import { t } from '../i18n/index.js';
import { CoachEntrainement, BasculeCoach } from './CoachEntrainement.jsx';

// 21/11 Raci : deux espaces dans l'onglet Coach, bascule tout en haut
// (Alimentation / Entrainement) plutot qu'un cinquieme onglet. Choix memorise.
const CLE_ESPACE = 'belfit_coach_espace';
function espaceMemorise() { try { return localStorage.getItem(CLE_ESPACE) === 'ent' ? 'ent' : 'alim'; } catch (e) { return 'alim'; } }

// Onglets du coaching (20/10, Raci) : visibles seulement pour un client
// qui a un plan ou une commande. Le choix est memorise sur l'appareil.
const CLE_VUE = 'belfit_coach_vue';
const VUES = [['programme', 'cp_vue_programme'], ['seances', 'cp_vue_seances'], ['suivi', 'cp_vue_suivi']];
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
      <p class="cp-nom">{t('cp_seances_vide_t')}</p>
      <p class="cp-txt">{t('cp_seances_vide_txt')}</p>
      <button class="cp-bt cp-bt--or" onClick={() => aller('questionnaire')}>{t('cp_seances_vide_bt')}</button>
    </div>
  );
}

// Liens LemonSqueezy des deux produits a paiement unique.
// A REMPLIR par Raci une fois les produits crees. Vides : le bouton
// ouvre un e-mail au coach, rien n'est casse.
export const LIENS_COACH = { plan: '' };
const MAIL = 'contact@belfit.be';
// Interrupteur (26/09, demande de Raci) : questionnaire en relecture,
// masque en ligne tant qu'il n'est pas valide. true = commandes ouvertes.
export const COMMANDES_OUVERTES = true;
// 68.00 -> « 68 », 53.60 -> « 53,60 » (affichage du prix donne par le serveur)
const prixCourt = (m) => { const n = Number(m); return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ','); };
// 24/10 : le serveur (mollieEtat) peut ouvrir le paiement a UN compte autorise
// (test Mollie sur le telephone de Raci) sans l'ouvrir aux autres clients.
// Lire .value dans un composant le fait se mettre a jour tout seul.
export const commandesOuvertes = () => COMMANDES_OUVERTES || paiementOuvert.value;

function joursDepuis(iso) {
  if (!iso) return null;
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return isNaN(j) ? null : Math.max(0, j);
}

// Regle du delai : voir store/coach.js (un mois pour remplir le
// questionnaire ; au-dela, la file, detaillee dans les CGV / FAQ).

// Retour de la page de paiement (Mollie renvoie ici que le paiement ait
// reussi, ete annule ou ait echoue) : on ne marque RIEN comme paye ici.
// Le serveur est interroge (services/mollie.js) ; le questionnaire ne
// s'ouvre que s'il confirme le paiement.
const RETOUR = 'https://belfit.be/v2/?onglet=premium&coach=questionnaire&type=';
function lireRetour() {
  try {
    const u = new URLSearchParams(location.search);
    if (u.get('coach') !== 'questionnaire') return null;
    const type = 'plan';   // 01/11 : un seul produit (80 €)
    history.replaceState(null, '', location.pathname);
    return type;
  } catch (e) { return null; }
}
// Lu une seule fois, au chargement du module : la page peut etre montee
// plusieurs fois (rail des onglets), l'URL est deja nettoyee la 2e fois.
// Il n'est oublie qu'a la fermeture ou a l'envoi du questionnaire.
const retourLu = lireRetour();
if (retourLu) demarrerRetour(retourLu);

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
  try { localStorage.setItem('belfit_qc_dernier', JSON.stringify({ ...q, uid: (utilisateur.value || {}).uid || null })); } catch (e) { /* rien */ }
  dossierCoach.value = { ...dossierCoach.value, questionnaire: q, brouillon: null };
  const u = utilisateur.value;
  if (!u || !getApps().length) return Promise.resolve();
  // Le brouillon distant est efface avec l'envoi : plus rien a reprendre.
  return import('firebase/firestore').then(({ getFirestore, doc, setDoc, deleteField }) =>
    setDoc(doc(getFirestore(getApps()[0]), 'users', u.uid), { questionnaireCoach: q, brouillonCoach: deleteField() }, { merge: true }))
    .then(() => { signalerQuestionnaire(); })   // 01/11 : e-mail au coach (serveur, une seule fois)
    .catch(e => console.warn('questionnaire non envoye', e));
}

// Retour de la page de paiement (24/10) : message clair, sans faux acces.
function RetourPaiement({ retour }) {
  const e = retour.etat; const st = retour.statut;
  let titre; let txt;
  if (e === 'verif') { titre = t('cp_ret_verif_t'); txt = t('cp_ret_verif'); }
  else if (e === 'connexion') { titre = t('cp_ret_cnx_t'); txt = t('cp_ret_cnx'); }
  else if (e === 'attente') {
    titre = t(retour.fini ? 'cp_ret_att_fin_t' : 'cp_ret_att_t');
    txt = t(retour.fini ? 'cp_ret_att_fin' : 'cp_ret_att');
  } else if (st === 'canceled') { titre = t('cp_ret_annule_t'); txt = t('cp_ret_annule'); }
  else if (st === 'expired') { titre = t('cp_ret_expire_t'); txt = t('cp_ret_expire'); }
  else if (st === 'failed') { titre = t('cp_ret_refuse_t'); txt = t('cp_ret_refuse', { mail: MAIL }); }
  else { titre = t('cp_ret_introuvable_t'); txt = t('cp_ret_introuvable', { mail: MAIL }); }
  return (
    <div class="cp-carte" role="status" data-retour={e}>
      <p class="cp-nom">{titre}</p>
      <p class="cp-txt">{txt}</p>
      {e === 'attente' && retour.fini && <button class="cp-bt cp-bt--or" onClick={() => reverifierRetour((type) => { marquerPaye(type); chargerProgramme(); })}>{t('cp_reverifier')}</button>}
      {(e === 'echec' || (e === 'attente' && retour.fini)) && <button class="cp-bt cp-bt--gris" onClick={fermerRetour}>{t('cp_fermer')}</button>}
    </div>
  );
}

export function CoachPage() {
  const [saisieCode, setSaisieCode] = useState('');     // code de reduction tape
  const [msgCode, setMsgCode] = useState('');            // erreur affichee sous le champ
  const [verifCode, setVerifCode] = useState(false);     // verification en cours
  const [achat, setAchat] = useState(null);      // modale de paiement : 'plan' | 'maj' | null
  const [adulte, setAdulte] = useState(null);    // question eliminatoire : 'oui' | 'non'
  const [tca, setTca] = useState(null);          // suivi pour un trouble alimentaire : 'oui' | 'non'
  const [consent, setConsent] = useState(false);
  const [consent2, setConsent2] = useState(false);
  const [remplir, setRemplir] = useState(() => { const r = retourPaiement.peek(); return r && r.etat === 'paye' ? r.type : null; });  // questionnaire ouvert
  const [vueChoisie, setVueChoisie] = useState(vueMemorisee);
  const [espace, setEspace] = useState(espaceMemorise);
  const choisirEspace = (e) => { setEspace(e); try { localStorage.setItem(CLE_ESPACE, e); } catch (x) { /* rien */ } };
  const choisirVue = (v) => { setVueChoisie(v); try { localStorage.setItem(CLE_VUE, v); } catch (e) { /* rien */ } };
  // 24/10 : le serveur dit si CE compte peut payer ; au retour de la page
  // de paiement, il dit ce qu'est devenu le paiement.
  const uidCourant = utilisateur.value ? utilisateur.value.uid : null;
  useEffect(() => { verifierAcces(); }, [uidCourant]);
  useEffect(() => {
    if ((uidCourant || authPrete.value) && retourPaiement.peek()) verifierRetour((type) => { marquerPaye(type); chargerProgramme(); });
  }, [uidCourant, authPrete.value]);
  const retour = retourPaiement.value;
  useEffect(() => { if (retour && retour.etat === 'paye') setRemplir(retour.type); }, [retour && retour.etat]);
  // Clients invites par lien (02/10) : memes verifications qu'a l'achat
  // (18 ans, trouble alimentaire, retractation), avant le questionnaire.
  const cmdInv = dossierCoach.value.commande;
  const invite = !!(cmdInv && cmdInv.source === 'invitation');
  const offert = !!(cmdInv && cmdInv.source === 'offert');
  const [accordInv, setAccordInv] = useState(() => { try { return JSON.parse(localStorage.getItem('belfit_accord_inv') || 'null'); } catch (e) { return null; } });
  const ouvrirQuestionnaire = (type) => {
    const porte = offert ? 'offert:' : invite ? 'invitation:' : '';
    if (porte && !(accordInv && accordInv.code === cmdInv.commande)) { setAdulte(null); setTca(null); setConsent(false); setConsent2(false); setAchat(porte + type); return; }
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
        onFermer={() => { fermerRetour(); setRemplir(null); }}
        onTermine={(reponses, alerte, extra) => {
          // Accords donnes par un client invite : joints au questionnaire.
          const ex = (invite || offert) && accordInv ? { ...extra, consentements: { ...((extra && extra.consentements) || {}), invitation: accordInv } } : extra;
          envoyerQuestionnaire(remplir, reponses, alerte, ex);
          effacerBrouillon(remplir);
          fermerRetour();
          setRemplir(null);
        }} />
    );
  }

  const pr = programme.value;
  const j = pr ? joursDepuis(pr.livreLe) : null;
  const { aRemplir, enPrep, tardif, type: typePaye, payeLe: payeLeEtat } = etatCoach(dossierCoach.value, pr);
  const occupe = aRemplir || enPrep;

  // App Android (Play) : aucun achat dans l'app.
  const ouvrirAchat = (quoi) => { if (APP_ANDROID) return; setAdulte(null); setTca(null); setConsent(false); setConsent2(false); setAchat(quoi); };
  const aAchat = !!pr || !!payeLeEtat;
  const vue = aAchat ? (vueChoisie || (pr ? 'suivi' : 'programme')) : 'programme';
  const viaInv = !!achat && achat.startsWith('invitation:');
  const viaOffert = !!achat && achat.startsWith('offert:');
  const sansPaiement = viaInv || viaOffert;
  const typeAchat = sansPaiement ? achat.slice(achat.indexOf(':') + 1) : achat;
  const bloque = typeAchat === 'plan' && (adulte === 'non' || tca === 'oui');
  const eligible = (adulte === 'oui' && tca === 'non');
  const accepterInv = () => {
    const a = { code: cmdInv.commande, le: new Date().toISOString(), adulte: typeAchat === 'plan' ? true : null,
      tcaSuivi: typeAchat === 'plan' ? false : null, demarrageImmediat: true, cgv: true };
    try { localStorage.setItem('belfit_accord_inv', JSON.stringify(a)); } catch (e) { /* rien */ }
    setAccordInv(a); setAchat(null); setRemplir(typeAchat);
  };
  // Code de reduction (28/10) : sur les 80 € (premier mois ou mois suivant). Le prix affiche
  // vient du serveur, qui recalcule tout au paiement.
  const red = reduction.value;
  const appliquerCode = () => {
    if (verifCode) return;
    setVerifCode(true); setMsgCode('');
    verifierCodeReduction(saisieCode).then(r => { if (!r.ok) setMsgCode(r.message); }).finally(() => setVerifCode(false));
  };
  const [codeOuvert, setCodeOuvert] = useState(false);
  const retirerCode = () => { reduction.value = null; setMsgCode(''); setSaisieCode(''); };
  // Champ « Code de réduction » : meme bloc sous le prix de l'offre (premier mois) et dans la fenetre « Reprendre · 80 € ».
  const blocCode = (idChamp) => (
            <div class="cp-code">
              {red ? (
                <p class="cp-code-ok" role="status">{t('cp_code_ok', { code: red.code, pct: red.pourcent, prix: prixCourt(red.montant) })} <button class="cp-code-lien" onClick={retirerCode}>{t('cp_code_retirer')}</button></p>
              ) : (
                <form class="cp-code-form" onSubmit={(e) => { e.preventDefault(); appliquerCode(); }}>
                  <label class="cp-code-lib" for={idChamp}>{t('cp_code_lib')}</label>
                  <div class="cp-code-ligne">
                    <input id={idChamp} class="cp-code-champ" type="text" inputMode="text" autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false}
                      maxLength={40} placeholder={t('cp_code_ph')} value={saisieCode} aria-invalid={msgCode ? 'true' : undefined} aria-describedby={msgCode ? idChamp + '-err' : undefined}
                      onInput={(e) => { setSaisieCode(e.target.value); if (msgCode) setMsgCode(''); }} />
                    <button type="submit" class="cp-code-bt" disabled={verifCode || !saisieCode.trim()}>{verifCode ? '…' : t('cp_code_appliquer')}</button>
                  </div>
                  {msgCode && <p id={idChamp + '-err'} class="cp-code-err" role="alert">{msgCode}</p>}
                </form>
              )}
            </div>
          
  );
  const payer = () => {
    const lien = LIENS_COACH[achat];
    if (paiementOuvert.value) {
      payerMollie(achat, achat === 'plan' && red ? red.code : undefined).catch((e) => {
        if (e && e.messageCode) { reduction.value = null; setMsgCode(e.messageCode); setAchat(null); return; }   // le code n'est plus valable : on revient au champ
        alert(t('cp_erreur_paiement', { mail: MAIL }));
      });
    } else if (!lien) {
      const sujet = t(pr ? 'cp_sujet_continuer' : 'cp_sujet_premier');
      window.location.href = `mailto:${MAIL}?subject=${encodeURIComponent(sujet)}`;
    } else {
      window.location.href = urlPaiement(lien, achat);
    }
  };
  const Choix = ({ val, set }) => (
    <div class="cp-oui-non">
      {['oui', 'non'].map(v => (
        <button type="button" class={'qc-chip' + (val === v ? ' on' : '')} aria-pressed={val === v} onClick={() => set(v)}>{t(v === 'oui' ? 'cp_oui' : 'cp_non')}</button>
      ))}
    </div>
  );

  // Un retour de paiement ou une fenetre d'achat ouverte restent cote Alimentation.
  if (espace === 'ent' && !retour && !achat) {
    return (
      <div class="pg-coach">
        <Entete />
        <BasculeCoach espace={espace} choisir={choisirEspace} />
        <CoachEntrainement />
      </div>
    );
  }

  // Questionnaire envoye, plan pas encore livre : ecran dedie (26/09).
  if (enPrep && !pr) {
    return (
      <div class="pg-coach">
        <Entete />
        <BasculeCoach espace={espace} choisir={choisirEspace} />
        <PlanEnPreparation payeLe={payeLeEtat} questionnaire={dossierCoach.value.questionnaire} commande={dossierCoach.value.commande} />
      </div>
    );
  }

  return (
    <div class="pg-coach">
      <Entete />
      <BasculeCoach espace={espace} choisir={choisirEspace} />
      <h1 class="cp-titre">{t('cp_titre')}</h1>
      {retour && retour.etat !== 'paye' && <RetourPaiement retour={retour} />}
      {aAchat ? (
        <div class="prog-onglets" role="tablist">
          {VUES.map(([k, l]) => <button type="button" role="tab" aria-selected={vue === k} class={vue === k ? 'actif' : ''} onClick={() => choisirVue(k)}>{t(l)}</button>)}
        </div>
      ) : (APP_ANDROID ? null : <p class="cp-sous">{t('cp_sous')}</p>)}
      {vue === 'suivi' && <SuiviClient onContinuer={() => ouvrirAchat('plan')} onNouveau={() => ouvrirAchat('plan')} />}
      {vue === 'seances' && <TesSeances />}
      {vue === 'programme' && APP_ANDROID && !pr && !occupe && (
        <div class="cp-carte cp-android-inactif" data-android-inactif>
          <p class="cp-txt">{t('cp_inactif')}</p>
        </div>
      )}
      {vue === 'programme' && !(APP_ANDROID && !pr && !occupe) && (<>

      {/* 25/10 : plus d'avatar-icone ni de photo de salle (aucun vrai portrait dans le depot).
          Les 3 « preuves » deviennent une carte : le delai (48 h) en gros, deux garanties en lignes. */}
      {!pr && !occupe && (
        <div class="cp-carte cp-preuve">
          <p class="cp-preuve-t"><b>48&nbsp;h</b><span>{t('cp_preuve_h')}</span></p>
          <ul class="cp-preuve-l">
            <li><span class="cp-coche" aria-hidden="true">✓</span>{t('cp_preuve_1')}</li>
            <li><span class="cp-coche" aria-hidden="true">✓</span>{t('cp_preuve_2')}</li>
          </ul>
        </div>
      )}

      {aRemplir && (
        <div class="cp-carte cp-etapes-paye" data-apres-paiement data-plan={offert ? 'offert' : invite ? 'virement' : 'paiement'}>
          <p class="cp-nom">{t(offert ? 'cp_plan_offert' : invite ? 'cp_invitation' : (APP_ANDROID ? 'cp_programme_active' : 'cp_paiement_recu'))}</p>
          <ol class="cp-etapes">
            <li class="fait"><span class="cp-pastille">✓</span>{t(offert ? 'cp_offert_par' : 'cp_paiement_recu')}</li>
            <li class="actif"><span class="cp-pastille">2</span>{t('cp_etape_questionnaire')}</li>
            <li><span class="cp-pastille">3</span>{t('cp_etape_plan')}</li>
          </ol>
          {tardif && <p class="cp-txt">{t('cp_tardif')}</p>}
          <button class="cp-bt cp-bt--vert" onClick={() => ouvrirQuestionnaire(typePaye)}>{t('cp_completer')}</button>
        </div>
      )}
      {enPrep && (
        <div class="cp-carte cp-attente">
          <p class="cp-nom">{t('cp_prep_t')}</p>
          <p class="cp-txt">{t('cp_prep')}</p>
          <ol class="cp-etapes">
            <li class="fait"><span class="cp-pastille">✓</span>{t('cp_paiement_recu')}</li>
            <li class="fait"><span class="cp-pastille">✓</span>{t('cp_questionnaire_ok')}</li>
            <li class="actif"><span class="cp-pastille">3</span>{t('cp_etape_plan')}</li>
          </ol>
        </div>
      )}

      {pr && (
        <>
          <p class="cp-sec">{t('cp_sec_plan')}</p>
          <div class="cp-carte">
            <div class="cp-ligne"><span class="cp-nom">{t('cp_mon_plan')}</span><span class="cp-txt">{pr.kcal} kcal</span></div>
            <p class="cp-txt">{j === null ? t('cp_recu_recent') : j === 0 ? t('cp_recu_auj') : j === 1 ? t('cp_recu_1') : t('cp_recu_n', { n: j })}</p>
            <button class="cp-bt cp-bt--or" onClick={() => { progOuvert.value = true; }}>{t('cp_voir_plan')}</button>
          </div>
        </>
      )}

      {!pr && !occupe && (
        <>
          <p class="cp-sec">{t('cp_sec_comment')}</p>
          <div class="cp-carte cp-etapes">
            <div class="cp-etape"><span class="cp-n"><Icone nom="bolt" taille={16} /></span><span class="cp-txt">{t('cp_comment_1')}</span></div>
            <div class="cp-etape"><span class="cp-n"><Icone nom="list-check" taille={16} /></span><span class="cp-txt">{t('cp_comment_2')}</span></div>
            <div class="cp-etape"><span class="cp-n"><Icone nom="flame" taille={16} /></span><span class="cp-txt">{t('cp_comment_3')}</span></div>
          </div>
        </>
      )}

      {/* 21/10 Raci : plus de tarifs dans Ton programme pour un client qui a deja un plan. Le mois suivant (80 €) se propose dans Mon suivi. */}
      {!occupe && !pr && <p class="cp-sec">{t('cp_sec_tarifs')}</p>}
      {!occupe && !pr && (
        <div class="cp-carte cp-recu cp-offre" data-tarifs="recu">
          <p class="cp-recu-titre">{t('cp_offre_t')}</p>
          <p class="cp-recu-sous">{t('cp_offre_sous')}</p>
          <div class="cp-recu-l"><span>{t('cp_offre_l1')}</span><span>{t('cp_inclus')}</span></div>
          <div class="cp-recu-l"><span>{t('cp_offre_l2')}</span><span>{t('cp_inclus')}</span></div>
          <div class="cp-recu-l"><span>{t('cp_offre_l3')}</span><span>{t('cp_44j')}</span></div>
          <div class="cp-recu-l"><span>{t('cp_offre_l4')}</span><span>{t('cp_offert')}</span></div>
          <div class="cp-recu-tot"><span>{t('cp_total')}</span>
            {red && paiementOuvert.value
              ? <span class="cp-prix-bloc"><s class="cp-prix-barre" aria-label={t('cp_prix_normal')}>80 €</s><span class="cp-prix cp-prix--promo">{prixCourt(red.montant)} €</span></span>
              : <span class="cp-prix">80 €</span>}
          </div>
          <p class="cp-recu-m">{t('cp_offre_m')}</p>
          {commandesOuvertes()
            ? <button class="cp-bt cp-bt--vert" onClick={() => ouvrirAchat('plan')}>{t('cp_demander')}</button>
            : <button class="cp-bt cp-bt--gris" disabled>{t('cp_bientot')}</button>}
          {commandesOuvertes() && paiementOuvert.value && (red || codeOuvert
            ? blocCode('cp-code-champ')
            : <p class="cp-recu-code"><button class="cp-code-lien" onClick={() => setCodeOuvert(true)}>{t('cp_code_lien')}</button></p>)}
        </div>
      )}
      </>)}

      {achat && (!APP_ANDROID || sansPaiement) && createPortal(
        <div class="pg-coach cp-portail"><div class="cp-voile" onClick={(e) => { if (e.target === e.currentTarget) setAchat(null); }}>
          <div class="cp-modale" role="dialog" aria-modal="true">
            {paiementOuvert.value && modeTest.value && !sansPaiement && <p class="qc-alerte">{t('cp_mode_test')}</p>}
            {viaOffert ? <p class="cp-nom">{t('cp_premier_offert')}</p> : APP_ANDROID ? <p class="cp-nom">{t('cp_invitation')}</p> : <p class="cp-nom">{t(pr ? 'cp_nouveau_mois' : 'cp_premier_mois') + ' · ' + (red && !viaInv ? t('cp_au_lieu', { prix: prixCourt(red.montant) }) : '80 €')}</p>}
            {viaOffert
              ? <p class="cp-txt">{t('cp_offert_txt')}</p>
              : !APP_ANDROID && <p class="cp-txt">{t(viaInv ? 'cp_virement_txt' : 'cp_securise_txt')}</p>}
            {/* 02/10 : avantage IA annonce explicitement avant le paiement. Pas pour un plan offert. */}
            {!APP_ANDROID && !viaOffert && <p class="cp-txt cp-inclus">{t(viaInv ? 'cp_inclus_ia_virement' : 'cp_inclus_ia_paiement')}</p>}
            {!APP_ANDROID && typeAchat === 'plan' && !sansPaiement && pr && paiementOuvert.value && <div class="cp-code-modale">{blocCode('cp-code-champ-modale')}</div>}
            {typeAchat === 'plan' && (
              <div class="cp-elim">
                <p class="cp-q">{t('cp_q_adulte')}</p>
                <Choix val={adulte} set={setAdulte} />
                <p class="cp-q">{t('cp_q_tca')}</p>
                <Choix val={tca} set={setTca} />
              </div>
            )}
            {typeAchat === 'plan' && adulte === 'non' && (
              <p class="qc-alerte">{t('cp_mineur')}</p>
            )}
            {typeAchat === 'plan' && adulte !== 'non' && tca === 'oui' && (
              <p class="qc-alerte">{t('cp_tca')}</p>
            )}
            {!bloque && eligible && (
              <>
                {/* Droit belge (CDE art. VI.53, 1°) : la retractation se perd a
                    la livraison seulement si le client demande expressement un
                    demarrage immediat et reconnait cette perte AVANT de payer.
                    Deux cases distinctes, decochees. Texte a faire valider. */}
                <label class="cp-consent">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>{t(viaInv && !APP_ANDROID ? 'cp_consent_virement' : 'cp_consent_questionnaire')}</span>
                </label>
                <label class="cp-consent">
                  <input type="checkbox" checked={consent2} onChange={(e) => setConsent2(e.target.checked)} />
                  <span>{t('cp_cgv_avant')}<a href="https://www.belfit.be/cgv.html" target="_blank" rel="noopener">{t('cp_cgv_lien')}</a>{t('cp_cgv_apres')}</span>
                </label>
                {APP_ANDROID ? null : viaOffert
                  ? <p class="cp-txt cp-petit">{t('cp_petit_offert')}</p>
                  : viaInv
                  ? <p class="cp-txt cp-petit">{t('cp_petit_virement')}</p>
                  : <p class="cp-txt cp-petit">{t('cp_petit_paiement')}</p>}
                <button class="cp-bt cp-bt--or" disabled={!consent || !consent2} onClick={sansPaiement ? accepterInv : payer}>{t(sansPaiement ? 'cp_vers_questionnaire' : 'cp_vers_paiement')}</button>
                {!sansPaiement && paiementOuvert.value && <p class="cp-petit cp-secure">{t('cp_securise_mollie')}</p>}
              </>
            )}
            <button class="cp-bt cp-bt--gris" onClick={() => setAchat(null)}>{t(bloque ? 'cp_fermer' : 'cp_annuler')}</button>
          </div>
        </div></div>,
        document.body
      )}
    </div>
  );
}
