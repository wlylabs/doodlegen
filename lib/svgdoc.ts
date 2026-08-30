import { sheetShapes } from './svg';
import { packSlug } from './naming';
import type { Config, LoadedFont, PagePlan } from './types';

/**
 * A page as a standalone SVG file.
 *
 * This is the export route into every editor a seller actually uses — Canva,
 * Figma, Illustrator, Inkscape, Cricut Design Space — and it is the same
 * shapes the PDF prints, not a second rendering of them. Nothing is
 * rasterised on the way out, so a page can be recoloured, resized or built
 * into a bigger design without losing anything.
 */
export function pageToSvg(font: LoadedFont, plan: PagePlan, config: Config): string {
  const shapes = sheetShapes(font, plan, config);
  const round = (value: number) => Number(value.toFixed(3));
  const parts: string[] = [];

  parts.push(`<rect width="${round(plan.widthPt)}" height="${round(plan.heightPt)}" fill="#FFFFFF"/>`);

  for (const area of shapes.areas) {
    const paint =
      `${area.color ? `fill="${area.color}"` : 'fill="none"'}` +
      (area.stroke ? ` stroke="${area.stroke.color}" stroke-width="${round(area.stroke.width)}"` : '');
    parts.push(
      area.kind === 'path'
        ? `<path d="${area.d ?? ''}" ${paint}/>`
        : area.kind === 'ellipse'
          ? `<ellipse cx="${round(area.x + area.w / 2)}" cy="${round(area.y + area.h / 2)}" rx="${round(
              area.w / 2,
            )}" ry="${round(area.h / 2)}" ${paint}/>`
          : `<rect x="${round(area.x)}" y="${round(area.y)}" width="${round(area.w)}" height="${round(
              area.h,
            )}"${area.r ? ` rx="${round(area.r)}"` : ''} ${paint}/>`,
    );
  }

  for (const guide of shapes.guides) {
    parts.push(
      `<line x1="${guide.x1}" y1="${guide.y1}" x2="${guide.x2}" y2="${guide.y2}" stroke="${guide.color}"` +
        ` stroke-width="${guide.width}"${guide.dash ? ` stroke-dasharray="${guide.dash}"` : ''}/>`,
    );
  }

  for (const glyph of shapes.glyphs) {
    const paint = glyph.filled
      ? `fill="${glyph.color}"`
      : `fill="none" stroke="${glyph.color}" stroke-width="${glyph.strokeWidth}"` +
        `${glyph.dash ? ` stroke-dasharray="${glyph.dash}"` : ''} stroke-linecap="round" stroke-linejoin="round"`;
    parts.push(`<path d="${glyph.d}" transform="${glyph.transform}" ${paint}/>`);
  }

  // Units are points, the same as the PDF, so an import lands at trim size.
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${round(plan.widthPt)}pt" height="${round(
      plan.heightPt,
    )}pt" viewBox="0 0 ${round(plan.widthPt)} ${round(plan.heightPt)}">`,
    `<title>${escapeXml(plan.label)}</title>`,
    ...parts,
    '</svg>',
    '',
  ].join('\n');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface SvgFile {
  name: string;
  content: string;
}

/**
 * One SVG per worksheet, named so a file browser sorts them in reading order.
 * The cover and the licence page are left out on purpose: nobody cuts a
 * licence page on a Cricut, and their body text would triple the folder size
 * in outlines nobody will edit.
 */
export function svgFilesFor(
  font: LoadedFont,
  plans: PagePlan[],
  config: Config,
  characters: string[],
): SvgFile[] {
  const pages = plans.filter((plan) => plan.kind === 'char');
  const stem = packSlug(config, characters);
  const width = String(pages.length).length;
  return pages.map((plan, index) => ({
    name: `${stem}-${String(index + 1).padStart(width, '0')}-${slugLabel(plan.label)}.svg`,
    content: pageToSvg(font, plan, config),
  }));
}

/** Page labels become file names, so "Aa" and "1" have to survive the trip. */
function slugLabel(label: string): string {
  const ascii = label
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  if (ascii) return ascii;
  // Uppercase and lowercase pages differ only by case, which a file system
  // may not: fall back to the codepoints so no two pages collide.
  return [...label].map((character) => character.codePointAt(0)?.toString(16) ?? '').join('-');
}
