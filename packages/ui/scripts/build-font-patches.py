import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
fontsource = root / "node_modules" / "@fontsource-variable"
donors = Path(sys.argv[1]) if len(sys.argv) > 1 else None
out = root / "src" / "fonts"
out.mkdir(parents=True, exist_ok=True)


def rename(font, family):
    for record in font["name"].names:
        if record.nameID in (1, 16):
            record.string = family
        elif record.nameID in (4, 6):
            record.string = family.replace(" ", "")


def run_subset(font, unicodes):
    options = subset.Options()
    options.layout_features = []
    options.notdef_outline = True
    options.name_IDs = [1, 2, 3, 4, 5, 6]
    options.glyph_names = False
    options.hinting = False
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)


def build_apostrophe_patch(family_folder, display_name, output_name):
    source = fontsource / family_folder / "files" / f"{family_folder}-latin-wght-normal.woff2"
    font = TTFont(source)
    run_subset(font, [0x2018, 0x2019])
    best = font.getBestCmap()
    turned_comma = best[0x2018]
    apostrophe = best[0x2019]
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap[0x02BB] = turned_comma
            table.cmap[0x02BC] = apostrophe
    rename(font, display_name)
    font.flavor = "woff2"
    font.save(out / output_name)
    print(output_name, (out / output_name).stat().st_size)


def build_cyrillic_patch(donor_root, output_name):
    source = donor_root / "files" / "onest-cyrillic-ext-wght-normal.woff2"
    font = TTFont(source)
    run_subset(font, [0x0492, 0x0493, 0x049A, 0x049B, 0x04B2, 0x04B3])
    rename(font, "Joy Cyrillic Patch")
    font.flavor = "woff2"
    font.save(out / output_name)
    print(output_name, (out / output_name).stat().st_size)


build_apostrophe_patch("manrope", "Joy Manrope Patch", "manrope-patch.woff2")
build_apostrophe_patch("jetbrains-mono", "Joy Mono Patch", "jetbrains-mono-patch.woff2")
if donors is not None:
    build_cyrillic_patch(donors, "cyrillic-patch.woff2")
