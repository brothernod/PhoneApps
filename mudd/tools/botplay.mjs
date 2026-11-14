// Bot playtester. Checks a game pack, then plays it many times the way the
// game does: the dealer deals each run, and a robot makes random choices and
// gets about 80% of puzzles right. It fails on:
//   - a pack that doesn't check out (missing card, slot, bank, tune, picture)
//   - ink that doesn't compile
//   - a run that hits a dead end, loops, or doesn't finish, including runs
//     the robot quits at a save point and continues later
//   - a puzzle question that runs past four lines on an iPhone
//   - a part of a scene card no run ever reached
//   - anything from the game pack hard-wired into the engine
// It also plays every creature with every place and every puzzle a slot can
// hold, and prints a rough playtime.
//
//   node mudd/tools/botplay.mjs [game] [runs]
//   node mudd/tools/botplay.mjs el-morro 1000

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

import { loadPack, checkPack, compileStory } from '../engine/pack.js';
import { deal, itinerary, slotCombos } from '../engine/dealer.js';
import { ARCHETYPES } from '../engine/puzzles.js';
import { runQuest, newQuestState, startStory } from '../engine/quest.js';
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
  try { drawn = Object.keys((await import(pathToFileURL(path.join(base, pics.drawn)).href)).scenes || {}); }
  catch (e) { fail(`${pics.drawn}: ${e.message}`); }
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

for (const p of checkPack(pack, { archetypes: ARCHETYPES, pictures: [...drawn, ...pack.pngs] })) fail(p);

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
const stats = { finished: 0, played: 0, words: 0, puzzles: 0, choices: 0, minutes: 0, late: 0, resumes: 0 };
const dealtCount = {};          // "card.slot=puzzle" -> times dealt
const visited = new Set();      // "card.stitch" reached by some run
const braces = /\{[^}]*\}/;

/** Play one dealt run with a robot at the controls. */
async function playRun(plan, history, bot) {
  let story = compileStory(pack, inkjs, { countAllVisits: true });
  startStory(story, pack, { runs: history.runs, caught: Object.keys(history.caught).length });
  let state = newQuestState();
  // Now and then the robot quits at a save point and comes back, the way a
  // real player closes the app: a fresh story loaded from the saved game.
  const quit = new Error('quit and continue');
  let saved = null;
  const tag = `quest ${plan.seed} (${plan.creature}; ${plan.places.join(', ')})`;
  let words = 0, steps = 0, puzzles = 0, caughtNow = null, current = null;
  const stuck = new Error('stuck');

  // `read` is text the player reads every run; `see` is text only checked.
  const see = (text, where) => { if (braces.test(text)) fail(`${tag}: unfilled {braces} in ${where}: "${text}"`); };
  const read = (text, where) => { see(text, where); words += text.split(/\s+/).filter(Boolean).length; };
  const answersRight = () => { current.tries++; return current.right && (current.first || current.tries > 1); };
  const ui = {
    line: async (text) => read(text, 'a story line'),
    clear: async () => {},
    pic: (name) => { if (!drawn.includes(name) && !pack.pngs.includes(name)) fail(`${tag}: picture "${name}" does not exist`); },
    tune: () => {}, cue: () => {},
    travel: async () => {},
    status: () => {},
    choose: async (labels) => {
      if (++steps > 300) { fail(`${tag}: more than 300 choices (a loop?)`); throw stuck; }
      if (labels.some((l) => !l.trim())) fail(`${tag}: a choice with no words on it`);
      stats.choices++;
      return Math.floor(bot.next() * labels.length);
    },
    card: {
      open: async (pz) => {
        // About 80% of puzzles end right: most on the first try, some on the second.
        current = { pz, right: bot.next() < 0.8, first: bot.next() < 0.7, tries: 0 };
        puzzles++;
        read(pz.question, 'a puzzle question');
        measure(`${tag}: ${pz.skill}`, pz.question, pz.screen === 'pick' && pz.options.some((o) => o.label.length > 12) ? 1 : MAX_QUESTION_LINES, []);
        for (const t of [pz.prompt, pz.retry, pz.right, pz.reveal, pz.note || '']) see(t, 'puzzle wording');
        if (pz.screen === 'numpad') {
          if (!Number.isInteger(pz.answer) || pz.answer < 0 || pz.answer > 9999) fail(`${tag}: ${pz.skill} answer is ${pz.answer}`);
        } else {
          if (pz.options.length < 2) fail(`${tag}: ${pz.skill} has fewer than two answers`);
          if (pz.options.filter((o) => o.correct).length !== 1) fail(`${tag}: ${pz.skill} must have exactly one right answer`);
          for (const o of pz.options) { see(o.label, 'an answer'); see(o.miss, 'a hint'); }
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
  const expected = Object.values(plan.slots).reduce((n, s) => n + Object.keys(s).length, 0);
  if (puzzles !== expected) fail(`${tag}: ${puzzles} puzzles played but ${expected} were dealt`);

  history.caught[plan.creature] = true;
  history.runs++;
  stats.finished++;
  stats.words += words;
  stats.puzzles += puzzles;
  const end = Number(story.variablesState.minutes);
  stats.minutes += end - (Number((pack.game.clock || {}).start) || 540);
  if (end > (Number((pack.game.clock || {}).sunset) || 1125)) stats.late++;
  for (const card of Object.values(pack.scenes)) {
    for (const st of card.stitches) if (story.state.VisitCountAtPathString(`${card.knot}.${st}`) > 0) visited.add(`${card.id}.${st}`);
  }
  for (const [id, slots] of Object.entries(plan.slots)) for (const [slot, spec] of Object.entries(slots)) {
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
  if (history.runs >= creatureCount + 3) history = newHistory();
  const seed = 1000 + Math.floor(bot.next() * 9000);
  const plan = deal(pack, seed, history);
  // Same number, same history: same run.
  if (JSON.stringify(plan) !== JSON.stringify(deal(pack, seed, history))) fail(`quest ${seed}: dealing twice gave two different runs`);
  if (new Set(plan.places).size !== plan.places.length) fail(`quest ${seed}: a place was dealt twice`);
  const uncaught = Object.keys(pack.creatures).filter((id) => !history.caught[id]);
  if (uncaught.length && !uncaught.includes(plan.creature)) fail(`quest ${seed}: dealt ${plan.creature}, already caught, while ${uncaught.join(', ')} still to find`);
  if (itinerary(pack, plan).length !== plan.places.length + 3) fail(`quest ${seed}: wrong number of stops`);
  await playRun(plan, history, bot);
}
const dealtRuns = stats.played;

// 4b. Every creature, in every place, with every puzzle its slots can hold.
const run = pack.game.run;
let combos = 0;
for (const creature of Object.keys(pack.creatures)) {
  const lair = pack.scenes[pack.creatures[creature].lair];
  for (const place of run.pool) {
    for (const hubSlots of slotCombos(pack.scenes[run.hub])) for (const placeSlots of slotCombos(pack.scenes[place])) for (const lairSlots of slotCombos(lair)) {
      const force = { creature, places: [place], slots: { [run.hub]: hubSlots, [place]: placeSlots, [lair.id]: lairSlots } };
      for (let again = 0; again < 3; again++) {
        await playRun(deal(pack, 1000 + combos * 3 + again, newHistory(), force), newHistory(), bot);
      }
      combos++;
    }
  }
}

// 4c. Nothing unreachable, and every puzzle option actually gets dealt.
for (const card of Object.values(pack.scenes)) {
  for (const st of card.stitches) if (!visited.has(`${card.id}.${st}`)) fail(`scenes/${card.id}.ink: no run ever reached "= ${st}"`);
  for (const [slot, options] of Object.entries(card.slots)) for (const spec of options) {
    if (!dealtCount[`${card.id}.${slot}=${spec.puzzle}`]) fail(`scenes/${card.id}.yaml: ${spec.puzzle} in slot "${slot}" was never dealt`);
  }
}

// ---------------------------------------------------------------------------

const n = stats.finished || 1;
const places = Math.min(Number(run.places_per_run) || 1, run.pool.length);
console.log(`${game}: ${stats.finished}/${stats.played} runs finished (${dealtRuns} dealt, ${combos} combinations x3, ${stats.resumes} quit-and-continue)`);
console.log(`pack: ${Object.keys(pack.scenes).length} scene cards, ${run.pool.length} in the pool, ${creatureCount} creature${creatureCount === 1 ? '' : 's'}, ${drawn.length} drawn + ${pack.pngs.length} photo scenes`);
if (run.pool.length < Number(run.places_per_run)) console.log(`note: the pool has ${run.pool.length} place${run.pool.length === 1 ? '' : 's'}, so a run visits ${places}, not ${run.places_per_run}`);
console.log(`avg ${Math.round(stats.words / n)} words, ${(stats.puzzles / n).toFixed(1)} puzzles, ${(stats.choices / stats.played).toFixed(1)} choices; ${measured} question templates fit the card`);
console.log(`game clock: avg ${Math.round(stats.minutes / n)} minutes used, ${stats.late} of ${stats.finished} runs home after sunset`);
console.log(`estimated playtime: ~${(stats.words / n / WORDS_PER_MIN + ((stats.puzzles / n) * SECONDS_PER_PUZZLE) / 60).toFixed(1)} minutes`);
if (stats.finished < stats.played) fail(`${stats.played - stats.finished} runs did not finish`);
finish();
