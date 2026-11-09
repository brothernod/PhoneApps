# Exhaustive: generate every "which model?" card 300 times; no decoy may be a related model
# or contain the item's words.
import asyncio, json
from playwright.async_api import async_playwright
import os
# Run from anywhere: serve the repo root first, e.g.  python3 -m http.server 8765 --bind 127.0.0.1
URL = os.environ.get('CPTD_URL', 'http://127.0.0.1:8765/cptd/')
OUT = os.environ.get('CPTD_SHOTS', '/tmp/cptd-shots/'); os.makedirs(OUT, exist_ok=True)
_CHROME = os.environ.get('CPTD_CHROME')  # optional path to a Chrome/Chromium binary
LAUNCH = dict(executable_path=_CHROME, args=['--no-sandbox']) if _CHROME else dict(args=['--no-sandbox'])

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        page = await b.new_page()
        await page.goto(URL); await page.wait_for_timeout(400)
        res = await page.evaluate("""() => {
          const A = window.__cptd, C = A.C;
          const norm = (s) => s.toLowerCase().replace(/\\(.*?\\)/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\\s+/g, ' ').trim();
          const byName = Object.fromEntries(C.models.map(m => [m.name, m]));
          const kin = new Set();
          for (const g of C.kin) { if (g.hub) g.with.forEach(x => { kin.add(g.hub+'|'+x); kin.add(x+'|'+g.hub); }); if (g.all) g.all.forEach(a => g.all.forEach(c => { if (a !== c) kin.add(a+'|'+c); })); }
          const bad = []; let n = 0; const tuck = new Set();
          for (const card of A.CARDS.filter(c => c.type === 'which')) {
            for (let k = 0; k < 300; k++) {
              const q = A.makeQ(card); n++;
              const right = q.opts.find(o => o.ok); const rm = byName[right.t];
              if (q.opts.length !== 4) bad.push(card.key + ': ' + q.opts.length + ' options');
              const item = q.prompt.replace(/[“”]/g, '');
              for (const o of q.opts.filter(o => !o.ok)) {
                const om = byName[o.t];
                if (kin.has(om.id + '|' + rm.id)) bad.push(`${card.key}: kin decoy ${om.id}`);
                if (norm(om.name).includes(norm(item))) bad.push(`${card.key}: "${item}" inside decoy name ${om.id}`);
                if (rm.id === 'tuckman') tuck.add(om.id);
              }
            }
          }
          return { n, bad: [...new Set(bad)].slice(0, 30), tuckmanDecoys: [...tuck].sort() };
        }""")
        print('generated', res['n'], 'which-questions')
        print('problems:', res['bad'] or 'none')
        print('Tuckman decoys seen:', res['tuckmanDecoys'])
        await b.close()
asyncio.run(main())
