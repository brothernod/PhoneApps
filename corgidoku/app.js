import { decodeRegions, decodeSolution, grade } from './engine.js';
import { cheddarHead, cheddarLoaf, partyHat, paw, treat } from './art.js';

// ---------- constants ----------
const NAME = 'Halina';
const VERSION = '1.5'; // bump with CACHE in sw.js on every release
const YARD_COLORS = ['#FFA8D2', '#C9AEFF', '#93D7FF', '#93F0C8', '#FFE77A', '#FFBE8F', '#FF9C9C', '#EFB2F7', '#86E6EA', '#CDF78A'];
const HOLD_COLORS = ['#FF5FA8', '#FF9F45', '#FFC93C', '#3FD98B', '#46B3FF', '#9B6BFF'];
const EMPTY = 0, PAW = 1, AUTO = 2, CORGI = 3, NOPE = 4; // NOPE = a wrong guess, shown as a red paw
const STORE = 'corgidoku:v1';

// ---------- storage ----------
const defaults = { progress: {}, settings: { autoPaws: true, relaxed: false, timer: true, mode: 'cozy' }, seenHelp: false };
let db;
try { db = { ...defaults, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch { db = structuredClone(defaults); }
db.settings = { ...defaults.settings, ...db.settings };
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(db)); } catch {} };

// ---------- dates ----------
const pad = (x) => String(x).padStart(2, '0');
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const addDays = (iso, k) => new Date(Date.parse(iso + 'T00:00:00Z') + k * 864e5).toISOString().slice(0, 10);
const pretty = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const clock = (s) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;

// ---------- puzzles ----------
// Modes. Each has its own puzzle file, ids, streak and climb. Add 'extreme' here later.
const MODES = {
  cozy: { file: 'puzzles.json', d: 'd', c: 'c', label: '🌈 Cozy', climb: 'The Climb' },
  hard: { file: 'puzzles-hard.json', d: 'hd', c: 'hc', label: '🔥 Hard', climb: 'The Hard Climb' },
};
const DATA = {};
let PUZ;
let daily = new Map();
const mode = () => (MODES[db.settings.mode] ? db.settings.mode : 'cozy');
const D = (k) => `${MODES[mode()].d}:${k}`;
const C = (k) => `${MODES[mode()].c}:${k}`;
function useMode(m) {
  db.settings.mode = m; save();
  PUZ = DATA[m];
  daily = new Map(PUZ.daily.map((p) => [p.date, p]));
}
const levelName = (p) => (mode() === 'hard' ? (p.lv >= 5 ? 'very hard' : 'hard') : p.g);
function dailyFor(iso) {
  if (daily.has(iso)) return daily.get(iso);
  // Past the end of the file: wrap around so there's always a puzzle.
  const first = PUZ.daily[0].date;
  const idx = Math.round((Date.parse(iso) - Date.parse(first)) / 864e5);
  const len = PUZ.daily.length;
  return { ...PUZ.daily[((idx % len) + len) % len], date: iso };
}
function load(pid) {
  const [pre, key] = pid.split(':');
  const kind = pre.endsWith('d') ? 'd' : 'c';
  const p = kind === 'd' ? dailyFor(key) : PUZ.campaign[Number(key) - 1];
  return { pid, kind, key, n: p.n, reg: decodeRegions(p.r), sol: decodeSolution(p.s), grade: p.g };
}

// ---------- special days ----------
function specialBanner(iso) {
  if (iso === '2026-11-11') return `Thinking of you today, ${NAME} 💗<small>Cheddar is keeping your spot warm. Easy puzzles all week while you rest.</small>`;
  if (iso > '2026-11-11' && iso <= '2026-11-17') return `Cozy rainbow week 🌈<small>Easy, gentle puzzles while you rest up. Cheddar approves.</small>`;
  if (iso.slice(5) === '06-15') return `Happy Birthday, ${NAME}! 🎂🌈<small>Cheddar made you a special puzzle today.</small>`;
  return '';
}

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const show = (id) => { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id)); };
const prog = (pid) => db.progress[pid] || null;

function streak() {
  let s = 0, d = todayISO();
  if (!prog(D(d))?.solved) d = addDays(d, -1);
  while (prog(D(d))?.solved) { s++; d = addDays(d, -1); }
  return s;
}
const solvedCount = () => Object.entries(db.progress).filter(([k, p]) => p.solved && [MODES[mode()].d, MODES[mode()].c].includes(k.split(':')[0])).length;
const climbLevel = () => { let i = 1; while (i <= PUZ.campaign.length && prog(C(i))?.solved) i++; return i; };

// ---------- home ----------
function renderHome() {
  const t = todayISO();
  const p = prog(D(t));
  const dp = dailyFor(t);
  const lvl = climbLevel();
  const banner = specialBanner(t);
  const birthday = t.slice(5) === '06-15';
  $('home').innerHTML = `
    <div class="title">Corgidoku</div>
    <div class="subtitle">Cheddar's puzzle yard for ${NAME}</div>
    <div class="modes">${Object.entries(MODES).map(([k, v]) => `<button class="mode${k === mode() ? ' on' : ''}" data-m="${k}">${v.label}</button>`).join('')}</div>
    <div class="hero">${cheddarLoaf({ hat: birthday ? partyHat : '' })}</div>
    ${banner ? `<div class="banner">${banner}</div>` : ''}
    <div class="menu">
      <button class="big" id="go-daily"><div class="ico" style="background:#FFE0F0">☀️</div>
        <div><b>Today's puzzle</b><span>${pretty(t)} · ${dp.n}×${dp.n} · ${p?.solved ? `solved in ${clock(p.best)} ✓` : p ? 'in progress' : levelName(dp)}</span></div></button>
      <button class="big" id="go-climb"><div class="ico" style="background:#E6DDFF">🧗‍♀️</div>
        <div><b>${MODES[mode()].climb}</b><span>${lvl > PUZ.campaign.length ? 'Summit reached! 🏔️' : `Hold ${lvl} of ${PUZ.campaign.length}`}</span></div></button>
    </div>
    <div class="stats">
      <div class="stat"><b>${streak()}</b><span>Day streak</span></div>
      <div class="stat"><b>${solvedCount()}</b><span>Solved</span></div>
    </div>
    <div class="row">
      <button class="pill" id="go-past">📅 Past days</button>
      <button class="pill" id="go-help">❓ How to play</button>
      <button class="pill" id="go-set">⚙️</button>
    </div>
    <button class="ver" id="ver">v${VERSION}</button>`;
  $('go-daily').onclick = () => play(D(t));
  $('go-climb').onclick = renderClimb;
  $('go-past').onclick = renderPast;
  $('go-help').onclick = help;
  $('go-set').onclick = settings;
  document.querySelectorAll('.mode').forEach((b) => (b.onclick = () => { if (b.dataset.m !== mode()) { useMode(b.dataset.m); renderHome(); } }));
  // Tap the version to drop any cached copy and reload fresh.
  $('ver').onclick = async () => {
    $('ver').textContent = 'refreshing…';
    try { for (const k of await caches.keys()) await caches.delete(k); } catch {}
    location.reload();
  };
  show('home');
}

// ---------- past days ----------
function renderPast() {
  const t = todayISO();
  const first = PUZ.daily[0].date;
  const items = [];
  for (let d = t, k = 0; d >= first && k < 45; d = addDays(d, -1), k++) {
    const p = prog(D(d)), dp = dailyFor(d);
    items.push(`<button class="item" data-pid="${D(d)}">${d === t ? 'Today' : pretty(d)}<span>${dp.n}×${dp.n} ${p?.solved ? '✓ ' + clock(p.best) : p ? '…' : ''}</span></button>`);
  }
  $('past').innerHTML = `<div class="bar"><button class="back">‹</button><h2>Past days</h2><span class="ghost"></span></div><div class="list">${items.join('')}</div>`;
  $('past').querySelector('.back').onclick = renderHome;
  $('past').querySelectorAll('[data-pid]').forEach((b) => (b.onclick = () => play(b.dataset.pid)));
  show('past');
}

// ---------- the climb ----------
function renderClimb() {
  const total = PUZ.campaign.length, lvl = climbLevel();
  const step = 78, h = total * step + 40;
  const pos = (i) => ({ top: h - (i * step), left: i % 2 ? 62 : 22 + (i % 4 === 0 ? 8 : 0) }); // % of width for left
  let holds = '';
  for (let i = 1; i <= total; i++) {
    const p = pos(i);
    const cls = prog(C(i))?.solved ? 'solved' : i > lvl ? 'locked' : '';
    const n = PUZ.campaign[i - 1].n;
    holds += `<button class="hold ${cls}" data-i="${i}" style="top:${p.top}px;left:${p.left}%;background:${HOLD_COLORS[(i - 1) % HOLD_COLORS.length]}">${i}<small style="position:absolute;bottom:-16px;font-size:11px;color:var(--ink-soft);text-shadow:none">${n}×${n}</small></button>`;
  }
  const cp = pos(Math.min(lvl, total));
  $('climb').innerHTML = `
    <div class="bar"><button class="back">‹</button><h2>${MODES[mode()].climb}</h2><span class="ghost"></span></div>
    <div class="summit">🏔️ Rainbow Summit</div>
    <div class="wall" style="height:${h + 40}px"><div class="rope"></div>${holds}
      <div class="climber" style="top:${cp.top - 46}px;left:calc(${cp.left}% + 2px)">${cheddarHead()}</div></div>
    <div class="summit">Base camp</div>`;
  $('climb').querySelector('.back').onclick = renderHome;
  $('climb').querySelectorAll('.hold').forEach((b) => {
    b.onclick = () => { const i = Number(b.dataset.i); if (i <= lvl) play(C(i)); else sheet(`<h3>Not yet!</h3><p>Finish hold ${lvl} first, then Cheddar will climb higher.</p><button class="cta" id="okl">OK</button>`), ($('okl').onclick = closeSheet); };
  });
  show('climb');
  requestAnimationFrame(() => { $('climb').scrollTop = Math.max(0, cp.top - window.innerHeight / 2 + 120); });
}

// ---------- play ----------
let G = null; // current game
let tick = null;

function play(pid) {
  const P = load(pid);
  const saved = prog(pid);
  G = {
    ...P,
    cells: saved?.cells ? [...saved.cells].map(Number) : new Array(P.n * P.n).fill(EMPTY),
    treats: saved?.treats ?? 3,
    elapsed: saved?.elapsed ?? 0,
    solved: !!saved?.solved,
    best: saved?.best,
    history: [],
  };
  if (G.solved) { G.cells = G.cells.map((v, i) => (G.sol[Math.floor(i / G.n)] === i % G.n ? CORGI : v === CORGI ? EMPTY : v)); }
  const title = P.kind === 'd' ? (P.key === todayISO() ? "Today's puzzle" : pretty(P.key)) : `Hold ${P.key}`;
  $('play').innerHTML = `
    <div class="bar"><button class="back">‹</button><h2>${title}</h2><button class="back" id="restart" title="Start over">↺</button></div>
    <div class="meta"><div class="treats" id="treats"></div><div id="clock"></div></div>
    <div class="board" id="board" style="--n:${P.n}"></div>
    <div class="bubble"><div class="face">${cheddarHead()}</div><p id="msg"></p></div>
    <div class="tools">
      <button class="tool" id="undo"><span class="e">↩️</span>Undo</button>
      <button class="tool" id="hint"><span class="e">👃</span>Sniff</button>
      <button class="tool" id="clearpaws"><span class="e">🧽</span>Clear paws</button>
    </div>`;
  $('play').querySelector('.back').onclick = () => { stopClock(); P.kind === 'c' ? renderClimb() : renderHome(); };
  $('restart').onclick = () => confirmSheet('Start this puzzle over?', 'Your corgis and paw marks will be cleared.', () => { snapshot(); G.cells.fill(EMPTY); G.treats = 3; G.solved = false; persist(); drawBoard(); drawTreats(); say(''); startClock(); });
  $('undo').onclick = undo;
  $('hint').onclick = hint;
  $('clearpaws').onclick = () => { snapshot(); G.cells = G.cells.map((v) => (v === CORGI || v === NOPE ? v : EMPTY)); persist(); drawBoard(); };
  buildBoard();
  drawTreats();
  say(G.solved ? `You solved this one in ${clock(G.best)}! 🎉` : greeting());
  show('play');
  if (!G.solved) startClock(); else drawClock();
  if (!db.seenHelp) help();
}

function greeting() {
  const lines = ['Find a cozy spot for every corgi!', 'One corgi per row, column and yard. No touching!', 'Tap for a paw mark, double-tap for a corgi.', 'Cheddar believes in you! 🧡'];
  return lines[Math.floor(Math.random() * lines.length)];
}

function buildBoard() {
  const { n, reg } = G;
  const b = $('board');
  b.innerHTML = '';
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n), c = i % n, k = reg[i];
    const d = document.createElement('div');
    d.className = 'cell';
    if (r === 0 || reg[i - n] !== k) d.classList.add('bt');
    if (r === n - 1 || reg[i + n] !== k) d.classList.add('bb');
    if (c === 0 || reg[i - 1] !== k) d.classList.add('bl');
    if (c === n - 1 || reg[i + 1] !== k) d.classList.add('br');
    d.style.background = YARD_COLORS[k];
    d.dataset.i = i;
    b.appendChild(d);
  }
  attachInput(b);
  drawBoard();
}

function drawBoard() {
  const cells = $('board').children;
  for (let i = 0; i < cells.length; i++) {
    const v = G.cells[i], el = cells[i];
    const want = v === CORGI ? 'c' : v === PAW ? 'p' : v === AUTO ? 'a' : v === NOPE ? 'n' : '';
    if (el.dataset.v === want) continue;
    el.dataset.v = want;
    el.classList.toggle('nope', v === NOPE);
    el.innerHTML = v === CORGI ? cheddarHead() : v === PAW || v === NOPE ? paw(false) : v === AUTO ? paw(true) : '';
  }
}

function drawTreats(justLost = false) {
  $('treats').innerHTML = db.settings.relaxed ? '<span>🌈 Relaxed</span>' : [0, 1, 2].map((i) => treat(i < G.treats)).join('');
  if (justLost) $('treats').children[G.treats]?.classList.add('lost');
}

function drawClock() { $('clock').textContent = db.settings.timer ? '⏱ ' + clock(G.solved ? G.best : G.elapsed) : ''; }
function startClock() {
  stopClock();
  let last = performance.now();
  tick = setInterval(() => {
    const now = performance.now();
    if (!document.hidden) G.elapsed += (now - last) / 1000;
    last = now;
    drawClock();
    if (Math.round(G.elapsed) % 5 === 0) persist();
  }, 500);
  drawClock();
}
function stopClock() { if (tick) clearInterval(tick); tick = null; if (G && !G.solved) persist(); }

function persist() {
  db.progress[G.pid] = { cells: G.cells.join(''), treats: G.treats, elapsed: Math.round(G.elapsed), solved: G.solved, best: G.best };
  save();
}
function snapshot() { G.history.push({ cells: G.cells.slice(), treats: G.treats }); if (G.history.length > 200) G.history.shift(); }
function undo() {
  if (G.solved) return;
  const h = G.history.pop();
  if (!h) return say('Nothing to undo yet!');
  G.cells = h.cells; // treats stay eaten
  persist(); drawBoard();
}

// ---------- input: tap to cycle, drag to paint paws ----------
function attachInput(board) {
  let start = null, dragging = false, painted = new Set();
  const cellAt = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cell');
    return el && board.contains(el) ? Number(el.dataset.i) : null;
  };
  board.onpointerdown = (e) => {
    if (G.solved) return;
    start = cellAt(e); dragging = false; painted = new Set();
    board.setPointerCapture(e.pointerId);
  };
  board.onpointermove = (e) => {
    if (start === null) return;
    const i = cellAt(e);
    if (i === null) return;
    if (!dragging && i !== start) {
      dragging = true; snapshot();
      if (G.cells[start] === EMPTY || G.cells[start] === AUTO) { G.cells[start] = PAW; painted.add(start); }
    }
    if (dragging && !painted.has(i) && (G.cells[i] === EMPTY || G.cells[i] === AUTO)) { G.cells[i] = PAW; painted.add(i); drawBoard(); }
  };
  board.onpointerup = (e) => {
    if (start === null) return;
    if (dragging) { persist(); drawBoard(); }
    else if (cellAt(e) === start) tap(start);
    start = null; dragging = false;
  };
  board.onpointercancel = () => { start = null; dragging = false; };
}

// Single tap toggles a paw (or lifts a corgi). A quick second tap on the same cell
// undoes that first tap and guesses a corgi instead.
let lastTap = { i: -1, t: 0 };
function tap(i) {
  const now = performance.now();
  const quick = lastTap.i === i && now - lastTap.t < 380;
  lastTap = quick ? { i: -1, t: 0 } : { i, t: now };
  if (G.cells[i] === NOPE && !quick) { lastTap = { i: -1, t: 0 }; return say('Cheddar already sniffed here: no corgi in this spot.', true); }
  if (quick) {
    const h = G.history.pop();
    if (h) G.cells = h.cells;
    if (G.cells[i] === CORGI) { persist(); drawBoard(); return; }
    if (G.cells[i] === NOPE) return say('Cheddar already sniffed here: no corgi in this spot.', true);
    snapshot();
    placeCorgi(i);
    return;
  }
  snapshot();
  G.cells[i] = G.cells[i] === EMPTY || G.cells[i] === AUTO ? PAW : EMPTY;
  persist(); drawBoard();
}

function peers(i) {
  const { n, reg } = G;
  const r = Math.floor(i / n), c = i % n, out = [];
  for (let j = 0; j < n * n; j++) {
    if (j === i) continue;
    const rr = Math.floor(j / n), cc = j % n;
    if (rr === r || cc === c || reg[j] === reg[i] || (Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1)) out.push(j);
  }
  return out;
}

function placeCorgi(i) {
  const { n, sol, reg } = G;
  const r = Math.floor(i / n), c = i % n;
  if (sol[r] !== c) {
    // Explain with a visible rule if one applies.
    const clash = peers(i).find((j) => G.cells[j] === CORGI);
    let why = 'No corgi belongs here. Cheddar marked it with a red paw.';
    if (clash !== undefined) {
      const rr = Math.floor(clash / n), cc = clash % n;
      why = rr === r ? 'Two corgis in one row? Too crowded!' : cc === c ? 'Two corgis in one column? Too crowded!'
        : reg[clash] === reg[i] ? 'That yard already has a corgi!' : 'Corgis need personal space, even diagonally!';
    }
    G.cells[i] = NOPE;
    if (!db.settings.relaxed) { G.treats--; drawTreats(true); }
    persist();
    // Show the corgi shaking on the spot, then swap it for the red paw.
    const el = $('board').children[i];
    el.dataset.v = 'c';
    el.innerHTML = cheddarHead();
    el.classList.remove('wrong'); void el.offsetWidth; el.classList.add('wrong');
    setTimeout(() => { el.classList.remove('wrong'); drawBoard(); }, 650);
    if (navigator.vibrate) navigator.vibrate(60);
    say(why + (db.settings.relaxed ? '' : G.treats > 0 ? ` ${G.treats} treat${G.treats === 1 ? '' : 's'} left.` : ''), true);
    if (!db.settings.relaxed && G.treats <= 0) outOfTreats();
    return;
  }
  G.cells[i] = CORGI;
  if (db.settings.autoPaws) for (const j of peers(i)) if (G.cells[j] === EMPTY) G.cells[j] = AUTO;
  persist(); drawBoard();
  const placed = G.cells.filter((v) => v === CORGI).length;
  if (placed === n) win();
  else if (placed === n - 1) say('One more corgi to go!');
  else say('');
}

function outOfTreats() {
  stopClock();
  sheet(`<div style="width:120px;margin:0 auto">${cheddarLoaf()}</div><h3>Snack break!</h3>
    <p>Cheddar ate all the treats. Want to try this puzzle again from the start?</p>
    <button class="cta" id="again">Try again</button><button class="cta alt" id="home2">Home</button>`);
  $('again').onclick = () => { closeSheet(); G.cells.fill(EMPTY); G.treats = 3; G.history = []; persist(); drawBoard(); drawTreats(); say('Fresh start! You\'ve got this.'); startClock(); };
  $('home2').onclick = () => { closeSheet(); G.treats = 3; G.cells.fill(EMPTY); persist(); renderHome(); };
}

function hint() {
  if (G.solved) return;
  const { n, sol } = G;
  // Clear any wrong paw marks on solution cells first: that's the kindest hint.
  const badPaw = G.cells.findIndex((v, i) => v === PAW && sol[Math.floor(i / n)] === i % n);
  const given = [];
  G.cells.forEach((v, i) => { if (v === CORGI) given.push(i); });
  const g = grade(n, G.reg, { given });
  const next = g.log.find((s) => s.type === 'place' && s.level > 0);
  let target = next ? next.cells[0] : sol.map((c, r) => r * n + c).find((i) => G.cells[i] !== CORGI);
  let why = next ? `Sniff sniff… ${next.why}.` : 'Sniff sniff… try this spot!';
  if (badPaw >= 0 && badPaw !== target && Math.random() < 0.5) { target = badPaw; why = 'Hmm, one of your paw marks is on a corgi spot. Look here!'; }
  const el = $('board').children[target];
  el.classList.add('glow');
  setTimeout(() => el.classList.remove('glow'), 3500);
  say(why);
}

function win() {
  G.solved = true;
  G.best = G.best ? Math.min(G.best, G.elapsed) : G.elapsed;
  stopClock(); persist(); drawClock();
  // Clear paws so the finished board shows just the corgis.
  G.cells = G.cells.map((v) => (v === CORGI ? v : EMPTY)); drawBoard();
  [...$('board').children].forEach((el) => el.classList.add('done'));
  celebrate();
  const isClimb = G.kind === 'c', nextLvl = Number(G.key) + 1;
  const hasNext = isClimb && nextLvl <= PUZ.campaign.length;
  setTimeout(() => {
    sheet(`<div style="width:150px;margin:0 auto">${cheddarLoaf()}</div><h3>Pawsome! 🎉</h3>
      <p>Solved in <b>${clock(G.elapsed)}</b>${G.kind === 'd' ? ` · streak <b>${streak()}</b> 🔥` : ''}</p>
      <p>${winLine()}</p>
      ${hasNext ? '<button class="cta" id="next">Next hold 🧗‍♀️</button>' : ''}
      <button class="cta ${hasNext ? 'alt' : ''}" id="home3">Home</button>`);
    if (hasNext) $('next').onclick = () => { closeSheet(); play(C(nextLvl)); };
    $('home3').onclick = () => { closeSheet(); renderHome(); };
  }, 1700);
}

function winLine() {
  const t = todayISO();
  if (t.slice(5) === '06-15') return `Happy birthday, ${NAME}! Cheddar did birthday zoomies just for you.`;
  if (t >= '2026-11-11' && t <= '2026-11-17') return 'Rest up! Cheddar says you\'re doing amazing.';
  const lines = ['Cheddar is doing zoomies!', 'Every corgi found a cozy spot.', 'Big brain, tiny legs. Well done!', 'That\'s worth a belly rub.', 'Cheddar is so proud of you!'];
  return lines[Math.floor(Math.random() * lines.length)];
}

function celebrate() {
  const z = document.createElement('div');
  z.className = 'zoom';
  z.innerHTML = cheddarHead();
  document.body.appendChild(z);
  setTimeout(() => z.remove(), 2400);
  const emoji = ['💖', '🌈', '💜', '🧡', '✨', '🩷', '💛'];
  for (let k = 0; k < 28; k++) {
    const h = document.createElement('div');
    h.className = 'heart';
    h.textContent = emoji[k % emoji.length];
    h.style.left = Math.random() * 100 + 'vw';
    h.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
    h.style.animationDelay = Math.random() * 0.6 + 's';
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 4500);
  }
}

// ---------- messages & sheets ----------
let msgTimer = null;
function say(text, alert = false) {
  const m = $('msg');
  if (!m) return;
  m.textContent = text;
  m.classList.toggle('alert', alert);
  clearTimeout(msgTimer);
  // Alerts stay until the next message; friendly chatter fades.
  if (text && !alert) msgTimer = setTimeout(() => { if (m.textContent === text && !G?.solved) m.textContent = ''; }, 6000);
}
function sheet(html) { $('sheet').innerHTML = html; $('overlay').classList.add('on'); }
function closeSheet() { $('overlay').classList.remove('on'); }
$('overlay').onclick = (e) => { if (e.target.id === 'overlay') closeSheet(); };

function confirmSheet(title, body, ok) {
  sheet(`<h3>${title}</h3><p>${body}</p><button class="cta" id="ok">Yes</button><button class="cta alt" id="no">Cancel</button>`);
  $('ok').onclick = () => { closeSheet(); ok(); };
  $('no').onclick = closeSheet;
}

function help() {
  sheet(`<div style="width:110px;margin:0 auto">${cheddarLoaf()}</div><h3>How to play</h3>
    <p>Give every corgi a cozy spot:</p>
    <ol>
      <li>One corgi in every <b>row</b></li>
      <li>One corgi in every <b>column</b></li>
      <li>One corgi in every <b>colored yard</b></li>
      <li>Corgis never touch, <b>not even diagonally</b></li>
    </ol>
    <p>Tap for a 🐾 paw mark (“no corgi here”); tap it again to remove it. <b>Double-tap</b> to place a corgi. Drag across cells to paw-mark lots at once.</p>
    <p>Want more challenge? Switch to <b>🔥 Hard</b> on the home screen.</p>
    <p>A wrong corgi costs a treat. Stuck? Tap <b>Sniff</b> and Cheddar will help.</p>
    <button class="cta" id="gotit">Let's go!</button>`);
  $('gotit').onclick = () => { db.seenHelp = true; save(); closeSheet(); };
}

function settings() {
  const s = db.settings;
  sheet(`<h3>Settings</h3>
    <label class="toggle"><div>Auto paw marks<small>Mark spots a new corgi rules out</small></div><input type="checkbox" id="s-auto" ${s.autoPaws ? 'checked' : ''}></label>
    <label class="toggle"><div>Relaxed mode<small>Mistakes never cost treats</small></div><input type="checkbox" id="s-relax" ${s.relaxed ? 'checked' : ''}></label>
    <label class="toggle"><div>Show timer</div><input type="checkbox" id="s-timer" ${s.timer ? 'checked' : ''}></label>
    <button class="cta" id="s-done">Done</button>`);
  $('s-done').onclick = () => {
    s.autoPaws = $('s-auto').checked; s.relaxed = $('s-relax').checked; s.timer = $('s-timer').checked;
    save(); closeSheet();
  };
}

// ---------- boot ----------
Promise.all(Object.entries(MODES).map(([k, m]) => fetch(m.file).then((r) => r.json()).then((d) => { DATA[k] = d; })))
  .then(() => { useMode(mode()); renderHome(); })
  .catch(() => { $('home').innerHTML = '<p style="margin-top:40vh;font-weight:800">Cheddar couldn\'t find the puzzles. Check your connection and reopen.</p>'; });

document.addEventListener('visibilitychange', () => { if (document.hidden && G && !G.solved && $('play').classList.contains('on')) persist(); });
