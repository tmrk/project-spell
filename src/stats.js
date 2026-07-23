// Local-only play statistics (decision D-004). Everything in this module is pure and
// deterministic; persistence and timing live in App.jsx. No PII, no network, ever.

export const STATS_KEY = 'project-spell:stats:v1';

const RECENT_EVENTS_CAP = 400;
const STATS_SIZE_GUARD = 120000;

export function createEmptyStats() {
  return {
    version: 1,
    totals: {
      attempts: 0,
      misses: 0,
      wordsCompleted: 0,
      perfectWords: 0,
      roundsCompleted: 0,
      playMs: 0,
    },
    letters: {},
    confusions: {},
    words: {},
    recentEvents: [],
  };
}

const asCount = (value) => (Number.isFinite(value) && value > 0 ? Math.round(value) : 0);

function withEvent(stats, event) {
  let recentEvents = [...stats.recentEvents, event].slice(-RECENT_EVENTS_CAP);
  let next = { ...stats, recentEvents };
  if (JSON.stringify(next).length > STATS_SIZE_GUARD) {
    recentEvents = recentEvents.slice(Math.ceil(recentEvents.length / 2));
    next = { ...next, recentEvents };
  }
  return next;
}

export function recordAttempt(stats, { expected, typed, correct, latencyMs, mode }) {
  const latency = asCount(latencyMs);
  const letter = stats.letters[expected] ?? { attempts: 0, misses: 0, totalMs: 0 };
  const next = {
    ...stats,
    totals: {
      ...stats.totals,
      attempts: stats.totals.attempts + 1,
      misses: stats.totals.misses + (correct ? 0 : 1),
    },
    letters: {
      ...stats.letters,
      [expected]: {
        attempts: letter.attempts + 1,
        misses: letter.misses + (correct ? 0 : 1),
        totalMs: letter.totalMs + latency,
      },
    },
    confusions: correct
      ? stats.confusions
      : {
          ...stats.confusions,
          [`${expected}→${typed}`]: (stats.confusions[`${expected}→${typed}`] ?? 0) + 1,
        },
  };
  return withEvent(next, ['a', Date.now(), expected, typed, correct ? 1 : 0, latency, mode]);
}

export function recordWordCompleted(stats, { word, locale, mistakes, durationMs, mode }) {
  const id = `${locale}/${word}`;
  const entry = stats.words[id] ?? { seen: 0, completed: 0, mistakes: 0, perfect: false };
  const missCount = asCount(mistakes);
  const next = {
    ...stats,
    totals: {
      ...stats.totals,
      wordsCompleted: stats.totals.wordsCompleted + 1,
      perfectWords: stats.totals.perfectWords + (missCount === 0 ? 1 : 0),
    },
    words: {
      ...stats.words,
      [id]: {
        seen: entry.seen + 1,
        completed: entry.completed + 1,
        mistakes: entry.mistakes + missCount,
        perfect: missCount === 0,
      },
    },
  };
  return withEvent(next, ['w', Date.now(), id, missCount, asCount(durationMs), mode]);
}

export function recordRoundCompleted(stats, { length, mistakes, durationMs, mode }) {
  const duration = asCount(durationMs);
  const next = {
    ...stats,
    totals: {
      ...stats.totals,
      roundsCompleted: stats.totals.roundsCompleted + 1,
      playMs: stats.totals.playMs + duration,
    },
  };
  return withEvent(next, ['r', Date.now(), asCount(length), asCount(mistakes), duration, mode]);
}

export function normaliseStats(value) {
  const stats = createEmptyStats();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return stats;

  Object.keys(stats.totals).forEach((key) => {
    stats.totals[key] = asCount(value.totals?.[key]);
  });

  if (value.letters && typeof value.letters === 'object') {
    Object.entries(value.letters).forEach(([letter, entry]) => {
      if (typeof letter !== 'string' || !entry || typeof entry !== 'object') return;
      stats.letters[letter] = {
        attempts: asCount(entry.attempts),
        misses: asCount(entry.misses),
        totalMs: asCount(entry.totalMs),
      };
    });
  }

  if (value.confusions && typeof value.confusions === 'object') {
    Object.entries(value.confusions).forEach(([pair, count]) => {
      if (asCount(count) > 0) stats.confusions[pair] = asCount(count);
    });
  }

  if (value.words && typeof value.words === 'object') {
    Object.entries(value.words).forEach(([id, entry]) => {
      if (!entry || typeof entry !== 'object') return;
      stats.words[id] = {
        seen: asCount(entry.seen),
        completed: asCount(entry.completed),
        mistakes: asCount(entry.mistakes),
        perfect: entry.perfect === true,
      };
    });
  }

  if (Array.isArray(value.recentEvents)) {
    stats.recentEvents = value.recentEvents
      .filter((event) => Array.isArray(event))
      .slice(-RECENT_EVENTS_CAP);
  }

  return stats;
}

export function trickiestLetters(stats, { minAttempts = 5, count = 3 } = {}) {
  return Object.entries(stats.letters)
    .filter(([, entry]) => entry.attempts >= minAttempts && entry.misses > 0)
    .sort(([, a], [, b]) => b.misses / b.attempts - a.misses / a.attempts)
    .slice(0, count)
    .map(([letter]) => letter);
}

export function completedWordsForLocale(stats, locale) {
  const safe = stats?.words && typeof stats.words === 'object' ? stats : createEmptyStats();
  const prefix = `${locale}/`;
  const completedWords = new Set();

  Object.entries(safe.words).forEach(([id, entry]) => {
    if (typeof id !== 'string' || !id.startsWith(prefix) || !entry || typeof entry !== 'object') return;
    const word = id.slice(prefix.length);
    if (word && asCount(entry.completed) >= 1) completedWords.add(word);
  });

  return completedWords;
}

// Feeds adaptive word selection (roadmap G6). `perfect` records whether the *most recent*
// completion was clean, so a struggling word is one the child last got wrong.
export function summariseForSelection(stats, locale) {
  const safe = stats?.words && typeof stats.words === 'object' ? stats : createEmptyStats();
  const prefix = `${locale}/`;
  const strugglingWords = new Set();
  const masteredWords = new Set();

  Object.entries(safe.words).forEach(([id, entry]) => {
    if (typeof id !== 'string' || !id.startsWith(prefix) || !entry || typeof entry !== 'object') return;
    const word = id.slice(prefix.length);
    if (!word || asCount(entry.completed) < 1) return;
    if (entry.perfect !== true) strugglingWords.add(word);
    else if (asCount(entry.completed) >= 2) masteredWords.add(word);
  });

  return {
    trickyLetters: trickiestLetters(safe, { count: 3 }),
    strugglingWords,
    masteredWords,
  };
}

// Parent-facing letter heat map (roadmap G8.8). Hardest first, because a parent opening this
// wants to know what to help with, not to read the alphabet. Letters with barely any attempts
// are omitted rather than shown as alarming red on a sample of one.
export function buildLetterHeatMap(stats, { minAttempts = 3 } = {}) {
  const letters = stats?.letters && typeof stats.letters === 'object' ? stats.letters : {};

  return Object.entries(letters)
    .filter(([letter, entry]) => typeof letter === 'string' && letter && entry?.attempts >= minAttempts)
    .map(([letter, entry]) => ({
      letter,
      attempts: entry.attempts,
      misses: entry.misses,
      accuracy: (entry.attempts - entry.misses) / entry.attempts,
      averageMs: Math.round(entry.totalMs / entry.attempts),
    }))
    .sort(
      (a, b) =>
        a.accuracy - b.accuracy || b.attempts - a.attempts || a.letter.localeCompare(b.letter),
    );
}

export function topConfusions(stats, { count = 4 } = {}) {
  const confusions = stats?.confusions && typeof stats.confusions === 'object' ? stats.confusions : {};

  return Object.entries(confusions)
    .map(([pair, times]) => {
      const [expected, typed] = String(pair).split('→');
      return { expected, typed, times: asCount(times) };
    })
    .filter(({ expected, typed, times }) => expected && typed && times > 0)
    .sort((a, b) => b.times - a.times || a.expected.localeCompare(b.expected))
    .slice(0, count);
}

export function averageLetterMs(stats) {
  const entries = Object.values(stats.letters);
  const attempts = entries.reduce((sum, entry) => sum + entry.attempts, 0);
  if (!attempts) return null;
  return entries.reduce((sum, entry) => sum + entry.totalMs, 0) / attempts;
}

export function starsForWord(mistakes) {
  if (mistakes === 0) return 3;
  return Number.isFinite(mistakes) && mistakes <= 2 ? 2 : 1;
}

export function starsForRound(wordStars) {
  if (!Array.isArray(wordStars) || wordStars.length === 0) return 1;
  if (wordStars.every((stars) => stars === 3)) return 3;
  return wordStars.filter((stars) => stars === 3).length >= wordStars.length / 2 ? 2 : 1;
}
