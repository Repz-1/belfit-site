// Ecran « Ton plan arrive » (26/09, maquette validee par Raci) : ce que
// voit le client entre l'envoi du questionnaire et la livraison du plan.
// Heure limite = envoi + 48 h (si le questionnaire est arrive dans les
// 7 jours du paiement ; sinon, la file, sans heure promise).
import { useState, useEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { Icone } from './IconesCoach.jsx';
import { ongletActif } from './BottomNav.jsx';
import { DELAI_QUESTIONNAIRE } from '../store/coach.js';

const H48 = 48 * 3600 * 1000;
const MAIL = 'contact@belfit.be';

function quand(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const j = d.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'short' });
  return j.charAt(0).toUpperCase() + j.slice(1) + ' · ' + d.getHours() + ' h ' + String(d.getMinutes()).padStart(2, '0');
}

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
        <p class="cp-nom">Mes réponses</p>
        <div class="pp-rep-liste">
          {Object.keys(groupes).map(s => (
            <div class="pp-rep-groupe">
              <p class="pp-rep-sec">{s}</p>
              {groupes[s].map(r => <p class="pp-rep"><span>{r.question}</span><b>{r.texte}</b></p>)}
            </div>
          ))}
        </div>
        <button class="cp-bt cp-bt--gris" onClick={fermer}>Fermer</button>
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
  const ligne = (label, val, cle) => (
    <div class="pv-l">
      <span>{label}</span>
      <b>{val}</b>
      {cle && <button type="button" class="pv-cp" onClick={() => { copier(val); setCopie(cle); }}>{copie === cle ? 'Copié' : 'Copier'}</button>}
    </div>
  );
  return (
    <div class="cp-carte pv">
      <p class="pv-t">En attente de ton virement</p>
      {ligne('Montant', v.montant + ' €')}
      {ligne('IBAN', IBAN, 'iban')}
      {BENEFICIAIRE && ligne('Bénéficiaire', BENEFICIAIRE)}
      {ligne('Communication', v.communication, 'com')}
      <p class="pv-n">Ton plan est préparé dès réception du virement. Mets bien la communication, c'est elle qui relie le paiement à ton dossier.</p>
    </div>
  );
}

export function PlanEnPreparation({ payeLe, questionnaire, commande }) {
  const vir = commande && commande.virement;
  const virAttente = !!(vir && vir.statut === 'attente');
  const [, tic] = useState(0);
  const [voir, setVoir] = useState(false);
  useEffect(() => { const t = setInterval(() => tic(x => x + 1), 60000); return () => clearInterval(t); }, []);

  const envoye = questionnaire && questionnaire.envoyeLe;
  const joursAvantEnvoi = payeLe && envoye ? (new Date(envoye) - new Date(payeLe)) / 86400000 : 0;
  const dansLaFile = joursAvantEnvoi >= DELAI_QUESTIONNAIRE;
  const limite = envoye ? new Date(new Date(envoye).getTime() + H48) : null;
  const ecoule = envoye ? Date.now() - new Date(envoye).getTime() : 0;
  const part = Math.min(0.97, Math.max(0.03, ecoule / H48));
  const restant = limite ? Math.round((limite - Date.now()) / 3600000) : null;
  const ecrit = !dansLaFile && ecoule >= H48 / 2;

  return (
    <>
      <p class="pp-sur">TON COACH</p>
      <h1 class="cp-titre">Ton plan arrive</h1>
      <p class="cp-sous">Questionnaire bien reçu. Je m'occupe de toi.</p>

      {virAttente ? <Virement v={vir} /> : (
      <div class="pp-hero">
        {dansLaFile ? (
          <>
            <p class="pp-hero-l">Ta demande est dans la file</p>
            <p class="pp-hero-d">Plan en préparation</p>
            <p class="pp-hero-s">Dans l'app et par e-mail</p>
          </>
        ) : (
          <>
            <p class="pp-hero-l">Livraison au plus tard</p>
            <p class="pp-hero-d">{quand(limite)}</p>
            <p class="pp-hero-s">Dans l'app et par e-mail</p>
            <div class="pp-barre"><i style={{ width: Math.round(part * 100) + '%' }} /></div>
            <div class="pp-barre-leg">
              <span>Reçu {quand(envoye).split(' · ')[0].toLowerCase()}</span>
              <span>{restant > 1 ? `≈ ${restant} h restantes` : 'Livraison imminente'}</span>
            </div>
          </>
        )}
      </div>
      )}

      <div class="cp-carte pp-etapes">
        {virAttente
          ? <div class="pp-et c"><span class="pp-pt"><Icone nom="clock" taille={15} /></span><div><b>Virement en attente</b><span>{vir.montant} € · communication {vir.communication}</span></div></div>
          : <div class="pp-et f"><span class="pp-pt"><Icone nom="check" taille={15} /></span><div><b>Paiement reçu</b><span>{quand((vir && vir.recuLe) || payeLe)}</span></div></div>}
        <div class="pp-et f"><span class="pp-pt"><Icone nom="check" taille={15} /></span><div><b>Questionnaire envoyé</b><span>{quand(envoye)}</span></div></div>
        {/* Etape ajoutee le 27/09 (Raci). Pas de signal du coach : la
            premiere moitie du delai = elaboration, la seconde = ecriture. */}
        {virAttente
          ? <div class="pp-et o"><span class="pp-pt"><Icone nom="list-check" taille={15} /></span><div><b>Programme en cours d'élaboration</b><span>Dès réception du virement</span></div></div>
          : <div class={'pp-et ' + (ecrit ? 'f' : 'c')}><span class="pp-pt"><Icone nom={ecrit ? 'check' : 'list-check'} taille={15} /></span><div><b>Programme en cours d'élaboration</b><span>{ecrit ? 'Tes besoins sont calculés' : 'En cours'}</span></div></div>}
        <div class={'pp-et ' + (ecrit && !virAttente ? 'c' : 'o')}><span class="pp-pt"><Icone nom="pencil" taille={15} /></span><div><b>Ton coach écrit ton plan</b><span>{ecrit && !virAttente ? 'En cours' : 'À venir'}</span></div></div>
        <div class="pp-et o"><span class="pp-pt"><Icone nom="package" taille={15} /></span><div><b>Plan livré</b><span>Dans l'app et par e-mail</span></div></div>
      </div>

      <div class="cp-carte pp-coach">
        <span class="pp-av"><Icone nom="user" taille={20} /></span>
        <p><b>Coach BelFit</b><br />J'étudie tes réponses une par une. Si j'ai une question, je t'écris.</p>
      </div>

      <p class="cp-sec">EN ATTENDANT</p>
      <div class="cp-carte pp-liens">
        <button type="button" class="pp-lien" onClick={() => { ongletActif.value = 'journal'; }}>
          <span class="pp-ic"><Icone nom="tools-kitchen" taille={17} /></span>Note tes repas dans le journal<span class="pp-fl"><Icone nom="chevron-right" taille={16} /></span>
        </button>
        <button type="button" class="pp-lien" onClick={() => { ongletActif.value = 'stats'; }}>
          <span class="pp-ic"><Icone nom="scale" taille={17} /></span>Pèse-toi demain matin, à jeun<span class="pp-fl"><Icone nom="chevron-right" taille={16} /></span>
        </button>
        <button type="button" class="pp-lien" onClick={() => setVoir(true)}>
          <span class="pp-ic"><Icone nom="list-check" taille={17} /></span>Revoir mes réponses<span class="pp-fl"><Icone nom="chevron-right" taille={16} /></span>
        </button>
      </div>
      <a class="pp-mail" href={`mailto:${MAIL}?subject=${encodeURIComponent('Question sur mon plan')}`}>
        <Icone nom="mail" taille={16} />Une question&nbsp;? Écrire à mon coach
      </a>
      {voir && <Reponses q={questionnaire} fermer={() => setVoir(false)} />}
    </>
  );
}
