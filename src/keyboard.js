// Pure key-set construction for the optional on-screen keyboard (roadmap G8.3).
// The system keyboard remains the default; this exists for children who cannot yet find
// letters on a physical keyboard. No browser APIs here — see D-001.

import { normaliseLocale } from './locales';

export const KEYBOARD_MODES = Object.freeze(['system', 'full', 'simple']);

// Letters only, lower case, in the order a child would meet them in that language.
// Hungarian and Swedish include their accented vowels; digraphs (cs, sz…) are deliberately
// absent because the game matches one character at a time.
const ALPHABETS = Object.freeze({
  'en-GB': 'abcdefghijklmnopqrstuvwxyz',
  'en-US': 'abcdefghijklmnopqrstuvwxyz',
  'sv-SE': 'abcdefghijklmnopqrstuvwxyzåäö',
  'hu-HU': 'aábcdeéfghiíjklmnoóöőpqrstuúüűvwxyz',
});

export const SIMPLE_KEY_COUNT = 9;

// Physical keyboard layouts (owner request 2026-07-24). The full on-screen keyboard mirrors the
// real keyboard a child is growing into — staggered rows and language-specific arrangement — so
// the shape on screen matches the shape under their fingers, instead of a plain alphabetical grid.
// Lowercase letters only: the game matches one character at a time, so no modifier, number or
// punctuation keys appear. Each row's `offset` is a horizontal shift measured in key pitches (one
// key plus one gap). The values are the true letter offsets of a real board: on QWERTY the home
// row sits a quarter key right of the top row and the bottom row three quarters right; Hungarian's
// ISO board carries the í key out to the left of the bottom row, so its rows climb a quarter key
// at a time (í flush left, q indented, a indented more).
const KEYBOARD_LAYOUTS = Object.freeze({
  // QWERTY
  'en-GB': [
    { keys: 'qwertyuiop', offset: 0 },
    { keys: 'asdfghjkl', offset: 0.25 },
    { keys: 'zxcvbnm', offset: 0.75 },
  ],
  'en-US': [
    { keys: 'qwertyuiop', offset: 0 },
    { keys: 'asdfghjkl', offset: 0.25 },
    { keys: 'zxcvbnm', offset: 0.75 },
  ],
  // Swedish QWERTY, with å after p and ö ä after l.
  'sv-SE': [
    { keys: 'qwertyuiopå', offset: 0 },
    { keys: 'asdfghjklöä', offset: 0.25 },
    { keys: 'zxcvbnm', offset: 0.75 },
  ],
  // Hungarian QWERTZ (ISO): accented vowels down the right-hand side, í out on its own to the
  // left of the bottom row.
  'hu-HU': [
    { keys: 'qwertzuiopőú', offset: 0.25 },
    { keys: 'asdfghjkléáű', offset: 0.5 },
    { keys: 'íyxcvbnmöüó', offset: 0 },
  ],
});

export function getAlphabet(locale) {
  return [...ALPHABETS[normaliseLocale(locale)]];
}

export function getKeyboardLayout(locale) {
  return KEYBOARD_LAYOUTS[normaliseLocale(locale)] ?? KEYBOARD_LAYOUTS['en-GB'];
}

// A tiny deterministic generator so a word's simple keyboard looks the same every time the
// child sees that word, instead of reshuffling under their fingers on every render.
export function seededRandom(seed) {
  let state = (seed >>> 0) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

export function hashWord(word) {
  return [...String(word)].reduce((hash, character) => (hash * 31 + character.codePointAt(0)) >>> 0, 7);
}

function shuffle(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

/**
 * The easier tier: every letter the word needs, padded with decoys up to `size`.
 *
 * The word's own letters are never dropped — a keyboard that cannot spell the word in front of
 * it would strand the child — so a long word simply gets a bigger keyboard than `size`.
 */
export function buildSimpleKeys(word, locale, { size = SIMPLE_KEY_COUNT, random } = {}) {
  const alphabet = getAlphabet(locale);
  const letters = [...String(word ?? '').normalize('NFC').toLocaleLowerCase(normaliseLocale(locale))];
  const needed = [...new Set(letters.filter((letter) => alphabet.includes(letter)))];
  if (!needed.length) return [];

  const draw = random ?? seededRandom(hashWord(word));
  const decoyPool = shuffle(alphabet.filter((letter) => !needed.includes(letter)), draw);
  const decoys = decoyPool.slice(0, Math.max(0, size - needed.length));

  return shuffle([...needed, ...decoys], draw);
}

export function buildKeys(mode, word, locale, options = {}) {
  if (mode === 'full') return getAlphabet(locale);
  if (mode === 'simple') return buildSimpleKeys(word, locale, options);
  return [];
}

/**
 * Keys grouped into the rows the on-screen keyboard draws.
 *
 * `full` follows the language's physical layout so the board looks like the real thing. `simple`
 * has no real board to mirror — its letters are hand-picked per word — so it keeps its short
 * shuffled set, balanced into one or two tidy centred rows with no stagger.
 */
export function buildKeyRows(mode, word, locale, options = {}) {
  if (mode === 'full') {
    return getKeyboardLayout(locale).map((row) => ({ keys: [...row.keys], offset: row.offset }));
  }
  if (mode === 'simple') {
    const keys = buildSimpleKeys(word, locale, options);
    if (!keys.length) return [];
    const perRow = keys.length > 6 ? Math.ceil(keys.length / 2) : keys.length;
    const rows = [];
    for (let index = 0; index < keys.length; index += perRow) {
      rows.push({ keys: keys.slice(index, index + perRow), offset: 0 });
    }
    return rows;
  }
  return [];
}
