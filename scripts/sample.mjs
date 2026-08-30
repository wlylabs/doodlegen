/**
 * Offline QA harness: renders sample PDFs with the exact same layout and
 * drawing code the browser uses, so output can be inspected without a UI.
 *
 *   node scripts/sample.mjs [outDir]
 */
import { build } from 'esbuild';
import fontkit from '@pdf-lib/fontkit';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.resolve(process.argv[2] ?? path.join(root, '.samples'));
const bundle = path.join(outDir, '_lib.mjs');

await fs.mkdir(outDir, { recursive: true });
await build({
  entryPoints: [path.join(root, 'scripts/lib-entry.ts')],
  outfile: bundle,
  bundle: true,
  format: 'esm',
  platform: 'node',
  external: ['pdf-lib', '@pdf-lib/fontkit'],
  logLevel: 'error',
});

const lib = await import(pathToFileURL(bundle).href);

async function loadFont(id) {
  const spec = lib.FONTS[id];
  const bytes = await fs.readFile(path.join(root, 'public', spec.file));
  const parsed = fontkit.create(bytes);
  const runs = new Map();
  return {
    id,
    bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    unitsPerEm: parsed.unitsPerEm,
    ascent: parsed.ascent,
    descent: parsed.descent,
    capHeight: parsed.capHeight,
    xHeight: parsed.xHeight,
    layout(text) {
      if (!runs.has(text)) runs.set(text, parsed.layout(text, lib.FONT_FEATURES));
      return runs.get(text);
    },
    svgPath(glyph) {
      return glyph.path.toSVG() || '';
    },
    supports(text) {
      return Array.from(text)
        .filter((ch) => parsed.hasGlyphForCodePoint(ch.codePointAt(0)))
        .join('')
        .trim();
    },
  };
}

const cases = [
  { name: 'single-outline-rounded', patch: { layout: 'single', style: 'outline', font: 'rounded', paper: 'a4' } },
  { name: 'single-combo-playful', patch: { layout: 'single', style: 'combo', font: 'playful', paper: 'a4' } },
  { name: 'grid-dotted-school', patch: { layout: 'grid', style: 'dotted', font: 'school', grid: '3x4', paper: 'letter' } },
  { name: 'grid-combo-boldsans', patch: { layout: 'grid', style: 'combo', font: 'boldsans', grid: '3x3', paper: 'a4' } },
  {
    name: 'worksheet-combo-rounded-titled',
    patch: { layout: 'worksheet', style: 'combo', font: 'rounded', paper: 'a4', showTitle: true },
  },
  {
    name: 'numbers-worksheet-1-12',
    patch: { content: 'numbers', numberFrom: 1, numberTo: 12, layout: 'worksheet', style: 'combo', font: 'rounded', paper: 'both' },
  },
  {
    name: 'letters-both-grid',
    patch: { letterCase: 'both', layout: 'grid', grid: '2x2', style: 'combo', font: 'playful', paper: 'a4' },
  },
  {
    name: 'marketplace-pack-cover-terms',
    patch: {
      layout: 'worksheet',
      style: 'combo',
      font: 'rounded',
      paper: 'a4',
      showTitle: true,
      pageNumbers: true,
      coverPage: true,
      termsPage: true,
      brand: 'Studio Cerdas',
      productTitle: 'Alfabet A-Z Trace and Color',
    },
  },
  {
    name: 'words-worksheet',
    patch: {
      content: 'words',
      words: 'Ayah, Bunda, Adik, Kakak',
      layout: 'worksheet',
      style: 'combo',
      font: 'school',
      paper: 'letter',
      pageNumbers: true,
      coverPage: true,
      termsPage: true,
      brand: 'Rumah Belajar',
      language: 'id',
      palette: 'mono',
    },
  },
];

for (const testCase of cases) {
  const config = { ...lib.DEFAULT_CONFIG, ...testCase.patch };
  const font = await loadFont(config.font);
  const characters = lib.buildCharacters(config).slice(0, testCase.patch.content === 'numbers' ? 12 : 4);
  const files = await lib.generate({ font, config, characters });
  for (const file of files) {
    const target = path.join(outDir, `${testCase.name}--${file.paperId}.pdf`);
    await fs.writeFile(target, file.bytes);
    console.log(`${path.relative(root, target)}  ${file.pages}p  ${(file.size / 1024).toFixed(1)} KB`);
  }
}
