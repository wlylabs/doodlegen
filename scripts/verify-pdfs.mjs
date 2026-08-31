/**
 * Checks generated PDFs against the print spec DoodleGen promises:
 *
 *   - exact A4 / US Letter trim size
 *   - the font program is embedded, not just outlined
 *   - characters are stroked text (render mode 1), so they stay vector
 *   - worksheet ink is K-only CMYK, which prints as a single clean plate
 *   - colour, if any, is confined to the one optional cover page
 *   - no raster image is present anywhere in the file
 *   - nothing is drawn inside the 0.5 inch safe margin
 *   - the seller's buyer link, where a pack carries one, is an http(s)
 *     address and its tap target sits inside the safe area like everything
 *     else on the page
 *
 * The margin check is done by rasterising pages through pdf.js and looking
 * for any non-white pixel in the border band, which catches layout mistakes
 * that reading the content stream would not.
 *
 * Requires: npm install, then `npx playwright install chromium`
 *           (or point CHROMIUM_PATH at a browser you already have).
 * Usage:    node scripts/verify-pdfs.mjs [.samples/*.pdf]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const MARGIN_PT = 36;
// The package entry already lives in pdfjs-dist/build, next to the worker.
const PDFJS_BUILD = path.dirname(fileURLToPath(import.meta.resolve('pdfjs-dist')));

const inputs = process.argv.slice(2);
const files = (inputs.length ? inputs : fs.existsSync('.samples')
  ? fs.readdirSync('.samples').filter((f) => f.endsWith('.pdf')).map((f) => path.join('.samples', f))
  : []
).filter((f) => fs.existsSync(f));

if (!files.length) {
  console.error('No PDFs to check. Run `npm run samples` first, or pass paths.');
  process.exit(1);
}

/** Inflates every stream in the file so content and object streams are searchable. */
function flatten(buffer) {
  const text = buffer.toString('latin1');
  const parts = [text];
  let index = 0;
  while ((index = text.indexOf('stream', index)) !== -1) {
    let start = index + 'stream'.length;
    if (text[start] === '\r') start += 1;
    if (text[start] === '\n') start += 1;
    const end = text.indexOf('endstream', start);
    if (end === -1) break;
    try {
      parts.push(zlib.inflateSync(buffer.subarray(start, end)).toString('latin1'));
    } catch {
      // Not a Flate stream; the raw text copy already covers it.
    }
    index = end + 'endstream'.length;
  }
  return { all: parts.join('\n'), streams: parts.slice(1) };
}

/**
 * True when a page stream sets any ink that is not K-only. The cover page is
 * allowed one; a worksheet that grew a colour would cost a second plate on
 * press and muddy every photocopy, so it must not.
 */
function hasColour(chunk) {
  const colour = /([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) [kK]\b/g;
  let match;
  while ((match = colour.exec(chunk)) !== null) {
    if (Number(match[1]) > 0 || Number(match[2]) > 0 || Number(match[3]) > 0) return true;
  }
  return false;
}

/**
 * Every link annotation in the file: the address and the rectangle a reader
 * turns into a tap target. Written out by the generator in one shape, so one
 * pattern reads them back — Rect first, then the URI action.
 */
function linkAnnotations(all) {
  const pattern = /\/Subtype\s*\/Link[\s\S]{0,300}?\/Rect\s*\[([^\]]+)\][\s\S]{0,300}?\/URI\s*\(([^)]*)\)/g;
  const out = [];
  let match;
  while ((match = pattern.exec(all)) !== null) {
    out.push({
      rect: match[1].trim().split(/\s+/).map(Number),
      url: match[2],
    });
  }
  return out;
}

function structure(file) {
  const buffer = fs.readFileSync(file);
  const { all, streams } = flatten(buffer);
  return {
    links: linkAnnotations(all),
    embeddedFont: /\/FontFile2\b/.test(all) && /\/CIDFontType2\b/.test(all),
    strokedText: streams.some((chunk) => /\b1 Tr\b/.test(chunk)),
    cmykInk: streams.some((chunk) => /0 0 0 [\d.]+ K/.test(chunk)),
    colouredPages: streams.filter(hasColour).length,
    rasterImage: /\/Subtype\s*\/Image\b/.test(all),
    kilobytes: (buffer.length / 1024).toFixed(1),
  };
}

const VIEWER = `<!doctype html><meta charset="utf-8"><canvas id="c"></canvas>
<script type="module">
import * as pdfjs from './pdf.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';
window.render = async (url, pageNumber) => {
  const doc = await pdfjs.getDocument({ url }).promise;
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const canvas = document.getElementById('c');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, canvas, viewport }).promise;
  return { pages: doc.numPages, width: viewport.width, height: viewport.height };
};
window.ready = true;
</script>`;

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'doodlegen-verify-'));
fs.writeFileSync(path.join(work, 'index.html'), VIEWER);
for (const name of ['pdf.min.mjs', 'pdf.worker.min.mjs']) {
  fs.copyFileSync(path.join(PDFJS_BUILD, name), path.join(work, name));
}

const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.pdf': 'application/pdf' };
const server = http.createServer((request, response) => {
  const name = decodeURIComponent(request.url.split('?')[0]).replace(/^\//, '') || 'index.html';
  const file = path.join(work, name);
  if (!fs.existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

// CHROMIUM_PATH lets a machine with a preinstalled browser skip the download.
const executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
await page.waitForFunction('window.ready === true');

/** Darkest pixel found inside the safe-margin band, 255 meaning untouched. */
async function marginInk(pageNumber, pagePixelWidth, pageWidthPt) {
  await page.evaluate((n) => window.render('./doc.pdf?' + Math.random(), n), pageNumber);
  const shot = Buffer.from(await page.locator('#c').screenshot());
  const { data, info } = await sharp(shot).greyscale().raw().toBuffer({ resolveWithObject: true });
  const band = Math.floor(MARGIN_PT * (pagePixelWidth / pageWidthPt));
  let darkest = 255;
  for (let y = 0; y < info.height; y += 1) {
    const inHorizontalBand = y < band || y >= info.height - band;
    for (let x = 0; x < info.width; x += 1) {
      if (!inHorizontalBand && x >= band && x < info.width - band) {
        x = info.width - band - 1;
        continue;
      }
      darkest = Math.min(darkest, data[y * info.width + x]);
    }
  }
  return darkest;
}

let failed = 0;
for (const file of files) {
  const checks = structure(file);
  fs.copyFileSync(path.resolve(file), path.join(work, 'doc.pdf'));
  const meta = await page.evaluate(() => window.render('./doc.pdf?' + Math.random(), 1));

  const probes = [...new Set([1, Math.ceil(meta.pages / 2), meta.pages])];
  const bleeding = [];
  for (const number of probes) {
    const darkest = await marginInk(number, meta.width, meta.width);
    if (darkest < 250) bleeding.push(`p${number}`);
  }

  // A link is the one thing in the file that acts rather than prints, so it
  // is checked for both: an address a reader will actually open, and a hit
  // area inside the same safe box the ink has to stay in.
  const badLinks = checks.links.filter((link) => !/^https?:\/\//i.test(link.url));
  const strayLinks = checks.links.filter(
    ({ rect: [x1, y1, x2, y2] }) =>
      x1 < MARGIN_PT - 0.5 ||
      y1 < MARGIN_PT - 0.5 ||
      x2 > meta.width - MARGIN_PT + 0.5 ||
      y2 > meta.height - MARGIN_PT + 0.5,
  );

  const size = `${Math.round(meta.width)}x${Math.round(meta.height)}pt`;
  const known = size === '595x842pt' || size === '612x792pt';
  const pass =
    known &&
    checks.embeddedFont &&
    checks.strokedText &&
    checks.cmykInk &&
    checks.colouredPages <= 1 &&
    !checks.rasterImage &&
    !bleeding.length &&
    !badLinks.length &&
    !strayLinks.length;
  if (!pass) failed += 1;

  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${path.basename(file)}\n` +
      `      ${meta.pages} pages · ${size} · ${checks.kilobytes} KB · font=${checks.embeddedFont}` +
      ` · vector text=${checks.strokedText} · CMYK K=${checks.cmykInk} · raster=${checks.rasterImage}` +
      ` · colour pages=${checks.colouredPages}` +
      ` · margin=${bleeding.length ? `INK IN BAND (${bleeding.join(', ')})` : 'clear'}` +
      ` · links=${checks.links.length}${badLinks.length ? ' NOT HTTP(S)' : ''}${
        strayLinks.length ? ' OUTSIDE SAFE AREA' : ''
      }`,
  );
}

await browser.close();
server.close();
fs.rmSync(work, { recursive: true, force: true });
console.log(failed ? `\n${failed} of ${files.length} failed.` : `\nAll ${files.length} passed.`);
process.exit(failed ? 1 : 0);
