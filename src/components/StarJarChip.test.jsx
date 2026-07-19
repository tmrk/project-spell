import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StarJarChip from './StarJarChip';

describe('StarJarChip', () => {
  it('stays hidden before the first star', () => {
    const { container } = render(<StarJarChip count={0} ariaLabel="No stars" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('counts from the pre-round total to the new total in about 600ms', () => {
    vi.useFakeTimers();
    render(<StarJarChip count={9} fromCount={3} ariaLabel="9 stars in your jar" />);

    expect(screen.getByLabelText('9 stars in your jar')).toHaveTextContent('3');
    act(() => vi.advanceTimersByTime(599));
    expect(screen.getByLabelText('9 stars in your jar')).not.toHaveTextContent('9');
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByLabelText('9 stars in your jar')).toHaveTextContent('9');
  });

  it('shows the final total immediately when reduced motion is requested', () => {
    window.matchMedia.mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    render(<StarJarChip count={9} fromCount={3} ariaLabel="9 stars in your jar" />);
    expect(screen.getByLabelText('9 stars in your jar')).toHaveTextContent('9');
  });
});
