import type {
  FontId,
  GridId,
  InkId,
  LayoutId,
  PaperId,
  StrokeId,
  StyleId,
  Config,
} from './types';

export const PT_PER_INCH = 72;

export interface PaperSpec {
  id: PaperId;
  label: string;
  note: string;
  widthPt: number;
  heightPt: number;
}

/** Exact trim sizes in PostScript points (1 pt = 1/72 inch). */
export const PAPERS: Record<PaperId, PaperSpec> = {
  a4: {
    id: 'a4',
    label: 'A4',
    note: '210 × 297 mm',
    widthPt: 595.276,
    heightPt: 841.89,
  },
  letter: {
    id: 'letter',
    label: 'US Letter',
    note: '8.5 × 11 in',
    widthPt: 612,
    heightPt: 792,
  },
};

export interface FontSpec {
  id: FontId;
  label: string;
  note: string;
  file: string;
  /** Family name as embedded in the file, used for licence reporting. */
  family: string;
  licence: string;
}

/**
 * Every face here ships under the SIL Open Font License 1.1, which permits
 * commercial use, embedding and redistribution of the resulting PDFs.
 * See FONTS.md for the full provenance trail.
 */
export const FONTS: Record<FontId, FontSpec> = {
  rounded: {
    id: 'rounded',
    label: 'Rounded',
    note: 'Baloo 2 ExtraBold — tebal, ujung membulat',
    file: '/fonts/Baloo2-ExtraBold.ttf',
    family: 'Baloo 2 ExtraBold',
    licence: 'SIL OFL 1.1',
  },
  boldsans: {
    id: 'boldsans',
    label: 'Sans Tebal',
    note: 'Archivo Black — grotesk padat, kontur tegas',
    file: '/fonts/ArchivoBlack-Regular.ttf',
    family: 'Archivo Black',
    licence: 'SIL OFL 1.1',
  },
  playful: {
    id: 'playful',
    label: 'Playful',
    note: 'Fredoka SemiBold — geometris, ramah anak',
    file: '/fonts/Fredoka-SemiBold.ttf',
    family: 'Fredoka SemiBold',
    licence: 'SIL OFL 1.1',
  },
  school: {
    id: 'school',
    label: 'Sekolah',
    note: 'Turunan Andika — bentuk huruf belajar menulis',
    file: '/fonts/DoodleGenSchool-Bold.ttf',
    family: 'DoodleGen School Bold (dari Andika)',
    licence: 'SIL OFL 1.1',
  },
};

export const FONT_ORDER: FontId[] = ['rounded', 'boldsans', 'playful', 'school'];

export interface StyleSpec {
  id: StyleId;
  label: string;
  note: string;
}

export const STYLES: StyleSpec[] = [
  { id: 'outline', label: 'Outline', note: 'Kontur tebal utuh, siap diwarnai' },
  { id: 'dotted', label: 'Titik-titik', note: 'Garis putus untuk ditebalkan' },
  { id: 'combo', label: 'Kombinasi', note: 'Contoh outline + latihan titik-titik' },
];

export interface LayoutSpec {
  id: LayoutId;
  label: string;
  note: string;
}

export const LAYOUTS: LayoutSpec[] = [
  { id: 'single', label: 'Satu Karakter', note: 'Satu huruf besar memenuhi halaman' },
  { id: 'grid', label: 'Grid Latihan', note: 'Karakter berulang dalam kisi' },
  { id: 'worksheet', label: 'Lembar Kerja', note: 'Contoh besar di atas, baris latihan di bawah' },
];

export const GRIDS: Record<GridId, { cols: number; rows: number; label: string }> = {
  '2x2': { cols: 2, rows: 2, label: '2 × 2' },
  '3x3': { cols: 3, rows: 3, label: '3 × 3' },
  '3x4': { cols: 3, rows: 4, label: '3 × 4' },
  '4x5': { cols: 4, rows: 5, label: '4 × 5' },
};

export const GRID_ORDER: GridId[] = ['2x2', '3x3', '3x4', '4x5'];

/** Base stroke weight in points, before the size-dependent multiplier. */
export const STROKES: Record<StrokeId, { label: string; base: number }> = {
  thin: { label: 'Tipis', base: 1.0 },
  medium: { label: 'Sedang', base: 1.5 },
  thick: { label: 'Tebal', base: 2.2 },
};

export const STROKE_ORDER: StrokeId[] = ['thin', 'medium', 'thick'];

/**
 * Ink levels expressed as CMYK K-only values. K-only black stays a single
 * plate on press: no registration drift, no muddy four-colour black, and it
 * photocopies cleanly.
 */
export const INKS: Record<InkId, { label: string; note: string; solid: number; dotted: number; guide: number }> = {
  black: {
    label: 'Hitam Pekat',
    note: 'K100 untuk semua garis',
    solid: 1,
    dotted: 1,
    guide: 0.28,
  },
  soft: {
    label: 'Kontras Lembut',
    note: 'Titik-titik lebih ringan dari outline',
    solid: 1,
    dotted: 0.58,
    guide: 0.22,
  },
};

export const MARGIN_OPTIONS = [0.5, 0.625, 0.75];

/** Hard floor from the print spec: never let art approach the trim edge. */
export const MIN_MARGIN_IN = 0.5;

export const MAX_PAGES = 200;

export const DEFAULT_CONFIG: Config = {
  content: 'letters',
  letterCase: 'upper',
  numberFrom: 1,
  numberTo: 10,
  style: 'outline',
  layout: 'single',
  grid: '3x3',
  font: 'rounded',
  paper: 'both',
  marginIn: 0.5,
  stroke: 'medium',
  ink: 'black',
  guides: true,
  showTitle: false,
  titleTemplate: 'Trace and color — {char}',
};

export function papersFor(choice: Config['paper']): PaperSpec[] {
  if (choice === 'both') return [PAPERS.a4, PAPERS.letter];
  return [PAPERS[choice]];
}
