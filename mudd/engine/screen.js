// @ts-check
// Everything on screen: picture window, typed text, keycap choices, the
// puzzle card with its number pad and its boards, the map, the casebook and
// lineup, lair toys, and full-screen overlays. Touch only.

import { sleep, fill } from './util.js';

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
    this.cardBoard = $('#card-board');
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

  /** Make the CASEBOOK buttons pulse (something new is in it), or stop. Opening it stops them. */
  nudgeBook(on) {
    for (const id of ['#st-clues', '#card-book']) $(id)?.classList.toggle('nudge', !!on);
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
   * @param {{prompt?: string, colors?: (string|undefined)[], sizes?: (string|undefined)[], paged?: boolean, host?: HTMLElement}} [opts]
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
          const size = opts.sizes && opts.sizes[i];
          if (size) { b.classList.add(size); host.classList.add('sized'); }
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

  /**
   * Big retro number pad. Resolves with a whole number. With format 'clock'
   * the display reads like a clock, so 325 shows as 3:25.
   */
  numpad(label = 'TYPE YOUR ANSWER', host = this.controls, format = '') {
    return new Promise((resolve) => {
      this.clearControls(host);
      host.className = 'numpad';
      host.appendChild(this.prompt(label));
      const display = el('div', 'display', '_');
      host.appendChild(display);
      const grid = el('div', 'grid');
      let val = '';
      const asClock = () => (val.length < 3 ? `_:${val.padStart(2, '_')}` : `${val.slice(0, -2)}:${val.slice(-2)}`);
      const show = () => { display.textContent = format === 'clock' ? asClock() : val || '_'; };
      show();
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
    this.cardBoard.innerHTML = '';
    this.clearControls(this.cardKeys);
    this.root.classList.add('puzzling');
    await sleep(320);
  }

  cardNumpad(prompt, format = '') { return this.numpad(prompt, this.cardKeys, format); }

  /** @param {{ label: string, color?: string, size?: string }[]} options */
  cardPick(options, prompt) {
    return this.choose(options.map((o) => o.label), { prompt, colors: options.map((o) => o.color), sizes: options.map((o) => o.size), host: this.cardKeys });
  }

  cardHintText(text) { this.cardHint.innerHTML = highlight(text); }

  /**
   * Offer a treat: a small key under the question. Tapping it calls spend(),
   * which takes the treat and returns the hint it bought, and the hint
   * takes the key's place.
   */
  cardTreat(label, spend) {
    const host = this.cardHint;
    host.innerHTML = '';
    if (!label) return;
    const b = el('button', 'treat', label);
    b.addEventListener('click', () => { host.innerHTML = highlight(spend()); });
    host.appendChild(b);
  }

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
    this.cardBoard.innerHTML = '';
    this.clearControls(this.cardKeys);
  }

  // -------------------------------------------------------------------------
  // Boards: puzzles answered by tapping squares drawn inside the card, between
  // the question and the keys. A board is plain data from puzzles.js.

  /** One of the pack's small pictures, to put in a square. */
  icon(name) {
    const s = el('span', 'ico');
    const url = this.pictures && name ? this.pictures.iconUrl(name) : '';
    if (url) s.style.backgroundImage = `url(${url})`;
    return s;
  }

  /**
   * Draw a board showing `start` (an answer, or nothing yet). With `set`, the
   * squares can be tapped, and set(answer) is called on every change: null
   * while there is nothing to check. Without it the board is only a picture.
   * @param {Record<string, any>} board
   * @param {any} start
   * @param {((answer: any) => void) | null} set
   */
  drawBoard(board, start, set) {
    const host = this.cardBoard;
    host.innerHTML = '';
    const tag = set ? 'button' : 'span';
    const grid = el('div', `board ${board.kind}`);
    const cap = el('div', 'boardcap');

    if (board.kind === 'toggle') {
      // Tap a square to pick it; tap again to put it back.
      grid.style.gridTemplateColumns = `repeat(${board.cols}, 1fr)`;
      const on = new Set(Array.isArray(start) ? start : []);
      const answer = () => (on.size ? [...on].sort((a, b) => a - b) : null);
      board.cells.forEach((c, i) => {
        const b = el(tag, 'cell' + (on.has(i) ? ' on' : ''), c.label);
        if (set) b.addEventListener('click', () => {
          if (on.has(i)) on.delete(i); else on.add(i);
          b.classList.toggle('on', on.has(i));
          set(answer());
        });
        grid.appendChild(b);
      });
      host.append(grid);
      if (set) set(answer());
    } else if (board.kind === 'array') {
      // Tap a square, and the crate fills from the top-left corner down to it.
      grid.style.gridTemplateColumns = `repeat(${board.cols}, 1fr)`;
      let sel = Array.isArray(start) ? start : [0, 0];
      const cells = [];
      const paint = () => {
        for (const c of cells) c.b.classList.toggle('on', c.r < sel[0] && c.c < sel[1]);
        const words = board.captions || {};
        cap.textContent = !sel[0] ? words.none || '' : fill(sel[0] === 1 ? words.one || '' : words.many || '', { rows: String(sel[0]), cols: String(sel[1]) });
      };
      for (let r = 0; r < board.rows; r++) for (let c = 0; c < board.cols; c++) {
        const b = el(tag, 'cell');
        b.appendChild(this.icon(board.icon));
        if (set) b.addEventListener('click', () => { sel = [r + 1, c + 1]; paint(); set(sel); });
        cells.push({ b, r, c });
        grid.appendChild(b);
      }
      paint();
      host.append(grid, cap);
      if (set) set(sel[0] ? sel : null);
    } else if (board.kind === 'graph') {
      // A picture graph. The open row fills up to the square he taps.
      grid.style.gridTemplateColumns = `auto repeat(${board.slots}, 1fr)`;
      for (const row of board.rows) {
        const open = !!row.open;
        let n = open ? Number(start) || 0 : row.count;
        grid.appendChild(el('span', 'glabel' + (open ? ' open' : ''), row.label));
        const slots = [];
        const paint = () => slots.forEach((b, k) => b.classList.toggle('on', k < n));
        for (let k = 0; k < board.slots; k++) {
          const b = el(open ? tag : 'span', 'slot' + (open ? ' open' : ''));
          b.appendChild(this.icon(board.icon));
          if (open && set) b.addEventListener('click', () => { n = n === k + 1 ? k : k + 1; paint(); set(n || null); });
          slots.push(b);
          grid.appendChild(b);
        }
        paint();
        if (open && set) set(n || null);
      }
      cap.textContent = board.key || '';
      host.append(grid, cap);
    } else if (board.kind === 'table') {
      // A small table with a row for each choice. Tap a row to pick it.
      const head = el('div', 'trow thead');
      for (const h of board.head || []) head.appendChild(el('span', '', h));
      grid.appendChild(head);
      let sel = Number.isInteger(start) ? start : -1;
      const rows = board.rows.map((row, i) => {
        const b = el(tag, 'trow cell');
        for (const c of row.cells) {
          const s = el('span', 'tcell');
          if (c.icon) s.appendChild(this.icon(c.icon));
          s.appendChild(el('span', '', c.label));
          b.appendChild(s);
        }
        if (set) b.addEventListener('click', () => { sel = i; paint(); set(sel); });
        grid.appendChild(b);
        return b;
      });
      const paint = () => rows.forEach((b, i) => b.classList.toggle('on', i === sel));
      paint();
      host.append(grid);
      if (set) set(sel >= 0 ? sel : null);
    } else if (board.kind === 'order') {
      // Tiles to put in order. Tap them first to last; each takes its number
      // and moves into line. Tap a numbered tile to take it back, along with
      // every tile after it.
      grid.style.gridTemplateColumns = `repeat(${board.cols || 2}, 1fr)`;
      let seq = Array.isArray(start) ? start.slice() : [];
      const answer = () => (seq.length === board.tiles.length ? seq.slice() : null);
      const tiles = board.tiles.map((t, i) => {
        const b = el(tag, 'cell tile');
        const n = el('span', 'tnum');
        if (t.icon) b.appendChild(this.icon(t.icon));
        b.append(el('span', 'tlabel', t.label), n);
        if (set) b.addEventListener('click', () => {
          const at = seq.indexOf(i);
          if (at >= 0) seq = seq.slice(0, at); else seq.push(i);
          paint();
          set(answer());
        });
        grid.appendChild(b);
        return { b, n };
      });
      const paint = () => tiles.forEach((t, i) => {
        const at = seq.indexOf(i);
        t.b.classList.toggle('on', at >= 0);
        t.n.textContent = at >= 0 ? String(at + 1) : '';
        t.b.style.order = String(at >= 0 ? at : 100 + i);
      });
      paint();
      host.append(grid);
      if (set) set(answer());
    } else if (board.kind === 'path') {
      this.paintPath(board, Array.isArray(start) ? start : [], grid, cap);
      host.append(grid, cap);
    }
    host.classList.toggle('solved', !set);
  }

  /**
   * Paint a path board: the map, how far the plan gets, and the plan itself
   * as a row of arrows under the map.
   * @param {Record<string, any>} board
   * @param {number[]} moves
   */
  paintPath(board, moves, grid, cap) {
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${board.cols}, 1fr)`;
    const wall = (cx, cy) => board.walls.some((w) => w[0] === cx && w[1] === cy);
    let [x, y] = board.start;
    let bump = null;
    const been = new Set([`${x},${y}`]);
    for (const m of moves) {
      const mv = board.moves[m];
      const nx = x + mv.dx, ny = y + mv.dy;
      if (nx < 0 || ny < 0 || nx >= board.cols || ny >= board.rows) { bump = [x, y]; break; }
      if (wall(nx, ny)) { bump = [nx, ny]; break; }
      x = nx; y = ny;
      been.add(`${x},${y}`);
    }
    for (let r = 0; r < board.rows; r++) for (let c = 0; c < board.cols; c++) {
      const cell = el('span', 'cell');
      const here = c === x && r === y, goal = c === board.goal[0] && r === board.goal[1];
      if (wall(c, r)) { cell.classList.add('wall'); cell.appendChild(this.icon(board.icons.wall)); }
      else if (here) { cell.classList.add('who'); cell.appendChild(this.icon(board.icons.who)); }
      else if (goal) cell.appendChild(this.icon(board.icons.goal));
      else if (been.has(`${c},${r}`)) cell.classList.add('trail');
      if (goal) cell.classList.add('goal');
      if (bump && bump[0] === c && bump[1] === r) cell.classList.add('bump');
      grid.appendChild(cell);
    }
    this.paintPlan(board, moves, cap);
    return !!bump;
  }

  /** The plan as a row of arrows, with a dot for each step there is still room for. */
  paintPlan(board, moves, cap) {
    cap.className = 'boardcap plan';
    cap.innerHTML = '';
    for (let i = 0; i < board.max; i++) cap.appendChild(el('span', i < moves.length ? 'step' : 'step empty', i < moves.length ? board.moves[moves[i]].arrow : '·'));
  }

  /**
   * Play a board: he taps squares, then the DONE key. Resolves with his
   * answer. `last` is his answer from the try before, to start from.
   */
  cardGrid(board, prompt, last) {
    return new Promise((resolve) => {
      const keys = this.cardKeys;
      this.clearControls(keys);
      keys.className = 'choices';
      keys.appendChild(this.prompt(prompt));
      const ok = el('button', 'key wide ok', board.done || 'DONE');
      keys.appendChild(ok);
      let answer = null;
      this.drawBoard(board, last, (a) => { answer = a; ok.classList.toggle('off', a === null); });
      ok.addEventListener('click', () => {
        if (answer === null) return;
        this.unread = false;
        this.clearControls(keys);
        resolve(answer);
      });
    });
  }

  /**
   * Play an order board. Tiles are tapped into order on the board itself. A
   * path is planned with four arrow keys, UNDO, and GO. With board.preview
   * the map shows where the plan leads as it grows; without it, nothing
   * moves until GO, and then the plan is walked one step at a time. `last`
   * is the part of an earlier try that worked, and it stays walked.
   * Resolves with his answer.
   */
  cardOrder(board, prompt, last) {
    if (board.kind !== 'path') return this.cardGrid(board, prompt, last);
    return new Promise((resolve) => {
      const keys = this.cardKeys, host = this.cardBoard;
      this.clearControls(keys);
      keys.className = 'choices';
      keys.appendChild(this.prompt(prompt));
      host.innerHTML = '';
      host.classList.remove('solved');
      const grid = el('div', 'board path'), cap = el('div', 'boardcap plan');
      host.append(grid, cap);
      const moves = Array.isArray(last) ? last.slice() : [];
      let walked = moves.length, busy = false;   // steps already known to work
      const arrows = el('div', 'arrowkeys');
      const undo = el('button', 'key wide del', board.undo || 'UNDO');
      const go = el('button', 'key wide ok', board.done || 'GO!');
      const paint = () => {
        walked = Math.min(walked, moves.length);
        this.paintPath(board, board.preview ? moves : moves.slice(0, walked), grid, cap);
        this.paintPlan(board, moves, cap);
        undo.classList.toggle('off', !moves.length);
        go.classList.toggle('off', !moves.length);
      };
      board.moves.forEach((m, i) => {
        const b = el('button', 'key arrow');
        b.append(el('span', 'arr', m.arrow), el('span', 'lbl', m.label));
        if (m.sub) b.appendChild(el('span', 'sub', m.sub));
        b.addEventListener('click', () => { if (!busy && moves.length < board.max) { moves.push(i); paint(); } });
        arrows.appendChild(b);
      });
      undo.addEventListener('click', () => { if (!busy) { moves.pop(); paint(); } });
      go.addEventListener('click', async () => {
        if (busy || !moves.length) return;
        busy = true;
        this.unread = false;
        // Walk the plan, one step at a time, up to the first bump.
        for (let n = Math.min(walked, moves.length) + 1; n <= moves.length; n++) {
          const bumped = this.paintPath(board, moves.slice(0, n), grid, cap);
          this.paintPlan(board, moves, cap);
          await sleep(bumped ? 500 : 260);
          if (bumped) break;
        }
        this.clearControls(keys);
        resolve(moves);
      });
      const row = el('div', 'keyrow');
      row.append(undo, go);
      const all = el('div', 'pathkeys');     // sideways, the six keys share one row
      all.append(arrows, row);
      keys.appendChild(all);
      paint();
    });
  }

  /** After a second miss: show the right answer on the board. */
  cardSolve(board, solution) { this.drawBoard(board, solution, null); }

  /**
   * A matching game: cards face down, two turned over at a time. A pair that
   * matches stays up. From the second miss on, a hint says what the word
   * means. Past maxMisses every card is turned over. Resolves with how it
   * went: { done, misses }.
   * @param {Record<string, any>} board
   * @param {{ starMisses: number, maxMisses: number }} opts
   * @param {(name: string) => void} cue
   */
  cardPairs(board, prompt, opts, cue) {
    return new Promise((resolve) => {
      const host = this.cardBoard;
      host.innerHTML = '';
      host.classList.remove('solved');
      this.clearControls(this.cardKeys);
      this.cardKeys.className = 'choices';
      this.cardKeys.appendChild(this.prompt(prompt));
      const grid = el('div', 'board pairs');
      grid.style.gridTemplateColumns = `repeat(${board.cols}, 1fr)`;
      const cards = board.cards.map((c) => {
        const b = el('button', 'cell flip');
        const face = el('span', 'face');
        if (c.icon) face.appendChild(this.icon(c.icon));
        else {
          face.appendChild(el('span', 'word', c.label));
          if (c.sub) face.appendChild(el('span', 'sub', c.sub));
        }
        b.appendChild(face);
        grid.appendChild(b);
        return { ...c, b, up: false };
      });
      host.appendChild(grid);
      const turn = (card, up) => { card.up = up; card.b.classList.toggle('up', up); };
      let first = null, busy = false, misses = 0, left = cards.length / 2;
      for (const card of cards) card.b.addEventListener('click', async () => {
        if (busy || card.up) return;
        turn(card, true);
        if (!first) { first = card; return; }
        const other = first;
        first = null;
        if (other.pair === card.pair) {
          other.b.classList.add('done'); card.b.classList.add('done');
          cue('find');
          if (--left === 0) { this.unread = false; await sleep(700); resolve({ done: true, misses }); }
          return;
        }
        misses++;
        busy = true;
        if (misses >= 2) {
          const word = !!other.label !== !!card.label ? (other.label ? other : card) : null;
          this.cardHintText(word ? word.hint : board.same || '');
        }
        const over = opts.maxMisses > 0 && misses >= opts.maxMisses;
        await sleep(over ? 900 : 1500);
        if (over) {
          for (const c of cards) { turn(c, true); c.b.classList.add('done'); }
          resolve({ done: false, misses });
          return;
        }
        turn(other, false); turn(card, false);
        busy = false;
      });
    });
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
      if (view.treats && view.treats.total) {
        const treats = row(words.treats);
        for (let i = 0; i < view.treats.total; i++) treats.appendChild(el('span', i < view.treats.left ? 'digit on' : 'digit', i < view.treats.left ? '●' : '·'));
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
        const cls = known ? 'chip seen' : 'chip';
        if (!t.es) { card.appendChild(el('span', cls, t.label)); continue; }
        // Spanish dragon cards: level 1 shows the English small underneath.
        const chip = el('span', cls + (view.guide === 1 ? ' two' : ''));
        chip.appendChild(el('b', '', t.es));
        if (view.guide === 1) chip.appendChild(el('small', '', t.label));
        card.appendChild(chip);
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
    else if (toy.kind === 'pulse') await this.toyPulse(toy, cue);
    else if (toy.kind === 'song') await this.toySong(toy, cue);
    else if (toy.kind === 'rub') await this.toyRub(toy, cue);
    this.clearControls();
  }

  /**
   * Rub the picture. Every touch on it, and every bit of a finger dragged
   * across it, leaves a mark: the picture is told rubs, a list of
   * [x, y, frame], and can draw them as it likes. Something is hidden in the box at:,
   * which is cut into count: strips side by side. The picture is told which
   * strips have been touched (lit) and how many (pose), and it is found when
   * all of them have. After five touches that find nothing new, the picture
   * is told hint, so it can show where to look.
   */
  toyRub(toy, cue) {
    const [x, y, w, h] = toy.at;
    const need = Number(toy.count) || 4;
    return new Promise((resolve) => {
      const lit = new Set();
      const rubs = [];
      let cold = 0, down = false, lastAt = 0, over = false;
      Object.assign(this.picT, { rubs, lit: [], pose: 0, hint: false, at: toy.at, count: need });
      const say = (text) => {
        this.clearControls();
        this.controls.className = 'choices';
        this.controls.appendChild(this.prompt(text));
        this.settle(this.controls);
      };
      say(toy.prompt || 'RUB IT!');
      const keepTouch = this.pic.style.touchAction;
      this.pic.style.touchAction = 'none';     // a dragged finger rubs; it doesn't scroll the page
      const touch = (e, fresh) => {
        if (over) return;
        const r = this.pic.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * 320, py = ((e.clientY - r.top) / r.height) * 200;
        rubs.push([Math.round(px), Math.round(py), this.picT.frame]);
        if (rubs.length > 90) rubs.shift();
        const pad = 6; // small fingers
        const strip = Math.max(0, Math.min(need - 1, Math.floor((px - x) / (w / need))));
        if (px >= x - pad && px <= x + w + pad && py >= y - pad && py <= y + h + pad && !lit.has(strip)) {
          lit.add(strip);
          cold = 0;
          Object.assign(this.picT, { lit: [...lit], pose: lit.size, hint: false });
          cue(toy.cue || 'find');
          if (lit.size >= need) {
            over = true;
            this.redraw();
            window.setTimeout(done, 1200);       // a moment to see all of it
            return;
          }
          if (toy.more) say(toy.more);
        } else if (fresh && ++cold >= 5) {
          this.picT.hint = true;
          if (toy.miss) say(toy.miss);
        }
        this.redraw();
      };
      const onDown = (e) => { down = true; touch(e, true); };
      const onMove = (e) => {
        if (!down || e.timeStamp - lastAt < 50) return;
        lastAt = e.timeStamp;
        touch(e, false);
      };
      const onUp = () => { down = false; };
      const done = () => {
        this.pic.removeEventListener('pointerdown', onDown);
        this.pic.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        this.pic.style.touchAction = keepTouch;
        resolve(undefined);
      };
      this.pic.addEventListener('pointerdown', onDown);
      this.pic.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    });
  }

  /**
   * Find something in the picture and tap it. After two misses a frame blinks
   * around it. With count: it takes that many taps, and the picture is told
   * pose (taps so far), so it can change a little each time.
   */
  toySpot(toy, cue) {
    const [x, y, w, h] = toy.at;
    const need = Number(toy.count) || 1;
    return new Promise((resolve) => {
      let misses = 0, hits = 0;
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
          hits++;
          misses = 0;
          this.picOverlay = null;
          cue('find');
          if (hits >= need) {
            this.pic.removeEventListener('pointerdown', onTap);
            resolve(undefined);
            return;
          }
          this.picT.pose = hits;
          this.redraw();
          if (toy.more) say(toy.more);
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
          this.picT.pose = hits; // a new overlay starts the picture over
          this.redraw();
        }
      };
      this.pic.addEventListener('pointerdown', onTap);
    });
  }

  /**
   * Listen, then answer. The creature sings a few notes, each one lighting
   * its key, and he taps the same keys in the same order. toy.rounds is a
   * list of rounds, each a list of key numbers. While a note sounds the
   * picture is told pose: 1 for the first key, 2 for the second, and so on.
   * A third try at a round takes any answer.
   */
  async toySong(toy, cue) {
    for (const notes of toy.rounds || []) {
      for (let tries = 1; ; tries++) {
        this.clearControls();
        this.controls.className = 'choices';
        const label = this.prompt(toy.listen || 'LISTEN...');
        const row = el('div', 'songkeys');
        const keys = toy.keys.map((k) => { const b = el('button', 'key wide', k.key); row.appendChild(b); return b; });
        this.controls.append(label, row);
        this.settle(this.controls);
        const sound = async (i, ms) => {
          keys[i].classList.add('lit');
          this.picT.pose = i + 1; this.redraw();
          cue(toy.keys[i].cue);
          await sleep(ms);
          keys[i].classList.remove('lit');
          this.picT.pose = 0; this.redraw();
          await sleep(160);
        };
        await sleep(800);
        for (const i of notes) await sound(i, 460);
        /** @type {HTMLElement} */ (label.firstChild).textContent = toy.turn || 'YOUR TURN!';
        const same = await new Promise((resolve) => {
          let at = 0, busy = false;
          keys.forEach((b, i) => b.addEventListener('click', async () => {
            if (busy) return;
            busy = true;
            const good = i === notes[at];
            await sound(i, 220);
            busy = false;
            if (!good) resolve(false);
            else if (++at === notes.length) resolve(true);
          }));
        });
        if (same || tries >= 3) break;
        cue('miss');
        /** @type {HTMLElement} */ (label.firstChild).textContent = toy.again || 'NOT THE SAME. LISTEN AGAIN...';
        await sleep(1300);
      }
      await sleep(400);
    }
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

  /**
   * Press a key a few times; each press sends a pulse through the picture.
   * The picture is told pose (presses so far) and pulse (0 to 1 as each one
   * spreads), so it can show a little more each time.
   */
  async toyPulse(toy, cue) {
    const say = (text) => {
      this.clearControls();
      this.controls.className = 'choices';
      this.controls.appendChild(this.prompt(text));
      this.settle(this.controls);
    };
    this.picT.pose = 0; this.picT.pulse = 0; this.redraw();
    for (let n = 1; n <= toy.count; n++) {
      await this.waitTap(toy.key || 'GO', n === 1 ? toy.prompt || '' : toy.more || toy.prompt || '');
      say(toy.wait || '...');
      cue(toy.cue || 'find');
      this.picT.pose = n;
      for (let f = 0; f <= 12; f++) { this.picT.pulse = f / 12; this.redraw(); await sleep(70); }
      this.picT.pulse = 1; this.redraw();
      await sleep(350);
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
