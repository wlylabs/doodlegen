'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CheckIcon, CloseIcon, CopyIcon, DownloadIcon } from './diagrams';
import { useCopy, useRipple } from './motion';
import { buildUploadGuides, guideToText } from '@/lib/upload';
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
    <div className="rounded-xl border border-line bg-paper px-3.5 py-3">
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
        <ul className="space-y-1.5 rounded-xl border border-accent-line bg-accent-soft px-3.5 py-3">
          {step.tips.map((tip) => (
            <li key={tip} className="text-[12px] leading-relaxed text-accent-ink">
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
  const dialog = useRef<HTMLDialogElement>(null);
  /*
   * Generated rather than a fixed string. A constant id is a promise there is
   * only ever one of these on the page, and nothing enforces it.
   */
  const id = useId();

  const guides = useMemo(
    () => buildUploadGuides({ config, characters, pageCount: files[0]?.pages ?? characters.length }),
    [config, characters, files],
  );

  /*
   * Opened as a modal rather than shown as a fixed layer.
   *
   * `showModal()` is what puts the panel in the top layer, and it hands the
   * platform three things this dialog was doing by hand or not at all: focus
   * is trapped inside it and returned to the button that opened it on close,
   * Escape works without a window-level keydown listener, and everything
   * behind it goes inert — which the old markup only claimed, with
   * `aria-modal`, while leaving every control under the scrim tabbable.
   */
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    else if (!open && node.open) node.close();
  }, [open]);

  /*
   * Escape arrives as `cancel`, which closes the dialog immediately by
   * default. Preventing that and routing through `onClose` keeps one way out:
   * the parent still owns `open`, so the close animates rather than the
   * element snapping shut underneath React.
   */
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const onCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    node.addEventListener('cancel', onCancel);
    return () => node.removeEventListener('cancel', onCancel);
  }, [onClose]);

  // The page behind a modal must not scroll under it — on touch especially,
  // where a flick over the scrim would otherwise move the studio, not the kit.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // A guide is long enough to scroll: a new tab has to start at step one
  // rather than halfway down where the last one was left.
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [tab]);

  const tabs = [
    { id: 'images', label: `Gambar (${images.length})` },
    ...guides.map((guide) => ({ id: guide.market, label: guide.label })),
  ];

  const guide = guides.find((item) => item.market === tab);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-summary`}
      /*
       * The element covers the viewport, so the sheet can sit at the bottom on
       * a phone and centred on a desktop the way it did as a fixed layer. The
       * scrim is the `::backdrop` now, which is why there is no fill here.
       *
       * No display utility belongs on the dialog itself: a closed `<dialog>`
       * is hidden by `dialog:not([open]) { display: none }` in the user-agent
       * sheet, and any author `display` — a `flex` for the centring, say —
       * outranks that whatever layer it sits in, which would leave the panel
       * on screen with the page still live behind it. The layout goes on the
       * wrapper inside.
       */
      className="dialog-reveal fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none border-0
                 bg-transparent p-0 text-ink"
    >
      <div
        onClick={(event) => {
          // A click reaches this wrapper only where it landed on the empty
          // space around the panel; anything inside the panel stops there.
          if (event.target === event.currentTarget) onClose();
        }}
        className="flex h-full w-full items-end justify-center sm:items-center sm:p-6"
      >
        <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-pop sm:rounded-3xl">
          <header className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id={`${id}-title`} className="text-[16px] font-semibold tracking-tight">
                Kit marketplace
              </h2>
              <p id={`${id}-summary`} className="truncate text-[12px] text-ink-mute">
                {files.length} PDF · {images.length} gambar listing · {guides.length} panduan
                unggah
              </p>
            </div>
            <button
              type="button"
              className="btn-quiet ml-auto !rounded-full !px-2.5"
              aria-label="Tutup"
              onClick={(event) => {
                ripple(event);
                onClose();
              }}
            >
              <CloseIcon />
            </button>
          </header>

          <div className="rail flex shrink-0 gap-1.5 overflow-x-auto overflow-y-hidden border-b border-line bg-paper px-4 py-2.5">
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
                    <div className="flex items-center justify-center bg-sunk p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={`Pratinjau ${image.label}`}
                        className="max-h-44 w-auto rounded-lg border border-line bg-sheet shadow-xs"
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
                        className="btn-quiet ml-auto !rounded-full !px-2.5"
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
                <div className="space-y-2.5">
                  <div className="rounded-xl border border-line bg-paper px-3.5 py-3">
                    <div className="flex items-start gap-2">
                      <p className="text-[12.5px] leading-relaxed text-ink-soft">{guide.entry}</p>
                      {/* Listing happens on the phone that has the Shopee app on
                          it, not next to the laptop that made the ZIP. */}
                      <span className="ml-auto shrink-0">
                        <CopyButton
                          text={guideToText(guide)}
                          copiedKey={`${guide.market}-guide`}
                          active={copied === `${guide.market}-guide`}
                          onCopy={copy}
                          label="Salin panduan"
                        />
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] text-ink-mute">{guide.copy.limits}</p>
                  </div>

                  {/* The phrase the whole draft is built to win, and where that
                      marketplace actually reads it. */}
                  <div className="rounded-xl border border-accent/25 bg-accent-soft px-3 py-2.5">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="field-label !text-accent">Kata kunci utama</p>
                      <p className="text-[13px] font-semibold text-accent-ink">{guide.copy.focus}</p>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-accent-hover">{guide.copy.seo}</p>
                  </div>
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
    </dialog>
  );
}
