import { DEFAULT_LOCALE, normaliseLocale } from './locales';
import {
  excludedWords as britishExcludedWords,
  regionalWords as britishRegionalWords,
} from './word-lists/en-GB';
import {
  excludedWords as usExcludedWords,
  regionalWords as usRegionalWords,
} from './word-lists/en-US';
import { wordBank as hungarianWordBank } from './word-lists/hu-HU';
import { wordBank as swedishWordBank } from './word-lists/sv-SE';

export const SETTINGS_KEY = 'project-spell:settings:v1';

export const DEFAULT_SETTINGS = Object.freeze({
  locale: DEFAULT_LOCALE,
  minLetters: 3,
  maxLetters: 8,
  syllables: 'any',
  roundLength: 5,
  wordSource: 'all',
  customWords: '',
  music: true,
  soundEffects: true,
  speech: true,
  eyes: true,
  acceptUnaccented: false,
});

export const PRESETS = Object.freeze({
  starter: {
    settings: { minLetters: 3, maxLetters: 5, syllables: '1', roundLength: 5 },
  },
  explorer: {
    settings: { minLetters: 3, maxLetters: 8, syllables: 'any', roundLength: 8 },
  },
  challenge: {
    settings: { minLetters: 6, maxLetters: 12, syllables: 'any', roundLength: 10 },
  },
});

const CORE_WORD_BANK = Object.freeze([
  { word: 'ant', syllables: 1 },
  { word: 'bat', syllables: 1 },
  { word: 'bee', syllables: 1 },
  { word: 'bird', syllables: 1 },
  { word: 'book', syllables: 1 },
  { word: 'cake', syllables: 1 },
  { word: 'cat', syllables: 1 },
  { word: 'chair', syllables: 1 },
  { word: 'cloud', syllables: 1 },
  { word: 'cow', syllables: 1 },
  { word: 'crab', syllables: 1 },
  { word: 'cup', syllables: 1 },
  { word: 'dog', syllables: 1 },
  { word: 'duck', syllables: 1 },
  { word: 'fish', syllables: 1 },
  { word: 'frog', syllables: 1 },
  { word: 'goat', syllables: 1 },
  { word: 'hat', syllables: 1 },
  { word: 'horse', syllables: 1 },
  { word: 'kite', syllables: 1 },
  { word: 'moon', syllables: 1 },
  { word: 'mouse', syllables: 1 },
  { word: 'pig', syllables: 1 },
  { word: 'plant', syllables: 1 },
  { word: 'rain', syllables: 1 },
  { word: 'sheep', syllables: 1 },
  { word: 'shoe', syllables: 1 },
  { word: 'snail', syllables: 1 },
  { word: 'snake', syllables: 1 },
  { word: 'spoon', syllables: 1 },
  { word: 'star', syllables: 1 },
  { word: 'sun', syllables: 1 },
  { word: 'train', syllables: 1 },
  { word: 'tree', syllables: 1 },
  { word: 'whale', syllables: 1 },
  { word: 'apple', syllables: 2 },
  { word: 'baby', syllables: 2 },
  { word: 'basket', syllables: 2 },
  { word: 'button', syllables: 2 },
  { word: 'candle', syllables: 2 },
  { word: 'carrot', syllables: 2 },
  { word: 'cookie', syllables: 2 },
  { word: 'dolphin', syllables: 2 },
  { word: 'dragon', syllables: 2 },
  { word: 'flower', syllables: 2 },
  { word: 'garden', syllables: 2 },
  { word: 'honey', syllables: 2 },
  { word: 'kitten', syllables: 2 },
  { word: 'lemon', syllables: 2 },
  { word: 'lion', syllables: 2 },
  { word: 'monkey', syllables: 2 },
  { word: 'music', syllables: 2 },
  { word: 'panda', syllables: 2 },
  { word: 'pencil', syllables: 2 },
  { word: 'pirate', syllables: 2 },
  { word: 'pizza', syllables: 2 },
  { word: 'planet', syllables: 2 },
  { word: 'rabbit', syllables: 2 },
  { word: 'rainbow', syllables: 2 },
  { word: 'rocket', syllables: 2 },
  { word: 'spider', syllables: 2 },
  { word: 'table', syllables: 2 },
  { word: 'tiger', syllables: 2 },
  { word: 'turtle', syllables: 2 },
  { word: 'water', syllables: 2 },
  { word: 'window', syllables: 2 },
  { word: 'zebra', syllables: 2 },
  { word: 'animal', syllables: 3 },
  { word: 'banana', syllables: 3 },
  { word: 'bicycle', syllables: 3 },
  { word: 'computer', syllables: 3 },
  { word: 'dinosaur', syllables: 3 },
  { word: 'elephant', syllables: 3 },
  { word: 'kangaroo', syllables: 3 },
  { word: 'ladybird', syllables: 3 },
  { word: 'octopus', syllables: 3 },
  { word: 'potato', syllables: 3 },
  { word: 'tomato', syllables: 3 },
  { word: 'umbrella', syllables: 3 },
]);

const EXTRA_WORDS_BY_SYLLABLE = Object.freeze({
  1: [
    'ace', 'ape', 'arm', 'bag', 'ball', 'beach', 'bear', 'bed', 'bell', 'bike', 'boat',
    'boot', 'box', 'bread', 'brick', 'brush', 'bus', 'cap', 'car', 'cheese', 'chick',
    'coat', 'coin', 'corn', 'deer', 'desk', 'doll', 'door', 'dress', 'drum', 'egg',
    'farm', 'flag', 'flame', 'floor', 'fly', 'foot', 'fork', 'fox', 'game', 'gate',
    'gift', 'glass', 'glove', 'grape', 'grass', 'heart', 'hen', 'hill', 'house', 'jam',
    'jar', 'juice', 'key', 'king', 'lake', 'lamp', 'leaf', 'light', 'milk', 'nest',
    'night', 'nose', 'owl', 'park', 'pen', 'plane', 'plate', 'queen', 'ring', 'rock',
    'shell', 'ship', 'shop', 'skate', 'snow', 'sock', 'spring', 'stone', 'storm',
    'swing', 'tent', 'truck', 'wheel', 'wind', 'wing', 'wolf', 'zoo',
  ],
  2: [
    'acorn', 'artist', 'autumn', 'backpack', 'bacon', 'baker', 'balloon', 'baseball',
    'bathtub', 'bedroom', 'beehive', 'birthday', 'blanket', 'bottle', 'bubble', 'bucket',
    'bunny', 'cabin', 'cactus', 'candy', 'cartoon', 'castle', 'chicken', 'chimney',
    'circle', 'circus', 'city', 'classroom', 'coffee', 'comet', 'corner', 'cousin',
    'cowboy', 'crayon', 'daisy', 'dinner', 'doctor', 'donkey', 'doodle', 'elbow',
    'engine', 'fairy', 'farmer', 'feather', 'finger', 'football', 'forest', 'giant',
    'ginger', 'giraffe', 'hamster', 'happy', 'helmet', 'island', 'jacket', 'jelly',
    'jungle', 'kitchen', 'ladder', 'letter', 'lizard', 'magic', 'magnet', 'maple',
    'market', 'melon', 'mirror', 'morning', 'mountain', 'muffin', 'napkin', 'noodle',
    'number', 'ocean', 'orange', 'paper', 'parrot', 'peanut', 'penguin', 'people',
    'pickle', 'picnic', 'pillow', 'playground', 'pocket', 'pony', 'puppy', 'purple',
    'puzzle', 'river', 'robin', 'salad', 'sandwich', 'scooter', 'sister', 'soccer',
    'spaceship', 'story', 'summer', 'sunset', 'teacher', 'teddy', 'toothbrush',
    'tractor', 'trumpet', 'tunnel', 'walrus', 'winter', 'yellow', 'zipper',
  ],
  3: [
    'adventure', 'astronaut', 'basketball', 'broccoli', 'buffalo', 'butterfly',
    'calendar', 'camera', 'caravan', 'carnival', 'celery', 'cinema', 'coconut',
    'crocodile', 'cucumber', 'daffodil', 'domino', 'energy', 'envelope', 'exercise',
    'family', 'favourite', 'flamingo', 'galaxy', 'gorilla', 'hamburger', 'holiday',
    'hospital', 'jellyfish', 'koala', 'lemonade', 'library', 'magazine', 'medicine',
    'microphone', 'orchestra', 'pelican', 'piano', 'pineapple', 'porcupine', 'radio',
    'raspberry', 'remember', 'saturday', 'skeleton', 'strawberry', 'submarine',
    'sunflower', 'telephone', 'tomorrow', 'triangle', 'unicorn', 'vegetable', 'violin',
    'vitamin', 'volcano', 'yesterday',
  ],
  4: [
    'alligator', 'aquarium', 'binoculars', 'calculator', 'caterpillar', 'celebration',
    'decoration', 'dictionary', 'education', 'helicopter', 'macaroni', 'motorcycle',
    'photography', 'rhinoceros', 'rollercoaster', 'supermarket', 'television',
    'ukulele', 'watermelon',
  ],
  5: ['electricity', 'hippopotamus', 'imagination', 'opportunity', 'refrigerator'],
});

const BASE_WORD_BANK = Object.freeze([
  ...CORE_WORD_BANK,
  ...Object.entries(EXTRA_WORDS_BY_SYLLABLE).flatMap(([syllables, words]) =>
    words.map((word) => ({ word, syllables: Number(syllables) })),
  ),
]);

function buildWordBank(excludedWords, regionalWords) {
  const excluded = new Set(excludedWords);
  const words = [...BASE_WORD_BANK.filter(({ word }) => !excluded.has(word)), ...regionalWords];
  return Object.freeze([...new Map(words.map((entry) => [entry.word, entry])).values()]);
}

export const WORD_BANKS = Object.freeze({
  'en-GB': buildWordBank(britishExcludedWords, britishRegionalWords),
  'en-US': buildWordBank(usExcludedWords, usRegionalWords),
  'sv-SE': swedishWordBank,
  'hu-HU': hungarianWordBank,
});

// Kept as the British-English default for existing imports.
export const WORD_BANK = WORD_BANKS[DEFAULT_LOCALE];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const asInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function normaliseSettings(value = {}) {
  const minLetters = clamp(asInteger(value.minLetters, DEFAULT_SETTINGS.minLetters), 2, 12);
  const maxLetters = clamp(
    asInteger(value.maxLetters, DEFAULT_SETTINGS.maxLetters),
    minLetters,
    14,
  );
  const syllables = ['any', '1', '2', '3', '4+'].includes(value.syllables)
    ? value.syllables
    : DEFAULT_SETTINGS.syllables;

  return {
    locale: normaliseLocale(value.locale),
    minLetters,
    maxLetters,
    syllables,
    roundLength: clamp(asInteger(value.roundLength, DEFAULT_SETTINGS.roundLength), 3, 20),
    wordSource: value.wordSource === 'custom' ? 'custom' : 'all',
    customWords: typeof value.customWords === 'string' ? value.customWords.slice(0, 4000) : '',
    music: typeof value.music === 'boolean' ? value.music : DEFAULT_SETTINGS.music,
    soundEffects:
      typeof value.soundEffects === 'boolean' ? value.soundEffects : DEFAULT_SETTINGS.soundEffects,
    speech: typeof value.speech === 'boolean' ? value.speech : DEFAULT_SETTINGS.speech,
    eyes: typeof value.eyes === 'boolean' ? value.eyes : DEFAULT_SETTINGS.eyes,
    acceptUnaccented:
      typeof value.acceptUnaccented === 'boolean'
        ? value.acceptUnaccented
        : DEFAULT_SETTINGS.acceptUnaccented,
  };
}

export function estimateSyllables(word, locale = DEFAULT_LOCALE) {
  const normalisedLocale = normaliseLocale(locale);
  const cleaned = String(word).normalize('NFC').toLocaleLowerCase(normalisedLocale);
  if (!cleaned) return 1;
  if (cleaned.length <= 3) return 1;

  if (normalisedLocale === 'hu-HU') {
    return Math.max(1, cleaned.match(/[aáeéiíoóöőuúüű]/gu)?.length ?? 1);
  }

  if (normalisedLocale === 'sv-SE') {
    return Math.max(1, cleaned.match(/[aeiouyåäö]+/gu)?.length ?? 1);
  }

  const withoutSilentEnd = cleaned.replace(/[^a-z]/g, '')
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/u, '')
    .replace(/^y/u, '');
  return Math.max(1, withoutSilentEnd.match(/[aeiouy]{1,2}/gu)?.length ?? 1);
}

export function parseCustomWords(value = '', locale = DEFAULT_LOCALE) {
  const unique = new Map();
  const normalisedLocale = normaliseLocale(locale);

  value
    .split(/[\n,]+/u)
    .map((word) => word.trim().normalize('NFC').toLocaleLowerCase(normalisedLocale))
    .filter((word) => /^\p{L}{2,14}$/u.test(word))
    .forEach((word) => {
      if (!unique.has(word)) {
        unique.set(word, { word, syllables: estimateSyllables(word, normalisedLocale) });
      }
    });

  return [...unique.values()];
}

const stripAccents = (value) => value.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');

export function lettersMatch(expected, attempt, acceptUnaccented = false) {
  const expectedLetter = String(expected).normalize('NFC').toLocaleLowerCase();
  const attemptedLetter = String(attempt).normalize('NFC').toLocaleLowerCase();
  if (expectedLetter === attemptedLetter) return true;
  if (!acceptUnaccented) return false;

  const plainExpected = stripAccents(expectedLetter);
  const plainAttempt = stripAccents(attemptedLetter);
  return (
    expectedLetter !== plainExpected &&
    attemptedLetter === plainAttempt &&
    plainExpected === plainAttempt
  );
}

export function getEligibleWords(value = DEFAULT_SETTINGS) {
  const settings = normaliseSettings(value);
  const customWords = parseCustomWords(settings.customWords, settings.locale);
  const source = settings.wordSource === 'custom'
    ? customWords
    : [...WORD_BANKS[settings.locale], ...customWords];
  const unique = new Map(source.map((entry) => [entry.word, entry]));

  return [...unique.values()].filter(({ word, syllables }) => {
    const letterCount = [...word].length;
    const isCorrectLength = letterCount >= settings.minLetters && letterCount <= settings.maxLetters;
    const isCorrectSyllableCount =
      settings.syllables === 'any' ||
      settings.syllables === String(syllables) ||
      (settings.syllables === '4+' && syllables >= 4);
    return isCorrectLength && isCorrectSyllableCount;
  });
}

function shuffle(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createRound(value = DEFAULT_SETTINGS, random = Math.random) {
  const settings = normaliseSettings(value);
  const eligible = getEligibleWords(settings).map(({ word }) => word);
  if (!eligible.length) return [];

  const round = [];
  while (round.length < settings.roundLength) {
    const nextBatch = shuffle(eligible, random);
    if (nextBatch.length > 1 && round.at(-1) === nextBatch[0]) {
      [nextBatch[0], nextBatch[1]] = [nextBatch[1], nextBatch[0]];
    }
    round.push(...nextBatch);
  }

  return round.slice(0, settings.roundLength);
}
