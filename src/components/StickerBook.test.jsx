import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getLocale } from '../locales';
import { createEmptyProgress } from '../progress';
import { STICKER_MAP, STICKER_THEMES } from '../stickers/map';
import StickerBook from './StickerBook';

const copy = getLocale('en-GB').messages;

function renderBook(progress, {
  onCelebrateBadges = vi.fn(),
  onCelebratePages = vi.fn(),
} = {}) {
  return {
    onCelebrateBadges,
    onCelebratePages,
    ...render(
      <StickerBook
        copy={copy}
        croc="/croc.svg"
        locale="en-GB"
        onCelebrateBadges={onCelebrateBadges}
        onCelebratePages={onCelebratePages}
        onClose={vi.fn()}
        onSpeak={vi.fn()}
        progress={progress}
      />,
    ),
  };
}

describe('StickerBook medal case', () => {
  it('shows earned medals by accessible name and hides all unearned silhouettes', () => {
    const progress = { ...createEmptyProgress(), badges: ['first-round'] };
    const { container } = renderBook(progress);

    expect(screen.getByRole('heading', { name: 'Medals' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'First round' })).toHaveClass('medal--earned');
    expect(screen.queryByText('First round')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.medal > svg')).toHaveLength(6);

    const silhouettes = [...container.querySelectorAll('.medal--silhouette')];
    expect(silhouettes).toHaveLength(5);
    silhouettes.forEach((medal) => expect(medal).toHaveAttribute('aria-hidden', 'true'));
  });

  it('gives newly earned medals one persisted party and no repeat party', () => {
    const onCelebrateBadges = vi.fn();
    const progress = {
      ...createEmptyProgress(),
      badges: ['first-round', 'perfect-round'],
    };
    const firstOpen = renderBook(progress, { onCelebrateBadges });

    expect(firstOpen.container.querySelectorAll('.medal--party')).toHaveLength(2);
    expect(firstOpen.container.querySelectorAll('.medal__confetti')).toHaveLength(1);
    expect(firstOpen.container.querySelectorAll('.medal__confetti span')).toHaveLength(12);
    expect(onCelebrateBadges).toHaveBeenCalledOnce();
    expect(onCelebrateBadges).toHaveBeenCalledWith(['first-round', 'perfect-round']);

    firstOpen.unmount();
    renderBook(
      { ...progress, celebratedBadges: ['first-round', 'perfect-round'] },
      { onCelebrateBadges },
    );

    expect(document.querySelector('.medal--party')).not.toBeInTheDocument();
    expect(document.querySelector('.medal__confetti')).not.toBeInTheDocument();
    expect(onCelebrateBadges).toHaveBeenCalledOnce();
  });

  it('never stacks a medal party over the existing completed-page party', () => {
    const animalCodepoints = new Set(STICKER_THEMES.animals);
    const seen = new Set();
    const animalStickers = Object.entries(STICKER_MAP['en-GB']).flatMap(([word, codepoint]) => {
      if (!animalCodepoints.has(codepoint) || seen.has(codepoint)) return [];
      seen.add(codepoint);
      return [`en-GB/${word}`];
    });
    const progress = {
      ...createEmptyProgress(),
      badges: ['first-round'],
      stickers: animalStickers,
    };
    const onCelebrateBadges = vi.fn();
    const onCelebratePages = vi.fn();
    const firstOpen = renderBook(progress, { onCelebrateBadges, onCelebratePages });

    expect(firstOpen.container.querySelector('.sticker-book__page')).toHaveClass(
      'sticker-book__page--party',
    );
    expect(firstOpen.container.querySelectorAll('.sticker-book__confetti span')).toHaveLength(12);
    expect(firstOpen.container.querySelector('.medal--party')).not.toBeInTheDocument();
    expect(onCelebratePages).toHaveBeenCalledWith(['animals']);
    expect(onCelebrateBadges).not.toHaveBeenCalled();

    firstOpen.unmount();
    const secondOpen = renderBook(
      { ...progress, lastCelebratedPages: ['animals'] },
      { onCelebrateBadges, onCelebratePages },
    );
    expect(secondOpen.container.querySelector('.sticker-book__page--party')).not.toBeInTheDocument();
    expect(secondOpen.container.querySelector('.medal--party')).toBeInTheDocument();
    expect(onCelebrateBadges).toHaveBeenCalledWith(['first-round']);
  });
});
