"use strict";
/* Loop, physics, input, states, UI cards. */
const TAU=Math.PI*2, W=400, H=700, HUD=56, DOG_R=13, MAXSPEED=880, MAXDRAG=150, FRICTION=1.05, DECEL=55;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];

const cv=document.getElementById('c'), ctx=cv.getContext('2d');
const hudEl=document.getElementById('hud'), ov=document.getElementById('ov'), card=document.getElementById('card');
let scale=1,dpr=1;
const mem=document.createElement('canvas'); mem.width=W*2; mem.height=H*2;
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

/* ---------- state ---------- */
const settings={scent:true, ghost:false, lights:false, shots:3, sound:true};
let L, lvlIdx=0, objs=[], dog, shotsLeft, attempt, state='intro', pings=[], words=[], parts=[], prints=[], rec, stats, aim=null, t=0, winT=0, banner=null, rp=null, printAcc=0;

function loadLevel(i){
  lvlIdx=i; L=LEVELS[i];
  objs=L.objs().map((o,id)=>Object.assign(o,{id,solid:true,down:false,glow:0,cd:0}));
  resetDog(); shotsLeft=settings.shots; attempt=1;
  pings=[];words=[];parts=[];prints=[];banner=null;
  mctx.clearRect(0,0,W,H);
  rec={frames:[],events:[]};
  stats={shots:0,bonks:0,knocked:[],by:{}};
  state='intro'; showIntro(true);
}
function resetDog(){ dog={x:L.start.x,y:L.start.y,vx:0,vy:0,a:-Math.PI/2,squash:0,dizzy:0}; }
function newAttempt(){
  resetDog(); shotsLeft=settings.shots; attempt++; aim=null;
  rec.frames.push({reset:true,attempt});
  state='aim'; hideCard();
}

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
    if(o.mat==='cat'){ dog.vx+=nx*120; dog.vy+=ny*120; }
    const sp=Math.hypot(dog.vx,dog.vy), cap=MAXSPEED*1.15;
    if(sp>cap){ dog.vx*=cap/sp; dog.vy*=cap/sp; }
    onHit(o,-vn,cx,cy);
  }
}
function addWord(txt,x,y,size=.5,col){ words.push({txt,x,y,t:0,life:1.1,size,rot:rand(-.25,.25),col}); }
function onHit(o,imp,x,y){
  o.glow=1;
  if(imp<25) return;
  const str=clamp(imp/550,.3,1);
  pings.push({x,y,t:0,life:.9+.5*str,maxR:50+170*str,mem:true});
  if(o.cd<=0){
    o.cd=.18; stats.bonks++; stats.by[o.name]=(stats.by[o.name]||0)+1;
    const m=MAT[o.mat], w=pick(m.words);
    addWord(w,x,y,str); sfx(m.snd,str); sfx('ping',str);
    rec.events.push({f:rec.frames.length,k:'hit',x,y,w,snd:m.snd});
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
function spawnDebris(x,y,cols){ for(let i=0;i<16;i++){ const a=rand(0,TAU), s=rand(60,240); parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.6,1.3),c:pick(cols),s:rand(2,4)}); } }
function center(o){ return o.t==='r'?{x:o.x+o.w/2,y:o.y+o.h/2}:{x:o.x,y:o.y}; }
function goalCenter(){ const g=L.goal; return g.t==='r'?{x:g.x+g.w/2,y:g.y+g.h/2}:{x:g.x,y:g.y}; }
function checkGoal(){
  const g=L.goal;
  if(g.t==='r'){ const cx=clamp(dog.x,g.x,g.x+g.w), cy=clamp(dog.y,g.y,g.y+g.h); return Math.hypot(dog.x-cx,dog.y-cy)<DOG_R; }
  return Math.hypot(dog.x-g.x,dog.y-g.y)<g.r+DOG_R*.5;
}
function physics(dt){
  const sp=Math.hypot(dog.vx,dog.vy);
  const steps=Math.min(30,Math.max(1,Math.ceil(sp*dt/3))), h=dt/steps;
  const ox=dog.x, oy=dog.y;
  for(let s=0;s<steps;s++){
    dog.x+=dog.vx*h; dog.y+=dog.vy*h;
    for(const o of objs) if(o.solid) collide(o);
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
function stopped(){
  if(shotsLeft<=0){
    state='fail'; sfx('fail'); dog.squash=.6;
    setTimeout(showFail,700);
  } else { state='aim'; if(Math.random()<.35){ addWord(pick(['hmph.','*sniff sniff*','...where am I','hm?']),dog.x,dog.y-20,.2,'#bbb'); sfx('hmph'); } }
}
function win(){
  state='winning'; winT=0; dog.vx=dog.vy=0; dog.from={x:dog.x,y:dog.y};
  const g=goalCenter(); sfx('win'); buzz([30,40,30]);
  addWord(pick(['GOOD GIRL!','SHE DID IT!','WHAT A GIRL!']),g.x+40,g.y+40,1.3,'#ffd27a');
}

/* ---------- recap ---------- */
function startRecap(){
  hideCard(); state='recap'; pings=[]; words=[]; parts=[];
  const n=rec.frames.length;
  rp={i:0,speed:Math.max(2.5,n/(9*60)),ev:0,bonks:0,knocked:new Set(),done:0,shown:false,sb:3};
}
function updateRecap(dt){
  rp.i+=rp.speed*dt*60; rp.sb=Math.min(3,rp.sb+dt*9);
  while(rp.ev<rec.events.length && rec.events[rp.ev].f<=rp.i){
    const e=rec.events[rp.ev++];
    if(e.k==='hit'){ rp.bonks++; addWord(e.w,e.x,e.y,.5); pings.push({x:e.x,y:e.y,t:0,life:.6,maxR:55}); if(rp.sb>=1){ rp.sb--; sfx(e.snd,.35);} }
    if(e.k==='knock'){ rp.knocked.add(e.id); addWord(e.w,e.x,e.y-10,1,'#ffd27a'); sfx(e.snd,.7); spawnDebris(e.x,e.y,e.cols); }
  }
  if(rp.i>=rec.frames.length){ rp.done+=dt; if(rp.done>1.2 && !rp.shown){ rp.shown=true; showResults(); } }
}

/* ---------- input ---------- */
function toLocal(e){ const r=cv.getBoundingClientRect(); return {x:(e.clientX-r.left)/scale,y:(e.clientY-r.top)/scale}; }
cv.addEventListener('pointerdown',e=>{
  ensureAudio();
  if(state==='recap'){ rp.i=rec.frames.length; rp.ev=rec.events.length; rp.done=1.2; return; }
  if(state!=='aim') return;
  const p=toLocal(e); if(p.y<HUD) return;
  cv.setPointerCapture(e.pointerId);
  aim={sx:p.x,sy:p.y,cx:p.x,cy:p.y,pow:0,dx:0,dy:0};
});
cv.addEventListener('pointermove',e=>{
  if(!aim) return; const p=toLocal(e);
  aim.cx=p.x; aim.cy=p.y;
  const dx=aim.sx-p.x, dy=aim.sy-p.y, d=Math.hypot(dx,dy);
  aim.pow=clamp(d/MAXDRAG,0,1); if(d>0){aim.dx=dx/d; aim.dy=dy/d;}
});
function release(){
  if(!aim) return; const a=aim; aim=null;
  if(state!=='aim' || a.pow<.06) return;
  dog.vx=a.dx*a.pow*MAXSPEED; dog.vy=a.dy*a.pow*MAXSPEED; dog.a=Math.atan2(a.dy,a.dx);
  shotsLeft--; stats.shots++; state='moving'; sfx('whoosh',a.pow);
}
cv.addEventListener('pointerup',release);
cv.addEventListener('pointercancel',()=>{aim=null});
document.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});

/* ---------- UI cards ---------- */
function hideCard(){ ov.classList.add('hidden'); }
function showCard(html,btns,revFooter){
  card.innerHTML=html;
  const row=document.createElement('div'); row.className='row';
  (btns||[]).forEach(b=>{ const el=document.createElement('button'); el.textContent=b.t; if(b.primary) el.className='primary'; if(b.disabled) el.disabled=true; el.onclick=()=>{ensureAudio(); b.fn();}; row.appendChild(el); });
  card.appendChild(row);
  if(revFooter){ const r=document.createElement('div'); r.className='rev'; r.textContent='rev '+REV; card.appendChild(r); }
  ov.classList.remove('hidden');
}
function speak(){
  try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(L.intro); u.rate=1; u.pitch=1.1; speechSynthesis.speak(u);}catch(e){}
}
function showIntro(fresh){
  const how=(fresh&&lvlIdx===0)?`<div class="how">🐾 <b>Drag back anywhere</b> and let go to fling Nala (like a slingshot).<br>🌑 The house is dark. Bonking into stuff lights it up for a sec — use the directions + your bonks to find the way.<br>🎯 ${settings.shots>=99?'Unlimited':settings.shots} shots per try, then she gets stubborn and you start over.</div>`:'';
  showCard(`<div class="kicker">Nala's Bonk Golf · Level ${lvlIdx+1}</div><h2>${L.emoji} ${L.name}</h2>
    <div class="bubble"><b>Ashley:</b> “${L.intro}”</div>${how}
    <div class="small">Memorize it — the lights are off. (📜 up top shows this again.)</div>`,
    [{t:'🔊 Read it to me',fn:speak},{t:fresh?'Let’s go!':'Back to it',primary:true,fn:()=>{ hideCard(); if(state==='intro') state='aim'; }}],true);
}
const FAILS=['Nala has decided this is her spot now.','Nala sits. Nala refuses. Nala is a shar-pei.','Nala flops down dramatically. Back to the door.','Nala is “resting her eyes.” Try again.','Nala has filed a formal complaint about the furniture.'];
function showFail(){
  if(state!=='fail') return;
  showCard(`<div class="kicker">Attempt ${attempt}</div><h2>🐾 Out of sniffs!</h2>
    <div class="bubble">${pick(FAILS)}</div>
    <div class="small">Total bonks so far: <b>${stats.bonks}</b>. The house remembers anything she knocked over.</div>`,
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
  const last=lvlIdx>=LEVELS.length-1;
  showCard(`<div class="kicker">Level ${lvlIdx+1} complete</div><h2>Good girl, Nala! ${L.emoji}</h2>
    <div class="title">“${rating()}”</div>
    <ul class="stats">
      <li><b>${attempt}</b> attempt${attempt>1?'s':''} · <b>${stats.shots}</b> shot${stats.shots!==1?'s':''}</li>
      <li><b>${stats.bonks}</b> bonks</li>
      ${top?`<li>Most bonked: <b>the ${top[0]}</b> ×${top[1]}</li>`:''}
      <li>Casualties: <b>${stats.knocked.length?stats.knocked.join(', '):'none! suspicious.'}</b></li>
    </ul>`,
    [{t:'📼 Replay',fn:startRecap},{t:'↻ Retry',fn:()=>loadLevel(lvlIdx)},
     {t:last?'Back to level 1':'Next level →',primary:true,fn:()=>loadLevel(last?0:lvlIdx+1)}]);
}
function showSettings(){
  const chk=(k,label,sub)=>`<label><span>${label}<small>${sub}</small></span><input type="checkbox" data-k="${k}" ${settings[k]?'checked':''}></label>`;
  showCard(`<div class="kicker">Workshop knobs</div><h2>⚙️ Tune the fun</h2><div class="set">
    ${chk('scent','Scent hint','Goal gives off a faint pulse that gets stronger as she gets close')}
    ${chk('ghost','Ghost memory','Things you’ve bonked stay faintly outlined (training wheels)')}
    ${chk('lights','Lights on (cheat)','See the whole map — for level design')}
    ${chk('sound','Sound','')}
    <label><span>Shots per try<small>Applies next attempt</small></span><select id="selShots">
      ${[3,4,5,99].map(n=>`<option value="${n}" ${settings.shots===n?'selected':''}>${n===99?'Unlimited':n}</option>`).join('')}</select></label>
    <label><span>Jump to level</span><select id="selLvl">${LEVELS.map((l,i)=>`<option value="${i}" ${i===lvlIdx?'selected':''}>${i+1}. ${l.name}</option>`).join('')}</select></label>
    </div>`,[{t:'Done',primary:true,fn:()=>{ hideCard(); if(state==='intro') showIntro(true);} }]);
  card.querySelectorAll('input[type=checkbox]').forEach(el=>el.onchange=()=>{settings[el.dataset.k]=el.checked;});
  card.querySelector('#selShots').onchange=e=>{settings.shots=+e.target.value;};
  card.querySelector('#selLvl').onchange=e=>{loadLevel(+e.target.value);};
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
  dog.squash=Math.max(0,dog.squash-dt*4); dog.dizzy=Math.max(0,dog.dizzy-dt);
  if(banner){ banner.t+=dt; if(banner.t>2.8) banner=null; }
  if(state==='moving') physics(dt);
  else if(state==='winning'){
    winT+=dt; const g=goalCenter(), k=clamp(winT/.5,0,1), e=1-Math.pow(1-k,3);
    dog.x=dog.from.x+(g.x-dog.from.x)*e; dog.y=dog.from.y+(g.y-dog.from.y)*e;
    if(winT>2.2) startRecap();
  } else if(state==='recap') updateRecap(dt);
}
function commitMem(p){
  if(!settings.ghost) return;
  mctx.save(); mctx.beginPath(); mctx.arc(p.x,p.y,p.maxR,0,TAU); mctx.clip();
  mctx.strokeStyle='rgba(170,40,40,.55)'; mctx.lineWidth=1.5;
  for(const o of objs) if(o.solid){ shapePath(mctx,o); mctx.stroke(); }
  mctx.restore(); p.mem=false;
}

let last=performance.now();
function frame(now){ const dt=Math.min(.033,(now-last)/1000); last=now; t+=dt; if(L) update(dt); render(); requestAnimationFrame(frame); }
addEventListener('DOMContentLoaded',()=>{ loadLevel(0); requestAnimationFrame(frame); });
