import { renderTitle, subjectOf } from './charset';
import { FONTS, GRIDS, MIN_MARGIN_IN, PT_PER_INCH, STROKES } from './presets';
import { brandName, productTitle } from './naming';
import type {
  Box,
  Config,
  GuideLine,
  LoadedFont,
  Mode,
  PagePlan,
  Placement,
  RuleDraw,
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
 * The title page a paid download is expected to open with: who made it, what
 * is inside, and what it prints as. Built from the same glyph outlines as the
 * worksheets, so the cover is vector too.
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
  const margin = Math.max(config.marginIn, MIN_MARGIN_IN) * PT_PER_INCH;
  const art: Box = {
    x: margin,
    y: margin,
    w: paper.widthPt - margin * 2,
    h: paper.heightPt - margin * 2,
  };
  const texts: TextDraw[] = [];
  const rules: RuleDraw[] = [];
  const placements: Placement[] = [];

  let cursor = art.y + art.h; // walking down from the top of the safe area

  const brandLine = safeLine(font, (brand || 'DoodleGen').toUpperCase());
  if (brandLine) {
    const size = 10;
    cursor -= size;
    texts.push(centred(font, brandLine, size, art, cursor, 0.45));
    cursor -= size * 0.9;
    rules.push({ x1: art.x, x2: art.x + art.w, y: cursor, width: 0.6, ink: 0.22 });
  }

  cursor -= art.h * 0.06;

  const titleLines = wrapText(font, safeLine(font, title) || 'Worksheets', 30, art.w * 0.94).slice(0, 3);
  const titleSize = Math.min(30, ...titleLines.map((line) => fitLine(font, line, 30, art.w * 0.94)));
  for (const line of titleLines) {
    cursor -= titleSize;
    texts.push(centred(font, line, titleSize, art, cursor, 1));
    cursor -= titleSize * 0.28;
  }

  const papers = config.paper === 'both' ? 'A4 + US Letter' : paper.label;
  const subtitle = safeLine(font, `${worksheetCount} halaman siap cetak — ${papers}`);
  if (subtitle) {
    const size = 12;
    cursor -= size * 1.4;
    texts.push(centred(font, subtitle, size, art, cursor, 0.5));
  }

  // A strip of real sample characters, drawn exactly as the pages draw them.
  const sampleTexts = [
    characters[0],
    characters[Math.floor(characters.length / 2)],
    characters[characters.length - 1],
  ].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);

  const specLines = [
    safeLine(font, 'Vector 300 DPI — margin aman 0.5 inci — tinta hitam K100'),
    safeLine(font, 'Cetak ulang sebanyak yang dibutuhkan untuk pemakaian pribadi dan kelas'),
  ].filter(Boolean);

  const specSize = 10;
  const specBlock = specLines.length * specSize * 1.9 + specSize * 2;
  const stripTop = cursor - art.h * 0.04;
  const stripBottom = art.y + specBlock + art.h * 0.04;
  const free = stripTop - stripBottom;
  // The samples sit in the middle of whatever the copy left, capped so three
  // letters never grow into a second cover of their own.
  const stripH = Math.min(free, art.h * 0.42);

  if (sampleTexts.length && stripH > 20) {
    const top = stripTop - (free - stripH) / 2;
    const boxes = strip({ x: art.x, y: top - stripH, w: art.w, h: stripH }, sampleTexts.length, 0.04);
    const strokeBase = STROKES[config.stroke].base;
    sampleTexts.forEach((text, index) => {
      const box = boxes[index];
      const size = fitWithStroke(font, text, box, { w: 0.82, h: 0.82 }, strokeBase, 'fill', bandFor(font, [text]));
      placements.push(
        placeFill(font, text, box, size, index === sampleTexts.length - 1 ? 'dotted' : 'solid', strokeBase),
      );
    });
  }

  let bottom = art.y + specSize * 0.4;
  for (let i = specLines.length - 1; i >= 0; i -= 1) {
    texts.push(centred(font, specLines[i], specSize, art, bottom, 0.45));
    bottom += specSize * 1.9;
  }
  rules.push({ x1: art.x, x2: art.x + art.w, y: bottom - specSize * 0.6, width: 0.6, ink: 0.22 });

  return {
    kind: 'cover',
    label: 'Sampul',
    widthPt: paper.widthPt,
    heightPt: paper.heightPt,
    placements,
    guides: [],
    texts,
    rules,
  };
}

interface TermsSection {
  heading: string;
  body: string[];
}

function termsSections(
  brand: string,
  fontFamily: string,
  contents: string,
): TermsSection[] {
  const owner = brand || 'the seller';
  return [
    {
      heading: 'Isi paket / What is inside',
      body: [contents],
    },
    {
      heading: 'Tips mencetak / Printing tips',
      body: [
        'Cetak pada ukuran asli 100% tanpa "fit to page", pakai kertas 80-120 gsm agar krayon tidak tembus.',
        'Print at 100% scale with page scaling off, on 80-120 gsm paper, in black and white or greyscale.',
      ],
    },
    {
      heading: 'Yang boleh dilakukan / What you may do',
      body: [
        'Cetak ulang tanpa batas untuk pemakaian pribadi, keluarga, kelas, atau perpustakaan.',
        'Print an unlimited number of copies for personal, family, classroom or library use.',
      ],
    },
    {
      heading: 'Yang tidak boleh / What you may not do',
      body: [
        'Menjual kembali, membagikan, atau mengunggah ulang berkas PDF ini, baik utuh maupun sebagian.',
        'Resell, share, or re-upload this PDF file, in whole or in part, and do not claim it as your own work.',
      ],
    },
    {
      heading: 'Font & lisensi / Fonts and licence',
      body: [
        `Huruf pada berkas ini memakai ${fontFamily}, dilisensikan di bawah SIL Open Font License 1.1.`,
        'The embedded typeface is licensed under the SIL Open Font License 1.1, which permits this use.',
      ],
    },
    {
      heading: 'Hak cipta / Copyright',
      body: [
        `Isi berkas ini adalah milik ${owner}. Semua hak dilindungi.`,
        `This file and its contents belong to ${owner}. All rights reserved.`,
      ],
    },
  ];
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

  let cursor = art.y + art.h;

  const titleSize = 20;
  cursor -= titleSize;
  texts.push({
    text: safeLine(font, 'Ketentuan Penggunaan / Terms of Use'),
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
  const papers = config.paper === 'both' ? 'A4 dan US Letter' : paper.label;
  const contents = `${worksheetCount} halaman latihan dalam format PDF, ${papers}, siap cetak berulang kali.`;
  for (const section of termsSections(brand, fontFamily, contents)) {
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

  const footer = safeLine(font, 'Dibuat dengan DoodleGen — halaman mewarnai dan tracing siap cetak');
  texts.push(centred(font, footer, 9.5, art, art.y + 4, 0.4));
  rules.push({ x1: art.x, x2: art.x + art.w, y: art.y + 18, width: 0.6, ink: 0.2 });

  return {
    kind: 'terms',
    label: 'Lisensi',
    widthPt: paper.widthPt,
    heightPt: paper.heightPt,
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
  const title = productTitle(config, characters).id;
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
    ...(config.termsPage ? [planTerms(matter, FONTS[config.font].family)] : []),
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
