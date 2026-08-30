'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckIcon, CloseIcon, CopyIcon, DownloadIcon } from './diagrams';
import { useCopy, useRipple } from './motion';
import { buildListing } from '@/lib/listing';
import { formatSize } from '@/lib/download';
import type { GeneratedImage } from '@/lib/cover';
import type { GeneratedFile } from '@/lib/pdf';
import type { Config } from '@/lib/types';

function CopyButton({
  text,
  copiedKey,
  active,
  onCopy,
  label = 'Salin',
}: {
  text: string;
  copiedKey: string;
  active: boolean;
  onCopy: (text: string, key: string) => void;
  label?: string;
}) {
  const ripple = useRipple<HTMLButtonElement>();
  return (
    <button
      type="button"
      className="btn-quiet !py-1.5 !text-[12px]"
      onClick={(event) => {
        ripple(event);
        onCopy(text, copiedKey);
      }}
    >
      <span className={active ? 'text-accent' : ''}>{active ? <CheckIcon /> : <CopyIcon />}</span>
      {active ? 'Tersalin' : label}
    </button>
  );
}

/**
 * Everything the pack needs on a marketplace, in the order a listing form
 * asks for it: the images first, then the copy, field by field, each one
 * ready to be pasted straight across.
 */
export function ExportDialog({
  open,
  config,
  characters,
  files,
  images,
  onClose,
  onDownloadImage,
  onDownloadBundle,
  bundling,
}: {
  open: boolean;
  config: Config;
  characters: string[];
  files: GeneratedFile[];
  images: GeneratedImage[];
  onClose: () => void;
  onDownloadImage: (image: GeneratedImage) => void;
  onDownloadBundle: () => void;
  bundling: boolean;
}) {
  const [tab, setTab] = useState('images');
  const { copied, copy } = useCopy();
  const ripple = useRipple<HTMLButtonElement>();

  const listings = useMemo(
    () => buildListing({ config, characters, pageCount: files[0]?.pages ?? characters.length }),
    [config, characters, files],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const tabs = [
    { id: 'images', label: `Gambar (${images.length})` },
    ...listings.map((listing) => ({ id: listing.market, label: listing.label })),
  ];

  const listing = listings.find((item) => item.market === tab);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Kit marketplace"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl animate-pop-in flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-pop sm:rounded-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold tracking-tight">Kit marketplace</h2>
            <p className="truncate text-[12px] text-ink-mute">
              {files.length} PDF · {images.length} gambar listing · {listings.length} draf deskripsi
            </p>
          </div>
          <button
            type="button"
            className="btn-quiet ml-auto !px-2.5"
            aria-label="Tutup"
            onClick={(event) => {
              ripple(event);
              onClose();
            }}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="rail flex shrink-0 gap-1 overflow-x-auto overflow-y-hidden border-b border-line px-3 py-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              data-active={item.id === tab}
              className="chip shrink-0"
              onClick={(event) => {
                ripple(event);
                setTab(item.id);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === 'images' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {images.map((image, index) => (
                <figure
                  key={image.name}
                  className="card-lift animate-pop-in overflow-hidden"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="flex items-center justify-center bg-paper p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={`Pratinjau ${image.label}`}
                      className="max-h-44 w-auto rounded-lg border border-line bg-white"
                    />
                  </div>
                  <figcaption className="flex items-center gap-2 border-t border-line px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">{image.label}</span>
                      <span className="text-[11px] text-ink-mute">
                        {image.width} × {image.height} · {formatSize(image.size)}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="btn-quiet ml-auto !px-2.5"
                      aria-label={`Unduh ${image.label}`}
                      onClick={(event) => {
                        ripple(event);
                        onDownloadImage(image);
                      }}
                    >
                      <DownloadIcon />
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : listing ? (
            <div className="animate-fade-up space-y-5">
              <p className="text-[12px] text-ink-mute">{listing.limits}</p>

              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="field-label">Judul</p>
                  <span className="ml-auto text-[11px] tabular-nums text-ink-mute">
                    {listing.title.length} karakter
                  </span>
                  <CopyButton
                    text={listing.title}
                    copiedKey={`${listing.market}-title`}
                    active={copied === `${listing.market}-title`}
                    onCopy={copy}
                  />
                </div>
                <p className="rounded-xl border border-line bg-paper px-3 py-2.5 text-[13px] leading-snug">
                  {listing.title}
                </p>
              </section>

              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="field-label">Deskripsi</p>
                  <div className="ml-auto flex items-center gap-2">
                    {listing.bodyMax ? (
                      <span
                        className={`text-[11px] tabular-nums ${
                          listing.body.length > listing.bodyMax ? 'text-accent' : 'text-ink-mute'
                        }`}
                      >
                        {listing.body.length} / {listing.bodyMax} karakter
                      </span>
                    ) : null}
                    <CopyButton
                      text={listing.body}
                      copiedKey={`${listing.market}-body`}
                      active={copied === `${listing.market}-body`}
                      onCopy={copy}
                    />
                  </div>
                </div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-paper px-3 py-2.5 font-sans text-[13px] leading-relaxed text-ink-soft">
                  {listing.body}
                </pre>
              </section>

              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="field-label">Tag</p>
                  <span className="ml-auto text-[11px] tabular-nums text-ink-mute">
                    {listing.tags.length} tag
                  </span>
                  <CopyButton
                    text={listing.tags.join(', ')}
                    copiedKey={`${listing.market}-tags`}
                    active={copied === `${listing.market}-tags`}
                    onCopy={copy}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {listing.tags.map((tag) => (
                    <span key={tag} className="pill">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          ) : null}
        </div>

        <footer className="flex shrink-0 items-center gap-3 border-t border-line px-5 py-3">
          <p className="hidden text-[12px] text-ink-mute sm:block">
            ZIP berisi file cetak{config.svgFiles ? ', SVG per halaman' : ''}, gambar listing, teks,
            dan lisensi font.
          </p>
          <button
            type="button"
            className="btn-primary ml-auto w-full sm:w-auto"
            disabled={bundling}
            onClick={(event) => {
              ripple(event);
              onDownloadBundle();
            }}
          >
            <DownloadIcon />
            {bundling ? 'Menyiapkan ZIP…' : 'Unduh semua (ZIP)'}
          </button>
        </footer>
      </div>
    </div>
  );
}
