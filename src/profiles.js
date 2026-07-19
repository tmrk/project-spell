// Local profiles: several children on one device, each with their own settings, stats and
// rewards (decision D-012). Everything stays on-device — this is not an account system, and
// nothing here talks to a network. Persistence lives in App.jsx; this module stays pure.

export const PROFILES_KEY = 'project-spell:profiles:v1';
// The first profile keeps the original un-suffixed storage keys, so a child who has been
// playing since before profiles existed keeps their stars without any migration step.
export const DEFAULT_PROFILE_ID = 'default';
export const MAX_PROFILES = 6;
export const MAX_NAME_LENGTH = 12;

const asId = (value) => (typeof value === 'string' ? value.trim() : '');

const asTimestamp = (value) => (Number.isFinite(value) && value > 0 ? Math.round(value) : 0);

// Names are stored exactly as typed — never upper-cased — so "Ísabella" and "bea" survive
// intact. Casing is a display decision, not a storage one.
export function normaliseProfileName(value) {
  if (typeof value !== 'string') return '';
  const collapsed = value.normalize('NFC').replace(/\s+/gu, ' ').trim();
  if (!/\p{L}/u.test(collapsed)) return '';
  return [...collapsed].slice(0, MAX_NAME_LENGTH).join('').trim();
}

export function createEmptyProfiles() {
  return {
    version: 1,
    activeId: DEFAULT_PROFILE_ID,
    profiles: [{ id: DEFAULT_PROFILE_ID, name: '', createdAt: 0 }],
  };
}

export function normaliseProfiles(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return createEmptyProfiles();

  const seen = new Set();
  const profiles = (Array.isArray(value.profiles) ? value.profiles : [])
    .map((entry) => ({
      id: asId(entry?.id),
      name: normaliseProfileName(entry?.name),
      createdAt: asTimestamp(entry?.createdAt),
    }))
    // Only the default profile may be nameless: it is the "nobody has typed a name yet" slot.
    .filter((entry) => entry.id && (entry.name || entry.id === DEFAULT_PROFILE_ID))
    .filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    })
    .slice(0, MAX_PROFILES);

  if (!profiles.length) return createEmptyProfiles();

  const activeId = asId(value.activeId);
  return {
    version: 1,
    activeId: profiles.some((entry) => entry.id === activeId) ? activeId : profiles[0].id,
    profiles,
  };
}

function uniqueId(existingIds, seed) {
  const base = seed || `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  let candidate = base === DEFAULT_PROFILE_ID ? `${base}-1` : base;
  let suffix = 1;
  while (existingIds.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

/**
 * Adds a named profile.
 *
 * If an unnamed profile exists it is *named* rather than appended to. Only the default profile
 * can be unnamed, and it owns whatever progress was accumulated before anyone typed a name —
 * so the first child to enter their name adopts that history instead of stranding it behind an
 * anonymous slot nobody can select.
 */
export function createProfile(profiles, name, options = {}) {
  const current = normaliseProfiles(profiles);
  const cleanName = normaliseProfileName(name);
  if (!cleanName) return current;

  const unnamed = current.profiles.find((entry) => !entry.name);
  if (unnamed) {
    return {
      ...current,
      activeId: unnamed.id,
      profiles: current.profiles.map((entry) =>
        entry.id === unnamed.id ? { ...entry, name: cleanName } : entry,
      ),
    };
  }

  if (current.profiles.length >= MAX_PROFILES) return current;

  const id = uniqueId(new Set(current.profiles.map((entry) => entry.id)), asId(options.id));
  return {
    ...current,
    activeId: id,
    profiles: [
      ...current.profiles,
      { id, name: cleanName, createdAt: asTimestamp(options.createdAt ?? Date.now()) },
    ],
  };
}

export function renameProfile(profiles, id, name) {
  const current = normaliseProfiles(profiles);
  const cleanName = normaliseProfileName(name);
  const targetId = asId(id);
  if (!cleanName || !current.profiles.some((entry) => entry.id === targetId)) return current;

  return {
    ...current,
    profiles: current.profiles.map((entry) =>
      entry.id === targetId ? { ...entry, name: cleanName } : entry,
    ),
  };
}

/**
 * Removes a profile. The last remaining profile is never removable — there must always be
 * somewhere to play. Callers are responsible for clearing the removed profile's scoped
 * storage keys; `profileStorageKey` gives them the names.
 */
export function removeProfile(profiles, id) {
  const current = normaliseProfiles(profiles);
  const targetId = asId(id);
  if (current.profiles.length <= 1 || !current.profiles.some((entry) => entry.id === targetId)) {
    return current;
  }

  const remaining = current.profiles.filter((entry) => entry.id !== targetId);
  return {
    ...current,
    activeId: current.activeId === targetId ? remaining[0].id : current.activeId,
    profiles: remaining,
  };
}

export function selectProfile(profiles, id) {
  const current = normaliseProfiles(profiles);
  const targetId = asId(id);
  if (!current.profiles.some((entry) => entry.id === targetId)) return current;
  return { ...current, activeId: targetId };
}

export function getActiveProfile(profiles) {
  const current = normaliseProfiles(profiles);
  return current.profiles.find((entry) => entry.id === current.activeId) ?? current.profiles[0];
}

/**
 * The one place that knows how a base storage key maps onto a profile. The default profile
 * uses the bare legacy key on purpose (see DEFAULT_PROFILE_ID); every other profile is
 * suffixed, so no migration has to run when this feature lands.
 */
export function profileStorageKey(baseKey, id) {
  const profileId = asId(id);
  return !profileId || profileId === DEFAULT_PROFILE_ID ? baseKey : `${baseKey}#${profileId}`;
}
