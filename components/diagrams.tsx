import type { ReactNode } from 'react';
import type { CoverStyle } from '@/lib/covers';

/**
 * Small abstract marks for the option tiles. They describe the treatment
 * (solid contour, dotted contour, one of each) and the page structure,
 * without pretending to be a preview — the real preview is one panel away.
 */
const stroke = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' } as const;

export function StyleMark({
  kind,
}: {
  kind: 'outline' | 'dotted' | 'combo' | 'progressive';
}) {
  if (kind === 'progressive') {
    /*
     * The ladder: shown, traced, then written unaided. Three rungs, evenly
     * spaced, all standing on one baseline. It used to carry a fourth rung
     * at 35% opacity and a short rule floating beside it, which at icon size
     * read as a half-rendered glyph next to a stray dash rather than as a
     * sequence.
     */
    return (
      <svg viewBox="0 0 44 22" className="h-6 w-[52px]" aria-hidden="true">
        <rect x="1.5" y="3" width="11" height="15" rx="3.4" {...stroke} strokeWidth="1.6" />
        <rect
          x="16.5"
          y="3"
          width="11"
          height="15"
          rx="3.4"
          {...stroke}
          strokeWidth="1.6"
          strokeDasharray="0.01 2.8"
        />
        {/* The last rung is the empty cell, named by the line it is written on. */}
        <line x1="31.5" x2="42.5" y1="19.6" y2="19.6" {...stroke} strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 44 22" className="h-6 w-[52px]" aria-hidden="true">
      {kind !== 'combo' ? (
        <rect
          x="12"
          y="3"
          width="20"
          height="16"
          rx="5"
          {...stroke}
          strokeWidth="1.8"
          strokeDasharray={kind === 'dotted' ? '0.01 3.2' : undefined}
        />
      ) : (
        <>
          <rect x="2" y="3" width="18" height="16" rx="5" {...stroke} strokeWidth="1.8" />
          <rect
            x="24"
            y="3"
            width="18"
            height="16"
            rx="5"
            {...stroke}
            strokeWidth="1.8"
            strokeDasharray="0.01 3.2"
          />
        </>
      )}
    </svg>
  );
}

export function LayoutMark({ kind }: { kind: 'single' | 'grid' | 'worksheet' }) {
  const page = <rect x="0.7" y="0.7" width="30.6" height="42.6" rx="2.5" {...stroke} strokeWidth="1.2" />;
  return (
    <svg viewBox="0 0 32 44" className="h-9 w-[26px]" aria-hidden="true">
      {page}
      {kind === 'single' ? <rect x="7" y="12" width="18" height="20" rx="3" {...stroke} strokeWidth="1.6" /> : null}
      {kind === 'grid'
        ? [0, 1, 2].flatMap((row) =>
            [0, 1, 2].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={5 + col * 7.6}
                y={8 + row * 9.6}
                width="5.4"
                height="7"
                rx="1.4"
                {...stroke}
                strokeWidth="1.2"
              />
            )),
          )
        : null}
      {kind === 'worksheet' ? (
        <>
          <rect x="10" y="5" width="12" height="13" rx="2.6" {...stroke} strokeWidth="1.5" />
          {[0, 1, 2].map((row) => (
            <line
              key={row}
              x1="5"
              x2="27"
              y1={25 + row * 6}
              y2={25 + row * 6}
              {...stroke}
              strokeWidth="1.2"
              strokeDasharray="0.01 2.6"
            />
          ))}
        </>
      ) : null}
    </svg>
  );
}

/**
 * Every cover composition, as page furniture: where the type sits, and how
 * many characters are on show. The colourful ones are drawn with their own
 * silhouette — a balloon, a burst, an arch — because that shape is the whole
 * reason a seller picks one over another.
 */
export function CoverMark({ kind }: { kind: CoverStyle['page'] }) {
  const line = (key: string, x: number, y: number, w: number, weight = 1.2) => (
    <line key={key} x1={x} x2={x + w} y1={y} y2={y} {...stroke} strokeWidth={weight} />
  );
  // Every composition closes the same way: a hairline across the foot with
  // the shop's name tracked out under it. The mark shows that, because it is
  // the one thing all twelve now have in common.
  const imprint = (ruleX = 5, ruleW = 22, nameX = 10, nameW = 12) => [
    line('imprint-rule', ruleX, 38, ruleW, 0.9),
    line('imprint-name', nameX, 41, nameW, 1.4),
  ];
  return (
    <svg viewBox="0 0 32 44" className="h-9 w-[26px]" aria-hidden="true">
      <rect x="0.7" y="0.7" width="30.6" height="42.6" rx="2.5" {...stroke} strokeWidth="1.2" />
      {kind === 'classic' ? (
        <>
          {line('title', 7, 10, 18, 2.2)}
          {line('sub', 10, 15, 12, 1)}
          {[0, 1, 2].map((index) => (
            <rect
              key={index}
              x={5.5 + index * 7.4}
              y="21"
              width="5.6"
              height="10"
              rx="1.4"
              {...stroke}
              strokeWidth="1.2"
            />
          ))}
          {imprint()}
        </>
      ) : null}
      {kind === 'poster' ? (
        <>
          <rect x="6" y="10" width="20" height="19" rx="3" {...stroke} strokeWidth="1.6" />
          {line('title', 6, 34, 20, 2.4)}
          {imprint()}
        </>
      ) : null}
      {kind === 'showcase' ? (
        <>
          {[0, 1].flatMap((row) =>
            [0, 1].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={6 + col * 11}
                y={7 + row * 11.5}
                width="9"
                height="9.5"
                rx="1.6"
                {...stroke}
                strokeWidth="1.2"
              />
            )),
          )}
          {line('title', 6, 34, 17, 2.2)}
          {imprint(4, 24, 4, 11)}
        </>
      ) : null}
      {kind === 'minimal' ? (
        <>
          {line('rule-top', 9, 15, 14, 1)}
          {line('title', 7, 21, 18, 2.2)}
          {line('sub', 10, 26, 12, 1)}
          {line('rule-bottom', 9, 31, 14, 1)}
          {imprint(9, 14, 11, 10)}
        </>
      ) : null}
      {kind === 'book' ? (
        <>
          {/* Masthead, one window, imprint at the foot: the shelf grammar. */}
          <rect x="3" y="3.5" width="26" height="11" rx="1.8" {...stroke} strokeWidth="1.2" />
          {line('title', 6, 8, 20, 2)}
          {line('sub', 9.5, 12, 13, 1)}
          <rect x="3" y="18" width="26" height="16" rx="1.8" {...stroke} strokeWidth="1.2" />
          <rect x="6.5" y="21" width="8" height="10" rx="1.4" {...stroke} strokeWidth="1.2" />
          <rect x="17.5" y="21" width="8" height="10" rx="1.4" {...stroke} strokeDasharray="1.6 1.6" strokeWidth="1.2" />
          {imprint()}
        </>
      ) : null}
      {kind === 'workbook' ? (
        <>
          <rect x="2.6" y="2.6" width="26.8" height="38.8" rx="2" {...stroke} strokeWidth="1.1" />
          {line('title', 7, 8, 18, 2)}
          {line('rule', 12, 11.5, 8, 0.9)}
          {line('sub', 10, 14.5, 12, 1)}
          <rect x="5.5" y="18" width="21" height="16" rx="1.6" {...stroke} strokeWidth="1.2" />
          {[0, 1].flatMap((row) =>
            [0, 1].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={7.5 + col * 9}
                y={20 + row * 6.4}
                width="7"
                height="5"
                rx="1"
                {...stroke}
                strokeWidth="1.1"
                strokeDasharray={row === 1 && col === 1 ? '1.4 1.4' : undefined}
              />
            )),
          )}
          {imprint(6, 20, 11, 10)}
        </>
      ) : null}
      {kind === 'bubble' ? (
        <>
          <ellipse cx="16" cy="17" rx="12.5" ry="7.5" {...stroke} strokeWidth="1.4" />
          {line('title', 9, 17, 14, 2.2)}
          {[0, 1, 2].map((index) => (
            <rect
              key={index}
              x={5.5 + index * 7.4}
              y="28"
              width="5.6"
              height="8"
              rx="1.4"
              {...stroke}
              strokeWidth="1.2"
            />
          ))}
          {imprint()}
        </>
      ) : null}
      {kind === 'burst' ? (
        <>
          <path
            d="M16 8 L18.6 11 L22.4 9.9 L22 13.8 L25.6 15.4 L22.6 17.9 L24.6 21.3 L20.7 21.6 L19.9 25.4 L16 23.6 L12.1 25.4 L11.3 21.6 L7.4 21.3 L9.4 17.9 L6.4 15.4 L10 13.8 L9.6 9.9 L13.4 11 Z"
            {...stroke}
            strokeWidth="1.1"
          />
          {/* The cloud the title is set on. Without it the title bar was drawn
              straight across the rays, and the burst read as a broken shape. */}
          <rect x="7.5" y="13.4" width="17" height="7.6" rx="3.8" {...stroke} fill="#FFF" strokeWidth="1.3" />
          {line('title', 10, 17.4, 12, 2)}
          {[0, 1, 2, 3].map((index) => (
            <rect
              key={index}
              x={4.5 + index * 6}
              y="29"
              width="4.4"
              height="7"
              rx="1.2"
              {...stroke}
              strokeWidth="1.1"
            />
          ))}
          {imprint()}
        </>
      ) : null}
      {kind === 'banner' ? (
        <>
          {line('title', 7, 12, 18, 2.2)}
          {/* Ends and stroke width chosen so the road's round caps land inside
              the page rule. At width 4 from x=1 it crossed the border on both
              sides, which reads as a mistake rather than as a bleed. */}
          <path
            d="M3.6 27 C 8.5 19, 12.5 31, 16 26 C 19.5 21, 24 30, 28.4 23"
            {...stroke}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {imprint()}
        </>
      ) : null}
      {kind === 'frame' ? (
        <>
          {/* The pattern yields to the panel, exactly as the printed cover does:
              a dot whose centre lands on the plate is simply not drawn. The
              rows that used to straddle the panel edge left dots sliced in
              half by it. */}
          {[5.5, 10.5, 27.5, 32.5].flatMap((y) =>
            [6, 16, 26].map((x) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" {...stroke} strokeWidth="1" />
            )),
          )}
          <rect x="4" y="15" width="24" height="8" rx="3" {...stroke} fill="#FFF" strokeWidth="1.3" />
          {line('title', 8, 19, 16, 2)}
          {imprint()}
        </>
      ) : null}
      {kind === 'sticker' ? (
        <>
          <path d="M4 6 L28 8 L28 14 L4 12 Z" {...stroke} strokeWidth="1.3" />
          {[0, 1].flatMap((row) =>
            [0, 1].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={5 + col * 11.5}
                y={18 + row * 10}
                width="10"
                height="8.5"
                rx="2"
                {...stroke}
                strokeWidth="1.2"
              />
            )),
          )}
          {imprint()}
        </>
      ) : null}
      {kind === 'rainbow' ? (
        <>
          <path d="M6 16 A 10 10 0 0 1 26 16" {...stroke} strokeWidth="1.3" />
          <path d="M9.5 16 A 6.5 6.5 0 0 1 22.5 16" {...stroke} strokeWidth="1.3" />
          {line('title', 7, 22, 18, 2.2)}
          {[0, 1, 2].map((index) => (
            <rect
              key={index}
              x={5.5 + index * 7.4}
              y="27"
              width="5.6"
              height="8"
              rx="1.4"
              {...stroke}
              strokeWidth="1.2"
            />
          ))}
          {imprint()}
        </>
      ) : null}
    </svg>
  );
}

export function PaperMark({ kind }: { kind: 'a4' | 'letter' | 'both' }) {
  return (
    <svg viewBox="0 0 40 30" className="h-7 w-[38px]" aria-hidden="true">
      {kind === 'both' ? (
        <>
          <rect x="1" y="5" width="16" height="23" rx="2" {...stroke} strokeWidth="1.4" />
          <rect x="21" y="7" width="18" height="21" rx="2" {...stroke} strokeWidth="1.4" />
        </>
      ) : (
        <rect
          x={kind === 'a4' ? 12 : 10}
          y={kind === 'a4' ? 3 : 5}
          width={kind === 'a4' ? 16 : 20}
          height={kind === 'a4' ? 24 : 22}
          rx="2"
          {...stroke}
          strokeWidth="1.4"
        />
      )}
    </svg>
  );
}

/**
 * The interface glyphs are Lucide, traced verbatim rather than redrawn: one
 * 24-unit grid, one stroke weight, one cap and one join, which is the whole
 * reason to take a set instead of drawing eleven icons by hand. The ones
 * these replaced were hand-drawn at six different stroke weights, and a row
 * of buttons showed it.
 *
 * Lucide is ISC-licensed. Provenance and the full licence are in ICONS.md,
 * and the licence text ships at /ISC-lucide.txt beside the font licences.
 *
 * The marks above are not from any set and could not be: they are schematics
 * of this product's own compositions.
 */
function Icon({ className = 'h-4 w-4', children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** lucide/loader-circle */
export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <Icon className={`animate-spin ${className}`}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </Icon>
  );
}

/** lucide/chevron-left, chevron-right, chevron-down */
export function ChevronIcon({ direction }: { direction: 'left' | 'right' | 'down' }) {
  const d =
    direction === 'left' ? 'm15 18-6-6 6-6' : direction === 'right' ? 'm9 18 6-6-6-6' : 'm6 9 6 6 6-6';
  return (
    <Icon>
      <path d={d} />
    </Icon>
  );
}

/** lucide/download */
export function DownloadIcon() {
  return (
    <Icon>
      <path d="M12 15V3" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
    </Icon>
  );
}

/**
 * lucide/check, drawn on rather than switched on: `pathLength` normalises the
 * stroke so one dash animation fits it whatever size it is rendered at.
 */
export function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M20 6 9 17l-5-5" pathLength={1} className="animate-check-in" />
    </Icon>
  );
}

/** lucide/package — the marketplace kit is one bundle, not one file. */
export function KitIcon() {
  return (
    <Icon>
      <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
      <path d="M12 22V12" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <path d="m7.5 4.27 9 5.15" />
    </Icon>
  );
}

/** lucide/copy */
export function CopyIcon() {
  return (
    <Icon>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Icon>
  );
}

/** lucide/link */
export function LinkIcon() {
  return (
    <Icon>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Icon>
  );
}

/** lucide/share-2 */
export function ShareIcon() {
  return (
    <Icon>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </Icon>
  );
}

/** lucide/x */
export function CloseIcon() {
  return (
    <Icon>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Icon>
  );
}

/** lucide/sparkles */
export function SparkIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      <path d="M20 2v4" />
      <path d="M22 4h-4" />
      <circle cx="4" cy="20" r="2" />
    </Icon>
  );
}

/**
 * lucide/monitor-down: a screen with the app coming down into it. Deliberately
 * not the download glyph, which is a tray and already means "this file is
 * yours now" three inches away in the results bar.
 */
export function InstallIcon() {
  return (
    <Icon>
      <path d="M12 13V7" />
      <path d="m15 10-3 3-3-3" />
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <path d="M12 17v4" />
      <path d="M8 21h8" />
    </Icon>
  );
}

/** lucide/sun */
export function SunIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </Icon>
  );
}

/** lucide/moon */
export function MoonIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
    </Icon>
  );
}

/** lucide/monitor — the theme that follows whatever the device decided. */
export function SystemIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </Icon>
  );
}

/** lucide/share, which is the iOS share glyph — the button being named. */
export function IosShareIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 2v13" />
      <path d="m16 6-4-4-4 4" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    </Icon>
  );
}
