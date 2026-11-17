# Nala's Bonk Golf 🐾

*For Ashley & Corbin (and Nala, Stella & Binx).*

Nala is a shar-pei who went blind and now ping-pongs around the house. Fling her through a pitch-black house to her bed (or her breakfast, the back door, the treat jar…). Every bonk sends out a sonar ping that lights up what's nearby for a moment. Learn the house by bonking into it.

**Play:** https://brothernod.github.io/PhoneApps/NalaGolf/

## How to play

- **Drag back anywhere and let go** to fling Nala, like a slingshot. A short drag (about a thumb's width) is full power.
- **The house is dark.** Ashley's directions on the intro card (📜 shows them again) plus whatever your bonks light up are all you get. The yellow scent pulse gets stronger as Nala gets close.
- **Touch the goal to win.** She doesn't have to stop on it.
- **3 moves per try.** Out of moves means back to the start, but anything she knocked over stays knocked over. Every try teaches you more of the map.
- 🍪 **Hidden treat:** +1 move for that try.
- 🐕 **Stella:** bump her for a pep talk, a BORF! and +1 move. She trots out of the way after that, and her +1 lasts for every try left on that level.
- 🐈‍⬛ **Binx:** bump him and he smacks you: −1 move and a hard bounce. Once per try.
- After each level you get a sped-up **instant replay** with the lights on, then a results card. Clear all five levels for the credits.

- **Small clutter tips over.** Lamps, plants, baskets, trash cans, bowls and shoe piles fall over on a real hit, and Nala plows on through instead of pinballing off. They stay down for the rest of the level. She rolls right over squeaky toys.
- **Learning the house:** from the 3rd try on, every try gets +1 move (+2 from the 6th try).

### Beat it, then beat it again

Clear all five levels to roll the credits. That counts as beating the game, and each time unlocks a costume and a new round:

- **Costumes:** beat it once for 🏴‍☠️ **Captain Nala** (an eye patch on *each* eye, plus a parrot), twice for 🥋 **Sensei Nala** (green gi, black belt, headband), three times for 🚀 **Astro Nala** (bubble helmet, jetpack). **Tap Nala on the title screen** to swap. Super Sniffer and plain Nala are always there. Costumes are how Nala sees herself in the dark, so they come off when the lights come up for the replay.
- **Remix rounds:** from round 2 on, every level is open, and the clutter and the treat move to new spots (characters, furniture and anything the directions mention stay put). Clear all five again, in any order, to finish the round. The layouts aren't random at play time: `tools/remix.mjs` generated them and kept only the ones the solver could beat.

Levels unlock in order. Use **☰ Levels → Unlock all levels** to skip ahead. ⚙️ has the workshop knobs: scent hint, lights-on cheat, moves per try, volume, and a progress reset.

### On a phone

- **Add to Home Screen** (Safari: Share → Add to Home Screen). It opens full-screen with Nala's icon, and it fits around the notch and home bar.
- **iPhone silent switch:** Safari's web audio follows the ring/silent switch. If you hear nothing, flip the switch off.
- Best scores and unlocks are saved on the device. On iPhone, the Home Screen app keeps its own save, separate from Safari's.

## Files

| File | What's in it |
|---|---|
| `index.html` | Shell, CSS, PWA tags. Loads the scripts in order: version, levels, audio, game, render |
| `levels.js` | Level data only, plus materials (`MAT`), knock-over presets (`KO`) and goal effects (`GOALFX`) |
| `game.js` | Loop, physics, input, states (title → intro → aim/moving → fail/winning → recap → credits), cards, saves |
| `render.js` | All drawing: neon bonk mode, the Storybook Sketch lights-on house, Nala, Stella, Binx, title and credits |
| `audio.js` | Synth sound effects (no audio files) and the balance table `BAL` |
| `version.js` | Revision stamp shown on the title and intro cards |
| `manifest.webmanifest`, `icons/` | Home-screen app bits |
| `tools/` | Test and level-design scripts (below) |

## Adding or changing a level

Levels live in the `LEVELS` array in `levels.js`. The world is 400 × 700: the top 56 px is the HUD, and the outer walls run x 10–390, y 60–690. Nala starts facing up the screen.

```js
{ name:'Bedtime', emoji:'🛏️', start:{x:100,y:640},
  goal:{t:'r',x:30,y:80,w:96,h:66,kind:'bed'},          // or {t:'c',x,y,r,kind:'food'|'jar'|'bone'}; 'door' = mat by the back door
  intro:'Hey Nala, it’s bedtime! Go straight up…',     // Ashley's directions, left/right from Nala's heading
  floors:[{x:20,y:70,w:360,h:260,kind:'carpet'}],      // wood | carpet | tile (lights-on view only)
  decor:[{x:130,y:430,w:140,h:86,kind:'rug'}],         // rug | runner | mat | dogbed | table (non-solid)
  objs:()=>[...walls(),
    Rc(20,330,230,12,'wall','wall'),                   // rectangles: Rc(x,y,w,h,name,material,extra)
    Ci(60,600,12,'floor lamp','metal',KO.floorLamp()), // circles:    Ci(x,y,r,name,material,extra)
  ],
  ents:[{k:'treat',x:330,y:620},{k:'stella',x:300,y:360},{k:'binx',x:40,y:420}] },
```

- **The name picks the drawing.** Furniture is drawn from words in its name: `couch`/`sofa`, `coffee table`, `dresser`, `big bed`, `space heater`, `floor lamp`, `lamp`, `plant`, `TV stand`, `fridge`, `counter`/`stove`, `island`, `chair`/`armchair`, `shelf`/`cabinet`, `washer`/`dryer`, `trash`, `water bowl`, `laundry basket`, `shoe`/`boot`, `radiator`, `toy`, `litter box`, `side table`. Anything else gets a plain box. A table she fits under is a `decor` `table` plus solid `table leg` circles. See `kindOf()` / `DRAW` in `render.js`. Add `front:'N'|'S'|'E'|'W'` to force which way a couch or chair faces.
- **Materials** (`MAT`) set the bounce, sound and bonk words: `wall`, `wood`, `soft`, `metal`, `squeak`.
- **Knock-overs:** pass a `KO` preset (`floorLamp`, `tableLamp`, `basket`, `plant`, `trash`, `water`, `shoes`), optionally with your own banner text. Hit one harder than its `at` speed and it falls and she plows through. Aim for 2–4 per level.
- **Remixes:** `pin:['water bowl']` keeps clutter the directions mention in place. After you change a level, regenerate its remixes: `node NalaGolf/tools/remix.mjs 3` writes `tools/remix-out.json` and prints a `remix:[…]` line to paste into the level. The `m` keys are indexes into the `objs()` list, so redo the remixes whenever you add or reorder objects.
- **Directions:** write them in Ashley's voice. Check every "left/right" against the way Nala is heading at that point, not the screen.
- **Gaps** should be at least 78 px (3× Nala's width) wherever she travels, unless a squeeze is the point.
- **Best scores are keyed by level name,** so renaming a level orphans its saved best.

Then check it:

```sh
python3 -m http.server 8765 &                 # from the repo root
node NalaGolf/tools/solve.mjs 3               # can it be beaten in ≤3 moves without perfect aim? is the treat reachable?
node NalaGolf/tools/solve.mjs 3 --remix=1      # same for the level's 1st remix layout
python3 NalaGolf/tools/preview.py /tmp/p 3    # lit floor plan with collision outlines
python3 NalaGolf/tools/smoke.py               # whole-game smoke test (headless Chromium)
```

Add `?debug` to the URL for ghost memory and test knobs (`window.NALA`).

## Other tools

- `tools/bump.sh`: stamps a new revision and cache-busts the scripts. Run it before every commit, so you can tell when GitHub Pages has the update.
- `tools/loudness.py`: measures every sound effect. Use it when you add or change a sound, then adjust `BAL` in `audio.js`.
- `tools/icons.py`: redraws the app icons from the game's own Nala drawing.
- Set `NALA_FONTS=<dir>` (with `audiowide.woff2` and `space-grotesk-{400,600,700}.woff2`, e.g. from `@fontsource`) to render real fonts in the headless tools.
