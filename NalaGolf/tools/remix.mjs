// Remix layouts for round 2+ (after the game has been beaten once).
// Moves the small clutter (knock-overs + squeaky toys) and the treat to random spots in the same
// room, then runs every candidate through the real-physics solver (tools/solve.mjs --cand) and keeps
// only layouts that are still beatable with human aim and have a reachable treat.
// Characters (Stella, Binx), furniture, the goal and anything a level lists in `pin` never move,
// so Ashley's directions stay true.
//
// Usage (from NalaGolf/):  node tools/remix.mjs [level#…] [--n=10] [--keep=3] [--jobs=2] [--seed=7] [--min=.45] [--mintreat=.3]
// Writes tools/remix-out.json ({levelIndex: [{m,treat,score}]}) and prints `remix:` lines for levels.js.
import vm from 'node:vm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(a => a.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const N = +opt('n', 10), KEEP = +opt('keep', 3), JOBS = +opt('jobs', os.cpus().length), MIN = +opt('min', .45), MINT = +opt('mintreat', .3);
let seed = +opt('seed', 7);
const only = args.filter(a => /^\d+$/.test(a)).map(n => +n - 1);
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const ctx = vm.createContext({ Math, Object, JSON });
vm.runInContext(fs.readFileSync(path.join(root, 'levels.js'), 'utf8'), ctx);
const LV = vm.runInContext('LEVELS.map(l=>({name:l.name,start:l.start,goal:l.goal,floors:l.floors,ents:l.ents,pin:l.pin||[],objs:l.objs().map(o=>({t:o.t,x:o.x,y:o.y,w:o.w,h:o.h,r:o.r,name:o.name,mat:o.mat,knock:!!o.knock}))}))', ctx);
const DOG_R = 13, CLEAR = 30, ENT_R = { treat: 7, stella: 14, binx: 12 };

function gap(a, b) {
  if (a.t === 'c' && b.t === 'c') return Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
  const c = a.t === 'c' ? a : b, r = a.t === 'c' ? b : a;
  const cx = Math.max(r.x, Math.min(c.x, r.x + r.w)), cy = Math.max(r.y, Math.min(c.y, r.y + r.h));
  return Math.hypot(c.x - cx, c.y - cy) - c.r;
}
const roomOf = (L, x, y) => (L.floors || []).filter(f => x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h).sort((a, b) => b.w * b.h - a.w * a.h)[0];

function candidate(L) {
  const movers = L.objs.map((o, i) => ({ o, i })).filter(({ o }) => (o.knock || o.mat === 'squeak') && !L.pin.includes(o.name));
  const fixed = L.objs.filter((o, i) => !movers.some(m => m.i === i));
  const ents = L.ents.filter(e => e.k !== 'treat').map(e => ({ t: 'c', x: e.x, y: e.y, r: ENT_R[e.k] }));
  const goal = L.goal.t === 'r' ? L.goal : { t: 'c', x: L.goal.x, y: L.goal.y, r: L.goal.r };
  const placed = [], m = {};
  const ok = (c, minMove, from) => {
    if (Math.hypot(c.x - from.x, c.y - from.y) < minMove) return false;
    if (Math.hypot(c.x - L.start.x, c.y - L.start.y) < c.r + DOG_R + CLEAR) return false;
    if (gap(c, goal) < CLEAR) return false;
    for (const f of fixed) { const g = gap(c, f); if (g < 0) return false; if (g < CLEAR && !(f.name === 'wall' && g <= 4)) return false; }   // flush against a wall is fine
    for (const p of [...placed, ...ents]) if (gap(c, p) < CLEAR) return false;
    return true;
  };
  for (const { o, i } of movers.sort(() => rnd() - .5)) {
    const room = roomOf(L, o.x, o.y); if (!room) return null;
    let got = null;
    for (let k = 0; k < 400 && !got; k++) {
      const minMove = k < 300 ? 45 : 15;
      let x = room.x + o.r + 1 + rnd() * (room.w - 2 * o.r - 2), y = room.y + o.r + 1 + rnd() * (room.h - 2 * o.r - 2);
      if (/lamp|plant|basket|trash/.test(o.name) && rnd() < .5) {   // these like to sit against a wall
        const side = Math.floor(rnd() * 4);
        if (side === 0) y = room.y + o.r + 1; else if (side === 1) y = room.y + room.h - o.r - 1; else if (side === 2) x = room.x + o.r + 1; else x = room.x + room.w - o.r - 1;
      }
      const c = { t: 'c', x: Math.round(x), y: Math.round(y), r: o.r };
      if (ok(c, minMove, o)) got = c;
    }
    if (!got) return null;
    placed.push(got); m[i] = [got.x, got.y];
  }
  // the treat: same room, somewhere new, not jammed against anything
  const te = L.ents.find(e => e.k === 'treat'); let treat = null;
  if (te) {
    const room = roomOf(L, te.x, te.y);
    for (let k = 0; k < 600 && !treat; k++) {
      const c = { t: 'c', x: Math.round(room.x + 10 + rnd() * (room.w - 20)), y: Math.round(room.y + 10 + rnd() * (room.h - 20)), r: 7 };
      if (Math.hypot(c.x - te.x, c.y - te.y) < 60 || Math.hypot(c.x - L.start.x, c.y - L.start.y) < 80 || gap(c, goal) < 30) continue;
      if ([...fixed, ...placed].some(f => gap(c, f) < 10) || ents.some(e => gap(c, e) < 20)) continue;
      treat = [c.x, c.y];
    }
    if (!treat) return null;
  }
  return { m, treat };
}

function solve(level, cand, k) {
  const f = path.join(os.tmpdir(), `nala-cand-${level}-${k}.json`);
  fs.writeFileSync(f, JSON.stringify({ level: level + 1, ...cand }));
  return new Promise(res => {
    const p = spawn(process.execPath, [path.join(here, 'solve.mjs'), '--quick', '--trials=14', '--cand=' + f], { cwd: root });
    let out = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
    p.on('close', () => { const m = out.match(/RESULT (.*)/); res(m ? JSON.parse(m[1]) : { error: out.slice(-400) }); });
  });
}

const outFile = path.join(here, 'remix-out.json');
const all = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
for (let li = 0; li < LV.length; li++) {
  if (only.length && !only.includes(li)) continue;
  const L = LV[li], cands = [];
  for (let k = 0; cands.length < N && k < N * 20; k++) { const c = candidate(L); if (c) cands.push(c); }
  console.log(`== ${li + 1}. ${L.name}: ${cands.length} candidates`);
  const res = new Array(cands.length); let next = 0;
  await Promise.all([...Array(JOBS)].map(async () => { while (next < cands.length) { const k = next++; res[k] = await solve(li, cands[k], k); const r = res[k];
    console.log(`  #${k} ${r.error ? 'ERROR ' + r.error : `perfect ${r.perfect ? 'yes' : 'NO'} · map-knower ${(r.human * 100).toFixed(0)}% · treat ${(r.treat * 100).toFixed(0)}%`}`); } }));
  const good = cands.map((c, k) => ({ ...c, score: res[k] })).filter(c => !c.score.error && c.score.perfect > 0 && c.score.human >= MIN && c.score.treat >= MINT)
    .sort((a, b) => b.score.human - a.score.human).slice(0, KEEP);
  console.log(`  kept ${good.length}`);
  all[li] = good; fs.writeFileSync(outFile, JSON.stringify(all, null, 1));
  console.log(`  remix:${JSON.stringify(good.map(({ m, treat }) => ({ m, treat })))},`);
}
