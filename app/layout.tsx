import type { Metadata, Viewport } from 'next';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';
import './globals.css';

const description =
  'Alat internal untuk menyusun halaman mewarnai dan tracing alfabet serta angka, siap cetak dalam A4 dan US Letter.';

export const metadata: Metadata = {
  title: 'DoodleGen — Halaman Mewarnai Alfabet & Angka',
  description,
  applicationName: 'DoodleGen',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'DoodleGen',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  // Internal tool, not a public product.
  robots: { index: false, follow: false },
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
