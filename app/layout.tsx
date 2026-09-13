import type { Metadata, Viewport } from 'next';
import { ConnectionWatcher, ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';
import { StructuredData } from '@/components/StructuredData';
import { THEME_SCRIPT } from '@/components/Theme';
import { Toaster } from '@/components/Toaster';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site';
import './globals.css';

const title = `${SITE_NAME} — ${SITE_TAGLINE}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: '/manifest.webmanifest',
  /*
   * Where this page really lives.
   *
   * `trailingSlash` means every route is served at one spelling and reachable
   * at two, and a static host will happily answer both. A canonical is what
   * stops the pair being indexed as duplicates. Each route sets its own,
   * relative to `metadataBase`.
   */
  alternates: { canonical: '/' },
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'education',
  keywords: [
    'halaman mewarnai',
    'lembar kerja tracing',
    'worksheet alfabet',
    'belajar menulis anak',
    'printable pdf',
    'produk digital marketplace',
  ],
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  // `appleWebApp.capable` above emits the standardised `mobile-web-app-capable`.
  // iOS before 16.4 only understands the old apple-prefixed spelling, and that
  // is the meta deciding whether a home-screen launch opens full screen or in
  // a Safari tab, so both are sent.
  other: { 'apple-mobile-web-app-capable': 'yes' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: '/',
    siteName: SITE_NAME,
    title,
    description: SITE_DESCRIPTION,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description: SITE_DESCRIPTION,
    images: ['/og.png'],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  /*
   * The colour the browser paints its own chrome with, per scheme. A single
   * white value here is what leaves an installed app with a white status bar
   * sitting on top of a dark page — the one strip of the window the CSS
   * cannot reach. The values are `--surface` at each end, because the header
   * the bar sits against is what it has to be continuous with.
   */
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#161921' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        {/*
          Two decisions the document has to take before it is first painted,
          in one blocking script.

          The theme, because a stored "dark" applied after paint is a white
          flash on a night-set device — and reveal-on-scroll, which hides
          sections until an observer shows them, so the hidden state is scoped
          to a class the document only gets when scripting is actually running.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* The default face is needed before the first paint of the preview. */}
        <link
          rel="preload"
          href="/fonts/Baloo2-ExtraBold.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <StructuredData />
      </head>
      <body>
        {/*
          The first thing in the tab order and invisible until it has focus:
          the way a keyboard skips a nav full of links and reaches the page.
        */}
        <a href="#main" className="skip-link">
          Lompat ke konten utama
        </a>
        {children}
        <ServiceWorkerRegistrar />
        <ConnectionWatcher />
        <Toaster />
      </body>
    </html>
  );
}
