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

export function getAlphabet(locale) {
  return [...ALPHABETS[normaliseLocale(locale)]];
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
