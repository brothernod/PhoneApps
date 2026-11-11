// Corgidoku shop: coins, prices and the item catalog.
// Pure functions only (no DOM, no storage) so tools can test the coin math in node.
// Everything here is cosmetic. Hints are always free and are never sold.
import { partyHat } from './art.js';

// ---------- catalog ----------
// slot: head | neck | face. art: an SVG fragment in Cheddar's loaf space (viewBox "4 4 192 250").
// thumb: the viewBox that frames the item on its own for the Closet tile.
export const ITEMS = [
  { id: 'partyhat', slot: 'head', name: 'Party hat', price: 60, art: partyHat, thumb: '83 -7 80 80' },
];
export const SLOTS = ['head', 'neck', 'face'];
export const item = (id) => ITEMS.find((x) => x.id === id) || null;
// Kids pay half price.
export const priceFor = (it, kid) => (kid ? Math.ceil(it.price / 2) : it.price);

// ---------- earning rules ----------
// Puzzle ids are "<prefix>:<key>": daily prefixes end in "d" (key = date), climb prefixes in "c" (key = hold).
const DAILY_RATE = { d: 10, hd: 15, xd: 20, kd: 10 }; // today's daily: Cozy / Hard / Extreme (Chill is kids-only)
export const RATES = { pastDay: 3, climb: 2, clean: 3, weekly: 25, weeklyDays: 5, kid: 10, kidClean: 5, kidStart: 100 };

const parse = (pid) => { const [pre, key] = pid.split(':'); return { pre, key, daily: pre.endsWith('d') }; };
// "Clean" = zero mistakes. Relaxed mode can't lose treats, so mistakes are what count.
const isClean = (p) => (p.mistakes ?? 0) === 0;
// A daily counts as "today's" when it was solved on the puzzle's own date.
const onDay = (pid, p) => { const x = parse(pid); return x.daily && p.solvedAt === x.key; };

// Coins for one solve, before the weekly bonus. withClean = false is used for back pay.
export function coinsFor(pid, p, kid, withClean = true) {
  const { pre, daily } = parse(pid);
  if (kid) return RATES.kid + (withClean && isClean(p) ? RATES.kidClean : 0);
  const base = daily ? (onDay(pid, p) ? DAILY_RATE[pre] ?? DAILY_RATE.d : RATES.pastDay) : RATES.climb;
  return base + (withClean && isClean(p) ? RATES.clean : 0);
}

// ISO week key (Mon-Sun), e.g. "2026-W46".
export function isoWeek(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7; // Mon = 0
  d.setUTCDate(d.getUTCDate() - day + 3); // Thursday of this week decides the year
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d - Date.UTC(year, 0, 1)) / 864e5 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
// Distinct dates in a week on which that day's daily (any mode) was solved on the day.
export function weekDays(progress, week) {
  const days = new Set();
  for (const [pid, p] of Object.entries(progress)) if (p?.solved && onDay(pid, p) && isoWeek(p.solvedAt) === week) days.add(p.solvedAt);
  return days.size;
}

// Fresh shop fields for a player db. Additive: old keys are never touched.
export function shopDefaults(db) {
  db.coins ??= 0; db.paid ??= {}; db.weeks ??= {}; db.owned ??= []; db.worn ??= {};
}

// Pay a just-solved puzzle once. Returns { coins, weekly } (both 0 if it was paid before).
export function payout(db, pid, kid) {
  shopDefaults(db);
  const p = db.progress[pid];
  const out = { coins: 0, weekly: 0 };
  if (!p?.solved || db.paid[pid]) return out;
  db.paid[pid] = 1;
  out.coins = coinsFor(pid, p, kid);
  if (!kid && onDay(pid, p)) {
    const wk = isoWeek(p.solvedAt);
    if (!db.weeks[wk] && weekDays(db.progress, wk) >= RATES.weeklyDays) { db.weeks[wk] = 1; out.weekly = RATES.weekly; }
  }
  db.coins += out.coins + out.weekly;
  return out;
}

// First launch with the shop: credit every puzzle already solved (base rates, no clean bonus,
// no weekly back pay). Weeks that already qualify are marked paid so they can't pay later.
// Kids also get their starting 100. Runs once per player (db.shopV).
export function backPay(db, kid) {
  shopDefaults(db);
  if (db.shopV) return null;
  let coins = 0, puzzles = 0;
  for (const [pid, p] of Object.entries(db.progress || {})) {
    if (!p?.solved || db.paid[pid]) continue;
    db.paid[pid] = 1; puzzles++;
    coins += coinsFor(pid, p, kid, false);
  }
  if (!kid) for (const p of Object.values(db.progress || {})) if (p?.solvedAt) { const wk = isoWeek(p.solvedAt); if (weekDays(db.progress, wk) >= RATES.weeklyDays) db.weeks[wk] = 1; }
  const start = kid ? RATES.kidStart : 0;
  db.coins += coins + start;
  db.shopV = 1;
  return { coins, puzzles, start };
}

// Buy an item. Returns false if it's owned already or the player can't afford it.
export function buy(db, id, kid) {
  shopDefaults(db);
  const it = item(id);
  if (!it || db.owned.includes(id)) return false;
  const cost = priceFor(it, kid);
  if (db.coins < cost) return false;
  db.coins -= cost;
  db.owned.push(id);
  return true;
}
