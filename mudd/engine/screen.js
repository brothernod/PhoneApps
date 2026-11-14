// @ts-check
// Everything on screen: picture window, typed text, keycap choices, the
// puzzle card with its number pad, the map, the casebook and lineup, lair
// toys, and full-screen overlays. Touch only.

import { sleep } from './util.js';

const PAGE = 3; // story choices shown at once; more than this and they page

const $ = (sel) => /** @type {HTMLElement} */ (document.querySelector(sel));

export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Brighten CAPS words like LOOK, EGG, ¡VEN! the way old games did. */
function highlight(text) {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc.replace(/¡?[A-Za-zÁÉÍÓÚÑÜáéíóúñü'-]+!?/g, (w) => {
    const letters = w.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, '');
    return letters.length >= 2 && letters === letters.toUpperCase() ? `<span class="hl">${w}</span>` : w;
  });
}

// 3x5 digits for map flags.
const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];

/** Flags on the map: visited places, where the van is, and a numbered flag on each place on offer. */
function drawMarkers(ctx, view, frame) {
  const box = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  for (const p of view.visited) {
    const [x, y] = p.at;
    box(x - 3, y - 3, 7, 7, '#1a1a2a'); box(x - 2, y - 2, 5, 5, '#8a8aa8');
  }
  if (view.here) {
    const [x, y] = view.here;
    box(x - 4, y - 4, 9, 9, '#1a1a2a'); box(x - 3, y - 3, 7, 7, '#ffffff'); box(x - 1, y - 1, 3, 3, '#d23a32');
  }
  view.offers.forEach((p, i) => {
    const [x, y] = p.at;
    const up = frame % 2 ? 0 : 1; // the flags bob
    box(x, y - 16 - up, 2, 17 + up, '#1a1a2a');
    box(x - 1, y, 4, 2, '#1a1a2a');
    box(x + 2, y - 17 - up, 13, 11, '#1a1a2a');
    box(x + 3, y - 16 - up, 11, 9, frame % 2 ? '#ffd75a' : '#fff2b0');
    const glyph = view.offers.length > 1 ? DIGITS[(i + 1) % 10] : '';
    for (let k = 0; k < glyph.length; k++) if (glyph[k] === '1') box(x + 7 + (k % 3), y - 14 - up + Math.floor(k / 3), 1, 1, '#1a1a2a');
    if (!glyph) box(x + 6, y - 14 - up, 5, 5, '#d23a32');
  });
}

export class Screen {
  constructor() {
    this.pic = /** @type {HTMLCanvasElement} */ (document.getElementById('pic'));
    this.text = $('#text');
    this.controls = $('#controls');
    this.overlay = $('#overlay');
    this.status = $('#status');
    this.root = $('#screen');
    this.cardQ = $('#card-q');
    this.cardHint = $('#card-hint');
    this.cardKeys = $('#card-keys');
    /** The game pack's pictures. Set once the pack has loaded. @type {import('./art.js').Pictures | null} */
    this.pictures = null;
    this.skip = false;
    this.unread = false; // text typed since the player last tapped a button
    this.speed = 22; // ms per character
    this.currentPic = '';
    /** What every picture is told: who hatched this run, and so on. @type {Record<string, any>} */
    this.picBase = {};
    /** The same, plus the frame number and a toy's pose. @type {Record<string, any>} */
    this.picT = { frame: 0 };
    /** Drawn over the picture each frame (map markers, a toy's hint). @type {((ctx: CanvasRenderingContext2D, frame: number) => void) | null} */
    this.picOverlay = null;
    this._anim = 0;
    this.text.addEventListener('pointerdown', () => { this.skip = true; });
    this.pic.addEventListener('pointerdown', () => { this.skip = true; });
  }

  /** Show a picture by name. One that moves (or has an overlay) is redrawn a few times a second. */
  showPic(name) {
    clearInterval(this._anim);
    this._anim = 0;
    if (!name) { this.pic.classList.add('off'); this.currentPic = ''; return; }
    if (!this.pictures || !this.pictures.has(name)) return;
    this.currentPic = name;
    this.picT = { ...this.picBase, frame: 0 };
    this.pic.classList.remove('off');
    this.redraw();
    const fps = this.pictures.fps(name) || (this.picOverlay ? 4 : 0);
    if (fps) this._anim = window.setInterval(() => { this.picT.frame++; this.redraw(); }, 1000 / fps);
  }

  redraw() {
    if (!this.pictures || !this.currentPic) return;
    this.pictures.draw(this.pic, this.currentPic, this.picT);
    const ctx = this.pic.getContext('2d');
    if (ctx && this.picOverlay) this.picOverlay(ctx, this.picT.frame);
  }

  /** Put an overlay over the current picture, or take it away with null. */
  setOverlay(fn) {
    this.picOverlay = fn;
    this.showPic(this.currentPic);
  }

  clearText() { this.text.innerHTML = ''; }

  /** Lines currently on screen, for saving. */
  transcript() {
    return [...this.text.querySelectorAll('p')].slice(-12).map((p) => ({ t: p.dataset.raw || p.textContent || '', c: p.className }));
  }

  restore(lines) {
    this.clearText();
    for (const l of lines || []) {
      const p = el('p', l.c);
      p.dataset.raw = l.t;
      p.innerHTML = highlight(l.t);
      this.text.appendChild(p);
    }
    this.scroll();
  }

  scroll() { this.text.scrollTop = this.text.scrollHeight; }

  /** New keys under the story shrink the text window; keep its last line in view. */
  settle(host) { if (host === this.controls) this.scroll(); }

  /** Type a line out letter by letter. A tap finishes the line at once. */
  async type(line, cls = '') {
    const p = el('p', cls);
    p.dataset.raw = line;
    this.text.appendChild(p);
    this.skip = false;
    const span = el('span');
    const cur = el('span', 'cursor', '█');
    p.append(span, cur);
    for (let i = 0; i < line.length; i++) {
      if (this.skip) break;
      span.textContent = line.slice(0, i + 1);
      if (i % 3 === 0) this.scroll();
      const ch = line[i];
      await sleep(ch === '.' || ch === '!' || ch === '?' ? this.speed * 6 : ch === ',' ? this.speed * 3 : this.speed);
    }
    p.innerHTML = highlight(line);
    this.scroll();
    if (cls !== 'echo') this.unread = true;
    await sleep(this.skip ? 60 : 180);
  }

  /** @param {{ quest?: string, time?: string, clues?: string }} s  ready-made labels */
  setStatus({ quest, time, clues }) {
    $('#st-quest').textContent = quest || '';
    $('#st-time').textContent = time || '';
    $('#st-clues').textContent = clues || '';
    $('#card-book').textContent = clues || '';
  }

  clearControls(host = this.controls) { host.innerHTML = ''; host.className = ''; }

  prompt(label) {
    const d = el('div', 'prompt');
    d.append(el('span', '', label), el('span', 'cursor blink', '█'));
    return d;
  }

  /**
   * Numbered keycap choices, like Oregon Trail. Resolves with the index.
   * With `paged`, more than three choices show three at a time behind a
   * MORE key, so the story text keeps its room.
   * @param {string[]} labels
   * @param {{prompt?: string, colors?: (string|undefined)[], paged?: boolean, host?: HTMLElement}} [opts]
   */
  choose(labels, opts = {}) {
    const host = opts.host || this.controls;
    const size = opts.paged && labels.length > PAGE ? PAGE : labels.length;
    return new Promise((resolve) => {
      const show = (first) => {
        this.clearControls(host);
        host.className = 'choices';
        host.appendChild(this.prompt(opts.prompt || 'WHAT WILL YOU DO?'));
        labels.slice(first, first + size).forEach((label, k) => {
          const i = first + k;
          const b = el('button', 'key');
          const color = opts.colors && opts.colors[i];
          if (color) {
            b.classList.add('door');
            b.style.setProperty('--door', color);
          }
          b.append(el('span', 'num', String(i + 1)), el('span', 'lbl', label));
          b.addEventListener('click', () => { this.unread = false; this.clearControls(host); resolve(i); }, { once: true });
          host.appendChild(b);
        });
        if (size < labels.length) {
          const more = el('button', 'key wide more', first + size < labels.length ? 'MORE...' : 'BACK TO THE FIRST ONES');
          more.addEventListener('click', () => show(first + size < labels.length ? first + size : 0), { once: true });
          host.appendChild(more);
        }
        this.settle(host);
      };
      show(0);
    });
  }

  /** Big retro number pad. Resolves with a whole number. */
  numpad(label = 'TYPE YOUR ANSWER', host = this.controls) {
    return new Promise((resolve) => {
      this.clearControls(host);
      host.className = 'numpad';
      host.appendChild(this.prompt(label));
      const display = el('div', 'display', '_');
      host.appendChild(display);
      const grid = el('div', 'grid');
      let val = '';
      const show = () => { display.textContent = val || '_'; };
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', 'OK'];
      for (const k of keys) {
        const b = el('button', 'key' + (k === 'OK' ? ' ok' : k === 'DEL' ? ' del' : ''), k);
        b.addEventListener('click', () => {
          if (k === 'DEL') val = val.slice(0, -1);
          else if (k === 'OK') { if (!val) return; this.unread = false; this.clearControls(host); resolve(Number(val)); return; }
          else if (val.length < 4) val = (val === '0' ? '' : val) + k;
          show();
        });
        grid.appendChild(b);
      }
      host.appendChild(grid);
      this.settle(host);
    });
  }

  // -------------------------------------------------------------------------
  // The puzzle card. It rises over the text and most of the picture. The
  // question is pinned at the top, a hint appears under it after a miss, and
  // the answer keys fill the rest. These methods are the `card` a puzzle plays on.

  /** @param {{ question: string }} pz */
  async cardOpen(pz) {
    this.clearControls();
    this.cardQ.innerHTML = highlight(pz.question);
    this.cardHint.textContent = '';
    this.clearControls(this.cardKeys);
    this.root.classList.add('puzzling');
    await sleep(320);
  }

  cardNumpad(prompt) { return this.numpad(prompt, this.cardKeys); }

  /** @param {{ label: string, color?: string }[]} options */
  cardPick(options, prompt) {
    return this.choose(options.map((o) => o.label), { prompt, colors: options.map((o) => o.color), host: this.cardKeys });
  }

  cardHintText(text) { this.cardHint.innerHTML = highlight(text); }

  /** After a second miss: show the answer on the card and wait for a tap. */
  async cardReveal(text) {
    this.cardHint.innerHTML = highlight(text);
    await this.waitTap('OK', '', this.cardKeys);
  }

  async cardClose() {
    this.root.classList.remove('puzzling');
    await sleep(320);
    this.cardQ.textContent = '';
    this.cardHint.textContent = '';
    this.clearControls(this.cardKeys);
  }

  /** Letter grid like an old console name screen. */
  letters(label, max = 10, initial = '') {
    return new Promise((resolve) => {
      this.clearControls();
      this.controls.className = 'letters';
      this.controls.appendChild(this.prompt(label));
      const display = el('div', 'display');
      this.controls.appendChild(display);
      let val = initial.toUpperCase().slice(0, max);
      const show = () => { display.textContent = (val + '_'.repeat(max - val.length)).slice(0, max); };
      show();
      const grid = el('div', 'grid');
      for (const k of [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'DEL', 'OK']) {
        const b = el('button', 'key' + (k === 'OK' ? ' ok' : k === 'DEL' ? ' del' : ''), k);
        b.addEventListener('click', () => {
          if (k === 'DEL') val = val.slice(0, -1);
          else if (k === 'OK') { if (!val) return; this.unread = false; this.clearControls(); resolve(val); return; }
          else if (val.length < max) val += k;
          show();
        });
        grid.appendChild(b);
      }
      this.controls.appendChild(grid);
    });
  }

  /** One big button; waits as long as the player needs. */
  waitTap(label = 'CONTINUE', prompt = '', host = this.controls) {
    return new Promise((resolve) => {
      this.clearControls(host);
      host.className = 'choices';
      if (prompt) host.appendChild(this.prompt(prompt));
      const b = el('button', 'key wide', label);
      b.addEventListener('click', () => { this.unread = false; this.clearControls(host); resolve(undefined); }, { once: true });
      host.appendChild(b);
      this.settle(host);
    });
  }

  /**
   * Before the text is wiped (a new scene, a disk swap), let a young reader
   * finish. Skipped when they have already tapped since the last line.
   */
  async waitIfUnread(label = 'CONTINUE') {
    if (this.unread) await this.waitTap(label, "WHEN YOU'RE READY...");
  }

  // -------------------------------------------------------------------------
  // Overlays

  hideOverlay() { this.overlay.className = ''; this.overlay.innerHTML = ''; }

  /** Fake BIOS memory check, then LOADING... while `work` finishes. */
  async boot(studio, work) {
    this.overlay.className = 'show boot';
    const pre = el('pre');
    this.overlay.appendChild(pre);
    const line = async (s, ms = 120) => { pre.textContent += s + '\n'; await sleep(ms); };
    await line(`MUDD BIOS v1.0  (C) 1992 ${studio}`, 300);
    await line('VGA 256-COLOR ADAPTER .......... OK', 200);
    const mem = el('span');
    pre.appendChild(mem);
    for (let k = 0; k <= 640; k += 32) { mem.textContent = `MEMORY TEST: ${String(k).padStart(3, ' ')}K`; await sleep(28); }
    mem.textContent = 'MEMORY TEST: 640K OK\n';
    await line('FM SYNTH (ADLIB COMPATIBLE) .... OK', 160);
    await line('DRIVE A: 3.5" 1.44MB ........... OK', 220);
    await line('');
    pre.appendChild(el('span', '', 'LOADING'));
    const dots = el('span');
    pre.appendChild(dots);
    let done = false, err = null;
    const p = work().then(() => { done = true; }, (e) => { err = e; done = true; });
    for (let i = 0; !done || i < 6; i++) { dots.textContent = '.'.repeat((i % 3) + 1) + '  '; await sleep(220); }
    await p;
    if (err) throw err;
  }

  /** Studio card, then the title picture. Resolves on the first tap. */
  async title(studio, name, pic, version = '') {
    this.overlay.className = 'show title';
    this.overlay.innerHTML = '';
    const card = el('div', 'studio', `${studio}\nPRESENTS`);
    this.overlay.appendChild(card);
    await sleep(1600);
    this.overlay.innerHTML = '';
    const c = /** @type {HTMLCanvasElement} */ (el('canvas', 'titlepic'));
    c.width = 320; c.height = 200;
    if (this.pictures && pic) this.pictures.draw(c, pic);
    const t = el('div', 'titletext', name);
    const tap = el('div', 'tap blink', 'TAP TO START');
    this.overlay.append(c, t, tap);
    if (version) this.overlay.appendChild(el('div', 'version', version));
    await new Promise((r) => this.overlay.addEventListener('click', r, { once: true }));
    tap.remove();
  }

  /** A menu drawn over the title picture. */
  titleMenu(items) {
    return new Promise((resolve) => {
      const box = el('div', 'menu');
      items.forEach((label, i) => {
        const b = el('button', 'key', '');
        b.append(el('span', 'num', String(i + 1)), el('span', 'lbl', label));
        b.addEventListener('click', (e) => { e.stopPropagation(); box.remove(); resolve(i); }, { once: true });
        box.appendChild(b);
      });
      this.overlay.appendChild(box);
    });
  }

  /** PLEASE INSERT DISK n OF 4, with a blinking drive light. */
  async disk(n, total = 4) {
    this.overlay.className = 'show disk';
    this.overlay.innerHTML = '';
    const box = el('div', 'diskbox');
    box.append(el('div', 'drive', ''), el('div', '', `PLEASE INSERT DISK ${n} OF ${total}`), el('div', 'dim blink', 'READING...'));
    this.overlay.appendChild(box);
    await sleep(2300);
    this.hideOverlay();
  }

  /**
   * A full-screen page with a close button (Field Guide, casebook, grown-up
   * screen). `build` fills it and may call done(value) to close it itself.
   * With back: '' there is no close button, so the page must call done.
   * @param {string} title
   * @param {(body: HTMLElement, el: typeof import('./screen.js').el, done: (value?: any) => void) => void} build
   * @param {{ back?: string }} [opts]
   */
  page(title, build, opts = {}) {
    return new Promise((resolve) => {
      const prevClass = this.overlay.className;
      const prevNodes = [...this.overlay.childNodes];
      this.overlay.className = 'show page';
      this.overlay.innerHTML = '';
      const box = el('div', 'pagebox');
      box.appendChild(el('h2', '', title));
      const body = el('div', 'pagebody');
      let open = true;
      const done = (value) => {
        if (!open) return;
        open = false;
        this.overlay.innerHTML = '';
        this.overlay.append(...prevNodes);
        this.overlay.className = prevClass;
        resolve(value);
      };
      build(body, el, done);
      box.appendChild(body);
      const back = opts.back === undefined ? 'BACK' : opts.back;
      if (back) {
        const close = el('button', 'key wide', back);
        close.addEventListener('click', (e) => { e.stopPropagation(); done(undefined); }, { once: true });
        box.appendChild(close);
      }
      this.overlay.appendChild(box);
    });
  }

  // -------------------------------------------------------------------------
  // The map, the casebook, and the lineup

  /**
   * The map: the pack's map picture with a numbered flag on each place on
   * offer. Resolves with the index of the place picked.
   * @param {import('./quest.js').MapView} view
   */
  async map(view) {
    this.clearText();
    this.picOverlay = (ctx, frame) => drawMarkers(ctx, view, frame);
    this.showPic(view.pic);
    let pick = 0;
    if (view.offers.length === 1) await this.waitTap(view.labels[0], view.prompt);
    else pick = await this.choose(view.labels, { prompt: view.prompt });
    this.picOverlay = null;
    this.showPic(view.pic);
    return pick;
  }

  /**
   * Fill a page with the casebook: clues, lock numbers, stars, and the lineup.
   * Tapping a creature crosses it out. With `pick`, each creature also gets a
   * key that names it (the case file).
   * @param {HTMLElement} body
   * @param {import('./quest.js').BookView} view
   * @param {{ words: Record<string, string>, toggle: (id: string) => boolean, pick?: (id: string) => void }} opts
   */
  bookBody(body, view, { words, toggle, pick }) {
    const row = (label, cls = '') => { const r = el('div', 'bookrow ' + cls); r.appendChild(el('span', 'booklabel', label)); body.appendChild(r); return r; };
    const clues = row(words.clues);
    for (let i = 0; i < view.cluesTotal; i++) {
      const c = view.clues[i];
      clues.appendChild(el('span', c ? 'chip on' : 'chip', c ? c.label : '? ? ?'));
    }
    if (view.sign) body.appendChild(el('p', 'good', view.sign));
    if (!pick) {
      const lock = row(words.lock);
      for (const d of view.digits) lock.appendChild(el('span', d === null ? 'digit' : 'digit on', d === null ? '_' : String(d)));
      const played = view.places.filter((p) => p.tries > 0);
      if (played.length) {
        const stars = row(words.stars, 'wrap');
        for (const p of played) stars.appendChild(el('span', 'starline', `${p.name} ${'★'.repeat(p.stars)}${'☆'.repeat(Math.max(0, p.tries - p.stars))}`));
      }
    }
    body.appendChild(el('p', 'dim', pick ? words.case_hint : words.book_hint));
    const grid = el('div', 'lineup');
    for (const c of view.lineup) {
      const card = el('div', 'dcard' + (c.crossed ? ' crossed' : '') + (c.wrong ? ' wrong' : ''));
      const face = /** @type {HTMLCanvasElement} */ (el('canvas'));
      if (this.pictures) this.pictures.portrait(face, c.sprite);
      card.append(face, el('h3', '', c.name));
      for (const t of c.traits) {
        const known = view.clues.some((k) => k.title === t.title);
        card.appendChild(el('span', known ? 'chip seen' : 'chip', t.label));
      }
      if (c.wrong) card.appendChild(el('div', 'stamp', words.case_not));
      else {
        card.addEventListener('click', () => { card.classList.toggle('crossed', toggle(c.id)); });
        if (pick) {
          const b = el('button', 'key wide', words.case_pick);
          b.addEventListener('click', (e) => { e.stopPropagation(); pick(c.id); }, { once: true });
          card.appendChild(b);
        }
      }
      grid.appendChild(card);
    }
    body.appendChild(grid);
  }

  // -------------------------------------------------------------------------
  // Lair toys: small things to do with a picture. Nothing is scored.

  /**
   * @param {Record<string, any>} toy  from a lair card's toys:, with its words filled in
   * @param {(name: string) => void} cue
   */
  async toy(toy, cue) {
    if (toy.pic) this.showPic(toy.pic);
    if (toy.kind === 'spot') await this.toySpot(toy, cue);
    else if (toy.kind === 'taps') await this.toyTaps(toy, cue);
    this.clearControls();
  }

  /** Find something in the picture and tap it. After two misses a frame blinks around it. */
  toySpot(toy, cue) {
    const [x, y, w, h] = toy.at;
    return new Promise((resolve) => {
      let misses = 0;
      const say = (text) => {
        this.clearControls();
        this.controls.className = 'choices';
        this.controls.appendChild(this.prompt(text));
        this.settle(this.controls);
      };
      say(toy.prompt || 'TAP IT!');
      const onTap = (e) => {
        const r = this.pic.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * 320, py = ((e.clientY - r.top) / r.height) * 200;
        const pad = 6; // small fingers
        if (px >= x - pad && px <= x + w + pad && py >= y - pad && py <= y + h + pad) {
          this.pic.removeEventListener('pointerdown', onTap);
          this.picOverlay = null;
          cue('find');
          resolve(undefined);
          return;
        }
        cue('miss');
        if (toy.miss) say(toy.miss);
        if (++misses === 2) {
          this.setOverlay((ctx, frame) => {
            if (frame % 2) return;
            ctx.strokeStyle = '#ffd75a'; ctx.lineWidth = 2;
            ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
          });
        }
      };
      this.pic.addEventListener('pointerdown', onTap);
    });
  }

  /**
   * Watch and count, then tap that many times. The picture is told pose 1
   * (down) and pose 0 (up). A third round counts out loud and takes any answer.
   */
  async toyTaps(toy, cue) {
    const pose = async (ms) => {
      this.picT.pose = 1; this.redraw(); cue(toy.cue || 'find');
      await sleep(ms);
      this.picT.pose = 0; this.redraw();
      await sleep(ms);
    };
    const say = (text) => {
      this.clearControls();
      this.controls.className = 'choices';
      this.controls.appendChild(this.prompt(text));
      this.settle(this.controls);
    };
    for (let round = 1; ; round++) {
      say(toy.watch || 'WATCH AND COUNT...');
      await sleep(900);
      for (let i = 0; i < toy.n; i++) {
        if (round >= 3) say(String(i + 1));
        await pose(380);
      }
      const count = await new Promise((resolve) => {
        this.clearControls();
        this.controls.className = 'choices';
        this.controls.appendChild(this.prompt(toy.turn || 'YOUR TURN!'));
        let n = 0, busy = false;
        const tap = el('button', 'key wide', toy.key || 'TAP');
        tap.addEventListener('click', async () => {
          n++;
          if (busy) return;
          busy = true; await pose(120); busy = false;
        });
        const ok = el('button', 'key wide ok', toy.done || 'DONE');
        ok.addEventListener('click', () => { if (n) resolve(n); });
        this.controls.append(tap, ok);
        this.settle(this.controls);
      });
      if (count === toy.n || round >= 3) return;
      cue('miss');
      say(toy.again || 'NOT THE SAME. WATCH AGAIN...');
      await sleep(1400);
    }
  }

  /** Brief SAVING TO DISK... light in the corner. */
  flashSave() {
    const s = $('#saving');
    s.classList.add('on');
    clearTimeout(this._saveT);
    this._saveT = setTimeout(() => s.classList.remove('on'), 900);
  }

  error(msg) {
    this.overlay.className = 'show boot';
    this.overlay.innerHTML = '';
    const pre = el('pre', 'err');
    pre.textContent = `GENERAL FAILURE READING DRIVE A\n\n${msg}\n\nFix the file, push, and reload.`;
    this.overlay.appendChild(pre);
  }
}
