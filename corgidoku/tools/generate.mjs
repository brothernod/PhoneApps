#!/usr/bin/env node
// Corgidoku puzzle generator.
//
// Quick pass (easy sizes, a minute or two):
//   node tools/generate.mjs
// Heavy pass on a big PC (9x9 / 10x10 pool, runs as long as you let it):
//   node tools/generate.mjs --pool-sizes 9,10 --pool-count 400 --pool-out tools/pool-9-10.json --workers 16
// Hunt only for rare hard boards (about 1 in 100), the job worth a big PC:
//   node tools/generate.mjs --pool-sizes 9,10 --pool-grade hard --pool-count 100 --pool-out tools/pool-hard.json
// Rebuild puzzles.json using a heavy pool for some weekends:
//   node tools/generate.mjs --pool tools/pool-9-10.json
//
// Hard mode file (puzzles-hard.json):
//   node tools/generate.mjs --mode hard --start 2026-11-05
//
// Extreme mode file (puzzles-extreme.json), daily from the day Halina started:
//   node tools/generate.mjs --mode extreme --start 2026-11-05 --seed 6
//
// Kids "Chill" file (puzzles-kids.json), for Holden and Quentin:
//   node tools/generate.mjs --mode kids --start 2026-10-01 --days 760
//
// Bonus Yards (endless boards after a mode's summit), one file per mode, e.g.:
//   node tools/generate.mjs --bonus extreme --count 300 --workers 16
// An existing bonus file is kept and only topped up to --count, so ids players already
// solved never change. Then: node tools/verify.mjs bonus-extreme.json
//
// Options: --mode cozy|hard|extreme|kids  --start YYYY-MM-DD  --days 730  --campaign 60  --seed 1  --out puzzles.json  --workers N
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { generate, rng, canonicalKey } from '../engine.js';

const here = dirname(fileURLToPath(import.meta.url));

if (!isMainThread) {
  // ---- worker: generate boards of the requested sizes forever ----
  const { seed, sizes, maxLevel } = workerData;
  const rand = rng(seed);
  let wanted = sizes;
  parentPort.on('message', (m) => { if (m.sizes) wanted = m.sizes; if (m.stop) process.exit(0); });
  const loop = () => {
    for (let i = 0; i < 20; i++) {
      if (!wanted.length) break;
      const n = wanted[Math.floor(rand() * wanted.length)];
      const p = generate(n, rand, { maxLevel });
      if (p) parentPort.postMessage(p);
    }
    setImmediate(loop);
  };
  loop();
}

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
}

// ---- schedule ----
const addDays = (iso, d) => new Date(Date.parse(iso + 'T00:00:00Z') + d * 864e5).toISOString().slice(0, 10);
function want(date) {
  const dow = new Date(date + 'T00:00:00Z').getUTCDay(); // 0 Sun
  if (date >= '2026-11-11' && date <= '2026-11-17') return [[5, 'easy'], [6, 'easy']]; // recovery week
  if (date.slice(5) === '06-15') return [[6, 'easy']]; // birthday
  return {
    1: [[5, 'easy'], [6, 'easy']],
    2: [[6, 'easy']],
    3: [[6, 'easy'], [6, 'medium']],
    4: [[6, 'medium'], [7, 'easy']],
    5: [[7, 'medium']],
    6: [[7, 'medium'], [8, 'easy']],
    0: [[8, 'medium'], [8, 'easy']],
  }[dow];
}
const CAMPAIGN = [
  [10, 5, ['easy']], [12, 6, ['easy', 'medium']], [14, 7, ['easy', 'medium']],
  [14, 8, ['medium']], [10, 8, ['medium', 'hard']],
];

// Hard mode: big boards that need pair locks (L4) or group locks (L5).
function wantHard(date) {
  const dow = new Date(date + 'T00:00:00Z').getUTCDay();
  if (date.slice(5) === '06-15') return [[9, 'L4']];
  return {
    1: [[8, 'L4']],
    2: [[8, 'L4'], [8, 'L5']],
    3: [[9, 'L4']],
    4: [[9, 'L4'], [9, 'L5']],
    5: [[9, 'L5']],
    6: [[10, 'L4']],
    0: [[10, 'L5'], [10, 'L4']],
  }[dow];
}
const CAMPAIGN_HARD = [
  [10, 8, ['L4']], [10, 8, ['L5']], [20, 9, ['L4']], [15, 9, ['L5']], [15, 10, ['L4']], [10, 10, ['L5']],
];
// Extreme mode: built from Halina's Hard field report (86 boards, rated 2-5 of 10).
// Nothing inside the L1-L5 ladder got past a 5, so Extreme adds level 6 "what if" chains:
// try a corgi, follow the forced moves, hit a dead end. Tiers by chain score
// (chains + 3 x (longest chain - 1)):
//   X0  L5 boards with 25+ steps, the top of Hard (her 5s and slowest solves)
//   X1  L6, score <= 2   one or two short what-ifs
//   X2  L6, score 3-5    a few what-ifs, or one that runs two corgis deep
//   X3  L6, score 6-11   lots of them
//   X4  L6, score 12+    the summit
const chainScore = (p) => (p.ch || 0) + 3 * ((p.cd || 1) - 1);
function extremeTier(p) {
  if (p.n < 9) return null;
  if (p.lv === 5) return p.st >= 25 ? 'X0' : null;
  if (p.lv !== 6) return null;
  const sc = chainScore(p);
  return sc <= 2 ? 'X1' : sc <= 5 ? 'X2' : sc <= 11 ? 'X3' : 'X4';
}
function wantExtreme(date) {
  const dow = new Date(date + 'T00:00:00Z').getUTCDay();
  if (date.slice(5) === '06-15') return [[9, 'X1']];
  return {
    1: [[9, 'X1']],
    2: [[9, 'X1'], [10, 'X1']],
    3: [[9, 'X2']],
    4: [[10, 'X2'], [9, 'X2']],
    5: [[9, 'X3']],
    6: [[10, 'X3']],
    0: [[10, 'X3'], [9, 'X4']],
  }[dow];
}
// 120 holds: start at the ceiling of Hard, then add what-ifs until the summit.
const CAMPAIGN_EXTREME = [
  [10, 9, ['X0']], [10, 10, ['X0']],
  [15, 9, ['X1']], [10, 10, ['X1']],
  [15, 9, ['X2']], [15, 10, ['X2']],
  [12, 9, ['X3']], [13, 10, ['X3']],
  [8, 9, ['X4']], [12, 10, ['X4']],
];
const extremeKey = (p) => { const t = extremeTier(p); return t ? `${p.n}:${t}` : 'skip'; };

// Chill mode for the kids: tiny boards that only need "last spot" (L1) and "confined" (L2).
// Daily stays 5x5 most days, 6x6 on Fri-Sun.
function wantKids(date) {
  const dow = new Date(date + 'T00:00:00Z').getUTCDay();
  return {
    1: [[5, 'L1']],
    2: [[5, 'L1']],
    3: [[5, 'L1'], [5, 'L2']],
    4: [[5, 'L2']],
    5: [[6, 'L1']],
    6: [[5, 'L2'], [6, 'L1']],
    0: [[6, 'L1'], [6, 'L2']],
  }[dow];
}
// 40 holds: 28 easy ones (4x4 -> 6x6, L1/L2 only), then a gentle ramp to mid-Cozy (7x7 with L3).
const CAMPAIGN_KIDS = [
  [6, 4, ['L1']], [10, 5, ['L1']], [6, 5, ['L2']], [3, 6, ['L1']], [3, 6, ['L2']],
  [4, 6, ['L3']], [3, 7, ['L2']], [5, 7, ['L3']],
];
// Kids boards: few steps, so no long slogs even at L3.
const kidsKey = (p) => (p.st <= 2 * p.n ? `${p.n}:L${p.lv}` : 'skip');
const MODES = {
  kids: { want: wantKids, plan: CAMPAIGN_KIDS, key: kidsKey, out: 'puzzles-kids.json', campaign: 40 },
  cozy: { want, plan: CAMPAIGN, key: (p) => `${p.n}:${p.g}`, out: 'puzzles.json', campaign: 60 },
  hard: { want: wantHard, plan: CAMPAIGN_HARD, key: (p) => `${p.n}:L${p.lv}`, out: 'puzzles-hard.json', campaign: 80 },
  extreme: {
    want: wantExtreme, plan: CAMPAIGN_EXTREME, key: extremeKey, out: 'puzzles-extreme.json', campaign: 120, maxLevel: 6,
    // Never repeat a Hard board she has already played; ramp each block by chain score, then steps.
    avoid: ['puzzles-hard.json'],
    order: (a, b) => a.lv - b.lv || chainScore(a) - chainScore(b) || a.st - b.st,
  },
};

// Bonus Yards: the top half of each Climb, cycling sizes and tiers so boards in a row differ.
const BONUS = {
  // Cozy by technique level: the top of the Cozy Climb is L3/L4 (L5 boards play like Hard mode).
  cozy: { count: 500, seed: 501, key: (p) => `${p.n}:L${p.lv}`, cycle: [[8, 'L3'], [7, 'L4'], [8, 'L4'], [7, 'L3'], [8, 'L3'], [8, 'L4']] },
  hard: { count: 500, seed: 502, cycle: [[9, 'L5'], [10, 'L4'], [10, 'L5'], [9, 'L5'], [10, 'L4']] },
  extreme: { count: 300, seed: 503, cycle: [[9, 'X2'], [10, 'X2'], [9, 'X3'], [10, 'X3'], [10, 'X4'], [9, 'X4'], [10, 'X3'], [9, 'X2'], [10, 'X4'], [9, 'X3']] },
  kids: { count: 400, seed: 504, cycle: [[6, 'L2'], [7, 'L2'], [6, 'L3'], [7, 'L3']] },
};
const ALL_FILES = ['puzzles.json', 'puzzles-hard.json', 'puzzles-extreme.json', 'puzzles-kids.json', ...Object.keys(BONUS).map((m) => `bonus-${m}.json`)];

function runBonus(name, workers) {
  const cfg = BONUS[name], mode = MODES[name];
  if (!cfg) throw new Error('unknown --bonus mode ' + name);
  const out = resolve(here, '..', arg('out', `bonus-${name}.json`));
  const count = Number(arg('count', cfg.count));
  const seed = Number(arg('seed', cfg.seed));
  const old = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : null;
  const bonus = old?.bonus?.slice() || [];
  // Never repeat a board from any puzzle file, including the other bonus files.
  const seen = new Set();
  for (const f of ALL_FILES) {
    const file = resolve(here, '..', f);
    if (!existsSync(file)) continue;
    const d = JSON.parse(readFileSync(file, 'utf8'));
    for (const p of [...(d.daily || []), ...(d.campaign || []), ...(d.bonus || [])]) seen.add(canonicalKey(p.n, p.r));
  }
  // Slots still to fill continue the cycle where the existing file left off.
  const slots = [];
  for (let i = bonus.length; i < count; i++) slots.push(cfg.cycle[i % cfg.cycle.length]);
  if (!slots.length) return console.log(`${out} already has ${bonus.length} boards`);
  const need = new Map();
  for (const [n, g] of slots) need.set(`${n}:${g}`, (need.get(`${n}:${g}`) || 0) + 1);
  const buckets = new Map();
  const sizesNeeded = () => [...new Set([...need].filter(([k, v]) => (buckets.get(k)?.length || 0) < v).map(([k]) => Number(k.split(':')[0])))];
  console.log(`Bonus ${name}: have ${bonus.length}, adding ${slots.length}`, Object.fromEntries(need));
  const t0 = Date.now();
  let got = 0;
  const keyOf = cfg.key || mode.key;
  runWorkers(workers, seed * 31 + bonus.length, sizesNeeded(), mode.maxLevel ?? 5, (p, setSizes) => {
    const key = keyOf(p);
    if (!need.has(key) || (buckets.get(key)?.length || 0) >= need.get(key)) return false;
    const ck = canonicalKey(p.n, p.r);
    if (seen.has(ck)) return false;
    seen.add(ck);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(p);
    if (++got % 20 === 0) console.log(`${got}/${slots.length}  ${((Date.now() - t0) / 1000).toFixed(0)}s  ` + [...need].map(([k, v]) => `${k} ${buckets.get(k)?.length || 0}/${v}`).join('  '));
    const sizes = sizesNeeded();
    setSizes(sizes);
    return sizes.length === 0;
  }, () => {
    for (const [n, g] of slots) bonus.push({ id: bonus.length + 1, ...buckets.get(`${n}:${g}`).shift() });
    writeFileSync(out, JSON.stringify({ version: 1, mode: name, generatedAt: new Date().toISOString(), seed, bonus }));
    console.log(`Wrote ${bonus.length} bonus boards to ${out} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  });
}

function main() {
  if (arg('bonus')) return runBonus(arg('bonus'), Number(arg('workers', Math.max(1, cpus().length - 1))));
  const mode = MODES[arg('mode', 'cozy')];
  const out = resolve(here, '..', arg('out', mode.out));
  const seed = Number(arg('seed', 1));
  const workers = Number(arg('workers', Math.max(1, cpus().length - 1)));
  const poolSizes = arg('pool-sizes');

  const maxLevel = mode.maxLevel ?? 5;
  if (poolSizes) return runPool(poolSizes.split(',').map(Number), Number(arg('pool-count', 200)), resolve(here, '..', arg('pool-out', 'tools/pool.json')), workers, seed, arg('pool-grade', 'medium'), maxLevel);

  const start = arg('start', '2026-11-06');
  const days = Number(arg('days', 730));
  const campaignLen = Number(arg('campaign', mode.campaign));
  const pool = arg('pool') ? JSON.parse(readFileSync(resolve(arg('pool')), 'utf8')).puzzles : [];

  // Count what each bucket needs.
  const dates = [...Array(days).keys()].map((d) => addDays(start, d));
  const slots = dates.map((date) => ({ date, opts: mode.want(date) }));
  // With a heavy pool, every other Sunday (outside recovery week) becomes a big board.
  let poolIdx = 0;
  if (pool.length) {
    let sunday = 0;
    for (const s of slots) {
      if (new Date(s.date + 'T00:00:00Z').getUTCDay() === 0 && s.date > '2026-11-17' && sunday++ % 2 === 1 && poolIdx < pool.length) s.fixed = pool[poolIdx++];
    }
  }
  const camp = [];
  for (const [count, n, grades] of mode.plan) for (let i = 0; i < count && camp.length < campaignLen; i++) camp.push({ n, grades });

  const buckets = new Map(); // "n:grade" -> array
  const need = new Map();
  const bump = (n, g, k = 1) => need.set(`${n}:${g}`, (need.get(`${n}:${g}`) || 0) + k);
  // Ask for every option a slot accepts so either can fill it; leftovers are discarded.
  for (const s of slots) if (!s.fixed) for (const [n, g] of s.opts) bump(n, g, 1 / s.opts.length);
  for (const c of camp) for (const g of c.grades) bump(c.n, g, 1 / c.grades.length);
  for (const [k, v] of need) need.set(k, Math.ceil(v * 1.5) + 5);

  const seen = new Set(pool.map((p) => canonicalKey(p.n, p.r)));
  for (const f of mode.avoid || []) {
    const d = JSON.parse(readFileSync(resolve(here, '..', f), 'utf8'));
    for (const p of [...d.daily, ...d.campaign]) seen.add(canonicalKey(p.n, p.r));
  }
  const sizesNeeded = () => [...new Set([...need].filter(([k, v]) => (buckets.get(k)?.length || 0) < v).map(([k]) => Number(k.split(':')[0])))];
  console.log('Need:', Object.fromEntries(need));
  const t0 = Date.now();

  let got = 0;
  const total = [...need.values()].reduce((a, b) => a + b, 0);
  runWorkers(workers, seed, sizesNeeded(), maxLevel, (p, setSizes) => {
    const key = mode.key(p);
    if (!need.has(key) || (buckets.get(key)?.length || 0) >= need.get(key)) return false;
    const ck = canonicalKey(p.n, p.r);
    if (seen.has(ck)) return false;
    seen.add(ck);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(p);
    if (++got % 50 === 0) console.log(`${got}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s  ` + [...need].map(([k, v]) => `${k} ${buckets.get(k)?.length || 0}/${v}`).join('  '));
    const sizes = sizesNeeded();
    setSizes(sizes);
    return sizes.length === 0;
  }, () => {
    // Fill slots.
    // Pick from whichever accepted bucket has the most left, filling single-option slots first.
    const take = (opts) => {
      const b = opts.map(([n, g]) => buckets.get(`${n}:${g}`) || []).sort((x, y) => y.length - x.length)[0];
      if (!b.length) throw new Error('ran out for ' + JSON.stringify(opts));
      return b.shift();
    };
    const campOpts = camp.map((c) => c.grades.map((g) => [c.n, g]));
    const order = [...slots.keys()].sort((a, b) => (slots[a].opts.length - slots[b].opts.length));
    const filled = [];
    const campaign = [];
    campOpts.forEach((o, i) => { if (o.length === 1) campaign[i] = { ...take(o), _i: i }; });
    for (const i of order) filled[i] = slots[i].fixed || take(slots[i].opts);
    campOpts.forEach((o, i) => { if (o.length > 1) campaign[i] = { ...take(o), _i: i }; });
    const daily = slots.map((s, i) => ({ date: s.date, ...filled[i] }));
    // Within each size block, order campaign by steps so it ramps.
    let i = 0;
    for (const [count] of mode.plan) {
      const block = campaign.slice(i, i + count).sort(mode.order || ((a, b) => a.lv - b.lv || a.st - b.st));
      campaign.splice(i, block.length, ...block);
      i += count;
    }
    const result = {
      version: 1,
      generatedAt: new Date().toISOString(),
      seed,
      daily,
      campaign: campaign.map(({ _i, ...p }, k) => ({ id: k + 1, ...p })),
    };
    writeFileSync(out, JSON.stringify(result));
    console.log(`Wrote ${daily.length} daily + ${campaign.length} campaign puzzles to ${out} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  });
}

function runPool(sizes, count, out, workers, seed, minGrade, maxLevel) {
  const rank = { easy: 0, medium: 1, hard: 2, extreme: 3 };
  const existing = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')).puzzles : [];
  const seen = new Set(existing.map((p) => canonicalKey(p.n, p.r)));
  const puzzles = existing.slice();
  const t0 = Date.now();
  console.log(`Pool: ${sizes.join(',')}x, target ${count}, ${workers} workers, starting with ${existing.length}`);
  const save = () => writeFileSync(out, JSON.stringify({ version: 1, sizes, puzzles }));
  runWorkers(workers, seed + existing.length * 7919, sizes, maxLevel, (p) => {
    const ck = canonicalKey(p.n, p.r);
    if (seen.has(ck) || rank[p.g] < rank[minGrade]) return false; // big easy boards are dull
    seen.add(ck);
    puzzles.push(p);
    if (puzzles.length % 10 === 0) {
      save();
      const rate = (puzzles.length - existing.length) / ((Date.now() - t0) / 60000);
      console.log(`${puzzles.length}/${count}  (${rate.toFixed(1)} per minute)`);
    }
    return puzzles.length >= count;
  }, () => { save(); console.log(`Saved ${puzzles.length} to ${out}`); });
}

function runWorkers(count, seed, sizes, maxLevel, onPuzzle, onDone) {
  const pool = [];
  let finished = false;
  const setSizes = (s) => pool.forEach((w) => w.postMessage({ sizes: s }));
  for (let i = 0; i < count; i++) {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { seed: seed * 1000 + i, sizes, maxLevel } });
    w.on('message', (p) => {
      if (finished) return;
      if (onPuzzle(p, setSizes)) {
        finished = true;
        pool.forEach((x) => x.terminate());
        onDone();
      }
    });
    w.on('error', (e) => { console.error(e); process.exit(1); });
    pool.push(w);
  }
}

if (isMainThread) main();
