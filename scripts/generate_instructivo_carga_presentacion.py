#!/usr/bin/env python3
"""Genera docs/instructivos/instructivo-carga-presentacion-jornadas-ia-2026.pdf."""
from __future__ import annotations

import shutil
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Flowable, PageBreak, Paragraph, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parents[1]
OUT_REPO = ROOT / "docs/instructivos/instructivo-carga-presentacion-jornadas-ia-2026.pdf"
OUT_ONEDRIVE = Path(
    "/Users/claudiolarrea/Library/CloudStorage/OneDrive-Personal/16 Secretaría de Investigación/"
    "60 Observatorio de Inteligencia Artificial/Jornadas de IA 2026/"
    "instructivo-carga-presentacion-jornadas-ia-2026.pdf"
)
LOGO = ROOT / "assets/logo-observatorio-ia.png"

OBS_URL = "https://claudiomlarrea.github.io/observatorio-ia/"
JORNADAS_URL = "https://claudiomlarrea.github.io/observatorio-ia/#jornadas-ia"
DRIVE_PPT = "https://drive.google.com/drive/folders/10Ma7p_Lo3tObfE0N_nXEgwqZogqQzXQE"

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
        "Carga de presentación · Jornadas IA 2026 · Observatorio de IA",
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
        logo_top = h - 18 * mm
        logo_y = logo_top - logo_d
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
        c.drawCentredString(w / 2, text_y - 24 * mm, "Carga de presentaciones PowerPoint")
        c.setFont("Helvetica", 11)
        c.drawCentredString(w / 2, text_y - 36 * mm, "1° Jornadas internas de IA 2026")

        c.setFillColor(GOLD)
        c.rect(0, h * 0.36, w, 2, fill=1, stroke=0)

        c.setFillColor(colors.white)
        c.setFont("Helvetica", 11)
        for i, line in enumerate(
            [
                "Hasta 6 diapositivas · Exposición de hasta 10 minutos",
                "Cierre de carga: 10 de septiembre de 2026",
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
        "1. Alcance de la presentación oral",
        "2. Formato PowerPoint y plantilla",
        "3. Recomendaciones para el día del encuentro",
        "4. Fecha límite y dónde cargar",
        "5. Nombre del archivo",
        "6. Cómo subir el PowerPoint en el Observatorio",
        "7. Relación con el artículo científico e inscripción",
        "8. Contacto",
    ]:
        story.append(Paragraph(item, styles["OIABody"]))
    story.append(PageBreak())

    sections = [
        (
            "1. Alcance de la presentación oral",
            [
                "Las presentaciones orales se realizarán en "
                "<b>no más de 10 minutos</b>, con hasta <b>6 diapositivas</b> elaboradas "
                "en PowerPoint (.ppt o .pptx).",
                "El encuentro es virtual: 6 de octubre de 2026, 15:00 h.",
            ],
        ),
        (
            "2. Formato PowerPoint y plantilla",
            [
                "Utilizá la <b>plantilla oficial de PPT</b> disponible en el cuadro 3 "
                "de la sección Jornadas.",
                "Respetá el límite de <b>hasta 6 diapositivas</b>.",
                "Estructura sugerida: título y autores; contexto/objetivo; método; "
                "resultados; conclusiones; cierre.",
                "Preferí tipografía legible, poco texto por diapositiva y contraste alto.",
            ],
        ),
        (
            "3. Recomendaciones para el día del encuentro",
            [
                "Estimá y ensayá la presentación en un máximo de 10 minutos.",
                "Tené previsto un cronómetro para marcar el tiempo.",
                "Respetá las indicaciones de «hasta 6 diapositivas».",
            ],
        ),
        (
            "4. Fecha límite y dónde cargar",
            [
                "<b>Fecha para carga del PPT:</b> 10 de septiembre de 2026.",
                f"Sitio del Observatorio: <link href=\"{OBS_URL}\">{OBS_URL}</link>",
                f"Sección Jornadas (paso 3): <link href=\"{JORNADAS_URL}\">{JORNADAS_URL}</link>",
            ],
        ),
        (
            "5. Nombre del archivo",
            [
                "<b>Area_Universidad_Apellido_TituloCorto.pptx</b>",
                "Ejemplo: <b>Educacion_UCCuyo_Perez_IAEnLaEducacion.pptx</b>",
            ],
        ),
        (
            "6. Cómo subir el PowerPoint en el Observatorio",
            [
                "1. Abrí la sección Jornadas.",
                "2. En el cuadro <b>3. Cargar presentación en PowerPoint</b>, tocá el botón.",
                "3. En Google Drive: <b>Nuevo → Subir archivo</b>.",
                f"Carpeta Drive: <link href=\"{DRIVE_PPT}\">{DRIVE_PPT}</link>",
            ],
        ),
        (
            "7. Relación con el artículo científico e inscripción",
            [
                "La presentación PowerPoint y el <b>artículo científico de 2.000 palabras</b> "
                "son entregas distintas; ambas vencen el <b>10 de septiembre de 2026</b> "
                "para expositores.",
                "Completá también la <b>inscripción</b> (paso 1) y la "
                "<b>carga del artículo</b> (paso 2).",
            ],
        ),
        (
            "8. Contacto",
            [
                "Consultas: observatorioia@uccuyo.edu.ar",
                f"Observatorio: <link href=\"{OBS_URL}\">{OBS_URL}</link>",
            ],
        ),
    ]

    for title, paras in sections:
        story.append(Paragraph(title, styles["OIAH2"]))
        for para in paras:
            if para.startswith("Ejemplo:"):
                story.append(Paragraph(para, styles["OIAExample"]))
            else:
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
        title="Instructivo — Carga de presentaciones PowerPoint · Jornadas IA 2026",
        author="Observatorio de Inteligencia Artificial - UCCuyo",
    )
    doc.build(_build_story(_styles()), onFirstPage=_header_footer, onLaterPages=_header_footer)


def main() -> None:
    write_pdf(OUT_REPO)
    print(f"Wrote {OUT_REPO}")
    if OUT_ONEDRIVE.parent.is_dir():
        shutil.copy2(OUT_REPO, OUT_ONEDRIVE)
        print(f"Copied to {OUT_ONEDRIVE}")
    else:
        print(f"Skip OneDrive: {OUT_ONEDRIVE.parent}")


if __name__ == "__main__":
    main()
