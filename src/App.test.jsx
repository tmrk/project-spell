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

  it('offers language selection on the start page and uses an American voice for US English', () => {
    vi.useFakeTimers();
    const britishVoice = { lang: 'en-GB', name: 'Google UK English Female' };
    const usVoice = { lang: 'en-US', name: 'Samantha' };
    window.speechSynthesis.getVoices.mockReturnValue([britishVoice, usVoice]);

    render(<App />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), {
      target: { value: 'en-US' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    act(() => vi.advanceTimersByTime(121));

    const utterance = window.speechSynthesis.speak.mock.calls.at(-1)[0];
    expect(utterance.lang).toBe('en-US');
    expect(utterance.voice).toBe(usVoice);
    expect(document.documentElement).toHaveAttribute('lang', 'en-US');
  });

  it('requires confirmation before a settings language change restarts the game', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open grown-ups settings' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), {
      target: { value: 'en-US' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save & close' }));

    expect(screen.getByRole('alertdialog', { name: 'Change language?' })).toBeInTheDocument();
    expect(document.querySelector('.app')).toHaveAttribute('data-phase', 'playing');

    fireEvent.click(screen.getByRole('button', { name: 'Keep current language' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Grown-ups' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en-GB');

    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), {
      target: { value: 'en-US' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save & close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change & restart' }));

    expect(document.querySelector('.app')).toHaveAttribute('data-phase', 'welcome');
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en-US');
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY))).toMatchObject({ locale: 'en-US' });
  });

  it('lets grown-ups switch the letter eyes off', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open grown-ups settings' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cartoon eyes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save & close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(document.querySelector('.eyes')).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY))).toMatchObject({ eyes: false });
  });

  it('plays the original done sound as soon as a word is completed', () => {
    const playSpy = vi.spyOn(Audio.prototype, 'play');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    fireEvent.input(screen.getByRole('textbox', { name: 'Type the next letter' }), {
      target: { value: 'cat' },
    });

    expect(playSpy.mock.contexts.some((audio) => audio.src.endsWith('/done.mp3'))).toBe(true);
  });
});
