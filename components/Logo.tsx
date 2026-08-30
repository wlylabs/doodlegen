/**
 * The mark is a "D" drawn the way DoodleGen draws letters: a solid contour
 * stem with a dotted tracing bowl. Same idea as the product, at 24px.
 */
export function LogoMark({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" role="presentation">
      <path
        d="M5.6 4.2V19.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M7 4.2H10.7A7.8 7.8 0 0 1 10.7 19.8H7"
        fill="none"
        stroke="#E4550D"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="0.01 4.5"
      />
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

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className="h-6 w-6 text-ink" />
      <Wordmark />
    </span>
  );
}
