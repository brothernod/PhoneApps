"use strict";
/* Loop, physics, input, states, UI cards. Load order: version, levels, audio, game, render. */
const TAU=Math.PI*2, W=400, H=700, HUD=56, DOG_R=13, MAXSPEED=880, MAXDRAG=85, FRICTION=1.05, DECEL=55;
const DEBUG=/[?&]debug\b/.test(location.search);   // ?debug shows ghost memory + test knobs
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];

const cv=document.getElementById('c'), ctx=cv.getContext('2d');
const wrap=document.getElementById('wrap'), hudEl=document.getElementById('hud'), ov=document.getElementById('ov'), card=document.getElementById('card');
let scale=1,dpr=1;
const mem=document.createElement('canvas'); mem.width=W*2; mem.height=H*2;   // ghost memory layer (DEBUG only)
const mctx=mem.getContext('2d'); mctx.setTransform(2,0,0,2,0,0);

function resize(){
  dpr=Math.min(window.devicePixelRatio||1,3);
  scale=Math.min(innerWidth/W, innerHeight/H);
  cv.style.width=W*scale+'px'; cv.style.height=H*scale+'px';
  cv.width=Math.round(W*scale*dpr); cv.height=Math.round(H*scale*dpr);
  const r=cv.getBoundingClientRect();
  Object.assign(hudEl.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:(HUD*scale)+'px'});
}
addEventListener('resize',resize); resize();

/* ---------- lines ---------- */
const STELLA_LINES=[
  'You got this, Nala! BORF!',
  'Big sister Stella believes in you!',
  'Left paw, right paw — you’re a natural!',
  'That bonk was SO brave.',
  'Bed’s that way! Probably! BORF!',
  'Wrinkles of steel, Nala!',
  'Go go go! I’ll guard the snacks!',
  'Who’s a good girl? YOU are! BORF BORF!',
  'One more move, on the house!',
  'Smells like victory. Also like the couch.',
];
const BINX_LINES=[
  'Mrrp. Personal space.',
  '*smack* You walked into MY nap.',
  'Binx has revoked one (1) move.',
  'Hsss. This hallway is cat property.',
  '*slow blink* … *smack*',
  'Binx did that on purpose. Binx regrets nothing.',
];
const TREAT_LINES=['Found a treat! +1 move 🍪','Snack acquired. +1 move 🍪','A floor treat! The best kind. +1 🍪'];

/* ---------- best results (localStorage, best-effort) ---------- */
const BEST_KEY='nalaGolf.best.v1';
function loadBest(){ try{ return JSON.parse(localStorage.getItem(BEST_KEY))||{}; }catch(e){ return {}; } }
function saveBest(name,tries,shots){
  const all=loadBest(), b=all[name]||{}, res={tries:!b.tries||tries<b.tries, shots:!b.shots||shots<b.shots};
  all[name]={tries:Math.min(tries,b.tries||1e9), shots:Math.min(shots,b.shots||1e9)};
  try{ localStorage.setItem(BEST_KEY,JSON.stringify(all)); }catch(e){}
  return res;
}
function clearBest(){ try{ localStorage.removeItem(BEST_KEY); }catch(e){} }
function bestText(name){ const b=loadBest()[name]; return b?`${b.tries} tr${b.tries===1?'y':'ies'} · ${b.shots} shot${b.shots===1?'':'s'}`:''; }

/* ---------- state ---------- */
const settings={scent:true, ghost:false, lights:false, shots:3, sound:true};
let L, lvlIdx=0, objs=[], dog, shotsLeft, attempt, state='intro', pings=[], words=[], parts=[], prints=[], rec, stats, aim=null, t=0, winT=0, banner=null, toast=null, rp=null, printAcc=0, hudFx=[];

function loadLevel(i){
  lvlIdx=i; L=LEVELS[i];
  const ents=(L.ents||[]).map(e=>{ const d=ENT[e.k]; return Ci(e.x,e.y,d.r,d.name,d.mat,{ent:e.k}); });
  objs=[...L.objs(),...ents].map((o,id)=>Object.assign(o,{id,solid:o.ent!=='treat',sensor:o.ent==='treat',down:false,glow:0,cd:0,used:false,gone:false}));
  resetDog(); shotsLeft=settings.shots; attempt=1;
  pings=[];words=[];parts=[];prints=[];banner=null;toast=null;hudFx=[];
  mctx.clearRect(0,0,W,H);
  rec={frames:[],events:[]};
  stats={shots:0,bonks:0,knocked:[],by:{},treats:0,stella:0,binx:0};
  state='intro'; showIntro(true);
}
function resetDog(){ dog={x:L.start.x,y:L.start.y,vx:0,vy:0,a:-Math.PI/2,squash:0,dizzy:0,bonk:null}; }
function resetTry(){ for(const o of objs) if(o.ent){ o.used=false; o.gone=false; } }
function newAttempt(){
  resetDog(); resetTry(); shotsLeft=settings.shots; attempt++; aim=null; toast=null; hudFx=[];
  rec.events.push({f:rec.frames.length,k:'reset'});
  rec.frames.push({reset:true,attempt});
  state='aim'; hideCard();
}

/* ---------- moves ---------- */
function addMove(){ shotsLeft++; hudFx.push({k:'+',i:shotsLeft-1,t:0}); sfx('paw+'); }
function takeMove(){ if(shotsLeft<=0) return false; shotsLeft--; hudFx.push({k:'-',i:shotsLeft,t:0}); sfx('paw-'); return true; }
function say(who,txt,col){ toast={who,txt,col,t:0}; }

/* ---------- physics ---------- */
function lerpAngle(a,b,k){ const d=((b-a+Math.PI*3)%TAU)-Math.PI; return a+d*k; }
function collide(o){
  let nx,ny,pen,cx,cy;
  if(o.t==='r'){
    cx=clamp(dog.x,o.x,o.x+o.w); cy=clamp(dog.y,o.y,o.y+o.h);
    const dx=dog.x-cx, dy=dog.y-cy, d=Math.hypot(dx,dy);
    if(d>=DOG_R) return;
    if(d<1e-6){
      const l=dog.x-o.x, r=o.x+o.w-dog.x, tp=dog.y-o.y, b=o.y+o.h-dog.y, m=Math.min(l,r,tp,b);
      if(m===l){nx=-1;ny=0;cx=o.x;} else if(m===r){nx=1;ny=0;cx=o.x+o.w;} else if(m===tp){nx=0;ny=-1;cy=o.y;} else {nx=0;ny=1;cy=o.y+o.h;}
      pen=m+DOG_R;
    } else { nx=dx/d; ny=dy/d; pen=DOG_R-d; }
  } else {
    const dx=dog.x-o.x, dy=dog.y-o.y, d=Math.hypot(dx,dy)||.001;
    if(d>=o.r+DOG_R) return;
    nx=dx/d; ny=dy/d; pen=o.r+DOG_R-d; cx=o.x+nx*o.r; cy=o.y+ny*o.r;
  }
  dog.x+=nx*pen; dog.y+=ny*pen;
  const vn=dog.vx*nx+dog.vy*ny;
  if(vn<0){
    const e=MAT[o.mat].e;
    dog.vx-=(1+e)*vn*nx; dog.vy-=(1+e)*vn*ny;
    if(o.mat==='cat'){ const kick=o.ent==='binx'&&!o.used?280:120; dog.vx+=nx*kick; dog.vy+=ny*kick; }
    const sp=Math.hypot(dog.vx,dog.vy), cap=MAXSPEED*1.15;
    if(sp>cap){ dog.vx*=cap/sp; dog.vy*=cap/sp; }
    // bonk animation: squash against the surface (normal points from the surface to Nala)
    if(-vn>25 || o.ent) dog.bonk={nx,ny,str:clamp(-vn/650,.12,1),t:0};
    onHit(o,-vn,cx,cy);
  }
}
function addWord(txt,x,y,size=.5,col){ words.push({txt,x,y,t:0,life:1.1,size,rot:rand(-.25,.25),col}); }
function onHit(o,imp,x,y){
  o.glow=1;
  if(o.ent==='stella' && !o.used){ stellaBump(o); return; }
  if(o.ent==='binx' && !o.used){ binxSmack(o,x,y); return; }
  if(imp<25) return;
  const str=clamp(imp/550,.3,1);
  pings.push({x,y,t:0,life:.9+.5*str,maxR:50+170*str,mem:true});
  if(o.cd<=0){
    o.cd=.18; stats.bonks++; stats.by[o.name]=(stats.by[o.name]||0)+1;
    const m=MAT[o.mat], w=pick(m.words);
    addWord(w,x,y,str); sfx(m.snd,str); sfx('ping',str);
    const b=dog.bonk; rec.events.push({f:rec.frames.length,k:'hit',x,y,w,snd:m.snd,nx:b?b.nx:0,ny:b?b.ny:-1,str});
    if(imp>480){ dog.dizzy=1.6; }
    dog.squash=Math.min(1,str*1.2); buzz(Math.round(10+25*str));
  }
  if(o.knock && !o.down && imp>o.knock.at){
    o.down=true; o.solid=false; o.glow=1.4;
    o.debris=[...Array(10)].map(()=>({dx:rand(-20,20),dy:rand(-20,20),c:pick(o.knock.cols),s:rand(2,4)}));
    const c=center(o);
    addWord(o.knock.word,c.x,c.y-10,1.2,'#ffd27a'); sfx(o.knock.snd,1); buzz(60);
    spawnDebris(c.x,c.y,o.knock.cols);
    pings.push({x:c.x,y:c.y,t:0,life:1.6,maxR:240,mem:true});
    stats.knocked.push(o.name); banner={txt:o.knock.msg,t:0};
    rec.events.push({f:rec.frames.length,k:'knock',id:o.id,x:c.x,y:c.y,w:o.knock.word,snd:o.knock.snd,cols:o.knock.cols});
  }
}
function stellaBump(o){
  o.used=true; o.glow=1.6; o.cd=.4; stats.stella++; stats.bonks++; stats.by.Stella=(stats.by.Stella||0)+1;
  const line=pick(STELLA_LINES);
  for(let i=0;i<3;i++) addWord('BORF!',o.x+rand(-26,26),o.y-18+rand(-14,8),.6+i*.2,'#e6e9f0');
  pings.push({x:o.x,y:o.y,t:0,life:1.2,maxR:120,mem:true});
  addMove(); say('🐕 Stella',line+'  +1 move','#c9ccd6'); sfx('borf'); buzz([15,30,15]);
  rec.events.push({f:rec.frames.length,k:'stella',x:o.x,y:o.y,line});
}
function binxSmack(o,x,y){
  o.used=true; o.glow=1.6; o.cd=.4; stats.binx++; stats.bonks++; stats.by.Binx=(stats.by.Binx||0)+1;
  const line=pick(BINX_LINES), took=takeMove();
  addWord('SMACK!',x,y-6,1.3,'#ffe066');
  pings.push({x:o.x,y:o.y,t:0,life:1.2,maxR:130,mem:true});
  dog.dizzy=1.4; dog.squash=1;
  say('🐈‍⬛ Binx',line+(took?'  −1 move':''),'#d9a8ff'); sfx('smack'); buzz(70);
  if(took && shotsLeft===0) banner={txt:'Binx stole the last move! Nala finishes this roll…',t:0};
  rec.events.push({f:rec.frames.length,k:'binx',x,y,line});
}
function pickupTreat(o){
  o.gone=true; o.used=true; stats.treats++;
  addWord('+1 TREAT!',o.x,o.y-12,.9,'#ffe066'); addMove(); sfx('pickup'); buzz(25);
  banner={txt:pick(TREAT_LINES),t:0};
  rec.events.push({f:rec.frames.length,k:'treat',id:o.id,x:o.x,y:o.y});
}
function spawnDebris(x,y,cols){ for(let i=0;i<16;i++){ const a=rand(0,TAU), s=rand(60,240); parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.6,1.3),c:pick(cols),s:rand(2,4)}); } }
function center(o){ return o.t==='r'?{x:o.x+o.w/2,y:o.y+o.h/2}:{x:o.x,y:o.y}; }
function goalCenter(){ const g=L.goal; return g.t==='r'?{x:g.x+g.w/2,y:g.y+g.h/2}:{x:g.x,y:g.y}; }
function checkGoal(){
  const g=L.goal;
  if(g.t==='r'){ const cx=clamp(dog.x,g.x,g.x+g.w), cy=clamp(dog.y,g.y,g.y+g.h); return Math.hypot(dog.x-cx,dog.y-cy)<DOG_R; }
  return Math.hypot(dog.x-g.x,dog.y-g.y)<g.r+DOG_R;
}
function physics(dt){
  const sp=Math.hypot(dog.vx,dog.vy);
  const steps=Math.min(30,Math.max(1,Math.ceil(sp*dt/3))), h=dt/steps;
  const ox=dog.x, oy=dog.y;
  for(let s=0;s<steps;s++){
    dog.x+=dog.vx*h; dog.y+=dog.vy*h;
    for(const o of objs){
      if(o.solid) collide(o);
      else if(o.sensor && !o.gone && Math.hypot(dog.x-o.x,dog.y-o.y)<o.r+DOG_R) pickupTreat(o);
    }
    if(checkGoal()){ rec.frames.push({x:dog.x,y:dog.y,a:dog.a}); win(); return; }
  }
  const k=Math.exp(-FRICTION*dt); dog.vx*=k; dog.vy*=k;
  const s2=Math.hypot(dog.vx,dog.vy);
  if(s2>0){ const dec=Math.min(s2,DECEL*dt); dog.vx-=dog.vx/s2*dec; dog.vy-=dog.vy/s2*dec; }
  if(s2>20) dog.a=lerpAngle(dog.a,Math.atan2(dog.vy,dog.vx),.3);
  printAcc+=Math.hypot(dog.x-ox,dog.y-oy);
  if(printAcc>14){ printAcc=0; const side=prints.length%2?1:-1; prints.push({x:dog.x+Math.cos(dog.a+Math.PI/2)*4*side,y:dog.y+Math.sin(dog.a+Math.PI/2)*4*side,a:dog.a,age:0}); if(prints.length>220) prints.shift(); }
  rec.frames.push({x:dog.x,y:dog.y,a:dog.a});
  if(Math.hypot(dog.vx,dog.vy)<6){ dog.vx=dog.vy=0; stopped(); }
}
// A roll always finishes. Only when she stops do we check moves — so if Binx takes the
// last move mid-roll, she still finishes that roll (and might even reach the bed).
function stopped(){
  if(shotsLeft<=0){
    state='fail'; sfx('fail'); dog.squash=.6;
    setTimeout(showFail,700);
  } else { state='aim'; if(Math.random()<.35){ addWord(pick(['hmph.','*sniff sniff*','...where am I','hm?']),dog.x,dog.y-20,.2,'#bbb'); sfx('hmph'); } }
}
function win(){
  state='winning'; winT=0; dog.vx=dog.vy=0; dog.from={x:dog.x,y:dog.y};
  stats.best=saveBest(L.name,attempt,stats.shots);
  const g=goalCenter(); sfx('win'); buzz([30,40,30]);
  addWord(pick(['GOOD GIRL!','SHE DID IT!','WHAT A GIRL!']),g.x+40,g.y+40,1.3,'#ffd27a');
}

/* ---------- recap ---------- */
function startRecap(){
  hideCard(); state='recap'; pings=[]; words=[]; parts=[]; toast=null; banner=null;
  const n=rec.frames.length;
  rp={i:0,speed:Math.max(2.5,n/(9*60)),ev:0,bonks:0,knocked:new Set(),gone:new Set(),used:new Set(),att:1,done:0,shown:false,sb:3,bonk:null,diz:0};
}
function updateRecap(dt){
  rp.i+=rp.speed*dt*60; rp.sb=Math.min(3,rp.sb+dt*9);
  if(rp.bonk) rp.bonk.t+=dt*Math.min(2,rp.speed*.6); rp.diz=Math.max(0,rp.diz-dt);
  while(rp.ev<rec.events.length && rec.events[rp.ev].f<=rp.i){
    const e=rec.events[rp.ev++];
    if(e.k==='hit'){ rp.bonks++; rp.bonk={nx:e.nx||0,ny:e.ny||-1,str:e.str||.5,t:0}; if((e.str||0)>.85) rp.diz=1; addWord(e.w,e.x,e.y,.5); pings.push({x:e.x,y:e.y,t:0,life:.6,maxR:55}); if(rp.sb>=1){ rp.sb--; sfx(e.snd,.35);} }
    if(e.k==='knock'){ rp.knocked.add(e.id); addWord(e.w,e.x,e.y-10,1,'#ffd27a'); sfx(e.snd,.7); spawnDebris(e.x,e.y,e.cols); }
    if(e.k==='reset'){ rp.gone.clear(); rp.att++; }
    if(e.k==='treat'){ rp.gone.add(e.id); addWord('+1 TREAT!',e.x,e.y-12,.8,'#ffe066'); sfx('pickup'); }
    if(e.k==='stella'){ rp.bonks++; addWord('BORF! +1',e.x,e.y-18,.9,'#e6e9f0'); say('🐕 Stella',e.line,'#c9ccd6'); sfx('borf',.6); }
    if(e.k==='binx'){ rp.bonks++; addWord('SMACK! −1',e.x,e.y-8,1,'#ffe066'); say('🐈‍⬛ Binx',e.line,'#d9a8ff'); sfx('smack',.6); }
  }
  if(rp.i>=rec.frames.length){ rp.done+=dt; if(rp.done>1.2 && !rp.shown){ rp.shown=true; showResults(); } }
}

/* ---------- input ---------- */
// Listen on the full-screen wrapper so a drag can start anywhere (even the letterbox bars).
function toLocal(e){ const r=cv.getBoundingClientRect(); return {x:(e.clientX-r.left)/scale,y:(e.clientY-r.top)/scale}; }
wrap.addEventListener('pointerdown',e=>{
  ensureAudio();
  if(state==='recap'){ rp.i=rec.frames.length; rp.ev=rec.events.length; rp.done=1.2; return; }
  if(state!=='aim') return;
  const p=toLocal(e); if(p.y>=0 && p.y<HUD) return;
  try{ wrap.setPointerCapture(e.pointerId); }catch(_){}
  aim={sx:p.x,sy:p.y,cx:p.x,cy:p.y,pow:0,dx:0,dy:0,full:false};
});
wrap.addEventListener('pointermove',e=>{
  if(!aim) return; const p=toLocal(e);
  aim.cx=p.x; aim.cy=p.y;
  const dx=aim.sx-p.x, dy=aim.sy-p.y, d=Math.hypot(dx,dy);
  aim.pow=clamp(d/MAXDRAG,0,1); if(d>0){aim.dx=dx/d; aim.dy=dy/d;}
  if(aim.pow>=1 && !aim.full){ aim.full=true; buzz(8); } else if(aim.pow<.97) aim.full=false;
});
function release(){
  if(!aim) return; const a=aim; aim=null;
  if(state!=='aim' || a.pow<.06) return;
  shoot(a.dx,a.dy,a.pow);
}
function shoot(dx,dy,pow){
  dog.vx=dx*pow*MAXSPEED; dog.vy=dy*pow*MAXSPEED; dog.a=Math.atan2(dy,dx);
  shotsLeft--; stats.shots++; state='moving'; sfx('whoosh',pow);
}
wrap.addEventListener('pointerup',release);
wrap.addEventListener('pointercancel',()=>{aim=null});
document.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});

/* ---------- UI cards ---------- */
function hideCard(){ ov.classList.add('hidden'); }
function showCard(html,btns,revFooter,theme){
  card.innerHTML=html; card.className='card'+(theme?' '+theme:''); ov.className=theme||'';
  const row=document.createElement('div'); row.className='row';
  (btns||[]).forEach(b=>{ const el=document.createElement('button'); el.textContent=b.t; if(b.primary) el.className='primary'; if(b.disabled) el.disabled=true; el.onclick=()=>{ensureAudio(); b.fn();}; row.appendChild(el); });
  card.appendChild(row);
  if(revFooter){ const r=document.createElement('div'); r.className='rev'; r.textContent='rev '+REV+(DEBUG?' · debug':''); card.appendChild(r); }
  ov.classList.remove('hidden');
}
function speak(){
  try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(L.intro); u.rate=1; u.pitch=1.1; speechSynthesis.speak(u);}catch(e){}
}
function showIntro(fresh){
  const how=(fresh&&lvlIdx===0)?`<div class="how">🐾 <b>Drag back anywhere</b> and let go to fling Nala (like a slingshot). A short drag is full power.<br>🌑 The house is dark. Bonking into stuff lights it up for a sec — use the directions + your bonks to find the way.<br>🎯 ${settings.shots>=99?'Unlimited':settings.shots} moves per try. 🍪 Hidden treats and 🐕 Stella give +1. 🐈‍⬛ Binx takes one.</div>`:'';
  const best=bestText(L.name);
  showCard(`<div class="kicker">Nala's Bonk Golf · Level ${lvlIdx+1}</div><h2>${L.emoji} ${L.name}</h2>
    <div class="bubble"><b>Ashley:</b> “${L.intro}”</div>${how}
    <div class="small">Memorize it — the lights are off. (📜 up top shows this again.)${best?`<br>🏆 Your best: <b>${best}</b>`:''}</div>`,
    [{t:'🔊 Read it to me',fn:speak},{t:fresh?'Let’s go!':'Back to it',primary:true,fn:()=>{ hideCard(); if(state==='intro') state='aim'; }}],true);
}
const FAILS=['Nala has decided this is her spot now.','Nala sits. Nala refuses. Nala is a shar-pei.','Nala flops down dramatically. Back to the door.','Nala is “resting her eyes.” Try again.','Nala has filed a formal complaint about the furniture.'];
function showFail(){
  if(state!=='fail') return;
  showCard(`<div class="kicker">Attempt ${attempt}</div><h2>🐾 Out of sniffs!</h2>
    <div class="bubble">${pick(FAILS)}</div>
    <div class="small">Total bonks so far: <b>${stats.bonks}</b>. The house remembers anything she knocked over. Treats, Stella and Binx reset each try.</div>`,
    [{t:'📜 Directions',fn:()=>showIntro(false)},{t:'Try again',primary:true,fn:newAttempt}]);
}
function rating(){
  const s=stats.shots;
  if(s<=1) return 'Hole in one?! Is she faking?';
  if(s<=3) return 'Wrinkly GPS';
  if(s<=6) return 'Professional Bonker';
  if(s<=10) return 'Pinball Wizard';
  return 'Majestic Chaos Potato';
}
function showResults(){
  const top=Object.entries(stats.by).sort((a,b)=>b[1]-a[1])[0];
  const last=lvlIdx>=LEVELS.length-1, nb=stats.best||{};
  const fx=[stats.treats&&`🍪 ${stats.treats} treat${stats.treats>1?'s':''}`,stats.stella&&`🐕 Stella pep talks ×${stats.stella}`,stats.binx&&`🐈‍⬛ Binx smacks ×${stats.binx}`].filter(Boolean).join(' · ');
  const tb=top?top[0]:'—';
  showCard(`<div class="kicker">Level ${lvlIdx+1} complete</div>
    <div class="rhead"><h2>Good girl, Nala!</h2><div class="title">“${rating()}”</div></div>
    <div class="grid">
      <div><b>${attempt}</b><span>tr${attempt===1?'y':'ies'}</span></div>
      <div><b>${stats.shots}</b><span>shot${stats.shots!==1?'s':''}</span></div>
      <div><b>${stats.bonks}</b><span>bonks</span></div>
      <div><b>${top?'×'+top[1]:'0'}</b><span>${top?tb:'no bonks?!'}</span></div>
    </div>
    ${nb.tries||nb.shots?'<div class="nbwrap"><span class="newbest">NEW BEST!</span></div>':''}
    <div class="small">Casualties: <b>${stats.knocked.length?stats.knocked.join(' · '):'none! suspicious.'}</b>${fx?`<br>${fx}`:''}<br>🏆 Best: ${bestText(L.name)}</div>`,
    [{t:'Replay',fn:startRecap},{t:'Retry',fn:()=>loadLevel(lvlIdx)},
     {t:last?'Back to level 1':'Next level →',primary:true,fn:()=>loadLevel(last?0:lvlIdx+1)}],false,'paper');
}
function showSettings(){
  const chk=(k,label,sub)=>`<label><span>${label}<small>${sub}</small></span><input type="checkbox" data-k="${k}" ${settings[k]?'checked':''}></label>`;
  showCard(`<div class="kicker">Workshop knobs</div><h2>⚙️ Tune the fun</h2><div class="set">
    ${chk('scent','Scent hint','Goal gives off a faint pulse that gets stronger as she gets close')}
    ${DEBUG?chk('ghost','Ghost memory (debug)','Things you’ve bonked stay faintly outlined'):''}
    ${chk('lights','Lights on (cheat)','See the whole map — for level design')}
    ${chk('sound','Sound','')}
    <label><span>Moves per try<small>Applies next attempt</small></span><select id="selShots">
      ${[3,4,5,99].map(n=>`<option value="${n}" ${settings.shots===n?'selected':''}>${n===99?'Unlimited':n}</option>`).join('')}</select></label>
    <label><span>Jump to level</span><select id="selLvl">${LEVELS.map((l,i)=>`<option value="${i}" ${i===lvlIdx?'selected':''}>${i+1}. ${l.name}</option>`).join('')}</select></label>
    <label><span>Best scores<small>Saved on this device</small></span><button id="bClr" type="button">Clear</button></label>
    </div>`,[{t:'Done',primary:true,fn:()=>{ hideCard(); if(state==='intro') showIntro(true);} }],true);
  card.querySelectorAll('input[type=checkbox]').forEach(el=>el.onchange=()=>{settings[el.dataset.k]=el.checked;});
  card.querySelector('#selShots').onchange=e=>{settings.shots=+e.target.value;};
  card.querySelector('#selLvl').onchange=e=>{loadLevel(+e.target.value);};
  card.querySelector('#bClr').onclick=e=>{ clearBest(); e.target.textContent='Cleared'; e.target.disabled=true; };
}
document.getElementById('bDir').onclick=()=>{ensureAudio(); if(state!=='recap') showIntro(state==='intro');};
document.getElementById('bRst').onclick=()=>{ensureAudio(); if(state==='aim'||state==='moving'||state==='fail'){ newAttempt(); }};
document.getElementById('bSet').onclick=()=>{ensureAudio(); showSettings();};

/* ---------- update ---------- */
function update(dt){
  for(const p of pings){ p.t+=dt; if(p.t>=p.life && p.mem) commitMem(p); }
  pings=pings.filter(p=>p.t<p.life);
  for(const w of words){ w.t+=dt; w.y-=22*dt; } words=words.filter(w=>w.t<w.life);
  for(const p of parts){ p.x+=p.vx*dt; p.y+=p.vy*dt; const k=Math.exp(-4*dt); p.vx*=k; p.vy*=k; p.life-=dt; } parts=parts.filter(p=>p.life>0);
  for(const o of objs){ o.glow=Math.max(0,o.glow-dt*.9); o.cd-=dt; }
  for(const p of prints) p.age+=dt; prints=prints.filter(p=>p.age<3);
  for(const f of hudFx) f.t+=dt; hudFx=hudFx.filter(f=>f.t<.9);
  dog.squash=Math.max(0,dog.squash-dt*4); dog.dizzy=Math.max(0,dog.dizzy-dt); if(dog.bonk){ dog.bonk.t+=dt; if(dog.bonk.t>1.2) dog.bonk=null; }
  if(banner){ banner.t+=dt; if(banner.t>2.8) banner=null; }
  if(toast){ toast.t+=dt; if(toast.t>(state==='recap'?1.6:3.2)) toast=null; }
  if(state==='moving') physics(dt);
  else if(state==='winning'){
    winT+=dt; const g=goalCenter(), k=clamp(winT/.5,0,1), e=1-Math.pow(1-k,3);
    dog.x=dog.from.x+(g.x-dog.from.x)*e; dog.y=dog.from.y+(g.y-dog.from.y)*e;
    if(winT>2.2) startRecap();
  } else if(state==='recap') updateRecap(dt);
}
function commitMem(p){
  if(!(DEBUG&&settings.ghost)) return;
  mctx.save(); mctx.beginPath(); mctx.arc(p.x,p.y,p.maxR,0,TAU); mctx.clip();
  mctx.strokeStyle='rgba(170,40,40,.55)'; mctx.lineWidth=1.5;
  for(const o of objs) if(o.solid){ shapePath(mctx,o); mctx.stroke(); }
  mctx.restore(); p.mem=false;
}

/* ---------- loop + test hooks ---------- */
let last=performance.now();
function frame(now){ const dt=Math.min(.033,(now-last)/1000); last=now; t+=dt; if(L) update(dt); render(); requestAnimationFrame(frame); }
window.NALA={ get state(){return state}, get shotsLeft(){return shotsLeft}, get dog(){return dog}, get objs(){return objs}, get stats(){return stats}, get rec(){return rec}, get rp(){return rp},
  start(){ hideCard(); if(state==='intro') state='aim'; }, shoot, loadLevel, newAttempt,
  place(x,y){ dog.x=x; dog.y=y; }, setMoves(n){ shotsLeft=n; }, forceWin(){ if(state==='aim'||state==='moving') win(); } };
addEventListener('DOMContentLoaded',()=>{ loadLevel(0); requestAnimationFrame(frame); });
