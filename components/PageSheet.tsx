'use client';

import { useMemo } from 'react';
import { safeArea } from '@/lib/geometry';
import { sheetShapes } from '@/lib/svg';
import type { PaperSpec } from '@/lib/presets';
import type { Config, LoadedFont, PagePlan } from '@/lib/types';

export function PageSheet({
  plan,
  paper,
  font,
  config,
  showSafeArea,
  className = '',
}: {
  plan: PagePlan;
  paper: PaperSpec;
  font: LoadedFont;
  config: Config;
  showSafeArea: boolean;
  className?: string;
}) {
  const shapes = useMemo(() => sheetShapes(font, plan, config), [font, plan, config]);
  const safe = useMemo(() => safeArea(paper, config), [paper, config]);

  return (
    <svg
      viewBox={`0 0 ${plan.widthPt} ${plan.heightPt}`}
      className={className}
      role="img"
      aria-label={`Pratinjau halaman ${plan.label}`}
      shapeRendering="geometricPrecision"
    >
      <rect x="0" y="0" width={plan.widthPt} height={plan.heightPt} fill="#FFFFFF" />

      {showSafeArea ? (
        <rect
          x={safe.x}
          y={safe.y}
          width={safe.w}
          height={safe.h}
          fill="none"
          stroke="#C2410C"
          strokeOpacity="0.35"
          strokeWidth="1"
          strokeDasharray="6 5"
        />
      ) : null}

      {shapes.guides.map((guide, index) => (
        <line
          key={`guide-${index}`}
          x1={guide.x1}
          y1={guide.y1}
          x2={guide.x2}
          y2={guide.y2}
          stroke={guide.color}
          strokeWidth={guide.width}
          strokeDasharray={guide.dash}
        />
      ))}

      {shapes.glyphs.map((glyph, index) => (
        <path
          key={`glyph-${index}`}
          d={glyph.d}
          transform={glyph.transform}
          fill={glyph.filled ? glyph.color : 'none'}
          stroke={glyph.filled ? undefined : glyph.color}
          strokeWidth={glyph.filled ? undefined : glyph.strokeWidth}
          strokeDasharray={glyph.filled ? undefined : glyph.dash}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
