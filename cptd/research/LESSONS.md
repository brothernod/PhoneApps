# Lessons and reference from Domain 1

What a new conversation needs to know about the app, the content format and Domain 1's mistakes, without reading the big files. Keep this current when something changes.

## The app in brief

Vanilla JS, no build step, served by GitHub Pages from `cptd/`. Works offline.

| File | What's in it |
|---|---|
| `index.html` (~390 lines) | Markup and all CSS: color tokens, light/dark, index-card look, `.opt` highlighter, bottom `.actbar`, `#tabs`, `#toast`, `#idle`. |
| `app.js` (~1,380 lines) | Everything else (see below). |
| `content.js` (~1,940 lines) | Domain 1 content, as `window.CPTD`. |
| `sw.js` | Network-first service worker. **Bump the cache name** (`cptd-study-vN`) when shipping. |
| `manifest.webmanifest`, icons, `fonts/` | Install and offline support; font is Atkinson Hyperlegible Next (OFL). |
| `tools/check-content.mjs` | Content linter. Run from the repo root: `node cptd/tools/check-content.mjs`. |
| `tools/tests/` | Playwright tests. `run_all.sh` runs everything and prints only pass/fail lines. |
| `tools/spend.py` | Token spend report for checkpoints. |

Inside `app.js`, roughly top to bottom:
- **State.** `localStorage` key `cptd-bpc-v1`. Don't rename it, or everyone's progress is lost; extend through `upgrade()`. Holds settings (goal 10 min, sprint 5 min, previews, haptics, sound, theme, speech rate, examDate), cards, time, streak, XP and stickers.
- **Cards** are built from content: `pick` (a model with 2+ `decoys`), `order` (`kind: 'ordered'`), `match` (3+ items), `group` (has `groups`), `which` ("which model is this item from?", only for items whose word stems don't clash with any other model's items), and `q` (each exam-style question). Keys are `m:<modelId>:<type>` and `q:<questionId>`.
- **Scheduling.** Leitner boxes with intervals `[0, 1, 3, 7, 14, 30]` days. `buildQueue` mixes due, new and later cards. Cards tried in the last 10 minutes (`RECENT_MS`) are held back a few places. A missed card is re-asked about 3 cards later in the same sprint.
- **"Which model?" decoys** (`makeQ`) skip models whose items or name clash with the item (`near`, `memberClash`), and skip **kin** models (`content.kin`).
- **Time tracking** counts only active, visible time: `IDLE_SEC` 120, `GRACE_SEC` 20. XP, levels, stickers (`BADGES`), streaks with busy-day passes (one earned per 5 streak days), and an exam countdown.
- **Sprint runner** (`renderRun`). Bottom action bar via `ACTBAR`, `setBar`, `runBar`, `caseBar`; it always holds the next step. "Show answer" counts as a miss.
- **Listen mode** reads models aloud (speechSynthesis plus a wake lock).
- **Test hook:** `window.__cptd` = `{ state, cur, CARDS, makeQ, buildQueue, version }`.

## Content format (`window.CPTD`)

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
exam:       { facts: [[label, text]], tips: [...] }
version:    'YYYY-MM-DD'
```

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
- The checker's word-stem clash is strict for "which model?" uniqueness and lenient for decoys. That's deliberate.
- Domain 1 once had a duplicate question id (`q-minimization`). The checker catches this now.
- The git remote is `https://github.com/brothernod/PhoneApps.git` (the old `jonathansundy/PhoneApps` URL redirects). A push once returned HTTP 500; retrying worked.
- Tests: serve the repo root with `python3 -m http.server 8765 --bind 127.0.0.1`, then run `bash cptd/tools/tests/run_all.sh`. Playwright's Chromium works without options; set `CPTD_CHROME` to use another browser, and `CPTD_SHOTS` for the screenshot folder. `clock_test.py` uses a fake clock: use `fast_forward` for day jumps, because `run_for` over days times out.
- `tools/spend.py` reads the newest transcript. A resumed conversation's transcript only covers the part since the last compaction.

## UI lessons from real use

- Jonathan tested on an iPhone in Safari, and his friend uses Android. Test at 390×664 (an iPhone with Safari's toolbars showing) as well as 412×915.
- The next step must always be on screen. A button below a long answer list can sit under the browser toolbar and leave someone stuck with the timer running. That's why the bottom action bar exists.
- A just-missed card must not open the next sprint (`RECENT_MS`).
