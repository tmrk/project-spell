import { describe, expect, it } from 'vitest';
import { WORD_BANKS } from '../game';
import { STICKER_CODEPOINTS, getStickerDetails, getStickerFor } from './map';

describe('sticker catalogue', () => {
  it('shares art across translations and resolves stored ids', () => {
    expect(getStickerFor('cat', 'en-GB')).toBe('1f431');
    expect(getStickerFor('KATT', 'sv-SE')).toBe('1f431');
    expect(getStickerFor('cica', 'hu-HU')).toBe('1f431');
    expect(getStickerFor('remember', 'en-GB')).toBeNull();
    expect(getStickerDetails('sv-SE/katt')).toEqual({
      codepoint: '1f431',
      id: 'sv-SE/katt',
      locale: 'sv-SE',
      word: 'katt',
    });
  });

  it('covers at least 60% of every built-in word bank with concrete pictures', () => {
    for (const [locale, entries] of Object.entries(WORD_BANKS)) {
      const covered = entries.filter(({ word }) => getStickerFor(word, locale)).length;
      expect(covered / entries.length, `${locale}: ${covered}/${entries.length}`).toBeGreaterThanOrEqual(0.6);
    }
  });

  it('keeps every asset codepoint unique and filename-safe', () => {
    expect(new Set(STICKER_CODEPOINTS).size).toBe(STICKER_CODEPOINTS.length);
    expect(STICKER_CODEPOINTS.every((codepoint) => /^[0-9a-f_]+$/u.test(codepoint))).toBe(true);
  });
});
