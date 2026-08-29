'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GenerateBar, type Progress } from './GenerateBar';
import { Logo } from './Logo';
import { PreviewDeck } from './PreviewDeck';
import { SettingsPanel } from './SettingsPanel';
import { ChevronIcon, Spinner } from './diagrams';
import { buildCharacters, validate } from '@/lib/charset';
import { downloadFile, downloadZip } from '@/lib/download';
import { loadFont, prefetchFont } from '@/lib/fontStore';
import { planDocument } from '@/lib/geometry';
import type { GeneratedFile } from '@/lib/pdf';
import { DEFAULT_CONFIG, FONT_ORDER, LAYOUTS, STYLES, papersFor } from '@/lib/presets';
import type { PaperSpec } from '@/lib/presets';
import type { Config, LoadedFont } from '@/lib/types';

function summarise(config: Config, characters: string[]): string {
  const content =
    config.content === 'letters'
      ? config.letterCase === 'upper'
        ? 'A–Z'
        : config.letterCase === 'lower'
          ? 'a–z'
          : 'Aa–Zz'
      : `${characters[0] ?? ''}–${characters[characters.length - 1] ?? ''}`;
  const style = STYLES.find((item) => item.id === config.style)?.label ?? '';
  const layout = LAYOUTS.find((item) => item.id === config.layout)?.label ?? '';
  const paper = papersFor(config.paper).map((item) => item.label).join(' + ');
  return `${content} · ${style} · ${layout} · ${paper}`;
}

export function App() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [font, setFont] = useState<LoadedFont | null>(null);
  const [fontError, setFontError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [previewPaperId, setPreviewPaperId] = useState<PaperSpec['id']>('a4');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);

  const update = useCallback((patch: Partial<Config>) => {
    setConfig((previous) => ({ ...previous, ...patch }));
  }, []);

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
  }, [config]);

  const characters = useMemo(() => buildCharacters(config), [config]);
  const issues = useMemo(() => validate(config), [config]);
  const papers = useMemo(() => papersFor(config.paper), [config.paper]);

  const previewPaper = useMemo(
    () => papers.find((paper) => paper.id === previewPaperId) ?? papers[0],
    [papers, previewPaperId],
  );

  const plans = useMemo(() => {
    if (!font || !previewPaper) return [];
    return planDocument({ font, config, paper: previewPaper, characters });
  }, [font, config, previewPaper, characters]);

  const onGenerate = useCallback(async () => {
    if (!font || !characters.length) return;
    const id = runId.current + 1;
    runId.current = id;
    setBusy(true);
    setError(null);
    setFiles([]);
    setProgress({ done: 0, total: characters.length * papers.length });
    try {
      // pdf-lib is the heaviest dependency here and is only needed once the
      // user actually asks for output, so it stays out of the first load.
      const { generate } = await import('@/lib/pdf');
      const result = await generate({
        font,
        config,
        characters,
        onProgress: (done, total) => {
          if (runId.current === id) setProgress({ done, total });
        },
      });
      if (runId.current === id) setFiles(result);
    } catch (cause) {
      if (runId.current === id) {
        setError(cause instanceof Error ? cause.message : 'Gagal membuat PDF.');
      }
    } finally {
      if (runId.current === id) {
        setBusy(false);
        setProgress(null);
      }
    }
  }, [font, config, characters, papers.length]);

  const onDownloadAll = useCallback(() => {
    const stem = files[0]?.name.replace(/-(a4|letter)\.pdf$/, '') ?? 'doodlegen';
    void downloadZip(files, `${stem}.zip`);
  }, [files]);

  const summary = summarise(config, characters);
  const ready = Boolean(font) && characters.length > 0;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-paper">
      <header className="z-30 shrink-0 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <span className="hidden text-[12px] text-ink-mute sm:inline">
            Generator halaman mewarnai dan tracing
          </span>
          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            aria-expanded={panelOpen}
            aria-controls="settings-panel"
            className="btn-quiet ml-auto lg:hidden"
          >
            <span className="max-w-[38vw] truncate">{panelOpen ? 'Tutup' : 'Pengaturan'}</span>
            <span className={`transition-transform duration-200 ${panelOpen ? 'rotate-180' : ''}`}>
              <ChevronIcon direction="down" />
            </span>
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside
          id="settings-panel"
          className={`shrink-0 overflow-y-auto border-line bg-surface transition-[max-height] duration-300 ease-out
            lg:max-h-none lg:w-[380px] lg:border-r xl:w-[420px]
            ${panelOpen ? 'max-h-[52vh] border-b' : 'max-h-0 lg:max-h-none'}`}
        >
          <SettingsPanel config={config} update={update} />
          {issues.length ? (
            <div className="mx-5 mb-6 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2.5">
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
                Tidak ada karakter untuk dibuat. Sesuaikan rentang pada langkah 01.
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
        pageCount={characters.length}
        busy={busy}
        progress={progress}
        files={files}
        error={error}
        disabled={!ready}
        onGenerate={onGenerate}
        onDownload={downloadFile}
        onDownloadAll={onDownloadAll}
      />
    </div>
  );
}
