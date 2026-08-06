#!/usr/bin/env python3
"""Genera flayer PNG + PDF del Semillero de IA con QR al formulario de inscripción."""

from __future__ import annotations

import math
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / "assets" / "logo-observatorio-ia-circle.png"
PNG_OUT = ROOT / "assets" / "flayer-semillero-ia-2026-stories.png"
PDF_OUT = ROOT / "assets" / "flayer-semillero-ia-2026.pdf"

# Formulario público (no /edit)
FORM_URL = (
    "https://docs.google.com/forms/d/"
    "1qHvn-2PLpb0zLi0j_g69Jv3CVsTcz7hZwHjl43bfq04/viewform"
)

W, H = 1080, 1920

GREEN = (6, 74, 56)
GREEN_MID = (13, 110, 79)
GREEN_SOFT = (232, 242, 237)
GREEN_WAVE = (210, 230, 220)
YELLOW = (232, 185, 35)
WHITE = (255, 255, 255)
TEXT = (31, 20, 24)
TEXT_SOFT = (92, 79, 84)

FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def rounded_rect(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    radius: int,
    fill: tuple[int, int, int],
) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def text_width(draw: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont) -> int:
    return int(draw.textlength(text, font=f))


def draw_centered(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    f: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    x0: int = 0,
    x1: int = W,
) -> int:
    tw = text_width(draw, text, f)
    x = x0 + (x1 - x0 - tw) // 2
    draw.text((x, y), text, font=f, fill=fill)
    return y + f.size + 8


def wrap_centered(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    f: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    max_width: int,
    line_gap: int = 10,
) -> int:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if text_width(draw, trial, f) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    for line in lines:
        y = draw_centered(draw, line, y, f, fill) - 8 + line_gap
    return y


def make_qr(size: int) -> Image.Image:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=12,
        border=2,
    )
    qr.add_data(FORM_URL)
    qr.make(fit=True)
    img = qr.make_image(fill_color=GREEN, back_color="white").convert("RGBA")
    return img.resize((size, size), Image.Resampling.NEAREST)


def draw_waves(base: Image.Image) -> None:
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for i, (amp, phase, alpha, y_off) in enumerate(
        (
            (28, 0.0, 90, 1680),
            (36, 1.2, 70, 1720),
            (22, 2.4, 55, 1765),
        )
    ):
        pts = []
        for x in range(0, W + 1, 8):
            y = y_off + int(amp * math.sin((x / 90.0) + phase + i))
            pts.append((x, y))
        pts += [(W, H), (0, H)]
        d.polygon(pts, fill=(*GREEN_WAVE, alpha))
    base.alpha_composite(overlay)


def bullet_row(
    draw: ImageDraw.ImageDraw,
    y: int,
    label: str,
    f_label: ImageFont.FreeTypeFont,
) -> int:
    cx, cy = 120, y + 22
    draw.ellipse((cx - 22, cy - 22, cx + 22, cy + 22), fill=GREEN)
    # small check mark
    draw.line(
        [(cx - 9, cy + 1), (cx - 2, cy + 9), (cx + 11, cy - 8)],
        fill=WHITE,
        width=4,
        joint="curve",
    )
    draw.text((170, y + 6), label, font=f_label, fill=TEXT)
    return y + 70


def build_png() -> Image.Image:
    img = Image.new("RGBA", (W, H), WHITE)
    draw = ImageDraw.Draw(img)
    draw_waves(img)
    draw = ImageDraw.Draw(img)

    # Logo
    logo = Image.open(LOGO).convert("RGBA")
    logo_size = 260
    logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    logo_x = (W - logo_size) // 2
    logo_y = 70
    img.paste(logo, (logo_x, logo_y), logo)

    # Title banner
    banner = (70, 360, W - 70, 720)
    rounded_rect(draw, banner, 36, GREEN)

    f_brand = font(FONT_BOLD, 42)
    f_title = font(FONT_BOLD, 58)
    f_sub = font(FONT_REG, 34)
    f_sigla = font(FONT_BOLD, 30)

    y = 395
    y = draw_centered(draw, "Observatorio de IA", y, f_brand, WHITE)
    # yellow rule
    rule_w = 220
    rx = (W - rule_w) // 2
    draw.rectangle((rx, y + 4, rx + rule_w, y + 10), fill=YELLOW)
    y += 28
    y = wrap_centered(
        draw,
        "Semillero de Inteligencia Artificial",
        y,
        f_title,
        WHITE,
        max_width=W - 160,
        line_gap=6,
    )
    y += 6
    y = draw_centered(draw, "SIA-UCCuyo · Convocatoria 2026", y, f_sigla, YELLOW)
    y += 4
    wrap_centered(
        draw,
        "Inscribite y transformá tu idea en un proyecto",
        y,
        f_sub,
        WHITE,
        max_width=W - 180,
        line_gap=4,
    )

    # Intro
    f_body = font(FONT_REG, 32)
    intro = (
        "Programa institucional para estudiantes de todas las "
        "carreras: formación, mentoría e innovación con IA."
    )
    y = wrap_centered(draw, intro, 760, f_body, TEXT_SOFT, max_width=W - 140, line_gap=8)

    # Bullets
    f_bullet = font(FONT_BOLD, 30)
    y = 900
    for label in (
        "Todas las carreras · pregrado, grado y posgrado",
        "Sin conocimientos previos de programación",
        "Formación, mentoría y proyectos reales",
    ):
        y = bullet_row(draw, y, label, f_bullet)

    # QR card
    qr_size = 360
    qr = make_qr(qr_size)
    card_pad = 28
    card_w = qr_size + card_pad * 2
    card_h = qr_size + card_pad * 2 + 70
    card_x = (W - card_w) // 2
    card_y = 1140
    rounded_rect(
        draw,
        (card_x, card_y, card_x + card_w, card_y + card_h),
        28,
        GREEN_SOFT,
    )
    qr_x = card_x + card_pad
    qr_y = card_y + card_pad
    img.paste(qr, (qr_x, qr_y), qr if qr.mode == "RGBA" else None)

    f_qr = font(FONT_BOLD, 28)
    draw_centered(
        draw,
        "Escaneá e inscribite",
        qr_y + qr_size + 18,
        f_qr,
        GREEN,
        x0=card_x,
        x1=card_x + card_w,
    )

    # CTA pill
    f_cta = font(FONT_BOLD, 34)
    cta = "Completá el formulario"
    cta_w = text_width(draw, cta, f_cta) + 100
    cta_h = 78
    cta_x = (W - cta_w) // 2
    cta_y = 1685
    rounded_rect(draw, (cta_x, cta_y, cta_x + cta_w, cta_y + cta_h), 39, GREEN_MID)
    # white circle with arrow cue
    ox = cta_x + 28
    oy = cta_y + cta_h // 2
    draw.ellipse((ox - 18, oy - 18, ox + 18, oy + 18), fill=WHITE)
    draw.polygon(
        [(ox - 4, oy - 8), (ox + 8, oy), (ox - 4, oy + 8)],
        fill=GREEN_MID,
    )
    draw.text((cta_x + 62, cta_y + 20), cta, font=f_cta, fill=WHITE)

    # Footer
    f_foot = font(FONT_REG, 24)
    draw_centered(
        draw,
        "Universidad Católica de Cuyo · San Juan",
        1805,
        f_foot,
        TEXT_SOFT,
    )
    draw_centered(
        draw,
        "Secretaría de Investigación y Vinculación Tecnológica",
        1840,
        f_foot,
        TEXT_SOFT,
    )

    return img.convert("RGB")


def build_pdf(png: Image.Image) -> None:
    page_w = 420.0
    page_h = page_w * png.height / png.width
    c = canvas.Canvas(str(PDF_OUT), pagesize=(page_w, page_h))
    c.drawImage(
        ImageReader(png),
        0,
        0,
        width=page_w,
        height=page_h,
        preserveAspectRatio=True,
        mask="auto",
    )
    # QR zone + CTA clickable
    qr_left, qr_right = 0.315, 0.685
    qr_bottom, qr_top = 0.22, 0.42
    c.linkURL(
        FORM_URL,
        (qr_left * page_w, qr_bottom * page_h, qr_right * page_w, qr_top * page_h),
        relative=0,
        thickness=0,
    )
    cta_left, cta_right = 0.18, 0.82
    cta_bottom, cta_top = 0.09, 0.145
    c.linkURL(
        FORM_URL,
        (cta_left * page_w, cta_bottom * page_h, cta_right * page_w, cta_top * page_h),
        relative=0,
        thickness=0,
    )
    c.setTitle("Semillero de IA 2026 — Convocatoria | Observatorio de IA")
    c.setAuthor("Observatorio de Inteligencia Artificial · UCCuyo")
    c.save()


def main() -> None:
    png = build_png()
    png.save(PNG_OUT, "PNG", optimize=True)
    build_pdf(png)
    print(f"OK {PNG_OUT} ({PNG_OUT.stat().st_size} bytes)")
    print(f"OK {PDF_OUT} ({PDF_OUT.stat().st_size} bytes)")
    print(f"QR → {FORM_URL}")


if __name__ == "__main__":
    main()
