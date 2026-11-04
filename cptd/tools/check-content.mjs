// Checks cptd/content.js for structural problems that would produce wrong or
// ambiguous quiz questions. Run from the repo root:  node cptd/tools/check-content.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '..', 'content.js'), 'utf8');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const C = ctx.window.CPTD;

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

// Same normalization the app uses to keep "which model?" questions unambiguous.
// Two names "clash" if they share any meaningful word stem, e.g. "Commitment" and
// "Lack of commitment", or "Collaboration" and "Collaborating". Kept identical to app.js.
const norm = (s) => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['self', 'with', 'from', 'your', 'that', 'this', 'their', 'them', 'what', 'when', 'each', 'into', 'than']);
const stems = (s) => {
  const n = norm(s);
  const out = new Set([n]);
  for (const w of n.split(' ')) if (w.length >= 4 && !STOP.has(w)) out.add(w.slice(0, 6));
  return out;
};
const clash = (a, b) => { const sb = stems(b); for (const k of stems(a)) if (sb.has(k)) return true; return false; };
// Decoys are meant to look similar ("Selective listening"), so they only fail on a near-exact match.
const fuzzy = (s) => {
  const n = norm(s);
  const keys = new Set([n]);
  const words = n.split(' ').filter((w) => w.length > 2 && !['the', 'and', 'for', 'not'].includes(w));
  if (words.length === 1) keys.add(words[0].slice(0, 6));
  return keys;
};
const lenient =(a, b) => { for (const k of fuzzy(a)) if (fuzzy(b).has(k)) return true; return false; };

const areaIds = new Set(C.areas.map((a) => a.id));
const stmtIds = new Set(Object.keys(C.statements));
for (const a of C.areas) for (const s of a.stmts) if (!stmtIds.has(s)) err(`area ${a.id}: unknown statement ${s}`);

const ids = new Set();
for (const m of C.models) {
  if (ids.has(m.id)) err(`duplicate model id ${m.id}`);
  ids.add(m.id);
  if (!areaIds.has(m.area)) err(`${m.id}: unknown area ${m.area}`);
  for (const s of m.stmts) {
    if (!stmtIds.has(s)) err(`${m.id}: unknown statement ${s}`);
    const area = C.areas.find((a) => a.stmts.includes(s));
    if (area && area.id !== m.area && !(m.id === 'inclusive')) warn(`${m.id}: statement ${s} is outside its area ${m.area}`);
  }
  if (!C.tags[m.tag]) err(`${m.id}: unknown tag ${m.tag}`);
  for (const f of ['name', 'short', 'who', 'kind', 'unit', 'hook', 'exam', 'src']) if (!m[f]) err(`${m.id}: missing ${f}`);
  if (!['set', 'ordered'].includes(m.kind)) err(`${m.id}: bad kind ${m.kind}`);
  if (!Array.isArray(m.items) || m.items.length < 2) err(`${m.id}: needs 2+ items`);
  const names = m.items.map((i) => i.t);
  if (new Set(names.map(norm)).size !== names.length) err(`${m.id}: duplicate item names`);
  const descs = m.items.map((i) => i.d);
  if (descs.some((d) => !d)) err(`${m.id}: item missing description`);
  if (new Set(descs).size !== descs.length) err(`${m.id}: duplicate descriptions`);
  if (m.kind === 'ordered' && !m.orderNote) err(`${m.id}: ordered model needs orderNote`);
  for (const d of m.decoys || []) for (const n of names) if (lenient(d, n)) err(`${m.id}: decoy "${d}" clashes with item "${n}"`);
  if (m.groups) {
    const seen = new Set();
    for (const g of m.groups) {
      if (!g.t || !Array.isArray(g.m) || g.m.length < 1) err(`${m.id}: bad group`);
      for (const x of g.m) { if (seen.has(norm(x))) err(`${m.id}: "${x}" appears in two groups`); seen.add(norm(x)); }
    }
    if (m.groups.length < 2) err(`${m.id}: needs 2+ groups`);
  }
  // An item's own description must not contain its name (would give the answer away in "match").
  for (const i of m.items) {
    const nm = norm(i.t);
    if (nm.length > 3 && norm(i.d).includes(nm)) warn(`${m.id}: description of "${i.t}" contains its name`);
  }
}

// Related-model groups ("kin") must name real models.
for (const g of C.kin || []) {
  const list = g.hub ? [g.hub, ...(g.with || [])] : g.all || [];
  if (!list.length) err('kin: empty group');
  for (const id of list) if (!ids.has(id)) err(`kin: unknown model ${id}`);
}

// Items that share a word stem with another model's items are left out of
// "which model?" drills so those questions can't be ambiguous.
const member = (o, t) => o.items.some((j) => clash(j.t, t)) || (o.groups || []).some((g) => g.m.some((x) => clash(x, t)));
const unique = {};
for (const m of C.models) unique[m.id] = m.items.filter((i) => !C.models.some((o) => o.id !== m.id && member(o, i.t))).map((i) => i.t);
const noWhich = C.models.filter((m) => !unique[m.id].length).map((m) => m.id);

const qids = new Set();
let longest = 0;
const perStmt = {};
for (const q of C.questions) {
  if (qids.has(q.id)) err(`duplicate question id ${q.id}`);
  qids.add(q.id);
  if (!stmtIds.has(q.stmt)) err(`${q.id}: unknown statement ${q.stmt}`);
  if (q.model && !ids.has(q.model)) err(`${q.id}: unknown model ${q.model}`);
  if (!Array.isArray(q.o) || q.o.length !== 4) err(`${q.id}: needs 4 options`);
  if (!(q.a >= 0 && q.a < q.o.length)) err(`${q.id}: answer index out of range`);
  if (new Set(q.o.map(norm)).size !== q.o.length) err(`${q.id}: duplicate options`);
  if (!q.why || !q.q) err(`${q.id}: missing text`);
  const lens = q.o.map((o) => o.length);
  const max = Math.max(...lens);
  if (lens[q.a] === max && lens.filter((l) => l === max).length === 1 && max > 1.4 * Math.max(...lens.filter((_, k) => k !== q.a))) {
    longest++;
    warn(`${q.id}: right answer is much longer than every other option`);
  }
  perStmt[q.stmt] = (perStmt[q.stmt] || 0) + 1;
}

for (const c of C.cases) {
  for (const s of c.stmts) if (!stmtIds.has(s)) err(`${c.id}: unknown statement ${s}`);
  for (const st of c.steps) {
    const right = st.options.filter((o) => o[1]).length;
    if (right < 1) err(`${c.id}: step with no correct option`);
    if (right === st.options.length) err(`${c.id}: step where every option is correct`);
    if (!st.why) err(`${c.id}: step missing why`);
  }
}

const modelsPerStmt = {};
for (const m of C.models) for (const s of m.stmts) modelsPerStmt[s] = (modelsPerStmt[s] || 0) + 1;

console.log(`models: ${C.models.length}, questions: ${C.questions.length}, cases: ${C.cases.length}`);
console.log('per statement (models / questions):');
for (const s of Object.keys(C.statements)) console.log(`  ${s.padEnd(6)} ${String(modelsPerStmt[s] || 0).padStart(3)} / ${String(perStmt[s] || 0).padStart(3)}`);
const eligible = Object.values(unique).reduce((n, a) => n + a.length, 0);
console.log(`items usable in "which model?" drills: ${eligible} of ${C.models.reduce((n, m) => n + m.items.length, 0)}; models with none: ${noWhich.length}`);
if (warns.length) { console.log(`\nwarnings (${warns.length}):`); for (const w of warns) console.log('  ' + w); }
if (errors.length) { console.log(`\nERRORS (${errors.length}):`); for (const e of errors) console.log('  ' + e); process.exit(1); }
console.log('\nOK');
