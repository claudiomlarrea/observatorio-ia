#!/usr/bin/env python3
"""Genera assets/sacau-cre-demo-45s.mp4 (~45 s) para la tarjeta comercial."""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "sacau-cre-demo-45s.mp4"
LOGO = ROOT / "assets" / "logo-observatorio-ia.png"
W, H = 1280, 720
BG = (250, 247, 248)
MAROON = (122, 21, 50)
GREEN = (4, 74, 48)
TEXT = (31, 20, 24)
SOFT = (92, 79, 84)

SLIDES = [
    (7, "Convertidor SACAU → CRE", "Universidad Católica de Cuyo\nObservatorio de Inteligencia Artificial"),
    (8, "De horas a créditos CRE", "Cargá un plan en Word, PDF o CSV\ny obtené el plan en créditos."),
    (8, "Tipologías y desglose", "Teórica, práctica, PPS, TIF…\nTotales por año y por área."),
    (8, "Cumplimiento SACAU", "Control normativo UCCuyo\ny exportación Word / PDF / CSV."),
    (7, "Demo comercial", "Solicitá una demo guiada\nobservatorioia@uccuyo.edu.ar"),
    (7, "45 segundos", "Comunicate con el Observatorio\npara conocer y usar el sistema."),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_centered(draw: ImageDraw.ImageDraw, text: str, y: int, fnt, fill) -> int:
    lines = text.split("\n")
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=fnt)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text(((W - tw) / 2, y), line, font=fnt, fill=fill)
        y += th + 10
    return y


def make_slide(title: str, body: str) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, W, 10], fill=MAROON)
    draw.rectangle([0, H - 10, W, H], fill=GREEN)

    if LOGO.exists():
        logo = Image.open(LOGO).convert("RGBA")
        logo.thumbnail((96, 96))
        img.paste(logo, (56, 36), logo)

    y = 180
    y = draw_centered(draw, title, y, font(48, bold=True), MAROON)
    y += 28
    draw_centered(draw, body, y, font(28), TEXT)

    foot = "Observatorio IA · UCCuyo"
    fb = draw.textbbox((0, 0), foot, font=font(18))
    draw.text(((W - (fb[2] - fb[0])) / 2, H - 58), foot, font=font(18), fill=SOFT)
    return img


def main() -> None:
    with tempfile.TemporaryDirectory() as td:
        tdir = Path(td)
        list_path = tdir / "list.txt"
        lines = []
        for i, (secs, title, body) in enumerate(SLIDES):
            frame = tdir / f"slide_{i:02d}.png"
            make_slide(title, body).save(frame)
            # escape for concat demuxer
            lines.append(f"file '{frame}'")
            lines.append(f"duration {secs}")
        # last frame must be repeated without duration for concat
        lines.append(f"file '{tdir / f'slide_{len(SLIDES) - 1:02d}.png'}'")
        list_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

        OUT.parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(list_path),
            "-vf",
            "fps=30,format=yuv420p",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(OUT),
        ]
        subprocess.run(cmd, check=True)
        print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
