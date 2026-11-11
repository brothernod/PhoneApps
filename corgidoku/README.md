# Corgidoku

Cheddar's puzzle yard for Halina. A corgi take on Queens-style logic puzzles: one corgi per row, column and colored yard, and no two corgis touch, not even diagonally. See `SPEC.md` for the exact rules, technique ladder and file format.

**Play:** https://brothernod.github.io/PhoneApps/corgidoku/. On iPhone, open it in Safari and tap Share → Add to Home Screen so the streak is never wiped.

## What's here

| File | What it does |
| --- | --- |
| `index.html`, `app.js`, `art.js` | The game: daily puzzle, The Climb (60 levels), past days, hints, stats. `art.js` has Sticker Cheddar, his outfits (`OUTFIT`) and the coin and closet icons |
| `puzzles-extreme.json` | Extreme mode (grown-ups only): 730 daily 9×9/10×10 boards from 2026-11-05 that need "what if" chains + 120-level Extreme Climb |
| `shop.js` | Coins and the Closet: earning rules, back pay, prices, item catalog, scene and frame catalog with Climb unlock rules (pure functions, no DOM) |
| `scenes.js` | The scene pictures (390×844 SVG strings) behind the whole app |
| `engine.js` | Generator, exact solver, human-technique grader (shared by game and tools) |
| `puzzles.json` | Cozy mode: 730 daily puzzles from 2026-11-05 + 60 Climb levels, all verified |
| `puzzles-hard.json` | Hard mode: 730 daily 8×8–10×10 boards needing pair/group locks + 80-level Hard Climb |
| `puzzles-kids.json` | Chill mode (kids only): 760 daily 5×5/6×6 boards from 2026-10-01 + 40-level Chill Climb (4×4 up to 7×7) |
| `tools/generate.mjs` | Builds `puzzles.json`; also hunts big boards on a strong PC |
| `tools/verify.mjs` | Independent checker, written separately from the generator |
| `tools/pool-9.json` | 9×9 boards used on every other Sunday |
| `tools/scenes.py` | Draws the scenes and writes `scenes.js` |

## Regenerate or extend puzzles

Needs Node 18+ (Windows: `winget install OpenJS.NodeJS.LTS`). From this folder:

```
node tools/generate.mjs --start 2026-11-05 --pool tools/pool-9.json
node tools/generate.mjs --mode hard --start 2026-11-05
node tools/generate.mjs --mode extreme --start 2026-11-05 --seed 6
node tools/generate.mjs --mode kids --start 2026-10-01 --days 760
node tools/verify.mjs
node tools/verify.mjs puzzles-hard.json
node tools/verify.mjs puzzles-extreme.json
node tools/verify.mjs puzzles-kids.json
```

The output is deterministic for a given `--seed`. Always run `verify.mjs` before committing.

## Heavy pass on the desktop PC

Big boards are fast (thousands per minute), so the PC's real job is hunting the rare **hard** boards (about 1 in 100). Use every core and let it run; it saves every 10 boards and resumes where it left off:

```
node tools/generate.mjs --pool-sizes 9,10 --pool-grade hard --pool-count 100 --pool-out tools/pool-hard.json --workers 16
```

Then rebuild with that pool (`--pool tools/pool-hard.json`), verify, and commit.

## Extreme mode

Built from Halina's Hard field report (86 boards, all rated 2–5 out of 10, median about 4 minutes). Bigger step counts and long stretches with no new corgi nudged her ratings up a little, but nothing inside the L1–L5 ladder got past a 5. So Extreme adds a sixth technique, the "what if" chain (see `SPEC.md`), and sorts boards by chain score = chains + 3 × (longest chain − 1):

| Tier | What it needs | Where it shows up |
| --- | --- | --- |
| X0 | L5 with 25+ steps (the top of Hard) | Climb holds 1–20 |
| X1 | 1–2 short what-ifs (score ≤ 2) | Holds 21–45, Mon/Tue dailies |
| X2 | Score 3–5 | Holds 46–75, Wed/Thu |
| X3 | Score 6–11 | Holds 76–100, Fri/Sat, some Sundays |
| X4 | Score 12+ | Holds 101–120 (the summit), some Sundays |

Only 9×9 and 10×10. Boards already in `puzzles-hard.json` are never reused. The daily file starts 2026-11-05, the day Halina started playing, so Past days reaches back to her first day. The kids don't see Extreme. The first time someone opens Extreme, a short sheet explains what-ifs. Field reports now end with `chains,depth`, so Extreme ratings can be matched against the chain score.

## Players

Settings → Who's playing? switches between Default, Holden and Quentin. Settings → **Kid 1 name** / **Kid 2 name** rename the two kid players (blank = Holden / Quentin) so another family can use the app; the names live in one shared key, `corgidoku:names` (`{holden, quentin}`), and are included in backups. Only the shown name changes: the player ids and storage keys stay `holden` and `quentin`, so progress is untouched. Each player has their own progress, streak, Climb and settings in localStorage (`corgidoku:v1` for Default, so existing progress is untouched; `corgidoku:v1:holden` and `corgidoku:v1:quentin` for the kids). The active player is in `corgidoku:player`.

Each player also has their own wallet, outfits, scenes and frames. The Default player's name shows on the home screen and in Halina's banners; it's `Halina` unless changed in Settings → Your name (`db.settings.name`). The birthday and get-well banners stay with the Default player.

Kid players see their name next to Cheddar on the home screen, get the 🐣 Chill mode (alongside Cozy and Hard), and start with Relaxed on, the timer off, Easy double-tap on (560 ms window instead of 380 ms, plus a little finger wiggle allowed) and Dress up board corgis on. Instead of a coin number they see a piggy-bank bar (see Shop). Halina's special-date banners don't show for the kids.

The Chill Climb: holds 1–6 are 4×4 "last spot" only, 7–28 stay on 5×5/6×6 with only last-spot and confined steps, then 29–40 ramp to 6×6/7×7 boards that need "would block" (about mid-Cozy). Kids boards are capped at 2×n steps.

Placed corgis are always correct, so they're locked: tapping one does nothing, and Undo only takes back paw marks (corgis and red paws stay).

## Shop

Solving puzzles earns coins; coins buy outfits for Cheddar in the **Closet** (home screen → Closet, or tap the coin chip). The coin and the wardrobe are drawn icons (`coinIcon()`, `closetIcon()` in `art.js`) sized to `1em` so they sit in text like the old emoji. Everything is cosmetic: hints stay free and are never sold, and nothing is time-limited. Every puzzle pays once (`db.paid`), so Start over and replays earn nothing new. "Clean" means zero mistakes (Relaxed mode can't lose treats, so mistakes are what count).

| Grown-ups (Default) | Coins |
| --- | --- |
| Today's daily, solved on its date: Cozy / Hard / Extreme | 10 / 15 / 20 |
| Past day (any mode) | 3 |
| Climb hold | 2 |
| Clean solve (any of the above) | +3 |
| Weekly: today's daily solved on 5 of 7 days, Mon–Sun, any mode | +25 |

Kids (Holden, Quentin) get 10 for any solve, +5 if clean, no weekly goal. They start with 100 coins and pay half price.

Prices: basic 60 · nice 150 · fancy 350 · dream 900 · color variant 40.

**Cheddar and outfits.** Cheddar is drawn in the Sticker style (chibi, bold brown outline, white die-cut edge). One shared SVG filter (`artDefs`, added to the page once) makes the die-cut, so 10 board corgis don't each carry a copy. Outfits have three slots, worn at once: **head**, **neck** and **face**. Every outfit is drawn in Cheddar's 200×200 space, so the same drawing fits the home Cheddar, the Closet preview, the sheets and the board heads (whose viewBox leaves room above the ears for hats).

| Slot | Items (grown-up price; kids pay half) |
| --- | --- |
| Head | Party hat 60 · Pom-pom beanie 60 · Baseball cap 60 · Flower crown 150 · Rainbow bow 150 · Pirate hat 150 · Climbing helmet 150 · Bunny ears 150 · Cowboy hat 150 · Tiara 350 · King crown 350 · Wizard hat 350 · Dino hood 350 · Unicorn horn 900 |
| Neck | Bandana 60 · Bow tie 60 · Necktie 60 · Rainbow bandana 150 · Star collar 150 · Cozy scarf 150 |
| Face | Round glasses 60 · Fancy mustache 60 · Heart sunglasses 150 · Cool shades 150 |

Cheddar is a boy, so the catalog has both boy-coded things (baseball cap, cowboy hat, king crown, necktie, cool shades, mustache, pirate hat, dino hood) and girl-coded things (tiara, flower crown, rainbow bow, bunny ears, heart sunglasses). Anyone can wear anything.

Tapping an item you own wears it; buying one wears it right away. Neck items only show on the full Cheddar (home, Closet, sheets).

**Color variants.** Most items come in 3 more colors at 40 coins each (kids 20): one drawing, with its recolorable hexes (`paint`) swapped for another color from `PALETTE` in `shop.js`. A variant's id is `<item>:<color>` (`bandana:purple`, `wizard:mint`), and it's a separate thing you own. You need the item in some color before you can buy another color. In the Closet each item is one tile with little color dots; picking it shows a row of swatches above the Buy button (solid = yours, dashed = not yet, ✓ = wearing): tap one you own to wear it, or one you don't to preview it. Kids can save up for a color too. No colors for the flower crown, rainbow bow, pirate hat, rainbow bandana, unicorn horn or mustache (they're already multicolored or a one-off). The old purple bandana (`bandana-purple`, v1.14–1.20) is now the bandana's purple color: `shopDefaults` renames it in `owned`, `worn` and `goal` on load.

**Board corgis.** Settings → Dress up board corgis puts the equipped hat and face item (sunglasses) on every corgi on the board (on by default for the kids, off for Default). At the win party every corgi puts them on either way, and so does the zooming Cheddar. Nothing equipped means plain corgis: there's no default party hat.

**Kids' piggy bank.** Kids don't see a coin number on the home screen. In the Closet, an item they can't afford yet has a "Save up for this" button; the home screen then shows a bar filling toward it (no numbers), which glows when they have enough. Tapping the bar opens the Closet on that item. Buying it clears the goal.

**Back pay:** the first launch with the shop (per player, `db.shopV`) credits puzzles already solved at base rates: a daily at its daily rate if `solvedAt` is the puzzle's date, otherwise 3; Climb holds 2 (kids: 10 each, plus their 100). No clean bonus and no weekly back pay; weeks that already had 5 days are marked paid. A one-time "Welcome to the closet" sheet shows the total.

**Data** (per player db, additive): `coins`, `paid {pid:1}`, `weeks {"2026-W46":1}`, `owned [itemId]` (colors too: `"bandana:purple"`), `worn {head, neck, face, scene, frame}`, `scenes [sceneId]`, `frames [frameId]`, `goal` (kids' piggy-bank item), `shopV`, `settings.dressBoard`, `settings.sparkles`.

**Backup:** Settings → Backup. "Copy backup code" copies base64 JSON of every `corgidoku:*` key (all players). "Restore from code" checks the code, asks, replaces everything and reloads. Safari can clear a site's storage after 7 days without a visit unless it's on the Home Screen, so a backup protects the coins.

## Scenes

Scenes are pictures behind the whole app (home, play, the Climb, past days, the Closet). They come **only from the Climb** and can never be bought: one every 20 holds (Chill: every 10). The kids reuse the grown-up scenes. Every summit also gives a **summit frame** around the board. Pink (the original background) stays free and selectable.

| Climb | Scenes by hold | Summit frame |
| --- | --- | --- |
| Cozy (60) | 20 Lawn · 40 Beach · 60 Mountaintop | Rainbow |
| Hard (80) | 20 Ocean · 40 Autumn forest · 60 Lava flow · 80 Snowy peak | Gold |
| Extreme (120) | 20 Night sky · 40 Aurora · 60 Canyon · 80 Clouds · 100 Outer space · 120 The Moon | Starlight |
| Chill (40) | 10 Lawn · 20 Beach · 30 Ocean · 40 Night sky | Rainbow |

All 13 are in the catalog (`SCENES` in `shop.js`). Dark scenes: Lava flow, Night sky, Aurora, Outer space, The Moon. Kids see the 8 their climbs can give (not Aurora, Canyon, Clouds, Outer space or The Moon), and a locked scene tells a kid the Chill hold first when it has one ("Ocean: Chill Climb · hold 30").

**Unlocking.** `syncUnlocks(db)` runs on every launch and after every solve. It unlocks every scene and frame whose milestone hold was ever solved (`progress[pid].solved` or `paid[pid]`, so Start over can't take one away). It's idempotent and never removes anything, so it also covered players whose back pay (`shopV`) ran before scenes existed. Found at launch: one "Climb rewards!" sheet (or a list on the first-time "Welcome to the closet" sheet). Earned by a solve: a "New scene: Lava flow!" / "New frame: Gold!" sheet with a preview and **Use it**, then the win sheet.

**Drawing.** 390×844 SVG, `preserveAspectRatio="xMidYMid slice"`, flat fills with soft darker outlines (Sticker style). The board covers the middle of the play screen (about y 92–460), so each landmark sits in a **top corner** (clear of the home subtitle and the play-screen clock) or the **bottom band** (under the play buttons), and Cheddar sits on each scene's ground on the home screen:

| Scene | Top corner | Bottom band |
| --- | --- | --- |
| Lawn | sleepy sun (left) | big daisies |
| Beach | sun (right) | sandcastle, beach ball, starfish |
| Mountaintop | rocky peak with a pink pennant (left) | stone cairn, edelweiss |
| Ocean | striped lighthouse (left), whale tail (right) | underwater fish, coral, starfish; Cheddar sits on a pier |
| Autumn forest | big orange tree (right) | pumpkins, hedgehog in a leaf pile, toadstools |
| Lava flow | volcano crater (left) | lava river |
| Snowy peak | snow-capped peak (right) | snowman, sled, pines |
| Night sky | sleepy crescent moon (left) | campfire, lantern, tent |
| Aurora | aurora swirl (left) | arctic fox, cabin |
| Canyon | striped butte (left), little sun (right) | saguaro, tumbleweed, lizard |
| Clouds | hot-air balloon (left) | rainbow, cloud castle; Cheddar sits on the cloud sea |
| Outer space | ringed planet (right) | rocket, UFO; Cheddar sits on a mint planet |
| The Moon | Earth (left) | craters |

Gradients or clip paths in a scene need ids unique to that scene (`cldsky`, `aurora*`, `cy*`), because the Closet shows several scenes at once. Regenerate with `python3 tools/scenes.py` (add `--svg out` to also write the SVGs for checking with `rsvg-convert`); `scenes.js` is its output.

**Play screen.** The scene sits under a tint: white at 45% on light scenes, navy `rgba(28,26,58,.35)` on dark ones (`dark: true`: Lava flow, The Moon). The board, cells and yard colors never change.

**Text on scenes.** On dark scenes the subtitle, bar titles, the play-screen clock and treats line, and the Climb labels turn `#F3EAFF` (`body.dark`). On light scenes the subtitle and the clock/treats line use the full ink color (`--ink`), because the soft ink can't reach 4.5:1 on a colored sky. On-picture text also gets a soft halo; the play screen's treats/Relaxed line and clock sit on soft pills (white 72% / navy 62%), since the top corners are where landmarks live; and the Climb's labels (hold sizes, summit and base camp) sit on small backings because the Climb scrolls over sky and ground alike. Measured against the scene pixels behind each whole text box (5th percentile, halo removed, pills included), the home subtitle, the play and Closet bar titles, the clock and the Relaxed line pass 4.5:1 on all 13 scenes at 390×844 and 390×797 (the Home Screen app); the lowest is the play bar title over Outer space's ringed planet at 5.7:1. The faint version tag at the bottom of home is decorative (35% opacity) and not held to it. In Safari with its toolbars showing (390×664) the picture shifts about 90px; the halo and pills keep text readable.

**Climb labels.** A milestone hold shows what it gives until it's earned: "🔒 Lava flow at hold 60", "🔒 Gold frame at hold 80".

**Summit frames.** A 5px gradient ring around the board (rainbow, gold or starlight), a soft glow, and 4-point sparkles on the ring's corners and edges, never over the cells. They twinkle when a puzzle opens and when it's solved, and stay still otherwise. Settings → **Summit sparkles** (on by default) hides the sparkles; the ring and glow stay. `prefers-reduced-motion` turns the twinkle off.

**Closet.** Scenes and Frames tabs. **Tapping anything you own puts it on right away** (outfits too, and Pink / No frame / Nothing), with no button to press. Tapping something you don't own previews it and shows a bar pinned to the bottom of the screen: Buy (with a confirm), Save up for kids, or for scenes and frames where to earn them. Locked scenes and frames are grey with a lock and "Hard Climb · hold 60", and never have a Buy button. The Frames tab shows a little solved board in the frame. Kids only see what their climbs can give (The Moon and Starlight need Extreme, so they're hidden for them).

**Win timing.** The win sheet (and any unlock sheet) waits until the board party and Cheddar's zoomies finish: 3.5 s, up to about 4 s on a 10×10. With `prefers-reduced-motion` it's 0.7 s.

## Field research reports

Settings → Field research mode asks for a 1–10 difficulty rating after each solve. Send report shares one CSV line per solved puzzle: `mode,id,size,lv,steps,secs,mistakes,hints,rating,date,chains,depth` (the last two are only filled for Extreme what-if boards). `lv` and `steps` come from the grader, so ratings vs `lv`/`steps` show how well the grader's difficulty matches how hard it felt.

## Releasing

Bump `VERSION` in `app.js` and `CACHE` in `sw.js` together. The version shows faintly at the bottom of the home screen; tap it to clear the cache and reload.

## Special dates

The 2026-11-11 week gets easy puzzles and a get-well banner. Every June 15 gets a birthday banner, an easy puzzle and a party hat for Cheddar. Messages live in `specialBanner()` and `winLine()` in `app.js`; the schedule lives in `want()` in `tools/generate.mjs`.
