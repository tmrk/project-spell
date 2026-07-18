# Project Spell

Project Spell is a calm, full-screen spelling game for children. It reads a word aloud, lets the child type one letter at a time, and gives immediate visual and audio feedback. The interface deliberately keeps the game itself almost empty; configuration lives in a separate grown-ups panel.

## The story

Project Spell began in January 2023 as a small proof of concept for helping children practise spelling. Its playful letter faces and immediate sound feedback arrived in those early days. In 2026, the project was picked up again and shaped into the calmer, multilingual, privacy-conscious game it is today. The aim has stayed the same: make spelling practice feel clear, friendly, and a little bit magical.

## Local development

Requirements: Node.js 20.19 or newer. Node 24 is the recommended development version and is recorded in `.nvmrc`.

```sh
nvm use
npm install
npm run dev
```

Open `http://127.0.0.1:5173/project-spell/`.

Before handing off a change, run:

```sh
npm run check
```

## Contributor and agent workflow

When workspace-local collaboration files are present, start with `AGENT_WORKFLOW.md`, which explains how contributors share the repository safely. Project-specific constraints and commands also live in `AGENTS.md` when that workspace guide is present.

- `ACTIVE_WORK.md` to claim current scope and avoid overlapping edits.
- `RECENT_CHANGES.md` to pass on outcomes, validation results, and unfinished work.
- `DECISIONS.md` for durable product and architecture rationale.

These coordination files may be intentionally untracked. Read them and inspect `git status` before editing. Claim the task in `ACTIVE_WORK.md`, then record the result in `RECENT_CHANGES.md` before removing the claim.

## What is included

- British-English, US-English, Swedish, and Hungarian word banks with explicit syllable metadata.
- Locale-aware interface copy and Web Speech voice selection, with language choice on the start screen and in grown-ups settings.
- A privacy-safe first-visit default based on the browser's regional locale; saved language choices always take precedence.
- Configurable minimum/maximum word length, syllable count, and words per round.
- Custom words, stored only in the browser.
- An optional parent setting to accept an unaccented key for an accented letter; exact accents are required by default.
- Shape-aware animated letter eyes that can be switched off in the grown-ups panel.
- Gentle stars, milestone badges, and a child-facing sticker book whose collected word pictures can be tapped to hear them again.
- Optional spoken prompts, reusable sound effects, and rotating background music that ducks under speech.
- A fixed-length round with progress, completion feedback, a short fanfare, and replay.
- Responsive layouts for touch devices, iPad portrait/landscape, and desktop.
- Installable PWA support with offline app, word, sound, and icon assets.
- Reduced-motion and keyboard-focus support.

Settings are persisted in `localStorage` under `project-spell:settings:v1`. Anonymous play statistics and additive rewards use their own versioned, size-capped local keys; grown-ups can view a summary, export the data, or erase it in the app. No account, backend, analytics, personal data, or network storage is used. Speech uses the browser's Web Speech API. The app requests a voice matching the selected region, while the exact available voice depends on the device.

## Architecture

- `src/App.jsx` owns the round state and browser integrations (speech, audio, persistence).
- `src/game.js` contains the word bank and pure selection/settings helpers.
- `src/locales/` contains the display and spoken copy for each supported locale.
- `src/word-lists/` contains the regional entries and exclusions used to build each locale's word bank.
- `src/components/Letter.jsx` renders one animated letter character.
- `src/components/SettingsPanel.jsx` is the grown-ups configuration dialog.
- `src/components/StickerBook.jsx` is the child-facing collection overlay.
- `src/stats.js` and `src/progress.js` contain pure local play and reward aggregation.
- `src/stickers/map.js` maps concrete words in each locale to shared Noto Emoji artwork.
- `src/credits.js` is the in-app asset and dependency attribution catalogue.
- `src/App.scss` contains the visual system and responsive behaviour.
- `src/assets/app-icon*.svg` are the source artwork for generated PWA icons.
- `src/game.test.js` and `src/App.test.jsx` cover the pure rules and primary user flow.

The project uses React and Vite. It intentionally avoids a UI framework so the bundle and visual language stay small.

## Deployment

`npm run deploy` builds `dist/` and publishes it to the repository's `gh-pages` branch. Vite's base path is `/project-spell/`, matching the configured GitHub Pages URL.
