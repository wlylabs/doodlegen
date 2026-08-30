#!/usr/bin/env python3
"""
Builds the four worksheet faces, and the one interface face, shipped in
public/fonts.

Every source is SIL OFL 1.1, which allows commercial use, modification and
redistribution — the licence position DoodleGen output depends on.

Three transforms are applied, in this order:

1. Variable fonts are instanced to a single fixed weight, so the file the
   browser loads is the weight the design actually calls for.
2. Overlapping contours are unioned away. This is the important one: most
   type designers let a crossbar overlap the stems because a *filled* glyph
   looks identical either way. DoodleGen strokes the outline instead, which
   would otherwise draw every internal seam as a visible line.
3. The result is subset to printable ASCII plus a little punctuation, cutting each file to a fraction
   of its original size.

Andika carries the Reserved Font Names "Andika" and "SIL". OFL 1.1 clause 3
forbids a modified version from using them, so that face is renamed. The
other three carry no reserved name and keep theirs.

The interface face is built differently, because the screen fills its glyphs
rather than stroking them: no overlaps are removed (there is nothing to see),
the weight axis is kept rather than pinned, and the file is written as woff2,
which only the browser has to read. Its numerals are the reason it is here —
Archivo carries real tabular figures, and a page of print specs that does not
shift as it counts is the whole point.

Requires: pip install fonttools skia-pathops brotli
Usage:    python3 scripts/build-fonts.py
"""
from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.ttLib.removeOverlaps import removeOverlaps
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "fonts"
RAW = "https://raw.githubusercontent.com/google/fonts/main/ofl"

SOURCES = [
    {
        "dir": "baloo2",
        "file": "Baloo2%5Bwght%5D.ttf",
        "out": "Baloo2-ExtraBold.ttf",
        "instance": {"wght": 800},
        "rename": None,
    },
    {
        "dir": "archivoblack",
        "file": "ArchivoBlack-Regular.ttf",
        "out": "ArchivoBlack-Regular.ttf",
        "instance": None,
        "rename": None,
    },
    {
        "dir": "fredoka",
        "file": "Fredoka%5Bwdth%2Cwght%5D.ttf",
        "out": "Fredoka-SemiBold.ttf",
        "instance": {"wght": 600, "wdth": 100},
        "rename": None,
    },
    {
        "dir": "andika",
        "file": "Andika-Bold.ttf",
        "out": "DoodleGenSchool-Bold.ttf",
        "instance": None,
        # Andika reserves its name under OFL 1.1 clause 3; a modified build
        # may not ship under it.
        "rename": {
            "family": "DoodleGen School",
            "subfamily": "Bold",
            "postscript": "DoodleGenSchool-Bold",
        },
    },
]

# The interface face. Archivo is the family Archivo Black already comes from,
# so the studio and the worksheets are set in one superfamily — and it reserves
# no name, so a subset build keeps it.
UI_SOURCE = {
    "dir": "archivo",
    "file": "Archivo%5Bwdth%2Cwght%5D.ttf",
    "out": "Archivo-UI.woff2",
    # One file covers every weight the interface uses; the width axis is pinned
    # because nothing on screen varies it.
    "instance": {"wdth": 100, "wght": (400, 700)},
}

# What the interface itself is written in: ASCII, the punctuation the copy
# actually uses, and the few marks the UI draws as text.
UI_EXTRA_CODEPOINTS = [
    0x00A0, 0x00A9, 0x00AB, 0x00BB, 0x00B0, 0x00B7, 0x00D7, 0x00E9, 0x00ED,
    0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x2192,
    0x2212, 0x2248, 0x2713,
]

# Printable ASCII covers every worksheet character. These extras exist only
# so the optional page title can carry real typographic punctuation.
EXTRA_CODEPOINTS = [0x00A0, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026]

DERIVED_NOTE = (
    "Derived build for DoodleGen: contour overlaps removed and character set "
    "subset to printable ASCII. Distributed under the SIL Open Font License 1.1."
)


def fetch(url: str, target: Path) -> None:
    subprocess.run(
        ["curl", "-sSL", "--fail", "--max-time", "120", "-o", str(target), url],
        check=True,
    )


def rename(font: TTFont, spec: dict) -> None:
    full = f"{spec['family']} {spec['subfamily']}"
    values = {
        1: spec["family"],
        2: spec["subfamily"],
        3: f"{full}; DoodleGen derived build",
        4: full,
        6: spec["postscript"],
        16: spec["family"],
        17: spec["subfamily"],
    }
    table = font["name"]
    for record in list(table.names):
        # Name IDs 0 (copyright), 13 and 14 (licence) must survive intact.
        if record.nameID in values:
            table.setName(
                values[record.nameID], record.nameID, record.platformID,
                record.platEncID, record.langID,
            )
    for name_id, value in values.items():
        if not table.getDebugName(name_id):
            table.setName(value, name_id, 3, 1, 0x409)


def note(font: TTFont) -> None:
    font["name"].setName(DERIVED_NOTE, 10, 3, 1, 0x409)


def shrink(font: TTFont) -> None:
    options = subset.Options()
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.notdef_outline = True
    options.drop_tables += ["DSIG"]
    options.recalc_bounds = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=[*range(0x20, 0x7F), *EXTRA_CODEPOINTS])
    subsetter.subset(font)


def build_ui(work: Path) -> None:
    """The interface face: filled on screen, so it keeps its overlaps."""
    src = work / f"{UI_SOURCE['dir']}.ttf"
    fetch(f"{RAW}/{UI_SOURCE['dir']}/{UI_SOURCE['file']}", src)
    fetch(f"{RAW}/{UI_SOURCE['dir']}/OFL.txt", OUT / f"OFL-{UI_SOURCE['dir']}.txt")

    font = instancer.instantiateVariableFont(
        TTFont(src), UI_SOURCE["instance"], updateFontNames=False
    )
    options = subset.Options()
    # tnum and lnum are the reason this face was picked: specs, page counts and
    # pixel sizes are set in tabular lining figures so columns of them line up.
    options.layout_features = [
        "ccmp", "liga", "kern", "locl", "tnum", "lnum", "case", "frac", "zero",
    ]
    options.name_IDs = ["*"]
    options.name_legacy = True
    options.recommended_glyphs = True
    options.notdef_outline = True
    options.drop_tables += ["DSIG"]
    options.flavor = "woff2"
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=[*range(0x20, 0x7F), *UI_EXTRA_CODEPOINTS])
    subsetter.subset(font)

    target = OUT / UI_SOURCE["out"]
    font.save(target)
    size = target.stat().st_size / 1024
    print(f"{UI_SOURCE['out']:<32} {font['name'].getDebugName(4):<26} {size:7.1f} KB")


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        for source in SOURCES:
            src = work / f"{source['dir']}.ttf"
            fetch(f"{RAW}/{source['dir']}/{source['file']}", src)
            licence = OUT / f"OFL-{source['dir']}.txt"
            fetch(f"{RAW}/{source['dir']}/OFL.txt", licence)

            font = TTFont(src)
            if source["instance"]:
                font = instancer.instantiateVariableFont(
                    font, source["instance"], inplace=True, updateFontNames=True
                )
            removeOverlaps(font)
            shrink(font)
            if source["rename"]:
                rename(font, source["rename"])
            note(font)

            target = OUT / source["out"]
            font.save(target)
            size = target.stat().st_size / 1024
            print(f"{source['out']:<32} {font['name'].getDebugName(4):<26} {size:7.1f} KB")

        build_ui(work)
    return 0


if __name__ == "__main__":
    sys.exit(main())
