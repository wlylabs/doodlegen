/**
 * Renders the DoodleGen mark into the icon set the app and manifest link to,
 * plus the social card the landing page's metadata points at.
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
  // sits well inside the safe zone. Android picks the maskable icon nearest
  // the density it needs, so both sizes the manifest lists are drawn.
  { name: 'icon-192-maskable.png', svg: dark(192, 0.29), size: 192 },
  { name: 'icon-512-maskable.png', svg: dark(512, 0.29), size: 512 },
  { name: 'apple-touch-icon.png', svg: dark(180, 0.19), size: 180 },
];

/**
 * Manifest shortcuts — the entries a long-press on the installed app shows.
 * Each is a tile carrying what that shortcut makes: the mark for the studio
 * itself, a bare letter for the colouring pack, a letter sitting on a guide
 * line for tracing, and figures for the number pack. Type is set in a generic sans, like the
 * social card, so the file renders the same wherever this script runs.
 */
function shortcut(glyph, { guide = false, size = 96 } = {}) {
  const radius = size * 0.22;
  const fontSize = glyph.length > 1 ? size * 0.42 : size * 0.62;
  const middle = guide ? size * 0.46 : size * 0.54;
  // A dotted glyph is what tracing looks like on the page, but at 96 px it
  // collapses into speckle. The worksheet's guide line says the same thing
  // and survives the size, so the letter stays solid and sits on a rule.
  const rule = guide
    ? `<line x1="${size * 0.2}" x2="${size * 0.8}" y1="${size * 0.72}" y2="${size * 0.72}"
             stroke="${ACCENT_ON_DARK}" stroke-width="${size * 0.045}" stroke-linecap="round"
             stroke-dasharray="${size * 0.09} ${size * 0.07}"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${INK}"/>
  <text x="${size / 2}" y="${middle}" font-family="sans-serif" font-size="${fontSize}" font-weight="700"
        text-anchor="middle" dominant-baseline="central" fill="${PAPER}">${glyph}</text>
  ${rule}
</svg>`;
}

targets.push(
  { name: 'shortcut-studio.png', svg: dark(96, 0.2), size: 96 },
  { name: 'shortcut-letters.png', svg: shortcut('A'), size: 96 },
  { name: 'shortcut-tracing.png', svg: shortcut('a', { guide: true }), size: 96 },
  { name: 'shortcut-numbers.png', svg: shortcut('123'), size: 96 },
);

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
      <rect width="${w}" height="${h}" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="2"/>
      <rect x="${w * 0.22}" y="${h * 0.2}" width="${w * 0.56}" height="${h * 0.34}" rx="14"
            fill="none" stroke="${INK}" stroke-width="6" ${dotted ? 'stroke-dasharray="0.01 12" stroke-linecap="round"' : ''}/>
      ${[0, 1, 2]
        .map(
          (row) =>
            `<line x1="${w * 0.16}" x2="${w * 0.84}" y1="${h * (0.66 + row * 0.09)}" y2="${h * (0.66 + row * 0.09)}" stroke="#D6D3D1" stroke-width="3"/>`,
        )
        .join('')}
    </g>`;
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <circle cx="${W * 0.08}" cy="${H * 0.12}" r="180" fill="${ACCENT}" opacity="0.07"/>
  <circle cx="${W * 0.95}" cy="${H * 0.9}" r="200" fill="${ACCENT}" opacity="0.07"/>
  <g transform="translate(72 84) scale(1.9)">${mark({ stem: INK, dots: ACCENT })}</g>
  <text x="126" y="128" font-family="sans-serif" font-size="34" font-weight="700" fill="${INK}">DoodleGen</text>
  <text x="72" y="252" font-family="sans-serif" font-size="54" font-weight="700" fill="${INK}">Halaman mewarnai &amp;</text>
  <text x="72" y="318" font-family="sans-serif" font-size="54" font-weight="700" fill="${ACCENT}">tracing siap dijual</text>
  <text x="72" y="388" font-family="sans-serif" font-size="25" fill="#57534E">PDF A4 + US Letter — vektor 300 DPI</text>
  <text x="72" y="428" font-family="sans-serif" font-size="25" fill="#57534E">Tanpa watermark, lisensi komersial</text>
  <text x="72" y="468" font-family="sans-serif" font-size="25" fill="#57534E">Kit listing Etsy, Gumroad, Shopee</text>
  <g opacity="0.98">
    ${sheet(786, 122, 178, -8, false)}
    ${sheet(908, 160, 178, 4, false)}
    ${sheet(1000, 206, 178, 12, true)}
  </g>
  <rect x="0" y="${H - 10}" width="${W}" height="10" fill="${ACCENT}"/>
</svg>`;
}

await sharp(Buffer.from(socialCard())).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'og.png'));
console.log('og.png');

// A 32px ICO keeps legacy tabs and bookmark bars happy.
const ico = await sharp(Buffer.from(dark(64, 0.16))).resize(32, 32).png().toBuffer();
await fs.writeFile(path.join(OUT, 'favicon.ico'), ico);
console.log('favicon.ico');
