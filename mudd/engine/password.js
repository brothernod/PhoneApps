// @ts-check
// Password backup. The profile (who has been caught and how many times, the
// best egg for each, the level of every skill, and the once-only endings
// seen) packed into a short code a grown-up can write down, and typed back in
// on another device. Like the passwords in old console games.
//
// The code is plain bits in Crockford base-32 (no I, L, O, or U, so nothing
// looks like a 1 or a 0), in groups of four. It starts with a format number
// and a fingerprint of the pack's layout, and ends with a checksum, so a typo
// or a code from another game (or another version of this one) is turned
// away instead of loading the wrong thing. One wrong letter is always caught.

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const FORMAT = 1;
const FORMAT_BITS = 4, HASH_BITS = 10, SUM_BITS = 10, TIMES_BITS = 3, LEVEL_BITS = 2;

/** A small string hash, cut to `bits` bits. */
function hash(text, bits) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h % (1 << bits);
}

/**
 * CRC-10 of a list of bits (x^10 + x^9 + x^5 + x^4 + x + 1). Any mistake in
 * one letter changes at most five bits in a row, and a CRC this size always
 * catches that.
 */
function crc10(bits) {
  let reg = 0;
  for (const b of bits) {
    const fb = ((reg >> 9) & 1) ^ b;
    reg = (reg << 1) & 0x3ff;
    if (fb) reg ^= 0x233;
  }
  return reg;
}

/** How many bits hold a number from 0 to n. */
const width = (n) => Math.max(1, Math.ceil(Math.log2(n + 1)));

/**
 * What a password holds for this pack, in a fixed order: every creature, every
 * skill a slot can train, and every finale.
 * @param {import('./pack.js').Pack} pack
 * @param {Record<string, { skill: (spec: any) => string }>} archetypes
 * @param {string[]} [extraSkills]  skills the engine itself keeps (the Spanish dragon cards)
 */
export function passwordLayout(pack, archetypes, extraSkills = []) {
  const creatures = Object.keys(pack.creatures);
  const skills = new Set(extraSkills);
  for (const card of Object.values(pack.scenes)) for (const options of Object.values(card.slots)) for (const spec of options) {
    const a = archetypes[spec.puzzle];
    if (a) skills.add(a.skill(spec));
  }
  const eggs = ((pack.game.rating || {}).eggs || []).length;
  const finales = (pack.game.finales || []).map((f) => f.id);
  const sorted = [...skills].sort();
  const fingerprint = hash([pack.game.title, creatures.join(','), sorted.join(','), finales.join(','), eggs].join('|'), HASH_BITS);
  return { creatures, skills: sorted, finales, eggs, eggBits: width(eggs), fingerprint };
}

/** The part of the profile a password carries. */
/**
 * @typedef {{ caught: Record<string, { n: number, egg: number }>, skills: Record<string, number>, finales: string[] }} Saved
 */

/**
 * @param {ReturnType<typeof passwordLayout>} layout
 * @param {{ caught?: Record<string, any>, skills?: Record<string, any>, finales?: string[] }} profile
 */
export function encodePassword(layout, profile) {
  /** @type {number[]} */
  const bits = [];
  const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
  put(FORMAT, FORMAT_BITS);
  put(layout.fingerprint, HASH_BITS);
  for (const id of layout.creatures) {
    const c = (profile.caught || {})[id];
    // A creature caught before eggs were rated still counts as caught: lowest egg.
    put(c ? Math.max(1, Math.min(layout.eggs, Number(c.egg) || 1)) : 0, layout.eggBits);
    put(c ? Math.min((1 << TIMES_BITS) - 1, Math.max(1, Number(c.n) || 1) - 1) : 0, TIMES_BITS);
  }
  for (const k of layout.skills) {
    const s = (profile.skills || {})[k];
    put(s ? Math.max(1, Math.min(3, Number(s.level) || 1)) : 0, LEVEL_BITS);
  }
  for (const f of layout.finales) put((profile.finales || []).includes(f) ? 1 : 0, 1);
  put(crc10(bits), SUM_BITS);
  while (bits.length % 5) bits.push(0);
  let out = '';
  for (let i = 0; i < bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5).join(''), 2)];
  return out.replace(/(.{4})(?=.)/g, '$1-');
}

/**
 * Read a password back. Forgiving about how it was typed: case, spaces,
 * dashes, and O for 0, I or L for 1.
 * @param {ReturnType<typeof passwordLayout>} layout
 * @param {string} code
 * @returns {{ ok: true, saved: Saved } | { ok: false, why: 'short' | 'letters' | 'typo' | 'other' }}
 */
export function decodePassword(layout, code) {
  const clean = String(code || '').toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (/[^0-9A-Z]/.test(clean) || /U/.test(clean)) return { ok: false, why: 'letters' };
  const need = FORMAT_BITS + HASH_BITS + layout.creatures.length * (layout.eggBits + TIMES_BITS) + layout.skills.length * LEVEL_BITS + layout.finales.length + SUM_BITS;
  if (clean.length !== Math.ceil(need / 5)) return { ok: false, why: 'short' };
  /** @type {number[]} */
  const bits = [];
  for (const ch of clean) { const v = ALPHABET.indexOf(ch); for (let i = 4; i >= 0; i--) bits.push((v >> i) & 1); }
  let at = 0;
  const take = (n) => { let v = 0; for (let i = 0; i < n; i++) v = (v << 1) | bits[at++]; return v; };
  const sumAt = need - SUM_BITS;
  if (crc10(bits.slice(0, sumAt)) !== parseInt(bits.slice(sumAt, need).join(''), 2)) return { ok: false, why: 'typo' };
  if (bits.slice(need).some((b) => b)) return { ok: false, why: 'typo' };   // the spare bits at the end are always 0
  if (take(FORMAT_BITS) !== FORMAT || take(HASH_BITS) !== layout.fingerprint) return { ok: false, why: 'other' };
  /** @type {Saved} */
  const saved = { caught: {}, skills: {}, finales: [] };
  for (const id of layout.creatures) {
    const egg = take(layout.eggBits), n = take(TIMES_BITS) + 1;
    if (egg > layout.eggs) return { ok: false, why: 'typo' };
    if (egg) saved.caught[id] = { n, egg };
  }
  for (const k of layout.skills) { const lvl = take(LEVEL_BITS); if (lvl) saved.skills[k] = lvl; }
  for (const f of layout.finales) if (take(1)) saved.finales.push(f);
  return { ok: true, saved };
}
