/**
 * Renders the manifest's screenshots — the pictures a browser shows in its
 * install dialog, which is the only place a user sees the app before deciding
 * to keep it. They are shot from the real static export rather than drawn by
 * hand, so what the install sheet promises is what the app is.
 *
 * Requires: npm run build (so out/ exists), then
 *           npx playwright install chromium
 *           (or point CHROMIUM_PATH at a browser you already have).
 * Usage:    node scripts/screenshots.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'out');
const SHOTS = path.join(ROOT, 'public', 'screenshots');

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

/** The export is directory-style, so /studio/ means /studio/index.html. */
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
const origin = `http://127.0.0.1:${server.address().port}`;

// CHROMIUM_PATH lets a machine with a preinstalled browser skip the download.
const executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(executablePath ? { executablePath } : {});

/*
 * Chrome wants at least one wide and one narrow shot before it will show the
 * richer install dialog, and each file's pixel size has to match what the
 * manifest claims — hence a scale factor of 1 and no full-page capture.
 */
const TARGETS = [
  { name: 'studio-wide.png', url: '/studio/', width: 1280, height: 800 },
  { name: 'landing-wide.png', url: '/', width: 1280, height: 800 },
  { name: 'studio-narrow.png', url: '/studio/', width: 412, height: 915 },
  { name: 'landing-narrow.png', url: '/', width: 412, height: 915 },
];

await fs.promises.mkdir(SHOTS, { recursive: true });

for (const target of TARGETS) {
  const page = await browser.newPage({
    viewport: { width: target.width, height: target.height },
    deviceScaleFactor: 1,
    // The app is Indonesian; a shot taken under another locale would show
    // different figures in the specs.
    locale: 'id-ID',
  });
  await page.goto(origin + target.url, { waitUntil: 'networkidle' });

  // The preview only exists once the worksheet face has been parsed, and the
  // landing page reveals its sections on scroll, so both need a beat.
  if (target.url === '/studio/') await page.waitForSelector('svg', { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);

  await page.screenshot({ path: path.join(SHOTS, target.name) });
  await page.close();
  console.log(`screenshots/${target.name}  ${target.width}x${target.height}`);
}

await browser.close();
server.close();
