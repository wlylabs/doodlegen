import { subjectOf } from './charset';
import { brandName, layoutLabel, printedTitle, productTitle, styleLabel } from './naming';
import { FONTS, MARKETS, PAPERS, papersFor } from './presets';
import type { MarketSpec } from './presets';
import type { Config } from './types';

export interface ListingInput {
  config: Config;
  characters: string[];
  /** Pages in one PDF, front and back matter included. */
  pageCount: number;
}

export interface ListingCopy {
  market: MarketSpec['id'];
  label: string;
  language: 'id' | 'en';
  title: string;
  /** Ready to paste into the marketplace's description field. */
  body: string;
  tags: string[];
  /** Notes about the marketplace's own limits, shown next to the copy. */
  limits: string;
}

const CONTENT_TAGS: Record<Config['content'], string[]> = {
  letters: [
    'alphabet worksheet',
    'abc printable',
    'letter tracing',
    'alphabet coloring',
    'learn to write',
    'preschool alphabet',
  ],
  numbers: [
    'number tracing',
    'numbers 1 20',
    'counting practice',
    'math printable',
    'preschool numbers',
    'number worksheet',
  ],
  words: [
    'name tracing',
    'word tracing',
    'sight words',
    'custom worksheet',
    'handwriting words',
    'name practice',
  ],
};

const STYLE_TAGS: Record<Config['style'], string[]> = {
  outline: ['coloring page', 'coloring book', 'color and learn'],
  dotted: ['tracing worksheet', 'dotted letters', 'trace and write'],
  combo: ['trace and color', 'tracing practice', 'write and color'],
};

const BASE_TAGS = [
  'printable pdf',
  'homeschool',
  'preschool',
  'kindergarten',
  'toddler activity',
  'classroom resource',
  'busy book pages',
  'digital download',
  'montessori',
  'fine motor skills',
];

const ID_TAGS = [
  'lembar kerja anak',
  'belajar menulis',
  'mewarnai anak',
  'paud tk',
  'printable anak',
  'worksheet anak',
  'belajar huruf',
  'belajar angka',
  'file pdf',
  'download digital',
];

/** Trimmed to the marketplace's tag rules: length, count, no duplicates. */
function fitTags(pool: string[], market: MarketSpec): string[] {
  const out: string[] = [];
  for (const raw of pool) {
    const tag = raw.trim().toLowerCase();
    if (!tag || tag.length > market.tagMax || out.includes(tag)) continue;
    out.push(tag);
    if (out.length === market.tagCount) break;
  }
  return out;
}

function clampTitle(title: string, max: number): string {
  if (title.length <= max) return title;
  const cut = title.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return (space > max * 0.6 ? cut.slice(0, space) : cut).trim();
}

function paperLine(config: Config): string {
  return papersFor(config.paper)
    .map((paper) => `${paper.label} (${paper.note})`)
    .join(' + ');
}

/**
 * Everything a listing needs, derived from the same config that drew the
 * pages: the numbers quoted in the copy are the numbers in the file.
 */
export function buildListing({ config, characters }: ListingInput): ListingCopy[] {
  const subject = subjectOf(config, characters);
  const style = styleLabel(config);
  const layout = layoutLabel(config);
  const title = productTitle(config, characters);
  const brand = brandName(config);
  const papers = paperLine(config);
  const family = FONTS[config.font].family.replace(/\s*\(.*\)$/, '');
  const worksheets = characters.length;

  const tagPool = [
    ...CONTENT_TAGS[config.content],
    ...STYLE_TAGS[config.style],
    ...BASE_TAGS,
  ];

  const extras = [config.coverPage ? 'sampul' : '', config.termsPage ? 'lisensi' : ''].filter(Boolean);
  const extrasEn = [config.coverPage ? 'a cover page' : '', config.termsPage ? 'a terms of use page' : '']
    .filter(Boolean)
    .join(' and ');

  const included = [
    `${worksheets} halaman latihan${extras.length ? `, plus halaman ${extras.join(' dan ')}` : ''}`,
    `Format PDF, ${papers}`,
    'Vector 300 DPI, garis hitam bersih, tanpa watermark',
  ];

  const includedEn = [
    `${worksheets} practice pages${extrasEn ? `, plus ${extrasEn}` : ''}`,
    `PDF format, ${papers}`,
    'Vector artwork at 300 DPI or better, clean black lines, no watermark',
  ];

  // Etsy ranks on the whole title string, so each segment adds a different
  // search phrase rather than repeating the one already in the product name.
  const etsyTitle = clampTitle(
    [
      title.en,
      `${worksheets} Printable Worksheets`,
      'Instant Download PDF for Preschool and Kindergarten',
    ].join(' | '),
    MARKETS[0].titleMax,
  );

  const etsyBody = [
    `${title.en} — instant download, print at home as many times as you like.`,
    '',
    'WHAT YOU GET',
    ...includedEn.map((line) => `- ${line}`),
    `- ${layout.en} layout, drawn in ${family}`,
    '',
    'HOW TO USE',
    '- Download the PDF right after checkout, no waiting and nothing is shipped.',
    '- Print at 100% scale with page scaling turned off.',
    '- 80-120 gsm paper keeps crayon and marker from bleeding through.',
    '',
    'TERMS',
    '- For personal, family, classroom and library use.',
    '- Please do not resell, share or re-upload the file itself.',
    brand ? `- Designed by ${brand}.` : null,
    '',
    'Questions before you buy? Send a message — happy to help.',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const gumroadBody = [
    `# ${title.en}`,
    '',
    `${worksheets} print-ready worksheets for ${subject.en.toLowerCase()}, in ${style.en.toLowerCase()} style.`,
    '',
    '## What is inside',
    ...includedEn.map((line) => `- ${line}`),
    '',
    '## Why it prints well',
    '- Vector letters, so they stay sharp at any size — no pixels, no fuzzy edges.',
    '- 0.5 inch safe margin on every page, inside every home printer’s printable area.',
    '- Single-plate black ink, so it photocopies cleanly and costs less to print.',
    '',
    '## Licence',
    'Personal, family and classroom use. Reselling or redistributing the file is not permitted.',
    brand ? `\nMade by ${brand}.` : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const shopeeBody = [
    `${title.id} — file PDF siap cetak, langsung bisa diunduh setelah pembayaran.`,
    '',
    'ISI PAKET',
    ...included.map((line) => `- ${line}`),
    `- Susunan ${layout.id.toLowerCase()}, huruf ${family}`,
    '',
    'CARA PAKAI',
    '- Unduh file PDF dari chat/pesanan, simpan di HP atau laptop.',
    '- Cetak ukuran asli 100%, jangan pakai "fit to page".',
    '- Kertas 80-120 gsm supaya crayon tidak tembus ke belakang.',
    '',
    'KETENTUAN',
    '- Untuk pemakaian pribadi, keluarga, dan kelas.',
    '- Dilarang menjual ulang atau membagikan filenya.',
    brand ? `- Dibuat oleh ${brand}.` : null,
    '',
    'PENTING: produk digital, tidak ada barang fisik yang dikirim.',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const [etsy, gumroad, shopee] = MARKETS;

  return [
    {
      market: 'etsy',
      label: etsy.label,
      language: 'en',
      title: etsyTitle,
      body: etsyBody,
      tags: fitTags(tagPool, etsy),
      limits: etsy.note,
    },
    {
      market: 'gumroad',
      label: gumroad.label,
      language: 'en',
      title: clampTitle(`${title.en} — ${worksheets} Printable Worksheets`, gumroad.titleMax),
      body: gumroadBody,
      tags: fitTags(tagPool, gumroad),
      limits: gumroad.note,
    },
    {
      market: 'shopee',
      label: shopee.label,
      language: 'id',
      title: clampTitle(
        `${title.id} | ${worksheets} Lembar Kerja PDF Siap Cetak ${
          config.paper === 'both' ? 'A4 & Letter' : PAPERS[config.paper].label
        }`,
        shopee.titleMax,
      ),
      body: shopeeBody,
      tags: fitTags([...ID_TAGS, ...tagPool], shopee),
      limits: shopee.note,
    },
  ];
}

/** The read-me that ships inside the pack, addressed to the buyer. */
export function buyerReadme({ config, characters, pageCount }: ListingInput): string {
  const title = printedTitle(config, characters);
  const brand = brandName(config);
  const papers = paperLine(config);

  const lines =
    config.language === 'id'
      ? [
          `Isi: ${pageCount} halaman PDF (${papers}).`,
          '',
          'CARA MENCETAK',
          '1. Buka file PDF dengan Adobe Reader, Preview, atau aplikasi PDF apa pun.',
          '2. Pada dialog cetak, pilih ukuran asli 100% dan matikan "fit to page".',
          '3. Gunakan kertas 80-120 gsm agar crayon dan spidol tidak tembus.',
          '4. Cetak hitam putih saja; semua garis memakai tinta hitam tunggal.',
          '',
          'KETENTUAN',
          '- Boleh dicetak ulang tanpa batas untuk pemakaian pribadi, keluarga, dan kelas.',
          '- Tidak boleh dijual kembali, dibagikan, atau diunggah ulang dalam bentuk file.',
          brand ? `- Hak cipta ${brand}. Semua hak dilindungi.` : null,
          '',
          'Dibuat dengan DoodleGen.',
        ]
      : [
          `Inside: ${pageCount} PDF pages (${papers}).`,
          '',
          'HOW TO PRINT',
          '1. Open the PDF in Adobe Reader, Preview, or any other PDF app.',
          '2. In the print dialog, choose 100% scale and turn page scaling off.',
          '3. Use 80-120 gsm paper so crayon and marker do not bleed through.',
          '4. Print in black and white; every line uses a single black ink.',
          '',
          'TERMS',
          '- Print as many copies as you like for personal, family and classroom use.',
          '- Do not resell, share, or re-upload the file itself.',
          brand ? `- Copyright ${brand}. All rights reserved.` : null,
          '',
          'Made with DoodleGen.',
        ];

  return [title, '='.repeat(title.length), '', ...lines]
    .filter((line): line is string => line !== null)
    .join('\n');
}

/** File names inside the pack, in the language the pack is written in. */
export function packFileNames(config: Config): { readme: string; licence: string } {
  return config.language === 'id'
    ? { readme: 'BACA-DULU.txt', licence: 'LISENSI-FONT.txt' }
    : { readme: 'READ-ME-FIRST.txt', licence: 'FONT-LICENSE.txt' };
}

/** The note that introduces the font licence shipped with the pack. */
export function licenceNote(config: Config, family: string, licence: string | null): string {
  return config.language === 'id'
    ? [
        `Huruf pada paket ini: ${family}`,
        'Lisensi: SIL Open Font License 1.1',
        '',
        'Lisensi ini mengizinkan penyematan font di dalam PDF serta penjualan',
        'berkas PDF yang dihasilkan. Teks lisensi lengkap disertakan di bawah.',
        '',
        licence ?? 'Teks lisensi lengkap: https://openfontlicense.org',
      ].join('\n')
    : [
        `Typeface used in this pack: ${family}`,
        'Licence: SIL Open Font License 1.1',
        '',
        'This licence permits embedding the font inside a PDF and selling the',
        'resulting PDF files. The full licence text follows.',
        '',
        licence ?? 'Full licence text: https://openfontlicense.org',
      ].join('\n');
}

/** One text file per marketplace, ready to paste field by field. */
export function copyToText(copy: ListingCopy): string {
  return [
    `${copy.label.toUpperCase()} — ${copy.limits}`,
    '',
    'JUDUL / TITLE',
    copy.title,
    `(${copy.title.length} karakter)`,
    '',
    'DESKRIPSI / DESCRIPTION',
    copy.body,
    '',
    `TAG (${copy.tags.length})`,
    copy.tags.join(', '),
    '',
  ].join('\n');
}
