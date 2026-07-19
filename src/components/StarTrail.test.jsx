import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StarTrail from './StarTrail';

describe('StarTrail', () => {
  it('renders one socket per word and fills the completed sockets', () => {
    const { container } = render(
      <StarTrail
        total={5}
        filled={2}
        progress={0.48}
        croc="/croc.svg"
        ariaLabel="Word 3 of 5"
      />,
    );

    expect(container.querySelectorAll('.star-trail__socket')).toHaveLength(5);
    expect(container.querySelectorAll('.star-trail__socket--filled')).toHaveLength(2);
    expect(container.querySelectorAll('.star-trail__socket--newest')).toHaveLength(1);
    expect(container.querySelectorAll('.star-trail__socket--next')).toHaveLength(1);
    expect(container.querySelector('.star-trail__line-fill')).toHaveStyle({ width: '48%' });
    expect(container.querySelector('.star-trail__croc')).toHaveStyle({ left: '48%' });
    expect(container.querySelector('.star-trail')).toHaveAccessibleName('Word 3 of 5');
    expect(container.querySelector('.star-trail')).toHaveAttribute('aria-valuenow', '48');
  });

  it('clamps progress to the path bounds', () => {
    const { container, rerender } = render(
      <StarTrail total={5} filled={0} progress={-1} croc="/croc.svg" ariaLabel="Start" />,
    );

    expect(container.querySelector('.star-trail__croc')).toHaveStyle({ left: '0%' });
    rerender(
      <StarTrail total={5} filled={5} progress={2} croc="/croc.svg" ariaLabel="Finish" />,
    );
    expect(container.querySelector('.star-trail__croc')).toHaveStyle({ left: '100%' });
  });

  it('keeps per-letter progress in the continuous fallback for long rounds', () => {
    const { container } = render(
      <StarTrail
        total={11}
        filled={4}
        progress={0.4}
        croc="/croc.svg"
        ariaLabel="Word 5 of 11"
      />,
    );

    expect(container.querySelector('.star-trail')).not.toBeInTheDocument();
    expect(container.querySelector('.round-progress')).toHaveAccessibleName('Word 5 of 11');
    expect(container.querySelector('.round-progress')).toHaveAttribute('aria-valuenow', '40');
    expect(container.querySelector('.round-progress__value')).toHaveStyle({ width: '40%' });
    expect(container.querySelector('.round-progress__count')).not.toBeInTheDocument();
  });
});
