/**
 * Drives the built export in a real browser and checks the parts of the
 * interface that have no other way of being checked:
 *
 *   - the command palette opens on its key, ranks a typed query, runs what is
 *     highlighted, and closes behind itself
 *   - a command that changes a setting and the control that shows the same
 *     setting stay in step
 *   - `?` opens the shortcuts list and Escape closes it
 *   - a plain-key shortcut never fires while a field has focus, and the field
 *     keeps the character that would have triggered it
 *   - the skip link is the first thing a keyboard reaches
 *   - the settings sheet is out of the tab order until it is opened, opens
 *     from the bar onto the bottom edge, and closes on Escape
 *   - nothing throws along the way
 *
 * These are the checks worth having because each of them is one changed class
 * or one missing guard away from silently regressing, and none of them shows
 * up in a screenshot.
 *
 * Requires: npm run build (so out/ exists), then
 *           npx playwright install chromium
 *           (or point CHROMIUM_PATH at a browser you already have).
 * Usage:    node scripts/verify-ui.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

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
  '.xml': 'application/xml',
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
const origin = `http://localhost:${server.address().port}`;

const failures = [];
const check = (ok, what) => {
  if (ok) console.log(`  ok   ${what}`);
  else failures.push(what);
};

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);

/** Anything thrown anywhere in either context fails the run. */
const thrown = [];

// ---------------------------------------------------------------- desktop
let context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
let page = await context.newPage();
page.on('pageerror', (error) => thrown.push(String(error)));
await page.goto(`${origin}/studio/`, { waitUntil: 'networkidle' });

const palette = page.locator('dialog[aria-label=Perintah]');
const shortcuts = page.locator('dialog[aria-label="Pintasan papan ketik"]');

await page.keyboard.press('Control+k');
await page.waitForTimeout(300);
check(await palette.isVisible(), 'the palette opens on Ctrl+K');

await page.keyboard.type('gelap');
await page.waitForTimeout(250);
const rows = await page.locator('[role=option]').allInnerTexts();
check(rows.length > 0 && rows[0].includes('gelap'), 'a typed query ranks its match first');

await page.keyboard.press('Enter');
await page.waitForTimeout(400);
const themed = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
check(themed === 'dark', 'Enter runs the highlighted command');
check(!(await palette.isVisible()), 'the palette closes behind the command it ran');

// The strip in the bar and the palette are two controls over one setting.
const checkedThemes = await page.evaluate(() =>
  [...document.querySelectorAll('[role=radio][aria-label]')]
    .filter((node) => node.getAttribute('aria-checked') === 'true')
    .map((node) => node.getAttribute('aria-label')),
);
check(checkedThemes.includes('Gelap'), 'the theme strip shows what the palette chose');

await page.keyboard.press('?');
await page.waitForTimeout(300);
check(await shortcuts.isVisible(), '? opens the shortcuts list');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check(!(await shortcuts.isVisible()), 'Escape closes it');

// A word list is typed into a field, and "?" is a character in it.
await page.getByRole('radio', { name: /Kata & Nama/ }).click();
await page.waitForTimeout(300);
const field = page.locator('textarea').first();
await field.fill('');
await field.type('sapi?');
await page.waitForTimeout(250);
check(!(await shortcuts.isVisible()), 'plain-key shortcuts stay quiet while a field has focus');
check((await field.inputValue()) === 'sapi?', 'and the field keeps the character');

await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
await page.keyboard.press('Tab');
const firstStop = await page.evaluate(() => document.activeElement?.textContent ?? '');
check(firstStop.includes('Lompat'), 'the skip link is the first tab stop');
await context.close();

// ------------------------------------------------------------------ phone
context = await browser.newContext({
  viewport: { width: 412, height: 915 },
  isMobile: true,
  hasTouch: true,
});
page = await context.newPage();
page.on('pageerror', (error) => thrown.push(String(error)));
await page.goto(`${origin}/studio/`, { waitUntil: 'networkidle' });

const sheet = page.locator('#settings-panel');
const visibility = () => sheet.evaluate((node) => getComputedStyle(node).visibility);

// Hidden rather than merely off-screen, or every control in it is tabbable
// from a page that is not showing it.
check((await visibility()) === 'hidden', 'the sheet starts out of the tab order');

await page.locator('[aria-controls=settings-panel]').click();
await page.waitForTimeout(600);
check((await visibility()) === 'visible', 'the bar opens the sheet');
check(
  await sheet.evaluate((node) => node.getBoundingClientRect().bottom <= window.innerHeight + 1),
  'and it lands on the bottom edge',
);

await page.keyboard.press('Escape');
await page.waitForTimeout(600);
check((await visibility()) === 'hidden', 'Escape closes the sheet');
await context.close();

check(thrown.length === 0, `nothing threw${thrown.length ? `: ${thrown.join(' | ')}` : ''}`);

await browser.close();
server.close();

if (failures.length) {
  console.error('\nUI checks failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('\nUI OK — palette, shortcuts, skip link and the settings sheet');
