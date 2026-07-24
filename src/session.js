// Local-only resume state (owner request 2026-07-24, decision D-013). A "session" is the round a
// child is in the middle of: which words, how far through, and just enough scoring context to
// finish it fairly. Persisting it lets a child leave mid-round — press Home, close the tab — and
// come back to exactly the word and letter they were on. It stays on-device and scoped per child,
// like settings, stats and reward progress; persistence itself lives in App.jsx.
//
// Nothing here is personal data: it holds game words and small counters only.

export const SESSION_KEY = 'project-spell:session:v1';

const asIndex = (value) => (Number.isInteger(value) && value >= 0 ? value : 0);
const asStars = (value) => (Number.isInteger(value) && value >= 0 && value <= 3 ? value : 0);

/**
 * Snapshot the play state into a plain, storable shape. Returns null when there is no real round
 * to remember (no words), so callers can treat "nothing to resume" uniformly.
 */
export function createSession({
  locale = 'en-GB',
  gameMode = 'easy',
  roundKind = 'normal',
  words = [],
  wordIndex = 0,
  letterIndex = 0,
  colorSeed = 0,
  wordStars = [],
  startStars = 0,
  journeyStart = 0,
} = {}) {
  return normaliseSession({
    version: 1,
    locale,
    gameMode,
    roundKind,
    words,
    wordIndex,
    letterIndex,
    colorSeed,
    wordStars,
    startStars,
    journeyStart,
  });
}

export function normaliseSession(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const words = Array.isArray(value.words)
    ? value.words.filter((word) => typeof word === 'string' && word.trim())
    : [];
  if (!words.length) return null;

  // A stored round only ever covers words that are still ahead; the last word is never persisted
  // (finishing it moves the child to the complete screen), so the index stays inside the array.
  const wordIndex = Math.min(asIndex(value.wordIndex), words.length - 1);
  const letters = [...String(words[wordIndex])];
  const letterIndex = Math.min(asIndex(value.letterIndex), letters.length);

  return {
    version: 1,
    locale: typeof value.locale === 'string' ? value.locale : 'en-GB',
    gameMode: value.gameMode === 'normal' ? 'normal' : 'easy',
    roundKind: value.roundKind === 'super' ? 'super' : 'normal',
    words,
    wordIndex,
    letterIndex,
    colorSeed: asIndex(value.colorSeed),
    // Only stars for words already finished this round matter to the closing ceremony.
    wordStars: Array.isArray(value.wordStars)
      ? value.wordStars.slice(0, wordIndex).map(asStars)
      : [],
    startStars: asIndex(value.startStars),
    journeyStart: asIndex(value.journeyStart),
  };
}

/**
 * Is there anything worth coming back to? A round sitting untouched on the very first letter of
 * its first word is the same as no round at all — the child would lose nothing by starting fresh —
 * so it is not offered as a resume.
 */
export function isResumable(session) {
  const current = normaliseSession(session);
  if (!current) return false;
  return current.wordIndex > 0 || current.letterIndex > 0;
}
