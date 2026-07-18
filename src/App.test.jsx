import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from './game';

describe('Project Spell', () => {
  beforeEach(() => {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        customWords: 'cat',
        wordSource: 'custom',
        roundLength: 3,
        music: false,
      }),
    );
  });

  it('starts a round and advances through a correctly typed word', async () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    const input = screen.getByRole('textbox', { name: 'Type the next letter' });
    expect(screen.getByLabelText('Word 1 of 3')).toBeInTheDocument();

    fireEvent.input(input, { target: { value: 'cat' } });

    await act(async () => {
      vi.advanceTimersByTime(1050);
    });

    expect(screen.getByLabelText('Word 2 of 3')).toBeInTheDocument();
  });

  it('keeps an incorrect attempt on the current letter and clears feedback after one second', () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    const input = screen.getByRole('textbox', { name: 'Type the next letter' });

    fireEvent.input(input, { target: { value: 'x' } });

    expect(screen.getByRole('button', { name: 'c, current letter' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Try once more');
    expect(document.querySelector('.app')).toHaveAttribute('data-feedback', 'error');

    act(() => vi.advanceTimersByTime(151));
    expect(screen.getByRole('status')).toHaveTextContent('Try once more');
    expect(document.querySelector('.app')).toHaveAttribute('data-feedback', 'idle');

    act(() => vi.advanceTimersByTime(848));
    expect(screen.getByRole('status')).toHaveTextContent('Try once more');

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(document.querySelector('.app')).toHaveAttribute('data-feedback', 'idle');
  });

  it('opens the parent settings without adding controls to the play flow', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open grown-ups settings' }));

    expect(screen.getByRole('dialog', { name: 'Grown-ups' })).toBeInTheDocument();
    expect(screen.getByLabelText('Words in a row')).toHaveValue('3');
  });
});
