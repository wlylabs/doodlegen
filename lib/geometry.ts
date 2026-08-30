import { renderTitle, subjectOf } from './charset';
import { COVER_STYLES, coverSamples, type CoverStyle } from './covers';
import { PALETTES, type Palette } from './palette';
import { FONTS, GRIDS, MIN_MARGIN_IN, PT_PER_INCH, STROKES } from './presets';
import { brandName, printedTitle } from './naming';
import type {
  Box,
  Cmyk,
  Config,
  GuideLine,
  LanguageId,
  LoadedFont,
  Mode,
  PagePlan,
  Placement,
  RuleDraw,
  ShapeDraw,
  TextDraw,
} from './types';
import type { PaperSpec } from './presets';

/**
 * Line weight grows with the drawn character but never runs away: a
 * full-page letter wants a heavier contour than a 4x5 tracing cell, yet
 * both must stay inside a range that prints and photocopies cleanly.
 */
function strokeFor(base: number, characterHeightPt: number): number {
  const w = base * (0.9 + characterHeightPt / 220);
  return Math.min(8, Math.max(1, Number(w.toFixed(3))));
}

function inset(box: Box, by: number): Box {
  return { x: box.x + by, y: box.y + by, w: box.w - by * 2, h: box.h - by * 2 };
}

function xHeightOf(font: LoadedFont): number {
  return font.xHeight > 0 ? font.xHeight : font.unitsPerEm * 0.5;
}

/**
 * The writing band of one particular character set, in font units.
 *
 * Using the font's own ascender/descender would waste most of a tracing row:
 * Baloo 2 reports an ascender 1.8x its cap height, so an all-uppercase sheet
 * would draw letters barely a third of the row tall. Measuring the glyphs
 * that are actually on the sheet gives a band that fills the row, while
 * staying identical from page to page so every baseline lines up.
 */
export interface Band {
  minY: number;
  maxY: number;
  /** True when the set contains descending or ascending lowercase shapes. */
  hasLowercase: boolean;
}

export function bandFor(font: LoadedFont, characters: string[]): Band {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const text of characters) {
    const box = font.layout(text).bbox;
    minY = Math.min(minY, box.minY);
    maxY = Math.max(maxY, box.maxY);
  }
  if (!Number.isFinite(minY) || !Number.isFinite(maxY) || maxY - minY <= 0) {
    minY = 0;
    maxY = font.capHeight > 0 ? font.capHeight : font.unitsPerEm * 0.7;
  }
  return { minY, maxY, hasLowercase: characters.some((t) => /[a-z]/.test(t)) };
}

/**
 * How much of a box the character may claim. Height and width are separate:
 * a tracing row wants breathing room above and below the letters, but a wide
 * pair like "Aa" should still be allowed to run close to the cell edges
 * rather than shrinking the whole row to suit.
 */
export interface Ratio {
  w: number;
  h: number;
}

/**
 * Largest font size whose *inked* bounding box fits the box. Used wherever a
 * character is on show rather than being traced, so it can push right up to
 * the safe margin.
 */
export function fillSize(font: LoadedFont, text: string, box: Box, ratio: Ratio): number {
  const run = font.layout(text);
  const w = run.bbox.maxX - run.bbox.minX;
  const h = run.bbox.maxY - run.bbox.minY;
  if (w <= 0 || h <= 0) return 0;
  return Math.min((box.w * ratio.w * font.unitsPerEm) / w, (box.h * ratio.h * font.unitsPerEm) / h);
}

/**
 * Largest font size whose writing band fits the box. Used everywhere tracing
 * happens, so "A" and "a" keep their true relative proportions and every
 * repeat sits on one shared baseline.
 */
export function metricSize(
  font: LoadedFont,
  text: string,
  box: Box,
  ratio: Ratio,
  band: Band,
): number {
  const run = font.layout(text);
  const height = band.maxY - band.minY;
  const advance = run.advanceWidth || run.bbox.maxX - run.bbox.minX;
  if (height <= 0 || advance <= 0) return 0;
  return Math.min(
    (box.h * ratio.h * font.unitsPerEm) / height,
    (box.w * ratio.w * font.unitsPerEm) / advance,
  );
}

function placeFill(
  font: LoadedFont,
  text: string,
  box: Box,
  size: number,
  mode: Mode,
  strokeBase: number,
): Placement {
  const run = font.layout(text);
  const unit = size / font.unitsPerEm;
  const inkW = (run.bbox.maxX - run.bbox.minX) * unit;
  const inkH = (run.bbox.maxY - run.bbox.minY) * unit;
  const strokeWidth = strokeFor(strokeBase, inkH);
  return {
    text,
    size,
    x: box.x + (box.w - inkW) / 2 - run.bbox.minX * unit,
    y: box.y + (box.h - inkH) / 2 - run.bbox.minY * unit,
    mode,
    strokeWidth,
    dotGap: strokeWidth * 2.5,
  };
}

function placeMetric(
  font: LoadedFont,
  text: string,
  box: Box,
  size: number,
  mode: Mode,
  strokeBase: number,
  band: Band,
): Placement {
  const run = font.layout(text);
  const unit = size / font.unitsPerEm;
  const bandH = (band.maxY - band.minY) * unit;
  const advance = (run.advanceWidth || run.bbox.maxX - run.bbox.minX) * unit;
  const bandBottom = box.y + (box.h - bandH) / 2;
  const strokeWidth = strokeFor(strokeBase, bandH);
  return {
    text,
    size,
    x: box.x + (box.w - advance) / 2,
    y: bandBottom - band.minY * unit,
    mode,
    strokeWidth,
    dotGap: strokeWidth * 2.5,
  };
}

function guidesFor(
  font: LoadedFont,
  place: Placement,
  band: Band,
  x1: number,
  x2: number,
): GuideLine[] {
  const unit = place.size / font.unitsPerEm;
  const lines: GuideLine[] = [
    { x1, x2, y: place.y + band.maxY * unit, kind: 'cap' },
    { x1, x2, y: place.y, kind: 'base' },
  ];
  // A midline only means something once lowercase x-height is in play.
  if (band.hasLowercase) {
    lines.push({ x1, x2, y: place.y + xHeightOf(font) * unit, kind: 'mid' });
  }
  return lines;
}

/** How many tracing repeats fit comfortably on one worksheet row. */
function repeatsFor(text: string): number {
  if (text.length >= 3) return 2;
  if (text.length === 2) return 3;
  return 4;
}

interface Frame {
  art: Box;
  title?: { size: number; y: number; centerX: number };
  footer?: { size: number; y: number; left: number; right: number };
}

function frameFor(paper: PaperSpec, config: Config, hasTitle: boolean, hasFooter: boolean): Frame {
  const margin = Math.max(config.marginIn, MIN_MARGIN_IN) * PT_PER_INCH;
  const full: Box = {
    x: margin,
    y: margin,
    w: paper.widthPt - margin * 2,
    h: paper.heightPt - margin * 2,
  };

  const frame: Frame = { art: full };
  let art = full;

  if (hasTitle) {
    const size = Math.min(16, full.w * 0.032);
    const band = size * 2.6;
    frame.title = { size, y: full.y + full.h - size, centerX: full.x + full.w / 2 };
    art = { ...art, h: art.h - band };
  }

  // The footer sits inside the safe area, never in the margin band: a page
  // number that creeps into the trim zone is the classic reason a print shop
  // sends a file back.
  if (hasFooter) {
    const size = Math.min(9.5, full.w * 0.02);
    const band = size * 2.6;
    frame.footer = { size, y: full.y + size * 0.9, left: full.x, right: full.x + full.w };
    art = { ...art, y: art.y + band, h: art.h - band };
  }

  frame.art = art;
  return frame;
}

/** Width of a line of type in points, at a given size. */
export function textWidth(font: LoadedFont, text: string, size: number): number {
  if (!text) return 0;
  return (font.layout(text).advanceWidth * size) / font.unitsPerEm;
}

/** Greedy word wrap against a measured width, in the face that will draw it. */
export function wrapText(
  font: LoadedFont,
  text: string,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && textWidth(font, candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Largest size at or below `start` that keeps one line inside `maxWidth`. */
function fitLine(font: LoadedFont, text: string, start: number, maxWidth: number): number {
  const width = textWidth(font, text, start);
  if (width <= maxWidth || width <= 0) return start;
  return (start * maxWidth) / width;
}

/**
 * Two-pass sizing: fit once to learn the stroke weight, then refit inside a
 * box shrunk by that weight so the contour itself never crosses the safe
 * margin. The stroke straddles the path, so it claims half its width on each
 * side of the box.
 */
function fitWithStroke(
  font: LoadedFont,
  text: string,
  box: Box,
  ratio: Ratio,
  strokeBase: number,
  kind: 'fill' | 'metric',
  band: Band,
): number {
  const measure = (target: Box) =>
    kind === 'fill'
      ? fillSize(font, text, target, ratio)
      : metricSize(font, text, target, ratio, band);

  const size = measure(box);
  if (size <= 0) return 0;
  const unit = size / font.unitsPerEm;
  const run = font.layout(text);
  const drawn =
    kind === 'fill'
      ? (run.bbox.maxY - run.bbox.minY) * unit
      : (band.maxY - band.minY) * unit;
  const shrunk = inset(box, strokeFor(strokeBase, drawn) / 2);
  if (shrunk.w <= 0 || shrunk.h <= 0) return size;
  return measure(shrunk);
}

const HERO_RATIO: Ratio = { w: 0.94, h: 0.94 };
const WORKSHEET_HERO_RATIO: Ratio = { w: 0.92, h: 0.92 };
const CELL_RATIO: Ratio = { w: 0.9, h: 0.78 };
const STRIP_RATIO: Ratio = { w: 0.9, h: 0.78 };

interface SlotBoxes {
  hero?: Box;
  cells: Box[];
  /** Rows of cells, used for drawing shared guide lines. */
  rows: Box[][];
}

function strip(area: Box, count: number, gutterRatio: number): Box[] {
  const gutter = area.w * gutterRatio;
  const width = (area.w - gutter * (count - 1)) / count;
  return Array.from({ length: count }, (_, i) => ({
    x: area.x + i * (width + gutter),
    y: area.y,
    w: width,
    h: area.h,
  }));
}

function slotBoxes(art: Box, config: Config, text: string): SlotBoxes {
  if (config.layout === 'single') {
    if (config.style !== 'combo') return { hero: art, cells: [], rows: [] };
    const gap = art.h * 0.045;
    const stripH = art.h * 0.2;
    const cells = strip({ ...art, h: stripH }, repeatsFor(text), 0.03);
    return {
      hero: { ...art, y: art.y + stripH + gap, h: art.h - stripH - gap },
      cells,
      rows: [cells],
    };
  }

  if (config.layout === 'grid') {
    const { cols, rows } = GRIDS[config.grid];
    const gutter = Math.min(art.w, art.h) * 0.035;
    const cw = (art.w - gutter * (cols - 1)) / cols;
    const ch = (art.h - gutter * (rows - 1)) / rows;
    const grid: Box[][] = [];
    for (let r = 0; r < rows; r += 1) {
      grid.push(
        Array.from({ length: cols }, (_, c) => ({
          x: art.x + c * (cw + gutter),
          // Row 0 is the top row, so walk down from the top of the art box.
          y: art.y + art.h - ch - r * (ch + gutter),
          w: cw,
          h: ch,
        })),
      );
    }
    return { cells: grid.flat(), rows: grid };
  }

  // worksheet: one large model, then tracing rows underneath.
  const heroH = art.h * 0.4;
  const gap = art.h * 0.045;
  const restH = art.h - heroH - gap;
  const rowCount = 3;
  const rowGap = restH * 0.05;
  const rowH = (restH - rowGap * (rowCount - 1)) / rowCount;
  const rows = Array.from({ length: rowCount }, (_, r) =>
    strip(
      { ...art, y: art.y + restH - rowH - r * (rowH + rowGap), h: rowH },
      repeatsFor(text),
      0.025,
    ),
  );
  return {
    hero: { ...art, y: art.y + art.h - heroH, h: heroH },
    cells: rows.flat(),
    rows,
  };
}

function heroMode(config: Config): Mode {
  return config.style === 'dotted' ? 'dotted' : 'solid';
}

function cellMode(config: Config, index: number): Mode {
  if (config.style === 'outline') return 'solid';
  if (config.style === 'dotted') return 'dotted';
  // combo: the first grid cell is the worked example, the rest are to trace.
  return config.layout === 'grid' && index === 0 ? 'solid' : 'dotted';
}

/**
 * Locks one tracing size per text length so every page in a set matches.
 * Single-digit numbers keep their own size from double-digit ones, which is
 * what you want: "7" should not shrink just because "100" is in the range.
 */
function lockedCellSizes(
  font: LoadedFont,
  config: Config,
  art: Box,
  characters: string[],
  ratio: Ratio,
  strokeBase: number,
  band: Band,
): Map<number, number> {
  const byLength = new Map<number, number>();
  for (const text of characters) {
    const box = slotBoxes(art, config, text).cells[0];
    if (!box) continue;
    const size = fitWithStroke(font, text, box, ratio, strokeBase, 'metric', band);
    const current = byLength.get(text.length);
    byLength.set(text.length, current === undefined ? size : Math.min(current, size));
  }
  return byLength;
}

export interface PlanInput {
  font: LoadedFont;
  config: Config;
  paper: PaperSpec;
  characters: string[];
}

/** Drops anything the face cannot draw, so nothing renders as tofu. */
function safeLine(font: LoadedFont, text: string): string {
  return font.supports(text);
}

function centred(font: LoadedFont, text: string, size: number, box: Box, y: number, ink: number): TextDraw {
  return { text, size, x: box.x + (box.w - textWidth(font, text, size)) / 2, y, ink };
}

interface MatterInput {
  font: LoadedFont;
  config: Config;
  paper: PaperSpec;
  characters: string[];
  /** Title as printed, already language-resolved. */
  title: string;
  brand: string;
  worksheetCount: number;
}

/**
 * Everything a buyer reads is written twice: a pack sold on Etsy or Gumroad
 * with an Indonesian licence page reads as unfinished, and so does a Shopee
 * pack with an English one. The seller picks; the marketplace canvases pick
 * for themselves.
 */
const COVER_COPY: Record<
  LanguageId,
  { subtitle: (pages: number, papers: string) => string; specs: string[] }
> = {
  en: {
    subtitle: (pages, papers) => `${pages} print-ready pages — ${papers}`,
    specs: [
      'Vector 300 DPI — 0.5 inch safe margin — single-plate black ink',
      'Print as many copies as you need for personal and classroom use',
    ],
  },
  id: {
    subtitle: (pages, papers) => `${pages} halaman siap cetak — ${papers}`,
    specs: [
      'Vector 300 DPI — margin aman 0.5 inci — tinta hitam K100',
      'Cetak ulang sebanyak yang dibutuhkan untuk pemakaian pribadi dan kelas',
    ],
  },
};

interface TermsCopy {
  title: string;
  footer: string;
  contents: (pages: number, papers: string) => string;
  papers: (both: boolean, label: string) => string;
  sections: (contents: string, fontFamily: string, owner: string) => TermsSection[];
}

const TERMS_COPY: Record<LanguageId, TermsCopy> = {
  en: {
    title: 'Terms of Use',
    footer: 'Made with DoodleGen — print-ready coloring and tracing pages',
    contents: (pages, papers) =>
      `${pages} practice pages as a PDF, ${papers}, ready to print again and again.`,
    papers: (both, label) => (both ? 'A4 and US Letter' : label),
    sections: (contents, fontFamily, owner) => [
      { heading: 'What is inside', body: [contents] },
      {
        heading: 'Printing tips',
        body: [
          'Print at 100% scale with page scaling turned off, on 80-120 gsm paper, in black and white or greyscale.',
        ],
      },
      {
        heading: 'What you may do',
        body: ['Print an unlimited number of copies for personal, family, classroom or library use.'],
      },
      {
        heading: 'What you may not do',
        body: [
          'Resell, share, or re-upload this PDF file, in whole or in part, and do not claim it as your own work.',
        ],
      },
      {
        heading: 'Fonts and licence',
        body: [
          `The typeface in this file is ${fontFamily}, licensed under the SIL Open Font License 1.1.`,
        ],
      },
      {
        heading: 'Copyright',
        body: [`This file and its contents belong to ${owner}. All rights reserved.`],
      },
    ],
  },
  id: {
    title: 'Ketentuan Penggunaan',
    footer: 'Dibuat dengan DoodleGen — halaman mewarnai dan tracing siap cetak',
    contents: (pages, papers) =>
      `${pages} halaman latihan dalam format PDF, ${papers}, siap cetak berulang kali.`,
    papers: (both, label) => (both ? 'A4 dan US Letter' : label),
    sections: (contents, fontFamily, owner) => [
      { heading: 'Isi paket', body: [contents] },
      {
        heading: 'Tips mencetak',
        body: [
          'Cetak pada ukuran asli 100% tanpa "fit to page", pakai kertas 80-120 gsm agar krayon tidak tembus.',
        ],
      },
      {
        heading: 'Yang boleh dilakukan',
        body: ['Cetak ulang tanpa batas untuk pemakaian pribadi, keluarga, kelas, atau perpustakaan.'],
      },
      {
        heading: 'Yang tidak boleh',
        body: [
          'Menjual kembali, membagikan, atau mengunggah ulang berkas PDF ini, baik utuh maupun sebagian.',
        ],
      },
      {
        heading: 'Font & lisensi',
        body: [
          `Huruf pada berkas ini memakai ${fontFamily}, dilisensikan di bawah SIL Open Font License 1.1.`,
        ],
      },
      {
        heading: 'Hak cipta',
        body: [`Isi berkas ini adalah milik ${owner}. Semua hak dilindungi.`],
      },
    ],
  },
};

/**
 * Confetti sits in the band between the card's edge and the type, so a dot
 * can never land on a word. Positions are fixed rather than random: a plan
 * has to come out identical every time, or the preview and the PDF would
 * disagree about where the dots are.
 */
const CONFETTI: { side: 'top' | 'bottom' | 'left' | 'right'; t: number; r: number }[] = [
  { side: 'top', t: 0.12, r: 0.85 },
  { side: 'top', t: 0.46, r: 0.5 },
  { side: 'top', t: 0.86, r: 1.1 },
  { side: 'bottom', t: 0.16, r: 1.05 },
  { side: 'bottom', t: 0.55, r: 0.6 },
  { side: 'bottom', t: 0.88, r: 0.8 },
  { side: 'left', t: 0.28, r: 0.7 },
  { side: 'left', t: 0.68, r: 1 },
  { side: 'right', t: 0.34, r: 0.95 },
  { side: 'right', t: 0.74, r: 0.65 },
];

/**
 * The cover's tinted card and, unless the style declines them, the dots
 * around its border, in points.
 */
function coverDecoration(art: Box, inner: Box, palette: Palette, confetti: boolean): ShapeDraw[] {
  if (!palette.card) return [];

  const shapes: ShapeDraw[] = [
    { kind: 'rect', x: art.x, y: art.y, w: art.w, h: art.h, r: 18, color: palette.card },
  ];
  if (!confetti || !palette.confetti.length) return shapes;

  const band = inner.y - art.y;
  const unit = band * 0.28;
  CONFETTI.forEach((dot, index) => {
    const radius = unit * dot.r;
    const centre =
      dot.side === 'top'
        ? { x: inner.x + inner.w * dot.t, y: art.y + art.h - band / 2 }
        : dot.side === 'bottom'
          ? { x: inner.x + inner.w * dot.t, y: art.y + band / 2 }
          : dot.side === 'left'
            ? { x: art.x + band / 2, y: inner.y + inner.h * dot.t }
            : { x: art.x + art.w - band / 2, y: inner.y + inner.h * dot.t };
    shapes.push({
      kind: 'ellipse',
      x: centre.x - radius,
      y: centre.y - radius,
      w: radius * 2,
      h: radius * 2,
      color: palette.confetti[index % palette.confetti.length],
    });
  });

  return shapes;
}

/** Type sizes the cover compositions share, so they read as one family. */
const COVER_BRAND_SIZE = 10;
const COVER_SPEC_SIZE = 10;
const COVER_SUBTITLE_SIZE = 12;
const COVER_SAMPLE_RATIO: Ratio = { w: 0.82, h: 0.82 };

/** Boxes in reading order — left to right, top row first. */
function tile(area: Box, cols: number, rows: number, gutterRatio: number): Box[] {
  const gutter = Math.min(area.w, area.h) * gutterRatio;
  const w = (area.w - gutter * (cols - 1)) / cols;
  const h = (area.h - gutter * (rows - 1)) / rows;
  const boxes: Box[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      boxes.push({
        x: area.x + col * (w + gutter),
        y: area.y + area.h - h - row * (h + gutter),
        w,
        h,
      });
    }
  }
  return boxes;
}

/**
 * Sample characters drawn into boxes exactly as the worksheets draw them, and
 * poured full of palette colour. Where the style has room for more than one,
 * the last is left as dots: the cover then shows both what the child starts
 * with and what they end up with.
 */
function coverSampleArt(
  font: LoadedFont,
  config: Config,
  palette: Palette,
  boxes: Box[],
  texts: string[],
  traceLast: boolean,
  ratio: Ratio = COVER_SAMPLE_RATIO,
): Placement[] {
  const strokeBase = STROKES[config.stroke].base;
  return texts.slice(0, boxes.length).map((text, index) => {
    const box = boxes[index];
    const size = fitWithStroke(font, text, box, ratio, strokeBase, 'fill', bandFor(font, [text]));
    const dotted = traceLast && texts.length > 1 && index === texts.length - 1;
    const place = placeFill(font, text, box, size, dotted ? 'dotted' : 'solid', strokeBase);
    return dotted || !palette.letters.length
      ? place
      : { ...place, fill: palette.letters[index % palette.letters.length] };
  });
}

/** Everything one cover composition needs, and the marks it has drawn. */
interface CoverScene {
  font: LoadedFont;
  config: Config;
  palette: Palette;
  inner: Box;
  title: string;
  brand: string;
  subtitle: string;
  specs: string[];
  samples: string[];
  texts: TextDraw[];
  rules: RuleDraw[];
  placements: Placement[];
}

function coverRule(inner: Box, y: number, palette: Palette): RuleDraw {
  return { x1: inner.x, x2: inner.x + inner.w, y, width: 0.6, ink: 0.22, color: palette.rule };
}

function leftText(text: string, size: number, x: number, y: number, ink: number, color: Cmyk): TextDraw {
  return { text, size, x, y, ink, color };
}

/** Wrapped title lines, plus the one size at which every line still fits. */
function coverTitle(
  font: LoadedFont,
  title: string,
  start: number,
  maxWidth: number,
): { lines: string[]; size: number } {
  const lines = wrapText(font, title, start, maxWidth).slice(0, 3);
  const size = Math.min(start, ...lines.map((line) => fitLine(font, line, start, maxWidth)));
  return { lines, size };
}

/** The height a title-plus-subtitle block will claim once drawn. */
function coverCopyHeight(lines: string[], size: number, hasSubtitle: boolean): number {
  return lines.length * size * 1.28 + (hasSubtitle ? COVER_SUBTITLE_SIZE * 2.2 : 0);
}

/** The specs at the foot of every cover, above their hairline. */
function coverSpecs(scene: CoverScene, align: 'center' | 'left'): void {
  const { font, inner, palette } = scene;
  let bottom = inner.y + COVER_SPEC_SIZE * 0.4;
  for (let index = scene.specs.length - 1; index >= 0; index -= 1) {
    const line = scene.specs[index];
    scene.texts.push(
      align === 'center'
        ? { ...centred(font, line, COVER_SPEC_SIZE, inner, bottom, 0.45), color: palette.body }
        : leftText(line, COVER_SPEC_SIZE, inner.x, bottom, 0.45, palette.body),
    );
    bottom += COVER_SPEC_SIZE * 1.9;
  }
  scene.rules.push(coverRule(inner, bottom - COVER_SPEC_SIZE * 0.6, palette));
}

/** How tall the spec block at the foot of a cover is, hairline included. */
function coverSpecHeight(scene: CoverScene): number {
  return scene.specs.length * COVER_SPEC_SIZE * 1.9 + COVER_SPEC_SIZE * 2;
}

/**
 * Klasik: brand line, centred title, a strip of three samples, specs. The
 * shape a printable pack has been sold in since long before this tool.
 */
function classicCover(scene: CoverScene): void {
  const { font, inner, palette } = scene;
  let cursor = inner.y + inner.h;

  if (scene.brand) {
    cursor -= COVER_BRAND_SIZE;
    scene.texts.push({
      ...centred(font, scene.brand, COVER_BRAND_SIZE, inner, cursor, 0.45),
      color: palette.brand,
    });
    cursor -= COVER_BRAND_SIZE * 0.9;
    scene.rules.push(coverRule(inner, cursor, palette));
  }

  cursor -= inner.h * 0.06;

  const title = coverTitle(font, scene.title, 30, inner.w * 0.94);
  for (const line of title.lines) {
    cursor -= title.size;
    scene.texts.push({ ...centred(font, line, title.size, inner, cursor, 1), color: palette.headline });
    cursor -= title.size * 0.28;
  }

  if (scene.subtitle) {
    cursor -= COVER_SUBTITLE_SIZE * 1.4;
    scene.texts.push({
      ...centred(font, scene.subtitle, COVER_SUBTITLE_SIZE, inner, cursor, 0.5),
      color: palette.body,
    });
  }

  const stripTop = cursor - inner.h * 0.04;
  const stripBottom = inner.y + coverSpecHeight(scene) + inner.h * 0.04;
  const free = stripTop - stripBottom;
  // The samples sit in the middle of whatever the copy left, capped so three
  // letters never grow into a second cover of their own.
  const stripH = Math.min(free, inner.h * 0.5);

  if (scene.samples.length && stripH > 20) {
    const top = stripTop - (free - stripH) / 2;
    const boxes = strip(
      { x: inner.x, y: top - stripH, w: inner.w, h: stripH },
      scene.samples.length,
      0.04,
    );
    scene.placements.push(
      ...coverSampleArt(font, scene.config, palette, boxes, scene.samples, true),
    );
  }

  coverSpecs(scene, 'center');
}

/**
 * Poster: one character blown up to the height of the page. It is the cover
 * that survives being shrunk to a marketplace thumbnail, because at 200 px
 * there is still exactly one thing on it.
 */
function posterCover(scene: CoverScene): void {
  const { font, inner, palette } = scene;
  let cursor = inner.y + inner.h;

  if (scene.brand) {
    cursor -= COVER_BRAND_SIZE;
    scene.texts.push({
      ...centred(font, scene.brand, COVER_BRAND_SIZE, inner, cursor, 0.45),
      color: palette.brand,
    });
    cursor -= COVER_BRAND_SIZE * 1.4;
  }

  // The copy is laid from the foot upward, so whatever is left over between
  // it and the brand line is the character's — however long the title runs.
  const title = coverTitle(font, scene.title, 34, inner.w * 0.94);
  let y = inner.y + coverSpecHeight(scene) + inner.h * 0.02;

  if (scene.subtitle) {
    scene.texts.push({
      ...centred(font, scene.subtitle, COVER_SUBTITLE_SIZE, inner, y, 0.5),
      color: palette.body,
    });
    y += COVER_SUBTITLE_SIZE * 2.2;
  }
  for (let index = title.lines.length - 1; index >= 0; index -= 1) {
    scene.texts.push({
      ...centred(font, title.lines[index], title.size, inner, y, 1),
      color: palette.headline,
    });
    y += title.size * 1.28;
  }

  const heroBottom = y + inner.h * 0.03;
  if (scene.samples.length && cursor - heroBottom > 40) {
    const box = { x: inner.x, y: heroBottom, w: inner.w, h: cursor - heroBottom };
    scene.placements.push(
      ...coverSampleArt(font, scene.config, palette, [box], scene.samples, false, {
        w: 0.9,
        h: 0.9,
      }),
    );
  }

  coverSpecs(scene, 'center');
}

/**
 * Etalase: four samples in a grid over a left-aligned title block. Where the
 * poster sells one character, this one sells the fact that there are many.
 */
function showcaseCover(scene: CoverScene): void {
  const { font, inner, palette } = scene;
  let cursor = inner.y + inner.h;

  if (scene.brand) {
    cursor -= COVER_BRAND_SIZE;
    scene.texts.push(leftText(scene.brand, COVER_BRAND_SIZE, inner.x, cursor, 0.45, palette.brand));
    cursor -= COVER_BRAND_SIZE * 0.9;
    scene.rules.push(coverRule(inner, cursor, palette));
  }

  const title = coverTitle(font, scene.title, 28, inner.w * 0.9);
  let y = inner.y + coverSpecHeight(scene) + inner.h * 0.02;

  if (scene.subtitle) {
    scene.texts.push(
      leftText(scene.subtitle, COVER_SUBTITLE_SIZE, inner.x, y, 0.5, palette.body),
    );
    y += COVER_SUBTITLE_SIZE * 2.2;
  }
  for (let index = title.lines.length - 1; index >= 0; index -= 1) {
    scene.texts.push(leftText(title.lines[index], title.size, inner.x, y, 1, palette.headline));
    y += title.size * 1.28;
  }

  const gridTop = cursor - inner.h * 0.04;
  const gridBottom = y + inner.h * 0.04;
  if (scene.samples.length && gridTop - gridBottom > 60) {
    const rows = scene.samples.length > 2 ? 2 : 1;
    const cols = Math.ceil(scene.samples.length / rows);
    const boxes = tile(
      { x: inner.x, y: gridBottom, w: inner.w, h: gridTop - gridBottom },
      cols,
      rows,
      0.05,
    );
    scene.placements.push(
      ...coverSampleArt(font, scene.config, palette, boxes, scene.samples, true),
    );
  }

  coverSpecs(scene, 'left');
}

/**
 * Minimalis: type between two hairlines on bare paper. No card, no dots, no
 * samples — the cover for a shop whose look is restraint, and the cheapest
 * of the four to print.
 */
function minimalCover(scene: CoverScene): void {
  const { font, inner, palette } = scene;
  const ruleInset = inner.w * 0.26;
  const hairline = (y: number): RuleDraw => ({
    x1: inner.x + ruleInset,
    x2: inner.x + inner.w - ruleInset,
    y,
    width: 0.8,
    ink: 0.22,
    color: palette.rule,
  });

  const title = coverTitle(font, scene.title, 32, inner.w * 0.8);
  const gap = inner.h * 0.05;
  const blockH =
    gap * 2 +
    (scene.brand ? COVER_BRAND_SIZE * 2.8 : 0) +
    title.lines.length * title.size * 1.3 +
    (scene.subtitle ? COVER_SUBTITLE_SIZE * 1.6 : 0);

  // The block is centred on the optical centre — a shade above the true one,
  // which is where a title page has always sat.
  let cursor = inner.y + inner.h * 0.56 + blockH / 2;
  scene.rules.push(hairline(cursor));
  cursor -= gap;

  if (scene.brand) {
    cursor -= COVER_BRAND_SIZE;
    scene.texts.push({
      ...centred(font, scene.brand, COVER_BRAND_SIZE, inner, cursor, 0.45),
      color: palette.brand,
    });
    cursor -= COVER_BRAND_SIZE * 1.8;
  }

  for (const line of title.lines) {
    cursor -= title.size;
    scene.texts.push({ ...centred(font, line, title.size, inner, cursor, 1), color: palette.headline });
    cursor -= title.size * 0.3;
  }

  if (scene.subtitle) {
    cursor -= COVER_SUBTITLE_SIZE * 1.6;
    scene.texts.push({
      ...centred(font, scene.subtitle, COVER_SUBTITLE_SIZE, inner, cursor, 0.5),
      color: palette.body,
    });
  }

  cursor -= gap;
  scene.rules.push(hairline(cursor));

  coverSpecs(scene, 'center');
}

const COVER_COMPOSERS: Record<CoverStyle['page'], (scene: CoverScene) => void> = {
  classic: classicCover,
  poster: posterCover,
  showcase: showcaseCover,
  minimal: minimalCover,
};

/**
 * The title page a paid download is expected to open with: who made it, what
 * is inside, and what it prints as. Which of those the page leads with is the
 * seller's call — `coverStyle` picks the composition. Built from the same
 * glyph outlines as the worksheets either way, so the cover is vector too.
 */
function planCover({
  font,
  config,
  paper,
  characters,
  title,
  brand,
  worksheetCount,
}: MatterInput): PagePlan {
  const style = COVER_STYLES[config.coverStyle] ?? COVER_STYLES.classic;
  const margin = Math.max(config.marginIn, MIN_MARGIN_IN) * PT_PER_INCH;
  const art: Box = {
    x: margin,
    y: margin,
    w: paper.widthPt - margin * 2,
    h: paper.heightPt - margin * 2,
  };
  const palette = PALETTES[config.palette];
  // A style may turn the palette's card down; the type still takes its
  // colours, so "Minimalis" reads as restraint rather than as monochrome.
  const carded = style.decoration !== 'none' && Boolean(palette.card);
  // Inside the tinted card, type keeps clear of the rounded corners — and
  // that same band is where the confetti lives.
  const inner = carded ? inset(art, Math.min(art.w, art.h) * 0.06) : art;
  const shapes = carded
    ? coverDecoration(art, inner, palette, style.decoration === 'full')
    : [];

  const papers = config.paper === 'both' ? 'A4 + US Letter' : paper.label;
  const copy = COVER_COPY[config.language];
  const scene: CoverScene = {
    font,
    config,
    palette,
    inner,
    title: safeLine(font, title) || 'Worksheets',
    brand: safeLine(font, (brand || 'DoodleGen').toUpperCase()),
    subtitle: safeLine(font, copy.subtitle(worksheetCount, papers)),
    specs: copy.specs.map((line) => safeLine(font, line)).filter(Boolean),
    samples: coverSamples(characters, style.samples),
    texts: [],
    rules: [],
    placements: [],
  };

  COVER_COMPOSERS[style.page](scene);

  return {
    kind: 'cover',
    label: 'Sampul',
    widthPt: paper.widthPt,
    heightPt: paper.heightPt,
    shapes,
    placements: scene.placements,
    guides: [],
    texts: scene.texts,
    rules: scene.rules,
  };
}

interface TermsSection {
  heading: string;
  body: string[];
}

/** The licence page a marketplace buyer expects to find at the back. */
function planTerms(
  { font, config, paper, brand, worksheetCount }: MatterInput,
  fontFamily: string,
): PagePlan {
  const margin = Math.max(config.marginIn, MIN_MARGIN_IN) * PT_PER_INCH;
  const art: Box = {
    x: margin,
    y: margin,
    w: paper.widthPt - margin * 2,
    h: paper.heightPt - margin * 2,
  };
  const texts: TextDraw[] = [];
  const rules: RuleDraw[] = [];
  const copy = TERMS_COPY[config.language];

  let cursor = art.y + art.h;

  const titleSize = 20;
  cursor -= titleSize;
  texts.push({
    text: safeLine(font, copy.title),
    size: titleSize,
    x: art.x,
    y: cursor,
    ink: 1,
  });
  cursor -= titleSize * 0.8;
  rules.push({ x1: art.x, x2: art.x + art.w, y: cursor, width: 0.8, ink: 0.3 });
  cursor -= titleSize * 1.1;

  const headingSize = 12;
  const bodySize = 10.5;
  const papers = copy.papers(config.paper === 'both', paper.label);
  const contents = copy.contents(worksheetCount, papers);
  const owner = brand || (config.language === 'id' ? 'penjual' : 'the seller');
  for (const section of copy.sections(contents, fontFamily, owner)) {
    cursor -= headingSize;
    texts.push({ text: safeLine(font, section.heading), size: headingSize, x: art.x, y: cursor, ink: 0.85 });
    cursor -= headingSize * 0.7;
    for (const paragraph of section.body) {
      for (const line of wrapText(font, safeLine(font, paragraph), bodySize, art.w)) {
        cursor -= bodySize * 1.45;
        texts.push({ text: line, size: bodySize, x: art.x, y: cursor, ink: 0.55 });
      }
      cursor -= bodySize * 0.35;
    }
    cursor -= headingSize * 0.9;
  }

  const footer = safeLine(font, copy.footer);
  texts.push(centred(font, footer, 9.5, art, art.y + 4, 0.4));
  rules.push({ x1: art.x, x2: art.x + art.w, y: art.y + 18, width: 0.6, ink: 0.2 });

  return {
    kind: 'terms',
    label: 'Lisensi',
    widthPt: paper.widthPt,
    heightPt: paper.heightPt,
    shapes: [],
    placements: [],
    guides: [],
    texts,
    rules,
  };
}

/** Builds every page of a document, with tracing sizes harmonised across it. */
export function planDocument({ font, config, paper, characters }: PlanInput): PagePlan[] {
  if (!characters.length) return [];

  const hasTitle = config.showTitle && config.titleTemplate.trim().length > 0;
  const frame = frameFor(paper, config, hasTitle, config.pageNumbers);
  const art = frame.art;
  const strokeBase = STROKES[config.stroke].base;
  const band = bandFor(font, characters);
  const title = printedTitle(config, characters);
  const brand = brandName(config);

  const heroRatio = config.layout === 'single' ? HERO_RATIO : WORKSHEET_HERO_RATIO;
  const cellRatio = config.layout === 'single' ? STRIP_RATIO : CELL_RATIO;
  const cellSizes = lockedCellSizes(font, config, art, characters, cellRatio, strokeBase, band);

  const worksheets = characters.map((text, pageIndex) => {
    const boxes = slotBoxes(art, config, text);
    const placements: Placement[] = [];
    const guides: GuideLine[] = [];
    const texts: TextDraw[] = [];

    // The model character is sized per page so each one fills its area, the
    // way a printed alphabet set reads best.
    if (boxes.hero) {
      const size = fitWithStroke(font, text, boxes.hero, heroRatio, strokeBase, 'fill', band);
      placements.push(placeFill(font, text, boxes.hero, size, heroMode(config), strokeBase));
    }

    const cellSize = cellSizes.get(text.length) ?? 0;
    boxes.cells.forEach((box, index) => {
      placements.push(
        placeMetric(font, text, box, cellSize, cellMode(config, index), strokeBase, band),
      );
    });

    if (config.guides) {
      for (const row of boxes.rows) {
        if (!row.length) continue;
        const probe = placeMetric(font, text, row[0], cellSize, 'solid', strokeBase, band);
        const last = row[row.length - 1];
        guides.push(...guidesFor(font, probe, band, row[0].x, last.x + last.w));
      }
    }

    if (hasTitle && frame.title) {
      const line = safeLine(font, renderTitle(config.titleTemplate, text));
      if (line) {
        texts.push({
          text: line,
          size: frame.title.size,
          x: frame.title.centerX - textWidth(font, line, frame.title.size) / 2,
          y: frame.title.y,
          ink: 0.78,
        });
      }
    }

    // A numbered footer, so a printed pack can be reassembled in order and a
    // buyer can be told exactly which sheet is which.
    if (frame.footer) {
      const { size, y, left, right } = frame.footer;
      const stamp = safeLine(font, brand ? `${brand} — ${title}` : title);
      if (stamp) {
        const room = (right - left) * 0.7;
        const fitted = fitLine(font, stamp, size, room);
        texts.push({ text: stamp, size: fitted, x: left, y, ink: 0.35 });
      }
      const number = safeLine(font, `${pageIndex + 1} / ${characters.length}`);
      texts.push({
        text: number,
        size,
        x: right - textWidth(font, number, size),
        y,
        ink: 0.35,
      });
    }

    return {
      kind: 'char' as const,
      label: text,
      widthPt: paper.widthPt,
      heightPt: paper.heightPt,
      // Worksheets carry no colour: one plate, clean photocopies, cheap ink.
      shapes: [],
      placements,
      guides,
      texts,
      rules: [],
    };
  });

  const matter: MatterInput = {
    font,
    config,
    paper,
    characters,
    title,
    brand,
    worksheetCount: characters.length,
  };

  return [
    ...(config.coverPage ? [planCover(matter)] : []),
    ...worksheets,
    // The face's provenance note belongs in FONTS.md, not on a buyer's page.
    ...(config.termsPage ? [planTerms(matter, FONTS[config.font].family.replace(/\s*\(.*\)$/, ''))] : []),
  ];
}

/** Pages in one generated file, front and back matter included. */
export function pageCountOf(config: Config, characters: string[]): number {
  return characters.length + (config.coverPage ? 1 : 0) + (config.termsPage ? 1 : 0);
}

/** Safe-area rectangle, exposed so the preview can show the margin guard. */
export function safeArea(paper: PaperSpec, config: Config): Box {
  const margin = Math.max(config.marginIn, MIN_MARGIN_IN) * PT_PER_INCH;
  return {
    x: margin,
    y: margin,
    w: paper.widthPt - margin * 2,
    h: paper.heightPt - margin * 2,
  };
}
