import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  WORD_BANK,
  WORD_BANKS,
  createRound,
  estimateSyllables,
  getEligibleWords,
  lettersMatch,
  normaliseSettings,
  parseCustomWords,
} from './game';
import { LOCALES, detectDefaultLocale } from './locales';

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
      eyes: false,
      acceptUnaccented: true,
    })).toMatchObject({
      music: false,
      speech: false,
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
});
