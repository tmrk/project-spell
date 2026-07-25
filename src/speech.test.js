import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSpeechQueue, estimateSpeechMs, speechCeilingMs } from './speech';

// A stand-in for the platform engine, deliberately inert: it accepts utterances and reports
// nothing unless a test says so. Every real engine defect this module exists for looks like
// silence from here, so silence is the default and events are the exception.
function createEngine() {
  const spoken = [];
  const engine = {
    cancel: vi.fn(() => {
      engine.pending = false;
      engine.speaking = false;
    }),
    pending: false,
    speaking: false,
    speak: vi.fn((utterance) => {
      spoken.push(utterance);
    }),
    spoken,
    last: () => spoken.at(-1),
    // What a working engine does: report a start, then an end.
    start(utterance = engine.last()) {
      engine.speaking = true;
      utterance.onstart?.();
    },
    end(utterance = engine.last()) {
      engine.speaking = false;
      utterance.onend?.();
    },
    say(utterance = engine.last()) {
      engine.start(utterance);
      engine.end(utterance);
    },
  };
  return engine;
}

class UtteranceStub {
  constructor(text) {
    this.text = text;
  }
}

describe('speech duration estimates', () => {
  it('scales with length, punctuation and rate', () => {
    expect(estimateSpeechMs('')).toBe(0);
    expect(estimateSpeechMs('cat', 1)).toBeLessThan(estimateSpeechMs('elephant', 1));
    // Commas buy a real pause in every engine we care about, so they cost more than their glyph.
    expect(estimateSpeechMs('c, a, t.', 1)).toBeGreaterThan(estimateSpeechMs('catxxxx', 1));
    expect(estimateSpeechMs('cat', 1.5)).toBeLessThan(estimateSpeechMs('cat', 0.8));
  });

  it('keeps the emergency ceiling generous but always bounded', () => {
    // The old ceiling was a flat 20s, which is how a wedged engine could freeze a finished word.
    expect(speechCeilingMs('cat', 1.12)).toBeLessThan(4000);
    expect(speechCeilingMs('cat', 1.12)).toBeGreaterThan(estimateSpeechMs('cat', 1.12));
    expect(speechCeilingMs('x'.repeat(2000), 0.5)).toBeLessThanOrEqual(12000);
  });
});

describe('speech queue', () => {
  let engine;
  let queue;
  let busy;

  const create = (options = {}) => {
    busy = [];
    return createSpeechQueue({
      getSynth: () => engine,
      getUtteranceClass: () => UtteranceStub,
      onBusyChange: (value) => busy.push(value),
      ...options,
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    engine = createEngine();
    queue = create();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('speaks into an idle engine synchronously, so a first utterance keeps its user gesture', () => {
    expect(queue.speak({ text: 'hello' })).toBe(true);

    expect(engine.speak).toHaveBeenCalledTimes(1);
    expect(engine.last().text).toBe('hello');
    expect(engine.cancel).not.toHaveBeenCalled();
  });

  it('never submits a replacement in the same task as the cancel that made room for it', () => {
    queue.speak({ text: 'first' });
    engine.start();

    // The defect this exists for: Chromium and WebKit discard an utterance submitted while the
    // engine is still tearing down the one before it, silently and with no event at all.
    queue.speak({ text: 'second' });
    expect(engine.cancel).toHaveBeenCalledTimes(1);
    expect(engine.speak).toHaveBeenCalledTimes(1);

    // The flags clear the instant cancel returns, so the gate waits out a real minimum instead of
    // believing them: this is the window in which the replacement would have disappeared.
    vi.advanceTimersByTime(99);
    expect(engine.speak).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(engine.speak).toHaveBeenCalledTimes(2);
    expect(engine.last().text).toBe('second');
  });

  it('waits for an engine that stays busy, but never longer than the settle bound', () => {
    queue.speak({ text: 'first' });
    engine.start();
    queue.speak({ text: 'second' });
    // A wedged `speaking` flag is a known Chromium state. Speaking anyway beats silence forever.
    engine.cancel.mockImplementation(() => {});
    engine.speaking = true;

    vi.advanceTimersByTime(480);
    expect(engine.speak).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(20);
    expect(engine.speak).toHaveBeenCalledTimes(2);
  });

  it('reports every interrupted utterance as cancelled exactly once', () => {
    const onEnd = vi.fn();
    queue.speak([{ onEnd, text: 'first' }, { onEnd, text: 'queued' }]);
    engine.start();

    queue.speak({ text: 'second' });
    expect(onEnd).toHaveBeenCalledTimes(2);
    expect(onEnd).toHaveBeenNthCalledWith(1, 'cancelled');
    expect(onEnd).toHaveBeenNthCalledWith(2, 'cancelled');

    engine.end(engine.spoken[0]);
    expect(onEnd).toHaveBeenCalledTimes(2);
  });

  it('chains a queued utterance from the real end of the one before, with no cancel between', () => {
    const onEnd = vi.fn();
    queue.speak([
      { rate: 1.18, text: 'c, a, t.' },
      { onEnd, rate: 1.12, text: 'cat' },
    ]);

    expect(engine.spoken.map((utterance) => utterance.text)).toEqual(['c, a, t.']);
    expect(engine.last().rate).toBe(1.18);

    engine.start();
    expect(engine.spoken).toHaveLength(1);
    engine.end();

    // Submitted straight from the first stage's real end: the last letter must be complete, and a
    // cancel at that boundary is what shaves the audible tail off it on affected engines.
    expect(engine.spoken.map((utterance) => utterance.text)).toEqual(['c, a, t.', 'cat']);
    expect(engine.last().rate).toBe(1.12);
    expect(engine.cancel).not.toHaveBeenCalled();

    engine.say();
    expect(onEnd).toHaveBeenCalledExactlyOnceWith('end');
  });

  it('queues behind what is already speaking when asked to follow rather than interrupt', () => {
    queue.speak({ text: 'praise' });
    engine.start();

    queue.speak({ text: 'Spell the word cat' }, { mode: 'next' });
    expect(engine.speak).toHaveBeenCalledTimes(1);
    expect(engine.cancel).not.toHaveBeenCalled();

    engine.end();
    expect(engine.last().text).toBe('Spell the word cat');
    expect(engine.cancel).not.toHaveBeenCalled();
  });

  it('lets an identified request supersede one that never got its turn', () => {
    const stale = vi.fn();
    queue.speak({ text: 'busy' });
    engine.start();
    queue.speak({ id: 'prompt', onEnd: stale, text: 'Spell the word cat' }, { mode: 'next' });
    queue.speak({ id: 'prompt', text: 'Spell the word dog' }, { mode: 'next' });

    expect(stale).toHaveBeenCalledExactlyOnceWith('cancelled');
    engine.end();
    expect(engine.last().text).toBe('Spell the word dog');
    expect(engine.speak).toHaveBeenCalledTimes(2);
  });

  it('gives up on an utterance the engine silently dropped, and moves on', () => {
    const onEnd = vi.fn();
    queue.speak([{ onEnd, text: 'dropped' }, { text: 'next' }]);

    vi.advanceTimersByTime(1199);
    expect(onEnd).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onEnd).toHaveBeenCalledExactlyOnceWith('timeout');

    // The engine is taken back before anything else is submitted to it.
    expect(engine.cancel).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(engine.last().text).toBe('next');
  });

  it('keeps waiting for a slow voice the engine still reports as queued', () => {
    const onEnd = vi.fn();
    queue.speak({ onEnd, text: 'slow to start' });
    engine.pending = true;

    vi.advanceTimersByTime(2000);
    expect(onEnd).not.toHaveBeenCalled();
    expect(engine.cancel).not.toHaveBeenCalled();

    engine.pending = false;
    engine.start();
    engine.end();
    expect(onEnd).toHaveBeenCalledExactlyOnceWith('end');
  });

  it('treats a missing start callback as playback when the engine says it is speaking', () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    queue.speak({ onEnd, onStart, text: 'audible but quiet about it' });
    engine.speaking = true;

    vi.advanceTimersByTime(1200);
    expect(onStart).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(20000);
    expect(onEnd).toHaveBeenCalledTimes(1);
    // Long enough to be believed, but the ceiling always ends it — nothing waits forever.
    expect(onEnd).toHaveBeenCalledWith('timeout');
  });

  it('recovers a missing end callback once the engine reports it has stopped', () => {
    const onEnd = vi.fn();
    queue.speak({ onEnd, text: 'no end event' });
    engine.start();
    engine.speaking = false;

    vi.advanceTimersByTime(499);
    expect(onEnd).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onEnd).toHaveBeenCalledExactlyOnceWith('end');
    expect(engine.cancel).not.toHaveBeenCalled();
  });

  it('believes an engine that reports nothing at all for its own estimated duration', () => {
    const onEnd = vi.fn();
    queue.speak({ onEnd, rate: 1, text: 'a fairly long thing to say out loud' });
    // Started, but `speaking` never became true: some engines simply do not maintain it, and a
    // quiet flag from one of those says nothing about whether the audio has finished.
    engine.last().onstart();

    vi.advanceTimersByTime(500);
    expect(onEnd).not.toHaveBeenCalled();
    vi.advanceTimersByTime(estimateSpeechMs('a fairly long thing to say out loud', 1));
    expect(onEnd).toHaveBeenCalledExactlyOnceWith('end');
  });

  it('leaves no timers behind for an engine that completes inside speak()', () => {
    const onEnd = vi.fn();
    engine.speak.mockImplementation((utterance) => {
      engine.spoken.push(utterance);
      utterance.onstart?.();
      utterance.onend?.();
    });
    queue.speak({ onEnd, text: 'instant' });

    expect(onEnd).toHaveBeenCalledExactlyOnceWith('end');
    vi.advanceTimersByTime(30000);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(engine.cancel).not.toHaveBeenCalled();
  });

  it('reports a refused utterance rather than stalling the queue behind it', () => {
    const onEnd = vi.fn();
    engine.speak.mockImplementationOnce(() => {
      throw new Error('engine refused');
    });
    queue.speak([{ onEnd, text: 'refused' }, { text: 'next' }]);

    expect(onEnd).toHaveBeenCalledExactlyOnceWith('error');
    vi.advanceTimersByTime(100);
    expect(engine.last().text).toBe('next');
  });

  it('ducks for a whole queue rather than flickering between its parts', () => {
    queue.speak([{ text: 'c, a, t.' }, { text: 'cat' }]);
    expect(busy).toEqual([true]);

    engine.say();
    expect(busy).toEqual([true]);
    engine.say();
    expect(busy).toEqual([true, false]);
    expect(queue.isBusy()).toBe(false);
  });

  it('says nothing, and reports it, when there is no engine', () => {
    const onEnd = vi.fn();
    const silent = createSpeechQueue({ getSynth: () => null, getUtteranceClass: () => UtteranceStub });

    expect(silent.speak({ onEnd, text: 'into the void' })).toBe(false);
    expect(onEnd).toHaveBeenCalledExactlyOnceWith('unavailable');
  });

  it('applies the chosen voice, language and delivery to each utterance', () => {
    const voice = { lang: 'en-GB', name: 'Daniel' };
    const localised = create({ getVoice: (item) => (item.lang === 'en-GB' ? voice : null) });

    localised.speak({ lang: 'en-GB', pitch: 1.08, rate: 0.65, text: 'c' });
    expect(engine.last()).toMatchObject({ lang: 'en-GB', pitch: 1.08, rate: 0.65, voice });

    localised.speak({ lang: 'hu-HU', text: 'alma' });
    vi.advanceTimersByTime(100);
    expect(engine.last().voice).toBe(null);
  });

  it('cancelling an idle queue does not disturb an engine that has nothing of ours', () => {
    queue.speak({ text: 'done already' });
    engine.say();

    queue.cancel();
    expect(engine.cancel).not.toHaveBeenCalled();
  });
});
