import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ModeToggle from './ModeToggle';

const labels = { switchToEasy: 'Switch to easy mode', switchToNormal: 'Switch to normal mode' };

describe('ModeToggle', () => {
  it('shows visible letters in easy mode and offers the other mode', () => {
    const { container } = render(<ModeToggle mode="easy" labels={labels} onChange={() => {}} />);

    expect(screen.getByRole('button', { name: 'Switch to normal mode' })).toBeInTheDocument();
    expect([...container.querySelectorAll('.mode-toggle__tile')].map((tile) => tile.textContent))
      .toEqual(['a', 'b', 'c']);
  });

  it('shows blank cards in normal mode, like the play screen does', () => {
    const { container } = render(<ModeToggle mode="normal" labels={labels} onChange={() => {}} />);

    expect(screen.getByRole('button', { name: 'Switch to easy mode' })).toBeInTheDocument();
    expect([...container.querySelectorAll('.mode-toggle__tile')].map((tile) => tile.textContent))
      .toEqual(['', '', '']);
  });

  it('toggles to the other mode on tap', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ModeToggle mode="easy" labels={labels} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith('normal');

    rerender(<ModeToggle mode="normal" labels={labels} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenLastCalledWith('easy');
  });

  it('treats an unknown mode as easy rather than rendering blank cards', () => {
    render(<ModeToggle mode={undefined} labels={labels} onChange={() => {}} />);

    expect(screen.getByRole('button', { name: 'Switch to normal mode' })).toBeInTheDocument();
  });
});
