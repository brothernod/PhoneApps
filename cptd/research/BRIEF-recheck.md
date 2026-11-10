# Brief: re-check the fixed rows (end of step 6)

You didn't write or fix this content. Fixers have just applied the step 5 checkers' findings. Domain 2's re-check found 13 new problems in about 55 changed rows, including giveaways the fixes introduced, so look hard. Report only problems. Don't edit content files.

## Inputs, for each area you're given

1. `cptd/research/LESSONS.md` "Mistakes the Domain 1 checkers found" and "Authoring checklist" (read once).
2. `cptd/research/<dN>/fixes-<area>.md`: the rows to re-check. Only these.
3. `cptd/research/<dN>/check-<area>.md`: the original finding behind each row, with its evidence.
4. The content file `cptd/content-<dN>-<area>.js`: grep for each id; don't read it whole.
5. The source file `cptd/research/<dN>/<area>.md`: grep and line ranges only.

## For each row

- **Applied?** The content now says what the row says it does.
- **Right?** The new text matches the source file (or the checker's cited evidence, where the fixer used it), in the source's own terms.
- **Resolved?** The original finding is actually gone. A "kept" row: is keeping it defensible?
- **Nothing new broken.** For a changed question or case step, read all options as a skeptical test-taker: exactly one defensible answer (each case option clearly right or clearly wrong), no option that gives itself away by length, wording or echoing the stem, and a `why` that matches. For a changed model: no contradiction with that model's other fields or with questions that use it, and no item or decoy that now clashes with another model.

Go to the web only for a row where neither the source file nor the check file has evidence, or where you doubt that evidence. Budget about **8 web calls** in all. Only follow links from your own search or fetch results.

## Output

Write `cptd/research/<dN>/recheck-<area>.md` for each area, appending as you go, with only the rows that aren't OK, in the step 5 table:

```
| # | Id | Verdict | Evidence | Exact fix |
|---|---|---|---|---|
```

Verdicts: WRONG-KEY, FALSE, AMBIGUOUS, MISLEADING, MINOR, UNVERIFIABLE, NOT-APPLIED. End each file with `Re-checked N rows; K issues.`

## Return

A summary of 200 words or fewer: counts per area, most serious first.
