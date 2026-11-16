"use strict";
/* Level data + materials. Pure data: no DOM, no drawing.
   Coordinates are in the 400×700 world; the top 56px is the HUD, walls run 10..390 × 60..690.

   Level fields:
     name, emoji, start{x,y}, intro (Ashley's directions)
     goal: Nala only has to TOUCH it. {t:'r',x,y,w,h,kind:'bed'|'door'} or {t:'c',x,y,r,kind:'bone'|'food'|'jar'}
           'door' = the door mat in front of the back door; the door is drawn in the nearest outer wall
     floors: [{x,y,w,h,kind:'wood'|'carpet'|'tile'}] room floors for the lights-on view (default wood)
     decor: non-solid things drawn in the lights-on view: {x,y,w,h,kind:'rug'|'runner'|'mat'|'dogbed'|'table',name}
            ('table' = a table she fits under; its solid legs live in objs)
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
// What happens when she reaches each kind of goal: win words, the floating end flourish, and whether she curls up to sleep.
const GOALFX={
  bed:{words:['GOOD GIRL!','SHE DID IT!','WHAT A GIRL!'],fx:'z',sleep:true},
  bone:{words:['GOOD GIRL!','BONE GET!'],fx:'♥',sleep:false},
  food:{words:['BREAKFAST!','NOM NOM NOM!','GOOD GIRL!'],fx:'nom',sleep:false},
  door:{words:['POTTY TIME!','SHE MADE IT!','GOOD GIRL!'],fx:'♪',sleep:false},
  jar:{words:['HEIST COMPLETE!','TREATS!!','CRIME PAYS!'],fx:'nom',sleep:false},
};
const ENT={ treat:{r:7,name:'treat',mat:'treat'}, stella:{r:14,name:'Stella',mat:'dog'}, binx:{r:12,name:'Binx',mat:'cat'} };
function Rc(x,y,w,h,name,mat,extra){return Object.assign({t:'r',x,y,w,h,name,mat},extra||{})}
function Ci(x,y,r,name,mat,extra){return Object.assign({t:'c',x,y,r,name,mat},extra||{})}
function walls(){return [Rc(10,60,380,10,'wall','wall'),Rc(10,680,380,10,'wall','wall'),Rc(10,60,10,630,'wall','wall'),Rc(380,60,10,630,'wall','wall')]}

// Knock-overs: impact speed needed, sound, word, banner, debris colours.
const KO={
  floorLamp:(msg)=>({knock:{at:200,snd:'crash',word:'CRASH!',msg:msg||'Nala knocked over the floor lamp 💡',cols:['#ffd27a','#fff2c0','#999']}}),
  tableLamp:(msg)=>({knock:{at:200,snd:'crash',word:'SMASH!',msg:msg||'RIP table lamp 💡',cols:['#ffd27a','#fff2c0','#c96']}}),
  basket:(msg)=>({knock:{at:300,snd:'fwump',word:'FLOOMP!',msg:msg||'Socks. Socks everywhere 🧦',cols:['#eee','#88aaff','#ff8899']}}),
  plant:(msg)=>({knock:{at:220,snd:'crash',word:'THUD!',msg:msg||'Dirt everywhere. The plant did not make it 🪴',cols:['#5c9e4a','#7a4a2a','#3d7a30']}}),
  trash:(msg)=>({knock:{at:180,snd:'trash',word:'CLATTER!',msg:msg||'Trash. Everywhere. 🗑️ (Nala is thrilled.)',cols:['#9a9','#c8b28a','#eee','#a55']}}),
  water:(msg)=>({knock:{at:150,snd:'splash',word:'SPLOOSH!',msg:msg||'Water bowl: flipped. Floor: wet 💦',cols:['#5ab0ff','#9ad4ff']}}),
};

/* Directions are written from Nala's point of view: she starts facing up the screen, so
   "right" means → while she heads up, ↓ while she heads → , ← while she heads down. */
const LEVELS=[
/* 1 · Bedtime — living room → bedroom. One wall, one door, one left turn: teaches aiming. */
{ name:'Bedtime', emoji:'🛏️', start:{x:100,y:640},
  goal:{t:'r',x:30,y:80,w:96,h:66,kind:'bed'},
  intro:'Hey Nala, it’s bedtime! Go straight up past the couch until you bonk the wall. Turn right and find the bedroom door — Stella’s waiting by it. Go on up through, then hang a left. Your bed’s way up in the corner, right next to the space heater. Not OUR bed. YOUR bed.',
  floors:[{x:20,y:70,w:360,h:260,kind:'carpet'},{x:20,y:342,w:360,h:338,kind:'wood'},{x:250,y:330,w:100,h:12,kind:'wood'}],
  decor:[{x:130,y:430,w:140,h:86,kind:'rug'}],
  ents:[{k:'treat',x:360,y:600},{k:'stella',x:300,y:394},{k:'binx',x:316,y:648}],
  objs:()=>[...walls(),
    Rc(20,330,230,12,'wall','wall'), Rc(350,330,30,12,'wall','wall'),
    Ci(144,96,11,'space heater','metal'),
    Rc(240,70,120,110,'big bed','soft',{front:'S'}),
    Rc(20,250,90,80,'dresser','wood'),
    Ci(124,236,10,'floor lamp','metal',KO.floorLamp()),
    Ci(212,290,15,'laundry basket','soft',KO.basket()),
    Rc(20,430,50,150,'couch','soft'),
    Ci(44,612,12,'table lamp','wood',KO.tableLamp()),
    Rc(150,450,100,46,'coffee table','wood'),
    Rc(352,440,28,130,'TV stand','wood'),
    Ci(200,612,7,'squeaky toy','squeak'),
    Ci(354,652,14,'potted plant','soft',KO.plant()),
  ]},

/* 2 · Breakfast — bedroom → hallway → kitchen. Three turns, Stella in the hall. */
{ name:'Breakfast', emoji:'🥣', start:{x:190,y:122},
  goal:{t:'c',x:50,y:640,r:12,kind:'food'},
  intro:'Rise and shine, Nala — breakfast! The bedroom door is right there on your right. Go through it and turn right: that’s the long hallway. Stella’s out there somewhere. At the very bottom, turn right into the kitchen. Your bowl is all the way at the far wall, next to your water. Please don’t flip the water. Again.',
  floors:[{x:20,y:70,w:230,h:260,kind:'carpet'},{x:262,y:70,w:118,h:470,kind:'wood'},{x:20,y:342,w:230,h:338,kind:'tile'},{x:250,y:540,w:130,h:140,kind:'tile'},{x:250,y:90,w:12,h:110,kind:'wood'}],
  decor:[{x:144,y:90,w:92,h:64,kind:'dogbed'},{x:282,y:86,w:78,h:300,kind:'runner'}],
  ents:[{k:'treat',x:214,y:304},{k:'stella',x:320,y:330},{k:'binx',x:66,y:540}],
  objs:()=>[...walls(),
    Rc(250,70,12,20,'wall','wall'), Rc(250,200,12,340,'wall','wall'), Rc(20,330,230,12,'wall','wall'),
    Rc(20,70,90,40,'dresser','wood'),
    Ci(122,84,10,'floor lamp','metal',KO.floorLamp()),
    Rc(20,212,140,118,'big bed','soft',{front:'N'}),
    Ci(364,86,10,'pile of shoes','soft'),
    Rc(362,400,18,80,'radiator','metal'),
    Ci(355,496,15,'laundry basket','soft',KO.basket('The laundry basket has been defeated 🧦')),
    Rc(20,342,56,62,'fridge','metal'),
    Rc(76,342,174,26,'counter','wood'),
    Rc(105,480,60,50,'kitchen island','wood'),
    Ci(366,666,13,'trash can','metal',KO.trash()),
    Ci(92,664,10,'water bowl','metal',KO.water('The water bowl. Again. 💦')),
    Ci(160,620,7,'squeaky toy','squeak'),
  ]},

/* 3 · Potty Break — zig-zag living room → kitchen → mudroom, out the back door. */
{ name:'Potty Break', emoji:'🚪', start:{x:338,y:140},
  goal:{t:'r',x:32,y:660,w:96,h:18,kind:'door'},
  intro:'Potty break, Nala! Turn around and go down the living room — the kitchen door is on your right, way past the bookshelf. In the kitchen, keep heading down: the mudroom door is just a little to your left. Then the back door is on your right. Watch out for the boots. And Binx. Mostly Binx.',
  floors:[{x:20,y:70,w:360,h:250,kind:'wood'},{x:20,y:332,w:360,h:188,kind:'tile'},{x:20,y:532,w:360,h:148,kind:'tile'},{x:20,y:320,w:120,h:12,kind:'wood'},{x:130,y:520,w:120,h:12,kind:'tile'}],
  decor:[{x:150,y:118,w:130,h:66,kind:'rug'}],
  ents:[{k:'treat',x:310,y:446},{k:'stella',x:90,y:440},{k:'binx',x:304,y:640}],
  objs:()=>[...walls(),
    Rc(140,320,240,12,'wall','wall'), Rc(20,520,110,12,'wall','wall'), Rc(250,520,130,12,'wall','wall'),
    Rc(150,70,130,40,'couch','soft',{front:'S'}),
    Rc(165,130,100,34,'coffee table','wood'),
    Ci(40,90,13,'potted plant','soft',KO.plant()),
    Rc(20,120,24,90,'bookshelf','wood'),
    Rc(352,220,28,100,'TV stand','wood'),
    Ci(362,200,10,'floor lamp','metal',KO.floorLamp()),
    Rc(170,332,155,26,'counter','wood'),
    Rc(325,332,55,60,'fridge','metal'),
    Rc(352,392,28,128,'counter','wood'),
    Ci(336,507,13,'trash can','metal',KO.trash()),
    Rc(20,532,50,50,'washer','metal'),
    Rc(70,532,50,50,'dryer','metal'),
    Ci(150,560,15,'laundry basket','soft',KO.basket('FLOOMP. Laundry day is cancelled 🧺')),
    Rc(352,532,28,148,'shoe bench','wood'),
    Ci(200,662,10,'pile of boots','soft'),
    Ci(250,600,7,'squeaky toy','squeak'),
  ]},

/* 4 · Treat Heist — squeeze between the chairs, under the dining table. Binx guards the short door. */
{ name:'Treat Heist', emoji:'🍪', start:{x:330,y:630},
  goal:{t:'c',x:226,y:150,r:12,kind:'jar'},
  intro:'Psst. Nala. Treat heist. The treat jar fell off the coffee table and nobody’s watching. Go up through the kitchen door, then squeeze between the chairs and under the dining table. Up top there are two doors: Binx is napping in the right one. The left one’s farther but safe. The jar is on the right side of the coffee table. Go go go!',
  floors:[{x:20,y:70,w:360,h:180,kind:'carpet'},{x:20,y:262,w:360,h:296,kind:'wood'},{x:20,y:570,w:360,h:110,kind:'tile'},{x:20,y:250,w:90,h:12,kind:'wood'},{x:220,y:250,w:100,h:12,kind:'wood'},{x:200,y:558,w:100,h:12,kind:'tile'}],
  decor:[{x:86,y:360,w:228,h:100,kind:'table',name:'dining table (squeeze under!)'}],
  ents:[{k:'treat',x:100,y:522},{k:'stella',x:60,y:212},{k:'binx',x:272,y:256}],
  objs:()=>[...walls(),
    Rc(110,250,110,12,'wall','wall'), Rc(320,250,60,12,'wall','wall'), Rc(20,558,180,12,'wall','wall'), Rc(300,558,80,12,'wall','wall'),
    Rc(56,70,140,40,'couch','soft',{front:'S'}),
    Rc(100,130,100,36,'coffee table','wood'),
    Ci(42,82,10,'floor lamp','metal',KO.floorLamp()),
    Rc(310,80,52,50,'armchair','soft'),
    Ci(362,230,13,'potted plant','soft',KO.plant()),
    Rc(20,340,60,218,'bookshelf','wood'),
    Rc(320,340,60,218,'china cabinet','wood'),
    Ci(94,368,4,'table leg','wood'),Ci(306,368,4,'table leg','wood'),Ci(94,452,4,'table leg','wood'),Ci(306,452,4,'table leg','wood'),
    Rc(94,340,26,18,'chair','wood'),Rc(187,340,26,18,'chair','wood'),Rc(280,340,26,18,'chair','wood'),
    Rc(94,462,26,18,'chair','wood'),Rc(187,462,26,18,'chair','wood'),Rc(280,462,26,18,'chair','wood'),
    Rc(20,570,60,64,'fridge','metal'),
    Rc(20,652,180,28,'counter','wood'),
    Ci(224,662,12,'trash can','metal',KO.trash('Trash can down. Heist still on. 🗑️')),
    Ci(362,662,10,'water bowl','metal',KO.water()),
  ]},

/* 5 · Zoomies — the whole house in a C: across the living room, up the hall, into bed. Everything falls over. */
{ name:'Zoomies', emoji:'⚡', start:{x:70,y:640},
  goal:{t:'r',x:30,y:80,w:96,h:66,kind:'bed'},
  intro:'ZOOMIES! Nala, run the whole house! Go right, all the way across the living room. Turn left up the hallway — Stella’s cheering — and there’s a treat hiding in the den, on your left, if you’re feeling brave. At the top, turn left into the bedroom and dive into your bed at the far end. Knock over whatever you want. It’s your house now.',
  floors:[{x:20,y:70,w:360,h:198,kind:'carpet'},{x:262,y:280,w:118,h:178,kind:'wood'},{x:20,y:280,w:230,h:178,kind:'carpet'},{x:20,y:470,w:360,h:210,kind:'wood'},{x:250,y:340,w:12,h:100,kind:'wood'}],
  decor:[{x:282,y:290,w:60,h:160,kind:'runner'},{x:215,y:560,w:130,h:66,kind:'rug'}],
  ents:[{k:'treat',x:64,y:300},{k:'stella',x:318,y:360},{k:'binx',x:246,y:520}],
  objs:()=>[...walls(),
    Rc(20,268,242,12,'wall','wall'), Rc(250,280,12,60,'wall','wall'), Rc(250,440,12,18,'wall','wall'), Rc(20,458,250,12,'wall','wall'),
    // bedroom
    Ci(140,94,11,'space heater','metal'),
    Rc(260,70,120,104,'big bed','soft',{front:'S'}),
    Rc(20,190,70,78,'dresser','wood'),
    Ci(102,256,10,'floor lamp','metal',KO.floorLamp('Bedroom lamp: CRASH. Zoomies: unstoppable 💡')),
    Ci(210,251,15,'laundry basket','soft',KO.basket()),
    // den (the treat detour)
    Rc(20,300,24,140,'bookshelf','wood'),
    Rc(190,282,60,46,'armchair','soft',{front:'S'}),
    Rc(48,418,40,40,'side table','wood'),
    // hallway
    Rc(362,300,18,70,'radiator','metal'),
    Ci(366,284,10,'floor lamp','metal',KO.floorLamp('Hallway lamp down. Nala does not care 💡')),
    Ci(364,388,10,'pile of shoes','soft'),
    // kitchen + living room
    Rc(20,470,30,120,'counter','wood'),
    Ci(150,483,13,'trash can','metal',KO.trash()),
    Ci(172,666,10,'water bowl','metal',KO.water()),
    Rc(210,636,120,44,'couch','soft',{front:'N'}),
    Ci(196,662,12,'table lamp','wood',KO.tableLamp()),
    Ci(358,658,10,'floor lamp','metal',KO.floorLamp()),
    Ci(196,484,13,'potted plant','soft',KO.plant()),
  ]},
];
