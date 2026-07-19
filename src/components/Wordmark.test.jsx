import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Wordmark from './Wordmark';

describe('Wordmark', () => {
  it('keeps the full name readable while the visual is split into letter tiles', () => {
    const { container } = render(<Wordmark name="Project Spell" />);

    expect(screen.getByLabelText('Project Spell')).toBeInTheDocument();
    expect(container.querySelector('.wordmark__eyebrow')).toHaveTextContent('Project');
    expect([...container.querySelectorAll('.wordmark__tile')].map((tile) => tile.textContent))
      .toEqual(['S', 'p', 'e', 'l', 'l']);
  });

  it('cycles the five-colour letter wheel in order', () => {
    const { container } = render(<Wordmark name="Project Spell" />);

    expect([...container.querySelectorAll('.wordmark__tile')].map((tile) => tile.className))
      .toEqual([
        'wordmark__tile wordmark__tile--c0',
        'wordmark__tile wordmark__tile--c1',
        'wordmark__tile wordmark__tile--c2',
        'wordmark__tile wordmark__tile--c3',
        'wordmark__tile wordmark__tile--c4',
      ]);
  });

  it('drops the faces when a grown-up switches cartoon eyes off', () => {
    const { container: withEyes } = render(<Wordmark name="Project Spell" />);
    expect(withEyes.querySelectorAll('.eyes').length).toBe(5);

    const { container: without } = render(<Wordmark name="Project Spell" showEyes={false} />);
    expect(without.querySelectorAll('.eyes').length).toBe(0);
  });

  it('renders a multi-word name without losing the spacing', () => {
    const { container } = render(<Wordmark name="Project Spell Two" />);

    expect(container.querySelector('.wordmark__eyebrow')).toHaveTextContent('Project');
    expect(container.querySelectorAll('.wordmark__gap').length).toBe(1);
    expect(container.querySelectorAll('.wordmark__tile').length).toBe(8);
  });
});
