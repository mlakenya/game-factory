"""Bring generated or downloaded sprites to one style and build review sheets. Needs Pillow.

  python3 pipeline/art/unify.py cut  <src.png...> --out art/<id>/assets/toys [--size 256] [--palette art/<id>/STYLE.md] [--outline 6 --outline-color #1b1340]
      cuts the plain background (flood fill from the corners), trims, optionally maps colours to the STYLE palette,
      adds a uniform outline and fits every sprite into the same square.
  python3 pipeline/art/unify.py split <sheet.png> --out <dir> [--min-area 2000]
      splits a sheet with several objects on a plain background into one file per object.
  python3 pipeline/art/unify.py sheet <files or dirs...> --out sheet.jpg [--bg #1a1f6e] [--cell 200]
      contact sheet for the human: every asset on the game background, with its file name.
The palette is read from the first block of #rrggbb colours in STYLE.md (section «Палитра»).
"""
import argparse, os, re, sys
from collections import deque
from PIL import Image, ImageDraw, ImageFilter, ImageFont


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def palette_from(path):
    text = open(path, encoding="utf-8").read()
    sec = re.search(r"##\s*Палитра(.*?)(\n## |\Z)", text, re.S)
    cols = re.findall(r"#[0-9a-fA-F]{6}", sec.group(1) if sec else text)
    if not cols:
        sys.exit(f"no #rrggbb colours in {path}")
    return [hex_rgb(c) for c in cols]


def cut_background(im, tol=28):
    """Make the plain background transparent: flood fill from the borders over pixels close to the corner colour."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    bg = px[0, 0][:3]
    close = lambda c: sum(abs(c[i] - bg[i]) for i in range(3)) <= tol * 3
    seen = bytearray(w * h)
    q = deque((x, y) for x in range(w) for y in (0, h - 1))
    q.extend((x, y) for y in range(h) for x in (0, w - 1))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        if not close(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        if x > 0: q.append((x - 1, y))
        if x < w - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < h - 1: q.append((x, y + 1))
    # soften the 1px fringe left by anti-aliasing
    a = im.getchannel("A").filter(ImageFilter.MinFilter(3))
    im.putalpha(a)
    return im


def to_palette(im, pal):
    alpha = im.getchannel("A")
    p = Image.new("P", (1, 1))
    flat = [v for c in pal for v in c]
    p.putpalette(flat + flat[:3] * (256 - len(pal)))
    rgb = im.convert("RGB").quantize(palette=p, dither=Image.Dither.NONE).convert("RGBA")
    rgb.putalpha(alpha)
    return rgb


def add_outline(im, width, color):
    a = im.getchannel("A").point(lambda v: 255 if v > 40 else 0)
    grown = a.filter(ImageFilter.MaxFilter(width * 2 + 1))
    out = Image.new("RGBA", (im.width + width * 2, im.height + width * 2), (0, 0, 0, 0))
    sil = Image.new("RGBA", im.size, color + (255,))
    pad = Image.new("L", out.size, 0)
    pad.paste(grown, (width, width))
    out.paste(Image.new("RGBA", out.size, color + (255,)), (0, 0), pad)
    out.alpha_composite(im, (width, width))
    return out


def fit(im, size, margin=0.06):
    box = im.getbbox()
    if box:
        im = im.crop(box)
    inner = int(size * (1 - 2 * margin))
    im.thumbnail((inner, inner), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    return out


def cmd_cut(a):
    os.makedirs(a.out, exist_ok=True)
    pal = palette_from(a.palette) if a.palette else None
    for src in a.files:
        im = cut_background(Image.open(src), a.tol)
        if pal:
            im = to_palette(im, pal)
        if a.outline:
            im = add_outline(im, a.outline, hex_rgb(a.outline_color))
        im = fit(im, a.size)
        dest = os.path.join(a.out, os.path.splitext(os.path.basename(src))[0] + ".png")
        im.save(dest)
        print(dest)


def cmd_split(a):
    os.makedirs(a.out, exist_ok=True)
    im = cut_background(Image.open(a.files[0]), a.tol)
    alpha = im.getchannel("A")
    w, h = im.size
    px = alpha.load()
    seen = bytearray(w * h)
    n = 0
    for y0 in range(h):
        for x0 in range(w):
            if seen[y0 * w + x0] or px[x0, y0] < 40:
                continue
            q, box, area = deque([(x0, y0)]), [x0, y0, x0, y0], 0
            while q:
                x, y = q.popleft()
                i = y * w + x
                if seen[i] or px[x, y] < 40:
                    continue
                seen[i] = 1
                area += 1
                box = [min(box[0], x), min(box[1], y), max(box[2], x), max(box[3], y)]
                q.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)) if 0 < x < w - 1 and 0 < y < h - 1 else ())
            if area >= a.min_area:
                n += 1
                dest = os.path.join(a.out, f"{os.path.splitext(os.path.basename(a.files[0]))[0]}_{n:02d}.png")
                im.crop((box[0], box[1], box[2] + 1, box[3] + 1)).save(dest)
                print(dest)


def cmd_sheet(a):
    files = []
    for f in a.files:
        files += sorted(os.path.join(f, x) for x in os.listdir(f) if x.lower().endswith((".png", ".webp", ".jpg"))) if os.path.isdir(f) else [f]
    cols = max(1, min(a.cols, len(files)))
    rows = (len(files) + cols - 1) // cols
    c, label = a.cell, 22
    sheet = Image.new("RGB", (cols * c, rows * (c + label)), hex_rgb(a.bg))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 14)
    except OSError:
        font = ImageFont.load_default()
    for i, f in enumerate(files):
        im = Image.open(f).convert("RGBA")
        im.thumbnail((c - 12, c - 12), Image.LANCZOS)
        x, y = (i % cols) * c, (i // cols) * (c + label)
        sheet.paste(im, (x + (c - im.width) // 2, y + (c - im.height) // 2), im)
        d.text((x + 6, y + c + 2), os.path.basename(f)[: c // 8], fill=(255, 255, 255), font=font)
    sheet.save(a.out, quality=88)
    print(a.out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["cut", "split", "sheet"])
    ap.add_argument("files", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--size", type=int, default=256)
    ap.add_argument("--tol", type=int, default=28)
    ap.add_argument("--palette")
    ap.add_argument("--outline", type=int, default=0)
    ap.add_argument("--outline-color", default="#1b1340")
    ap.add_argument("--min-area", type=int, default=2000)
    ap.add_argument("--bg", default="#1a1f6e")
    ap.add_argument("--cell", type=int, default=200)
    ap.add_argument("--cols", type=int, default=6)
    a = ap.parse_args()
    {"cut": cmd_cut, "split": cmd_split, "sheet": cmd_sheet}[a.cmd](a)


if __name__ == "__main__":
    main()
