import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// Build de l'apercu uniquement. Separe du build de production : il ne
// sort pas dans ../v2 et ne part donc jamais en ligne.
export default defineConfig({
  plugins: [preact()],
  root: 'apercu',
  base: './',
  build: {
    outDir: 'construit',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: { input: { index: 'apercu/index.html', app: 'apercu/app.html', stats: 'apercu/stats.html', repas: 'apercu/repas.html', quiz: 'apercu/quiz.html', planif: 'apercu/planif.html', planifg: 'apercu/planifg.html', fiche: 'apercu/fiche.html', login: 'apercu/login.html', besoins: 'apercu/besoins.html', poids: 'apercu/poids.html', planif2: 'apercu/planif2.html', exos: 'apercu/exos.html', demarrage: 'apercu/demarrage.html' } },
  },
});
