/**
 * Renders the DoodleGen mark into the icon set the app and manifest link to.
 * The mark is a "D" whose stem is a solid contour and whose bowl is dotted —
 * the same two treatments the generator puts on a page.
 *
 *   node scripts/gen-icons.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.resolve(import.meta.dirname, '..', 'public');

const INK = '#1C1917';
const PAPER = '#FAFAF9';
const ACCENT_ON_DARK = '#F97316';
const ACCENT = '#C2410C';

/** The mark itself, drawn on a 24-unit grid. */
function mark({ stem, dots }) {
  return `
    <path d="M5.6 4.2V19.8" fill="none" stroke="${stem}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M7 4.2H10.7A7.8 7.8 0 0 1 10.7 19.8H7" fill="none" stroke="${dots}"
          stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0.01 4.5"/>`;
}

function tile({ size, radius, inset, background, stem, dots }) {
  const scale = (size - inset * 2) / 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${background ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${background}"/>` : ''}
  <g transform="translate(${inset} ${inset}) scale(${scale})">${mark({ stem, dots })}</g>
</svg>`;
}

const dark = (size, insetRatio) =>
  tile({
    size,
    radius: size * 0.22,
    inset: size * insetRatio,
    background: INK,
    stem: PAPER,
    dots: ACCENT_ON_DARK,
  });

const targets = [
  { name: 'icon-192.png', svg: dark(192, 0.2), size: 192 },
  { name: 'icon-512.png', svg: dark(512, 0.2), size: 512 },
  // Maskable icons get cropped to a circle on some launchers, so the mark
  // sits well inside the safe zone.
  { name: 'icon-512-maskable.png', svg: dark(512, 0.29), size: 512 },
  { name: 'apple-touch-icon.png', svg: dark(180, 0.19), size: 180 },
];

await fs.mkdir(OUT, { recursive: true });

// Vector favicon for browsers that take one, plus a bare mark for docs.
await fs.writeFile(path.join(OUT, 'icon.svg'), dark(64, 0.19).trim() + '\n');
await fs.writeFile(
  path.join(OUT, 'logo.svg'),
  tile({ size: 48, radius: 0, inset: 0, background: null, stem: INK, dots: ACCENT }).trim() + '\n',
);

for (const target of targets) {
  await sharp(Buffer.from(target.svg))
    .resize(target.size, target.size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, target.name));
  console.log(target.name);
}

// A 32px ICO keeps legacy tabs and bookmark bars happy.
const ico = await sharp(Buffer.from(dark(64, 0.16))).resize(32, 32).png().toBuffer();
await fs.writeFile(path.join(OUT, 'favicon.ico'), ico);
console.log('favicon.ico');
