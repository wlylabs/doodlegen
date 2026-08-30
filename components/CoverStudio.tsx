'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageSheet } from './PageSheet';
import { CloseIcon } from './diagrams';
import { useRipple } from './motion';
import { Note } from './ui';
import {
  COVER_INKS,
  COVER_TEMPLATES,
  ELEMENT_SEEDS,
  MAX_ELEMENTS,
  clampElement,
  cloneCoverDoc,
  coverElementId,
  isCoverDocEmpty,
  makeElement,
  resolveCoverInk,
  type CoverAlign,
  type CoverDoc,
  type CoverElement,
  type CoverGround,
  type CoverTextSource,
} from '@/lib/coverDoc';
import { coverElementArea, planCoverPage } from '@/lib/geometry';
import { PALETTES, cmykToHex } from '@/lib/palette';
import type { PaperSpec } from '@/lib/presets';
import type { Config, LoadedFont } from '@/lib/types';

/** How far an arrow key moves a selected element, as a fraction of the page. */
const NUDGE = 0.005;
/** Anything this close to a centre line snaps to it while dragging. */
const SNAP = 0.012;
/** Undo is a working memory, not a document history. */
const HISTORY = 40;

type Drag = {
  id: string;
  mode: 'move' | 'resize';
  pointer: number;
  fromX: number;
  fromY: number;
  origin: CoverElement;
  /** The element area on screen, in pixels — what a delta is measured against. */
  areaW: number;
  areaH: number;
};

const GROUNDS: { id: CoverGround; label: string; note: string }[] = [
  { id: 'paper', label: 'Kertas', note: 'Putih polos' },
  { id: 'card', label: 'Kartu', note: 'Warna muda' },
  { id: 'ground', label: 'Penuh', note: 'Warna pekat' },
];

const SOURCES: { id: CoverTextSource; label: string }[] = [
  { id: 'title', label: 'Judul produk' },
  { id: 'brand', label: 'Nama toko' },
  { id: 'tagline', label: 'Tagline' },
  { id: 'custom', label: 'Teks bebas' },
];

const ALIGNS: { id: CoverAlign; label: string }[] = [
  { id: 'left', label: 'Kiri' },
  { id: 'center', label: 'Tengah' },
  { id: 'right', label: 'Kanan' },
];

const SEED_GROUPS: { group: CoverElement['kind']; label: string }[] = [
  { group: 'text', label: 'Teks' },
  { group: 'sample', label: 'Huruf' },
  { group: 'shape', label: 'Bentuk' },
];

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  const ripple = useRipple<HTMLButtonElement>();
  return (
    <button
      type="button"
      data-active={active}
      className="chip shrink-0 !px-2.5 !py-1.5 !text-[12px]"
      onClick={(event) => {
        ripple(event);
        onClick();
      }}
    >
      {label}
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="field-label mb-1.5">{label}</p>
      {children}
    </div>
  );
}

/**
 * The cover studio: the seller's own title page, laid out by hand.
 *
 * Two things make it worth building rather than shipping another stock
 * composition. The page under the handles is the real one — `planCoverPage`
 * is the same call the PDF makes, so there is no mock-up to drift out of
 * sync. And nothing here is stored in pixels: an element is a fraction of the
 * safe box and a role in the palette, so the same cover prints on A4 and US
 * Letter and recolours itself when the palette changes.
 */
export function CoverStudio({
  open,
  config,
  font,
  paper,
  characters,
  update,
  onClose,
}: {
  open: boolean;
  config: Config;
  font: LoadedFont | null;
  paper: PaperSpec;
  characters: string[];
  update: (patch: Partial<Config>) => void;
  onClose: () => void;
}) {
  const [doc, setDoc] = useState<CoverDoc>(() => cloneCoverDoc(config.coverCustom));
  const [selected, setSelected] = useState<string | null>(null);
  const [past, setPast] = useState<CoverDoc[]>([]);
  const [future, setFuture] = useState<CoverDoc[]>([]);
  const [showSafe, setShowSafe] = useState(true);
  const [tab, setTab] = useState<CoverElement['kind']>('text');
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const ripple = useRipple<HTMLButtonElement>();

  // The document the studio edits is the one in the config; it is copied in
  // on open so a session of dragging is one entry in the undo stack of the
  // app, not forty.
  useEffect(() => {
    if (!open) return;
    setDoc(cloneCoverDoc(config.coverCustom));
    setPast([]);
    setFuture([]);
    setSelected(null);
    // Reading the config once, on open, is the point: later edits come from
    // this component and would otherwise fight the drag in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** Every change lands here: it records an undo step and publishes upward. */
  const commit = useCallback(
    (next: CoverDoc) => {
      setPast((stack) => [...stack, doc].slice(-HISTORY));
      setFuture([]);
      setDoc(next);
      update({ coverCustom: next });
    },
    [doc, update],
  );

  /** A drag publishes once, at the end; in between it only moves the preview. */
  const preview = useCallback((next: CoverDoc) => setDoc(next), []);

  const patchElement = useCallback(
    (id: string, patch: Partial<CoverElement>, live = false) => {
      const next: CoverDoc = {
        ...doc,
        elements: doc.elements.map((element) =>
          element.id === id ? clampElement({ ...element, ...patch }) : element,
        ),
      };
      if (live) preview(next);
      else commit(next);
    },
    [doc, commit, preview],
  );

  // Both stacks are read, not updated functionally: publishing to the app
  // from inside a state updater would be a setState during another
  // component's render, which React rightly refuses.
  const undo = useCallback(() => {
    const previous = past[past.length - 1];
    if (!previous) return;
    setPast(past.slice(0, -1));
    setFuture([doc, ...future].slice(0, HISTORY));
    setDoc(previous);
    update({ coverCustom: previous });
  }, [past, future, doc, update]);

  const redo = useCallback(() => {
    const next = future[0];
    if (!next) return;
    setFuture(future.slice(1));
    setPast([...past, doc].slice(-HISTORY));
    setDoc(next);
    update({ coverCustom: next });
  }, [past, future, doc, update]);

  const current = doc.elements.find((element) => element.id === selected) ?? null;

  const add = useCallback(
    (seedId: string) => {
      if (doc.elements.length >= MAX_ELEMENTS) return;
      // Placed clear of anything of its own kind already on the page, so a
      // second title never lands exactly on the first.
      const element = makeElement(seedId, doc.elements);
      if (!element) return;
      commit({ ...doc, elements: [...doc.elements, element] });
      setSelected(element.id);
    },
    [doc, commit],
  );

  const remove = useCallback(
    (id: string) => {
      commit({ ...doc, elements: doc.elements.filter((element) => element.id !== id) });
      setSelected(null);
    },
    [doc, commit],
  );

  const duplicate = useCallback(
    (id: string) => {
      const source = doc.elements.find((element) => element.id === id);
      if (!source || doc.elements.length >= MAX_ELEMENTS) return;
      const copy = clampElement({
        ...source,
        id: coverElementId(),
        x: source.x + 0.03,
        y: source.y + 0.03,
      });
      commit({ ...doc, elements: [...doc.elements, copy] });
      setSelected(copy.id);
    },
    [doc, commit],
  );

  /** Layering is array order: later is nearer the front, within its own layer. */
  const restack = useCallback(
    (id: string, to: 'up' | 'down' | 'front' | 'back') => {
      const index = doc.elements.findIndex((element) => element.id === id);
      if (index < 0) return;
      const rest = doc.elements.filter((element) => element.id !== id);
      const element = doc.elements[index];
      const at =
        to === 'front'
          ? rest.length
          : to === 'back'
            ? 0
            : Math.max(0, Math.min(rest.length, index + (to === 'up' ? 1 : -1)));
      commit({ ...doc, elements: [...rest.slice(0, at), element, ...rest.slice(at)] });
    },
    [doc, commit],
  );

  const centre = useCallback(
    (id: string, axis: 'x' | 'y') => {
      const element = doc.elements.find((item) => item.id === id);
      if (!element) return;
      patchElement(
        id,
        axis === 'x' ? { x: (1 - element.w) / 2 } : { y: (1 - element.h) / 2 },
      );
    },
    [doc, patchElement],
  );

  // The page the studio draws is the page the PDF writes: same planner, same
  // font, same units — only the paper is the one on screen.
  const previewConfig = useMemo<Config>(
    () => ({ ...config, coverStyle: 'custom', coverPage: true, coverCustom: doc }),
    [config, doc],
  );

  const plan = useMemo(() => {
    if (!font || !characters.length) return null;
    return planCoverPage({ font, config: previewConfig, paper, characters });
  }, [font, previewConfig, paper, characters]);

  // Where the elements' 0–1 space lands on the page, so the handles can sit
  // exactly over what they move.
  const area = useMemo(() => coverElementArea(paper, previewConfig), [paper, previewConfig]);
  const frame = {
    left: (area.x / paper.widthPt) * 100,
    top: ((paper.heightPt - area.y - area.h) / paper.heightPt) * 100,
    width: (area.w / paper.widthPt) * 100,
    height: (area.h / paper.heightPt) * 100,
  };

  const palette = PALETTES[config.palette];

  const swatch = useCallback(
    (value: string | undefined, fallback = palette.headline) =>
      cmykToHex(resolveCoverInk(palette, value, fallback)),
    [palette],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent, element: CoverElement, mode: Drag['mode']) => {
      const box = canvas.current?.getBoundingClientRect();
      if (!box) return;
      event.preventDefault();
      event.stopPropagation();
      (event.target as Element).setPointerCapture(event.pointerId);
      setSelected(element.id);
      drag.current = {
        id: element.id,
        mode,
        pointer: event.pointerId,
        fromX: event.clientX,
        fromY: event.clientY,
        origin: element,
        areaW: (box.width * frame.width) / 100,
        areaH: (box.height * frame.height) / 100,
      };
    },
    [frame.width, frame.height],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const state = drag.current;
      if (!state || state.pointer !== event.pointerId) return;
      const dx = (event.clientX - state.fromX) / state.areaW;
      const dy = (event.clientY - state.fromY) / state.areaH;

      if (state.mode === 'resize') {
        patchElement(
          state.id,
          { w: state.origin.w + dx, h: state.origin.h + dy },
          true,
        );
        return;
      }

      // A cover is a symmetrical thing; the one alignment worth helping with
      // is the middle, on either axis.
      let x = state.origin.x + dx;
      let y = state.origin.y + dy;
      const middleX = (1 - state.origin.w) / 2;
      const middleY = (1 - state.origin.h) / 2;
      if (Math.abs(x - middleX) < SNAP) x = middleX;
      if (Math.abs(y - middleY) < SNAP) y = middleY;
      patchElement(state.id, { x, y }, true);
    },
    [patchElement],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      const state = drag.current;
      if (!state || state.pointer !== event.pointerId) return;
      drag.current = null;
      // The preview has been running ahead of the config; this is the single
      // entry the whole drag leaves behind.
      setPast((stack) => [...stack, { ...doc, elements: replace(doc.elements, state.origin) }].slice(-HISTORY));
      setFuture([]);
      update({ coverCustom: doc });
    },
    [doc, update],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;

      if (event.key === 'Escape') {
        if (selected) setSelected(null);
        else onClose();
        return;
      }
      if (typing) return;

      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (!selected || !current) return;
      if (meta && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicate(selected);
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        remove(selected);
        return;
      }
      const step = event.shiftKey ? NUDGE * 4 : NUDGE;
      const moves: Record<string, Partial<CoverElement>> = {
        ArrowLeft: { x: current.x - step },
        ArrowRight: { x: current.x + step },
        ArrowUp: { y: current.y - step },
        ArrowDown: { y: current.y + step },
      };
      const move = moves[event.key];
      if (move) {
        event.preventDefault();
        patchElement(selected, move);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, selected, current, onClose, undo, redo, duplicate, remove, patchElement]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink/40 backdrop-blur-[2px] sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Studio sampul"
    >
      <div className="flex h-full w-full max-w-[1400px] animate-pop-in flex-col overflow-hidden border-line bg-surface shadow-pop sm:rounded-2xl sm:border">
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[15.5px] font-semibold tracking-tight">Studio sampul</h2>
            <p className="truncate text-[12px] text-ink-mute">
              Seret, ubah ukuran, dan warnai sendiri — halaman ini yang dicetak.
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="btn-quiet !px-2.5 !text-[12px]"
              disabled={!past.length}
              onClick={(event) => {
                ripple(event);
                undo();
              }}
            >
              Urungkan
            </button>
            <button
              type="button"
              className="btn-quiet !px-2.5 !text-[12px]"
              disabled={!future.length}
              onClick={(event) => {
                ripple(event);
                redo();
              }}
            >
              Ulangi
            </button>
            <button
              type="button"
              className="btn-primary !px-4 !py-2 !text-[13px]"
              onClick={(event) => {
                ripple(event);
                onClose();
              }}
            >
              Selesai
            </button>
            <button
              type="button"
              className="btn-quiet !px-2.5"
              aria-label="Tutup"
              onClick={(event) => {
                ripple(event);
                onClose();
              }}
            >
              <CloseIcon />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          {/* Left: what can be dropped on the page, and what the page is made of. */}
          {/* On a phone the page comes first and the controls follow it;
              side by side, the reading order is the natural one. */}
          <aside className="order-2 shrink-0 border-line px-4 py-4 lg:order-none lg:w-[240px] lg:overflow-y-auto lg:border-r">
            <Group label="Tambah elemen">
              <div className="rail mb-2 flex gap-1 overflow-x-auto">
                {SEED_GROUPS.map((item) => (
                  <Chip
                    key={item.group}
                    active={tab === item.group}
                    label={item.label}
                    onClick={() => setTab(item.group)}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {ELEMENT_SEEDS.filter((seed) => seed.group === tab).map((seed) => (
                  <button
                    key={seed.id}
                    type="button"
                    className="choice !py-2 !text-[12.5px]"
                    disabled={doc.elements.length >= MAX_ELEMENTS}
                    onClick={(event) => {
                      ripple(event);
                      add(seed.id);
                    }}
                  >
                    <span className="font-semibold leading-tight">{seed.label}</span>
                  </button>
                ))}
              </div>
              {doc.elements.length >= MAX_ELEMENTS ? (
                <Note tone="warn">
                  Sudah {MAX_ELEMENTS} elemen. Hapus salah satu sebelum menambah lagi.
                </Note>
              ) : null}
            </Group>

            <Group label="Latar halaman">
              <div className="flex flex-wrap gap-1.5">
                {GROUNDS.map((item) => (
                  <Chip
                    key={item.id}
                    active={doc.ground === item.id}
                    label={item.label}
                    onClick={() => commit({ ...doc, ground: item.id })}
                  />
                ))}
                <Chip
                  active={doc.confetti}
                  label="Titik warna"
                  onClick={() => commit({ ...doc, confetti: !doc.confetti })}
                />
              </div>
              <Note>
                Warna latar diambil dari palet di panel pengaturan. Palet Hitam Putih tidak punya
                latar, jadi sampulnya keluar sebagai garis saja — tetap satu plat tinta.
              </Note>
            </Group>

            <Group label="Mulai dari contoh">
              <div className="flex flex-wrap gap-1.5">
                {COVER_TEMPLATES.map((template) => (
                  <Chip
                    key={template.id}
                    active={false}
                    label={template.label}
                    onClick={() => {
                      commit(cloneCoverDoc(template.doc));
                      setSelected(null);
                    }}
                  />
                ))}
                <Chip
                  active={false}
                  label="Kosongkan"
                  onClick={() => {
                    commit({ ...doc, elements: [] });
                    setSelected(null);
                  }}
                />
              </div>
              <Note>Mengganti seluruh susunan. Tekan “Urungkan” kalau salah pilih.</Note>
            </Group>
          </aside>

          {/* Middle: the page itself, with the handles laid over it. */}
          <section className="bench order-1 flex min-h-[460px] flex-1 flex-col items-center justify-start gap-3 p-4 lg:order-none lg:min-h-0">
            {!font || !plan ? (
              <p className="mt-10 text-[13px] text-ink-soft">
                {characters.length ? 'Memuat font…' : 'Belum ada karakter untuk ditampilkan.'}
              </p>
            ) : (
              <>
                {/* The sheet is sized from the height it is given, so the
                    page fills the bench on a laptop and still fits a phone. */}
                <div className="flex min-h-0 w-full flex-1 items-center justify-center">
                <div
                  ref={canvas}
                  className="trim relative h-full max-h-full select-none rounded-[3px] bg-white shadow-sheet"
                  style={{
                    aspectRatio: `${paper.widthPt} / ${paper.heightPt}`,
                    maxWidth: '100%',
                  }}
                  onPointerDown={() => setSelected(null)}
                >
                  <PageSheet
                    plan={plan}
                    paper={paper}
                    font={font}
                    config={previewConfig}
                    showSafeArea={showSafe}
                    className="pointer-events-none absolute inset-0 h-full w-full"
                  />

                  <div
                    className="absolute"
                    style={{
                      left: `${frame.left}%`,
                      top: `${frame.top}%`,
                      width: `${frame.width}%`,
                      height: `${frame.height}%`,
                    }}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                  >
                    {doc.elements.map((element) => {
                      const active = element.id === selected;
                      return (
                        <div
                          key={element.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Elemen ${labelOf(element)}`}
                          className={`absolute touch-none rounded-[3px] border transition-colors duration-150 ${
                            active
                              ? 'border-accent bg-accent/5'
                              : 'border-transparent hover:border-accent/40'
                          }`}
                          style={{
                            left: `${element.x * 100}%`,
                            top: `${element.y * 100}%`,
                            width: `${element.w * 100}%`,
                            height: `${element.h * 100}%`,
                            cursor: 'move',
                          }}
                          onPointerDown={(event) => onPointerDown(event, element, 'move')}
                          onFocus={() => setSelected(element.id)}
                        >
                          {active ? (
                            <span
                              className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-se-resize touch-none rounded-[3px] border border-accent bg-surface"
                              onPointerDown={(event) => onPointerDown(event, element, 'resize')}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-center gap-1.5">
                  <Chip
                    active={showSafe}
                    label="Garis margin aman"
                    onClick={() => setShowSafe((on) => !on)}
                  />
                  <span className="spec">{paper.label}</span>
                  <span className="spec">{doc.elements.length} elemen</span>
                </div>
              </>
            )}
          </section>

          {/* Right: everything about the one element that is selected. */}
          <aside className="order-3 shrink-0 border-line px-4 py-4 lg:order-none lg:w-[280px] lg:overflow-y-auto lg:border-l">
            {!current ? (
              <>
                <p className="field-label mb-1.5">Elemen</p>
                <p className="text-[12.5px] leading-relaxed text-ink-soft">
                  {isCoverDocEmpty(doc)
                    ? 'Halaman masih kosong. Tambahkan elemen dari panel kiri, atau mulai dari salah satu contoh — apa pun yang ditambahkan tidak akan menimpa yang sudah ada.'
                    : 'Klik salah satu elemen di halaman untuk mengubahnya. Panah menggeser, Shift+panah menggeser lebih jauh, Delete menghapus.'}
                </p>
                <div className="mt-3 flex flex-col gap-1">
                  {[...doc.elements].reverse().map((element) => (
                    <button
                      key={element.id}
                      type="button"
                      className="choice !flex-row !items-center !gap-2 !py-1.5 !text-[12.5px]"
                      onClick={(event) => {
                        ripple(event);
                        setSelected(element.id);
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="h-3 w-3 shrink-0 rounded-full border border-black/10"
                        style={{ background: swatch(element.color) }}
                      />
                      <span className="truncate">{labelOf(element)}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <p className="field-label">{labelOf(current)}</p>
                  <button
                    type="button"
                    className="btn-ghost ml-auto !px-2 !py-1 !text-[12px] text-accent"
                    onClick={(event) => {
                      ripple(event);
                      remove(current.id);
                    }}
                  >
                    Hapus
                  </button>
                </div>

                {current.kind === 'text' ? (
                  <>
                    <Group label="Isi teks">
                      <div className="flex flex-wrap gap-1.5">
                        {SOURCES.map((item) => (
                          <Chip
                            key={item.id}
                            active={(current.source ?? 'custom') === item.id}
                            label={item.label}
                            onClick={() => patchElement(current.id, { source: item.id })}
                          />
                        ))}
                      </div>
                      {(current.source ?? 'custom') === 'custom' ? (
                        <input
                          type="text"
                          value={current.text ?? ''}
                          maxLength={140}
                          className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px]"
                          onChange={(event) =>
                            patchElement(current.id, { text: event.target.value })
                          }
                        />
                      ) : (
                        <Note>
                          {current.source === 'title'
                            ? 'Mengikuti “Judul produk” di panel pengaturan.'
                            : current.source === 'brand'
                              ? 'Mengikuti “Nama toko / merek”.'
                              : 'Mengikuti “Tagline sampul”. Kosong berarti tidak dicetak.'}
                        </Note>
                      )}
                    </Group>

                    <Group label="Perataan">
                      <div className="flex flex-wrap gap-1.5">
                        {ALIGNS.map((item) => (
                          <Chip
                            key={item.id}
                            active={(current.align ?? 'center') === item.id}
                            label={item.label}
                            onClick={() => patchElement(current.id, { align: item.id })}
                          />
                        ))}
                        <Chip
                          active={current.rainbow === true}
                          label="Pelangi"
                          onClick={() =>
                            patchElement(current.id, { rainbow: !current.rainbow })
                          }
                        />
                      </div>
                      <Note>
                        Ukuran huruf mengikuti kotaknya: perbesar kotak, hurufnya ikut membesar.
                      </Note>
                    </Group>
                  </>
                ) : null}

                {current.kind === 'sample' ? (
                  <Group label="Karakter">
                    <div className="rail flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                      {characters.slice(0, 60).map((text, index) => (
                        <Chip
                          key={`${text}-${index}`}
                          active={(current.sample ?? 0) % Math.max(1, characters.length) === index}
                          label={text}
                          onClick={() => patchElement(current.id, { sample: index })}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Chip
                        active={current.trace === true}
                        label="Titik-titik"
                        onClick={() => patchElement(current.id, { trace: !current.trace })}
                      />
                    </div>
                    <Note>
                      Huruf titik-titik tidak diwarnai: itu huruf yang masih kosong, pasangan dari
                      huruf yang sudah berwarna di sebelahnya.
                    </Note>
                  </Group>
                ) : null}

                {current.kind === 'shape' ? (
                  <Group label="Bentuk">
                    <div className="flex flex-wrap gap-1.5">
                      {ELEMENT_SEEDS.filter((seed) => seed.group === 'shape').map((seed) => {
                        const shape = seed.make().shape;
                        return (
                          <Chip
                            key={seed.id}
                            active={current.shape === shape}
                            label={seed.label}
                            onClick={() => patchElement(current.id, { shape })}
                          />
                        );
                      })}
                      <Chip
                        active={current.outline === true}
                        label="Garis tepi"
                        onClick={() => patchElement(current.id, { outline: !current.outline })}
                      />
                    </div>
                  </Group>
                ) : null}

                <Group label="Warna">
                  <div className="flex flex-wrap gap-1.5">
                    {COVER_INKS.map((ink) => (
                      <button
                        key={ink.id}
                        type="button"
                        aria-label={ink.label}
                        title={ink.label}
                        data-active={current.color === ink.id}
                        className="h-7 w-7 rounded-full border border-line data-[active=true]:ring-2 data-[active=true]:ring-accent data-[active=true]:ring-offset-1"
                        style={{ background: swatch(ink.id) }}
                        onClick={() => patchElement(current.id, { color: ink.id })}
                      />
                    ))}
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-[12.5px] text-ink-soft">
                    <input
                      type="color"
                      value={swatch(current.color)}
                      className="h-7 w-10 rounded border border-line bg-surface"
                      onChange={(event) =>
                        patchElement(current.id, { color: event.target.value })
                      }
                    />
                    Warna sendiri
                  </label>
                  <Note>
                    Warna palet ikut berganti kalau paletnya diganti; warna sendiri tetap, dan
                    dicetak sebagai campuran CMYK terdekat.
                  </Note>
                </Group>

                <Group label="Susunan & posisi">
                  <div className="flex flex-wrap gap-1.5">
                    <Chip active={false} label="Ke depan" onClick={() => restack(current.id, 'up')} />
                    <Chip
                      active={false}
                      label="Ke belakang"
                      onClick={() => restack(current.id, 'down')}
                    />
                    <Chip
                      active={false}
                      label="Paling depan"
                      onClick={() => restack(current.id, 'front')}
                    />
                    <Chip
                      active={false}
                      label="Paling belakang"
                      onClick={() => restack(current.id, 'back')}
                    />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Chip
                      active={false}
                      label="Tengah mendatar"
                      onClick={() => centre(current.id, 'x')}
                    />
                    <Chip
                      active={false}
                      label="Tengah menurun"
                      onClick={() => centre(current.id, 'y')}
                    />
                    <Chip active={false} label="Duplikat" onClick={() => duplicate(current.id)} />
                  </div>
                  <Note>
                    Bentuk selalu tercetak di belakang huruf dan teks — itu yang menjaga judul tetap
                    terbaca berapa pun hiasan yang ditumpuk.
                  </Note>
                </Group>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

/** The element list, and the inspector heading, in words a seller recognises. */
function labelOf(element: CoverElement): string {
  if (element.kind === 'text') {
    const source = element.source ?? 'custom';
    if (source === 'title') return 'Judul produk';
    if (source === 'brand') return 'Nama toko';
    if (source === 'tagline') return 'Tagline';
    return element.text?.slice(0, 24) || 'Teks bebas';
  }
  if (element.kind === 'sample') return element.trace ? 'Huruf titik-titik' : 'Huruf contoh';
  const seed = ELEMENT_SEEDS.find((item) => item.make().shape === element.shape);
  return seed?.label ?? 'Bentuk';
}

/** The element list as it was before a drag, for the undo stack. */
function replace(elements: CoverElement[], original: CoverElement): CoverElement[] {
  return elements.map((element) => (element.id === original.id ? original : element));
}
