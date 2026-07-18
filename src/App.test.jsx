import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    expect(screen.getByRole('button', { name: 'Play' })).toHaveClass('welcome-play-button');
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

  it('advances immediately without waiting for the word-completion ding', () => {
    const playSpy = vi.spyOn(Audio.prototype, 'play');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    const input = screen.getByRole('textbox', { name: 'Type the next letter' });
    expect(screen.getByLabelText('Word 1 of 3')).toBeInTheDocument();

    fireEvent.input(input, { target: { value: 'cat' } });

    expect(playSpy.mock.contexts.some((audio) => audio.src.endsWith('/done.mp3'))).toBe(true);
    expect(screen.getByLabelText('Word 2 of 3')).toBeInTheDocument();
    expect(document.querySelector('.app')).toHaveAttribute('data-feedback', 'idle');
  });

  it('cuts the old prompt and speaks the next one while the ding is still playing', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    const cancellationsBeforeCompletion = window.speechSynthesis.cancel.mock.calls.length;

    fireEvent.input(screen.getByRole('textbox', { name: 'Type the next letter' }), {
      target: { value: 'cat' },
    });

    expect(screen.getByLabelText('Word 2 of 3')).toBeInTheDocument();
    expect(window.speechSynthesis.cancel.mock.calls.length).toBeGreaterThan(
      cancellationsBeforeCompletion,
    );
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(2);
    expect(window.speechSynthesis.speak.mock.calls.at(-1)[0].text).toBe('Spell the word cat');
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
    fireEvent.click(screen.getByRole('button', { name: 'Open grown-ups settings' }));

    const dialog = screen.getByRole('dialog', { name: 'Grown-ups' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: '🇬🇧 British English' })).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: '🇺🇸 US English' })).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: '🇸🇪 Svenska' })).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: '🇭🇺 Magyar' })).toBeInTheDocument();
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
      prompt: 'Betűzd ezt a szót: cat',
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

  it('lets grown-ups enable unaccented typing and persists the preference', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open grown-ups settings' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Accept unaccented typing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save & close' }));

    expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY))).toMatchObject({
      acceptUnaccented: true,
    });
  });

  it('requires accents by default and accepts plain equivalents only when enabled', () => {
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
    await waitFor(() => expect(contexts[0].decodeAudioData).toHaveBeenCalledTimes(3));

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
    act(() => vi.advanceTimersByTime(121));
    window.speechSynthesis.speak.mockClear();

    for (let word = 1; word <= 3; word += 1) {
      fireEvent.input(screen.getByRole('textbox', { name: 'Type the next letter' }), {
        target: { value: 'cat' },
      });
      const ding = playSpy.mock.contexts.filter((audio) => audio.src.endsWith('/done.mp3')).at(-1);

      if (word < 3) {
        expect(window.speechSynthesis.speak.mock.calls.at(-1)[0].text).toBe('Spell the word cat');
        window.speechSynthesis.speak.mockClear();
      } else {
        expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
        act(() => ding.dispatchEvent(new Event('ended')));
        expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
        act(() => vi.advanceTimersByTime(120));
      }
    }

    const firstPraise = window.speechSynthesis.speak.mock.calls.at(-1)[0].text;
    expect(firstPraise).toBe('Amazing! You finished the round!');

    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    window.speechSynthesis.speak.mockClear();
    for (let word = 1; word <= 3; word += 1) {
      fireEvent.input(screen.getByRole('textbox', { name: 'Type the next letter' }), {
        target: { value: 'cat' },
      });
      const ding = playSpy.mock.contexts.filter((audio) => audio.src.endsWith('/done.mp3')).at(-1);
      if (word < 3) {
        window.speechSynthesis.speak.mockClear();
      } else {
        act(() => ding.dispatchEvent(new Event('ended')));
        act(() => vi.advanceTimersByTime(120));
      }
    }

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
    expect(window.speechSynthesis.speak.mock.calls.at(-1)[0].text).toBe('a');

    fireEvent.keyDown(input, { key: 'x' });
    expect(screen.getByRole('button', { name: 'a, current letter' })).not.toHaveClass('letter--hidden');

    fireEvent.keyDown(input, { key: 'a' });
    fireEvent.keyDown(input, { key: 't' });
    expect(screen.getByLabelText('Word 1 of 3')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(651));
    expect(screen.getByLabelText('Word 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'hidden letter, current letter' })).toBeInTheDocument();
  });

  it('lets grown-ups pick normal mode and reminds them it needs speech', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open grown-ups settings' }));

    fireEvent.click(screen.getByRole('radio', { name: /letters are hidden/ }));
    expect(screen.queryByText(/works best with/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Say each word' }));
    expect(screen.getByText(/works best with/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save & close' }));
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY))).toMatchObject({
      gameMode: 'normal',
      speech: false,
    });
  });
});
