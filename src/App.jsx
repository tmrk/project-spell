import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Letter from './components/Letter';
import BookTab from './components/BookTab';
import CelebrationConfetti from './components/CelebrationConfetti';
import JourneyStrip from './components/JourneyStrip';
import NameDialog from './components/NameDialog';
import NameTag from './components/NameTag';
import Scenery from './components/Scenery';
import SettingsPanel from './components/SettingsPanel';
import StarJarChip from './components/StarJarChip';
import StarTrail from './components/StarTrail';
import StickerBook, { BADGE_LABEL_KEYS, StickerPicture } from './components/StickerBook';
import Wordmark from './components/Wordmark';
import { MusicIcon, RepeatIcon, SettingsIcon, StarIcon } from './components/Icons';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  createAdaptiveRound,
  createReviewRound,
  createRound,
  lettersMatch,
  normaliseSettings,
} from './game';
import {
  STATS_KEY,
  createEmptyStats,
  normaliseStats,
  recordAttempt,
  recordRoundCompleted,
  recordWordCompleted,
  starsForRound,
  starsForWord,
  summariseForSelection,
} from './stats';
import {
  PROGRESS_KEY,
  SUPER_ROUND_EVERY,
  addBadges,
  addShinySticker,
  addSticker,
  addStars,
  celebratePages,
  createEmptyProgress,
  isSuperRoundNext,
  newBadges,
  normaliseProgress,
  pickShinyAward,
  pickStickerAward,
  recordRoundInCycle,
} from './progress';
import {
  MAX_PROFILES,
  PROFILES_KEY,
  createEmptyProfiles,
  createProfile,
  getActiveProfile,
  normaliseProfiles,
  profileStorageKey,
  removeProfile,
  renameProfile,
  selectProfile,
} from './profiles';
import { getStickerDetails } from './stickers/map';
import {
  LOCALE_OPTIONS,
  detectDefaultLocale,
  formatMessage,
  getLetterSpeechText,
  getLocale,
} from './locales';
import croc from './assets/croc.svg';
import bgMusic2 from './sounds/bgmusic2.mp3';
import bgMusic3 from './sounds/bgmusic3.mp3';
import townThemeMusic from './sounds/town-theme.mp3';
import doneSfx from './sounds/done.mp3';
import fanfareSfx from './sounds/fanfare.mp3';
import popSfx from './sounds/pop.mp3';
import badSfx from './sounds/bad.mp3';
import star1Sfx from './sounds/star1.mp3';
import star2Sfx from './sounds/star2.mp3';
import star3Sfx from './sounds/star3.mp3';
import './App.scss';

const WORD_COMPLETION_PAUSE = 760;
// Adaptive practice needs a little history before it can weight anything sensibly;
// below this the child gets the plain random round (roadmap G6).
const ADAPTIVE_MIN_ATTEMPTS = 20;
const WORD_PRAISE_FALLBACK = 900;
const CONFETTI_DURATION = 700;
const MUSIC_VOLUME = 0.12;
const MUSIC_DUCKED_VOLUME = 0.05;
const TRACKS = Object.freeze([townThemeMusic, bgMusic2, bgMusic3]);
const ROUND_SETTING_KEYS = Object.freeze([
  'locale',
  'gameMode',
  'minLetters',
  'maxLetters',
  'syllables',
  'roundLength',
  'wordSource',
  'customWords',
  'acceptUnaccented',
]);

const emptyRoundReward = () => ({
  badge: null,
  journeyPosition: 0,
  kind: 'normal',
  previousTotalStars: 0,
  shiny: null,
  stars: 0,
  sticker: null,
  totalStars: 0,
});

function pickVaried(list, lastIndexRef) {
  if (!Array.isArray(list) || list.length === 0) return '';
  let index = Math.floor(Math.random() * list.length);
  if (list.length > 1 && index === lastIndexRef.current) index = (index + 1) % list.length;
  lastIndexRef.current = index;
  return list[index];
}

function randomWordPraiseGap() {
  return Math.random() < 0.5 ? 2 : 3;
}

function loadProfiles() {
  try {
    const stored = window.localStorage.getItem(PROFILES_KEY);
    return stored ? normaliseProfiles(JSON.parse(stored)) : createEmptyProfiles();
  } catch {
    return createEmptyProfiles();
  }
}

// Every load and save below is scoped to one child (decision D-012). The first profile reads
// and writes the original un-suffixed keys, so a child who played before profiles existed
// simply keeps their stars.
function loadSettings(profileId) {
  const detectedLocale = detectDefaultLocale();

  try {
    const stored = window.localStorage.getItem(profileStorageKey(SETTINGS_KEY, profileId));
    return stored
      ? normaliseSettings({ locale: detectedLocale, ...JSON.parse(stored) })
      : normaliseSettings({ ...DEFAULT_SETTINGS, locale: detectedLocale });
  } catch {
    return normaliseSettings({ ...DEFAULT_SETTINGS, locale: detectedLocale });
  }
}

function loadStats(profileId) {
  try {
    const stored = window.localStorage.getItem(profileStorageKey(STATS_KEY, profileId));
    return stored ? normaliseStats(JSON.parse(stored)) : createEmptyStats();
  } catch {
    return createEmptyStats();
  }
}

function loadProgress(profileId) {
  try {
    const stored = window.localStorage.getItem(profileStorageKey(PROGRESS_KEY, profileId));
    return stored ? normaliseProgress(JSON.parse(stored)) : createEmptyProgress();
  } catch {
    return createEmptyProgress();
  }
}

function clearProfileStorage(profileId) {
  [SETTINGS_KEY, STATS_KEY, PROGRESS_KEY].forEach((baseKey) => {
    try {
      window.localStorage.removeItem(profileStorageKey(baseKey, profileId));
    } catch {
      // Nothing stored means nothing to erase.
    }
  });
}

function useSpeech(enabled, locale, setSpeechDucking) {
  const voiceRef = useRef(null);
  const activeFinishRef = useRef(null);
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
    activeFinishRef.current?.(false);
    window.speechSynthesis?.cancel();
  }, []);

  const say = useCallback(
    (text, options = {}) => {
      if (!enabled || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return false;

      activeFinishRef.current?.(false);
      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(text);
      const utteranceCode = options.locale ? getLocale(options.locale).code : code;
      utterance.lang = utteranceCode;
      utterance.voice = utteranceCode === code ? voiceRef.current : null;
      utterance.rate = options.rate ?? 0.82;
      utterance.pitch = options.pitch ?? 1.04;
      let finished = false;
      let fallbackTimer = null;
      const start = () => setSpeechDucking?.(true);
      const finish = (notify = true) => {
        if (finished) return;
        finished = true;
        window.clearTimeout(fallbackTimer);
        if (activeFinishRef.current === finish) activeFinishRef.current = null;
        setSpeechDucking?.(false);
        if (notify) options.onEnd?.();
      };
      utterance.onstart = start;
      utterance.onend = () => finish(true);
      utterance.onerror = () => finish(true);
      activeFinishRef.current = finish;
      start();
      fallbackTimer = window.setTimeout(
        () => finish(true),
        options.fallbackMs ?? Math.max(1200, String(text).length * 90),
      );
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        finish(true);
        return false;
      }
      return true;
    },
    [code, enabled, setSpeechDucking],
  );

  return { cancel, say };
}

function useGameAudio(soundEffectsEnabled) {
  const musicRef = useRef(null);
  const trackIndexRef = useRef(0);
  const effectsRef = useRef(new Map());
  const audioContextRef = useRef(null);
  const effectBuffersRef = useRef(new Map());
  const activeBufferSourcesRef = useRef(new Set());
  const [musicIsPlaying, setMusicIsPlaying] = useState(false);

  useEffect(() => {
    trackIndexRef.current = Math.floor(Math.random() * TRACKS.length);
    const music = new Audio(TRACKS[0]);
    const effectSources = [popSfx, badSfx, doneSfx, fanfareSfx, star1Sfx, star2Sfx, star3Sfx];
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
    music.volume = MUSIC_VOLUME;
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

  const selectNextMusicTrack = useCallback(() => {
    const music = musicRef.current;
    if (!music) return null;
    const source = TRACKS[trackIndexRef.current];
    trackIndexRef.current = (trackIndexRef.current + 1) % TRACKS.length;
    music.pause();
    music.src = source;
    try {
      music.currentTime = 0;
    } catch {
      // Some browsers do not expose currentTime until metadata is ready.
    }
    music.load?.();
    return source;
  }, []);

  const setMusicDucked = useCallback((ducked) => {
    if (!musicRef.current) return;
    musicRef.current.volume = ducked ? MUSIC_DUCKED_VOLUME : MUSIC_VOLUME;
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

  return {
    musicIsPlaying,
    pauseMusic,
    playEffect,
    playMusic,
    primeEffects,
    selectNextMusicTrack,
    setMusicDucked,
  };
}

export default function App() {
  const [profiles, setProfiles] = useState(loadProfiles);
  // Resolved during the first render so the state initialisers below can read the right keys.
  const activeProfile = getActiveProfile(profiles);
  const activeProfileId = activeProfile.id;
  const [settings, setSettings] = useState(() => loadSettings(activeProfileId));
  const [nameDialog, setNameDialog] = useState(null);
  const [phase, setPhase] = useState('welcome');
  const [roundWords, setRoundWords] = useState([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [letterIndex, setLetterIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [hintLevel, setHintLevel] = useState('none');
  const [celebratingWord, setCelebratingWord] = useState(false);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [heartBurstId, setHeartBurstId] = useState(0);
  const [roundKind, setRoundKind] = useState('normal');
  const [roundReward, setRoundReward] = useState(emptyRoundReward);
  const [superIntroVisible, setSuperIntroVisible] = useState(false);
  const [stickerBookOpen, setStickerBookOpen] = useState(false);
  const [stickerBookProgress, setStickerBookProgress] = useState(createEmptyProgress);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsStats, setSettingsStats] = useState(null);
  const [settingsProgress, setSettingsProgress] = useState(null);
  const [visibleProgress, setVisibleProgress] = useState(() => loadProgress(activeProfileId));

  const inputRef = useRef(null);
  const settingsRef = useRef(settings);
  const missCountRef = useRef(0);
  // Stats live in refs so per-key bookkeeping never causes re-renders during play.
  const statsRef = useRef(null);
  if (statsRef.current === null) statsRef.current = loadStats(activeProfileId);
  const progressRef = useRef(visibleProgress);
  const letterStartRef = useRef(0);
  const wordStartRef = useRef(0);
  const roundStartRef = useRef(0);
  const wordMissesRef = useRef(0);
  const roundMissesRef = useRef(0);
  const roundStartStarsRef = useRef(0);
  const wordStarsRef = useRef([]);
  const roundAwardRef = useRef({ badge: null, journeyPosition: 0, shiny: null, sticker: null, wasSuper: false });
  const feedbackTimerRef = useRef(null);
  const feedbackColorTimerRef = useRef(null);
  const advanceTimerRef = useRef(null);
  const celebrationTimerRef = useRef(null);
  const promptTimerRef = useRef(null);
  const superIntroTimerRef = useRef(null);
  const transitioningRef = useRef(false);
  const lastCorrectIndexRef = useRef(-1);
  const lastWordPraiseIndexRef = useRef(-1);
  const lastRoundPraiseIndexRef = useRef(-1);
  const lastEncouragementIndexRef = useRef(-1);
  const lastSuperIntroIndexRef = useRef(-1);
  const speechBusyUntilRef = useRef(0);
  const speechTokenRef = useRef(0);
  const pendingPromptRef = useRef(null);
  const wordsSincePraiseRef = useRef(0);
  const wordPraiseGapRef = useRef(2);
  const sessionStrugglesRef = useRef(new Set());
  const sessionFilterKeyRef = useRef(null);
  const appRef = useRef(null);
  const roundSettingsDirtyRef = useRef(false);
  const currentWord = roundWords[wordIndex] ?? '';
  const currentWordLetters = useMemo(() => [...currentWord], [currentWord]);
  const locale = getLocale(settings.locale);
  const copy = locale.messages;
  const earnedRoundStars = phase === 'complete' ? roundReward.stars : 0;
  const filledWords = Math.min(
    roundWords.length,
    wordIndex + (letterIndex === currentWordLetters.length && currentWordLetters.length > 0 ? 1 : 0),
  );
  const roundProgress = roundWords.length && currentWordLetters.length
    ? Math.min(
        (wordIndex + Math.min(letterIndex / currentWordLetters.length, 1)) / roundWords.length,
        1,
      )
    : 0;
  const correctLetterCount = roundWords
    .slice(0, wordIndex)
    .reduce((count, word) => count + [...word].length, letterIndex);

  const {
    musicIsPlaying,
    pauseMusic,
    playEffect,
    playMusic,
    primeEffects,
    selectNextMusicTrack,
    setMusicDucked,
  } = useGameAudio(settings.soundEffects);
  const { cancel: cancelSpeech, say } = useSpeech(
    settings.speech,
    settings.locale,
    setMusicDucked,
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    } catch {
      // The game still works when browser storage is unavailable.
    }
  }, [profiles]);

  // Profile switches update the id and the settings in one batch, so this effect never writes
  // one child's settings under another child's key.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        profileStorageKey(SETTINGS_KEY, activeProfileId),
        JSON.stringify(settings),
      );
    } catch {
      // The game still works when browser storage is unavailable.
    }
  }, [activeProfileId, settings]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    document.documentElement.lang = locale.code;
  }, [locale.code]);

  useEffect(() => {
    if (!settings.music) pauseMusic();
  }, [pauseMusic, settings.music]);

  useEffect(() => {
    const filterKey = JSON.stringify([
      settings.locale,
      settings.gameMode,
      settings.minLetters,
      settings.maxLetters,
      settings.syllables,
      settings.roundLength,
      settings.wordSource,
      settings.customWords,
    ]);
    if (sessionFilterKeyRef.current !== null && sessionFilterKeyRef.current !== filterKey) {
      sessionStrugglesRef.current.clear();
    }
    sessionFilterKeyRef.current = filterKey;
  }, [settings]);

  useEffect(() => {
    if (phase !== 'playing' || !currentWord || settingsOpen || superIntroVisible) return undefined;
    window.clearTimeout(promptTimerRef.current);
    pendingPromptRef.current = null;
    const speakPrompt = () => {
      pendingPromptRef.current = null;
      say(formatMessage(copy.spellPrompt, { word: currentWord }));
    };
    const delay = Math.max(0, speechBusyUntilRef.current - performance.now());
    if (delay > 0) {
      pendingPromptRef.current = speakPrompt;
      promptTimerRef.current = window.setTimeout(speakPrompt, delay);
    } else {
      speakPrompt();
    }
    return () => {
      window.clearTimeout(promptTimerRef.current);
      pendingPromptRef.current = null;
    };
  }, [copy.spellPrompt, currentWord, phase, say, settingsOpen, superIntroVisible, wordIndex]);

  useEffect(() => {
    if (phase !== 'complete') return undefined;
    const sounds = [star1Sfx, star2Sfx, star3Sfx];
    playEffect(fanfareSfx, 0.5);
    const timers = sounds.slice(0, earnedRoundStars).map((source, index) =>
      window.setTimeout(() => playEffect(source, 0.38), 320 + index * 250),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [earnedRoundStars, phase, playEffect]);

  useEffect(() => {
    if (phase !== 'playing' || settingsOpen || superIntroVisible) return undefined;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [letterIndex, phase, settingsOpen, superIntroVisible, wordIndex]);


  useEffect(
    () => () => {
      window.clearTimeout(feedbackTimerRef.current);
      window.clearTimeout(feedbackColorTimerRef.current);
      window.clearTimeout(advanceTimerRef.current);
      window.clearTimeout(celebrationTimerRef.current);
      window.clearTimeout(promptTimerRef.current);
      window.clearTimeout(superIntroTimerRef.current);
      pendingPromptRef.current = null;
      cancelSpeech();
    },
    [cancelSpeech],
  );

  const focusInput = useCallback(() => {
    if (phase === 'playing' && !settingsOpen) inputRef.current?.focus({ preventScroll: true });
  }, [phase, settingsOpen]);

  const clearRoundTimers = useCallback(() => {
    window.clearTimeout(feedbackTimerRef.current);
    window.clearTimeout(feedbackColorTimerRef.current);
    window.clearTimeout(advanceTimerRef.current);
    window.clearTimeout(celebrationTimerRef.current);
    window.clearTimeout(promptTimerRef.current);
    window.clearTimeout(superIntroTimerRef.current);
    pendingPromptRef.current = null;
  }, []);

  const resetHintLadder = useCallback(() => {
    missCountRef.current = 0;
    setHintLevel('none');
  }, []);

  const persistStats = useCallback(() => {
    try {
      window.localStorage.setItem(
        profileStorageKey(STATS_KEY, activeProfileId),
        JSON.stringify(statsRef.current),
      );
    } catch {
      // Statistics are best-effort; the game works without storage.
    }
  }, [activeProfileId]);

  const persistProgress = useCallback(() => {
    try {
      window.localStorage.setItem(
        profileStorageKey(PROGRESS_KEY, activeProfileId),
        JSON.stringify(progressRef.current),
      );
    } catch {
      // Reward progress is best-effort; the game works without storage.
    }
  }, [activeProfileId]);

  const startRound = useCallback(() => {
    const nextRoundKind = isSuperRoundNext(progressRef.current) ? 'super' : 'normal';
    const selectionSummary =
      settings.adaptivePractice && statsRef.current.totals.attempts >= ADAPTIVE_MIN_ATTEMPTS
        ? summariseForSelection(statsRef.current, settings.locale)
        : null;
    const words = nextRoundKind === 'super'
      ? createReviewRound(settings, sessionStrugglesRef.current, Math.random, selectionSummary)
      : selectionSummary
        ? createAdaptiveRound(settings, selectionSummary)
        : createRound(settings);
    if (!words.length) {
      setSettingsOpen(true);
      return;
    }

    clearRoundTimers();
    transitioningRef.current = nextRoundKind === 'super';
    resetHintLadder();
    speechTokenRef.current += 1;
    speechBusyUntilRef.current = 0;
    wordsSincePraiseRef.current = 0;
    wordPraiseGapRef.current = randomWordPraiseGap();
    wordStarsRef.current = [];
    roundAwardRef.current = {
      badge: null,
      journeyPosition: progressRef.current.roundsTowardSuper,
      shiny: null,
      sticker: null,
      wasSuper: false,
    };
    roundStartStarsRef.current = progressRef.current.totalStars;
    const now = performance.now();
    roundStartRef.current = now;
    wordStartRef.current = now;
    letterStartRef.current = now;
    wordMissesRef.current = 0;
    roundMissesRef.current = 0;
    setRoundWords(words);
    setWordIndex(0);
    setLetterIndex(0);
    setMistakes(0);
    setFeedback('idle');
    setFeedbackMessage('');
    setCelebratingWord(false);
    setConfettiVisible(false);
    setHeartBurstId(0);
    setRoundKind(nextRoundKind);
    setRoundReward(emptyRoundReward());
    setSuperIntroVisible(nextRoundKind === 'super');
    setPhase('playing');
    primeEffects();
    selectNextMusicTrack();
    if (settings.music) playMusic();
  }, [clearRoundTimers, playMusic, primeEffects, resetHintLadder, selectNextMusicTrack, settings]);

  const dismissSuperIntro = useCallback(() => {
    if (!superIntroVisible) return;
    window.clearTimeout(superIntroTimerRef.current);
    cancelSpeech();
    speechTokenRef.current += 1;
    speechBusyUntilRef.current = 0;
    transitioningRef.current = false;
    const now = performance.now();
    roundStartRef.current = now;
    wordStartRef.current = now;
    letterStartRef.current = now;
    setSuperIntroVisible(false);
  }, [cancelSpeech, superIntroVisible]);

  useEffect(() => {
    if (phase !== 'playing' || roundKind !== 'super' || !superIntroVisible) return undefined;
    transitioningRef.current = true;
    playEffect(star3Sfx, 0.42);
    say(pickVaried(copy.superRoundIntroSpeeches, lastSuperIntroIndexRef), {
      fallbackMs: 1900,
    });
    superIntroTimerRef.current = window.setTimeout(dismissSuperIntro, 2000);
    return () => window.clearTimeout(superIntroTimerRef.current);
  }, [copy.superRoundIntroSpeeches, dismissSuperIntro, phase, playEffect, roundKind, say, superIntroVisible]);

  const repeatWord = useCallback(() => {
    speechTokenRef.current += 1;
    speechBusyUntilRef.current = 0;
    window.clearTimeout(promptTimerRef.current);
    pendingPromptRef.current = null;
    if (currentWord) say(formatMessage(copy.spellPrompt, { word: currentWord }));
    focusInput();
  }, [copy.spellPrompt, currentWord, focusInput, say]);

  const speakLetter = useCallback(
    (letter) => {
      say(getLetterSpeechText(letter, settings.locale), { rate: 0.65, pitch: 1.08 });
      window.requestAnimationFrame(focusInput);
    },
    [focusInput, say, settings.locale],
  );

  const releaseWordPraise = useCallback((token) => {
    if (speechTokenRef.current !== token) return;
    speechBusyUntilRef.current = 0;
    window.clearTimeout(promptTimerRef.current);
    const pendingPrompt = pendingPromptRef.current;
    pendingPromptRef.current = null;
    pendingPrompt?.();
  }, []);

  const speakWordPraise = useCallback(
    () => {
      const praise = pickVaried(copy.wordFinishedSpeeches, lastWordPraiseIndexRef);
      if (!praise) return;
      const token = speechTokenRef.current + 1;
      speechTokenRef.current = token;
      speechBusyUntilRef.current = performance.now() + WORD_PRAISE_FALLBACK;
      const started = say(praise, {
        onEnd: () => releaseWordPraise(token),
      });
      if (!started) releaseWordPraise(token);
    },
    [copy.wordFinishedSpeeches, releaseWordPraise, say],
  );

  const spawnHearts = useCallback(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    if (!reducedMotion) setHeartBurstId((id) => id + 1);
  }, []);

  const speakEncouragement = useCallback(
    (letter) => {
      const encouragement = pickVaried(copy.encouragementSpeeches, lastEncouragementIndexRef);
      const message = settings.gameMode === 'normal'
        ? `${encouragement} ${letter.toLocaleUpperCase(locale.code)}.`
        : encouragement;
      spawnHearts();
      say(message, { rate: 0.76, pitch: 1.06 });
      window.requestAnimationFrame(focusInput);
    },
    [copy.encouragementSpeeches, focusInput, locale.code, say, settings.gameMode, spawnHearts],
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

  const celebrateWord = useCallback(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    setCelebratingWord(true);
    setConfettiVisible(!reducedMotion);
    spawnHearts();
    window.clearTimeout(celebrationTimerRef.current);
    celebrationTimerRef.current = window.setTimeout(() => {
      setCelebratingWord(false);
      setConfettiVisible(false);
    }, CONFETTI_DURATION + 40);
  }, [spawnHearts]);

  const completeWord = useCallback(() => {
    resetHintLadder();
    setCelebratingWord(false);
    setConfettiVisible(false);
    const isLastWord = wordIndex === roundWords.length - 1;
    if (isLastWord) {
      const stars = starsForRound(wordStarsRef.current);
      setRoundReward({
        badge: roundAwardRef.current.badge,
        journeyPosition: roundAwardRef.current.journeyPosition,
        kind: roundAwardRef.current.wasSuper ? 'super' : 'normal',
        previousTotalStars: roundStartStarsRef.current,
        shiny: roundAwardRef.current.shiny,
        stars,
        sticker: roundAwardRef.current.sticker,
        totalStars: progressRef.current.totalStars,
      });
      signalFeedback('idle');
      setFeedbackMessage('');
      setPhase('complete');
      transitioningRef.current = false;
      pauseMusic();
      const praise = pickVaried(copy.roundFinishedSpeeches, lastRoundPraiseIndexRef);
      // Keep completion praise concise. Collected words are spoken only when a child
      // deliberately taps their sticker in the book, never as an automatic encore.
      say(praise);
      return;
    }

    setWordIndex((index) => index + 1);
    setLetterIndex(0);
    signalFeedback('idle');
    setFeedbackMessage('');
    transitioningRef.current = false;
    const advanceTime = performance.now();
    wordStartRef.current = advanceTime;
    letterStartRef.current = advanceTime;
    wordMissesRef.current = 0;
  }, [copy.roundFinishedSpeeches, pauseMusic, resetHintLadder, roundWords.length, say, signalFeedback, wordIndex]);

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
        const attemptTime = performance.now();
        const correct = lettersMatch(expected, attempt, settings.acceptUnaccented);
        statsRef.current = recordAttempt(statsRef.current, {
          expected,
          typed: attempt,
          correct,
          latencyMs: attemptTime - letterStartRef.current,
          locale: settings.locale,
          mode: settings.gameMode,
        });
        letterStartRef.current = attemptTime;
        if (!correct) {
          signalFeedback('error');
          playEffect(badSfx, 0.55);
          wordMissesRef.current += 1;
          roundMissesRef.current += 1;

          if (nextLetterIndex !== letterIndex) {
            setLetterIndex(nextLetterIndex);
            resetHintLadder();
          }
          setMistakes((count) => count + 1);
          missCountRef.current += 1;
          if (missCountRef.current === 2) {
            if (settings.gameMode === 'normal') {
              setHintLevel('ghost');
            }
            speakEncouragement(expected);
          } else if (settings.gameMode === 'normal' && missCountRef.current >= 3) {
            setHintLevel('full');
          }
          setFeedbackMessage(copy.tryAgain);
          resetFeedbackSoon();
          return;
        }

        nextLetterIndex += 1;
        if (nextLetterIndex === currentWordLetters.length) break;
      }

      const wordIsComplete = nextLetterIndex === currentWordLetters.length;
      signalFeedback('success');
      setFeedbackMessage(pickVaried(copy.correctMessages, lastCorrectIndexRef));
      resetFeedbackSoon();

      if (wordIsComplete) {
        transitioningRef.current = true;
        const completionTime = performance.now();
        const wordStars = starsForWord(wordMissesRef.current);
        wordStarsRef.current = [...wordStarsRef.current, wordStars];
        progressRef.current = addStars(progressRef.current, wordStars);
        statsRef.current = recordWordCompleted(statsRef.current, {
          word: currentWord,
          locale: settings.locale,
          mistakes: wordMissesRef.current,
          durationMs: completionTime - wordStartRef.current,
          mode: settings.gameMode,
        });
        if (wordMissesRef.current > 0) sessionStrugglesRef.current.add(currentWord);
        const isLastWord = wordIndex === roundWords.length - 1;
        if (isLastWord) {
          statsRef.current = recordRoundCompleted(statsRef.current, {
            length: roundWords.length,
            mistakes: roundMissesRef.current,
            durationMs: completionTime - roundStartRef.current,
            mode: settings.gameMode,
          });
          const roundStars = starsForRound(wordStarsRef.current);
          const wasSuper = roundKind === 'super';
          const stickerId = wasSuper
            ? null
            : pickStickerAward(progressRef.current, roundWords, settings.locale);
          const shinyCodepoint = wasSuper ? pickShinyAward(progressRef.current) : null;
          if (stickerId) progressRef.current = addSticker(progressRef.current, stickerId);
          if (shinyCodepoint) {
            progressRef.current = addShinySticker(progressRef.current, shinyCodepoint);
          }
          progressRef.current = recordRoundInCycle(progressRef.current, { wasSuper });
          const badges = newBadges(progressRef.current, statsRef.current, {
            mode: settings.gameMode,
            stars: roundStars,
          });
          progressRef.current = addBadges(progressRef.current, badges);
          roundAwardRef.current = {
            badge: badges[0] ?? null,
            journeyPosition: progressRef.current.roundsTowardSuper,
            shiny: shinyCodepoint,
            sticker: stickerId ? getStickerDetails(stickerId) : null,
            wasSuper,
          };
          setVisibleProgress(progressRef.current);
        }
        persistStats();
        persistProgress();
        setLetterIndex(currentWordLetters.length);
        setFeedbackMessage(copy.wordFinished);
        window.clearTimeout(advanceTimerRef.current);
        cancelSpeech();
        celebrateWord();
        wordsSincePraiseRef.current += 1;
        if (!isLastWord && wordsSincePraiseRef.current >= wordPraiseGapRef.current) {
          wordsSincePraiseRef.current = 0;
          wordPraiseGapRef.current = randomWordPraiseGap();
          speakWordPraise();
        }

        if (isLastWord) {
          playEffect(doneSfx, 0.7, () => {
            advanceTimerRef.current = window.setTimeout(completeWord, WORD_COMPLETION_PAUSE);
          });
        } else {
          playEffect(doneSfx, 0.7);
          advanceTimerRef.current = window.setTimeout(completeWord, WORD_COMPLETION_PAUSE);
        }
      } else {
        playEffect(popSfx, 0.7);
        setLetterIndex(nextLetterIndex);
        resetHintLadder();
      }
    },
    [
      completeWord,
      cancelSpeech,
      celebrateWord,
      copy,
      currentWord,
      currentWordLetters,
      letterIndex,
      locale.code,
      persistStats,
      persistProgress,
      phase,
      playEffect,
      resetFeedbackSoon,
      resetHintLadder,
      roundWords,
      roundKind,
      signalFeedback,
      settings.acceptUnaccented,
      settings.gameMode,
      settings.locale,
      speakEncouragement,
      speakWordPraise,
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

  const openStickerBook = () => {
    cancelSpeech();
    pauseMusic();
    setStickerBookProgress(progressRef.current);
    setStickerBookOpen(true);
  };

  const closeStickerBook = () => {
    cancelSpeech();
    setStickerBookOpen(false);
  };

  const celebrateBookPages = useCallback((pageIds) => {
    progressRef.current = celebratePages(progressRef.current, pageIds);
    setVisibleProgress(progressRef.current);
    setStickerBookProgress(progressRef.current);
    persistProgress();
  }, [persistProgress]);

  const speakSticker = (word, stickerLocale) => {
    say(word, { locale: stickerLocale, rate: 0.78, pitch: 1.04 });
  };

  const openSettings = () => {
    speechTokenRef.current += 1;
    speechBusyUntilRef.current = 0;
    window.clearTimeout(promptTimerRef.current);
    pendingPromptRef.current = null;
    cancelSpeech();
    pauseMusic();
    setSettingsStats(statsRef.current);
    setSettingsProgress(progressRef.current);
    roundSettingsDirtyRef.current = false;
    setSettingsOpen(true);
  };

  const eraseProgress = useCallback(() => {
    // Scoped to the active child only — a shared device must not lose a sibling's stars.
    try {
      window.localStorage.removeItem(profileStorageKey(STATS_KEY, activeProfileId));
      window.localStorage.removeItem(profileStorageKey(PROGRESS_KEY, activeProfileId));
    } catch {
      // Nothing stored means nothing to erase.
    }
    statsRef.current = createEmptyStats();
    progressRef.current = createEmptyProgress();
    setVisibleProgress(progressRef.current);
    setSettingsStats(statsRef.current);
    setSettingsProgress(progressRef.current);
    setStickerBookProgress(progressRef.current);
  }, [activeProfileId]);

  const resetToWelcome = () => {
    clearRoundTimers();
    cancelSpeech();
    pauseMusic();
    transitioningRef.current = false;
    setRoundWords([]);
    setWordIndex(0);
    setLetterIndex(0);
    setFeedback('idle');
    setFeedbackMessage('');
    setCelebratingWord(false);
    setConfettiVisible(false);
    setHeartBurstId(0);
    setRoundKind('normal');
    setRoundReward(emptyRoundReward());
    setSuperIntroVisible(false);
    setStickerBookOpen(false);
    speechTokenRef.current += 1;
    speechBusyUntilRef.current = 0;
    wordStarsRef.current = [];
    roundSettingsDirtyRef.current = false;
    setPhase('welcome');
    setSettingsOpen(false);
  };

  const restartWithSettings = (nextSettings) => {
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    resetToWelcome();
  };

  // Switching child swaps three stores at once. Everything is set in this one handler so the
  // batched render sees the new profile id and the new settings together.
  const switchToProfile = (nextProfiles) => {
    const nextId = getActiveProfile(nextProfiles).id;
    if (nextId !== activeProfileId) {
      const nextSettings = loadSettings(nextId);
      statsRef.current = loadStats(nextId);
      progressRef.current = loadProgress(nextId);
      sessionStrugglesRef.current.clear();
      sessionFilterKeyRef.current = null;
      settingsRef.current = nextSettings;
      setSettings(nextSettings);
      setVisibleProgress(progressRef.current);
      setStickerBookProgress(progressRef.current);
      setSettingsStats(statsRef.current);
      setSettingsProgress(progressRef.current);
    }
    setProfiles(nextProfiles);
    resetToWelcome();
  };

  const openNameDialog = (mode, profileId = null) => setNameDialog({ mode, profileId });

  const saveProfileName = (name) => {
    if (nameDialog?.mode === 'rename' && nameDialog.profileId) {
      setProfiles((current) => renameProfile(current, nameDialog.profileId, name));
    } else {
      switchToProfile(createProfile(profiles, name));
    }
    setNameDialog(null);
  };

  const deleteProfile = (profileId) => {
    const next = removeProfile(profiles, profileId);
    // removeProfile refuses to empty the list; nothing changed means nothing to clear.
    if (next.profiles.length === profiles.profiles.length) return;
    clearProfileStorage(profileId);
    if (getActiveProfile(next).id !== activeProfileId) switchToProfile(next);
    else setProfiles(next);
  };

  const applySettingsChange = (partial) => {
    const current = settingsRef.current;
    const next = normaliseSettings({ ...current, ...partial });
    if (
      phase === 'playing' &&
      ROUND_SETTING_KEYS.some((key) => current[key] !== next[key])
    ) {
      roundSettingsDirtyRef.current = true;
    }
    settingsRef.current = next;
    setSettings(next);
  };

  const closeSettings = () => {
    if (phase === 'playing' && roundSettingsDirtyRef.current) {
      restartWithSettings(settingsRef.current);
      return;
    }
    roundSettingsDirtyRef.current = false;
    setSettingsOpen(false);
    if (phase === 'playing' && settings.music) playMusic();
  };

  const changeSettingsLocale = (nextLocale) => {
    restartWithSettings(normaliseSettings({ ...settingsRef.current, locale: nextLocale }));
  };

  const changeWelcomeLanguage = (event) => {
    setSettings((current) => normaliseSettings({ ...current, locale: event.target.value }));
  };

  const letterLabels = {
    completed: copy.letterCompleted,
    current: copy.letterCurrent,
    next: copy.letterNext,
    template: copy.letterLabel,
    hiddenTemplate: copy.letterHiddenLabel,
  };
  // The unnamed default slot is never offered as a chip — there is nothing to tap on.
  const namedProfiles = profiles.profiles.filter((profile) => profile.name);
  const roundsRemaining = SUPER_ROUND_EVERY - roundReward.journeyPosition;
  const journeyMessage = roundReward.kind === 'super'
    ? copy.superRoundDone
    : roundsRemaining === 1
      ? copy.superRoundCountdownOne
      : formatMessage(copy.superRoundCountdownMany, { count: roundsRemaining });
  const mostRecentSticker = phase === 'complete'
    ? roundReward.sticker ?? (roundReward.shiny
      ? { codepoint: roundReward.shiny, id: `shiny/${roundReward.shiny}` }
      : null)
    : getStickerDetails(visibleProgress.stickers.at(-1)) ?? (visibleProgress.shinyStickers.at(-1)
      ? {
          codepoint: visibleProgress.shinyStickers.at(-1),
          id: `shiny/${visibleProgress.shinyStickers.at(-1)}`,
        }
      : null);

  return (
    <div
      ref={appRef}
      className="app"
      data-feedback={feedback}
      data-phase={phase}
      data-round={roundKind}
    >
      <Scenery phase={phase} />
      {phase === 'welcome' && (
        <StarJarChip
          key="welcome-star-jar"
          count={visibleProgress.totalStars}
          ariaLabel={formatMessage(copy.starJarLine, { count: visibleProgress.totalStars })}
        />
      )}
      {phase === 'complete' && (
        <StarJarChip
          key="complete-star-jar"
          count={roundReward.totalStars}
          fromCount={roundReward.previousTotalStars}
          ariaLabel={formatMessage(copy.starJarLine, { count: roundReward.totalStars })}
        />
      )}
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
      {(phase === 'welcome' || phase === 'complete') && (
        <BookTab
          ariaLabel={copy.openStickerBook}
          bounce={phase === 'complete' && Boolean(roundReward.sticker || roundReward.shiny)}
          onClick={openStickerBook}
          recentSticker={mostRecentSticker}
        />
      )}

      {phase === 'welcome' && (
        <main className="welcome-screen">
          <img className="welcome-croc" src={croc} alt="" />
          <Wordmark name={copy.projectName} showEyes={settings.eyes} />
          <button type="button" className="primary-button welcome-play-button" onClick={startRound}>
            {copy.play}
          </button>
          <div className="profile-picker">
            {namedProfiles.map((profile) => (
              <button
                type="button"
                key={profile.id}
                className={`profile-chip${profile.id === activeProfileId ? ' profile-chip--active' : ''}`}
                aria-pressed={profile.id === activeProfileId}
                aria-label={formatMessage(copy.switchProfile, { name: profile.name })}
                onClick={() => switchToProfile(selectProfile(profiles, profile.id))}
              >
                <NameTag name={profile.name} showEyes={settings.eyes} size="chip" />
              </button>
            ))}
            {profiles.profiles.length < MAX_PROFILES && (
              <button
                type="button"
                className="profile-chip profile-chip--add"
                aria-label={copy.addProfile}
                onClick={() => openNameDialog('add')}
              >
                <span aria-hidden="true">+</span>
              </button>
            )}
          </div>
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
          {activeProfile.name && (
            // Flat letters, no widget chrome — the child's name belongs to the same world as
            // the words they are spelling, not to a labelled status pill.
            <div className="play-name" role="img" aria-label={activeProfile.name}>
              <NameTag name={activeProfile.name} showEyes={settings.eyes} size="hud" />
            </div>
          )}
          <StarTrail
            total={roundWords.length}
            filled={filledWords}
            progress={roundProgress}
            step={correctLetterCount}
            croc={croc}
            ariaLabel={formatMessage(copy.progress, { current: wordIndex + 1, total: roundWords.length })}
          />

          {superIntroVisible && (
            <div className="super-round-intro" role="presentation">
              <button
                type="button"
                className="super-round-intro__card"
                onClick={(event) => {
                  event.stopPropagation();
                  dismissSuperIntro();
                }}
                aria-label={copy.superRoundHeading}
              >
                <span aria-hidden="true">🎁</span>
                <strong>{copy.superRoundHeading}</strong>
              </button>
            </div>
          )}

          <div
            className={`word${celebratingWord ? ' word--celebrating' : ''}`}
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
                colorIndex={index}
                onSpeak={speakLetter}
                showEyes={settings.eyes}
                hidden={settings.gameMode === 'normal'}
                hint={index === letterIndex ? hintLevel : 'none'}
                labels={letterLabels}
              />
            ))}
            {confettiVisible && (
              <CelebrationConfetti onAnimationEnd={() => setConfettiVisible(false)} />
            )}
            {heartBurstId > 0 && (
              <div
                className="heart-burst"
                key={heartBurstId}
                aria-hidden="true"
                onAnimationEnd={(event) => {
                  if (event.target === event.currentTarget) setHeartBurstId(0);
                }}
              >
                <span>♥</span>
                <span>♥</span>
                <span>♥</span>
              </div>
            )}
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
          <div
            className="star-ceremony"
            role="img"
            aria-label={formatMessage(copy.roundStarsEarned, { count: earnedRoundStars })}
          >
            {[0, 1, 2].map((index) => {
              const filled = index < earnedRoundStars;
              return (
                <span
                  key={index}
                  className={`star-ceremony__star${filled ? ' star-ceremony__star--filled' : ''}`}
                  style={{ '--star-delay': `${index * 250}ms` }}
                >
                  <StarIcon filled={filled} />
                </span>
              );
            })}
          </div>
          <p className="eyebrow">{copy.roundComplete}</p>
          <h1>{copy.completeHeading}</h1>
          <p className="complete-summary">
            {formatMessage(copy.completeSummary, {
              count: roundWords.length,
              perfect: mistakes === 0 ? copy.completePerfect : '.',
            })}
          </p>
          <JourneyStrip
            position={roundReward.journeyPosition}
            wasSuper={roundReward.kind === 'super'}
            message={journeyMessage}
          />
          {roundReward.sticker && (
            <div className="round-sticker-award">
              <StickerPicture codepoint={roundReward.sticker.codepoint} className="die-cut" />
              <p>{copy.newStickerLine}</p>
              <strong>{roundReward.sticker.word}</strong>
            </div>
          )}
          {roundReward.shiny && (
            <div className="round-sticker-award round-sticker-award--shiny">
              <span className="shiny-gift" aria-hidden="true">🎁</span>
              <StickerPicture codepoint={roundReward.shiny} className="die-cut shiny" />
              <p>{copy.newShinyStickerLine}</p>
            </div>
          )}
          {roundReward.badge && BADGE_LABEL_KEYS[roundReward.badge] && (
            <p className="badge-earned-line">
              {formatMessage(copy.badgeEarnedLine, {
                badge: copy[BADGE_LABEL_KEYS[roundReward.badge]],
              })}
            </p>
          )}
          <button type="button" className="primary-button" onClick={startRound}>
            {copy.playAgain}
          </button>
        </main>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {feedbackMessage}
      </p>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          stats={settingsStats}
          progress={settingsProgress}
          profiles={profiles}
          onChange={applySettingsChange}
          onEraseProgress={eraseProgress}
          onClose={closeSettings}
          onLocaleChange={changeSettingsLocale}
          onAddProfile={() => openNameDialog('add')}
          onRenameProfile={(id) => openNameDialog('rename', id)}
          onDeleteProfile={deleteProfile}
          onSelectProfile={(id) => switchToProfile(selectProfile(profiles, id))}
        />
      )}

      {nameDialog && (
        <NameDialog
          copy={copy}
          title={nameDialog.mode === 'rename' ? copy.renameProfileTitle : copy.nameEntryTitle}
          initialName={
            nameDialog.mode === 'rename'
              ? profiles.profiles.find((profile) => profile.id === nameDialog.profileId)?.name ?? ''
              : ''
          }
          showEyes={settings.eyes}
          onCancel={() => setNameDialog(null)}
          onSave={saveProfileName}
        />
      )}

      {stickerBookOpen && (
        <StickerBook
          copy={copy}
          croc={croc}
          locale={settings.locale}
          progress={stickerBookProgress}
          onCelebratePages={celebrateBookPages}
          onClose={closeStickerBook}
          onSpeak={speakSticker}
        />
      )}
    </div>
  );
}
