import { describe, expect, it } from 'vitest';
import { createSession, isResumable, normaliseSession } from './session';

describe('play session snapshot', () => {
  it('keeps the round, word and letter a child was on', () => {
    const session = createSession({
      locale: 'hu-HU',
      gameMode: 'normal',
      roundKind: 'super',
      words: ['macska', 'kutya', 'hal'],
      wordIndex: 1,
      letterIndex: 3,
      colorSeed: 2,
      wordStars: [3],
      startStars: 12,
      journeyStart: 2,
    });

    expect(session).toMatchObject({
      locale: 'hu-HU',
      gameMode: 'normal',
      roundKind: 'super',
      words: ['macska', 'kutya', 'hal'],
      wordIndex: 1,
      letterIndex: 3,
      colorSeed: 2,
      startStars: 12,
      journeyStart: 2,
    });
  });

  it('is nothing to resume without words', () => {
    expect(createSession({ words: [] })).toBeNull();
    expect(normaliseSession(null)).toBeNull();
    expect(normaliseSession('nope')).toBeNull();
  });

  it('clamps an out-of-range word or letter index back onto the round', () => {
    const session = createSession({
      words: ['cat', 'dog'],
      wordIndex: 9,
      letterIndex: 9,
    });
    expect(session.wordIndex).toBe(1);
    expect(session.letterIndex).toBe(3);
  });

  it('drops stars for words the child has not finished yet', () => {
    const session = createSession({
      words: ['cat', 'dog', 'fox'],
      wordIndex: 1,
      wordStars: [3, 2, 1],
    });
    // Only the first word is behind the child, so only its stars are kept.
    expect(session.wordStars).toEqual([3]);
  });

  it('falls back to sane defaults for a corrupt mode or kind', () => {
    const session = createSession({
      words: ['cat'],
      gameMode: 'wild',
      roundKind: 'mega',
      colorSeed: -4,
      startStars: -1,
    });
    expect(session).toMatchObject({ gameMode: 'easy', roundKind: 'normal', colorSeed: 0, startStars: 0 });
  });
});

describe('is a session worth resuming', () => {
  it('offers a round only once the child has made some progress', () => {
    expect(isResumable(createSession({ words: ['cat'], wordIndex: 0, letterIndex: 0 }))).toBe(false);
    expect(isResumable(createSession({ words: ['cat'], wordIndex: 0, letterIndex: 1 }))).toBe(true);
    expect(isResumable(createSession({ words: ['cat', 'dog'], wordIndex: 1, letterIndex: 0 }))).toBe(true);
    expect(isResumable(null)).toBe(false);
  });
});
