# Brief: write one shard's source file (step 2)

You're researching one shard of CPTD exam content for a study app. A friend is studying for the real exam with it, so a wrong fact is worse than a missing one. Your file is the **only** thing the authors and checkers will work from, so it has to stand on its own.

## Read first (only these)

1. `cptd/research/PLAN.md`: just the "Rules" section and step "2. Source files".
2. `cptd/research/LESSONS.md`: just "Sources, in order of trust" and "Mistakes the Domain 1 checkers found".
3. `cptd/research/scope.md`: just your shard's row in "Shards" and those statements' rows in the domain table. Use the full statement wording, including every named example, because each named example is something the exam can test.

Don't read `content.js` or `app.js`.

## Budget and habits

- About **20 web calls** (search plus fetch). Spend them on primary sources: the original authors, ATD/td.org pages, ATD's reading list, and the TDBoK sample chapter if your statements fall in it. Study decks are corroboration only.
- **Append to your output file as you go** (after every model or two), so nothing is lost if you're interrupted. If the file already has content when you start, you're a restart: keep what's there and continue from where it stops.
- Only follow links that appeared in your own search or fetch results.
- Quotes stay short (under 15 words), one or two per source. Everything else is paraphrase.

## What to cover

For each tested statement, the models, frameworks, lists and named concepts that the TDBoK and ATD materials tie to it, plus anything the statement names explicitly. A "model" here is anything with testable parts: a set of components, an ordered sequence of steps, a taxonomy, or a named principle with a definition.

- Aim for about **15–25 models per shard**. Depth beats breadth: every model you include needs its full item list, sourced.
- For statements with no named models ("Skill in …"), cover what ATD material says the skill consists of: the steps, criteria, types or options a TD professional is expected to know (for example the kinds of delivery options, or the criteria for choosing a technology).
- Include a model the statement names even if sources are thin, and say so.

## Output format: `cptd/research/<dN>/<shard>.md`

```
# <Shard name> (<statements>)

Sources used (numbered, so entries can cite [S1] and so on):
- [S1] Title, author/publisher, year, URL. Tier: 1 TDBoK / 2 ATD CI / 3 original author / 4 study deck / other

## <statement number>: <short label>

### <Model name>
- Origin: <author, year, work>. [S#]
- Tie to the exam: <the statement it serves, and how we know: named in the statement / on ATD's reading list (which book) / in the TDBoK / only general knowledge>
- Suggested tag: tdbok | reflist | named | extra (strongest tier actually shown, per LESSONS.md)
- Kind: ordered (and what the order means, e.g. "lowest to highest") | set
- Items, in the source's own terms (keep the source's exact word for each item name):
  1. <Item name>: <one-line paraphrase of what it means>. [S#] "<short quote>"
  2. …
- Groups (if the source groups the items): <group → items>
- Confusables: other lists or terms a test-taker could mix this up with (similar names, overlapping items, an umbrella model this belongs to). This is used to avoid ambiguous questions.
- Variants or contested points: different versions (e.g. original vs revised), disputed claims, common misattributions, a count that differs between sources. Say which version ATD uses, if you can tell.
- Unverified: anything you couldn't confirm in a tier 1–3 source. Say exactly what.
```

End the file with `## Open questions`: anything an author must not guess at.

- **Keep your history small.** Use targeted fetch prompts (the core wording plus every named element), never whole documents. Append to your file after every few calls. If you reach your web-call budget, or your history is getting long, stop: append what you have plus a line `Stopped at: <what's left>`, and return, so a follow-up agent can continue from the file.

- **Domain 3 only:** at the top of your file, confirm each of your statements' TDBoK number and full wording from the current handbook (some are unconfirmed or cut off in `scope.md`).

## Return

A summary of **300 words or fewer**: number of models, the sources you relied on most, and the unverified or contested points. Don't paste the file into your reply.
