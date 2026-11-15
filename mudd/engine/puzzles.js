// @ts-check
// Puzzle archetypes. An archetype is a small rule set: from the quest number,
// the player's level, and the pack's banks, it makes one puzzle for one of
// the shared answer screens (number pad, pick one, a board of squares to tap).
// The screens live in screen.js; this file has no screen code, so the bot
// plays the same puzzles.
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
 *   screen: 'numpad' | 'pick' | 'grid' | 'pairs',
 *   format?: 'clock',
 *   skill: string,
 *   question: string,
 *   prompt: string, retry: string,
 *   answer?: number,
 *   options?: { label: string, color?: string, size?: string, correct: boolean, miss: string }[],
 *   miss?: (guess: any) => string,
 *   board?: Record<string, any>,
 *   check?: (answer: any) => boolean, solution?: any, decoy?: any,
 *   starMisses?: number, maxMisses?: number,
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
  trading_post: {
    prompt: 'TYPE YOUR ANSWER',
    retry: 'TRY AGAIN',
    right: '{praise} The answer is {answer}.',
    miss: '{guess}? Not quite. HINT: {hint}',
    reveal: 'The answer is {answer}. {explain}',
    hint: 'Read it again, slowly.',
  },
  sunset_clock: {
    prompt: 'HOW MANY MINUTES?',
    prompt_time: 'TYPE THE TIME',
    retry: 'TRY AGAIN',
    right: '{praise} The answer is {answer}.',
    miss: '{guess}? Not quite. HINT: {hint}',
    reveal: 'The answer is {answer}. {explain}',
    hint: 'Count the minutes on a clock face.',
  },
  stepping_stones: {
    ask: 'One number is missing: {stones}. What is it?',
    prompt: 'TYPE THE MISSING NUMBER',
    retry: 'TRY AGAIN',
    right: '{praise} The missing number is {answer}.',
    miss: '{guess}? Not quite. HINT: {hint}',
    reveal: 'The missing number is {answer}. {explain}',
    hint_up: 'How far is it from {a} up to {b}? Every jump is that big.',
    hint_down: 'How far is it from {a} down to {b}? Every jump is that big.',
    hint_times: 'How many times {a} is {b}? Every jump does that.',
    explain_up: 'The rule is +{n} each time: {prev} + {n} = {answer}.',
    explain_down: 'The rule is -{n} each time: {prev} - {n} = {answer}.',
    explain_times: 'The rule is x{n} each time: {prev} x {n} = {answer}.',
  },
  colores: {
    ask: 'Find the one that is {es}.',
    prompt: 'PICK ONE',
    retry: 'TRY ANOTHER',
    option: '',
    right: '{praise} {es} ({say}) means {en}.',
    miss: 'That one is {pick_es}, which means {pick_en}. HINT: {es} sounds like {say}. {hint}',
    reveal: '{es} means {en}.',
    ask2: 'Find the one that is {color} y {size}.',
    right2: '{praise} {color} y {size} means {color_en} and {size_en}.',
    reveal2: '{color} y {size} means {color_en} and {size_en}.',
    ask3: 'It is not {no1} or {no2}. It is {size}. Find it.',
    right3: '{praise} Not {no1_en}, not {no2_en}, and {size_en}.',
    reveal3: 'Not {no1_en}, not {no2_en}, and {size_en}: the {size_en} {color_en} one.',
    miss2: 'That one is {pick_color} y {pick_size}: {pick_color_en} and {pick_size_en}. HINT: {hint}',
    hint_color: '{color} sounds like {say}. {hint}',
    hint_size: '{pick_size} means {pick_size_en}. You want {size}.',
    hint_not: 'NO ES {pick_color} means it is NOT {pick_color_en}.',
  },
  hola_y_gracias: {
    who: 'Someone',
    ask: '{who} says: "{says}" What do you say back?',
    ask_easy: '{who} says: "{says}" ({en}) What do you say back?',
    prompt: 'PICK WHAT TO SAY',
    retry: 'TRY ANOTHER ONE',
    right: '{praise} "{says}" means "{en}" and "{reply}" means "{reply_en}"',
    miss: '"{pick_es}" means "{pick_en}" HINT: {hint}',
    reveal: '"{says}" means "{en}" You answer: "{reply}" ({reply_en})',
    hint: 'Sound it out, one word at a time.',
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
  snack_muncher: {
    ask: 'Tap all the numbers that {rule}.',
    prompt: 'TAP EVERY ONE THAT FITS',
    retry: 'FIX IT AND TRY AGAIN',
    done: 'DONE',
    rule_multiple: 'are multiples of {n}',
    rule_round: 'round to {t} (nearest {unit})',
    unit_10: 'ten',
    unit_100: 'hundred',
    right: '{praise} All {count} fit: {list}.',
    miss_wrong: '{pick} does not fit. HINT: {hint}',
    miss_short: 'Those all fit, but there are more. HINT: {hint}',
    reveal: 'The ones that fit: {list}. {explain}',
    hint_multiple: 'Count by {n}s: {skip}...',
    hint_round_10: 'Look at the LAST digit. 5 or more rounds UP. 4 or less rounds DOWN.',
    hint_round_100: 'Look at the TENS. 50 or more rounds UP. 49 or less rounds DOWN.',
    hint_round: 'Which numbers are closest to {t}?',
    explain_multiple: 'You say each one when you count by {n}s.',
    explain_round: 'Every number from {lo} to {hi} rounds to {t}.',
  },
  egg_crates: {
    ask_build: 'Make {r} rows of {c}.',
    ask_rows: 'There are {n}. Put them in {r} equal rows.',
    ask_cols: 'There are {n}. Put them in equal rows of {c}.',
    prompt: 'TAP A SQUARE TO FILL THE CRATE',
    retry: 'TRY AGAIN',
    done: 'DONE',
    caption: '{rows} ROWS OF {cols}',
    caption_one: '1 ROW OF {cols}',
    caption_none: 'EMPTY',
    right: '{praise} {r} rows of {c} makes {n}.',
    miss: 'You made {pr} rows of {pc}. HINT: {hint}',
    miss_flip: 'You made {pr} rows of {pc}. HINT: a ROW goes side to side. You want {r} rows.',
    miss_total: 'You made {pr} rows of {pc}. That is {pn}, not {n}. HINT: {hint}',
    hint_build: 'Count {r} rows going DOWN. Make each row {c} long.',
    hint_rows: 'Keep {r} rows. Make them longer or shorter until there are {n} in all.',
    hint_cols: 'Keep each row {c} long. Add rows until there are {n} in all.',
    reveal: '{r} rows of {c} makes {n}. {explain}',
    explain_build: '{r} x {c} = {n}.',
    explain_rows: '{n} ÷ {r} = {c} in each row.',
    explain_cols: '{n} ÷ {c} = {r} rows.',
  },
  dragon_census: {
    ask_fill: '{row} should show {n}. Each picture stands for {scale}. Fill in the row.',
    ask_more: '{row} has {d} MORE than {other}. Each picture stands for {scale}. Fill in the {row} row.',
    ask_fewer: '{row} has {d} FEWER than {other}. Each picture stands for {scale}. Fill in the {row} row.',
    ask_total: 'There are {total} in all. Each picture stands for {scale}. Fill in the {row} row.',
    key: 'EACH ONE STANDS FOR {scale}',
    prompt: 'TAP TO FILL IN THE ROW',
    retry: 'TRY AGAIN',
    done: 'DONE',
    right: '{praise} {count} pictures stand for {n}.',
    miss: 'You put {pc}. That stands for {pn}. HINT: {hint}',
    hint_fill: 'Count by {scale}s until you get to {n}.',
    hint_more: '{other} shows {on}. What is {d} more than {on}?',
    hint_fewer: '{other} shows {on}. What is {d} less than {on}?',
    hint_total: 'Add up the two rows that are filled in. How many more to reach {total}?',
    reveal: '{row} is {n}, and that takes {count} pictures. {explain}',
    explain_fill: '{n} ÷ {scale} = {count}.',
    explain_more: '{on} + {d} = {n}.',
    explain_fewer: '{on} - {d} = {n}.',
    explain_total: 'The other rows make {rest}. {total} - {rest} = {n}.',
  },
  memoria: {
    ask: 'Match each Spanish word with its picture.',
    ask_easy: 'Match each Spanish word with its picture.',
    prompt: 'TURN OVER TWO CARDS',
    retry: 'TURN OVER TWO CARDS',
    right: '{praise} You matched all {pairs} pairs.',
    hint: '{es} means {en}.',
    hint_same: 'Match a WORD with a PICTURE.',
    reveal: 'Here they all are. {list}.',
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
// STORY PROBLEMS: word problems from templates in the banks. Number pad.
// Three archetypes share this rule set, each with its own bank and wording:
//   dragon_hoard   two-step problems
//   trading_post   money: buy on a budget and count the change
//   sunset_clock   time: when do you get there, how long does it take
//
// A template:
//   vars:   each letter is a [min, max] range of whole numbers
//   where:  a rule the numbers must follow (optional)
//   answer: the math that gives the answer
//   level:  1 is easiest
// A sunset_clock template also has
//   at:     the time it is now, in minutes (2:35 is 2*60 + 35); shown as {at}
//   end:    a second time to show, as {end} (optional)
//   as:     "time" when the answer is a time of day (in minutes, typed as
//           3:25), or "minutes" when it is a plain count

/** 155 -> "2:35" */
const clockText = (minutes) => `${Math.floor(minutes / 60)}:${String(Math.round(minutes) % 60).padStart(2, '0')}`;
/** 155 -> 235, the number the pad gives for 2:35 */
const clockKeys = (minutes) => Math.floor(minutes / 60) * 100 + (Math.round(minutes) % 60);
/** 235 -> "2:35" */
const keysText = (n) => `${Math.floor(n / 100)}:${String(n % 100).padStart(2, '0')}`;

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

/** A template worked out with one set of numbers: the answer and the words for {at}, {end}, {answer}. */
function workOut(t, vars) {
  const value = evalExpr(t.answer, vars);
  const isTime = t.as === 'time';
  /** @type {Record<string, string>} */
  const words = { answer: isTime ? clockText(value) : String(value) };
  if (t.at) words.at = clockText(evalExpr(t.at, vars));
  if (t.end) words.end = clockText(evalExpr(t.end, vars));
  return { value, isTime, answer: isTime ? clockKeys(value) : value, words };
}

/**
 * @param {string} type   the archetype's name, which is also its bank and its skill
 * @param {string} label  what the grown-up screen calls the skill
 */
function storyProblems(type, label) {
  const bankOf = (spec, banks) => ((banks[type] || {})[spec.topic || ''] || []);
  return {
    screen: 'numpad',
    skill: () => type,
    label,

    /** @param {Spec} spec @param {MakeCtx} ctx @returns {Puzzle} */
    make(spec, ctx) {
      const { rng, banks, names } = ctx;
      const w = wording(banks, type);
      const all = bankOf(spec, banks);
      const lvl = ctx.level(type);
      let pool = all.filter((t) => (t.level || 1) === lvl);
      if (!pool.length) pool = all.filter((t) => (t.level || 1) <= lvl);
      if (!pool.length) pool = all;
      const t = rng.pick(pool);
      const vars = rollVars(t, rng);
      const out = workOut(t, vars);
      const say = (text, more = {}) => fill(text, { ...names, ...out.words, ...more }, vars);
      const hint = say(t.hint || w.hint);
      return {
        screen: 'numpad',
        format: out.isTime ? 'clock' : undefined,
        skill: type,
        question: say(t.text),
        prompt: out.isTime ? (w.prompt_time || w.prompt) : w.prompt, retry: w.retry,
        answer: out.answer,
        miss: (guess) => say(w.miss, { guess: out.isTime ? keysText(guess) : String(guess), hint }),
        right: say(w.right, { praise: praise(ctx) }),
        reveal: say(w.reveal, { explain: say(t.explain || '') }).trim(),
      };
    },

    /** Problems with a slot's settings, for the pack check. */
    check(spec, banks) {
      const bank = bankOf(spec, banks);
      if (!bank.length) return [`${type} has no "${spec.topic}" problems in banks.yaml`];
      const out = [];
      bank.forEach((t, i) => {
        const at = `${type}.${spec.topic}[${i + 1}]`;
        if (!t.text || !t.answer) { out.push(`${at} needs text and answer`); return; }
        if (t.as && t.as !== 'time' && t.as !== 'minutes') out.push(`${at}: as: must be time or minutes`);
        // Try every corner of the number ranges.
        const keys = Object.keys(t.vars || {});
        let found = false;
        for (let mask = 0; mask < 1 << keys.length; mask++) {
          /** @type {Record<string, number>} */
          const vars = {};
          keys.forEach((k, j) => { vars[k] = t.vars[k][(mask >> j) & 1]; });
          try {
            if (t.where && !evalExpr(t.where, vars)) continue;
            found = true;
            const r = workOut(t, vars);
            if (!Number.isInteger(r.value) || r.value < 0 || r.value > 9999) out.push(`${at} can give the answer ${r.value} (${JSON.stringify(vars)}); answers must be whole numbers from 0 to 9999`);
            // A time must be one a clock face shows, so 12:59 at the latest.
            for (const [what, src] of [['at', t.at], ['end', t.end], ['answer', r.isTime ? t.answer : '']]) {
              if (!src) continue;
              const m = evalExpr(src, vars);
              if (m < 60 || m >= 13 * 60) out.push(`${at}: ${what} can be ${m} minutes (${JSON.stringify(vars)}); times must be from 1:00 to 12:59`);
            }
          } catch (e) { out.push(`${at}: ${e.message}`); return; }
        }
        if (!found) out.push(`${at}: its "where" rule fails at every end of the ranges`);
      });
      return out;
    },

    /** The longest each question can get, for the four-line check. */
    longest(spec, banks, names) {
      return bankOf(spec, banks).map((t, i) => {
        /** @type {Record<string, number>} */
        const vars = {};
        for (const [k, range] of Object.entries(t.vars || {})) vars[k] = range[1];
        // "12:55" is as wide as a time gets
        const words = { at: '12:55', end: '12:55' };
        return { what: `${type}.${spec.topic}[${i + 1}]`, question: fill(t.text, { ...names, ...words }, vars) };
      });
    },
  };
}

const dragonHoard = storyProblems('dragon_hoard', 'Word problems');
const tradingPost = storyProblems('trading_post', 'Money');
const sunsetClock = storyProblems('sunset_clock', 'Telling time');

// ---------------------------------------------------------------------------
// STEPPING STONES: a row of numbers that follows a rule, with one missing.
// Number pad. The rules are in the bank (stepping_stones.rules):
//   step:    the jump from one number to the next; one is picked from the list
//   times:   or each number is this many times the one before
//   start:   [min, max] for the first number. With on_step: true the first
//            number is that many steps (3 steps of 5 is 15), which makes
//            skip-counting rows
//   count:   how many numbers in the row (5 unless given)
//   gap:     end (the last number is missing) or middle
// Each topic has the words around the row: text: with {stones} in it.

const stoneBank = (banks) => banks.stepping_stones || {};
const stoneRules = (banks) => (Array.isArray(stoneBank(banks).rules) ? stoneBank(banks).rules : []);

/** One row from a rule. first and step are chosen by the caller. */
function stoneRow(rule, first, step, gapAt) {
  const count = Number(rule.count) || 5;
  const row = [first];
  for (let i = 1; i < count; i++) row.push(rule.times ? row[i - 1] * rule.times : row[i - 1] + step);
  const gap = Math.max(2, Math.min(count - 1, gapAt));
  return { row, gap, shown: row.map((n, i) => (i === gap ? '__' : String(n))).join(', ') };
}

const steppingStones = {
  screen: 'numpad',
  skill: () => 'stepping_stones',
  label: 'Number patterns',

  /** @param {Spec} spec @param {MakeCtx} ctx @returns {Puzzle} */
  make(spec, ctx) {
    const { rng, banks, names } = ctx;
    const w = wording(banks, 'stepping_stones');
    const topic = stoneBank(banks)[spec.topic || ''] || {};
    const all = stoneRules(banks);
    const lvl = ctx.level('stepping_stones');
    let pool = all.filter((r) => (r.level || 1) === lvl);
    if (!pool.length) pool = all.filter((r) => (r.level || 1) <= lvl);
    if (!pool.length) pool = all;
    const rule = rng.pick(pool);
    const step = rule.times ? 0 : rng.pick(rule.step || [1]);
    const base = rng.int((rule.start || [1, 1])[0], (rule.start || [1, 1])[1]);
    const first = rule.on_step ? base * Math.abs(step) : base;
    const count = Number(rule.count) || 5;
    const { row, gap, shown } = stoneRow(rule, first, step, rule.gap === 'middle' ? rng.int(2, count - 2) : count - 1);
    const answer = row[gap], prev = row[gap - 1];
    const how = rule.times ? 'times' : step < 0 ? 'down' : 'up';
    const base2 = {
      ...names, praise: praise(ctx), stones: shown, answer: String(answer),
      a: String(row[0]), b: String(row[1]), prev: String(prev),
      n: String(rule.times || Math.abs(step)),
    };
    const say = (text, more = {}) => fill(text, { ...base2, ...more }).trim();
    const hint = say(w[`hint_${how}`]);
    return {
      screen: 'numpad',
      skill: 'stepping_stones',
      question: say(topic.text || w.ask),
      prompt: w.prompt, retry: w.retry,
      answer,
      miss: (guess) => say(w.miss, { guess: String(guess), hint }),
      right: say(w.right),
      reveal: say(w.reveal, { explain: say(w[`explain_${how}`]) }),
    };
  },

  check(spec, banks) {
    const out = [];
    const topic = stoneBank(banks)[spec.topic || ''];
    if (!topic || !topic.text) out.push(`stepping_stones.${spec.topic} needs text: in banks.yaml`);
    else if (!String(topic.text).includes('{stones}')) out.push(`stepping_stones.${spec.topic}.text needs {stones} in it`);
    const rules = stoneRules(banks);
    if (!rules.length) out.push('stepping_stones.rules is missing in banks.yaml');
    rules.forEach((r, i) => {
      const at = `stepping_stones.rules[${i + 1}]`;
      if (!r.times && !(Array.isArray(r.step) && r.step.length && r.step.every((s) => Number.isInteger(s) && s !== 0))) { out.push(`${at} needs step: [a list of jumps] or times:`); return; }
      if (!Array.isArray(r.start) || r.start.length !== 2) { out.push(`${at} needs start: [min, max]`); return; }
      if ((Number(r.count) || 5) < 4) out.push(`${at}: count must be 4 or more`);
      for (const step of r.times ? [0] : r.step) for (const base of r.start) {
        const first = r.on_step ? base * Math.abs(step) : base;
        const { row } = stoneRow(r, first, step, 2);
        if (row.some((n) => !Number.isInteger(n) || n < 0 || n > 999)) out.push(`${at} can make the row ${row.join(', ')}; keep every number from 0 to 999`);
      }
    });
    return out;
  },

  longest(spec, banks, names) {
    const topic = stoneBank(banks)[spec.topic || ''] || {};
    // The widest row any rule can make.
    let widest = '';
    for (const r of stoneRules(banks)) for (const step of r.times ? [0] : r.step || [1]) for (const base of r.start || [1, 1]) {
      const { shown } = stoneRow(r, r.on_step ? base * Math.abs(step) : base, step, 2);
      if (shown.length > widest.length) widest = shown;
    }
    return [{ what: `stepping_stones.${spec.topic}`, question: fill(topic.text || '', { ...names, stones: widest }) }];
  },
};

// ---------------------------------------------------------------------------
// COLORES: a Spanish sentence about a door; pick the door it means. Pick one.
//   level 1  one word: the color
//   level 2  two things: the color and the size
//   level 3  a "not": it is not this color or that one, and it is this size
// Words come from the bank: spanish.<topic> for the colors (f: is the form
// that goes with the thing being picked, like ROJA for a door) and
// spanish.sizes for the sizes.

const colorBank = (spec, banks) => ((banks.spanish || {})[spec.topic || 'colors'] || []);
const sizeBank = (banks) => ((banks.spanish || {}).sizes || []);
const colorWord = (x) => x.f || x.es;

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
    const sizes = sizeBank(banks);
    const level = sizes.length >= 2 ? ctx.level(skill) : 1;
    const target = rng.pick(words);
    const rest = rng.shuffle(words.filter((x) => x !== target));

    if (level <= 1) {
      const others = rest.slice(0, Math.min(words.length, 4) - 1);
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
    }

    // Levels 2 and 3: doors differ by color and by size.
    const [size, otherSize] = rng.shuffle(sizes);
    const [c1, c2] = rest;
    // The right door, then doors that are wrong in one way or in both.
    const doors = level === 2
      ? [[target, size], [target, otherSize], [c1, size], [c1, otherSize], [c2, size]]
      : [[target, size], [target, otherSize], [c1, size], [c2, size], [c1, otherSize]];
    const base = {
      ...names, praise: praise(ctx),
      color: colorWord(target), color_en: target.en, say: target.say,
      size: size.es, size_en: size.en,
      no1: colorWord(c1), no1_en: c1.en, no2: colorWord(c2), no2_en: c2.en,
    };
    const say = (text, more = {}) => fill(text, { ...base, ...more }).trim();
    const n = level === 2 ? '2' : '3';
    const hintFor = (x, s) => {
      if (level === 3 && x !== target) return say(w.hint_not, { pick_color: colorWord(x), pick_color_en: x.en });
      if (x !== target) return say(w.hint_color, { hint: fill(target.hint || '', names) });
      return say(w.hint_size, { pick_size: s.es, pick_size_en: s.en });
    };
    return {
      screen: 'pick',
      skill,
      question: say(w[`ask${n}`]),
      prompt: say(w[`prompt${n}`] || w.prompt), retry: say(w.retry),
      options: rng.shuffle(doors).map(([x, s]) => ({
        label: say(w.option),
        color: x.hex,
        size: s.size,
        correct: x === target && s === size,
        miss: say(w.miss2, { pick_color: colorWord(x), pick_color_en: x.en, pick_size: s.es, pick_size_en: s.en, hint: hintFor(x, s) }),
      })),
      right: say(w[`right${n}`]),
      reveal: say(w[`reveal${n}`]),
      learned: [['spanish', target.es], ['spanish', size.es]],
    };
  },

  check(spec, banks) {
    const words = colorBank(spec, banks);
    const at = `spanish.${spec.topic || 'colors'}`;
    if (words.length < 4) return [`colores needs at least 4 words under ${at} in banks.yaml`];
    const out = words.filter((x) => !x.es || !x.en || !x.hex).map((x) => `${at}: "${x.es || '?'}" needs es, en, and hex`);
    const sizes = sizeBank(banks);
    if (sizes.length && sizes.length !== 2) out.push('spanish.sizes needs exactly two sizes (or leave it out to keep colores on level 1)');
    for (const s of sizes) if (!s.es || !s.en || !['big', 'small'].includes(s.size)) out.push(`spanish.sizes: "${s.es || '?'}" needs es, en, and size: big or small`);
    return out;
  },

  longest(spec, banks, names) {
    const w = wording(banks, 'colores');
    const words = colorBank(spec, banks);
    const out = words.map((x) => ({ what: `colores ${x.es}`, question: fill(w.ask, { ...names, es: x.es, en: x.en, say: x.say }) }));
    const sizes = sizeBank(banks);
    if (sizes.length >= 2) {
      const long = (list, key) => list.map(key).sort((a, b) => b.length - a.length);
      const [c1, c2] = long(words, colorWord), [s1] = long(sizes, (s) => s.es);
      const most = { ...names, color: c1, no1: c1, no2: c2, size: s1 };
      out.push({ what: 'colores level 2', question: fill(w.ask2, most) }, { what: 'colores level 3', question: fill(w.ask3, most) });
    }
    return out;
  },
};

// ---------------------------------------------------------------------------
// HOLA Y GRACIAS: someone says something in Spanish; pick the right thing to
// say back. Pick one. The bank (hola.<topic>) is a list of exchanges:
//   says / en:        what they say, and what it means
//   reply / reply_en: the right answer, and what it means
// Wrong answers are the replies to other things. On level 1 the question
// shows the English too; from level 2 the English comes only after a miss.
// The slot says who is talking: { puzzle: hola_y_gracias, topic: street, who: The neighbor }

const holaBank = (spec, banks) => ((banks.hola || {})[spec.topic || ''] || []);

const holaYGracias = {
  screen: 'pick',
  skill: () => 'spanish_hola',
  label: 'Spanish: talking',

  /** @param {Spec} spec @param {MakeCtx} ctx @returns {Puzzle} */
  make(spec, ctx) {
    const { rng, banks, names } = ctx;
    const w = wording(banks, 'hola_y_gracias');
    const all = holaBank(spec, banks);
    const level = ctx.level('spanish_hola');
    const target = rng.pick(all);
    const count = Math.min(all.length, level >= 3 ? 4 : 3);
    const others = rng.shuffle(all.filter((x) => x !== target)).slice(0, count - 1);
    const text = (s) => fill(s || '', names);
    const base = {
      ...names, praise: praise(ctx), who: text(spec.who || w.who),
      says: text(target.says), en: text(target.en), reply: text(target.reply), reply_en: text(target.reply_en),
      hint: text(target.hint || w.hint),
    };
    const say = (t, more = {}) => fill(t, { ...base, ...more }).trim();
    return {
      screen: 'pick',
      skill: 'spanish_hola',
      question: say(level <= 1 ? w.ask_easy : w.ask),
      maxLines: 4,
      prompt: say(w.prompt), retry: say(w.retry),
      options: rng.shuffle([target, ...others]).map((x) => ({
        label: text(x.reply),
        correct: x === target,
        miss: say(w.miss, { pick_es: text(x.reply), pick_en: text(x.reply_en) }),
      })),
      right: say(w.right),
      reveal: say(w.reveal),
      learned: [['spanish', text(target.says)]],
    };
  },

  check(spec, banks) {
    const all = holaBank(spec, banks);
    const at = `hola.${spec.topic}`;
    const out = [];
    if (all.length < 4) out.push(`${at} needs at least 4 exchanges in banks.yaml`);
    for (const x of all) if (!x.says || !x.en || !x.reply || !x.reply_en) out.push(`${at}: "${x.says || '?'}" needs says, en, reply, and reply_en`);
    if (new Set(all.map((x) => x.reply)).size !== all.length) out.push(`${at}: two exchanges have the same reply, so a wrong answer could be right`);
    return out;
  },

  longest(spec, banks, names) {
    const w = wording(banks, 'hola_y_gracias');
    const all = holaBank(spec, banks);
    const text = (s) => fill(s || '', names);
    return all.flatMap((x) => [w.ask_easy, w.ask].map((ask) => ({
      what: `hola_y_gracias "${x.says}"`,
      question: fill(ask, { ...names, who: text(spec.who || w.who), says: text(x.says), en: text(x.en) }),
      maxLines: 4,
      keys: all.map((y) => text(y.reply)),
      maxKeyLines: 1,
    })));
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

// ---------------------------------------------------------------------------
// BOARD PUZZLES. Four archetypes are answered on a board drawn inside the
// card, by tapping its squares:
//   snack_muncher  tap every number that fits a rule, then the DONE key
//   egg_crates     tap a square to fill the crate that many rows and columns
//   dragon_census  a picture graph with one row to fill in
//   memoria        turn over two cards at a time to match a word and a picture
// A board is plain data, so the screen draws it and the bot plays it:
//   toggle  { cols, cells: [{ label }], done }            answer: the squares picked, as a sorted list
//   array   { rows, cols, icon, captions, done }          answer: [rows, columns]
//   graph   { slots, icon, key, rows: [{ label, count, open }], done }   answer: pictures in the open row
//   pairs   { cols, cards: [{ pair, label?, sub?, icon?, hint }] }       no answer: it is played to the end
// The first three are `screen: 'grid'` and also carry check(answer),
// solution (a right answer), decoy (a wrong one, for the bot), and
// miss(answer). An icon is the name of a small picture in the pack's art.

/** Templates of one level, or failing that the nearest easier ones. */
function atLevel(all, lvl) {
  let pool = all.filter((t) => (t.level || 1) === lvl);
  if (!pool.length) pool = all.filter((t) => (t.level || 1) <= lvl);
  return pool.length ? pool : all;
}

const whole = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const range = (v, min, max) => Array.isArray(v) && v.length === 2 && whole(v[0], min, max) && whole(v[1], v[0], max);

// ---------------------------------------------------------------------------
// SNACK MUNCHER: a board of numbers and a rule; tap every number that fits
// (Common Core 3.OA.C.7 multiples, 3.NBT.A.1 rounding). The rules are in the
// bank (snack_muncher.rules):
//   kind: multiple   of: a list of numbers; one is picked. upto: how far the
//                    multiples go (10 unless given, so 4, 8, ... 40)
//   kind: round      to: 10 or 100. target: [min, max] in steps of `to`, so
//                    to: 10 with target: [2, 9] rounds to 20 ... 90
// Each topic has the words around the rule: text: with {rule} in it.

const MUNCH_CELLS = 12;
const munchBank = (banks) => banks.snack_muncher || {};
const munchRules = (banks) => (Array.isArray(munchBank(banks).rules) ? munchBank(banks).rules : []);

/** The numbers that fit a rule, and the near misses around them. */
function munchSets(rule, n) {
  const fits = [], near = [];
  if (rule.kind === 'round') {
    const to = Number(rule.to) || 10, half = to / 2;
    for (let v = n - half; v < n + half; v++) fits.push(v);
    for (let v = n - to; v < n - half; v++) near.push(v);
    for (let v = n + half; v < n + to; v++) near.push(v);
    // The edges are the whole point: 45 and 54 round to 50, 44 and 55 don't.
    return { fits, near, mustFit: [n - half, n + half - 1], mustMiss: [n - half - 1, n + half] };
  }
  const upto = Number(rule.upto) || 10;
  for (let v = 1; v < n * (upto + 1); v++) (v % n === 0 && v <= n * upto ? fits : near).push(v);
  return { fits, near: near.filter((v) => v % n !== 0), mustFit: [], mustMiss: [] };
}

const snackMuncher = {
  screen: 'grid',
  skill: () => 'snack_muncher',
  label: 'Multiples and rounding',

  /** The words for a rule: "are multiples of 4". */
  rule(w, rule, n) {
    if (rule.kind === 'round') return fill(w.rule_round, { t: String(n), unit: w[`unit_${rule.to}`] || String(rule.to) });
    return fill(w.rule_multiple, { n: String(n) });
  },

  /** @param {Spec} spec @param {MakeCtx} ctx @returns {Puzzle} */
  make(spec, ctx) {
    const { rng, banks, names } = ctx;
    const w = wording(banks, 'snack_muncher');
    const topic = munchBank(banks)[spec.topic || ''] || {};
    const rule = rng.pick(atLevel(munchRules(banks), ctx.level('snack_muncher')));
    const round = rule.kind === 'round';
    const n = round ? rng.int(rule.target[0], rule.target[1]) * rule.to : rng.pick(rule.of);
    const { fits, near, mustFit, mustMiss } = munchSets(rule, n);
    const want = Math.min(fits.length, rng.int(4, 5));
    const yes = [...mustFit, ...rng.shuffle(fits.filter((v) => !mustFit.includes(v)))].slice(0, want);
    // Near misses first: the numbers right beside the ones that fit.
    const beside = round ? [] : rng.shuffle([...new Set(yes.flatMap((v) => [v - 1, v + 1]))].filter((v) => near.includes(v))).slice(0, 4);
    const first = [...mustMiss, ...beside];
    const no = [...first, ...rng.shuffle(near.filter((v) => !first.includes(v)))].slice(0, MUNCH_CELLS - yes.length);
    const cells = rng.shuffle([...yes, ...no]).map((v) => ({ label: String(v), value: v }));
    const solution = cells.map((c, i) => (yes.includes(c.value) ? i : -1)).filter((i) => i >= 0);
    const list = yes.slice().sort((a, b) => a - b).join(', ');
    const half = (Number(rule.to) || 10) / 2;
    const base = {
      ...names, praise: praise(ctx), rule: snackMuncher.rule(w, rule, n), n: String(n), t: String(n),
      count: String(yes.length), list, lo: String(n - half), hi: String(n + half - 1),
      skip: [1, 2, 3, 4].map((k) => k * n).join(', '),
    };
    const say = (text, more = {}) => fill(text, { ...base, ...more }).trim();
    const hint = say(round ? w[`hint_round_${rule.to}`] || w.hint_round : w.hint_multiple);
    return {
      screen: 'grid',
      skill: 'snack_muncher',
      question: say(topic.text || w.ask),
      prompt: say(w.prompt), retry: say(w.retry),
      board: { kind: 'toggle', cols: 4, cells: cells.map((c) => ({ label: c.label })), done: say(w.done) },
      check: (picked) => Array.isArray(picked) && picked.length === solution.length && solution.every((i) => picked.includes(i)),
      solution,
      decoy: solution.slice(1),
      miss: (picked) => {
        const wrong = (picked || []).find((i) => !solution.includes(i));
        if (wrong !== undefined) return say(w.miss_wrong, { pick: cells[wrong].label, hint });
        return say(w.miss_short, { hint });
      },
      right: say(w.right),
      reveal: say(w.reveal, { explain: say(round ? w.explain_round : w.explain_multiple) }),
    };
  },

  check(spec, banks) {
    const out = [];
    const topic = munchBank(banks)[spec.topic || ''];
    if (!topic || !topic.text) out.push(`snack_muncher.${spec.topic} needs text: in banks.yaml`);
    else if (!String(topic.text).includes('{rule}')) out.push(`snack_muncher.${spec.topic}.text needs {rule} in it`);
    const rules = munchRules(banks);
    if (!rules.length) out.push('snack_muncher.rules is missing in banks.yaml');
    rules.forEach((r, i) => {
      const at = `snack_muncher.rules[${i + 1}]`;
      if (r.kind === 'round') {
        if (r.to !== 10 && r.to !== 100) out.push(`${at}: to: must be 10 or 100`);
        if (!range(r.target, 1, 9)) out.push(`${at} needs target: [min, max], from 1 to 9`);
      } else if (r.kind === 'multiple') {
        if (!(Array.isArray(r.of) && r.of.length && r.of.every((n) => whole(n, 2, 12)))) out.push(`${at} needs of: [a list of numbers from 2 to 12]`);
        if (r.upto !== undefined && !whole(r.upto, 5, 12)) out.push(`${at}: upto: must be from 5 to 12`);
      } else out.push(`${at}: kind: must be multiple or round`);
    });
    return out;
  },

  longest(spec, banks, names) {
    const w = wording(banks, 'snack_muncher');
    const topic = munchBank(banks)[spec.topic || ''] || {};
    return munchRules(banks).map((r, i) => {
      const n = r.kind === 'round' ? (r.target || [9, 9])[1] * r.to : Math.max(...(r.of || [2]));
      return { what: `snack_muncher.rules[${i + 1}]`, question: fill(topic.text || w.ask, { ...names, rule: snackMuncher.rule(w, r, n) }) };
    });
  },
};

// ---------------------------------------------------------------------------
// EGG CRATES: rows and columns, then sharing fairly (Common Core 3.OA.A.1 to
// 3.OA.A.3). The board is an empty crate; tapping a square fills the crate
// from the top-left corner down to that square. The rules are in the bank
// (egg_crates.rules):
//   ask: build   "Make 3 rows of 4."
//        rows    "There are 12. Put them in 3 equal rows."   (how long is a row?)
//        cols    "There are 12. Put them in rows of 4."      (how many rows?)
//   rows: and cols: [min, max] for the crate he should end up with
// Each topic has an icon: and one sentence for each ask.

const CRATE = { rows: 5, cols: 6 };
const crateBank = (banks) => banks.egg_crates || {};
const crateRules = (banks) => (Array.isArray(crateBank(banks).rules) ? crateBank(banks).rules : []);
const CRATE_ASKS = ['build', 'rows', 'cols'];

const eggCrates = {
  screen: 'grid',
  skill: () => 'egg_crates',
  label: 'Rows and columns',

  /** @param {Spec} spec @param {MakeCtx} ctx @returns {Puzzle} */
  make(spec, ctx) {
    const { rng, banks, names } = ctx;
    const w = wording(banks, 'egg_crates');
    const topic = crateBank(banks)[spec.topic || ''] || {};
    const rule = rng.pick(atLevel(crateRules(banks), ctx.level('egg_crates')));
    const r = rng.int(rule.rows[0], rule.rows[1]), c = rng.int(rule.cols[0], rule.cols[1]);
    const base = { ...names, praise: praise(ctx), r: String(r), c: String(c), n: String(r * c) };
    const say = (text, more = {}) => fill(text, { ...base, ...more }).trim();
    const hint = say(w[`hint_${rule.ask}`]);
    const flipped = r !== c && c <= CRATE.rows && r <= CRATE.cols;
    return {
      screen: 'grid',
      skill: 'egg_crates',
      question: say(topic[rule.ask] || w[`ask_${rule.ask}`]),
      prompt: say(w.prompt), retry: say(w.retry),
      board: {
        kind: 'array', rows: CRATE.rows, cols: CRATE.cols, icon: topic.icon || '',
        captions: { none: say(w.caption_none), one: w.caption_one, many: w.caption },
        done: say(w.done),
      },
      check: (a) => Array.isArray(a) && a[0] === r && a[1] === c,
      solution: [r, c],
      decoy: flipped ? [c, r] : [r, c < CRATE.cols ? c + 1 : c - 1],
      miss: (a) => {
        const [pr, pc] = a || [0, 0];
        const more = { pr: String(pr), pc: String(pc), pn: String(pr * pc), hint };
        if (pr === c && pc === r) return say(w.miss_flip, more);
        if (rule.ask !== 'build' && pr * pc !== r * c) return say(w.miss_total, more);
        return say(w.miss, more);
      },
      right: say(w.right),
      reveal: say(w.reveal, { explain: say(w[`explain_${rule.ask}`]) }),
    };
  },

  check(spec, banks) {
    const out = [];
    const topic = crateBank(banks)[spec.topic || ''];
    if (!topic) out.push(`egg_crates.${spec.topic} is missing in banks.yaml`);
    else for (const ask of CRATE_ASKS) if (!topic[ask]) out.push(`egg_crates.${spec.topic} needs a ${ask}: sentence`);
    const rules = crateRules(banks);
    if (!rules.length) out.push('egg_crates.rules is missing in banks.yaml');
    rules.forEach((r, i) => {
      const at = `egg_crates.rules[${i + 1}]`;
      if (!CRATE_ASKS.includes(r.ask)) out.push(`${at}: ask: must be build, rows, or cols`);
      if (!range(r.rows, 1, CRATE.rows)) out.push(`${at} needs rows: [min, max], up to ${CRATE.rows}`);
      if (!range(r.cols, 2, CRATE.cols)) out.push(`${at} needs cols: [min, max], from 2 to ${CRATE.cols}`);
    });
    return out;
  },

  icons(spec, banks) { return [(crateBank(banks)[spec.topic || ''] || {}).icon].filter(Boolean); },

  longest(spec, banks, names) {
    const w = wording(banks, 'egg_crates');
    const topic = crateBank(banks)[spec.topic || ''] || {};
    return crateRules(banks).map((r, i) => {
      const most = { ...names, r: String((r.rows || [0, 0])[1]), c: String((r.cols || [0, 0])[1]), n: String(CRATE.rows * CRATE.cols) };
      return { what: `egg_crates.${spec.topic} (${r.ask})`, question: fill(topic[r.ask] || w[`ask_${r.ask}`] || '', most) };
    });
  },
};

// ---------------------------------------------------------------------------
// DRAGON CENSUS: a picture graph where each picture stands for more than one
// (Common Core 3.MD.B.3). Three rows; one is empty, and he fills it in by
// tapping. The rules are in the bank (dragon_census.rules):
//   ask: fill    "It rained 15 minutes on MARTES."            (15 ÷ 5 pictures)
//        more    "MARTES had 10 more than LUNES."             (read LUNES first)
//        fewer   "MARTES had 10 fewer than LUNES."
//        total   "It rained 60 minutes in all."               (add the others first)
//   scale: what one picture stands for; one is picked from the list
// Each topic has rows: (three or more labels, kept in this order), an icon:,
// a key: line for under the graph, and one sentence for each ask.

const GRAPH_SLOTS = 6;
const censusBank = (banks) => banks.dragon_census || {};
const censusRules = (banks) => (Array.isArray(censusBank(banks).rules) ? censusBank(banks).rules : []);
const CENSUS_ASKS = ['fill', 'more', 'fewer', 'total'];

const dragonCensus = {
  screen: 'grid',
  skill: () => 'dragon_census',
  label: 'Picture graphs',

  /** @param {Spec} spec @param {MakeCtx} ctx @returns {Puzzle} */
  make(spec, ctx) {
    const { rng, banks, names } = ctx;
    const w = wording(banks, 'dragon_census');
    const topic = censusBank(banks)[spec.topic || ''] || {};
    const rule = rng.pick(atLevel(censusRules(banks), ctx.level('dragon_census')));
    const scale = rng.pick(rule.scale);
    const labels = topic.rows || ['A', 'B', 'C'];
    const start = rng.int(0, labels.length - 3);
    const rows = labels.slice(start, start + 3).map((label) => ({ label: String(label), count: rng.int(1, GRAPH_SLOTS) }));
    const t = rng.int(0, 2);
    let o = (t + rng.int(1, 2)) % 3;
    if (rule.ask === 'more') { rows[o].count = rng.int(1, GRAPH_SLOTS - 1); rows[t].count = rng.int(rows[o].count + 1, GRAPH_SLOTS); }
    if (rule.ask === 'fewer') { rows[o].count = rng.int(2, GRAPH_SLOTS); rows[t].count = rng.int(1, rows[o].count - 1); }
    const count = rows[t].count;
    const total = rows.reduce((a, r) => a + r.count, 0) * scale;
    const base = {
      ...names, praise: praise(ctx), scale: String(scale), row: rows[t].label, other: rows[o].label,
      n: String(count * scale), count: String(count), on: String(rows[o].count * scale),
      d: String(Math.abs(count - rows[o].count) * scale), total: String(total),
      rest: String(total - count * scale),
    };
    const say = (text, more = {}) => fill(text, { ...base, ...more }).trim();
    const hint = say(w[`hint_${rule.ask}`]);
    return {
      screen: 'grid',
      skill: 'dragon_census',
      question: say(topic[rule.ask] || w[`ask_${rule.ask}`]),
      prompt: say(w.prompt), retry: say(w.retry),
      board: {
        kind: 'graph', slots: GRAPH_SLOTS, icon: topic.icon || '', key: say(topic.key || w.key),
        rows: rows.map((r, i) => ({ label: r.label, count: i === t ? 0 : r.count, open: i === t })),
        done: say(w.done),
      },
      check: (a) => a === count,
      solution: count,
      decoy: count < GRAPH_SLOTS ? count + 1 : count - 1,
      miss: (a) => say(w.miss, { pc: String(a), pn: String(a * scale), hint }),
      right: say(w.right),
      reveal: say(w.reveal, { explain: say(w[`explain_${rule.ask}`]) }),
    };
  },

  check(spec, banks) {
    const out = [];
    const topic = censusBank(banks)[spec.topic || ''];
    if (!topic) out.push(`dragon_census.${spec.topic} is missing in banks.yaml`);
    else {
      if (!(Array.isArray(topic.rows) && topic.rows.length >= 3)) out.push(`dragon_census.${spec.topic} needs rows: with three or more labels`);
      else if (new Set(topic.rows).size !== topic.rows.length) out.push(`dragon_census.${spec.topic}: two rows have the same label`);
      for (const ask of CENSUS_ASKS) if (!topic[ask]) out.push(`dragon_census.${spec.topic} needs a ${ask}: sentence`);
    }
    const rules = censusRules(banks);
    if (!rules.length) out.push('dragon_census.rules is missing in banks.yaml');
    rules.forEach((r, i) => {
      const at = `dragon_census.rules[${i + 1}]`;
      if (!CENSUS_ASKS.includes(r.ask)) out.push(`${at}: ask: must be fill, more, fewer, or total`);
      if (!(Array.isArray(r.scale) && r.scale.length && r.scale.every((s) => whole(s, 2, 100)))) out.push(`${at} needs scale: [a list of numbers, 2 or more]`);
    });
    return out;
  },

  icons(spec, banks) { return [(censusBank(banks)[spec.topic || ''] || {}).icon].filter(Boolean); },

  longest(spec, banks, names) {
    const w = wording(banks, 'dragon_census');
    const topic = censusBank(banks)[spec.topic || ''] || {};
    const label = (topic.rows || ['']).map(String).sort((a, b) => b.length - a.length)[0];
    return censusRules(banks).map((r) => {
      const scale = Math.max(...(r.scale || [2]));
      const most = { ...names, scale: String(scale), row: label, other: label, n: String(scale * GRAPH_SLOTS), d: String(scale * GRAPH_SLOTS), total: String(scale * GRAPH_SLOTS * 3) };
      return { what: `dragon_census.${spec.topic} (${r.ask})`, question: fill(topic[r.ask] || w[`ask_${r.ask}`] || '', most) };
    });
  },
};

// ---------------------------------------------------------------------------
// MEMORIA: cards face down; turn over two at a time to match a Spanish word
// with its picture. The bank (memoria.<topic>) is a list of pairs:
//   es / en: the word and what it means
//   icon:    its picture, from the pack's art
// Level 1 is three pairs with the English under each word; level 2 is four
// pairs; level 3 is six. A turn that doesn't match costs nothing but the
// star: as many misses as there are pairs still earns it. Well past that,
// the cards are all turned over for him.

const memoriaBank = (spec, banks) => ((banks.memoria || {})[spec.topic || ''] || []);
const MEMORIA_PAIRS = [3, 4, 6];

const memoria = {
  screen: 'pairs',
  skill: () => 'spanish_memoria',
  label: 'Spanish words',

  /** @param {Spec} spec @param {MakeCtx} ctx @returns {Puzzle} */
  make(spec, ctx) {
    const { rng, banks, names } = ctx;
    const w = wording(banks, 'memoria');
    const all = memoriaBank(spec, banks);
    const level = Math.max(1, Math.min(3, ctx.level('spanish_memoria')));
    const pairs = Math.min(all.length, MEMORIA_PAIRS[level - 1]);
    const chosen = rng.shuffle(all).slice(0, pairs);
    const base = { ...names, praise: praise(ctx), pairs: String(pairs), list: chosen.map((x) => `${x.es}: ${x.en}`).join(', ') };
    const say = (text, more = {}) => fill(text, { ...base, ...more }).trim();
    const cards = rng.shuffle(chosen.flatMap((x, i) => {
      const hint = say(w.hint, { es: x.es, en: x.en });
      return [
        { pair: i, label: x.es, sub: level <= 1 ? x.en : '', hint },
        { pair: i, icon: x.icon, hint },
      ];
    }));
    return {
      screen: 'pairs',
      skill: 'spanish_memoria',
      question: say(level <= 1 ? w.ask_easy : w.ask),
      maxLines: 2,
      prompt: say(w.prompt), retry: say(w.retry),
      board: { kind: 'pairs', cols: pairs === 3 ? 3 : 4, cards, same: say(w.hint_same) },
      starMisses: pairs,
      maxMisses: pairs * 2 + 2,
      right: say(w.right),
      reveal: say(w.reveal),
      learned: chosen.map((x) => ['spanish', x.es]),
    };
  },

  check(spec, banks) {
    const all = memoriaBank(spec, banks);
    const at = `memoria.${spec.topic}`;
    const out = [];
    const most = MEMORIA_PAIRS[MEMORIA_PAIRS.length - 1];
    if (all.length < most) out.push(`${at} needs at least ${most} pairs in banks.yaml`);
    for (const x of all) if (!x.es || !x.en || !x.icon) out.push(`${at}: "${x.es || '?'}" needs es, en, and icon`);
    if (new Set(all.map((x) => x.es)).size !== all.length) out.push(`${at}: two pairs have the same word`);
    if (new Set(all.map((x) => x.icon)).size !== all.length) out.push(`${at}: two pairs have the same icon, so two cards would look alike`);
    return out;
  },

  icons(spec, banks) { return memoriaBank(spec, banks).map((x) => x.icon).filter(Boolean); },

  longest(spec, banks, names) {
    const w = wording(banks, 'memoria');
    const all = memoriaBank(spec, banks);
    return [w.ask_easy, w.ask].map((ask) => ({
      what: `memoria.${spec.topic}`, question: fill(ask, names), maxLines: 2,
      // A word must fit on its card: two short lines.
      cards: all.map((x) => String(x.es)),
    }));
  },
};

export const ARCHETYPES = {
  dragon_hoard: dragonHoard,
  trading_post: tradingPost,
  sunset_clock: sunsetClock,
  stepping_stones: steppingStones,
  colores,
  hola_y_gracias: holaYGracias,
  fact_or_fib: factOrFib,
  snack_muncher: snackMuncher,
  egg_crates: eggCrates,
  dragon_census: dragonCensus,
  memoria,
  rescue,
  code_lock: codeLock,
};

// ---------------------------------------------------------------------------
// Playing one. The card is the puzzle screen (screen.js), or the bot's stand-in.

/**
 * @typedef {{
 *   open: (pz: Puzzle) => Promise<void>,
 *   numpad: (prompt: string, format?: string) => Promise<number>,
 *   pick: (options: { label: string, color?: string, size?: string }[], prompt: string) => Promise<number>,
 *   grid: (board: Record<string, any>, prompt: string, last?: any) => Promise<any>,
 *   pairs: (board: Record<string, any>, prompt: string, opts: { starMisses: number, maxMisses: number }) => Promise<{ done: boolean, misses: number }>,
 *   solve: (board: Record<string, any>, solution: any) => void,
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

  // Memoria has no answer to check: it is played until every pair is found,
  // or until the misses pile up and the cards are turned over for him.
  if (pz.screen === 'pairs') {
    const res = await card.pairs(pz.board || {}, pz.prompt, { starMisses: pz.starMisses || 0, maxMisses: pz.maxMisses || 0 });
    if (res.done) {
      ctx.cue('right');
      await card.close();
      await ctx.say(pz.right, 'good');
      return done(true, res.misses <= (pz.starMisses || 0));
    }
    ctx.cue('miss');
    await card.reveal(pz.reveal);
    await card.close();
    return done(false, false);
  }

  let options = pz.options || [];
  let last; // his last answer on a board, so a second try starts from it
  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompt = attempt === 1 ? pz.prompt : pz.retry;
    let ok = false, missText = '';
    if (pz.screen === 'numpad') {
      const guess = await card.numpad(prompt, pz.format);
      ok = guess === pz.answer;
      missText = pz.miss ? pz.miss(guess) : '';
    } else if (pz.screen === 'grid') {
      last = await card.grid(pz.board || {}, prompt, last);
      ok = !!pz.check && pz.check(last);
      missText = !ok && pz.miss ? pz.miss(last) : '';
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
    else {
      if (pz.screen === 'grid') card.solve(pz.board || {}, pz.solution);
      await card.reveal(pz.reveal);
    }
  }
  await card.close();
  return done(false, false);
}
