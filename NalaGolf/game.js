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

// Safe areas (notch / home bar) come from CSS env() via #wrap's padding; the 400×700 world fits inside them.
function insets(){
  try{ const cs=getComputedStyle(wrap), f=k=>parseFloat(cs[k])||0; return {t:f('paddingTop'),r:f('paddingRight'),b:f('paddingBottom'),l:f('paddingLeft')}; }
  catch(e){ return {t:0,r:0,b:0,l:0}; }
}
function resize(){
  dpr=Math.min(window.devicePixelRatio||1,3);
  const s=insets();
  scale=Math.min((innerWidth-s.l-s.r)/W, (innerHeight-s.t-s.b)/H);
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
const settings={scent:true, ghost:false, lights:false, shots:3, sound:true, vol:.8, unlockAll:false, costume:'sniffer'};
const SET_KEY='nalaGolf.settings.v1', SET_KEEP={scent:'boolean',shots:'number',sound:'boolean',vol:'number',unlockAll:'boolean',costume:'string'};   // remembered across visits
try{ const sv=JSON.parse(localStorage.getItem(SET_KEY))||{}; for(const k in SET_KEEP) if(typeof sv[k]===SET_KEEP[k]) settings[k]=sv[k]; }catch(e){}
function saveSettings(){ try{ const o={}; for(const k in SET_KEEP) o[k]=settings[k]; localStorage.setItem(SET_KEY,JSON.stringify(o)); }catch(e){} }

/* ---------- progress: unlocks, the latest clear of each level (for the credits), lifetime bonks ---------- */
const RUN_KEY='nalaGolf.run.v1', CAREER_KEY='nalaGolf.career.v1';
function loadJSON(k){ try{ return JSON.parse(localStorage.getItem(k))||{}; }catch(e){ return {}; } }
function saveJSON(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
/* Playthroughs ("laps"). prog = {beat: times the game was beaten, lap: {levelName:true} cleared this lap}.
   Lap 1 unlocks levels in order. From lap 2 on everything is open, the clutter is remixed
   (L.remix, solver-checked layouts) and clearing all five again counts as another beat. */
const PROG_KEY='nalaGolf.prog.v1';
function loadProg(){
  let p=null; try{ p=JSON.parse(localStorage.getItem(PROG_KEY)); }catch(e){}
  if(p && typeof p.beat==='number' && p.lap) return p;
  const best=loadBest(), all=LEVELS.every(l=>best[l.name]);   // saves from before laps existed
  p={beat:all?1:0, lap:{}}; if(!all) for(const l of LEVELS) if(best[l.name]) p.lap[l.name]=true;
  saveJSON(PROG_KEY,p); return p;
}
function cleared(i){ return !!loadProg().lap[LEVELS[i].name]; }
function lapDone(){ const p=loadProg(); return LEVELS.every(l=>p.lap[l.name]); }
function unlocked(i){ return settings.unlockAll || i===0 || loadProg().beat>0 || cleared(i-1); }
function nextAfter(i){ for(let k=1;k<=LEVELS.length;k++){ const j=(i+k)%LEVELS.length; if(!cleared(j)&&unlocked(j)) return j; } return Math.min(i+1,LEVELS.length-1); }
function nextToPlay(){ for(let i=0;i<LEVELS.length;i++) if(!cleared(i)) return unlocked(i)?i:0; return 0; }
function remixOf(L){ const b=loadProg().beat; return b>0&&L.remix&&L.remix.length?L.remix[(b-1)%L.remix.length]:null; }

/* Costumes (bonk mode only; the lights coming on always shows Nala as herself). need = times beaten. */
const COSTUMES=[
  {id:'sniffer',name:'Super Sniffer',need:0},
  {id:'herself',name:'Just Nala',need:0},
  {id:'pirate',name:'Captain Nala',need:1,em:'🏴‍☠️'},
  {id:'sensei',name:'Sensei Nala',need:2,em:'🥋'},
  {id:'astro',name:'Astro Nala',need:3,em:'🚀'},
];
const COSTUME_WORDS={pirate:['SQUAWK!','ARRR!','*parrot noises*','YARR!'],sensei:['HI-YAH!','HWAH!','*dojo noises*'],astro:['Houston…','beep boop','ZERO-G!']};
function costumesOpen(){ const b=loadProg().beat; return COSTUMES.filter(c=>c.need<=b); }
function costume(){ const c=costumesOpen().find(c=>c.id===settings.costume); return c?c.id:'sniffer'; }
function nextCostume(){ const o=costumesOpen(), i=o.findIndex(c=>c.id===costume()); settings.costume=o[(i+1)%o.length].id; saveSettings(); return o[(i+1)%o.length]; }
function commitCareer(){   // bonks count toward the lifetime total even on levels you quit
  if(!stats) return; const d=stats.bonks-(stats.committed||0); if(d<=0) return;
  const c=loadJSON(CAREER_KEY); c.bonks=(c.bonks||0)+d; saveJSON(CAREER_KEY,c); stats.committed=stats.bonks;
}
function saveRun(){
  const r=loadJSON(RUN_KEY);
  r[L.name]={bonks:stats.bonks,tries:attempt,shots:stats.shots,knocked:stats.knocked.length,treats:stats.treats,stella:stats.stella,binx:stats.binx,by:stats.by};
  saveJSON(RUN_KEY,r);
}
function runTotals(){
  const r=loadJSON(RUN_KEY), T={levels:0,bonks:0,tries:0,shots:0,knocked:0,treats:0,stella:0,binx:0,by:{}};
  for(const l of LEVELS){ const x=r[l.name]; if(!x) continue; T.levels++;
    for(const k of ['bonks','tries','shots','knocked','treats','stella','binx']) T[k]+=x[k]||0;
    for(const [n,c] of Object.entries(x.by||{})) T.by[n]=(T.by[n]||0)+c; }
  T.top=Object.entries(T.by).filter(([n])=>n!=='wall').sort((a,b)=>b[1]-a[1])[0]||null;
  T.career=loadJSON(CAREER_KEY).bonks||0;
  return T;
}
addEventListener('pagehide',()=>commitCareer());
let remix=null, L, lvlIdx=0, objs=[], dog, shotsLeft, attempt, state='intro', pings=[], words=[], parts=[], prints=[], rec, stats, aim=null, t=0, winT=0, banner=null, toast=null, rp=null, printAcc=0, hudFx=[], stellaMet=false, ti=null, cr=null;

function loadLevel(i,quiet){
  commitCareer();
  lvlIdx=i; L=LEVELS[i]; stellaMet=false;
  const mix=remixOf(L); remix=mix;
  const ents=(L.ents||[]).map(e=>{ const d=ENT[e.k], at=e.k==='treat'&&mix&&mix.treat||[e.x,e.y]; return Ci(at[0],at[1],d.r,d.name,d.mat,{ent:e.k}); });
  const base=L.objs(); if(mix) for(const [i,[x,y]] of Object.entries(mix.m||{})){ base[i].x=x; base[i].y=y; }
  // squeaky toys don't deflect her: she rolls over them (squeak + a little ping)
  objs=[...base,...ents].map((o,id)=>{ const sen=o.ent==='treat'?'treat':o.mat==='squeak'?'toy':false;
    return Object.assign(o,{id,solid:!sen,sensor:sen,down:false,glow:0,cd:0,used:false,gone:false,hx:o.x,hy:o.y}); });
  resetDog(); shotsLeft=settings.shots; attempt=1;
  pings=[];words=[];parts=[];prints=[];banner=null;toast=null;hudFx=[];
  mctx.clearRect(0,0,W,H);
  rec={frames:[],events:[]};
  stats={shots:0,bonks:0,knocked:[],by:{},treats:0,stella:0,binx:0};
  if(quiet) return;
  state='intro'; showIntro(true);
}
function resetDog(){ dog={x:L.start.x,y:L.start.y,vx:0,vy:0,a:-Math.PI/2,squash:0,dizzy:0,bonk:null}; }
// Stella: after the BORF she trots aside and stops blocking. With STELLA_KEEPS her +1 lasts for the
// rest of the level (every later try starts with one extra move) and she stays out of the way.
const STELLA_KEEPS=true;
function resetTry(){ for(const o of objs) if(o.ent){
  if(o.ent==='stella' && STELLA_KEEPS && o.used) continue;
  o.used=false; o.gone=false;
  if(o.ent==='stella'){ o.x=o.hx; o.y=o.hy; o.solid=true; o.walk=null; } } }
// Learning the house: after a couple of failed tries every try gets +1 move (+2 later on).
// The first tries stay tense; a long losing streak doesn't. LEARN = the try numbers where it kicks in.
const LEARN=[3,6];
function learnBonus(n){ return settings.shots>=99?0:LEARN.filter(k=>n>=k).length; }
function triesMoves(){ return settings.shots+(STELLA_KEEPS&&stellaMet&&settings.shots<99?1:0)+learnBonus(attempt); }
function newAttempt(){
  resetDog(); resetTry(); attempt++; shotsLeft=triesMoves(); aim=null; toast=null; hudFx=[];
  if(learnBonus(attempt)>learnBonus(attempt-1)) banner={txt:`Nala’s learning the house 🧠 every try gets ${shotsLeft} moves now`,t:0};
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
  if(vn<0 && o.knock && !o.down && -vn>o.knock.at){
    // hard enough to tip it over: she plows on through (a bit slower) instead of bouncing off
    dog.vx-=.55*vn*nx; dog.vy-=.55*vn*ny; dog.vx*=.85; dog.vy*=.85;
    dog.bonk={nx,ny,str:clamp(-vn/900,.12,.6),t:0};
    onHit(o,-vn,cx,cy); return;
  }
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
    const cw=COSTUME_WORDS[costume()]; if(cw && str>.45 && Math.random()<.35) addWord(pick(cw),x+rand(-30,30),y-30,.45,'#ffe066');
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
  addMove(); say('🐕 Stella',line+'  +1 move','#c9ccd6'); if(STELLA_KEEPS) banner={txt:`Stella’s +1 sticks: every try here gets ${settings.shots+1} moves 🐕`,t:0}; sfx('borf'); buzz([15,30,15]);
  stellaMet=true; o.solid=false; o.walk=stellaAside(o);
  rec.events.push({f:rec.frames.length,k:'stella',x:o.x,y:o.y,line,to:o.walk&&{x:o.walk.x,y:o.walk.y}});
}
// Pick a spot ~36px to the side of Nala's path that's clear of furniture and walls.
function stellaAside(o){
  const sp=Math.hypot(dog.vx,dog.vy)||1, ux=dog.vx/sp, uy=dog.vy/sp, D=36;
  const clear=(x,y)=>objs.every(q=>{ if(q===o||!q.solid||q.ent) return true;
    if(q.t==='r'){ const cx=clamp(x,q.x,q.x+q.w), cy=clamp(y,q.y,q.y+q.h); return Math.hypot(x-cx,y-cy)>=o.r+2; }
    return Math.hypot(x-q.x,y-q.y)>=q.r+o.r+2; });
  const cands=[[-uy,ux],[uy,-ux],[-uy*.7+ux*.7,ux*.7+uy*.7],[uy*.7+ux*.7,-ux*.7+uy*.7],[ux,uy],[-ux,-uy]];
  for(const [dx,dy] of cands) for(const k of [1,.7,.45]){ const x=o.x+dx*D*k, y=o.y+dy*D*k; if(clear(x,y)) return {x,y,fx:o.x,fy:o.y,t:0}; }
  return null;
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
function squeak(o){
  if(o.cd>0) return; o.cd=.5; o.glow=1.2;
  addWord(pick(MAT.squeak.words),o.x,o.y-10,.5,'#ff8fc8'); sfx('squeak',.8); buzz(8);
  pings.push({x:o.x,y:o.y,t:0,life:.9,maxR:90,mem:true});
  rec.events.push({f:rec.frames.length,k:'squeak',x:o.x,y:o.y});
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
      else if(o.sensor && !o.gone && Math.hypot(dog.x-o.x,dog.y-o.y)<o.r+DOG_R){ if(o.sensor==='treat') pickupTreat(o); else squeak(o); }
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
  stats.best=saveBest(L.name,attempt,stats.shots); saveRun(); commitCareer();
  const pg=loadProg(); pg.lap[L.name]=true; saveJSON(PROG_KEY,pg);
  const g=goalCenter(); sfx('win'); buzz([30,40,30]);
  addWord(pick((GOALFX[L.goal.kind]||GOALFX.bed).words),clamp(g.x+40,90,W-90),clamp(g.y+40,HUD+40,H-40),1.3,'#ffd27a');
}

/* ---------- recap ---------- */
// Where to draw a character: during the replay Stella follows the recorded events, not her live position.
function entPos(o){
  if(o.ent!=='stella') return o;
  if(state==='recap'){ const w=rp&&rp.stella; if(!w) return {x:o.hx,y:o.hy}; const k=clamp(w.t/.6,0,1), e=1-Math.pow(1-k,2); return {x:w.fx+(w.x-w.fx)*e,y:w.fy+(w.y-w.fy)*e}; }
  return o;
}
function startRecap(){
  hideCard(); state='recap'; pings=[]; words=[]; parts=[]; toast=null; banner=null;
  const n=rec.frames.length;
  rp={i:0,speed:Math.max(2.5,n/(9*60)),ev:0,bonks:0,knocked:new Set(),gone:new Set(),used:new Set(),att:1,done:0,shown:false,sb:3,bonk:null,diz:0};
}
function updateRecap(dt){
  rp.i+=rp.speed*dt*60; rp.sb=Math.min(3,rp.sb+dt*9); if(rp.stella) rp.stella.t+=dt*rp.speed*.5;
  if(rp.bonk) rp.bonk.t+=dt*Math.min(2,rp.speed*.6); rp.diz=Math.max(0,rp.diz-dt);
  while(rp.ev<rec.events.length && rec.events[rp.ev].f<=rp.i){
    const e=rec.events[rp.ev++];
    if(e.k==='hit'){ rp.bonks++; rp.bonk={nx:e.nx||0,ny:e.ny||-1,str:e.str||.5,t:0}; if((e.str||0)>.85) rp.diz=1; addWord(e.w,e.x,e.y,.5); pings.push({x:e.x,y:e.y,t:0,life:.6,maxR:55}); if(rp.sb>=1){ rp.sb--; sfx(e.snd,.35);} }
    if(e.k==='knock'){ rp.knocked.add(e.id); addWord(e.w,e.x,e.y-10,1,'#ffd27a'); sfx(e.snd,.7); spawnDebris(e.x,e.y,e.cols); }
    if(e.k==='reset'){ rp.gone.clear(); rp.att++; if(!STELLA_KEEPS) rp.stella=null; }
    if(e.k==='treat'){ rp.gone.add(e.id); addWord('+1 TREAT!',e.x,e.y-12,.8,'#ffe066'); sfx('pickup'); }
    if(e.k==='stella'){ if(e.to) rp.stella={x:e.to.x,y:e.to.y,fx:e.x,fy:e.y,t:0}; rp.bonks++; addWord('BORF! +1',e.x,e.y-18,.9,'#e6e9f0'); say('🐕 Stella',e.line,'#c9ccd6'); sfx('borf',.6); }
    if(e.k==='squeak'){ addWord('squeak!',e.x,e.y-10,.5,'#d0559a'); if(rp.sb>=1){ rp.sb--; sfx('squeak',.35);} }
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
  if(state==='credits'){ cr.fast=true; return; }
  if(state==='title'){ const p=toLocal(e); if(Math.abs(p.x-TITLE.x)<60 && p.y>ti.y-80 && p.y<ti.y+55) swapCostume(); return; }
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
wrap.addEventListener('pointerup',()=>{ if(cr) cr.fast=false; release(); });
wrap.addEventListener('pointercancel',()=>{ aim=null; if(cr) cr.fast=false; });
document.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});

/* ---------- UI cards ---------- */
function hideCard(){ ov.classList.add('hidden'); }
function showCard(html,btns,revFooter,theme){
  card.innerHTML=html; card.className='card'+(theme?' '+theme:''); ov.className=theme||'';
  const row=document.createElement('div'); row.className='row';
  (btns||[]).forEach(b=>{ const el=document.createElement('button'); el.textContent=b.t; if(b.primary) el.className='primary'; if(b.id) el.id=b.id; if(b.disabled) el.disabled=true; el.onclick=()=>{ensureAudio(); sfx('ui'); b.fn(el);}; row.appendChild(el); });
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
  const rmx=remix?`<div class="small rmx">🔀 <b>Remix:</b> the clutter has moved since last time (and so has the treat). Ashley’s directions still hold.</div>`:'';
  showCard(`<div class="kicker">Nala's Bonk Golf · Level ${lvlIdx+1}${remix?' · 🔀 Remix':''}</div><h2>${L.emoji} ${L.name}</h2>
    <div class="bubble"><b>Ashley:</b> “${L.intro}”</div>${how}${rmx}
    <div class="small">Memorize it — the lights are off. (📜 up top shows this again.)${best?`<br>🏆 Your best: <b>${best}</b>`:''}</div>`,
    [{t:'☰ Levels',fn:()=>showLevels(()=>showIntro(fresh))},{t:'🔊 Read it to me',fn:speak},{t:fresh?'Let’s go!':'Back to it',primary:true,fn:()=>{ hideCard(); if(state==='intro') state='aim'; }}],true);
}

/* ---------- title screen ---------- */
// The title scene (drawn in render.js): a neon sign, and Nala walking up and bonking it every TITLE.T seconds.
const TITLE={x:200,rest:322,hit:262,S:2.3,T:2.8,signY:84,signH:118};
const IOS=/iPad|iPhone|iPod/.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const soundLabel=()=>settings.sound?'🔊 Sound on':'🔇 Sound off';
function goTitle(){
  commitCareer(); try{ speechSynthesis.cancel(); }catch(e){}
  if(!L) loadLevel(0,true);
  state='title'; ti={t:0,y:TITLE.rest,sp:0,bonk:null,diz:0,cyc:-1,hitAt:-9}; words=[]; pings=[]; parts=[]; toast=null; banner=null;
  showTitle();
}
function showTitle(){
  const n=nextToPlay(), any=LEVELS.some((_,i)=>cleared(i)), pg=loadProg(), done=LEVELS.filter((_,i)=>cleared(i)).length;
  const line=pg.beat>0?`<span class="rmx">🔀 <b>Round ${pg.beat+1}</b> (remixed) · ${done}/${LEVELS.length}</span> · next: <b>${LEVELS[n].emoji} ${LEVELS[n].name}</b>`
    :any?`Up next: <b>${LEVELS[n].emoji} ${n+1}. ${LEVELS[n].name}</b>`:'A blind shar-pei. A dark house. A lot of bonks.';
  showCard(`<div class="ded">For <b>Ashley &amp; Corbin</b><br><span>(and Nala, Stella &amp; Binx)</span></div>
    <div class="small center">${line}</div>
    <div class="small center cos" id="cosLine">${cosLine()}</div>`,
    [{t:'☰ Levels',fn:()=>showLevels(showTitle)},{t:'▶ Play',primary:true,id:'bPlay',fn:()=>loadLevel(nextToPlay())},
     {t:soundLabel(),id:'bSnd',fn:el=>{ settings.sound=!settings.sound; saveSettings(); el.textContent=soundLabel(); if(settings.sound) sfx('paw+'); }}],true,'front');
  if(IOS){ const r=document.createElement('div'); r.className='small center note'; r.textContent='iPhone: the silent switch mutes game sound. Flip it off to hear the bonks.'; card.insertBefore(r,card.querySelector('.rev')); }
}
function cosLine(){ const c=COSTUMES.find(c=>c.id===costume()), lk=COSTUMES.length-costumesOpen().length;
  return `🎭 Wearing <b>${c.name}</b> · tap Nala to swap${lk?` <span>(${lk} locked)</span>`:''}`; }
function swapCostume(){
  const c=nextCostume(); ti.swapAt=t; const el=document.getElementById('cosLine'); if(el) el.innerHTML=cosLine();
  pings.push({x:TITLE.x,y:ti.y-12,t:0,life:.9,maxR:110});
  addWord(c.name.toUpperCase()+'!',TITLE.x,ti.y-92,.9,'#ffe066'); sfx('pickup'); buzz(15);
}
function updateTitle(dt){
  ti.t+=dt; const T=TITLE.T, p=(ti.t%T)/T, cyc=Math.floor(ti.t/T), hitP=.32;
  if(p<hitP){ const k=p/hitP; ti.y=TITLE.rest+(TITLE.hit-TITLE.rest)*k*k; ti.sp=80+260*k; }
  else {
    if(ti.cyc!==cyc){ ti.cyc=cyc; ti.hitAt=t; ti.bonk={nx:0,ny:1,str:.8,t:0}; ti.diz=1.3;
      addWord(pick(['BONK!','BONK!','bonk','oof','THUNK']),TITLE.x+rand(-60,60),TITLE.hit-50,1,cyc%3===2?'#ffe066':null);
      pings.push({x:TITLE.x,y:TITLE.signY+TITLE.signH,t:0,life:1.1,maxR:190}); }
    const k=clamp((p-hitP)/.22,0,1); ti.y=TITLE.hit+(TITLE.rest-TITLE.hit)*(1-Math.pow(1-k,3)); ti.sp=0;
  }
  if(ti.bonk){ ti.bonk.t+=dt; if(ti.bonk.t>1.2) ti.bonk=null; } ti.diz=Math.max(0,ti.diz-dt);
}

/* ---------- level select ---------- */
function showLevels(back){
  const best=loadBest();
  const pg=loadProg();
  const rows=LEVELS.map((l,i)=>{ const ok=unlocked(i), b=best[l.name], done=cleared(i);
    return `<button class="lvl${done?' done':''}" data-i="${i}" ${ok?'':'disabled'}><span class="em">${ok?l.emoji:'🔒'}</span>
      <span class="tx"><span class="nm">${i+1}. ${l.name}</span><span class="bs">${b?`🏆 ${bestText(l.name)}${pg.beat&&!done?' · not cleared this round':''}`:ok?'Not cleared yet':`Clear ${LEVELS[i-1].name} to unlock`}</span></span>${done?'<span class="ck">✓</span>':''}</button>`; }).join('');
  const lap=pg.beat?`<div class="small rmx">🔀 Round ${pg.beat+1} (remixed). Clear all ${LEVELS.length} in any order to beat it again.</div>`:'';
  showCard(`<div class="kicker">Nala's Bonk Golf</div><h2>☰ Levels</h2>${lap}<div class="lvls">${rows}</div>
    <div class="set"><label><span>Unlock all levels<small>Skip ahead. Your best scores stay.</small></span><input type="checkbox" id="chkUnlock" ${settings.unlockAll?'checked':''}></label></div>`,
    [{t:'Back',fn:back||showTitle}]);
  card.querySelectorAll('.lvl').forEach(el=>el.onclick=()=>{ ensureAudio(); sfx('ui'); loadLevel(+el.dataset.i); });
  card.querySelector('#chkUnlock').onchange=e=>{ settings.unlockAll=e.target.checked; saveSettings(); showLevels(back); };
}

/* ---------- ending: credits roll after the last level ---------- */
// Blocks are laid out top to bottom (h = height in world px); render.js draws each kind.
const pl=(n,one,many)=>`${n} ${n===1?one:(many||one+'s')}`;
function creditBlocks(T){
  const top=T.top?`${T.top[0]} ×${T.top[1]}`:'nothing?!';
  return [
    {k:'sign',h:170},
    {k:'head',txt:'STARRING',h:46},
    {k:'cast',who:'nala',name:'NALA',role:costume()==='herself'?'as herself':`as herself, and as ${COSTUMES.find(c=>c.id===costume()).name}`,h:140},
    {k:'cast',who:'stella',name:'STELLA',role:'big sister · hype dog · +1 move',h:140},
    {k:'cast',who:'binx',name:'BINX',role:'as Binx. −1 move. Regrets nothing.',h:140},
    {k:'role',name:'ASHLEY',role:'the voice of directions',h:64},
    {k:'role',name:'CORBIN',role:'executive producer of belly rubs',h:64},
    {k:'role',name:'THE FURNITURE',role:`bonked ${T.bonks} times. brave, every one of them.`,h:78},
    {k:'head',txt:'THIS RUN',h:46},
    {k:'big',n:T.bonks,txt:'total bonks',h:84},
    {k:'stats',lines:[`${pl(T.tries,'try','tries')} · ${pl(T.shots,'shot')} · ${T.levels}/${LEVELS.length} levels`,`${pl(T.knocked,'thing')} knocked over · most bonked: ${top}`,`🍪 ${pl(T.treats,'treat')} · 🐕 ${pl(T.stella,'pep talk')} · 🐈‍⬛ ${pl(T.binx,'smack')}`],h:96},
    {k:'small',lines:[`Lifetime bonks on this phone: ${T.career}`],h:56},
    {k:'small',lines:['No dogs were harmed in the making of this game.','Several lamps were.'],h:86},
    {k:'small',lines:['Made with love for Ashley & Corbin','(and Nala, Stella & Binx)'],h:110},
    {k:'sleep',txt:'Good night, Nala.',h:150},
  ];
}
function startCredits(finish){
  hideCard(); commitCareer(); try{ speechSynthesis.cancel(); }catch(e){}
  const T=runTotals(), blocks=creditBlocks(T); let y=0; for(const b of blocks){ b.y=y; y+=b.h; }
  const last=blocks[blocks.length-1];
  // a full lap of all five levels counts as beating the game: that's what unlocks costumes + remixes
  let beat=null, unlock=null;
  if(finish===true && lapDone()){ const pg=loadProg(); pg.beat++; pg.lap={}; saveJSON(PROG_KEY,pg); beat=pg.beat; unlock=COSTUMES.find(c=>c.need===pg.beat)||null; }
  state='credits'; words=[]; pings=[]; parts=[]; toast=null; banner=null;
  cr={y:H-200,fast:false,blocks,T,end:H+last.y+last.h/2-250,shown:false,beat,unlock};
  sfx('win');
}
function updateCredits(dt){
  cr.y=Math.min(cr.end,cr.y+dt*(cr.fast?300:44));
  if(cr.y>=cr.end && !cr.shown){ cr.shown=true; showEnd(); }
}
function endTitle(b){ return b<=40?'Certified Sniffer':b<=90?'Professional Bonker':b<=160?'Pinball Wizard':'Majestic Chaos Potato'; }
function showEnd(){
  const T=cr.T, u=cr.unlock;
  if(u && !cr.equipped){ cr.equipped=true; settings.costume=u.id; saveSettings(); }   // she puts it on right away
  const more=COSTUMES.filter(c=>c.need>(cr.beat||0)).length;
  const news=cr.beat?`<div class="unlock">${u?`${u.em} New costume: <b>${u.name}</b><small>She’s wearing it now. Tap Nala on the title screen to swap costumes.</small>`:`🏆 Beaten ${cr.beat} times!<small>${more?'':'Every costume unlocked. '}Tap Nala on the title screen to swap costumes.</small>`}
    <div class="sub">🔀 Next round the houses get remixed: the clutter and the treats move.${more?` ${more} more costume${more>1?'s':''} to find.`:''}</div></div>`:'';
  showCard(`<div class="kicker">The end${cr.beat>1?` · round ${cr.beat}`:''}</div><h2>🌙 Good night, Nala</h2>
    <div class="endn"><b>${T.bonks}</b><span>total bonks · “${endTitle(T.bonks)}”</span></div>${news}`,
    [{t:'↺ Watch again',fn:startCredits},{t:'☰ Levels',fn:()=>showLevels(showEnd)},{t:'Title',primary:true,fn:goTitle}],false,'front');
}
const FAILS=['Nala has decided this is her spot now.','Nala sits. Nala refuses. Nala is a shar-pei.','Nala flops down dramatically. Back to the door.','Nala is “resting her eyes.” Try again.','Nala has filed a formal complaint about the furniture.'];
function showFail(){
  if(state!=='fail') return;
  const nextMoves=settings.shots+(STELLA_KEEPS&&stellaMet?1:0)+learnBonus(attempt+1);
  showCard(`<div class="kicker">Attempt ${attempt}</div><h2>🐾 Out of sniffs!</h2>
    <div class="bubble">${pick(FAILS)}</div>
    <div class="small">Total bonks so far: <b>${stats.bonks}</b>. The house remembers anything she knocked over. Treats, Stella and Binx reset each try.${settings.shots<99?`<br>Next try: <b>${nextMoves} moves</b>${learnBonus(attempt+1)>learnBonus(attempt)?' (Nala’s learning the house 🧠)':''}`:''}</div>`,
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
  const last=lapDone()||lvlIdx>=LEVELS.length-1, nb=stats.best||{};
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
    [{t:'Replay',fn:startRecap},{t:'Retry',fn:()=>loadLevel(lvlIdx)},{t:'☰',fn:()=>showLevels(showResults)},
     {t:last?'The end →':'Next level →',primary:true,fn:()=>last?startCredits(true):loadLevel(nextAfter(lvlIdx))}],false,'paper');
}
function showSettings(){
  const chk=(k,label,sub)=>`<label><span>${label}<small>${sub}</small></span><input type="checkbox" data-k="${k}" ${settings[k]?'checked':''}></label>`;
  showCard(`<div class="kicker">Workshop knobs</div><h2>⚙️ Tune the fun</h2><div class="set">
    ${chk('scent','Scent hint','Goal gives off a faint pulse that gets stronger as she gets close')}
    ${DEBUG?chk('ghost','Ghost memory (debug)','Things you’ve bonked stay faintly outlined'):''}
    ${chk('lights','Lights on (cheat)','See the whole map — for level design')}
    ${chk('sound','Sound',IOS?'iPhone: the silent switch mutes this too':'Remembered on this device')}
    <label><span>Volume</span><input type="range" id="rngVol" min="0" max="1" step="0.05" value="${settings.vol}"></label>
    ${chk('unlockAll','Unlock all levels','Skip ahead without clearing them')}
    <label><span>Moves per try<small>Applies next attempt</small></span><select id="selShots">
      ${[3,4,5,99].map(n=>`<option value="${n}" ${settings.shots===n?'selected':''}>${n===99?'Unlimited':n}</option>`).join('')}</select></label>
    <label><span>Progress<small>Best scores, unlocks, costumes and bonk totals on this device</small></span><button id="bClr" type="button">Reset</button></label>
    </div>`,[{t:'Title screen',fn:goTitle},{t:'☰ Levels',fn:()=>showLevels(showSettings)},{t:'Done',primary:true,fn:()=>{ hideCard(); if(state==='intro') showIntro(true);} }],true);
  card.querySelectorAll('input[type=checkbox]').forEach(el=>el.onchange=()=>{ settings[el.dataset.k]=el.checked; saveSettings(); if(el.dataset.k==='sound'&&el.checked) sfx('paw+'); });
  card.querySelector('#rngVol').oninput=e=>{ settings.vol=+e.target.value; setVolume(); };
  card.querySelector('#rngVol').onchange=()=>{ saveSettings(); sfx('bonk',.8); };
  card.querySelector('#selShots').onchange=e=>{settings.shots=+e.target.value; saveSettings();};
  card.querySelector('#bClr').onclick=e=>{ if(e.target.dataset.sure){ clearBest(); try{ localStorage.removeItem(RUN_KEY); localStorage.removeItem(CAREER_KEY); localStorage.setItem(PROG_KEY,JSON.stringify({beat:0,lap:{}})); }catch(_){} settings.costume='sniffer'; saveSettings(); e.target.textContent='Done'; e.target.disabled=true; }
    else { e.target.dataset.sure=1; e.target.textContent='Sure? Tap again'; } };
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
  for(const o of objs){ o.glow=Math.max(0,o.glow-dt*.9); o.cd-=dt;
    if(o.walk && o.walk.t<1){ const w=o.walk; w.t=Math.min(1,w.t+dt/.6); const e=1-Math.pow(1-w.t,2); o.x=w.fx+(w.x-w.fx)*e; o.y=w.fy+(w.y-w.fy)*e; } }
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
  else if(state==='title') updateTitle(dt);
  else if(state==='credits') updateCredits(dt);
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
  get cr(){return cr}, get settings(){return settings}, get stellaMet(){return stellaMet}, goTitle, showLevels, startCredits, unlocked, loadProg, costume, swapCostume, COSTUMES, get remix(){return remix}, get attempt(){return attempt},
  place(x,y){ dog.x=x; dog.y=y; }, setMoves(n){ shotsLeft=n; }, forceWin(){ if(state==='aim'||state==='moving') win(); } };
addEventListener('DOMContentLoaded',()=>{ goTitle(); requestAnimationFrame(frame); });
