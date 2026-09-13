import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * Everything here is public and worth indexing, so this file exists for the
 * one line at the bottom: a crawler that finds `robots.txt` and no sitemap in
 * it has to discover the rest of the site by following links.
 */
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
