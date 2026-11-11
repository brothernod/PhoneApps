# Corgidoku scenes: builds scenes.js (390x844 SVG strings, Sticker style) from the shapes below.
#   python3 tools/scenes.py            -> writes scenes.js
#   python3 tools/scenes.py --svg out  -> also writes out/scene-<id>.svg to check with rsvg-convert
# Landmarks go in the top band (a top corner, clear of the home subtitle and the play-screen clock)
# or the bottom band (under the play-screen buttons), never behind the board. Ported from the art source.
import random, math, json, sys, os
W,H=390,844
f=lambda v: (f'{v:.1f}'.rstrip('0').rstrip('.') if isinstance(v,float) else str(v))
def cloud(x,y,s,fill='#FFFFFF',line='#A9D6EE'):
    cs=[(0,0,22),(24,-10,26),(50,0,20),(26,8,20)]
    a=''.join(f'<circle cx="{f(x+dx*s)}" cy="{f(y+dy*s)}" r="{f(r*s)}" fill="{fill}" stroke="{line}" stroke-width="5"/>' for dx,dy,r in cs)
    b=''.join(f'<circle cx="{f(x+dx*s)}" cy="{f(y+dy*s)}" r="{f(r*s)}" fill="{fill}"/>' for dx,dy,r in cs)
    return a+b
def flower(x,y,c):
    p=''.join(f'<circle cx="{f(x+6*math.cos(k*1.2566))}" cy="{f(y+6*math.sin(k*1.2566))}" r="4.6" fill="{c}" stroke="#5DB466" stroke-width="1.2"/>' for k in range(5))
    return p+f'<circle cx="{x}" cy="{y}" r="3.4" fill="#FFE070"/>'
def tuft(x,y,c='#5DB466'):
    return f'<path d="M{x-6} {y} l3 -9 l3 7 l3 -11 l3 9 l3 -7 l2 11" fill="none" stroke="{c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
def sparkle(x,y,r,c):
    q=lambda a: f(a)
    return f'<path d="M{q(x)} {q(y-r)} Q{q(x+r*.18)} {q(y-r*.18)} {q(x+r)} {q(y)} Q{q(x+r*.18)} {q(y+r*.18)} {q(x)} {q(y+r)} Q{q(x-r*.18)} {q(y+r*.18)} {q(x-r)} {q(y)} Q{q(x-r*.18)} {q(y-r*.18)} {q(x)} {q(y-r)}Z" fill="{c}"/>'
def svg(body): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">{body}</svg>'

LINE='#7A4A22'
def sun(x,y,r,face=True):
    # Sticker sun: rounded rays, flat fill, soft darker outline, a sleepy happy face.
    rays=''.join(f'<path d="M{f(x+(r+8)*math.cos(a))} {f(y+(r+8)*math.sin(a))} L{f(x+(r+17)*math.cos(a))} {f(y+(r+17)*math.sin(a))}" stroke="#F5C53A" stroke-width="9" stroke-linecap="round"/>' for a in [k*math.pi/4+math.pi/8 for k in range(8)])
    b=rays+f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFE26A" stroke="#E9B830" stroke-width="4"/>'
    if face:
        b+=f'<path d="M{x-13} {y-2} q5 -6 10 0 M{x+3} {y-2} q5 -6 10 0" stroke="{LINE}" stroke-width="3" fill="none" stroke-linecap="round"/>'
        b+=f'<path d="M{x-6} {y+8} q6 6 12 0" stroke="{LINE}" stroke-width="3" fill="none" stroke-linecap="round"/>'
        b+=f'<ellipse cx="{x-17}" cy="{y+7}" rx="5" ry="3.2" fill="#FF8FB0" opacity=".55"/><ellipse cx="{x+17}" cy="{y+7}" rx="5" ry="3.2" fill="#FF8FB0" opacity=".55"/>'
    return b

def lawn():
    random.seed(1)
    b=f'<rect width="{W}" height="{H}" fill="#CFEFFF"/>'
    b+=sun(28,78,28)                       # top-left corner: clear of the title, subtitle and the play-screen clock
    b+=cloud(296,150,.72)+cloud(150,208,.62)
    b+='<path d="M0 262 Q90 214 190 252 T390 236 V844 H0Z" fill="#B5E8A8" stroke="#7CC27A" stroke-width="4"/>'
    b+='<path d="M0 312 Q195 282 390 312 V844 H0Z" fill="#8EDB8E" stroke="#5DB466" stroke-width="4"/>'
    for i in range(46):
        x,y=random.randint(10,380),random.randint(330,834)
        b+= flower(x,y,random.choice(['#FF8FC0','#FFFFFF','#C9AEFF'])) if i%3==0 else tuft(x,y)
    # bottom band: a few bigger daisies that peek out under the play-screen buttons
    for x,y,c in [(34,742,'#FFFFFF'),(70,770,'#FF8FC0'),(322,736,'#C9AEFF'),(356,768,'#FFFFFF'),(200,800,'#FF8FC0')]:
        b+=f'<g transform="translate({x} {y}) scale(1.8) translate({-x} {-y})">'+flower(x,y,c)+'</g>'
    return svg(b)

def beach():
    random.seed(2)
    b=f'<rect width="{W}" height="{H}" fill="#C5ECFF"/>'
    b+=sun(358,84,28)                      # top-right corner, under the coin chip
    b+=cloud(18,150,.8)+cloud(214,196,.6)
    b+='<path d="M96 120 q8 -8 16 0 q8 -8 16 0 M246 104 q6 -6 12 0 q6 -6 12 0" fill="none" stroke="#5B6E8A" stroke-width="3" stroke-linecap="round"/>'
    b+='<rect x="-4" y="226" width="398" height="120" fill="#69C3EE" stroke="#3E9CCB" stroke-width="4"/>'
    for y in (252,280,308):
        for x in range(10,390,70):
            b+=f'<path d="M{x+(y%2)*30} {y} q10 -8 20 0 q10 8 20 0" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".8"/>'
    b+='<path d="M0 336 Q24 324 48 336 T96 336 T144 336 T192 336 T240 336 T288 336 T336 336 T384 336 T432 336 V844 H0Z" fill="#FFFFFF"/>'
    b+='<path d="M0 352 Q195 338 390 352 V844 H0Z" fill="#FFE2A6" stroke="#E7B96A" stroke-width="4"/>'
    for i in range(70):
        b+=f'<circle cx="{random.randint(5,385)}" cy="{random.randint(370,840)}" r="{random.choice([1.5,2,2.5])}" fill="#E7B96A" opacity=".7"/>'
    pts=' '.join(f'{f(44+(22 if k%2==0 else 10)*math.cos(k*math.pi/5-math.pi/2))},{f(756+(22 if k%2==0 else 10)*math.sin(k*math.pi/5-math.pi/2))}' for k in range(10))
    b+=f'<polygon points="{pts}" fill="#FF9A7A" stroke="#D9664A" stroke-width="3" stroke-linejoin="round"/>'
    b+='<g transform="translate(336 742)"><circle r="26" fill="#FFFFFF" stroke="#7A4A22" stroke-width="3"/><path d="M0 -26 C15 -13 15 13 0 26 C8 11 8 -11 0 -26Z" fill="#FF6FB5"/><path d="M-26 0 C-13 -15 13 -15 26 0 C11 -6 -11 -6 -26 0Z" fill="#46B3FF"/><path d="M0 -26 C-15 -13 -15 13 0 26 C-8 11 -8 -11 0 -26Z" fill="#FFC93C"/><circle r="26" fill="none" stroke="#7A4A22" stroke-width="3"/></g>'
    b+='<path d="M246 792 q8 -16 16 0 q8 -16 16 0 Z" fill="#FFC6D9" stroke="#D98AA6" stroke-width="2.5" stroke-linejoin="round"/>'
    # a little sandcastle peeking out of the bottom band
    b+='<g stroke="#C99545" stroke-width="3" stroke-linejoin="round" fill="#F7CF86"><path d="M120 812 V780 h10 v-8 h8 v8 h10 v-8 h8 v8 h10 v32 Z"/><path d="M134 758 v-14 h8 v14 Z" fill="#F7CF86"/><path d="M142 744 l14 5 l-14 5 Z" fill="#FF6FB5" stroke="#C93F86" stroke-width="2"/></g>'
    b+='<path d="M146 812 v-12 q6 -8 12 0 v12 Z" fill="#C99545"/>'
    return svg(b)

def lava():
    random.seed(3)
    b=f'<rect width="{W}" height="{H}" fill="#3A1C33"/>'
    for i in range(30):   # faint embers in the night sky
        b+=f'<circle cx="{random.randint(90,390)}" cy="{random.randint(8,250)}" r="{random.choice([1,1.3,1.6])}" fill="#FFB37A" opacity=".45"/>'
    # the volcano: crater in the top-left corner, slope running down behind the screen to the horizon
    b+='<path d="M-60 312 L6 92 Q34 80 62 92 L262 312Z" fill="#5C2D45" stroke="#24101D" stroke-width="4" stroke-linejoin="round"/>'
    b+='<path d="M8 93 Q34 104 60 93 Q34 82 8 93Z" fill="#FFC65A" stroke="#FF8A3D" stroke-width="2"/>'
    b+='<path d="M40 98 C52 130 46 160 70 196 C88 222 96 258 120 312 L140 312 C116 256 108 220 90 192 C70 160 66 128 52 96Z" fill="#FF8A3D" stroke="#FFC65A" stroke-width="3" stroke-linejoin="round"/>'
    # the eruption: lava blobs and sparks above the crater
    for x,y,r in [(22,64,6),(44,54,7),(34,36,5),(58,30,4),(12,40,4),(70,58,4),(28,16,3),(50,10,3)]:
        b+=f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FF8A3D" stroke="#FFC65A" stroke-width="2"/>'
    for i in range(16):
        x,y=random.randint(0,100),random.randint(4,80)
        b+=f'<circle cx="{x}" cy="{y}" r="{random.choice([1.6,2.2])}" fill="{random.choice(["#FFC65A","#FFE29A"])}" opacity=".9"/>'
    b+='<path d="M0 306 Q195 290 390 306 V844 H0Z" fill="#4A2638" stroke="#24101D" stroke-width="4"/>'
    # the lava flow, low enough to show under the play-screen buttons
    b+='<path d="M0 720 C70 690 130 760 200 728 C270 696 330 752 390 724 V790 C330 816 270 764 200 796 C130 828 70 762 0 792Z" fill="#FF8A3D" stroke="#FFC65A" stroke-width="4"/>'
    for x,y,r in [(50,752,8),(140,770,6),(236,748,9),(330,768,7),(100,782,5),(286,780,5)]:
        b+=f'<ellipse cx="{x}" cy="{y}" rx="{f(r*1.6)}" ry="{r}" fill="#FFC65A"/>'
    for x,y in [(40,420),(300,380),(180,520),(250,470),(60,620),(320,610),(110,836),(300,838)]:
        b+=f'<path d="M{x} {y} l14 10 l-6 14 l16 8" fill="none" stroke="#FF8A3D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>'
    for x,y in [(30,360),(350,560),(130,680),(270,672),(360,420),(40,830),(350,826)]:
        b+=f'<path d="M{x-16} {y+8} Q{x-12} {y-10} {x} {y-12} Q{x+14} {y-10} {x+18} {y+8}Z" fill="#6A3A50" stroke="#24101D" stroke-width="3" stroke-linejoin="round"/>'
    return svg(b)

def moon():
    random.seed(4)
    b=f'<rect width="{W}" height="{H}" fill="#1C1A3A"/>'
    for i in range(70):
        b+=f'<circle cx="{random.randint(0,390)}" cy="{random.randint(0,300)}" r="{random.choice([1,1.3,1.8])}" fill="{random.choice(["#FFFFFF","#FFF3B0","#D9CCFF"])}"/>'
    for x,y,r in [(110,26,8),(250,40,7),(330,150,7),(186,196,8),(30,232,7),(372,240,6)]:
        b+=sparkle(x,y,r,'#FFF3B0')
    # Earth in the top-left corner
    b+='<circle cx="32" cy="76" r="34" fill="#5FB0FF" stroke="#2E5E9A" stroke-width="4"/>'
    b+='<g transform="translate(-4 -6)"><path d="M16 70 C24 58 40 62 36 74 C32 84 18 86 16 70Z M42 92 C52 86 64 94 58 106 C50 112 38 106 42 92Z M30 102 C34 100 36 106 32 108 C28 108 28 104 30 102Z" fill="#6BD48F"/><path d="M12 70 C16 60 24 54 32 53" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".6"/></g>'
    b+='<path d="M0 312 Q195 282 390 312 V844 H0Z" fill="#DCD8EC" stroke="#A9A3C6" stroke-width="4"/>'
    for x,y,r in [(50,380,22),(320,350,14),(200,470,30),(90,600,18),(310,620,26),(170,770,24),(350,790,16),(46,760,14),(250,560,10)]:
        b+=f'<ellipse cx="{x}" cy="{y}" rx="{r}" ry="{f(r*.45)}" fill="#C4BEDC" stroke="#A9A3C6" stroke-width="3"/><path d="M{f(x-r*.8)} {f(y+r*.12)} Q{x} {f(y+r*.42)} {f(x+r*.8)} {f(y+r*.12)}" fill="none" stroke="#EFEBFA" stroke-width="2.5" stroke-linecap="round"/>'
    return svg(b)

from scenes import *      # W, H, f, cloud, flower, tuft, sparkle, svg, sun, LINE, random, math

def _mountaintop_edelweiss(x,y,s=1.0):
    # Sticker edelweiss: 7 fat soft-pointed cream petals in one path (paint-order keeps the sage outline on the
    # outside only), a small yellow-green centre.
    d=f'M{f(x)} {f(y)}'
    for k in range(7):
        a=k*2*math.pi/7-math.pi/2
        lx,ly=7.5*s*math.cos(a-.62),7.5*s*math.sin(a-.62); tx,ty=12*s*math.cos(a),12*s*math.sin(a); rx,ry=7.5*s*math.cos(a+.62),7.5*s*math.sin(a+.62)
        d+=f'q{f(round(lx,1))} {f(round(ly,1))} {f(round(tx,1))} {f(round(ty,1))}q{f(round(rx-tx,1))} {f(round(ry-ty,1))} {f(round(-tx,1))} {f(round(-ty,1))}'
    b=f'<path d="{d}" fill="#FFFFFF" stroke="#9DB89A" stroke-width="{f(round(3.2*s,1))}" stroke-linejoin="round" paint-order="stroke"/>'
    b+=f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(round(3.2*s,1))}" fill="#F2DE6E" stroke="#C2B04A" stroke-width="1.2"/>'
    return b

def _mountaintop_rock(x,y,w,h,fill='#C9C2DA',line='#8E86AA'):
    # a chunky rounded boulder sitting on the grass, with a light highlight stroke
    b=f'<path d="M{f(x-w/2)} {y} Q{f(x-w/2)} {f(y-h*.8)} {f(x-w*.12)} {f(y-h)} Q{f(x+w*.35)} {f(y-h*1.02)} {f(x+w/2)} {f(y-h*.35)} Q{f(x+w*.55)} {y} {f(x+w/2)} {y}Z" fill="{fill}" stroke="{line}" stroke-width="3" stroke-linejoin="round"/>'
    b+=f'<path d="M{f(x-w*.32)} {f(y-h*.55)} Q{f(x-w*.22)} {f(y-h*.82)} {f(x)} {f(y-h*.86)}" fill="none" stroke="#EEEAF7" stroke-width="2.5" stroke-linecap="round"/>'
    return b

def mountaintop():
    random.seed(55)
    b=f'<rect width="{W}" height="{H}" fill="#C8ECFF"/>'
    # clouds: kept out of the subtitle/clock lines, small and calm
    b+=cloud(250,128,.62)+cloud(150,214,.5)+cloud(330,200,.48)
    # a couple of little birds gliding
    b+='<path d="M196 150 q6 -6 12 0 q6 -6 12 0 M268 172 q5 -5 10 0 q5 -5 10 0" fill="none" stroke="#6E7FA8" stroke-width="2.6" stroke-linecap="round"/>'
    # distant range, back layer (lavender) then front layer (periwinkle); faceted shading, no snow (that is Snowy peak)
    b+='<path d="M-10 290 L30 238 L62 258 L110 206 L150 246 L196 214 L236 252 L282 196 L320 236 L350 218 L400 262 V300 H-10Z" fill="#C3B6F0" stroke="#9C8ED6" stroke-width="3.5" stroke-linejoin="round"/>'
    for x1,y1,x2,y2,x3,y3 in [(110,206,122,236,96,230),(196,214,206,240,184,236),(282,196,294,226,268,222)]:
        b+=f'<path d="M{x1} {y1} L{x2} {y2} L{x3} {y3}Z" fill="#DCD3FA"/>'
    b+='<path d="M-10 300 L48 252 L92 282 L140 240 L190 276 L240 246 L292 280 L344 244 L400 284 V310 H-10Z" fill="#94A6E6" stroke="#6E7FC4" stroke-width="3.5" stroke-linejoin="round"/>'
    for x1,y1,x2,y2 in [(48,252,40,270),(140,240,134,262),(240,246,234,266),(344,244,336,264)]:
        b+=f'<path d="M{x1} {y1} L{x2} {y2}" stroke="#B7C4F2" stroke-width="3" stroke-linecap="round"/>'
    # LANDMARK: our summit peak in the top-left corner, sloping down behind the screen to the meadow
    b+='<path d="M-20 214 L20 168 L40 150 L56 138 L76 150 L104 176 L130 196 L178 262 L196 300 H-20Z" fill="#B7AFD0" stroke="#7E7598" stroke-width="4" stroke-linejoin="round"/>'
    b+='<path d="M56 138 L52 166 L70 194 L64 230 L84 262 L178 262 L130 196 L104 168 L80 140Z" fill="#A097BE"/>'
    b+='<path d="M26 170 L42 156 L54 152" fill="none" stroke="#E2DCF2" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
    b+='<path d="M12 196 l14 -6 M34 230 l16 -4 M96 210 l14 8" fill="none" stroke="#7E7598" stroke-width="2.5" stroke-linecap="round"/>'
    # green tufts of alpine grass clinging to the peak
    b+='<path d="M-20 252 Q20 236 60 250 Q100 262 140 252 L178 262 L196 300 H-20Z" fill="#9FDB8C" stroke="#68B266" stroke-width="3.5" stroke-linejoin="round"/>'
    # summit flag: pole on the tip, pink pennant with a purple stripe streaming LEFT (away from the subtitle)
    b+='<path d="M56 140 V80" stroke="#7A4A22" stroke-width="4" stroke-linecap="round"/>'
    b+='<circle cx="56" cy="78" r="4.5" fill="#FFD95A" stroke="#D9A82E" stroke-width="2"/>'
    b+='<path d="M54 84 Q30 80 2 92 Q18 100 22 104 Q34 114 54 116Z" fill="#FF8FC0" stroke="#D2589A" stroke-width="3" stroke-linejoin="round"/>'
    b+='<path d="M54 94 Q36 94 18 100 Q36 106 54 106Z" fill="#A98BFF"/>'
    b+='<path d="M54 84 Q30 80 2 92 Q18 100 22 104 Q34 114 54 116Z" fill="none" stroke="#D2589A" stroke-width="3" stroke-linejoin="round"/>'
    b+=sparkle(90,128,7,'#FFE26A')+sparkle(14,140,5,'#FFFFFF')
    # the summit meadow Cheddar sits on: a rounded green crown with rocky edges
    b+='<path d="M0 300 Q100 276 200 290 Q300 302 390 284 V844 H0Z" fill="#B3E59E" stroke="#76C072" stroke-width="4"/>'
    b+='<path d="M0 338 Q195 312 390 336 V844 H0Z" fill="#93D885" stroke="#5DB466" stroke-width="4"/>'
    # scattered pebbles and grass tufts across the meadow (calm texture)
    for i in range(34):
        x,y=random.randint(10,380),random.randint(352,680)
        if i%4==0:
            r=random.choice([4,5,6])
            b+=f'<ellipse cx="{x}" cy="{y}" rx="{r+2}" ry="{r}" fill="#D6D0E6" stroke="#9A92B6" stroke-width="2"/>'
        elif i%4==1:
            b+=_mountaintop_edelweiss(x,y,.6)
        else:
            b+=tuft(x,y)
    for x,y,c in [(36,312,'#FF8FC0'),(338,306,'#C9AEFF'),(300,330,'#FFFFFF')]:
        b+=flower(x,y,c)
    b+=_mountaintop_rock(20,326,40,22)+_mountaintop_rock(372,322,46,26)
    # bottom band: a stone cairn on the right, edelweiss and pink alpine flowers along the bottom
    b+=_mountaintop_rock(312,812,92,40,'#C9C2DA','#8E86AA')
    cairn=[(336,790,58,22,'#D9D2EA'),(334,768,46,18,'#C4BCDA'),(338,749,36,16,'#D9D2EA'),(336,733,24,13,'#C4BCDA')]
    for x,y,w,h,c in cairn:
        b+=f'<ellipse cx="{x}" cy="{y}" rx="{f(w/2)}" ry="{f(h/2)}" fill="{c}" stroke="#7E7598" stroke-width="3"/>'
        b+=f'<path d="M{f(x-w*.3)} {f(y-h*.12)} Q{x-w*.1} {f(y-h*.38)} {f(x+w*.12)} {f(y-h*.36)}" fill="none" stroke="#F1EEF8" stroke-width="2.2" stroke-linecap="round"/>'
    b+='<g transform="translate(336 718)"><path d="M0 8 V-10" stroke="#7A4A22" stroke-width="3" stroke-linecap="round"/><path d="M0 -10 L16 -5 L0 0Z" fill="#A98BFF" stroke="#7357D6" stroke-width="2" stroke-linejoin="round"/></g>'
    for x,y,s in [(40,744,1.6),(84,782,1.35),(24,806,1.2),(166,808,1.3),(236,790,1.1),(262,826,1.4),(370,836,1.1)]:
        b+=_mountaintop_edelweiss(x,y,s)
    for x,y,c in [(118,756,'#FF8FC0'),(206,836,'#C9AEFF'),(60,834,'#FF8FC0'),(198,770,'#FFFFFF')]:
        b+=f'<g transform="translate({x} {y}) scale(1.6) translate({-x} {-y})">'+flower(x,y,c)+'</g>'
    for x,y in [(140,790),(100,822),(220,760),(288,770),(12,770)]:
        b+=tuft(x,y)
    return svg(b)

from scenes import *      # W, H, f, cloud, flower, tuft, sparkle, svg, sun, LINE, random, math

def _ocean_curl(x, y, s=1.0, op='.85'):
    # a little white wave curl: a crest with a curled tip
    return (f'<path d="M{f(x)} {f(y)} q{f(9*s)} {f(-10*s)} {f(20*s)} {f(-4*s)} q{f(-7*s)} {f(-1*s)} {f(-6*s)} {f(4*s)}" '
            f'fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="{op}"/>')

def _ocean_fish(x, y, c, line, s=1.0, flip=False):
    t = f'translate({x} {y}) scale({f(-s) if flip else f(s)} {f(s)})'
    return (f'<g transform="{t}"><path d="M14 0 L26 -9 L24 0 L26 9Z" fill="{c}" stroke="{line}" stroke-width="2.5" stroke-linejoin="round"/>'
            f'<ellipse cx="0" cy="0" rx="16" ry="10" fill="{c}" stroke="{line}" stroke-width="2.5"/>'
            f'<path d="M2 -9 q4 4 0 18" fill="none" stroke="{line}" stroke-width="1.8" opacity=".55"/>'
            f'<circle cx="-8" cy="-2" r="2.2" fill="{LINE}"/><ellipse cx="-6" cy="4" rx="2.6" ry="1.6" fill="#FF8FB0" opacity=".6"/></g>')

def ocean():
    random.seed(13)
    b = f'<rect width="{W}" height="{H}" fill="#D3F1FF"/>'
    # calm light sky: one soft cloud and two far gulls, clear of the title/subtitle/clock
    b += cloud(214, 132, .5)
    b += '<path d="M112 128 q7 -7 14 0 q7 -7 14 0 M262 112 q5 -5 10 0 q5 -5 10 0" fill="none" stroke="#6E7FA8" stroke-width="2.6" stroke-linecap="round"/>'
    # open sea: three soft bands from the horizon down
    b += '<rect x="-4" y="160" width="398" height="700" fill="#8ED8EE" stroke="#5DB6DA" stroke-width="4"/>'
    b += '<path d="M0 232 Q195 220 390 232 V844 H0Z" fill="#74CBE8"/>'
    b += '<path d="M0 420 Q195 404 390 420 V844 H0Z" fill="#62C0E3"/>'
    # landmark, top-left: a striped pink-and-white lighthouse on a little rock at the horizon
    b += '<g transform="translate(40 166) scale(1.15) translate(-40 -166)">'
    b += '<path d="M-6 166 Q2 140 24 140 L58 138 Q78 142 84 166Z" fill="#9AA3C8" stroke="#6B7299" stroke-width="3.5" stroke-linejoin="round"/>'
    b += '<path d="M14 150 q10 -6 20 -2 M52 148 q8 -3 16 2" fill="none" stroke="#C6CCE6" stroke-width="2.5" stroke-linecap="round"/>'
    b += '<path d="M24 142 L30 80 L50 80 L56 142Z" fill="#FFFFFF" stroke="#C25A86" stroke-width="3.5" stroke-linejoin="round"/>'
    b += '<path d="M28.6 95 L51.4 95 L52.8 110 L27.2 110Z M25.8 125 L54.2 125 L55.4 138 L24.6 138Z" fill="#FF7FA8"/>'
    b += '<path d="M24 142 L30 80 L50 80 L56 142Z" fill="none" stroke="#C25A86" stroke-width="3.5" stroke-linejoin="round"/>'
    b += '<path d="M36 142 v-12 q4 -6 8 0 v12Z" fill="#7A4A6A"/>'
    b += '<rect x="24" y="74" width="32" height="7" rx="3" fill="#FF7FA8" stroke="#C25A86" stroke-width="3"/>'
    b += '<rect x="30" y="56" width="20" height="18" rx="3" fill="#FFE26A" stroke="#E9B830" stroke-width="3"/>'
    b += '<path d="M40 57 v16" stroke="#E9B830" stroke-width="2"/>'
    b += '<path d="M27 57 Q40 38 53 57Z" fill="#FF7FA8" stroke="#C25A86" stroke-width="3" stroke-linejoin="round"/>'
    b += '<circle cx="40" cy="42" r="3" fill="#C25A86"/>'
    b += '</g>'
    # a whale tail splashing up out of the far sea, top-right below the clock and right of the home mode pills
    b += '<g transform="translate(28 0)">'
    b += '<path d="M326 166 C330 152 334 146 336 136 C326 136 316 132 312 122 C322 122 332 126 340 132 C348 126 358 122 368 122 C364 132 354 136 344 136 C346 146 350 152 354 166Z" fill="#9C9CEB" stroke="#6464B8" stroke-width="3" stroke-linejoin="round"/>'
    b += '<path d="M318 168 q22 -8 44 0" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/>'
    for x, y, r in [(316, 112, 3.5), (350, 106, 3), (306, 126, 2.5)]:
        b += f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFFFFF" stroke="#5DB6DA" stroke-width="1.5"/>'
    b += '</g>'
    # gentle wave curls on the open water
    for x, y in [(110, 196), (250, 186), (190, 216), (30, 250), (330, 262), (70, 400), (300, 392), (180, 450),
                 (40, 520), (330, 500), (140, 580), (260, 620), (60, 650), (340, 660), (200, 676)]:
        b += _ocean_curl(x, y, random.choice([.8, 1.0, 1.1]))
    # the wooden pier Cheddar sits on: coming in from the left, ending under him on the right
    for px in (18, 104, 190, 276):
        b += f'<ellipse cx="{px+7}" cy="386" rx="18" ry="5" fill="none" stroke="#FFFFFF" stroke-width="2.5" opacity=".8"/>'
        b += f'<rect x="{px}" y="340" width="14" height="46" rx="3" fill="#B97C46" stroke="#7A4A22" stroke-width="3"/>'
    b += '<path d="M-10 350 H294 Q300 350 300 344 V338 H-10Z" fill="#C98F55" stroke="#7A4A22" stroke-width="3.5" stroke-linejoin="round"/>'
    b += '<path d="M-10 300 H292 Q300 300 300 308 V338 H-10Z" fill="#EDBE86" stroke="#7A4A22" stroke-width="3.5" stroke-linejoin="round"/>'
    for sx in range(22, 300, 30):
        b += f'<path d="M{sx} 302 V337" stroke="#C98F55" stroke-width="2.5"/>'
    for nx in range(10, 300, 30):
        b += f'<circle cx="{nx}" cy="306" r="1.6" fill="#A06A38"/><circle cx="{nx}" cy="332" r="1.6" fill="#A06A38"/>'
    # mooring post at the end with a pink life ring
    b += '<rect x="282" y="268" width="16" height="40" rx="4" fill="#B97C46" stroke="#7A4A22" stroke-width="3"/>'
    b += '<path d="M282 280 h16 M282 286 h16" stroke="#7A4A22" stroke-width="2"/>'
    b += '<circle cx="320" cy="324" r="16" fill="none" stroke="#7A4A22" stroke-width="13"/>'
    b += '<circle cx="320" cy="324" r="16" fill="none" stroke="#FF7FA8" stroke-width="8"/>'
    b += '<circle cx="320" cy="324" r="16" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-dasharray="12.57 12.57"/>'
    # bottom band: an underwater cut-away with fish, bubbles, coral and a starfish
    b += '<path d="M0 704 Q24 694 48 704 T96 704 T144 704 T192 704 T240 704 T288 704 T336 704 T384 704 T432 704 V844 H0Z" fill="#44A8D2" stroke="#2E86B4" stroke-width="4"/>'
    b += '<path d="M0 818 Q60 804 130 814 T260 810 T390 816 V844 H0Z" fill="#FFE2A6" stroke="#E7B96A" stroke-width="4"/>'
    for i in range(14):
        b += f'<circle cx="{random.randint(6,384)}" cy="{random.randint(826,842)}" r="{random.choice([1.5,2])}" fill="#E7B96A"/>'
    # coral, bottom-left
    b += '<path d="M40 822 C38 800 30 792 22 782 M40 808 C46 794 56 790 60 774 M38 798 C36 786 40 776 38 764" fill="none" stroke="#C25A86" stroke-width="12" stroke-linecap="round"/>'
    b += '<path d="M40 822 C38 800 30 792 22 782 M40 808 C46 794 56 790 60 774 M38 798 C36 786 40 776 38 764" fill="none" stroke="#FF8FB8" stroke-width="7" stroke-linecap="round"/>'
    # seaweed, right
    b += '<path d="M362 820 C352 800 372 786 360 764 C352 750 366 740 360 726 M376 820 C370 806 384 796 378 780" fill="none" stroke="#3E9A6E" stroke-width="7" stroke-linecap="round"/>'
    b += '<path d="M362 820 C352 800 372 786 360 764 C352 750 366 740 360 726 M376 820 C370 806 384 796 378 780" fill="none" stroke="#6FCF8E" stroke-width="3.5" stroke-linecap="round"/>'
    # starfish on the sand
    pts = ' '.join(f'{f(270+(17 if k%2==0 else 8)*math.cos(k*math.pi/5-math.pi/2))},{f(818+(17 if k%2==0 else 8)*math.sin(k*math.pi/5-math.pi/2))}' for k in range(10))
    b += f'<polygon points="{pts}" fill="#FF9A7A" stroke="#D9664A" stroke-width="3" stroke-linejoin="round"/>'
    b += '<circle cx="270" cy="818" r="2" fill="#FFE2A6"/>'
    # fish
    b += _ocean_fish(118, 752, '#FFD45E', '#D9A12E', 1.0)
    b += _ocean_fish(230, 782, '#FF8FB8', '#C25A86', .9, flip=True)
    b += _ocean_fish(310, 744, '#C9AEFF', '#8A6CD0', .75)
    # bubbles
    for x, y, r in [(92, 734, 4), (84, 720, 2.6), (196, 760, 3), (206, 744, 2.2), (300, 790, 3.5), (150, 800, 2.5)]:
        b += f'<circle cx="{x}" cy="{y}" r="{r}" fill="#BFEFFF" stroke="#FFFFFF" stroke-width="1.5" opacity=".9"/>'
    return svg(b)

from scenes import *      # W, H, f, cloud, flower, tuft, sparkle, svg, sun, LINE, random, math

def _autumn_blob(cs, fill, line, sw=5):
    # cloud-style crown: outlined circles first, then the fills on top so only the outer edge keeps a line
    a = ''.join(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="{fill}" stroke="{line}" stroke-width="{sw}"/>' for x, y, r in cs)
    b = ''.join(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="{fill}"/>' for x, y, r in cs)
    return a + b

def _autumn_leaf(x, y, s, rot, c, line, op=1):
    # almond leaf with a midrib and a tiny stem
    o = f' opacity="{op}"' if op != 1 else ''
    return (f'<g transform="translate({f(x)} {f(y)}) rotate({rot}) scale({f(s)})"{o}>'
            f'<path d="M0 -10 Q9 -2 0 10 Q-9 -2 0 -10Z" fill="{c}" stroke="{line}" stroke-width="2" stroke-linejoin="round"/>'
            f'<path d="M0 -6 V13" stroke="{line}" stroke-width="1.6" stroke-linecap="round"/></g>')

def _autumn_pumpkin(x, y, s):
    g = f'<g transform="translate({x} {y}) scale({f(s)})" stroke="#C9602A" stroke-width="3" stroke-linejoin="round">'
    g += '<path d="M2 -20 q2 -10 9 -12" fill="none" stroke="#6E8A3A" stroke-width="5" stroke-linecap="round"/>'
    g += '<ellipse cx="-12" cy="0" rx="14" ry="19" fill="#FF9A45"/><ellipse cx="12" cy="0" rx="14" ry="19" fill="#FF9A45"/>'
    g += '<ellipse cx="0" cy="0" rx="13" ry="20" fill="#FFA955"/>'
    g += '<path d="M10 -22 q12 -6 14 4" fill="none" stroke="#7FA346" stroke-width="2.5" stroke-linecap="round"/>'
    g += '</g>'
    return g

def _autumn_toadstool(x, y, s):
    g = f'<g transform="translate({x} {y}) scale({f(s)})" stroke-linejoin="round">'
    g += '<path d="M-7 0 q-2 -14 1 -20 h12 q3 6 1 20Z" fill="#FFF3E2" stroke="#D9B28A" stroke-width="3"/>'
    g += '<path d="M-22 -16 Q-20 -40 0 -40 Q20 -40 22 -16 Q0 -10 -22 -16Z" fill="#F2706A" stroke="#C94B4E" stroke-width="3"/>'
    g += '<circle cx="-9" cy="-27" r="4" fill="#FFF3E2"/><circle cx="6" cy="-33" r="3" fill="#FFF3E2"/><circle cx="12" cy="-21" r="3.4" fill="#FFF3E2"/><circle cx="-14" cy="-19" r="2.2" fill="#FFF3E2"/>'
    g += '</g>'
    return g

def _autumn_acorn(x, y, rot=0):
    return (f'<g transform="translate({x} {y}) rotate({rot})" stroke-linejoin="round">'
            '<path d="M-7 -2 Q-7 12 0 14 Q7 12 7 -2Z" fill="#E7A55A" stroke="#A86A2E" stroke-width="2.4"/>'
            '<path d="M-9 -1 Q-9 -10 0 -10 Q9 -10 9 -1Z" fill="#9C6A3E" stroke="#6E4422" stroke-width="2.4"/>'
            '<path d="M0 -10 l1 -5" stroke="#6E4422" stroke-width="2.4" stroke-linecap="round"/></g>')

def _autumn_hedgehog(x, y, s=1.0):
    # a hedgehog peeking out of the top of the leaf pile, looking right: spiky dome + cream face
    g = f'<g transform="translate({x} {y}) scale({f(s)})" stroke-linejoin="round">'
    pts = []
    for k in range(15):
        a = math.pi + k * math.pi * .78 / 14
        r = 30 if k % 2 == 0 else 22
        pts.append(f'{f(-4 + r*math.cos(a))},{f(8 + r*.9*math.sin(a))}')
    g += f'<path d="M-36 12 L{" L".join(pts)} L22 -10 Q30 4 26 14Z" fill="#A9785A" stroke="#6B4530" stroke-width="3"/>'
    g += '<path d="M6 -14 Q30 -16 42 4 Q36 16 10 14 Q0 0 6 -14Z" fill="#F7E0C4" stroke="#C99A72" stroke-width="3"/>'
    g += '<circle cx="42" cy="3" r="4.2" fill="#4A2E2A"/>'
    g += '<circle cx="24" cy="-3" r="3.6" fill="#4A2E2A"/><circle cx="25.2" cy="-4.4" r="1.2" fill="#FFFFFF"/>'
    g += '<ellipse cx="20" cy="7" rx="5" ry="3" fill="#FF8FB0" opacity=".65"/>'
    g += '<path d="M30 6 q4 3 8 0" fill="none" stroke="#6B4530" stroke-width="2" stroke-linecap="round"/>'
    g += '<circle cx="11" cy="-13" r="5" fill="#F7E0C4" stroke="#C99A72" stroke-width="2.4"/>'
    g += '</g>'
    return g

def autumn():
    random.seed(41)
    b = f'<rect width="{W}" height="{H}" fill="#FFEEDC"/>'
    # soft cream clouds, kept low and away from the subtitle band
    b += cloud(120, 196, .58, '#FFF8EE', '#F3D3B6')
    # distant forest: a row of small rounded trees along the horizon, muted
    back = [(-6, 262, 26, '#F7C48F'), (36, 252, 22, '#F3B0A0'), (78, 258, 24, '#F6D08A'), (128, 250, 20, '#F7C48F'),
            (176, 256, 24, '#F3B0A0'), (226, 248, 22, '#F6D08A'), (274, 256, 24, '#F7C48F'), (318, 252, 20, '#F3B0A0'),
            (360, 260, 26, '#F6D08A'), (398, 254, 22, '#F7C48F')]
    for x, y, r, c in back:
        b += f'<rect x="{x-3}" y="{y}" width="6" height="30" rx="3" fill="#D9A78A"/>'
        b += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" stroke="#E3A57E" stroke-width="3"/>'
    # forest floor
    b += '<path d="M0 286 Q100 268 200 280 T390 274 V844 H0Z" fill="#F8CB94" stroke="#E2A066" stroke-width="4"/>'
    b += '<path d="M0 326 Q195 300 390 326 V844 H0Z" fill="#F4B77C" stroke="#DB9358" stroke-width="4"/>'

    # left framing tree: a rosy crown cropped by the left edge, trunk down to the ground
    b += '<path d="M-6 330 V150 q12 -10 24 0 V330Z" fill="#B47A55" stroke="#875535" stroke-width="4" stroke-linejoin="round"/>'
    b += _autumn_blob([(4, 128, 34), (-12, 164, 30), (26, 156, 26), (8, 186, 22)], '#F59486', '#D5655E')
    b += '<path d="M10 110 q8 -4 14 2" fill="none" stroke="#FFC9BE" stroke-width="4" stroke-linecap="round"/>'

    # the landmark: a big orange tree crown in the top-right corner, trunk running down the right edge
    b += '<path d="M352 334 C356 280 352 220 344 150 L392 140 V334Z" fill="#B47A55" stroke="#875535" stroke-width="4" stroke-linejoin="round"/>'
    b += '<path d="M350 214 q-14 -10 -24 -26" fill="none" stroke="#875535" stroke-width="7" stroke-linecap="round"/>'
    b += '<path d="M350 214 q-14 -10 -24 -26" fill="none" stroke="#B47A55" stroke-width="3" stroke-linecap="round"/>'
    crown = [(360, 70, 46), (318, 104, 34), (380, 128, 40), (340, 140, 30), (390, 30, 40), (330, 46, 28), (312, 182, 17), (326, 176, 14)]
    b += _autumn_blob(crown, '#FFA24C', '#DE7430')
    # warm patches inside the crown (gold and red) so it reads as autumn even tiny
    for x, y, sc, r, c, l in [(372, 112, 1.2, 30, '#FFD25A', '#D99A2A'), (344, 130, 1.1, -40, '#F47B60', '#C94B4E'),
                              (320, 122, 1.1, 60, '#FFD25A', '#D99A2A'), (382, 150, 1.1, -10, '#F47B60', '#C94B4E'),
                              (348, 100, 1, 100, '#F47B60', '#C94B4E'), (336, 30, 1, -60, '#FFD25A', '#D99A2A')]:
        b += _autumn_leaf(x, y, sc, r, c, l)
    b += '<path d="M300 104 q5 -9 16 -10 M310 34 q6 -8 16 -6" fill="none" stroke="#FFD9A8" stroke-width="4" stroke-linecap="round"/>'

    # a few falling leaves in the sky (sparse, clear of the subtitle and clock)
    for x, y, s, r, c, l in [(286, 166, 1.1, 30, '#FF9A45', '#C9602A'), (62, 230, 1, -40, '#F6C64A', '#C99A2A'),
                             (232, 212, .9, 70, '#F2706A', '#C94B4E'), (300, 234, .9, -20, '#F6C64A', '#C99A2A'),
                             (40, 108, .85, 50, '#FF9A45', '#C9602A')]:
        b += _autumn_leaf(x, y, s, r, c, l)

    # leaves scattered on the forest floor: soft in the middle, fuller lower down
    cols = [('#FF9A45', '#D8722F'), ('#F6C64A', '#CF9E2C'), ('#F2706A', '#C94B4E'), ('#E98A4E', '#B9602C')]
    for i in range(36):
        x, y = random.randint(8, 382), random.randint(346, 836)
        c, l = random.choice(cols)
        op = .55 if y < 690 else .95
        b += _autumn_leaf(x, y, random.choice([.8, .9, 1]), random.randint(0, 359), c, l, op)

    # bottom band: pumpkins (left), leaf pile with a hedgehog (middle-right), toadstools (right), acorns
    b += _autumn_pumpkin(48, 772, 1.3) + _autumn_pumpkin(96, 796, .85)
    b += _autumn_blob([(196, 814, 40), (240, 806, 34)], '#F28C3E', '#C9602A')
    b += _autumn_hedgehog(214, 782, 1.1)
    b += _autumn_blob([(160, 828, 28), (206, 838, 34), (262, 826, 32)], '#F28C3E', '#C9602A')
    for x, y, s, r, c, l in [(170, 812, 1.2, 20, '#F6C64A', '#CF9E2C'), (226, 818, 1.3, -30, '#F2706A', '#C94B4E'),
                             (262, 808, 1.2, 60, '#FF9A45', '#B9602C'), (240, 812, 1.1, 120, '#F6C64A', '#CF9E2C'),
                             (172, 816, 1.1, -70, '#F2706A', '#C94B4E'), (282, 808, 1, 30, '#E98A4E', '#B9602C'),
                             (204, 820, 1.1, 80, '#FF9A45', '#B9602C')]:
        b += _autumn_leaf(x, y, s, r, c, l)
    b += _autumn_toadstool(336, 774, 1.15) + _autumn_toadstool(366, 790, .75)
    b += _autumn_acorn(130, 770, -15) + _autumn_acorn(310, 812, 20) + _autumn_acorn(24, 820, 10)
    return svg(b)

from scenes import *      # W, H, f, cloud, flower, tuft, sparkle, svg, sun, LINE, random, math

def _snowy_flake(x,y,r,c='#FFFFFF',line='#9DB8DE'):
    # Sticker snowflake: 3 crossing bars (6 arms) with a soft blue outline drawn under a white core
    d=''.join(f'M{f(round(x+r*math.cos(a),1))} {f(round(y+r*math.sin(a),1))}L{f(round(x-r*math.cos(a),1))} {f(round(y-r*math.sin(a),1))}' for a in (math.pi/2,math.pi/2+math.pi/3,math.pi/2-math.pi/3))
    return f'<path d="{d}" stroke="{line}" stroke-width="{f(round(r*.55+2.2,1))}" stroke-linecap="round"/><path d="{d}" stroke="{c}" stroke-width="{f(round(r*.55,1))}" stroke-linecap="round"/>'

def _snowy_pine(x,y,h,fill='#7FB8B4',line='#4E8C8C'):
    # a snowy pine: three stacked rounded tiers with white snow caps, small brown trunk
    w=h*.62
    b=f'<rect x="{f(x-h*.06)}" y="{f(y-h*.12)}" width="{f(h*.12)}" height="{f(h*.14)}" fill="#A07050" stroke="#6E4A30" stroke-width="2.5"/>'
    for k in range(3):
        ty=y-h*.1-k*h*.27; tw=w*(1-k*.24); th=h*.42
        b+=f'<path d="M{f(x-tw/2)} {f(ty)} Q{f(x)} {f(ty+th*.12)} {f(x+tw/2)} {f(ty)} L{f(x+tw*.08)} {f(ty-th)} Q{f(x)} {f(ty-th-4)} {f(x-tw*.08)} {f(ty-th)}Z" fill="{fill}" stroke="{line}" stroke-width="3" stroke-linejoin="round"/>'
        sy=ty-th*.55
        b+=f'<path d="M{f(x-tw*.27)} {f(sy)} L{f(x-tw*.06)} {f(ty-th+1)} Q{f(x)} {f(ty-th-4)} {f(x+tw*.06)} {f(ty-th+1)} L{f(x+tw*.27)} {f(sy)} Q{f(x+tw*.18)} {f(sy+5)} {f(x+tw*.1)} {f(sy)} Q{f(x)} {f(sy+6)} {f(x-tw*.1)} {f(sy)} Q{f(x-tw*.18)} {f(sy+5)} {f(x-tw*.27)} {f(sy)}Z" fill="#FFFFFF" stroke="#A9C2E2" stroke-width="2" stroke-linejoin="round"/>'
    return b

def _snowy_paw(x,y,a,c='#D3E1F4'):
    # a little corgi paw print pressed into the snow, rotated to the walking direction
    return f'<g transform="translate({x} {y}) rotate({a})" fill="{c}"><ellipse cx="0" cy="2" rx="4.2" ry="3.6"/><circle cx="-4.4" cy="-3.2" r="1.7"/><circle cx="-1.5" cy="-5.4" r="1.7"/><circle cx="1.5" cy="-5.4" r="1.7"/><circle cx="4.4" cy="-3.2" r="1.7"/></g>'

def snowy():
    random.seed(68)
    b=f'<rect width="{W}" height="{H}" fill="#CFE6FA"/>'
    # distant snowy range along the horizon, soft periwinkle with white caps
    b+='<path d="M-10 296 L34 232 L66 258 L112 208 L160 262 L196 240 L240 282 V300 H-10Z" fill="#C4CDF2" stroke="#97A2D8" stroke-width="3.5" stroke-linejoin="round"/>'
    for x,y,d in [(34,232,'M24 246 L34 232 L46 249 L40 246 L34 252 L29 247Z'),(112,208,'M98 228 L112 208 L127 229 L119 225 L112 232 L105 225Z')]:
        b+=f'<path d="{d}" fill="#FFFFFF" stroke="#97A2D8" stroke-width="2.5" stroke-linejoin="round"/>'
    # LANDMARK: the big snow-capped peak in the top-right corner, its long left slope running down to the snowfield
    b+='<path d="M70 300 L150 232 L212 186 L276 150 L322 104 L352 14 L366 34 L400 56 V300Z" fill="#B6C3EC" stroke="#7F8FC8" stroke-width="4" stroke-linejoin="round"/>'
    # lavender shadow face on the right of the ridge
    b+='<path d="M352 14 L360 52 L350 96 L364 140 L360 190 L384 250 L400 300 V56 L366 34Z" fill="#A497DA"/>'
    b+='<path d="M196 214 l18 -6 M150 262 l20 -4 M244 190 l14 6" fill="none" stroke="#8E9DCF" stroke-width="2.5" stroke-linecap="round"/>'
    # snowcap with soft drips; pale lavender shadow on its right half
    cap='M298 128 L322 104 L352 14 L366 34 L400 56 V162 Q390 150 380 160 Q372 132 360 140 Q350 112 338 124 Q328 108 316 124 Q308 114 298 128Z'
    b+=f'<path d="{cap}" fill="#FFFFFF" stroke="#8FA4D2" stroke-width="3.5" stroke-linejoin="round"/>'
    b+='<path d="M352 16 L360 52 L350 96 L360 140 Q372 132 380 160 Q390 150 400 162 V56 L366 34Z" fill="#DFD8F6"/>'
    b+=f'<path d="{cap}" fill="none" stroke="#8FA4D2" stroke-width="3.5" stroke-linejoin="round"/>'
    b+='<path d="M328 96 L342 50 M334 110 L342 90" stroke="#E9F3FF" stroke-width="3" stroke-linecap="round"/>'
    b+='<path d="M350 32 L346 44" stroke="#D3E3F7" stroke-width="3" stroke-linecap="round"/>'
    b+=sparkle(256,64,6,'#FFFFFF')+sparkle(372,104,5,'#FFFFFF')
    # sparse, gentle snowflakes (kept off the subtitle line, the clock and the centre title)
    for x,y,r in [(26,112,5),(84,150,4),(40,196,3.5),(118,124,3.5),(176,138,4.5),(222,104,3),(270,176,3.5),(96,46,3)]:
        b+=_snowy_flake(x,y,r)
    for x,y in [(150,112),(58,140),(240,150),(16,160)]:
        b+=f'<circle cx="{x}" cy="{y}" r="2" fill="#FFFFFF"/>'
    # tiny frosty pines on the far left of the horizon
    for x,y,h in [(14,300,44),(44,302,34),(358,306,40)]:
        b+=_snowy_pine(x,y,h,'#93C2C4','#5F9A9E')
    # the snowfield Cheddar sits on: two soft white drifts with ice-blue outlines
    b+='<path d="M0 292 Q100 274 210 292 Q300 306 390 290 V844 H0Z" fill="#F4F8FF" stroke="#A9C2E2" stroke-width="4"/>'
    b+='<path d="M0 330 Q195 304 390 330 V844 H0Z" fill="#FFFFFF" stroke="#B4CBE8" stroke-width="4"/>'
    # soft blue drift shadows and a few lavender-blue hollows (calm texture across the middle)
    for x,y,w in [(60,372,70),(300,360,60),(190,430,90),(60,500,60),(320,520,80),(150,600,70),(280,650,60),(40,640,50)]:
        b+=f'<path d="M{x-w/2} {y} Q{x} {y-12} {x+w/2} {y} Q{x} {y-4} {x-w/2} {y}Z" fill="#DCE9F8"/>'
    for i in range(16):
        x,y=random.randint(14,376),random.randint(360,680)
        b+=f'<circle cx="{x}" cy="{y}" r="{random.choice([1.6,2,2.4])}" fill="#C7D9F1"/>'
    for x,y,r in [(30,420,3.5),(350,450,4),(240,560,3),(100,560,3.5),(370,610,3)]:
        b+=_snowy_flake(x,y,r)
    b+=sparkle(120,400,5,'#C9B8F5')+sparkle(266,480,4,'#C9B8F5')+sparkle(200,660,4.5,'#C9B8F5')
    # a trail of corgi paw prints wandering through the snow (very soft, calm texture)
    for i,(x,y) in enumerate([(116,680),(132,662),(148,640),(170,626),(184,604),(206,590),(218,566),(240,552),(248,528),(270,514),(272,490),(292,476)]):
        b+=_snowy_paw(x+(4 if i%2 else -4),y,40-i*4)
    # little snow mounds flanking Cheddar
    for x,y,w,h in [(24,344,52,18),(366,340,56,20)]:
        b+=f'<path d="M{x-w/2} {y} Q{x-w/2} {y-h} {x} {y-h} Q{x+w/2} {y-h} {x+w/2} {y}Z" fill="#FFFFFF" stroke="#B4CBE8" stroke-width="3" stroke-linejoin="round"/>'
        b+=f'<path d="M{x-w*.3} {y-2} Q{x} {y-h*.5} {x+w*.36} {y-2}" fill="none" stroke="#DCE9F8" stroke-width="4" stroke-linecap="round"/>'
    # bottom band: drift shadow, snowy pines on the right, a snowman with a pink scarf on the left, a sled peeking out
    b+='<path d="M0 760 Q100 736 200 756 Q300 776 390 748 V844 H0Z" fill="#E9F2FC"/>'
    b+=_snowy_pine(372,830,128)+_snowy_pine(318,840,100)
    # snowman shadow
    b+='<ellipse cx="78" cy="830" rx="50" ry="9" fill="#D4E3F6"/>'
    b+='<circle cx="78" cy="796" r="34" fill="#FFFFFF" stroke="#9DB8DE" stroke-width="4"/>'
    b+='<circle cx="78" cy="750" r="24" fill="#FFFFFF" stroke="#9DB8DE" stroke-width="4"/>'
    b+='<path d="M56 742 L30 724 M36 728 L28 734 M100 744 L124 726 M117 731 L126 736" stroke="#8A5A3A" stroke-width="3.5" stroke-linecap="round"/>'
    b+='<circle cx="78" cy="714" r="19" fill="#FFFFFF" stroke="#9DB8DE" stroke-width="4"/>'
    b+='<circle cx="78" cy="750" r="24" fill="none"/>'
    # scarf: pink band with a stripe and a tail hanging down
    b+='<path d="M60 728 Q78 738 96 728 L97 736 Q78 746 59 736Z" fill="#FF8FC0" stroke="#D2589A" stroke-width="2.5" stroke-linejoin="round"/>'
    b+='<path d="M86 736 L90 762 L100 760 L95 733Z" fill="#FF8FC0" stroke="#D2589A" stroke-width="2.5" stroke-linejoin="round"/>'
    b+='<path d="M88 748 L97 747 M89 755 L98 754" stroke="#FFFFFF" stroke-width="2"/>'
    # lavender beanie with a pink pompom
    b+='<path d="M60 708 Q60 688 78 688 Q96 688 96 708Z" fill="#B79CFF" stroke="#7F62D6" stroke-width="2.5" stroke-linejoin="round"/>'
    b+='<rect x="58" y="703" width="40" height="8" rx="4" fill="#C9B4FF" stroke="#7F62D6" stroke-width="2.5"/>'
    b+='<circle cx="78" cy="686" r="6" fill="#FF8FC0" stroke="#D2589A" stroke-width="2.5"/>'
    # face: coal eyes, carrot nose, smile, cheeks
    b+='<circle cx="71" cy="716" r="2.6" fill="#3D2550"/><circle cx="85" cy="716" r="2.6" fill="#3D2550"/>'
    b+='<path d="M78 720 L92 723 L78 725Z" fill="#FFA24A" stroke="#E07A22" stroke-width="1.5" stroke-linejoin="round"/>'
    b+='<path d="M72 727 q6 4 12 0" stroke="#3D2550" stroke-width="2" fill="none" stroke-linecap="round"/>'
    b+='<ellipse cx="66" cy="722" rx="3.6" ry="2.4" fill="#FF8FB0" opacity=".6"/><ellipse cx="90" cy="722" rx="3.6" ry="2.4" fill="#FF8FB0" opacity=".6"/>'
    for y in (756,770,792):
        b+=f'<circle cx="78" cy="{y}" r="2.8" fill="#3D2550"/>'
    # a pink sled peeking out at the bottom, rope trailing
    b+='<g stroke-linejoin="round" stroke-linecap="round">'
    b+='<path d="M162 812 H232 Q246 812 246 798" fill="none" stroke="#7F62D6" stroke-width="4"/>'
    b+='<path d="M172 812 V802 M226 812 V802" stroke="#7F62D6" stroke-width="3.5"/>'
    b+='<rect x="164" y="786" width="72" height="16" rx="6" fill="#FF8FC0" stroke="#D2589A" stroke-width="3"/>'
    b+='<path d="M172 794 H228" stroke="#FFD0E4" stroke-width="3"/>'
    b+='<path d="M164 794 Q148 794 146 812 Q140 826 128 822" fill="none" stroke="#C99545" stroke-width="2.5"/>'
    b+='</g>'
    # snow on the sled and around the props
    b+='<path d="M168 788 Q186 778 200 786 Q214 778 232 788Z" fill="#FFFFFF" stroke="#B4CBE8" stroke-width="2"/>'
    for x,y,r in [(150,730,4),(250,716,3.5),(206,760,3),(20,776,3.5),(280,800,3)]:
        b+=_snowy_flake(x,y,r)
    return svg(b)

from scenes import *      # W, H, f, cloud, flower, tuft, sparkle, svg, sun, LINE, random, math

def _night_crescent(cx, cy, R, dx, dy, r1):
    # Crescent = outer circle minus an offset "bite" circle, as one closed path (so the outline follows both edges).
    d = math.hypot(dx, dy); ux, uy = dx / d, dy / d
    a = (R * R - r1 * r1 + d * d) / (2 * d); h = math.sqrt(R * R - a * a)
    px, py = cx + a * ux, cy + a * uy
    x1, y1 = px - h * uy, py + h * ux
    x2, y2 = px + h * uy, py - h * ux
    return (f'M{f(x1)} {f(y1)} A{R} {R} 0 1 1 {f(x2)} {f(y2)} '
            f'A{r1} {r1} 0 0 0 {f(x1)} {f(y1)}Z')

def _night_firefly(x, y, s=1.0):
    return (f'<circle cx="{x}" cy="{y}" r="{f(7*s)}" fill="#E8FF8A" opacity=".18"/>'
            f'<circle cx="{x}" cy="{y}" r="{f(2.6*s)}" fill="#F2FFB0"/>')

def night():
    random.seed(21)
    b = f'<rect width="{W}" height="{H}" fill="#1D2152"/>'
    b += '<path d="M0 190 Q195 172 390 190 V844 H0Z" fill="#242A62"/>'          # soft lighter band toward the horizon
    # tiny star dots across the sky (only tiny ones near the title/subtitle/clock)
    for i in range(80):
        x, y = random.randint(0, 390), random.randint(0, 270)
        calm = (y < 110 and 60 < x < 330) or (x > 290 and 50 < y < 95)
        r = 1 if calm else random.choice([1, 1.3, 1.7])
        b += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{random.choice(["#FFFFFF", "#FFF3B0", "#D9CCFF"])}" opacity="{".55" if calm else ".9"}"/>'
    for x, y, r in [(104, 150, 6), (34, 196, 7), (352, 228, 6), (112, 238, 5), (292, 128, 5)]:
        b += sparkle(x, y, r, '#FFF3B0')
    # the big sleepy crescent moon, top-left corner
    b += f'<path d="{_night_crescent(20, 72, 40, 26, -24, 30)}" fill="#FFE89A" stroke="#E2B44E" stroke-width="4" stroke-linejoin="round"/>'
    b += f'<path d="M5 81 q6 7 12 0" stroke="{LINE}" stroke-width="3" fill="none" stroke-linecap="round"/>'      # closed sleepy eye
    b += f'<path d="M18 97 q5 4 10 -2" stroke="{LINE}" stroke-width="3" fill="none" stroke-linecap="round"/>'     # little smile
    b += '<ellipse cx="7" cy="93" rx="5" ry="3.2" fill="#FF8FB0" opacity=".6"/>'
    # shooting star to the right of Cheddar
    b += '<path d="M307.7 179.6 L378 142 L304.3 172.4Z" fill="#FFF3B0" opacity=".45"/>'
    b += '<path d="M306.8 177.8 L348 157 L305.2 174.2Z" fill="#FFF3B0" opacity=".8"/>'
    b += sparkle(304, 177, 10, '#FFE89A')
    # distant indigo hills, then the grassy teal hill Cheddar sits on
    b += '<path d="M0 262 Q70 236 140 258 T280 252 T390 246 V844 H0Z" fill="#2E3A78" stroke="#1A2050" stroke-width="4"/>'
    b += '<path d="M0 322 Q100 288 200 300 T390 312 V844 H0Z" fill="#2C6470" stroke="#1B4250" stroke-width="4"/>'
    b += '<path d="M0 560 Q120 530 230 552 T390 546 V844 H0Z" fill="#275A66" stroke="#1B4250" stroke-width="4"/>'
    for i in range(26):
        x, y = random.randint(10, 380), random.randint(340, 830)
        b += tuft(x, y, '#3F8288')
    # fireflies drifting over the hill
    for x, y in [(52, 300), (338, 286), (70, 420), (322, 400), (188, 470), (40, 612), (350, 600), (150, 650), (262, 690), (118, 712)]:
        b += _night_firefly(x, y)
    # bottom band: a cozy little tent with a glowing doorway and a lantern, and a campfire
    b += '<ellipse cx="300" cy="792" rx="78" ry="10" fill="#1B4250" opacity=".6"/>'
    b += '<path d="M232 792 L300 702 L368 792Z" fill="#C98BE8" stroke="#6E3E92" stroke-width="4" stroke-linejoin="round"/>'
    b += '<path d="M300 702 L282 792 M300 702 L318 792" stroke="#6E3E92" stroke-width="3"/>'
    b += '<path d="M282 792 L300 730 L318 792Z" fill="#FFD36E" stroke="#E2A23A" stroke-width="3" stroke-linejoin="round"/>'
    b += '<path d="M300 704 V680" stroke="#6E3E92" stroke-width="3" stroke-linecap="round"/>'
    b += '<path d="M301 680 l18 6 l-18 6Z" fill="#FF8FC0" stroke="#C94F8A" stroke-width="2" stroke-linejoin="round"/>'
    b += '<path d="M244 776 l-10 -8 M356 776 l10 -8" stroke="#6E3E92" stroke-width="2.5" stroke-linecap="round"/>'
    # lantern beside the tent
    b += '<circle cx="216" cy="774" r="18" fill="#FFD36E" opacity=".22"/>'
    b += '<path d="M209 766 h14 v16 h-14Z" fill="#FFE89A" stroke="#C98A2E" stroke-width="2.5" stroke-linejoin="round"/>'
    b += '<path d="M207 766 h18 l-3 -5 h-12Z M207 782 h18 v4 h-18Z" fill="#6E3E92" stroke="#4A2766" stroke-width="2" stroke-linejoin="round"/>'
    b += '<path d="M211 761 q5 -8 10 0" fill="none" stroke="#4A2766" stroke-width="2"/>'
    # campfire on the left
    b += '<circle cx="70" cy="772" r="40" fill="#FFB35A" opacity=".16"/>'
    b += '<path d="M40 790 L100 776 M40 776 L100 790" stroke="#8A5530" stroke-width="9" stroke-linecap="round"/>'
    b += '<path d="M40 790 L100 776 M40 776 L100 790" stroke="#B57A45" stroke-width="5" stroke-linecap="round"/>'
    b += '<path d="M70 736 C84 752 90 764 84 776 Q70 786 56 776 C50 764 58 754 62 746 C64 756 68 758 70 736Z" fill="#FF8A3D" stroke="#E2572E" stroke-width="3" stroke-linejoin="round"/>'
    b += '<path d="M70 754 C78 764 78 772 70 778 C62 772 64 764 70 754Z" fill="#FFE070"/>'
    for x, y in [(56, 728), (86, 722), (74, 708)]:
        b += f'<circle cx="{x}" cy="{y}" r="2" fill="#FFC65A"/>'
    for x, y in [(34, 794), (52, 800), (72, 802), (92, 800), (108, 794)]:   # little stone ring
        b += f'<ellipse cx="{x}" cy="{y}" rx="10" ry="6" fill="#5A6E92" stroke="#2E3A60" stroke-width="3"/>'
    return svg(b)

from scenes import *      # W, H, f, cloud, flower, tuft, sparkle, svg, sun, LINE, random, math

def _aurora_ribbon(d, c, core, w=26):
    # a glowing light ribbon: wide soft band, narrower brighter band, thin bright core line
    return (f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" opacity=".22"/>'
            f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{f(w*.5)}" stroke-linecap="round" opacity=".45"/>'
            f'<path d="{d}" fill="none" stroke="{core}" stroke-width="3.5" stroke-linecap="round" opacity=".9"/>')

def _aurora_pine(x, y, s, c='#151634', line='#0B0B22'):
    # a dark pine silhouette, three stacked tiers, base at (x, y)
    p = ''
    for k, (ty, hw) in enumerate([(0, 18), (-16, 14), (-30, 10)]):
        p += f'M{f(x-hw*s)} {f(y+ty*s)} L{f(x)} {f(y+(ty-26)*s)} L{f(x+hw*s)} {f(y+ty*s)}Z '
    return (f'<rect x="{f(x-2.5*s)}" y="{f(y-2*s)}" width="{f(5*s)}" height="{f(9*s)}" fill="{line}"/>'
            f'<path d="{p}" fill="{c}" stroke="{line}" stroke-width="3" stroke-linejoin="round"/>')

def aurora():
    random.seed(40)
    b = f'<rect width="{W}" height="{H}" fill="#17163A"/>'
    b += '<path d="M0 180 Q195 160 390 180 V320 H0Z" fill="#1D1D48"/>'   # slightly lighter haze near the horizon
    # tiny stars, kept out of the title / subtitle / clock band
    for i in range(60):
        x, y = random.randint(0, 390), random.randint(4, 270)
        if 60 < x < 330 and y < 104: continue
        if x > 290 and 52 < y < 92: continue
        b += f'<circle cx="{x}" cy="{y}" r="{random.choice([.9,1.2,1.5])}" fill="{random.choice(["#FFFFFF","#D9CCFF","#BFF5E6"])}" opacity=".8"/>'
    # aurora curtains: wavy bands that glow at the bottom edge and fade upward (one gradient per hue)
    b += ('<defs><linearGradient id="auroraG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3EE6B0" stop-opacity="0"/>'
          '<stop offset=".7" stop-color="#3EE6B0" stop-opacity=".32"/><stop offset="1" stop-color="#7CFFD0" stop-opacity=".6"/></linearGradient>'
          '<linearGradient id="auroraP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C77CFF" stop-opacity=".15"/>'
          '<stop offset="1" stop-color="#FF7FC8" stop-opacity=".6"/></linearGradient></defs>')
    b += '<path d="M-10 130 C60 100 150 120 210 104 C270 90 330 116 400 98 V150 C320 176 260 140 200 160 C140 182 70 136 -10 172 Z" fill="url(#auroraG)"/>'
    b += '<path d="M-10 172 C70 136 140 182 200 160 C260 140 320 176 400 150" fill="none" stroke="#9CFFD8" stroke-width="3" stroke-linecap="round" opacity=".7"/>'
    b += '<path d="M-10 186 C70 166 150 198 230 176 C290 160 340 178 400 168 V196 C340 204 290 186 230 204 C150 226 70 196 -10 214 Z" fill="url(#auroraG)" opacity=".7"/>'
    for x in range(50, 390, 18):   # faint rays in the green curtain
        y1 = 160 + 12 * math.sin(x / 34)
        b += f'<path d="M{x} {f(y1)} v-{random.randint(22,40)}" stroke="#9CFFD8" stroke-width="5" stroke-linecap="round" opacity=".12"/>'
    # pink / violet curtain tucked into the top-right corner, right of the bar title and above the clock
    b += '<path d="M314 -4 H400 V40 C384 52 368 36 352 48 C340 56 334 40 328 22 C324 12 318 4 314 -4Z" fill="url(#auroraP)"/>'
    b += '<path d="M400 40 C384 52 368 36 352 48 C340 56 334 40 328 22" fill="none" stroke="#FFC4E6" stroke-width="3" stroke-linecap="round" opacity=".85"/>'
    # a faint pink ribbon running along the very top edge from the swirl, above the bar title
    b += _aurora_ribbon('M44 4 C90 14 130 2 180 8 C230 14 270 4 330 -2', '#FF8FD0', '#FFD1EC', 12)
    # landmark, top-left: the brightest aurora swirl, a ribbon rising up the left edge and spiralling into the corner
    pts = [(0, 168), (2, 132), (4, 104)]
    t0, t1, r0, r1 = .62 * math.pi, 3.5 * math.pi, 46, 10
    for k in range(44):
        u = k / 43
        t = t0 + (t1 - t0) * u
        r = r0 - (r0 - r1) * u
        pts.append((26 + r * math.cos(t), 30 + r * math.sin(t)))
    sw = f'M{f(round(pts[0][0],1))} {f(round(pts[0][1],1))}'
    for (x0, y0), (x1, y1) in zip(pts[1:-1], pts[2:]):
        sw += f' Q{f(round(x0,1))} {f(round(y0,1))} {f(round((x0+x1)/2,1))} {f(round((y0+y1)/2,1))}'
    sw += f' L{f(round(pts[-1][0],1))} {f(round(pts[-1][1],1))}'
    b += f'<path d="{sw}" fill="none" stroke="#3EE6B0" stroke-width="34" stroke-linecap="round" opacity=".2"/>'
    b += f'<path d="{sw}" fill="none" stroke="#3EE6B0" stroke-width="20" stroke-linecap="round" opacity=".55"/>'
    b += f'<path d="{sw}" fill="none" stroke="#9CFFD8" stroke-width="9" stroke-linecap="round" opacity=".9"/>'
    b += f'<path d="{sw}" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>'
    for x, y, r in [(62, 8, 4.5), (14, 176, 4.5)]:
        b += sparkle(x, y, r, '#E9FFF6')
    # pine silhouettes on the far horizon, at the sides (clear of Cheddar)
    for x, y, s in [(8, 292, 1.1), (34, 288, 1.4), (62, 296, .95), (94, 300, .8), (300, 300, .8), (328, 292, 1.05), (356, 286, 1.45), (384, 294, 1.1)]:
        b += _aurora_pine(x, y, s)
    # dark snowy ground: lavender-blue snow, a lighter drift where Cheddar sits
    b += '<path d="M0 300 Q100 278 200 294 T390 290 V844 H0Z" fill="#4A4C88" stroke="#2C2D5E" stroke-width="4"/>'
    b += '<path d="M0 332 Q195 304 390 330 V844 H0Z" fill="#5A5E9E" stroke="#3B3D74" stroke-width="4"/>'
    b += '<path d="M110 318 Q195 300 280 318 Q195 334 110 318Z" fill="#7C80BE"/>'   # moonlit drift under Cheddar
    for y0, c in [(470, '#53578F'), (610, '#4E5289')]:
        b += f'<path d="M0 {y0} Q100 {y0-20} 200 {y0} T390 {y0-6} V844 H0Z" fill="{c}"/>'
    for x, y, w in [(70, 420, 50), (300, 470, 44), (120, 560, 60), (290, 640, 50), (60, 720, 40), (190, 760, 46)]:
        b += f'<path d="M{x-w} {y} Q{x} {y-14} {x+w} {y}" fill="none" stroke="#7478B4" stroke-width="3" stroke-linecap="round" opacity=".7"/>'
    # snow glints on the ground
    for i in range(46):
        x, y = random.randint(6, 384), random.randint(344, 836)
        b += f'<circle cx="{x}" cy="{y}" r="{random.choice([1.2,1.6,2])}" fill="{random.choice(["#C9CCFF","#B8FFE6","#FFFFFF"])}" opacity=".55"/>'
    for x, y in [(60, 390), (330, 420), (40, 560), (350, 590), (190, 640)]:
        b += sparkle(x, y, 4, '#D6DAFF')
    # mid-ground small pines
    b += _aurora_pine(26, 690, 1.3, '#23244E', '#121331') + _aurora_pine(364, 676, 1.2, '#23244E', '#121331')
    # bottom band, right: a little log cabin with a warm window and snowy roof, chimney smoke
    b += '<g stroke-linejoin="round">'
    b += '<rect x="292" y="728" width="14" height="36" fill="#7E4A32" stroke="#5E3424" stroke-width="3"/><rect x="289" y="724" width="20" height="7" rx="3.5" fill="#E6E8FF" stroke="#9EA2D8" stroke-width="2.5"/>'
    for i, (x, y, r) in enumerate([(302, 712, 6), (310, 696, 7.5), (302, 678, 9)]):
        b += f'<circle cx="{x}" cy="{y}" r="{r}" fill="#8A88C0" opacity="{[".55",".4",".28"][i]}"/>'
    b += '<path d="M262 816 V770 H362 V816Z" fill="#A86A4A" stroke="#5E3424" stroke-width="3.5"/>'
    for y in (782, 794, 806):
        b += f'<path d="M264 {y} H360" stroke="#7E4A32" stroke-width="2.5"/>'
    b += '<path d="M250 774 L312 730 L374 774 Q312 784 250 774Z" fill="#E6E8FF" stroke="#9EA2D8" stroke-width="3.5"/>'
    b += '<rect x="280" y="782" width="26" height="22" rx="3" fill="#FFD36A" stroke="#5E3424" stroke-width="3"/>'
    b += '<path d="M293 783 V803 M281 793 H305" stroke="#E79A3A" stroke-width="2.5"/>'
    b += '<path d="M322 816 V788 Q332 780 342 788 V816Z" fill="#6E3E2A" stroke="#5E3424" stroke-width="3"/>'
    b += '<circle cx="337" cy="802" r="1.8" fill="#FFD36A"/>'
    b += '<path d="M244 818 Q312 806 380 818 Q312 830 244 818Z" fill="#E6E8FF" stroke="#9EA2D8" stroke-width="3"/>'
    b += '</g>'
    # bottom band, left: a white arctic fox sitting in the snow, bushy tail curled round its paws
    b += '<g transform="translate(96 788)" stroke="#8E92C8" stroke-width="3" stroke-linejoin="round" fill="#FFFFFF">'
    b += '<path d="M6 20 C26 26 44 16 46 -2 C48 -18 40 -30 34 -30 C24 -24 22 -4 6 6Z"/>'    # big bushy tail behind
    b += '<path d="M-16 22 C-20 6 -14 -6 0 -8 C14 -6 20 6 16 22Z"/>'                          # body
    b += '<path d="M-18 -16 L-16 -40 L-3 -26Z M18 -16 L16 -40 L3 -26Z"/>'                    # ears
    b += '<path d="M-14.5 -20 L-14 -33 L-7 -26Z M14.5 -20 L14 -33 L7 -26Z" fill="#FFB8D8" stroke="none"/>'
    b += '<path d="M-22 -14 Q-10 -32 0 -28 Q10 -32 22 -14 L16 -10 Q8 -2 0 4 Q-8 -2 -16 -10Z"/>'   # head with cheek ruff and pointy chin
    b += '<path d="M-12 22 q0 -8 6 -8 q6 0 6 8Z M0 22 q0 -8 6 -8 q6 0 6 8Z" stroke-width="2.5"/>'   # front paws
    b += '</g>'
    b += f'<g transform="translate(96 788)"><circle cx="-7" cy="-14" r="2.4" fill="{LINE}"/><circle cx="7" cy="-14" r="2.4" fill="{LINE}"/>'
    b += f'<path d="M-2.5 -5 h5 l-2.5 3Z" fill="{LINE}"/>'
    b += '<ellipse cx="-12" cy="-8" rx="3.2" ry="2" fill="#FF8FB0" opacity=".6"/><ellipse cx="12" cy="-8" rx="3.2" ry="2" fill="#FF8FB0" opacity=".6"/></g>'
    b += '<path d="M56 812 Q110 800 164 812 Q110 824 56 812Z" fill="#E6E8FF" stroke="#9EA2D8" stroke-width="3"/>'   # snow mound under the fox
    return svg(b)

from scenes import *      # W, H, f, cloud, flower, tuft, sparkle, svg, sun, LINE, random, math

ROCK_LINE = '#B5543A'

def _canyon_striped(pid, d, base, bands, line=ROCK_LINE, sw=4):
    # a rock shape filled with soft horizontal stripe bands (clipped to the shape), outlined on top
    # bands: list of (y, height, color, wobble)
    g = f'<clipPath id="{pid}"><path d="{d}"/></clipPath><path d="{d}" fill="{base}"/><g clip-path="url(#{pid})">'
    for y, h, c, wob in bands:
        g += (f'<path d="M-40 {y} Q60 {y-wob} 200 {y} T440 {y} V{y+h} Q340 {y+h+wob} 200 {y+h} T-40 {y+h}Z" fill="{c}"/>')
    g += f'</g><path d="{d}" fill="none" stroke="{line}" stroke-width="{sw}" stroke-linejoin="round"/>'
    return g

def _canyon_cactus(x, y, s=1.0):
    # chibi saguaro with a pink flower and a sleepy smile; (x, y) = base of the trunk
    G, L, R = '#7CC48A', '#3F8A57', '#A8DDB0'
    g = f'<g transform="translate({x} {y}) scale({f(s)})" stroke-linecap="round" stroke-linejoin="round">'
    arms = 'M-13 -58 H-30 Q-38 -58 -38 -66 V-88 M13 -76 H28 Q36 -76 36 -84 V-104'
    g += f'<path d="{arms}" fill="none" stroke="{L}" stroke-width="22"/>'
    g += '<rect x="-17" y="-128" width="34" height="132" rx="17" fill="%s" stroke="%s" stroke-width="4"/>' % (G, L)
    g += f'<path d="{arms}" fill="none" stroke="{G}" stroke-width="14"/>'
    g += f'<path d="M-6 -112 V-8 M6 -112 V-8 M-38 -86 V-70 M36 -102 V-86" fill="none" stroke="{R}" stroke-width="2.4"/>'
    for sx, sy in [(-14, -100), (14, -90), (-14, -40), (14, -30), (-14, -70), (14, -56)]:
        g += f'<path d="M{sx} {sy} l{-4 if sx < 0 else 4} -2" stroke="#FFF3D6" stroke-width="2"/>'
    # face
    g += f'<path d="M-9 -84 q3 -4 6 0 M3 -84 q3 -4 6 0" fill="none" stroke="{LINE}" stroke-width="2.6"/>'
    g += f'<path d="M-3 -76 q3 3 6 0" fill="none" stroke="{LINE}" stroke-width="2.4"/>'
    g += '<ellipse cx="-11" cy="-77" rx="3.6" ry="2.4" fill="#FF8FB0" opacity=".7"/><ellipse cx="11" cy="-77" rx="3.6" ry="2.4" fill="#FF8FB0" opacity=".7"/>'
    # flower on top
    for k in range(5):
        a = k * 1.2566 - math.pi / 2
        g += f'<circle cx="{f(6 + 6*math.cos(a))}" cy="{f(-130 + 6*math.sin(a))}" r="5" fill="#FF8FC0" stroke="#D9558E" stroke-width="1.6"/>'
    g += '<circle cx="6" cy="-130" r="3.6" fill="#FFE070"/>'
    g += '</g>'
    return g

def _canyon_tumbleweed(x, y, r):
    g = f'<circle cx="{x}" cy="{y}" r="{r}" fill="#F2CE94" stroke="#B9844A" stroke-width="3.5"/>'
    rnd = random.Random(5)
    p = ''
    for k in range(11):
        cx, cy = x + rnd.uniform(-.45, .45) * r, y + rnd.uniform(-.45, .45) * r
        rx, ry = rnd.uniform(.25, .5) * r, rnd.uniform(.15, .35) * r
        p += f'M{f(cx - rx)} {f(cy)} a{f(rx)} {f(ry)} {rnd.randint(0,179)} 1 1 {f(2*rx)} 0 a{f(rx)} {f(ry)} 0 0 1 {f(-rx*1.4)} {f(ry*.6)} '
    g += f'<path d="{p}" fill="none" stroke="#B9844A" stroke-width="2" opacity=".85"/>'
    return g

def _canyon_lizard(x, y):
    # a little gecko peeking over a rock, looking left; (x, y) = top of the rock
    g = '<g stroke-linejoin="round" stroke-linecap="round">'
    g += f'<path d="M{x+30} {y+6} q22 -8 26 -28 q2 -8 -4 -8" fill="none" stroke="#3F8A57" stroke-width="9"/>'
    g += f'<path d="M{x+30} {y+6} q22 -8 26 -28 q2 -8 -4 -8" fill="none" stroke="#9AD78E" stroke-width="4"/>'
    g += f'<ellipse cx="{x+6}" cy="{y-2}" rx="22" ry="13" fill="#9AD78E" stroke="#3F8A57" stroke-width="3.2"/>'
    g += f'<circle cx="{x-2}" cy="{y-8}" r="4.4" fill="#4A2E2A"/><circle cx="{x-0.6}" cy="{y-9.4}" r="1.5" fill="#FFFFFF"/>'
    g += f'<circle cx="{x+12}" cy="{y-8}" r="4.4" fill="#4A2E2A"/><circle cx="{x+13.4}" cy="{y-9.4}" r="1.5" fill="#FFFFFF"/>'
    g += f'<ellipse cx="{x-10}" cy="{y}" rx="3.8" ry="2.4" fill="#FF8FB0" opacity=".7"/>'
    g += f'<path d="M{x+2} {y+2} q3 3 6 0" fill="none" stroke="#3F8A57" stroke-width="2"/>'
    g += f'<circle cx="{x+20}" cy="{y-4}" r="2" fill="#FFE070"/><circle cx="{x+24}" cy="{y+2}" r="1.6" fill="#FFE070"/>'
    g += '</g>'
    # the rock in front of the lizard's body
    g += _canyon_striped('cyRock', f'M{x-30} {y+40} Q{x-32} {y+6} {x-6} {y+4} Q{x+30} {y} {x+48} {y+14} Q{x+60} {y+30} {x+56} {y+40}Z',
                         '#E7845A', [(y+22, 6, '#F3A276', 3)], sw=3.5)
    # little front paws on the rock
    g += f'<path d="M{x-10} {y+5} q2 5 6 1 M{x+14} {y+5} q2 5 6 1" fill="#9AD78E" stroke="#3F8A57" stroke-width="2.4" stroke-linecap="round"/>'
    return g

def _canyon_pebble(x, y, r, c, l):
    return f'<ellipse cx="{x}" cy="{y}" rx="{f(r*1.4)}" ry="{r}" fill="{c}" stroke="{l}" stroke-width="2.4"/>'

def canyon():
    random.seed(77)
    b = f'<rect width="{W}" height="{H}" fill="#FFE7D2"/>'
    # a paler band near the horizon so the rock pops
    b += '<rect y="196" width="390" height="110" fill="#FFF1E3"/>'
    # small cute sun in the top-right corner (behind the coin chip, clear of the clock)
    b += '<g transform="translate(354 30) scale(.62) translate(-354 -30)">' + sun(354, 30, 28) + '</g>'
    b += cloud(150, 182, .5, '#FFFBF5', '#F4CDB0') + cloud(318, 214, .42, '#FFFBF5', '#F4CDB0')

    # far mesas along the horizon: pale and soft
    far = 'M-10 300 V246 h20 l8 -18 h62 l10 18 h18 V300Z M150 300 V258 l10 -10 h44 l8 10 h14 V300Z M266 300 V236 l10 -14 h70 l8 14 h12 l10 12 h30 V300Z'
    b += _canyon_striped('cyFar', far, '#F7BE9E', [(250, 6, '#FAD3BA', 2), (270, 5, '#F2AC8A', 2)], line='#E39A7A', sw=3)

    # mid canyon wall on the right, stepping down to the sand
    mid = 'M248 304 Q250 280 270 276 L292 274 Q296 252 314 250 L340 248 Q344 226 360 222 L398 220 V304Z'
    b += _canyon_striped('cyMid', mid, '#EE9A6E', [(232, 7, '#F6B88E', 2), (256, 8, '#DD7F57', 2), (284, 6, '#F6B88E', 2)], line='#C9673F', sw=4)

    # a little natural arch worn through the right wall
    b += '<path d="M326 304 V282 Q326 258 346 258 Q366 258 366 282 V304Z" fill="#FFF1E3" stroke="#C9673F" stroke-width="4" stroke-linejoin="round"/>'
    b += '<path d="M332 268 q6 -6 14 -6" fill="none" stroke="#F6B88E" stroke-width="3" stroke-linecap="round"/>'

    # the landmark: a tall striped butte in the top-left corner, with a little balanced rock and cactus on top
    butte = 'M-24 306 L-10 62 Q-8 42 10 42 L50 42 Q64 42 65 58 L68 140 Q70 156 86 160 L108 164 Q122 168 122 184 L128 306Z'
    b += _canyon_striped('cyButte', butte, '#E7845A',
                         [(60, 10, '#F3A276', 3), (84, 7, '#D0613F', 2), (104, 12, '#F7C69E', 3), (132, 8, '#D0613F', 2),
                          (154, 12, '#F3A276', 3), (186, 7, '#D0613F', 2), (212, 12, '#F7C69E', 3), (244, 8, '#D0613F', 2),
                          (268, 12, '#F3A276', 3)], sw=4.5)
    b += '<path d="M8 50 H46" stroke="#FFD2B0" stroke-width="4" stroke-linecap="round"/>'
    # balanced rock on top
    b += '<path d="M30 42 l2 -8 h8 l2 8Z" fill="#D0613F" stroke="#B5543A" stroke-width="3" stroke-linejoin="round"/>'
    b += '<ellipse cx="36" cy="26" rx="16" ry="10" fill="#EE9A6E" stroke="#B5543A" stroke-width="3.5"/>'
    b += '<path d="M26 22 q6 -5 14 -4" fill="none" stroke="#FFD2B0" stroke-width="3" stroke-linecap="round"/>'
    # tiny cactus on the butte top
    b += '<path d="M56 42 V24 M50 36 v-6 M62 32 v-6" stroke="#3F8A57" stroke-width="9" stroke-linecap="round"/>'
    b += '<path d="M56 42 V24 M50 36 v-6 M62 32 v-6 M50 36 h6 M62 32 h-6" stroke="#7CC48A" stroke-width="4.5" stroke-linecap="round"/>'

    # sandy ground
    b += '<path d="M0 296 Q100 284 200 294 T390 290 V844 H0Z" fill="#F8C08C" stroke="#E0965E" stroke-width="4"/>'
    b += '<path d="M0 372 Q195 350 390 372 V844 H0Z" fill="#F6B07A" stroke="#E0965E" stroke-width="3" stroke-opacity=".6"/>'
    # wind ripples and sand specks (soft), pebbles
    for x, y in [(40, 330), (300, 318), (90, 420), (270, 452), (180, 540), (50, 600), (330, 590), (220, 660), (120, 500), (340, 380)]:
        b += f'<path d="M{x-16} {y} q8 -5 16 0 q8 5 16 0" fill="none" stroke="#E0965E" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>'
    for i in range(60):
        b += f'<circle cx="{random.randint(5,385)}" cy="{random.randint(310,840)}" r="{random.choice([1.4,1.8,2.2])}" fill="#E0965E" opacity=".45"/>'
    for x, y, r in [(70, 352, 4), (316, 344, 3.5), (30, 470, 4.5), (360, 500, 4), (150, 620, 3.5), (290, 560, 3), (200, 400, 3)]:
        b += _canyon_pebble(x, y, r, '#E7845A', '#B5543A')
    for x, y in [(110, 334), (276, 336), (350, 440), (40, 540), (250, 610)]:
        b += tuft(x, y, '#B7A15A')

    # bottom band: saguaro (left), tumbleweed (middle), lizard on a rock (right), pebbles
    b += f'<ellipse cx="62" cy="826" rx="40" ry="9" fill="#E0965E" opacity=".5"/>'
    b += _canyon_cactus(62, 824, 1.0)
    b += f'<ellipse cx="198" cy="818" rx="30" ry="6" fill="#E0965E" opacity=".5"/>'
    b += _canyon_tumbleweed(198, 790, 27)
    b += '<path d="M150 796 h-18 M156 784 h-26 M152 808 h-14" stroke="#E0965E" stroke-width="3" stroke-linecap="round" opacity=".8"/>'
    b += _canyon_lizard(318, 778)
    for x, y, r, c, l in [(118, 828, 6, '#F3A276', '#B5543A'), (138, 838, 4, '#D0613F', '#9E4630'), (256, 832, 5, '#F3A276', '#B5543A'),
                          (372, 836, 5, '#D0613F', '#9E4630'), (112, 798, 4, '#F3A276', '#B5543A'), (262, 736, 3.5, '#E7845A', '#B5543A')]:
        b += _canyon_pebble(x, y, r, c, l)
    b += flower(140, 742, '#FF8FC0') + flower(280, 812, '#FFFFFF')
    return svg(b)

from scenes import *      # W, H, f, cloud, flower, tuft, sparkle, svg, sun, LINE, random, math

def _clouds_r(v): return f(round(v,1))

def _clouds_balloon(cx,cy,r,base='#FF9EC8',stripe='#B58CF0',line='#9A5FC0',face=True,basket=True):
    # Sticker hot-air balloon: teardrop envelope with curved gores (meridian beziers), soft outline, ropes and a wicker basket.
    q=_clouds_r
    top=(cx,cy-r)
    def mer(t):  # one meridian from the crown to the mouth of the envelope, t in [-1,1]
        return (cx+t*1.0*r,cy-r),(cx+t*1.3*r,cy+.55*r),(cx+t*.3*r,cy+1.2*r)
    env=(f'M{q(cx-r)} {q(cy)} A{q(r)} {q(r)} 0 0 1 {q(cx+r)} {q(cy)} C{q(cx+r)} {q(cy+.6*r)} {q(cx+.35*r)} {q(cy+1.05*r)} {q(cx+.3*r)} {q(cy+1.2*r)}'
         f' L{q(cx-.3*r)} {q(cy+1.2*r)} C{q(cx-.35*r)} {q(cy+1.05*r)} {q(cx-r)} {q(cy+.6*r)} {q(cx-r)} {q(cy)}Z')
    b=''
    if basket:
        by=cy+1.2*r+r*.32; bw=r*.52; bh=r*.36
        b+=(f'<path d="M{q(cx-.3*r)} {q(cy+1.2*r)} L{q(cx-bw/2+1)} {q(by)} M{q(cx+.3*r)} {q(cy+1.2*r)} L{q(cx+bw/2-1)} {q(by)}'
            f' M{q(cx-.1*r)} {q(cy+1.2*r)} L{q(cx-bw/6)} {q(by)} M{q(cx+.1*r)} {q(cy+1.2*r)} L{q(cx+bw/6)} {q(by)}" stroke="#8A5530" stroke-width="{q(max(1.4,r*.06))}" stroke-linecap="round"/>')
        b+=f'<rect x="{q(cx-bw/2)}" y="{q(by)}" width="{q(bw)}" height="{q(bh)}" rx="{q(r*.08)}" fill="#E0A26A" stroke="#8A5530" stroke-width="{q(max(1.6,r*.09))}"/>'
        b+=f'<path d="M{q(cx-bw/2+2)} {q(by+bh*.45)} H{q(cx+bw/2-2)}" stroke="#B9763F" stroke-width="{q(max(1.2,r*.06))}" stroke-linecap="round"/>'
    b+=f'<path d="{env}" fill="{base}"/>'
    for t1,t2 in ((-.72,-.32),(.32,.72)):
        a1,a2,a3=mer(t1); c1,c2,c3=mer(t2)
        b+=(f'<path d="M{q(top[0])} {q(top[1])} C{q(a1[0])} {q(a1[1])} {q(a2[0])} {q(a2[1])} {q(a3[0])} {q(a3[1])}'
            f' L{q(c3[0])} {q(c3[1])} C{q(c2[0])} {q(c2[1])} {q(c1[0])} {q(c1[1])} {q(top[0])} {q(top[1])}Z" fill="{stripe}"/>')
    # a skirt band at the mouth
    b+=f'<rect x="{q(cx-.34*r)}" y="{q(cy+1.1*r)}" width="{q(.68*r)}" height="{q(.16*r)}" rx="{q(.05*r)}" fill="{stripe}" stroke="{line}" stroke-width="{q(max(1.4,r*.07))}"/>'
    b+=f'<path d="{env}" fill="none" stroke="{line}" stroke-width="{q(max(2,r*.12))}" stroke-linejoin="round"/>'
    # shine
    b+=f'<path d="M{q(cx-.72*r)} {q(cy-.18*r)} Q{q(cx-.66*r)} {q(cy-.62*r)} {q(cx-.3*r)} {q(cy-.8*r)}" fill="none" stroke="#FFFFFF" stroke-width="{q(max(1.6,r*.11))}" stroke-linecap="round" opacity=".75"/>'
    if face:
        e=r*.17
        b+=f'<path d="M{q(cx-e-r*.1)} {q(cy+.08*r)} q{q(r*.1)} {q(-r*.11)} {q(r*.2)} 0 M{q(cx+e-r*.1)} {q(cy+.08*r)} q{q(r*.1)} {q(-r*.11)} {q(r*.2)} 0" stroke="#5A2A6A" stroke-width="{q(r*.075)}" fill="none" stroke-linecap="round"/>'
        b+=f'<path d="M{q(cx-r*.08)} {q(cy+.3*r)} q{q(r*.08)} {q(r*.09)} {q(r*.16)} 0" stroke="#5A2A6A" stroke-width="{q(r*.07)}" fill="none" stroke-linecap="round"/>'
        b+=f'<ellipse cx="{q(cx-r*.42)}" cy="{q(cy+.3*r)}" rx="{q(r*.13)}" ry="{q(r*.08)}" fill="#FF6FA0" opacity=".5"/><ellipse cx="{q(cx+r*.42)}" cy="{q(cy+.3*r)}" rx="{q(r*.13)}" ry="{q(r*.08)}" fill="#FF6FA0" opacity=".5"/>'
    return b

def _clouds_bank(y,r,fill,line,step=.9,jit=6,x0=-20):
    # a row of puffy circles across the screen, solid below their centres: one layer of the cloud sea.
    # stroked circles, then the same circles unstroked (merges the inner outlines), then the solid body below.
    cs=[]; x=x0
    while x<W+r:
        rr=r*random.uniform(.82,1.12); cs.append((x,y+random.uniform(-jit,jit),rr)); x+=rr*2*step*random.uniform(.85,1.05)
    q=_clouds_r
    b=''.join(f'<circle cx="{q(cx)}" cy="{q(cy)}" r="{q(rr)}" fill="{fill}" stroke="{line}" stroke-width="4"/>' for cx,cy,rr in cs)
    b+=''.join(f'<circle cx="{q(cx)}" cy="{q(cy)}" r="{q(rr-1.5)}" fill="{fill}"/>' for cx,cy,rr in cs)
    # body: a polygon through the puff centres, so it hides every inner outline stub between neighbouring puffs
    pts=' '.join(f'{q(cx)},{q(cy)}' for cx,cy,rr in cs)
    b+=f'<polygon points="-20,{H+10} -20,{q(cs[0][1])} {pts} {W+20},{q(cs[-1][1])} {W+20},{H+10}" fill="{fill}"/>'
    # a few soft highlight curls on the tops of the puffs
    for cx,cy,rr in cs[1::3]:
        b+=f'<path d="M{q(cx-rr*.55)} {q(cy-rr*.35)} Q{q(cx-rr*.2)} {q(cy-rr*.78)} {q(cx+rr*.25)} {q(cy-rr*.68)}" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".9"/>'
    return b

def clouds():
    random.seed(80)
    # soft sunrise sky: lavender-blue at the top, peach-pink near the cloud sea (kept light behind the top text band)
    b=('<defs><linearGradient id="cldsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DCE2FF"/>'
       '<stop offset=".55" stop-color="#EEDDF8"/><stop offset="1" stop-color="#FFD6DE"/></linearGradient></defs>')
    b+=f'<rect width="{W}" height="320" fill="url(#cldsky)"/><rect y="318" width="{W}" height="{H-318}" fill="#FFF4F8"/>'
    # the low sunrise sun peeking over the cloud sea on the right, soft and faceless (calm behind the board)
    b+='<circle cx="322" cy="270" r="46" fill="#FFE9C4" opacity=".7"/><circle cx="322" cy="270" r="30" fill="#FFDFA0" stroke="#F5BE82" stroke-width="4"/>'
    # a couple of little sky clouds and sparkles, out of the subtitle/clock lines
    b+=cloud(196,206,.42,'#FFFFFF','#C9B8EE')+cloud(28,214,.5,'#FFFFFF','#C9B8EE')
    for x,y,r in [(118,128,6),(266,116,5),(358,140,6),(180,250,4)]:
        b+=sparkle(x,y,r,'#FFFFFF')
    # a few birds gliding
    b+='<path d="M216 150 q6 -6 12 0 q6 -6 12 0 M252 168 q5 -5 10 0 q5 -5 10 0" fill="none" stroke="#8C7AB8" stroke-width="2.6" stroke-linecap="round"/>'
    # a tiny far balloon drifting on the right
    b+=_clouds_balloon(318,222,14,'#FFD0A8','#FFAFC8','#D98AA0',face=False)
    # LANDMARK: the big striped hot-air balloon in the top-left corner (envelope above y~95, clear of the subtitle at x>67)
    b+=_clouds_balloon(36,56,33)
    # the cloud sea, back to front: lavender, white (Cheddar sits on it), then softer layers down the screen
    b+=_clouds_bank(286,24,'#E6DCFA','#BBA8E6',jit=5)
    b+=_clouds_bank(322,30,'#FFFFFF','#C9B8EE',jit=6,x0=-34)
    # soft wind streaks across the white cloud top (calm texture behind the board)
    for x,y in [(64,384),(300,372),(176,414)]:
        b+=f'<path d="M{x-26} {y} H{x+20} M{x-12} {y+9} H{x+30}" fill="none" stroke="#ECE3FA" stroke-width="4" stroke-linecap="round"/>'
    b+=_clouds_bank(450,34,'#FBEFFA','#E2BCDD',jit=7,x0=-10)
    b+=_clouds_bank(580,36,'#F3ECFF','#C9B8EE',jit=7,x0=-40)
    # bottom band: a pastel rainbow arching out of the clouds, and a tiny cloud castle peeking up on the right
    b+=_clouds_bank(700,36,'#FFF2F6','#E8BCD0',jit=6,x0=-14)
    cx,cy=118,812
    bands=['#FFADC6','#FFD3A6','#FFF0A0','#BDEBC2','#B6D9FF','#D2BEFF']
    b+=f'<path d="M{cx-65} {cy} A65 65 0 0 1 {cx+65} {cy}" fill="none" stroke="#C3A2DE" stroke-width="61"/>'
    for k,c in enumerate(bands):
        rr=90-4.5-k*9
        b+=f'<path d="M{f(cx-rr)} {cy} A{f(rr)} {f(rr)} 0 0 1 {f(cx+rr)} {cy}" fill="none" stroke="{c}" stroke-width="9.6"/>'
    # cloud castle: white towers with pink cone roofs and a flag
    g='<g stroke="#B9A6E2" stroke-width="3" stroke-linejoin="round">'
    g+='<rect x="292" y="738" width="60" height="64" rx="6" fill="#FFFFFF"/>'
    g+='<rect x="278" y="726" width="22" height="76" rx="6" fill="#FFFFFF"/><rect x="344" y="726" width="22" height="76" rx="6" fill="#FFFFFF"/>'
    g+='<rect x="310" y="712" width="24" height="90" rx="6" fill="#FFFFFF"/>'
    g+='<path d="M275 728 L289 702 L303 728Z M341 728 L355 702 L369 728Z" fill="#FFADC6" stroke="#D98AA6"/>'
    g+='<path d="M306 714 L322 682 L338 714Z" fill="#D2BEFF" stroke="#9C82D6"/>'
    g+='<path d="M322 682 V668" stroke="#9C82D6"/><path d="M322 668 l12 4 l-12 4Z" fill="#FF8FB8" stroke="#D96A98" stroke-width="2"/>'
    g+='<path d="M316 802 v-16 q6 -9 12 0 v16Z" fill="#E6DCFA"/>'
    g+='<rect x="285" y="744" width="8" height="11" rx="4" fill="#E6DCFA" stroke="none"/><rect x="351" y="744" width="8" height="11" rx="4" fill="#E6DCFA" stroke="none"/><rect x="318" y="732" width="8" height="11" rx="4" fill="#E6DCFA" stroke="none"/>'
    g+='</g>'
    b+=g
    b+=sparkle(232,736,7,'#FFFFFF')+sparkle(372,690,5,'#FFFFFF')
    # front cloud layer hides the rainbow ends and the castle's base
    b+=_clouds_bank(800,30,'#FFFFFF','#E2BCDD',jit=5,x0=-8)
    return svg(b)

from scenes import *      # W, H, f, cloud, flower, tuft, sparkle, svg, sun, LINE, random, math

def _space_ring(cx, cy, rx, ry, rot, half):
    # one half of a tilted planet ring as a thick two-tone arc: half='back' (upper arc) or 'front' (lower arc)
    sweep = '1' if half == 'back' else '0'
    d = f'M{f(cx-rx)} {cy} A{rx} {ry} 0 0 {sweep} {f(cx+rx)} {cy}'
    t = f' transform="rotate({rot} {cx} {cy})"'
    return (f'<path d="{d}" fill="none" stroke="#8E6CD0" stroke-width="13" stroke-linecap="round"{t}/>'
            f'<path d="{d}" fill="none" stroke="#D6C2FF" stroke-width="7" stroke-linecap="round"{t}/>')

def _space_rocket(x, y, rot, s=1.0):
    # pink/white chibi rocket pointing up in local coords, flame at the bottom
    g = f'<g transform="translate({x} {y}) rotate({rot}) scale({s})" stroke-linejoin="round">'
    g += '<path d="M-9 34 Q0 74 9 34Z" fill="#FF9A4A" stroke="#E2622E" stroke-width="3"/>'
    g += '<path d="M-5 34 Q0 58 5 34Z" fill="#FFE070"/>'
    g += '<path d="M-17 12 L-31 34 Q-24 36 -15 31Z M17 12 L31 34 Q24 36 15 31Z" fill="#FF7FB0" stroke="#C94F8A" stroke-width="3"/>'
    g += '<path d="M-11 30 h22 v6 h-22Z" fill="#B79BE0" stroke="#7A5AB0" stroke-width="3"/>'
    g += '<path d="M0 -50 C18 -34 20 0 15 31 H-15 C-20 0 -18 -34 0 -50Z" fill="#FFFFFF" stroke="#C94F8A" stroke-width="3.5"/>'
    g += '<path d="M0 -50 C9 -42 13 -35 15 -27 Q0 -21 -15 -27 C-13 -35 -9 -42 0 -50Z" fill="#FF7FB0" stroke="#C94F8A" stroke-width="3.5"/>'
    g += '<path d="M-2 31 V8" stroke="#FF7FB0" stroke-width="5" stroke-linecap="round"/>'
    g += '<circle cx="0" cy="-6" r="9.5" fill="#BFEFFF" stroke="#C94F8A" stroke-width="3.5"/>'
    g += '<path d="M-5 -9 q2 -4 6 -4" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>'
    return g + '</g>'

def _space_ufo(x, y):
    # friendly little UFO with a tiny smiling alien in the dome and a soft beam
    g = f'<path d="M{x-16} {y+8} L{x-40} {y+58} H{x+40} L{x+16} {y+8}Z" fill="#FFF3B0" opacity=".22"/>'
    g += f'<path d="M{x-17} {y-2} A17 17 0 0 1 {x+17} {y-2}Z" fill="#BFF5E6" stroke="#4FA88E" stroke-width="3"/>'
    g += f'<circle cx="{x}" cy="{y-9}" r="6" fill="#8EE08A" stroke="#4E9A4C" stroke-width="2"/>'
    g += f'<circle cx="{x-2}" cy="{y-10}" r="1.3" fill="{LINE}"/><circle cx="{x+2.4}" cy="{y-10}" r="1.3" fill="{LINE}"/>'
    g += f'<path d="M{x-6} {y-19} l-3 -5 M{x+6} {y-19} l3 -5" stroke="#4E9A4C" stroke-width="2" stroke-linecap="round"/>'
    g += f'<ellipse cx="{x}" cy="{y+2}" rx="38" ry="11" fill="#C98BE8" stroke="#6E3E92" stroke-width="3.5"/>'
    for dx in (-24, -8, 8, 24):
        g += f'<circle cx="{x+dx}" cy="{y+4}" r="3" fill="#FFE070"/>'
    return g

def _space_satellite(x, y, rot):
    g = f'<g transform="translate({x} {y}) rotate({rot})" stroke-linejoin="round">'
    g += '<path d="M-36 -7 h22 v14 h-22Z M14 -7 h22 v14 h-22Z" fill="#B4B8FF" stroke="#6A64B8" stroke-width="2.5"/>'
    g += '<path d="M-25 -7 v14 M25 -7 v14" stroke="#6A64B8" stroke-width="1.8"/>'
    g += '<path d="M-14 0 h28" stroke="#9A8AB8" stroke-width="3"/>'
    g += '<rect x="-9" y="-9" width="18" height="18" rx="4" fill="#FFD36E" stroke="#C98A2E" stroke-width="2.5"/>'
    g += '<path d="M0 -9 V-17" stroke="#9A8AB8" stroke-width="2.5" stroke-linecap="round"/><circle cx="0" cy="-19" r="3" fill="#FF8FC0"/>'
    return g + '</g>'

def space():
    random.seed(55)
    b = f'<rect width="{W}" height="{H}" fill="#221A46"/>'
    # a soft nebula wash in the mid sky (low contrast, behind the board)
    b += '<path d="M-10 170 C70 130 150 200 230 160 C300 126 350 170 400 150 V260 C330 280 270 240 190 262 C110 284 60 240 -10 262Z" fill="#2C2156"/>'
    # stars: only tiny dim dots behind the title / subtitle / clock
    for i in range(90):
        x, y = random.randint(0, 390), random.randint(0, 300)
        calm = (y < 108 and 56 < x < 334) or (x > 290 and 50 < y < 96)
        r = .9 if calm else random.choice([1, 1.3, 1.7])
        b += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{random.choice(["#FFFFFF", "#FFF3B0", "#D9CCFF", "#FFC6E0"])}" opacity="{".45" if calm else ".9"}"/>'
    for x, y, r in [(26, 180, 7), (370, 232, 6), (300, 250, 5), (92, 262, 5), (200, 140, 6)]:
        b += sparkle(x, y, r, '#FFF3B0')
    # far little planet + comet streak, top-left (behind the Back button area, away from the clock)
    b += '<circle cx="34" cy="40" r="15" fill="#FFD36E" stroke="#D99A3A" stroke-width="3.5"/>'
    b += '<path d="M22 36 q12 -4 24 0" fill="none" stroke="#F0B850" stroke-width="3" stroke-linecap="round"/>'
    b += '<circle cx="28" cy="46" r="2.6" fill="#F0B850"/>'
    # the big ringed planet in the top-right corner (above the clock row)
    px, py, pr = 374, 18, 40
    b += _space_ring(px, py, 74, 17, -12, 'back')
    b += f'<circle cx="{px}" cy="{py}" r="{pr}" fill="#FFC2CF" stroke="#E07A98" stroke-width="4"/>'
    b += f'<path d="M{px-36} {py+14} Q{px} {py+24} {px+38} {py+10}" fill="none" stroke="#FFA7B9" stroke-width="7" stroke-linecap="round"/>'
    b += f'<path d="M{px-37} {py-8} Q{px} {py} {px+37} {py-12}" fill="none" stroke="#FFDCC4" stroke-width="6" stroke-linecap="round"/>'
    b += f'<path d="M{px-28} {py-22} q8 -7 18 -10" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".7"/>'
    b += _space_ring(px, py, 74, 17, -12, 'front')
    # a little comet streaking off to the upper right, beside Cheddar
    b += '<path d="M346 176 L398 132 L340 168Z" fill="#FFC6E0" opacity=".45"/>'
    b += '<path d="M345 174 L374 152 L342 170Z" fill="#FFE89A" opacity=".7"/>'
    b += sparkle(342, 174, 9, '#FFE89A')
    # Cheddar's little mint planet: curved horizon around y 300 (centre) to ~350 (edges)
    b += '<circle cx="195" cy="640" r="340" fill="#9FE6CF" stroke="#5BB89E" stroke-width="4"/>'
    b += '<path d="M52 332 Q195 290 338 332" fill="none" stroke="#C9F5E6" stroke-width="5" stroke-linecap="round"/>'
    for x, y, r in [(60, 390, 20), (320, 372, 13), (205, 470, 28), (100, 590, 17), (300, 600, 24), (190, 680, 12), (40, 700, 10), (250, 830, 14)]:
        b += f'<ellipse cx="{x}" cy="{y}" rx="{r}" ry="{f(r*.55)}" fill="#86D6BD" stroke="#5BB89E" stroke-width="3"/>'
        b += f'<path d="M{f(x-r*.7)} {f(y+r*.2)} Q{x} {f(y+r*.5)} {f(x+r*.7)} {f(y+r*.2)}" fill="none" stroke="#C9F5E6" stroke-width="2.5" stroke-linecap="round"/>'
    for i in range(18):
        x, y = random.randint(10, 380), random.randint(360, 830)
        b += f'<circle cx="{x}" cy="{y}" r="{random.choice([2, 2.5, 3])}" fill="{random.choice(["#FFC6E0", "#D9CCFF", "#FFF3B0"])}"/>'
    # bottom band: a rocket blasting off (left) and a friendly UFO (right)
    for x, y, r in [(60, 812, 14), (82, 820, 11), (40, 822, 10)]:
        b += f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFFFFF" stroke="#D9CCFF" stroke-width="3"/>'
    b += _space_rocket(72, 738, 14)
    b += _space_ufo(312, 724)
    b += _space_satellite(40, 236, -20)
    return svg(b)

SCENES=[('lawn',lawn),('beach',beach),('lava',lava),('moon',moon),('mountaintop',mountaintop),('ocean',ocean),('autumn',autumn),('snowy',snowy),('night',night),('aurora',aurora),('canyon',canyon),('clouds',clouds),('space',space)]
if __name__=='__main__':
    here=os.path.dirname(os.path.abspath(__file__))
    svgdir=sys.argv[sys.argv.index('--svg')+1] if '--svg' in sys.argv else None
    art={}
    for n,fn in SCENES:
        s=fn()
        if svgdir: os.makedirs(svgdir,exist_ok=True); open(os.path.join(svgdir,f'scene-{n}.svg'),'w').write(s)
        art[n]=s.replace(' xmlns="http://www.w3.org/2000/svg"','')
    js='// Corgidoku scenes: 390x844 pictures behind the whole app, earned on the Climb (see SCENES in shop.js).\n'
    js+='// Generated by tools/scenes.py (Sticker style: flat fills, soft darker outlines). Landmarks sit in the top band\n'
    js+='// or the bottom band, so they peek out around the board on the play screen. Edit the Python, not this file.\n'
    js+='export const SCENE_ART = {\n'+''.join(f'  {n}: {json.dumps(a)},\n' for n,a in art.items())+'};\n'
    open(os.path.join(here,'..','scenes.js'),'w').write(js)
    print({n:len(a) for n,a in art.items()})
