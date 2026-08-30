'use client';

import { useEffect, useRef, useState } from 'react';
import { MoonIcon, SunIcon, SystemIcon } from './diagrams';

export type Theme = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'doodlegen:theme';

/**
 * Applied before the first paint by the inline script in the root layout, and
 * again here whenever the choice changes. `system` removes the attribute
 * rather than writing one, so the media query in `globals.css` takes over.
 */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

const OPTIONS: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Terang', icon: SunIcon },
  { value: 'dark', label: 'Gelap', icon: MoonIcon },
  { value: 'system', label: 'Ikuti sistem', icon: SystemIcon },
];

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('system');
  // Nothing about the stored choice is known on the server, so the disc that
  // marks it stays hidden until the first client effect has read it back.
  const [mounted, setMounted] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') setTheme(stored);
    setMounted(true);
  }, []);

  const choose = (next: Theme) => {
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode can refuse the write. The theme still applies for this
      // visit; it simply will not be remembered, which is better than throwing
      // out of a click handler.
    }
    applyTheme(next);
  };

  const selected = OPTIONS.findIndex((option) => option.value === theme);

  /*
   * The keyboard half of `role="radiogroup"`.
   *
   * The role is a promise: one tab stop for the group, arrows to move between
   * the options. Writing it over three buttons and stopping there is worse
   * than writing no role at all — the roving `tabIndex` it implies takes the
   * unselected options out of the tab order, and with nothing listening for
   * arrows they become unreachable without a mouse.
   *
   * Selection follows focus, which is what a radio group does: arrowing onto
   * an option chooses it.
   */
  const move = (next: number) => {
    const index = (next + OPTIONS.length) % OPTIONS.length;
    const option = OPTIONS[index];
    if (!option) return;
    choose(option.value);
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[index]?.focus();
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Tema tampilan"
      onKeyDown={(event) => {
        // -1 only before the stored choice is read back, where starting from
        // the first option is the same as starting from where the strip is
        // actually drawn.
        const from = Math.max(selected, 0);
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') move(from + 1);
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') move(from - 1);
        else if (event.key === 'Home') move(0);
        else if (event.key === 'End') move(OPTIONS.length - 1);
        else return;
        event.preventDefault();
      }}
      className={`relative inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5
                  shadow-xs ${className}`}
    >
      {/*
       * One disc that moves, rather than three that recolour.
       *
       * Two buttons swapping fills read as two separate events; a single mark
       * travelling between them reads as the choice moving, which is what
       * actually happened. The offset is arithmetic rather than measured
       * because every option is the same fixed size — 1.75rem of button plus
       * the 0.125rem gap — so there is nothing a ResizeObserver would find
       * that this does not already know.
       *
       * The disc is ink rather than accent. The accent is spent on the one
       * control on screen that acts — and in the nav that is the button next
       * to this one. A mark that inverts with the ground says "chosen" just as
       * plainly without arguing with it.
       */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-0.5 top-0.5 h-7 w-7 rounded-full bg-ink
                    transition-[transform,opacity] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]
                    ${mounted && selected >= 0 ? 'opacity-100' : 'opacity-0'}`}
        style={{ transform: `translateX(calc(${Math.max(selected, 0)} * 1.875rem))` }}
      />

      {OPTIONS.map(({ value, label, icon: Glyph }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            // Before hydration the stored value is unknown; reporting every
            // option as unchecked is more honest than guessing "system".
            aria-checked={active}
            aria-label={label}
            title={label}
            // One tab stop for the group, on whichever option is chosen.
            tabIndex={theme === value ? 0 : -1}
            onClick={() => choose(value)}
            className={`press relative z-10 grid h-7 w-7 place-items-center rounded-full transition-colors
                        duration-150 ${
                          active
                            ? // The disc behind it is already the mark; a hover
                              // tint on top would only muddy it.
                              'text-paper'
                            : 'text-ink-mute hover:text-ink'
                        }`}
          >
            <Glyph className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Runs before paint to stop a light flash on a dark-set device. Kept tiny and
 * dependency-free because it is inlined into the document, and it writes only
 * the explicit choices: `system` is the absence of the attribute, so there is
 * nothing for it to do there.
 *
 * It also sets the `js` class the reveal-on-scroll styles are scoped to, so
 * the document takes both decisions in one blocking script rather than two.
 */
export const THEME_SCRIPT = `(function(){var d=document.documentElement;d.classList.add('js');try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark"){d.setAttribute("data-theme",t)}}catch(e){}})();`;
