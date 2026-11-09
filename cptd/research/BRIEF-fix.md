# Brief: apply the checkers' findings to one area (step 6)

Two independent checkers have reviewed one area. Pass A wrote claims findings to `cptd/research/<dN>/check-<area>.md`. Pass B answered the questions cold, in `cptd/research/<dN>/answers-<area>.md`. Your job: decide each finding against the source file, apply the fixes to `cptd/content-<dN>-<area>.js`, and leave a log a fresh agent can re-check.

## Read first

1. `cptd/research/LESSONS.md`: "Content format", "Mistakes the Domain 1 checkers found" and "Authoring checklist".
2. `cptd/research/<dN>/check-<area>.md`.
3. The cold disagreements: run `node cptd/tools/claims.mjs <area> --compare cptd/research/<dN>/answers-<area>.md`.
4. `cptd/research/<dN>/<area>.md`, the source file. Use grep and line ranges to find the relevant lines; don't read it whole unless you have to.
5. The content file: grep for the ids. Don't read it whole.

## Decide

- **Claims findings:** apply the checker's exact fix unless the source file clearly says otherwise. FALSE, WRONG-KEY, AMBIGUOUS and MISLEADING findings must all be fixed or removed. Fix MINOR findings when the fix is cheap. UNVERIFIABLE means no source supports the item: remove it, or reword it to only what the source supports. Don't keep it as is.
- **Cold disagreements** (where the cold answer differs from the key, or "two defensible" is flagged): check the key against the source.
  - If the key is wrong, fix it.
  - If a careful candidate could defend another option, fix the question: rewrite the stem so only one option fits, or replace the defensible distractor. Don't just add to the `why`.
  - If the key is right and the cold answer is simply wrong, leave the question unchanged and say so in the log.
- **Case steps:** every option has to be clearly right or clearly wrong. Reword the option, or flip its flag where the source supports that.
- Labels in `content-<dN>.js` (statement wording) count as part of your area if a finding names them.
- No web research. If a fix needs a fact the source file doesn't have, remove the item instead.

## Then

- Run `node cptd/tools/check-content.mjs` until your area has no errors and no new warnings.
- Run `node cptd/tools/claims.mjs <area>` and `--cold` again to regenerate the files.
- Write `cptd/research/<dN>/fixes-<area>.md`: one row per finding, with the id, the finding (a few words), what you did (fixed / reworded / removed / kept and why), and the new text for anything that changed. A fresh agent will re-check exactly these rows.
- Don't edit any other area's file, and don't commit.

## Return

A summary of 150 words or fewer: counts fixed, reworded, removed and kept, and anything you couldn't resolve.
