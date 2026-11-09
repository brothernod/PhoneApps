import asyncio, json
from playwright.async_api import async_playwright
import os
# Run from anywhere: serve the repo root first, e.g.  python3 -m http.server 8765 --bind 127.0.0.1
URL = os.environ.get('CPTD_URL', 'http://127.0.0.1:8765/cptd/')
OUT = os.environ.get('CPTD_SHOTS', '/tmp/cptd-shots/'); os.makedirs(OUT, exist_ok=True)
_CHROME = os.environ.get('CPTD_CHROME')  # optional path to a Chrome/Chromium binary
LAUNCH = dict(executable_path=_CHROME, args=['--no-sandbox']) if _CHROME else dict(args=['--no-sandbox'])

JS = r"""
() => {
  const { CARDS, makeQ } = window.__cptd;
  const C = window.__cptd.C;
  const MBY = Object.fromEntries(C.models.map(m => [m.id, m]));
  const problems = []; const counts = {};
  for (const card of CARDS) {
    for (let k = 0; k < 20; k++) {
      const Q = makeQ(card);
      counts[card.type] = (counts[card.type] || 0) + 1;
      const txt = JSON.stringify([Q.prompt, Q.ctx, Q.hint || "", Q.why, Q.opts || [], Q.seq || [], Q.pool || []]);
      if (/undefined|null|NaN|\[object/.test(txt)) problems.push(`${card.key}: bad text ${txt.slice(0, 120)}`);
      if (Q.kind === 'single') {
        const ok = Q.opts.filter(o => o.ok).length;
        if (ok !== 1) problems.push(`${card.key}: ${ok} correct options`);
        if (Q.opts.length < 2) problems.push(`${card.key}: too few options`);
        if (new Set(Q.opts.map(o => o.t)).size !== Q.opts.length) problems.push(`${card.key}: duplicate options`);
        if (card.type === 'which') {
          // the item must not appear (by name) in any other offered model
          const item = Q.prompt.replace(/[“”]/g, '');
          if (Q.opts.length < 4) problems.push(`${card.key}: only ${Q.opts.length} options`);
          for (const o of Q.opts) { if (o.ok) continue; const mm = C.models.find(x => x.name === o.t); const il = item.toLowerCase(); if (mm.name.toLowerCase().includes(il) || (mm.note || '').toLowerCase().includes(il) || mm.items.some(i => i.d.toLowerCase().includes(il))) problems.push(`${card.key}: "${item}" appears in distractor ${mm.id}`); }
          for (const o of Q.opts) {
            if (o.ok) continue;
            const m = C.models.find(x => x.name === o.t);
            if (m.items.some(i => i.t.toLowerCase() === item.toLowerCase())) problems.push(`${card.key}: "${item}" also in ${m.id}`);
          }
        }
      } else if (Q.kind === 'multi') {
        const ok = Q.opts.filter(o => o.ok).length;
        if (ok < 1 || ok === Q.opts.length) problems.push(`${card.key}: multi has ${ok}/${Q.opts.length} correct`);
        if (new Set(Q.opts.map(o => o.t)).size !== Q.opts.length) problems.push(`${card.key}: duplicate options`);
      } else if (Q.kind === 'order') {
        if (Q.seq.length < 3) problems.push(`${card.key}: short order`);
        if (Q.pool.every((t, i) => t === Q.seq[i])) problems.push(`${card.key}: pool already in order`);
        const m = MBY[card.model];
        const idx = Q.seq.map(t => m.items.findIndex(i => i.t === t));
        if (idx.some((v, i) => i && v !== idx[i - 1] + 1)) problems.push(`${card.key}: slice not consecutive`);
      }
    }
  }
  const byType = {}; for (const c of CARDS) byType[c.type] = (byType[c.type] || 0) + 1;
  return { cards: CARDS.length, byType, generated: counts, problems: [...new Set(problems)].slice(0, 40) };
}
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        page = await b.new_page()
        await page.goto(URL); await page.wait_for_timeout(400)
        r = await page.evaluate(JS)
        print(json.dumps(r, indent=1))
        await b.close()
asyncio.run(main())
