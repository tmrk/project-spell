import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

const storage = new Map();
const localStorageMock = {
  clear: () => storage.clear(),
  getItem: (key) => storage.get(String(key)) ?? null,
  key: (index) => [...storage.keys()][index] ?? null,
  get length() {
    return storage.size;
  },
  removeItem: (key) => storage.delete(String(key)),
  setItem: (key, value) => storage.set(String(key), String(value)),
};

Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorageMock });

class AudioMock extends EventTarget {
  constructor(source) {
    super();
    this.src = source;
    this.loop = false;
    this.preload = '';
    this.volume = 1;
    this.currentTime = 0;
  }

  load() {}

  play() {
    return Promise.resolve();
  }

  pause() {}
}

class SpeechSynthesisUtteranceMock {
  constructor(text) {
    this.text = text;
  }
}

Object.defineProperty(window, 'Audio', { configurable: true, value: AudioMock });
Object.defineProperty(globalThis, 'Audio', { configurable: true, value: AudioMock });
Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  configurable: true,
  value: SpeechSynthesisUtteranceMock,
});
// A working engine by default: it reports `start` and `end` for everything it is given, so tests
// about the game read as "this was said" without also having to drive a state machine. Speech is
// serialized through one queue (`src/speech.js`), and an engine that never reports back holds that
// queue by design — which is exactly what a stalled engine does in the wild. Tests that are about
// the speech lifecycle itself set `autoComplete = false` and deliver the events by hand.
const speechSynthesisMock = {
  addEventListener: vi.fn(),
  autoComplete: true,
  cancel: vi.fn(() => {
    speechSynthesisMock.pending = false;
    speechSynthesisMock.speaking = false;
  }),
  getVoices: vi.fn(() => []),
  pending: false,
  removeEventListener: vi.fn(),
  speaking: false,
  speak: vi.fn((utterance) => {
    if (!speechSynthesisMock.autoComplete) return;
    speechSynthesisMock.speaking = true;
    utterance.onstart?.();
    speechSynthesisMock.speaking = false;
    utterance.onend?.();
  }),
};

Object.defineProperty(window, 'speechSynthesis', {
  configurable: true,
  value: speechSynthesisMock,
});

const matchMediaResult = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: vi.fn(matchMediaResult),
});

window.requestAnimationFrame = (callback) => window.setTimeout(callback, 0);
window.cancelAnimationFrame = (handle) => window.clearTimeout(handle);

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.clearAllMocks();
  window.matchMedia.mockImplementation(matchMediaResult);
  window.speechSynthesis.autoComplete = true;
  window.speechSynthesis.cancel.mockImplementation(() => {
    window.speechSynthesis.pending = false;
    window.speechSynthesis.speaking = false;
  });
  window.speechSynthesis.speak.mockImplementation((utterance) => {
    if (!window.speechSynthesis.autoComplete) return;
    window.speechSynthesis.speaking = true;
    utterance.onstart?.();
    window.speechSynthesis.speaking = false;
    utterance.onend?.();
  });
  window.speechSynthesis.pending = false;
  window.speechSynthesis.speaking = false;
  vi.useRealTimers();
});
