import { useEffect, useMemo, useRef, useState } from 'react';
import { CloseIcon, StarIcon } from './Icons';
import { formatMessage } from '../locales';
import { getStickerDetails } from '../stickers/map';

const stickerAssets = import.meta.glob('../assets/stickers/*.svg', {
  eager: true,
  query: '?url&no-inline',
  import: 'default',
});

const BADGE_LABEL_KEYS = Object.freeze({
  'first-round': 'badgeFirstRound',
  'words-10': 'badgeWords10',
  'words-50': 'badgeWords50',
  'words-100': 'badgeWords100',
  'perfect-round': 'badgePerfectRound',
  'normal-round': 'badgeNormalRound',
});

function stickerAsset(codepoint) {
  return stickerAssets[`../assets/stickers/${codepoint}.svg`] ?? null;
}

export function StickerPicture({ codepoint, className = '' }) {
  const asset = stickerAsset(codepoint);
  return asset ? <img className={className} src={asset} alt="" /> : null;
}

export default function StickerBook({ copy, progress, onClose, onSpeak }) {
  const [wobblingSticker, setWobblingSticker] = useState(null);
  const closeButtonRef = useRef(null);
  const stickers = useMemo(
    () => progress.stickers.map(getStickerDetails).filter(Boolean),
    [progress.stickers],
  );

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  return (
    <div className="sticker-book-backdrop" role="presentation" onPointerDown={onClose}>
      <section
        className="sticker-book"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sticker-book-title"
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <header className="sticker-book__header">
          <div>
            <h2 id="sticker-book-title">{copy.stickerBookHeading}</h2>
            <p>{formatMessage(copy.stickerBookCount, { count: stickers.length })}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={copy.closeStickerBook}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="sticker-grid">
          {stickers.map((sticker) => {
            const asset = stickerAsset(sticker.codepoint);
            if (!asset) return null;
            return (
              <button
                type="button"
                className={`sticker-card${wobblingSticker === sticker.id ? ' sticker-card--wobbling' : ''}`}
                key={sticker.id}
                onClick={() => {
                  setWobblingSticker(sticker.id);
                  onSpeak(sticker.word, sticker.locale);
                }}
                onAnimationEnd={() => setWobblingSticker(null)}
                aria-label={sticker.word}
              >
                <StickerPicture codepoint={sticker.codepoint} />
                <span>{sticker.word}</span>
              </button>
            );
          })}
        </div>

        {progress.badges.length > 0 && (
          <footer className="badge-row" aria-label={copy.badgesHeading}>
            {progress.badges.map((badge) => {
              const labelKey = BADGE_LABEL_KEYS[badge];
              if (!labelKey) return null;
              return (
                <span className="badge" key={badge}>
                  <StarIcon filled />
                  <span>{copy[labelKey]}</span>
                </span>
              );
            })}
          </footer>
        )}
      </section>
    </div>
  );
}

export { BADGE_LABEL_KEYS };
