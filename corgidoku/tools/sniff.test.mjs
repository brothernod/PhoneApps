// Tests for Sniff (the in-game hint): node tools/sniff.test.mjs [--quick]
// Every hint step must be valid (a true deduction from the board as it is, consistent with the
// solution) and the lowest level available. Checked on every board of the four puzzle files and
// the four bonus files: fresh boards, every state along the grader's own solve, and random
// player states (some corgis down, some correct paw marks) solved by following hints only.
//
// The checks below are written from SPEC.md, not from engine.js: each level has its own small
// reference that finds every elimination it allows, and each kind of step is re-checked from
// its evidence. --quick checks one board in ten (for a fast run while editing).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { sniff, grade, decodeRegions, decodeSolution, makeBoard, findStep, applyStep } from '../engine.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['puzzles.json', 'puzzles-hard.json', 'puzzles-extreme.json', 'puzzles-kids.json',
  'bonus-cozy.json', 'bonus-hard.json', 'bonus-extreme.json', 'bonus-kids.json'];
const QUICK = process.argv.includes('--quick');

// ---------- reference model (from SPEC.md) ----------
function model(n, reg) {
  const row = (i) => Math.floor(i / n), col = (i) => i % n;
  const all = [...Array(n * n).keys()];
  const unitCells = (kind, k) => all.filter((i) => (kind === 'row' ? row(i) : kind === 'column' ? col(i) : reg[i]) === k);
  const units = [];
  for (const kind of ['row', 'column', 'yard']) for (let k = 0; k < n; k++) units.push({ kind, k, cells: unitCells(kind, k) });
  const rulesOut = (a, b) => a !== b && (row(a) === row(b) || col(a) === col(b) || reg[a] === reg[b] || (Math.abs(row(a) - row(b)) <= 1 && Math.abs(col(a) - col(b)) <= 1));
  return { n, reg, row, col, all, units, unitCells, rulesOut };
}
// A state: corgis (Set) and live candidates (Set) = cells not ruled out and not holding a corgi.
const isOpen = (u, S) => !u.cells.some((c) => S.corgis.has(c));
const liveOf = (u, S) => u.cells.filter((c) => S.live.has(c));
function combos(arr, k) {
  const out = [];
  (function rec(s, acc) { if (acc.length === k) return out.push(acc.slice()); for (let x = s; x < arr.length; x++) { acc.push(arr[x]); rec(x + 1, acc); acc.pop(); } })(0, []);
  return out;
}
// Every cell each level can rule out (level 1: the forced corgis instead).
function refLevel(M, S, lv) {
  const out = new Set();
  const openUnits = M.units.filter((u) => isOpen(u, S));
  if (lv === 1) { for (const u of openUnits) { const l = liveOf(u, S); if (l.length === 1) out.add(l[0]); } return out; }
  if (lv === 2) {
    for (const u of openUnits) {
      const l = liveOf(u, S);
      if (!l.length) continue;
      if (u.kind === 'yard') {
        for (const [kind, f] of [['row', M.row], ['column', M.col]]) {
          const lines = new Set(l.map(f));
          if (lines.size === 1) for (const c of M.unitCells(kind, [...lines][0])) if (M.reg[c] !== u.k && S.live.has(c)) out.add(c);
        }
      } else {
        const ys = new Set(l.map((c) => M.reg[c]));
        const f = u.kind === 'row' ? M.row : M.col;
        if (ys.size === 1) for (const c of M.unitCells('yard', [...ys][0])) if (f(c) !== u.k && S.live.has(c)) out.add(c);
      }
    }
    return out;
  }
  if (lv === 3) {
    for (const i of S.live) for (const u of openUnits) {
      if (u.cells.includes(i)) continue;
      const l = liveOf(u, S);
      if (l.length && l.every((c) => M.rulesOut(i, c))) { out.add(i); break; }
    }
    return out;
  }
  // 4: groups of 2; 5: groups of 3 up to (open units - 1).
  const ks = lv === 4 ? [2] : [...Array(n0(openUnits)).keys()].filter((k) => k >= 3);
  for (const k of ks) {
    for (const [gk, lk] of [['yard', 'row'], ['yard', 'column'], ['row', 'yard'], ['column', 'yard']]) {
      const open = openUnits.filter((u) => u.kind === gk);
      if (open.length <= k) continue;
      const f = lk === 'row' ? M.row : lk === 'column' ? M.col : (c) => M.reg[c];
      for (const g of combos(open, k)) {
        const l = g.flatMap((u) => liveOf(u, S));
        const cover = new Set(l.map(f));
        if (cover.size !== k) continue;
        const inGroup = new Set(g.flatMap((u) => u.cells));
        for (const L of cover) for (const c of M.unitCells(lk, L)) if (!inGroup.has(c) && S.live.has(c)) out.add(c);
      }
    }
  }
  return out;
}
const n0 = (openUnits) => openUnits.filter((u) => u.kind === 'row').length; // open rows = open yards = open columns

// The lowest level (1-5) that makes progress, or 6 if none does.
function lowest(M, S) { for (let lv = 1; lv <= 5; lv++) if (refLevel(M, S, lv).size) return lv; return 6; }

// Re-check one step from its own evidence.
function checkStep(M, S, sol, st, where) {
  const isSol = (i) => sol[M.row(i)] === M.col(i);
  const ctx = `${where}: L${st.level} ${st.type} ${JSON.stringify(st.cells)} (${st.why})`;
  assert.ok(st.cells.length > 0, `${ctx}: no cells`);
  for (const c of st.cells) assert.ok(S.live.has(c), `${ctx}: cell ${c} is not a live candidate`);
  if (st.type === 'place') { assert.equal(st.level, 1, ctx); assert.ok(isSol(st.cells[0]), `${ctx}: not a corgi spot`); }
  else for (const c of st.cells) assert.ok(!isSol(c), `${ctx}: clears a corgi spot`);
  const U = (ref) => M.units.find((u) => u.kind === ref.kind && u.k === ref.i);
  const inside = (cells, set) => cells.every((c) => set.includes(c));
  if (st.level === 1) {
    const u = U(st.unit);
    assert.ok(isOpen(u, S), ctx); assert.deepEqual(liveOf(u, S), st.cells, `${ctx}: not the last spot`);
  } else if (st.level === 2) {
    const u = U(st.unit), l = liveOf(u, S);
    assert.ok(isOpen(u, S) && l.length, ctx);
    if (u.kind === 'yard') {
      const line = U(st.line);
      assert.ok(inside(l, line.cells), `${ctx}: yard not confined to that ${st.line.kind}`);
      assert.ok(st.cells.every((c) => line.cells.includes(c) && M.reg[c] !== u.k), `${ctx}: clears outside the line or inside the yard`);
    } else {
      const y = U({ kind: 'yard', i: st.yard });
      assert.ok(inside(l, y.cells), `${ctx}: ${u.kind} not confined to that yard`);
      assert.ok(st.cells.every((c) => y.cells.includes(c) && !u.cells.includes(c)), ctx);
    }
  } else if (st.level === 3) {
    const u = U(st.unit), l = liveOf(u, S), i = st.cells[0];
    assert.equal(st.cells.length, 1, ctx);
    assert.ok(isOpen(u, S) && !u.cells.includes(i) && l.length && l.every((c) => M.rulesOut(i, c)), `${ctx}: a corgi here would not block that ${u.kind}`);
  } else if (st.level === 4 || st.level === 5) {
    const k = st.group.ids.length;
    assert.equal(st.level, k === 2 ? 4 : 5, `${ctx}: group of ${k} at the wrong level`);
    assert.equal(st.cover.ids.length, k, ctx);
    const g = st.group.ids.map((i) => U({ kind: st.group.kind, i }));
    const cv = st.cover.ids.map((i) => U({ kind: st.cover.kind, i }));
    for (const u of g) assert.ok(isOpen(u, S), `${ctx}: group has a finished unit`);
    const coverCells = cv.flatMap((u) => u.cells), groupCells = g.flatMap((u) => u.cells);
    assert.ok(inside(g.flatMap((u) => liveOf(u, S)), coverCells), `${ctx}: group not confined to the cover`);
    assert.ok(st.cells.every((c) => coverCells.includes(c) && !groupCells.includes(c)), ctx);
  } else if (st.level === 6) {
    // Replay the chain from the spot: every corgi is forced (a last spot), then a unit runs out.
    const corgis = new Set(S.corgis), live = new Set(S.live);
    const put = (c) => { corgis.add(c); live.delete(c); for (const j of [...live]) if (M.rulesOut(c, j)) live.delete(j); };
    put(st.cells[0]);
    assert.equal(st.chain.length, st.depth, ctx);
    assert.ok(st.depth <= 6, `${ctx}: chain longer than 6`);
    const T = { corgis, live };
    for (const { cell, unit } of st.chain) {
      const u = U(unit);
      assert.ok(isOpen(u, T), ctx);
      assert.deepEqual(liveOf(u, T), [cell], `${ctx}: chain corgi ${cell} is not forced`);
      put(cell);
    }
    const d = U(st.dead);
    assert.ok(isOpen(d, T) && liveOf(d, T).length === 0, `${ctx}: the ${st.dead.kind} still has room`);
  } else assert.fail(`${ctx}: unknown level`);
  // What the UI highlights: tap 1 (look) and tap 2 (area) are on the board, and the area covers
  // every cell the step changes. The grader's words name the right kind of unit.
  for (const c of [...st.look, ...st.area]) assert.ok(c >= 0 && c < M.n * M.n, `${ctx}: highlight off the board`);
  assert.ok(st.look.length > 0, `${ctx}: nothing to look at`);
  for (const c of st.cells) assert.ok(st.area.includes(c), `${ctx}: cell ${c} not in the highlighted area`);
  if (st.level <= 3) assert.ok(st.why.includes(st.level === 2 && st.line ? st.line.kind : st.unit.kind), `${ctx}: wording names the wrong unit`);
  if (st.level === 1 || st.level === 2) assert.ok(U(st.unit).cells.every((c) => st.look.includes(c)), `${ctx}: look misses the unit`);
  if (st.level === 6) { assert.deepEqual(st.look, [st.cells[0]], ctx); for (const x of st.chain) assert.ok(st.area.includes(x.cell), ctx); }
  const lo = lowest(M, S);
  assert.equal(st.level, lo, `${ctx}: lowest level available is ${lo}`);
}

// ---------- states ----------
function rand32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function stateFrom(M, corgis, out) {
  const C = new Set(corgis);
  const live = new Set(M.all.filter((i) => !C.has(i) && !out.has(i) && ![...C].some((c) => M.rulesOut(c, i))));
  return { corgis: C, live };
}

// Follow hints until solved; every step is checked.
function hintSolve(M, sol, S, where, stats) {
  for (let guard = 0; guard < 400; guard++) {
    const st = sniff(M.n, M.reg, sol, { corgis: [...S.corgis], out: M.all.filter((i) => !S.corgis.has(i) && !S.live.has(i)) });
    if (!st) { assert.equal(S.corgis.size, M.n, `${where}: sniff gave up before the end`); return; }
    assert.notEqual(st.type, 'reveal', `${where}: no technique applies (fallback reveal)`);
    assert.notEqual(st.type, 'wrong', `${where}: no wrong paws here`);
    checkStep(M, S, sol, st, where);
    stats.steps++; stats.lv[st.level] = (stats.lv[st.level] || 0) + 1;
    if (st.type === 'place') { S.corgis.add(st.cells[0]); S.live.delete(st.cells[0]); for (const j of [...S.live]) if (M.rulesOut(st.cells[0], j)) S.live.delete(j); }
    else for (const c of st.cells) S.live.delete(c);
  }
  assert.fail(`${where}: did not finish`);
}

// ---------- run ----------
const t0 = Date.now();
const stats = { boards: 0, steps: 0, lv: {}, path: 0, wrong: 0 };
for (const f of FILES) {
  const d = JSON.parse(readFileSync(path.join(DIR, f), 'utf8'));
  const list = [...(d.daily || []).map((x) => [`daily ${x.date}`, x]), ...(d.campaign || []).map((x) => [`hold ${x.id}`, x]), ...(d.bonus || []).map((x) => [`bonus ${x.id}`, x])];
  const maxLevel = f.includes('extreme') ? 6 : 5;
  list.forEach(([name, p], idx) => {
    if (QUICK && idx % 10) return;
    const where = `${f} ${name}`;
    const reg = decodeRegions(p.r), sol = decodeSolution(p.s), n = p.n;
    const M = model(n, reg), solCells = sol.map((c, r) => r * n + c);
    stats.boards++;
    // 1. The grader's own solve: at every state Sniff gives exactly the grader's next step.
    const g = grade(n, reg, { maxLevel });
    assert.ok(g.solved, where);
    {
      const B = makeBoard(n, reg), cand = new Uint8Array(n * n).fill(1), placed = new Uint8Array(n * n);
      for (const [k, e] of g.log.entries()) {
        const S = { corgis: new Set(M.all.filter((i) => placed[i])), live: new Set(M.all.filter((i) => cand[i] && !placed[i])) };
        const st = sniff(n, reg, sol, { corgis: [...S.corgis], out: M.all.filter((i) => !S.corgis.has(i) && !S.live.has(i)) });
        assert.equal(st.type, e.type, `${where} step ${k}`);
        assert.deepEqual(st.cells, e.cells, `${where} step ${k}: Sniff and the grader disagree`);
        checkStep(M, S, sol, st, `${where} step ${k}`);
        stats.path++;
        applyStep(B, cand, placed, findStep(B, cand, placed, { maxLevel }));
      }
    }
    // 2. Random player states, finished by following hints.
    const R = rand32(n * 7919 + idx * 104729 + f.length);
    for (let t = 0; t < 2; t++) {
      const corgis = solCells.filter(() => R() < (t ? 0.45 : 0.15));
      const known = stateFrom(M, corgis, new Set());
      const out = new Set([...known.live].filter((i) => !solCells.includes(i) && R() < (t ? 0.35 : 0.12)));
      hintSolve(M, sol, stateFrom(M, corgis, out), `${where} random ${t}`, stats);
    }
    // 2b. Grader states with extra correct paw marks the grader wouldn't have yet, finished by hints
    //     (these reach the higher levels from boards a person might really have).
    for (const frac of [0.3, 0.6]) {
      const B = makeBoard(n, reg), cand = new Uint8Array(n * n).fill(1), placed = new Uint8Array(n * n);
      const stop = Math.floor(g.log.length * frac);
      for (let k = 0; k < stop; k++) applyStep(B, cand, placed, findStep(B, cand, placed, { maxLevel }));
      const corgis = M.all.filter((i) => placed[i]);
      const out = new Set(M.all.filter((i) => !placed[i] && (!cand[i] || (!solCells.includes(i) && R() < 0.1))));
      hintSolve(M, sol, stateFrom(M, corgis, out), `${where} path ${frac} + paws`, stats);
    }
    // 2c. Only the corgis known (their neighbors not marked: Auto paws off).
    hintSolve(M, sol, stateFrom(M, solCells.filter(() => R() < 0.3), new Set()), `${where} corgis only`, stats);
    // 3. Wrong paws: plum paws on corgi spots come back first, all of them.
    const bad = solCells.filter(() => R() < 0.3).slice(0, 3);
    if (bad.length) {
      const out = new Set(bad);
      const st = sniff(n, reg, sol, { corgis: [], out: [...out, ...M.all.filter((i) => !solCells.includes(i) && R() < 0.2)] });
      assert.equal(st.type, 'wrong', `${where}: wrong paws not flagged`);
      assert.deepEqual(st.cells, [...bad].sort((a, b) => a - b), `${where}: wrong paw list`);
      stats.wrong++;
    }
    // A corgi that's also passed as a paw mark is just a corgi; a corgi off the solution is wrong.
    if (!bad.length) {
      const st = sniff(n, reg, sol, { corgis: [solCells[0]], out: [solCells[0]] });
      assert.notEqual(st.type, 'wrong', `${where}: a corgi listed twice`);
    }
    const off = M.all.find((i) => !solCells.includes(i));
    assert.deepEqual(sniff(n, reg, sol, { corgis: [off] }), { type: 'wrong', cells: [off], level: 0, look: [off], area: [off] }, `${where}: corgi off the solution`);
    // Solved board: nothing to sniff.
    assert.equal(sniff(n, reg, sol, { corgis: solCells }), null, where);
  });
  console.log(`${f}: ok (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
console.log(`sniff: ${stats.boards} boards, ${stats.path} grader-path states, ${stats.steps} hint-solve steps, ${stats.wrong} wrong-paw checks; steps by level`, stats.lv);
