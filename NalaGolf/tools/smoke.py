"""Headless smoke test for Nala's Bonk Golf.

Usage (from the repo root):
    python3 -m http.server 8765 &        # serve the repo
    python3 NalaGolf/tools/smoke.py [http://localhost:8765/NalaGolf/] [screenshot_dir]

Checks: the title screen (dedication, rev stamp, Play), level locks + unlock-all (remembered),
a real drag shot fires on every level, the treat / Stella / Binx each change the move count,
Stella steps aside and her +1 sticks for later tries, a forced win runs the replay through to
the results card, best scores are saved, level 5 rolls the credits with a total-bonks stat, the
mute toggle survives a reload, the PWA manifest + icons load, safe-area insets keep the game
clear of the notch, and nothing logs a console error.
"""
import sys, json, os
from playwright.sync_api import sync_playwright

# Google Fonts: serve local copies if NALA_FONTS points at a folder with audiowide.woff2 /
# space-grotesk-{400,600,700}.woff2 (e.g. from @fontsource), otherwise stub them out so an
# offline sandbox doesn't count the blocked request as a console error.
FONTS = os.environ.get('NALA_FONTS')
def route_fonts(route):
    url = route.request.url
    if 'fonts.googleapis.com' in url:
        css = ''
        if FONTS:
            css = "@font-face{font-family:Audiowide;src:url(https://fonts.gstatic.com/local/audiowide.woff2)}" + ''.join(
                f"@font-face{{font-family:'Space Grotesk';font-weight:{w};src:url(https://fonts.gstatic.com/local/space-grotesk-{w}.woff2)}}" for w in (400, 600, 700))
        return route.fulfill(status=200, content_type='text/css', body=css)
    name = url.rsplit('/', 1)[-1]
    if FONTS and os.path.exists(os.path.join(FONTS, name)):
        return route.fulfill(status=200, content_type='font/woff2', body=open(os.path.join(FONTS, name), 'rb').read())
    return route.fulfill(status=404, body='')

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/NalaGolf/'
SHOTS = sys.argv[2] if len(sys.argv) > 2 else None
errs, fails = [], []

def check(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

def wait_state(pg, want, ms=8000):
    pg.wait_for_function(f"window.NALA && NALA.state==={json.dumps(want)}", timeout=ms)

APPROACH_JS = """(kind)=>{
  // park Nala ~28px from the entity on a side with open floor, aimed straight at it
  const o=NALA.objs.find(o=>o.ent===kind), R=13;
  const free=(x,y)=>NALA.objs.every(q=>{ if(!q.solid||q===o) return true;
    if(q.t==='r'){ const cx=Math.max(q.x,Math.min(x,q.x+q.w)), cy=Math.max(q.y,Math.min(y,q.y+q.h)); return Math.hypot(x-cx,y-cy)>=R+2; }
    return Math.hypot(x-q.x,y-q.y)>=q.r+R+2; });
  const g=L.goal, gx=g.t==='r'?g.x+g.w/2:g.x, gy=g.t==='r'?g.y+g.h/2:g.y, d=o.r+28;
  // prefer the side away from the goal, so a bounce (Binx!) can't fling her into it
  const sides=[[0,1],[0,-1],[1,0],[-1,0]].sort((a,b)=>Math.hypot(o.x+b[0]*d-gx,o.y+b[1]*d-gy)-Math.hypot(o.x+a[0]*d-gx,o.y+a[1]*d-gy));
  for(const [dx,dy] of sides){ const x=o.x+dx*d, y=o.y+dy*d, m={x:o.x+dx*d/2,y:o.y+dy*d/2};
    if(free(x,y)&&free(m.x,m.y)) return {x,y,dx:-dx,dy:-dy}; }
  return null; }"""

def bump_into(pg, kind):
    """Park Nala next to an entity and roll her gently into it; return move delta."""
    before = pg.evaluate("NALA.shotsLeft")
    a = pg.evaluate(APPROACH_JS, kind)
    assert a, f'no open side next to {kind}'
    pg.evaluate(f"NALA.place({a['x']},{a['y']}); NALA.shoot({a['dx']},{a['dy']},.25)")
    wait_state(pg, 'aim')
    return pg.evaluate("NALA.shotsLeft") - (before - 1)   # -1 for the shot itself

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 390, 'height': 760}, device_scale_factor=2)
    pg.route('**/fonts.googleapis.com/**', route_fonts); pg.route('**/fonts.gstatic.com/**', route_fonts)
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'gstatic' not in m.text else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(700)
    card = pg.inner_text('#card')
    check(pg.evaluate("NALA.state") == 'title' and 'Ashley & Corbin' in card and 'Nala, Stella & Binx' in card, 'title screen with dedication')
    check('rev ' in card, 'title card shows rev stamp')
    check(pg.evaluate("getComputedStyle(document.getElementById('hud')).display") == 'none', 'HUD hidden on the title')
    if SHOTS: pg.screenshot(path=f'{SHOTS}/0-title.png')
    pg.click('text=☰ Levels')
    check(pg.locator('.lvl:disabled').count() == 4 and pg.locator('.lvl:enabled').count() == 1, 'fresh save: only level 1 unlocked')
    pg.check('#chkUnlock'); pg.reload(); pg.wait_for_timeout(500); pg.click('text=☰ Levels')
    check(pg.locator('.lvl:disabled').count() == 0, 'unlock-all opens every level and is remembered')
    pg.uncheck('#chkUnlock'); check(pg.locator('.lvl:disabled').count() == 4, 'unlock-all off locks them again')
    pg.click('text=Back'); pg.click('#bPlay')
    check(pg.evaluate("NALA.state") == 'intro' and 'Bedtime' in pg.inner_text('#card'), 'Play starts level 1')
    if SHOTS: pg.screenshot(path=f'{SHOTS}/1-intro.png')

    names = pg.evaluate('LEVELS.map(l=>l.name)')
    for lvl in range(len(names)):
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
        pg.wait_for_timeout(700)
        moved = pg.evaluate("(()=>{ const o=NALA.objs.find(o=>o.ent==='stella'); return {solid:o.solid, d:Math.hypot(o.x-o.hx,o.y-o.hy)}; })()")
        check(not moved['solid'] and moved['d'] > 12, f"L{lvl+1}: Stella stepped aside {moved['d']:.0f}px and stopped blocking")
        check(bump_into(pg, 'binx') == -1, f'L{lvl+1}: Binx takes 1')
        pg.evaluate("NALA.setMoves(3)")
        check(bump_into(pg, 'stella') == 0, f'L{lvl+1}: Stella only once per level')
        if lvl == 0:
            pg.evaluate("NALA.newAttempt()")   # try 3: Stella's +1 sticks, and "learning the house" adds one
            check(pg.evaluate("NALA.attempt") == 3 and pg.evaluate("NALA.shotsLeft") == 5, "try 3 starts with 5 moves (3 + Stella + learning the house)")
            # small clutter: a real hit tips the floor lamp over and she plows on through instead of bouncing
            pg.evaluate("NALA.place(165,236); NALA.shoot(-1,0,.4)")
            wait_state(pg, 'aim')
            lamp = pg.evaluate("NALA.objs.find(o=>o.name==='floor lamp').down")
            check(lamp and pg.evaluate("NALA.dog.x") < 110, 'floor lamp tips over and Nala plows on past it (x=%.0f)' % pg.evaluate("NALA.dog.x"))
            # squeaky toys don't deflect her: she rolls right over (and it squeaks)
            pg.evaluate("NALA.place(200,640); NALA.shoot(0,-1,.25)")
            wait_state(pg, 'aim')
            check(pg.evaluate("NALA.rec.events.some(e=>e.k==='squeak')") and abs(pg.evaluate("NALA.dog.x") - 200) < 2, 'squeaky toy squeaks and does not deflect her')
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
        if lvl == len(names) - 1:
            pg.click('text=The end →'); pg.wait_for_timeout(1500)
            check(pg.evaluate("NALA.state") == 'credits' and pg.evaluate("NALA.cr.y") > 20, 'level 5 rolls the credits')
            if SHOTS: pg.screenshot(path=f'{SHOTS}/6-credits.png')
            total = pg.evaluate("NALA.cr.T.bonks")
            pg.evaluate("NALA.cr.y=NALA.cr.end-1"); pg.wait_for_timeout(600)
            end = pg.inner_text('#card')
            check('Good night' in end and str(total) in end and total > 0, f'end card shows total bonks ({total})')
            check('Captain Nala' in end and pg.evaluate("NALA.loadProg().beat") == 1 and pg.evaluate("NALA.costume()") == 'pirate', 'beating it unlocks + equips Captain Nala')
            if SHOTS: pg.screenshot(path=f'{SHOTS}/7-end.png')
            pg.click('#card button:text-is("Title")'); pg.wait_for_timeout(300)
            check('Round 2' in pg.inner_text('#card') and 'Captain Nala' in pg.inner_text('#cosLine'), 'title shows round 2 + the costume')
            # tap Nala on the title to swap costumes
            box = pg.locator('canvas').bounding_box(); sc = box['width'] / 400
            pg.mouse.click(box['x'] + 200 * sc, box['y'] + 300 * sc); pg.wait_for_timeout(200)
            check(pg.evaluate("NALA.costume()") == 'sniffer' and 'Super Sniffer' in pg.inner_text('#cosLine'), 'tapping Nala swaps the costume')
            pg.click('text=☰ Levels')
            check(pg.locator('.lvl:disabled').count() == 0 and pg.locator('.lvl.done').count() == 0 and 'Round 2' in pg.inner_text('#card'), 'round 2: all levels open, none cleared yet')
            pg.click('text=Back')
            has = pg.evaluate("LEVELS.filter(l=>l.remix&&l.remix.length).length")
            pg.evaluate("NALA.loadLevel(0)")
            moved = pg.evaluate("NALA.objs.filter(o=>!o.ent&&(o.x!==LEVELS[0].objs()[o.id]?.x||o.y!==LEVELS[0].objs()[o.id]?.y)).length")
            check(has == len(names) and pg.evaluate("!!NALA.remix") and moved > 0 and 'Remix' in pg.inner_text('#card'), f'round 2 plays the remix ({moved} things moved; {has}/{len(names)} levels have remixes)')
            pg.evaluate("NALA.goTitle()")

    # mute is remembered across visits
    pg.evaluate("NALA.goTitle()"); pg.click('#bSnd'); pg.reload(); pg.wait_for_timeout(500)
    check(pg.evaluate("NALA.settings.sound") is False and 'Sound off' in (pg.get_attribute('#bSnd','aria-label') or ''), 'mute survives a reload')
    pg.click('#bSnd'); check(pg.evaluate("NALA.settings.sound") is True, 'sound back on')
    # PWA bits
    man = pg.evaluate("fetch('manifest.webmanifest').then(r=>r.json())")
    icons = [i['src'] for i in man['icons']] + ['icons/apple-touch-icon.png', 'icons/favicon-32.png']
    ok = pg.evaluate("(srcs)=>Promise.all(srcs.map(s=>fetch(s).then(r=>r.ok && r.headers.get('content-type').startsWith('image/'))))", icons)
    check(man['display'] == 'standalone' and all(ok), 'manifest + %d icons load' % len(icons))
    check(pg.locator('link[rel=apple-touch-icon]').count() == 1 and 'viewport-fit=cover' in pg.get_attribute('meta[name=viewport]', 'content'), 'apple-touch-icon + viewport-fit=cover')
    # safe areas: fake an iPhone notch + home bar and check the game stays inside them
    pg.add_style_tag(content='#wrap{padding:59px 0 34px 0 !important}'); pg.evaluate("dispatchEvent(new Event('resize'))")
    r = pg.evaluate("(()=>{ const r=document.querySelector('canvas').getBoundingClientRect(), h=document.getElementById('hud'); return {t:r.top,b:r.bottom,ht:parseFloat(h.style.top),vh:innerHeight}; })()")
    check(r['t'] >= 59 - .5 and r['b'] <= r['vh'] - 34 + .5 and abs(r['ht'] - r['t']) < 1, 'canvas + HUD stay inside safe-area insets')
    if SHOTS: pg.screenshot(path=f'{SHOTS}/8-safe-area.png')
    pg.reload(); pg.wait_for_timeout(400)

    best = pg.evaluate("localStorage.getItem('nalaGolf.best.v1')")
    check(best and all(n in best for n in names), 'best scores saved for all %d levels' % len(names))
    # Binx takes the LAST move mid-roll: she finishes that roll, then the try ends
    pg.evaluate("NALA.loadLevel(0); NALA.start(); NALA.shoot(1,0,.01)"); wait_state(pg, 'aim')   # 2 left
    pg.evaluate("NALA.objs.forEach(o=>{ if(o.ent==='stella'||o.ent==='treat'){ o.used=o.gone=true; } })")   # nothing can hand the move back
    a = pg.evaluate(APPROACH_JS, 'binx'); pg.evaluate(f"NALA.place({a['x']},{a['y']}); NALA.shoot({a['dx']},{a['dy']},.25)")  # shot → 1
    pg.wait_for_function("NALA.stats.binx===1", timeout=5000)                                  # smack → 0
    check(pg.evaluate("NALA.state") == 'moving' and pg.evaluate("NALA.shotsLeft") == 0, 'Binx took the last move; roll keeps going')
    wait_state(pg, 'fail')
    check(True, 'try ended once the roll stopped')
    b.close()

check(not errs, 'no console errors ' + (json.dumps(errs) if errs else ''))
print('\nPASS' if not fails else f'\n{len(fails)} FAILED')
sys.exit(1 if fails else 0)
