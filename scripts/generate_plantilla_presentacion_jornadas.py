#!/usr/bin/env python3
"""Genera plantilla PPTX (1 diapositiva) para presentaciones de las Jornadas IA 2026."""
from __future__ import annotations

import shutil
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
OUT_REPO = ROOT / "docs/plantillas/plantilla-presentacion-jornadas-ia-2026.pptx"
OUT_ONEDRIVE = Path(
    "/Users/claudiolarrea/Library/CloudStorage/OneDrive-Personal/16 Secretaría de Investigación/"
    "60 Observatorio de Inteligencia Artificial/Jornadas de IA 2026/"
    "plantilla-presentacion-jornadas-ia-2026.pptx"
)
LOGO = ROOT / "assets/logo-observatorio-ia.png"
LOGO_CIRCLE = ROOT / "assets/logo-observatorio-ia-circle.png"

GREEN = RGBColor(0x04, 0x2F, 0x23)
GREEN_MID = RGBColor(0x06, 0x4A, 0x38)
GOLD = RGBColor(0xC9, 0xA2, 0x27)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
TEXT = RGBColor(0x1F, 0x14, 0x18)
MUTED = RGBColor(0x5C, 0x4F, 0x54)


def _ensure_circle_logo() -> Path:
    if LOGO_CIRCLE.is_file():
        return LOGO_CIRCLE
    from PIL import Image, ImageDraw

    im = Image.open(LOGO).convert("RGBA")
    size = min(im.size)
    im = im.resize((size, size), Image.Resampling.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(im, (0, 0))
    out.putalpha(mask)
    LOGO_CIRCLE.parent.mkdir(parents=True, exist_ok=True)
    out.save(LOGO_CIRCLE, "PNG")
    return LOGO_CIRCLE


def _set_run(run, text: str, *, size_pt: float, bold: bool = False, color=TEXT) -> None:
    run.text = text
    run.font.name = "Calibri"
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.color.rgb = color


def _add_textbox(slide, left, top, width, height, lines, *, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    for i, (text, size, bold, color) in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        run = p.add_run()
        _set_run(run, text, size_pt=size, bold=bold, color=color)
    return box


def build() -> Path:
    prs = Presentation()
    # 16:9 widescreen
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank)

    # Fondo blanco
    bg = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height
    )
    bg.fill.solid()
    bg.fill.fore_color.rgb = WHITE
    bg.line.fill.background()

    # Banner superior verde
    banner_h = Inches(1.35)
    banner = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, banner_h)
    banner.fill.solid()
    banner.fill.fore_color.rgb = GREEN
    banner.line.fill.background()

    # Franja dorada bajo el banner
    gold = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, 0, banner_h, prs.slide_width, Inches(0.06)
    )
    gold.fill.solid()
    gold.fill.fore_color.rgb = GOLD
    gold.line.fill.background()

    # Logo circular a la izquierda del banner
    logo_path = _ensure_circle_logo()
    logo_size = Inches(1.05)
    logo_left = Inches(0.35)
    logo_top = Inches(0.15)
    slide.shapes.add_picture(str(logo_path), logo_left, logo_top, logo_size, logo_size)

    # Textos del banner
    _add_textbox(
        slide,
        Inches(1.6),
        Inches(0.22),
        Inches(11.2),
        Inches(1.05),
        [
            ("UNIVERSIDAD CATÓLICA DE CUYO · Observatorio de IA", 12, False, WHITE),
            ("1° Jornadas internas de Inteligencia Artificial 2026", 22, True, WHITE),
            ("Encuentro virtual · 6 de octubre de 2026 · 15:00 h", 13, False, WHITE),
        ],
        align=PP_ALIGN.LEFT,
    )

    # Zona de contenido (placeholders editables)
    _add_textbox(
        slide,
        Inches(0.7),
        Inches(1.85),
        Inches(12),
        Inches(1.2),
        [
            ("Título de la ponencia", 28, True, GREEN),
            ("(reemplazar por el título del trabajo)", 14, False, MUTED),
        ],
        align=PP_ALIGN.LEFT,
    )

    _add_textbox(
        slide,
        Inches(0.7),
        Inches(3.2),
        Inches(12),
        Inches(1.4),
        [
            ("Autores: N. Apellido¹, N. Apellido²", 18, True, TEXT),
            ("Unidad académica / Facultad o Instituto", 16, False, MUTED),
            ("correo@uccuyo.edu.ar", 14, False, MUTED),
        ],
        align=PP_ALIGN.LEFT,
    )

    # Caja de viñetas de contenido
    content_box = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(0.7),
        Inches(4.7),
        Inches(12),
        Inches(1.9),
    )
    content_box.fill.solid()
    content_box.fill.fore_color.rgb = RGBColor(0xF4, 0xF8, 0xF6)
    content_box.line.color.rgb = GREEN_MID
    content_box.line.width = Pt(1.25)

    _add_textbox(
        slide,
        Inches(0.95),
        Inches(4.85),
        Inches(11.5),
        Inches(1.6),
        [
            ("Contenido de la diapositiva (editá estos puntos):", 14, True, GREEN),
            ("• Objetivo / contexto", 14, False, TEXT),
            ("• Método o experiencia", 14, False, TEXT),
            ("• Resultado o mensaje clave", 14, False, TEXT),
            ("Máximo 6 diapositivas · Exposición hasta 10 minutos", 12, False, MUTED),
        ],
        align=PP_ALIGN.LEFT,
    )

    # Pie
    footer = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        0,
        prs.slide_height - Inches(0.42),
        prs.slide_width,
        Inches(0.42),
    )
    footer.fill.solid()
    footer.fill.fore_color.rgb = GREEN_MID
    footer.line.fill.background()

    _add_textbox(
        slide,
        Inches(0.5),
        prs.slide_height - Inches(0.38),
        Inches(12.3),
        Inches(0.35),
        [
            (
                "Observatorio de IA · UCCuyo  ·  https://claudiomlarrea.github.io/observatorio-ia/#jornadas-ia  ·  observatorioia@uccuyo.edu.ar",
                11,
                False,
                WHITE,
            )
        ],
        align=PP_ALIGN.CENTER,
    )

    OUT_REPO.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUT_REPO))
    return OUT_REPO


def main() -> None:
    path = build()
    print(f"Wrote {path} ({path.stat().st_size} bytes)")
    if OUT_ONEDRIVE.parent.is_dir():
        shutil.copy2(path, OUT_ONEDRIVE)
        print(f"Copied to {OUT_ONEDRIVE}")
    else:
        print(f"Skip OneDrive: {OUT_ONEDRIVE.parent}")


if __name__ == "__main__":
    main()
