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
    | 'custom';
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
    note: 'Judul di tengah, tiga contoh berjajar, garis merek di kepala',
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
  custom: {
    id: 'custom',
    label: 'Custom',
    note: 'Susun sendiri: seret judul, huruf, dan bentuk di kanvas sampul',
    page: 'custom',
    // A custom cover places its own samples; these two numbers are what the
    // listing images fall back on, and they are the arrangement that suits an
    // unknown layout best — a fan of three sheets, no assumptions.
    samples: 3,
    decoration: 'full',
    sheets: 'fan',
    ground: true,
    rainbowTitle: true,
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
  'custom',
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
