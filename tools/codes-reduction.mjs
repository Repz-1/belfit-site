#!/usr/bin/env node
// ------------------------------------------------------------
// CODES DE REDUCTION BelFit : creer, desactiver, reactiver, lister.
//
//   COACH_CODE=... node tools/codes-reduction.mjs creer MARC10 --pourcent 10 --confirmer
//   node tools/codes-reduction.mjs creer --pourcent 15 --note "Pour Julie" --confirmer   (code aleatoire)
//   node tools/codes-reduction.mjs creer EVENT20 --pourcent 20 --expire 2026-12-31 --confirmer
//   node tools/codes-reduction.mjs desactiver MARC10 --confirmer
//   node tools/codes-reduction.mjs reactiver MARC10 --confirmer
//   node tools/codes-reduction.mjs lister
//
// SECURITE
//  - Le secret est celui de l'espace coach (COACH_CODE). Il se donne par la
//    VARIABLE D'ENVIRONNEMENT, jamais en argument (sinon il resterait dans
//    l'historique du terminal). Il n'est jamais affiche ni ecrit.
//  - Sans --confirmer, rien n'est envoye : l'outil dit seulement ce qu'il ferait.
//  - Le pourcentage est un entier de 1 a 90 (voir functions/reduction.js).
//  - Le serveur refuse un code qui existe deja (il ne l'ecrase jamais).
//  - BELFIT_FONCTIONS_URL : autre adresse (test local), https ou localhost seulement.
// Un code ne vaut que sur les 80 EUR d'un mois (pas sur les 60 EUR), et ne sert qu'UNE fois au total.
// ------------------------------------------------------------
const PRODUCTION = 'https://europe-west1-repz-baf60.cloudfunctions.net/';
const AIDE = `Usage : node tools/codes-reduction.mjs <creer|desactiver|reactiver|lister> [CODE] [--pourcent N] [--note "..."] [--expire AAAA-MM-JJ] [--confirmer]
Le secret se donne par la variable d'environnement COACH_CODE (jamais en argument).`;

const normaliser = (x) => String(x == null ? '' : x).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toUpperCase().replace(/[^A-Z0-9]/g, '');

export function lireArguments(argv) {
  const pos = []; const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--confirmer') opt.confirmer = true;
    else if (['--pourcent', '--note', '--expire'].includes(a)) opt[a.slice(2)] = argv[++i];
    else if (a.startsWith('--')) throw new Error('Option inconnue : ' + a);
    else pos.push(a);
  }
  return { action: pos[0], nomCode: pos[1], ...opt };
}

export async function lancer(argv, env, sortie = console, http = fetch) {
  let a;
  try { a = lireArguments(argv); } catch (e) { sortie.error(e.message + '\n' + AIDE); return 2; }
  if (!['creer', 'desactiver', 'reactiver', 'lister'].includes(a.action)) { sortie.error(AIDE); return 2; }
  const nom = a.nomCode ? normaliser(a.nomCode) : '';
  if (a.action === 'creer') {
    const p = Number(a.pourcent);
    if (!Number.isInteger(p) || p < 1 || p > 90) { sortie.error('--pourcent : un entier de 1 à 90 (le prix reste payable en ligne).'); return 2; }
    if (a.nomCode && (nom.length < 4 || nom.length > 32)) { sortie.error('Le code doit faire 4 à 32 lettres ou chiffres.'); return 2; }
    if (a.expire && !(Date.parse(a.expire) > Date.now())) { sortie.error('--expire : une date future (AAAA-MM-JJ).'); return 2; }
  } else if (a.action !== 'lister' && nom.length < 4) { sortie.error('Indique le code à ' + a.action + '.'); return 2; }

  const montant = a.action === 'creer' ? ' → le plan à 80 € passerait à ' + (80 - 80 * Number(a.pourcent) / 100).toFixed(2) + ' €' : '';
  if (a.action !== 'lister' && !a.confirmer) {
    sortie.log('SIMULATION (rien n\'est envoyé). Pour ' + a.action + (nom ? ' ' + nom : ' un code aléatoire') +
      (a.pourcent ? ' à -' + a.pourcent + ' %' : '') + montant + ' : ajoute --confirmer.');
    return 0;
  }
  const secret = env.COACH_CODE;
  if (!secret) { sortie.error('Variable d\'environnement COACH_CODE absente (le secret ne se donne pas en argument).'); return 2; }
  const base = env.BELFIT_FONCTIONS_URL || PRODUCTION;
  if (!/^https:\/\//.test(base) && !/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(base)) { sortie.error('Adresse de fonctions refusée (https ou localhost seulement).'); return 2; }

  let r;
  try {
    r = await http(base.replace(/\/?$/, '/') + 'adminCodesReduction', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: secret, action: a.action, nomCode: nom || undefined, pourcent: a.pourcent ? Number(a.pourcent) : undefined, note: a.note, expire: a.expire }),
    });
  } catch { sortie.error('Serveur injoignable.'); return 1; }
  const d = await r.json().catch(() => ({}));
  if (r.status === 403) { sortie.error('Secret refusé par le serveur.'); return 1; }
  if (r.status === 429) { sortie.error('Trop d\'essais : attends quelques minutes.'); return 1; }
  if (r.status === 409) { sortie.error('Ce code existe déjà (rien n\'a été modifié).'); return 1; }
  if (r.status === 404) { sortie.error('Code inconnu.'); return 1; }
  if (!r.ok || !d.ok) { sortie.error('Refusé par le serveur : ' + (d.motif || r.status) + (d.detail ? ' (' + d.detail + ')' : '')); return 1; }
  if (a.action === 'creer') sortie.log('Code créé : ' + d.code + ' · -' + d.pourcent + ' % · le plan à 80 € devient ' + d.montant + ' €. Un seul usage au total.');
  else if (a.action === 'lister') {
    if (!d.codes.length) sortie.log('Aucun code.');
    for (const c of d.codes) sortie.log([c.code.padEnd(12), ('-' + c.pourcent + ' %').padEnd(7), (c.actif ? c.etat : 'désactivé').padEnd(10), c.expire ? 'expire ' + c.expire.slice(0, 10) : '', c.note].join(' ').trim());
  } else sortie.log('Code ' + d.code + (d.actif ? ' réactivé.' : ' désactivé.'));
  return 0;
}

if (import.meta.url === 'file://' + process.argv[1]) {
  lancer(process.argv.slice(2), process.env).then((c) => process.exit(c));
}
