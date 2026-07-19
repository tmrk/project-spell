import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROFILE_ID,
  MAX_NAME_LENGTH,
  MAX_PROFILES,
  PROFILES_KEY,
  createEmptyProfiles,
  createProfile,
  getActiveProfile,
  normaliseProfileName,
  normaliseProfiles,
  profileStorageKey,
  removeProfile,
  renameProfile,
  selectProfile,
} from './profiles';

const named = (name, id) => createProfile(createEmptyProfiles(), name, { id });

describe('profile names', () => {
  it('keeps the name exactly as typed', () => {
    expect(normaliseProfileName('Anna')).toBe('Anna');
    expect(normaliseProfileName('bea')).toBe('bea');
    expect(normaliseProfileName('Ísabella')).toBe('Ísabella');
    expect(normaliseProfileName('Zsófi')).toBe('Zsófi');
  });

  it('trims and collapses whitespace', () => {
    expect(normaliseProfileName('  Anna  ')).toBe('Anna');
    expect(normaliseProfileName('Mary   Jane')).toBe('Mary Jane');
    expect(normaliseProfileName('\n Tom \t')).toBe('Tom');
  });

  it('rejects names without a letter', () => {
    expect(normaliseProfileName('')).toBe('');
    expect(normaliseProfileName('   ')).toBe('');
    expect(normaliseProfileName('123')).toBe('');
    expect(normaliseProfileName('!!!')).toBe('');
    expect(normaliseProfileName(null)).toBe('');
    expect(normaliseProfileName(42)).toBe('');
  });

  it('caps the length without splitting characters', () => {
    expect(normaliseProfileName('a'.repeat(40))).toHaveLength(MAX_NAME_LENGTH);
    // Counting graphemes, not UTF-16 units, keeps accented names whole.
    const accented = 'őőőőőőőőőőőőőő';
    expect([...normaliseProfileName(accented)]).toHaveLength(MAX_NAME_LENGTH);
  });
});

describe('profile store', () => {
  it('creates a single unnamed default profile under its own key', () => {
    expect(PROFILES_KEY).toBe('project-spell:profiles:v1');
    expect(createEmptyProfiles()).toEqual({
      version: 1,
      activeId: DEFAULT_PROFILE_ID,
      profiles: [{ id: DEFAULT_PROFILE_ID, name: '', createdAt: 0 }],
    });
  });

  it('falls back to an empty store for unusable blobs', () => {
    const empty = createEmptyProfiles();
    expect(normaliseProfiles(null)).toEqual(empty);
    expect(normaliseProfiles('nope')).toEqual(empty);
    expect(normaliseProfiles([])).toEqual(empty);
    expect(normaliseProfiles({ profiles: 'nope' })).toEqual(empty);
    expect(normaliseProfiles({ profiles: [] })).toEqual(empty);
  });

  it('drops nameless profiles other than the default slot', () => {
    const result = normaliseProfiles({
      activeId: 'ghost',
      profiles: [
        { id: DEFAULT_PROFILE_ID, name: '' },
        { id: 'ghost', name: '   ' },
        { id: 'anna', name: 'Anna' },
      ],
    });

    expect(result.profiles.map((entry) => entry.id)).toEqual([DEFAULT_PROFILE_ID, 'anna']);
    // The dropped profile cannot stay active.
    expect(result.activeId).toBe(DEFAULT_PROFILE_ID);
  });

  it('dedupes ids, clamps the count, and repairs a missing active id', () => {
    const result = normaliseProfiles({
      profiles: [
        { id: 'anna', name: 'Anna' },
        { id: 'anna', name: 'Anna again' },
        ...Array.from({ length: MAX_PROFILES + 3 }, (_, index) => ({
          id: `child-${index}`,
          name: `Child ${index}`,
        })),
      ],
    });

    expect(result.profiles).toHaveLength(MAX_PROFILES);
    expect(result.profiles.filter((entry) => entry.id === 'anna')).toHaveLength(1);
    expect(result.activeId).toBe('anna');
  });
});

describe('creating profiles', () => {
  it('names the unnamed default profile instead of appending', () => {
    const result = named('Anna');

    // The pre-profile player's history lives under the default id; naming must adopt it.
    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0]).toMatchObject({ id: DEFAULT_PROFILE_ID, name: 'Anna' });
    expect(result.activeId).toBe(DEFAULT_PROFILE_ID);
  });

  it('appends and activates a second profile', () => {
    const result = createProfile(named('Anna'), 'Bo', { id: 'bo', createdAt: 5 });

    expect(result.profiles.map((entry) => entry.name)).toEqual(['Anna', 'Bo']);
    expect(result.activeId).toBe('bo');
    expect(result.profiles[1].createdAt).toBe(5);
  });

  it('never issues the reserved default id to a later profile', () => {
    const result = createProfile(named('Anna'), 'Bo', { id: DEFAULT_PROFILE_ID });

    expect(result.profiles[1].id).not.toBe(DEFAULT_PROFILE_ID);
  });

  it('disambiguates a colliding id', () => {
    const result = createProfile(named('Anna', 'anna'), 'Bo', { id: DEFAULT_PROFILE_ID });
    const third = createProfile(result, 'Cy', { id: result.profiles[1].id });

    expect(new Set(third.profiles.map((entry) => entry.id)).size).toBe(third.profiles.length);
  });

  it('ignores unusable names and refuses to exceed the limit', () => {
    const start = named('Anna');
    expect(createProfile(start, '   ')).toEqual(start);
    expect(createProfile(start, '99')).toEqual(start);

    const full = Array.from({ length: MAX_PROFILES - 1 }, (_, index) => index).reduce(
      (profiles, index) => createProfile(profiles, `Child ${index}`, { id: `child-${index}` }),
      start,
    );
    expect(full.profiles).toHaveLength(MAX_PROFILES);
    expect(createProfile(full, 'One too many', { id: 'extra' })).toEqual(full);
  });
});

describe('changing profiles', () => {
  const two = createProfile(named('Anna'), 'Bo', { id: 'bo' });

  it('renames an existing profile only', () => {
    expect(renameProfile(two, 'bo', 'Bobby').profiles[1].name).toBe('Bobby');
    expect(renameProfile(two, 'nobody', 'Bobby')).toEqual(two);
    expect(renameProfile(two, 'bo', '  ')).toEqual(two);
  });

  it('selects an existing profile only', () => {
    expect(selectProfile(two, DEFAULT_PROFILE_ID).activeId).toBe(DEFAULT_PROFILE_ID);
    expect(selectProfile(two, 'nobody')).toEqual(two);
  });

  it('reports the active profile', () => {
    expect(getActiveProfile(two).name).toBe('Bo');
    expect(getActiveProfile(selectProfile(two, DEFAULT_PROFILE_ID)).name).toBe('Anna');
    // A corrupt active id still resolves to somewhere playable.
    expect(getActiveProfile({ activeId: 'gone', profiles: two.profiles }).name).toBe('Anna');
  });

  it('removes a profile and moves the active id off it', () => {
    const result = removeProfile(two, 'bo');

    expect(result.profiles.map((entry) => entry.name)).toEqual(['Anna']);
    expect(result.activeId).toBe(DEFAULT_PROFILE_ID);
  });

  it('never removes the last profile', () => {
    const one = named('Anna');
    expect(removeProfile(one, DEFAULT_PROFILE_ID)).toEqual(one);
    expect(removeProfile(two, 'nobody')).toEqual(two);
  });
});

describe('profile storage keys', () => {
  it('leaves the default profile on the original un-suffixed keys', () => {
    expect(profileStorageKey('project-spell:progress:v1', DEFAULT_PROFILE_ID)).toBe(
      'project-spell:progress:v1',
    );
    expect(profileStorageKey('project-spell:settings:v1', '')).toBe('project-spell:settings:v1');
  });

  it('suffixes every other profile', () => {
    expect(profileStorageKey('project-spell:stats:v1', 'bo')).toBe('project-spell:stats:v1#bo');
  });
});
