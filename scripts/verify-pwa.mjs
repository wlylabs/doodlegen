/**
 * Checks the installable app against what the manifest promises:
 *
 *   - every icon, shortcut tile and screenshot exists, and is exactly the
 *     pixel size the manifest claims it is
 *   - the install dialog has the wide and narrow shots it needs
 *   - start_url and every shortcut URL resolve to a real document
 *   - the document links the manifest and declares itself app-capable
 *   - the worker takes control, and the app still renders offline: the page
 *     that was visited, one that was not, and a path that never existed
 *   - the install button appears only once a browser offers an install
 *   - a new build waits, offers a reload, and takes over only when accepted
 *
 * The offline and update checks are the ones worth having: both are invisible
 * until the day they are needed, and both are one line away from silently
 * regressing.
 *
 * Requires: npm run build (so out/ exists), then
 *           npx playwright install chromium
 *           (or point CHROMIUM_PATH at a browser you already have).
 * Usage:    node scripts/verify-pwa.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'out');

if (!fs.existsSync(OUT)) {
  console.error('out/ is missing. Run `npm run build` first.');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const failures = [];
const fail = (message) => failures.push(message);

const server = http.createServer((request, response) => {
  const url = decodeURIComponent(request.url.split('?')[0]);
  let file = path.join(OUT, url);
  if (!path.resolve(file).startsWith(OUT)) {
    response.writeHead(403).end();
    return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
// Workers only run in a secure context, which `localhost` is and a bare IP is
// not — so the page is opened by name even though the socket is bound to one.
const origin = `http://localhost:${server.address().port}`;

const manifest = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.webmanifest'), 'utf8'));

// 1. Everything the manifest points at exists, at the size it says.
const declared = [
  ...manifest.icons.map((icon) => [icon.src, icon.sizes]),
  ...manifest.screenshots.map((shot) => [shot.src, shot.sizes]),
  ...manifest.shortcuts.flatMap((item) => item.icons.map((icon) => [icon.src, icon.sizes])),
];
for (const [src, sizes] of declared) {
  const file = path.join(OUT, src);
  if (!fs.existsSync(file)) {
    fail(`missing asset ${src}`);
    continue;
  }
  if (!src.endsWith('.png')) continue;
  const { width, height } = await sharp(file).metadata();
  if (`${width}x${height}` !== sizes) fail(`${src} is ${width}x${height}, manifest says ${sizes}`);
}

// Chrome only shows the richer install dialog when both shapes are there.
for (const factor of ['wide', 'narrow']) {
  if (!manifest.screenshots.some((shot) => shot.form_factor === factor)) {
    fail(`no ${factor} screenshot`);
  }
}

// 2. Launching the app, and every shortcut, lands on a real page.
for (const url of [manifest.start_url, ...manifest.shortcuts.map((item) => item.url)]) {
  if (!fs.existsSync(path.join(OUT, url.split('#')[0], 'index.html'))) fail(`no document for ${url}`);
}

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(`${origin}/studio/`, { waitUntil: 'networkidle' });

const linked = await page.getAttribute('link[rel=manifest]', 'href');
if (linked !== '/manifest.webmanifest') fail(`the document links ${linked} as its manifest`);

const metas = await page.evaluate(() => [...document.querySelectorAll('meta[name]')].map((m) => m.name));
// The standard spelling, plus the one iOS before 16.4 reads: between them they
// decide whether a launch from the home screen opens full screen or in a tab.
for (const name of ['mobile-web-app-capable', 'apple-mobile-web-app-capable']) {
  if (!metas.includes(name)) fail(`missing meta ${name}`);
}

// 3. The worker takes control, and the shell survives losing the network.
await page
  .waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 20_000 })
  .catch(() => fail('the service worker never took control'));
await page.waitForTimeout(1500);

await context.setOffline(true);
for (const [url, expected] of [
  ['/studio/', 'Pratinjau'],
  ['/', 'Buka Studio'],
  ['/tidak-pernah-dibuka/', 'DoodleGen'],
]) {
  try {
    await page.goto(origin + url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.getByText(expected, { exact: false }).first().waitFor({ timeout: 15_000 });
  } catch (error) {
    fail(`offline ${url} never showed "${expected}": ${error.message.split('\n')[0]}`);
  }
}
await context.setOffline(false);

// 4. The install button is offered only when there is an install to make.
await page.goto(`${origin}/studio/`, { waitUntil: 'networkidle' });
const install = page.getByRole('button', { name: 'Pasang aplikasi' });
if ((await install.count()) !== 0) fail('the install button shows with no install on offer');
await page.evaluate(() => {
  const event = new Event('beforeinstallprompt');
  event.prompt = () => Promise.resolve();
  Object.defineProperty(event, 'userChoice', {
    value: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
  });
  window.dispatchEvent(event);
});
await install
  .waitFor({ timeout: 5000 })
  .catch(() => fail('the install button never appeared after beforeinstallprompt'));

// 5. A new build waits its turn, and swaps only when the page accepts.
const workerFile = path.join(OUT, 'sw.js');
const worker = fs.readFileSync(workerFile, 'utf8');
const nextVersion = 'doodlegen-verify';
fs.writeFileSync(workerFile, worker.replace(/const VERSION = '[^']+'/, `const VERSION = '${nextVersion}'`));
try {
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
  await page.getByText('Versi baru DoodleGen sudah siap.').waitFor({ timeout: 20_000 });

  // The new build has cached its own shell by now — that happens at install —
  // so what proves it did not take over is that it is still sitting in
  // `waiting` with the old worker in control.
  const waiting = await page.evaluate(() =>
    navigator.serviceWorker.getRegistration().then((r) => Boolean(r && r.waiting)),
  );
  if (!waiting) fail('the new build took over before it was accepted');

  await page.getByRole('button', { name: 'Muat ulang' }).click();
  await page.waitForTimeout(2500);
  const caches_ = await page.evaluate(() => caches.keys());
  if (!caches_.includes(nextVersion)) fail(`after the reload the caches are ${caches_.join(', ')}`);
  if (caches_.length !== 1) fail(`the old cache was left behind: ${caches_.join(', ')}`);
} catch (error) {
  fail(`the update handshake failed: ${error.message.split('\n')[0]}`);
} finally {
  fs.writeFileSync(workerFile, worker);
}

await browser.close();
server.close();

if (failures.length) {
  console.error(`FAIL\n${failures.map((message) => `  - ${message}`).join('\n')}`);
  process.exit(1);
}
console.log('PWA OK — manifest assets, offline shell, install offer and update handshake');
