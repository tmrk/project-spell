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

describe('Hidden letters (normal mode)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hides the glyph without revealing the letter in the accessible name', () => {
    render(<Letter letter="a" state="active" hidden onSpeak={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'hidden letter, current letter' });
    expect(button).toHaveClass('letter--hidden');
    expect(button).toHaveClass('letter--was-hidden');
    expect(button).not.toHaveClass('letter--hint-ghost');
  });

  it('keeps upcoming hidden cards faint and non-revealing', () => {
    render(<Letter letter="b" state="waiting" hidden onSpeak={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'hidden letter, next' })).toHaveClass('letter--hidden');
  });

  it('shows the ghost hint while keeping the accessible name hidden', () => {
    render(<Letter letter="b" state="active" hidden hint="ghost" onSpeak={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'hidden letter, current letter' });
    expect(button).toHaveClass('letter--hidden');
    expect(button).toHaveClass('letter--hint-ghost');
  });

  it('reveals the glyph and the accessible name for a full hint', () => {
    render(<Letter letter="c" state="active" hidden hint="full" onSpeak={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'c, current letter' });
    expect(button).not.toHaveClass('letter--hidden');
  });

  it('reveals completed letters with the reveal marker class', () => {
    render(<Letter letter="d" state="done" hidden onSpeak={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'd, completed' });
    expect(button).not.toHaveClass('letter--hidden');
    expect(button).toHaveClass('letter--was-hidden');
  });

  it('uses one neutral raised eye pair while the glyph is hidden', () => {
    const neutral = getEyeStyle('m', { neutral: true });
    expect(neutral).toEqual(getEyeStyle('i', { neutral: true }));
    expect(neutral).toEqual([
      { transform: 'translate(calc(-50% + -0.08em), calc(-50% + -0.05em))' },
      { transform: 'translate(calc(-50% + 0.08em), calc(-50% + -0.05em))' },
    ]);
    expect(getEyeStyle('m')).not.toEqual(neutral);
  });
});
