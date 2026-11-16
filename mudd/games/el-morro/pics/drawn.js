// @ts-check
// Scenes drawn in code for THE DRAGON OF EL MORRO. Places with a trip photo
// use the PNG in this folder instead (see pics: in game.yaml).
// Each scene is a function that paints a 320x200 framebuffer. The hatchlings
// are drawn here too: the engine asks for one with creature().

import { W, H, shade, Pix } from '../../../engine/art.js';

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
    // The hatchling is as big here as in its lair: it barely fits in the case.
    p.blob(160, 98, 9, 6, '#5c5a58', '#8e8b88', '#c4c0bc');
    creature(p, who, 127, 75, { scale: 3, outline: '#1a2a1a' });
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
  for (const [fx, fy] of [[221, 127], [257, 133]]) { p.rect(fx, fy, 2, 7, '#eef5fc'); p.rect(fx - 1, fy + 7, 4, 1, '#8fc0f2'); }   // two waterfalls
  p.rect(172, 94, 7, 2, '#d23a32'); p.rect(175, 96, 1, 4, '#f4f1e8');                                        // a beach umbrella
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


// ---------------------------------------------------------------------------
// The coquí dragon's lair: a mossy hollow under a giant tree, by a stream.

const COQUI_PARTS = { shape: 'frog', body: '#c8964e', dark: '#8a6230', belly: '#f2e2b4', trim: '#e8734a', wing: '#e0b070' };

/** A music note, for a song you can see. */
function note(p, x, y, hex) {
  p.rect(x + 3, y, 1, 8, hex); p.rect(x + 3, y, 4, 2, hex);
  p.ellipse(x + 1, y + 8, 2, 1, hex);
}

/**
 * what: 'real'   a real coquí on a wet leaf (the detour)
 *       'song'   two eyes in the hollow; t.pose is the note it is singing
 *       'found'  the hatchling out on the leaf
 */
function hollow(p, what, { who = null, pose = 0 } = {}) {
  // deep forest, dim as evening
  p.grad(0, 0, W, 124, ['#0c261e', '#123426', '#1a462e']);
  for (const [x, w] of [[14, 9], [52, 6], [224, 8], [262, 12], [300, 7]]) { p.rect(x, 0, w, 126, '#0a1c16'); p.rect(x, 0, 2, 126, '#153226'); }
  for (const x of [30, 206, 284]) for (let y = 0; y < 112; y += 3) p.rect(x + Math.round(y * 0.22), y, 5, 1, '#245a3a');   // thin shafts of light
  p.grad(0, 124, W, 76, ['#25502c', '#1b3e24', '#132c1a']);
  for (let i = 0; i < 70; i++) p.rect((i * 53) % W, 128 + ((i * 29) % 70), 3, 1, i % 3 ? '#2f6a36' : '#183822');
  // the stream, running down the right side
  for (let y = 126; y < H; y++) {
    const cx = 252 + Math.round((y - 126) * 0.45) + Math.round(Math.sin(y / 8) * 5), hw = 9 + Math.round((y - 126) * 0.3);
    p.rect(cx - hw, y, hw * 2, 1, '#173f6c');
    p.rect(cx - hw + 2, y, hw * 2 - 4, 1, (y + Math.round(cx / 3)) % 5 < 2 ? '#3b82c4' : '#2a6fb0');
    if (y % 6 === 0) p.rect(cx - 5, y, 9, 1, '#9cc8f2');
  }
  for (const [x, y] of [[236, 150], [262, 172], [286, 190]]) p.blob(x, y, 7, 4, '#3a3a40', '#5a5a64', '#8a8a96');   // stones in the water
  // the giant tree and its roots
  p.rect(100, 0, 92, 112, '#3a2a1c');
  for (let x = 104; x < 190; x += 8) p.rect(x, 0, 2, 112, '#2a1e14');
  p.rect(100, 0, 5, 112, '#523c28');
  for (let i = 0; i < 46; i++) {
    p.rect(100 - Math.round(i * 0.9), 106 + i, 20, 1, '#3a2a1c'); p.rect(100 - Math.round(i * 0.9), 106 + i, 3, 1, '#523c28');
    p.rect(172 + Math.round(i * 0.9), 106 + i, 20, 1, '#3a2a1c'); p.rect(189 + Math.round(i * 0.9), 106 + i, 3, 1, '#2a1e14');
  }
  p.ellipse(146, 138, 34, 26, '#2a1e14'); p.rect(112, 138, 69, 16, '#2a1e14');
  p.ellipse(146, 142, 27, 21, '#050c09'); p.rect(119, 142, 55, 12, '#050c09');
  // moss and ferns
  const moss = (x, y, r) => p.blob(x, y, r, Math.round(r * 0.55), '#1e5a2a', '#3f8e3e', '#7ac860');
  moss(112, 110, 14); moss(146, 108, 18); moss(182, 112, 13); moss(86, 142, 9); moss(206, 144, 10);
  const fern = (x, y, flip) => { for (let i = 0; i < 14; i++) { const fx = x + (flip ? -i : i), fy = y - Math.round(Math.sin(i / 5) * 9); p.rect(fx, fy, 1, 5 - Math.floor(i / 4), '#3f9e4a'); p.set(fx, fy, '#7ac860'); } };
  fern(60, 150, false); fern(86, 156, true); fern(214, 160, false); fern(40, 138, true);
  // a wet leaf out in front
  p.ellipse(152, 176, 40, 9, '#1e5a2a'); p.ellipse(152, 175, 37, 7, '#2f8a3a'); p.rect(118, 175, 70, 1, '#7ac860');
  p.set(140, 171, '#cfe6fa'); p.set(170, 178, '#cfe6fa'); p.set(128, 177, '#cfe6fa');
  if (what === 'song') {
    // two big eyes in the dark, and a throat that puffs with each note
    const blink = pose === 0;
    p.rect(138, 144, 4, blink ? 3 : 4, '#ffe9a0'); p.rect(150, 144, 4, blink ? 3 : 4, '#ffe9a0');
    p.set(140, 145, '#1e1414'); p.set(152, 145, '#1e1414');
    if (pose === 1) { p.ellipse(146, 152, 4, 2, '#e8c890'); note(p, 120, 126, '#9cd8f2'); }
    if (pose >= 2) { p.ellipse(146, 153, 7, 4, '#f2e2b4'); note(p, 166, 114, '#fff2b0'); note(p, 178, 120, '#fff2b0'); }
  } else if (what === 'found') {
    creature(p, who || COQUI_PARTS, 108, 134, { scale: 4, outline: '#06100c' });
  } else {
    // a real coquí, about as big as a thumbnail, singing
    p.rect(150, 170, 6, 4, '#a87a44'); p.rect(149, 173, 8, 2, '#a87a44'); p.set(151, 170, '#1e1414'); p.set(154, 170, '#1e1414'); p.rect(151, 174, 4, 1, '#e8d8a8');
    note(p, 162, 152, '#9cd8f2'); note(p, 174, 144, '#fff2b0');
  }
  p.sprite(HERO, HERO_PAL, 16, 150);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 38, 158);
  p.sprite(PUP, PUP_PAL, 58, 176);
}

// ---------------------------------------------------------------------------
// The parrot dragon's lair: a hollow high in an old tree, seen from below.

const PARROT_PARTS = { shape: 'bird', body: '#3fae4a', dark: '#2a7a34', belly: '#9ade6e', trim: '#d23a32', wing: '#2f6fd1' };

/**
 * what: 'real'   a real parrot peeking out of the hollow (the detour)
 *       'call'   the hatchling in the hollow; with each call (t.pose) it
 *                leans out a little more, and t.pulse spreads the squawk
 *       'found'  the hatchling down on a low branch, wings still open
 */
function oldTree(p, what, { who = null, pose = 0, pulse = 0 } = {}) {
  sky(p, H, ['#3b6fd1', '#6aa0ea', '#bfe0fa', '#d8ecfa']);
  const leaf = (x, y, rr) => p.blob(x, y, rr, Math.round(rr * 0.8), '#1e5a2a', '#2f7d33', '#4cae4f');
  leaf(20, 14, 44); leaf(84, -6, 34); leaf(300, 20, 46); leaf(250, -10, 34); leaf(-6, 96, 30); leaf(322, 110, 30);
  // the trunk: wide at your feet, narrow far above
  for (let y = 0; y < 186; y++) {
    const hw = 24 + Math.round(y * 0.2);
    p.rect(170 - hw, y, hw * 2, 1, '#5a3a22'); p.rect(170 - hw, y, 5, 1, '#7a5232'); p.rect(170 + hw - 7, y, 7, 1, '#3e2716');
    for (let k = -2; k <= 2; k++) if ((y + k * 11) % 23 < 15) p.set(170 + k * Math.round(hw / 3.2), y, '#4a2e1a');
  }
  // a low branch on the left, and the stub of the one that broke off
  for (let x = 0; x < 150; x++) { const y = 150 - Math.round(x * 0.1); p.rect(x, y, 1, 9, '#5a3a22'); p.rect(x, y, 1, 2, '#7a5232'); p.rect(x, y + 7, 1, 2, '#3e2716'); }
  leaf(18, 138, 16); leaf(52, 160, 12);
  p.rect(196, 52, 22, 9, '#5a3a22'); p.rect(196, 52, 22, 2, '#7a5232'); p.rect(216, 50, 4, 13, '#8a6a48');
  leaf(170, -14, 30);
  // the hollow
  p.ellipse(170, 60, 14, 17, '#3e2716'); p.ellipse(170, 61, 11, 14, '#0e0a08');
  p.grad(0, 186, W, 14, ['#3f8e3e', '#2f6e30']);
  const k = { ...PARROT_PARTS, ...(who || {}) };
  /** A head at the hollow, `out` pixels out of the dark. */
  const head = (out) => {
    const y = 66 - Math.min(out, 6);
    p.ellipse(170, y, 6, 6, k.dark); p.ellipse(170, y - 1, 5, 5, k.body);
    p.rect(166, y - 6, 9, 2, k.trim);                        // the red forehead
    p.rect(166, y - 2, 3, 3, '#ffffff'); p.set(167, y - 1, '#1e1414');   // a white ring around the eye
    p.rect(172, y - 2, 3, 3, '#ffffff'); p.set(173, y - 1, '#1e1414');
    p.rect(169, y + 1, 3, 3, '#e8d8a8'); p.set(170, y + 4, '#c8b888');   // beak
  };
  if (what === 'real') head(2);
  if (what === 'call') {
    if (pose === 0) { p.rect(166, 62, 2, 2, '#ffe9a0'); p.rect(173, 62, 2, 2, '#ffe9a0'); }
    if (pose === 1) { p.rect(166, 66, 9, 2, k.trim); p.rect(166, 69, 2, 2, '#ffffff'); p.rect(173, 69, 2, 2, '#ffffff'); }
    if (pose === 2) head(1);
    if (pose >= 3) {
      head(6);
      p.rect(156, 62, 8, 3, k.body); p.rect(150, 60, 8, 3, k.wing); p.rect(146, 58, 6, 2, k.wing);     // one wing opening
      p.rect(177, 62, 8, 3, k.body); p.rect(183, 60, 8, 3, k.wing); p.rect(189, 58, 6, 2, k.wing);
    }
    // the squawk, spreading out from the hollow
    if (pose > 0 && pulse < 1) {
      const r = 20 + pulse * 46;
      for (let a = 200; a <= 340; a += 4) {
        const t = (a * Math.PI) / 180;
        p.rect(Math.round(170 + Math.cos(t) * r), Math.round(60 + Math.sin(t) * r * 0.8), 2, 2, a % 8 ? '#fff2b0' : '#ffffff');
      }
    }
  }
  if (what === 'found') {
    // the way it came down, in blue
    for (let i = 0; i < 26; i++) { const t = i / 26; p.rect(Math.round(160 - t * 70 + Math.sin(t * 5) * 10), Math.round(70 + t * 46), 2, 1, i % 2 ? k.wing : '#8fc0f2'); }
    creature(p, who || PARROT_PARTS, 36, 104, { scale: 4, outline: '#14240f' });
  }
  p.sprite(HERO, HERO_PAL, 228, 150);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 250, 158);
  p.sprite(PUP, PUP_PAL, 272, 176);
}

// ---------------------------------------------------------------------------
// The turtle dragon's lair: a bump in the sand at the quiet end of a beach.

const TURTLE_PARTS = { shape: 'turtle', body: '#5a7a8a', dark: '#2e3e4e', belly: '#c8d4dc', trim: '#7a94a4', wing: '#5a7a8a' };

/**
 * what: 'real'   tracks where a real turtle came up to nest and went back (the detour)
 *       'nest'   a bump in the sand that wiggles; with each tap (t.pose) more of the hatchling shows
 *       'found'  the hatchling out on the sand
 */
function sandNest(p, what, { who = null, pose = 0, frame = 0 } = {}) {
  sky(p, 64, ['#3b6fd1', '#6aa0ea', '#bfe0fa', '#f4ead0']);
  cloud(p, 70, 20, 0.8); cloud(p, 236, 30, 0.6);
  p.grad(0, 60, W, 36, ['#1d4f86', '#2a6fb0', '#4fb3c8']);
  for (let y = 64; y < 92; y += 6) for (let x = (y * 11) % 29; x < W; x += 29) p.rect(x, y, 6, 1, '#8fd0e6');
  p.grad(0, 96, W, 104, ['#f4e2a8', '#e8cf8c', '#d8b870']);
  for (let x = 0; x < W; x++) { const y = 94 + Math.round(Math.sin(x / 21) * 2 + Math.sin(x / 7)); p.rect(x, y, 1, 3, '#f4fbff'); p.rect(x, y + 3, 1, 2, '#e0d2a0'); }
  for (let i = 0; i < 90; i++) p.set((i * 67) % W, 104 + ((i * 37) % 92), i % 2 ? '#c8a860' : '#fff2c8');
  // a palm leaning in from the right
  for (let i = 0; i < 80; i++) p.rect(300 - Math.round(i * 0.25) + Math.round(Math.sin(i / 14) * 3), 150 - i, 5, 1, i % 6 < 3 ? '#7a5232' : '#5a3a22');
  const frond = (dx, dy) => { for (let i = 0; i < 30; i++) { const x = 282 + Math.round(dx * i), y = 70 + Math.round(dy * i + (i * i) / 60); p.rect(x, y, 3, 2, i % 2 ? '#2f7d33' : '#4cae4f'); } };
  frond(-1.2, -0.5); frond(-0.9, 0.1); frond(0.9, -0.4); frond(0.5, 0.3); frond(-0.3, -0.9);
  // two wavy lines up from the water to the bump
  const track = (x0, y0, x1, y1) => {
    for (let i = 0; i <= 44; i++) {
      const t = i / 44, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, wob = Math.sin(i / 1.6) * 2;
      p.rect(Math.round(x - 6 - wob), Math.round(y), 4, 1, '#b8985a'); p.rect(Math.round(x + 6 + wob), Math.round(y), 4, 1, '#b8985a');
    }
  };
  if (what === 'real') {
    track(120, 100, 180, 128); track(196, 128, 236, 100);       // up to nest, and back to the sea
    p.ellipse(188, 132, 20, 8, '#c8a860'); p.ellipse(188, 133, 15, 5, '#b08e50'); p.rect(176, 130, 24, 1, '#e8cf8c');
  } else {
    track(120, 100, 180, 126);
    if (what === 'nest') {
      const k = { ...TURTLE_PARTS, ...(who || {}) };
      const wig = frame % 4 === 1 ? 1 : frame % 4 === 3 ? -1 : 0;
      p.ellipse(186 + wig, 134, 20, 9, '#c8a860'); p.ellipse(186 + wig, 132, 18, 8, '#f0dc9c'); p.ellipse(180 + wig, 129, 8, 3, '#fff2c8');
      // grains hopping where the sand moves
      for (let i = 0; i < 5 + pose * 3; i++) p.set(172 + ((i * 13 + frame * 5) % 30), 122 - ((i * 7 + frame * 3) % (6 + pose * 2)), i % 2 ? '#c8a860' : '#fff2c8');
      if (pose >= 1) { p.ellipse(186, 130, 5 + pose * 3, 2 + pose, '#b08e50'); p.ellipse(186, 130, 3 + pose * 3, 1 + pose, k.dark); }
      if (pose >= 2) { p.rect(180, 129, 12, 1, k.body); p.rect(183, 127, 1, 5, k.body); p.rect(189, 127, 1, 5, k.body); }
      if (pose >= 3) { p.ellipse(172, 128, 4, 3, k.body); p.set(170, 127, '#1e1414'); p.rect(196, 134, 7, 2, k.body); }
    } else {
      p.ellipse(190, 140, 26, 8, '#c8a860'); p.ellipse(190, 141, 20, 5, '#b08e50');
      for (let i = 0; i < 14; i++) p.set(150 + ((i * 17) % 90), 108 + ((i * 11) % 14), '#c8a860');   // sand in the air
      creature(p, who || TURTLE_PARTS, 146, 102, { scale: 4, outline: '#3a2a20' });
    }
  }
  p.sprite(HERO, HERO_PAL, 36, 152);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 58, 160);
  p.sprite(PUP, PUP_PAL, 80, 178);
}
const sandWiggle = (p, t) => sandNest(p, 'nest', t);
sandWiggle.fps = 4;

// ---------------------------------------------------------------------------
// El Morro's lawn, the tower view, the bay, and the road between places.

/** A diamond kite with a tail, and its string down to a hand at (sx, sy). */
function kiteAt(p, x, y, a, b, sx, sy) {
  for (let i = 0; i <= 60; i++) { const t = i / 60; p.set(Math.round(x + (sx - x) * t), Math.round(y + 8 + (sy - y - 8) * t + Math.sin(t * 3.14) * 5), '#f4f1e8'); }
  for (let dy = -6; dy <= 8; dy++) {
    const hw = dy < 0 ? 6 + dy : Math.round((8 - dy) * 0.75);
    p.rect(x - hw, y + dy, hw, 1, dy < 0 ? a : b); p.rect(x, y + dy, hw + 1, 1, dy < 0 ? b : a);
  }
  p.rect(x, y - 6, 1, 15, '#24140e'); p.rect(x - 5, y, 11, 1, '#24140e');
  for (let i = 0; i < 4; i++) p.rect(x + (i % 2 ? 1 : -2), y + 10 + i * 3, 2, 2, i % 2 ? a : b);
}

/** El Morro across its lawn: the long walls, the lighthouse, and a sky full of kites. */
function lawn(p) {
  sky(p, 100);
  cloud(p, 96, 30, 1.1); cloud(p, 214, 14, 0.8); cloud(p, 20, 60, 0.7);
  p.grad(0, 88, W, 12, ['#1d4f86', '#2a6fb0']);
  const stone = '#9a9284', lit = '#c0b8a6', dark = '#6e675c';
  // the upper level and the lighthouse behind the outer wall
  p.rect(112, 62, 150, 20, stone); p.rect(112, 62, 150, 2, lit);
  for (let x = 112; x < 262; x += 8) p.rect(x, 59, 5, 3, stone);
  p.rect(204, 36, 16, 28, '#8a8478'); p.rect(204, 36, 4, 28, lit); p.rect(202, 34, 20, 3, dark);
  p.rect(208, 26, 8, 8, '#2a2a30'); p.rect(209, 27, 6, 5, '#f2e8a0'); p.rect(207, 24, 10, 2, dark); p.rect(211, 20, 2, 4, dark);
  p.rect(209, 44, 3, 5, '#2a2a30'); p.rect(209, 54, 3, 5, '#2a2a30');
  // the outer wall, with its teeth, its gate, and a sentry box on the corner
  p.rect(38, 78, 256, 22, stone); p.rect(38, 78, 256, 2, lit); p.rect(38, 95, 256, 5, dark);
  for (let x = 38; x < 294; x += 8) p.rect(x, 75, 5, 3, stone);
  for (let x = 54; x < 284; x += 22) p.rect(x, 84, 2, 6, dark);
  p.rect(151, 88, 13, 12, '#2a221c'); p.ellipse(157, 88, 6, 5, '#2a221c');
  p.rect(30, 68, 10, 16, lit); p.ellipse(35, 68, 5, 4, dark); p.rect(34, 73, 2, 4, '#2a2a30'); p.rect(34, 62, 2, 3, dark);
  // the lawn, and the path to the gate
  p.grad(0, 100, W, 100, ['#6ab04a', '#4f9a3a', '#3f8a30', '#2f7a2a']);
  for (let i = 0; i < 170; i++) { const x = (i * 73) % W, y = 103 + ((i * 41) % 95); p.rect(x, y, 1, 2, i % 3 ? '#7cc45a' : '#2f6a24'); }
  for (let y = 100; y < H; y++) { const t = (y - 100) / 100, cx = 157 + Math.round(t * t * 46), hw = 3 + Math.round(t * 15); p.rect(cx - hw, y, hw * 2, 1, (y & 1) ? '#d8c89a' : '#cbb98a'); }
  // kites, and the people flying them
  const flyer = (x, y, shirt) => { p.rect(x, y, 3, 5, shirt); p.rect(x, y - 3, 3, 3, '#dca88a'); p.rect(x, y + 5, 1, 3, '#36466e'); p.rect(x + 2, y + 5, 1, 3, '#36466e'); };
  flyer(98, 118, '#d23a32'); kiteAt(p, 58, 34, '#d23a32', '#f2c531', 99, 119);
  flyer(238, 126, '#2f6fd1'); kiteAt(p, 268, 50, '#2f6fd1', '#f4f1e8', 239, 127);
  flyer(126, 110, '#f2c531'); kiteAt(p, 150, 18, '#3f9e4a', '#f2c531', 127, 111);
  flyer(300, 112, '#f4f1e8'); kiteAt(p, 300, 22, '#ec8a2c', '#d23a32', 301, 113);
  // the kite stand: a striped awning and a line of little kites
  p.rect(238, 150, 2, 30, '#5a3a22'); p.rect(294, 150, 2, 30, '#5a3a22');
  for (let i = 0; i < 8; i++) p.rect(234 + i * 8, 142, 8, 9, i % 2 ? '#f4f1e8' : '#d23a32');
  p.rect(234, 151, 64, 1, '#8a2a24');
  ['#f2c531', '#2f6fd1', '#3f9e4a', '#ec8a2c'].forEach((c, i) => {
    const x = 248 + i * 12;
    for (let dy = -4; dy <= 5; dy++) { const hw = dy < 0 ? 4 + dy : Math.round((5 - dy) * 0.8); p.rect(x - hw, 162 + dy, hw * 2 + 1, 1, c); }
    p.rect(x, 152, 1, 6, '#f4f1e8');
  });
  p.rect(238, 172, 58, 8, '#7a5232'); p.rect(238, 172, 58, 2, '#9a6a42');
  p.sprite(HERO, HERO_PAL, 36, 152);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 58, 160);
  p.sprite(PUP, PUP_PAL, 80, 178);
}

/** The view from the top of the tower: forest all the way down to the sea, over the stone rim. */
function lookout(p) {
  sky(p, 74, ['#4a80d8', '#7fb2ee', '#bcdcf8', '#e4f0fa']);
  // low clouds, gray underneath
  const low = (x, y, s) => { p.blob(x, y + 3, 16 * s, 5 * s, '#8a98a8', '#a8b4c0', '#c4ccd4'); cloud(p, x, y, s); };
  low(48, 22, 1.7); low(170, 12, 2.1); low(276, 30, 1.6); low(112, 44, 1.0);
  // the sea, the surf, and the flat green coast
  p.grad(0, 66, W, 8, ['#2a6fb0', '#4fb3c8']);
  for (let x = 0; x < W; x++) if ((x * 7) % 11 < 6) p.set(x, 73 + ((x * 3) % 2), '#eef8ff');
  p.rect(0, 75, W, 14, '#b8d48a'); p.dith(0, 78, W, 3, '#9ac474', '#b8d48a'); p.rect(0, 81, W, 8, '#8ac49a');
  // ridges rolling downhill, far to near
  const ridge = (y0, amp, len, ph, dark, base, light) => {
    for (let x = 0; x < W; x++) {
      const y = y0 + Math.round(Math.sin(x / len + ph) * amp + Math.sin(x / (len * 0.37) + ph * 2) * amp * 0.35);
      p.rect(x, y, 1, H - y, base); p.set(x, y, light);
      if ((x * 13 + y0) % 5 === 0) p.rect(x, y + 2 + ((x * 7) % 9), 2, 1, dark);
      if ((x * 11 + y0) % 7 === 0) p.rect(x, y + 3 + ((x * 5) % 12), 2, 1, light);
    }
  };
  ridge(82, 3, 50, 0.6, '#5a9a7a', '#6aaa86', '#8ac49a');
  ridge(94, 5, 40, 2.2, '#3a8256', '#4a9462', '#6ab07a');
  ridge(110, 7, 31, 4.1, '#2a6a3c', '#357a44', '#52985a');
  ridge(128, 8, 27, 1.3, '#1e5a2a', '#2a6a30', '#3f8a40');
  // treetops close by
  for (let i = 0; i < 26; i++) { const x = (i * 53) % W, y = 142 + ((i * 29) % 22); p.blob(x, y, 9 + (i % 3) * 2, 6 + (i % 2) * 2, '#184a22', '#256a2c', '#3f8a40'); }
  // a bird far below
  p.rect(214, 100, 3, 1, '#f4f1e8'); p.rect(218, 100, 3, 1, '#f4f1e8'); p.set(217, 101, '#f4f1e8');
  // the three of you at the rail
  p.sprite(HERO, HERO_PAL, 40, 142);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 64, 150);
  // the ranger's weather board on its post
  p.rect(262, 138, 3, 34, '#5a3a22'); p.rect(244, 120, 40, 26, '#2a3a30'); p.rect(244, 120, 40, 2, '#7a5232'); p.rect(244, 144, 40, 2, '#7a5232');
  p.blob(254, 130, 4, 3, '#b8a020', '#f2c531', '#fff2b0'); p.rect(264, 128, 14, 1, '#cfe6fa'); p.rect(264, 132, 10, 1, '#cfe6fa'); p.rect(250, 138, 28, 1, '#cfe6fa');
  // the tower's stone rim, with its square teeth
  const stone = '#9a9284', lit = '#c0b8a6', dark = '#6e675c';
  p.rect(0, 172, W, 28, stone); p.rect(0, 172, W, 2, lit);
  for (let x = -8; x < W; x += 44) { p.rect(x, 160, 28, 12, stone); p.rect(x, 160, 28, 2, lit); p.rect(x + 26, 162, 2, 10, dark); }
  for (let y = 180; y < H; y += 8) p.rect(0, y, W, 1, dark);
  for (let i = 0; i < 24; i++) p.rect((i * 31 + (i % 3) * 9) % W, 173 + ((i * 8) % 24), 1, 7, dark);
  p.sprite(PUP, PUP_PAL, 92, 152);     // up on the rim, of course
}

/** A clump of mangrove: arching roots standing in the water, leaves on top. */
function mangrove(p, x, y, w, cols = ['#3a2a1e', '#1e5a2a', '#2f7d33', '#4cae4f']) {
  const [root, dark, base, light] = cols;
  for (let i = 0; i < w; i += 7) {
    const h = 16 + ((i * 5) % 9);
    for (let k = 0; k <= h; k++) { const t = k / h; p.rect(Math.round(x + i + Math.sin(t * 3.14) * 5 * (i % 2 ? 1 : -1)), y - k, 2, 1, root); }
  }
  for (let i = -6; i < w + 6; i += 9) p.blob(x + i, y - 24 - ((i * 7) % 8), 11, 8, dark, base, light);
  for (let i = 0; i < w; i += 11) p.blob(x + i, y - 34 - ((i * 3) % 6), 9, 6, dark, base, light);
}

const BAY4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const GLOW_AT = [120, 110];   // where the hatchling floats in the dark water
const GLOW_LIFE = 34;         // frames a touch keeps glowing

/**
 * The bay.
 *   'day'    Maritza's kayak hut and the dock
 *   'dark'   under the mangroves, where it is as dark as dusk. The water
 *            glows where it has been touched (t.rubs: [[x, y, frame]]), and
 *            the hatchling shows only in the glow, or in the strips of its
 *            box that are already lit (t.at, t.count, t.lit)
 *   'found'  the hatchling all lit up
 */
function bay(p, what, t = {}) {
  if (what === 'day') {
    sky(p, 70);
    cloud(p, 60, 22, 1.0); cloud(p, 230, 14, 0.8);
    // the far shore: a low line of mangroves
    for (let x = -4; x < W; x += 9) p.blob(x, 66 - ((x * 7) % 5), 8, 6, '#1e5a2a', '#2f7d33', '#4cae4f');
    p.rect(0, 70, W, 3, '#1e4a26');
    p.grad(0, 73, W, 127, ['#3fa08a', '#2f8a84', '#256e78', '#1c5868']);
    for (let i = 0; i < 70; i++) { const x = (i * 59) % W, y = 78 + ((i * 37) % 116); p.rect(x, y, 5 + (i % 4), 1, i % 3 ? '#6ac4b0' : '#1c5868'); }
    mangrove(p, 250, 112, 70); mangrove(p, -6, 104, 44);
    // the hut, with paddles on the wall
    p.rect(20, 96, 66, 52, '#c98a4e'); p.rect(20, 96, 66, 3, '#e0a868'); for (let x = 20; x < 86; x += 8) p.rect(x, 99, 1, 49, '#a86a34');
    for (let i = 0; i < 12; i++) p.rect(12 + i * 2, 96 - i, 82 - i * 4, 1, i % 2 ? '#7a9a3a' : '#5a7a2a');
    p.rect(30, 110, 22, 16, '#2a1e1a'); p.rect(31, 111, 20, 14, '#3a5a6a');
    for (const x of [60, 68, 76]) { p.rect(x, 108, 2, 30, '#7a5232'); p.ellipse(x, 108, 3, 6, '#ec8a2c'); }
    // the dock
    p.rect(0, 148, 214, 10, '#9a6a42'); p.rect(0, 148, 214, 2, '#c08a5a'); for (let x = 6; x < 214; x += 14) p.rect(x, 150, 1, 8, '#6a4628');
    for (const x of [30, 100, 170, 208]) { p.rect(x, 152, 5, 44, '#6a4628'); p.rect(x, 152, 2, 44, '#8a5e3a'); }
    // the sign and the box of cards
    p.rect(150, 118, 3, 30, '#5a3a22'); p.rect(136, 104, 32, 20, '#f4f1e8'); p.rect(136, 104, 32, 2, '#2f6fd1'); for (let y = 109; y < 121; y += 3) p.rect(140, y, 24, 1, '#6a6a72');
    p.rect(176, 138, 16, 10, '#d23a32'); p.rect(176, 138, 16, 2, '#f4f1e8');
    // kayaks pulled up by the dock
    const kayak = (x, y, c, d) => { p.ellipse(x, y, 30, 5, d); p.ellipse(x, y - 1, 29, 4, c); p.ellipse(x, y - 1, 8, 2, '#1e1414'); };
    kayak(262, 168, '#ec8a2c', '#a85a1a'); kayak(246, 182, '#f2c531', '#b8922a');
    p.sprite(HERO, HERO_PAL, 60, 124);
    p.sprite(SIDEKICK, SIDEKICK_PAL, 84, 130);
    p.sprite(PUP, PUP_PAL, 108, 139);
    return;
  }

  const frame = t.frame || 0, glows = t.rubs || [];
  const found = what === 'found';
  p.rect(0, 0, W, H, '#03060d');
  p.grad(0, 56, W, 144, ['#040913', '#06101d', '#081626']);
  // the mangrove tunnel: leaves overhead and roots down both sides, all in shadow
  const shadow = ['#04090a', '#050d0c', '#081612', '#0c2018'];
  for (let x = -6; x < W + 8; x += 13) p.blob(x, 8 + ((x * 5) % 14), 15, 12, shadow[1], shadow[2], shadow[3]);
  for (let x = 0; x < W; x += 17) p.blob(x + 6, 30 + ((x * 3) % 10), 11, 8, shadow[1], shadow[2], shadow[3]);
  mangrove(p, -10, 96, 60, shadow); mangrove(p, 268, 104, 60, shadow);
  for (let i = 0; i < 9; i++) { const x = 70 + i * 23; for (let k = 0; k < 16 + ((i * 7) % 14); k++) p.set(x + Math.round(Math.sin(k / 4 + i) * 1.5), 36 + k, shadow[2]); }
  for (let i = 0; i < 26; i++) p.rect((i * 47) % W, 66 + ((i * 31) % 126), 4, 1, '#0b1c2c');

  // The glow. Each touch spreads a little and fades; the water keeps a soft
  // shimmer once the hatchling is found.
  const light = new Float32Array(W * H);
  const add = (gx, gy, r, power) => {
    for (let y = Math.max(50, gy - r); y <= Math.min(H - 1, gy + r); y++) for (let x = Math.max(0, gx - r); x <= Math.min(W - 1, gx + r); x++) {
      const d = Math.hypot(x - gx, (y - gy) * 1.6);
      if (d < r) light[y * W + x] = Math.max(light[y * W + x], power * (1 - d / r));
    }
  };
  for (const [gx, gy, f0] of glows) {
    const age = frame - f0;
    if (age >= 0 && age < GLOW_LIFE) add(gx, gy, 12 + Math.round(age * 0.6), 1 - age / GLOW_LIFE);
  }
  const [sx, sy] = GLOW_AT;
  if (found) for (let i = 0; i < 5; i++) add(sx + 40 + Math.round(Math.cos(i * 1.26 + frame / 5) * (34 + i * 6)), sy + 24 + Math.round(Math.sin(i * 1.26 + frame / 5) * 14), 26, 0.75);
  if (t.hint) for (let i = 0; i < 3; i++) add(sx + 14 + ((i * 29 + frame * 3) % 60), sy + 10 + ((i * 17 + frame) % 26), 5, 0.6);
  for (let y = 50; y < H; y++) for (let x = 0; x < W; x++) {
    const v = light[y * W + x];
    if (v <= 0.04) continue;
    const th = (BAY4[y & 3][x & 3] + 0.5) / 16;
    if (v > 0.72 && v - 0.72 > th * 0.28) p.set(x, y, '#d8fff4');
    else if (v > th * 0.9) p.set(x, y, v > 0.4 ? '#5fe8d0' : '#1f8a8a');
  }

  // The hatchling: painted off to one side, then copied in wherever it is lit.
  const q = new Pix();
  creature(q, t.who || { shape: 'wisp', body: '#3f7fc0', dark: '#28558c', belly: '#8fd8f0', trim: '#b8fff0', wing: '#5fb0e0' }, sx, sy, { scale: 4, outline: '#0a3a4a' });
  const at = t.at || [sx + 8, sy, 72, 40], strips = t.count || 4, lit = t.lit || [];
  for (let y = sy - 6; y < sy + 48; y++) for (let x = sx; x < sx + 96; x++) {
    const i = y * W + x, v = q.buf[i];
    if (!v) continue;
    const strip = Math.floor((x - at[0]) / (at[2] / strips));
    if (found || lit.includes(strip) || glows.some(([gx, gy]) => Math.hypot(x - gx, y - gy) < 13)) p.buf[i] = v;
  }
  if (found) for (let i = 0; i < 14; i++) p.set(sx + 4 + ((i * 37 + frame * 2) % 88), sy - 8 + ((i * 23 + frame) % 56), i % 2 ? '#d8fff4' : '#5fe8d0');

  // your kayak, nosing in from the corner
  p.ellipse(54, 190, 62, 9, '#7a4a14'); p.ellipse(54, 188, 60, 8, '#b86a1c');
  p.sprite(HERO, HERO_PAL, 30, 160);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 56, 166);
  p.sprite(PUP, PUP_PAL, 82, 176);
  p.ellipse(54, 194, 60, 5, '#b86a1c'); p.rect(0, 197, 116, 3, '#7a4a14');
}
const bayDark = (p, t) => bay(p, 'dark', t);
bayDark.fps = 8;
const bayFound = (p, t) => bay(p, 'found', t);
bayFound.fps = 6;

/** The museum van on the road. what: '' | 'jam' (cars ahead) | 'rain'. */
function road(p, what = '') {
  const rain = what === 'rain';
  sky(p, 96, rain ? ['#5a6470', '#7a8490', '#9aa4ae', '#b4bcc4'] : undefined);
  if (rain) { p.blob(80, 20, 60, 14, '#4a525e', '#6a7480', '#8a94a0'); p.blob(230, 26, 70, 16, '#4a525e', '#6a7480', '#8a94a0'); }
  else { cloud(p, 70, 24, 1.0); cloud(p, 240, 34, 0.8); }
  p.ellipse(70, 104, 130, 34, rain ? '#2a6a3c' : '#2f7d33'); p.ellipse(260, 108, 120, 30, rain ? '#357a44' : '#3f8a3a');
  for (let i = 0; i < 40; i++) p.rect((i * 53) % W, 84 + ((i * 17) % 26), 3, 1, '#4cae4f');
  // a palm on each side
  const palm = (x, y) => { for (let i = 0; i < 46; i++) p.rect(x + Math.round(Math.sin(i / 12) * 3), y - i, 4, 1, i % 6 < 3 ? '#7a5232' : '#5a3a22'); for (const [dx, dy] of [[-1.2, -0.4], [-0.8, 0.2], [0.9, -0.4], [0.6, 0.3], [-0.2, -0.9]]) for (let i = 0; i < 20; i++) p.rect(x + 2 + Math.round(dx * i), y - 46 + Math.round(dy * i + (i * i) / 50), 3, 2, i % 2 ? '#2f7d33' : '#4cae4f'); };
  palm(24, 122); palm(292, 124);
  // the road
  p.rect(0, 122, W, 62, '#4a4a52'); p.rect(0, 122, W, 2, '#74747c'); p.rect(0, 182, W, 2, '#74747c');
  for (let x = 6; x < W; x += 30) p.rect(x, 152, 15, 3, '#f2e8a0');
  p.grad(0, 184, W, 16, ['#4f9a3a', '#2f7a2a']);
  const car = (x, y, c) => { p.rect(x, y + 6, 34, 10, c); p.rect(x + 6, y, 20, 8, c); p.rect(x + 8, y + 2, 7, 5, '#bfe0fa'); p.rect(x + 17, y + 2, 7, 5, '#bfe0fa'); p.ellipse(x + 8, y + 17, 4, 4, '#1e1414'); p.ellipse(x + 26, y + 17, 4, 4, '#1e1414'); p.rect(x, y + 9, 2, 3, '#d23a32'); };
  if (what === 'jam') { car(190, 124, '#d23a32'); car(232, 124, '#2f6fd1'); car(274, 124, '#f2c531'); car(226, 158, '#c8c8c8'); car(270, 158, '#3f9e4a'); car(4, 124, '#ec8a2c'); }
  // the museum van: purple, with an egg painted on the side
  const x = 96, y = 126;
  p.rect(x, y, 74, 34, '#7b4aa8'); p.rect(x, y, 74, 3, '#9a6ac8'); p.rect(x, y + 28, 74, 6, '#5b3282');
  p.rect(x + 56, y + 6, 14, 12, '#bfe0fa'); p.rect(x + 34, y + 6, 18, 12, '#bfe0fa'); p.rect(x + 12, y + 6, 18, 12, '#bfe0fa');
  p.blob(x + 21, y + 24, 4, 5, '#b8a020', '#f2e8a0', '#fffbe0');
  p.ellipse(x + 16, y + 35, 7, 7, '#1e1414'); p.ellipse(x + 16, y + 35, 3, 3, '#8a8a96'); p.ellipse(x + 58, y + 35, 7, 7, '#1e1414'); p.ellipse(x + 58, y + 35, 3, 3, '#8a8a96');
  p.rect(x + 72, y + 20, 3, 4, '#fff2b0');
  // faces at the windows
  p.rect(x + 38, y + 9, 5, 6, '#f6d3b8'); p.rect(x + 38, y + 8, 5, 2, '#6b3d1e'); p.rect(x + 18, y + 10, 5, 6, '#f6d3b8'); p.rect(x + 18, y + 9, 5, 2, '#6b3d1e');
  p.rect(x + 60, y + 9, 6, 7, '#c98d63'); p.rect(x + 60, y + 7, 6, 3, '#ece8e4');
  if (rain) for (let i = 0; i < 150; i++) { const rx = (i * 61) % W, ry = (i * 43) % H; p.rect(rx, ry, 1, 4, '#cfe6fa'); }
}

// ---------------------------------------------------------------------------
// The places redrawn in Phase 6, from the trip photos: Old San Juan, the
// sentry box, the tunnel, Yokahú Tower, La Coca Falls, Juan Diego Falls, and
// the beach. Each shows the whole landmark.

/** A tiny seeded random, so a scene paints the same every time. */
function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

/** The flag of Puerto Rico, hanging from a pole at (x, y), w wide. */
function prFlag(p, x, y, w = 15) {
  const h = Math.round(w * 2 / 3);
  for (let i = 0; i < 5; i++) p.rect(x, y + Math.round((i * h) / 5), w, Math.round(((i + 1) * h) / 5) - Math.round((i * h) / 5), i % 2 ? '#ffffff' : '#d23a32');
  for (let r = 0; r < h; r++) { const hw = Math.round((Math.min(r, h - 1 - r) + 0.5) * 1.15); p.rect(x, y + r, hw, 1, '#2f5fc4'); }
  p.set(x + 2, y + Math.floor(h / 2), '#ffffff');
  p.rect(x - 1, y - 2, 1, h + 6, '#3a2a20');
}

// Old San Juan: one street of painted houses, seen from the middle of it,
// running down to the sea. Each house is [wall, trim, shutters, height,
// depth where it ends, windows]. Heights are above the street, in the same
// units as the street's half-width.
const OSJ_LEFT = [
  ['#9cc8e8', '#f4f1e8', '#3c7f8a', 2.25, 1.55, 3],
  ['#5fb848', '#f4f1e8', '#2a5a2a', 2.0, 2.2, 3],
  ['#f2c531', '#ffffff', '#2f6fd1', 2.3, 3.0, 2],
  ['#f08cb4', '#ffffff', '#3c7f8a', 1.95, 4.1, 3],
  ['#4fb3c8', '#f4f1e8', '#7a4a2a', 2.15, 6.2, 3],
];
const OSJ_RIGHT = [
  ['#f4a868', '#ffffff', '#2a5a2a', 2.1, 1.7, 3],
  ['#f4f1e8', '#cfcabb', '#2f6fd1', 2.35, 2.5, 3],
  ['#d23a32', '#f4f1e8', '#3c3a2a', 1.9, 3.4, 2],
  ['#9cc8e8', '#ffffff', '#f2c531', 2.2, 4.6, 3],
  ['#f2c531', '#ffffff', '#3f9e4a', 2.0, 6.2, 3],
];

/** Old San Juan: blue cobblestones, houses painted every color, and the sea at the end of the street. */
function oldSanJuan(p) {
  const vx = 160, vy = 90, f = 100, side = 1.62, eye = 0.8, end = 6.2;
  sky(p, vy + 4, ['#3b6fd1', '#5d93e6', '#8fc0f2', '#cfe6fa']);
  cloud(p, 160, 30, 0.9); cloud(p, 40, 12, 0.7); cloud(p, 290, 18, 0.7);
  // the bay at the end of the street, with the far shore and a sailboat
  p.rect(vx - 30, vy - 4, 60, 3, '#6a9a6a');
  p.grad(vx - 30, vy - 1, 60, 12, ['#2a6fb0', '#3b82c4']);
  p.rect(vx + 6, vy + 2, 5, 1, '#f4f1e8'); p.rect(vx + 8, vy - 3, 1, 5, '#f4f1e8'); p.rect(vx + 9, vy - 2, 2, 3, '#f4f1e8');
  // the low sea wall where the street ends
  const wy = Math.round(vy + (eye * f) / end);
  p.rect(vx - 27, wy - 5, 54, 5, '#c8bca8'); p.rect(vx - 27, wy - 5, 54, 1, '#e4dccb');

  // The street: blue cobbles, a curb, and a strip of pale sidewalk by each wall.
  const rnd = seeded(5);
  const tone = ['#4e6c96', '#5b7aa6', '#6a8bb8', '#45628a'], hash = [];
  for (let i = 0; i < 997; i++) hash.push(Math.floor(rnd() * 4));
  for (let y = wy; y < H; y++) {
    const z = (eye * f) / (y - vy);
    for (let x = 0; x < W; x++) {
      const X = ((x - vx) * z) / f;
      if (Math.abs(X) > side + 0.1) continue;
      if (Math.abs(X) > side - 0.32) { p.set(x, y, Math.abs(X) < side - 0.29 ? '#8a8478' : ((x + y) & 1) && z > 3 ? '#b8b0a0' : '#ccc4b4'); continue; }
      if (z > 3.6) { p.set(x, y, ((x + y) & 1) ? '#5b7aa6' : '#4e6c96'); continue; }
      const row = Math.floor(z / 0.085), col = Math.floor((X + 4 + (row % 2) * 0.08) / 0.16);
      const fz = z / 0.085 - row, fx = (X + 4 + (row % 2) * 0.08) / 0.16 - col;
      p.set(x, y, fz < 0.16 || fx < 0.1 ? '#2c3e5c' : fz > 0.8 ? '#8fadd2' : tone[hash[(row * 31 + col * 7) % 997]]);
    }
  }

  // The houses. Every column of the screen is one slice of a wall.
  for (let x = 0; x < W; x++) {
    const dx = x - vx;
    if (Math.abs(dx) < 1) continue;
    const z = (side * f) / Math.abs(dx);
    if (z >= end) continue;
    const row = dx < 0 ? OSJ_LEFT : OSJ_RIGHT;
    let z0 = 1, h = row[0];
    for (const hh of row) { h = hh; if (z < hh[4]) break; z0 = hh[4]; }
    const [wall, trim, shut, tall, z1, n] = h;
    const u = (z - z0) / (z1 - z0), slot = u * n, k = slot - Math.floor(slot), mid = Math.floor(slot) === Math.floor(n / 2);
    const top = Math.round(vy - ((tall - eye) * f) / z), bot = Math.round(vy + (eye * f) / z);
    for (let y = Math.max(0, top); y < Math.min(H, bot); y++) {
      const v = ((vy - y) * z) / f + eye;      // height above the street
      let c = wall;
      if (v > tall - 0.1) c = v > tall - 0.04 ? trim : shade(trim, 0.8);                  // cornice
      else if (u < 0.05 || u > 0.95) c = u < 0.02 || u > 0.98 ? shade(wall, 0.8) : trim; // pilasters
      else if (v < 0.07) c = shade(wall, 0.72);                                           // base
      else if (v > 0.98 && v < 1.04) c = trim;                                            // floor band
      else if (v >= 1.2 && v < 1.82 && k > 0.24 && k < 0.76) {                            // upstairs: shuttered doors to a balcony
        c = k < 0.28 || k > 0.72 || v > 1.77 ? trim : k < 0.38 || k > 0.62 ? shut : '#2d3b4d';
        if (c === shut && ((y & 3) === 0)) c = shade(shut, 0.75);
      } else if (v >= 1.12 && v < 1.36 && k > 0.16 && k < 0.84) {                         // the iron balcony
        c = v < 1.15 || v > 1.33 || (x & 1) ? '#2a2220' : null;
      } else if (v >= 0.07 && v < (mid ? 0.82 - (k - 0.5) ** 2 * 0.6 : 0.78) && k > (mid ? 0.3 : 0.26) && k < (mid ? 0.7 : 0.74)) {
        if (mid) c = k < 0.34 || k > 0.66 ? trim : '#7a4a2a';                             // the front door
        else c = v < 0.3 ? shade(wall, 0.85) : k < 0.3 || k > 0.7 ? trim : (x & 1) || ((y & 3) === 0) ? '#2a2220' : '#2d3b4d'; // window and grille
      }
      if (c) p.set(x, y, c);
    }
  }

  // a wall lantern on each side, and a flag over a balcony
  const lamp = (X, z) => {
    const x = Math.round(vx + (X * f) / z), y = Math.round(vy - ((1.45 - eye) * f) / z), s = Math.max(1, Math.round(3 / z));
    p.rect(x - s * (X < 0 ? 0 : 3), y, s * 3, s, '#2a2a30');
    const lx = x + (X < 0 ? s * 3 : -s * 5);
    p.rect(lx, y + s, s * 3, s * 4, '#2a2a30'); p.rect(lx + Math.ceil(s / 2), y + s * 2, s * 2, s * 2, '#ffe9a0'); p.rect(lx - 1, y, s * 3 + 2, s, '#2a2a30');
  };
  lamp(-side, 1.3); lamp(side, 2.1); lamp(-side, 3.2); lamp(side, 4.2);
  prFlag(p, 268, 54, 16);

  // Don Tito's cart halfway down, and the three of you
  piraguaCart(p, 184, 98, 1);
  p.sprite(TITO, TITO_PAL, 172, 104);
  p.sprite(HERO, HERO_PAL, 112, 154);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 128, 160);
  p.sprite(PUP, PUP_PAL, 146, 166);
}


const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
/** Pick from tones (dark to light) by a light level 0..1, dithered between steps. */
function toneAt(tones, light, x, y) {
  const t = Math.max(0, Math.min(0.999, light)) * (tones.length - 1);
  const i = Math.floor(t);
  return t - i > (BAYER4[y & 3][x & 3] + 0.5) / 16 ? tones[Math.min(i + 1, tones.length - 1)] : tones[i];
}

/** A lit round surface: an upright cylinder from y0 to y1, sun on the left. */
function cylinder(p, cx, y0, y1, r, tones, { lit = 0.15 } = {}) {
  for (let x = Math.ceil(cx - r); x <= cx + r; x++) {
    const nx = (x - cx) / r, nz = Math.sqrt(Math.max(0, 1 - nx * nx));
    const light = 0.15 + 0.85 * Math.max(0, -nx * 0.55 + nz * 0.8 + lit);
    for (let y = y0; y < y1; y++) p.set(x, y, toneAt(tones, light, x, y));
  }
}

/** A lit dome: the top half of an ellipse with radii rx, ry, sitting on (cx, base). */
function dome(p, cx, base, rx, ry, tones) {
  for (let y = base - ry; y <= base; y++) for (let x = cx - rx; x <= cx + rx; x++) {
    const nx = (x - cx) / rx, ny = (y - base) / ry;
    const d = nx * nx + ny * ny;
    if (d > 1) continue;
    const nz = Math.sqrt(1 - d);
    p.set(x, y, toneAt(tones, 0.1 + 0.9 * Math.max(0, -nx * 0.5 - ny * 0.45 + nz * 0.7), x, y));
  }
}

const STONE = ['#4e4638', '#6e6452', '#8c8068', '#aa9e84', '#c8bca0', '#e0d6bc'];

/** The sentry box (la garita) on the corner of El Morro's wall, over the sea. */
function garita(p) {
  sky(p, 98, ['#2f63c4', '#4f86de', '#86b8f0', '#c9e4fa']);
  cloud(p, 40, 70, 1.3); cloud(p, 126, 78, 1.0); cloud(p, 300, 62, 1.1); cloud(p, 200, 22, 0.7);
  // the sea, darker toward the horizon, with whitecaps
  p.grad(0, 96, W, 50, ['#1d4f86', '#245e9a', '#2a6fb0', '#3b82c4']);
  const rnd = seeded(11);
  for (let i = 0; i < 90; i++) { const y = 98 + Math.floor(rnd() * 44), x = Math.floor(rnd() * W); p.rect(x, y, 2 + Math.floor((y - 96) / 10), 1, rnd() < 0.3 ? '#eef8ff' : '#5d9bd6'); }
  // more of El Morro along the shore: a lower wall and a small white garita
  p.rect(0, 104, 104, 10, '#c8bca0'); p.rect(0, 104, 104, 1, '#e8e0cc');
  for (let x = 0; x < 104; x += 7) p.rect(x, 101, 4, 3, '#c8bca0');
  p.rect(84, 92, 8, 12, '#ece4d2'); p.ellipse(88, 92, 4, 3, '#d8ccb4'); p.rect(87, 87, 2, 3, '#d8ccb4'); p.rect(87, 96, 2, 4, '#4a4030');
  for (let x = 0; x < 104; x += 3) p.set(x, 115 + (x % 2), '#eef8ff');

  // The parapet you stand behind, running across, and the walkway in front.
  p.rect(0, 128, W, 22, '#a89a7c'); p.rect(0, 128, W, 3, '#d2c6a8'); p.rect(0, 146, W, 4, '#7e7056');
  for (let y = 135; y < 146; y += 6) for (let x = (y % 12) * 2; x < W; x += 24) p.rect(x, y, 1, 6, '#8c7e62');
  p.grad(0, 150, W, 50, ['#b8a888', '#c8b898', '#d4c4a2']);
  for (let y = 154, r = 0; y < H; y += 8 + r * 2, r++) {
    p.rect(0, y, W, 1, '#a89878');
    for (let x = (r % 2) * 20; x < W; x += 40 + r * 4) p.rect(x, y, 1, 8 + r * 2, '#a89878');
  }

  // The garita, standing out from the corner on its stone bracket.
  const cx = 236;
  for (let y = 112; y < 150; y++) {                       // the bracket narrows like a bell
    const t = (y - 112) / 38, r = Math.round(30 - t * t * 16);
    for (let x = cx - r; x <= cx + r; x++) {
      const nx = (x - cx) / r;
      p.set(x, y, toneAt(STONE, 0.2 + 0.7 * Math.max(0, -nx * 0.5 + Math.sqrt(1 - nx * nx) * 0.7) - t * 0.25, x, y));
    }
  }
  for (const yy of [118, 128, 140]) { const r = Math.round(30 - ((yy - 112) / 38) ** 2 * 16); p.rect(cx - r, yy, r * 2 + 1, 1, '#5e5446'); }
  cylinder(p, cx, 54, 112, 25, ['#3e382e', '#564e40', '#6e6452', '#8a7e68', '#a69a80', '#bfb398'], { lit: -0.3 });
  for (let y = 62; y < 112; y += 9) for (let x = cx - 24; x <= cx + 24; x += 1) if ((x + y) % 23 < 1 || ((x * 7 + y) % 41) < 1) p.set(x, y, '#5e5446');
  for (let i = 0; i < 40; i++) p.set(cx - 22 + Math.floor(rnd() * 44), 58 + Math.floor(rnd() * 52), '#6e6452');
  p.rect(cx - 30, 108, 61, 5, '#9a8e74'); p.rect(cx - 30, 108, 61, 1, '#d2c6ac');      // the ledge it stands on
  // the cornice: two bands wider than the walls
  p.rect(cx - 30, 47, 61, 4, '#d2c6ac'); p.rect(cx - 30, 51, 61, 2, '#8c8068'); p.rect(cx - 28, 53, 57, 2, '#6e6452');
  p.rect(cx - 27, 44, 55, 3, '#aa9e84');
  // the dome, its ribs, and the knob on top
  dome(p, cx, 44, 26, 24, STONE);
  for (const k of [-0.62, -0.25, 0.12, 0.5]) for (let y = 21; y <= 44; y++) { const ny = (y - 44) / 24, w = Math.sqrt(Math.max(0, 1 - ny * ny)); p.set(Math.round(cx + k * 26 * w), y, '#7e7462'); }
  p.rect(cx - 3, 16, 7, 6, '#aa9e84'); p.rect(cx - 2, 15, 5, 1, '#c8bca0');
  p.blob(cx, 11, 5, 5, '#6e6452', '#aa9e84', '#e0d6bc');
  // the doorway and a lookout slit
  p.rect(cx - 8, 78, 17, 34, '#2a221c'); p.ellipse(cx, 78, 8, 6, '#2a221c'); p.rect(cx - 9, 76, 1, 36, '#c8bca0');
  p.rect(cx + 2, 84, 3, 12, '#bfe0fa'); p.rect(cx - 18, 70, 2, 10, '#2a221c');

  // the cannonballs that tumbled off their stack, and the sign
  const ball = (x, y) => p.blob(x, y, 5, 5, '#141418', '#2e2e36', '#6a6a78');
  for (const [x, y] of [[40, 146], [51, 146], [62, 146], [46, 137], [57, 137], [51, 128], [86, 168], [104, 182], [76, 160]]) ball(x, y);
  p.rect(178, 152, 3, 30, '#5a3a22'); p.rect(162, 136, 36, 22, '#7a5232'); p.rect(164, 138, 32, 18, '#e8dcc0');
  for (let y = 142; y < 154; y += 3) p.rect(167, y, 26, 1, '#6a5a4a');
  p.rect(186, 146, 5, 1, '#3a2a20'); p.rect(187, 148, 4, 1, '#3a2a20');   // tiny claw scratches

  p.sprite(HERO, HERO_PAL, 112, 156);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 130, 162);
  p.sprite(PUP, PUP_PAL, 146, 176);
}


const WALL_SC = ['#8a6a42', '#a8844e', '#c29c62', '#d6b47a', '#e6c896'];

/**
 * Castillo San Cristóbal: its high wall, a garita on the corner, and the
 * mouth of the lantern tunnel, which runs down and away to daylight.
 */
function tunnel(p) {
  sky(p, 60, ['#3b6fd1', '#5d93e6', '#8fc0f2', '#cfe6fa']);
  cloud(p, 70, 18, 0.9); cloud(p, 250, 30, 0.7);
  const rnd = seeded(23);
  // the wall, leaning back a little, in sandy blocks
  for (let y = 34; y < 156; y++) {
    const x0 = Math.round((y - 34) * -0.02);
    p.rect(x0, y, W - x0, 1, WALL_SC[2]);
  }
  for (let y = 36, r = 0; y < 154; y += 9, r++) for (let x = (r % 2) * 13 - 13; x < W; x += 26) {
    p.rect(x + 1, y + 1, 24, 7, WALL_SC[1 + Math.floor(rnd() * 3)]);
    p.rect(x + 1, y + 1, 24, 1, WALL_SC[4]);
  }
  p.rect(0, 26, W, 9, WALL_SC[3]); p.rect(0, 26, W, 2, WALL_SC[4]); p.rect(0, 34, W, 2, WALL_SC[0]);   // the parapet on top
  // a garita on the corner, and the flag
  cylinder(p, 290, 14, 30, 9, WALL_SC, { lit: -0.2 });
  p.rect(279, 11, 23, 3, WALL_SC[4]); dome(p, 290, 11, 10, 8, WALL_SC); p.blob(290, 2, 2, 2, WALL_SC[0], WALL_SC[2], WALL_SC[4]);
  p.rect(288, 18, 4, 9, '#3a2a1e');
  prFlag(p, 44, 6, 15);

  // The tunnel, in one-point perspective: every pixel inside the arch is on
  // the floor, a wall, or the round ceiling, at some depth.
  const vx = 152, vy = 112, hw = 46, low = 46, up = 6;
  const lamps = [1.7, 3.0, 4.6, 6.6];
  for (let y = 60; y < 162; y++) for (let x = vx - hw - 1; x <= vx + hw + 1; x++) {
    const dx = x - vx, dy = y - vy;
    // is it inside the mouth at all (scale 1)?
    if (dy > low || Math.abs(dx) > hw || (dy < -up && dx * dx + (dy + up) ** 2 > hw * hw)) continue;
    let s = Math.max(dy / low, Math.abs(dx) / hw), part = dy / low >= Math.abs(dx) / hw ? 'floor' : 'wall';
    if (dy < -up * s) {
      const a = hw * hw - up * up, sc = (-up * dy + Math.sqrt(up * up * dy * dy + a * (dx * dx + dy * dy))) / a;
      if (sc > s) { s = sc; part = 'ceil'; }
    }
    const z = 1 / Math.max(s, 0.001);
    if (z > 9) { p.set(x, y, z > 11 ? '#fffbe8' : toneAt(['#ffd890', '#fff2c0', '#fffbe8'], (z - 9) / 2, x, y)); continue; }
    // light: daylight from the far end, plus each lantern's warm pool
    let light = Math.max(0, (z - 5) / 4) * 0.6;
    for (const lz of lamps) light += 0.75 * Math.exp(-((z - lz) ** 2) * 3) * (part === 'ceil' ? 1.2 : part === 'wall' ? 0.8 : 0.6);
    light = Math.min(1, light + 0.08);
    const course = (z * 3) % 1 < 0.12;       // the rings of stone
    if (part === 'floor') {
      const X = (dx * z) / 100;
      const cob = (z * 6) % 1 < 0.2 || ((X * 8 + Math.floor(z * 6) * 0.5) % 1) < 0.15;
      p.set(x, y, cob && z < 5 ? '#24160e' : toneAt(['#2e1c12', '#4a2e1c', '#6e4428', '#a0683a', '#e0b070'], light * 0.9, x, y));
    } else {
      p.set(x, y, course && z < 6 ? toneAt(['#2a160c', '#4a2a16', '#7a4422'], light, x, y) : toneAt(['#3a2010', '#5e3418', '#8a4a22', '#c06a2c', '#ec9a48', '#ffd890'], light, x, y));
    }
  }
  // the lanterns, hanging from the top of the ceiling
  for (const lz of lamps.slice().reverse()) {
    const s = 1 / lz, x = vx, top = Math.round(vy - (up + hw) * s), k = Math.max(1, Math.round(4 * s));
    p.rect(x, top, 1, Math.round(10 * s) + 1, '#24140e');
    const ly = top + Math.round(10 * s);
    p.rect(x - k, ly, k * 2 + 1, k * 3, '#24140e'); p.rect(x - k + 1, ly + 1, Math.max(1, k * 2 - 1), Math.max(1, k * 3 - 2), '#ffd860');
  }
  // the stones around the mouth, and the open gate folded back
  for (let a = 0; a <= 16; a++) {
    const t = Math.PI * (a / 16), r = hw + 6;
    const x = Math.round(vx - Math.cos(t) * r), y = Math.round(vy - up - Math.sin(t) * r);
    p.blob(x, y, 5, 5, WALL_SC[1], WALL_SC[3], WALL_SC[4]);
  }
  for (const side of [-1, 1]) for (let y = vy - up; y < 162; y += 9) p.rect(vx + side * (hw + 6) - 4, y, 9, 8, (y >> 3) & 1 ? WALL_SC[3] : WALL_SC[4]);
  for (let x = 74; x < 98; x += 4) p.rect(x, 104, 2, 56, '#2a2a30');
  p.rect(72, 104, 28, 2, '#2a2a30'); p.rect(72, 130, 28, 2, '#2a2a30'); p.rect(72, 156, 28, 2, '#2a2a30');
  for (let x = 74; x < 98; x += 4) p.rect(x, 100, 2, 4, '#2a2a30'), p.set(x, 99, '#2a2a30');

  // the sign and the kids' puzzle board on the wall
  p.rect(222, 92, 34, 26, '#5a3a22'); p.rect(224, 94, 30, 22, '#e8dcc0');
  for (let y = 98; y < 112; y += 3) p.rect(227, y, 24, 1, '#6a5a4a');
  p.rect(262, 96, 26, 22, '#2f6fd1'); p.rect(264, 98, 22, 18, '#f4f1e8');
  for (let i = 0; i < 9; i++) p.rect(266 + (i % 3) * 7, 100 + Math.floor(i / 3) * 5, 5, 4, ['#d23a32', '#f2c531', '#3f9e4a'][i % 3]);

  // the plaza in front, in old brick
  p.grad(0, 156, W, 44, ['#a8744a', '#b8845a', '#c8946a']);
  for (let y = 160, r = 0; y < H; y += 6 + r, r++) { p.rect(0, y, W, 1, '#8a5a36'); for (let x = (r % 2) * 9; x < W; x += 18 + r * 2) p.rect(x, y, 1, 6 + r, '#8a5a36'); }
  p.rect(0, 156, W, 2, WALL_SC[0]);
  p.sprite(HERO, HERO_PAL, 120, 160);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 138, 166);
  p.sprite(PUP, PUP_PAL, 160, 176);
}


/** A palm frond: a curved stem from (x, y) with leaflets down both sides. */
function frond(p, x, y, ang, len, droop, cols = ['#1e5a2a', '#2f7d33', '#4cae4f']) {
  let px = x, py = y, a = ang;
  for (let i = 0; i < len; i++) {
    a += droop;
    px += Math.cos(a); py += Math.sin(a);
    p.set(Math.round(px), Math.round(py), cols[0]);
    if (i % 2 === 0 && i > 2) {
      const l = Math.round(Math.min(i, len - i) * 0.45) + 2;
      for (const side of [-1, 1]) {
        const b = a + side * 1.1 + 0.5;
        for (let k = 1; k <= l; k++) p.set(Math.round(px + Math.cos(b) * k), Math.round(py + Math.sin(b) * k), k > l - 2 ? cols[2] : cols[1]);
      }
    }
  }
}

/** A tree fern: a thin trunk and a spray of fronds. */
function treeFern(p, x, y, h) {
  for (let i = 0; i < h; i++) p.rect(x + Math.round(Math.sin(i / 9) * 2), y - i, 3, 1, i % 4 < 2 ? '#4a3a26' : '#3a2c1c');
  for (let k = 0; k < 9; k++) frond(p, x + 1, y - h, -Math.PI + (k / 8) * Math.PI, 20 + (k % 3) * 4, 0.03 * (k < 4 ? -1 : 1) + 0.02);
}

/** A bank of rainforest leaves: blobs in three greens. */
function canopy(p, x0, x1, y, rnd, size = 10, cols = ['#184a22', '#256a2c', '#3f8a40']) {
  const n = Math.round(((x1 - x0) / size) * 2.2);
  for (let i = 0; i < n; i++) {
    const r = Math.round(size * (0.6 + rnd() * 0.6));
    p.blob(Math.round(x0 + rnd() * (x1 - x0)), Math.round(y + (rnd() - 0.3) * size * 1.4), r, Math.round(r * (0.6 + rnd() * 0.3)), cols[0], cols[1], cols[2]);
  }
}

const YOKAHU = ['#7a5244', '#94665a', '#ae7e6e', '#c49484', '#d6aa98'];

/** Yokahú Tower poking up out of the rainforest, with El Yunque's peaks behind. */
function yokahu(p) {
  sky(p, 120, ['#7fa8d8', '#a8c8e8', '#d0e2f0', '#e8f0f4']);
  // El Yunque's peaks in the mist, then the near hills
  for (let x = 0; x < W; x++) {
    const y = 70 + Math.round(Math.sin(x / 34) * 8 + Math.sin(x / 13 + 1) * 3 - Math.max(0, 24 - Math.abs(x - 60) * 0.5) - Math.max(0, 16 - Math.abs(x - 250) * 0.4));
    p.rect(x, y, 1, H - y, '#8aa89a'); p.set(x, y, '#a8c0b0');
  }
  for (let i = 0; i < 6; i++) p.blob(20 + i * 56, 74 + (i % 2) * 6, 26, 5, '#c4d4d8', '#d8e4e8', '#eef4f6');
  const rnd = seeded(31);
  p.rect(0, 104, W, 80, '#3a7050');
  canopy(p, -8, W + 8, 98, rnd, 14, ['#3a7050', '#4a8460', '#64a072']);

  // the tower: an octagon, three faces showing, the left one in the sun
  const x0 = 122, x1 = 198, top = 44, bot = 176;
  const face = (a, b, light) => { for (let x = a; x < b; x++) for (let y = top; y < bot; y++) p.set(x, y, toneAt(YOKAHU, light + ((x * 7 + y * 3) % 11 === 0 ? -0.15 : 0), x, y)); };
  face(x0 - 16, x0, 0.85); face(x0, x1, 0.55); face(x1, x1 + 14, 0.2);
  for (let y = top + 6; y < bot; y += 10) { p.rect(x0 - 16, y, 16, 1, YOKAHU[2]); p.rect(x0, y, x1 - x0, 1, YOKAHU[1]); p.rect(x1, y, 14, 1, YOKAHU[0]); }
  p.rect(x0, top, 1, bot - top, YOKAHU[4]); p.rect(x1, top, 1, bot - top, YOKAHU[0]);
  // arched windows, climbing round and round with the stairs inside
  const win = (x, y, w, h, frame) => {
    const r = Math.floor(w / 2), cx = x + r;
    p.rect(x - 1, y, w + 2, h, frame); p.ellipse(cx, y, r + 1, r + 1, frame);
    p.rect(x, y, w, h - 1, '#2a2a22'); p.ellipse(cx, y, r, r, '#2a2a22');
    p.rect(x + 1, y, w - 2, h - 2, '#3f6a3a'); p.ellipse(cx, y, r - 1, r - 1, '#3f6a3a');
  };
  for (const [x, y] of [[138, 62], [170, 74], [138, 98], [170, 110], [138, 134], [170, 146]]) win(x, y, 10, 14, '#d6aa98');
  for (const y of [80, 116, 152]) win(x0 - 11, y, 6, 12, '#e8c4b4');
  for (const y of [68, 104, 140]) win(x1 + 4, y, 5, 12, '#94665a');
  // the lookout on top: wider, with arches all round and square teeth
  p.rect(x0 - 24, top - 22, x1 - x0 + 54, 22, YOKAHU[3]);
  p.rect(x0 - 24, top - 22, 22, 22, YOKAHU[4]); p.rect(x1 + 6, top - 22, 24, 22, YOKAHU[1]);
  for (let x = x0 - 20; x < x1 + 26; x += 12) { p.rect(x, top - 17, 7, 12, '#e8f0f4'); p.ellipse(x + 3, top - 17, 3, 2, '#e8f0f4'); }
  p.rect(x0 - 26, top - 2, x1 - x0 + 58, 4, YOKAHU[0]); p.rect(x0 - 26, top - 2, x1 - x0 + 58, 1, YOKAHU[4]);
  for (let x = x0 - 24; x < x1 + 30; x += 10) p.rect(x, top - 28, 6, 6, x < x0 ? YOKAHU[4] : x > x1 ? YOKAHU[1] : YOKAHU[3]);
  p.rect(x0 - 24, top - 23, x1 - x0 + 54, 1, YOKAHU[4]);
  // vines hanging down the sunny face
  for (const vx of [x0 - 10, x0 + 6, x1 + 8]) for (let i = 0; i < 70 + (vx % 30); i++) p.set(vx + Math.round(Math.sin(i / 7 + vx) * 2), top + i, i % 5 ? '#2f7d33' : '#4cae4f');
  // the door and its steps
  p.rect(150, 146, 20, 30, '#2a221c'); p.ellipse(160, 146, 10, 6, '#2a221c'); p.rect(149, 140, 1, 36, YOKAHU[4]);
  for (let i = 0; i < 3; i++) p.rect(144 - i * 4, 176 + i * 3, 32 + i * 8, 3, i % 2 ? '#a8a49c' : '#bcb8b0');

  // the forest closing in, and the path
  p.rect(0, 160, 106, 24, '#184a22'); p.rect(214, 158, W - 214, 26, '#184a22');
  canopy(p, -10, 100, 150, rnd, 16); canopy(p, 222, W + 10, 146, rnd, 16);
  p.grad(0, 184, W, 16, ['#5a7a3a', '#4a6a2e']);
  for (let y = 184; y < H; y++) { const hw = 20 + (y - 184) * 3; p.rect(160 - hw, y, hw * 2, 1, (y & 1) ? '#b0a080' : '#a49474'); }
  treeFern(p, 262, 186, 58);
  for (let k = 0; k < 7; k++) frond(p, -4, 120, -1.2 + k * 0.32, 52, 0.022);
  for (let k = 0; k < 5; k++) frond(p, 26, 196, -2.0 + k * 0.35, 30, -0.015);
  p.sprite(LUZ, LUZ_PAL, 196, 166);
  p.sprite(HERO, HERO_PAL, 112, 170);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 96, 176);
  p.sprite(PUP, PUP_PAL, 126, 186);
}


const ROCK = ['#22241f', '#33362f', '#474a40', '#5e6052', '#787a6a', '#929484'];
const MOSS = ['#2a4a1a', '#3f6a24', '#5a8a2e', '#7aaa3a'];

/** A sheet of falling water w wide, from y0 to y1; it shimmers as frame counts up. */
function falling(p, x, y0, y1, w, frame, { spread = 0 } = {}) {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0), ww = Math.round(w + spread * t);
    const sx = Math.round(x - (ww - w) / 2 + Math.sin(y / 9 + x) * 0.8);
    for (let i = 0; i < ww; i++) {
      const k = (y * 3 - frame * 4 + (sx + i) * 5) % 13;
      p.set(sx + i, y, k < 3 ? '#ffffff' : k < 8 ? '#d8eef4' : (i === 0 || i === ww - 1) ? '#7aa4b4' : '#a8cce0');
    }
  }
}

/** White water where a fall lands. */
function splash(p, x, y, w, frame) {
  for (let i = 0; i < w * 2; i++) {
    const a = (i * 2.4 + frame * 0.7) % (Math.PI * 2), r = (i * 7 + frame) % 6;
    p.blob(Math.round(x + Math.cos(a) * w * 0.5 + (i % 5) - 2), Math.round(y - Math.abs(Math.sin(a)) * r), 3, 2, '#a8cce0', '#e4f4f8', '#ffffff');
  }
}

/** A craggy face of rock in layers, from y0 to y1 between the edges left(y) and right(y). */
function rockFace(p, y0, y1, left, right, seed = 1) {
  for (let y = y0; y < y1; y++) for (let x = left(y); x < right(y); x++) {
    const wob = Math.sin(x / 17 + seed) * 5 + Math.sin(x / 6.3 + seed * 2) * 2;
    const band = Math.floor((y + wob) / 11), f = (y + wob) / 11 - band;
    const chunk = Math.floor((x + band * 13) / (14 + (band % 3) * 5));
    const h = ((band * 7919 + chunk * 104729 + seed * 31) >>> 0) % 5;
    let c = ROCK[2 + (h % 3)];
    if (f < 0.14) c = ROCK[Math.min(5, 4 + (h & 1))];
    else if (f > 0.8) c = ROCK[0];
    else if (((x + band * 13) % (14 + (band % 3) * 5)) === 0) c = ROCK[1];
    else if (((x + y) & 1) && f > 0.6) c = ROCK[1 + (h % 2)];
    p.set(x, y, c);
  }
}

/** Moss and little plants growing on the rock. */
function mossy(p, x0, y0, w, h, rnd, n) {
  for (let i = 0; i < n; i++) {
    const x = x0 + Math.floor(rnd() * w), y = y0 + Math.floor(rnd() * h), r = 2 + Math.floor(rnd() * 5);
    p.blob(x, y, r + 2, r, MOSS[0], MOSS[1 + Math.floor(rnd() * 2)], MOSS[3]);
  }
}

/** La Coca Falls: water sliding down a wall of dark rock as tall as a building, right beside the road. */
function laCoca(p, t = {}) {
  const frame = t.frame || 0, rnd = seeded(41);
  sky(p, 60, ['#6a9ad8', '#9cc0e8', '#cfe2f2']);
  p.rect(0, 30, W, 145, '#184a22');
  canopy(p, -10, W + 10, 26, rnd, 16, ['#1e5a2a', '#2f7d33', '#4cae4f']);
  canopy(p, -10, W + 10, 44, rnd, 14, ['#184a22', '#256a2c', '#3f8a40']);
  // the rock wall, a narrow lip at the top and wide at the bottom
  rockFace(p, 50, 170, (y) => 112 - Math.round((y - 50) * 0.55) + Math.round(Math.sin(y / 7) * 2), (y) => 206 + Math.round((y - 50) * 0.5) + Math.round(Math.sin(y / 5) * 2), 3);
  mossy(p, 50, 120, 30, 40, rnd, 6); mossy(p, 240, 116, 30, 44, rnd, 6); mossy(p, 104, 50, 16, 20, rnd, 3); mossy(p, 200, 52, 14, 20, rnd, 3);
  // the water: a sheet over the lip, then streams sliding down the rock
  falling(p, 120, 50, 64, 76, frame, { spread: 8 });
  for (const [x, y0, y1, w, sp] of [[112, 62, 166, 4, 4], [126, 62, 168, 7, 6], [142, 62, 120, 3, 2], [145, 118, 168, 4, 4], [156, 62, 168, 8, 6], [174, 62, 166, 5, 5], [190, 62, 140, 3, 3], [196, 138, 168, 2, 3], [102, 88, 166, 2, 2], [212, 80, 166, 2, 2], [226, 110, 168, 2, 1]]) falling(p, x, y0, y1, w, frame, { spread: sp });
  // the pool at the bottom, and the spray
  p.grad(40, 164, 240, 12, ['#5a8a9a', '#3a6a7a']);
  splash(p, 122, 168, 14, frame); splash(p, 162, 168, 20, frame); splash(p, 200, 168, 10, frame);
  // ferns and trees down both sides
  p.rect(0, 70, 56, 110, '#184a22'); p.rect(270, 70, 50, 110, '#184a22');
  canopy(p, -10, 60, 90, rnd, 18); canopy(p, 262, W + 10, 84, rnd, 18);
  treeFern(p, 30, 170, 70); treeFern(p, 292, 168, 62);
  // the road and its railing, along the bottom
  p.rect(0, 174, W, 26, '#4a4a52'); p.rect(0, 174, W, 2, '#74747c');
  for (let x = 4; x < W; x += 28) p.rect(x, 188, 14, 2, '#f2e8a0');
  p.rect(0, 168, W, 3, '#c8c8cc'); p.rect(0, 171, W, 1, '#8a8a90');
  for (let x = 6; x < W; x += 24) p.rect(x, 168, 3, 8, '#9a9aa0');
  // Ranger Inés's rain gauge, and the sign at the lookout
  p.rect(262, 140, 2, 30, '#5a5a62'); p.rect(259, 128, 8, 14, '#cfe6fa'); p.rect(259, 128, 8, 1, '#ffffff'); p.rect(260, 135, 6, 6, '#5d93e6');
  for (let y = 130; y < 142; y += 3) p.rect(259, y, 2, 1, '#2a2a30');
  p.rect(44, 150, 3, 22, '#5a3a22'); p.rect(30, 134, 32, 20, '#3a5a2a'); p.rect(32, 136, 28, 16, '#e8dcc0');
  for (let y = 139; y < 150; y += 3) p.rect(35, y, 22, 1, '#6a5a4a');
  p.sprite(HERO, HERO_PAL, 130, 162, {});
  p.sprite(SIDEKICK, SIDEKICK_PAL, 148, 168);
  p.sprite(PUP, PUP_PAL, 168, 178);
}
laCoca.fps = 6;


// The hiker resting on a rock by the pool: a big backpack and a sun hat.
const HIKER = [
  '...hhhh...',
  '.hhhhhhhh.',
  '..tttttbb.',
  '..tkttkbbB',
  '..ttttbbbB',
  '...ttbbbbB',
  '.ggggbbbbB',
  'tggggbbbbB',
  'tggggbbbb.',
  '.ppppppp..',
  '.pppppppp.',
  '......pp..',
  '......oo..',
];
const HIKER_PAL = { h: '#e8c66a', t: '#c98d63', k: '#2a1e1a', g: '#d23a32', b: '#2f6fd1', B: '#1e4a9a', p: '#5a6a3a', o: '#3a2a1e' };

/** Juan Diego Falls: a waterfall dropping into a green pool, and a stream with stepping rocks. */
function juanDiego(p, t = {}) {
  const frame = t.frame || 0, rnd = seeded(53);
  p.rect(0, 0, W, 150, '#184a22');
  canopy(p, -10, W + 10, 0, rnd, 18, ['#1e5a2a', '#2f7d33', '#4cae4f']);
  canopy(p, -10, W + 10, 18, rnd, 14, ['#184a22', '#256a2c', '#3f8a40']);
  // the cliff behind the falls
  rockFace(p, 30, 140, (y) => 64 + Math.round(Math.sin(y / 9) * 4), (y) => 262 + Math.round(Math.sin(y / 7) * 4), 7);
  for (let y = 30; y < 140; y++) for (let x = 140; x < 176; x++) if (((x - 158) / 18) ** 2 + ((y - 30) / 26) ** 2 < 1) p.set(x, y, ((x + y) & 1) ? ROCK[0] : ROCK[1]);
  // a big boulder on the left, mossy on top, and moss hanging down the right
  const bw = (y) => Math.round(Math.sqrt(Math.max(0, 1 - ((y - 96) / 56) ** 2)) * 48);
  rockFace(p, 40, 140, (y) => 96 - bw(y), (y) => 96 + bw(y), 12);
  for (let y = 40; y < 140; y++) { const hw = bw(y), m = 68 - Math.abs(Math.sin(y / 5)) * 6; for (let x = 96 - hw; x < 96 + hw; x++) if (y < m - (x - 96) * 0.25 + Math.sin(x / 4) * 4) p.set(x, y, toneAt(MOSS, 0.35 + 0.5 * Math.max(0, (60 - y) / 30 + (96 - x) / 120), x, y)); }
  mossy(p, 52, 44, 84, 40, rnd, 16); mossy(p, 54, 80, 20, 56, rnd, 8);
  for (let x = 196; x < 268; x++) { const len = 30 + Math.floor(rnd() * 80); for (let y = 30; y < 30 + len; y++) if (rnd() < 0.55 - (y - 30) / (len * 2)) p.set(x, y, MOSS[1 + ((x + y) % 3)]); }
  mossy(p, 200, 36, 64, 90, rnd, 18);
  // the falls: one ribbon that widens as it drops, and a thin one beside it
  falling(p, 151, 30, 136, 14, frame, { spread: 16 });
  falling(p, 182, 64, 136, 3, frame, { spread: 3 });

  // the ground in front: mud, then the pool and the stream it feeds
  p.rect(0, 132, W, 68, '#5a3e22');
  for (let i = 0; i < 80; i++) p.rect(Math.floor(rnd() * W), 134 + Math.floor(rnd() * 66), 3, 1, rnd() < 0.5 ? '#6a4a2a' : '#4a321c');
  const water = (x, y) => toneAt(['#1e5a4a', '#2a6a5a', '#3a8a6a', '#6ab494'], 0.35 + (((x >> 3) * 5 + y * 3 + frame * 2) % 11) / 30, x, y);
  for (let y = 128; y < 156; y++) { const hw = Math.round(118 * Math.sqrt(Math.max(0, 1 - ((y - 140) / 16) ** 2))); for (let x = 160 - hw; x < 160 + hw; x++) p.set(x, y, water(x, y)); }
  for (let y = 148; y < H; y++) {
    const cx = 172 + Math.round((y - 148) * 0.35 + Math.sin(y / 14) * 6), hw = 30 + Math.round((y - 148) * 0.9);
    for (let x = cx - hw; x < cx + hw; x++) p.set(x, y, water(x, y));
    p.set(cx - hw, y, '#3a2a18'); p.set(cx + hw - 1, y, '#3a2a18');
  }
  for (let i = 0; i < 40; i++) { const y = 132 + Math.floor(rnd() * 66), x = 150 + Math.floor(rnd() * 70) + (y - 132) * 0.3; p.rect(Math.round(x), y, 4, 1, (i + frame) % 3 ? '#9ad4c0' : '#e4f4f8'); }
  splash(p, 159, 138, 20, frame);
  for (const [x, y, r] of [[146, 194, 12], [168, 180, 10], [194, 170, 9], [214, 160, 8]]) p.blob(x, y, r, Math.round(r * 0.6), ROCK[1], ROCK[3], ROCK[5]);
  // ferns at the edges
  for (let k = 0; k < 6; k++) frond(p, 306, 160, -2.6 + k * 0.4, 32, 0.02);
  for (let k = 0; k < 6; k++) frond(p, 4, 132, -1.3 + k * 0.35, 34, 0.025);
  // the hiker, resting on a rock by the pool
  p.blob(252, 140, 15, 9, ROCK[1], ROCK[3], ROCK[5]);
  p.sprite(HIKER, HIKER_PAL, 244, 120);
  p.sprite(HERO, HERO_PAL, 58, 156);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 78, 162);
  p.sprite(PUP, PUP_PAL, 100, 178);
}
juanDiego.fps = 6;


// The girl on the beach towel, with her picture cards.
const GIRL = [
  '..kkkk..',
  '.kkkkkk.',
  'kkttttkk',
  'kktkktkk',
  'k.tttt.k',
  'k..tt..k',
  '.yyyyyy.',
  'tyyyyyyt',
  't.yyyy.t',
  '..tttt..',
  '..t..t..',
];
const GIRL_PAL = { k: '#2a1a14', t: '#b9784f', y: '#f2c531' };

/** A palm tree: a curved trunk from (x, y) up h, leaning by lean, and its fronds. */
function palmTree(p, x, y, h, lean, s = 1) {
  let tx = x, ty = y;
  for (let i = 0; i < h; i++) { tx = x + Math.round(lean * i + Math.sin(i / 14) * 2 * s); ty = y - i; p.rect(tx, ty, Math.max(2, Math.round(4 * s)), 1, i % 6 < 3 ? '#8a6238' : '#6a4626'); }
  for (let k = 0; k < 7; k++) frond(p, tx + 1, ty, -Math.PI * 0.95 + k * 0.48, Math.round(26 * s), 0.035 * (k < 3 ? -1 : 1) + 0.01);
  p.blob(tx + 2, ty + 2, Math.max(1, Math.round(2 * s)), Math.max(1, Math.round(2 * s)), '#3a2a12', '#6a4a1a', '#8a6a2a');
}

/** The beach on the north coast: a long quiet shore, palms all the way along, and waves that go shhhh. */
function beach(p, t = {}) {
  const frame = t.frame || 0, rnd = seeded(61);
  sky(p, 90, ['#4a80d8', '#7fb2ee', '#bcdcf8', '#e4f0fa']);
  // bands of puffy clouds, gray underneath, like the trip photo
  cloud(p, 70, 14, 0.8); cloud(p, 210, 22, 0.6);
  for (let i = 0; i < 12; i++) { const x = (i * 31) % 340 - 10, y = 54 + (i % 4) * 6; p.blob(x, y + 5, 26, 6, '#7a8898', '#98a6b4', '#b8c4cc'); cloud(p, x, y, 1.3 - (i % 3) * 0.2); }
  // the sea, and a headland far away down the coast
  p.grad(0, 82, W, H - 82, ['#1d4f86', '#2a6fb0', '#3b8ac4', '#5aa6cc']);
  for (let x = 236; x < W; x++) { const y = 82 - Math.round(Math.max(0, Math.sin((x - 236) / 52)) * 9); p.rect(x, y, 1, 82 - y + 1, '#5a8a72'); }
  // the shore runs from near you on the left to far away on the right
  const shore = (x) => 196 - Math.round(x * 0.36 + Math.sin(x / 23) * 3);
  for (let x = 0; x < W; x++) { const y = shore(x); p.rect(x, y, 1, H - y, '#e8cf8c'); }
  for (let y = 86; y < H; y++) for (let x = 0; x < W; x++) if (y >= shore(x) + 4 && ((x * 31 + y * 17) % 23 === 0)) p.set(x, y, (x + y) % 2 ? '#c8a860' : '#fff2c8');
  // waves rolling in toward the shore, and the foam sliding up and back
  for (let i = 0; i < 6; i++) {
    const off = ((frame * 0.5 + i * 7) % 42) - 6;
    for (let x = 0; x < W; x++) {
      const y = shore(x) - 34 + i * 6 + Math.round(off * 0.3 + Math.sin(x / 11 + i) * 1.5);
      if (y > 84 && y < shore(x) - 2) {
        if (i === 5) { p.rect(x, y - 2, 1, 2, '#2a6a90'); p.set(x, y, '#ffffff'); p.set(x, y + 1, (x + frame) % 3 ? '#ffffff' : '#cfe8f4'); p.set(x, y + 2, '#cfe8f4'); p.set(x, y - 1, (x * 7 + frame) % 5 ? '#e4f4fa' : '#ffffff'); }
        else p.set(x, y, i > 3 ? '#ffffff' : '#8fc8e6');
      }
    }
  }
  const reach = Math.round(Math.sin(frame / 8) * 4);
  for (let x = 0; x < W; x++) { const y = shore(x) + reach - 1; p.rect(x, y - 2, 1, 3, '#f4fbff'); p.set(x, y + 1, '#d8c890'); }
  // palms along the beach, smaller as they go away
  for (const [x, s] of [[300, 1.0], [262, 0.8], [226, 0.62], [200, 0.5], [180, 0.4]]) palmTree(p, x, shore(x) + 24 + Math.round(s * 30), Math.round(72 * s), -0.18, s);
  // the girl's towel, her cards, and a beach chair under an umbrella
  for (let y = 0; y < 18; y++) p.rect(206 + Math.round(y * 0.6), 168 + y, 46, 1, y % 6 < 3 ? '#d23a32' : '#f4f1e8');
  for (let i = 0; i < 6; i++) p.rect(214 + (i % 3) * 9 + Math.round(Math.floor(i / 3) * 5), 172 + Math.floor(i / 3) * 7, 7, 5, i % 2 ? '#fbf6ee' : '#cfe6fa');
  p.sprite(GIRL, GIRL_PAL, 254, 162);
  p.rect(280, 128, 2, 52, '#e8e2d2');
  for (let r = 0; r < 12; r++) p.rect(281 - (r * 2 + 2), 124 + r, (r * 2 + 2) * 2, 1, r % 4 < 2 ? '#2f6fd1' : '#f4f1e8');
  p.rect(276, 166, 22, 3, '#f2c531'); p.rect(292, 154, 3, 14, '#f2c531'); p.rect(276, 169, 2, 10, '#c8a030'); p.rect(296, 169, 2, 10, '#c8a030');
  // Quentin's heap of shells
  for (let i = 0; i < 16; i++) { const x = 120 + Math.floor(rnd() * 22), y = 182 + Math.floor(rnd() * 8); p.blob(x, y, 4, 3, '#a87a5a', ['#f4c8b0', '#fbf6ee', '#f0a888'][i % 3], '#ffffff'); }
  p.sprite(HERO, HERO_PAL, 80, 164);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 100, 172);
  p.sprite(PUP, PUP_PAL, 146, 182);
}
beach.fps = 4;

// ---------------------------------------------------------------------------
// Icons: small pictures for puzzle boards (the cards in Memoria, the marks in
// a picture graph, what goes in a tray). Each fits in iconBox and is called
// as fn(pix, x, y). A puzzle bank names one with icon:.

export const iconBox = [22, 12];

/** A character-grid icon, centered in the box. */
const gridIcon = (grid, pal) => (p, x, y) => {
  p.sprite(grid, pal, x + Math.floor((iconBox[0] - grid[0].length) / 2), y + Math.floor((iconBox[1] - grid.length) / 2), { outline: '#1a1a2a' });
};
/** One of the hatchling shapes, in its own colors. */
const shapeIcon = (parts) => (p, x, y) => creature(p, parts, x, y + 1);

export const icons = {
  frog: shapeIcon(COQUI_PARTS),
  parrot: shapeIcon(PARROT_PARTS),
  turtle: shapeIcon(TURTLE_PARTS),
  bat: shapeIcon(BAT_PARTS),
  snake: shapeIcon(BOA_PARTS),
  iguana: shapeIcon(PLAIN),
  dog: gridIcon(PUP, PUP_PAL),
  cat: gridIcon(CAT, CAT_PAL),
  fish: gridIcon([
    '....oooo......',
    '..ooOOOOoo...o',
    '.oOeOOOOOOo.oo',
    'oOOOOOOOOOOooo',
    'oOOOOwOOOOOooo',
    '.oOOOOOOOOo.oo',
    '..ooOOOOoo...o',
    '....oooo......',
  ], { o: '#d86a1e', O: '#f29a3a', e: '#1e1414', w: '#ffd9a0' }),
  sun: gridIcon([
    '.....y.....',
    '.y...y...y.',
    '..y.....y..',
    '....yyy....',
    '...yYYYy...',
    'yy.yYYYy.yy',
    '...yYYYy...',
    '....yyy....',
    '..y.....y..',
    '.y...y...y.',
    '.....y.....',
  ], { y: '#f2b630', Y: '#fff2b0' }),
  wave: gridIcon([
    '....ww...........',
    '..wwbbw.....ww...',
    '.wbbbbbw..wwbbw..',
    'wbbbbbbbwwbbbbbw.',
    'bbbbBBbbbbbbBBbbb',
    'bbBBbbbbbBBbbbbbb',
    'BBbbbbBBBbbbbBBBb',
    'bbbbBBbbbbbBBbbbb',
    'BBBBBBBBBBBBBBBBB',
  ], { w: '#f4fbff', b: '#3b82c4', B: '#1d4f86' }),
  shell: gridIcon([
    '...ppppp...',
    '..pPpPpPp..',
    '.pPpPpPpPp.',
    'pPpPpPpPpPp',
    'pPpPpPpPpPp',
    '.pPpPpPpPp.',
    '..pPpPpPp..',
    '...pPpPp...',
    '..ppppppp..',
  ], { p: '#f0a8b8', P: '#fbe0e4' }),
  palm: gridIcon([
    '..gg....gg...',
    '.gGGg..gGGg..',
    'gGggGggGggGg.',
    'g...gGGg...g.',
    '...gGttGg....',
    '..gG.tt.Gg...',
    '..g..tt..g...',
    '.....tt......',
    '.....ttt.....',
    '......tt.....',
    '......tt.....',
    '.....tttt....',
  ], { g: '#2f7d33', G: '#4cae4f', t: '#8a5a32' }),
  crab: gridIcon([
    'rr.........rr.',
    'r.r.......r.r.',
    '.rr.e...e.rr..',
    '..rrrrrrrrr...',
    '.rRRRRRRRRRr..',
    'r.rRRRRRRRr.r.',
    '..r.r...r.r...',
    '.r..r...r..r..',
  ], { r: '#c8382c', R: '#ec6a4a', e: '#1e1414' }),
  boat: gridIcon([
    '......m.......',
    '......mw......',
    '......mww.....',
    '......mwww....',
    '......mwwww...',
    '......m.......',
    'bbbbbbbbbbbbbb',
    '.bBBBBBBBBBBb.',
    '..bBBBBBBBBb..',
    '...bbbbbbbb...',
  ], { m: '#5a3a22', w: '#f4f1e8', b: '#a02a24', B: '#d23a32' }),
  drop: gridIcon([
    '...b...',
    '...b...',
    '..bBb..',
    '..bBb..',
    '.bBBBb.',
    '.bBBBb.',
    'bBwBBBb',
    'bBwBBBb',
    'bBBBBBb',
    '.bBBBb.',
    '..bbb..',
  ], { b: '#2a6fb0', B: '#6ab8f0', w: '#eef8ff' }),
  paw: gridIcon([
    '..dd.dd..',
    '..dd.dd..',
    'dd.....dd',
    'dd.ddd.dd',
    '..ddddd..',
    '.ddddddd.',
    '.ddddddd.',
    '..dd.dd..',
  ], { d: '#e8b070' }),
  cannonball: gridIcon([
    '..kkkkk..',
    '.kKKKKKk.',
    'kKKwKKKKk',
    'kKwKKKKKk',
    'kKKKKKKKk',
    'kKKKKKKKk',
    'kKKKKKKKk',
    '.kKKKKKk.',
    '..kkkkk..',
  ], { k: '#2a2a30', K: '#5a5a66', w: '#b8b8c8' }),
  // --- Flight Plan: what is looked for, and what is in the way ---
  key: gridIcon([
    '.yyy........',
    'y...yyyyyyyy',
    'y...y...y.y.',
    '.yyy....y.y.',
  ], { y: '#f2c531' }),
  block: gridIcon([
    'kkkkkkkkkk',
    'kKKKKkKKKk',
    'kKKKKkKKKk',
    'kkkkkkkkkk',
    'kKKkKKKKKk',
    'kKKkKKKKKk',
    'kkkkkkkkkk',
  ], { k: '#5a5a66', K: '#8a8a96' }),
  kite: gridIcon([
    '....r......',
    '...rry.....',
    '..rrryy....',
    '.rrrryyy...',
    '..bbbgg....',
    '...bbg.....',
    '....b......',
    '.....w.....',
    '......w.w..',
    '.......w...',
  ], { r: '#d23a32', y: '#f2c531', b: '#2f6fd1', g: '#3f9e4a', w: '#f4f1e8' }),
  blanket: gridIcon([
    'rrwwrrwwrrww',
    'rrwwrrwwrrww',
    'wwrrwwrrwwrr',
    'wwrrwwrrwwrr',
    'rrwwrrwwrrww',
    'rrwwrrwwrrww',
    'wwrrwwrrwwrr',
    'wwrrwwrrwwrr',
  ], { r: '#d23a32', w: '#f4f1e8' }),
  hat: gridIcon([
    '...hhhh...',
    '..hhhhhh..',
    '..hbbbbh..',
    'hhhhhhhhhh',
    '.hhhhhhhh.',
  ], { h: '#e8c66a', b: '#d23a32' }),
  puddle: gridIcon([
    '...bbbbbb...',
    '.bbBBBBBbbb.',
    'bbBBwwBBBBbb',
    '.bbBBBBBBbb.',
    '...bbbbbb...',
  ], { b: '#2a6fb0', B: '#6ab8f0', w: '#eef8ff' }),
  // --- Egg to Dragon: the stages of three lives ---
  'eggs-land': gridIcon([
    '......ww......',
    '....wwWWww....',
    '...wWWwwWWw...',
    '....wwWWww....',
    '.gggggggggggg.',
    'ggGGGGGGGGGGgg',
    '.gggggggggggg.',
  ], { w: '#eef5fc', W: '#b8c8d8', g: '#2f7d33', G: '#4cae4f' }),
  'dad-eggs': gridIcon([
    '....bbbbbb....',
    '..bbebbbbebb..',
    '.bbbbbbbbbbbb.',
    '.bblllllllbbb.',
    '..bb.wwww.bb..',
    '.bb.wWwwWw.bb.',
    '....wwwwww....',
  ], { b: '#c8964e', e: '#1e1414', l: '#f2e2b4', w: '#eef5fc', W: '#b8c8d8' }),
  'egg-frog': gridIcon([
    '...wwww...',
    '..wwwwww..',
    '.wwbbbbww.',
    '.wbebbebw.',
    '.wbbbbbbw.',
    '.wwbllbww.',
    '..wwwwww..',
    '...wwww...',
  ], { w: '#eef5fc', b: '#c8964e', e: '#1e1414', l: '#f2e2b4' }),
  froglet: gridIcon([
    '.bb..bb.',
    'bebbbbeb',
    'bbbbbbbb',
    '.bllllb.',
    'bb....bb',
  ], { b: '#c8964e', e: '#1e1414', l: '#f2e2b4' }),
  'tree-hole': gridIcon([
    '.gggggggg.',
    'gGGGGGGGGg',
    '.gGGGGGGg.',
    '..tttttt..',
    '..ttkktt..',
    '..tkkkkt..',
    '..tkkkkt..',
    '..ttkktt..',
    '..tttttt..',
    '..tttttt..',
  ], { g: '#2f7d33', G: '#4cae4f', t: '#7a5232', k: '#24140e' }),
  'eggs-nest': gridIcon([
    'tttttttttttt',
    'ttkkkkkkkktt',
    'tkkkkkkkkkkt',
    'tkkwwkwwkkkt',
    'tkwwwwwwwkkt',
    'tkkwwkwwkkkt',
    'ttkkkkkkkktt',
    'tttttttttttt',
  ], { t: '#7a5232', k: '#24140e', w: '#f4f1e8' }),
  chick: gridIcon([
    '..aaaaa..',
    '.aaeaeaa.',
    '.aaayyaa.',
    'aaaayyaaa',
    'aaaaaaaaa',
    '.aaaaaaa.',
    '..aa.aa..',
  ], { a: '#c8c8c8', y: '#f2b630', e: '#1e1414' }),
  fledgling: gridIcon([
    'w...........w',
    'ww..ggg....ww',
    '.wwgegrg..ww.',
    '..ggggggggw..',
    '...gGGGGgg...',
    '....gGGg.....',
    '....y..y.....',
  ], { g: '#3fae4a', G: '#9ade6e', w: '#2f6fd1', r: '#d23a32', e: '#1e1414', y: '#f2b630' }),
  'eggs-sand': gridIcon([
    'ssssssssssssss',
    'ssddddddddddss',
    'sddwwdwwdwwdds',
    'ssdwwdwwdwwdss',
    'sssddddddddsss',
    'ssssssssssssss',
  ], { s: '#e8cf8c', d: '#b08e50', w: '#f4f1e8' }),
  'warm-sand': gridIcon([
    '.....y.y.y....',
    '......yyy.....',
    '....yyyyyyy...',
    '......yyy.....',
    '.....y.y.y....',
    '...ssssssss...',
    '.ssSSSSSSSSss.',
    'ssssssssssssss',
  ], { y: '#f2c531', s: '#c8a860', S: '#f0dc9c' }),
  hatchling: gridIcon([
    '..dddd....B...B.',
    '.dbbbbde.B.B.B.B',
    'ddbbbbdd..B...B.',
    '.dbbbbd....B...B',
    '.w.dd.w...B.B.B.',
  ], { d: '#2e3e4e', b: '#5a7a8a', e: '#1e1414', w: '#7a94a4', B: '#6ab8f0' }),
  'sea-turtle': gridIcon([
    'BBBBBBBBBBBBBBBB',
    'BBoBBBBBBBBBBBBB',
    'BBBBBBddddBBBBBB',
    'BoBBddbbbbddBBBB',
    'BBwwdbbbbbbdbbBB',
    'BBBwwdbbbbdbebBB',
    'BBBBBwwddwwBBBBB',
    'BBBBBwBBBBwBBBBB',
    'BBBBBBBBBBBBBBBB',
  ], { B: '#2a6fb0', o: '#b8e0ff', d: '#2e3e4e', b: '#5a7a8a', w: '#7a94a4', e: '#1e1414' }),
  // --- Weather Watch and the newer matching games ---
  cloud: gridIcon([
    '.....wwww.....',
    '...wwwwwwww...',
    '..wwwwwwwwwww.',
    '.wwwwwwwwwwwww',
    'wwwwwwwwwwwwww',
    '.wWWWWWWWWWWW.',
  ], { w: '#f4f8fc', W: '#b8c8d8' }),
  rain: gridIcon([
    '....wwww......',
    '..wwwwwwww....',
    '.wwwwwwwwwww..',
    'wwwwwwwwwwwww.',
    '.WWWWWWWWWWW..',
    '..b...b...b...',
    '.b...b...b....',
    '...b...b...b..',
    '..b...b...b...',
  ], { w: '#c8d4dc', W: '#8a98a8', b: '#6ab8f0' }),
  storm: gridIcon([
    '....kkkk......',
    '..kkkkkkkk....',
    '.kkkkkkkkkkk..',
    'kkkkkkkkkkkkk.',
    '.KKKKKKKKKKK..',
    '.....yy.......',
    '....yy........',
    '...yyyy.......',
    '.....yy.......',
    '....y.........',
  ], { k: '#6a7480', K: '#4a525e', y: '#f2c531' }),
  tree: gridIcon([
    '...gggg...',
    '.ggGGGGgg.',
    'gGGGGGGGGg',
    'gGGGGGGGGg',
    '.ggGGGGgg.',
    '...gttg...',
    '....tt....',
    '....tt....',
    '...tttt...',
  ], { g: '#2f7d33', G: '#4cae4f', t: '#7a5232' }),
  mountain: gridIcon([
    '.......ww.......',
    '......wwww......',
    '.....gwwwwg.....',
    '....ggggwggg....',
    '...gggGggggggg..',
    '..gggGGGgggGggg.',
    '.gggGGGGGgGGGggg',
    'gggggggggggggggg',
  ], { w: '#f4f8fc', g: '#2f7d33', G: '#4cae4f' }),
  tower: gridIcon([
    'k.kk.kk.',
    'kkkkkkkk',
    '.KKKKKK.',
    '.KKwwKK.',
    '.KKKKKK.',
    '.KKKKKK.',
    '.KKwwKK.',
    '.KKKKKK.',
    '.KKkkKK.',
    '.KKkkKK.',
  ], { k: '#6a7480', K: '#a8b2be', w: '#24140e' }),
  leaf: gridIcon([
    '.....gggg.',
    '...ggGGGGg',
    '..gGGGgGGg',
    '.gGGGgGGg.',
    'gGGgGGGg..',
    'gggGGgg...',
    't.ggg.....',
  ], { g: '#2f7d33', G: '#4cae4f', t: '#7a5232' }),
  moon: gridIcon([
    '..yyyy..',
    '.yyy....',
    'yyy.....',
    'yyy.....',
    'yyy.....',
    'yyy.....',
    '.yyy....',
    '..yyyy..',
  ], { y: '#fff2b0' }),
  star: gridIcon([
    '....y....',
    '....y....',
    '...yyy...',
    'yyyyyyyyy',
    '.yyyyyyy.',
    '..yyyyy..',
    '.yyy.yyy.',
    '.y.....y.',
  ], { y: '#f2c531' }),
  paddle: gridIcon([
    'bb............',
    'bbb...........',
    '.bbtt.........',
    '...ttt........',
    '.....ttt......',
    '.......tttbb..',
    '.........tbbb.',
    '..........bbb.',
  ], { b: '#ec8a2c', t: '#7a5232' }),
};



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
  hollow: (p, t) => hollow(p, 'real', t),
  'hollow-song': (p, t) => hollow(p, 'song', t),
  'hollow-dragon': (p, t) => hollow(p, 'found', t),
  'old-tree': (p, t) => oldTree(p, 'real', t),
  'tree-call': (p, t) => oldTree(p, 'call', t),
  'tree-dragon': (p, t) => oldTree(p, 'found', t),
  'sand-tracks': (p, t) => sandNest(p, 'real', t),
  'sand-nest': sandWiggle,
  'sand-dragon': (p, t) => sandNest(p, 'found', t),
  'old-san-juan': oldSanJuan,
  garita,
  tunnel,
  yokahu,
  'la-coca': laCoca,
  'juan-diego': juanDiego,
  beach,
  lawn,
  lookout,
  bay: (p, t) => bay(p, 'day', t),
  'bay-dark': bayDark,
  'bay-dragon': bayFound,
  road: (p) => road(p),
  'road-jam': (p) => road(p, 'jam'),
  'road-rain': (p) => road(p, 'rain'),
  'egg-gold': eggPic('#b8862a', '#f2c531', '#fff2b0'),
  'egg-silver': eggPic('#7a8490', '#c4ccd4', '#ffffff'),
  'egg-bronze': eggPic('#7a4a2a', '#c98a4e', '#f0c8a0'),
  title,
};
