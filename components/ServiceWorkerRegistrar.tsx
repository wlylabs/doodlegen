'use client';

import { useEffect, useRef } from 'react';
import { toast, toastSuccess } from '@/lib/toast';

/** A new worker is only checked for this often, however often the app is opened. */
const UPDATE_INTERVAL = 60 * 60 * 1000;

/**
 * Registers the worker and, when a new build has installed itself behind the
 * current one, offers the reload rather than taking it: the studio holds
 * unsaved settings and a half-finished export, so the moment the app swaps
 * versions is the user's to pick.
 *
 * The offer is a toast with an action, in the one stack every other passing
 * message in the app uses. It used to be a bar this component drew itself,
 * which meant two overlays that had to agree about where the bottom of the
 * screen is and which of them was allowed to sit there.
 */
export function ServiceWorkerRegistrar() {
  const reloading = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return;

    let registration: ServiceWorkerRegistration | null = null;
    let checkedAt = 0;

    const offer = (worker: ServiceWorker) => {
      toast('Versi baru DoodleGen sudah siap.', {
        // It waits as long as it takes: this is a decision, not a notice, and
        // a build that installs mid-export must not swap itself in unasked.
        duration: null,
        key: 'sw-update',
        action: {
          label: 'Muat ulang',
          // The worker steps aside; `controllerchange` then reloads onto it.
          run: () => worker.postMessage({ type: 'SKIP_WAITING' }),
        },
      });
    };

    const watch = (found: ServiceWorkerRegistration) => {
      registration = found;
      // Already waiting from an earlier visit in another tab.
      if (found.waiting && navigator.serviceWorker.controller) offer(found.waiting);

      found.addEventListener('updatefound', () => {
        const installing = found.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state !== 'installed') return;
          // No controller means this is the first install, not an update:
          // there is nothing to reload for, but it is worth saying that the
          // app has just become usable without a connection.
          if (navigator.serviceWorker.controller) offer(installing);
          else toastSuccess('DoodleGen tersimpan di perangkat — bisa dipakai tanpa koneksi.');
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

  return null;
}

/**
 * Says when the connection goes, and when it comes back.
 *
 * Worth saying in this app specifically, because the answer is reassuring:
 * nothing here needs the network once the shell is cached, so losing it
 * changes nothing about what the studio can do. An app that says so is an
 * app someone keeps working in.
 */
export function ConnectionWatcher() {
  useEffect(() => {
    // `onLine` is only ever trustworthy as a negative, and only after the
    // first event: a fresh load that is already offline says so here.
    if (navigator.onLine === false) {
      toast('Sedang offline. Studio tetap jalan — PDF dibuat di perangkat ini.', {
        duration: null,
        key: 'connection',
      });
    }

    const onOffline = () =>
      toast('Sedang offline. Studio tetap jalan — PDF dibuat di perangkat ini.', {
        duration: null,
        key: 'connection',
      });
    const onOnline = () => toastSuccess('Koneksi kembali.', { key: 'connection' });

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return null;
}
