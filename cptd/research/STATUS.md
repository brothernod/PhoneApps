# Status

Update this at the end of every step: tick the step, log the spend, and rewrite "Next action".

## Next action

Steps 3 and 4 are done (chat B2, 2026-11-09). Domain 3 is on branch `cptd-d3`, not on `main`.

**Start chat B3 (Domain 3, steps 5–6).** Jonathan opens a new chat at **high** effort and says: *"Continue the CPTD build from cptd/research/PLAN.md in brothernod/PhoneApps."*
- Branch `cptd-d3`. Use `BRIEF-check.md` (claims pass and cold pass, `effort: "xhigh"`), then `BRIEF-fix.md` (fixers, `effort: "high"`) and one fresh re-check agent (`xhigh`). 14 check agents for 7 areas, in waves of at most 3 (2 if the window is past half used). Cold passes go first or alongside claims passes, never after the same agent has seen the source.
- Log every agent's reported tokens, tool uses and duration in the spend log, and use `PLAN.md` "Costing" to put an estimated dollar figure on Domains 2 and 3 in the final report (Jonathan wants this for pricing future projects).
- Then merge `cptd-d3` into `main` (that deploys to the friend), log spend, update this file and `LESSONS.md`, and send Jonathan the final report.

Points the authors flagged for the checkers. Add each to that area's check prompt:
- **perf:** the descriptions in `perf-basics-analyses` (six analysis types) and `perf-support-examples` (the five 3.5.6 examples) are paraphrases; the source file gives only the names. HPI principle labels are the app's own (the note says so).
- **strategy:** `perfmgmt-tdbok` is tagged `tdbok` only through an ATD blog quoting the TDBoK (maybe `named`). `rothwell-succession` item names are the author's short paraphrases of Rothwell's questions. `scale-align` now credits Guerra-López and Hicks (from `biz.md` [S16], the issue itself) and is kin with `scale-skills`; tag left `extra`.
- **biz:** `sb-phases` has 7 of the 8 phases ATD mentions (only 7 chapter titles found). `budget-keys` glosses only spell out the words. `block-resistance` keeps 7 of 14 faces, from their headings only.
- **market:** `hrd-target-markets` has 4 of 6 meanings from standard marketing usage, not the 1987 source (questions test only mass marketing and selective specialization). `mkt-six-step` descriptions restate the step names. All `extra` except `ll-capability` (`named`).
- **data:** two questions rely on the study deck's thin line between segmenting stakeholders by Function and by Decision-making authority; the cold pass should look hard at them. Questions avoid the three-vs-four analytics types count.
- **change:** Kübler-Ross questions stick to facts true for both the seven-area curve (`kr-curve`) and the five grief stages (`kr-grief`); appreciative inquiry questions avoid counting phases (4-D vs 5-D).
- **od:** French and Raven questions say "the original 1959 five"; action research's step 8 is "Data gathering after action" (a university page prints "Data gathering and action"; the note says so). Q12 items are a set; Q12 levels are ordered.

## Domain 2: Developing Professional Capability (conversation A)

- [x] 0. Scope: tested statements for Domains 2 and 3 in `scope.md`, shards, size estimate (2026-11-08: D2 18 statements in 5 shards, D3 32 in 7)
- [x] 1. Multi-domain app support, `claims.mjs`, checker update (one agent, high effort)
- [x] 2. Source files `research/d2/*.md` (5 first-pass agents plus 5 gap-fill agents, xhigh; `BRIEF-sources.md`, `BRIEF-gaps.md`)
- [x] 3. Written from the source files as `content-d2.js` (metadata) plus `content-d2-<area>.js` (5 author agents, high): 102 models, 277 questions, 5 cases after fixes
- [x] 4. Machine checks pass (checker 0 errors, `run_all.sh` all green). Which-model uniqueness is now per domain, which gave 10 Domain 1 models back their cards
- [x] 5. Claims pass and cold-answer pass, per shard (10 agents, xhigh): no wrong keys or false facts; 55 issues (misleading, ambiguous, unverifiable, minor)
- [x] 6. Fixes applied (5 fixers), re-checked by a fresh agent (13 more issues, fixed word for word), merged to `main`, spend logged
- [x] **Checkpoint:** reported to Jonathan 2026-11-09

## Domain 3: Impacting Organizational Capability (conversation B)

- [x] 2. Source files `research/d3/*.md` (chat B1, xhigh agents): 7 first passes, 7 gap fills, plus a second gap fill for biz, market, data (2026-11-09). TDBoK numbers and full wording confirmed in `scope.md`
- [x] 3. `content-d3.js` (metadata, 7 areas, 32 statement labels, cross-area kin) plus `content-d3-<area>.js` (7 author agents, high): 114 models, 391 questions, 7 cases
- [x] 4. Machine checks pass (checker 0 errors; `run_all.sh` all green). Order cards now need 3+ items (Argyris's two loops); `gen_test.py` matches whole words and no longer flags “null hypothesis”; `domain_test.py` empties Domain 3 in its stub run and checks all three domains with the real files
- [ ] 5. Claims pass and cold-answer pass (chat B3, xhigh)
- [ ] 6. Fixes (high), re-check (xhigh), merge to `main`, spend logged, final report (chat B3)

## Spend log

| When | Work | Session meter | Weighted tokens | Max history | Notes |
|---|---|---|---|---|---|
| 2026-11-04 to 11-08 | Domain 1, whole project (build, two audit rounds, UI fixes, reports) | about $82 | about 27M (whole project) | about 780k | Baseline. Hit the usage limit 3 times. |
| 2026-11-08 to 11-09 | Domain 2, conversation A (steps 0–6) | not available (`spend.py` finds no transcript in a cloud session) | agents reported about 4.75M tokens over 34 runs; main conversation stayed under about 200k history | about 225k (one agent) | Hit the 5-hour usage limit twice, with 5–7 agents running at once. All agents resumed with their work intact. |
| 2026-11-09 | Domain 3 step 2 (chat B1): 7 first-pass + 7 gap-fill agents | not available | agents reported about 1.76M tokens over 14 runs (first passes 115–154k each, gap fills 102–140k) | about 154k (one agent) | 2–3 agents at once. The fetch tool hit the 5-hour limit near the end of the last wave (biz, market, data gap fills stopped early). Agents overran their web-call budget (up to 27 vs 15–20). |
| 2026-11-09 | Domain 3 step 2, second gap fill for biz, market, data (chat B1) | not available | about 341k over 3 runs (107–121k each) | about 121k | No limit errors; 13–14 web calls each. Step 2 total about 2.1M over 17 runs. |
| 2026-11-09 | Domain 3 steps 3–4 (chat B2): 7 author agents (high), machine checks | not available | about 1.29M over 7 runs (165–201k each) | about 201k (one agent); main chat well under 100k | 3 agents at once, no limit errors. Authors ran 15–29 tool calls each. Domain 3 so far about 3.4M over 24 runs. |

## Couldn't verify (carry into the final report)

From Domain 2: no TDBoK text covers Domain 2, so no Domain 2 model carries the `tdbok` tag (all are `reflist`, `named` or `extra`). These were left out because no tier 1–3 source could be found: Kaufman's levels, CIPP's meanings, Rogers's adopter categories, TAM, DIKW, interview structure types, the Seven Cs' definitions (only their names are tested), Bloom's psychomotor levels, and the definitions of LCMS, KMS and performance management systems.

From Domain 1, still open: the TDBoK 1.3.5 lists (the order of the 10 team-conflict steps, the 9 tactics for defusing conflict, the basic strategies) and the TDBoK-style lists in 1.4.6, 1.5.x and 1.6.3. Only TDBoK-keyed study decks support them.
