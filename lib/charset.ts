import { MAX_PAGES } from './presets';
import type { Config } from './types';

const A = 'A'.charCodeAt(0);

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

/** The ordered list of characters, one entry per generated page. */
export function buildCharacters(config: Config): string[] {
  return config.content === 'letters'
    ? letterList(config.letterCase)
    : numberList(config.numberFrom, config.numberTo);
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
  return issues;
}

/** Fills the page-title template, e.g. "Trace and color — {char}". */
export function renderTitle(template: string, label: string): string {
  return template.replace(/\{char\}/g, label).trim();
}
