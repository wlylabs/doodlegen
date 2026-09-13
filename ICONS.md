# Icon provenance and licensing

Two different things in `components/diagrams.tsx` look like icons, and only
one of them is. The brand mark is a third thing again, and lives in
`components/Logo.tsx`.

## The interface glyphs — Lucide, ISC

The sixteen glyphs that sit inside buttons and labels are
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
| `ShareIcon` | `share-2` |
| `SearchIcon` | `search` |
| `KeyboardIcon` | `keyboard` |
| `SlidersIcon` | `sliders-horizontal` |
| `GenerateIcon` | `file-output` |
| `HomeIcon` | `home` |

### Why vendored rather than installed

The paths are traced verbatim from `lucide-static` into the source, and the
one `Icon` wrapper sets the contract Lucide draws to — 24-unit grid, no fill,
`currentColor`, stroke width 2, round caps and joins. Nothing is redrawn: a
changed path would be a different icon wearing Lucide's name.

Sixteen paths is about three kilobytes. `lucide-react` is a dependency, a build
step and a tree-shaking assumption for the same three kilobytes, in a project
whose whole claim is that it is a static export that runs with no server. The
trade would be worth it at fifty icons; at sixteen it is not.

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

`StyleMark`, `LayoutMark`, `CoverMark` and `PaperMark` are drawn here and
belong here. They are schematics of this product's own compositions — which
cover model puts the title in a masthead, what a worksheet layout puts on the
page — and no icon set has them, because no other product has
those compositions. They keep their own stroke weights: they are diagrams at
26 pixels, not glyphs, and the weights carry meaning inside them (a plate
outline is not a title rule).

## The brand mark — `components/Logo.tsx`

A "D" whose stem is a solid contour and whose bowl is a dashed tracing line:
the two treatments the generator puts on a worksheet, on one letter. It comes
in two dresses, both drawn from one 24-unit path pair:

- **`LogoGlyph`** — the bare letter, ink stem and accent dashes, for anywhere
  it sits on the page's own ground.
- **`LogoMark`** — the app icon: the letter in white on a squircle carrying
  the brand ramp (`--brand-from` / `--brand-via` / `--brand-to`). This is what
  the chrome wears, so the bar an installed app launched into is showing the
  same object as the launcher it launched from.

`scripts/gen-icons.mjs` renders the same drawing into `public/` — the PNG set,
the maskable pair, the Apple touch icon, the vector favicon, the shortcut
tiles and the social card. Run `npm run icons` after changing the mark or the
ramp; nothing in `public/` is edited by hand.

The bowl is dashed rather than dotted. Dots were the first drawing and they
lose the letter: at 24px six circles beside a bar read as a bracket and a
colon rather than a D. A long dash with a short gap keeps the curve continuous
enough to be read and still says the thing worth saying — this is a line drawn
to be traced.
