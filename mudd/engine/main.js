// @ts-check
// MUDD engine: runs an ink story with puzzles, pictures, sound, and saves.
// Prose lives in .ink, data lives in YAML, code lives here.

import { Screen } from './screen.js';
import { Sound } from './sound.js';
import { PUZZLES, parsePuzzleTag } from './puzzles.js';
import { makeRng, clock, store } from './util.js';

const GAME = document.documentElement.dataset.game || 'el-morro';
const BASE = `games/${GAME}/`;
const SAVE_KEY = `mudd.${GAME}.save`;
const PROFILE_KEY = `mudd.${GAME}.profile`;

/** @type {any} */
const inkjs = /** @type {any} */ (window).inkjs;
/** @type {any} */
const jsyaml = /** @type {any} */ (window).jsyaml;

const screen = new Screen();
const sound = new Sound();

let inkSource = '';
/** @type {any} */
let banks = {};

/** Everything that carries across runs. Names stay on this device only. */
function defaultProfile() {
  return {
    guide: [],
    skills: {},
    log: [],
    spanish: {},
    facts: {},
    playMs: 0,
    runs: 0,
    settings: { muted: false, scanlines: true },
  };
}
let profile = { ...defaultProfile(), ...store.get(PROFILE_KEY, {}) };
const saveProfile = () => store.set(PROFILE_KEY, profile);

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

async function loadGame() {
  const [ink, yaml] = await Promise.all([
    fetch(BASE + 'story.ink', { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error('Missing story.ink'); return r.text(); }),
    fetch(BASE + 'banks.yaml', { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error('Missing banks.yaml'); return r.text(); }),
  ]);
  inkSource = ink;
  try { banks = jsyaml.load(yaml) || {}; } catch (e) { throw new Error(`banks.yaml: ${e.message}`); }
  sound.tunes = banks.tunes || {};
  compileStory(); // fail early, on the boot screen, if the ink has an error
}

function compileStory() {
  const compiler = new inkjs.Compiler(inkSource);
  try {
    return compiler.Compile();
  } catch (e) {
    const errs = (compiler.errors || []).join('\n') || e.message;
    throw new Error(`story.ink:\n${errs}`);
  }
}

/** The heroes of this game, from cast: in banks.yaml. */
function cast() {
  const c = banks.cast || {};
  return { hero: c.hero || 'Holden', sibling: c.sibling || 'Quentin', pet: c.pet || 'Cheddar' };
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
  saveProfile();
}

// ---------------------------------------------------------------------------
// One quest

/**
 * @param {{ seed: number, ink?: string, pic?: string, lines?: any[], puzzleN?: number }} run
 */
async function playQuest(run) {
  const story = compileStory();
  const names = cast();
  if (run.ink) story.state.LoadJson(run.ink);
  // Set after loading, so an older save can't bring back different names.
  story.variablesState.hero = names.hero;
  story.variablesState.sibling = names.sibling;
  story.variablesState.pet = names.pet;

  let puzzleN = run.puzzleN || 0;
  /** @type {{type: string, args: Record<string,string>} | null} */
  let pendingPuzzle = null;

  screen.hideOverlay();
  if (run.pic) screen.showPic(run.pic);
  if (run.lines) screen.restore(run.lines);

  const status = () => screen.setStatus({
    quest: run.seed,
    time: clock(Number(story.variablesState.minutes) || 540),
    clues: Number(story.variablesState.clues) || 0,
  });
  status();

  const save = () => {
    store.set(SAVE_KEY, { seed: run.seed, ink: story.state.ToJson(), pic: screen.currentPic, lines: screen.transcript(), puzzleN });
    saveProfile();
    screen.flashSave();
  };

  for (;;) {
    while (story.canContinue) {
      const line = story.Continue().trim();
      const tags = (story.currentTags || []).map((t) => String(t).trim());
      const tag = (key) => tags.filter((t) => t === key || t.startsWith(key + ':')).map((t) => t.slice(key.length + 1).trim());

      if (tag('clear').length) { await screen.waitIfUnread(); screen.clearText(); }
      for (const p of tag('pic')) screen.showPic(p);
      for (const t of tag('tune')) sound.play(t, { music: true });
      if (line) await screen.type(line);
      for (const c of tag('cue')) sound.play(c);
      for (const g of tag('guide')) {
        if (!profile.guide.includes(g)) profile.guide.push(g);
        saveProfile();
      }
      for (const d of tag('disk')) { await screen.waitIfUnread(); sound.play('disk'); await screen.disk(Number(d) || 2); }
      for (const p of tag('puzzle')) pendingPuzzle = parsePuzzleTag(p);
      status();
    }

    const choices = story.currentChoices;
    if (!choices.length) break;

    // A puzzle answers the hidden [@pass] / [@fail] choices.
    const passIdx = choices.findIndex((c) => c.text.trim() === '@pass');
    const failIdx = choices.findIndex((c) => c.text.trim() === '@fail');
    if (passIdx >= 0 && failIdx >= 0) {
      const pz = pendingPuzzle;
      pendingPuzzle = null;
      const fn = pz && PUZZLES[pz.type];
      let res = { pass: true, firstTry: true, skill: 'none' };
      if (fn) {
        res = await fn({
          screen, sound, banks,
          names,
          rng: makeRng(run.seed * 7919 + ++puzzleN),
          level: (s) => skillOf(s).level,
          learned: (kind, id) => { (kind === 'spanish' ? profile.spanish : profile.facts)[id] = true; },
          args: pz ? pz.args : {},
        });
        recordResult(res);
      } else {
        await screen.type(`(Missing puzzle "${pz ? pz.type : '?'}". Skipping it.)`, 'dim');
      }
      story.ChooseChoiceIndex(res.pass ? passIdx : failIdx);
      continue;
    }

    save();
    const visible = choices.filter((c) => !c.text.trim().startsWith('@'));
    const pick = await screen.choose(visible.map((c) => c.text.trim()));
    await screen.type(`> ${visible[pick].text.trim()}`, 'echo');
    story.ChooseChoiceIndex(visible[pick].index);
  }

  // The end.
  store.remove(SAVE_KEY);
  profile.runs++;
  saveProfile();
  await screen.waitTap('PLAY AGAIN');
}

// ---------------------------------------------------------------------------
// Screens outside the story

/** A warm hello before each new quest. */
async function greet() {
  const { hero, sibling, pet } = cast();
  screen.hideOverlay();
  screen.showPic('museum');
  screen.clearText();
  screen.setStatus({});
  const found = profile.guide.length;
  if (!profile.runs) {
    await screen.type(`¡Hola, ${hero}! Welcome to the Museo de Leyendas.`);
    await screen.type(`${sibling} is right beside you, and ${pet} is wagging so hard his whole back end wiggles.`);
    await screen.type(`Doña Luz waves from the front desk. "My two favorite explorers, and the best corgi in San Juan! I'm so glad you came today."`);
  } else {
    await screen.type(`¡Hola otra vez, ${hero}! Welcome back to the Museo de Leyendas.`);
    await screen.type(`${sibling} races ahead, and ${pet} is already sniffing the floor for clues.`);
    await screen.type(found
      ? `Doña Luz beams. "My explorers are back! Your Dragon Field Guide has ${found} ${found === 1 ? 'dragon' : 'dragons'} in it now. ¡Qué bueno!"`
      : `Doña Luz beams. "My explorers are back! I knew you would come."`);
  }
  await screen.waitTap("LET'S GO!");
}

function fieldGuide() {
  return screen.page('DRAGON FIELD GUIDE', (body, el) => {
    const dragons = banks.dragons || {};
    const ids = Object.keys(dragons);
    body.appendChild(el('p', 'dim', `${profile.guide.length} of ${ids.length} found in this demo. Eight kinds will hatch in the full game.`));
    for (const id of ids) {
      const d = dragons[id];
      const got = profile.guide.includes(id);
      const card = el('div', 'card' + (got ? '' : ' locked'));
      card.appendChild(el('h3', '', got ? d.name : '? ? ?'));
      if (got) {
        card.appendChild(el('p', '', `Based on the ${d.based_on}. Color: ${d.color_es}.`));
        card.appendChild(el('p', '', d.fact));
        card.appendChild(el('p', 'dim', `Source: ${d.source}. Discovered by ${cast().hero}.`));
      } else card.appendChild(el('p', 'dim', 'Not discovered yet.'));
      body.appendChild(card);
    }
  });
}

/** Hidden grown-up screen: hold the top-left corner for three seconds. */
function grownUp() {
  return screen.page('GROWN-UP SCREEN', (body, el) => {
    const mins = Math.round(profile.playMs / 60000);
    body.appendChild(el('p', '', `Time played: ${mins} min. Quests finished: ${profile.runs}.`));
    const table = el('table');
    const head = el('tr');
    ['Skill', 'Level', 'First-try right'].forEach((h) => head.appendChild(el('th', '', h)));
    table.appendChild(head);
    const label = { dragon_hoard: 'Word problems', spanish_colors: 'Spanish colors', science_facts: 'Science facts' };
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

    const wipe = el('button', 'key wide danger', 'ERASE ALL PROGRESS');
    let armed = false;
    wipe.addEventListener('click', () => {
      if (!armed) { armed = true; wipe.textContent = 'TAP AGAIN TO ERASE'; return; }
      store.remove(SAVE_KEY); store.remove(PROFILE_KEY);
      location.reload();
    });
    body.appendChild(wipe);
    body.appendChild(el('p', 'dim', `Data stays on this device. Engine: MUDD 0.1, game: ${GAME}.`));
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
    await screen.boot('HOLDEN A GAME STUDIO', loadGame);
  } catch (e) {
    screen.error(e.message || String(e));
    return;
  }
  const studio = banks.studio || 'MUDD SOFT';
  for (;;) {
    await screen.title(studio, banks.title || 'MUDD');
    sound.play('title', { music: true });
    const saved = store.get(SAVE_KEY);
    const items = [...(saved ? ['CONTINUE QUEST'] : []), 'NEW QUEST', 'DRAGON FIELD GUIDE'];
    const pick = items[await screen.titleMenu(items)];
    if (pick === 'DRAGON FIELD GUIDE') { await fieldGuide(); continue; }
    try {
      if (pick === 'CONTINUE QUEST' && saved) {
        await playQuest(saved);
      } else {
        await greet();
        const seed = 1000 + Math.floor(Math.random() * 9000);
        await playQuest({ seed });
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
