'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { CheckIcon } from './diagrams';
import { useRipple } from './motion';

/**
 * The keyboard half of `role="radiogroup"`.
 *
 * The role is a promise, and it is a specific one: the group is a single tab
 * stop and the arrow keys move between its options. Writing the role over a
 * row of buttons and stopping there is worse than writing no role at all —
 * the roving `tabIndex` it implies takes every unselected option out of the
 * tab order, and with nothing listening for arrows they become unreachable
 * without a mouse.
 *
 * Selection follows focus, which is what a radio group does: arrowing onto an
 * option chooses it. Both groups below share this rather than each making the
 * promise their own way.
 *
 * `columns` is why up and down are not simply previous and next: in a grid of
 * tiles, down means the tile below, and that is one row — not one option.
 */
function useRadioKeys<T extends string>(
  values: T[],
  value: T,
  onChange: (value: T) => void,
  columns = 1,
) {
  const ref = useRef<HTMLDivElement>(null);

  const move = (next: number) => {
    const index = (next + values.length) % values.length;
    const target = values[index];
    if (target === undefined) return;
    onChange(target);
    // Focus follows the selection, so the next arrow press continues from
    // where the user actually is rather than from the option they left.
    ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[index]?.focus();
  };

  /*
   * Which option owns the group's one tab stop.
   *
   * Clamped to the first rather than left at -1: a value that matches no
   * option — a config restored from an older share link, say — would otherwise
   * leave every option at `tabIndex={-1}` and the whole group unreachable by
   * keyboard.
   */
  const activeIndex = Math.max(
    0,
    values.findIndex((item) => item === value),
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = activeIndex;
    if (event.key === 'ArrowRight') move(from + 1);
    else if (event.key === 'ArrowLeft') move(from - 1);
    else if (event.key === 'ArrowDown') move(from + columns);
    else if (event.key === 'ArrowUp') move(from - columns);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(values.length - 1);
    else return;
    event.preventDefault();
  };

  return { ref, onKeyDown, activeIndex };
}

/**
 * The tick on the option you picked. A real glyph in a real circle, so its
 * ends are round and its vertex is a join — the same drawing the rest of the
 * interface is set in — and so it can actually be centred.
 */
export function SelectedMark() {
  return (
    <span aria-hidden="true" className="selected-mark">
      <CheckIcon className="h-3 w-3" />
    </span>
  );
}

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
      {/*
       * The heading stays put while its own fields scroll under it, so a long
       * panel always says which step the control under the cursor belongs to.
       */}
      <header className="sticky top-0 z-10 -mx-5 flex items-center gap-2.5 bg-surface/92 px-5 pb-2.5 backdrop-blur">
        <span className="step-mark">{step}</span>
        <h2 className="text-[15px] font-semibold leading-tight tracking-tight">{title}</h2>
      </header>
      {hint ? <p className="mb-4 text-[12.5px] leading-snug text-ink-mute">{hint}</p> : null}
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
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
        tone === 'warn' ? 'text-accent-ink' : 'text-ink-mute'
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
  const keys = useRadioKeys(
    options.map((option) => option.value),
    value,
    onChange,
    columns,
  );
  const grid = columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1';
  return (
    <div
      ref={keys.ref}
      role="radiogroup"
      aria-label={label}
      onKeyDown={keys.onKeyDown}
      className={`grid gap-2 ${grid}`}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            // One tab stop for the whole group, on the option that is chosen.
            tabIndex={index === keys.activeIndex ? 0 : -1}
            data-active={active}
            className="choice"
            onClick={(event) => {
              ripple(event);
              onChange(option.value);
            }}
          >
            {active ? <SelectedMark /> : null}
            {option.art ? <span className="mb-1.5 block text-ink-soft">{option.art}</span> : null}
            <span className="text-[14px] font-semibold leading-tight tracking-tight">{option.label}</span>
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
  const keys = useRadioKeys(
    options.map((option) => option.value),
    value,
    onChange,
  );
  return (
    <div
      ref={keys.ref}
      role="radiogroup"
      aria-label={label}
      onKeyDown={keys.onKeyDown}
      className="flex flex-wrap gap-2"
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={index === keys.activeIndex ? 0 : -1}
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
                 bg-surface px-3.5 py-3 text-left shadow-xs transition-colors hover:border-line-strong"
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
          className="btn-quiet shrink-0 !px-3 text-[16px] leading-none"
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
          className="input min-w-0 text-center text-[15px] tabular-nums"
        />
        <button
          type="button"
          aria-label={`Tambah ${label.toLowerCase()}`}
          className="btn-quiet shrink-0 !px-3 text-[16px] leading-none"
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
        className="input mt-2"
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
        className="input mt-2 resize-y leading-relaxed"
      />
      {hint ? <span className="mt-1.5 block text-[12px] text-ink-mute">{hint}</span> : null}
    </label>
  );
}
