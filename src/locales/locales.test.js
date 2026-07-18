import { describe, expect, it } from 'vitest';
import { LOCALES, getLetterSpeechText } from './index';

const REFERENCE_CODE = 'en-GB';

const placeholdersIn = (template) =>
  [...template.matchAll(/\{(\w+)\}/gu)].map(([, name]) => name);

describe('locale catalogues', () => {
  const reference = LOCALES[REFERENCE_CODE].messages;
  const referenceKeys = Object.keys(reference).sort();

  Object.values(LOCALES).forEach((locale) => {
    it(`keeps ${locale.code} message keys in parity with ${REFERENCE_CODE}`, () => {
      expect(Object.keys(locale.messages).sort()).toEqual(referenceKeys);
    });

    it(`keeps every ${REFERENCE_CODE} placeholder in the ${locale.code} templates`, () => {
      referenceKeys.forEach((key) => {
        const referenceValue = reference[key];
        const value = locale.messages[key];
        if (typeof referenceValue !== 'string') {
          expect(Array.isArray(value)).toBe(Array.isArray(referenceValue));
          return;
        }

        expect(typeof value, `${locale.code} ${key} should be a string`).toBe('string');
        placeholdersIn(referenceValue).forEach((name) => {
          expect(value, `${locale.code} ${key} is missing {${name}}`).toContain(`{${name}}`);
        });
      });
    });
  });

  it('keeps every word praise short and independent of the completed word', () => {
    Object.values(LOCALES).forEach((locale) => {
      locale.messages.wordFinishedSpeeches.forEach((praise) => {
        expect(praise, `${locale.code} praise should not repeat the word`).not.toContain('{word}');
        expect(praise.trim().split(/\s+/u).length, `${locale.code} praise should stay short`).toBeLessThanOrEqual(2);
      });
    });
  });
});

describe('letter speech text', () => {
  it.each(['á', 'é', 'í', 'ó', 'ö', 'ő', 'ú', 'ü', 'ű'])(
    'gives the Hungarian voice a pronunciation boundary for %s',
    (letter) => {
      expect(getLetterSpeechText(letter.toLocaleUpperCase('hu-HU'), 'hu-HU')).toBe(`${letter}.`);
    },
  );

  it('leaves plain Hungarian and non-Hungarian letters unchanged', () => {
    expect(getLetterSpeechText('B', 'hu-HU')).toBe('b');
    expect(getLetterSpeechText('É', 'en-GB')).toBe('é');
  });
});
