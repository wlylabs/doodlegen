import type { MetadataRoute } from 'next';
import { ROUTES, SITE_URL } from '@/lib/site';

/**
 * Two pages, listed properly.
 *
 * Small enough to write by hand and exactly the reason not to: a route added
 * to `ROUTES` is a route the sitemap, the robots file and the worker's shell
 * all learn about at once, and a sitemap that lags the site is a sitemap that
 * sends crawlers to pages that moved.
 *
 * `export const dynamic` is what makes this file survive `output: 'export'` —
 * it is rendered once at build time into `out/sitemap.xml`.
 */
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    // The studio is the product; the landing page is how it is found.
    priority: route === '/studio/' ? 1 : 0.8,
  }));
}
