import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Letter from './Letter';

vi.mock('cartoon-eyes', () => ({
  Eye: ({ blinking, blinkFrequency, blinkSpeed }) => (
    <span
      data-testid="cartoon-eye"
      data-blinking={String(blinking)}
      data-blink-frequency={blinkFrequency}
      data-blink-speed={blinkSpeed}
    />
  ),
}));

describe('Letter eyes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('starts both eyes together after a random delay and gives them a random blink interval', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.5);

    render(<Letter letter="a" state="waiting" onSpeak={vi.fn()} />);

    const eyes = screen.getAllByTestId('cartoon-eye');
    expect(eyes).toHaveLength(2);
    eyes.forEach((eye) => {
      expect(eye).toHaveAttribute('data-blinking', 'false');
      expect(eye).toHaveAttribute('data-blink-frequency', '3900');
      expect(eye).toHaveAttribute('data-blink-speed', '90');
    });

    act(() => vi.advanceTimersByTime(299));
    eyes.forEach((eye) => expect(eye).toHaveAttribute('data-blinking', 'false'));

    act(() => vi.advanceTimersByTime(1));
    eyes.forEach((eye) => expect(eye).toHaveAttribute('data-blinking', 'true'));
  });
});
