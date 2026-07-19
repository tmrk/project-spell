import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import packageInfo from '../package.json';
import App from './App';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from './game';
import { PROGRESS_KEY } from './progress';
import { PROFILES_KEY } from './profiles';
import { STATS_KEY } from './stats';
import { STICKER_MAP, STICKER_THEMES } from './stickers/map';

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

  it('keeps the welcome screen minimal with flags and a dominant play action', () => {
    render(<App />);

    const languageSelect = screen.getByRole('combobox', { name: 'Language' });
    expect(within(languageSelect).getByRole('option', { name: '🇬🇧 British English' })).toBeInTheDocument();
    expect(within(languageSelect).getByRole('option', { name: '🇺🇸 US English' })).toBeInTheDocument();
    expect(within(languageSelect).getByRole('option', { name: '🇸🇪 Svenska' })).toBeInTheDocument();
    expect(within(languageSelect).getByRole('option', { name: '🇭🇺 Magyar' })).toBeInTheDocument();
    expect(screen.queryByText('Ready to spell?')).not.toBeInTheDocument();
    expect(screen.queryByText('Listen, then type one letter at a time.')).not.toBeInTheDocument();
    expect(screen.queryByText('Language')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Project Spell' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'SPELL' })).not.toBeInTheDocument();
    expect(document.querySelectorAll('.scenery__cloud')).toHaveLength(7);
    expect(screen.getByRole('button', { name: 'Play' })).toHaveClass('welcome-play-button');
  });

  it('shows the lifetime star jar on welcome only after stars have been earned', () => {
    const firstVisit = render(<App />);
    expect(screen.queryByLabelText('★ 0 stars in your jar')).not.toBeInTheDocument();
    firstVisit.unmount();

    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      version: 1,
      totalStars: 12,
      stickers: [],
      badges: [],
    }));
    render(<App />);
    expect(screen.getByLabelText('★ 12 stars in your jar')).toHaveTextContent('12');
  });

  it('uses the browser region on a first visit and preserves saved choices afterwards', () => {
    window.localStorage.clear();
    const languagesSpy = vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['es-US']);

    const firstVisit = render(<App />);
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en-US');
    firstVisit.unmount();

    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, locale: 'en-GB' }));
    render(<App />);
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en-GB');

    languagesSpy.mockRestore();
  });

  it('shows a brief word celebration before advancing without waiting for the ding', () => {
    vi.useFakeTimers();
    const playSpy = vi.spyOn(Audio.prototype, 'play');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    const input = screen.getByRole('textbox', { name: 'Type the next letter' });
    expect(screen.getByLabelText('Word 1 of 3')).toBeInTheDocument();
    expect(document.querySelectorAll('.star-trail__socket')).toHaveLength(3);
    expect(document.querySelectorAll('.star-trail__socket--filled')).toHaveLength(0);
    expect(document.querySelector('.star-trail__croc')).toHaveStyle({ left: '0%' });
    expect(screen.queryByText('1 / 3')).not.toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'x' });
    expect(document.querySelector('.star-trail__croc')).toHaveStyle({ left: '0%' });
    fireEvent.keyDown(input, { key: 'c' });
    expect(Number.parseFloat(document.querySelector('.star-trail__croc').style.left))
      .toBeCloseTo(100 / 9);
    fireEvent.keyDown(input, { key: 'a' });
    expect(Number.parseFloat(document.querySelector('.star-trail__croc').style.left))
      .toBeCloseTo(200 / 9);
    fireEvent.keyDown(input, { key: 't' });
    expect(Number.parseFloat(document.querySelector('.star-trail__croc').style.left))
      .toBeCloseTo(100 / 3);

    expect(playSpy.mock.contexts.some((audio) => audio.src.endsWith('/done.mp3'))).toBe(true);
    expect(screen.getByLabelText('Word 1 of 3')).toBeInTheDocument();
    expect(document.querySelector('.word')).toHaveClass('word--celebrating');
    expect(document.querySelectorAll('.confetti span')).toHaveLength(12);
    expect(document.querySelectorAll('.heart-burst span')).toHaveLength(3);
    expect(document.querySelectorAll('.star-trail__socket--filled')).toHaveLength(1);

    act(() => vi.advanceTimersByTime(759));
    expect(screen.getByLabelText('Word 1 of 3')).toBeInTheDocument();
    expect(document.querySelector('.confetti')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));

    expect(screen.getByLabelText('Word 2 of 3')).toBeInTheDocument();
    expect(Number.parseFloat(document.querySelector('.star-trail__croc').style.left))
      .toBeCloseTo(100 / 3);
    expect(document.querySelector('.confetti')).not.toBeInTheDocument();
    expect(document.querySelector('.app')).toHaveAttribute('data-feedback', 'idle');
  });

  it('colours the letters of a word through the wheel in order', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(screen.getByRole('button', { name: 'c, current letter' })).toHaveClass('letter--c0');
    expect(screen.getByRole('button', { name: 'a, next' })).toHaveClass('letter--c1');
    expect(screen.getByRole('button', { name: 't, next' })).toHaveClass('letter--c2');
  });

  it('speaks short praise after two words and lets it finish before the next prompt', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    fireEvent.input(screen.getByRole('textbox', { name: 'Type the next letter' }), {
      target: { value: 'cat' },
    });
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(760));
    expect(screen.getByLabelText('Word 2 of 3')).toBeInTheDocument();
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(2);

    fireEvent.input(screen.getByRole('textbox', { name: 'Type the next letter' }), {
      target: { value: 'cat' },
    });

    const praise = window.speechSynthesis.speak.mock.calls.at(-1)[0];
    expect(praise.text).toBe('Great!');
    expect(praise.text).not.toMatch(/cat/iu);
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(3);
    act(() => vi.advanceTimersByTime(760));
    expect(screen.getByLabelText('Word 3 of 3')).toBeInTheDocument();
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(3);

    act(() => praise.onend());
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(4);
    expect(window.speechSynthesis.speak.mock.calls.at(-1)[0].text).toBe('Spell the word cat');
  });

  it('sometimes waits three completed words before speaking word praise', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        customWords: 'cat',
        wordSource: 'custom',
        roundLength: 4,
        music: false,
      }),
    );

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    const input = screen.getByRole('textbox', { name: 'Type the next letter' });

    fireEvent.input(input, { target: { value: 'cat' } });
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(760));

    fireEvent.input(input, { target: { value: 'cat' } });
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(2);
    act(() => vi.advanceTimersByTime(760));

    fireEvent.input(input, { target: { value: 'cat' } });
    const praise = window.speechSynthesis.speak.mock.calls.at(-1)[0];
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(4);
    expect(praise.text).toBe('Fantastic!');
    expect(praise.text).not.toMatch(/cat/iu);
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

  it('applies the background signal before starting keydown audio', () => {
    const signalsAtPlayback = [];
    vi.spyOn(Audio.prototype, 'play').mockImplementation(function playImmediately() {
      if (this.src.endsWith('/pop.mp3') || this.src.endsWith('/bad.mp3')) {
        signalsAtPlayback.push({
          feedback: document.querySelector('.app').dataset.feedback,
          source: this.src,
        });
      }
      return Promise.resolve();
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    const input = screen.getByRole('textbox', { name: 'Type the next letter' });

    fireEvent.keyDown(input, { key: 'c' });
    fireEvent.keyDown(input, { key: 'x' });

    expect(signalsAtPlayback).toEqual([
      { feedback: 'success', source: expect.stringMatching(/\/pop\.mp3$/u) },
      { feedback: 'error', source: expect.stringMatching(/\/bad\.mp3$/u) },
    ]);
  });

  it('opens the parent settings without adding controls to the play flow', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open parent settings' }));

    const dialog = screen.getByRole('dialog', { name: 'Settings (for parents)' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: '🇬🇧 British English' })).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: '🇺🇸 US English' })).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: '🇸🇪 Svenska' })).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: '🇭🇺 Magyar' })).toBeInTheDocument();
    expect(screen.getByLabelText('Words in a row')).toHaveValue('3');
    expect(within(dialog).getByText('Game')).toBeInTheDocument();
    expect(within(dialog).getByText('Words')).toBeInTheDocument();
    expect(within(dialog).getByText('Sound & look')).toBeInTheDocument();
    expect(within(dialog).getByText('Progress & about')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /save/iu })).not.toBeInTheDocument();
  });

  it('persists sound and look changes immediately without waiting for close', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open parent settings' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Background music' }));

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY))).toMatchObject({ music: true });
    });
    expect(screen.getByRole('dialog', { name: 'Settings (for parents)' }).querySelector('.saved-toast'))
      .toHaveTextContent('✓ Saved');
  });

  it('ends a playing round only after a round-setting change', () => {
    const first = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open parent settings' }));
    fireEvent.change(screen.getByLabelText('Words in a row'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    expect(document.querySelector('.app')).toHaveAttribute('data-phase', 'welcome');
    first.unmount();

    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, customWords: 'cat', wordSource: 'custom', roundLength: 3, music: false }),
    );
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open parent settings' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Background music' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    expect(document.querySelector('.app')).toHaveAttribute('data-phase', 'playing');
  });

  it('debounces custom words, flushes them on blur, and guards a zero-match round', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open parent settings' }));
    const settingsDialog = await screen.findByRole('dialog', { name: 'Settings (for parents)' });
    const wordList = within(settingsDialog).getByLabelText('Word list');
    fireEvent.change(wordList, { target: { value: '' } });

    expect(screen.getByText('No words match these settings')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY)).customWords).toBe('cat');
    fireEvent.blur(wordList);
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY)).customWords).toBe('');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(document.querySelector('.app')).toHaveAttribute('data-phase', 'welcome');
    expect(screen.getByRole('dialog', { name: 'Settings (for parents)' })).toBeInTheDocument();
  });

  it('closes settings with Escape and returns focus to its opener', () => {
    render(<App />);
    const opener = screen.getByRole('button', { name: 'Open parent settings' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Settings (for parents)' });

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Settings (for parents)' })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
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

  it.each([
    {
      code: 'sv-SE',
      play: 'Spela',
      prompt: 'Stava ordet cat',
      voice: { lang: 'sv-SE', name: 'Alva' },
    },
    {
      code: 'hu-HU',
      play: 'Játék',
      prompt: 'Betűzd azt a szót, hogy cat',
      voice: { lang: 'hu-HU', name: 'Eszter' },
    },
  ])('uses localized copy and a matching $code voice', ({ code, play, prompt, voice }) => {
    vi.useFakeTimers();
    window.speechSynthesis.getVoices.mockReturnValue([
      { lang: 'en-GB', name: 'Serena' },
      voice,
    ]);

    render(<App />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), {
      target: { value: code },
    });
    fireEvent.click(screen.getByRole('button', { name: play }));
    act(() => vi.advanceTimersByTime(121));

    const utterance = window.speechSynthesis.speak.mock.calls.at(-1)[0];
    expect(utterance.text).toBe(prompt);
    expect(utterance.lang).toBe(code);
    expect(utterance.voice).toBe(voice);
    expect(document.documentElement).toHaveAttribute('lang', code);
  });

  it('pronounces a clicked Hungarian accented letter without describing the glyph', () => {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        locale: 'hu-HU',
        customWords: 'éva',
        wordSource: 'custom',
        roundLength: 3,
        music: false,
      }),
    );

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Játék' }));
    fireEvent.click(screen.getByRole('button', { name: 'é, aktuális betű' }));

    const utterance = window.speechSynthesis.speak.mock.calls.at(-1)[0];
    expect(utterance.text).toBe('é.');
    expect(utterance.lang).toBe('hu-HU');
  });

  it('requires confirmation before a settings language change restarts the game', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open parent settings' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), {
      target: { value: 'en-US' },
    });
    expect(screen.getByRole('alertdialog', { name: 'Change language?' })).toBeInTheDocument();
    expect(document.querySelector('.app')).toHaveAttribute('data-phase', 'playing');

    fireEvent.click(screen.getByRole('button', { name: 'Keep current language' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Settings (for parents)' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en-GB');

    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), {
      target: { value: 'en-US' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Change & restart' }));

    expect(document.querySelector('.app')).toHaveAttribute('data-phase', 'welcome');
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en-US');
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY))).toMatchObject({ locale: 'en-US' });
  });

  it('lets grown-ups switch the letter eyes off', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open parent settings' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cartoon eyes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(document.querySelector('.eyes')).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY))).toMatchObject({ eyes: false });
  });

  it('lets grown-ups enable unaccented typing and persists the preference', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open parent settings' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Accept unaccented typing' }));
    expect(screen.getByRole('dialog', { name: 'Settings (for parents)' }).querySelector('.saved-toast'))
      .toHaveTextContent('✓ Saved');

    expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY))).toMatchObject({
      acceptUnaccented: true,
    });
  });

  it('practises tricky words by default and lets grown-ups switch it off', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open parent settings' }));
    const toggle = screen.getByRole('checkbox', { name: 'Practise tricky words a little more often' });
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY))).toMatchObject({
      adaptivePractice: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    // Adaptive practice is a parent-only concern: the play screen is unchanged either way.
    expect(document.querySelector('.app')).toHaveAttribute('data-phase', 'playing');
    expect(document.querySelectorAll('.letter').length).toBeGreaterThan(0);
  });

  it('requires accents by default and accepts plain equivalents only when enabled', () => {
    vi.useFakeTimers();
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        locale: 'sv-SE',
        customWords: 'tårta',
        wordSource: 'custom',
        roundLength: 3,
        music: false,
      }),
    );

    const exactRound = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Spela' }));
    fireEvent.input(screen.getByRole('textbox', { name: 'Skriv nästa bokstav' }), {
      target: { value: 'tarta' },
    });

    expect(screen.getByRole('button', { name: 'å, aktuell bokstav' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Försök en gång till');
    exactRound.unmount();

    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        locale: 'sv-SE',
        acceptUnaccented: true,
        customWords: 'tårta',
        wordSource: 'custom',
        roundLength: 3,
        music: false,
      }),
    );

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Spela' }));
    fireEvent.input(screen.getByRole('textbox', { name: 'Skriv nästa bokstav' }), {
      target: { value: 'tarta' },
    });

    act(() => vi.advanceTimersByTime(760));
    expect(screen.getByLabelText('Ord 2 av 3')).toBeInTheDocument();
  });

  it('replaces the final letter sound with the word-completion ding', () => {
    const playSpy = vi.spyOn(Audio.prototype, 'play');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    const input = screen.getByRole('textbox', { name: 'Type the next letter' });

    fireEvent.input(input, { target: { value: 'c' } });
    fireEvent.input(input, { target: { value: 'a' } });
    const letterSoundsBeforeFinalLetter = playSpy.mock.contexts.filter((audio) =>
      audio.src.endsWith('/pop.mp3'));
    fireEvent.input(input, { target: { value: 't' } });

    expect(playSpy.mock.contexts.some((audio) => audio.src.endsWith('/done.mp3'))).toBe(true);
    expect(letterSoundsBeforeFinalLetter).toHaveLength(2);
    expect(letterSoundsBeforeFinalLetter[0]).toBe(letterSoundsBeforeFinalLetter[1]);
    expect(playSpy.mock.contexts.filter((audio) => audio.src.endsWith('/pop.mp3'))).toHaveLength(2);
  });

  it('preloads each reusable feedback sound before play begins', () => {
    const loadSpy = vi.spyOn(Audio.prototype, 'load');
    render(<App />);

    expect(loadSpy.mock.contexts.map((audio) => audio.src)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/pop\.mp3$/u),
        expect.stringMatching(/\/bad\.mp3$/u),
        expect.stringMatching(/\/done\.mp3$/u),
        expect.stringMatching(/\/star1\.mp3$/u),
        expect.stringMatching(/\/star2\.mp3$/u),
        expect.stringMatching(/\/star3\.mp3$/u),
      ]),
    );
    expect(loadSpy.mock.contexts.every((audio) => audio.preload === 'auto')).toBe(true);
  });

  it('mixes rapid feedback effects through separate Web Audio sources during speech', async () => {
    const startedSources = [];
    const contexts = [];

    class BufferSourceMock extends EventTarget {
      connect() {}
      disconnect() {}
      start() {
        startedSources.push(this);
      }
      stop() {}
    }

    class AudioContextMock {
      constructor() {
        this.state = 'suspended';
        this.destination = {};
        this.decodeAudioData = vi.fn(async () => ({}));
        this.resume = vi.fn(() => {
          this.state = 'running';
          return Promise.resolve();
        });
        contexts.push(this);
      }
      close() {
        this.state = 'closed';
        return Promise.resolve();
      }
      createBufferSource() {
        return new BufferSourceMock();
      }
      createGain() {
        return { connect() {}, disconnect() {}, gain: { value: 1 } };
      }
    }

    const audioContextDescriptor = Object.getOwnPropertyDescriptor(window, 'AudioContext');
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: AudioContextMock,
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      arrayBuffer: async () => new ArrayBuffer(1),
      ok: true,
    });
    const fallbackPlaySpy = vi.spyOn(Audio.prototype, 'play');

    const view = render(<App />);
    await waitFor(() => expect(contexts[0].decodeAudioData).toHaveBeenCalledTimes(7));

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    const input = screen.getByRole('textbox', { name: 'Type the next letter' });
    fireEvent.keyDown(input, { key: 'c' });
    fireEvent.keyDown(input, { key: 'a' });

    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    expect(window.speechSynthesis.cancel).toHaveBeenCalledTimes(1);
    expect(contexts[0].resume).toHaveBeenCalledTimes(1);
    expect(startedSources).toHaveLength(2);
    expect(startedSources[0]).not.toBe(startedSources[1]);
    expect(fallbackPlaySpy).not.toHaveBeenCalled();

    view.unmount();
    fetchSpy.mockRestore();
    if (audioContextDescriptor) {
      Object.defineProperty(window, 'AudioContext', audioContextDescriptor);
    } else {
      delete window.AudioContext;
    }
  });

  it('waits for the final ding to finish before giving varied spoken praise', () => {
    vi.useFakeTimers();
    const playSpy = vi.spyOn(Audio.prototype, 'play');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    const finishRound = () => {
      for (let word = 1; word <= 3; word += 1) {
        fireEvent.input(screen.getByRole('textbox', { name: 'Type the next letter' }), {
          target: { value: 'cat' },
        });
        const ding = playSpy.mock.contexts.filter((audio) => audio.src.endsWith('/done.mp3')).at(-1);

        if (word < 3) {
          act(() => vi.advanceTimersByTime(760));
        } else {
          expect(screen.queryByRole('button', { name: 'Play again' })).not.toBeInTheDocument();
          act(() => ding.dispatchEvent(new Event('ended')));
          act(() => vi.advanceTimersByTime(759));
          expect(screen.queryByRole('button', { name: 'Play again' })).not.toBeInTheDocument();
          act(() => vi.advanceTimersByTime(1));
        }
      }
    };

    finishRound();

    const firstPraise = window.speechSynthesis.speak.mock.calls.at(-1)[0].text;
    expect(firstPraise).toBe('Amazing! You finished the round!');

    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    finishRound();

    expect(window.speechSynthesis.speak.mock.calls.at(-1)[0].text).toBe(
      'Brilliant work! You finished the round!',
    );
  });

  it('hides letters in normal mode, reveals typed letters, and escalates hints on misses', () => {
    vi.useFakeTimers();
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        gameMode: 'normal',
        customWords: 'cat',
        wordSource: 'custom',
        roundLength: 3,
        music: false,
      }),
    );

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    const input = screen.getByRole('textbox', { name: 'Type the next letter' });

    expect(screen.getByRole('button', { name: 'hidden letter, current letter' })).toHaveClass('letter--hidden');
    expect(screen.getAllByRole('button', { name: 'hidden letter, next' })).toHaveLength(2);

    fireEvent.keyDown(input, { key: 'c' });
    expect(screen.getByRole('button', { name: 'c, completed' })).toHaveClass('letter--was-hidden');

    fireEvent.keyDown(input, { key: 'x' });
    expect(screen.getByRole('button', { name: 'hidden letter, current letter' })).not.toHaveClass('letter--hint-ghost');

    fireEvent.keyDown(input, { key: 'x' });
    expect(screen.getByRole('button', { name: 'hidden letter, current letter' })).toHaveClass('letter--hint-ghost');
    expect(window.speechSynthesis.speak.mock.calls.at(-1)[0].text).toMatch(/Almost.+A\.$/u);
    expect(document.querySelectorAll('.heart-burst span')).toHaveLength(3);

    fireEvent.keyDown(input, { key: 'x' });
    expect(screen.getByRole('button', { name: 'a, current letter' })).not.toHaveClass('letter--hidden');

    fireEvent.keyDown(input, { key: 'a' });
    fireEvent.keyDown(input, { key: 't' });
    expect(screen.getByLabelText('Word 1 of 3')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(760));
    expect(screen.getByLabelText('Word 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'hidden letter, current letter' })).toBeInTheDocument();
  });

  it('records play statistics on word completion and lets grown-ups erase them', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.input(screen.getByRole('textbox', { name: 'Type the next letter' }), {
      target: { value: 'xcat' },
    });
    fireEvent.input(screen.getByRole('textbox', { name: 'Type the next letter' }), {
      target: { value: 'cat' },
    });

    const stored = JSON.parse(window.localStorage.getItem(STATS_KEY));
    expect(stored.totals).toMatchObject({ attempts: 4, misses: 1, wordsCompleted: 1 });
    expect(stored.letters.c.attempts).toBe(2);
    expect(stored.confusions['c→x']).toBe(1);
    expect(stored.words['en-GB/cat']).toMatchObject({ completed: 1, perfect: false });
    expect(stored.recentEvents.length).toBeGreaterThan(0);
    expect(JSON.parse(window.localStorage.getItem(PROGRESS_KEY))).toMatchObject({ totalStars: 2 });

    fireEvent.click(screen.getByRole('button', { name: 'Open parent settings' }));
    expect(screen.getByText('1 words practised')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear progress' }));
    expect(screen.getByRole('alertdialog', { name: 'Clear progress?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear everything' }));

    expect(window.localStorage.getItem(STATS_KEY)).toBeNull();
    expect(window.localStorage.getItem(PROGRESS_KEY)).toBeNull();
    expect(screen.getByText(/No play data yet/)).toBeInTheDocument();
  });

  it('exports valid local stats and reward progress as dated JSON', async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectURL = vi.fn(() => 'blob:project-spell-test');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    try {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      fireEvent.input(screen.getByRole('textbox', { name: 'Type the next letter' }), {
        target: { value: 'cat' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Open parent settings' }));
      fireEvent.click(screen.getByRole('button', { name: 'Download data' }));

      const blob = createObjectURL.mock.calls[0][0];
      const json = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(reader.result), { once: true });
        reader.addEventListener('error', () => reject(reader.error), { once: true });
        reader.readAsText(blob);
      });
      const payload = JSON.parse(json);

      expect(payload.stats.totals).toMatchObject({ attempts: 3, wordsCompleted: 1 });
      expect(payload.progress).toMatchObject({ version: 1, totalStars: 3 });
      expect(clickSpy.mock.contexts[0].download).toMatch(/^project-spell-data-\d{4}-\d{2}-\d{2}\.json$/u);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:project-spell-test');
    } finally {
      clickSpy.mockRestore();
      if (originalCreateObjectURL) {
        Object.defineProperty(URL, 'createObjectURL', {
          configurable: true,
          value: originalCreateObjectURL,
        });
      } else {
        delete URL.createObjectURL;
      }
      if (originalRevokeObjectURL) {
        Object.defineProperty(URL, 'revokeObjectURL', {
          configurable: true,
          value: originalRevokeObjectURL,
        });
      } else {
        delete URL.revokeObjectURL;
      }
    }
  });

  it('adds perfect-word stars and shows the round ceremony', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        customWords: 'cat',
        wordSource: 'custom',
        roundLength: 3,
        music: false,
        soundEffects: false,
      }),
    );

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    for (let word = 1; word <= 3; word += 1) {
      fireEvent.input(screen.getByRole('textbox', { name: 'Type the next letter' }), {
        target: { value: 'cat' },
      });
      expect(JSON.parse(window.localStorage.getItem(PROGRESS_KEY)).totalStars).toBe(word * 3);
      expect(document.querySelectorAll('.star-trail__socket--filled')).toHaveLength(word);
      if (word === 3) {
        expect(document.querySelector('.app')).toHaveAttribute('data-phase', 'playing');
        expect(document.querySelector('.star-trail__croc')).toHaveStyle({ left: '100%' });
        expect(document.querySelector('.star-trail__line-fill')).toHaveStyle({
          width: 'calc(100% + 2 * var(--trail-pad))',
        });
      }
      act(() => vi.advanceTimersByTime(760));
    }

    expect(screen.getByRole('img', { name: '3 stars for this round' })).toBeInTheDocument();
    expect(document.querySelectorAll('.star-ceremony__star--filled')).toHaveLength(3);
    expect(screen.getByLabelText('★ 9 stars in your jar')).toBeInTheDocument();
    expect(screen.getByText('3 rounds to the super round')).toBeInTheDocument();
  });

  it('does not create confetti when reduced motion is requested', () => {
    vi.useFakeTimers();
    window.matchMedia.mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.input(screen.getByRole('textbox', { name: 'Type the next letter' }), {
      target: { value: 'cat' },
    });

    expect(document.querySelector('.word')).toHaveClass('word--celebrating');
    expect(document.querySelector('.confetti')).not.toBeInTheDocument();
    expect(document.querySelector('.heart-burst')).not.toBeInTheDocument();
  });

  it('starts the fourth round as a skippable super round and awards a shiny sticker', () => {
    vi.useFakeTimers();
    window.localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({
        version: 1,
        totalStars: 9,
        stickers: ['en-GB/dog'],
        shinyStickers: [],
        badges: [],
        roundsTowardSuper: 3,
      }),
    );
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        customWords: 'cat',
        wordSource: 'custom',
        roundLength: 3,
        music: false,
        soundEffects: false,
      }),
    );

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(document.querySelector('.app')).toHaveAttribute('data-round', 'super');
    expect(screen.getByRole('button', { name: 'Super round!' })).toBeInTheDocument();
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    expect(window.speechSynthesis.speak.mock.calls[0][0].text).toMatch(/super round/iu);
    expect(screen.queryByText('Spell the word cat')).not.toBeInTheDocument();

    fireEvent.input(screen.getByRole('textbox', { name: 'Type the next letter' }), {
      target: { value: 'cat' },
    });
    expect(document.querySelectorAll('.star-trail__socket--filled')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Super round!' }));
    expect(screen.queryByRole('button', { name: 'Super round!' })).not.toBeInTheDocument();
    expect(window.speechSynthesis.speak.mock.calls.at(-1)[0].text).toBe('Spell the word cat');

    for (let word = 0; word < 3; word += 1) {
      fireEvent.input(screen.getByRole('textbox', { name: 'Type the next letter' }), {
        target: { value: 'cat' },
      });
      act(() => vi.advanceTimersByTime(760));
    }

    expect(screen.getByText('A shiny sticker for your book!')).toBeInTheDocument();
    expect(screen.getByText('Super round finished — what a star!')).toBeInTheDocument();
    expect(document.querySelectorAll('.journey-strip__socket--filled')).toHaveLength(3);
    expect(document.querySelector('.journey-strip__gift')).toHaveClass('journey-strip__gift--opened');
    expect(JSON.parse(window.localStorage.getItem(PROGRESS_KEY))).toMatchObject({
      roundsTowardSuper: 0,
      shinyStickers: ['1f451'],
      stickers: ['en-GB/dog'],
    });
  });

  it('lets grown-ups pick normal mode and reminds them it needs speech', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open parent settings' }));

    fireEvent.click(screen.getByRole('radio', { name: /letters are hidden/ }));
    expect(screen.queryByText(/works best with/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Say each word' }));
    expect(screen.getByText(/works best with/)).toBeInTheDocument();

    expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY))).toMatchObject({
      gameMode: 'normal',
      speech: false,
    });
  });

  it('opens the sticker book from the welcome screen and closes it with Escape', () => {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      version: 1,
      totalStars: 0,
      stickers: ['en-GB/cat', 'en-GB/apple'],
      shinyStickers: [],
      badges: [],
    }));
    render(<App />);

    const bookTab = screen.getByRole('button', { name: 'Open sticker book' });
    expect(bookTab).toHaveClass('book-tab');
    fireEvent.click(bookTab);
    const book = screen.getByRole('dialog', { name: 'My sticker book' });
    expect(book).toBeInTheDocument();
    expect(within(book).getByText('2 stickers')).toBeInTheDocument();
    expect(within(book).getByText('Animals · 1 stickers')).toBeInTheDocument();
    expect(within(book).getByText('Food · 1 stickers')).toBeInTheDocument();
    expect(within(book).getByText('Things · 0 stickers')).toBeInTheDocument();
    expect(book.querySelectorAll('.sticker-book__section')).toHaveLength(3);
    expect(within(book).queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    expect(book.querySelectorAll('.sticker-card--silhouette')).toHaveLength(4);
    expect(book.querySelector('.sticker-card--silhouette button')).not.toBeInTheDocument();

    fireEvent.keyDown(book, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'My sticker book' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.queryByRole('button', { name: 'Open sticker book' })).not.toBeInTheDocument();
  });

  it('awards one round sticker, earns quiet badges, and speaks stickers from the book', () => {
    vi.useFakeTimers();
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        customWords: 'cat',
        wordSource: 'custom',
        roundLength: 3,
        music: false,
        soundEffects: false,
      }),
    );

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    for (let word = 0; word < 3; word += 1) {
      fireEvent.input(screen.getByRole('textbox', { name: 'Type the next letter' }), {
        target: { value: 'cat' },
      });
      act(() => vi.advanceTimersByTime(760));
    }

    expect(screen.getByText('A new sticker for your book!')).toBeInTheDocument();
    expect(screen.getByText('New badge: First round')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(PROGRESS_KEY))).toMatchObject({
      stickers: ['en-GB/cat'],
      badges: expect.arrayContaining(['first-round', 'perfect-round']),
    });

    const roundPraise = window.speechSynthesis.speak.mock.calls.at(-1)[0];
    const speechCountAfterPraise = window.speechSynthesis.speak.mock.calls.length;
    expect(roundPraise.text).not.toMatch(/cat/iu);
    act(() => roundPraise.onend());
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(speechCountAfterPraise);

    fireEvent.click(screen.getByRole('button', { name: 'Open sticker book' }));
    const book = screen.getByRole('dialog', { name: 'My sticker book' });
    expect(within(book).getByText('Animals · 1 stickers')).toBeInTheDocument();
    fireEvent.click(within(book).getByRole('button', { name: 'cat' }));
    expect(window.speechSynthesis.speak.mock.calls.at(-1)[0].text).toBe('cat');
    expect(within(book).getByText('First round')).toBeInTheDocument();
  });

  it('celebrates a completed sticker page only on its first opening', () => {
    const animalCodepoints = new Set(STICKER_THEMES.animals);
    const seen = new Set();
    const animalStickers = Object.entries(STICKER_MAP['en-GB']).flatMap(([word, codepoint]) => {
      if (!animalCodepoints.has(codepoint) || seen.has(codepoint)) return [];
      seen.add(codepoint);
      return [`en-GB/${word}`];
    });
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      version: 1,
      totalStars: 0,
      stickers: animalStickers,
      shinyStickers: [],
      badges: [],
      roundsTowardSuper: 0,
      lastCelebratedPages: [],
    }));

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open sticker book' }));

    expect(document.querySelector('.sticker-book__page')).toHaveClass('sticker-book__page--party');
    expect(document.querySelectorAll('.sticker-book__confetti span')).toHaveLength(12);
    expect(JSON.parse(window.localStorage.getItem(PROGRESS_KEY)).lastCelebratedPages)
      .toContain('animals');

    fireEvent.click(screen.getByRole('button', { name: 'Close sticker book' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open sticker book' }));
    expect(document.querySelector('.sticker-book__page')).not.toHaveClass('sticker-book__page--party');
    expect(document.querySelector('.sticker-book__confetti')).not.toBeInTheDocument();
  });

  it('shows the app version and asset licences in the parent About section', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open parent settings' }));

    const dialog = screen.getByRole('dialog', { name: 'Settings (for parents)' });
    fireEvent.click(within(dialog).getByText('About'));
    expect(within(dialog).getByText(`v${packageInfo.version}`)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Noto Emoji colour SVG artwork' }))
      .toHaveAttribute('href', 'https://github.com/googlefonts/noto-emoji');
    expect(within(dialog).getByRole('link', { name: 'Crocodile icon' }))
      .toHaveAttribute('href', 'https://www.flaticon.com/free-icon/crocodile_220061');
    expect(within(dialog).getByText(/Children's March Theme/u)).toBeInTheDocument();
    expect(within(dialog).getByText(/Town Theme RPG/u)).toBeInTheDocument();
    expect(within(dialog).getAllByText(/Provenance unknown/u)).toHaveLength(1);
  });

  it('selects a background track at round start and ducks it while speech is active', () => {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        customWords: 'cat',
        wordSource: 'custom',
        roundLength: 3,
        music: true,
      }),
    );
    const loadSpy = vi.spyOn(Audio.prototype, 'load');
    const playSpy = vi.spyOn(Audio.prototype, 'play');

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    const music = playSpy.mock.contexts.find((audio) => audio.loop);
    expect(music.src).toMatch(/\/(?:bgmusic2|bgmusic3|town-theme)\.mp3$/u);
    expect(loadSpy.mock.contexts).toContain(music);
    expect(music.volume).toBe(0.05);

    const prompt = window.speechSynthesis.speak.mock.calls.at(-1)[0];
    act(() => prompt.onend());
    expect(music.volume).toBe(0.12);
  });

  it('plays the round fanfare through the reusable effect path', () => {
    vi.useFakeTimers();
    const playSpy = vi.spyOn(Audio.prototype, 'play');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    for (let word = 1; word <= 3; word += 1) {
      fireEvent.input(screen.getByRole('textbox', { name: 'Type the next letter' }), {
        target: { value: 'cat' },
      });
      const ding = playSpy.mock.contexts.filter((audio) => audio.src.endsWith('/done.mp3')).at(-1);
      if (word === 3) act(() => ding.dispatchEvent(new Event('ended')));
      act(() => vi.advanceTimersByTime(760));
    }

    expect(playSpy.mock.contexts.some((audio) => audio.src.endsWith('/fanfare.mp3'))).toBe(true);
    expect(playSpy.mock.contexts.filter((audio) => audio.src.endsWith('/fanfare.mp3'))).toHaveLength(1);
  });

  describe('on-screen letter keyboard', () => {
    const withKeyboard = (keyboard) => {
      window.localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          ...DEFAULT_SETTINGS,
          customWords: 'cat',
          wordSource: 'custom',
          roundLength: 3,
          music: false,
          keyboard,
        }),
      );
    };

    it('stays off by default so the device keyboard is the norm', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));

      expect(screen.queryByRole('group', { name: 'Letter keys' })).not.toBeInTheDocument();
    });

    it('spells a word by tapping keys, exactly like typing does', () => {
      withKeyboard('simple');
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));

      const keyboard = screen.getByRole('group', { name: 'Letter keys' });
      ['c', 'a', 't'].forEach((letter) => {
        fireEvent.click(within(keyboard).getByRole('button', { name: letter }));
      });

      expect(screen.getByRole('button', { name: 't, completed' })).toBeInTheDocument();
      expect(document.querySelectorAll('.star-trail__socket--filled')).toHaveLength(1);
    });

    it('offers the whole alphabet in full mode and only a few keys in simple mode', () => {
      withKeyboard('full');
      const full = render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      expect(within(screen.getByRole('group', { name: 'Letter keys' })).getAllByRole('button'))
        .toHaveLength(26);
      full.unmount();

      withKeyboard('simple');
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      const keys = within(screen.getByRole('group', { name: 'Letter keys' })).getAllByRole('button');
      expect(keys).toHaveLength(9);
      // The word's own letters must always be reachable.
      const labels = keys.map((key) => key.textContent);
      expect(labels).toEqual(expect.arrayContaining(['c', 'a', 't']));
    });

    it('points at the right key after a second miss, in easy mode too', () => {
      withKeyboard('simple');
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      const input = screen.getByRole('textbox', { name: 'Type the next letter' });
      const keyboard = screen.getByRole('group', { name: 'Letter keys' });

      fireEvent.keyDown(input, { key: 'x' });
      expect(keyboard.querySelector('.letter-key--hint')).toBeNull();

      fireEvent.keyDown(input, { key: 'z' });
      expect(within(keyboard).getByRole('button', { name: 'c' })).toHaveClass('letter-key--hint');

      // The hint clears once the child gets it right.
      fireEvent.keyDown(input, { key: 'c' });
      expect(keyboard.querySelector('.letter-key--hint')).toBeNull();
    });

    it('keeps physical typing working while the keys are on screen', () => {
      withKeyboard('simple');
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));

      const keyboard = screen.getByRole('group', { name: 'Letter keys' });
      fireEvent.click(within(keyboard).getByRole('button', { name: 'c' }));
      fireEvent.keyDown(screen.getByRole('textbox', { name: 'Type the next letter' }), { key: 'a' });

      expect(screen.getByRole('button', { name: 'a, completed' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 't, current letter' })).toBeInTheDocument();
    });
  });

  describe('background palette', () => {
    it('paints the chosen ground and keeps it per child', () => {
      render(<App />);
      expect(document.querySelector('.app')).toHaveAttribute('data-palette', 'sunshine');

      fireEvent.click(screen.getByRole('button', { name: 'Open parent settings' }));
      fireEvent.click(screen.getByRole('radio', { name: 'Mint' }));

      expect(document.querySelector('.app')).toHaveAttribute('data-palette', 'mint');
      expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY)).palette).toBe('mint');
    });
  });

  describe('child-facing mode picker', () => {
    it('switches game mode from the welcome screen and keeps it for that child', () => {
      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: 'Switch to normal mode' }));
      expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY)).gameMode).toBe('normal');

      // The letters are hidden in normal mode; the toggle is the only thing that changed.
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      expect(screen.getByRole('button', { name: 'hidden letter, current letter' })).toBeInTheDocument();
    });

    it('is absent during play so the child screen keeps one action', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));

      expect(screen.queryByRole('button', { name: /^Switch to/u })).not.toBeInTheDocument();
    });
  });

  describe('local profiles', () => {
    const addProfile = (name) => {
      fireEvent.click(screen.getByRole('button', { name: 'Add a name' }));
      fireEvent.change(screen.getByLabelText('First name'), { target: { value: name } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    };

    it('offers only an add tile until somebody types a name', () => {
      render(<App />);

      expect(screen.getByRole('button', { name: 'Add a name' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Play as/u })).not.toBeInTheDocument();
      // Nothing to show at the top of the play screen for an unnamed player.
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      expect(document.querySelector('.play-name')).toBeNull();
    });

    it('shows the name in game letters at the top of the play screen', () => {
      render(<App />);
      addProfile('Anna');

      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      const nameTag = document.querySelector('.play-name');
      expect(nameTag).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Anna' })).toBeInTheDocument();
      expect([...nameTag.querySelectorAll('.name-tag__tile')].map((tile) => tile.textContent))
        .toEqual(['A', 'n', 'n', 'a']);
    });

    it('adopts existing progress for the first name rather than stranding it', () => {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, totalStars: 12 }));
      render(<App />);
      expect(screen.getByLabelText('★ 12 stars in your jar')).toBeInTheDocument();

      addProfile('Anna');

      // Naming the anonymous slot must not reset the stars already earned on this device.
      expect(screen.getByLabelText('★ 12 stars in your jar')).toBeInTheDocument();
      expect(window.localStorage.getItem(PROFILES_KEY)).toContain('Anna');
    });

    it('gives a second child their own empty jar and leaves the first intact', () => {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, totalStars: 12 }));
      render(<App />);
      addProfile('Anna');
      addProfile('Bo');

      expect(screen.queryByLabelText('★ 12 stars in your jar')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Play as Bo' })).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(screen.getByRole('button', { name: 'Play as Anna' }));
      expect(screen.getByLabelText('★ 12 stars in your jar')).toBeInTheDocument();
      // Anna keeps the original un-suffixed keys; Bo is stored alongside, not over the top.
      expect(window.localStorage.getItem(PROGRESS_KEY)).toContain('"totalStars":12');
    });

    it('keeps each child on their own settings', () => {
      render(<App />);
      addProfile('Anna');
      addProfile('Bo');

      // The language select relabels itself in the chosen language, so query it by role.
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sv-SE' } });
      expect(screen.getByRole('combobox')).toHaveValue('sv-SE');

      fireEvent.click(screen.getByRole('button', { name: 'Spela som Anna' }));
      expect(screen.getByRole('combobox')).toHaveValue('en-GB');
    });

    it('returns to the welcome screen when a child is switched mid-round', () => {
      render(<App />);
      addProfile('Anna');
      addProfile('Bo');
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      expect(screen.getByRole('textbox', { name: 'Type the next letter' })).toBeInTheDocument();

      // Chips are welcome-screen only; mid-round switching belongs to the grown-ups panel.
      fireEvent.click(screen.getByRole('button', { name: 'Open parent settings' }));
      fireEvent.click(screen.getByRole('button', { name: 'Play as Anna' }));

      expect(screen.queryByRole('textbox', { name: 'Type the next letter' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    });

    it('refuses a name with no letters in it', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Add a name' }));
      fireEvent.change(screen.getByLabelText('First name'), { target: { value: '123' } });

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    it('deletes a child and clears only their stored data', () => {
      render(<App />);
      addProfile('Anna');
      addProfile('Bo');
      const boKey = JSON.parse(window.localStorage.getItem(PROFILES_KEY)).activeId;
      // Settings persist on every change; progress only once a round is finished.
      expect(window.localStorage.getItem(`${SETTINGS_KEY}#${boKey}`)).not.toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Open parent settings' }));
      // The welcome chips stay mounted behind the panel, so scope to the panel itself.
      const panel = screen.getByRole('dialog');
      const boRow = within(panel).getByRole('button', { name: 'Play as Bo' }).closest('.profile-row');
      fireEvent.click(within(boRow).getByRole('button', { name: 'Delete' }));
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveTextContent('Delete Bo?');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

      expect(window.localStorage.getItem(`${SETTINGS_KEY}#${boKey}`)).toBeNull();
      expect(window.localStorage.getItem(SETTINGS_KEY)).not.toBeNull();
      expect(window.localStorage.getItem(PROFILES_KEY)).not.toContain('Bo');
    });
  });
});
