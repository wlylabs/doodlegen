'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRipple } from './motion';

/** A new worker is only checked for this often, however often the app is opened. */
const UPDATE_INTERVAL = 60 * 60 * 1000;

/**
 * Registers the worker and, when a new build has installed itself behind the
 * current one, offers the reload rather than taking it: the studio holds
 * unsaved settings and a half-finished export, so the moment the app swaps
 * versions is the user's to pick.
 */
export function ServiceWorkerRegistrar() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const reloading = useRef(false);
  const ripple = useRipple<HTMLButtonElement>();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return;

    let registration: ServiceWorkerRegistration | null = null;
    let checkedAt = 0;

    const watch = (found: ServiceWorkerRegistration) => {
      registration = found;
      // Already waiting from an earlier visit in another tab.
      if (found.waiting && navigator.serviceWorker.controller) setWaiting(found.waiting);

      found.addEventListener('updatefound', () => {
        const installing = found.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          // No controller means this is the first install, not an update:
          // there is nothing to reload for.
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            setWaiting(installing);
          }
        });
      });
    };

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(watch)
        .catch(() => undefined);
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    // The app can stay open for days, so coming back to it is the moment to
    // look for a new build — throttled, because tab switches are constant.
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !registration) return;
      if (Date.now() - checkedAt < UPDATE_INTERVAL) return;
      checkedAt = Date.now();
      registration.update().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisible);

    const onControllerChange = () => {
      if (reloading.current) return;
      reloading.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const apply = useCallback(() => {
    if (!waiting) return;
    setWaiting(null);
    // The worker steps aside; `controllerchange` then reloads the page onto it.
    waiting.postMessage({ type: 'SKIP_WAITING' });
  }, [waiting]);

  if (!waiting) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 shadow-pop">
        <span className="text-[13px] text-ink-soft">Versi baru DoodleGen sudah siap.</span>
        <button
          type="button"
          className="btn-quiet !border-accent-line !text-accent"
          onClick={(event) => {
            ripple(event);
            apply();
          }}
        >
          Muat ulang
        </button>
        <button
          type="button"
          className="btn-ghost !px-2"
          aria-label="Nanti saja"
          onClick={() => setWaiting(null)}
        >
          Nanti
        </button>
      </div>
    </div>
  );
}
