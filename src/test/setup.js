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
Object.defineProperty(window, 'speechSynthesis', {
  configurable: true,
  value: {
    addEventListener: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => []),
    removeEventListener: vi.fn(),
    speak: vi.fn(),
  },
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
  vi.useRealTimers();
});
