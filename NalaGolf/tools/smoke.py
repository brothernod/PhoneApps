"""Headless smoke test for Nala's Bonk Golf.

Usage (from the repo root):
    python3 -m http.server 8765 &        # serve the repo
    python3 NalaGolf/tools/smoke.py [http://localhost:8765/NalaGolf/] [screenshot_dir]

Checks: page loads with the rev stamp, a real drag shot fires, the treat / Stella / Binx
each change the move count, a forced win runs the replay through to the results card,
best scores are saved, and nothing logs a console error.
"""
import sys, json
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/NalaGolf/'
SHOTS = sys.argv[2] if len(sys.argv) > 2 else None
errs, fails = [], []

def check(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

def wait_state(pg, want, ms=8000):
    pg.wait_for_function(f"window.NALA && NALA.state==={json.dumps(want)}", timeout=ms)

def bump_into(pg, kind):
    """Park Nala 40px below an entity and roll her gently into it; return move delta."""
    before = pg.evaluate("NALA.shotsLeft")
    pg.evaluate(f"""(()=>{{ const o=NALA.objs.find(o=>o.ent==='{kind}'); const up=o.y+o.r+28<660; NALA.place(o.x,up?o.y+o.r+28:o.y-o.r-28); NALA.shoot(0,up?-1:1,.25); }})()""")
    wait_state(pg, 'aim')
    return pg.evaluate("NALA.shotsLeft") - (before - 1)   # -1 for the shot itself

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 390, 'height': 760}, device_scale_factor=2)
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(500)
    check('rev ' in pg.inner_text('#card'), 'intro card shows rev stamp')
    if SHOTS: pg.screenshot(path=f'{SHOTS}/1-intro.png')

    for lvl in (0, 1):
        pg.evaluate(f"NALA.loadLevel({lvl}); NALA.start()")
        # real drag: start anywhere, pull back ~60 CSS px (well under the old 150px)
        box = pg.locator('canvas').bounding_box()
        x, y = box['x'] + box['width'] * .5, box['y'] + box['height'] * .55
        pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + 10, y + 60, steps=6)
        if SHOTS and lvl == 0: pg.screenshot(path=f'{SHOTS}/2-aim.png')
        pg.mouse.up()
        check(pg.evaluate("NALA.state") == 'moving' and pg.evaluate("NALA.shotsLeft") == 2, f'L{lvl+1}: drag shot fires')
        wait_state(pg, 'aim')
        pg.evaluate("NALA.newAttempt()")   # fresh try with 3 moves
        check(bump_into(pg, 'treat') == 1, f'L{lvl+1}: treat gives +1')
        check(bump_into(pg, 'stella') == 1, f'L{lvl+1}: Stella gives +1')
        check(bump_into(pg, 'binx') == -1, f'L{lvl+1}: Binx takes 1')
        pg.evaluate("NALA.setMoves(3)")
        check(bump_into(pg, 'stella') == 0, f'L{lvl+1}: Stella only once per try')
        if SHOTS and lvl == 0: pg.screenshot(path=f'{SHOTS}/3-after-bumps.png')
        ev = pg.evaluate("NALA.rec.events.map(e=>e.k)")
        check(all(k in ev for k in ('treat', 'stella', 'binx')), f'L{lvl+1}: replay recorded pickups/smacks')
        pg.evaluate("NALA.forceWin()")
        wait_state(pg, 'recap', 6000)
        pg.wait_for_timeout(1500)
        if SHOTS and lvl == 0: pg.screenshot(path=f'{SHOTS}/4-replay.png')
        check(pg.evaluate("NALA.rp.i") > 30, f'L{lvl+1}: replay is playing (frame %d of %d)' % (pg.evaluate("NALA.rp.i"), pg.evaluate("NALA.rec.frames.length")))
        pg.mouse.click(x, y)   # tap to skip the rest
        pg.wait_for_function("document.querySelector('#card').innerText.toLowerCase().includes('complete')", timeout=20000)
        check('NEW BEST' in pg.inner_text('#card'), f'L{lvl+1}: results card + new best')
        if SHOTS and lvl == 0: pg.screenshot(path=f'{SHOTS}/5-results.png')

    best = pg.evaluate("localStorage.getItem('nalaGolf.best.v1')")
    check(best and 'Bedtime' in best and 'Bone Hunt' in best, 'best scores saved: ' + str(best))
    # Binx takes the LAST move mid-roll: she finishes that roll, then the try ends
    pg.evaluate("NALA.loadLevel(0); NALA.start(); NALA.shoot(1,0,.01)"); wait_state(pg, 'aim')   # 2 left
    pg.evaluate("NALA.objs.forEach(o=>{ if(o.ent==='stella'||o.ent==='treat'){ o.used=o.gone=true; } })")   # nothing can hand the move back
    pg.evaluate("(()=>{ const o=NALA.objs.find(o=>o.ent==='binx'); NALA.place(o.x,o.y+o.r+28); NALA.shoot(0,-1,.25); })()")  # shot → 1
    pg.wait_for_function("NALA.stats.binx===1", timeout=5000)                                  # smack → 0
    check(pg.evaluate("NALA.state") == 'moving' and pg.evaluate("NALA.shotsLeft") == 0, 'Binx took the last move; roll keeps going')
    wait_state(pg, 'fail')
    check(True, 'try ended once the roll stopped')
    b.close()

check(not errs, 'no console errors ' + (json.dumps(errs) if errs else ''))
print('\nPASS' if not fails else f'\n{len(fails)} FAILED')
sys.exit(1 if fails else 0)
