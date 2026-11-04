/* CPTD study app: Building Personal Capability.
 * Plain JavaScript, no build step. Study content lives in content.js.
 * Progress is saved in this browser only (localStorage); Settings has backup and restore.
 */
(() => {
  'use strict';

  const C = window.CPTD;
  const app = document.getElementById('app');
  if (!C) { app.innerHTML = '<p class="empty">The study content didn’t load. Reload the page to try again.</p>'; return; }

  const KEY = 'cptd-bpc-v1';
  const tabsEl = document.getElementById('tabs');
  const toastEl = document.getElementById('toast');
  const idleEl = document.getElementById('idle');

  /* ================= helpers ================= */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rand = (n) => Math.floor(Math.random() * n);
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sample = (arr, n) => shuffle(arr).slice(0, n);
  const pickOne = (arr) => arr[rand(arr.length)];
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const pct = (x) => Math.round(clamp(x || 0, 0, 1) * 100);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;

  // Two names "clash" if they share a meaningful word stem ("Commitment" vs. "Lack of commitment").
  // Clashing items are kept out of "which model?" questions so those can never be ambiguous.
  const norm = (s) => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const STOP = new Set(['self', 'with', 'from', 'your', 'that', 'this', 'their', 'them', 'what', 'when', 'each', 'into', 'than']);
  const stems = (s) => { const n = norm(s); const out = new Set([n]); n.split(' ').forEach((w) => { if (w.length >= 4 && !STOP.has(w)) out.add(w.slice(0, 6)); }); return out; };
  const clash = (a, b) => { const sb = stems(b); for (const k of stems(a)) if (sb.has(k)) return true; return false; };

  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dayIdx = (k) => { const [y, m, d] = k.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
  const idxKey = (i) => { const d = new Date(i * 864e5); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
  const todayKey = () => dayKey();
  const todayIdx = () => dayIdx(dayKey());
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekday = (i) => WEEKDAYS[new Date(i * 864e5).getUTCDay()];

  function fmtDur(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60);
    if (h) return `${h} h ${m} min`;
    if (m) return `${m} min`;
    return `${sec} sec`;
  }
  const fmtClock = (sec) => { sec = Math.max(0, Math.ceil(sec)); return `${Math.floor(sec / 60)}:${pad(sec % 60)}`; };

  /* ================= saved state ================= */
  const fresh = () => ({
    v: 1, created: Date.now(),
    settings: { goal: 10, sprint: 5, previews: true, haptics: true, sound: false, theme: 'auto', rate: 1, desc: false, examDate: '' },
    time: { total: 0, days: {} },
    xp: 0, xpTime: 0,
    cards: {}, seen: {}, goalDays: {}, badges: {},
    streak: { count: 0, best: 0, last: null, passes: 0 },
    stats: { answered: 0, correct: 0, sprints: 0, short: 0, perfect: 0, listen: 0, cases: {}, lastVisit: null },
    log: [],
  });
  function upgrade(s) {
    const f = fresh();
    if (!s || typeof s !== 'object') return f;
    Object.keys(f).forEach((k) => { if (!(k in s)) s[k] = f[k]; });
    ['settings', 'time', 'streak', 'stats'].forEach((k) => { s[k] = Object.assign(f[k], s[k] || {}); });
    if (!s.time.days) s.time.days = {};
    if (!s.stats.cases) s.stats.cases = {};
    return s;
  }
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return upgrade(JSON.parse(raw)); } catch (e) { /* start fresh */ }
    return fresh();
  }
  let S = load();
  let saveTimer = null;
  function write() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked or full */ } }
  function save(now) {
    if (now) { clearTimeout(saveTimer); saveTimer = null; write(); return; }
    if (!saveTimer) saveTimer = setTimeout(() => { saveTimer = null; write(); }, 1200);
  }
  function applyTheme() {
    const t = S.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }
  applyTheme();

  /* ================= content index ================= */
  const MODELS = C.models;
  const MBY = Object.fromEntries(MODELS.map((m) => [m.id, m]));
  const AREAS = C.areas;
  const ABY = Object.fromEntries(AREAS.map((a) => [a.id, a]));
  const STMTS = Object.keys(C.statements);
  const STMT_AREA = {};
  AREAS.forEach((a) => a.stmts.forEach((s) => { STMT_AREA[s] = a.id; }));

  const memberClash = (o, t) => o.items.some((j) => clash(j.t, t)) || (o.groups || []).some((g) => g.m.some((x) => clash(x, t)));
  const UNIQUE = {};
  MODELS.forEach((m) => { UNIQUE[m.id] = m.items.filter((i) => !MODELS.some((o) => o.id !== m.id && memberClash(o, i.t))); });

  // A "card" is one thing the spaced-repetition schedule tracks.
  const CARDS = [];
  MODELS.forEach((m) => {
    const base = { model: m.id, area: m.area, stmts: m.stmts };
    if (m.decoys && m.decoys.length >= 2) CARDS.push(Object.assign({}, base, { key: `m:${m.id}:pick`, type: 'pick' }));
    if (m.kind === 'ordered') CARDS.push(Object.assign({}, base, { key: `m:${m.id}:order`, type: 'order' }));
    if (m.items.length >= 3) CARDS.push(Object.assign({}, base, { key: `m:${m.id}:match`, type: 'match' }));
    if (m.groups) CARDS.push(Object.assign({}, base, { key: `m:${m.id}:group`, type: 'group' }));
    if (UNIQUE[m.id].length) CARDS.push(Object.assign({}, base, { key: `m:${m.id}:which`, type: 'which' }));
  });
  C.questions.forEach((q) => CARDS.push({ key: `q:${q.id}`, type: 'q', q, model: q.model || null, area: STMT_AREA[q.stmt], stmts: [q.stmt] }));
  const CBY = Object.fromEntries(CARDS.map((c) => [c.key, c]));
  const cardsWhere = (pred) => CARDS.filter(pred);
  const AREA_CARDS = Object.fromEntries(AREAS.map((a) => [a.id, cardsWhere((c) => c.area === a.id)]));
  const STMT_CARDS = Object.fromEntries(STMTS.map((s) => [s, cardsWhere((c) => c.stmts.includes(s))]));

  /* ================= spaced repetition ================= */
  const INTERVAL = [0, 1, 3, 7, 14, 30]; // days until a card comes back, by box
  const box = (key) => (S.cards[key] ? S.cards[key].b : 0);
  const isDue = (c) => { const st = S.cards[c.key]; return !!st && st.due <= todayIdx(); };
  const mastery = (cards) => (cards.length ? cards.reduce((n, c) => n + box(c.key), 0) / (cards.length * 5) : 0);
  const touched = (cards) => (cards.length ? cards.filter((c) => S.cards[c.key]).length / cards.length : 0);
  function grade(key, ok) {
    const st = S.cards[key] || { b: 0, due: 0, n: 0, r: 0, w: 0, last: 0 };
    st.n += 1; st.last = Date.now();
    if (ok) { st.r += 1; st.b = Math.min(5, st.b + 1); st.due = todayIdx() + INTERVAL[st.b]; }
    else { st.w += 1; st.b = Math.max(0, st.b - 2); st.due = todayIdx(); }
    S.cards[key] = st;
  }

  // New cards arrive one model at a time (preview, then drills, then its exam-style questions),
  // rotating through the six areas, least-covered area first.
  function orderFresh(cards) {
    const groups = new Map();
    cards.forEach((c) => { const g = c.model ? 'm:' + c.model : 's:' + c.stmts[0]; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(c); });
    const rank = { pick: 0, match: 1, order: 2, group: 3, which: 4, q: 5 };
    const byArea = {};
    AREAS.forEach((a) => { byArea[a.id] = []; });
    groups.forEach((list) => { list.sort((a, b) => rank[a.type] - rank[b.type]); byArea[list[0].area].push(list); });
    const order = AREAS.map((a) => a.id).sort((x, y) => touched(AREA_CARDS[x]) - touched(AREA_CARDS[y]));
    const out = [];
    let more = true;
    while (more) { more = false; order.forEach((a) => { const g = byArea[a].shift(); if (g) { out.push(...g); more = true; } }); }
    return out;
  }
  function buildQueue(pred, size, exclude) {
    const t = todayIdx(); const due = []; const fr = []; const later = [];
    CARDS.forEach((c) => {
      if (!pred(c) || (exclude && exclude.has(c.key))) return;
      const st = S.cards[c.key];
      if (!st) fr.push(c); else if (st.due <= t) due.push(c); else later.push(c);
    });
    const st = (c) => S.cards[c.key];
    due.sort((a, b) => st(a).b - st(b).b || st(a).last - st(b).last);
    later.sort((a, b) => st(a).b - st(b).b || st(a).due - st(b).due);
    const fresh1 = orderFresh(fr);
    const q = [];
    while (q.length < size && (due.length || fresh1.length || later.length)) {
      if (due.length && (q.length % 3 !== 2 || !fresh1.length)) q.push(due.shift());
      else if (fresh1.length) q.push(fresh1.shift());
      else q.push(later.shift());
    }
    return q;
  }

  /* ================= levels, badges, streaks ================= */
  const TITLES = ['Blank index card', 'Note-taker', 'Highlighter', 'Flashcard regular', 'Active listener', 'Team player', 'Facilitator', 'Conflict navigator', 'Coach', 'Project lead', 'Culture bridge', 'Ethics anchor', 'Influencer', 'Strategist', 'Mentor', 'Thought partner', 'Capability builder', 'TD pro', 'Exam ready', 'CPTD material'];
  const need = (lvl) => 50 * (lvl - 1) * (lvl - 1) + 100 * (lvl - 1);
  function levelOf(xp) { let l = 1; while (l < TITLES.length && xp >= need(l + 1)) l += 1; return l; }
  function levelInfo(xp) {
    if (xp == null) xp = S.xp;
    const l = levelOf(xp); const lo = need(l); const hi = l < TITLES.length ? need(l + 1) : null;
    return { l, title: TITLES[l - 1], frac: hi ? (xp - lo) / (hi - lo) : 1, toNext: hi ? hi - xp : 0 };
  }

  const AREA_ICON = { comm: '🗣️', ei: '💗', collab: '🤝', dei: '🌍', pm: '📋', ethics: '⚖️' };
  const BADGES = [
    { id: 'first', icon: '✏️', name: 'First sprint', desc: 'Finish a sprint' },
    { id: 'ten', icon: '🖍️', name: 'Ten right', desc: 'Answer 10 questions right' },
    { id: 'hundred', icon: '💯', name: 'Century', desc: 'Answer 100 questions right' },
    { id: 'h1', icon: '⏱️', name: 'First hour', desc: 'Study 1 hour in all' },
    { id: 'h5', icon: '📚', name: 'Five hours', desc: 'Study 5 hours in all' },
    { id: 'h10', icon: '🗂️', name: 'Ten hours', desc: 'Study 10 hours in all' },
    { id: 'h16', icon: '🎯', name: 'On ATD’s pace', desc: 'Reach the 16 hours ATD suggests for this domain' },
    { id: 's3', icon: '🔥', name: 'Three days', desc: 'Hit your daily goal 3 days running' },
    { id: 's7', icon: '📅', name: 'Full week', desc: 'Reach a 7-day streak' },
    { id: 's14', icon: '🏅', name: 'Two weeks', desc: 'Reach a 14-day streak' },
    { id: 's30', icon: '🏆', name: 'A month', desc: 'Reach a 30-day streak' },
    { id: 'perfect', icon: '⭐', name: 'Clean sheet', desc: 'Get 8 or more right in a sprint with no first-try misses' },
    { id: 'stolen', icon: '⏳', name: 'Stolen minutes', desc: 'Finish five sprints of 3 minutes or less' },
    { id: 'owl', icon: '🦉', name: 'Night owl', desc: 'Study after 9 p.m.' },
    { id: 'early', icon: '🌅', name: 'Early bird', desc: 'Study before 7 a.m.' },
    { id: 'deck', icon: '🗃️', name: 'Full deck', desc: 'Open every model in Learn' },
    { id: 'cases', icon: '🧩', name: 'Case closed', desc: 'Finish all three practice cases' },
    { id: 'ears', icon: '🎧', name: 'Ears on', desc: 'Listen for 10 minutes' },
    { id: 'back', icon: '👋', name: 'Welcome back', desc: 'Come back after 3 or more days away' },
  ].concat(AREAS.map((a) => ({ id: 'm-' + a.id, icon: AREA_ICON[a.id], name: `${a.name}, mastered`, desc: `Reach 80% mastery in ${a.name.toLowerCase()}` })));

  function award(id) {
    if (S.badges[id]) return;
    const b = BADGES.find((x) => x.id === id);
    if (!b) return;
    S.badges[id] = Date.now();
    toast(`<span class="stamp">New sticker</span>${b.icon} ${esc(b.name)}`, 'level');
    save();
  }
  function checkBadges() {
    const st = S.stats; const hrs = S.time.total / 3600;
    if (st.sprints >= 1) award('first');
    if (st.correct >= 10) award('ten');
    if (st.correct >= 100) award('hundred');
    if (hrs >= 1) award('h1');
    if (hrs >= 5) award('h5');
    if (hrs >= 10) award('h10');
    if (hrs >= 16) award('h16');
    const best = S.streak.best;
    if (best >= 3) award('s3');
    if (best >= 7) award('s7');
    if (best >= 14) award('s14');
    if (best >= 30) award('s30');
    if (st.perfect >= 1) award('perfect');
    if (st.short >= 5) award('stolen');
    if (MODELS.every((m) => S.seen[m.id])) award('deck');
    if (C.cases.every((c) => st.cases[c.id] != null)) award('cases');
    if (st.listen >= 600) award('ears');
    AREAS.forEach((a) => { if (mastery(AREA_CARDS[a.id]) >= 0.8) award('m-' + a.id); });
  }

  function addXP(n) {
    if (!n) return;
    const before = levelOf(S.xp);
    S.xp += n;
    if (RUN && !RUN.done) RUN.xp += n;
    const after = levelOf(S.xp);
    if (after > before) toast(`<span class="stamp">Level ${after}</span>${esc(TITLES[after - 1])}`, 'level');
  }

  function goalMet(k) {
    S.goalDays[k] = true;
    const t = dayIdx(k); const s = S.streak; let used = 0;
    if (s.last === t) return;
    if (s.last == null) s.count = 1;
    else if (t - s.last === 1) s.count += 1;
    else {
      const missed = t - s.last - 1;
      if (missed >= 1 && s.passes >= missed) { s.passes -= missed; used = missed; s.count += 1; } else s.count = 1;
    }
    s.last = t; s.best = Math.max(s.best, s.count);
    let msg = `Daily goal done. ${s.count}-day streak.`;
    if (used) msg += ` Used ${plural(used, 'busy-day pass', 'busy-day passes')}.`;
    if (s.count % 5 === 0 && s.passes < 3) { s.passes += 1; msg += ' You earned a busy-day pass.'; }
    toast(msg);
    addXP(25);
    checkBadges();
    save(true);
  }
  function streakNow() {
    const s = S.streak;
    if (s.last == null) return { count: 0, done: false, needPasses: 0 };
    const gap = todayIdx() - s.last;
    if (gap <= 1) return { count: s.count, done: gap === 0, needPasses: 0 };
    const missed = gap - 1;
    if (missed <= s.passes) return { count: s.count, done: false, needPasses: missed };
    return { count: 0, done: false, needPasses: 0 };
  }

  /* ================= active study time ================= */
  // Time counts while the app is on screen and you've touched it within the last two minutes.
  // If you wander off, only 20 seconds of the quiet stretch are kept.
  const IDLE_SEC = 120;
  const GRACE_SEC = 20;
  let lastAct = Date.now();
  let pending = 0;
  let idle = false;
  let audioOn = false;

  function credit(sec) {
    if (sec <= 0) return;
    const k = todayKey();
    S.time.total += sec;
    S.time.days[k] = (S.time.days[k] || 0) + sec;
    if (RUN && !RUN.done) RUN.active += sec;
    if (audioOn) S.stats.listen += sec;
    S.xpTime += sec;
    const g = Math.floor(S.xpTime / 10);
    if (g) { S.xpTime -= g * 10; addXP(g); }
    const h = new Date().getHours();
    if (h >= 21 || h < 4) award('owl'); else if (h < 7) award('early');
    if (!S.goalDays[k] && S.time.days[k] >= S.settings.goal * 60) goalMet(k);
    checkBadges();
    save();
  }
  function setIdle(on) { idle = on; idleEl.hidden = !on; }
  function tick() {
    if (document.visibilityState !== 'visible') return;
    if (audioOn) lastAct = Date.now();
    const gap = (Date.now() - lastAct) / 1000;
    if (gap <= IDLE_SEC) {
      pending += 1;
      if (pending >= 15 && gap < 3) { credit(pending); pending = 0; }
    } else if (!idle) {
      credit(Math.min(pending, GRACE_SEC));
      pending = 0;
      setIdle(true);
    }
    live();
  }
  function poke() {
    const gap = (Date.now() - lastAct) / 1000;
    if (idle) { setIdle(false); pending = 0; }
    else if (gap <= IDLE_SEC && pending) { credit(pending); pending = 0; }
    lastAct = Date.now();
  }
  function flushTime() {
    if (!idle && (Date.now() - lastAct) / 1000 <= IDLE_SEC && pending) credit(pending);
    pending = 0;
    save(true);
  }
  ['pointerdown', 'keydown', 'wheel', 'touchmove', 'scroll'].forEach((ev) => window.addEventListener(ev, poke, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushTime();
    else { lastAct = Date.now(); if (idle) setIdle(false); live(); }
  });
  window.addEventListener('pagehide', flushTime);
  setInterval(tick, 1000);

  const liveToday = () => (S.time.days[todayKey()] || 0) + pending;
  function live() {
    const t = liveToday();
    app.querySelectorAll('[data-live]').forEach((el) => {
      const k = el.dataset.live;
      if (k === 'today-min') el.textContent = Math.floor(t / 60);
      else if (k === 'today-bar') el.style.width = pct(t / (S.settings.goal * 60)) + '%';
      else if (k === 'total') el.textContent = fmtDur(S.time.total + pending);
      else if (k === 'xp' && RUN) el.textContent = `+${RUN.xp} XP`;
      else if (k === 'clock' && RUN) el.textContent = clockText();
      else if (k === 'clockbar' && RUN) el.style.width = pct(1 - runLeft() / (RUN.minutes * 60)) + '%';
    });
    if (RUN && !RUN.done && !RUN.timeUp && runLeft() <= 0) { RUN.timeUp = true; onTimeUp(); }
  }

  /* ================= feedback: toast, haptics, sound ================= */
  const toastQ = [];
  let toastBusy = false;
  function toast(html, kind) { toastQ.push({ html, kind: kind || '' }); if (!toastBusy) nextToast(); }
  function nextToast() {
    const t = toastQ.shift();
    if (!t) { toastBusy = false; return; }
    toastBusy = true;
    toastEl.innerHTML = t.html;
    toastEl.className = 'show ' + t.kind;
    setTimeout(() => { toastEl.className = t.kind; setTimeout(nextToast, 280); }, t.kind ? 3000 : 2500);
  }
  function haptic(kind) {
    if (!S.settings.haptics || !navigator.vibrate) return;
    try { navigator.vibrate(kind === 'ok' ? 18 : [25, 60, 25]); } catch (e) { /* not supported */ }
  }
  let actx = null;
  function sound(kind) {
    if (!S.settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(); const g = actx.createGain(); const t0 = actx.currentTime;
      o.type = 'sine';
      if (kind === 'ok') { o.frequency.setValueAtTime(660, t0); o.frequency.exponentialRampToValueAtTime(990, t0 + 0.12); }
      else { o.frequency.setValueAtTime(240, t0); o.frequency.exponentialRampToValueAtTime(170, t0 + 0.18); }
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
      o.connect(g); g.connect(actx.destination);
      o.start(t0); o.stop(t0 + 0.28);
    } catch (e) { /* audio not available */ }
  }

  /* ================= question factory ================= */
  const TYPE_LABEL = { q: 'Exam-style', pick: 'Pick all', order: 'Put in order', match: 'Match', which: 'Which model?', group: 'Sort it' };
  function modelList(m) { return m.items.map((i, k) => (m.kind === 'ordered' ? `${k + 1}. ${i.t}` : i.t)).join(m.kind === 'ordered' ? '  ' : ', '); }

  function makeQ(card) {
    const m = card.model ? MBY[card.model] : null;
    const base = { card, m, label: TYPE_LABEL[card.type], done: false, picked: new Set(), placed: [] };
    if (card.type === 'q') {
      const q = card.q;
      return Object.assign(base, {
        kind: 'single', ctx: `${q.stmt} ${C.statements[q.stmt]}`, prompt: q.q,
        opts: shuffle(q.o.map((t, i) => ({ t, ok: i === q.a }))), why: q.why,
      });
    }
    if (card.type === 'match') {
      const it = pickOne(m.items);
      const others = sample(m.items.filter((x) => x !== it), Math.min(3, m.items.length - 1));
      return Object.assign(base, {
        kind: 'single', ctx: m.name, prompt: `“${it.d}”`, hint: 'Which one is described?',
        opts: shuffle([it].concat(others)).map((x) => ({ t: x.t, ok: x === it })), why: `${it.t}: ${it.d}`,
      });
    }
    if (card.type === 'which') {
      const it = pickOne(UNIQUE[m.id]);
      const pool = MODELS.filter((o) => o.id !== m.id && !memberClash(o, it.t));
      const others = shuffle(pool.filter((o) => o.area === m.area)).concat(shuffle(pool.filter((o) => o.area !== m.area))).slice(0, 3);
      return Object.assign(base, {
        kind: 'single', ctx: 'Which model?', prompt: `“${it.t}”`, hint: 'This belongs to which model?',
        opts: shuffle([m].concat(others)).map((o) => ({ t: o.name, ok: o === m })),
        why: `${it.t} is part of ${m.name} (${m.who}).`,
      });
    }
    if (card.type === 'group') {
      const g = pickOne(m.groups); const x = pickOne(g.m);
      return Object.assign(base, {
        kind: 'single', ctx: m.name, prompt: `“${x}”`, hint: 'Which heading does it fall under?',
        opts: shuffle(m.groups.map((gg) => ({ t: gg.t, ok: gg === g }))),
        why: `${x} falls under ${g.t}. ` + m.groups.map((gg) => `${gg.t}: ${gg.m.join(', ')}.`).join(' '),
      });
    }
    if (card.type === 'pick') {
      const all = m.items; const full = all.length <= 7; const chosen = full ? all : sample(all, 4);
      const nDecoy = Math.min(m.decoys.length, all.length <= 4 ? 2 : 3);
      return Object.assign(base, {
        kind: 'multi', ctx: m.who, prompt: `Which of these belong in “${m.name}”?`,
        hint: full ? `Pick all <b>${all.length}</b>.` : `Pick the <b>${chosen.length}</b> that belong. (The full list has ${all.length}.)`,
        opts: shuffle(chosen.map((x) => ({ t: x.t, ok: true })).concat(sample(m.decoys, nDecoy).map((t) => ({ t, ok: false })))),
        why: full ? `${m.name}: ${modelList(m)}.` : `The full list has ${all.length}. Open the model in Learn to see them all.`,
      });
    }
    if (card.type === 'order') {
      let seq = m.items; let windowed = false;
      if (seq.length > 6) { const st = rand(seq.length - 4); seq = seq.slice(st, st + 5); windowed = true; }
      const names = seq.map((x) => x.t);
      let pool = shuffle(names); let guard = 0;
      while (pool.every((x, i) => x === names[i]) && guard < 12) { pool = shuffle(names); guard += 1; }
      return Object.assign(base, {
        kind: 'order', ctx: m.name,
        prompt: windowed ? `Tap these ${names.length} ${m.unit} in order, ${m.orderNote}.` : `Tap the ${names.length} ${m.unit} in order, ${m.orderNote}.`,
        hint: windowed ? `These are ${names.length} back-to-back ${m.unit} out of ${m.items.length}.` : '',
        seq: names, pool, why: `${m.name}: ${modelList(m)}.`,
      });
    }
    return null;
  }

  /* ================= sprint runner ================= */
  let RUN = null;
  let CUR = null;
  const runLeft = () => RUN.minutes * 60 - (RUN.active + pending);
  function clockText() {
    if (!RUN) return '';
    if (RUN.timeUp || runLeft() <= 0) return 'Time’s up. Finish this one.';
    return `${fmtClock(runLeft())} left`;
  }

  const SPECS = {
    mixed: () => ({ title: 'Mixed sprint', pred: () => true }),
    area: (id) => ({ title: ABY[id].name, pred: (c) => c.area === id }),
    stmt: (s) => ({ title: `${s} ${C.statements[s]}`, pred: (c) => c.stmts.includes(s) }),
    model: (id) => ({ title: MBY[id].name, pred: (c) => c.model === id }),
    scen: () => ({ title: 'Exam-style questions', pred: (c) => c.type === 'q' }),
    weak: () => ({ title: 'Weak spots', pred: (c) => { const st = S.cards[c.key]; return !!st && st.w > 0 && st.b <= 2; } }),
    keys: (keys) => { const set = new Set(keys); return { title: 'Review your misses', pred: (c) => set.has(c.key) }; },
  };

  function startRun(spec, minutes) {
    poke();
    if (RUN && !RUN.done) finishRun(false);
    const queue = buildQueue(spec.pred, 80);
    if (!queue.length) { toast('Nothing to practice there right now.'); return; }
    RUN = {
      spec, title: spec.title, minutes, queue, asked: new Set(), active: 0, answered: 0, firstRight: 0, firstWrong: 0,
      xp: 0, combo: 0, best: 0, retried: new Set(), missed: [], previewed: new Set(), timeUp: false, done: false, view: null,
    };
    CUR = null;
    nextCard(true);
    if (location.hash !== '#/run') location.hash = '#/run';
    else renderRun();
  }

  function nextCard(silent) {
    const r = RUN;
    if (!r) return;
    if (r.timeUp) { finishRun(true); return; }
    if (!r.queue.length) {
      r.queue = buildQueue(r.spec.pred, 40, r.asked);
      if (!r.queue.length) { finishRun(true); return; }
    }
    const card = r.queue[0];
    const m = card.model ? MBY[card.model] : null;
    if (m && S.settings.previews && !S.seen[m.id] && !r.previewed.has(m.id) && !card.retry) {
      r.previewed.add(m.id);
      r.view = 'preview'; r.previewModel = m.id; CUR = null;
      if (!silent) renderRun();
      return;
    }
    r.queue.shift();
    r.asked.add(card.key);
    CUR = makeQ(card);
    CUR.retry = !!card.retry;
    r.view = 'q';
    if (!silent) renderRun();
  }

  function renderRun() {
    const r = RUN;
    if (!r) { location.replace('#/'); return; }
    if (r.view === 'summary') { renderSummary(); return; }
    if (!r.view) nextCard(true);
    if (!RUN || r.view === 'summary') { if (RUN) renderSummary(); return; }
    const left = runLeft();
    const head = `<div class="runbar">
        <button class="iconbtn" data-act="end-run" aria-label="End sprint and see results">✕</button>
        <div class="timer"><div class="bar thin"><i data-live="clockbar" style="width:${pct(1 - left / (r.minutes * 60))}%"></i></div><span class="num" data-live="clock">${esc(clockText())}</span></div>
        <span class="xp num hl" data-live="xp">+${r.xp} XP</span>
      </div>`;
    const body = r.view === 'preview' ? previewHTML(MBY[r.previewModel]) : questionHTML(CUR);
    paint(head + body);
    const h = document.getElementById('qhead');
    if (h) h.focus({ preventScroll: true });
  }

  function previewHTML(m) {
    const tag = m.kind === 'ordered' ? 'ol' : 'ul';
    return `<div class="card qcard preview" style="--tab:${ABY[m.area].tab}"><span class="tab">New model</span>
        <p class="ctx">${esc(m.who)}</p>
        <h1 class="prompt" id="qhead" tabindex="-1">${esc(m.name)}</h1>
        <${tag}>${m.items.map((i) => `<li><b>${esc(i.t)}</b> <span class="d">${esc(i.d)}</span></li>`).join('')}</${tag}>
        <p class="hint"><b>Memory hook:</b> ${esc(m.hook)}</p>
      </div>
      <div class="answer-actions">
        <button class="btn" data-act="preview-go">Got it, quiz me</button>
        <button class="linkbtn" data-act="no-previews">Skip these previews from now on</button>
      </div>`;
  }

  function questionHTML(Q) {
    const area = ABY[Q.card.area];
    let top = `<div class="card qcard" style="--tab:${area.tab}"><span class="tab">${esc(Q.label)}</span>
        <p class="ctx">${esc(Q.ctx)}</p>
        <h1 class="prompt" id="qhead" tabindex="-1">${esc(Q.prompt)}</h1>
        ${Q.hint ? `<p class="hint">${Q.hint}</p>` : ''}
      </div>`;
    let body = '';
    if (Q.kind === 'single' || Q.kind === 'multi') {
      body = `<div class="opts" role="group" aria-label="Answers">${Q.opts.map((o, i) => `<button class="opt${Q.kind === 'multi' ? ' multi' : ''}" data-act="opt" data-i="${i}" aria-pressed="false"><span>${esc(o.t)}</span></button>`).join('')}</div>`;
      if (Q.kind === 'multi') body += `<div class="answer-actions" id="checkrow"><button class="btn" data-act="check" disabled>Check</button></div>`;
    } else if (Q.kind === 'order') {
      body = `<div id="orderbox">${orderHTML(Q)}</div>`;
    }
    return top + body + '<div id="feedback" aria-live="polite"></div>';
  }

  function orderHTML(Q) {
    const firstEmpty = Q.placed.length;
    const slots = Q.seq.map((_, i) => {
      const t = Q.placed[i];
      if (t) return `<button class="slot filled" data-act="unplace" data-i="${i}" aria-label="Position ${i + 1}: ${esc(t)}. Tap to take it back."><span>${esc(t)}</span></button>`;
      return `<button class="slot" disabled><span class="faint">${i === firstEmpty ? 'Tap the next one below' : ''}</span></button>`;
    }).join('');
    const pool = Q.pool.filter((t) => !Q.placed.includes(t)).map((t) => `<button class="chip" data-act="place" data-t="${esc(t)}">${esc(t)}</button>`).join('');
    const ready = Q.placed.length === Q.seq.length;
    return `<div class="order-slots">${slots}</div><div class="pool">${pool}</div>
      <div class="answer-actions" id="checkrow"><button class="btn" data-act="check" ${ready ? '' : 'disabled'}>Check the order</button>${Q.placed.length ? '<button class="linkbtn" data-act="clear-order">Start over</button>' : ''}</div>`;
  }

  const optEls = () => Array.from(app.querySelectorAll('.opt'));

  function answerSingle(i) {
    const Q = CUR;
    Q.done = true;
    const els = optEls();
    const ok = Q.opts[i].ok;
    els.forEach((b, k) => {
      b.disabled = true;
      if (k === i) b.classList.add(ok ? 'ok' : 'bad');
      else if (Q.opts[k].ok) b.classList.add('ok');
      else b.classList.add('dim');
    });
    els[i].setAttribute('aria-pressed', 'true');
    afterAnswer(ok);
  }

  function checkMulti() {
    const Q = CUR;
    Q.done = true;
    const els = optEls();
    let ok = true;
    Q.opts.forEach((o, k) => {
      const sel = Q.picked.has(k); const b = els[k];
      b.disabled = true;
      if (sel && o.ok) b.classList.add('ok');
      else if (sel) { b.classList.add('bad'); ok = false; }
      else if (o.ok) { b.classList.add('missed'); b.insertAdjacentHTML('beforeend', '<span class="tag">You missed this one</span>'); ok = false; }
      else b.classList.add('dim');
    });
    afterAnswer(ok);
  }

  function checkOrder() {
    const Q = CUR;
    Q.done = true;
    const ok = Q.placed.every((t, i) => t === Q.seq[i]);
    app.querySelectorAll('.slot').forEach((s, i) => { s.disabled = true; s.classList.add(Q.placed[i] === Q.seq[i] ? 'ok' : 'bad'); });
    app.querySelectorAll('.pool .chip').forEach((b) => { b.disabled = true; });
    afterAnswer(ok);
  }

  function afterAnswer(ok) {
    const r = RUN; const Q = CUR; const key = Q.card.key;
    if (!Q.retry) {
      grade(key, ok);
      r.answered += 1; S.stats.answered += 1;
      if (ok) { r.firstRight += 1; S.stats.correct += 1; } else r.firstWrong += 1;
    }
    if (ok) {
      r.combo += 1; r.best = Math.max(r.best, r.combo);
      addXP(Q.retry ? 5 : 10 + Math.min(r.combo - 1, 5));
      haptic('ok'); sound('ok');
    } else {
      r.combo = 0;
      addXP(2);
      haptic('bad'); sound('bad');
      if (!r.missed.includes(key)) r.missed.push(key);
      if (!Q.retry && !r.retried.has(key)) {
        r.retried.add(key);
        r.queue.splice(Math.min(3, r.queue.length), 0, Object.assign({}, Q.card, { retry: true }));
        Q.requeued = true;
      }
    }
    const row = document.getElementById('checkrow');
    if (row) row.remove();
    showFeedback(ok);
    live();
    checkBadges();
    save();
  }

  const PRAISE = ['Right.', 'Correct.', 'Yes, that’s it.', 'Nailed it.', 'Exactly.'];
  function showFeedback(ok) {
    const Q = CUR; const r = RUN;
    const fb = document.getElementById('feedback');
    let head = ok ? (Q.retry ? 'Got it this time.' : pickOne(PRAISE)) : 'Not quite.';
    if (ok && r.combo >= 3) head += ` <span class="hl">${r.combo} in a row</span>`;
    let html = `<div class="why${ok ? '' : ' miss'}"><h3>${head}</h3><p class="small">${esc(Q.why)}</p>`;
    if (Q.kind === 'order' && !ok && Q.seq.length < Q.m.items.length) html += `<p class="small"><b>Right order for these ${Q.seq.length}:</b> ${Q.seq.map((t, i) => `${i + 1}. ${esc(t)}`).join(', ')}</p>`;
    if (!ok && Q.requeued) html += '<p class="small faint">It will come back in a few cards.</p>';
    if (Q.m) {
      const tag = Q.m.kind === 'ordered' ? 'ol' : 'ul';
      html += `<details class="small"><summary>See the whole model</summary><p class="small" style="margin-top:6px"><b>${esc(Q.m.name)}</b>, ${esc(Q.m.who)}</p><${tag} class="small">${Q.m.items.map((i) => `<li><b>${esc(i.t)}</b>: ${esc(i.d)}</li>`).join('')}</${tag}><p class="small"><b>Memory hook:</b> ${esc(Q.m.hook)}</p></details>`;
    }
    html += `</div><div class="answer-actions"><button class="btn" data-act="next">${r.timeUp ? 'See results' : 'Next'}</button></div>`;
    fb.innerHTML = html;
    const next = fb.querySelector('[data-act="next"]');
    if (next) next.focus({ preventScroll: true });
    fb.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  }

  function onTimeUp() {
    const next = app.querySelector('[data-act="next"]');
    if (next) next.textContent = 'See results';
    haptic('ok');
  }

  function finishRun(show) {
    const r = RUN;
    if (!r) return;
    if (!r.done) {
      if (!idle && pending) { credit(pending); pending = 0; }
      r.done = true;
      if (r.answered > 0 || r.active > 30) {
        S.stats.sprints += 1;
        if (r.minutes <= 3) S.stats.short += 1;
        if (r.answered >= 8 && r.firstWrong === 0) S.stats.perfect += 1;
        S.log.unshift({ d: Date.now(), t: r.title, sec: Math.round(r.active), n: r.answered, c: r.firstRight, xp: r.xp });
        S.log = S.log.slice(0, 50);
      }
      checkBadges();
      save(true);
      requestPersist();
    }
    if (show) { r.view = 'summary'; renderRun(); }
  }

  function missLabel(key) {
    const c = CBY[key];
    if (!c) return key;
    if (c.type === 'q') { const t = c.q.q; return t.length > 90 ? t.slice(0, 88) + '…' : t; }
    return `${MBY[c.model].name} (${TYPE_LABEL[c.type].toLowerCase()})`;
  }

  function renderSummary() {
    const r = RUN;
    const acc = r.answered ? Math.round((100 * r.firstRight) / r.answered) : 0;
    const li = levelInfo(); const sn = streakNow();
    const t = liveToday(); const goal = S.settings.goal * 60;
    const goalLine = t >= goal ? `Today’s goal is done: ${Math.floor(t / 60)} of ${S.settings.goal} minutes.` : `${Math.floor(t / 60)} of ${S.settings.goal} minutes today. ${Math.ceil((goal - t) / 60)} more to hit your goal.`;
    const misses = r.missed.slice(0, 8);
    paint(`<div class="topline"><span class="brand">${esc(r.title)}</span></div>
      <div class="card qcard" style="--tab:var(--hl)"><span class="tab">Sprint done</span>
        <h1 class="prompt" id="qhead" tabindex="-1">${esc(fmtDur(r.active))} of focused study</h1>
        <p class="hint">${plural(r.answered, 'question')} answered, ${acc}% right on the first try. Best run: ${r.best} in a row.</p>
        <p class="hint"><span class="hl">+${r.xp} XP</span> Level ${li.l}, ${esc(li.title)}${li.toNext ? `. ${li.toNext} XP to level ${li.l + 1}.` : '.'}</p>
      </div>
      <div class="section stack">
        <p>${esc(goalLine)}</p>
        <div class="bar"><i style="width:${pct(t / goal)}%"></i></div>
        <p class="small muted">${sn.count ? `Streak: ${plural(sn.count, 'day')}.` : 'Hit your daily goal to start a streak.'}</p>
      </div>
      ${misses.length ? `<div class="section"><h2>Worth another look</h2><div class="list">${misses.map((k) => `<div class="listrow"><span class="small">${esc(missLabel(k))}</span></div>`).join('')}</div>
        <div class="answer-actions"><button class="btn ghost" data-act="review-misses">Review these now</button></div></div>` : ''}
      <div class="answer-actions section">
        <button class="btn" data-act="again">Another ${r.minutes} minutes</button>
        <a class="btn ghost" href="#/">Done for now</a>
      </div>`);
    const h = document.getElementById('qhead');
    if (h) h.focus({ preventScroll: true });
  }

  /* ================= painting & navigation ================= */
  function paint(html) { app.innerHTML = html; window.scrollTo(0, 0); }
  function setTab(name) {
    tabsEl.querySelectorAll('a').forEach((a) => { if (a.dataset.tab === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }
  const focusMode = (on) => document.body.classList.toggle('focus-mode', !!on);
  let CASE = null;

  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const parts = h.split('/');
    const name = parts[0] || '';
    const arg = parts[1] ? decodeURIComponent(parts[1]) : '';
    if (name !== 'run' && RUN) { if (!RUN.done) finishRun(false); RUN = null; CUR = null; }
    if (name !== 'listen' && LISTEN.on) stopListen();
    if (name !== 'case') CASE = null;
    if (SPEAK.on && name !== 'learn') stopSpeak();
    focusMode(name === 'run' || name === 'case');
    if (name === 'run') { if (RUN) renderRun(); else location.replace('#/'); return; }
    if (name === 'learn') { if (arg && MBY[arg]) viewModel(arg); else viewLearn(); return; }
    if (name === 'practice') return viewPractice();
    if (name === 'progress') return viewProgress();
    if (name === 'settings') return viewSettings();
    if (name === 'exam') return viewExam();
    if (name === 'listen') return viewListen();
    if (name === 'case') { if (arg) startCase(arg); else location.replace('#/practice'); return; }
    viewHome();
  }
  window.addEventListener('hashchange', route);

  /* ================= home ================= */
  function weekHTML() {
    const t0 = todayIdx(); const goal = S.settings.goal;
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const idx = t0 - i; const k = idxKey(idx);
      const sec = (S.time.days[k] || 0) + (i === 0 ? pending : 0);
      days.push({ idx, min: sec / 60, met: !!S.goalDays[k], today: i === 0 });
    }
    const top = Math.max(goal * 1.25, ...days.map((d) => d.min));
    const H = 82;
    const words = days.map((d) => `${weekday(d.idx)} ${Math.round(d.min)} minutes`).join(', ');
    return `<div class="week" role="img" aria-label="Minutes studied: ${esc(words)}">
      <div class="goal" style="bottom:${22 + Math.round((goal / top) * H)}px" aria-hidden="true"></div>
      ${days.map((d) => `<div class="col${d.met ? ' met' : ''}${d.today ? ' today' : ''}" aria-hidden="true"><i style="height:${Math.max(3, Math.round((d.min / top) * H))}px"></i><span>${weekday(d.idx).slice(0, 2)}</span></div>`).join('')}
    </div><p class="small muted" style="margin-top:6px">Dashed line: your ${S.settings.goal}-minute daily goal.</p>`;
  }

  function examCountdown() {
    const d = S.settings.examDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return '';
    const days = dayIdx(d) - todayIdx();
    if (days < 0) return '';
    if (days === 0) return ' Exam day. You\u2019ve got this.';
    return ` Exam in ${plural(days, 'day')}.`;
  }

  function viewHome() {
    setTab('home');
    const li = levelInfo(); const sn = streakNow();
    const t = liveToday(); const goal = S.settings.goal * 60;
    const dueN = CARDS.filter(isDue).length;
    const freshN = CARDS.filter((c) => !S.cards[c.key]).length;
    const next = buildQueue(() => true, 1)[0];
    const nextM = next && next.model ? MBY[next.model] : null;
    const isNew = next && !S.cards[next.key];
    const area = next ? ABY[next.area] : AREAS[0];
    const upTitle = nextM ? nextM.name : next ? `${next.stmts[0]} ${C.statements[next.stmts[0]]}` : 'You’re all caught up';
    const meta = [dueN ? `${plural(dueN, 'review')} due` : 'No reviews due', freshN ? `${freshN} new cards to go` : 'every card seen'].join(', ') + '.' + examCountdown();
    const mins = S.settings.sprint;
    let streakSub = 'Hit today’s goal to start one';
    if (sn.count && sn.done) streakSub = 'Today counted';
    else if (sn.count && sn.needPasses) streakSub = `Hit today’s goal; ${plural(sn.needPasses, 'pass')} will cover the gap`;
    else if (sn.count) streakSub = 'Hit today’s goal to keep it';
    const weakN = CARDS.filter(SPECS.weak().pred).length;
    paint(`<div class="topline"><span class="brand">CPTD study: Building Personal Capability</span><a class="iconbtn" href="#/settings" aria-label="Settings"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></a></div>
      <div class="stackcards"><div class="card hero" style="--tab:${area.tab}"><span class="tab">${isNew ? 'Up next: new to you' : 'Up next'}</span>
        <h1>${esc(upTitle)}</h1>
        <p class="meta">${esc(meta)}</p>
        <button class="btn" data-act="sprint" data-mode="mixed">Start a ${mins}-minute sprint</button>
        <div class="chips" role="group" aria-label="Sprint length">${[2, 5, 10, 15].map((n) => `<button class="chip" data-act="sprint-len" data-n="${n}" aria-pressed="${n === mins}">${n} min</button>`).join('')}</div>
      </div></div>
      <div class="today">
        <div class="big num"><span data-live="today-min">${Math.floor(t / 60)}</span><small> of ${S.settings.goal} min today</small></div>
        <div class="streak">${sn.count ? `<span class="flame" aria-hidden="true">🔥</span> <span class="num">${sn.count}</span>-day streak` : 'No streak yet'}<small>${esc(streakSub)}</small></div>
        <div class="bar"><i data-live="today-bar" style="width:${pct(t / goal)}%"></i></div>
      </div>
      <div class="totals">
        <div><b class="num" data-live="total">${fmtDur(S.time.total)}</b><span>studied in all</span></div>
        <div><b>Level ${li.l}</b><span>${esc(li.title)}</span></div>
        <div><b class="num">${pct(mastery(CARDS))}%</b><span>domain mastery</span></div>
      </div>
      <section class="section"><h2>This week</h2>${weekHTML()}</section>
      <section class="section"><h2>Your six areas</h2><p class="small muted">Tap one for a focused sprint.</p>
        <div class="arealist">${AREAS.map((a) => { const m = mastery(AREA_CARDS[a.id]); return `<button class="arearow" style="--tab:${a.tab}" data-act="sprint" data-mode="area" data-arg="${a.id}"><span class="dot"></span><span><span class="name">${esc(a.name)}</span><div class="bar"><i style="width:${pct(m)}%"></i></div></span><span class="pct num">${pct(m)}%</span></button>`; }).join('')}</div>
      </section>
      <section class="section"><h2>Other ways to study</h2><div class="quick">
        <button class="tile" data-act="sprint" data-mode="weak"><b>Weak spots</b><span>${weakN ? plural(weakN, 'card') + ' to fix' : 'Nothing yet'}</span></button>
        <button class="tile" data-act="sprint" data-mode="scen"><b>Exam-style</b><span>${C.questions.length} questions</span></button>
        <a class="tile" href="#/practice"><b>Case practice</b><span>The exam’s second section</span></a>
        <a class="tile" href="#/listen"><b>Listen</b><span>Hands-free review</span></a>
      </div></section>`);
  }

  /* ================= learn ================= */
  let LEARN = { filter: 'all', q: '' };
  function modelMatches(m) {
    if (LEARN.filter === 'tdbok' && m.tag !== 'tdbok') return false;
    if (!LEARN.q) return true;
    const q = LEARN.q.toLowerCase();
    return [m.name, m.short, m.who].concat(m.items.map((i) => i.t)).some((s) => s.toLowerCase().includes(q));
  }
  function learnListHTML() {
    let any = false;
    const html = AREAS.map((a) => {
      const ms = MODELS.filter((m) => m.area === a.id && modelMatches(m));
      if (!ms.length) return '';
      any = true;
      return `<section class="section"><h2>${esc(a.name)}</h2><p class="small muted">Exam statements ${a.stmts.join(', ')}</p><div class="modellist">${ms.map((m) => `<a class="modelrow" href="#/learn/${m.id}"><b>${esc(m.name)}</b><span class="${S.seen[m.id] ? 'seen-dot' : 'unseen-dot'}" aria-label="${S.seen[m.id] ? 'Opened' : 'Not opened yet'}"></span><span class="who">${m.who === 'TDBoK Guide' ? '' : esc(m.who) + ' '}<span class="badge-tag ${m.tag}">${esc(C.tags[m.tag])}</span></span></a>`).join('')}</div></section>`;
    }).join('');
    return any ? html : '<p class="empty">No models match that search.</p>';
  }
  function viewLearn() {
    setTab('learn');
    const seenN = MODELS.filter((m) => S.seen[m.id]).length;
    paint(`<h1>Learn the models</h1>
      <p class="muted">${seenN} of ${MODELS.length} opened. Each one is written in plain words with its source, a memory hook, and how it tends to show up on the exam.</p>
      <input class="search" type="search" placeholder="Search models, authors, or terms" aria-label="Search models" value="${esc(LEARN.q)}" id="learnq">
      <div class="chips filter-row" role="group" aria-label="Filter">
        <button class="chip" data-act="learn-filter" data-v="all" aria-pressed="${LEARN.filter === 'all'}">All models</button>
        <button class="chip" data-act="learn-filter" data-v="tdbok" aria-pressed="${LEARN.filter === 'tdbok'}">In the TDBoK</button>
      </div>
      <div id="learnlist">${learnListHTML()}</div>`);
    const inp = document.getElementById('learnq');
    inp.addEventListener('input', () => { LEARN.q = inp.value.trim(); document.getElementById('learnlist').innerHTML = learnListHTML(); });
  }
  function viewModel(id) {
    setTab('learn');
    const m = MBY[id];
    if (!S.seen[id]) { S.seen[id] = Date.now(); save(); checkBadges(); }
    const area = ABY[m.area];
    const tag = m.kind === 'ordered' ? 'ol' : 'ul';
    const mine = CARDS.filter((c) => c.model === id);
    const i = MODELS.indexOf(m); const prev = MODELS[i - 1]; const nxt = MODELS[i + 1];
    paint(`<a class="back" href="#/learn">‹ All models</a>
      <div class="card plain model" style="--tab:${area.tab}"><span class="tab">${esc(area.name)}</span>
        <h1>${esc(m.name)}</h1>
        <p class="who">${esc(m.who)}</p>
        <div class="tags"><span class="badge-tag ${m.tag}">${esc(C.tags[m.tag])}</span>${m.stmts.map((s) => `<span class="badge-tag">${s}</span>`).join('')}</div>
        <${tag} class="items">${m.items.map((it) => `<li><b>${esc(it.t)}</b><br><span class="d">${esc(it.d)}</span></li>`).join('')}</${tag}>
        ${m.orderNote ? `<p class="small faint">Order: ${esc(m.orderNote)}.</p>` : ''}
        ${m.groups ? `<div class="callout"><h3>How they group</h3><div class="groups">${m.groups.map((g) => `<div><b>${esc(g.t)}:</b> ${esc(g.m.join(', '))}</div>`).join('')}</div></div>` : ''}
        <div class="callout hook"><h3>Memory hook</h3><p class="small">${esc(m.hook)}</p></div>
        <div class="callout"><h3>How it shows up on the exam</h3><p class="small">${esc(m.exam)}</p></div>
        ${m.note ? `<div class="callout"><h3>Worth knowing</h3><p class="small">${esc(m.note)}</p></div>` : ''}
        <p class="small faint" style="margin-top:14px">Source: ${esc(m.src)}</p>
      </div>
      <div class="btn-row" style="margin-top:18px">
        <button class="btn" data-act="sprint" data-mode="model" data-arg="${m.id}" data-min="3">Drill it</button>
        <button class="btn ghost" data-act="speak-model" data-arg="${m.id}" id="speakbtn">${SPEAK.on ? 'Stop reading' : 'Read it aloud'}</button>
      </div>
      <div class="section"><div class="spread"><h3>Your mastery</h3><span class="num">${pct(mastery(mine))}%</span></div><div class="bar" style="margin-top:6px"><i style="width:${pct(mastery(mine))}%"></i></div></div>
      <div class="btn-row section">
        ${prev ? `<a class="btn ghost small" href="#/learn/${prev.id}">‹ ${esc(prev.short)}</a>` : '<span></span>'}
        ${nxt ? `<a class="btn ghost small" href="#/learn/${nxt.id}">${esc(nxt.short)} ›</a>` : '<span></span>'}
      </div>`);
  }

  /* ================= practice ================= */
  function viewPractice() {
    setTab('practice');
    const weakN = CARDS.filter(SPECS.weak().pred).length;
    paint(`<h1>Practice</h1>
      <p class="muted">Every sprint mixes reviews that are due with new material. Wrong answers come back a few cards later.</p>
      <div class="answer-actions"><button class="btn" data-act="sprint" data-mode="mixed">Mixed ${S.settings.sprint}-minute sprint</button></div>
      <section class="section"><h2>Focus</h2><div class="list">
        <button class="listrow" data-act="sprint" data-mode="scen"><b>Exam-style questions only</b><span class="right num">${C.questions.length}</span><span class="sub">Scenario questions written in the exam’s four-option format</span></button>
        <button class="listrow" data-act="sprint" data-mode="weak"><b>Weak spots</b><span class="right num">${weakN}</span><span class="sub">Cards you’ve missed that aren’t solid yet</span></button>
      </div></section>
      <section class="section"><h2>Case practice</h2><p class="small muted">Section 2 of the exam: a scenario unfolds over several steps. Select every option that fits. Right picks earn a point, wrong picks cost one.</p><div class="list">
        ${C.cases.map((c) => { const best = S.stats.cases[c.id]; const max = c.steps.reduce((n, st) => n + st.options.filter((o) => o[1]).length, 0); return `<a class="listrow" href="#/case/${c.id}"><b>${esc(c.title)}</b><span class="right num">${best != null ? `${best}/${max}` : 'New'}</span><span class="sub">${plural(c.steps.length, 'step')}, statements ${c.stmts.join(', ')}</span></a>`; }).join('')}
      </div></section>
      <section class="section"><h2>By area</h2><div class="list">
        ${AREAS.map((a) => `<button class="listrow" data-act="sprint" data-mode="area" data-arg="${a.id}"><b>${esc(a.name)}</b><span class="right num">${pct(mastery(AREA_CARDS[a.id]))}%</span><span class="sub">${plural(AREA_CARDS[a.id].filter(isDue).length, 'review')} due, ${AREA_CARDS[a.id].filter((c) => !S.cards[c.key]).length} new</span></button>`).join('')}
      </div></section>
      <section class="section"><h2>By exam statement</h2><div class="list">
        ${STMTS.map((s) => `<button class="listrow" data-act="sprint" data-mode="stmt" data-arg="${s}"><b>${s}</b><span class="right num">${pct(mastery(STMT_CARDS[s]))}%</span><span class="sub">${esc(C.statements[s])}</span></button>`).join('')}
      </div></section>
      <section class="section"><h2>More</h2><div class="list">
        <a class="listrow" href="#/listen"><b>Listen</b><span class="right">›</span><span class="sub">Models read aloud for driving, dishes, or bedtime routines</span></a>
        <a class="listrow" href="#/exam"><b>About the exam</b><span class="right">›</span><span class="sub">Format, scoring, and how this domain is tested</span></a>
      </div></section>`);
  }

  /* ================= progress ================= */
  function viewProgress() {
    setTab('progress');
    const li = levelInfo(); const sn = streakNow();
    const acc = S.stats.answered ? Math.round((100 * S.stats.correct) / S.stats.answered) : 0;
    const t0 = todayIdx();
    const start = t0 - 35 - new Date(t0 * 864e5).getUTCDay(); // six weeks, Sunday first
    const cells = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<b class="small faint" style="text-align:center">${d}</b>`);
    for (let i = start; i < start + 42; i += 1) {
      if (i > t0) { cells.push('<i class="future"></i>'); continue; }
      const min = (S.time.days[idxKey(i)] || 0) / 60;
      const lvl = min <= 0 ? '' : min >= S.settings.goal ? 'l3' : min >= S.settings.goal / 2 ? 'l2' : 'l1';
      cells.push(`<i class="${lvl}${i === t0 ? ' today' : ''}" title="${idxKey(i)}: ${Math.round(min)} min"></i>`);
    }
    const weekMin = Array.from({ length: 7 }, (_, k) => S.time.days[idxKey(t0 - k)] || 0).reduce((a, b) => a + b, 0) / 60;
    paint(`<h1>Progress</h1>
      <div class="totals">
        <div><b class="num" data-live="total">${fmtDur(S.time.total)}</b><span>studied in all</span></div>
        <div><b class="num">${Math.round(weekMin)} min</b><span>last 7 days</span></div>
        <div><b class="num">${sn.count} / ${S.streak.best}</b><span>streak / best</span></div>
      </div>
      <section class="section"><h2>Level ${li.l}: ${esc(li.title)}</h2>
        <div class="bar" style="margin-top:4px"><i style="width:${pct(li.frac)}%"></i></div>
        <p class="small muted" style="margin-top:6px">${S.xp} XP${li.toNext ? `, ${li.toNext} to level ${li.l + 1}` : ''}. XP comes from time spent (1 per 10 seconds), answers, and daily goals.</p>
        <p class="small muted">Busy-day passes: ${S.streak.passes} of 3. You earn one every 5 streak days, and each one covers a missed day.</p>
      </section>
      <section class="section"><h2>Last six weeks</h2><div class="heat" role="img" aria-label="Calendar of study minutes">${cells.join('')}</div>
        <p class="small muted" style="margin-top:6px">Full yellow means you hit your daily goal.</p></section>
      <section class="section"><h2>Mastery by exam statement</h2>
        ${STMTS.map((s) => { const cs = STMT_CARDS[s]; return `<div class="stmtrow"><div class="spread"><b>${s}</b><span class="num">${pct(mastery(cs))}%</span></div><p class="small muted">${esc(C.statements[s])}. ${pct(touched(cs))}% of cards seen.</p><div class="bar thin"><i style="width:${pct(mastery(cs))}%"></i></div></div>`; }).join('')}
        <p class="small muted" style="margin-top:10px">Mastery climbs as cards move up the review schedule: 1, 3, 7, 14, then 30 days between reviews.</p>
      </section>
      <section class="section"><h2>Answers</h2><p>${S.stats.answered} answered, ${acc}% right on the first try, ${plural(S.stats.sprints, 'sprint')} finished.</p></section>
      <section class="section"><h2>Stickers</h2><div class="stickers">${BADGES.map((b) => `<div class="sticker${S.badges[b.id] ? '' : ' locked'}"><div class="face" aria-hidden="true">${b.icon}</div><b>${esc(b.name)}</b>${esc(b.desc)}</div>`).join('')}</div></section>
      ${S.log.length ? `<section class="section"><h2>Recent sprints</h2><div class="list">${S.log.slice(0, 6).map((l) => `<div class="listrow"><b>${esc(l.t)}</b><span class="right num">${fmtDur(l.sec)}</span><span class="sub">${new Date(l.d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}: ${l.c} of ${l.n} right first try, +${l.xp} XP</span></div>`).join('')}</div></section>` : ''}`);
  }

  /* ================= settings ================= */
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (location.hash === '#/settings') viewSettings(); });

  function chipRow(act, values, current, fmt) {
    return `<div class="chips">${values.map((v) => `<button class="chip" data-act="${act}" data-v="${v}" aria-pressed="${String(v) === String(current)}">${fmt ? fmt(v) : v}</button>`).join('')}</div>`;
  }
  function toggleRow(name, label, sub) {
    return `<button class="toggle" role="switch" aria-checked="${!!S.settings[name]}" data-act="toggle" data-v="${name}"><span>${esc(label)}${sub ? `<span class="small muted" style="display:block;font-weight:400">${esc(sub)}</span>` : ''}</span><span class="switch" aria-hidden="true"></span></button>`;
  }
  function viewSettings() {
    setTab('home');
    paint(`<a class="back" href="#/">‹ Study</a><h1>Settings</h1>
      <div class="setting"><h3>Daily goal</h3>${chipRow('set-goal', [5, 10, 15, 20, 30], S.settings.goal, (v) => v + ' min')}<p class="small muted" style="margin-top:8px">Small goals keep streaks alive on busy days.</p></div>
      <div class="setting"><h3>Default sprint length</h3>${chipRow('set-sprint', [2, 5, 10, 15], S.settings.sprint, (v) => v + ' min')}</div>
      <div class="setting"><h3>Exam date</h3><p class="small muted">Optional. The home screen counts down to it.</p>
        <div class="row"><input class="search" type="date" id="examdate" value="${esc(S.settings.examDate)}" aria-label="Exam date" style="max-width:220px">${S.settings.examDate ? '<button class="linkbtn" data-act="clear-exam">Clear</button>' : ''}</div></div>
      ${toggleRow('previews', 'Preview new models', 'Show a quick summary card before quizzing a model for the first time')}
      ${toggleRow('haptics', 'Vibrate on answers')}
      ${toggleRow('sound', 'Sounds on answers')}
      <div class="setting"><h3>Theme</h3>${chipRow('set-theme', ['auto', 'light', 'dark'], S.settings.theme, (v) => ({ auto: 'Match phone', light: 'Light', dark: 'Dark' })[v])}</div>
      <div class="setting"><h3>Install on your phone</h3>
        ${installEvt ? '<button class="btn small" data-act="install">Add to home screen</button>' : '<p class="small muted">In Chrome on Android, open the ⋮ menu and choose Add to home screen or Install app. It opens full screen and works offline.</p>'}
      </div>
      <div class="setting"><h3>Back up your progress</h3><p class="small muted">Progress lives in this browser only. Save a backup file now and then, especially before clearing browser data or switching phones.</p>
        <div class="btn-row"><button class="btn ghost small" data-act="export">Save backup</button><button class="btn ghost small" data-act="import">Restore backup</button></div></div>
      <div class="setting"><h3>About the content</h3>
        <p class="small">Built around the 11 Building Personal Capability statements on the CPTD content outline (effective July 1, 2020, and still the outline in ATD’s 2025 CPTD handbook). Models come from the TDBoK Guide, books on ATD’s certification reading list, and the original authors. Everything is written in plain words, not copied.</p>
        <p class="small">Labels on each model: <b>In the TDBoK</b> means the TDBoK Guide covers it. <b>On ATD’s reading list</b> means it comes from a book ATD lists for exam prep. <b>Named in the exam outline</b> means the outline names that theory. <b>Good to know</b> means it’s widely used but not confirmed in the TDBoK.</p>
        <p class="small">If anything here disagrees with your TDBoK, trust the TDBoK.</p>
        <p class="small muted">Content version ${esc(C.version)}.</p></div>
      <div class="setting"><button class="linkbtn" data-act="reset">Erase all progress on this device</button></div>`);
    const dt = document.getElementById('examdate');
    if (dt) dt.addEventListener('change', () => { S.settings.examDate = dt.value || ''; save(); viewSettings(); });
  }

  /* ================= exam facts ================= */
  function viewExam() {
    setTab('practice');
    paint(`<a class="back" href="#/practice">‹ Practice</a><h1>About the exam</h1>
      <p class="muted">From ATD Certification Institute’s CPTD handbook and study planning guide.</p>
      <div class="facts section">${C.exam.facts.map((f) => `<div><b>${esc(f[0])}</b><span class="small">${esc(f[1])}</span></div>`).join('')}</div>
      <section class="section"><h2>Study tips for this domain</h2><ol class="tips small">${C.exam.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></section>
      <section class="section"><h2>The 11 statements tested</h2><div class="list">${STMTS.map((s) => `<button class="listrow" data-act="sprint" data-mode="stmt" data-arg="${s}"><b>${s}</b><span class="right">›</span><span class="sub">${esc(C.statements[s])}</span></button>`).join('')}</div></section>`);
  }

  /* ================= case practice ================= */
  function startCase(id) {
    const c = C.cases.find((x) => x.id === id);
    if (!c) { location.replace('#/practice'); return; }
    if (!CASE || CASE.c !== c) {
      CASE = { c, step: 0, picks: new Set(), submitted: false, score: 0, right: 0, wrong: 0, done: false, order: c.steps.map((st) => shuffle(st.options.map((_, i) => i))) };
    }
    renderCase();
  }
  function caseMax(c) { return c.steps.reduce((n, st) => n + st.options.filter((o) => o[1]).length, 0); }
  function renderCase() {
    const K = CASE; const c = K.c;
    if (K.done) {
      const max = caseMax(c);
      paint(`<div class="runbar"><a class="iconbtn" href="#/practice" aria-label="Back to practice">✕</a><div class="timer"><div class="bar thin"><i style="width:100%"></i></div><span>Case finished</span></div><span class="xp num hl">${K.score} pts</span></div>
        <div class="card qcard"><span class="tab">Case: ${esc(c.title)}</span><h1 class="prompt" id="qhead" tabindex="-1">${K.score} out of ${max} points</h1>
        <p class="hint">${K.right} right picks, ${K.wrong} wrong picks. On the real exam, wrong picks cost a point each, so only select what you’re sure fits.</p></div>
        <div class="answer-actions section"><button class="btn" data-act="case-again">Try it again</button><a class="btn ghost" href="#/practice">Back to practice</a></div>`);
      return;
    }
    const st = c.steps[K.step];
    const ord = K.order[K.step];
    paint(`<div class="runbar"><a class="iconbtn" href="#/practice" aria-label="Leave case">✕</a><div class="timer"><div class="bar thin"><i style="width:${pct(K.step / c.steps.length)}%"></i></div><span>Step ${K.step + 1} of ${c.steps.length}</span></div><span class="xp num hl">${K.score} pts</span></div>
      <div class="card plain qcard" style="--tab:var(--hl-blue)"><span class="tab">Case: ${esc(c.title)}</span><p class="small" style="margin:0">${esc(c.setup)}</p></div>
      <div class="card plain qcard"><span class="tab">Step ${K.step + 1}</span><h1 class="prompt" id="qhead" tabindex="-1">${esc(st.text)}</h1><p class="hint">Select all that apply.</p></div>
      <div class="opts" role="group" aria-label="Options">${ord.map((oi) => `<button class="opt multi" data-act="case-opt" data-i="${oi}" aria-pressed="${K.picks.has(oi)}" ${K.submitted ? 'disabled' : ''}><span>${esc(st.options[oi][0])}</span></button>`).join('')}</div>
      <div class="answer-actions" id="checkrow"><button class="btn" data-act="case-submit" ${K.picks.size ? '' : 'disabled'}>Submit this step</button></div>
      <div id="feedback" aria-live="polite"></div>`);
    const h = document.getElementById('qhead');
    if (h) h.focus({ preventScroll: true });
  }
  function submitCaseStep() {
    const K = CASE; const st = K.c.steps[K.step];
    K.submitted = true;
    let right = 0; let wrong = 0;
    const els = Array.from(app.querySelectorAll('.opt'));
    els.forEach((b) => {
      const oi = +b.dataset.i; const good = st.options[oi][1]; const sel = K.picks.has(oi);
      b.disabled = true;
      if (sel && good) { b.classList.add('ok'); right += 1; }
      else if (sel) { b.classList.add('bad'); wrong += 1; }
      else if (good) { b.classList.add('missed'); b.insertAdjacentHTML('beforeend', '<span class="tag">This one fit too</span>'); }
      else b.classList.add('dim');
    });
    K.right += right; K.wrong += wrong; K.score += right - wrong;
    const pill = app.querySelector('.runbar .xp');
    if (pill) pill.textContent = `${K.score} pts`;
    addXP(right * 3);
    if (right && !wrong) { haptic('ok'); sound('ok'); } else { haptic('bad'); sound('bad'); }
    const row = document.getElementById('checkrow');
    if (row) row.remove();
    const last = K.step === K.c.steps.length - 1;
    document.getElementById('feedback').innerHTML = `<div class="why${wrong ? ' miss' : ''}"><h3>This step: +${right}${wrong ? ` −${wrong}` : ''}</h3><p class="small">${esc(st.why)}</p></div>
      <div class="answer-actions"><button class="btn" data-act="case-next">${last ? 'Finish the case' : 'Next step'}</button></div>`;
    document.getElementById('feedback').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    save();
  }

  /* ================= listening ================= */
  const LISTEN = { on: false, area: 'all', i: 0, chunks: [], ci: 0, tok: 0 };
  const SPEAK = { on: false, tok: 0 };
  const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const speechText = (s) => s
    .replace(/→/g, ', then ')
    .replace(/[“”]/g, '')
    .replace(/×/g, ' by ')
    .replace(/&/g, ' and ')
    .replace(/([A-Za-z])\/([A-Za-z])/g, '$1 or $2')
    .replace(/\s+/g, ' ');
  function scriptFor(m, withDesc) {
    const parts = [`${m.name}.`, `From ${m.who}.`, `${m.items.length} ${m.unit}${m.kind === 'ordered' ? ', in order' : ''}.`];
    m.items.forEach((it, k) => {
      const lead = m.kind === 'ordered' ? `${k + 1}: ` : '';
      parts.push(withDesc ? `${lead}${it.t}. ${it.d}` : `${lead}${it.t}.`);
    });
    parts.push(`Memory hook: ${m.hook}`);
    return parts;
  }
  let wakeLock = null;
  async function wake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
      else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { wakeLock = null; }
  }
  function say(text, tok, holder, onDone) {
    const u = new SpeechSynthesisUtterance(speechText(text));
    u.rate = S.settings.rate; u.lang = 'en-US';
    u.onend = () => { if (holder.tok === tok && holder.on) onDone(); };
    u.onerror = u.onend;
    speechSynthesis.speak(u);
  }
  const listenModels = () => MODELS.filter((m) => LISTEN.area === 'all' || m.area === LISTEN.area);
  function listenStep() {
    if (!LISTEN.on) return;
    const list = listenModels();
    const m = list[LISTEN.i];
    if (!m) { stopListen(); toast('That’s the end of the list.'); return; }
    if (LISTEN.ci === 0) LISTEN.chunks = scriptFor(m, S.settings.desc);
    const text = LISTEN.chunks[LISTEN.ci];
    if (text == null) {
      LISTEN.i += 1; LISTEN.ci = 0;
      if (location.hash === '#/listen') updateListenNow();
      const tk = LISTEN.tok;
      setTimeout(() => { if (tk === LISTEN.tok) listenStep(); }, 700);
      return;
    }
    if (location.hash === '#/listen') updateListenNow();
    const tok = LISTEN.tok;
    say(text, tok, LISTEN, () => { LISTEN.ci += 1; listenStep(); });
  }
  function startListen() {
    if (!canSpeak) return;
    LISTEN.on = true; LISTEN.tok += 1; audioOn = true; poke();
    speechSynthesis.cancel();
    wake(true);
    setTimeout(listenStep, 150);
    viewListen();
  }
  function stopListen() {
    LISTEN.on = false; LISTEN.tok += 1; audioOn = false;
    if (canSpeak) speechSynthesis.cancel();
    wake(false);
    save();
    if (location.hash === '#/listen') viewListen();
  }
  function skipListen(d) {
    const n = listenModels().length;
    LISTEN.i = clamp(LISTEN.i + d, 0, Math.max(0, n - 1)); LISTEN.ci = 0;
    if (LISTEN.on) { LISTEN.tok += 1; speechSynthesis.cancel(); setTimeout(listenStep, 200); }
    viewListen();
  }
  function updateListenNow() {
    const el = document.getElementById('listennow');
    if (!el) return;
    const list = listenModels(); const m = list[LISTEN.i];
    if (!m) return;
    const cur = LISTEN.on ? (LISTEN.chunks[LISTEN.ci] || '') : '';
    el.innerHTML = `<span class="tab">${LISTEN.i + 1} of ${list.length}</span><p class="ctx">${esc(m.who)}</p><h1 class="prompt">${esc(m.name)}</h1><p class="hint">${cur ? esc(cur) : esc(m.items.map((x) => x.t).join(', '))}</p>`;
    el.style.setProperty('--tab', ABY[m.area].tab);
  }
  function viewListen() {
    setTab('practice');
    if (!canSpeak) { paint('<a class="back" href="#/practice">‹ Practice</a><h1>Listen</h1><p class="empty">This browser can’t read text aloud. Chrome on Android can.</p>'); return; }
    const list = listenModels();
    if (LISTEN.i >= list.length) LISTEN.i = 0;
    paint(`<a class="back" href="#/practice">‹ Practice</a><h1>Listen</h1>
      <p class="muted">Each model is read aloud with its memory hook. Time counts while it plays, and the screen stays on.</p>
      <div class="chips filter-row scroll-row" role="group" aria-label="Area">${[{ id: 'all', name: 'All areas' }].concat(AREAS).map((a) => `<button class="chip" data-act="listen-area" data-v="${a.id}" aria-pressed="${LISTEN.area === a.id}">${esc(a.name)}</button>`).join('')}</div>
      <div class="card qcard listen-now" id="listennow" style="margin-top:28px"></div>
      <div class="player">
        <button class="btn ghost" data-act="listen-skip" data-v="-1" aria-label="Previous model">‹ Back</button>
        <button class="btn" data-act="listen-toggle">${LISTEN.on ? 'Pause' : 'Play'}</button>
        <button class="btn ghost" data-act="listen-skip" data-v="1" aria-label="Next model">Next ›</button>
      </div>
      ${toggleRow('desc', 'Read the descriptions too', 'Longer, but better the first time through')}
      <div class="setting"><h3>Speed</h3>${chipRow('set-rate', [0.85, 1, 1.15, 1.3], S.settings.rate, (v) => v + '×')}</div>`);
    updateListenNow();
  }
  function stopSpeak() { SPEAK.on = false; SPEAK.tok += 1; audioOn = LISTEN.on; if (canSpeak && !LISTEN.on) speechSynthesis.cancel(); }
  function speakModel(id) {
    if (!canSpeak) { toast('This browser can’t read text aloud.'); return; }
    if (SPEAK.on) { stopSpeak(); const b = document.getElementById('speakbtn'); if (b) b.textContent = 'Read it aloud'; return; }
    if (LISTEN.on) stopListen();
    speechSynthesis.cancel();
    SPEAK.on = true; SPEAK.tok += 1; audioOn = true;
    const chunks = scriptFor(MBY[id], true); let k = 0; const tok = SPEAK.tok;
    const b = document.getElementById('speakbtn'); if (b) b.textContent = 'Stop reading';
    const step = () => {
      if (k >= chunks.length) { stopSpeak(); const bb = document.getElementById('speakbtn'); if (bb) bb.textContent = 'Read it aloud'; return; }
      say(chunks[k], tok, SPEAK, () => { k += 1; step(); });
    };
    step();
  }

  /* ================= backup ================= */
  function exportProgress() {
    flushTime();
    const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cptd-progress-${todayKey()}.json`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast('Backup saved to your downloads.');
  }
  function importProgress() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      f.text().then((txt) => {
        const data = JSON.parse(txt);
        if (!data || data.v !== 1 || typeof data.cards !== 'object' || !data.time) throw new Error('not a backup');
        if (!confirm('Replace the progress on this device with the backup?')) return;
        S = upgrade(data); save(true); applyTheme();
        toast('Progress restored.');
        route();
      }).catch(() => toast('That file isn’t a backup from this app.'));
    };
    inp.click();
  }
  function requestPersist() {
    try { if (!S.persistAsked && navigator.storage && navigator.storage.persist) { S.persistAsked = true; navigator.storage.persist(); } } catch (e) { /* not supported */ }
  }

  /* ================= actions ================= */
  const ACT = {
    'sprint': (el) => {
      const mode = el.dataset.mode; const arg = el.dataset.arg;
      const minutes = +(el.dataset.min || S.settings.sprint);
      const spec = mode === 'area' ? SPECS.area(arg) : mode === 'stmt' ? SPECS.stmt(arg) : mode === 'model' ? SPECS.model(arg) : mode === 'scen' ? SPECS.scen() : mode === 'weak' ? SPECS.weak() : SPECS.mixed();
      startRun(spec, minutes);
    },
    'sprint-len': (el) => { S.settings.sprint = +el.dataset.n; save(); viewHome(); },
    'opt': (el) => {
      const Q = CUR; if (!Q || Q.done) return;
      const i = +el.dataset.i;
      if (Q.kind === 'single') { answerSingle(i); return; }
      if (Q.picked.has(i)) Q.picked.delete(i); else Q.picked.add(i);
      el.setAttribute('aria-pressed', Q.picked.has(i) ? 'true' : 'false');
      const chk = app.querySelector('[data-act="check"]');
      if (chk) chk.disabled = Q.picked.size === 0;
    },
    'check': () => { const Q = CUR; if (!Q || Q.done) return; if (Q.kind === 'multi') checkMulti(); else if (Q.kind === 'order') checkOrder(); },
    'place': (el) => { const Q = CUR; if (!Q || Q.done) return; const t = el.dataset.t; if (!Q.placed.includes(t)) Q.placed.push(t); document.getElementById('orderbox').innerHTML = orderHTML(Q); },
    'unplace': (el) => { const Q = CUR; if (!Q || Q.done) return; Q.placed.splice(+el.dataset.i, 1); document.getElementById('orderbox').innerHTML = orderHTML(Q); },
    'clear-order': () => { const Q = CUR; if (!Q || Q.done) return; Q.placed = []; document.getElementById('orderbox').innerHTML = orderHTML(Q); },
    'next': () => { if (!RUN) return; if (RUN.timeUp) finishRun(true); else nextCard(); },
    'end-run': () => finishRun(true),
    'preview-go': () => { if (!RUN) return; const id = RUN.previewModel; if (id && !S.seen[id]) { S.seen[id] = Date.now(); save(); } if (RUN.timeUp) finishRun(true); else nextCard(); },
    'no-previews': () => { S.settings.previews = false; save(); ACT['preview-go'](); },
    'again': () => { if (RUN) startRun(RUN.spec, RUN.minutes); },
    'review-misses': () => { if (RUN) startRun(SPECS.keys(RUN.missed), RUN.minutes); },
    'learn-filter': (el) => { LEARN.filter = el.dataset.v; viewLearn(); },
    'speak-model': (el) => speakModel(el.dataset.arg),
    'set-goal': (el) => { S.settings.goal = +el.dataset.v; const k = todayKey(); if (!S.goalDays[k] && (S.time.days[k] || 0) >= S.settings.goal * 60) goalMet(k); save(); viewSettings(); },
    'set-sprint': (el) => { S.settings.sprint = +el.dataset.v; save(); viewSettings(); },
    'clear-exam': () => { S.settings.examDate = ''; save(); viewSettings(); },
    'set-theme': (el) => { S.settings.theme = el.dataset.v; applyTheme(); save(); viewSettings(); },
    'set-rate': (el) => { S.settings.rate = +el.dataset.v; save(); viewListen(); },
    'toggle': (el) => { const k = el.dataset.v; S.settings[k] = !S.settings[k]; save(); el.setAttribute('aria-checked', String(!!S.settings[k])); if (k === 'haptics' && S.settings.haptics) haptic('ok'); if (k === 'sound' && S.settings.sound) sound('ok'); },
    'install': () => { if (!installEvt) return; installEvt.prompt(); const done = () => { installEvt = null; viewSettings(); }; installEvt.userChoice.then(done, done); },
    'export': () => exportProgress(),
    'import': () => importProgress(),
    'reset': () => {
      if (!confirm('Erase all progress on this device? This can’t be undone.')) return;
      S = fresh(); save(true); applyTheme(); toast('Progress erased.');
      if (location.hash === '#/' || location.hash === '') route(); else location.hash = '#/';
    },
    'case-opt': (el) => { const K = CASE; if (!K || K.submitted) return; const i = +el.dataset.i; if (K.picks.has(i)) K.picks.delete(i); else K.picks.add(i); el.setAttribute('aria-pressed', String(K.picks.has(i))); const b = app.querySelector('[data-act="case-submit"]'); if (b) b.disabled = K.picks.size === 0; },
    'case-submit': () => { if (CASE && !CASE.submitted && CASE.picks.size) submitCaseStep(); },
    'case-next': () => {
      const K = CASE; if (!K) return;
      if (K.step < K.c.steps.length - 1) { K.step += 1; K.picks = new Set(); K.submitted = false; renderCase(); return; }
      K.done = true;
      const prev = S.stats.cases[K.c.id];
      S.stats.cases[K.c.id] = prev == null ? K.score : Math.max(prev, K.score);
      checkBadges(); save(true);
      renderCase();
    },
    'case-again': () => { const c = CASE && CASE.c; CASE = null; if (c) startCase(c.id); },
    'listen-toggle': () => { if (LISTEN.on) stopListen(); else startListen(); },
    'listen-skip': (el) => skipListen(+el.dataset.v),
    'listen-area': (el) => { const was = LISTEN.on; if (was) stopListen(); LISTEN.area = el.dataset.v; LISTEN.i = 0; LISTEN.ci = 0; viewListen(); },
  };
  app.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !app.contains(el)) return;
    const fn = ACT[el.dataset.act];
    if (!fn) return;
    if (el.tagName === 'A') e.preventDefault();
    fn(el, e);
  });
  // The "read descriptions" toggle on the Listen screen restarts the current model with the new script.
  const baseToggle = ACT.toggle;
  ACT.toggle = (el) => { baseToggle(el); if (el.dataset.v === 'desc' && LISTEN.on) { LISTEN.ci = 0; LISTEN.tok += 1; speechSynthesis.cancel(); setTimeout(listenStep, 200); } };

  /* ================= start ================= */
  (function onOpen() {
    const t = todayIdx(); const last = S.stats.lastVisit;
    if (last != null && t - last >= 3) setTimeout(() => { award('back'); toast('Welcome back. Your progress is right where you left it.'); }, 700);
    S.stats.lastVisit = t;
    save();
  })();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  route();
  window.__cptd = { get state() { return S; }, CARDS, makeQ, buildQueue, version: C.version };
})();
