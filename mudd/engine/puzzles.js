// @ts-check
// Puzzle archetypes. An archetype is a small rule set: from the quest number,
// the player's level, and the pack's banks, it makes one puzzle for one of
// the shared answer screens (number pad, pick one). The screens live in
// screen.js; this file has no screen code, so the bot plays the same puzzles.
//
// Rule for every puzzle: a miss brings a hint and a second try; a second miss
// shows the answer and explains it. Never a dead end.
//
// Wording comes from the pack (wording: in banks.yaml), so a puzzle can be
// reskinned without code. The WORDS below are the plain fallbacks.

import { evalExpr, fill } from './util.js';

/**
 * What a scene card's slot asks for: { puzzle: 'colores', topic: 'colors' }.
 * @typedef {{ puzzle: string, topic?: string } & Record<string, any>} Spec
 *
 * @typedef {{
 *   rng: ReturnType<typeof import('./util.js').makeRng>,
 *   banks: any,
 *   names: Record<string,string>,
 *   level: (skill: string) => number,
 *   run?: { digits: number[] },
 * }} MakeCtx
 *
 * One made puzzle. `screen` says which answer screen runs it.
 * @typedef {{
 *   screen: 'numpad' | 'pick',
 *   skill: string,
 *   question: string,
 *   prompt: string, retry: string,
 *   answer?: number,
 *   options?: { label: string, color?: string, correct: boolean, miss: string }[],
 *   miss?: (guess: number) => string,
 *   right: string, reveal: string,
 *   maxLines?: number,
 *   learned?: [string, string][],
 * }} Puzzle
 */

const WORDS = {
  dragon_hoard: {
    prompt: 'TYPE YOUR ANSWER',
    retry: 'TRY AGAIN',
    right: '{praise} The answer is {answer}.',
    miss: '{guess}? Not quite. HINT: {hint}',
    reveal: 'The answer is {answer}. {explain}',
    hint: 'Read it again, slowly.',
  },
  colores: {
    ask: 'Find the one that is {es}.',
    prompt: 'PICK ONE',
    retry: 'TRY ANOTHER',
    option: '',
    right: '{praise} {es} ({say}) means {en}.',
    miss: 'That one is {pick_es}, which means {pick_en}. HINT: {es} sounds like {say}. {hint}',
    reveal: '{es} means {en}.',
  },
  fact_or_fib: {
    ask: 'Two are TRUE. Which one is the FIB?',
    prompt: 'WHICH ONE IS THE FIB?',
    retry: 'TRY AGAIN',
    right: '{praise} That one is the fib.',
    miss: 'That one is TRUE! HINT: {hint}',
    reveal: 'That one is true too! The FIB was: "{fib}"',
    hint: 'Which one sounds too wild to be real?',
  },
  rescue: {
    ask: '{goal} What do you say?',
    prompt: 'PICK WHAT TO SAY',
    retry: 'TRY ANOTHER ONE',
    right: '{praise} "{es}" means "{en}"',
    miss: '"{pick_es}" means "{pick_en}" {oops} HINT: {hint}',
    reveal: '"{es}" means "{en}"',
    hint: 'Sound each one out.',
  },
  code_lock: {
    ask: 'It is LOCKED. Type the code: your lock numbers, in the order you found them.',
    prompt: 'TYPE THE CODE',
    retry: 'TRY AGAIN',
    right: 'CLICK! The lock opens.',
    miss: '{guess}? The lock stays shut. HINT: open your CASEBOOK and read the lock numbers, first to last.',
    reveal: 'The code is {answer}.',
  },
};

/** The pack's wording for a puzzle, over the plain fallbacks. */
function wording(banks, type) {
  return { ...WORDS[type], ...((banks.wording || {})[type] || {}) };
}

const praise = (ctx) => ctx.rng.pick(ctx.banks.praise && ctx.banks.praise.length ? ctx.banks.praise : ['CORRECT!']);

// ---------------------------------------------------------------------------
// DRAGON HOARD: story word problems from templates. Number pad.

const hoardBank = (spec, banks) => ((banks.dragon_hoard || {})[spec.topic || ''] || []);

/** Roll a template's numbers until they obey its "where" rule. */
function rollVars(t, rng) {
  /** @type {Record<string, number>} */
  let vars = {};
  for (let tries = 0; tries < 60; tries++) {
    vars = {};
    for (const [k, range] of Object.entries(t.vars || {})) vars[k] = rng.int(range[0], range[1]);
    if (!t.where || evalExpr(t.where, vars)) return vars;
  }
  return vars;
}

const dragonHoard = {
  screen: 'numpad',
  skill: () => 'dragon_hoard',
  label: 'Word problems',

  /** @param {Spec} spec @param {MakeCtx} ctx @returns {Puzzle} */
  make(spec, ctx) {
    const { rng, banks, names } = ctx;
    const w = wording(banks, 'dragon_hoard');
    const all = hoardBank(spec, banks);
    const lvl = ctx.level('dragon_hoard');
    let pool = all.filter((t) => (t.level || 1) === lvl);
    if (!pool.length) pool = all.filter((t) => (t.level || 1) <= lvl);
    if (!pool.length) pool = all;
    const t = rng.pick(pool);
    const vars = rollVars(t, rng);
    const answer = evalExpr(t.answer, vars);
    vars.answer = answer;
    const say = (text, more = {}) => fill(text, { ...names, ...more }, vars);
    const hint = say(t.hint || w.hint);
    return {
      screen: 'numpad',
      skill: 'dragon_hoard',
      question: say(t.text),
      prompt: w.prompt, retry: w.retry,
      answer,
      miss: (guess) => say(w.miss, { guess: String(guess), hint }),
      right: say(w.right, { praise: praise(ctx) }),
      reveal: say(w.reveal, { explain: say(t.explain || '') }).trim(),
    };
  },

  /** Problems with a slot's settings, for the pack check. */
  check(spec, banks) {
    const bank = hoardBank(spec, banks);
    if (!bank.length) return [`dragon_hoard has no "${spec.topic}" problems in banks.yaml`];
    const out = [];
    bank.forEach((t, i) => {
      const at = `dragon_hoard.${spec.topic}[${i + 1}]`;
      if (!t.text || !t.answer) { out.push(`${at} needs text and answer`); return; }
      // Try every corner of the number ranges plus the middle.
      const keys = Object.keys(t.vars || {});
      let found = false;
      for (let mask = 0; mask < 1 << keys.length; mask++) {
        /** @type {Record<string, number>} */
        const vars = {};
        keys.forEach((k, j) => { vars[k] = t.vars[k][(mask >> j) & 1]; });
        try {
          if (t.where && !evalExpr(t.where, vars)) continue;
          found = true;
          const a = evalExpr(t.answer, vars);
          if (!Number.isInteger(a) || a < 0 || a > 9999) out.push(`${at} can give the answer ${a} (${JSON.stringify(vars)}); answers must be whole numbers from 0 to 9999`);
        } catch (e) { out.push(`${at}: ${e.message}`); return; }
      }
      if (!found) out.push(`${at}: its "where" rule fails at every end of the ranges`);
    });
    return out;
  },

  /** The longest each question can get, for the four-line check. */
  longest(spec, banks, names) {
    return hoardBank(spec, banks).map((t, i) => {
      /** @type {Record<string, number>} */
      const vars = {};
      for (const [k, range] of Object.entries(t.vars || {})) vars[k] = range[1];
      return { what: `dragon_hoard.${spec.topic}[${i + 1}]`, question: fill(t.text, names, vars) };
    });
  },
};

// ---------------------------------------------------------------------------
// COLORES: a Spanish color word; pick the thing of that color. Pick one.

const colorBank = (spec, banks) => ((banks.spanish || {})[spec.topic || 'colors'] || []);

const colores = {
  screen: 'pick',
  skill: (spec) => `spanish_${spec.topic || 'colors'}`,
  label: 'Spanish colors',

  /** @param {Spec} spec @param {MakeCtx} ctx @returns {Puzzle} */
  make(spec, ctx) {
    const { rng, banks, names } = ctx;
    const w = wording(banks, 'colores');
    const skill = colores.skill(spec);
    const words = colorBank(spec, banks);
    const count = Math.min(words.length, ctx.level(skill) >= 2 ? 5 : 4);
    const target = rng.pick(words);
    const others = rng.shuffle(words.filter((x) => x !== target)).slice(0, count - 1);
    const base = { ...names, es: target.es, en: target.en, say: target.say, praise: praise(ctx), hint: fill(target.hint || '', names) };
    const say = (text, more = {}) => fill(text, { ...base, ...more }).trim();
    return {
      screen: 'pick',
      skill,
      question: say(w.ask),
      prompt: say(w.prompt), retry: say(w.retry),
      options: rng.shuffle([target, ...others]).map((x) => ({
        label: say(w.option),
        color: x.hex,
        correct: x === target,
        miss: say(w.miss, { pick_es: x.es, pick_en: x.en }),
      })),
      right: say(w.right),
      reveal: say(w.reveal),
      learned: [['spanish', target.es]],
    };
  },

  check(spec, banks) {
    const words = colorBank(spec, banks);
    if (words.length < 4) return [`colores needs at least 4 words under spanish.${spec.topic || 'colors'} in banks.yaml`];
    return words.filter((x) => !x.es || !x.en || !x.hex).map((x) => `spanish.${spec.topic || 'colors'}: "${x.es || '?'}" needs es, en, and hex`);
  },

  longest(spec, banks, names) {
    const w = wording(banks, 'colores');
    return colorBank(spec, banks).map((x) => ({ what: `colores ${x.es}`, question: fill(w.ask, { ...names, es: x.es, en: x.en, say: x.say }) }));
  },
};

// ---------------------------------------------------------------------------
// FACT OR FIB: two sourced facts and one fib; find the fib. Pick one.

function fibBank(spec, banks) {
  const topic = spec.topic || 'island';
  const facts = (banks.facts || {})[topic] || [];
  // A topic with few facts borrows its second fact from the shared ones.
  const extra = ((banks.facts || {}).island || []).filter((f) => !facts.includes(f));
  return { facts, extra, fibs: (banks.fibs || {})[topic] || [] };
}

const factOrFib = {
  screen: 'pick',
  skill: () => 'science_facts',
  label: 'Science facts',

  /** @param {Spec} spec @param {MakeCtx} ctx @returns {Puzzle} */
  make(spec, ctx) {
    const { rng, banks, names } = ctx;
    const w = wording(banks, 'fact_or_fib');
    const { facts, extra, fibs } = fibBank(spec, banks);
    const first = rng.pick(facts);
    const second = rng.pick(extra.length ? extra : facts.filter((f) => f !== first));
    const truths = [first, second].filter(Boolean);
    const fib = rng.pick(fibs);
    // A fact's source is for grown-up review of the bank; the player never sees it.
    const base = { ...names, praise: praise(ctx), fib: fib.text, hint: fill(fib.hint || w.hint, names) };
    const say = (text) => fill(text, base).trim();
    return {
      screen: 'pick',
      skill: 'science_facts',
      question: say(w.ask),
      maxLines: 1, // the three statements are the keys, so the question gets one line
      prompt: say(w.prompt), retry: say(w.retry),
      options: rng.shuffle([
        ...truths.map((f) => ({ label: fill(f.text, names), correct: false, miss: say(w.miss) })),
        { label: fill(fib.text, names), correct: true, miss: '' },
      ]),
      right: say(w.right),
      reveal: say(w.reveal),
      learned: truths.map((f) => ['fact', f.text]),
    };
  },

  check(spec, banks) {
    const { facts, extra, fibs } = fibBank(spec, banks);
    const topic = spec.topic || 'island';
    const out = [];
    if (!facts.length || facts.length + extra.length < 2) out.push(`fact_or_fib needs two facts for "${topic}" (facts.${topic}, plus facts.island) in banks.yaml`);
    if (!fibs.length) out.push(`fact_or_fib has no fibs.${topic} in banks.yaml`);
    for (const f of [...facts, ...extra]) if (!f.source) out.push(`fact "${f.text}" has no source`);
    return out;
  },

  longest(spec, banks, names) {
    const w = wording(banks, 'fact_or_fib');
    const { facts, extra, fibs } = fibBank(spec, banks);
    return [{
      what: `fact_or_fib ${spec.topic || 'island'}`,
      question: fill(w.ask, names),
      maxLines: 1, // the three statements are the keys, so the question gets one line
      keys: [...facts, ...extra, ...fibs].map((f) => fill(f.text, names)),
    }];
  },
};

// ---------------------------------------------------------------------------
// THE RESCUE: say the right Spanish sentence to the creature. Pick one.
// A bank entry with a goal: can be the right answer; any entry can be a
// wrong one, and its oops: says what the creature does when it hears it.

const callBank = (spec, banks) => ((banks.rescue || {})[spec.topic || 'calls'] || []);

const rescue = {
  screen: 'pick',
  skill: (spec) => `spanish_${spec.topic || 'calls'}`,
  label: 'Spanish sentences',

  /** @param {Spec} spec @param {MakeCtx} ctx @returns {Puzzle} */
  make(spec, ctx) {
    const { rng, banks, names } = ctx;
    const w = wording(banks, 'rescue');
    const skill = rescue.skill(spec);
    const all = callBank(spec, banks);
    const target = rng.pick(all.filter((x) => x.goal));
    const count = Math.min(all.length, ctx.level(skill) >= 2 ? 4 : 3);
    const others = rng.shuffle(all.filter((x) => x !== target)).slice(0, count - 1);
    const base = {
      ...names, praise: praise(ctx), goal: fill(target.goal, names),
      es: target.es, en: target.en, say: target.say || '', hint: fill(target.hint || w.hint, names),
    };
    const say = (text, more = {}) => fill(text, { ...base, ...more }).trim();
    return {
      screen: 'pick',
      skill,
      question: say(w.ask),
      maxLines: 3,
      prompt: say(w.prompt), retry: say(w.retry),
      options: rng.shuffle([target, ...others]).map((x) => ({
        label: x.es,
        correct: x === target,
        miss: say(w.miss, { pick_es: x.es, pick_en: x.en, oops: fill(x.oops || '', names) }),
      })),
      right: say(w.right),
      reveal: say(w.reveal),
      learned: [['spanish', target.es]],
    };
  },

  check(spec, banks) {
    const all = callBank(spec, banks);
    const at = `rescue.${spec.topic || 'calls'}`;
    const out = [];
    if (all.length < 3) out.push(`${at} needs at least 3 sentences in banks.yaml`);
    if (!all.some((x) => x.goal)) out.push(`${at} needs at least one sentence with a goal:`);
    for (const x of all) if (!x.es || !x.en) out.push(`${at}: "${x.es || '?'}" needs es and en`);
    return out;
  },

  longest(spec, banks, names) {
    const w = wording(banks, 'rescue');
    const all = callBank(spec, banks);
    return all.filter((x) => x.goal).map((x) => ({
      what: `rescue "${x.es}"`,
      question: fill(w.ask, { ...names, goal: fill(x.goal, names) }),
      maxLines: 3,
      keys: all.map((y) => y.es),
      maxKeyLines: 1,
    }));
  },
};

// ---------------------------------------------------------------------------
// CODE LOCK: the lock digits noted along the way, typed in order. Number pad.

const codeLock = {
  screen: 'numpad',
  skill: () => 'code_lock',
  label: 'Code lock',

  /** @param {Spec} spec @param {MakeCtx} ctx @returns {Puzzle} */
  make(spec, ctx) {
    const w = wording(ctx.banks, 'code_lock');
    const digits = (ctx.run && ctx.run.digits) || [];
    const answer = Number(digits.join('')) || 0;
    const base = { ...ctx.names, praise: praise(ctx), answer: String(answer), digits: digits.join(', then ') };
    const say = (text, more = {}) => fill(text, { ...base, ...more }).trim();
    return {
      screen: 'numpad',
      skill: 'code_lock',
      question: say(w.ask),
      prompt: say(w.prompt), retry: say(w.retry),
      answer,
      miss: (guess) => say(w.miss, { guess: String(guess) }),
      right: say(w.right),
      reveal: say(w.reveal),
    };
  },

  check() { return []; },

  longest(spec, banks, names) {
    return [{ what: 'code_lock', question: fill(wording(banks, 'code_lock').ask, names) }];
  },
};

export const ARCHETYPES = {
  dragon_hoard: dragonHoard,
  colores,
  fact_or_fib: factOrFib,
  rescue,
  code_lock: codeLock,
};

// ---------------------------------------------------------------------------
// Playing one. The card is the puzzle screen (screen.js), or the bot's stand-in.

/**
 * @typedef {{
 *   open: (pz: Puzzle) => Promise<void>,
 *   numpad: (prompt: string) => Promise<number>,
 *   pick: (options: { label: string, color?: string }[], prompt: string) => Promise<number>,
 *   hint: (text: string) => void,
 *   reveal: (text: string) => Promise<void>,
 *   close: () => Promise<void>,
 * }} Card
 */

/**
 * Make and play the puzzle a slot asks for.
 * @param {Spec} spec
 * @param {MakeCtx & { card: Card, cue: (name: string) => void, say: (text: string, cls?: string) => Promise<void>, learned: (kind: string, id: string) => void }} ctx
 * @returns {Promise<{ pass: boolean, firstTry: boolean, skill: string, type: string }>}
 */
export async function playPuzzle(spec, ctx) {
  const pz = ARCHETYPES[spec.puzzle].make(spec, ctx);
  const { card } = ctx;
  const done = (pass, firstTry) => {
    for (const [kind, id] of pz.learned || []) ctx.learned(kind, id);
    return { pass, firstTry, skill: pz.skill, type: spec.puzzle };
  };

  await card.open(pz);
  let options = pz.options || [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompt = attempt === 1 ? pz.prompt : pz.retry;
    let ok = false, missText = '';
    if (pz.screen === 'numpad') {
      const guess = await card.numpad(prompt);
      ok = guess === pz.answer;
      missText = pz.miss ? pz.miss(guess) : '';
    } else {
      const picked = options[await card.pick(options, prompt)];
      ok = picked.correct;
      missText = picked.miss;
      options = options.filter((o) => o !== picked); // a wrong door doesn't come back
    }
    if (ok) {
      // The card drops away and the scene gets one line about the result.
      ctx.cue('right');
      await card.close();
      await ctx.say(pz.right, 'good');
      return done(true, attempt === 1);
    }
    ctx.cue('miss');
    if (attempt === 1) card.hint(missText);
    else await card.reveal(pz.reveal);
  }
  await card.close();
  return done(false, false);
}
