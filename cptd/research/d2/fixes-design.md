# Fixes: design (step 6)

Inputs: `check-design.md` (10 findings), the cold compare of `answers-design.md` (1 disagreement, 3 two-defensible flags), and `design.md`. The facilitator-guide tool [S12] still can't be seen (members-only), so the items resting on its fetch summary were removed rather than hedged.

After: 17 models, 53 questions, 1 case. `check-content.mjs` OK, with no new warnings (same d2 "no which-model item" list as before). `claims-design.md` (776 claims) and `cold-design.md` (57 items) were regenerated.

## Claims findings (Pass A)

| # | Id | Finding | Action | New text |
|---|---|---|---|---|
| 1 | statements['2.2.11'] (`content-d2.js`) | MISLEADING: label drops the "to the desired … outcomes" tail | fixed (checker's exact text) | "Selecting and aligning delivery options and media for training and/or learning events to the desired learning or behavioral outcomes" |
| 2a | statements['2.2.6'] (`content-d2.js`) | MINOR: "and" for "and/or" | fixed (checker's exact text) | "Designing blueprints, schematics, and/or other visual representations of learning and development solutions, such as wireframes, storyboards, and mock-ups" |
| 2b | statements['2.2.12'] (`content-d2.js`) | MINOR: "and" for "and/or" | fixed (checker's exact text) | "Designing and/or developing learning assets, such as role plays, self-assessments, training manuals, job aids, and visual aids, that align to a desired learning or behavioral outcome" |
| 3 | fg-cues (model, items 1–4), q-design-cue-ask, q-design-cue-do | UNVERIFIABLE: cue words and the closed set of four come only from a fetch summary of [S12] | removed: the model, both questions, and fg-cues from the `guides` kin entry. What stays is only that a facilitator guide contains "Scripted cues" (`guides` group member; q-design-guide-fg option), which [S12]'s contents list supports | (none) |
| 4 | content-sequencing (model, items 1–3), q-design-seq | UNVERIFIABLE: wording of the three sequencing options not confirmed | removed: the model, the question, and the kin entry (`{ hub: 'guides', with: ['fg-cues', 'content-sequencing'] }` deleted). Also cut the sequencing clause from q-design-guide-outline.why | q-design-guide-outline.why: "The tool says to build the outline from the task analysis. The slides follow the design; they don’t drive it." |
| 5 | guides.exam | UNVERIFIABLE: quotes "present the words in brief segments…" as verbatim | reworded: quotation removed, reduced to design.md's paraphrase (chunk content with headings and lean text) | "Build the outline from the task analysis. Choose images by learning objective, use process diagrams for procedures and decisions, and chunk the content with headings and lean text to manage cognitive load." |
| 6 | job-aid-tips.items.5.name | MINOR: "Chunk (the content)" vs source "Chunk the content" | fixed; the model still has "which model?" items (not in the checker's no-item list) | t: "Chunk the content" |
| 7 | abcd.who | MINOR: reads as if ABCD began in 2002 | fixed (checker's exact text) | "Heinich, Molenda, Russell & Smaldino, Instructional Media and Technologies for Learning (cited from the 7th ed., 2002)" |
| 8 | outcome-types.who | MINOR: credits the split itself to Phillips & Phillips | fixed (checker's exact text) | "General ID usage; the learning vs application terms are from Phillips & Phillips, Beyond Learning Objectives (2008)" |
| 9 | q-design-blend-ps.why | MINOR: "during the program, not after" is an inference; [S8] lists mentors under Interaction too | fixed together with cold flag C1 below | see C1 |
| 10 | storyboard.exam | MINOR: "ATD calls" overstates an unsigned ATD Blog post | fixed (checker's exact text) | exam starts: "An ATD Blog post calls a storyboard a written outline or script of the whole e-learning course; …" (rest unchanged) |

## Cold disagreements (Pass B)

| # | Id | Finding | Action | New text |
|---|---|---|---|---|
| C1 | q-design-blend-ps | two defensible: Performance Support and Interaction (design.md line 187 lists coaches or mentors under Interaction; line 191 lists coach, mentor or peer mentor under Performance Support) | reworded: replaced the defensible distractor Interaction with Assessment; key unchanged (Performance Support, "reinforcing learning on the job", line 191); why rewritten | o: ['Resources', 'Assessment', 'Performance Support', 'Course Content'], a: 2. why: "Performance Support reinforces learning on the job through a coach, mentor, or peer mentor. Resources are job aids and quick references, not people. (Interaction also lists coaches and mentors, but as exchanges by chat, discussion, email, or phone, so it isn’t offered here.)" |
| C2 | q-design-rpt-rot | two defensible: Role rotation and Multiple enactments (read literally) | reworded: replaced the Multiple enactments distractor with Auxiliary ego (line 260: speaks for a player; clearly not a replay technique); key unchanged; why now contrasts with role reversal | o: ['Role rotation', 'Role reversal', 'Observer sheets', 'Auxiliary ego'], a: 0. why: "Role rotation puts different players in the same part in successive replays to compare approaches. Role reversal keeps the same players and has them swap parts." |
| C3 | q-design-cue-ask | two defensible: ASK and DO (running a poll) | removed with finding 3 | (none) |
| C4 | case-design-safety.step-3 | cold agent skipped "Make the storyboard blend content, assets, instruction, and navigation" (a definition, not a planning choice) and doubted "Keep separate documents…" for a short module | reworded: deleted the "blend" option (still taught in the `storyboard` model); reworded the two-documents option to [S7]'s "at least two documents" (design.md line 145, no course-size condition); why updated. Step now has 2 right, 3 wrong | option: ["Keep at least two documents: one for the instructional design, one for the visual design", true]. why: "The ATD Blog suggests a storyboard when stakeholders are new to e-learning (they comment on placeholder images) or many content edits are expected, and advises keeping at least two documents, one for instructional design and one for visual design. The storyboard is the blueprint, so it comes before building, not after." |

## Not resolved

- None for [S12]. Round 2 (recheck.md task a) opened the PDF and confirmed the `guides` model and `q-design-guide-fg`, `-outline` and `-pg`, except two rows: "leader guide" isn't in the tool (removed), and the participant guide has "annotated illustrations", not images (fixed). Also confirmed: the guide purposes, the facilitator-guide parts (Course Pointers, High-Level Module Notes, Directions Throughout Module, Scripted cues), building the outline from the task analysis, lean text and brief segments, images chosen by learning objective, process diagrams, job aids in the appendix, choosing by delivery method, and that "Training manual" isn't in the document. The four cue descriptions are confirmed. The tool’s "Sequencing Options" are "Focus on the Job", "By Topic" and "By Tasks or Features", so removing `content-sequencing` was right. "Space for notes" is only partly supported but acceptable.

## Round 2 (recheck.md, 2026-11-09)

| Recheck row | Action |
|---|---|
| `statements['2.2.11']`, `['2.2.6']` SOURCE LAG | applied: design.md L9 and scope.md row 2.2.A now end "to the desired learning or behavioral outcomes", citing the 2020 Test Content Outline (added to design.md as [S21] with check-design #1's quote). design.md L8 "mock-ups". Deleted the recheck sentence at the end of design.md L5 and the last "Unverified" bullet (old L373). In scope.md the old note "*(possible tail paraphrased; no named examples)*" became the citation plus "no named examples". scope.md’s 2.2.C "mockups" was left as is (not in the fix). |
| `q-design-blend-ps.why` MISLEADING | applied exact text. |
| `guides.items[1].d` UNSUPPORTED | applied: "Gives instructors a plan for the learning experience." Removed "leader" at design.md old L267, L272 and L286; L272 now notes that [S12] doesn’t use "leader guide". |
| `guides.groups[0].m[0]` WORDING DRIFT | applied: "Exercises and annotated illustrations". Also changed "annotated images" to "annotated illustrations" in design.md’s participant-guide item (not in the fix; keeps the source consistent with the content). |
| `guides` task (a) result | design.md: participant/facilitator-guide items, design tips and the scripted-cue items are marked verified against the PDF on 2026-11-09, with the recheck’s quotes. The sequencing section was rewritten to "Focus on the Job", "By Topic", "By Tasks or Features". The final "Rechecked verbatim" bullet now says cues and sequencing are verified. "Not resolved" above was replaced with the result. The [S12] entry already said "ATD Member-Only Tools", so no change. Optional `fg-cues` restore: not done. No count question was written. |

`claims-design.md` (776 claims) and `cold-design.md` (57 items) regenerated.

Shared rows (content-d2.js and content.js, recheck.md task b and the "and/or" row): the Domain 2 "This domain" fact now reads "About 40 of the 90 multiple-choice questions (45% of the exam), plus a matching share of case steps, drawn from 18 statements: …" and Domain 1's (content.js) "About 18 of the 90 multiple-choice questions (20% of the exam), plus a matching share of case steps, drawn from 11 statements: …"; the rest of each fact is unchanged. `tips[0]` begins "This is the most heavily weighted domain (45%)." Labels 2.4.1, 2.4.4, 2.5.7 and 2.8.3 now say "and/or" as in scope.md.

Not applied word for word: the recheck's fact text ("About 68 of the exam’s 150 measurement opportunities (45%): roughly 40 of the 90 multiple-choice questions …", and Domain 1's "About 30 of the 150 measurement opportunities …"). The task said to count multiple-choice questions, not scoring points, so the 68/30 lead was dropped. "(20% of the exam)" was added to Domain 1's fact to match Domain 2's.

Checks: `node cptd/tools/check-content.mjs` OK, 0 errors, same 6 warnings as HEAD. `bash cptd/tools/tests/run_all.sh` all green.
