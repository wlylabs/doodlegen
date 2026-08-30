import type { CoverStyleId } from './types';

/**
 * A cover is the one page a buyer sees before they pay, so it is the one
 * page that has to be a choice. The rest of the pack is fixed by the print
 * spec; this is where a shop gets to look like itself.
 *
 * Each style is a complete composition, not a switch on a single detail:
 * the page layout, how many real characters it shows, and how the listing
 * images arrange their sheet mockups all move together.
 */
export interface CoverStyle {
  id: CoverStyleId;
  label: string;
  note: string;
  /** How the cover page itself is composed. */
  page:
    | 'classic'
    | 'poster'
    | 'showcase'
    | 'minimal'
    | 'bubble'
    | 'burst'
    | 'banner'
    | 'frame'
    | 'sticker'
    | 'rainbow'
    | 'book'
    | 'workbook';
  /** How many real characters from the set the cover puts on show. */
  samples: number;
  /**
   * Tinted card and confetti come from the palette; a style may decline
   * them. `none` prints the cover on bare paper whatever the palette says,
   * which is what an ink-light or a plain-paper shop wants.
   */
  decoration: 'full' | 'card' | 'none';
  /** How the listing images stack the sheet mockups. */
  sheets: 'fan' | 'hero' | 'grid' | 'row';
  /**
   * Floods the whole page with the palette's saturated ground instead of
   * tinting it. This is the difference between a cover that whispers its
   * colour and one that reads across a marketplace grid at thumbnail size.
   * A palette with no ground — "Hitam Putih" — ignores it.
   */
  ground: boolean;
  /**
   * Spells the title out one letter at a time, cycling the palette's letter
   * ramp. It is the single loudest thing a children's cover can do, so it is
   * a per-style choice rather than a palette-wide one.
   */
  rainbowTitle: boolean;
}

export const COVER_STYLES: Record<CoverStyleId, CoverStyle> = {
  classic: {
    id: 'classic',
    label: 'Klasik',
    note: 'Judul di tengah, tiga contoh berjajar, nama toko di kaki',
    page: 'classic',
    samples: 3,
    decoration: 'full',
    sheets: 'fan',
    ground: false,
    rainbowTitle: false,
  },
  poster: {
    id: 'poster',
    label: 'Poster',
    note: 'Satu karakter besar memenuhi halaman, judul di bawahnya',
    page: 'poster',
    samples: 1,
    decoration: 'full',
    sheets: 'hero',
    ground: false,
    rainbowTitle: false,
  },
  showcase: {
    id: 'showcase',
    label: 'Etalase',
    note: 'Empat contoh dalam kisi, judul rata kiri di bawah',
    page: 'showcase',
    samples: 4,
    decoration: 'card',
    sheets: 'grid',
    ground: false,
    rainbowTitle: false,
  },
  minimal: {
    id: 'minimal',
    label: 'Minimalis',
    note: 'Tipografi saja di atas kertas polos, tanpa warna latar',
    page: 'minimal',
    samples: 0,
    decoration: 'none',
    sheets: 'row',
    ground: false,
    rainbowTitle: false,
  },
  bubble: {
    id: 'bubble',
    label: 'Balon Kata',
    note: 'Judul pelangi di dalam balon besar, contoh berjajar di bawahnya',
    page: 'bubble',
    samples: 3,
    decoration: 'full',
    sheets: 'fan',
    ground: true,
    rainbowTitle: true,
  },
  burst: {
    id: 'burst',
    label: 'Kilau',
    note: 'Sinar bintang di belakang panel awan, empat contoh di bawah',
    page: 'burst',
    samples: 4,
    decoration: 'full',
    sheets: 'grid',
    ground: true,
    rainbowTitle: true,
  },
  banner: {
    id: 'banner',
    label: 'Jalan Warna',
    note: 'Pita berkelok melintasi halaman, contoh menumpang di atasnya',
    page: 'banner',
    samples: 3,
    decoration: 'full',
    sheets: 'row',
    ground: false,
    rainbowTitle: true,
  },
  frame: {
    id: 'frame',
    label: 'Bingkai Ceria',
    note: 'Motif bintang dan titik memenuhi halaman, judul di panel tengah',
    page: 'frame',
    samples: 3,
    decoration: 'full',
    sheets: 'grid',
    ground: false,
    rainbowTitle: true,
  },
  sticker: {
    id: 'sticker',
    label: 'Stiker',
    note: 'Empat contoh sebagai kartu stiker, judul di atas pita selotip',
    page: 'sticker',
    samples: 4,
    decoration: 'full',
    sheets: 'grid',
    ground: true,
    rainbowTitle: true,
  },
  book: {
    id: 'book',
    label: 'Buku Toko',
    note: 'Judul di panel kepala, gambar di jendela tengah, penerbit di kaki',
    page: 'book',
    // A pair: one letter already coloured, one still dotted. Two fill a wide
    // plate at a size that reads across a shop, where three would not.
    samples: 2,
    // Flooded colour, but no confetti: a shelf book carries its colour as a
    // ground, not as scattered dots.
    decoration: 'card',
    sheets: 'hero',
    ground: true,
    rainbowTitle: false,
  },
  workbook: {
    id: 'workbook',
    label: 'Buku Latihan',
    note: 'Bingkai garis, judul di kepala, empat contoh di plat tengah, penerbit di kaki',
    page: 'workbook',
    // Two by two. A row of letters can only ever be a third of the page tall;
    // a grid fills the plate the way a workbook cover is meant to be filled.
    samples: 4,
    decoration: 'card',
    sheets: 'grid',
    ground: false,
    rainbowTitle: false,
  },
  rainbow: {
    id: 'rainbow',
    label: 'Pelangi',
    note: 'Busur pelangi dan awan di kepala halaman, judul tepat di bawahnya',
    page: 'rainbow',
    samples: 3,
    decoration: 'full',
    sheets: 'fan',
    ground: false,
    rainbowTitle: true,
  },
};

export const COVER_STYLE_ORDER: CoverStyleId[] = [
  'book',
  'workbook',
  'bubble',
  'burst',
  'rainbow',
  'banner',
  'sticker',
  'frame',
  'classic',
  'poster',
  'showcase',
  'minimal',
];

/**
 * The two compositions built to the convention a shelf book follows rather
 * than the one a coloring book does: the title in a masthead at the head of
 * the page, the art in one window under it, and the imprint alone at the
 * foot. Kept as its own group because that is the choice a seller is making
 * — "looks like a book" against "looks like a coloring book".
 */
export const BOOK_STYLES: CoverStyleId[] = ['book', 'workbook'];

/**
 * The loud half of the catalogue. Kept as a list rather than derived from a
 * flag so the UI can group them under a heading a seller understands.
 */
export const COLOURFUL_STYLES: CoverStyleId[] = [
  'bubble',
  'burst',
  'rainbow',
  'banner',
  'sticker',
  'frame',
];

/**
 * The compositions that run their art right up to the card's edge — a balloon
 * bulging, a road leaving the page, a book's masthead spanning the full
 * width. They need the quiet band inside the trim whether or not the palette
 * paid for a card, or their overhang lands in the 0.5 inch safe margin.
 */
export const BANDED_STYLES: CoverStyleId[] = [...COLOURFUL_STYLES, ...BOOK_STYLES];

/** Evenly spaced, distinct characters: an honest sample of the whole set. */
export function coverSamples(characters: string[], count: number): string[] {
  const picks: string[] = [];
  const wanted = Math.min(count, characters.length);
  for (let index = 0; index < wanted; index += 1) {
    const at = wanted === 1 ? 0 : Math.round((index * (characters.length - 1)) / (wanted - 1));
    const text = characters[at];
    if (text && !picks.includes(text)) picks.push(text);
  }
  return picks;
}

/** How many sheet mockups a listing image draws for a given style. */
export function sheetCount(style: CoverStyle): number {
  if (style.sheets === 'hero') return 1;
  if (style.sheets === 'grid') return 4;
  return 3;
}
