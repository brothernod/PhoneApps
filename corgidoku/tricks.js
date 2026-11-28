// Cheddar's tricks (v1.35): the lessons. One short lesson per rung of the SPEC ladder, each with
// Show it (a tiny board and the trick in a sentence or two), Watch it (one move, step by step) and
// 10 practice boards from lessons.json (tools/lessons.mjs). The boards, the outlines and every
// "why" come from the engine's step evidence, the same place Sniff gets its hints.
//
// Per player (db.lessons[id]): { seen, done, at, board, help: [], skipped: [], paid, more, mb }
//   seen     the lesson was opened (finished, skipped or left): the pop-up card stops offering it
//   board    the first unfinished practice board (0-9), where the lesson picks up
//   help     boards done with Show me     skipped  boards still open when Skip was tapped
//   paid     the one-time coins were paid (shop.js lessonPay)
//   more     More practice sets finished  mb       the board to pick up at in the current More set
// db.lessonSnooze[id] = the date "Not now" was tapped on the pop-up card (it waits about a week).
import { decodeRegions, decodeSolution, makeBoard } from './engine.js';
import { cheddarHead, cheddarLoaf, paw, coinIcon } from './art.js';
import { lessonPay, LESSON_PAY } from './shop.js';

export const TRICKS = ['The rules', 'Last spot', 'Confined', 'Would block', 'Pair lock', 'Group lock', 'What if'];
// Track = the lessons a mode needs. Kids' Chill is the Chill track.
export const TRACKS = { chill: 3, cozy: 4, hard: 5, extreme: 6 };
const TRACK_OF = { kids: 'chill', cozy: 'cozy', hard: 'hard', extreme: 'extreme' };
const TRACK_LABEL = { chill: '🐣 Chill', cozy: '🌈 Cozy', hard: '🔥 Hard', extreme: '⚡ Extreme' };
const TRACK_NAME = { chill: 'Chill', cozy: 'Cozy', hard: 'Hard', extreme: 'Extreme' };
const SNOOZE_DAYS = 7;

let X = null; // the app's helpers (initTricks)
let D = null; // lessons.json
let Dp = null;
export function initTricks(ctx) { X = ctx; }
export function loadLessons() {
  if (D) return Promise.resolve(D);
  return (Dp ||= fetch('lessons.json').then((r) => r.json()).then((d) => (D = d)).catch(() => { Dp = null; return null; }));
}

// ---------- progress ----------
const db = () => X.db();
const kid = () => X.isKid();
const recs = () => (db().lessons ||= {});
const rec = (id) => (recs()[id] ||= {});
const peek = (id) => recs()[id] || {};
export const trickDone = (id) => !!peek(id).done;
const highestSeen = () => { let h = -1; for (const [k, r] of Object.entries(recs())) if (r.seen || r.done) h = Math.max(h, Number(k)); return h; };
const trackOfMode = () => TRACK_OF[X.mode()] || 'cozy';
const tracksFor = () => X.modesFor().map((m) => TRACK_OF[m]);
const inTrack = (id, t) => id <= TRACKS[t];
// The lesson's first track (where its main boards 9-10 fit), or the one asked for if it has the lesson.
const firstTrack = (id) => ['chill', 'cozy', 'hard', 'extreme'].find((t) => inTrack(id, t) && (id <= 3 || t !== 'chill'));
const trackFor = (id, want) => (want && inTrack(id, want) ? want : firstTrack(id));
const pay = () => (kid() ? LESSON_PAY.kid : LESSON_PAY.grown);

// The pop-up card: a puzzle whose stored level is above every lesson done or seen, unless "Not now"
// was tapped for that lesson in the last week. Returns the lesson id to offer, or null.
export function trickOffer(lv) {
  if (!(lv >= 1 && lv <= 6) || lv <= highestSeen()) return null;
  if (!tracksFor().some((t) => inTrack(lv, t))) return null;
  const s = (db().lessonSnooze || {})[lv];
  if (s && X.addDays(s, SNOOZE_DAYS) > X.todayISO()) return null;
  return lv;
}
export function snoozeTrick(id) { (db().lessonSnooze ||= {})[id] = X.todayISO(); X.save(); }

// ---------- wording ----------
// K = kid. Grown-ups get the exact idea; kids get shorter, simpler lines (colors, not "yards").
const plural = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
const andList = (a) => (a.length < 3 ? a.join(' and ') : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`);
function namer(S) {
  const yard = (k) => X.YARD_NAMES[S.pal[k]] || 'colored';
  const K = kid();
  // "the blue yard" (kids: "the blue color") / "this row"
  const unit = (u, the = 'this') => (u.kind === 'yard' ? `the ${yard(u.i)} ${K ? 'color' : 'yard'}` : `${the} ${u.kind}`);
  const yards = (ids) => `the ${andList(ids.map(yard))} ${K ? 'colors' : 'yards'}`;
  const lines = (kind, k) => `these ${k} ${kind}s`;
  return { yard, unit, yards, lines, K };
}
const INTRO = {
  0: ['One corgi in every row, every column and every yard. And corgis never touch, not even corner to corner.',
    'One corgi in each row, each column and each color. And corgis never touch, not even at the corners!'],
  1: ['When a row, column or yard has only one spot left that could hold a corgi, the corgi goes there.',
    'If a row, column or color has just one empty spot left, the corgi goes there!'],
  2: ['If every spot left in a yard is in one row, that yard\'s corgi takes the row, so the rest of the row is out. It works with columns too, and the other way round: if a row only has room in one yard, the rest of that yard is out.',
    'If a color only has room in one row, its corgi uses up that row. So the rest of the row gets paws! A row with room in just one color works too: the rest of that color gets paws!'],
  3: ['Before a corgi goes on a spot, ask: would it take away every spot left in some other row, column or yard? If it would, no corgi can go there.',
    'Would a corgi here leave a row or color with no room at all? Then no corgi can go here!'],
  4: ['If two yards only have spots in the same two rows, their two corgis fill both rows, so the rest of those rows is out. It works with columns, and the other way round: if two rows only have room in two yards, the rest of those yards is out.',
    'Two colors that only fit in the same two rows use up both rows. So the rest of those rows gets paws!'],
  5: ['A pair lock with more yards: three yards that only fit in the same three rows fill all three, so the rest of those rows is out. It works with columns, with four or more, and the other way round.',
    'Like a pair lock, but bigger: three colors that only fit in the same three rows use them all up. So the rest of those rows gets paws!'],
  6: ['Stuck? Pretend a corgi sits on a spot, then follow only the corgis it forces. If some row, column or yard runs out of room, that spot is out. No guessing: you only look ahead.',
    'Pretend a corgi sits on a spot. Follow the corgis it forces. If a row, column or color runs out of room, that spot gets a paw!'],
};
const RULE = {
  side: ['These two corgis touch side by side.', 'These two corgis are touching!'],
  diagonal: ['These two corgis touch corner to corner.', 'These two corgis touch at the corners!'],
  row: ['This row has two corgis.', 'Two corgis in one row!'],
  column: ['This column has two corgis.', 'Two corgis in one column!'],
  yard: ['This yard has two corgis.', 'Two corgis in one color!'],
};
const ruleText = (rule, K) => RULE[rule][K ? 1 : 0];

// The task line above the board. help = the outline is showing.
function askText(S, b, outlined) {
  const N = namer(S), K = N.K, L = S.id, k = b.count, st = b.step, name = TRICKS[L];
  if (L === 0) return K ? 'Two corgis are breaking a rule. Tap one!' : 'Two corgis break a rule. Tap one of them.';
  if (L === 1) return outlined ? (K ? `Find the last spot in ${N.unit(st.unit, 'the outlined')}. Double-tap it!` : `Find the last spot in ${N.unit(st.unit, 'the outlined')} and double-tap it.`)
    : (K ? 'There\'s a last spot here. Find it and double-tap!' : 'There\'s a Last spot on this board. Find it and double-tap it.');
  if (L === 6) return outlined ? (K ? `Pretend a corgi is on a spot. If ${N.unit(st.dead, 'the outlined')} runs out of room, paw that spot!` : `Paw a spot where a what if leaves ${N.unit(st.dead, 'the outlined')} with no room.`)
    : (K ? 'Find a what if: paw a spot that runs into a dead end.' : 'There\'s a What if on this board. Paw a spot that runs into a dead end.');
  const spots = plural(k, 'spot'), the = k === 1 ? 'the spot' : `the ${k} spots`;
  if (!outlined) return K ? `Find the ${name} trick here: ${spots} to paw.` : `There's a ${name} on this board. Find it: ${spots} to paw.`;
  if (L === 2) return K ? `Look at ${N.unit(st.unit, 'the outlined')}. Paw ${the} its corgi blocks.` : `Paw ${the} that ${N.unit(st.unit, 'the outlined')} rules out.`;
  if (L === 3) return K ? `Paw ${the} that would leave ${N.unit(st.unit, 'the outlined')} with no room.` : `Paw ${the} where a corgi would leave ${N.unit(st.unit, 'the outlined')} with no room.`;
  const g = st.group;
  const who = g.kind === 'yard' ? N.yards(g.ids) : `the outlined ${g.kind}s`;
  return K ? `${cap(who)} work together. Paw ${the} their corgis block.` : `Look at ${who} together. Paw ${the} their ${name.toLowerCase()} rules out.`;
}

// Why a right tap is right (for the tapped cell i). Used in Watch it too.
function rightText(S, b, i, chain, shown = false) {
  if (shown) return rightText(S, b, i, chain).replace(/^(Right|Yes)! /, '');
  const N = namer(S), K = N.K, L = S.id, st = b.step;
  if (L === 0) return `${K ? 'Yes!' : 'Right!'} ${ruleText(b.rule, K)}`;
  if (L === 1) return K ? `Yes! The last spot in ${N.unit(st.unit)}.` : `Right! That's the last spot in ${N.unit(st.unit)}.`;
  if (L === 2) {
    if (st.unit.kind === 'yard') return K ? `Yes! ${cap(N.unit(st.unit))}'s corgi uses this ${st.line.kind}, so no corgi here.` : `Right! ${cap(N.unit(st.unit))} only fits in this ${st.line.kind}, so its corgi takes the ${st.line.kind} and this spot is out.`;
    return K ? `Yes! The ${N.yard(st.yard)} color's corgi has to be in this ${st.unit.kind}, so no corgi here.` : `Right! This ${st.unit.kind} only has room in the ${N.yard(st.yard)} yard, so that yard's corgi sits in this ${st.unit.kind} and this spot is out.`;
  }
  if (L === 3) return K ? `Yes! A corgi there leaves ${N.unit(st.unit)} with no room.` : `Right! A corgi there would leave ${N.unit(st.unit)} with no room.`;
  if (L === 4 || L === 5) {
    const g = st.group, c = st.cover, k = g.ids.length;
    if (g.kind === 'yard') return K ? `Yes! ${cap(N.yards(g.ids))} fill these ${k} ${c.kind}s, so no corgi here.` : `Right! ${cap(N.yards(g.ids))} only fit in these ${k} ${c.kind}s, so their ${k} corgis fill them and this spot is out.`;
    return K ? `Yes! The ${andList(c.ids.map(N.yard))} corgis have to go in these ${k} ${g.kind}s, so no corgi here.` : `Right! These ${k} ${g.kind}s only have room in ${N.yards(c.ids)}, so those yards' corgis sit in these ${g.kind}s and this spot is out.`;
  }
  const d = chain.chain.length, dead = N.unit(chain.dead);
  if (K) return d === 0 ? `Yes! ${cap(dead)} has no room. So no corgi here.` : `Yes! Then ${d === 1 ? 'corgi 1 has' : `corgis 1 to ${d} have`} to go in, and then ${dead} has no room. So no corgi here.`;
  const forced = d === 1 ? 'It forces corgi 1, and then' : `It forces corgis 1 to ${d}, and then`;
  return d === 0 ? `Right! ${cap(dead)} runs out of room. So no corgi can go here.` : `Right! ${forced} ${dead} runs out of room. So no corgi can go here.`;
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// ---------- one board ----------
// The board as the grader had it: corgis, the paws it had worked out (p), and the faint paws the
// corgis rule out for free. found = answer cells the player got, miss = paws that weren't right.
function boardState(S, b) {
  const src = D.boards[b.src], n = src.n, reg = decodeRegions(src.r), sol = decodeSolution(src.s);
  const B = makeBoard(n, reg);
  const P = { b, n, reg, sol, B, corgi: new Set(b.c), given: new Set(b.p), found: new Set(), miss: new Set(), scratch: new Set(), wrongs: 0, help: false, done: false, outline: b.help === 'outline' || b.tier === 'show', hist: [] };
  return P;
}
// cand/placed for the engine: corgis, plus every paw the logic knows (given, found, auto).
function engineState(P) {
  const { B } = P, cand = new Uint8Array(B.N).fill(1), placed = new Uint8Array(B.N);
  for (const i of P.corgi) { placed[i] = 1; for (const j of B.peers[i]) cand[j] = 0; }
  for (const i of [...P.given, ...P.found]) if (!placed[i]) cand[i] = 0;
  return { cand, placed };
}
const autoSet = (P) => { const s = new Set(); for (const i of P.corgi) for (const j of P.B.peers[i]) if (!P.corgi.has(j)) s.add(j); return s; };
const live = (P) => { const { cand, placed } = engineState(P); return (i) => cand[i] && !placed[i]; };
const unitCells = (P, u) => (u.kind === 'row' ? P.B.rows : u.kind === 'column' ? P.B.cols : P.B.regs)[u.i];
// Follow a what if from i: place it, then only forced corgis (last spots), as the engine does.
function follow(P, i, limit = 6) {
  const { B } = P, { cand, placed } = engineState(P), c = cand.slice(), p = placed.slice(), chain = [];
  const put = (j) => { p[j] = 1; for (const k of B.peers[j]) c[k] = 0; };
  put(i);
  for (let depth = 0; ; depth++) {
    let forced = -1, via = null;
    for (const u of B.units) {
      if (u.cells.some((x) => p[x])) continue;
      let left = 0, last = -1;
      for (const x of u.cells) if (c[x] && !p[x]) { left++; last = x; }
      if (!left) return { chain, dead: { kind: u.kind, i: u.i } };
      if (left === 1 && forced < 0) { forced = last; via = u; }
    }
    if (forced < 0 || depth >= limit) return { chain, dead: null };
    put(forced);
    chain.push({ cell: forced, unit: { kind: via.kind, i: via.i } });
  }
}

// ---------- the session ----------
let S = null; // { id, track, kind: 'main'|'more', set: [boards], k, stage, frame, P, back, backLabel, tour }
let busy = 0; // input locked until (a right-tap drawing is playing)
let fxTok = 0; // the latest drawing; an older one's timer leaves a newer one alone
const $ = (id) => document.getElementById(id);

function setFor(id, kind, track) {
  const L = D.lessons[id];
  if (kind === 'main') return [...L.main.slice(0, 8), ...(track === firstTrack(id) ? L.main.slice(8) : L.finale[track] || L.main.slice(8))];
  const sp = L.spares[(peek(id).more || 0) % L.spares.length];
  return [...sp.boards, ...(sp.finale[track] || Object.values(sp.finale)[0])];
}

// Open a lesson. start: 'auto' (Show it if new, else pick up at the first unfinished board),
// 'intro' (Show it and Watch it, then practice), 'practice', 'more'. back: where Play my puzzle /
// the back arrow goes (default the Cheddar's tricks page). tour: the welcome tour (rules, then Last spot).
export function openLesson(id, { start = 'auto', track, back = null, backLabel = '', tour = false } = {}) {
  return loadLessons().then((d) => {
    if (!d) return X.sheet('<h3>Hmm</h3><p>Cheddar couldn\'t fetch the tricks. Check your connection and try again.</p><button class="cta" id="okt">OK</button>'), ($('okt').onclick = X.closeSheet);
    const r = rec(id);
    r.seen = 1; X.save();
    const t = trackFor(id, track || trackOfMode());
    const more = start === 'more' || (start === 'intro' && r.done);
    S = { id, track: t, kind: more ? 'more' : 'main', set: setFor(id, more ? 'more' : 'main', t), k: 0, stage: 'show', frame: 0, P: null, back, backLabel, tour };
    if (more) S.k = Math.min(r.mb || 0, 9);
    else S.k = Math.min(r.board || 0, 9);
    if (start === 'auto' && r.done) return openLesson(id, { start: 'more', track, back, backLabel });
    if (start === 'practice' || start === 'more' || (start === 'auto' && r.board)) startPractice(S.k);
    else showIt();
  });
}

function leave() {
  const back = S?.back;
  S = null;
  if (back) back(); else renderTricks();
}

// The lesson screen: bar, stage label, practice prints, the task, the board, Cheddar, tools.
function frameHtml(title, sub) {
  const from = S.back && S.backLabel;
  return `<div class="bar"><button class="back" id="l-back" aria-label="${from ? esc(S.backLabel) : 'Back to Cheddar\'s tricks'}">‹</button><h2>${esc(title)}</h2><button class="lskip" id="l-skip">Skip</button></div>
    <div class="lsub" id="l-sub">${sub}</div>
    <div class="lprints" id="l-prints"></div>
    <div class="lask" id="l-ask"></div>
    <div class="board lboard" id="lboard"></div>
    <div class="bubble lbub"><div class="face">${cheddarHead()}</div><p id="l-msg"></p></div>
    <div class="tools" id="l-tools"></div>
    ${from ? `<button class="lback2" id="l-mine">${esc(S.backLabel)} ›</button>` : ''}`;
}
const esc = (t) => X.esc(t);
function mount(title, sub) {
  const el = $('lesson');
  el.innerHTML = frameHtml(title, sub);
  $('l-back').onclick = () => { savePos(); leave(); };
  $('l-skip').onclick = skip;
  if ($('l-mine')) $('l-mine').onclick = () => { savePos(); leave(); };
  X.show('lesson');
}
function msg(t, kind = '') { const m = $('l-msg'); if (!m) return; m.textContent = t; m.className = kind; m.classList.toggle('long', t.length > 120); }
function tools(btns) {
  $('l-tools').innerHTML = btns.map((b) => `<button class="tool${b.main ? ' main' : ''}" id="${b.id}"${b.off ? ' disabled' : ''}>${b.e ? `<span class="e">${b.e}</span>` : ''}${b.label}</button>`).join('');
  for (const b of btns) if (b.go) $(b.id).onclick = b.go;
}

// Skip: ends the lesson where it is. The boards not done stay open, and the lesson counts as seen.
function skip() {
  if (!S) return;
  if (S.kind === 'main') {
    const r = rec(S.id);
    const from = r.done ? 10 : Math.min(r.board || 0, 10);
    r.skipped = [...Array(10).keys()].filter((k) => k >= from);
    r.seen = 1; X.save();
  } else savePos();
  leave();
}
function savePos() {
  if (!S) return;
  const r = rec(S.id);
  if (S.kind === 'more') r.mb = S.stage === 'practice' ? S.k + (S.P?.done ? 1 : 0) : r.mb || 0;
  X.save();
}

// ---------- Show it ----------
function showIt() {
  S.stage = 'show';
  const L = D.lessons[S.id], b = L.show;
  mount(TRICKS[S.id], `Show it${S.kind === 'more' ? ' · replay' : ''}`);
  S.P = boardState(S, b);
  S.pal = X.yardPerm(`t:${b.src}`, S.P.n);
  buildBoard(S.P, false);
  paint(S.P, { notation: true });
  $('l-ask').innerHTML = '';
  msg(INTRO[S.id][kid() ? 1 : 0] + (kid() ? ' Here\'s one!' : ' Here\'s one. The outline shows where to look.'));
  tools([{ id: 'l-watch', e: '▶️', label: 'Watch it', main: true, go: () => watchIt(0) }]);
}

// ---------- Watch it: one move in three frames, with Back and Next ----------
function watchIt(f) {
  S.stage = 'watch'; S.frame = f;
  const L = D.lessons[S.id], b = L.show, P = S.P;
  $('l-sub').textContent = `Watch it · ${f + 1} of 3`;
  // frame 3 shows the move made; frames 1-2 the board before it
  const after = f === 2;
  P.found = new Set(after && S.id >= 2 ? b.ans : []);
  if (S.id === 1) { P.corgi = new Set(after ? [...b.c, b.ans[0]] : b.c); }
  P.outline = f === 0;
  paint(P, { notation: true, fresh: after ? b.ans : [] });
  clearFx();
  const N = namer(S), K = N.K, st = b.step, id = S.id;
  let t = '';
  if (f === 0) {
    spot(st.look);
    if (id === 0) t = b.rule === 'side' || b.rule === 'diagonal' ? (K ? 'Look at these two corgis.' : 'Look at these two corgis.') : `Look at ${N.unit(st.unit)}.`;
    else if (id === 6) { ghost(st.cells[0], '?'); t = K ? 'What if a corgi sat on the ? spot?' : 'What if a corgi sat on the ? spot? Let\'s look ahead.'; }
    else if (id === 4 || id === 5) t = st.group.kind === 'yard' ? `Look at ${N.yards(st.group.ids)} together.` : `Look at ${N.lines(st.group.kind, st.group.ids.length)} together.`;
    else t = `Look at ${N.unit(st.unit)}.`;
  } else if (f === 1) {
    if (id === 0) { for (const i of b.ans) cellEl(i).classList.add('lclash'); t = ruleText(b.rule, K); }
    else if (id === 1) { spot(st.area); const i = b.ans[0]; cellEl(i).classList.add('glow'); t = K ? 'All the other spots have paws or corgis. Only one spot is left!' : 'Every other spot in it is pawed or ruled out by a corgi. Only one spot is left.'; }
    else if (id === 2) {
      spot(st.area);
      t = st.unit.kind === 'yard'
        ? (K ? `All its empty spots are in this ${st.line.kind}. So its corgi will be in this ${st.line.kind}.` : `Every spot left in it is in this ${st.line.kind}, so ${N.unit(st.unit)}'s corgi will sit in this ${st.line.kind}.`)
        : (K ? `All its empty spots are in the ${N.yard(st.yard)} color. So its corgi is the ${N.yard(st.yard)} corgi.` : `Every spot left in it is in the ${N.yard(st.yard)} yard, so this ${st.unit.kind}'s corgi is the ${N.yard(st.yard)} yard's corgi.`);
    } else if (id === 3) { reachFx(P, b.ans[0], unitCells(P, st.unit)); t = K ? `What if a corgi sat on the ? spot? The dark spots would get paws, and that's every spot left in ${N.unit(st.unit)}. No room!` : `What if a corgi sat on the ? spot? It would rule out every spot left in ${N.unit(st.unit)}. No room!`; }
    else if (id === 4 || id === 5) {
      spot(st.area);
      const g = st.group, c = st.cover, k = g.ids.length;
      t = g.kind === 'yard'
        ? (K ? `They only fit in these ${k} ${c.kind}s. ${k} colors, ${k} ${c.kind}s: their corgis use them all up.` : `Their spots all sit in these ${k} ${c.kind}s. ${k} yards, ${k} ${c.kind}s: their ${k} corgis fill every one of them.`)
        : (K ? `They only have room in ${N.yards(c.ids)}. ${k} ${g.kind}s, ${k} colors: those corgis go in these ${g.kind}s.` : `All their spots are in ${N.yards(c.ids)}. ${k} ${g.kind}s, ${k} yards: those yards' corgis must sit in these ${g.kind}s.`);
    } else { const ch = follow(P, st.cells[0]); chainFx(P, st.cells[0], ch); t = chainText(N, ch); }
  } else {
    if (id === 0) { for (const i of b.ans) cellEl(i).classList.add('lclash'); t = K ? 'That\'s not allowed, so one of them is in the wrong spot. In practice, tap a corgi that breaks a rule.' : 'That breaks a rule, so one of them is in the wrong spot. In practice, tap a corgi that breaks a rule.'; }
    else if (id === 1) t = K ? 'So the corgi goes there! Cheddar puts faint paws everywhere it blocks, for free.' : 'So the corgi goes there. The spots it rules out get faint paws for free.';
    else if (id === 6) t = K ? 'That can\'t happen! So the ? spot gets a paw. The pretend corgis go away.' : 'That can\'t happen, so the ? spot is out and gets a paw. The numbered corgis were only pretend, so they go away.';
    else {
      const k = b.ans.length, lt = letters(P, b.ans);
      t = id === 3 ? (K ? `So no corgi can go there. It gets a paw (${lt})!` : `So no corgi can go there. It gets a paw (${lt}).`)
        : (K ? `So ${k === 1 ? 'that spot gets' : 'those spots get'} a paw (${lt})!` : `So nothing else there can have a corgi: ${k === 1 ? 'that spot gets a paw' : 'those spots get paws'} (${lt}).`);
    }
  }
  msg(t);
  tools([
    { id: 'l-prev', e: '◀️', label: f ? 'Back' : 'Show it', go: () => (f ? watchIt(f - 1) : showIt()) },
    f < 2 ? { id: 'l-next', e: '▶️', label: 'Next', main: true, go: () => watchIt(f + 1) }
      : { id: 'l-go', e: '🐾', label: 'Practice', main: true, go: () => startPractice(S.k) },
  ]);
}
function chainText(N, ch) {
  const d = ch.chain.length, K = N.K, dead = ch.dead ? N.unit(ch.dead) : '';
  const via = (x) => (x.unit.kind === 'yard' ? (K ? `the last spot in ${N.unit(x.unit)}` : `the last spot in ${N.unit(x.unit)}`) : `the last spot in its ${x.unit.kind}`);
  const steps = ch.chain.map((x, k) => `corgi ${k + 1} (${via(x)})`);
  const nums = andList(ch.chain.map((_, k) => k + 1));
  if (K) return d ? `A corgi there means ${d === 1 ? 'corgi' : 'corgis'} ${nums} ${d === 1 ? 'has' : 'have'} to go in too. Then ${dead} has no room left!` : `A corgi there leaves ${dead} with no room!`;
  if (d >= 3) return `A corgi there would force corgis 1 to ${d}, each the last spot left in its row, column or yard. Then ${dead} has no room left: a dead end.`;
  return d ? `A corgi there would force ${andList(steps)}. Then ${dead} has no room left: a dead end.` : `A corgi there would leave ${dead} with no room: a dead end.`;
}
// The letters drawn on the given paws (a, b, c… in board order), continued for the new ones.
function letters(P, cells) {
  const base = P.given.size;
  return [...cells].sort((a, b) => a - b).map((_, k) => String.fromCharCode(97 + ((base + k) % 26))).join(', ');
}

// ---------- practice ----------
function startPractice(k) {
  S.stage = 'practice';
  S.k = Math.max(0, Math.min(9, k));
  const b = S.set[S.k];
  mount(TRICKS[S.id], '');
  S.P = boardState(S, b);
  S.pal = X.yardPerm(`t:${b.src}`, S.P.n);
  $('l-sub').textContent = S.kind === 'more' ? `More practice · board ${S.k + 1} of 10` : `Practice · board ${S.k + 1} of 10`;
  prints();
  buildBoard(S.P, true);
  paint(S.P);
  ask();
  msg(S.k === 0 ? (kid() ? 'Your turn! Undo takes back a paw.' : 'Your turn. There\'s no timer and no treats to lose. Undo takes back a paw.') : '');
  practiceTools();
}
function ask() {
  const P = S.P, b = P.b, L = S.id;
  const need = L === 0 || L === 6 ? 1 : b.count, got = P.found.size + (L === 1 && P.corgi.has(b.ans[0]) ? 1 : 0);
  $('l-ask').innerHTML = `<span>${esc(askText(S, b, P.outline))}</span><b class="lcount${got >= need ? ' ok' : ''}">${got} / ${need}</b>`;
}
function practiceTools() {
  const P = S.P;
  if (P.done) {
    const last = S.k >= 9;
    return tools([{ id: 'l-undo', e: '↩️', label: 'Undo', off: true }, { id: 'l-next', e: last ? '🎉' : '▶️', label: last ? 'Finish' : 'Next board', main: true, go: nextBoard }]);
  }
  const btns = [{ id: 'l-undo', e: '↩️', label: 'Undo', go: undo }];
  if (P.wrongs >= 3) btns.push({ id: 'l-show', e: '👀', label: 'Show me', main: true, go: showMe });
  tools(btns);
}
// 10 paw prints: filled = done alone, outlined = done with help, empty = not done yet.
function prints() {
  const r = peek(S.id), el = $('l-prints');
  if (!el) return;
  let html = '';
  for (let k = 0; k < 10; k++) {
    let st = 'todo';
    if (S.kind === 'main') { if (r.done || k < (r.board || 0)) st = (r.help || []).includes(k) ? 'help' : 'alone'; }
    else if (k < S.k || (k === S.k && S.P?.done)) st = S.helped?.has(k) ? 'help' : 'alone';
    html += `<i class="lp ${st}${k === S.k ? ' cur' : ''}" aria-label="Board ${k + 1}: ${st === 'todo' ? 'not done' : st === 'help' ? 'done with help' : 'done'}">${paw(false)}</i>`;
  }
  el.innerHTML = html;
}

function boardDone(withHelp) {
  const P = S.P;
  P.done = true;
  if (withHelp) P.help = true;
  if (S.kind === 'main') {
    const r = rec(S.id);
    if (!r.done) {
      r.board = Math.max(r.board || 0, S.k + 1);
      if (withHelp && !(r.help ||= []).includes(S.k)) r.help.push(S.k);
      if (r.skipped) r.skipped = r.skipped.filter((x) => x !== S.k);
    }
  } else {
    (S.helped ||= new Set());
    if (withHelp) S.helped.add(S.k);
    rec(S.id).mb = S.k + 1;
  }
  X.save();
  prints(); ask(); practiceTools();
  if (navigator.vibrate) navigator.vibrate(30);
}
function nextBoard() {
  if (S.k < 9) return startPractice(S.k + 1);
  finish();
}
// All 10 done: the lesson's ✓ and its one-time coins (main set), or a fresh set next time (More).
function finish() {
  const r = rec(S.id), id = S.id, name = TRICKS[id];
  let coins = 0, first = false;
  if (S.kind === 'main') {
    first = !r.done;
    r.done = 1; r.at ||= X.todayISO(); r.board = 10; r.skipped = [];
    coins = lessonPay(db(), id, kid());
  } else { r.more = (r.more || 0) + 1; r.mb = 0; }
  X.save();
  const K = kid(), tour = S.tour && id === 0 && !trickDone(1);
  const badge = trackBadges().find((t) => t.newly);
  const leaveBtn = S.back && S.backLabel ? S.backLabel : 'Cheddar\'s tricks';
  X.sheet(`<div style="width:130px;margin:0 auto">${cheddarLoaf(X.dressed())}</div>
    <h3>${S.kind === 'more' ? 'Practice done! 🐾' : first ? `${name} ✓` : `${name} again ✓`}</h3>
    <p>${S.kind === 'more' ? (K ? 'Ten more boards! You\'re getting so good at this.' : 'Ten more boards done. That trick is sticking.') : first ? (id === 0 ? (K ? 'You know the rules! Cheddar is so proud.' : 'You know the rules. Next up: the tricks that solve every board.') : K ? `You learned ${name}! Cheddar is so proud.` : `You know ${name} now. Watch for it in your puzzles.`) : 'All 10 boards done again.'}</p>
    ${coins ? `<div class="earn">${coinIcon()} +${coins} coins<span>for finishing the lesson</span></div>` : ''}
    ${badge ? `<div class="earn lbadge-earn">🎓 Ready for ${TRACK_NAME[badge.t]} ✓<span>${K ? 'You know every trick for it!' : `You know every trick ${TRACK_NAME[badge.t]} needs.`}</span></div>` : ''}
    ${tour ? '<button class="cta" id="lf-next">Next trick: Last spot ▶</button>' : ''}
    <button class="cta${tour ? ' alt' : ''}" id="lf-more">More practice 🐾</button>
    <button class="cta alt" id="lf-out">${esc(leaveBtn)}</button>`);
  if (badge) markBadges();
  const back = S.back, label = S.backLabel;
  if ($('lf-next')) $('lf-next').onclick = () => { X.closeSheet(); openLesson(1, { start: 'intro', back, backLabel: label, tour: true }); };
  $('lf-more').onclick = () => { X.closeSheet(); openLesson(id, { start: 'more', track: S?.track, back, backLabel: label }); };
  $('lf-out').onclick = () => { X.closeSheet(); leave(); };
}

// ---------- practice input ----------
// Lessons 2-6: every tap paws a spot (judged at once). Last spot: tap = a scratch paw, double-tap =
// a corgi (judged). The rules: tap a corgi (judged). Found answers stay put; wrong paws stay as
// marks until Undo or a second tap takes them back.
let lastTap = { i: -1, t: 0 };
function onTap(i) {
  if (!S || S.stage !== 'practice' || performance.now() < busy) return;
  const P = S.P, b = P.b, L = S.id;
  if (P.done) return msg(kid() ? 'All done here! Tap Next board.' : 'This one\'s done. Tap Next board.');
  clearFx(); fxTok++;
  if (L === 0) {
    if (!P.corgi.has(i)) return msg(kid() ? 'Tap one of the corgis!' : 'Tap one of the corgis.');
    if (b.ans.includes(i)) { P.found.add(i); paint(P); rightFx(i); return; }
    return wrongFx(i);
  }
  if (P.corgi.has(i)) return msg(kid() ? 'That corgi is staying put.' : 'That corgi is already in its spot.');
  if (P.found.has(i)) return msg(kid() ? 'You found that one already!' : 'You already found that one.');
  if (P.given.has(i) || autoSet(P).has(i)) return msg(kid() ? 'That spot already has a paw.' : 'That spot is already ruled out.');
  if (L === 1) {
    const now = performance.now(), quick = lastTap.i === i && now - lastTap.t < X.tapWindow();
    lastTap = quick ? { i: -1, t: 0 } : { i, t: now };
    if (!quick) {
      P.hist.push({ scratch: new Set(P.scratch), miss: new Set(P.miss) });
      if (P.scratch.has(i)) P.scratch.delete(i); else P.scratch.add(i);
      paint(P);
      if (i === b.ans[0] && P.scratch.has(i)) msg(kid() ? 'Psst: a corgi goes there! Tap it two times fast.' : 'Hmm, that\'s a corgi spot. Double-tap to place a corgi.');
      return;
    }
    // the second tap of a double-tap: take back the scratch paw from the first tap
    const h = P.hist.pop(); if (h) { P.scratch = h.scratch; P.miss = h.miss; }
    if (i === b.ans[0]) { P.scratch.delete(i); P.corgi.add(i); paint(P, { fresh: [i] }); rightFx(i); return; }
    paint(P);
    return wrongFx(i);
  }
  if (P.miss.has(i)) { P.hist.push({ miss: new Set(P.miss) }); P.miss.delete(i); paint(P); return msg(kid() ? 'Paw taken back.' : 'Paw taken back.'); }
  const ok = L === 6 ? (b.ok || b.ans).includes(i) : b.ans.includes(i);
  if (ok) { P.found.add(i); paint(P, { fresh: [i] }); rightFx(i); return; }
  P.hist.push({ miss: new Set(P.miss) });
  P.miss.add(i); paint(P);
  wrongFx(i);
}
function undo() {
  const P = S?.P;
  if (!P || P.done) return;
  if ($('lboard').querySelector('.sng,.lreach,.glow,.sn-d,.lclash') || $('lboard').classList.contains('spot')) { clearFx(); return msg(''); }
  const h = P.hist.pop();
  if (!h) return msg(kid() ? 'Nothing to undo!' : 'Nothing to undo yet. Found spots stay found.');
  if (h.miss) P.miss = h.miss;
  if (h.scratch) P.scratch = h.scratch;
  paint(P);
}

const rm = () => X.reduceMotion();
function rightFx(i) {
  const P = S.P, b = P.b, L = S.id, st = b.step;
  let t = '', wait = rm() ? 300 : 1500;
  if (L === 0) { for (const j of b.ans) cellEl(j).classList.add('lclash'); if (st.unit) spot(unitCells(P, st.unit)); t = rightText(S, b, i); }
  else if (L === 1) { spot(unitCells(P, st.unit)); t = rightText(S, b, i); wait = rm() ? 300 : 900; }
  else if (L === 2 || L === 4 || L === 5) { spot(st.area); t = rightText(S, b, i); }
  else if (L === 3) {
    // the ghost corgi drops on the tapped spot, its reach is shaded, the emptied unit flashes red
    const u = unitCells(P, st.unit);
    P.found.delete(i); paint(P);
    reachFx(P, i, u);
    P.found.add(i);
    t = rightText(S, b, i);
  } else {
    P.found.delete(i); paint(P);
    const ch = follow(P, i);
    chainFx(P, i, ch);
    P.found.add(i);
    t = rightText(S, b, i, ch);
    wait = rm() ? 400 : 2200;
  }
  const L1 = L === 1, need = L === 0 || L === 6 ? 1 : b.count, got = L1 ? 1 : P.found.size;
  const left = need - got;
  msg(t + (left > 0 ? ` ${left} more to find.` : ''), 'good');
  ask();
  busy = performance.now() + (left > 0 ? Math.min(wait, 1100) : wait);
  const tok = ++fxTok;
  setTimeout(() => {
    if (!S || S.stage !== 'practice' || S.P !== P) return;
    if ((L === 3 || L === 6) && tok === fxTok) { clearFx(); paint(P, { fresh: [i] }); }
    if (left <= 0) { boardDone(false); msg(`${t} ${kid() ? 'You got it all! 🎉' : 'That\'s the whole trick. 🎉'}`, 'good'); }
  }, wait);
}
function wrongFx(i) {
  const P = S.P, b = P.b, L = S.id, st = b.step, N = namer(S), K = N.K;
  P.wrongs++;
  // a second miss on boards 7-10 brings the outline back (drawn first, so the drawing goes on top)
  const outlineBack = !P.outline && P.wrongs >= 2 && (b.tier === 'C' || b.tier === 'D');
  if (outlineBack) { P.outline = true; paint(P); ask(); }
  const isLive = live(P);
  let t = '';
  if (L === 0) {
    // a corgi that follows every rule: its reach is shaded and no other corgi is in it
    reachFx(P, i, [], true);
    t = K ? 'That corgi is following every rule. Look for two that clash!' : 'That corgi follows every rule: no other corgi in its row, column or yard, and none touching it.';
  } else if (L === 6) {
    const ch = follow(P, i);
    chainFx(P, i, ch);
    t = K ? 'From here, nothing runs out of room. Try another spot!' : ch.chain.length ? 'From here the forced corgis stop with room left in every row, column and yard. This what if doesn\'t rule the spot out.' : 'From here no corgi is forced, and every row, column and yard still has room. This what if doesn\'t rule the spot out.';
  } else if (L === 1) {
    // the unit through i with the fewest spots left: it still has others, so i isn't forced
    const us = P.B.units.filter((u) => u.cells.includes(i) && !u.cells.some((c) => P.corgi.has(c)));
    const u = us.sort((a, b2) => a.cells.filter(isLive).length - b2.cells.filter(isLive).length)[0];
    ghost(i, '?');
    const others = u ? u.cells.filter((c) => c !== i && isLive(c)) : [];
    for (const c of others) cellEl(c).classList.add('glow');
    t = u ? (K ? `${cap(N.unit(u))} still has ${plural(others.length, 'other spot')}, so the corgi doesn't have to go here.` : `${cap(N.unit(u))} still has ${plural(others.length, 'other spot')}, so a corgi here isn't forced yet.`) : 'Not this one.';
  } else {
    // the ghost corgi on the wrong spot, its reach shaded, and the trick's spots it leaves open glow
    // a spot inside the trick's own unit: a corgi there would fill it, so just show the unit
    const keep = L === 2 || L === 3 ? unitCells(P, st.unit) : st.look;
    if ((L === 2 || L === 3) && keep.includes(i)) { ghost(i, '?'); spot(keep); }
    else reachFx(P, i, keep, false, true);
    if (L === 2) {
      const inUnit = unitCells(P, st.unit).includes(i);
      if (st.unit.kind === 'yard') t = inUnit ? (K ? `That's inside ${N.unit(st.unit)}, where its corgi can go. Look outside it, in the same ${st.line.kind}.` : `That spot is inside ${N.unit(st.unit)}, where its corgi can still go. The trick rules out spots outside it, in the ${st.line.kind} it fills.`)
        : (K ? `That spot isn't in the ${st.line.kind} ${N.unit(st.unit)} uses.` : `That spot isn't in the ${st.line.kind} ${N.unit(st.unit)} fills, so the trick doesn't touch it.`);
      else t = inUnit ? (K ? `That's in this ${st.unit.kind}, where its corgi can go. Look in the ${N.yard(st.yard)} color, outside the ${st.unit.kind}.` : `That spot is in this ${st.unit.kind}, where its corgi can still go. The trick rules out the rest of the ${N.yard(st.yard)} yard.`)
        : (K ? `That spot isn't in the ${N.yard(st.yard)} color.` : `That spot isn't in the ${N.yard(st.yard)} yard, so the trick doesn't touch it.`);
    } else if (L === 3) {
      const inUnit = unitCells(P, st.unit).includes(i);
      const glowN = unitCells(P, st.unit).filter((c) => c !== i && isLive(c) && !P.B.peers[i].has(c)).length;
      t = inUnit ? (K ? `That's in ${N.unit(st.unit)} itself. A corgi there would fill it, not block it.` : `That spot is in ${N.unit(st.unit)} itself: a corgi there would fill it, not block it.`)
        : (K ? `${cap(N.unit(st.unit))} still has the glowing spot${glowN === 1 ? '' : 's'}, so this one doesn't block it.` : `With a corgi here, ${N.unit(st.unit)} still has the glowing spot${glowN === 1 ? '' : 's'}, so it isn't blocked.`);
    } else {
      const g = st.group, c = st.cover, k = g.ids.length;
      const inGroup = st.look.includes(i);
      const who = g.kind === 'yard' ? N.yards(g.ids) : N.lines(g.kind, k);
      const fills = g.kind === 'yard' ? `the ${k} ${c.kind}s ${who} fill` : `${N.yards(c.ids)}`;
      t = inGroup ? (K ? `That's inside ${who}, where their corgis go. Look at the other spots in the ${g.kind === 'yard' ? `${c.kind}s` : 'colors'} they use.` : `That spot is inside ${who}, where their corgis can still go. The lock rules out spots outside them, in ${g.kind === 'yard' ? `the ${k} ${c.kind}s they fill` : N.yards(c.ids)}.`)
        : (K ? `That spot isn't in ${fills}.` : `That spot isn't in ${fills}, so the lock doesn't reach it.`);
    }
  }
  if (outlineBack) t += K ? ' Cheddar outlined where to look.' : ' Cheddar outlined where to look.';
  if (P.wrongs === 3) t += K ? ' Stuck? Tap Show me.' : ' Stuck? Show me plays the answer.';
  if (L >= 2) t += ' Undo takes the paw back.';
  msg(t, 'bad');
  practiceTools();
  if (navigator.vibrate) navigator.vibrate(20);
}
// Show me: play the answer, then the board counts as done with help.
function showMe() {
  const P = S.P, b = P.b, L = S.id, st = b.step;
  if (P.done) return;
  clearFx(); fxTok++;
  P.miss.clear();
  const N = namer(S), K = N.K;
  let t = '';
  if (L === 0) {
    P.found.add(b.moved ?? b.ans[0]); paint(P);
    for (const j of b.ans) cellEl(j).classList.add('lclash');
    if (st.unit) spot(unitCells(P, st.unit));
    t = `${ruleText(b.rule, K)} ${K ? 'Either one breaks the rule.' : 'Either one of them is the answer.'}`;
  } else if (L === 1) {
    P.scratch.delete(b.ans[0]); P.corgi.add(b.ans[0]); paint(P, { fresh: b.ans }); spot(unitCells(P, st.unit));
    t = K ? `Here: the last spot in ${N.unit(st.unit)}.` : `Here it is: the last spot in ${N.unit(st.unit)}.`;
  } else {
    const rest = b.ans.filter((c) => !P.found.has(c));
    for (const c of b.ans) P.found.add(c);
    paint(P, { fresh: rest });
    if (L === 6) { const ch = follow(P, b.ans[0]); chainFx(P, b.ans[0], ch); t = `${chainText(N, ch)} ${K ? 'So the ? spot gets a paw.' : 'So the ? spot is out.'}`; }
    else if (L === 3) { reachFx(P, rest[0], unitCells(P, st.unit)); t = `${rightText(S, b, rest[0], null, true)}${rest.length > 1 ? (K ? ' The other dashed spots do that too.' : ' The same is true of every dashed spot.') : ''}`; }
    else { const one = rest.length === 1; spot(st.area); t = rightText(S, b, rest[0], null, true).replace(/this spot is out\.$/, one ? 'the dashed spot is out.' : 'the dashed spots are out.').replace(/so no corgi here\.$/, one ? 'so the dashed spot gets a paw.' : 'so the dashed spots get paws.'); }
    for (const c of rest) cellEl(c).insertAdjacentHTML('beforeend', `<span class="snx">${paw(false)}</span>`);
  }
  boardDone(true);
  msg(t, 'good');
}

// ---------- drawing ----------
function buildBoard(P, input) {
  const b = $('lboard');
  b.style.setProperty('--n', P.n);
  b.dataset.src = P.b.src; b.dataset.lesson = S.id; // which board this is (handy when testing)
  b.innerHTML = '';
  for (let i = 0; i < P.n * P.n; i++) {
    const d = document.createElement('div');
    d.className = 'cell'; d.dataset.i = i;
    const r = Math.floor(i / P.n), c = i % P.n, k = P.reg[i];
    if (r === 0 || P.reg[i - P.n] !== k) d.classList.add('bt');
    if (r === P.n - 1 || P.reg[i + P.n] !== k) d.classList.add('bb');
    if (c === 0 || P.reg[i - 1] !== k) d.classList.add('bl');
    if (c === P.n - 1 || P.reg[i + 1] !== k) d.classList.add('br');
    d.style.background = X.YARD_COLORS[S.pal[k]];
    b.appendChild(d);
  }
  b.onpointerdown = null; b.onpointerup = null;
  if (!input) return;
  let down = null;
  b.onpointerdown = (e) => { const el = e.target.closest('.cell'); down = el ? { i: Number(el.dataset.i), x: e.clientX, y: e.clientY } : null; };
  b.onpointerup = (e) => {
    if (!down) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cell');
    const i = el && b.contains(el) ? Number(el.dataset.i) : null;
    if (i === down.i || Math.hypot(e.clientX - down.x, e.clientY - down.y) <= X.tapSlop() + 6) onTap(down.i);
    down = null;
  };
}
const cellEl = (i) => $('lboard').children[i];
// notation (Show it / Watch it): corgis numbered, worked-out paws lettered, free paws faint.
function paint(P, { notation = false, fresh = [] } = {}) {
  const cells = $('lboard').children, auto = autoSet(P), look = P.outline ? new Set(outlineCells(P)) : null;
  const givenOrder = [...P.given].sort((a, b) => a - b), newOrder = [...P.found].filter((i) => !P.given.has(i)).sort((a, b) => a - b);
  const corgiOrder = [...P.corgi].sort((a, b) => a - b);
  for (let i = 0; i < cells.length; i++) {
    const el = cells[i];
    let h = '';
    if (P.corgi.has(i)) h = cheddarHead() + (notation ? `<b class="lnum">${corgiOrder.indexOf(i) + 1}</b>` : '');
    else if (P.found.has(i)) h = `<span class="lfound${fresh.includes(i) ? ' fresh' : ''}">${paw(false)}</span>` + (notation ? `<b class="llet">${String.fromCharCode(97 + ((givenOrder.length + newOrder.indexOf(i)) % 26))}</b>` : '');
    else if (P.given.has(i)) h = paw(false) + (notation ? `<b class="llet">${String.fromCharCode(97 + (givenOrder.indexOf(i) % 26))}</b>` : '');
    else if (P.miss.has(i)) h = `<span class="lmiss">${paw(false)}</span>`;
    else if (P.scratch.has(i)) h = paw(false);
    else if (auto.has(i)) h = paw(true);
    if (S.id === 0 && P.found.has(i) && P.corgi.has(i)) h = cheddarHead() + '<span class="lring"></span>';
    if (look && look.has(i)) {
      const n = P.n, r = Math.floor(i / n), c = i % n;
      const w = [r === 0 || !look.has(i - n), c === n - 1 || !look.has(i + 1), r === n - 1 || !look.has(i + n), c === 0 || !look.has(i - 1)].map((x) => (x ? '3px' : '0')).join(' ');
      h += `<span class="lo" style="border-width:${w}"></span>`;
    }
    el.innerHTML = h;
  }
}
// The outline: the unit the trick is about (the engine's look); What if outlines the unit that
// runs out of room, since its look is the answer itself.
const outlineCells = (P) => (S.id === 6 ? unitCells(P, P.b.step.dead) : P.b.step.look);
function clearFx() {
  const b = $('lboard');
  if (!b) return;
  b.classList.remove('spot');
  b.querySelectorAll('.sn-a,.sn-d,.glow,.lreach,.lclash').forEach((el) => el.classList.remove('sn-a', 'sn-d', 'glow', 'lreach', 'lclash'));
  b.querySelectorAll('.sng,.snx').forEach((el) => el.remove());
}
function spot(cells) { const b = $('lboard'); b.classList.add('spot'); for (const i of cells) b.children[i].classList.add('sn-a'); }
function ghost(i, label) { cellEl(i).insertAdjacentHTML('beforeend', `<span class="sng">${cheddarHead()}<b>${label}</b></span>`); }
// A ghost corgi on i, the open spots it would rule out shaded. unit: the row/column/yard to judge:
// if it has no open spot outside the reach, it flashes red (Nowhere left!); else its open spots glow.
function reachFx(P, i, unit, corgiThere = false, wrong = false) {
  const isLive = live(P), peers = P.B.peers[i];
  if (!corgiThere) ghost(i, '?');
  for (const j of peers) if (isLive(j) || P.miss.has(j) || (corgiThere && P.corgi.has(j))) cellEl(j).classList.add('lreach');
  if (corgiThere) return;
  const open = unit.filter((c) => c !== i && isLive(c) && !peers.has(c));
  if (!open.length) for (const c of unit) cellEl(c).classList.add('sn-d');
  else if (wrong || open.length) for (const c of open) cellEl(c).classList.add('glow');
}
function chainFx(P, i, ch) {
  ghost(i, '?');
  ch.chain.forEach((x, k) => ghost(x.cell, k + 1));
  if (ch.dead) for (const c of unitCells(P, ch.dead)) cellEl(c).classList.add('sn-d');
}

// ---------- the Cheddar's tricks page ----------
const statusOf = (id) => {
  const r = peek(id), K = kid();
  if (r.done) return { cls: 'done', text: `✓ Learned${r.more ? ` · ${r.more * 10} more boards` : ''}` };
  if (r.skipped?.length && (r.board || 0) < 10) return { cls: 'skip', text: `Skipped · pick up at board ${(r.board || 0) + 1}` };
  if (r.board) return { cls: 'part', text: `Board ${r.board + 1} of 10` };
  if (r.seen) return { cls: 'new', text: 'Started' };
  return { cls: 'new', text: K ? `About 5 min · ${pay()} coins` : `About 5 min · ${pay()} coins` };
};
// Which tracks have every lesson done (and whether that's news since the page last showed it).
function trackBadges() {
  const seen = db().lessonBadges || {};
  return tracksFor().map((t) => { const all = [...Array(TRACKS[t] + 1).keys()].every(trickDone); return { t, all, newly: all && !seen[t] }; });
}
function markBadges() { const b = (db().lessonBadges ||= {}); for (const x of trackBadges()) if (x.all) b[x.t] = 1; X.save(); }
export function renderTricks() {
  const K = kid(), cur = trackOfMode();
  const order = [cur, ...tracksFor().filter((t) => t !== cur)];
  const listed = new Set();
  const row = (id, t) => {
    const s = statusOf(id);
    return `<button class="trow s-${s.cls}" data-id="${id}" data-t="${t}"><span class="tn">${id}</span><div><b>${TRICKS[id]}</b><small>${esc(s.text)}</small></div><span class="tgo">›</span></button>`;
  };
  const cards = order.map((t, k) => {
    const ids = [...Array(TRACKS[t] + 1).keys()];
    const done = ids.filter(trickDone).length, all = done === ids.length;
    const fresh = ids.filter((id) => !listed.has(id));
    ids.forEach((id) => listed.add(id));
    const chips = k ? `<div class="tchips">${ids.map((id) => `<span class="${trickDone(id) ? 'on' : ''}" title="${TRICKS[id]}">${trickDone(id) ? '✓' : id}</span>`).join('')}</div>` : '';
    return `<div class="tcard${k ? ' other' : ''}"><div class="thead"><b>${TRACK_LABEL[t]}</b>${all ? `<span class="tbadge">Ready for ${TRACK_NAME[t]} ✓</span>` : `<span class="tcount">${done} of ${ids.length}</span>`}</div>
      ${chips}${fresh.map((id) => row(id, t)).join('')}${k && !fresh.length ? `<small class="tsame">${K ? 'Same tricks as above.' : 'The same tricks as above.'}</small>` : ''}</div>`;
  }).join('');
  $('tricks').innerHTML = `
    <div class="bar"><button class="back">‹</button><h2>Cheddar's tricks</h2><span class="ghost"></span></div>
    <p class="tintro">${K ? `Learn the tricks Cheddar uses! Each one is a tiny lesson and 10 practice boards. Finish one for ${pay()} coins.` : `Every puzzle can be solved with these tricks, no guessing. Each is a short lesson and 10 practice boards, about 5 minutes. Finishing a lesson the first time pays ${pay()} coins.`}</p>
    ${cards}`;
  $('tricks').querySelector('.back').onclick = () => X.renderHome();
  $('tricks').querySelectorAll('.trow').forEach((b) => (b.onclick = () => lessonSheet(Number(b.dataset.id), b.dataset.t)));
  markBadges();
  X.show('tricks');
  loadLessons();
}
// Tapping a lesson: new ones start at Show it; others offer where to pick up, a replay, More practice.
function lessonSheet(id, t) {
  const r = peek(id), K = kid();
  if (!r.seen && !r.done && !r.board) return openLesson(id, { start: 'intro', track: t });
  const s = statusOf(id), at = (r.board || 0) + 1;
  X.sheet(`<h3>${TRICKS[id]}</h3><p>${esc(s.text)}</p>
    ${r.done ? '' : `<button class="cta" id="ls-go">${r.board ? `Pick up at board ${at}` : 'Start practice'}</button>`}
    ${r.done ? `<button class="cta" id="ls-more">More practice · 10 new boards</button>` : ''}
    <button class="cta alt" id="ls-intro">${K ? 'Watch the lesson again' : 'Replay Show it and Watch it'}</button>
    <button class="cta alt" id="ls-no">Close</button>`);
  if ($('ls-go')) $('ls-go').onclick = () => { X.closeSheet(); openLesson(id, { start: 'practice', track: t }); };
  if ($('ls-more')) $('ls-more').onclick = () => { X.closeSheet(); openLesson(id, { start: 'more', track: t }); };
  $('ls-intro').onclick = () => { X.closeSheet(); openLesson(id, { start: 'intro', track: t }); };
  $('ls-no').onclick = X.closeSheet;
}
export { TRACK_OF };
