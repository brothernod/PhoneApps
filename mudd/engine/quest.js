// @ts-check
// One quest, start to finish. The dealer's plan says where the run goes; this
// drives the ink through each stop and hands every line, choice, and puzzle
// to a `ui`. The game passes its screen; the bot playtester passes a robot.
// No screen code here.

import { itinerary } from './dealer.js';
import { playPuzzle } from './puzzles.js';
import { makeRng, fill } from './util.js';

/**
 * @typedef {{
 *   line: (text: string, cls?: string) => Promise<void>,
 *   clear: () => Promise<void>,
 *   pic: (name: string) => void,
 *   tune: (name: string) => void,
 *   cue: (name: string) => void,
 *   travel: (stop: number, stops: number) => Promise<void>,
 *   choose: (labels: string[]) => Promise<number>,
 *   status: (s: { quest: number, minutes: number, clues: number }) => void,
 *   card: import('./puzzles.js').Card,
 * }} QuestUi
 *
 * What a saved game remembers besides the ink state.
 * @typedef {{ step: number, entered: boolean, puzzleN: number, clues: string[] }} QuestState
 *
 * @typedef {{
 *   level: (skill: string) => number,
 *   learned: (kind: string, id: string) => void,
 *   result: (res: { pass: boolean, firstTry: boolean, skill: string, type: string }) => void,
 *   caught: (creature: string) => void,
 *   checkpoint: () => void,
 *   problem?: (msg: string) => void,
 * }} QuestHooks
 */

/** @returns {QuestState} */
export const newQuestState = () => ({ step: 0, entered: false, puzzleN: 0, clues: [] });

/**
 * Set the story's variables for a new run. Call once, before the first step.
 * @param {any} story
 * @param {{ runs: number, caught: number }} history
 */
export function startStory(story, pack, history) {
  const clock = pack.game.clock || {};
  story.variablesState.minutes = Number(clock.start) || 540;
  story.variablesState.runs = history.runs;
  story.variablesState.caught = history.caught;
}

/**
 * Play a quest from wherever `state` says it is.
 * @param {{ pack: import('./pack.js').Pack, plan: import('./dealer.js').Plan, story: any,
 *   state: QuestState, ui: QuestUi, hooks: QuestHooks }} q
 */
export async function runQuest({ pack, plan, story, state, ui, hooks }) {
  const steps = itinerary(pack, plan);
  const vars = story.variablesState;
  const creature = pack.creatures[plan.creature];
  const problem = hooks.problem || (() => {});

  // Names are set every time, so an older save can't bring back different ones.
  for (const [role, name] of Object.entries(pack.cast)) vars[role] = name;
  vars.sunset = Number((pack.game.clock || {}).sunset) || 1125;
  /** Names a line of pack text may use: the cast, plus the creature's fields. */
  const names = { ...pack.cast };
  for (const [k, v] of Object.entries(creature)) if (typeof v === 'string') names[k] = v;

  const status = () => ui.status({ quest: plan.seed, minutes: Number(vars.minutes) || 0, clues: state.clues.length });
  status();

  for (; state.step < steps.length; state.step++, state.entered = false) {
    const step = steps[state.step];
    const card = pack.scenes[step.scene];
    if (!state.entered) {
      if (state.step > 0) {
        await ui.travel(state.step + 1, steps.length);
        vars.minutes = Number(vars.minutes) + (Number(card.drive) || 0);
      }
      story.ChoosePathString(step.path);
      state.entered = true;
    }

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
        for (const _ of tag('clue')) {
          // Clues belong to the creature; the card only frames them.
          const trait = (creature.traits || {})[plan.clues[state.clues.length]];
          if (!trait) { problem(`${step.scene}: a "# clue" tag with no clue left to give`); continue; }
          state.clues.push(plan.clues[state.clues.length]);
          vars.clues = state.clues.length;
          if (trait.found) await ui.line(fill(trait.found, names));
          await ui.line(fill(trait.clue, names), 'good');
        }
        for (const _ of tag('caught')) {
          hooks.caught(plan.creature);
          for (const text of pack.words.caught || ['{name}']) await ui.line(fill(text, names));
        }
        for (const s of tag('slot')) pendingSlot = s;
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
        const spec = slot ? (plan.slots[step.scene] || {})[slot] : null;
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
          });
          hooks.result(res);
          pass = res.pass;
        } else {
          problem(`${step.scene}: [@pass]/[@fail] choices without a dealt "# slot:" puzzle`);
          await ui.line('(A puzzle is missing here. Skipping it.)', 'dim');
        }
        story.ChooseChoiceIndex(pass ? passIdx : failIdx);
        continue;
      }
      if (pendingSlot) { problem(`${step.scene}: "# slot: ${pendingSlot}" is not followed by [@pass] and [@fail] choices`); pendingSlot = null; }

      // Hidden choices start with @. A blank one is ink's fallback ("* -> next"),
      // which a reloaded save lists like any other; ink takes it by itself
      // once nothing else is left.
      const visible = choices.filter((c) => c.text.trim() && !c.text.trim().startsWith('@'));
      if (!visible.length) { problem(`${step.scene}: only hidden @ choices left (dead end)`); break; }
      hooks.checkpoint();
      const pick = await ui.choose(visible.map((c) => c.text.trim()));
      await ui.line(`> ${visible[pick].text.trim()}`, 'echo');
      story.ChooseChoiceIndex(visible[pick].index);
    }
  }
}
