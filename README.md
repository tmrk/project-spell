# Project Spell

Project Spell is a calm, full-screen spelling game for children. It reads a word aloud, lets the child type one letter at a time, and gives immediate visual and audio feedback. The interface deliberately keeps the game itself almost empty; configuration lives in a separate grown-ups panel.

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

## What is included

- Separate British-English and US-English banks, each with more than 350 words grouped across one through five syllables.
- Locale-aware interface copy and Web Speech voice selection, with language choice on the start screen and in grown-ups settings.
- Configurable minimum/maximum word length, syllable count, and words per round.
- Custom words, stored only in the browser.
- Shape-aware animated letter eyes that can be switched off in the grown-ups panel.
- Optional spoken prompts, sound effects, and background music.
- A fixed-length round with progress, completion feedback, and replay.
- Responsive layouts for touch devices, iPad portrait/landscape, and desktop.
- Installable PWA support with offline app, word, sound, and icon assets.
- Reduced-motion and keyboard-focus support.

Settings are persisted in `localStorage` under `project-spell:settings:v1`. No account, backend, analytics, or network storage is used. Speech uses the browser's Web Speech API. The app requests a voice matching the selected region, while the exact available voice depends on the device.

## Architecture

- `src/App.jsx` owns the round state and browser integrations (speech, audio, persistence).
- `src/game.js` contains the word bank and pure selection/settings helpers.
- `src/locales/` contains the display and spoken copy for each supported locale.
- `src/word-lists/` contains the regional entries and exclusions used to build each locale's word bank.
- `src/components/Letter.jsx` renders one animated letter character.
- `src/components/SettingsPanel.jsx` is the grown-ups configuration dialog.
- `src/App.scss` contains the visual system and responsive behaviour.
- `src/assets/app-icon*.svg` are the source artwork for generated PWA icons.
- `src/game.test.js` and `src/App.test.jsx` cover the pure rules and primary user flow.

The project uses React and Vite. It intentionally avoids a UI framework so the bundle and visual language stay small.

## Deployment

`npm run deploy` builds `dist/` and publishes it to the repository's `gh-pages` branch. Vite's base path is `/project-spell/`, matching the configured GitHub Pages URL.
