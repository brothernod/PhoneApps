// @ts-check
// Game packs. A game is one folder: game.yaml, creatures.yaml, banks.yaml,
// scenes/<id>.ink + scenes/<id>.yaml, and pics/. This module loads a pack,
// stitches its scene cards into one ink story, and checks that every
// reference in it points at something real. No screen code here, so the bot
// playtester uses the same loader as the game.

const TAGS = ['slot', 'pic', 'tune', 'cue'];

/** "big-rock" -> "scene_big_rock", the ink knot a card becomes. */
export const knotName = (id) => 'scene_' + String(id).replace(/[^A-Za-z0-9]/g, '_');

/**
 * @typedef {{ id: string, name?: string, role: 'hub'|'place'|'lair', drive?: number, finish?: string,
 *   slots: Record<string, any[]>, ink: string, knot: string,
 *   tags: Record<string, string[]>, clueTags: number, stitches: string[] }} SceneCard
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
  const ids = [...new Set([run.hub, ...(run.pool || []), ...Object.values(creatures).map((c) => c && c.lair)].filter(Boolean))];
  /** @type {Record<string, SceneCard>} */
  const scenes = {};
  await Promise.all(ids.map(async (sid) => {
    const [meta, ink] = await Promise.all([data(`scenes/${sid}.yaml`), text(`scenes/${sid}.ink`)]);
    scenes[sid] = { ...meta, id: sid, slots: meta.slots || {}, ink, knot: knotName(sid), ...scanInk(ink) };
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
  let clueTags = 0;
  for (const raw of ink.split('\n')) {
    const line = raw.replace(/\/\/.*$/, '');
    const st = /^\s*=\s*([A-Za-z_]\w*)\s*$/.exec(line);
    if (st) stitches.push(st[1]);
    for (const part of line.split('#').slice(1)) {
      const t = part.trim();
      if (t === 'clue') clueTags++;
      for (const key of TAGS) if (t.startsWith(key + ':')) tags[key].push(t.slice(key.length + 1).trim());
    }
  }
  return { tags, stitches, clueTags };
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

/**
 * Check the pack's data against itself. Returns a list of problems, empty
 * when the pack is sound. The game shows them on the boot screen; the bot
 * fails the build on them.
 * @param {Pack} pack
 * @param {{ archetypes: Record<string, any>, pictures?: string[] }} known
 */
export function checkPack(pack, known) {
  const problems = [];
  const bad = (msg) => problems.push(msg);
  const run = pack.game.run || {};
  const ident = /^[A-Za-z_]\w*$/;

  if (!pack.game.title) bad('game.yaml: missing title');
  for (const role of Object.keys(pack.cast)) if (!ident.test(role)) bad(`game.yaml: cast role "${role}" must be one plain word`);
  if (!run.hub) bad('game.yaml: run.hub is missing');
  if (!Array.isArray(run.pool) || !run.pool.length) bad('game.yaml: run.pool needs at least one place');
  if (!(Number(run.places_per_run) >= 1)) bad('game.yaml: run.places_per_run must be 1 or more');

  const hub = pack.scenes[run.hub];
  if (hub) {
    if (hub.role !== 'hub') bad(`scenes/${hub.id}.yaml: the hub card needs role: hub`);
    if (!hub.finish || !hub.stitches.includes(hub.finish)) bad(`scenes/${hub.id}.yaml: finish: must name a "= part" of ${hub.id}.ink`);
  }
  for (const id of run.pool || []) {
    if (pack.scenes[id] && pack.scenes[id].role !== 'place') bad(`scenes/${id}.yaml: a pool card needs role: place`);
  }

  const creatureIds = Object.keys(pack.creatures);
  if (!creatureIds.length) bad('creatures.yaml: no creatures');
  for (const id of creatureIds) {
    const c = pack.creatures[id] || {};
    if (!c.name) bad(`creatures.yaml: ${id} has no name`);
    if (!c.lair) bad(`creatures.yaml: ${id} has no lair`);
    else if (pack.scenes[c.lair] && pack.scenes[c.lair].role !== 'lair') bad(`scenes/${c.lair}.yaml: a lair card needs role: lair`);
    const traits = Object.entries(c.traits || {});
    if (!traits.length) bad(`creatures.yaml: ${id} has no traits`);
    for (const [t, v] of traits) if (!v || !v.clue) bad(`creatures.yaml: ${id}.traits.${t} needs a clue line`);
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
    for (const t of new Set([...card.tags.tune, ...card.tags.cue])) if (!tunes[t]) bad(`${where}.ink: tune or cue "${t}" is not in banks.yaml`);
    if (known.pictures) for (const p of new Set(card.tags.pic)) if (!known.pictures.includes(p)) bad(`${where}.ink: "# pic: ${p}" has no picture`);
  }
  const title = (pack.game.pics || {}).title;
  if (known.pictures && title && !known.pictures.includes(title)) bad(`game.yaml: pics.title "${title}" has no picture`);
  return problems;
}
