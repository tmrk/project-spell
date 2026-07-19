// Local-only reward progress (decision D-004). Persistence stays in App.jsx.

import { SHINY_STICKER_SEQUENCE, getStickerFor } from './stickers/map';

export const PROGRESS_KEY = 'project-spell:progress:v1';
export const SUPER_ROUND_EVERY = 4;

const asCount = (value) => (Number.isFinite(value) && value > 0 ? Math.round(value) : 0);

const normaliseIds = (value) =>
  Array.isArray(value)
    ? [...new Set(value.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))]
    : [];

const asCyclePosition = (value) =>
  Math.min(asCount(value), SUPER_ROUND_EVERY - 1);

export function createEmptyProgress() {
  return {
    version: 1,
    totalStars: 0,
    stickers: [],
    shinyStickers: [],
    badges: [],
    roundsTowardSuper: 0,
  };
}

export function normaliseProgress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return createEmptyProgress();

  return {
    version: 1,
    totalStars: asCount(value.totalStars),
    stickers: normaliseIds(value.stickers),
    shinyStickers: normaliseIds(value.shinyStickers),
    badges: normaliseIds(value.badges),
    roundsTowardSuper: asCyclePosition(value.roundsTowardSuper),
  };
}

export function addStars(progress, amount) {
  const current = normaliseProgress(progress);
  return {
    ...current,
    totalStars: current.totalStars + asCount(amount),
  };
}

export function pickStickerAward(progress, roundWords, locale) {
  const owned = new Set(normaliseProgress(progress).stickers);
  if (!Array.isArray(roundWords)) return null;

  for (const word of roundWords) {
    if (typeof word !== 'string' || !getStickerFor(word, locale)) continue;
    const id = `${locale}/${word.normalize('NFC').toLocaleLowerCase(locale)}`;
    if (!owned.has(id)) return id;
  }
  return null;
}

export function addSticker(progress, id) {
  const current = normaliseProgress(progress);
  const nextId = typeof id === 'string' ? id.trim() : '';
  if (!nextId || current.stickers.includes(nextId)) return current;
  return { ...current, stickers: [...current.stickers, nextId] };
}

export function isSuperRoundNext(progress) {
  return normaliseProgress(progress).roundsTowardSuper >= SUPER_ROUND_EVERY - 1;
}

export function recordRoundInCycle(progress, { wasSuper = false } = {}) {
  const current = normaliseProgress(progress);
  return {
    ...current,
    roundsTowardSuper: wasSuper
      ? 0
      : Math.min(current.roundsTowardSuper + 1, SUPER_ROUND_EVERY - 1),
  };
}

export function pickShinyAward(progress) {
  const owned = new Set(normaliseProgress(progress).shinyStickers);
  return SHINY_STICKER_SEQUENCE.find((codepoint) => !owned.has(codepoint)) ?? null;
}

export function addShinySticker(progress, codepoint) {
  const current = normaliseProgress(progress);
  const nextCodepoint = typeof codepoint === 'string' ? codepoint.trim() : '';
  if (!nextCodepoint || current.shinyStickers.includes(nextCodepoint)) return current;
  return { ...current, shinyStickers: [...current.shinyStickers, nextCodepoint] };
}

const BADGE_RULES = Object.freeze([
  ['first-round', (stats) => stats.totals.roundsCompleted >= 1],
  ['words-10', (stats) => stats.totals.wordsCompleted >= 10],
  ['words-50', (stats) => stats.totals.wordsCompleted >= 50],
  ['words-100', (stats) => stats.totals.wordsCompleted >= 100],
  ['perfect-round', (_stats, round) => round.stars === 3],
  ['normal-round', (_stats, round) => round.mode === 'normal'],
]);

export function newBadges(progress, stats, roundSummary = {}) {
  const owned = new Set(normaliseProgress(progress).badges);
  const safeStats = stats?.totals ? stats : { totals: {} };
  const totals = {
    roundsCompleted: Number(safeStats.totals.roundsCompleted) || 0,
    wordsCompleted: Number(safeStats.totals.wordsCompleted) || 0,
  };
  const normalisedStats = { ...safeStats, totals };
  return BADGE_RULES
    .filter(([id, rule]) => !owned.has(id) && rule(normalisedStats, roundSummary))
    .map(([id]) => id);
}

export function addBadges(progress, ids) {
  const current = normaliseProgress(progress);
  const next = normaliseIds(ids).filter((id) => !current.badges.includes(id));
  return next.length ? { ...current, badges: [...current.badges, ...next] } : current;
}
