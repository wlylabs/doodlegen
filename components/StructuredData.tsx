import { FAQ } from '@/lib/content';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL, absolute } from '@/lib/site';

/**
 * What the page is, said in the one vocabulary a search engine reads directly.
 *
 * Three things are worth declaring and nothing else is. The site, so a result
 * can carry the name rather than the domain. The application, because that is
 * genuinely what this is — free, browser-based, no account — and those are
 * exactly the facts a listing can show. And the questions, which are already
 * written on the page: an `FAQPage` is the rare bit of structured data that
 * asks for nothing that is not visible to a reader, which is also the only
 * kind that is safe to publish.
 *
 * Rendered from a server component into the static export, so it costs the
 * client nothing at all.
 */
export function StructuredData() {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: 'id-ID',
      },
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}/#app`,
        name: `${SITE_NAME} — ${SITE_TAGLINE}`,
        url: absolute('/studio/'),
        description: SITE_DESCRIPTION,
        applicationCategory: 'DesignApplication',
        // It genuinely runs anywhere with a browser: nothing here touches a
        // server, which is the claim the landing page makes as well.
        operatingSystem: 'Any',
        browserRequirements: 'Membutuhkan JavaScript.',
        inLanguage: 'id-ID',
        image: absolute('/og.png'),
        isPartOf: { '@id': `${SITE_URL}/#website` },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'IDR' },
        featureList: [
          'PDF vektor A4 dan US Letter',
          'Halaman mewarnai, tracing, dan lembar kerja bergaris',
          'Halaman sampul dan lembar lisensi',
          'Gambar listing dan draf deskripsi marketplace',
          'Bekerja offline setelah dipasang',
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        mainEntity: FAQ.map((entry) => ({
          '@type': 'Question',
          name: entry.question,
          acceptedAnswer: { '@type': 'Answer', text: entry.answer },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // The content is this repository's own copy, not anything a visitor
      // supplied, and JSON.stringify escapes what it contains.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
