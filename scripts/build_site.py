#!/usr/bin/env python3
"""Build the static site into ./_site.

- copies src/ (index.html, css, js)
- reads originals from photos/ and panos/
- writes downsized web copies + thumbnails (originals are NEVER published)
- writes data/gallery.json that the page loads

Run locally:  python scripts/build_site.py
"""
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

# ---- settings you may change -------------------------------------------
WATERMARK_TEXT = ""          # e.g. "© Your Name" ; empty = no watermark
PHOTO_MAX = 1800             # longest side of published photos (px)
PANO_MAX = 6000              # width of published panoramas (px)
THUMB_MAX = 700              # longest side of thumbnails (px)
JPEG_QUALITY = 82
# -------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_site"
EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def watermark(im: Image.Image) -> Image.Image:
    if not WATERMARK_TEXT:
        return im
    im = im.convert("RGBA")
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    size = max(18, im.width // 40)
    try:
        font = ImageFont.load_default(size=size)
    except TypeError:
        font = ImageFont.load_default()
    box = d.textbbox((0, 0), WATERMARK_TEXT, font=font)
    x = im.width - (box[2] - box[0]) - size
    y = im.height - (box[3] - box[1]) - size
    d.text((x, y), WATERMARK_TEXT, font=font, fill=(255, 255, 255, 150))
    return Image.alpha_composite(im, layer).convert("RGB")


def load_captions(folder: Path) -> dict:
    f = folder / "captions.json"
    if f.exists():
        try:
            return json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"WARNING: {f} is not valid JSON ({e}); ignoring captions")
    return {}


def process(kind: str, max_side: int, pano: bool) -> list:
    src_dir = ROOT / kind
    items = []
    if not src_dir.exists():
        return items
    captions = load_captions(src_dir)
    (OUT / "img" / kind).mkdir(parents=True, exist_ok=True)
    (OUT / "thumbs" / kind).mkdir(parents=True, exist_ok=True)
    for f in sorted(src_dir.iterdir(), key=lambda p: p.name.lower()):
        if f.suffix.lower() not in EXTS:
            continue
        try:
            with Image.open(f) as im:
                im = ImageOps.exif_transpose(im).convert("RGB")
                full = im.copy()
                if pano:
                    if full.width > max_side:
                        full = full.resize((max_side, round(full.height * max_side / full.width)), Image.LANCZOS)
                else:
                    full.thumbnail((max_side, max_side), Image.LANCZOS)
                full = watermark(full)
                thumb = im.copy()
                thumb.thumbnail((THUMB_MAX, THUMB_MAX), Image.LANCZOS)
        except Exception as e:  # unreadable/corrupt file: skip, don't break the site
            print(f"WARNING: skipping {f.name}: {e}")
            continue
        name = f.stem + ".jpg"
        full.save(OUT / "img" / kind / name, "JPEG", quality=JPEG_QUALITY, optimize=True)
        thumb.save(OUT / "thumbs" / kind / name, "JPEG", quality=JPEG_QUALITY, optimize=True)
        title = captions.get(f.name) or captions.get(f.stem) or f.stem.replace("_", " ").replace("-", " ")
        items.append({
            "title": title,
            "full": f"img/{kind}/{name}",
            "thumb": f"thumbs/{kind}/{name}",
            "w": thumb.width,
            "h": thumb.height,
        })
    return items


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(ROOT / "src", OUT)
    data = {
        "photos": process("photos", PHOTO_MAX, pano=False),
        "panos": process("panos", PANO_MAX, pano=True),
    }
    (OUT / "data").mkdir(exist_ok=True)
    (OUT / "data" / "gallery.json").write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    (OUT / ".nojekyll").write_text("")
    print(f"Built {len(data['photos'])} photos and {len(data['panos'])} panoramas into {OUT}")


if __name__ == "__main__":
    main()
