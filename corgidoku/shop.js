// Corgidoku shop: coins, prices and the item catalog.
// Pure functions only (no DOM, no storage) so tools can test the coin math in node.
// Everything here is cosmetic. Hints (Sniff) are free on Chill and Cozy and cost coins on Hard and Extreme.
import { OUTFIT } from './art.js';
import { SCENE_ART } from './scenes.js';

// ---------- catalog ----------
// slot: head | neck | face. art: an SVG fragment in Cheddar's 200x200 space (see OUTFIT in art.js).
// thumb: the viewBox that frames the item on its own for the Closet tile.
// Grown-up prices: basic 60 · nice 150 · fancy 350 · dream 900. Kids pay half.
// Color variants: one drawing makes several items. `paint` lists the item's recolorable hexes as
// [main, dark, light, deep] (null where unused); `color` names the drawn color; `colors` are the
// other colors on sale, from PALETTE. A variant's id is "<item>:<color>", e.g. "bandana:purple".
export const PALETTE = {
  pink: { name: 'Pink', hex: ['#FF6FB5', '#C93F86', '#FFC6DE', '#7A2A5E'] },
  purple: { name: 'Purple', hex: ['#9B6BFF', '#6B44C9', '#D9C9FF', '#3E2A7A'] },
  blue: { name: 'Blue', hex: ['#46B3FF', '#2E7BC4', '#BFE4FF', '#1F4E7A'] },
  mint: { name: 'Mint', hex: ['#3FD98B', '#22A866', '#C6F5DD', '#1F6A48'] },
  green: { name: 'Green', hex: ['#6CCB5F', '#3E9A3A', '#C8F0B8', '#1F5A2A'] },
  yellow: { name: 'Yellow', hex: ['#FFC93C', '#D99A12', '#FFEBA6', '#7A5A12'] },
  red: { name: 'Red', hex: ['#FF5A5A', '#C93636', '#FFC2C2', '#7A1F2A'] },
  orange: { name: 'Orange', hex: ['#FF9F45', '#D9741C', '#FFD9B0', '#7A3E12'] },
  black: { name: 'Black', hex: ['#3A3346', '#24202C', '#7D7590', '#1A1720'] },
};
export const ITEMS = [
  { id: 'partyhat', slot: 'head', name: 'Party hat', price: 60, thumb: '66 -30 96 96', color: 'pink', paint: ['#FF6FB5'], colors: ['blue', 'mint', 'purple'] },
  { id: 'beanie', slot: 'head', name: 'Pom-pom beanie', price: 60, thumb: '50 -25 100 100', color: 'pink', paint: ['#FF6FB5', '#C93F86', '#FFC6DE'], colors: ['blue', 'mint', 'purple'] },
  { id: 'flowercrown', slot: 'head', name: 'Flower crown', price: 150, thumb: '22 -12 156 156' },
  { id: 'rainbowbow', slot: 'head', name: 'Rainbow bow', price: 150, thumb: '58 -16 112 112' },
  { id: 'pirate', slot: 'head', name: 'Pirate hat', price: 150, thumb: '44 -24 112 112' },
  { id: 'bandana', slot: 'neck', name: 'Bandana', price: 60, thumb: '50 115 100 100', color: 'pink', paint: ['#FF6FB5'], colors: ['purple', 'blue', 'mint'] },
  { id: 'bowtie', slot: 'neck', name: 'Bow tie', price: 60, thumb: '55 118 90 90', color: 'purple', paint: ['#9B6BFF', '#6B44C9'], colors: ['pink', 'blue', 'red'] },
  { id: 'heartglasses', slot: 'face', name: 'Heart sunglasses', price: 150, thumb: '14 20 172 172', color: 'pink', paint: ['#FF6FB5', null, null, '#7A2A5E'], colors: ['purple', 'red', 'blue'] },
];
ITEMS.push(
  { id: 'helmet', slot: 'head', name: 'Climbing helmet', price: 150, thumb: '42 -14 116 116', color: 'red', paint: ['#FF5A5A', '#C93636', '#FFC2C2'], colors: ['blue', 'mint', 'purple'] },
  { id: 'tiara', slot: 'head', name: 'Tiara', price: 350, thumb: '48 -18 104 104', color: 'pink', paint: ['#FF6FB5', '#C93F86', '#FFC6DE'], colors: ['blue', 'purple', 'mint'] },
  { id: 'wizard', slot: 'head', name: 'Wizard hat', price: 350, thumb: '28 -24 144 100', color: 'purple', paint: ['#7B5CE0', '#4E35A8', '#B9A6FF'], colors: ['blue', 'pink', 'mint'] },
  { id: 'dino', slot: 'head', name: 'Dino hood', price: 350, thumb: '6 -26 188 188', color: 'green', paint: ['#6CCB5F', '#3E9A3A', '#C8F0B8'], colors: ['purple', 'blue', 'pink'] },
  { id: 'bunny', slot: 'head', name: 'Bunny ears', price: 150, thumb: '44 -30 122 122', color: 'pink', paint: ['#FF6FB5', '#C93F86', '#FFC6DE'], colors: ['blue', 'purple', 'mint'] },
  { id: 'cap', slot: 'head', name: 'Baseball cap', price: 60, thumb: '46 -26 134 134', color: 'blue', paint: ['#46B3FF', '#2E7BC4', '#BFE4FF'], colors: ['mint', 'red', 'orange'] },
  { id: 'cowboy', slot: 'head', name: 'Cowboy hat', price: 150, thumb: '8 -64 184 184', color: 'red', paint: ['#FF5A5A', '#C93636', '#FFC2C2'], colors: ['blue', 'mint', 'purple'] },
  { id: 'crown', slot: 'head', name: 'King crown', price: 350, thumb: '34 -26 132 132', color: 'red', paint: ['#FF5A5A', '#C93636', '#FFC2C2'], colors: ['blue', 'purple', 'mint'] },
  { id: 'unicorn', slot: 'head', name: 'Unicorn horn', price: 900, thumb: '46 -30 110 110' },
  { id: 'bandana-rainbow', slot: 'neck', name: 'Rainbow bandana', price: 150, thumb: '48 113 104 104' },
  { id: 'scarf', slot: 'neck', name: 'Cozy scarf', price: 150, thumb: '38 112 124 124', color: 'red', paint: ['#FF5A5A', '#C93636', '#FFC2C2'], colors: ['blue', 'mint', 'purple'] },
  { id: 'necktie', slot: 'neck', name: 'Necktie', price: 60, thumb: '68 142 64 64', color: 'blue', paint: ['#46B3FF', '#2E7BC4', '#BFE4FF'], colors: ['red', 'purple', 'mint'] },
  { id: 'starcollar', slot: 'neck', name: 'Star collar', price: 150, thumb: '44 114 112 112', color: 'purple', paint: ['#9B6BFF', '#6B44C9', '#D9C9FF'], colors: ['pink', 'blue', 'mint'] },
  { id: 'roundglasses', slot: 'face', name: 'Round glasses', price: 60, thumb: '16 22 168 168', color: 'black', paint: ['#3A3346', null, '#7D7590'], colors: ['pink', 'purple', 'yellow'] },
  { id: 'shades', slot: 'face', name: 'Cool shades', price: 150, thumb: '22 68 156 156', color: 'black', paint: ['#3A3346', null, '#7D7590'], colors: ['blue', 'red', 'yellow'] },
  { id: 'mustache', slot: 'face', name: 'Fancy mustache', price: 60, thumb: '34 58 132 132' },
);
export const VARIANT_PRICE = 40;
for (const it of ITEMS) it.art = OUTFIT[it.id] || '';
export const SLOTS = ['head', 'neck', 'face'];
// Swap an item's recolorable hexes for another palette color (case-insensitive, whole hex only).
function recolor(art, paint, to) {
  const map = {};
  paint.forEach((h, i) => { if (h) map[h.toUpperCase()] = PALETTE[to].hex[i]; });
  return art.replace(/#[0-9a-fA-F]{6}\b/g, (h) => map[h.toUpperCase()] || h);
}
const base = (id) => ITEMS.find((x) => x.id === id) || null;
const variants = new Map(); // built once on first use
// item('bandana') is the drawn item; item('bandana:blue') is a color variant with its own art and price.
export function item(id) {
  if (!id) return null;
  if (!id.includes(':')) return base(id);
  if (variants.has(id)) return variants.get(id);
  const [b, c] = id.split(':'), it = base(b);
  if (!it || !it.colors?.includes(c)) return null;
  const v = { id, base: b, colorKey: c, slot: it.slot, name: `${PALETTE[c].name} ${it.name.toLowerCase()}`, price: VARIANT_PRICE, thumb: it.thumb, art: recolor(it.art, it.paint, c), variant: true };
  variants.set(id, v);
  return v;
}
// Every color of an item, drawn color first: [{ id, key, name, dot }].
export function colorsOf(id) {
  const it = base(String(id).split(':')[0]);
  if (!it?.colors) return [];
  return [{ id: it.id, key: it.color, name: PALETTE[it.color].name, dot: it.paint[0] },
    ...it.colors.map((c) => ({ id: `${it.id}:${c}`, key: c, name: PALETTE[c].name, dot: PALETTE[c].hex[0] }))];
}
export const baseId = (id) => (id ? String(id).split(':')[0] : id);
// Owns the item in any color (a variant can only be bought once you own some color of it).
export const ownsLine = (db, id) => (db.owned || []).some((o) => baseId(o) === baseId(id));
// The art for what a player has on: { head, neck, face } fragments ('' for an empty slot).
export const outfit = (worn = {}) => Object.fromEntries(SLOTS.map((s) => [s, item(worn[s])?.art || '']));
// Kids pay half price.
export const priceFor = (it, kid) => (kid ? Math.ceil(it.price / 2) : it.price);

// ---------- earning rules ----------
// Puzzle ids are "<prefix>:<key>": daily prefixes end in "d" (key = date), climb prefixes in "c" (key = hold),
// Bonus Yards prefixes in "b" (key = yard number).
const DAILY_RATE = { d: 10, hd: 15, xd: 20, kd: 10 }; // today's daily: Cozy / Hard / Extreme (Chill is kids-only)
export const RATES = { pastDay: 3, climb: 2, bonus: 3, clean: 3, weekly: 25, weeklyDays: 5, kid: 10, kidBonus: 5, kidClean: 5, kidStart: 100 };

const parse = (pid) => { const [pre, key] = pid.split(':'); return { pre, key, daily: pre.endsWith('d'), bonus: pre.endsWith('b') }; };
// "Clean" = zero mistakes. Relaxed mode can't lose treats, so mistakes are what count.
const isClean = (p) => (p.mistakes ?? 0) === 0;
// A daily counts as "today's" when it was solved on the puzzle's own date.
const onDay = (pid, p) => { const x = parse(pid); return x.daily && p.solvedAt === x.key; };

// Coins for one solve, before the weekly bonus. withClean = false is used for back pay.
export function coinsFor(pid, p, kid, withClean = true) {
  const { pre, daily, bonus } = parse(pid);
  if (kid) return (bonus ? RATES.kidBonus : RATES.kid) + (withClean && isClean(p) ? RATES.kidClean : 0);
  const base = daily ? (onDay(pid, p) ? DAILY_RATE[pre] ?? DAILY_RATE.d : RATES.pastDay) : bonus ? RATES.bonus : RATES.climb;
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
  db.coins ??= 0; db.paid ??= {}; db.weeks ??= {}; db.owned ??= []; db.worn ??= {}; db.scenes ??= []; db.frames ??= [];
  // v1.21: the purple bandana became a color of the bandana. Same drawing, new id.
  const ren = { 'bandana-purple': 'bandana:purple' };
  db.owned = [...new Set(db.owned.map((o) => ren[o] || o))];
  for (const k of Object.keys(db.worn)) if (ren[db.worn[k]]) db.worn[k] = ren[db.worn[k]];
  if (ren[db.goal]) db.goal = ren[db.goal];
}

// ---------- scenes and frames ----------
// Earned in the Climb only, never bought. Each unlock rule is [climb prefix, hold]:
// kc = Chill, c = Cozy, hc = Hard, xc = Extreme. The kids reuse the grown-up scenes.
// dark: light text goes on top, and the play screen gets a navy tint instead of a white one.
// Scenes added in a later release are handed out by syncUnlocks from progress already made.
export const CLIMBS = { kc: 'Chill Climb', c: 'Cozy Climb', hc: 'Hard Climb', xc: 'Extreme Climb' };
export const SCENES = [
  { id: 'lawn', name: 'Lawn', at: [['kc', 10], ['c', 20]] },
  { id: 'beach', name: 'Beach', at: [['kc', 20], ['c', 40]] },
  { id: 'mountaintop', name: 'Mountaintop', at: [['c', 60]] },
  { id: 'ocean', name: 'Ocean', at: [['kc', 30], ['hc', 20]] },
  { id: 'autumn', name: 'Autumn forest', at: [['hc', 40]] },
  { id: 'lava', name: 'Lava flow', dark: true, at: [['hc', 60]] },
  { id: 'snowy', name: 'Snowy peak', at: [['hc', 80]] },
  { id: 'night', name: 'Night sky', dark: true, at: [['kc', 40], ['xc', 20]] },
  { id: 'aurora', name: 'Aurora', dark: true, at: [['xc', 40]] },
  { id: 'canyon', name: 'Canyon', at: [['xc', 60]] },
  { id: 'clouds', name: 'Clouds', at: [['xc', 80]] },
  { id: 'space', name: 'Outer space', dark: true, at: [['xc', 100]] },
  { id: 'moon', name: 'The Moon', dark: true, at: [['xc', 120]] },
];
for (const s of SCENES) s.art = SCENE_ART[s.id] || '';
// Every summit gives a frame around the board.
export const FRAMES = [
  { id: 'rainbow', name: 'Rainbow', at: [['kc', 40], ['c', 60]] },
  { id: 'gold', name: 'Gold', at: [['hc', 80]] },
  { id: 'starlight', name: 'Starlight', at: [['xc', 120]] },
];
export const scene = (id) => SCENES.find((x) => x.id === id) || null;
export const frame = (id) => FRAMES.find((x) => x.id === id) || null;
// Kids can't play Extreme and grown-ups don't see Chill, so only some rules apply to each player.
const usable = (kid) => ([c]) => (kid ? c !== 'xc' : c !== 'kc');
export const earnable = (s, kid) => s.at.some(usable(kid));
// "Hard Climb · hold 40": the earliest hold this player can earn it at (kids: their Chill Climb first).
export function unlockAt(s, kid) {
  const rank = ([c, h]) => (kid && c === 'kc' ? 0 : 1000) + h;
  const [c, h] = s.at.filter(usable(kid)).sort((a, b) => rank(a) - rank(b))[0] || s.at[0];
  return { climb: c, hold: h, label: `${CLIMBS[c]} · hold ${h}` };
}
// What a climb hands out, by hold: [{ hold, kind: 'scene'|'frame', it }].
export function milestones(climb) {
  const out = [];
  for (const [kind, list] of [['scene', SCENES], ['frame', FRAMES]])
    for (const it of list) for (const [c, h] of it.at) if (c === climb) out.push({ hold: h, kind, it });
  return out.sort((a, b) => a.hold - b.hold);
}
// A hold counts once it was ever solved: Start over clears `solved`, but `paid` remembers it.
const everSolved = (db, pid) => !!(db.progress?.[pid]?.solved || db.paid?.[pid]);
// Unlock every scene and frame the player's Climb progress has earned. Idempotent: safe to run on
// every launch and after every solve, never takes anything away, and also covers players whose
// back pay (shopV) ran before scenes existed. Returns what's new, scenes first.
export function syncUnlocks(db) {
  shopDefaults(db);
  const got = [];
  for (const [kind, list, key] of [['scene', SCENES, 'scenes'], ['frame', FRAMES, 'frames']])
    for (const it of list)
      if (!db[key].includes(it.id) && it.at.some(([c, h]) => everSolved(db, `${c}:${h}`))) { db[key].push(it.id); got.push({ kind, it }); }
  return got;
}

// Bonus Yards: an endless pool of extra boards per mode, opened by that mode's summit hold.
// climb prefix -> { b: bonus prefix, summit: last hold }.
export const BONUS = { kc: { b: 'kb', summit: 40 }, c: { b: 'b', summit: 60 }, hc: { b: 'hb', summit: 80 }, xc: { b: 'xb', summit: 120 } };
export const bonusOpen = (db, climb) => !!BONUS[climb] && everSolved(db, `${climb}:${BONUS[climb].summit}`);

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
  if (it.variant && !ownsLine(db, id)) return false; // colors come after you own the item itself
  const cost = priceFor(it, kid);
  if (db.coins < cost) return false;
  db.coins -= cost;
  db.owned.push(id);
  if (db.goal === id) delete db.goal; // a kid's piggy bank target is done once it's bought
  return true;
}

// ---------- hint prices (Sniff) ----------
// Free on Chill and Cozy. Hard 25 and Extreme 50 for every player (kids pay the same, Jonathan's
// call), in dailies, past days, Climb holds and Bonus Yards alike. A puzzle that already paid out
// (a replay after Start over) has nothing left to earn, so its hints are free.
export const SNIFF_PRICE = { hd: 25, hc: 25, hb: 25, xd: 50, xc: 50, xb: 50 };
export const sniffPrice = (db, pid) => (db.paid?.[pid] ? 0 : SNIFF_PRICE[String(pid).split(':')[0]] ?? 0);
// Spend coins on one Sniff. Returns false (and spends nothing) if the player can't afford it.
export function paySniff(db, pid) {
  shopDefaults(db);
  const cost = sniffPrice(db, pid);
  if (db.coins < cost) return false;
  db.coins -= cost;
  return true;
}
