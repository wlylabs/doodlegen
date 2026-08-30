'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PageSheet } from './PageSheet';
import { ChevronIcon } from './diagrams';
import type { PaperSpec } from '@/lib/presets';
import type { Config, LoadedFont, PagePlan } from '@/lib/types';

/** Slides beyond this distance from the viewport render as a blank sheet. */
const WINDOW = 2;

export function PreviewDeck({
  plans,
  paper,
  font,
  config,
  papers,
  activePaper,
  onPaperChange,
  compact = false,
}: {
  plans: PagePlan[];
  paper: PaperSpec;
  font: LoadedFont;
  config: Config;
  papers: PaperSpec[];
  activePaper: PaperSpec;
  onPaperChange: (paper: PaperSpec) => void;
  /** Drops the chrome so the sheet itself stays visible in tight space. */
  compact?: boolean;
}) {
  const deckRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [showSafeArea, setShowSafeArea] = useState(false);

  const total = plans.length;
  const current = Math.min(index, Math.max(0, total - 1));

  const scrollTo = useCallback((next: number) => {
    const deck = deckRef.current;
    if (!deck) return;
    deck.scrollTo({ left: next * deck.clientWidth, behavior: 'smooth' });
  }, []);

  const onScroll = useCallback(() => {
    const deck = deckRef.current;
    if (!deck || deck.clientWidth === 0) return;
    const next = Math.round(deck.scrollLeft / deck.clientWidth);
    setIndex((current) => (current === next ? current : next));
  }, []);

  // A changed setting can shorten the set; keep the deck inside its bounds.
  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;
    if (index > total - 1) {
      deck.scrollTo({ left: 0 });
      setIndex(0);
    }
  }, [total, index]);

  const label = plans[current]?.label ?? '';

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <header
        className={`${compact ? 'hidden lg:flex' : 'flex'} z-10 flex-wrap items-center gap-3 border-b border-line
                    bg-surface px-4 py-2.5 sm:px-6`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="step-mark">05</span>
          <h2 className="text-[15px] font-semibold tracking-tight">Pratinjau</h2>
          {/* The slug a proof carries: what this sheet is, in the units a
              printer works in. */}
          <p className="spec hidden truncate lg:block">
            {activePaper.label} · {activePaper.note} · {Math.round(activePaper.widthPt)} ×{' '}
            {Math.round(activePaper.heightPt)} pt
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {papers.length > 1 ? (
            /* A segmented control, because the two papers are one choice. */
            <div
              role="radiogroup"
              aria-label="Ukuran kertas pratinjau"
              className="flex rounded-full border border-line bg-sunk p-0.5"
            >
              {papers.map((item) => {
                const on = item.id === activePaper.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`press rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors duration-150 ${
                      on ? 'bg-surface text-ink shadow-xs' : 'text-ink-mute hover:text-ink'
                    }`}
                    onClick={() => onPaperChange(item)}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          <button
            type="button"
            role="switch"
            aria-checked={showSafeArea}
            data-active={showSafeArea}
            className="chip !py-1 !text-[12.5px]"
            onClick={() => setShowSafeArea((value) => !value)}
          >
            Area aman
          </button>
        </div>
      </header>

      <div
        ref={deckRef}
        onScroll={onScroll}
        tabIndex={0}
        role="group"
        aria-label="Halaman pratinjau"
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') scrollTo(Math.min(current + 1, total - 1));
          if (event.key === 'ArrowLeft') scrollTo(Math.max(current - 1, 0));
        }}
        className="deck rail bench flex min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
      >
        {plans.map((plan, position) => (
          <div
            key={`${plan.label}-${position}`}
            className="flex h-full w-full shrink-0 items-center justify-center p-6 sm:p-10"
          >
            <div
              className="trim h-full max-h-full bg-white shadow-proof"
              style={{ aspectRatio: `${paper.widthPt} / ${paper.heightPt}` }}
            >
              <span className="trim-alt" aria-hidden="true" />
              {Math.abs(position - current) <= WINDOW ? (
                <PageSheet
                  plan={plan}
                  paper={paper}
                  font={font}
                  config={config}
                  showSafeArea={showSafeArea}
                  className="h-full w-full"
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <footer
        className={`${compact ? 'hidden lg:block' : 'block'} min-w-0 border-t border-line bg-surface px-4 py-2.5 sm:px-6`}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-quiet !rounded-full !px-2.5"
            onClick={() => scrollTo(Math.max(current - 1, 0))}
            disabled={current === 0}
            aria-label="Halaman sebelumnya"
          >
            <ChevronIcon direction="left" />
          </button>
          <button
            type="button"
            className="btn-quiet !rounded-full !px-2.5"
            onClick={() => scrollTo(Math.min(current + 1, total - 1))}
            disabled={current >= total - 1}
            aria-label="Halaman berikutnya"
          >
            <ChevronIcon direction="right" />
          </button>
          <p
            className="ml-1 shrink-0 whitespace-nowrap text-[13px] tabular-nums text-ink-soft"
            aria-live="polite"
          >
            Halaman <span className="font-semibold text-ink">{current + 1}</span> dari {total}
            <span className="hidden text-ink-mute xl:inline"> · {label}</span>
          </p>

          {/*
           * The page strip is the one place a long set has to stay scannable,
           * so it takes the width it needs and scrolls under the counter
           * rather than wrapping into a second row of chrome.
           */}
          <div className="rail rail-fade ml-3 hidden min-w-0 flex-1 gap-1.5 overflow-x-auto sm:flex">
            {plans.map((plan, position) => (
              <button
                key={`nav-${plan.label}-${position}`}
                type="button"
                data-active={position === current}
                onClick={() => scrollTo(position)}
                aria-label={`Ke halaman ${position + 1}, ${plan.label}`}
                className="chip shrink-0 !px-2.5 !py-1 !text-[12px] tabular-nums"
              >
                {plan.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rail rail-fade mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 sm:hidden">
          {plans.map((plan, position) => (
            <button
              key={`nav-sm-${plan.label}-${position}`}
              type="button"
              data-active={position === current}
              onClick={() => scrollTo(position)}
              aria-label={`Ke halaman ${position + 1}, ${plan.label}`}
              className="chip shrink-0 !px-2.5 !py-1 !text-[12px] tabular-nums"
            >
              {plan.label}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
