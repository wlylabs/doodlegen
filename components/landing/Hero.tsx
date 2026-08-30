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
          <span key={index} className="h-8 rounded-full bg-line" style={{ width }} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center rounded-2xl border border-line bg-sheet p-3 shadow-lift">
        <div
          className="flex w-full max-w-[300px] items-center justify-center rounded-lg bg-sunk text-ink-mute"
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
    <section className="relative overflow-hidden bg-surface">
      {/*
       * One dotted field, faded out before it reaches the copy. The washes of
       * accent that used to sit behind the headline were the warmest thing on
       * the page; on a white ground they only muddied it.
       */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgb(var(--ink) / 0.07) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse 75% 60% at 50% 0%, black, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 60% at 50% 0%, black, transparent 72%)',
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:items-center lg:gap-16 lg:pb-24 lg:pt-24">
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
            <h1 className="mt-6 font-brand text-[38px] leading-[1.06] tracking-tightest sm:text-[50px] lg:text-[54px]">
              <span className="block text-balance">Halaman mewarnai &amp; tracing</span>
              <span className="block text-accent">yang siap dijual hari ini</span>
            </h1>
          </Reveal>

          <Reveal delay={150}>
            <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-ink-soft">
              Susun set alfabet, angka, atau nama sendiri; ambil PDF A4 dan US Letter yang benar-benar
              vektor, lengkap dengan sampul, lembar lisensi, gambar listing, dan draf deskripsi untuk
              Etsy, TPT, Gumroad, Shopee, Tokopedia, dan Pinterest.
            </p>
          </Reveal>

          <Reveal delay={220}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/studio" className="btn-primary !px-6 !py-3 !text-[15px]">
                Buka Studio
              </Link>
              <a href="#kit" className="btn-quiet !px-5 !py-3 !text-[15px]">
                Lihat isi kit marketplace
              </a>
            </div>
          </Reveal>

          <Reveal delay={280}>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2.5 border-t border-line pt-6">
              {PROOF.map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <CheckIcon className="h-3 w-3" />
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
