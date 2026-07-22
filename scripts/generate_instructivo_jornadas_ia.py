#!/usr/bin/env python3
"""Genera docs/instructivos/instructivo-jornadas-ia-2026.pdf (estilo instructivos OIA)."""
from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Flowable, PageBreak, Paragraph, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parents[1]
OUT_REPO = ROOT / "docs/instructivos/instructivo-jornadas-ia-2026.pdf"
OUT_ONEDRIVE = Path(
    "/Users/claudiolarrea/Library/CloudStorage/OneDrive-Personal/16 Secretaría de Investigación/"
    "60 Observatorio de Inteligencia Artificial/Jornadas de IA 2026/instructivo-jornadas-ia-2026.pdf"
)
LOGO = ROOT / "assets/logo-observatorio-ia.png"
LOGO_CIRCLE = ROOT / "assets/logo-observatorio-ia-circle.png"

OBS_URL = "https://claudiomlarrea.github.io/observatorio-ia/"
JORNADAS_URL = "https://claudiomlarrea.github.io/observatorio-ia/#jornadas-ia"
FORM_ASISTENTES = (
    "https://docs.google.com/forms/d/e/1FAIpQLSc1GgR1PuBtnud5xlOGQSYUGeSYPmk1OjhHpefMSnm5XuUnvg/viewform?usp=sharing"
)
FORM_EXPOSITORES = (
    "https://docs.google.com/forms/d/e/1FAIpQLSdwoONOXU-N-r26LRvrYWBOA4SfKQjaJ4BDXTcJoD48whT7Tw/viewform?usp=sharing"
)

GREEN_DARK = colors.HexColor("#042f23")
GOLD = colors.HexColor("#c9a227")
TEXT = colors.HexColor("#1f1418")
MUTED = colors.HexColor("#5c4f54")


def _header_footer(canvas, doc) -> None:
    if doc.page == 1:
        return
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(GREEN_DARK)
    canvas.rect(0, h - 14 * mm, w, 14 * mm, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
    canvas.rect(0, h - 14 * mm, 3 * mm, 14 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(
        16 * mm,
        h - 9 * mm,
        "1° Jornadas de IA 2026 · Instructivo UCCuyo · Observatorio de IA",
    )
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(w - 16 * mm, 10 * mm, f"Página {doc.page}")
    canvas.restoreState()


def _ensure_circular_logo() -> Path | None:
    """Recorta el logo a un círculo con fondo transparente (sin cuadrado blanco)."""
    src = LOGO if LOGO.is_file() else None
    if src is None:
        return None
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return src

    im = Image.open(src).convert("RGBA")
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


class CoverPage(Flowable):
    def wrap(self, aw, ah):
        return aw, ah

    def draw(self):
        c = self.canv
        w, h = A4
        c.setFillColor(GREEN_DARK)
        c.rect(0, 0, w, h, fill=1, stroke=0)

        # Logo circular ARRIBA (clip elíptico: sin cuadrado blanco)
        logo_d = 48 * mm
        logo_top = h - 18 * mm
        logo_y = logo_top - logo_d
        cx = w / 2
        cy = logo_y + logo_d / 2

        logo_path = LOGO if LOGO.is_file() else None
        if logo_path:
            c.saveState()
            path = c.beginPath()
            path.circle(cx, cy, logo_d / 2)
            c.clipPath(path, stroke=0)
            c.drawImage(
                str(logo_path),
                cx - logo_d / 2,
                logo_y,
                width=logo_d,
                height=logo_d,
                preserveAspectRatio=True,
                mask="auto",
            )
            c.restoreState()

        # Textos debajo del logo (sin solape)
        text_y = logo_y - 14 * mm
        c.setFillColor(colors.white)
        c.setFont("Helvetica", 9)
        c.drawCentredString(
            w / 2,
            text_y,
            "UNIVERSIDAD CATÓLICA DE CUYO  ·  OBSERVATORIO DE INTELIGENCIA ARTIFICIAL",
        )
        c.setFont("Helvetica-Bold", 20)
        c.drawCentredString(w / 2, text_y - 14 * mm, "Instructivo general")
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(w / 2, text_y - 24 * mm, "de las Jornadas de IA 2026")
        c.setFont("Helvetica", 11)
        c.drawCentredString(w / 2, text_y - 36 * mm, "1° Jornadas internas · Encuentro virtual")

        c.setFillColor(GOLD)
        c.rect(0, h * 0.36, w, 2, fill=1, stroke=0)

        c.setFillColor(colors.white)
        c.setFont("Helvetica", 11)
        for i, line in enumerate(
            [
                "Inscripción · Artículo científico (2.000 palabras) · PowerPoint",
                OBS_URL,
                "observatorioia@uccuyo.edu.ar",
            ]
        ):
            c.drawCentredString(w / 2, h * 0.30 - i * 16, line)


def _build_story(styles) -> list:
    story: list = [CoverPage(), PageBreak()]

    story.append(Paragraph("Índice", styles["OIAH2"]))
    for item in [
        "1. ¿Qué son las Jornadas?",
        "2. Datos generales y fechas",
        "3. Cómo acceder desde el Observatorio de IA",
        "4. Paso 1 — Inscripción (asistentes / expositores)",
        "5. Paso 2 — Cargar artículo científico (Word)",
        "6. Paso 3 — Cargar presentación (PowerPoint)",
        "7. Requisitos de las entregas",
        "8. Publicación en Revista Cuadernos",
        "9. Contacto y URLs de referencia",
    ]:
        story.append(Paragraph(item, styles["OIABody"]))
    story.append(PageBreak())

    sections = [
        (
            "1. ¿Qué son las Jornadas?",
            [
                "Las <b>1° Jornadas Internas de Inteligencia Artificial 2026</b> son un "
                "encuentro virtual del Observatorio de IA de la UCCuyo (Res. N° 741-CS-2025) "
                "para visibilizar experiencias de uso de IA en docencia, investigación y "
                "gestión, y favorecer el diálogo interdisciplinario sobre oportunidades, "
                "riesgos y desafíos éticos.",
                "Destinatarios: docentes, investigadores y estudiantes de Facultades, "
                "Institutos y Sedes (San Juan, Mendoza y San Luis).",
            ],
        ),
        (
            "2. Datos generales y fechas",
            [
                "<b>Encuentro:</b> 6 de octubre de 2026, 15:00 h · modalidad virtual.",
                "<b>Cierre artículo científico y PowerPoint (expositores):</b> "
                "10 de septiembre de 2026.",
                "<b>Cierre inscripción como asistente:</b> 28 de septiembre de 2026.",
            ],
        ),
        (
            "3. Cómo acceder desde el Observatorio de IA",
            [
                "<b>Observatorio de IA</b><br/>URL: "
                f'<link href="{OBS_URL}">{OBS_URL}</link>',
                "En el menú superior elegí <b>Jornadas de IA</b>.",
                "<b>Sección Jornadas</b><br/>URL: "
                f'<link href="{JORNADAS_URL}">{JORNADAS_URL}</link>',
                "Allí están los tres pasos: inscripción, artículo científico y presentación.",
            ],
        ),
        (
            "4. Paso 1 — Inscripción (asistentes / expositores)",
            [
                "Hay dos formularios distintos (solo para responder, no para editar):",
                f"<b>Asistentes:</b> <link href=\"{FORM_ASISTENTES}\">{FORM_ASISTENTES}</link>",
                f"<b>Expositores:</b> <link href=\"{FORM_EXPOSITORES}\">{FORM_EXPOSITORES}</link>",
                "Si exponés, incluí el título de la ponencia en el formulario de expositores "
                "y completá luego los pasos 2 y 3.",
            ],
        ),
        (
            "5. Paso 2 — Cargar artículo científico (Word)",
            [
                "Como complemento de la ponencia, los expositores deben cargar un "
                "<b>artículo científico de 2.000 palabras</b> para la Revista Cuadernos "
                "(normativa editorial vigente).",
                "Cuadro <b>2. Cargar artículo científico</b> → plantilla Word e instructivo "
                "específico → subida a Google Drive.",
                "Nombre sugerido: <b>Area_Universidad_Apellido_Titulo.docx</b>",
            ],
        ),
        (
            "6. Paso 3 — Cargar presentación (PowerPoint)",
            [
                "Material de exposición del 6 de octubre: PowerPoint (.ppt o .pptx), "
                "<b>hasta 6 diapositivas</b>; exposición de hasta <b>10 minutos</b>.",
                "Cuadro <b>3. Cargar presentación en PowerPoint</b> → plantilla e instructivo.",
                "Nombre sugerido: <b>Area_Universidad_Apellido_TituloCorto.pptx</b>",
            ],
        ),
        (
            "7. Requisitos de las entregas",
            [
                "Artículo científico y PowerPoint son entregas distintas e independientes; "
                "ambas vencen el <b>10 de septiembre de 2026</b> para expositores.",
                "Ejes temáticos: IA en Educación; Derecho y Ciencias Sociales; Salud y "
                "Ciencias Médicas; Ciencias Veterinarias; Economía y sectores productivos; "
                "Seguridad; Ciencias Químicas y Tecnológicas; Ética, teología y antropología; "
                "investigación interdisciplinaria y gestión universitaria (eje transversal).",
            ],
        ),
        (
            "8. Publicación en Revista Cuadernos",
            [
                "Los artículos científicos podrán publicarse en un número especial de la "
                "Revista Cuadernos (UCCuyo) dedicado a Inteligencia Artificial, sujetos a "
                "la extensión de <b>2.000 palabras</b>, la estructura y la evaluación del "
                "comité editorial conforme a la normativa de la revista.",
            ],
        ),
        (
            "9. Contacto y URLs de referencia",
            [
                "Correo: observatorioia@uccuyo.edu.ar",
                f"Observatorio: <link href=\"{OBS_URL}\">{OBS_URL}</link>",
                f"Jornadas: <link href=\"{JORNADAS_URL}\">{JORNADAS_URL}</link>",
            ],
        ),
    ]

    for title, paras in sections:
        story.append(Paragraph(title, styles["OIAH2"]))
        for para in paras:
            story.append(Paragraph(para, styles["OIABody"]))
        story.append(Spacer(1, 4))
    return story


def _styles():
    base = getSampleStyleSheet()
    base.add(
        ParagraphStyle(
            name="OIAH2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=GREEN_DARK,
            spaceBefore=8,
            spaceAfter=6,
        )
    )
    base.add(
        ParagraphStyle(
            name="OIABody",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=14,
            textColor=TEXT,
            spaceAfter=6,
        )
    )
    return base


def write_pdf(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=22 * mm,
        bottomMargin=18 * mm,
        title="Instructivo 1° Jornadas de IA 2026",
        author="Observatorio de Inteligencia Artificial - UCCuyo",
    )
    doc.build(_build_story(_styles()), onFirstPage=_header_footer, onLaterPages=_header_footer)


def main() -> None:
    write_pdf(OUT_REPO)
    print(f"Wrote {OUT_REPO}")
    if OUT_ONEDRIVE.parent.is_dir():
        import shutil

        shutil.copy2(OUT_REPO, OUT_ONEDRIVE)
        print(f"Copied to {OUT_ONEDRIVE}")
    else:
        print(f"Skip OneDrive (folder not found): {OUT_ONEDRIVE.parent}")


if __name__ == "__main__":
    main()
