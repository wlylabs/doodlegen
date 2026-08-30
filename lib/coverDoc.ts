import type { Cmyk, CoverStyleId } from './types';
import type { Palette } from './palette';

/**
 * The cover a seller draws themselves.
 *
 * The ten stock compositions each decide everything for you — where the
 * title sits, how many samples show, what the ground is. This is the other
 * half of that offer: a page laid out element by element, dragged into place
 * on the real page, in the same units the PDF is written in.
 *
 * Two rules keep it a *print* editor rather than a screen one:
 *
 * 1. Geometry is stored as a fraction of the cover's safe box, never in
 *    points. The same document then prints identically on A4 and US Letter,
 *    and survives a change of margin.
 * 2. Colour is stored as a role in the palette — `headline`, `ink3` — not as
 *    a value. Swapping the palette recolours a custom cover the way it
 *    recolours a stock one. A seller who wants one exact colour can still
 *    give a hex, and it is converted to CMYK on the way to the page.
 */

/** Where a text element gets its words. */
export type CoverTextSource = 'title' | 'brand' | 'tagline' | 'custom';

export type CoverAlign = 'left' | 'center' | 'right';

/** The shape library, all of it drawn from the same doodle paths the stock covers use. */
export type CoverShapeId =
  | 'rect'
  | 'ellipse'
  | 'blob'
  | 'cloud'
  | 'star'
  | 'sparkle'
  | 'burst'
  | 'arch'
  | 'ribbon'
  | 'tape';

/** What the page itself is printed on. */
export type CoverGround = 'paper' | 'card' | 'ground';

/**
 * A colour named by its job. `ink1`–`ink6` walk the palette's letter ramp,
 * which is the same ramp a rainbow title is spelled out in.
 */
export type CoverInkId =
  | 'headline'
  | 'brand'
  | 'body'
  | 'panel'
  | 'paper'
  | 'ground'
  | 'ink1'
  | 'ink2'
  | 'ink3'
  | 'ink4'
  | 'ink5'
  | 'ink6';

export const COVER_INKS: { id: CoverInkId; label: string }[] = [
  { id: 'headline', label: 'Judul' },
  { id: 'brand', label: 'Merek' },
  { id: 'body', label: 'Teks' },
  { id: 'panel', label: 'Panel' },
  { id: 'paper', label: 'Kertas' },
  { id: 'ground', label: 'Latar' },
  { id: 'ink1', label: 'Warna 1' },
  { id: 'ink2', label: 'Warna 2' },
  { id: 'ink3', label: 'Warna 3' },
  { id: 'ink4', label: 'Warna 4' },
  { id: 'ink5', label: 'Warna 5' },
  { id: 'ink6', label: 'Warna 6' },
];

const INK_IDS = new Set<string>(COVER_INKS.map((ink) => ink.id));

export interface CoverElement {
  id: string;
  kind: 'text' | 'sample' | 'shape';
  /**
   * The element's box as a fraction of the cover's safe area, origin at the
   * top-left the way every editor on screen counts, flipped once on the way
   * into the page.
   */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Text: where the words come from, and the words themselves when custom. */
  source?: CoverTextSource;
  text?: string;
  align?: CoverAlign;
  /** Spells the line out one letter at a time down the palette's ramp. */
  rainbow?: boolean;
  /** Sample: which character of the set, by index; it wraps. */
  sample?: number;
  /** Sample: drawn as a tracing dotted line rather than a solid contour. */
  trace?: boolean;
  shape?: CoverShapeId;
  /** Shape: outlined in the headline colour, which is what reads as a sticker. */
  outline?: boolean;
  /** A `CoverInkId`, or a `#rrggbb` the seller picked themselves. */
  color?: string;
}

export interface CoverDoc {
  ground: CoverGround;
  /** The ring of dots around the border, as the stock covers draw it. */
  confetti: boolean;
  /** Bottom of the stack first, the way they are painted. */
  elements: CoverElement[];
}

/** Nothing may be dragged out of the safe box, and nothing may vanish. */
export const MIN_ELEMENT = 0.04;
export const MAX_ELEMENTS = 24;
const MAX_TEXT = 140;

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Keeps a box inside the page and above the minimum size, in one pass. */
export function clampElement<T extends { x: number; y: number; w: number; h: number }>(box: T): T {
  const w = Math.min(1, Math.max(MIN_ELEMENT, box.w));
  const h = Math.min(1, Math.max(MIN_ELEMENT, box.h));
  return {
    ...box,
    w,
    h,
    x: Math.min(1 - w, Math.max(0, box.x)),
    y: Math.min(1 - h, Math.max(0, box.y)),
  };
}

let counter = 0;

/** Ids only have to be unique inside one document, so a counter is enough. */
export function coverElementId(): string {
  counter += 1;
  return `e${Date.now().toString(36)}${counter.toString(36)}`;
}

/** What each palette element starts as when it is dropped on the page. */
export const ELEMENT_SEEDS: {
  id: string;
  label: string;
  group: 'text' | 'sample' | 'shape';
  make: () => Omit<CoverElement, 'id'>;
}[] = [
  {
    id: 'title',
    label: 'Judul produk',
    group: 'text',
    make: () => ({ kind: 'text', source: 'title', align: 'center', rainbow: true, color: 'headline', x: 0.08, y: 0.12, w: 0.84, h: 0.2 }),
  },
  {
    id: 'brand',
    label: 'Nama toko',
    group: 'text',
    make: () => ({ kind: 'text', source: 'brand', align: 'center', color: 'brand', x: 0.2, y: 0.04, w: 0.6, h: 0.05 }),
  },
  {
    id: 'tagline',
    label: 'Tagline',
    group: 'text',
    make: () => ({ kind: 'text', source: 'tagline', align: 'center', color: 'body', x: 0.14, y: 0.34, w: 0.72, h: 0.06 }),
  },
  {
    id: 'text',
    label: 'Teks bebas',
    group: 'text',
    make: () => ({ kind: 'text', source: 'custom', text: 'Teks baru', align: 'center', color: 'body', x: 0.25, y: 0.46, w: 0.5, h: 0.08 }),
  },
  {
    id: 'sample',
    label: 'Huruf contoh',
    group: 'sample',
    make: () => ({ kind: 'sample', sample: 0, x: 0.34, y: 0.5, w: 0.32, h: 0.24 }),
  },
  {
    id: 'trace',
    label: 'Huruf titik-titik',
    group: 'sample',
    make: () => ({ kind: 'sample', sample: 1, trace: true, x: 0.34, y: 0.5, w: 0.32, h: 0.24 }),
  },
  {
    id: 'rect',
    label: 'Kotak',
    group: 'shape',
    make: () => ({ kind: 'shape', shape: 'rect', color: 'panel', outline: true, x: 0.12, y: 0.1, w: 0.76, h: 0.28 }),
  },
  {
    id: 'ellipse',
    label: 'Lingkaran',
    group: 'shape',
    make: () => ({ kind: 'shape', shape: 'ellipse', color: 'ink1', x: 0.34, y: 0.34, w: 0.32, h: 0.24 }),
  },
  {
    id: 'blob',
    label: 'Balon',
    group: 'shape',
    make: () => ({ kind: 'shape', shape: 'blob', color: 'panel', outline: true, x: 0.1, y: 0.08, w: 0.8, h: 0.34 }),
  },
  {
    id: 'cloud',
    label: 'Awan',
    group: 'shape',
    make: () => ({ kind: 'shape', shape: 'cloud', color: 'panel', outline: true, x: 0.14, y: 0.1, w: 0.72, h: 0.26 }),
  },
  {
    id: 'star',
    label: 'Bintang',
    group: 'shape',
    make: () => ({ kind: 'shape', shape: 'star', color: 'ink2', x: 0.08, y: 0.06, w: 0.14, h: 0.1 }),
  },
  {
    id: 'sparkle',
    label: 'Kilau',
    group: 'shape',
    make: () => ({ kind: 'shape', shape: 'sparkle', color: 'ink3', x: 0.78, y: 0.06, w: 0.14, h: 0.1 }),
  },
  {
    id: 'burst',
    label: 'Sinar',
    group: 'shape',
    make: () => ({ kind: 'shape', shape: 'burst', color: 'ink4', x: 0.1, y: 0.08, w: 0.8, h: 0.56 }),
  },
  {
    id: 'arch',
    label: 'Pelangi',
    group: 'shape',
    make: () => ({ kind: 'shape', shape: 'arch', color: 'ink1', x: 0.2, y: 0.06, w: 0.6, h: 0.22 }),
  },
  {
    id: 'ribbon',
    label: 'Pita',
    group: 'shape',
    make: () => ({ kind: 'shape', shape: 'ribbon', color: 'ink5', x: 0.04, y: 0.62, w: 0.92, h: 0.2 }),
  },
  {
    id: 'tape',
    label: 'Selotip',
    group: 'shape',
    make: () => ({ kind: 'shape', shape: 'tape', color: 'ink2', x: 0.3, y: 0.06, w: 0.4, h: 0.08 }),
  },
];

export function makeElement(seedId: string): CoverElement | null {
  const seed = ELEMENT_SEEDS.find((item) => item.id === seedId);
  if (!seed) return null;
  return clampElement({ id: coverElementId(), ...seed.make() });
}

/**
 * Ready-made layouts to open the studio on. A blank page is honest but
 * unhelpful: nobody wants to place a title from nothing, and every one of
 * these is a cover you could ship as it stands.
 */
export interface CoverTemplate {
  id: string;
  label: string;
  note: string;
  doc: CoverDoc;
}

function element(seedId: string, patch: Partial<CoverElement>): CoverElement {
  const base = makeElement(seedId);
  if (!base) throw new Error(`Elemen sampul tidak dikenal: ${seedId}`);
  return clampElement({ ...base, ...patch });
}

export const COVER_TEMPLATES: CoverTemplate[] = [
  {
    id: 'balon',
    label: 'Balon judul',
    note: 'Judul pelangi di dalam balon, tiga huruf contoh di bawahnya',
    doc: {
      ground: 'ground',
      confetti: true,
      elements: [
        element('brand', { y: 0.035, h: 0.045 }),
        element('blob', { x: 0.06, y: 0.1, w: 0.88, h: 0.34 }),
        element('title', { x: 0.14, y: 0.16, w: 0.72, h: 0.2 }),
        element('star', { x: 0.03, y: 0.11, w: 0.12, h: 0.09 }),
        // On a flooded page a pale mark disappears, so the sparkle takes a
        // colour from the far end of the ramp rather than the near one.
        element('sparkle', { x: 0.85, y: 0.33, w: 0.12, h: 0.09, color: 'ink5' }),
        element('tagline', { y: 0.5, h: 0.05 }),
        element('sample', { sample: 0, x: 0.05, y: 0.6, w: 0.28, h: 0.28 }),
        element('sample', { sample: 1, x: 0.36, y: 0.6, w: 0.28, h: 0.28 }),
        element('trace', { sample: 2, x: 0.67, y: 0.6, w: 0.28, h: 0.28 }),
      ],
    },
  },
  {
    id: 'poster',
    label: 'Poster satu huruf',
    note: 'Satu huruf besar memenuhi halaman, judul di kakinya',
    doc: {
      ground: 'card',
      confetti: false,
      elements: [
        element('brand', { y: 0.04, h: 0.04 }),
        element('sample', { sample: 0, x: 0.12, y: 0.12, w: 0.76, h: 0.52 }),
        element('title', { x: 0.08, y: 0.7, w: 0.84, h: 0.16, rainbow: false }),
        element('tagline', { y: 0.89, h: 0.05 }),
      ],
    },
  },
  {
    id: 'etalase',
    label: 'Etalase empat',
    note: 'Empat huruf dalam kisi, judul di panel bawah',
    doc: {
      ground: 'card',
      confetti: true,
      elements: [
        element('brand', { y: 0.035, h: 0.04 }),
        element('sample', { sample: 0, x: 0.09, y: 0.11, w: 0.38, h: 0.26 }),
        element('sample', { sample: 1, x: 0.53, y: 0.11, w: 0.38, h: 0.26 }),
        element('sample', { sample: 2, x: 0.09, y: 0.41, w: 0.38, h: 0.26 }),
        element('trace', { sample: 3, x: 0.53, y: 0.41, w: 0.38, h: 0.26 }),
        element('rect', { x: 0.05, y: 0.71, w: 0.9, h: 0.25 }),
        element('title', { x: 0.1, y: 0.745, w: 0.8, h: 0.13, rainbow: false }),
        element('tagline', { y: 0.9, h: 0.045 }),
      ],
    },
  },
  {
    id: 'kosong',
    label: 'Halaman kosong',
    note: 'Mulai dari nol: hanya judul dan nama toko',
    doc: {
      ground: 'paper',
      confetti: false,
      elements: [
        element('brand', { y: 0.06, h: 0.045 }),
        element('title', { x: 0.1, y: 0.36, w: 0.8, h: 0.18, rainbow: false }),
      ],
    },
  },
];

export function defaultCoverDoc(): CoverDoc {
  return cloneCoverDoc(COVER_TEMPLATES[0].doc);
}

export function cloneCoverDoc(doc: CoverDoc): CoverDoc {
  return { ...doc, elements: doc.elements.map((element) => ({ ...element })) };
}

const GROUNDS: CoverGround[] = ['paper', 'card', 'ground'];
const SHAPES: CoverShapeId[] = [
  'rect',
  'ellipse',
  'blob',
  'cloud',
  'star',
  'sparkle',
  'burst',
  'arch',
  'ribbon',
  'tape',
];
const SOURCES: CoverTextSource[] = ['title', 'brand', 'tagline', 'custom'];
const ALIGNS: CoverAlign[] = ['left', 'center', 'right'];

const HEX = /^#[0-9a-f]{6}$/i;

/** True for a value the page can actually paint: a palette role or a hex. */
export function isCoverInk(value: unknown): value is string {
  return typeof value === 'string' && (INK_IDS.has(value) || HEX.test(value));
}

function number01(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? clamp01(value) : fallback;
}

/**
 * A document out of a link or out of storage is untrusted input. Every field
 * is checked against the same lists the editor offers and anything else is
 * dropped, the same way `sanitizeConfig` treats the rest of the setup.
 */
export function sanitizeCoverDoc(raw: unknown): CoverDoc | null {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw as Record<string, unknown>;
  const list = Array.isArray(input.elements) ? input.elements : [];
  const elements: CoverElement[] = [];

  for (const item of list.slice(0, MAX_ELEMENTS)) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;
    const kind = raw.kind;
    if (kind !== 'text' && kind !== 'sample' && kind !== 'shape') continue;

    const element: CoverElement = clampElement({
      id: typeof raw.id === 'string' ? raw.id.slice(0, 24) : coverElementId(),
      kind,
      x: number01(raw.x, 0.1),
      y: number01(raw.y, 0.1),
      w: number01(raw.w, 0.3),
      h: number01(raw.h, 0.15),
    });

    if (isCoverInk(raw.color)) element.color = raw.color;

    if (kind === 'text') {
      element.source = SOURCES.includes(raw.source as CoverTextSource)
        ? (raw.source as CoverTextSource)
        : 'custom';
      if (typeof raw.text === 'string') element.text = raw.text.slice(0, MAX_TEXT);
      element.align = ALIGNS.includes(raw.align as CoverAlign) ? (raw.align as CoverAlign) : 'center';
      if (raw.rainbow === true) element.rainbow = true;
    }

    if (kind === 'sample') {
      const index = typeof raw.sample === 'number' && Number.isFinite(raw.sample) ? raw.sample : 0;
      element.sample = Math.max(0, Math.min(999, Math.round(index)));
      if (raw.trace === true) element.trace = true;
    }

    if (kind === 'shape') {
      if (!SHAPES.includes(raw.shape as CoverShapeId)) continue;
      element.shape = raw.shape as CoverShapeId;
      if (raw.outline === true) element.outline = true;
    }

    elements.push(element);
  }

  return {
    ground: GROUNDS.includes(input.ground as CoverGround) ? (input.ground as CoverGround) : 'paper',
    confetti: input.confetti === true,
    elements,
  };
}

const HEX_TO_CMYK_CACHE = new Map<string, Cmyk>();

/**
 * A screen colour, converted the naive way — which is the right way here.
 * The seller picked what they saw, so the press is asked for the nearest ink
 * mix to it rather than for a profiled conversion nobody could preview.
 */
export function hexToCmyk(hex: string): Cmyk {
  const cached = HEX_TO_CMYK_CACHE.get(hex);
  if (cached) return cached;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const k = 1 - Math.max(r, g, b);
  const rest = 1 - k;
  const value: Cmyk =
    rest <= 0.0001
      ? [0, 0, 0, 1]
      : [(1 - r - k) / rest, (1 - g - k) / rest, (1 - b - k) / rest, k];
  const rounded: Cmyk = [
    Number(value[0].toFixed(3)),
    Number(value[1].toFixed(3)),
    Number(value[2].toFixed(3)),
    Number(value[3].toFixed(3)),
  ];
  HEX_TO_CMYK_CACHE.set(hex, rounded);
  return rounded;
}

/** Paper, as an ink: nothing on the plate at all. */
const BLANK: Cmyk = [0, 0, 0, 0];

/**
 * A stored colour resolved against the palette in force. A role that the
 * palette has nothing for — a ground on "Hitam Putih", a fifth letter colour
 * on a three-colour ramp — falls back rather than disappearing.
 */
export function resolveCoverInk(palette: Palette, value: string | undefined, fallback: Cmyk): Cmyk {
  if (!value) return fallback;
  if (HEX.test(value)) return hexToCmyk(value);
  switch (value) {
    case 'headline':
      return palette.headline;
    case 'brand':
      return palette.brand;
    case 'body':
      return palette.body;
    case 'panel':
      return palette.card ? palette.panel : BLANK;
    case 'paper':
      return BLANK;
    case 'ground':
      return palette.ground ?? palette.card ?? BLANK;
    default: {
      const ramp = palette.letters.length ? palette.letters : palette.confetti;
      if (!ramp.length) return palette.headline;
      const index = Number(value.replace('ink', '')) - 1;
      return ramp[index % ramp.length] ?? palette.headline;
    }
  }
}

/** The custom cover is a style like any other, so the rest of the app can switch on it. */
export const CUSTOM_COVER_STYLE: CoverStyleId = 'custom';
