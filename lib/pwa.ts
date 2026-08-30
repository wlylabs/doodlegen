/**
 * The parts of "this is an app, not a page" that are not React: how a browser
 * offers an install, how to tell whether this window already *is* the
 * installed app, and where a declined invitation is remembered.
 */

/**
 * Chromium fires this instead of showing its own install bar. It is not in
 * lib.dom, so the shape the app actually uses is declared here.
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: readonly string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'doodlegen.install.dismissed';
/** A declined invitation stays declined for a month, not forever. */
const DISMISS_DAYS = 30;

/**
 * True when the document is running as an installed app. Every display mode
 * the manifest can land in counts, plus the flag iOS sets instead.
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const ios = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const modes = ['standalone', 'minimal-ui', 'window-controls-overlay', 'fullscreen'];
  return ios || modes.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches);
}

/**
 * iOS has no install event at all: on that platform the only thing an app can
 * do is name the two taps in Safari's share sheet. Chrome, Edge and Firefox on
 * iOS are the same WebKit underneath, and only Safari can add to the home
 * screen, so they are deliberately not offered the hint.
 */
export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (!iOS) return false;
  return !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/.test(ua);
}

export function installDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY));
    if (!at) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function rememberInstallDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Private mode: the hint simply comes back next visit.
  }
}
