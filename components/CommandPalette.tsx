'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { SearchIcon } from './diagrams';

/**
 * The one place every action in the studio can be reached from.
 *
 * A studio has more verbs than a bar has room for: six settings steps, four
 * starter packs, two exports, a share, a theme, an install. Putting the third
 * of them nobody has room for behind an overflow menu is how a toolbar
 * becomes a filing cabinet. A palette is the alternative every application
 * has settled on — one key, type the verb, press Enter — and it costs the
 * chrome nothing, because the actions live in a list rather than on a row.
 *
 * The list is supplied by the caller: this component knows how to find, move
 * through and run a command, and nothing at all about what the commands do.
 */

export interface Command {
  id: string;
  label: string;
  /** Which heading it sits under. Groups render in first-seen order. */
  group: string;
  /** Words someone might type that are not in the label. */
  keywords?: string;
  /** The shortcut, or a one-word state, printed at the end of the row. */
  hint?: string;
  icon?: ReactNode;
  disabled?: boolean;
  run: () => void;
}

/**
 * Subsequence matching, the kind every palette does: "gpdf" finds "Generate
 * PDF". Scored only enough to keep a whole-word match above a scattered one,
 * because the list is tens of items rather than thousands.
 */
function score(command: Command, query: string): number {
  if (!query) return 1;
  const haystack = `${command.label} ${command.keywords ?? ''}`.toLowerCase();
  const needle = query.toLowerCase();

  const direct = haystack.indexOf(needle);
  if (direct === 0) return 1000;
  if (direct > 0) return 700 - direct;

  let at = 0;
  let gaps = 0;
  for (const character of needle) {
    const found = haystack.indexOf(character, at);
    if (found === -1) return 0;
    gaps += found - at;
    at = found + 1;
  }
  return Math.max(1, 400 - gaps);
}

export function CommandPalette({
  open,
  onClose,
  commands,
}: {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const id = useId();

  const matches = useMemo(() => {
    const scored = commands
      .map((command) => ({ command, weight: score(command, query.trim()) }))
      .filter((entry) => entry.weight > 0);
    // A search is ranked; an untouched list keeps the order it was written in,
    // because that order is the app's own idea of what matters.
    if (query.trim()) scored.sort((a, b) => b.weight - a.weight);
    return scored.map((entry) => entry.command);
  }, [commands, query]);

  /** The rows, flattened with their headings, so arrows skip the headings. */
  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, Command[]>();
    for (const command of matches) {
      if (!byGroup.has(command.group)) {
        byGroup.set(command.group, []);
        order.push(command.group);
      }
      byGroup.get(command.group)?.push(command);
    }
    return order.map((name) => ({ name, items: byGroup.get(name) ?? [] }));
  }, [matches]);

  // Same modal handling as the export dialog: the platform traps focus,
  // returns it on close, makes the rest of the page inert, and answers Escape.
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    else if (!open && node.open) node.close();
  }, [open]);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const onCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    node.addEventListener('cancel', onCancel);
    return () => node.removeEventListener('cancel', onCancel);
  }, [onClose]);

  // Every opening starts from a blank box at the top of the list: a palette
  // that remembers the last thing typed makes the next thing harder to find.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setIndex(0);
    const timer = window.setTimeout(() => input.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => setIndex(0), [query]);

  // Keep the highlighted row in view when the arrows walk past the fold.
  useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const runAt = (position: number) => {
    const command = matches[position];
    if (!command || command.disabled) return;
    onClose();
    // After the close, so a command that opens something else is not fighting
    // this dialog for the top layer or for focus.
    window.setTimeout(() => command.run(), 0);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || (event.key === 'n' && event.ctrlKey)) {
      event.preventDefault();
      setIndex((current) => (matches.length ? (current + 1) % matches.length : 0));
    } else if (event.key === 'ArrowUp' || (event.key === 'p' && event.ctrlKey)) {
      event.preventDefault();
      setIndex((current) => (matches.length ? (current - 1 + matches.length) % matches.length : 0));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setIndex(Math.max(0, matches.length - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runAt(index);
    }
  };

  // Rows are numbered across groups, so the arrow keys see one list.
  let row = -1;

  return (
    <dialog
      ref={dialog}
      aria-label="Perintah"
      onClick={(event) => {
        // The backdrop is the dialog's own box; a click that lands on it and
        // not on the panel is a click outside.
        if (event.target === dialog.current) onClose();
      }}
      className="dialog-reveal fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none border-0
                 bg-transparent p-0 text-ink"
    >
      <div className="flex h-full items-start justify-center px-3 pt-[12vh] sm:pt-[16vh]">
        <div
          className="flex max-h-[70vh] w-full max-w-[540px] flex-col overflow-hidden rounded-2xl border
                     border-line bg-surface shadow-pop"
          onKeyDown={onKeyDown}
        >
          <div className="flex items-center gap-2.5 border-b border-line px-4">
            <span className="shrink-0 text-ink-mute">
              <SearchIcon />
            </span>
            <input
              ref={input}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari perintah, preset, pengaturan…"
              aria-label="Cari perintah"
              aria-controls={id}
              aria-expanded
              role="combobox"
              autoComplete="off"
              spellCheck={false}
              /* No focus ring on the box itself: it is the only thing in the
                 dialog that takes focus when it opens, the caret says so, and
                 a ring around a borderless field reads as an error state. */
              className="w-full bg-transparent py-3.5 text-[14.5px] text-ink outline-none
                         placeholder:text-ink-mute focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <kbd className="kbd hidden sm:inline-flex">Esc</kbd>
          </div>

          <div ref={list} id={id} role="listbox" className="rail min-h-0 flex-1 overflow-y-auto p-2">
            {groups.length === 0 ? (
              <p className="px-3 py-8 text-center text-[13px] text-ink-mute">
                Tidak ada yang cocok dengan “{query}”.
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.name} className="mb-1 last:mb-0">
                  <p className="field-label px-3 pb-1 pt-2">{group.name}</p>
                  {group.items.map((command) => {
                    row += 1;
                    const position = row;
                    return (
                      <button
                        key={command.id}
                        type="button"
                        role="option"
                        aria-selected={position === index}
                        aria-disabled={command.disabled || undefined}
                        data-active={position === index}
                        className="cmd-item"
                        // Hover moves the selection, so the mouse and the
                        // arrows never disagree about what Enter would run.
                        onMouseMove={() => setIndex(position)}
                        onClick={() => runAt(position)}
                      >
                        {command.icon ? (
                          <span className="shrink-0 text-ink-mute">{command.icon}</span>
                        ) : null}
                        <span className="min-w-0 flex-1 truncate">{command.label}</span>
                        {command.hint ? (
                          <span className="shrink-0 text-[11.5px] text-ink-mute">{command.hint}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-[11.5px] text-ink-mute">
            <span className="flex items-center gap-1.5">
              <kbd className="kbd">↑</kbd>
              <kbd className="kbd">↓</kbd>
              pilih
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="kbd">↵</kbd>
              jalankan
            </span>
            <span className="ml-auto tabular-nums">{matches.length} perintah</span>
          </div>
        </div>
      </div>
    </dialog>
  );
}
