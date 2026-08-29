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
