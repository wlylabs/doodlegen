'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, CloseIcon, SparkIcon } from './diagrams';
import { dismissToast, subscribe, type Toast } from '@/lib/toast';

/**
 * Where the app answers.
 *
 * One stack, bottom centre on a phone and bottom right on a desktop, above
 * the generate bar and clear of the home indicator. It is `aria-live` so the
 * message is spoken as well as shown, and `polite` rather than `assertive`
 * because none of this interrupts what someone is in the middle of typing.
 *
 * Nothing here is load-bearing: every message it carries is also visible
 * somewhere permanent — the bar says an export failed, the panel says the
 * font did — so a toast that is missed has not cost anything.
 */

function Mark({ tone }: { tone: Toast['tone'] }) {
  if (tone === 'success') {
    return (
      <span className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-accent text-accent-on">
        <CheckIcon className="h-3 w-3" />
      </span>
    );
  }
  if (tone === 'error') {
    return (
      <span
        aria-hidden="true"
        className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full
                   border border-accent-line bg-accent-soft text-[12px] font-bold leading-none text-accent-ink"
      >
        !
      </span>
    );
  }
  return (
    <span className="mt-px shrink-0 text-ink-mute">
      <SparkIcon className="h-[18px] w-[18px]" />
    </span>
  );
}

function Row({ toast }: { toast: Toast }) {
  useEffect(() => {
    if (toast.duration === null) return;
    const timer = window.setTimeout(() => dismissToast(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration]);

  return (
    <li className="toast animate-pop-in">
      <Mark tone={toast.tone} />
      <p className="min-w-0 flex-1 py-px leading-snug">{toast.message}</p>
      {toast.action ? (
        <button
          type="button"
          className="btn-ghost shrink-0 !px-2 !py-1 !text-[12.5px] !text-accent-ink"
          onClick={() => {
            toast.action?.run();
            dismissToast(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        className="btn-ghost shrink-0 !px-1.5 !py-1"
        aria-label="Tutup pesan"
        onClick={() => dismissToast(toast.id)}
      >
        <CloseIcon />
      </button>
    </li>
  );
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => subscribe(setToasts), []);

  return (
    <div
      // Always mounted, so a screen reader is already watching the region
      // when the first message lands in it.
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center px-3
                 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:justify-end sm:px-4"
    >
      <ul className="flex w-full max-w-[400px] flex-col gap-2">
        {toasts.map((item) => (
          <Row key={item.id} toast={item} />
        ))}
      </ul>
    </div>
  );
}
