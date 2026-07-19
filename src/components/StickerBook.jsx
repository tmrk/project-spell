import { useEffect, useMemo, useRef, useState } from 'react';
import CelebrationConfetti from './CelebrationConfetti';
import { CloseIcon, StarIcon } from './Icons';
import { formatMessage } from '../locales';
import { buildBookPages, hashCode } from '../stickers/map';

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

const THEME_LABEL_KEYS = Object.freeze({
  animals: 'themeAnimals',
  food: 'themeFood',
  things: 'themeThings',
  shiny: 'themeShiny',
});

function stickerAsset(codepoint) {
  return stickerAssets[`../assets/stickers/${codepoint}.svg`] ?? null;
}

export function StickerPicture({ codepoint, className = '', style }) {
  const asset = stickerAsset(codepoint);
  return asset ? <img className={className} src={asset} alt="" style={style} /> : null;
}

function StickerItem({ party, sticker, onSpeak, onWobble, wobbling }) {
  const rotation = (hashCode(sticker.id) % 9) - 4;
  const picture = (
    <StickerPicture
      codepoint={sticker.codepoint}
      className={sticker.owned ? `die-cut${sticker.shiny ? ' shiny' : ''}` : ''}
      style={{ '--sticker-rotation': `${rotation}deg` }}
    />
  );

  if (!sticker.owned) {
    return <div className="sticker-card sticker-card--silhouette" aria-hidden="true">{picture}</div>;
  }

  if (sticker.shiny) {
    return (
      <div
        className={`sticker-card sticker-card--shiny${party ? ' sticker-card--party' : ''}`}
        role="img"
        aria-label="Shiny sticker"
      >
        {picture}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`sticker-card${wobbling ? ' sticker-card--wobbling' : ''}${party ? ' sticker-card--party' : ''}`}
      onClick={() => {
        onWobble(sticker.id);
        onSpeak(sticker.word, sticker.locale);
      }}
      onAnimationEnd={() => onWobble(null)}
      aria-label={sticker.word}
    >
      {picture}
      <span>{sticker.word}</span>
    </button>
  );
}

export default function StickerBook({
  copy,
  croc,
  locale,
  onCelebratePages,
  onClose,
  onSpeak,
  progress,
}) {
  const pages = useMemo(() => buildBookPages(progress, locale), [locale, progress]);
  const uncelebratedPages = useMemo(() => {
    const celebrated = new Set(progress.lastCelebratedPages ?? []);
    return pages.filter(({ complete }) => complete).map(({ id }) => id).filter((id) => !celebrated.has(id));
  }, [pages, progress.lastCelebratedPages]);
  const [partyPageId, setPartyPageId] = useState(uncelebratedPages[0] ?? null);
  const [wobblingSticker, setWobblingSticker] = useState(null);
  const closeButtonRef = useRef(null);
  const partyRecordedRef = useRef(false);
  const ownedCount = pages.reduce(
    (count, page) => count + page.stickers.filter(({ owned }) => owned).length,
    0,
  );

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (partyRecordedRef.current || !uncelebratedPages.length) return;
    partyRecordedRef.current = true;
    onCelebratePages(uncelebratedPages);
  }, [onCelebratePages, uncelebratedPages]);

  return (
    <div className="sticker-book-backdrop" role="presentation" onPointerDown={onClose}>
      <section
        className="sticker-book"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sticker-book-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="sticker-book__header">
          <div>
            <h2 id="sticker-book-title">{copy.stickerBookHeading}</h2>
            <p>{formatMessage(copy.stickerBookCount, { count: ownedCount })}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button sticker-book__close"
            onClick={onClose}
            aria-label={copy.closeStickerBook}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="sticker-book__body">
          <div className="sticker-book__sections">
            {pages.map((page) => {
              const pageOwnedCount = page.stickers.filter(({ owned }) => owned).length;
              const themeLabel = copy[THEME_LABEL_KEYS[page.id]];
              const partyVisible = partyPageId === page.id;
              return (
                <section
                  className={`sticker-book__section sticker-book__page${partyVisible ? ' sticker-book__page--party' : ''}`}
                  key={page.id}
                  aria-labelledby={`sticker-book-${page.id}`}
                >
                  <h3 id={`sticker-book-${page.id}`}>
                    {formatMessage(copy.stickerBookPageCount, {
                      theme: themeLabel,
                      count: pageOwnedCount,
                    })}
                  </h3>
                  <div className="sticker-grid">
                    {page.stickers.map((sticker) => (
                      <StickerItem
                        key={sticker.id}
                        party={partyVisible}
                        sticker={sticker}
                        onSpeak={onSpeak}
                        onWobble={setWobblingSticker}
                        wobbling={wobblingSticker === sticker.id}
                      />
                    ))}
                  </div>
                  {partyVisible && (
                    <CelebrationConfetti
                      className="sticker-book__confetti"
                      onAnimationEnd={() => setPartyPageId(null)}
                    />
                  )}
                </section>
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
        </div>

        <img className="sticker-book__croc" src={croc} alt="" aria-hidden="true" />
      </section>
    </div>
  );
}

export { BADGE_LABEL_KEYS, THEME_LABEL_KEYS };
