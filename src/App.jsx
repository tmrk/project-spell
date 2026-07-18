import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Letter from './components/Letter';
import SettingsPanel from './components/SettingsPanel';
import { MusicIcon, RepeatIcon, SettingsIcon } from './components/Icons';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  createRound,
  normaliseSettings,
} from './game';
import croc from './assets/croc.svg';
import bgMusic from './sounds/bgmusic.mp3';
import doneSfx from './sounds/done.mp3';
import popSfx from './sounds/pop.mp3';
import badSfx from './sounds/bad.mp3';
import './App.scss';

const CORRECT_MESSAGES = ['Nice!', 'Yes!', 'Great!', 'You got it!'];

function loadSettings() {
  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    return stored ? normaliseSettings(JSON.parse(stored)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function useSpeech(enabled) {
  const voiceRef = useRef(null);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return undefined;

    const chooseVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current =
        voices.find((voice) => voice.lang === 'en-GB' && /female|serena|samantha|kate/iu.test(voice.name)) ??
        voices.find((voice) => voice.lang === 'en-GB') ??
        voices.find((voice) => voice.lang.startsWith('en')) ??
        null;
    };

    chooseVoice();
    window.speechSynthesis.addEventListener?.('voiceschanged', chooseVoice);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', chooseVoice);
  }, []);

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  const say = useCallback(
    (text, options = {}) => {
      if (!enabled || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;

      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      utterance.voice = voiceRef.current;
      utterance.rate = options.rate ?? 0.82;
      utterance.pitch = options.pitch ?? 1.04;
      window.speechSynthesis.speak(utterance);
    },
    [enabled],
  );

  return { cancel, say };
}

function useGameAudio(soundEffectsEnabled) {
  const musicRef = useRef(null);
  const effectsRef = useRef(new Set());
  const [musicIsPlaying, setMusicIsPlaying] = useState(false);

  useEffect(() => {
    const music = new Audio(bgMusic);
    const activeEffects = effectsRef.current;
    music.loop = true;
    music.preload = 'auto';
    music.volume = 0.12;
    musicRef.current = music;
    return () => {
      music.pause();
      activeEffects.forEach((sound) => sound.pause());
      activeEffects.clear();
      musicRef.current = null;
    };
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
    (source, volume = 0.7) => {
      if (!soundEffectsEnabled) return;
      const sound = new Audio(source);
      sound.volume = volume;
      effectsRef.current.add(sound);
      const release = () => effectsRef.current.delete(sound);
      sound.addEventListener?.('ended', release, { once: true });
      sound.addEventListener?.('error', release, { once: true });
      sound.play().catch(release);
    },
    [soundEffectsEnabled],
  );

  return { musicIsPlaying, pauseMusic, playEffect, playMusic };
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
  const [isTransitioning, setIsTransitioning] = useState(false);

  const inputRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const advanceTimerRef = useRef(null);
  const transitioningRef = useRef(false);
  const currentWord = roundWords[wordIndex] ?? '';

  const { cancel: cancelSpeech, say } = useSpeech(settings.speech);
  const { musicIsPlaying, pauseMusic, playEffect, playMusic } = useGameAudio(settings.soundEffects);

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // The game still works when browser storage is unavailable.
    }
  }, [settings]);

  useEffect(() => {
    if (!settings.music) pauseMusic();
  }, [pauseMusic, settings.music]);

  useEffect(() => {
    if (phase !== 'playing' || !currentWord || settingsOpen) return undefined;
    const timer = window.setTimeout(() => say(`Spell the word ${currentWord}`), 120);
    return () => window.clearTimeout(timer);
  }, [currentWord, phase, say, settingsOpen]);

  useEffect(() => {
    if (phase !== 'playing' || settingsOpen) return undefined;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [letterIndex, phase, settingsOpen, wordIndex]);

  useEffect(
    () => () => {
      window.clearTimeout(feedbackTimerRef.current);
      window.clearTimeout(advanceTimerRef.current);
      cancelSpeech();
    },
    [cancelSpeech],
  );

  const progress = useMemo(() => {
    if (!roundWords.length || !currentWord) return 0;
    const currentWordProgress = Math.min(letterIndex / currentWord.length, 1);
    return ((wordIndex + currentWordProgress) / roundWords.length) * 100;
  }, [currentWord, letterIndex, roundWords.length, wordIndex]);

  const focusInput = useCallback(() => {
    if (phase === 'playing' && !settingsOpen) inputRef.current?.focus({ preventScroll: true });
  }, [phase, settingsOpen]);

  const clearRoundTimers = useCallback(() => {
    window.clearTimeout(feedbackTimerRef.current);
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
    setIsTransitioning(false);
    setPhase('playing');
    if (settings.music) playMusic();
  }, [clearRoundTimers, playMusic, settings]);

  const repeatWord = useCallback(() => {
    if (currentWord) say(`Spell the word ${currentWord}`);
    focusInput();
  }, [currentWord, focusInput, say]);

  const speakLetter = useCallback(
    (letter) => {
      say(letter.toLowerCase(), { rate: 0.65, pitch: 1.08 });
      window.requestAnimationFrame(focusInput);
    },
    [focusInput, say],
  );

  const resetFeedbackSoon = useCallback((delay = 260) => {
    window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback('idle');
      setFeedbackMessage('');
    }, delay);
  }, []);

  const completeWord = useCallback(() => {
    const isLastWord = wordIndex === roundWords.length - 1;
    if (isLastWord) {
      setFeedback('idle');
      setFeedbackMessage('');
      setPhase('complete');
      setIsTransitioning(false);
      transitioningRef.current = false;
      pauseMusic();
      playEffect(doneSfx, 0.75);
      say('Amazing! You finished the round!');
      return;
    }

    setWordIndex((index) => index + 1);
    setLetterIndex(0);
    setFeedback('idle');
    setFeedbackMessage('');
    setIsTransitioning(false);
    transitioningRef.current = false;
  }, [pauseMusic, playEffect, roundWords.length, say, wordIndex]);

  const handleAttempt = useCallback(
    (value) => {
      if (phase !== 'playing' || !currentWord || transitioningRef.current) return;

      const attempts = [...value.toLowerCase()].filter((character) => /[a-z]/u.test(character));
      if (!attempts.length) return;

      let nextLetterIndex = letterIndex;
      for (const attempt of attempts) {
        const expected = currentWord[nextLetterIndex]?.toLowerCase();
        if (attempt !== expected) {
          if (nextLetterIndex !== letterIndex) setLetterIndex(nextLetterIndex);
          setMistakes((count) => count + 1);
          setFeedback('error');
          setFeedbackMessage('Try once more');
          playEffect(badSfx, 0.55);
          resetFeedbackSoon(360);
          return;
        }

        nextLetterIndex += 1;
        if (nextLetterIndex === currentWord.length) break;
      }

      playEffect(popSfx, 0.7);
      setFeedback('success');
      setFeedbackMessage(CORRECT_MESSAGES[(nextLetterIndex - 1) % CORRECT_MESSAGES.length]);

      if (nextLetterIndex === currentWord.length) {
        transitioningRef.current = true;
        setIsTransitioning(true);
        setLetterIndex(currentWord.length);
        setFeedbackMessage('That’s the word!');
        window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = window.setTimeout(completeWord, 700);
      } else {
        setLetterIndex(nextLetterIndex);
        resetFeedbackSoon();
      }
    },
    [completeWord, currentWord, letterIndex, phase, playEffect, resetFeedbackSoon],
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
      if (!/^[a-z]$/iu.test(event.key)) return;
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
    setIsTransitioning(false);
    setPhase('welcome');
    setSettingsOpen(false);
  };

  return (
    <div className="app" data-feedback={feedback} data-phase={phase}>
      <header className="app-controls" aria-label="Game controls">
        {phase === 'playing' && (
          <button type="button" className="icon-button" onClick={repeatWord} aria-label="Hear the word again">
            <RepeatIcon />
          </button>
        )}
        <button
          type="button"
          className="icon-button"
          onClick={toggleMusic}
          aria-label={settings.music && musicIsPlaying ? 'Turn music off' : 'Turn music on'}
        >
          <MusicIcon muted={!settings.music || !musicIsPlaying} />
        </button>
        <button type="button" className="icon-button" onClick={openSettings} aria-label="Open grown-ups settings">
          <SettingsIcon />
        </button>
      </header>

      {phase === 'welcome' && (
        <main className="welcome-screen">
          <img className="welcome-croc" src={croc} alt="" />
          <p className="eyebrow">Project Spell</p>
          <h1>Ready to spell?</h1>
          <p className="welcome-screen__hint">Listen, then type one letter at a time.</p>
          <button type="button" className="primary-button" onClick={startRound}>
            Play
          </button>
        </main>
      )}

      {phase === 'playing' && (
        <main className="play-screen" onClick={focusInput}>
          <div className="round-progress" aria-label={`Word ${wordIndex + 1} of ${roundWords.length}`}>
            <span className="round-progress__count">{wordIndex + 1} / {roundWords.length}</span>
            <div className="round-progress__track">
              <div className="round-progress__value" style={{ width: `${progress}%` }}>
                <img src={croc} alt="" />
              </div>
            </div>
          </div>

          <div
            className="word"
            style={{
              '--letter-count': currentWord.length,
              '--letter-size': `${Math.min(12, 80 / currentWord.length)}vw`,
            }}
            aria-label={`${currentWord.length} letter word`}
          >
            {[...currentWord].map((letter, index) => (
              <Letter
                key={`${currentWord}-${index}`}
                letter={letter}
                state={index < letterIndex ? 'done' : index === letterIndex ? 'active' : 'waiting'}
                onSpeak={speakLetter}
              />
            ))}
          </div>

          <p className={`game-hint${feedbackMessage ? ' game-hint--visible' : ''}`} aria-hidden="true">
            {feedbackMessage || (isTransitioning ? 'That’s the word!' : 'Type the next letter')}
          </p>

          <input
            ref={inputRef}
            className="typing-input"
            type="text"
            inputMode="text"
            aria-label="Type the next letter"
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
          <p className="eyebrow">Round complete</p>
          <h1>Brilliant spelling!</h1>
          <p>
            {roundWords.length} words finished{mistakes === 0 ? ' — all first try.' : '.'}
          </p>
          <button type="button" className="primary-button" onClick={startRound}>
            Play again
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
