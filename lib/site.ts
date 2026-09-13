/**
 * What the site says about itself, stated once.
 *
 * The origin, the two routes, the section anchors and the description are
 * each read by more than one thing — the metadata, the sitemap, the robots
 * file, the structured data, the nav and the footer — and a canonical URL
 * that disagrees with the sitemap is worse than having neither.
 */

/**
 * The deployed origin. A deploy points `NEXT_PUBLIC_SITE_URL` at its own
 * domain; localhost keeps dev links valid, and is never what a build for
 * production is left holding, because a canonical pointing at localhost is
 * how a page quietly asks not to be indexed.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

export const SITE_NAME = 'DoodleGen';

export const SITE_TAGLINE = 'Halaman Mewarnai & Tracing Siap Cetak';

export const SITE_DESCRIPTION =
  'Generator halaman mewarnai dan tracing alfabet, angka, dan kata: PDF A4 dan US Letter yang benar-benar vektor, plus gambar listing dan draf deskripsi untuk Etsy, TPT, Gumroad, Shopee, Tokopedia, dan Pinterest.';

/** Every route the app actually has, which is also every route worth listing. */
export const ROUTES = ['/', '/studio/'] as const;

/**
 * The landing page's own sections, in the order they appear. The nav, the
 * footer and the in-page anchors all read this, so a renamed section cannot
 * leave a dead link behind in one of the three.
 */
export const SECTIONS = [
  { id: 'fitur', label: 'Fitur' },
  { id: 'standar', label: 'Standar cetak' },
  { id: 'kit', label: 'Kit marketplace' },
  { id: 'faq', label: 'FAQ' },
] as const;

/** An absolute URL for a path, for the places that cannot take a relative one. */
export function absolute(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
