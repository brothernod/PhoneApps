# Status

Update this at the end of every step: tick the step, log the spend, and rewrite "Next action".

## Next action

**Checkpoint reached (2026-11-09).** Domain 2 is live on `main`. Jonathan (and the friend) look at it in the app and decide whether Domain 3 goes ahead as planned. To start **conversation B (Domain 3)**, open a new chat and say: *"Continue the CPTD build from cptd/research/PLAN.md in brothernod/PhoneApps."* Conversation B starts at Domain 3 step 2 (scope is done in `scope.md`). First confirm the 3.1.A/3.1.B TDBoK numbers and refetch the truncated D3 statement tails. Reuse the `BRIEF-*.md` files with dN = d3, and add `content-d3.js` plus `content-d3-<area>.js` the same way Domain 2 did (see LESSONS.md).

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

- [ ] 2. Source files `research/d3/*.md`
- [ ] 3. `content-d3.js`
- [ ] 4. Machine checks pass
- [ ] 5. Claims pass and cold-answer pass
- [ ] 6. Fixes, commit, spend logged, final report

## Spend log

| When | Work | Session meter | Weighted tokens | Max history | Notes |
|---|---|---|---|---|---|
| 2026-11-04 to 11-08 | Domain 1, whole project (build, two audit rounds, UI fixes, reports) | about $82 | about 27M (whole project) | about 780k | Baseline. Hit the usage limit 3 times. |
| 2026-11-08 to 11-09 | Domain 2, conversation A (steps 0–6) | not available (`spend.py` finds no transcript in a cloud session) | agents reported about 4.75M tokens over 34 runs; main conversation stayed under about 200k history | about 225k (one agent) | Hit the 5-hour usage limit twice, with 5–7 agents running at once. All agents resumed with their work intact. |

## Couldn't verify (carry into the final report)

From Domain 2: no TDBoK text covers Domain 2, so no Domain 2 model carries the `tdbok` tag (all are `reflist`, `named` or `extra`). These were left out because no tier 1–3 source could be found: Kaufman's levels, CIPP's meanings, Rogers's adopter categories, TAM, DIKW, interview structure types, the Seven Cs' definitions (only their names are tested), Bloom's psychomotor levels, and the definitions of LCMS, KMS and performance management systems.

From Domain 1, still open: the TDBoK 1.3.5 lists (the order of the 10 team-conflict steps, the 9 tactics for defusing conflict, the basic strategies) and the TDBoK-style lists in 1.4.6, 1.5.x and 1.6.3. Only TDBoK-keyed study decks support them.
