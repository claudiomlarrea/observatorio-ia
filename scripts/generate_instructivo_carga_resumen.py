#!/usr/bin/env python3
"""Genera instructivo de carga de artículo científico (2.000 palabras) · Jornadas IA 2026."""
from __future__ import annotations

import shutil
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Flowable, PageBreak, Paragraph, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parents[1]
OUT_REPO = ROOT / "docs/instructivos/instructivo-carga-resumen-jornadas-ia-2026.pdf"
OUT_ONEDRIVE = Path(
    "/Users/claudiolarrea/Library/CloudStorage/OneDrive-Personal/16 Secretaría de Investigación/"
    "60 Observatorio de Inteligencia Artificial/Jornadas de IA 2026/"
    "instructivo-carga-articulo-jornadas-ia-2026.pdf"
)
# Copia con nombre alineado al documento maestro
OUT_ONEDRIVE_ALIAS = OUT_ONEDRIVE
LOGO = ROOT / "assets/logo-observatorio-ia.png"

OBS_URL = "https://claudiomlarrea.github.io/observatorio-ia/"
JORNADAS_URL = "https://claudiomlarrea.github.io/observatorio-ia/#jornadas-ia"
DRIVE_ARTICULO = "https://drive.google.com/drive/folders/1oEx8kOI1x4Hx2LppKv35DTIB6S48LXLa"

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
        "Artículo científico · Jornadas IA 2026 · Observatorio de IA",
    )
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(w - 16 * mm, 10 * mm, f"Página {doc.page}")
    canvas.restoreState()


class CoverPage(Flowable):
    def wrap(self, aw, ah):
        return aw, ah

    def draw(self):
        c = self.canv
        w, h = A4
        c.setFillColor(GREEN_DARK)
        c.rect(0, 0, w, h, fill=1, stroke=0)

        logo_d = 48 * mm
        logo_y = h - 18 * mm - logo_d
        cx = w / 2
        cy = logo_y + logo_d / 2

        if LOGO.is_file():
            c.saveState()
            path = c.beginPath()
            path.circle(cx, cy, logo_d / 2)
            c.clipPath(path, stroke=0)
            c.drawImage(
                str(LOGO),
                cx - logo_d / 2,
                logo_y,
                width=logo_d,
                height=logo_d,
                preserveAspectRatio=True,
                mask="auto",
            )
            c.restoreState()

        text_y = logo_y - 14 * mm
        c.setFillColor(colors.white)
        c.setFont("Helvetica", 9)
        c.drawCentredString(
            w / 2,
            text_y,
            "UNIVERSIDAD CATÓLICA DE CUYO  ·  OBSERVATORIO DE INTELIGENCIA ARTIFICIAL",
        )
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(w / 2, text_y - 14 * mm, "Instructivo")
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(w / 2, text_y - 24 * mm, "Carga de artículo científico")
        c.setFont("Helvetica", 11)
        c.drawCentredString(w / 2, text_y - 36 * mm, "1° Jornadas internas de IA 2026")

        c.setFillColor(GOLD)
        c.rect(0, h * 0.36, w, 2, fill=1, stroke=0)

        c.setFillColor(colors.white)
        c.setFont("Helvetica", 11)
        for i, line in enumerate(
            [
                "Word · 2.000 palabras · Revista Cuadernos",
                "Cierre: 10 de septiembre de 2026",
                JORNADAS_URL,
            ]
        ):
            c.drawCentredString(w / 2, h * 0.30 - i * 16, line)


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
    base.add(
        ParagraphStyle(
            name="OIAExample",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=10,
            leading=13,
            textColor=MUTED,
            leftIndent=8,
            spaceAfter=6,
        )
    )
    return base


def _build_story(styles) -> list:
    story: list = [CoverPage(), PageBreak()]

    story.append(Paragraph("Índice", styles["OIAH2"]))
    for item in [
        "1. ¿Quiénes deben presentar artículo?",
        "2. Extensión y fecha límite",
        "3. Formato del archivo Word",
        "4. Estructura sugerida del artículo",
        "5. Publicación en Revista Cuadernos",
        "6. Nombre del archivo",
        "7. Cómo subir el artículo en el Observatorio",
        "8. Relación con la ponencia PowerPoint",
        "9. Contacto",
    ]:
        story.append(Paragraph(item, styles["OIABody"]))
    story.append(PageBreak())

    sections = [
        (
            "1. ¿Quiénes deben presentar artículo?",
            [
                "Los <b>expositores</b> de la 1° Jornadas Internas de IA 2026 deben presentar, "
                "como complemento de la ponencia, un <b>artículo científico</b> destinado a "
                "la Revista Cuadernos (número especial de Inteligencia Artificial).",
            ],
        ),
        (
            "2. Extensión y fecha límite",
            [
                "Extensión: <b>2.000 palabras</b> (conforme al documento maestro de las Jornadas "
                "y a la normativa editorial de la Revista Cuadernos).",
                "<b>Fecha límite de carga:</b> 10 de septiembre de 2026.",
                f"Sección Jornadas: <link href=\"{JORNADAS_URL}\">{JORNADAS_URL}</link>",
            ],
        ),
        (
            "3. Formato del archivo Word",
            [
                "Archivo Microsoft Word (<b>.docx</b>).",
                "Usá la plantilla institucional disponible en el cuadro "
                "<b>2. Cargar artículo científico</b> de la web del Observatorio.",
                "Tipografía recomendada: Arial 11 pt (o la que indique la normativa vigente "
                "de la Revista Cuadernos), interlineado 1,5 o el fijado por la revista.",
            ],
        ),
        (
            "4. Estructura sugerida del artículo",
            [
                "Salvo que la Revista Cuadernos indique otra estructura, se sugiere:",
                "• Título; autores; afiliación / unidad académica; correo de contacto.",
                "• Introducción y objetivos.",
                "• Marco o antecedentes (si corresponde).",
                "• Metodología o descripción de la experiencia.",
                "• Resultados / hallazgos.",
                "• Discusión y conclusiones.",
                "• Referencias bibliográficas según normas de la revista.",
            ],
        ),
        (
            "5. Publicación en Revista Cuadernos",
            [
                "La publicación en el número especial está sujeta a cumplir las "
                "<b>2.000 palabras</b>, la estructura y los requisitos formales de la "
                "Revista Cuadernos, y a la evaluación del comité editorial.",
            ],
        ),
        (
            "6. Nombre del archivo",
            [
                "<b>Area_Universidad_Apellido_Titulo.docx</b>",
                "Ejemplo: <b>Educacion_UCCuyo_Perez_IAEnLaEducacion.docx</b>",
            ],
        ),
        (
            "7. Cómo subir el artículo en el Observatorio",
            [
                "1. Abrí la sección Jornadas.",
                "2. En el cuadro <b>2. Cargar artículo científico</b>, descargá la plantilla "
                "si aún no la usaste.",
                "3. Tocá <b>Cargar artículo científico</b> → Google Drive → "
                "<b>Nuevo → Subir archivo</b>.",
                f"Carpeta Drive: <link href=\"{DRIVE_ARTICULO}\">{DRIVE_ARTICULO}</link>",
            ],
        ),
        (
            "8. Relación con la ponencia PowerPoint",
            [
                "El artículo (Word, 2.000 palabras) y la presentación (PowerPoint, hasta "
                "6 diapositivas) son entregas distintas e independientes; ambas vencen el "
                "10 de septiembre de 2026.",
            ],
        ),
        (
            "9. Contacto",
            [
                "observatorioia@uccuyo.edu.ar",
                f"Observatorio: <link href=\"{OBS_URL}\">{OBS_URL}</link>",
            ],
        ),
    ]

    for title, paras in sections:
        story.append(Paragraph(title, styles["OIAH2"]))
        for para in paras:
            story.append(Paragraph(para, styles["OIABody"]))
        story.append(Spacer(1, 4))
    return story


def write_pdf(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=22 * mm,
        bottomMargin=18 * mm,
        title="Instructivo — Artículo científico · Jornadas IA 2026",
        author="Observatorio de Inteligencia Artificial - UCCuyo",
    )
    doc.build(_build_story(_styles()), onFirstPage=_header_footer, onLaterPages=_header_footer)


def main() -> None:
    write_pdf(OUT_REPO)
    print(f"Wrote {OUT_REPO}")
    if OUT_ONEDRIVE.parent.is_dir():
        shutil.copy2(OUT_REPO, OUT_ONEDRIVE)
        # También mantener nombre anterior por compatibilidad local
        legacy = OUT_ONEDRIVE.parent / "instructivo-carga-resumen-jornadas-ia-2026.pdf"
        shutil.copy2(OUT_REPO, legacy)
        print(f"Copied to {OUT_ONEDRIVE}")
        print(f"Copied to {legacy}")


if __name__ == "__main__":
    main()
