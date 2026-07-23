import { describe, expect, it } from 'vitest';
import {
  averageLetterMs,
  completedWordsForLocale,
  createEmptyStats,
  normaliseStats,
  recordAttempt,
  recordRoundCompleted,
  recordWordCompleted,
  starsForRound,
  starsForWord,
  summariseForSelection,
  trickiestLetters,
  buildLetterHeatMap,
  topConfusions,
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

  it('awards one to three stars for a word without ever returning zero', () => {
    expect(starsForWord(0)).toBe(3);
    expect(starsForWord(1)).toBe(2);
    expect(starsForWord(2)).toBe(2);
    expect(starsForWord(3)).toBe(1);
    expect(starsForWord(Number.NaN)).toBe(1);
  });

  it('classifies struggling and mastered words for the current locale only', () => {
    const word = (overrides = {}) => ({
      word: 'cat',
      locale: 'en-GB',
      mistakes: 0,
      durationMs: 1000,
      mode: 'easy',
      ...overrides,
    });

    let stats = createEmptyStats();
    stats = recordWordCompleted(stats, word({ word: 'cat', mistakes: 2 }));
    stats = recordWordCompleted(stats, word({ word: 'dog' }));
    stats = recordWordCompleted(stats, word({ word: 'dog' }));
    stats = recordWordCompleted(stats, word({ word: 'fox' }));
    stats = recordWordCompleted(stats, word({ word: 'katt', locale: 'sv-SE', mistakes: 3 }));
    // A word that was hard once but is clean now counts as neither.
    stats = recordWordCompleted(stats, word({ word: 'hen', mistakes: 1 }));
    stats = recordWordCompleted(stats, word({ word: 'hen' }));

    const summary = summariseForSelection(stats, 'en-GB');

    expect([...summary.strugglingWords]).toEqual(['cat']);
    expect([...summary.masteredWords].sort()).toEqual(['dog', 'hen']);
    expect(summary.trickyLetters).toEqual([]);

    const swedish = summariseForSelection(stats, 'sv-SE');
    expect([...swedish.strugglingWords]).toEqual(['katt']);
    expect([...swedish.masteredWords]).toEqual([]);
  });

  it('lists completed words for one locale so each child can keep a fresh word pool', () => {
    let stats = createEmptyStats();
    stats = recordWordCompleted(stats, {
      word: 'cat',
      locale: 'en-GB',
      mistakes: 0,
      durationMs: 1000,
      mode: 'easy',
    });
    stats = recordWordCompleted(stats, {
      word: 'katt',
      locale: 'sv-SE',
      mistakes: 1,
      durationMs: 1200,
      mode: 'easy',
    });

    expect([...completedWordsForLocale(stats, 'en-GB')]).toEqual(['cat']);
    expect([...completedWordsForLocale(stats, 'sv-SE')]).toEqual(['katt']);
    expect(completedWordsForLocale(null, 'en-GB').size).toBe(0);
  });

  it('summarises tricky letters and survives an empty or malformed store', () => {
    let stats = createEmptyStats();
    for (let index = 0; index < 6; index += 1) {
      stats = recordAttempt(stats, attempt({ expected: 'q', typed: 'p', correct: false }));
    }

    expect(summariseForSelection(stats, 'en-GB').trickyLetters).toEqual(['q']);

    const empty = summariseForSelection(createEmptyStats(), 'en-GB');
    expect(empty.strugglingWords.size).toBe(0);
    expect(empty.masteredWords.size).toBe(0);
    expect(empty.trickyLetters).toEqual([]);
    expect(summariseForSelection(null, 'en-GB').trickyLetters).toEqual([]);
  });

  it('summarises a round from its perfect-word share', () => {
    expect(starsForRound([3, 3, 3])).toBe(3);
    expect(starsForRound([3, 3, 2])).toBe(2);
    expect(starsForRound([3, 2])).toBe(2);
    expect(starsForRound([3, 2, 2])).toBe(1);
    expect(starsForRound([2, 2, 1])).toBe(1);
    expect(starsForRound([])).toBe(1);
  });
});

describe('letter heat map', () => {
  const stats = {
    letters: {
      a: { attempts: 10, misses: 0, totalMs: 4000 },
      b: { attempts: 10, misses: 5, totalMs: 20000 },
      c: { attempts: 8, misses: 2, totalMs: 8000 },
      d: { attempts: 2, misses: 2, totalMs: 4000 },
    },
    confusions: { 'b→d': 4, 'c→k': 1, 'b→p': 2, 'x→': 3 },
  };

  it('ranks the hardest letters first and reports accuracy and pace', () => {
    const heatMap = buildLetterHeatMap(stats);

    expect(heatMap.map((entry) => entry.letter)).toEqual(['b', 'c', 'a']);
    expect(heatMap[0]).toMatchObject({ accuracy: 0.5, attempts: 10, misses: 5, averageMs: 2000 });
    expect(heatMap.at(-1).accuracy).toBe(1);
  });

  it('leaves out letters with too little evidence to judge', () => {
    // 'd' is 0 for 2 — alarming-looking and meaningless.
    expect(buildLetterHeatMap(stats).some((entry) => entry.letter === 'd')).toBe(false);
    expect(buildLetterHeatMap(stats, { minAttempts: 2 }).some((entry) => entry.letter === 'd')).toBe(true);
  });

  it('survives an empty or malformed store', () => {
    expect(buildLetterHeatMap(createEmptyStats())).toEqual([]);
    expect(buildLetterHeatMap(null)).toEqual([]);
    expect(buildLetterHeatMap({ letters: 'nope' })).toEqual([]);
  });

  it('lists the most frequent letter mix-ups and skips malformed pairs', () => {
    const confusions = topConfusions(stats);

    expect(confusions).toEqual([
      { expected: 'b', typed: 'd', times: 4 },
      { expected: 'b', typed: 'p', times: 2 },
      { expected: 'c', typed: 'k', times: 1 },
    ]);
    expect(topConfusions(stats, { count: 1 })).toHaveLength(1);
    expect(topConfusions(createEmptyStats())).toEqual([]);
  });
});
