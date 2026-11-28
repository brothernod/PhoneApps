// Cheddar's tricks: the targeted hunt for long What if chains (lesson 6c, "Longer chains").
//   node tools/hunt-chains.mjs [--seed 7] [--workers 2] [--scale 1]   -> tools/deep-chains.json
// Then rebuild the lessons: node tools/lessons.mjs (it reads deep-chains.json as extra source boards).
//
// Fresh random boards almost never stop at a spot whose shortest what-if runs 4-5 forced corgis
// deep (none in 50k for lessons push 1; 5 of 850 shipped Extreme boards need one). So this climbs:
// start from a fresh board that needs a what-if, move one yard cell at a time into a neighboring
// yard (the answer, a unique answer, connected yards and a guess-free solve are all kept), and keep
// the change when the board's best chain is no shorter. "Best chain" = the deepest grader state whose
// shortest dead end is held by one spot only, the same test tools/lessons.mjs uses for a What if
// board. A board is kept once it reaches the target depth (and, for d5 targets, it climbs a while
// longer to try for 5). Iteration counts, not the clock, bound every loop, so a seed always gives the
// same file. Each target is split over the workers; the desktop PC can run a bigger --scale.
import { Worker, isMainThread, workerData, parentPort } from 'node:worker_threads';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { generate, rng, grade, allSteps, decodeRegions, encodeRegions, solve, canonicalKey } from '../engine.js';

const HERE = fileURLToPath(import.meta.url);
const DIR = path.join(path.dirname(HERE), '..');
// n, the depth to reach, how many boards (6c needs: boards 1-3 d2 at 6x6, 5-7 d3 at 7x7, 8 d3 at
// 8x8, 9 d4+ at 9x9 and 10 d5 (else d4) at 10x10, for the main set and 4 spare sets, with room to pick)
export const TARGETS = [
  { n: 6, d: 2, want: 30 }, { n: 7, d: 3, want: 30 }, { n: 8, d: 3, want: 16 },
  { n: 9, d: 4, want: 14 }, { n: 10, d: 4, want: 8, try5: true }, { n: 10, d: 5, want: 8, cap: 120 },
];

// The deepest grader state with one spot holding the shortest chain (0 if none), and the deepest at all.
export function chainScore(n, reg) {
  if (solve(n, reg, 2).count !== 1) return null;
  let best = 0, any = 0;
  const g = grade(n, reg, { maxLevel: 6, onStep: (B, cand, placed, s) => {
    if (s.level !== 6) return;
    any = Math.max(any, s.depth);
    if (s.depth <= best) return;
    const st = allSteps(B, cand, placed, 6);
    if (st.filter((x) => x.depth === s.depth).length === 1) best = s.depth;
  } });
  return g.solved ? { best, any, score: best * 10 + any } : null;
}

function connected(n, reg, k) {
  let first = -1, size = 0;
  for (let i = 0; i < n * n; i++) if (reg[i] === k) { size++; if (first < 0) first = i; }
  if (first < 0) return false;
  const seen = new Set([first]), st = [first];
  while (st.length) {
    const i = st.pop(), r = Math.floor(i / n), c = i % n;
    for (const j of [r > 0 ? i - n : -1, r < n - 1 ? i + n : -1, c > 0 ? i - 1 : -1, c < n - 1 ? i + 1 : -1])
      if (j >= 0 && reg[j] === k && !seen.has(j)) { seen.add(j); st.push(j); }
  }
  return seen.size === size;
}

// Climb one fresh board. Returns { r, s, best } or null.
function climb(n, rand, d, try5) {
  let p = null;
  for (let t = 0; t < 400 && !p; t++) { const q = generate(n, rand, { maxLevel: 6 }); if (q && q.lv === 6) p = q; }
  if (!p) return null;
  let reg = decodeRegions(p.r);
  const solCell = new Set([...p.s].map((c, r) => r * n + +c));
  let cur = chainScore(n, reg);
  if (!cur) return null;
  let stale = 0, evals = 0, extra = 0;
  const STALE = 150, MAX = 2500;
  while (stale < STALE && evals < MAX) {
    if (cur.best >= d && (!try5 || cur.best >= 5 || extra >= 300)) break;
    const i = Math.floor(rand() * n * n);
    if (solCell.has(i)) continue;
    const r = Math.floor(i / n), c = i % n;
    const nb = [r > 0 ? i - n : -1, r < n - 1 ? i + n : -1, c > 0 ? i - 1 : -1, c < n - 1 ? i + 1 : -1].filter((j) => j >= 0 && reg[j] !== reg[i]);
    if (!nb.length) continue;
    const j = nb[Math.floor(rand() * nb.length)], old = reg[i], r2 = reg.slice();
    r2[i] = reg[j];
    if (!connected(n, r2, old)) continue;
    evals++; stale++;
    if (cur.best >= d) extra++;
    const e = chainScore(n, r2);
    if (e && e.score >= cur.score) { if (e.score > cur.score) stale = 0; reg = r2; cur = e; }
  }
  return cur.best >= d ? { r: encodeRegions(reg), s: p.s, best: cur.best } : null;
}

if (!isMainThread) {
  const { n, d, want, cap, try5, seed } = workerData;
  const rand = rng(seed);
  const out = [], keys = new Set();
  // cap: how many climbs to try before giving up (d5 is rare: take what turns up)
  for (let tries = 0; out.length < want && tries < (cap || 400); tries++) {
    const b = climb(n, rand, d, try5);
    if (!b) continue;
    const k = canonicalKey(n, b.r);
    if (keys.has(k)) continue;
    keys.add(k); out.push({ n, r: b.r, s: b.s, d: b.best });
  }
  parentPort.postMessage(out);
} else if (process.argv[1] && path.resolve(process.argv[1]) === HERE) {
  const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : def; };
  const SEED = +arg('seed', 7), W = +arg('workers', 2), SCALE = +arg('scale', 1);
  const { shippedKeys } = await import('./lessons.mjs');
  const shipped = shippedKeys();
  const t0 = Date.now();
  const jobs = [];
  TARGETS.forEach((t, ti) => {
    for (let w = 0; w < W; w++) jobs.push({ ...t, want: Math.ceil(t.want * SCALE / W), cap: t.cap && Math.ceil(t.cap * SCALE / W), seed: SEED * 10007 + ti * 101 + w, ti, w });
  });
  // run W at a time; results are put back in job order, so the file only depends on the seed
  const results = new Array(jobs.length);
  let next = 0;
  await Promise.all([...Array(W)].map(async () => {
    while (next < jobs.length) {
      const k = next++, j = jobs[k];
      results[k] = await new Promise((res, rej) => { const w = new Worker(HERE, { workerData: j }); w.on('message', res); w.on('error', rej); });
      console.log(`${j.n}x${j.n} d${j.d}${j.try5 ? '/5' : ''} worker ${j.w}: ${results[k].length} boards (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
  }));
  const seen = new Set(), boards = [];
  for (const b of results.flat()) {
    const k = canonicalKey(b.n, b.r);
    if (shipped.has(k) || seen.has(k)) continue;
    seen.add(k); boards.push(b);
  }
  const tally = {}; for (const b of boards) tally[`${b.n}x${b.n} d${b.d}`] = (tally[`${b.n}x${b.n} d${b.d}`] || 0) + 1;
  writeFileSync(path.join(DIR, 'tools', 'deep-chains.json'), JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), seed: SEED, scale: SCALE, boards }).replace(/\{"n"/g, '\n{"n"') + '\n');
  console.log(tally, `${boards.length} boards in ${((Date.now() - t0) / 1000).toFixed(0)}s -> tools/deep-chains.json`);
}
