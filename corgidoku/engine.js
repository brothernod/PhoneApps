// Corgidoku engine: generator, exact solver, human-technique grader.
// Plain ES module, no dependencies. Used by the game (hints) and by tools/generate.mjs.

// ---------- random ----------
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];
function shuffle(rand, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- encoding ----------
export const encodeRegions = (reg) => reg.map((k) => String.fromCharCode(97 + k)).join('');
export const decodeRegions = (str) => [...str].map((c) => c.charCodeAt(0) - 97);
export const encodeSolution = (cols) => cols.join('');
export const decodeSolution = (str) => [...str].map(Number);

// ---------- exact solver ----------
// Counts solutions (up to limit), row by row. Returns {count, first, second}.
export function solve(n, reg, limit = 2) {
  const sols = [];
  const cols = new Array(n);
  let colMask = 0, regMask = 0;
  (function rec(r, prev) {
    if (sols.length >= limit) return;
    if (r === n) { sols.push(cols.slice()); return; }
    for (let c = 0; c < n; c++) {
      const k = reg[r * n + c];
      if ((colMask >> c) & 1 || (regMask >> k) & 1) continue;
      if (prev >= 0 && Math.abs(prev - c) <= 1) continue;
      colMask |= 1 << c; regMask |= 1 << k; cols[r] = c;
      rec(r + 1, c);
      colMask &= ~(1 << c); regMask &= ~(1 << k);
    }
  })(0, -1);
  return { count: sols.length, first: sols[0], second: sols[1] };
}

// ---------- grader ----------
// Solves like a person, always using the simplest technique that makes progress.
// Returns {solved, level, steps, log}. log entries: {type:'place'|'clear', cells, level, why}.
export function grade(n, reg, opts = {}) {
  const N = n * n;
  const cand = new Uint8Array(N).fill(1);
  const placed = new Uint8Array(N);
  const rows = [], colsU = [], regs = [];
  for (let i = 0; i < n; i++) { rows.push([]); colsU.push([]); regs.push([]); }
  for (let i = 0; i < N; i++) {
    rows[Math.floor(i / n)].push(i);
    colsU[i % n].push(i);
    regs[reg[i]].push(i);
  }
  const units = [
    ...rows.map((cells, i) => ({ kind: 'row', i, cells })),
    ...colsU.map((cells, i) => ({ kind: 'column', i, cells })),
    ...regs.map((cells, i) => ({ kind: 'yard', i, cells })),
  ];
  const neighbors = (i) => {
    const r = Math.floor(i / n), c = i % n, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < n && cc >= 0 && cc < n) out.push(rr * n + cc);
    }
    return out;
  };
  const blockedBy = (i) => {
    const s = new Set([...rows[Math.floor(i / n)], ...colsU[i % n], ...regs[reg[i]], ...neighbors(i)]);
    s.delete(i);
    return s;
  };
  const done = (u) => u.cells.some((c) => placed[c]);
  const live = (u) => u.cells.filter((c) => cand[c] && !placed[c]);
  const log = [];
  let level = 0, steps = 0, count = 0;

  const place = (i, lv, why) => {
    placed[i] = 1; count++;
    for (const j of blockedBy(i)) cand[j] = 0;
    log.push({ type: 'place', cells: [i], level: lv, why });
  };
  const clear = (cells, lv, why) => {
    const hit = cells.filter((c) => cand[c] && !placed[c]);
    if (!hit.length) return false;
    for (const c of hit) cand[c] = 0;
    log.push({ type: 'clear', cells: hit, level: lv, why });
    return true;
  };

  for (const i of opts.given || []) place(i, 0, 'given');

  const t1 = () => {
    for (const u of units) {
      if (done(u)) continue;
      const l = live(u);
      if (l.length === 1) { place(l[0], 1, `only spot left in this ${u.kind}`); return true; }
    }
    return false;
  };
  const t2 = () => {
    for (const u of units) {
      if (done(u)) continue;
      const l = live(u);
      if (!l.length) continue;
      if (u.kind === 'yard') {
        const rs = new Set(l.map((c) => Math.floor(c / n)));
        if (rs.size === 1) {
          const r = [...rs][0];
          if (clear(rows[r].filter((c) => reg[c] !== u.i), 2, 'this yard only fits in one row')) return true;
        }
        const cs = new Set(l.map((c) => c % n));
        if (cs.size === 1) {
          const c0 = [...cs][0];
          if (clear(colsU[c0].filter((c) => reg[c] !== u.i), 2, 'this yard only fits in one column')) return true;
        }
      } else {
        const ks = new Set(l.map((c) => reg[c]));
        if (ks.size === 1) {
          const k = [...ks][0];
          const inLine = u.kind === 'row' ? (c) => Math.floor(c / n) === u.i : (c) => c % n === u.i;
          if (clear(regs[k].filter((c) => !inLine(c)), 2, `this ${u.kind} only has room in one yard`)) return true;
        }
      }
    }
    return false;
  };
  const t3 = () => {
    for (let i = 0; i < N; i++) {
      if (!cand[i] || placed[i]) continue;
      const b = blockedBy(i);
      for (const u of units) {
        if (done(u) || u.cells.includes(i)) continue;
        const l = live(u);
        if (l.length && l.every((c) => b.has(c))) {
          cand[i] = 0;
          log.push({ type: 'clear', cells: [i], level: 3, why: `a corgi here would leave a ${u.kind} with no room` });
          return true;
        }
      }
    }
    return false;
  };
  // k regions confined to k lines (and k lines confined to k regions)
  const lock = (k, lv) => {
    const openRegs = regs.map((cells, i) => i).filter((i) => !regs[i].some((c) => placed[c]));
    const sets = [];
    const combos = (arr, size, start = 0, acc = []) => {
      if (acc.length === size) { sets.push(acc.slice()); return; }
      for (let x = start; x < arr.length; x++) { acc.push(arr[x]); combos(arr, size, x + 1, acc); acc.pop(); }
    };
    if (openRegs.length <= k) return false;
    combos(openRegs, k);
    for (const group of sets) {
      const cells = group.flatMap((g) => regs[g].filter((c) => cand[c] && !placed[c]));
      for (const axis of ['row', 'column']) {
        const line = axis === 'row' ? (c) => Math.floor(c / n) : (c) => c % n;
        const lines = new Set(cells.map(line));
        if (lines.size === k) {
          const gs = new Set(group);
          const outside = [];
          for (const L of lines) for (const c of (axis === 'row' ? rows : colsU)[L]) if (!gs.has(reg[c])) outside.push(c);
          if (clear(outside, lv, `${k} yards share exactly ${k} ${axis}s`)) return true;
        }
      }
    }
    // reverse: k lines whose candidates sit in exactly k regions
    for (const axis of ['row', 'column']) {
      const lines = axis === 'row' ? rows : colsU;
      const open = lines.map((cells, i) => i).filter((i) => !lines[i].some((c) => placed[c]));
      if (open.length <= k) continue;
      const lsets = [];
      (function cmb(start, acc) {
        if (acc.length === k) { lsets.push(acc.slice()); return; }
        for (let x = start; x < open.length; x++) { acc.push(open[x]); cmb(x + 1, acc); acc.pop(); }
      })(0, []);
      for (const group of lsets) {
        const cells = group.flatMap((L) => lines[L].filter((c) => cand[c] && !placed[c]));
        const ks = new Set(cells.map((c) => reg[c]));
        if (ks.size === k) {
          const ls = new Set(group);
          const lineOf = axis === 'row' ? (c) => Math.floor(c / n) : (c) => c % n;
          const outside = [];
          for (const K of ks) for (const c of regs[K]) if (!ls.has(lineOf(c))) outside.push(c);
          if (clear(outside, lv, `${k} ${axis}s share exactly ${k} yards`)) return true;
        }
      }
    }
    return false;
  };

  const groupLock = () => { for (let k = 3; k < n - 1; k++) if (lock(k, 5)) return true; return false; };

  // Level 6, "what if": pretend a corgi sits on a spot and follow only the forced
  // moves (last spots). If a row, column or yard then runs out of room, the spot is out.
  // Depth = how many forced corgis it took to hit the dead end; the shortest chain wins.
  const chainLimit = opts.chainLimit ?? 6;
  const chainFrom = (i) => {
    const c = cand.slice(), p = placed.slice();
    const put = (j) => { p[j] = 1; for (const k of blockedBy(j)) c[k] = 0; };
    put(i);
    for (let depth = 0; ; depth++) {
      let forced = -1;
      for (const u of units) {
        if (u.cells.some((x) => p[x])) continue;
        let left = 0, last = -1;
        for (const x of u.cells) if (c[x] && !p[x]) { left++; last = x; }
        if (!left) return { depth, unit: u };
        if (left === 1 && forced < 0) forced = last;
      }
      if (forced < 0 || depth >= chainLimit) return null;
      put(forced);
    }
  };
  const t6 = () => {
    let best = null;
    for (let i = 0; i < N && !(best && best.depth <= 1); i++) {
      if (!cand[i] || placed[i]) continue;
      const res = chainFrom(i);
      if (res && (!best || res.depth < best.depth)) best = { i, ...res };
    }
    if (!best) return false;
    cand[best.i] = 0;
    const d = best.depth;
    log.push({ type: 'clear', cells: [best.i], level: 6, depth: d,
      why: `a corgi here would force ${d} more corgi${d === 1 ? '' : 's'} and leave a ${best.unit.kind} with no room` });
    return true;
  };

  const maxLevel = opts.maxLevel ?? 6;
  let chains = 0, maxChain = 0;
  while (count < n) {
    let lv = 0;
    if (t1()) lv = 1;
    else if (maxLevel >= 2 && t2()) lv = 2;
    else if (maxLevel >= 3 && t3()) lv = 3;
    else if (maxLevel >= 4 && lock(2, 4)) lv = 4;
    else if (maxLevel >= 5 && groupLock()) lv = 5;
    else if (maxLevel >= 6 && t6()) { lv = 6; chains++; maxChain = Math.max(maxChain, log.at(-1).depth); }
    if (!lv) break;
    level = Math.max(level, lv);
    steps++;
    if (opts.stopAfterPlace && log.at(-1).type === 'place') break;
  }
  const solved = count === n;
  return { solved, level, steps, log, placed, cand, chains, maxChain };
}

export const gradeName = (lv) => (lv <= 2 ? 'easy' : lv <= 4 ? 'medium' : lv <= 5 ? 'hard' : 'extreme');

// ---------- generator ----------
function randomSolution(n, rand) {
  const cols = [];
  const used = new Set();
  const rec = (r) => {
    if (r === n) return true;
    for (const c of shuffle(rand, [...Array(n).keys()])) {
      if (used.has(c) || (r && Math.abs(cols[r - 1] - c) <= 1)) continue;
      cols.push(c); used.add(c);
      if (rec(r + 1)) return true;
      cols.pop(); used.delete(c);
    }
    return false;
  };
  return rec(0) ? cols : null;
}

function growRegions(n, cols, rand) {
  const reg = new Array(n * n).fill(-1);
  const frontier = [];
  cols.forEach((c, r) => { reg[r * n + c] = r; frontier.push(r * n + c); });
  let filled = n;
  while (filled < n * n) {
    const idx = Math.floor(rand() * frontier.length);
    const i = frontier[idx];
    const r = Math.floor(i / n), c = i % n;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dr, dc]) => [r + dr, c + dc])
      .filter(([rr, cc]) => rr >= 0 && rr < n && cc >= 0 && cc < n && reg[rr * n + cc] === -1)
      .map(([rr, cc]) => rr * n + cc);
    if (!nb.length) { frontier.splice(idx, 1); continue; }
    const j = pick(rand, nb);
    reg[j] = reg[i];
    frontier.push(j);
    filled++;
  }
  return reg;
}

function connectedWithout(n, reg, k, removed) {
  const cells = [];
  for (let i = 0; i < n * n; i++) if (reg[i] === k && i !== removed) cells.push(i);
  if (!cells.length) return false;
  const seen = new Set([cells[0]]);
  const stack = [cells[0]];
  while (stack.length) {
    const i = stack.pop();
    const r = Math.floor(i / n), c = i % n;
    for (const [rr, cc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
      if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
      const j = rr * n + cc;
      if (j !== removed && reg[j] === k && !seen.has(j)) { seen.add(j); stack.push(j); }
    }
  }
  return seen.size === cells.length;
}

// Make one unique, guess-free puzzle. Returns null if it gives up.
export function generate(n, rand, { maxRepairs = 40, maxLevel = 5 } = {}) {
  const cols = randomSolution(n, rand);
  if (!cols) return null;
  const reg = growRegions(n, cols, rand);
  const solCells = new Set(cols.map((c, r) => r * n + c));
  for (let attempt = 0; attempt <= maxRepairs; attempt++) {
    const res = solve(n, reg, 2);
    if (res.count === 1) break;
    if (attempt === maxRepairs) return null;
    // Kill the other solution: move one of its corgi cells into a neighboring yard.
    const alt = res.first.join() === cols.join() ? res.second : res.first;
    const moves = [];
    alt.forEach((c, r) => {
      const i = r * n + c;
      if (solCells.has(i)) return;
      for (const [rr, cc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
        if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
        const k = reg[rr * n + cc];
        if (k !== reg[i] && connectedWithout(n, reg, reg[i], i)) moves.push([i, k]);
      }
    });
    if (!moves.length) return null;
    const [i, k] = pick(rand, moves);
    reg[i] = k;
  }
  const g = grade(n, reg, { maxLevel });
  if (!g.solved) return null;
  const out = {
    n,
    r: encodeRegions(reg),
    s: encodeSolution(cols),
    g: gradeName(g.level),
    lv: g.level,
    st: g.steps,
  };
  // Extreme boards also record how many "what if" chains they need and the longest one.
  if (g.chains) { out.ch = g.chains; out.cd = g.maxChain; }
  return out;
}

// Canonical key so rotations and mirrors count as the same board.
export function canonicalKey(n, rStr) {
  const reg = decodeRegions(rStr);
  const keys = [];
  const maps = [
    (r, c) => [r, c], (r, c) => [c, n - 1 - r], (r, c) => [n - 1 - r, n - 1 - c], (r, c) => [n - 1 - c, r],
    (r, c) => [r, n - 1 - c], (r, c) => [n - 1 - r, c], (r, c) => [c, r], (r, c) => [n - 1 - c, n - 1 - r],
  ];
  for (const m of maps) {
    const out = new Array(n * n);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const [rr, cc] = m(r, c);
      out[rr * n + cc] = reg[r * n + c];
    }
    // relabel regions in first-seen order
    const relabel = new Map();
    keys.push(out.map((k) => { if (!relabel.has(k)) relabel.set(k, relabel.size); return String.fromCharCode(97 + relabel.get(k)); }).join(''));
  }
  return keys.sort()[0];
}
