import { subjectOf } from './charset';
import { brandName, layoutLabel, printedTitle, productTitle, styleLabel } from './naming';
import { FONTS, MARKETS, PAPERS, papersFor } from './presets';
import type { MarketSpec } from './presets';
import { fitTags, joinWithin, keywordTail, keywordsFor, titleCase } from './seo';
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
  /**
   * The one phrase this draft is written to win, in that marketplace's own
   * language. It appears in the title, and in the opening of the description
   * wherever that marketplace indexes descriptions.
   */
  focus: string;
  /** Where those words actually rank on this marketplace, in one line. */
  seo: string;
  /** Notes about the marketplace's own limits, shown next to the copy. */
  limits: string;
  /** Set only where the marketplace caps the description field. */
  bodyMax?: number;
}

/**
 * Words that sell this shape of product but do not follow from the config:
 * where the pages end up rather than what is on them. Everything else comes
 * out of `keywordsFor`, so it changes when the pack changes.
 */
const EXTRA_TAGS: Record<Config['language'], string[]> = {
  en: ['busy book pages', 'classroom resource', 'morning work', 'coloring book'],
  id: ['buku aktivitas', 'tugas sekolah', 'mewarnai anak', 'belajar sambil main'],
};

/** Where the keywords are read on each marketplace, told to the seller once. */
const SEO_NOTE: Record<MarketSpec['id'], string> = {
  etsy: 'Etsy memeringkat dari tag dan judul, bukan dari deskripsi. Ketiga belas tag terpakai, dan tag teratas diulang persis di judul.',
  tpt: 'Guru menyaring lewat Grade dan Subject dulu, kata kunci belakangan — isi ketiga filter itu, baru judulnya.',
  gumroad: 'Discover berjalan dari kategori dan angka penjualan; nama produk yang pendek dan jelas lebih berguna daripada judul panjang.',
  shopee: 'Nama produk adalah satu-satunya kolom yang dibaca mesin pencari Shopee — tidak ada kolom tag. Bagian sebelum tanda "|" ditulis untuk pembeli, sisanya untuk mesin.',
  tokopedia: 'Nama produk dan deskripsi dua-duanya terbaca, jadi kata kunci utama diulang di paragraf pertama deskripsi.',
  pinterest: 'Pinterest membaca judul, deskripsi, nama papan, dan alt text sebagai satu kesatuan — kalimat biasa, bukan tumpukan tagar.',
};

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
  const shortPapers = config.paper === 'both' ? 'A4 & US Letter' : PAPERS[config.paper].label;
  const spec = Object.fromEntries(MARKETS.map((market) => [market.id, market])) as Record<
    MarketSpec['id'],
    MarketSpec
  >;

  // Two keyword sets, because two languages are two different searches: an
  // Etsy buyer types "alphabet tracing worksheets", a Shopee buyer types
  // "belajar menulis huruf", and neither translates into the other's ranking.
  const words = {
    en: keywordsFor(config, characters, 'en'),
    id: keywordsFor(config, characters, 'id'),
  };
  const tagsFor = (market: MarketSpec, language: 'en' | 'id') =>
    fitTags(words[language], market, EXTRA_TAGS[language]);

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

  const tags = {
    etsy: tagsFor(spec.etsy, 'en'),
    tpt: tagsFor(spec.tpt, 'en'),
    gumroad: tagsFor(spec.gumroad, 'en'),
    shopee: tagsFor(spec.shopee, 'id'),
    tokopedia: tagsFor(spec.tokopedia, 'id'),
    pinterest: tagsFor(spec.pinterest, 'en'),
  };

  // Etsy matches a query against tags and title together, and a phrase that
  // sits in both is the one that ranks. So the title is assembled from the
  // tags that survived fitting, rather than written beside them and hoping.
  const etsyTitle = joinWithin(
    [
      title.en,
      titleCase(words.en.focus),
      ...tags.etsy.slice(0, 3).map(titleCase),
      `${worksheets} Printable Pages`,
      'Instant Download PDF',
    ],
    spec.etsy.titleMax,
  );

  const etsyBody = [
    // Etsy does not rank on the description, but Google does, and the first
    // ~160 characters are what it quotes: the phrase goes there.
    `${title.en} — ${worksheets} printable ${words.en.focus} for preschool and kindergarten. Instant download, print at home as many times as you like.`,
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

  // Teachers Pay Teachers is read by a teacher planning a week, not by a
  // parent browsing: the copy leads with how the pages are used in a room
  // full of children, and states the licence a school actually asks about.
  const tptBody = [
    `${title.en} — ${worksheets} print-and-go ${words.en.focus} for ${subject.en.toLowerCase()}, in ${style.en.toLowerCase()} style.`,
    '',
    'WHAT IS INCLUDED',
    ...includedEn.map((line) => `- ${line}`),
    `- ${layout.en} layout, drawn in ${family}`,
    '',
    'HOW TO USE IT',
    '- Morning work, literacy or maths centres, early finishers, and homework.',
    '- Laminate one set for dry-erase markers and reuse it all year.',
    '- Black ink on a single plate, so it photocopies cleanly for the whole class.',
    '- Prints at 100% scale on any home or school printer.',
    '',
    'TERMS OF USE',
    '- One licence covers one teacher and that teacher’s own students.',
    '- Buy additional licences for the rest of your team or your whole school.',
    '- Please do not share, resell or re-upload the file.',
    brand ? `- Designed by ${brand}.` : null,
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

  /**
   * Shopee and Tokopedia sell the same file to the same buyer, and the buyer
   * asks the same questions on both. Only the way the file reaches them
   * differs, so the copy is written once and the delivery lines are swapped.
   */
  const indonesianBody = (opening: string, fetchLine: string) =>
    [
      opening,
      '',
      'ISI PAKET',
      ...included.map((line) => `- ${line}`),
      `- Susunan ${layout.id.toLowerCase()}, huruf ${family}`,
      '',
      'CARA PAKAI',
      fetchLine,
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

  // Both lapak read the description, Tokopedia especially, so the phrase a
  // buyer types opens the paragraph instead of waiting until the terms.
  const shopeeBody = indonesianBody(
    `${title.id} — ${words.id.focus} untuk anak TK dan PAUD. File PDF siap cetak, langsung bisa diunduh setelah pembayaran.`,
    '- Unduh file PDF dari chat/pesanan, simpan di HP atau laptop.',
  );

  const tokopediaBody = indonesianBody(
    `${title.id} — ${words.id.focus} untuk anak TK dan PAUD, berisi ${worksheets} lembar kerja. Produk digital, file PDF dikirim lewat chat setelah pesanan diproses.`,
    '- Simpan file PDF dari chat Tokopedia ke HP atau laptop.',
  );

  // A pin is not a listing: it has one job, which is to send the reader to
  // the shop. Short lines, the hook first, hashtags where Pinterest reads
  // them — and every word of it inside the 500 characters Pinterest allows.
  const pinterestTags = tags.pinterest;
  const pinterestBody = [
    `${titleCase(words.en.focus)} — ${worksheets} printable pages kids can trace and colour.`,
    `Print at home as often as you like: ${shortPapers}, 300 DPI vector lines, 0.5 inch safe margin, no watermark.`,
    'Perfect for preschool, kindergarten, homeschool and busy books.',
    '',
    pinterestTags.map((tag) => `#${tag.replace(/\s+/g, '')}`).join(' '),
  ].join('\n');

  /*
   * Shopee reads the product name and nothing else — no tag field, and the
   * description does not rank. So the name is built in two halves: a head a
   * buyer can read on a phone card, then the phrases the head did not already
   * use, stopping at the target rather than at the 255 the form allows.
   */
  const shopeeHead = joinWithin(
    [
      // Shopee's own guidance is Merek + Jenis Produk + Spesifikasi, so the
      // brand and the pack's name are one unit: the thing being sold. The
      // phrase buyers type comes next, and the spec only if it does not end
      // up repeating a number the name already carries.
      brand ? `${brand} - ${title.id}` : title.id,
      titleCase(words.id.focus),
      `${worksheets} Lembar Kerja PDF ${shortPapers}`,
    ],
    100,
    ' - ',
  );
  const shopeeTitle = [
    shopeeHead,
    ...keywordTail(
      shopeeHead,
      words.id,
      (spec.shopee.titleTarget ?? spec.shopee.titleMax) - shopeeHead.length,
    ).map(titleCase),
  ]
    .join(' | ')
    .slice(0, spec.shopee.titleMax);

  const drafts: Record<MarketSpec['id'], { title: string; body: string; tags: string[] }> = {
    etsy: {
      title: etsyTitle,
      body: etsyBody,
      tags: tags.etsy,
    },
    tpt: {
      title: joinWithin(
        [title.en, titleCase(words.en.focus), 'Preschool and Kindergarten'],
        spec.tpt.titleMax,
      ),
      body: tptBody,
      tags: tags.tpt,
    },
    gumroad: {
      // Discover ranks on category and sales, so the name is kept short and
      // legible rather than loaded: the phrase once, the page count, done.
      title: joinWithin(
        [title.en, titleCase(words.en.focus), `${worksheets} Printable Pages`],
        spec.gumroad.titleMax,
      ),
      body: gumroadBody,
      tags: tags.gumroad,
    },
    shopee: {
      title: shopeeTitle,
      body: shopeeBody,
      tags: tags.shopee,
    },
    tokopedia: {
      // Seventy characters is not room to be clever: the phrase buyers type,
      // the pack's own name, and the format. Paper sizes go to the body.
      title: joinWithin(
        [title.id, titleCase(words.id.focus), `PDF ${worksheets} Halaman`],
        spec.tokopedia.titleMax,
      ),
      body: tokopediaBody,
      tags: tags.tokopedia,
    },
    pinterest: {
      title: joinWithin(
        [titleCase(words.en.focus), `${worksheets} Printable Pages`, 'Preschool and Homeschool'],
        spec.pinterest.titleMax,
      ),
      body: pinterestBody,
      tags: pinterestTags,
    },
  };

  // Tab order on screen, folder order in the ZIP and the order of this list
  // are all the same one: whatever MARKETS says.
  return MARKETS.map((market) => ({
    market: market.id,
    label: market.label,
    language: market.language,
    limits: market.note,
    bodyMax: market.bodyMax,
    focus: words[market.language].focus,
    seo: SEO_NOTE[market.id],
    ...drafts[market.id],
  }));
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
    'KATA KUNCI UTAMA / FOCUS KEYWORD',
    copy.focus,
    copy.seo,
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
