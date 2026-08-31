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
 * The same drafts are checked against each marketplace's ranking surface,
 * because "SEO" has to mean something a script can fail on:
 *
 *   - the focus phrase appears in the title, verbatim
 *   - it appears in the opening of the description, wherever that
 *     marketplace reads descriptions at all
 *   - Etsy's title carries the tags that fitted, since a phrase in both is
 *     the one that ranks
 *   - no word is repeated in a title more than twice — that is stuffing,
 *     and every marketplace here ranks it down
 *   - the tag field is filled to its count, with no duplicate searches
 *   - Shopee's name uses the field it is given, since the name is the only
 *     thing its search engine reads
 *
 * Every draft is then read the way the marketplace's own scanner reads it,
 * because a listing that ranks and is taken down has ranked for nothing:
 *
 *   - no third-party brand name in the title, description or tags
 *   - no link, email, phone number or rival marketplace anywhere in the copy
 *   - no vocabulary of the digital goods a lapak actually restricts, and no
 *     promotional shouting in an Indonesian product name
 *   - what each marketplace requires to be *said* is said: no parcel shipped,
 *     the file arrives in the lapak's own chat, and the licence is stated
 *
 * The check runs over the seller's own words too — shop name, tagline,
 * product title all reach the listing through these fields — so the last
 * case below deliberately types a violation into each of them and fails if
 * the linter lets any of them through.
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
    name: 'progressive + guides + thick stroke, id',
    patch: {
      content: 'letters',
      letterCase: 'both',
      style: 'progressive',
      layout: 'worksheet',
      stroke: 'thick',
      guides: true,
      ink: 'soft',
      language: 'id',
      brand: 'Kelas Kecil',
    },
  },
  {
    name: 'one word, no brand, no svg',
    patch: {
      content: 'words',
      words: 'Bimasakti',
      style: 'dotted',
      layout: 'grid',
      grid: '4x5',
      svgFiles: false,
      brand: '',
      language: 'en',
    },
  },
  {
    name: 'custom title longer than Tokopedia allows',
    patch: {
      content: 'letters',
      language: 'id',
      brand: 'Rumah Kreatif Nusantara',
      productTitle:
        'Paket Lengkap Lembar Kerja Belajar Menulis dan Mewarnai Huruf Alfabet untuk Anak Usia Dini',
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

  for (const listing of listings) {
    const market = lib.MARKETS.find((spec) => spec.id === listing.market);
    const problems = [];
    const flat = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const has = (haystack, needle) => flat(haystack).includes(flat(needle));

    // A seller's own title can eat the whole budget; the phrase is only
    // owed a place in the title when the generator picked the title.
    if (!config.productTitle && !has(listing.title, listing.focus)) {
      problems.push(`focus "${listing.focus}" missing from the title`);
    }
    // Etsy is the exception: its search does not read descriptions.
    if (listing.market !== 'etsy' && listing.market !== 'gumroad') {
      if (!has(listing.body.slice(0, 200), listing.focus)) {
        problems.push('focus phrase not in the opening of the description');
      }
    }
    if (listing.market === 'etsy') {
      // A top tag belongs in the title — unless putting it there would repeat
      // a word the title already uses twice, which is the stuffing the
      // generator is built to refuse. Those two rules cannot both hold for a
      // pack whose every phrase shares one noun, and the anti-stuffing rule
      // is the one that wins.
      const titleWords = flat(listing.title).split(' ');
      const seen = (word) => titleWords.filter((other) => other === word).length;
      // A seller's own long title can leave no budget at all; that is their
      // call, not a defect in the draft.
      const room = market.titleMax - listing.title.length - 3;
      const missing = listing.tags.slice(0, 3).filter((tag) => {
        if (has(listing.title, tag)) return false;
        if (tag.length > room) return false;
        return !flat(tag).split(' ').some((word) => word.length >= 3 && seen(word) >= 2);
      });
      if (missing.length) {
        problems.push(`top tags left out of the title with room to spare: ${missing.join(', ')}`);
      }
    }
    if (listing.market === 'shopee') {
      const target = market.titleTarget ?? market.titleMax;
      if (listing.title.length < target * 0.6) {
        problems.push(`name ${listing.title.length} chars, wasting a field that reaches ${target}`);
      }
    }

    // The SVGs ride along in the ZIP; a listing that never names them is
    // handing over the differentiator for free. Pinterest is exempt: 500
    // characters have no room for a bonus line.
    if (config.svgFiles && listing.market !== 'pinterest' && !/svg/i.test(listing.body)) {
      problems.push('editable SVGs ship with the pack but the description never mentions them');
    }

    const counts = new Map();
    for (const word of flat(listing.title).split(' ')) {
      if (word.length < 3) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
    const stuffed = [...counts].filter(([, n]) => n > 2).map(([word, n]) => `${word}x${n}`);
    if (stuffed.length) problems.push(`repeated in the title: ${stuffed.join(', ')}`);

    if (listing.tags.length < market.tagCount) {
      problems.push(`${listing.tags.length} of ${market.tagCount} tag slots used`);
    }
    const prints = listing.tags.map((tag) => flat(tag).split(' ').sort().join(' '));
    if (new Set(prints).size !== prints.length) problems.push('two tags are the same search');

    const line = `  ${listing.market.padEnd(10)} seo: fokus "${listing.focus}"`;
    if (problems.length) {
      failures += problems.length;
      console.log(`${line}  FAIL — ${problems.join('; ')}`);
    } else {
      console.log(line);
    }
  }

  for (const listing of listings) {
    const findings = lib.checkListing(listing, listing.market);
    const line = `  ${listing.market.padEnd(10)} aturan lapak`;
    if (findings.length) {
      failures += findings.length;
      console.log(`${line}  FAIL — ${findings.map((finding) => lib.findingToText(finding)).join(' | ')}`);
    } else {
      console.log(`${line}  bersih (${lib.marketRules(listing.market).length} aturan)`);
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

    if (!guide.rules.length) problems.push('no marketplace rules attached');
    if (guide.warnings.length) {
      problems.push(`draft trips its own rules: ${guide.warnings.map((w) => w.rule).join(', ')}`);
    }

    const text = lib.guideToText(guide);
    if (!text.includes(listing.title)) problems.push('the text file is missing the title');
    if (text.includes('undefined')) problems.push('the text file contains "undefined"');
    if (!text.includes('ATURAN LAPAK')) problems.push('the text file drops the marketplace rules');

    const line = `  ${guide.market.padEnd(10)} ${String(guide.steps.length).padStart(2)} steps  ${String(fields).padStart(2)} fields  ${guide.checklist.length} checks`;
    if (problems.length) {
      failures += problems.length;
      console.log(`${line}  FAIL — ${problems.join('; ')}`);
    } else {
      console.log(line);
    }
  }
}

/*
 * The linter's own test. Everything above proves the generator writes copy
 * that passes; this proves the check would have caught it if it did not —
 * every violation here is one a seller can type into the studio's own fields.
 */
const dirty = {
  ...lib.DEFAULT_CONFIG,
  language: 'id',
  brand: 'Canva Kids Studio',
  productTitle: 'Lembar Kerja GRATIS Termurah',
  coverTagline: 'Pesan cepat WA 0812-3456-7890 atau cek toko kami di Tokopedia',
};
const dirtyCharacters = lib.buildCharacters(dirty);
const dirtyListing = lib
  .buildListing({ config: dirty, characters: dirtyCharacters, pageCount: dirtyCharacters.length })
  .find((listing) => listing.market === 'shopee');
const caught = new Set(lib.checkListing(dirtyListing, 'shopee').map((finding) => finding.rule));
const wanted = ['merek-pihak-lain', 'kontak-di-luar', 'lapak-lain', 'kata-promosi'];
const missed = wanted.filter((rule) => !caught.has(rule));

console.log('\nkata penjual sendiri — kontrol positif untuk pemeriksa aturan');
if (missed.length) {
  failures += missed.length;
  console.log(`  shopee     FAIL — tidak tertangkap: ${missed.join(', ')}`);
} else {
  console.log(`  shopee     tertangkap: ${[...caught].join(', ')}`);
}

/*
 * The buyer link is checked per marketplace rather than once, because the
 * same address is fine on one lapak and a takedown on the next: a Tokopedia
 * shop link inside a file sold on Shopee is pulling the buyer off Shopee,
 * and TPT does not allow a store link at all.
 */
const linkCases = [
  { url: 'https://shopee.co.id/studiocerdas', market: 'shopee', want: [] },
  { url: 'https://tokopedia.com/studiocerdas', market: 'shopee', want: ['tautan-lapak-lain'] },
  { url: 'https://studiocerdas.com/cara-cetak', market: 'tpt', want: ['tautan-tpt'] },
  { url: 'https://www.teacherspayteachers.com/store/studio', market: 'tpt', want: [] },
  { url: 'javascript:alert(1)', market: 'gumroad', want: ['tautan-tidak-sah'] },
  { url: '', market: 'etsy', want: [] },
];

console.log('\ntautan untuk pembeli — satu alamat, enam aturan');
for (const linkCase of linkCases) {
  const got = lib.checkBuyerLink(linkCase.url, linkCase.market).map((finding) => finding.rule);
  const same = got.length === linkCase.want.length && got.every((rule, i) => rule === linkCase.want[i]);
  const line = `  ${linkCase.market.padEnd(10)} ${linkCase.url || '(kosong)'}`;
  if (same) {
    console.log(`${line} → ${got.length ? got.join(', ') : 'bersih'}`);
  } else {
    failures += 1;
    console.log(`${line}  FAIL — dapat [${got.join(', ')}], harusnya [${linkCase.want.join(', ')}]`);
  }
}

console.log(
  failures
    ? `\n${failures} problem(s) found.`
    : '\nAll listing drafts fit their marketplace limits and their marketplace rules, and every upload guide matches them.',
);
process.exit(failures ? 1 : 0);
