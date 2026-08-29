'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '../Logo';
import { useRipple } from '../motion';

const LINKS = [
  { href: '#fitur', label: 'Fitur' },
  { href: '#standar', label: 'Standar cetak' },
  { href: '#kit', label: 'Kit marketplace' },
  { href: '#faq', label: 'FAQ' },
];

export function Nav() {
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);
  const ripple = useRipple<HTMLButtonElement>();

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${
        stuck ? 'border-line bg-surface/85 backdrop-blur-md' : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="press rounded-lg" aria-label="DoodleGen">
          <Logo />
        </Link>

        <nav className="ml-6 hidden gap-1 md:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="btn-ghost">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/studio" className="btn-primary !px-4 !py-2 !text-[14px]">
            Buka Studio
          </Link>
          <button
            type="button"
            className="btn-quiet md:hidden"
            aria-expanded={open}
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
        className={`grid overflow-hidden border-t border-line bg-surface transition-[grid-template-rows] duration-300 ease-out md:hidden ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] border-t-0'
        }`}
      >
        <nav className="overflow-hidden">
          <div className="flex flex-col px-4 py-2">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="btn-ghost !justify-start"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
