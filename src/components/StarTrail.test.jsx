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
    expect(container.querySelectorAll('.star-trail__start')).toHaveLength(1);
    expect(container.querySelectorAll('.star-trail__socket--filled')).toHaveLength(2);
    expect(container.querySelectorAll('.star-trail__socket--newest')).toHaveLength(1);
    expect(container.querySelectorAll('.star-trail__socket--next')).toHaveLength(1);
    expect(container.querySelector('.star-trail__line-fill')).toHaveStyle({
      width: 'calc(var(--trail-pad) + max(48%, calc(40% + var(--trail-socket) / 2)))',
    });
    expect(container.querySelector('.star-trail__croc')).toHaveStyle({ left: '48%' });
    expect(container.querySelector('.star-trail')).toHaveAccessibleName('Word 3 of 5');
    expect(container.querySelector('.star-trail')).toHaveAttribute('aria-valuenow', '48');
  });

  it('only draws a star in the sockets that have been earned', () => {
    const { container } = render(
      <StarTrail total={4} filled={2} progress={0.5} croc="/croc.svg" ariaLabel="Word 3 of 4" />,
    );

    const sockets = [...container.querySelectorAll('.star-trail__socket')];
    const withStar = sockets.filter((socket) => socket.querySelector('svg'));

    expect(withStar).toHaveLength(2);
    withStar.forEach((socket) => {
      expect(socket).toHaveClass('star-trail__socket--filled');
    });
  });

  it('uses a distinct non-reward marker at the start of the road', () => {
    const { container } = render(
      <StarTrail total={4} filled={0} progress={0} croc="/croc.svg" ariaLabel="Word 1 of 4" />,
    );

    const start = container.querySelector('.star-trail__start');

    expect(start).toHaveStyle({ left: '0%' });
    expect(start).toContainElement(container.querySelector('.star-trail__start-dot'));
    expect(start.querySelector('svg')).not.toBeInTheDocument();
    expect(start).not.toHaveClass('star-trail__socket');
  });

  it('paints no road fill before the first correct letter', () => {
    const { container } = render(
      <StarTrail total={5} filled={0} progress={0} croc="/croc.svg" ariaLabel="Word 1 of 5" />,
    );

    expect(container.querySelector('.star-trail__line-fill')).toHaveStyle({ width: '0%' });
  });

  it('starts the fill at the road edge while keeping its end on per-letter progress', () => {
    const { container } = render(
      <StarTrail total={5} filled={0} progress={0.0333} croc="/croc.svg" ariaLabel="Word 1 of 5" />,
    );

    expect(container.querySelector('.star-trail__line-fill')).toHaveStyle({
      width: 'calc(var(--trail-pad) + 3.3300000000000005%)',
    });
  });

  it('paints through the far edge of an earned star checkpoint', () => {
    const { container } = render(
      <StarTrail total={3} filled={1} progress={1 / 3} croc="/croc.svg" ariaLabel="Word 1 of 3" />,
    );

    expect(container.querySelector('.star-trail__line-fill')).toHaveStyle({
      width: 'calc(var(--trail-pad) + max(33.33333333333333%, calc(33.33333333333333% + var(--trail-socket) / 2)))',
    });
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
    expect(container.querySelector('.star-trail__line-fill')).toHaveStyle({
      width: 'calc(100% + 2 * var(--trail-pad))',
    });
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
    expect(container.querySelector('.star-trail__start')).not.toBeInTheDocument();
    expect(container.querySelector('.round-progress')).toHaveAccessibleName('Word 5 of 11');
    expect(container.querySelector('.round-progress')).toHaveAttribute('aria-valuenow', '40');
    expect(container.querySelector('.round-progress__value')).toHaveStyle({
      width: 'calc(var(--trail-pad) + 40%)',
    });
    expect(container.querySelector('.round-progress__count')).not.toBeInTheDocument();
  });
});
