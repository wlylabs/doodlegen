import { MAX_PAGES } from './presets';
import type { Config, LoadedFont } from './types';

const A = 'A'.charCodeAt(0);

/** Longest a single practice entry may be before it stops fitting a row. */
export const MAX_WORD_LENGTH = 14;

export function letterList(kind: Config['letterCase']): string[] {
  const out: string[] = [];
  for (let i = 0; i < 26; i += 1) {
    const upper = String.fromCharCode(A + i);
    const lower = upper.toLowerCase();
    if (kind === 'upper') out.push(upper);
    else if (kind === 'lower') out.push(lower);
    else out.push(upper + lower);
  }
  return out;
}

export function numberList(from: number, to: number): string[] {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const out: string[] = [];
  for (let n = lo; n <= hi && out.length < MAX_PAGES; n += 1) out.push(String(n));
  return out;
}

/**
 * Free text, one practice entry per line or per comma. Duplicates are kept —
 * a name pack that repeats a name on purpose is a real order.
 */
export function wordList(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((entry) => entry.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .map((entry) => entry.slice(0, MAX_WORD_LENGTH))
    .slice(0, MAX_PAGES);
}

/** The ordered list of characters, one entry per generated page. */
export function buildCharacters(config: Config): string[] {
  if (config.content === 'numbers') return numberList(config.numberFrom, config.numberTo);
  if (config.content === 'words') return wordList(config.words);
  return letterList(config.letterCase);
}

export function clampNumber(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(999, Math.round(value)));
}

export interface RangeIssue {
  kind: 'error' | 'warning';
  message: string;
}

export function validate(config: Config): RangeIssue[] {
  const issues: RangeIssue[] = [];

  if (config.content === 'numbers') {
    const lo = Math.min(config.numberFrom, config.numberTo);
    const hi = Math.max(config.numberFrom, config.numberTo);
    const span = hi - lo + 1;
    if (span > MAX_PAGES) {
      issues.push({
        kind: 'warning',
        message: `Rentang dipotong pada ${MAX_PAGES} halaman pertama (${lo}–${lo + MAX_PAGES - 1}).`,
      });
    }
  }

  if (config.content === 'words') {
    const entries = wordList(config.words);
    if (!entries.length) {
      issues.push({
        kind: 'error',
        message: 'Tulis minimal satu kata. Satu kata per baris, atau pisahkan dengan koma.',
      });
    }
    const trimmed = config.words
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > MAX_WORD_LENGTH);
    if (trimmed.length) {
      issues.push({
        kind: 'warning',
        message: `${trimmed.length} kata dipotong pada ${MAX_WORD_LENGTH} huruf agar tetap terbaca saat dicetak.`,
      });
    }
  }

  return issues;
}

/** Fills the page-title template, e.g. "Trace and color — {char}". */
export function renderTitle(template: string, label: string): string {
  return template.replace(/\{char\}/g, label).trim();
}

/**
 * Characters the chosen face cannot draw. The shipped faces are trimmed to
 * printable ASCII plus a little punctuation, so a pasted title can carry
 * something that would silently vanish from the PDF; the UI says so instead.
 */
export function unsupportedCharacters(font: LoadedFont, text: string): string[] {
  const seen = new Set<string>();
  for (const character of text) {
    if (character === ' ' || character === '\n') continue;
    if (!font.supports(character) && !seen.has(character)) seen.add(character);
  }
  return [...seen];
}

const CASE_LABEL: Record<Config['letterCase'], { id: string; en: string }> = {
  upper: { id: 'Huruf Besar A–Z', en: 'Uppercase A-Z' },
  lower: { id: 'Huruf Kecil a–z', en: 'Lowercase a-z' },
  both: { id: 'Huruf Besar & Kecil', en: 'Uppercase and Lowercase' },
};

/** Human name for the character set, in both listing languages. */
export function subjectOf(config: Config, characters: string[]): { id: string; en: string } {
  if (config.content === 'numbers') {
    const first = characters[0] ?? '1';
    const last = characters[characters.length - 1] ?? first;
    return { id: `Angka ${first}–${last}`, en: `Numbers ${first}-${last}` };
  }
  if (config.content === 'words') {
    return { id: 'Kata & Nama', en: 'Words and Names' };
  }
  return CASE_LABEL[config.letterCase];
}
