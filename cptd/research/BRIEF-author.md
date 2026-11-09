# Brief: author one area's content (step 3)

You're writing one area of a CPTD exam study app. A friend is studying for the real exam with it. A wrong fact or an ambiguous question is worse than a missing one.

## Read first (only these)

1. `cptd/research/LESSONS.md`: all of it (content format, sources and tags, Domain 1's mistakes, the authoring checklist, gotchas).
2. Your area's source file, `cptd/research/<dN>/<area>.md`. **This is your only source.** Do no web research. Every model, item, decoy, question, case option and explanation must be traceable to a line in it. If the file doesn't support something, leave it out, or (for a whole model) skip it and list it under "Skipped" in your summary.
3. Your area's row in `cptd/research/scope.md` ("Shards"), plus `cptd/content-<dN>.js` for the domain's areas and statement labels.
4. For style, read **only** these Domain 1 examples in `cptd/content.js`, using grep -n and short line ranges: the model `bad-news` (ordered), the model `cialdini` (set with decoys), one model that has `groups` (grep `groups:`), the questions `q-buyin` and `q-recip`, and the case `case-team`. Don't read the rest of the file.

## What to write

Fill in `cptd/content-<dN>-<area>.js`, which already exists as an empty stub. Keep its wrapper, and fill `models`, `kin`, `questions` and `cases`.

- **Models:** one per model in the source file that has a sourced item list. Every field in the LESSONS.md format. `area` is your area id, and `stmts` are the statements the source file ties the model to. The `tag` is the one the source file suggests, unless its evidence doesn't reach that tier, in which case go lower. `src` names the real source from the file's source list. `who` credits the right author.
- Items use the **source's own term** for each item name (`t`). The `d` is a one-line paraphrase. Ordered models need `orderNote` and must follow the source's order.
- **Decoys:** 2+ per model, plausible but clearly not members, sharing no word stems with real items. The source file's "Confusables" notes are a good place to look. A decoy must not be a real member of a *variant* of the same model (for example, a revised version's level).
- **Kin:** add `kin` groups for umbrella and overlapping models within your area. If your area overlaps another area's obvious models (for example, ADDIE in two places), list that in your summary instead of guessing at ids.
- **Questions:** about 2–3 per model, plus extra for the most testable models. That's roughly 45–55 for the area. Mix recall with applied scenarios ("A TD manager wants … What should she do first?"); ATD's own samples are mostly applied. Four options; `a` is the 0-based index of the right one; vary its position. Each `why` explains the right answer **and** why the strongest wrong option is wrong. Use ids `q-<area>-<slug>`, and model ids that don't already exist anywhere (check with grep across `cptd/content*.js`).
- **Cases:** one case for the area, 3–4 steps, each step 5–6 options with at least one right and one wrong. Every right option must be defensible from the source file. Case ids are `case-<area>-<slug>`.
- Characters like ’ “ ” — → are stored literally, not as `\u` escapes.

## Check as you go

- After every few models, run `node cptd/tools/check-content.mjs` from the repo root and fix every error and warning in your area before moving on. Other areas' files may be in progress at the same time; ignore their warnings, but report any cross-area clash that involves your ids.
- Before finishing, reread every question as a skeptical test-taker: can two options be defended? Does the stem contradict the source? Is the right answer the longest by a wide margin? Is a "most likely" or "first" answer really unique?
- Don't touch any other file except your own area file. Don't commit.

## Return

A summary of 300 words or fewer: counts (models, questions, cases), any model skipped and why, any cross-area overlaps for kin, and anything in the source file you found unclear.
