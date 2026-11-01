// @ts-check
// Pixel art drawn in code: 320x200, dithered gradients, shaded sprites with
// automatic outlines. Scenes are plain functions, so adding one is easy.

export const W = 320, H = 200;

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0xff << 24) | ((n & 0xff) << 16) | (n & 0xff00) | (n >> 16);
}

/** Darken (k < 1) or lighten (k > 1) a #rrggbb color. */
export function shade(hex, k) {
  const n = parseInt(hex.slice(1, 7), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0');
  return '#' + f(n >> 16) + f((n >> 8) & 0xff) + f(n & 0xff);
}

/** A tiny framebuffer. All drawing goes here, then onto the canvas at once. */
class Pix {
  constructor() {
    this.buf = new Uint32Array(W * H);
    this.cache = new Map();
  }
  c(hex) {
    let v = this.cache.get(hex);
    if (v === undefined) { v = rgb(hex); this.cache.set(hex, v); }
    return v;
  }
  set(x, y, hex) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    this.buf[y * W + x] = this.c(hex);
  }
  rect(x, y, w, h, hex) {
    const v = this.c(hex);
    const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0);
    const x1 = Math.min(W, (x + w) | 0), y1 = Math.min(H, (y + h) | 0);
    for (let yy = y0; yy < y1; yy++) this.buf.fill(v, yy * W + x0, yy * W + x1);
  }
  /** Vertical gradient through several colors, ordered-dithered like VGA art. */
  grad(x, y, w, h, cols) {
    const n = cols.length - 1;
    for (let r = 0; r < h; r++) {
      const t = h === 1 ? 0 : (r / (h - 1)) * n;
      const i = Math.min(Math.floor(t), n - 1 < 0 ? 0 : n - 1);
      const f = t - i;
      const a = cols[i], b = cols[Math.min(i + 1, n)];
      for (let cx = 0; cx < w; cx++) {
        const th = (BAYER[(y + r) & 3][(x + cx) & 3] + 0.5) / 16;
        this.set(x + cx, y + r, f > th ? b : a);
      }
    }
  }
  /** 50% checker dither of two colors. */
  dith(x, y, w, h, a, b) {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) this.set(x + xx, y + yy, ((x + xx + y + yy) & 1) ? a : b);
  }
  ellipse(cx, cy, rx, ry, hex) {
    for (let y = -ry; y <= ry; y++) {
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      this.rect(cx - hw, cy + y, hw * 2 + 1, 1, hex);
    }
  }
  /** Shaded ball: dark rim, base, highlight. Used for foliage, eggs, stones. */
  blob(cx, cy, rx, ry, dark, base, light) {
    this.ellipse(cx, cy, rx, ry, dark);
    this.ellipse(cx - 1, cy - 1, rx - 1, ry - 1, base);
    this.ellipse(cx - Math.round(rx / 3), cy - Math.round(ry / 3), Math.max(1, Math.round(rx / 3)), Math.max(1, Math.round(ry / 3)), light);
  }
  /**
   * Draw a character-grid sprite with an automatic dark outline.
   * @param {string[]} grid  rows of palette keys; '.' is transparent
   * @param {Record<string,string>} pal
   */
  sprite(grid, pal, x, y, { scale = 1, flip = false, outline = '#24140e' } = {}) {
    const h = grid.length, w = grid[0].length;
    const at = (gx, gy) => {
      if (gx < 0 || gy < 0 || gx >= w || gy >= h) return '.';
      return grid[gy][flip ? w - 1 - gx : gx];
    };
    if (outline) {
      for (let gy = -1; gy <= h; gy++) for (let gx = -1; gx <= w; gx++) {
        if (at(gx, gy) !== '.') continue;
        if (at(gx + 1, gy) !== '.' || at(gx - 1, gy) !== '.' || at(gx, gy + 1) !== '.' || at(gx, gy - 1) !== '.') {
          this.rect(x + gx * scale, y + gy * scale, scale, scale, outline);
        }
      }
    }
    for (let gy = 0; gy < h; gy++) for (let gx = 0; gx < w; gx++) {
      const k = at(gx, gy);
      if (k === '.' || !pal[k]) continue;
      this.rect(x + gx * scale, y + gy * scale, scale, scale, pal[k]);
    }
  }
  flush(ctx) {
    const img = ctx.createImageData(W, H);
    new Uint32Array(img.data.buffer).set(this.buf);
    ctx.putImageData(img, 0, 0);
  }
}

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

function museum(p, { egg = 'cracked' } = {}) {
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
    p.sprite(DRAGON, DRAGON_PAL, 146, 90, { outline: '#1a2a1a' });
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

function streets(p) {
  sky(p, 70);
  cloud(p, 60, 18); cloud(p, 230, 12, 0.8);
  const cols = [
    ['#f08cb4', '#ffffff', '#3c7f8a'], ['#f2c531', '#ffffff', '#2f6fd1'], ['#4fb3c8', '#f4f1e8', '#7a4a2a'],
    ['#ec8a2c', '#ffffff', '#3f9e4a'], ['#7fc87a', '#ffffff', '#d23a32'], ['#5d7fd8', '#f4f1e8', '#f2c531'],
  ];
  let x = -6;
  cols.forEach(([wall, trim, door], i) => {
    const w = 52 + (i % 3) * 4;
    house(p, x, 34 + (i % 2) * 6, w, 112 - (i % 2) * 6, wall, trim, door);
    x += w;
  });
  p.rect(0, 144, W, 3, '#c8bca8');
  cobbles(p, 147, 7);
  piraguaCart(p, 196, 120, 1);
  p.sprite(TITO, TITO_PAL, 236, 126);
  p.sprite(HERO, HERO_PAL, 70, 150);
  p.sprite(SIDEKICK, SIDEKICK_PAL, 88, 156);
  p.sprite(PUP, PUP_PAL, 104, 168, { flip: false });
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

function dragonUp(p) {
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
  p.sprite(DRAGON, DRAGON_PAL, 100, 86, { scale: 4, outline: '#14240f' });
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

const SCENES = { museum, nest: (p) => museum(p, { egg: 'dragon' }), streets, cart, houses: housesUphill, plaza, dragon: dragonUp, title };

/** Draw a scene by name onto a 320x200 canvas. Unknown names draw nothing. */
export function drawScene(canvas, name) {
  const fn = SCENES[name];
  if (!fn) return false;
  const p = new Pix();
  fn(p);
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  p.flush(ctx);
  return true;
}

export const sceneNames = Object.keys(SCENES);
