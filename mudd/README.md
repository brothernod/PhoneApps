# MUDD

A tiny text-adventure engine with an early-90s floppy-disk feel, and its first
game, **The Dragon of El Morro**. The engine holds no places, creatures, or
names: a game is one folder under `games/`, and every run is dealt from it.

Play it at `https://brothernod.github.io/PhoneApps/mudd/`. On iPhone or iPad,
open it in Safari, then Share → Add to Home Screen so it runs full-screen and
keeps its saves.

## What's playable now

Phases 1 to 5 of the completion plan are built. The whole game is here:
three of ten places a run, and all eight dragons can hatch.

- **Museum.** Doña Luz hands over the casebook, and the empty shell gives the
  first clue
- **The map.** He picks the next stop from the places on offer and sees each
  drive time. Ten pool places, three to a run: Old San Juan streets, El
  Morro's lawn, the sentry box at El Morro, the lantern tunnel at San
  Cristóbal, Yokahú Tower and the tower view, La Coca Falls and Juan Diego
  Falls in El Yunque, the beach on the north coast, and the glowing bay,
  each with two puzzles. One puzzle earns a clue, the other a lock number
- **On the road.** Two things happen on the drives of each run, from a deck
  of nine: a traffic jam, a flat tire, a rain shower, a lizard doing
  push-ups, a street cat, a dripping piragua, a bathroom break, a hat in the
  wind, the shark statue. Three of them carry a puzzle
- **The casebook.** The CASEBOOK button opens it any time, even in the middle
  of a puzzle: clues, lock numbers, stars, and the lineup of all eight
  dragons, which he can cross out
- **Case File.** He names the dragon from the lineup. A wrong pick is a drive
  to that dragon's home, a real animal with a true fact, and the clue that
  didn't fit
- **The lair.** Each dragon has its own: the iguana dragon in the big plaza
  tree (spot the tail), the anole dragon on El Morro's sunniest wall (count
  its push-ups and tap them back), the bat dragon in the deepest tunnel room
  (lantern off; each click draws more of the room in echoes), the boa dragon
  in a cave of vines (tap the vine that blinks), the coquí dragon in a mossy
  hollow (it sings; he sings the same notes back), the parrot dragon in a
  hollow high in an old tree (call to it and it leans out a little more each
  time), the turtle dragon under a bump in the sand (tap where the sand
  wiggles), the glow dragon in the dark under the mangroves (rub the water
  and it glows; the dragon shows where the glow is). Then **the rescue**, in
  Spanish sentences
- **Home.** The **Code Lock** on the nest case, three endings by the clock,
  and a gold, silver, or bronze egg for the run. The best egg is kept on the
  dragon's Field Guide page
- Seventeen puzzles: **Dragon Hoard** (two-step word problems),
  **Trading Post** (money and change), **Sunset Clock** (time; he types 3:25
  on the pad), **Stepping Stones** (find the rule, fill the missing number),
  **Colores**, **Hola y Gracias** (pick what to say back in Spanish),
  **Fact or Fib**, **the rescue**, and **Code Lock**, plus four played on a
  board of squares inside the puzzle card: **Snack Muncher** (tap every
  treat that fits the rule: multiples of 4, rounds to 50), **Egg Crates**
  (tap a tray to make rows and columns, then share a number into equal
  rows), **Dragon Census** (fill in a row of a picture graph where each
  picture stands for 2, 5, or 10), and **Memoria** (turn over cards to match
  a Spanish word with its picture). Phase 5 added **Flight Plan** (plan a
  path with arrow keys labeled IZQUIERDA, DERECHA, ARRIBA, ABAJO, then watch
  Cheddar walk it), **Egg to Dragon** (tap the stages of a coquí's, a
  parrot's, or a leatherback's life into order), **Picky Bridge** (some got
  through and some didn't: find the rule and pick who is next), and
  **Weather Watch** (read a weather table with HORA, CIELO, and VIENTO and
  tap the hour that fits the ranger's rule). A first-try solve earns a star
- **Treats.** Cheddar has three treats a run. Before a first try, a treat
  buys the puzzle's hint. A treat that is saved counts like a star toward
  the egg
- Colores has three levels: one color word; a sentence with a color and a
  size ("Toca la puerta ROJA y GRANDE") over big and small doors; and a "not"
  sentence ("No es ROJA ni AZUL"). Colores and Hola y Gracias start on level
  2 (`levels:` in `game.yaml`)
- Every place is meant to be drawn in code, in one style, with the trip
  photos as reference. The three newest places and all the lairs are drawn.
  Seven older places still show a converted trip photo until Phase 6
- A caught list that carries across runs, a sunset clock, FM-synth music,
  autosave and Continue
- Difficulty that steps up after 2 right in a row and down after 2 misses
- Grown-up screen: **hold the top-left corner for 3 seconds**. It has a
  CHECK PICTURES page that shows every scene and dragon in the pack

## A game pack

Prose lives in ink, data lives in YAML, and code lives in the engine.

| File in `games/el-morro/` | What it holds |
| --- | --- |
| `game.yaml` | Title, cast, clock, the run shape (hub, pool, places per run, the events card and how many events, treats), the traits clues reveal, the eggs a run can earn, the words around the story, and the picture list |
| `scenes/<id>.ink` + `scenes/<id>.yaml` | One scene card per place: the prose, plus its puzzle slots, toys, drive time, and spot on the map. Tags are listed at the top of `scenes/museum.ink`. `scenes/on-the-road` is the event deck |
| `creatures.yaml` | The creatures: traits and clue lines, sprite, lair, the detour when one is named by mistake, and Field Guide entry |
| `banks.yaml` | Word-problem templates, rules for the board puzzles, Spanish words and sentences, facts and fibs, puzzle wording, and tunes |
| `pics/` | `drawn.js`: the scenes, the map, the creatures, and the small icons on puzzle boards, all drawn in code at 320×200. Also the 320×200 PNGs of the places not redrawn yet |

A place card never names the creature or a puzzle. It marks a puzzle moment
with `# slot: cart`, a clue with `# clue`, and a lock number with `# digit`,
and the dealer fills them in. A place gives one clue and one lock number. The
clues come out in a dealt order: the hub gives the first, each place the
next, and once a creature's traits are all out, the next clue is its `sign:`.

To add a place: write its two files in `scenes/`, add its id to `run.pool` in
`game.yaml`, give it `map: [x, y]`, and draw its picture in `pics/drawn.js`.

To add something that happens on a drive: write a `= part` for it in
`scenes/on-the-road.ink`, ending in `-> DONE`, and list it under `events:`
in `on-the-road.yaml`. It can be picky about the drive: `at:` (only on the
way to these cards), `far:` and `near:` (by the minutes of the drive). An
event can have a puzzle slot like any card.

A slot can list any number of puzzles; the dealer picks one each run. A new
kind of puzzle needs a rule set in `engine/puzzles.js` and a bank in
`banks.yaml`; the comments above each bank say how to write a question. A
slot can also give a puzzle a skin (`{ puzzle: colores, skin: kites }`):
the words under `wording.colores.skins.kites` then replace the puzzle's
own, so Colores is about doors in one place and kites in another.

A board puzzle (Snack Muncher, Egg Crates, Dragon Census, Memoria, Weather
Watch, and the two order puzzles, Flight Plan and Egg to Dragon) hands
the screen a board as plain data and checks the answer itself. Its pictures
are icons: small drawings exported as `icons` from `pics/drawn.js` and named
with `icon:` in the bank.

To let a creature hatch: write its lair card (`role: lair`, with a `rescue`
slot and, if you like, a toy), and name the card under `lair:` in
`creatures.yaml`. There are five kinds of toy: `spot` (tap something in the
picture, once or several times), `taps` (count and tap back), `pulse` (press
a key a few times), `song` (repeat the notes), and `rub` (rub the picture;
it is told where, and can show something hidden there). Until then the creature is in the lineup but is never
dealt. A lair belongs to one creature, so its card may name it.

| File in `engine/` | What it does |
| --- | --- |
| `pack.js` | Loads a pack, joins its scene cards into one ink story, and checks every reference |
| `dealer.js` | Deals a run from the quest number: the creature, the order places come up on the map, a puzzle for each slot, the clue order, the lock, and which events happen on which drives |
| `quest.js` | Plays a dealt run: hub, map and places, events on the drives, case file and detours, lair, home, treats, and the rating. Also the casebook |
| `puzzles.js` | Puzzle rule sets. Each makes a puzzle for a shared answer screen |
| `screen.js`, `art.js`, `sound.js` | The screen, puzzle card and its boards, map, casebook and lair toys; pictures and icons; and music |
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
map and now and then naming the wrong dragon, spending a treat, and quitting
and continuing along the way. It also plays every creature with every place
and slot combination at each of the three levels, every event, every wrong
guess, and runs that start late enough to come home after sunset. It fails on a missing card, slot, bank, tune, or picture; ink
that doesn't compile; a dead end; a part of a card, a toy, or an egg no run
reaches; a case file that opens before every clue is found; a lock whose code
isn't the numbers found; a puzzle question longer than four lines on an
iPhone; a board puzzle that takes a wrong answer or refuses its own right
one; a path that doesn't reach its goal; a weather table with two right
hours; a Memoria word too long for its card; a fact without a source; a
puzzle that offers a treat and has no hint; an event that never happens;
and anything from the pack hard-wired into the engine. A full run takes
about five minutes.

## Not built yet

Phases 6 and 7 of the completion plan. Phase 6 redraws the seven places
that still show a trip photo (Old San Juan, the sentry box, the tunnel,
Yokahú Tower, La Coca Falls, Juan Diego Falls, the beach) and takes the
PNGs out of the pack. Phase 7 tunes the clock and the eggs, and adds both
mother-dragon endings, the password backup, and a blank game pack.

## Credits

- [inkjs](https://github.com/y-lohse/inkjs) (MIT), ink by inkle
- [js-yaml](https://github.com/nodeca/js-yaml) (MIT)
- Font: VT323 by Peter Hull (OFL), bundled in `vendor/`
