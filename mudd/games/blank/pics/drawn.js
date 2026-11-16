// @ts-check
// Pictures for the blank game pack. Every picture is a function that paints
// a 320 x 200 framebuffer (see engine/art.js for what a Pix can draw), named
// in `scenes` at the bottom. A picture that moves sets fps. games/el-morro's
// drawn.js has many more examples: people, buildings, water, animals.

import { W, H } from '../../../engine/art.js';

// ---------------------------------------------------------------------------
// The creatures. Each is one shape, painted with its sprite: colors from
// creatures.yaml: b body, d dark, l belly, t trim. Shapes face left.

export const SHAPES = {
  sprout: [
    '....tt....',
    '...tddt...',
    '..bbbbbb..',
    '.bebbbbeb.',
    '.bbbllbbb.',
    '..bllllb..',
    '..bb..bb..',
  ],
  pebble: [
    '...bbbb...',
    '.bbbbbbbb.',
    'bbebbbbebb',
    'bbbbllbbbb',
    'bdbllllbdb',
    '.dddddddd.',
  ],
};

/** The biggest shape, so a portrait can hold any of them. */
export const creatureBox = [10, 7];

/** Paint one creature. The engine calls this for the lineup and the Field Guide. */
export function creature(p, parts, x, y, { scale = 1, flip = false, outline = '#1a1a2a' } = {}) {
  const k = parts || {};
  const grid = SHAPES[k.shape] || SHAPES.sprout;
  const pal = { b: k.body || '#888', d: k.dark || '#444', l: k.belly || '#ccc', t: k.trim || '#fc0', e: '#1e1414' };
  const dx = Math.floor((creatureBox[0] - grid[0].length) / 2), dy = creatureBox[1] - grid.length;
  p.sprite(grid, pal, x + dx * scale, y + dy * scale, { scale, flip, outline });
}

// ---------------------------------------------------------------------------
// Scenes

/** Grass under a sky. */
function outdoors(p, sky = ['#4a80d8', '#8fc0f2'], grass = ['#6ab04a', '#3f8a30']) {
  p.grad(0, 0, W, 110, sky);
  p.grad(0, 110, W, H - 110, grass);
}

function title(p) {
  outdoors(p, ['#2a2352', '#a8507e', '#f8be6a']);
  p.blob(160, 120, 40, 30, '#8a6a3a', '#c89a5a', '#f0d0a0');   // a box with something in it
  creature(p, { shape: 'sprout', body: '#5ab04a', dark: '#2f7d33', belly: '#c8e890', trim: '#f2c531' }, 140, 70, { scale: 4 });
}

function map(p) {
  p.rect(0, 0, W, H, '#e8dcb0');
  p.grad(200, 90, 120, 110, ['#7ab0e0', '#4a80c0']);            // water in one corner
  for (let i = 0; i < 40; i++) p.rect((i * 71) % W, (i * 37) % H, 3, 2, '#c8bc90');
}

function clubhouse(p) {
  p.grad(0, 0, W, 130, ['#c99d6a', '#a37748']);
  p.rect(0, 130, W, 70, '#7a4a2a');
  p.rect(120, 70, 80, 60, '#5a3a22'); p.rect(124, 74, 72, 52, '#8a5a32');   // the box
  p.rect(40, 30, 50, 40, '#4a80d8'); p.rect(64, 30, 2, 40, '#3a2a20');       // a window
}

function meadow(p) {
  outdoors(p);
  for (let i = 0; i < 60; i++) p.rect((i * 53) % W, 120 + ((i * 29) % 78), 2, 2, i % 2 ? '#f2c531' : '#fff');
  p.rect(130, 150, 60, 20, '#d23a32'); p.dith(130, 150, 60, 20, '#d23a32', '#f4f1e8');   // the blanket
}

function pond(p) {
  outdoors(p);
  p.ellipse(160, 150, 120, 36, '#3a6aa8'); p.ellipse(160, 148, 110, 30, '#5a8ad6');
  for (const [x, y] of [[110, 140], [190, 156], [220, 138]]) p.ellipse(x, y, 9, 4, '#3f8a30');
  p.rect(40, 130, 60, 6, '#8a5a32');                                          // the dock
}

/** The sprout patch. The leaf in the toy's box wiggles. */
function patch(p, t = {}) {
  outdoors(p);
  for (let i = 0; i < 24; i++) { const x = 20 + (i * 47) % 280, y = 120 + (i * 23) % 70; p.rect(x, y - 8, 2, 8, '#2f7d33'); p.ellipse(x + 2, y - 9, 3, 2, '#5ab04a'); }
  const wig = (t.frame || 0) % 2 ? 2 : -2;
  p.rect(161, 116, 2, 16, '#2f7d33'); p.ellipse(162 + wig, 114, 7, 4, '#7cd05a');
}
patch.fps = 4;

function pile(p) {
  outdoors(p, ['#4a80d8', '#8fc0f2'], ['#8a7a5a', '#6a5a3a']);
  for (let i = 0; i < 14; i++) p.blob(110 + (i % 5) * 22, 170 - Math.floor(i / 5) * 16, 11, 8, '#5a5a6a', '#9a9aa8', '#d0d0dc');
}

/** Every picture by name: "# pic: <name>" in a card, and pics: in game.yaml. */
export const scenes = { title, map, clubhouse, meadow, pond, patch, pile };

