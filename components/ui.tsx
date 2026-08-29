'use client';

import type { ReactNode } from 'react';
import { useRipple } from './motion';

export function Section({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line px-5 py-6 first:border-t-0">
      <header className="mb-4 flex items-baseline gap-3">
        <span className="text-[11px] font-semibold tabular-nums text-accent">{step}</span>
        <div>
          <h2 className="text-[15px] font-semibold leading-tight tracking-tight">{title}</h2>
          {hint ? <p className="mt-1 text-[13px] leading-snug text-ink-mute">{hint}</p> : null}
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="field-label">{label}</p>
      {children}
    </div>
  );
}

/** A short inline note: a warning about the range, a tip about the field. */
export function Note({ tone = 'muted', children }: { tone?: 'muted' | 'warn'; children: ReactNode }) {
  return (
    <p
      className={`animate-fade-up text-[12px] leading-snug ${
        tone === 'warn' ? 'text-accent-hover' : 'text-ink-mute'
      }`}
    >
      {children}
    </p>
  );
}

export interface Option<T extends string> {
  value: T;
  label: string;
  note?: string;
  art?: ReactNode;
}

export function ChoiceGrid<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 1,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3;
}) {
  const ripple = useRipple<HTMLButtonElement>();
  const grid = columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1';
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-2 ${grid}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-active={active}
            className="choice"
            onClick={(event) => {
              ripple(event);
              onChange(option.value);
            }}
          >
            {option.art ? <span className="mb-1 block text-ink-soft">{option.art}</span> : null}
            <span className="text-[14px] font-semibold leading-tight">{option.label}</span>
            {option.note ? (
              <span className="text-[12px] leading-snug text-ink-mute">{option.note}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function ChipRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const ripple = useRipple<HTMLButtonElement>();
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-active={active}
            className="chip"
            onClick={(event) => {
              ripple(event);
              onChange(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const ripple = useRipple<HTMLButtonElement>();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(event) => {
        ripple(event);
        onChange(!checked);
      }}
      className="ripple-host press flex w-full items-center justify-between gap-4 rounded-xl border border-line
                 bg-surface px-3 py-3 text-left transition-colors hover:border-line-strong"
    >
      <span className="min-w-0">
        <span className="block text-[14px] font-medium leading-tight">{label}</span>
        {hint ? <span className="mt-0.5 block text-[12px] text-ink-mute">{hint}</span> : null}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-accent' : 'bg-line-strong'
        }`}
      >
        <span
          // The knob overshoots slightly on its way across, which is what makes
          // the switch feel like a switch rather than a state change.
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300
            [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
              checked ? 'left-[22px] w-5' : 'left-0.5'
            }`}
        />
      </span>
    </button>
  );
}

export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const ripple = useRipple<HTMLButtonElement>();
  const step = (delta: number) => onChange(Math.max(min, Math.min(max, value + delta)));
  return (
    <div className="flex-1">
      <span className="field-label">{label}</span>
      <div className="mt-2 flex items-stretch gap-1.5">
        <button
          type="button"
          aria-label={`Kurangi ${label.toLowerCase()}`}
          className="btn-quiet !px-2.5 text-[16px] leading-none"
          onClick={(event) => {
            ripple(event);
            step(-1);
          }}
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          aria-label={label}
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2.5 text-center text-[15px]
                     tabular-nums transition-colors focus:border-accent"
        />
        <button
          type="button"
          aria-label={`Tambah ${label.toLowerCase()}`}
          className="btn-quiet !px-2.5 text-[16px] leading-none"
          onClick={(event) => {
            ripple(event);
            step(1);
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function TextField({
  label,
  value,
  placeholder,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-[14px]
                   transition-colors focus:border-accent"
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  placeholder,
  rows = 5,
  hint,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  rows?: number;
  hint?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full resize-y rounded-lg border border-line bg-surface px-3 py-2.5 text-[14px]
                   leading-relaxed transition-colors focus:border-accent"
      />
      {hint ? <span className="mt-1.5 block text-[12px] text-ink-mute">{hint}</span> : null}
    </label>
  );
}
