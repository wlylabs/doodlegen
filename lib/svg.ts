import { INKS } from './presets';
import type { Config, LoadedFont, PagePlan } from './types';

/**
 * The preview draws the very same glyph outlines the PDF strokes, pulled
 * straight out of the font as SVG paths. Nothing is rasterised on either
 * side, so what you scroll through is what gets printed.
 */
export interface GlyphShape {
  d: string;
  transform: string;
  strokeWidth: number;
  dash?: string;
  color: string;
  filled: boolean;
}

export interface GuideShape {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  color: string;
  dash?: string;
}

export interface SheetShapes {
  glyphs: GlyphShape[];
  guides: GuideShape[];
}

/** K-only ink level to an on-screen grey. K100 reads as true black. */
export function inkColor(k: number): string {
  const value = Math.round(255 * (1 - Math.min(1, Math.max(0, k))));
  return `rgb(${value},${value},${value})`;
}

const round = (value: number) => Number(value.toFixed(3));

function glyphsFor(
  font: LoadedFont,
  text: string,
  size: number,
  originX: number,
  baselineY: number,
  pageHeight: number,
  options: { strokeWidth: number; dash?: number; color: string; filled: boolean },
): GlyphShape[] {
  const run = font.layout(text);
  const unit = size / font.unitsPerEm;
  if (unit <= 0) return [];
  const y = pageHeight - baselineY;
  const shapes: GlyphShape[] = [];
  let pen = 0;

  run.glyphs.forEach((glyph, index) => {
    const position = run.positions[index];
    const d = font.svgPath(glyph);
    if (d) {
      const gx = originX + (pen + position.xOffset) * unit;
      const gy = y - position.yOffset * unit;
      shapes.push({
        d,
        // Paths stay in font units; the transform flips y and scales, so
        // stroke widths below are expressed in font units too.
        transform: `translate(${round(gx)} ${round(gy)}) scale(${round(unit)} ${round(-unit)})`,
        strokeWidth: round(options.strokeWidth / unit),
        dash:
          options.dash === undefined
            ? undefined
            : `${round(0.01 / unit)} ${round(options.dash / unit)}`,
        color: options.color,
        filled: options.filled,
      });
    }
    pen += position.xAdvance;
  });

  return shapes;
}

export function sheetShapes(font: LoadedFont, plan: PagePlan, config: Config): SheetShapes {
  const ink = INKS[config.ink];
  const glyphs: GlyphShape[] = [];

  for (const place of plan.placements) {
    glyphs.push(
      ...glyphsFor(font, place.text, place.size, place.x, place.y, plan.heightPt, {
        strokeWidth: place.strokeWidth,
        dash: place.mode === 'dotted' ? place.dotGap : undefined,
        color: inkColor(place.mode === 'dotted' ? ink.dotted : ink.solid),
        filled: false,
      }),
    );
  }

  if (plan.title) {
    glyphs.push(
      ...glyphsFor(font, plan.title.text, plan.title.size, plan.title.x, plan.title.y, plan.heightPt, {
        strokeWidth: 0,
        color: inkColor(0.78),
        filled: true,
      }),
    );
  }

  const guides: GuideShape[] = plan.guides.map((guide) => ({
    x1: round(guide.x1),
    x2: round(guide.x2),
    y1: round(plan.heightPt - guide.y),
    y2: round(plan.heightPt - guide.y),
    width: guide.kind === 'base' ? 0.8 : 0.55,
    color: inkColor(guide.kind === 'base' ? ink.guide : ink.guide * 0.8),
    dash: guide.kind === 'mid' ? '3 3' : undefined,
  }));

  return { glyphs, guides };
}
