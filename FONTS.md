# Font provenance and licensing

DoodleGen output is meant to be sold, so every face it can embed is under the
**SIL Open Font License 1.1**. The OFL permits commercial use, modification,
and redistribution — including embedding in the PDFs this tool produces, and
selling those PDFs. No face here is "free for personal use only".

The full licence text for each family ships alongside the fonts in
`public/fonts/OFL-*.txt` and is the authoritative version.

## What ships

| Preset | File | Upstream family | Upstream source | Licence |
| --- | --- | --- | --- | --- |
| Rounded | `Baloo2-ExtraBold.ttf` | Baloo 2 | [google/fonts `ofl/baloo2`](https://github.com/google/fonts/tree/main/ofl/baloo2) | OFL 1.1 |
| Sans Tebal | `ArchivoBlack-Regular.ttf` | Archivo Black | [google/fonts `ofl/archivoblack`](https://github.com/google/fonts/tree/main/ofl/archivoblack) | OFL 1.1 |
| Playful | `Fredoka-SemiBold.ttf` | Fredoka | [google/fonts `ofl/fredoka`](https://github.com/google/fonts/tree/main/ofl/fredoka) | OFL 1.1 |
| Sekolah | `DoodleGenSchool-Bold.ttf` | Andika (SIL) | [google/fonts `ofl/andika`](https://github.com/google/fonts/tree/main/ofl/andika) | OFL 1.1 |
| *Interface* | `Archivo-UI.woff2` | Archivo | [google/fonts `ofl/archivo`](https://github.com/google/fonts/tree/main/ofl/archivo) | OFL 1.1 |

## What was changed, and why

`scripts/build-fonts.py` rebuilds all four from upstream. It applies three
transforms, in order:

1. **Instancing.** Baloo 2 and Fredoka ship as variable fonts. They are pinned
   to a single instance (`wght 800`, and `wght 600 / wdth 100`) so the file the
   browser downloads is the weight the design actually calls for.

2. **Overlap removal.** This one matters most. Type designers routinely let a
   crossbar overlap the stems it joins, because a *filled* glyph looks
   identical either way. DoodleGen strokes the outline instead of filling it,
   which would otherwise draw every one of those internal seams as a visible
   line across the letter. Every glyph is unioned with skia-pathops so the
   contour is a single clean path.

3. **Subsetting.** Each face is cut to printable ASCII plus a little
   punctuation, taking the four files from 90–680 KB down to 17–37 KB. That is
   what makes it practical to embed the *complete* face in every PDF rather
   than a generator-side subset.

## The interface face

`Archivo-UI.woff2` is the only face here that is never embedded in a PDF: it
sets the studio and the landing page. It is built differently for that reason.

1. **No overlap removal.** The screen fills its glyphs; there are no internal
   seams to see, and removing them would only cost fidelity.
2. **The weight axis is kept**, 400 to 700, rather than pinned. One variable
   file is smaller than the two static weights the interface would otherwise
   load, and it can hold any weight in between.
3. **woff2, not TTF.** Only the browser reads it, and woff2 is roughly half
   the bytes — 50 KB for the whole range.

It is Archivo because Archivo Black, one of the worksheet faces, is its
sibling: the interface and the product it makes are set in one superfamily.
Its tabular figures are the working reason — page counts, pixel sizes and
paper dimensions are set in `tnum`, so a number changing under the cursor
never nudges the words beside it.

## The Andika rename

Andika reserves the names "Andika" and "SIL". OFL 1.1 clause 3 forbids a
modified version from shipping under a reserved name, and the overlap removal
above is a modification. The derived file is therefore released as
**DoodleGen School Bold**, with the original copyright and licence records in
the font's name table left untouched, as clause 2 requires.

The other three families reserve no name, so they keep theirs.

## Adding another face

1. Confirm the licence permits commercial use and embedding. OFL, Apache 2.0
   and CC0 are fine. "Free for personal use" is not.
2. Add an entry to `SOURCES` in `scripts/build-fonts.py` and run `npm run fonts`.
   An interface face goes in `UI_SOURCE` instead, and is registered in
   `tailwind.config.ts` and `app/globals.css` rather than in `lib/presets.ts`.
3. Register it in `FONTS` and `FONT_ORDER` in `lib/presets.ts`.
4. Run `npm run samples && npm run verify` to confirm the outlines stroke
   cleanly and nothing crosses the safe margin.
