import type { Box, Cmyk, PathCmd, ShapeDraw } from './types';

/**
 * The decorative vector art the colourful covers are built from: blobs,
 * starbursts, sparkles, scalloped clouds, wavy ribbons and rainbow arches.
 *
 * These are generated rather than shipped as clip art, and that is a
 * deliberate call. Every mark on a cover has to survive the same trip as the
 * worksheets — CMYK ink into the PDF, a flipped y into the preview, a Path2D
 * onto the listing canvas — and an imported SVG file arrives in none of those
 * spaces, in RGB, under someone else's licence. Built here, a doodle is print
 * colour from the first line, scales to any paper, and costs no bytes.
 *
 * The constructions are the standard ones: a blob is points sampled around an
 * ellipse and joined with a Catmull-Rom spline, the way every SVG blob maker
 * does it; a burst is an alternating-radius polygon; a scallop is a run of
 * semicircles laid on a rectangle's edges.
 *
 * Everything is in PDF user space — points, origin bottom-left, y growing
 * up — and everything is deterministic. A plan that came out differently on
 * the second run would put the preview and the printed page in disagreement
 * about where the dots are, so randomness is seeded and never global.
 */

/** Circle-to-bezier constant: puts a control point where an arc's would be. */
const KAPPA = 0.5523;

interface Point {
  x: number;
  y: number;
}

/** mulberry32: small, fast, and identical on every run for a given seed. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A closed Catmull-Rom spline through every point, converted to the cubics a
 * PDF and an SVG both speak. This is what turns a ring of jittered points
 * into something that reads as hand-drawn rather than as a polygon.
 */
export function closedSpline(points: Point[]): PathCmd[] {
  if (points.length < 3) return [];
  const at = (index: number) => points[(index + points.length) % points.length];
  const path: PathCmd[] = [{ c: 'M', x: points[0].x, y: points[0].y }];
  for (let index = 0; index < points.length; index += 1) {
    const p0 = at(index - 1);
    const p1 = at(index);
    const p2 = at(index + 1);
    const p3 = at(index + 2);
    path.push({
      c: 'C',
      x1: p1.x + (p2.x - p0.x) / 6,
      y1: p1.y + (p2.y - p0.y) / 6,
      x2: p2.x - (p3.x - p1.x) / 6,
      y2: p2.y - (p3.y - p1.y) / 6,
      x: p2.x,
      y: p2.y,
    });
  }
  path.push({ c: 'Z' });
  return path;
}

/**
 * The speech bubble a coloring book puts its title in: an ellipse with its
 * radius nudged in and out, so no two lobes match and none of it looks
 * machined. `wobble` is the fraction of the radius the nudge may claim.
 */
export function blobPath(
  centre: Point,
  rx: number,
  ry: number,
  options: { lobes?: number; wobble?: number; seed?: number } = {},
): PathCmd[] {
  const lobes = Math.max(5, options.lobes ?? 9);
  const wobble = options.wobble ?? 0.14;
  const random = seeded(options.seed ?? 7);
  const points: Point[] = [];
  for (let index = 0; index < lobes; index += 1) {
    const angle = (index / lobes) * Math.PI * 2;
    const scale = 1 - wobble / 2 + random() * wobble;
    points.push({
      x: centre.x + Math.cos(angle) * rx * scale,
      y: centre.y + Math.sin(angle) * ry * scale,
    });
  }
  return closedSpline(points);
}

/** An alternating-radius polygon: a sunburst at many points, a star at five. */
export function burstPath(
  centre: Point,
  outer: number,
  inner: number,
  points: number,
  phase = Math.PI / 2,
): PathCmd[] {
  const path: PathCmd[] = [];
  const total = points * 2;
  for (let index = 0; index < total; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = phase + (index / total) * Math.PI * 2;
    const point = {
      x: centre.x + Math.cos(angle) * radius,
      y: centre.y + Math.sin(angle) * radius,
    };
    path.push(index === 0 ? { c: 'M', ...point } : { c: 'L', ...point });
  }
  path.push({ c: 'Z' });
  return path;
}

export function starPath(centre: Point, radius: number, points = 5): PathCmd[] {
  return burstPath(centre, radius, radius * 0.42, points);
}

/**
 * The four-pointed twinkle. Its arms are concave — the curve between two tips
 * is pulled most of the way back to the centre — which is the whole
 * difference between a sparkle and a diamond.
 */
export function sparklePath(centre: Point, radius: number, pinch = 0.76): PathCmd[] {
  const tips: Point[] = [
    { x: centre.x, y: centre.y + radius },
    { x: centre.x + radius, y: centre.y },
    { x: centre.x, y: centre.y - radius },
    { x: centre.x - radius, y: centre.y },
  ];
  const path: PathCmd[] = [{ c: 'M', x: tips[0].x, y: tips[0].y }];
  tips.forEach((tip, index) => {
    const next = tips[(index + 1) % tips.length];
    path.push({
      c: 'C',
      x1: tip.x + (centre.x - tip.x) * pinch,
      y1: tip.y + (centre.y - tip.y) * pinch,
      x2: next.x + (centre.x - next.x) * pinch,
      y2: next.y + (centre.y - next.y) * pinch,
      x: next.x,
      y: next.y,
    });
  });
  path.push({ c: 'Z' });
  return path;
}

/**
 * A semicircular bump from `from` to `to`, bulging along the unit normal.
 * The 4/3-radius control offset is the usual cubic stand-in for a half
 * circle: close enough that no eye finds the seam at print size.
 */
function bump(from: Point, to: Point, normal: Point, radius: number): PathCmd {
  return {
    c: 'C',
    x1: from.x + normal.x * radius * (4 / 3),
    y1: from.y + normal.y * radius * (4 / 3),
    x2: to.x + normal.x * radius * (4 / 3),
    y2: to.y + normal.y * radius * (4 / 3),
    x: to.x,
    y: to.y,
  };
}

/**
 * A rectangle whose edges are runs of semicircles: the cloud a cartoon title
 * sits inside. The bumps count the edge, not the corner, so the shape stays
 * symmetrical however wide the panel gets.
 */
export function cloudPath(box: Box, acrossX = 5, acrossY = 3): PathCmd[] {
  const cols = Math.max(2, acrossX);
  const rows = Math.max(1, acrossY);
  const stepX = box.w / cols;
  const stepY = box.h / rows;
  const path: PathCmd[] = [{ c: 'M', x: box.x, y: box.y + box.h }];

  for (let index = 0; index < cols; index += 1) {
    const from = { x: box.x + index * stepX, y: box.y + box.h };
    const to = { x: box.x + (index + 1) * stepX, y: box.y + box.h };
    path.push(bump(from, to, { x: 0, y: 1 }, stepX / 2));
  }
  for (let index = rows - 1; index >= 0; index -= 1) {
    const from = { x: box.x + box.w, y: box.y + (index + 1) * stepY };
    const to = { x: box.x + box.w, y: box.y + index * stepY };
    path.push(bump(from, to, { x: 1, y: 0 }, stepY / 2));
  }
  for (let index = cols - 1; index >= 0; index -= 1) {
    const from = { x: box.x + (index + 1) * stepX, y: box.y };
    const to = { x: box.x + index * stepX, y: box.y };
    path.push(bump(from, to, { x: 0, y: -1 }, stepX / 2));
  }
  for (let index = 0; index < rows; index += 1) {
    const from = { x: box.x, y: box.y + index * stepY };
    const to = { x: box.x, y: box.y + (index + 1) * stepY };
    path.push(bump(from, to, { x: -1, y: 0 }, stepY / 2));
  }

  path.push({ c: 'Z' });
  return path;
}

/**
 * The winding road every vehicles-edition cover is built on: a band of even
 * thickness following a sine, smoothed as a closed spline so the two edges
 * stay parallel through the curves.
 */
export function ribbonPath(box: Box, waves = 1.5, thickness = 0.42): PathCmd[] {
  const steps = Math.max(8, Math.round(waves * 8));
  const half = (box.h * thickness) / 2;
  const amplitude = box.h / 2 - half;
  const centre = box.y + box.h / 2;
  const at = (step: number) => {
    const t = step / steps;
    return {
      x: box.x + box.w * t,
      y: centre + Math.sin(t * Math.PI * 2 * waves) * amplitude,
    };
  };

  const top: Point[] = [];
  const bottom: Point[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const point = at(step);
    top.push({ x: point.x, y: point.y + half });
    bottom.push({ x: point.x, y: point.y - half });
  }
  return closedSpline([...top, ...bottom.reverse()]);
}

/** A quarter arc, as the two cubics a circle is normally approximated with. */
function quarter(from: Point, to: Point, control: Point): PathCmd {
  return {
    c: 'C',
    x1: from.x + (control.x - from.x) * KAPPA,
    y1: from.y + (control.y - from.y) * KAPPA,
    x2: to.x + (control.x - to.x) * KAPPA,
    y2: to.y + (control.y - to.y) * KAPPA,
    x: to.x,
    y: to.y,
  };
}

/** One band of a rainbow: the half-annulus between two radii. */
export function archPath(centre: Point, outer: number, inner: number): PathCmd[] {
  const { x, y } = centre;
  return [
    { c: 'M', x: x - outer, y },
    quarter({ x: x - outer, y }, { x, y: y + outer }, { x: x - outer, y: y + outer }),
    quarter({ x, y: y + outer }, { x: x + outer, y }, { x: x + outer, y: y + outer }),
    { c: 'L', x: x + inner, y },
    quarter({ x: x + inner, y }, { x, y: y + inner }, { x: x + inner, y: y + inner }),
    quarter({ x, y: y + inner }, { x: x - inner, y }, { x: x - inner, y: y + inner }),
    { c: 'Z' },
  ];
}

/**
 * A torn strip of tape, tilted a shade off true. The tilt is what stops a
 * label from reading as a UI element pasted onto a printed page.
 */
export function tapePath(box: Box, tilt = 0.02): PathCmd[] {
  const rise = box.w * tilt;
  return [
    { c: 'M', x: box.x, y: box.y },
    { c: 'L', x: box.x + box.w, y: box.y + rise },
    { c: 'L', x: box.x + box.w, y: box.y + rise + box.h },
    { c: 'L', x: box.x, y: box.y + box.h },
    { c: 'Z' },
  ];
}

/** The box a path actually occupies, control points included. */
export function pathBounds(path: PathCmd[]): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const see = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const step of path) {
    if (step.c === 'Z') continue;
    if (step.c === 'C') see(step.x1, step.y1);
    if (step.c === 'C') see(step.x2, step.y2);
    see(step.x, step.y);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Wraps an outline as a page shape, measuring its box so renderers need not. */
export function pathShape(
  path: PathCmd[],
  color?: Cmyk,
  stroke?: { color: Cmyk; width: number },
): ShapeDraw {
  return { kind: 'path', ...pathBounds(path), color, stroke, path };
}
