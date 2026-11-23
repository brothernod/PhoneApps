// Wild Week share cards (v1.33): a 1080x1350 PNG for one Wild win and one for the week, plus a
// Wordle-style text version. No spoilers: neither shows a board, a map or a corgi spot.
// Safari-safe drawing: the 2D canvas API only (gradients, shapes, fillText in the system rounded
// font). Cheddar is a standalone SVG (die-cut filter inlined, LED <animate> dropped) loaded as an
// Image from a Blob URL and decoded before it's drawn. No web fonts, no foreignObject.
import { cheddarLoaf, cheddarHead, artDefs, still } from './art.js';
import { item, WILD_TIERS, wildTier, wildDates, WILD } from './shop.js';

export const W = 1080, H = 1350;
const RB = ['#FF5FA8', '#FF9F45', '#FFD23C', '#3FD98B', '#46B3FF', '#9B6BFF'];
const INK = '#3A2350', SOFT = '#8A6FA6', FOOT = '#9A86B0', BRAND = '#7A4A9E', PALE = '#E8DDF3';
const FONT = 'ui-rounded, "SF Pro Rounded", -apple-system, system-ui, sans-serif';
const f = (px, w = 800) => `${w} ${px}px ${FONT}`;
const NUM = ['zero', 'one', 'two', 'three', 'four'];
const EMO = { cozy: '🌈', hard: '🔥', extreme: '⚡' };

// ---------- the numbers (shared by the cards and the text) ----------
const day3 = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
const mon = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const plural = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
// A solve counts once it has a best time (Start over keeps best and solvedAt).
export const solvedP = (p) => !!p && p.best != null && !!p.solvedAt;
// Map flips for a solve: recorded since v1.33 (fl, with fe = carried over from an older save), else
// estimated from the time (the swap timer and the clock pause together, so it's close; the clock
// keeps running under a sheet and the swap timer doesn't, so it can run a little high).
export function flipsOf(p, swap = 15) {
  if (!solvedP(p)) return null;
  if (p.fl != null) return { v: p.fl, est: !!p.fe };
  return { v: Math.floor(p.best / swap), est: true };
}
// Flips per corgi: whole numbers, bigger is worse (more waiting on the maps).
export const perCorgi = (fl, n) => Math.round(fl / n);
const approx = (x, est) => `${est ? '≈' : ''}${x}`;

// One Wild solve: { tier, date, n, maps, time, flips: {v, est}, mistakes, count (prize progress) }.
export function winStats(db, tier, date, sets, swap = 15) {
  const t = wildTier(tier), p = db.progress?.[`${t.pre}:${date}`], set = sets(date, t.id);
  if (!solvedP(p) || !set) return null;
  return { tier: t.id, date, n: set.n, maps: set.r.length, time: p.best, flips: flipsOf(p, swap), mistakes: p.mistakes ?? 0 };
}
// The week: every day x tier, the solved count and the totals.
export function weekStats(db, sets, swap = 15) {
  const days = wildDates().map((date) => ({ date, tiers: WILD_TIERS.map((t) => winStats(db, t.id, date, sets, swap)) }));
  const all = days.flatMap((d) => d.tiers).filter(Boolean);
  const fastest = (id) => { const ts = all.filter((s) => s.tier === id).map((s) => s.time); return ts.length ? Math.min(...ts) : null; };
  return {
    days, solved: all.length, total: days.length * WILD_TIERS.length,
    fastCozy: fastest('cozy'), fastExtreme: fastest('extreme'),
    flips: { v: all.reduce((a, s) => a + s.flips.v, 0), est: all.some((s) => s.flips.est) },
    mistakes: all.reduce((a, s) => a + s.mistakes, 0),
  };
}

// ---------- the text version ----------
const dayRow = (d) => `${day3(d.date)} ${d.tiers.map((s, k) => `${EMO[WILD_TIERS[k].id]}${s ? '✅' : '⬜'}`).join(' ')}`;
const detail = (s) => `${EMO[s.tier]} ${day3(s.date)}: ${clock(s.time)} · ${approx(s.flips.v, s.flips.est)} flips (${approx(perCorgi(s.flips.v, s.n), s.flips.est)} per corgi) · ${plural(s.mistakes, 'mistake')}`;
export function winText(week, s) {
  const d = week.days.find((x) => x.date === s.date);
  return `Corgidoku Wild Week 🕶️\n${dayRow(d)}\n${detail(s)}`;
}
export function weekText(week, today) {
  const rows = week.days.filter((d) => d.date <= today || d.tiers.some(Boolean)).map(dayRow);
  const fast = [week.fastCozy != null && `🌈 fastest ${clock(week.fastCozy)}`, week.fastExtreme != null && `⚡ fastest ${clock(week.fastExtreme)}`].filter(Boolean).join(' · ');
  return [`Corgidoku Wild Week 🕶️ ${week.solved} of ${week.total}`, ...rows,
    [fast, `${approx(week.flips.v, week.flips.est)} map flips`, plural(week.mistakes, 'mistake')].filter(Boolean).join(' · ')].join('\n');
}

// ---------- drawing helpers ----------
const DEFS = (artDefs.match(/<defs>([\s\S]*)<\/defs>/) || [])[1] || '';
const GREY = '<filter id="cdk-grey" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/></filter>';
// A Cheddar drawing as a standalone, still SVG Image at w x h pixels.
function svgImage(svg, w, h, grey = false) {
  let s = still(svg).replace(/^<svg\b/, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"`);
  s = s.replace(/^(<svg\b[^>]*>)/, `$1<defs>${DEFS}${grey ? GREY : ''}</defs>${grey ? '<g filter="url(#cdk-grey)">' : ''}`);
  if (grey) s = s.replace(/<\/svg>\s*$/, '</g></svg>');
  const url = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml;charset=utf-8' }));
  const img = new Image();
  img.width = w; img.height = h;
  const done = () => URL.revokeObjectURL(url);
  img.src = url;
  return (img.decode ? img.decode() : new Promise((ok, no) => { img.onload = ok; img.onerror = no; })).then(() => { done(); return img; }, (e) => { done(); throw e; });
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
// Centered text with manual letter spacing (canvas letterSpacing isn't in every Safari).
function spaced(ctx, text, cx, y, sp) {
  const ch = [...text], ws = ch.map((c) => ctx.measureText(c).width), tot = ws.reduce((a, b) => a + b, 0) + sp * (ch.length - 1);
  let x = cx - tot / 2;
  ctx.textAlign = 'left';
  ch.forEach((c, i) => { ctx.fillText(c, x, y); x += ws[i] + sp; });
  ctx.textAlign = 'center';
}
// The pastel background with soft corner glows.
function background(ctx) {
  ctx.fillStyle = '#FFF6FB'; ctx.fillRect(0, 0, W, H);
  const glow = (x, y, rx, ry, c) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, c); g.addColorStop(1, 'rgba(255,246,251,0)');
    ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore();
  };
  glow(0, 0, 650, 540, '#FFD6EC'); glow(W, 135, 650, 540, '#DCCBFF'); glow(W / 2, H, 760, 675, '#C9F4FF');
}
// The soft rainbow burst: 10-degree wedges, faded out from the middle.
function burst(ctx, cy, alpha) {
  const R = 750, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const b = c.getContext('2d');
  for (let i = 0; i < 36; i++) {
    b.beginPath(); b.moveTo(W / 2, cy);
    b.arc(W / 2, cy, R, (i * 10 - 90) * Math.PI / 180, ((i + 1) * 10 - 90) * Math.PI / 180); b.closePath();
    b.fillStyle = RB[i % RB.length]; b.fill();
  }
  b.globalCompositeOperation = 'destination-in';
  const m = b.createRadialGradient(W / 2, cy, 0, W / 2, cy, R);
  m.addColorStop(0, '#000'); m.addColorStop(0.3, '#000'); m.addColorStop(0.62, 'rgba(0,0,0,0)');
  b.fillStyle = m; b.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(c, 0, 0); ctx.restore();
}
// Big rainbow words with a white lift and a soft plum shadow.
function rainbowText(ctx, text, y, px) {
  ctx.font = f(px, 900); ctx.textAlign = 'center';
  const w = ctx.measureText(text).width, g = ctx.createLinearGradient(W / 2 - w / 2, 0, W / 2 + w / 2, 0);
  RB.forEach((c, i) => g.addColorStop(i / (RB.length - 1), c));
  ctx.save();
  ctx.shadowColor = 'rgba(91,42,110,.25)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#fff'; ctx.fillText(text, W / 2, y + 5);
  ctx.restore();
  ctx.fillStyle = g; ctx.fillText(text, W / 2, y);
}
function header(ctx, text) {
  ctx.fillStyle = BRAND; ctx.font = f(34, 800); ctx.textBaseline = 'alphabetic';
  spaced(ctx, text, W / 2, 92, 6);
}
function pill(ctx, text, color, y) {
  ctx.font = f(30, 800);
  const w = ctx.measureText(text).width + 56, h = 56;
  rr(ctx, W / 2 - w / 2, y, w, h, 28); ctx.fillStyle = color; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(text, W / 2, y + 39);
}
// A row of white stat tiles.
function tiles(ctx, y, list, big) {
  const gap = 18, x0 = 60, w = (W - 120 - gap * (list.length - 1)) / list.length, h = big > 56 ? 166 : 150;
  list.forEach(([v, label], i) => {
    const x = x0 + i * (w + gap);
    ctx.save(); rr(ctx, x, y + 6, w, h, 34); ctx.fillStyle = 'rgba(155,107,255,.18)'; ctx.fill(); ctx.restore();
    rr(ctx, x, y, w, h, 34); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = INK;
    let px = big; ctx.font = f(px, 900);
    while (ctx.measureText(v).width > w - 20 && px > 30) ctx.font = f(--px, 900);
    ctx.fillText(v, x + w / 2, y + 26 + big);
    ctx.font = f(25, 700); ctx.fillStyle = SOFT; ctx.fillText(label, x + w / 2, y + h - 26);
  });
}
function pips(ctx, x, y, k) {
  for (let i = 0; i < 7; i++) {
    rr(ctx, x + i * 56, y, 44, 18, 9);
    if (i < k) { const g = ctx.createLinearGradient(x + i * 56, 0, x + i * 56 + 44, 0); g.addColorStop(0, '#FF5FA8'); g.addColorStop(1, '#9B6BFF'); ctx.fillStyle = g; }
    else ctx.fillStyle = PALE;
    ctx.fill();
  }
}
function footer(ctx, text) {
  ctx.font = f(26, 700); ctx.fillStyle = FOOT; ctx.textAlign = 'center'; ctx.fillText(text, W / 2, H - 42);
}
const toBlob = (c) => new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('no image'))), 'image/png'));
function canvas() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  return [c, c.getContext('2d')];
}

// ---------- card 1: one Wild win ----------
// s = winStats(...); look = Cheddar's outfit fragments (party hat on); count = prize progress.
export async function drawWinCard(s, look, count) {
  const t = wildTier(s.tier), prize = item(t.prize);
  const [dog, head] = await Promise.all([
    svgImage(cheddarLoaf(look), 470, Math.round(470 * 250 / 220)),
    svgImage(cheddarHead({ face: prize.art }), 120, 120),
  ]);
  const [c, ctx] = canvas();
  background(ctx); burst(ctx, 430, 0.28);
  header(ctx, 'CORGIDOKU · WILD WEEK');
  pill(ctx, `${t.name.toUpperCase()} · ${s.maps} MAPS · ${day3(s.date).toUpperCase()} ${mon(s.date).toUpperCase()}`, t.color, 118);
  ctx.drawImage(dog, W / 2 - 235, 190, 470, dog.height || Math.round(470 * 250 / 220));
  rainbowText(ctx, 'WILD WIN!', 790, 118);
  const fl = s.flips;
  tiles(ctx, 850, [[clock(s.time), 'time'], [approx(fl.v, fl.est), 'map flips'], [String(s.mistakes), s.mistakes === 1 ? 'mistake' : 'mistakes'], [approx(perCorgi(fl.v, s.n), fl.est), 'flips / corgi']], 64);
  // The prize row: the tier's shades on a Cheddar head and the 7 pips.
  rr(ctx, 60, 1080, W - 120, 164, 34); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill();
  ctx.drawImage(head, 90, 1102, 120, 120);
  ctx.textAlign = 'left'; ctx.font = f(32, 800); ctx.fillStyle = INK;
  ctx.fillText(`${prize.name} · ${Math.min(7, count)} of 7`, 236, 1150);
  pips(ctx, 236, 1174, count);
  ctx.textAlign = 'center';
  footer(ctx, `One answer, ${NUM[s.maps] || s.maps} maps. No hints.${fl.est ? '  ≈ estimated' : ''}`);
  return toBlob(c);
}

// ---------- card 2: the week ----------
// owned(id) / count(tier) give the prize state.
export async function drawWeekCard(week, owned, count) {
  const trio = await Promise.all(WILD_TIERS.map((t) => svgImage(cheddarLoaf({ face: item(t.prize).art }), 240, Math.round(240 * 250 / 220), !owned(t.prize))));
  const [c, ctx] = canvas();
  background(ctx); burst(ctx, 420, 0.2);
  header(ctx, `CORGIDOKU · WILD WEEK ${WILD.start.slice(0, 4)}`);
  rainbowText(ctx, `${week.solved} of ${week.total}`, 238, 100);
  // Three Cheddars in the three shades: earned in color, not yet earned greyed out.
  WILD_TIERS.forEach((t, k) => {
    const x = W / 2 - 370 + k * 250, own = owned(t.prize), img = trio[k];
    ctx.save(); if (!own) ctx.globalAlpha = 0.35;
    ctx.drawImage(img, x, 262, 240, img.height || 273);
    ctx.restore();
    ctx.font = f(26, 800); ctx.textAlign = 'center'; ctx.fillStyle = own ? t.color : '#A898B8';
    const short = item(t.prize).name.replace(' rave shades', '');
    ctx.fillText(own ? `${short} ✓` : `${short} · ${Math.min(7, count(t.id))} of 7`, x + 120, 566);
  });
  // The 7-day x 3-tier grid.
  const gx = 60, gy = 592, gw = W - 120, rowH = 57, hdH = 50, gh = 36 + hdH + rowH * 7;
  rr(ctx, gx, gy, gw, gh, 34); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fill();
  const cx = (k) => gx + 26 + 110 + ((gw - 52 - 110) / 3) * (k + 0.5);
  ctx.font = f(26, 800); ctx.fillStyle = SOFT; ctx.textAlign = 'center';
  WILD_TIERS.forEach((t, k) => ctx.fillText(t.name, cx(k), gy + 18 + 35));
  week.days.forEach((d, i) => {
    const y = gy + 18 + hdH + i * rowH;
    ctx.fillStyle = '#F1E8F8'; ctx.fillRect(gx + 26, y, gw - 52, 2);
    ctx.font = f(30, 800); ctx.textAlign = 'left'; ctx.fillStyle = INK;
    ctx.fillText(day3(d.date), gx + 26, y + 39);
    d.tiers.forEach((s, k) => {
      const label = s ? clock(s.time) : '—';
      ctx.font = f(30, 800);
      const w = ctx.measureText(label).width, x0 = cx(k) - (w + 30) / 2;
      ctx.beginPath(); ctx.arc(x0 + 10, y + 29, 10, 0, Math.PI * 2); ctx.fillStyle = s ? WILD_TIERS[k].color : PALE; ctx.fill();
      ctx.textAlign = 'left'; ctx.fillStyle = s ? INK : '#CDBFDB'; ctx.fillText(label, x0 + 30, y + 39);
    });
  });
  ctx.textAlign = 'center';
  const dash = (x) => (x == null ? '—' : clock(x));
  tiles(ctx, gy + gh + 20, [[dash(week.fastCozy), 'fastest Cozy'], [dash(week.fastExtreme), 'fastest Extreme'], [approx(week.flips.v, week.flips.est), 'map flips'], [String(week.mistakes), week.mistakes === 1 ? 'mistake' : 'mistakes']], 52);
  const s0 = WILD.start, e0 = WILD.end;
  footer(ctx, `Wild Week · ${mon(s0)}–${Number(e0.slice(8))}, ${e0.slice(0, 4)}${week.flips.est ? '  ·  ≈ estimated' : ''}`);
  return toBlob(c);
}
