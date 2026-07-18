import { useEffect, useMemo, useRef, useState } from 'react';
import { CloseIcon } from './Icons';
import { DEFAULT_SETTINGS, PRESETS, getEligibleWords, normaliseSettings } from '../game';

const NUMBER_OPTIONS = Array.from({ length: 13 }, (_, index) => index + 2);
const ROUND_OPTIONS = [3, 5, 8, 10, 12, 15, 20];

export default function SettingsPanel({ settings, onClose, onSave }) {
  const [draft, setDraft] = useState(settings);
  const closeButtonRef = useRef(null);
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
    if (eligibleCount) onSave(normaliseSettings(draft));
  };

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
          <div>
            <p className="eyebrow">For parents</p>
            <h2 id="settings-title">Grown-ups</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close settings"
          >
            <CloseIcon />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <fieldset className="settings-section">
            <legend>A quick starting point</legend>
            <div className="preset-grid">
              {Object.values(PRESETS).map((preset) => (
                <button
                  type="button"
                  className="preset-button"
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                >
                  <strong>{preset.label}</strong>
                  <span>{preset.description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="settings-section">
            <legend>Round</legend>
            <div className="field-grid">
              <label>
                <span>Shortest word</span>
                <select value={draft.minLetters} onChange={(event) => setValue('minLetters', event.target.value)}>
                  {NUMBER_OPTIONS.slice(0, -2).map((number) => (
                    <option key={number} value={number}>{number} letters</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Longest word</span>
                <select value={draft.maxLetters} onChange={(event) => setValue('maxLetters', event.target.value)}>
                  {NUMBER_OPTIONS.filter((number) => number >= draft.minLetters).map((number) => (
                    <option key={number} value={number}>{number} letters</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Syllables</span>
                <select value={draft.syllables} onChange={(event) => setValue('syllables', event.target.value)}>
                  <option value="any">Any number</option>
                  <option value="1">One</option>
                  <option value="2">Two</option>
                  <option value="3">Three</option>
                  <option value="4+">Four or more</option>
                </select>
              </label>
              <label>
                <span>Words in a row</span>
                <select value={draft.roundLength} onChange={(event) => setValue('roundLength', event.target.value)}>
                  {ROUND_OPTIONS.map((number) => (
                    <option key={number} value={number}>{number} words</option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="settings-section">
            <legend>Your words</legend>
            <label className="stacked-field">
              <span>Word list</span>
              <textarea
                value={draft.customWords}
                onChange={(event) => setValue('customWords', event.target.value)}
                placeholder={'grandma\nSaturday\nbutterfly'}
                rows="5"
                spellCheck="false"
              />
              <small>One word per line or separated by commas. Use 2–14 English letters.</small>
            </label>
            <label className="stacked-field">
              <span>Choose from</span>
              <select value={draft.wordSource} onChange={(event) => setValue('wordSource', event.target.value)}>
                <option value="all">Built-in words + my words</option>
                <option value="custom">Only my words</option>
              </select>
            </label>
          </fieldset>

          <fieldset className="settings-section settings-section--compact">
            <legend>Sound</legend>
            <label className="toggle-row">
              <span>Say each word</span>
              <input type="checkbox" checked={draft.speech} onChange={(event) => setValue('speech', event.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>Sound effects</span>
              <input type="checkbox" checked={draft.soundEffects} onChange={(event) => setValue('soundEffects', event.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>Background music</span>
              <input type="checkbox" checked={draft.music} onChange={(event) => setValue('music', event.target.checked)} />
            </label>
          </fieldset>

          <footer className="settings-footer">
            <button type="button" className="text-button" onClick={() => setDraft(DEFAULT_SETTINGS)}>
              Reset
            </button>
            <div className="settings-footer__save">
              <span className={eligibleCount ? '' : 'field-error'}>
                {eligibleCount
                  ? `${eligibleCount} ${eligibleCount === 1 ? 'word' : 'words'} match`
                  : 'No words match these settings'}
              </span>
              <button type="submit" className="primary-button primary-button--small" disabled={!eligibleCount}>
                Save &amp; close
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
