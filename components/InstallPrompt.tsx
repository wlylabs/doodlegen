'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CloseIcon, InstallIcon, IosShareIcon } from './diagrams';
import { useRipple } from './motion';
import {
  installDismissed,
  isIosSafari,
  isStandalone,
  rememberInstallDismissed,
  type BeforeInstallPromptEvent,
} from '@/lib/pwa';

/** What this browser can actually be offered, if anything. */
type Offer = 'none' | 'prompt' | 'ios';

/**
 * "Pasang aplikasi" — shown only where the button can do something: a browser
 * that has offered an install, or Safari on iOS, which never will and can only
 * be told which two taps to make. Inside the installed app, or in a browser
 * that has already installed it, this renders nothing at all: an install
 * button that cannot install is worse than no button.
 */
export function InstallButton({
  variant = 'quiet',
  compact = false,
  className = '',
}: {
  variant?: 'quiet' | 'primary';
  /** In a crowded app bar the label drops on small screens, icon only — the
      same treatment the share button beside it already gets. */
  compact?: boolean;
  className?: string;
}) {
  const [offer, setOffer] = useState<Offer>('none');
  const [hint, setHint] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const ripple = useRipple<HTMLButtonElement>();

  useEffect(() => {
    if (isStandalone()) return;

    const onBeforeInstall = (event: Event) => {
      // Holding the event back is what replaces Chrome's own bar with ours.
      event.preventDefault();
      deferred.current = event as BeforeInstallPromptEvent;
      setOffer('prompt');
    };
    const onInstalled = () => {
      deferred.current = null;
      setOffer('none');
      setHint(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    if (isIosSafari() && !installDismissed()) setOffer('ios');

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const onClick = useCallback(async () => {
    if (offer === 'ios') {
      setHint((open) => !open);
      return;
    }
    const event = deferred.current;
    if (!event) return;
    deferred.current = null;
    setOffer('none');
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      // A "no" is remembered so the invitation does not come back every visit.
      if (outcome === 'dismissed') rememberInstallDismissed();
    } catch {
      // The prompt can only be spent once; losing it is not worth a message.
    }
  }, [offer]);

  if (offer === 'none') return null;

  const base = variant === 'primary' ? 'btn-primary !px-4 !py-2 !text-[14px]' : 'btn-quiet';

  return (
    <>
      <button
        type="button"
        className={`${base} ${className}`}
        // Compact drops the label to an icon, so the name is carried here.
        aria-label="Pasang aplikasi"
        aria-expanded={offer === 'ios' ? hint : undefined}
        onClick={(event) => {
          ripple(event);
          void onClick();
        }}
      >
        <InstallIcon />
        <span className={compact ? 'hidden sm:inline' : undefined}>Pasang aplikasi</span>
      </button>

      {offer === 'ios' && hint ? <IosHint onClose={() => setHint(false)} /> : null}
    </>
  );
}

/**
 * Safari's two taps, named in order. It sits over the page rather than under
 * the button because on iPhone the button is in a header the sheet would spill
 * out of, and the share button being described is at the other end of the
 * screen anyway.
 */
function IosHint({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dismiss = () => {
    rememberInstallDismissed();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-[2px]">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Tutup" onClick={dismiss} />
      <div
        role="dialog"
        aria-label="Pasang DoodleGen di layar utama"
        className="relative w-full max-w-sm rounded-3xl border border-line bg-surface p-5 shadow-pop"
      >
        <button
          type="button"
          className="btn-quiet absolute right-3 top-3 !border-transparent !px-2 !py-1"
          aria-label="Tutup"
          onClick={dismiss}
        >
          <CloseIcon />
        </button>

        <p className="pr-8 text-[15px] font-semibold text-ink">Pasang di layar utama</p>
        <p className="mt-1 text-[13px] text-ink-soft">
          Safari memasang aplikasi lewat menu bagikan — dua ketukan, lalu DoodleGen terbuka layar
          penuh dan tetap jalan tanpa internet.
        </p>

        <ol className="mt-3 flex flex-col gap-2">
          <li className="flex items-center gap-2 text-[13px] text-ink-soft">
            <span className="step-mark">1</span>
            <span className="flex items-center gap-1.5">
              Ketuk <IosShareIcon className="h-4 w-4 text-accent" /> <b className="font-semibold text-ink">Bagikan</b>
            </span>
          </li>
          <li className="flex items-center gap-2 text-[13px] text-ink-soft">
            <span className="step-mark">2</span>
            <span>
              Pilih <b className="font-semibold text-ink">Tambahkan ke Layar Utama</b>
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
