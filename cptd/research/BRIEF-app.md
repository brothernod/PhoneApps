# Brief: multi-domain app support (step 1)

Make the CPTD study app (`cptd/`, vanilla JS, no build step) handle all three exam domains. Domain 1's content and everyone's saved progress must keep working exactly as now.

## Read first

`cptd/research/LESSONS.md` (all of it: app layout, content format, gotchas, UI lessons) and `cptd/research/scope.md` ("Shards" section: the area ids and statements for Domains 2 and 3). `app.js` (~1,380 lines) and `content.js` (~1,940 lines) are big: read them with grep and line ranges, not whole.

## Content layout

Content arrives in several script files that each register a part. Parallel authors will each write one shard file, so the loader must merge any number of parts.

- `content.js` stays Domain 1 and keeps its content. Make the smallest change that tells the app it is domain `d1` (for example, add a `domain` block to what it returns, or have the loader default `window.CPTD` to `d1`).
- `content-d2.js`: domain metadata only. Roughly:
  ```
  window.CPTD_PARTS = window.CPTD_PARTS || [];
  window.CPTD_PARTS.push({
    domain: { id: 'd2', num: 2, name: 'Developing Professional Capability', short: 'Professional', weight: 45 },
    areas: [ { id: 'learn', name: '…', stmts: ['2.1.1', '2.1.3', '2.3.3'], tab: '#hex' }, … ],
    statements: { '2.1.1': '…', … },
    exam: { facts: [['This domain', '…']], tips: ['…'] },
  });
  ```
  Use the five Domain 2 shards in `scope.md` as its areas (`learn`, `design`, `techkm`, `people`, `eval`), with statement labels taken from `scope.md`'s wording (paraphrase the long ones, but keep every named element). Pick tab colors that don't clash with Domain 1's.
- `content-d2-<area>.js`: one per area, written later by authors: `window.CPTD_PARTS.push({ domain: 'd2', models: [], kin: [], questions: [], cases: [] })`. Create the five files now as empty stubs, so authors only fill them in.
- Domain 3 follows the same pattern later (`content-d3.js` plus `content-d3-<area>.js`). Don't create its files now, but make sure adding them means only new files plus `<script>` tags and `sw.js` entries.
- Tags (`tdbok`, `reflist`, `named`, `extra`) and the general exam facts (length, format, weights, scoring, case steps, outline) are shared. Domain-specific facts and tips belong to each domain. Domain 1's "This domain" fact and its tips move to Domain 1's domain block.
- Ids (models, questions, cases, areas) must be unique across all domains. Card keys stay `m:<modelId>:<type>` and `q:<questionId>`, so existing Domain 1 progress keeps working with no migration. The `localStorage` key `cptd-bpc-v1` must not change; extend state only through `upgrade()`.
- `kin` and the "which model?" decoys: use the same kin rules across domains. Prefer decoy models from the same domain.

## UI

- Home: a domain picker (All, 1, 2, 3; only domains that have content), with a sprint for the chosen domain or for all. Show progress and mastery per domain. Remember the choice in state.
- Learn: filter by domain, grouped by area as now.
- Cases: grouped by domain.
- The exam countdown and settings stay shared.
- Replace "Building Personal Capability" as the app's title everywhere it names the whole app (the `app.js` brand line and About text, `index.html` title and meta, `manifest.webmanifest`). The app is now "CPTD study". The About text should describe all three domains and say which have content.
- Keep the UI lessons in `LESSONS.md`: the next step is always on screen, and test at 390×664 and 412×915.
- `sw.js`: add the new files to the cache list and bump the cache name.

## Tools

1. `tools/check-content.mjs`: load every part the way the app does (all `content*.js` listed in `index.html`). Run all existing checks per domain and across domains (duplicate ids anywhere, stems clashing for "which model?" across all models). Report counts per domain and per area. Accept a domain or area filter argument.
2. New `tools/claims.mjs`, used by fresh checker agents in step 5:
   - `node cptd/tools/claims.mjs <area>` writes `cptd/research/<dN>/claims-<area>.md`: a numbered list of **atomic claims**, one fact per line, covering everything the area teaches. Claims cover each model's name, author or origin, tag and `src`; for ordered models, the order and what it means; each item's name and description; group membership; each decoy as "X is NOT one of <model>'s items"; and the hook, exam and note text. For each question, the stem, all four options, the keyed answer with its text, and the `why`. For each case step, every option with its right/wrong flag and the `why`. Give each claim a stable id that names its source (e.g. `kirkpatrick.items.2` or `q-roi-1.key`), so a fix can be located.
   - `node cptd/tools/claims.mjs <area> --cold` writes `cptd/research/<dN>/cold-<area>.md`: the area's questions and case steps **with no keys, flags or `why`**, ready for an agent to answer. Put the expected answer-file format at the top of that file.
   - `node cptd/tools/claims.mjs <area> --compare <answers.md>` reads the agent's answers and prints only disagreements and "two defensible" flags, with the keyed answer next to the agent's.
   - Keep the answer format dead simple, e.g. one line per item: `q-id | B | ok` or `q-id | B | two: B,C | note`, and for case steps `case-id.step-n | 1,3 | ok`.
3. Update `tools/tests/` where they assume one domain or the old title. Add a test that switches domains and confirms a Domain 1 card still keeps its saved box after the change.

## Test, then clean up

- Fill `content-d2-learn.js` temporarily with a two-model stub (one ordered, one set with decoys and groups) and two questions, and confirm: Home picker, a Domain 2 sprint, Learn filter, per-domain progress, the checker, and all three `claims.mjs` modes. Then empty the stub again. Domain 2 must show nothing (or be hidden) while its area files are empty.
- Serve the repo root (`python3 -m http.server 8765 --bind 127.0.0.1`) and run `bash cptd/tools/tests/run_all.sh` until it's all green. `node cptd/tools/check-content.mjs` must pass with zero errors.
- Look at screenshots only for the new Home picker and the Learn filter, at both sizes.

## Hand-off

- **Don't commit or push.** The main conversation does that.
- Update `LESSONS.md` ("The app in brief" and "Content format") to describe the multi-domain layout, the new files and the `claims.mjs` modes, so later conversations don't need to read the code.
- Return a summary of 300 words or fewer: files changed, how parts are merged, state changes, test results, and anything left undone.
