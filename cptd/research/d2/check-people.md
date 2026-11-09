# Check: people, Pass A (claims)

Inputs: `cptd/research/d2/claims-people.md` (content version 2026-11-04, 873 claims) and `cptd/research/d2/people.md`. Questions on Domain 1 models (`smart`, `zenger-folkman`) were checked against people.md. Only claims that aren't OK are listed.

| # | Claim id | Verdict | Evidence | Exact fix |
|---|---|---|---|---|
| 41 | haneberg.kind | MINOR | people.md line 68: "Kind: ordered (chapter 2's sub-headings, start to end of a coaching engagement)"; line 82: only items 2 and 3 look like alternatives. "In no particular order" tells the learner the headings have no sequence, which the source contradicts. | Keep `kind: 'set'`, but change `haneberg.note` to: "The ten parts are chapter 2's sub-headings in the book's table of contents, running roughly from the start to the end of an engagement; the model draws on a survey of about 40 experienced coaches. Opportunity and Offer and Request for Coaching look like two alternative starting points, so this app doesn't drill the order. The descriptions are inferred from the headings; the book's own definitions weren't available." |
