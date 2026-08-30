'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, CloseIcon, CopyIcon, DownloadIcon } from './diagrams';
import { useCopy, useRipple } from './motion';
import { buildUploadGuides } from '@/lib/upload';
import type { FieldKind, UploadField, UploadGuide, UploadStep } from '@/lib/upload';
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
 * What the seller does with this field, in one word. A form has three kinds
 * of blank in it — something to paste, something to choose, something to
 * upload — and knowing which one is coming is most of the speed.
 */
const ACTION: Record<FieldKind, string> = {
  title: 'tempel',
  body: 'tempel',
  tags: 'tempel',
  text: 'tempel',
  pick: 'pilih',
  asset: 'unggah',
};

const PASTEABLE: FieldKind[] = ['title', 'body', 'tags', 'text'];

function FieldRow({
  field,
  guide,
  index,
  copied,
  onCopy,
}: {
  field: UploadField;
  guide: UploadGuide;
  index: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const key = `${guide.market}-${index}`;
  const counter =
    field.kind === 'title'
      ? `${field.value.length} karakter`
      : field.kind === 'body'
        ? guide.copy.bodyMax
          ? `${field.value.length} / ${guide.copy.bodyMax} karakter`
          : `${field.value.length} karakter`
        : field.kind === 'tags'
          ? `${guide.copy.tags.length} tag`
          : null;
  // Only the description can outrun its marketplace, and only there does the
  // count need to shout rather than inform.
  const over = field.kind === 'body' && guide.copy.bodyMax ? field.value.length > guide.copy.bodyMax : false;

  return (
    <div className="rounded-xl border border-line bg-paper px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="field-label !normal-case !tracking-normal !text-[12px] !text-ink">{field.label}</p>
        <span className="pill !border-line !bg-surface !px-2 !py-0 !text-[10.5px] !text-ink-mute">
          {ACTION[field.kind]}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {counter ? (
            <span className={`text-[11px] tabular-nums ${over ? 'text-accent' : 'text-ink-mute'}`}>
              {counter}
            </span>
          ) : null}
          {PASTEABLE.includes(field.kind) && field.value ? (
            <CopyButton text={field.value} copiedKey={key} active={copied === key} onCopy={onCopy} />
          ) : null}
        </span>
      </div>

      {field.kind === 'body' ? (
        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-surface px-2.5 py-2 font-sans text-[12.5px] leading-relaxed text-ink-soft">
          {field.value}
        </pre>
      ) : field.kind === 'tags' ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {guide.copy.tags.map((tag) => (
            <span key={tag} className="pill">
              {tag}
            </span>
          ))}
        </div>
      ) : field.value ? (
        <p className="mt-1.5 text-[13px] leading-snug text-ink">{field.value}</p>
      ) : null}

      {field.note ? <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mute">{field.note}</p> : null}
    </div>
  );
}

function StepBlock({
  step,
  number,
  guide,
  copied,
  onCopy,
}: {
  step: UploadStep;
  number: number;
  guide: UploadGuide;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="step-mark">{String(number).padStart(2, '0')}</span>
        <h3 className="text-[13.5px] font-semibold tracking-tight">{step.title}</h3>
      </div>
      {step.detail ? <p className="text-[12px] leading-relaxed text-ink-mute">{step.detail}</p> : null}
      <div className="space-y-2">
        {step.fields.map((field, index) => (
          <FieldRow
            key={field.label}
            field={field}
            guide={guide}
            index={`${number}-${index}`}
            copied={copied}
            onCopy={onCopy}
          />
        ))}
      </div>
      {step.tips?.length ? (
        <ul className="space-y-1.5 rounded-xl border border-accent/25 bg-accent-soft px-3 py-2.5">
          {step.tips.map((tip) => (
            <li key={tip} className="text-[12px] leading-relaxed text-accent-hover">
              {tip}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * Everything the pack needs on a marketplace, in the order that marketplace's
 * own form asks for it: the photo first, then the name, the category, the
 * description — down to the weight Shopee will not let a listing save without.
 * Each blank says whether it is pasted, chosen or uploaded, and the ones that
 * are pasted carry the copy this pack generated, with its counter beside it.
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
  const panel = useRef<HTMLDivElement>(null);

  const guides = useMemo(
    () => buildUploadGuides({ config, characters, pageCount: files[0]?.pages ?? characters.length }),
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

  // A guide is long enough to scroll: a new tab has to start at step one
  // rather than halfway down where the last one was left.
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [tab]);

  if (!open) return null;

  const tabs = [
    { id: 'images', label: `Gambar (${images.length})` },
    ...guides.map((guide) => ({ id: guide.market, label: guide.label })),
  ];

  const guide = guides.find((item) => item.market === tab);

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
              {files.length} PDF · {images.length} gambar listing · {guides.length} panduan unggah
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

        <div ref={panel} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
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
          ) : guide ? (
            <div className="animate-fade-up space-y-5">
              <div className="rounded-xl border border-line bg-paper px-3 py-2.5">
                <p className="text-[12.5px] leading-relaxed text-ink-soft">{guide.entry}</p>
                <p className="mt-1 text-[11.5px] text-ink-mute">{guide.copy.limits}</p>
              </div>

              {guide.steps.map((step, index) => (
                <StepBlock
                  key={step.title}
                  step={step}
                  number={index + 1}
                  guide={guide}
                  copied={copied}
                  onCopy={copy}
                />
              ))}

              <section className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="step-mark">✓</span>
                  <h3 className="text-[13.5px] font-semibold tracking-tight">Sebelum terbit</h3>
                </div>
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                  {guide.checklist.map((item) => (
                    <li key={item} className="px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-soft">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : null}
        </div>

        <footer className="flex shrink-0 items-center gap-3 border-t border-line px-5 py-3">
          <p className="hidden text-[12px] text-ink-mute sm:block">
            ZIP berisi file cetak{config.svgFiles ? ', SVG per halaman' : ''}, gambar listing, teks,
            langkah unggah, dan lisensi font.
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
