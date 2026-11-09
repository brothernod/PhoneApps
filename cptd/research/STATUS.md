# Status

Update this at the end of every step: tick the step, log the spend, and rewrite "Next action".

## Next action

**Start chat B1 (Domain 3, step 2).** Jonathan opens a new chat at **high** effort and says: *"Continue the CPTD build from cptd/research/PLAN.md in brothernod/PhoneApps."*

B1 does step 2 only, then updates this file and stops so B2 starts fresh:
- Read `PLAN.md` "Effort per step" and rule 5. Pass `effort: "xhigh"` on every source and gap-fill agent.
- Work on branch `cptd-d3` (unchecked content stays off `main`).
- Don't do web research in the main chat. Each source agent also confirms its own statements' TDBoK numbers (3.1.A and 3.1.B are unconfirmed in `scope.md`) and refetches any truncated statement tails, and records both at the top of its file. The main chat copies them into `scope.md` afterwards.
- Reuse `BRIEF-sources.md` and `BRIEF-gaps.md` with dN = d3. Order: first pass for all 7 shards in waves, then gap fill in waves.
- **Jonathan's 5-hour window was about half used when B1 started**, so the first wave is 2 agents; later waves are 3. Commit after every wave and tick the shard below.
- Log each agent's reported tokens in the spend log.

Shards done in step 2 (first pass / gap fill): see `scope.md` for the shard list; record progress here as `shard: first pass ✓ / gap fill ✓`.
- B1 in progress (branch `cptd-d3`, ownership map in `research/d3/OWNERSHIP.md`): change ✓/✓, od ✓/✓, perf ✓/✓, strategy ✓/✓, biz ✓/running, market ✓/running, data ✓/running.

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

- [ ] 2. Source files `research/d3/*.md` (chat B1, xhigh agents)
- [ ] 3. `content-d3.js` plus `content-d3-<area>.js` (chat B2, high authors)
- [ ] 4. Machine checks pass (chat B2)
- [ ] 5. Claims pass and cold-answer pass (chat B3, xhigh)
- [ ] 6. Fixes (high), re-check (xhigh), merge to `main`, spend logged, final report (chat B3)

## Spend log

| When | Work | Session meter | Weighted tokens | Max history | Notes |
|---|---|---|---|---|---|
| 2026-11-04 to 11-08 | Domain 1, whole project (build, two audit rounds, UI fixes, reports) | about $82 | about 27M (whole project) | about 780k | Baseline. Hit the usage limit 3 times. |
| 2026-11-08 to 11-09 | Domain 2, conversation A (steps 0–6) | not available (`spend.py` finds no transcript in a cloud session) | agents reported about 4.75M tokens over 34 runs; main conversation stayed under about 200k history | about 225k (one agent) | Hit the 5-hour usage limit twice, with 5–7 agents running at once. All agents resumed with their work intact. |

## Couldn't verify (carry into the final report)

From Domain 2: no TDBoK text covers Domain 2, so no Domain 2 model carries the `tdbok` tag (all are `reflist`, `named` or `extra`). These were left out because no tier 1–3 source could be found: Kaufman's levels, CIPP's meanings, Rogers's adopter categories, TAM, DIKW, interview structure types, the Seven Cs' definitions (only their names are tested), Bloom's psychomotor levels, and the definitions of LCMS, KMS and performance management systems.

From Domain 1, still open: the TDBoK 1.3.5 lists (the order of the 10 team-conflict steps, the 9 tactics for defusing conflict, the basic strategies) and the TDBoK-style lists in 1.4.6, 1.5.x and 1.6.3. Only TDBoK-keyed study decks support them.
