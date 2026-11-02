// v659 (Raci 02/11 « Modifier l'heure ne fonctionne pas ») : selecteur d'heure du DERNIER repas.
// Les boutons flottants (Ajouter un repas, eau, barre du bas) ne doivent plus le recouvrir. Port 8159. DONNEES DE TEST.
import { spawn } from 'child_process'; import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url).href)('playwright');
const D=process.env.SHOTS||'';let ko=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)ko++;};
const srv = spawn('python3', ['-m','http.server','8159','--directory','app-v2/apercu/construit'], { stdio:'ignore', detached:true });
await new Promise(r=>setTimeout(r,1200));
const VIDE=[{id:1,nom:'Petit déjeuner',type:'repas',cle:'pdej',fixe:true,ouvert:false,ings:[]},{id:2,nom:'Déjeuner',type:'repas',cle:'dej',fixe:true,ouvert:false,ings:[]},{id:3,nom:'Dîner',type:'repas',cle:'diner',fixe:true,ouvert:false,ings:[]},{id:4,nom:'Collations',type:'collation',cle:'snack',fixe:true,ouvert:false,ings:[]}];
const PLAN={kcal:2222,prot:150,carbs:220,lip:70,livreLe:new Date().toISOString(),version:1,repas:[
{nom:'Petit-déjeuner',ings:[{name:'Flocons avoine',portion:80},{name:'Banane',portion:120}]},
{nom:"Collation de l'après-midi",ings:[{name:'Banane',portion:120},{name:'Amandes',portion:25}]},
{nom:'Déjeuner',ings:[{name:'Riz cuit',portion:150},{name:'Poulet cuit',portion:130},{name:'Brocoli',portion:150}]},
{nom:'Dîner',ings:[{name:'Brocoli',portion:200},{name:'Saumon cuit',portion:120},{name:'Pomme de terre cuite',portion:250}]}]};
const dossier={commande:{payeLe:new Date(Date.now()-3*864e5).toISOString()},questionnaire:{envoyeLe:new Date(Date.now()-5*864e5).toISOString(),reponses:{regime:{valeur:'Tout'},allergie:{valeur:'Non, aucune'}}}};
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true,locale:'fr-BE',timezoneId:'Europe/Brussels'});
await ctx.addInitScript(([pl,d,rb])=>{localStorage.clear();localStorage.setItem('belfit_v2_apercu_programme',JSON.stringify(pl));localStorage.setItem('belfit_v2_apercu_dossier',JSON.stringify(d));localStorage.setItem('belfit_v2_apercu_repas',JSON.stringify(rb));},[PLAN,dossier,VIDE]);
const p=await ctx.newPage(); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:8159/app.html?verrou=ouvert'); await p.waitForTimeout(2600);
await p.locator('.tl-it').last().locator('.mc-plan-btn--mange').tap(); await p.waitForTimeout(500);
const h=()=>p.evaluate(()=>window.__banc.repas.value.map(r=>r.nom+'='+r.heure).join(', '));
console.log('apres mange:',await h());
const puce=p.locator('button.tl-puce').last(); console.log('puce count',await puce.count(), await puce.innerText().catch(()=>'-'));
await puce.scrollIntoViewIfNeeded(); await puce.tap(); await p.waitForTimeout(400);
console.log('picker ouvert:', await p.locator('.tl-pick').count());
await p.screenshot({path:process.env.OUT+'-picker.png'});
for (const nom of ['Heures plus','Minutes plus','Minutes moins']) { const bx=await p.getByRole('button',{name:nom}).boundingBox();
  ok(await p.evaluate(([x,y,n])=>{const e=document.elementFromPoint(x,y);return !!e&&e.getAttribute('aria-label')===n;},[bx.x+bx.width/2,bx.y+bx.height/2,nom]), nom+' : rien ne le recouvre'); }
{ const bx=await p.locator('.tl-pick-bt--ok').boundingBox(); ok(await p.evaluate(([x,y])=>!!document.elementFromPoint(x,y)?.closest('.tl-pick-bt--ok'),[bx.x+bx.width/2,bx.y+bx.height/2]),'OK : rien ne le recouvre'); }
await p.getByRole('button',{name:'Minutes plus'}).tap(); await p.waitForTimeout(200);
const plus=p.getByRole('button',{name:'Heures plus'}); console.log('plus',await plus.count());
await plus.tap().catch(e=>console.log('tap plus KO',e.message.split('\n')[0])); await p.waitForTimeout(300);
console.log('valeur affichee:', await p.locator('.tl-pick-val').allInnerTexts().catch(()=>'-'), 'picker:',await p.locator('.tl-pick').count());
await p.locator('.tl-pick-bt--ok').tap().catch(e=>console.log('tap OK KO',e.message.split('\n')[0])); await p.waitForTimeout(500);
const apres=await h(); console.log('apres OK:',apres); ok(/Dîner=\d\d:\d\d/.test(apres) && !(/Dîner=07:35/.test(apres)), 'heure modifiee et enregistree'); ok(await p.locator('.tl-pick').count()===0,'selecteur ferme');
await p.screenshot({path:process.env.OUT+'-apres-ok.png'});
// Cas 2 (cause reelle) : repas MANGE mais sans heure enregistree (mange avant v654,
// ou repas libre rempli a la main) : la pastille doit rester modifiable.
await p.evaluate(()=>{const R=window.__banc.repas; R.value=R.value.map(r=>{if(r.nom!=='Dîner')return r; const n={...r}; delete n.heure; return n;});});
await p.waitForTimeout(400);
console.log(await p.evaluate(()=>[...document.querySelectorAll('.tl-it')].map(e=>e.innerText.slice(0,40).replace(/\n/g,' ')+' btn='+!!e.querySelector('button.tl-puce'))));const nb=await p.locator('button.tl-puce').count();
ok(nb===1,'repas mange sans heure : pastille cliquable ('+nb+')');
await p.screenshot({path:process.env.OUT+'-sans-heure.png'});
if(nb){ const pc=p.locator('button.tl-puce'); await pc.scrollIntoViewIfNeeded(); await pc.tap(); await p.waitForTimeout(300);
  await p.getByRole('button',{name:'Heures plus'}).tap(); await p.locator('.tl-pick-bt--ok').tap(); await p.waitForTimeout(400);
  const a2=await h(); ok(/Dîner=\d\d:\d\d/.test(a2),'heure enregistree sur repas sans heure : '+a2); }
await b.close(); try{process.kill(-srv.pid)}catch{}; srv.kill(); console.log(ko?'ECHEC':'OK'); process.exit(ko?1:0);
