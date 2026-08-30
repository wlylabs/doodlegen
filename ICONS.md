# Icon provenance and licensing

Two different things in `components/diagrams.tsx` look like icons, and only
one of them is.

## The interface glyphs — Lucide, ISC

The eleven glyphs that sit inside buttons and labels are
[Lucide](https://lucide.dev) ([lucide-icons/lucide](https://github.com/lucide-icons/lucide)),
under the **ISC License**, which permits use, modification and redistribution
provided the copyright and permission notice travel with the copy. The full
text ships at `public/ISC-lucide.txt`, next to the font licences, so the
deployed site carries it too.

| Used as | Lucide icon |
| --- | --- |
| `Spinner` | `loader-circle` |
| `ChevronIcon` | `chevron-left` / `chevron-right` / `chevron-down` |
| `DownloadIcon` | `download` |
| `CheckIcon` | `check` |
| `KitIcon` | `package` |
| `CopyIcon` | `copy` |
| `LinkIcon` | `link` |
| `CloseIcon` | `x` |
| `SparkIcon` | `sparkles` |
| `InstallIcon` | `monitor-down` |
| `IosShareIcon` | `share` |

### Why vendored rather than installed

The paths are traced verbatim from `lucide-static` into the source, and the
one `Icon` wrapper sets the contract Lucide draws to — 24-unit grid, no fill,
`currentColor`, stroke width 2, round caps and joins. Nothing is redrawn: a
changed path would be a different icon wearing Lucide's name.

Eleven paths is about two kilobytes. `lucide-react` is a dependency, a build
step and a tree-shaking assumption for the same two kilobytes, in a project
whose whole claim is that it is a static export that runs with no server. The
trade would be worth it at fifty icons; at eleven it is not.

### Why a set at all

The glyphs these replaced were drawn by hand at six different stroke weights
— 1.5, 1.6, 1.8, 2, 2.4 and 3 — on a grid each icon interpreted for itself. A
single icon drawn that way is fine. A row of buttons is where it shows: the
weights disagree, so the row reads as a collection rather than as a set.

Two departures from stock Lucide, both deliberate:

- **`CheckIcon` carries `pathLength={1}`** so the tick draws itself on when a
  copy or a render succeeds. Normalising the length is what lets one dash
  animation fit the path at any rendered size. The path is unchanged.
- **`InstallIcon` is `monitor-down`, not `download`.** The download glyph is a
  tray and already means "this file is yours now" in the results bar three
  inches away; installing the app is a different promise and needs a
  different mark.

## The option marks — not icons

`StyleMark`, `LayoutMark`, `CoverMark`, `PaperMark` and `LogoMark` are drawn
here and belong here. They are schematics of this product's own compositions
— which cover model puts the title in a masthead, what a worksheet layout
puts on the page — and no icon set has them, because no other product has
those compositions. They keep their own stroke weights: they are diagrams at
26 pixels, not glyphs, and the weights carry meaning inside them (a plate
outline is not a title rule).
