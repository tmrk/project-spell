import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  WORD_BANK,
  WORD_BANKS,
  createRound,
  estimateSyllables,
  getEligibleWords,
  normaliseSettings,
  parseCustomWords,
} from './game';

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
    expect(normaliseSettings({ ...DEFAULT_SETTINGS, music: false, speech: false, eyes: false })).toMatchObject({
      music: false,
      speech: false,
      eyes: false,
    });
  });

  it('enables eyes when loading settings saved before the preference existed', () => {
    expect(normaliseSettings({ music: false })).toMatchObject({
      locale: 'en-GB',
      music: false,
      eyes: true,
    });
  });

  it('keeps supported locales and falls back to British English', () => {
    expect(normaliseSettings({ locale: 'en-US' })).toMatchObject({ locale: 'en-US' });
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
