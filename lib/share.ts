import { clampNumber } from './charset';
import { PALETTE_ORDER } from './palette';
import { DEFAULT_CONFIG, FONTS, GRIDS, INKS, LAYOUTS, MARGIN_OPTIONS, STROKES, STYLES } from './presets';
import type { Config } from './types';

const STORAGE_KEY = 'doodlegen.config.v2';
const HASH_KEY = 'c';

const ONE_OF = {
  content: ['letters', 'numbers', 'words'],
  letterCase: ['upper', 'lower', 'both'],
  style: STYLES.map((item) => item.id),
  layout: LAYOUTS.map((item) => item.id),
  grid: Object.keys(GRIDS),
  font: Object.keys(FONTS),
  paper: ['a4', 'letter', 'both'],
  stroke: Object.keys(STROKES),
  ink: Object.keys(INKS),
  language: ['en', 'id'],
  palette: PALETTE_ORDER,
} as const;

const BOOLEANS = ['guides', 'showTitle', 'pageNumbers', 'coverPage', 'termsPage'] as const;
const STRINGS = ['words', 'titleTemplate', 'brand', 'productTitle'] as const;

/** Longest value accepted from a shared link, so a URL cannot bloat the app. */
const MAX_TEXT = 600;

/**
 * A config from a link or from storage is untrusted input: every field is
 * checked against the same option lists the UI offers, and anything else is
 * dropped rather than fixed up.
 */
export function sanitizeConfig(raw: unknown): Partial<Config> {
  if (!raw || typeof raw !== 'object') return {};
  const input = raw as Record<string, unknown>;
  const out: Partial<Config> = {};

  for (const [key, allowed] of Object.entries(ONE_OF)) {
    const value = input[key];
    if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
      Object.assign(out, { [key]: value });
    }
  }

  for (const key of BOOLEANS) {
    if (typeof input[key] === 'boolean') out[key] = input[key] as boolean;
  }

  for (const key of STRINGS) {
    const value = input[key];
    if (typeof value === 'string') out[key] = value.slice(0, MAX_TEXT);
  }

  if (typeof input.numberFrom === 'number') out.numberFrom = clampNumber(input.numberFrom);
  if (typeof input.numberTo === 'number') out.numberTo = clampNumber(input.numberTo);
  if (typeof input.marginIn === 'number' && MARGIN_OPTIONS.includes(input.marginIn)) {
    out.marginIn = input.marginIn;
  }

  return out;
}

/** Only what differs from the defaults travels, so links stay short. */
function diffFromDefaults(config: Config): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULT_CONFIG) as (keyof Config)[]) {
    if (config[key] !== DEFAULT_CONFIG[key]) out[key] = config[key];
  }
  return out;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeConfig(config: Config): string {
  return toBase64Url(JSON.stringify(diffFromDefaults(config)));
}

export function decodeConfig(value: string): Partial<Config> {
  try {
    return sanitizeConfig(JSON.parse(fromBase64Url(value)));
  } catch {
    return {};
  }
}

/** A link that reopens the studio on exactly this setup. */
export function shareUrl(config: Config): string {
  const url = new URL(window.location.href);
  url.hash = `${HASH_KEY}=${encodeConfig(config)}`;
  return url.toString();
}

export function configFromLocation(): Partial<Config> {
  if (typeof window === 'undefined') return {};
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash.startsWith(`${HASH_KEY}=`)) return {};
  return decodeConfig(hash.slice(HASH_KEY.length + 1));
}

/** A landing-page link like /studio#p=etsy-alphabet names a starter pack. */
export function presetFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash.startsWith('p=')) return null;
  const id = hash.slice(2).replace(/[^a-z0-9-]/gi, '').slice(0, 40);
  return id || null;
}

export function loadStoredConfig(): Partial<Config> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeConfig(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function storeConfig(config: Config): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(diffFromDefaults(config)));
  } catch {
    // Private mode, or a full quota: losing the last setup is survivable.
  }
}
