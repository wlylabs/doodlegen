import { subjectOf } from './charset';
import type { Config, LanguageId } from './types';

/**
 * What a buyer types into the box, derived from the pack itself.
 *
 * A fixed keyword list would describe a fixed product, and this one is not:
 * an outline pack is bought by someone searching for colouring pages, a
 * progressive pack by someone searching for handwriting practice, and a
 * numbers pack by someone who typed the range. So the words come out of the
 * config the same way the page count does — which also means two packs from
 * this studio stop competing for the same phrase.
 *
 * Where the phrases are allowed to work differs per marketplace, and that is
 * the whole reason this file exists apart from the copy:
 *
 *   Etsy        tags rank, and the title is matched against the query too
 *   TPT         grade and subject facets filter first, keywords second
 *   Gumroad     category and name; Discover leans on sales, not prose
 *   Shopee      the product name is the only field the search engine reads
 *   Tokopedia   the name, and the description as well
 *   Pinterest   title, description, board name and alt text, all of it prose
 */
export interface KeywordSet {
  /**
   * The one phrase this listing is trying to win. It has to appear in the
   * title verbatim, and in the opening of the description wherever the
   * marketplace indexes descriptions at all.
   */
  focus: string;
  /** Long-tail phrases, strongest intent first. */
  phrases: string[];
  /** Who it is for, in the words they use for themselves. */
  audience: string[];
  /** How it arrives. Weak on its own, decisive next to a phrase. */
  format: string[];
}

/** What the pack teaches, as the noun a buyer would type. */
function nounOf(config: Config, characters: string[], language: LanguageId): string {
  const subject = subjectOf(config, characters);
  if (config.content === 'numbers') {
    // The range is the search term — "angka 1-20" is typed, "angka" is not —
    // and it is typed with the hyphen on the keyboard, not the en dash the
    // printed subject line is set with.
    const label = language === 'id' ? subject.id : subject.en;
    return label.toLowerCase().replace(/[\u2013\u2014]/g, '-');
  }
  if (config.content === 'words') return language === 'id' ? 'kata' : 'words';
  if (language === 'id') {
    return config.letterCase === 'lower' ? 'huruf kecil' : 'huruf';
  }
  return config.letterCase === 'lower' ? 'lowercase letters' : 'alphabet';
}

/** A short form of the same noun, for tags that have 20 characters to live in. */
function shortNoun(config: Config, language: LanguageId): string {
  if (config.content === 'numbers') return language === 'id' ? 'angka' : 'numbers';
  if (config.content === 'words') return language === 'id' ? 'kata' : 'words';
  return language === 'id' ? 'huruf' : 'letter';
}

/**
 * A colouring pack and a tracing pack are two different searches. The style
 * decides which one this is, and every phrase below follows from it.
 */
function isColouring(config: Config): boolean {
  return config.style === 'outline';
}

export function keywordsFor(config: Config, characters: string[], language: LanguageId): KeywordSet {
  const noun = nounOf(config, characters, language);
  const short = shortNoun(config, language);
  const colouring = isColouring(config);
  const words = config.content === 'words';

  if (language === 'id') {
    const focus = colouring ? `mewarnai ${noun}` : `belajar menulis ${noun}`;
    return {
      focus,
      phrases: [
        focus,
        `lembar kerja ${noun}`,
        colouring ? `mewarnai ${short}` : `belajar menulis ${short}`,
        `latihan menulis ${short}`,
        `worksheet ${short}`,
        words ? 'belajar menulis nama' : `${short} untuk anak tk`,
        'lembar kerja anak',
        'belajar menulis anak',
        'mewarnai anak',
        `${short} anak tk`,
        'printable anak',
      ],
      audience: ['paud tk', 'anak tk', 'anak paud', 'belajar anak', 'aktivitas anak'],
      format: ['printable pdf', 'file pdf', 'siap cetak', 'download digital', 'ebook anak'],
    };
  }

  const focus = colouring ? `${noun} coloring pages` : `${noun} tracing worksheets`;
  return {
    focus,
    phrases: [
      focus,
      colouring ? `${short} coloring page` : `${short} tracing`,
      `${short} worksheets`,
      // Short forms of the same search, because a 20-character tag field
      // throws away the long one and a dropped tag ranks for nothing.
      ...(config.content === 'letters'
        ? colouring
          ? ['alphabet coloring', 'abc coloring page', 'abc printable']
          : ['alphabet tracing', 'abc worksheets', 'abc printable']
        : []),
      words ? 'name tracing' : 'trace and color',
      'handwriting practice',
      'preschool worksheets',
      'kindergarten practice',
      'learn to write',
      'fine motor skills',
    ],
    audience: ['preschool', 'kindergarten', 'homeschool', 'montessori', 'toddler activity'],
    format: ['printable pdf', 'instant download', 'digital download', 'print at home'],
  };
}

/** Two phrases are the same search when they carry the same words. */
function fingerprint(phrase: string): string {
  return phrase
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

export function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** True when a title or a description already carries this phrase. */
export function carries(haystack: string, phrase: string): boolean {
  return normalise(haystack).includes(normalise(phrase));
}

/**
 * Tags, fitted to one marketplace's rules and ordered by how much work they
 * do. Multi-word phrases go first because a long-tail tag is the one a buyer
 * actually types; single words are filler that every competing listing also
 * carries. Anything that repeats a search already covered is dropped rather
 * than spending one of thirteen slots on a synonym.
 */
export function fitTags(
  keywords: KeywordSet,
  limits: { tagMax: number; tagCount: number },
  extra: string[] = [],
): string[] {
  const pool = [...keywords.phrases, ...extra, ...keywords.audience, ...keywords.format];
  const out: string[] = [];
  const seen = new Set<string>();

  // Two passes: everything long-tail that fits, then the short words that are
  // left, so a 20-character limit never costs the phrases that rank.
  for (const wanted of [2, 1]) {
    for (const raw of pool) {
      const tag = raw.trim().toLowerCase();
      const size = tag.split(/\s+/).length;
      if (!tag || tag.length > limits.tagMax) continue;
      if (wanted === 2 ? size < 2 : size !== 1) continue;
      const print = fingerprint(tag);
      if (seen.has(print)) continue;
      seen.add(print);
      out.push(tag);
      if (out.length === limits.tagCount) return out;
    }
  }

  return out;
}

/** Words that are shouted rather than capitalised: PAUD TK, PDF, A4. */
const ACRONYMS = new Set(['pdf', 'tk', 'paud', 'sd', 'abc', 'a4', 'svg', 'cvc', 'ela']);

/** Title Case, for the marketplaces whose titles are read as headlines. */
export function titleCase(phrase: string): string {
  const small = new Set(['and', 'for', 'the', 'to', 'a', 'of', 'in', 'with']);
  return phrase
    .split(/\s+/)
    .map((word, index) => {
      if (ACRONYMS.has(word)) return word.toUpperCase();
      if (index > 0 && small.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/** Cut at a word boundary, never mid-word. */
export function clampPhrase(phrase: string, max: number): string {
  if (phrase.length <= max) return phrase;
  const cut = phrase.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return (space > max * 0.6 ? cut.slice(0, space) : cut).trim();
}

/**
 * Segments joined until the marketplace's limit is reached, dropping whole
 * segments rather than cutting one in half. A title that ends mid-phrase
 * loses the phrase it was cut from, which is the one thing a keyword title
 * cannot afford.
 *
 * The first segment is the exception, because it is the product's own name:
 * a seller who typed a title longer than Tokopedia's seventy characters gets
 * it shortened, never dropped in favour of a keyword.
 */
export function joinWithin(
  segments: string[],
  max: number,
  separator = ' | ',
  /**
   * How many segments are the title rather than decoration on it. The first
   * is the product's own name and the second is the phrase the listing is
   * trying to win; both go in even when they share a word. Everything after
   * them has to earn its place without repeating one.
   */
  protect = 2,
): string {
  const out: string[] = [];
  const used = new Map<string, number>();
  const count = (text: string) => {
    for (const word of normalise(text).split(' ')) {
      if (word.length < 3) continue;
      used.set(word, (used.get(word) ?? 0) + 1);
    }
  };

  for (const segment of segments) {
    const piece = segment.trim();
    if (!piece) continue;

    if (!out.length) {
      const head = clampPhrase(piece, max);
      count(head);
      out.push(head);
      continue;
    }

    const joined = out.join(separator);
    // Repeating a phrase the title already carries is stuffing: it adds no
    // second search, and every marketplace here ranks it down for trying.
    if (carries(joined, piece)) continue;
    if (`${joined}${separator}${piece}`.length > max) continue;
    if (out.length >= protect) {
      const words = normalise(piece).split(' ').filter((word) => word.length >= 3);
      if (words.some((word) => (used.get(word) ?? 0) >= 2)) continue;
    }
    count(piece);
    out.push(piece);
  }
  return out.join(separator);
}

/**
 * The keyword tail Shopee's search lives on. The head of the name is what a
 * buyer reads on a phone card; everything after it is there for the engine,
 * so it carries only phrases the head has not already used, and stops well
 * short of the 255 the form allows — a name stuffed to the limit reads as
 * spam to the buyer who finally opens it, and Shopee ranks that down.
 */
export function keywordTail(head: string, keywords: KeywordSet, budget: number): string[] {
  const out: string[] = [];
  let length = 0;

  // Four phrases built around one noun are not four searches — they are the
  // same search, written out four times, which is exactly what a marketplace
  // means by keyword stuffing. So no word may appear more than twice in the
  // whole name, head included.
  const used = new Map<string, number>();
  const count = (text: string) => {
    for (const word of normalise(text).split(' ')) {
      if (word.length < 3) continue;
      used.set(word, (used.get(word) ?? 0) + 1);
    }
  };
  count(head);

  for (const phrase of [...keywords.phrases, ...keywords.audience, ...keywords.format]) {
    if (carries(head, phrase) || out.some((taken) => carries(taken, phrase))) continue;
    if (length + phrase.length + 3 > budget) continue;
    if (phrase !== keywords.focus) {
      const words = normalise(phrase).split(' ').filter((word) => word.length >= 3);
      if (words.some((word) => (used.get(word) ?? 0) >= 2)) continue;
    }
    count(phrase);
    out.push(phrase);
    length += phrase.length + 3;
  }
  return out;
}
