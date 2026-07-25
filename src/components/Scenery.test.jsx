import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Scenery from './Scenery';

// The point of these tests is not the exact picture — it is the density budget from design
// guidelines §6. "Alive" turns into "busy" one well-meaning shape at a time, so every phase is
// pinned to a count and the whole kit is pinned to being invisible to assistive technology.
// The ground band counts as one element however many blades it is cut from.
const SCENERY_BUDGETS = {
  complete: 5,
  greeting: 7,
  play: 5,
  welcome: 7,
};

const items = (container) => container.querySelectorAll('.scenery__item');

describe('Scenery', () => {
  it('composes the welcome meadow: sun, two clouds, the ground band and a butterfly', () => {
    const { container } = render(<Scenery phase="welcome" />);
    expect(container.querySelectorAll('.scenery__sun')).toHaveLength(1);
    expect(container.querySelectorAll('.scenery__cloud')).toHaveLength(2);
    expect(container.querySelectorAll('.scenery__ground')).toHaveLength(1);
    expect(container.querySelectorAll('.scenery__butterfly')).toHaveLength(1);
    expect(items(container)).toHaveLength(5);
  });

  it('keeps the greeting on the welcome composition so the ground survives the cut', () => {
    const welcome = render(<Scenery phase="welcome" />).container.innerHTML;
    const greeting = render(<Scenery phase="greeting" />).container.innerHTML;
    expect(greeting.replace('scenery--greeting', 'scenery--welcome')).toBe(welcome);
  });

  it('gives the ceremony a bird on the hill and its gold sparkles', () => {
    const { container } = render(<Scenery phase="complete" />);
    expect(container.querySelectorAll('.scenery__ground')).toHaveLength(1);
    expect(container.querySelectorAll('.scenery__bird')).toHaveLength(1);
    expect(container.querySelectorAll('.scenery__sparkle')).toHaveLength(3);
    expect(container.querySelector('.scenery__sparkle--super')).not.toBeNull();
  });

  // The play screen earned a bigger sky in D-019, but the thing that keeps it playable is what it
  // still refuses: nothing planted, no ground band, nothing that could sit under the word.
  it('gives the play screen a sky and no ground decor', () => {
    const { container } = render(<Scenery phase="playing" />);
    expect(container.querySelectorAll('.scenery__cloud')).toHaveLength(3);
    expect(container.querySelectorAll('.scenery__sun')).toHaveLength(1);
    expect(container.querySelectorAll('.scenery__bird')).toHaveLength(1);
    expect(container.querySelector('.scenery__ground')).toBeNull();
    expect(container.querySelector('.scenery__flower')).toBeNull();
    expect(container.querySelector('.scenery__sprout')).toBeNull();
    expect(container.querySelector('.scenery--play')).not.toBeNull();
  });

  it.each([
    ['welcome', 'welcome'],
    ['greeting', 'greeting'],
    ['complete', 'complete'],
    ['playing', 'play'],
  ])('stays inside the §6 density budget on %s', (phase, budget) => {
    const { container } = render(<Scenery phase={phase} />);
    expect(items(container).length).toBeLessThanOrEqual(SCENERY_BUDGETS[budget]);
  });

  it.each(['welcome', 'greeting', 'complete', 'playing'])(
    'hides every %s shape from assistive technology',
    (phase) => {
      const { container } = render(<Scenery phase={phase} />);
      expect(container.querySelector('.scenery')).toHaveAttribute('aria-hidden', 'true');
      const shapes = [...container.querySelectorAll('svg')];
      expect(shapes.length).toBeGreaterThan(0);
      shapes.forEach((shape) => expect(shape).toHaveAttribute('aria-hidden', 'true'));
    },
  );

  it('draws decor with tokens only, so alternative grounds need no extra code', () => {
    const { container } = render(<Scenery phase="welcome" />);
    const inline = [...container.querySelectorAll('[style]')].map((el) => el.getAttribute('style'));
    expect(inline.length).toBeGreaterThan(0);
    inline.forEach((style) => expect(style).toMatch(/var\(--ps-[a-z-]+\)/));
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i);
  });
});
