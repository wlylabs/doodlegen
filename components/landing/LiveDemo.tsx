'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageSheet } from '../PageSheet';
import { useRipple } from '../motion';
import { Spinner } from '../diagrams';
import { buildCharacters } from '@/lib/charset';
import { loadFont } from '@/lib/fontStore';
import { planDocument } from '@/lib/geometry';
import { DEFAULT_CONFIG, PAPERS } from '@/lib/presets';
import type { Config, LayoutId, LoadedFont, StyleId } from '@/lib/types';

const STYLE_CHIPS: { id: StyleId; label: string }[] = [
  { id: 'outline', label: 'Outline' },
  { id: 'dotted', label: 'Titik-titik' },
  { id: 'combo', label: 'Kombinasi' },
];

const LAYOUT_CHIPS: { id: LayoutId; label: string }[] = [
  { id: 'single', label: 'Satu karakter' },
  { id: 'worksheet', label: 'Lembar kerja' },
  { id: 'grid', label: 'Grid latihan' },
];

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/**
 * The landing page's demo is the product, not a picture of it: the same
 * layout engine, the same glyph outlines, the same preview component the
 * studio uses. Whatever it draws here is what the PDF would contain.
 */
export function LiveDemo() {
  const [font, setFont] = useState<LoadedFont | null>(null);
  const [style, setStyle] = useState<StyleId>('combo');
  const [layout, setLayout] = useState<LayoutId>('worksheet');
  const [letterIndex, setLetterIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const ripple = useRipple<HTMLButtonElement>();

  useEffect(() => {
    let alive = true;
    loadFont('rounded')
      .then((loaded) => alive && setFont(loaded))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setLetterIndex((index) => (index + 1) % LETTERS.length), 3200);
    return () => clearInterval(timer);
  }, [paused]);

  const config: Config = useMemo(
    () => ({ ...DEFAULT_CONFIG, style, layout, guides: true, paper: 'a4' }),
    [style, layout],
  );

  const letter = LETTERS[letterIndex];
  const plan = useMemo(() => {
    if (!font) return null;
    const characters = buildCharacters({ ...config, content: 'letters', letterCase: 'upper' });
    const plans = planDocument({ font, config, paper: PAPERS.a4, characters });
    return plans.find((item) => item.label === letter) ?? plans[0] ?? null;
  }, [font, config, letter]);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-1.5">
        {STYLE_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            data-active={chip.id === style}
            className="chip !py-1.5 !text-[12px]"
            onClick={(event) => {
              ripple(event);
              setStyle(chip.id);
            }}
          >
            {chip.label}
          </button>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
        {LAYOUT_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            data-active={chip.id === layout}
            className="chip !py-1.5 !text-[12px]"
            onClick={(event) => {
              ripple(event);
              setLayout(chip.id);
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div
        className="relative mt-3 flex items-center justify-center rounded-2xl border border-line bg-white p-3 shadow-sheet"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="w-full max-w-[300px] overflow-hidden rounded-lg"
          style={{ aspectRatio: `${PAPERS.a4.widthPt} / ${PAPERS.a4.heightPt}` }}
        >
          {font && plan ? (
            <PageSheet
              // Remounting on every change is what replays the draw-on.
              key={`${letter}-${style}-${layout}`}
              plan={plan}
              paper={PAPERS.a4}
              font={font}
              config={config}
              showSafeArea={false}
              animate
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-mute">
              <Spinner />
            </div>
          )}
        </div>

        <div className="absolute bottom-3 right-3 flex gap-1">
          {LETTERS.map((item, index) => (
            <button
              key={item}
              type="button"
              aria-label={`Tampilkan huruf ${item}`}
              onClick={() => setLetterIndex(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === letterIndex ? 'w-5 bg-accent' : 'w-1.5 bg-line-strong hover:bg-ink-mute'
              }`}
            />
          ))}
        </div>
      </div>

      <p className="mt-2 text-center text-[12px] text-ink-mute">
        Pratinjau nyata — digambar dengan mesin layout yang sama dengan PDF-nya.
      </p>
    </div>
  );
}
