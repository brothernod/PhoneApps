"""Draw the home-screen / PWA icons with the game's own drawNala(), so the icon is the real Nala.

Usage (from the repo root, with the server running):
    python3 -m http.server 8765 &
    python3 NalaGolf/tools/icons.py

Writes NalaGolf/icons/: apple-touch-icon.png (180), icon-192.png, icon-512.png,
icon-maskable-512.png (face kept inside the 80% safe zone) and favicon-32.png.
Look: Super Sniffer (bonk mode, full colour) close up, on the indigo grid inside a magenta sonar ring.
"""
import base64, os, sys
from playwright.sync_api import sync_playwright

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')
JS = """([N,zoom])=>{
  const cv=document.createElement('canvas'); cv.width=cv.height=N; const c=cv.getContext('2d'), u=N/100;
  c.fillStyle='#0b0620'; c.fillRect(0,0,N,N);
  // faint grid
  c.strokeStyle='rgba(42,24,89,.8)'; c.lineWidth=Math.max(1,u*.5); c.beginPath();
  for(let i=-1;i<=8;i++){ const p=N/2+(i-3.5)*13*u*zoom; c.moveTo(p,0); c.lineTo(p,N); c.moveTo(0,p); c.lineTo(N,p); } c.stroke();
  // warm halo + sonar rings around her head
  const g=c.createRadialGradient(N/2,N*.47,0,N/2,N*.47,N*.42*zoom); g.addColorStop(0,'rgba(255,179,107,.35)'); g.addColorStop(1,'rgba(255,120,80,0)');
  c.fillStyle=g; c.fillRect(0,0,N,N);
  for(const [r,a,w] of [[.44,.9,2.2],[.36,.35,1.2]]){ c.beginPath(); c.arc(N/2,N/2,N*r*zoom,0,Math.PI*2);
    c.shadowColor='#ff3df2'; c.shadowBlur=N>64?6*u:0; c.strokeStyle=`rgba(255,61,242,${a})`; c.lineWidth=w*u*zoom; c.stroke(); c.shadowBlur=0; }
  // Nala, head up, zoomed on her face + neck roll + cape collar
  t=1.5;   // a still moment: nose not mid-sniff
  const S=N/48*zoom; c.save(); c.translate(N/2,N/2+6*S); c.scale(S,S);
  drawNala(c,0,0,-Math.PI/2,dogOpts(true,false,{}));
  c.restore();
  return cv.toDataURL('image/png'); }"""

os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.route('**/fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
    pg.goto(sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/NalaGolf/')
    pg.wait_for_timeout(500)
    for name, n, zoom in [('apple-touch-icon.png', 180, 1), ('icon-192.png', 192, 1), ('icon-512.png', 512, 1),
                          ('icon-maskable-512.png', 512, .8), ('favicon-32.png', 32, 1.2)]:
        url = pg.evaluate(JS, [n, zoom])
        open(os.path.join(OUT, name), 'wb').write(base64.b64decode(url.split(',', 1)[1]))
        print('wrote', name)
    b.close()
