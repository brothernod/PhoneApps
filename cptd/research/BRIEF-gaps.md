# Brief: fill the gaps in one shard's source file (step 2b)

A first research pass wrote `cptd/research/<dN>/<shard>.md`, but some testable items are still unsourced. Authors may only use what that file supports, so an unsourced item either gets dropped or becomes a guess. Your job is to source the most important gaps.

## Read first

1. `cptd/research/BRIEF-sources.md`: the format, source tiers, quote limits and habits. They all apply to you.
2. The shard file itself: every "Unverified", "Variants or contested" and "UNVERIFIED ENTRY" line, and "Open questions". You'll need the rest of the file for context.

## Do

- Rank the gaps by how likely the exam is to test them. Items **named in the statement wording** come first (see `scope.md`), then models on ATD's reading list, then the rest.
- With about **15 web calls**, confirm or correct as many as you can from tier 1–3 sources: the original author's own work, ATD (td.org articles, ATD Press pages, TD at Work issues), and publisher or university pages that quote the original. Search first. You can fetch only links that appeared in your own search results.
- **Edit the shard file in place**, so an author reading top to bottom sees the final state:
  - add new sources to the numbered source list;
  - fix item names, orders and counts where a better source says otherwise, and note what changed and why;
  - replace an "Unverified" line with the citation and a short quote, or leave it and say what you tried;
  - if a model can't be sourced at all, mark its heading `(UNSOURCED, do not author)`.
- Add a line `Gap fill: <date>, <n> web calls, resolved <x> of <y>` under the title.

Don't edit any other file, and don't commit.

- **Keep your history small.** Use targeted fetch prompts (the core wording plus every named element), never whole documents. Append to your file after every few calls. If you reach your web-call budget, or your history is getting long, stop: append what you have plus a line `Stopped at: <what's left>`, and return, so a follow-up agent can continue from the file.

## Return

A summary of 200 words or fewer: what you resolved, what changed, and what's still open.
