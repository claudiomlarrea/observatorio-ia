#!/usr/bin/env python3
"""Importa Fotos IDS desde Google Drive (carpeta pública) y las deja listas para la galería."""
from __future__ import annotations

import html as htmlmod
import http.cookiejar
import io
import json
import re
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "galeria" / "drive"
MAX_SIDE = 1600
JPEG_Q = 82

FOLDERS = [
    ("alianzas", "Alianzas y membresías", "1dXiVQMEkCdunCyLj54roP7Wm9jxpedOF"),
    ("congreso-ids", "Congreso de Desarrollo Sostenible IDS", "1OZQBGciijdA3YV3vxq-A43-Q_5w8Yicv"),
    ("consultorias", "Consultorías", "1NVUX0By6AcXQOADxBOhoxkW7QeJMzeqf"),
    ("docencia", "Docencia", "1w-qSj_gnHV8P_TFfmPL6YVOuTwiWGeov"),
    ("gestion", "Gestión", "1b58tcfSg51qWcjqdy_ZRewgCMro8leQ0"),
    ("congresos", "Participación en congresos", "1SqpdZMaemFpsHf3uO-I-X6a_DtBI8bpF"),
    ("premios", "Premios y reconocimientos", "1G43aKuPenC_GhCdgXHAXbS42uzuk9Q5k"),
]

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with opener.open(req, timeout=90) as r:
        return r.read()


def list_folder(fid: str) -> list[tuple[str, str]]:
    html = fetch(f"https://drive.google.com/embeddedfolderview?id={fid}#list").decode(
        "utf-8", "replace"
    )
    titles = [
        htmlmod.unescape(re.sub("<.*?>", "", t)).strip()
        for t in re.findall(r'class="flip-entry-title">(.*?)</div>', html)
    ]
    ids = re.findall(r'id="entry-([^"]+)"', html)
    return list(zip(ids, titles))


def download_file(file_id: str) -> bytes:
    url = f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t"
    data = fetch(url)
    if data[:15].lower().startswith(b"<!doctype html") or data[:6].lower().startswith(b"<html"):
        text = data.decode("utf-8", "replace")
        token = re.search(r"confirm=([0-9A-Za-z_]+)", text)
        uuid = re.search(r"name=\"uuid\" value=\"([^\"]+)\"", text)
        q = {"export": "download", "id": file_id, "confirm": token.group(1) if token else "t"}
        if uuid:
            q["uuid"] = uuid.group(1)
        data = fetch("https://drive.google.com/uc?" + urllib.parse.urlencode(q))
    if data[:15].lower().startswith(b"<!doctype html") or data[:6].lower().startswith(b"<html"):
        raise RuntimeError(f"HTML instead of file for {file_id}")
    return data


def slug_name(name: str) -> str:
    stem = Path(name).stem
    stem = unicodedata.normalize("NFKD", stem)
    stem = "".join(ch for ch in stem if not unicodedata.combining(ch))
    stem = re.sub(r"[^A-Za-z0-9]+", "-", stem).strip("-").lower()
    return (stem or "foto")[:80]


def caption_from(name: str) -> str:
    stem = Path(name).stem
    stem = re.sub(r"\s+", " ", stem).strip()
    stem = re.sub(r"\s*\(\d+\)\s*$", "", stem)
    return stem


def save_web_jpeg(raw: bytes, dest: Path) -> None:
    im = Image.open(io.BytesIO(raw))
    if im.mode in ("RGBA", "P", "LA"):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        rgba = im.convert("RGBA")
        bg.paste(rgba, mask=rgba.split()[-1])
        im = bg
    else:
        im = im.convert("RGB")
    w, h = im.size
    scale = min(1.0, MAX_SIDE / max(w, h))
    if scale < 1:
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "JPEG", quality=JPEG_Q, optimize=True, progressive=True)


def main() -> None:
    if OUT.exists():
        for p in OUT.rglob("*"):
            if p.is_file():
                p.unlink()
    photos = []
    for fid, label, drive_id in FOLDERS:
        items = list_folder(drive_id)
        print(f"{label}: {len(items)} archivos")
        for i, (file_id, title) in enumerate(items, 1):
            raw = download_file(file_id)
            fname = f"{i:02d}-{slug_name(title)}.jpg"
            dest = OUT / fid / fname
            save_web_jpeg(raw, dest)
            cap = caption_from(title)
            rel = dest.relative_to(ROOT).as_posix()
            photos.append(
                {
                    "src": rel,
                    "alt": cap,
                    "caption": cap,
                    "tags": [fid],
                }
            )
            print(f"  ok {rel} ({dest.stat().st_size} bytes)")
    manifest = ROOT / "scripts" / "galeria-drive-manifest.json"
    manifest.write_text(json.dumps(photos, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Total: {len(photos)}")


if __name__ == "__main__":
    main()
