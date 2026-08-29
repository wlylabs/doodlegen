import { renderTitle } from './charset';
import { GRIDS, MIN_MARGIN_IN, PT_PER_INCH, STROKES } from './presets';
import type {
  Box,
  Config,
  GuideLine,
  LoadedFont,
  Mode,
  PagePlan,
  Placement,
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
}

function frameFor(paper: PaperSpec, config: Config, hasTitle: boolean): Frame {
  const margin = Math.max(config.marginIn, MIN_MARGIN_IN) * PT_PER_INCH;
  const art: Box = {
    x: margin,
    y: margin,
    w: paper.widthPt - margin * 2,
    h: paper.heightPt - margin * 2,
  };
  if (!hasTitle) return { art };

  const size = Math.min(16, art.w * 0.032);
  const band = size * 2.6;
  const top = art.y + art.h;
  return {
    art: { ...art, h: art.h - band },
    title: { size, y: top - size, centerX: art.x + art.w / 2 },
  };
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

/** Builds every page of a document, with tracing sizes harmonised across it. */
export function planDocument({ font, config, paper, characters }: PlanInput): PagePlan[] {
  if (!characters.length) return [];

  const hasTitle = config.showTitle && config.titleTemplate.trim().length > 0;
  const frame = frameFor(paper, config, hasTitle);
  const art = frame.art;
  const strokeBase = STROKES[config.stroke].base;
  const band = bandFor(font, characters);

  const heroRatio = config.layout === 'single' ? HERO_RATIO : WORKSHEET_HERO_RATIO;
  const cellRatio = config.layout === 'single' ? STRIP_RATIO : CELL_RATIO;
  const cellSizes = lockedCellSizes(font, config, art, characters, cellRatio, strokeBase, band);

  return characters.map((text) => {
    const boxes = slotBoxes(art, config, text);
    const placements: Placement[] = [];
    const guides: GuideLine[] = [];

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

    const plan: PagePlan = {
      label: text,
      widthPt: paper.widthPt,
      heightPt: paper.heightPt,
      placements,
      guides,
    };

    if (hasTitle && frame.title) {
      const line = renderTitle(config.titleTemplate, text);
      const safe = font.supports(line);
      if (safe) {
        const run = font.layout(safe);
        const width = (run.advanceWidth * frame.title.size) / font.unitsPerEm;
        plan.title = {
          text: safe,
          size: frame.title.size,
          x: frame.title.centerX - width / 2,
          y: frame.title.y,
        };
      }
    }

    return plan;
  });
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
