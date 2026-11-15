// @ts-check
// The dealer. From one quest number it deals a whole run: which creature
// hatched, the order places come up on the map, which puzzle sits in each
// slot, the order the clues come out, and the lock digits. Same number and
// same history, same run. The player's own choices (which place, which
// creature he names) are not dealt; the quest keeps those.

import { makeRng, pickWeighted } from './util.js';
import { hatchable, traitKeys } from './pack.js';

/**
 * @typedef {{ seed: number, creature: string, stops: number, deck: string[],
 *   slots: Record<string, Record<string, any>>, clues: string[], lock: number[] }} Plan
 */

/**
 * @param {import('./pack.js').Pack} pack
 * @param {number} seed
 * @param {{ caught?: Record<string, any>, recent?: string[] }} [history]  what the player has done before
 * @param {{ creature?: string, deck?: string[], slots?: Record<string, Record<string, number>>, events?: string[], eventLegs?: number[] }} [force]
 *   fixed picks, for replaying or testing one combination
 * @returns {Plan}
 */
export function deal(pack, seed, history = {}, force = {}) {
  const rng = makeRng(seed);
  const run = pack.game.run || {};
  const caught = history.caught || {};

  // 1. A creature not caught yet. Once all are caught, one whose egg could
  //    still be better, so a replay can turn it gold.
  const all = hatchable(pack);
  const fresh = all.filter((id) => !caught[id]);
  const eggOf = (id) => Number((caught[id] || {}).egg) || 1;
  const lowest = Math.min(...all.map(eggOf));
  const creature = force.creature || rng.pick(fresh.length ? fresh : all.filter((id) => eggOf(id) === lowest));

  // 2. The pool, shuffled. The map offers two places at a time off the top
  //    (see offers), so a run can reach the first stops + 1 places of the deck.
  const deck = force.deck || rng.shuffle(run.pool || []);
  const stops = Math.min(Number(run.places_per_run) || 1, deck.length);
  const reachable = deck.slice(0, stops + 1);

  // 3. One puzzle per slot, leaning away from kinds played lately or
  //    already dealt into this run.
  const recent = history.recent || [];
  /** @type {Record<string, number>} */
  const dealt = {};
  /** @type {Record<string, Record<string, any>>} */
  const slots = {};
  for (const id of [run.hub, ...reachable, pack.creatures[creature].lair, run.events]) {
    const card = pack.scenes[id];
    if (!card) continue;
    slots[id] = {};
    for (const [name, options] of Object.entries(card.slots)) {
      const forced = force.slots && force.slots[id] && force.slots[id][name];
      const weights = options.map((o) => 1 / (1 + recent.filter((r) => r === o.puzzle).length + 2 * (dealt[o.puzzle] || 0)));
      const pick = forced !== undefined ? options[forced] : pickWeighted(rng, options, weights);
      dealt[pick.puzzle] = (dealt[pick.puzzle] || 0) + 1;
      slots[id][name] = pick;
    }
  }

  // 4. The order the creature's traits come out as clues, and one lock digit
  //    per stop, in the order the places are visited.
  const clues = rng.shuffle(traitKeys(pack));
  const lock = Array.from({ length: stops }, () => rng.int(1, 9));

  // 5. What happens along the way. The drives are numbered: 0 is the drive to
  //    the first place, and the last one is the drive to the lair. A run
  //    gets events on some of them, taken off the top of a shuffled deck
  //    (the quest skips an event that doesn't fit where the van is going).
  const road = pack.scenes[run.events];
  const all5 = road ? Object.keys(road.events) : [];
  const legs = stops + 1;
  const count = Math.min(Number(run.events_per_run) || 0, legs, all5.length);
  const eventLegs = force.eventLegs || rng.shuffle([...Array(legs).keys()]).slice(0, count).sort((a, b) => a - b);
  const events = force.events ? [...force.events, ...all5.filter((e) => !force.events.includes(e))] : rng.shuffle(all5);

  return { seed, creature, stops, deck, slots, clues, lock, events, eventLegs };
}

/**
 * The places on offer for the next stop, given where the run has been. Two
 * come off the top of the deck; the one not chosen stays on offer next time
 * beside a new one.
 * @param {Plan} plan
 * @param {string[]} route  places visited so far, in order
 * @returns {string[]}
 */
export function offers(plan, route) {
  let pair = plan.deck.slice(0, 2), next = 2;
  for (const went of route) {
    pair = [...pair.filter((p) => p !== went), ...plan.deck.slice(next, next + 1)];
    next++;
  }
  return pair;
}

/** Every way to fill a card's slots, as lists of option numbers. For the bot. */
export function slotCombos(card) {
  let combos = [{}];
  for (const [name, options] of Object.entries(card.slots)) {
    combos = combos.flatMap((c) => options.map((_, i) => ({ ...c, [name]: i })));
  }
  return combos;
}
