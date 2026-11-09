# Fixes: techkm

Inputs: `check-techkm.md` (Pass A, 9 findings) and `answers-techkm.md` (Pass B: 0 disagreements, 1 two-defensible flag). All edits are in `cptd/content-d2-techkm.js`. `check-content.mjs`: OK, no new warnings (same 6 warnings as with the HEAD version of this file). `claims-techkm.md` (793 claims) and `cold-techkm.md` (59 items) regenerated.

| # | Id | Finding | Action | New text |
|---|---|---|---|---|
| 1 | `tacit-explicit.who` | MISLEADING: credits Nonaka & Takeuchi as the source of tacit knowledge; it is Polanyi's (techkm.md line 169) | fixed (checker's exact text) | `who`: "Michael Polanyi (tacit knowledge: Personal Knowledge, 1958; The Tacit Dimension, 1966); applied to organizational knowledge by Ikujiro Nonaka & Hirotaka Takeuchi (1995) and Nonaka, Toyama & Konno (2000)" |
| 2 | `seek-sense-share.exam` | MISLEADING: "not personal knowledge management" too strong; Jarche has written "management/mastery" | fixed (checker's exact text) | `exam`: "The middle step is Sense, not “make sense” or “synthesize.” Jarche now calls PKM Personal Knowledge Mastery; he has also written “personal knowledge management/mastery,” and management is the usual meaning elsewhere." |
| 3 | `q-techkm-sss-pkm` | AMBIGUOUS (Pass A) and two-defensible A,D (Pass B): "Personal knowledge management" defensible; also only the key was in title case | fixed: replaced the defensible distractor, lowercased the key so all options share sentence case, new `why` (checker's text) | `o`: ['Personal knowledge modeling', 'Professional knowledge mapping', 'Peer knowledge mentoring', 'Personal knowledge mastery'], `a: 3`. `why`: "Jarche’s term is Personal Knowledge Mastery. The other options aren’t terms he uses for PKM." |
| 4 | `case-techkm-retiring.step-2` | AMBIGUOUS: step 1 calls the know-how tacit, so by Hansen et al.'s explicit/tacit test a candidate could reject "Make codification primary" | reworded stem and extended `why` (checker's exact text); options unchanged | `text`: "Most field work is repetitive: the same repairs recur across hundreds of sites, and the standard fixes can be written down step by step. You must choose the primary KM strategy. Which choices fit Hansen, Nohria, and Tierney?" `why` adds: "Hansen et al. also ask whether people rely on explicit or tacit knowledge. Here the recurring fixes are explicit, so people-to-documents fits, and the rarer tacit cases go to the supporting expert directory." |
| 5 | `codify-personalize.hook`, `groups.2` | MINOR: wording drift, "people with people" vs the article's "person-to-person" | fixed | `hook`: "Codify: people-to-documents, invest once and reuse many times. Personalize: person-to-person, charge for expert solutions." Personalization group now: 'Expert economics', 'Person-to-person', 'Expert directories', … (rest unchanged) |
| 6 | `atwood-km.note` | MINOR: ATD's product page words the five steps differently and lists "define your role" first | fixed (appended checker's text) | `note` ends: "ATD’s own product page calls it a five-step process and words it: determine your organization’s needs; locate knowledge sources; choose systems to gather and house information; compile, confirm, and circulate knowledge; maintain the knowledge system. Before these it lists defining your role and preparing to lead the effort." |
| 7 | `elearn-standards.who` | MINOR: reads as if Rustici co-owns the standards | fixed (checker's exact text) | `who`: "ADL Initiative, the standards’ owner, as described by Miller, Rutherford & Pack (Rustici Software) and Johnson (ADL), 2021" |
| 8 | `lms-guidebook.hook` | MINOR: "follow the verbs in statement 2.4.1" overstates; 2.4.1 has no set up/launch/run | fixed (checker's exact text) | `hook`: "Select, set up, connect, launch, run: the Part 2 chapters run in the order you’d do the work." |
| 9 | `curation-steps.src` | MINOR: listing Ready, Set, Curate implies the book presents the four steps | fixed (checker's exact text) | `src`: "CPTD content outline, statement 2.5.7 (the four verbs); the curator’s role from the publisher’s description of Betts & Anderson, Ready, Set, Curate (ATD Press; on ATD’s 2025 reading list)" |

Pass B had no key disagreements; its only flag is row 3.

## Round 2 (recheck.md, 2026-11-09)

The content was fine; the recheck said the source file lagged. The checker’s evidence is now in techkm.md as new sources [S21]–[S24] (Wikipedia "Tacit knowledge"; Jarche 2015; the Berkeley copy of the HBR article; ATD’s *Knowledge Management Basics* product page), each with a short quote.

| Recheck row | Action in techkm.md |
|---|---|
| `tacit-explicit.who` | Origin (old L169) now gives *Personal Knowledge* (1958) [S21] with check-techkm #1’s quote. |
| `seek-sense-share.exam` | Acronym line (old L349) adds [S22] "personal knowledge management/mastery" (https://jarche.com/?p=14382). |
| `codify-personalize.hook`, `groups.2` | Exhibit row 3 (old L234) cites [S23] "PERSON-TO-PERSON". "person-to-person" was deleted from the Unverified line (old L241) and from the open item (old L377), which now says it’s confirmed. |
| `atwood-km.note` | Atwood entry adds ATD’s wording [S24]: the five-step process with "Define your role…" first. |
| `case-techkm-retiring.step-2.why` | Hansen entry adds [S23] "Do your people rely on explicit or tacit knowledge to solve problems?" and the follow-on tacit sentence from check-techkm #4. |

No content change, so `claims-techkm.md` (793 claims) and `cold-techkm.md` (59 items) were regenerated only for the statement labels below.

Shared rows (content-d2.js and content.js, recheck.md task b and the "and/or" row): the Domain 2 "This domain" fact now reads "About 40 of the 90 multiple-choice questions (45% of the exam), plus a matching share of case steps, drawn from 18 statements: …" and Domain 1's (content.js) "About 18 of the 90 multiple-choice questions (20% of the exam), plus a matching share of case steps, drawn from 11 statements: …"; the rest of each fact is unchanged. `tips[0]` begins "This is the most heavily weighted domain (45%)." Labels 2.4.1, 2.4.4, 2.5.7 and 2.8.3 now say "and/or" as in scope.md.

Not applied word for word: the recheck's fact text ("About 68 of the exam’s 150 measurement opportunities (45%): roughly 40 of the 90 multiple-choice questions …", and Domain 1's "About 30 of the 150 measurement opportunities …"). The task said to count multiple-choice questions, not scoring points, so the 68/30 lead was dropped. "(20% of the exam)" was added to Domain 1's fact to match Domain 2's.

Checks: `node cptd/tools/check-content.mjs` OK, 0 errors, same 6 warnings as HEAD. `bash cptd/tools/tests/run_all.sh` all green.
