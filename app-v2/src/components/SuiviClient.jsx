// Espace suivi client (20/10, Raci) : en un coup d'oeil, le coach, le
// mois de coaching, le plan du jour, les progres et la prochaine etape.
// Uniquement des donnees existantes. Pas de chrono, pas de « dernieres
// seances », rien de medical : on n'affiche que ce que le client a saisi.
import { programme, dossierCoach, ajustements, progOuvert } from './BelfitPlus.jsx';
import { repas, totauxJour, cleDuNom, ajouterIngredient } from '../store/journal.js';
import { weightLog } from '../store/stats.js';
import { majJusqua, moisCoaching, dateBilan, poidsDepuisPlan, prochainRepas } from '../store/coach.js';
import { ongletActif } from './BottomNav.jsx';
import { macrosOf } from '../data/aliments.js';
import { Icone } from './IconesCoach.jsx';

const dateCourte = (d) => d ? new Date(d).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long' }) : '';
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
      <defs><linearGradient id="sv-aire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB800" stop-opacity=".35" /><stop offset="1" stop-color="#FFB800" stop-opacity="0" /></linearGradient></defs>
      <polygon class="sv-aire" points={`${xy[0][0]},${H} ${xy.map(p => p.join(',')).join(' ')} ${xy[xy.length - 1][0]},${H}`} />
      <polyline points={xy.map(p => p.join(',')).join(' ')} />
    </svg>
  );
}

export function SuiviClient({ onContinuer, onNouveau }) {
  const pr = programme.value;
  const dos = dossierCoach.value;
  const mois = moisCoaching(dos, pr);
  const aj = ajustements.value;
  const lim = majJusqua(dos, pr);
  const majOk = !!lim && Date.now() < lim.getTime();
  const bilan = dateBilan(mois);

  const journal = repas.value;
  const noteDans = (cle) => journal.some(r => r.cle === cle && (r.ings || []).length > 0);
  const repasPlan = (pr && pr.repas) || [];
  const cles = repasPlan.map(r => cleDuNom(r.nom));
  const prochain = prochainRepas(cles.filter(c => !noteDans(c)));
  const tot = totauxJour.value || {};

  const ajouter = (r) => {
    const cle = cleDuNom(r.nom);
    const cible = journal.find(x => x.cle === cle) || journal.find(x => x.nom === r.nom);
    if (!cible) return;
    (r.ings || []).forEach(i => ajouterIngredient(cible.id, i.name, i.portion));
  };

  const poids = poidsDepuisPlan(weightLog.value, pr && pr.livreLe);

  return (
    <div class="sv">
      {pr && (
        <div class="cp-carte sv-entete">
          <p class="cp-txt">{pr.livreLe ? `Plan revu le ${dateCourte(pr.livreLe)}` : 'Ton plan arrive bientôt'}</p>
          {pr.note && <p class="sv-note">« {pr.note} »</p>}
        </div>
      )}

      {mois && (
        <>
          <p class="cp-sec">MON MOIS</p>
          <div class="cp-carte cp-carte--or sv-mois">
            {!mois.fini && <p class="sv-jours"><b>{mois.restants}</b> {`jour${mois.restants > 1 ? 's' : ''} restant${mois.restants > 1 ? 's' : ''}`}</p>}
            <div class="cp-ligne"><span class="cp-nom">Mois en cours</span>
              {mois.fini && <span class="sv-pill">Terminé</span>}</div>
            <div class="sv-barre"><i style={{ width: Math.min(100, Math.round(100 * (mois.total - mois.restants) / mois.total)) + '%' }} /></div>
            <p class="cp-txt">Du {dateCourte(mois.debut)} au {dateCourte(mois.fin)}
              {aj && aj.quota ? ` · ${aj.quota - aj.restants} ajustement${aj.quota - aj.restants > 1 ? 's' : ''} utilisé${aj.quota - aj.restants > 1 ? 's' : ''} sur ${aj.quota}` : ''}</p>
          </div>
        </>
      )}

      {pr && (
        <>
          <p class="cp-sec">MON PLAN AUJOURD'HUI</p>
          <div class="cp-carte sv-plan">
            <div class="cp-ligne"><span class="cp-nom sv-kcal"><Icone nom="flame" taille={20} />{Number(pr.kcal).toLocaleString('fr-BE')} kcal</span>
              <span class="cp-txt">{Math.round(tot.kcal || 0).toLocaleString('fr-BE')} notées</span></div>
            <div class="sv-macros">
              <div><b>{pr.prot} g</b>protéines</div><div><b>{pr.carbs} g</b>glucides</div><div><b>{pr.lip} g</b>lipides</div>
            </div>
            {repasPlan.map((r, k) => {
              const cle = cles[k];
              const fait = noteDans(cle);
              const estProchain = cle === prochain;
              return (
                <div class={'sv-repas' + (estProchain ? ' sv-repas--prochain' : '')} key={k}>
                  <div class="sv-repas-tx">
                    <b>{r.nom}{estProchain && <em> · prochain</em>}</b>
                    <span>{(r.ings || []).map(i => i.name).slice(0, 3).join(', ')}</span>
                  </div>
                  {fait ? <span class="sv-ok" aria-label="Noté">✓</span> : <span class="sv-k">{kcalRepas(r)} kcal</span>}
                  {estProchain && <button class="cp-bt cp-bt--or sv-ajout" onClick={() => ajouter(r)}>Ajouter au journal</button>}
                </div>
              );
            })}
            <button class="cp-bt cp-bt--gris" onClick={() => { progOuvert.value = true; }}>Voir tout mon plan</button>
          </div>
        </>
      )}

      <p class="cp-sec">MES PROGRÈS</p>
      <button type="button" class="cp-carte sv-progres" onClick={() => { ongletActif.value = 'stats'; }}>
        {poids ? (
          <>
            <div class="cp-ligne"><span class="sv-big"><Icone nom="scale" taille={20} />{poids.ecart > 0 ? '+' : poids.ecart < 0 ? '−' : ''}{kg(Math.abs(poids.ecart))} kg</span>
              <span class="cp-txt">depuis le début du plan</span></div>
            <Courbe points={poids.points} />
            <p class="cp-txt">{kg(poids.debut.kg)} kg → {kg(poids.actuel.kg)} kg · dernière pesée le {dateCourte(poids.actuel.iso)}</p>
          </>
        ) : <p class="cp-txt">Pèse-toi dans l'onglet Aujourd'hui pour suivre tes progrès ici.</p>}
      </button>

      <p class="cp-sec">PROCHAINE ÉTAPE</p>
      <div class="cp-carte sv-etape">
        {majOk ? (
          <>
            <p class="cp-nom">Ton bilan du mois</p>
            <p class="cp-txt">{bilan && Date.now() < bilan.getTime() ? `À remplir à partir du ${dateCourte(bilan)}.` : 'Tu peux faire ton bilan du mois.'}</p>
            {/* 21/10 Raci : 60 € discret, seulement dans les 7 derniers jours du mois ou apres sa fin. */}
            {mois && (mois.fini || mois.restants <= 7) && (
              <button type="button" class="sv-lien" onClick={onContinuer}>Envie de continuer ? Le mois suivant est à 60 €, jusqu'au {dateCourte(lim)}.</button>
            )}
          </>
        ) : pr ? (
          <>
            <p class="cp-nom">Un nouveau mois de coaching</p>
            <p class="cp-txt">On repart d'un bilan complet, ajustements inclus pendant le mois.</p>
            <button class="cp-bt cp-bt--or" onClick={onNouveau}>Reprendre · 80 €</button>
          </>
        ) : (
          <p class="cp-txt">Ton plan est en préparation, livré dans l'app sous 48 h.</p>
        )}
      </div>
    </div>
  );
}
