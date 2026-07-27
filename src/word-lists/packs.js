const freezeWords = (words) => Object.freeze(
  Object.fromEntries(
    Object.entries(words).map(([locale, entries]) => [locale, Object.freeze(entries)]),
  ),
);

const englishAnimals = [
  'ant', 'bat', 'bee', 'bird', 'cat', 'cow', 'dog', 'duck', 'fish', 'frog',
  'goat', 'horse', 'mouse', 'pig', 'sheep', 'snail', 'snake', 'whale',
  'dolphin', 'lion', 'monkey', 'panda', 'rabbit', 'spider', 'tiger', 'turtle',
  'zebra', 'dinosaur', 'elephant', 'kangaroo', 'octopus',
];

const englishFood = [
  'apple', 'bread', 'cheese', 'corn', 'egg', 'milk', 'grape', 'carrot',
  'cookie', 'honey', 'lemon', 'pizza', 'banana', 'potato', 'tomato', 'orange',
  'melon', 'muffin', 'noodle', 'salad', 'sandwich', 'broccoli', 'cucumber',
  'hamburger', 'lemonade', 'pineapple', 'strawberry', 'watermelon',
];

const englishVehicles = [
  'bike', 'boat', 'bus', 'car', 'plane', 'ship', 'train', 'truck', 'bicycle',
  'engine', 'rocket', 'scooter', 'spaceship', 'tractor', 'caravan', 'helicopter',
  'motorcycle', 'submarine',
];

const englishNature = [
  'cloud', 'plant', 'rain', 'star', 'sun', 'tree', 'water', 'flower', 'garden',
  'rainbow', 'beach', 'forest', 'grass', 'hill', 'lake', 'leaf', 'moon',
  'mountain', 'ocean', 'river', 'snow', 'storm', 'wind', 'autumn', 'comet',
  'rock', 'spring', 'summer', 'sunset', 'winter', 'volcano',
];

export const WORD_PACKS = Object.freeze({
  animals: Object.freeze({
    labelKey: 'packAnimals',
    words: freezeWords({
      'en-GB': englishAnimals,
      'en-US': englishAnimals,
      'sv-SE': [
        'djur', 'fisk', 'får', 'get', 'hund', 'häst', 'katt', 'ko', 'lamm',
        'mus', 'orm', 'val', 'anka', 'apa', 'bäver', 'delfin', 'fågel', 'groda',
        'humla', 'kanin', 'lejon', 'panda', 'tiger', 'zebra', 'elefant',
        'krokodil',
      ],
      'hu-HU': [
        'hal', 'juh', 'ló', 'méh', 'nyúl', 'pók', 'sas', 'béka', 'cica', 'csiga',
        'delfin', 'kacsa', 'kecske', 'kígyó', 'kutya', 'medve', 'nyuszi',
        'pingvin', 'róka', 'teknős', 'tigris', 'zebra', 'elefánt', 'gorilla',
        'kenguru', 'krokodil', 'oroszlán',
      ],
    }),
  }),
  food: Object.freeze({
    labelKey: 'packFood',
    words: freezeWords({
      'en-GB': englishFood,
      'en-US': englishFood,
      'sv-SE': [
        'bröd', 'lök', 'mat', 'mjölk', 'nöt', 'ost', 'ägg', 'banan', 'bulle',
        'glassar', 'gurka', 'hallon', 'havre', 'jordgubb', 'kaka', 'lemonad',
        'melon', 'morot', 'muffin', 'pizza', 'sallad', 'skorpa', 'tomat',
        'våffla', 'äpple', 'ananas', 'broccoli', 'grönsaker', 'hamburgare',
        'potatis', 'spagetti', 'vattenmelon',
      ],
      'hu-HU': [
        'bab', 'fánk', 'hús', 'méz', 'rizs', 'sajt', 'só', 'tej', 'alma',
        'citrom', 'dinnye', 'fagyi', 'kenyér', 'málna', 'narancs', 'perec',
        'répa', 'süti', 'szőlő', 'torta', 'ananász', 'brokkoli', 'cseresznye',
        'hamburger', 'narancslé', 'saláta', 'uborka', 'csokoládé',
        'görögdinnye', 'kukorica', 'limonádé', 'makaróni', 'palacsinta',
        'paradicsom',
      ],
    }),
  }),
  vehicles: Object.freeze({
    labelKey: 'packVehicles',
    words: freezeWords({
      'en-GB': englishVehicles,
      'en-US': englishVehicles,
      'sv-SE': [
        'bil', 'buss', 'båt', 'lok', 'skepp', 'tåg', 'cykel', 'kanot', 'kärra',
        'raket', 'ambulans', 'helikopter', 'lokomotiv', 'motorcykel',
        'rullskridskor',
      ],
      'hu-HU': [
        'busz', 'tank', 'csónak', 'hajó', 'szánkó', 'vonat', 'autó', 'bicikli',
        'kerékpár', 'korcsolya', 'rakéta', 'villamos', 'autóbusz', 'helikopter',
        'mentőautó',
      ],
    }),
  }),
  nature: Object.freeze({
    labelKey: 'packNature',
    words: freezeWords({
      'en-GB': englishNature,
      'en-US': englishNature,
      'sv-SE': [
        'berg', 'eld', 'fjäll', 'flod', 'frö', 'gräs', 'hav', 'höst', 'is',
        'jord', 'löv', 'moln', 'park', 'regn', 'sjö', 'skog', 'snö', 'sol',
        'strand', 'tall', 'träd', 'vind', 'blomma', 'stjärna', 'vatten',
        'vinter', 'åska', 'regnbåge', 'vulkan', 'vattenfall',
      ],
      'hu-HU': [
        'ág', 'domb', 'ég', 'éj', 'fa', 'föld', 'hó', 'hold', 'kert', 'kő',
        'láng', 'park', 'rét', 'sár', 'szél', 'tél', 'tó', 'tűz', 'víz', 'erdő',
        'felhő', 'levél', 'napsugár', 'szivárvány', 'tulipán', 'vulkán',
      ],
    }),
  }),
});

// Existing Noto Emoji sticker assets; no new visual or licence is introduced by the picker.
export const WORD_PACK_ICONS = Object.freeze({
  all: '1f308',
  animals: '1f431',
  food: '1f34e',
  vehicles: '1f697',
  nature: '1f333',
});
