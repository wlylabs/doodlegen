'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommandPalette, type Command } from './CommandPalette';
import { ExportDialog } from './ExportDialog';
import { GenerateBar, type Progress } from './GenerateBar';
import { InstallButton } from './InstallPrompt';
import { Logo } from './Logo';
import { PreviewDeck } from './PreviewDeck';
import { PresetRail, SettingsPanel } from './SettingsPanel';
import { ShortcutsDialog } from './ShortcutsDialog';
import { ThemeToggle, setTheme } from './Theme';
import {
  CheckIcon,
  ChevronIcon,
  DownloadIcon,
  GenerateIcon,
  HomeIcon,
  KeyboardIcon,
  KitIcon,
  LinkIcon,
  MoonIcon,
  SearchIcon,
  ShareIcon,
  SlidersIcon,
  SparkIcon,
  Spinner,
  SunIcon,
  SystemIcon,
} from './diagrams';
import { useCopy, useModifierLabel, useRipple } from './motion';
import { toastError, toastSuccess } from '@/lib/toast';
import { buildCharacters, validate } from '@/lib/charset';
import { IMAGE_SPECS, renderListingImages, type GeneratedImage } from '@/lib/cover';
import { downloadBlob, downloadFile, downloadZip, sharePdfs } from '@/lib/download';
import { loadFont, prefetchFont } from '@/lib/fontStore';
import { pageCountOf, planDocument } from '@/lib/geometry';
import { printedTitle } from '@/lib/naming';
import type { GeneratedFile } from '@/lib/pdf';
import {
  DEFAULT_CONFIG,
  FONT_ORDER,
  LAYOUTS,
  STARTER_PRESETS,
  STYLES,
  papersFor,
} from '@/lib/presets';
import type { PaperSpec } from '@/lib/presets';
import {
  autoFromLocation,
  clearAutoFlag,
  configFromLocation,
  loadStoredConfig,
  presetFromLocation,
  shareUrl,
  storeConfig,
} from '@/lib/share';
import type { Config, LoadedFont } from '@/lib/types';

function summarise(config: Config, characters: string[]): string {
  const content =
    config.content === 'letters'
      ? config.letterCase === 'upper'
        ? 'A–Z'
        : config.letterCase === 'lower'
          ? 'a–z'
          : 'Aa–Zz'
      : config.content === 'numbers'
        ? `${characters[0] ?? ''}–${characters[characters.length - 1] ?? ''}`
        : `${characters.length} kata`;
  const style = STYLES.find((item) => item.id === config.style)?.label ?? '';
  const layout = LAYOUTS.find((item) => item.id === config.layout)?.label ?? '';
  const paper = papersFor(config.paper).map((item) => item.label).join(' + ');
  return `${content} · ${style} · ${layout} · ${paper}`;
}

/** Which starter pack, if any, the current settings still match. */
function activePresetId(config: Config): string | null {
  for (const preset of STARTER_PRESETS) {
    const patch = preset.patch as Partial<Config>;
    const matches = (Object.keys(patch) as (keyof Config)[]).every((key) => config[key] === patch[key]);
    if (matches) return preset.id;
  }
  return null;
}

export function App() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [font, setFont] = useState<LoadedFont | null>(null);
  const [fontError, setFontError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [previewPaperId, setPreviewPaperId] = useState<PaperSpec['id']>('a4');
  const [busy, setBusy] = useState(false);
  const [bundling, setBundling] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [kitOpen, setKitOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const settings = useRef<HTMLElement>(null);
  const { copied, copy } = useCopy();
  const ripple = useRipple<HTMLButtonElement>();
  const modifier = useModifierLabel();

  const update = useCallback((patch: Partial<Config>) => {
    setConfig((previous) => ({ ...previous, ...patch }));
  }, []);

  // A link wins over the last local session, so a shared setup — or a starter
  // pack picked on the landing page — always opens as it was sent.
  useEffect(() => {
    const preset = STARTER_PRESETS.find((item) => item.id === presetFromLocation());
    const patch = {
      ...loadStoredConfig(),
      ...(preset ? { ...DEFAULT_CONFIG, ...preset.patch } : {}),
      ...configFromLocation(),
    };
    if (Object.keys(patch).length) setConfig((previous) => ({ ...previous, ...patch }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => storeConfig(config), 400);
    return () => clearTimeout(timer);
  }, [config]);

  // Load the selected face, and warm the others so switching stays instant.
  useEffect(() => {
    let alive = true;
    setFontError(null);
    loadFont(config.font)
      .then((loaded) => {
        if (alive) setFont(loaded);
      })
      .catch((cause: Error) => {
        if (alive) setFontError(cause.message);
      });
    return () => {
      alive = false;
    };
  }, [config.font]);

  useEffect(() => {
    const timer = setTimeout(() => FONT_ORDER.forEach(prefetchFont), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Any settings change invalidates an earlier render.
  useEffect(() => {
    setFiles([]);
    setError(null);
    setImages((previous) => {
      previous.forEach((image) => URL.revokeObjectURL(image.url));
      return [];
    });
  }, [config]);

  useEffect(() => () => abort.current?.abort(), []);

  const characters = useMemo(() => buildCharacters(config), [config]);
  const issues = useMemo(() => validate(config), [config]);
  const blocked = useMemo(() => issues.some((issue) => issue.kind === 'error'), [issues]);
  const papers = useMemo(() => papersFor(config.paper), [config.paper]);
  const presetId = useMemo(() => activePresetId(config), [config]);

  const previewPaper = useMemo(
    () => papers.find((paper) => paper.id === previewPaperId) ?? papers[0],
    [papers, previewPaperId],
  );

  const plans = useMemo(() => {
    if (!font || !previewPaper) return [];
    return planDocument({ font, config, paper: previewPaper, characters });
  }, [font, config, previewPaper, characters]);

  const ready = Boolean(font) && characters.length > 0;

  const build = useCallback(
    async (withKit: boolean) => {
      if (!font || !characters.length) return null;
      const id = runId.current + 1;
      runId.current = id;
      const controller = new AbortController();
      abort.current = controller;

      const pagesPerFile = pageCountOf(config, characters);
      setBusy(true);
      setError(null);
      setFiles([]);
      setProgress({ done: 0, total: pagesPerFile * papers.length, label: 'Menyusun halaman' });

      try {
        // pdf-lib is the heaviest dependency here and is only needed once the
        // user actually asks for output, so it stays out of the first load.
        const { generate } = await import('@/lib/pdf');
        const result = await generate({
          font,
          config,
          characters,
          signal: controller.signal,
          onProgress: (done, total) => {
            if (runId.current === id) setProgress({ done, total, label: 'Menyusun halaman' });
          },
        });
        if (runId.current !== id) return null;
        setFiles(result);

        if (!withKit) return { files: result, images: [] as GeneratedImage[] };

        setProgress({ done: 0, total: IMAGE_SPECS.length, label: 'Menggambar listing' });
        const rendered = await renderListingImages({
          font,
          config,
          characters,
          signal: controller.signal,
          onProgress: (done, total) => {
            if (runId.current === id) setProgress({ done, total, label: 'Menggambar listing' });
          },
        });
        if (runId.current !== id) {
          rendered.forEach((image) => URL.revokeObjectURL(image.url));
          return null;
        }
        setImages(rendered);
        return { files: result, images: rendered };
      } catch (cause) {
        if (runId.current === id) {
          const aborted = cause instanceof DOMException && cause.name === 'AbortError';
          const message = aborted
            ? 'Dibatalkan.'
            : cause instanceof Error
              ? cause.message
              : 'Gagal membuat PDF.';
          setError(message);
          // The bar says it too, but the eye that asked for this is on the
          // preview or the panel, not on the line under the summary.
          if (!aborted) toastError(message);
        }
        return null;
      } finally {
        if (runId.current === id) {
          setBusy(false);
          setProgress(null);
          abort.current = null;
        }
      }
    },
    [font, config, characters, papers.length],
  );

  const onGenerate = useCallback(() => {
    void build(false);
  }, [build]);

  const onExportKit = useCallback(async () => {
    const result = await build(true);
    if (result) setKitOpen(true);
  }, [build]);

  const onCancel = useCallback(() => {
    abort.current?.abort();
  }, []);

  const onDownloadAll = useCallback(() => {
    const stem = files[0]?.name.replace(/-(a4|letter)\.pdf$/, '') ?? 'doodlegen';
    void downloadZip(files, `${stem}.zip`);
  }, [files]);

  const onDownloadBundle = useCallback(async () => {
    if (!files.length || !font) return;
    setBundling(true);
    try {
      const { buildBundle } = await import('@/lib/bundle');
      const bundle = await buildBundle({ config, characters, files, images, font });
      downloadBlob(bundle.blob, bundle.name);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Gagal menyiapkan ZIP.';
      setError(message);
      toastError(message);
    } finally {
      setBundling(false);
    }
  }, [config, characters, files, images, font]);

  /**
   * The setup as a link. Copying is silent by nature — the clipboard gives no
   * sign it took anything — so the confirmation is the whole point, and it is
   * said in the one place the app says everything else.
   */
  const onCopyLink = useCallback(async () => {
    const ok = await copy(shareUrl(config), 'share');
    if (ok) toastSuccess('Tautan setelan disalin.');
    else toastError('Peramban menolak akses papan klip.');
  }, [config, copy]);

  /**
   * One action, because the intent behind it is the same either way: send this
   * pack. Where the device can hand over the files themselves it does, and the
   * seller never sees a link; everywhere else the link that rebuilds them is
   * the next best thing, so the button is never the one that does nothing.
   */
  const onShare = useCallback(async () => {
    if (files.length && (await sharePdfs(files)) !== 'unavailable') return;
    void onCopyLink();
  }, [files, onCopyLink]);

  /*
   * A link sent with the setup in it should arrive as the pack, not as a form
   * with a Generate button on it. Ordering is safe without a guard of its own:
   * `ready` waits on a font that resolves a microtask after mount at the very
   * earliest, by which time the effect above has applied the link's settings.
   * The flag is cleared as it fires, so this runs once and a reload is quiet.
   */
  const autoBuilt = useRef(false);
  useEffect(() => {
    if (autoBuilt.current || !ready || busy || blocked || !autoFromLocation()) return;
    autoBuilt.current = true;
    clearAutoFlag();
    void build(false);
  }, [ready, busy, blocked, build]);

  /**
   * Puts the cursor in the settings.
   *
   * Not a toggle, because the same key has to mean something at both sizes:
   * below `lg` the panel is a sheet and has to be opened first, above it the
   * panel is already on screen and the only thing left to do is go there. A
   * toggle would be a key that visibly does nothing on a desktop.
   */
  const focusSettings = useCallback(() => {
    if (window.matchMedia('(max-width: 1023.98px)').matches) setPanelOpen(true);
    // A sheet that was closed is `visibility: hidden`, and nothing inside it
    // can take focus until the class has come off — which is after this
    // render, not during it.
    window.requestAnimationFrame(() => {
      settings.current
        ?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        ?.focus();
    });
  }, []);

  /*
   * Escape closes the sheet — but only when the sheet is what is on top. A
   * modal dialog answers Escape itself, and the keydown it raises on its way
   * out still reaches a window listener, which would otherwise close the
   * panel behind it at the same time.
   */
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (paletteOpen || shortcutsOpen || kitOpen) return;
      setPanelOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen, paletteOpen, shortcutsOpen, kitOpen]);

  /*
   * The keyboard.
   *
   * Two rules keep this from firing while someone is typing a word list: a
   * plain key never does anything if the event came from a field, and every
   * modified combination is one the browser does not already own.
   */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '');

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (ready && !busy) onGenerate();
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === '?') {
        event.preventDefault();
        setShortcutsOpen(true);
      } else if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        focusSettings();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onGenerate, focusSettings, ready, busy]);

  /*
   * Everything the studio can do, in one list.
   *
   * A command that cannot run right now is listed and disabled rather than
   * hidden: a palette whose contents change shape between openings cannot be
   * learned, and "Kit marketplace, greyed out" answers the question "why is
   * nothing happening" that a missing row leaves open.
   */
  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [
      {
        id: 'generate',
        group: 'Aksi',
        label: files.length ? 'Generate ulang PDF' : 'Generate PDF',
        keywords: 'buat bikin pdf render cetak',
        hint: `${modifier} ↵`,
        icon: <GenerateIcon />,
        disabled: !ready || blocked || busy,
        run: onGenerate,
      },
      {
        id: 'kit',
        group: 'Aksi',
        label: 'Buat kit marketplace',
        keywords: 'listing etsy gumroad shopee gambar deskripsi zip',
        icon: <KitIcon />,
        disabled: !ready || blocked || busy,
        run: () => void onExportKit(),
      },
      {
        id: 'cancel',
        group: 'Aksi',
        label: 'Batalkan proses',
        keywords: 'stop hentikan',
        disabled: !busy,
        run: onCancel,
      },
      {
        id: 'copy-link',
        group: 'Berbagi',
        label: 'Salin tautan setelan',
        keywords: 'share bagikan url link',
        icon: <LinkIcon />,
        run: () => void onCopyLink(),
      },
      {
        id: 'send',
        group: 'Berbagi',
        label: 'Kirim berkas hasil',
        keywords: 'share bagikan whatsapp email',
        icon: <ShareIcon />,
        disabled: !files.length,
        run: () => void onShare(),
      },
      {
        id: 'zip',
        group: 'Berbagi',
        label: 'Unduh semua sebagai ZIP',
        keywords: 'download simpan',
        icon: <DownloadIcon />,
        disabled: files.length < 2,
        run: onDownloadAll,
      },
      {
        id: 'open-kit',
        group: 'Berbagi',
        label: 'Buka kit listing',
        keywords: 'deskripsi tag gambar',
        icon: <KitIcon />,
        disabled: !images.length,
        run: () => setKitOpen(true),
      },
    ];

    for (const preset of STARTER_PRESETS) {
      list.push({
        id: `preset-${preset.id}`,
        group: 'Mulai cepat',
        label: preset.label,
        keywords: `${preset.note} ${preset.market} preset`,
        hint: preset.id === presetId ? 'dipakai' : undefined,
        icon: <SparkIcon />,
        run: () => update(preset.patch),
      });
    }

    list.push(
      {
        id: 'panel',
        group: 'Tampilan',
        label: 'Ke panel pengaturan',
        keywords: 'setelan panel opsi buka',
        hint: 'S',
        icon: <SlidersIcon />,
        run: focusSettings,
      },
      {
        id: 'theme-light',
        group: 'Tampilan',
        label: 'Tema terang',
        keywords: 'light mode warna',
        icon: <SunIcon />,
        run: () => setTheme('light'),
      },
      {
        id: 'theme-dark',
        group: 'Tampilan',
        label: 'Tema gelap',
        keywords: 'dark mode malam warna',
        icon: <MoonIcon />,
        run: () => setTheme('dark'),
      },
      {
        id: 'theme-system',
        group: 'Tampilan',
        label: 'Tema ikuti sistem',
        keywords: 'auto otomatis',
        icon: <SystemIcon />,
        run: () => setTheme('system'),
      },
      {
        id: 'shortcuts',
        group: 'Bantuan',
        label: 'Pintasan papan ketik',
        keywords: 'keyboard shortcut tombol',
        hint: '?',
        icon: <KeyboardIcon />,
        run: () => setShortcutsOpen(true),
      },
      {
        id: 'home',
        group: 'Bantuan',
        label: 'Ke beranda',
        keywords: 'landing depan tentang',
        icon: <HomeIcon />,
        run: () => {
          window.location.href = '/';
        },
      },
    );

    return list;
  }, [
    files.length,
    images.length,
    ready,
    blocked,
    busy,
    presetId,
    onGenerate,
    onExportKit,
    onCancel,
    focusSettings,
    onCopyLink,
    onShare,
    onDownloadAll,
    update,
    modifier,
  ]);

  const summary = summarise(config, characters);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-paper">
      {/*
       * A flat white bar with one hairline under it. The old chrome carried a
       * stamped accent rule across the top; on a neutral ground that is the
       * loudest thing on screen, and it is competing with the one button that
       * actually does something.
       */}
      <header className="z-30 shrink-0 border-b border-line bg-surface/90 backdrop-blur px-safe">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/" className="press rounded-lg" aria-label="Ke beranda DoodleGen">
            <Logo />
          </Link>
          <span className="hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
          {/* What is on the bench, named the way a document is named. */}
          <span className="hidden min-w-0 truncate text-[13px] font-medium text-ink-soft sm:inline">
            {printedTitle(config, characters)}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {/* Renders nothing unless this browser has an install to offer. */}
            <InstallButton compact />

            {/*
             * A studio is looked at for an hour at a time, which is exactly
             * where the ground being wrong for the room starts to matter. The
             * strip is dropped on the narrowest screens, where the bar is
             * already carrying the share and settings controls.
             */}
            <ThemeToggle className="hidden md:inline-flex" />

            {/*
             * The way into everything the bar has no room for. It is drawn as
             * a search field rather than a button because that is the shape
             * the gesture has: a box you type into. On a phone it collapses to
             * its glyph, where the keyboard behind it is hypothetical anyway.
             */}
            <button
              type="button"
              className="btn-quiet !gap-2 sm:!pr-2"
              aria-label="Buka daftar perintah"
              aria-keyshortcuts="Meta+K Control+K"
              onClick={(event) => {
                ripple(event);
                setPaletteOpen(true);
              }}
            >
              <SearchIcon />
              <span className="hidden text-ink-mute sm:inline">Perintah</span>
              <kbd className="kbd hidden sm:inline-flex">{modifier} K</kbd>
            </button>

            <button
              type="button"
              className="btn-quiet"
              onClick={(event) => {
                ripple(event);
                void onCopyLink();
              }}
            >
              <span className={copied === 'share' ? 'text-accent' : ''}>
                {copied === 'share' ? <CheckIcon /> : <LinkIcon />}
              </span>
              <span className="hidden lg:inline">
                {copied === 'share' ? 'Tautan disalin' : 'Bagikan setelan'}
              </span>
            </button>

            <button
              type="button"
              onClick={(event) => {
                ripple(event);
                setPanelOpen((open) => !open);
              }}
              aria-expanded={panelOpen}
              aria-controls="settings-panel"
              className="btn-quiet lg:hidden"
            >
              <SlidersIcon />
              <span className="hidden max-w-[22vw] truncate sm:inline">
                {panelOpen ? 'Tutup' : 'Pengaturan'}
              </span>
              <span className={`transition-transform duration-300 ${panelOpen ? 'rotate-180' : ''}`}>
                <ChevronIcon direction="down" />
              </span>
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/*
         * Under `lg` the settings are a bottom sheet rather than a drawer that
         * pushes the proof up the screen. It is what the same control is on
         * every phone: it comes up over the work, it is dismissed by the
         * scrim, by Escape or by the bar it came from, and the page behind it
         * holds still while it is up. Above `lg` none of this applies and it
         * is a column again.
         */}
        <div
          aria-hidden="true"
          onClick={() => setPanelOpen(false)}
          className={`fixed inset-0 z-30 bg-overlay backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
            panelOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        />

        <aside
          ref={settings}
          id="settings-panel"
          aria-label="Pengaturan paket"
          className={`fixed inset-x-0 bottom-0 z-40 flex max-h-[86dvh] flex-col rounded-t-2xl border-t border-line
            bg-surface shadow-pop transition-[transform,visibility] duration-300 ease-out will-change-transform pb-safe
            lg:static lg:z-auto lg:max-h-none lg:w-[392px] lg:translate-y-0 lg:rounded-none lg:border-r
            lg:border-t-0 lg:pb-0 lg:shadow-none lg:visible xl:w-[428px]
            ${panelOpen ? 'translate-y-0' : 'invisible translate-y-full'}`}
        >
          {/* The grab bar every sheet on a phone has. Decorative — the sheet
              is not draggable — but it is what marks the edge as a handle. */}
          <span aria-hidden="true" className="sheet-grip" />

          <div className="rail min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <PresetRail
              activeId={presetId}
              onApply={(id) => {
                const preset = STARTER_PRESETS.find((item) => item.id === id);
                if (preset) update(preset.patch);
              }}
            />
            <SettingsPanel config={config} font={font} update={update} />
            {issues.length ? (
              <div className="mx-5 mb-6 animate-fade-up rounded-xl border border-accent-line bg-accent-soft px-3.5 py-3">
                {issues.map((issue) => (
                  <p key={issue.message} className="text-[12.5px] leading-snug text-accent-ink">
                    {issue.message}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </aside>

        <section className="min-h-0 min-w-0 flex-1 bg-sunk">
          {fontError ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-[13px] text-ink-soft">{fontError}</p>
            </div>
          ) : !font || !previewPaper ? (
            <div className="flex h-full items-center justify-center gap-2 text-ink-mute">
              <Spinner />
              <p className="text-[13px]">Memuat font…</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-[13px] text-ink-soft">
                Tidak ada karakter untuk dibuat. Sesuaikan isi pada langkah 01.
              </p>
            </div>
          ) : (
            <PreviewDeck
              plans={plans}
              paper={previewPaper}
              font={font}
              config={config}
              papers={papers}
              activePaper={previewPaper}
              onPaperChange={(paper) => setPreviewPaperId(paper.id)}
              compact={panelOpen}
            />
          )}
        </section>
      </main>

      <GenerateBar
        summary={summary}
        pageCount={pageCountOf(config, characters)}
        busy={busy}
        progress={progress}
        files={files}
        images={images}
        error={error}
        disabled={!ready || blocked}
        onGenerate={onGenerate}
        onExportKit={() => void onExportKit()}
        onCancel={onCancel}
        onDownload={downloadFile}
        onDownloadAll={onDownloadAll}
        onOpenKit={() => setKitOpen(true)}
        onShare={() => void onShare()}
        shareCopied={copied === 'share'}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />

      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        groups={[
          {
            title: 'Umum',
            items: [
              { keys: [modifier, 'K'], label: 'Buka daftar perintah' },
              { keys: ['?'], label: 'Pintasan papan ketik' },
              { keys: ['Esc'], label: 'Tutup panel atau dialog' },
            ],
          },
          {
            title: 'Studio',
            items: [
              { keys: [modifier, '↵'], label: 'Generate PDF' },
              { keys: ['S'], label: 'Ke panel pengaturan' },
            ],
          },
          {
            title: 'Di dalam daftar perintah',
            items: [
              { keys: ['↑', '↓'], label: 'Pindah pilihan' },
              { keys: ['↵'], label: 'Jalankan' },
            ],
          },
        ]}
      />

      <ExportDialog
        open={kitOpen && files.length > 0}
        config={config}
        characters={characters}
        files={files}
        images={images}
        bundling={bundling}
        onClose={() => setKitOpen(false)}
        onDownloadImage={(image) =>
          downloadBlob(new Blob([new Uint8Array(image.bytes)], { type: 'image/png' }), image.name)
        }
        onDownloadBundle={() => void onDownloadBundle()}
      />
    </div>
  );
}
