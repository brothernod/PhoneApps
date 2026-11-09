/* Merges the study content parts into one object, window.CPTD_ALL, for app.js.
 * The Node tools (tools/check-content.mjs, tools/claims.mjs) run this same file,
 * so the app and the tools always see the same merged content.
 *
 * Parts, in the order index.html loads them:
 *   window.CPTD        content.js: Domain 1 (its `domain` block, areas, statements,
 *                      content, its `exam`) plus `shared` { tags, exam } for every domain.
 *   window.CPTD_PARTS  an array that later files push onto:
 *     content-dN.js         { domain: { id, num, name, short, weight }, areas, statements, exam }
 *     content-dN-<area>.js  { domain: 'dN', models, kin, questions, cases }
 * A part's `exam` ({ facts, tips }) always belongs to its domain. Any number of parts
 * can name the same domain; their lists are concatenated. Problems found while
 * merging go in `problems`, which the checker reports as errors.
 */
(function (root) {
  'use strict';

  // The exam's three domains. Metadata parts can override these; content is optional.
  const OUTLINE = [
    { id: 'd1', num: 1, name: 'Building Personal Capability', short: 'Personal', weight: 20 },
    { id: 'd2', num: 2, name: 'Developing Professional Capability', short: 'Professional', weight: 45 },
    { id: 'd3', num: 3, name: 'Impacting Organizational Capability', short: 'Organizational', weight: 35 },
  ];

  function merge(base, extra) {
    const parts = (base ? [base] : []).concat(Array.isArray(extra) ? extra : []);
    const out = {
      domains: [], areas: [], statements: {}, tags: {}, exam: { facts: [] },
      models: [], kin: [], questions: [], cases: [], version: '', problems: [],
    };
    const DBY = {};
    const dom = (id) => {
      if (!DBY[id]) {
        const o = OUTLINE.find((d) => d.id === id) || { id, num: OUTLINE.length + 1, name: id, short: id, weight: 0 };
        DBY[id] = Object.assign({}, o, { exam: { facts: [], tips: [] }, areas: [], meta: false, parts: 0 });
      }
      return DBY[id];
    };
    OUTLINE.forEach((d) => dom(d.id));

    parts.forEach((p, n) => {
      if (!p || typeof p !== 'object') { out.problems.push(`part ${n}: not an object`); return; }
      const id = p === base && !p.domain ? 'd1' : typeof p.domain === 'string' ? p.domain : p.domain && p.domain.id;
      if (!id) { out.problems.push(`part ${n}: no domain`); return; }
      const d = dom(id);
      d.parts += 1;
      if (p.domain && typeof p.domain === 'object') {
        ['num', 'name', 'short', 'weight'].forEach((k) => { if (p.domain[k] != null) d[k] = p.domain[k]; });
        d.meta = true;
      }
      if (p.shared) {
        Object.assign(out.tags, p.shared.tags || {});
        if (p.shared.exam) out.exam.facts.push(...(p.shared.exam.facts || []));
      }
      if (p.exam) { d.exam.facts.push(...(p.exam.facts || [])); d.exam.tips.push(...(p.exam.tips || [])); }
      (p.areas || []).forEach((a) => { a.domain = id; out.areas.push(a); d.areas.push(a.id); });
      Object.keys(p.statements || {}).forEach((s) => {
        if (s in out.statements) out.problems.push(`statement ${s} defined twice`);
        out.statements[s] = p.statements[s];
      });
      ['models', 'questions', 'cases'].forEach((k) => (p[k] || []).forEach((x) => { x.domain = id; out[k].push(x); }));
      (p.kin || []).forEach((g) => out.kin.push(g));
      if (p.version && p.version > out.version) out.version = p.version;
    });

    // Keep every list in domain order, whatever order the files loaded in.
    out.domains = Object.values(DBY).sort((a, b) => a.num - b.num);
    const rank = Object.fromEntries(out.domains.map((d, i) => [d.id, i]));
    const byDom = (list) => list.map((x, i) => [x, i]).sort((a, b) => rank[a[0].domain] - rank[b[0].domain] || a[1] - b[1]).map((e) => e[0]);
    ['areas', 'models', 'questions', 'cases'].forEach((k) => { out[k] = byDom(out[k]); });
    out.domains.forEach((d) => {
      d.counts = {
        models: out.models.filter((m) => m.domain === d.id).length,
        questions: out.questions.filter((q) => q.domain === d.id).length,
        cases: out.cases.filter((c) => c.domain === d.id).length,
      };
      d.live = d.counts.models + d.counts.questions + d.counts.cases > 0;
    });
    return out;
  }

  root.CPTD_MERGE = merge;
  root.CPTD_ALL = merge(root.CPTD, root.CPTD_PARTS);
})(typeof window !== 'undefined' ? window : globalThis);
