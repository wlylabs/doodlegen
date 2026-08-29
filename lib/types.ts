export type ContentType = 'letters' | 'numbers';
export type LetterCase = 'upper' | 'lower' | 'both';
export type StyleId = 'outline' | 'dotted' | 'combo';
export type LayoutId = 'single' | 'grid' | 'worksheet';
export type GridId = '2x2' | '3x3' | '3x4' | '4x5';
export type FontId = 'rounded' | 'boldsans' | 'playful' | 'school';
export type PaperChoice = 'a4' | 'letter' | 'both';
export type PaperId = 'a4' | 'letter';
export type StrokeId = 'thin' | 'medium' | 'thick';
export type InkId = 'black' | 'soft';

export interface Config {
  content: ContentType;
  letterCase: LetterCase;
  numberFrom: number;
  numberTo: number;
  style: StyleId;
  layout: LayoutId;
  grid: GridId;
  font: FontId;
  paper: PaperChoice;
  marginIn: number;
  stroke: StrokeId;
  ink: InkId;
  guides: boolean;
  showTitle: boolean;
  titleTemplate: string;
}

/** A stroke mode for one drawn character group. */
export type Mode = 'solid' | 'dotted';

/** Rectangle in PDF user space (points, origin at bottom-left of the page). */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One character group placed on the page, resolved down to absolute points. */
export interface Placement {
  text: string;
  /** Font size in points. */
  size: number;
  /** Baseline origin, PDF user space. */
  x: number;
  y: number;
  mode: Mode;
  strokeWidth: number;
  /** Dot pitch in points; only meaningful when mode === 'dotted'. */
  dotGap: number;
}

export interface GuideLine {
  x1: number;
  x2: number;
  y: number;
  kind: 'base' | 'mid' | 'cap';
}

export interface TitleDraw {
  text: string;
  size: number;
  x: number;
  y: number;
}

export interface PagePlan {
  /** The character(s) this page teaches, e.g. "A", "Aa", "17". */
  label: string;
  widthPt: number;
  heightPt: number;
  placements: Placement[];
  guides: GuideLine[];
  title?: TitleDraw;
}

/** Minimal slice of the fontkit API this app relies on. */
export interface GlyphLike {
  id: number;
  advanceWidth: number;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  path: { toSVG(): string };
}

export interface GlyphRun {
  glyphs: GlyphLike[];
  positions: { xAdvance: number; yAdvance: number; xOffset: number; yOffset: number }[];
  advanceWidth: number;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface LoadedFont {
  id: FontId;
  bytes: ArrayBuffer;
  unitsPerEm: number;
  ascent: number;
  descent: number;
  capHeight: number;
  xHeight: number;
  layout(text: string): GlyphRun;
  /** Memoised glyph outline as SVG path data, in font units, y-up. */
  svgPath(glyph: GlyphLike): string;
  /** Strips any codepoint the face has no glyph for, so nothing renders as tofu. */
  supports(text: string): string;
}
