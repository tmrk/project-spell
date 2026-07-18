import britishEnglish from './en-GB';
import usEnglish from './en-US';
import hungarian from './hu-HU';
import swedish from './sv-SE';

export const DEFAULT_LOCALE = 'en-GB';

// These countries and territories use established US-English spelling conventions.
const US_ENGLISH_REGIONS = Object.freeze(
  new Set(['AS', 'FM', 'GU', 'LR', 'MH', 'MP', 'PH', 'PR', 'PW', 'UM', 'US', 'VI']),
);

export const LOCALES = Object.freeze({
  [britishEnglish.code]: britishEnglish,
  [usEnglish.code]: usEnglish,
  [swedish.code]: swedish,
  [hungarian.code]: hungarian,
});

export const LOCALE_OPTIONS = Object.freeze(
  Object.values(LOCALES).map(({ code, flag, label }) => Object.freeze({ code, flag, label })),
);

export function normaliseLocale(value) {
  return Object.hasOwn(LOCALES, value) ? value : DEFAULT_LOCALE;
}

function getRegion(locale) {
  if (typeof locale !== 'string' || !locale.trim()) return null;
  const normalisedLocale = locale.replaceAll('_', '-');

  try {
    return new Intl.Locale(normalisedLocale).region?.toUpperCase() ?? null;
  } catch {
    return normalisedLocale
      .split('-')
      .slice(1)
      .find((part) => /^[a-z]{2}$/iu.test(part) || /^\d{3}$/u.test(part))
      ?.toUpperCase() ?? null;
  }
}

function getLanguage(locale) {
  if (typeof locale !== 'string' || !locale.trim()) return null;
  const normalisedLocale = locale.replaceAll('_', '-');

  try {
    return new Intl.Locale(normalisedLocale).language.toLowerCase();
  } catch {
    return normalisedLocale.split('-')[0]?.toLowerCase() ?? null;
  }
}

export function detectDefaultLocale(language) {
  const browserLanguage = language
    ?? globalThis.navigator?.languages?.[0]
    ?? globalThis.navigator?.language;
  const languageDefaults = { hu: 'hu-HU', sv: 'sv-SE' };
  const detectedLanguage = getLanguage(browserLanguage);
  if (Object.hasOwn(languageDefaults, detectedLanguage)) return languageDefaults[detectedLanguage];
  return US_ENGLISH_REGIONS.has(getRegion(browserLanguage)) ? 'en-US' : DEFAULT_LOCALE;
}

export function getLocale(value) {
  return LOCALES[normaliseLocale(value)];
}

export function formatMessage(template, values = {}) {
  return template.replace(/\{(\w+)\}/gu, (match, key) => String(values[key] ?? match));
}
