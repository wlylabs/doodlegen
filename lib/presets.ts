import { defaultCoverDoc } from './coverDoc';
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
  /** Full licence text, shipped with an exported pack. */
  licenceFile: string;
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
    licenceFile: '/fonts/OFL-baloo2.txt',
  },
  boldsans: {
    id: 'boldsans',
    label: 'Sans Tebal',
    note: 'Archivo Black — grotesk padat, kontur tegas',
    file: '/fonts/ArchivoBlack-Regular.ttf',
    family: 'Archivo Black',
    licence: 'SIL OFL 1.1',
    licenceFile: '/fonts/OFL-archivoblack.txt',
  },
  playful: {
    id: 'playful',
    label: 'Playful',
    note: 'Fredoka SemiBold — geometris, ramah anak',
    file: '/fonts/Fredoka-SemiBold.ttf',
    family: 'Fredoka SemiBold',
    licence: 'SIL OFL 1.1',
    licenceFile: '/fonts/OFL-fredoka.txt',
  },
  school: {
    id: 'school',
    label: 'Sekolah',
    note: 'Turunan Andika — bentuk huruf belajar menulis',
    file: '/fonts/DoodleGenSchool-Bold.ttf',
    family: 'DoodleGen School Bold (dari Andika)',
    licence: 'SIL OFL 1.1',
    licenceFile: '/fonts/OFL-andika.txt',
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
  {
    id: 'progressive',
    label: 'Bertahap',
    note: 'Contoh → titik-titik → samar → kosong, satu halaman',
  },
];

/**
 * How faint the third step of a progressive sheet prints, as a share of the
 * ink its dotted step uses. Light enough to write over, dark enough that a
 * home printer and a photocopier both still put it on the paper.
 */
export const FADED_INK = 0.45;
export const MIN_FADED_INK = 0.28;

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

/** Default page-title wording per pack language, offered when it is switched. */
export const TITLE_TEMPLATES: Record<Config['language'], string> = {
  en: 'Trace and color — {char}',
  id: 'Tebalkan dan warnai — {char}',
};

export const LANGUAGES: { id: Config['language']; label: string; note: string }[] = [
  { id: 'en', label: 'English', note: 'Etsy, Gumroad, TPT, pembeli luar negeri' },
  { id: 'id', label: 'Indonesia', note: 'Shopee, Tokopedia, pembeli dalam negeri' },
];

export const MARGIN_OPTIONS = [0.5, 0.625, 0.75];

/** Hard floor from the print spec: never let art approach the trim edge. */
export const MIN_MARGIN_IN = 0.5;

export const MAX_PAGES = 200;

export const DEFAULT_CONFIG: Config = {
  content: 'letters',
  letterCase: 'upper',
  numberFrom: 1,
  numberTo: 10,
  words: 'Ayah\nBunda\nAdik\nKakak',
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
  pageNumbers: false,
  coverPage: false,
  coverStyle: 'classic',
  coverCustom: defaultCoverDoc(),
  coverTagline: '',
  termsPage: false,
  brand: '',
  productTitle: '',
  language: 'en',
  palette: 'crayon',
  svgFiles: true,
};

/**
 * One-click starting points. Each one is a complete, sellable pack the way
 * the marketplaces actually list them, so a first run needs no decisions.
 */
export interface StarterPreset {
  id: string;
  label: string;
  note: string;
  /** Where this shape of pack normally sells. */
  market: string;
  patch: Partial<Config>;
}

export const STARTER_PRESETS: StarterPreset[] = [
  {
    id: 'etsy-alphabet',
    label: 'Alfabet A–Z Mewarnai',
    note: '26 halaman outline, satu huruf per halaman',
    market: 'Etsy / Gumroad',
    patch: {
      content: 'letters',
      letterCase: 'upper',
      style: 'outline',
      layout: 'single',
      font: 'rounded',
      paper: 'both',
      coverPage: true,
      coverStyle: 'bubble',
      palette: 'crayon',
      termsPage: true,
      pageNumbers: true,
      language: 'en',
    },
  },
  {
    id: 'tracing-worksheet',
    label: 'Lembar Kerja Tracing',
    note: 'Contoh besar + 3 baris latihan bergaris',
    market: 'TPT / Gumroad',
    patch: {
      content: 'letters',
      letterCase: 'both',
      style: 'combo',
      layout: 'worksheet',
      font: 'school',
      paper: 'both',
      guides: true,
      showTitle: true,
      titleTemplate: 'Trace and color — {char}',
      coverPage: true,
      coverStyle: 'rainbow',
      palette: 'pastel',
      termsPage: true,
      pageNumbers: true,
      language: 'en',
    },
  },
  {
    id: 'numbers-1-20',
    label: 'Angka 1–20',
    note: 'Grid latihan menebalkan angka',
    market: 'Shopee / Tokopedia',
    patch: {
      content: 'numbers',
      numberFrom: 1,
      numberTo: 20,
      style: 'combo',
      layout: 'grid',
      grid: '3x3',
      font: 'playful',
      paper: 'a4',
      coverPage: true,
      coverStyle: 'sticker',
      palette: 'pop',
      termsPage: true,
      pageNumbers: true,
      language: 'id',
    },
  },
  {
    id: 'name-practice',
    label: 'Latihan Kata & Nama',
    note: 'Kata sendiri, cocok untuk pesanan custom',
    market: 'Shopee / Etsy custom',
    patch: {
      content: 'words',
      words: 'Ayah\nBunda\nAdik\nKakak\nNenek\nKakek',
      style: 'combo',
      layout: 'worksheet',
      font: 'school',
      paper: 'both',
      guides: true,
      coverPage: true,
      coverStyle: 'banner',
      palette: 'permen',
      termsPage: true,
      pageNumbers: true,
      language: 'id',
    },
  },
];

/** Marketplaces the export kit is shaped for, with their listing rules. */
export interface MarketSpec {
  id: 'etsy' | 'tpt' | 'gumroad' | 'shopee' | 'tokopedia' | 'pinterest';
  label: string;
  /** Hard limits the copy generator has to respect. */
  titleMax: number;
  tagMax: number;
  tagCount: number;
  /** Only where the marketplace actually caps the description field. */
  bodyMax?: number;
  language: 'en' | 'id';
  note: string;
}

export const MARKETS: MarketSpec[] = [
  {
    id: 'etsy',
    label: 'Etsy',
    titleMax: 140,
    tagMax: 20,
    tagCount: 13,
    language: 'en',
    note: 'Judul 140 karakter, 13 tag maksimal 20 karakter',
  },
  {
    id: 'tpt',
    label: 'Teachers Pay Teachers',
    titleMax: 100,
    tagMax: 30,
    tagCount: 8,
    language: 'en',
    note: 'Judul 100 karakter, deskripsi ditujukan ke guru, tag jadi kata kunci',
  },
  {
    id: 'gumroad',
    label: 'Gumroad',
    titleMax: 100,
    tagMax: 30,
    tagCount: 6,
    language: 'en',
    note: 'Deskripsi markdown, sampul 16:9 — dipakai juga di Payhip & Lemon Squeezy',
  },
  {
    id: 'shopee',
    label: 'Shopee',
    titleMax: 120,
    tagMax: 25,
    tagCount: 10,
    bodyMax: 3000,
    language: 'id',
    note: 'Judul bahasa Indonesia, gambar 1:1',
  },
  {
    id: 'tokopedia',
    label: 'Tokopedia',
    titleMax: 70,
    tagMax: 25,
    tagCount: 8,
    bodyMax: 2000,
    language: 'id',
    note: 'Nama produk 70 karakter, deskripsi maksimal 2000 karakter',
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    titleMax: 100,
    tagMax: 24,
    tagCount: 6,
    bodyMax: 500,
    language: 'en',
    note: 'Bukan lapak, tapi sumber trafik: judul pin 100 karakter, deskripsi 500, pin 2:3',
  },
];

export function papersFor(choice: Config['paper']): PaperSpec[] {
  if (choice === 'both') return [PAPERS.a4, PAPERS.letter];
  return [PAPERS[choice]];
}
