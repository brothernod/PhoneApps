# Corgidoku spec

A personal corgi-themed logic puzzle for Halina. Static site in `PhoneApps/corgidoku/`, served by GitHub Pages. No backend, no accounts, no ads, no tracking.

## Rules (the only rules)

An N×N grid (N = 5..10) is split into exactly N colored regions ("yards"). Each region is a 4-connected set of cells.

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

The grader always applies the lowest level that makes progress, then starts over at level 1. Grade = highest level used: `easy` (≤2), `medium` (3–4), `hard` (5). Steps = number of technique applications.

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
- `daily` dates are consecutive, local calendar dates, no gaps.

## Schedule (medium, leaning casual)

| Day | Size | Grade |
| --- | --- | --- |
| Mon, Tue | 5×5 or 6×6 | easy |
| Wed, Thu | 6×6 | easy or medium |
| Fri | 7×7 | medium |
| Sat, Sun | 7×7 or 8×8 | medium |

The week of 2026-11-11 (Halina's surgery) is all easy. 9×9 and 10×10 come later from the heavy generator run on Jonathan's PC.

## Special dates

- 2026-11-11: get-well message.
- Every June 15: birthday message.
