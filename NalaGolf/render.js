"use strict";
/* All drawing. Reads game state; never changes it (render-only bookkeeping lives in R).

   Two looks:
   • Bonk mode (dark gameplay) = Glow-in-the-Dark Neon. Indigo + grid, furniture lights up as cyan
     tubes inside the magenta sonar ring, yellow scent hint. Nala is drawn in full colour as
     Super Sniffer (look L: mask, teal cape, sonar-nose emblem) — that's how she sees herself.
   • Lights on (replay + win) = H · Storybook Sketch. Real top-down furniture on paper, inked in
     brown with a hand-drawn wobble and paper grain, replay path + bonk stickers on top.
     Nala is herself again (look K, no costume).

   Static layers are cached offscreen: the neon grid, the neon furniture tubes (rebuilt when
   something is knocked over), the sketch house (built once per level) and per-object sprites
   for knock-overs (standing + fallen). Per frame we only blit layers and draw a few vectors. */

const C={bg:'#0b0620',grid:'#2a1859',bar:'#120a2e',line:'#3a1f6e',cyan:'#29f6ff',mag:'#ff3df2',yel:'#ffe066',pur:'#b44dff',
  nala:'#ffb36b',txt:'#efe9ff',dim:'#b3a6d9',paper:'#f7efdf',ink:'#4a3426',ink2:'#2b1b14'};
const FT='Audiowide, "Space Grotesk", system-ui, sans-serif', FB='"Space Grotesk", system-ui, sans-serif';
const R={key:'',objs:null,bg:null,neon:null,neonKey:'',lit:null,litPending:false,spr:new Map(),px:1,
  glowPrev:new Map(),hitAt:new Map(),face:new Map(),prevState:'',failAt:-9,hudLit:null,fonts:false};

/* ---------- tiny geometry helpers (Path2D, so one shape can be filled, stroked and clipped) ---------- */
function rr(x,y,w,h,r){ const p=new Path2D(); r=Math.max(0,Math.min(r||0,w/2,h/2));
  if(!r){ p.rect(x,y,w,h); return p; }
  p.moveTo(x+r,y); p.arcTo(x+w,y,x+w,y+h,r); p.arcTo(x+w,y+h,x,y+h,r); p.arcTo(x,y+h,x,y,r); p.arcTo(x,y,x+w,y,r); p.closePath(); return p; }
function ci(x,y,r){ const p=new Path2D(); p.arc(x,y,Math.max(.1,r),0,TAU); return p; }
function el(x,y,rx,ry,rot){ const p=new Path2D(); p.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot||0,0,TAU); return p; }
function rot4(cx,cy,w,h,deg){ const a=deg*Math.PI/180, c=Math.cos(a), s=Math.sin(a), p=new Path2D();
  [[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].forEach(([u,v],i)=>{ const X=cx+u*c-v*s, Y=cy+u*s+v*c; i?p.lineTo(X,Y):p.moveTo(X,Y); }); p.closePath(); return p; }
function pth(fn){ const p=new Path2D(); fn(p); return p; }
function shapePath(c,o){ c.beginPath(); if(o.t==='r') c.rect(o.x,o.y,o.w,o.h); else c.arc(o.x,o.y,o.r,0,TAU); }   // used by ghost memory
const mix=(a,b,k)=>{ const A=parseInt(a.slice(1),16), B=parseInt(b.slice(1),16), f=(s)=>Math.round(((A>>s)&255)*(1-k)+((B>>s)&255)*k); return `rgb(${f(16)},${f(8)},${f(0)})`; };

/* ---------- the pen: one furniture drawing, two styles ----------
   ink  = Storybook Sketch: coloured fill + brown ink outline
   neon = cyan tubes: outer silhouette bright, parts dimmer, flat details skipped                   */
function mkPen(c,mode){
  c.lineCap='round'; c.lineJoin='round';
  return { mode, c,
    s(p,fill,role){ role=role||'part';
      if(mode==='ink'){ if(fill){ c.fillStyle=fill; c.fill(p); } c.strokeStyle=C.ink; c.lineWidth=1.1; c.stroke(p); return; }
      if(role==='main'){ c.fillStyle='rgba(41,246,255,.07)'; c.fill(p); }
      c.globalAlpha=role==='main'?1:.72; c.strokeStyle=C.cyan; c.lineWidth=role==='main'?2:1.15; c.stroke(p); c.globalAlpha=1; },
    f(p,fill,a){ if(mode!=='ink') return; c.globalAlpha=a==null?1:a; c.fillStyle=fill; c.fill(p); c.globalAlpha=1; },
    l(p,col,w,a){ if(mode==='ink'){ c.globalAlpha=a==null?1:a; c.strokeStyle=col; c.lineWidth=w; c.stroke(p); }
      else { c.globalAlpha=.45; c.strokeStyle=C.cyan; c.lineWidth=1; c.stroke(p); } c.globalAlpha=1; },
    li(p,col,w,a){ if(mode!=='ink') return; c.globalAlpha=a==null?1:a; c.strokeStyle=col; c.lineWidth=w; c.stroke(p); c.globalAlpha=1; },
  };
}

/* ---------- furniture ---------- */
function kindOf(o){
  const n=(o.name||'').toLowerCase();
  const K=[['wall','wall'],['heater','heater'],['dresser','dresser'],['basket','basket'],['floor lamp','floorlamp'],['couch','couch'],['sofa','couch'],
    ['lamp','tablelamp'],['coffee','coffeetable'],['tv','tv'],['toy','toy'],['plant','plant'],['shoe bench','bench'],['shoe','shoes'],['boot','shoes'],['radiator','radiator'],
    ['bench','bench'],['trash','trash'],['recycl','trash'],['fridge','fridge'],['counter','counter'],['stove','counter'],['island','island'],['leg','leg'],['armchair','armchair'],['chair','chair'],['bowl','bowl'],
    ['big bed','humanbed'],['shelf','shelf'],['cabinet','shelf'],['sideboard','dresser'],['washer','washer'],['dryer','washer'],['litter','litter'],['side table','sidetable'],['end table','sidetable'],['nightstand','sidetable']];
  for(const [k,v] of K) if(n.includes(k)) return v;
  return 'generic';
}
// Which side of a rect faces into the room (toward its floor's middle, or toward the table for chairs).
function frontOf(o){
  if(o.front) return o.front;   // level data can pin it (e.g. a bed's headboard against a wall)
  const c=center(o); let tx=200, ty=375;
  if(kindOf(o)==='chair'){ const tb=(L.decor||[]).find(d=>d.kind==='table'); if(tb){ tx=tb.x+tb.w/2; ty=tb.y+tb.h/2; } }
  else { const f=(L.floors||[]).find(f=>c.x>=f.x&&c.x<=f.x+f.w&&c.y>=f.y&&c.y<=f.y+f.h); if(f){ tx=f.x+f.w/2; ty=f.y+f.h/2; } }
  const dx=tx-c.x, dy=ty-c.y;
  if(o.h>o.w*1.2) return dx>=0?'E':'W';
  if(o.w>o.h*1.2) return dy>=0?'S':'N';
  return Math.abs(dx)>Math.abs(dy)?(dx>=0?'E':'W'):(dy>=0?'S':'N');
}
// Local frame for oriented furniture: box (0,0,len,dep) with the back at v=0 and the front at v=dep.
function orient(c,o,front){
  if(front==='S'){ c.translate(o.x,o.y); return [o.w,o.h]; }
  if(front==='N'){ c.translate(o.x+o.w,o.y+o.h); c.rotate(Math.PI); return [o.w,o.h]; }
  if(front==='W'){ c.translate(o.x+o.w,o.y); c.rotate(Math.PI/2); return [o.h,o.w]; }
  c.translate(o.x,o.y+o.h); c.rotate(-Math.PI/2); return [o.h,o.w];   // E
}
const GRAIN='#a77a50';
function grain(P,x,y,w,h,n){ for(let i=1;i<=n;i++){ const yy=y+h*i/(n+1); P.li(pth(p=>{ p.moveTo(x+6,yy); p.quadraticCurveTo(x+w*.3,yy-2.5,x+w*.55,yy); p.quadraticCurveTo(x+w*.8,yy+2.5,x+w-6,yy); }),GRAIN,.8,.45); } }
function shards(P,cx,cy,cols,n,spread){ for(let i=0;i<n;i++){ const a=i*2.39+.5, d=spread*(.45+.55*((i*37)%10)/10), x=cx+Math.cos(a)*d, y=cy+Math.sin(a)*d;
  P.f(pth(p=>{ p.moveTo(x,y); p.lineTo(x+3,y-2); p.lineTo(x+4,y+1.5); p.closePath(); }),cols[i%cols.length]); } }

const DRAW={
  wall(P,o){ P.s(rr(o.x,o.y,o.w,o.h,P.mode==='neon'?2:0),'#b9a68c','main'); },
  heater(P,o){ const {x,y,r}=o; P.s(ci(x,y,r),'#a3abb5','main'); P.l(ci(x,y,r*.64),'#5e6670',1); P.l(ci(x,y,r*.36),'#5e6670',1); P.f(ci(x,y,r*.2),'#ff7a3d',.85); },
  dresser(P,o){ const c=P.c; c.save(); const [L2,D]=orient(c,o,frontOf(o));
    P.s(rr(0,0,L2,D,3),'#d8ab7c','main'); grain(P,0,0,L2,D-8,3);
    P.s(rr(0,D-8,L2,8,0),GRAIN); for(const k of [.24,.5,.76]) P.f(ci(L2*k,D-4,1.6),'#e8c27a');
    P.s(rr(8,8,16,12,1),'#e9e2d4'); P.f(rr(10.5,10.5,11,7,0),'#7fb3d8');
    P.s(ci(L2-19,D*.36,6),'#d9d2c4'); P.li(ci(L2-19,D*.36,3),GRAIN,.6,.5); c.restore(); },
  basket(P,o,fallen){ const {x,y,r}=o;
    if(fallen){ P.s(rot4(x-4,y-3,r*2.1,r*1.5,-30),'#dcc08f','main'); P.l(rot4(x-4,y-3,r*1.7,r*1.1,-30),'#8a6a3c',1);
      const cl=[['#5f8fd8',8,6,-.4],['#f08fae',16,-2,.6],['#f4f1ea',4,14,1.1],['#5f8fd8',20,12,.2],['#f08fae',-6,18,-.8],['#f4f1ea',24,2,1.5]];
      for(const [col,dx,dy,a] of cl) P.s(el(x+dx,y+dy,5.5,3,a),col); return; }
    P.s(ci(x,y,r),'#dcc08f','main');
    if(P.mode==='ink'){ P.c.setLineDash([2.5,1.5]); P.li(ci(x,y,r-2.5),'#8a6a3c',1.2); P.c.setLineDash([]); } else P.l(ci(x,y,r-3));
    P.f(ci(x,y,r-5),'#e6dccb'); const k=r/16;
    P.f(el(x-4*k,y-2*k,6*k,4*k,-.44),'#5f8fd8'); P.f(el(x+4*k,y+3*k,5*k,3*k,.52),'#f08fae'); P.f(el(x+3*k,y-5*k,3.5*k,2.2*k,0),'#f4f1ea'); },
  floorlamp(P,o,fallen){ const {x,y,r}=o;
    if(fallen){ P.l(pth(p=>{ p.moveTo(x-15,y+9); p.lineTo(x+10,y-3); }),'#5e6670',2.5); P.s(el(x+15,y-6,9,6,-.44),'#f4ecd8','main'); P.s(ci(x-15,y+9,5),'#a3abb5');
      shards(P,x+12,y+4,['#fff2c0','#ffd27a','#d9d9d9'],6,13); return; }
    P.f(ci(x,y,r*2.5),'#fff2c0',.45); P.s(ci(x,y,r),'#f4ecd8','main'); P.li(ci(x,y,r*.62),'#c9b88f',1); P.f(ci(x,y,r*.35),'#fff6d0'); P.l(ci(x,y,r*.35)); },
  tablelamp(P,o,fallen){ const {x,y,r}=o;
    if(fallen){ P.s(ci(x-3,y+2,r*.55),'#d8ab7c'); P.s(el(x+9,y-5,r*.8,r*.55,.6),'#f4ecd8','main'); shards(P,x+4,y,['#fff2c0','#ffd27a','#c96'],7,14); return; }
    P.s(ci(x,y,r),'#d8ab7c','main'); P.s(ci(x,y,r*.67),'#f4ecd8'); P.f(ci(x,y,r*.25),'#fff6d0'); },
  couch(P,o){ const c=P.c; c.save(); const [Ln,D]=orient(c,o,frontOf(o)), back=Math.min(12,D*.25), arm=Math.min(14,Ln*.1);
    P.s(rr(0,0,Ln,D,6),'#87a2c2','main'); P.s(rr(arm,back,Ln-arm*2,D-back-2,3),'#a8c0dc');
    const n=Ln>110?3:2, cw=(Ln-arm*2-4)/n;
    for(let i=0;i<n;i++){ P.s(rr(arm+2+i*cw,back+2,cw-1,D-back-6,4),'#a8c0dc'); P.li(pth(p=>{ p.moveTo(arm+2+i*cw+cw*.25,back+(D-back)*.5); p.lineTo(arm+2+i*cw+cw*.7,back+(D-back)*.5); }),'#87a2c2',.8,.5); }
    P.s(rot4(arm+12,back+9,13,13,18),'#f0cf86'); c.restore(); },
  coffeetable(P,o){ const {x,y,w,h}=o, kx=w/105, ky=h/40;
    P.s(rr(x,y,w,h,6),'#d8ab7c','main'); grain(P,x,y,w,h,2);
    P.s(rot4(x+23*kx,y+16*ky,22,16,-8),'#d9534f'); P.s(rot4(x+25*kx,y+18*ky,20,14,6),'#3f7fbf');
    P.s(ci(x+72*kx,y+20*ky,6),'#f2efe8'); P.f(ci(x+72*kx,y+20*ky,4),'#6b3e22');
    P.li(pth(p=>{ p.moveTo(x+78*kx,y+17*ky); p.quadraticCurveTo(x+83*kx,y+20*ky,x+78*kx,y+23*ky); }),'#f2efe8',2);
    P.f(rot4(x+89*kx,y+19*ky,6,18,12),'#2a2a2e'); },
  tv(P,o){ const c=P.c; c.save(); const [Ln,D]=orient(c,o,frontOf(o));
    P.s(rr(0,0,Ln,D,3),'#d8ab7c','main'); P.s(rr(18,3,Ln-36,6,1.5),'#17171b'); P.f(rr(20,5,Ln-40,2,0),'#3c4b66');
    P.f(rr(Ln/2-10,D-12,20,7,1),'#2b2b30'); P.f(rr(6,D-15,10,10,2),'#3a3a40'); P.f(rr(Ln-16,D-15,10,10,2),'#3a3a40'); c.restore(); },
  toy(P,o){ const c=P.c, k=o.r/7; c.save(); c.translate(o.x,o.y); c.rotate(-.35); c.scale(k,k);
    const p=new Path2D(); p.addPath(rr(-5,-1.6,10,3.2,1.5)); for(const [a,b] of [[-5,-1.8],[-5,1.8],[5,-1.8],[5,1.8]]) p.addPath(ci(a,b,2.3));
    P.s(p,'#e45a9b','main'); c.restore(); },
  plant(P,o,fallen){ const {x,y,r}=o, k=r/13;
    if(fallen){ P.f(el(x+8,y+4,16,9,.4),'#4a3122',.85); for(const [dx,dy,col] of [[14,8,'#7a4a2a'],[20,-2,'#5c3a22'],[4,12,'#7a4a2a']]) P.f(ci(x+dx,y+dy,3),col);
      for(const [dx,dy,a,col] of [[-6,-12,.3,'#3f7f38'],[-14,-2,1.4,'#5aa04a'],[2,-16,-.4,'#5aa04a'],[-12,-12,.9,'#3f7f38']]) P.s(el(x+dx,y+dy,10,4,a),col);
      P.s(rot4(x-2,y+1,18,13,35),'#c46a3c','main'); P.f(el(x+4,y+5,4,5.5,.6),'#4a3122'); return; }
    for(let i=0;i<7;i++){ const a=i*TAU/7; P.s(el(x+12*k*Math.cos(a),y+12*k*Math.sin(a),11*k,4.2*k,a),i%2?'#5aa04a':'#3f7f38'); }
    P.s(ci(x,y,9*k),'#c46a3c','main'); P.f(ci(x,y,6.5*k),'#4a3122'); },
  shoes(P,o){ const {x,y,r}=o, k=r/10;
    for(const [dx,dy,a,col] of [[-4,-3,-.4,'#e05a47'],[4,3,.5,'#f2efe8'],[-1,6,1.3,'#e05a47']]){
      P.s(el(x+dx*k,y+dy*k,7*k,3.2*k,a),col,'main'); const ca=Math.cos(a), sa=Math.sin(a);
      P.li(pth(p=>{ for(const s of [-1.5,1.5]){ p.moveTo(x+dx*k+ca*s*k-sa*2*k,y+dy*k+sa*s*k+ca*2*k); p.lineTo(x+dx*k+ca*s*k+sa*2*k,y+dy*k+sa*s*k-ca*2*k); } }),C.ink,.6,.7); } },
  radiator(P,o){ const {x,y,w,h}=o; P.s(rr(x,y,w,h,2),'#c9ced6','main');
    P.l(pth(p=>{ if(h>w){ for(let yy=y+6;yy<y+h-3;yy+=6){ p.moveTo(x+3,yy); p.lineTo(x+w-3,yy); } } else { for(let xx=x+6;xx<x+w-3;xx+=6){ p.moveTo(xx,y+3); p.lineTo(xx,y+h-3); } } }),'#8a909a',1);
    P.s(ci(h>w?x+w/2:x+4,h>w?y+4:y+h/2,2.6),'#b0523f'); },
  bench(P,o){ const c=P.c; c.save(); const [Ln,D]=orient(c,o,frontOf(o));
    P.s(rr(0,0,Ln,D,2),'#c79a6a','main'); P.li(pth(p=>{ for(const k of [.34,.67]){ p.moveTo(3,D*k); p.lineTo(Ln-3,D*k); } }),GRAIN,.8,.6);
    P.s(el(Ln*.3,D*.5,6,3.4,0),'#6b4a32'); P.s(el(Ln*.3+3,D*.5+5,6,3.4,.15),'#6b4a32'); P.s(el(Ln*.7,D*.5,5,3,-.2),'#3f7fbf'); c.restore(); },
  trash(P,o,fallen){ const {x,y,r}=o;
    if(fallen){ P.s(rot4(x-3,y-2,r*2.4,r*1.6,25),'#a3abb5','main'); P.l(rot4(x-3,y-2,r*2.4-4,r*1.6-4,25),'#5e6670',1); P.s(ci(x-r*1.4,y-r*1.2,r*.55),'#c4cad2');
      for(const [dx,dy,rr2,col] of [[14,10,3.5,'#f4f1ea'],[20,2,3,'#eee'],[8,16,2.6,'#c8b28a'],[22,14,2.4,'#f4f1ea']]) P.s(ci(x+dx,y+dy,rr2),col);
      P.s(pth(p=>{ p.moveTo(x+12,y+20); p.quadraticCurveTo(x+18,y+26,x+24,y+20); p.quadraticCurveTo(x+18,y+23,x+12,y+20); }),'#f2c14e');
      P.s(ci(x+27,y+8,2.4),'#c0392b'); return; }
    P.s(ci(x,y,r),'#a3abb5','main'); P.l(ci(x,y,r-2),'#5e6670',1); P.s(ci(x,y,r*.5),'#c4cad2'); P.li(pth(p=>{ p.moveTo(x-3,y); p.lineTo(x+3,y); }),C.ink,1.4); },
  fridge(P,o){ const {x,y,w,h}=o, c=P.c; P.s(rr(x,y,w,h,3),'#eef0f2','main');
    c.save(); const [Ln,D]=orient(c,o,frontOf(o)); P.l(pth(p=>{ p.moveTo(Ln*.38,2); p.lineTo(Ln*.38,D-2); }),'#9aa0aa',1);
    P.f(rr(Ln*.38-9,D-5,6,3,1),'#9aa0aa'); P.f(rr(Ln*.38+3,D-5,6,3,1),'#9aa0aa'); c.restore();
    for(const [k,j,col] of [[.2,.3,'#e05a47'],[.7,.25,'#3f7fbf'],[.55,.6,'#f2c14e']]) P.f(ci(x+w*k,y+h*j,2),col); },
  counter(P,o){ const {x,y,w,h}=o; P.s(rr(x,y,w,h,2),'#e8e1d6','main');
    for(let i=0;i<18;i++) P.f(ci(x+3+((i*37)%97)/97*(w-6),y+3+((i*53)%89)/89*(h-6),.7),'#b8ae9c');
    if(h>w){ P.s(rr(x+3,y+12,w-6,30,2),'#d8ab7c'); P.f(ci(x+w/2-2,y+22,3),'#e04a3a'); P.f(ci(x+w/2+3,y+32,2.4),'#e04a3a');
      P.s(rr(x+3,y+h*.45,w-6,28,5),'#b8c2cc'); P.f(ci(x+w/2,y+h*.45+14,1.8),'#5e6670');
      P.s(ci(x+w/2,y+h-24,8),'#f2efe8'); for(const [dx,dy,col] of [[-3,-2,'#e04a3a'],[3,-1,'#f2c14e'],[0,3,'#7ac04a']]) P.f(ci(x+w/2+dx,y+h-24+dy,2.6),col); } },
  leg(P,o){ P.s(ci(o.x,o.y,o.r),'#8a5a3c','main'); },
  chair(P,o){ const c=P.c; c.save(); const [Ln,D]=orient(c,o,frontOf(o)); P.s(rr(0,3,Ln,D-3,3),'#c79a6a','main'); P.s(rr(0,0,Ln,5,2),GRAIN); c.restore(); },
  bowl(P,o,fallen){ const {x,y,r}=o;
    if(fallen){ P.f(el(x+8,y+6,r*2.4,r*1.5,.3),'#7fc4ff',.6); P.l(el(x+8,y+6,r*2.4,r*1.5,.3),'#5ab0ff',1,.7);
      for(const [dx,dy] of [[28,-2],[24,16],[-10,14]]) P.f(ci(x+dx,y+dy,1.8),'#5ab0ff'); P.s(ci(x-2,y-2,r*.9),'#b8c2cc','main'); P.l(ci(x-2,y-2,r*.4),'#7d8894',1); return; }
    P.s(ci(x,y,r),'#b8c2cc','main'); P.l(ci(x,y,r*.78),'#7d8894',1); P.f(ci(x,y,r*.62),'#7fc4ff'); P.f(el(x-r*.25,y-r*.25,r*.25,r*.14,-.6),'#fff',.8); },
  humanbed(P,o){ const c=P.c; c.save(); const [Ln,D]=orient(c,o,frontOf(o));   // headboard against the wall, foot toward the room
    P.s(rr(0,0,Ln,D,4),'#b98a5e','main'); P.s(rr(0,0,Ln,7,2),'#8a5a3c');
    P.s(rr(4,8,Ln-8,D-11,5),'#f4f1ea'); const pw=(Ln-22)/2;
    P.s(rr(8,11,pw,17,7),'#ffffff'); P.s(rr(14+pw,11,pw,17,7),'#ffffff');
    P.li(pth(p=>{ p.moveTo(8+pw*.5,14); p.lineTo(8+pw*.5,25); p.moveTo(14+pw*1.5,14); p.lineTo(14+pw*1.5,25); }),'#d8d0c0',.8,.7);
    const dy=D*.38; P.s(rr(4,dy,Ln-8,D-dy-3,4),'#8fb0d6'); P.s(rr(4,dy,Ln-8,9,3),'#c9dbef');
    P.li(pth(p=>{ for(let k=1;k<4;k++){ const x=4+(Ln-8)*k/4; p.moveTo(x,dy+12); p.lineTo(x,D-6); } for(let yy=dy+28;yy<D-6;yy+=18){ p.moveTo(8,yy); p.lineTo(Ln-8,yy); } }),'#6f92bd',.8,.55);
    P.s(el(Ln*.68,D*.72,13,8,.3),'#a3bfe0'); c.restore(); },
  shelf(P,o){ const c=P.c; c.save(); const [Ln,D]=orient(c,o,frontOf(o));
    P.s(rr(0,0,Ln,D,2),'#b98a5e','main'); const cols=['#d9534f','#3f7fbf','#f2c14e','#5aa04a','#8e6bbf','#e08a2e','#f2efe8'];
    let x=4, i=0; while(x<Ln-6){ const w=3.5+((i*37)%5), h=D-5-((i*53)%4); P.s(rr(x,2,Math.min(w,Ln-4-x),h,.8),cols[i%cols.length]); x+=w+.6; i++; if(i%9===4) x+=4; }
    c.restore(); },
  washer(P,o){ const {x,y,w,h}=o, cx=x+w/2, cy=y+h/2, r=Math.min(w,h)*.3; P.s(rr(x,y,w,h,4),'#eef0f2','main');
    P.s(ci(cx,cy+2,r),'#b8c2cc'); P.f(ci(cx,cy+2,r*.72),'#7fc4ff'); P.f(el(cx-r*.25,cy+2-r*.25,r*.25,r*.14,-.6),'#fff',.8);
    for(const k of [.2,.32]) P.l(ci(x+w*k,y+6,2),'#7d8894',1); P.li(rr(x+w*.55,y+4,w*.3,4,1),'#9aa0aa',1); },
  armchair(P,o){ const c=P.c; c.save(); const [Ln,D]=orient(c,o,frontOf(o)), back=Math.min(11,D*.27), arm=Math.min(10,Ln*.2);
    P.s(rr(0,0,Ln,D,7),'#c96f5a','main'); P.s(rr(arm,back,Ln-arm*2,D-back-2,5),'#e0907a');
    P.li(pth(p=>{ p.moveTo(arm+5,back+(D-back)*.55); p.lineTo(Ln-arm-5,back+(D-back)*.55); }),'#c96f5a',.8,.5);
    P.s(rot4(Ln*.62,back+8,10,9,-14),'#f0cf86'); c.restore(); },
  island(P,o){ const {x,y,w,h}=o, cx=x+w/2, cy=y+h/2; P.s(rr(x,y,w,h,4),'#d8ab7c','main'); grain(P,x,y,w,h,2);
    P.s(ci(cx-w*.12,cy-h*.05,Math.min(w,h)*.24),'#f2efe8'); for(const [dx,dy,col] of [[-3,-2,'#e04a3a'],[3,-1,'#f2c14e'],[0,3,'#7ac04a'],[-4,3,'#f2c14e']]) P.f(ci(cx-w*.12+dx,cy-h*.05+dy,2.6),col);
    P.s(rot4(cx+w*.24,cy+h*.12,w*.22,h*.3,8),'#f4f1ea'); },
  litter(P,o){ const {x,y,w,h}=o; P.s(rr(x,y,w,h,5),'#9aa0aa','main'); P.s(rr(x+4,y+4,w-8,h-8,3),'#e9dcc0');
    for(let i=0;i<14;i++) P.f(ci(x+7+((i*37)%91)/91*(w-14),y+7+((i*53)%83)/83*(h-14),.9),'#b8a27c');
    P.s(rot4(x+w*.72,y+h*.62,7,11,25),'#d9534f'); },
  sidetable(P,o){ const {x,y,w,h}=o; P.s(rr(x,y,w,h,3),'#d8ab7c','main'); grain(P,x,y,w,h,1);
    P.s(ci(x+w*.38,y+h*.42,Math.min(w,h)*.18),'#f2efe8'); P.f(ci(x+w*.38,y+h*.42,Math.min(w,h)*.11),'#6b3e22'); P.s(rot4(x+w*.68,y+h*.66,Math.min(w,h)*.3,Math.min(w,h)*.22,12),'#3f7fbf'); },
  generic(P,o,fallen){ const col=(MAT[o.mat]||{}).col||'#999'; P.s(o.t==='r'?rr(o.x,o.y,o.w,o.h,3):ci(o.x,o.y,o.r),col,'main'); },
};
function drawThing(P,o,fallen){ const k=kindOf(o); (DRAW[k]||DRAW.generic)(P,o,!!fallen); }

/* ---------- floors, rugs, the goal (sketch only) ---------- */
function drawFloor(c,f){
  const P=mkPen(c,'ink');
  if(f.kind==='carpet'){ c.fillStyle='#d7dbe6'; c.fillRect(f.x,f.y,f.w,f.h);
    c.save(); c.beginPath(); c.rect(f.x,f.y,f.w,f.h); c.clip();
    for(let y=f.y+1.5;y<f.y+f.h;y+=6) for(let x=f.x+1.5;x<f.x+f.w;x+=6){ c.fillStyle='rgba(0,0,0,.12)'; c.fillRect(x-.6,y-.6,1.3,1.3); c.fillStyle='rgba(255,255,255,.14)'; c.fillRect(x+2.5,y+2.5,1.1,1.1); }
    c.restore(); return; }
  if(f.kind==='tile'){ c.fillStyle='#ece6d8'; c.fillRect(f.x,f.y,f.w,f.h);
    P.li(pth(p=>{ for(let x=f.x+22;x<f.x+f.w;x+=22){ p.moveTo(x,f.y); p.lineTo(x,f.y+f.h); } for(let y=f.y+22;y<f.y+f.h;y+=22){ p.moveTo(f.x,y); p.lineTo(f.x+f.w,y); } }),'#cfc4ae',1,.8); return; }
  c.fillStyle='#ead7b4'; c.fillRect(f.x,f.y,f.w,f.h);   // wood
  P.li(pth(p=>{ let row=0; for(let y=f.y+14;y<f.y+f.h;y+=14,row++){ p.moveTo(f.x,y); p.lineTo(f.x+f.w,y);
    for(let x=f.x+((row*97)%90)+20;x<f.x+f.w;x+=90){ p.moveTo(x,y-14); p.lineTo(x,y); } } }),'#c9ad86',1,.65);
}
function drawDecor(c,d){
  const P=mkPen(c,'ink');
  if(d.kind==='rug'){ P.s(rr(d.x,d.y,d.w,d.h,8),'#e6a28f'); P.li(rr(d.x+6,d.y+6,d.w-12,d.h-12,5),'#b0523f',2.5); c.setLineDash([3,3]); P.li(rr(d.x+12,d.y+12,d.w-24,d.h-24,3),'#b0523f',.8); c.setLineDash([]); }
  else if(d.kind==='runner'){ P.s(rr(d.x,d.y,d.w,d.h,3),'#8fb3a0'); P.li(rr(d.x+5,d.y+5,d.w-10,d.h-10,2),'#5f8a76',2);
    P.li(pth(p=>{ for(let x=d.x+4;x<d.x+d.w-2;x+=4){ p.moveTo(x,d.y); p.lineTo(x,d.y-4); p.moveTo(x,d.y+d.h); p.lineTo(x,d.y+d.h+4); } }),'#e9e2d4',1); }
  else if(d.kind==='dogbed') drawDogBed(c,d.x,d.y,d.w,d.h,false);
  else if(d.kind==='mat'){ P.s(rr(d.x,d.y,d.w,d.h,3),'#b0523f'); P.li(rr(d.x+4,d.y+4,d.w-8,d.h-8,2),'#e6a28f',1.5); }
  else if(d.kind==='table'){ c.globalAlpha=.62; c.fillStyle='#d8ab7c'; c.fill(rr(d.x,d.y,d.w,d.h,6)); c.globalAlpha=1;
    c.strokeStyle=C.ink; c.lineWidth=1.1; c.stroke(rr(d.x,d.y,d.w,d.h,6)); grain(P,d.x,d.y,d.w,d.h,3);
    c.setLineDash([2,3]); P.li(rr(d.x+8,d.y+8,d.w-16,d.h-16,4),'#8a6a3c',.8,.6); c.setLineDash([]); }
}
function drawDogBed(c,x,y,w,h,named){
  const P=mkPen(c,'ink'), kx=w/100, ky=h/70;
  P.s(rr(x,y,w,h,Math.min(30,h*.43)),'#e6a3a3'); P.s(rr(x+10*kx,y+10*ky,w-20*kx,h-20*ky,Math.min(20,h*.28)),'#fbf0dc');
  for(const [px,py] of [[22,22],[78,48],[30,52]]){ const X=x+px*kx, Y=y+py*ky; c.globalAlpha=.55; c.fillStyle='#8a5a3c';
    for(const [a,b,r] of [[-3,0,1.6],[3,0,1.6],[-1,-3,1.2],[1.8,-3,1.2]]) c.fill(ci(X+a,Y+b,r)); c.fill(el(X,Y+3,2.6,2)); c.globalAlpha=1; }
  P.s(pth(p=>{ p.moveTo(x+62*kx,y+60*ky); p.quadraticCurveTo(x+86*kx,y+40*ky,x+90*kx,y+16*ky); p.lineTo(x+94*kx,y+62*ky); p.closePath(); }),'#a9d1b8');
  P.li(pth(p=>{ p.moveTo(x+70*kx,y+56*ky); p.quadraticCurveTo(x+84*kx,y+42*ky,x+87*kx,y+22*ky); }),'#fff',2,.8);
  if(named){ c.fillStyle='#fff'; c.font=`7.5px ${FT}`; c.textAlign='center'; c.textBaseline='alphabetic'; c.fillText('NALA',x+50*kx,y+67.5*ky); }
}
function boneP(s){ const p=new Path2D(); p.addPath(rr(-9*s,-3*s,18*s,6*s,2*s)); for(const [a,b] of [[-9,-3],[-9,3],[9,-3],[9,3]]) p.addPath(ci(a*s,b*s,4*s)); return p; }
function drawGoalInk(c){
  const g=L.goal, P=mkPen(c,'ink');
  if(g.kind==='bed') drawDogBed(c,g.x,g.y,g.w,g.h,true);
  else if(g.kind==='food'){ const {x,y,r}=g;   // Nala's breakfast bowl, full of kibble
    P.s(ci(x,y,r),'#e05a47'); P.s(ci(x,y,r*.74),'#c0392b');
    for(let i=0;i<11;i++){ const a=i*2.39, d=r*.5*Math.sqrt((i+.5)/11); P.s(el(x+Math.cos(a)*d,y+Math.sin(a)*d,2.2,1.7,a),'#9c6a3a'); }
    c.fillStyle='#fff'; c.font=`6px ${FT}`; c.textAlign='center'; c.textBaseline='alphabetic'; c.fillText('NALA',x,y+r-2.2); }
  else if(g.kind==='jar'){ const {x,y,r}=g; c.save(); c.translate(x,y); c.rotate(-.5);   // the treat jar, tipped on its side
    c.globalAlpha=.85; P.s(rr(-r*1.1,-r*.72,r*2,r*1.44,r*.35),'#d9eef5'); c.globalAlpha=1;
    for(const [bx,by,a] of [[-r*.45,-r*.2,.4],[r*.15,r*.22,-.3],[r*.3,-r*.3,.9]]){ c.save(); c.translate(bx,by); c.rotate(a); P.s(boneP(.42),'#d9a35f'); c.restore(); }
    P.s(rr(r*.82,-r*.8,r*.34,r*1.6,2),'#d9534f'); P.li(rr(r*.9,-r*.62,r*.18,r*1.24,1),'#a33a36',.8);
    P.li(rr(-r*.95,-r*.55,r*1.6,r*.3,r*.15),'#fff',1.2,.7);
    for(const [bx,by,a] of [[r*1.75,r*.5,.7],[r*1.45,-r*.9,-.5]]){ c.save(); c.translate(bx,by); c.rotate(a); P.s(boneP(.42),'#d9a35f'); c.restore(); }
    c.restore(); }
  else if(g.kind==='door'){ const {x,y,w,h}=g;   // the back door (in the nearest outer wall) + its mat
    const side=y<=80?'N':y+h>=670?'S':x<=30?'W':'E';
    let dr; if(side==='S') dr=[x,680,w,10]; else if(side==='N') dr=[x,60,w,10]; else if(side==='W') dr=[10,y,10,h]; else dr=[380,y,10,h];
    const out=side==='S'?[x-6,690,w+12,10]:side==='N'?[x-6,50,w+12,10]:side==='W'?[0,y-6,10,h+12]:[390,y-6,10,h+12];
    c.fillStyle='#8fc46a'; c.fillRect(...out);
    P.s(rr(...dr,1),'#c79a6a'); P.li(pth(p=>{ if(side==='S'||side==='N'){ p.moveTo(x+w/2,dr[1]); p.lineTo(x+w/2,dr[1]+10); } else { p.moveTo(dr[0],y+h/2); p.lineTo(dr[0]+10,y+h/2); } }),C.ink,1);
    c.setLineDash([3,3]); P.li(pth(p=>{ if(side==='S'){ p.moveTo(x,680); p.arc(x,680,w*.5,0,-Math.PI/2,true); } else if(side==='N'){ p.moveTo(x,70); p.arc(x,70,w*.5,0,Math.PI/2); } else if(side==='W'){ p.moveTo(20,y); p.arc(20,y,h*.5,Math.PI/2,0,true); } else { p.moveTo(380,y); p.arc(380,y,h*.5,Math.PI/2,Math.PI); } }),'#8a6a3c',1,.7); c.setLineDash([]);
    P.s(rr(x,y,w,h,3),'#b0523f'); P.li(rr(x+3,y+3,w-6,h-6,2),'#e6a28f',1.4);
    c.fillStyle='#fbe9d6'; c.font=`${Math.min(9,Math.min(w,h)*.5)}px ${FT}`; c.textAlign='center'; c.textBaseline='middle'; c.fillText(w>=h?'WOOF':'W',x+w/2,y+h/2+.5); c.textBaseline='alphabetic'; }
  else { c.save(); c.translate(g.x,g.y); c.rotate(-.4); P.s(boneP(1),'#f3e2c0'); c.restore(); }
}
/* ---------- hand-drawn wobble + paper grain (CPU, once per cached layer) ---------- */
let DISP=null;
function dispField(){
  if(DISP) return DISP;
  const gw=W+2, gh=H+2, dx=new Float32Array(gw*gh), dy=new Float32Array(gw*gh);
  let seed=4; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
  const lat=(n)=>{ const a=[]; for(let i=0;i<n;i++) a.push(rnd()); return a; };
  const oct=[[28,1],[14,.5]].map(([sp,amp])=>{ const nx=Math.ceil(gw/sp)+2, ny=Math.ceil(gh/sp)+2; return {sp,amp,nx,ax:lat(nx*ny),ay:lat(nx*ny)}; });
  const sm=t=>t*t*(3-2*t);
  for(let y=0;y<gh;y++) for(let x=0;x<gw;x++){ let vx=0, vy=0, tot=0;
    for(const o of oct){ const fx=x/o.sp, fy=y/o.sp, ix=fx|0, iy=fy|0, tx=sm(fx-ix), ty=sm(fy-iy), i=iy*o.nx+ix;
      const bl=(a)=>(a[i]*(1-tx)+a[i+1]*tx)*(1-ty)+(a[i+o.nx]*(1-tx)+a[i+o.nx+1]*tx)*ty;
      vx+=bl(o.ax)*o.amp; vy+=bl(o.ay)*o.amp; tot+=o.amp; }
    dx[y*gw+x]=(vx/tot-.5)*2.6; dy[y*gw+x]=(vy/tot-.5)*2.6; }
  return DISP={dx,dy,gw,gh};
}
function sketchify(cv,px,ox,oy){
  const w=cv.width, h=cv.height; if(!w||!h) return;
  const c=cv.getContext('2d'), src=c.getImageData(0,0,w,h), out=c.createImageData(w,h), s=src.data, d=out.data, F=dispField(), gw=F.gw, gh=F.gh;
  for(let j=0;j<h;j++){ const wy=oy+j/px, gy=Math.min(gh-1,Math.max(0,wy|0));
    for(let i=0;i<w;i++){ const wx=ox+i/px, gx=Math.min(gw-1,Math.max(0,wx|0)), g=gy*gw+gx;
      let si=Math.round(i+F.dx[g]*px), sj=Math.round(j+F.dy[g]*px); si=si<0?0:si>=w?w-1:si; sj=sj<0?0:sj>=h?h-1:sj;
      const a=(sj*w+si)*4, b=(j*w+i)*4, al=s[a+3]; if(!al){ continue; }
      const hx=(wx*1.4)|0, hy=(wy*1.4)|0; let n=((hx*374761393+hy*668265263)^(hx*1274126177))>>>0; n=((n^(n>>>13))*1274126177>>>0)/4294967296;
      const k=.11*n; d[b]=s[a]*(1-k)+89*k; d[b+1]=s[a+1]*(1-k)+64*k; d[b+2]=s[a+2]*(1-k)+38*k; d[b+3]=al; } }
  c.putImageData(out,0,0);
}

/* ---------- cached layers ---------- */
function mkCanvas(w,h){ const c=document.createElement('canvas'); c.width=Math.max(1,Math.ceil(w)); c.height=Math.max(1,Math.ceil(h)); return c; }
function layerPx(){ return Math.min(3,Math.max(1,scale*dpr)); }
function ensureLayers(){
  const px=layerPx(), key=px+'|'+lvlIdx+'|'+R.fonts;
  if(key!==R.key || R.objs!==objs){
    R.key=key; R.objs=objs; R.px=px; R.neonKey=null; R.lit=null; R.spr.clear(); R.glowPrev.clear(); R.hitAt.clear(); R.face.clear();
    // indigo + faint grid
    R.bg=mkCanvas(W*px,H*px); const b=R.bg.getContext('2d'); b.setTransform(px,0,0,px,0,0);
    b.fillStyle=C.bg; b.fillRect(0,0,W,H); b.globalAlpha=.5; b.strokeStyle=C.grid; b.lineWidth=1; b.beginPath();
    for(let x=0;x<=W;x+=26){ b.moveTo(x+.5,0); b.lineTo(x+.5,H); } for(let y=0;y<=H;y+=26){ b.moveTo(0,y+.5); b.lineTo(W,y+.5); } b.stroke(); b.globalAlpha=1;
    if(!R.litPending){ R.litPending=true; setTimeout(()=>{ R.litPending=false; if(L){ buildLit(); for(const o of objs) if(o.knock){ sprite(o,false); sprite(o,true); } } },40); }   // build the sketch house while the intro card is up
  }
  const nk=objs.filter(o=>o.down).map(o=>o.id).join(',');
  if(nk!==R.neonKey){ R.neonKey=nk; buildNeon(); }
}
function buildNeon(){
  const px=R.px; R.neon=mkCanvas(W*px,H*px); const c=R.neon.getContext('2d'); c.setTransform(px,0,0,px,0,0);
  c.shadowColor=C.cyan; c.shadowBlur=7*px;   // glow is baked in once, never per frame
  const P=mkPen(c,'neon');
  for(const o of objs){ if(o.ent) continue; drawThing(P,o,o.down); }
}
function buildLit(){
  if(R.lit && R.lit.objs===objs) return;
  const px=R.px, cv=mkCanvas(W*px,H*px), c=cv.getContext('2d'); c.setTransform(px,0,0,px,0,0);
  c.fillStyle='#efe3cb'; c.fillRect(0,0,W,H);
  for(const f of (L.floors||[{x:20,y:70,w:360,h:610,kind:'wood'}])) drawFloor(c,f);
  for(const d of (L.decor||[])) if(d.kind!=='table') drawDecor(c,d);
  if(L.goal.kind==='bed') drawGoalInk(c);
  const P=mkPen(c,'ink');
  for(const o of objs) if(!o.ent && !o.knock && o.name==='wall') drawThing(P,o);
  for(const o of objs) if(!o.ent && !o.knock && o.name!=='wall') drawThing(P,o);
  for(const d of (L.decor||[])) if(d.kind==='table') drawDecor(c,d);
  if(L.goal.kind!=='bed') drawGoalInk(c);
  sketchify(cv,px,0,0);
  R.lit={cv,objs};
}
function sprite(o,fallen){
  const k=o.id+(fallen?'f':'s'); let s=R.spr.get(k); if(s) return s;
  const c0=center(o), ext=(o.t==='r'?Math.max(o.w,o.h)/2:o.r)+34, x0=Math.floor(c0.x-ext), y0=Math.floor(c0.y-ext), px=R.px;
  const cv=mkCanvas(ext*2*px,ext*2*px), c=cv.getContext('2d'); c.setTransform(px,0,0,px,-x0*px,-y0*px);
  drawThing(mkPen(c,'ink'),o,fallen); sketchify(cv,px,x0,y0);
  s={cv,x:x0,y:y0,w:ext*2,h:ext*2}; R.spr.set(k,s); return s;
}
if(document.fonts && document.fonts.load){
  Promise.all([document.fonts.load(`12px Audiowide`),document.fonts.load(`12px "Space Grotesk"`),document.fonts.load(`600 12px "Space Grotesk"`)])
    .then(()=>{ R.fonts=true; }).catch(()=>{});
}

/* ---------- Nala ----------
   Ported from the canvas boards (project/NalaHero.dc.html + NalaHerself.dc.html), drawn with her
   head toward −y in a ~52-unit-long frame. hero=true → Super Sniffer (L); false → herself (K).  */
const NK={leg:'#b8743a',body:'#c98446',head:'#cf8c4c',out:'#6e3f1c',wr:'#8a5428',roll:'#a9672f',ear:'#9c5a2a',muz:'#5b3220',nose:'#1e120c',eye:'#3a2214',
  cape:'#1f7f8c',gold:'#f2c14e',emb:'#1f4f58',mask:'#1d2340',maskO:'#0f1325',slit:'#e8dccb',tongue:'#e8798c'};
function spring(tt,str,k){ return tt<=0?0:str*Math.exp(-tt*k)*Math.sin(tt*30); }
function bonkCurve(b){ if(!b||b.t>1.1) return 0; const A=.06+.5*b.str, v=A*Math.exp(-b.t*7)*Math.cos(b.t*24); return v<0&&b.str>.55?v*1.7:v; }
function drawNala(c,x,y,a,o){
  // o: {hero, dark, bonk, speed, diz, flop(0..1), sleep, alpha}
  const mv=clamp((o.speed||0)/220,0,1), ph=t*(6+16*mv), bt=o.bonk?o.bonk.t:9, bs=o.bonk?o.bonk.str:0, fl=o.flop||0;
  c.save(); c.translate(x,y); if(o.alpha!=null) c.globalAlpha=o.alpha;
  if(o.dark){ c.drawImage(halo(),-46,-46,92,92); }
  // bonk: flatten against the surface (contact side stays put), then spring back past round ("boing")
  const sq=bonkCurve(o.bonk);
  if(sq){ const an=Math.atan2(o.bonk.ny,o.bonk.nx); c.rotate(an); c.translate(-DOG_R*sq*.9,0); c.scale(1-sq,1+sq*.55); c.rotate(-an); }
  c.rotate(a+Math.PI/2+(o.diz?Math.sin(t*9)*.08*Math.min(1,o.diz):0));
  if(o.sleep) c.scale(1+.012*Math.sin(t*2.2),1+.012*Math.sin(t*2.2));
  c.translate(0,4);
  c.lineCap='round'; c.lineJoin='round';
  const S=(p,fill,lw,col)=>{ if(fill){ c.fillStyle=fill; c.fill(p); } c.lineWidth=lw; c.strokeStyle=col||NK.out; c.stroke(p); };
  const Lq=(x1,y1,cx,cy,x2,y2,col,lw,al)=>{ c.globalAlpha=(o.alpha==null?1:o.alpha)*al; c.beginPath(); c.moveTo(x1,y1); c.quadraticCurveTo(cx,cy,x2,y2); c.strokeStyle=col; c.lineWidth=lw; c.stroke(); c.globalAlpha=o.alpha==null?1:o.alpha; };
  // legs (walk cycle: diagonal pairs) — splay to one side on a flop
  const st=Math.sin(ph)*2.2*mv;
  const legs=[[-11,-8,st],[11,-8,-st],[-11,9,-st],[11,9,st]];
  const FLOP=[[16,-10],[17,-3],[16,6],[17,13]];   // on a flop all four legs stick straight out to one side
  if(fl) c.rotate(fl*.32);
  legs.forEach(([lx,ly,s],i)=>{ const fx=lx+(FLOP[i][0]-lx)*fl, fy=ly+s+(FLOP[i][1]-ly)*fl;
    S(el(fx,fy,3+fl*3.6,4-fl*1.6,0),NK.leg,1.3); });
  // tail nub wag
  const wag=Math.sin(t*(o.sleep?2:mv>.1?18:7))*(o.sleep?.4:1.4);
  S(ci(wag,18.5,3.6),NK.body,1.3);
  c.save();
  S(el(fl*1.5,2,12.5+fl*2.5,16,0),NK.body,1.5);
  // back wrinkles: each roll springs on a short delay after a bonk
  const J=(i,k)=>spring(bt-.03*i,2.4*bs*(k||1),6);
  [[-9,1,-3,9],[-10,6,2,10],[-9,11,7,9]].forEach(([x1,y1,cy,x2],i)=>{ const j=J(i+3); Lq(x1-j*.3,y1+j,0,cy+j*1.5,x2+j*.3,y1+j,NK.wr,1,.7); });
  if(o.hero){
    const fx=mv*4+Math.sin(t*(4+10*mv))*(.6+1.6*mv), fy=19+mv*5, wv=Math.sin(t*(5+12*mv)+1)*(.8+2*mv);
    const cape=pth(p=>{ p.moveTo(-12,-5); p.quadraticCurveTo(0,-9,12,-5); p.lineTo(17+fx*.5,fy+wv*.5); p.quadraticCurveTo(0,fy+8+wv,-17-fx*.5,fy-wv*.5); p.closePath(); });
    S(cape,NK.cape,1.1,NK.gold);
    Lq(-6,-3,-7.5,8,-9-fx*.25,fy-1,NK.gold,.6,.5); Lq(6,-3,7.5,8,9+fx*.25,fy-1,NK.gold,.6,.5);
    S(ci(0,7,5.2),NK.gold,.8,NK.gold);
    c.strokeStyle=NK.emb; c.lineWidth=.8; c.beginPath(); c.arc(-1.5,9.6,1.5,0,TAU); c.stroke();
    c.beginPath(); c.arc(-1.5,9.6,3.6,-1.15,-.05); c.stroke(); c.beginPath(); c.arc(-1.5,9.6,5.8,-1.05,-.15); c.stroke();
  }
  // the neck roll — the big one
  [[-12,-6,-13,12],[-11,-2,-8,11]].forEach(([x1,y1,cy,x2],i)=>{ const j=J(i+1,1.35); Lq(x1-j*.4,y1+j,0,cy+j*1.6,x2+j*.4,y1+j,NK.roll,2.2,1); });
  if(o.hero){ c.fillStyle=NK.gold; c.fill(ci(-9,-6+J(1),1.6)); c.fill(ci(9,-6+J(1),1.6)); }
  c.restore();
  // head
  c.save(); if(fl){ c.translate(0,-10); c.rotate(-fl*.55); c.translate(0,10); } if(o.diz) c.rotate(Math.sin(t*11)*.12*Math.min(1,o.diz));
  const hj=J(0,.8);
  S(ci(0,-14+hj*.3,10.5),NK.head,1.5);
  [[-7,-9,-12,7],[-7,-13,-16,7],[-6,-17,-20,6]].forEach(([x1,y1,cy,x2],i)=>{ const j=spring(bt-.02*i,1.8*bs,6); Lq(x1-j*.3,y1+j,0,cy+j*1.4,x2+j*.3,y1+j,NK.wr,1,.75); });
  const ear=pth(p=>{ p.moveTo(-6,-20); p.lineTo(-10,-22); p.lineTo(-8,-16); p.closePath(); p.moveTo(6,-20); p.lineTo(10,-22); p.lineTo(8,-16); p.closePath(); });
  S(ear,NK.ear,1.1);
  S(el(0,-22.5,7.8,7,0),NK.head,1.4);
  // sniff: the nose wiggles while she waits
  const sn=(!mv&&!o.sleep&&!fl)?Math.max(0,Math.sin(t*3.1))**8*.6:0;
  S(el(0,-25.5-sn,5.5,4,0),NK.muz,1);
  c.fillStyle=NK.nose; c.fill(el(0,-28-sn*1.4,2.6,2,0));
  if(fl){ c.fillStyle=NK.tongue; c.fill(el(5.5,-25,2,3.2,-.6)); c.lineWidth=.6; c.strokeStyle='#9c3f52'; c.stroke(el(5.5,-25,2,3.2,-.6)); }
  if(o.hero){ S(pth(p=>{ p.moveTo(-9,-19.5); p.quadraticCurveTo(0,-22,9,-19.5); p.quadraticCurveTo(9,-15.5,5,-15.5); p.quadraticCurveTo(0,-17.5,-5,-15.5); p.quadraticCurveTo(-9,-15.5,-9,-19.5); p.closePath(); }),NK.mask,.9,NK.maskO); }
  c.strokeStyle=o.hero?NK.slit:NK.eye; c.lineWidth=.9; c.beginPath(); c.moveTo(-4.6,-17.6); c.quadraticCurveTo(-3,-16.5,-1.4,-17.6); c.moveTo(1.4,-17.6); c.quadraticCurveTo(3,-16.5,4.6,-17.6); c.stroke();
  c.restore();
  c.restore();
  // dizzy stars orbit her head
  if(o.diz>0){ const hx=x+Math.cos(a)*16, hy=y+Math.sin(a)*16, al=Math.min(1,o.diz);
    for(let i=0;i<3;i++){ const an=t*6+i*TAU/3; star4(c,hx+Math.cos(an)*15,hy+Math.sin(an)*6-4,3.6,C.yel,al,o.dark); } }
}
let HALO=null;
function halo(){ if(HALO) return HALO; HALO=mkCanvas(92,92); const c=HALO.getContext('2d'), g=c.createRadialGradient(46,46,6,46,46,46);
  g.addColorStop(0,'rgba(255,179,107,.26)'); g.addColorStop(.5,'rgba(255,140,90,.09)'); g.addColorStop(1,'rgba(255,120,80,0)'); c.fillStyle=g; c.fillRect(0,0,92,92); return HALO; }
function star4(c,x,y,r,col,al,dark){ c.save(); c.globalAlpha=al; c.translate(x,y); c.beginPath();
  for(let i=0;i<8;i++){ const rr2=i%2?r*.38:r, an=i*Math.PI/4-Math.PI/2; i?c.lineTo(Math.cos(an)*rr2,Math.sin(an)*rr2):c.moveTo(Math.cos(an)*rr2,Math.sin(an)*rr2); } c.closePath();
  if(dark){ c.strokeStyle='rgba(255,224,102,.35)'; c.lineWidth=3; c.stroke(); } else { c.strokeStyle=C.ink2; c.lineWidth=1; c.stroke(); }
  c.fillStyle=col; c.fill(); c.restore(); }

/* ---------- Stella, Binx, treat ---------- */
function drawStella(c,o,mode,al,a){
  const k=.8; c.save(); c.translate(o.x,o.y); c.rotate(a); c.scale(k,k); c.globalAlpha=al; c.lineCap='round'; c.lineJoin='round';
  const ink=mode==='ink', fill=ink?'#9aa0aa':C.bg, out=ink?'#4a4e57':'#c9ccd6';
  const wag=Math.sin(t*(o.glow>.2?16:4))*(o.glow>.2?4:1.5);
  const parts=[el(-6,-8,2,3),el(6,-8,2,3),el(-6,9,2,3),el(6,9,2,3),null,el(0,1,7,13),el(0,-17,5,6.5),el(0,-25,2.8,5)];
  const draw=(lw,col,fillIt)=>{ c.strokeStyle=col; c.lineWidth=lw;
    for(const p of parts){ if(!p){ c.beginPath(); c.moveTo(0,13); c.quadraticCurveTo(3+wag,20,1+wag*1.3,25); c.stroke(); continue; } if(fillIt){ c.fillStyle=fill; c.fill(p); } c.stroke(p); }
    c.beginPath(); c.moveTo(-4,-21); c.lineTo(-8,-18); c.moveTo(4,-21); c.lineTo(8,-18); c.stroke(); };
  if(!ink){ c.globalAlpha=al*.25; draw(5,out,false); c.globalAlpha=al; }
  draw(1.4,out,true);
  c.fillStyle=ink?'#4a4e57':'#e6e9f0'; c.fill(ci(0,-29.5,1.4));
  c.restore();
}
function drawBinx(c,o,mode,al){
  const k=.85, ink=mode==='ink'; c.save(); c.translate(o.x,o.y); c.rotate(.35); c.scale(k,k); c.globalAlpha=al; c.lineCap='round'; c.lineJoin='round';
  const out=ink?'#2b2b33':C.pur, sw=Math.sin(t*1.7)*3, swat=o.used&&o.glow>.6;
  const tail=()=>{ c.beginPath(); c.moveTo(0,9); c.quadraticCurveTo(12+sw,16,6+sw,24); c.quadraticCurveTo(2+sw*.5,28,-2,24); };
  const body=[el(0,3,8,10),pth(p=>{ p.moveTo(-7,-9); p.lineTo(-8,-18); p.lineTo(-2,-12); p.closePath(); p.moveTo(7,-9); p.lineTo(8,-18); p.lineTo(2,-12); p.closePath(); }),ci(0,-8,7)];
  if(swat) body.push(el(10,-14,3.4,4.2,.4));
  const pass=(lw,fillIt)=>{ c.strokeStyle=out; c.lineWidth=lw+.9; tail(); c.stroke(); c.lineWidth=lw; for(const p of body){ if(fillIt){ c.fillStyle='#05030d'; c.fill(p); } c.stroke(p); } };
  if(!ink){ c.globalAlpha=al*.25; pass(5,false); c.globalAlpha=al; }
  pass(1.4,true);
  c.fillStyle=C.yel; c.fill(el(-2.8,-9,1.7,2)); c.fill(el(2.8,-9,1.7,2));
  c.fillStyle='#05030d'; c.fill(rr(-3.2,-10.5,.8,3,.4)); c.fill(rr(2.4,-10.5,.8,3,.4));
  c.restore();
}
function binxEye(o){ const k=.85, a=.35, cs=Math.cos(a), sn=Math.sin(a), pt=(u,v)=>({x:o.x+(u*cs-v*sn)*k,y:o.y+(u*sn+v*cs)*k}); return [pt(-2.8,-9),pt(2.8,-9)]; }
function drawTreat(c,o,mode,al){
  c.save(); c.translate(o.x,o.y); c.rotate(.5); c.globalAlpha=al;
  const p=new Path2D(); p.addPath(rr(-5,-1.8,10,3.6,1.5)); for(const [a,b] of [[-5,-2],[-5,2],[5,-2],[5,2]]) p.addPath(ci(a,b,2.4));
  if(mode==='ink'){ c.fillStyle='#d9a35f'; c.fill(p); c.strokeStyle=C.ink; c.lineWidth=1; c.stroke(p); }
  else { c.strokeStyle='rgba(255,224,102,.3)'; c.lineWidth=4; c.stroke(p); c.strokeStyle=C.yel; c.lineWidth=1.3; c.stroke(p); }
  c.restore();
}
function drawEnt(o,mode,al){
  if(o.ent==='stella'){ const p=entPos(o), q=p===o?o:Object.assign({},o,p); let f=R.face.get(o.id); const want=Math.atan2(dog.y-q.y,dog.x-q.x)+Math.PI/2;
    f=f==null?want:lerpAngle(f,want,.05); R.face.set(o.id,f); drawStella(ctx,q,mode,al,f); }
  else if(o.ent==='binx') drawBinx(ctx,o,mode,al);
  else if(o.ent==='treat') drawTreat(ctx,o,mode,al);
}

/* ---------- neon (dark) layers ---------- */
function flicker(o){
  const prev=R.glowPrev.get(o)||0; if(o.glow>prev+.05) R.hitAt.set(o,t); R.glowPrev.set(o,o.glow);
  const h=R.hitAt.get(o); if(h==null) return 1; const d=t-h; if(d>.5) return 1;
  return [1,.15,.9,.05,1,.35,.8,.1,1,.6,1,.85][Math.floor(d*24)%12];   // a sign getting smacked
}
function bbox(o,pad){ return o.t==='r'?[o.x-pad,o.y-pad,o.w+pad*2,o.h+pad*2]:[o.x-o.r-pad,o.y-o.r-pad,(o.r+pad)*2,(o.r+pad)*2]; }
function blitNeon(x,y,w,h,al){ const x0=Math.max(0,x), y0=Math.max(0,y), x1=Math.min(W,x+w), y1=Math.min(H,y+h); if(x1<=x0||y1<=y0||al<=0) return;
  const px=R.px; ctx.globalAlpha=al; ctx.drawImage(R.neon,x0*px,y0*px,(x1-x0)*px,(y1-y0)*px,x0,y0,x1-x0,y1-y0); ctx.globalAlpha=1; }
function drawGlows(){
  for(const o of objs){
    const fk=flicker(o);
    if(o.glow<=0 || (!o.solid && !o.down)) continue;
    const a=Math.min(1,o.glow)*fk;
    if(o.ent){ drawEnt(o,'neon',a); continue; }
    const [bx,by,bw,bh]=bbox(o,o.down?34:9); blitNeon(bx,by,bw,bh,a);
    if(!o.down){ ctx.save(); ctx.globalAlpha=a*.5; ctx.strokeStyle=C.cyan; ctx.lineWidth=5; shapePath(ctx,o); ctx.stroke(); ctx.globalAlpha=a; ctx.lineWidth=2; ctx.strokeStyle='#bffcff'; ctx.stroke(); ctx.restore(); }
    if(a>.25 && o.name!=='wall' && o.name!=='table leg'){ const c=center(o);
      glowText(o.name.toUpperCase(),c.x,o.t==='c'?c.y-o.r-9:c.y+4,`10px ${FT}`,'#bffcff',C.cyan,a); }
  }
  for(const o of objs) if(o.ent==='stella' && o.used && !o.glow && STELLA_KEEPS){ const a=.18+.06*Math.sin(t*2); drawEnt(o,'neon',a); }   // met: she waits to the side, faintly
  for(const o of objs) if(o.down && o.glow<=0){ const [bx,by,bw,bh]=bbox(o,34); blitNeon(bx,by,bw,bh,.16); }   // knocked-over things keep a faint afterglow
}
function glowText(txt,x,y,font,fill,glow,al){
  ctx.save(); ctx.globalAlpha=al; ctx.font=font; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.lineJoin='round'; ctx.strokeStyle=glow; ctx.globalAlpha=al*.3; ctx.lineWidth=5; ctx.strokeText(txt,x,y); ctx.globalAlpha=al; ctx.fillStyle=fill; ctx.fillText(txt,x,y); ctx.restore();
}
function drawScent(){
  const g=goalCenter(), dd=Math.hypot(dog.x-g.x,dog.y-g.y), near=clamp(1-dd/350,0,1);
  ctx.lineWidth=1.6;
  for(let i=0;i<3;i++){ const ph=(t*.5+i/3)%1, r=8+ph*40, a=(1-ph)*(.08+.4*near);
    ctx.strokeStyle=`rgba(255,224,102,${a*.35})`; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(g.x,g.y,r,0,TAU); ctx.stroke();
    ctx.strokeStyle=`rgba(255,224,102,${a})`; ctx.lineWidth=1.5; ctx.stroke(); }
  ctx.fillStyle=`rgba(255,224,102,${.05+.2*near})`; ctx.beginPath(); ctx.arc(g.x,g.y,5,0,TAU); ctx.fill();
}
function drawPings(lit){
  for(const p of pings){
    const k=p.t/p.life, r=Math.max(1,p.maxR*(1-Math.pow(1-k,3))), a=1-k;
    if(!lit){
      ctx.save(); ctx.beginPath(); ctx.arc(p.x,p.y,r,0,TAU); ctx.clip();
      const gr=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r); gr.addColorStop(0,`rgba(255,61,242,${a*.16})`); gr.addColorStop(.7,`rgba(255,61,242,${a*.04})`); gr.addColorStop(1,'rgba(255,61,242,0)');
      ctx.fillStyle=gr; ctx.fillRect(p.x-r,p.y-r,r*2,r*2);
      blitNeon(Math.max(0,p.x-r),Math.max(0,p.y-r),Math.min(W,r*2),Math.min(H,r*2),a*.9);
      for(const o of objs) if(o.ent&&!o.gone) drawEnt(o,'neon',a);
      ctx.restore();
    }
    const col=lit?'255,61,242':'255,61,242';
    ctx.strokeStyle=`rgba(${col},${a*.25})`; ctx.lineWidth=6; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,TAU); ctx.stroke();
    ctx.strokeStyle=`rgba(${col},${a*.8})`; ctx.lineWidth=2; ctx.stroke();
    ctx.lineWidth=1; ctx.strokeStyle=`rgba(${col},${a*.3})`; ctx.beginPath(); ctx.arc(p.x,p.y,r*.74,0,TAU); ctx.stroke();
    ctx.strokeStyle=`rgba(${col},${a*.15})`; ctx.beginPath(); ctx.arc(p.x,p.y,r*.48,0,TAU); ctx.stroke();
  }
}
function drawBinxEyes(){
  for(const o of objs){ if(o.ent!=='binx') continue; const ph=(t+o.id*.7)%4.6; if(ph>.55) continue;
    const a=Math.sin(ph/.55*Math.PI)*.85; for(const e of binxEye(o)){ ctx.fillStyle=`rgba(255,224,102,${a*.25})`; ctx.beginPath(); ctx.arc(e.x,e.y,4,0,TAU); ctx.fill();
      ctx.fillStyle=`rgba(255,224,102,${a})`; ctx.beginPath(); ctx.ellipse(e.x,e.y,1.6,1.2,0,0,TAU); ctx.fill(); } }
}
function drawPrints(){ for(const p of prints){ const a=(1-p.age/3)*.4; ctx.fillStyle=`rgba(255,154,61,${a})`; ctx.beginPath(); ctx.arc(p.x,p.y,2.2,0,TAU); ctx.fill(); } }
function drawParts(lit){ for(const p of parts){ ctx.globalAlpha=clamp(p.life,0,1); ctx.fillStyle=p.c; ctx.fillRect(p.x,p.y,p.s,p.s); if(!lit){ ctx.globalAlpha*=.3; ctx.fillRect(p.x-1,p.y-1,p.s+2,p.s+2); } } ctx.globalAlpha=1; }

/* ---------- lights on (Storybook Sketch) ---------- */
function drawLit(alpha,isDown){
  if(!R.lit || R.lit.objs!==objs) buildLit();
  ctx.save(); ctx.globalAlpha=alpha;
  ctx.drawImage(R.lit.cv,0,0,W,H);
  for(const o of objs){ if(!o.knock) continue; const s=sprite(o,isDown(o)); ctx.drawImage(s.cv,s.x,s.y,s.w,s.h); }
  for(const o of objs){ if(!o.ent || (o.ent==='treat' && isDown(o))) continue; drawEnt(o,'ink',alpha); }
  ctx.restore();
}
const PATHC=['#3f7fd8','#2fa37a','#e08a2e','#7a3cff','#d9534f'];
function drawReplayPath(end){
  const fr=rec.frames; let att=0, started=false; const segs=[[]];
  for(let i=0;i<=end;i++){ const f=fr[i]; if(f.reset){ segs.push([]); continue; } segs[segs.length-1].push(f); }
  ctx.lineJoin='round'; ctx.lineCap='round';
  segs.forEach((s,i)=>{ if(s.length<2) return; const cur=i===segs.length-1;
    ctx.beginPath(); ctx.moveTo(s[0].x,s[0].y); for(let j=1;j<s.length;j+=2) ctx.lineTo(s[j].x,s[j].y); ctx.lineTo(s[s.length-1].x,s[s.length-1].y);
    if(cur){ ctx.setLineDash([]); ctx.strokeStyle=C.mag; ctx.lineWidth=2.6; }
    else { ctx.setLineDash([5,4]); ctx.strokeStyle=PATHC[i%PATHC.length]; ctx.lineWidth=2.2; }
    ctx.stroke(); ctx.setLineDash([]);
    if(!cur){ const e=s[s.length-1]; ctx.strokeStyle=PATHC[i%PATHC.length]; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(e.x,e.y,4,0,TAU); ctx.stroke(); } });
  ctx.fillStyle=C.mag; ctx.beginPath(); ctx.arc(L.start.x,L.start.y,5,0,TAU); ctx.fill();
  return segs.length;
}
function sticker(x,y,col,label,right){
  ctx.save(); ctx.translate(x,y); ctx.beginPath();
  for(let i=0;i<12;i++){ const r=i%2?4.4:8, an=i*Math.PI/6; i?ctx.lineTo(Math.cos(an)*r,Math.sin(an)*r):ctx.moveTo(Math.cos(an)*r,Math.sin(an)*r); } ctx.closePath();
  ctx.fillStyle=col; ctx.fill(); ctx.strokeStyle=C.ink2; ctx.lineWidth=1; ctx.stroke();
  if(label){ ctx.rotate(-.1); ctx.font=`8.5px ${FT}`; ctx.textAlign=right?'right':'left'; ctx.textBaseline='alphabetic';
    ctx.lineJoin='round'; ctx.strokeStyle=C.paper; ctx.lineWidth=2.6; const lx=right?-10:10; ctx.strokeText(label,lx,-6); ctx.fillStyle=C.ink2; ctx.fillText(label,lx,-6); }
  ctx.restore();
}
function drawStickers(){
  const ev=rec.events.slice(0,rp.ev), hits=ev.filter(e=>e.k==='hit'), lab=new Set(hits.slice(-8));
  for(const e of ev){
    const right=e.x>W-90;
    if(e.k==='hit') sticker(e.x,e.y,C.yel,lab.has(e)?e.w.replace(/!$/,'').toUpperCase():'',right);
    else if(e.k==='knock') sticker(e.x,e.y,'#ff8a5c',e.w.replace(/!$/,''),right);
    else if(e.k==='treat') sticker(e.x,e.y,'#b6ff3d','+1 TREAT',right);
    else if(e.k==='stella') sticker(e.x,e.y,'#e6e9f0','BORF! +1',right);
    else if(e.k==='binx') sticker(e.x,e.y,'#d9a3ff','SMACK −1',right);
  }
}
function zzz(x,y){ const txt=(GOALFX[L.goal.kind]||GOALFX.bed).fx; ctx.save(); ctx.textAlign='left'; ctx.lineJoin='round'; ctx.lineWidth=2;
  for(let i=0;i<3;i++){ const ph=(t*.6+i/3)%1, al=Math.sin(ph*Math.PI); ctx.globalAlpha=al; ctx.strokeStyle=C.paper; ctx.fillStyle=C.ink2;
    const X=x+10+ph*14+i*2, Y=y-12-ph*16; ctx.font=`${7+ph*4}px ${FT}`; ctx.strokeText(txt,X,Y); ctx.fillText(txt,X,Y); } ctx.restore(); }

/* ---------- aim, words, toasts, HUD ---------- */
function powCol(p){ return p<.5?mix(C.cyan,C.yel,p*2):mix(C.yel,C.mag,(p-.5)*2); }
function drawAim(){
  if(!aim||aim.pow<.03) return;
  ctx.strokeStyle='rgba(41,246,255,.22)'; ctx.lineWidth=1; ctx.setLineDash([3,5]);
  ctx.beginPath(); ctx.moveTo(aim.sx,aim.sy); ctx.lineTo(aim.cx,aim.cy); ctx.stroke(); ctx.setLineDash([]);
  const col=powCol(aim.pow), s=24, e=24+aim.pow*110;
  const x0=dog.x+aim.dx*s, y0=dog.y+aim.dy*s, x1=dog.x+aim.dx*e, y1=dog.y+aim.dy*e, an=Math.atan2(aim.dy,aim.dx);
  ctx.lineCap='round'; ctx.strokeStyle=col;
  ctx.globalAlpha=.25; ctx.lineWidth=9; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
  ctx.globalAlpha=1; ctx.lineWidth=3; ctx.stroke();
  ctx.fillStyle=col; ctx.beginPath();
  ctx.moveTo(x1+Math.cos(an)*11,y1+Math.sin(an)*11); ctx.lineTo(x1+Math.cos(an+2.4)*10,y1+Math.sin(an+2.4)*10); ctx.lineTo(x1+Math.cos(an-2.4)*10,y1+Math.sin(an-2.4)*10); ctx.fill();
  const pct=aim.pow>=1?'MAX':Math.round(aim.pow*100)+'%';
  glowText(pct,clamp(x1+Math.cos(an)*26,24,W-24),clamp(y1+Math.sin(an)*26,HUD+14,H-8),`12px ${FT}`,'#fff',col,1);
  const fx=clamp(aim.cx,20,W-20), fy=clamp(aim.cy,HUD+20,H-20);
  ctx.strokeStyle='rgba(41,246,255,.18)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(fx,fy,16,0,TAU); ctx.stroke();
  ctx.strokeStyle=col; ctx.beginPath(); ctx.arc(fx,fy,16,-Math.PI/2,-Math.PI/2+TAU*aim.pow); ctx.stroke();
}
function drawWords(lit){
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.lineJoin='round';
  for(const w of words){ const k=w.t/w.life, pop=w.t<.1?w.t/.1*1.25:1+.25*Math.max(0,1-(w.t-.1)/.15);
    ctx.save(); ctx.translate(w.x,w.y); ctx.rotate(w.rot); ctx.scale(pop,pop); const al=1-k*k;
    ctx.font=`${Math.round(13+14*w.size)}px ${FT}`;
    if(lit){ ctx.globalAlpha=al; ctx.strokeStyle=C.paper; ctx.lineWidth=4; ctx.strokeText(w.txt,0,0); ctx.fillStyle=C.ink2; ctx.fillText(w.txt,0,0); }
    else { const g=w.col||C.mag; ctx.globalAlpha=al*.3; ctx.strokeStyle=g; ctx.lineWidth=7; ctx.strokeText(w.txt,0,0);
      ctx.globalAlpha=al; ctx.lineWidth=2.2; ctx.strokeText(w.txt,0,0); ctx.fillStyle=w.col?'#fff':'#ffe1fb'; ctx.fillText(w.txt,0,0); }
    ctx.restore(); }
  ctx.textBaseline='alphabetic';
}
function pill(txt,y){
  ctx.font=`600 13px ${FB}`; const w=Math.min(384,ctx.measureText(txt).width+30);
  ctx.fillStyle='rgba(20,10,51,.92)'; ctx.fill(rr(W/2-w/2,y-15,w,30,15)); ctx.strokeStyle='rgba(41,246,255,.55)'; ctx.lineWidth=1.2; ctx.stroke(rr(W/2-w/2,y-15,w,30,15));
  ctx.fillStyle=C.txt; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(txt,W/2,y+1,370); ctx.textBaseline='alphabetic';
}
function fitText(txt,maxW){ if(ctx.measureText(txt).width<=maxW) return txt; while(txt.length>3 && ctx.measureText(txt+'…').width>maxW) txt=txt.slice(0,-1); return txt+'…'; }
function drawToast(lit){
  if(!toast) return; const k=toast.t, life=state==='recap'?1.6:3.2, a=clamp(Math.min(1,k/.15,(life-k)/.3),0,1), y=HUD+8+(k<.15?(1-k/.15)*-12:0);
  const isB=/binx/i.test(toast.who), m=toast.txt.match(/\s+([+−-]1 move)$/i), body=m?toast.txt.slice(0,m.index):toast.txt, tag=m?m[1].toUpperCase():'';
  const col=isB?C.pur:'#c9ccd6', head=isB?'BINX SMACKED YOU':'STELLA SAYS', x=10, w=W-20, h=50;
  ctx.save(); ctx.globalAlpha=a;
  if(lit){ ctx.fillStyle=C.paper; ctx.fill(rr(x,y,w,h,14)); ctx.strokeStyle=C.ink; ctx.lineWidth=1.5; ctx.stroke(rr(x,y,w,h,14)); }
  else { ctx.fillStyle='rgba(20,10,51,.95)'; ctx.fill(rr(x,y,w,h,14)); ctx.strokeStyle=col; ctx.globalAlpha=a*.35; ctx.lineWidth=6; ctx.stroke(rr(x,y,w,h,14)); ctx.globalAlpha=a; ctx.lineWidth=1.5; ctx.stroke(rr(x,y,w,h,14)); }
  // portrait
  const fake={x:x+25,y:y+h/2+(isB?3:6),glow:isB?1:0,used:true,id:-1};
  ctx.save(); ctx.beginPath(); ctx.rect(x+4,y+3,42,h-6); ctx.clip();
  if(isB) drawBinx(ctx,fake,lit?'ink':'neon',a); else drawStella(ctx,fake,lit?'ink':'neon',a,0);
  ctx.restore();
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  ctx.font=`12px ${FT}`; ctx.fillStyle=lit?C.ink:(isB?'#d9a3ff':'#e6e9f0'); ctx.fillText(head,x+52,y+20);
  let tw=0; if(tag){ ctx.font=`13px ${FT}`; tw=ctx.measureText(tag).width; ctx.textAlign='right'; ctx.fillStyle=lit?'#c02fb4':C.mag; ctx.fillText(tag,x+w-12,y+30); ctx.textAlign='left'; }
  ctx.font=`13px ${FB}`; ctx.fillStyle=lit?C.ink2:C.txt; ctx.fillText(fitText(body,w-64-(tw?tw+14:0)),x+52,y+38);
  ctx.restore();
}
function pawIcon(x,y,s,col,al){ ctx.save(); ctx.translate(x,y); ctx.scale(s,s); ctx.globalAlpha=al; ctx.strokeStyle=col; ctx.lineWidth=1.4;
  ctx.beginPath(); ctx.ellipse(0,3.5,4.2,3.5,0,0,TAU); for(const [a,b] of [[-5.5,-1.5],[-2,-5],[2,-5],[5.5,-1.5]]){ ctx.moveTo(a+1.8,b); ctx.arc(a,b,1.8,0,TAU); } ctx.stroke(); ctx.restore(); }
function drawHUD(lit){
  ctx.fillStyle=lit?C.paper:C.bar; ctx.fillRect(0,0,W,HUD);
  ctx.fillStyle=lit?'#d8ccb8':C.line; ctx.fillRect(0,HUD-1,W,1);
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  const title=`${lvlIdx+1} · ${L.name.toUpperCase()}`;
  ctx.font=`15px ${FT}`;
  if(lit){ ctx.fillStyle=C.ink; ctx.fillText(title,12,26); }
  else { ctx.globalAlpha=.35; ctx.strokeStyle=C.cyan; ctx.lineWidth=4; ctx.lineJoin='round'; ctx.strokeText(title,12,26); ctx.globalAlpha=1; ctx.fillStyle=C.cyan; ctx.fillText(title,12,26); }
  ctx.font=`12px ${FB}`; ctx.fillStyle=lit?'#5a5048':C.dim;
  if(state==='recap'){ const n=rec.frames.filter(f=>f.reset).length+1;
    ctx.fillText(`Instant replay · ${n} tr${n===1?'y':'ies'} · tap to skip`,12,44);
    ctx.font=`13px ${FT}`; ctx.textAlign='right'; ctx.fillStyle=C.mag; ctx.fillText(`REPLAY ×${rp.speed.toFixed(0)}`,W-150,26); return; }
  ctx.fillText(`Attempt ${attempt} · ${stats.bonks} bonks`,12,44);
  ctx.textAlign='center'; ctx.textBaseline='middle';
  if(settings.shots>=99){ pawIcon(170,30,1.1,C.mag,1); ctx.font=`16px ${FT}`; ctx.fillStyle=C.mag; ctx.fillText('∞',190,31); }
  else {
    const n=Math.max(settings.shots,shotsLeft), step=n>5?100/n:22, x0=W-150-step*(n-1)-12;
    for(let i=0;i<n;i++){
      const fx=hudFx.find(f=>f.i===i&&f.k==='+'), px=x0+i*step;
      let sc=1; if(fx){ const k=fx.t/.35; sc=k>=1?1:k<.5?k*3:1.5-(k-.5); }
      pawIcon(px,30,sc*1.05,C.mag,i<shotsLeft?1:.22);
    }
    for(const f of hudFx){ if(f.k!=='-') continue; const px=x0+f.i*step, k=f.t/.9;
      ctx.save(); ctx.translate(px+k*10,30+k*k*40); ctx.rotate(k*2); pawIcon(0,0,1+k*.4,C.mag,1-k); ctx.restore(); }
    ctx.font=`12px ${FT}`;
    for(const f of hudFx){ const px=x0+f.i*step, k=f.t/.9; ctx.globalAlpha=1-k*k;
      ctx.fillStyle=f.k==='+'?'#7dff9a':'#ff6a8a'; ctx.fillText(f.k==='+'?'+1':'−1',px+11,48-k*6); }
  }
  ctx.globalAlpha=1; ctx.textBaseline='alphabetic';
}

/* ---------- title screen + credits ---------- */
// The neon sign is drawn once (glow baked with shadowBlur) and rebuilt only when the fonts arrive.
function titleSign(){
  const px=R.px||layerPx(), key=px+'|'+R.fonts; if(R.sign&&R.sign.key===key) return R.sign;
  const x=22, y=TITLE.signY, w=W-44, h=TITLE.signH, pad=24, cv=mkCanvas((w+pad*2)*px,(h+pad*2)*px), c=cv.getContext('2d');
  c.setTransform(px,0,0,px,(pad-x)*px,(pad-y)*px); c.lineJoin='round'; c.lineCap='round';
  const tube=(fn,col,lw)=>{ c.shadowColor=col; c.shadowBlur=9*px; c.strokeStyle=col; c.lineWidth=lw; fn(); c.shadowBlur=0; c.strokeStyle='rgba(255,255,255,.55)'; c.lineWidth=lw*.35; fn(); };
  tube(()=>c.stroke(rr(x,y,w,h,18)),C.cyan,2.4);
  c.textAlign='center'; c.textBaseline='middle';
  c.font=`22px ${FT}`; c.shadowColor=C.mag; c.shadowBlur=10*px; c.fillStyle='#ffd0fb'; c.fillText('NALA’S',W/2,y+30); c.shadowBlur=0;
  let fs=50; c.font=`${fs}px ${FT}`; while(c.measureText('BONK GOLF').width>w-34 && fs>24){ fs--; c.font=`${fs}px ${FT}`; }
  c.shadowColor=C.cyan; c.shadowBlur=12*px; c.lineWidth=2; c.strokeStyle=C.cyan; c.strokeText('BONK GOLF',W/2,y+76); c.fillStyle='#d8feff'; c.fillText('BONK GOLF',W/2,y+76); c.shadowBlur=0;
  // a little neon golf flag in the corner
  tube(()=>{ c.beginPath(); c.moveTo(x+w-30,y+h-14); c.lineTo(x+w-30,y+h-44); c.stroke(); },C.yel,2);
  c.shadowColor=C.yel; c.shadowBlur=8*px; c.fillStyle=C.yel; c.beginPath(); c.moveTo(x+w-30,y+h-44); c.lineTo(x+w-16,y+h-39); c.lineTo(x+w-30,y+h-34); c.fill(); c.shadowBlur=0;
  R.sign={key,cv,x:x-pad,y:y-pad,w:w+pad*2,h:h+pad*2}; return R.sign;
}
function hitFlicker(at){ const d=t-at; if(d<0||d>.5) return 1; return [1,.15,.9,.05,1,.35,.8,.1,1,.6,1,.85][Math.floor(d*24)%12]; }
function drawSign(y,al){ const s=titleSign(); ctx.globalAlpha=al; ctx.drawImage(s.cv,s.x,s.y+y,s.w,s.h); ctx.globalAlpha=1; }
function bigNala(x,y,S,a,o){ ctx.save(); ctx.translate(x,y); ctx.scale(S,S); drawNala(ctx,0,0,a,dogOpts(o.hero!==false,o.dark!==false,o)); ctx.restore(); }
function bigEnt(kind,x,y,S,a,al,glow){ ctx.save(); ctx.translate(x,y); ctx.scale(S,S); const o={x:0,y:0,glow:glow||0,used:false,id:-3};
  if(kind==='stella') drawStella(ctx,o,'neon',al,a); else drawBinx(ctx,o,'neon',al); ctx.restore(); }
function drawTitle(){
  ctx.drawImage(R.bg,0,0,W,H);
  drawPings(true);
  drawSign(0,hitFlicker(ti.hitAt));
  // Stella cheering on the left (wags faster right after a bonk), Binx unimpressed on the right
  const hype=clamp(1-(t-ti.hitAt)/1.2,0,1);
  bigEnt('stella',84,352,2.1,.45+Math.sin(t*1.3)*.06,1,hype);
  bigEnt('binx',318,356,2.1,0,1,0);
  glowText('STELLA',84,410,`11px ${FT}`,'#e6e9f0','#c9ccd6',.8); glowText('BINX',318,410,`11px ${FT}`,'#e3c4ff',C.pur,.8);
  if(hype>.3) glowText('BORF!',100,290-hype*8,`15px ${FT}`,'#fff','#e6e9f0',hype);
  bigNala(TITLE.x,ti.y,TITLE.S,-Math.PI/2,{bonk:ti.bonk,speed:ti.sp,diz:ti.diz});
  drawWords(false);
}
function drawCredits(){
  ctx.drawImage(R.bg,0,0,W,H);
  const T=cr.T; ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const b of cr.blocks){
    const y0=H+b.y-cr.y; if(y0>H+10||y0+b.h<-10) continue; const cy=y0+b.h/2;
    if(b.k==='sign') drawSign(y0+24-TITLE.signY,1);
    else if(b.k==='head') glowText(b.txt,W/2,cy,`15px ${FT}`,'#ffd0fb',C.mag,1);
    else if(b.k==='cast'){
      if(b.who==='nala'){ bigNala(W/2-34,y0+40,1.5,-Math.PI/2+.25,{hero:true}); bigNala(W/2+34,y0+40,1.5,-Math.PI/2-.25,{hero:false,dark:true}); }
      else bigEnt(b.who,W/2,y0+44,2.1,b.who==='stella'?Math.sin(t)*.3:0,1,b.who==='stella'?1:0);
      glowText(b.name,W/2,y0+b.h-38,`22px ${FT}`,'#d8feff',C.cyan,1);
      ctx.font=`14px ${FB}`; ctx.fillStyle=C.dim; ctx.fillText(b.role,W/2,y0+b.h-14);
    }
    else if(b.k==='role'){ glowText(b.name,W/2,y0+18,`18px ${FT}`,'#d8feff',C.cyan,1); ctx.font=`14px ${FB}`; ctx.fillStyle=C.dim; ctx.fillText(b.role,W/2,y0+44,W-40); }
    else if(b.k==='big'){ glowText(String(b.n),W/2,y0+32,`46px ${FT}`,'#fff4c2',C.yel,1); ctx.font=`600 14px ${FB}`; ctx.fillStyle=C.yel; ctx.fillText(b.txt.toUpperCase(),W/2,y0+70); }
    else if(b.k==='stats'||b.k==='small'){ ctx.font=b.k==='stats'?`15px ${FB}`:`14px ${FB}`; ctx.fillStyle=b.k==='stats'?C.txt:C.dim;
      b.lines.forEach((l,i)=>ctx.fillText(l,W/2,y0+16+i*26,W-30)); }
    else if(b.k==='sleep'){
      ctx.save(); ctx.translate(W/2,y0+52); ctx.strokeStyle=C.nala; ctx.globalAlpha=.8; ctx.lineWidth=2; ctx.shadowColor=C.nala;
      ctx.stroke(el(0,0,42,32)); ctx.globalAlpha=.35; ctx.lineWidth=6; ctx.stroke(el(0,0,42,32)); ctx.restore();   // her bed, in neon
      bigNala(W/2,y0+56,1.3,-Math.PI/2-.4,{hero:false,sleep:true});
      for(let i=0;i<3;i++){ const ph=(t*.6+i/3)%1; glowText('z',W/2+34+ph*18,y0+30-ph*22,`${10+ph*8}px ${FT}`,'#fff4c2',C.yel,Math.sin(ph*Math.PI)); }
      glowText(b.txt,W/2,y0+b.h-22,`18px ${FT}`,'#ffd0fb',C.mag,1);
    }
  }
  // soft fade at the top and bottom edges
  for(const [y,dir] of [[0,1],[H,-1]]){ const g=ctx.createLinearGradient(0,y,0,y+dir*70); g.addColorStop(0,'rgba(11,6,32,1)'); g.addColorStop(1,'rgba(11,6,32,0)'); ctx.fillStyle=g; ctx.fillRect(0,dir>0?0:H-70,W,70); }
  if(!cr.shown){ ctx.font=`12px ${FB}`; ctx.fillStyle='rgba(179,166,217,.7)'; ctx.fillText(cr.fast?'⏩':'hold to fast-forward',W/2,H-18); }
  ctx.textBaseline='alphabetic';
}

/* ---------- frame ---------- */
function goalSleeps(){ return (GOALFX[L.goal.kind]||GOALFX.bed).sleep; }
function dogOpts(hero,dark,extra){ return Object.assign({hero,dark,bonk:null,speed:0,diz:0,flop:0,sleep:false},extra); }
function render(){
  ctx.setTransform(scale*dpr,0,0,scale*dpr,0,0);
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  if(!L) return;
  ensureLayers();
  if(state!==R.prevState){ if(state==='fail') R.failAt=t; R.prevState=state; }
  const recap=state==='recap';
  if(R.hudLit!==recap){ R.hudLit=recap; hudEl.classList.toggle('lit',recap); }
  const menu=state==='title'||state==='credits';
  if(R.hudOff!==menu){ R.hudOff=menu; hudEl.classList.toggle('off',menu); }
  if(state==='title'){ drawTitle(); return; }
  if(state==='credits'){ drawCredits(); return; }

  if(recap){
    const isDown=o=>rp.knocked.has(o.id)||rp.gone.has(o.id);
    drawLit(1,isDown);
    const end=Math.min(rec.frames.length-1,Math.floor(rp.i));
    drawReplayPath(end); drawStickers(); drawPings(true); drawParts(true);
    let f=null, prev=null; for(let i=end;i>=0;i--){ if(!rec.frames[i].reset){ if(!f) f=rec.frames[i]; else { prev=rec.frames[i]; break; } } }
    f=f||{x:L.start.x,y:L.start.y,a:-Math.PI/2};
    const sp=prev?Math.hypot(f.x-prev.x,f.y-prev.y)*60:0, done=rp.i>=rec.frames.length;
    if(done && !rec.frames[rec.frames.length-1].reset){ const g=goalCenter(), k=clamp(rp.done/.5,0,1), e=1-Math.pow(1-k,3);   // ...and into her bed
      f={x:f.x+(g.x-f.x)*e,y:f.y+(g.y-f.y)*e,a:f.a}; }
    drawNala(ctx,f.x,f.y,f.a,dogOpts(false,false,{bonk:rp.bonk,speed:done?0:sp,diz:rp.diz,sleep:done&&goalSleeps()}));
    if(done) zzz(f.x,f.y);
    drawWords(true); drawToast(true);
    drawHUD(true); return;
  }

  // ---- bonk mode (neon) ----
  ctx.drawImage(R.bg,0,0,W,H);
  let lit=settings.lights?.45:0;
  if(state==='winning') lit=Math.max(lit,clamp((winT-.3)/.8,0,1));
  if(DEBUG&&settings.ghost){ ctx.globalAlpha=.8; ctx.drawImage(mem,0,0,W,H); ctx.globalAlpha=1; }
  if(settings.scent && lit<.5) drawScent();
  drawPings(false); drawGlows(); if(lit<.5) drawBinxEyes(); drawPrints();
  if(lit>0) drawLit(lit,o=>o.down||o.gone);
  drawParts(lit>.5);
  const sp=Math.hypot(dog.vx,dog.vy), flop=state==='fail'?clamp((t-R.failAt)/.35,0,1):0;
  const fe=flop?1-Math.pow(1-flop,3)+Math.sin(flop*Math.PI)*.15:0;
  const asLit=lit>.5;   // the costume comes off when the lights come on
  drawNala(ctx,dog.x,dog.y,dog.a,dogOpts(!asLit,!asLit,{bonk:dog.bonk,speed:state==='moving'?sp:0,diz:dog.dizzy,flop:fe,sleep:state==='winning'&&winT>.7&&goalSleeps()}));
  if(flop&&t-R.failAt<.6){ const k=(t-R.failAt)/.6; ctx.strokeStyle=`rgba(201,204,214,${(1-k)*.6})`; ctx.lineWidth=1.5;
    for(let i=0;i<6;i++){ const an=i*TAU/6+.3, r=14+k*20; ctx.beginPath(); ctx.arc(dog.x+Math.cos(an)*r,dog.y+Math.sin(an)*r,2+k*3,0,TAU); ctx.stroke(); } }
  if(state==='winning'&&winT>.7) zzz(dog.x,dog.y);
  drawAim(); drawWords(asLit); drawToast(false);
  if(banner) pill(banner.txt,H-46);
  else if(state==='aim' && stats.shots===0 && attempt===1) pill('Drag back anywhere ↘  then let go to fling Nala',H-46);
  drawHUD(false);
}
