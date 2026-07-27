import { StickerPicture } from './StickerBook';
import { WORD_PACK_ICONS, WORD_PACKS } from '../word-lists/packs';

export default function WordPackChoice({ copy, locale, onChange, value }) {
  const choices = [
    { id: 'all', labelKey: 'packAll' },
    ...Object.entries(WORD_PACKS)
      .filter(([, pack]) => pack.words[locale]?.length)
      .map(([id, pack]) => ({ id, labelKey: pack.labelKey })),
  ];

  return (
    <div className="word-pack-choice" role="radiogroup" aria-label={copy.groupWords}>
      {choices.map(({ id, labelKey }) => (
        <label className="word-pack-choice__option" key={id}>
          <input
            type="radio"
            name="word-pack"
            value={id}
            checked={value === id}
            onChange={() => onChange(id)}
          />
          <StickerPicture codepoint={WORD_PACK_ICONS[id]} />
          <span>{copy[labelKey]}</span>
        </label>
      ))}
    </div>
  );
}
