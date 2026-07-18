import { describe, expect, it } from 'vitest';
import {
  PROGRESS_KEY,
  addBadges,
  addSticker,
  addStars,
  createEmptyProgress,
  newBadges,
  normaliseProgress,
  pickStickerAward,
} from './progress';

describe('progress store', () => {
  it('creates an empty versioned store under its own key', () => {
    expect(PROGRESS_KEY).toBe('project-spell:progress:v1');
    expect(createEmptyProgress()).toEqual({
      version: 1,
      totalStars: 0,
      stickers: [],
      badges: [],
    });
  });

  it.each([null, undefined, 42, 'junk', []])('normalises corrupt input %j', (value) => {
    expect(normaliseProgress(value)).toEqual(createEmptyProgress());
  });

  it('normalises counts and unique string reward ids while dropping unknown fields', () => {
    expect(
      normaliseProgress({
        version: 99,
        totalStars: 4.6,
        stickers: ['cat', ' cat ', '', 7, 'cat'],
        badges: ['starter', null],
        unknown: true,
      }),
    ).toEqual({
      version: 1,
      totalStars: 5,
      stickers: ['cat'],
      badges: ['starter'],
    });
  });

  it('adds stars without mutating the original and ignores invalid deductions', () => {
    const original = { version: 1, totalStars: 3, stickers: ['cat'], badges: [] };
    const rewarded = addStars(original, 2);

    expect(rewarded).toEqual({ version: 1, totalStars: 5, stickers: ['cat'], badges: [] });
    expect(original.totalStars).toBe(3);
    expect(addStars(rewarded, -10).totalStars).toBe(5);
  });

  it('picks the first illustrated sticker that is not already owned', () => {
    const progress = { ...createEmptyProgress(), stickers: ['en-GB/cat'] };

    expect(pickStickerAward(progress, ['cat', 'happy', 'dog'], 'en-GB')).toBe('en-GB/dog');
    expect(pickStickerAward(progress, ['cat', 'happy'], 'en-GB')).toBeNull();
    expect(pickStickerAward(progress, ['cica'], 'hu-HU')).toBe('hu-HU/cica');
  });

  it('adds stickers idempotently without mutating progress', () => {
    const original = createEmptyProgress();
    const collected = addSticker(original, 'en-GB/cat');

    expect(collected.stickers).toEqual(['en-GB/cat']);
    expect(addSticker(collected, 'en-GB/cat')).toEqual(collected);
    expect(original.stickers).toEqual([]);
  });

  it('finds only newly reached badges at round thresholds', () => {
    const stats = {
      totals: { roundsCompleted: 1, wordsCompleted: 50 },
    };
    const progress = { ...createEmptyProgress(), badges: ['words-10'] };

    expect(newBadges(progress, stats, { stars: 3, mode: 'normal' })).toEqual([
      'first-round',
      'words-50',
      'perfect-round',
      'normal-round',
    ]);
    expect(newBadges(addBadges(progress, ['first-round']), stats, { stars: 2, mode: 'easy' }))
      .toEqual(['words-50']);
  });
});
