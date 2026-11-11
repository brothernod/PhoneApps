# Corgidoku

Cheddar's puzzle yard for Halina. A corgi take on Queens-style logic puzzles: one corgi per row, column and colored yard, and no two corgis touch, not even diagonally. See `SPEC.md` for the exact rules, technique ladder and file format.

**Play:** https://brothernod.github.io/PhoneApps/corgidoku/. On iPhone, open it in Safari and tap Share → Add to Home Screen so the streak is never wiped.

## What's here

| File | What it does |
| --- | --- |
| `index.html`, `app.js`, `art.js` | The game: daily puzzle, The Climb (60 levels), past days, hints, stats. `art.js` has Sticker Cheddar, his outfits (`OUTFIT`) and the coin and closet icons |
| `puzzles-extreme.json` | Extreme mode (grown-ups only): 730 daily 9×9/10×10 boards from 2026-11-05 that need "what if" chains + 120-level Extreme Climb |
| `shop.js` | Coins and the Closet: earning rules, back pay, prices, item catalog (pure functions, no DOM) |
| `engine.js` | Generator, exact solver, human-technique grader (shared by game and tools) |
| `puzzles.json` | Cozy mode: 730 daily puzzles from 2026-11-05 + 60 Climb levels, all verified |
| `puzzles-hard.json` | Hard mode: 730 daily 8×8–10×10 boards needing pair/group locks + 80-level Hard Climb |
| `puzzles-kids.json` | Chill mode (kids only): 760 daily 5×5/6×6 boards from 2026-10-01 + 40-level Chill Climb (4×4 up to 7×7) |
| `tools/generate.mjs` | Builds `puzzles.json`; also hunts big boards on a strong PC |
| `tools/verify.mjs` | Independent checker, written separately from the generator |
| `tools/pool-9.json` | 9×9 boards used on every other Sunday |

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

Settings → Who's playing? switches between Default, Holden and Quentin. Each player has their own progress, streak, Climb and settings in localStorage (`corgidoku:v1` for Default, so existing progress is untouched; `corgidoku:v1:holden` and `corgidoku:v1:quentin` for the kids). The active player is in `corgidoku:player`.

Each player also has their own wallet, outfits and (later) scenes. The Default player's name shows on the home screen and in Halina's banners; it's `Halina` unless changed in Settings → Your name (`db.settings.name`). The birthday and get-well banners stay with the Default player.

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
| Head | Party hat 60 · Pom-pom beanie 60 · Flower crown 150 · Rainbow bow 150 · Pirate hat 150 |
| Neck | Pink bandana 60 · Purple bandana 60 · Bow tie 60 |
| Face | Heart sunglasses 150 |

More items and color variants come in phase 4. Buying an item wears it right away. Neck items only show on the full Cheddar (home, Closet, sheets).

**Board corgis.** Settings → Dress up board corgis puts the equipped hat and face item (sunglasses) on every corgi on the board (on by default for the kids, off for Default). At the win party every corgi puts them on either way, and so does the zooming Cheddar. Nothing equipped means plain corgis: there's no default party hat.

**Kids' piggy bank.** Kids don't see a coin number on the home screen. In the Closet, an item they can't afford yet has a "Save up for this" button; the home screen then shows a bar filling toward it (no numbers), which glows when they have enough. Tapping the bar opens the Closet on that item. Buying it clears the goal.

**Back pay:** the first launch with the shop (per player, `db.shopV`) credits puzzles already solved at base rates: a daily at its daily rate if `solvedAt` is the puzzle's date, otherwise 3; Climb holds 2 (kids: 10 each, plus their 100). No clean bonus and no weekly back pay; weeks that already had 5 days are marked paid. A one-time "Welcome to the closet" sheet shows the total.

**Data** (per player db, additive): `coins`, `paid {pid:1}`, `weeks {"2026-W46":1}`, `owned [itemId]`, `worn {head, neck, face}`, `goal` (kids' piggy-bank item), `shopV`, `settings.dressBoard`.

**Backup:** Settings → Backup. "Copy backup code" copies base64 JSON of every `corgidoku:*` key (all players). "Restore from code" checks the code, asks, replaces everything and reloads. Safari can clear a site's storage after 7 days without a visit unless it's on the Home Screen, so a backup protects the coins.

## Scenes

Coming in phase 3: pictures behind the whole app, earned only in the Climb (never bought), plus summit frames. See the plan doc in the Corgidoku project.

## Field research reports

Settings → Field research mode asks for a 1–10 difficulty rating after each solve. Send report shares one CSV line per solved puzzle: `mode,id,size,lv,steps,secs,mistakes,hints,rating,date,chains,depth` (the last two are only filled for Extreme what-if boards). `lv` and `steps` come from the grader, so ratings vs `lv`/`steps` show how well the grader's difficulty matches how hard it felt.

## Releasing

Bump `VERSION` in `app.js` and `CACHE` in `sw.js` together. The version shows faintly at the bottom of the home screen; tap it to clear the cache and reload.

## Special dates

The 2026-11-11 week gets easy puzzles and a get-well banner. Every June 15 gets a birthday banner, an easy puzzle and a party hat for Cheddar. Messages live in `specialBanner()` and `winLine()` in `app.js`; the schedule lives in `want()` in `tools/generate.mjs`.
