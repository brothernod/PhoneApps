"use strict";
/* Synth sound effects (Web Audio, no files). */
/* ---------- audio ---------- */
let AC=null, master=null, NBUF=null;
function ensureAudio(){
  if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); master=AC.createGain(); master.gain.value=.6; master.connect(AC.destination);}catch(e){AC=null} }
  if(AC && AC.state==='suspended') AC.resume().catch(()=>{});
}
function nb(){ if(!NBUF){ NBUF=AC.createBuffer(1,AC.sampleRate,AC.sampleRate); const d=NBUF.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; } return NBUF; }
function envGain(t0,vol,dur){ const g=AC.createGain(); g.gain.setValueAtTime(.0001,t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t0+.008); g.gain.exponentialRampToValueAtTime(.0001,t0+dur); g.connect(master); return g; }
function tone(type,f0,f1,dur,vol,delay=0,lp){
  const t0=AC.currentTime+delay, o=AC.createOscillator(); o.type=type;
  o.frequency.setValueAtTime(f0,t0); o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t0+dur);
  const g=envGain(t0,vol,dur);
  if(lp){ const f=AC.createBiquadFilter(); f.type='lowpass'; f.frequency.value=lp; o.connect(f); f.connect(g);} else o.connect(g);
  o.start(t0); o.stop(t0+dur+.05);
}
function noise(dur,vol,ft,f0,f1,q=1,delay=0){
  const t0=AC.currentTime+delay, s=AC.createBufferSource(); s.buffer=nb();
  const f=AC.createBiquadFilter(); f.type=ft; f.Q.value=q; f.frequency.setValueAtTime(f0,t0); f.frequency.exponentialRampToValueAtTime(f1,t0+dur);
  const g=envGain(t0,vol,dur); s.connect(f); f.connect(g); s.start(t0); s.stop(t0+dur+.05);
}
function meow(v){
  const t0=AC.currentTime, o=AC.createOscillator(); o.type='sawtooth';
  o.frequency.setValueAtTime(480,t0); o.frequency.linearRampToValueAtTime(900,t0+.15); o.frequency.linearRampToValueAtTime(520,t0+.45);
  const f=AC.createBiquadFilter(); f.type='bandpass'; f.frequency.setValueAtTime(900,t0); f.frequency.linearRampToValueAtTime(1600,t0+.15); f.frequency.linearRampToValueAtTime(700,t0+.45); f.Q.value=4;
  const g=envGain(t0,.5*v,.48); o.connect(f); f.connect(g); o.start(t0); o.stop(t0+.55);
}
function sfx(name,s=1){
  if(!settings.sound||!AC) return;
  const v=.3+.7*clamp(s,0,1);
  try{ switch(name){
    case 'bonk': tone('sine',190,55,.18,.7*v); tone('triangle',380,120,.06,.2*v); break;
    case 'knock': tone('triangle',320,140,.09,.5*v); noise(.04,.3*v,'bandpass',2000,1800,1); tone('sine',160,90,.12,.4*v); break;
    case 'fwump': noise(.25,.7*v,'lowpass',700,150,.7); tone('sine',90,50,.2,.3*v); break;
    case 'clang': tone('square',620,600,.35,.1*v); tone('square',931,925,.3,.07*v); tone('sine',1240,1240,.5,.1*v); break;
    case 'squeak': tone('sine',1100,1900,.09,.35*v); tone('sine',1900,1200,.12,.3*v,.09); break;
    case 'meow': meow(v); break;
    case 'crash': noise(.7,.55*v,'highpass',2500,700,.5); tone('sine',120,40,.3,.6*v); for(let i=0;i<5;i++) tone('triangle',rand(900,3200),rand(600,2000),.15,.08*v,rand(0,.25)); break;
    case 'trash': sfx('crash',s); sfx('clang',s); for(let i=0;i<4;i++) tone('square',rand(300,900),rand(200,600),.08,.05,rand(.1,.5)); break;
    case 'splash': noise(.5,.5*v,'bandpass',500,2500,1.5); noise(.35,.3*v,'bandpass',3000,700,2,.12); break;
    case 'ping': tone('sine',1500,1470,.6,.045*v); break;
    case 'whoosh': noise(.25,.22*v,'bandpass',400,1500,1.2); break;
    case 'win': [523,659,784,1047].forEach((f,i)=>tone('triangle',f,f,.28,.3,i*.11)); tone('triangle',1319,1319,.6,.25,.48); break;
    case 'fail': [392,370,349,311].forEach((f,i)=>tone('sawtooth',f,f*.97,i==3?.7:.28,.12,i*.3,1200)); break;
    case 'hmph': noise(.15,.25,'bandpass',300,200,2); break;
    case 'borf': for(const d of [0,.17]){ tone('sawtooth',240,120,.13,.35*v,d,900); noise(.08,.25*v,'bandpass',600,350,2,d); } break;
    case 'smack': noise(.09,.8*v,'highpass',3000,1200,.7); tone('triangle',700,200,.07,.4*v); meow(.6*v); break;
    case 'pickup': [880,1175,1568].forEach((f,i)=>tone('triangle',f,f,.12,.25,i*.06)); break;
    case 'paw+': tone('sine',660,990,.12,.25); break;
    case 'paw-': tone('sine',520,260,.2,.25); break;
  }}catch(e){}
}
function buzz(ms){ try{ navigator.vibrate&&navigator.vibrate(ms);}catch(e){} }
