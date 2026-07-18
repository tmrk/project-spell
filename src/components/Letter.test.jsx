import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Letter from './Letter';
import getEyeStyle, { EYE_OFFSETS } from './EyeStyle';

vi.mock('cartoon-eyes', () => ({
  Eye: ({ blinking, blinkFrequency, blinkSpeed, lensPosition }) => (
    <span
      data-testid="cartoon-eye"
      data-blinking={String(blinking)}
      data-blink-frequency={blinkFrequency}
      data-blink-speed={blinkSpeed}
      data-lens-position={lensPosition.join(',')}
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

  it('keeps every letter\'s eyes on one horizontal stroke', () => {
    expect(Object.keys(EYE_OFFSETS).sort().join('')).toBe('abcdefghijklmnopqrstuvwxyz');
    expect(Object.values(EYE_OFFSETS).every((offsets) => offsets.length >= 1 && offsets.length <= 2)).toBe(true);
    expect(
      Object.values(EYE_OFFSETS).every((offsets) => new Set(offsets.map(([, y]) => y)).size === 1),
    ).toBe(true);
  });

  it.each(['i', 'j'])('gives the narrow letter %s one centred eye', (letter) => {
    render(<Letter letter={letter} state="waiting" onSpeak={vi.fn()} />);
    expect(screen.getAllByTestId('cartoon-eye')).toHaveLength(1);
  });

  it('centres A on its two legs and J on its vertical stem', () => {
    expect(EYE_OFFSETS.a).toEqual([[-0.105, -0.1], [0.105, -0.1]]);
    expect(EYE_OFFSETS.j[0][0]).toBeGreaterThan(0);
    expect(EYE_OFFSETS.j[0][1]).toBe(EYE_OFFSETS.i[0][1]);
  });

  it('uses the base letter eye placement for accented letters', () => {
    expect(getEyeStyle('å')).toEqual(getEyeStyle('a'));
    expect(getEyeStyle('ő')).toEqual(getEyeStyle('o'));
    expect(getEyeStyle('ű')).toEqual(getEyeStyle('u'));
  });

  it('moves both pupils to the same shared gaze position', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.25)
      .mockReturnValueOnce(0.75);

    render(<Letter letter="m" state="active" onSpeak={vi.fn()} />);
    const eyes = screen.getAllByTestId('cartoon-eye');
    eyes.forEach((eye) => expect(eye).toHaveAttribute('data-lens-position', '0,0'));

    act(() => vi.advanceTimersByTime(1700));
    eyes.forEach((eye) => expect(eye).toHaveAttribute('data-lens-position', '-45,45'));
  });

  it('does not render eye components when eyes are switched off', () => {
    render(<Letter letter="a" state="active" onSpeak={vi.fn()} showEyes={false} />);
    expect(screen.queryByTestId('cartoon-eye')).not.toBeInTheDocument();
  });
});
