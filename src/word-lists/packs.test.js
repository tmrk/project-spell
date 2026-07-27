import { describe, expect, it } from 'vitest';
import { WORD_BANKS } from '../game';
import { WORD_PACKS } from './packs';

describe('word packs', () => {
  it('contains only existing locale-bank words and never exposes a thin locale pack', () => {
    Object.entries(WORD_PACKS).forEach(([packId, pack]) => {
      expect(pack.labelKey).toBe(`pack${packId[0].toUpperCase()}${packId.slice(1)}`);

      Object.entries(pack.words).forEach(([locale, words]) => {
        const bank = new Set(WORD_BANKS[locale].map(({ word }) => word));

        expect(words.length, `${packId}/${locale}`).toBeGreaterThanOrEqual(12);
        expect(new Set(words).size, `${packId}/${locale} duplicates`).toBe(words.length);
        words.forEach((word) => expect(bank.has(word), `${packId}/${locale}/${word}`).toBe(true));
      });
    });
  });
});
