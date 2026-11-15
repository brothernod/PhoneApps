// @ts-check
// One quest, start to finish. The dealer's plan says what was dealt; the
// player decides the route and names the creature. This file drives the ink
// through each stop and hands every line, choice, map, lineup, and puzzle to
// a `ui`. The game passes its screen; the bot playtester passes a robot.
// No screen code here.
//
// The stages of a run:
//   hub      the briefing, with the first clue
//   place    as many as the plan has stops; before each, the map offers places
//   case     the case file: name the creature from the lineup. A wrong name
//            is a detour to that creature's lair, then back to the lineup
//   lair     the right creature's own card: the reveal and the rescue
//   home     the hub's ending: the lock, the creature caught, the run rated

import { offers } from './dealer.js';
import { playPuzzle } from './puzzles.js';
import { traitKeys, traitValue, eventFits } from './pack.js';
import { makeRng, fill, clock } from './util.js';

/** Toys a lair card can ask for with "# toy: <name>". The screen plays them. */
export const TOYS = ['spot', 'taps', 'pulse', 'song', 'rub'];

/**
 * @typedef {{ id: string, name: string, drive: number, at: number[], stars: number, tries: number }} MapPlace
 * @typedef {{ pic: string, prompt: string, here: number[] | null, offers: MapPlace[], visited: MapPlace[], labels: string[] }} MapView
 * @typedef {ReturnType<typeof casebook>} BookView
 *
 * @typedef {{
 *   line: (text: string, cls?: string) => Promise<void>,
 *   clear: () => Promise<void>,
 *   pic: (name: string) => void,
 *   tune: (name: string) => void,
 *   cue: (name: string) => void,
 *   travel: (disk: number, disks: number) => Promise<void>,
 *   choose: (labels: string[]) => Promise<number>,
 *   map: (view: MapView) => Promise<number>,
 *   lineup: (view: BookView) => Promise<string>,
 *   toy: (toy: Record<string, any>) => Promise<void>,
 *   status: (s: { quest: number, minutes: number, clues: number }) => void,
 *   card: import('./puzzles.js').Card,
 * }} QuestUi
 *
 * What a saved game remembers besides the ink state.
 * @typedef {{ step: number, entered: boolean, drove: boolean, event: string, eventsDone: string[], puzzleN: number, toyN: number, disk: number,
 *   clues: string[], sign: boolean, digits: number, route: string[],
 *   crossed: string[], wrong: string[], named: string,
 *   stars: Record<string, number>, tries: Record<string, number>,
 *   caught: boolean, egg: number }} QuestState
 *
 * @typedef {{
 *   level: (skill: string) => number,
 *   learned: (kind: string, id: string) => void,
 *   result: (res: { pass: boolean, firstTry: boolean, skill: string, type: string }) => void,
 *   caught: (creature: string) => void,
 *   rated: (creature: string, rating: ReturnType<typeof rate>) => void,
 *   checkpoint: () => void,
 *   problem?: (msg: string) => void,
 * }} QuestHooks
 */

/** @returns {QuestState} */
export const newQuestState = () => ({
  step: 0, entered: false, drove: false, event: '', eventsDone: [], puzzleN: 0, toyN: 0, disk: 1,
  clues: [], sign: false, digits: 0, route: [],
  crossed: [], wrong: [], named: '',
  stars: {}, tries: {},
  caught: false, egg: 0,
});

// Plain wording for what the engine says itself. A pack's words: replace any of these.
const WORDS = {
  clue: 'CLUE: it {clue}.',
  sign: 'ONE MORE THING: {sign}.',
  digit: 'LOCK NUMBER {n} of {total}: {digit}.',
  star: 'FIRST TRY! You earned a star.',
  map_prompt: 'WHERE TO?',
  map_place: '{name}: {drive} MIN',
  map_lair: 'THIS IS THE SPOT!',
  case_free: 'One clue was still missing, so here it is.',
  case_right: 'Every clue fits!',
  case_wrong: 'A real {based_on} {theirs}. But your clue says: it {yours}.',
  case_back: 'BACK TO THE CASE FILE',
  rate_stars: 'FIRST-TRY STARS: {stars} of {puzzles}',
  rate_pick_yes: 'NAMED IT ON THE FIRST PICK: YES',
  rate_pick_no: 'NAMED IT ON THE FIRST PICK: NO',
  rate_early: 'HOME {left} BEFORE SUNSET',
  rate_late: 'HOME AFTER SUNSET',
  rate_egg: 'YOU EARNED A {egg}!',
};

const sum = (obj) => Object.values(obj || {}).reduce((a, b) => a + b, 0);

/** Names a line about one creature may use: the cast, plus that creature's own words. */
function namesFor(pack, creature) {
  const names = { ...pack.cast };
  for (const [k, v] of Object.entries(creature || {})) if (typeof v === 'string') names[k] = v;
  return names;
}

/** 135 -> "2 HOURS 15 MIN" */
function span(minutes) {
  const h = Math.floor(minutes / 60), m = Math.round(minutes % 60);
  return [h ? `${h} HOUR${h === 1 ? '' : 'S'}` : '', m || !h ? `${m} MIN` : ''].filter(Boolean).join(' ');
}

/**
 * Set the story's variables for a new run. Call once, before the first step.
 * @param {any} story
 * @param {{ runs: number, caught: number }} history
 */
export function startStory(story, pack, history) {
  const clockCfg = pack.game.clock || {};
  story.variablesState.minutes = Number(clockCfg.start) || 540;
  story.variablesState.runs = history.runs;
  story.variablesState.caught = history.caught;
}

/**
 * The casebook: everything the player has found so far, and the lineup of
 * creatures with the ones he has crossed out. The case file shows the same view.
 * @param {import('./pack.js').Pack} pack
 * @param {import('./dealer.js').Plan} plan
 * @param {QuestState} state
 */
export function casebook(pack, plan, state) {
  const words = { ...WORDS, ...pack.words };
  const creature = pack.creatures[plan.creature];
  const keys = traitKeys(pack);
  const place = (id) => ({ name: pack.scenes[id].name || id, stars: state.stars[id] || 0, tries: state.tries[id] || 0 });
  return {
    clues: state.clues.map((k) => {
      const v = traitValue(pack, creature, k);
      return { title: v.title, label: v.label, text: fill(words.clue, { ...pack.cast, clue: v.clue }) };
    }),
    cluesTotal: keys.length,
    sign: state.sign && creature.sign ? fill(words.sign, { ...pack.cast, sign: fill(creature.sign, pack.cast) }) : '',
    digits: plan.lock.map((d, i) => (i < state.digits ? d : null)),
    places: state.route.map(place),
    stars: sum(state.stars),
    lineup: Object.keys(pack.creatures).map((id) => ({
      id,
      name: pack.creatures[id].name || id,
      sprite: pack.creatures[id].sprite || null,
      traits: keys.map((k) => { const v = traitValue(pack, pack.creatures[id], k); return { title: v.title, label: v.label }; }),
      crossed: state.crossed.includes(id),
      wrong: state.wrong.includes(id),
    })),
  };
}

/** Cross a creature out in the casebook, or bring it back. One he named wrongly stays out. */
export function toggleCrossed(state, id) {
  if (state.wrong.includes(id)) return;
  const i = state.crossed.indexOf(id);
  if (i >= 0) state.crossed.splice(i, 1); else state.crossed.push(id);
}

/**
 * Rate a run: the first egg under rating.eggs whose conditions it meets.
 * stars is the share of puzzles solved on the first try.
 * @param {import('./pack.js').Pack} pack
 * @param {QuestState} state
 * @param {number} minutes  the clock when the run came home
 */
export function rate(pack, state, minutes) {
  const eggs = (pack.game.rating || {}).eggs || [{ id: 'done', name: 'DONE' }];
  const sunset = Number((pack.game.clock || {}).sunset) || 1125;
  const stars = sum(state.stars), puzzles = sum(state.tries);
  const firstPick = state.wrong.length === 0;
  const before = minutes <= sunset;
  let i = eggs.findIndex((e) => (!e.stars || stars >= e.stars * puzzles) && (!e.first_pick || firstPick) && (!e.before_sunset || before));
  if (i < 0) i = eggs.length - 1;
  return { egg: eggs[i], rank: eggs.length - i, stars, puzzles, firstPick, before, left: sunset - minutes };
}

/**
 * Play a quest from wherever `state` says it is.
 * @param {{ pack: import('./pack.js').Pack, plan: import('./dealer.js').Plan, story: any,
 *   state: QuestState, ui: QuestUi, hooks: QuestHooks }} q
 */
export async function runQuest({ pack, plan, story, state, ui, hooks }) {
  const run = pack.game.run || {};
  const hub = pack.scenes[run.hub];
  const vars = story.variablesState;
  const creature = pack.creatures[plan.creature];
  const lair = pack.scenes[creature.lair];
  const words = { ...WORDS, ...pack.words };
  const problem = hooks.problem || (() => {});
  const disks = plan.stops + 3;
  const stages = ['hub', ...Array.from({ length: plan.stops }, () => 'place'), 'case', 'lair', 'home'];

  // Names are set every time, so an older save can't bring back different ones.
  for (const [role, name] of Object.entries(pack.cast)) vars[role] = name;
  vars.sunset = Number((pack.game.clock || {}).sunset) || 1125;
  const names = namesFor(pack, creature);
  const say = (key, more = {}, cls) => ui.line(fill(words[key], { ...names, ...more }), cls);

  const status = () => ui.status({ quest: plan.seed, minutes: Number(vars.minutes) || 0, clues: state.clues.length });
  const sync = () => { vars.clues = state.clues.length; vars.stars = sum(state.stars); vars.detours = state.wrong.length; vars.egg = state.egg; };
  sync();
  status();

  /** One place as the map shows it. */
  const onMap = (id, at, name, drive) => ({
    id, at, name, drive: Number(drive) || 0,
    stars: state.stars[id] || 0, tries: state.tries[id] || 0,
  });
  const cardOnMap = (card) => onMap(card.id, card.map || [0, 0], card.name || card.id, card.drive);
  /** Where the van is now: a wrong lair it just drove to, the last place visited, or the hub. */
  let wentTo = /** @type {number[] | null} */ (null);
  const here = () => wentTo || (pack.scenes[state.route[state.route.length - 1]] || hub).map || null;
  /** @returns {MapView} */
  const mapView = (places, prompt) => ({
    pic: (pack.game.pics || {}).map || '',
    prompt,
    here: here(),
    offers: places,
    visited: state.route.filter((id) => !places.some((p) => p.id === id)).map((id) => cardOnMap(pack.scenes[id])),
    labels: places.map((p) => fill(words.map_place, { ...names, name: p.name, drive: String(p.drive) })),
  });

  /** A disk swap and the drive. A detour reads the next disk without keeping it. */
  async function drive(minutes, keep = true) {
    await ui.travel(Math.min(state.disk + 1, disks), disks);
    if (keep) state.disk++;
    vars.minutes = Number(vars.minutes) + (Number(minutes) || 0);
    status();
  }

  /** Reveal the next clue: the creature's traits in the dealt order, then its sign. */
  async function giveClue(where) {
    const key = plan.clues[state.clues.length];
    if (key) {
      const trait = (creature.traits || {})[key] || {};
      state.clues.push(key);
      if (trait.found) await ui.line(fill(trait.found, names));
      await say('clue', { clue: traitValue(pack, creature, key).clue }, 'good');
    } else if (creature.sign && !state.sign) {
      state.sign = true;
      await say('sign', { sign: fill(creature.sign, names) }, 'good');
    } else problem(`${where}: a "# clue" tag with no clue left to give`);
  }

  /** Play the ink from where it stands until this card hands back. */
  async function playCard(card) {
    /** @type {string | null} */
    let pendingSlot = null;
    for (;;) {
      while (story.canContinue) {
        const line = story.Continue().trim();
        const tags = (story.currentTags || []).map((t) => String(t).trim());
        const tag = (key) => tags.filter((t) => t === key || t.startsWith(key + ':')).map((t) => t.slice(key.length + 1).trim());

        if (tag('clear').length) await ui.clear();
        for (const p of tag('pic')) ui.pic(p);
        for (const t of tag('tune')) ui.tune(t);
        if (line) await ui.line(line);
        for (const c of tag('cue')) ui.cue(c);
        for (const _ of tag('clue')) await giveClue(card.id);
        for (const _ of tag('digit')) {
          // One lock digit per stop, in the order the places are visited.
          const digit = plan.lock[state.digits];
          if (digit === undefined) { problem(`${card.id}: a "# digit" tag with no lock digit left to give`); continue; }
          state.digits++;
          await say('digit', { digit: String(digit), n: String(state.digits), total: String(plan.lock.length) }, 'good');
        }
        for (const name of tag('toy')) {
          const toy = card.toys[name];
          if (!toy) { problem(`${card.id}: "# toy: ${name}" is not in ${card.id}.yaml`); continue; }
          const rng = makeRng(plan.seed * 104729 + ++state.toyN);
          /** @type {Record<string, any>} */
          const made = {};
          for (const [k, v] of Object.entries(toy)) made[k] = typeof v === 'string' ? fill(v, names) : v;
          if (toy.kind === 'taps') made.n = rng.int(toy.count[0], toy.count[1]);
          // A song: the first round goes up the keys in order, the rest are dealt.
          if (toy.kind === 'song') {
            made.rounds = toy.notes.map((n, round) => Array.from({ length: n }, (_, i) => (round ? rng.int(0, toy.keys.length - 1) : i % toy.keys.length)));
          }
          await ui.toy(made);
        }
        for (const _ of tag('caught')) {
          if (!state.caught) { state.caught = true; hooks.caught(plan.creature); }
          for (const text of pack.words.caught || ['{name}']) await ui.line(fill(text, names));
        }
        for (const _ of tag('rate')) {
          const r = rate(pack, state, Number(vars.minutes));
          if (!state.egg) { state.egg = r.rank; hooks.rated(plan.creature, r); }
          if (r.egg.pic) ui.pic(r.egg.pic);
          await say('rate_stars', { stars: String(r.stars), puzzles: String(r.puzzles) });
          await say(r.firstPick ? 'rate_pick_yes' : 'rate_pick_no');
          await say(r.before ? 'rate_early' : 'rate_late', { left: span(Math.max(0, r.left)), time: clock(Number(vars.minutes)) });
          await say('rate_egg', { egg: r.egg.name }, 'good');
        }
        for (const s of tag('slot')) pendingSlot = s;
        sync();
        status();
      }

      const choices = story.currentChoices;
      if (!choices.length) break; // this card is done

      // A puzzle answers the hidden [@pass] / [@fail] choices.
      const passIdx = choices.findIndex((c) => c.text.trim() === '@pass');
      const failIdx = choices.findIndex((c) => c.text.trim() === '@fail');
      if (passIdx >= 0 && failIdx >= 0) {
        const slot = pendingSlot;
        pendingSlot = null;
        const spec = slot ? (plan.slots[card.id] || {})[slot] : null;
        let pass = true;
        if (spec) {
          const res = await playPuzzle(spec, {
            card: ui.card,
            cue: ui.cue,
            say: ui.line,
            banks: pack.banks,
            names: pack.cast,
            rng: makeRng(plan.seed * 7919 + ++state.puzzleN),
            level: hooks.level,
            learned: hooks.learned,
            run: { digits: plan.lock.slice(0, state.digits) },
          });
          hooks.result(res);
          pass = res.pass;
          // A first-try solve earns a star for this stop.
          state.tries[card.id] = (state.tries[card.id] || 0) + 1;
          if (res.firstTry) {
            state.stars[card.id] = (state.stars[card.id] || 0) + 1;
            await say('star', {}, 'star');
          }
          sync();
        } else {
          problem(`${card.id}: [@pass]/[@fail] choices without a dealt "# slot:" puzzle`);
          await ui.line('(A puzzle is missing here. Skipping it.)', 'dim');
        }
        story.ChooseChoiceIndex(pass ? passIdx : failIdx);
        continue;
      }
      if (pendingSlot) { problem(`${card.id}: "# slot: ${pendingSlot}" is not followed by [@pass] and [@fail] choices`); pendingSlot = null; }

      // Hidden choices start with @. A blank one is ink's fallback ("* -> next"),
      // which a reloaded save lists like any other; ink takes it by itself
      // once nothing else is left.
      const visible = choices.filter((c) => c.text.trim() && !c.text.trim().startsWith('@'));
      if (!visible.length) { problem(`${card.id}: only hidden @ choices left (dead end)`); break; }
      hooks.checkpoint();
      const pick = await ui.choose(visible.map((c) => c.text.trim()));
      await ui.line(`> ${visible[pick].text.trim()}`, 'echo');
      story.ChooseChoiceIndex(visible[pick].index);
    }
  }

  /** What happens on this drive, if anything: the next event in the deck that fits where the van is going. */
  const road = pack.scenes[run.events];
  const eventFor = (card, leg) => {
    if (!road || !(plan.eventLegs || []).includes(leg)) return '';
    return (plan.events || []).find((id) => !state.eventsDone.includes(id) && road.events[id] && eventFits(road.events[id], card)) || '';
  };

  /**
   * Go to a card and play it. `arrive` is the drive there, and `leg` is the
   * number of that drive (see the dealer): something may happen on the way.
   * A saved game picks up where it was: partway there, or already in the card.
   */
  async function visit(card, path, arrive, leg = -1) {
    if (!state.entered) {
      if (!state.drove) {
        if (arrive) await arrive();
        state.drove = true;
        state.event = leg >= 0 ? eventFor(card, leg) : '';
        if (state.event) story.ChoosePathString(`${road.knot}.${state.event}`);
      }
      if (state.event) {
        await playCard(road);
        state.eventsDone.push(state.event);
        state.event = '';
      }
      story.ChoosePathString(path);
      state.entered = true;
    }
    await playCard(card);
  }

  /** He named the wrong creature: a trip to its lair, where a real animal lives. */
  async function detour(id) {
    const other = pack.creatures[id];
    const d = other.detour || {};
    const otherLair = pack.scenes[other.lair];
    const theirs = namesFor(pack, other);
    const at = d.map || (otherLair && otherLair.map);
    const place = d.place || (otherLair && otherLair.name) || other.name;
    if (at) await ui.map(mapView([onMap(id, at, place, Number(d.drive) || 30)], fill(words.map_lair, theirs)));
    await drive(Number(d.drive) || 30, false);
    wentTo = at || null;
    await ui.clear();
    if (d.pic) ui.pic(d.pic);
    for (const text of d.lines || []) await ui.line(fill(text, theirs));
    // The first clue that doesn't fit the creature he named.
    const key = state.clues.find((k) => traitValue(pack, other, k).is !== traitValue(pack, creature, k).is);
    ui.cue('miss');
    if (key) await ui.line(fill(words.case_wrong, { ...theirs, theirs: traitValue(pack, other, key).clue, yours: traitValue(pack, creature, key).clue }), 'hint');
    if (d.fact) await ui.line(fill(d.fact, theirs), 'good');
    state.wrong.push(id);
    if (!state.crossed.includes(id)) state.crossed.push(id);
    sync();
    await ui.choose([fill(words.case_back, names)]);
  }

  for (; state.step < stages.length; state.step++, state.entered = false, state.drove = false) {
    const stage = stages[state.step];

    if (stage === 'hub') {
      await visit(hub, hub.knot);
    } else if (stage === 'place') {
      // The map: he picks the next stop from the places on offer.
      if (state.route.length < state.step) {
        const offer = offers(plan, state.route);
        if (!offer.length) { problem(`no place left to offer for stop ${state.step}`); continue; }
        hooks.checkpoint();
        const pick = await ui.map(mapView(offer.map((id) => cardOnMap(pack.scenes[id])), fill(words.map_prompt, names)));
        state.route.push(offer[pick] || offer[0]);
      }
      const card = pack.scenes[state.route[state.step - 1]];
      await visit(card, card.knot, () => drive(card.drive), state.step - 1);
    } else if (stage === 'case') {
      await visit(hub, `${hub.knot}.${hub.casefile}`);
      // Every trait must be known before he is asked to name the creature.
      if (state.clues.length < plan.clues.length) {
        problem(`the case file opened with ${state.clues.length} of ${plan.clues.length} clues found`);
        await say('case_free', {}, 'dim');
        while (state.clues.length < plan.clues.length) await giveClue('case file');
        sync(); status();
      }
      while (!state.named) {
        hooks.checkpoint();
        const pick = await ui.lineup(casebook(pack, plan, state));
        if (pick === plan.creature) {
          state.named = pick;
          ui.cue('right');
          await say('case_right', {}, 'good');
        } else if (pack.creatures[pick] && !state.wrong.includes(pick)) {
          await detour(pick);
        }
      }
    } else if (stage === 'lair') {
      await visit(lair, lair.knot, async () => {
        await ui.map(mapView([cardOnMap(lair)], fill(words.map_lair, names)));
        await drive(lair.drive);
      }, plan.stops);
    } else if (stage === 'home') {
      await visit(hub, `${hub.knot}.${hub.finish}`, () => drive(hub.drive));
    }
  }
}
