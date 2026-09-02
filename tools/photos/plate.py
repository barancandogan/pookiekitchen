#!/usr/bin/env python3
"""
Step 2 of the dish-photo pipeline: from a source photograph and its food mask
to the finished, one-norm photograph in assets/img/dish/.

    python3 tools/photos/plate.py <originals-dir> <work-dir> [--ground F2EDE6]

The norm: the plate, whole, whitened, on the same warm light-grey ground as
every other dish, centred on a 3:2 canvas with one synthetic soft shadow, at
400/800/1200 px in WebP and JPEG.

Why it is built the way it is
-----------------------------
A white plate on a white backdrop is invisible to colour keys and to the
segmentation model alike: ISNet returns the food and drops most plates. So the
plate's silhouette is found *spatially* — the convex hull of the sharp edges
in the shot (the rim, and everything on the plate). The backdrop's soft shadow
has no sharp edge, so it stays outside. Plates are convex, so the hull is the
plate.

A dip bowl beside a plate of wings must not share that hull, or the two are
bridged by a wedge. The bowl is found by its sauce: a compact, smooth,
saturated disc with a bright, food-free ring around it (a sauce puddle *on* a
plate is surrounded by food and fails that test). The bowl gets a hull of its
own.

Inside the silhouette, backdrop-coloured pixels go to pure white — the plate's
own colour — while rim shading and food keep their values; everything outside
becomes the ground. The ground is deliberately not white: on white, the plate
disappeared and the food looked as if it floated.

    pip install numpy pillow scipy
"""
import argparse, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi
from scipy.spatial import ConvexHull

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, '..', '..', 'assets', 'img', 'dish'))
CW, CH = 1500, 1000                       # master canvas, 3:2
WIDTHS = (400, 800, 1200)
EDGE_T = 1.6                              # levels per pixel: a plate rim is sharper, a shadow is softer


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]; return (x * x + y * y) <= r * r

def hull_of(mask):
    ys, xs = np.where(mask); pts = np.stack([xs, ys], 1)
    if len(pts) < 3: return np.zeros_like(mask)
    h = ConvexHull(pts); poly = [tuple(map(int, pts[v])) for v in h.vertices]
    im = Image.new('L', mask.shape[::-1], 0); ImageDraw.Draw(im).polygon(poly, fill=255)
    return np.asarray(im) > 0


def silhouette(a, food):
    """RGBA of the plate (and any bowl) with backdrop-coloured pixels whitened."""
    H, W = a.shape[:2]
    bg = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), axis=0)
    d = np.abs(a - bg).max(axis=2)
    key = smooth(d, 10, 26)                                   # 0 = backdrop colour, 1 = clearly not
    # an envelope round everything that is not backdrop, so stray edges elsewhere are ignored
    notbg = ndi.binary_closing(np.maximum(food, key) > .12, structure=disk(4))
    lab, n = ndi.label(notbg)
    sizes = ndi.sum(notbg, lab, range(1, n + 1)); big = sizes.max()
    envelope = np.zeros_like(notbg)
    for i, sz in enumerate(sizes, 1):
        if sz >= .02 * big: envelope |= hull_of(lab == i)
    # sharp edges: the rim and the food, not the shadow
    L = a.mean(axis=2)
    gm = ndi.gaussian_gradient_magnitude(L, sigma=1.5)
    edges = ((gm > EDGE_T) | (food > .5)) & envelope
    # a dip bowl, by its sauce
    mx = a.max(axis=2); mn = a.min(axis=2)
    sat = (mx - mn) / np.maximum(mx, 1)
    cand = (sat > .35) & (mx > 100) & (gm < 6)
    cand = ndi.binary_fill_holes(ndi.binary_opening(cand, structure=disk(max(4, W // 250))))
    sl, sn = ndi.label(cand)
    bowls = np.zeros_like(edges); nb = 0
    foodhard = food > .5
    for i in range(1, sn + 1):
        reg = sl == i; area = reg.sum()
        if area < .0025 * H * W: continue
        if area / max(hull_of(reg).sum(), 1) < .55: continue        # not a compact disc
        r = np.sqrt(area / np.pi)
        dt = ndi.distance_transform_edt(~reg)
        ring = (dt > r * .15) & (dt <= r * .7)
        if foodhard[ring].mean() > .25: continue                    # food all round it: a puddle on the plate
        if np.median(mx[ring]) < 200: continue                      # a bowl's rim and the backdrop are bright
        # the bowl's white rim reaches well beyond its sauce; keep every edge
        # within a full sauce-radius of it out of the plate's hull
        bowls |= dt <= r * 1.0; nb += 1
    P0 = hull_of(edges & ~bowls)
    if nb: P0 |= hull_of(edges & bowls)
    P0 = ndi.binary_opening(P0, structure=disk(2))
    P = ndi.gaussian_filter(P0.astype(np.float32), 1.6)
    white = np.clip(a * (255.0 / np.maximum(bg, 1)), 0, 255)
    k = key[..., None]
    out = a * k + white * (1 - k)
    return Image.fromarray(np.dstack([out, P * 255]).astype(np.uint8), 'RGBA'), nb


def compose(rgba, ground):
    al = rgba.split()[3]
    cut = rgba.crop(al.point(lambda v: 255 if v > 20 else 0).getbbox())
    w, h = cut.size; s = min(.86 * CW / w, .78 * CH / h)
    cut = cut.resize((round(w * s), round(h * s)), Image.LANCZOS)
    x = (CW - cut.width) // 2; y = round(CH * .47 - cut.height / 2)
    a = cut.split()[3]
    canvas = Image.new('RGB', (CW, CH), ground)
    dark = Image.new('RGB', (CW, CH), (58, 40, 26))
    def shadow(offset, blur, opacity):
        sh = Image.new('L', (CW, CH), 0); sh.paste(a, (x, y + offset))
        sh = sh.filter(ImageFilter.GaussianBlur(blur)); return sh.point(lambda v: int(v * opacity))
    for sh in (shadow(round(CH * .022), CH * .03, .22), shadow(round(CH * .006), CH * .009, .16)):
        canvas = Image.composite(dark, canvas, sh)
    canvas.paste(cut, (x, y), cut)
    return canvas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('originals'); ap.add_argument('work')
    ap.add_argument('--ground', default='F2EDE6', help='hex, the same value as --photo-ground in main.css')
    ap.add_argument('--out', default=ASSETS)
    args = ap.parse_args()
    ground = tuple(int(args.ground[i:i + 2], 16) for i in (0, 2, 4))
    os.makedirs(args.out, exist_ok=True)
    sources = {k: v for k, v in json.load(open(os.path.join(HERE, 'sources.json'))).items() if k != '_'}
    for slug, fname in sources.items():
        a = np.asarray(Image.open(os.path.join(args.originals, fname)).convert('RGB')).astype(np.float32)
        food = np.asarray(Image.open(os.path.join(args.work, 'masks', f'{slug}.png'))).astype(np.float32) / 255
        rgba, nb = silhouette(a, food)
        final = compose(rgba, ground)
        for w in WIDTHS:
            im = final.resize((w, round(w * CH / CW)), Image.LANCZOS)
            im.save(os.path.join(args.out, f'{slug}-{w}.webp'), 'WEBP', quality=82, method=6)
            im.save(os.path.join(args.out, f'{slug}-{w}.jpg'), 'JPEG', quality=84, optimize=True, progressive=True)
        print(f'{slug:26s} bowls={nb}', flush=True)


if __name__ == '__main__':
    main()
