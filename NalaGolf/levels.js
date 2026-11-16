"use strict";
/* Level data + materials. Pure data: no DOM, no drawing. */
/* ---------- materials ---------- */
const MAT={
  wall:{e:.55,snd:'bonk',col:'#3b3b3b',words:['BONK!','bonk','BONK','oof']},
  wood:{e:.6,snd:'knock',col:'#7a5236',words:['BONK!','thunk','KNOCK','bonk']},
  soft:{e:.22,snd:'fwump',col:'#5d4f8f',words:['fwump','floof','pmf']},
  metal:{e:.6,snd:'clang',col:'#6d7480',words:['CLANG!','TINK','ding!']},
  cat:{e:1.3,snd:'meow',col:'#d08a2e',words:['MREOW!','HSSSS!','MRRP?!']},
  squeak:{e:.8,snd:'squeak',col:'#d0559a',words:['squeak!','SQUEAK','eep!']},
};
function Rc(x,y,w,h,name,mat,extra){return Object.assign({t:'r',x,y,w,h,name,mat},extra||{})}
function Ci(x,y,r,name,mat,extra){return Object.assign({t:'c',x,y,r,name,mat},extra||{})}
function walls(){return [Rc(10,60,380,10,'wall','wall'),Rc(10,680,380,10,'wall','wall'),Rc(10,60,10,630,'wall','wall'),Rc(380,60,10,630,'wall','wall')]}

/* ---------- levels ---------- */
const LEVELS=[
{ name:'Bedtime', emoji:'🛏️', start:{x:110,y:640},
  goal:{t:'r',x:30,y:80,w:100,h:70,kind:'bed'},
  intro:'Hey Nala, it’s bedtime! Go straight up past the couch. Turn right at the coffee table, then head up through the bedroom door. Hang a left at the dresser — your bed is right next to the space heater.',
  decor:[],
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
    Ci(290,470,15,'sleeping cat','cat'),
    Ci(200,560,7,'squeaky toy','squeak'),
    Ci(352,648,13,'potted plant','soft',{knock:{at:220,snd:'crash',word:'THUD!',msg:'Dirt everywhere. The plant did not make it 🪴',cols:['#5c9e4a','#7a4a2a','#3d7a30']}}),
  ]},
{ name:'Treat Time', emoji:'🦴', start:{x:320,y:110},
  goal:{t:'c',x:120,y:605,r:11,kind:'treat'},
  intro:'Treat time, Nala! Head down the hallway — mind the shoes. Hang a right into the kitchen; the trash can is right by the door. The treat rolled under the kitchen table, so squeeze in between the legs.',
  decor:[{x:74,y:569,w:92,h:72,name:'kitchen table (you fit under it!)'}],
  objs:()=>[...walls(),
    Rc(20,290,230,10,'wall','wall'), Rc(250,70,12,400,'wall','wall'), Rc(250,560,12,120,'wall','wall'),
    Ci(300,250,10,'pile of shoes','soft'),
    Rc(362,170,18,90,'radiator','metal'),
    Ci(345,390,15,'laundry basket','soft',{knock:{at:330,snd:'fwump',word:'FLOOMP!',msg:'Socks. Socks everywhere 🧦',cols:['#eee','#88aaff','#ff8899']}}),
    Rc(355,480,25,70,'shoe bench','wood'),
    Ci(222,452,13,'trash can','metal',{knock:{at:180,snd:'trash',word:'CLATTER!',msg:'Trash. Everywhere. 🗑️ (Nala is thrilled.)',cols:['#9a9','#c8b28a','#eee','#a55']}}),
    Rc(20,300,55,65,'fridge','metal'),
    Rc(20,365,25,155,'counter','wood'),
    Ci(80,575,4,'table leg','wood'),Ci(160,575,4,'table leg','wood'),Ci(80,635,4,'table leg','wood'),Ci(160,635,4,'table leg','wood'),
    Rc(50,585,18,40,'chair','wood'), Rc(172,585,18,40,'chair','wood'),
    Ci(225,655,10,'water bowl','metal',{knock:{at:150,snd:'splash',word:'SPLOOSH!',msg:'Water bowl: flipped. Floor: wet 💦',cols:['#5ab0ff','#9ad4ff']}}),
    Ci(300,620,7,'squeaky toy','squeak'),
  ]},
];
