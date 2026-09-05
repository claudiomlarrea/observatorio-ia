#!/usr/bin/env python3
"""Banner apaisado LinkedIn: Biblioteca de IA del Observatorio (PNG + PDF con links)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / "assets" / "logo-observatorio-ia-circle.png"
PNG_OUT = ROOT / "assets" / "banner-biblioteca-ia-linkedin.png"
PDF_OUT = ROOT / "assets" / "banner-biblioteca-ia-linkedin.pdf"

BIBLIOTECA_URL = "https://observatorio-ia.uccuyo.edu.ar/#publicaciones"
OBSERVATORIO_URL = "https://observatorio-ia.uccuyo.edu.ar/"

# LinkedIn landscape 16:9 (alta resolución para el feed)
W, H = 1920, 1080
LEFT_W = 540

GREEN = (6, 74, 56)
GREEN_DARK = (4, 47, 35)
GREEN_MID = (13, 110, 79)
RED = (122, 21, 50)
RED_DARK = (74, 12, 31)
RED_MID = (156, 39, 72)
GOLD = (232, 185, 35)
WHITE = (255, 255, 255)
MUTED = (244, 240, 241)
TEXT = (31, 20, 24)
TEXT_SOFT = (92, 79, 84)

FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

LINK_ZONES: dict[str, tuple[float, float, float, float]] = {}
HTML_HOTSPOTS: dict[str, dict[str, float]] = {}


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def text_width(draw: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont) -> int:
    return int(draw.textlength(text, font=f))


def rounded_chip(
    base: Image.Image,
    xy: tuple[int, int],
    size: tuple[int, int],
    fill: tuple[int, int, int],
    angle: float,
    radius: int = 14,
) -> None:
    w, h = size
    tile = Image.new("RGBA", (w + 8, h + 8), (0, 0, 0, 0))
    ImageDraw.Draw(tile).rounded_rectangle((4, 4, w, h), radius=radius, fill=(*fill, 255))
    rot = tile.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
    shadow = rot.filter(ImageFilter.GaussianBlur(6))
    shade = Image.new("RGBA", shadow.size, (0, 0, 0, 0))
    shade.paste((20, 12, 14, 55), (0, 0), shadow)
    base.alpha_composite(shade, (xy[0] + 6, xy[1] + 8))
    base.alpha_composite(rot, xy)


def draw_3d_button(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    fill: tuple[int, int, int],
    shadow: tuple[int, int, int],
    label: str,
    f: ImageFont.FreeTypeFont,
    text_fill: tuple[int, int, int] = WHITE,
) -> None:
    x0, y0, x1, y1 = box
    draw.rounded_rectangle((x0, y0 + 6, x1, y1 + 6), radius=18, fill=shadow)
    draw.rounded_rectangle(box, radius=18, fill=fill)
    tw = text_width(draw, label, f)
    th = f.size
    tx = x0 + (x1 - x0 - tw) // 2
    ty = y0 + (y1 - y0 - th) // 2 - 2
    draw.text((tx, ty), label, font=f, fill=text_fill)


def set_zone(name: str, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    LINK_ZONES[name] = (
        x0 / W,
        1 - y1 / H,
        x1 / W,
        1 - y0 / H,
    )
    HTML_HOTSPOTS[name] = {
        "left": round(100 * x0 / W, 3),
        "top": round(100 * y0 / H, 3),
        "width": round(100 * (x1 - x0) / W, 3),
        "height": round(100 * (y1 - y0) / H, 3),
    }


def build_png() -> Image.Image:
    img = Image.new("RGBA", (W, H), (*WHITE, 255))
    draw = ImageDraw.Draw(img)

    # Panel izquierdo institucional
    draw.rectangle((0, 0, LEFT_W, H), fill=GREEN)
    draw.rectangle((0, 0, LEFT_W, H), fill=None)
    draw.rectangle((LEFT_W - 14, 0, LEFT_W, H), fill=GOLD)

    # Acento inferior del panel
    draw.rectangle((0, H - 18, LEFT_W - 14, H), fill=GREEN_DARK)

    logo = Image.open(LOGO).convert("RGBA")
    logo_size = 268
    logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    logo_x = (LEFT_W - 14 - logo_size) // 2
    img.paste(logo, (logo_x, 118), logo)

    f_left_k = font(FONT_BOLD, 22)
    f_left_t = font(FONT_BOLD, 36)
    f_left_s = font(FONT_REG, 22)

    y = 430
    for line, f, col in (
        ("OBSERVATORIO DE", f_left_k, GOLD),
        ("INTELIGENCIA ARTIFICIAL", f_left_t, WHITE),
        ("Universidad Católica de Cuyo", f_left_s, (220, 232, 226)),
    ):
        tw = text_width(draw, line, f)
        draw.text(((LEFT_W - 14 - tw) // 2, y), line, font=f, fill=col)
        y += f.size + 10

    # Bloque de cifra en el panel verde
    badge = (48, 620, LEFT_W - 62, 980)
    draw.rounded_rectangle(badge, radius=22, fill=GREEN_DARK)
    f_plus = font(FONT_BOLD, 28)
    f_num = font(FONT_BOLD, 64)
    f_num_sub = font(FONT_BOLD, 28)
    f_badge = font(FONT_REG, 22)
    draw.text((78, 652), "+ DE", font=f_plus, fill=GOLD)
    draw.text((78, 692), "19 millones", font=f_num, fill=WHITE)
    draw.text((78, 770), "de artículos", font=f_num_sub, fill=GOLD)
    wrap = [
        "Publicaciones científicas",
        "mundiales sobre IA,",
        "en un solo ingreso.",
    ]
    by = 830
    for line in wrap:
        draw.text((78, by), line, font=f_badge, fill=(210, 224, 218))
        by += 32

    # Fondo derecho + chips decorativos (identidad visual de piezas LinkedIn)
    rounded_chip(img, (1680, -30), (210, 70), RED, -18)
    rounded_chip(img, (1760, 70), (170, 54), GREEN, -22)
    rounded_chip(img, (1640, 120), (140, 44), GOLD, -16)
    rounded_chip(img, (1788, 780), (190, 62), GREEN_MID, -20)
    rounded_chip(img, (1688, 848), (160, 50), RED_MID, -14)
    rounded_chip(img, (1820, 720), (120, 40), GOLD, -24)

    f_kicker = font(FONT_BOLD, 26)
    f_title = font(FONT_BOLD, 58)
    f_title2 = font(FONT_BOLD, 42)
    f_body = font(FONT_REG, 28)
    f_btn = font(FONT_BOLD, 30)
    f_url = font(FONT_REG, 18)
    f_inst = font(FONT_REG, 22)

    rx = 610
    y = 78
    draw.text((rx, y), "BIBLIOTECA DE IA", font=f_kicker, fill=RED)
    y = 128
    draw.rectangle((rx, y, rx + 92, y + 6), fill=GOLD)

    y = 168
    draw.text((rx, y), "Ingresá a la biblioteca de", font=f_title2, fill=TEXT)
    y = 230
    draw.text((rx, y), "publicaciones mundiales", font=f_title, fill=GREEN)
    y = 308
    draw.text((rx, y), "sobre inteligencia artificial", font=f_title2, fill=RED)

    y = 390
    body_lines = [
        "Más de 19 millones de artículos científicos, reunidos en la",
        "Biblioteca de IA del Observatorio de IA de la Universidad",
        "Católica de Cuyo. Explorá el índice global y entrá al sitio.",
    ]
    for line in body_lines:
        draw.text((rx, y), line, font=f_body, fill=TEXT_SOFT)
        y += 42

    # Botones CTA
    btn_y = 560
    btn_h = 92
    btn_w = 560
    gap = 36
    total = btn_w * 2 + gap
    start_x = rx
    # Si no entra, achicar un poco
    max_right = W - 72
    if start_x + total > max_right:
        btn_w = (max_right - start_x - gap) // 2

    b1 = (start_x, btn_y, start_x + btn_w, btn_y + btn_h)
    b2 = (start_x + btn_w + gap, btn_y, start_x + btn_w + gap + btn_w, btn_y + btn_h)

    draw_3d_button(draw, b1, GREEN_MID, GREEN_DARK, "Ingresá a la Biblioteca", f_btn)
    draw_3d_button(draw, b2, RED, RED_DARK, "Ingresá al Observatorio", f_btn)

    set_zone("biblioteca", b1)
    set_zone("observatorio", b2)

    # URLs visibles (LinkedIn no hace clicables las imágenes)
    draw.text((b1[0] + 8, btn_y + btn_h + 22), BIBLIOTECA_URL, font=f_url, fill=GREEN_MID)
    u2 = OBSERVATORIO_URL.rstrip("/")
    tw2 = text_width(draw, u2, f_url)
    draw.text((b2[2] - tw2 - 8, btn_y + btn_h + 22), u2, font=f_url, fill=RED)

    # Franja inferior
    band_y = 920
    draw.rectangle((LEFT_W, band_y, W, H), fill=MUTED)
    draw.rectangle((LEFT_W, band_y, W, band_y + 6), fill=RED)
    inst = "Observatorio de Inteligencia Artificial  ·  Universidad Católica de Cuyo"
    tw = text_width(draw, inst, f_inst)
    draw.text((LEFT_W + (W - LEFT_W - tw) // 2, 978), inst, font=f_inst, fill=TEXT_SOFT)

    return img.convert("RGB")


def build_pdf(png: Image.Image) -> None:
    page_w = 960.0
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

    add_link(BIBLIOTECA_URL, LINK_ZONES["biblioteca"])
    add_link(OBSERVATORIO_URL, LINK_ZONES["observatorio"])
    c.setTitle("Biblioteca de IA — Observatorio de IA · UCCuyo")
    c.setAuthor("Observatorio de Inteligencia Artificial · UCCuyo")
    c.save()


def main() -> None:
    png = build_png()
    png.save(PNG_OUT, "PNG", optimize=True)
    build_pdf(png)
    print(f"OK {PNG_OUT} ({PNG_OUT.stat().st_size} bytes)")
    print(f"OK {PDF_OUT} ({PDF_OUT.stat().st_size} bytes)")
    print("HTML hotspots (%)")
    for name, box in HTML_HOTSPOTS.items():
        print(f"  {name}: {box}")


if __name__ == "__main__":
    main()
