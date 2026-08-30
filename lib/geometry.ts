import { renderTitle, subjectOf } from './charset';
import { COLOURFUL_STYLES, COVER_STYLES, coverSamples, type CoverStyle } from './covers';
import {
  archPath,
  blobPath,
  burstPath,
  cloudPath,
  pathShape,
  ribbonPath,
  seeded,
  sparklePath,
  starPath,
  tapePath,
} from './doodles';
import { resolveCoverInk, type CoverElement } from './coverDoc';
import { PALETTES, readableInks, type Palette } from './palette';
import {
  FADED_INK,
  FONTS,
  GRIDS,
  INKS,
  MIN_FADED_INK,
  MIN_MARGIN_IN,
  PT_PER_INCH,
  STROKES,
} from './presets';
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
  PathCmd,
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

/**
 * The work area of a worksheet: the safe area, less whatever the title and
 * the footer take. Nothing else is allowed to charge the page — a worksheet
 * spends its whole surface on the characters.
 */
function frameFor(paper: PaperSpec, config: Config, hasTitle: boolean, hasFooter: boolean): Frame {
  const margin = Math.max(config.marginIn, MIN_MARGIN_IN) * PT_PER_INCH;
  const safe: Box = {
    x: margin,
    y: margin,
    w: paper.widthPt - margin * 2,
    h: paper.heightPt - margin * 2,
  };

  const frame: Frame = { art: safe };
  let art = safe;

  if (hasTitle) {
    const size = Math.min(16, safe.w * 0.032);
    const band = size * 2.6;
    frame.title = { size, y: safe.y + safe.h - size, centerX: safe.x + safe.w / 2 };
    art = { ...art, h: art.h - band };
  }

  // The footer sits inside the safe area, never in the margin band: a page
  // number that creeps into the trim zone is the classic reason a print shop
  // sends a file back.
  if (hasFooter) {
    const size = Math.min(9.5, safe.w * 0.02);
    const band = size * 2.6;
    frame.footer = { size, y: safe.y + size * 0.9, left: safe.x, right: safe.x + safe.w };
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

/** Styles that put a model character above rows the child works through. */
function hasPractice(style: Config['style']): boolean {
  return style === 'combo' || style === 'progressive';
}

function slotBoxes(art: Box, config: Config, text: string): SlotBoxes {
  if (config.layout === 'single') {
    if (!hasPractice(config.style)) return { hero: art, cells: [], rows: [] };
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

/** One practice cell, or null where the child is meant to write unaided. */
interface CellStep {
  mode: Mode;
  /** K-only override, for the faded step only. */
  ink?: number;
}

/**
 * Every handwriting sheet in print works the same way: a worked example, a
 * dotted repeat to trace, a faded one that gives less away, and then a cell
 * with nothing in it at all. `progressive` is that ladder on one page — the
 * blank cell is the point of the exercise, and the only one of the four
 * styles that ever leaves one.
 */
function cellStep(config: Config, index: number, count: number): CellStep | null {
  if (config.style === 'outline') return { mode: 'solid' };
  if (config.style === 'dotted') return { mode: 'dotted' };
  // Without a hero above them, the first cell of a grid is the worked example.
  const examples = config.layout === 'grid' ? 1 : 0;
  if (index < examples) return { mode: 'solid' };
  if (config.style === 'combo') return { mode: 'dotted' };

  const practice = count - examples;
  const step = index - examples;
  if (practice <= 1) return { mode: 'dotted' };

  // A third of the row is blank, a third faded, whatever is left dotted —
  // and a short row still ends on a cell the child fills in themselves.
  const blanks = Math.max(1, Math.floor(practice / 3));
  const faded = practice - blanks >= 2 ? Math.max(1, Math.floor(practice / 3)) : 0;
  if (step >= practice - blanks) return null;
  if (step >= practice - blanks - faded) {
    return {
      mode: 'solid',
      ink: Math.max(MIN_FADED_INK, INKS[config.ink].dotted * FADED_INK),
    };
  }
  return { mode: 'dotted' };
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
 * A cover carries the seller's own words and nothing else. Page counts, DPI
 * and reprint rights are listing copy — a buyer reads them on the shop page
 * before they pay, and printing them on the title page of the file they just
 * bought reads as a spec sheet stapled to the front of a book.
 */

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
 * The cover's ground — a tinted card or a flooded colour — and, unless the
 * style declines them, the dots around its border, in points.
 */
function coverDecoration(
  art: Box,
  inner: Box,
  palette: Palette,
  confetti: boolean,
  base: Cmyk | null,
): ShapeDraw[] {
  // A custom cover may ask for the dots on bare paper — no card under them —
  // so the ground is one shape this may or may not draw.
  const shapes: ShapeDraw[] = base
    ? [{ kind: 'rect', x: art.x, y: art.y, w: art.w, h: art.h, r: 18, color: base }]
    : [];
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
  /** The card: everything a cover draws has to stay inside this. */
  art: Box;
  /** The quiet rectangle inside the card, where type and art belong. */
  inner: Box;
  title: string;
  brand: string;
  /** The seller's own line under the title, or empty for none. */
  subtitle: string;
  /** The characters the cover may show, so a custom layout can pick its own. */
  characters: string[];
  samples: string[];
  texts: TextDraw[];
  rules: RuleDraw[];
  placements: Placement[];
  /** Background art: the card or ground first, then whatever the style draws. */
  shapes: ShapeDraw[];
  /**
   * Type and rules resolved against what they will actually sit on. On a
   * flooded page the palette's quiet greys would disappear, so a grounded
   * cover swaps them for the one colour chosen to survive the ground.
   */
  bodyInk: Cmyk;
  brandInk: Cmyk;
  ruleInk: Cmyk;
}

function coverRule(scene: CoverScene, y: number): RuleDraw {
  const { inner } = scene;
  return { x1: inner.x, x2: inner.x + inner.w, y, width: 0.6, ink: 0.22, color: scene.ruleInk };
}

/** The horizontal centre of the block a composition is laying type into. */
function midX(box: Box): number {
  return box.x + box.w / 2;
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

/**
 * The quiet band every composition leaves at the foot. It used to be a block
 * of print specs; with those gone it is kept as white space rather than
 * reclaimed, because a cover whose art runs to the bottom rule reads as a
 * poster that was cropped.
 */
function coverFootHeight(scene: CoverScene): number {
  return scene.inner.h * 0.05;
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
      color: scene.brandInk,
    });
    cursor -= COVER_BRAND_SIZE * 0.9;
    scene.rules.push(coverRule(scene, cursor));
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
      color: scene.bodyInk,
    });
  }

  const stripTop = cursor - inner.h * 0.04;
  const stripBottom = inner.y + coverFootHeight(scene) + inner.h * 0.04;
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
      color: scene.brandInk,
    });
    cursor -= COVER_BRAND_SIZE * 1.4;
  }

  // The copy is laid from the foot upward, so whatever is left over between
  // it and the brand line is the character's — however long the title runs.
  const title = coverTitle(font, scene.title, 34, inner.w * 0.94);
  let y = inner.y + coverFootHeight(scene) + inner.h * 0.02;

  if (scene.subtitle) {
    scene.texts.push({
      ...centred(font, scene.subtitle, COVER_SUBTITLE_SIZE, inner, y, 0.5),
      color: scene.bodyInk,
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
    scene.texts.push(leftText(scene.brand, COVER_BRAND_SIZE, inner.x, cursor, 0.45, scene.brandInk));
    cursor -= COVER_BRAND_SIZE * 0.9;
    scene.rules.push(coverRule(scene, cursor));
  }

  const title = coverTitle(font, scene.title, 28, inner.w * 0.9);
  let y = inner.y + coverFootHeight(scene) + inner.h * 0.02;

  if (scene.subtitle) {
    scene.texts.push(
      leftText(scene.subtitle, COVER_SUBTITLE_SIZE, inner.x, y, 0.5, scene.bodyInk),
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
    color: scene.ruleInk,
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
      color: scene.brandInk,
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
      color: scene.bodyInk,
    });
  }

  cursor -= gap;
  scene.rules.push(hairline(cursor));

}


/**
 * A panel is any shape whose job is to carry type: a speech balloon, a cloud,
 * a strip of tape, a sticker card. Where the palette has colour, it is a pale
 * fill the ramp can read against. Where it has none — "Hitam Putih" — it is
 * drawn as an outline instead, so the composition still reads as itself on a
 * page that will only ever see one plate of black.
 */
function panelPaint(palette: Palette): {
  fill: Cmyk;
  stroke: { color: Cmyk; width: number };
} {
  return {
    // 0% ink is white paper, not "no fill": a panel has to be opaque so the
    // art behind it stops at its edge, and on a mono page that is the only
    // thing keeping a road from being drawn straight through a letter.
    fill: palette.card ? palette.panel : [0, 0, 0, 0],
    // And it is always outlined. A pale panel on a bright ground separates
    // by hue rather than by lightness, which a photocopier throws away —
    // and an outline is what makes a shape read as a sticker anyway.
    stroke: { color: palette.headline, width: 1.2 },
  };
}

/** What a panel actually ends up painted, for anything laid on top of it. */
function panelInk(palette: Palette): Cmyk {
  return palette.card ? palette.panel : [0, 0, 0, 0];
}

/** What the page behind an unpanelled title ends up painted. */
function cardInk(palette: Palette): Cmyk {
  return palette.card ?? [0, 0, 0, 0];
}

function panelShape(scene: CoverScene, path: PathCmd[]): void {
  const paint = panelPaint(scene.palette);
  scene.shapes.push(pathShape(path, paint.fill, paint.stroke));
}

/** A sparkle or a star in the next confetti colour; mono keeps its page bare. */
function mark(
  scene: CoverScene,
  kind: 'star' | 'sparkle',
  centre: { x: number; y: number },
  radius: number,
  index: number,
): void {
  const path = kind === 'star' ? starPath(centre, radius) : sparklePath(centre, radius);
  scene.shapes.push(decorShape(scene.palette, path, index));
}

/**
 * A piece of decoration, filled from the confetti ramp where the palette has
 * one and outlined where it has not. Dropping it entirely on a mono page
 * costs the composition the very thing it is named after — a "Kilau" with no
 * rays, a "Bingkai Ceria" with no pattern.
 */
function decorShape(palette: Palette, path: PathCmd[], index: number): ShapeDraw {
  return palette.confetti.length
    ? pathShape(path, palette.confetti[index % palette.confetti.length])
    : pathShape(path, undefined, { color: palette.headline, width: 1 });
}

/**
 * The width a rainbow title will actually claim. Letters drawn one at a time
 * cannot kern, so the line comes out a hair wider than the same string set as
 * a run — and centring has to be told which of the two it is measuring.
 */
function rainbowWidth(font: LoadedFont, text: string, size: number): number {
  return [...text].reduce((total, letter) => total + textWidth(font, letter, size), 0);
}

/**
 * A title spelled out one letter at a time, each in the next colour of the
 * palette's ramp and each nudged a little off the baseline. It gives up
 * kerning, which is the price of the effect: a hand-lettered cover has never
 * kerned either, and every coloring book on the shelf is lettered this way.
 */
function rainbowLine(
  scene: CoverScene,
  text: string,
  size: number,
  left: number,
  baseline: number,
  backdrop: Cmyk,
): TextDraw[] {
  const ramp = readableInks(scene.palette.letters, backdrop);
  const out: TextDraw[] = [];
  let cursor = left;
  [...text].forEach((letter, index) => {
    if (letter.trim()) {
      out.push({
        text: letter,
        size,
        x: cursor,
        // Alternating letters ride a shade high, which is the whole
        // difference between lettering and typesetting.
        y: baseline + (index % 2 === 0 ? size * 0.04 : -size * 0.04),
        ink: 1,
        color: ramp.length ? ramp[index % ramp.length] : scene.palette.headline,
      });
    }
    cursor += textWidth(scene.font, letter, size);
  });
  return out;
}

/** A title wrapped to a box's width *and* shrunk until it fits its height. */
function coverTitleIn(font: LoadedFont, title: string, box: Box, start: number, min = 11): {
  lines: string[];
  size: number;
} {
  let ceiling = start;
  for (;;) {
    const block = coverTitle(font, title, ceiling, box.w);
    if (block.lines.length * block.size * 1.28 <= box.h || block.size <= min) return block;
    ceiling = Math.min(ceiling, block.size) - 2;
  }
}

/** The width of the widest line in a title block, as it will be drawn. */
function blockWidth(
  scene: CoverScene,
  block: { lines: string[]; size: number },
  rainbow: boolean,
): number {
  return block.lines.reduce(
    (widest, line) =>
      Math.max(
        widest,
        rainbow
          ? rainbowWidth(scene.font, line, block.size)
          : textWidth(scene.font, line, block.size),
      ),
    0,
  );
}

/**
 * Lays a title into a box, centred both ways, in whichever colour the style
 * asked for. Answers the baseline of the last line, so a caller can hang a
 * subtitle off it.
 */
function centredTitle(
  scene: CoverScene,
  fitted: { lines: string[]; size: number },
  box: Box,
  rainbow: boolean,
  backdrop: Cmyk,
): number {
  const { font } = scene;
  // A title was wrapped by a measurement that includes kerning, and a rainbow
  // title is then drawn a letter at a time, which has none — so it comes out
  // wider than the box it was fitted to. Width scales exactly with size, so
  // the correction is one multiplication rather than another search.
  const widest = rainbow ? blockWidth(scene, fitted, true) : 0;
  const block =
    widest > box.w ? { lines: fitted.lines, size: fitted.size * (box.w / widest) } : fitted;
  const step = block.size * 1.28;
  const height = block.lines.length * step;
  // Type is centred on its own body, not on the box, so the block sits a
  // little high — which is where an optical centre has always been.
  let cursor = box.y + (box.h + height) / 2 - block.size;
  for (const line of block.lines) {
    if (rainbow) {
      const left = midX(box) - rainbowWidth(font, line, block.size) / 2;
      scene.texts.push(...rainbowLine(scene, line, block.size, left, cursor, backdrop));
    } else {
      scene.texts.push({
        ...centred(font, line, block.size, box, cursor, 1),
        color: scene.palette.headline,
      });
    }
    cursor -= step;
  }
  return cursor + step;
}

/** The band a composition has left once brand, specs and subtitle are booked. */
function freeBand(scene: CoverScene, topGap: number, bottomExtra = 0): Box {
  const { inner } = scene;
  const top = inner.y + inner.h - topGap;
  const bottom = inner.y + coverFootHeight(scene) + bottomExtra;
  return { x: inner.x, y: bottom, w: inner.w, h: Math.max(0, top - bottom) };
}

/** The brand line every colourful composition opens with, centred on the ground. */
function groundBrand(scene: CoverScene): number {
  const { font, inner } = scene;
  let cursor = inner.y + inner.h;
  if (!scene.brand) return cursor;
  cursor -= COVER_BRAND_SIZE;
  scene.texts.push({
    ...centred(font, scene.brand, COVER_BRAND_SIZE, inner, cursor, 0.45),
    color: scene.brandInk,
  });
  return cursor - COVER_BRAND_SIZE * 0.8;
}

/** A subtitle centred on a baseline, in whatever ink survives the ground. */
function groundSubtitle(scene: CoverScene, baseline: number): void {
  if (!scene.subtitle) return;
  scene.texts.push({
    ...centred(scene.font, scene.subtitle, COVER_SUBTITLE_SIZE, scene.inner, baseline, 0.5),
    color: scene.bodyInk,
  });
}

/** Samples laid in a strip across a band, coloured in, last one left as dots. */
function sampleStrip(scene: CoverScene, band: Box, ratio?: Ratio): void {
  if (!scene.samples.length || band.h < 20) return;
  const boxes = strip(band, scene.samples.length, 0.04);
  scene.placements.push(
    ...coverSampleArt(
      scene.font,
      scene.config,
      scene.palette,
      boxes,
      scene.samples,
      true,
      ratio,
    ),
  );
}

/**
 * Balon Kata: the title inside a big speech balloon, the way every coloring
 * book on a supermarket shelf announces itself. The balloon is the whole
 * composition — it survives being shrunk to a marketplace thumbnail because
 * at 200 px there is one bright shape and one word on it.
 */
function bubbleCover(scene: CoverScene): void {
  const { inner } = scene;
  const top = groundBrand(scene);
  const band = freeBand(scene, inner.y + inner.h - top, inner.h * 0.03);

  // The balloon takes the upper half of what is free; the samples and the
  // subtitle share the rest, so nothing is ever laid over anything. It is
  // held wider than it is tall on purpose — a balloon that comes out round
  // reads as a plate, and gives a three-word title nowhere to go.
  const blobH = Math.min(band.h * 0.5, inner.w * 0.56);
  const rx = inner.w * 0.48;
  const ry = blobH / 2;
  // The wobble pushes a lobe out past the nominal radius, so the balloon is
  // seated far enough down that its highest lump still clears the brand.
  const wobble = 0.26;
  const centre = { x: midX(inner), y: band.y + band.h - ry * (1 + wobble / 2) };
  panelShape(scene, blobPath(centre, rx, ry, { lobes: 8, wobble, seed: 19 }));

  // A balloon narrows as it curves away from its waist, so the title box is
  // the rectangle that fits *inside* the ellipse, not the one around it.
  const titleBox: Box = {
    x: centre.x - rx * 0.72,
    y: centre.y - ry * 0.55,
    w: rx * 1.44,
    h: ry * 1.1,
  };
  const block = coverTitleIn(scene.font, scene.title, titleBox, 34);
  centredTitle(scene, block, titleBox, true, panelInk(scene.palette));

  // Sparkles ride the balloon's shoulders, never its middle: a dot over a
  // letter is the one decoration a cover cannot afford.
  const unit = Math.min(inner.w, inner.h) * 0.045;
  mark(scene, 'sparkle', { x: centre.x - rx * 0.92, y: centre.y + ry * 0.72 }, unit, 0);
  mark(scene, 'star', { x: centre.x + rx * 0.95, y: centre.y + ry * 0.55 }, unit * 0.8, 1);
  mark(scene, 'sparkle', { x: centre.x + rx * 0.86, y: centre.y - ry * 0.82 }, unit * 0.7, 2);
  mark(scene, 'star', { x: centre.x - rx * 0.88, y: centre.y - ry * 0.7 }, unit * 0.6, 3);

  const blobBottom = centre.y - ry * (1 + wobble / 2);
  const subtitleY = blobBottom - COVER_SUBTITLE_SIZE * 1.6;
  groundSubtitle(scene, subtitleY);

  sampleStrip(scene, {
    x: inner.x,
    y: band.y,
    w: inner.w,
    h: Math.max(0, subtitleY - COVER_SUBTITLE_SIZE - band.y),
  });

}

/**
 * Kilau: a starburst behind a scalloped cloud. Where the balloon sells one
 * word, this one sells the promise of a whole set — four samples in a row
 * under a panel that reads like a sticker on a toy box.
 */
function burstCover(scene: CoverScene): void {
  const { inner, palette } = scene;
  const top = groundBrand(scene);
  const band = freeBand(scene, inner.y + inner.h - top, inner.h * 0.03);

  // The rays, not the cloud, are what the rest of the page has to clear:
  // everything below is placed off `reach` so no line of copy ever lands on
  // a spike.
  const reach = Math.min(inner.w * 0.5, band.h * 0.32);
  const cloudW = Math.min(inner.w * 0.7, reach * 1.45);
  const cloudH = reach * 0.62;
  const centre = { x: midX(inner), y: band.y + band.h - reach };
  scene.shapes.push(
    decorShape(palette, burstPath(centre, reach, reach * 0.66, 16), 1),
    decorShape(palette, burstPath(centre, reach * 0.82, reach * 0.5, 12, Math.PI / 12), 0),
  );

  const cloudBox: Box = {
    x: centre.x - cloudW / 2,
    y: centre.y - cloudH / 2,
    w: cloudW,
    h: cloudH,
  };
  panelShape(scene, cloudPath(cloudBox, 5, 2));

  const block = coverTitleIn(scene.font, scene.title, inset(cloudBox, cloudH * 0.14), 30);
  centredTitle(scene, block, cloudBox, true, panelInk(palette));

  const subtitleY = centre.y - reach - COVER_SUBTITLE_SIZE * 1.2;
  groundSubtitle(scene, subtitleY);

  sampleStrip(scene, {
    x: inner.x,
    y: band.y,
    w: inner.w,
    h: Math.max(0, subtitleY - COVER_SUBTITLE_SIZE * 1.4 - band.y),
  });

}

/**
 * Jalan Warna: a road winding across the page with the samples riding it.
 * This is the shape a themed pack wants — vehicles, animals, anything that
 * goes somewhere — because the band gives the eye a route through the cover.
 */
function bannerCover(scene: CoverScene): void {
  const { font, inner, palette } = scene;
  let cursor = groundBrand(scene);

  const titleBox: Box = {
    x: inner.x,
    y: cursor - inner.h * 0.2,
    w: inner.w,
    h: inner.h * 0.2,
  };
  const block = coverTitleIn(font, scene.title, titleBox, 34);
  cursor = centredTitle(scene, block, titleBox, true, cardInk(palette)) - block.size * 0.6;

  if (scene.subtitle) {
    cursor -= COVER_SUBTITLE_SIZE * 1.2;
    groundSubtitle(scene, cursor);
    cursor -= COVER_SUBTITLE_SIZE * 0.8;
  }

  const bandTop = cursor - inner.h * 0.02;
  const bandBottom = inner.y + coverFootHeight(scene) + inner.h * 0.02;
  const free = Math.max(60, bandTop - bandBottom);
  // The road keeps to the lower four fifths of the band and the samples ride
  // the crest into the fifth above it, so a letter on the highest bend still
  // has somewhere to stand.
  const bandH = free * 0.78;
  // The road runs off both edges rather than stopping in two rounded stubs,
  // but only part way into the band: the spline that closes the ribbon bulges
  // past its last sampled point, and that bulge has to land on the card too.
  const bleed = Math.min(inner.w * 0.08, (inner.x - scene.art.x) * 0.55);
  const road: Box = { x: inner.x - bleed, y: bandBottom, w: inner.w + bleed * 2, h: bandH };

  const thickness = 0.26;
  const waves = 1.5;
  const half = (bandH * thickness) / 2;
  const amplitude = bandH / 2 - half;
  // Filled even on a mono page — with white — so the samples riding the road
  // sit on top of it instead of having its far edge drawn through them.
  const roadPaint = panelPaint(palette);
  scene.shapes.push(
    pathShape(
      ribbonPath(road, waves, thickness),
      palette.ground ?? roadPaint.fill,
      palette.ground ? undefined : roadPaint.stroke,
    ),
  );

  // The samples ride on the road's own surface: the crest is computed from
  // the same sine the ribbon was drawn from, so they never float off it.
  const picks = scene.samples;
  if (picks.length) {
    const size = Math.min(inner.w / (picks.length + 1), bandH * 0.34);
    const boxes: Box[] = picks.map((_, index) => {
      const t = (index + 0.5) / picks.length;
      // The sample stands on the road's own surface, at the point the
      // ribbon was drawn from: same sine, same phase, so it cannot float.
      const along = (inner.x + inner.w * t - road.x) / road.w;
      const crest =
        road.y + bandH / 2 + Math.sin(along * Math.PI * 2 * waves) * amplitude + half;
      return { x: inner.x + inner.w * t - size / 2, y: crest, w: size, h: size };
    });
    scene.placements.push(
      ...coverSampleArt(font, scene.config, palette, boxes, picks, true, { w: 0.92, h: 0.92 }),
    );
  }

  const unit = Math.min(inner.w, inner.h) * 0.03;
  mark(scene, 'star', { x: inner.x + inner.w * 0.08, y: road.y + bandH * 0.22 }, unit, 0);
  mark(scene, 'sparkle', { x: inner.x + inner.w * 0.93, y: road.y + bandH * 0.78 }, unit, 2);

}

/**
 * Bingkai Ceria: wallpaper. Stars, sparkles and dots tile the whole page and
 * the title sits on a panel cut out of them. The pattern is what a browsing
 * parent registers before they have read a single word.
 */
function frameCover(scene: CoverScene): void {
  const { font, inner, palette } = scene;
  const top = groundBrand(scene);
  const band = freeBand(scene, inner.y + inner.h - top, inner.h * 0.02);

  // Panel and samples sit in the middle of the band, which leaves the
  // pattern a run of clear page above and below. Give the samples the whole
  // lower half instead and the wallpaper has nowhere left to be wallpaper.
  const panelH = Math.min(band.h * 0.26, inner.h * 0.2);
  const stripH = Math.min(band.h * 0.28, inner.h * 0.21);
  const panelTitle = coverTitleIn(
    font,
    scene.title,
    { x: inner.x, y: 0, w: inner.w * 0.82, h: panelH * 0.68 },
    30,
  );
  // The panel is cut to the title it carries. A short title in a full-width
  // bar reads as a gap in the wallpaper rather than as a label on it.
  const panelW = Math.min(
    inner.w * 0.9,
    Math.max(inner.w * 0.5, blockWidth(scene, panelTitle, true) + panelH * 0.8),
  );
  const panelBox: Box = {
    x: midX(inner) - panelW / 2,
    y: band.y + (band.h - panelH - stripH) * 0.62 + stripH,
    w: panelW,
    h: panelH,
  };
  const stripBox: Box = {
    x: inner.x + inner.w * 0.04,
    y: panelBox.y - stripH - inner.h * 0.03,
    w: inner.w * 0.92,
    h: stripH,
  };

  // The pattern covers the page but yields to the two blocks that carry
  // meaning: a doodle whose centre lands on the panel or on a sample is
  // simply not drawn, which is cheaper and cleaner than masking it.
  const clear = (point: { x: number; y: number }, box: Box, pad: number) =>
    point.x < box.x - pad ||
    point.x > box.x + box.w + pad ||
    point.y < box.y - pad ||
    point.y > box.y + box.h + pad;

  const field: Box = { x: inner.x, y: band.y, w: inner.w, h: inner.y + inner.h - band.y };
  const cols = 6;
  const rows = Math.max(4, Math.round((cols * field.h) / field.w));
  const random = seeded(31);
  const unit = Math.min(field.w / cols, field.h / rows) * 0.34;
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const point = {
        x: field.x + ((col + 0.5) / cols) * field.w + (random() - 0.5) * unit,
        y: field.y + ((row + 0.5) / rows) * field.h + (random() - 0.5) * unit,
      };
      index += 1;
      const pad = unit * 0.8;
      if (!clear(point, panelBox, pad) || !clear(point, stripBox, pad)) continue;
      const radius = unit * (0.55 + random() * 0.5);
      if (index % 3 === 0) mark(scene, 'star', point, radius, index);
      else if (index % 3 === 1) mark(scene, 'sparkle', point, radius * 0.9, index);
      else {
        const dot = radius * 0.42;
        const colours = palette.confetti;
        scene.shapes.push({
          kind: 'ellipse',
          x: point.x - dot,
          y: point.y - dot,
          w: dot * 2,
          h: dot * 2,
          color: colours.length ? colours[index % colours.length] : undefined,
          stroke: colours.length ? undefined : { color: palette.headline, width: 1 },
        });
      }
    }
  }

  const paint = panelPaint(palette);
  scene.shapes.push({
    kind: 'rect',
    ...panelBox,
    r: Math.min(panelH / 2, inner.w * 0.06),
    color: paint.fill,
    stroke: paint.stroke,
  });

  const lastBaseline = centredTitle(scene, panelTitle, panelBox, true, panelInk(palette));
  groundSubtitle(scene, lastBaseline - COVER_SUBTITLE_SIZE * 1.8);

  sampleStrip(scene, stripBox);
}

/**
 * Stiker: every sample gets its own outlined card, the way a sticker sheet
 * lays them out, and the title goes on a strip of tape above. The outline is
 * doing the work here — it is what makes a flat panel read as an object.
 */
function stickerCover(scene: CoverScene): void {
  const { font, inner, palette } = scene;
  const top = groundBrand(scene);
  const band = freeBand(scene, inner.y + inner.h - top, inner.h * 0.03);

  const tapeW = inner.w * 0.86;
  const tapeBox: Box = {
    x: midX(inner) - tapeW / 2,
    y: band.y + band.h - inner.h * 0.17,
    w: tapeW,
    h: inner.h * 0.17,
  };
  const paint = panelPaint(palette);
  scene.shapes.push(pathShape(tapePath(tapeBox, 0.03), paint.fill, paint.stroke));

  const block = coverTitleIn(font, scene.title, inset(tapeBox, tapeBox.h * 0.16), 30);
  centredTitle(scene, block, tapeBox, true, panelInk(palette));

  const subtitleY = tapeBox.y - COVER_SUBTITLE_SIZE * 1.6;
  groundSubtitle(scene, subtitleY);

  const cardsTop = subtitleY - COVER_SUBTITLE_SIZE * 1.2;
  const cardsBottom = band.y;
  const picks = scene.samples;
  if (picks.length && cardsTop - cardsBottom > 60) {
    const rows = picks.length > 2 ? 2 : 1;
    const cols = Math.ceil(picks.length / rows);
    const boxes = tile(
      { x: inner.x, y: cardsBottom, w: inner.w, h: cardsTop - cardsBottom },
      cols,
      rows,
      0.06,
    );
    boxes.slice(0, picks.length).forEach((box, index) => {
      const colours = palette.confetti;
      scene.shapes.push({
        kind: 'rect',
        ...box,
        r: Math.min(box.w, box.h) * 0.16,
        color: paint.fill,
        stroke: {
          color: colours.length ? colours[index % colours.length] : palette.headline,
          width: 2,
        },
      });
    });
    scene.placements.push(
      ...coverSampleArt(font, scene.config, palette, boxes, picks, true, { w: 0.66, h: 0.66 }),
    );
  }

}

/**
 * Pelangi: a rainbow arch over the title, with a cloud sitting on each foot.
 * The arch is drawn band by band out of the palette's own confetti colours,
 * so a shop's rainbow is its rainbow rather than the same six every time.
 */
function rainbowCover(scene: CoverScene): void {
  const { font, inner, palette } = scene;
  const top = groundBrand(scene);
  const band = freeBand(scene, inner.y + inner.h - top, inner.h * 0.02);

  // Five bands where the palette has colours to spend, three drawn as
  // outlines where it has none: a solid black half-annulus is a slab, not a
  // rainbow, and it would be the heaviest mark in the whole catalogue.
  const colours = palette.confetti;
  const bands = colours.length || 3;
  // Narrow enough that the feet, and the clouds sitting on them, stay on
  // the page rather than running into the margin.
  const outer = Math.min(inner.w * 0.38, band.h * 0.34);
  const archBase = band.y + band.h - outer;
  const centre = { x: midX(inner), y: archBase };
  const thickness = outer * 0.13;

  for (let index = 0; index < bands; index += 1) {
    const bandOuter = outer - index * thickness;
    const bandInner = bandOuter - thickness * 0.82;
    if (bandInner <= outer * 0.25) break;
    scene.shapes.push(
      colours.length
        ? pathShape(archPath(centre, bandOuter, bandInner), colours[index])
        : pathShape(archPath(centre, bandOuter, bandInner), undefined, {
            color: palette.headline,
            width: 1,
          }),
    );
  }

  // A cloud at each foot: it grounds the arch, and it hides the raw ends of
  // the bands, which is the only place a half-annulus looks unfinished.
  const cloudW = outer * 0.56;
  const cloudH = outer * 0.22;
  const cloudPaint = panelPaint(palette);
  for (const side of [-1, 1]) {
    const box: Box = {
      x: centre.x + side * outer - cloudW / 2,
      y: archBase - cloudH * 0.35,
      w: cloudW,
      h: cloudH,
    };
    scene.shapes.push(pathShape(cloudPath(box, 3, 1), cloudPaint.fill, cloudPaint.stroke));
  }

  const unit = Math.min(inner.w, inner.h) * 0.028;
  mark(scene, 'sparkle', { x: centre.x - outer * 1.05, y: archBase + outer * 0.85 }, unit, 1);
  mark(scene, 'star', { x: centre.x + outer * 1.02, y: archBase + outer * 0.72 }, unit, 3);

  const titleTop = archBase - cloudH * 0.6 - inner.h * 0.015;
  const titleBox: Box = {
    x: inner.x,
    y: titleTop - inner.h * 0.18,
    w: inner.w,
    h: inner.h * 0.18,
  };
  const block = coverTitleIn(font, scene.title, titleBox, 34);
  const lastBaseline = centredTitle(scene, block, titleBox, true, cardInk(palette));

  const subtitleY = lastBaseline - COVER_SUBTITLE_SIZE * 2;
  groundSubtitle(scene, subtitleY);

  sampleStrip(scene, {
    x: inner.x,
    y: band.y,
    w: inner.w,
    h: Math.max(0, subtitleY - COVER_SUBTITLE_SIZE * 1.4 - band.y),
  });

}

/**
 * Custom: the cover the seller laid out themselves in the studio.
 *
 * Every other composition here decides where things go; this one is told.
 * The document stores boxes as fractions of the safe area with the origin at
 * the top-left — the way the editor on screen counts — so the only work is
 * flipping y and multiplying up into points. Nothing is scaled to fit
 * afterwards: what was dragged is what prints.
 */
function customCover(scene: CoverScene): void {
  const doc = scene.config.coverCustom;
  if (!doc) return;
  doc.elements.forEach((element, index) => {
    const box = customBox(scene.inner, element);
    if (element.kind === 'shape') customShape(scene, element, box);
    else if (element.kind === 'sample') customSample(scene, element, box, index);
    else customText(scene, element, box);
  });
}

/** One stored element's box, from fractions of the safe area into points. */
function customBox(inner: Box, element: CoverElement): Box {
  return {
    x: inner.x + element.x * inner.w,
    // The document counts down from the top; a page counts up from the foot.
    y: inner.y + (1 - element.y - element.h) * inner.h,
    w: element.w * inner.w,
    h: element.h * inner.h,
  };
}

/** The doodle library, each shape drawn to fill the box it was given. */
function customShape(scene: CoverScene, element: CoverElement, box: Box): void {
  const { palette } = scene;
  const fill = resolveCoverInk(palette, element.color, palette.headline);
  // An outline is what makes a pale panel survive a photocopier, and what
  // makes any of these read as a sticker rather than as a colour field.
  const stroke = element.outline ? { color: palette.headline, width: 1.2 } : undefined;
  const centre = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  const rx = box.w / 2;
  const ry = box.h / 2;
  const radius = Math.min(rx, ry);

  switch (element.shape) {
    case 'ellipse':
      scene.shapes.push({ kind: 'ellipse', ...box, color: fill, stroke });
      return;
    case 'blob':
      scene.shapes.push(
        pathShape(blobPath(centre, rx, ry, { lobes: 8, wobble: 0.2, seed: 19 }), fill, stroke),
      );
      return;
    case 'cloud':
      scene.shapes.push(pathShape(cloudPath(box), fill, stroke));
      return;
    case 'star':
      scene.shapes.push(pathShape(starPath(centre, radius), fill, stroke));
      return;
    case 'sparkle':
      scene.shapes.push(pathShape(sparklePath(centre, radius), fill, stroke));
      return;
    case 'burst':
      scene.shapes.push(
        pathShape(burstPath(centre, Math.max(rx, ry), Math.min(rx, ry) * 0.62, 16), fill, stroke),
      );
      return;
    case 'arch':
      // A rainbow stands on the foot of its box, so the half-annulus is drawn
      // from the bottom edge rather than from the centre.
      scene.shapes.push(
        pathShape(
          archPath({ x: centre.x, y: box.y }, Math.min(rx, box.h), Math.min(rx, box.h) * 0.45),
          fill,
          stroke,
        ),
      );
      return;
    case 'ribbon':
      scene.shapes.push(pathShape(ribbonPath(box), fill, stroke));
      return;
    case 'tape':
      scene.shapes.push(pathShape(tapePath(box), fill, stroke));
      return;
    default:
      scene.shapes.push({
        kind: 'rect',
        ...box,
        r: Math.min(box.w, box.h) * 0.09,
        color: fill,
        stroke,
      });
  }
}

/** A character from the set, drawn exactly as the worksheets draw it. */
function customSample(scene: CoverScene, element: CoverElement, box: Box, index: number): void {
  const { font, palette, characters } = scene;
  if (!characters.length) return;
  const text = characters[(element.sample ?? 0) % characters.length];
  if (!text) return;
  const strokeBase = STROKES[scene.config.stroke].base;
  const size = fitWithStroke(
    font,
    text,
    box,
    COVER_SAMPLE_RATIO,
    strokeBase,
    'fill',
    bandFor(font, [text]),
  );
  const place = placeFill(font, text, box, size, element.trace ? 'dotted' : 'solid', strokeBase);
  // A traced letter is the empty one a child is about to fill in, so it is
  // never poured full of colour — that is the whole point of the pair.
  if (element.trace) {
    scene.placements.push(place);
    return;
  }
  const ramp = palette.letters;
  const fill = element.color
    ? resolveCoverInk(palette, element.color, palette.headline)
    : ramp.length
      ? ramp[index % ramp.length]
      : undefined;
  scene.placements.push(fill ? { ...place, fill } : place);
}

/** Words — the title, the brand, the tagline, or the seller's own line. */
function customText(scene: CoverScene, element: CoverElement, box: Box): void {
  const { font } = scene;
  const source = element.source ?? 'custom';
  const raw =
    source === 'title'
      ? scene.title
      : source === 'brand'
        ? scene.brand
        : source === 'tagline'
          ? scene.subtitle
          : element.text ?? '';
  const line = safeLine(font, raw.trim());
  // An empty brand or tagline leaves a hole in the page rather than an empty
  // box: nothing is drawn, and the elements around it do not move.
  if (!line) return;

  // Type is fitted to the box it was dragged out, so resizing an element is
  // how the seller sets its size — there is no separate size to keep in sync.
  const block = coverTitleIn(font, line, box, box.h, 6);
  const rainbow = element.rainbow === true;
  const colour = element.color
    ? resolveCoverInk(scene.palette, element.color, scene.palette.headline)
    : scene.palette.headline;
  const backdrop = customBackdrop(scene);
  const ramp = rainbow ? readableInks(scene.palette.letters, backdrop) : [];
  const step = block.size * 1.28;
  const height = block.lines.length * step;
  let cursor = box.y + (box.h + height) / 2 - block.size;

  for (const text of block.lines) {
    const width = rainbow
      ? rainbowWidth(font, text, block.size)
      : textWidth(font, text, block.size);
    const align = element.align ?? 'center';
    const left =
      align === 'left'
        ? box.x
        : align === 'right'
          ? box.x + box.w - width
          : box.x + (box.w - width) / 2;
    if (rainbow && ramp.length) {
      scene.texts.push(...rainbowLine(scene, text, block.size, left, cursor, backdrop));
    } else {
      scene.texts.push({ text, size: block.size, x: left, y: cursor, ink: 1, color: colour });
    }
    cursor -= step;
  }
}

/** What a custom cover's type is sitting on, so a rainbow stays readable. */
function customBackdrop(scene: CoverScene): Cmyk {
  const doc = scene.config.coverCustom;
  const palette = scene.palette;
  if (doc?.ground === 'ground' && palette.ground) return palette.ground;
  if (doc?.ground === 'card' && palette.card) return palette.card;
  return [0, 0, 0, 0];
}

const COVER_COMPOSERS: Record<CoverStyle['page'], (scene: CoverScene) => void> = {
  classic: classicCover,
  poster: posterCover,
  showcase: showcaseCover,
  minimal: minimalCover,
  bubble: bubbleCover,
  burst: burstCover,
  banner: bannerCover,
  frame: frameCover,
  sticker: stickerCover,
  rainbow: rainbowCover,
  custom: customCover,
};

/**
 * The title page a paid download is expected to open with: what the pack is
 * called, who made it, and a taste of what is inside. `coverStyle` picks the
 * composition — one of the ten stock ones, or the seller's own from the
 * studio. Built from the same glyph outlines as the worksheets either way,
 * so the cover is vector too.
 */
function planCover({
  font,
  config,
  paper,
  characters,
  title,
  brand,
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
  // A custom cover answers all three of these for itself: the seller chose
  // the ground and the dots in the studio, so the style's own defaults —
  // which are only there for the listing images — stay out of it.
  const custom = style.page === 'custom' ? config.coverCustom : null;
  // A style may turn the palette's card down; the type still takes its
  // colours, so "Minimalis" reads as restraint rather than as monochrome.
  const carded = custom
    ? custom.ground === 'card' && Boolean(palette.card)
    : style.decoration !== 'none' && Boolean(palette.card);
  // A grounded style floods the page rather than tinting it. "Hitam Putih"
  // has no ground to give, so its colourful covers come out as line art —
  // the same compositions, one plate of black, which is the honest answer
  // rather than a style the palette silently refuses.
  const grounded = custom
    ? custom.ground === 'ground' && Boolean(palette.ground)
    : style.ground && Boolean(palette.ground);
  const base = custom
    ? grounded
      ? palette.ground
      : carded
        ? palette.card
        : null
    : grounded
      ? palette.ground
      : palette.card;
  const confetti = custom ? custom.confetti : style.decoration === 'full';
  // Inside the tinted card, type keeps clear of the rounded corners — and
  // that same band is where the confetti lives.
  const filled = carded || grounded;
  // The colourful compositions run their art to the card's edge — a balloon
  // bulges, a road leaves the page, a rainbow's feet spread — so they are
  // given the quiet band whether or not the palette paid for a card. Without
  // it those overhangs would land inside the 0.5 inch safe margin.
  const banded = filled || COLOURFUL_STYLES.includes(style.id);
  // A custom cover measures its elements against the very box the studio drew
  // them in, so the two can never drift apart.
  const inner = custom ? coverElementArea(paper, config) : banded ? coverBand(art) : art;
  const shapes = base || confetti ? coverDecoration(art, inner, palette, confetti, base) : [];

  const scene: CoverScene = {
    font,
    config,
    palette,
    art,
    inner,
    title: safeLine(font, title) || 'Worksheets',
    brand: safeLine(font, (brand || 'DoodleGen').toUpperCase()),
    // The one line of copy left on a cover is the seller's own. Empty is the
    // default, and empty prints nothing at all.
    subtitle: safeLine(font, config.coverTagline.trim()),
    characters,
    samples: coverSamples(characters, style.samples),
    texts: [],
    rules: [],
    placements: [],
    shapes,
    bodyInk: grounded ? palette.onGround : palette.body,
    brandInk: grounded ? palette.onGround : palette.brand,
    ruleInk: grounded ? palette.onGround : palette.rule,
  };

  COVER_COMPOSERS[style.page](scene);

  return {
    kind: 'cover',
    label: 'Sampul',
    widthPt: paper.widthPt,
    heightPt: paper.heightPt,
    shapes: scene.shapes,
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
      const step = cellStep(config, index, boxes.cells.length);
      // A blank cell is drawn by drawing nothing: the guide lines below still
      // run the full width of the row, so the child has something to sit on.
      if (!step) return;
      const place = placeMetric(font, text, box, cellSize, step.mode, strokeBase, band);
      placements.push(step.ink === undefined ? place : { ...place, ink: step.ink });
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
      // A worksheet draws no shape at all: no colour, and no ornament
      // either. Everything decorative the pack has is on the cover.
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

/**
 * The cover page on its own, so the studio can redraw it on every drag from
 * the very engine that writes the PDF. Nothing about it is a mock-up: what
 * the editor shows is the page.
 */
export function planCoverPage({ font, config, paper, characters }: PlanInput): PagePlan | null {
  if (!characters.length) return null;
  return planCover({
    font,
    config,
    paper,
    characters,
    title: printedTitle(config, characters),
    brand: brandName(config),
    worksheetCount: characters.length,
  });
}

/** Pages in one generated file, front and back matter included. */
export function pageCountOf(config: Config, characters: string[]): number {
  return characters.length + (config.coverPage ? 1 : 0) + (config.termsPage ? 1 : 0);
}

/**
 * The quiet band inside the card: where type and art belong, and where the
 * confetti is scattered around them.
 */
function coverBand(art: Box): Box {
  return inset(art, Math.min(art.w, art.h) * 0.06);
}

/**
 * The box a custom cover's elements are measured against. Exported because
 * the studio has to place its drag handles over exactly this rectangle — the
 * page and the editor share one answer rather than each computing their own.
 */
export function coverElementArea(paper: PaperSpec, config: Config): Box {
  const art = safeArea(paper, config);
  const palette = PALETTES[config.palette];
  const doc = config.coverCustom;
  const carded = doc.ground === 'card' && Boolean(palette.card);
  const grounded = doc.ground === 'ground' && Boolean(palette.ground);
  return carded || grounded || doc.confetti ? coverBand(art) : art;
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
