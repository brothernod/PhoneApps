"""Reproduces the reported flow on an iPhone-sized screen:
pick a short sprint, read the preview, answer the quiz wrong, and check that
the way forward is always on screen; then quit and restart three times and
check the opening question changes."""
import asyncio, json
from playwright.async_api import async_playwright
import os
# Run from anywhere: serve the repo root first, e.g.  python3 -m http.server 8765 --bind 127.0.0.1
URL = os.environ.get('CPTD_URL', 'http://127.0.0.1:8765/cptd/')
OUT = os.environ.get('CPTD_SHOTS', '/tmp/cptd-shots/'); os.makedirs(OUT, exist_ok=True)
_CHROME = os.environ.get('CPTD_CHROME')  # optional path to a Chrome/Chromium binary
LAUNCH = dict(executable_path=_CHROME, args=['--no-sandbox']) if _CHROME else dict(args=['--no-sandbox'])


results = []
def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))

IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'

async def bar_state(page):
    return await page.evaluate("""() => {
      const bar = document.getElementById('actbar');
      if (!bar) return null;
      const r = bar.getBoundingClientRect();
      const btns = Array.from(bar.querySelectorAll('.btn')).map(b => ({act: b.dataset.act, text: b.textContent.trim(), disabled: b.disabled}));
      const msg = (bar.querySelector('.actbar-msg') || {}).textContent || '';
      return {top: r.top, bottom: r.bottom, vh: innerHeight, btns, msg};
    }""")

async def cur(page):
    return await page.evaluate("() => { const q = window.__cptd.cur; return q ? {key: q.card.key, kind: q.kind, done: !!q.done, ok: q.opts ? q.opts.map(o => !!o.ok) : null} : null; }")

async def click_bar(page, act):
    await page.click(f'#actbar [data-act="{act}"]')
    await page.wait_for_timeout(150)

async def to_question(page):
    """From the start of a sprint, get past any preview to a question."""
    for _ in range(3):
        st = await bar_state(page)
        if st and any(b['act'] == 'preview-go' for b in st['btns']):
            await click_bar(page, 'preview-go')
        else:
            break
    return await cur(page)

async def answer_wrong(page, q):
    if q['kind'] == 'single':
        i = q['ok'].index(False)
        await page.locator('.opt').nth(i).click()
    elif q['kind'] == 'multi':
        i = q['ok'].index(False)
        await page.locator('.opt').nth(i).click()
        await page.wait_for_timeout(80)
        await click_bar(page, 'check')
    else:  # order: place in reverse of the correct order
        seq = await page.evaluate('window.__cptd.cur.seq')
        for t in reversed(seq):
            await page.locator('#orderbox .pool .chip', has_text=t).first.click()
        await click_bar(page, 'check')
    await page.wait_for_timeout(500)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        ctx = await b.new_context(viewport={'width': 390, 'height': 664}, device_scale_factor=2, is_mobile=True, has_touch=True,
                                  user_agent=IPHONE_UA, color_scheme='dark')
        page = await ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' else None)
        await page.goto(URL); await page.wait_for_timeout(500)

        openers = []
        for attempt in range(3):
            await page.click('[data-act="sprint-len"][data-n="2"]')
            await page.click('[data-act="sprint"][data-mode="mixed"]')
            await page.wait_for_timeout(300)
            st = await bar_state(page)
            if attempt == 0:
                check('preview has bar button', st and st['btns'][0]['act'] == 'preview-go', json.dumps(st))
                await page.screenshot(path=OUT + 'bar-01-preview.png')
            q = await to_question(page)
            openers.append(q['key'])
            st = await bar_state(page)
            check(f'[{attempt}] question bar visible', st and st['bottom'] <= st['vh'] + 0.5 and st['top'] < st['vh'] - 60, json.dumps(st))
            if attempt == 0:
                await page.screenshot(path=OUT + f'bar-02-question-{q["kind"]}.png')
            await answer_wrong(page, q)
            st = await bar_state(page)
            nxt = [x for x in st['btns'] if x['act'] == 'next']
            check(f'[{attempt}] after wrong answer: Next on screen and enabled', nxt and not nxt[0]['disabled'] and st['bottom'] <= st['vh'] + 0.5, json.dumps(st))
            check(f'[{attempt}] after wrong answer: status says what happens', 'Not quite' in st['msg'] and 'another try' in st['msg'], st['msg'])
            focused = await page.evaluate("document.activeElement && document.activeElement.dataset.act")
            check(f'[{attempt}] Next has focus', focused == 'next', str(focused))
            if attempt == 0:
                await page.screenshot(path=OUT + f'bar-03-wrong-{q["kind"]}.png')
                # nothing important hidden under the bar: scroll to the bottom and compare
                await page.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)'); await page.wait_for_timeout(200)
                gap = await page.evaluate("""() => { const fb = document.querySelector('#feedback .why') || document.querySelector('.opts'); const bar = document.getElementById('actbar'); return bar.getBoundingClientRect().top - fb.getBoundingClientRect().bottom; }""")
                check('feedback clears the bar when scrolled down', gap >= 0, f'gap={gap:.0f}px')
                await page.screenshot(path=OUT + f'bar-04-wrong-scrolled.png')
                # Next really moves on
                await click_bar(page, 'next')
                q2 = await to_question(page)
                check('Next moves to a new question', q2 and q2['key'] != q['key'] and not q2['done'], json.dumps(q2))
            # quit like the user did, then go home
            await page.click('[data-act="end-run"]'); await page.wait_for_timeout(200)
            await page.click('a.btn.ghost[href="#/"]'); await page.wait_for_timeout(300)
        check('opening question differs across 3 restarts', len(set(openers)) == 3, str(openers))

        # "Show me" works for each question type
        seen = set()
        await page.click('[data-act="sprint-len"][data-n="15"]')
        await page.click('[data-act="sprint"][data-mode="mixed"]'); await page.wait_for_timeout(300)
        for _ in range(40):
            q = await to_question(page)
            if not q: break
            if q['kind'] not in seen:
                seen.add(q['kind'])
                await click_bar(page, 'reveal')
                st = await bar_state(page)
                after = await cur(page)
                check(f'Show me ({q["kind"]}) reveals and offers Next', after['done'] and any(x['act'] == 'next' for x in st['btns']) and 'Here' in st['msg'], st['msg'])
                ok_marked = await page.locator('.opt.ok').count() if q['kind'] != 'order' else await page.locator('.slot.filled').count()
                check(f'Show me ({q["kind"]}) marks the answer', ok_marked >= 1, f'marked={ok_marked}')
                await page.screenshot(path=OUT + f'bar-05-reveal-{q["kind"]}.png')
            else:
                await answer_wrong(page, q)
            await click_bar(page, 'next')
            if seen >= {'single', 'multi', 'order'}: break
        check('saw all three kinds', seen >= {'single', 'multi', 'order'}, str(seen))
        # multi: check stays disabled until a pick, count shows
        for _ in range(30):
            q = await to_question(page)
            if q['kind'] == 'multi': break
            await answer_wrong(page, q); await click_bar(page, 'next')
        st = await bar_state(page)
        chk = [x for x in st['btns'] if x['act'] == 'check'][0]
        check('multi: Check disabled before a pick', chk['disabled'], json.dumps(st))
        await page.locator('.opt').nth(0).click(); await page.wait_for_timeout(80)
        st = await bar_state(page)
        chk = [x for x in st['btns'] if x['act'] == 'check'][0]
        check('multi: Check enabled after a pick, count shown', not chk['disabled'] and '1 selected' in st['msg'], st['msg'])
        await page.click('[data-act="end-run"]'); await page.wait_for_timeout(200)
        check('summary has no action bar', await page.locator('#actbar').count() == 0 and not await page.evaluate("document.body.classList.contains('has-actbar')"))

        # case flow uses the bar
        await page.goto(URL + '#/case/case-team'); await page.wait_for_timeout(300)
        st = await bar_state(page)
        check('case: Submit in bar, disabled', st['btns'][0]['act'] == 'case-submit' and st['btns'][0]['disabled'], json.dumps(st))
        for step in range(3):
            await page.locator('.opt').nth(0).click(); await page.wait_for_timeout(60)
            await click_bar(page, 'case-submit')
            st = await bar_state(page)
            check(f'case step {step + 1}: next in bar', st['btns'][0]['act'] == 'case-next' and 'This step' in st['msg'], json.dumps(st))
            if step == 0: await page.screenshot(path=OUT + 'bar-06-case.png')
            await click_bar(page, 'case-next')
        check('case finished screen', await page.locator('text=out of').count() >= 1)
        check('no page errors', not errors, '; '.join(errors))
        await b.close()
    w = max(len(r[0]) for r in results)
    for name, ok, detail in results:
        print(('PASS ' if ok else 'FAIL ') + name.ljust(w) + ('  ' + detail[:160] if detail else ''))
    print('ALL PASS' if all(r[1] for r in results) else 'SOME FAILED')

asyncio.run(main())
