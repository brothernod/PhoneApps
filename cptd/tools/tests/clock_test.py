import asyncio, datetime
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

async def total(page):
    return await page.evaluate('window.__cptd.state.time.total')

async def tap(page):
    # a harmless tap on empty space (counts as interaction)
    await page.mouse.click(200, 12)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        ctx = await b.new_context(viewport={'width': 412, 'height': 915}, is_mobile=True, has_touch=True, timezone_id='America/New_York')
        page = await ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.clock.install(time=datetime.datetime(2026, 11, 4, 14, 0, 0, tzinfo=datetime.timezone.utc))  # 9:00 a.m. New York
        await page.goto(URL)
        await page.clock.run_for(500)
        await tap(page)

        # 1) 30 seconds of active use, tapping every 10 s
        for _ in range(3):
            await page.clock.run_for(10_000); await tap(page)
        t1 = await total(page)
        check('active time counts', 28 <= t1 <= 32, f'total={t1}')

        # 2) walk away for 5 minutes: only a 20-second grace is kept
        await page.clock.run_for(300_000)
        idle_banner = await page.locator('#idle').is_visible()
        await tap(page)
        t2 = await total(page)
        check('idle shows paused banner', idle_banner)
        check('idle time not counted beyond grace', 18 <= t2 - t1 <= 22, f'gained={t2 - t1}')
        check('banner hides after tap', not await page.locator('#idle').is_visible())

        # 3) hidden app (phone locked) does not count
        await page.evaluate("""() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); }""")
        t3a = await total(page)
        await page.clock.run_for(90_000)
        await page.evaluate("""() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); }""")
        await tap(page)
        t3 = await total(page)
        check('hidden time not counted', t3 - t3a <= 2, f'gained={t3 - t3a}')

        # 4) reading quietly for 90 s (under the 2-minute window) still counts once you tap
        await page.clock.run_for(90_000); await tap(page)
        t4 = await total(page)
        check('quiet reading under 2 min counts', 88 <= t4 - t3 <= 92, f'gained={t4 - t3}')

        # 5) reach the 10-minute daily goal -> streak 1, goal day recorded, +25 XP bonus
        while await total(page) < 600:
            await page.clock.run_for(10_000); await tap(page)
        await page.clock.run_for(1_000)
        st = await page.evaluate('window.__cptd.state')
        check('goal met recorded', st['goalDays'].get('2026-11-04') is True, str(st['goalDays']))
        check('streak is 1', st['streak']['count'] == 1, str(st['streak']))
        check('xp from time accrues', st['xp'] >= 60 + 25, f"xp={st['xp']}")

        # 6) next day: goal again -> streak 2
        await page.clock.fast_forward(24 * 3600_000 - 700_000)
        await tap(page)
        while (await page.evaluate("window.__cptd.state.time.days['2026-11-05'] || 0")) < 600:
            await page.clock.run_for(10_000); await tap(page)
        await page.clock.run_for(1_000)
        st = await page.evaluate('window.__cptd.state')
        check('streak is 2 next day', st['streak']['count'] == 2, str(st['streak']))

        # 7) skip a day with no pass -> streak resets to 1 on the following goal
        await page.clock.fast_forward(48 * 3600_000)
        await tap(page)
        while (await page.evaluate("window.__cptd.state.time.days['2026-11-07'] || 0")) < 600:
            await page.clock.run_for(10_000); await tap(page)
        await page.clock.run_for(1_000)
        st = await page.evaluate('window.__cptd.state')
        check('missed day resets streak', st['streak']['count'] == 1 and st['streak']['best'] == 2, str(st['streak']))

        # 8) sprint clock: a 2-minute sprint runs out and the Next button becomes See results
        await page.goto(URL + '#/'); await page.clock.run_for(300)
        await page.click('[data-act="sprint-len"][data-n="2"]')
        await page.click('[data-act="sprint"][data-mode="mixed"]')
        await page.clock.run_for(300)
        if await page.locator('[data-act="no-previews"]').count():
            await page.click('[data-act="no-previews"]')
        for _ in range(13):
            await page.clock.run_for(10_000); await page.mouse.click(206, 40)
        clock_text = await page.locator('[data-live="clock"]').text_content()
        check('sprint clock shows time up', 'Time' in clock_text, clock_text)
        # Time ran out on either a preview or a question; both must offer "See results".
        if await page.locator('#actbar [data-act="preview-go"]').count():
            act = 'preview-go'
        else:
            await page.click('#actbar [data-act="reveal"]')  # works for every question type
            act = 'next'
        nxt = await page.locator(f'#actbar [data-act="{act}"]').text_content()
        check('next becomes See results', nxt.strip() == 'See results', f'{act}: {nxt}')
        await page.click(f'#actbar [data-act="{act}"]')
        await page.clock.run_for(300)
        check('summary shown', await page.locator('text=Sprint done').count() == 1)

        check('no page errors', not errors, '; '.join(errors))
        await b.close()
    w = max(len(r[0]) for r in results)
    for name, ok, detail in results:
        print(('PASS ' if ok else 'FAIL ') + name.ljust(w) + ('  ' + detail if detail else ''))
    print('ALL PASS' if all(r[1] for r in results) else 'SOME FAILED')

asyncio.run(main())
