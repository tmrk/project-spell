import { useEffect, useMemo, useRef, useState } from 'react';
import CelebrationConfetti from './CelebrationConfetti';
import { ChevronIcon, CloseIcon, StarIcon } from './Icons';
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
  const firstMissingIndex = pages.findIndex(({ stickers }) => stickers.some(({ owned }) => !owned));
  const initialPageId = uncelebratedPages[0] ?? pages[firstMissingIndex >= 0 ? firstMissingIndex : pages.length - 1].id;
  const [activePageId, setActivePageId] = useState(initialPageId);
  const [partyVisible, setPartyVisible] = useState(uncelebratedPages.length > 0);
  const [wobblingSticker, setWobblingSticker] = useState(null);
  const closeButtonRef = useRef(null);
  const partyRecordedRef = useRef(false);
  const activeIndex = Math.max(0, pages.findIndex(({ id }) => id === activePageId));
  const activePage = pages[activeIndex];
  const ownedCount = activePage.stickers.filter(({ owned }) => owned).length;
  const themeLabel = copy[THEME_LABEL_KEYS[activePage.id]];

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  useEffect(() => {
    if (partyRecordedRef.current || !uncelebratedPages.length) return;
    partyRecordedRef.current = true;
    onCelebratePages(uncelebratedPages);
  }, [onCelebratePages, uncelebratedPages]);

  const goTo = (index) => {
    const bounded = Math.min(Math.max(index, 0), pages.length - 1);
    setActivePageId(pages[bounded].id);
    setPartyVisible(false);
    setWobblingSticker(null);
  };

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
            <p>{formatMessage(copy.stickerBookPageCount, { theme: themeLabel, count: ownedCount })}</p>
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

        <div className={`sticker-book__page${partyVisible ? ' sticker-book__page--party' : ''}`}>
          <div className="sticker-grid">
            {activePage.stickers.map((sticker) => (
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
              onAnimationEnd={() => setPartyVisible(false)}
            />
          )}
          {activeIndex === pages.length - 1 && progress.badges.length > 0 && (
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

        <nav className="sticker-book__navigation" aria-label={copy.stickerBookHeading}>
          <button
            type="button"
            className="book-page-arrow"
            onClick={() => goTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label={copy.previousPage}
          >
            <ChevronIcon direction="previous" />
          </button>
          <div className="book-page-dots">
            {pages.map((page, index) => (
              <button
                type="button"
                className={`book-page-dot${page.id === activePage.id ? ' book-page-dot--active' : ''}${page.id === 'shiny' ? ' book-page-dot--shiny' : ''}`}
                key={page.id}
                onClick={() => goTo(index)}
                aria-label={copy[THEME_LABEL_KEYS[page.id]]}
                aria-current={page.id === activePage.id ? 'page' : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            className="book-page-arrow"
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex === pages.length - 1}
            aria-label={copy.nextPage}
          >
            <ChevronIcon />
          </button>
        </nav>

        <img className="sticker-book__croc" src={croc} alt="" aria-hidden="true" />
      </section>
    </div>
  );
}

export { BADGE_LABEL_KEYS, THEME_LABEL_KEYS };
