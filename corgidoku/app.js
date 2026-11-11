import { decodeRegions, decodeSolution, transformBoard, sniff } from './engine.js';
import { cheddarHead, cheddarLoaf, partyHat, paw, treat, artDefs, coinIcon, closetIcon, sniffIcon } from './art.js';
import { ITEMS, SLOTS, item, outfit, colorsOf, baseId, ownsLine, priceFor, shopDefaults, payout, backPay, buy, SCENES, FRAMES, CLIMBS, scene, frame, earnable, unlockAt, milestones, syncUnlocks, BONUS, bonusOpen, sniffPrice, paySniff } from './shop.js';

// ---------- constants ----------
const NAME = 'Halina'; // the Default player's name until they set their own in Settings
const VERSION = '1.25'; // bump with CACHE in sw.js on every release
const YARD_COLORS = ['#FFA8D2', '#C9AEFF', '#93D7FF', '#93F0C8', '#FFE77A', '#FFBE8F', '#FF9C9C', '#EFB2F7', '#86E6EA', '#CDF78A'];
const YARD_NAMES = ['pink', 'purple', 'blue', 'mint', 'yellow', 'orange', 'red', 'lavender', 'teal', 'lime']; // how Sniff names each yard color
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
  // The kid players' ids and storage keys never change; only their shown names can (Settings → Kid 1 / Kid 2 name).
  holden: { name: 'Holden', icon: '⭐', key: 'corgidoku:v1:holden', kid: true, color: '#46B3FF' },
  quentin: { name: 'Quentin', icon: '🐙', key: 'corgidoku:v1:quentin', kid: true, color: '#2FC27F' },
};
// Kids' names live in one shared key (every player sees the same names), so another family can use the app.
const NAMES_KEY = 'corgidoku:names';
let kidNames = {};
try { kidNames = JSON.parse(localStorage.getItem(NAMES_KEY) || '{}') || {}; } catch {}
const kidName = (k) => (kidNames[k] || '').trim() || PLAYERS[k].name;
const playerLabel = (k) => (PLAYERS[k].kid ? `${PLAYERS[k].icon} ${esc(kidName(k))}` : PLAYERS[k].label);
const PLAYER_KEY = 'corgidoku:player';
let player = 'main';
try { const p = localStorage.getItem(PLAYER_KEY); if (PLAYERS[p]) player = p; } catch {}
const me = () => PLAYERS[player];
const isKid = () => !!me().kid;
// Shown name: kids have fixed names; the Default player can set theirs in Settings.
const nm = () => (isKid() ? kidName(player) : (db.settings.name || '').trim() || NAME);
const isHalina = () => !isKid() && nm().toLowerCase() === 'halina';
// Coin amounts with the corgi coin icon in front, e.g. coin(245).
const coin = (n) => `${coinIcon()}&#8239;${n}`;
// Cheddar in what the player has on (the Closet passes a preview look instead).
const dressed = (worn = db.worn) => outfit(worn);
// What board corgis wear (when dressed up) and put on at the win party: the hat and the face item.
// Neck items don't show on a head.
const headLook = () => { const o = dressed(); return { head: o.head, face: o.face }; };
const boardHead = () => cheddarHead(db.settings.dressBoard ? headLook() : {});
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------- storage ----------
const defaults = { progress: {}, settings: { autoPaws: true, relaxed: false, timer: true, mode: 'cozy', research: false, pawColor: 0, easyTap: false, dressBoard: false, sparkles: true }, seenHelp: false };
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
  // Scenes and frames already earned in the Climb. Idempotent, so it also covers players whose
  // back pay ran before scenes existed (shopV already 1), and any scenes added in later releases.
  const got = syncUnlocks(db);
  if (bp) welcome = bp;
  unlocked = got;
  if (bp || got.length) { try { localStorage.setItem(me().key, JSON.stringify(db)); } catch {} }
}
let welcome = null; // back pay result waiting for its one-time "Welcome to the closet" sheet
let unlocked = []; // scenes/frames found by the launch sync, waiting for their one-time sheet
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
  kids: { file: 'puzzles-kids.json', d: 'kd', c: 'kc', b: 'kb', label: '🐣 Chill', climb: 'The Chill Climb', kids: true },
  cozy: { file: 'puzzles.json', d: 'd', c: 'c', b: 'b', label: '🌈 Cozy', climb: 'The Climb' },
  hard: { file: 'puzzles-hard.json', d: 'hd', c: 'hc', b: 'hb', label: '🔥 Hard', climb: 'The Hard Climb' },
  extreme: { file: 'puzzles-extreme.json', d: 'xd', c: 'xc', b: 'xb', label: '⚡ Extreme', climb: 'The Extreme Climb', grownup: true },
};
const DATA = {};
const BDATA = {}; // Bonus Yards pools, fetched only once a mode's summit opens them
let PUZ;
let daily = new Map();
// Chill only shows up for the kids and Extreme only for grown-ups; everyone can pick Cozy or Hard.
const modesFor = () => Object.keys(MODES).filter((k) => (!MODES[k].kids || isKid()) && (!MODES[k].grownup || !isKid()));
const mode = () => (modesFor().includes(db.settings.mode) ? db.settings.mode : isKid() ? 'kids' : 'cozy');
const D = (k) => `${MODES[mode()].d}:${k}`;
const C = (k) => `${MODES[mode()].c}:${k}`;
const B = (k) => `${MODES[mode()].b}:${k}`;
const kindOf = (pre) => pre.slice(-1); // 'd' daily, 'c' climb, 'b' bonus yard
const modeOf = (pre) => Object.keys(MODES).find((k) => [MODES[k].d, MODES[k].c, MODES[k].b].includes(pre));

// ---------- bonus yards ----------
// After a mode's summit: an endless run of extra boards (bonus-<mode>.json). Past the end of the
// pool the boards come back turned or mirrored with new yard colors, and the numbers keep going.
const bonusUnlocked = (m = mode()) => bonusOpen(db, MODES[m].c);
const bonusFile = (m) => `bonus-${m}.json`;
function ensureBonus(m = mode()) {
  if (BDATA[m] || !bonusUnlocked(m)) return Promise.resolve(BDATA[m]);
  return (BDATA[m + ':p'] ||= fetch(bonusFile(m)).then((r) => r.json()).then((d) => (BDATA[m] = d)).catch(() => { delete BDATA[m + ':p']; }));
}
function bonusBoard(m, k) {
  const list = BDATA[m]?.bonus;
  if (!list?.length) return null;
  const base = list[(k - 1) % list.length], lap = Math.floor((k - 1) / list.length);
  if (!lap) return base;
  return { ...base, ...transformBoard(base, ((lap - 1) % 7) + 1, lap % base.n) };
}
// The next yard to play: the first one not solved yet.
const bonusNext = () => { let k = 1; while (prog(B(k))?.solved) k++; return k; };
// short: the half-width card next to the Climb on home (no room for "in progress").
function bonusCard(id = 'go-bonus', short = false) {
  const k = bonusNext(), b = bonusBoard(mode(), k), p = prog(B(k));
  const sub = b ? `Yard ${k} · ${b.n}×${b.n}${p && !short ? ' · in progress' : ''}` : short ? 'Fetching…' : 'Fetching the yards…';
  return `<button class="big" id="${id}"><div class="ico" style="background:#FFF1C9">🦴</div>
    <div><b>Bonus Yards</b><span>${sub}</span></div></button>`;
}
function playBonus() {
  ensureBonus().then((d) => { if (d) play(B(bonusNext())); });
}
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
  const kind = kindOf(pre);
  const p = kind === 'd' ? dailyFor(key) : kind === 'b' ? bonusBoard(modeOf(pre), Number(key)) : PUZ.campaign[Number(key) - 1];
  return { pid, kind, key, n: p.n, r: p.r, reg: decodeRegions(p.r), sol: decodeSolution(p.s), grade: p.g };
}

// ---------- special days ----------
function specialBanner(iso) {
  if (isKid()) return ''; // these messages are for Halina
  // Only Cozy goes easy during recovery week, so Hard and Extreme just point there.
  const cozy = mode() === 'cozy';
  // The get-well message is personal, so it only shows when the Default player is named Halina.
  if (iso === '2026-11-11' && isHalina()) return `Thinking of you today, ${esc(nm())} 💗<small>Cheddar is keeping your spot warm. ${cozy ? 'Easy puzzles all week while you rest.' : 'Cozy has easy puzzles all week if you want a gentle one.'}</small>`;
  if (iso > '2026-11-11' && iso <= '2026-11-17') return `Cozy rainbow week 🌈<small>${cozy ? 'Easy, gentle puzzles while you rest up.' : 'Cozy is extra gentle this week if you want an easy one.'} Cheddar approves.</small>`;
  if (iso.slice(5) === '06-15') return `Happy Birthday, ${esc(nm())}! 🎂🌈<small>Cheddar made you a special puzzle today.</small>`;
  return '';
}

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const show = (id) => { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id)); document.body.dataset.screen = id; };
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- scenes & frames ----------
// The worn scene fills a fixed layer behind every screen (the play screen tints it in CSS).
// Dark scenes set body.dark so text on the picture turns light. id = a preview (the Closet).
const wornScene = () => (db.scenes.includes(db.worn.scene) ? scene(db.worn.scene) : null);
const wornFrame = () => (db.frames.includes(db.worn.frame) ? frame(db.worn.frame) : null);
function applyScene(s = wornScene()) {
  const el = $('scene'), id = s?.id || '';
  if (el.dataset.id !== id) { el.innerHTML = s ? s.art : ''; el.dataset.id = id; }
  document.body.classList.toggle('scened', !!s);
  document.body.classList.toggle('dark', !!s?.dark);
}
// The top of a scene in a 3:4 box (the landmarks live in the top band).
const sceneThumb = (s, big = false) => (s ? `<div class="sthumb${big ? ' big' : ''}">${s.art.replace('xMidYMid slice', 'xMidYMin slice')}</div>` : `<div class="sthumb pink${big ? ' big' : ''}"></div>`);
// A 4-point sparkle (same shape as the scene sparkles).
const SPARK = '<svg viewBox="-10 -10 20 20"><path d="M0 -9 Q1.6 -1.6 9 0 Q1.6 1.6 0 9 Q-1.6 1.6 -9 0 Q-1.6 -1.6 0 -9Z"/></svg>';
// Sparkles sit on the ring's corners and edges, never over the cells. [left %, top %, size px, delay ms]
const SPARKS = [[0, 0, 20, 0], [100, 0, 13, 220], [100, 100, 20, 110], [0, 100, 13, 330], [32, 0, 10, 160], [68, 100, 10, 270], [0, 55, 10, 400], [100, 42, 10, 60]];
function frameWrap(f, inner, { mini = false, id = '' } = {}) {
  if (!f) return `<div class="bframe${mini ? ' mini' : ''}"${id ? ` id="${id}"` : ''}>${inner}</div>`;
  const sp = db.settings.sparkles ? SPARKS.filter((_, k) => !mini || k < 4).map(([x, y, sz, dl]) => `<i class="fsp" style="left:${x}%;top:${y}%;--s:${mini ? Math.round(sz * 0.7) : sz}px;--dl:${dl}ms">${SPARK}</i>`).join('') : '';
  return `<div class="bframe framed f-${f.id}${mini ? ' mini' : ''}"${id ? ` id="${id}"` : ''}>${inner}${sp}</div>`;
}
function twinkle(el = $('bframe')) {
  if (!el || !el.classList.contains('framed')) return;
  el.classList.remove('twinkle'); void el.offsetWidth; el.classList.add('twinkle');
  setTimeout(() => el.classList.remove('twinkle'), 2400);
}
// A little solved 4x4 board, for frame previews.
const MINI_REG = [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 1, 2, 2, 3, 3], MINI_SOL = [1, 7, 8, 14];
function miniBoard(f, w = 120) {
  const cells = MINI_REG.map((k, i) => `<div class="cell" style="background:${YARD_COLORS[k]}">${MINI_SOL.includes(i) ? cheddarHead() : ''}</div>`).join('');
  return `<div style="--mw:${w}px">${frameWrap(f, `<div class="mboard">${cells}</div>`, { mini: true })}</div>`;
}
const prog = (pid) => db.progress[pid] || null;

function streak() {
  let s = 0, d = todayISO();
  if (!prog(D(d))?.solved) d = addDays(d, -1);
  while (prog(D(d))?.solved) { s++; d = addDays(d, -1); }
  return s;
}
const solvedCount = () => Object.entries(db.progress).filter(([k, p]) => p.solved && [MODES[mode()].d, MODES[mode()].c, MODES[mode()].b].includes(k.split(':')[0])).length;
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
    <div class="hero-row">${isKid() ? `<div class="kidname" style="--kc:${me().color}">${esc(nm())}</div>` : ''}
      <div class="hero${isKid() ? ' kid' : ''}">${cheddarLoaf(look)}</div></div>
    ${isKid() ? piggyBank() : ''}
    ${banner ? `<div class="banner">${banner}</div>` : ''}
    <div class="menu">
      <button class="big" id="go-daily"><div class="ico" style="background:#FFE0F0">☀️</div>
        <div><b>Today's puzzle</b><span>${pretty(t)} · ${dp.n}×${dp.n} · ${p?.solved ? `solved in ${clock(p.best)} ✓` : p ? 'in progress' : levelName(dp)}</span></div></button>
      ${bonusUnlocked() ? '<div class="pair">' : ''}<button class="big" id="go-climb"><div class="ico" style="background:#E6DDFF">🧗‍♀️</div>
        <div><b>${MODES[mode()].climb}</b><span>${lvl > PUZ.campaign.length ? 'Summit reached! 🏔️' : `Hold ${lvl} of ${PUZ.campaign.length}`}</span></div></button>
      ${bonusUnlocked() ? `${bonusCard('go-bonus', true)}</div>` : ''}
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
  if ($('go-bonus')) $('go-bonus').onclick = playBonus;
  if (bonusUnlocked() && !BDATA[mode()]) { const m = mode(); ensureBonus(m).then((d) => { if (d && m === mode() && $('home').classList.contains('on')) renderHome(); }); }
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
  else if (unlocked.length) { const u = unlocked; unlocked = []; unlockSheet(u); }
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
    holds += `<button class="hold ${cls}" data-i="${i}" style="top:${p.top}px;left:${p.left}%;background:${HOLD_COLORS[(i - 1) % HOLD_COLORS.length]}">${i}<small class="hsz">${n}×${n}</small></button>`;
  }
  // Scenes and frames still to earn on this climb, shown next to their hold: "Lava flow at hold 60".
  const byHold = {};
  for (const m of milestones(MODES[mode()].c)) {
    if ((m.kind === 'scene' ? db.scenes : db.frames).includes(m.it.id) || m.hold > total) continue;
    (byHold[m.hold] ||= []).push(m.kind === 'scene' ? m.it.name : `${m.it.name} frame`);
  }
  // The summit also opens Bonus Yards.
  if (!bonusUnlocked() && BONUS[MODES[mode()].c]?.summit === total) (byHold[total] ||= []).push('Bonus\u00a0Yards');
  for (const [i, names] of Object.entries(byHold)) {
    const p = pos(Number(i));
    const side = p.left > 50 ? `right:calc(${100 - p.left}% + 10px)` : `left:calc(${p.left}% + 72px)`;
    holds += `<div class="mtag" style="top:${p.top + 4}px;${side}">🔒 ${names.join(' + ')}<small>at hold ${i}</small></div>`;
  }
  const cp = pos(Math.min(lvl, total));
  $('climb').innerHTML = `
    <div class="bar"><button class="back">‹</button><h2>${MODES[mode()].climb}</h2><span class="ghost"></span></div>
    ${bonusUnlocked() ? `<div class="climb-bonus">${bonusCard('go-bonus2')}</div>` : ''}
    <div class="summit">🏔️ Rainbow Summit</div>
    <div class="wall" style="height:${h + 40}px"><div class="rope"></div>${holds}
      <div class="climber" style="top:${cp.top - 46}px;left:calc(${cp.left}% + 2px)">${cheddarHead()}</div></div>
    <div class="summit">Base camp</div>`;
  $('climb').querySelector('.back').onclick = renderHome;
  if ($('go-bonus2')) $('go-bonus2').onclick = playBonus;
  if (bonusUnlocked() && !BDATA[mode()]) ensureBonus().then((d) => { if (d && $('climb').classList.contains('on') && $('go-bonus2')) $('go-bonus2').outerHTML = bonusCard('go-bonus2'), ($('go-bonus2').onclick = playBonus); });
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
  let saved = prog(pid);
  // A bonus yard's board can change when the pool grows (laps start later), so drop progress from another board.
  if (P.kind === 'b' && saved?.bk && saved.bk !== P.r) saved = null;
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
    sn: saved?.sn || null, // the last Sniff: { k: step key, s: 1 look / 2 answer, f: a free peek (answer not paid) }
    history: [],
  };
  if (G.solved) { G.cells = G.cells.map((v, i) => (G.sol[Math.floor(i / G.n)] === i % G.n ? CORGI : v === CORGI ? EMPTY : v)); }
  const title = P.kind === 'd' ? (P.key === todayISO() ? "Today's puzzle" : pretty(P.key)) : P.kind === 'b' ? `Bonus yard ${P.key}` : `Hold ${P.key}`;
  $('play').innerHTML = `
    <div class="bar"><button class="back">‹</button><h2>${title}</h2><button class="back" id="restart" title="Start over">↺</button></div>
    <div class="meta"><div class="treats" id="treats"></div><div id="clock"></div></div>
    ${frameWrap(wornFrame(), `<div class="board" id="board" style="--n:${P.n}"></div>`, { id: 'bframe' })}
    <div class="swatches" id="swatches">${PAW_COLORS.map((c, k) => `<button class="sw${(db.settings.pawColor || 0) === k ? ' on' : ''}" data-k="${k}" aria-label="paw color ${k}">${paw(false, c || '#5B2A6E')}</button>`).join('')}</div>
    <div class="bubble"><div class="face">${cheddarHead()}</div><p id="msg"></p></div>
    <div class="tools">
      <button class="tool" id="undo"><span class="e">↩️</span>Undo</button>
      <button class="tool" id="hint"><span class="e">${sniffIcon()}</span><span class="lbl" id="hintlbl">Sniff</span></button>
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
  twinkle();
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
  clearSniff();
  sniffButton();
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
  db.progress[G.pid] = { cells: G.cells.join(''), treats: G.treats, elapsed: Math.round(G.elapsed), solved: G.solved, best: G.best, mistakes: G.mistakes, hints: G.hints, rating: G.rating, solvedAt: G.solvedAt, ...(G.sn ? { sn: G.sn } : {}), ...(G.kind === 'b' ? { bk: G.r } : {}) };
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

// ---------- Sniff (hints) ----------
// Sniff finds the next logical step from the board as it is (engine.js sniff(): the lowest rung of
// the SPEC ladder that makes progress) and shows it in two taps: first where to look and the
// technique's name, then the answer with the cells that justify it. On Hard and Extreme a Sniff
// costs coins (shop.js sniffPrice); one price covers both taps of the same step. A player who
// can't afford it still gets the "where to look" tap free. Plum paws on a corgi spot come first.
const TECH = ['', 'Last spot', 'Confined', 'Would block', 'Pair lock', 'Group lock', 'What if'];
let snMemo = { cells: '', st: null };
// What Sniff knows: corgis, and the cells known to be empty (red paws, auto paws, plum paws).
// Brainstorm-color paws are what-ifs, so they're left out.
function sniffStep() {
  const key = G.cells.join('');
  if (snMemo.cells !== key || snMemo.pid !== G.pid) {
    const corgis = [], out = [];
    G.cells.forEach((v, i) => { if (v === CORGI) corgis.push(i); else if (v === NOPE || v === AUTO || v === PAW) out.push(i); });
    snMemo = { cells: key, pid: G.pid, st: sniff(G.n, G.reg, G.sol, { corgis, out }) };
  }
  return snMemo.st;
}
const stepKey = (st) => `${st.type}:${st.level}:${st.cells.join(',')}`;
const yardName = (k) => YARD_NAMES[k] || 'colored';
const andList = (a) => (a.length < 3 ? a.join(' and ') : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`);
const theUnit = (u) => (u.kind === 'yard' ? `the ${yardName(u.i)} yard` : `this ${u.kind}`);
const spots = (k) => `${k} glowing spot${k === 1 ? '' : 's'}`;
function explain(st) {
  const k = st.cells.length, name = TECH[st.level];
  if (st.type === 'reveal') return { look: 'Sniff sniff… look here!', answer: 'Sniff sniff… try the glowing spot!' };
  if (st.level === 1) return { look: `Look at ${theUnit(st.unit)}. (${name})`,
    answer: `${name}: ${theUnit(st.unit)} has only one spot left that could hold a corgi. Double-tap the glowing spot!` };
  if (st.level === 2) {
    const u = st.unit;
    if (u.kind === 'yard') return { look: `Look at ${theUnit(u)}. Where can its corgi go? (${name})`,
      answer: `${name}: every spot left in ${theUnit(u)} is in this ${st.line.kind}, so its corgi takes the ${st.line.kind}. Paw-mark the rest of the ${st.line.kind}: the ${spots(k)}.` };
    const y = `the ${yardName(st.yard)} yard`;
    return { look: `Look at this ${u.kind}. Which yards can its corgi be in? (${name})`,
      answer: `${name}: every spot left in this ${u.kind} is in ${y}, so ${y}'s corgi has to sit in this ${u.kind}. Paw-mark the rest of ${y}: the ${spots(k)}.` };
  }
  if (st.level === 3) return { look: `Look at ${theUnit(st.unit)}. Is there a spot outside it that would take away all its room? (${name})`,
    answer: `${name}: a corgi on the glowing spot would rule out every spot left in ${theUnit(st.unit)}. So no corgi there: paw-mark it.` };
  if (st.level === 4 || st.level === 5) {
    const g = st.group, c = st.cover, n = g.ids.length;
    if (g.kind === 'yard') {
      const ys = `the ${andList(g.ids.map(yardName))} yards`;
      return { look: `Look at ${ys} together. Which ${c.kind}s can their corgis be in? (${name})`,
        answer: `${name}: ${ys} only fit in these ${n} ${c.kind}s, so their ${n} corgis fill them. Paw-mark everything else in those ${c.kind}s: the ${spots(k)}.` };
    }
    const ys = `the ${andList(c.ids.map(yardName))} yards`;
    return { look: `Look at these ${n} ${g.kind}s together. Which yards can their corgis be in? (${name})`,
      answer: `${name}: these ${n} ${g.kind}s only have room in ${ys}, so those yards' corgis must sit in these ${g.kind}s. Paw-mark the rest of those yards: the ${spots(k)}.` };
  }
  const d = st.depth, dead = st.dead.kind === 'yard' ? theUnit(st.dead) : `the striped ${st.dead.kind}`;
  return { look: `What if a corgi sat on the ? spot? Follow the corgis it would force. (${name})`,
    answer: `${name}: a corgi on the ? spot would force ${d === 1 ? 'corgi 1 (the last spot in its row, column or yard)' : `corgis 1 to ${d} (each the last spot in its row, column or yard)`}, and then ${dead} would have no room. So no corgi there: paw-mark the ? spot.` };
}
function clearSniff() {
  const b = $('board');
  if (!b) return;
  b.classList.remove('spot');
  b.querySelectorAll('.sn-a,.sn-d,.glow').forEach((el) => el.classList.remove('sn-a', 'sn-d', 'glow'));
  b.querySelectorAll('.sng,.snx').forEach((el) => el.remove());
}
// Highlight cells: everything else on the board dims.
function spotlight(cells) {
  const b = $('board');
  b.classList.add('spot');
  for (const i of cells) b.children[i].classList.add('sn-a');
}
// A see-through corgi with a little badge ("?" for a what-if spot, 1, 2… for the corgis it forces).
function ghost(i, label) {
  const el = $('board').children[i];
  el.insertAdjacentHTML('beforeend', `<span class="sng">${cheddarHead()}<b>${label}</b></span>`);
}
function showLook(st, extra = '') {
  clearSniff();
  spotlight(st.look);
  if (st.level === 6) ghost(st.cells[0], '?');
  say(explain(st).look + extra, false, true);
}
function showAnswer(st) {
  clearSniff();
  spotlight(st.area);
  const b = $('board');
  if (st.level === 6) {
    ghost(st.cells[0], '?');
    st.chain.forEach((x, k) => ghost(x.cell, k + 1));
    for (let i = 0; i < G.n * G.n; i++) {
      const r = Math.floor(i / G.n), c = i % G.n, u = st.dead;
      if ((u.kind === 'row' && r === u.i) || (u.kind === 'column' && c === u.i) || (u.kind === 'yard' && G.reg[i] === u.i)) b.children[i].classList.add('sn-d');
    }
  } else if (st.type === 'place' || st.type === 'reveal') b.children[st.cells[0]].classList.add('glow');
  else for (const i of st.cells) b.children[i].insertAdjacentHTML('beforeend', `<span class="snx">${paw(false)}</span>`);
  say(explain(st).answer, false, true);
}
// The Sniff button: the nose, "Sniff" and the price (Hard/Extreme), or "Show me" when the
// answer to the step already paid for is one tap away. Greyed after a free peek the player can't pay for.
function sniffButton() {
  const btn = $('hint'), lbl = $('hintlbl');
  if (!btn || !G) return;
  const st = G.solved ? null : sniffStep(), price = sniffPrice(db, G.pid);
  const same = st && G.sn && G.sn.k === stepKey(st) && st.type !== 'wrong';
  const poor = same && G.sn.f && db.coins < price;
  btn.classList.toggle('poor', !!poor);
  lbl.innerHTML = same && !G.sn.f ? 'Show me' : price && !G.solved ? `Sniff <small>${coin(price)}</small>` : 'Sniff';
  btn.setAttribute('aria-label', same && !G.sn.f ? 'Show me the answer' : price ? `Sniff for ${price} coins` : 'Sniff for a hint');
}
function spendSheet(price, ok) {
  sheet(`<div class="bignose">${sniffIcon()}</div><h3>Sniff for ${coin(price)}?</h3>
    <p>You have ${coin(db.coins)}. Cheddar shows where to look first; if you need it, the answer is the next tap, free.</p>
    <button class="cta" id="ok">Sniff ${coin(price)}</button><button class="cta alt" id="no">Not now</button>`);
  $('ok').onclick = () => { closeSheet(); ok(); };
  $('no').onclick = closeSheet;
}
function hint() {
  if (G.solved) return;
  const st = sniffStep();
  if (!st) return;
  const key = stepKey(st), price = sniffPrice(db, G.pid);
  // Second tap on the same step: the answer (already paid for), or a reminder after a free peek.
  if (G.sn?.k === key && st.type !== 'wrong') {
    if (!G.sn.f) { G.sn.s = 2; persist(); showAnswer(st); return; }
    if (db.coins < price) return say(`The answer costs ${price} coins and you have ${db.coins}. Solve a puzzle or two to earn more!`, false, true);
    return spendSheet(price, () => { if (!paySniff(db, G.pid)) return; save(); G.sn = { k: key, s: 2, f: false }; persist(); sniffButton(); showAnswer(st); });
  }
  const go = () => {
    G.hints++;
    if (st.type === 'wrong') {
      // Plum paws on corgi spots: take them all off, and show where they were.
      snapshot();
      for (const i of st.cells) G.cells[i] = EMPTY;
      G.sn = null; persist(); drawBoard();
      for (const i of st.cells) $('board').children[i].classList.add('glow');
      const k = st.cells.length;
      say(`Cheddar smelled a corgi under ${k === 1 ? 'one of your paw marks' : `${k} of your paw marks`}, so he took ${k === 1 ? 'it' : 'them'} off. Look at the glowing spot${k === 1 ? '' : 's'}!`, false, true);
      return;
    }
    G.sn = { k: key, s: 1, f: false }; persist(); sniffButton(); showLook(st);
  };
  if (!price) return go();
  if (db.coins < price) {
    // Can't afford it: a free peek at where to look. The answer stays locked.
    if (st.type === 'wrong') return say('Hmm, one of your paw marks is on a corgi spot. Check your paws!', false, true);
    G.hints++;
    G.sn = { k: key, s: 1, f: true }; persist(); sniffButton();
    showLook(st, ` Free peek: the answer costs ${price} coins.`);
    return;
  }
  spendSheet(price, () => { if (!paySniff(db, G.pid)) return; save(); go(); });
}

function win() {
  G.solved = true;
  if (!G.solvedAt) G.solvedAt = todayISO();
  G.best = G.best ? Math.min(G.best, G.elapsed) : G.elapsed;
  stopClock(); persist(); drawClock();
  // The solve is already saved, so only `paid` (set by payout below) tells whether this summit opened Bonus Yards.
  const wasOpen = bonusOpen({ paid: db.paid }, MODES[mode()].c);
  // Every puzzle pays once; a replay after Start over earns nothing new.
  const earned = payout(db, G.pid, isKid());
  const got = syncUnlocks(db); // a milestone hold unlocks a scene, a summit also a frame
  save();
  // Clear paws so the finished board shows just the corgis.
  G.cells = G.cells.map((v) => (v === CORGI ? v : EMPTY)); drawBoard();
  boardParty();
  celebrate();
  twinkle();
  say(isKid() ? `You did it, ${nm()}! 🎉` : 'Every corgi is cozy! 🎉');
  const isClimb = G.kind === 'c', isBonus = G.kind === 'b', nextLvl = Number(G.key) + 1;
  const hasNext = isClimb && nextLvl <= PUZ.campaign.length;
  const opened = !wasOpen && bonusUnlocked(); // this was the summit: Bonus Yards just opened
  if (opened) ensureBonus();
  const more = isBonus || opened;
  const pid = G.pid;
  const winSheet = () => {
    if (G?.pid !== pid || !$('play').classList.contains('on')) return; // they already left the board
    sheet(`<div style="width:150px;margin:0 auto">${cheddarLoaf(dressed())}</div><h3>Pawsome! 🎉</h3>
      <p>Solved in <b>${clock(G.elapsed)}</b>${G.kind === 'd' ? ` · streak <b>${streak()}</b> 🔥` : ''}</p>
      <p>${winLine()}</p>
      ${earned.coins ? `<div class="earn">${coinIcon()} +${earned.coins} coins${earned.weekly ? `<span>+${earned.weekly} weekly bonus! 5 days this week 🌟</span>` : ''}</div>` : ''}
      ${db.settings.research ? ratingRow() : ''}
      ${opened ? `<div class="earn">🦴 Bonus Yards are open!<span>Endless extra boards, ${isKid() ? 5 : 3} coins each</span></div>` : ''}
      ${hasNext ? '<button class="cta" id="next">Next hold 🧗‍♀️</button>' : ''}
      ${more ? `<button class="cta" id="nextb">${isBonus ? 'Next bonus yard' : 'Try a bonus yard'} 🦴</button>` : ''}
      <button class="cta ${hasNext || more ? 'alt' : ''}" id="home3">Home</button>`);
    if (hasNext) $('next').onclick = () => { closeSheet(); play(C(nextLvl)); };
    if (more) $('nextb').onclick = () => { closeSheet(); playBonus(); };
    $('home3').onclick = () => { closeSheet(); renderHome(); };
    document.querySelectorAll('.rate button').forEach((b) => (b.onclick = () => {
      G.rating = Number(b.dataset.r); persist();
      document.querySelectorAll('.rate button').forEach((x) => x.classList.toggle('on', x === b));
    }));
  };
  // Let the board party (rainbow wave + hops, longer on big boards) and the zoomies finish first.
  const wait = reduceMotion() ? 700 : Math.max(3500, 2200 + (2 * G.n - 2) * 70 + 500);
  setTimeout(() => (got.length ? unlockSheet(got, winSheet) : winSheet()), wait);
}

// ---------- field research ----------
function ratingRow() {
  return `<div class="rate"><b>How hard was that?</b>
    <div>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => `<button data-r="${r}" class="${G.rating === r ? 'on' : ''}">${r}</button>`).join('')}</div>
    <small>1 = way too easy · 10 = brutal</small></div>`;
}
function rawPuzzle(pid) {
  const [pre, key] = pid.split(':');
  const m = modeOf(pre);
  const d = DATA[m];
  if (!d) return null;
  const p = kindOf(pre) === 'b' ? bonusBoard(m, Number(key)) : pre === MODES[m].d ? d.daily.find((x) => x.date === key) : d.campaign[Number(key) - 1];
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
    const nm = esc(kidName(player));
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
  // Party time: every corgi puts on the equipped hat and face item (even with board dress-up off).
  const look = headLook(), hat = look.head || look.face;
  G.cells.forEach((v, i) => {
    if (v !== CORGI) return;
    if (hat) board.children[i].innerHTML = cheddarHead(look);
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
  z.innerHTML = cheddarHead(headLook());
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
function say(text, alert = false, sticky = false) {
  const m = $('msg');
  if (!m) return;
  m.textContent = text;
  m.classList.toggle('alert', alert);
  m.classList.toggle('long', text.length > 120);
  clearTimeout(msgTimer);
  // Alerts stay until the next message; friendly chatter fades.
  if (text && !alert && !sticky) msgTimer = setTimeout(() => { if (m.textContent === text && !G?.solved) m.textContent = ''; }, 6000);
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
    <p>A wrong corgi costs a treat. Stuck? Tap <b>Sniff</b>: Cheddar shows where to look, and tap again for the answer.${mode() === 'hard' || mode() === 'extreme' ? ` In ${MODES[mode()].label} a Sniff costs ${coin(mode() === 'hard' ? 25 : 50)} (free on a puzzle you already solved).` : ''}</p>
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
// Big Cheddar preview on top, tabs below. Tapping an owned item wears it; tapping one you don't
// own previews it, with Buy at the bottom. Scenes and frames come only from the Climb: never a Buy button.
const CLOSET_TABS = [['head', 'Head'], ['neck', 'Neck'], ['face', 'Face'], ['scenes', 'Scenes'], ['frames', 'Frames']];
let closetTab = 'head', closetPick = undefined; // undefined = show what's worn
function wearIt(key, id) {
  if (id) db.worn[key] = id; else delete db.worn[key];
  save(); closetPick = undefined; applyScene(); renderCloset();
}
function renderCloset(tab = closetTab, pickId) {
  if (tab !== closetTab) closetPick = undefined;
  if (pickId !== undefined) closetPick = pickId;
  closetTab = tab;
  const slot = SLOTS.includes(tab) ? tab : null;
  const kind = tab === 'scenes' ? 'scene' : tab === 'frames' ? 'frame' : null;
  const kid = isKid();
  const look = { ...db.worn };
  let body = '', action = '', preview = '', pick = null;
  if (slot) {
    pick = closetPick !== undefined ? closetPick : db.worn[slot] || null;
    look[slot] = pick;
    // One tile per item; its colors are swatches in the bottom bar. The tile shows the color you're
    // looking at, else the one you wear, else one you own.
    const shown = (it) => {
      const mine = colorsOf(it.id).map((c) => c.id).filter((id) => db.owned.includes(id));
      for (const id of [pick, db.worn[slot], ...(db.owned.includes(it.id) ? [it.id] : []), ...mine]) if (id && baseId(id) === it.id) return item(id);
      return it;
    };
    const tile = (it) => {
      const owned = !it || ownsLine(db, it.id), worn = it ? baseId(db.worn[it.slot]) === it.id : !db.worn[slot];
      const sub = worn ? 'Wearing' : owned ? (it ? 'Yours' : '') : coin(priceFor(it, kid)) + (kid && baseId(db.goal) === it.id ? ' ⭐' : '');
      const v = it && shown(it);
      return `<button class="ctile${(it ? it.id : null) === baseId(pick) ? ' on' : ''}" data-id="${it ? it.id : ''}">
        <div class="cthumb">${it ? `<svg viewBox="${v.thumb}">${v.art}</svg>` : '<span>🚫</span>'}</div>
        <b>${it ? it.name : 'Nothing'}</b><small>${sub}</small>${it?.colors ? `<i class="cdots">${colorsOf(it.id).map((c) => `<span style="background:${c.dot}"></span>`).join('')}</i>` : ''}</button>`;
    };
    const list = ITEMS.filter((x) => x.slot === slot);
    body = list.length ? `<div class="cgrid">${tile(null)}${list.map(tile).join('')}</div>`
      : `<p class="csoon">Cheddar's tailor is still sewing. New ${tab} things are coming soon!</p>`;
    const it = item(pick);
    // Colors of the picked item: owned ones go on with a tap, others preview (and can be bought).
    const cols = it ? colorsOf(it.id) : [];
    if (cols.length) action += `<div class="csw" role="group" aria-label="Colors">${cols.map((c) => {
      const own = db.owned.includes(c.id), on = c.id === pick, wear = c.id === db.worn[slot];
      return `<button class="sw${on ? ' on' : ''}${own ? '' : ' new'}" data-id="${c.id}" aria-label="${c.name}${wear ? ', wearing' : own ? ', yours' : ''}" style="--c:${c.dot}">${wear ? '✓' : ''}</button>`;
    }).join('')}<small>${esc(it.name)}${db.owned.includes(it.id) ? '' : ` · ${it.variant ? 'new color' : 'not yours yet'}`}</small></div>`;
    // Owned things go on with a tap (see the tile handler), so only things to buy need a button.
    if (it && !db.owned.includes(it.id)) {
      const cost = priceFor(it, kid);
      // A new color needs the item first.
      if (it.variant && !ownsLine(db, it.id)) action += `<button class="cta alt" disabled>Get the ${item(it.base).name.toLowerCase()} first, then colors are ${coin(priceFor(it, kid))}</button>`;
      else if (db.coins >= cost) action += `<button class="cta" id="c-buy">Buy for ${coin(cost)}</button>`;
      // Kids can't afford it yet: they can make it their piggy bank goal.
      else if (kid) action += db.goal === it.id ? `<button class="cta alt" disabled>⭐ Saving up for this · ${cost - db.coins} more to go</button>`
        : `<button class="cta" id="c-goal">⭐ Save up for this</button>`;
      else action += `<button class="cta alt" disabled>${coin(cost)} · ${cost - db.coins} more coins to go</button>`;
    }
  } else {
    // Scenes and frames: earned ones can be used, locked ones show where to earn them.
    // A kid only sees what their climbs can give (no Extreme).
    const all = (kind === 'scene' ? SCENES : FRAMES).filter((x) => earnable(x, kid));
    const mine = kind === 'scene' ? db.scenes : db.frames;
    const worn = kind === 'scene' ? wornScene() : wornFrame();
    pick = closetPick !== undefined ? closetPick : worn?.id || null;
    const it = kind === 'scene' ? scene(pick) : frame(pick);
    const has = !it || mine.includes(it.id);
    const tile = (x) => {
      const own = !x || mine.includes(x.id), on = (x ? x.id : null) === pick, using = (x ? x.id : null) === (worn?.id || null);
      const thumb = kind === 'scene' ? sceneThumb(x) : `<div class="fthumb">${miniBoard(x, 54)}</div>`;
      const at = x && unlockAt(x, kid), sub = using ? 'Using' : own ? (x ? 'Yours' : '') : `${CLIMBS[at.climb]}<br>hold ${at.hold}`;
      return `<button class="ctile tall${on ? ' on' : ''}${own ? '' : ' locked'}" data-id="${x ? x.id : ''}">
        <div class="cthumb" style="position:relative">${thumb}${own ? '' : '<span class="lock">🔒</span>'}</div>
        <b>${x ? x.name : kind === 'scene' ? 'Pink' : 'No frame'}</b><small class="${own ? '' : 'at'}">${sub}</small></button>`;
    };
    body = `<div class="cgrid">${tile(null)}${all.map(tile).join('')}</div>
      <p class="csoon" style="margin-top:12px">${kind === 'scene' ? 'Scenes are pictures behind the whole app. Earn them on the Climb: they can never be bought.' : 'Reach the top of a Climb to earn a sparkly frame for the board.'}</p>`;
    if (!has) action = `<button class="cta alt" disabled>🔒 Earn it at ${unlockAt(it, kid).label}</button>`;
    // Scenes preview behind the whole Closet; frames preview around a little board.
    if (kind === 'scene') applyScene(has ? it : worn);
    else preview = `<div class="cpreview fr">${miniBoard(has ? it : worn, 130)}</div>`;
  }
  if (kind !== 'scene') applyScene();
  $('closet').innerHTML = `
    <div class="bar"><button class="back">‹</button><h2>Closet</h2><span class="coins still">${coin(db.coins)}</span></div>
    ${preview || `<div class="cpreview">${cheddarLoaf(dressed(look))}</div>`}
    <div class="ctabs">${CLOSET_TABS.map(([k, l]) => `<button class="ctab${k === tab ? ' on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
    <div class="cbody">${body}</div>
    <div class="cact">${action}</div>`;
  $('closet').querySelector('.back').onclick = () => { closetPick = undefined; applyScene(); renderHome(); };
  $('closet').querySelectorAll('.ctab').forEach((b) => (b.onclick = () => renderCloset(b.dataset.t)));
  // Tap something you own (or Nothing / Pink / No frame) and it goes on right away, no button.
  // Tap something you don't own yet to preview it and see Buy, Save up, or where to earn it.
  $('closet').querySelectorAll('.ctile').forEach((b) => (b.onclick = () => {
    let id = b.dataset.id || null;
    let mine = !id || (slot ? ownsLine(db, id) : (kind === 'scene' ? db.scenes : db.frames).includes(id));
    // An item you own in some color: keep the color you wear, else put on one you own.
    if (slot && id && mine) id = baseId(db.worn[slot]) === id ? db.worn[slot] : db.owned.includes(id) ? id : colorsOf(id).find((c) => db.owned.includes(c.id)).id;
    if (mine) wearIt(slot || kind, id);
    else { closetPick = id; renderCloset(); }
  }));
  $('closet').querySelectorAll('.sw').forEach((b) => (b.onclick = () => {
    const id = b.dataset.id;
    if (db.owned.includes(id)) wearIt(slot, id); else { closetPick = id; renderCloset(); }
  }));
  const buyB = $('c-buy'), goal = $('c-goal');
  if (goal) goal.onclick = () => { db.goal = pick; save(); renderCloset(); };
  if (buyB) buyB.onclick = () => {
    const it = item(pick), cost = priceFor(it, kid);
    confirmSheet(`Buy the ${it.name.toLowerCase()}?`, `It costs ${coin(cost)}. You have ${coin(db.coins)}.`, () => {
      if (buy(db, it.id, kid)) { db.worn[slot] = it.id; save(); }
      renderCloset();
    });
  };
  show('closet');
}

// "New scene: Lava flow!" with a preview and Use it, one sheet per unlock, then done() (the win sheet).
// The launch sync (progress made before scenes existed) shows several at once on one sheet.
function unlockSheet(list, done) {
  const finish = () => { closeSheet(); if (done) done(); };
  if (!done && list.length > 1) {
    sheet(`<h3>Climb rewards! 🏔️</h3>
      <p>Your climbing already earned these. Scenes go behind the whole app; frames go around the board.</p>
      <div class="ulist">${list.map(({ kind, it }) => `<div>${kind === 'scene' ? sceneThumb(it) : `<div class="fthumb" style="margin:0 auto 4px">${miniBoard(it, 54)}</div>`}${kind === 'scene' ? it.name : `${it.name} frame`}</div>`).join('')}</div>
      <button class="cta" id="u-open">Pick in the closet ${closetIcon()}</button><button class="cta alt" id="u-later">Later</button>`);
    $('u-open').onclick = () => { closeSheet(); renderCloset(list[0].kind === 'scene' ? 'scenes' : 'frames'); };
    $('u-later').onclick = closeSheet;
    return;
  }
  const [{ kind, it }, ...rest] = list;
  const next = () => (rest.length ? unlockSheet(rest, done) : finish());
  sheet(`${kind === 'scene' ? sceneThumb(it, true) : `<div style="display:flex;justify-content:center;padding:10px 0 8px">${miniBoard(it, 130)}</div>`}
    <h3>New ${kind}: ${it.name}!</h3>
    <p>${kind === 'scene' ? 'A picture for behind the whole app. Cheddar loves it already.' : 'You reached the summit! A sparkly frame for the board.'}</p>
    <button class="cta" id="u-use">Use it</button><button class="cta alt" id="u-later">Not now</button>`);
  if (kind === 'frame') twinkle($('sheet').querySelector('.bframe'));
  $('u-use').onclick = () => { db.worn[kind] = it.id; save(); if (kind === 'scene') applyScene(); else applyFrame(); next(); };
  $('u-later').onclick = next;
}
// Swap the frame around the board that's on screen (after "Use it" on the win board).
function applyFrame() {
  const old = $('bframe'), board = $('board');
  if (!old || !board) return;
  const t = document.createElement('div');
  t.innerHTML = frameWrap(wornFrame(), '', { id: 'bframe' });
  const el = t.firstElementChild;
  old.replaceWith(el); el.prepend(board); twinkle(el);
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
  const u = unlocked; unlocked = []; // scenes and frames their Climb progress already earned
  const kid = isKid();
  sheet(`<div style="width:120px;margin:0 auto">${cheddarLoaf(dressed())}</div><h3>Welcome to the closet!</h3>
    <p>Solve puzzles to earn coins, then spend them on outfits for Cheddar. Hints are free in Chill and Cozy; in Hard and Extreme a Sniff costs ${coin(25)} / ${coin(50)}.</p>
    ${w.coins || w.start ? `<div class="earn">${coinIcon()} +${w.coins + w.start} coins${w.coins ? `<span>for ${w.puzzles} puzzle${w.puzzles === 1 ? '' : 's'} you already solved${w.start ? `, plus ${w.start} to start` : ''}</span>` : `<span>to start you off</span>`}</div>` : ''}
    <p>${kid ? 'Everything in the closet is half price for you!' : 'Every puzzle pays once. Today\'s daily pays the most.'}</p>
    ${u.length ? `<p>Your climbing also earned:</p><div class="ulist">${u.map(({ kind, it }) => `<div>${kind === 'scene' ? sceneThumb(it) : `<div class="fthumb" style="margin:0 auto 4px">${miniBoard(it, 54)}</div>`}${kind === 'scene' ? it.name : `${it.name} frame`}</div>`).join('')}</div>` : ''}
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
      <div class="players">${Object.entries(PLAYERS).map(([k, p]) => `<button class="pl${k === player ? ' on' : ''}" data-p="${k}">${playerLabel(k)}</button>`).join('')}</div>
      <small>Everyone keeps their own progress.</small>
      <label class="toggle kidnm"><div>Kid 1 name<small>⭐ Blank = Holden</small></div><input type="text" class="name" id="s-kid1" maxlength="20" autocomplete="off" value="${esc(kidNames.holden || '')}" placeholder="Holden"></label>
      <label class="toggle kidnm"><div>Kid 2 name<small>🐙 Blank = Quentin</small></div><input type="text" class="name" id="s-kid2" maxlength="20" autocomplete="off" value="${esc(kidNames.quentin || '')}" placeholder="Quentin"></label></div>
    ${isKid() ? '' : `<label class="toggle"><div>Your name<small>Shown on the home screen</small></div><input type="text" class="name" id="s-name" maxlength="20" autocomplete="off" value="${esc(nm())}"></label>`}
    <label class="toggle"><div>Auto paw marks<small>Mark spots a new corgi rules out</small></div><input type="checkbox" id="s-auto" ${s.autoPaws ? 'checked' : ''}></label>
    <label class="toggle"><div>Relaxed mode<small>Mistakes never cost treats</small></div><input type="checkbox" id="s-relax" ${s.relaxed ? 'checked' : ''}></label>
    <label class="toggle"><div>Show timer</div><input type="checkbox" id="s-timer" ${s.timer ? 'checked' : ''}></label>
    <label class="toggle"><div>Easy double-tap<small>More time between taps, and a little finger wiggle is OK</small></div><input type="checkbox" id="s-easytap" ${s.easyTap ? 'checked' : ''}></label>
    <label class="toggle"><div>Dress up board corgis<small>Corgis on the board wear ${isKid() ? 'your' : 'Cheddar\'s'} hat and glasses</small></div><input type="checkbox" id="s-dress" ${s.dressBoard ? 'checked' : ''}></label>
    <label class="toggle"><div>Summit sparkles<small>Twinkly stars on a summit frame around the board</small></div><input type="checkbox" id="s-spark" ${s.sparkles ? 'checked' : ''}></label>
    <label class="toggle"><div>Field research mode 🔬<small>Rate how hard each puzzle felt, 1–10, to help tune the game</small></div><input type="checkbox" id="s-research" ${s.research ? 'checked' : ''}></label>
    <button class="cta alt" id="s-report">📤 Send report <small>(${report().count} solved, ${report().rated} rated)</small></button>
    <div class="backup"><b>Backup</b><small>Keeps coins and progress safe if Safari clears the site. Adding Corgidoku to the Home Screen helps too.</small>
      <div class="two"><button class="cta alt" id="s-copy">📋 Copy backup code</button><button class="cta alt" id="s-restore">📥 Restore from code</button></div></div>
    <button class="cta" id="s-done">Done</button>`);
  $('s-copy').onclick = () => { apply(); copyBackup(); };
  $('s-restore').onclick = () => restoreSheet();
  $('s-report').onclick = () => { s.research = $('s-research').checked; save(); sendReport(); };
  const apply = () => {
    s.autoPaws = $('s-auto').checked; s.relaxed = $('s-relax').checked; s.timer = $('s-timer').checked; s.research = $('s-research').checked; s.easyTap = $('s-easytap').checked; s.dressBoard = $('s-dress').checked; s.sparkles = $('s-spark').checked;
    if ($('s-name')) s.name = $('s-name').value.trim();
    kidNames = { holden: $('s-kid1').value.trim(), quentin: $('s-kid2').value.trim() };
    try { localStorage.setItem(NAMES_KEY, JSON.stringify(kidNames)); } catch {}
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
  applyScene();
}

// ---------- boot ----------
document.body.insertAdjacentHTML('afterbegin', artDefs); // the shared die-cut filter for every Cheddar
Promise.all(Object.entries(MODES).map(([k, m]) => fetch(m.file).then((r) => r.json()).then((d) => { DATA[k] = d; })))
  .then(() => { useMode(mode()); applyScene(); renderHome(); modesFor().forEach((m) => ensureBonus(m)); })
  .catch(() => { $('home').innerHTML = '<p style="margin-top:40vh;font-weight:800">Cheddar couldn\'t find the puzzles. Check your connection and reopen.</p>'; });

document.addEventListener('visibilitychange', () => { if (document.hidden && G && !G.solved && $('play').classList.contains('on')) persist(); });
