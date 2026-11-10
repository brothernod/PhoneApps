# Plan: add CPTD Domains 2 and 3

Agreed with Jonathan on 2026-11-08. Read this first, then `STATUS.md` (where things stand) and `LESSONS.md` (how the app and content work, and what went wrong in Domain 1). Don't read anything else until a step needs it.

## Goal

Add the other two CPTD domains to the study app at https://brothernod.github.io/PhoneApps/cptd/ (repo `brothernod/PhoneApps`, folder `cptd/`):

| Domain | Name | Exam weight |
|---|---|---|
| 1 (done) | Building Personal Capability | 20% |
| 2 | Developing Professional Capability | 45% |
| 3 | Impacting Organizational Capability | 35% |

The weights come from ATD CI's 2025 CPTD Certification Handbook (recorded in `content.js` → `exam.facts`). Step 0 re-confirms them.

Two requirements, in this order:

1. **Accuracy at the Domain 1 bar or better.** A friend is studying for the real exam with this app. A wrong fact or an ambiguous question is worse than a missing one.
2. **A fraction of Domain 1's token cost, and no usage-limit blowouts.** Domain 1 hit the usage limit three times.

## Why Domain 1 was expensive

The whole project cost about $80 by the session's own meter. Weighted shares (cache reads ×0.1, cache writes ×2, output ×5):

| Share | Cause |
|---|---|
| 35% | The main conversation re-reading its own history. One chat did everything, and its history reached about 780k tokens before it was compacted. Every step re-reads all of it. |
| 14% | Files, test output and web pages pulled into that same history. |
| 9% | Main conversation thinking and writing. |
| 18% | The two fact-checker agents thinking. Their brief was open-ended ("check everything in these areas against anything you can find"). |
| 17% | Fact-checkers reloading their history. Each collected 100+ web pages (up to about 220k tokens of history). One paused just over 5 minutes between steps, longer than the cache lasts, and reloaded its whole history 11 times, plus again after a 5½-hour usage-limit wait. |
| 6% | Fact-checkers re-reading their history. |

There was also rework: two review rounds rewrote content after it was written (49 questions rebalanced, decoy rules added afterwards).

**Not waste:** the two checkers split the content between them rather than duplicating each other, and between them they found a wrong answer key, two swapped definitions, a wrong model and several ambiguous questions. Independent checking stays.

## Rules

1. **Short histories.** Each domain gets its own new conversation. Heavy work (research, checking) goes to helper agents whose history is thrown away when they finish. Hand-offs go through files in `cptd/research/`, never through chat history. Target: no history over about 100k tokens, checked with `tools/spend.py` ("max ctx").
2. **Research once, into files.** Each group of tested statements gets a source file. It lists every model's exact components or steps, with source links and short quotes. Authoring and checking work from those files. They go back to the web only for a claim the file can't support.
3. **Check claims, not "everything."** A script turns content into a numbered list of atomic claims ("Kirkpatrick has four levels, in this order", "q-x's answer is B because …"). Checkers verify each claim against the source file and return only discrepancies, in a fixed table.
4. **Write it right the first time.** The authoring checklist in `LESSONS.md` and `tools/check-content.mjs` enforce Domain 1's lessons while writing, instead of in review rounds afterwards.
5. **No stalls.** Agents run in waves of **at most 3 at once** (2 if the 5-hour window is already past half used when a wave starts), sized to finish in one go, and write results to their file as they go. Commit after every wave. If a usage limit interrupts an agent, resume it with SendMessage after the reset if its history is under about 100k tokens; above that, start a fresh agent from its file, because resuming reloads its whole history.
6. **Cap each agent's history.** Briefs tell agents to stop near their web-call budget, append what they have, and note where they stopped, so a follow-up agent carries on from the file. Domain 2's largest agent reached about 225k; the target is about 100k.

Not used, because they'd risk accuracy: a smaller model or lower reasoning effort for checking.

## Effort per step (from Domain 3 on)

Agreed with Jonathan on 2026-11-09. Agents only get a non-default effort when the brief says so, so the main conversation must pass `effort` explicitly on every Agent call.

| Work | Effort | Why |
|---|---|---|
| Main conversation | high | It hands out work and reads short summaries; extra-high buys little there and its thinking stays in the history. Jonathan sets this when he opens the chat. |
| Step 2 source research, first pass and gap fill | xhigh | Quality going in early sets the ceiling for everything after it. |
| Step 3 authoring | high | Works only from the source files, and is checked twice afterwards. Was high in Domain 2 with no wrong keys found. |
| Step 5 claims pass and cold-answer pass | xhigh | This is where accuracy is protected. |
| Step 6 fixers | high | They apply listed fixes word for word. |
| Step 6 re-check | xhigh | It found 13 issues after Domain 2's fixes, including new giveaways. |

## How the work is split

- **Conversation A: Domain 2.** Steps 0–6 below, then **stop at the checkpoint** and report to Jonathan. He reviews before Domain 3 starts.
- **Conversation B: Domain 3.** Steps 2–6 again, reusing everything from A (step 0 already covered both domains; step 1 is done once). Domain 3 is about 1.8× Domain 2 (32 statements, 7 shards), and Domain 2's single main conversation reached about 200k history, so B is split into three chats, each picking up from `STATUS.md`:
  - **B1:** step 2 (first pass and gap fill for all 7 shards, about 14 agent runs).
  - **B2:** steps 3–4 (7 authors, then machine checks).
  - **B3:** steps 5–6 (claims and cold passes, fixes, re-check, merge to `main`, final report).

**Work in progress lives on a branch.** If a `cptd-dN` branch exists for the domain being built, check it out first: its `STATUS.md` is the current one, and `main`'s may be out of date.

To start a conversation, Jonathan says: *"Continue the CPTD build from cptd/research/PLAN.md in brothernod/PhoneApps."* The new conversation adds and clones the repo, reads `PLAN.md`, `STATUS.md` and `LESSONS.md`, and picks up at "Next action" in `STATUS.md`.

### After Domain 3: chat B4 (final accuracy pass)

Agreed with Jonathan on 2026-11-09. Starts after B3 has merged Domain 3 into `main`. Open the chat at **high** effort. Not a repeat of step 5: it covers what no per-shard checker could see. Work on a branch `cptd-b4`, merge when done.

1. **Cross-domain consistency** (one fresh agent, `effort: "xhigh"`). A script lists every model name, item term and question option that appears in more than one domain, or that word-stem-clashes across domains. The agent checks each for: the same model described differently in two domains, a term worded differently from the source in one place, and "which model?" or question options where a model from another domain also fits. Same verdict table as `BRIEF-check.md`. Needs `kin` across domains where overlap is real.
2. **Sampled audit** (one fresh agent, `effort: "xhigh"`). A script draws about 60 random questions across all three domains, weighted 20/45/35, and writes them without keys. The agent answers cold and flags any with two defensible options. A script compares with the keys; each disagreement or flag is adjudicated against the source files (a second fresh `xhigh` agent if there are more than a handful). Report the error rate. If any one area shows more than one real problem, re-check that area with the step 5 briefs.
3. **"Report this question" button** (one agent, `effort: "high"`, or the main chat if small). On the answer screen of every question, model card and case step: a small button that saves the card key, the date and an optional note to a `reports` list in state (via `upgrade()`, never renaming `cptd-bpc-v1`). Settings gets a way to view the reports and copy them as text, so Yvonne can send them to Jonathan. Tests in `run_all.sh`. Bump the service worker cache.
4. Apply fixes (`effort: "high"`), re-check changed items (`xhigh`), tests, merge to `main`, spend logged with C, T and duration, and a short report: error rate, what changed, cost.

Expected cost: about $15–25.

## Steps

### 0. Scope (main conversation, small)
- Get the current ATD CI CPTD Certification Handbook. Record the tested statements for Domains 2 and 3 with their exact wording, plus the domain weights and question counts, in `research/scope.md`. Domain 1's handbook list mapped letters to statements (1.1.A = 1.1.3, and so on); expect the same style.
- Group the tested statements into **shards** of about 4–6, along capability-area lines (2.1 Learning Sciences … 2.8 Evaluating Impact; 3.1 Business Insight … 3.8 Future Readiness), and list them in `scope.md`.
- Estimate size. Domain 1 had 11 statements, 83 models, 183 questions and 3 cases. Tell Jonathan the estimate in a line or two, then carry on, unless it's far larger than expected.

### 1. Multi-domain app support (once, in conversation A)
- Split content: `content.js` stays Domain 1. Add `content-d2.js` and `content-d3.js` in the same format, and merge them all at load. Ids must be unique across domains (card keys are `m:<model>:<type>` and `q:<id>`), and existing Domain 1 progress must keep working.
- Add a domain picker on Home, with sprints per domain or across all domains. Show progress and mastery per domain, filter Learn by domain, and group cases by domain. Exam countdown and settings stay shared.
- Update titles and descriptions that say "Building Personal Capability" (`app.js` brand line and About text, `index.html` meta, `manifest.webmanifest`).
- Extend `tools/check-content.mjs` for multiple domains, and add `tools/claims.mjs` (step 5).
- Test with a two-model stub domain, then remove the stub. Run `tools/tests/run_all.sh`. Commit.

### 2. Source files (helper agents, 2–3 at a time)
One agent per shard. The brief gives **paths, not pasted content**: `PLAN.md` (this section), `LESSONS.md` (sources and error types), `scope.md` (its statements) and its output path. Limits: about 20 web calls, and append to its file as it goes. It returns a summary of 300 words or fewer.

Output: `research/d2/<shard>.md`. For each tested statement, list the models the TDBoK and ATD's materials tie to it. For each model, give:
- name, author or origin, and whether it's ordered;
- every component or step in the source's own words;
- a source link and a short quote for each fact;
- which source tier supports it (see `LESSONS.md`);
- anything contested or unverifiable, called out explicitly.

### 3. Authoring (main conversation or one agent per shard)
- Write `content-dN.js` **from the source files only**: no new web research, and every model, item and question traceable to a source-file line.
- Follow the authoring checklist in `LESSONS.md`. Run `node cptd/tools/check-content.mjs` after each shard, and fix before moving on.
- Add `kin` groups for umbrella and overlapping models at authoring time.

### 4. Machine checks (scripts, nearly free)
`bash cptd/tools/tests/run_all.sh`, with the local server running from the repo root. All must pass before step 5.

### 5. Independent check (fresh agents that didn't write the content)
Per shard, two passes:
- **Claims pass.** `node cptd/tools/claims.mjs <shard>` writes `research/dN/claims-<shard>.md`. The agent checks each claim against the source file, goes to the web only where the file has no quote, and returns a table: claim #, verdict (OK / WRONG-KEY / FALSE / AMBIGUOUS / MISLEADING / MINOR / UNVERIFIABLE), evidence, exact fix.
- **Cold-answer pass.** A script writes the shard's questions **without answer keys**. The agent answers each one and marks any where two options are defensible. A script compares its answers with the keys; every disagreement or "two defensible" flag gets adjudicated against the sources.

### 6. Fix, re-check, commit, report
- Apply only the listed fixes. Re-check just the changed items, with one small agent. Run the tests again.
- Commit and push (commit messages end with the session's Co-Authored-By and Claude-Session lines).
- Update `STATUS.md`: steps done, spend from `python3 cptd/tools/spend.py`, and the list of things that couldn't be verified.
- **Checkpoint after Domain 2:** report to Jonathan (what was added, the unverified list, spend versus Domain 1) and stop.

## Main-conversation habits
- Don't read whole files. `content.js` and `app.js` are big; use grep, line ranges, or a script that prints a summary.
- Keep command output short: pipe through `tail`, `grep` or `cut`. `run_all.sh` already prints only pass/fail lines.
- Look at screenshots only when checking a visual change.
- Don't paste source files or content into agent briefs. Give paths.
- Commit at the end of every step, so an interrupted conversation loses nothing.

## Expected cost
This is an estimate, to be checked at the checkpoint. Per question and per model, roughly a third to a half of Domain 1's cost, mostly from removing the history re-reading and the reloads. Domains 2 and 3 are bigger than Domain 1 (45% and 35% of the exam versus 20%), so the totals depend on step 0's statement count. Report actual spend at every commit.

## Costing (for the final report, and for pricing future projects)

Cloud sessions have no dollar meter, and the token figure an agent reports when it finishes is its **final history size**, not what it spent: every turn re-reads the history (cheap, cached), and new history is written to the cache once (expensive). So estimate cost from three numbers per agent, which the completion notice gives: reported tokens (C), tool uses (T) and duration.

Opus 5.5 list prices per million tokens (Nov 2026): input $4, output $20, cache write $5, cache read $0.20. Thinking is billed as output.

Per agent, roughly:
- cache reads ≈ T × C ÷ 2, at $0.20/M
- cache writes ≈ C, at $5/M (add C again for each pause over 5 minutes, such as a usage-limit wait)
- output ≈ 0.2 × C, at $20/M (thinking-heavy xhigh work; use 0.1 for high)

For the main chat, use its final history and number of turns the same way, and add one full cache write of its then-current history for every wait on agents longer than 5 minutes; those waits are most of a coordinator chat's cost.

From chat B3 on, log C, T and duration for every agent in the spend log (not just C), so the final report's estimate uses real T rather than a guess. The final report gives: estimated dollars per domain, per agent run, per shard, per model and per question, and how Domain 1's metered $82 compares.
