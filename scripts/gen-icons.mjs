/**
 * Renders the DoodleGen mark into the icon set the app and manifest link to,
 * plus the social card the landing page's metadata points at.
 *
 * The mark is a "D" whose stem is a solid contour and whose bowl is a dashed
 * tracing line — the two treatments the generator puts on a page — in white on a
 * squircle carrying the brand ramp. A launcher shows an icon at 48px next to
 * forty others, so the tile is what has to be recognised; the letter only has
 * to survive being small, which is why it is one weight and two textures
 * rather than a drawing.
 *
 * The ramp is the same three stops as `--brand-*` in app/globals.css. They are
 * repeated here because this script renders files rather than a document, and
 * a PNG cannot read a custom property.
 *
 *   node scripts/gen-icons.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.resolve(import.meta.dirname, '..', 'public');

const INK = '#101317';
const PAPER = '#FFFFFF';
const MUTED = '#57606E';
const ACCENT = '#F4601C';

/** The brand ramp — `--brand-from`, `--brand-via`, `--brand-to`. */
const BRAND = ['#FFBE42', '#F96E2A', '#E23C18'];

/** The mark itself, drawn on a 24-unit grid. */
function mark({ stem, dashes, width = 3.2 }) {
  return `
    <path d="M6.2 4.4V19.6" fill="none" stroke="${stem}" stroke-width="${width}" stroke-linecap="round"/>
    <path d="M6.2 4.4h4.2a7.6 7.6 0 0 1 0 15.2H6.2" fill="none" stroke="${dashes}"
          stroke-width="${width}" stroke-linecap="round" stroke-dasharray="3.4 2.3"/>`;
}

function ramp(id, angle = 'x1="0" y1="0" x2="1" y2="1"') {
  return `<linearGradient id="${id}" ${angle}>
    <stop offset="0%" stop-color="${BRAND[0]}"/>
    <stop offset="52%" stop-color="${BRAND[1]}"/>
    <stop offset="100%" stop-color="${BRAND[2]}"/>
  </linearGradient>`;
}

/**
 * One tile: a squircle of brand, a white letter, and a soft highlight across
 * the top so the icon has a light source rather than being a flat swatch.
 */
function tile({ size, inset, radius = size * 0.2225 }) {
  const scale = (size - inset * 2) / 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    ${ramp('brand')}
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.26"/>
      <stop offset="62%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#brand)"/>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#sheen)"/>
  <g transform="translate(${inset} ${inset}) scale(${scale})">${mark({ stem: PAPER, dashes: PAPER })}</g>
</svg>`;
}

/** The bare letter, for a document that supplies its own ground. */
function glyph(size) {
  const scale = size / 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <g transform="scale(${scale})">${mark({ stem: INK, dashes: ACCENT })}</g>
</svg>`;
}

const targets = [
  { name: 'icon-192.png', svg: tile({ size: 192, inset: 192 * 0.18 }), size: 192 },
  { name: 'icon-512.png', svg: tile({ size: 512, inset: 512 * 0.18 }), size: 512 },
  // Maskable icons get cropped to a circle on some launchers, so the mark
  // sits well inside the safe zone and the tile fills the frame corner to
  // corner — whatever shape the launcher cuts, it cuts brand, not background.
  {
    name: 'icon-192-maskable.png',
    svg: tile({ size: 192, inset: 192 * 0.28, radius: 0 }),
    size: 192,
  },
  {
    name: 'icon-512-maskable.png',
    svg: tile({ size: 512, inset: 512 * 0.28, radius: 0 }),
    size: 512,
  },
  // iOS masks the corners itself, so this one is drawn square-cornered too.
  { name: 'apple-touch-icon.png', svg: tile({ size: 180, inset: 180 * 0.19, radius: 0 }), size: 180 },
];

/**
 * Manifest shortcuts — the entries a long-press on the installed app shows.
 * Each is a tile carrying what that shortcut makes: the mark for the studio
 * itself, a bare letter for the colouring pack, a letter sitting on a guide
 * line for tracing, and figures for the number pack.
 *
 * They are ink rather than brand on purpose. A long-press menu shows the app
 * icon at the top and these underneath it; four more copies of the same
 * orange tile would be four rows of the same picture. Type is set in a
 * generic sans, like the social card, so the file renders the same wherever
 * this script runs.
 */
function shortcut(glyphText, { guide = false, size = 96 } = {}) {
  const radius = size * 0.2225;
  const fontSize = glyphText.length > 1 ? size * 0.42 : size * 0.62;
  const middle = guide ? size * 0.46 : size * 0.54;
  // A dashed glyph is what tracing looks like on the page, but at 96 px on a
  // single letter it collapses into speckle. The worksheet's guide line says
  // the same thing and survives the size, so the letter sits on a rule.
  const rule = guide
    ? `<line x1="${size * 0.2}" x2="${size * 0.8}" y1="${size * 0.72}" y2="${size * 0.72}"
             stroke="${BRAND[1]}" stroke-width="${size * 0.045}" stroke-linecap="round"
             stroke-dasharray="${size * 0.09} ${size * 0.07}"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${INK}"/>
  <text x="${size / 2}" y="${middle}" font-family="sans-serif" font-size="${fontSize}" font-weight="700"
        text-anchor="middle" dominant-baseline="central" fill="${PAPER}">${glyphText}</text>
  ${rule}
</svg>`;
}

targets.push(
  { name: 'shortcut-studio.png', svg: tile({ size: 96, inset: 96 * 0.18 }), size: 96 },
  { name: 'shortcut-letters.png', svg: shortcut('A'), size: 96 },
  { name: 'shortcut-tracing.png', svg: shortcut('a', { guide: true }), size: 96 },
  { name: 'shortcut-numbers.png', svg: shortcut('123'), size: 96 },
);

await fs.mkdir(OUT, { recursive: true });

// Vector favicon for browsers that take one, plus a bare mark for docs.
await fs.writeFile(path.join(OUT, 'icon.svg'), tile({ size: 64, inset: 64 * 0.18 }).trim() + '\n');
await fs.writeFile(path.join(OUT, 'logo.svg'), glyph(48).trim() + '\n');

for (const target of targets) {
  await sharp(Buffer.from(target.svg))
    .resize(target.size, target.size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, target.name));
  console.log(target.name);
}

/**
 * The social card. Type is set in a generic sans so the file renders the same
 * wherever this script runs; the shapes carry the brand.
 */
function socialCard() {
  const W = 1200;
  const H = 630;
  const sheet = (x, y, w, rotation, dotted) => {
    const h = w * 1.414;
    return `<g transform="translate(${x} ${y}) rotate(${rotation} ${w / 2} ${h / 2})">
      <rect width="${w}" height="${h}" rx="10" fill="#FFFFFF" stroke="#E6E8EC" stroke-width="2"/>
      <rect x="${w * 0.22}" y="${h * 0.2}" width="${w * 0.56}" height="${h * 0.34}" rx="14"
            fill="none" stroke="${INK}" stroke-width="6" ${dotted ? 'stroke-dasharray="0.01 12" stroke-linecap="round"' : ''}/>
      ${[0, 1, 2]
        .map(
          (row) =>
            `<line x1="${w * 0.16}" x2="${w * 0.84}" y1="${h * (0.66 + row * 0.09)}" y2="${h * (0.66 + row * 0.09)}" stroke="#D5D9E0" stroke-width="3"/>`,
        )
        .join('')}
    </g>`;
  };

  // The app icon, at the size a card can carry it, so a shared link and an
  // installed app are recognisably the same object.
  const badge = (x, y, size) => {
    const scale = (size - size * 0.36) / 24;
    return `<g transform="translate(${x} ${y})">
      <rect width="${size}" height="${size}" rx="${size * 0.2225}" fill="url(#brand)"/>
      <g transform="translate(${size * 0.18} ${size * 0.18}) scale(${scale})">${mark({ stem: PAPER, dashes: PAPER })}</g>
    </g>`;
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${ramp('brand')}</defs>
  <rect width="${W}" height="${H}" fill="#F7F8FA"/>
  <circle cx="${W * 0.08}" cy="${H * 0.12}" r="180" fill="${BRAND[0]}" opacity="0.1"/>
  <circle cx="${W * 0.95}" cy="${H * 0.9}" r="200" fill="${BRAND[2]}" opacity="0.08"/>
  ${badge(72, 76, 64)}
  <text x="152" y="118" font-family="sans-serif" font-size="34" font-weight="700" fill="${INK}">DoodleGen</text>
  <text x="72" y="252" font-family="sans-serif" font-size="54" font-weight="700" fill="${INK}">Halaman mewarnai &amp;</text>
  <text x="72" y="318" font-family="sans-serif" font-size="54" font-weight="700" fill="${BRAND[2]}">tracing siap dijual</text>
  <text x="72" y="388" font-family="sans-serif" font-size="25" fill="${MUTED}">PDF A4 + US Letter — vektor 300 DPI</text>
  <text x="72" y="428" font-family="sans-serif" font-size="25" fill="${MUTED}">Tanpa watermark, lisensi komersial</text>
  <text x="72" y="468" font-family="sans-serif" font-size="25" fill="${MUTED}">Kit listing Etsy, Gumroad, Shopee</text>
  <g opacity="0.98">
    ${sheet(786, 122, 178, -8, false)}
    ${sheet(908, 160, 178, 4, false)}
    ${sheet(1000, 206, 178, 12, true)}
  </g>
  <rect x="0" y="${H - 10}" width="${W}" height="10" fill="url(#brand)"/>
</svg>`;
}

await sharp(Buffer.from(socialCard())).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'og.png'));
console.log('og.png');

// A 32px ICO keeps legacy tabs and bookmark bars happy. At that size the tile
// is nearly all corner, so this one is drawn tighter than the launcher icons.
const ico = await sharp(Buffer.from(tile({ size: 64, inset: 64 * 0.15 })))
  .resize(32, 32)
  .png()
  .toBuffer();
await fs.writeFile(path.join(OUT, 'favicon.ico'), ico);
console.log('favicon.ico');
