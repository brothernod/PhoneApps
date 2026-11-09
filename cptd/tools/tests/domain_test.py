"""Multi-domain checks. Serves tests/fixtures/content-d2-learn-stub.js in place of the
real content-d2-learn.js and empties the other Domain 2 area files, so Domain 2 is just
the stub whatever Domain 2 content exists:
the Home picker, a Domain 2 sprint, the Learn filter, per-domain progress, and that a
Domain 1 card keeps its saved box after switching domains and reloading.
Then, with the real files, checks that a domain with no content stays hidden."""
import asyncio, json, os
from playwright.async_api import async_playwright
# Run from anywhere: serve the repo root first, e.g.  python3 -m http.server 8765 --bind 127.0.0.1
URL = os.environ.get('CPTD_URL', 'http://127.0.0.1:8765/cptd/')
OUT = os.environ.get('CPTD_SHOTS', '/tmp/cptd-shots/'); os.makedirs(OUT, exist_ok=True)
_CHROME = os.environ.get('CPTD_CHROME')  # optional path to a Chrome/Chromium binary
LAUNCH = dict(executable_path=_CHROME, args=['--no-sandbox']) if _CHROME else dict(args=['--no-sandbox'])
STUB = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures', 'content-d2-learn-stub.js'), encoding='utf-8').read()

results = []
def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))

D1_KEY = 'm:tuckman:order'
SEED = {'v': 1, 'cards': {D1_KEY: {'b': 3, 'due': 99999, 'n': 3, 'r': 3, 'w': 0, 'last': 0}}, 'settings': {'previews': False}}
SEED_JS = "if (!sessionStorage.getItem('seeded')) { localStorage.setItem('cptd-bpc-v1', %s); sessionStorage.setItem('seeded', '1'); }" % json.dumps(json.dumps(SEED))

async def answer_current(page):
    if await page.locator('[data-act="preview-go"]').count():
        await page.click('[data-act="preview-go"]'); return
    if await page.locator('#orderbox').count():
        while await page.locator('#orderbox .pool .chip').count():
            await page.locator('#orderbox .pool .chip').first.click()
        await page.click('#actbar [data-act="check"]'); return
    if await page.locator('.opt.multi').count():
        await page.locator('.opt.multi').nth(0).click()
        await page.click('#actbar [data-act="check"]'); return
    if await page.locator('.opt').count():
        await page.locator('.opt').first.click()

async def stub_page(b, w, h):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True)
    await ctx.route('**/content-d2-learn.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=STUB))
    for a in ('design', 'techkm', 'people', 'eval'):  # the stub is Domain 2's only content
        await ctx.route(f'**/content-d2-{a}.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body='/* emptied by domain_test */'))
    await ctx.add_init_script(SEED_JS)
    page = await ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
    return ctx, page, errs

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)

        # ---------- with a Domain 2 stub ----------
        ctx, page, errs = await stub_page(b, 412, 915)
        await page.goto(URL); await page.wait_for_timeout(500)
        chips = await page.locator('.dompick .chip').all_text_contents()
        check('home picker lists All, 1, 2 only', chips == ['All domains', '1 Personal', '2 Professional'], chips)
        check('per-domain rows', await page.locator('.domrow').count() == 2)
        await page.screenshot(path=OUT + '40-home-picker-412.png')
        box0 = await page.evaluate(f"window.__cptd.state.cards['{D1_KEY}'].b")
        check('seeded D1 box', box0 == 3, box0)

        await page.click('.dompick [data-v="d2"]'); await page.wait_for_timeout(200)
        st = await page.evaluate('window.__cptd.state.settings.domain')
        check('picker saves the domain', st == 'd2', st)
        tab = await page.locator('.hero .tab').text_content()
        check('hero is for Domain 2', 'Domain 2' in tab, tab)
        check('areas list shows only Domain 2 areas', await page.locator('.arearow:not(.domrow)').count() == 1)
        await page.screenshot(path=OUT + '41-home-d2-412.png')

        await page.click('.hero [data-act="sprint"][data-mode="mixed"]'); await page.wait_for_timeout(300)
        doms = set()
        for _ in range(10):
            cur = await page.evaluate('window.__cptd.cur ? window.__cptd.cur.card.domain : null')
            if cur: doms.add(cur)
            await answer_current(page); await page.wait_for_timeout(150)
            if await page.locator('#actbar [data-act="next"]').count():
                await page.click('#actbar [data-act="next"]'); await page.wait_for_timeout(120)
            if await page.locator('[data-act="again"]').count(): break
        check('Domain 2 sprint asks only Domain 2 cards', doms == {'d2'}, sorted(doms))
        n2 = await page.evaluate("Object.keys(window.__cptd.state.cards).filter(k => k.includes('stub-')).length")
        check('Domain 2 cards graded', n2 >= 3, n2)
        if await page.locator('[data-act="end-run"]').count():
            await page.click('[data-act="end-run"]'); await page.wait_for_timeout(200)
        await page.goto(URL + '#/'); await page.wait_for_timeout(1600)  # let the debounced save land

        await page.reload(); await page.wait_for_timeout(500)
        st = await page.evaluate('window.__cptd.state.settings.domain')
        check('domain choice survives a reload', st == 'd2', st)
        box1 = await page.evaluate(f"window.__cptd.state.cards['{D1_KEY}'].b")
        check('D1 card keeps its box after switching to Domain 2 and reloading', box1 == 3, box1)
        await page.click('.dompick [data-v="all"]'); await page.wait_for_timeout(200)
        box2 = await page.evaluate(f"window.__cptd.state.cards['{D1_KEY}'].b")
        check('D1 card keeps its box after switching back to all', box2 == 3, box2)
        live_card = await page.evaluate(f"window.__cptd.CARDS.some(c => c.key === '{D1_KEY}' && c.domain === 'd1')")
        check('D1 card key is unchanged and still in the deck', live_card)

        # Learn filter follows Home until changed
        await page.click('.dompick [data-v="d2"]'); await page.wait_for_timeout(200)
        await page.goto(URL + '#/learn'); await page.wait_for_timeout(300)
        n_d2 = await page.locator('.modelrow').count()
        check('Learn follows the Home domain (2 stub models)', n_d2 == 2, n_d2)
        await page.screenshot(path=OUT + '42-learn-d2-412.png')
        await page.click('.dompick [data-act="learn-domain"][data-v="all"]'); await page.wait_for_timeout(200)
        n_all = await page.locator('.modelrow').count()
        heads = await page.locator('.domlabel').all_text_contents()
        check('Learn "All domains" shows every model, grouped by domain', n_all > 80 and len(heads) == 2, (n_all, heads))
        await page.screenshot(path=OUT + '43-learn-all-412.png')

        # Practice, progress, exam, settings
        await page.goto(URL + '#/practice'); await page.wait_for_timeout(300)
        txt = await page.locator('#app').inner_text()
        check('Practice groups cases by domain', 'Stub case' in txt and txt.count('DOMAIN 2') + txt.count('Domain 2: Developing') >= 1)
        await page.goto(URL + '#/progress'); await page.wait_for_timeout(300)
        check('Progress shows mastery by domain', 'Mastery by domain' in await page.locator('#app').inner_text())
        await page.goto(URL + '#/exam'); await page.wait_for_timeout(300)
        check('Exam page has Domain 2 tips', 'Study tips for Domain 2' in await page.locator('#app').inner_text())
        await page.goto(URL + '#/settings'); await page.wait_for_timeout(300)
        about = await page.locator('.about-doms').inner_text()
        check('About lists all three domains', about.count('Domain ') == 3 and 'not in the app yet' in about, about)
        check('no page errors (stub)', not errs, errs[:3])
        await ctx.close()

        # iPhone size: the sprint button stays on screen with the picker above it
        ctx, page, errs = await stub_page(b, 390, 664)
        await page.goto(URL); await page.wait_for_timeout(500)
        r = await page.evaluate("(() => { const b = document.querySelector('.hero [data-act=\"sprint\"]').getBoundingClientRect(); return [b.bottom, innerHeight]; })()")
        check('390x664: sprint button on screen under the picker', r[0] <= r[1], r)
        await page.screenshot(path=OUT + '44-home-picker-390.png')
        await page.goto(URL + '#/learn'); await page.wait_for_timeout(300)
        await page.screenshot(path=OUT + '45-learn-390.png')
        check('no page errors (390)', not errs, errs[:3])
        await ctx.close()

        # ---------- real files ----------
        ctx = await b.new_context(viewport={'width': 412, 'height': 915}, is_mobile=True, has_touch=True)
        page = await ctx.new_page()
        await page.goto(URL); await page.wait_for_timeout(500)
        live = await page.evaluate("window.__cptd.C.domains.filter(d => d.live).map(d => d.id)")
        if live == ['d1']:
            texts = []
            for h in ['', 'learn', 'practice', 'progress', 'exam']:
                await page.goto(URL + '#/' + h); await page.wait_for_timeout(250)
                texts.append(await page.locator('#app').inner_text())
            joined = '\n'.join(texts)
            check('empty Domain 2 stays hidden', 'Domain 2' not in joined and 'Learning sciences' not in joined and 'Instructional design' not in joined and not await page.locator('.dompick').count())
        else:
            print('real files: live domains', live, '(hidden-domain check skipped)')
        await ctx.close()
        await b.close()

    bad = [r for r in results if not r[1]]
    for name, ok, detail in results:
        print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else f'  {detail}'))
    print('ALL PASS' if not bad else f'SOME FAILED ({len(bad)})')

asyncio.run(main())
