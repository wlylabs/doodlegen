/*
 * DoodleGen service worker.
 *
 * PDFs are built entirely in the browser, so once the shell and the fonts are
 * cached the tool keeps working with no network at all — which is the whole
 * reason the installed app is allowed to look like a native one: it does not
 * go blank when the connection does.
 */
const VERSION = 'doodlegen-v4';

/**
 * Two documents — the landing page and the studio — plus everything the
 * installed app needs before it can draw its first frame. The studio is the
 * manifest's start_url, so it is the one that must never be missing.
 */
const SHELL = [
  '/',
  '/studio/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-192-maskable.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/og.png',
  '/fonts/Baloo2-ExtraBold.ttf',
  // The interface face is shell, not content: without it an offline visit
  // falls back to a system stack and the whole app changes shape.
  '/fonts/Archivo-UI.woff2',
];

/** Where an offline navigation lands when the page asked for was never seen. */
const FALLBACK = '/studio/';

/** Last resort: the shell itself failed to cache, so answer in plain HTML. */
const OFFLINE_PAGE = `<!doctype html><html lang="id"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DoodleGen — offline</title>
<style>html{font-family:system-ui,sans-serif;background:#FAFAF9;color:#1C1917}
body{margin:0;display:grid;place-items:center;min-height:100dvh;padding:24px;text-align:center}
p{color:#57534E;max-width:34ch;line-height:1.5}</style>
<body><div><h1>Sedang offline</h1>
<p>Halaman ini belum pernah tersimpan di perangkat. Sambungkan internet sekali, lalu DoodleGen bisa dipakai tanpa koneksi.</p>
</div></body></html>`;

/*
 * Nothing here calls `skipWaiting()`: a new build installs quietly behind the
 * running one and waits to be let in. A tab mid-export must not have the app
 * swapped under it, so the page offers the reload and the message below is
 * what finally releases this worker.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      // One miss must not throw the whole install away, so each entry is
      // fetched on its own and a failure only costs that file.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => undefined)))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Lets the browser start a navigation's network request before this
      // worker has even booted, so being offline-capable costs no latency.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable().catch(() => undefined);
      }
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

/*
 * A waiting worker only takes over when the page says so: the studio holds
 * unsaved settings, so the app decides when it is safe to swap versions.
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function isStatic(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/fonts/') ||
    /\.(?:png|jpg|svg|ico|webmanifest)$/.test(url.pathname)
  );
}

/** Only a real, same-origin, non-partial response is worth keeping. */
function cacheable(response) {
  return response && response.ok && response.type === 'basic';
}

async function fromNetworkThenCache(request, key) {
  const cached = await caches.match(key ?? request);
  if (cached) return cached;
  const response = await fetch(request);
  if (cacheable(response)) {
    const copy = response.clone();
    caches.open(VERSION).then((cache) => cache.put(key ?? request, copy));
  }
  return response;
}

async function navigate(event) {
  const url = new URL(event.request.url);
  // Query strings vary per launch (`?source=pwa`, campaign tags); the document
  // does not, so every navigation is cached under its path alone.
  const key = url.pathname || '/';

  try {
    const preloaded = await event.preloadResponse;
    const response = preloaded || (await fetch(event.request));
    if (cacheable(response)) {
      const copy = response.clone();
      caches.open(VERSION).then((cache) => cache.put(key, copy));
    }
    return response;
  } catch {
    return (
      (await caches.match(key)) ||
      (await caches.match(FALLBACK)) ||
      (await caches.match('/')) ||
      new Response(OFFLINE_PAGE, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    );
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Immutable build output and fonts: serve from cache, fill it on first miss.
  if (isStatic(url)) {
    event.respondWith(fromNetworkThenCache(request).catch(() => caches.match(request)));
    return;
  }

  if (request.mode === 'navigate') event.respondWith(navigate(event));
});
