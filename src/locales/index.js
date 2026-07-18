import britishEnglish from './en-GB';
import usEnglish from './en-US';

export const DEFAULT_LOCALE = 'en-GB';

export const LOCALES = Object.freeze({
  [britishEnglish.code]: britishEnglish,
  [usEnglish.code]: usEnglish,
});

export const LOCALE_OPTIONS = Object.freeze(
  Object.values(LOCALES).map(({ code, label }) => Object.freeze({ code, label })),
);

export function normaliseLocale(value) {
  return Object.hasOwn(LOCALES, value) ? value : DEFAULT_LOCALE;
}

export function getLocale(value) {
  return LOCALES[normaliseLocale(value)];
}

export function formatMessage(template, values = {}) {
  return template.replace(/\{(\w+)\}/gu, (match, key) => String(values[key] ?? match));
}
