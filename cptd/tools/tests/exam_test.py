import asyncio, datetime
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
        ctx = await b.new_context(viewport={'width': 412, 'height': 915}, device_scale_factor=2, is_mobile=True, has_touch=True, timezone_id='America/New_York')
        page = await ctx.new_page(); errs=[]
        page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(time=datetime.datetime(2026, 11, 4, 14, 0, 0, tzinfo=datetime.timezone.utc))
        await page.goto('http://127.0.0.1:8765/cptd/#/settings'); await page.clock.run_for(300)
        await page.fill('#examdate', '2026-12-15'); await page.dispatch_event('#examdate', 'change'); await page.clock.run_for(200)
        await page.screenshot(path='shots/30-settings-exam.png')
        await page.goto('http://127.0.0.1:8765/cptd/#/'); await page.clock.run_for(300)
        meta = await page.locator('.hero .meta').text_content()
        print('meta:', meta)
        await page.screenshot(path='shots/31-home-exam.png')
        print('errors:', errs or 'none')
        await b.close()
asyncio.run(main())
