export type ContentType = 'letters' | 'numbers' | 'words';
export type LetterCase = 'upper' | 'lower' | 'both';
export type StyleId = 'outline' | 'dotted' | 'combo';
export type LayoutId = 'single' | 'grid' | 'worksheet';
export type GridId = '2x2' | '3x3' | '3x4' | '4x5';
export type FontId = 'rounded' | 'boldsans' | 'playful' | 'school';
export type PaperChoice = 'a4' | 'letter' | 'both';
export type PaperId = 'a4' | 'letter';
export type StrokeId = 'thin' | 'medium' | 'thick';
export type InkId = 'black' | 'soft';
/** Language of everything the buyer reads: cover, licence, footer, read-me. */
export type LanguageId = 'en' | 'id';

export interface Config {
  content: ContentType;
  letterCase: LetterCase;
  numberFrom: number;
  numberTo: number;
  /** Free text for the `words` content type: one entry per line or comma. */
  words: string;
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
  /** Numbered footer on every worksheet, the way a sold pack is expected to read. */
  pageNumbers: boolean;
  /** Branded title page in front of the worksheets. */
  coverPage: boolean;
  /** Licence and usage page at the back, standard for a paid download. */
  termsPage: boolean;
  /** Shop or brand name, printed on the cover, footer and licence page. */
  brand: string;
  /** Product title; empty means "derive it from the character set". */
  productTitle: string;
  /**
   * The language of the printed pack. Listing images are not covered by it:
   * each canvas follows the marketplace it is cut for.
   */
  language: LanguageId;
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

/** A filled line of type: page title, cover copy, footer, licence body. */
export interface TextDraw {
  text: string;
  size: number;
  x: number;
  y: number;
  /** K-only ink level, 0 = white, 1 = solid black. */
  ink: number;
}

/** A hairline rule, used to structure the cover and licence pages. */
export interface RuleDraw {
  x1: number;
  x2: number;
  y: number;
  width: number;
  ink: number;
}

/** Worksheets carry characters; the front and back matter carry type. */
export type PageKind = 'char' | 'cover' | 'terms';

export interface PagePlan {
  kind: PageKind;
  /** The character(s) this page teaches, e.g. "A", "Aa", "17". */
  label: string;
  widthPt: number;
  heightPt: number;
  placements: Placement[];
  guides: GuideLine[];
  texts: TextDraw[];
  rules: RuleDraw[];
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
