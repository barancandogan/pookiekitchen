#!/usr/bin/env python3
"""
Step 1 of the dish-photo pipeline: a food mask for every source photograph.

    python3 tools/photos/cut.py <originals-dir> <work-dir>

Runs ISNet (isnet-general-use, the model rembg ships) locally with
onnxruntime — no credits, nothing uploaded. Writes <work-dir>/masks/<slug>.png.
The model (178 MB) is downloaded into <work-dir> on first use and is never
committed.

    pip install onnxruntime numpy pillow scipy

Step 2 is plate.py, which turns a mask into the finished photograph.
"""
import json, os, sys, urllib.request
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL_URL = 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx'


def isnet_mask(sess, img):
    """rembg's ISNet recipe: 1024² input, (x/max − .5), min-max normalised output."""
    name = sess.get_inputs()[0].name
    im = img.convert('RGB').resize((1024, 1024), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32); a = a / max(a.max(), 1e-6)
    x = np.expand_dims(((a - 0.5) / 1.0).transpose(2, 0, 1), 0).astype(np.float32)
    pred = sess.run(None, {name: x})[0][:, 0, :, :]
    pred = (pred - pred.min()) / (pred.max() - pred.min() + 1e-9)
    return Image.fromarray((np.squeeze(pred) * 255).astype('uint8'), 'L').resize(img.size, Image.LANCZOS)


def clean(mask):
    """Keep every component at least 2% the size of the biggest, fill holes, sharpen the edge."""
    m = np.asarray(mask).astype(np.float32) / 255
    hard = m > .5
    lab, n = ndi.label(hard)
    if n > 1:
        sizes = ndi.sum(hard, lab, range(1, n + 1)); big = sizes.max()
        keep = np.zeros_like(hard)
        for i, sz in enumerate(sizes, 1):
            if sz >= .02 * big: keep |= (lab == i)
        m = m * ndi.binary_dilation(keep, iterations=8)
    m = np.maximum(m, ndi.binary_fill_holes(m > .5).astype(np.float32))
    m = np.clip((m - .15) / .70, 0, 1)
    return Image.fromarray((m * 255).astype('uint8'), 'L')


def main(originals, work):
    import onnxruntime as ort
    os.makedirs(os.path.join(work, 'masks'), exist_ok=True)
    model = os.path.join(work, 'isnet-general-use.onnx')
    if not os.path.exists(model):
        print('fetching the ISNet model (178 MB) …', flush=True)
        urllib.request.urlretrieve(MODEL_URL, model)
    sess = ort.InferenceSession(model, providers=['CPUExecutionProvider'])
    sources = {k: v for k, v in json.load(open(os.path.join(HERE, 'sources.json'))).items() if k != '_'}
    for slug, fname in sources.items():
        img = Image.open(os.path.join(originals, fname))
        clean(isnet_mask(sess, img)).save(os.path.join(work, 'masks', f'{slug}.png'))
        print(f'{slug:26s} <- {fname}', flush=True)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
