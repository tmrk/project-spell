// One serialized queue in front of Web Speech.
//
// Every spoken thing in the game — the prompt, a tapped letter, praise, the greeting, the
// spell-back — goes through here, one utterance at a time. The game orchestrates *what* is said
// and in what order; this module owns the engine's unreliability. Two rules make it work:
//
//   1. Never call `speak()` in the same task as `cancel()`. Chromium and WebKit both discard the
//      new utterance when it is submitted while the engine is still tearing the previous one down,
//      silently and with no event. That single defect is why a tapped letter went quiet while an
//      earlier letter was still speaking, and why a prompt occasionally never arrived.
//   2. Chaining is queueing, never cancelling. Two utterances that belong together (the letters,
//      then the word) are submitted as one queue, so the second is spoken from the first's real end
//      without an intervening cancel — the invariant D-020 records.
//
// The one exception to rule 1 is the fast path: when nothing was cancelled and the engine reports
// itself idle, `speak()` is called synchronously. iOS Safari only permits the first utterance of a
// page from inside a user gesture, and a timer hop would forfeit that.
//
// Every utterance ends exactly once, through `onEnd(reason)`:
//   'end'         the engine reported completion;
//   'error'       the engine reported failure, or refused the utterance;
//   'timeout'     it never started, or never finished, within its bounded watchdog;
//   'cancelled'   something else took over — the caller should stand down, not advance;
//   'unavailable' there is no speech engine at all.
//
// Callers that chain must treat 'cancelled' as "stop"; everything else means "carry on". No caller
// may wait on speech to advance the game: audio is an optional enhancement (AGENTS.md), so the
// timings below bound how long a stalled engine can be believed, and the round always has its own
// way forward.

export const DEFAULT_RATE = 0.82;
export const DEFAULT_PITCH = 1.04;

// Rough speaking speed of a typical voice at rate 1, used only to bound patience — never to pace
// anything the child sees or hears. Punctuation buys a real pause in every engine we care about, so
// it is counted separately from the characters.
const CHARS_PER_SECOND = 12;
const PAUSE_MS = 180;
const LEAD_IN_MS = 350;
// A lone letter is *named*, not read. "c, a, t." is three spoken letter names, and a real voice
// spends roughly a third of a second on each — nothing like the eight characters of running text a
// flat characters-per-second rate charges for. Counting only the characters underestimated the
// spell-back's letter phrase by around a factor of three, which is what let the beat's time box
// close in the middle of the word (D-024). Added on top of the character cost rather than replacing
// it, so no other estimate in the app can come out smaller than it did before.
const NAMED_LETTER_MS = 300;

// How long to leave an engine alone after a cancel before handing it the next utterance. The flags
// are not enough on their own: `cancel()` clears `speaking` and `pending` immediately while the
// engine is still tearing the utterance down inside itself, which is the window in which the
// replacement disappears. So wait out a real minimum, then keep waiting while the flags say busy.
// A hundred milliseconds is inaudible between two spoken things and only applies to interruptions.
const SETTLE_MIN_MS = 100;
const SETTLE_STEP_MS = 20;
const SETTLE_MAX_MS = 400;
// A dropped utterance produces no event of any kind, so silence has to be interpreted. `speaking`
// proves a missing `start` callback did not mean failure and `pending` preserves a legitimately
// slow queued voice, but only up to a bound.
const START_TIMEOUT_MS = 1200;
const START_GIVE_UP_MS = 3200;
const HEALTH_INTERVAL_MS = 500;
// The emergency escape for an engine that has stopped reporting anything at all. Generous enough
// never to clip working speech, short enough that nothing downstream can be held for long.
const CEILING_FACTOR = 1.8;
const CEILING_SLACK_MS = 1200;
const CEILING_MIN_MS = 2500;
const CEILING_MAX_MS = 12000;

export function estimateSpeechMs(text, rate = DEFAULT_RATE) {
  const value = String(text ?? '');
  if (!value) return 0;
  const safeRate = Math.min(2, Math.max(0.5, Number(rate) || 1));
  const pauses = (value.match(/[,;:.!?]/gu) ?? []).length;
  const namedLetters = value
    .split(/\s+/u)
    .filter((token) => token.replace(/[,;:.!?]/gu, '').length === 1)
    .length;
  return Math.round(
    (value.length / (CHARS_PER_SECOND * safeRate)) * 1000
      + (namedLetters * NAMED_LETTER_MS) / safeRate
      + pauses * PAUSE_MS
      + LEAD_IN_MS,
  );
}

export function speechCeilingMs(text, rate) {
  return Math.min(
    CEILING_MAX_MS,
    Math.max(CEILING_MIN_MS, Math.round(estimateSpeechMs(text, rate) * CEILING_FACTOR + CEILING_SLACK_MS)),
  );
}

export function createSpeechQueue(options = {}) {
  const readSynth = options.getSynth ?? (() => window.speechSynthesis ?? null);
  const readUtteranceClass = options.getUtteranceClass ?? (() => window.SpeechSynthesisUtterance ?? null);
  const now = options.now ?? (() => performance.now());
  // The two hooks into the app are late-bound so the queue can outlive a changed voice, language or
  // ducking target without its own state machine being rebuilt underneath a running utterance.
  let getVoice = options.getVoice ?? (() => null);
  let onBusyChange = options.onBusyChange ?? (() => {});
  const setTimer = options.setTimeout ?? ((callback, delay) => window.setTimeout(callback, delay));
  const clearTimer = options.clearTimeout ?? ((handle) => window.clearTimeout(handle));

  let queue = [];
  let active = null;
  // The settle gate between a cancel and the next `speak()`.
  let startTimer = null;
  // Whichever of the start check or the health check is currently armed for the active utterance.
  let watchdog = null;
  let ceiling = null;
  let needsSettle = false;
  // When the engine was last asked to give the queue back, so the settle gate can wait out a real
  // minimum from that moment rather than trusting flags that clear the instant cancel returns.
  let settledAt = 0;
  let busy = false;

  const clearWatchdogs = () => {
    clearTimer(watchdog);
    watchdog = null;
    clearTimer(ceiling);
    ceiling = null;
  };

  const updateBusy = () => {
    const next = Boolean(active || queue.length || startTimer);
    if (next === busy) return;
    busy = next;
    onBusyChange(next);
  };

  const end = (item, reason) => item.onEnd?.(reason);

  const settle = (entry, reason) => {
    if (active !== entry) return;
    active = null;
    clearWatchdogs();
    if (reason === 'timeout') {
      // The engine is not reporting; take the queue back off it before anything else is submitted.
      needsSettle = true;
      settledAt = now();
      try {
        readSynth()?.cancel();
      } catch {
        // An engine that refuses to be cancelled is already handled by the settle gate.
      }
    }
    // Notify before recomputing busy so a caller that immediately chains keeps the music ducked
    // through the join rather than flickering the volume between two halves of one phrase.
    end(entry.item, reason);
    updateBusy();
    pump();
  };

  const checkHealth = (entry) => {
    if (active !== entry) return;
    const synth = readSynth();
    if (synth?.speaking) entry.sawSpeaking = true;
    // A quiet engine only proves completion once it has had time to say the thing, or once it has
    // reported speaking at least once. Engines that never set `speaking` are believed on their own
    // estimated duration instead of being cut short.
    const quiet = !synth || (!synth.speaking && !synth.pending);
    if (quiet && (entry.sawSpeaking || now() - entry.startedAt >= entry.estimate)) {
      settle(entry, 'end');
      return;
    }
    watchdog = setTimer(() => checkHealth(entry), HEALTH_INTERVAL_MS);
  };

  const markStarted = (entry) => {
    if (active !== entry || entry.started) return;
    entry.started = true;
    entry.startedAt = now();
    // An engine that reports `speaking` at its own `start` is one whose flag can be trusted to
    // fall again; one that does not gets believed for its estimated duration instead.
    if (readSynth()?.speaking) entry.sawSpeaking = true;
    clearTimer(watchdog);
    watchdog = setTimer(() => checkHealth(entry), HEALTH_INTERVAL_MS);
    entry.item.onStart?.();
  };

  const checkStart = (entry, giveUpAt) => {
    if (active !== entry || entry.started) return;
    const synth = readSynth();
    if (synth?.speaking) {
      entry.sawSpeaking = true;
      markStarted(entry);
      return;
    }
    if (synth?.pending && now() < giveUpAt) {
      watchdog = setTimer(() => checkStart(entry, giveUpAt), HEALTH_INTERVAL_MS);
      return;
    }
    // No events, nothing speaking, nothing queued: the engine dropped it.
    settle(entry, 'timeout');
  };

  const begin = (item) => {
    const synth = readSynth();
    const Utterance = readUtteranceClass();
    queue = queue.filter((entry) => entry !== item);
    needsSettle = false;
    if (!synth || !Utterance) {
      updateBusy();
      end(item, 'unavailable');
      return;
    }

    const utterance = new Utterance(item.text);
    utterance.rate = item.rate ?? DEFAULT_RATE;
    utterance.pitch = item.pitch ?? DEFAULT_PITCH;
    try {
      utterance.lang = item.lang;
      // A voice list can be replaced under us — by a language change here, or by the platform
      // itself — and assigning a voice the engine no longer recognises throws. Speech is an
      // enhancement: the worst that may happen is the platform default voice, never a dead app.
      utterance.voice = getVoice(item) ?? null;
    } catch {
      utterance.voice = null;
    }

    const entry = {
      estimate: estimateSpeechMs(item.text, item.rate ?? DEFAULT_RATE),
      item,
      sawSpeaking: false,
      started: false,
      startedAt: now(),
      utterance,
    };
    active = entry;

    // A superseded utterance's late callbacks must not disturb the one that replaced it.
    const guard = (handler) => (event) => {
      if (active !== entry) return;
      handler(event);
    };
    utterance.onstart = guard(() => markStarted(entry));
    utterance.onboundary = guard((event) => {
      // A boundary is itself proof that playback began, on an engine that omitted `start`.
      markStarted(entry);
      item.onBoundary?.(event);
    });
    utterance.onend = guard(() => settle(entry, 'end'));
    utterance.onerror = guard(() => settle(entry, 'error'));

    updateBusy();
    try {
      synth.speak(utterance);
    } catch {
      settle(entry, 'error');
      return;
    }
    // An engine that reports completion from inside `speak()` has already been through `settle`;
    // arming watchdogs now would leave two timers behind for an utterance that no longer exists.
    if (active !== entry) return;
    watchdog = setTimer(() => checkStart(entry, now() + START_GIVE_UP_MS), START_TIMEOUT_MS);
    ceiling = setTimer(() => settle(entry, 'timeout'), speechCeilingMs(item.text, utterance.rate));
  };

  const scheduleStart = (readyAt, deadline) => {
    startTimer = setTimer(() => {
      startTimer = null;
      if (!queue.length) {
        updateBusy();
        return;
      }
      const synth = readSynth();
      const waiting = now() < readyAt || (synth && (synth.speaking || synth.pending));
      if (waiting && now() < deadline) {
        scheduleStart(readyAt, deadline);
        return;
      }
      needsSettle = false;
      begin(queue[0]);
    }, SETTLE_STEP_MS);
  };

  function pump() {
    if (active || startTimer || !queue.length) return;
    const synth = readSynth();
    if (synth && !needsSettle && !synth.speaking && !synth.pending) {
      // Nothing was cancelled and the engine says it is idle: speak now, in the caller's task, so
      // a first utterance keeps the user gesture iOS Safari requires, and so a queued successor
      // follows a real `end` with no audible gap.
      begin(queue[0]);
      return;
    }
    const readyAt = needsSettle ? settledAt + SETTLE_MIN_MS : 0;
    scheduleStart(readyAt, Math.max(readyAt, now()) + SETTLE_MAX_MS);
    updateBusy();
  }

  const drop = (reason) => {
    const dropped = active ? [active.item, ...queue] : [...queue];
    const hadActive = Boolean(active);
    active = null;
    queue = [];
    clearWatchdogs();
    clearTimer(startTimer);
    startTimer = null;
    const synth = readSynth();
    // Cancel only when there is something of ours to take back, or the engine says it is busy. A
    // cancel issued after a real `end` is the redundant one that loses the next utterance.
    if (synth && (hadActive || synth.speaking || synth.pending)) {
      needsSettle = true;
      settledAt = now();
      try {
        synth.cancel();
      } catch {
        // Nothing to do: the settle gate covers an engine that will not cancel.
      }
    }
    updateBusy();
    dropped.forEach((item) => end(item, reason));
  };

  return {
    configure(next = {}) {
      if (next.getVoice) getVoice = next.getVoice;
      if (next.onBusyChange) onBusyChange = next.onBusyChange;
    },
    // `mode: 'next'` appends instead of interrupting — for speech that belongs *after* whatever is
    // already going, such as the next word's prompt behind a spell-back tail. An `id` makes a queued
    // item replaceable: a second prompt supersedes a first that never got its turn.
    speak(input, config = {}) {
      const items = (Array.isArray(input) ? input : [input]).filter((item) => item?.text);
      if (!items.length) return false;
      if (!readSynth() || !readUtteranceClass()) {
        items.forEach((item) => end(item, 'unavailable'));
        return false;
      }
      if (config.mode === 'next') {
        const ids = new Set(items.map((item) => item.id).filter(Boolean));
        const superseded = ids.size ? queue.filter((item) => item.id && ids.has(item.id)) : [];
        if (superseded.length) queue = queue.filter((item) => !superseded.includes(item));
        queue = [...queue, ...items];
        superseded.forEach((item) => end(item, 'cancelled'));
      } else {
        drop('cancelled');
        queue = [...items];
      }
      updateBusy();
      pump();
      return true;
    },
    cancel() {
      drop('cancelled');
    },
    isBusy() {
      return busy;
    },
  };
}
