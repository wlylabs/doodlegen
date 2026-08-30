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
  /**
   * The saturated ground the colourful compositions flood a whole cover
   * with, where `card` is only a tint of the paper. Null where a palette has
   * no business shouting — the styles that ask for a ground fall back to the
   * card, which is what keeps "Hitam Putih" honest.
   */
  ground: Cmyk | null;
  /** The light panel that carries type once it is sitting on the ground. */
  panel: Cmyk;
  /** Type that has to read against `ground` rather than against paper. */
  onGround: Cmyk;
  headline: Cmyk;
  brand: Cmyk;
  body: Cmyk;
  rule: Cmyk;
  /** Dots scattered around the cover and the listing images. */
  confetti: Cmyk[];
  /**
   * Fills for sample characters, so a cover shows letters already coloured —
   * and, on the styles that ask for it, the ramp a title is spelled out in,
   * one colour per letter. Long enough that a short word never repeats.
   */
  letters: Cmyk[];
}

const MONO_BODY: Cmyk = [0, 0, 0, 0.45];

export const PALETTES: Record<PaletteId, Palette> = {
  mono: {
    id: 'mono',
    label: 'Hitam Putih',
    note: 'Tanpa warna sama sekali, K100 di semua halaman',
    card: null,
    ground: null,
    panel: [0, 0, 0, 0],
    onGround: [0, 0, 0, 0.85],
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
    ground: [0, 0.18, 0.88, 0],
    panel: [0, 0.01, 0.05, 0],
    onGround: [0.85, 0.6, 0, 0.35],
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
      [0, 0.82, 0.85, 0],
      [0.8, 0.35, 0, 0],
      [0, 0.2, 0.92, 0],
      [0.65, 0, 0.85, 0],
      [0.55, 0.75, 0, 0],
      [0, 0.45, 0.4, 0],
    ],
  },
  pastel: {
    id: 'pastel',
    label: 'Pastel',
    note: 'Warna lembut, cocok untuk anak usia dini',
    card: [0.02, 0.01, 0.05, 0],
    ground: [0.1, 0.26, 0.06, 0],
    panel: [0.01, 0.01, 0.03, 0],
    onGround: [0.35, 0.55, 0.2, 0.35],
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
    // Deep enough to survive a near-white panel — a pastel title that no one
    // can read is not softness, it is a missing title — and still soft
    // enough to be why someone picked this palette.
    letters: [
      [0, 0.55, 0.32, 0.04],
      [0.52, 0, 0.42, 0.06],
      [0.55, 0.3, 0, 0.04],
      [0, 0.3, 0.7, 0.06],
      [0.42, 0.5, 0, 0.04],
      [0, 0.48, 0.38, 0.04],
    ],
  },
  sunset: {
    id: 'sunset',
    label: 'Senja',
    note: 'Jingga hangat dan teal, kontras tinggi di listing',
    card: [0, 0.05, 0.12, 0],
    ground: [0.05, 0.75, 0.82, 0.12],
    panel: [0, 0.03, 0.12, 0],
    onGround: [0, 0.05, 0.15, 0],
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
      [0.35, 0.8, 0.2, 0.05],
      [0, 0.35, 0.9, 0],
      [0.7, 0.15, 0.35, 0],
      [0, 0.62, 0.6, 0],
      [0.55, 0.25, 0, 0.05],
      [0, 0.15, 0.45, 0],
    ],
  },
  pop: {
    id: 'pop',
    label: 'Pop',
    note: 'Ungu pekat dan kuning terang, seperti sampul rak toko buku',
    card: [0, 0.05, 0.28, 0],
    ground: [0.62, 0.88, 0, 0.08],
    panel: [0, 0.04, 0.24, 0],
    onGround: [0, 0.06, 0.32, 0],
    headline: [0.62, 0.88, 0, 0.08],
    brand: [0.05, 0.9, 0.75, 0],
    body: [0.35, 0.5, 0, 0.45],
    rule: [0.3, 0.4, 0, 0.12],
    confetti: [
      [0, 0.85, 0.8, 0],
      [0.75, 0.25, 0, 0],
      [0.3, 0, 0.95, 0],
      [0, 0.35, 0.95, 0],
      [0.6, 0.85, 0, 0],
    ],
    letters: [
      [0, 0.5, 0.95, 0],
      [0, 0.85, 0.8, 0],
      [0.75, 0.25, 0, 0],
      [0.45, 0, 0.95, 0],
      [0, 0.45, 0.95, 0],
      [0.6, 0.85, 0, 0],
    ],
  },
  permen: {
    id: 'permen',
    label: 'Permen',
    note: 'Merah muda, mint, dan ungu manis untuk pasar anak perempuan',
    card: [0, 0.05, 0.02, 0],
    ground: [0.08, 0.82, 0.28, 0.04],
    panel: [0, 0.02, 0.03, 0],
    onGround: [0, 0.06, 0.03, 0],
    headline: [0.45, 0.85, 0.1, 0.15],
    brand: [0, 0.65, 0.2, 0],
    body: [0.15, 0.3, 0.05, 0.5],
    rule: [0.1, 0.25, 0, 0.1],
    confetti: [
      [0, 0.6, 0.2, 0],
      [0.5, 0, 0.25, 0],
      [0.35, 0.45, 0, 0],
      [0, 0.25, 0.75, 0],
      [0.15, 0.7, 0, 0],
    ],
    letters: [
      [0, 0.7, 0.25, 0],
      [0.55, 0, 0.3, 0],
      [0.45, 0.55, 0, 0],
      [0, 0.3, 0.8, 0],
      [0.2, 0.8, 0, 0],
      [0, 0.5, 0.55, 0],
    ],
  },
  rimba: {
    id: 'rimba',
    label: 'Rimba',
    note: 'Hijau daun dan jingga tropis, ramai tanpa jadi silau',
    card: [0.05, 0, 0.1, 0],
    ground: [0.85, 0.32, 0.95, 0.22],
    panel: [0.03, 0.02, 0.14, 0],
    onGround: [0.03, 0.02, 0.14, 0],
    headline: [0.85, 0.35, 0.9, 0.3],
    brand: [0, 0.55, 0.9, 0],
    body: [0.3, 0.1, 0.35, 0.5],
    rule: [0.25, 0.05, 0.3, 0.1],
    confetti: [
      [0.7, 0.1, 0.9, 0],
      [0, 0.5, 0.9, 0],
      [0.1, 0.75, 0.5, 0],
      [0.85, 0.4, 0.15, 0],
      [0.05, 0.15, 0.9, 0],
    ],
    letters: [
      [0, 0.5, 0.9, 0],
      [0.7, 0.1, 0.9, 0],
      [0.1, 0.75, 0.5, 0],
      [0.85, 0.4, 0.15, 0],
      [0.05, 0.15, 0.9, 0],
      [0.45, 0.7, 0, 0],
    ],
  },
};

export const PALETTE_ORDER: PaletteId[] = [
  // The default leads the row: the first chip reads as the recommended one,
  // and a default sitting sixth in the picker only looks like an accident.
  'sunset',
  'crayon',
  'pop',
  'permen',
  'rimba',
  'pastel',
  'mono',
];

/** The naive CMYK to RGB conversion every screen preview of print uses. */
export function cmykToHex([c, m, y, k]: Cmyk): string {
  const channel = (value: number) =>
    Math.round(255 * (1 - Math.min(1, Math.max(0, value))) * (1 - Math.min(1, Math.max(0, k))));
  const hex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${hex(channel(c))}${hex(channel(m))}${hex(channel(y))}`;
}

/** Relative luminance of an ink, once it has been approximated on screen. */
function luminance(color: Cmyk): number {
  const hex = cmykToHex(color);
  const channel = (at: number) => {
    const value = parseInt(hex.slice(at, at + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** The WCAG ratio between two inks, 1 (identical) to 21 (black on white). */
export function contrastRatio(a: Cmyk, b: Cmyk): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * The letters of a rainbow title, minus any that would disappear.
 *
 * A ramp is picked to look cheerful together, not to survive every backdrop
 * it might land on: the pastel ramp on a near-white balloon is a title
 * nobody can read, and a yellow letter on a yellow ground is not a design
 * choice but a missing letter. Anything without real separation is dropped,
 * and if too little survives the title falls back to one solid colour.
 */
export function readableInks(ramp: Cmyk[], backdrop: Cmyk, minimum = 2.2): Cmyk[] {
  const kept = ramp.filter((ink) => contrastRatio(ink, backdrop) >= minimum);
  return kept.length >= 2 ? kept : [];
}

/** Colours for the palette chip in the settings panel. */
export function swatches(id: PaletteId): string[] {
  const palette = PALETTES[id];
  const source = palette.confetti.length ? palette.confetti : [palette.headline, palette.body, palette.rule];
  return source.slice(0, 4).map(cmykToHex);
}
