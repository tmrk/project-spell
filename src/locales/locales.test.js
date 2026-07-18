import { describe, expect, it } from 'vitest';
import { LOCALES } from './index';

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
});
