import { describe, expect, it } from 'vitest';
import {
  KEYBOARD_MODES,
  SIMPLE_KEY_COUNT,
  buildKeyRows,
  buildKeys,
  buildSimpleKeys,
  getAlphabet,
  getKeyboardLayout,
  hashWord,
  seededRandom,
} from './keyboard';

describe('alphabets', () => {
  it('gives each language its own letters', () => {
    expect(getAlphabet('en-GB')).toHaveLength(26);
    expect(getAlphabet('sv-SE')).toEqual(expect.arrayContaining(['å', 'ä', 'ö']));
    expect(getAlphabet('hu-HU')).toEqual(expect.arrayContaining(['á', 'é', 'ő', 'ű']));
  });

  it('falls back to the default language for an unknown locale', () => {
    expect(getAlphabet('xx-XX')).toEqual(getAlphabet('en-GB'));
  });

  it('contains letters only — the game matches one character at a time', () => {
    Object.values(['en-GB', 'en-US', 'sv-SE', 'hu-HU']).forEach((locale) => {
      getAlphabet(locale).forEach((letter) => {
        expect(letter).toMatch(/^\p{L}$/u);
      });
    });
  });
});

describe('simple keyboard', () => {
  it('always contains every letter the word needs', () => {
    ['cat', 'banana', 'elephant'].forEach((word) => {
      const keys = buildSimpleKeys(word, 'en-GB');
      [...word].forEach((letter) => expect(keys).toContain(letter));
    });
  });

  it('pads with decoys up to the target size', () => {
    // 'cat' needs 3 letters, so 6 decoys join it.
    expect(buildSimpleKeys('cat', 'en-GB')).toHaveLength(SIMPLE_KEY_COUNT);
    expect(new Set(buildSimpleKeys('cat', 'en-GB')).size).toBe(SIMPLE_KEY_COUNT);
  });

  it('grows rather than dropping letters when a word needs more keys than the target', () => {
    const keys = buildSimpleKeys('elephant', 'en-GB', { size: 4 });

    // A keyboard that cannot spell its own word would strand the child.
    [...'elephant'].forEach((letter) => expect(keys).toContain(letter));
    expect(keys.length).toBeGreaterThan(4);
  });

  it('is stable for the same word so keys do not move under the child', () => {
    expect(buildSimpleKeys('cat', 'en-GB')).toEqual(buildSimpleKeys('cat', 'en-GB'));
    expect(buildSimpleKeys('cat', 'en-GB')).not.toEqual(buildSimpleKeys('dog', 'en-GB'));
  });

  it('handles accented words in their own alphabet', () => {
    const keys = buildSimpleKeys('tűz', 'hu-HU');

    expect(keys).toEqual(expect.arrayContaining(['t', 'ű', 'z']));
    keys.forEach((key) => expect(getAlphabet('hu-HU')).toContain(key));
  });

  it('returns nothing for a word with no usable letters', () => {
    expect(buildSimpleKeys('', 'en-GB')).toEqual([]);
    expect(buildSimpleKeys('123', 'en-GB')).toEqual([]);
    expect(buildSimpleKeys(null, 'en-GB')).toEqual([]);
  });

  it('is deterministic given a generator', () => {
    const first = buildSimpleKeys('cat', 'en-GB', { random: seededRandom(42) });
    const second = buildSimpleKeys('cat', 'en-GB', { random: seededRandom(42) });

    expect(first).toEqual(second);
  });
});

describe('key set by mode', () => {
  it('gives the whole alphabet in full mode and nothing in system mode', () => {
    expect(buildKeys('full', 'cat', 'en-GB')).toEqual(getAlphabet('en-GB'));
    expect(buildKeys('system', 'cat', 'en-GB')).toEqual([]);
    expect(KEYBOARD_MODES).toEqual(['system', 'full', 'simple']);
  });
});

describe('physical keyboard layout', () => {
  const LOCALES = ['en-GB', 'en-US', 'sv-SE', 'hu-HU'];

  it('lays the full keyboard out in rows that hold exactly the language alphabet', () => {
    LOCALES.forEach((locale) => {
      const rows = buildKeyRows('full', 'cat', locale);
      const laidOut = rows.flatMap((row) => row.keys);
      // No letter is missing and none is duplicated across the rows.
      expect(new Set(laidOut)).toEqual(new Set(getAlphabet(locale)));
      expect(laidOut).toHaveLength(getAlphabet(locale).length);
    });
  });

  it('keeps each language in its own arrangement', () => {
    // QWERTY / QWERTZ: the first key of the top row differs by language.
    expect(getKeyboardLayout('en-GB')[0].keys.startsWith('qwerty')).toBe(true);
    expect(getKeyboardLayout('hu-HU')[0].keys.startsWith('qwertz')).toBe(true);
    // Swedish carries å ä ö on the letter rows; Hungarian carries í out to the left of the bottom.
    expect(getKeyboardLayout('sv-SE').flatMap((row) => [...row.keys])).toEqual(
      expect.arrayContaining(['å', 'ä', 'ö']),
    );
    expect(getKeyboardLayout('hu-HU')[2].keys[0]).toBe('í');
  });

  it('staggers the rows like a real board instead of stacking them flush', () => {
    const offsets = buildKeyRows('full', 'cat', 'en-GB').map((row) => row.offset);
    expect(offsets).toEqual([0, 0.25, 0.75]);
  });

  it('falls back to the default layout for an unknown locale', () => {
    expect(getKeyboardLayout('xx-XX')).toEqual(getKeyboardLayout('en-GB'));
  });

  it('groups the simple tier into tidy rows without a stagger', () => {
    const rows = buildKeyRows('simple', 'cat', 'en-GB', { random: seededRandom(1) });
    expect(rows.every((row) => row.offset === 0)).toBe(true);
    const flat = rows.flatMap((row) => row.keys);
    expect(flat).toHaveLength(SIMPLE_KEY_COUNT);
    [...'cat'].forEach((letter) => expect(flat).toContain(letter));
  });

  it('gives system mode no rows at all', () => {
    expect(buildKeyRows('system', 'cat', 'en-GB')).toEqual([]);
  });
});

describe('seeded generator', () => {
  it('produces a repeatable stream inside the unit range', () => {
    const draw = seededRandom(hashWord('cat'));
    const values = [draw(), draw(), draw()];

    values.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });
    const again = seededRandom(hashWord('cat'));
    expect([again(), again(), again()]).toEqual(values);
  });
});
