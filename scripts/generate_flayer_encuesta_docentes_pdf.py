#!/usr/bin/env python3
"""Genera flayer PDF de la encuesta docentes con botón cliqueable a #encuestas."""

from __future__ import annotations

from pathlib import Path

from PIL import Image
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
PNG = ROOT / "assets" / "flayer-encuesta-docentes-2026-stories.png"
OUT = ROOT / "assets" / "flayer-encuesta-docentes-2026.pdf"

URL = "https://claudiomlarrea.github.io/observatorio-ia/#encuestas"

# Misma zona que el CTA del flayer web (porcentaje sobre la imagen)
LEFT = 0.085
RIGHT = 0.915
BOTTOM = 0.115
HEIGHT = 0.072


def main() -> None:
    im = Image.open(PNG).convert("RGB")
    # Ancho cómodo para compartir / imprimir (proporción Stories)
    page_w = 420.0
    page_h = page_w * im.height / im.width

    c = canvas.Canvas(str(OUT), pagesize=(page_w, page_h))
    c.drawImage(ImageReader(im), 0, 0, width=page_w, height=page_h, preserveAspectRatio=True, mask="auto")

    x1 = LEFT * page_w
    x2 = RIGHT * page_w
    y1 = BOTTOM * page_h
    y2 = y1 + HEIGHT * page_h
    # Área un poco más amplia para que sea fácil tocar el botón
    pad_x = 0.02 * page_w
    pad_y = 0.01 * page_h
    rect = (x1 - pad_x, y1 - pad_y, x2 + pad_x, y2 + pad_y)

    c.linkURL(URL, rect, relative=1)
    c.setTitle("Encuesta a docentes 2026 — Observatorio de IA")
    c.setAuthor("Observatorio de Inteligencia Artificial · UCCuyo")
    c.save()
    print(f"OK {OUT} ({OUT.stat().st_size} bytes)")
    print(f"Link → {URL} rect={tuple(round(x, 1) for x in rect)}")


if __name__ == "__main__":
    main()
