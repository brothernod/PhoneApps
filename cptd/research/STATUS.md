# Status

Update this at the end of every step: tick the step, log the spend, and rewrite "Next action".

## Next action

**Chat B1 is finishing step 2: a second gap fill for `biz`, `market` and `data`** after the usage-limit reset at 4:20 PM ET on 2026-11-09 (their first gap fill was cut short when the fetch tool hit the 5-hour limit after 10–14 calls). B1 has a scheduled check-in to run them; if that chat is gone, the next chat does it: one xhigh agent per shard on `BRIEF-gaps.md`, starting from each file's latest "Stopped at" line, wave of 3, commit, then go to B2.

**Then chat B2 (Domain 3, steps 3–4).** Jonathan opens a new chat at **high** effort and says: *"Continue the CPTD build from cptd/research/PLAN.md in brothernod/PhoneApps."*
- Branch `cptd-d3`. Statements, confirmed wording and TDBoK numbers are in `scope.md` (Domain 3 table); shard ownership in `research/d3/OWNERSHIP.md`. Tell each author which shard owns a shared model and which existing ids to reference (that file lists them).
- 7 authors on `BRIEF-author.md` with dN = d3, `effort: "high"`, waves of at most 3 (2 if the window is past half used). Write `content-d3.js` (domain block, 7 areas, 32 statement labels, exam facts and tips) first, then `content-d3-<area>.js`; add the script tags to `index.html` and the files to `sw.js` (bump the cache name).
- Authors must skip headings marked UNSOURCED / do not author, and treat study-deck-only items as `extra` at most. Model headings per file (do-not-author in brackets): biz 16 [1], change 19 [2], data 25 [2], market 19 [2], od 27 [13], perf 22 [5], strategy 21 [8]; about 115 authorable, some of them pointers to other shards.
- Then step 4: `node cptd/tools/check-content.mjs d3` to 0 errors and `run_all.sh` green, commit, update this file, stop for B3.

Step 2 progress (first pass / gap fill): change ✓/✓, od ✓/✓, perf ✓/✓, strategy ✓/✓, biz ✓/partial, market ✓/partial, data ✓/partial.

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

- [ ] 2. Source files `research/d3/*.md` (chat B1, xhigh agents): 7 first passes and 7 gap fills done 2026-11-09; second gap fill for biz, market, data pending. TDBoK numbers and full wording confirmed in `scope.md`
- [ ] 3. `content-d3.js` plus `content-d3-<area>.js` (chat B2, high authors)
- [ ] 4. Machine checks pass (chat B2)
- [ ] 5. Claims pass and cold-answer pass (chat B3, xhigh)
- [ ] 6. Fixes (high), re-check (xhigh), merge to `main`, spend logged, final report (chat B3)

## Spend log

| When | Work | Session meter | Weighted tokens | Max history | Notes |
|---|---|---|---|---|---|
| 2026-11-04 to 11-08 | Domain 1, whole project (build, two audit rounds, UI fixes, reports) | about $82 | about 27M (whole project) | about 780k | Baseline. Hit the usage limit 3 times. |
| 2026-11-08 to 11-09 | Domain 2, conversation A (steps 0–6) | not available (`spend.py` finds no transcript in a cloud session) | agents reported about 4.75M tokens over 34 runs; main conversation stayed under about 200k history | about 225k (one agent) | Hit the 5-hour usage limit twice, with 5–7 agents running at once. All agents resumed with their work intact. |
| 2026-11-09 | Domain 3 step 2 (chat B1): 7 first-pass + 7 gap-fill agents | not available | agents reported about 1.76M tokens over 14 runs (first passes 115–154k each, gap fills 102–140k) | about 154k (one agent) | 2–3 agents at once. The fetch tool hit the 5-hour limit near the end of the last wave (biz, market, data gap fills stopped early). Agents overran their web-call budget (up to 27 vs 15–20). |

## Couldn't verify (carry into the final report)

From Domain 2: no TDBoK text covers Domain 2, so no Domain 2 model carries the `tdbok` tag (all are `reflist`, `named` or `extra`). These were left out because no tier 1–3 source could be found: Kaufman's levels, CIPP's meanings, Rogers's adopter categories, TAM, DIKW, interview structure types, the Seven Cs' definitions (only their names are tested), Bloom's psychomotor levels, and the definitions of LCMS, KMS and performance management systems.

From Domain 1, still open: the TDBoK 1.3.5 lists (the order of the 10 team-conflict steps, the 9 tactics for defusing conflict, the basic strategies) and the TDBoK-style lists in 1.4.6, 1.5.x and 1.6.3. Only TDBoK-keyed study decks support them.
