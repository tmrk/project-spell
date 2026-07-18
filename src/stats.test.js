import { describe, expect, it } from 'vitest';
import {
  averageLetterMs,
  createEmptyStats,
  normaliseStats,
  recordAttempt,
  recordRoundCompleted,
  recordWordCompleted,
  trickiestLetters,
} from './stats';

const attempt = (overrides = {}) => ({
  expected: 'a',
  typed: 'a',
  correct: true,
  latencyMs: 500,
  mode: 'easy',
  ...overrides,
});

describe('stats shape', () => {
  it('creates an empty, versioned store', () => {
    expect(createEmptyStats()).toEqual({
      version: 1,
      totals: {
        attempts: 0,
        misses: 0,
        wordsCompleted: 0,
        perfectWords: 0,
        roundsCompleted: 0,
        playMs: 0,
      },
      letters: {},
      confusions: {},
      words: {},
      recentEvents: [],
    });
  });
});

describe('recording', () => {
  it('aggregates attempts per letter without mutating the input', () => {
    const empty = createEmptyStats();
    let stats = recordAttempt(empty, attempt());
    stats = recordAttempt(stats, attempt({ typed: 's', correct: false, latencyMs: 900 }));

    expect(empty.totals.attempts).toBe(0);
    expect(stats.totals).toMatchObject({ attempts: 2, misses: 1 });
    expect(stats.letters.a).toEqual({ attempts: 2, misses: 1, totalMs: 1400 });
    expect(stats.confusions['a→s']).toBe(1);
    expect(stats.recentEvents).toHaveLength(2);
    expect(stats.recentEvents.at(-1)).toEqual(['a', expect.any(Number), 'a', 's', 0, 900, 'easy']);
  });

  it('only counts confusions for misses', () => {
    const stats = recordAttempt(createEmptyStats(), attempt());
    expect(stats.confusions).toEqual({});
  });

  it('aggregates word completions per locale-scoped word id', () => {
    let stats = recordWordCompleted(createEmptyStats(), {
      word: 'alma',
      locale: 'hu-HU',
      mistakes: 2,
      durationMs: 4000,
      mode: 'normal',
    });
    stats = recordWordCompleted(stats, {
      word: 'alma',
      locale: 'hu-HU',
      mistakes: 0,
      durationMs: 3000,
      mode: 'normal',
    });

    expect(stats.totals).toMatchObject({ wordsCompleted: 2, perfectWords: 1 });
    expect(stats.words['hu-HU/alma']).toEqual({ seen: 2, completed: 2, mistakes: 2, perfect: true });
  });

  it('accumulates play time from completed rounds', () => {
    let stats = recordRoundCompleted(createEmptyStats(), {
      length: 5,
      mistakes: 1,
      durationMs: 60000,
      mode: 'easy',
    });
    stats = recordRoundCompleted(stats, { length: 5, mistakes: 0, durationMs: 30000, mode: 'easy' });

    expect(stats.totals).toMatchObject({ roundsCompleted: 2, playMs: 90000 });
    expect(stats.recentEvents.at(-1)[0]).toBe('r');
  });

  it('caps the event ring buffer at 400 entries', () => {
    let stats = createEmptyStats();
    for (let index = 0; index < 405; index += 1) {
      stats = recordAttempt(stats, attempt({ latencyMs: index }));
    }

    expect(stats.recentEvents).toHaveLength(400);
    expect(stats.recentEvents[0][5]).toBe(5);
    expect(stats.totals.attempts).toBe(405);
  });

  it('drops the oldest half of events when the store grows too large', () => {
    let stats = createEmptyStats();
    for (let index = 0; index < 400; index += 1) {
      stats = recordAttempt(stats, attempt());
    }
    stats.words = Object.fromEntries(
      Array.from({ length: 500 }, (_, index) => [
        `en-GB/very-long-padding-word-${index}-${'x'.repeat(200)}`,
        { seen: 1, completed: 1, mistakes: 0, perfect: true },
      ]),
    );

    const next = recordAttempt(stats, attempt());
    expect(next.recentEvents.length).toBeLessThanOrEqual(200);
    expect(next.recentEvents.at(-1)[0]).toBe('a');
  });
});

describe('normaliseStats', () => {
  it.each([null, undefined, 42, 'junk', [], { totals: 'junk' }])(
    'returns an empty store for %j',
    (value) => {
      expect(normaliseStats(value)).toEqual(createEmptyStats());
    },
  );

  it('coerces numbers and drops unknown fields', () => {
    const normalised = normaliseStats({
      version: 1,
      totals: { attempts: '12', misses: -3, playMs: 1000.6, surprise: 9 },
      letters: { a: { attempts: 2, misses: 1, totalMs: 100, extra: true }, broken: null },
      confusions: { 'a→s': 2, 'b→c': 'junk' },
      words: { 'en-GB/cat': { seen: 1, completed: 1, mistakes: 0, perfect: 'yes' } },
      recentEvents: [['a', 1, 'a', 'a', 1, 100, 'easy'], 'junk'],
      unknown: {},
    });

    expect(normalised.totals).toEqual({
      attempts: 0,
      misses: 0,
      wordsCompleted: 0,
      perfectWords: 0,
      roundsCompleted: 0,
      playMs: 1001,
    });
    expect(normalised.letters).toEqual({ a: { attempts: 2, misses: 1, totalMs: 100 } });
    expect(normalised.confusions).toEqual({ 'a→s': 2 });
    expect(normalised.words['en-GB/cat'].perfect).toBe(false);
    expect(normalised.recentEvents).toEqual([['a', 1, 'a', 'a', 1, 100, 'easy']]);
    expect(normalised.unknown).toBeUndefined();
  });
});

describe('summaries', () => {
  const build = () => {
    let stats = createEmptyStats();
    const type = (expected, missCount, hitCount) => {
      for (let index = 0; index < missCount; index += 1) {
        stats = recordAttempt(stats, attempt({ expected, typed: 'x', correct: false }));
      }
      for (let index = 0; index < hitCount; index += 1) {
        stats = recordAttempt(stats, attempt({ expected }));
      }
    };
    type('s', 4, 2); // 66% miss rate
    type('r', 2, 4); // 33% miss rate
    type('k', 1, 5); // 16% miss rate
    type('a', 1, 6); // lower miss rate, 4th place
    type('e', 0, 20); // never missed
    type('q', 3, 0); // only 3 attempts — under the threshold
    return stats;
  };

  it('ranks tricky letters by miss rate above a minimum attempt count', () => {
    expect(trickiestLetters(build())).toEqual(['s', 'r', 'k']);
    expect(trickiestLetters(build(), { minAttempts: 5, count: 2 })).toEqual(['s', 'r']);
    expect(trickiestLetters(build(), { minAttempts: 8 })).toEqual([]);
    expect(trickiestLetters(createEmptyStats())).toEqual([]);
  });

  it('averages letter latency across all attempts', () => {
    expect(averageLetterMs(createEmptyStats())).toBeNull();

    let stats = recordAttempt(createEmptyStats(), attempt({ latencyMs: 100 }));
    stats = recordAttempt(stats, attempt({ latencyMs: 300 }));
    expect(averageLetterMs(stats)).toBe(200);
  });
});
