import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import JourneyStrip from './JourneyStrip';

describe('JourneyStrip', () => {
  it('draws a flat road with three star sockets and a gift at the end', () => {
    const { container } = render(<JourneyStrip position={2} message="Two rounds to go" />);

    expect(container.querySelector('.journey-strip__road')).toHaveAttribute('data-position', '2');
    expect(container.querySelector('.journey-strip__road')).toHaveStyle({ '--journey-sockets': '3' });
    expect(container.querySelector('.journey-strip__track')).toBeInTheDocument();
    expect(container.querySelectorAll('.journey-strip__socket')).toHaveLength(3);
    expect(container.querySelectorAll('.journey-strip__socket--filled')).toHaveLength(2);
    expect(container.querySelector('.journey-strip__gift--opened')).not.toBeInTheDocument();
    expect(container.querySelector('.journey-strip__gift')).toBeInTheDocument();
    expect(container.querySelector('.journey-strip p')).toHaveTextContent('Two rounds to go');
  });

  it.each([0, 1, 2, 3])('fills %i sockets at the matching journey position', (position) => {
    const { container } = render(<JourneyStrip position={position} />);

    expect(container.querySelectorAll('.journey-strip__socket--filled')).toHaveLength(position);
  });

  it('lights every star and opens the gift after a super round', () => {
    const { container } = render(<JourneyStrip position={0} wasSuper message="Finished" />);

    expect(container.querySelector('.journey-strip__road')).toHaveAttribute('data-position', '0');
    expect(container.querySelectorAll('.journey-strip__socket--filled')).toHaveLength(3);
    expect(container.querySelector('.journey-strip__gift')).toHaveClass('journey-strip__gift--opened');
  });
});
