'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { InstallButton } from '../InstallPrompt';
import { Logo } from '../Logo';
import { ThemeToggle } from '../Theme';
import { useRipple } from '../motion';
import { SECTIONS } from '@/lib/site';

export function Nav() {
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const ripple = useRipple<HTMLButtonElement>();

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /*
   * Which section the reader is actually in.
   *
   * A nav that lists four anchors and never says which one you are looking at
   * is a table of contents, not a position. The band is the top third of the
   * viewport rather than the whole of it, so the answer changes when a heading
   * reaches reading height instead of when a section first peeks into view —
   * and with several sections visible at once on a tall screen, the last one
   * to have crossed that line is the one you are in.
   */
  useEffect(() => {
    const targets = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (node): node is HTMLElement => node !== null,
    );
    if (!targets.length || typeof IntersectionObserver === 'undefined') return;

    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) seen.set(entry.target.id, entry.isIntersecting);
        const inside = SECTIONS.filter((section) => seen.get(section.id));
        setActive(inside.length ? (inside[inside.length - 1]?.id ?? null) : null);
      },
      // Top third of the viewport: everything below it is "not yet".
      { rootMargin: '-64px 0px -67% 0px', threshold: 0 },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${
        stuck ? 'border-line bg-surface/90 shadow-xs backdrop-blur-md' : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="press rounded-lg" aria-label="DoodleGen">
          <Logo />
        </Link>

        <nav aria-label="Bagian halaman" className="ml-6 hidden gap-1 md:flex">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={active === section.id ? 'true' : undefined}
              className={`btn-ghost ${active === section.id ? '!text-ink' : ''}`}
            >
              {section.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Only renders where an install is actually on offer. */}
          <InstallButton className="hidden sm:inline-flex" />
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link href="/studio" className="btn-primary !px-4 !py-2 !text-[14px]">
            Buka Studio
          </Link>
          <button
            type="button"
            className="btn-quiet md:hidden"
            aria-expanded={open}
            aria-controls="nav-drawer"
            aria-label="Menu"
            onClick={(event) => {
              ripple(event);
              setOpen((value) => !value);
            }}
          >
            <span className="relative block h-3.5 w-4">
              <span
                className={`absolute left-0 h-0.5 w-4 rounded bg-current transition-all duration-300 ${
                  open ? 'top-1.5 rotate-45' : 'top-0'
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 h-0.5 w-4 rounded bg-current transition-opacity duration-200 ${
                  open ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`absolute left-0 h-0.5 w-4 rounded bg-current transition-all duration-300 ${
                  open ? 'top-1.5 -rotate-45' : 'top-3'
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <div
        id="nav-drawer"
        className={`grid overflow-hidden border-t border-line bg-surface transition-[grid-template-rows] duration-300 ease-out md:hidden ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] border-t-0'
        }`}
      >
        <nav aria-label="Bagian halaman" className="overflow-hidden">
          <div className="flex flex-col px-4 py-2">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                aria-current={active === section.id ? 'true' : undefined}
                className={`btn-ghost !justify-start ${active === section.id ? '!text-ink' : ''}`}
                onClick={() => setOpen(false)}
              >
                {section.label}
              </a>
            ))}
            <InstallButton className="mt-1 !justify-start sm:hidden" />
            {/* On a phone the strip goes in the drawer rather than the bar,
                where three more targets would crowd the one that matters. */}
            <ThemeToggle className="mt-2 self-start sm:hidden" />
          </div>
        </nav>
      </div>
    </header>
  );
}
