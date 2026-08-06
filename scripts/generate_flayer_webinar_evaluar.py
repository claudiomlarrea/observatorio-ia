#!/usr/bin/env python3
"""Genera flayer PNG + PDF del Webinar EvaluAR con links al formulario y a Meet."""

from __future__ import annotations

from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / "assets" / "logo-observatorio-ia-circle.png"
PNG_OUT = ROOT / "assets" / "flayer-webinar-evaluar-13agosto-2026.png"
PDF_OUT = ROOT / "assets" / "flayer-webinar-evaluar-13agosto-2026.pdf"

# Formulario de inscripción (URL indicada por el equipo)
FORM_URL = (
    "https://docs.google.com/forms/d/"
    "1QgjOQ5TwAEa2Mmj2O6iVO-_gfErVmj6bx5UyUPSxokY/edit"
)
MEET_URL = "https://meet.google.com/rzu-voaf-yjh"

W, H = 1080, 1920

RED = (122, 21, 50)
RED_DARK = (74, 12, 31)
GREEN = (6, 74, 56)
GREEN_MID = (13, 110, 79)
GREEN_SOFT = (232, 242, 237)
GOLD = (232, 185, 35)
WHITE = (255, 255, 255)
TEXT = (31, 20, 24)
TEXT_SOFT = (92, 79, 84)

FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


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
    for word in words:
        trial = f"{cur} {word}".strip()
        if text_width(draw, trial, f) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    for line in lines:
        y = draw_centered(draw, line, y, f, fill) - 8 + line_gap
    return y


def make_qr(url: str, size: int, color: tuple[int, int, int] = GREEN) -> Image.Image:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color=color, back_color="white").convert("RGBA")
    return img.resize((size, size), Image.Resampling.NEAREST)


def build_png() -> Image.Image:
    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)

    # —— Header burgundy ——
    draw.rectangle((0, 0, W, 620), fill=RED)
    draw.rectangle((0, 600, W, 620), fill=RED_DARK)

    logo = Image.open(LOGO).convert("RGBA")
    logo_size = 200
    logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    logo_x = (W - logo_size) // 2
    img.paste(logo, (logo_x, 48), logo)

    f_uni = font(FONT_BOLD, 28)
    f_obs = font(FONT_REG, 30)
    f_badge = font(FONT_BOLD, 28)
    f_title = font(FONT_BOLD, 92)
    f_tag = font(FONT_REG, 34)

    y = 270
    y = draw_centered(draw, "UNIVERSIDAD CATÓLICA DE CUYO", y, f_uni, WHITE)
    y = draw_centered(draw, "Observatorio de Inteligencia Artificial", y, f_obs, WHITE)
    y += 10
    # badge pill
    badge = "PRIMER WEBINAR"
    bw = text_width(draw, badge, f_badge) + 56
    bh = 48
    bx = (W - bw) // 2
    draw.rounded_rectangle((bx, y, bx + bw, y + bh), radius=24, fill=GOLD)
    draw_centered(draw, badge, y + 10, f_badge, RED_DARK)
    y += bh + 18
    y = draw_centered(draw, "EvaluAR", y, f_title, WHITE)
    draw_centered(draw, "Examen en papel · Corrección digital", y + 4, f_tag, WHITE)

    # —— Gold date bar ——
    draw.rectangle((0, 620, W, 720), fill=GOLD)
    f_date = font(FONT_BOLD, 36)
    draw_centered(draw, "Jueves 13 de agosto · 19:00 – 20:00", 652, f_date, TEXT)

    # —— Body ——
    f_q = font(FONT_BOLD, 36)
    f_body = font(FONT_REG, 30)
    f_bullet = font(FONT_REG, 28)
    f_aud = font(FONT_BOLD, 28)

    y = 760
    y = wrap_centered(
        draw,
        "¿Cómo evaluar exámenes presenciales con cientos de alumnos en minutos?",
        y,
        f_q,
        TEXT,
        max_width=W - 120,
        line_gap=6,
    )
    y += 28

    bullets = (
        "Los alumnos rinden en papel y cargan respuestas desde el celular",
        "El docente configura la clave y el sistema corrige al instante",
        "Planilla de notas y exportación a Excel",
    )
    for item in bullets:
        # green bullet
        cy = y + 14
        draw.ellipse((88, cy - 10, 108, cy + 10), fill=GREEN)
        # wrapped text from x=130
        words = item.split()
        lines: list[str] = []
        cur = ""
        max_w = W - 170
        for word in words:
            trial = f"{cur} {word}".strip()
            if text_width(draw, trial, f_bullet) <= max_w:
                cur = trial
            else:
                if cur:
                    lines.append(cur)
                cur = word
        if cur:
            lines.append(cur)
        for i, line in enumerate(lines):
            draw.text((130, y + i * 36), line, font=f_bullet, fill=TEXT)
        y += max(44, 36 * len(lines) + 16)

    y += 8
    y = wrap_centered(
        draw,
        "Dirigido a docentes, investigadores y demás interesados.",
        y,
        f_aud,
        TEXT,
        max_width=W - 140,
        line_gap=4,
    )
    y += 18

    # Speaker card
    f_sp = font(FONT_BOLD, 30)
    f_sp2 = font(FONT_REG, 26)
    card = (90, y, W - 90, y + 110)
    draw.rounded_rectangle(card, radius=24, fill=GREEN)
    draw_centered(draw, "Disertante: Dr. Claudio Larrea", y + 22, f_sp, WHITE)
    draw_centered(
        draw,
        "Director del Observatorio de IA · UCCuyo",
        y + 62,
        f_sp2,
        WHITE,
    )
    y = card[3] + 36

    # —— Dual QR cards: Inscripción + Meet ——
    qr_size = 220
    gap = 36
    card_pad = 22
    card_w = (W - 90 * 2 - gap) // 2
    card_h = qr_size + card_pad * 2 + 96
    left_x = 90
    right_x = left_x + card_w + gap
    card_y = y

    draw.rounded_rectangle(
        (left_x, card_y, left_x + card_w, card_y + card_h),
        radius=22,
        fill=GREEN_SOFT,
    )
    draw.rounded_rectangle(
        (right_x, card_y, right_x + card_w, card_y + card_h),
        radius=22,
        fill=GREEN_SOFT,
    )

    qr_form = make_qr(FORM_URL, qr_size, GREEN)
    qr_meet = make_qr(MEET_URL, qr_size, RED)

    form_qx = left_x + (card_w - qr_size) // 2
    meet_qx = right_x + (card_w - qr_size) // 2
    qy = card_y + card_pad
    img.paste(qr_form, (form_qx, qy), qr_form)
    img.paste(qr_meet, (meet_qx, qy), qr_meet)

    f_qr_label = font(FONT_BOLD, 26)
    f_qr_sub = font(FONT_REG, 22)
    label_y = qy + qr_size + 16
    draw_centered(
        draw, "Inscripción", label_y, f_qr_label, GREEN, x0=left_x, x1=left_x + card_w
    )
    draw_centered(
        draw,
        "Escaneá el formulario",
        label_y + 34,
        f_qr_sub,
        TEXT_SOFT,
        x0=left_x,
        x1=left_x + card_w,
    )
    draw_centered(
        draw, "Entrar al Meet", label_y, f_qr_label, RED, x0=right_x, x1=right_x + card_w
    )
    draw_centered(
        draw,
        "meet.google.com/rzu-voaf-yjh",
        label_y + 34,
        f_qr_sub,
        TEXT_SOFT,
        x0=right_x,
        x1=right_x + card_w,
    )

    # —— Footer ——
    foot_top = card_y + card_h + 40
    draw.rectangle((0, foot_top, W, H), fill=GREEN)

    f_free = font(FONT_BOLD, 30)
    f_cta = font(FONT_BOLD, 34)
    f_foot = font(FONT_REG, 24)

    fy = foot_top + 36
    fy = draw_centered(draw, "Inscripción gratuita · Cupo abierto", fy, f_free, WHITE)
    fy += 8

    # Two CTA pills
    f_pill = font(FONT_BOLD, 28)
    pill_h = 72
    pill_gap = 24
    pill_w = (W - 90 * 2 - pill_gap) // 2
    px1 = 90
    px2 = px1 + pill_w + pill_gap

    draw.rounded_rectangle((px1, fy, px1 + pill_w, fy + pill_h), radius=36, fill=GOLD)
    draw.rounded_rectangle((px2, fy, px2 + pill_w, fy + pill_h), radius=36, fill=WHITE)

    cta1 = "Inscribirme"
    cta2 = "Unirme al Meet"
    draw.text(
        (px1 + (pill_w - text_width(draw, cta1, f_pill)) // 2, fy + 20),
        cta1,
        font=f_pill,
        fill=RED_DARK,
    )
    draw.text(
        (px2 + (pill_w - text_width(draw, cta2, f_pill)) // 2, fy + 20),
        cta2,
        font=f_pill,
        fill=GREEN,
    )

    fy = fy + pill_h + 28
    draw_centered(draw, "Universidad Católica de Cuyo · San Juan", fy, f_foot, WHITE)
    draw_centered(
        draw,
        "Zona horaria: America/Argentina/Buenos_Aires",
        fy + 34,
        f_foot,
        WHITE,
    )

    # Hit zones for PDF (normalized 0–1; ReportLab uses bottom-left origin)
    global LINK_ZONES
    pill_top = foot_top + 36 + f_free.size + 8 + 8
    pill_bottom = pill_top + pill_h
    LINK_ZONES = {
        "form_qr": (
            left_x / W,
            1 - (card_y + card_h) / H,
            (left_x + card_w) / W,
            1 - card_y / H,
        ),
        "meet_qr": (
            right_x / W,
            1 - (card_y + card_h) / H,
            (right_x + card_w) / W,
            1 - card_y / H,
        ),
        "form_btn": (
            px1 / W,
            1 - pill_bottom / H,
            (px1 + pill_w) / W,
            1 - pill_top / H,
        ),
        "meet_btn": (
            px2 / W,
            1 - pill_bottom / H,
            (px2 + pill_w) / W,
            1 - pill_top / H,
        ),
    }

    return img


LINK_ZONES: dict[str, tuple[float, float, float, float]] = {}


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

    def add_link(url: str, zone: tuple[float, float, float, float]) -> None:
        left, bottom, right, top = zone
        c.linkURL(
            url,
            (left * page_w, bottom * page_h, right * page_w, top * page_h),
            relative=0,
            thickness=0,
        )

    add_link(FORM_URL, LINK_ZONES["form_qr"])
    add_link(MEET_URL, LINK_ZONES["meet_qr"])
    add_link(FORM_URL, LINK_ZONES["form_btn"])
    add_link(MEET_URL, LINK_ZONES["meet_btn"])

    c.setTitle("Webinar EvaluAR — 13 agosto 2026 | Observatorio de IA")
    c.setAuthor("Observatorio de Inteligencia Artificial · UCCuyo")
    c.save()


def main() -> None:
    png = build_png()
    png.save(PNG_OUT, "PNG", optimize=True)
    build_pdf(png)
    print(f"OK {PNG_OUT} ({PNG_OUT.stat().st_size} bytes)")
    print(f"OK {PDF_OUT} ({PDF_OUT.stat().st_size} bytes)")
    print(f"Form → {FORM_URL}")
    print(f"Meet → {MEET_URL}")
    for name, zone in LINK_ZONES.items():
        print(f"  {name}: {tuple(round(v, 3) for v in zone)}")


if __name__ == "__main__":
    main()
