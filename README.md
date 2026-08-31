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
| Cover page | Brand line, product title, an optional tagline in the seller's own words, and real sample characters — in one of twelve compositions the seller picks, two of them built to the convention a published book follows. Vector like every other page, and the only page allowed to carry colour. No page counts, DPI or reprint terms: that is listing copy, not a title page. |
| Worksheets | One page per character, with an optional page title and a numbered, branded footer. |
| Terms page | What a buyer may and may not do, plus printing tips and the font licence. |
| Editable SVG | One SVG per worksheet, at trim size, drawn from the same plan — opens in Canva, Figma, Illustrator, Inkscape and Cricut Design Space. |
| Listing images | Twelve canvases, not five: a cover for each channel at its own size — 2000×2000 (Etsy), 1200×1600 (TPT), 1280×720 and 600×600 (Gumroad cover and square thumbnail), 1200×1200 (Shopee and Tokopedia), 1000×1500 (Pinterest) — plus, where a channel gives a listing more than one photo slot, a contents grid of every page, a paper mockup of the printed sheets, and a three-step "how it works" card. All drawn from the same page plans, in vector, with no stock photography. |
| Listing copy | Title, description and tags for Etsy, TPT, Gumroad, Shopee, Tokopedia and Pinterest, written for where each channel actually ranks them and already inside its character and tag limits. The description says what is genuinely on the pages — stroke weight, handwriting guides, grid size, the words in a word pack, the editable SVGs — so two packs read as two products. The Gumroad markdown draft doubles as the Payhip, Lemon Squeezy and Karyakarsa one. Every draft is written to that marketplace's own listing rules — no third-party brand names, no contact details or rival lapak, no vocabulary of restricted digital goods — and each text file carries those rules under the copy. |
| Upload steps | Each channel's own add-product form, walked field by field: photo, product name, category, description, price, stock, SKU — and the weight, package size and courier Shopee and Tokopedia will not let a listing save without. Every blank says whether it is pasted, chosen or uploaded, and the pasted ones carry the copy above. |
| Paperwork | A read-me for the buyer and the full SIL OFL text of the embedded face. |

`Kit marketplace` builds all of it and hands back one ZIP:

```
doodlegen-<subject>-<style>-<layout>/
  01-PRINT-FILES/       A4 and US Letter PDFs
  02-LISTING-IMAGES/    the twelve listing canvases, PNG
  03-LISTING-COPY/      etsy.txt, tpt.txt, gumroad.txt, shopee.txt,
                        tokopedia.txt, pinterest.txt
  04-UPLOAD-STEPS/      the same six channels, as add-product walkthroughs
  05-SVG-EDITABLE/      one SVG per worksheet
  READ-ME-FIRST.txt
  FONT-LICENSE.txt
```

**A listing needs a set of pictures, not a picture.** A cover sells the
idea; the rest answer the questions that stop a digital sale. The contents
grid draws every page in the pack, because a buyer of a 26-page PDF cannot
open it before paying and that is the thing they are actually asking. The
mockup shows the sheets as paper with a crayon beside them, because a flat
PDF thumbnail reads as a file rather than as the afternoon someone is
shopping for. The steps card says nothing is shipped and how the file
arrives — the question Indonesian sellers otherwise answer in chat all day.
Past thirty pages the grid samples evenly and says so rather than shrinking
the thumbnails into a texture.

Everything is drawn on a canvas from the same page plans as the PDF, crayons
included: a mockup built on someone else's stock photo would carry someone
else's licence into the seller's shop.

**Copy is only half of a listing.** Knowing what to write is not the same as
knowing where it goes, and the field that stops a first-time seller is never
the description — it is `Berat`, which Shopee makes mandatory on a product
with no parcel behind it, or Etsy's `Type`, which quietly replaces the whole
shipping section once it is set to Digital. So each marketplace tab in the
kit, and each file in `04-UPLOAD-STEPS`, is that marketplace's own form in its
own order and its own interface language: 100 gram and the cheapest courier
for Shopee, 70 characters and no phone number in the description for
Tokopedia, quantity 999 and a five-file 20 MB ceiling for Etsy, the page count
and grade band for TPT, a permalink and a refund policy for Gumroad, a
destination link for Pinterest. The generated title, description and tags sit
in the steps that ask for them, with their counters, so the whole listing is
filled from one screen — and where a marketplace has no field at all for
something, such as tags on Shopee and Tokopedia, the guide says so instead of
pretending otherwise.

**The keywords come out of the config, and each channel gets them where it
reads them.** A fixed keyword list would describe a fixed product, and this
one is not: an outline pack is bought by someone searching for colouring
pages, a progressive pack by someone searching for handwriting practice, and
a numbers pack by someone who typed the range. So `lib/seo.ts` derives a
focus phrase and a long-tail pool from the same config that drew the pages —
which also stops two packs from one studio competing for the same phrase.

Where those words are allowed to work is not the same on any two channels,
and that is the whole reason the file exists apart from the copy:

| Channel | What ranks | What the draft does about it |
| --- | --- | --- |
| Etsy | Tags and title, matched against the query together; descriptions do not rank | All 13 tag slots filled with two-word-and-up phrases, and the tags that fitted are repeated verbatim in the title. The phrase still opens the description, because Google quotes the first ~160 characters. |
| TPT | Grade, subject and resource-type facets first, keywords second | The facets are answered from the character set in the upload guide; the title reads as a teacher would search. |
| Gumroad | Category and sales; prose barely counts | A short, legible name. No keyword tail. |
| Shopee | The product name, and nothing else — there is no tag field | A name in Shopee's own Merek + Jenis Produk + Spesifikasi order, then a keyword tail, stopping at ~165 of the 255 the form allows. |
| Tokopedia | The name *and* the description | 70 characters of name carrying the phrase, and the phrase again in the first sentence of the body. |
| Pinterest | Title, description, board name and alt text, as prose | Sentences, not a pile of hashtags. |

The body is written off the config for the same reason: a pack drawn in
strokes wide enough for a three-year-old's fist and one ruled for a child
already writing between lines used to describe themselves identically. And
the tagline the seller typed for the cover now opens the listings written in
the language they typed it in — it is the one sentence in the whole pack in
their own voice, and only the cover was using it.

None of that is asserted, it is checked: `verify:listing` fails the build if
the focus phrase is missing from a title, if fewer than two of Etsy's top
tags reach its title, if a tag slot is left empty or two tags carry the same
search, if a word appears in a title more than twice — that is stuffing, and
every marketplace here ranks it down — if Shopee's name wastes the only
field its search engine reads, or if the pack ships editable SVGs that no
description mentions.

**Ranking is not the only way a listing dies.** A seller pasted one of these
descriptions into Shopee's *Tambah Produk* form and the field turned yellow:
*"Terdeteksi mengandung produk yang dilarang atau dalam pengawasan"*, hold
1×24 hours for review. Nothing in the pack broke a rule; three habits of the
copy did. Every marketplace here reads a listing with a scanner before a
human sees it, and `lib/policy.ts` now holds what those scanners are looking
for, per marketplace, as rules a script can fail on:

| What is banned | Where it came from | What the draft does now |
| --- | --- | --- |
| Someone else's brand name in a title, description or tag | Shopee's HAKI policy on listings; Etsy's trademark policy, which counts a brand name as a keyword even under "compatible with" | The SVG line names the capability, not the tools: *terbuka di aplikasi desain vektor dan mesin potong* |
| Links, emails, phone numbers, a rival marketplace's name — anything that finishes the sale elsewhere | Shopee's prohibited-listing rules and Tokopedia's moderation rules | Delivery is named and named *inside* the lapak: the PDF arrives in Shopee's or Tokopedia's own order chat |
| The vocabulary of restricted digital goods — accounts, subscriptions, vouchers, credit, activation codes | Shopee's list of digital products only approved sellers may sell | The copy says what the thing is: a print-at-home PDF, sent after payment, with no parcel shipped |
| Promotional shouting in an Indonesian product name — *gratis*, *diskon*, *termurah*, *best seller* | Shopee's product-name and spam guidance | The name stays Merek + Jenis Produk + Spesifikasi; promotions live in the promo tools |

Two of the rules run the other way and require something to be *said*: that
no physical item ships and how the file reaches the buyer, on Shopee and
Tokopedia, and what licence the buyer gets, on Etsy, TPT and Gumroad. A
description that leaves those out is the one that ends in a dispute rather
than in a review.

The book categories on both Indonesian lapak are policed for scanned and
pirated titles, so a PDF listed among printed books is read against that
suspicion first — the Indonesian terms block now states, in one line, that
the pages are the shop's own work rather than a scan.

The same check runs over the words the *seller* typed, because a shop name, a
tagline and a custom product title all reach the listing through the same
fields: a brand borrowed into a shop name, a phone number in a tagline, a
discount shouted in a title. The studio shows what it found above the copy,
before anything is pasted, and each marketplace tab and text file carries that
marketplace's rules under the draft. `verify:listing` fails if any generated
draft trips a rule, and — because a linter nobody has seen fail is not a
linter — it also types one violation into every seller field and fails if the
check lets it through.

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
before they pay, so it is the one page that gets options — twelve of them, in
three groups.

Two follow the grammar of a *published* book rather than of a coloring book,
because that is what a shelf, and a marketplace grid, have trained a buyer to
read. Both put the title in a masthead panel across the head of the page, the
art in one window under it, and the imprint alone at the foot beneath a
hairline — never at the top, where every other composition here puts the brand
— set in tracked-out small caps, the way a publisher's name has always been
set. *Buku Toko* floods the page with colour and shows a pair of characters,
one already coloured and one still dotted, at a size that reads across a shop.
*Buku Latihan* turns the colour down to a tint, rules a border around the
page, and grids four examples into its plate — the school workbook, and the
cheapest cover here to print after Minimalis. Both plates are cut to what is
on them rather than to the room left over: a pair of letters stranded in a
tall panel reads as a mistake, and the colour breathing around the art is what
the shelf look is made of.

Six more are built to be loud, because that is what a children's coloring book
looks like on a shelf: *Balon Kata* puts a rainbow title inside a big speech
balloon; *Kilau* fires a starburst behind a scalloped cloud panel; *Pelangi*
arches a rainbow over the title with a cloud on each foot; *Jalan Warna* runs
a winding road across the page with the samples riding it; *Stiker* gives each
sample its own outlined card under a strip of tape; *Bingkai Ceria* tiles
stars, sparkles and dots into wallpaper and cuts a title panel out of it.

Four are quiet: *Klasik* centres the title over a strip of three samples;
*Poster* blows one character up to the height of the page, which is what
survives being shrunk to a marketplace thumbnail; *Etalase* grids four samples
over a left-aligned title block; *Minimalis* is type between two hairlines on
bare paper, and the cheapest of the twelve to print. The choice carries into
the listing images too — the sheet mockups fan, stand alone, tile or line up to
match, and the ground and the rainbow title come across with them — so the
shop front and the file agree.

**What a cover does not say.** No page count, no "300 DPI", no reprint
licence. Those are true, and they belong in the listing where a buyer reads
them before paying — printed on the title page of a file somebody has already
bought, they read as a spec sheet stapled to the front of a book. What is left
is the pack's name, the shop's name, and one line of the seller's own words if
they want one.

**The art is generated, not imported.** Balloons, bursts, sparkles, clouds,
ribbons and arches are built from parametric outlines in `lib/doodles.ts`,
using the constructions any SVG blob or starburst tool uses — points sampled
around an ellipse and joined with a Catmull-Rom spline, an alternating-radius
polygon, a run of semicircles laid on a rectangle's edges. Shipping clip art
instead would mean RGB colour in a CMYK file, someone else's licence in the
repo, and a raster or a foreign coordinate space in a pipeline that has
neither. Generated, a doodle is print colour from the first line, scales to
any paper, is identical in the preview and the print, and costs no bytes.

**The inside carries nothing but the exercise.** A worksheet draws the
characters, the guide lines, an optional title and a numbered footer, and
that is the whole list — no border, no stars, no boxes in the corners. The
decoration all lives on the cover, which is where a buyer looks and where a
second plate of ink can be justified. This is a rule in the layout engine
rather than a setting: `frameFor` hands the entire safe area to the work, and
a worksheet's `shapes` list is empty by construction, so there is no width to
tune and no way for an ornament to reach a tracing row.

The reasoning is worth keeping written down, because a border is the obvious
thing to add and the arguments against it are not obvious. It costs work
area: the band has to come out of the safe area before the title, the footer
or a single row is placed, and at the 7 % it used to take, an A4 worksheet
kept 78 % of its area and a traced capital lost nearly a tenth of its height
— paid by the youngest hands, who need the size most. It costs attention:
the *seductive details* effect is the finding that interesting but irrelevant
material added to a lesson reduces retention and transfer, modestly but
consistently across meta-analyses, which is Mayer's coherence principle in
practice; Fisher, Godwin and Seltman (2014) found kindergarteners in heavily
decorated *rooms* further off task, which is a weaker claim about a different
thing but points the same way. And it costs contrast where a four-year-old is
trying to follow a dotted line. A cover can carry all the noise the shelf
wants; the page the child works on should not have to.

That is also why a worksheet never gets a printed tint, only ever K-only
line work: crayon is translucent, so a printed ground swallows a child's own
colour instead of adding to it, and colour on the inside would cost a second
plate on press, muddy every photocopy and drain a home printer for nothing.

**Colour, where it pays for itself.** Seven palettes — Senja, Krayon, Pop,
Permen, Rimba, Pastel and Hitam Putih — colour the cover page and the listing
images: a tinted card or a flooded ground, confetti in the border band a dot
can never land on a word in, a headline spelled out one letter at a time in
the palette's own ramp, and sample characters shown already coloured in, next
to one still empty. Hitam Putih has no colour to lend, so the loud
compositions draw themselves as line art rather than quietly refusing — the
same balloon, the same arch, one plate of black. That last pair is the whole product in one picture: what the child
starts with, and what they end up with. Worksheets stay K-only whatever is
picked, because colour there would cost a second plate on press, muddy every
photocopy and drain a home printer for nothing.

**The interface is set, not styled.** The studio and the landing page are set
in Archivo — the family Archivo Black, one of the worksheet faces, comes from —
self-hosted as one 50 KB variable file covering 400 to 700, and precached with
the shell so an offline visit is not a different-looking app. It is there for
its tabular figures as much as its shapes: page counts, pixel sizes and paper
dimensions are set in `tnum`, so a number changing under the cursor never
nudges the words beside it. Colour is one warm scale with a role per step —
ground, surface, sunk well, two borders, three text levels — rather than three
greys picked by eye, which is the discipline Radix Colors argues for. And the
preview is furniture, not a card: the sheet lies on a sunk, faintly gridded
bench under real crop marks, with a slug of specs beside it, because the thing
being made is a printed page and it should look like one on screen too.

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

## Installing it as an app

DoodleGen is a proper installable app, not a page with a manifest bolted on.
Chrome, Edge and Android offer the install themselves; the header carries a
**Pasang aplikasi** button that fires the same prompt, and it only appears when
a browser has actually offered one — a button that cannot install is worse than
no button. Safari never offers, so on iOS the button opens a sheet naming the
two taps (Bagikan → Tambahkan ke Layar Utama) instead, and a declined
invitation is remembered for a month rather than shown every visit.

**It opens the tool, not the pitch.** `start_url` is `/studio/`: the landing
page sells the thing, and an installed app should not have to be sold to
again. `scope` stays at `/`, so the landing page is still part of the app when
linked from inside it, and `handle_links` plus a `navigate-existing` launch
handler mean a shared setup link opens in the window already running rather
than a second copy of it.

**Long-press shortcuts** go straight to the three packs worth starting from —
alfabet, tracing, angka — using the same `#p=` links the landing page uses, so
a shortcut and a link land on exactly the same setup.

**Sharing a pack does not mean uploading one.** There is no file host here,
and adding one would trade the guarantee above for a convenience. So the two
things a seller actually wants both stay client-side. *Kirim* passes the PDFs
straight to the device's own share sheet through the Web Share API — the bytes
go from the tab into WhatsApp or a mail client without a server in between —
and where a browser will not take files, the same button copies a link
instead, so it is never the button that does nothing. That link carries the
setup in its hash and `?auto=1` in its query, and the studio builds on arrival
rather than waiting to be pressed: what the recipient opens is the pack, not a
form. The flag is cleared as it fires, so a reload is quiet, and the setup
rides in the hash precisely because no host ever sees one. Links are built on
`NEXT_PUBLIC_SITE_URL` rather than on `location.href`, or a link copied from a
dev server or a preview deploy would carry that host into somebody's chat.

**Offline is the point, not a bonus.** Every PDF is built in the browser, so
once the shell, the interface face and the worksheet face are cached there is
nothing left to fetch. The worker serves the document that was asked for,
falls back to the studio for a page never visited, and only shows a plain
offline card if even the shell failed to cache. Navigation preload is on, so
being offline-capable costs no latency when the network is there.

**Updates are offered, never taken.** Nothing calls `skipWaiting()` on install:
a new build installs quietly behind the running one, and the page shows a
"Versi baru" bar. The reload happens when the user says so, because the studio
holds unsaved settings and possibly a half-finished export. Hosts must serve
`/sw.js` with `max-age=0, must-revalidate` — both `netlify.toml` and
`vercel.json` already do — or clients pin an old shell forever.

**What the install dialog shows** is the app itself: `npm run screenshots`
drives a real browser over the built export and captures the wide and narrow
shots the manifest lists, at exactly the pixel sizes it claims. Run it after
`npm run build`, and `npm run icons` for the icon set, the maskable variants
and the shortcut tiles. `npm run verify:pwa` then checks the lot in a real
browser: that every declared asset is the size it claims, that the app still
renders with the network cut, that the install button stays hidden until a
browser offers an install, and that a new build waits to be let in.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Static export to `out/` |
| `npm run typecheck` | TypeScript, no emit |
| `npm run samples` | Renders sample PDFs across layouts into `.samples/` |
| `npm run verify` | Checks those PDFs against the table above |
| `npm run verify:listing` | Checks every marketplace draft against that marketplace's limits and its ranking surface, and every upload guide against the draft it pastes |
| `npm run verify:pwa` | Checks the manifest's assets, the offline shell, the install offer and the update handshake |
| `npm run fonts` | Rebuilds `public/fonts` from upstream (see `FONTS.md`) |
| `npm run icons` | Regenerates the logo, favicon, PWA icons and the social card |
| `npm run screenshots` | Recaptures the manifest's install-dialog screenshots from `out/` |

`verify`, `verify:pwa` and `screenshots` drive a real browser. Either run
`npx playwright install chromium` once, or point `CHROMIUM_PATH` at a browser
you already have. `verify:pwa` and `screenshots` read the built
export, so `npm run build` comes first.

`fonts` needs Python with `fonttools` and `skia-pathops`
(`pip install fonttools skia-pathops`). The built fonts are committed, so this
is only needed when adding or changing a face.

## Fonts and licensing

All four faces are SIL OFL 1.1: commercial use, embedding and resale of the
resulting PDFs are all permitted. The build pipeline, the modifications made,
and why one face had to be renamed are documented in **[FONTS.md](FONTS.md)**.

The interface glyphs are Lucide, ISC-licensed and vendored rather than
installed; the option marks beside them are drawn here because they are
schematics of this product's own compositions. Which is which, and why, is in
**[ICONS.md](ICONS.md)**.

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
  InstallPrompt.tsx The install button, and Safari's two taps
  ServiceWorkerRegistrar.tsx  Worker registration and the update bar
  Theme.tsx         Light / dark / system, and the pre-paint script
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
  download.ts       Saving a file, and handing one to the device's share sheet
  pwa.ts            Install offers, standalone detection
  naming.ts         Product titles, slugs, file names
  fontStore.ts      Font loading, parsing and caching
  presets.ts        Papers, faces, styles, layouts, inks, starter packs
  charset.ts        Character set construction and validation
  wordlists.ts      Ready-made word sets for the word mode
  svgdoc.ts         Plan to a standalone SVG file, for Canva and Cricut
  palette.ts        The seven CMYK palettes
  covers.ts         The twelve cover compositions, page and listing image
  doodles.ts        Generated cover art: blobs, bursts, clouds, arches
scripts/            Font pipeline, icon and social card generation, QA tools
public/fonts/       Built faces plus their OFL texts
public/ISC-lucide.txt  The icon set's licence, shipped with the site
public/sw.js        Service worker: shell cache, offline, update handshake
public/screenshots/ What the install dialog shows, shot from the real app
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

## Light and dark

The palette is a set of roles, not a set of values: `paper` is the ground,
`surface` is what is raised off it, `sunk` is a well cut into it, and there are
three ink levels and two line weights. Each role is a CSS custom property in
`app/globals.css`, stated once for light and once for dark, and
`tailwind.config.ts` wraps it so `bg-surface/90` still folds its opacity in.
Nothing in the markup knows which theme is running.

The choice is light, dark, or follow the device, and it survives a reload: the
explicit ones write `data-theme` on the document, and a tiny script inlined in
the head applies it before the first paint, so a dark-set device never gets a
white flash. The dark palette lifts the accent until it clears 4.5:1 on a
near-black ground and turns the text on top of a filled accent dark, because
white on a lifted orange is the one pairing that stops being readable.

Two things stay put in both themes. The sheet is white, because it is going to
be printed on white paper and a proof that dims with the interface is lying
about what comes out of the printer; and the scrim under a dialog is a fixed
dark wash, so a modal dims the page at both ends of the day.
