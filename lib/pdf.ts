import {
  LineCapStyle,
  LineJoinStyle,
  PDFDocument,
  PDFFont,
  PDFPage,
  TextRenderingMode,
  cmyk,
  popGraphicsState,
  pushGraphicsState,
  setDashPattern,
  setLineCap,
  setLineJoin,
  setLineWidth,
  setStrokingColor,
  setTextRenderingMode,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { FONT_FEATURES } from './fontStore';
import { pageCountOf, planDocument } from './geometry';
import { subjectOf } from './charset';
import { autoTitle, brandName, packSlug, printedTitle } from './naming';
import { FONTS, INKS, PAPERS, papersFor } from './presets';
import type { PaperSpec } from './presets';
import type { Config, GuideLine, LoadedFont, PagePlan, Placement, RuleDraw } from './types';

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
      color: ink(rule.ink),
      lineCap: LineCapStyle.Butt,
    });
  }
}

function drawPlacement(page: PDFPage, font: PDFFont, place: Placement, config: Config) {
  const level = place.mode === 'dotted' ? INKS[config.ink].dotted : INKS[config.ink].solid;
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
  drawGuides(page, plan.guides, config);
  drawRules(page, plan.rules);
  for (const place of plan.placements) drawPlacement(page, font, place, config);
  for (const text of plan.texts) {
    page.drawText(text.text, {
      x: text.x,
      y: text.y,
      size: text.size,
      font,
      color: ink(text.ink),
    });
  }
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
