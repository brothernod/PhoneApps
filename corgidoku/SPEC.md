# Corgidoku spec

A personal corgi-themed logic puzzle for Halina. Static site in `PhoneApps/corgidoku/`, served by GitHub Pages. No backend, no accounts, no ads, no tracking.

## Rules (the only rules)

An N×N grid (N = 4..10; 4×4 only in the kids' Chill Climb) is split into exactly N colored regions ("yards"). Each region is a 4-connected set of cells.

A solution places exactly N corgis such that:

1. Every row has exactly one corgi.
2. Every column has exactly one corgi.
3. Every region has exactly one corgi.
4. No two corgis touch: not horizontally, vertically, or diagonally (all 8 neighbors).

A shippable puzzle has **exactly one** solution, and that solution must be reachable by the human techniques below without guessing.

## Human techniques (difficulty ladder)

Candidates = cells that could still hold a corgi. Placing a corgi removes every other candidate in its row, column, region and its 8 neighbors.

| Level | Name | Rule |
| --- | --- | --- |
| 1 | Last spot | A row, column or region with one candidate left gets its corgi there. |
| 2 | Confined | A region whose candidates all sit in one row (or column) clears that row (column) outside the region. A row (column) whose candidates all sit in one region clears that region outside the row (column). |
| 3 | Would block | A candidate is removed if placing a corgi there would remove every candidate of some other row, column or region. |
| 4 | Pair lock | Two regions whose candidates together cover exactly two rows (or columns) clear those rows (columns) outside them; and the reverse, two rows (columns) covering exactly two regions. |
| 5 | Group lock | The same as level 4 for groups of 3 or more. |
| 6 | What if (chain) | Pretend a corgi sits on a candidate, then keep placing only forced corgis (last spots). If some row, column or region runs out of candidates within 6 forced corgis, remove the candidate. Depth = forced corgis before the dead end; the shortest chain on the board is used. Extreme mode only. |

The grader always applies the lowest level that makes progress, then starts over at level 1. Grade = highest level used: `easy` (≤2), `medium` (3–4), `hard` (5), `extreme` (6). Steps = number of technique applications. Cozy, Hard and Chill are generated with levels 1–5 only.

## puzzles.json schema

```json
{
  "version": 1,
  "generatedAt": "ISO timestamp",
  "seed": 12345,
  "daily": [
    { "date": "2026-11-06", "n": 5, "r": "aabbbacbbdccdddceeddceeee", "s": "03142", "g": "easy", "lv": 2, "st": 9 }
  ],
  "campaign": [
    { "id": 1, "n": 5, "r": "...", "s": "...", "g": "easy", "lv": 1, "st": 6 }
  ]
}
```

- `n`: board size.
- `r`: region map, `n*n` lowercase letters, row-major. Region k is letter `'a' + k`. Exactly n distinct letters, `a` through the n-th letter.
- `s`: solution, `n` characters. `s[row]` is the column (digit `0`–`9`) of that row's corgi.
- `g`, `lv`, `st`: grade, highest technique level, steps.
- `ch`, `cd` (level 6 boards only): number of what-if chains, and the deepest one.
- `daily` dates are consecutive, local calendar dates, no gaps.

## Schedule (medium, leaning casual)

| Day | Size | Grade |
| --- | --- | --- |
| Mon, Tue | 5×5 or 6×6 | easy |
| Wed, Thu | 6×6 | easy or medium |
| Fri | 7×7 | medium |
| Sat, Sun | 7×7 or 8×8 | medium |

The week of 2026-11-11 (Halina's surgery) is all easy. 9×9 and 10×10 come later from the heavy generator run on Jonathan's PC.

## Chill mode (kids)

`puzzles-kids.json`, same schema. Daily: 5×5 L1 Mon/Tue, L1 or L2 Wed, L2 Thu, 6×6 L1 Fri, 5×5 L2 or 6×6 L1 Sat, 6×6 L1 or L2 Sun. Climb (40): 6× 4×4 L1, 10× 5×5 L1, 6× 5×5 L2, 3× 6×6 L1, 3× 6×6 L2, 4× 6×6 L3, 3× 7×7 L2, 5× 7×7 L3. Every kids board has at most 2×n steps.

## Extreme mode

`puzzles-extreme.json`, same schema. 9×9 and 10×10 only, daily from 2026-11-05. Tiers by chain score (`ch + 3 × (cd − 1)`): X0 = L5 with ≥25 steps, X1 ≤ 2, X2 3–5, X3 6–11, X4 ≥ 12. Daily: Mon 9×9 X1, Tue 9×9 or 10×10 X1, Wed 9×9 X2, Thu 9×9 or 10×10 X2, Fri 9×9 X3, Sat 10×10 X3, Sun 10×10 X3 or 9×9 X4, June 15 9×9 X1. Climb (120): 10× 9×9 X0, 10× 10×10 X0, 15× 9×9 X1, 10× 10×10 X1, 15× 9×9 X2, 15× 10×10 X2, 12× 9×9 X3, 13× 10×10 X3, 8× 9×9 X4, 12× 10×10 X4. No board from `puzzles-hard.json` is reused.

## Bonus Yards

`bonus-cozy.json`, `bonus-hard.json`, `bonus-extreme.json`, `bonus-kids.json`: `{ "version": 1, "mode": "hard", "generatedAt": "...", "seed": 502, "bonus": [ { "id": 1, "n": 9, "r": "...", "s": "...", "g": "hard", "lv": 5, "st": 24 } ] }`. Same entry fields as above; ids are 1..N with no gaps. Each mode's pool is the top half of its Climb (Cozy 7×7/8×8 L3–L4, Hard 9×9/10×10 L4–L5, Extreme 9×9/10×10 X2–X4, Chill 6×6/7×7 L2–L3 with at most 2×n steps), and no board repeats one from any other file. Past the last entry the app reuses the pool with each board turned or mirrored and its yard letters shifted, which keeps it unique and at the same grade.



- 2026-11-11: get-well message.
- Every June 15: birthday message.
