// @ts-check
// Scenes drawn in code for THE DRAGON OF EL MORRO. Places with a trip photo
// use the PNG in this folder instead (see pics: in game.yaml).
// Each scene is a function that paints a 320x200 framebuffer. The hatchlings
// are drawn here too: the engine asks for one with creature().

import { W, H, shade } from '../../../engine/art.js';

// ---------------------------------------------------------------------------
// Sprites. Palette keys are shared so the cast stays consistent.

const SKIN = { s: '#f6d3b8', S: '#dca88a', e: '#2a1e2e', h: '#6b3d1e', H: '#94592c', p: '#36466e', P: '#262f50', o: '#3d2a1e', w: '#ffffff' };

const HERO = [
  '...hhhh...',
  '..hHHhhh..',
  '.hhhhhhhh.',
  '.hhsshhhh.',
  '.hssssssh.',
  '.sesssses.',
  '.ssssssss.',
  '..ssSSss..',
  '...ssss...',
  '..gggggg..',
  '.ggggggggG',
  'sgggGgggGs',
  'sgggGgggGs',
  's.gggggg.s',
  '..gggggg..',
  '..pppppp..',
  '..ppPPpp..',
  '..pp..pp..',
  '..pp..pp..',
  '..pp..pp..',
  '..oo..oo..',
  '.ooo..ooo.',
];
const HERO_PAL = { ...SKIN, g: '#3f9e4a', G: '#2a7034' };

const SIDEKICK = [
  '..hhhh..',
  '.hHHhhh.',
  'hhhhhhhh',
  'hsshhssh',
  'hssssssh',
  'sesssses',
  'ssssssss',
  '.ssSSss.',
  '..ssss..',
  '.bbbbbb.',
  'sbbBbbbs',
  'sbbBbbbs',
  '.bbbbbb.',
  '.pppppp.',
  '.pp..pp.',
  '.oo..oo.',
];
const SIDEKICK_PAL = { ...SKIN, b: '#3c7fd6', B: '#2a5ca8' };

// Pembroke Welsh corgi: red-tan coat, white chest, muzzle, and front paws.
const PUP = [
  '............c..c..',
  '...........cC.cC..',
  '...........cccccc.',
  '...........ccecwww',
  '..ccccccccccwwwwwn',
  '.cCCCCCCCCcccwww..',
  '.ccccccccccwwwww..',
  '..ccccccccwwwww...',
  '..cc.cc....ww.ww..',
  '..cc.cc....ww.ww..',
];
const PUP_PAL = { c: '#d9822b', C: '#a95d1a', w: '#fbf6ee', e: '#1e1414', n: '#1e1414' };

const LUZ = [
  '....aa....',
  '...aAAa...',
  '..aaaaaa..',
  '.aattttaa.',
  '.atkttkta.',
  '.atttttta.',
  '..ttTTtt..',
  '...tttt...',
  '..vvvvvv..',
  '.vvvVvvvv.',
  'tvvvVvvvvt',
  'tvvvVvvvvt',
  't.vvvvvv.t',
  '..vvvvvv..',
  '.vvvvvvvv.',
  '.vvvvvvvv.',
  'vvvvVvvvvv',
  'vvvvVvvvvv',
  '..tt..tt..',
  '..tt..tt..',
  '.kkk..kkk.',
];
const LUZ_PAL = { a: '#c9c4c0', A: '#ece8e4', t: '#c98d63', T: '#a8704b', k: '#2a1e2e', v: '#7b4aa8', V: '#5b3282' };

const TITO = [
  '...yyyy...',
  '..yYYYYy..',
  'yyyyyyyyyy',
  '.htttttth.',
  '.ttkttktt.',
  '.tttttttt.',
  '.tkkkkkkt.',
  '..tttttt..',
  '..wwwwww..',
  '.wwwWwwww.',
  'twwwWwwwwt',
  'twwwWwwwwt',
  't.wwwwww.t',
  '..wwwwww..',
  '..pppppp..',
  '..ppPPpp..',
  '..pp..pp..',
  '..pp..pp..',
  '..pp..pp..',
  '.kkk..kkk.',
];
const TITO_PAL = { y: '#e8c66a', Y: '#b8923e', h: '#3a2a20', t: '#b9784f', k: '#2a1e1a', w: '#f4f1e8', W: '#cfcabb', p: '#5a4a3a', P: '#43362a' };

const CAT = [
  'x.x.........',
  'xxx.......x.',
  'eye......xx.',
  'xxxx....xx..',
  '.xxxxxxxx...',
  '.xxXXXxxx...',
  '.xxxxxxxx...',
  '.x.x..x.x...',
];
const CAT_PAL = { x: '#6f6f7a', X: '#55555f', e: '#e6d33a', y: '#d98aa0' };

const DRAGON = [
  '.......y.y.y.y........',
  '......gyGyGyGyg.......',
  '..ggggggbbGGGGGgg.....',
  '.geggggbbbbggggggg....',
  'gggggggLLLLLLggggggg..',
  '.ooggggLLLLLLLggggggg.',
  '..o.gg.LLLLLLL.gg..ggg',
  '....gg.........gg...gg',
  '...ggg........ggg....g',
];
const DRAGON_PAL = { g: '#4cae4f', G: '#2f7d33', L: '#b2dc74', y: '#f2b630', b: '#3aa6a0', e: '#1e1414', o: '#ec8a2c' };

// ---------------------------------------------------------------------------
// The hatchlings. Each kind is one shape, painted with the colors from its
// sprite: in creatures.yaml: b body, d dark, l belly, t trim, w wing.
// Every shape faces left and fits in creatureBox.

export const SHAPES = {
  // iguana dragon: the dragon in the museum painting
  lizard: DRAGON.map((row) => row.replace(/[gGLybo]/g, (c) => ({ g: 'b', G: 'd', L: 'l', y: 't', b: 'w', o: 't' }[c]))),
  // anole dragon: slim, long tail, a bright flag under the chin
  anole: [
    '..........ww..........',
    '..bbbb...wwww.........',
    '.bebbbbbbbwwbb........',
    'bbbbbbddbbbbbbbb......',
    '.ttbbbllllllbbbbbb....',
    '.ttt.bbllllbb..bbbbb..',
    '..t..bb....bb.....bbbb',
    '....bbb....bbb......bb',
  ],
  // coquí dragon: round and squat, with big eyes
  frog: [
    '..bbb....bbb......',
    '.bwebb..bbewb.....',
    '.bbbbbbbbbbbb.ww..',
    'bbbbbbbbbbbbbbwww.',
    'bbllllllllbbbbbww.',
    '.bllllllllbbbbbbb.',
    '.bbbllllbbbddbbbbb',
    'bbb.bb..bb.bbb.bbb',
    'tt..tt..tt.....ttt',
  ],
  // parrot dragon: red forehead, blue wing feathers
  bird: [
    '....tttt..........',
    '...tbbbbb.........',
    '.llbbebbbb........',
    'lll.bbbbbbbb......',
    '.l..bbbwwwwbbb....',
    '....bblwwwwwbbbb..',
    '.....bllwwwwbbbbbb',
    '......bllbb...bbbb',
    '......d..d.......b',
    '.....dd.dd........',
  ],
  // glow dragon: a see-through drop with sparks around it
  wisp: [
    '....t.........t...',
    '...bbbb...........',
    '..bbllbbb...t.....',
    '.bbelllbbbb.......',
    '.bbllllbbbbbb.....',
    '.bblllbbbwwbbbb...',
    '..bbbbbbwwwbbbbbb.',
    '...bbbbbbwbb..bbbb',
    '.t..bb...bb.....bb',
    '.........t........',
  ],
  // turtle dragon: a ridged shell and paddle feet
  turtle: [
    '.......dddddd.......',
    '.....ddbbbbbbdd.....',
    '....dbbdbbbbdbbd....',
    '.bbbdbbdbbbbdbbbd...',
    'bebbdbbdbbbbdbbbd.b.',
    'bbbbllllllllllllbbb.',
    '..wwwwl......lwwww..',
    '.wwww..........wwww.',
  ],
  // bat dragon: big ears and wide wings
  bat: [
    '.b...b................',
    '.bb.bb.....ww.....ww..',
    '.bbbbb...wwwww..wwwww.',
    'bebbebbwwwwwwwwwwwwwww',
    'bbttbbbbbwwwwwwwwwwwww',
    '.bbbbbbbbbbwwdwwwdwww.',
    '..blllbbbbb.w..w..w...',
    '..bb..bb..............',
  ],
  // boa dragon: no legs at all
  snake: [
    '..bbbb................',
    '.bebbbb......ww.......',
    '.bbbbbb....bbwwwb.....',
    't..lbbb...bbdbbdbb....',
    '...lbbbb.bbdb..bdbb...',
    '....lbbbbbdb....bbdb..',
    '.....llbbbb......bbbbb',
    '..................bbb.',
  ],
};

/** The largest shape, so a portrait can be sized to hold any of them. */
export const creatureBox = [22, 10];

const PLAIN = { shape: 'lizard', body: '#4cae4f', dark: '#2f7d33', belly: '#b2dc74', trim: '#f2b630', wing: '#3aa6a0' };

/**
 * Paint one hatchling. parts is its sprite: from creatures.yaml.
 * pose 1 is a push-up: the body drops and the legs fold.
 */
export function creature(p, parts, x, y, { scale = 1, flip = false, outline = '#1a1a2a', pose = 0 } = {}) {
  const k = { ...PLAIN, ...(parts || {}) };
  const grid = SHAPES[k.shape] || SHAPES.lizard;
  const pal = { b: k.body, d: k.dark, l: k.belly, t: k.trim, w: k.wing, e: '#1e1414' };
  const rows = pose ? grid.slice(0, -1) : grid;
  // center the shape in the box, feet on the bottom edge
  const dx = Math.floor((creatureBox[0] - grid[0].length) / 2), dy = creatureBox[1] - grid.length;
  p.sprite(rows, pal, x + dx * scale, y + (dy + (pose ? 1 : 0)) * scale, { scale, flip, outline });
}

// ---------------------------------------------------------------------------
// Scene pieces

function sky(p, h, cols = ['#3b6fd1', '#5d93e6', '#8fc0f2', '#cfe6fa']) {
  p.grad(0, 0, W, h, cols);
}

function cloud(p, x, y, s = 1) {
  p.blob(x, y, 10 * s, 5 * s, '#b9cfe8', '#eef5fc', '#ffffff');
  p.blob(x + 12 * s, y + 2, 8 * s, 4 * s, '#b9cfe8', '#eef5fc', '#ffffff');
  p.blob(x - 10 * s, y + 2, 7 * s, 3 * s, '#b9cfe8', '#eef5fc', '#ffffff');
}

/** Blue cobblestones (adoquines), as in Old San Juan. */
function cobbles(p, y0, seed = 1) {
  p.rect(0, y0, W, H - y0, '#2c3e5c');
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let y = y0, row = 0; y < H; row++) {
    const sh = 4 + Math.floor((y - y0) / 14);       // stones grow toward the viewer
    const sw = sh * 2;
    for (let x = -((row * sw) / 2 % sw); x < W; x += sw) {
      const tone = ['#4e6c96', '#5b7aa6', '#6a8bb8', '#45628a'][Math.floor(rnd() * 4)];
      p.rect(x + 1, y + 1, sw - 2, sh - 1, tone);
      p.rect(x + 1, y + 1, sw - 3, 1, '#8fadd2');
    }
    y += sh;
  }
}

function house(p, x, y, w, h, wall, trim, door) {
  p.rect(x, y, w, h, wall);
  p.dith(x, y + h - 6, w, 6, wall, shade(wall, 0.82));
  p.rect(x, y, 2, h, shade(wall, 0.8));
  // cornice
  p.rect(x - 1, y, w + 2, 4, trim);
  p.rect(x - 1, y + 4, w + 2, 1, '#6a5a4a');
  // windows with shutters and a balcony
  const ww = 8;
  for (let wy = y + 10; wy + 16 <= y + h - 24; wy += 26)
  for (let wx = x + 5; wx + ww <= x + w - 4; wx += 15) {
    p.rect(wx - 1, wy - 1, ww + 2, 14, trim);
    p.rect(wx, wy, ww, 12, '#2d3b4d');
    p.rect(wx, wy, 3, 12, door);
    p.rect(wx + 5, wy, 3, 12, door);
    p.rect(wx - 2, wy + 12, ww + 4, 1, '#3a2a20');
    for (let b = 0; b < ww + 4; b += 2) p.rect(wx - 2 + b, wy + 13, 1, 3, '#3a2a20');
  }
  // arched door
  const dw = 10, dx = x + Math.floor(w / 2) - 5, dy = y + h - 20;
  p.rect(dx - 1, dy - 1, dw + 2, 21, trim);
  p.rect(dx, dy + 3, dw, 17, door);
  p.ellipse(dx + 5, dy + 3, 4, 3, door);
  p.rect(dx + 7, dy + 11, 1, 2, '#e8c66a');
}

// ---------------------------------------------------------------------------
// Scenes

function museum(p, { egg = 'cracked', who = null } = {}) {
  p.grad(0, 0, W, 118, ['#f0d6a8', '#e2bd88', '#c99d6a']);
  // arches along the back wall
  for (let ax = 8; ax < W; ax += 78) {
    p.rect(ax, 18, 56, 96, '#b98a58');
    p.ellipse(ax + 28, 18, 28, 14, '#b98a58');
    p.rect(ax + 4, 20, 48, 94, '#a37748');
    p.ellipse(ax + 28, 20, 24, 12, '#a37748');
  }
  // window onto the sea in the first arch
  p.grad(14, 24, 44, 50, ['#5d93e6', '#9cc8f2']);
  p.ellipse(36, 24, 22, 10, '#5d93e6');
  p.grad(14, 60, 44, 14, ['#2a6fb0', '#1d4f86']);
  p.rect(35, 14, 2, 60, '#7a4a2a'); p.rect(14, 46, 44, 2, '#7a4a2a');
  // dragon painting in a gold frame
  p.rect(232, 30, 54, 40, '#c9962e'); p.rect(234, 32, 50, 36, '#e8c66a');
  p.grad(237, 35, 44, 30, ['#2a3a6a', '#6a4a8a', '#d98a5a']);
  p.sprite(DRAGON, DRAGON_PAL, 244, 46, { outline: '#1a1a2a' });
  // Taino petroglyph stone in the third arch
  p.blob(198, 84, 14, 18, '#5a5048', '#7d7268', '#9b9086');
  p.ellipse(198, 80, 6, 6, '#5a5048'); p.ellipse(198, 80, 4, 4, '#7d7268');
  p.set(196, 79, '#3a3028'); p.set(200, 79, '#3a3028'); p.rect(196, 83, 5, 1, '#3a3028');
  // wainscot and floor tiles
  p.rect(0, 112, W, 8, '#7a4a2a'); p.rect(0, 112, W, 1, '#a86e44');
  for (let y = 120, row = 0; y < H; row++) {
    const th = 6 + row * 2, tw = 20 + row * 4;
    for (let x = -(row % 2) * (tw / 2), i = 0; x < W; x += tw, i++) {
      p.rect(x, y, tw - 1, th - 1, (i + row) % 2 ? '#b5532f' : '#d27247');
      p.rect(x, y, tw - 1, 1, (i + row) % 2 ? '#c96a44' : '#e89064');
    }
    y += th;
  }
  // open door on the right, daylight spilling in
  p.rect(292, 52, 26, 68, '#5a3a22'); p.rect(294, 54, 22, 66, '#fff2c8');
  p.rect(294, 54, 6, 66, '#7a4a2a');
  // pedestal and glass case
  p.rect(136, 112, 48, 44, '#8d8a86'); p.rect(136, 112, 48, 3, '#b8b4ae'); p.rect(180, 112, 4, 44, '#6e6b67');
  p.rect(132, 106, 56, 7, '#a7a39d');
  p.dith(138, 70, 44, 36, '#cfe8ee', '#a7cfd8');
  p.rect(138, 70, 44, 1, '#ffffff'); p.rect(138, 70, 1, 36, '#ffffff'); p.rect(181, 70, 1, 36, '#ffffff');
  p.rect(142, 74, 1, 10, '#ffffff'); p.rect(144, 74, 1, 6, '#ffffff');
  // nest
  p.ellipse(160, 102, 16, 4, '#7a5a2a'); p.ellipse(160, 101, 13, 3, '#a07a3c');
  if (egg === 'cracked') {
    p.blob(160, 94, 9, 9, '#5c5a58', '#8e8b88', '#c4c0bc');
    p.rect(151, 86, 19, 6, '#cfe8ee');         // top of the shell is gone
    for (let x = 151; x < 170; x += 2) p.set(x, 92 + ((x >> 1) & 1), '#3a3836');
    p.blob(178, 101, 4, 2, '#5c5a58', '#8e8b88', '#c4c0bc');
    // footprints toward the door
    for (let i = 0; i < 9; i++) {
      const fx = 196 + i * 11, fy = 168 - i * 5 + (i % 2) * 4;
      p.rect(fx, fy, 3, 2, '#3c6e2e'); p.set(fx - 1, fy - 1, '#3c6e2e'); p.set(fx + 3, fy - 1, '#3c6e2e'); p.set(fx + 1, fy - 1, '#3c6e2e');
    }
  } else {
    p.blob(156, 96, 7, 6, '#5c5a58', '#8e8b88', '#c4c0bc');
    creature(p, who, 147, 88, { outline: '#1a2a1a' });
    // the egg next door, wobbling
    p.rect(198, 128, 26, 4, '#a7a39d');
    p.blob(211, 118, 7, 9, '#7a5a8a', '#a07ab8', '#d6b8ea');
    p.set(204, 108, '#ffffff'); p.set(220, 110, '#ffffff'); p.set(202, 112, '#ffffff');
  }
  // cast
  p.sprite(LUZ, LUZ_PAL, 96, 148);
  p.sprite(HERO, HERO_PAL, 214, 150);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 232, 156);
  p.sprite(PUP, PUP_PAL, 248, 162, { flip: false });
}

function piraguaCart(p, x, y, s) {
  // striped umbrella
  for (let i = 0; i < 9; i++) p.rect(x - 6 * s + i * 6 * s, y - 22 * s, 6 * s, 6 * s, i % 2 ? '#ffffff' : '#d23a32');
  p.rect(x - 4 * s, y - 16 * s, 50 * s, 2 * s, '#a02a24');
  p.rect(x + 18 * s, y - 14 * s, 2 * s, 16 * s, '#8a8a8a');
  // cart body
  p.rect(x, y, 40 * s, 22 * s, '#2f6fd1');
  p.rect(x, y, 40 * s, 3 * s, '#5d93e6');
  p.rect(x + 2 * s, y + 6 * s, 36 * s, 10 * s, '#f4f1e8');
  // syrup bottles
  ['#d23a32', '#3f9e4a', '#f2c531', '#f08cb4', '#ec8a2c'].forEach((c, i) => {
    p.rect(x + 4 * s + i * 7 * s, y - 8 * s, 4 * s, 8 * s, c);
    p.rect(x + 5 * s + i * 7 * s, y - 10 * s, 2 * s, 2 * s, '#f4f1e8');
  });
  // wheels
  p.blob(x + 8 * s, y + 24 * s, 5 * s, 5 * s, '#1e1e24', '#3a3a44', '#6a6a74');
  p.blob(x + 32 * s, y + 24 * s, 5 * s, 5 * s, '#1e1e24', '#3a3a44', '#6a6a74');
}

function cart(p) {
  sky(p, 60);
  house(p, -10, 20, 120, 130, '#f2c531', '#ffffff', '#2f6fd1');
  house(p, 110, 26, 110, 124, '#f08cb4', '#ffffff', '#3c7f8a');
  house(p, 220, 20, 110, 130, '#4fb3c8', '#f4f1e8', '#7a4a2a');
  p.rect(0, 146, W, 3, '#c8bca8');
  cobbles(p, 149, 3);
  piraguaCart(p, 120, 108, 2);
  p.sprite(TITO, TITO_PAL, 64, 112, { scale: 2 });
  // spilled cups
  [[90, 182], [104, 188], [212, 186], [226, 180], [240, 190]].forEach(([cx, cy]) => {
    p.rect(cx, cy, 8, 5, '#f4f1e8'); p.rect(cx + 8, cy + 1, 3, 3, '#d23a32');
  });
  // the corgi, paws up on the cart
  p.sprite(PUP, PUP_PAL, 196, 150, { scale: 2, flip: true });
}

function housesUphill(p) {
  sky(p, 90, ['#3b6fd1', '#6aa0ea', '#bfe0fa']);
  cloud(p, 250, 20);
  const set = [
    ['#d23a32', '#ffffff', '#7a4a2a'], ['#2f6fd1', '#ffffff', '#f4f1e8'], ['#f2c531', '#ffffff', '#3f9e4a'],
    ['#3f9e4a', '#f4f1e8', '#f2c531'], ['#f08cb4', '#ffffff', '#2f6fd1'], ['#ec8a2c', '#ffffff', '#3c7f8a'],
  ];
  set.forEach(([wall, trim, door], i) => {
    const x = i * 54 - 4, y = 70 - i * 9;
    house(p, x, y, 54, 150 - y, wall, trim, door);
  });
  // sloped street
  for (let x = 0; x < W; x++) {
    const top = 156 - Math.floor(x * 0.16);
    p.rect(x, top, 1, H - top, ((x >> 2) & 1) ? '#4e6c96' : '#5b7aa6');
    p.set(x, top, '#8fadd2');
  }
  // lamp post with a note
  p.rect(150, 94, 2, 56, '#2a2a30'); p.rect(146, 88, 10, 7, '#2a2a30'); p.rect(148, 90, 6, 4, '#ffe9a0');
  p.rect(144, 116, 14, 10, '#fbf6ee'); p.rect(146, 119, 10, 1, '#555'); p.rect(146, 122, 7, 1, '#555');
  p.sprite(HERO, HERO_PAL, 112, 150);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 98, 156);
  p.sprite(PUP, PUP_PAL, 166, 160);
}

function tree(p, cx, cy, r) {
  p.rect(cx - 7, cy, 14, 80, '#5a3a22'); p.rect(cx - 7, cy, 4, 80, '#7a5232'); p.rect(cx + 4, cy, 3, 80, '#3e2716');
  const leaf = (x, y, rr) => p.blob(x, y, rr, Math.round(rr * 0.8), '#1e5a2a', '#2f7d33', '#4cae4f');
  leaf(cx - r * 0.7, cy - 4, r * 0.6); leaf(cx + r * 0.7, cy - 2, r * 0.6);
  leaf(cx, cy - r * 0.5, r * 0.75); leaf(cx - r * 0.3, cy + 6, r * 0.5); leaf(cx + r * 0.4, cy + 8, r * 0.45);
}

function plaza(p) {
  sky(p, 120);
  cloud(p, 50, 24); cloud(p, 270, 34, 0.7);
  // the sea beyond the city wall
  p.grad(0, 96, W, 22, ['#2a6fb0', '#1d4f86']);
  p.rect(0, 112, W, 16, '#b0a48e'); p.rect(0, 112, W, 2, '#d4c8b0');
  for (let x = 0; x < W; x += 10) p.rect(x, 108, 6, 4, '#b0a48e');
  p.grad(0, 128, W, 72, ['#8a7e6a', '#6e6454']);
  for (let y = 132; y < H; y += 8) for (let x = (y % 16); x < W; x += 16) p.rect(x, y, 14, 6, '#968a74');
  tree(p, 190, 70, 50);
  // a long tail hanging from the leaves
  for (let i = 0; i < 18; i++) p.rect(214 + Math.round(Math.sin(i / 3) * 2), 92 + i, 2, 1, i % 4 < 2 ? '#4cae4f' : '#2f7d33');
  // bench and cat
  p.rect(60, 150, 50, 4, '#7a4a2a'); p.rect(60, 142, 50, 3, '#7a4a2a'); p.rect(64, 154, 3, 10, '#2a2a30'); p.rect(103, 154, 3, 10, '#2a2a30');
  p.sprite(CAT, CAT_PAL, 82, 134);
  p.sprite(HERO, HERO_PAL, 130, 150);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 146, 156);
  p.sprite(PUP, PUP_PAL, 112, 166, { flip: true });
}

function dragonUp(p, { who = null } = {}) {
  sky(p, H, ['#2f63c4', '#4f86de', '#86b8f0', '#c9e4fa']);
  p.blob(270, 34, 16, 16, '#f2b630', '#ffd95a', '#fff2b0');
  // leaves around the edges
  const leaf = (x, y, rr) => p.blob(x, y, rr, Math.round(rr * 0.8), '#1e5a2a', '#2f7d33', '#4cae4f');
  leaf(10, 10, 40); leaf(70, -10, 34); leaf(300, 170, 40); leaf(-10, 120, 34); leaf(170, -20, 30);
  // branch
  for (let x = 0; x < W; x++) {
    const y = 132 - Math.floor(x * 0.12);
    p.rect(x, y, 1, 12, '#5a3a22'); p.rect(x, y, 1, 3, '#7a5232'); p.rect(x, y + 10, 1, 2, '#3e2716');
  }
  creature(p, who, 100, 82, { scale: 4, outline: '#14240f' });
}

function title(p) {
  p.grad(0, 0, W, 130, ['#2a1a4a', '#6a2a6a', '#c8506a', '#f08a4a', '#ffd06a']);
  p.blob(160, 128, 26, 26, '#f2a030', '#ffc860', '#fff0b0');
  // sea, with dithered sunset glints
  p.grad(0, 128, W, 72, ['#d07050', '#5a3a7a', '#1a2a5a']);
  for (let y = 132; y < 190; y += 4) {
    const w = 30 - (y - 132) / 3;
    for (let x = 160 - w; x < 160 + w; x += 3 + ((y >> 2) & 3)) p.rect(x, y, 2, 1, '#ffd06a');
  }
  // El Morro: stepped walls and a sentry box (garita)
  const fort = '#2a1a2e';
  p.rect(200, 104, 120, 26, fort); p.rect(222, 92, 98, 14, fort); p.rect(250, 82, 70, 12, fort);
  for (let x = 222; x < 320; x += 8) p.rect(x, 89, 5, 3, fort);
  p.rect(206, 88, 12, 18, fort); p.ellipse(212, 87, 6, 4, fort); p.rect(211, 80, 2, 4, fort);
  p.rect(286, 60, 14, 24, fort); p.rect(290, 50, 6, 12, fort);
  // little dragon silhouette flying
  p.sprite(DRAGON, { g: fort, G: fort, L: fort, y: fort, b: fort, e: fort, o: fort }, 84, 54, { scale: 2, outline: '' });
  for (let i = 0; i < 40; i++) p.set((i * 73) % W, (i * 37) % 40, '#ffe8f0');
}


/**
 * The map: Old San Juan on its little island at the top left, the north
 * coast running east, the rainforest hills, and the bay at the far right.
 * The engine puts the flags on; map: [x, y] in each card says where.
 */
function map(p) {
  // sea
  p.grad(0, 0, W, H, ['#1d4f86', '#2a6fb0', '#3b82c4']);
  for (let y = 6; y < 110; y += 9) for (let x = (y * 7) % 23; x < W; x += 23) p.rect(x, y, 4, 1, '#5d9bd6');
  // the big island: everything under the coast line
  const coast = (x) => 104 + Math.round(Math.sin(x / 31) * 5 + Math.sin(x / 9) * 2) - Math.round(x / 40);
  for (let x = 0; x < W; x++) {
    const y = coast(x);
    p.rect(x, y, 1, 3, '#f0dc9c');                       // beach
    p.rect(x, y + 3, 1, H - y - 3, '#5fae54');
    if ((x + y) & 1) p.set(x, y + 3, '#f0dc9c');
  }
  for (let y = 112; y < H; y += 6) for (let x = (y * 5) % 17; x < W; x += 17) if (y > coast(x) + 8) p.rect(x, y, 2, 1, '#4c9646');
  // the bay at the far right: a pocket of water behind mangroves
  p.ellipse(300, 106, 13, 7, '#1d4f86'); p.ellipse(300, 105, 11, 5, '#2a6fb0');
  p.set(296, 104, '#b8fff0'); p.set(303, 106, '#b8fff0'); p.set(300, 102, '#b8fff0');
  p.blob(286, 110, 4, 3, '#1e5a2a', '#2f7d33', '#4cae4f'); p.blob(312, 112, 4, 3, '#1e5a2a', '#2f7d33', '#4cae4f');
  // the rainforest hills
  const hill = (x, y, r) => p.blob(x, y, r, Math.round(r * 0.7), '#1e5a2a', '#2f7d33', '#4cae4f');
  hill(226, 150, 22); hill(262, 146, 24); hill(244, 132, 20); hill(250, 160, 26); hill(206, 160, 14);
  p.rect(241, 114, 6, 8, '#8a94a0'); p.rect(242, 110, 4, 5, '#a8b2be'); p.rect(240, 109, 8, 2, '#6a7480'); // the tower
  p.ellipse(214, 154, 4, 3, '#1a1a2a');                                                                    // a cave
  // the road east, dashed
  for (let x = 150; x < 296; x += 7) p.rect(x, 118 + Math.round(Math.sin(x / 40) * 6), 4, 1, '#f4f1e8');
  // Old San Juan: a small island by itself, with a bridge
  p.ellipse(84, 66, 66, 27, '#f0dc9c');
  p.ellipse(84, 65, 63, 24, '#d8c9a0');
  p.dith(40, 56, 88, 20, '#d8c9a0', '#cdbd92');
  p.rect(142, 80, 14, 3, '#8a8a8a'); p.rect(142, 83, 2, 14, '#8a8a8a'); p.rect(154, 83, 2, 12, '#8a8a8a');
  // the old fort on the west point, and the big fort to the east
  const fort = (x, y) => {
    p.rect(x, y, 18, 9, '#8a7e6a'); p.rect(x, y, 18, 2, '#b0a48e');
    for (let i = 0; i < 18; i += 4) p.rect(x + i, y - 2, 2, 2, '#8a7e6a');
    p.rect(x - 3, y + 2, 4, 5, '#8a7e6a'); p.ellipse(x - 1, y + 1, 2, 2, '#b0a48e');
  };
  fort(26, 54); fort(120, 52);
  p.rect(22, 68, 44, 3, '#b0a48e');                                           // the long sunny wall
  // houses in every color
  ['#d23a32', '#2f6fd1', '#f2c531', '#3f9e4a', '#f08cb4', '#ec8a2c', '#4fb3c8'].forEach((c, i) => {
    const hx = 92 + (i % 4) * 9 + (i > 3 ? 4 : 0), hy = i > 3 ? 80 : 72;
    p.rect(hx, hy, 7, 6, c); p.rect(hx, hy, 7, 1, '#ffffff');
  });
  p.rect(82, 60, 12, 8, '#7b4aa8'); p.rect(81, 58, 14, 2, '#e8c66a'); p.rect(87, 63, 2, 5, '#fff2c8');   // the museum
  p.blob(70, 62, 5, 4, '#1e5a2a', '#2f7d33', '#4cae4f'); p.rect(69, 66, 2, 4, '#5a3a22');                // the plaza tree
  // compass
  p.ellipse(22, 176, 12, 12, '#1a1a2a'); p.ellipse(22, 176, 10, 10, '#f4f1e8');
  p.rect(21, 167, 2, 9, '#d23a32'); p.rect(21, 176, 2, 9, '#2a2a30'); p.rect(13, 175, 18, 2, '#8a8aa8');
  for (const [dx, dy] of [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 1], [2, 2], [3, 3], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4]]) p.set(20 + dx, 156 + dy, '#f4f1e8'); // N
}

/** El Morro's sunniest wall, from below. With a hatchling on it once it has been found. */
function wall(p, { who = null, pose = 0, dragon = false } = {}) {
  sky(p, 168, ['#3b6fd1', '#6aa0ea', '#bfe0fa', '#d8ecfa']);
  cloud(p, 60, 22, 0.8);
  p.blob(286, 26, 14, 14, '#f2b630', '#ffd95a', '#fff2b0');
  // the wall leans back as it climbs
  for (let y = 40; y < 168; y++) {
    const x0 = Math.round((168 - y) * 0.22);
    p.rect(x0, y, W - x0, 1, '#d9b98a');
  }
  let s = 7;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let y = 44, row = 0; y < 164; y += 12, row++) {
    const x0 = Math.round((168 - y) * 0.22);
    for (let x = x0 + (row % 2) * 14; x < W; x += 28) {
      p.rect(x + 1, y + 1, 26, 10, ['#e6c898', '#dcbc8a', '#eed4a6', '#d2b07e'][Math.floor(rnd() * 4)]);
      p.rect(x + 1, y + 1, 26, 1, '#f6e4c0');
    }
  }
  for (let x = 26; x < W; x += 10) p.rect(x, 36, 6, 5, '#d9b98a');   // the top edge
  // a sentry box on the corner
  p.rect(292, 14, 16, 24, '#c9a878'); p.ellipse(300, 13, 9, 5, '#b08e60'); p.rect(299, 4, 2, 6, '#b08e60'); p.rect(297, 22, 5, 8, '#3a2a20');
  // grass and the cast, looking up
  p.grad(0, 164, W, 36, ['#5fae54', '#3f8e3e']);
  for (let x = 3; x < W; x += 7) p.rect(x, 162 - (x % 3), 1, 4, '#4c9646');
  p.sprite(HERO, HERO_PAL, 60, 158);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 82, 164);
  p.sprite(PUP, PUP_PAL, 104, 178);
  if (dragon) creature(p, who || { shape: 'anole', body: '#b8935a', dark: '#7a5c30', belly: '#efe0b4', trim: '#f28a2c', wing: '#d8b070' }, 150, 74, { scale: 4, pose, outline: '#3a2a20' });
  else { p.rect(196, 106, 5, 1, '#6e8a3a'); p.rect(194, 105, 2, 1, '#6e8a3a'); p.rect(201, 107, 4, 1, '#6e8a3a'); } // a real anole, small as your finger
}

/** The open casebook on the van seat. */
function casefile(p) {
  p.grad(0, 0, W, H, ['#5a4a6a', '#3e3350', '#2a2238']);
  for (let x = 0; x < W; x += 16) p.rect(x, 0, 1, H, '#4a3c5c');      // seat stitching
  p.rect(48, 34, 224, 136, '#5a3a22'); p.rect(52, 38, 216, 128, '#7a5232');
  p.rect(58, 42, 100, 120, '#fbf6ee'); p.rect(162, 42, 100, 120, '#fbf6ee');
  p.rect(158, 42, 4, 120, '#cfcabb');
  for (let y = 56; y < 150; y += 12) { p.rect(66, y, 84 - ((y * 7) % 30), 2, '#8a8aa8'); }
  // three question marks waiting for an answer
  const q = ['.###.', '#...#', '...#.', '..#..', '.....', '..#..'];
  [176, 204, 232].forEach((qx, i) => {
    p.rect(qx - 4, 58, 26, 34, '#e8e2d2'); p.rect(qx - 4, 58, 26, 2, '#cfcabb');
    q.forEach((row, ry) => [...row].forEach((c, rx) => { if (c === '#') p.rect(qx + rx * 3 + 1, 64 + ry * 4, 3, 4, ['#d23a32', '#2f6fd1', '#3f9e4a'][i]); }));
  });
  p.rect(176, 110, 72, 2, '#8a8aa8'); p.rect(176, 122, 56, 2, '#8a8aa8'); p.rect(176, 134, 66, 2, '#8a8aa8');
  // magnifying glass
  p.ellipse(116, 118, 20, 20, '#2a2a30'); p.ellipse(116, 118, 16, 16, '#cfe8ee'); p.ellipse(110, 112, 5, 4, '#ffffff');
  for (let i = 0; i < 26; i++) p.rect(130 + i, 132 + i, 5, 5, '#2a2a30');
  p.sprite(PUP, PUP_PAL, 8, 150, { scale: 3, flip: false });
}

/** The egg a run earns. */
function eggPic(dark, base, light) {
  return (p) => {
    p.grad(0, 0, W, H, ['#2a1a4a', '#3e2a6a', '#5a3a7a']);
    for (let i = 0; i < 60; i++) p.set((i * 73) % W, (i * 41) % 120, '#ffe8f0');
    p.rect(0, 150, W, 50, '#7a4a2a'); p.rect(0, 150, W, 3, '#a86e44');
    p.ellipse(160, 152, 60, 12, '#7a5a2a'); p.ellipse(160, 150, 52, 9, '#a07a3c');
    for (let x = 108; x < 212; x += 5) p.rect(x, 146 + ((x >> 1) & 3), 3, 1, '#c9a35a');
    p.blob(160, 100, 40, 52, dark, base, light);
    p.ellipse(146, 78, 6, 10, '#ffffff');
    for (const [sx, sy] of [[96, 60], [226, 72], [110, 128], [214, 122], [160, 34]]) {
      p.rect(sx - 4, sy, 9, 1, '#ffffff'); p.rect(sx, sy - 4, 1, 9, '#ffffff');
    }
  };
}


// ---------------------------------------------------------------------------
// The bat dragon's lair: the deepest room in the tunnels.

/** A hatchling hanging upside down by its toes. */
function hanging(p, parts, x, y, scale, { outline = '#1a1a2a', one = '' } = {}) {
  const k = { ...PLAIN, ...(parts || {}) };
  const grid = (SHAPES[k.shape] || SHAPES.lizard).slice().reverse();
  const pal = one ? { b: one, d: one, l: one, t: one, w: one, e: one } : { b: k.body, d: k.dark, l: k.belly, t: k.trim, w: k.wing, e: '#1e1414' };
  p.sprite(grid, pal, x, y, { scale, outline });
}

const BAT_PARTS = { shape: 'bat', body: '#7a5a44', dark: '#4a3426', belly: '#b89a80', trim: '#e8b0a0', wing: '#5a4034' };

/**
 * The room with the lantern off. Each click (t.pose counts them) sends a
 * ring of sound out from the kids, and whatever the ring has passed stays
 * drawn in faint lines: first the floor and walls, then the arch, then the
 * shape on the ceiling. t.pulse runs 0 to 1 as a ring spreads.
 */
function echoRoom(p, { pose = 0, pulse = 0 } = {}) {
  p.rect(0, 0, W, H, '#04050b');
  const sx = 160, sy = 196, reach = 250;
  const front = pulse * reach;
  const dist = (x, y) => Math.hypot(x - sx, (y - sy) * 1.15);
  /** A dot of line art that belongs to click number `level`. */
  const dot = (x, y, level) => {
    if (pose > level) { p.set(x, y, '#1f6f78'); return; }
    if (pose < level) return;
    const d = dist(x, y);
    if (d > front) return;
    p.set(x, y, front - d < 22 && pulse < 1 ? '#b8fff0' : '#2fa0a8');
  };
  const line = (x0, y0, x1, y1, level, gap = 1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= n; i += gap) dot(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), level);
  };
  // 1: the floor and the side walls, running back to the far wall
  line(0, 196, 96, 132, 1); line(319, 196, 224, 132, 1); line(96, 132, 224, 132, 1);
  for (let i = 1; i < 5; i++) line(96 - i * 22, 132 + i * 15, 224 + i * 22, 132 + i * 15, 1, 3);
  line(96, 132, 96, 64, 1); line(224, 132, 224, 64, 1);
  line(0, 20, 96, 64, 1, 2); line(319, 20, 224, 64, 1, 2);
  // 2: the arched ceiling and its stones
  for (let a = 0; a <= 180; a += 2) {
    const r = (a * Math.PI) / 180;
    dot(Math.round(160 - Math.cos(r) * 64), Math.round(64 - Math.sin(r) * 34), 2);
    if (a % 6 === 0) dot(Math.round(160 - Math.cos(r) * 100), Math.round(48 - Math.sin(r) * 44), 2);
  }
  for (let y = 74; y < 130; y += 14) for (let x = 100 + ((y / 14) % 2) * 10; x < 222; x += 20) line(x, y, x + 12, y, 2, 2);
  line(132, 132, 132, 104, 2, 2); line(188, 132, 188, 104, 2, 2); line(132, 104, 188, 104, 2, 2);   // a doorway at the back
  // 3: the shape on the ceiling, upside down
  const grid = SHAPES.bat.slice().reverse();
  grid.forEach((row, gy) => [...row].forEach((c, gx) => {
    if (c === '.') return;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ((grid[gy + dy] || '')[gx + dx] || '.') === '.');
    for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 3; xx++) if (edge || (xx + yy) % 2 === 0) dot(127 + gx * 3 + xx, 36 + gy * 3 + yy, 3);
  }));
  // the ring itself
  if (pose > 0 && pulse < 1) {
    for (let a = 0; a < 360; a += 1) {
      const r = (a * Math.PI) / 180;
      const x = Math.round(sx + Math.cos(r) * front), y = Math.round(sy + (Math.sin(r) * front) / 1.15);
      if (y < H - 2) p.set(x, y, a % 3 ? '#7fe8e0' : '#2fa0a8');
    }
  }
  // three pairs of eyes in the dark: two kids and a corgi
  for (const [ex, ey] of [[146, 176], [166, 180], [186, 190]]) { p.rect(ex, ey, 2, 2, '#f4f1e8'); p.rect(ex + 4, ey, 2, 2, '#f4f1e8'); }
}

/** The same room by lantern light, with the hatchling on the ceiling. */
function echoDragon(p, { who = null } = {}) {
  p.grad(0, 0, W, H, ['#1a1420', '#3a2a2a', '#5a4030']);
  // the far wall, its arch, and the doorway
  p.rect(96, 64, 128, 68, '#4a3a30'); p.ellipse(160, 64, 64, 34, '#4a3a30');
  for (let y = 40; y < 130; y += 12) for (let x = 98 + ((y / 12) % 2) * 9; x < 220; x += 18) {
    if (Math.hypot((x + 8 - 160) / 64, Math.min(0, y - 64) / 34) > 1) continue;
    p.rect(x, y, 16, 10, ((x + y) >> 2) % 3 ? '#6a5444' : '#5e4a3c'); p.rect(x, y, 16, 1, '#86705c');
  }
  p.rect(136, 96, 48, 36, '#120e14'); p.ellipse(160, 96, 24, 10, '#120e14');
  // the floor
  p.grad(0, 132, W, 68, ['#4a3c34', '#2e2622']);
  for (let i = 1; i < 5; i++) p.rect(96 - i * 22, 132 + i * 15, 128 + i * 44, 1, '#5e4e44');
  // side walls in shadow
  for (let x = 0; x < 96; x++) { const top = 20 + Math.round((x * 44) / 96); p.rect(x, top, 1, 196 - Math.round((x * 64) / 96) - top, x % 14 < 1 ? '#2a2026' : '#3a2c30'); }
  for (let x = 224; x < W; x++) { const k = W - 1 - x, top = 20 + Math.round((k * 44) / 96); p.rect(x, top, 1, 196 - Math.round((k * 64) / 96) - top, x % 14 < 1 ? '#2a2026' : '#3a2c30'); }
  // lantern glow, held low
  p.blob(118, 150, 26, 18, '#6a4a2a', '#a8702c', '#e8b050');
  p.rect(115, 140, 7, 10, '#2a2a30'); p.rect(116, 142, 5, 6, '#fff2b0');
  hanging(p, who || BAT_PARTS, 116, 30, 4, { outline: '#f0d8a0' });
  p.sprite(HERO, HERO_PAL, 128, 150);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 150, 158);
  p.sprite(PUP, PUP_PAL, 172, 172);
}

// ---------------------------------------------------------------------------
// The boa dragon's lair: a cave mouth hung with vines.

const BOA_PARTS = { shape: 'snake', body: '#c09a62', dark: '#6e4a2a', belly: '#ecd9a8', trim: '#c09a62', wing: '#c09a62' };

/**
 * what: 'real'    a real boa among the vines, holding still (the detour)
 *       'hiding'  the hatchling among the vines; it blinks now and then
 *       'found'   the hatchling out in the open
 */
function cave(p, what, { who = null, frame = 0 } = {}) {
  sky(p, 70, ['#3b6fd1', '#6aa0ea', '#bfe0fa']);
  cloud(p, 262, 18, 0.7);
  // the hillside
  p.grad(0, 34, W, 166, ['#7a8a6a', '#6a7460', '#565c50']);
  let s = 11;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 46; i++) { const x = rnd() * W, y = 44 + rnd() * 120, w = 14 + rnd() * 26; p.rect(x, y, w, 2, '#8a9a7a'); p.rect(x + 2, y + 2, w, 1, '#4a5046'); }
  const bush = (x, y, r) => p.blob(x, y, r, Math.round(r * 0.7), '#1e5a2a', '#2f7d33', '#4cae4f');
  bush(20, 40, 30); bush(300, 46, 34); bush(160, 30, 44); bush(90, 34, 26); bush(236, 32, 28);
  // the cave mouth
  p.ellipse(160, 118, 86, 62, '#2a2a30'); p.rect(74, 118, 173, 62, '#2a2a30');
  p.ellipse(160, 120, 80, 58, '#0c0c14'); p.rect(80, 120, 161, 60, '#0c0c14');
  // the ground
  p.grad(0, 170, W, 30, ['#6e6454', '#564c40']);
  for (let x = 4; x < W; x += 9) p.rect(x, 172 + (x % 4), 5, 1, '#8a7e6a');
  // vines across the mouth
  // The hatchling is the color of the vines while it hides; a real boa is brown.
  const k = what === 'hiding' ? { body: '#4c8a3a', dark: '#2c5c2a' } : BOA_PARTS;
  const vine = (x, len, sway, a, b) => {
    for (let i = 0; i < len; i++) {
      const vx = x + Math.round(Math.sin(i / 7 + sway) * 2);
      p.rect(vx, 58 + i, 2, 1, i % 6 < 3 ? a : b);
      if (i % 11 === 5) { p.rect(vx + 2, 58 + i, 3, 2, a); p.set(vx + 5, 59 + i, b); }   // a leaf
    }
  };
  const open = what === 'found';
  [[92, 70, 0], [108, 96, 1], [124, 84, 2], [142, 104, 3], [158, 76, 4], [176, 98, 5], [214, 88, 0.5], [230, 66, 1.5]].forEach(([x, len, sway]) => {
    if (open && x > 120 && x < 200) len = 26;         // the vines part once it comes out
    vine(x, len, sway, '#2f7d33', '#1e5a2a');
  });
  if (!open) {
    // the one that is not a vine: thicker, striped, with a head at the end
    for (let i = 0; i < 70; i++) {
      const vx = 196 + Math.round(Math.sin(i / 7 + 2.4) * 2);
      p.rect(vx, 58 + i, 3, 1, i % 8 < 5 ? k.body : k.dark);
    }
    p.rect(194, 126, 7, 8, k.body); p.rect(195, 134, 5, 2, k.body); p.rect(194, 126, 7, 1, k.dark);
    const blink = what === 'hiding' && frame % 12 >= 10;
    if (blink) p.rect(195, 129, 3, 1, k.dark);
    else if (what === 'hiding') { p.rect(195, 128, 3, 3, '#ffe9a0'); p.set(196, 129, '#1e1414'); }
    else p.rect(195, 128, 2, 2, '#1e1414');
  } else {
    creature(p, who || BOA_PARTS, 116, 112, { scale: 4, outline: '#0c0c14' });
  }
  p.sprite(HERO, HERO_PAL, 36, 150);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 56, 158);
  p.sprite(PUP, PUP_PAL, 74, 174);
}
const caveVines = (p, t) => cave(p, 'hiding', t);
caveVines.fps = 4;


/**
 * Scene name -> painter. A name here wins over a PNG with the same name.
 * A painter is called as fn(p, t): t.who is the sprite: of the hatchling
 * this run is after, t.frame counts up for a scene that moves (set fn.fps),
 * and t.pose comes from a lair toy.
 */
export const scenes = {
  museum,
  nest: (p, t) => museum(p, { egg: 'dragon', who: t.who }),
  casefile,
  map,
  cart,
  houses: housesUphill,
  plaza,
  dragon: dragonUp,
  wall,
  'wall-dragon': (p, t) => wall(p, { who: t.who, pose: t.pose, dragon: true }),
  'echo-room': echoRoom,
  'echo-dragon': echoDragon,
  cave: (p, t) => cave(p, 'real', t),
  'cave-vines': caveVines,
  'cave-dragon': (p, t) => cave(p, 'found', t),
  'egg-gold': eggPic('#b8862a', '#f2c531', '#fff2b0'),
  'egg-silver': eggPic('#7a8490', '#c4ccd4', '#ffffff'),
  'egg-bronze': eggPic('#7a4a2a', '#c98a4e', '#f0c8a0'),
  title,
};
