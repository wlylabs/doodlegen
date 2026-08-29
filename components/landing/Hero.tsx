'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { CheckIcon, SparkIcon, Spinner } from '../diagrams';
import { Reveal } from '../motion';
import { PAPERS } from '@/lib/presets';

/**
 * The demo runs the real layout engine, which means the font parser comes
 * with it. That is a lot of JavaScript to put in front of a first paint, so
 * it is fetched only once the page is idle — the placeholder holds its exact
 * space in the meantime, so nothing jumps when it arrives.
 */
const LiveDemo = dynamic(() => import('./LiveDemo').then((module) => module.LiveDemo), {
  ssr: false,
  loading: () => <DemoSkeleton />,
});

function DemoSkeleton() {
  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-1.5">
        {[64, 78, 86, 92, 88, 74].map((width, index) => (
          <span key={index} className="h-8 rounded-lg bg-line/70" style={{ width }} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center rounded-2xl border border-line bg-white p-3 shadow-sheet">
        <div
          className="flex w-full max-w-[300px] items-center justify-center rounded-lg bg-paper text-ink-mute"
          style={{ aspectRatio: `${PAPERS.a4.widthPt} / ${PAPERS.a4.heightPt}` }}
        >
          <Spinner />
        </div>
      </div>
      <p className="mt-2 text-center text-[12px] text-ink-mute">Menyiapkan pratinjau…</p>
    </div>
  );
}

const PROOF = ['A4 + US Letter', 'Vektor 300 DPI', 'Tanpa watermark', 'Lisensi komersial'];

export function Hero() {
  const [demoReady, setDemoReady] = useState(false);

  useEffect(() => {
    const start = () => setDemoReady(true);
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(start, { timeout: 1600 });
      return () => window.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(start, 600);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Two soft washes and a dotted field: the page's only decoration. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(28,25,23,0.10) 1px, transparent 0)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse 70% 55% at 50% 0%, black, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 55% at 50% 0%, black, transparent 75%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:pb-24 lg:pt-20">
        <div>
          <Reveal>
            <span className="pill bg-surface">
              <span className="text-accent">
                <SparkIcon className="h-3.5 w-3.5" />
              </span>
              Gratis, tanpa akun, jalan penuh di browser
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-5 text-balance font-brand text-[38px] leading-[1.05] tracking-tightest sm:text-[52px] lg:text-[58px]">
              Halaman mewarnai &amp; tracing
              <span className="block text-accent">yang siap dijual hari ini</span>
            </h1>
          </Reveal>

          <Reveal delay={150}>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-ink-soft">
              Susun set alfabet, angka, atau nama sendiri; ambil PDF A4 dan US Letter yang benar-benar
              vektor, lengkap dengan sampul, lembar lisensi, gambar listing, dan draf deskripsi untuk
              Etsy, Gumroad, dan Shopee.
            </p>
          </Reveal>

          <Reveal delay={220}>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/studio" className="btn-primary">
                Buka Studio
              </Link>
              <a href="#kit" className="btn-quiet !px-5 !py-3 !text-[15px]">
                Lihat isi kit marketplace
              </a>
            </div>
          </Reveal>

          <Reveal delay={280}>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
              {PROOF.map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
                  <span className="text-accent">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={180} className="lg:pl-6">
          {demoReady ? <LiveDemo /> : <DemoSkeleton />}
        </Reveal>
      </div>
    </section>
  );
}
