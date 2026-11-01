// Bot playtester: compiles the story, then plays it many times with random
// choices and ~80% puzzle success. Fails on compile errors, dead ends, or
// runs that never finish, and prints a rough playtime estimate.
//
//   node mudd/tools/botplay.mjs [game] [runs]
//   node mudd/tools/botplay.mjs el-morro 1000

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const inkjs = require(path.join(here, '../vendor/ink-full.js'));

const game = process.argv[2] || 'el-morro';
const runs = Number(process.argv[3] || 1000);
const src = readFileSync(path.join(here, `../games/${game}/story.ink`), 'utf8');

const compiler = new inkjs.Compiler(src);
let story;
try {
  story = compiler.Compile();
} catch {
  console.error('COMPILE FAILED\n' + (compiler.errors || []).join('\n'));
  process.exit(1);
}
for (const w of compiler.warnings || []) console.warn('warning:', w);

const WORDS_PER_MIN = 90;      // a 7-year-old reading short screens
const SECONDS_PER_PUZZLE = 60;
let finished = 0, totalWords = 0, totalPuzzles = 0, totalChoices = 0;
const problems = new Set();

for (let r = 0; r < runs; r++) {
  story.ResetState();
  story.variablesState.hero = 'Hero';
  story.variablesState.sibling = 'Sidekick';
  story.variablesState.pet = 'Pup';
  let words = 0, steps = 0, pendingPuzzle = false;
  for (;;) {
    while (story.canContinue) {
      words += story.Continue().split(/\s+/).filter(Boolean).length;
      if ((story.currentTags || []).some((t) => String(t).trim().startsWith('puzzle:'))) pendingPuzzle = true;
    }
    const ch = story.currentChoices;
    if (!ch.length) { finished++; break; }
    if (++steps > 500) { problems.add('a run took more than 500 choices (a loop?)'); break; }
    const pass = ch.findIndex((c) => c.text.trim() === '@pass');
    const fail = ch.findIndex((c) => c.text.trim() === '@fail');
    if (pass >= 0 && fail >= 0) {
      if (!pendingPuzzle) problems.add('@pass/@fail choices without a # puzzle: tag');
      pendingPuzzle = false;
      totalPuzzles++;
      story.ChooseChoiceIndex(Math.random() < 0.8 ? pass : fail);
      continue;
    }
    if (pendingPuzzle) problems.add('a # puzzle: tag not followed by [@pass] and [@fail] choices');
    const visible = ch.filter((c) => !c.text.trim().startsWith('@'));
    if (!visible.length) { problems.add('only hidden @ choices left (dead end)'); break; }
    totalChoices++;
    story.ChooseChoiceIndex(visible[Math.floor(Math.random() * visible.length)].index);
  }
  totalWords += words;
}

const avgMin = totalWords / runs / WORDS_PER_MIN + ((totalPuzzles / runs) * SECONDS_PER_PUZZLE) / 60;
console.log(`${game}: ${finished}/${runs} runs finished`);
console.log(`avg ${Math.round(totalWords / runs)} words, ${(totalPuzzles / runs).toFixed(1)} puzzles, ${(totalChoices / runs).toFixed(1)} choices`);
console.log(`estimated playtime: ~${avgMin.toFixed(1)} minutes`);
for (const p of problems) console.error('PROBLEM:', p);
process.exit(problems.size || finished < runs ? 1 : 0);
