// Headless solvability check for Nala's Bonk Golf.
// Runs the REAL game.js physics (in a Node vm with stubbed DOM) — no re-implementation to drift.
//
// Usage (from NalaGolf/):  node tools/solve.mjs [levelNumber…] [--trials=N] [--quick] [--remix=K] [--cand=FILE]
//   --remix=K   test the K-th baked remix layout of each level (what round K+1 plays)
//   --cand=FILE test one candidate layout {level, m, treat} (used by tools/remix.mjs); prints a RESULT json line
//
// For each level it reports:
//   • geodesic path length start → goal (and → treat)
//   • gaps that are passable but tighter than 3× Nala's diameter (26..78 px)
//   • "map-knower" solve rate: a player who has learned the map (by dying) picks the best of
//     ~400 shots each move, then executes it with human aim error (σ 5° angle, σ 10% power).
//     Success = reaches the goal within the 3 moves of one try (bonus moves count).
//   • the same with no aim error (is it solvable at all?) and with sloppy aim (σ 9°, 18%)
//   • treat reachable: same player, but heading for the treat within one try
//   • blind random: 3 random shots — how often you'd stumble in with no map knowledge
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '..');
const args = process.argv.slice(2);
const opt = k => { const a = args.find(a => a.startsWith('--' + k)); return a ? (a.split('=')[1] ?? true) : null; };
const QUICK = !!opt('quick'), TRIALS = +(opt('trials') || (QUICK ? 20 : 50));
const only = args.filter(a => /^\d+$/.test(a)).map(n => +n - 1);
const REMIX = +(opt('remix') || 0), CAND = opt('cand') ? JSON.parse(fs.readFileSync(opt('cand'), 'utf8')) : null;
if (CAND) { only.length = 0; only.push(CAND.level - 1); }
const PROG = (REMIX || CAND) ? JSON.stringify({ beat: CAND ? 1 : REMIX, lap: {} }) : null;

// ---------- load the game in a sandbox ----------
const stub = new Proxy(function () {}, {
  get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : stub,
  apply: () => stub, construct: () => stub, set: () => true,
});
const sandbox = {
  console, Math, JSON, Object, Array, Set, Map, Float32Array, Promise, Symbol,
  document: stub, location: { search: '' }, innerWidth: 390, innerHeight: 760, devicePixelRatio: 1,
  addEventListener() {}, requestAnimationFrame() {}, setTimeout() {}, performance: { now: () => 0 },
  localStorage: { getItem: k => k === 'nalaGolf.prog.v1' ? PROG : null, setItem() {}, removeItem() {} }, speechSynthesis: stub, navigator: {},
  sfx() {}, buzz() {}, ensureAudio() {}, shapePath() {}, render() {},
};
sandbox.window = sandbox;
const ctx = vm.createContext(sandbox);
for (const f of ['version.js', 'levels.js', 'game.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
vm.runInContext(`
function SIM_snap(){ return {dog:Object.assign({},dog), shotsLeft, o:objs.map(o=>[o.solid,o.down,o.used,o.gone,o.x,o.y,o.walk&&Object.assign({},o.walk)]), met:stellaMet}; }
function SIM_restore(s){
  dog=Object.assign({},s.dog); shotsLeft=s.shotsLeft; state='aim';
  objs.forEach((o,i)=>{ [o.solid,o.down,o.used,o.gone,o.x,o.y,o.walk]=s.o[i]; if(o.walk) o.walk=Object.assign({},o.walk); o.cd=0; o.glow=0; }); stellaMet=s.met;
  pings=[];words=[];parts=[];prints=[];banner=null;toast=null;hudFx=[];aim=null;
  rec={frames:[],events:[]}; stats={shots:0,bonks:0,knocked:[],by:{},treats:0,stella:0,binx:0};
}
function SIM_shot(ang,pow){
  shoot(Math.cos(ang),Math.sin(ang),pow); let n=0;
  while(state==='moving' && n<1500){ update(1/60); n++; }
  return {state, x:dog.x, y:dog.y, left:shotsLeft, treat:stats.treats>0, ev:rec.events.map(e=>e.k)};
}
function SIM_load(i){ loadLevel(i); state='aim'; }
`, ctx);
const run = s => vm.runInContext(s, ctx);
if (CAND) run(`LEVELS[${CAND.level - 1}].remix=[${JSON.stringify({ m: CAND.m, treat: CAND.treat })}]`);
const G = { W: 400, H: 700, R: run('DOG_R') };

// ---------- geodesic distance field (Dijkstra on a 4px grid) ----------
const CELL = 4, GW = Math.ceil(G.W / CELL), GH = Math.ceil(G.H / CELL);
function blockedAt(objs, x, y, r) {
  for (const o of objs) {
    if (o.ent) continue;
    if (o.t === 'r') { const cx = Math.max(o.x, Math.min(x, o.x + o.w)), cy = Math.max(o.y, Math.min(y, o.y + o.h)); if (Math.hypot(x - cx, y - cy) < r) return true; }
    else if (Math.hypot(x - o.x, y - o.y) < o.r + r) return true;
  }
  return false;
}
function field(objs, inTarget) {
  const free = new Uint8Array(GW * GH), dist = new Float64Array(GW * GH).fill(Infinity);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) free[j * GW + i] = blockedAt(objs, i * CELL + 2, j * CELL + 2, G.R - 1) ? 0 : 1;
  // binary heap
  const hp = [], push = (d, k) => { hp.push([d, k]); let i = hp.length - 1; while (i) { const p = (i - 1) >> 1; if (hp[p][0] <= hp[i][0]) break; [hp[p], hp[i]] = [hp[i], hp[p]]; i = p; } };
  const pop = () => { const top = hp[0], last = hp.pop(); if (hp.length) { hp[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < hp.length && hp[l][0] < hp[m][0]) m = l; if (r < hp.length && hp[r][0] < hp[m][0]) m = r; if (m === i) break; [hp[m], hp[i]] = [hp[i], hp[m]]; i = m; } } return top; };
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const k = j * GW + i; if (inTarget(i * CELL + 2, j * CELL + 2)) { dist[k] = 0; push(0, k); } }
  const nb = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (hp.length) { const [d, k] = pop(); if (d > dist[k]) continue; const i = k % GW, j = (k / GW) | 0;
    for (const [di, dj, c] of nb) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= GW || b >= GH) continue; const q = b * GW + a; if (!free[q]) continue; const nd = d + c * CELL; if (nd < dist[q]) { dist[q] = nd; push(nd, q); } } }
  return (x, y) => { const i0 = Math.round((x - 2) / CELL), j0 = Math.round((y - 2) / CELL); let m = Infinity;
    for (let r = 0; r < 4 && !isFinite(m); r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const i = i0 + di, j = j0 + dj; if (i >= 0 && j >= 0 && i < GW && j < GH) m = Math.min(m, dist[j * GW + i] + r * CELL); }
    return m; };
}

// ---------- gap check: passable but < 3× diameter ----------
function shapeGap(a, b) {
  if (a.t === 'c' && b.t === 'c') return Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
  if (a.t === 'c' || b.t === 'c') { const c = a.t === 'c' ? a : b, r = a.t === 'c' ? b : a; const cx = Math.max(r.x, Math.min(c.x, r.x + r.w)), cy = Math.max(r.y, Math.min(c.y, r.y + r.h)); return Math.hypot(c.x - cx, c.y - cy) - c.r; }
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)), dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h)); return Math.hypot(dx, dy);
}

// ---------- the map-knower policy ----------
const ANG = 80, POW = [.14, .22, .32, .44, .58, .74, .9, 1];
function scoreOf(dfn, r, p) {
  if (r.state === 'winning') return -1e6 + r.left * 10 - p;          // prefer wins that keep moves
  return dfn(r.x, r.y) - (r.state === 'fail' ? -1e5 : 140 * r.left); // closer (by walking distance) + moves in hand
}
// A player who knows the map: scan ~640 shots, then prefer the ones that still work when the aim is a bit off.
function bestShot(dfn, snap) {
  const cand = [], S = JSON.stringify(snap);
  for (let ai = 0; ai < ANG; ai++) for (const p of POW) {
    const a = ai / ANG * Math.PI * 2;
    run(`SIM_restore(${S})`);
    cand.push({ a, p, score: scoreOf(dfn, run(`SIM_shot(${a},${p})`), p) });
  }
  cand.sort((x, y) => x.score - y.score);
  let best = null;
  for (const c of cand.slice(0, 14)) {
    let tot = 0;
    for (let k = 0; k < 6; k++) {
      const a = c.a + gauss() * 4 * Math.PI / 180, p = Math.max(.08, Math.min(1, c.p * (1 + gauss() * .08)));
      run(`SIM_restore(${S})`); tot += Math.max(-1e6, Math.min(2e5, scoreOf(dfn, run(`SIM_shot(${a},${p})`), p)));
    }
    c.robust = tot / 6 + c.score * .25;
    if (!best || c.robust < best.robust) best = c;
  }
  return best;
}
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
function playTry(dfn, target, angSd, powSd) {
  run('SIM_load(LVL)');
  let snap = run('SIM_snap()'), shots = 0, hit = false;
  for (let k = 0; k < 8; k++) {
    const b = bestShot(dfn, snap);
    const a = b.a + gauss() * angSd * Math.PI / 180, p = Math.max(.08, Math.min(1, b.p * (1 + gauss() * powSd)));
    run(`SIM_restore(${JSON.stringify(snap)})`);
    const r = run(`SIM_shot(${a},${p})`); shots++;
    if (target === 'treat' ? r.treat : r.state === 'winning') { hit = true; break; }
    if (r.state !== 'aim') break;
    snap = run('SIM_snap()');
  }
  return { hit, shots };
}
function rate(dfn, target, angSd, powSd, n) {
  let ok = 0, shots = 0; for (let i = 0; i < n; i++) { const r = playTry(dfn, target, angSd, powSd); if (r.hit) { ok++; shots += r.shots; } }
  return { rate: ok / n, avgShots: ok ? shots / ok : 0 };
}
function blindRandom(n) {
  let ok = 0;
  for (let i = 0; i < n; i++) { run('SIM_load(LVL)'); for (let k = 0; k < 8; k++) { const r = run(`SIM_shot(${Math.random() * 6.2832},${.15 + Math.random() * .85})`); if (r.state === 'winning') { ok++; break; } if (r.state !== 'aim') break; } }
  return ok / n;
}

// ---------- run ----------
const nLv = run('LEVELS.length'), pct = x => (x * 100).toFixed(0) + '%';
const results = [];
for (let li = 0; li < nLv; li++) {
  if (only.length && !only.includes(li)) continue;
  run(`var LVL=${li}; SIM_load(LVL)`);
  const L = run('({name:L.name, start:L.start, goal:L.goal, ents:L.ents})'), objs = run('objs.filter(o=>o.sensor!=="toy").map(o=>({t:o.t,x:o.x,y:o.y,w:o.w,h:o.h,r:o.r,name:o.name,ent:o.ent,knock:!!o.knock}))');
  const g = L.goal, inGoal = (x, y) => g.t === 'r' ? Math.hypot(x - Math.max(g.x, Math.min(x, g.x + g.w)), y - Math.max(g.y, Math.min(y, g.y + g.h))) < G.R : Math.hypot(x - g.x, y - g.y) < g.r + G.R;
  const tr = objs.find(e => e.ent === 'treat');   // (from objs: a remix may have moved it)
  const dGoal = field(objs, inGoal), dTreat = tr ? field(objs, (x, y) => Math.hypot(x - tr.x, y - tr.y) < 7 + G.R) : null;
  console.log(`\n== ${li + 1}. ${L.name}${run('remix') ? ' (remix)' : ''} ==`);
  console.log(`path start→goal ${dGoal(L.start.x, L.start.y).toFixed(0)} px` + (tr ? ` · start→treat ${dTreat(L.start.x, L.start.y).toFixed(0)} px · treat→goal ${dGoal(tr.x, tr.y).toFixed(0)} px` : ''));
  for (const e of objs.filter(o => o.ent)) { const d = dGoal(e.x, e.y); if (!isFinite(d)) console.log(`  !! ${e.ent} at ${e.x},${e.y} is unreachable`); }
  // only gaps you can actually roll into: the midpoint between the two shapes must be open floor
  const furn = objs.filter(o => !o.ent && o.name !== 'squeaky toy'), tight = [];
  const near = (o, x, y) => o.t === 'r' ? [Math.max(o.x, Math.min(x, o.x + o.w)), Math.max(o.y, Math.min(y, o.y + o.h))] : (() => { const d = Math.hypot(x - o.x, y - o.y) || 1; return [o.x + (x - o.x) / d * o.r, o.y + (y - o.y) / d * o.r]; })();
  for (let i = 0; i < furn.length; i++) for (let j = i + 1; j < furn.length; j++) {
    const a = furn[i], b = furn[j], d = shapeGap(a, b); if (d < 2 * G.R || d >= 6 * G.R) continue;
    let pa = near(a, b.t === 'c' ? b.x : b.x + b.w / 2, b.t === 'c' ? b.y : b.y + b.h / 2), pb = near(b, pa[0], pa[1]); pa = near(a, pb[0], pb[1]);
    const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2;
    if (blockedAt(furn.filter(o => o !== a && o !== b), mx, my, 1) || mx < 20 || mx > 380 || my < 70 || my > 680) continue;
    tight.push(`${a.name}↔${b.name} ${d.toFixed(0)}px @${mx.toFixed(0)},${my.toFixed(0)}`);
  }
  console.log(tight.length ? `tight gaps (<78px): ${tight.join(', ')}` : 'tight gaps: none');
  const perfect = rate(dGoal, 'goal', 0, 0, 1);
  const human = rate(dGoal, 'goal', 5, .10, TRIALS);
  const sloppy = QUICK ? null : rate(dGoal, 'goal', 9, .18, Math.round(TRIALS / 2));
  const treat = tr ? rate(dTreat, 'treat', 5, .10, Math.round(TRIALS / 2)) : null;
  const blind = blindRandom(QUICK ? 600 : 3000);
  const row = { level: li + 1, name: L.name, perfect: perfect.rate ? `yes, ${perfect.avgShots} shots` : 'NO', human: pct(human.rate), humanShots: human.avgShots.toFixed(1), sloppy: sloppy ? pct(sloppy.rate) : '-', treat: treat ? pct(treat.rate) : '-', blind: pct(blind) };
  console.log(`no aim error: ${row.perfect} · map-knower (σ5°,10%): ${row.human} (avg ${row.humanShots} shots) · sloppy (σ9°,18%): ${row.sloppy} · treat in one try: ${row.treat} · blind random: ${row.blind}`);
  results.push(row);
  if (CAND) console.log('RESULT ' + JSON.stringify({ level: li + 1, perfect: perfect.rate, human: human.rate, treat: treat ? treat.rate : 1, blind }));
}
console.log('\n| # | Level | No aim error | Map-knower σ5° | Sloppy σ9° | Treat reachable | Blind random |\n|---|---|---|---|---|---|---|');
for (const r of results) console.log(`| ${r.level} | ${r.name} | ${r.perfect} | ${r.human} (${r.humanShots} shots) | ${r.sloppy} | ${r.treat} | ${r.blind} |`);
