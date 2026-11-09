# Lessons and reference from Domain 1

What a new conversation needs to know about the app, the content format and Domain 1's mistakes, without reading the big files. Keep this current when something changes.

## The app in brief

Vanilla JS, no build step, served by GitHub Pages from `cptd/`. Works offline. The app is called "CPTD study" and covers all three domains; a domain shows up only once its area files have content.

| File | What's in it |
|---|---|
| `index.html` (~405 lines) | Markup and all CSS: color tokens, light/dark, index-card look, `.opt` highlighter, bottom `.actbar`, `#tabs`, `#toast`, `#idle`, domain picker (`.dompick`, `.domrow`, `.domlabel`). Loads the content files in order, then `content-merge.js`, then `app.js`. |
| `app.js` (~1,450 lines) | Everything else (see below). Reads only `window.CPTD_ALL`. |
| `content.js` (~1,950 lines) | Domain 1 content, as `window.CPTD`, plus `shared` (tags and general exam facts). |
| `content-d2.js` | Domain 2 metadata: domain block, five areas, 18 statement labels, Domain 2 exam facts and tips. |
| `content-d2-<area>.js` | One per area (`learn`, `design`, `techkm`, `people`, `eval`), filled in by authors. Empty stubs until then. |
| `content-d3.js`, `content-d3-<area>.js` | Domain 3 the same way (`biz`, `od`, `strategy`, `market`, `perf`, `data`, `change`). `content-d3.js` also holds the cross-area kin groups. |
| `content-merge.js` | Merges every part into `window.CPTD_ALL`. The Node tools run this same file. |
| `sw.js` | Network-first service worker. **Bump the cache name** (`cptd-study-vN`, now v5) and list every new content file when shipping. |
| `manifest.webmanifest`, icons, `fonts/` | Install and offline support; font is Atkinson Hyperlegible Next (OFL). |
| `tools/check-content.mjs` | Content linter. Run from the repo root: `node cptd/tools/check-content.mjs [domain or area]`, e.g. `d2` or `learn`. Loads every `content*.js` that `index.html` lists (via `tools/load-content.mjs`), checks each domain and all of them together, and reports counts per domain and area. |
| `tools/claims.mjs` | Fact-check files for one area (see "Checker tools" below). |
| `tools/tests/` | Playwright tests. `run_all.sh` runs everything and prints only pass/fail lines. `domain_test.py` serves `tests/fixtures/content-d2-learn-stub.js` in place of the real `content-d2-learn.js` to test the multi-domain UI. |
| `tools/spend.py` | Token spend report for checkpoints. |

Inside `app.js`, roughly top to bottom:
- **State.** `localStorage` key `cptd-bpc-v1`. Don't rename it, or everyone's progress is lost; extend through `upgrade()`. Holds settings (goal 10 min, sprint 5 min, previews, haptics, sound, theme, speech rate, examDate, `domain`: `'all'` or a domain id, the Home pick), cards, time, streak, XP and stickers. Card keys don't name the domain, so Domain 1 progress needed no migration.
- **Domains.** `DOMAINS` (all three), `LIVE` (those with content), `MULTI` (more than one live). With one live domain the UI looks as it did before domains existed: no picker, no domain headings. `curDom()` is the Home pick (falls back to `'all'`), `inDom(dom)` filters cards, `SHOWN` is the areas that have cards. Home has the picker chips, "Your domains" rows (mastery, % seen, due, weight; tapping one picks it) and the chosen domain's areas; the hero sprint, Exam-style and Weak spots follow the pick. Learn has its own domain chips (`LEARN.dom`, following Home until changed) and groups areas under domain headings. Practice, Progress and the Exam page group by domain. Settings' About lists all three domains and which have content. Exam countdown, settings and streaks are shared.
- **Cards** are built from content: `pick` (a model with 2+ `decoys`), `order` (`kind: 'ordered'` with 3+ items), `match` (3+ items), `group` (has `groups`), `which` ("which model is this item from?", only for items whose word stems don't clash with any other model's items in the same domain), and `q` (each exam-style question). Keys are `m:<modelId>:<type>` and `q:<questionId>`.
- **Scheduling.** Leitner boxes with intervals `[0, 1, 3, 7, 14, 30]` days. `buildQueue` mixes due, new and later cards. Cards tried in the last 10 minutes (`RECENT_MS`) are held back a few places. A missed card is re-asked about 3 cards later in the same sprint.
- **"Which model?" decoys** (`decoyOk`, used by `UNIQUE` and `makeQ`) skip models whose items or name clash with the item (`near`, `memberClash`), and skip **kin** models (`content.kin`). They come from the same area first, then the same domain, then other domains. Item uniqueness (`UNIQUE`) is checked with the strict test within the item's own domain only, so a new domain can't take an older model's card away; a model from another domain whose items strict-clash with the item is simply never offered as its decoy, so the card stays unambiguous. An item with fewer than 3 eligible decoys is left out. The checker mirrors both rules and warns, per domain, about models with no "which model?" item; `kin_test.py` checks the cross-domain rule with `fixtures/content-d2-xclash-stub.js`.
- **Time tracking** counts only active, visible time: `IDLE_SEC` 120, `GRACE_SEC` 20. XP, levels, stickers (`BADGES`), streaks with busy-day passes (one earned per 5 streak days), and an exam countdown.
- **Sprint runner** (`renderRun`). Bottom action bar via `ACTBAR`, `setBar`, `runBar`, `caseBar`; it always holds the next step. "Show answer" counts as a miss.
- **Listen mode** reads models aloud (speechSynthesis plus a wake lock).
- **Test hook:** `window.__cptd` = `{ state, cur, C, CARDS, makeQ, buildQueue, version }` (`C` is the merged content).

## Content format

Content comes in parts, merged by `content-merge.js` into `window.CPTD_ALL`:

- `content.js` sets `window.CPTD` = Domain 1's part: `{ domain: { id: 'd1', num: 1, name, short: 'Personal', weight: 20 }, areas, statements, models, kin, questions, cases, exam, shared: { tags, exam: { facts } }, version }`. `shared` holds what every domain uses: the tags and the general exam facts (length, format, weights, scoring, case steps, outline).
- Every other file pushes onto `window.CPTD_PARTS = window.CPTD_PARTS || []`:
  - `content-dN.js`: `{ domain: { id, num, name, short, weight }, areas, statements, exam: { facts, tips } }`.
  - `content-dN-<area>.js`: `{ domain: 'dN', models, kin, questions, cases }` (optional `version`).
- A part's `exam` always belongs to its domain ("This domain" fact and study tips). The merge stamps `domain` onto every area, model, question and case, concatenates lists in any number of parts, sorts by domain, and records `problems` (missing domain, a statement defined twice) for the checker. Merged: `{ domains: [{ id, num, name, short, weight, exam, areas, meta, counts, live }], areas, statements, tags, exam, models, kin, questions, cases, version, problems }`.
- **Adding a domain** (Domain 3): write `content-d3.js` and `content-d3-<area>.js` files, add their `<script>` tags to `index.html` before `content-merge.js`, and add them to `sw.js` (and bump its cache name). No app or tool changes. Area `icon` (an emoji, for the mastery sticker) and `tab` (a hex color) go in the area entry.
- Ids (areas, models, questions, cases) must be unique across all domains; the checker enforces it. A question or case must use statements of its own domain, and a model's area must be in its domain.

Fields:

```
areas:      [{ id, name, stmts: ['1.1.3', ...], tab: '#hex' }]
statements: { '1.1.3': 'Outline wording', ... }
tags:       { tdbok: 'In the TDBoK', reflist: 'On ATD’s reading list', named: 'Named in the exam outline', extra: 'Good to know' }
models:     [{ id, area, stmts: [], tag, name, short, who, kind: 'set' | 'ordered', unit,
               items: [{ t, d }], decoys?: [], orderNote? (required if ordered),
               groups?: [{ t, m: [] }] (2+ groups), hook, exam, note?, src }]
kin:        [{ hub: 'id', with: ['id', ...] } | { all: ['id', ...] }]
questions:  [{ id, stmt, model?, q, o: [4 options], a: index, why }]
cases:      [{ id, title, stmts: [], setup, steps: [{ text, options: [[text, true|false]], why }] }]
exam:       { facts: [[label, text]], tips: [...] }      (the part's own domain)
version:    'YYYY-MM-DD'
areas[].icon: optional emoji for the area's mastery sticker
```

A case belongs to the area of its first statement (for the checker's counts and `claims.mjs`).

### Checker tools

`node cptd/tools/claims.mjs <area>` writes `research/<dN>/claims-<area>.md`: a numbered list of atomic claims, each with a stable id naming its source. Models give `<id>.name`, `.who`, `.tag`, `.src`, `.stmt.N`, `.kind` (count, and the order note if ordered), `.items.N.name`, `.items.N.order`, `.items.N.desc`, `.groups.G.N`, `.decoys.N` ("X is NOT one of …"), `.hook`, `.exam`, `.note`. Questions give `<qid>.stem`, `.A`–`.D`, `.key`, `.why`. Cases give `<cid>.setup`, `.step-N.text`, `.step-N.opt-K` (RIGHT or WRONG pick), `.step-N.why`.

`--cold` writes `research/<dN>/cold-<area>.md`: the area's questions and case steps with no keys, flags or `why`, the answer format at the top. Options appear in a fixed shuffled order per item (authors tend to key option A), so cold letters differ from the stored order.

`--compare <answers.md>` prints only disagreements and "two defensible" flags, keyed answer next to the agent's (in the cold test's letters, with option text), then a count line and any unanswered or unknown ids. Answer lines: `q-id | B | ok`, `q-id | B | two: B,C | note`, `case-id.step-1 | 1,3 | ok`.

`--out <dir>` writes somewhere other than `research/<dN>/` (useful for trying it out).

Example model: `bad-news`, "Structure of a bad-news message", tag `tdbok`, kind `ordered`, items Neutral opening → Reasons → The bad news → Alternatives → Positive close, with `orderNote: 'first to last'`.

Exam facts (2025 handbook): 3 hours. 105 min for 90 four-option multiple-choice questions, an optional 10-min break, then 65 min for 10 case scenarios of 3–4 steps each. Case steps are multi-select, scored +1 per right pick and −1 per wrong pick. Domain weights are 20 / 45 / 35. The content outline has been in effect since July 1, 2020.

## Sources, in order of trust

1. **TDBoK Guide** (2nd ed.). Only a sample chapter is public: https://assets.td.org/m/609279295b9bb8ca/original/samplePDF-112410_TDBoK-Guide-second-edition.pdf (it covers part of Domain 1). Expect most of Domains 2 and 3 to be unavailable directly.
2. **ATD CI documents:** the CPTD Certification Handbook (find the current one in step 0), the APTD vs CPTD comparative outlines (https://assets.td.org/m/7dfa49ca69317d06/original/ATD-CI-2023-APTDvsCPTD-Comparative-Content-Outlines.pdf), the study planning guide, and the reading lists (https://assets.td.org/m/2049c52a0b8e8c7c/original/Certification-Resources-List-2025.pdf; older lists from 2024-10 and 2024-03 exist too).
3. **The original authors and owners** of a model (their books, papers or official sites, such as Kilmann Diagnostics for TKI, MHS for EQ-i, IDRI for DMIS, and statute text for laws).
4. **TDBoK-keyed study decks** (Brainscape and similar). Use them only as corroboration of TDBoK wording, never as the only support for an "In the TDBoK" tag. Two Domain 1 models wrongly carried that tag on deck evidence alone.

Tag honestly. If the TDBoK link can't be shown, use `reflist`, `named` or `extra`. All descriptions are paraphrased; never copy long passages.

## Mistakes the Domain 1 checkers found

Look for these deliberately in steps 3 and 5. Each example is real.

| Type | Example |
|---|---|
| **Wrong answer key** | "Tell me more" was keyed as a *door opener*. The TDBoK calls it a *minimal encourager*, so the question had no correct option. |
| **Swapped definitions** | Listening levels: "asking questions" and "paraphrasing" were attached to the wrong levels. |
| **Wrong membership** | CC0 was listed as a fifth Creative Commons license element. It's a separate public-domain tool. Lack of trust was filed as an *interpersonal* barrier; the TDBoK files it under *emotional*. |
| **Wrong date or legal term** | GDPR "in force since 2018". It entered into force in 2016 and has *applied* since May 25, 2018. |
| **Ambiguous "which model?"** | Umbrella models used as wrong answers, such as "Privacy laws" for a GDPR right, or "high-performing team" for Tuckman's Forming. Fixed with `kin` groups. Overlapping steps in two lists, such as `pm-phases` Manage and `close`, cause the same problem. |
| **Ambiguous questions** | Two defensible options, such as a stem the TDBoK itself contradicts, or "most likely" questions where two answers fit. |
| **Source label wrong** | RULER and empathy types tagged "In the TDBoK" without evidence. |
| **Wording drift** | The TDBoK says feedback should be "Immediate, Sincere, Specific"; the app said "Timely". Use the source's own term, because the exam will. |
| **Misleading explanation** | The `why` or `exam` text contradicted the source even when the key was right. |
| **Statement labels** | Outline wording shortened in a way that dropped a named element ("shared experience"). |

## Authoring checklist

For every model:
- [ ] Every component or step is in the source file, with the source's own term; order is checked against the source if ordered.
- [ ] The `tag` matches the strongest source tier actually shown.
- [ ] `src` names the real source; `who` credits the right author.
- [ ] 2+ `decoys` that are plausible but clearly not members, and don't share word stems with real items (the checker enforces this).
- [ ] `hook` and `exam` text say nothing the source doesn't support.
- [ ] Umbrella or overlapping models are listed in `kin`.

For every question:
- [ ] Exactly one defensible answer; read every option as a skeptical test-taker would.
- [ ] Options of similar length and style. The right answer must not be the longest by a wide margin (the checker warns).
- [ ] `why` explains the right answer **and** why the strongest wrong one is wrong, consistent with the source.
- [ ] Unique `id` across all domains.

For every case step:
- [ ] At least one right and at least one wrong option, and every right option defensible from the source.

## Technical gotchas

- `content.js` stores characters like ’ “ ” — and → literally, not as `\u` escapes. Patch scripts and edits must match the literal characters.
- The checker's word-stem clash is strict for "which model?" uniqueness (within a domain) and for keeping other domains' clashing models out of its decoys, and lenient for a model's own `decoys`. That's deliberate.
- Domain 1 once had a duplicate question id (`q-minimization`). The checker catches this now.
- The git remote is `https://github.com/brothernod/PhoneApps.git` (the old `jonathansundy/PhoneApps` URL redirects). A push once returned HTTP 500; retrying worked.
- Tests: serve the repo root with `python3 -m http.server 8765 --bind 127.0.0.1`, then run `bash cptd/tools/tests/run_all.sh`. Playwright's Chromium works without options; set `CPTD_CHROME` to use another browser, and `CPTD_SHOTS` for the screenshot folder. `clock_test.py` uses a fake clock: use `fast_forward` for day jumps, because `run_for` over days times out.
- `tools/spend.py` reads the newest transcript. A resumed conversation's transcript only covers the part since the last compaction.

## UI lessons from real use

- Jonathan tested on an iPhone in Safari, and his friend uses Android. Test at 390×664 (an iPhone with Safari's toolbars showing) as well as 412×915.
- The next step must always be on screen. A button below a long answer list can sit under the browser toolbar and leave someone stuck with the timer running. That's why the bottom action bar exists.
- A just-missed card must not open the next sprint (`RECENT_MS`).

## Process lessons from Domain 2 (conversation A)

- **Briefs live in files.** `BRIEF-sources.md`, `BRIEF-gaps.md`, `BRIEF-author.md`, `BRIEF-check.md` and `BRIEF-fix.md` are domain-agnostic. Agent prompts just name the brief, the area and any area-specific warnings (ownership of shared models, items to skip). Conversation B reuses them with dN = d3.
- **Two research passes per shard.** The first pass left about a third of the testable items unsourced. A targeted gap-fill pass (`BRIEF-gaps.md`, ~15 web calls) fixed most of them before authoring. It's cheaper than having checkers find the gaps.
- **Tell authors who owns shared models** (70-20-10 in `people`, ADDIE and SAM in `design`, communities of practice in `techkm`), and which Domain 1 models to reference by id rather than duplicate (`smart`, `zenger-folkman`).
- **The cold pass and the claims pass find different things.** Claims passes found misattributions and unsourced wording. Cold passes found two-defensible questions and giveaways (one option in a different case). Run both, with separate agents. Pass B goes first or in parallel, never after the same agent has seen the source.
- **Re-check after fixing.** The fresh re-check found 13 issues in about 55 changed rows, including two new giveaways introduced by the fixes. Ask fixers to apply exact text, and re-check anyway.
- **Unchecked content stays off `main`.** It's on the `cptd-d2` branch until step 6 passes, because pushing `main` deploys to GitHub Pages, where the friend studies.
- **WebFetch accepts only URLs that appeared in that agent's own search results.** URLs in files (like the TDBoK sample chapter above) must be found by search first. The fetch tool won't quote long passages; ask for the core wording plus every named element instead.
- **Usage limits.** Running 5–7 agents at once at xhigh hit the 5-hour limit twice in Domain 2. Agents stopped by the limit keep their work: resume them with SendMessage after the reset rather than starting new ones. Keep it to about 3 agents at once (2 when the window is past half used), and commit after every wave. Resume with SendMessage only if the agent's history is under about 100k; otherwise start fresh from its file.
- **One chat per domain was too much.** Domain 2's main conversation reached about 200k history against a 100k target, so Domain 3 is split into chats B1–B3 (see `PLAN.md`).
- **Effort is set per Agent call.** Agents run at their default unless the call passes `effort`; see the table in `PLAN.md`.
- **`spend.py` finds no transcript in a cloud session.** Log the `subagent_tokens` each agent reports when it completes, instead.
- **The "This domain" fact counts multiple-choice questions** (90 in all), not the 150 scoring points.

## Process lessons from Domain 3 steps 3–4 (chat B2)

- **Authors overlap across areas.** Two areas wrote different halves of one source (SCALE's steps in `strategy`, the same issue's four partner skills in `biz`). Before merging, grep the authors' summaries for shared sources and reconcile authorship and tags.
- **Cross-area kin goes in the domain's metadata file** (`content-d3.js`), since the merge reads `kin` from every part. Authors list candidates; the main chat adds only real overlaps (shared steps or items, or one list inside another), not mere contrasts or confusable names.
- **Big domains lose “which model?” items.** With 114 models, word stems repeat across areas, so 43 Domain 3 models have no “which model?” card (154 of 529 items usable). Authors kept the source's terms on purpose. It's a warning, not an error; the other card types still cover those models.
- **Ask authors to say where a description is only a paraphrase of a name.** Several did, unprompted; those go straight into the checkers' prompts.
