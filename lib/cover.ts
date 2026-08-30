import { COVER_STYLES, coverSamples, sheetCount, type CoverStyle } from './covers';
import { planDocument } from './geometry';
import { brandName, packSlug, productTitle } from './naming';
import { PALETTES, cmykToHex, readableInks, type Palette } from './palette';
import { PAPERS, papersFor } from './presets';
import { sheetShapes } from './svg';
import type { Cmyk, Config, LanguageId, LoadedFont, PagePlan } from './types';

/**
 * Listing images are the half of a digital product the marketplaces judge
 * first. These are drawn from the very pages that are in the PDF — same
 * outlines, same layout engine — so the picture cannot promise something the
 * file does not contain.
 */
/**
 * A listing needs a set, not a picture.
 *
 * One cover sells the idea; the rest answer the questions that stop a
 * digital sale. `grid` proves every page exists, which is the thing a buyer
 * of a 26-page PDF cannot check before paying. `mockup` shows the sheets as
 * paper on a table, because a flat PDF thumbnail reads as a file rather than
 * as something a child will hold. `steps` says out loud that nothing is
 * shipped and how the file arrives — the question Indonesian sellers answer
 * in chat all day.
 *
 * All of it is drawn from the same page plans as the PDF, in vector, with no
 * stock photography: a mockup with someone else's photo in it carries
 * someone else's licence into a seller's shop.
 */
export type ImageKind = 'cover' | 'grid' | 'mockup' | 'steps';

export interface ImageSpec {
  id: string;
  label: string;
  note: string;
  kind: ImageKind;
  width: number;
  height: number;
  /** Which marketplace asks for this canvas. */
  market: string;
  /**
   * The language that marketplace's buyers read. An Etsy listing image in
   * Indonesian sells nothing, and neither does a Shopee one in English, so
   * this is not the seller's choice to make.
   */
  language: LanguageId;
}

export const IMAGE_SPECS: ImageSpec[] = [
  {
    id: 'etsy',
    label: 'Etsy 2000 × 2000',
    note: 'Gambar utama listing, rasio 1:1',
    kind: 'cover',
    width: 2000,
    height: 2000,
    market: 'Etsy',
    language: 'en',
  },
  {
    id: 'etsy-inside',
    label: 'Etsy — isi lengkap',
    note: 'Semua halaman dalam satu kisi, bukti isi paket',
    kind: 'grid',
    width: 2000,
    height: 2000,
    market: 'Etsy',
    language: 'en',
  },
  {
    id: 'etsy-mockup',
    label: 'Etsy — mockup kertas',
    note: 'Lembaran seperti sudah dicetak dan tergeletak di meja',
    kind: 'mockup',
    width: 2000,
    height: 2000,
    market: 'Etsy',
    language: 'en',
  },
  {
    id: 'etsy-steps',
    label: 'Etsy — cara kerja',
    note: 'Tiga langkah: beli, unduh, cetak',
    kind: 'steps',
    width: 2000,
    height: 2000,
    market: 'Etsy',
    language: 'en',
  },
  {
    id: 'tpt',
    label: 'TPT 1200 × 1600',
    note: 'Sampul produk, rasio 3:4',
    kind: 'cover',
    width: 1200,
    height: 1600,
    market: 'Teachers Pay Teachers',
    language: 'en',
  },
  {
    id: 'tpt-inside',
    label: 'TPT — isi lengkap',
    note: 'Kisi semua halaman untuk halaman preview',
    kind: 'grid',
    width: 1200,
    height: 1600,
    market: 'Teachers Pay Teachers',
    language: 'en',
  },
  {
    id: 'gumroad',
    label: 'Gumroad 1280 × 720',
    note: 'Sampul produk, rasio 16:9',
    kind: 'cover',
    width: 1280,
    height: 720,
    market: 'Gumroad',
    language: 'en',
  },
  {
    id: 'gumroad-thumb',
    label: 'Gumroad 600 × 600',
    note: 'Thumbnail persegi untuk kartu produk',
    kind: 'cover',
    width: 600,
    height: 600,
    market: 'Gumroad',
    language: 'en',
  },
  {
    id: 'shopee',
    label: 'Shopee 1200 × 1200',
    note: 'Foto produk utama, rasio 1:1',
    kind: 'cover',
    width: 1200,
    height: 1200,
    market: 'Shopee / Tokopedia',
    language: 'id',
  },
  {
    id: 'shopee-inside',
    label: 'Shopee — isi lengkap',
    note: 'Foto kedua: semua halaman dalam satu kisi',
    kind: 'grid',
    width: 1200,
    height: 1200,
    market: 'Shopee / Tokopedia',
    language: 'id',
  },
  {
    id: 'shopee-steps',
    label: 'Shopee — cara kerja',
    note: 'Foto ketiga: file digital, tidak ada barang dikirim',
    kind: 'steps',
    width: 1200,
    height: 1200,
    market: 'Shopee / Tokopedia',
    language: 'id',
  },
  {
    id: 'pinterest',
    label: 'Pinterest 1000 × 1500',
    note: 'Pin promosi, rasio 2:3',
    kind: 'cover',
    width: 1000,
    height: 1500,
    market: 'Pinterest',
    language: 'en',
  },
];

export interface GeneratedImage {
  id: string;
  name: string;
  label: string;
  width: number;
  height: number;
  bytes: Uint8Array;
  size: number;
  /** Object URL for on-screen preview; revoke when the set is replaced. */
  url: string;
}

const INK = '#1C1917';
const MUTED = '#6B625C';
const ACCENT = '#C2410C';
const PAPER = '#FBF6F1';
const CARD = '#FFFFFF';

/** The palette, resolved to screen colours the canvas can use directly. */
interface Skin {
  background: string;
  headline: string;
  brand: string;
  body: string;
  /** For marks that sit on their own white chip rather than on the ground. */
  accent: string;
  confetti: string[];
  /** The ramp a rainbow headline is spelled out in; empty means one colour. */
  letters: string[];
  /** True when the canvas is flooded rather than tinted. */
  grounded: boolean;
}

function skinOf(palette: Palette, style: CoverStyle): Skin {
  // A listing image that stayed pale while the cover shouted would be the
  // one place the two disagree, and it is the half a buyer sees first. So
  // the ground, and the rainbow, come across.
  const grounded = style.ground && Boolean(palette.ground);
  const onGround = grounded ? cmykToHex(palette.onGround) : null;
  // A style that prints on bare paper is shown on bare paper here too.
  // The headline sits straight on this, with no panel under it the way the
  // printed cover has, so it is also what the letter ramp has to survive.
  const backdrop: Cmyk = grounded
    ? (palette.ground as Cmyk)
    : palette.card && style.decoration !== 'none'
      ? palette.card
      : [0, 0, 0, 0];
  const background =
    grounded || (palette.card && style.decoration !== 'none') ? cmykToHex(backdrop) : PAPER;
  return {
    background,
    headline: onGround ?? (palette.card ? cmykToHex(palette.headline) : INK),
    brand: onGround ?? (palette.card ? cmykToHex(palette.brand) : ACCENT),
    body: onGround ?? (palette.card ? cmykToHex(palette.body) : MUTED),
    // Badges are drawn on their own white pill, so their accent is measured
    // against white — never against the ground the rest of the copy sits on.
    accent: palette.card ? cmykToHex(palette.brand) : ACCENT,
    confetti: palette.confetti.map(cmykToHex),
    letters: style.rainbowTitle
      ? readableInks(palette.letters, backdrop).map(cmykToHex)
      : [],
    grounded,
  };
}

/**
 * Pours palette colour into a page's solid characters. A listing image that
 * shows one sheet already coloured tells a buyer what the pack is for faster
 * than any caption can.
 */
function colourised(plan: PagePlan, palette: Palette): PagePlan {
  if (!palette.letters.length) return plan;
  let index = 0;
  return {
    ...plan,
    placements: plan.placements.map((place) =>
      place.mode === 'dotted'
        ? place
        : { ...place, fill: palette.letters[index++ % palette.letters.length] },
    ),
  };
}

const BRAND_STACK = "'DoodleGen Brand', system-ui, -apple-system, Segoe UI, sans-serif";
const TEXT_STACK = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

/**
 * How far apart the wordmark's letters are set, as a fraction of its size.
 * The printed cover tracks its imprint out by the same fraction, and that
 * shared number is most of what makes the two read as the same mark.
 */
const IMPRINT_TRACK = 0.16;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Greedy wrap against the canvas's own measurement of the chosen face. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  return lines;
}

/**
 * A title like "Angka 1-10 - Outline" reads as two thoughts, so the dash is
 * treated as a line break rather than a word that can be left dangling.
 */
function titleSegments(text: string): string[] {
  return text
    .split(/\s+[—–-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Shrinks a headline until its longest line fits, rather than clipping it. */
function fitHeadline(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  startSize: number,
  minSize: number,
): { lines: string[]; size: number } {
  const segments = titleSegments(text);
  let size = startSize;
  for (;;) {
    ctx.font = `600 ${size}px ${BRAND_STACK}`;
    const lines = segments.flatMap((segment) => wrap(ctx, segment, maxWidth, maxLines)).slice(0, maxLines);
    const widest = Math.max(...lines.map((line) => ctx.measureText(line).width), 0);
    if (widest <= maxWidth || size <= minSize) return { lines, size };
    size -= Math.max(2, Math.round(size * 0.06));
  }
}

/** Largest size at or below `start` where every line still fits the column. */
function fitLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  maxWidth: number,
  start: number,
  weight = 500,
): number {
  let size = start;
  while (size > start * 0.55) {
    ctx.font = `${weight} ${size}px ${TEXT_STACK}`;
    if (lines.every((line) => ctx.measureText(line).width <= maxWidth)) break;
    size -= 1;
  }
  return size;
}

function drawSheetCard(
  ctx: CanvasRenderingContext2D,
  font: LoadedFont,
  plan: PagePlan,
  config: Config,
  x: number,
  y: number,
  width: number,
  rotation = 0,
) {
  const scale = width / plan.widthPt;
  const height = plan.heightPt * scale;
  const shapes = sheetShapes(font, plan, config);

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-width / 2, -height / 2);

  ctx.save();
  ctx.shadowColor = 'rgba(28,25,23,0.20)';
  ctx.shadowBlur = width * 0.07;
  ctx.shadowOffsetY = width * 0.025;
  ctx.fillStyle = CARD;
  roundRect(ctx, 0, 0, width, height, width * 0.02);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, 0, 0, width, height, width * 0.02);
  ctx.clip();
  ctx.scale(scale, scale);

  for (const area of shapes.areas) {
    if (area.kind === 'path') {
      const outline = new Path2D(area.d ?? '');
      if (area.color) {
        ctx.fillStyle = area.color;
        ctx.fill(outline);
      }
      if (area.stroke) {
        ctx.strokeStyle = area.stroke.color;
        ctx.lineWidth = area.stroke.width;
        ctx.stroke(outline);
      }
      continue;
    }
    ctx.beginPath();
    if (area.kind === 'ellipse') {
      ctx.ellipse(area.x + area.w / 2, area.y + area.h / 2, area.w / 2, area.h / 2, 0, 0, Math.PI * 2);
    } else {
      roundRect(ctx, area.x, area.y, area.w, area.h, area.r);
    }
    if (area.color) {
      ctx.fillStyle = area.color;
      ctx.fill();
    }
    if (area.stroke) {
      ctx.strokeStyle = area.stroke.color;
      ctx.lineWidth = area.stroke.width;
      ctx.stroke();
    }
  }

  ctx.lineCap = 'butt';
  for (const guide of shapes.guides) {
    ctx.strokeStyle = guide.color;
    ctx.lineWidth = guide.width;
    ctx.setLineDash(guide.dash ? guide.dash.split(' ').map(Number) : []);
    ctx.beginPath();
    ctx.moveTo(guide.x1, guide.y1);
    ctx.lineTo(guide.x2, guide.y2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const glyph of shapes.glyphs) {
    const path = new Path2D(glyph.d);
    ctx.save();
    ctx.translate(glyph.x, glyph.y);
    ctx.scale(glyph.scale, -glyph.scale);
    if (glyph.filled) {
      ctx.fillStyle = glyph.color;
      ctx.fill(path);
    } else {
      ctx.strokeStyle = glyph.color;
      ctx.lineWidth = glyph.strokeWidth;
      ctx.setLineDash(glyph.dashUnits === undefined ? [] : [0.01 / glyph.scale, glyph.dashUnits]);
      ctx.stroke(path);
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
  ctx.restore();

  ctx.restore();
  return height;
}

/**
 * One line of the headline, in the cover's own voice: a single colour, or
 * the palette's ramp one letter at a time with every second letter riding a
 * shade high. The caller has already set the face and the alignment.
 */
function drawHeadlineLine(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  line: string,
  x: number,
  y: number,
  size: number,
) {
  if (!skin.letters.length) {
    ctx.fillStyle = skin.headline;
    ctx.fillText(line, x, y);
    return;
  }

  const letters = [...line];
  const widths = letters.map((letter) => ctx.measureText(letter).width);
  const total = widths.reduce((sum, width) => sum + width, 0);
  const align = ctx.textAlign;
  let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;

  ctx.textAlign = 'left';
  letters.forEach((letter, index) => {
    ctx.fillStyle = skin.letters[index % skin.letters.length];
    ctx.fillText(letter, cursor, y + (index % 2 === 0 ? size * 0.04 : -size * 0.04));
    cursor += widths[index];
  });
  ctx.textAlign = align;
}

function drawPills(
  ctx: CanvasRenderingContext2D,
  labels: string[],
  centerX: number | null,
  left: number,
  y: number,
  size: number,
  accent: string,
) {
  // Self-contained: the caller may have left the context centred or
  // right-aligned, and a badge row has to lay itself out from the left.
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${size}px ${TEXT_STACK}`;
  const padX = size * 0.9;
  const height = size * 2.4;
  const gap = size * 0.6;
  const widths = labels.map((label) => ctx.measureText(label).width + padX * 2);
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (labels.length - 1);
  let x = centerX === null ? left : centerX - total / 2;

  labels.forEach((label, index) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = 'rgba(28,25,23,0.12)';
    ctx.lineWidth = Math.max(1, size * 0.06);
    roundRect(ctx, x, y, widths[index], height, height / 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = index === 0 ? accent : MUTED;
    ctx.fillText(label, x + padX, y + height / 2 + size * 0.04);
    x += widths[index] + gap;
  });

  ctx.restore();
  return height;
}

function drawBrandLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  align: CanvasTextAlign,
  color: string,
) {
  ctx.save();
  // The wordmark is set in the product's own face, not the interface stack.
  // Drawn in system-ui it came out as whatever sans the viewer's OS happens
  // to ship — a different typeface from every other word on the image, which
  // is what made a shop's name read as a stamp pressed onto someone else's
  // cover rather than as part of it.
  ctx.font = `600 ${size}px ${BRAND_STACK}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  // Canvas has no letter-spacing everywhere yet, so it is drawn by hand.
  const letters = [...text.toUpperCase()];
  // The same tracking the printed cover's imprint is set at, so the listing
  // image and the file a buyer opens carry one mark, not two.
  const spacing = size * IMPRINT_TRACK;
  const width = letters.reduce((sum, ch) => sum + ctx.measureText(ch).width + spacing, -spacing);
  let cursor = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  ctx.textAlign = 'left';
  for (const letter of letters) {
    ctx.fillText(letter, cursor, y);
    cursor += ctx.measureText(letter).width + spacing;
  }
  ctx.restore();
}

interface Scene {
  title: string;
  brand: string;
  subtitle: string;
  pills: string[];
  bullets: string[];
  plans: PagePlan[];
  /** Every worksheet, for the canvas whose job is to prove they exist. */
  pages: PagePlan[];
  /** How many pages the pack really has, when `pages` had to be sampled. */
  pageCount: number;
  font: LoadedFont;
  config: Config;
  skin: Skin;
  /** The cover style the seller picked; the sheets follow it. */
  style: CoverStyle;
  /** Copy for the canvases that are not the cover. */
  extras: {
    inside: string;
    insideNote: string;
    table: string;
    tableNote: string;
    how: string;
    steps: [string, string, string];
    note: string;
  };
}

/** A rectangle in canvas space, y growing downward. */
interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Trim proportion of every page in the pack, height over width. */
const SHEET_RATIO = 1.414;

/**
 * Lays the sheet mockups inside an area, in whichever arrangement the cover
 * style asks for. The sheets are the same page plans the PDF prints, so the
 * arrangement is the only thing the listing image gets to choose.
 */
function drawSheets(ctx: CanvasRenderingContext2D, scene: Scene, area: Area) {
  const { plans } = scene;
  if (!plans.length) return;
  const place = (plan: PagePlan, x: number, y: number, width: number, rotation = 0) =>
    drawSheetCard(ctx, scene.font, plan, scene.config, x, y, width, rotation);

  if (scene.style.sheets === 'hero') {
    // The single sheet is the coloured one: at thumbnail size, one page a
    // buyer can actually read beats three they cannot.
    const width = Math.min(area.w * 0.72, area.h / SHEET_RATIO);
    place(
      plans[plans.length - 1],
      area.x + (area.w - width) / 2,
      area.y + (area.h - width * SHEET_RATIO) / 2,
      width,
    );
    return;
  }

  if (scene.style.sheets === 'grid') {
    const picks = plans.slice(0, 4);
    // A band far wider than it is tall takes one row: two rows there would
    // shrink every sheet to a stamp nobody can read at listing size.
    const cols = area.w / area.h > 1.6 || picks.length <= 2 ? picks.length : 2;
    const rows = Math.ceil(picks.length / cols);
    const gap = Math.min(area.w, area.h) * 0.05;
    const width = Math.min(
      (area.w - gap * (cols - 1)) / cols,
      (area.h - gap * (rows - 1)) / rows / SHEET_RATIO,
    );
    const height = width * SHEET_RATIO;
    const blockW = width * cols + gap * (cols - 1);
    const blockH = height * rows + gap * (rows - 1);
    picks.forEach((plan, index) =>
      place(
        plan,
        area.x + (area.w - blockW) / 2 + (index % cols) * (width + gap),
        area.y + (area.h - blockH) / 2 + Math.floor(index / cols) * (height + gap),
        width,
      ),
    );
    return;
  }

  if (scene.style.sheets === 'row') {
    const picks = plans.slice(0, 3);
    const gap = area.w * 0.035;
    const width = Math.min(
      (area.w - gap * (picks.length - 1)) / picks.length,
      area.h / SHEET_RATIO,
    );
    const total = width * picks.length + gap * (picks.length - 1);
    picks.forEach((plan, index) =>
      place(
        plan,
        area.x + (area.w - total) / 2 + index * (width + gap),
        area.y + (area.h - width * SHEET_RATIO) / 2,
        width,
      ),
    );
    return;
  }

  // fan: enough overlap to read as a stack, little enough that each sheet
  // still shows the character it is teaching.
  const picks = plans.slice(0, 3);
  const overlap = 0.8;
  const span = 1 + overlap * (picks.length - 1);
  const stagger = area.h * 0.05;
  const width = Math.min(area.w / span, (area.h - stagger) / SHEET_RATIO);
  const left = area.x + (area.w - width * span) / 2;
  const top = area.y + (area.h - width * SHEET_RATIO - stagger) / 2;
  const centre = (picks.length - 1) / 2;
  picks.forEach((plan, index) =>
    place(
      plan,
      left + index * width * overlap,
      top + Math.abs(index - centre) * stagger,
      width,
      (index - centre) * 7,
    ),
  );
}

/** Dots around the canvas edge, mirroring the cover page's border band. */
function drawConfetti(ctx: CanvasRenderingContext2D, W: number, H: number, colors: string[]) {
  if (!colors.length) return;
  const unit = Math.min(W, H) * 0.016;
  const spots: [number, number, number][] = [
    [0.06, 0.08, 1], [0.15, 0.03, 0.55], [0.93, 0.06, 0.85], [0.97, 0.16, 0.5],
    [0.04, 0.42, 0.7], [0.96, 0.52, 0.95], [0.05, 0.78, 0.9], [0.94, 0.86, 0.6],
    [0.12, 0.95, 0.75], [0.5, 0.975, 0.45], [0.82, 0.96, 1],
  ];
  spots.forEach(([x, y, r], index) => {
    ctx.fillStyle = colors[index % colors.length];
    ctx.beginPath();
    ctx.arc(W * x, H * y, unit * r, 0, Math.PI * 2);
    ctx.fill();
  });
}


/**
 * Proof of contents: every page in the pack, small but legible, in one
 * picture. A buyer of a printable cannot open the file before paying, and
 * this is the canvas that answers what they are actually getting — the one
 * a shop with a refund policy needs most.
 */
function paintGrid(ctx: CanvasRenderingContext2D, spec: ImageSpec, scene: Scene) {
  const { width: W, height: H } = spec;
  const { skin, pages } = scene;
  const unit = Math.min(W, H);
  const pad = W * 0.055;

  ctx.fillStyle = skin.background;
  ctx.fillRect(0, 0, W, H);

  drawBrandLine(ctx, scene.brand, W / 2, H * 0.075, unit * 0.024, 'center', skin.brand);

  const headline = fitHeadline(ctx, scene.extras.inside, W - pad * 2, 1, unit * 0.072, unit * 0.044);
  ctx.textAlign = 'center';
  const headY = H * 0.145;
  drawHeadlineLine(ctx, skin, headline.lines[0] ?? '', W / 2, headY, headline.size);

  const noteSize = unit * 0.03;
  ctx.font = `500 ${noteSize}px ${TEXT_STACK}`;
  ctx.fillStyle = skin.body;
  ctx.fillText(scene.extras.insideNote, W / 2, headY + noteSize * 1.9);

  const top = headY + noteSize * 3.4;
  const footSize = unit * 0.026;
  const footY = H - unit * 0.05;
  const areaH = footY - footSize * 2.2 - top;
  const areaW = W - pad * 2;
  const count = pages.length;
  if (!count) return;

  // Columns are chosen, not fixed: the arrangement that makes the sheets as
  // large as the area allows is the one a buyer can actually read.
  let best = { cols: 1, size: 0 };
  for (let cols = 2; cols <= 8; cols += 1) {
    const rows = Math.ceil(count / cols);
    const gap = areaW * 0.018;
    const byWidth = (areaW - gap * (cols - 1)) / cols;
    const byHeight = (areaH - gap * (rows - 1)) / rows / SHEET_RATIO;
    const size = Math.min(byWidth, byHeight);
    if (size > best.size) best = { cols, size };
  }

  const gap = areaW * 0.018;
  const rows = Math.ceil(count / best.cols);
  const gridW = best.size * best.cols + gap * (best.cols - 1);
  const gridH = best.size * SHEET_RATIO * rows + gap * (rows - 1);
  const startX = (W - gridW) / 2;
  const startY = top + Math.max(0, (areaH - gridH) / 2);

  pages.forEach((plan, index) => {
    const column = index % best.cols;
    const row = Math.floor(index / best.cols);
    drawSheetCard(
      ctx,
      scene.font,
      plan,
      scene.config,
      startX + column * (best.size + gap),
      startY + row * (best.size * SHEET_RATIO + gap),
      best.size,
    );
  });

  ctx.font = `500 ${footSize}px ${TEXT_STACK}`;
  ctx.fillStyle = skin.body;
  ctx.textAlign = 'center';
  ctx.fillText(scene.bullets[1] ?? scene.subtitle, W / 2, footY);
}

/** A crayon, drawn rather than photographed, so nothing carries a licence. */
function drawCrayon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  colour: string,
  rotation: number,
) {
  const width = length * 0.17;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.strokeStyle = 'rgba(28,25,23,0.30)';
  ctx.lineWidth = Math.max(1, width * 0.06);
  ctx.fillStyle = colour;
  roundRect(ctx, -width / 2, -length / 2, width, length * 0.82, width * 0.35);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-width / 2, length * 0.32);
  ctx.lineTo(width / 2, length * 0.32);
  ctx.lineTo(0, length * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // The paper band, which is what makes it read as a crayon and not a stick.
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(-width / 2, -length * 0.12, width, length * 0.16);
  ctx.restore();
}

/**
 * The same sheets, as paper. A PDF thumbnail reads as a file; a printed
 * sheet lying on a table with a crayon next to it reads as the afternoon the
 * buyer is actually shopping for.
 */
function paintMockup(ctx: CanvasRenderingContext2D, spec: ImageSpec, scene: Scene) {
  const { width: W, height: H } = spec;
  const { skin, plans } = scene;
  const unit = Math.min(W, H);

  // A desk, in the palette's own warmth rather than a photograph of one.
  ctx.fillStyle = skin.background;
  ctx.fillRect(0, 0, W, H);
  const wash = ctx.createLinearGradient(0, 0, 0, H);
  const [first = ACCENT, second = ACCENT] = skin.confetti;
  wash.addColorStop(0, `${first}18`);
  wash.addColorStop(1, `${second}33`);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  drawBrandLine(ctx, scene.brand, W / 2, H * 0.08, unit * 0.024, 'center', skin.brand);

  const captionSize = unit * 0.038;
  const noteSize = unit * 0.028;
  const captionY = H * 0.155;
  const noteY = captionY + noteSize * 1.9;

  // Everything below the caption belongs to the paper, crayons included, so
  // the stack is measured into what is left rather than centred over it.
  const areaTop = noteY + unit * 0.05;
  const areaBottom = H - unit * 0.05;
  const crayonRoom = (areaBottom - areaTop) * 0.16;
  const sheetWidth = Math.min(W * 0.44, (areaBottom - areaTop - crayonRoom) / SHEET_RATIO);
  const centreX = W / 2 - sheetWidth / 2;
  const centreY = areaTop + (areaBottom - areaTop - crayonRoom - sheetWidth * SHEET_RATIO) / 2;

  // The shadow the stack casts, before any of it is drawn.
  ctx.save();
  ctx.fillStyle = 'rgba(28,25,23,0.16)';
  ctx.filter = 'blur(1px)';
  ctx.beginPath();
  ctx.ellipse(W / 2, centreY + sheetWidth * SHEET_RATIO * 0.99, sheetWidth * 0.72, sheetWidth * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const back = plans[0] ?? plans[plans.length - 1];
  const middle = plans[1] ?? back;
  const front = plans[plans.length - 1];
  drawSheetCard(ctx, scene.font, back, scene.config, centreX - sheetWidth * 0.36, centreY + sheetWidth * 0.05, sheetWidth * 0.86, -8);
  drawSheetCard(ctx, scene.font, middle, scene.config, centreX + sheetWidth * 0.4, centreY + sheetWidth * 0.02, sheetWidth * 0.86, 7);
  drawSheetCard(ctx, scene.font, front, scene.config, centreX, centreY, sheetWidth, -1.5);

  const crayonLength = sheetWidth * 0.42;
  const crayons = skin.confetti.slice(0, 3);
  crayons.forEach((colour, index) => {
    drawCrayon(
      ctx,
      W * 0.5 + (index - 1) * crayonLength * 0.28,
      centreY + sheetWidth * SHEET_RATIO + crayonLength * 0.42,
      crayonLength,
      colour,
      -68 + index * 12,
    );
  });

  ctx.font = `700 ${captionSize}px ${TEXT_STACK}`;
  ctx.fillStyle = skin.headline;
  ctx.textAlign = 'center';
  ctx.fillText(scene.extras.table, W / 2, captionY);

  ctx.font = `500 ${noteSize}px ${TEXT_STACK}`;
  ctx.fillStyle = skin.body;
  ctx.fillText(scene.extras.tableNote, W / 2, noteY);
}

/**
 * What happens after the buy button. Nothing is shipped, the file arrives
 * immediately, and the buyer prints it — three sentences that are the whole
 * difference between a digital listing and a parcel, and the questions a
 * seller otherwise answers one chat at a time.
 */
function paintSteps(ctx: CanvasRenderingContext2D, spec: ImageSpec, scene: Scene) {
  const { width: W, height: H } = spec;
  const { skin } = scene;
  const unit = Math.min(W, H);
  const pad = W * 0.09;

  ctx.fillStyle = skin.background;
  ctx.fillRect(0, 0, W, H);
  const wash = ctx.createLinearGradient(0, 0, W, H);
  const [first = ACCENT, second = ACCENT] = skin.confetti;
  wash.addColorStop(0, `${first}1F`);
  wash.addColorStop(1, `${second}12`);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  drawBrandLine(ctx, scene.brand, W / 2, H * 0.11, unit * 0.024, 'center', skin.brand);

  const headline = fitHeadline(ctx, scene.extras.how, W - pad * 2, 2, unit * 0.082, unit * 0.05);
  ctx.textAlign = 'center';
  let y = H * 0.2;
  for (const line of headline.lines) {
    drawHeadlineLine(ctx, skin, line, W / 2, y, headline.size);
    y += headline.size * 1.14;
  }

  const cardTop = y + unit * 0.015;
  const noteSize = unit * 0.03;
  const noteY = H - unit * 0.085;
  const cardsH = noteY - noteSize * 2.6 - cardTop;
  const gap = cardsH * 0.06;
  const cardH = (cardsH - gap * 2) / 3;

  // One size for all three cards, chosen so the longest step still fits in
  // two lines: three cards set at three different sizes read as a mistake.
  const textX = pad + cardH * 0.95;
  const textW = W - pad - textX - cardH * 0.3;
  let stepSize = cardH * 0.3;
  while (stepSize > cardH * 0.15) {
    ctx.font = `600 ${stepSize}px ${TEXT_STACK}`;
    if (scene.extras.steps.every((step) => wrap(ctx, step, textW, 3).length <= 2)) break;
    stepSize -= 1;
  }

  scene.extras.steps.forEach((step, index) => {
    const top = cardTop + index * (cardH + gap);
    ctx.save();
    ctx.fillStyle = CARD;
    ctx.shadowColor = 'rgba(28,25,23,0.10)';
    ctx.shadowBlur = unit * 0.02;
    ctx.shadowOffsetY = unit * 0.006;
    roundRect(ctx, pad, top, W - pad * 2, cardH, cardH * 0.22);
    ctx.fill();
    ctx.restore();

    const chip = cardH * 0.46;
    ctx.fillStyle = skin.accent;
    ctx.beginPath();
    ctx.arc(pad + cardH * 0.5, top + cardH / 2, chip / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = CARD;
    ctx.font = `800 ${chip * 0.58}px ${TEXT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), pad + cardH * 0.5, top + cardH / 2 + chip * 0.02);
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = INK;
    ctx.font = `600 ${stepSize}px ${TEXT_STACK}`;
    ctx.textAlign = 'left';
    const lines = wrap(ctx, step, textW, 2);
    let lineY = top + cardH / 2 - (lines.length - 1) * stepSize * 0.6 + stepSize * 0.35;
    for (const line of lines) {
      ctx.fillText(line, textX, lineY);
      lineY += stepSize * 1.25;
    }
  });

  const fitted = fitLines(ctx, [scene.extras.note], W - pad * 2, noteSize, 600);
  ctx.font = `600 ${fitted}px ${TEXT_STACK}`;
  ctx.fillStyle = skin.headline;
  ctx.textAlign = 'center';
  ctx.fillText(scene.extras.note, W / 2, noteY);
}

function paint(ctx: CanvasRenderingContext2D, spec: ImageSpec, scene: Scene) {
  if (spec.kind === 'grid') return paintGrid(ctx, spec, scene);
  if (spec.kind === 'mockup') return paintMockup(ctx, spec, scene);
  if (spec.kind === 'steps') return paintSteps(ctx, spec, scene);

  const { width: W, height: H } = spec;
  const { skin, style } = scene;
  ctx.fillStyle = skin.background;
  ctx.fillRect(0, 0, W, H);

  // A soft wash in the palette's own colours keeps the sheets from floating
  // on a flat ground — unless the style asked for a plain one.
  if (style.decoration !== 'none' && !skin.grounded) {
    const wash = ctx.createLinearGradient(0, 0, W, H);
    const [first = ACCENT, second = ACCENT] = skin.confetti;
    wash.addColorStop(0, `${first}22`);
    wash.addColorStop(0.55, `${second}0D`);
    wash.addColorStop(1, `${first}1F`);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);
  }
  if (style.decoration === 'full') drawConfetti(ctx, W, H, skin.confetti);

  const wide = W / H > 1.3;
  const tall = H / W > 1.3;
  const unit = Math.min(W, H);

  if (wide) {
    const pad = W * 0.06;
    const columnWidth = W * 0.44;
    drawBrandLine(ctx, scene.brand, pad, H * 0.18, unit * 0.026, 'left', skin.brand);

    const headline = fitHeadline(ctx, scene.title, columnWidth, 3, unit * 0.105, unit * 0.055);
    let y = H * 0.32;
    ctx.textAlign = 'left';
    for (const line of headline.lines) {
      drawHeadlineLine(ctx, skin, line, pad, y, headline.size);
      y += headline.size * 1.14;
    }

    const bullets = scene.bullets.slice(0, 3);
    const bulletSize = fitLines(ctx, bullets, columnWidth, unit * 0.036);
    ctx.fillStyle = skin.body;
    y += unit * 0.02;
    for (const bullet of bullets) {
      ctx.fillText(bullet, pad, y);
      y += bulletSize * 1.7;
    }

    drawPills(ctx, scene.pills, null, pad, y - unit * 0.02, unit * 0.026, skin.accent);

    // The sheets are measured, not guessed: they have to end up inside the
    // right column, whatever the canvas and whatever the arrangement.
    const columnLeft = W * 0.55;
    const columnRight = W - pad * 0.6;
    drawSheets(ctx, scene, {
      x: columnLeft,
      y: H * 0.12,
      w: columnRight - columnLeft,
      h: H * 0.76,
    });
    return;
  }

  const pad = W * 0.08;
  drawBrandLine(ctx, scene.brand, W / 2, tall ? H * 0.085 : H * 0.1, unit * 0.024, 'center', skin.brand);

  const headline = fitHeadline(ctx, scene.title, W - pad * 2, 3, unit * 0.098, unit * 0.05);
  let y = tall ? H * 0.16 : H * 0.19;
  ctx.textAlign = 'center';
  for (const line of headline.lines) {
    drawHeadlineLine(ctx, skin, line, W / 2, y, headline.size);
    y += headline.size * 1.14;
  }

  const subtitleSize = unit * 0.032;
  ctx.font = `500 ${subtitleSize}px ${TEXT_STACK}`;
  ctx.fillStyle = skin.body;
  const subtitleY = y + subtitleSize * 0.6;
  ctx.fillText(scene.subtitle, W / 2, subtitleY);

  // The sheets take whatever vertical room is left between the copy above and
  // the badge row below, so nothing ever runs off the canvas.
  const footSize = unit * 0.026;
  const pillSize = unit * 0.026;
  const pillHeight = pillSize * 2.4;
  const footY = H - unit * 0.055;
  const pillTop = footY - footSize * 1.4 - pillHeight;
  const bandTop = subtitleY + unit * 0.055;
  const bandHeight = Math.max(unit * 0.2, pillTop - bandTop - unit * 0.03);

  drawSheets(ctx, scene, { x: pad, y: bandTop, w: W - pad * 2, h: bandHeight });

  drawPills(ctx, scene.pills, W / 2, 0, pillTop, pillSize, skin.accent);

  ctx.font = `500 ${footSize}px ${TEXT_STACK}`;
  ctx.fillStyle = skin.body;
  ctx.textAlign = 'center';
  ctx.fillText(scene.bullets[0] ?? '', W / 2, footY);
}

async function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Peramban ini tidak bisa menyimpan gambar listing.');
  return blob;
}

export interface CoverInput {
  font: LoadedFont;
  config: Config;
  characters: string[];
  specs?: ImageSpec[];
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

/** Renders one PNG per marketplace canvas, drawn from the live page plans. */
export async function renderListingImages({
  font,
  config,
  characters,
  specs = IMAGE_SPECS,
  onProgress,
  signal,
}: CoverInput): Promise<GeneratedImage[]> {
  // The thumbnails show pages spread evenly across the set, which is the
  // honest way to preview what a buyer is getting. How many, and how they
  // are arranged, is the cover style's call.
  const style = COVER_STYLES[config.coverStyle] ?? COVER_STYLES.classic;
  const picks = coverSamples(characters, sheetCount(style));

  const paper = papersFor(config.paper)[0] ?? PAPERS.a4;
  const previewConfig: Config = { ...config, coverPage: false, termsPage: false };
  const palette = PALETTES[config.palette];
  const skin = skinOf(palette, style);
  // The sheet nearest the viewer shows the page already coloured in; the ones
  // behind it stay as they print, so the pair reads as before and after.
  const plans = planDocument({ font, config: previewConfig, paper, characters: picks }).map(
    (plan, index, all) => (index === all.length - 1 ? colourised(plan, palette) : plan),
  );

  // The contents canvas draws real pages rather than a promise of them. Past
  // two dozen the thumbnails stop being legible, so a long pack is sampled
  // evenly and says so rather than shrinking to a texture.
  const GRID_MAX = 30;
  const gridPicks = coverSamples(characters, Math.min(characters.length, GRID_MAX));
  const pages = planDocument({ font, config: previewConfig, paper, characters: gridPicks });
  const sampled = characters.length > GRID_MAX;

  const title = productTitle(config, characters);
  const brand = brandName(config) || 'DoodleGen';
  const papers = config.paper === 'both' ? 'A4 + US Letter' : paper.label;
  const pageTotal = characters.length;
  // A seller who wrote their own line on the cover gets it here too, so the
  // shop front and the file open with the same sentence.
  const tagline = config.coverTagline.trim();

  const scenes: Record<LanguageId, Scene> = {
    en: {
      title: title.en,
      brand,
      subtitle: tagline || `${pageTotal} print-ready pages — ${papers}`,
      pills: [`${pageTotal} pages`, papers, 'PDF 300 DPI'],
      bullets: [
        'Vector 300 DPI - clean lines, no watermark',
        `${pageTotal} print-ready pages - ${papers}`,
        '0.5 inch safe margin, prints on any home printer',
      ],
      plans,
      pages,
      pageCount: pageTotal,
      font,
      config: previewConfig,
      skin,
      style,
      extras: {
        inside: 'Every page inside',
        insideNote: sampled
          ? `${pageTotal} printable pages — ${gridPicks.length} shown here`
          : `${pageTotal} printable pages, ${papers}`,
        table: 'Print it at home',
        tableNote: `${papers} — clean black lines, no watermark`,
        how: 'How it works',
        steps: [
          'Buy the listing — checkout as usual.',
          'Download the PDF straight away. Nothing is posted to you.',
          'Print at 100% scale, as many copies as you like.',
        ],
        note: 'Instant digital download — no physical item is shipped.',
      },
    },
    id: {
      title: title.id,
      brand,
      subtitle: tagline || `${pageTotal} halaman siap cetak — ${papers}`,
      pills: [`${pageTotal} halaman`, papers, 'PDF 300 DPI'],
      bullets: [
        'Vector 300 DPI - garis bersih, tanpa watermark',
        `${pageTotal} halaman siap cetak - ${papers}`,
        'Margin aman 0.5 inci, cocok untuk printer rumahan',
      ],
      plans,
      pages,
      pageCount: pageTotal,
      font,
      config: previewConfig,
      skin,
      style,
      extras: {
        inside: 'Isi lengkap paket',
        insideNote: sampled
          ? `${pageTotal} halaman siap cetak — ${gridPicks.length} ditampilkan di sini`
          : `${pageTotal} halaman siap cetak, ${papers}`,
        table: 'Tinggal cetak di rumah',
        tableNote: `${papers} — garis hitam bersih, tanpa watermark`,
        how: 'Cara kerjanya',
        steps: [
          'Pesan dan bayar seperti biasa.',
          'File PDF dikirim lewat chat. Tidak ada paket yang dikirim.',
          'Cetak sendiri ukuran 100%, sebanyak yang kamu mau.',
        ],
        note: 'Produk digital — tidak ada barang fisik yang dikirim.',
      },
    },
  };

  // The wordmark face is already on the page for the UI; make sure it is
  // actually parsed before the canvas asks for it, or the first image falls
  // back to a system face.
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.load(`600 64px 'DoodleGen Brand'`);
    } catch {
      // A missing brand face is cosmetic: the stack falls through to system-ui.
    }
  }

  const stem = packSlug(config, characters);
  const images: GeneratedImage[] = [];

  for (let index = 0; index < specs.length; index += 1) {
    if (signal?.aborted) throw new DOMException('Dibatalkan', 'AbortError');
    const spec = specs[index];
    const canvas = document.createElement('canvas');
    canvas.width = spec.width;
    canvas.height = spec.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Peramban ini tidak mendukung canvas 2D.');
    paint(ctx, spec, scenes[spec.language]);

    const blob = await toPng(canvas);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    images.push({
      id: spec.id,
      name: `${stem}-${spec.id}-${spec.width}x${spec.height}.png`,
      label: spec.label,
      width: spec.width,
      height: spec.height,
      bytes,
      size: bytes.byteLength,
      url: URL.createObjectURL(blob),
    });
    onProgress?.(index + 1, specs.length);
  }

  return images;
}
