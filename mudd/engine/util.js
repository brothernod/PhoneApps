// @ts-check
// Small helpers shared by the engine: seeded random, a safe math evaluator
// for YAML templates, template filling, and the game clock.

/** Seeded random numbers (mulberry32). Same seed, same quest. */
export function makeRng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** whole number from min to max, inclusive */
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

/**
 * Evaluate simple math like "a * b - c" or "a * b > c".
 * Supports numbers, variables, + - * / ( ) and < > <= >= == !=.
 * No eval(), so YAML can never run code.
 * @param {string} src
 * @param {Record<string, number>} vars
 * @returns {number}
 */
export function evalExpr(src, vars) {
  const tokens = src.match(/\d+(?:\.\d+)?|[A-Za-z_]\w*|<=|>=|==|!=|[-+*/()<>]|\S/g) || [];
  let i = 0;
  const peek = () => tokens[i];
  const take = () => tokens[i++];

  function primary() {
    const t = take();
    if (t === undefined) throw new Error(`Unexpected end in "${src}"`);
    if (t === '(') { const v = compare(); if (take() !== ')') throw new Error(`Missing ) in "${src}"`); return v; }
    if (t === '-') return -primary();
    if (/^\d/.test(t)) return Number(t);
    if (/^[A-Za-z_]/.test(t)) {
      if (!(t in vars)) throw new Error(`Unknown name "${t}" in "${src}"`);
      return vars[t];
    }
    throw new Error(`Unexpected "${t}" in "${src}"`);
  }
  function term() {
    let v = primary();
    while (peek() === '*' || peek() === '/') v = take() === '*' ? v * primary() : v / primary();
    return v;
  }
  function sum() {
    let v = term();
    while (peek() === '+' || peek() === '-') v = take() === '+' ? v + term() : v - term();
    return v;
  }
  function compare() {
    let v = sum();
    const op = peek();
    if (['<', '>', '<=', '>=', '==', '!='].includes(op)) {
      take();
      const r = sum();
      v = Number(op === '<' ? v < r : op === '>' ? v > r : op === '<=' ? v <= r : op === '>=' ? v >= r : op === '==' ? v === r : v !== r);
    }
    return v;
  }
  const out = compare();
  if (i < tokens.length) throw new Error(`Extra "${tokens[i]}" in "${src}"`);
  return out;
}

/**
 * Fill {braces} in a template. A brace holds a name ({pet}) or math ({a*b}).
 * @param {string} text
 * @param {Record<string, string>} names
 * @param {Record<string, number>} [vars]
 */
export function fill(text, names, vars = {}) {
  return String(text).replace(/\{([^}]+)\}/g, (whole, inner) => {
    const key = inner.trim();
    if (key in names) return names[key];
    try { return String(evalExpr(key, vars)); } catch { return whole; }
  });
}

/** 540 -> "9:00 AM" */
export function clock(minutes) {
  const m = Math.max(0, Math.round(minutes));
  let h = Math.floor(m / 60) % 24;
  const mm = String(m % 60).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mm} ${ampm}`;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** "HOLDEN" -> "Holden" */
export function niceName(s) {
  const t = String(s || '').trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** localStorage that never throws (private mode, blocked storage). */
export const store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};
