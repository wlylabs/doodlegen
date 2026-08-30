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
  animate = false,
}: {
  plan: PagePlan;
  paper: PaperSpec;
  font: LoadedFont;
  config: Config;
  showSafeArea: boolean;
  className?: string;
  /** Draws the solid contours on, one after another. Landing page only. */
  animate?: boolean;
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

      {shapes.areas.map((area, index) =>
        area.kind === 'ellipse' ? (
          <ellipse
            key={`area-${index}`}
            cx={area.x + area.w / 2}
            cy={area.y + area.h / 2}
            rx={area.w / 2}
            ry={area.h / 2}
            fill={area.color}
          />
        ) : (
          <rect
            key={`area-${index}`}
            x={area.x}
            y={area.y}
            width={area.w}
            height={area.h}
            rx={area.r || undefined}
            fill={area.color}
          />
        ),
      )}

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

      {shapes.glyphs.map((glyph, index) => {
        // Only unbroken contours can be drawn on: a dotted glyph already owns
        // its dash pattern, and a filled one has no line to travel along.
        const drawn = animate && !glyph.filled && !glyph.dash;
        return (
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
            pathLength={drawn ? 1 : undefined}
            className={drawn ? 'draw-path' : undefined}
            style={drawn ? ({ '--draw-delay': `${index * 90}ms` } as React.CSSProperties) : undefined}
          />
        );
      })}
    </svg>
  );
}
