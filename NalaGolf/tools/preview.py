"""Level design previews: every level fully lit, with collision shapes outlined.

Usage (from the repo root, with `python3 -m http.server 8765 &` running):
    python3 NalaGolf/tools/preview.py [out_dir] [level numbers…] [--clean] [--remix=K]

Writes <out_dir>/L<n>-lit.png (lights on + red collision outlines, start marker, entities)
and <out_dir>/L<n>-neon.png (the dark bonk view at the start of a try). --clean skips the outlines. --remix=K shows each
level's K-th remix layout (what round K+1 plays).
"""
import sys, os
from playwright.sync_api import sync_playwright

args = [a for a in sys.argv[1:] if not a.startswith('--')]
OUT = args[0] if args else '/tmp/nala-preview'
ONLY = [int(a) - 1 for a in args[1:]]
CLEAN = '--clean' in sys.argv
REMIX = next((int(a.split('=')[1]) for a in sys.argv if a.startswith('--remix=')), 0)
os.makedirs(OUT, exist_ok=True)

PREVIEW_JS = """(dbg)=>{ render=function(){
  ctx.setTransform(scale*dpr,0,0,scale*dpr,0,0); ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  ensureLayers(); drawLit(1,o=>false);
  if(dbg){ ctx.lineWidth=1;
    for(const o of objs){ ctx.strokeStyle=o.knock?'rgba(255,120,0,.9)':o.ent?'rgba(0,140,255,.9)':'rgba(230,0,0,.75)'; shapePath(ctx,o); ctx.stroke(); }
    const g=L.goal; ctx.strokeStyle='rgba(0,170,0,.9)'; ctx.setLineDash([3,2]); ctx.beginPath(); if(g.t==='r') ctx.rect(g.x,g.y,g.w,g.h); else ctx.arc(g.x,g.y,g.r,0,TAU); ctx.stroke(); ctx.setLineDash([]); }
  drawNala(ctx,L.start.x,L.start.y,-Math.PI/2,dogOpts(false,false,{}));
  ctx.fillStyle=C.paper; ctx.fillRect(0,0,W,HUD); ctx.fillStyle=C.ink; ctx.font='15px '+FT; ctx.textAlign='left'; ctx.fillText((lvlIdx+1)+' · '+L.emoji+' '+L.name.toUpperCase(),12,30);
}; }"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 400, 'height': 700}, device_scale_factor=2)
    pg.route('**/fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('http://localhost:8765/NalaGolf/'); pg.wait_for_timeout(400)
    pg.evaluate(f"localStorage.setItem('nalaGolf.prog.v1', JSON.stringify({{beat:{REMIX},lap:{{}}}}))"); pg.reload(); pg.wait_for_timeout(400)
    n = pg.evaluate('LEVELS.length')
    for i in range(n):
        if ONLY and i not in ONLY: continue
        pg.evaluate(f'NALA.loadLevel({i}); NALA.start()'); pg.wait_for_timeout(500)
        pg.screenshot(path=f'{OUT}/L{i+1}-neon.png')
        pg.evaluate('window.__origRender=window.__origRender||render')
        pg.evaluate(PREVIEW_JS, not CLEAN); pg.wait_for_timeout(250)
        tag = f'-r{REMIX}' if REMIX else ''
        pg.screenshot(path=f'{OUT}/L{i+1}{tag}-lit.png')
        pg.evaluate('render=window.__origRender')
        print('wrote', f'{OUT}/L{i+1}{tag}-lit.png')
    pg.evaluate("localStorage.removeItem('nalaGolf.prog.v1')")
    b.close()
    if errs: print('ERRORS:', errs); sys.exit(1)
