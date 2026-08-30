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
 * The upload guides are checked against the same drafts: every marketplace
 * has one, every step has fields, every field says what to put in it, and
 * every field that pastes generated copy pastes the very string the copy
 * generator produced. A guide quoting a stale title is worse than no guide.
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

  const guides = lib.buildUploadGuides({ config, characters, pageCount: characters.length });
  const covered = guides.map((guide) => guide.market).join(',');
  const expected = lib.MARKETS.map((market) => market.id).join(',');
  if (covered !== expected) {
    failures += 1;
    console.log(`  guides     FAIL — urutan panduan ${covered} ≠ ${expected}`);
  }

  for (const guide of guides) {
    const listing = listings.find((item) => item.market === guide.market);
    const problems = [];
    if (!guide.entry) problems.push('no entry point');
    if (!guide.steps.length) problems.push('no steps');
    if (!guide.checklist.length) problems.push('no checklist');

    let fields = 0;
    for (const step of guide.steps) {
      if (!step.title) problems.push('a step with no title');
      if (!step.fields.length) problems.push(`step "${step.title}" has no fields`);
      for (const field of step.fields) {
        fields += 1;
        if (!field.label) problems.push(`a field with no label in "${step.title}"`);
        // A generated field is only useful if it still carries the copy the
        // generator wrote; everything else needs an answer of its own.
        const generated = { title: listing.title, body: listing.body, tags: listing.tags.join(', ') };
        const wanted = generated[field.kind];
        if (wanted !== undefined && field.value !== wanted) {
          problems.push(`${field.kind} field "${field.label}" is out of sync with the draft`);
        }
        if (wanted === undefined && !field.value) {
          problems.push(`field "${field.label}" has no value`);
        }
      }
    }

    const text = lib.guideToText(guide);
    if (!text.includes(listing.title)) problems.push('the text file is missing the title');
    if (text.includes('undefined')) problems.push('the text file contains "undefined"');

    const line = `  ${guide.market.padEnd(10)} ${String(guide.steps.length).padStart(2)} steps  ${String(fields).padStart(2)} fields  ${guide.checklist.length} checks`;
    if (problems.length) {
      failures += problems.length;
      console.log(`${line}  FAIL — ${problems.join('; ')}`);
    } else {
      console.log(line);
    }
  }
}

console.log(
  failures
    ? `\n${failures} problem(s) found.`
    : '\nAll listing drafts fit their marketplace limits, and every upload guide matches them.',
);
process.exit(failures ? 1 : 0);
