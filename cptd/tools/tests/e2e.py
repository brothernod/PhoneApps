import asyncio, json, sys
from playwright.async_api import async_playwright
import os
# Run from anywhere: serve the repo root first, e.g.  python3 -m http.server 8765 --bind 127.0.0.1
URL = os.environ.get('CPTD_URL', 'http://127.0.0.1:8765/cptd/')
OUT = os.environ.get('CPTD_SHOTS', '/tmp/cptd-shots/'); os.makedirs(OUT, exist_ok=True)
_CHROME = os.environ.get('CPTD_CHROME')  # optional path to a Chrome/Chromium binary
LAUNCH = dict(executable_path=_CHROME, args=['--no-sandbox']) if _CHROME else dict(args=['--no-sandbox'])



errors = []

async def answer_current(page):
    """Answer whatever question is on screen. Returns a short description of the type."""
    if await page.locator('[data-act="preview-go"]').count():
        await page.click('[data-act="preview-go"]'); return 'preview'
    if await page.locator('#orderbox').count():
        # tap pool items in the order they appear (usually wrong, tests the miss path)
        while await page.locator('#orderbox .pool .chip').count():
            await page.locator('#orderbox .pool .chip').first.click()
        await page.click('[data-act="check"]'); return 'order'
    if await page.locator('.opt.multi').count():
        await page.locator('.opt.multi').nth(0).click()
        await page.locator('.opt.multi').nth(1).click()
        await page.click('[data-act="check"]'); return 'multi'
    if await page.locator('.opt').count():
        await page.locator('.opt').first.click(); return 'single'
    return 'none'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        ctx = await b.new_context(viewport={'width': 412, 'height': 915}, device_scale_factor=2, is_mobile=True, has_touch=True,
                                  user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36')
        page = await ctx.new_page()
        page.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        await page.goto(URL)
        await page.wait_for_timeout(600)
        await page.screenshot(path=OUT + '01-home.png', full_page=False)
        await page.screenshot(path=OUT + '01b-home-full.png', full_page=True)

        # start a sprint
        await page.click('[data-act="sprint"][data-mode="mixed"]')
        await page.wait_for_timeout(300)
        await page.screenshot(path=OUT + '02-preview.png')
        kinds = []
        shot_types = set()
        for i in range(26):
            # screenshot first time we see each question type before answering
            label = await page.locator('.qcard .tab').first.text_content() if await page.locator('.qcard .tab').count() else ''
            if label and label not in shot_types and label != 'New model':
                shot_types.add(label)
                await page.screenshot(path=OUT + f'03-q-{len(shot_types):02d}-{label.replace(" ", "_").replace("?", "")}.png')
            k = await answer_current(page)
            kinds.append(k)
            await page.wait_for_timeout(250)
            if k in ('single', 'multi', 'order') and len([x for x in kinds if x == k]) == 1:
                await page.screenshot(path=OUT + f'04-feedback-{k}.png', full_page=True)
            if await page.locator('[data-act="next"]').count():
                await page.click('[data-act="next"]')
                await page.wait_for_timeout(200)
        print('kinds seen:', kinds)
        print('labels seen:', sorted(shot_types))
        st = await page.evaluate('window.__cptd.state')
        print('answered', st['stats']['answered'], 'correct', st['stats']['correct'], 'xp', st['xp'], 'time', st['time']['total'], 'cards', len(st['cards']))
        await page.click('[data-act="end-run"]')
        await page.wait_for_timeout(300)
        await page.screenshot(path=OUT + '05-summary.png', full_page=True)

        # learn list and a model page
        await page.goto(URL + '#/learn'); await page.wait_for_timeout(300)
        await page.screenshot(path=OUT + '06-learn.png')
        await page.fill('#learnq', 'tuckman'); await page.wait_for_timeout(200)
        await page.screenshot(path=OUT + '06b-learn-search.png')
        await page.goto(URL + '#/learn/situational'); await page.wait_for_timeout(300)
        await page.screenshot(path=OUT + '07-model.png', full_page=True)
        # drill an ordered model
        await page.goto(URL + '#/learn/tuckman'); await page.wait_for_timeout(200)
        await page.click('[data-act="sprint"][data-mode="model"]'); await page.wait_for_timeout(300)
        seen_order = False
        for i in range(12):
            if await page.locator('#orderbox').count() and not seen_order:
                seen_order = True
                await page.locator('#orderbox .pool .chip').first.click()
                await page.locator('#orderbox .pool .chip').first.click()
                await page.screenshot(path=OUT + '08-order-partial.png', full_page=True)
            k = await answer_current(page)
            await page.wait_for_timeout(200)
            if k == 'order':
                await page.screenshot(path=OUT + '08b-order-feedback.png', full_page=True)
            if await page.locator('[data-act="next"]').count():
                await page.click('[data-act="next"]'); await page.wait_for_timeout(150)
            if await page.locator('[data-act="again"]').count():
                break
        await page.screenshot(path=OUT + '09-model-drill-end.png', full_page=True)

        # practice, case
        await page.goto(URL + '#/practice'); await page.wait_for_timeout(300)
        await page.screenshot(path=OUT + '10-practice.png', full_page=True)
        await page.goto(URL + '#/case/case-team'); await page.wait_for_timeout(300)
        await page.screenshot(path=OUT + '11-case.png', full_page=True)
        for step in range(3):
            await page.locator('.opt').nth(0).click(); await page.locator('.opt').nth(2).click()
            await page.click('[data-act="case-submit"]'); await page.wait_for_timeout(200)
            if step == 0: await page.screenshot(path=OUT + '12-case-feedback.png', full_page=True)
            await page.click('[data-act="case-next"]'); await page.wait_for_timeout(200)
        await page.screenshot(path=OUT + '13-case-done.png')

        # progress, settings, exam, listen
        for name in ['progress', 'settings', 'exam', 'listen']:
            await page.goto(URL + '#/' + name); await page.wait_for_timeout(300)
            await page.screenshot(path=OUT + f'14-{name}.png', full_page=True)

        # dark mode question
        await ctx.close()
        ctx2 = await b.new_context(viewport={'width': 412, 'height': 915}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme='dark')
        page2 = await ctx2.new_page()
        page2.on('pageerror', lambda e: errors.append(f'pageerror(dark): {e}'))
        await page2.goto(URL); await page2.wait_for_timeout(400)
        await page2.screenshot(path=OUT + '20-dark-home.png')
        await page2.click('[data-act="sprint"][data-mode="mixed"]'); await page2.wait_for_timeout(200)
        await page2.click('[data-act="no-previews"]'); await page2.wait_for_timeout(200)
        await answer_current(page2); await page2.wait_for_timeout(500)
        await page2.screenshot(path=OUT + '21-dark-feedback.png', full_page=True)
        await b.close()
    print('ERRORS:', json.dumps(errors, indent=1) if errors else 'none')

asyncio.run(main())
