// Point d'entree Firebase : reexporte toutes les functions existantes
// plus le coach, sans toucher a index.js (fichier trop gros a reecrire).
Object.assign(exports, require("./index"));
exports.coachAgent = require("./coach").coachAgent;
// Mollie (brouillon 17/10) : paiement unique 80 / 60 EUR avec Bancontact.
Object.assign(exports, require("./mollie"));
