/**
 * Transient messages, held outside React.
 *
 * The things worth announcing here — an export that failed, a link that made
 * it to the clipboard, a connection that dropped — are raised from callbacks,
 * effects and a service worker listener, in three different parts of the
 * tree. Threading a context down to all of them would mean every component
 * that might one day say something has to be handed the means to say it, so
 * the queue is a module instead: anything that can import can speak, and the
 * one component that renders subscribes.
 */

export type ToastTone = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  /** How long it stays. `null` keeps it up until something dismisses it. */
  duration: number | null;
  /** A single inline action, for a message the user can answer. */
  action?: { label: string; run: () => void };
}

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();
let nextId = 1;

/** At most three at once: a stack taller than that is a log, not a message. */
const MAX = 3;

function emit(): void {
  for (const listener of listeners) listener(toasts);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => listeners.delete(listener);
}

export function dismissToast(id: number): void {
  const next = toasts.filter((toast) => toast.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

export interface ToastOptions {
  tone?: ToastTone;
  duration?: number | null;
  action?: Toast['action'];
  /**
   * An identity, so a message that can recur — "you are offline" — replaces
   * its predecessor instead of stacking copies of itself.
   */
  key?: string;
}

const keyed = new Map<string, number>();

export function toast(message: string, options: ToastOptions = {}): number {
  const { tone = 'info', duration = tone === 'error' ? 6000 : 3200, action, key } = options;

  if (key !== undefined) {
    const existing = keyed.get(key);
    if (existing !== undefined) dismissToast(existing);
  }

  const id = nextId++;
  if (key !== undefined) keyed.set(key, id);

  toasts = [...toasts, { id, message, tone, duration, action }].slice(-MAX);
  emit();
  return id;
}

export const toastSuccess = (message: string, options: ToastOptions = {}) =>
  toast(message, { ...options, tone: 'success' });

export const toastError = (message: string, options: ToastOptions = {}) =>
  toast(message, { ...options, tone: 'error' });
