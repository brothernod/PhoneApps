import asyncio, datetime
from playwright.async_api import async_playwright
import os
# Run from anywhere: serve the repo root first, e.g.  python3 -m http.server 8765 --bind 127.0.0.1
URL = os.environ.get('CPTD_URL', 'http://127.0.0.1:8765/cptd/')
OUT = os.environ.get('CPTD_SHOTS', '/tmp/cptd-shots/'); os.makedirs(OUT, exist_ok=True)
_CHROME = os.environ.get('CPTD_CHROME')  # optional path to a Chrome/Chromium binary
LAUNCH = dict(executable_path=_CHROME, args=['--no-sandbox']) if _CHROME else dict(args=['--no-sandbox'])

URL=URL
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        ctx = await b.new_context(viewport={'width': 412, 'height': 915}, is_mobile=True, has_touch=True, timezone_id='America/New_York')
        page = await ctx.new_page()
        await page.clock.install(time=datetime.datetime(2026, 11, 4, 14, 0, 0, tzinfo=datetime.timezone.utc))
        await page.goto(URL); await page.clock.run_for(300)
        # make the daily goal 5 minutes to keep the test quick
        await page.goto(URL + '#/settings'); await page.clock.run_for(200)
        await page.click('[data-act="set-goal"][data-v="5"]')
        async def study_day(key):
            await page.mouse.click(200, 12)
            while (await page.evaluate(f"window.__cptd.state.time.days['{key}'] || 0")) < 300:
                await page.clock.run_for(10_000); await page.mouse.click(200, 12)
            await page.clock.run_for(1000)
        days = ['2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08']
        for i, k in enumerate(days):
            await study_day(k)
            await page.clock.fast_forward(24*3600_000 - 400_000)
        st = await page.evaluate('window.__cptd.state.streak')
        print('after 5 goal days:', st)
        # 11-09 is now today; skip it entirely, study on 11-10
        await page.clock.fast_forward(24*3600_000)
        home = None
        await page.goto(URL + '#/'); await page.clock.run_for(300)
        home = await page.locator('.streak').text_content()
        print('home streak text on 11-10 before studying:', home.strip())
        await study_day('2026-11-10')
        st2 = await page.evaluate('window.__cptd.state.streak')
        print('after skipping a day with a pass:', st2)
        ok = st['count'] == 5 and st['passes'] == 1 and st2['count'] == 6 and st2['passes'] == 0
        print('PASS busy-day pass earned and used' if ok else 'FAIL pass logic')
        await b.close()
asyncio.run(main())
