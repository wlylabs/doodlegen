'use client';

import { DownloadIcon, Spinner } from './diagrams';
import { formatSize } from '@/lib/download';
import type { GeneratedFile } from '@/lib/pdf';

export interface Progress {
  done: number;
  total: number;
}

export function GenerateBar({
  summary,
  pageCount,
  busy,
  progress,
  files,
  error,
  disabled,
  onGenerate,
  onDownload,
  onDownloadAll,
}: {
  summary: string;
  pageCount: number;
  busy: boolean;
  progress: Progress | null;
  files: GeneratedFile[];
  error: string | null;
  disabled: boolean;
  onGenerate: () => void;
  onDownload: (file: GeneratedFile) => void;
  onDownloadAll: () => void;
}) {
  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="relative border-t border-line bg-surface">
      {busy ? (
        <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-accent-soft">
          <div
            className="h-full bg-accent transition-[width] duration-200 ease-out"
            style={{ width: `${Math.max(4, percent)}%` }}
          />
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2 text-[13px]">
            <span className="text-[11px] font-semibold tabular-nums text-accent">06</span>
            <span className="font-semibold tracking-tight text-ink">Generate</span>
            <span className="truncate text-ink-mute">{summary}</span>
          </p>
          <p className="mt-0.5 text-[12px] tabular-nums text-ink-mute" aria-live="polite">
            {busy && progress
              ? `Menyusun halaman ${progress.done} dari ${progress.total} — ${percent}%`
              : error
                ? error
                : files.length
                  ? `Siap: ${files.length} berkas, ${formatSize(files.reduce((sum, file) => sum + file.size, 0))}`
                  : `${pageCount} halaman per berkas`}
          </p>
        </div>

        {files.length && !busy ? (
          <div className="flex flex-wrap items-center gap-2">
            {files.map((file) => (
              <button
                key={file.name}
                type="button"
                className="btn-quiet tabular-nums"
                onClick={() => onDownload(file)}
              >
                <DownloadIcon />
                {file.paperLabel}
                <span className="text-ink-mute">{formatSize(file.size)}</span>
              </button>
            ))}
            {files.length > 1 ? (
              <button type="button" className="btn-quiet" onClick={onDownloadAll}>
                <DownloadIcon />
                Semua (ZIP)
              </button>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          className="btn-primary w-full lg:w-auto"
          onClick={onGenerate}
          disabled={disabled || busy}
        >
          {busy ? <Spinner /> : null}
          {busy ? 'Menyusun PDF' : files.length ? 'Generate ulang' : 'Generate PDF'}
        </button>
      </div>
    </div>
  );
}
