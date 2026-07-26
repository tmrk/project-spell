import { describe, expect, it, vi } from 'vitest';
import {
  SERVICE_WORKER_UPDATE_INTERVAL_MS,
  startServiceWorkerUpdateChecks,
} from './pwa';

function buildHarness(overrides = {}) {
  const registration = {
    installing: null,
    update: vi.fn(() => Promise.resolve()),
  };
  const windowTarget = new EventTarget();
  const documentTarget = new EventTarget();
  Object.defineProperty(documentTarget, 'visibilityState', {
    configurable: true,
    value: 'visible',
    writable: true,
  });
  const navigatorTarget = { onLine: true };
  const fetchImpl = vi.fn(() => Promise.resolve({ status: 200 }));
  const setIntervalImpl = vi.fn(() => 73);
  const clearIntervalImpl = vi.fn();
  let time = 1_000_000;
  const now = vi.fn(() => time);

  const checks = startServiceWorkerUpdateChecks('/project-spell/sw.js', registration, {
    clearIntervalImpl,
    documentTarget,
    fetchImpl,
    navigatorTarget,
    now,
    setIntervalImpl,
    windowTarget,
    ...overrides,
  });

  return {
    checks,
    clearIntervalImpl,
    documentTarget,
    fetchImpl,
    navigatorTarget,
    registration,
    setIntervalImpl,
    setTime(value) {
      time = value;
    },
    windowTarget,
  };
}

describe('PWA update checks', () => {
  it('checks a no-store worker response before asking the registration to update', async () => {
    const harness = buildHarness();

    expect(harness.setIntervalImpl).toHaveBeenCalledWith(
      expect.any(Function),
      SERVICE_WORKER_UPDATE_INTERVAL_MS,
    );
    await expect(harness.checks.checkForUpdate()).resolves.toBe(true);
    expect(harness.fetchImpl).toHaveBeenCalledWith('/project-spell/sw.js', {
      cache: 'no-store',
      headers: {
        'cache-control': 'no-cache',
      },
    });
    expect(harness.registration.update).toHaveBeenCalledOnce();
  });

  it('checks after focus, a visible return, an online event, and the periodic interval', async () => {
    const harness = buildHarness();
    const intervalCheck = harness.setIntervalImpl.mock.calls[0][0];

    harness.windowTarget.dispatchEvent(new Event('focus'));
    await vi.waitFor(() => expect(harness.registration.update).toHaveBeenCalledTimes(1));

    harness.setTime(1_061_000);
    harness.documentTarget.visibilityState = 'hidden';
    harness.documentTarget.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    expect(harness.registration.update).toHaveBeenCalledTimes(1);

    harness.documentTarget.visibilityState = 'visible';
    harness.documentTarget.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(harness.registration.update).toHaveBeenCalledTimes(2));

    harness.setTime(1_122_000);
    harness.windowTarget.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(harness.registration.update).toHaveBeenCalledTimes(3));

    harness.setTime(1_183_000);
    intervalCheck();
    await vi.waitFor(() => expect(harness.registration.update).toHaveBeenCalledTimes(4));
  });

  it('deduplicates and throttles checks, and waits while offline or installing', async () => {
    let resolveFetch;
    const fetchImpl = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const harness = buildHarness({ fetchImpl });

    const first = harness.checks.checkForUpdate();
    const duplicate = harness.checks.checkForUpdate();
    expect(duplicate).toBe(first);
    expect(fetchImpl).toHaveBeenCalledOnce();

    resolveFetch({ status: 200 });
    await expect(first).resolves.toBe(true);
    await expect(harness.checks.checkForUpdate()).resolves.toBe(false);
    expect(fetchImpl).toHaveBeenCalledOnce();

    harness.setTime(1_061_000);
    harness.navigatorTarget.onLine = false;
    await expect(harness.checks.checkForUpdate()).resolves.toBe(false);
    expect(fetchImpl).toHaveBeenCalledOnce();

    harness.navigatorTarget.onLine = true;
    harness.registration.installing = {};
    await expect(harness.checks.checkForUpdate()).resolves.toBe(false);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('keeps offline play quiet on failed checks and removes every listener when stopped', async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new Error('offline')));
    const harness = buildHarness({ fetchImpl });

    await expect(harness.checks.checkForUpdate()).resolves.toBe(false);
    expect(harness.registration.update).not.toHaveBeenCalled();

    harness.checks.stop();
    expect(harness.clearIntervalImpl).toHaveBeenCalledWith(73);

    harness.setTime(1_061_000);
    harness.windowTarget.dispatchEvent(new Event('focus'));
    harness.windowTarget.dispatchEvent(new Event('online'));
    harness.documentTarget.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
