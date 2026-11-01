# MUDD

A tiny text-adventure engine with an early-90s floppy-disk feel, and its first
game, **The Dragon of El Morro**. This folder is the vertical slice: one land
(Old San Juan) and three puzzles, about 10 minutes of play.

Play it at `https://brothernod.github.io/PhoneApps/mudd/`. On iPhone or iPad,
open it in Safari, then Share → Add to Home Screen so it runs full-screen and
keeps its saves.

## What's in the slice

- Boot screen, title, and a naming screen (names stay on the device, never in the repo)
- Museum opening → disk swap → Old San Juan streets → plaza → the hatchling → home
- Puzzles: **Dragon Hoard** (word problems, number pad), **Magic Words**
  (Spanish colors), **Fact or Fib** (sourced animal facts)
- A miss gives a hint and a second try; a second miss explains the answer
- Sunset clock, clues, a Dragon Field Guide, FM-synth music, autosave and Continue
- Difficulty that steps up after 2 right in a row and down after 2 misses
- Grown-up screen: **hold the top-left corner for 3 seconds**

## Editing

Prose lives in ink, data lives in YAML, and code lives in the engine.

| File | What it holds |
| --- | --- |
| `games/el-morro/story.ink` | Scenes, dialogue, and choices. Tags like `# pic: museum` and `# puzzle: dragon_hoard` are listed at the top |
| `games/el-morro/banks.yaml` | Word-problem templates, Spanish words, facts and fibs, tunes, and Field Guide dragons |
| `engine/` | Story runner, screen, puzzles, art, and sound (plain JavaScript, no build step) |

The ink compiles in the browser, so editing a file and pushing is enough. If
the ink has an error, the boot screen shows it.

Check a story before pushing (needs Node):

```
node mudd/tools/botplay.mjs el-morro 1000
```

## Not in the slice yet

Command mode (verb bar), the quest generator and other lands, the password
backup, the DOS font pack, and the GitHub Actions build. See the design doc.

## Credits

- [inkjs](https://github.com/y-lohse/inkjs) (MIT), ink by inkle
- [js-yaml](https://github.com/nodeca/js-yaml) (MIT)
- Font: VT323 by Peter Hull (Google Fonts, OFL)
