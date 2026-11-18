# Morning Read

One article each weekday morning instead of doomscrolling. A scheduled Claude task picks it by 5:30 AM ET. Your ratings, skips and reading habits tune the next pick.

**App:** https://brothernod.github.io/PhoneApps/morning-read/ (add it to your Home Screen from Safari)

## How it works

- **Data** lives on the `morning-read-data` branch, under `morning-read/`. It's kept off `main` so data updates don't rebuild Pages or clutter history.
  - `articles.json` and `tuning.json` are written by the morning Claude task.
  - `events.json` holds your status, ratings and reading sessions, and is written by the app.
  - `next.json` holds a one-off request for the next pick, written by the app.
- The app reads and writes those files through the GitHub contents API. Reading works without a token because the repo is public. Saving needs a fine-grained token limited to this repo with **Contents: Read and write**, pasted in Tuning → Connection. The token is kept in the app's local storage on your phone.
- To keep the data private, create a private repo, point both the app (Tuning → Connection → "Where the data lives") and the scheduled task at it, and give the token access to that repo.

## Feedback model

- **Verdict:** 🔥 / 👍 / 😐 / 👎. This is the main signal.
- **How far you got:** finished, skimmed or bailed.
- **Dials:** length, depth and nerdiness. Only tap the ones that were off.
- **Tags:** usable at work, homelab idea, could teach this, career, already knew it, hype, dated, paywall/broken, dry, great writing.
- **Topic vote:** more or less of this topic, plus an optional note.
- **Automatic tracking:** first open, each sitting, time away from the app after tapping a link (a rough guess at reading time), and hour of day.
- At most 3 articles stay unread. Older ones move to Someday.
