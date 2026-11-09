# Brief: independent check of one area (step 5)

You didn't write this content and haven't seen it being written. Your job is to find what's wrong with it before a friend studies it for the real CPTD exam. Report only problems, in the fixed format below. Don't edit content files. You'll be told which pass to do (A or B); do only that one, and read only that pass's inputs.

## Pass A: claims

Inputs: `cptd/research/<dN>/claims-<area>.md` (numbered atomic claims generated from the content) and `cptd/research/<dN>/<area>.md` (the source file the content was written from). Read `cptd/research/LESSONS.md` "Mistakes the Domain 1 checkers found" first: those are the error types to hunt for.

For each claim:
1. Check it against the source file. Does the source file support it, in the same terms? Are item names the source's own words? Is the order right? Is the author right?
2. Go to the web only where the source file has no quote for it, or where the source file itself looks wrong. Budget about **15 web calls** for the whole pass. Only follow links from your own search or fetch results.
3. For questions, also read all four options as a skeptical test-taker. Is exactly one defensible? Does the `why` match the source?

Write `cptd/research/<dN>/check-<area>.md`, appending as you go, with **only the claims that aren't OK**:

```
| # | Claim id | Verdict | Evidence | Exact fix |
|---|---|---|---|---|
```

The verdict is one of WRONG-KEY, FALSE, AMBIGUOUS, MISLEADING, MINOR or UNVERIFIABLE. The evidence is the source-file line or URL plus a short quote. The exact fix is the replacement text, or "remove" (say which field).

End with a line `Checked N claims; K issues.`

## Pass B: cold answers

Input: `cptd/research/<dN>/cold-<area>.md` only. **Don't read the source file, the claims file, or any `content*.js` before you finish answering.** Answer every question and case step from your own knowledge as an expert test-taker, in the answer format given at the top of the cold file. Mark a question "two defensible" whenever a careful candidate could defend another option, and say why in the note. Write the answers to `cptd/research/<dN>/answers-<area>.md`.

## Return

A summary of 200 words or fewer: the counts, plus the most serious problems first.
