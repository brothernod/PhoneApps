// @ts-check
// Pictures: a 320x200 framebuffer for scenes drawn in code, and a picture
// book that shows a scene by name, whether a game pack drew it in code or
// shipped it as a PNG.

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
export class Pix {
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

/**
 * Every picture a game pack owns. Drawn scenes are functions that paint a Pix;
 * photo scenes are 320x200 PNGs loaded ahead of time.
 *
 * A drawn scene is called as fn(pix, t). t.frame counts up while the picture
 * is on screen if the scene moves (give the function an fps: fn.fps = 6).
 * t.who is the sprite: of the creature that hatched this run, and t.pose is
 * set by a lair toy.
 */
export class Pictures {
  constructor() {
    /** @type {Record<string, ((p: Pix, t: Record<string, any>) => void) & { fps?: number }>} */
    this.drawn = {};
    /** @type {Record<string, CanvasImageSource>} */
    this.images = {};
    /** The pack's creature painter and the box it needs, for portraits. */
    this.creature = /** @type {null | ((p: Pix, parts: any, x: number, y: number, opts?: any) => void)} */ (null);
    this.creatureBox = [28, 16];
    /** The pack's small pictures for puzzle boards: name -> painter(pix, x, y), each inside iconBox. */
    this.icons = /** @type {Record<string, (p: Pix, x: number, y: number) => void>} */ ({});
    this.iconBox = [16, 16];
    /** @type {Record<string, string>} */
    this._urls = {};
  }

  /**
   * One of the pack's small pictures as a data URL, one art pixel per image
   * pixel, with a clear background. The page scales it up. Made once each.
   */
  iconUrl(name) {
    if (name in this._urls) return this._urls[name];
    let url = '';
    const fn = this.icons[name];
    if (fn) {
      // one pixel of room all around for the outline
      const w = this.iconBox[0] + 2, h = this.iconBox[1] + 2;
      const p = new Pix();
      fn(p, 1, 1);
      const full = document.createElement('canvas');
      full.width = W; full.height = H;
      const out = document.createElement('canvas');
      out.width = w; out.height = h;
      const fctx = full.getContext('2d'), octx = out.getContext('2d');
      if (fctx && octx) {
        p.flush(fctx);
        octx.drawImage(full, 0, 0, w, h, 0, 0, w, h);
        url = out.toDataURL();
      }
    }
    this._urls[name] = url;
    return url;
  }

  /** Names of every picture, drawn first. */
  get names() { return [...new Set([...Object.keys(this.drawn), ...Object.keys(this.images)])]; }

  has(name) { return name in this.drawn || name in this.images; }

  /** Frames per second for a picture that moves, or 0. */
  fps(name) { return (this.drawn[name] && this.drawn[name].fps) || 0; }

  /** Load PNGs by name. A missing or broken file is an error, not a blank scene. */
  async loadImages(names, urlFor) {
    const loaded = await Promise.all(names.map((name) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth === W && img.naturalHeight === H) resolve(img);
        else reject(new Error(`pics/${name}.png is ${img.naturalWidth}x${img.naturalHeight}; scenes must be ${W}x${H}`));
      };
      img.onerror = () => reject(new Error(`Missing picture pics/${name}.png`));
      img.src = urlFor(name);
    })));
    names.forEach((name, i) => { this.images[name] = loaded[i]; });
  }

  /** Draw a picture by name onto a 320x200 canvas. Unknown names draw nothing. */
  draw(canvas, name, t = {}) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const fn = this.drawn[name];
    if (fn) {
      const p = new Pix();
      fn(p, { frame: 0, ...t });
      p.flush(ctx);
      return true;
    }
    const img = this.images[name];
    if (img) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, W, H);
      return true;
    }
    return false;
  }

  /**
   * Draw one creature, by its sprite: parts, to fill a small canvas. Used by
   * the lineup, the casebook, and the Field Guide. The canvas is shown at a
   * whole number of screen pixels per art pixel, so it stays sharp.
   */
  portrait(canvas, parts, { scale = 2, zoom = 2, back = '#e8e2d2' } = {}) {
    const [bw, bh] = this.creatureBox;
    const w = bw * scale + 8, h = bh * scale + 8;
    canvas.width = w; canvas.height = h;
    canvas.style.width = `${w * zoom}px`;
    canvas.style.height = `${h * zoom}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx || !this.creature) return;
    const p = new Pix();
    p.rect(0, 0, w, h, back);
    this.creature(p, parts || {}, 4, 4, { scale });
    const full = document.createElement('canvas');
    full.width = W; full.height = H;
    const fctx = full.getContext('2d');
    if (!fctx) return;
    p.flush(fctx);
    ctx.drawImage(full, 0, 0, w, h, 0, 0, w, h);
  }
}
