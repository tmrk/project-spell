import { useEffect, useMemo, useRef, useState } from 'react';
import { CloseIcon } from './Icons';
import { DEFAULT_SETTINGS, PRESETS, getEligibleWords, normaliseSettings } from '../game';
import { LOCALE_OPTIONS, formatMessage, getLocale } from '../locales';

const NUMBER_OPTIONS = Array.from({ length: 13 }, (_, index) => index + 2);
const ROUND_OPTIONS = [3, 5, 8, 10, 12, 15, 20];
const PRESET_MESSAGE_KEYS = Object.freeze({
  starter: ['presetStarterLabel', 'presetStarterDescription'],
  explorer: ['presetExplorerLabel', 'presetExplorerDescription'],
  challenge: ['presetChallengeLabel', 'presetChallengeDescription'],
});

function LanguageChangeDialog({ copy, onCancel, onConfirm }) {
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    confirmButtonRef.current?.focus();
  }, []);

  return (
    <div
      className="confirmation-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        event.stopPropagation();
        onCancel();
      }}
    >
      <section
        className="confirmation-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="language-change-title"
        aria-describedby="language-change-warning"
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      >
        <h3 id="language-change-title">{copy.languageChangeTitle}</h3>
        <p id="language-change-warning">{copy.languageChangeWarning}</p>
        <div className="confirmation-dialog__actions">
          <button type="button" className="text-button" onClick={onCancel}>
            {copy.keepLanguage}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className="primary-button primary-button--small"
            onClick={onConfirm}
          >
            {copy.changeAndRestart}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function SettingsPanel({ settings, onClose, onSave }) {
  const [draft, setDraft] = useState(settings);
  const [pendingSettings, setPendingSettings] = useState(null);
  const closeButtonRef = useRef(null);
  const languageSelectRef = useRef(null);
  const copy = getLocale(draft.locale).messages;
  const eligibleCount = useMemo(() => getEligibleWords(draft).length, [draft]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  const setValue = (key, value) => {
    setDraft((current) => normaliseSettings({ ...current, [key]: value }));
  };

  const applyPreset = (preset) => {
    setDraft((current) => normaliseSettings({ ...current, ...preset.settings }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!eligibleCount) return;

    const nextSettings = normaliseSettings(draft);
    if (nextSettings.locale !== settings.locale) {
      setPendingSettings(nextSettings);
      return;
    }
    onSave(nextSettings);
  };

  const resetSettings = () => {
    setDraft(normaliseSettings({ ...DEFAULT_SETTINGS, locale: draft.locale }));
  };

  const cancelLanguageChange = () => {
    setPendingSettings(null);
    setDraft((current) => normaliseSettings({ ...current, locale: settings.locale }));
    window.requestAnimationFrame(() => languageSelectRef.current?.focus());
  };

  const matchMessage = eligibleCount
    ? formatMessage(copy.wordsMatch, {
        count: eligibleCount,
        unit: eligibleCount === 1 ? copy.wordSingular : copy.wordPlural,
      })
    : copy.noWordsMatch;

  return (
    <div className="settings-backdrop" role="presentation" onPointerDown={onClose}>
      <section
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <header className="settings-panel__header">
          <h2 id="settings-title">{copy.settingsHeading}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={copy.closeSettings}
          >
            <CloseIcon />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <fieldset className="settings-section">
            <legend>{copy.language}</legend>
            <label className="stacked-field">
              <span className="sr-only">{copy.language}</span>
              <select
                ref={languageSelectRef}
                value={draft.locale}
                onChange={(event) => setValue('locale', event.target.value)}
              >
                {LOCALE_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.flag} {option.label}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <fieldset className="settings-section">
            <legend>{copy.quickStart}</legend>
            <div className="preset-grid">
              {Object.entries(PRESETS).map(([id, preset]) => {
                const [labelKey, descriptionKey] = PRESET_MESSAGE_KEYS[id];
                return (
                  <button
                    type="button"
                    className="preset-button"
                    key={id}
                    onClick={() => applyPreset(preset)}
                  >
                    <strong>{copy[labelKey]}</strong>
                    <span>{copy[descriptionKey]}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="settings-section">
            <legend>{copy.round}</legend>
            <div className="field-grid">
              <label>
                <span>{copy.shortestWord}</span>
                <select value={draft.minLetters} onChange={(event) => setValue('minLetters', event.target.value)}>
                  {NUMBER_OPTIONS.slice(0, -2).map((number) => (
                    <option key={number} value={number}>
                      {formatMessage(copy.lettersOption, { count: number })}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{copy.longestWord}</span>
                <select value={draft.maxLetters} onChange={(event) => setValue('maxLetters', event.target.value)}>
                  {NUMBER_OPTIONS.filter((number) => number >= draft.minLetters).map((number) => (
                    <option key={number} value={number}>
                      {formatMessage(copy.lettersOption, { count: number })}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{copy.syllables}</span>
                <select value={draft.syllables} onChange={(event) => setValue('syllables', event.target.value)}>
                  <option value="any">{copy.anyNumber}</option>
                  <option value="1">{copy.one}</option>
                  <option value="2">{copy.two}</option>
                  <option value="3">{copy.three}</option>
                  <option value="4+">{copy.fourOrMore}</option>
                </select>
              </label>
              <label>
                <span>{copy.wordsInARow}</span>
                <select value={draft.roundLength} onChange={(event) => setValue('roundLength', event.target.value)}>
                  {ROUND_OPTIONS.map((number) => (
                    <option key={number} value={number}>
                      {formatMessage(copy.wordsOption, { count: number })}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="settings-section">
            <legend>{copy.yourWords}</legend>
            <label className="stacked-field">
              <span>{copy.wordList}</span>
              <textarea
                value={draft.customWords}
                onChange={(event) => setValue('customWords', event.target.value)}
                placeholder={copy.customWordsPlaceholder}
                rows="5"
                spellCheck="false"
              />
              <small>{copy.customWordsHelp}</small>
            </label>
            <label className="stacked-field">
              <span>{copy.chooseFrom}</span>
              <select value={draft.wordSource} onChange={(event) => setValue('wordSource', event.target.value)}>
                <option value="all">{copy.allWords}</option>
                <option value="custom">{copy.customWordsOnly}</option>
              </select>
            </label>
          </fieldset>

          <fieldset className="settings-section settings-section--compact">
            <legend>{copy.letters}</legend>
            <label className="toggle-row">
              <span>{copy.cartoonEyes}</span>
              <input type="checkbox" checked={draft.eyes} onChange={(event) => setValue('eyes', event.target.checked)} />
            </label>
            <label className="toggle-row">
              <span className="toggle-copy">
                <span>{copy.acceptUnaccented}</span>
                <small>{copy.acceptUnaccentedHelp}</small>
              </span>
              <input
                type="checkbox"
                aria-label={copy.acceptUnaccented}
                checked={draft.acceptUnaccented}
                onChange={(event) => setValue('acceptUnaccented', event.target.checked)}
              />
            </label>
          </fieldset>

          <fieldset className="settings-section settings-section--compact">
            <legend>{copy.sound}</legend>
            <label className="toggle-row">
              <span>{copy.sayEachWord}</span>
              <input type="checkbox" checked={draft.speech} onChange={(event) => setValue('speech', event.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>{copy.soundEffects}</span>
              <input type="checkbox" checked={draft.soundEffects} onChange={(event) => setValue('soundEffects', event.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>{copy.backgroundMusic}</span>
              <input type="checkbox" checked={draft.music} onChange={(event) => setValue('music', event.target.checked)} />
            </label>
          </fieldset>

          <footer className="settings-footer">
            <button type="button" className="text-button" onClick={resetSettings}>
              {copy.reset}
            </button>
            <div className="settings-footer__save">
              <span className={eligibleCount ? '' : 'field-error'}>{matchMessage}</span>
              <button type="submit" className="primary-button primary-button--small" disabled={!eligibleCount}>
                {copy.saveAndClose}
              </button>
            </div>
          </footer>
        </form>
      </section>

      {pendingSettings && (
        <LanguageChangeDialog
          copy={copy}
          onCancel={cancelLanguageChange}
          onConfirm={() => onSave(pendingSettings)}
        />
      )}
    </div>
  );
}
