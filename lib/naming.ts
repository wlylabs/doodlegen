import { subjectOf } from './charset';
import { LAYOUTS, STYLES } from './presets';
import type { Config } from './types';

export interface Bilingual {
  id: string;
  en: string;
}

const STYLE_EN: Record<Config['style'], string> = {
  outline: 'Coloring Outline',
  dotted: 'Dotted Tracing',
  combo: 'Trace and Color',
};

const LAYOUT_EN: Record<Config['layout'], string> = {
  single: 'One Per Page',
  grid: 'Practice Grid',
  worksheet: 'Worksheet',
};

export function styleLabel(config: Config): Bilingual {
  return {
    id: STYLES.find((item) => item.id === config.style)?.label ?? '',
    en: STYLE_EN[config.style],
  };
}

export function layoutLabel(config: Config): Bilingual {
  return {
    id: LAYOUTS.find((item) => item.id === config.layout)?.label ?? '',
    en: LAYOUT_EN[config.layout],
  };
}

/** The title a pack gets when the seller has not written one. */
export function autoTitle(config: Config, characters: string[]): Bilingual {
  const subject = subjectOf(config, characters);
  const style = styleLabel(config);
  return {
    id: `${subject.id} — ${style.id}`,
    en: `${subject.en} — ${style.en}`,
  };
}

/** The title actually printed and listed: the seller's, or the derived one. */
export function productTitle(config: Config, characters: string[]): Bilingual {
  const written = config.productTitle.trim();
  if (!written) return autoTitle(config, characters);
  return { id: written, en: written };
}

/** The title as it is printed and written into the pack, in one language. */
export function printedTitle(config: Config, characters: string[]): string {
  const title = productTitle(config, characters);
  return config.language === 'id' ? title.id : title.en;
}

export function brandName(config: Config): string {
  return config.brand.trim();
}

/** Lowercase, dash-joined, ASCII-only — safe as a file or folder name. */
export function slugify(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 60) || 'doodlegen'
  );
}

/** Folder and file stem for the exported pack. */
export function packSlug(config: Config, characters: string[]): string {
  const subject = subjectOf(config, characters).en;
  return slugify(`doodlegen-${subject}-${config.style}-${config.layout}`);
}
