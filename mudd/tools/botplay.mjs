// Bot playtester. Checks a game pack, then plays it many times the way the
// game does: the dealer deals each run, and a robot picks places on the map,
// makes random choices, gets about 80% of puzzles right, and now and then
// names the wrong creature. It fails on:
//   - a pack that doesn't check out (missing card, slot, bank, tune, picture)
//   - ink that doesn't compile
//   - a run that hits a dead end, loops, or doesn't finish, including runs
//     the robot quits at a save point and continues later
//   - a case file that opens before every clue is found, a lock whose code
//     isn't the numbers found along the way, or a run that earns no egg
//   - a puzzle question that runs past four lines on an iPhone, a time no
//     clock shows, or two answers that look the same
//   - a part of a scene card no run ever reached
//   - anything from the game pack hard-wired into the engine
// It also plays every creature with every place and every puzzle a slot can
// hold, sends every creature on a detour to every other one, and prints a
// rough playtime.
//
//   node mudd/tools/botplay.mjs [game] [runs]
//   node mudd/tools/botplay.mjs el-morro 1000

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

import { loadPack, checkPack, compileStory, hatchable, traitKeys } from '../engine/pack.js';
import { deal, offers, slotCombos } from '../engine/dealer.js';
import { ARCHETYPES } from '../engine/puzzles.js';
import { runQuest, newQuestState, startStory, toggleCrossed, TOYS } from '../engine/quest.js';
import { Pix } from '../engine/art.js';
import { makeRng, countLines, CARD_COLS, KEY_COLS } from '../engine/util.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const require = createRequire(import.meta.url);
const inkjs = require('../vendor/ink-full.js');
const jsyaml = require('../vendor/js-yaml.min.js');

const game = process.argv[2] || 'el-morro';
const runs = Number(process.argv[3] || 1000);
const base = path.join(root, 'games', game);

const problems = new Set();
const fail = (msg) => problems.add(msg);
function finish() {
  const shown = [...problems].slice(0, 25);
  for (const p of shown) console.error('PROBLEM:', p);
  if (problems.size > shown.length) console.error(`...and ${problems.size - shown.length} more`);
  console.log(problems.size ? `\nFAILED: ${problems.size} problem${problems.size === 1 ? '' : 's'}` : '\nPASSED');
  process.exit(problems.size ? 1 : 0);
}

// ---------------------------------------------------------------------------
// 1. The pack

let pack;
try {
  pack = await loadPack(game, async (p) => readFileSync(path.join(base, p), 'utf8'), jsyaml);
} catch (e) {
  fail(`could not load the pack: ${e.message}`);
  finish();
}

// Pictures: drawn scenes from the pack's art module, plus PNGs on disk.
const pics = pack.game.pics || {};
let drawn = [];
if (pics.drawn) {
  try {
    const art = await import(pathToFileURL(path.join(base, pics.drawn)).href);
    drawn = Object.keys(art.scenes || {});
    // Every drawn scene paints without an error, with and without a creature,
    // and the pack can paint each creature that has a sprite.
    const sprites = Object.entries(pack.creatures).filter(([, c]) => c.sprite);
    if (sprites.length && typeof art.creature !== 'function') fail(`${pics.drawn}: creatures have sprites, so it must export creature()`);
    for (const [name, fn] of Object.entries(art.scenes || {})) {
      for (const t of [{ frame: 0 }, ...sprites.slice(0, 1).map(([, c]) => ({ frame: 3, who: c.sprite, pose: 1 }))]) {
        try { fn(new Pix(), t); } catch (e) { fail(`${pics.drawn}: scene "${name}" crashed: ${e.message}`); }
      }
    }
    for (const [id, c] of sprites) {
      const box = art.creatureBox || [0, 0];
      for (const pose of [0, 1]) {
        try {
          const p = new Pix();
          art.creature(p, c.sprite, 0, 0, { pose });
          if (!p.buf.some((v, i) => v && i % 320 < box[0] + 2 && i / 320 < box[1] + 2)) fail(`${pics.drawn}: creature "${id}" paints nothing`);
        } catch (e) { fail(`${pics.drawn}: creature "${id}" crashed: ${e.message}`); }
      }
    }
  } catch (e) { fail(`${pics.drawn}: ${e.message}`); }
}
for (const name of pack.pngs) {
  const file = path.join(base, 'pics', `${name}.png`);
  if (!existsSync(file)) { fail(`pics/${name}.png is listed in game.yaml but missing`); continue; }
  const png = readFileSync(file);
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
  if (png.toString('latin1', 1, 4) !== 'PNG' || w !== 320 || h !== 200) fail(`pics/${name}.png must be a 320x200 PNG (it is ${w}x${h})`);
}
for (const f of readdirSync(path.join(base, 'pics'))) {
  if (f.endsWith('.png') && !pack.pngs.includes(f.slice(0, -4))) fail(`pics/${f} is not listed under pics.png in game.yaml, so the game won't load it`);
}

for (const p of checkPack(pack, { archetypes: ARCHETYPES, toys: TOYS, pictures: [...drawn, ...pack.pngs] })) fail(p);

try { compileStory(pack, inkjs); } catch (e) { fail(`ink did not compile:\n${e.message}`); }
if (problems.size) finish();

// ---------------------------------------------------------------------------
// 2. Questions fit the puzzle card: four lines on the narrowest iPhone.

const MAX_QUESTION_LINES = 4, MAX_KEY_LINES = 3;
function measure(what, question, maxLines = MAX_QUESTION_LINES, keys = []) {
  const n = countLines(question, CARD_COLS);
  if (n > maxLines) fail(`${what}: the question takes ${n} lines on an iPhone (limit ${maxLines}): "${question}"`);
  for (const k of keys) {
    const kn = countLines(k, KEY_COLS);
    if (kn > MAX_KEY_LINES) fail(`${what}: an answer takes ${kn} lines on its key (limit ${MAX_KEY_LINES}): "${k}"`);
  }
}
let measured = 0;
for (const card of Object.values(pack.scenes)) {
  for (const options of Object.values(card.slots)) for (const spec of options) {
    for (const m of ARCHETYPES[spec.puzzle].longest(spec, pack.banks, pack.cast)) { measure(m.what, m.question, m.maxLines, m.keys); measured++; }
  }
}

// ---------------------------------------------------------------------------
// 3. The engine holds nothing from the pack: no cast, place, or creature.

const packWords = new Set([
  ...Object.values(pack.cast),
  ...Object.keys(pack.creatures),
  ...Object.keys(pack.scenes),
  ...String(pack.game.title).split(/\s+/).filter((w) => w.length > 3),
]);
for (const f of readdirSync(path.join(root, 'engine')).filter((n) => n.endsWith('.js'))) {
  const src = readFileSync(path.join(root, 'engine', f), 'utf8');
  for (const word of packWords) {
    if (new RegExp(`(^|[^A-Za-z_])${word.replace(/[^\w]/g, '.')}([^A-Za-z_]|$)`, 'i').test(src) && !/^dragon$/i.test(word)) {
      fail(`engine/${f} mentions "${word}", which belongs in games/${game}/`);
    }
  }
}

// The service worker must cache every engine and vendor file for offline play.
const sw = readFileSync(path.join(root, 'sw.js'), 'utf8');
for (const dir of ['engine', 'vendor']) {
  for (const f of readdirSync(path.join(root, dir)).filter((n) => /\.(js|woff2)$/.test(n))) {
    if (!sw.includes(`'${dir}/${f}'`)) fail(`sw.js does not cache ${dir}/${f}, so the game would break offline`);
  }
}

// ---------------------------------------------------------------------------
// 4. Play.

const WORDS_PER_MIN = 90;      // a 7-year-old reading short screens
const SECONDS_PER_PUZZLE = 60;
const SECONDS_PER_PICK = { map: 10, lineup: 45, toy: 20 };
const stats = { finished: 0, played: 0, words: 0, puzzles: 0, choices: 0, minutes: 0, late: 0, resumes: 0, seconds: 0, detours: 0 };
const eggCount = {};            // egg id -> runs that earned it
const dealtCount = {};          // "card.slot=puzzle" -> times dealt
const visited = new Set();      // "card.stitch" reached by some run
const detoured = new Set();     // creatures a run was sent to by mistake
const toysPlayed = new Set();   // "card.toy" played by some run
const levelsPlayed = new Set(); // "skill@level" of pick-one puzzles played
const braces = /\{[^}]*\}/;
const run = pack.game.run;
const hub = pack.scenes[run.hub];
const canHatch = hatchable(pack);
const traitCount = traitKeys(pack).length;

/**
 * Play one dealt run with a robot at the controls.
 * @param {{ go?: string[], wrong?: string[], start?: number }} [want]  places to pick on the map when they are
 *   on offer, creatures to name wrongly first, and a later time on the clock to start from
 */
async function playRun(plan, history, bot, want = {}) {
  let story = compileStory(pack, inkjs, { countAllVisits: true });
  startStory(story, pack, { runs: history.runs, caught: Object.keys(history.caught).length });
  if (want.start) story.variablesState.minutes = want.start;
  let state = newQuestState();
  // Now and then the robot quits at a save point and comes back, the way a
  // real player closes the app: a fresh story loaded from the saved game.
  const quit = new Error('quit and continue');
  let saved = null;
  const tag = `quest ${plan.seed} (${plan.creature}; ${plan.deck.join(', ')})`;
  const creature = pack.creatures[plan.creature];
  const lair = pack.scenes[creature.lair];
  const wrongFirst = [...(want.wrong || [])];
  let words = 0, steps = 0, puzzles = 0, seconds = 0, caughtNow = null, rating = null, current = null;
  const stuck = new Error('stuck');

  // `read` is text the player reads every run; `see` is text only checked.
  const see = (text, where) => { if (braces.test(text)) fail(`${tag}: unfilled {braces} in ${where}: "${text}"`); };
  const read = (text, where) => { see(text, where); words += text.split(/\s+/).filter(Boolean).length; };
  const answersRight = () => { current.tries++; return current.right && (current.first || current.tries > 1); };
  const step = () => { if (++steps > 300) { fail(`${tag}: more than 300 choices (a loop?)`); throw stuck; } };
  const onMap = (at, what) => { if (!Array.isArray(at) || at[0] < 4 || at[0] > 316 || at[1] < 18 || at[1] > 196) fail(`${tag}: ${what} is off the map at [${at}]`); };
  const ui = {
    line: async (text) => read(text, 'a story line'),
    clear: async () => {},
    pic: (name) => { if (!drawn.includes(name) && !pack.pngs.includes(name)) fail(`${tag}: picture "${name}" does not exist`); },
    tune: () => {}, cue: () => {},
    travel: async (disk, disks) => { if (disk > disks) fail(`${tag}: disk ${disk} of ${disks}`); },
    status: () => {},
    choose: async (labels) => {
      step();
      if (labels.some((l) => !l.trim())) fail(`${tag}: a choice with no words on it`);
      for (const l of labels) see(l, 'a choice');
      stats.choices++;
      return Math.floor(bot.next() * labels.length);
    },
    map: async (view) => {
      step();
      seconds += SECONDS_PER_PICK.map;
      if (!drawn.includes(view.pic) && !pack.pngs.includes(view.pic)) fail(`${tag}: the map picture "${view.pic}" does not exist`);
      if (!view.offers.length) fail(`${tag}: a map with nowhere to go`);
      if (view.offers.length !== view.labels.length) fail(`${tag}: the map has ${view.offers.length} places but ${view.labels.length} keys`);
      see(view.prompt, 'the map');
      for (const l of view.labels) see(l, 'a map key');
      for (const p of view.offers) onMap(p.at, p.name);
      if (view.here) onMap(view.here, 'the van');
      for (let i = 0; i < view.offers.length; i++) for (let j = 0; j < i; j++) {
        const [a, b] = [view.offers[i].at, view.offers[j].at];
        if (Math.abs(a[0] - b[0]) < 18 && Math.abs(a[1] - b[1]) < 14) fail(`${tag}: ${view.offers[i].name} and ${view.offers[j].name} sit on top of each other on the map`);
      }
      const wanted = view.offers.findIndex((p) => (want.go || []).includes(p.id));
      return wanted >= 0 ? wanted : Math.floor(bot.next() * view.offers.length);
    },
    lineup: async (view) => {
      step();
      seconds += SECONDS_PER_PICK.lineup;
      if (view.clues.length !== traitCount) fail(`${tag}: the case file opened with ${view.clues.length} of ${traitCount} clues`);
      for (const c of view.clues) see(c.text, 'a clue');
      see(view.sign, 'a clue');
      if (view.lineup.length !== Object.keys(pack.creatures).length) fail(`${tag}: the lineup is missing creatures`);
      // Crossing out must never hide the answer for good.
      const open = view.lineup.filter((c) => !c.wrong);
      const fiddle = open[Math.floor(bot.next() * open.length)];
      toggleCrossed(state, fiddle.id);
      if (bot.next() < 0.5) toggleCrossed(state, fiddle.id);
      const next = wrongFirst.shift();
      if (next && next !== plan.creature) return next;
      // About one run in six names a wrong creature first.
      if (bot.next() < 0.17) return open[Math.floor(bot.next() * open.length)].id;
      return plan.creature;
    },
    toy: async (toy) => {
      seconds += SECONDS_PER_PICK.toy;
      if (!TOYS.includes(toy.kind)) fail(`${tag}: a toy of kind "${toy.kind}"`);
      for (const v of Object.values(toy)) if (typeof v === 'string') see(v, 'a toy');
      if (toy.kind === 'taps' && !(toy.n >= toy.count[0] && toy.n <= toy.count[1])) fail(`${tag}: a taps toy asked for ${toy.n} taps`);
      if (toy.kind === 'pulse' && !(toy.count >= 1)) fail(`${tag}: a pulse toy with no presses`);
      if (toy.pic && !drawn.includes(toy.pic)) fail(`${tag}: toy picture "${toy.pic}" must be a drawn scene, so it can move`);
    },
    card: {
      open: async (pz) => {
        // About 80% of puzzles end right: most on the first try, some on the second.
        current = { pz, right: bot.next() < 0.8, first: bot.next() < 0.7, tries: 0 };
        puzzles++;
        read(pz.question, 'a puzzle question');
        measure(`${tag}: ${pz.skill}`, pz.question, pz.maxLines || MAX_QUESTION_LINES, []);
        for (const t of [pz.prompt, pz.retry, pz.right, pz.reveal]) see(t, 'puzzle wording');
        if (pz.screen === 'numpad') {
          if (!Number.isInteger(pz.answer) || pz.answer < 0 || pz.answer > 9999) fail(`${tag}: ${pz.skill} answer is ${pz.answer}`);
          // The lock opens with the numbers found along the way, in order.
          // A time is typed the way a clock shows it: 3:25 is 325.
          if (pz.format === 'clock' && !(pz.answer >= 100 && pz.answer % 100 < 60)) fail(`${tag}: ${pz.skill} wants the time ${pz.answer}, which no clock shows`);
          if (pz.skill === 'code_lock') {
            if (state.digits !== plan.stops) fail(`${tag}: the lock came up with ${state.digits} of ${plan.stops} numbers found`);
            if (pz.answer !== Number(plan.lock.join(''))) fail(`${tag}: the lock's code is ${pz.answer}, but the numbers found were ${plan.lock.join(', ')}`);
          }
        } else {
          if (pz.options.length < 2) fail(`${tag}: ${pz.skill} has fewer than two answers`);
          if (pz.options.filter((o) => o.correct).length !== 1) fail(`${tag}: ${pz.skill} must have exactly one right answer`);
          // No two answers may look alike on their keys.
          const looks = pz.options.map((o) => `${o.label}|${o.color || ''}|${o.size || ''}`);
          if (new Set(looks).size !== looks.length) fail(`${tag}: ${pz.skill} has two answers that look the same`);
          levelsPlayed.add(`${pz.skill}@${hooks.level(pz.skill)}`);
          for (const o of pz.options) { see(o.label, 'an answer'); see(o.miss, 'a hint'); measure(`${tag}: ${pz.skill}`, '', 1, [o.label]); }
        }
      },
      numpad: async () => {
        const ok = answersRight();
        const guess = ok ? current.pz.answer : current.pz.answer + 1;
        if (!ok) see(current.pz.miss(guess), 'a hint');
        return guess;
      },
      pick: async (options) => {
        const want = options.findIndex((o) => o.correct === answersRight());
        return want >= 0 ? want : 0;
      },
      hint: () => {},
      reveal: async () => {},
      close: async () => {},
    },
  };
  const hooks = {
    level: (skill) => (history.skills[skill] || 1),
    learned: () => {},
    result: (res) => {
      history.recent.push(res.type);
      if (history.recent.length > 12) history.recent.shift();
      // Walk the levels so every template gets played.
      history.skills[res.skill] = 1 + ((history.skills[res.skill] || 1) % 3);
    },
    caught: (id) => { caughtNow = id; },
    rated: (id, r) => { rating = r; },
    checkpoint: () => {
      if (bot.next() < 0.1) {
        saved = { ink: story.state.ToJson(), state: JSON.parse(JSON.stringify(state)) };
        throw quit;
      }
    },
    problem: (msg) => fail(`${tag}: ${msg}`),
  };

  stats.played++;
  for (;;) {
    try {
      await runQuest({ pack, plan, story, state, ui, hooks });
      break;
    } catch (e) {
      if (e === quit) {
        story = compileStory(pack, inkjs, { countAllVisits: true });
        story.state.LoadJson(saved.ink);
        state = saved.state;
        stats.resumes++;
        continue;
      }
      if (e !== stuck) fail(`${tag}: crashed: ${e.stack || e}`);
      return;
    }
  }
  if (caughtNow !== plan.creature) fail(`${tag}: the run ended without a "# caught" tag for ${plan.creature}`);
  if (!rating || !rating.egg || !rating.egg.name) fail(`${tag}: the run ended without a "# rate" tag`);
  if (state.named !== plan.creature) fail(`${tag}: the run ended with "${state.named}" named`);
  if (state.route.length !== plan.stops || new Set(state.route).size !== plan.stops) fail(`${tag}: visited ${state.route.join(', ') || 'nowhere'}, but the run has ${plan.stops} stops`);
  if (state.clues.length !== traitCount) fail(`${tag}: ended with ${state.clues.length} of ${traitCount} clues`);
  const stops = [hub.id, ...state.route, lair.id];
  const expected = stops.reduce((n, id) => n + Object.keys(plan.slots[id] || {}).length, 0);
  if (puzzles !== expected) fail(`${tag}: ${puzzles} puzzles played but ${expected} were dealt`);
  if (rating && rating.puzzles !== expected) fail(`${tag}: the rating counted ${rating.puzzles} puzzles of ${expected}`);
  for (const t of lair.tags.toy) toysPlayed.add(`${lair.id}.${t}`);

  const rank = rating ? rating.rank : 1;
  history.caught[plan.creature] = { egg: Math.max(rank, (history.caught[plan.creature] || {}).egg || 0) };
  history.runs++;
  stats.finished++;
  stats.words += words;
  stats.puzzles += puzzles;
  stats.seconds += seconds;
  stats.detours += state.wrong.length;
  for (const id of state.wrong) detoured.add(id);
  if (rating) eggCount[rating.egg.id || rating.egg.name] = (eggCount[rating.egg.id || rating.egg.name] || 0) + 1;
  const end = Number(story.variablesState.minutes);
  const sunset = Number((pack.game.clock || {}).sunset) || 1125;
  if (rating && rating.before !== (end <= sunset)) fail(`${tag}: home at ${end} with sunset at ${sunset}, but the rating says before sunset: ${rating.before}`);
  if (!want.start) {
    stats.minutes += end - (Number((pack.game.clock || {}).start) || 540);
    if (end > sunset) stats.late++;
  }
  for (const card of Object.values(pack.scenes)) {
    for (const st of card.stitches) if (story.state.VisitCountAtPathString(`${card.knot}.${st}`) > 0) visited.add(`${card.id}.${st}`);
  }
  for (const id of stops) for (const [slot, spec] of Object.entries(plan.slots[id] || {})) {
    const key = `${id}.${slot}=${spec.puzzle}`;
    dealtCount[key] = (dealtCount[key] || 0) + 1;
  }
}

const newHistory = () => ({ caught: {}, recent: [], skills: {}, runs: 0 });

// 4a. Dealt runs, the way a player meets them: a history that grows from a
// first visit until every creature is caught and a few runs beyond, then a
// new player.
const bot = makeRng(20261114);
const creatureCount = Object.keys(pack.creatures).length;
let history = newHistory();
for (let r = 0; r < runs; r++) {
  if (history.runs >= canHatch.length + 3) history = newHistory();
  const seed = 1000 + Math.floor(bot.next() * 9000);
  const plan = deal(pack, seed, history);
  // Same number, same history: same run.
  if (JSON.stringify(plan) !== JSON.stringify(deal(pack, seed, history))) fail(`quest ${seed}: dealing twice gave two different runs`);
  if (new Set(plan.deck).size !== plan.deck.length) fail(`quest ${seed}: a place was dealt twice`);
  if (plan.lock.length !== plan.stops) fail(`quest ${seed}: ${plan.lock.length} lock numbers for ${plan.stops} stops`);
  if (offers(plan, []).length !== Math.min(2, plan.deck.length)) fail(`quest ${seed}: the first map offers ${offers(plan, []).length} places`);
  if (!canHatch.includes(plan.creature)) fail(`quest ${seed}: dealt ${plan.creature}, which has no lair`);
  const uncaught = canHatch.filter((id) => !history.caught[id]);
  if (uncaught.length && !uncaught.includes(plan.creature)) fail(`quest ${seed}: dealt ${plan.creature}, already caught, while ${uncaught.join(', ')} still to find`);
  await playRun(plan, history, bot);
}
const dealtRuns = stats.played;

// 4b. Every creature, in every place, with every puzzle its slots can hold.
let combos = 0;
for (const id of canHatch) {
  const lair = pack.scenes[pack.creatures[id].lair];
  for (const place of run.pool) {
    const deck = [place, ...run.pool.filter((p) => p !== place)];
    for (const hubSlots of slotCombos(hub)) for (const placeSlots of slotCombos(pack.scenes[place])) for (const lairSlots of slotCombos(lair)) {
      const force = { creature: id, deck, slots: { [hub.id]: hubSlots, [place]: placeSlots, [lair.id]: lairSlots } };
      for (let again = 0; again < 3; again++) {
        await playRun(deal(pack, 1000 + combos * 3 + again, newHistory(), force), newHistory(), bot, { go: [place] });
      }
      combos++;
    }
  }
}

// 4c. Every wrong guess: each creature that can hatch, with each other
// creature named first, so every detour is played.
let wrongs = 0;
for (const id of canHatch) {
  for (const other of Object.keys(pack.creatures)) {
    if (other === id) continue;
    await playRun(deal(pack, 5000 + wrongs, newHistory(), { creature: id }), newHistory(), bot, { wrong: [other] });
    if (!detoured.has(other)) fail(`naming ${other} for ${id} did not lead to a detour`);
    wrongs++;
  }
}

// 4d. Slow days: runs that start late, so they come home just before sunset,
// right at it, and well after it. Every ending gets read.
let lateRuns = 0;
const sunsetAt = Number((pack.game.clock || {}).sunset) || 1125;
for (const id of canHatch) {
  for (const before of [150, 120, 90, 60, 30, 0, -60]) {
    await playRun(deal(pack, 7000 + lateRuns, newHistory(), { creature: id }), newHistory(), bot, { start: sunsetAt - before });
    lateRuns++;
  }
}

// 4e. Nothing unreachable, and every puzzle option and toy actually gets played.
for (const card of Object.values(pack.scenes)) {
  for (const st of card.stitches) if (!visited.has(`${card.id}.${st}`)) fail(`scenes/${card.id}.ink: no run ever reached "= ${st}"`);
  for (const [slot, options] of Object.entries(card.slots)) for (const spec of options) {
    if (!dealtCount[`${card.id}.${slot}=${spec.puzzle}`]) fail(`scenes/${card.id}.yaml: ${spec.puzzle} in slot "${slot}" was never dealt`);
  }
  for (const t of Object.keys(card.toys)) if (!toysPlayed.has(`${card.id}.${t}`)) fail(`scenes/${card.id}.yaml: toy "${t}" was never played`);
}
// Every level of the Spanish puzzles gets played.
for (const skill of [...new Set([...levelsPlayed].map((k) => k.split('@')[0]))].filter((k) => k.startsWith('spanish_'))) {
  for (const lvl of [1, 2, 3]) if (!levelsPlayed.has(`${skill}@${lvl}`)) fail(`${skill}: no run played level ${lvl}`);
}
// Every egg can be earned.
for (const egg of (pack.game.rating || {}).eggs || []) if (!eggCount[egg.id || egg.name]) fail(`game.yaml: no run ever earned the ${egg.name}`);

// ---------------------------------------------------------------------------

const n = stats.finished || 1, onTime = (stats.finished - lateRuns) || 1;
const places = Math.min(Number(run.places_per_run) || 1, run.pool.length);
console.log(`${game}: ${stats.finished}/${stats.played} runs finished (${dealtRuns} dealt, ${combos} combinations x3, ${wrongs} wrong guesses, ${lateRuns} late starts, ${stats.resumes} quit-and-continue)`);
console.log(`pack: ${Object.keys(pack.scenes).length} scene cards, ${run.pool.length} in the pool, ${creatureCount} creatures (${canHatch.length} can hatch), ${drawn.length} drawn + ${pack.pngs.length} photo scenes`);
if (run.pool.length < Number(run.places_per_run)) console.log(`note: the pool has ${run.pool.length} place${run.pool.length === 1 ? '' : 's'}, so a run visits ${places}, not ${run.places_per_run}`);
console.log(`avg ${Math.round(stats.words / n)} words, ${(stats.puzzles / n).toFixed(1)} puzzles, ${(stats.choices / stats.played).toFixed(1)} choices, ${(stats.detours / n).toFixed(2)} detours; ${measured} question templates fit the card`);
console.log(`game clock: avg ${Math.round(stats.minutes / onTime)} minutes used, ${stats.late} of ${onTime} runs home after sunset (late starts not counted)`);
console.log(`eggs: ${((pack.game.rating || {}).eggs || []).map((e) => `${e.name} ${Math.round((100 * (eggCount[e.id || e.name] || 0)) / n)}%`).join(', ')}`);
console.log(`estimated playtime: ~${(stats.words / n / WORDS_PER_MIN + ((stats.puzzles / n) * SECONDS_PER_PUZZLE + stats.seconds / n) / 60).toFixed(1)} minutes`);
if (stats.finished < stats.played) fail(`${stats.played - stats.finished} runs did not finish`);
finish();
