import type { Cmyk, PaletteId } from './types';

/**
 * Colour lives in exactly two places: the cover page and the listing images.
 * Every worksheet stays K-only, because that is what keeps a page one plate
 * on press, clean in a photocopier and cheap in a home printer.
 *
 * Values are CMYK, not RGB, so the same numbers go into the PDF as ink and
 * into the screen as an approximation — never the other way round.
 */
export interface Palette {
  id: PaletteId;
  label: string;
  note: string;
  /** Tinted card behind the cover; null keeps the paper white. */
  card: Cmyk | null;
  headline: Cmyk;
  brand: Cmyk;
  body: Cmyk;
  rule: Cmyk;
  /** Dots scattered around the cover and the listing images. */
  confetti: Cmyk[];
  /** Fills for sample characters, so a cover shows letters already coloured. */
  letters: Cmyk[];
}

const MONO_BODY: Cmyk = [0, 0, 0, 0.45];

export const PALETTES: Record<PaletteId, Palette> = {
  mono: {
    id: 'mono',
    label: 'Hitam Putih',
    note: 'Tanpa warna sama sekali, K100 di semua halaman',
    card: null,
    headline: [0, 0, 0, 1],
    brand: [0, 0, 0, 0.45],
    body: MONO_BODY,
    rule: [0, 0, 0, 0.22],
    confetti: [],
    letters: [],
  },
  crayon: {
    id: 'crayon',
    label: 'Krayon',
    note: 'Merah, kuning, biru — cerah seperti buku mewarnai',
    card: [0.02, 0.02, 0.1, 0],
    headline: [0.9, 0.6, 0, 0.12],
    brand: [0.05, 0.85, 0.85, 0],
    body: [0.1, 0.05, 0, 0.55],
    rule: [0.25, 0.12, 0, 0.1],
    confetti: [
      [0, 0.82, 0.85, 0],
      [0, 0.2, 0.92, 0],
      [0.8, 0.35, 0, 0],
      [0.65, 0, 0.85, 0],
      [0.55, 0.75, 0, 0],
    ],
    letters: [
      [0, 0.12, 0.72, 0],
      [0.45, 0.12, 0, 0],
      [0, 0.45, 0.4, 0],
    ],
  },
  pastel: {
    id: 'pastel',
    label: 'Pastel',
    note: 'Warna lembut, cocok untuk anak usia dini',
    card: [0.02, 0.01, 0.05, 0],
    headline: [0.55, 0.55, 0, 0.4],
    brand: [0.05, 0.5, 0.22, 0],
    body: [0.08, 0.06, 0, 0.5],
    rule: [0.15, 0.12, 0, 0.08],
    confetti: [
      [0, 0.32, 0.14, 0],
      [0.35, 0, 0.28, 0],
      [0.35, 0.1, 0, 0],
      [0, 0.06, 0.4, 0],
      [0.25, 0.3, 0, 0],
    ],
    letters: [
      [0, 0.22, 0.1, 0],
      [0.26, 0, 0.2, 0],
      [0, 0.05, 0.3, 0],
    ],
  },
  sunset: {
    id: 'sunset',
    label: 'Senja',
    note: 'Jingga hangat dan teal, kontras tinggi di listing',
    card: [0, 0.05, 0.12, 0],
    headline: [0.25, 0.85, 0.5, 0.25],
    brand: [0, 0.7, 0.85, 0],
    body: [0.05, 0.15, 0.15, 0.55],
    rule: [0, 0.2, 0.25, 0.08],
    confetti: [
      [0, 0.62, 0.6, 0],
      [0, 0.35, 0.9, 0],
      [0.35, 0.8, 0.2, 0.05],
      [0.7, 0.15, 0.35, 0],
      [0, 0.15, 0.45, 0],
    ],
    letters: [
      [0, 0.28, 0.62, 0],
      [0, 0.42, 0.35, 0],
      [0.42, 0.08, 0.2, 0],
    ],
  },
};

export const PALETTE_ORDER: PaletteId[] = ['crayon', 'pastel', 'sunset', 'mono'];

/** The naive CMYK to RGB conversion every screen preview of print uses. */
export function cmykToHex([c, m, y, k]: Cmyk): string {
  const channel = (value: number) =>
    Math.round(255 * (1 - Math.min(1, Math.max(0, value))) * (1 - Math.min(1, Math.max(0, k))));
  const hex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${hex(channel(c))}${hex(channel(m))}${hex(channel(y))}`;
}

/** Colours for the palette chip in the settings panel. */
export function swatches(id: PaletteId): string[] {
  const palette = PALETTES[id];
  const source = palette.confetti.length ? palette.confetti : [palette.headline, palette.body, palette.rule];
  return source.slice(0, 4).map(cmykToHex);
}
