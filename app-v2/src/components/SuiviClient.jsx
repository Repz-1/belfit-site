// Espace suivi client (20/10, Raci) : en un coup d'oeil, le coach, le
// mois de coaching, le plan du jour, les progres et la prochaine etape.
// Uniquement des donnees existantes. Pas de chrono, pas de « dernieres
// seances », rien de medical : on n'affiche que ce que le client a saisi.
import { tx, locale } from '../i18n/ecrans.js';
import { programme, dossierCoach, progOuvert } from './BelfitPlus.jsx';
import { commandesOuvertes } from './CoachPage.jsx';
import { repas, totauxJour, cleDuNom, ajouterIngredient } from '../store/journal.js';
import { weightLog } from '../store/stats.js';
import { limite60, moisCoaching, poidsDepuisPlan, prochainRepas } from '../store/coach.js';
import { ongletActif } from './BottomNav.jsx';
import { macrosOf } from '../data/aliments.js';
import { Icone } from './IconesCoach.jsx';
import { APP_ANDROID } from '../services/app-android.js';

const dateCourte = (d) => d ? new Date(d).toLocaleDateString(locale(), { day: 'numeric', month: 'long' }) : '';
const kg = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
const kcalRepas = (r) => Math.round((r.ings || []).reduce((t, i) => t + (macrosOf(i).kcal || 0), 0));

function Courbe({ points }) {
  if (!points || points.length < 2) return null;
  const v = points.map(p => +p.kg);
  const min = Math.min(...v), max = Math.max(...v), h = max - min || 1;
  const W = 300, H = 70;
  const xy = v.map((y, i) => [Math.round(6 + i * (W - 12) / (v.length - 1)), Math.round(6 + (1 - (y - min) / h) * (H - 12))]);
  return (
    <svg class="sv-courbe" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="sv-aire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3E9B68" stop-opacity=".35" /><stop offset="1" stop-color="#3E9B68" stop-opacity="0" /></linearGradient></defs>
      <polygon class="sv-aire" points={`${xy[0][0]},${H} ${xy.map(p => p.join(',')).join(' ')} ${xy[xy.length - 1][0]},${H}`} />
      <polyline points={xy.map(p => p.join(',')).join(' ')} />
    </svg>
  );
}

export function SuiviClient({ onContinuer, onNouveau }) {
  const pr = programme.value;
  const dos = dossierCoach.value;
  const mois = moisCoaching(dos, pr);
  // 21/10 : les dates du mois ne partent que d'un paiement reel.
  const lim = limite60(dos);
  const majOk = !!pr && !!mois && !!lim && Date.now() < lim.getTime();

  const journal = repas.value;
  const noteDans = (cle) => journal.some(r => r.cle === cle && (r.ings || []).length > 0);
  const repasPlan = (pr && pr.repas) || [];
  const cles = repasPlan.map(r => cleDuNom(r.nom));
  const prochain = prochainRepas(cles.filter(c => !noteDans(c)));
  const tot = totauxJour.value || {};

  // Repas du journal qui recevra les aliments ; null = bouton cache.
  const cibleDe = (cle) => cle ? journal.find(x => x.cle === cle) || null : null;
  const ajouter = (r) => {
    const cible = cibleDe(cleDuNom(r.nom));
    if (!cible) return;
    (r.ings || []).forEach(i => ajouterIngredient(cible.id, i.name, i.portion));
  };

  const poids = poidsDepuisPlan(weightLog.value, pr && pr.livreLe);

  return (
    <div class="sv">
      {pr && (
        <div class="cp-carte sv-entete">
          <p class="cp-txt">{pr.livreLe ? tx('Plan livré le {d}', { d: dateCourte(pr.livreLe) }) : tx('Ton plan arrive bientôt')}</p>
          {pr.note && <p class="sv-note">« {pr.note} »</p>}
        </div>
      )}

      {/* Sans paiement reel : ni dates ni barre, une ligne neutre. */}
      {!mois && pr && <p class="cp-txt sv-neutre">{tx('Ajustements inclus ce mois-ci.')}</p>}
      {mois && (
        <>
          <p class="cp-sec">{tx('MON MOIS')}</p>
          <div class="cp-carte cp-carte--or sv-mois">
            {!mois.fini && <p class="sv-jours"><b>{mois.restants}</b> {tx(mois.restants > 1 ? 'jours restants' : 'jour restant')}</p>}
            <div class="cp-ligne"><span class="cp-nom">{tx('Mois en cours')}</span>
              {mois.fini && <span class="sv-pill">{tx('Terminé')}</span>}</div>
            <div class="sv-barre"><i style={{ width: Math.min(100, Math.round(100 * (mois.total - mois.restants) / mois.total)) + '%' }} /></div>
            <p class="cp-txt">{tx('Du {a} au {b} · Ajustements inclus ce mois-ci', { a: dateCourte(mois.debut), b: dateCourte(mois.fin) })}</p>
          </div>
        </>
      )}

      {pr && (
        <>
          <p class="cp-sec">{tx("MON PLAN AUJOURD'HUI")}</p>
          <div class="cp-carte sv-plan">
            <div class="cp-ligne"><span class="cp-nom sv-kcal"><Icone nom="flame" taille={20} />{Number(pr.kcal).toLocaleString(locale())} kcal</span>
              <span class="cp-txt">{tx('{n} notées', { n: Math.round(tot.kcal || 0).toLocaleString(locale()) })}</span></div>
            <div class="sv-macros">
              <div><b>{pr.prot} g</b>{tx('protéines')}</div><div><b>{pr.carbs} g</b>{tx('glucides')}</div><div><b>{pr.lip} g</b>{tx('lipides')}</div>
            </div>
            {repasPlan.map((r, k) => {
              const cle = cles[k];
              const fait = noteDans(cle);
              const estProchain = !!cle && cle === prochain;
              return (
                <div class={'sv-repas' + (estProchain ? ' sv-repas--prochain' : '')} key={k}>
                  <div class="sv-repas-tx">
                    <b>{tx(r.nom)}{estProchain && <em>{tx(' · prochain')}</em>}</b>
                    <span>{(r.ings || []).map(i => i.name).slice(0, 3).join(', ')}</span>
                  </div>
                  {fait ? <span class="sv-ok" aria-label={tx('Noté')}>✓</span> : <span class="sv-k">{kcalRepas(r)} kcal</span>}
                  {estProchain && cibleDe(cle) && <button class="cp-bt cp-bt--or sv-ajout" onClick={() => ajouter(r)}>{tx('Ajouter au journal')}</button>}
                </div>
              );
            })}
            <button class="cp-bt cp-bt--gris" onClick={() => { progOuvert.value = true; }}>{tx('Voir tout mon plan')}</button>
          </div>
        </>
      )}

      <p class="cp-sec">{tx('MES PROGRÈS')}</p>
      <button type="button" class="cp-carte sv-progres" onClick={() => { ongletActif.value = 'stats'; }}>
        {poids ? (
          <>
            <div class="cp-ligne"><span class="sv-big"><Icone nom="scale" taille={20} />{poids.ecart > 0 ? '+' : poids.ecart < 0 ? '−' : ''}{kg(Math.abs(poids.ecart))} kg</span>
              <span class="cp-txt">{tx('depuis le début du plan')}</span></div>
            <Courbe points={poids.points} />
            <p class="cp-txt">{kg(poids.debut.kg)} kg → {kg(poids.actuel.kg)} kg · {tx('dernière pesée le {d}', { d: dateCourte(poids.actuel.iso) })}</p>
          </>
        ) : <p class="cp-txt">{tx("Pèse-toi dans l'onglet Aujourd'hui pour suivre tes progrès ici.")}</p>}
      </button>

      {/* Plan livre sans paiement enregistre : on ne sait rien du mois, pas de carte. */}
      {!(pr && !mois) && <p class="cp-sec">{tx('PROCHAINE ÉTAPE')}</p>}
      {!(pr && !mois) && <div class="cp-carte sv-etape">
        {majOk ? (
          <>
            <p class="cp-nom">{tx('Ton mois de coaching')}</p>
            <p class="cp-txt">{tx(mois.fini ? 'Ton mois de coaching est terminé.' : 'Ton plan et tes ajustements continuent jusqu\'à la fin du mois.')}</p>
            {/* 22/10 Raci : vraie date de fin, d'apres payeLe + 44 jours. */}
            <p class="cp-txt sv-acces">{tx("Accès nutrition jusqu'au {d}.", { d: dateCourte(lim) })}</p>
            {/* 01/11 Raci : 80 € tout le temps ; le mois suivant se rachete a 80 €, nouveau questionnaire. */}
            {!APP_ANDROID && (commandesOuvertes()
              ? <button type="button" class="cp-bt cp-bt--or sv-continuer" onClick={onContinuer}>{tx('Reprendre mon programme')}</button>
              : <p class="sv-lien sv-lien--off" aria-disabled="true">{tx('Envie de continuer\u00A0? Le mois suivant (80 €) sera bientôt disponible.')}</p>
            )}
          </>
        ) : pr ? (
          <>
            {!APP_ANDROID && <p class="cp-nom">{tx('Un nouveau mois de coaching')}</p>}
            {!APP_ANDROID && <p class="cp-txt">{tx("On repart d'un bilan complet, ajustements inclus pendant le mois.")}</p>}
            {APP_ANDROID && !(lim && Date.now() >= lim.getTime()) && <p class="cp-txt">{tx("Ton plan reste consultable dans l'app.")}</p>}
            {/* 22/10 Raci : acces ferme (payeLe reel + 44 j), date discrete. */}
            {lim && Date.now() >= lim.getTime() && <p class="cp-txt sv-acces">{tx('Accès nutrition terminé le {d}.', { d: dateCourte(lim) })}</p>}
            {APP_ANDROID ? null : commandesOuvertes()
              ? <button class="cp-bt cp-bt--or" onClick={onNouveau}>{tx('Reprendre mon programme')}</button>
              : <button class="cp-bt cp-bt--gris" disabled>{tx('Bientôt disponible')}</button>}
          </>
        ) : (
          <p class="cp-txt">{tx("Ton plan est en préparation, livré dans l'app sous 48 h.")}</p>
        )}
      </div>}
    </div>
  );
}
