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

# Zona del CTA verde en la imagen Stories (coords desde abajo-izquierda).
# Amplia a propósito: Preview / Chrome a veces fallan con rects chicos.
LEFT = 0.06
RIGHT = 0.94
BOTTOM = 0.035
TOP = 0.20


def main() -> None:
    im = Image.open(PNG).convert("RGB")
    page_w = 420.0
    page_h = page_w * im.height / im.width

    c = canvas.Canvas(str(OUT), pagesize=(page_w, page_h))
    c.drawImage(
        ImageReader(im),
        0,
        0,
        width=page_w,
        height=page_h,
        preserveAspectRatio=True,
        mask="auto",
    )

    rect = (LEFT * page_w, BOTTOM * page_h, RIGHT * page_w, TOP * page_h)
    # relative=0: rectángulo absoluto en puntos de página
    c.linkURL(URL, rect, relative=0, thickness=0)
    c.setTitle("Encuesta a docentes 2026 — Observatorio de IA")
    c.setAuthor("Observatorio de Inteligencia Artificial · UCCuyo")
    c.save()
    print(f"OK {OUT} ({OUT.stat().st_size} bytes)")
    print(f"Link → {URL}")
    print(f"rect={tuple(round(x, 1) for x in rect)} page=({page_w:.0f}x{page_h:.0f})")


if __name__ == "__main__":
    main()
