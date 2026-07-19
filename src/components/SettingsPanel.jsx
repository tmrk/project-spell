import { useEffect, useMemo, useRef, useState } from 'react';
import { CloseIcon } from './Icons';
import NameTag from './NameTag';
import { MAX_PROFILES, getActiveProfile } from '../profiles';
import { DEFAULT_SETTINGS, PALETTES, PRESETS, getEligibleWords, normaliseSettings } from '../game';
import { buildLetterHeatMap, createEmptyStats, topConfusions, trickiestLetters } from '../stats';
import { LOCALE_OPTIONS, formatMessage, getLocale } from '../locales';
import { CREDITS } from '../credits';
import packageInfo from '../../package.json';

const EMPTY_STATS = createEmptyStats();
const NUMBER_OPTIONS = Array.from({ length: 13 }, (_, index) => index + 2);
const ROUND_OPTIONS = [3, 5, 8, 10, 12, 15, 20];
const PALETTE_MESSAGE_KEYS = Object.freeze({
  sunshine: 'paletteSunshine',
  peach: 'palettePeach',
  mint: 'paletteMint',
});
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

function ClearProgressDialog({ copy, onCancel, onConfirm }) {
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
        aria-labelledby="clear-progress-title"
        aria-describedby="clear-progress-warning"
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      >
        <h3 id="clear-progress-title">{copy.clearProgressTitle}</h3>
        <p id="clear-progress-warning">{copy.clearProgressWarning}</p>
        <div className="confirmation-dialog__actions">
          <button type="button" className="text-button" onClick={onCancel}>
            {copy.clearProgressCancel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className="primary-button primary-button--small primary-button--danger"
            onClick={onConfirm}
          >
            {copy.clearProgressConfirm}
          </button>
        </div>
      </section>
    </div>
  );
}

function DeleteProfileDialog({ copy, name, onCancel, onConfirm }) {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    // Focus the safe choice: deleting takes a child's stars with it.
    cancelButtonRef.current?.focus();
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
        aria-labelledby="delete-profile-title"
        aria-describedby="delete-profile-warning"
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      >
        <h3 id="delete-profile-title">{formatMessage(copy.deleteProfileTitle, { name })}</h3>
        <p id="delete-profile-warning">{formatMessage(copy.deleteProfileWarning, { name })}</p>
        <div className="confirmation-dialog__actions">
          <button ref={cancelButtonRef} type="button" className="text-button" onClick={onCancel}>
            {copy.cancelName}
          </button>
          <button
            type="button"
            className="primary-button primary-button--small primary-button--danger"
            onClick={onConfirm}
          >
            {copy.deleteProfileConfirm}
          </button>
        </div>
      </section>
    </div>
  );
}

function SwitchRow({ checked, label, onChange }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export default function SettingsPanel({
  settings,
  stats = null,
  progress = null,
  profiles = null,
  onChange,
  onClose,
  onEraseProgress,
  onLocaleChange,
  onAddProfile,
  onDeleteProfile,
  onRenameProfile,
  onSelectProfile,
}) {
  const [customWords, setCustomWords] = useState(settings.customWords);
  const [pendingLocale, setPendingLocale] = useState(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [savedVisible, setSavedVisible] = useState(false);
  const closeButtonRef = useRef(null);
  const languageSelectRef = useRef(null);
  const customWordsTimerRef = useRef(null);
  const savedTimerRef = useRef(null);
  const copy = getLocale(settings.locale).messages;
  const eligibleSettings = useMemo(
    () => normaliseSettings({ ...settings, customWords }),
    [customWords, settings],
  );
  const eligibleCount = useMemo(() => getEligibleWords(eligibleSettings).length, [eligibleSettings]);
  const statsData = stats ?? EMPTY_STATS;
  const hasPlayData = statsData.totals.attempts > 0 || statsData.totals.wordsCompleted > 0;
  const trickyLetters = trickiestLetters(statsData);
  const heatMap = useMemo(() => buildLetterHeatMap(statsData), [statsData]);
  const confusions = useMemo(() => topConfusions(statsData), [statsData]);
  const activeProfile = profiles ? getActiveProfile(profiles) : null;
  const profileList = profiles?.profiles.filter((profile) => profile.name) ?? [];

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  useEffect(() => () => {
    window.clearTimeout(customWordsTimerRef.current);
    window.clearTimeout(savedTimerRef.current);
  }, []);

  const showSaved = () => {
    setSavedVisible(true);
    window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => setSavedVisible(false), 1200);
  };

  const applyChange = (partial) => {
    onChange(partial);
    showSaved();
  };

  const flushCustomWords = () => {
    window.clearTimeout(customWordsTimerRef.current);
    if (customWords !== settings.customWords) applyChange({ customWords });
  };

  const closePanel = () => {
    flushCustomWords();
    onClose();
  };

  const changeCustomWords = (value) => {
    setCustomWords(value);
    window.clearTimeout(customWordsTimerRef.current);
    customWordsTimerRef.current = window.setTimeout(() => {
      onChange({ customWords: value });
      showSaved();
    }, 500);
  };

  const applyPreset = (preset) => applyChange(preset.settings);

  const resetSettings = () => {
    const reset = normaliseSettings({ ...DEFAULT_SETTINGS, locale: settings.locale });
    setCustomWords(reset.customWords);
    applyChange(reset);
  };

  const cancelLanguageChange = () => {
    setPendingLocale(null);
    window.requestAnimationFrame(() => languageSelectRef.current?.focus());
  };

  const downloadData = () => {
    try {
      const payload = JSON.stringify({ stats: statsData, progress }, null, 2);
      const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `project-spell-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Downloading is a convenience; some embedded browsers block blob URLs.
    }
  };

  const confirmClearProgress = () => {
    onEraseProgress?.();
    setConfirmingClear(false);
  };

  return (
    <div className="settings-backdrop" role="presentation" onPointerDown={closePanel}>
      <section
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !pendingLocale && !confirmingClear && !pendingDelete) {
            closePanel();
          }
        }}
      >
        <header className="settings-panel__header">
          <div className="settings-panel__title-row">
            <h2 id="settings-title">
              {copy.settingsHeading} <small>{copy.settingsHeadingSuffix}</small>
            </h2>
            <span className={`saved-toast${savedVisible ? ' saved-toast--visible' : ''}`} role="status">
              {savedVisible ? copy.savedToast : ''}
            </span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button"
            onClick={closePanel}
            aria-label={copy.closeSettings}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="settings-panel__body">
          {profiles && (
            <fieldset className="settings-group settings-group--compact">
              <legend>{copy.groupProfiles}</legend>
              <ul className="profile-list">
                {profileList.map((profile) => (
                  <li
                    key={profile.id}
                    className={`profile-row${profile.id === activeProfile?.id ? ' profile-row--active' : ''}`}
                  >
                    <button
                      type="button"
                      className="profile-row__name"
                      aria-pressed={profile.id === activeProfile?.id}
                      aria-label={formatMessage(copy.switchProfile, { name: profile.name })}
                      onClick={() => onSelectProfile?.(profile.id)}
                    >
                      <NameTag name={profile.name} showEyes={settings.eyes} size="chip" />
                    </button>
                    <span className="profile-row__actions">
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => onRenameProfile?.(profile.id)}
                      >
                        {copy.renameProfile}
                      </button>
                      <button
                        type="button"
                        className="text-button text-button--danger"
                        onClick={() => setPendingDelete(profile)}
                        // The last remaining child has nowhere to go if they are deleted.
                        disabled={profileList.length < 2}
                      >
                        {copy.deleteProfile}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              {profiles.profiles.length < MAX_PROFILES && (
                <button type="button" className="text-button" onClick={() => onAddProfile?.()}>
                  {copy.addProfile}
                </button>
              )}
            </fieldset>
          )}

          <fieldset className="settings-group">
            <legend>{copy.groupGame}</legend>
            <label className="stacked-field">
              <span>{copy.language}</span>
              <select
                ref={languageSelectRef}
                value={pendingLocale ?? settings.locale}
                onChange={(event) => {
                  if (event.target.value !== settings.locale) setPendingLocale(event.target.value);
                }}
              >
                {LOCALE_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.flag} {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="mode-options" aria-label={copy.modeHeading}>
              {[
                ['easy', copy.modeEasyLabel, copy.modeEasyDescription],
                ['normal', copy.modeNormalLabel, copy.modeNormalDescription],
              ].map(([mode, label, description]) => (
                <label className="mode-option" key={mode}>
                  <input
                    type="radio"
                    name="gameMode"
                    value={mode}
                    checked={settings.gameMode === mode}
                    onChange={() => applyChange({ gameMode: mode })}
                  />
                  <span className="mode-option__copy">
                    <strong>{label}</strong>
                    <span>{description}</span>
                  </span>
                </label>
              ))}
            </div>
            {settings.gameMode === 'normal' && !settings.speech && (
              <small className="mode-note">{copy.modeNormalNeedsSpeech}</small>
            )}
          </fieldset>

          <fieldset className="settings-group">
            <legend>{copy.groupWords}</legend>
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

            <div className="field-grid">
              <label>
                <span>{copy.shortestWord}</span>
                <select value={settings.minLetters} onChange={(event) => applyChange({ minLetters: event.target.value })}>
                  {NUMBER_OPTIONS.slice(0, -2).map((number) => (
                    <option key={number} value={number}>
                      {formatMessage(copy.lettersOption, { count: number })}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{copy.longestWord}</span>
                <select value={settings.maxLetters} onChange={(event) => applyChange({ maxLetters: event.target.value })}>
                  {NUMBER_OPTIONS.filter((number) => number >= settings.minLetters).map((number) => (
                    <option key={number} value={number}>
                      {formatMessage(copy.lettersOption, { count: number })}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{copy.syllables}</span>
                <select value={settings.syllables} onChange={(event) => applyChange({ syllables: event.target.value })}>
                  <option value="any">{copy.anyNumber}</option>
                  <option value="1">{copy.one}</option>
                  <option value="2">{copy.two}</option>
                  <option value="3">{copy.three}</option>
                  <option value="4+">{copy.fourOrMore}</option>
                </select>
              </label>
              <label>
                <span>{copy.wordsInARow}</span>
                <select value={settings.roundLength} onChange={(event) => applyChange({ roundLength: event.target.value })}>
                  {ROUND_OPTIONS.map((number) => (
                    <option key={number} value={number}>
                      {formatMessage(copy.wordsOption, { count: number })}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="stacked-field">
              <span>{copy.wordList}</span>
              <textarea
                aria-label={copy.wordList}
                value={customWords}
                onChange={(event) => changeCustomWords(event.target.value)}
                onBlur={flushCustomWords}
                placeholder={copy.customWordsPlaceholder}
                rows="5"
                spellCheck="false"
              />
              <small>{copy.customWordsHelp}</small>
            </label>
            <label className="stacked-field">
              <span>{copy.chooseFrom}</span>
              <select value={settings.wordSource} onChange={(event) => applyChange({ wordSource: event.target.value })}>
                <option value="all">{copy.allWords}</option>
                <option value="custom">{copy.customWordsOnly}</option>
              </select>
            </label>
            <label className="toggle-row toggle-row--described">
              <span className="toggle-copy">
                <span>{copy.acceptUnaccented}</span>
                <small>{copy.acceptUnaccentedHelp}</small>
              </span>
              <input
                type="checkbox"
                aria-label={copy.acceptUnaccented}
                checked={settings.acceptUnaccented}
                onChange={(event) => applyChange({ acceptUnaccented: event.target.checked })}
              />
            </label>
            <label className="toggle-row toggle-row--described">
              <span className="toggle-copy">
                <span>{copy.adaptivePractice}</span>
                <small>{copy.adaptivePracticeHelp}</small>
              </span>
              <input
                type="checkbox"
                aria-label={copy.adaptivePractice}
                checked={settings.adaptivePractice}
                onChange={(event) => applyChange({ adaptivePractice: event.target.checked })}
              />
            </label>

            <div className={`filter-match${eligibleCount ? '' : ' filter-match--empty'}`}>
              <span>{copy.matchingFilters}</span>
              <strong>
                {eligibleCount
                  ? formatMessage(copy.matchPill, {
                      count: eligibleCount,
                      unit: eligibleCount === 1 ? copy.wordSingular : copy.wordPlural,
                    })
                  : copy.noWordsMatch}
              </strong>
            </div>
          </fieldset>

          <fieldset className="settings-group settings-group--compact">
            <legend>{copy.groupSound}</legend>
            <SwitchRow checked={settings.speech} label={copy.sayEachWord} onChange={(speech) => applyChange({ speech })} />
            <SwitchRow checked={settings.soundEffects} label={copy.soundEffects} onChange={(soundEffects) => applyChange({ soundEffects })} />
            <SwitchRow checked={settings.music} label={copy.backgroundMusic} onChange={(music) => applyChange({ music })} />
            <SwitchRow checked={settings.eyes} label={copy.cartoonEyes} onChange={(eyes) => applyChange({ eyes })} />

            <div className="palette-field">
              <span className="palette-field__label">{copy.background}</span>
              <div className="palette-swatches" role="radiogroup" aria-label={copy.background}>
                {PALETTES.map((palette) => (
                  <button
                    type="button"
                    key={palette}
                    className={`palette-swatch palette-swatch--${palette}${
                      settings.palette === palette ? ' palette-swatch--active' : ''
                    }`}
                    role="radio"
                    aria-checked={settings.palette === palette}
                    aria-label={copy[PALETTE_MESSAGE_KEYS[palette]]}
                    onClick={() => applyChange({ palette })}
                  />
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset className="settings-group settings-group--compact">
            <legend>{copy.groupProgress}</legend>
            {activeProfile?.name && (
              // Downloading and clearing act on one child only — say which one.
              <p className="profile-data-note">
                {formatMessage(copy.profileDataNote, { name: activeProfile.name })}
              </p>
            )}
            {hasPlayData ? (
              <ul className="progress-summary">
                <li>{formatMessage(copy.progressWordsPractised, { count: statsData.totals.wordsCompleted })}</li>
                <li>{formatMessage(copy.progressRoundsFinished, { count: statsData.totals.roundsCompleted })}</li>
                <li>{formatMessage(copy.progressPlayTime, { minutes: Math.round(statsData.totals.playMs / 60000) })}</li>
                {trickyLetters.length > 0 && (
                  <li>
                    {formatMessage(copy.progressTrickyLetters, {
                      letters: trickyLetters
                        .map((letter) => letter.toLocaleUpperCase(settings.locale))
                        .join(', '),
                    })}
                  </li>
                )}
              </ul>
            ) : (
              <p className="progress-empty">{copy.progressNoData}</p>
            )}
            {heatMap.length > 0 && (
              // Parent-facing only. Nothing here is ever shown to the child, and it stays
              // folded away so the panel does not turn into a dashboard.
              <details className="heat-map-section">
                <summary>{copy.letterHeatMap}</summary>
                <div className="heat-map-section__body">
                  <p className="heat-map__help">{copy.letterHeatMapHelp}</p>
                  <ul className="heat-map">
                    {heatMap.map((entry) => {
                      const percent = Math.round(entry.accuracy * 100);
                      return (
                        <li
                          key={entry.letter}
                          className="heat-map__cell"
                          data-band={percent >= 90 ? 'strong' : percent >= 75 ? 'mixed' : 'tricky'}
                          title={formatMessage(copy.letterAccuracy, {
                            letter: entry.letter.toLocaleUpperCase(settings.locale),
                            percent,
                            count: entry.attempts,
                          })}
                        >
                          <span className="heat-map__letter" aria-hidden="true">
                            {entry.letter.toLocaleUpperCase(settings.locale)}
                          </span>
                          <span className="sr-only">
                            {formatMessage(copy.letterAccuracy, {
                              letter: entry.letter.toLocaleUpperCase(settings.locale),
                              percent,
                              count: entry.attempts,
                            })}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {confusions.length > 0 && (
                    <>
                      <p className="heat-map__label">{copy.confusionsHeading}</p>
                      <ul className="confusion-list">
                        {confusions.map((confusion) => (
                          <li key={`${confusion.expected}-${confusion.typed}`}>
                            {formatMessage(copy.confusionPair, {
                              expected: confusion.expected.toLocaleUpperCase(settings.locale),
                              typed: confusion.typed.toLocaleUpperCase(settings.locale),
                            })}
                            {` ×${confusion.times}`}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="progress-actions">
              <button type="button" className="text-button" onClick={downloadData} disabled={!hasPlayData}>
                {copy.downloadData}
              </button>
              <button
                type="button"
                className="text-button text-button--danger"
                onClick={() => setConfirmingClear(true)}
                disabled={!hasPlayData}
              >
                {copy.clearProgress}
              </button>
            </div>

            <details className="about-section">
              <summary>{copy.aboutHeading}</summary>
              <div className="about-section__body">
                <p className="about-section__app">
                  <a href="https://github.com/tmrk/project-spell" target="_blank" rel="noreferrer">
                    {copy.projectName}
                  </a>{' '}
                  <span>v{packageInfo.version}</span>
                </p>
                <p className="about-section__label">{copy.aboutCredits}</p>
                <ul className="credits-list">
                  {CREDITS.map((credit) => (
                    <li key={credit.title}>
                      <a href={credit.source} target="_blank" rel="noreferrer">{credit.title}</a>
                      {' — '}{credit.author}, {credit.licence}
                    </li>
                  ))}
                </ul>
              </div>
            </details>

            <button type="button" className="text-button reset-settings" onClick={resetSettings}>
              {copy.resetAll}
            </button>
          </fieldset>
        </div>
      </section>

      {pendingLocale && (
        <LanguageChangeDialog
          copy={copy}
          onCancel={cancelLanguageChange}
          onConfirm={() => onLocaleChange(pendingLocale)}
        />
      )}

      {confirmingClear && (
        <ClearProgressDialog
          copy={copy}
          onCancel={() => setConfirmingClear(false)}
          onConfirm={confirmClearProgress}
        />
      )}

      {pendingDelete && (
        <DeleteProfileDialog
          copy={copy}
          name={pendingDelete.name}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            onDeleteProfile?.(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}
