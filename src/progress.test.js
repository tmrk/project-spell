import { describe, expect, it } from 'vitest';
import {
  PROGRESS_KEY,
  SUPER_ROUND_EVERY,
  addBadges,
  addShinySticker,
  addSticker,
  addStars,
  createEmptyProgress,
  isSuperRoundNext,
  newBadges,
  normaliseProgress,
  pickShinyAward,
  pickStickerAward,
  recordRoundInCycle,
} from './progress';

describe('progress store', () => {
  it('creates an empty versioned store under its own key', () => {
    expect(PROGRESS_KEY).toBe('project-spell:progress:v1');
    expect(createEmptyProgress()).toEqual({
      version: 1,
      totalStars: 0,
      stickers: [],
      shinyStickers: [],
      badges: [],
      roundsTowardSuper: 0,
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
        shinyStickers: ['1f451', ' 1f451 ', null],
        badges: ['starter', null],
        roundsTowardSuper: 20,
        unknown: true,
      }),
    ).toEqual({
      version: 1,
      totalStars: 5,
      stickers: ['cat'],
      shinyStickers: ['1f451'],
      badges: ['starter'],
      roundsTowardSuper: 3,
    });
  });

  it('adds stars without mutating the original and ignores invalid deductions', () => {
    const original = {
      ...createEmptyProgress(),
      totalStars: 3,
      stickers: ['cat'],
    };
    const rewarded = addStars(original, 2);

    expect(rewarded).toEqual({ ...original, totalStars: 5 });
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

  it('loads blobs saved before super-round fields existed', () => {
    expect(normaliseProgress({
      version: 1,
      totalStars: 8,
      stickers: ['en-GB/cat'],
      badges: ['first-round'],
    })).toEqual({
      ...createEmptyProgress(),
      totalStars: 8,
      stickers: ['en-GB/cat'],
      badges: ['first-round'],
    });
  });

  it('increments the round cycle and resets it after the super round', () => {
    let progress = createEmptyProgress();
    expect(SUPER_ROUND_EVERY).toBe(4);
    expect(isSuperRoundNext(progress)).toBe(false);

    progress = recordRoundInCycle(progress, { wasSuper: false });
    progress = recordRoundInCycle(progress, { wasSuper: false });
    expect(progress.roundsTowardSuper).toBe(2);
    expect(isSuperRoundNext(progress)).toBe(false);

    progress = recordRoundInCycle(progress, { wasSuper: false });
    expect(progress.roundsTowardSuper).toBe(3);
    expect(isSuperRoundNext(progress)).toBe(true);
    expect(recordRoundInCycle(progress, { wasSuper: true }).roundsTowardSuper).toBe(0);
  });

  it('sequences shiny awards without repeats and stops when all are owned', () => {
    let progress = createEmptyProgress();
    expect(pickShinyAward(progress)).toBe('1f451');
    progress = addShinySticker(progress, '1f451');
    expect(pickShinyAward(progress)).toBe('1f3c6');
    expect(addShinySticker(progress, '1f451')).toEqual(progress);

    const exhausted = {
      ...progress,
      shinyStickers: ['1f451', '1f3c6', '1f308', '1f48e', '1f3c5', '1f947', '1f680', '1f9e7'],
    };
    expect(pickShinyAward(exhausted)).toBeNull();
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
