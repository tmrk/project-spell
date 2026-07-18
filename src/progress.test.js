import { describe, expect, it } from 'vitest';
import {
  PROGRESS_KEY,
  addStars,
  createEmptyProgress,
  normaliseProgress,
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
});
