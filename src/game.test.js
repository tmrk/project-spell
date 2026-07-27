import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  WORD_BANK,
  WORD_BANKS,
  REVIEW_GAP,
  composeRound,
  createAdaptiveRound,
  createRound,
  createReviewRound,
  estimateSyllables,
  getEligibleWords,
  getRoundAvailability,
  letterColors,
  lettersMatch,
  normaliseSettings,
  parseCustomWords,
  PALETTES,
} from './game';
import { LOCALES, detectDefaultLocale } from './locales';
import { createEmptyStats, recordRoundCompleted, recordWordCompleted } from './stats';

describe('regional default', () => {
  it('uses US English for US-spelling browser regions', () => {
    ['en-US', 'en_US', 'es-US', 'en-AS', 'en-FM', 'en-GU', 'en-LR', 'en-MH', 'en-MP', 'en-PH', 'fil-PH', 'en-PR', 'en-PW', 'en-UM', 'en-VI']
      .forEach((locale) => expect(detectDefaultLocale(locale)).toBe('en-US'));
  });

  it('uses British English for every other or unknown region', () => {
    ['en-GB', 'en-AU', 'en-CA', 'en-IE', 'en', '', 'not-a-locale']
      .forEach((locale) => expect(detectDefaultLocale(locale)).toBe('en-GB'));
  });

  it('detects Swedish and Hungarian from language subtags before region fallbacks', () => {
    expect(detectDefaultLocale('sv-SE')).toBe('sv-SE');
    expect(detectDefaultLocale('sv-FI')).toBe('sv-SE');
    expect(detectDefaultLocale('hu-HU')).toBe('hu-HU');
    expect(detectDefaultLocale('hu-US')).toBe('hu-HU');
  });
});

describe('settings', () => {
  it('normalises unsafe and out-of-range values', () => {
    expect(
      normaliseSettings({
        minLetters: 99,
        maxLetters: 2,
        roundLength: 200,
        syllables: 'many',
        wordSource: 'unexpected',
      }),
    ).toMatchObject({
      locale: 'en-GB',
      minLetters: 12,
      maxLetters: 12,
      roundLength: 20,
      syllables: 'any',
      wordSource: 'all',
    });
  });

  it('keeps valid boolean preferences', () => {
    expect(normaliseSettings({
      ...DEFAULT_SETTINGS,
      music: false,
      speech: false,
      spellBack: false,
      eyes: false,
      acceptUnaccented: true,
    })).toMatchObject({
      music: false,
      speech: false,
      spellBack: false,
      eyes: false,
      acceptUnaccented: true,
    });
  });

  it('enables eyes when loading settings saved before the preference existed', () => {
    expect(normaliseSettings({ music: false })).toMatchObject({
      locale: 'en-GB',
      music: false,
      eyes: true,
      acceptUnaccented: false,
    });
  });

  // A blob written before roadmap F4 existed: the spell-back arrives switched on, because it is a
  // learning feature every child should get without a parent having to find the switch.
  it('spells finished words back for settings saved before the preference existed', () => {
    expect(DEFAULT_SETTINGS.spellBack).toBe(true);
    expect(normaliseSettings({ music: false, speech: true }).spellBack).toBe(true);
    expect(normaliseSettings({ spellBack: 'yes' }).spellBack).toBe(true);
    expect(normaliseSettings({ spellBack: false }).spellBack).toBe(false);
  });

  it('loads pre-F7 settings with the gentle length ladder on', () => {
    expect(DEFAULT_SETTINGS.autoLadder).toBe(true);
    expect(normaliseSettings({ music: false }).autoLadder).toBe(true);
    expect(normaliseSettings({ autoLadder: false }).autoLadder).toBe(false);
    expect(normaliseSettings({ autoLadder: 'no' }).autoLadder).toBe(true);
  });

  it('defaults the game mode to easy and accepts only normal as the alternative', () => {
    expect(normaliseSettings({}).gameMode).toBe('easy');
    expect(normaliseSettings({ gameMode: 'normal' }).gameMode).toBe('normal');
    expect(normaliseSettings({ gameMode: 'hard' }).gameMode).toBe('easy');
    expect(normaliseSettings({ gameMode: 1 }).gameMode).toBe('easy');
  });

  it('keeps supported locales and falls back to British English', () => {
    expect(normaliseSettings({ locale: 'en-US' })).toMatchObject({ locale: 'en-US' });
    expect(normaliseSettings({ locale: 'sv-SE' })).toMatchObject({ locale: 'sv-SE' });
    expect(normaliseSettings({ locale: 'hu-HU' })).toMatchObject({ locale: 'hu-HU' });
    expect(normaliseSettings({ locale: 'fr-FR' })).toMatchObject({ locale: 'en-GB' });
  });
});

describe('word lists', () => {
  it('contains a broad, valid, de-duplicated syllable base', () => {
    const uniqueWords = new Set(WORD_BANK.map(({ word }) => word));
    const counts = WORD_BANK.reduce((result, { syllables }) => {
      result[syllables] = (result[syllables] ?? 0) + 1;
      return result;
    }, {});

    expect(WORD_BANK.length).toBeGreaterThan(350);
    expect(uniqueWords.size).toBe(WORD_BANK.length);
    expect(WORD_BANK.every(({ word }) => /^[a-z]{2,14}$/u.test(word))).toBe(true);
    expect(counts[1]).toBeGreaterThan(100);
    expect(counts[2]).toBeGreaterThan(100);
    expect((counts[3] ?? 0) + (counts[4] ?? 0) + (counts[5] ?? 0)).toBeGreaterThan(80);
  });

  it('keeps independent British and US word lists with regional spellings', () => {
    const britishWords = new Set(WORD_BANKS['en-GB'].map(({ word }) => word));
    const usWords = new Set(WORD_BANKS['en-US'].map(({ word }) => word));

    expect(britishWords.has('colour')).toBe(true);
    expect(britishWords.has('favourite')).toBe(true);
    expect(britishWords.has('color')).toBe(false);
    expect(britishWords.has('favorite')).toBe(false);
    expect(usWords.has('color')).toBe(true);
    expect(usWords.has('favorite')).toBe(true);
    expect(usWords.has('colour')).toBe(false);
    expect(usWords.has('favourite')).toBe(false);
    expect(usWords.size).toBe(WORD_BANKS['en-US'].length);
  });

  it('provides broad, valid Swedish and Hungarian banks with accented words', () => {
    const expectations = {
      'sv-SE': ['bröd', 'fågel', 'äventyr'],
      'hu-HU': ['ágy', 'szőlő', 'tűz'],
    };

    Object.entries(expectations).forEach(([locale, examples]) => {
      const bank = WORD_BANKS[locale];
      const words = bank.map(({ word }) => word);

      expect(bank.length).toBeGreaterThan(280);
      expect(new Set(words).size).toBe(bank.length);
      expect(bank.every(({ word }) => /^\p{L}{2,14}$/u.test(word))).toBe(true);
      expect(bank.every(({ syllables }) => Number.isInteger(syllables) && syllables >= 1)).toBe(true);
      examples.forEach((word) => expect(words).toContain(word));
    });
  });

  it('keeps every locale message catalogue complete', () => {
    const referenceKeys = Object.keys(LOCALES['en-GB'].messages).sort();
    Object.values(LOCALES).forEach((locale) => {
      expect(Object.keys(locale.messages).sort()).toEqual(referenceKeys);
      expect(locale.messages.correctMessages.length).toBeGreaterThan(1);
      expect(locale.messages.roundFinishedSpeeches.length).toBeGreaterThan(1);
    });
  });

  it('selects built-in words from the chosen regional list', () => {
    const britishWords = getEligibleWords({
      ...DEFAULT_SETTINGS,
      locale: 'en-GB',
      minLetters: 6,
      maxLetters: 6,
      syllables: '2',
    }).map(({ word }) => word);
    const usWords = getEligibleWords({
      ...DEFAULT_SETTINGS,
      locale: 'en-US',
      minLetters: 5,
      maxLetters: 5,
      syllables: '2',
    }).map(({ word }) => word);

    expect(britishWords).toContain('colour');
    expect(usWords).toContain('color');
  });

  it('cleans, de-duplicates, and estimates custom words', () => {
    expect(parseCustomWords('Banana, cat\nbanana\nnot a word\n42')).toEqual([
      { word: 'banana', syllables: 3 },
      { word: 'cat', syllables: 1 },
    ]);
  });

  it('normalises accented custom words and uses locale-aware syllable estimates', () => {
    expect(parseCustomWords(' TÅRTA, tårta\nfrö ', 'sv-SE')).toEqual([
      { word: 'tårta', syllables: 2 },
      { word: 'frö', syllables: 1 },
    ]);
    expect(parseCustomWords('SZŐLŐ, szőlő\nalma', 'hu-HU')).toEqual([
      { word: 'szőlő', syllables: 2 },
      { word: 'alma', syllables: 2 },
    ]);
  });

  it('uses the configured custom list on its own', () => {
    const words = getEligibleWords({
      ...DEFAULT_SETTINGS,
      customWords: 'cat\nelephant\nsun',
      wordSource: 'custom',
      minLetters: 3,
      maxLetters: 3,
      syllables: '1',
    });

    expect(words.map(({ word }) => word)).toEqual(['cat', 'sun']);
  });

  it('filters exact three-syllable and longer four-plus-syllable groups', () => {
    const threeSyllables = getEligibleWords({
      ...DEFAULT_SETTINGS,
      minLetters: 2,
      maxLetters: 14,
      syllables: '3',
    });
    const fourPlusSyllables = getEligibleWords({
      ...DEFAULT_SETTINGS,
      minLetters: 2,
      maxLetters: 14,
      syllables: '4+',
    });

    expect(threeSyllables.length).toBeGreaterThan(50);
    expect(threeSyllables.every(({ syllables }) => syllables === 3)).toBe(true);
    expect(fourPlusSyllables.length).toBeGreaterThan(20);
    expect(fourPlusSyllables.every(({ syllables }) => syllables >= 4)).toBe(true);
  });

  it('recognises useful syllable approximations', () => {
    expect(estimateSyllables('cake')).toBe(1);
    expect(estimateSyllables('rabbit')).toBe(2);
    expect(estimateSyllables('banana')).toBe(3);
    expect(estimateSyllables('tårta', 'sv-SE')).toBe(2);
    expect(estimateSyllables('szőlő', 'hu-HU')).toBe(2);
  });
});

describe('accent matching', () => {
  it('requires exact accents by default', () => {
    expect(lettersMatch('å', 'a')).toBe(false);
    expect(lettersMatch('ő', 'o')).toBe(false);
    expect(lettersMatch('á', 'á')).toBe(true);
  });

  it('directionally accepts plain input for accented expected letters when enabled', () => {
    expect(lettersMatch('å', 'a', true)).toBe(true);
    expect(lettersMatch('ő', 'o', true)).toBe(true);
    expect(lettersMatch('ű', 'u', true)).toBe(true);
    expect(lettersMatch('a', 'á', true)).toBe(false);
    expect(lettersMatch('å', 'ä', true)).toBe(false);
  });
});

describe('round creation', () => {
  const masteryStats = (roundsCompleted, records = {}) => ({
    totals: { roundsCompleted },
    words: Object.fromEntries(
      Object.entries(records).map(([word, record]) => [
        `en-GB/${word}`,
        {
          seen: 1,
          completed: 1,
          mistakes: 0,
          perfect: true,
          cleanStreak: 1,
          lastRound: 0,
          ...record,
        },
      ]),
    ),
  });
  const seeded = (seed) => {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  };

  it('fills the requested round length without adjacent repeats', () => {
    const round = createRound(
      {
        ...DEFAULT_SETTINGS,
        wordSource: 'custom',
        customWords: 'cat\ndog',
        roundLength: 5,
      },
      () => 0,
    );

    expect(round).toHaveLength(5);
    expect(round.every((word, index) => index === 0 || word !== round[index - 1])).toBe(true);
  });

  it('returns an empty round when nothing matches', () => {
    expect(
      createRound({ ...DEFAULT_SETTINGS, wordSource: 'custom', customWords: '' }),
    ).toEqual([]);
  });

  it('honours explicit exclusions in the lower-level ordinary, adaptive, and review helpers', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      wordSource: 'custom',
      customWords: 'cat\ndog\nfox',
      roundLength: 5,
    };
    const completed = new Set(['CAT', 'dog']);
    const summary = {
      trickyLetters: ['c'],
      strugglingWords: new Set(['cat', 'dog']),
      masteredWords: new Set(),
    };

    expect(new Set(createRound(settings, () => 0, completed))).toEqual(new Set(['fox']));
    expect(new Set(createAdaptiveRound(settings, summary, () => 0, completed)))
      .toEqual(new Set(['fox']));
    expect(new Set(createReviewRound(
      settings,
      new Set(['cat', 'dog']),
      () => 0,
      summary,
      completed,
    ))).toEqual(new Set(['fox']));
  });

  it('composes a capped, non-adjacent review slice after the three-round gap', () => {
    expect(REVIEW_GAP).toBe(3);
    const settings = {
      ...DEFAULT_SETTINGS,
      autoLadder: false,
      wordSource: 'custom',
      customWords: 'cat\ndog\nfox\nhen\npig\nsun\nant\nbat',
      roundLength: 5,
    };
    const stats = masteryStats(3, {
      cat: { cleanStreak: 0, lastRound: 0 },
      dog: { cleanStreak: 2, lastRound: 0 },
      fox: { cleanStreak: 1, lastRound: 2 },
    });
    const due = new Set(['cat', 'dog']);
    const round = composeRound(settings, stats, seeded(7));
    const duePositions = round
      .map((word, index) => (due.has(word) ? index : -1))
      .filter((index) => index >= 0);

    expect(round).toHaveLength(5);
    expect(duePositions).toHaveLength(2);
    expect(duePositions.every((position) => position > 0)).toBe(true);
    expect(Math.abs(duePositions[0] - duePositions[1])).toBeGreaterThan(1);
    expect(round).not.toContain('fox');
  });

  it('gives a fresh child three entirely unseen rounds before deliberate review begins', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      autoLadder: false,
      wordSource: 'custom',
      customWords: 'ant\nbat\nbee\ncat\ncow\ncup\ndog\negg\nfly\nfox\nhen\njam\njar\nkey\nowl\npig\nsun\nyak',
      roundLength: 5,
    };
    const random = seeded(20260727);
    let stats = createEmptyStats();
    const encountered = new Set();
    const firstRound = new Set();

    for (let roundIndex = 0; roundIndex < 3; roundIndex += 1) {
      const round = composeRound(settings, stats, random);
      expect(round).toHaveLength(5);
      expect(
        round.every((word) => !encountered.has(word)),
        `round ${roundIndex + 1}: ${round.join(', ')}; already: ${[...encountered].join(', ')}`,
      ).toBe(true);
      if (roundIndex === 0) round.forEach((word) => firstRound.add(word));
      round.forEach((word) => {
        encountered.add(word);
        stats = recordWordCompleted(stats, {
          word,
          locale: 'en-GB',
          mistakes: 0,
          durationMs: 1000,
          mode: 'easy',
        });
      });
      stats = recordRoundCompleted(stats, {
        length: round.length,
        mistakes: 0,
        durationMs: 5000,
        mode: 'easy',
      });
    }

    const fourthRound = composeRound(settings, stats, random);
    expect(fourthRound.filter((word) => firstRound.has(word))).toHaveLength(2);
  });

  it('prioritises unseen words, retires mastered words, and stays deterministic', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      autoLadder: false,
      wordSource: 'custom',
      customWords: 'cat\ndog\nfox\nhen\npig\nsun',
      roundLength: 4,
    };
    const stats = masteryStats(1, {
      cat: { cleanStreak: 0, lastRound: 0 },
      dog: { cleanStreak: 3, lastRound: 0 },
    });
    const first = composeRound(settings, stats, seeded(19));
    const second = composeRound(settings, stats, seeded(19));

    expect(first).toEqual(second);
    expect(first).toHaveLength(4);
    expect(first).not.toContain('cat');
    expect(first).not.toContain('dog');
    expect(new Set(first)).toEqual(new Set(['fox', 'hen', 'pig', 'sun']));
    expect(first.every((word, index) => index === 0 || word !== first[index - 1])).toBe(true);
  });

  it('applies the length ladder inside parent filters and raises an exhausted rung', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      wordSource: 'custom',
      customWords: 'cat\nlion\napple\nplanet',
      minLetters: 3,
      maxLetters: 8,
      roundLength: 3,
    };
    const fresh = getRoundAvailability(settings, masteryStats(0), { masteredCount: 0 });
    expect(fresh.cap).toBe(4);
    expect(new Set(fresh.availableWords)).toEqual(new Set(['cat', 'lion']));

    const parentMinimum = getRoundAvailability(
      { ...settings, minLetters: 6 },
      masteryStats(0),
      { masteredCount: 0 },
    );
    expect(parentMinimum.cap).toBe(6);
    expect(parentMinimum.availableWords).toEqual(['planet']);

    const exhausted = getRoundAvailability(
      settings,
      masteryStats(8, {
        cat: { cleanStreak: 3 },
        lion: { cleanStreak: 3 },
      }),
      { masteredCount: 0 },
    );
    expect(exhausted.cap).toBe(5);
    expect(exhausted.availableWords).toEqual(['apple']);

    const ladderOff = getRoundAvailability(
      { ...settings, autoLadder: false },
      masteryStats(0),
      { masteredCount: 0 },
    );
    expect(ladderOff.effectiveSettings.maxLetters).toBe(settings.maxLetters);
    expect(ladderOff.availableWords).toEqual(['cat', 'lion', 'apple', 'planet']);
  });

  it('reports true exhaustion only when every parent-matching word is mastered', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      wordSource: 'custom',
      customWords: 'cat\ndog',
      roundLength: 3,
    };
    const stats = masteryStats(9, {
      cat: { cleanStreak: 3 },
      dog: { cleanStreak: 3 },
    });
    const availability = getRoundAvailability(settings, stats, { masteredCount: 2 });

    expect(availability.availableWords).toEqual([]);
    expect(availability.allMatchingWordsMastered).toBe(true);
    expect(composeRound(settings, stats, seeded(1), { progress: { masteredCount: 2 } }))
      .toEqual([]);
  });

  it('puts eligible struggle words first and tops up without adjacent repeats', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      wordSource: 'custom',
      customWords: 'cat\ndog\nfox',
      roundLength: 5,
    };
    const round = createReviewRound(settings, new Set(['dog', 'cat', 'elephant']), () => 0);

    expect(new Set(round.slice(0, 2))).toEqual(new Set(['cat', 'dog']));
    expect(round).toHaveLength(5);
    expect(round.every((word, index) => index === 0 || word !== round[index - 1])).toBe(true);
  });

  it('creates deterministic review rounds and works without struggle words', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      wordSource: 'custom',
      customWords: 'cat\ndog\nfox',
      roundLength: 5,
    };
    const sequence = [0.8, 0.2, 0.5, 0.1, 0.9, 0.4, 0.7, 0.3];
    const seeded = () => {
      let index = 0;
      return () => sequence[index++ % sequence.length];
    };

    expect(createReviewRound(settings, [], seeded())).toEqual(
      createReviewRound(settings, [], seeded()),
    );
    expect(createReviewRound(settings, [], () => 0)).toHaveLength(5);
  });

  it('puts this session’s struggles before remembered ones', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      wordSource: 'custom',
      customWords: 'cat\ndog\nfox\nhen',
      roundLength: 4,
    };
    const round = createReviewRound(settings, new Set(['fox']), () => 0, {
      trickyLetters: [],
      strugglingWords: new Set(['cat', 'dog']),
      masteredWords: new Set(),
    });

    expect(round[0]).toBe('fox');
    expect(new Set(round.slice(1, 3))).toEqual(new Set(['cat', 'dog']));
    expect(round).toHaveLength(4);
  });
});

describe('adaptive rounds', () => {
  const bank = {
    ...DEFAULT_SETTINGS,
    wordSource: 'custom',
    customWords: 'zap\ncat\ndog\nfox\nhen\npig',
    roundLength: 3,
  };
  const seededRandom = (seed) => {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  };
  const countWords = (settings, summary, rounds = 600) => {
    const random = seededRandom(20260719);
    const counts = new Map();
    for (let index = 0; index < rounds; index += 1) {
      createAdaptiveRound(settings, summary, random).forEach((word) => {
        counts.set(word, (counts.get(word) ?? 0) + 1);
      });
    }
    return counts;
  };

  it('returns an empty round when nothing is eligible', () => {
    expect(
      createAdaptiveRound({ ...bank, customWords: '' }, null, () => 0),
    ).toEqual([]);
  });

  it('is deterministic for a given random source and avoids adjacent repeats', () => {
    const summary = {
      trickyLetters: ['z'],
      strugglingWords: new Set(['cat']),
      masteredWords: new Set(['dog']),
    };
    const first = createAdaptiveRound(bank, summary, seededRandom(7));
    const second = createAdaptiveRound(bank, summary, seededRandom(7));

    expect(first).toEqual(second);
    expect(first).toHaveLength(3);

    const long = createAdaptiveRound({ ...bank, roundLength: 12 }, summary, seededRandom(11));
    expect(long).toHaveLength(12);
    expect(long.every((word, index) => index === 0 || word !== long[index - 1])).toBe(true);
  });

  it('draws tricky-letter and struggling words more often than mastered ones', () => {
    const counts = countWords(bank, {
      trickyLetters: ['z'],
      strugglingWords: new Set(['cat']),
      masteredWords: new Set(['dog']),
    });

    expect(counts.get('zap')).toBeGreaterThan(counts.get('fox'));
    expect(counts.get('cat')).toBeGreaterThan(counts.get('fox'));
    expect(counts.get('dog')).toBeLessThan(counts.get('fox'));
    expect(counts.get('zap')).toBeGreaterThan(counts.get('cat'));
  });

  it('treats every word alike when the summary is empty', () => {
    const counts = countWords(bank, null);
    const totals = [...counts.values()];

    expect(counts.size).toBe(6);
    expect(Math.max(...totals) - Math.min(...totals)).toBeLessThan(Math.min(...totals) * 0.25);
  });
});

describe('letter colours', () => {
  const noAdjacentRepeat = (colours) =>
    colours.every((colour, index) => index === 0 || colour !== colours[index - 1]);

  it('keeps every colour inside the five-colour wheel', () => {
    letterColors('elephant').forEach((colour) => {
      expect(colour).toBeGreaterThanOrEqual(0);
      expect(colour).toBeLessThan(5);
    });
  });

  it('never repeats a colour on adjacent letters, even in a long word', () => {
    expect(noAdjacentRepeat(letterColors('hippopotamus'))).toBe(true);
    expect(noAdjacentRepeat(letterColors('cat'))).toBe(true);
    expect(noAdjacentRepeat(letterColors('aaaaaa'))).toBe(true);
  });

  it('is stable for a given word and seed', () => {
    expect(letterColors('rocket')).toEqual(letterColors('rocket'));
    expect(letterColors('rocket', 3)).toEqual(letterColors('rocket', 3));
  });

  it('does not open every word on the same colour', () => {
    const firstColours = new Set(
      ['cat', 'dog', 'apple', 'tiger', 'rocket', 'banana', 'moon', 'star'].map(
        (word) => letterColors(word)[0],
      ),
    );
    expect(firstColours.size).toBeGreaterThan(1);
  });

  it('rotates the whole arrangement by the seed', () => {
    const base = letterColors('garden');
    const shifted = letterColors('garden', 1);
    base.forEach((colour, index) => {
      expect(shifted[index]).toBe((colour + 1) % 5);
    });
  });

  it('returns nothing for an empty word', () => {
    expect(letterColors('')).toEqual([]);
  });
});

describe('background palette', () => {
  it('defaults to sunshine and accepts only known palettes', () => {
    expect(DEFAULT_SETTINGS.palette).toBe('sunshine');
    expect(PALETTES).toContain('sunshine');

    PALETTES.forEach((palette) => {
      expect(normaliseSettings({ palette }).palette).toBe(palette);
    });
    expect(normaliseSettings({ palette: 'neon' }).palette).toBe('sunshine');
    expect(normaliseSettings({ palette: 42 }).palette).toBe('sunshine');
    expect(normaliseSettings({}).palette).toBe('sunshine');
  });
});
