// @ts-check
// Puzzle archetypes. Each one builds a puzzle from the seed and the player's
// level, runs it, and reports { pass, firstTry, skill }.
// Rule for every puzzle: a miss brings a hint and a second try; a second miss
// shows the answer and explains it. Never a dead end.

import { evalExpr, fill } from './util.js';

/**
 * @typedef {{
 *   screen: import('./screen.js').Screen,
 *   sound: import('./sound.js').Sound,
 *   rng: ReturnType<typeof import('./util.js').makeRng>,
 *   banks: any,
 *   names: Record<string,string>,
 *   level: (skill: string) => number,
 *   learned: (kind: string, id: string) => void,
 *   args: Record<string,string>,
 * }} PuzzleCtx
 */

const PRAISE = ['¡CORRECTO!', '¡PERFECTO!', '¡MUY BIEN!', '¡EXCELENTE!'];

/** @param {PuzzleCtx} ctx */
async function dragonHoard(ctx) {
  const { screen, sound, rng, banks, names } = ctx;
  const skill = 'dragon_hoard';
  const all = banks.dragon_hoard || [];
  const lvl = ctx.level(skill);
  let pool = all.filter((t) => (t.level || 1) === lvl);
  if (!pool.length) pool = all.filter((t) => (t.level || 1) <= lvl);
  if (!pool.length) pool = all;
  const t = rng.pick(pool);

  /** @type {Record<string, number>} */
  let vars = {};
  for (let tries = 0; tries < 60; tries++) {
    vars = {};
    for (const [k, range] of Object.entries(t.vars || {})) vars[k] = rng.int(range[0], range[1]);
    if (!t.where || evalExpr(t.where, vars)) break;
  }
  const answer = evalExpr(t.answer, vars);
  vars.answer = answer;

  await screen.type(fill(t.text, names, vars), 'puzzle');
  for (let attempt = 1; attempt <= 2; attempt++) {
    const n = await screen.numpad(attempt === 1 ? 'TYPE YOUR ANSWER' : 'TRY AGAIN');
    if (n === answer) {
      sound.play('right');
      await screen.type(`${rng.pick(PRAISE)} The answer is ${answer}.`, 'good');
      return { pass: true, firstTry: attempt === 1, skill };
    }
    sound.play('miss');
    if (attempt === 1) {
      await screen.type(`${n}? Not quite. HINT: ${fill(t.hint || 'Read it again, slowly.', names, vars)}`, 'hint');
    } else {
      await screen.type(`The answer is ${answer}. ${fill(t.explain || '', names, vars)}`, 'hint');
    }
  }
  return { pass: false, firstTry: false, skill };
}

/** @param {PuzzleCtx} ctx */
async function magicWords(ctx) {
  const { screen, sound, rng, banks } = ctx;
  const topic = ctx.args.topic || 'colors';
  const skill = `spanish_${topic}`;
  const words = (banks.spanish && banks.spanish[topic]) || [];
  const lvl = ctx.level(skill);
  const count = Math.min(words.length, lvl >= 2 ? 5 : 4);
  const target = rng.pick(words);
  const others = rng.shuffle(words.filter((w) => w !== target)).slice(0, count - 1);
  let options = rng.shuffle([target, ...others]);
  ctx.learned('spanish', target.es);

  await screen.type(`The note says: ¡${target.es}! Which door should you knock on?`, 'puzzle');
  for (let attempt = 1; attempt <= 2; attempt++) {
    const i = await screen.choose(options.map(() => 'DOOR'), {
      prompt: attempt === 1 ? `¡${target.es}! PICK A DOOR` : 'TRY ANOTHER DOOR',
      colors: options.map((w) => w.hex),
    });
    const pick = options[i];
    if (pick === target) {
      sound.play('right');
      await screen.type(`¡SÍ! ${target.es} (${target.say}) means ${target.en}.`, 'good');
      return { pass: true, firstTry: attempt === 1, skill };
    }
    sound.play('miss');
    if (attempt === 1) {
      await screen.type(`That door is ${pick.es}, which means ${pick.en}. HINT: ${target.es} sounds like ${target.say}. ${fill(target.hint || '', ctx.names)}`, 'hint');
      options = options.filter((w) => w !== pick);
    } else {
      await screen.type(`${target.es} means ${target.en}. It's the ${target.en} door!`, 'hint');
    }
  }
  return { pass: false, firstTry: false, skill };
}

/** @param {PuzzleCtx} ctx */
async function factOrFib(ctx) {
  const { screen, sound, rng, banks, names } = ctx;
  const topic = ctx.args.topic || 'island';
  const skill = 'science_facts';
  const facts = (banks.facts && banks.facts[topic]) || [];
  const extra = (banks.facts && banks.facts.island) || [];
  const fibs = (banks.fibs && banks.fibs[topic]) || [];
  const chosenFacts = [rng.pick(facts), rng.pick(extra.filter((f) => !facts.includes(f)))].filter(Boolean);
  const fib = rng.pick(fibs);
  let options = rng.shuffle([...chosenFacts.map((f) => ({ ...f, fib: false })), { ...fib, fib: true }]);

  await screen.type(`${names.pet} sniffed out a FIB! Two of these are TRUE. One is made up. Which one is the FIB?`, 'puzzle');
  for (let attempt = 1; attempt <= 2; attempt++) {
    const i = await screen.choose(options.map((o) => o.text), { prompt: attempt === 1 ? 'WHICH ONE IS THE FIB?' : 'TRY AGAIN' });
    const pick = options[i];
    if (pick.fib) {
      sound.play('right');
      await screen.type(`RIGHT! That's the fib. ${names.pet} wags.`, 'good');
      for (const f of chosenFacts) ctx.learned('fact', f.text);
      await screen.type(`The true ones come from: ${chosenFacts.map((f) => f.source).join(' and ')}.`, 'dim');
      return { pass: true, firstTry: attempt === 1, skill };
    }
    sound.play('miss');
    if (attempt === 1) {
      await screen.type(`That one is TRUE! (Source: ${pick.source}.) HINT: ${fib.hint || 'Which one sounds too wild to be real?'}`, 'hint');
      ctx.learned('fact', pick.text);
      options = options.filter((o) => o !== pick);
    } else {
      await screen.type(`That one is true too! The FIB was: "${fib.text}"`, 'hint');
    }
  }
  return { pass: false, firstTry: false, skill };
}

export const PUZZLES = {
  dragon_hoard: dragonHoard,
  magic_words: magicWords,
  fact_or_fib: factOrFib,
};

/** "fact_or_fib topic=iguana" -> { type, args } */
export function parsePuzzleTag(value) {
  const [type, ...rest] = value.trim().split(/\s+/);
  /** @type {Record<string,string>} */
  const args = {};
  for (const kv of rest) {
    const [k, v] = kv.split('=');
    if (k) args[k] = v ?? 'true';
  }
  return { type, args };
}
