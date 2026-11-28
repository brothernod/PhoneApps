// Cheddar's tricks tests: node tools/lessons.test.mjs
// Every practice board in lessons.json (main sets, other-track boards 9-10, Show it picks and every
// spare) is checked:
//   - the source board has exactly one answer, matches no board in any other file, and is used once
//   - the frozen state is true: corgis on the answer, paws off it
//   - lessons 1-6: no step below level L exists (findStep with maxLevel L-1 is stuck), the grader's
//     own next step is level L and is part of the answer, and the answer is the only level-L step
//     (allSteps); for What if, the one shortest chain, with `ok` = every spot that dead-ends
//   - the step is re-checked from its evidence against SPEC.md (not engine.js), and the stored
//     evidence matches what the engine finds now
//   - lesson 0: exactly one pair of corgis breaks exactly the rule it says, the rest are right
//   - the ramp: sizes, outline/no outline, counts, and enough spares
//   - What if, in three parts (lessons[6].parts): 6b every chain is 1 forced corgi; 6c boards 1-4 run
//     2 deep, 5-8 run 3, 9-10 run 4-5. 6a "Stuck or not?": the source board needs a what-if; a stuck
//     board has no level 1-5 move; a not-stuck one has ok = every level 1-5 move (place = the corgi
//     ones), Show me = the grader's own step (re-checked from SPEC); each set mixes 4-6 stuck boards
//     with easier moves, at least one a Pair or Group lock
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { solve, grade, decodeRegions, decodeSolution, makeBoard, findStep, allSteps, applyStep, canonicalKey } from '../engine.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = JSON.parse(readFileSync(path.join(DIR, 'lessons.json'), 'utf8'));
const TRACK_SIZES = { chill: [6, 7], cozy: [7, 8], hard: [9, 10], extreme: [9, 10] };
const TRACK_MAX = { chill: 3, cozy: 4, hard: 5, extreme: 6 };
const SIZES = { 0: [5, 6, 7, 8], 1: [5, 6, 7, 8], 2: [5, 6, 7, 8], 3: [5, 6, 7, 8], 4: [6, 7, 7, 8], 5: [7, 8, 8, 8], 6: [6, 7, 7, 8] }; // A, B, board 7, board 8
const TIER = ['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'D', 'D'];
const PART_SIZES = { a: [6, 6, 7, 7, 8, 8, 9, 9, 10, 10], b: [6, 6, 6, 7, 7, 7, 7, 8, 9, 10], c: [6, 6, 6, 7, 7, 7, 7, 8, 9, 10] };
const PART_DEPTH = { b: () => [1, 1], c: (board) => (board <= 4 ? [2, 2] : board <= 8 ? [3, 3] : [4, 5]) };

// ---------- the source boards ----------
const shipped = new Set();
for (const f of ['puzzles.json', 'puzzles-hard.json', 'puzzles-extreme.json', 'puzzles-kids.json',
  'bonus-cozy.json', 'bonus-hard.json', 'bonus-extreme.json', 'bonus-kids.json', 'wild.json']) {
  const p = path.join(DIR, f);
  if (!existsSync(p)) continue;
  const d = JSON.parse(readFileSync(p, 'utf8'));
  for (const b of [...(d.daily || []), ...(d.campaign || []), ...(d.bonus || [])]) shipped.add(canonicalKey(b.n, b.r));
  for (const day of d.days || []) for (const t of ['cozy', 'hard', 'extreme']) for (const r of day[t]?.r || []) shipped.add(canonicalKey(day[t].n, r));
}
assert.ok(shipped.size > 4000, 'read the shipped files');
const keys = new Set();
for (const b of F.boards) {
  const reg = decodeRegions(b.r);
  assert.equal(reg.length, b.n * b.n);
  assert.equal(new Set(reg).size, b.n, 'n yards');
  const res = solve(b.n, reg, 2);
  assert.equal(res.count, 1, 'one answer');
  assert.equal(res.first.join(''), b.s, 'stored answer');
  const k = canonicalKey(b.n, b.r);
  assert.ok(!shipped.has(k), 'not a shipped board');
  assert.ok(!keys.has(k), 'source boards differ');
  keys.add(k);
}

// ---------- a reference model, from SPEC.md ----------
function model(n, reg) {
  const row = (i) => Math.floor(i / n), col = (i) => i % n;
  const unitCells = (kind, k) => [...Array(n * n).keys()].filter((i) => (kind === 'row' ? row(i) : kind === 'column' ? col(i) : reg[i]) === k);
  const touch = (a, b) => a !== b && Math.abs(row(a) - row(b)) <= 1 && Math.abs(col(a) - col(b)) <= 1;
  const rulesOut = (a, b) => a !== b && (row(a) === row(b) || col(a) === col(b) || reg[a] === reg[b] || touch(a, b));
  const units = [];
  for (const kind of ['row', 'column', 'yard']) for (let k = 0; k < n; k++) units.push({ kind, k, cells: unitCells(kind, k) });
  return { n, reg, row, col, unitCells, touch, rulesOut, units };
}

const used = new Map(); // src -> where
let checked = 0;
function checkBoard(L, b, where) {
  const src = F.boards[b.src];
  assert.ok(src, `${where}: source`);
  assert.equal(b.n, src.n, `${where}: size`);
  assert.ok(!used.has(b.src), `${where}: source already used by ${used.get(b.src)}`);
  used.set(b.src, where);
  const n = b.n, reg = decodeRegions(src.r), sol = decodeSolution(src.s), M = model(n, reg);
  const isSol = (i) => sol[M.row(i)] === M.col(i);
  if (L !== '6a') assert.equal(b.count, b.ans.length, `${where}: count`);
  assert.ok(new Set([...b.c, ...b.p]).size === b.c.length + b.p.length, `${where}: a cell is a corgi or a paw, not both`);

  if (L === 0) {
    assert.equal(b.p.length, 0, `${where}: no paws on rules boards`);
    const pairs = [];
    for (let x = 0; x < b.c.length; x++) for (let y = x + 1; y < b.c.length; y++) if (M.rulesOut(b.c[x], b.c[y])) pairs.push([b.c[x], b.c[y]]);
    assert.equal(pairs.length, 1, `${where}: exactly one pair breaks a rule`);
    assert.deepEqual(pairs[0], b.ans, `${where}: the answer is that pair`);
    assert.ok(b.ans.includes(b.moved), `${where}: the moved corgi is in it`);
    for (const i of b.c) if (i !== b.moved) assert.ok(isSol(i), `${where}: other corgis are right`);
    assert.ok(isSol(b.from) && !b.c.includes(b.from), `${where}: moved off a right spot`);
    const [a, o] = b.ans, sameRow = M.row(a) === M.row(o), sameCol = M.col(a) === M.col(o), yard = reg[a] === reg[o];
    const rule = M.touch(a, o) ? (sameRow || sameCol ? 'side' : 'diagonal') : sameRow ? 'row' : sameCol ? 'column' : 'yard';
    assert.ok(!(yard && rule !== 'yard'), `${where}: breaks only one rule`);
    assert.equal(b.rule, rule, `${where}: rule`);
    checked++;
    return;
  }

  const { B, cand, placed, live } = state(b, M, reg, isSol, where);
  if (L === '6a') { check6a(b, B, cand, placed, live, M, isSol, src, reg, where); checked++; return; }
  for (const i of b.ans) assert.ok(live.has(i), `${where}: answer cells are still open`);
  for (const i of b.ans) assert.equal(isSol(i), L === 1, `${where}: ${L === 1 ? 'corgi on' : 'paws off'} the answer`);

  // nothing easier works; the next step is level L and part of the answer
  assert.equal(findStep(B, cand, placed, { maxLevel: L - 1 }), null, `${where}: stuck below level ${L}`);
  const next = findStep(B, cand, placed, { maxLevel: L });
  assert.ok(next && next.level === L, `${where}: next step is level ${L}`);
  assert.ok(next.cells.every((c) => b.ans.includes(c)), `${where}: grader's step is in the answer`);
  const steps = allSteps(B, cand, placed, L);
  if (L === 6) {
    const min = Math.min(...steps.map((s) => s.depth)), best = steps.filter((s) => s.depth === min);
    assert.equal(best.length, 1, `${where}: one shortest chain`);
    assert.deepEqual(best[0].cells, b.ans, `${where}: the answer is the shortest chain`);
    assert.deepEqual(next.cells, b.ans, `${where}: Sniff says the same`);
    assert.deepEqual(steps.map((s) => s.cells[0]).sort((x, y) => x - y), b.ok, `${where}: ok = every spot that dead-ends`);
  } else {
    const union = [...new Set(steps.flatMap((s) => s.cells))].sort((x, y) => x - y);
    assert.deepEqual(union, b.ans, `${where}: answer = every level-${L} move`);
    const cover = steps.find((s) => s.cells.length === union.length && s.cells.every((c) => union.includes(c)));
    assert.ok(cover, `${where}: one step explains the answer`);
    const strip = ({ cells, ...rest }) => rest;
    assert.deepEqual(strip(b.step), strip(cover), `${where}: stored evidence`);
  }
  assert.equal(b.step.level, L);

  recheck(L, b.step, b.ans, b, live, placed, M, where);
  checked++;
}

// the frozen state: corgis on the answer, paws off it, each paw a real deduction
function state(b, M, reg, isSol, where) {
  const n = b.n;
  for (const i of b.c) assert.ok(isSol(i), `${where}: corgi on the answer`);
  for (const i of b.p) assert.ok(!isSol(i), `${where}: paw off the answer`);
  const B = makeBoard(n, reg), cand = new Uint8Array(n * n).fill(1), placed = new Uint8Array(n * n);
  for (const i of b.c) applyStep(B, cand, placed, { type: 'place', cells: [i] });
  for (const i of b.p) { assert.ok(cand[i], `${where}: paw isn't already ruled out by a corgi`); cand[i] = 0; }
  const live = new Set([...Array(n * n).keys()].filter((i) => cand[i] && !placed[i]));
  return { B, cand, placed, live };
}

// 6a, Stuck or not?
const strip = ({ cells, ...rest }) => rest;
function check6a(b, B, cand, placed, live, M, isSol, src, reg, where) {
  assert.equal(grade(b.n, reg, { maxLevel: 6 }).level, 6, `${where}: the source board needs a what-if`);
  assert.equal(b.help, 'none', `${where}: no outline on 6a`);
  const easy = findStep(B, cand, placed, { maxLevel: 5 });
  if (b.stuck) {
    assert.equal(easy, null, `${where}: stuck: no level 1-5 move`);
    const w = findStep(B, cand, placed, { maxLevel: 6 });
    assert.ok(w && w.level === 6, `${where}: a what-if is next`);
    assert.deepEqual(b.step, w, `${where}: stored what-if = Sniff's`);
    assert.equal(b.form, 'stuck');
    assert.ok(b.count === 0 && !b.ans.length && !b.ok.length && !b.place.length, `${where}: nothing to tap but the button`);
    recheck(6, w, w.cells, { ...b, ans: w.cells }, live, placed, M, where);
    return;
  }
  assert.ok(easy, `${where}: not stuck: an easier move`);
  assert.ok(easy.level >= 2, `${where}: no plain last spot`);
  assert.deepEqual(b.step, easy, `${where}: Show me = the grader's step`);
  assert.equal(b.form, `n${easy.level}`);
  assert.deepEqual(b.ans, [...easy.cells].sort((x, y) => x - y), `${where}: ans`);
  assert.equal(b.count, 1);
  const ok = new Set(), place = new Set();
  for (let L = 1; L <= 5; L++) for (const st of allSteps(B, cand, placed, L)) for (const x of st.cells) { ok.add(x); if (st.type === 'place') place.add(x); }
  assert.deepEqual(b.ok, [...ok].sort((x, y) => x - y), `${where}: ok = every level 1-5 move`);
  assert.deepEqual(b.place, [...place].sort((x, y) => x - y), `${where}: place`);
  for (const i of b.ok) { assert.ok(live.has(i), `${where}: right moves are open spots`); assert.equal(isSol(i), place.has(i), `${where}: corgi moves on the answer, paws off it`); }
  for (const i of b.ans) assert.ok(ok.has(i), `${where}: Show me is a right move`);
  recheck(easy.level, easy, b.ans, { ...b, subset: easy.level === 3 }, live, placed, M, where);
}

// re-check a step from its evidence (SPEC.md)
function recheck(L, s, ans, b, live, placed, M, where) {
  const liveOf = (cells) => cells.filter((c) => live.has(c)), n = b.n;
  b = { ...b, ans };
  const cellsOf = (kind, i) => M.unitCells(kind, i);
  const open = (cells) => !cells.some((c) => placed[c]);
  if (L === 1) {
    const u = cellsOf(s.unit.kind, s.unit.i);
    assert.ok(open(u) && liveOf(u).length === 1 && liveOf(u)[0] === b.ans[0], `${where}: last spot`);
  } else if (L === 2) {
    const u = cellsOf(s.unit.kind, s.unit.i), l = liveOf(u);
    const other = s.unit.kind === 'yard' ? cellsOf(s.line.kind, s.line.i) : cellsOf('yard', s.yard);
    assert.ok(l.length && l.every((c) => other.includes(c)), `${where}: confined`);
    assert.deepEqual(liveOf(other).filter((c) => !u.includes(c)).sort((x, y) => x - y), b.ans, `${where}: clears the rest`);
  } else if (L === 3) {
    const u = cellsOf(s.unit.kind, s.unit.i), l = liveOf(u);
    const blockers = [...live].filter((x) => !u.includes(x) && l.every((c) => M.rulesOut(x, c))).sort((x, y) => x - y);
    assert.ok(open(u) && l.length > 0);
    // a lesson-3 board's answer is every such spot; Sniff's step (6a's Show me) may name only some
    if (b.subset) assert.ok(b.ans.length && b.ans.every((x) => blockers.includes(x)), `${where}: each spot would empty the ${s.unit.kind}`);
    else assert.deepEqual(blockers, b.ans, `${where}: every spot that would empty the ${s.unit.kind}`);
  } else if (L === 4 || L === 5) {
    const k = s.group.ids.length;
    assert.equal(s.cover.ids.length, k);
    assert.ok(L === 4 ? k === 2 : k >= 3 && k <= n - 2, `${where}: group size`);
    const gcells = s.group.ids.flatMap((i) => cellsOf(s.group.kind, i)), ccells = s.cover.ids.flatMap((i) => cellsOf(s.cover.kind, i));
    for (const i of s.group.ids) assert.ok(open(cellsOf(s.group.kind, i)), `${where}: group units are open`);
    assert.ok(liveOf(gcells).every((c) => ccells.includes(c)), `${where}: the group sits inside the cover`);
    for (const i of s.cover.ids) assert.ok(liveOf(gcells).some((c) => cellsOf(s.cover.kind, i).includes(c)), `${where}: every cover unit is used`);
    assert.deepEqual(liveOf(ccells).filter((c) => !gcells.includes(c)).sort((x, y) => x - y), b.ans, `${where}: clears the cover outside the group`);
  } else if (L === 6) {
    assert.ok(s.depth >= 1 && s.depth <= 6 && s.chain.length === s.depth, `${where}: chain length`);
    const lv = new Set(live), corgis = new Set(b.c);
    const put = (x) => { corgis.add(x); lv.delete(x); for (const y of [...lv]) if (M.rulesOut(x, y)) lv.delete(y); };
    put(b.ans[0]);
    for (const { cell, unit } of s.chain) {
      const u = cellsOf(unit.kind, unit.i);
      assert.ok(!u.some((c) => corgis.has(c)) && u.filter((c) => lv.has(c)).length === 1 && lv.has(cell) && u.includes(cell), `${where}: forced corgi`);
      put(cell);
    }
    const dead = cellsOf(s.dead.kind, s.dead.i);
    assert.ok(!dead.some((c) => corgis.has(c)) && !dead.some((c) => lv.has(c)), `${where}: dead end`);
  }
}

// ---------- the ramp ----------
assert.equal(F.lessons.length, 7);
let spares = 0, mains = 0;
const deep = { 4: 0, 5: 0 };
for (const l of F.lessons) {
  const L = l.id;
  if (L === 6) { whatIf(l); continue; }
  mains += l.main.length;
  const tracks = Object.keys(TRACK_MAX).filter((t) => L <= TRACK_MAX[t]);
  assert.deepEqual(l.tracks, tracks, `L${L} tracks`);
  const ramp = (boards, where, track, numbers) => {
    assert.deepEqual(boards.map((b) => b.board), numbers, `${where}: board numbers`);
    for (const b of boards) {
      const k = b.board - 1, tier = TIER[k];
      assert.equal(b.tier, tier);
      assert.equal(b.help, tier === 'A' || tier === 'B' ? 'outline' : 'none', `${where} ${b.board}: outline`);
      const want = tier === 'D' ? TRACK_SIZES[track][k - 8] : tier === 'A' ? SIZES[L][0] : tier === 'B' ? SIZES[L][1] : SIZES[L][k - 4];
      assert.equal(b.n, want, `${where} ${b.board}: size`);
      if (L > 0 && tier === 'A') assert.ok(b.count <= (L >= 5 ? 2 : 1), `${where} ${b.board}: small answer early`);
      checkBoard(L, b, `L${L} ${where} ${b.board}`);
    }
  };
  ramp(l.main, 'main', tracks[0], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(Object.keys(l.finale), tracks.slice(1), `L${L} finale tracks`);
  for (const t of tracks.slice(1)) ramp(l.finale[t], `finale ${t}`, t, [9, 10]);
  if (l.show) { assert.ok(l.show.n <= 6, 'Show it is tiny'); checkBoard(L, l.show, `L${L} show`); }
  l.spares.forEach((s, i) => {
    ramp(s.boards, `spare ${i + 1}`, null, [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.deepEqual(Object.keys(s.finale), tracks);
    for (const t of tracks) ramp(s.finale[t], `spare ${i + 1} ${t}`, t, [9, 10]);
    spares += s.boards.length + tracks.length * 2;
  });
  const per = l.spares.reduce((a, s) => a + s.boards.length + Object.values(s.finale).flat().length, 0);
  assert.ok(per >= (L >= 5 ? 40 : 20), `L${L}: spare pool ${per}`);
}

// What if: three parts, Extreme track only
function whatIf(l) {
  assert.deepEqual(l.tracks, ['extreme'], 'What if tracks');
  assert.ok(!l.main && !l.spares, 'What if boards live in parts');
  assert.deepEqual(Object.keys(l.parts), ['a', 'b', 'c'], 'What if parts');
  for (const [k, x] of Object.entries(l.parts)) {
    const L = k === 'a' ? '6a' : 6, where = `6${k}`;
    assert.equal(x.part, k);
    const ramp = (boards, w, sizes, numbers) => {
      assert.deepEqual(boards.map((b) => b.board), numbers, `${w}: board numbers`);
      for (const b of boards) {
        const t = TIER[b.board - 1];
        assert.equal(b.tier, t);
        if (sizes) assert.equal(b.n, sizes[b.board - 1], `${w} ${b.board}: size`);
        else assert.ok(b.n >= 6 && b.n <= 10, `${w} ${b.board}: size`);
        if (k !== 'a') {
          assert.equal(b.help, t === 'A' || t === 'B' ? 'outline' : 'none', `${w} ${b.board}: outline`);
          const [lo, hi] = PART_DEPTH[k](b.board);
          assert.ok(b.step.depth >= lo && b.step.depth <= hi, `${w} ${b.board}: chain ${b.step.depth}, want ${lo}-${hi}`);
          if (b.step.depth >= 4) deep[b.step.depth]++;
        }
        checkBoard(L, b, `${w} ${b.board}`);
      }
      if (k === 'a') {
        const st = boards.filter((b) => b.stuck).length;
        if (boards.length === 10) {
          assert.ok(st >= 4 && st <= 6, `${w}: ${st} stuck of 10`);
          assert.ok(boards.some((b) => !b.stuck && b.step.level >= 4), `${w}: a not-stuck board with a Pair or Group lock`);
        }
        if (!sizes) assert.deepEqual(boards.map((b) => b.n), boards.map((b) => b.n).sort((x, y) => x - y), `${w}: sizes rise`);
      }
    };
    ramp(x.main, `${where} main`, PART_SIZES[k], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    mains += x.main.length;
    assert.deepEqual(x.finale, {});
    assert.ok(x.show && x.show.n <= 6, `${where}: Show it is tiny`);
    checkBoard(L, x.show, `${where} show`);
    if (k === 'a') assert.ok(x.show.stuck, '6a Show it is a stuck board');
    else assert.equal(x.show.step.depth, k === 'b' ? 1 : 2, `${where} Show it chain`);
    x.spares.forEach((s, i) => {
      assert.deepEqual(Object.keys(s.finale), ['extreme']);
      ramp([...s.boards, ...s.finale.extreme], `${where} spare ${i + 1}`, k === 'a' ? null : PART_SIZES[k], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      spares += 10;
    });
    assert.ok(x.spares.length * 10 >= 40, `${where}: spare pool`);
  }
}
assert.ok(deep[4] + deep[5] >= 10, `4-5 deep chains: ${deep[4]} + ${deep[5]}`);
assert.equal(used.size, F.boards.length, 'every source board is used');
console.log(`ok: ${checked} lesson boards (${mains} main, ${spares} spares) from ${F.boards.length} fresh source boards; ${deep[4]} chains 4 deep and ${deep[5]} 5 deep`);
