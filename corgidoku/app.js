import { decodeRegions, decodeSolution, grade } from './engine.js';
import { cheddarHead, cheddarLoaf, partyHat, paw, treat, artDefs, coinIcon, closetIcon } from './art.js';
import { ITEMS, SLOTS, item, outfit, priceFor, shopDefaults, payout, backPay, buy } from './shop.js';

// ---------- constants ----------
const NAME = 'Halina'; // the Default player's name until they set their own in Settings
const VERSION = '1.14'; // bump with CACHE in sw.js on every release
const YARD_COLORS = ['#FFA8D2', '#C9AEFF', '#93D7FF', '#93F0C8', '#FFE77A', '#FFBE8F', '#FF9C9C', '#EFB2F7', '#86E6EA', '#CDF78A'];
const HOLD_COLORS = ['#FF5FA8', '#FF9F45', '#FFC93C', '#3FD98B', '#46B3FF', '#9B6BFF'];
const EMPTY = 0, PAW = 1, AUTO = 2, CORGI = 3, NOPE = 4; // NOPE = a wrong guess, shown as a red paw
// Brainstorm paw colors. Index 0 is the normal paw (PAW); 1-4 are stored as cell values 5-8.
const PAW_COLORS = [null, '#1F5FE0', '#13924A', '#F07C00', '#B0179A'];
const PAW_NAMES = ['plum', 'blue', 'green', 'orange', 'magenta'];
const isPaw = (v) => v === PAW || v >= 5;
const pawValue = () => (db.settings.pawColor ? 4 + db.settings.pawColor : PAW);

// ---------- players ----------
// Everyone sharing the phone gets their own progress, streak and settings.
// The default player keeps the original storage key so nothing already saved is lost.
const PLAYERS = {
  main: { name: NAME, label: '🌈 Default', key: 'corgidoku:v1' },
  holden: { name: 'Holden', label: '⭐ Holden', key: 'corgidoku:v1:holden', kid: true, color: '#46B3FF' },
  quentin: { name: 'Quentin', label: '🐙 Quentin', key: 'corgidoku:v1:quentin', kid: true, color: '#2FC27F' },
};
const PLAYER_KEY = 'corgidoku:player';
let player = 'main';
try { const p = localStorage.getItem(PLAYER_KEY); if (PLAYERS[p]) player = p; } catch {}
const me = () => PLAYERS[player];
const isKid = () => !!me().kid;
// Shown name: kids have fixed names; the Default player can set theirs in Settings.
const nm = () => (isKid() ? me().name : (db.settings.name || '').trim() || NAME);
// Coin amounts with the corgi coin icon in front, e.g. coin(245).
const coin = (n) => `${coinIcon()}&#8239;${n}`;
// Cheddar in what the player has on (the Closet passes a preview look instead).
const dressed = (worn = db.worn) => outfit(worn);
// The equipped hat, for board corgis (when dressed up) and the win party.
const hatArt = () => item(db.worn.head)?.art || '';
const boardHead = () => cheddarHead(db.settings.dressBoard ? { head: hatArt() } : {});
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------- storage ----------
const defaults = { progress: {}, settings: { autoPaws: true, relaxed: false, timer: true, mode: 'cozy', research: false, pawColor: 0, easyTap: false, dressBoard: false }, seenHelp: false };
// Kids start in Chill, with no treat penalty, no clock, the forgiving double-tap and dressed-up board corgis.
const kidDefaults = { mode: 'kids', relaxed: true, timer: false, easyTap: true, dressBoard: true };
let db;
function loadDb() {
  const base = structuredClone(defaults);
  if (isKid()) Object.assign(base.settings, kidDefaults);
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(me().key) || '{}') || {}; } catch {}
  db = { ...base, ...saved };
  db.settings = { ...base.settings, ...saved.settings };
  // Shop fields are additive. The first launch with the shop pays for puzzles already solved.
  shopDefaults(db);
  const bp = backPay(db, isKid());
  if (bp) { welcome = bp; try { localStorage.setItem(me().key, JSON.stringify(db)); } catch {} }
}
let welcome = null; // back pay result waiting for its one-time "Welcome to the closet" sheet
loadDb();
const save = () => { try { localStorage.setItem(me().key, JSON.stringify(db)); } catch {} };
// Double-tap timing: kids get a longer window and a little finger wiggle room.
const tapWindow = () => (db.settings.easyTap ? 560 : 380);
const tapSlop = () => (db.settings.easyTap ? 16 : 0); // px of movement still counted as a tap

// ---------- dates ----------
const pad = (x) => String(x).padStart(2, '0');
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const addDays = (iso, k) => new Date(Date.parse(iso + 'T00:00:00Z') + k * 864e5).toISOString().slice(0, 10);
const pretty = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const clock = (s) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;

// ---------- puzzles ----------
// Modes. Each has its own puzzle file, ids, streak and climb.
// kids: only the kids see it. grownup: the kids don't.
const MODES = {
  kids: { file: 'puzzles-kids.json', d: 'kd', c: 'kc', label: '🐣 Chill', climb: 'The Chill Climb', kids: true },
  cozy: { file: 'puzzles.json', d: 'd', c: 'c', label: '🌈 Cozy', climb: 'The Climb' },
  hard: { file: 'puzzles-hard.json', d: 'hd', c: 'hc', label: '🔥 Hard', climb: 'The Hard Climb' },
  extreme: { file: 'puzzles-extreme.json', d: 'xd', c: 'xc', label: '⚡ Extreme', climb: 'The Extreme Climb', grownup: true },
};
const DATA = {};
let PUZ;
let daily = new Map();
// Chill only shows up for the kids and Extreme only for grown-ups; everyone can pick Cozy or Hard.
const modesFor = () => Object.keys(MODES).filter((k) => (!MODES[k].kids || isKid()) && (!MODES[k].grownup || !isKid()));
const mode = () => (modesFor().includes(db.settings.mode) ? db.settings.mode : isKid() ? 'kids' : 'cozy');
const D = (k) => `${MODES[mode()].d}:${k}`;
const C = (k) => `${MODES[mode()].c}:${k}`;
function useMode(m) {
  db.settings.mode = m; save();
  PUZ = DATA[m];
  daily = new Map(PUZ.daily.map((p) => [p.date, p]));
}
// Extreme: chain score = what-if chains + 3 x (longest chain - 1), same tiers as tools/generate.mjs.
const chainScore = (p) => (p.ch || 0) + 3 * ((p.cd || 1) - 1);
const extremeName = (p) => { if (p.lv < 6) return 'very hard'; const sc = chainScore(p); return sc <= 5 ? 'extreme' : sc <= 11 ? 'brutal' : 'legendary'; };
const levelName = (p) => (mode() === 'extreme' ? extremeName(p) : mode() === 'hard' ? (p.lv >= 5 ? 'very hard' : 'hard') : mode() === 'kids' ? (p.lv >= 3 ? 'a bit tricky' : 'chill') : p.g);
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
  if (isKid()) return ''; // these messages are for Halina
  // Only Cozy goes easy during recovery week, so Hard and Extreme just point there.
  const cozy = mode() === 'cozy';
  if (iso === '2026-11-11') return `Thinking of you today, ${esc(nm())} 💗<small>Cheddar is keeping your spot warm. ${cozy ? 'Easy puzzles all week while you rest.' : 'Cozy has easy puzzles all week if you want a gentle one.'}</small>`;
  if (iso > '2026-11-11' && iso <= '2026-11-17') return `Cozy rainbow week 🌈<small>${cozy ? 'Easy, gentle puzzles while you rest up.' : 'Cozy is extra gentle this week if you want an easy one.'} Cheddar approves.</small>`;
  if (iso.slice(5) === '06-15') return `Happy Birthday, ${esc(nm())}! 🎂🌈<small>Cheddar made you a special puzzle today.</small>`;
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
  const birthday = !isKid() && t.slice(5) === '06-15';
  const look = dressed();
  if (!look.head && birthday) look.head = partyHat;
  $('home').innerHTML = `
    ${isKid() ? '' : `<button class="coins" id="go-coins" aria-label="${db.coins} coins">${coin(db.coins)}</button>`}
    <div class="title">Corgidoku</div>
    <div class="subtitle">Cheddar's puzzle yard for ${esc(nm())}</div>
    <div class="modes${modesFor().length > 2 ? ' three' : ''}">${modesFor().map((k) => `<button class="mode${k === mode() ? ' on' : ''}" data-m="${k}">${MODES[k].label}</button>`).join('')}</div>
    <div class="hero-row">${isKid() ? `<div class="kidname" style="--kc:${me().color}">${nm()}</div>` : ''}
      <div class="hero${isKid() ? ' kid' : ''}">${cheddarLoaf(look)}</div></div>
    ${isKid() ? piggyBank() : ''}
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
      <button class="pill" id="go-past"><span class="e">📅</span>Past days</button>
      <button class="pill" id="go-help"><span class="e">❓</span>How to play</button>
      <button class="pill" id="go-closet"><span class="e">${closetIcon()}</span>Closet</button>
      <button class="pill gear" id="go-set" aria-label="Settings">⚙️</button>
    </div>
    <button class="ver" id="ver">v${VERSION}</button>`;
  $('go-daily').onclick = () => play(D(t));
  $('go-climb').onclick = renderClimb;
  $('go-past').onclick = renderPast;
  $('go-help').onclick = help;
  $('go-set').onclick = settings;
  $('go-closet').onclick = () => renderCloset();
  if ($('go-coins')) $('go-coins').onclick = () => renderCloset();
  if ($('go-piggy')) $('go-piggy').onclick = () => { const g = item(db.goal); g && !db.owned.includes(g.id) ? renderCloset(g.slot, g.id) : renderCloset(); };
  document.querySelectorAll('.mode').forEach((b) => (b.onclick = () => { if (b.dataset.m !== mode()) { useMode(b.dataset.m); renderHome(); if (mode() === 'extreme' && !db.seenExtreme) extremeIntro(); } }));
  // Tap the version to drop any cached copy and reload fresh.
  $('ver').onclick = async () => {
    $('ver').textContent = 'refreshing…';
    try { for (const k of await caches.keys()) await caches.delete(k); } catch {}
    location.reload();
  };
  show('home');
  if (welcome) welcomeSheet();
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
    mistakes: saved?.mistakes ?? 0,
    hints: saved?.hints ?? 0,
    rating: saved?.rating,
    solvedAt: saved?.solvedAt,
    history: [],
  };
  if (G.solved) { G.cells = G.cells.map((v, i) => (G.sol[Math.floor(i / G.n)] === i % G.n ? CORGI : v === CORGI ? EMPTY : v)); }
  const title = P.kind === 'd' ? (P.key === todayISO() ? "Today's puzzle" : pretty(P.key)) : `Hold ${P.key}`;
  $('play').innerHTML = `
    <div class="bar"><button class="back">‹</button><h2>${title}</h2><button class="back" id="restart" title="Start over">↺</button></div>
    <div class="meta"><div class="treats" id="treats"></div><div id="clock"></div></div>
    <div class="board" id="board" style="--n:${P.n}"></div>
    <div class="swatches" id="swatches">${PAW_COLORS.map((c, k) => `<button class="sw${(db.settings.pawColor || 0) === k ? ' on' : ''}" data-k="${k}" aria-label="paw color ${k}">${paw(false, c || '#5B2A6E')}</button>`).join('')}</div>
    <div class="bubble"><div class="face">${cheddarHead()}</div><p id="msg"></p></div>
    <div class="tools">
      <button class="tool" id="undo"><span class="e">↩️</span>Undo</button>
      <button class="tool" id="hint"><span class="e">👃</span>Sniff</button>
      <button class="tool" id="clearpaws"><span class="e">🧽</span>Clear paws</button>
    </div>`;
  $('play').querySelector('.back').onclick = () => { stopClock(); P.kind === 'c' ? renderClimb() : renderHome(); };
  $('restart').onclick = () => confirmSheet('Start this puzzle over?', 'Your corgis and paw marks will be cleared.', () => { snapshot(); G.cells.fill(EMPTY); G.treats = 3; G.solved = false; persist(); drawBoard(); drawTreats(); say(''); startClock(); });
  $('undo').onclick = undo;
  // Tap a color to paint with it; double-tap a color to clear that color's paws.
  let lastSw = { k: -1, t: 0 };
  document.querySelectorAll('#swatches .sw').forEach((b) => (b.onclick = () => {
    const k = Number(b.dataset.k), now = performance.now();
    db.settings.pawColor = k; save();
    document.querySelectorAll('#swatches .sw').forEach((x) => x.classList.toggle('on', x === b));
    if (lastSw.k === k && now - lastSw.t < tapWindow() && !G.solved) {
      lastSw = { k: -1, t: 0 };
      const val = k ? 4 + k : PAW;
      if (!G.cells.includes(val)) return say(`No ${PAW_NAMES[k]} paws to clear.`);
      snapshot();
      G.cells = G.cells.map((v) => (v === val ? EMPTY : v));
      persist(); drawBoard();
      say(`Cleared the ${PAW_NAMES[k]} paws. Undo brings them back.`);
      return;
    }
    lastSw = { k, t: now };
  }));
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
  if (isKid()) {
    const kid = [`Hi ${nm()}! Tap two times fast to put a corgi down.`, 'One corgi in every row, every column and every color!', 'Corgis don\'t like to touch, not even corners!', 'Cheddar believes in you! 🧡'];
    return kid[Math.floor(Math.random() * kid.length)];
  }
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
    const want = v === CORGI ? 'c' : isPaw(v) ? 'p' + v : v === AUTO ? 'a' : v === NOPE ? 'n' : '';
    if (el.dataset.v === want) continue;
    el.dataset.v = want;
    el.classList.toggle('nope', v === NOPE);
    el.innerHTML = v === CORGI ? boardHead() : v === NOPE ? paw(false) : isPaw(v) ? paw(false, PAW_COLORS[v >= 5 ? v - 4 : 0]) : v === AUTO ? paw(true) : '';
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
  db.progress[G.pid] = { cells: G.cells.join(''), treats: G.treats, elapsed: Math.round(G.elapsed), solved: G.solved, best: G.best, mistakes: G.mistakes, hints: G.hints, rating: G.rating, solvedAt: G.solvedAt };
  save();
}
function snapshot() { G.history.push({ cells: G.cells.slice(), treats: G.treats }); if (G.history.length > 200) G.history.shift(); }
// Undo only takes back paw marks. A corgi on its right spot (and a red "no corgi" paw)
// is a fact Cheddar checked, so it stays put. Treats stay eaten.
function undo() {
  if (G.solved) return;
  const now = G.cells;
  const keepFacts = (cells) => {
    const out = cells.slice();
    now.forEach((v, i) => { if (v === CORGI || v === NOPE) out[i] = v; });
    if (db.settings.autoPaws) now.forEach((v, i) => { if (v === CORGI) for (const j of peers(i)) if (out[j] === EMPTY) out[j] = AUTO; });
    return out;
  };
  let next = null;
  // Skip snapshots that would change nothing (e.g. the one taken just before a corgi landed).
  while (G.history.length) {
    next = keepFacts(G.history.pop().cells);
    if (next.some((v, i) => v !== now[i])) break;
    next = null;
  }
  if (!next) return say('Nothing to undo yet!');
  G.cells = next;
  persist(); drawBoard();
}

// ---------- input: tap to cycle, drag to paint paws ----------
function attachInput(board) {
  let start = null, dragging = false, erasing = false, painted = new Set(), down = { x: 0, y: 0 };
  const moved = (e) => Math.hypot(e.clientX - down.x, e.clientY - down.y);
  // Dragging from a paw erases paws; dragging from anything else paints paws in the chosen color.
  const paint = (i) => {
    const v = G.cells[i];
    painted.add(i);
    if (erasing) { if (isPaw(v) || v === AUTO) G.cells[i] = EMPTY; }
    else if (v === EMPTY || v === AUTO || isPaw(v)) G.cells[i] = pawValue();
  };
  const cellAt = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cell');
    return el && board.contains(el) ? Number(el.dataset.i) : null;
  };
  board.onpointerdown = (e) => {
    if (G.solved) return;
    start = cellAt(e); dragging = false; painted = new Set(); down = { x: e.clientX, y: e.clientY };
    board.setPointerCapture(e.pointerId);
  };
  board.onpointermove = (e) => {
    if (start === null) return;
    const i = cellAt(e);
    if (i === null) return;
    if (!dragging && i !== start && moved(e) > tapSlop()) {
      dragging = true; snapshot();
      erasing = isPaw(G.cells[start]);
      paint(start);
    }
    if (dragging && !painted.has(i)) { paint(i); drawBoard(); }
  };
  board.onpointerup = (e) => {
    if (start === null) return;
    if (dragging) { persist(); drawBoard(); }
    else if (cellAt(e) === start || moved(e) <= tapSlop()) tap(start, down.x, down.y);
    start = null; dragging = false;
  };
  board.onpointercancel = () => { start = null; dragging = false; };
}

// Single tap toggles a paw. A quick second tap on the same cell undoes that first tap
// and guesses a corgi instead. A corgi that's placed is on its right spot, so taps leave it alone.
// With easy tap on, a second tap that lands just over the line in the next cell still counts.
let lastTap = { i: -1, t: 0, x: 0, y: 0 };
function tap(i, x = 0, y = 0) {
  const now = performance.now();
  if (G.cells[i] === CORGI) { lastTap = { i: -1, t: 0, x: 0, y: 0 }; return say(isKid() ? 'That corgi is happy right there! 🧡' : 'This corgi is already in its cozy spot.'); }
  const near = lastTap.i === i || (db.settings.easyTap && lastTap.i >= 0 && Math.hypot(x - lastTap.x, y - lastTap.y) < 22);
  const quick = near && now - lastTap.t < tapWindow();
  if (quick) i = lastTap.i;
  lastTap = quick ? { i: -1, t: 0, x: 0, y: 0 } : { i, t: now, x, y };
  if (G.cells[i] === NOPE && !quick) { lastTap = { i: -1, t: 0 }; return say('Cheddar already sniffed here: no corgi in this spot.', true); }
  if (quick) {
    const h = G.history.pop();
    if (h) G.cells = h.cells;
    if (G.cells[i] === NOPE) return say('Cheddar already sniffed here: no corgi in this spot.', true);
    snapshot();
    placeCorgi(i);
    return;
  }
  snapshot();
  G.cells[i] = G.cells[i] === EMPTY || G.cells[i] === AUTO ? pawValue() : EMPTY;
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
    G.mistakes++;
    if (!db.settings.relaxed) { G.treats--; drawTreats(true); }
    persist();
    // Show the corgi shaking on the spot, then swap it for the red paw.
    const el = $('board').children[i];
    el.dataset.v = 'c';
    el.innerHTML = boardHead();
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
  sheet(`<div style="width:120px;margin:0 auto">${cheddarLoaf(dressed())}</div><h3>Snack break!</h3>
    <p>Cheddar ate all the treats. Want to try this puzzle again from the start?</p>
    <button class="cta" id="again">Try again</button><button class="cta alt" id="home2">Home</button>`);
  $('again').onclick = () => { closeSheet(); G.cells.fill(EMPTY); G.treats = 3; G.history = []; persist(); drawBoard(); drawTreats(); say('Fresh start! You\'ve got this.'); startClock(); };
  $('home2').onclick = () => { closeSheet(); G.treats = 3; G.cells.fill(EMPTY); persist(); renderHome(); };
}

function hint() {
  if (G.solved) return;
  G.hints++; persist();
  const { n, sol } = G;
  // Clear any wrong paw marks on solution cells first: that's the kindest hint.
  const badPaw = G.cells.findIndex((v, i) => isPaw(v) && sol[Math.floor(i / n)] === i % n);
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
  if (!G.solvedAt) G.solvedAt = todayISO();
  G.best = G.best ? Math.min(G.best, G.elapsed) : G.elapsed;
  stopClock(); persist(); drawClock();
  // Every puzzle pays once; a replay after Start over earns nothing new.
  const earned = payout(db, G.pid, isKid()); save();
  // Clear paws so the finished board shows just the corgis.
  G.cells = G.cells.map((v) => (v === CORGI ? v : EMPTY)); drawBoard();
  boardParty();
  celebrate();
  say(isKid() ? `You did it, ${nm()}! 🎉` : 'Every corgi is cozy! 🎉');
  const isClimb = G.kind === 'c', nextLvl = Number(G.key) + 1;
  const hasNext = isClimb && nextLvl <= PUZ.campaign.length;
  setTimeout(() => {
    sheet(`<div style="width:150px;margin:0 auto">${cheddarLoaf(dressed())}</div><h3>Pawsome! 🎉</h3>
      <p>Solved in <b>${clock(G.elapsed)}</b>${G.kind === 'd' ? ` · streak <b>${streak()}</b> 🔥` : ''}</p>
      <p>${winLine()}</p>
      ${earned.coins ? `<div class="earn">${coinIcon()} +${earned.coins} coins${earned.weekly ? `<span>+${earned.weekly} weekly bonus! 5 days this week 🌟</span>` : ''}</div>` : ''}
      ${db.settings.research ? ratingRow() : ''}
      ${hasNext ? '<button class="cta" id="next">Next hold 🧗‍♀️</button>' : ''}
      <button class="cta ${hasNext ? 'alt' : ''}" id="home3">Home</button>`);
    if (hasNext) $('next').onclick = () => { closeSheet(); play(C(nextLvl)); };
    $('home3').onclick = () => { closeSheet(); renderHome(); };
    document.querySelectorAll('.rate button').forEach((b) => (b.onclick = () => {
      G.rating = Number(b.dataset.r); persist();
      document.querySelectorAll('.rate button').forEach((x) => x.classList.toggle('on', x === b));
    }));
  }, 2600); // let the board party play before the card covers it
}

// ---------- field research ----------
function ratingRow() {
  return `<div class="rate"><b>How hard was that?</b>
    <div>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => `<button data-r="${r}" class="${G.rating === r ? 'on' : ''}">${r}</button>`).join('')}</div>
    <small>1 = way too easy · 10 = brutal</small></div>`;
}
function rawPuzzle(pid) {
  const [pre, key] = pid.split(':');
  const m = Object.keys(MODES).find((k) => [MODES[k].d, MODES[k].c].includes(pre));
  const d = DATA[m];
  if (!d) return null;
  const p = pre === MODES[m].d ? d.daily.find((x) => x.date === key) : d.campaign[Number(key) - 1];
  return p ? { m, ...p } : null;
}
function report() {
  const rows = Object.entries(db.progress)
    .filter(([, p]) => p.solved)
    .map(([pid, p]) => ({ pid, p, raw: rawPuzzle(pid) }))
    .filter((x) => x.raw)
    .sort((a, b) => (a.p.solvedAt || '').localeCompare(b.p.solvedAt || ''));
  const lines = rows.map(({ pid, p, raw }) => [raw.m, pid, raw.n, raw.lv, raw.st, p.best != null ? Math.round(p.best) : '', p.mistakes ?? '', p.hints ?? '', p.rating ?? '', p.solvedAt ?? '', raw.ch ?? '', raw.cd ?? ''].join(','));
  return { count: rows.length, rated: rows.filter((x) => x.p.rating).length,
    text: `Corgidoku field report v${VERSION} · ${nm()} · ${todayISO()} · ${rows.length} solved\nmode,id,size,lv,steps,secs,mistakes,hints,rating,date,chains,depth\n${lines.join('\n')}` };
}
async function sendReport() {
  const r = report();
  try {
    if (navigator.share) { await navigator.share({ title: 'Corgidoku field report', text: r.text }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(r.text); sheet(`<h3>Copied!</h3><p>The report is on your clipboard. Paste it into a text.</p><button class="cta" id="okc">OK</button>`); $('okc').onclick = closeSheet; }
  catch { sheet(`<h3>Report</h3><textarea style="width:100%;height:40vh;font:12px ui-monospace,monospace">${r.text}</textarea><button class="cta" id="okc">Done</button>`); $('okc').onclick = closeSheet; }
}

function winLine() {
  if (isKid()) {
    const nm = esc(me().name);
    const kid = [`Great job, ${nm}!`, `High paw, ${nm}! 🐾`, 'Cheddar is doing zoomies!', 'Every corgi found a cozy spot!', `${nm}, you're a corgi genius!`];
    return kid[Math.floor(Math.random() * kid.length)];
  }
  const t = todayISO();
  if (t.slice(5) === '06-15') return `Happy birthday, ${esc(nm())}! Cheddar did birthday zoomies just for you.`;
  if (t >= '2026-11-11' && t <= '2026-11-17') return 'Rest up! Cheddar says you\'re doing amazing.';
  const lines = ['Cheddar is doing zoomies!', 'Every corgi found a cozy spot.', 'Big brain, tiny legs. Well done!', 'That\'s worth a belly rub.', 'Cheddar is so proud of you!'];
  return lines[Math.floor(Math.random() * lines.length)];
}

// Win show on the board: a rainbow wave rolls across the tiles from the top-left,
// the corgis hop, and each corgi throws off a burst of sparkles.
const SPARK_COLORS = ['#FF5FA8', '#FF9F45', '#FFD23C', '#3FD98B', '#46B3FF', '#9B6BFF', '#FFFFFF'];
function boardParty() {
  const board = $('board'), n = G.n;
  board.classList.add('party');
  [...board.children].forEach((el, i) => {
    el.style.setProperty('--d', `${(Math.floor(i / n) + (i % n)) * 70}ms`);
    el.classList.add('done', 'party');
  });
  setTimeout(() => board.classList.remove('party'), 3200);
  // Party time: every corgi puts on the equipped hat (even with board dress-up off).
  const hat = hatArt();
  G.cells.forEach((v, i) => {
    if (v !== CORGI) return;
    if (hat) board.children[i].innerHTML = cheddarHead({ head: hat });
    const r = board.children[i].getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const wave = (Math.floor(i / n) + (i % n)) * 70;
    for (let k = 0; k < 10; k++) {
      const s = document.createElement('div');
      s.className = 'spark';
      const ang = (k / 10) * Math.PI * 2 + Math.random() * 0.5, dist = r.width * (0.7 + Math.random() * 0.6);
      s.style.left = cx + 'px';
      s.style.top = cy + 'px';
      s.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      s.style.setProperty('--sz', 8 + Math.random() * 10 + 'px');
      s.style.background = SPARK_COLORS[(k + i) % SPARK_COLORS.length];
      s.style.animationDelay = wave + 250 + Math.random() * 300 + 'ms';
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 2400);
    }
  });
}

function celebrate() {
  const z = document.createElement('div');
  z.className = 'zoom';
  z.innerHTML = cheddarHead({ head: hatArt() });
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
  sheet(`<div style="width:110px;margin:0 auto">${cheddarLoaf(dressed())}</div><h3>How to play</h3>
    <p>Give every corgi a cozy spot:</p>
    <ol>
      <li>One corgi in every <b>row</b></li>
      <li>One corgi in every <b>column</b></li>
      <li>One corgi in every <b>colored yard</b></li>
      <li>Corgis never touch, <b>not even diagonally</b></li>
    </ol>
    <p>Tap for a 🐾 paw mark (“no corgi here”); tap it again to remove it. <b>Double-tap</b> to place a corgi. Drag to paw-mark lots of cells; start a drag on a paw to erase instead.</p>
    <p>Pick a paw color under the board to brainstorm "what if" ideas in different colors. Double-tap a color to clear just those paws.</p>
    <p>${isKid() ? 'Ready for more? Try <b>🌈 Cozy</b> on the home screen.' : mode() === 'extreme' ? '<b>⚡ Extreme</b> boards need a "what if": picture a corgi on a spot, follow the corgis it forces, and if a row, column or yard runs out of room, that spot is out. No guessing needed, just looking ahead.' : mode() === 'hard' ? 'Breezing through? Switch to <b>⚡ Extreme</b> on the home screen.' : 'Want more challenge? Switch to <b>🔥 Hard</b> or <b>⚡ Extreme</b> on the home screen.'}</p>
    <p>A wrong corgi costs a treat. Stuck? Tap <b>Sniff</b> and Cheddar will help.</p>
    <button class="cta" id="gotit">Let's go!</button>`);
  $('gotit').onclick = () => { db.seenHelp = true; save(); closeSheet(); };
}

// First visit to Extreme: explain the one new idea.
function extremeIntro() {
  sheet(`<div style="width:110px;margin:0 auto">${cheddarLoaf(dressed())}</div><h3>Welcome to Extreme ⚡</h3>
    <p>You climbed all of Hard, so Cheddar dug deeper.</p>
    <p>These boards stall unless you look ahead. Pick a spot and ask <b>"what if a corgi went here?"</b> Follow the corgis it would force. If some row, column or yard ends up with no room, that spot is out.</p>
    <p>Brainstorm paw colors are perfect for this: mark a what-if in blue, and double-tap blue to wipe it when you're done.</p>
    <p>Every board still has one answer and never needs a guess. The Extreme Climb has 120 holds and starts right where Hard got tough.</p>
    <button class="cta" id="gotx">Bring it on</button>`);
  $('gotx').onclick = () => { db.seenExtreme = true; save(); closeSheet(); };
}

// ---------- closet ----------
// Big Cheddar preview on top, tabs below. Tapping an item previews it; owned items can be worn,
// others bought with coins. Scenes and frames come only from the Climb (phase 3).
const CLOSET_TABS = [['head', 'Head'], ['neck', 'Neck'], ['face', 'Face'], ['scenes', 'Scenes'], ['frames', 'Frames']];
let closetTab = 'head', closetPick = undefined; // undefined = show what's worn
function renderCloset(tab = closetTab, pickId) {
  if (tab !== closetTab) closetPick = undefined;
  if (pickId !== undefined) closetPick = pickId;
  closetTab = tab;
  const slot = SLOTS.includes(tab) ? tab : null;
  const pick = slot ? (closetPick !== undefined ? closetPick : db.worn[slot] || null) : null;
  const look = { ...db.worn };
  if (slot) look[slot] = pick;
  const kid = isKid();
  const tile = (it) => {
    const owned = !it || db.owned.includes(it.id), worn = it ? db.worn[it.slot] === it.id : !db.worn[slot];
    const sub = worn ? 'Wearing' : owned ? (it ? 'Yours' : '') : coin(priceFor(it, kid)) + (kid && db.goal === it.id ? ' ⭐' : '');
    return `<button class="ctile${(it ? it.id : null) === pick ? ' on' : ''}" data-id="${it ? it.id : ''}">
      <div class="cthumb">${it ? `<svg viewBox="${it.thumb}">${it.art}</svg>` : '<span>🚫</span>'}</div>
      <b>${it ? it.name : 'Nothing'}</b><small>${sub}</small></button>`;
  };
  let body = '', action = '';
  if (slot) {
    const list = ITEMS.filter((x) => x.slot === slot);
    body = list.length ? `<div class="cgrid">${tile(null)}${list.map(tile).join('')}</div>`
      : `<p class="csoon">Cheddar's tailor is still sewing. New ${tab} things are coming soon!</p>`;
    const it = item(pick);
    if (!list.length) action = '';
    else if (!it) action = db.worn[slot] ? `<button class="cta" id="c-wear">Take it off</button>` : '';
    else if (db.worn[slot] === it.id) action = `<button class="cta alt" disabled>Wearing the ${it.name.toLowerCase()} ✓</button>`;
    else if (db.owned.includes(it.id)) action = `<button class="cta" id="c-wear">Wear it</button>`;
    else {
      const cost = priceFor(it, kid);
      if (db.coins >= cost) action = `<button class="cta" id="c-buy">Buy for ${coin(cost)}</button>`;
      // Kids can't afford it yet: they can make it their piggy bank goal.
      else if (kid) action = db.goal === it.id ? `<button class="cta alt" disabled>⭐ Saving up for this · ${cost - db.coins} more to go</button>`
        : `<button class="cta" id="c-goal">⭐ Save up for this</button>`;
      else action = `<button class="cta alt" disabled>${coin(cost)} · ${cost - db.coins} more coins to go</button>`;
    }
  } else {
    body = `<p class="csoon">${tab === 'scenes' ? 'Scenes are pictures behind the whole app. You earn them in the Climb, and they can never be bought. Coming soon!' : 'Reach the top of a Climb to earn a sparkly summit frame for the board. Coming soon!'}</p>`;
  }
  $('closet').innerHTML = `
    <div class="bar"><button class="back">‹</button><h2>Closet</h2><span class="coins still">${coin(db.coins)}</span></div>
    <div class="cpreview">${cheddarLoaf(dressed(look))}</div>
    <div class="ctabs">${CLOSET_TABS.map(([k, l]) => `<button class="ctab${k === tab ? ' on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
    <div class="cbody">${body}</div>
    <div class="cact">${action}</div>`;
  $('closet').querySelector('.back').onclick = () => { closetPick = undefined; renderHome(); };
  $('closet').querySelectorAll('.ctab').forEach((b) => (b.onclick = () => renderCloset(b.dataset.t)));
  $('closet').querySelectorAll('.ctile').forEach((b) => (b.onclick = () => { closetPick = b.dataset.id || null; renderCloset(); }));
  const wear = $('c-wear'), buyB = $('c-buy'), goal = $('c-goal');
  if (goal) goal.onclick = () => { db.goal = pick; save(); renderCloset(); };
  if (wear) wear.onclick = () => { if (pick) db.worn[slot] = pick; else delete db.worn[slot]; save(); renderCloset(); };
  if (buyB) buyB.onclick = () => {
    const it = item(pick), cost = priceFor(it, kid);
    confirmSheet(`Buy the ${it.name.toLowerCase()}?`, `It costs ${coin(cost)}. You have ${coin(db.coins)}.`, () => {
      if (buy(db, it.id, kid)) { db.worn[slot] = it.id; save(); }
      renderCloset();
    });
  };
  show('closet');
}

// Kids' piggy bank on the home screen: a bar that fills toward the item they picked to save for,
// instead of a coin number. No goal yet (or it's bought): a nudge to pick one in the Closet.
function piggyBank() {
  const g = item(db.goal);
  if (!g || db.owned.includes(g.id)) return `<button class="piggy" id="go-piggy"><span class="pthumb">${coinIcon(true)}</span>
    <div><b>Pick something to save up for!</b><small>Tap to visit the closet</small></div></button>`;
  const cost = priceFor(g, true), ready = db.coins >= cost, pct = Math.min(100, Math.round((db.coins / cost) * 100));
  return `<button class="piggy${ready ? ' ready' : ''}" id="go-piggy" aria-label="Saving for the ${g.name.toLowerCase()}, ${pct}% there">
    <span class="pthumb"><svg viewBox="${g.thumb}">${g.art}</svg></span>
    <div><b>${ready ? `You can get the ${g.name.toLowerCase()}! 🎉` : `Saving up for the ${g.name.toLowerCase()}`}</b><div class="pbar"><i style="width:${pct}%"></i></div></div>${coinIcon(true)}</button>`;
}

// One time per player, the first launch with the shop: show the back pay.
function welcomeSheet() {
  const w = welcome; welcome = null;
  const kid = isKid();
  sheet(`<div style="width:120px;margin:0 auto">${cheddarLoaf(dressed())}</div><h3>Welcome to the closet!</h3>
    <p>Solve puzzles to earn coins, then spend them on outfits for Cheddar. Hints are always free.</p>
    ${w.coins || w.start ? `<div class="earn">${coinIcon()} +${w.coins + w.start} coins${w.coins ? `<span>for ${w.puzzles} puzzle${w.puzzles === 1 ? '' : 's'} you already solved${w.start ? `, plus ${w.start} to start` : ''}</span>` : `<span>to start you off</span>`}</div>` : ''}
    <p>${kid ? 'Everything in the closet is half price for you!' : 'Every puzzle pays once. Today\'s daily pays the most.'}</p>
    <button class="cta" id="w-open">Open the closet ${closetIcon()}</button><button class="cta alt" id="w-later">Later</button>`);
  $('w-open').onclick = () => { closeSheet(); renderCloset('head'); };
  $('w-later').onclick = closeSheet;
}

// ---------- backup ----------
// The code is base64 JSON of every corgidoku:* key, so all players come back at once.
const toB64 = (t) => { const u = new TextEncoder().encode(t); let b = ''; for (let i = 0; i < u.length; i += 8192) b += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(b); };
const fromB64 = (b) => new TextDecoder().decode(Uint8Array.from(atob(b), (c) => c.charCodeAt(0)));
function backupCode() {
  const all = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('corgidoku:')) all[k] = localStorage.getItem(k); }
  return toB64(JSON.stringify(all));
}
function readBackup(code) {
  try {
    const all = JSON.parse(fromB64(code.replace(/\s+/g, '')));
    const keys = Object.keys(all);
    if (all && typeof all === 'object' && keys.length && keys.every((k) => k.startsWith('corgidoku:') && typeof all[k] === 'string')) return all;
  } catch {}
  return null;
}
async function copyBackup() {
  const code = backupCode();
  try { await navigator.clipboard.writeText(code); sheet(`<h3>Backup copied</h3><p>Paste it somewhere safe, like a note or a text to yourself. It holds every player's coins, outfits and progress.</p><button class="cta" id="okb">OK</button>`); }
  catch { sheet(`<h3>Backup code</h3><p>Select all and copy it somewhere safe.</p><textarea class="code" readonly>${code}</textarea><button class="cta" id="okb">Done</button>`); }
  $('okb').onclick = closeSheet;
}
function restoreSheet(msg = '') {
  sheet(`<h3>Restore from code</h3><p>Paste a backup code. It replaces everything on this phone, for every player.</p>
    <textarea class="code" id="r-code" placeholder="Paste code here"></textarea>${msg ? `<p class="bad">${msg}</p>` : ''}
    <button class="cta" id="r-go">Restore</button><button class="cta alt" id="r-no">Cancel</button>`);
  $('r-no').onclick = closeSheet;
  $('r-go').onclick = () => {
    const all = readBackup($('r-code').value);
    if (!all) return restoreSheet('That code doesn\'t look right. Check that you pasted all of it.');
    confirmSheet('Replace everything?', 'All progress, coins and outfits on this phone will be swapped for the backup. This can\'t be undone.', () => {
      try {
        for (const k of Object.keys(localStorage)) if (k.startsWith('corgidoku:')) localStorage.removeItem(k);
        for (const [k, v] of Object.entries(all)) localStorage.setItem(k, v);
      } catch {}
      location.reload();
    });
  };
}

function settings() {
  const s = db.settings;
  sheet(`<h3>Settings</h3>
    <div class="who"><b>Who's playing?</b>
      <div class="players">${Object.entries(PLAYERS).map(([k, p]) => `<button class="pl${k === player ? ' on' : ''}" data-p="${k}">${p.label}</button>`).join('')}</div>
      <small>Everyone keeps their own progress.</small></div>
    ${isKid() ? '' : `<label class="toggle"><div>Your name<small>Shown on the home screen</small></div><input type="text" class="name" id="s-name" maxlength="20" autocomplete="off" value="${esc(nm())}"></label>`}
    <label class="toggle"><div>Auto paw marks<small>Mark spots a new corgi rules out</small></div><input type="checkbox" id="s-auto" ${s.autoPaws ? 'checked' : ''}></label>
    <label class="toggle"><div>Relaxed mode<small>Mistakes never cost treats</small></div><input type="checkbox" id="s-relax" ${s.relaxed ? 'checked' : ''}></label>
    <label class="toggle"><div>Show timer</div><input type="checkbox" id="s-timer" ${s.timer ? 'checked' : ''}></label>
    <label class="toggle"><div>Easy double-tap<small>More time between taps, and a little finger wiggle is OK</small></div><input type="checkbox" id="s-easytap" ${s.easyTap ? 'checked' : ''}></label>
    <label class="toggle"><div>Dress up board corgis<small>Corgis on the board wear ${isKid() ? 'your' : 'Cheddar\'s'} hat</small></div><input type="checkbox" id="s-dress" ${s.dressBoard ? 'checked' : ''}></label>
    <label class="toggle"><div>Field research mode 🔬<small>Rate how hard each puzzle felt, 1–10, to help tune the game</small></div><input type="checkbox" id="s-research" ${s.research ? 'checked' : ''}></label>
    <button class="cta alt" id="s-report">📤 Send report <small>(${report().count} solved, ${report().rated} rated)</small></button>
    <div class="backup"><b>Backup</b><small>Keeps coins and progress safe if Safari clears the site. Adding Corgidoku to the Home Screen helps too.</small>
      <div class="two"><button class="cta alt" id="s-copy">📋 Copy backup code</button><button class="cta alt" id="s-restore">📥 Restore from code</button></div></div>
    <button class="cta" id="s-done">Done</button>`);
  $('s-copy').onclick = () => { apply(); copyBackup(); };
  $('s-restore').onclick = () => restoreSheet();
  $('s-report').onclick = () => { s.research = $('s-research').checked; save(); sendReport(); };
  const apply = () => {
    s.autoPaws = $('s-auto').checked; s.relaxed = $('s-relax').checked; s.timer = $('s-timer').checked; s.research = $('s-research').checked; s.easyTap = $('s-easytap').checked; s.dressBoard = $('s-dress').checked;
    if ($('s-name')) s.name = $('s-name').value.trim();
    save();
  };
  $('s-done').onclick = () => { apply(); closeSheet(); renderHome(); };
  document.querySelectorAll('.players .pl').forEach((b) => (b.onclick = () => {
    apply();
    if (b.dataset.p !== player) switchPlayer(b.dataset.p);
    closeSheet(); renderHome();
  }));
}

function switchPlayer(p) {
  player = p;
  try { localStorage.setItem(PLAYER_KEY, p); } catch {}
  loadDb();
  useMode(mode());
}

// ---------- boot ----------
document.body.insertAdjacentHTML('afterbegin', artDefs); // the shared die-cut filter for every Cheddar
Promise.all(Object.entries(MODES).map(([k, m]) => fetch(m.file).then((r) => r.json()).then((d) => { DATA[k] = d; })))
  .then(() => { useMode(mode()); renderHome(); })
  .catch(() => { $('home').innerHTML = '<p style="margin-top:40vh;font-weight:800">Cheddar couldn\'t find the puzzles. Check your connection and reopen.</p>'; });

document.addEventListener('visibilitychange', () => { if (document.hidden && G && !G.solved && $('play').classList.contains('on')) persist(); });
