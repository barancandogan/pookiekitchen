#!/usr/bin/env python3
"""
The hero video's poster, from the video itself.

    python3 tools/video/poster.py assets/video/brand-5-720.mp4

writes assets/video/brand-5-poster.jpg: the clip's FIRST FRAME, at the clip's
own size, as a JPEG.

Why the first frame and not a photograph: whatever is in the poster is what a
visitor sees until the browser has enough of the clip to start it — a moment
on fibre, seconds on a phone — and then the first decoded frame replaces it in
one step, with no transition, because that swap is the browser's and not ours.
If the poster is a different picture, that step is a visible jump from one
scene to another, and it reads as a glitch. If the poster IS the first frame,
the same picture simply starts to move. There is nothing to notice.

The clip's own size, not upscaled: a poster is on screen for one moment and
under the hero's scrim the whole time. Re-run this whenever the clip changes.

    pip install imageio-ffmpeg
"""
import os, subprocess, sys

def main(clip):
    try:
        import imageio_ffmpeg
        ff = imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        ff = 'ffmpeg'
    base = clip[:-len('-720.mp4')] if clip.endswith('-720.mp4') else os.path.splitext(clip)[0]
    out = f'{base}-poster.jpg'
    subprocess.run([ff, '-v', 'error', '-y', '-i', clip, '-frames:v', '1', '-q:v', '3', out], check=True)
    print(f'{out}  {os.path.getsize(out) // 1024} kB')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
