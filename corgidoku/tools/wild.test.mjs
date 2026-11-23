// Wild Week engine tests: node tools/wild.test.mjs
// solveMulti against brute force, the union auto paws, and sets from the 2026-11-22 test page
// grading exactly as the test page's grader did (Cozy at max level 4, Hard and Extreme at 5).
import assert from 'node:assert/strict';
import { solveMulti, gradeWild, makeMulti, solve, decodeRegions, rng, randomSolution, growRegions } from '../engine.js';

// Brute force: every column permutation that keeps corgis apart and fits every map.
function brute(n, maps) {
  let count = 0;
  const perm = (p) => {
    if (p.length === n) {
      if (maps.every((m) => new Set(p.map((c, r) => m[r * n + c])).size === n)) count++;
      return;
    }
    for (let c = 0; c < n; c++) if (!p.includes(c) && (!p.length || Math.abs(c - p.at(-1)) > 1)) perm([...p, c]);
  };
  perm([]);
  return count;
}
const rand = rng(31);
for (let t = 0; t < 60; t++) {
  const n = 5 + (t % 3), cols = randomSolution(n, rand);
  const maps = Array.from({ length: 1 + (t % 3) }, () => growRegions(n, cols, rand));
  const want = brute(n, maps);
  assert.equal(solveMulti(n, maps, 1e6), want, `solveMulti count ${t}`);
  assert.ok(want >= 1, 'the grown answer always fits');
  if (maps.length === 1) assert.equal(solve(n, maps[0], 1e6).count, want, 'one map = the single-map solver');
}

// A corgi rules out its yard in every map.
{
  const n = 5, a = decodeRegions('aabbbaabbbcabbdcddddcddde'), b = decodeRegions('abbbbaabbbaacbbdccbbddcee');
  const B = makeMulti(n, [a, b]);
  for (let i = 0; i < n * n; i++) for (let j = 0; j < n * n; j++) {
    if (i === j) continue;
    const r = Math.floor(i / n), c = i % n, rr = Math.floor(j / n), cc = j % n;
    const want = r === rr || c === cc || (Math.abs(r - rr) <= 1 && Math.abs(c - cc) <= 1) || a[i] === a[j] || b[i] === b[j];
    assert.equal(B.peers[i].has(j), want, `peers ${i} ${j}`);
  }
}

// Known sets from the test page grade the same.
const KNOWN = [{"n":8,"s":"35170624","r":["gggghhhhaagghhhbaagghhbbddggebbbddcceeebddccccebdcccccbbdcccfffb","fgdddddcfgdddhccfgddddccffffbbccffffbbbcffabbbbbffaabbbbfffeebbb"],"max":4,"lv":4,"st":15,"sw":2},{"n":8,"s":"02516473","r":["eebbaaaaeebaaaaaefaaaaaaefaaaaggedhhagggdddhhgggddddhcccddddhhcc","ggghhhhhggfhhhhhggaehhhhgaaehhhhaaeeeccbaaaeebcbaaadbbbbaaddbbbb"],"max":4,"lv":4,"st":24,"sw":2},{"n":9,"s":"830425716","r":["daaaahhbbdaaaahhbbdaaaahhhhddiahhhhhdiihhhhchiihhgghcciehhggccceehhcccffeeeefffff","fffcccccaffbbccccafffcccccefcccccgcefhhccggeeiihicggeeiiiiggeeeiiiiggdddiiidddddd","ccbaaaaaaccbbiaaaacccbiiaaacgggiiaeeggggiieeegggiieeeedddiiehfhddddihhfhdddhhhhhh"],"max":5,"lv":5,"st":27,"sw":3,"per":[8,14,5]},{"n":10,"s":"5720413869","r":["heeccccccchheeccaaaaheeecaaaaaheebddaaaahhbbdddaaabbbffaaaajfffffggiijfffffggiijfffgggggijfffgggggjj","ggjjhhhhddggjjhhhdddggjjcaadddggggcaaaddgggccaaaaebbbaaaaieebbaaaaaiiebbaaaffiieaaaffffiieaaaffffeee","iiiaaaabbbgiiaaaabbbgiiaaaaabhggicccccchegccccchhheedccchhhfeeddjchhhfeeddjhhhhfeeddjjjfffeeddffffff","ccceeeeeeebccceeedddbcccceddddbbbfffdhhhbbbffffhhhaafffffhhhaaajjjhhhhaaajjjhhggaaajhhhiiiaaajhhhiii"],"max":5,"lv":5,"st":36,"sw":6,"per":[8,3,10,15]}];
for (const p of KNOWN) {
  const maps = p.r.map(decodeRegions);
  const g = gradeWild(p.n, maps, p.max);
  assert.ok(g.solved, 'solved');
  assert.deepEqual([g.level, g.steps, g.switches], [p.lv, p.st, p.sw], `grade ${p.s}`);
  if (p.per) assert.deepEqual(g.per, p.per, `steps per map ${p.s}`);
  assert.equal(solveMulti(p.n, maps, 2), 1, 'one answer for all maps');
  for (const m of maps) assert.ok(solveMulti(p.n, [m], 2) >= 2, 'no single map is enough');
}
// ---------- shop: rates, unlock order, prizes ----------
const shop = await import('../shop.js');
const { payout, wildOpen, wildCount, syncUnlocks, buy, shopDefaults, coinsFor, WILD } = shop;
const fresh = () => { const db = { progress: {} }; shopDefaults(db); return db; };
const solveIt = (db, pid, at, mistakes = 0) => { db.progress[pid] = { solved: true, solvedAt: at, mistakes }; return payout(db, pid, false); };
{
  const db = fresh();
  assert.deepEqual(solveIt(db, 'w:2026-11-23', '2026-11-25'), { coins: 26, weekly: 0 }, 'Cozy Wild 20 + clean 6, catch-up pays full');
  assert.deepEqual(solveIt(db, 'hw:2026-11-23', '2026-11-25', 1), { coins: 30, weekly: 0 }, 'Hard Wild 30, not clean');
  assert.deepEqual(solveIt(db, 'xw:2026-11-23', '2026-11-25'), { coins: 46, weekly: 0 }, 'Extreme Wild 40 + 6');
  assert.deepEqual(payout(db, 'xw:2026-11-23', false), { coins: 0, weekly: 0 }, 'pays once');
  // Five Wild solves on five days never make the weekly bonus.
  const w = fresh();
  for (const d of ['23', '24', '25', '26', '27']) assert.equal(solveIt(w, `w:2026-11-${d}`, `2026-11-${d}`).weekly, 0, 'no weekly from Wild');
  assert.equal(coinsFor('w:2026-11-23', { mistakes: 0 }, false, false), 20, 'back pay rate without clean');
}
{
  // Monday: only Monday's Cozy; beating it opens Monday's Hard, then Extreme.
  const db = fresh(), mon = '2026-11-23';
  assert.ok(wildOpen(db, mon, 'cozy', mon));
  assert.ok(!wildOpen(db, mon, 'hard', mon) && !wildOpen(db, mon, 'extreme', mon));
  assert.ok(!wildOpen(db, '2026-11-24', 'cozy', mon), 'a future day is locked');
  solveIt(db, `w:${mon}`, mon);
  assert.ok(wildOpen(db, mon, 'hard', mon) && !wildOpen(db, mon, 'extreme', mon));
  solveIt(db, `hw:${mon}`, mon);
  assert.ok(wildOpen(db, mon, 'extreme', mon));
  // Start over (solved cleared, paid kept) doesn't lock it again.
  db.progress[`hw:${mon}`].solved = false;
  assert.ok(wildOpen(db, mon, 'extreme', mon), 'Start over keeps the next tier open');
}
{
  // Wednesday first launch: Cozy for Mon-Wed open, every Hard/Extreme locked.
  const db = fresh(), wed = '2026-11-25';
  for (const d of ['23', '24', '25']) assert.ok(wildOpen(db, `2026-11-${d}`, 'cozy', wed));
  for (const d of ['23', '24', '25']) for (const t of ['hard', 'extreme']) assert.ok(!wildOpen(db, `2026-11-${d}`, t, wed));
  assert.ok(!wildOpen(db, '2026-11-26', 'cozy', wed));
  solveIt(db, 'w:2026-11-25', wed);
  assert.ok(wildOpen(db, '2026-11-25', 'hard', wed) && !wildOpen(db, '2026-11-23', 'hard', wed) && !wildOpen(db, '2026-11-24', 'hard', wed), 'only Wednesday\'s Hard opens');
}
{
  // Sunday: all 21 in order; 7 of a tier grants the shades. After the week: nothing.
  const db = fresh(), sun = '2026-11-29';
  let opened = 0;
  for (const t of ['cozy', 'hard', 'extreme']) for (let d = 23; d <= 29; d++) {
    const date = `2026-11-${d}`;
    assert.ok(wildOpen(db, date, t, sun), `${t} ${date} open on Sunday in order`);
    opened++;
    solveIt(db, `${{ cozy: 'w', hard: 'hw', extreme: 'xw' }[t]}:${date}`, sun);
    if (t === 'cozy' && d === 28) assert.deepEqual(syncUnlocks(db), [], 'six is not enough');
  }
  assert.equal(opened, 21);
  const got = syncUnlocks(db).map((g) => g.it.id);
  assert.deepEqual(got, ['ravecozy', 'ravehard', 'raveled'], 'all three shades');
  assert.deepEqual(syncUnlocks(db), [], 'idempotent');
  for (const t of ['cozy', 'hard', 'extreme']) assert.ok(!wildOpen(db, '2026-11-29', t, '2026-11-30'), 'nothing playable after the week');
  assert.ok(!buy(db, 'ravecozy', false) && !buy(fresh(), 'raveled', false), 'shades are never for sale');
}
{
  // Solved after the deadline: no prize.
  const db = fresh();
  for (let d = 23; d <= 28; d++) solveIt(db, `w:2026-11-${d}`, '2026-11-29');
  solveIt(db, 'w:2026-11-29', '2026-11-30');
  assert.equal(wildCount(db, 'cozy'), 6);
  assert.deepEqual(syncUnlocks(db), [], 'a solve on Monday 11-30 does not count');
  assert.equal(WILD.end, '2026-11-29');
}
console.log('wild engine + shop test passed');
