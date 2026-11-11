#!/usr/bin/env node
// Independent verifier for corgidoku puzzles.json (written from SPEC.md only).
// Usage: node tools/verify.mjs [path/to/puzzles.json | path/to/bonus-<mode>.json]
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const DAY = 86400000;

// ---- 1. schema -------------------------------------------------------------
export function checkSchema(e) {
  const errs = [];
  const { n, r, s } = e ?? {};
  if (!Number.isInteger(n) || n < 4 || n > 10) return [`n must be integer 4..10 (got ${JSON.stringify(n)})`];
  if (typeof r !== 'string' || r.length !== n * n) errs.push(`r must be a string of length ${n * n}`);
  else {
    const letters = new Set(r);
    for (const ch of letters) if (ch < 'a' || ch.charCodeAt(0) - 97 >= n) errs.push(`r has invalid letter '${ch}'`);
    for (let k = 0; k < n; k++) if (!letters.has(String.fromCharCode(97 + k))) errs.push(`region '${String.fromCharCode(97 + k)}' unused`);
  }
  if (typeof s !== 'string' || s.length !== n) errs.push(`s must be a string of length ${n}`);
  else for (const ch of s) if (!(ch >= '0' && ch <= '9') || +ch >= n) errs.push(`s has invalid digit '${ch}'`);
  return errs;
}

// ---- 2. region connectivity (4-neighbour flood fill) ----------------------------
export function checkConnected({ n, r }) {
  const errs = [], seen = new Uint8Array(n * n);
  for (let k = 0; k < n; k++) {
    const ch = String.fromCharCode(97 + k);
    const total = [...r].filter((c) => c === ch).length;
    const start = r.indexOf(ch);
    const stack = [start];
    let reached = 0;
    seen[start] = 1;
    while (stack.length) {
      const c = stack.pop(), row = (c / n) | 0, col = c % n;
      reached++;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = row + dr, cc = col + dc, j = rr * n + cc;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n || seen[j] || r[j] !== ch) continue;
        seen[j] = 1;
        stack.push(j);
      }
    }
    if (reached !== total) errs.push(`region '${ch}' is not connected (${reached} of ${total} cells reachable)`);
  }
  return errs;
}

// ---- 3. the given solution obeys the four rules --------------------------------
export function checkSolution({ n, r, s }) {
  const errs = [], cols = new Set(), regs = new Set();
  for (let i = 0; i < n; i++) {
    const c = +s[i], reg = r[i * n + c];
    if (cols.has(c)) errs.push(`column ${c} has more than one corgi`);
    if (regs.has(reg)) errs.push(`region '${reg}' has more than one corgi`);
    cols.add(c);
    regs.add(reg);
    if (i + 1 < n && Math.abs(c - +s[i + 1]) <= 1) errs.push(`corgis in rows ${i} and ${i + 1} touch`);
  }
  return errs; // one-per-row is guaranteed by the encoding; one-per-column/region by n distinct values
}

// ---- 4. exhaustive solver: region by region, smallest first --------------------
// Each region picks one cell. Bitmasks track used rows/cols; `blocked` counts how many
// placed corgis cover each cell with their 8-neighbourhood. Returns up to `limit` solutions.
export function solve(n, r, limit = 2) {
  const regions = Array.from({ length: n }, () => []);
  for (let i = 0; i < n * n; i++) regions[r.charCodeAt(i) - 97].push(i);
  const order = regions.map((_, g) => g).sort((a, b) => regions[a].length - regions[b].length);
  const blocked = new Int16Array(n * n), colOfRow = new Array(n).fill(0), done = new Array(n).fill(false);
  const sols = [];
  let rows = 0, cols = 0;
  const viable = (c) => !((rows >> ((c / n) | 0)) & 1) && !((cols >> c % n) & 1) && !blocked[c];
  const mark = (c, d) => {
    const row = (c / n) | 0, col = c % n;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const rr = row + dr, cc = col + dc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n) blocked[rr * n + cc] += d;
      }
  };
  const rec = (placedCount) => {
    if (placedCount === n) { sols.push(colOfRow.join('')); return sols.length >= limit; }
    // pick the unplaced region with the fewest viable cells (ties: the smaller region, via `order`)
    let best = -1, bestCands = null;
    for (const g of order) {
      if (done[g]) continue;
      const cands = regions[g].filter(viable);
      if (!cands.length) return false;
      if (!bestCands || cands.length < bestCands.length) { best = g; bestCands = cands; }
    }
    done[best] = true;
    for (const c of bestCands) {
      const row = (c / n) | 0, col = c % n;
      rows |= 1 << row; cols |= 1 << col; colOfRow[row] = col; mark(c, 1);
      const stop = rec(placedCount + 1);
      rows &= ~(1 << row); cols &= ~(1 << col); mark(c, -1);
      if (stop) { done[best] = false; return true; }
    }
    done[best] = false;
    return false;
  };
  rec(0);
  return sols;
}

export function checkUnique({ n, r, s }) {
  const sols = solve(n, r, 2);
  if (sols.length === 0) return ['no solution exists'];
  if (sols.length > 1) return [`not unique: at least 2 solutions (${sols.join(', ')})`];
  return sols[0] === s ? [] : [`unique solution is ${sols[0]} but s is ${s}`];
}

// All per-entry checks. Later checks are skipped when earlier ones make them meaningless.
export function checkEntry(e) {
  let errs = checkSchema(e);
  if (errs.length) return errs;
  errs = checkConnected(e);
  if (errs.length) return errs;
  errs = checkSolution(e);
  if (errs.length) return errs;
  return checkUnique(e);
}

// ---- 5. sequence checks ------------------------------------------------------
const parseDate = (d) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d ?? '');
  if (!m) return NaN;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return new Date(t).toISOString().slice(0, 10) === d ? t : NaN; // rejects e.g. 2026-02-30
};

export function checkDailyDates(daily) {
  const errs = [];
  daily.forEach((e, i) => {
    const t = parseDate(e?.date);
    if (Number.isNaN(t)) return errs.push({ key: e?.date ?? `#${i}`, msg: 'invalid date (want YYYY-MM-DD)' });
    if (i === 0) return;
    const prev = parseDate(daily[i - 1]?.date);
    if (!Number.isNaN(prev) && t - prev !== DAY)
      errs.push({ key: e.date, msg: `expected ${new Date(prev + DAY).toISOString().slice(0, 10)} after ${daily[i - 1].date} (${t === prev ? 'duplicate' : 'gap/out of order'})` });
  });
  return errs;
}

export function checkCampaignIds(campaign) {
  const errs = [];
  campaign.forEach((e, i) => {
    if (e?.id !== i + 1) errs.push({ key: `id ${e?.id}`, msg: `expected id ${i + 1} at position ${i}` });
  });
  return errs;
}

// ---- driver ------------------------------------------------------------------
export function verifyData(data) {
  const out = {};
  // A Bonus Yards file (bonus-<mode>.json) has only a `bonus` list, ids 1..N like the campaign.
  const lists = Array.isArray(data?.bonus)
    ? [['bonus', (e, i) => `id ${e?.id ?? '#' + i}`, checkCampaignIds]]
    : [['daily', (e, i) => e?.date ?? `#${i}`, checkDailyDates], ['campaign', (e, i) => `id ${e?.id ?? '#' + i}`, checkCampaignIds]];
  for (const [name, keyOf, seqCheck] of lists) {
    const list = Array.isArray(data?.[name]) ? data[name] : null;
    const failures = [];
    if (!list) failures.push({ key: name, msg: 'missing or not an array' });
    else {
      list.forEach((e, i) => { for (const msg of checkEntry(e)) failures.push({ key: keyOf(e, i), msg }); });
      failures.push(...seqCheck(list));
    }
    out[name] = { checked: list?.length ?? 0, failures };
  }
  return out;
}

function main() {
  const file = process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'puzzles.json');
  let data;
  try { data = JSON.parse(readFileSync(file, 'utf8')); }
  catch (err) { console.error(`cannot read ${file}: ${err.message}`); process.exit(1); }
  const res = verifyData(data);
  let bad = 0;
  for (const [name, { checked, failures }] of Object.entries(res)) {
    console.log(`${name}: ${checked} checked, ${failures.length} failure(s)`);
    bad += failures.length;
  }
  for (const [name, { failures }] of Object.entries(res)) for (const f of failures) console.log(`FAIL ${name} ${f.key}: ${f.msg}`);
  process.exit(bad ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
