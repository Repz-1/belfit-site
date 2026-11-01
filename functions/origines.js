/**
 * Sites autorises a appeler les fonctions depuis un navigateur (CORS).
 * L'app Android (TWA) ouvre belfit.be : meme origine que le site.
 * localhost : developpement uniquement (vite dev / preview).
 */
module.exports = [
  "https://belfit.be",
  "https://www.belfit.be",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
];
