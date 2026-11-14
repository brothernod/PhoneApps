// @ts-check
// MUDD engine: plays a game pack. The pack (games/<id>/) holds every place,
// creature, name, and word; this file wires its story to the screen, the
// sound, and the saves. Prose lives in .ink, data lives in YAML, code lives here.

import { Screen } from './screen.js';
import { Sound } from './sound.js';
import { Pictures } from './art.js';
import { loadPack, checkPack, compileStory } from './pack.js';
import { deal } from './dealer.js';
import { ARCHETYPES } from './puzzles.js';
import { runQuest, newQuestState, startStory } from './quest.js';
import { clock, fill, store } from './util.js';

const VERSION = 'MUDD 0.2';
const SAVE_VERSION = 2;

// Which game: ?game=<folder> in the address, or data-game on the page.
const asked = new URLSearchParams(location.search).get('game') || document.documentElement.dataset.game || '';
const GAME = /^[a-z0-9-]+$/.test(asked) ? asked : '';
const BASE = new URL(`../games/${GAME}/`, import.meta.url);
const SAVE_KEY = `mudd.${GAME}.save`;
const PROFILE_KEY = `mudd.${GAME}.profile`;

/** @type {any} */
const inkjs = /** @type {any} */ (window).inkjs;
/** @type {any} */
const jsyaml = /** @type {any} */ (window).jsyaml;

const screen = new Screen();
const sound = new Sound();
const pictures = new Pictures();
screen.pictures = pictures;

/** @type {import('./pack.js').Pack} */
let pack;
/** A word the engine shows, from the pack's words: with a plain fallback. */
const word = (key, fallback) => (pack && pack.words[key]) || fallback;

/** Everything that carries across runs. It stays on this device only. */
function defaultProfile() {
  return {
    caught: {},   // creature id -> { n: times caught, first: when, last: when }
    recent: [],   // the last dozen puzzle kinds played, so the dealer can vary them
    skills: {},
    log: [],
    spanish: {},
    facts: {},
    playMs: 0,
    runs: 0,
    settings: { muted: false, scanlines: true },
  };
}
function loadProfile() {
  const saved = store.get(PROFILE_KEY, {}) || {};
  const p = { ...defaultProfile(), ...saved };
  // Before the caught list, the Field Guide was a plain list of ids.
  if (Array.isArray(saved.guide)) {
    for (const id of saved.guide) if (!p.caught[id]) p.caught[id] = { n: 1, first: 0, last: 0 };
    delete p.guide;
  }
  return p;
}
let profile = loadProfile();
const saveProfile = () => store.set(PROFILE_KEY, profile);
const caughtCount = () => Object.keys(pack.creatures).filter((id) => profile.caught[id]).length;

// Track play time while the page is visible.
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  if (!document.hidden) profile.playMs += Math.min(now - lastTick, 5000);
  lastTick = now;
}, 1000);
document.addEventListener('visibilitychange', () => { lastTick = Date.now(); if (document.hidden) saveProfile(); });

// ---------------------------------------------------------------------------
// Loading

const readText = async (path) => {
  const r = await fetch(new URL(path, BASE), { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Missing ${path}`);
  return r.text();
};

async function loadGame() {
  if (!GAME) throw new Error('No game named. Add data-game to index.html.');
  pack = await loadPack(GAME, readText, jsyaml);
  document.title = pack.game.title || document.title;
  sound.tunes = pack.banks.tunes || {};

  // Pictures: scenes the pack draws in code, then its PNGs.
  const pics = pack.game.pics || {};
  if (pics.drawn) pictures.drawn = (await import(new URL(pics.drawn, BASE).href)).scenes || {};
  await pictures.loadImages(pack.pngs, (name) => new URL(`pics/${name}.png`, BASE).href);

  // Fail early, on the boot screen, if the pack or its ink has a mistake.
  const problems = checkPack(pack, { archetypes: ARCHETYPES, pictures: pictures.names });
  if (problems.length) throw new Error(problems.join('\n'));
  compileStory(pack, inkjs);
  keepOffline();
}

/** Ask the service worker to keep the whole pack, so the game runs without Wi-Fi. */
function keepOffline() {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
  const files = pack.files.map((f) => new URL(f, BASE).href);
  navigator.serviceWorker.ready.then((reg) => reg.active && reg.active.postMessage({ type: 'keep', files })).catch(() => {});
}

// ---------------------------------------------------------------------------
// Difficulty: up after two right in a row, down after two misses.

function skillOf(name) {
  if (!profile.skills[name]) profile.skills[name] = { level: 1, up: 0, down: 0, right: 0, total: 0 };
  return profile.skills[name];
}

function recordResult(res) {
  const s = skillOf(res.skill);
  s.total++;
  if (res.firstTry) { s.right++; s.up++; s.down = 0; } else { s.down++; s.up = 0; }
  if (s.up >= 2) { s.level = Math.min(3, s.level + 1); s.up = 0; }
  if (s.down >= 2) { s.level = Math.max(1, s.level - 1); s.down = 0; }
  profile.log.push({ skill: res.skill, firstTry: res.firstTry, pass: res.pass, at: Date.now() });
  if (profile.log.length > 300) profile.log.splice(0, profile.log.length - 300);
  profile.recent.push(res.type);
  if (profile.recent.length > 12) profile.recent.splice(0, profile.recent.length - 12);
  saveProfile();
}

function recordCaught(id) {
  const now = Date.now();
  const c = profile.caught[id] || { n: 0, first: now, last: now };
  c.n++;
  c.last = now;
  profile.caught[id] = c;
  saveProfile();
}

// ---------------------------------------------------------------------------
// One quest

/**
 * @param {{ plan: import('./dealer.js').Plan, state?: import('./quest.js').QuestState,
 *   ink?: string, pic?: string, lines?: any[] }} run  a fresh deal, or a saved game
 */
async function playQuest(run) {
  const story = compileStory(pack, inkjs);
  const state = run.state || newQuestState();
  if (run.ink) story.state.LoadJson(run.ink);
  else startStory(story, pack, { runs: profile.runs, caught: caughtCount() });

  screen.hideOverlay();
  screen.clearText();
  screen.showPic(run.pic || '');
  if (run.lines) screen.restore(run.lines);

  /** @type {import('./quest.js').QuestUi} */
  const ui = {
    line: (text, cls) => screen.type(text, cls),
    clear: async () => { await screen.waitIfUnread(); screen.clearText(); },
    pic: (name) => screen.showPic(name),
    tune: (name) => { sound.play(name, { music: true }); },
    cue: (name) => { sound.play(name); },
    travel: async (stop, stops) => { await screen.waitIfUnread(); sound.play('disk'); await screen.disk(stop, stops); },
    choose: async (labels) => {
      if (labels.length === 1) { await screen.waitTap(labels[0]); return 0; }
      return screen.choose(labels, { paged: true });
    },
    status: ({ quest, minutes, clues }) => screen.setStatus({
      quest: `${word('quest', 'QUEST')} #${quest}`,
      time: clock(minutes),
      clues: `${word('clues', 'CLUES')} ${clues}`,
    }),
    card: {
      open: (pz) => screen.cardOpen(pz),
      numpad: (prompt) => screen.cardNumpad(prompt),
      pick: (options, prompt) => screen.cardPick(options, prompt),
      hint: (text) => screen.cardHintText(text),
      reveal: (text) => screen.cardReveal(text),
      close: () => screen.cardClose(),
    },
  };

  await runQuest({
    pack, plan: run.plan, story, state, ui,
    hooks: {
      level: (skill) => skillOf(skill).level,
      learned: (kind, id) => { (kind === 'spanish' ? profile.spanish : profile.facts)[id] = true; },
      result: recordResult,
      caught: recordCaught,
      checkpoint: () => {
        store.set(SAVE_KEY, { v: SAVE_VERSION, plan: run.plan, state, ink: story.state.ToJson(), pic: screen.currentPic, lines: screen.transcript() });
        saveProfile();
        screen.flashSave();
      },
      problem: (msg) => console.warn('MUDD:', msg),
    },
  });

  // The end.
  store.remove(SAVE_KEY);
  profile.runs++;
  saveProfile();
  await screen.waitTap('PLAY AGAIN');
}

/** A saved game this version can pick back up, or null. */
function savedGame() {
  const s = store.get(SAVE_KEY);
  if (s && s.v === SAVE_VERSION && s.plan && pack.creatures[s.plan.creature] && s.plan.places.every((p) => pack.scenes[p])) return s;
  if (s) store.remove(SAVE_KEY); // from an older version of the game
  return null;
}

// ---------------------------------------------------------------------------
// Screens outside the story

function fieldGuide() {
  return screen.page(word('guide', 'FIELD GUIDE'), (body, el) => {
    const ids = Object.keys(pack.creatures);
    body.appendChild(el('p', 'dim', fill(word('guide_count', '{found} of {total} found.'), { found: String(caughtCount()), total: String(ids.length) })));
    for (const id of ids) {
      const c = pack.creatures[id];
      const got = profile.caught[id];
      const card = el('div', 'card' + (got ? '' : ' locked'));
      card.appendChild(el('h3', '', got ? c.name : '? ? ?'));
      if (got) {
        const names = { ...pack.cast };
        for (const [k, v] of Object.entries(c)) if (typeof v === 'string') names[k] = v;
        if (pack.words.guide_entry) card.appendChild(el('p', '', fill(pack.words.guide_entry, names)));
        if (c.fact) card.appendChild(el('p', '', c.fact));
        if (pack.words.guide_source) card.appendChild(el('p', 'dim', fill(pack.words.guide_source, names)));
        if (got.n > 1) card.appendChild(el('p', 'dim', `Found ${got.n} times.`));
      } else card.appendChild(el('p', 'dim', word('guide_locked', 'Not found yet.')));
      body.appendChild(card);
    }
  });
}

/** Every picture in the pack, so a grown-up can check the art on the real device. */
function pictureCheck() {
  return screen.page('PICTURES', (body, el) => {
    for (const name of pictures.names) {
      const c = /** @type {HTMLCanvasElement} */ (el('canvas'));
      c.width = 320; c.height = 200;
      pictures.draw(c, name);
      body.append(c, el('p', 'dim', `${name}${name in pictures.drawn ? ' (drawn)' : '.png'}`));
    }
  });
}

/** Hidden grown-up screen: hold the top-left corner for three seconds. */
function grownUp() {
  return screen.page('GROWN-UP SCREEN', (body, el) => {
    const mins = Math.round(profile.playMs / 60000);
    body.appendChild(el('p', '', `Time played: ${mins} min. Runs finished: ${profile.runs}.`));
    if (pack) {
      const got = Object.keys(pack.creatures).filter((id) => profile.caught[id]).map((id) => `${pack.creatures[id].name} x${profile.caught[id].n}`);
      body.appendChild(el('p', '', `Caught: ${got.length ? got.join(', ') : 'none yet'}.`));
    }
    const table = el('table');
    const head = el('tr');
    ['Skill', 'Level', 'First-try right'].forEach((h) => head.appendChild(el('th', '', h)));
    table.appendChild(head);
    /** @type {Record<string, string>} */
    const label = {};
    for (const a of Object.values(ARCHETYPES)) label[a.skill({})] = a.label;
    for (const [k, s] of Object.entries(profile.skills)) {
      const tr = el('tr');
      [label[k] || k, String(s.level), s.total ? `${s.right} of ${s.total} (${Math.round((100 * s.right) / s.total)}%)` : '-'].forEach((v) => tr.appendChild(el('td', '', v)));
      table.appendChild(tr);
    }
    if (!Object.keys(profile.skills).length) body.appendChild(el('p', 'dim', 'No puzzles played yet.'));
    else body.appendChild(table);
    const words = Object.keys(profile.spanish);
    body.appendChild(el('p', '', `Spanish words seen: ${words.length ? words.join(', ') : 'none yet'}.`));

    const toggle = (label, get, set) => {
      const b = el('button', 'key wide', '');
      const draw = () => { b.textContent = `${label}: ${get() ? 'ON' : 'OFF'}`; };
      b.addEventListener('click', () => { set(!get()); draw(); saveProfile(); });
      draw();
      body.appendChild(b);
    };
    toggle('SOUND', () => !profile.settings.muted, (v) => { profile.settings.muted = !v; applySettings(); });
    toggle('SCANLINES', () => profile.settings.scanlines, (v) => { profile.settings.scanlines = v; applySettings(); });

    if (pack) {
      const pics = el('button', 'key wide', `CHECK PICTURES (${pictures.names.length})`);
      pics.addEventListener('click', () => { pictureCheck(); });
      body.appendChild(pics);
    }

    const wipe = el('button', 'key wide danger', 'ERASE ALL PROGRESS');
    let armed = false;
    wipe.addEventListener('click', () => {
      if (!armed) { armed = true; wipe.textContent = 'TAP AGAIN TO ERASE'; return; }
      store.remove(SAVE_KEY); store.remove(PROFILE_KEY);
      location.reload();
    });
    body.appendChild(wipe);
    body.appendChild(el('p', 'dim', `Data stays on this device. Engine: ${VERSION}, game: ${GAME}.`));
  });
}

function applySettings() {
  sound.setMuted(profile.settings.muted);
  document.body.classList.toggle('scanlines', !!profile.settings.scanlines);
  const m = document.getElementById('mute');
  if (m) m.textContent = profile.settings.muted ? '♪ OFF' : '♪ ON';
}

function setupAudioUnlock() {
  const unlock = () => sound.unlock();
  document.addEventListener('touchend', unlock, true);
  document.addEventListener('click', unlock, true);
}

function setupCorners() {
  const corner = document.getElementById('corner');
  let t = 0;
  const start = (e) => { e.preventDefault(); clearTimeout(t); t = window.setTimeout(() => grownUp(), 3000); };
  const stop = () => clearTimeout(t);
  corner?.addEventListener('pointerdown', start);
  corner?.addEventListener('pointerup', stop);
  corner?.addEventListener('pointerleave', stop);
  corner?.addEventListener('pointercancel', stop);
  document.getElementById('mute')?.addEventListener('click', () => {
    sound.unlock();
    profile.settings.muted = !profile.settings.muted;
    applySettings();
    saveProfile();
  });
}

// ---------------------------------------------------------------------------

async function main() {
  applySettings();
  setupAudioUnlock();
  setupCorners();
  try {
    // The studio name on the boot screen comes from the pack, so read that first.
    let studio = 'MUDD SOFT';
    try { studio = (jsyaml.load(await readText('game.yaml')) || {}).studio || studio; } catch { /* loadGame reports it */ }
    await screen.boot(studio, loadGame);
  } catch (e) {
    screen.error(e.message || String(e));
    return;
  }
  for (;;) {
    await screen.title(pack.game.studio || 'MUDD SOFT', pack.game.title || 'MUDD', (pack.game.pics || {}).title);
    sound.play('title', { music: true });
    const saved = savedGame();
    const items = [
      ...(saved ? [word('continue', 'CONTINUE')] : []),
      word('new', 'NEW GAME'),
      word('guide', 'FIELD GUIDE'),
    ];
    const pick = (await screen.titleMenu(items)) - (saved ? 1 : 0); // -1 continue, 0 new, 1 guide
    if (pick === 1) { await fieldGuide(); continue; }
    try {
      if (pick === -1 && saved) {
        await playQuest(saved);
      } else {
        // The quest number is the seed: the dealer builds the whole run from it.
        const seed = 1000 + Math.floor(Math.random() * 9000);
        await playQuest({ plan: deal(pack, seed, profile) });
      }
    } catch (e) {
      console.error(e);
      store.remove(SAVE_KEY);
      screen.error(`${e.message || e}\n\n(The saved game was cleared.)`);
      return;
    }
  }
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

main();
