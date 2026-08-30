import { cmykToHex } from './palette';
import { INKS } from './presets';
import type { Cmyk, Config, LoadedFont, PagePlan } from './types';

/**
 * The preview draws the very same glyph outlines the PDF strokes, pulled
 * straight out of the font as SVG paths. Nothing is rasterised on either
 * side, so what you scroll through is what gets printed.
 */
export interface GlyphShape {
  d: string;
  transform: string;
  /** The same placement as `transform`, as numbers, for canvas rendering. */
  x: number;
  y: number;
  scale: number;
  strokeWidth: number;
  dash?: string;
  /** Dash pitch in font units, so a canvas can build its own dash array. */
  dashUnits?: number;
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

/** A flat area of colour behind everything else: the cover's card and dots. */
export interface AreaShape {
  kind: 'rect' | 'ellipse';
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  color: string;
}

export interface SheetShapes {
  areas: AreaShape[];
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
        x: gx,
        y: gy,
        scale: unit,
        strokeWidth: round(options.strokeWidth / unit),
        dash:
          options.dash === undefined
            ? undefined
            : `${round(0.01 / unit)} ${round(options.dash / unit)}`,
        dashUnits: options.dash === undefined ? undefined : options.dash / unit,
        color: options.color,
        filled: options.filled,
      });
    }
    pen += position.xAdvance;
  });

  return shapes;
}

/** Palette colour where the plan carries one, K-only grey otherwise. */
function tone(color: Cmyk | undefined, fallbackK: number): string {
  return color ? cmykToHex(color) : inkColor(fallbackK);
}

export function sheetShapes(font: LoadedFont, plan: PagePlan, config: Config): SheetShapes {
  const ink = INKS[config.ink];
  const glyphs: GlyphShape[] = [];

  // Colour is laid down first, the way the page prints: card, dots, then the
  // filled sample, then its contour on top.
  const areas: AreaShape[] = plan.shapes.map((shape) => ({
    kind: shape.kind,
    x: round(shape.x),
    y: round(plan.heightPt - shape.y - shape.h),
    w: round(shape.w),
    h: round(shape.h),
    r: round(shape.r ?? 0),
    color: cmykToHex(shape.color),
  }));

  for (const place of plan.placements) {
    if (place.fill) {
      glyphs.push(
        ...glyphsFor(font, place.text, place.size, place.x, place.y, plan.heightPt, {
          strokeWidth: 0,
          color: cmykToHex(place.fill),
          filled: true,
        }),
      );
    }
    glyphs.push(
      ...glyphsFor(font, place.text, place.size, place.x, place.y, plan.heightPt, {
        strokeWidth: place.strokeWidth,
        dash: place.mode === 'dotted' ? place.dotGap : undefined,
        color: inkColor(place.mode === 'dotted' ? ink.dotted : ink.solid),
        filled: false,
      }),
    );
  }

  // Titles, cover copy, footers and licence text are drawn filled, from the
  // same outlines: one face, one rendering path, preview and print alike.
  for (const text of plan.texts) {
    glyphs.push(
      ...glyphsFor(font, text.text, text.size, text.x, text.y, plan.heightPt, {
        strokeWidth: 0,
        color: tone(text.color, text.ink),
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

  for (const rule of plan.rules) {
    guides.push({
      x1: round(rule.x1),
      x2: round(rule.x2),
      y1: round(plan.heightPt - rule.y),
      y2: round(plan.heightPt - rule.y),
      width: rule.width,
      color: tone(rule.color, rule.ink),
    });
  }

  return { areas, glyphs, guides };
}
