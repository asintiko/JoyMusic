import json
import re
import sys
from pathlib import Path

from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
fonts_root = root / "node_modules" / "@fontsource-variable"
patches_root = root / "src" / "fonts"

served_subsets = ["latin", "latin-ext", "cyrillic", "cyrillic-ext"]

patch_faces = {
    "Joy Manrope Patch": (patches_root / "manrope-patch.woff2", [(0x02BB, 0x02BC)]),
    "Joy Mono Patch": (patches_root / "jetbrains-mono-patch.woff2", [(0x02BB, 0x02BC)]),
    "Joy Cyrillic Patch": (
        patches_root / "cyrillic-patch.woff2",
        [(0x0492, 0x0493), (0x049A, 0x049B), (0x04B2, 0x04B3)],
    ),
}

stacks = {
    "display (Unbounded)": ["unbounded", "Joy Cyrillic Patch"],
    "sans (Manrope)": ["manrope", "Joy Manrope Patch", "Joy Cyrillic Patch"],
    "mono (JetBrains Mono)": ["jetbrains-mono", "Joy Mono Patch", "Joy Cyrillic Patch"],
}


def chars(text):
    return sorted({ord(c) for c in text})


required = {
    "uz-latin-letters": chars("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"),
    "uz-latin-apostrophes": [0x02BB, 0x02BC, 0x0027, 0x2018, 0x2019, 0x0060],
    "ru-cyrillic": chars("АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя"),
    "uz-cyrillic-extras": chars("ЎўҚқҒғҲҳ"),
    "digits-and-punctuation": chars("0123456789.,:;!?-–—…()[]{}/\\+×÷=<>%#@&*_|~^\"«»“”„"),
    "ui-symbols": chars("№·•°"),
    "currency": chars("$€₽"),
}

not_covered_by_design = {
    "arrows-and-check": chars("←→↑↓✓"),
    "modifier-keys": chars("⌘⌥⇧⏎↵⌃"),
}

hard_requirements = [
    "uz-latin-letters",
    "uz-latin-apostrophes",
    "ru-cyrillic",
    "uz-cyrillic-extras",
    "digits-and-punctuation",
    "ui-symbols",
    "currency",
]


def parse_ranges(css_text):
    result = {}
    for match in re.finditer(
        r"/\* (?P<name>[a-z0-9\-]+)-wght-normal \*/\s*@font-face\s*\{(?P<body>.*?)\}",
        css_text,
        re.S,
    ):
        name = match.group("name")
        subset = next(
            (
                candidate
                for candidate in ("cyrillic-ext", "latin-ext", "vietnamese", "cyrillic", "greek", "latin")
                if name.endswith(candidate)
            ),
            None,
        )
        unicode_range = re.search(r"unicode-range:\s*([^;]+);", match.group("body")).group(1)
        spans = []
        for part in unicode_range.split(","):
            part = part.strip().removeprefix("U+")
            if "-" in part:
                low, high = part.split("-")
                spans.append((int(low, 16), int(high, 16)))
            else:
                spans.append((int(part, 16), int(part, 16)))
        result[subset] = spans
    return result


def in_ranges(codepoint, spans):
    return any(low <= codepoint <= high for low, high in spans)


def load_family(folder):
    package = fonts_root / folder
    ranges = parse_ranges((package / "wght.css").read_text())
    faces = []
    for subset in served_subsets:
        path = package / "files" / f"{folder}-{subset}-wght-normal.woff2"
        faces.append((ranges[subset], set(TTFont(path).getBestCmap().keys())))
    return faces


def load_patch(name):
    path, spans = patch_faces[name]
    return [(spans, set(TTFont(path).getBestCmap().keys()))]


def resolve(codepoint, families):
    for label, faces in families:
        for spans, cmap in faces:
            if in_ranges(codepoint, spans) and codepoint in cmap:
                return label
    return None


report = {}
failed = False

for stack_name, members in stacks.items():
    families = []
    for member in members:
        if member in patch_faces:
            families.append((member, load_patch(member)))
        else:
            families.append((member, load_family(member)))
    print(f"== {stack_name}: {' -> '.join(members)}")
    stack_report = {}
    for group, codepoints in {**required, **not_covered_by_design}.items():
        served = {}
        missing = []
        for codepoint in codepoints:
            owner = resolve(codepoint, families)
            if owner is None:
                missing.append(f"U+{codepoint:04X} {chr(codepoint)}")
            else:
                served[owner] = served.get(owner, 0) + 1
        by_design = group in not_covered_by_design
        status = "ok" if not missing else ("system fallback / use icons" if by_design else "MISSING")
        detail = ", ".join(f"{k}:{v}" for k, v in served.items())
        print(f"  {group:24s} {len(codepoints) - len(missing):2d}/{len(codepoints):2d} {status:28s} {detail} {' '.join(missing) if missing and not by_design else ''}")
        stack_report[group] = {
            "total": len(codepoints),
            "missing": missing,
            "servedBy": served,
        }
        if missing and group in hard_requirements:
            failed = True
    report[stack_name] = stack_report

Path(root / "scripts" / "font-coverage.report.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n"
)

if failed:
    print("hard requirements not met")
    sys.exit(1)
print("all hard requirements met")
