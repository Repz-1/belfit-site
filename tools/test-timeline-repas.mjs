// 01/11 v652 : timeline — ordre par heure prevue + pastilles 44 px / 15 px a 390 et 360. Port 8139.
import { spawn } from 'child_process'; import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url).href)('playwright');
const D=process.env.SHOTS||'';let ko=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)ko++;};
const srv = spawn('python3', ['-m','http.server','8139','--directory','app-v2/apercu/construit'], { stdio:'ignore', detached:true });
await new Promise(r=>setTimeout(r,1200));
const VIDE=[{id:1,nom:'Petit déjeuner',type:'repas',cle:'pdej',fixe:true,ouvert:false,ings:[]},{id:2,nom:'Déjeuner',type:'repas',cle:'dej',fixe:true,ouvert:false,ings:[]},{id:3,nom:'Dîner',type:'repas',cle:'diner',fixe:true,ouvert:false,ings:[]},{id:4,nom:'Collations',type:'collation',cle:'snack',fixe:true,ouvert:false,ings:[]}];
const PLAN={kcal:2222,prot:150,carbs:220,lip:70,livreLe:new Date().toISOString(),version:1,repas:[
{nom:'Petit-déjeuner',ings:[{name:'Flocons avoine',portion:80},{name:'Banane',portion:120}]},
{nom:"Collation de l'après-midi",ings:[{name:'Banane',portion:120},{name:'Amandes',portion:25}]},
{nom:'Déjeuner',ings:[{name:'Riz cuit',portion:150},{name:'Poulet cuit',portion:130},{name:'Brocoli',portion:150}]},
{nom:'Dîner',ings:[{name:'Brocoli',portion:200},{name:'Saumon cuit',portion:120},{name:'Pomme de terre cuite',portion:250}]}]};
const dossier={commande:{payeLe:new Date(Date.now()-3*864e5).toISOString()},questionnaire:{envoyeLe:new Date(Date.now()-5*864e5).toISOString(),reponses:{regime:{valeur:'Tout'},allergie:{valeur:'Non, aucune'}}}};
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
for (const W of [390,360]) {

const ctx=await b.newContext({viewport:{width:W,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true,locale:'fr-BE',timezoneId:'Europe/Brussels'});
await ctx.addInitScript(([pl,d,rb])=>{localStorage.clear();localStorage.setItem('belfit_v2_apercu_programme',JSON.stringify(pl));localStorage.setItem('belfit_v2_apercu_dossier',JSON.stringify(d));localStorage.setItem('belfit_v2_apercu_repas',JSON.stringify(rb));},[PLAN,dossier,VIDE]);
const p=await ctx.newPage(); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:8139/app.html?verrou=ouvert'); await p.waitForTimeout(2600);
await p.locator('.tl-it').first().locator('.mc-plan-btn--mange').tap(); await p.waitForTimeout(400);
//, await p.locator('.tl-heure').first().innerText());
await p.evaluate(()=>{const s=window.__banc.repas; s.value=s.value.map(r=>r.cle==='pdej'?{...r,heure:'08:12'}:r);}); await p.waitForTimeout(300);
const tl=p.locator('.tl'); await tl.scrollIntoViewIfNeeded(); await p.evaluate(()=>window.scrollBy(0,-60));await p.waitForTimeout(300);
if(D)await p.screenshot({path:`${D}/timeline-${W}.png`});
await p.locator('button.tl-heure').first().tap(); await p.waitForTimeout(300);
if(D)await p.screenshot({path:`${D}/selecteur-${W}.png`});
//, JSON.stringify(await p.locator('.tl-it').nth(1).evaluate(e=>{const c=e.querySelector('.mc').getBoundingClientRect(),pl=e.querySelector('.mc-plan');return [c.left,c.right,getComputedStyle(pl).padding,getComputedStyle(pl).width,[...pl.children].map(x=>Math.round(x.getBoundingClientRect().right))]})));
const ordre=(await p.locator('.tl-it').evaluateAll(a=>a.map(e=>e.querySelector('.tl-heure').innerText+' '+e.querySelector('.mc-titre').innerText)));
ok(/Déjeuner/.test(ordre[1])&&/Collation/.test(ordre[2]),W+' collation 16:00 apres dejeuner 12:30 : '+ordre.join(' | '));
const g=(await p.locator('.tl-it').nth(1).evaluate(e=>{const c=e.querySelector('.mc').getBoundingClientRect();return {carte:[c.left,c.right],b:[...e.querySelectorAll('.mc-plan > *')].map(x=>{const r=x.getBoundingClientRect();return [x.innerText,Math.round(r.left),Math.round(r.right),Math.round(r.height),getComputedStyle(x).fontSize, x.scrollWidth>x.clientWidth+1]})}}));
for(const [t,l,r,h,fs,dep] of g.b) ok(h>=44&&parseFloat(fs)>=15&&!dep&&l>=g.carte[0]&&r<=g.carte[1],W+' pastille '+t+' '+h+'px '+fs);
await ctx.close();
}
await b.close(); process.kill(-srv.pid); console.log(ko?ko+' echec(s)':'OK'); process.exit(ko?1:0);
