import { describe, expect, it } from 'vitest';
import { WORD_BANKS } from '../game';
import {
  SHINY_STICKER_SEQUENCE,
  STICKER_CODEPOINTS,
  STICKER_MAP,
  STICKER_THEMES,
  buildBookPages,
  getStickerDetails,
  getStickerFor,
  getThemeFor,
  hashCode,
} from './map';

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

  it('includes every shiny prize in the downloadable sticker assets', () => {
    expect(SHINY_STICKER_SEQUENCE).toHaveLength(8);
    expect(SHINY_STICKER_SEQUENCE.every((codepoint) => STICKER_CODEPOINTS.includes(codepoint)))
      .toBe(true);
  });

  it('assigns every mapped picture to exactly one theme', () => {
    const themed = Object.values(STICKER_THEMES).flat();
    const mapped = [...new Set(Object.values(STICKER_MAP).flatMap((map) => Object.values(map)).filter(Boolean))];

    expect(new Set(themed).size).toBe(themed.length);
    expect(mapped.every((codepoint) => themed.includes(codepoint))).toBe(true);
    expect(getThemeFor('1f431')).toBe('animals');
    expect(getThemeFor('1f34e')).toBe('food');
    expect(getThemeFor('unknown')).toBe('things');
  });

  it('uses a small deterministic hash for sticker rotation', () => {
    expect(hashCode('en-GB/cat')).toBe(hashCode('en-GB/cat'));
    expect(hashCode('en-GB/cat')).not.toBe(hashCode('en-GB/dog'));
  });

  it('builds owned-first categories with silhouettes only in the first incomplete category', () => {
    const pages = buildBookPages({
      stickers: ['en-GB/apple', 'en-GB/cat', 'en-GB/dog'],
      shinyStickers: [],
    }, 'en-GB');
    const animalPage = pages.find(({ id }) => id === 'animals');
    const foodPage = pages.find(({ id }) => id === 'food');
    const thingsPage = pages.find(({ id }) => id === 'things');

    expect(animalPage.stickers.slice(0, 2).map(({ word }) => word)).toEqual(['cat', 'dog']);
    expect(animalPage.stickers.filter(({ owned }) => !owned)).toHaveLength(4);
    expect(foodPage.stickers).toEqual([
      expect.objectContaining({ word: 'apple', owned: true }),
    ]);
    expect(thingsPage.stickers).toEqual([]);
    expect(pages.flatMap(({ stickers }) => stickers).filter(({ owned }) => !owned)).toHaveLength(4);
  });

  it('keeps shiny prizes last and starts an empty book with all categories and gentle goals', () => {
    const emptyPages = buildBookPages({ stickers: [], shinyStickers: [] }, 'en-GB');
    expect(emptyPages.map(({ id }) => id)).toEqual(['animals', 'food', 'things']);
    expect(emptyPages[0].stickers).toHaveLength(4);
    expect(emptyPages[0].stickers.every(({ owned }) => !owned)).toBe(true);
    expect(emptyPages[1].stickers).toEqual([]);
    expect(emptyPages[2].stickers).toEqual([]);

    const pages = buildBookPages({ stickers: ['en-GB/cat'], shinyStickers: ['1f451'] }, 'en-GB');
    expect(pages.at(-1)).toEqual(expect.objectContaining({
      id: 'shiny',
      stickers: [expect.objectContaining({ codepoint: '1f451', owned: true, shiny: true })],
    }));
  });
});
