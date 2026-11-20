// Ecran « Ton plan arrive » (26/09, maquette validee par Raci) : ce que
// voit le client entre l'envoi du questionnaire et la livraison du plan.
// Heure limite = envoi + 48 h (si le questionnaire est arrive dans le
// mois suivant le paiement ; sinon, la file, sans heure promise).
import { tx, locale } from '../i18n/ecrans.js';
import { tq } from '../i18n/questionnaire.js';
import { useState, useEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { Icone } from './IconesCoach.jsx';
import { ongletActif } from './BottomNav.jsx';
import { finDelaiQuestionnaire } from '../store/coach.js';
import { APP_ANDROID, MSG_INACTIF } from '../services/app-android.js';

const H48 = 48 * 3600 * 1000;
const MAIL = 'contact@belfit.be';

function quand(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const j = d.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'short' });
  const h = locale() === 'fr-BE' ? d.getHours() + ' h ' + String(d.getMinutes()).padStart(2, '0')
    : d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
  return j.charAt(0).toUpperCase() + j.slice(1) + ' · ' + h;
}

// Reponse envoyee (texte francais du questionnaire) traduite a l'affichage.
const morceau = (x) => { const k = x.indexOf(' : '); return k > 0 ? tq(x.slice(0, k)) + ' : ' + x.slice(k + 3).split(', ').map(tq).join(', ') : x.split(', ').map(tq).join(', '); };
const texteRep = (r) => String(r.texte ?? '').split(' · ').map(morceau).join(' · ');

function Reponses({ q, fermer }) {
  // Reponses envoyees, groupees par section, en lecture seule.
  const groupes = {};
  Object.values((q && q.reponses) || {}).forEach(r => {
    if (!r || !r.question) return;
    (groupes[r.section || 'Réponses'] = groupes[r.section || 'Réponses'] || []).push(r);
  });
  return createPortal(
    <div class="pg-coach cp-portail"><div class="cp-voile" onClick={e => { if (e.target === e.currentTarget) fermer(); }}>
      <div class="cp-modale pp-reponses" role="dialog" aria-modal="true">
        <p class="cp-nom">{tx('Mes réponses')}</p>
        <div class="pp-rep-liste">
          {Object.keys(groupes).map(s => (
            <div class="pp-rep-groupe">
              <p class="pp-rep-sec">{s === 'Réponses' ? tx(s) : tq(s)}</p>
              {groupes[s].map(r => <p class="pp-rep"><span>{tq(r.question)}</span><b>{texteRep(r)}</b></p>)}
            </div>
          ))}
        </div>
        <button class="cp-bt cp-bt--gris" onClick={fermer}>{tx('Fermer')}</button>
      </div>
    </div></div>,
    document.body
  );
}

// Virement (02/10) : clients invites par lien, paiement hors app.
const IBAN = 'BE52 3632 1142 7809';
const BENEFICIAIRE = 'RSH FIT NUTRITION';

function copier(texte) {
  try { navigator.clipboard.writeText(texte.replace(/ /g, '')); } catch (e) { /* rien */ }
}

function Virement({ v }) {
  const [copie, setCopie] = useState('');
  // App Android (Play) : aucun montant ni coordonnees de paiement.
  if (APP_ANDROID) return <div class="cp-carte pv" data-android-inactif><p class="pv-n">{tx(MSG_INACTIF)}</p></div>;
  const ligne = (label, val, cle) => (
    <div class="pv-l">
      <span>{label}</span>
      <b>{val}</b>
      {cle && <button type="button" class="pv-cp" onClick={() => { copier(val); setCopie(cle); }}>{tx(copie === cle ? 'Copié' : 'Copier')}</button>}
    </div>
  );
  return (
    <div class="cp-carte pv">
      <p class="pv-t">{tx('En attente de ton virement')}</p>
      {ligne(tx('Montant'), v.montant + ' €')}
      {ligne('IBAN', IBAN, 'iban')}
      {BENEFICIAIRE && ligne(tx('Bénéficiaire'), BENEFICIAIRE)}
      {ligne(tx('Communication'), v.communication, 'com')}
      <p class="pv-n">{tx("Ton plan est préparé dès réception du virement. Mets bien la communication, c'est elle qui relie le paiement à ton dossier.")}</p>
    </div>
  );
}

export function PlanEnPreparation({ payeLe, questionnaire, commande }) {
  const vir = commande && commande.virement;
  const virAttente = !!(vir && vir.statut === 'attente');
  const offert = !!(commande && commande.source === 'offert');
  const [, tic] = useState(0);
  const [voir, setVoir] = useState(false);
  useEffect(() => { const t = setInterval(() => tic(x => x + 1), 60000); return () => clearInterval(t); }, []);

  const envoye = questionnaire && questionnaire.envoyeLe;
  const dansLaFile = !!(payeLe && envoye) && new Date(envoye) >= finDelaiQuestionnaire(payeLe);
  const limite = envoye ? new Date(new Date(envoye).getTime() + H48) : null;
  const ecoule = envoye ? Date.now() - new Date(envoye).getTime() : 0;
  const part = Math.min(0.97, Math.max(0.03, ecoule / H48));
  const restant = limite ? Math.round((limite - Date.now()) / 3600000) : null;

  return (
    <>
      <p class="pp-sur">{tx('TON COACH')}</p>
      <h1 class="cp-titre">{tx('Ton plan arrive')}</h1>
      <p class="cp-sous">{tx("Questionnaire bien reçu. Je m'occupe de toi.")}</p>

      {virAttente ? <Virement v={vir} /> : (
      <div class="pp-hero">
        {dansLaFile ? (
          <>
            <p class="pp-hero-l">{tx('Ta demande est dans la file')}</p>
            <p class="pp-hero-d">{tx('Plan en préparation')}</p>
            <p class="pp-hero-s">{tx("Dans l'app et par e-mail")}</p>
          </>
        ) : (
          <>
            <p class="pp-hero-l">{tx('Livraison au plus tard')}</p>
            <p class="pp-hero-d">{quand(limite)}</p>
            <p class="pp-hero-s">{tx("Dans l'app et par e-mail")}</p>
            <div class="pp-barre"><i style={{ width: Math.round(part * 100) + '%' }} /></div>
            <div class="pp-barre-leg">
              <span>{tx('Reçu {d}', { d: locale() === 'en-GB' ? quand(envoye).split(' · ')[0] : quand(envoye).split(' · ')[0].toLowerCase() })}</span>
              <span>{restant > 1 ? tx('≈ {n} h restantes', { n: restant }) : tx('Livraison imminente')}</span>
            </div>
          </>
        )}
      </div>
      )}

      <div class="cp-carte pp-etapes">
        {virAttente
          ? <div class="pp-et c"><span class="pp-pt"><Icone nom="clock" taille={15} /></span><div><b>{tx(APP_ANDROID ? 'Activation en attente' : 'Virement en attente')}</b>{!APP_ANDROID && <span>{tx('{m} € · communication {c}', { m: vir.montant, c: vir.communication })}</span>}</div></div>
          : <div class="pp-et f"><span class="pp-pt"><Icone nom="check" taille={15} /></span><div><b>{tx(offert ? 'Plan offert' : APP_ANDROID ? 'Programme activé' : 'Paiement reçu')}</b><span>{quand((vir && vir.recuLe) || payeLe)}</span></div></div>}
        <div class="pp-et f"><span class="pp-pt"><Icone nom="check" taille={15} /></span><div><b>{tx('Questionnaire envoyé')}</b><span>{quand(envoye)}</span></div></div>
        {/* 01/11 Raci : 4 etapes. « Ton coach écrit ton plan » (doublon de
            l'elaboration) et la carte « Coach BelFit » sont retirees. */}
        {virAttente
          ? <div class="pp-et o"><span class="pp-pt"><Icone nom="list-check" taille={15} /></span><div><b>{tx("Programme en cours d'élaboration")}</b><span>{tx(APP_ANDROID ? "Dès l'activation" : 'Dès réception du virement')}</span></div></div>
          : <div class="pp-et c"><span class="pp-pt"><Icone nom="list-check" taille={15} /></span><div><b>{tx("Programme en cours d'élaboration")}</b><span>{tx('En cours')}</span></div></div>}
        <div class="pp-et o"><span class="pp-pt"><Icone nom="package" taille={15} /></span><div><b>{tx('Plan livré')}</b><span>{tx("Dans l'app et par e-mail")}</span></div></div>
      </div>

      <p class="cp-sec">{tx('EN ATTENDANT')}</p>
      <div class="cp-carte pp-liens">
        <button type="button" class="pp-lien" onClick={() => { ongletActif.value = 'journal'; }}>
          <span class="pp-ic"><Icone nom="tools-kitchen" taille={17} /></span>{tx('Note tes repas dans le journal')}<span class="pp-fl"><Icone nom="chevron-right" taille={16} /></span>
        </button>
        <button type="button" class="pp-lien" onClick={() => { ongletActif.value = 'stats'; }}>
          <span class="pp-ic"><Icone nom="scale" taille={17} /></span>{tx('Pèse-toi demain matin, à jeun')}<span class="pp-fl"><Icone nom="chevron-right" taille={16} /></span>
        </button>
        <button type="button" class="pp-lien" onClick={() => setVoir(true)}>
          <span class="pp-ic"><Icone nom="list-check" taille={17} /></span>{tx('Revoir mes réponses')}<span class="pp-fl"><Icone nom="chevron-right" taille={16} /></span>
        </button>
      </div>
      <a class="pp-mail" href={`mailto:${MAIL}?subject=${encodeURIComponent(tx('Question sur mon plan'))}`}>
        <Icone nom="mail" taille={16} />{tx('Une question\u00A0? Écrire à mon coach')}
      </a>
      {voir && <Reponses q={questionnaire} fermer={() => setVoir(false)} />}
    </>
  );
}
