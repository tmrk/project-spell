import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import JourneyStrip from './JourneyStrip';

describe('JourneyStrip', () => {
  it('shows progress through three rounds toward the gift', () => {
    const { container } = render(<JourneyStrip position={2} message="Two rounds to go" />);

    expect(container.querySelectorAll('.journey-strip__socket')).toHaveLength(3);
    expect(container.querySelectorAll('.journey-strip__socket--filled')).toHaveLength(2);
    expect(container.querySelector('.journey-strip__gift--opened')).not.toBeInTheDocument();
  });

  it('lights every socket and opens the gift after a super round', () => {
    const { container } = render(<JourneyStrip position={0} wasSuper message="Finished" />);

    expect(container.querySelectorAll('.journey-strip__socket--filled')).toHaveLength(3);
    expect(container.querySelector('.journey-strip__gift')).toHaveClass('journey-strip__gift--opened');
  });
});
