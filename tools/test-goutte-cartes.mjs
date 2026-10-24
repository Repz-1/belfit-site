// 22/10 : la goutte d'eau ne doit jamais chevaucher une carte d'Aujourd'hui,
// en haut / milieu / bas de defilement, avec et sans repas du plan semes.
// Prerequis : apercu construit. DONNEES FICTIVES (banc de test).
import { spawn } from 'child_process';
import { createRequire } from 'module';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const srv = spawn('python3',['-m','http.server','8092','--directory','app-v2/apercu/construit'],{stdio:'ignore',detached:true});
await new Promise(r=>setTimeout(r,1500));
let code=0; const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m); if(!c) code=1;};
const nav = await chromium.launch({executablePath: process.env.CHROME || '/usr/bin/google-chrome'});
const VIDE = [
  { id: 1, nom: 'Petit déjeuner', type: 'repas', cle: 'pdej', fixe: true, ouvert: false, ings: [] },
  { id: 2, nom: 'Déjeuner', type: 'repas', cle: 'dej', fixe: true, ouvert: false, ings: [] },
  { id: 3, nom: 'Dîner', type: 'repas', cle: 'diner', fixe: true, ouvert: false, ings: [] },
  { id: 4, nom: 'Collations', type: 'collation', cle: 'snack', fixe: true, ouvert: false, ings: [] } ];
const PLAN = { kcal: 2222, prot: 150, carbs: 220, lip: 70, livreLe: new Date().toISOString(), version: 1, repas: [
  { nom: 'Petit-déjeuner', ings: [{ name: 'Flocons avoine', portion: 80 }, { name: 'Banane', portion: 120 }] },
  { nom: 'Déjeuner', ings: [{ name: 'Riz cuit', portion: 150 }, { name: 'Poulet cuit', portion: 130 }] },
  { nom: 'Dîner', ings: [{ name: 'Brocoli', portion: 200 }, { name: 'Saumon cuit', portion: 120 }] } ] };
const DOS = { commande: { payeLe: new Date(Date.now()-3*864e5).toISOString() }, questionnaire: { envoyeLe: new Date(Date.now()-5*864e5).toISOString() } };

// Chevauchement mesure sur la pastille AU REPOS (entiere) contre chaque carte.
const mesure = (p) => p.evaluate(() => {
  const b = document.querySelector('.pg-journal .water-fab .wf-corps') || document.querySelector('.pg-journal .water-fab');
  const g = b.getBoundingClientRect();
  const touche = [];
  if (+getComputedStyle(b).opacity < 0.15) return { y: Math.round(g.top), h: Math.round(g.height), op: 'dispersee', touche };
  document.querySelectorAll('.pg-journal .colonne > *:not(.fente-goutte), .pg-journal .mc, .bn').forEach(e => {
    // conteneur pleine largeur dont l'unique enfant est cale a droite
    // (« Ajouter un repas ») : seul l'enfant compte, comme dans goutte.js.
    let cible = e; if (e.children.length === 1 && e.children[0].getBoundingClientRect().width < e.getBoundingClientRect().width * 0.7) cible = e.children[0];
    const c = cible.getBoundingClientRect();
    if (c.height < 3 || c.width < 3) return;
    // la carte doit occuper la gouttiere a gauche pour compter
    const ix = Math.min(g.right, c.right) - Math.max(g.left, c.left);
    const iy = Math.min(g.bottom, c.bottom) - Math.max(g.top, c.top);
    if (ix > 1 && iy > 1) touche.push((e.className || e.tagName).toString().split(' ')[0] + ' ' + Math.round(iy) + 'px');
  });
  return { y: Math.round(g.top), h: Math.round(g.height), op: getComputedStyle(b).opacity, touche };
});
const allerA = (p, ou) => p.evaluate(o => { const s = document.querySelector('.pan-scroll'); s.scrollTop = o === 'haut' ? 0 : o === 'bas' ? s.scrollHeight : (s.scrollHeight - s.clientHeight) / 2; }, ou);

for (const [nom, plan] of [['plan', PLAN], ['sans-plan', null]]) {
  const ctx = await nav.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true,locale:'fr-BE'});
  await ctx.addInitScript(([pl, d, rb]) => {
    localStorage.clear();
    if (pl) localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(pl));
    localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify(d));
    localStorage.setItem('belfit_v2_apercu_repas', JSON.stringify(rb));
  }, [plan, DOS, VIDE]);
  const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('ERREUR JS', e.message); code = 1; });
  await p.goto('http://localhost:8092/app.html'); await p.waitForTimeout(2600);
  if (plan) ok(await p.locator('.mc-plan').count() === 3, nom + ' : repas du plan semés');
  // Cas du test coche : premier repas amene a l'ecran (position intermediaire).
  for (const ou of ['haut', 'milieu', 'bas', 'repas']) {
    if (ou === 'repas') { await allerA(p, 'haut'); await p.waitForTimeout(500); await p.locator('.mc').nth(1).scrollIntoViewIfNeeded(); }
    else await allerA(p, ou);
    await p.waitForTimeout(1800);
    const m = await mesure(p);
    ok(m.touche.length === 0, `${nom} / ${ou} : goutte (y ${m.y}, h ${m.h}) sans chevauchement${m.touche.length ? ' — touche ' + m.touche.join(', ') : ''}`);
    await p.screenshot({ path: `/workspace/shots/goutte-fix-${nom}-${ou}.png` });
  }
  // Balayage : tous les 40px de defilement, a l'arret.
  const course = await p.evaluate(() => { const s = document.querySelector('.pan-scroll'); return s.scrollHeight - s.clientHeight; });
  const fautes = [];
  for (let y = 0; y <= course + 40; y += 40) {
    await p.evaluate(v => { document.querySelector('.pan-scroll').scrollTop = v; }, y); await p.waitForTimeout(900);
    const m = await mesure(p); if (m.touche.length) fautes.push(y + ':' + m.touche.join('/'));
  }
  ok(fautes.length === 0, `${nom} : balayage 0→${course}px, aucun chevauchement à l'arrêt${fautes.length ? ' — ' + fautes.join(', ') : ''}`);
  await ctx.close();
}
await nav.close(); try { process.kill(-srv.pid); } catch {} srv.kill(); process.exit(code);
