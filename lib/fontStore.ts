import fontkitModule from '@pdf-lib/fontkit';
import { FONTS } from './presets';
import type { FontId, GlyphLike, GlyphRun, LoadedFont } from './types';

interface FontkitApi {
  create(data: Uint8Array): {
    unitsPerEm: number;
    ascent: number;
    descent: number;
    capHeight: number;
    xHeight: number;
    layout(text: string): GlyphRun;
    hasGlyphForCodePoint(codePoint: number): boolean;
  };
}

export const fontkit = fontkitModule as unknown as FontkitApi;

const cache = new Map<FontId, Promise<LoadedFont>>();

async function fetchFont(id: FontId): Promise<LoadedFont> {
  const spec = FONTS[id];
  const response = await fetch(spec.file);
  if (!response.ok) throw new Error(`Gagal memuat font ${spec.family} (${response.status})`);
  const bytes = await response.arrayBuffer();
  const parsed = fontkit.create(new Uint8Array(bytes));

  const runs = new Map<string, GlyphRun>();
  const paths = new Map<number, string>();

  return {
    id,
    bytes,
    unitsPerEm: parsed.unitsPerEm,
    ascent: parsed.ascent,
    descent: parsed.descent,
    capHeight: parsed.capHeight,
    xHeight: parsed.xHeight,
    layout(text: string) {
      let run = runs.get(text);
      if (!run) {
        run = parsed.layout(text);
        runs.set(text, run);
      }
      return run;
    },
    supports(text: string) {
      return Array.from(text)
        .filter((ch) => parsed.hasGlyphForCodePoint(ch.codePointAt(0) ?? 0))
        .join('')
        .trim();
    },
    svgPath(glyph: GlyphLike) {
      let d = paths.get(glyph.id);
      if (d === undefined) {
        d = glyph.path.toSVG() || '';
        paths.set(glyph.id, d);
      }
      return d;
    },
  };
}

export function loadFont(id: FontId): Promise<LoadedFont> {
  let pending = cache.get(id);
  if (!pending) {
    pending = fetchFont(id).catch((error) => {
      cache.delete(id);
      throw error;
    });
    cache.set(id, pending);
  }
  return pending;
}

export function prefetchFont(id: FontId): void {
  void loadFont(id).catch(() => undefined);
}
