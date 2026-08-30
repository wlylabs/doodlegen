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
  page: 'classic' | 'poster' | 'showcase' | 'minimal';
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
}

export const COVER_STYLES: Record<CoverStyleId, CoverStyle> = {
  classic: {
    id: 'classic',
    label: 'Klasik',
    note: 'Judul di tengah, tiga contoh berjajar, spesifikasi di kaki',
    page: 'classic',
    samples: 3,
    decoration: 'full',
    sheets: 'fan',
  },
  poster: {
    id: 'poster',
    label: 'Poster',
    note: 'Satu karakter besar memenuhi halaman, judul di bawahnya',
    page: 'poster',
    samples: 1,
    decoration: 'full',
    sheets: 'hero',
  },
  showcase: {
    id: 'showcase',
    label: 'Etalase',
    note: 'Empat contoh dalam kisi, judul rata kiri di bawah',
    page: 'showcase',
    samples: 4,
    decoration: 'card',
    sheets: 'grid',
  },
  minimal: {
    id: 'minimal',
    label: 'Minimalis',
    note: 'Tipografi saja di atas kertas polos, tanpa warna latar',
    page: 'minimal',
    samples: 0,
    decoration: 'none',
    sheets: 'row',
  },
};

export const COVER_STYLE_ORDER: CoverStyleId[] = ['classic', 'poster', 'showcase', 'minimal'];

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
