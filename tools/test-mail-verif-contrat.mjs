// Contrat du courriel de confirmation, sans appel reseau et sans secret.
import { readFileSync } from 'fs';

let code = 0;
const ok = (c, m) => { console.log((c ? 'ok ' : 'KO ') + m); if (!c) code = 1; };

const fn = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8');
const debut = fn.indexOf('exports.mailVerification');
const fin = fn.indexOf('exports.mailReinitialisation');
const mail = fn.slice(debut, fin > debut ? fin : debut + 8000);
ok(mail.includes('accepte: true') && mail.includes('dernierMailVerifId'), 'identifiant Resend renvoye et conserve');
ok(mail.includes('mailVerification refuse') && !mail.includes('envoi.text()'), 'echec API journalise le statut, pas le corps brut');
ok(!/console\.(log|error)\([^)]*lien/.test(mail), 'le lien de confirmation n est pas journalise');
ok(mail.includes('60000'), 'limite d une minute conservee');
ok(mail.includes('deja: true'), 'deja confirme : pas d envoi');
ok(fn.includes('email_verified === true'), 'le jeton confirme est toujours lu');

const bandeau = readFileSync(new URL('../app-v2/src/components/BandeauConfirmation.jsx', import.meta.url), 'utf8');
ok(bandeau.includes('.then(dire).catch(direEchec)'), 'le premier envoi affiche l echec');
ok(!bandeau.includes('envoyerMailVerification(langue.value).catch(() => {})'), 'le premier envoi ne masque plus l echec');
ok(bandeau.includes("t('conf_accepte')") && bandeau.includes("t('conf_deja')") && bandeau.includes("t('conf_erreur')"), 'trois etats affiches');

const i18n = readFileSync(new URL('../app-v2/src/i18n/index.js', import.meta.url), 'utf8');
ok(i18n.includes('Cela ne confirme pas') && i18n.includes('Aucun nouveau message'), 'les textes ne pretendent pas une livraison');

const invitation = readFileSync(new URL('../functions/invitation-offerte.js', import.meta.url), 'utf8');
ok(invitation.includes('verifie !== true'), 'le plan offert exige toujours une adresse confirmee');
const reprise = readFileSync(new URL('../app-v2/src/services/invitation.js', import.meta.url), 'utf8');
ok(reprise.includes('adresseConfirmee.value'), 'la reprise d invitation suit la confirmation');
ok(reprise.includes('!deja'), 'le message d attente n est pas repete');
process.exit(code);
