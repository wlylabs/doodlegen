import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export const metadata: Metadata = {
  title: 'Halaman tidak ditemukan',
  robots: { index: false, follow: true },
};

/**
 * The page a mistyped or retired URL lands on.
 *
 * A 404 is a dead end only if it is written as one. This one says what
 * happened in a sentence and then does the single most useful thing it can:
 * offers the two doors the site actually has. The static export writes it to
 * `out/404.html`, which is the file every static host serves for a path it
 * cannot match — so it is also what an offline visit to a never-cached URL
 * falls back to.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-16 text-center">
      <Logo />

      <p className="mt-10 font-brand text-[64px] leading-none tracking-tightest text-line-strong">
        404
      </p>
      <h1 className="mt-4 text-balance font-brand text-[26px] leading-tight tracking-tightest sm:text-[32px]">
        Halaman ini tidak ada
      </h1>
      <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-ink-soft">
        Tautannya mungkin salah ketik, atau halamannya sudah dipindahkan. Studio dan berandanya
        masih di tempat.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/studio" className="btn-primary !px-6 !py-3 !text-[15px]">
          Buka Studio
        </Link>
        <Link href="/" className="btn-quiet !px-5 !py-3 !text-[15px]">
          Ke beranda
        </Link>
      </div>
    </main>
  );
}
