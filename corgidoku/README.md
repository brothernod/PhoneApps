# Corgidoku

Cheddar's puzzle yard for Halina. A corgi take on Queens-style logic puzzles: one corgi per row, column and colored yard, and no two corgis touch, not even diagonally. See `SPEC.md` for the exact rules, technique ladder and file format.

**Play:** https://brothernod.github.io/PhoneApps/corgidoku/. On iPhone, open it in Safari and tap Share → Add to Home Screen so the streak is never wiped.

## What's here

| File | What it does |
| --- | --- |
| `index.html`, `app.js`, `art.js` | The game: daily puzzle, The Climb (60 levels), past days, hints, stats. `art.js` has Sticker Cheddar, his outfits (`OUTFIT`) and the coin and closet icons |
| `puzzles-extreme.json` | Extreme mode (grown-ups only): 730 daily 9×9/10×10 boards from 2026-11-05 that need "what if" chains + 120-level Extreme Climb |
| `share.js` | Wild Week share cards: the win card and week recap drawn on a 1080×1350 canvas, and the Wordle-style text (see Wild Week) |
| `shop.js` | Coins and the Closet: earning rules, back pay, prices, item catalog, scene and frame catalog with Climb unlock rules (pure functions, no DOM) |
| `scenes.js` | The scene pictures (390×844 SVG strings) behind the whole app |
| `engine.js` | Generator, exact solver, human-technique grader and the Sniff hint (`findStep` is shared by the grader and the hint) |
| `puzzles.json` | Cozy mode: 730 daily puzzles from 2026-11-05 + 60 Climb levels, all verified |
| `puzzles-hard.json` | Hard mode: 730 daily 8×8–10×10 boards needing pair/group locks + 80-level Hard Climb |
| `puzzles-kids.json` | Chill mode (kids only): 760 daily 5×5/6×6 boards from 2026-10-01 + 40-level Chill Climb (4×4 up to 7×7) |
| `bonus-cozy.json`, `bonus-hard.json`, `bonus-extreme.json`, `bonus-kids.json` | Bonus Yards: extra boards per mode, opened by that mode's summit (see Bonus Yards) |
| `wild.json` | Wild Week (Nov 23–29, 2026): 21 multi-map boards, a Cozy, Hard and Extreme set per day (see Wild Week) |
| `tools/generate.mjs` | Builds `puzzles.json`; also hunts big boards on a strong PC |
| `tools/verify.mjs` | Independent checker, written separately from the generator |
| `tools/sniff.test.mjs` | Tests that every Sniff hint is a valid step and the lowest level available, on every board of all 8 files |
| `tricks.js` | Cheddar's tricks: the lessons page, Show it / Watch it, practice play, Skip and resume, More practice, coins (see Cheddar's tricks) |
| `lessons.json` | Cheddar's tricks boards: 10 per lesson, boards 9–10 per track, spare pools, the Show it boards (fetched on launch, saved offline) |
| `tools/lessons.mjs` | Builds `lessons.json` from fresh boards; `--sheet out.html` draws the contact sheet |
| `tools/hunt-chains.mjs` | The targeted hunt for long What if chains (lesson 6c); writes `tools/deep-chains.json` |
| `tools/deep-chains.json` | Hunted boards whose What if runs 2–5 forced corgis deep, read by `lessons.mjs` |
| `tools/lessons.test.mjs` | Checks every lesson board: nothing easier works, the answer is the only step of its level, the evidence re-checked from SPEC, no shipped board reused |
| `tools/wild.test.mjs` | Wild Week tests: the multi-map solver against brute force, union auto paws, test-page sets grading the same, coin rates, unlock order and prizes |
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
node tools/generate.mjs --wild --start 2026-11-23 --days 7
node tools/verify.mjs wild.json
node tools/verify.test.mjs
node tools/wild.test.mjs
node tools/sniff.test.mjs
node tools/hunt-chains.mjs        (about 7 minutes on 2 cores; only to refresh deep-chains.json)
node tools/lessons.mjs            (about 3.5 minutes)
node tools/lessons.test.mjs
```

The output is deterministic for a given `--seed`. Always run `verify.mjs` before committing.

## Heavy pass on the desktop PC

Big boards are fast (thousands per minute), so the PC's real job is hunting the rare **hard** boards (about 1 in 100). Use every core and let it run; it saves every 10 boards and resumes where it left off:

```
node tools/generate.mjs --pool-sizes 9,10 --pool-grade hard --pool-count 100 --pool-out tools/pool-hard.json --workers 16
```

Then rebuild with that pool (`--pool tools/pool-hard.json`), verify, and commit.

## Bonus Yards

Reaching a mode's summit (Cozy hold 60, Hard 80, Extreme 120, Chill 40) opens that mode's **Bonus Yards** for that player: an endless run of extra boards, so finishing the Climb doesn't mean running out. The unlock checks `progress` or `paid` for the summit hold (`bonusOpen` in `shop.js`), so Start over can't take it away. Until then, the summit's Climb tag says "+ Bonus Yards"; the summit's win sheet says they're open and offers "Try a bonus yard".

- **Where:** on home, the Climb card and a Bonus Yards card share one row ("Yard 17 · 9×9"); on the Climb screen there's a full-width card above the summit. Both open the next unsolved yard. The win sheet on a bonus yard has "Next bonus yard".
- **Order:** yards are played in order, numbered from 1. Ids are `b:<k>` (Cozy), `hb:`, `xb:`, `kb:` (Chill).
- **Coins:** 3 (+3 clean) for grown-ups, 5 (+5 clean) for kids. Each yard pays once. Bonus yards don't count for the streak, the weekly bonus or Climb scenes, but they do count in Solved and in field reports.
- **Pools:** one file per mode, fetched only once that mode is open for the current player. The service worker saves all four on install, so they work offline from the first launch. Each pool is the top half of its Climb, cycling sizes and tiers so boards in a row differ:

| Pool | Target size | Cycle |
| --- | --- | --- |
| Cozy | 500 | 8×8 L3 · 7×7 L4 · 8×8 L4 · 7×7 L3 · 8×8 L3 · 8×8 L4 |
| Hard | 500 | 9×9 L5 · 10×10 L4 · 10×10 L5 · 9×9 L5 · 10×10 L4 |
| Extreme | 300 | 9×9 X2 · 10×10 X2 · 9×9 X3 · 10×10 X3 · 10×10 X4 · 9×9 X4 · 10×10 X3 · 9×9 X2 · 10×10 X4 · 9×9 X3 |
| Chill | 400 | 6×6 L2 · 7×7 L2 · 6×6 L3 · 7×7 L3 (≤ 2×n steps) |

No board repeats one in any other puzzle or bonus file (`canonicalKey`, so turned and mirrored copies count too).
- **Endless laps:** after the last board of a pool, yard N+1 is board 1 again, turned or mirrored (`transformBoard` in `engine.js`) with its yard colors shifted, and the numbers keep going. Each lap uses a different turn.
- **Growing a pool:** the generator keeps an existing bonus file and only adds boards up to `--count`, so yards players already solved keep their numbers. A lap board's number can point at a new board once the pool grows, so an unfinished bonus yard remembers its board (`bk` in its progress) and starts fresh if the board changed.

Fill every pool in one go (Chill, Cozy, Hard, then Extreme, which takes most of the time), verify them all and print a timing summary:

```
node tools/generate.mjs --bonus all
```

It uses every logical core (override with `--workers N`) and prints progress every 30 seconds (`--every N`): the stage, boards kept and tried, overall %, the recent rate, elapsed time, and an ETA for the stage and the whole run. The stage ETA comes from the slowest board type still being hunted; it's marked rough for the first two minutes, and the overall ETA rescales itself to the machine after each stage. Boards are saved as they come in, so Ctrl+C is safe: run the same command again to continue. On the 2-core cloud box, Extreme's 260 boards took about 5 minutes and the other three under a minute together.

To compare two machines first, `node tools/generate.mjs --bench` does the same fixed work anywhere (60 Hard bonus boards into a temp file) and prints the time; lower is faster. It took 9 s on the 2-core cloud box.

Or one pool at a time, then verify:

```
node tools/generate.mjs --bonus cozy --workers 16
node tools/generate.mjs --bonus hard --workers 16
node tools/generate.mjs --bonus extreme --workers 16
node tools/generate.mjs --bonus kids --workers 16
node tools/verify.mjs bonus-cozy.json
node tools/verify.mjs bonus-hard.json
node tools/verify.mjs bonus-extreme.json
node tools/verify.mjs bonus-kids.json
```

`--count N` overrides the target size; the cycle and seed live in `BONUS` in `tools/generate.mjs`. The v1.23 release shipped a 40-board starter pool per mode.

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

Settings → Who's playing? switches between Default, Holden and Quentin. Settings → **Kid 1 name** / **Kid 2 name** rename the two kid players (blank = Holden / Quentin) so another family can use the app; the names live in one shared key, `corgidoku:names` (`{holden, quentin}`), and are included in backups. Only the shown name changes: the player ids and storage keys stay `holden` and `quentin`, so progress is untouched. Each player has their own progress, streak, Climb, Bonus Yards and settings in localStorage (`corgidoku:v1` for Default, so existing progress is untouched; `corgidoku:v1:holden` and `corgidoku:v1:quentin` for the kids). The active player is in `corgidoku:player`.

Each player also has their own wallet, outfits, scenes and frames. The Default player's name shows on the home screen and in Halina's banners; it's `Halina` unless changed in Settings → Your name (`db.settings.name`). The Default player's name also shows in a pink name tag next to Cheddar on the home screen, like the kids' (since v1.26; long names shrink and wrap). The birthday and get-well messages only show when that name is Halina.

Kid players see their name next to Cheddar on the home screen, get the 🐣 Chill mode (alongside Cozy and Hard), and start with Relaxed on, the timer off, Easy double-tap on (560 ms window instead of 380 ms, plus a little finger wiggle allowed) and Dress up board corgis on. Instead of a coin number they see a piggy-bank bar (see Shop). Halina's special-date banners don't show for the kids.

The Chill Climb: holds 1–6 are 4×4 "last spot" only, 7–28 stay on 5×5/6×6 with only last-spot and confined steps, then 29–40 ramp to 6×6/7×7 boards that need "would block" (about mid-Cozy). Kids boards are capped at 2×n steps.

Placed corgis are always correct, so they're locked: tapping one does nothing, and Undo only takes back paw marks (corgis and red paws stay).

## Shop

Solving puzzles earns coins; coins buy outfits for Cheddar in the **Closet** (home screen → Closet, or tap the coin chip). The coin and the wardrobe are drawn icons (`coinIcon()`, `closetIcon()` in `art.js`) sized to `1em` so they sit in text like the old emoji. Everything is cosmetic and nothing is time-limited, except the Wild Week rave shades (see Wild Week). Hints (Sniff) are free in Chill and Cozy and cost coins in Hard and Extreme (see Sniff). Every puzzle pays once (`db.paid`), so Start over and replays earn nothing new. "Clean" means zero mistakes (Relaxed mode can't lose treats, so mistakes are what count).

| Grown-ups (Default) | Coins |
| --- | --- |
| Today's daily, solved on its date: Cozy / Hard / Extreme | 10 / 15 / 20 |
| Past day (any mode) | 3 |
| Climb hold | 2 |
| Bonus yard (after a summit) | 3 |
| Clean solve (any of the above) | +3 |
| Weekly: today's daily solved on 5 of 7 days, Mon–Sun, any mode | +25 |
| Wild Week puzzle (Nov 23–29, 2026, any day of the week): Cozy / Hard / Extreme | 20 / 30 / 40, clean +6 |

Kids (Holden, Quentin) get 10 for any daily, past day or Climb hold and 5 for a bonus yard, +5 if clean, no weekly goal. They start with 100 coins and pay half price.

Prices: basic 60 · nice 150 · fancy 350 · dream 900 · color variant 40.

**Cheddar and outfits.** Cheddar is drawn in the Sticker style (chibi, bold brown outline, white die-cut edge). One shared SVG filter (`artDefs`, added to the page once) makes the die-cut, so 10 board corgis don't each carry a copy. Outfits have three slots, worn at once: **head**, **neck** and **face**. Every outfit is drawn in Cheddar's 200×200 space, so the same drawing fits the home Cheddar, the Closet preview, the sheets and the board heads (whose viewBox leaves room above the ears for hats).

| Slot | Items (grown-up price; kids pay half) |
| --- | --- |
| Head | Party hat 60 · Pom-pom beanie 60 · Baseball cap 60 · Flower crown 150 · Rainbow bow 150 · Pirate hat 150 · Climbing helmet 150 · Bunny ears 150 · Cowboy hat 150 · Tiara 350 · King crown 350 · Wizard hat 350 · Dino hood 350 · Top hat 350 · Unicorn horn 900 |
| Neck | Bandana 60 · Bow tie 60 · Necktie 60 · Rainbow bandana 150 · Star collar 150 · Cozy scarf 150 |
| Face | Round glasses 60 · Fancy mustache 60 · Heart sunglasses 150 · Cool shades 150 · Monocle 350 · Pink / Rainbow / LED rave shades (Wild Week prizes, never for sale) |

Cheddar is a boy, so the catalog has both boy-coded things (baseball cap, cowboy hat, king crown, necktie, cool shades, mustache, pirate hat, dino hood) and girl-coded things (tiara, flower crown, rainbow bow, bunny ears, heart sunglasses). Anyone can wear anything.

Tapping an item you own wears it; buying one wears it right away. Neck items only show on the full Cheddar (home, Closet, sheets).

**Color variants.** Most items come in 3 more colors at 40 coins each (kids 20): one drawing, with its recolorable hexes (`paint`) swapped for another color from `PALETTE` in `shop.js`. A variant's id is `<item>:<color>` (`bandana:purple`, `wizard:mint`), and it's a separate thing you own. You need the item in some color before you can buy another color. In the Closet each item is one tile with little color dots; picking it shows a row of swatches above the Buy button (solid = yours, dashed = not yet, ✓ = wearing): tap one you own to wear it, or one you don't to preview it. Kids can save up for a color too. The top hat (v1.30) is black and only its band changes color (red, purple, blue, gold). The monocle comes in gold, silver and rose gold (only 2 extra colors; `gold`, `silver` and `rosegold` are in `PALETTE` for it). Its bead chain (`.mchain`) shows on the big Cheddar and in the Closet, and CSS hides it on board corgis, where it would be a few stray pixels. No colors for the flower crown, rainbow bow, pirate hat, rainbow bandana, unicorn horn or mustache (they're already multicolored or a one-off). The old purple bandana (`bandana-purple`, v1.14–1.20) is now the bandana's purple color: `shopDefaults` renames it in `owned`, `worn` and `goal` on load.

**Board corgis.** Settings → Dress up board corgis puts the equipped hat and face item (sunglasses) on every corgi on the board (on by default for the kids, off for Default). At the win party every corgi puts them on either way, and so does the zooming Cheddar. Nothing equipped means plain corgis: there's no default party hat.

**Kids' piggy bank.** Kids don't see a coin number on the home screen. In the Closet, an item they can't afford yet has a "Save up for this" button; the home screen then shows a bar filling toward it (no numbers), which glows when they have enough. Tapping the bar opens the Closet on that item. Buying it clears the goal.

**Back pay:** the first launch with the shop (per player, `db.shopV`) credits puzzles already solved at base rates: a daily at its daily rate if `solvedAt` is the puzzle's date, otherwise 3; Climb holds 2 (kids: 10 each, plus their 100). No clean bonus and no weekly back pay; weeks that already had 5 days are marked paid. A one-time "Welcome to the closet" sheet shows the total.

**Data** (per player db, additive): `coins`, `paid {pid:1}`, `weeks {"2026-W46":1}`, `owned [itemId]` (colors too: `"bandana:purple"`), `worn {head, neck, face, scene, frame}`, `scenes [sceneId]`, `frames [frameId]`, `goal` (kids' piggy-bank item), `shopV`, `settings.dressBoard`, `settings.sparkles`.

**Backup:** Settings → Backup. "Copy backup code" copies base64 JSON of every `corgidoku:*` key (all players). "Restore from code" checks the code, asks, replaces everything and reloads. Safari can clear a site's storage after 7 days without a visit unless it's on the Home Screen, so a backup protects the coins.

## Sniff (hints)

Sniff shows the **next logical move from the board as it is**: the player's corgis, the spots they rule out, red paws and plum paw marks. Brainstorm-color paws (blue, green, orange, magenta) are what-ifs, so Sniff ignores them. `sniff()` in `engine.js` asks the grader's own step finder (`findStep`) for the lowest rung of the SPEC ladder that makes progress (last spot, confined, would block, pair lock, group lock, what if), so the grader and the hint can never disagree.

- **Two taps.** Tap 1 dims the board except where to look and names the technique ("Look at the blue yard. (Confined)"). The button then says **Answer** with its price (or **Show me** when it's free or already paid): tap 2 shows the answer (a corgi spot ringed, or the spots to paw-mark with a dashed outline) and explains it in plain words, naming yards by color. A what-if shows see-through corgis: **?** on the spot being tested, **1, 2…** on the corgis it forces, and the row, column or yard that runs out of room striped in red. Any board change clears the highlights. To put a clue away without changing anything (say, after the lesson, when you'd rather work it out yourself), tap **Undo** or Cheddar's speech bubble: the first Undo only clears the clue and undoes nothing (since v1.27). A paid step stays paid, so **Show me** still works afterwards. If the board changes, the step can change, and a new step is a new Sniff.
- **Wrong paws first.** A plum paw on a real corgi spot would make any logic built on it false, so a Sniff that finds one takes off **every** such paw at once and makes them glow. The next Sniff gives a logic step.
- **Prices** (`sniffPrice(db, pid, part)` in `shop.js`): free in 🐣 Chill and 🌈 Cozy; 🔥 Hard **25** and ⚡ Extreme **50** coins per step, for kids too, in dailies, past days, Climb holds and Bonus Yards. Since v1.28 the price is split to favor learning: tap 1 (where to look + the technique) is **1/5** (Hard 5, Extreme 10) and tap 2 (the answer) the other **4/5** (Hard 20, Extreme 40). Each paid tap asks first ("Sniff for 5?", "Answer for 20?"). Wrong plum paws cost the tap-1 price. There's no free peek any more: a player who can't afford a tap gets a message saying what it costs. A puzzle that already paid out (a replay after Start over) has free hints. The next tap's price sits under the nose on the button, greyed when the player can't afford it. Saved steps from before v1.28 (`{k, s, f}`) load as `{k, a}`: a whole paid step keeps its answer free; a free peek needs the answer bought.
- **Paw color** resets to plum every time a level opens and on Start over (v1.28).
- **Can't afford it:** the "where to look" tap is a free peek; the answer stays locked, and the button greys out with its price.
- **Clean bonus:** hints never affect it (clean still means zero mistakes).
- The Sniff button's icon is a drawn chibi dog nose (`sniffIcon()` in `art.js`). The last Sniff's step is saved with the puzzle's progress (`sn`), so leaving and coming back keeps a paid answer free.

## Cheddar's tricks (v1.35)

Short lessons, one per rung of the SPEC ladder: **The rules, Last spot, Confined, Would block, Pair lock, Group lock, What if** (What if in three parts since v1.36; see below). Each has **Show it** (a tiny board with the trick in a sentence or two and the cells that matter outlined), **Watch it** (one move in three frames with Back/Next: where to look, why, the move made) and **10 practice boards**. The plan is `corgidoku-tutorial-plan.md` in the Corgidoku project; `tricks.js` is the UI, `lessons.json` the boards.

- **Where:** a 🎓 Tricks pill on home and a button on How to play open the **Cheddar's tricks** page. It groups the lessons by track (Chill 0–3, Cozy 0–4, Hard 0–5, Extreme 0–6), only for the modes the player can pick: the current mode's track first with every lesson, then the others with a row of ✓ chips and any lessons they add. A track whose lessons are all done shows "Ready for Cozy ✓" (also on the finish sheet the first time). Each lesson row shows ✓ Learned (and how many More practice boards), "Skipped · pick up at board 4", "Board 3 of 10" or the time and coins. A new lesson opens at Show it; any other opens a sheet: pick up at the first unfinished board, replay Show it and Watch it, or More practice once it has its ✓.
- **Pop-up card:** when a puzzle (daily, past day, Climb hold, bonus yard; not Wild Week) has a stored `lv` above the highest lesson the player has done or seen, Cheddar's bubble offers it: "New trick in this one: Pair lock. Lesson and practice, about 5 minutes?" with **Learn it** / **Not now**. It never blocks play: tapping the board counts as Not now. Not now waits 7 days for that lesson (`db.lessonSnooze[id]` = the date). Learn it opens the lesson with **Play my puzzle ›** under it (and on the back arrow), which goes back to that board.
- **Sniff link:** when Sniff's hint (either tap) uses a technique the player hasn't finished, "Learn this trick: Pair lock →" shows under Cheddar's bubble. It goes away with the clue (Undo, the bubble, any board change).
- **Welcome tour:** the first How to play sheet (a new player's first puzzle) offers **Take the tour 🎓**: The rules, then "Next trick: Last spot" from its finish sheet, then back to the puzzle. Existing players never see it (they have `seenHelp`).
- **Practice:** boards come from `lessons.json` in order (`main[0..7]`, then boards 9–10 for the track: the lesson's own track uses `main[8..9]`, others `finale[track]`; the track is the one the lesson was opened from, else the current mode's). The board is drawn like a game board: corgis, the paws the grader had worked out, and faint auto paws. The task sits above it with a count ("0 / 2"). The rules: tap a corgi that breaks a rule (either of the pair is right). Last spot: double-tap (a single tap is a scratch paw; a paw on the answer gets a nudge). Every other lesson: each tap paws a spot and is judged at once; What if takes any spot in `ok` (every spot that dead-ends within 6). Found answers are locked (green ring); wrong paws stay as marks (red dashed ring) until Undo or a second tap. No timer, no treats.
  - **Right tap:** the answer drawing from Sniff. Would block: a ghost corgi on the spot, its reach shaded, the emptied unit striped red, then the paw lands. What if: ghost corgis ?, 1, 2… to the striped dead unit. Confined and the locks: the step's area spotlighted. Cheddar says why (and how many are left).
  - **Wrong tap:** a ghost corgi on the spot with its reach shaded and the trick's spots that are still open glowing, and Cheddar says why it doesn't work (inside the unit itself; not in the line or yard the trick fills; a what if that runs out of forced corgis with room everywhere; a rules corgi that touches nothing). Nothing resets. The 2nd wrong tap on boards 7–10 brings the outline back; the 3rd offers **Show me**, which plays the answer and marks the board done with help.
  - **Outlines:** boards 1–6 and Show it outline the engine's `look` (the unit, the pair of corgis, or the lock's group); What if outlines the unit that runs out of room, since its `look` is the answer itself.
  - **Paw prints:** 10 along the top: filled = done alone, ringed = done with help, faint = not done.
- **Skip** is on every screen (Show it and Watch it too). It ends the lesson where it is; the boards not done stay open (`skipped`), and the lesson counts as seen. Picking it up goes straight to the first unfinished board. Leaving by the back arrow or Play my puzzle keeps the place too, without the Skipped label.
- **Coins:** 10 (kids 20) once per lesson, when all 10 boards are done with or without help (`lessonPay` in `shop.js`, guarded by `paid`). More practice and replays pay nothing. Each What if part is a lesson for this: all 9 lessons pay 90 (kids, who never see What if: 6 lessons, 120).
- **More practice:** a fresh set from the spare pool (`spares[more % spares.length]`: 8 boards plus boards 9–10 for the track), same ramp, no coins. Lessons 0–4 have 2 sets, Group lock and What if 4, then they come round again. Replaying a learned lesson's Show it and Watch it leads into More practice.
- **Kids** get the same lessons and all 10 boards, with their own shorter lines (colors instead of yards). Their tracks are Chill, Cozy and Hard; Chill comes first in Chill mode.
- **Data** (per player): `db.lessons[id] = { seen, done, at, board, help: [], skipped: [], paid, more, mb }`, ids `0`–`5` and `6a`/`6b`/`6c` (`board` = first unfinished board, `mb` = where the current More practice set picks up), `db.lessonSnooze`, `db.lessonBadges` (track badges already shown). All in the player's db, so backups include them.

### The boards (push 1)

- **`allSteps(B, cand, placed, level)`** in `engine.js` lists every step at one level, from the same code as `findStep` (now one `levelSteps` function), so they can't disagree. Level 3 steps are grouped by the unit that would be emptied (`cells` = every spot that would empty it); level 5 covers every group size; level 6 lists every starting spot that dead-ends within 6, with its depth. `grade()` takes `onStep(B, cand, placed, step)`, called before each step. Grader logs are byte-identical to before on all 4,950 shipped boards.
- **`tools/lessons.mjs`** makes about 50k fresh boards (5×5–10×10, `--seed 7`), skips any whose `canonicalKey` is in a shipped file (puzzles, bonus, Wild), and grades each. The state before each level-L step is a candidate for lesson L, kept only if one level-L step explains every level-L move (the answer is unique and its count honest). **What if** is the exception: almost every level-6 board has 5–30 spots that dead-end within 6, so a board is kept when one spot has the shortest chain (that's the answer and Show me); `ok` lists every spot that dead-ends, and any of them is a right tap. Lesson 0 takes a correct partial board and moves one corgi so exactly one pair breaks exactly one rule (`side`, `diagonal`, `row`, `column`, `yard`); `ans` is the pair, `moved` the corgi that moved.
- **The ramp** (tiers A = boards 1–3, B = 4–6, C = 7–8, D = 9–10): sizes per lesson are in `SIZES`, the form each board practices in `FORMS`, answer sizes in `ANS`. A and B have `help: "outline"` (`step.look`), C and D `"none"`. Board 9–10 sizes follow the track: Chill 6/7, Cozy 7/8, Hard and Extreme 9/10.
- **`lessons.json`** (version 2): `boards` (source `{n, r, s}`, each used once) and `lessons[]`: `{ id, name, tracks, show, main[10], finale: {track: [b9, b10]}, spares: [{ boards[8], finale: {track: [b9, b10]} }] }`. `main` boards 9–10 are for the lesson's first track (0–3 Chill, 4 Cozy, 5 Hard, 6 Extreme); `finale` has them for its other tracks. A board: `{ board, tier, help, n, src, c (corgis), p (deduced paws; auto paws come from the corgis), ans, count, form, fill (share of cells decided), step (findStep-style evidence) }`, plus `ok` (What if) or `moved/from/rule` (lesson 0). Spares: 2 sets for lessons 0–4, 4 for Group lock and each What if part. Yard colors on a lesson board are shuffled per board (`yardPerm('t:<src>')`), like puzzles.

### What if in three parts (boards push, 2026-11-27)

Plan: `corgidoku-whatif-plan.md`. The UI for the parts shipped in v1.36 (next section).

- **`lessons[6]`** is `{ id: 6, name: "What if", tracks: ["extreme"], parts: { a, b, c } }`. Each part has the usual shape: `{ part, name, show, main[10], finale: {}, spares: [4 × { boards[8], finale: { extreme: [b9, b10] } }] }` (40 spares per part).
- **6a When to use it ("Stuck or not?"):** states from boards that need a what-if (`lv` 6). Sizes 6, 6, 7, 7, 8, 8, 9, 9, 10, 10; spare sets draw their sizes at random leaning to 9×9 and 10×10 (weights 6:1, 7:1, 8:2, 9:3, 10:3, sorted), with the same mix shuffled. Each set has 4–6 **stuck** boards (`stuck: true`: no level 1–5 move; `step` is the shortest what-if, for after "Time for a what if"; `ans`, `ok`, `place` empty, `count` 0) and the rest **not stuck** (`form` = `n2`…`n5`, the easiest level; never a plain last spot; at least one Pair or Group lock per set). On a not-stuck board `ok` is every move a level 1–5 step makes (`place` = the ones that take a corgi, the rest are paws), `ans` and `step` are the grader's own step (Show me), and `count` is 1: one right move answers it. `help` is `"none"` on every 6a board, since an outline would give it away.
- **6b One forced corgi:** every chain 1 forced corgi; sizes 6, 6, 6, 7, 7, 7, 7, 8, 9, 10; outlines on 1–6 as before.
- **6c Longer chains:** boards 1–4 run 2 deep, 5–8 run 3, board 9 (9×9) 4 and board 10 (10×10) 5, in the main set and all 4 spare sets. `ok` is still every spot that dead-ends, so any right tap needs a chain at least that long.
- **The hunt** (`tools/hunt-chains.mjs`): fresh boards almost never stop where the shortest chain is 3+ (none at 4+ in 50k). It starts from a fresh board that needs a what-if, moves one yard cell at a time into a neighboring yard (keeping the answer, a unique answer, connected yards and a guess-free solve), and keeps the change when the board's best chain is no shorter; "best" = the deepest state whose shortest chain is held by one spot. Loops are bounded by counts, not time, so `--seed` fixes the file; `--scale` and `--workers` for a bigger run on the PC. Seed 7 gave 106 boards (6×6 d2, 7×7 and 8×8 d3–4, 9×9 d4, 10×10 d4–6).
- **Lessons 0–5 don't move:** the What if boards come from their own streams (`EXTRA` boards that need a what-if, own seeds and reservoirs, plus the hunt), so lessons 0–5 have the same 300 boards as push 1. Only their `src` numbers changed, which reshuffles their yard colors.
- **Tests:** 6a re-checks stuck (findStep at level 5 finds nothing, the stored what-if is Sniff's) and not stuck (`ok` = every level 1–5 move, corgi moves on the answer and paws off it, Show me re-checked from SPEC), and that the source board needs a what-if; 6b/6c check each board's depth; every set's mix; at least 10 chains 4–5 deep. Planted faults (a flipped stuck flag, a dropped right move, a not-stuck board marked stuck, a set with no stuck boards, a shallow board in 6c's slot 9, a depth-2 board in 6b, a wrong paw) were all caught.

### What if in three parts: the UI (v1.36)

- **Three lessons.** What if is now `6a` **When to use it**, `6b` **One forced corgi** and `6c` **Longer chains** (`PARTS` in `tricks.js`), each with its own Show it, Watch it, 10 practice boards, Skip, More practice, ✓, record and 10 coins. `tricks.js` reads `lessons[6].parts.{a,b,c}`; "lesson 6" (a puzzle's `lv`, a Sniff step's level) means What if as a whole, done when all three are (`trickDone(6)`), and `openLesson(6)` opens the first unfinished part.
- **Page:** the Extreme track lists the rows **6a What if: When to use it**, **6b What if: One forced corgi**, **6c What if: Longer chains** after Group lock (9 lessons; "Ready for Extreme ✓" needs all three). Other tracks' Extreme card shows chips `0`–`5`, `6a`–`6c`.
- **6a "Stuck or not?"** No outline anywhere (it would give the answer away). Show it is a stuck board; Watch it: try the easier tricks → none works, that's stuck → the what if on the ? spot. Practice: the task "Stuck or not? If an easier trick works, paw a spot it rules out. If none works, tap Time for a what if." and a **🤔 Time for a what if** button beside Undo.
  - **Not stuck:** a paw on any spot in `ok` answers the board (one move). Cheddar explains it with the easier step that rules that spot out (`stepAt`: `allSteps` levels 1–5 from the board as it stands) in that trick's own words and drawing, then "Not stuck: no what if needed." The button is a miss ("Not stuck yet: an easier trick works on this board."); from the 2nd miss on that board Cheddar names the trick ("Look for a Pair lock."). Any other spot is a miss ("No trick from Last spot to Group lock rules that spot out.").
  - **Stuck:** the button is right; Cheddar plays the stored shortest what if (ghost corgis to the striped dead unit), paws its spot and the board is done. A paw on a spot is a miss; if that spot does dead-end in a what if, Cheddar says so and points to the button.
  - The 3rd miss offers **Show me** (stuck: the what if; not stuck: the grader's step, dashed paws).
- **6b and 6c** play like the v1.35 What if (any spot in `ok`, the chain drawing, the outline of the dead unit on boards 1–6). 6c's Show it and Watch it run a 2-deep chain; its boards 9–10 run 4 and 5 deep.
- **Finishing 6a or 6b** offers **Next part: One forced corgi ▶** / **Next part: Longer chains ▶** (when that part isn't done yet) above More practice.
- **Pop-up card and Sniff link:** a What if puzzle offers What if while any part is still new (not seen or done), and always the **first unfinished part**, so the order holds: "New trick in this one: What if. It has three short parts. Start with part 1: When to use it?", later "This one needs What if. Ready for part 2: One forced corgi?". The snooze is per part. The Sniff link reads "Learn this trick: What if, part 2 →". Lessons 0–5 are offered as before (a seen What if part counts as level 6 for them).
- **Migration** (`migrateLessons`, on every load, idempotent): a player with the v1.35 What if ✓ (`db.lessons[6].done`) gets **6b ✓** with `paid` set (its coins kept, no second payment), `help` and `more` carried; 6a and 6c start fresh. Anything short of a ✓ carries nothing (Jonathan's call). `db.lessons[6]` is removed, a What if snooze moves to `6a`, and `lessonBadges.extreme` is cleared so "Ready for Extreme ✓" shows again once all three parts are done.

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

**Summit frames.** A 5px gradient ring around the board (rainbow, gold or starlight), a soft glow, and 4-point sparkles on the ring's corners and edges, never over the cells. **Since v1.29 they move all the time**, because they're the hardest things to earn: the Rainbow's colors chase around the ring (one lap every 7 s), a glint sweeps around the Gold ring every 5.5 s and then rests while its sparkles pop now and then, and on Starlight two soft lights drift around (12 s) while the sparkles twinkle and drift. How: `.fring` is a layer under the board (`z-index` 0, the board is 1) that clips a 150% square (`.fring i`) holding a conic gradient (`--fspin`), and only its `transform`/`opacity` animate, so the cells never repaint. The motion pauses while a sheet covers the play board (`body.sheeted`) and while the app is in the background (`html.hid`). The Closet's Frames tab and the unlock sheet move too. The burst when a puzzle opens and when it's solved still plays on top. Settings → **Frame sparkles** (was "Summit sparkles", same `settings.sparkles` key; on by default) off = a still ring with no sparkles and no motion. `prefers-reduced-motion` keeps the sparkles but stops all of the motion.

**Closet.** Scenes and Frames tabs. **Tapping anything you own puts it on right away** (outfits too, and Pink / No frame / Nothing), with no button to press. Tapping something you don't own previews it and shows a bar pinned to the bottom of the screen: Buy (with a confirm), Save up for kids, or for scenes and frames where to earn them. Locked scenes and frames are grey with a lock and "Hard Climb · hold 60", and never have a Buy button. The Frames tab shows a little solved board in the frame. Kids only see what their climbs can give (The Moon and Starlight need Extreme, so they're hidden for them).

**Win timing.** The win sheet (and any unlock sheet) waits until the board party and Cheddar's zoomies finish: 3.5 s, up to about 4 s on a 10×10. With `prefers-reduced-motion` it's 0.7 s.

## Field research reports

Settings → Field research mode asks for a 1–10 difficulty rating after each solve. Send report shares one CSV line per solved puzzle: `mode,id,size,lv,steps,secs,mistakes,hints,rating,date,chains,depth,maps` (`chains,depth` are only filled for Extreme what-if boards; `maps` only for Wild Week boards, whose mode is `wild-cozy`, `wild-hard` or `wild-extreme`). `lv` and `steps` come from the grader, so ratings vs `lv`/`steps` show how well the grader's difficulty matches how hard it felt.

## Wild Week (v1.31)

One week only, **Monday 2026-11-23 to Sunday 2026-11-29**, grown-ups only (kid players never see it). Each day opens a set of three **Wild** puzzles on top of the normal dailies. A Wild puzzle is **one board with several yard maps that take turns**: one set of corgis and paws, and every 15 seconds the yard map under them swaps. No smaller set of maps has only one answer, so you learn from each map and carry what you found (as paws) to the next.

| Tier | Maps | Size | No smaller set is enough | Coins (clean +6) | Prize for all 7 |
| --- | --- | --- | --- | --- | --- |
| 🌈 Cozy | 2 | 8×8 | each map alone has 2+ answers | 20 | Pink rave shades |
| 🔥 Hard | 3 | 9×9 Mon–Wed, 10×10 Thu–Sun | every pair of maps has 2+ answers | 30 | Rainbow rave shades |
| ⚡ Extreme | 4 | 10×10 | every trio of maps has 2+ answers | 40 | LED rave shades |

- **Unlocking** (`wildOpen` in `shop.js`, also guarding `play()`): each day's set opens on its date (the phone's local date). Within a day the tiers open in order: Cozy, then Hard once that day's Cozy is solved, then Extreme. Every open day stays playable until the week ends (catch-up), and on Sunday all 21 can be played. The week ends Sunday 11:59 pm; after that nothing is playable and the prizes can't be earned. A puzzle that's open when the deadline passes ends with a "Wild Week is over" sheet.
- **Where:** a rainbow Wild Week card on home (Default player, during the week) with today's three tiers (✓ / ▶ / 🔒), the deadline pill ("Limited time · ends Sun Nov 29, 11:59 pm", "2 days left" on Saturday, "Last day!" on Sunday) and how many are open. It opens the Wild Week screen: the three prizes on Cheddar with 7 pips each, then Monday to Sunday with a button per tier (solved: ✓ and the time; open: maps and size; locked: "Beat Cozy first"; future: greyed, "Opens Thu"). The first launch during the week shows a one-time "Wild Week is here!" sheet (`db.seenWild`).
- **Playing:** map chips above the board ("Map A", "Map B", "Map C"; Extreme just "A B C D"), the one on screen ringed in its color, and a rainbow bar draining over 15 s. In the last 3 s the bar and number turn pink and pulse and the board glows pink. The swap is a 0.36 s flip (the new map is painted halfway) and a short buzz. **Taps and Undo are ignored from 0.3 s before to 0.3 s after a swap.** Marks are shared; a corgi's auto paws cover its row, column, 8 neighbors and **its yard in every map**. Wrong corgis cost a treat as usual; Snack break and Start over go back to map A. **No Sniff:** its spot is **Pause**, which covers the board and stops the clock and the swap timer. The swap timer also stops while a sheet is open or the app is in the background. Progress saves the map on screen (`wm`) and the seconds left (`wl`).
- **The Wild win party** is longer than the normal win and builds with the tier: the rainbow wave runs twice with sparkles bursting out of the board; then an overlay with a spinning rainbow burst, confetti and flying party-hat corgis (Cozy 14, Hard 24, Extreme 36) that rain down spinning and zoom across both ways. The card pops in 1 s later: Cheddar in his outfit with a party hat, "WILD WIN!", the coin count-up with the sum, the prize progress row, and buttons for the next thing that opened (or the next open Wild puzzle) and Home. Extreme adds rainbow fireworks on one canvas (one every 0.5 s for 6 s, a three-burst finale, then one every 1.5–2 s), aimed above and below the card. Everything runs until a button is tapped and pauses in the background. Reduced motion: just the card and the numbers.
- **Coins:** each Wild puzzle pays once, double a today's daily (Cozy 20, Hard 30, Extreme 40, clean 3 × 2 = 6), on any day of the week. Ids `w:<date>`, `hw:<date>`, `xw:<date>`. They count in that mode's Solved but **not** for the streak or the 5-of-7 weekly bonus.
- **Prizes (time-limited, Wild Week only):** solve all 7 Wild puzzles of a tier by Sunday 11:59 pm to win its **rave shades** (face slot, drawn in Sticker style as shutter shades: Pink = solid hot pink; Rainbow = purple frame, red/yellow/green/blue slats; LED = black frame with bead strips chasing through the rainbow by SMIL `<animate>`, 1.8 s, each row 0.3 s behind, dropped for reduced motion). `syncUnlocks` grants them from `progress` (7 solved Wild pids of the tier with `solvedAt` on or before 2026-11-29, which survives Start over), then a "New shades!" sheet offers **Wear them** / **Later**. They can't be bought and have no colors. During the week the Closet's Face tab shows the three as locked tiles with "Wild Week prize · ends Sun Nov 29" and the progress; after it, earned shades stay with a "Wild Week 2026" tag and unearned ones disappear.
- **Puzzles** (`wild.json`, built by `node tools/generate.mjs --wild --start 2026-11-23 --days 7` in under a minute): each map is grown around the same random answer, and a set is kept only if every smaller set of its maps still has 2+ answers, all the maps together have exactly one, and `gradeWild` (which solves **seeing one map at a time**, switching when stuck) lands in the tier's window: Cozy level 3–4 (graded up to level 4), 14–24 steps, 2+ switches; Hard level 4–5, 9×9 20–34 / 10×10 22–36 steps, 3+ switches, 2+ steps from every map; Extreme level 4–5, 26–40 steps, 4+ switches, 3+ steps from every map. Each day aims at its share of the step window, so the week ramps up Monday to Sunday. Yard letters are shuffled per map, and no Wild map repeats a board from any other file. `verify.mjs wild.json` checks it independently.
- **Share cards (v1.33, `share.js`):** a **📤 Share** button on the Wild win card (and in Pause's spot on a solved Wild board) and **📤 Share my week** on the Wild Week screen open a sheet with a 1080×1350 PNG and a text version. The win card: tier pill, Cheddar in his outfit with the party hat, "WILD WIN!", tiles for time, map flips, mistakes and **flips / corgi** (flips ÷ n, rounded to a whole number, so bigger is worse), the prize row and "One answer, four maps. No hints." The week card: "20 of 21", the three shades on Cheddar (earned in color, the rest greyed with progress), the 7×3 grid of times, and tiles for fastest Cozy, fastest Extreme, total map flips and total mistakes. No spoilers: no board, map or corgi spot. Drawn with the 2D canvas only (system rounded font, Cheddar as a standalone SVG Image with the die-cut filter inlined and the LED `<animate>` dropped). The PNG is built when the sheet opens and **Share card** only turns on once it's ready, so the tap that opens the share sheet is the user's; without file sharing the picture shows with "Press and hold to save". **Share as text** uses the share sheet, else the clipboard.
- **Map flips (v1.33):** each swap counts in `fl` until the first solve (Start over and Snack break don't reset it, like the clock). Solves from before v1.33 have no `fl` and are estimated as `floor(best / 15)`, shown with ≈; a puzzle in progress at the update starts from `floor(elapsed / 15)` and is marked `fe`. The field report has a `flips` column.

**Yard colors (v1.31).** Every shipped board grew yard k from row k's corgi, so the color gave the row away (the pink yard's corgi was always in row 1). The app now shuffles the yard colors per puzzle with a permutation of the first n colors seeded by the puzzle id (`yardPerm` in `app.js`), used for the board and for Sniff's color names. No puzzle file changed, so saved progress is untouched.

## Releasing

Bump `VERSION` in `app.js` and `CACHE` in `sw.js` together. The version shows faintly at the bottom of the home screen; tap it to clear the cache and reload.

**Offline and weak signal (`sw.js`):** every file is saved on install. Requests go to the network first, but if there's no reply within 3 s the saved copy is used and the late reply still refreshes the cache, so a new push shows up on the next open. When the page itself came from the cache, the files it loads in the next 10 s do too, so a release never mixes old and new files. Add new files to `FILES` in `sw.js`.

## Special dates

The 2026-11-11 week gets easy puzzles and a get-well banner. The Nov 11 "Thinking of you" banner, the "Rest up!" win line (Nov 11–17), and the June 15 birthday banner, win line and party hat only show when the Default player's name is Halina (case doesn't matter). The easy puzzles on those days are in the shared daily file, so every player gets them. The "Cozy rainbow week" banner (Nov 12–17) still shows for any Default player. Every June 15 gets a birthday banner, an easy puzzle and a party hat for Cheddar. Messages live in `specialBanner()` and `winLine()` in `app.js`; the schedule lives in `want()` in `tools/generate.mjs`.
