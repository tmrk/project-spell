const WORDS_BY_SYLLABLE = Object.freeze({
  1: [
    'ág', 'ágy', 'arc', 'bab', 'báb', 'baj', 'bál', 'bank', 'bőr', 'bot', 'bolt',
    'borz', 'busz', 'cél', 'csend', 'csík', 'csók', 'csont', 'csúcs', 'dal', 'domb',
    'dob', 'ég', 'éj', 'él', 'ér', 'fa', 'fal', 'fánk', 'fej', 'fény', 'fog', 'föld',
    'fül', 'gyár', 'gyík', 'gyöngy', 'hal', 'hang', 'harc', 'híd', 'hó', 'hold', 'hús',
    'ház', 'íj', 'jég', 'jel', 'juh', 'kar', 'kard', 'kép', 'kert', 'kéz', 'kincs',
    'kor', 'kos', 'kör', 'köd', 'könyv', 'kő', 'kulcs', 'kút', 'láb', 'láng', 'lánc',
    'ló', 'méh', 'mell', 'méz', 'nyúl', 'orr', 'őz', 'pad', 'pap', 'park', 'pók',
    'polc', 'pont', 'rajz', 'rét', 'rizs', 'rúd', 'sajt', 'sas', 'sár', 'sín', 'só', 'száj',
    'szarv', 'szék', 'szél', 'szem', 'szín', 'szív', 'tál', 'tank', 'tej', 'tél',
    'toll', 'tó', 'tűz', 'ujj', 'út', 'vad', 'vár', 'vér', 'víz', 'zöld', 'zsák',
  ],
  2: [
    'ablak', 'ajtó', 'alma', 'anya', 'apa', 'asztal', 'bagoly', 'balta', 'bolygó',
    'bőrönd',
    'barlang', 'bárány', 'béka', 'bögre', 'cica', 'cipő', 'citrom', 'csibe', 'csiga',
    'csillag', 'csónak', 'darázs', 'dinnye', 'doboz', 'doktor', 'erdő', 'fagyi',
    'delfin', 'dínó', 'farkas', 'felhő', 'festék', 'fészek', 'fóka', 'földgömb',
    'füzet', 'gomba',
    'gólya', 'golyó', 'gyerek', 'gyertya', 'hajó', 'hangszer', 'hinta', 'hörcsög',
    'kabát', 'kacsa',
    'kanál', 'kapu', 'kecske', 'kenyér', 'kerék', 'kesztyű',
    'kígyó', 'király', 'kocka', 'konyha', 'kosár', 'kutya', 'lámpa', 'labda', 'levél',
    'maci', 'málna', 'mama', 'manó', 'medve', 'mese', 'mókus', 'nadrág', 'narancs',
    'nyuszi', 'olló', 'papír', 'párna', 'perec', 'pingvin', 'pulyka', 'répa',
    'robot', 'róka', 'ruha', 'sapka', 'sárga', 'sárkány', 'seprű', 'süti', 'szalag', 'szánkó',
    'szoba', 'szőlő', 'tányér', 'teknős', 'tigris',
    'torta', 'tükör', 'udvar', 'üveg', 'vödör', 'vonat', 'vulkán', 'zebra', 'zokni', 'zsiráf',
  ],
  3: [
    'állatkert', 'állatok', 'ananász', 'autó', 'bicikli', 'brokkoli', 'buborék',
    'ceruza', 'cseresznye', 'csillámpor', 'dominó', 'elefánt', 'eperfa', 'esernyő', 'fagylaltos',
    'felhőkarc', 'gorilla', 'hajnalka', 'halacska', 'hamburger', 'hóember', 'iskola',
    'iskolás', 'kamera', 'kisbaba',
    'karácsony', 'katica', 'kenguru', 'kerékpár', 'korcsolya', 'krokodil', 'lábasok',
    'madárka', 'mágneses', 'malacka', 'matrica', 'méhecske', 'mikrofon', 'mosolygós',
    'napsugár', 'narancslé', 'óvodás', 'oroszlán', 'papagáj',
    'pillangó', 'rádió', 'rakéta', 'saláta', 'szivárvány', 'szombaton', 'takaró',
    'telefon', 'tulipán', 'uborka', 'varázsló', 'vasárnap', 'villamos', 'zenekar',
  ],
  4: [
    'ábécéskönyv', 'akvárium', 'autóbusz', 'csokoládé', 'fényképező', 'focilabda',
    'görögdinnye', 'helikopter', 'hullámvasút', 'kukorica', 'limonádé', 'makaróni',
    'kalandoskönyv', 'palacsinta', 'papírsárkány', 'paradicsom', 'szivárványos',
    'születésnap', 'telefonál', 'univerzum', 'vakáció', 'vízilabda',
  ],
  5: [
    'dinoszaurusz', 'hippopotámusz', 'katicabogár', 'matematika', 'mentőautó',
    'mozdonyvezető', 'televízió',
  ],
  6: [
    'csokoládétorta', 'laboratórium',
  ],
});

export const wordBank = Object.freeze(
  Object.entries(WORDS_BY_SYLLABLE).flatMap(([syllables, words]) =>
    words.map((word) => Object.freeze({ word, syllables: Number(syllables) })),
  ),
);
