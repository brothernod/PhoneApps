// @ts-check
// Everything on screen: picture window, typed text, keycap choices, the
// puzzle card with its number pad, and full-screen overlays. Touch only.

import { sleep } from './util.js';

const PAGE = 3; // story choices shown at once; more than this and they page

const $ = (sel) => /** @type {HTMLElement} */ (document.querySelector(sel));

function el(tag, cls, text) {
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
    this.text.addEventListener('pointerdown', () => { this.skip = true; });
    this.pic.addEventListener('pointerdown', () => { this.skip = true; });
  }

  showPic(name) {
    if (!name) { this.pic.classList.add('off'); this.currentPic = ''; return; }
    if (this.pictures && this.pictures.draw(this.pic, name)) { this.pic.classList.remove('off'); this.currentPic = name; }
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
  async title(studio, name, pic) {
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

  /** A full-screen page of text with a close button (Field Guide, grown-up screen). */
  page(title, build) {
    return new Promise((resolve) => {
      const prevClass = this.overlay.className;
      const prevNodes = [...this.overlay.childNodes];
      this.overlay.className = 'show page';
      this.overlay.innerHTML = '';
      const box = el('div', 'pagebox');
      box.appendChild(el('h2', '', title));
      const body = el('div', 'pagebody');
      build(body, el);
      box.appendChild(body);
      const close = el('button', 'key wide', 'BACK');
      close.addEventListener('click', (e) => {
        e.stopPropagation();
        this.overlay.innerHTML = '';
        this.overlay.append(...prevNodes);
        this.overlay.className = prevClass;
        resolve(undefined);
      }, { once: true });
      box.appendChild(close);
      this.overlay.appendChild(box);
    });
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
