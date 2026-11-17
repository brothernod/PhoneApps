"""Measure how loud each synth sound effect is, so they can be balanced (BAL in audio.js).

Usage (from the repo root, with the server running):
    python3 -m http.server 8765 &
    python3 NalaGolf/tools/loudness.py [--raw]

Each sound is rendered offline at full strength (no compressor, master gain 1, volume ignored)
through a rough loudness weighting (high-pass 60 Hz + a +4 dB shelf above 1.5 kHz, the range
ears and phone speakers favour). It prints the loudest 100 ms window (dB RMS) and the peak.
--raw ignores BAL, to see each recipe before balancing.
"""
import sys, json
from playwright.sync_api import sync_playwright

RAW = '--raw' in sys.argv
JS = """async (raw)=>{
  const out={}, saved=Object.assign({},BAL); if(raw) for(const k of SFX_NAMES) BAL[k]=1;
  settings.sound=true;
  for(const name of SFX_NAMES){
    const sr=48000, oc=new OfflineAudioContext(1,sr*2.5,sr);
    AC=oc; NBUF=null; master=oc.createGain(); master.gain.value=1;
    const hp=oc.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=60;
    const sh=oc.createBiquadFilter(); sh.type='highshelf'; sh.frequency.value=1500; sh.gain.value=4;
    master.connect(hp); hp.connect(sh); sh.connect(oc.destination);
    Math.random=(()=>{ let x=7; return ()=>((x=(x*16807)%2147483647)/2147483647); })();   // repeatable
    sfx(name,1);
    const d=(await oc.startRendering()).getChannelData(0), win=sr/10;
    let peak=0, best=0, acc=0;
    for(let i=0;i<d.length;i++){ const v=d[i]; peak=Math.max(peak,Math.abs(v)); acc+=v*v; if(i>=win){ const o=d[i-win]; acc-=o*o; } if(i>=win-1) best=Math.max(best,acc/win); }
    out[name]={rms:10*Math.log10(best+1e-12), peak:20*Math.log10(peak+1e-12), bal:BAL[name]==null?1:BAL[name]};
  }
  Object.assign(BAL,saved); return out; }"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.route('**/fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
    pg.goto(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'http://localhost:8765/NalaGolf/')
    pg.wait_for_timeout(300)
    res = pg.evaluate(JS, RAW)
    b.close()

ref = res['bonk']['rms']
print(f"{'sound':8} {'loud dB':>8} {'vs bonk':>8} {'peak dB':>8} {'BAL':>6}")
for k, v in res.items():
    print(f"{k:8} {v['rms']:8.1f} {v['rms']-ref:+8.1f} {v['peak']:8.1f} {v['bal']:6.2f}")
