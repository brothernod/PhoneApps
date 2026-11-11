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
// Kids "Chill" file (puzzles-kids.json), for Holden and Quentin:
//   node tools/generate.mjs --mode kids --start 2026-10-01 --days 760
//
// Options: --mode cozy|hard|kids  --start YYYY-MM-DD  --days 730  --campaign 60  --seed 1  --out puzzles.json  --workers N
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { generate, rng, canonicalKey } from '../engine.js';

const here = dirname(fileURLToPath(import.meta.url));

if (!isMainThread) {
  // ---- worker: generate boards of the requested sizes forever ----
  const { seed, sizes } = workerData;
  const rand = rng(seed);
  let wanted = sizes;
  parentPort.on('message', (m) => { if (m.sizes) wanted = m.sizes; if (m.stop) process.exit(0); });
  const loop = () => {
    for (let i = 0; i < 20; i++) {
      if (!wanted.length) break;
      const n = wanted[Math.floor(rand() * wanted.length)];
      const p = generate(n, rand);
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
};

function main() {
  const mode = MODES[arg('mode', 'cozy')];
  const out = resolve(here, '..', arg('out', mode.out));
  const seed = Number(arg('seed', 1));
  const workers = Number(arg('workers', Math.max(1, cpus().length - 1)));
  const poolSizes = arg('pool-sizes');

  if (poolSizes) return runPool(poolSizes.split(',').map(Number), Number(arg('pool-count', 200)), resolve(here, '..', arg('pool-out', 'tools/pool.json')), workers, seed, arg('pool-grade', 'medium'));

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
  const sizesNeeded = () => [...new Set([...need].filter(([k, v]) => (buckets.get(k)?.length || 0) < v).map(([k]) => Number(k.split(':')[0])))];
  console.log('Need:', Object.fromEntries(need));
  const t0 = Date.now();

  runWorkers(workers, seed, sizesNeeded(), (p, setSizes) => {
    const key = mode.key(p);
    if (!need.has(key) || (buckets.get(key)?.length || 0) >= need.get(key)) return false;
    const ck = canonicalKey(p.n, p.r);
    if (seen.has(ck)) return false;
    seen.add(ck);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(p);
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
      const block = campaign.slice(i, i + count).sort((a, b) => a.lv - b.lv || a.st - b.st);
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

function runPool(sizes, count, out, workers, seed, minGrade) {
  const rank = { easy: 0, medium: 1, hard: 2 };
  const existing = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')).puzzles : [];
  const seen = new Set(existing.map((p) => canonicalKey(p.n, p.r)));
  const puzzles = existing.slice();
  const t0 = Date.now();
  console.log(`Pool: ${sizes.join(',')}x, target ${count}, ${workers} workers, starting with ${existing.length}`);
  const save = () => writeFileSync(out, JSON.stringify({ version: 1, sizes, puzzles }));
  runWorkers(workers, seed + existing.length * 7919, sizes, (p) => {
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

function runWorkers(count, seed, sizes, onPuzzle, onDone) {
  const pool = [];
  let finished = false;
  const setSizes = (s) => pool.forEach((w) => w.postMessage({ sizes: s }));
  for (let i = 0; i < count; i++) {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { seed: seed * 1000 + i, sizes } });
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
