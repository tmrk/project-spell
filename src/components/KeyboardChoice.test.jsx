import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import KeyboardChoice from './KeyboardChoice';

const LABELS = Object.freeze({
  heading: 'Letter keys on screen',
  system: 'No letter keys',
  full: 'All letters',
  simple: 'A few letters',
});

const renderChoice = (value = 'system', onChange = () => {}) =>
  render(<KeyboardChoice value={value} locale="en-GB" labels={LABELS} onChange={onChange} />);

describe('keyboard choice previews', () => {
  it('draws a board for the two key modes and none for the device keyboard', () => {
    const { container } = renderChoice();
    const boards = [...container.querySelectorAll('.keyboard-choice__option')].map(
      (option) => option.querySelectorAll('.keyboard-choice__key').length,
    );

    // The empty foot is the picture for the device keyboard: the word gets the whole screen back.
    expect(boards).toEqual([0, 26, 10]);
  });

  it('keeps every key inside the picture', () => {
    ['en-GB', 'hu-HU', 'sv-SE'].forEach((locale) => {
      const { container, unmount } = render(
        <KeyboardChoice value="full" locale={locale} labels={LABELS} onChange={() => {}} />,
      );

      const keys = [...container.querySelectorAll('.keyboard-choice__key')];
      expect(keys.length).toBeGreaterThan(0);
      keys.forEach((key) => {
        const right = Number(key.getAttribute('x')) + Number(key.getAttribute('width'));
        const bottom = Number(key.getAttribute('y')) + Number(key.getAttribute('height'));
        expect(Number(key.getAttribute('x'))).toBeGreaterThanOrEqual(0);
        expect(right).toBeLessThanOrEqual(100);
        expect(bottom).toBeLessThanOrEqual(76);
      });
      unmount();
    });
  });
});

describe('keyboard choice control', () => {
  it('offers three pictures as one labelled radio group', () => {
    renderChoice('full');

    const group = screen.getByRole('radiogroup', { name: 'Letter keys on screen' });
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(group.querySelectorAll('.keyboard-choice__stage')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'All letters' })).toBeChecked();
  });

  it('reports the chosen mode', () => {
    const onChange = vi.fn();
    renderChoice('system', onChange);

    fireEvent.click(screen.getByRole('radio', { name: 'A few letters' }));
    expect(onChange).toHaveBeenCalledWith('simple');
  });
});
