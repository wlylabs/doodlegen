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
    // The ladder itself: solid, dotted, faded, and a cell with nothing but
    // the line the child writes on.
    return (
      <svg viewBox="0 0 44 22" className="h-6 w-[52px]" aria-hidden="true">
        <rect x="1" y="3" width="9.5" height="16" rx="3" {...stroke} strokeWidth="1.6" />
        <rect
          x="12.5"
          y="3"
          width="9.5"
          height="16"
          rx="3"
          {...stroke}
          strokeWidth="1.6"
          strokeDasharray="0.01 2.8"
        />
        <rect
          x="24"
          y="3"
          width="9.5"
          height="16"
          rx="3"
          {...stroke}
          strokeWidth="1.6"
          strokeDasharray="0.01 2.8"
          opacity="0.35"
        />
        <line x1="35.5" x2="43" y1="19" y2="19" {...stroke} strokeWidth="1.4" />
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
  return (
    <svg viewBox="0 0 32 44" className="h-9 w-[26px]" aria-hidden="true">
      <rect x="0.7" y="0.7" width="30.6" height="42.6" rx="2.5" {...stroke} strokeWidth="1.2" />
      {kind === 'classic' ? (
        <>
          {line('brand', 11, 7, 10, 1)}
          {line('title', 7, 13, 18, 2.2)}
          {[0, 1, 2].map((index) => (
            <rect
              key={index}
              x={5.5 + index * 7.4}
              y="20"
              width="5.6"
              height="9"
              rx="1.4"
              {...stroke}
              strokeWidth="1.2"
            />
          ))}
          {line('foot', 8, 36, 16, 1)}
        </>
      ) : null}
      {kind === 'poster' ? (
        <>
          {line('brand', 11, 6, 10, 1)}
          <rect x="6" y="10" width="20" height="19" rx="3" {...stroke} strokeWidth="1.6" />
          {line('title', 6, 34, 20, 2.4)}
          {line('foot', 9, 39, 14, 1)}
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
          {line('foot', 6, 39, 11, 1)}
        </>
      ) : null}
      {kind === 'minimal' ? (
        <>
          {line('rule-top', 9, 15, 14, 1)}
          {line('title', 7, 21, 18, 2.2)}
          {line('sub', 10, 26, 12, 1)}
          {line('rule-bottom', 9, 31, 14, 1)}
        </>
      ) : null}
      {kind === 'custom' ? (
        <>
          {/* Handles on a loose box: the one mark that says "you move this". */}
          <rect x="5" y="6" width="14" height="9" rx="1.6" {...stroke} strokeWidth="1.2" strokeDasharray="2.4 2" />
          {[
            [5, 6],
            [19, 6],
            [5, 15],
            [19, 15],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x - 1.3} y={y - 1.3} width="2.6" height="2.6" rx="0.6" {...stroke} strokeWidth="1" />
          ))}
          <circle cx="24" cy="11" r="4.2" {...stroke} strokeWidth="1.2" />
          {line('title', 6, 24, 20, 2.2)}
          {line('sub', 9, 29, 14, 1)}
          <rect x="6" y="33" width="8" height="7" rx="1.4" {...stroke} strokeWidth="1.2" />
          <path d="M19 40 L23 33 L27 40 Z" {...stroke} strokeWidth="1.2" />
        </>
      ) : null}
      {kind === 'bubble' ? (
        <>
          {line('brand', 11, 6, 10, 1)}
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
          {line('foot', 8, 40, 16, 1)}
        </>
      ) : null}
      {kind === 'burst' ? (
        <>
          {line('brand', 11, 6, 10, 1)}
          <path
            d="M16 8 L18.6 11 L22.4 9.9 L22 13.8 L25.6 15.4 L22.6 17.9 L24.6 21.3 L20.7 21.6 L19.9 25.4 L16 23.6 L12.1 25.4 L11.3 21.6 L7.4 21.3 L9.4 17.9 L6.4 15.4 L10 13.8 L9.6 9.9 L13.4 11 Z"
            {...stroke}
            strokeWidth="1.1"
          />
          {line('title', 10, 17, 12, 2)}
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
          {line('foot', 8, 40, 16, 1)}
        </>
      ) : null}
      {kind === 'banner' ? (
        <>
          {line('brand', 11, 6, 10, 1)}
          {line('title', 7, 12, 18, 2.2)}
          <path
            d="M1 27 C 7 18, 12 32, 16 26 C 20 20, 25 30, 31 23"
            {...stroke}
            strokeWidth="4"
            strokeLinecap="round"
          />
          {line('foot', 8, 40, 16, 1)}
        </>
      ) : null}
      {kind === 'frame' ? (
        <>
          {[6, 12, 18, 24, 30].flatMap((y) =>
            [6, 16, 26].map((x) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" {...stroke} strokeWidth="1" />
            )),
          )}
          <rect x="4" y="15" width="24" height="8" rx="3" {...stroke} fill="#fff" strokeWidth="1.3" />
          {line('title', 8, 19, 16, 2)}
          {line('foot', 8, 40, 16, 1)}
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
          {line('foot', 8, 40, 16, 1)}
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
          {line('foot', 8, 40, 16, 1)}
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

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronIcon({ direction }: { direction: 'left' | 'right' | 'down' }) {
  const d =
    direction === 'left' ? 'M14 5 8 12l6 7' : direction === 'right' ? 'M10 5l6 7-6 7' : 'M5 9l7 6 7-6';
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 4v11m0 0 4.2-4.2M12 15l-4.2-4.2M4.5 18.5h15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M5 12.5 10 17.5 19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="animate-check-in"
      />
    </svg>
  );
}

/** The marketplace kit: a page, a picture and a caption, stacked. */
export function KitIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <rect x="3" y="3" width="12" height="15" rx="2" {...stroke} strokeWidth="1.8" />
      <path d="M6.5 8.5h5M6.5 12h3.5" {...stroke} strokeWidth="1.6" />
      <rect x="12" y="10" width="9" height="11" rx="2" {...stroke} fill="#FFF" strokeWidth="1.8" />
      <path d="M14.4 18.2 16.6 15l2 2.2 1-1.1" {...stroke} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2.5" {...stroke} strokeWidth="1.8" />
      <path d="M16 5.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 5.5 16" {...stroke} strokeWidth="1.8" />
    </svg>
  );
}

export function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7L11.5 6.8" {...stroke} strokeWidth="1.8" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 1 0 11 18.7l1.4-1.4" {...stroke} strokeWidth="1.8" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" {...stroke} strokeWidth="2" />
    </svg>
  );
}

export function SparkIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 3.5 13.8 9 19.5 10.8 13.8 12.6 12 18.2 10.2 12.6 4.5 10.8 10.2 9z"
        fill="currentColor"
      />
      <path d="M18.5 15.5 19.4 18l2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9z" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

/** Install: the app tile itself, dropping onto a home screen. */
export function InstallIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <rect x="5.5" y="2.5" width="13" height="10.5" rx="2.5" {...stroke} strokeWidth="1.8" />
      <path d="M12 6.2v4.4m0 0 2-2m-2 2-2-2" {...stroke} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4 17.5h16M7 21h10" {...stroke} strokeWidth="1.8" />
    </svg>
  );
}

/** The iOS share glyph, because on iPhone that is the button to name. */
export function IosShareIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 3.5v11m0-11L9 6.7M12 3.5l3 3.2" {...stroke} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M7.5 10.5H6.2A1.7 1.7 0 0 0 4.5 12.2v6.6A1.7 1.7 0 0 0 6.2 20.5h11.6a1.7 1.7 0 0 0 1.7-1.7v-6.6a1.7 1.7 0 0 0-1.7-1.7H16.5" {...stroke} strokeWidth="1.8" />
    </svg>
  );
}
