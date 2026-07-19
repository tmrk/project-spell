// Noto Emoji codepoints (Apache-2.0), grouped so translated words share one picture.
const WORD_GROUPS = Object.freeze([
  ['1f41c', ['ant'], [], []],
  ['1f987', ['bat'], [], []],
  ['1f41d', ['bee'], ['humla'], ['méh', 'méhecske']],
  ['1f426', ['bird', 'robin'], ['fågel', 'djur'], ['madárka']],
  ['1f4d6', ['book', 'dictionary', 'magazine'], ['bok', 'böcker', 'tidning', 'bibliotek'], ['könyv', 'ábécéskönyv', 'kalandoskönyv']],
  ['1f370', ['cake', 'birthday'], ['kaka', 'födelsedag', 'födelsedagar', 'chokladkaka'], ['torta', 'születésnap', 'csokoládétorta']],
  ['1f431', ['cat', 'kitten'], ['katt'], ['cica']],
  ['1fa91', ['chair'], ['stol'], ['szék']],
  ['2601', ['cloud'], ['moln'], ['felhő']],
  ['1f404', ['cow'], ['ko'], []],
  ['1f980', ['crab'], [], []],
  ['2615', ['cup', 'coffee'], ['kopp'], ['bögre']],
  ['1f436', ['dog', 'puppy'], ['hund'], ['kutya']],
  ['1f986', ['duck'], ['anka'], ['kacsa']],
  ['1f41f', ['fish', 'goldfish'], ['fisk', 'guldfisk', 'gädda'], ['hal']],
  ['1f438', ['frog'], ['groda'], ['béka']],
  ['1f410', ['goat'], ['get'], ['kecske']],
  ['1f3a9', ['hat', 'cap'], ['hatt'], ['sapka']],
  ['1f434', ['horse', 'pony'], ['häst'], ['ló']],
  ['1fa81', ['kite'], [], ['papírsárkány']],
  ['1f319', ['moon', 'night'], ['natt'], ['hold', 'éj']],
  ['1f42d', ['mouse'], ['mus'], []],
  ['1f437', ['pig'], [], ['malacka']],
  ['1f331', ['plant', 'garden'], ['frö', 'trädgård'], ['kert']],
  ['1f327', ['rain', 'storm'], ['regn', 'åska'], []],
  ['1f411', ['sheep'], ['får', 'lamm'], ['juh', 'bárány']],
  ['1f45f', ['shoe', 'boot'], ['sko', 'känga', 'sandaler'], ['cipő']],
  ['1f40c', ['snail'], ['snigel'], ['csiga']],
  ['1f40d', ['snake'], ['orm'], ['kígyó']],
  ['1f944', ['spoon'], ['sked'], ['kanál']],
  ['2b50', ['star'], ['stjärna'], ['csillag']],
  ['2600', ['sun', 'sunset'], ['sol'], ['napsugár']],
  ['1f686', ['train', 'engine'], ['tåg', 'lok', 'lokomotiv'], ['vonat', 'mozdonyvezető']],
  ['1f333', ['tree', 'forest'], ['träd', 'skog', 'tall'], ['fa', 'erdő']],
  ['1f40b', ['whale'], ['val'], []],
  ['1f34e', ['apple'], ['äpple'], ['alma']],
  ['1f476', ['baby'], [], ['kisbaba']],
  ['1f9fa', ['basket'], ['kasse'], ['kosár']],
  ['1f7e0', ['button', 'ball'], ['boll', 'kula'], ['labda', 'golyó']],
  ['1f56f', ['candle'], ['ljus'], ['gyertya']],
  ['1f955', ['carrot'], ['morot'], ['répa']],
  ['1f36a', ['cookie'], ['skorpa', 'pepparkaka', 'pepparkakor'], ['süti']],
  ['1f42c', ['dolphin'], ['delfin'], ['delfin']],
  ['1f409', ['dragon'], ['drake'], ['sárkány']],
  ['1f33a', ['flower', 'daisy', 'daffodil', 'sunflower'], ['blomma', 'tulpan'], ['tulipán', 'hajnalka']],
  ['1f36f', ['honey'], [], ['méz']],
  ['1f34b', ['lemon', 'lemonade'], ['lemonad'], ['citrom', 'limonádé']],
  ['1f981', ['lion'], ['lejon'], ['oroszlán']],
  ['1f412', ['monkey'], ['apa', 'gorilla'], ['gorilla']],
  ['1f3b5', ['music', 'orchestra'], ['musik', 'orkester'], ['hangszer', 'zenekar']],
  ['1f43c', ['panda'], ['panda'], []],
  ['270f', ['pencil', 'crayon', 'doodle'], ['penna', 'krita', 'teckna'], ['ceruza', 'rajz']],
  ['1f480', ['pirate', 'skeleton'], ['skelett'], []],
  ['1f355', ['pizza'], ['pizza'], []],
  ['1fa90', ['planet', 'galaxy'], [], ['bolygó']],
  ['1f407', ['rabbit', 'bunny'], ['kanin', 'hare'], ['nyúl', 'nyuszi']],
  ['1f308', ['rainbow'], ['regnbåge'], ['szivárvány', 'szivárványos']],
  ['1f680', ['rocket', 'spaceship'], ['raket'], ['rakéta']],
  ['1f577', ['spider'], ['spindel'], ['pók']],
  ['1f42f', ['tiger'], ['tiger'], ['tigris']],
  ['1f422', ['turtle'], ['sköldpadda'], ['teknős']],
  ['1f4a7', ['water', 'ocean'], ['vatten', 'hav'], ['víz']],
  ['1fa9f', ['window'], ['fönster'], ['ablak']],
  ['1f993', ['zebra'], ['zebra'], ['zebra']],
  ['1f418', ['elephant'], ['elefant'], ['elefánt']],
  ['1f996', ['dinosaur'], ['dinosaurie'], ['dínó', 'dinoszaurusz']],
  ['1f998', ['kangaroo'], ['känguru'], ['kenguru']],
  ['1f419', ['octopus'], [], []],
  ['1f954', ['potato'], ['potatis'], []],
  ['1f345', ['tomato'], ['tomat'], ['paradicsom']],
  ['2614', ['umbrella'], [], ['esernyő']],
  ['1f9f8', ['teddy', 'doll'], ['nalle', 'docka'], ['maci']],
  ['1f6b2', ['bike', 'bicycle'], ['cykel'], ['bicikli', 'kerékpár']],
  ['1f68c', ['bus'], ['buss'], ['busz', 'autóbusz']],
  ['1f697', ['car'], ['bilar'], ['autó']],
  ['2708', ['plane', 'airplane', 'aeroplane'], [], []],
  ['1f69a', ['truck', 'lorry'], [], []],
  ['1f6a2', ['boat', 'ship'], ['båt', 'skepp'], ['hajó', 'csónak']],
  ['1f3e0', ['house', 'cabin', 'apartment'], ['hus'], ['ház']],
  ['1f6aa', ['door', 'gate'], ['dörr'], ['ajtó', 'kapu']],
  ['1f6cf', ['bed', 'bedroom', 'pillow'], ['säng', 'kudde'], ['ágy', 'párna']],
  ['1f9e6', ['sock'], ['strumpa'], ['zokni']],
  ['1f9e5', ['coat', 'jacket', 'sweater', 'jumper'], ['jacka', 'tröja'], ['kabát']],
  ['1f456', ['pants', 'trousers'], ['byxor'], ['nadrág']],
  ['1f457', ['dress'], ['kjolar'], ['ruha']],
  ['1f9e4', ['glove'], ['vantar'], ['kesztyű']],
  ['1f453', ['glass'], ['glas'], ['üveg']],
  ['1f511', ['key'], ['nyckel'], ['kulcs']],
  ['1f4a1', ['light'], ['lampa', 'ljus'], ['lámpa', 'fény']],
  ['1f48d', ['ring'], ['ring'], ['gyűrű']],
  ['1f381', ['gift'], ['medalj'], ['szalag']],
  ['1f388', ['balloon'], ['ballong'], ['buborék']],
  ['1f3c6', ['medal'], ['medalj'], ['kincs']],
  ['1f3f0', ['castle'], ['slott'], ['vár']],
  ['1f451', ['king', 'queen'], ['kung', 'prinsessa'], ['király']],
  ['1f9da', ['fairy', 'magic'], ['magisk'], ['varázsló']],
  ['1f916', ['robot'], ['robot'], ['robot']],
  ['1f47d', ['alien'], [], []],
  ['1f9d1_200d_1f680', ['astronaut'], ['astronaut'], []],
  ['1f52d', ['telescope'], ['teleskop', 'kikare'], []],
  ['1f4f7', ['camera', 'photography'], ['kamera', 'fotograf'], ['kamera', 'fényképező']],
  ['1f4de', ['telephone'], ['telefon'], ['telefon']],
  ['1f4fb', ['radio'], ['radio'], ['rádió']],
  ['1f3a4', ['microphone'], ['mikrofon'], ['mikrofon']],
  ['1f3b8', ['guitar'], ['gitarr'], []],
  ['1f3ba', ['trumpet'], [], []],
  ['1fa88', ['flute'], ['flöjt'], []],
  ['1f941', ['drum'], ['trumma'], ['dob']],
  ['26bd', ['football', 'soccer'], ['fotboll'], ['focilabda', 'vízilabda']],
  ['1f3c0', ['basketball'], [], []],
  ['26f8', ['skate'], ['skidor', 'rullskridskor'], ['korcsolya']],
  ['1f6f4', ['scooter'], [], []],
  ['1f3aa', ['circus', 'carnival'], ['cirkus', 'tivoli'], []],
  ['1f3a0', ['carousel'], ['karusell'], ['hullámvasút']],
  ['1f3d6', ['beach', 'holiday', 'vacation'], ['semester', 'sommarlov'], ['vakáció']],
  ['26f0', ['mountain', 'hill'], ['fjäll'], ['domb']],
  ['1f30b', ['volcano'], ['vulkan'], ['vulkán']],
  ['1f3de', ['park', 'lake', 'river'], ['park', 'sjö', 'flod'], ['park', 'tó']],
  ['1f30a', ['wave'], ['vattenfall', 'strand'], []],
  ['1f525', ['fire', 'flame'], ['eld'], ['tűz', 'láng']],
  ['2744', ['snow', 'winter'], ['snö', 'vinter'], ['hó', 'tél']],
  ['1f341', ['leaf', 'autumn'], ['löv', 'höst'], ['levél']],
  ['1f33d', ['corn'], [], ['kukorica']],
  ['1f35e', ['bread'], ['bröd'], ['kenyér']],
  ['1f9c0', ['cheese'], ['ost'], ['sajt']],
  ['1f95a', ['egg'], ['ägg'], []],
  ['1f95b', ['milk'], ['mjölk'], ['tej']],
  ['1f347', ['grape'], [], ['szőlő']],
  ['1f34c', ['banana'], ['banan'], []],
  ['1f34a', ['orange'], [], ['narancs', 'narancslé']],
  ['1f349', ['watermelon'], ['vattenmelon'], ['dinnye', 'görögdinnye']],
  ['1f353', ['strawberry', 'raspberry'], ['jordgubb', 'jordgubbe', 'hallon'], ['málna']],
  ['1f352', ['cherry'], [], ['cseresznye']],
  ['1f34d', ['pineapple'], ['ananas'], ['ananász']],
  ['1f348', ['melon'], ['melon'], []],
  ['1f952', ['cucumber', 'pickle'], ['gurka'], ['uborka']],
  ['1f966', ['broccoli'], ['broccoli'], ['brokkoli']],
  ['1f96c', ['salad', 'vegetable'], ['sallad', 'grönsaker'], ['saláta']],
  ['1f354', ['hamburger'], ['hamburgare'], ['hamburger']],
  ['1f35d', ['noodle', 'macaroni'], ['spagetti', 'makaroner'], ['makaróni']],
  ['1f95e', ['pancake'], ['våffla', 'pannkakorna'], ['palacsinta']],
  ['1f369', ['donut'], ['bulle'], ['fánk']],
  ['1f9c1', ['muffin'], ['muffin'], []],
  ['1f366', ['ice cream'], ['glassar'], ['fagyi', 'fagylaltos']],
  ['1f964', ['juice', 'bottle'], ['lemonad'], ['narancslé']],
  ['1f37d', ['dinner', 'plate'], ['mat', 'skål', 'tallrik'], ['tál', 'tányér']],
  ['1f374', ['fork'], ['gaffel'], []],
  ['1f52a', ['knife'], [], []],
  ['1f9f9', ['broom'], [], ['seprű']],
  ['1f9fd', ['bucket'], [], ['vödör']],
  ['1f528', ['hammer'], ['hammare'], []],
  ['1fa93', ['axe'], ['yxa'], ['balta']],
  ['2702', ['scissors'], ['sax', 'saxar'], ['olló']],
  ['1f9f5', ['thread'], [], ['fonal']],
  ['1f9f2', ['magnet'], [], ['mágneses']],
  ['1f50d', ['magnifier'], ['kikare'], []],
  ['1f5fa', ['map'], ['karta'], []],
  ['1f9ed', ['compass'], [], []],
  ['1f4cc', ['pin'], ['spik', 'pil'], []],
  ['1f512', ['lock'], [], ['lánc']],
  ['23f0', ['clock', 'morning'], ['klocka'], []],
  ['1f514', ['bell'], [], ['csengő']],
  ['1f4e6', ['box'], ['bur'], ['doboz']],
  ['1f4ee', ['mailbox', 'postbox'], ['brev'], []],
  ['1f4a7', ['waterfall'], ['vattenfall'], ['víz']],
  ['1f98a', ['fox'], [], ['róka']],
  ['1f43a', ['wolf'], [], ['farkas']],
  ['1f43b', ['bear'], ['björne'], ['medve']],
  ['1f989', ['owl'], [], ['bagoly']],
  ['1f985', ['eagle'], [], ['sas']],
  ['1f9a2', ['swan'], ['svan'], []],
  ['1f414', ['chicken', 'hen', 'chick'], ['höna'], ['csibe', 'pulyka']],
  ['1f54a', ['dove'], ['duva'], ['gólya']],
  ['1f99c', ['parrot'], [], ['papagáj']],
  ['1f427', ['penguin'], ['pingvin'], ['pingvin']],
  ['1f9a9', ['flamingo'], [], []],
  ['1f43f', ['squirrel'], ['ekorre'], ['mókus']],
  ['1f994', ['hedgehog'], ['igelkott'], []],
  ['1f9ab', ['beaver'], ['bäver'], []],
  ['1f439', ['hamster'], [], ['hörcsög']],
  ['1f98e', ['lizard'], ['ödla'], ['gyík']],
  ['1f40a', ['crocodile', 'alligator'], ['krokodil', 'krokodilen'], ['krokodil']],
  ['1f98b', ['butterfly'], [], ['pillangó']],
  ['1f41e', ['ladybird', 'ladybug'], [], ['katica', 'katicabogár']],
  ['1f99f', ['mosquito'], ['fluga'], ['darázs']],
  ['1f99e', ['lobster'], ['hummer'], []],
  ['1f990', ['shrimp'], ['räka'], []],
  ['1f992', ['giraffe'], [], ['zsiráf']],
  ['1f98d', ['gorilla'], ['gorilla'], ['gorilla']],
  ['1f428', ['koala'], ['koala'], []],
  ['1f42b', ['camel'], ['kamel'], []],
  ['1f98f', ['rhinoceros'], [], []],
  ['1f99b', ['hippopotamus'], [], ['hippopotámusz']],
  ['1f99c', ['parrot'], [], ['papagáj']],
  ['1f9a5', ['sloth'], [], []],
  ['1f984', ['unicorn'], [], []],
  ['1f47b', ['ghost'], [], ['szellem']],
  ['1f9dc', ['mermaid'], [], []],
  ['1f9d9', ['wizard'], ['trollkarl'], ['varázsló']],
  ['1f469_200d_1f3eb', ['teacher'], ['lärare'], []],
  ['1f468_200d_2695', ['doctor'], [], ['doktor']],
  ['1f468_200d_1f373', ['baker'], [], []],
  ['1f468_200d_1f33e', ['farmer'], [], []],
  ['1f3eb', ['school', 'classroom'], ['skola'], ['iskola', 'iskolás', 'óvodás']],
  ['1f3e5', ['hospital', 'ambulance'], ['ambulans'], ['mentőautó']],
  ['1f4bb', ['computer'], [], []],
  ['1f4fa', ['television'], ['television'], ['televízió']],
  ['1f9ea', ['laboratory'], ['laboratorium'], ['laboratórium']],
  ['1f52c', ['microscope'], [], []],
  ['1f9ee', ['calculator', 'mathematics'], ['matematik'], ['matematika']],
  ['1f9ec', ['energy'], [], []],
  ['1f393', ['education'], [], []],
  ['1f4f0', ['newspaper'], ['tidning'], []],
  ['1f4dd', ['paper', 'letter'], ['brev'], ['papír', 'füzet']],
  ['2709', ['envelope'], [], []],
  ['1f4cf', ['ruler'], ['linjal'], []],
  ['1f4da', ['library'], ['bibliotek'], []],
  ['1f3a8', ['artist', 'color', 'colour', 'paint'], ['färger', 'lila', 'grön', 'gul', 'röd'], ['festék', 'sárga', 'zöld', 'szín']],
  ['1f4f8', ['photographer'], ['fotograf'], []],
  ['1f3ad', ['theatre'], ['maskerad'], []],
  ['1f3ac', ['cinema', 'cartoon'], [], []],
  ['1f9e9', ['puzzle', 'game'], ['pussel', 'lek'], ['mese']],
  ['1fa80', ['yo-yo'], [], []],
  ['1f3af', ['target'], [], ['cél']],
  ['1f3b2', ['dice'], ['domino'], ['dominó', 'kocka']],
  ['1f9f1', ['brick'], [], []],
  ['1faa8', ['rock', 'stone'], ['berg', 'sten'], ['kő']],
  ['1fab5', ['wood'], ['gren', 'planka'], ['bot']],
  ['1f3d5', ['tent'], ['tält'], []],
  ['1f6dd', ['playground'], ['gunga'], ['hinta']],
  ['1f6a6', ['traffic light'], [], ['jel']],
  ['1f6e3', ['road', 'sidewalk', 'pavement'], ['väg', 'gata'], ['út']],
  ['1f5fc', ['tower'], [], ['felhőkarc']],
  ['1f6a0', ['building'], [], ['gyár']],
  ['1f6c1', ['bathtub'], ['bada'], []],
  ['1f6bd', ['toilet'], ['toalett'], []],
  ['1f6bf', ['shower'], [], []],
  ['1f9fc', ['soap'], [], []],
  ['1faa5', ['toothbrush'], ['tandborste'], []],
  ['1f9f4', ['lotion'], [], []],
  ['1f9f7', ['safety pin'], [], []],
  ['1f392', ['backpack'], ['väska'], ['zsák', 'bőrönd']],
  ['1f45b', ['pocket'], ['ficka'], []],
  ['1f4bc', ['bag'], ['väska'], ['zsák']],
  ['1f4a4', ['sleep'], [], ['csend']],
  ['2764', ['heart'], ['hjärta'], ['szív']],
  ['1f440', ['eye'], ['öga'], ['szem']],
  ['1f442', ['ear'], [], ['fül']],
  ['1f443', ['nose'], ['nos'], ['orr']],
  ['1f9b7', ['tooth'], ['tand'], ['fog']],
  ['1f9b4', ['bone'], [], ['csont']],
  ['1f9b6', ['foot'], ['fot'], ['láb']],
  ['270b', ['hand'], ['hand'], ['kéz']],
  ['1f4aa', ['arm'], ['arm'], ['kar']],
  ['1f9e0', ['brain'], [], ['fej']],
  ['1f9b0', ['hair'], ['hår'], []],
  ['1f457', ['clothes'], ['kläder'], ['ruha']],
  ['1f48e', ['diamond'], ['diamant'], ['gyöngy']],
  ['1f52e', ['crystal'], [], ['földgömb']],
  ['1f30d', ['world', 'earth'], ['jord'], ['föld', 'földgömb']],
  ['1f310', ['universe'], ['universum'], ['univerzum']],
  ['1f320', ['comet'], [], []],
  ['1f9f1', ['wall'], ['vägg'], ['fal']],
  ['1f3e1', ['garden'], [], ['udvar']],
  ['1f9ca', ['ice'], ['is'], ['jég']],
  ['1f4a8', ['wind'], ['vind'], ['szél']],
  ['1f3f3', ['flag'], ['flagg'], []],
  ['1f388', ['party'], ['festlig'], ['bál']],
]);

const LOCALES = Object.freeze(['en-GB', 'sv-SE', 'hu-HU']);

export const SHINY_STICKER_SEQUENCE = Object.freeze([
  '1f451',
  '1f3c6',
  '1f308',
  '1f48e',
  '1f3c5',
  '1f947',
  '1f680',
  '1f9e7',
]);

function buildLocaleMap(localeIndex) {
  const entries = WORD_GROUPS.flatMap(([codepoint, ...localeWords]) =>
    (localeWords[localeIndex] ?? []).map((word) => [word, codepoint]),
  );
  return Object.freeze(Object.fromEntries(entries));
}

const britishEnglish = buildLocaleMap(0);

export const STICKER_MAP = Object.freeze({
  'en-GB': britishEnglish,
  'en-US': Object.freeze({
    ...britishEnglish,
    aeroplane: undefined,
    colour: undefined,
    favourite: undefined,
    jumper: undefined,
    lorry: undefined,
    pavement: undefined,
    postbox: undefined,
    trousers: undefined,
    airplane: '2708',
    color: '1f3a8',
    favorite: '1f381',
    ladybug: '1f41e',
    mailbox: '1f4ee',
    pants: '1f456',
    sidewalk: '1f6e3',
    sweater: '1f9e5',
  }),
  'sv-SE': buildLocaleMap(1),
  'hu-HU': buildLocaleMap(2),
});

export const STICKER_CODEPOINTS = Object.freeze(
  [
    ...new Set([
      ...LOCALES.flatMap((locale) => Object.values(STICKER_MAP[locale])).filter(Boolean),
      ...SHINY_STICKER_SEQUENCE,
    ]),
  ].sort(),
);

const ANIMAL_CODEPOINTS = Object.freeze([
  '1f40a', '1f40b', '1f40c', '1f40d', '1f404', '1f407', '1f409', '1f410',
  '1f411', '1f412', '1f414', '1f418', '1f419', '1f41c', '1f41d', '1f41e',
  '1f41f', '1f422', '1f426', '1f427', '1f428', '1f42b', '1f42c', '1f42d',
  '1f42f', '1f431', '1f434', '1f436', '1f437', '1f438', '1f439', '1f43a',
  '1f43b', '1f43c', '1f43f', '1f440', '1f47b', '1f47d', '1f480', '1f577',
  '1f981', '1f984', '1f985', '1f986', '1f987', '1f989', '1f98a', '1f98b',
  '1f98d', '1f98e', '1f98f', '1f990', '1f992', '1f993', '1f994', '1f996',
  '1f998', '1f99b', '1f99c', '1f99e', '1f99f', '1f9a2', '1f9a5', '1f9a9',
  '1f9ab', '1f9b4', '1f9dc', '1f9e7',
]);

const FOOD_CODEPOINTS = Object.freeze([
  '1f345', '1f347', '1f348', '1f349', '1f34a', '1f34b', '1f34c', '1f34d',
  '1f34e', '1f352', '1f353', '1f354', '1f355', '1f35d', '1f35e', '1f366',
  '1f369', '1f36a', '1f36f', '1f370', '1f33d', '1f374', '1f37d', '1f52a',
  '1f944', '1f952', '1f954', '1f955', '1f95a', '1f95b', '1f95e', '1f964',
  '1f966', '1f96c', '1f9c0', '1f9c1', '2615',
]);

const animalSet = new Set(ANIMAL_CODEPOINTS);
const foodSet = new Set(FOOD_CODEPOINTS);

export const STICKER_THEMES = Object.freeze({
  animals: Object.freeze(STICKER_CODEPOINTS.filter((codepoint) => animalSet.has(codepoint))),
  food: Object.freeze(STICKER_CODEPOINTS.filter((codepoint) => foodSet.has(codepoint))),
  things: Object.freeze(
    STICKER_CODEPOINTS.filter((codepoint) => !animalSet.has(codepoint) && !foodSet.has(codepoint)),
  ),
});

export function getThemeFor(codepoint) {
  if (animalSet.has(codepoint)) return 'animals';
  if (foodSet.has(codepoint)) return 'food';
  return 'things';
}

export function hashCode(value) {
  return [...String(value ?? '')].reduce((sum, character) => sum + character.codePointAt(0), 0);
}

export function getStickerFor(word, locale) {
  if (typeof word !== 'string' || !STICKER_MAP[locale]) return null;
  const normalisedWord = word.trim().normalize('NFC').toLocaleLowerCase(locale);
  return STICKER_MAP[locale][normalisedWord] ?? null;
}

export function getStickerDetails(id) {
  if (typeof id !== 'string') return null;
  const separator = id.indexOf('/');
  if (separator < 1) return null;
  const locale = id.slice(0, separator);
  const word = id.slice(separator + 1);
  const codepoint = getStickerFor(word, locale);
  return codepoint ? { codepoint, id: `${locale}/${word}`, locale, word } : null;
}

function localeCandidates(locale) {
  const safeLocale = STICKER_MAP[locale] ? locale : 'en-GB';
  const seen = new Set();
  return Object.entries(STICKER_MAP[safeLocale]).flatMap(([word, codepoint]) => {
    if (!codepoint || seen.has(codepoint)) return [];
    seen.add(codepoint);
    return [{ codepoint, id: `${safeLocale}/${word}`, locale: safeLocale, owned: false, word }];
  });
}

export function buildBookPages(progress, locale = 'en-GB') {
  const stickerIds = Array.isArray(progress?.stickers) ? progress.stickers : [];
  const ownedStickers = stickerIds.map(getStickerDetails).filter(Boolean);
  const ownedCodepoints = new Set(ownedStickers.map(({ codepoint }) => codepoint));
  const candidates = localeCandidates(locale);
  const candidatesByTheme = Object.fromEntries(
    Object.keys(STICKER_THEMES).map((theme) => [
      theme,
      candidates.filter(({ codepoint }) => getThemeFor(codepoint) === theme),
    ]),
  );
  const ownedByTheme = Object.fromEntries(
    Object.keys(STICKER_THEMES).map((theme) => [
      theme,
      ownedStickers
        .filter(({ codepoint }) => getThemeFor(codepoint) === theme)
        .map((sticker) => ({ ...sticker, owned: true })),
    ]),
  );
  const firstIncompleteTheme = Object.keys(STICKER_THEMES).find((theme) =>
    candidatesByTheme[theme].some(({ codepoint }) => !ownedCodepoints.has(codepoint)),
  );

  const pages = Object.keys(STICKER_THEMES).flatMap((theme) => {
    const owned = ownedByTheme[theme];
    if (!owned.length && theme !== firstIncompleteTheme) return [];
    const missing = theme === firstIncompleteTheme
      ? candidatesByTheme[theme]
          .filter(({ codepoint }) => !ownedCodepoints.has(codepoint))
          .slice(0, 4)
      : [];
    const complete = candidatesByTheme[theme].length > 0 &&
      candidatesByTheme[theme].every(({ codepoint }) => ownedCodepoints.has(codepoint));
    return [{ id: theme, complete, stickers: [...owned, ...missing] }];
  });

  const shinyStickers = Array.isArray(progress?.shinyStickers)
    ? [...new Set(progress.shinyStickers.filter((codepoint) => typeof codepoint === 'string'))]
    : [];
  if (shinyStickers.length) {
    pages.push({
      id: 'shiny',
      complete: SHINY_STICKER_SEQUENCE.every((codepoint) => shinyStickers.includes(codepoint)),
      stickers: shinyStickers.map((codepoint) => ({
        codepoint,
        id: `shiny/${codepoint}`,
        locale: null,
        owned: true,
        shiny: true,
        word: '',
      })),
    });
  }

  return pages.length ? pages : [{ id: 'things', complete: false, stickers: [] }];
}
