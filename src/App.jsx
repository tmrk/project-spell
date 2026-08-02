import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Letter from './components/Letter';
import BookTab from './components/BookTab';
import CelebrationConfetti from './components/CelebrationConfetti';
import JourneyStrip from './components/JourneyStrip';
import LetterKeyboard from './components/LetterKeyboard';
import ModeCards from './components/ModeCards';
import NameDialog from './components/NameDialog';
import NameField from './components/NameField';
import NameTag from './components/NameTag';
import Scenery from './components/Scenery';
import SettingsPanel from './components/SettingsPanel';
import StarJarChip from './components/StarJarChip';
import StarTrail from './components/StarTrail';
import StickerBook, { StickerPicture } from './components/StickerBook';
import Wordmark from './components/Wordmark';
import { ChevronIcon, HomeIcon, MusicIcon, RepeatIcon, SettingsIcon, StarIcon } from './components/Icons';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  composeRound,
  letterColors,
  lettersMatch,
  normaliseSettings,
} from './game';
import {
  STATS_KEY,
  createEmptyStats,
  masteredWordsForLocale,
  masteryOf,
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
  celebrateBadges,
  celebratePages,
  createEmptyProgress,
  isSuperRoundNext,
  newBadges,
  normaliseProgress,
  pickShinyAward,
  pickStickerAward,
  recordRoundInCycle,
  recordWordMastered,
} from './progress';
import {
  MAX_NAME_LENGTH,
  MAX_PROFILES,
  PROFILES_KEY,
  createEmptyProfiles,
  createProfile,
  getActiveProfile,
  normaliseProfileName,
  normaliseProfiles,
  profileStorageKey,
  removeProfile,
  renameProfile,
  selectProfile,
} from './profiles';
import { buildKeyRows } from './keyboard';
import { createSpeechQueue, estimateSpeechMs } from './speech';
import { SESSION_KEY, createSession, isResumable, normaliseSession } from './session';
import { getStickerDetails } from './stickers/map';
import {
  LOCALE_OPTIONS,
  detectDefaultLocale,
  formatMessage,
  getLetterSpeechText,
  getLocale,
  getSpellBackLetterSpeech,
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
// The longest the last word of a round may sit finished before the ceremony arrives regardless of
// what the word-done chime reports. Comfortably past the chime plus its usual pause, so a working
// sound path always wins the race and this only ever rescues a silent or stalled one.
const LAST_WORD_ADVANCE_CEILING = 2000;
// Adaptive practice needs a little history before it can weight anything sensibly;
// below this the child gets the plain random round (roadmap G6).
const ADAPTIVE_MIN_ATTEMPTS = 20;
const CONFETTI_DURATION = 700;
// Spell-it-back (roadmap F4, D-020, D-021): the letters go to the speech queue as one compact
// utterance and the word as a second, so the word is spoken from the letters' real end with no
// cancel in between. Boundary events keep the travelling light with the voice where they exist;
// the group light is the honest fallback where they do not.
const SPELL_BACK_SILENT_STEP = 120;
const SPELL_BACK_SILENT_MAX = 1500;
const SPELL_BACK_WORD_GAP = 140;
const SPELL_BACK_LETTER_RATE = 1.18;
const SPELL_BACK_WORD_RATE = 1.12;
const SPELL_BACK_SILENT_CEILING_BUFFER = 1600;
// The beat is time-boxed (owner decision, 2026-07-25), but the box is patience for *silence*, not a
// cap on how long a word may take to say. It is re-armed by every sign the voice is still working —
// a stage starting, a word boundary — so a long word is never cut short, while an engine that
// reports `start` and then goes quiet forever still hands the round back. As a flat 4.2s ceiling on
// the whole beat it cut the re-spelling short on every word of six letters or more (D-024).
// Whatever is still speaking when the box does close keeps speaking — the next word's prompt queues
// behind it rather than cutting across it.
const SPELL_BACK_BUDGET_SLACK = 900;
const SPELL_BACK_BUDGET_MIN = 2200;
const PITCH_LADDER_STEP_SEMITONES = 2;
const PITCH_LADDER_CAP_SEMITONES = 12;
// Comfortably longer than the Play slab's 180ms exit in `App.scss`. The headroom matters: at
// exactly the animation's length, ordinary timer jitter drops the slab while it is still
// faintly visible and it reads as a pop rather than a fade.
const MODE_REVEAL_MS = 260;
// Browser chrome can make the visual viewport differ from the layout viewport by a few pixels.
// A software keyboard is a much larger, height-only change; keeping a floor avoids treating a
// toolbar animation as keyboard geometry while the always-focused typing field is active.
const SYSTEM_KEYBOARD_INSET_MIN = 80;

const spellBackSilentStep = (length) =>
  Math.min(SPELL_BACK_SILENT_STEP, 900 / length, SPELL_BACK_SILENT_MAX / length);
const pitchLadderRate = (letterIndex) =>
  2 ** (Math.min(letterIndex * PITCH_LADDER_STEP_SEMITONES, PITCH_LADDER_CAP_SEMITONES) / 12);
// The welcome greeting is a quick, warm hello before the first word — spoken and animated. It
// must stay short so it never gets between a child and playing: the word appears once the wave
// animation has settled and the greeting has been said, whichever is slower, capped hard by
// GREETING_MAX_MS so a stalled voice can never hold the round back.
const GREETING_ANIM_MS = 1150;
const GREETING_MAX_MS = 2600;
const GREETING_REDUCED_MS = 240;
const GREETING_REDUCED_MAX_MS = 520;
const MUSIC_VOLUME = 0.12;
const MUSIC_DUCKED_VOLUME = 0.05;
const TRACKS = Object.freeze([townThemeMusic, bgMusic2, bgMusic3]);
// Changing one of these mid-round re-selects which words a child sees, so the round has to be
// rebuilt. Everything else — game mode (letters shown or hidden), accepting unaccented typing,
// eyes, sound, palette, on-screen keys — reads live from settings during play, so it hot-swaps
// without interrupting the round (owner request, 2026-07-23). `locale` stays here because it
// swaps the word bank and the voice, and it already asks for confirmation of its own.
const ROUND_SETTING_KEYS = Object.freeze([
  'locale',
  'minLetters',
  'maxLetters',
  'syllables',
  'roundLength',
  'wordSource',
  'wordPack',
  'customWords',
  'autoLadder',
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

function joinAnnouncements(messages) {
  return messages
    .filter(Boolean)
    .map((message) => (/[.!?]$/u.test(message) ? message : `${message}.`))
    .join(' ');
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function measureSystemKeyboardInset(input, viewport = window.visualViewport) {
  if (!input || !viewport || document.activeElement !== input) return 0;

  const layoutWidth = window.innerWidth;
  const widthTolerance = Math.max(2, layoutWidth * 0.02);
  // Pinch zoom also shrinks VisualViewport, in both axes. A software keyboard leaves the width
  // alone, so do not mistake an accessibility zoom for room that the play screen should reserve.
  if (Math.abs(layoutWidth - viewport.width) > widthTolerance) return 0;

  // `offsetTop + height` is the bottom edge the child can actually see in layout coordinates.
  // On browsers that resize the layout viewport as well this naturally resolves to zero and dvh
  // does the work; on overlaying iOS/Android keyboards it is the exact covered band.
  const inset = window.innerHeight - viewport.height - Math.max(0, viewport.offsetTop);
  return inset >= SYSTEM_KEYBOARD_INSET_MIN ? Math.ceil(inset) : 0;
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

// Normalising a missing settings record produces the safe default mode, but that is not a choice;
// inspect the raw per-profile record so ordinary persistence does not turn a fallback into history.
function hasStoredGameMode(profileId) {
  try {
    const stored = window.localStorage.getItem(profileStorageKey(SETTINGS_KEY, profileId));
    if (!stored) return false;
    const value = JSON.parse(stored);
    return value?.gameMode === 'easy' || value?.gameMode === 'normal';
  } catch {
    return false;
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

function loadSession(profileId) {
  try {
    const stored = window.localStorage.getItem(profileStorageKey(SESSION_KEY, profileId));
    return stored ? normaliseSession(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

// The resume offer a returning child sees on the welcome screen: their stored round, but only when
// it is worth coming back to and still in the language on screen (a language switch rebuilds the
// world, so an old-language round no longer belongs).
function resumableFor(profileId, locale) {
  const session = loadSession(profileId);
  return isResumable(session) && session.locale === locale ? session : null;
}

function clearProfileStorage(profileId) {
  [SETTINGS_KEY, STATS_KEY, PROGRESS_KEY, SESSION_KEY].forEach((baseKey) => {
    try {
      window.localStorage.removeItem(profileStorageKey(baseKey, profileId));
    } catch {
      // Nothing stored means nothing to erase.
    }
  });
}

function useSpeech(enabled, locale, setSpeechDucking) {
  const voiceRef = useRef(null);
  const { code, voiceNamePattern } = getLocale(locale);
  const codeRef = useRef(code);
  const enabledRef = useRef(enabled);
  // One queue for the life of the component: it owns the engine's state machine, which must not be
  // rebuilt when a setting or a language changes underneath a running utterance.
  const [queue] = useState(createSpeechQueue);

  // These effects are registered before every caller's, so a live setting is always in place by the
  // time anything in the round asks to speak in the same commit.
  useEffect(() => {
    codeRef.current = code;
    queue.configure({
      // A voice is only right for the language it was chosen for; a sticker read in another
      // language takes the engine's own default for that language instead.
      getVoice: (item) => (item.lang === code ? voiceRef.current : null),
      onBusyChange: (isBusy) => setSpeechDucking?.(isBusy),
    });
  }, [code, queue, setSpeechDucking]);

  useEffect(() => {
    enabledRef.current = enabled;
    // Speech is an enhancement a parent can switch off mid-round; silence has to be immediate.
    if (!enabled) queue.cancel();
  }, [enabled, queue]);

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
      const localRegionalVoices = regionalVoices.filter(
        (voice) => voice.localService !== false,
      );
      const localLanguageVoices = languageVoices.filter(
        (voice) => voice.localService !== false,
      );
      // Native/local voices avoid remote start-up latency and are the voices whose platform
      // backends are most likely to expose real word ranges. Prefer one even when a remote voice's
      // display name is a closer match: exact speech-driven highlighting is more useful here than
      // a particular voice name.
      voiceRef.current =
        localRegionalVoices.find((voice) => voiceNamePattern.test(voice.name)) ??
        localRegionalVoices[0] ??
        localLanguageVoices.find((voice) => voiceNamePattern.test(voice.name)) ??
        localLanguageVoices[0] ??
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

  const cancel = useCallback(() => queue.cancel(), [queue]);

  // One entry point for everything spoken. `mode: 'next'` queues behind whatever is already going
  // rather than cutting it off; `id` lets a later request supersede an equivalent one that never
  // got its turn. Returns false only when there is nothing that could speak at all, which is the
  // signal callers use to take their silent path.
  const speak = useCallback((input, config = {}) => {
    if (!enabledRef.current) return false;
    const items = (Array.isArray(input) ? input : [input]).map((item) => ({
      id: item.id,
      lang: item.locale ? getLocale(item.locale).code : codeRef.current,
      onBoundary: item.onBoundary,
      onEnd: item.onEnd,
      onStart: item.onStart,
      pitch: item.pitch,
      rate: item.rate,
      text: item.text,
    }));
    return queue.speak(items, config);
  }, [queue]);

  const say = useCallback(
    (text, options = {}) => speak({ ...options, text }, { mode: options.mode }),
    [speak],
  );

  return { cancel, say, speak };
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
    (source, volume = 0.7, { onFinished, rate = 1 } = {}) => {
      if (!soundEffectsEnabled) {
        onFinished?.();
        return;
      }
      const playbackRate = Number.isFinite(rate) && rate > 0 ? rate : 1;

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
          bufferSource.playbackRate.value = playbackRate;
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
  const [welcomeName, setWelcomeName] = useState('');
  const [namingMode, setNamingMode] = useState(null);
  // The welcome screen asks one thing at a time: first Play, then which mode. During `revealing`
  // both are mounted only for the short visual hand-off; the spent slab is unreachable.
  const [welcomeStep, setWelcomeStep] = useState('play');
  // A default supplied by the normaliser is not a real choice. Keep it out of storage until the
  // active child has chosen a mode, so merely opening an old or empty profile cannot manufacture
  // mode history.
  const [hasRememberedMode, setHasRememberedMode] = useState(
    () => hasStoredGameMode(activeProfileId),
  );
  // This is deliberately initialised once. Adding a sibling later does not interrupt the current
  // welcome flow; only a cold load that already belongs to a shared device asks who is playing.
  const [whoIsPlayingVisible, setWhoIsPlayingVisible] = useState(
    () => profiles.profiles.filter((profile) => profile.name).length >= 2,
  );
  const [phase, setPhase] = useState('welcome');
  // A short spoken + animated hello, shown between the welcome screen and the first word each
  // time a play session begins (new child, returning child, or a switch). Null the rest of the
  // time. Its own `roundColorSeed` rotates the letter wheel so the same word looks different
  // between rounds.
  const [greeting, setGreeting] = useState(null);
  const [roundColorSeed, setRoundColorSeed] = useState(0);
  const [roundWords, setRoundWords] = useState([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [letterIndex, setLetterIndex] = useState(0);
  const [feedback, setFeedback] = useState('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [hintLevel, setHintLevel] = useState('none');
  const [keyHint, setKeyHint] = useState(null);
  const [celebratingWord, setCelebratingWord] = useState(false);
  // The live spell-back beat, or null between words: `{ index, pop? }` where `index` is the letter
  // being named right now (`letters.length` once the beat has moved on to the whole word), and
  // `pop` is present only on the timer-paced silent path.
  const [spellBack, setSpellBack] = useState(null);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [heartBurstId, setHeartBurstId] = useState(0);
  const [roundKind, setRoundKind] = useState('normal');
  const [roundReward, setRoundReward] = useState(emptyRoundReward);
  const [superIntroVisible, setSuperIntroVisible] = useState(false);
  const [stickerBookOpen, setStickerBookOpen] = useState(false);
  const [stickerBookProgress, setStickerBookProgress] = useState(createEmptyProgress);
  const [stickerBookMasteredWords, setStickerBookMasteredWords] = useState(() => new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsStats, setSettingsStats] = useState(null);
  const [settingsProgress, setSettingsProgress] = useState(null);
  const [visibleProgress, setVisibleProgress] = useState(() => loadProgress(activeProfileId));
  // The mid-round snapshot a returning child can pick up from the welcome screen. Null unless a
  // resumable round is stored for the active child in the current language.
  const [resumable, setResumable] = useState(() => resumableFor(activeProfileId, settings.locale));

  const inputRef = useRef(null);
  const playScreenRef = useRef(null);
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
  // Holds the running spell-back beat: its pending timers and the one idempotent `finish` that
  // ends it. Null whenever no beat is running, which is also how the skip and the teardown know
  // whether there is anything to stop.
  const spellBackRef = useRef(null);
  const superIntroTimerRef = useRef(null);
  const greetingTimerRef = useRef(null);
  const greetingMaxTimerRef = useRef(null);
  const lastGreetingIndexRef = useRef(-1);
  const modeRevealTimerRef = useRef(null);
  const whoIsPlayingSpokenRef = useRef(false);
  const transitioningRef = useRef(false);
  const lastCorrectIndexRef = useRef(-1);
  const lastWordPraiseIndexRef = useRef(-1);
  const lastRoundPraiseIndexRef = useRef(-1);
  const lastEncouragementIndexRef = useRef(-1);
  const lastSuperIntroIndexRef = useRef(-1);
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
  const shouldShowWhoIsPlaying =
    whoIsPlayingVisible &&
    profiles.profiles.filter((profile) => profile.name).length >= 2;
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
  // Recomputed only when the word changes, so the simple tier's keys never move mid-word. The
  // full keyboard's rows follow the language's physical layout; the simple tier stays a short grid.
  const keyboardRows = useMemo(
    () => buildKeyRows(settings.keyboard, currentWord, settings.locale),
    [currentWord, settings.keyboard, settings.locale],
  );
  // The game is drawing its own keys, so the device's keyboard has no job left — and on a phone it
  // would cover the very word the child is spelling. A read-only field is the one thing every
  // mobile browser agrees not to open a keyboard for, and it still delivers `keydown`, so a
  // physical or Bluetooth keyboard keeps working exactly as before. The fallback matters too: a
  // simple board with no keys to show (a word with no alphabet letters in it) leaves the field
  // writable rather than stranding the child with no way to type at all.
  const drawsOwnKeyboard = keyboardRows.length > 0;
  // A fresh arrangement of the five-colour wheel per word: no longer always coral-first. The
  // round seed plus the word's position vary it between rounds and between repeats within one
  // round, while `letterColors` keeps adjacent letters different. Stable for the whole word.
  const wordColors = useMemo(
    () => letterColors(currentWord, roundColorSeed + wordIndex),
    [currentWord, roundColorSeed, wordIndex],
  );
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
  const { cancel: cancelSpeech, say, speak } = useSpeech(
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
  // one child's settings under another child's key. Before a child has actually chosen a mode,
  // keep that default out of the record: otherwise merely opening the app would turn a
  // normaliser fallback into "last used" history on the next reload.
  useEffect(() => {
    try {
      const storedSettings = { ...settings };
      if (!hasRememberedMode) delete storedSettings.gameMode;
      window.localStorage.setItem(
        profileStorageKey(SETTINGS_KEY, activeProfileId),
        JSON.stringify(storedSettings),
      );
    } catch {
      // The game still works when browser storage is unavailable.
    }
  }, [activeProfileId, hasRememberedMode, settings]);

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
      settings.wordPack,
      settings.customWords,
      settings.autoLadder,
    ]);
    if (sessionFilterKeyRef.current !== null && sessionFilterKeyRef.current !== filterKey) {
      sessionStrugglesRef.current.clear();
    }
    sessionFilterKeyRef.current = filterKey;
  }, [settings]);

  // Every word gets its instruction, because the queue holds it rather than a timer guessing when
  // the voice will be free. `next` puts it behind a praise or a spell-back tail that is still
  // playing; `prompt` supersedes an earlier prompt that never got its turn, so a fast child who has
  // already moved on hears the word in front of them and not the one behind.
  useEffect(() => {
    if (phase !== 'playing' || !currentWord || settingsOpen || superIntroVisible) return undefined;
    say(formatMessage(copy.spellPrompt, { word: currentWord }), { id: 'prompt', mode: 'next' });
    return undefined;
  }, [copy.spellPrompt, currentWord, phase, say, settingsOpen, superIntroVisible, wordIndex]);

  // The question is spoken as well as written — the child being asked cannot read it yet.
  useEffect(() => {
    if (!namingMode) return;
    say(copy.nameEntryTitle);
  }, [copy.nameEntryTitle, namingMode, say]);

  // A shared device asks its one extra question out loud as well as on screen. The ref makes this
  // a cold-start announcement, not something profile switches, locale changes or panel renders
  // can repeat. `say` is the same serialized, optional speech path as the greeting (D-021).
  useEffect(() => {
    if (
      phase !== 'welcome' ||
      !shouldShowWhoIsPlaying ||
      whoIsPlayingSpokenRef.current
    ) {
      return;
    }
    whoIsPlayingSpokenRef.current = true;
    say(copy.whoIsPlayingHeading, { id: 'who-is-playing' });
  }, [copy.whoIsPlayingHeading, phase, say, shouldShowWhoIsPlaying]);

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

  // `dvh` follows the layout viewport, but mobile software keyboards commonly shrink only the
  // VisualViewport (or overlay it outright). Feed that live bottom occlusion into the same
  // keyboard → hint → word stack that owns the game-drawn board. This is dynamic in landscape,
  // where a tablet still has useful room but a fixed guess cannot describe keyboard sizes.
  useEffect(() => {
    const input = inputRef.current;
    const playScreen = playScreenRef.current;
    const viewport = window.visualViewport;
    if (
      phase !== 'playing' ||
      drawsOwnKeyboard ||
      !input ||
      !playScreen ||
      !viewport?.addEventListener
    ) {
      return undefined;
    }

    const updateInset = () => {
      const inset = measureSystemKeyboardInset(input, viewport);
      if (inset > 0) {
        playScreen.style.setProperty('--system-keyboard-inset', `${inset}px`);
        // The ordinary 90px head works while the word is vertically centred. A large keyboard
        // moves that centre upwards towards the absolutely-positioned road, so give the live
        // keyboard state a boundary just below the road. CSS supplies the normal vs short-
        // landscape value because that is where the road's own responsive position is defined.
        playScreen.style.setProperty(
          '--system-keyboard-word-head',
          'var(--system-keyboard-open-word-head)',
        );
      } else {
        playScreen.style.removeProperty('--system-keyboard-inset');
        playScreen.style.removeProperty('--system-keyboard-word-head');
      }
    };
    const clearInset = () => {
      playScreen.style.removeProperty('--system-keyboard-inset');
      playScreen.style.removeProperty('--system-keyboard-word-head');
    };

    viewport.addEventListener('resize', updateInset);
    viewport.addEventListener('scroll', updateInset);
    window.addEventListener('resize', updateInset);
    input.addEventListener('focus', updateInset);
    input.addEventListener('blur', clearInset);
    updateInset();

    return () => {
      viewport.removeEventListener('resize', updateInset);
      viewport.removeEventListener('scroll', updateInset);
      window.removeEventListener('resize', updateInset);
      input.removeEventListener('focus', updateInset);
      input.removeEventListener('blur', clearInset);
      clearInset();
    };
  }, [drawsOwnKeyboard, phase]);


  // Drops a running spell-back beat without advancing the round — for leaving the round, opening
  // the panel, or unmounting. Skipping (a child tapping through it) goes the other way and runs
  // the beat's own `finish`.
  const cancelSpellBack = useCallback(() => {
    const active = spellBackRef.current;
    if (!active) return;
    spellBackRef.current = null;
    active.timers.forEach((timer) => window.clearTimeout(timer));
    setSpellBack(null);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(feedbackTimerRef.current);
      window.clearTimeout(feedbackColorTimerRef.current);
      window.clearTimeout(advanceTimerRef.current);
      window.clearTimeout(celebrationTimerRef.current);
      window.clearTimeout(superIntroTimerRef.current);
      window.clearTimeout(greetingTimerRef.current);
      window.clearTimeout(greetingMaxTimerRef.current);
      window.clearTimeout(modeRevealTimerRef.current);
      cancelSpellBack();
      cancelSpeech();
    },
    [cancelSpeech, cancelSpellBack],
  );

  const focusInput = useCallback(() => {
    if (phase === 'playing' && !settingsOpen) inputRef.current?.focus({ preventScroll: true });
  }, [phase, settingsOpen]);

  const clearRoundTimers = useCallback(() => {
    window.clearTimeout(feedbackTimerRef.current);
    window.clearTimeout(feedbackColorTimerRef.current);
    window.clearTimeout(advanceTimerRef.current);
    window.clearTimeout(celebrationTimerRef.current);
    window.clearTimeout(superIntroTimerRef.current);
    window.clearTimeout(greetingTimerRef.current);
    window.clearTimeout(greetingMaxTimerRef.current);
    cancelSpellBack();
  }, [cancelSpellBack]);

  const resetHintLadder = useCallback(() => {
    missCountRef.current = 0;
    setHintLevel('none');
    setKeyHint(null);
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

  const persistSession = useCallback((session) => {
    try {
      window.localStorage.setItem(
        profileStorageKey(SESSION_KEY, activeProfileId),
        JSON.stringify(session),
      );
    } catch {
      // Resume is best-effort; the game still plays when storage is unavailable.
    }
  }, [activeProfileId]);

  const clearSession = useCallback(() => {
    try {
      window.localStorage.removeItem(profileStorageKey(SESSION_KEY, activeProfileId));
    } catch {
      // Nothing stored means nothing to clear.
    }
  }, [activeProfileId]);

  // Keep the resume snapshot in step with play, so pressing Home, closing the tab or a crash all
  // come back to the same word and letter. The transient full-length letter index during a word's
  // celebration is skipped (transitioningRef), so a resumed round never lands on a finished word.
  useEffect(() => {
    if (phase !== 'playing' || !roundWords.length || transitioningRef.current) return;
    persistSession(
      createSession({
        locale: settings.locale,
        gameMode: settings.gameMode,
        roundKind,
        words: roundWords,
        wordIndex,
        letterIndex,
        colorSeed: roundColorSeed,
        wordStars: wordStarsRef.current,
        startStars: roundStartStarsRef.current,
        journeyStart: roundAwardRef.current.journeyPosition,
      }),
    );
  }, [
    letterIndex,
    persistSession,
    phase,
    roundColorSeed,
    roundKind,
    roundWords,
    settings.gameMode,
    settings.locale,
    wordIndex,
  ]);

  // `options.settings` lets the mode cards start a round with the mode they represent without
  // waiting a render for the settings state to catch up.
  const startRound = useCallback((options = {}) => {
    const activeSettings = options.settings ?? settings;
    const nextRoundKind = isSuperRoundNext(progressRef.current) ? 'super' : 'normal';
    const selectionSummary =
      activeSettings.adaptivePractice && statsRef.current.totals.attempts >= ADAPTIVE_MIN_ATTEMPTS
        ? summariseForSelection(statsRef.current, activeSettings.locale)
        : null;
    const words = composeRound(activeSettings, statsRef.current, Math.random, {
      progress: progressRef.current,
      selectionSummary,
      struggles: sessionStrugglesRef.current,
      superRound: nextRoundKind === 'super',
    });
    if (!words.length) {
      // A child may have completed every word matching the current filters. Give the
      // Grown-ups panel the live profile data so its clear-progress action can restore the
      // word pool; a stale/null snapshot would leave that action disabled.
      setSettingsStats(statsRef.current);
      setSettingsProgress(progressRef.current);
      roundSettingsDirtyRef.current = false;
      setSettingsOpen(true);
      return;
    }

    // Once any round begins, this page-load's shared-device question is answered for the rest of
    // the session. Returning Home must not ask it again.
    setWhoIsPlayingVisible(false);

    // A hello is shown only when a play session begins from the welcome screen (a fresh child, a
    // returning one, or a switch). "Play again" and the automatic super round continue the same
    // session, so they never re-greet — that would slow the game down and wear out its welcome.
    const greetName = options.greet ? options.name ?? '' : '';
    const wantsGreeting = Boolean(greetName);
    // "Returning" simply means this child has spelled at least one letter before, so a brand-new
    // name is greeted with a fresh hello and everyone else with a welcome-back.
    const returning = statsRef.current.totals.attempts > 0;

    clearRoundTimers();
    window.clearTimeout(modeRevealTimerRef.current);
    // A fresh round replaces anything resumable; the effect above starts saving the new one as
    // soon as the child makes progress.
    clearSession();
    setResumable(null);
    transitioningRef.current = nextRoundKind === 'super' || wantsGreeting;
    resetHintLadder();
    setRoundColorSeed(Math.floor(Math.random() * 5));
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
    setFeedback('idle');
    setFeedbackMessage('');
    setCelebratingWord(false);
    setConfettiVisible(false);
    setHeartBurstId(0);
    setRoundKind(nextRoundKind);
    setRoundReward(emptyRoundReward());
    setSuperIntroVisible(nextRoundKind === 'super');
    if (wantsGreeting) {
      const greetCopy = getLocale(activeSettings.locale).messages;
      const speeches = returning ? greetCopy.greetingReturningSpeeches : greetCopy.greetingFirstSpeeches;
      setGreeting({
        name: greetName,
        returning,
        text: formatMessage(pickVaried(speeches, lastGreetingIndexRef), { name: greetName }),
      });
    } else {
      setGreeting(null);
    }
    setPhase(wantsGreeting ? 'greeting' : 'playing');
    primeEffects();
    selectNextMusicTrack();
    if (activeSettings.music) playMusic();
  }, [clearRoundTimers, clearSession, playMusic, primeEffects, resetHintLadder, selectNextMusicTrack, settings]);

  const dismissSuperIntro = useCallback(() => {
    if (!superIntroVisible) return;
    window.clearTimeout(superIntroTimerRef.current);
    cancelSpeech();
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
    say(pickVaried(copy.superRoundIntroSpeeches, lastSuperIntroIndexRef));
    superIntroTimerRef.current = window.setTimeout(dismissSuperIntro, 2000);
    return () => window.clearTimeout(superIntroTimerRef.current);
  }, [copy.superRoundIntroSpeeches, dismissSuperIntro, phase, playEffect, roundKind, say, superIntroVisible]);

  // Reveal the first word only once the greeting has both been said and finished its wave. Either
  // one missing still lands the child in the round: no speech (setting off, or a browser without
  // it) leaves the animation in charge, and a stalled voice is overridden by the hard max timer.
  const finishGreeting = useCallback(() => {
    window.clearTimeout(greetingTimerRef.current);
    window.clearTimeout(greetingMaxTimerRef.current);
    const now = performance.now();
    roundStartRef.current = now;
    wordStartRef.current = now;
    letterStartRef.current = now;
    // A super round re-arms this immediately in its own intro effect; an ordinary round is now
    // ready for the child to type.
    transitioningRef.current = false;
    setPhase((current) => (current === 'greeting' ? 'playing' : current));
  }, []);

  // Tapping the hello is a child saying "get on with it": the rest of it stops, rather than the
  // first word's instruction having to wait behind a greeting nobody is listening to any more.
  const skipGreeting = useCallback(() => {
    cancelSpeech();
    finishGreeting();
  }, [cancelSpeech, finishGreeting]);

  useEffect(() => {
    if (phase !== 'greeting' || !greeting) return undefined;
    const reduced = prefersReducedMotion();
    let animDone = false;
    let voiceDone = false;
    const maybeFinish = () => {
      if (animDone && voiceDone) finishGreeting();
    };
    const spoke = say(greeting.text, {
      rate: 0.92,
      pitch: 1.12,
      // However the hello leaves the queue — finished, failed or given up on — the round may
      // start. Only a deliberate skip cancels it, and that finishes the greeting itself.
      onEnd: (reason) => {
        if (reason === 'cancelled') return;
        voiceDone = true;
        maybeFinish();
      },
    });
    if (!spoke) voiceDone = true;
    greetingTimerRef.current = window.setTimeout(() => {
      animDone = true;
      maybeFinish();
    }, reduced ? GREETING_REDUCED_MS : GREETING_ANIM_MS);
    greetingMaxTimerRef.current = window.setTimeout(
      finishGreeting,
      reduced ? GREETING_REDUCED_MAX_MS : GREETING_MAX_MS,
    );
    return () => {
      window.clearTimeout(greetingTimerRef.current);
      window.clearTimeout(greetingMaxTimerRef.current);
    };
  }, [phase, greeting, say, finishGreeting]);

  // The repeat button is a direct request: it takes the voice over from whatever is speaking.
  const repeatWord = useCallback(() => {
    if (currentWord) say(formatMessage(copy.spellPrompt, { word: currentWord }), { id: 'prompt' });
    focusInput();
  }, [copy.spellPrompt, currentWord, focusInput, say]);

  const speakLetter = useCallback(
    (letter) => {
      say(getLetterSpeechText(letter, settings.locale), { rate: 0.65, pitch: 1.08 });
      window.requestAnimationFrame(focusInput);
    },
    [focusInput, say, settings.locale],
  );

  // Praise queues rather than interrupts: it belongs after the word it is praising, and the next
  // word's prompt then queues behind it in turn. No timer estimates when the voice will be free.
  const speakWordPraise = useCallback(
    () => {
      const praise = pickVaried(copy.wordFinishedSpeeches, lastWordPraiseIndexRef);
      if (praise) say(praise, { id: 'praise', mode: 'next' });
    },
    [copy.wordFinishedSpeeches, say],
  );

  // Spells a finished word back: every letter re-lit and re-named in turn, then the whole word,
  // then `onDone` — which is the round's ordinary hand-off, so nothing downstream needs to know
  // this happened. The beat owns no state the round needs, so cancelling or skipping it is safe at
  // any moment.
  const startSpellBack = useCallback(
    (letters, word, onDone) => {
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
      // The parent's switch is not enough on its own: with no speech engine the letters would file
      // past in silence at the spoken pace, so an unavailable voice takes the silent pace instead.
      const spoken = settings.speech && 'speechSynthesis' in window;
      const timers = [];
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        timers.forEach((timer) => window.clearTimeout(timer));
        window.clearTimeout(advanceTimerRef.current);
        if (spellBackRef.current?.finish === finish) spellBackRef.current = null;
        setSpellBack(null);
        onDone();
      };
      spellBackRef.current = { finish, timers };
      const at = (delay, action) => {
        if (delay <= 0) action();
        else timers.push(window.setTimeout(action, delay));
      };

      // Reduced motion drops the travelling light entirely (roadmap F4): the letters are already lit
      // by completion, so the word is simply named over the finished word.
      const namedLetters = reducedMotion ? [] : letters;

      if (spoken) {
        let visualIndex = -1;
        let speechActive = false;

        // Patience for one stage going silent, restarted by every sign of life. A working voice
        // reports boundaries all the way through the letters and then a real `end`, so this never
        // fires for it however long the word is; an engine that has stopped reporting is what it is
        // for. `timers` carries it, so leaving the round cancels it with everything else.
        let boxTimer = null;
        const armBox = (stage) => {
          window.clearTimeout(boxTimer);
          boxTimer = window.setTimeout(
            finish,
            Math.max(
              SPELL_BACK_BUDGET_MIN,
              estimateSpeechMs(stage.text, stage.rate) + SPELL_BACK_BUDGET_SLACK,
            ),
          );
          timers.push(boxTimer);
        };

        const showVisual = (index) => {
          if (finished || index <= visualIndex) return;
          visualIndex = Math.min(index, letters.length);
          setSpellBack({ index: visualIndex, speechActive });
        };
        const markAt = (marks, charIndex) => {
          let mark = 0;
          marks.forEach((offset, index) => {
            if (offset <= charIndex) mark = index;
          });
          return mark;
        };

        // Reduced motion has no travelling letter phase; it still gets the modestly faster word.
        const phrase = reducedMotion ? null : getSpellBackLetterSpeech(namedLetters, settings.locale);
        const stages = [];
        if (phrase) {
          stages.push({
            // The group light follows this stage's own real playback; only real boundaries, which
            // an engine may or may not report, add the stronger travelling letter light.
            onBoundary: (event) => {
              // A boundary is the voice reporting progress: the beat is not stalled, so wait again.
              armBox(stages[0]);
              if (!Number.isFinite(event.charIndex)) return;
              showVisual(markAt(phrase.marks, event.charIndex));
            },
            // The letters have really stopped, and the word has not really started. Both lights go
            // out for that gap rather than holding a letter that nothing is saying any more.
            onEnd: (reason) => {
              if (reason === 'cancelled' || finished) return;
              visualIndex = letters.length;
              speechActive = false;
              setSpellBack({ index: letters.length });
            },
            onStart: () => {
              armBox(stages[0]);
              speechActive = true;
              setSpellBack({
                index: visualIndex < 0 ? letters.length : visualIndex,
                speechActive: true,
              });
            },
            pitch: 1.08,
            rate: SPELL_BACK_LETTER_RATE,
            text: phrase.text,
          });
        }
        stages.push({
          // Queued behind the letters rather than chained through a callback, so the word is spoken
          // from their real end with no cancel between the two — the final letter always completes
          // first, and no engine gets the chance to co-articulate across the join.
          onEnd: (reason) => {
            if (reason !== 'cancelled') finish();
          },
          onStart: () => {
            armBox(stages[stages.length - 1]);
            visualIndex = letters.length;
            speechActive = true;
            setSpellBack({ index: letters.length, speechActive: true });
          },
          pitch: 1.08,
          rate: SPELL_BACK_WORD_RATE,
          text: word,
        });

        // No light until a stage actually starts speaking: the letters are lit as a group, and the
        // travelling light only ever claims a letter a real boundary reported.
        setSpellBack({ index: letters.length });
        if (speak(stages)) {
          // A working voice ends the beat on the word's real completion, always sooner than this;
          // an engine that never even starts is what this first arming catches.
          armBox(stages[0]);
          return;
        }
        // The engine refused outright; fall through to the silent beat.
      }

      // No voice: the pops carry the whole beat, and here a fast stagger is right because a pop is
      // instant. It has to feel complete without a word to hear at the end, so today's pause stands
      // in for one.
      const step = spellBackSilentStep(letters.length);
      const lettersPhase = namedLetters.length * step;
      namedLetters.forEach((letter, index) => {
        at(index * step, () => {
          setSpellBack({ index, pop: step });
          // F5: two semitones per letter, rooted afresh by this word-local index and capped at an
          // octave. The spell-back's 0.5 gain is already below the ordinary typing pop's 0.7.
          playEffect(popSfx, 0.5, { rate: pitchLadderRate(index) });
        });
      });
      at(lettersPhase, () => setSpellBack({ index: letters.length, pop: step }));
      at(lettersPhase + (lettersPhase ? SPELL_BACK_WORD_GAP : 0) + WORD_COMPLETION_PAUSE, finish);
      // The safety net, on `advanceTimerRef` so every existing cleanup already cancels it.
      advanceTimerRef.current = window.setTimeout(
        finish,
        lettersPhase + SPELL_BACK_WORD_GAP + WORD_COMPLETION_PAUSE
          + SPELL_BACK_SILENT_CEILING_BUFFER,
      );
    },
    [playEffect, settings.locale, settings.speech, speak],
  );

  // A tap or a keypress during the spell-back means "I've heard it" — the beat jumps to its end and
  // the round carries on from exactly where it would have.
  const skipSpellBack = useCallback(() => {
    const active = spellBackRef.current;
    if (!active) return false;
    cancelSpeech();
    active.finish();
    return true;
  }, [cancelSpeech]);

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

  // `hop` is false when the spell-back is about to take the letters over: two staggered animations
  // on the same letters would fight in the cascade, and the spell-back's slower one is the point.
  // The confetti and hearts fire either way — they are the "that's the word!" moment.
  const celebrateWord = useCallback((hop = true) => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    setCelebratingWord(hop);
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
      // The round is done — it belongs on the complete screen, not back in the resume offer.
      clearSession();
      setResumable(null);
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
  }, [clearSession, copy.roundFinishedSpeeches, pauseMusic, resetHintLadder, roundWords.length, say, signalFeedback, wordIndex]);

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
          missCountRef.current += 1;
          // Pointing at the right key sits between "try again" and giving the answer away,
          // so it applies in easy mode too — where there is no glyph left to reveal.
          if (missCountRef.current >= 2) setKeyHint(expected);
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
        const wordId = `${settings.locale}/${currentWord}`;
        const previousMastery = masteryOf(statsRef.current.words[wordId]);
        statsRef.current = recordWordCompleted(statsRef.current, {
          word: currentWord,
          locale: settings.locale,
          mistakes: wordMissesRef.current,
          durationMs: completionTime - wordStartRef.current,
          mode: settings.gameMode,
        });
        if (
          previousMastery !== 'mastered' &&
          masteryOf(statsRef.current.words[wordId]) === 'mastered'
        ) {
          progressRef.current = recordWordMastered(progressRef.current);
        }
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
        // The word is spelled: whatever is still being said about it is stale. The spell-back does
        // its own taking-over as it submits, so only the plain path needs to ask for silence here.
        if (!settings.spellBack) cancelSpeech();
        celebrateWord(!settings.spellBack);
        wordsSincePraiseRef.current += 1;
        // Praise is the beat *after* the spelling-back, never over the top of it.
        const praiseIsDue =
          !isLastWord && wordsSincePraiseRef.current >= wordPraiseGapRef.current;
        const praiseWord = () => {
          if (!praiseIsDue) return;
          wordsSincePraiseRef.current = 0;
          wordPraiseGapRef.current = randomWordPraiseGap();
          speakWordPraise();
        };

        if (settings.spellBack) {
          // The chime plays now — it is the "correct!" sound — and the spelling-back takes over the
          // pause that used to follow it, so the round moves on once the word has been said rather
          // than waiting out a second gap on top.
          playEffect(doneSfx, 0.7);
          startSpellBack(currentWordLetters, currentWord, () => {
            praiseWord();
            completeWord();
          });
          return;
        }

        praiseWord();

        if (isLastWord) {
          // Landing the ceremony on the end of the chime is the pleasant path, but it must never
          // be the *only* path: audio is an optional enhancement (AGENTS.md), and when playback
          // is blocked, silent or simply stalls, `onFinished` never arrives and the child is
          // stranded on a finished word with no way forward. So arm the hand-off now — on
          // `advanceTimerRef`, so every existing cleanup still cancels it — and let the chime,
          // if it does report back, bring it forward.
          let handedOff = false;
          advanceTimerRef.current = window.setTimeout(() => {
            handedOff = true;
            completeWord();
          }, LAST_WORD_ADVANCE_CEILING);
          playEffect(doneSfx, 0.7, {
            onFinished: () => {
              if (handedOff) return;
              handedOff = true;
              window.clearTimeout(advanceTimerRef.current);
              advanceTimerRef.current = window.setTimeout(completeWord, WORD_COMPLETION_PAUSE);
            },
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
      settings.spellBack,
      speakEncouragement,
      speakWordPraise,
      startSpellBack,
      wordIndex,
    ],
  );

  const handleInput = useCallback(
    (event) => {
      const value = event.currentTarget.value;
      event.currentTarget.value = '';
      if (skipSpellBack()) return;
      handleAttempt(value);
    },
    [handleAttempt, skipSpellBack],
  );

  // The on-screen keys and the tap-anywhere path share the skip, so every way a child can reach the
  // screen during the spelling-back ends it the same way.
  const handleKeyboardPress = useCallback(
    (letter) => {
      if (skipSpellBack()) return;
      handleAttempt(letter);
    },
    [handleAttempt, skipSpellBack],
  );

  const handlePlayScreenTap = useCallback(() => {
    skipSpellBack();
    focusInput();
  }, [focusInput, skipSpellBack]);

  const handleKeyDown = useCallback(
    (event) => {
      if (!/^\p{L}$/u.test(event.key)) return;
      event.preventDefault();
      event.currentTarget.value = '';
      // Typing during the spelling-back is a child saying "I know, get on with it". The keystroke
      // is spent on the skip rather than the next word, which is not even on screen yet.
      if (skipSpellBack()) return;
      handleAttempt(event.key);
    },
    [handleAttempt, skipSpellBack],
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
    setStickerBookMasteredWords(masteredWordsForLocale(statsRef.current, settings.locale));
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

  const celebrateBookBadges = useCallback((badgeIds) => {
    progressRef.current = celebrateBadges(progressRef.current, badgeIds);
    setVisibleProgress(progressRef.current);
    setStickerBookProgress(progressRef.current);
    persistProgress();
  }, [persistProgress]);

  const speakSticker = (word, stickerLocale) => {
    say(word, { locale: stickerLocale, rate: 0.78, pitch: 1.04 });
  };

  const openSettings = () => {
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
      window.localStorage.removeItem(profileStorageKey(SESSION_KEY, activeProfileId));
    } catch {
      // Nothing stored means nothing to erase.
    }
    statsRef.current = createEmptyStats();
    progressRef.current = createEmptyProgress();
    sessionStrugglesRef.current.clear();
    setVisibleProgress(progressRef.current);
    setSettingsStats(statsRef.current);
    setSettingsProgress(progressRef.current);
    setStickerBookProgress(progressRef.current);
    setStickerBookMasteredWords(new Set());
    setResumable(null);
  }, [activeProfileId]);

  // Home never throws a round away any more (owner request 2026-07-24): the mid-round snapshot is
  // left on disk, so the welcome screen can offer to resume exactly where the child was. Callers
  // that genuinely end the round — a rebuilt round, a new game — pass their own resume value
  // (usually null) rather than the stored one.
  const resetToWelcome = (nextResumable = resumableFor(activeProfileId, settingsRef.current.locale)) => {
    clearRoundTimers();
    window.clearTimeout(modeRevealTimerRef.current);
    setWelcomeStep('play');
    setNamingMode(null);
    setGreeting(null);
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
    setResumable(nextResumable);
    wordStarsRef.current = [];
    roundSettingsDirtyRef.current = false;
    setPhase('welcome');
    setSettingsOpen(false);
  };

  // Pick a stored round back up on exactly the word and letter it was left on. Resume plays the
  // very same words in the very same mode, whatever the current filters say, so "continue" always
  // means continue — never a quietly different round.
  const resumeRound = () => {
    const session = resumable ?? resumableFor(activeProfileId, settingsRef.current.locale);
    if (!session) {
      setResumable(null);
      return;
    }
    clearRoundTimers();
    window.clearTimeout(modeRevealTimerRef.current);
    cancelSpeech();

    if (session.gameMode !== settingsRef.current.gameMode) {
      const nextSettings = normaliseSettings({ ...settingsRef.current, gameMode: session.gameMode });
      settingsRef.current = nextSettings;
      setSettings(nextSettings);
    }
    // A valid resumable session is itself evidence that this child chose a mode before, even if
    // an old or partially written settings record no longer contains it.
    setHasRememberedMode(true);

    // Restore the scoring context so the closing star ceremony and the journey still add up.
    wordStarsRef.current = [...session.wordStars];
    roundStartStarsRef.current = session.startStars;
    roundAwardRef.current = {
      badge: null,
      journeyPosition: session.journeyStart,
      shiny: null,
      sticker: null,
      wasSuper: false,
    };
    const now = performance.now();
    roundStartRef.current = now;
    wordStartRef.current = now;
    letterStartRef.current = now;
    wordMissesRef.current = 0;
    roundMissesRef.current = 0;
    resetHintLadder();
    transitioningRef.current = false;
    wordsSincePraiseRef.current = 0;
    wordPraiseGapRef.current = randomWordPraiseGap();

    setNamingMode(null);
    setGreeting(null);
    setRoundColorSeed(session.colorSeed);
    setRoundWords(session.words);
    setWordIndex(session.wordIndex);
    setLetterIndex(session.letterIndex);
    setRoundKind(session.roundKind);
    setRoundReward(emptyRoundReward());
    setFeedback('idle');
    setFeedbackMessage('');
    setCelebratingWord(false);
    setConfettiVisible(false);
    setHeartBurstId(0);
    setSuperIntroVisible(false);
    setStickerBookOpen(false);
    setSettingsOpen(false);
    setResumable(null);
    setWhoIsPlayingVisible(false);
    setPhase('playing');

    primeEffects();
    selectNextMusicTrack();
    if (settingsRef.current.music) playMusic();
  };

  const restartWithSettings = (nextSettings) => {
    // A rebuilt round is a different round; the old snapshot no longer describes it.
    clearSession();
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    resetToWelcome(null);
  };

  // Switching child swaps three stores at once. Everything is set in this one handler so the
  // batched render sees the new profile id and the new settings together.
  const switchToProfile = (nextProfiles) => {
    const nextId = getActiveProfile(nextProfiles).id;
    let nextResumable = resumableFor(nextId, settingsRef.current.locale);
    if (nextId !== activeProfileId) {
      const nextSettings = loadSettings(nextId);
      const nextStats = loadStats(nextId);
      statsRef.current = nextStats;
      progressRef.current = loadProgress(nextId);
      sessionStrugglesRef.current.clear();
      sessionFilterKeyRef.current = null;
      settingsRef.current = nextSettings;
      setSettings(nextSettings);
      setHasRememberedMode(hasStoredGameMode(nextId));
      setVisibleProgress(progressRef.current);
      setStickerBookProgress(progressRef.current);
      setSettingsStats(statsRef.current);
      setSettingsProgress(progressRef.current);
      // Each child keeps their own resumable round, read in their own saved language.
      nextResumable = resumableFor(nextId, nextSettings.locale);
    }
    setProfiles(nextProfiles);
    resetToWelcome(nextResumable);
  };

  const openNameDialog = (mode, profileId = null) => setNameDialog({ mode, profileId });

  // Play hands the action slot to the two mode pictures. They are live immediately; the timer
  // only removes the now-unreachable slab after its short exit, so animation can never block play.
  const revealModeCards = () => {
    if (welcomeStep !== 'play') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true) {
      setWelcomeStep('modes');
      return;
    }
    setWelcomeStep('revealing');
    window.clearTimeout(modeRevealTimerRef.current);
    modeRevealTimerRef.current = window.setTimeout(() => setWelcomeStep('modes'), MODE_REVEAL_MS);
  };

  const playInMode = (gameMode, greetName) => {
    const next = normaliseSettings({ ...settingsRef.current, gameMode });
    settingsRef.current = next;
    setSettings(next);
    setHasRememberedMode(true);
    // Every start from the welcome screen greets the child by name; the name comes with the tap
    // so a just-typed one does not have to wait a render for the active profile to catch up.
    startRound({ settings: next, greet: Boolean(greetName), name: greetName });
  };

  // Choosing a card is choosing how to play *and* starting. A child who has never given their
  // name is asked for it at this point — after they have committed to playing, not before.
  const startRoundInMode = (gameMode) => {
    if (!profiles.profiles.some((profile) => profile.name)) {
      setNamingMode(gameMode);
      return;
    }
    playInMode(gameMode, activeProfile.name);
  };

  const submitWelcomeName = () => {
    const name = normaliseProfileName(welcomeName);
    if (!name) return;
    // Naming the unnamed default slot keeps the same active profile, so its settings, stats
    // and progress are already loaded — no store swap needed, just play.
    setProfiles(createProfile(profiles, name));
    setWelcomeName('');
    const mode = namingMode;
    setNamingMode(null);
    if (mode) playInMode(mode, name);
  };

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
    if (partial.gameMode === 'easy' || partial.gameMode === 'normal') {
      setHasRememberedMode(true);
    }
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
  // Player selection belongs only to the first welcome step. Once Play is pressed, the mode
  // pictures are the whole question rather than sharing the page with profile controls.
  const welcomeProfilePicker =
    namedProfiles.length > 0 && !namingMode && welcomeStep === 'play' ? (
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
    ) : null;
  const roundsRemaining = SUPER_ROUND_EVERY - roundReward.journeyPosition;
  // After this round the child is one step further along the arc; when they have filled every
  // step, the next round is the golden super round — the button says so.
  const nextIsSuper = phase === 'complete' && roundReward.journeyPosition >= SUPER_ROUND_EVERY - 1;
  // The welcome screen offers to resume only a stored round that is still in the language on
  // screen — a language switch has already rebuilt the world.
  const canResume = phase === 'welcome' && Boolean(resumable) && resumable.locale === settings.locale;
  const journeyMessage = roundReward.kind === 'super'
    ? copy.superRoundDone
    : roundsRemaining === 1
      ? copy.superRoundCountdownOne
      : formatMessage(copy.superRoundCountdownMany, { count: roundsRemaining });
  const roundStarsMessage = formatMessage(copy.roundStarsEarned, { count: earnedRoundStars });
  const rewardAriaLabel = roundReward.shiny
    ? copy.newShinyStickerAria
    : roundReward.sticker
      ? formatMessage(copy.newStickerAria, { word: roundReward.sticker.word })
      : '';
  const completeStatusMessage = phase === 'complete'
    ? joinAnnouncements([roundStarsMessage, rewardAriaLabel, journeyMessage])
    : '';
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
      data-palette={settings.palette}
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
        {(phase === 'playing' || phase === 'complete') && (
          <button type="button" className="icon-button" onClick={() => resetToWelcome()} aria-label={copy.home}>
            <HomeIcon />
          </button>
        )}
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
          bounce={phase === 'complete' && Boolean(roundReward.sticker || roundReward.shiny || roundReward.badge)}
          onClick={openStickerBook}
          recentSticker={mostRecentSticker}
        />
      )}

      {phase === 'welcome' && (
        <main className="welcome-screen">
          <img className="welcome-croc" src={croc} alt="" />
          <Wordmark name={copy.projectName} showEyes={settings.eyes} />
          {shouldShowWhoIsPlaying && welcomeStep === 'play' && (
            <section
              className="welcome-player-prompt"
              aria-labelledby="who-is-playing-heading"
            >
              <h2 id="who-is-playing-heading" className="welcome-player-prompt__heading">
                {copy.whoIsPlayingHeading}
              </h2>
              {welcomeProfilePicker}
            </section>
          )}
          {/* One reserved slot for Play, the cards it becomes, a resume offer, or the name
              question. Resume remains the only branch allowed to displace the staged start
              actions (D-015). */}
          <div className="welcome-action">
            {namingMode ? (
              // Asked only once a child has chosen how to play, so the first thing they meet is
              // the game, not a form.
              <div className="welcome-naming">
                <p className="welcome-naming__question">{copy.nameEntryTitle}</p>
                <NameField
                  value={welcomeName}
                  onChange={setWelcomeName}
                  onSubmit={submitWelcomeName}
                  label={copy.nameLabel}
                  showEyes={settings.eyes}
                  maxLength={MAX_NAME_LENGTH}
                  autoFocus
                />
                <button
                  type="button"
                  className="primary-button welcome-naming__confirm"
                  onClick={submitWelcomeName}
                  disabled={!normaliseProfileName(welcomeName)}
                >
                  {copy.nameReady}
                </button>
              </div>
            ) : canResume ? (
              // A returning child picks up exactly where they left off. Starting over is still one
              // quiet tap away, but continuing is the obvious thing to do.
              <div className="welcome-resume">
                <button
                  type="button"
                  className="primary-button welcome-resume__button"
                  onClick={resumeRound}
                >
                  {copy.resumeRound}
                </button>
                <button
                  type="button"
                  className="text-button welcome-resume__fresh"
                  onClick={() => setResumable(null)}
                >
                  {copy.startFresh}
                </button>
              </div>
            ) : (
              <>
                {welcomeStep !== 'play' && (
                  <ModeCards
                    revealed={welcomeStep === 'revealing'}
                    labels={{
                      easy: copy.modeCardEasy,
                      easyAria: copy.playEasyAria,
                      normal: copy.modeCardNormal,
                      normalAria: copy.playNormalAria,
                    }}
                    onPlay={startRoundInMode}
                    showEyes={settings.eyes}
                  />
                )}
                {welcomeStep !== 'modes' && (
                  <button
                    type="button"
                    className={`primary-button welcome-play-button${
                      welcomeStep === 'revealing' ? ' welcome-play-button--leaving' : ''
                    }`}
                    onClick={revealModeCards}
                    aria-hidden={welcomeStep === 'revealing' ? 'true' : undefined}
                    tabIndex={welcomeStep === 'revealing' ? -1 : undefined}
                  >
                    {copy.play}
                  </button>
                )}
              </>
            )}
          </div>
          {/* On a shared-device cold start the chips sit under their spoken heading. Otherwise
              they keep their established place below Play, and disappear with that first step. */}
          {!shouldShowWhoIsPlaying && welcomeProfilePicker}
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

      {phase === 'greeting' && greeting && (
        <main className="greeting-screen">
          {/* Tapping anywhere skips straight to the first word for a child who does not want to
              wait — the same escape hatch the super-round gift gives. */}
          <button
            type="button"
            className="greeting-screen__card"
            onClick={skipGreeting}
            aria-label={greeting.text}
          >
            <span className="greeting-screen__sparkles" aria-hidden="true">
              <span>★</span>
              <span>♥</span>
              <span>✦</span>
              <span>★</span>
            </span>
            <img className="greeting-screen__croc" src={croc} alt="" />
            <span className="greeting-screen__name">
              <NameTag name={greeting.name} showEyes={settings.eyes} size="field" />
            </span>
          </button>
        </main>
      )}

      {phase === 'playing' && (
        <main
          ref={playScreenRef}
          className={`play-screen ${
            drawsOwnKeyboard ? `play-screen--keys-${settings.keyboard}` : 'play-screen--keys-system'
          }`}
          // The stylesheet reserves the foot from the board's real row count rather than a guess per
          // mode, so a simple board that grew to a third row is reserved for correctly (D-023).
          style={{ '--keys-rows': keyboardRows.length }}
          onClick={handlePlayScreenTap}
        >
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
            className={`word${celebratingWord ? ' word--celebrating' : ''}${
              spellBack ? ' word--spelling' : ''
            }${spellBack?.speechActive ? ' word--speech-active' : ''}`}
            style={{
              '--letter-count': currentWordLetters.length,
              '--letter-size': `${Math.min(15, 94 / currentWordLetters.length)}vw`,
              ...(spellBack?.pop ? { '--spell-pop': `${Math.min(220, spellBack.pop)}ms` } : null),
            }}
            aria-label={formatMessage(copy.letterWord, { count: currentWordLetters.length })}
          >
            {currentWordLetters.map((letter, index) => (
              <Letter
                key={`${currentWord}-${index}`}
                letter={letter}
                state={index < letterIndex ? 'done' : index === letterIndex ? 'active' : 'waiting'}
                colorIndex={wordColors[index] ?? index}
                onSpeak={speakLetter}
                showEyes={settings.eyes}
                hidden={settings.gameMode === 'normal'}
                hint={index === letterIndex ? hintLevel : 'none'}
                spelling={spellBack?.index === index}
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
            // `readOnly` is what actually keeps the software keyboard shut on iOS; `inputMode`
            // is the same instruction for the browsers that honour it instead.
            readOnly={drawsOwnKeyboard}
            inputMode={drawsOwnKeyboard ? 'none' : 'text'}
            aria-label={copy.typeNextLetter}
            defaultValue=""
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
          />

          <LetterKeyboard
            rows={keyboardRows}
            highlight={keyHint}
            label={copy.keyboardLabel}
            onPress={handleKeyboardPress}
          />
        </main>
      )}

      {phase === 'complete' && (
        <main className="complete-screen">
          <div
            className="star-ceremony"
            role="img"
            aria-label={roundStarsMessage}
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
          <h1>{copy.completeHeading}</h1>
          <div className="complete-reward-slot">
            {roundReward.shiny ? (
              <div
                className="round-reward round-reward--shiny"
                role="img"
                aria-label={rewardAriaLabel}
              >
                <span className="shiny-gift" aria-hidden="true">🎁</span>
                <StickerPicture codepoint={roundReward.shiny} className="die-cut shiny" />
              </div>
            ) : roundReward.sticker ? (
              <div className="round-reward" role="img" aria-label={rewardAriaLabel}>
                <StickerPicture codepoint={roundReward.sticker.codepoint} className="die-cut" />
                <span className="round-reward__word">{roundReward.sticker.word}</span>
              </div>
            ) : null}
          </div>
          <JourneyStrip
            position={roundReward.journeyPosition}
            wasSuper={roundReward.kind === 'super'}
            message={journeyMessage}
          />
          <button
            type="button"
            className={`primary-button next-round-button${nextIsSuper ? ' next-round-button--super' : ''}`}
            onClick={() => startRound()}
          >
            {/* The super round is announced by a gold star on the ordinary green slab: a gold
                button on the sun-yellow page stopped reading as the call to action at all. */}
            {nextIsSuper && (
              <span className="next-round-button__star" aria-hidden="true">
                <StarIcon filled />
              </span>
            )}
            {nextIsSuper ? copy.startSuperRound : copy.nextRound}
            <ChevronIcon direction="next" />
          </button>
        </main>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {completeStatusMessage || feedbackMessage}
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
          masteredWords={stickerBookMasteredWords}
          progress={stickerBookProgress}
          onCelebrateBadges={celebrateBookBadges}
          onCelebratePages={celebrateBookPages}
          onClose={closeStickerBook}
          onSpeak={speakSticker}
        />
      )}
    </div>
  );
}
