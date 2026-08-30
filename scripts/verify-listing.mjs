/**
 * Checks every marketplace draft against that marketplace's own listing form:
 *
 *   - the title fits the character limit the form enforces
 *   - the description fits, where the marketplace caps it
 *   - the tags fit, in count and in per-tag length
 *
 * A draft that overruns is not a cosmetic problem: the seller pastes it,
 * the form truncates it mid-word, and the listing goes live cut in half.
 * Titles grow with the brand name and the character set, so the matrix
 * below runs the longest realistic combinations, not the default one.
 *
 * Usage: node scripts/verify-listing.mjs
 */
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
// Inside the project, so the bundle's externals resolve from node_modules.
const outDir = path.join(root, 'node_modules/.cache/doodlegen');
const bundle = path.join(outDir, 'listing.mjs');

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

const cases = [
  { name: 'letters a-z, id', patch: { content: 'letters', language: 'id', brand: 'Studio Cerdas' } },
  { name: 'letters a-z, en', patch: { content: 'letters', language: 'en', brand: '' } },
  {
    name: 'numbers 1-100',
    patch: { content: 'numbers', numberFrom: 1, numberTo: 100, language: 'en', brand: 'Rumah Belajar' },
  },
  {
    name: 'long brand + long words',
    patch: {
      content: 'words',
      words: 'ekstrakurikuler\nperpustakaan\nkewarganegaraan\nmatahari',
      language: 'id',
      brand: 'Toko Printable Nusantara Sejahtera',
    },
  },
  {
    name: 'custom product title',
    patch: {
      content: 'letters',
      letterCase: 'both',
      language: 'en',
      brand: 'Little Desk Studio',
      productTitle: 'Uppercase and Lowercase Alphabet Trace and Color Practice Pack',
    },
  },
];

let failures = 0;

for (const testCase of cases) {
  const config = { ...lib.DEFAULT_CONFIG, ...testCase.patch };
  const characters = lib.buildCharacters(config);
  const listings = lib.buildListing({ config, characters, pageCount: characters.length });

  console.log(`\n${testCase.name} — ${characters.length} pages`);
  for (const listing of listings) {
    const market = lib.MARKETS.find((spec) => spec.id === listing.market);
    const problems = [];
    if (listing.title.length > market.titleMax) {
      problems.push(`title ${listing.title.length} > ${market.titleMax}`);
    }
    if (market.bodyMax && listing.body.length > market.bodyMax) {
      problems.push(`body ${listing.body.length} > ${market.bodyMax}`);
    }
    if (listing.tags.length > market.tagCount) {
      problems.push(`${listing.tags.length} tags > ${market.tagCount}`);
    }
    const long = listing.tags.filter((tag) => tag.length > market.tagMax);
    if (long.length) problems.push(`tag too long: ${long.join(', ')}`);

    const body = market.bodyMax ? `${listing.body.length}/${market.bodyMax}` : `${listing.body.length}`;
    const line = `  ${listing.market.padEnd(10)} title ${listing.title.length}/${market.titleMax}  body ${body}  tags ${listing.tags.length}/${market.tagCount}`;
    if (problems.length) {
      failures += problems.length;
      console.log(`${line}  FAIL — ${problems.join('; ')}`);
    } else {
      console.log(line);
    }
  }
}

console.log(failures ? `\n${failures} listing limit(s) exceeded.` : '\nAll listing drafts fit their marketplace limits.');
process.exit(failures ? 1 : 0);
