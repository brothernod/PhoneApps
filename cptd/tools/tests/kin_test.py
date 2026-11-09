# Exhaustive: generate every "which model?" card 300 times; no decoy may be a related model,
# contain the item's words, or (from any domain) have an item or name that strict-clashes with it.
# Items only need to be unique within their own domain, so cross-domain clashes are real and
# must be kept out of the decoys.
# Part 2 serves fixtures/content-d2-xclash-stub.js as Domain 2's only area file, so Domain 2's
# cards must take decoys from Domain 1, and checks that the clashing Domain 1 models
# (tuckman for "Quiet storming", situational for "Situational awareness") are never offered.
import asyncio, json
from playwright.async_api import async_playwright
import os
HERE = os.path.dirname(os.path.abspath(__file__))
XSTUB = open(os.path.join(HERE, 'fixtures', 'content-d2-xclash-stub.js'), encoding='utf-8').read()
# Run from anywhere: serve the repo root first, e.g.  python3 -m http.server 8765 --bind 127.0.0.1
URL = os.environ.get('CPTD_URL', 'http://127.0.0.1:8765/cptd/')
OUT = os.environ.get('CPTD_SHOTS', '/tmp/cptd-shots/'); os.makedirs(OUT, exist_ok=True)
_CHROME = os.environ.get('CPTD_CHROME')  # optional path to a Chrome/Chromium binary
LAUNCH = dict(executable_path=_CHROME, args=['--no-sandbox']) if _CHROME else dict(args=['--no-sandbox'])

CHECK = """(arg) => {
          const A = window.__cptd, C = A.C;
          const norm = (s) => s.toLowerCase().replace(/\\(.*?\\)/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\\s+/g, ' ').trim();
          const byName = Object.fromEntries(C.models.map(m => [m.name, m]));
          const kin = new Set();
          for (const g of C.kin) { if (g.hub) g.with.forEach(x => { kin.add(g.hub+'|'+x); kin.add(x+'|'+g.hub); }); if (g.all) g.all.forEach(a => g.all.forEach(c => { if (a !== c) kin.add(a+'|'+c); })); }
          // Strict word-stem clash, same as app.js.
          const STOP = new Set(['self', 'with', 'from', 'your', 'that', 'this', 'their', 'them', 'what', 'when', 'each', 'into', 'than']);
          const stems = (s) => { const n = norm(s); const out = new Set([n]); n.split(' ').forEach(w => { if (w.length >= 4 && !STOP.has(w)) out.add(w.slice(0, 6)); }); return out; };
          const clash = (a, b) => { const sb = stems(b); for (const k of stems(a)) if (sb.has(k)) return true; return false; };
          const member = (o, t) => o.items.some(j => clash(j.t, t)) || (o.groups || []).some(g => g.m.some(x => clash(x, t)));
          const bad = []; let n = 0; const tuck = new Set(); let crossDecoys = 0; const crossClashers = new Set();
          const whichModels = new Set(A.CARDS.filter(c => c.type === 'which').map(c => c.model));
          for (const id of arg.mustHave) if (!whichModels.has(id)) bad.push(`${id}: no which-model card`);
          const asked = new Set(); const blocked = {}; // blocked: "item|model" pairs that must never be offered
          for (const [it, id] of arg.never) blocked[it + '|' + id] = 0;
          for (const card of A.CARDS.filter(c => c.type === 'which')) {
            for (let k = 0; k < arg.reps; k++) {
              const q = A.makeQ(card); n++;
              const right = q.opts.find(o => o.ok); const rm = byName[right.t];
              if (q.opts.length !== 4) bad.push(card.key + ': ' + q.opts.length + ' options');
              const item = q.prompt.replace(/[“”]/g, '');
              if (!asked.has(card.key + '|' + item)) {
                asked.add(card.key + '|' + item); asked.add(item);
                // uniqueness is within the model's own domain only
                for (const o of C.models) if (o.id !== rm.id && o.domain === rm.domain && member(o, item)) bad.push(`${card.key}: "${item}" clashes with ${o.id} in the same domain`);
                for (const o of C.models) if (o.domain !== rm.domain && (member(o, item) || clash(o.name, item))) crossClashers.add(card.key + '|' + item + '|' + o.id);
              }
              for (const o of q.opts.filter(o => !o.ok)) {
                const om = byName[o.t];
                if (om.domain !== rm.domain) crossDecoys++;
                if ((item + '|' + om.id) in blocked) blocked[item + '|' + om.id]++;
                if (member(om, item)) bad.push(`${card.key}: decoy ${om.id} (${om.domain}) has an item that clashes with "${item}"`);
                if (clash(om.name, item)) bad.push(`${card.key}: decoy name ${om.id} clashes with "${item}"`);
                if (kin.has(om.id + '|' + rm.id)) bad.push(`${card.key}: kin decoy ${om.id}`);
                if (norm(om.name).includes(norm(item))) bad.push(`${card.key}: "${item}" inside decoy name ${om.id}`);
                if (rm.id === 'tuckman') tuck.add(om.id);
              }
            }
          }
          if (!crossClashers.size) bad.push('no cross-domain clashing model found: the cross-domain decoy check tests nothing');
          if (arg.needCross && !crossDecoys) bad.push('no cross-domain decoy was ever offered');
          for (const [it, id] of arg.never) {
            if (!asked.has(it)) bad.push(`"${it}" was never asked`);
            if (!crossClashers.has('m:' + arg.model + ':which|' + it + '|' + id)) bad.push(`${id} doesn't clash with "${it}": fix the fixture`);
            if (blocked[it + '|' + id]) bad.push(`cross-domain clash ${id} offered for "${it}" ${blocked[it + '|' + id]} times`);
          }
          return { n, bad: [...new Set(bad)].slice(0, 30), tuckmanDecoys: [...tuck].sort(), crossClashers: crossClashers.size, crossDecoys };
        }"""

# Domain 1 models whose which-model card Domain 2 used to take away.
D1_KEPT = ['woo', 'written', 'lencioni', 'negotiation', 'transformational', 'kouzes-posner', 'pmi-groups', 'charter', 'close', 'triple']
D2_AREAS = ['design', 'techkm', 'people', 'eval']

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        page = await b.new_page()
        await page.goto(URL); await page.wait_for_timeout(400)
        res = await page.evaluate(CHECK, {'reps': 300, 'mustHave': D1_KEPT, 'never': [], 'needCross': False, 'model': ''})
        print('generated', res['n'], 'which-questions')
        print('problems:', res['bad'] or 'none')
        print('cross-domain clashing models kept out of decoys:', res['crossClashers'], '(item, model) pairs; cross-domain decoys offered:', res['crossDecoys'])
        print('Tuckman decoys seen:', res['tuckmanDecoys'])

        # Part 2: Domain 2 is only the clash fixture, so its cards draw decoys from Domain 1.
        ctx = await b.new_context()
        await ctx.route('**/content-d2-learn.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=XSTUB))
        for a in D2_AREAS:
            await ctx.route(f'**/content-d2-{a}.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body='/* emptied by kin_test */'))
        page = await ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto(URL); await page.wait_for_timeout(400)
        res = await page.evaluate(CHECK, {'reps': 300, 'mustHave': ['xstub-a', 'xstub-b'] + D1_KEPT, 'needCross': True, 'model': 'xstub-a',
                                          'never': [['Quiet storming', 'tuckman'], ['Situational awareness', 'situational']]})
        bad = res['bad'] + errs
        print('cross-domain fixture: generated', res['n'], 'which-questions;', res['crossDecoys'], 'cross-domain decoys offered')
        print('cross-domain fixture problems:', bad or 'none')
        await b.close()
asyncio.run(main())
