import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BookTab from './BookTab';

vi.mock('cartoon-eyes', () => ({
  Eye: ({ blinking, blinkFrequency, blinkSpeed }) => (
    <span
      data-testid="book-eye"
      data-blinking={String(blinking)}
      data-blink-frequency={blinkFrequency}
      data-blink-speed={blinkSpeed}
    />
  ),
}));

describe('BookTab', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('starts both cover eyes blinking together after a short random delay', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.5);

    render(<BookTab ariaLabel="Open sticker book" onClick={vi.fn()} />);

    const eyes = screen.getAllByTestId('book-eye');
    expect(eyes).toHaveLength(2);
    eyes.forEach((eye) => {
      expect(eye).toHaveAttribute('data-blinking', 'false');
      expect(eye).toHaveAttribute('data-blink-frequency', '3900');
      expect(eye).toHaveAttribute('data-blink-speed', '90');
    });

    act(() => vi.advanceTimersByTime(399));
    eyes.forEach((eye) => expect(eye).toHaveAttribute('data-blinking', 'false'));

    act(() => vi.advanceTimersByTime(1));
    eyes.forEach((eye) => expect(eye).toHaveAttribute('data-blinking', 'true'));
  });
});
