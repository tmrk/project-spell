// GitHub Pages serves the worker and shell with max-age=600. Fifteen minutes clears that edge
// window without turning a quiet, offline-first children's app into a constant network poller.
export const SERVICE_WORKER_UPDATE_INTERVAL_MS = 15 * 60 * 1000;
export const SERVICE_WORKER_UPDATE_THROTTLE_MS = 60 * 1000;

const resolved = (value) => Promise.resolve(value);

/**
 * Keep a long-lived or installed copy of the app checking for a newly deployed worker.
 *
 * `registerType: 'autoUpdate'` owns activation and the eventual page reload. This helper only
 * closes the discovery gap: browsers check on navigation, but a tablet PWA can remain open (or
 * suspended) for days. The no-store probe also avoids treating a cached successful response as
 * proof that GitHub Pages is serving the current worker.
 */
export function startServiceWorkerUpdateChecks(swUrl, registration, environment = {}) {
  const {
    clearIntervalImpl = globalThis.clearInterval,
    documentTarget = globalThis.document,
    fetchImpl = globalThis.fetch,
    intervalMs = SERVICE_WORKER_UPDATE_INTERVAL_MS,
    navigatorTarget = globalThis.navigator,
    now = Date.now,
    setIntervalImpl = globalThis.setInterval,
    throttleMs = SERVICE_WORKER_UPDATE_THROTTLE_MS,
    windowTarget = globalThis.window,
  } = environment;

  let lastCheckAt = Number.NEGATIVE_INFINITY;
  let updateInFlight = null;

  const checkForUpdate = () => {
    if (updateInFlight) return updateInFlight;
    if (registration.installing || navigatorTarget?.onLine === false) return resolved(false);

    const checkedAt = now();
    if (checkedAt - lastCheckAt < throttleMs) return resolved(false);
    lastCheckAt = checkedAt;

    updateInFlight = (async () => {
      try {
        const response = await fetchImpl(swUrl, {
          cache: 'no-store',
          headers: {
            'cache-control': 'no-cache',
          },
        });
        if (response?.status !== 200) return false;

        await registration.update();
        return true;
      } catch {
        // Offline launches remain fully playable. Focus, visibility, online, and interval events
        // all provide another quiet opportunity to update later.
        return false;
      } finally {
        updateInFlight = null;
      }
    })();

    return updateInFlight;
  };

  const requestCheck = () => {
    void checkForUpdate();
  };
  const requestCheckWhenVisible = () => {
    if (documentTarget.visibilityState === 'visible') requestCheck();
  };

  const intervalId = setIntervalImpl(requestCheck, intervalMs);
  windowTarget.addEventListener('focus', requestCheck);
  windowTarget.addEventListener('online', requestCheck);
  documentTarget.addEventListener('visibilitychange', requestCheckWhenVisible);

  return {
    checkForUpdate,
    stop() {
      clearIntervalImpl(intervalId);
      windowTarget.removeEventListener('focus', requestCheck);
      windowTarget.removeEventListener('online', requestCheck);
      documentTarget.removeEventListener('visibilitychange', requestCheckWhenVisible);
    },
  };
}
