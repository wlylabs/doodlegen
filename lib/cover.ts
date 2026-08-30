import { planDocument } from './geometry';
import { brandName, packSlug, productTitle } from './naming';
import { PALETTES, cmykToHex, type Palette } from './palette';
import { PAPERS, papersFor } from './presets';
import { sheetShapes } from './svg';
import type { Config, LanguageId, LoadedFont, PagePlan } from './types';

/**
 * Listing images are the half of a digital product the marketplaces judge
 * first. These are drawn from the very pages that are in the PDF — same
 * outlines, same layout engine — so the picture cannot promise something the
 * file does not contain.
 */
export interface ImageSpec {
  id: string;
  label: string;
  note: string;
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
    width: 2000,
    height: 2000,
    market: 'Etsy',
    language: 'en',
  },
  {
    id: 'tpt',
    label: 'TPT 1200 × 1600',
    note: 'Sampul produk, rasio 3:4',
    width: 1200,
    height: 1600,
    market: 'Teachers Pay Teachers',
    language: 'en',
  },
  {
    id: 'gumroad',
    label: 'Gumroad 1280 × 720',
    note: 'Sampul produk, rasio 16:9',
    width: 1280,
    height: 720,
    market: 'Gumroad',
    language: 'en',
  },
  {
    id: 'shopee',
    label: 'Shopee 1200 × 1200',
    note: 'Foto produk utama, rasio 1:1',
    width: 1200,
    height: 1200,
    market: 'Shopee / Tokopedia',
    language: 'id',
  },
  {
    id: 'pinterest',
    label: 'Pinterest 1000 × 1500',
    note: 'Pin promosi, rasio 2:3',
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
  confetti: string[];
}

function skinOf(palette: Palette): Skin {
  return {
    background: palette.card ? cmykToHex(palette.card) : PAPER,
    headline: palette.card ? cmykToHex(palette.headline) : INK,
    brand: palette.card ? cmykToHex(palette.brand) : ACCENT,
    body: palette.card ? cmykToHex(palette.body) : MUTED,
    confetti: palette.confetti.map(cmykToHex),
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
    ctx.fillStyle = area.color;
    if (area.kind === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(area.x + area.w / 2, area.y + area.h / 2, area.w / 2, area.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      roundRect(ctx, area.x, area.y, area.w, area.h, area.r);
      ctx.fill();
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
  ctx.font = `700 ${size}px ${TEXT_STACK}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  // Canvas has no letter-spacing everywhere yet, so it is drawn by hand.
  const letters = [...text.toUpperCase()];
  const spacing = size * 0.18;
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
  font: LoadedFont;
  config: Config;
  skin: Skin;
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

function paint(ctx: CanvasRenderingContext2D, spec: ImageSpec, scene: Scene) {
  const { width: W, height: H } = spec;
  const { skin } = scene;
  ctx.fillStyle = skin.background;
  ctx.fillRect(0, 0, W, H);

  // A soft wash in the palette's own colours keeps the sheets from floating
  // on a flat ground.
  const wash = ctx.createLinearGradient(0, 0, W, H);
  const [first = ACCENT, second = ACCENT] = skin.confetti;
  wash.addColorStop(0, `${first}22`);
  wash.addColorStop(0.55, `${second}0D`);
  wash.addColorStop(1, `${first}1F`);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  drawConfetti(ctx, W, H, skin.confetti);

  const wide = W / H > 1.3;
  const tall = H / W > 1.3;
  const unit = Math.min(W, H);

  if (wide) {
    const pad = W * 0.06;
    const columnWidth = W * 0.44;
    drawBrandLine(ctx, scene.brand, pad, H * 0.18, unit * 0.026, 'left', skin.brand);

    const headline = fitHeadline(ctx, scene.title, columnWidth, 3, unit * 0.105, unit * 0.055);
    let y = H * 0.32;
    ctx.fillStyle = skin.headline;
    ctx.textAlign = 'left';
    for (const line of headline.lines) {
      ctx.fillText(line, pad, y);
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

    drawPills(ctx, scene.pills, null, pad, y - unit * 0.02, unit * 0.026, skin.brand);

    // The fan is measured, not guessed: three overlapping sheets have to end
    // up inside the right column, whatever the canvas is.
    const sheets = scene.plans.slice(0, 3);
    const columnLeft = W * 0.55;
    const columnRight = W - pad * 0.6;
    // Enough overlap to read as a stack, little enough that each sheet still
    // shows the character it is teaching.
    const overlap = 0.8;
    const span = 1 + overlap * (sheets.length - 1);
    const sheetWidth = Math.min(W * 0.22, (columnRight - columnLeft) / span);
    const startX = (columnLeft + columnRight) / 2 - (sheetWidth * span) / 2;
    sheets.forEach((plan, index) => {
      drawSheetCard(
        ctx,
        scene.font,
        plan,
        scene.config,
        startX + index * sheetWidth * overlap,
        H * 0.5 - (sheetWidth * 1.414) / 2 + (index % 2 === 1 ? H * 0.03 : 0),
        sheetWidth,
        index === 0 ? -7 : index === 1 ? 0 : 7,
      );
    });
    return;
  }

  const pad = W * 0.08;
  drawBrandLine(ctx, scene.brand, W / 2, tall ? H * 0.085 : H * 0.1, unit * 0.024, 'center', skin.brand);

  const headline = fitHeadline(ctx, scene.title, W - pad * 2, 3, unit * 0.098, unit * 0.05);
  let y = tall ? H * 0.16 : H * 0.19;
  ctx.textAlign = 'center';
  ctx.fillStyle = skin.headline;
  for (const line of headline.lines) {
    ctx.fillText(line, W / 2, y);
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
  const stagger = unit * 0.035;
  const bandHeight = Math.max(unit * 0.2, pillTop - bandTop - unit * 0.03 - stagger);
  const sheetWidth = Math.min(W * 0.34, bandHeight / 1.414);
  // On a tall canvas the sheets cannot grow to fill the band, so they are
  // centred in it rather than left hanging under the copy.
  const sheetTop = bandTop + Math.max(0, (bandHeight - sheetWidth * 1.414 - stagger) / 2);

  scene.plans.slice(0, 3).forEach((plan, index) => {
    const offset = (index - 1) * sheetWidth * 0.78;
    drawSheetCard(
      ctx,
      scene.font,
      plan,
      scene.config,
      W / 2 - sheetWidth / 2 + offset,
      sheetTop + Math.abs(index - 1) * stagger,
      sheetWidth,
      (index - 1) * 7,
    );
  });

  drawPills(ctx, scene.pills, W / 2, 0, pillTop, pillSize, skin.brand);

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
  // The thumbnails show the first, middle and last page of the set, which is
  // the honest way to preview what a buyer is getting.
  const picks = [
    characters[0],
    characters[Math.floor(characters.length / 2)],
    characters[characters.length - 1],
  ].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);

  const paper = papersFor(config.paper)[0] ?? PAPERS.a4;
  const previewConfig: Config = { ...config, coverPage: false, termsPage: false };
  const palette = PALETTES[config.palette];
  const skin = skinOf(palette);
  // The sheet nearest the viewer shows the page already coloured in; the ones
  // behind it stay as they print, so the pair reads as before and after.
  const plans = planDocument({ font, config: previewConfig, paper, characters: picks }).map(
    (plan, index, all) => (index === all.length - 1 ? colourised(plan, palette) : plan),
  );

  const title = productTitle(config, characters);
  const brand = brandName(config) || 'DoodleGen';
  const papers = config.paper === 'both' ? 'A4 + US Letter' : paper.label;
  const pages = characters.length;

  const scenes: Record<LanguageId, Scene> = {
    en: {
      title: title.en,
      brand,
      subtitle: `${pages} print-ready pages — ${papers}`,
      pills: [`${pages} pages`, papers, 'PDF 300 DPI'],
      bullets: [
        'Vector 300 DPI - clean lines, no watermark',
        `${pages} print-ready pages - ${papers}`,
        '0.5 inch safe margin, prints on any home printer',
      ],
      plans,
      font,
      config: previewConfig,
      skin,
    },
    id: {
      title: title.id,
      brand,
      subtitle: `${pages} halaman siap cetak — ${papers}`,
      pills: [`${pages} halaman`, papers, 'PDF 300 DPI'],
      bullets: [
        'Vector 300 DPI - garis bersih, tanpa watermark',
        `${pages} halaman siap cetak - ${papers}`,
        'Margin aman 0.5 inci, cocok untuk printer rumahan',
      ],
      plans,
      font,
      config: previewConfig,
      skin,
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
