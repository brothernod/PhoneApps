// @ts-check
// The dealer. From one quest number it deals a whole run: which creature
// hatched, which places to visit, which puzzle sits in each slot, and the
// order the clues come out. Same number and same history, same run.

import { makeRng, pickWeighted } from './util.js';

/**
 * @typedef {{ seed: number, creature: string, places: string[],
 *   slots: Record<string, Record<string, any>>, clues: string[], lock: number[] }} Plan
 */

/**
 * @param {import('./pack.js').Pack} pack
 * @param {number} seed
 * @param {{ caught?: Record<string, any>, recent?: string[] }} [history]  what the player has done before
 * @param {{ creature?: string, places?: string[], slots?: Record<string, Record<string, number>> }} [force]
 *   fixed picks, for replaying or testing one combination
 * @returns {Plan}
 */
export function deal(pack, seed, history = {}, force = {}) {
  const rng = makeRng(seed);
  const run = pack.game.run || {};

  // 1. A creature not caught yet. Once all are caught, any of them.
  const all = Object.keys(pack.creatures).filter((id) => pack.scenes[pack.creatures[id].lair]);
  const fresh = all.filter((id) => !(history.caught || {})[id]);
  const creature = force.creature || rng.pick(fresh.length ? fresh : all);

  // 2. Places from the pool.
  const count = Math.min(Number(run.places_per_run) || 1, (run.pool || []).length);
  const places = force.places || rng.shuffle(run.pool || []).slice(0, count);

  // 3. One puzzle per slot, leaning away from kinds played lately or
  //    already dealt into this run.
  const recent = history.recent || [];
  /** @type {Record<string, number>} */
  const dealt = {};
  /** @type {Record<string, Record<string, any>>} */
  const slots = {};
  for (const id of [run.hub, ...places, pack.creatures[creature].lair]) {
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
  //    per place for the finale.
  const clues = rng.shuffle(Object.keys(pack.creatures[creature].traits || {}));
  const lock = places.map(() => rng.int(1, 9));

  return { seed, creature, places, slots, clues, lock };
}

/**
 * The stops of a run, in order: hub, each place, the creature's lair, and the
 * hub again for the ending.
 * @param {import('./pack.js').Pack} pack
 * @param {Plan} plan
 * @returns {{ scene: string, path: string }[]}
 */
export function itinerary(pack, plan) {
  const hub = pack.scenes[pack.game.run.hub];
  const stop = (id) => ({ scene: id, path: pack.scenes[id].knot });
  return [
    stop(hub.id),
    ...plan.places.map(stop),
    stop(pack.creatures[plan.creature].lair),
    { scene: hub.id, path: `${hub.knot}.${hub.finish}` },
  ];
}

/** Every way to fill a card's slots, as lists of option numbers. For the bot. */
export function slotCombos(card) {
  let combos = [{}];
  for (const [name, options] of Object.entries(card.slots)) {
    combos = combos.flatMap((c) => options.map((_, i) => ({ ...c, [name]: i })));
  }
  return combos;
}
