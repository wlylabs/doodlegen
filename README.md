<img src="public/logo.svg" alt="" width="40" height="40">

# DoodleGen

Internal tool for generating print-ready alphabet and number colouring and
tracing pages. Pick a character set, a contour treatment, a page layout and a
paper size; scroll the preview; get A4 and US Letter PDFs that are ready to
list on Etsy, TPT, Gumroad or Shopee.

Typography only — no companion illustrations, by design.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export to out/
```

The build is a fully static export, so `out/` can be dropped on any static
host. Nothing is generated server-side: PDFs are built in the browser, which
also means the tool keeps working offline once the service worker has cached
the shell and the fonts.

The two included deploy configs differ on purpose. Netlify publishes `out/`
directly. Vercel does **not**: its Next.js builder reads `.next/`, recognises
`output: 'export'` from there, and serves the export itself — so `vercel.json`
deliberately sets no `outputDirectory`. Pointing it at `out/` makes the build
fail looking for `out/routes-manifest.json`, which only ever exists in
`.next/`.

## Output guarantees

Every generated PDF satisfies the following, and `npm run verify` checks each
one mechanically:

| Requirement | How it is met |
| --- | --- |
| 300 DPI or better | Nothing is rasterised. Characters are stroked glyph outlines and guides are vector lines, so the file has no resolution at all — it prints at whatever the RIP runs. |
| Vector characters | Text is drawn in PDF render mode 1 (stroke), which strokes the real glyph outlines. |
| Embedded font | The complete face is embedded as a `CIDFontType2` program. Because the shipped faces are pre-trimmed to ASCII (17–37 KB), there is no need to subset at generation time. |
| 0.5 inch safe margin | Enforced as a hard floor, and measured: `verify` rasterises pages and fails if a single non-white pixel lands in the border band. |
| Print-safe colour | K-only CMYK (`0 0 0 K`). One plate on press, no registration drift, clean photocopies. |
| Clean white background | An explicit 0 % ink rectangle: white on screen, no ink on paper. |
| No watermark | There is none, anywhere. |
| Small files | A 26-page A–Z set lands around 20 KB. |

## How a page is built

`lib/geometry.ts` is the whole layout engine, and it is pure: font metrics and
a config in, absolute point coordinates out. Both the SVG preview
(`lib/svg.ts`) and the PDF writer (`lib/pdf.ts`) consume the same plan and the
same glyph outlines, so the preview is not an approximation of the output —
it is the output, drawn twice.

Two ideas do most of the work:

**The writing band.** Sizing tracing rows by the font's own ascender and
descender wastes most of the row: Baloo 2 reports an ascender 1.8× its cap
height, so an all-uppercase sheet would draw letters barely a third of the row
tall. Instead the band is measured from the glyphs actually in the set. An
uppercase sheet gets a cap-height band; a lowercase sheet gets an
ascender-to-descender band and a dashed midline. Sizes are then locked per
text length across the document, so every page in a set matches and every
baseline lines up — while "7" still isn't shrunk to suit "100".

**Fill versus metric fitting.** A model character on show is fitted to its
inked bounding box, so it fills the page. A character to be traced is fitted to
the shared writing band, so `A` and `a` keep their true relative proportions.
Both fit twice: once to learn the stroke weight, then again inside a box shrunk
by it, because the stroke straddles the path and would otherwise be the thing
that crosses the margin.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Static export to `out/` |
| `npm run typecheck` | TypeScript, no emit |
| `npm run samples` | Renders sample PDFs across layouts into `.samples/` |
| `npm run verify` | Checks those PDFs against the table above |
| `npm run fonts` | Rebuilds `public/fonts` from upstream (see `FONTS.md`) |
| `npm run icons` | Regenerates the logo, favicon and PWA icons |

`verify` drives a real browser. Either run `npx playwright install chromium`
once, or point `CHROMIUM_PATH` at a browser you already have.

`fonts` needs Python with `fonttools` and `skia-pathops`
(`pip install fonttools skia-pathops`). The built fonts are committed, so this
is only needed when adding or changing a face.

## Fonts and licensing

All four faces are SIL OFL 1.1: commercial use, embedding and resale of the
resulting PDFs are all permitted. The build pipeline, the modifications made,
and why one face had to be renamed are documented in **[FONTS.md](FONTS.md)**.

## Layout

```
app/                Next.js App Router shell, metadata, PWA wiring
components/         UI — settings panel, preview deck, action bar
lib/
  geometry.ts       Page layout engine (pure)
  svg.ts            Plan to SVG shapes, for the preview
  pdf.ts            Plan to PDF, via pdf-lib
  fontStore.ts      Font loading, parsing and caching
  presets.ts        Papers, faces, styles, layouts, ink levels
  charset.ts        Character set construction and validation
scripts/            Font pipeline, icon generation, sample and verify tools
public/fonts/       Built faces plus their OFL texts
```

## Stack

Next.js 15 (static export), React 19, Tailwind CSS, `pdf-lib` with
`@pdf-lib/fontkit`. `pdf-lib` is loaded on demand, so it is not part of the
first paint. State is plain React — no store, no component library.
