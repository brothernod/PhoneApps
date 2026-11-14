// @ts-check
// Game packs. A game is one folder: game.yaml, creatures.yaml, banks.yaml,
// scenes/<id>.ink + scenes/<id>.yaml, and pics/. This module loads a pack,
// stitches its scene cards into one ink story, and checks that every
// reference in it points at something real. No screen code here, so the bot
// playtester uses the same loader as the game.

const TAGS = ['slot', 'pic', 'tune', 'cue', 'toy'];
const COUNTED = ['clue', 'digit', 'caught', 'rate'];

/** "big-rock" -> "scene_big_rock", the ink knot a card becomes. */
export const knotName = (id) => 'scene_' + String(id).replace(/[^A-Za-z0-9]/g, '_');

/**
 * @typedef {{ id: string, name?: string, role: 'hub'|'place'|'lair', drive?: number, finish?: string, casefile?: string,
 *   map?: number[], slots: Record<string, any[]>, toys: Record<string, any>, ink: string, knot: string,
 *   tags: Record<string, string[]>, count: Record<string, number>, stitches: string[] }} SceneCard
 * @typedef {{ id: string, game: any, cast: Record<string,string>, words: Record<string, any>,
 *   creatures: Record<string, any>, banks: any, scenes: Record<string, SceneCard>,
 *   pngs: string[], files: string[], ink: { source: string, map: {from: number, file: string}[] } }} Pack
 */

/**
 * Load a pack.
 * @param {string} id  the folder name under games/
 * @param {(path: string) => Promise<string>} read  reads a text file inside the pack
 * @param {{ load: (text: string) => any }} yaml
 * @returns {Promise<Pack>}
 */
export async function loadPack(id, read, yaml) {
  const files = [];
  const text = async (path) => { files.push(path); return read(path); };
  const data = async (path) => {
    const src = await text(path);
    try { return yaml.load(src) || {}; } catch (e) { throw new Error(`${path}: ${e.message}`); }
  };

  const game = await data('game.yaml');
  const run = game.run || {};
  const [creatures, banks] = await Promise.all([data('creatures.yaml'), data('banks.yaml')]);

  // Every card the game can reach: the hub, the pool, and each creature's lair.
  // A creature with no lair yet stays in the lineup but can't hatch.
  const ids = [...new Set([run.hub, ...(run.pool || []), ...Object.values(creatures).map((c) => c && c.lair)].filter(Boolean))];
  /** @type {Record<string, SceneCard>} */
  const scenes = {};
  await Promise.all(ids.map(async (sid) => {
    const [meta, ink] = await Promise.all([data(`scenes/${sid}.yaml`), text(`scenes/${sid}.ink`)]);
    scenes[sid] = { ...meta, id: sid, slots: meta.slots || {}, toys: meta.toys || {}, ink, knot: knotName(sid), ...scanInk(ink) };
  }));

  const pics = game.pics || {};
  const pngs = pics.png || [];
  for (const p of pngs) files.push(`pics/${p}.png`);
  if (pics.drawn) files.push(pics.drawn);

  /** @type {Pack} */
  const pack = {
    id, game, creatures, banks, scenes, pngs, files,
    cast: game.cast || {},
    words: game.words || {},
    ink: { source: '', map: [] },
  };
  pack.ink = buildInk(pack, ids);
  return pack;
}

/** Find the tags and stitches in one card's ink, skipping // comments. */
function scanInk(ink) {
  /** @type {Record<string, string[]>} */
  const tags = Object.fromEntries(TAGS.map((t) => [t, []]));
  const stitches = [];
  /** @type {Record<string, number>} */
  const count = Object.fromEntries(COUNTED.map((t) => [t, 0]));
  for (const raw of ink.split('\n')) {
    const line = raw.replace(/\/\/.*$/, '');
    const st = /^\s*=\s*([A-Za-z_]\w*)\s*$/.exec(line);
    if (st) stitches.push(st[1]);
    for (const part of line.split('#').slice(1)) {
      const t = part.trim();
      if (t in count) count[t]++;
      for (const key of TAGS) if (t.startsWith(key + ':')) tags[key].push(t.slice(key.length + 1).trim());
    }
  }
  return { tags, stitches, count };
}

/**
 * One ink story from all the cards. Each card becomes a knot, so a card's own
 * "= parts" stay private to it. The engine, not the ink, moves between cards.
 */
function buildInk(pack, ids) {
  const clock = pack.game.clock || {};
  const head = [
    ...Object.keys(pack.cast).map((role) => `VAR ${role} = ""`),
    `VAR minutes = ${Number(clock.start) || 540}`,
    `VAR sunset = ${Number(clock.sunset) || 1125}`,
    'VAR clues = 0',
    'VAR runs = 0',
    'VAR caught = 0',
    'VAR stars = 0',        // puzzles solved on the first try this run
    'VAR detours = 0',      // wrong picks in the case file this run
    'VAR egg = 0',          // this run's rating once "# rate" has played; higher is better
    '-> DONE',
  ];
  const lines = [...head];
  const map = [{ from: 1, file: '(engine)' }];
  for (const id of ids) {
    lines.push(`=== ${knotName(id)} ===`);
    map.push({ from: lines.length + 1, file: `scenes/${id}.ink` });
    lines.push(...pack.scenes[id].ink.split('\n'));
    lines.push('-> DONE'); // a card that runs off its end hands back to the engine
  }
  return { source: lines.join('\n'), map };
}

/**
 * Compile the pack's story. Errors name the card and the line inside it.
 * countAllVisits lets the bot ask which parts of each card a run reached.
 */
export function compileStory(pack, inkjs, { countAllVisits = false } = {}) {
  const compiler = new inkjs.Compiler(pack.ink.source, countAllVisits ? new inkjs.CompilerOptions(null, [], true) : undefined);
  try {
    return compiler.Compile();
  } catch (e) {
    const errs = (compiler.errors || []).map((msg) => String(msg).replace(/line (\d+)/, (whole, n) => {
      const entry = [...pack.ink.map].reverse().find((m) => Number(n) >= m.from);
      return entry ? `${entry.file} line ${Number(n) - entry.from + 1}` : whole;
    }));
    throw new Error(errs.join('\n') || e.message);
  }
}

/** Traits a clue can reveal, from traits: in game.yaml: { covering: { title, values: { scaly: { label, clue } } } }. */
export const traitKeys = (pack) => Object.keys(pack.game.traits || {});

/** The label and clue words for one creature's value of one trait. */
export function traitValue(pack, creature, key) {
  const def = (pack.game.traits || {})[key] || {};
  const is = ((creature.traits || {})[key] || {}).is;
  const v = (def.values || {})[is] || {};
  return { is, title: def.title || key, label: v.label || String(is), clue: v.clue || v.label || String(is) };
}

/** Creatures that can hatch: the ones whose lair card exists. */
export const hatchable = (pack) => Object.keys(pack.creatures).filter((id) => pack.scenes[pack.creatures[id].lair]);

/**
 * Check the pack's data against itself. Returns a list of problems, empty
 * when the pack is sound. The game shows them on the boot screen; the bot
 * fails the build on them.
 * @param {Pack} pack
 * @param {{ archetypes: Record<string, any>, toys?: string[], pictures?: string[] }} known
 */
export function checkPack(pack, known) {
  const problems = [];
  const bad = (msg) => problems.push(msg);
  const run = pack.game.run || {};
  const ident = /^[A-Za-z_]\w*$/;
  const spot = (v, n) => Array.isArray(v) && v.length === n && v.every((x) => Number.isFinite(x));
  const pic = (name, where) => { if (known.pictures && name && !known.pictures.includes(name)) bad(`${where}: picture "${name}" does not exist`); };

  if (!pack.game.title) bad('game.yaml: missing title');
  if (pack.game.version !== undefined && typeof pack.game.version !== 'string') bad('game.yaml: put version in quotes, like "0.1.1"');
  for (const role of Object.keys(pack.cast)) if (!ident.test(role)) bad(`game.yaml: cast role "${role}" must be one plain word`);
  if (!run.hub) bad('game.yaml: run.hub is missing');
  if (!Array.isArray(run.pool) || !run.pool.length) bad('game.yaml: run.pool needs at least one place');
  if (!(Number(run.places_per_run) >= 1)) bad('game.yaml: run.places_per_run must be 1 or more');

  // Traits: what the clues reveal and the lineup shows.
  const keys = traitKeys(pack);
  if (!keys.length) bad('game.yaml: traits: is missing. Clues need at least one trait');
  for (const k of keys) {
    const values = Object.entries((pack.game.traits[k] || {}).values || {});
    if (values.length < 2) bad(`game.yaml: traits.${k} needs at least two values`);
    for (const [name, v] of values) if (!v || !v.label || !v.clue) bad(`game.yaml: traits.${k}.values.${name} needs a label and a clue`);
  }

  // Rating: the eggs, best first. The last one must have no conditions.
  const eggs = (pack.game.rating || {}).eggs;
  if (!Array.isArray(eggs) || !eggs.length) bad('game.yaml: rating.eggs is missing');
  else {
    eggs.forEach((e, i) => {
      if (!e || !e.name) bad(`game.yaml: rating.eggs[${i + 1}] needs a name`);
      pic(e && e.pic, `game.yaml: rating.eggs[${i + 1}]`);
    });
    const last = eggs[eggs.length - 1] || {};
    if (last.stars || last.first_pick || last.before_sunset) bad('game.yaml: the last egg under rating.eggs must have no conditions, so every run earns one');
  }

  const hub = pack.scenes[run.hub];
  if (hub) {
    const at = `scenes/${hub.id}`;
    if (hub.role !== 'hub') bad(`${at}.yaml: the hub card needs role: hub`);
    if (!hub.finish || !hub.stitches.includes(hub.finish)) bad(`${at}.yaml: finish: must name a "= part" of ${hub.id}.ink`);
    if (!hub.casefile || !hub.stitches.includes(hub.casefile)) bad(`${at}.yaml: casefile: must name a "= part" of ${hub.id}.ink`);
    if (!hub.count.caught) bad(`${at}.ink: the ending needs a "# caught" tag`);
    if (!hub.count.rate) bad(`${at}.ink: the ending needs a "# rate" tag`);
    if (!spot(hub.map, 2)) bad(`${at}.yaml: map: needs [x, y], where the hub sits on the map picture`);
  }
  for (const id of run.pool || []) {
    const card = pack.scenes[id];
    if (!card) continue;
    if (card.role !== 'place') bad(`scenes/${id}.yaml: a pool card needs role: place`);
    if (!spot(card.map, 2)) bad(`scenes/${id}.yaml: map: needs [x, y], where the place sits on the map picture`);
    if (!card.count.clue) bad(`scenes/${id}.ink: a place needs a "# clue" tag`);
    if (!card.count.digit) bad(`scenes/${id}.ink: a place needs a "# digit" tag for the lock`);
  }

  const creatureIds = Object.keys(pack.creatures);
  if (!creatureIds.length) bad('creatures.yaml: no creatures');
  if (creatureIds.length && !hatchable(pack).length) bad('creatures.yaml: no creature has a lair, so nothing can hatch');
  /** @type {Record<string, string>} */
  const combos = {};
  for (const id of creatureIds) {
    const c = pack.creatures[id] || {};
    const at = `creatures.yaml: ${id}`;
    if (!c.name) bad(`${at} has no name`);
    if (c.lair) {
      const lair = pack.scenes[c.lair];
      if (lair && lair.role !== 'lair') bad(`scenes/${c.lair}.yaml: a lair card needs role: lair`);
      if (lair && !spot(lair.map, 2)) bad(`scenes/${c.lair}.yaml: map: needs [x, y]`);
    }
    for (const k of keys) {
      const t = (c.traits || {})[k];
      if (!t) { bad(`${at} has no "${k}" trait`); continue; }
      if (!((pack.game.traits[k] || {}).values || {})[t.is]) bad(`${at}.traits.${k}.is "${t.is}" is not a value of traits.${k} in game.yaml`);
      if (!t.found) bad(`${at}.traits.${k} needs a found: line`);
    }
    for (const k of Object.keys(c.traits || {})) if (!keys.includes(k)) bad(`${at}.traits.${k} is not a trait in game.yaml`);
    const combo = keys.map((k) => ((c.traits || {})[k] || {}).is).join(' + ');
    if (combos[combo]) bad(`${at} and ${combos[combo]} have the same traits (${combo}), so clues can't tell them apart`);
    combos[combo] = id;
    if (c.fact && !c.source) bad(`${at}: its fact has no source`);
    const d = c.detour;
    if (!d || !Array.isArray(d.lines) || !d.lines.length) bad(`${at} needs a detour: with lines:, for when it is named by mistake`);
    else {
      if (d.fact && !d.source) bad(`${at}.detour: its fact has no source`);
      if (d.map !== undefined && !spot(d.map, 2)) bad(`${at}.detour.map needs [x, y]`);
      pic(d.pic, `${at}.detour`);
    }
  }

  const tunes = pack.banks.tunes || {};
  for (const card of Object.values(pack.scenes)) {
    const where = `scenes/${card.id}`;
    const slotNames = Object.keys(card.slots);
    for (const s of new Set(card.tags.slot)) if (!slotNames.includes(s)) bad(`${where}.ink: "# slot: ${s}" is not listed under slots: in ${card.id}.yaml`);
    for (const s of slotNames) {
      if (!card.tags.slot.includes(s)) bad(`${where}.yaml: slot "${s}" is never used in ${card.id}.ink`);
      const options = card.slots[s];
      if (!Array.isArray(options) || !options.length) { bad(`${where}.yaml: slot "${s}" needs at least one puzzle`); continue; }
      for (const opt of options) {
        const kind = known.archetypes[opt && opt.puzzle];
        if (!kind) { bad(`${where}.yaml: slot "${s}" asks for puzzle "${opt && opt.puzzle}", which the engine doesn't have`); continue; }
        for (const msg of kind.check(opt, pack.banks)) bad(`${where}.yaml: slot "${s}": ${msg}`);
      }
    }
    const toyNames = Object.keys(card.toys);
    for (const t of new Set(card.tags.toy)) if (!toyNames.includes(t)) bad(`${where}.ink: "# toy: ${t}" is not listed under toys: in ${card.id}.yaml`);
    for (const t of toyNames) {
      const toy = card.toys[t] || {};
      if (!card.tags.toy.includes(t)) bad(`${where}.yaml: toy "${t}" is never used in ${card.id}.ink`);
      if (known.toys && !known.toys.includes(toy.kind)) bad(`${where}.yaml: toy "${t}" has kind "${toy.kind}", which the engine doesn't have`);
      if (toy.kind === 'spot' && !spot(toy.at, 4)) bad(`${where}.yaml: toy "${t}" needs at: [x, y, width, height]`);
      if (toy.kind === 'taps' && !(spot(toy.count, 2) && toy.count[0] >= 1 && toy.count[1] >= toy.count[0])) bad(`${where}.yaml: toy "${t}" needs count: [fewest, most]`);
      pic(toy.pic, `${where}.yaml: toy "${t}"`);
    }
    for (const t of new Set([...card.tags.tune, ...card.tags.cue])) if (!tunes[t]) bad(`${where}.ink: tune or cue "${t}" is not in banks.yaml`);
    for (const p of new Set(card.tags.pic)) pic(p, `${where}.ink`);
  }
  const pics = pack.game.pics || {};
  pic(pics.title, 'game.yaml: pics.title');
  if (!pics.map) bad('game.yaml: pics.map is missing. The map needs a picture');
  pic(pics.map, 'game.yaml: pics.map');
  return problems;
}
