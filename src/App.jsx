import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Letter from './components/Letter';
import SettingsPanel from './components/SettingsPanel';
import { MusicIcon, RepeatIcon, SettingsIcon } from './components/Icons';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  createRound,
  lettersMatch,
  normaliseSettings,
} from './game';
import { LOCALE_OPTIONS, detectDefaultLocale, formatMessage, getLocale } from './locales';
import croc from './assets/croc.svg';
import bgMusic from './sounds/bgmusic.mp3';
import doneSfx from './sounds/done.mp3';
import popSfx from './sounds/pop.mp3';
import badSfx from './sounds/bad.mp3';
import './App.scss';

const WORD_COMPLETION_PAUSE = 120;

function loadSettings() {
  const detectedLocale = detectDefaultLocale();

  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    return stored
      ? normaliseSettings({ locale: detectedLocale, ...JSON.parse(stored) })
      : normaliseSettings({ ...DEFAULT_SETTINGS, locale: detectedLocale });
  } catch {
    return normaliseSettings({ ...DEFAULT_SETTINGS, locale: detectedLocale });
  }
}

function useSpeech(enabled, locale) {
  const voiceRef = useRef(null);
  const { code, voiceNamePattern } = getLocale(locale);

  useEffect(() => {
    voiceRef.current = null;
    if (!('speechSynthesis' in window)) return undefined;

    const chooseVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const normalisedCode = code.toLowerCase();
      const language = normalisedCode.split('-')[0];
      const languageVoices = voices.filter(
        (voice) => voice.lang?.replace('_', '-').toLowerCase().split('-')[0] === language,
      );
      const regionalVoices = languageVoices.filter(
        (voice) => voice.lang?.replace('_', '-').toLowerCase() === normalisedCode,
      );
      voiceRef.current =
        regionalVoices.find((voice) => voiceNamePattern.test(voice.name)) ??
        regionalVoices[0] ??
        languageVoices.find((voice) => voiceNamePattern.test(voice.name)) ??
        languageVoices[0] ??
        null;
    };

    chooseVoice();
    window.speechSynthesis.addEventListener?.('voiceschanged', chooseVoice);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', chooseVoice);
  }, [code, voiceNamePattern]);

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  const say = useCallback(
    (text, options = {}) => {
      if (!enabled || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;

      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = code;
      utterance.voice = voiceRef.current;
      utterance.rate = options.rate ?? 0.82;
      utterance.pitch = options.pitch ?? 1.04;
      window.speechSynthesis.speak(utterance);
    },
    [code, enabled],
  );

  return { cancel, say };
}

function useGameAudio(soundEffectsEnabled) {
  const musicRef = useRef(null);
  const effectsRef = useRef(new Map());
  const audioContextRef = useRef(null);
  const effectBuffersRef = useRef(new Map());
  const activeBufferSourcesRef = useRef(new Set());
  const [musicIsPlaying, setMusicIsPlaying] = useState(false);

  useEffect(() => {
    const music = new Audio(bgMusic);
    const effectSources = [popSfx, badSfx, doneSfx];
    const effectBuffers = effectBuffersRef.current;
    const activeBufferSources = activeBufferSourcesRef.current;
    const effects = new Map(
      effectSources.map((source) => {
        const sound = new Audio(source);
        sound.preload = 'auto';
        sound.load?.();
        return [source, { cancelFinish: null, sound }];
      }),
    );
    music.loop = true;
    music.preload = 'auto';
    music.volume = 0.12;
    musicRef.current = music;
    effectsRef.current = effects;

    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    let context = null;
    let cancelled = false;
    if (AudioContextClass) {
      try {
        context = new AudioContextClass({ latencyHint: 'interactive' });
      } catch {
        try {
          context = new AudioContextClass();
        } catch {
          context = null;
        }
      }
    }

    if (context) {
      audioContextRef.current = context;
      effectSources.forEach(async (source) => {
        try {
          const response = await fetch(source);
          if (!response.ok) return;
          const buffer = await response.arrayBuffer();
          const decoded = await context.decodeAudioData(buffer);
          if (!cancelled) effectBuffers.set(source, decoded);
        } catch {
          // The preloaded HTMLAudioElement remains a safe fallback.
        }
      });
    }

    return () => {
      cancelled = true;
      music.pause();
      effects.forEach((effect) => {
        effect.cancelFinish?.();
        effect.sound.pause();
      });
      activeBufferSources.forEach((effect) => {
        effect.cancelFinish();
        try {
          effect.source.stop();
        } catch {
          // The source may already have stopped naturally.
        }
      });
      activeBufferSources.clear();
      effectBuffers.clear();
      effects.clear();
      musicRef.current = null;
      audioContextRef.current = null;
      try {
        const closeContext = context?.close?.();
        closeContext?.catch?.(() => {});
      } catch {
        // Closing audio is best-effort during teardown.
      }
    };
  }, []);

  const primeEffects = useCallback(() => {
    const context = audioContextRef.current;
    if (!context || context.state === 'running' || context.state === 'closed') return;
    try {
      const resume = context.resume();
      resume?.catch?.(() => {});
    } catch {
      // Effects will fall back to HTMLAudioElement playback.
    }
  }, []);

  const playMusic = useCallback(() => {
    const promise = musicRef.current?.play();
    if (promise) {
      promise.then(() => setMusicIsPlaying(true)).catch(() => setMusicIsPlaying(false));
    } else if (musicRef.current) {
      setMusicIsPlaying(true);
    }
  }, []);

  const pauseMusic = useCallback(() => {
    musicRef.current?.pause();
    setMusicIsPlaying(false);
  }, []);

  const playEffect = useCallback(
    (source, volume = 0.7, onFinished) => {
      if (!soundEffectsEnabled) {
        onFinished?.();
        return;
      }

      const playFallback = () => {
        const effect = effectsRef.current.get(source);
        if (!effect) {
          onFinished?.();
          return;
        }

        const { sound } = effect;
        effect.cancelFinish?.();
        effect.cancelFinish = null;
        sound.pause();
        try {
          sound.currentTime = 0;
        } catch {
          // Some browsers do not expose currentTime until metadata is ready.
        }
        sound.volume = volume;

        let finish = null;
        if (onFinished) {
          let finished = false;
          finish = () => {
            if (finished) return;
            finished = true;
            sound.removeEventListener?.('ended', finish);
            sound.removeEventListener?.('error', finish);
            effect.cancelFinish = null;
            onFinished();
          };
          effect.cancelFinish = () => {
            finished = true;
            sound.removeEventListener?.('ended', finish);
            sound.removeEventListener?.('error', finish);
          };
          sound.addEventListener?.('ended', finish, { once: true });
          sound.addEventListener?.('error', finish, { once: true });
        }

        try {
          const playback = sound.play();
          playback?.catch(finish ?? (() => {}));
        } catch {
          finish?.();
        }
      };

      const playBuffer = () => {
        const context = audioContextRef.current;
        const buffer = effectBuffersRef.current.get(source);
        if (!context || !buffer || context.state !== 'running') return false;

        try {
          const bufferSource = context.createBufferSource();
          const gain = context.createGain();
          bufferSource.buffer = buffer;
          gain.gain.value = volume;
          bufferSource.connect(gain);
          gain.connect(context.destination);

          let finished = false;
          let effect = null;
          const cancelFinish = () => {
            if (finished) return;
            finished = true;
            bufferSource.removeEventListener?.('ended', finish);
            activeBufferSourcesRef.current.delete(effect);
            bufferSource.disconnect?.();
            gain.disconnect?.();
          };
          const finish = () => {
            if (finished) return;
            cancelFinish();
            onFinished?.();
          };
          effect = { source: bufferSource, cancelFinish };
          bufferSource.addEventListener?.('ended', finish, { once: true });
          activeBufferSourcesRef.current.add(effect);
          try {
            bufferSource.start();
          } catch {
            cancelFinish();
            return false;
          }
          return true;
        } catch {
          return false;
        }
      };

      const context = audioContextRef.current;
      if (
        context &&
        context.state !== 'running' &&
        context.state !== 'closed' &&
        effectBuffersRef.current.has(source)
      ) {
        try {
          const resume = context.resume();
          if (resume?.then) {
            resume.then(() => {
              if (!playBuffer()) playFallback();
            }).catch(playFallback);
            return;
          }
        } catch {
          playFallback();
          return;
        }
      }

      if (!playBuffer()) playFallback();
    },
    [soundEffectsEnabled],
  );

  return { musicIsPlaying, pauseMusic, playEffect, playMusic, primeEffects };
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [phase, setPhase] = useState('welcome');
  const [roundWords, setRoundWords] = useState([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [letterIndex, setLetterIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const inputRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const feedbackColorTimerRef = useRef(null);
  const advanceTimerRef = useRef(null);
  const transitioningRef = useRef(false);
  const lastPraiseIndexRef = useRef(-1);
  const appRef = useRef(null);
  const currentWord = roundWords[wordIndex] ?? '';
  const currentWordLetters = useMemo(() => [...currentWord], [currentWord]);
  const locale = getLocale(settings.locale);
  const copy = locale.messages;

  const { cancel: cancelSpeech, say } = useSpeech(settings.speech, settings.locale);
  const { musicIsPlaying, pauseMusic, playEffect, playMusic, primeEffects } = useGameAudio(
    settings.soundEffects,
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // The game still works when browser storage is unavailable.
    }
  }, [settings]);

  useEffect(() => {
    document.documentElement.lang = locale.code;
  }, [locale.code]);

  useEffect(() => {
    if (!settings.music) pauseMusic();
  }, [pauseMusic, settings.music]);

  useEffect(() => {
    if (phase !== 'playing' || !currentWord || settingsOpen) return undefined;
    say(formatMessage(copy.spellPrompt, { word: currentWord }));
    return undefined;
  }, [copy.spellPrompt, currentWord, phase, say, settingsOpen, wordIndex]);

  useEffect(() => {
    if (phase !== 'playing' || settingsOpen) return undefined;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [letterIndex, phase, settingsOpen, wordIndex]);

  useEffect(
    () => () => {
      window.clearTimeout(feedbackTimerRef.current);
      window.clearTimeout(feedbackColorTimerRef.current);
      window.clearTimeout(advanceTimerRef.current);
      cancelSpeech();
    },
    [cancelSpeech],
  );

  const progress = useMemo(() => {
    if (!roundWords.length || !currentWord) return 0;
    const currentWordProgress = Math.min(letterIndex / currentWordLetters.length, 1);
    return ((wordIndex + currentWordProgress) / roundWords.length) * 100;
  }, [currentWord, currentWordLetters.length, letterIndex, roundWords.length, wordIndex]);

  const focusInput = useCallback(() => {
    if (phase === 'playing' && !settingsOpen) inputRef.current?.focus({ preventScroll: true });
  }, [phase, settingsOpen]);

  const clearRoundTimers = useCallback(() => {
    window.clearTimeout(feedbackTimerRef.current);
    window.clearTimeout(feedbackColorTimerRef.current);
    window.clearTimeout(advanceTimerRef.current);
  }, []);

  const startRound = useCallback(() => {
    const words = createRound(settings);
    if (!words.length) {
      setSettingsOpen(true);
      return;
    }

    clearRoundTimers();
    transitioningRef.current = false;
    setRoundWords(words);
    setWordIndex(0);
    setLetterIndex(0);
    setMistakes(0);
    setFeedback('idle');
    setFeedbackMessage('');
    setPhase('playing');
    primeEffects();
    if (settings.music) playMusic();
  }, [clearRoundTimers, playMusic, primeEffects, settings]);

  const repeatWord = useCallback(() => {
    if (currentWord) say(formatMessage(copy.spellPrompt, { word: currentWord }));
    focusInput();
  }, [copy.spellPrompt, currentWord, focusInput, say]);

  const speakLetter = useCallback(
    (letter) => {
      say(letter.toLowerCase(), { rate: 0.65, pitch: 1.08 });
      window.requestAnimationFrame(focusInput);
    },
    [focusInput, say],
  );

  const resetFeedbackSoon = useCallback((messageDelay = 1000, colorDelay = 150) => {
    window.clearTimeout(feedbackTimerRef.current);
    window.clearTimeout(feedbackColorTimerRef.current);
    feedbackColorTimerRef.current = window.setTimeout(() => {
      setFeedback('idle');
    }, colorDelay);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackMessage('');
    }, messageDelay);
  }, []);

  const signalFeedback = useCallback((nextFeedback) => {
    // Let CSS react within the key event; state keeps React's rendered value in sync.
    appRef.current?.setAttribute('data-feedback', nextFeedback);
    setFeedback(nextFeedback);
  }, []);

  const completeWord = useCallback(() => {
    const isLastWord = wordIndex === roundWords.length - 1;
    if (isLastWord) {
      signalFeedback('idle');
      setFeedbackMessage('');
      setPhase('complete');
      transitioningRef.current = false;
      pauseMusic();
      const praises = copy.roundFinishedSpeeches;
      let praiseIndex = Math.floor(Math.random() * praises.length);
      if (praises.length > 1 && praiseIndex === lastPraiseIndexRef.current) {
        praiseIndex = (praiseIndex + 1) % praises.length;
      }
      lastPraiseIndexRef.current = praiseIndex;
      say(praises[praiseIndex]);
      return;
    }

    setWordIndex((index) => index + 1);
    setLetterIndex(0);
    signalFeedback('idle');
    setFeedbackMessage('');
    transitioningRef.current = false;
  }, [copy.roundFinishedSpeeches, pauseMusic, roundWords.length, say, signalFeedback, wordIndex]);

  const handleAttempt = useCallback(
    (value) => {
      if (phase !== 'playing' || !currentWord || transitioningRef.current) return;

      const attempts = [
        ...value.normalize('NFC').toLocaleLowerCase(locale.code),
      ].filter((character) => /\p{L}/u.test(character));
      if (!attempts.length) return;

      let nextLetterIndex = letterIndex;
      for (const attempt of attempts) {
        const expected = currentWordLetters[nextLetterIndex];
        if (!lettersMatch(expected, attempt, settings.acceptUnaccented)) {
          signalFeedback('error');
          playEffect(badSfx, 0.55);

          if (nextLetterIndex !== letterIndex) setLetterIndex(nextLetterIndex);
          setMistakes((count) => count + 1);
          setFeedbackMessage(copy.tryAgain);
          resetFeedbackSoon();
          return;
        }

        nextLetterIndex += 1;
        if (nextLetterIndex === currentWordLetters.length) break;
      }

      const wordIsComplete = nextLetterIndex === currentWordLetters.length;
      signalFeedback('success');
      setFeedbackMessage(copy.correctMessages[(nextLetterIndex - 1) % copy.correctMessages.length]);
      resetFeedbackSoon();

      if (wordIsComplete) {
        transitioningRef.current = true;
        setLetterIndex(currentWordLetters.length);
        setFeedbackMessage(copy.wordFinished);
        window.clearTimeout(advanceTimerRef.current);
        cancelSpeech();

        if (wordIndex === roundWords.length - 1) {
          playEffect(doneSfx, 0.8, () => {
            advanceTimerRef.current = window.setTimeout(completeWord, WORD_COMPLETION_PAUSE);
          });
        } else {
          playEffect(doneSfx, 0.8);
          completeWord();
        }
      } else {
        playEffect(popSfx, 0.7);
        setLetterIndex(nextLetterIndex);
      }
    },
    [
      completeWord,
      cancelSpeech,
      copy,
      currentWord,
      currentWordLetters,
      letterIndex,
      locale.code,
      phase,
      playEffect,
      resetFeedbackSoon,
      roundWords.length,
      signalFeedback,
      settings.acceptUnaccented,
      wordIndex,
    ],
  );

  const handleInput = useCallback(
    (event) => {
      const value = event.currentTarget.value;
      event.currentTarget.value = '';
      handleAttempt(value);
    },
    [handleAttempt],
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (!/^\p{L}$/u.test(event.key)) return;
      event.preventDefault();
      event.currentTarget.value = '';
      handleAttempt(event.key);
    },
    [handleAttempt],
  );

  const toggleMusic = () => {
    const nextMusic = !musicIsPlaying;
    setSettings((current) => ({ ...current, music: nextMusic }));
    if (nextMusic) playMusic();
    else pauseMusic();
    focusInput();
  };

  const openSettings = () => {
    cancelSpeech();
    pauseMusic();
    setSettingsOpen(true);
  };

  const closeSettings = () => {
    setSettingsOpen(false);
    if (phase === 'playing' && settings.music) playMusic();
  };

  const saveSettings = (nextSettings) => {
    clearRoundTimers();
    cancelSpeech();
    pauseMusic();
    transitioningRef.current = false;
    setSettings(nextSettings);
    setRoundWords([]);
    setWordIndex(0);
    setLetterIndex(0);
    setFeedback('idle');
    setFeedbackMessage('');
    setPhase('welcome');
    setSettingsOpen(false);
  };

  const changeWelcomeLanguage = (event) => {
    setSettings((current) => normaliseSettings({ ...current, locale: event.target.value }));
  };

  const letterLabels = {
    completed: copy.letterCompleted,
    current: copy.letterCurrent,
    next: copy.letterNext,
    template: copy.letterLabel,
  };

  return (
    <div ref={appRef} className="app" data-feedback={feedback} data-phase={phase}>
      <header className="app-controls" aria-label={copy.appControls}>
        {phase === 'playing' && (
          <button type="button" className="icon-button" onClick={repeatWord} aria-label={copy.hearAgain}>
            <RepeatIcon />
          </button>
        )}
        <button
          type="button"
          className="icon-button"
          onClick={toggleMusic}
          aria-label={settings.music && musicIsPlaying ? copy.turnMusicOff : copy.turnMusicOn}
        >
          <MusicIcon muted={!settings.music || !musicIsPlaying} />
        </button>
        <button type="button" className="icon-button" onClick={openSettings} aria-label={copy.openSettings}>
          <SettingsIcon />
        </button>
      </header>

      {phase === 'welcome' && (
        <main className="welcome-screen">
          <img className="welcome-croc" src={croc} alt="" />
          <p className="eyebrow">{copy.projectName}</p>
          <button type="button" className="primary-button welcome-play-button" onClick={startRound}>
            {copy.play}
          </button>
          <div className="welcome-language">
            <select
              aria-label={copy.language}
              value={settings.locale}
              onChange={changeWelcomeLanguage}
            >
              {LOCALE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.flag} {option.label}
                </option>
              ))}
            </select>
          </div>
        </main>
      )}

      {phase === 'playing' && (
        <main className="play-screen" onClick={focusInput}>
          <div
            className="round-progress"
            aria-label={formatMessage(copy.progress, { current: wordIndex + 1, total: roundWords.length })}
          >
            <span className="round-progress__count">
              {formatMessage(copy.progressCount, { current: wordIndex + 1, total: roundWords.length })}
            </span>
            <div className="round-progress__track">
              <div className="round-progress__value" style={{ width: `${progress}%` }}>
                <img src={croc} alt="" />
              </div>
            </div>
          </div>

          <div
            className="word"
            style={{
              '--letter-count': currentWordLetters.length,
              '--letter-size': `${Math.min(15, 94 / currentWordLetters.length)}vw`,
            }}
            aria-label={formatMessage(copy.letterWord, { count: currentWordLetters.length })}
          >
            {currentWordLetters.map((letter, index) => (
              <Letter
                key={`${currentWord}-${index}`}
                letter={letter}
                state={index < letterIndex ? 'done' : index === letterIndex ? 'active' : 'waiting'}
                onSpeak={speakLetter}
                showEyes={settings.eyes}
                labels={letterLabels}
              />
            ))}
          </div>

          {feedbackMessage && (
            <p className="game-hint" aria-hidden="true">
              {feedbackMessage}
            </p>
          )}

          <input
            ref={inputRef}
            className="typing-input"
            type="text"
            inputMode="text"
            aria-label={copy.typeNextLetter}
            defaultValue=""
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
          />
        </main>
      )}

      {phase === 'complete' && (
        <main className="complete-screen">
          <div className="complete-screen__mark" aria-hidden="true">✓</div>
          <p className="eyebrow">{copy.roundComplete}</p>
          <h1>{copy.completeHeading}</h1>
          <p>
            {formatMessage(copy.completeSummary, {
              count: roundWords.length,
              perfect: mistakes === 0 ? copy.completePerfect : '.',
            })}
          </p>
          <button type="button" className="primary-button" onClick={startRound}>
            {copy.playAgain}
          </button>
        </main>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {feedbackMessage}
      </p>

      {settingsOpen && (
        <SettingsPanel settings={settings} onClose={closeSettings} onSave={saveSettings} />
      )}
    </div>
  );
}
