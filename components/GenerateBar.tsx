'use client';

import { CheckIcon, DownloadIcon, KitIcon, Spinner } from './diagrams';
import { useRipple } from './motion';
import { formatSize } from '@/lib/download';
import type { GeneratedImage } from '@/lib/cover';
import type { GeneratedFile } from '@/lib/pdf';

export interface Progress {
  done: number;
  total: number;
  /** What is being built right now, in the user's words. */
  label: string;
}

export function GenerateBar({
  summary,
  pageCount,
  busy,
  progress,
  files,
  images,
  error,
  disabled,
  onGenerate,
  onExportKit,
  onCancel,
  onDownload,
  onDownloadAll,
  onOpenKit,
}: {
  summary: string;
  pageCount: number;
  busy: boolean;
  progress: Progress | null;
  files: GeneratedFile[];
  images: GeneratedImage[];
  error: string | null;
  disabled: boolean;
  onGenerate: () => void;
  onExportKit: () => void;
  onCancel: () => void;
  onDownload: (file: GeneratedFile) => void;
  onDownloadAll: () => void;
  onOpenKit: () => void;
}) {
  const ripple = useRipple<HTMLButtonElement>();
  const percent =
    progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const totalSize =
    files.reduce((sum, file) => sum + file.size, 0) +
    images.reduce((sum, image) => sum + image.size, 0);

  return (
    <div className="relative border-t border-line bg-surface">
      {busy ? (
        <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-accent-soft">
          <div
            className="h-full bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(4, percent)}%` }}
          />
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[13px]">
            <span className="step-mark">06</span>
            <span className="font-semibold text-ink">Hasil</span>
            <span className="truncate text-ink-mute">{summary}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] tabular-nums text-ink-mute" aria-live="polite">
            {busy && progress ? (
              `${progress.label} ${progress.done}/${progress.total} — ${percent}%`
            ) : error ? (
              <span className="text-accent-hover">{error}</span>
            ) : files.length ? (
              <>
                <span className="text-accent animate-pop">
                  <CheckIcon />
                </span>
                Siap: {files.length + images.length} berkas, {formatSize(totalSize)}
              </>
            ) : (
              `${pageCount} halaman per berkas`
            )}
          </p>
        </div>

        {files.length && !busy ? (
          <div className="flex flex-wrap items-center gap-2">
            {files.map((file) => (
              <button
                key={file.name}
                type="button"
                className="btn-quiet animate-pop-in tabular-nums"
                onClick={(event) => {
                  ripple(event);
                  onDownload(file);
                }}
              >
                <DownloadIcon />
                {file.paperLabel}
                <span className="text-ink-mute">{formatSize(file.size)}</span>
              </button>
            ))}
            {files.length > 1 ? (
              <button
                type="button"
                className="btn-quiet animate-pop-in"
                onClick={(event) => {
                  ripple(event);
                  onDownloadAll();
                }}
              >
                <DownloadIcon />
                Semua (ZIP)
              </button>
            ) : null}
            {images.length ? (
              <button
                type="button"
                className="btn-quiet animate-pop-in"
                onClick={(event) => {
                  ripple(event);
                  onOpenKit();
                }}
              >
                <KitIcon />
                Kit listing
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="flex gap-2">
          {busy ? (
            <button
              type="button"
              className="btn-quiet"
              onClick={(event) => {
                ripple(event);
                onCancel();
              }}
            >
              Batalkan
            </button>
          ) : (
            <button
              type="button"
              className="btn-quiet"
              onClick={(event) => {
                ripple(event);
                onExportKit();
              }}
              disabled={disabled}
              title="PDF + gambar listing + teks deskripsi dalam satu ZIP"
            >
              <KitIcon />
              Kit marketplace
            </button>
          )}

          <button
            type="button"
            className="btn-primary flex-1 lg:flex-none"
            onClick={(event) => {
              ripple(event);
              onGenerate();
            }}
            disabled={disabled || busy}
          >
            {busy ? <Spinner /> : null}
            {busy ? 'Menyusun' : files.length ? 'Generate ulang' : 'Generate PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
