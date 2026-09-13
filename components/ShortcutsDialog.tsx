'use client';

import { useEffect, useRef } from 'react';
import { CloseIcon } from './diagrams';

/**
 * The shortcuts, written down.
 *
 * Keyboard shortcuts that are not listed anywhere are shortcuts for the
 * person who wrote them. This is the list, reachable from the palette and
 * from `?`, which is where every application that has one puts it.
 */

export interface ShortcutGroup {
  title: string;
  items: { keys: string[]; label: string }[];
}

export function ShortcutsDialog({
  open,
  onClose,
  groups,
}: {
  open: boolean;
  onClose: () => void;
  groups: ShortcutGroup[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);

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

  return (
    <dialog
      ref={dialog}
      aria-label="Pintasan papan ketik"
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
      className="dialog-reveal fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none border-0
                 bg-transparent p-0 text-ink"
    >
      <div className="flex h-full items-center justify-center px-3 py-6">
        <div className="flex max-h-full w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
          <header className="flex items-center gap-3 border-b border-line px-5 py-3.5">
            <h2 className="text-[15px] font-semibold tracking-tight">Pintasan papan ketik</h2>
            <button type="button" className="btn-ghost ml-auto !px-2" aria-label="Tutup" onClick={onClose}>
              <CloseIcon />
            </button>
          </header>

          <div className="rail min-h-0 overflow-y-auto px-5 py-4">
            {groups.map((group) => (
              <section key={group.title} className="mb-5 last:mb-0">
                <p className="field-label pb-2">{group.title}</p>
                <ul className="divide-y divide-line">
                  {group.items.map((item) => (
                    <li key={item.label} className="flex items-center gap-3 py-2">
                      <span className="min-w-0 flex-1 text-[13.5px] text-ink-soft">{item.label}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {item.keys.map((key) => (
                          <kbd key={key} className="kbd">
                            {key}
                          </kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </dialog>
  );
}
