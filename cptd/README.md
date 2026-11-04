# CPTD Study: Building Personal Capability

A phone-first study app for Domain 1 of ATD's CPTD exam (Building Personal Capability, 20% of the exam). It turns the memorization into short, timed sprints and tracks every minute of real study time.

Open it at `https://brothernod.github.io/PhoneApps/cptd/`. On Android, open it in Chrome, then use the ⋮ menu and choose **Add to home screen** (or **Install app**). It runs full screen and works offline.

## What's in it

- **Sprints** of 2, 5, 10, or 15 minutes that mix due reviews with new material, so a free moment between kid duties still counts
- **Five drill types** built from each model: pick all the components, put the steps in order, match a description, name the model, and sort items into groups
- **181 exam-style questions** in the exam's four-option format, each with an explanation
- **Three case studies** in the format of the exam's second section (multi-select steps, +1 for right picks, −1 for wrong)
- **Learn** cards for 82 models: plain-language components, a memory hook, how it shows up on the exam, and the source
- **Listen** mode that reads models aloud for hands-free review
- **Spaced repetition** (reviews after 1, 3, 7, 14, then 30 days) with mastery tracked for each of the 11 exam statements
- **Study time, streaks, XP, levels, and stickers.** Time only counts while the app is on screen and in use. A daily goal (default 10 minutes) builds a streak, and busy-day passes, earned every 5 streak days, cover missed days

Progress is saved in the browser on each device. Settings has backup and restore.

## Content and accuracy

Scope is the 11 Domain 1 statements on the CPTD content outline (effective July 1, 2020, and still the outline in ATD CI's 2025 CPTD Certification Handbook): 1.1.3, 1.1.5, 1.1.6, 1.2.1, 1.3.1, 1.3.5, 1.3.10, 1.4.6, 1.5.3, 1.5.6, and 1.6.3.

Each model is labeled with how we know it matters: **In the TDBoK**, **On ATD's reading list**, **Named in the exam outline**, or **Good to know**. Sources include the TDBoK Guide (2nd ed.) sample chapter, ATD CI's handbook, study planning guide, and reading list, and the original authors. All descriptions are paraphrased. If anything disagrees with the TDBoK, trust the TDBoK.

## Files

- `index.html`: markup and styles
- `app.js`: the app (scheduling, sprints, time tracking, game mechanics)
- `content.js`: all study content (models, questions, cases, exam facts)
- `sw.js`, `manifest.webmanifest`, icons: offline support and home-screen install
- `fonts/`: Atkinson Hyperlegible Next (SIL Open Font License, see `fonts/OFL.txt`)
- `tools/check-content.mjs`: checks the content for broken or ambiguous questions

After editing `content.js`, run this from the repo root (needs Node):

```
node cptd/tools/check-content.mjs
```
