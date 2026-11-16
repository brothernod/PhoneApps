"use strict";
/* All drawing. Reads game state; never changes it. */
/* ---------- render ---------- */
function shapePath(c,o){ c.beginPath(); if(o.t==='r') c.rect(o.x,o.y,o.w,o.h); else c.arc(o.x,o.y,o.r,0,TAU); }
function drawGoal(alpha){
  const g=L.goal; ctx.save(); ctx.globalAlpha=alpha;
  if(g.kind==='bed'){
    ctx.fillStyle='#3f5f94'; roundRect(g.x,g.y,g.w,g.h,10); ctx.fill();
    ctx.fillStyle='#e9e4da'; roundRect(g.x+8,g.y+8,g.w-16,18,6); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold 11px system-ui'; ctx.textAlign='center'; ctx.fillText("NALA'S BED",g.x+g.w/2,g.y+g.h-12);
  } else {
    ctx.translate(g.x,g.y); ctx.fillStyle='#f3e2c0';
    ctx.fillRect(-9,-3,18,6); for(const [x,y] of [[-9,-3],[-9,3],[9,-3],[9,3]]){ ctx.beginPath(); ctx.arc(x,y,4,0,TAU); ctx.fill(); }
  }
  ctx.restore();
}
// Placeholder art for characters/pickups (Phase 2 replaces these).
const ENT_LOOK={ stella:{fill:'#8f949e',rim:'#d7dbe4',tag:'S'}, binx:{fill:'#111116',rim:'#b44dff',tag:'B'}, treat:{fill:'#d9a35f',rim:'#ffe066',tag:''} };
function drawEnt(o,alpha){
  const k=ENT_LOOK[o.ent]; ctx.save(); ctx.globalAlpha=alpha;
  ctx.fillStyle=k.fill; ctx.strokeStyle=k.rim; ctx.lineWidth=2; shapePath(ctx,o); ctx.fill(); ctx.stroke();
  if(o.ent==='binx'){ ctx.fillStyle='#ffe066'; ell(o.x-4,o.y-2,2,2.4); ell(o.x+4,o.y-2,2,2.4); }
  else if(o.ent==='treat'){ ctx.strokeStyle='rgba(90,50,20,.8)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(o.x-3,o.y-3); ctx.lineTo(o.x+3,o.y+3); ctx.moveTo(o.x+3,o.y-3); ctx.lineTo(o.x-3,o.y+3); ctx.stroke(); }
  else { ctx.fillStyle='#1d1f24'; ctx.font='bold 13px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(k.tag,o.x,o.y+1); ctx.textBaseline='alphabetic'; }
  if(o.used && o.ent!=='treat' && state!=='recap'){ ctx.globalAlpha=alpha*.8; ctx.fillStyle='#fff'; ctx.font='10px system-ui'; ctx.textAlign='center'; ctx.fillText('✓',o.x+o.r,o.y-o.r); }
  ctx.restore();
}
// Binx's eyes blink in the dark now and then — a hint that something is watching.
function drawBinxEyes(){
  for(const o of objs){ if(o.ent!=='binx') continue; const ph=(t+o.id*.7)%4.6; if(ph>.55) continue;
    const a=Math.sin(ph/.55*Math.PI)*.75; ctx.fillStyle=`rgba(255,224,102,${a})`; ell(o.x-4,o.y-2,1.8,1.3); ell(o.x+4,o.y-2,1.8,1.3); }
}
function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function drawLit(alpha,isDown){
  ctx.save(); ctx.globalAlpha=alpha;
  ctx.fillStyle='#1f1a15'; ctx.fillRect(20,70,360,610);
  for(const d of L.decor){ ctx.fillStyle='rgba(140,100,60,.25)'; ctx.fillRect(d.x,d.y,d.w,d.h); ctx.strokeStyle='rgba(200,160,110,.4)'; ctx.setLineDash([4,3]); ctx.strokeRect(d.x,d.y,d.w,d.h); ctx.setLineDash([]); }
  drawGoal(alpha);
  ctx.globalAlpha=alpha;
  for(const o of objs){
    if(isDown(o)) continue;
    if(o.ent){ drawEnt(o,alpha); continue; }
    ctx.fillStyle=MAT[o.mat].col; shapePath(ctx,o); ctx.fill();
    if(o.knock){ ctx.strokeStyle='#ffd27a'; ctx.lineWidth=1.5; ctx.stroke(); }
  }
  ctx.fillStyle='#e8ddd2'; ctx.font='10px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
  const seen=new Set();
  for(const o of objs){ if(isDown(o)||o.name==='wall'||(o.name==='table leg'&&seen.has('leg'))) continue; if(o.name==='table leg') seen.add('leg');
    const c=center(o); const label=o.name==='table leg'?'':o.name;
    if(o.t==='r'&&o.h>o.w*1.6){ ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(-Math.PI/2); ctx.fillText(label,0,0); ctx.restore(); }
    else ctx.fillText(label,c.x,o.t==='c'?c.y+o.r+8:c.y);
  }
  ctx.restore(); ctx.textBaseline='alphabetic';
}
function drawFallen(isDown,alpha){
  for(const o of objs){ if(!isDown(o)||!o.debris) continue; const c=center(o);
    ctx.globalAlpha=alpha; for(const d of o.debris){ ctx.fillStyle=d.c; ctx.fillRect(c.x+d.dx,c.y+d.dy,d.s,d.s); } }
  ctx.globalAlpha=1;
}
function drawScent(){
  const g=goalCenter(), dd=Math.hypot(dog.x-g.x,dog.y-g.y), near=clamp(1-dd/350,0,1);
  for(let i=0;i<3;i++){ const ph=(t*.55+i/3)%1, r=6+ph*42, a=(1-ph)*(.07+.3*near);
    ctx.strokeStyle=`rgba(255,200,90,${a})`; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(g.x,g.y,r,0,TAU); ctx.stroke(); }
}
function drawPings(ringsOnly){
  for(const p of pings){
    const k=p.t/p.life, r=p.maxR*(1-Math.pow(1-k,3)), a=1-k;
    if(!ringsOnly){
      ctx.save(); ctx.beginPath(); ctx.arc(p.x,p.y,r,0,TAU); ctx.clip();
      const gr=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r); gr.addColorStop(0,`rgba(255,30,30,${a*.10})`); gr.addColorStop(1,`rgba(255,30,30,${a*.02})`);
      ctx.fillStyle=gr; ctx.fillRect(p.x-r,p.y-r,r*2,r*2);
      ctx.strokeStyle=`rgba(255,50,50,${a})`; ctx.lineWidth=2; ctx.fillStyle=`rgba(255,30,30,${a*.14})`;
      for(const o of objs) if(o.solid&&!o.ent){ shapePath(ctx,o); ctx.fill(); ctx.stroke(); }
      for(const o of objs) if(o.ent&&!o.gone) drawEnt(o,a);
      ctx.restore();
    }
    ctx.strokeStyle=`rgba(255,70,70,${a*.55})`; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,TAU); ctx.stroke();
    ctx.strokeStyle=`rgba(255,70,70,${a*.22})`; ctx.beginPath(); ctx.arc(p.x,p.y,r*.68,0,TAU); ctx.stroke();
  }
}
function drawGlows(){
  for(const o of objs){ if(o.glow<=0||!o.solid) continue; const a=Math.min(1,o.glow);
    ctx.save(); ctx.shadowColor='#ff2a2a'; ctx.shadowBlur=16*a; ctx.strokeStyle=`rgba(255,80,80,${a})`; ctx.lineWidth=2.5; shapePath(ctx,o); ctx.stroke(); ctx.restore();
    if(a>.25 && o.name!=='wall'){ const c=center(o); ctx.fillStyle=`rgba(255,170,160,${a})`; ctx.font='bold 11px system-ui'; ctx.textAlign='center'; ctx.fillText(o.name,c.x,o.t==='c'?c.y-o.r-6:c.y+4); }
  }
}
function drawPrints(){ for(const p of prints){ ctx.fillStyle=`rgba(201,139,79,${(1-p.age/3)*.28})`; ctx.beginPath(); ctx.ellipse(p.x,p.y,2.6,2,p.a,0,TAU); ctx.fill(); } }
function drawParts(){ for(const p of parts){ ctx.globalAlpha=clamp(p.life,0,1); ctx.fillStyle=p.c; ctx.fillRect(p.x,p.y,p.s,p.s); } ctx.globalAlpha=1; }
function ell(x,y,rx,ry){ ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,TAU); ctx.fill(); }
function drawDog(x,y,a,sq,diz){
  const gl=ctx.createRadialGradient(x,y,4,x,y,46); gl.addColorStop(0,'rgba(255,220,180,.10)'); gl.addColorStop(1,'rgba(255,220,180,0)');
  ctx.fillStyle=gl; ctx.fillRect(x-46,y-46,92,92);
  ctx.save(); ctx.translate(x,y); ctx.rotate(a); ctx.scale(1-.28*sq,1+.22*sq);
  ctx.fillStyle='#a8703c'; for(const [lx,ly] of [[8,11],[8,-11],[-9,11],[-9,-11]]) ell(lx,ly,4,3);
  ctx.strokeStyle='#8a5a30'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(-18,0,4,.4,TAU-.4); ctx.stroke();
  ctx.fillStyle='#c98b4f'; ell(0,0,16,12.5);
  ctx.strokeStyle='rgba(110,65,30,.75)'; ctx.lineWidth=1.3;
  for(const i of [-7,-2,3]){ ctx.beginPath(); ctx.arc(i-7,0,10,-.85,.85); ctx.stroke(); }
  ctx.fillStyle='#d49a5c'; ell(13,0,10,10);
  ctx.strokeStyle='rgba(110,65,30,.75)'; ctx.beginPath(); ctx.arc(7,0,7,-.9,.9); ctx.stroke(); ctx.beginPath(); ctx.arc(9,0,10,-.6,.6); ctx.stroke();
  ctx.fillStyle='#8a5a30';
  ctx.beginPath(); ctx.moveTo(8,-6); ctx.lineTo(11,-12); ctx.lineTo(15,-7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(8,6); ctx.lineTo(11,12); ctx.lineTo(15,7); ctx.fill();
  ctx.fillStyle='#e3ad72'; ell(21,0,7,6.5);
  ctx.strokeStyle='rgba(110,65,30,.6)'; ctx.beginPath(); ctx.arc(19,0,5,-1.1,1.1); ctx.stroke();
  ctx.fillStyle='#2a1a12'; ell(27,0,2.6,3);
  ctx.strokeStyle='#4a2c18'; ctx.lineWidth=1.4;
  ctx.beginPath(); ctx.moveTo(15,-6.5); ctx.lineTo(18,-4.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(15,6.5); ctx.lineTo(18,4.5); ctx.stroke();
  ctx.restore();
  if(diz>0){ ctx.fillStyle=`rgba(255,220,90,${Math.min(1,diz)})`; ctx.font='11px system-ui'; ctx.textAlign='center';
    for(let i=0;i<3;i++){ const an=t*6+i*TAU/3; ctx.fillText('★',x+Math.cos(an)*15,y-17+Math.sin(an)*5); } }
}
function drawAim(){
  if(!aim||aim.pow<.03) return;
  ctx.strokeStyle='rgba(255,255,255,.18)'; ctx.lineWidth=1; ctx.setLineDash([3,4]);
  ctx.beginPath(); ctx.moveTo(aim.sx,aim.sy); ctx.lineTo(aim.cx,aim.cy); ctx.stroke(); ctx.setLineDash([]);
  const col=`hsl(${120-120*aim.pow},90%,55%)`, s=20, e=20+aim.pow*110;
  const x0=dog.x+aim.dx*s, y0=dog.y+aim.dy*s, x1=dog.x+aim.dx*e, y1=dog.y+aim.dy*e;
  ctx.strokeStyle=col; ctx.lineWidth=4; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
  const an=Math.atan2(aim.dy,aim.dx); ctx.fillStyle=col; ctx.beginPath();
  ctx.moveTo(x1+Math.cos(an)*10,y1+Math.sin(an)*10); ctx.lineTo(x1+Math.cos(an+2.4)*10,y1+Math.sin(an+2.4)*10); ctx.lineTo(x1+Math.cos(an-2.4)*10,y1+Math.sin(an-2.4)*10); ctx.fill();
  const pct=aim.pow>=1?'MAX':Math.round(aim.pow*100)+'%';
  ctx.fillStyle='#fff'; ctx.font='bold 12px system-ui'; ctx.textAlign='center';
  ctx.fillText(pct,clamp(x1+Math.cos(an)*24,24,W-24),clamp(y1+Math.sin(an)*24+4,HUD+14,H-8));
  // power ring at the finger (the drag can start anywhere, so show it where they're looking)
  const fx=clamp(aim.cx,20,W-20), fy=clamp(aim.cy,HUD+20,H-20);
  ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(fx,fy,16,0,TAU); ctx.stroke();
  ctx.strokeStyle=col; ctx.beginPath(); ctx.arc(fx,fy,16,-Math.PI/2,-Math.PI/2+TAU*aim.pow); ctx.stroke();
}
function drawWords(){
  ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const w of words){ const k=w.t/w.life, pop=w.t<.1?w.t/.1*1.25:1+.25*Math.max(0,1-(w.t-.1)/.15);
    ctx.save(); ctx.translate(w.x,w.y); ctx.rotate(w.rot); ctx.scale(pop,pop); ctx.globalAlpha=1-k*k;
    ctx.font=`900 ${Math.round(13+12*w.size)}px system-ui`; ctx.lineWidth=4; ctx.strokeStyle='rgba(120,0,0,.9)'; ctx.strokeText(w.txt,0,0);
    ctx.fillStyle=w.col||'#fff'; ctx.fillText(w.txt,0,0); ctx.restore(); }
  ctx.textBaseline='alphabetic';
}
function pill(txt,y,sub){
  ctx.font='bold 13px system-ui'; const w=Math.min(380,ctx.measureText(txt).width+28);
  ctx.fillStyle='rgba(20,14,10,.85)'; roundRect(W/2-w/2,y-16,w,sub?40:30,15); ctx.fill();
  ctx.fillStyle='#ffe0c8'; ctx.textAlign='center'; ctx.fillText(txt,W/2,y+3);
  if(sub){ ctx.font='11px system-ui'; ctx.fillStyle='#a99'; ctx.fillText(sub,W/2,y+18); }
}
function drawToast(){
  if(!toast) return; const k=toast.t, life=state==='recap'?1.6:3.2, a=Math.min(1,k/.15,(life-k)/.3), y=HUD+22+(k<.15?(1-k/.15)*-12:0);
  ctx.save(); ctx.globalAlpha=clamp(a,0,1); ctx.font='bold 13px system-ui';
  const txt=toast.who+': '+toast.txt, w=Math.min(384,ctx.measureText(txt).width+26);
  ctx.fillStyle='rgba(16,12,24,.92)'; roundRect(W/2-w/2,y-15,w,30,14); ctx.fill();
  ctx.strokeStyle=toast.col; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle=toast.col; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(txt,W/2,y+1,370);
  ctx.restore(); ctx.textBaseline='alphabetic';
}
function drawHUD(){
  ctx.fillStyle='#0d0b0a'; ctx.fillRect(0,0,W,HUD);
  ctx.textAlign='left'; ctx.fillStyle='#fff'; ctx.font='bold 15px system-ui'; ctx.fillText(`${lvlIdx+1}. ${L.name} ${L.emoji}`,12,25);
  ctx.fillStyle='#9a8a7e'; ctx.font='12px system-ui'; ctx.fillText(state==='recap'?'Instant replay':`Attempt ${attempt} · ${stats.bonks} bonks`,12,43);
  ctx.font='17px system-ui';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  if(settings.shots>=99){ ctx.fillText('🐾 ∞',160,30); }
  else {
    const n=Math.max(settings.shots,shotsLeft), step=n>6?132/n:22;
    for(let i=0;i<n;i++){
      const fx=hudFx.find(f=>f.i===i&&f.k==='+'), px=158+i*step;
      let sc=1; if(fx){ const k=fx.t/.35; sc=k>=1?1:k<.5?k*3:1.5-(k-.5); }   // pop in: 0 → 1.5 → 1
      ctx.globalAlpha=i<shotsLeft?1:.18; ctx.save(); ctx.translate(px,30); ctx.scale(sc,sc); ctx.fillText('🐾',0,0); ctx.restore();
    }
    // a paw that just left pops out and falls away
    for(const f of hudFx){ if(f.k!=='-') continue; const px=158+f.i*step, k=f.t/.9;
      ctx.globalAlpha=1-k; ctx.save(); ctx.translate(px+k*10,30+k*k*40); ctx.rotate(k*2); ctx.scale(1+k*.4,1+k*.4); ctx.fillText('🐾',0,0); ctx.restore(); }
    ctx.font='bold 13px system-ui';
    for(const f of hudFx){ const px=158+f.i*step, k=f.t/.9; ctx.globalAlpha=1-k*k;
      ctx.fillStyle=f.k==='+'?'#7dff9a':'#ff6a6a'; ctx.fillText(f.k==='+'?'+1':'−1',px+12,46-k*6); }
  }
  ctx.globalAlpha=1; ctx.textBaseline='alphabetic';
}
function render(){
  ctx.setTransform(scale*dpr,0,0,scale*dpr,0,0);
  ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);
  if(!L) return;
  if(state==='recap'){
    const isDown=o=>rp.knocked.has(o.id)||rp.gone.has(o.id);
    drawLit(1,isDown); drawFallen(isDown,.7);
    const cols=['#ff5a5a','#ffb347','#7ad7ff','#b07aff','#7dff9a','#ff7ad1'];
    const end=Math.min(rec.frames.length-1,Math.floor(rp.i)); let att=0, started=false, last=null;
    ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.strokeStyle=cols[0]; ctx.globalAlpha=.75; ctx.beginPath();
    for(let i=0;i<=end;i++){ const f=rec.frames[i];
      if(f.reset){ ctx.stroke(); att++; ctx.strokeStyle=cols[att%cols.length]; ctx.beginPath(); started=false; continue; }
      if(!started){ ctx.moveTo(f.x,f.y); started=true; } else ctx.lineTo(f.x,f.y); last=f; }
    ctx.stroke(); ctx.globalAlpha=1;
    drawPings(true); drawParts();
    const f=last||{x:L.start.x,y:L.start.y,a:-Math.PI/2}; drawDog(f.x,f.y,f.a,0,0);
    drawWords(); drawToast();
    pill(`📼 INSTANT REPLAY ×${rp.speed.toFixed(0)}  ·  Attempt ${att+1}  ·  ${rp.bonks} bonks`,H-50,'tap to skip');
    drawHUD(); return;
  }
  let lit=settings.lights?.4:0;
  if(state==='winning') lit=Math.max(lit,clamp((winT-.3)/.8,0,1));
  if(lit>0) drawLit(lit,o=>o.down||o.gone);
  if(DEBUG&&settings.ghost){ ctx.globalAlpha=.8; ctx.drawImage(mem,0,0,W,H); ctx.globalAlpha=1; }
  drawFallen(o=>o.down,.3);
  if(settings.scent && lit<.5) drawScent();
  drawPings(false); drawGlows(); if(lit<.5) drawBinxEyes(); drawPrints(); drawParts();
  drawDog(dog.x,dog.y,dog.a,dog.squash,dog.dizzy);
  drawAim(); drawWords(); drawToast();
  if(banner) pill(banner.txt,H-46);
  else if(state==='aim' && stats.shots===0 && attempt===1) pill('Drag back anywhere ↘  then let go to fling Nala',H-46);
  drawHUD();
}
