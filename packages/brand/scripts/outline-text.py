import io
import json
import sys
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

root = Path(__file__).resolve().parent.parent
font_path = (
    root.parent
    / "ui"
    / "node_modules"
    / "@fontsource-variable"
    / "unbounded"
    / "files"
    / "unbounded-latin-wght-normal.woff2"
)
out_directory = root / "src" / "generated"

def fmt(value):
    rendered = f"{value:.1f}"
    if rendered.endswith(".0"):
        rendered = rendered[:-2]
    return "0" if rendered == "-0" else rendered


def split_contours(recording):
    contours = []
    current = []
    for operator, operands in recording:
        if operator in ("closePath", "endPath"):
            contours.append(current)
            current = []
        else:
            current.append((operator, operands))
    return contours


def contour_points(contour):
    return [p for _, operands in contour for p in operands if p is not None]


def contour_box(contour):
    points = contour_points(contour)
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return min(xs), min(ys), max(xs), max(ys)


def render_contour(contour, offset_x, offset_y):
    svg_pen = SVGPathPen(None, ntos=fmt)
    pen = TransformPen(svg_pen, (1, 0, 0, -1, offset_x, offset_y))
    for operator, operands in contour:
        getattr(pen, operator)(*operands)
    pen.closePath()
    return svg_pen.getCommands()


def outline(text, weight, tracking, space_scale, accent_character=None):
    font = TTFont(font_path)
    font = instancer.instantiateVariableFont(font, {"wght": weight})
    font.flavor = None
    buffer = io.BytesIO()
    font.save(buffer)

    hb_font = hb.Font(hb.Face(buffer.getvalue()))
    hb_buffer = hb.Buffer()
    hb_buffer.add_str(text)
    hb_buffer.guess_segment_properties()
    hb.shape(hb_font, hb_buffer, {"kern": True, "liga": False})

    glyph_order = font.getGlyphOrder()
    glyph_set = font.getGlyphSet()
    os2 = font["OS/2"]

    cursor = 0.0
    placed = []
    infos = hb_buffer.glyph_infos
    positions = hb_buffer.glyph_positions
    for index, (info, position) in enumerate(zip(infos, positions)):
        character = text[info.cluster]
        advance = position.x_advance * (space_scale if character == " " else 1)
        placed.append((glyph_order[info.codepoint], character, cursor + position.x_offset))
        cursor += advance + (tracking if index < len(infos) - 1 else 0)

    items = []
    for name, character, x in placed:
        if character == " ":
            continue
        pen = DecomposingRecordingPen(glyph_set)
        glyph_set[name].draw(pen)
        for contour in split_contours(pen.value):
            low_x, low_y, high_x, high_y = contour_box(contour)
            items.append(
                {
                    "character": character,
                    "x": x,
                    "contour": contour,
                    "box": (low_x + x, low_y, high_x + x, high_y),
                }
            )

    min_x = min(item["box"][0] for item in items)
    max_x = max(item["box"][2] for item in items)
    min_y = min(item["box"][1] for item in items)
    max_y = max(item["box"][3] for item in items)

    accent_item = None
    if accent_character is not None:
        candidates = [item for item in items if item["character"] == accent_character]
        accent_item = max(candidates, key=lambda item: item["box"][3])

    body_parts = []
    accent_part = ""
    for item in items:
        d = render_contour(item["contour"], item["x"] - min_x, max_y)
        if item is accent_item:
            accent_part = d
        else:
            body_parts.append(d)

    result = {
        "text": text,
        "weight": weight,
        "tracking": tracking,
        "unitsPerEm": font["head"].unitsPerEm,
        "capHeight": os2.sCapHeight,
        "xHeight": os2.sxHeight,
        "width": round(max_x - min_x, 1),
        "height": round(max_y - min_y, 1),
        "baseline": round(max_y, 1),
        "path": "".join(body_parts),
        "accentPath": accent_part,
    }
    if accent_item is not None:
        box = accent_item["box"]
        result["accent"] = {
            "x": round(box[0] - min_x, 1),
            "y": round(max_y - box[3], 1),
            "width": round(box[2] - box[0], 1),
            "height": round(box[3] - box[1], 1),
        }
    return result


jobs = {
    "wordmark": dict(text="Joy Music", weight=700, tracking=-10, space_scale=1.0, accent_character="i"),
    "tagline": dict(text="SCAN \u00b7 ORDER \u00b7 DANCE", weight=500, tracking=110, space_scale=0.9),
}

out_directory.mkdir(parents=True, exist_ok=True)
for name, job in jobs.items():
    result = outline(**job)
    target = out_directory / f"{name}.json"
    target.write_text(json.dumps(result, indent=1) + "\n")
    print(f"wrote {target.relative_to(root)} {result['width']}x{result['height']}")
