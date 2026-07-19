import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StarTrail from './StarTrail';

describe('StarTrail', () => {
  it('renders one socket per word and fills the completed sockets', () => {
    const { container } = render(
      <StarTrail total={5} filled={2} croc="/croc.svg" ariaLabel="Word 3 of 5" />,
    );

    expect(container.querySelectorAll('.star-trail__socket')).toHaveLength(5);
    expect(container.querySelectorAll('.star-trail__socket--filled')).toHaveLength(2);
    expect(container.querySelectorAll('.star-trail__socket--newest')).toHaveLength(1);
    expect(container.querySelector('.star-trail')).toHaveAccessibleName('Word 3 of 5');
  });

  it('uses the continuous fallback when a round has more than ten words', () => {
    const { container } = render(
      <StarTrail total={11} filled={4} croc="/croc.svg" ariaLabel="Word 5 of 11" />,
    );

    expect(container.querySelector('.star-trail')).not.toBeInTheDocument();
    expect(container.querySelector('.round-progress')).toHaveAccessibleName('Word 5 of 11');
    expect(container.querySelector('.round-progress__value')).toHaveStyle({ width: `${(4 / 11) * 100}%` });
    expect(container.querySelector('.round-progress__count')).not.toBeInTheDocument();
  });
});
