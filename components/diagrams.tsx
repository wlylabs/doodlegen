/**
 * Small abstract marks for the option tiles. They describe the treatment
 * (solid contour, dotted contour, one of each) and the page structure,
 * without pretending to be a preview — the real preview is one panel away.
 */
const stroke = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' } as const;

export function StyleMark({ kind }: { kind: 'outline' | 'dotted' | 'combo' }) {
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
 * The four cover compositions, as page furniture: where the type sits, and
 * how many characters are on show.
 */
export function CoverMark({ kind }: { kind: 'classic' | 'poster' | 'showcase' | 'minimal' }) {
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
