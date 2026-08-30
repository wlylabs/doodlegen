<img src="public/logo.svg" alt="" width="40" height="40">

# DoodleGen

Generator for print-ready alphabet, number and word colouring and tracing
packs. Pick a character set, a contour treatment, a page layout and a paper
size; scroll the preview; get A4 and US Letter PDFs — and the listing images,
descriptions and paperwork that turn those PDFs into something sellable on
Etsy, TPT, Gumroad, Shopee, Tokopedia or Pinterest.

Typography only — no companion illustrations, by design.

Two routes:

| Route | What it is |
| --- | --- |
| `/` | Landing page: what the tool makes, the print guarantees, the starter packs. Static, indexable, ~126 kB of JS. |
| `/studio` | The generator itself. Everything runs in the browser. |

The heavy parts — the font parser, `pdf-lib`, the ZIP writer — are all loaded
on demand, so the landing page never pays for them and the studio only pays
when output is actually asked for.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export to out/
```

The build is a fully static export with directory-style URLs
(`out/studio/index.html`), so `out/` can be dropped on any static host,
including the ones that will not rewrite `/studio` to `studio.html`. Nothing is
generated server-side: PDFs, listing images and the ZIP are built in the
browser, which also means the tool keeps working offline once the service
worker has cached the shell and the fonts.

Set `NEXT_PUBLIC_SITE_URL` at build time to give the social card and other
absolute metadata URLs a real origin.

Both deploy configs publish `out/` as plain static files, and neither uses a
Next.js server preset. That is deliberate on Vercel: `vercel.json` sets
`"framework": null`, so the deployment is treated as a static directory rather
than handed to the Next.js builder. That builder reads its manifests from
`.next/`, and if anything points it at the export directory instead — an
`outputDirectory` of `out` in `vercel.json` or in the project's dashboard
settings — the build compiles fine and then fails looking for
`out/routes-manifest.json`, a file that only ever exists in `.next/`. Pinning
`framework`, `buildCommand`, and `outputDirectory` in `vercel.json` keeps that
lookup from happening at all and overrides the dashboard, so the repo alone
decides how the site deploys.

Because nothing is served by the Next.js runtime, `vercel.json` also sets the
long-lived cache headers for `/_next/static/*` itself, matching `netlify.toml`.

## What a pack contains

A worksheet set is the middle of the product, not all of it. The studio can put
the rest around it:

| Part | What it is |
| --- | --- |
| Cover page | Brand line, product title, page count, real sample characters, print specs — in one of four compositions the seller picks. Vector like every other page, and the only page allowed to carry colour. |
| Worksheets | One page per character, with an optional page title and a numbered, branded footer. |
| Terms page | What a buyer may and may not do, plus printing tips and the font licence. |
| Editable SVG | One SVG per worksheet, at trim size, drawn from the same plan — opens in Canva, Figma, Illustrator, Inkscape and Cricut Design Space. |
| Listing images | 2000×2000 (Etsy), 1200×1600 (TPT), 1280×720 (Gumroad), 1200×1200 (Shopee and Tokopedia), 1000×1500 (Pinterest), drawn from the same page plans. |
| Listing copy | Title, description and tags for Etsy, TPT, Gumroad, Shopee, Tokopedia and Pinterest, already inside each channel's character and tag limits. The Gumroad markdown draft doubles as the Payhip, Lemon Squeezy and Karyakarsa one. |
| Paperwork | A read-me for the buyer and the full SIL OFL text of the embedded face. |

`Kit marketplace` builds all of it and hands back one ZIP:

```
doodlegen-<subject>-<style>-<layout>/
  01-PRINT-FILES/       A4 and US Letter PDFs
  02-LISTING-IMAGES/    the five listing canvases, PNG
  03-LISTING-COPY/      etsy.txt, tpt.txt, gumroad.txt, shopee.txt,
                        tokopedia.txt, pinterest.txt
  04-SVG-EDITABLE/      one SVG per worksheet
  READ-ME-FIRST.txt
  FONT-LICENSE.txt
```

**Why there is no Canva integration, and what replaces it.** The app is a
static export with no server, so there is nowhere to keep the client secret an
OAuth integration needs; and third-party artwork, Canva's included, almost
never carries the resale rights a seller needs for a paid download. So the
bridge runs the other way: every worksheet also exports as an SVG at trim
size, which Canva, Figma, Illustrator, Inkscape and Cricut Design Space all
open, so a seller can add their own art on top of pages that are already
correct. Material that ships in the repo is material whose licence is settled:
OFL faces, and word lists that are public domain or plain vocabulary.

**The cover is a choice, not a fixture.** It is the one page a buyer sees
before they pay, so it is the one page that gets options. Four compositions:
*Klasik* centres the title over a strip of three samples; *Poster* blows one
character up to the height of the page, which is what survives being shrunk to
a marketplace thumbnail; *Etalase* grids four samples over a left-aligned title
block, selling the fact that there are many; *Minimalis* is type between two
hairlines on bare paper, no card and no dots, and the cheapest of the four to
print. The choice carries into the listing images too — the sheet mockups fan,
stand alone, tile or line up to match — so the shop front and the file agree.

**Colour, where it pays for itself.** Four palettes — Krayon, Pastel, Senja
and Hitam Putih — tint the cover page and the listing images: a tinted card,
confetti in the border band a dot can never land on a word in, a coloured
headline, and sample characters shown already coloured in, next to one still
empty. That last pair is the whole product in one picture: what the child
starts with, and what they end up with. Worksheets stay K-only whatever is
picked, because colour there would cost a second plate on press, muddy every
photocopy and drain a home printer for nothing.

**The tracing ladder.** `Bertahap` is the progression every printed
handwriting sheet uses and the one every open-source worksheet generator
converges on: a worked example, dotted repeats to trace, faded ones that give
less away, and then a cell with nothing in it at all. That last cell is the
point of the exercise — it is the only style that ever leaves one, and the
guide lines still run under it so the child has something to sit on. The fade
is K-only like everything else, floored at 28% so a home printer and a
photocopier both still put it on the paper.

**Language follows the market.** Everything a buyer reads — cover, licence
page, page footer, read-me, and the folder names above — is written in the
pack's language, English by default and Indonesian on request. The listing
images are not the seller's call: the Etsy, TPT, Gumroad and Pinterest canvases
are always English, the Shopee and Tokopedia canvas always Indonesian, because
that is who reads them. The listing copy has always worked that way.

Content is not limited to A–Z and 0–9: the `Kata & Nama` mode takes a list of
words, one per line, which is what a custom name-tracing order actually is —
and sixteen ready-made lists come with it, in both languages: Dolch sight
words, CVC families, colours, numbers, animals, family, days, fruit, body
parts, school things.

## Output guarantees

Every generated PDF satisfies the following, and `npm run verify` checks each
one mechanically:

| Requirement | How it is met |
| --- | --- |
| 300 DPI or better | Nothing is rasterised. Characters are stroked glyph outlines and guides are vector lines, so the file has no resolution at all — it prints at whatever the RIP runs. |
| Vector characters | Text is drawn in PDF render mode 1 (stroke), which strokes the real glyph outlines. |
| Embedded font | The complete face is embedded as a `CIDFontType2` program. Because the shipped faces are pre-trimmed to ASCII (17–37 KB), there is no need to subset at generation time. |
| 0.5 inch safe margin | Enforced as a hard floor, and measured: `verify` rasterises pages and fails if a single non-white pixel lands in the border band. |
| Print-safe colour | Every worksheet is K-only CMYK (`0 0 0 K`): one plate on press, no registration drift, clean photocopies. Colour is confined to the one optional cover page, and `verify` fails if it reaches a second. |
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

**Front and back matter.** The cover and licence pages are laid out by the
same engine, from the same glyph outlines, and are measured against the same
0.5 inch floor — so `verify` checks them exactly as it checks a worksheet, and
`samples` dumps every cover composition as its own SVG to look at.
Page numbers reserve a band inside the safe area rather than drifting into the
margin, which is the usual reason a print shop sends a file back.

**Ligatures are off, everywhere.** A ligature glyph is not reachable through
the font's `cmap`, and `pdf-lib` only writes widths for the glyphs that are, so
an embedded `fi` falls back to the default width: a title reading "PDF file"
prints as "PDF fi le". The same feature set is passed to the measuring pass and
to `embedFont`, so the preview and the page cannot drift apart.

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
| `npm run verify:listing` | Checks every marketplace draft against that marketplace's title, description and tag limits |
| `npm run fonts` | Rebuilds `public/fonts` from upstream (see `FONTS.md`) |
| `npm run icons` | Regenerates the logo, favicon, PWA icons and the social card |

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
app/
  page.tsx          Landing page
  studio/page.tsx   The generator
  layout.tsx        Shell, metadata, PWA wiring
components/
  App.tsx           Studio state: config, generation, export
  SettingsPanel.tsx Settings and starter packs
  PreviewDeck.tsx   Page deck, PageSheet.tsx  One rendered page
  ExportDialog.tsx  Listing images and copy, ready to paste
  GenerateBar.tsx   Progress, cancel, downloads
  motion.tsx        Ripple, reveal, count-up, copy-to-clipboard
  landing/          Hero, live demo, sections
lib/
  geometry.ts       Page layout engine (pure), including cover and terms
  svg.ts            Plan to SVG shapes, for the preview
  pdf.ts            Plan to PDF, via pdf-lib
  cover.ts          Plan to listing images, via canvas
  listing.ts        Marketplace titles, descriptions and tags
  bundle.ts         The ZIP everything ships in
  share.ts          Config in a link, and in local storage
  naming.ts         Product titles, slugs, file names
  fontStore.ts      Font loading, parsing and caching
  presets.ts        Papers, faces, styles, layouts, inks, starter packs
  charset.ts        Character set construction and validation
  wordlists.ts      Ready-made word sets for the word mode
  svgdoc.ts         Plan to a standalone SVG file, for Canva and Cricut
  palette.ts        The four CMYK palettes
  covers.ts         The four cover compositions, page and listing image
scripts/            Font pipeline, icon and social card generation, QA tools
public/fonts/       Built faces plus their OFL texts
```

## Stack

Next.js 15 (static export), React 19, Tailwind CSS, `pdf-lib` with
`@pdf-lib/fontkit`, `jszip`. `pdf-lib`, the ZIP writer and the whole layout
engine are loaded on demand, so none of them are part of the landing page's
first paint. State is plain React — no store, no component library, and no
animation library either: motion is CSS plus a ripple that appends one span.

Every interactive surface answers the click — a press-in, a ripple from the
pointer, a settle — and every one of those is switched off under
`prefers-reduced-motion`, including the reveal-on-scroll, which is scoped to a
class the document only gets when scripting runs.
