# Status

Update this at the end of every step: tick the step, log the spend, and rewrite "Next action".

## Next action

All three domains are on `main` (Domain 3 merged by chat B3, 2026-11-10).

**Start chat B4 (final accuracy pass).** Jonathan opens a new chat at **high** effort and says: *"Continue the CPTD build from cptd/research/PLAN.md in brothernod/PhoneApps."* Follow `PLAN.md` "After Domain 3: chat B4", on a branch `cptd-b4`. B3's notes:
- Usage limit: B3 hit the 5-hour limit with 3 xhigh re-check agents just launched, about 23 agent runs into its window. Run at most 3 at once and expect one limit pause.
- Re-check fixes were mostly giveaways the fixers introduced (key longest, stem echo, absolutes in wrong options). B4's sampled audit should look for these too.
- `BRIEF-recheck.md` (new in B3) works for B4 step 4.

## Chat B4 checklist

- [ ] 1. Cross-domain consistency: script listing shared names, item terms and options across domains, then one fresh `xhigh` agent
- [ ] 2. Sampled audit: ~60 random questions weighted 20/45/35, cold answers by a fresh `xhigh` agent, compare, adjudicate, error rate
- [ ] 3. "Report this question" button, reports list via `upgrade()`, Settings view and copy, tests, cache bump
- [ ] 4. Fixes (high), re-check (`BRIEF-recheck.md`, xhigh), tests, merge `cptd-b4` to `main`, spend logged (C, T, duration), short report

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
- [x] 5. Claims pass and cold-answer pass (chat B3, 14 xhigh agents, 2026-11-09): 5,619 claims and 419 cold items. No wrong keys. 115 claim issues (8 false, 9 ambiguous, the rest misleading, unverifiable or minor), and 19 cold items with two defensible answers
- [x] 6. Fixes (7 fixers, high), re-check (3 fresh xhigh agents per `BRIEF-recheck.md`: 22 more issues in 147 rows: 2 ambiguous, 1 misleading (Gilbert’s formula), the rest minor, mostly giveaways the fixes introduced. All fixed), tests green, merged to `main` 2026-11-10, spend logged, final report. 114 models, 390 questions (`q-biz-block-resist` removed), 7 cases. Per-agent log: `d3/agents-b3.md`

## Spend log

| When | Work | Session meter | Weighted tokens | Max history | Notes |
|---|---|---|---|---|---|
| 2026-11-04 to 11-08 | Domain 1, whole project (build, two audit rounds, UI fixes, reports) | about $82 | about 27M (whole project) | about 780k | Baseline. Hit the usage limit 3 times. |
| 2026-11-08 to 11-09 | Domain 2, conversation A (steps 0–6) | not available (`spend.py` finds no transcript in a cloud session) | agents reported about 4.75M tokens over 34 runs; main conversation stayed under about 200k history | about 225k (one agent) | Hit the 5-hour usage limit twice, with 5–7 agents running at once. All agents resumed with their work intact. |
| 2026-11-09 | Domain 3 step 2 (chat B1): 7 first-pass + 7 gap-fill agents | not available | agents reported about 1.76M tokens over 14 runs (first passes 115–154k each, gap fills 102–140k) | about 154k (one agent) | 2–3 agents at once. The fetch tool hit the 5-hour limit near the end of the last wave (biz, market, data gap fills stopped early). Agents overran their web-call budget (up to 27 vs 15–20). |
| 2026-11-09 | Domain 3 step 2, second gap fill for biz, market, data (chat B1) | not available | about 341k over 3 runs (107–121k each) | about 121k | No limit errors; 13–14 web calls each. Step 2 total about 2.1M over 17 runs. |
| 2026-11-09 | Domain 3 steps 3–4 (chat B2): 7 author agents (high), machine checks | not available | about 1.29M over 7 runs (165–201k each) | about 201k (one agent); main chat well under 100k | 3 agents at once, no limit errors. Authors ran 15–29 tool calls each. Domain 3 so far about 3.4M over 24 runs. |
| 2026-11-09 to 11-10 | Domain 3 steps 5–6 (chat B3): 7 cold + 7 claims (xhigh), 7 fixers (high), 3 re-checks (xhigh), 1 re-check fixer (high) | not available | about 3.34M over 25 runs. Cold passes 77–83k with 3–4 tools and about 1.6 min each. Claims passes 175–201k, 24–33 tools, 6–8 min. Fixers 89–141k, 11–38 tools, 2–4 min. Re-checks 187–197k, 36–42 tools, 8–11 min | about 201k (one agent); main chat about 170k | Hit the 5-hour limit once (3 re-checks killed at launch, relaunched after the reset 5½ h later). Estimated about $37 for agents plus about $13 for the main chat (per `PLAN.md` Costing). |

**Estimated cost (from `PLAN.md` Costing; ±30%).** B3 measured about $11 per million reported agent tokens, using real tool counts. Applying that to earlier runs: Domain 2 is about $52 for agents plus about $15 for its main conversation, so **about $65–70**. Domain 3 is B1 about $23, B2 about $14, B3 about $39 for agents including the killed launches, plus about $27 for the three main chats, so **about $100**. That is about $0.25 per Domain 3 question (390) or about $0.20 per question plus model card (504). Domain 1's metered $82 also paid for the whole app build and two audit rounds.

## Couldn't verify (carry into the final report)

From Domain 2: no TDBoK text covers Domain 2, so no Domain 2 model carries the `tdbok` tag (all are `reflist`, `named` or `extra`). These were left out because no tier 1–3 source could be found: Kaufman's levels, CIPP's meanings, Rogers's adopter categories, TAM, DIKW, interview structure types, the Seven Cs' definitions (only their names are tested), Bloom's psychomotor levels, and the definitions of LCMS, KMS and performance management systems.

From Domain 1, still open: the TDBoK 1.3.5 lists (the order of the 10 team-conflict steps, the 9 tactics for defusing conflict, the basic strategies) and the TDBoK-style lists in 1.4.6, 1.5.x and 1.6.3. Only TDBoK-keyed study decks support them.

From Domain 3:
- These models are partial on purpose, and their notes say so: `sb-phases` gives 7 chapter titles of the book's eight-phase model, and `block-resistance` gives 7 of Block's 14 faces.
- Three facts came from the checkers' web fetches, not the source files (URLs in `d3/check-change.md` and `d3/recheck-perf.md`). They are Prosci's barrier-point rule, the three-phase grouping in Kotter's 1996 *Leading Change*, and Gilbert's p. 76 statement. Gilbert's question was rewritten because no source shows him writing "P = B × E".
- The HPI principle labels "top-down" and "measurable" are the app's own, and the note says so. The four `perf` analysis descriptions are cut back to what the source supports.
