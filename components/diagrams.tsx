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
