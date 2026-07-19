import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NameTag from './NameTag';

describe('NameTag', () => {
  it('splits the name into letter tiles', () => {
    const { container } = render(<NameTag name="Anna" />);

    expect([...container.querySelectorAll('.name-tag__tile')].map((tile) => tile.textContent))
      .toEqual(['A', 'n', 'n', 'a']);
  });

  it('cycles the same five-colour letter wheel as the words', () => {
    const { container } = render(<NameTag name="Freddie" />);

    expect([...container.querySelectorAll('.name-tag__tile')].map((tile) => tile.className))
      .toEqual([
        'name-tag__tile name-tag__tile--c0',
        'name-tag__tile name-tag__tile--c1',
        'name-tag__tile name-tag__tile--c2',
        'name-tag__tile name-tag__tile--c3',
        'name-tag__tile name-tag__tile--c4',
        'name-tag__tile name-tag__tile--c0',
        'name-tag__tile name-tag__tile--c1',
      ]);
  });

  it('gives every letter a face, and none when eyes are switched off', () => {
    const { container: withEyes } = render(<NameTag name="Bo" />);
    expect(withEyes.querySelectorAll('.eyes').length).toBe(2);

    const { container: without } = render(<NameTag name="Bo" showEyes={false} />);
    expect(without.querySelectorAll('.eyes').length).toBe(0);
  });

  it('keeps accented letters whole', () => {
    const { container } = render(<NameTag name="Zsófi" />);

    expect([...container.querySelectorAll('.name-tag__tile')].map((tile) => tile.textContent))
      .toEqual(['Z', 's', 'ó', 'f', 'i']);
  });

  it('spaces a two-part name without a tile', () => {
    const { container } = render(<NameTag name="Mary Jane" />);

    expect(container.querySelectorAll('.name-tag__gap').length).toBe(1);
    expect(container.querySelectorAll('.name-tag__tile').length).toBe(8);
  });

  it('renders nothing for an unnamed profile', () => {
    const { container } = render(<NameTag name="" />);

    expect(container.querySelector('.name-tag')).toBeNull();
  });

  it('carries the size hint so the play-screen marker can stay quiet', () => {
    const { container } = render(<NameTag name="Bo" size="hud" />);

    expect(container.querySelector('.name-tag')).toHaveClass('name-tag--hud');
    // The name is decorative here; its accessible label belongs to the surrounding control.
    expect(container.querySelector('.name-tag')).toHaveAttribute('aria-hidden', 'true');
  });
});
