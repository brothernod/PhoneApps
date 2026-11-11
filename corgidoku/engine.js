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

// ---------- step finder (shared by the grader and Sniff) ----------
// One implementation of the technique ladder in SPEC.md. findStep() looks at a state (candidates
// and placed corgis) and returns the lowest-level step that makes progress, without changing
// anything; applyStep() carries it out. grade() loops on the two, and sniff() asks for one step
// from the player's own board, so the grader and the hint can never disagree.
//
// A step: { type: 'place' | 'clear', cells, level, why, ...evidence }
//   cells  the corgi to place, or the spots to paw-mark (each still a candidate)
//   look   spots to highlight for "look here" (tap 1 of a Sniff)
//   area   spots that justify the step (tap 2)
//   unit   { kind: 'row' | 'column' | 'yard', i }: the unit the step is about (levels 1-3)
//   line   level 2: the row/column a confined yard sits in; yard: the yard a confined row/column sits in
//   group, cover  levels 4-5: the yards (or lines) in the lock, and the lines (or yards) they cover
//   chain, dead, depth  level 6: the forced corgis [{ cell, unit }], and the unit that runs out of room
export function makeBoard(n, reg) {
  const N = n * n;
  const rows = [], cols = [], regs = [];
  for (let i = 0; i < n; i++) { rows.push([]); cols.push([]); regs.push([]); }
  for (let i = 0; i < N; i++) {
    rows[Math.floor(i / n)].push(i);
    cols[i % n].push(i);
    regs[reg[i]].push(i);
  }
  const units = [
    ...rows.map((cells, i) => ({ kind: 'row', i, cells })),
    ...cols.map((cells, i) => ({ kind: 'column', i, cells })),
    ...regs.map((cells, i) => ({ kind: 'yard', i, cells })),
  ];
  // Everything a corgi on i rules out: its row, column, yard and 8 neighbors.
  const peers = [];
  for (let i = 0; i < N; i++) {
    const r = Math.floor(i / n), c = i % n, s = new Set([...rows[r], ...cols[c], ...regs[reg[i]]]);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < n && cc >= 0 && cc < n) s.add(rr * n + cc);
    }
    s.delete(i);
    peers.push(s);
  }
  return { n, reg, N, rows, cols, regs, units, peers };
}

const unitRef = (u) => ({ kind: u.kind, i: u.i });
const cellsOf = (B, kind, i) => (kind === 'row' ? B.rows : kind === 'column' ? B.cols : B.regs)[i];

export function findStep(B, cand, placed, { maxLevel = 6, chainLimit = 6 } = {}) {
  const { n, reg, N, rows, cols, regs, units, peers } = B;
  const done = (u) => u.cells.some((c) => placed[c]);
  const live = (u) => u.cells.filter((c) => cand[c] && !placed[c]);
  const hits = (cells) => cells.filter((c) => cand[c] && !placed[c]);

  // Level 1, last spot.
  for (const u of units) {
    if (done(u)) continue;
    const l = live(u);
    if (l.length === 1) return { type: 'place', cells: [l[0]], level: 1, why: `only spot left in this ${u.kind}`, unit: unitRef(u), look: u.cells, area: u.cells };
  }
  // Level 2, confined.
  if (maxLevel >= 2) for (const u of units) {
    if (done(u)) continue;
    const l = live(u);
    if (!l.length) continue;
    if (u.kind === 'yard') {
      const rs = new Set(l.map((c) => Math.floor(c / n)));
      if (rs.size === 1) {
        const r = [...rs][0], hit = hits(rows[r].filter((c) => reg[c] !== u.i));
        if (hit.length) return { type: 'clear', cells: hit, level: 2, why: 'this yard only fits in one row', unit: unitRef(u), line: { kind: 'row', i: r }, look: u.cells, area: [...new Set([...u.cells, ...rows[r]])] };
      }
      const cs = new Set(l.map((c) => c % n));
      if (cs.size === 1) {
        const c0 = [...cs][0], hit = hits(cols[c0].filter((c) => reg[c] !== u.i));
        if (hit.length) return { type: 'clear', cells: hit, level: 2, why: 'this yard only fits in one column', unit: unitRef(u), line: { kind: 'column', i: c0 }, look: u.cells, area: [...new Set([...u.cells, ...cols[c0]])] };
      }
    } else {
      const ks = new Set(l.map((c) => reg[c]));
      if (ks.size === 1) {
        const k = [...ks][0];
        const inLine = u.kind === 'row' ? (c) => Math.floor(c / n) === u.i : (c) => c % n === u.i;
        const hit = hits(regs[k].filter((c) => !inLine(c)));
        if (hit.length) return { type: 'clear', cells: hit, level: 2, why: `this ${u.kind} only has room in one yard`, unit: unitRef(u), yard: k, look: u.cells, area: [...new Set([...u.cells, ...regs[k]])] };
      }
    }
  }
  // Level 3, would block.
  if (maxLevel >= 3) for (let i = 0; i < N; i++) {
    if (!cand[i] || placed[i]) continue;
    const b = peers[i];
    for (const u of units) {
      if (done(u) || u.cells.includes(i)) continue;
      const l = live(u);
      if (l.length && l.every((c) => b.has(c))) {
        return { type: 'clear', cells: [i], level: 3, why: `a corgi here would leave a ${u.kind} with no room`, unit: unitRef(u), look: u.cells, area: [i, ...u.cells] };
      }
    }
  }
  // Levels 4-5: k yards confined to k lines (and k lines confined to k yards).
  const lock = (k, lv) => {
    const openRegs = regs.map((cells, i) => i).filter((i) => !regs[i].some((c) => placed[c]));
    if (openRegs.length <= k) return null;
    const sets = [];
    const combos = (arr, size, start = 0, acc = []) => {
      if (acc.length === size) { sets.push(acc.slice()); return; }
      for (let x = start; x < arr.length; x++) { acc.push(arr[x]); combos(arr, size, x + 1, acc); acc.pop(); }
    };
    combos(openRegs, k);
    for (const group of sets) {
      const cells = group.flatMap((g) => regs[g].filter((c) => cand[c] && !placed[c]));
      for (const axis of ['row', 'column']) {
        const line = axis === 'row' ? (c) => Math.floor(c / n) : (c) => c % n;
        const lines = new Set(cells.map(line));
        if (lines.size === k) {
          const gs = new Set(group);
          const outside = [];
          for (const L of lines) for (const c of (axis === 'row' ? rows : cols)[L]) if (!gs.has(reg[c])) outside.push(c);
          const hit = hits(outside);
          if (hit.length) {
            const ids = [...lines].sort((a, b) => a - b), gcells = group.flatMap((g) => regs[g]);
            return { type: 'clear', cells: hit, level: lv, why: `${k} yards share exactly ${k} ${axis}s`,
              group: { kind: 'yard', ids: group.slice() }, cover: { kind: axis, ids },
              look: gcells, area: [...new Set([...gcells, ...ids.flatMap((L) => cellsOf(B, axis, L))])] };
          }
        }
      }
    }
    // reverse: k lines whose candidates sit in exactly k regions
    for (const axis of ['row', 'column']) {
      const lines = axis === 'row' ? rows : cols;
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
          const hit = hits(outside);
          if (hit.length) {
            const yids = [...ks].sort((a, b) => a - b), lcells = group.flatMap((L) => lines[L]);
            return { type: 'clear', cells: hit, level: lv, why: `${k} ${axis}s share exactly ${k} yards`,
              group: { kind: axis, ids: group.slice() }, cover: { kind: 'yard', ids: yids },
              look: lcells, area: [...new Set([...lcells, ...yids.flatMap((K) => regs[K])])] };
          }
        }
      }
    }
    return null;
  };
  if (maxLevel >= 4) { const s = lock(2, 4); if (s) return s; }
  if (maxLevel >= 5) for (let k = 3; k < n - 1; k++) { const s = lock(k, 5); if (s) return s; }

  // Level 6, "what if": pretend a corgi sits on a spot and follow only the forced moves
  // (last spots). If a row, column or yard then runs out of room, the spot is out.
  // Depth = how many forced corgis it took to hit the dead end; the shortest chain wins.
  if (maxLevel >= 6) {
    const chainFrom = (i) => {
      const c = cand.slice(), p = placed.slice(), chain = [];
      const put = (j) => { p[j] = 1; for (const k of peers[j]) c[k] = 0; };
      put(i);
      for (let depth = 0; ; depth++) {
        let forced = -1, via = null;
        for (const u of units) {
          if (u.cells.some((x) => p[x])) continue;
          let left = 0, last = -1;
          for (const x of u.cells) if (c[x] && !p[x]) { left++; last = x; }
          if (!left) return { depth, unit: u, chain };
          if (left === 1 && forced < 0) { forced = last; via = u; }
        }
        if (forced < 0 || depth >= chainLimit) return null;
        put(forced);
        chain.push({ cell: forced, unit: unitRef(via) });
      }
    };
    let best = null;
    for (let i = 0; i < N && !(best && best.depth <= 1); i++) {
      if (!cand[i] || placed[i]) continue;
      const res = chainFrom(i);
      if (res && (!best || res.depth < best.depth)) best = { i, ...res };
    }
    if (best) {
      const d = best.depth;
      return { type: 'clear', cells: [best.i], level: 6, depth: d,
        why: `a corgi here would force ${d} more corgi${d === 1 ? '' : 's'} and leave a ${best.unit.kind} with no room`,
        chain: best.chain, dead: unitRef(best.unit), look: [best.i],
        area: [...new Set([best.i, ...best.chain.map((x) => x.cell), ...best.unit.cells])] };
    }
  }
  return null;
}

export function applyStep(B, cand, placed, step) {
  if (step.type === 'place') { const i = step.cells[0]; placed[i] = 1; for (const j of B.peers[i]) cand[j] = 0; }
  else for (const c of step.cells) cand[c] = 0;
}

// ---------- grader ----------
// Solves like a person, always using the simplest technique that makes progress.
// Returns {solved, level, steps, log}. log entries: {type:'place'|'clear', cells, level, why}.
export function grade(n, reg, opts = {}) {
  const B = makeBoard(n, reg);
  const cand = new Uint8Array(B.N).fill(1);
  const placed = new Uint8Array(B.N);
  const log = [];
  let level = 0, steps = 0, count = 0;
  for (const i of opts.given || []) {
    applyStep(B, cand, placed, { type: 'place', cells: [i] }); count++;
    log.push({ type: 'place', cells: [i], level: 0, why: 'given' });
  }
  const maxLevel = opts.maxLevel ?? 6, chainLimit = opts.chainLimit ?? 6;
  let chains = 0, maxChain = 0;
  while (count < n) {
    const s = findStep(B, cand, placed, { maxLevel, chainLimit });
    if (!s) break;
    applyStep(B, cand, placed, s);
    if (s.type === 'place') count++;
    log.push({ type: s.type, cells: s.cells, level: s.level, why: s.why, ...(s.level === 6 ? { depth: s.depth } : {}) });
    if (s.level === 6) { chains++; maxChain = Math.max(maxChain, s.depth); }
    level = Math.max(level, s.level);
    steps++;
    if (opts.stopAfterPlace && s.type === 'place') break;
  }
  const solved = count === n;
  return { solved, level, steps, log, placed, cand, chains, maxChain };
}

// ---------- Sniff (the in-game hint) ----------
// One hint from the player's own board. corgis: cells with a corgi (always right in the game).
// out: cells known to be empty (red paws, auto paws, plum paw marks). Brainstorm-color paws are
// what-ifs and are not passed in. sol: the solution, sol[row] = column.
// Returns, in order of priority:
//   { type: 'wrong', cells }  plum paws sitting on corgi spots (or corgis off the solution); the logic can't go on until they're gone
//   a findStep() step         the lowest-level step that makes progress from this board
//   { type: 'reveal', cells } a fallback corgi spot if no technique applies (the tests check this never happens)
//   null                      the board is already solved
export function sniff(n, reg, sol, { corgis = [], out = [] } = {}) {
  const isSol = (i) => sol[Math.floor(i / n)] === i % n;
  // A corgi can't also be a paw mark, and a corgi off the solution (never made by the game, which
  // turns a wrong guess into a red paw) is as wrong as a paw on a corgi spot.
  corgis = [...new Set(corgis)];
  out = [...new Set(out)].filter((i) => !corgis.includes(i));
  const wrong = [...out.filter(isSol), ...corgis.filter((i) => !isSol(i))].sort((a, b) => a - b);
  if (wrong.length) return { type: 'wrong', cells: wrong, level: 0, look: wrong, area: wrong };
  const B = makeBoard(n, reg);
  const cand = new Uint8Array(B.N).fill(1), placed = new Uint8Array(B.N);
  for (const i of corgis) applyStep(B, cand, placed, { type: 'place', cells: [i] });
  for (const i of out) if (!placed[i]) cand[i] = 0;
  const todo = sol.map((c, r) => r * n + c).filter((i) => !placed[i]);
  if (!todo.length) return null;
  const s = findStep(B, cand, placed, { maxLevel: 6 });
  return s || { type: 'reveal', cells: [todo[0]], level: 0, look: [todo[0]], area: [todo[0]] };
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

// Bonus Yards laps: the same board turned or mirrored (t = 1..7; 0 = as is), with the yard
// letters shifted by `shift` so the colors change too. Returns a new { n, r, s }.
const DIHEDRAL = [
  (n, r, c) => [r, c], (n, r, c) => [c, n - 1 - r], (n, r, c) => [n - 1 - r, n - 1 - c], (n, r, c) => [n - 1 - c, r],
  (n, r, c) => [r, n - 1 - c], (n, r, c) => [n - 1 - r, c], (n, r, c) => [c, r], (n, r, c) => [n - 1 - c, n - 1 - r],
];
export function transformBoard({ n, r, s }, t, shift = 0) {
  const m = DIHEDRAL[((t % 8) + 8) % 8];
  const out = new Array(n * n), sol = new Array(n);
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
    const [rr, cc] = m(n, row, col);
    out[rr * n + cc] = String.fromCharCode(97 + ((r.charCodeAt(row * n + col) - 97 + shift) % n));
    if (+s[row] === col) sol[rr] = cc;
  }
  return { n, r: out.join(''), s: sol.join('') };
}
