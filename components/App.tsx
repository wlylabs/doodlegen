'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CoverStudio } from './CoverStudio';
import { ExportDialog } from './ExportDialog';
import { GenerateBar, type Progress } from './GenerateBar';
import { InstallButton } from './InstallPrompt';
import { Logo } from './Logo';
import { PreviewDeck } from './PreviewDeck';
import { PresetRail, SettingsPanel } from './SettingsPanel';
import { CheckIcon, ChevronIcon, LinkIcon, Spinner } from './diagrams';
import { useCopy, useRipple } from './motion';
import { buildCharacters, validate } from '@/lib/charset';
import { renderListingImages, type GeneratedImage } from '@/lib/cover';
import { downloadBlob, downloadFile, downloadZip } from '@/lib/download';
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
  const [studioOpen, setStudioOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const { copied, copy } = useCopy();
  const ripple = useRipple<HTMLButtonElement>();

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

        setProgress({ done: 0, total: 4, label: 'Menggambar listing' });
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
          setError(aborted ? 'Dibatalkan.' : cause instanceof Error ? cause.message : 'Gagal membuat PDF.');
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
      setError(cause instanceof Error ? cause.message : 'Gagal menyiapkan ZIP.');
    } finally {
      setBundling(false);
    }
  }, [config, characters, files, images, font]);

  const onShare = useCallback(() => {
    void copy(shareUrl(config), 'share');
  }, [config, copy]);

  // The one shortcut worth having: build without reaching for the mouse.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && ready && !busy) {
        event.preventDefault();
        onGenerate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onGenerate, ready, busy]);

  const summary = summarise(config, characters);
  const blocked = issues.some((issue) => issue.kind === 'error');

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-paper">
      <header className="z-30 shrink-0 border-b border-line bg-surface px-safe">
        {/* The one line of colour in the chrome: a press bar across the top,
            so the app is stamped rather than merely bordered. */}
        <div className="h-[3px] bg-accent" aria-hidden="true" />
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="press rounded-lg" aria-label="Ke beranda DoodleGen">
            <Logo />
          </Link>
          <span className="hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
          <span className="hidden min-w-0 truncate text-[12.5px] font-medium text-ink-soft sm:inline">
            {printedTitle(config, characters)}
          </span>

          <div className="ml-auto flex items-center gap-3">
            {/* Renders nothing unless this browser has an install to offer. */}
            <InstallButton compact />

            <button
              type="button"
              className="btn-quiet"
              onClick={(event) => {
                ripple(event);
                onShare();
              }}
            >
              <span className={copied === 'share' ? 'text-accent' : ''}>
                {copied === 'share' ? <CheckIcon /> : <LinkIcon />}
              </span>
              <span className="hidden sm:inline">
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
              <span className="max-w-[30vw] truncate">{panelOpen ? 'Tutup' : 'Pengaturan'}</span>
              <span className={`transition-transform duration-300 ${panelOpen ? 'rotate-180' : ''}`}>
                <ChevronIcon direction="down" />
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside
          id="settings-panel"
          className={`shrink-0 overflow-y-auto border-line bg-surface transition-[max-height] duration-300 ease-out
            lg:max-h-none lg:w-[380px] lg:border-r xl:w-[420px]
            ${panelOpen ? 'max-h-[60vh] border-b' : 'max-h-0 lg:max-h-none'}`}
        >
          <PresetRail
            activeId={presetId}
            onApply={(id) => {
              const preset = STARTER_PRESETS.find((item) => item.id === id);
              if (preset) update(preset.patch);
            }}
          />
          <SettingsPanel
            config={config}
            font={font}
            update={update}
            onOpenCoverStudio={() => setStudioOpen(true)}
          />
          {issues.length ? (
            <div className="mx-5 mb-6 animate-fade-up rounded-xl border border-accent/30 bg-accent-soft px-3 py-2.5">
              {issues.map((issue) => (
                <p key={issue.message} className="text-[12px] leading-snug text-accent-hover">
                  {issue.message}
                </p>
              ))}
            </div>
          ) : null}
        </aside>

        <section className="min-h-0 min-w-0 flex-1 bg-paper">
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
      />

      {previewPaper ? (
        <CoverStudio
          open={studioOpen}
          config={config}
          font={font}
          paper={previewPaper}
          characters={characters}
          update={update}
          onClose={() => setStudioOpen(false)}
        />
      ) : null}

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
