# Nala's Bonk Golf — Build Plan

A small, silly phone game for Ashley (and Corbin) about **Nala**, their shar-pei who recently went blind and now ping-pongs around the house. It should be light-hearted and fun, not sad.

**Each phase runs in its own fresh conversation.** Start a phase by reading this file. Finish it by updating this file (tick boxes, fill in the Phase log) and committing + pushing to `main`. **Commit and push after every meaningful step**, not only at the end. A session can hit its token budget at any time, and unpushed work is lost.

- Repo: `brothernod/PhoneApps` (served on GitHub Pages) → folder `NalaGolf/`
- Live: `https://brothernod.github.io/PhoneApps/NalaGolf/`
- Art style options (Design canvas): https://claude.ai/artifact/B6K5u2dghaGohhQ8vztego
- Proof of concept: the current `NalaGolf/index.html`, a single file that already works

---

## Locked decisions (from Jonathan)

- **Mechanic:** top-down golf. Drag back anywhere on the screen, then release to fling Nala. The house is pitch black. Bonking into things sends out a sonar ping that briefly reveals nearby edges, and the thing she hit glows with its name.
- **Win:** Nala only has to **touch** the goal (she'd climb into her bed if she found it). She doesn't have to stop on it.
- **Lose → retry:** the game is about learning by dying, Dark Souls style. Running out of moves sends Nala back to the start, and the player learns the map by getting further on each try.
- **Scent hint ON** by default: the goal pulses faintly, more strongly as she gets close.
- **Ghost memory OFF** by default. Remove it from the player settings, or hide it behind a debug flag.
- **Moves:** 3 per try (tunable).
- **Hidden treat** on each level: touching it gives **+1 move** for that try. Its job is to tempt "one more move".
- **Stella** (their pitbull, **thin and all grey**, long narrow face, no white markings) appears in the level. Touching her triggers a motivational line and a little bark burst ("BORF!"), worth **+1 move**, once per try.
- **Binx** (their **black cat**, yellow eyes) appears in the level. Touching him triggers a smack, worth **−1 move**, once per try. He should look like a regular black cat.
- **5 levels** total. These are made-up houses (we don't know Ashley and Corbin's real layout).
- **Each level** opens with Ashley giving directions in her own voice ("Hey Nala, it's bedtime! Turn right at the coffee table…"), with an optional read-aloud button.
- **Each level** ends with a sped-up instant replay of every try and bonk, followed by a results card (bonks, most-bonked thing, casualties, a funny title).
- **Knock-overs:** some things fall over when she hits them hard enough, such as lamps, the plant, the trash can, the water bowl and the laundry basket. They play a crash and a message, and stay knocked over for the rest of the level.
- **Feedback from the POC:**
  - On iPhone it's hard to pull back far enough when Nala starts near the bottom of the screen. Fix: full power with a **short drag (~80–90 px)**, and let the drag start anywhere.
  - POC level 2 (treat under the kitchen table) was too tight and needed a perfect game. Give more room.

## Nala's look (from Jonathan's photo)

- Rich **apricot / red-fawn** coat (about `#c98446` body, `#cf8c4c` head), stocky build.
- **Heavy forehead wrinkles** and a thick **roll of neck folds** behind the head.
- Small, tight, folded ears.
- Dark **"hippo" muzzle**: a broad muzzle with a darker brown nose area (`#5b3220`) and a near-black nose.
- Blind: eyes drawn as closed/sleepy marks.
- Top-down vector reference: the Nala group in the Design canvas boards (`project/Main.dc.html` on the canvas).

## Art style

**Chosen style: _NOT YET PICKED_.** The five options are on the Design canvas:

1. Daredevil Sonar
2. Glow-in-the-Dark Neon
3. Bedtime Storybook
4. 16-bit Pixel
5. Chalk Mental Map

Jonathan fills this in before Phase 2. Phase 1 does not depend on it.

---

## Phases

Each phase has a ready-to-paste kickoff prompt. Paste it into a new conversation with this repo attached.

### Phase 1 — Core rework (mechanics, no art) · effort: **medium**

Kickoff: `Read NalaGolf/PLAN.md in brothernod/PhoneApps and do Phase 1.`

- [ ] Split `index.html` into `index.html` (shell + CSS), `game.js` (loop, physics, input, states), `levels.js` (level data only), `audio.js` (synth sfx), `render.js` (all drawing). This keeps later phases cheap to load. Keep it dependency-free with plain `<script>` tags.
- [ ] Aiming: full power at ~85 px drag. The drag can start anywhere below the HUD. Show the power %.
- [ ] Remove ghost memory from settings (keep the code behind `DEBUG`). Make sure scent hint is on by default.
- [ ] New entity types in level data: `treat` (pickup, +1 move, then disappears for that try), `stella` (bump → line + "BORF!" + +1 move, once per try), `binx` (bump → "SMACK" + −1 move, once per try; he bounces Nala hard). Use placeholder circles for art.
- [ ] Give the move counter visible feedback for +1 and −1 (a paw pops in or pops out).
- [ ] If Binx takes the last move mid-roll, Nala finishes her current roll and then the try ends.
- [ ] Record pickups and smacks in the replay events so the replay shows them.
- [ ] Add a pool of ~10 Stella lines and ~6 Binx lines (affectionate and funny).
- [ ] Save the best result per level (fewest tries, fewest shots) in localStorage, wrapped in try/catch.
- [ ] Keep the 2 POC levels working (loosen POC level 2). Add a treat, Stella and Binx to each for testing.
- [ ] Headless smoke test: Playwright loads the page, makes a shot, forces a win, and the replay runs with no console errors.
- [ ] Commit + push. Update the Phase log.

### Phase 2 — Art pass in the chosen style · effort: **high**

Kickoff: `Read NalaGolf/PLAN.md in brothernod/PhoneApps and do Phase 2. Art style: <name>.`

- [ ] Rewrite `render.js` drawing in the chosen style. Match the matching Design canvas board for palette, fonts and treatments, and use the "Nala's look" spec above.
- [ ] Draw Nala in that style: walking pose, squash on bonk, dizzy stars, and a flop on fail.
- [ ] Draw Stella (thin, grey) and Binx (black cat, yellow eyes), plus their pop-up toasts.
- [ ] Draw furniture in the "lights on" view (replay and win) so each item reads clearly: couch, coffee table, dresser, bed, space heater, lamps, plant, TV stand, fridge, counter, kitchen table, chairs, trash, water bowl, laundry basket, shoes, radiator, toys.
- [ ] Redo the sonar reveal, BONK words, knock-over debris and the scent hint in the style.
- [ ] Restyle the HTML cards (intro, fail, results, settings) and the HUD to match. Use Google Fonts via `<link>`.
- [ ] Keep it at 60 fps on iPhone. Avoid per-frame canvas `filter` and shadows on many objects; cache static layers offscreen.
- [ ] Screenshot both test levels and commit + push.

### Phase 3 — Five levels · effort: **medium-high**

Kickoff: `Read NalaGolf/PLAN.md in brothernod/PhoneApps and do Phase 3.`

- [ ] Replace the POC levels with 5 levels that ramp in difficulty. Suggested set (adjust freely):
  1. **Bedtime** — living room → bedroom. Teaches aiming. Binx asleep off to the side.
  2. **Breakfast** — bedroom → kitchen food bowl. Stella in the hallway.
  3. **Potty Break** — find the back door. Mudroom clutter, a laundry basket to knock over.
  4. **Treat Heist** — the treat jar's on the coffee table side; squeeze under the dining table. Binx guards a chokepoint.
  5. **Zoomies** — the whole house, longest route, everything knock-over-able, then the bed for the finale.
- [ ] Each level gets: Ashley's directions (her voice, correct left/right from Nala's heading), a hidden treat, Stella and Binx placements, 2–4 knock-overs, and a name and emoji.
- [ ] Solvability check: a Node script runs the physics headless and tries random shots. Confirm each level is beatable in ≤3 moves without perfect aim, and that the treat is reachable. Record the solve-rate per level in the Phase log.
- [ ] Gaps at least 3× Nala's diameter unless a squeeze is the point of the level.
- [ ] Commit + push after each level.

### Phase 4 — Polish + gift wrap · effort: **medium**

Kickoff: `Read NalaGolf/PLAN.md in brothernod/PhoneApps and do Phase 4.`

- [ ] Title screen: "Nala's Bonk Golf", with a dedication "For Ashley & Corbin (and Nala, Stella & Binx)" and Play / Level select.
- [ ] Level select with best results. Levels unlock in order, plus a toggle to unlock all.
- [ ] Ending after level 5: a credits roll with the cast and a total-bonks stat.
- [ ] Sound pass: volume balance, a mute toggle remembered across visits, and a note that the iOS silent switch mutes web audio.
- [ ] PWA: `manifest.webmanifest` and apple-touch-icon (Nala's face in the chosen style), add-to-home-screen friendly, safe-area insets.
- [ ] Add a `README.md` in `NalaGolf/` covering how to play and how to add levels.
- [ ] Add a link to the repo root `README.md`.
- [ ] Final Playwright smoke run on all 5 levels, then commit + push.

---

## Phase log

Update this after every phase: what was done, what changed from the plan, and any open issues.

- **Phase 0 (done, 2026-11-16):** Single-file POC with 2 levels, sonar pings, knock-overs, replay, results and workshop settings. Pushed as `NalaGolf/index.html`. Five art-style boards are on the Design canvas, with Nala, Stella and Binx updated to match the photos and descriptions.
