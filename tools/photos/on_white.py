#!/usr/bin/env python3
"""
One dish photograph on WHITE, cropped to the plate — for a place on the white
page where the plate should sit with no ground of its own. The home page's
"All in one" feature is the one such place: the owner asked for the long plate
there, bigger, with no background.

    python3 tools/photos/on_white.py <originals-dir> <work-dir> <slug> <out-slug>
    python3 tools/photos/on_white.py originals work teriyaki long-plate

Everything that makes the plate is plate.py's: the same source (sources.json),
the same food mask (<work-dir>/masks/<slug>.png, from cut.py), the same
silhouette — so a source whose frame clips the plate is closed the same way —
and the same two-layer synthetic shadow. Only the ground and the canvas differ:
the ground is the page's own #FFFFFF, so there is no edge where the picture
meets the page, and the canvas is the plate and its shadow rather than a 3:2
frame, so the plate fills whatever width the layout gives it.

Writes <out-slug>-400/800/1200 .webp and .jpg into assets/img/dish and prints
the 1200 size for photoDims in src/data.js.

    pip install numpy pillow scipy
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from plate import silhouette, ASSETS, WIDTHS   # noqa: E402

WHITE = (255, 255, 255)
SHADOW = (58, 40, 26)            # plate.py's shadow colour


def on_white(rgba):
    al = rgba.split()[3]
    cut = rgba.crop(al.point(lambda v: 255 if v > 20 else 0).getbbox())
    w, h = cut.size
    # plate.py's shadow, scaled to the plate: there a plate about 780 px tall
    # casts one offset 22 px and blurred 30 px, and a tighter one at 6 / 9 px.
    k = h / 780
    pad = round(max(w, h) * .2)      # room for the whole shadow; the crop below takes it back
    W, H = w + 2 * pad, h + 2 * pad
    x, y = pad, pad
    a = cut.split()[3]
    canvas = Image.new('RGB', (W, H), WHITE)
    dark = Image.new('RGB', (W, H), SHADOW)
    def shadow(offset, blur, opacity):
        sh = Image.new('L', (W, H), 0); sh.paste(a, (x, y + round(offset)))
        sh = sh.filter(ImageFilter.GaussianBlur(blur)); return sh.point(lambda v: int(v * opacity))
    for sh in (shadow(22 * k, 30 * k, .22), shadow(6 * k, 9 * k, .16)):
        canvas = Image.composite(dark, canvas, sh)
    canvas.paste(cut, (x, y), cut)
    # Crop to what is not white — the plate and the visible part of its
    # shadow — with a hair of margin. On a white page the margin is invisible,
    # so the tighter the crop, the bigger the plate at a given width.
    arr = np.asarray(canvas).astype(int)
    ys, xs = np.where(arr.min(axis=2) < 254)
    m = round(max(w, h) * .015)
    box = (max(xs.min() - m, 0), max(ys.min() - m, 0), min(xs.max() + m + 1, W), min(ys.max() + m + 1, H))
    return canvas.crop(box)


def main():
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    originals, work, slug, out_slug = sys.argv[1:]
    src = json.load(open(os.path.join(HERE, 'sources.json')))[slug]
    fname = src['file'] if isinstance(src, dict) else src
    a = np.asarray(Image.open(os.path.join(originals, fname)).convert('RGB')).astype(np.float32)
    food = np.asarray(Image.open(os.path.join(work, 'masks', f'{slug}.png'))).astype(np.float32) / 255
    rgba, _ = silhouette(a, food)
    final = on_white(rgba)
    for w in WIDTHS:
        im = final.resize((w, round(w * final.height / final.width)), Image.LANCZOS)
        im.save(os.path.join(ASSETS, f'{out_slug}-{w}.webp'), 'WEBP', quality=84, method=6)
        im.save(os.path.join(ASSETS, f'{out_slug}-{w}.jpg'), 'JPEG', quality=86, optimize=True, progressive=True)
    print(f"'{out_slug}': [{WIDTHS[-1]}, {round(WIDTHS[-1] * final.height / final.width)}],  from {fname} ({final.width}x{final.height} before resizing)")


if __name__ == '__main__':
    main()
