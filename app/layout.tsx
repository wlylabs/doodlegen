import type { Metadata, Viewport } from 'next';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';
import './globals.css';

const description =
  'Generator halaman mewarnai dan tracing alfabet, angka, dan kata: PDF A4 dan US Letter yang benar-benar vektor, plus gambar listing dan draf deskripsi untuk Etsy, TPT, Gumroad, Shopee, Tokopedia, dan Pinterest.';

// A deploy can point this at its own domain; localhost keeps dev links valid.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'DoodleGen — Halaman Mewarnai & Tracing Siap Cetak',
    template: '%s · DoodleGen',
  },
  description,
  applicationName: 'DoodleGen',
  manifest: '/manifest.webmanifest',
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
    title: 'DoodleGen',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: 'DoodleGen',
    title: 'DoodleGen — Halaman Mewarnai & Tracing Siap Cetak',
    description,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'DoodleGen' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DoodleGen — Halaman Mewarnai & Tracing Siap Cetak',
    description,
    images: ['/og.png'],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFFFFF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        {/*
          Reveal-on-scroll hides sections until an observer shows them, so the
          hidden state is scoped to a class the document only gets when
          scripting is actually running.
        */}
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
        {/* The default face is needed before the first paint of the preview. */}
        <link
          rel="preload"
          href="/fonts/Baloo2-ExtraBold.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
