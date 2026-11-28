// Cheddar's tricks: builds lessons.json, the practice boards for the 7 lessons (see the tutorial plan).
//   node tools/lessons.mjs [--seed 7] [--scale 1]      (then: node tools/lessons.test.mjs)
//   node tools/lessons.mjs --sheet out.html             draws the contact sheet from lessons.json (no rebuild)
//
// It makes fresh boards (never the shipped puzzle files: canonicalKey keeps every lesson board off
// every daily, Climb hold, bonus yard and Wild map) and solves each with grade(). Each time the grader
// takes a step of level L, the state just before it is a candidate for lesson L: findStep always
// takes the lowest step, so nothing easier works there. A candidate is kept only if one level-L step
// explains every level-L move on the board (allSteps in engine.js), so the answer is unique and the
// count Cheddar shows is honest. Lesson 0 (the rules) instead takes a correct partial board and moves
// one corgi so it breaks exactly one rule.
//
// Candidates are scored for the ramp (size, how full, answer size, kind and form of unit, chain
// length) and fill, per lesson:
//   main     10 boards. Boards 9-10 are for the lesson's first track (lessons 0-3 Chill, 4 Cozy,
//            5 Hard, 6 Extreme)
//   finale   boards 9-10 for each other track the lesson is in (full size for that mode)
//   show     a suggested Show it / Watch it board (smallest and clearest), for Jonathan to confirm
//   spares   More practice: whole sets on the same ramp (boards 1-8, plus 9-10 for every track)
// No source board is used twice anywhere in the file.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { generate, rng, grade, allSteps, canonicalKey, decodeRegions, makeBoard } from '../engine.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : def; };
const SEED = +arg('seed', 7), SCALE = +arg('scale', 1);

export const LESSONS = ['The rules', 'Last spot', 'Confined', 'Would block', 'Pair lock', 'Group lock', 'What if'];
export const TRACKS = { chill: [0, 3], cozy: [0, 4], hard: [0, 5], extreme: [0, 6] };
export const TRACK_SIZES = { chill: [6, 7], cozy: [7, 8], hard: [9, 10], extreme: [9, 10] };
const tracksFor = (L) => Object.keys(TRACKS).filter((t) => L <= TRACKS[t][1]);
const SPARE_SETS = [2, 2, 2, 2, 2, 4, 4]; // ~20 spares for lessons 0-4, ~40 for Group lock and What if

// ---------- the ramp ----------
// Tier A = boards 1-3, B = 4-6, C = 7-8, D = 9-10 (track size). help: outline the unit or not.
const TIER = ['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'D', 'D'];
const HELP = { A: 'outline', B: 'outline', C: 'none', D: 'none' };
// Board sizes for boards 1-8 (A, B, then C as board 7 and board 8).
const SIZES = {
  0: { A: 5, B: 6, C: [7, 8] }, 1: { A: 5, B: 6, C: [7, 8] }, 2: { A: 5, B: 6, C: [7, 8] }, 3: { A: 5, B: 6, C: [7, 8] },
  4: { A: 6, B: 7, C: [7, 8] }, 5: { A: 7, B: 8, C: [8, 8] }, 6: { A: 6, B: 7, C: [7, 8] },
};
// The form each board practices (null: any, preferring a form this set hasn't had yet).
const FORMS = {
  0: ['side', 'diagonal', 'row', 'column', 'yard', 'diagonal', null, null, null, null],
  1: ['row', 'row', 'row', 'column', 'yard', null, null, null, null, null],
  2: ['yard-row', 'yard-row', 'yard-row', 'yard-column', 'row-yard', 'column-yard', null, null, null, null],
  3: ['row/touch', 'row/touch+yard', 'row/touch', 'column/touch+yard', 'yard/touch', 'yard/line+touch', null, null, null, null],
  4: ['yard>row', 'yard>row', 'yard>row', 'yard>column', 'row>yard', 'column>yard', null, null, null, null],
  5: ['3:yard>line', '3:yard>line', '3:yard>line', '3:line>yard', '4:any', null, null, null, null, null],
  // what if: d = forced corgis before the dead end (d1 = 2 ghost corgis). The shortest chain on a real
  // level-6 board is almost always 1-2, sometimes 3, never more in the runs so far.
  6: ['d1', 'd1', 'd1', 'd1', 'd2', 'd2', 'd2', 'd3', 'd2', 'd3'],
};
// Answer size wanted per tier [min, max] (lesson 0 is always the one pair of corgis).
const ANS = { A: [1, 1], B: [1, 2], C: [1, 3], D: [1, 4] };
const ANS3 = ['1', '1', '1', '1', '1', '2', '1', '2', null, null]; // Would block: first 1 cell, later 2

// ---------- features of a candidate ----------
function formOf(L, step, B) {
  if (L === 1) return step.unit.kind;
  if (L === 2) return step.unit.kind === 'yard' ? `yard-${step.line.kind}` : `${step.unit.kind}-yard`;
  if (L === 4 || L === 5) {
    const dir = step.group.kind === 'yard' ? `yard>${step.cover.kind}` : `${step.group.kind}>yard`;
    return L === 5 ? `${step.group.ids.length}:${dir}` : dir;
  }
  if (L === 6) return `d${step.depth}`;
  return null;
}
// Would block: how the corgi empties the unit, e.g. touch (only by touching), line+touch (its row or
// column takes some spots, touching the rest), touch+yard.
function blockHow(B, cells, unitCells, cand, placed) {
  const { n, reg } = B, r = (i) => Math.floor(i / n), c = (i) => i % n;
  const live = unitCells.filter((x) => cand[x] && !placed[x]);
  const ways = new Set();
  for (const x of cells) for (const l of live) {
    const touch = Math.abs(r(x) - r(l)) <= 1 && Math.abs(c(x) - c(l)) <= 1;
    if (touch) ways.add('touch');
    else if (r(x) === r(l) || c(x) === c(l)) ways.add('line');
    else if (reg[x] === reg[l]) ways.add('yard');
  }
  return [...ways].sort().join('+');
}
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const formMatch = (L, form, want) => {
  if (!want) return true;
  if (L === 3) { const [k, how] = want.split('/'); return form.startsWith(k) && (!how || form.endsWith('/' + how)); }
  if (L === 5) { const [k, dir] = want.split(':'); const [fk, fdir] = form.split(':'); return fk === k && (dir === 'any' || (dir === 'line>yard' ? !fdir.startsWith('yard') : fdir.startsWith('yard'))); }
  return form === want;
};

// The candidate record for a level-L state, or null if more than one answer is possible.
function candidate(B, cand, placed, L, src) {
  const steps = allSteps(B, cand, placed, L);
  if (!steps.length) return null;
  let union, step, ok;
  if (L === 6) {
    // What if: almost every level-6 board has several spots that dead-end within 6 corgis (5-30 on
    // 6x6-9x9), so "only one" can't hold. The board is kept when one spot has the shortest chain
    // (Sniff's answer, used for Show me); any spot that dead-ends within 6 counts as right (ok).
    const min = Math.min(...steps.map((s) => s.depth));
    const best = steps.filter((s) => s.depth === min);
    if (best.length !== 1) return null;
    step = best[0]; union = step.cells; ok = steps.map((s) => s.cells[0]).sort((a, b) => a - b);
  } else {
    union = [...new Set(steps.flatMap((s) => s.cells))].sort((a, b) => a - b);
    step = steps.find((s) => sameSet(s.cells, union));
    if (!step) return null;
  }
  if (L === 1 && union.length !== 1) return null;
  const corgis = [], paws = [], ruled = new Set();
  for (let i = 0; i < B.N; i++) if (placed[i]) { corgis.push(i); for (const j of B.peers[i]) ruled.add(j); }
  for (let i = 0; i < B.N; i++) if (!cand[i] && !placed[i] && !ruled.has(i)) paws.push(i);
  let form = formOf(L, step, B);
  const extra = {};
  if (L === 1) extra.decoys = B.units.filter((u) => !u.cells.some((c) => placed[c]) && u.cells.filter((c) => cand[c] && !placed[c]).length === 2).length;
  if (L === 6) extra.ok = ok;
  if (L === 3) form = `${step.unit.kind}/${blockHow(B, step.cells, (step.unit.kind === 'row' ? B.rows : step.unit.kind === 'column' ? B.cols : B.regs)[step.unit.i], cand, placed)}`;
  let live = 0; for (let i = 0; i < B.N; i++) if (cand[i] && !placed[i]) live++;
  return { L, n: B.n, src, c: corgis, p: paws, ans: union, step: { ...step, cells: union }, form, fill: 1 - live / B.N, why: steps.length, ...extra };
}

// Lesson 0: move one corgi of a correct partial board so it breaks exactly one rule.
function ruleBoards(B, placed, src, rand, out) {
  const { n, reg, N } = B, r = (i) => Math.floor(i / n), c = (i) => i % n;
  const corgis = []; for (let i = 0; i < N; i++) if (placed[i]) corgis.push(i);
  if (corgis.length < 2) return;
  const clash = (a, b) => {
    const touch = Math.abs(r(a) - r(b)) <= 1 && Math.abs(c(a) - c(b)) <= 1;
    const yard = reg[a] === reg[b];
    if (touch && (r(a) === r(b) || c(a) === c(b))) return yard ? 'x' : 'side';
    if (touch) return yard ? 'x' : 'diagonal';
    if (r(a) === r(b)) return yard ? 'x' : 'row';
    if (c(a) === c(b)) return yard ? 'x' : 'column';
    if (yard) return 'yard';
    return null;
  };
  for (let tries = 0; tries < 6; tries++) {
    const a = corgis[Math.floor(rand() * corgis.length)], t = Math.floor(rand() * N);
    if (placed[t]) continue;
    const rest = corgis.filter((x) => x !== a);
    const bad = rest.map((b) => [b, clash(t, b)]).filter(([, k]) => k);
    if (bad.length !== 1 || bad[0][1] === 'x') continue;
    const [b, rule] = bad[0];
    const unit = rule === 'row' ? { kind: 'row', i: r(t) } : rule === 'column' ? { kind: 'column', i: c(t) } : rule === 'yard' ? { kind: 'yard', i: reg[t] } : null;
    const look = unit ? (unit.kind === 'row' ? B.rows : unit.kind === 'column' ? B.cols : B.regs)[unit.i] : [t, b];
    out.push({ L: 0, n, src, c: [...rest, t].sort((x, y) => x - y), p: [], ans: [t, b].sort((x, y) => x - y), moved: t, from: a, rule, form: rule,
      step: { type: 'tap', level: 0, rule, ...(unit ? { unit } : {}), look, area: [t, b] }, fill: 0.2 + corgis.length / n * 0.7 });
  }
}

// ---------- collect ----------
function shippedKeys() {
  const seen = new Set();
  for (const f of ['puzzles.json', 'puzzles-hard.json', 'puzzles-extreme.json', 'puzzles-kids.json',
    'bonus-cozy.json', 'bonus-hard.json', 'bonus-extreme.json', 'bonus-kids.json', 'wild.json']) {
    const p = path.join(DIR, f);
    if (!existsSync(p)) continue;
    const d = JSON.parse(readFileSync(p, 'utf8'));
    for (const b of [...(d.daily || []), ...(d.campaign || []), ...(d.bonus || []), ...(d.days || [])]) {
      if (b.r) seen.add(canonicalKey(b.n, b.r));
      for (const set of ['cozy', 'hard', 'extreme']) if (b[set]?.r) for (const r of b[set].r) seen.add(canonicalKey(b[set].n ?? b.n, r));
    }
  }
  return seen;
}
// How many fresh boards to make per size (deterministic for a seed).
const BUDGET = { 5: 6000, 6: 8000, 7: 12000, 8: 20000, 9: 3000, 10: 1500 };
const CAP = 400; // candidates kept per lesson, size and form

function collect() {
  const seen = shippedKeys();
  const pool = {}; // pool[L][n] = [cand]
  const counts = {};
  const keep = rng(SEED * 7 + 1);
  const sources = [];
  for (const n of [5, 6, 7, 8, 9, 10]) {
    const rand = rng(SEED * 1000 + n);
    let made = 0;
    while (made < BUDGET[n] * SCALE) {
      const p = generate(n, rand, { maxLevel: 6 });
      if (!p) continue;
      made++;
      const key = canonicalKey(n, p.r);
      if (seen.has(key)) continue;
      seen.add(key);
      const src = sources.length;
      sources.push({ n, r: p.r, s: p.s, key });
      const reg = decodeRegions(p.r);
      let ruleDone = 0;
      grade(n, reg, { maxLevel: 6, onStep: (B, cand, placed, s) => {
        const c = candidate(B, cand, placed, s.level, src);
        if (c) add(c);
        if (ruleDone < 2 && placed.some((x) => x) && rand() < 0.5) { ruleDone++; const o = []; ruleBoards(B, placed, src, rand, o); o.forEach(add); }
      } });
    }
  }
  function add(c) {
    const k = `${c.L}|${c.n}|${c.form}`;
    counts[k] = (counts[k] || 0) + 1;
    (pool[c.L] ??= {})[c.n] ??= [];
    const arr = pool[c.L][c.n];
    // reservoir per lesson/size/form so common forms don't crowd out rare ones
    const same = arr.filter((x) => x.form === c.form).length;
    if (same < CAP) arr.push(c);
    else if (keep() < CAP / counts[k]) { const idx = arr.findIndex((x) => x.form === c.form); arr[idx] = c; }
  }
  return { pool, sources, counts };
}

// ---------- pick ----------
function scoreFor(c, { tier, want, ansWant, used, rand }) {
  let s = 0;
  // fill = share of the board already decided (corgis and paws). A: most of it filled in, B a bit
  // less, C/D earlier in the solve, like a real game.
  const target = { A: 0.75, B: 0.65, C: 0.55, D: 0.45 }[tier];
  s -= Math.abs(c.fill - target) * 6;
  if (c.L > 0) {
    const [lo, hi] = ansWant;
    if (c.ans.length < lo || c.ans.length > hi) s -= 20 + 3 * Math.abs(c.ans.length - hi);
  }
  if (c.L === 6) s -= 12 * Math.abs(+c.form.slice(1) - +want.slice(1)); // closest chain length
  else if (!formMatch(c.L, c.form, want)) s -= want ? 40 : 0;
  if (!want) s -= 4 * (used.get(c.form) || 0); // variety
  if (c.L === 1 && (tier === 'C' || tier === 'D')) s += Math.min(c.decoys, 4); // nearly full units that aren't it
  if (c.L === 1 && tier === 'A') s -= c.decoys; // early boards: just the one
  if (c.why > 1 && tier !== 'D' && c.L !== 6) s -= 1; // early boards: one reason only
  if (c.L === 6 && tier !== 'D') s -= c.ok.length / 4; // early what-ifs: few spots that dead-end
  return s + rand() * 0.5;
}
function pickOne(pool, L, n, opts, usedSrc) {
  const list = (pool[L]?.[n] || []).filter((c) => !usedSrc.has(c.src));
  let best = null, bs = -Infinity;
  for (const c of list) { const s = scoreFor(c, opts); if (s > bs) { bs = s; best = c; } }
  if (best) {
    const miss = [];
    if (best.L > 0 && (best.ans.length < opts.ansWant[0] || best.ans.length > opts.ansWant[1])) miss.push(`${best.ans.length} cells`);
    if (opts.want && !formMatch(best.L, best.form, opts.want)) miss.push(`${best.form} for ${opts.want}`);
    if (miss.length) opts.warn.push(`${opts.tag}: ${miss.join(', ')}`);
    usedSrc.add(best.src); opts.used.set(best.form, (opts.used.get(best.form) || 0) + 1); best = { ...best, score: Math.round(bs * 10) / 10 }; }
  return best;
}
function buildSet(pool, L, slots, trackList, usedSrc, rand, warn, tag) {
  const used = new Map(), boards = [], finale = {};
  for (const slot of slots) {
    const tier = TIER[slot];
    const sz = SIZES[L];
    const n = tier === 'A' ? sz.A : tier === 'B' ? sz.B : sz.C[slot - 6];
    const ansWant = L === 3 && ANS3[slot] ? [+ANS3[slot], +ANS3[slot]] : L >= 5 && tier === 'A' ? [1, 2] : ANS[tier];
    const b = pickOne(pool, L, n, { tier, want: FORMS[L][slot], ansWant, used, rand, warn, tag: `${tag} board ${slot + 1}` }, usedSrc);
    if (!b) { warn.push(`${tag} board ${slot + 1}: no ${n}x${n} candidate`); continue; }
    boards.push(card(b, slot, tier));
  }
  for (const t of trackList) {
    finale[t] = [];
    for (const slot of [8, 9]) {
      const n = TRACK_SIZES[t][slot - 8];
      const b = pickOne(pool, L, n, { tier: 'D', want: FORMS[L][slot], ansWant: ANS.D, used, rand, warn, tag: `${tag} ${t} board ${slot + 1}` }, usedSrc);
      if (!b) { warn.push(`${tag} ${t} board ${slot + 1}: no ${n}x${n} candidate`); continue; }
      finale[t].push(card(b, slot, 'D'));
    }
  }
  return { boards, finale };
}
function card(b, slot, tier) {
  const out = { board: slot + 1, tier, help: HELP[tier], n: b.n, src: b.src, c: b.c, p: b.p, ans: b.ans, count: b.ans.length, form: b.form, fill: Math.round(b.fill * 100) / 100, step: b.step };
  if (b.L === 0) Object.assign(out, { moved: b.moved, from: b.from, rule: b.rule });
  if (b.L === 6) out.ok = b.ok;
  return out;
}
// Show it: the smallest, clearest board (one cell where possible, the tier-A form, few marks).
function pickShow(pool, L, usedSrc) {
  for (const n of [5, 6, 7, 8]) {
    const list = (pool[L]?.[n] || []).filter((c) => !usedSrc.has(c.src) && formMatch(L, c.form, FORMS[L][0]) && (L === 0 || c.ans.length <= (L === 2 || L >= 4 ? 2 : 1)));
    if (!list.length) continue;
    list.sort((a, b) => (a.ans.length - b.ans.length) || (a.why - b.why) || (a.p.length - b.p.length) || (a.c.length - b.c.length));
    usedSrc.add(list[0].src);
    return card(list[0], -1, 'show');
  }
  return null;
}

export function build() {
  const t0 = Date.now();
  const { pool, sources, counts } = collect();
  const rand = rng(SEED);
  const usedSrc = new Set(), warn = [], lessons = [];
  for (let L = 0; L <= 6; L++) {
    const tracks = tracksFor(L);
    // main boards 9-10 = the lesson's first track; finale = boards 9-10 for its other tracks
    const set = buildSet(pool, L, [...Array(8).keys()], tracks, usedSrc, rand, warn, `L${L} main`);
    const first = tracks[0];
    const mainBoards = [...set.boards, ...set.finale[first]];
    const finale = Object.fromEntries(tracks.slice(1).map((t) => [t, set.finale[t]]));
    const spares = [];
    for (let k = 0; k < SPARE_SETS[L]; k++) {
      const s = buildSet(pool, L, [...Array(8).keys()], tracks, usedSrc, rand, warn, `L${L} spare set ${k + 1}`);
      spares.push(s);
    }
    lessons.push({ id: L, name: LESSONS[L], tracks, show: pickShow(pool, L, usedSrc), main: mainBoards, finale, spares });
  }
  // Only the source boards in use go into the file.
  const ids = [...usedSrc].sort((a, b) => a - b), remap = new Map(ids.map((s, i) => [s, i]));
  const boards = ids.map((s) => ({ n: sources[s].n, r: sources[s].r, s: sources[s].s }));
  const fix = (b) => { if (b) b.src = remap.get(b.src); };
  for (const l of lessons) {
    fix(l.show); l.main.forEach(fix); Object.values(l.finale).flat().forEach(fix);
    for (const s of l.spares) { s.boards.forEach(fix); Object.values(s.finale).flat().forEach(fix); }
  }
  const stats = {};
  for (const [k, v] of Object.entries(counts)) { const [L, n] = k.split('|'); stats[`${L}|${n}`] = (stats[`${L}|${n}`] || 0) + v; }
  return { counts, file: { version: 1, generatedAt: new Date().toISOString(), seed: SEED, tracks: TRACKS, trackSizes: TRACK_SIZES, boards, lessons }, warn, stats, secs: (Date.now() - t0) / 1000, made: sources.length };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain && process.argv.includes('--sheet')) {
  queueMicrotask(() => {
    const out = path.resolve(arg('sheet'));
    writeFileSync(out, sheet(JSON.parse(readFileSync(path.join(DIR, 'lessons.json'), 'utf8'))));
    console.log('contact sheet ->', out);
  });
} else if (isMain) {
  const { file, warn, stats, secs, made, counts } = build();
  const out = path.join(DIR, 'lessons.json');
  // one practice board per line keeps diffs readable
  writeFileSync(out, JSON.stringify(file).replace(/\{"board"/g, '\n{"board"').replace(/\{"n":(\d+),"r"/g, '\n{"n":$1,"r"') + '\n');
  const n = (l) => l.main.length + Object.values(l.finale).flat().length;
  const sp = (l) => l.spares.reduce((a, s) => a + s.boards.length + Object.values(s.finale).flat().length, 0);
  for (const l of file.lessons) console.log(`L${l.id} ${l.name.padEnd(12)} main ${l.main.length} + finale ${n(l) - l.main.length}, spares ${sp(l)}, show ${l.show ? l.show.n + 'x' + l.show.n : 'none'}`);
  console.log(`${file.boards.length} source boards from ${made} fresh ones in ${secs.toFixed(0)}s -> lessons.json`);
  if (process.argv.includes('--stats')) console.log(stats);
  if (process.argv.includes('--forms')) console.log(Object.entries(counts).filter(([k]) => +k[0] >= 3).sort().map(([k, v]) => `${k} ${v}`).join('\n'));
  for (const w of warn) console.log('  warn:', w);
}

// ---------- contact sheet ----------
// node tools/lessons.mjs --sheet out.html   draws the boards in lessons.json (no rebuild): for each
// lesson the Show it pick, the 10 main boards, boards 9-10 for its other tracks, and spare set 1.
export function sheet(file) {
  const keep = new Set();
  const lessons = file.lessons.map((l) => {
    const s1 = l.spares[0];
    const all = [l.show, ...l.main, ...Object.values(l.finale).flat(), ...s1.boards, ...Object.values(s1.finale).flat()].filter(Boolean);
    all.forEach((b) => keep.add(b.src));
    return { id: l.id, name: l.name, tracks: l.tracks, show: l.show, main: l.main, finale: l.finale, spare: s1, spareCount: l.spares.reduce((a, s) => a + s.boards.length + Object.values(s.finale).flat().length, 0) };
  });
  const boards = {}; for (const i of keep) boards[i] = file.boards[i];
  const data = JSON.stringify({ lessons, boards, generatedAt: file.generatedAt, seed: file.seed }).replace(/</g, '\\u003c');
  return SHEET.replace('/*DATA*/', data);
}
const SHEET = String.raw`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cheddar's tricks boards</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap" rel="stylesheet">
<style>
/* VOICE: a friendly review proof sheet for a kids-and-grown-ups puzzle app
   IDEA: a photographer's contact sheet: every frame laid out small, marked up for picking
   PICTURE: the boards themselves, in the app's yard colors, answers marked like Sniff
   COLOUR and TYPE: warm cream ground, corgi orange accent, yard pastels; Nunito
   LAYOUT: a sticky lesson strip, then one band per lesson with grids of board cards */
:root{color-scheme:light dark;--bg:light-dark(#fff8ef,#1b1714);--card:light-dark(#fff,#262019);--ink:light-dark(#2a211a,#f4ebe1);--soft:light-dark(#7a6a5c,#b7a796);--line:light-dark(#eadccb,#3a3027);--acc:#e8862e;--ok:#1f9d55;--bad:#d6336c}
:root[data-theme=light]{color-scheme:light}:root[data-theme=dark]{color-scheme:dark}
*{box-sizing:border-box;min-width:0}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 Nunito,ui-rounded,system-ui,sans-serif;overflow-x:clip}
header{padding:28px max(5vw,16px) 12px;max-width:1240px;margin:auto}
h1{font-size:clamp(30px,5vw,46px);line-height:1.05;margin:0 0 8px;font-weight:900;text-wrap:balance}
header p{margin:6px 0;max-width:70ch;color:var(--soft)}
nav{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--line);display:flex;gap:6px;overflow-x:auto;padding:8px max(5vw,16px)}
nav a{flex:none;text-decoration:none;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:99px;padding:6px 12px;font-weight:700;font-size:14px}
.ctl{display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-top:12px;font-size:15px}
.ctl label{display:flex;gap:6px;align-items:center;min-height:44px;cursor:pointer}
.ctl input{width:20px;height:20px;accent-color:var(--acc)}
.key{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;color:var(--soft);margin-top:4px}
.key span{display:flex;align-items:center;gap:6px}.key svg{width:18px;height:18px}
section{max-width:1240px;margin:auto;padding:24px max(5vw,16px) 8px}
h2{font-size:28px;line-height:1.1;margin:0 0 4px;font-weight:900}
h3{font-size:16px;margin:22px 0 8px;color:var(--soft);font-weight:700}
.sub{color:var(--soft);font-size:14px;margin:0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:8px;display:flex;flex-direction:column;gap:6px}
.card svg{width:100%;height:auto;display:block;border-radius:6px}
.lab{font-size:13px;line-height:1.35}.lab b{font-size:14px}
.tag{display:inline-block;border-radius:99px;padding:0 7px;font-size:12px;font-weight:700;background:light-dark(#f6ead9,#3a3027);margin:2px 3px 0 0}
.tag.o{background:light-dark(#ffe3c6,#5a3a1d)}
.hide-ans .ans{display:none}.hide-out .out{display:none}
@media (prefers-reduced-motion:no-preference){.card{transition:transform .15s}.card:hover{transform:translateY(-2px)}}
</style></head><body>
<header><h1>Cheddar's tricks: practice boards</h1>
<p>Every board a practice set uses, before any app UI. Each is frozen where its trick is the only way forward, checked by <code>tools/lessons.test.mjs</code>. Boards 1–3 and 4–6 show their outline (dark border); 7–10 don't. Boards 9–10 are drawn for each track at that mode's full size.</p>
<p id="meta"></p>
<div class="ctl"><label><input type="checkbox" id="ans" checked> Show answers</label><label><input type="checkbox" id="out" checked> Show outlines</label></div>
<div class="key" id="key"></div></header>
<nav id="nav"></nav>
<main id="main"></main>
<script>
{
const D = /*DATA*/;
const YC = ['#FFA8D2','#C9AEFF','#93D7FF','#93F0C8','#FFE77A','#FFBE8F','#FF9C9C','#EFB2F7','#86E6EA','#CDF78A'];
const S = 24;
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const corgi = (x, y, ghost, label) => '<g' + (ghost ? ' class="ans" opacity=".55"' : '') + '><circle cx="' + x + '" cy="' + y + '" r="8.5" fill="#e8862e" stroke="#7a3f10" stroke-width="1.5"/><path d="M' + (x - 6) + ' ' + (y - 6) + 'l2.5 -5 3 4.5zM' + (x + 6) + ' ' + (y - 6) + 'l-2.5 -5 -3 4.5z" fill="#e8862e" stroke="#7a3f10" stroke-width="1"/>' + (label ? '<text x="' + x + '" y="' + (y + 4) + '" font-size="11" font-weight="900" text-anchor="middle" fill="#fff">' + label + '</text>' : '<circle cx="' + x + '" cy="' + (y + 2) + '" r="3.2" fill="#fff"/>') + '</g>';
function draw(L, b) {
  const src = D.boards[b.src], n = b.n, reg = [...src.r].map((c) => c.charCodeAt(0) - 97), W = n * S;
  const rc = (i) => [Math.floor(i / n), i % n], cx = (i) => (i % n) * S + S / 2, cy = (i) => Math.floor(i / n) * S + S / 2;
  const corgis = new Set(b.c), ruled = new Set();
  for (const a of b.c) for (let j = 0; j < n * n; j++) { const [r, c] = rc(a), [rr, cc] = rc(j); if (j !== a && (r === rr || c === cc || reg[a] === reg[j] || (Math.abs(r - rr) <= 1 && Math.abs(c - cc) <= 1))) ruled.add(j); }
  let g = '';
  for (let i = 0; i < n * n; i++) g += '<rect x="' + (i % n) * S + '" y="' + Math.floor(i / n) * S + '" width="' + S + '" height="' + S + '" fill="' + YC[reg[i]] + '"/>';
  // yard borders
  for (let i = 0; i < n * n; i++) { const [r, c] = rc(i), x = c * S, y = r * S;
    if (c < n - 1 && reg[i] !== reg[i + 1]) g += '<line x1="' + (x + S) + '" y1="' + y + '" x2="' + (x + S) + '" y2="' + (y + S) + '" stroke="#5b4636" stroke-width="2"/>';
    if (r < n - 1 && reg[i] !== reg[i + n]) g += '<line x1="' + x + '" y1="' + (y + S) + '" x2="' + (x + S) + '" y2="' + (y + S) + '" stroke="#5b4636" stroke-width="2"/>'; }
  for (let k = 1; k < n; k++) g += '<path d="M' + k * S + ' 0V' + W + 'M0 ' + k * S + 'H' + W + '" stroke="#5b4636" stroke-opacity=".18"/>';
  // what if: the dead unit, striped
  if (L === 6) { const s = b.step, dead = [...Array(n * n).keys()].filter((i) => s.dead.kind === 'row' ? rc(i)[0] === s.dead.i : s.dead.kind === 'column' ? rc(i)[1] === s.dead.i : reg[i] === s.dead.i);
    g += '<g class="ans">' + dead.map((i) => '<rect x="' + (i % n) * S + '" y="' + Math.floor(i / n) * S + '" width="' + S + '" height="' + S + '" fill="url(#st)"/>').join('') + '</g>'; }
  // paws: auto (ruled out by a corgi) faint, deduced darker
  for (let i = 0; i < n * n; i++) if (!corgis.has(i)) {
    if (b.p.includes(i)) g += '<g transform="translate(' + cx(i) + ' ' + cy(i) + ')" fill="#6b2d5c"><ellipse cy="2.5" rx="4" ry="3.2"/><circle cx="-4.5" cy="-2.5" r="1.7"/><circle cx="-1.5" cy="-5" r="1.7"/><circle cx="1.5" cy="-5" r="1.7"/><circle cx="4.5" cy="-2.5" r="1.7"/></g>';
    else if (ruled.has(i)) g += '<circle cx="' + cx(i) + '" cy="' + cy(i) + '" r="2" fill="#5b4636" fill-opacity=".3"/>'; }
  // outline (boards 1-6 and Show it)
  if (b.help === 'outline' || b.tier === 'show') { const look = L === 6 ? [] : b.step.look; const ls = new Set(look);
    let o = ''; for (const i of look) { const [r, c] = rc(i), x = c * S, y = r * S;
      if (r === 0 || !ls.has(i - n)) o += 'M' + x + ' ' + y + 'h' + S; if (r === n - 1 || !ls.has(i + n)) o += 'M' + x + ' ' + (y + S) + 'h' + S;
      if (c === 0 || !ls.has(i - 1)) o += 'M' + x + ' ' + y + 'v' + S; if (c === n - 1 || !ls.has(i + 1)) o += 'M' + (x + S) + ' ' + y + 'v' + S; }
    if (L === 6) { const s = b.step; o = ''; }
    g += '<path class="out" d="' + o + '" stroke="#1d1410" stroke-width="3.5" fill="none" stroke-linecap="square"/>'; }
  for (const i of b.c) g += corgi(cx(i), cy(i));
  // answers
  let a = '';
  if (L === 0) for (const i of b.ans) a += '<circle cx="' + cx(i) + '" cy="' + cy(i) + '" r="11" fill="none" stroke="#d6336c" stroke-width="3"/>';
  else if (L === 1) a += corgi(cx(b.ans[0]), cy(b.ans[0]), true) + '<circle cx="' + cx(b.ans[0]) + '" cy="' + cy(b.ans[0]) + '" r="11" fill="none" stroke="#1f9d55" stroke-width="3"/>';
  else { for (const i of b.ans) a += '<rect x="' + ((i % n) * S + 3) + '" y="' + (Math.floor(i / n) * S + 3) + '" width="' + (S - 6) + '" height="' + (S - 6) + '" rx="4" fill="none" stroke="#d6336c" stroke-width="2.5" stroke-dasharray="4 3"/>';
    if (L === 6) { for (const i of b.ok) if (i !== b.ans[0]) a += '<circle cx="' + (cx(i) + 7) + '" cy="' + (cy(i) - 7) + '" r="3" fill="#1f9d55"/>';
      a += corgi(cx(b.ans[0]), cy(b.ans[0]), true, '?'); b.step.chain.forEach((ch, k) => { a += corgi(cx(ch.cell), cy(ch.cell), true, k + 1); }); } }
  g += '<g class="ans">' + a + '</g>';
  return '<svg viewBox="-1 -1 ' + (W + 2) + ' ' + (W + 2) + '" role="img" aria-label="' + n + ' by ' + n + ' board"><defs><pattern id="st" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="#d6336c" fill-opacity=".45"/></pattern></defs>' + g + '<rect x="0" y="0" width="' + W + '" height="' + W + '" fill="none" stroke="#5b4636" stroke-width="2.5"/></svg>';
}
const FORM = { side: 'touching on a side', diagonal: 'touching on a diagonal', row: 'same row', column: 'same column', yard: 'same yard',
  'yard-row': 'yard in one row', 'yard-column': 'yard in one column', 'row-yard': 'row with room in one yard', 'column-yard': 'column with room in one yard' };
const formText = (L, b) => {
  if (L === 3) { const [k, how] = b.form.split('/'); return 'empties a ' + k + ' (' + how.replace(/\+/g, ' + ') + ')'; }
  if (L === 4 || L === 5) { const f = b.form.replace(/^\d:/, ''), k = b.step.group.ids.length; const [g, c] = f.split('>'); return k + ' ' + g + 's in ' + k + ' ' + c + 's'; }
  if (L === 6) return 'chain of ' + b.step.depth + ' (' + (b.step.depth + 1) + ' ghost corgis) · ' + b.ok.length + ' spot' + (b.ok.length === 1 ? '' : 's') + ' work';
  if (L === 1) return 'last spot in a ' + b.form;
  return FORM[b.form] || b.form;
};
const card = (L, b, title) => '<div class="card">' + draw(L, b) + '<div class="lab"><b>' + esc(title) + '</b> · ' + b.n + '×' + b.n + '<br>' + esc(formText(L, b)) + '<br>' +
  '<span class="tag">' + (L === 0 ? 'tap the corgi' : L === 1 ? 'place 1' : L === 6 ? 'find 1 start' : 'paw ' + b.count) + '</span>' + (b.help === 'outline' ? '<span class="tag o">outlined</span>' : '') + (L > 0 ? '<span class="tag">' + Math.round(b.fill * 100) + '% decided</span>' : '<span class="tag">' + b.c.length + ' corgis</span>') + '</div></div>';
const TN = { chill: 'Chill', cozy: 'Cozy', hard: 'Hard', extreme: 'Extreme' };
document.getElementById('meta').textContent = D.lessons.reduce((a, l) => a + l.main.length, 0) + ' main boards, plus the other tracks’ boards 9–10 and spare set 1 of each pool. Built ' + D.generatedAt.slice(0, 10) + ', seed ' + D.seed + '.';
document.getElementById('nav').innerHTML = D.lessons.map((l) => '<a href="#l' + l.id + '">' + l.id + ' · ' + esc(l.name) + '</a>').join('');
const k = (svg, t) => '<span><svg viewBox="0 0 24 24">' + svg + '</svg>' + t + '</span>';
document.getElementById('key').innerHTML = k('<circle cx="12" cy="12" r="8.5" fill="#e8862e" stroke="#7a3f10" stroke-width="1.5"/><circle cx="12" cy="14" r="3.2" fill="#fff"/>', 'corgi') +
  k('<circle cx="12" cy="12" r="2.5" fill="#5b4636" fill-opacity=".4"/>', 'ruled out by a corgi') + k('<g transform="translate(12 13)" fill="#6b2d5c"><ellipse cy="2.5" rx="4" ry="3.2"/><circle cx="-4.5" cy="-2.5" r="1.7"/><circle cx="-1.5" cy="-5" r="1.7"/><circle cx="1.5" cy="-5" r="1.7"/><circle cx="4.5" cy="-2.5" r="1.7"/></g>', 'paw already found') +
  k('<rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="#d6336c" stroke-width="2.5" stroke-dasharray="4 3"/>', 'answer: paw this') + k('<circle cx="12" cy="12" r="10" fill="none" stroke="#1f9d55" stroke-width="3"/>', 'answer: place here') +
  k('<circle cx="12" cy="12" r="10" fill="none" stroke="#d6336c" stroke-width="3"/>', 'the pair that breaks a rule') + k('<circle cx="12" cy="12" r="4" fill="#1f9d55"/>', 'what if: another start that also works');
document.getElementById('main').innerHTML = D.lessons.map((l) => {
  const L = l.id;
  let h = '<section id="l' + L + '"><h2>' + L + ' · ' + esc(l.name) + '</h2><p class="sub">Tracks: ' + l.tracks.map((t) => TN[t]).join(', ') + ' · main boards 9–10 are ' + TN[l.tracks[0]] + ' size · spare pool ' + l.spareCount + ' boards</p>';
  if (l.show) h += '<h3>Show it / Watch it (suggested)</h3><div class="grid">' + card(L, { ...l.show, tier: 'show' }, 'Show it') + '</div>';
  h += '<h3>Main set</h3><div class="grid">' + l.main.map((b) => card(L, b, 'Board ' + b.board)).join('') + '</div>';
  const fin = Object.entries(l.finale);
  if (fin.length) h += '<h3>Boards 9–10 for the other tracks</h3><div class="grid">' + fin.flatMap(([t, bs]) => bs.map((b) => card(L, b, TN[t] + ' ' + b.board))).join('') + '</div>';
  h += '<h3>Spare set 1 (More practice)</h3><div class="grid">' + l.spare.boards.map((b) => card(L, b, 'Spare ' + b.board)).join('') + Object.entries(l.spare.finale).slice(0, 1).flatMap(([t, bs]) => bs.map((b) => card(L, b, 'Spare ' + TN[t] + ' ' + b.board))).join('') + '</div>';
  return h + '</section>';
}).join('');
const body = document.body;
document.getElementById('ans').addEventListener('change', (e) => body.classList.toggle('hide-ans', !e.target.checked));
document.getElementById('out').addEventListener('change', (e) => body.classList.toggle('hide-out', !e.target.checked));
}
</script></body></html>`;
