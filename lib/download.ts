import type { GeneratedFile } from './pdf';

function trigger(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a moment to start the download before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadFile(file: GeneratedFile) {
  const bytes = new Uint8Array(file.bytes);
  trigger(new Blob([bytes], { type: 'application/pdf' }), file.name);
}

export function downloadBlob(blob: Blob, name: string) {
  trigger(blob, name);
}

export async function downloadZip(files: GeneratedFile[], name: string) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const file of files) zip.file(file.name, file.bytes);
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  trigger(blob, name);
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** What a share attempt did, so the caller can say the right thing after it. */
export type ShareResult = 'shared' | 'cancelled' | 'unavailable';

/**
 * Hand the files themselves to whatever the device shares with — a chat app, a
 * mail client, AirDrop — instead of asking the seller to go and find them in a
 * downloads folder first. Nothing is uploaded on the way: the bytes go from
 * this tab straight into the app the user picks, so a pack that never touched
 * a server to be made does not touch one to be sent either.
 *
 * Call it from inside the click that asked for it. A share started after an
 * await of unknown length has lost the user gesture, and Safari refuses it.
 */
export async function sharePdfs(files: GeneratedFile[]): Promise<ShareResult> {
  if (!files.length || typeof navigator === 'undefined' || !navigator.share) return 'unavailable';

  const data = {
    files: files.map(
      (file) => new File([new Uint8Array(file.bytes)], file.name, { type: 'application/pdf' }),
    ),
    title: files[0].title,
  };
  // Desktop browsers advertise `share` and then refuse files; only `canShare`
  // answers for this payload, on this device.
  if (!navigator.canShare?.(data)) return 'unavailable';

  try {
    await navigator.share(data);
    return 'shared';
  } catch (cause) {
    // Dismissing the sheet is a decision, not a failure to fall back from.
    if (cause instanceof DOMException && cause.name === 'AbortError') return 'cancelled';
    return 'unavailable';
  }
}
