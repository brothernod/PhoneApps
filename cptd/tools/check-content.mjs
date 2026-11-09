// Checks the study content for structural problems that would produce wrong or
// ambiguous quiz questions. Loads every content*.js file that index.html lists, the
// way the app does, and checks each domain and all domains together (ids must be
// unique everywhere; "which model?" stems are compared across all models).
// Run from the repo root:
//   node cptd/tools/check-content.mjs            everything
//   node cptd/tools/check-content.mjs d2         one domain
//   node cptd/tools/check-content.mjs learn      one area
// A filter limits the report (counts, warnings, errors) to that domain or area;
// the checks themselves always run across all content.
import { loadContent } from './load-content.mjs';

const { C, files } = loadContent();
const filter = process.argv[2] || '';
const ABY = Object.fromEntries(C.areas.map((a) => [a.id, a]));
const DBY = Object.fromEntries(C.domains.map((d) => [d.id, d]));
if (filter && !ABY[filter] && !DBY[filter]) { console.log(`Unknown domain or area "${filter}". Domains: ${C.domains.map((d) => d.id).join(', ')}. Areas: ${C.areas.map((a) => a.id).join(', ')}.`); process.exit(2); }

const errors = [];
const warns = [];
// Each message carries the domain and area it is about, so a filter can pick it out.
const inScope = (d, a) => !filter || filter === d || filter === a || (!d && !a);
const err = (m, d, a) => { if (inScope(d, a)) errors.push(m); };
const warn = (m, d, a) => { if (inScope(d, a)) warns.push(m); };

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
const lenient = (a, b) => { for (const k of fuzzy(a)) if (fuzzy(b).has(k)) return true; return false; };

/* ---------- merging, domains, areas, statements ---------- */
for (const p of C.problems) err(`merge: ${p}`);
for (const d of C.domains) {
  if (d.parts && !d.meta) err(`${d.id}: has content files but no metadata part (content-${d.id}.js)`, d.id);
  if (d.live && !d.exam.facts.length) warn(`${d.id}: no domain exam facts`, d.id);
}
const stmtIds = new Set(Object.keys(C.statements));
const STMT_AREA = {};
const areaIds = new Set();
for (const a of C.areas) {
  if (areaIds.has(a.id)) err(`duplicate area id ${a.id}`, a.domain, a.id);
  areaIds.add(a.id);
  for (const f of ['name', 'tab']) if (!a[f]) err(`area ${a.id}: missing ${f}`, a.domain, a.id);
  for (const s of a.stmts) {
    if (!stmtIds.has(s)) err(`area ${a.id}: unknown statement ${s}`, a.domain, a.id);
    if (STMT_AREA[s]) err(`statement ${s} is in two areas (${STMT_AREA[s]}, ${a.id})`, a.domain, a.id);
    STMT_AREA[s] = a.id;
    if (!s.startsWith(String(DBY[a.domain].num) + '.')) warn(`area ${a.id}: statement ${s} doesn't look like Domain ${DBY[a.domain].num}`, a.domain, a.id);
  }
}
for (const s of stmtIds) if (!STMT_AREA[s]) err(`statement ${s} is in no area`);
const tabs = {};
for (const a of C.areas) { if (tabs[a.tab]) warn(`areas ${tabs[a.tab]} and ${a.id} share tab color ${a.tab}`, a.domain, a.id); tabs[a.tab] = a.id; }
const stmtDom = (s) => (STMT_AREA[s] ? ABY[STMT_AREA[s]].domain : null);

/* ---------- models ---------- */
const ids = new Set();
const MBY = {};
for (const m of C.models) {
  const D = m.domain; const A = m.area;
  if (ids.has(m.id)) err(`duplicate model id ${m.id}`, D, A);
  ids.add(m.id); MBY[m.id] = m;
  if (!areaIds.has(m.area)) err(`${m.id}: unknown area ${m.area}`, D, A);
  else if (ABY[m.area].domain !== D) err(`${m.id}: area ${m.area} belongs to ${ABY[m.area].domain}, but the model is in a ${D} file`, D, A);
  for (const s of m.stmts || []) {
    if (!stmtIds.has(s)) err(`${m.id}: unknown statement ${s}`, D, A);
    const area = STMT_AREA[s];
    if (area && area !== m.area && !(m.id === 'inclusive')) warn(`${m.id}: statement ${s} is outside its area ${m.area}`, D, A);
  }
  if (!Array.isArray(m.stmts) || !m.stmts.length) err(`${m.id}: needs stmts`, D, A);
  if (!C.tags[m.tag]) err(`${m.id}: unknown tag ${m.tag}`, D, A);
  for (const f of ['name', 'short', 'who', 'kind', 'unit', 'hook', 'exam', 'src']) if (!m[f]) err(`${m.id}: missing ${f}`, D, A);
  if (!['set', 'ordered'].includes(m.kind)) err(`${m.id}: bad kind ${m.kind}`, D, A);
  if (!Array.isArray(m.items) || m.items.length < 2) { err(`${m.id}: needs 2+ items`, D, A); m.items = m.items || []; }
  const names = m.items.map((i) => i.t);
  if (new Set(names.map(norm)).size !== names.length) err(`${m.id}: duplicate item names`, D, A);
  const descs = m.items.map((i) => i.d);
  if (descs.some((d) => !d)) err(`${m.id}: item missing description`, D, A);
  if (new Set(descs).size !== descs.length) err(`${m.id}: duplicate descriptions`, D, A);
  if (m.kind === 'ordered' && !m.orderNote) err(`${m.id}: ordered model needs orderNote`, D, A);
  for (const d of m.decoys || []) for (const n of names) if (lenient(d, n)) err(`${m.id}: decoy "${d}" clashes with item "${n}"`, D, A);
  if (m.groups) {
    const seen = new Set();
    for (const g of m.groups) {
      if (!g.t || !Array.isArray(g.m) || g.m.length < 1) err(`${m.id}: bad group`, D, A);
      for (const x of g.m || []) { if (seen.has(norm(x))) err(`${m.id}: "${x}" appears in two groups`, D, A); seen.add(norm(x)); }
    }
    if (m.groups.length < 2) err(`${m.id}: needs 2+ groups`, D, A);
  }
  // An item's own description must not contain its name (would give the answer away in "match").
  for (const i of m.items) {
    const nm = norm(i.t);
    if (nm.length > 3 && norm(i.d || '').includes(nm)) warn(`${m.id}: description of "${i.t}" contains its name`, D, A);
  }
}

// Related-model groups ("kin") must name real models.
for (const g of C.kin) {
  const list = g.hub ? [g.hub, ...(g.with || [])] : g.all || [];
  const first = MBY[list[0]];
  if (!list.length) err('kin: empty group');
  for (const id of list) if (!ids.has(id)) err(`kin: unknown model ${id}`, first && first.domain, first && first.area);
}

// Items that share a word stem with another model's items (in any domain) are left out
// of "which model?" drills so those questions can't be ambiguous.
const member = (o, t) => o.items.some((j) => clash(j.t, t)) || (o.groups || []).some((g) => g.m.some((x) => clash(x, t)));
const unique = {};
for (const m of C.models) unique[m.id] = m.items.filter((i) => !C.models.some((o) => o.id !== m.id && member(o, i.t))).map((i) => i.t);
// Stems shared with another domain's items also take an item out of "which model?".
// Only report it when a model loses its last usable item that way, because its
// "which model?" card then disappears (saved progress on it stays, but goes unused).
let crossLost = 0;
for (const m of C.models) {
  const within = m.items.filter((i) => !C.models.some((o) => o.id !== m.id && o.domain === m.domain && member(o, i.t)));
  const lost = within.filter((i) => !unique[m.id].includes(i.t));
  if (!filter || m.domain === filter || m.area === filter) crossLost += lost.length;
  if (within.length && !unique[m.id].length) {
    const by = [...new Set(lost.flatMap((i) => C.models.filter((o) => o.domain !== m.domain && member(o, i.t)).map((o) => o.id)))];
    warn(`${m.id}: loses its "which model?" card; its items share stems with ${by.join(', ')} in another domain`, m.domain, m.area);
  }
}

/* ---------- questions and cases ---------- */
const qids = new Set();
for (const q of C.questions) {
  const D = q.domain; const A = STMT_AREA[q.stmt];
  if (qids.has(q.id) || ids.has(q.id)) err(`duplicate question id ${q.id}`, D, A);
  qids.add(q.id);
  if (!stmtIds.has(q.stmt)) err(`${q.id}: unknown statement ${q.stmt}`, D, A);
  else if (stmtDom(q.stmt) !== D) err(`${q.id}: statement ${q.stmt} belongs to ${stmtDom(q.stmt)}, but the question is in a ${D} file`, D, A);
  if (q.model && !ids.has(q.model)) err(`${q.id}: unknown model ${q.model}`, D, A);
  if (q.model && MBY[q.model] && MBY[q.model].domain !== D) warn(`${q.id}: model ${q.model} is in another domain`, D, A);
  if (!Array.isArray(q.o) || q.o.length !== 4) { err(`${q.id}: needs 4 options`, D, A); continue; }
  if (!(q.a >= 0 && q.a < q.o.length)) err(`${q.id}: answer index out of range`, D, A);
  if (new Set(q.o.map(norm)).size !== q.o.length) err(`${q.id}: duplicate options`, D, A);
  if (!q.why || !q.q) err(`${q.id}: missing text`, D, A);
  const lens = q.o.map((o) => o.length);
  const max = Math.max(...lens);
  if (lens[q.a] === max && lens.filter((l) => l === max).length === 1 && max > 1.4 * Math.max(...lens.filter((_, k) => k !== q.a))) {
    warn(`${q.id}: right answer is much longer than every other option`, D, A);
  }
}

const cids = new Set();
for (const c of C.cases) {
  const D = c.domain; const A = STMT_AREA[(c.stmts || [])[0]];
  if (cids.has(c.id) || ids.has(c.id) || qids.has(c.id)) err(`duplicate case id ${c.id}`, D, A);
  cids.add(c.id);
  for (const f of ['title', 'setup']) if (!c[f]) err(`${c.id}: missing ${f}`, D, A);
  for (const s of c.stmts || []) {
    if (!stmtIds.has(s)) err(`${c.id}: unknown statement ${s}`, D, A);
    else if (stmtDom(s) !== D) err(`${c.id}: statement ${s} belongs to ${stmtDom(s)}, but the case is in a ${D} file`, D, A);
  }
  for (const st of c.steps || []) {
    const right = st.options.filter((o) => o[1]).length;
    if (right < 1) err(`${c.id}: step with no correct option`, D, A);
    if (right === st.options.length) err(`${c.id}: step where every option is correct`, D, A);
    if (!st.why) err(`${c.id}: step missing why`, D, A);
  }
}

/* ---------- report ---------- */
const where = (x, d, a) => x.filter((o) => (!d || o.domain === d) && (!a || o.area === a));
const qArea = (q) => STMT_AREA[q.stmt];
const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
console.log(`files: ${files.join(', ')}`);
console.log(`all: ${C.models.length} models, ${C.questions.length} questions, ${C.cases.length} cases`);
for (const d of C.domains) {
  if (filter && filter !== d.id && !(ABY[filter] && ABY[filter].domain === d.id)) continue;
  const areas = C.areas.filter((a) => a.domain === d.id);
  if (!d.live) { console.log(`${d.id} ${d.name}: no content yet${d.meta ? ` (${pl(areas.length, 'area')}, ${pl(areas.reduce((n, a) => n + a.stmts.length, 0), 'statement')})` : ', no files'}`); continue; }
  console.log(`${d.id} ${d.name}: ${d.counts.models} models, ${d.counts.questions} questions, ${d.counts.cases} cases`);
  for (const a of areas) {
    if (filter && ABY[filter] && filter !== a.id) continue;
    const ms = where(C.models, d.id, a.id); const qs = C.questions.filter((q) => qArea(q) === a.id);
    const cs = C.cases.filter((c) => STMT_AREA[(c.stmts || [])[0]] === a.id);
    console.log(`  ${a.id.padEnd(7)} ${String(ms.length).padStart(3)} models, ${String(qs.length).padStart(3)} questions, ${pl(cs.length, 'case')}   per statement (models/questions): ${a.stmts.map((s) => `${s} ${C.models.filter((m) => (m.stmts || []).includes(s)).length}/${C.questions.filter((q) => q.stmt === s).length}`).join(', ')}`);
  }
}
const scoped = C.models.filter((m) => !filter || m.domain === filter || m.area === filter);
const eligible = scoped.reduce((n, m) => n + unique[m.id].length, 0);
console.log(`items usable in "which model?" drills: ${eligible} of ${scoped.reduce((n, m) => n + m.items.length, 0)}; models with none: ${scoped.filter((m) => !unique[m.id].length).length}; items left out only because of another domain: ${crossLost}`);
if (warns.length) { console.log(`\nwarnings (${warns.length}):`); for (const w of warns) console.log('  ' + w); }
if (errors.length) { console.log(`\nERRORS (${errors.length}):`); for (const e of errors) console.log('  ' + e); process.exit(1); }
console.log('\nOK');
