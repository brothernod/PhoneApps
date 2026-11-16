"use strict";
/* Level data + materials. Pure data: no DOM, no drawing.
   Coordinates are in the 400×700 world; the top 56px is the HUD, walls run 10..390 × 60..690.

   Level fields:
     name, emoji, start{x,y}, intro (Ashley's directions)
     goal: {t:'r',x,y,w,h,kind:'bed'} or {t:'c',x,y,r,kind:'bone'}  — Nala only has to TOUCH it
     decor: non-solid floor shapes drawn in the lights-on view (e.g. a table she fits under)
     objs(): solid things. Rc(x,y,w,h,name,mat,extra) / Ci(x,y,r,name,mat,extra)
             extra.knock = {at:impactSpeed, snd, word, msg, cols} → falls over, stays down for the level
     ents: characters & pickups, each once per try:
             {k:'treat', x,y}   hidden treat: touch = +1 move, gone for the rest of that try
             {k:'stella',x,y}   Stella (pitbull): bump = pep talk + "BORF!" + 1 move
             {k:'binx',  x,y}   Binx (cat): bump = SMACK, −1 move, hard bounce
*/
const MAT={
  wall:{e:.55,snd:'bonk',col:'#3b3b3b',words:['BONK!','bonk','BONK','oof']},
  wood:{e:.6,snd:'knock',col:'#7a5236',words:['BONK!','thunk','KNOCK','bonk']},
  soft:{e:.22,snd:'fwump',col:'#5d4f8f',words:['fwump','floof','pmf']},
  metal:{e:.6,snd:'clang',col:'#6d7480',words:['CLANG!','TINK','ding!']},
  cat:{e:1.3,snd:'meow',col:'#1a1a1f',words:['MREOW!','HSSSS!','MRRP?!']},
  dog:{e:.45,snd:'borf',col:'#8f949e',words:['boof','*sniff*','BORF?']},
  treat:{e:0,snd:'pickup',col:'#d9a35f',words:['+1!']},
  squeak:{e:.8,snd:'squeak',col:'#d0559a',words:['squeak!','SQUEAK','eep!']},
};
const ENT={ treat:{r:7,name:'treat',mat:'treat'}, stella:{r:14,name:'Stella',mat:'dog'}, binx:{r:12,name:'Binx',mat:'cat'} };
function Rc(x,y,w,h,name,mat,extra){return Object.assign({t:'r',x,y,w,h,name,mat},extra||{})}
function Ci(x,y,r,name,mat,extra){return Object.assign({t:'c',x,y,r,name,mat},extra||{})}
function walls(){return [Rc(10,60,380,10,'wall','wall'),Rc(10,680,380,10,'wall','wall'),Rc(10,60,10,630,'wall','wall'),Rc(380,60,10,630,'wall','wall')]}

const LEVELS=[
{ name:'Bedtime', emoji:'🛏️', start:{x:110,y:640},
  goal:{t:'r',x:30,y:80,w:100,h:70,kind:'bed'},
  intro:'Hey Nala, it’s bedtime! Go straight up past the couch. Turn right at the coffee table, then head up through the bedroom door. Hang a left at the dresser — your bed is right next to the space heater.',
  decor:[],
  ents:[{k:'treat',x:48,y:338},{k:'stella',x:300,y:565},{k:'binx',x:290,y:465}],
  objs:()=>[...walls(),
    Rc(20,300,230,12,'wall','wall'), Rc(330,300,50,12,'wall','wall'),
    Ci(150,96,11,'space heater','metal'),
    Rc(290,190,85,55,'dresser','wood'),
    Ci(222,112,16,'laundry basket','soft',{knock:{at:330,snd:'fwump',word:'FLOOMP!',msg:'Nala knocked over the laundry basket 🧺',cols:['#eee','#88aaff','#ff8899']}}),
    Ci(150,178,10,'floor lamp','metal',{knock:{at:200,snd:'crash',word:'CRASH!',msg:'Nala knocked over the floor lamp 💡',cols:['#ffd27a','#fff2c0','#999']}}),
    Rc(20,400,50,160,'couch','soft'),
    Ci(42,594,12,'table lamp','wood',{knock:{at:200,snd:'crash',word:'SMASH!',msg:'RIP table lamp 💡',cols:['#ffd27a','#fff2c0','#c96']}}),
    Rc(95,345,105,40,'coffee table','wood'),
    Rc(352,400,28,140,'TV stand','wood'),
    Ci(200,560,7,'squeaky toy','squeak'),
    Ci(352,648,13,'potted plant','soft',{knock:{at:220,snd:'crash',word:'THUD!',msg:'Dirt everywhere. The plant did not make it 🪴',cols:['#5c9e4a','#7a4a2a','#3d7a30']}}),
  ]},
{ name:'Bone Hunt', emoji:'🦴', start:{x:320,y:110},
  goal:{t:'c',x:120,y:605,r:11,kind:'bone'},
  intro:'Bone time, Nala! Head down the hallway — mind the shoes. Hang a right into the kitchen; the trash can is right by the door. Your bone rolled under the kitchen table, so squeeze in between the legs.',
  decor:[{x:62,y:557,w:116,h:96,name:'kitchen table (you fit under it!)'}],
  ents:[{k:'treat',x:44,y:662},{k:'stella',x:322,y:640},{k:'binx',x:195,y:350}],
  objs:()=>[...walls(),
    Rc(20,290,230,10,'wall','wall'), Rc(250,70,12,380,'wall','wall'), Rc(250,580,12,100,'wall','wall'),
    Ci(300,250,10,'pile of shoes','soft'),
    Rc(362,170,18,90,'radiator','metal'),
    Ci(345,390,15,'laundry basket','soft',{knock:{at:330,snd:'fwump',word:'FLOOMP!',msg:'Socks. Socks everywhere 🧦',cols:['#eee','#88aaff','#ff8899']}}),
    Rc(355,480,25,70,'shoe bench','wood'),
    Ci(215,425,13,'trash can','metal',{knock:{at:180,snd:'trash',word:'CLATTER!',msg:'Trash. Everywhere. 🗑️ (Nala is thrilled.)',cols:['#9a9','#c8b28a','#eee','#a55']}}),
    Rc(20,300,55,65,'fridge','metal'),
    Rc(20,365,25,155,'counter','wood'),
    Ci(68,563,4,'table leg','wood'),Ci(172,563,4,'table leg','wood'),Ci(68,647,4,'table leg','wood'),Ci(172,647,4,'table leg','wood'),
    Rc(28,585,18,40,'chair','wood'), Rc(194,585,18,40,'chair','wood'),
    Ci(225,655,10,'water bowl','metal',{knock:{at:150,snd:'splash',word:'SPLOOSH!',msg:'Water bowl: flipped. Floor: wet 💦',cols:['#5ab0ff','#9ad4ff']}}),
    Ci(300,600,7,'squeaky toy','squeak'),
  ]},
];
