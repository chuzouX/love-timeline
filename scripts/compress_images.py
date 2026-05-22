#!/usr/bin/env python3
"""Compress image files from a directory.

Usage:
  python scripts/compress_images.py /path/to/images
  python scripts/compress_images.py /path/to/images --in-place

By default, output files keep the exact same file names and are written to:
  /path/to/images/compressed

With --in-place, files are compressed at their original paths and names.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    print("Missing dependency: Pillow. Install it with: python -m pip install pillow", file=sys.stderr)
    raise SystemExit(1)


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compress images into a subfolder while preserving file names.")
    parser.add_argument("directory", type=Path, help="Directory containing images to compress.")
    parser.add_argument("--output-name", default="compressed", help="Output folder name created inside the image directory.")
    parser.add_argument("--max-side", type=int, default=1600, help="Resize images so the longest side is at most this many pixels.")
    parser.add_argument("--quality", type=int, default=78, help="JPEG/WebP quality, from 1 to 95.")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite files in the output folder if they already exist.")
    parser.add_argument("--in-place", action="store_true", help="Compress files in place without changing paths or names.")
    return parser.parse_args()


def resize_if_needed(image: Image.Image, max_side: int) -> Image.Image:
    width, height = image.size
    longest_side = max(width, height)
    if longest_side <= max_side:
        return image.copy()

    scale = max_side / longest_side
    new_size = (max(1, round(width * scale)), max(1, round(height * scale)))
    return image.resize(new_size, Image.Resampling.LANCZOS)


def save_image(image: Image.Image, destination: Path, source_format: str | None, quality: int) -> None:
    fmt = (source_format or destination.suffix.lstrip(".")).upper()
    if fmt == "JPG":
        fmt = "JPEG"

    if fmt in {"JPEG", "WEBP"}:
        if image.mode in {"RGBA", "LA", "P"}:
            image = image.convert("RGB")
        image.save(destination, format=fmt, quality=quality, optimize=True)
        return

    if fmt == "PNG":
        image.save(destination, format="PNG", optimize=True, compress_level=9)
        return

    image.save(destination, format=fmt)


def compress_image(source: Path, destination: Path, max_side: int, quality: int, overwrite: bool) -> tuple[int, int, str]:
    if destination.exists() and not overwrite:
        return source.stat().st_size, destination.stat().st_size, "skipped"

    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original)
        resized = resize_if_needed(image, max_side)
        save_image(resized, destination, original.format, quality)

    before = source.stat().st_size
    after = destination.stat().st_size
    if after > before:
        shutil.copy2(source, destination)
        after = before
        status = "copied"
    else:
        status = "compressed"
    return before, after, status


def compress_image_in_place(source: Path, max_side: int, quality: int) -> tuple[int, int, str]:
    temp_destination = source.with_name(f"{source.name}.compressing")
    if temp_destination.exists():
        temp_destination.unlink()

    try:
        before, after, status = compress_image(source, temp_destination, max_side, quality, True)
        if after < before:
            temp_destination.replace(source)
            return before, after, status

        temp_destination.unlink(missing_ok=True)
        return before, before, "unchanged"
    except Exception:
        temp_destination.unlink(missing_ok=True)
        raise


def main() -> int:
    args = parse_args()
    source_dir = args.directory.expanduser().resolve()
    if not source_dir.is_dir():
        print(f"Not a directory: {source_dir}", file=sys.stderr)
        return 1

    output_dir = source_dir if args.in_place else source_dir / args.output_name
    if not args.in_place:
        output_dir.mkdir(exist_ok=True)

    images = [
        path
        for path in sorted(source_dir.iterdir())
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    ]

    if not images:
        print(f"No supported images found in: {source_dir}")
        return 0

    total_before = 0
    total_after = 0
    for source in images:
        if args.in_place:
            before, after, status = compress_image_in_place(source, args.max_side, args.quality)
        else:
            destination = output_dir / source.name
            before, after, status = compress_image(source, destination, args.max_side, args.quality, args.overwrite)
        total_before += before
        total_after += after
        saved = before - after
        print(f"{status:10} {source.name} {before} -> {after} bytes, saved {saved}")

    saved_total = total_before - total_after
    saved_percent = (saved_total / total_before * 100) if total_before else 0
    print(f"\nOutput: {output_dir}")
    print(f"Total: {total_before} -> {total_after} bytes, saved {saved_total} ({saved_percent:.1f}%)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
