// Local-only reward progress (decision D-004). Persistence stays in App.jsx.

export const PROGRESS_KEY = 'project-spell:progress:v1';

const asCount = (value) => (Number.isFinite(value) && value > 0 ? Math.round(value) : 0);

const normaliseIds = (value) =>
  Array.isArray(value)
    ? [...new Set(value.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))]
    : [];

export function createEmptyProgress() {
  return {
    version: 1,
    totalStars: 0,
    stickers: [],
    badges: [],
  };
}

export function normaliseProgress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return createEmptyProgress();

  return {
    version: 1,
    totalStars: asCount(value.totalStars),
    stickers: normaliseIds(value.stickers),
    badges: normaliseIds(value.badges),
  };
}

export function addStars(progress, amount) {
  const current = normaliseProgress(progress);
  return {
    ...current,
    totalStars: current.totalStars + asCount(amount),
  };
}
