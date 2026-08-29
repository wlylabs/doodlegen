/*
 * DoodleGen service worker.
 *
 * PDFs are built entirely in the browser, so once the shell and the fonts are
 * cached the tool keeps working with no network at all.
 */
const VERSION = 'doodlegen-v2';
// Two documents now: the landing page and the studio. Each is cached under
// its own URL so an offline visit lands on the page that was asked for.
const SHELL = [
  '/',
  '/studio/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/og.png',
  '/fonts/Baloo2-ExtraBold.ttf',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isStatic(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/fonts/') ||
    /\.(?:png|svg|ico|webmanifest)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Immutable build output and fonts: serve from cache, fill it on first miss.
  if (isStatic(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // Navigations: fresh when online, the cached copy of that same page when
  // not, falling back to the landing page for anything never visited.
  if (request.mode === 'navigate') {
    const key = url.pathname || '/';
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(key, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(key)
            .then((hit) => hit || caches.match('/'))
            .then((hit) => hit || Response.error()),
        ),
    );
  }
});
