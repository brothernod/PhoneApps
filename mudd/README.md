# MUDD

A tiny text-adventure engine with an early-90s floppy-disk feel, and its first
game, **The Dragon of El Morro**. The engine holds no places, creatures, or
names: a game is one folder under `games/`, and every run is dealt from it.

Play it at `https://brothernod.github.io/PhoneApps/mudd/`. On iPhone or iPad,
open it in Safari, then Share → Add to Home Screen so it runs full-screen and
keeps its saves.

## What's playable now

Phase 1 of the completion plan (Foundation) is built. The game is still the
10-minute slice, but it is dealt from data:

- Museum → Old San Juan → the big plaza tree → home, with one creature (the
  iguana dragon) and three puzzles: **Dragon Hoard** (word problems, number
  pad), **Colores** (Spanish colors), **Fact or Fib** (sourced animal facts)
- The dealer builds each run from the quest number: the creature, the places,
  the puzzle in each slot, and the order the clues come out
- Old San Juan uses a trip photo. All nine trip scenes are in the pack; the
  other eight wait for their places
- Puzzles open on a card that rises over the scene, so the question never
  scrolls. A miss puts a hint under the question; a second miss shows the answer
- A caught list that carries across runs, the Dragon Field Guide, a sunset
  clock, FM-synth music, autosave and Continue
- Difficulty that steps up after 2 right in a row and down after 2 misses
- Grown-up screen: **hold the top-left corner for 3 seconds**. It has a
  CHECK PICTURES page that shows every scene in the pack

## A game pack

Prose lives in ink, data lives in YAML, and code lives in the engine.

| File in `games/el-morro/` | What it holds |
| --- | --- |
| `game.yaml` | Title, cast, clock, the run shape (hub, pool, places per run), the words around the story, and the picture list |
| `scenes/<id>.ink` + `scenes/<id>.yaml` | One scene card per place: the prose, plus its puzzle slots and drive time. Tags are listed at the top of `scenes/museum.ink` |
| `creatures.yaml` | The creatures: traits and clue lines, lair, and Field Guide entry |
| `banks.yaml` | Word-problem templates, Spanish words, facts and fibs, puzzle wording, and tunes |
| `pics/` | Scene art: 320×200 PNGs, plus `drawn.js` for scenes drawn in code |

A scene card never names the creature or a puzzle. It marks a puzzle moment
with `# slot: cart` and a clue with `# clue`, and the dealer fills them in.
To add a place: write its two files in `scenes/`, add its id to `run.pool` in
`game.yaml`, and put its picture in `pics/`.

| File in `engine/` | What it does |
| --- | --- |
| `pack.js` | Loads a pack, joins its scene cards into one ink story, and checks every reference |
| `dealer.js` | Deals a run from the quest number |
| `quest.js` | Plays a dealt run, stop by stop |
| `puzzles.js` | Puzzle rule sets. Each makes a puzzle for a shared answer screen |
| `screen.js`, `art.js`, `sound.js` | The screen and puzzle card, pictures, and music |
| `main.js` | Wires it together: title, saves, profile, grown-up screen |

There is no build step. The ink compiles in the browser, so editing a file and
pushing is enough. If the pack has a mistake, the boot screen names the file
and line.

## Check before pushing

Needs Node:

```
node mudd/tools/botplay.mjs el-morro 1000
```

The bot checks the pack, then plays 1,000 dealt runs plus every creature, place,
and slot combination, quitting and continuing along the way. It fails on a
missing card, slot, bank, tune, or picture; ink that doesn't compile; a dead
end; a part of a card no run reaches; a puzzle question longer than four lines
on an iPhone; and anything from the pack hard-wired into the engine.

## Not built yet

Phases 2 to 6 of the completion plan: the map, casebook, Case File, lairs and
rescue; the other seven creatures and nine places; fifteen more puzzle kinds;
the event deck; the password backup; and a blank game pack.

## Credits

- [inkjs](https://github.com/y-lohse/inkjs) (MIT), ink by inkle
- [js-yaml](https://github.com/nodeca/js-yaml) (MIT)
- Font: VT323 by Peter Hull (OFL), bundled in `vendor/`
