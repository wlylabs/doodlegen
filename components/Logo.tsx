'use client';

import { useId } from 'react';

/**
 * The mark.
 *
 * A "D" drawn the way DoodleGen draws a worksheet: the stem is the solid
 * contour a child colours in, the bowl is the dashed line a child traces, and
 * the two treatments sitting on one letter are the whole product in a shape
 * that still reads at 16px.
 *
 * It comes in two dresses. `LogoGlyph` is the bare letter, for anywhere it
 * sits on the page's own ground. `LogoMark` is the app icon — the glyph in
 * white on a rounded tile carrying the brand ramp — and that is the one the
 * chrome wears, because an installed app is recognised by its icon and the
 * bar it launched from should be showing the same object as the launcher.
 */

/** The letter itself, on a 24-unit grid, so both dresses share one drawing. */
function Glyph({ stem, dashes, width = 3.2 }: { stem: string; dashes: string; width?: number }) {
  return (
    <>
      <path d="M6.2 4.4V19.6" fill="none" stroke={stem} strokeWidth={width} strokeLinecap="round" />
      <path
        d="M6.2 4.4h4.2a7.6 7.6 0 0 1 0 15.2H6.2"
        fill="none"
        stroke={dashes}
        strokeWidth={width}
        strokeLinecap="round"
        /*
         * The bowl is dashed rather than dotted. Dots were the first drawing
         * and they lose the letter: at 24px six circles beside a bar read as
         * a bracket and a colon, not a D. A long dash with a short gap keeps
         * the curve continuous enough to be read and still says the thing
         * worth saying — this is a line drawn to be traced.
         */
        strokeDasharray="3.4 2.3"
      />
    </>
  );
}

export function LogoGlyph({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" role="presentation">
      <Glyph stem="currentColor" dashes="rgb(var(--accent))" />
    </svg>
  );
}

export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  // Two marks can share a page — the header and the palette, say — and two
  // gradients cannot share an id, so each instance names its own.
  const id = useId();
  const gradient = `dg-brand-${id.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" role="presentation">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--brand-from))" />
          <stop offset="52%" stopColor="rgb(var(--brand-via))" />
          <stop offset="100%" stopColor="rgb(var(--brand-to))" />
        </linearGradient>
      </defs>
      {/* A squircle rather than a rounded rect: the corner every platform
          masks an icon into, so the tile in the bar is the tile in the dock. */}
      <rect width="32" height="32" rx="9.2" fill={`url(#${gradient})`} />
      <g transform="translate(4 4)">
        <Glyph stem="#FFFFFF" dashes="#FFFFFF" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-brand text-[17px] leading-none tracking-tightest text-ink ${className}`}>
      DoodleGen
    </span>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-[26px] w-[26px]" />
      <Wordmark />
    </span>
  );
}
