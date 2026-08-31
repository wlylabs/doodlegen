import {
  LineCapStyle,
  LineJoinStyle,
  PDFDocument,
  PDFFont,
  PDFPage,
  PDFString,
  TextRenderingMode,
  appendBezierCurve,
  closePath,
  cmyk,
  fill,
  fillAndStroke,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  setDashPattern,
  setFillingColor,
  setLineCap,
  setLineJoin,
  setLineWidth,
  setStrokingColor,
  setTextRenderingMode,
  stroke as strokePath,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { FONT_FEATURES } from './fontStore';
import { pageCountOf, planDocument } from './geometry';
import { subjectOf } from './charset';
import { autoTitle, brandName, packSlug, printedTitle } from './naming';
import { FONTS, INKS, PAPERS, papersFor } from './presets';
import type { PaperSpec } from './presets';
import type {
  Cmyk,
  Config,
  GuideLine,
  LinkArea,
  LoadedFont,
  PagePlan,
  PathCmd,
  Placement,
  RuleDraw,
  ShapeDraw,
} from './types';

/**
 * Round dots are drawn as zero-length dashes with a round cap. A hair of
 * length (rather than a literal 0) keeps every renderer happy while still
 * producing a circle of exactly the stroke diameter.
 */
const DOT_DASH = 0.01;

function ink(k: number) {
  // K-only: one plate on press, no registration drift, clean photocopies.
  return cmyk(0, 0, 0, k);
}

/** Palette colour where a plan carries one, K-only everywhere else. */
function paint(color: Cmyk | undefined, fallbackK: number) {
  return color ? cmyk(color[0], color[1], color[2], color[3]) : ink(fallbackK);
}

/**
 * Rounded rectangles are not in pdf-lib's drawing API, so the cover's card is
 * built from the path operators directly. Kappa is the usual circle-to-bezier
 * constant: it puts the control points where an arc's would be.
 */
const KAPPA = 0.5523;

function drawRoundRect(page: PDFPage, shape: ShapeDraw) {
  const r = Math.min(shape.r ?? 0, shape.w / 2, shape.h / 2);
  const { x, y, w, h } = shape;
  const outline = shape.stroke;
  if (!shape.color && !outline) return;
  if (r <= 0) {
    page.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      color: shape.color ? paint(shape.color, 0) : undefined,
      borderColor: outline ? paint(outline.color, 1) : undefined,
      borderWidth: outline?.width,
    });
    return;
  }
  const c = r * KAPPA;
  page.pushOperators(
    pushGraphicsState(),
    ...(shape.color ? [setFillingColor(paint(shape.color, 0))] : []),
    ...(outline
      ? [
          setStrokingColor(paint(outline.color, 1)),
          setLineWidth(outline.width),
          setLineJoin(LineJoinStyle.Round),
        ]
      : []),
    moveTo(x + r, y),
    lineTo(x + w - r, y),
    appendBezierCurve(x + w - r + c, y, x + w, y + r - c, x + w, y + r),
    lineTo(x + w, y + h - r),
    appendBezierCurve(x + w, y + h - r + c, x + w - r + c, y + h, x + w - r, y + h),
    lineTo(x + r, y + h),
    appendBezierCurve(x + r - c, y + h, x, y + h - r + c, x, y + h - r),
    lineTo(x, y + r),
    appendBezierCurve(x, y + r - c, x + r - c, y, x + r, y),
    closePath(),
    shape.color && outline ? fillAndStroke() : shape.color ? fill() : strokePath(),
    popGraphicsState(),
  );
}

/**
 * The cover's doodle art, written straight out as path operators. The plan
 * hands over the same numbers in the same space the rest of the page uses,
 * so nothing here has to transform anything — it just has to spell the
 * outline out in the operators a PDF understands.
 */
function drawPath(page: PDFPage, shape: ShapeDraw) {
  const path = shape.path;
  if (!path?.length) return;
  const outline = shape.stroke;
  if (!shape.color && !outline) return;

  const steps = path.map((step: PathCmd) => {
    if (step.c === 'M') return moveTo(step.x, step.y);
    if (step.c === 'L') return lineTo(step.x, step.y);
    if (step.c === 'C') {
      return appendBezierCurve(step.x1, step.y1, step.x2, step.y2, step.x, step.y);
    }
    return closePath();
  });

  page.pushOperators(
    pushGraphicsState(),
    ...(shape.color ? [setFillingColor(paint(shape.color, 0))] : []),
    ...(outline
      ? [
          setStrokingColor(paint(outline.color, 1)),
          setLineWidth(outline.width),
          setLineJoin(LineJoinStyle.Round),
          setLineCap(LineCapStyle.Round),
        ]
      : []),
    ...steps,
    shape.color && outline ? fillAndStroke() : shape.color ? fill() : strokePath(),
    popGraphicsState(),
  );
}

function drawShapes(page: PDFPage, shapes: ShapeDraw[]) {
  for (const shape of shapes) {
    if (shape.kind === 'path') {
      drawPath(page, shape);
    } else if (shape.kind === 'ellipse') {
      page.drawEllipse({
        x: shape.x + shape.w / 2,
        y: shape.y + shape.h / 2,
        xScale: shape.w / 2,
        yScale: shape.h / 2,
        color: shape.color ? paint(shape.color, 0) : undefined,
        borderColor: shape.stroke ? paint(shape.stroke.color, 1) : undefined,
        borderWidth: shape.stroke?.width,
      });
    } else {
      drawRoundRect(page, shape);
    }
  }
}

function drawGuides(page: PDFPage, guides: GuideLine[], config: Config) {
  const level = INKS[config.ink].guide;
  for (const guide of guides) {
    const solid = guide.kind !== 'mid';
    page.drawLine({
      start: { x: guide.x1, y: guide.y },
      end: { x: guide.x2, y: guide.y },
      thickness: guide.kind === 'base' ? 0.8 : 0.55,
      color: ink(guide.kind === 'base' ? level : level * 0.8),
      dashArray: solid ? undefined : [3, 3],
      lineCap: LineCapStyle.Butt,
    });
  }
}

function drawRules(page: PDFPage, rules: RuleDraw[]) {
  for (const rule of rules) {
    page.drawLine({
      start: { x: rule.x1, y: rule.y },
      end: { x: rule.x2, y: rule.y },
      thickness: rule.width,
      color: paint(rule.color, rule.ink),
      lineCap: LineCapStyle.Butt,
    });
  }
}

function drawPlacement(page: PDFPage, font: PDFFont, place: Placement, config: Config) {
  const level =
    place.ink ?? (place.mode === 'dotted' ? INKS[config.ink].dotted : INKS[config.ink].solid);

  // A filled sample is drawn colour-first, contour second, exactly the order a
  // child works in — and the order that keeps the outline crisp on top.
  if (place.fill) {
    // drawText writes its own filling colour, so the colour goes through the
    // option rather than an operator that it would immediately overwrite.
    page.pushOperators(pushGraphicsState(), setTextRenderingMode(TextRenderingMode.Fill));
    page.drawText(place.text, {
      x: place.x,
      y: place.y,
      size: place.size,
      font,
      color: paint(place.fill, 0),
    });
    page.pushOperators(popGraphicsState());
  }

  page.pushOperators(
    pushGraphicsState(),
    setLineWidth(place.strokeWidth),
    setLineCap(LineCapStyle.Round),
    setLineJoin(LineJoinStyle.Round),
    setStrokingColor(ink(level)),
    place.mode === 'dotted'
      ? setDashPattern([DOT_DASH, place.dotGap], 0)
      : setDashPattern([], 0),
    // Render mode 1 strokes the glyph outlines instead of filling them, so
    // the letter stays real embedded text rather than a flattened shape.
    setTextRenderingMode(TextRenderingMode.Outline),
  );
  page.drawText(place.text, { x: place.x, y: place.y, size: place.size, font });
  page.pushOperators(popGraphicsState());
}

/**
 * The seller's link, as the one annotation in the file.
 *
 * A PDF link is not drawn — the words are already on the page as text, and
 * this is the rectangle a reader turns into a tap target. pdf-lib has no API
 * for it above the object level, so the annotation dictionary is written out
 * by hand: /Border zeroed, because a reader's own blue box around it would
 * be the only frame in a pack that has none.
 */
function addLinks(doc: PDFDocument, page: PDFPage, links: LinkArea[]) {
  for (const link of links) {
    const annotation = doc.context.register(
      doc.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [link.x, link.y, link.x + link.w, link.y + link.h],
        Border: [0, 0, 0],
        A: doc.context.obj({
          Type: 'Action',
          S: 'URI',
          URI: PDFString.of(link.url),
        }),
      }),
    );
    page.node.addAnnot(annotation);
  }
}

function drawPage(doc: PDFDocument, font: PDFFont, plan: PagePlan, config: Config) {
  const page = doc.addPage([plan.widthPt, plan.heightPt]);
  // An explicit 0% ink fill guarantees a clean white sheet on screen while
  // laying down no ink at all on press.
  page.drawRectangle({
    x: 0,
    y: 0,
    width: plan.widthPt,
    height: plan.heightPt,
    color: cmyk(0, 0, 0, 0),
  });
  drawShapes(page, plan.shapes);
  drawGuides(page, plan.guides, config);
  drawRules(page, plan.rules);
  for (const place of plan.placements) drawPlacement(page, font, place, config);
  for (const text of plan.texts) {
    page.drawText(text.text, {
      x: text.x,
      y: text.y,
      size: text.size,
      font,
      color: paint(text.color, text.ink),
    });
  }
  if (plan.links?.length) addLinks(doc, page, plan.links);
}

export interface GeneratedFile {
  name: string;
  title: string;
  paperId: PaperSpec['id'];
  paperLabel: string;
  pages: number;
  bytes: Uint8Array;
  size: number;
}

export interface GenerateOptions {
  font: LoadedFont;
  config: Config;
  characters: string[];
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

export function fileName(config: Config, paper: PaperSpec, characters: string[]): string {
  return `${packSlug(config, characters)}-${paper.id}.pdf`;
}

/** Metadata title: what a buyer sees in their PDF reader's title bar. */
function documentTitle(config: Config, characters: string[]): string {
  const written = config.productTitle.trim();
  return written || autoTitle(config, characters).en;
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function buildOne(
  paper: PaperSpec,
  { font, config, characters, onProgress, signal }: GenerateOptions,
  progressOffset: number,
  progressTotal: number,
): Promise<GeneratedFile> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  // The shipped faces are already cut down to printable ASCII at build time
  // (17-37 KB each), so the whole face goes in rather than a generator-side
  // subset. A complete embedded font is what a print shop's preflight wants
  // to see, and it costs a handful of kilobytes to give them one.
  // Same feature set the preview measured with, so the two cannot drift.
  const pdfFont = await doc.embedFont(font.bytes, { subset: false, features: FONT_FEATURES });

  doc.setTitle(documentTitle(config, characters));
  // A sold file should carry its shop's name; an unbranded one still says
  // what made it, which is what a preflight report wants to see.
  doc.setAuthor(brandName(config) || 'DoodleGen');
  doc.setCreator('DoodleGen');
  doc.setProducer('DoodleGen');
  doc.setSubject(
    `Printable ${subjectOf(config, characters).en} coloring and tracing pages, ${paper.label}, ${FONTS[config.font].family}`,
  );
  doc.setKeywords([
    'coloring pages',
    'tracing worksheet',
    config.content === 'letters' ? 'alphabet' : config.content === 'numbers' ? 'numbers' : 'words',
    'handwriting practice',
    'printable',
    paper.label,
  ]);
  doc.setLanguage('en-US');
  const now = new Date();
  doc.setCreationDate(now);
  doc.setModificationDate(now);

  const plans = planDocument({ font, config, paper, characters });
  for (let i = 0; i < plans.length; i += 1) {
    if (signal?.aborted) throw new DOMException('Dibatalkan', 'AbortError');
    drawPage(doc, pdfFont, plans[i], config);
    onProgress?.(progressOffset + i + 1, progressTotal);
    if (i % 4 === 3) await tick();
  }

  const bytes = await doc.save({ useObjectStreams: true });
  return {
    name: fileName(config, paper, characters),
    title: printedTitle(config, characters),
    paperId: paper.id,
    paperLabel: paper.label,
    pages: plans.length,
    bytes,
    size: bytes.byteLength,
  };
}

/** Generates one PDF per selected paper size, sharing a single layout pass. */
export async function generate(options: GenerateOptions): Promise<GeneratedFile[]> {
  const papers = papersFor(options.config.paper);
  const perFile = pageCountOf(options.config, options.characters);
  const total = papers.length * perFile;
  const files: GeneratedFile[] = [];
  for (let i = 0; i < papers.length; i += 1) {
    files.push(await buildOne(papers[i], options, i * perFile, total));
  }
  return files;
}

export { PAPERS };
