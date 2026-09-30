import json
import re
import sys
from pathlib import Path

from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
fonts_root = root / "node_modules" / "@fontsource-variable"

families = {
    "unbounded": "Unbounded",
    "manrope": "Manrope",
    "jetbrains-mono": "JetBrains Mono",
}

served_subsets = ["latin", "latin-ext", "cyrillic", "cyrillic-ext"]


def chars(text):
    return sorted({ord(c) for c in text})


required = {
    "uz-latin-letters": chars("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"),
    "uz-latin-apostrophes": [0x02BB, 0x02BC, 0x0027, 0x2018, 0x2019, 0x0060],
    "ru-cyrillic": chars("АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя"),
    "uz-cyrillic-extras": chars("ЎўҚқҒғҲҳ"),
    "digits-and-punctuation": chars("0123456789.,:;!?-–—…()[]{}/\\+×÷=<>%#@&*_|~^\"«»“”„"),
    "ui-symbols": chars("№·•→←↑↓✓°"),
    "currency": chars("$€₽"),
    "modifier-keys": chars("⌘⌥⇧⏎↵⌃"),
}

only_display_word = "Joy Music JOY MUSIC"


def parse_ranges(css_text):
    blocks = re.findall(
        r"/\* (?P<name>[a-z0-9\-]+)-wght-normal \*/\s*@font-face\s*\{[^}]*?unicode-range:\s*(?P<range>[^;]+);",
        css_text,
    )
    result = {}
    for name, unicode_range in blocks:
        subset = name.split("-", 1)[1] if name.count("-") >= 1 else name
        for candidate in ("cyrillic-ext", "latin-ext", "vietnamese", "cyrillic", "greek", "latin"):
            if name.endswith(candidate):
                subset = candidate
                break
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


report = {}
failed = False

for folder, display in families.items():
    package = fonts_root / folder
    ranges = parse_ranges((package / "wght.css").read_text())
    cmaps = {}
    for subset in served_subsets:
        path = package / "files" / f"{folder}-{subset}-wght-normal.woff2"
        font = TTFont(path)
        cmaps[subset] = set(font.getBestCmap().keys())
    per_group = {}
    for group, codepoints in required.items():
        missing = []
        served_by = {}
        for codepoint in codepoints:
            owners = [s for s in served_subsets if in_ranges(codepoint, ranges.get(s, []))]
            if not owners:
                missing.append(codepoint)
                continue
            if any(codepoint in cmaps[s] for s in owners):
                served_by[codepoint] = next(s for s in owners if codepoint in cmaps[s])
            else:
                missing.append(codepoint)
        per_group[group] = {
            "total": len(codepoints),
            "missing": [f"U+{cp:04X} {chr(cp)}" for cp in missing],
        }
    report[display] = per_group

hard_requirements = [
    "uz-latin-letters",
    "uz-latin-apostrophes",
    "ru-cyrillic",
    "uz-cyrillic-extras",
    "digits-and-punctuation",
]

for display, groups in report.items():
    print(f"== {display}")
    for group, data in groups.items():
        status = "ok" if not data["missing"] else "MISSING " + " ".join(data["missing"])
        print(f"  {group:26s} {data['total'] - len(data['missing'])}/{data['total']}  {status}")
        if data["missing"] and group in hard_requirements:
            failed = True

Path(root / "scripts" / "font-coverage.report.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n"
)

if failed:
    print("hard requirements not met")
    sys.exit(1)
