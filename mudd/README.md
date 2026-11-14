# MUDD

A tiny text-adventure engine with an early-90s floppy-disk feel, and its first
game, **The Dragon of El Morro**. The engine holds no places, creatures, or
names: a game is one folder under `games/`, and every run is dealt from it.

Play it at `https://brothernod.github.io/PhoneApps/mudd/`. On iPhone or iPad,
open it in Safari, then Share → Add to Home Screen so it runs full-screen and
keeps its saves.

## What's playable now

Phases 1 and 2 of the completion plan are built. A run has its full shape,
with two places and two dragons so far:

- **Museum.** Doña Luz hands over the casebook, and the empty shell gives the
  first clue
- **The map.** He picks the next stop from the places on offer and sees each
  drive time. Two pool places: Old San Juan streets and the sentry box at El
  Morro, each with two puzzles. One puzzle earns a clue, the other a lock number
- **The casebook.** The CASEBOOK button opens it any time, even in the middle
  of a puzzle: clues, lock numbers, stars, and the lineup of all eight
  dragons, which he can cross out
- **Case File.** He names the dragon from the lineup. A wrong pick is a drive
  to that dragon's home, a real animal with a true fact, and the clue that
  didn't fit
- **The lair.** Each dragon has its own: the iguana dragon in the big plaza
  tree (spot the tail), the anole dragon on El Morro's sunniest wall (count
  its push-ups and tap them back). Then **the rescue**, in Spanish sentences
- **Home.** The **Code Lock** on the nest case, three endings by the clock,
  and a gold, silver, or bronze egg for the run. The best egg is kept on the
  dragon's Field Guide page
- Puzzles so far: **Dragon Hoard**, **Colores**, **Fact or Fib**, **the
  rescue**, and **Code Lock**. A first-try solve earns a star
- Old San Juan and the sentry box use trip photos. All nine trip scenes are in
  the pack; the other seven wait for their places
- A caught list that carries across runs, a sunset clock, FM-synth music,
  autosave and Continue
- Difficulty that steps up after 2 right in a row and down after 2 misses
- Grown-up screen: **hold the top-left corner for 3 seconds**. It has a
  CHECK PICTURES page that shows every scene and dragon in the pack

## A game pack

Prose lives in ink, data lives in YAML, and code lives in the engine.

| File in `games/el-morro/` | What it holds |
| --- | --- |
| `game.yaml` | Title, cast, clock, the run shape (hub, pool, places per run), the traits clues reveal, the eggs a run can earn, the words around the story, and the picture list |
| `scenes/<id>.ink` + `scenes/<id>.yaml` | One scene card per place: the prose, plus its puzzle slots, toys, drive time, and spot on the map. Tags are listed at the top of `scenes/museum.ink` |
| `creatures.yaml` | The creatures: traits and clue lines, sprite, lair, the detour when one is named by mistake, and Field Guide entry |
| `banks.yaml` | Word-problem templates, Spanish words and sentences, facts and fibs, puzzle wording, and tunes |
| `pics/` | Scene art: 320×200 PNGs, plus `drawn.js` for the scenes, the map, and the creatures drawn in code |

A place card never names the creature or a puzzle. It marks a puzzle moment
with `# slot: cart`, a clue with `# clue`, and a lock number with `# digit`,
and the dealer fills them in. A place gives one clue and one lock number. The
clues come out in a dealt order: the hub gives the first, each place the
next, and once a creature's traits are all out, the next clue is its `sign:`.

To add a place: write its two files in `scenes/`, add its id to `run.pool` in
`game.yaml`, give it `map: [x, y]`, and put its picture in `pics/`.

To let a creature hatch: write its lair card (`role: lair`, with a `rescue`
slot and, if you like, a toy), and name the card under `lair:` in
`creatures.yaml`. Until then the creature is in the lineup but is never
dealt. A lair belongs to one creature, so its card may name it.

| File in `engine/` | What it does |
| --- | --- |
| `pack.js` | Loads a pack, joins its scene cards into one ink story, and checks every reference |
| `dealer.js` | Deals a run from the quest number: the creature, the order places come up on the map, a puzzle for each slot, the clue order, and the lock |
| `quest.js` | Plays a dealt run: hub, map and places, case file and detours, lair, home, and the rating. Also the casebook |
| `puzzles.js` | Puzzle rule sets. Each makes a puzzle for a shared answer screen |
| `screen.js`, `art.js`, `sound.js` | The screen, puzzle card, map, casebook and lair toys; pictures; and music |
| `main.js` | Wires it together: title, saves, profile, Field Guide, grown-up screen |

There is no build step. The ink compiles in the browser, so editing a file and
pushing is enough. If the pack has a mistake, the boot screen names the file
and line.

## Check before pushing

Needs Node:

```
node mudd/tools/botplay.mjs el-morro 1000
```

The bot checks the pack, then plays 1,000 dealt runs, picking places on the
map and now and then naming the wrong dragon, and quitting and continuing
along the way. It also plays every creature with every place and slot
combination, every wrong guess, and runs that start late enough to come home
after sunset. It fails on a missing card, slot, bank, tune, or picture; ink
that doesn't compile; a dead end; a part of a card, a toy, or an egg no run
reaches; a case file that opens before every clue is found; a lock whose code
isn't the numbers found; a puzzle question longer than four lines on an
iPhone; a fact without a source; and anything from the pack hard-wired into
the engine.

## Not built yet

Phases 3 to 6 of the completion plan: fifteen more puzzle kinds and the
harder Spanish; the other eight places and six lairs; the event deck and
treats; both mother-dragon endings; the password backup; and a blank game
pack. Until the pool has more than three places, a run visits all of it.

## Credits

- [inkjs](https://github.com/y-lohse/inkjs) (MIT), ink by inkle
- [js-yaml](https://github.com/nodeca/js-yaml) (MIT)
- Font: VT323 by Peter Hull (OFL), bundled in `vendor/`
