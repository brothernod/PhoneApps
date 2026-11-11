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

SCENES=[('lawn',lawn),('beach',beach),('lava',lava),('moon',moon)]
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
