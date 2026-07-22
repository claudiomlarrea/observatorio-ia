#!/usr/bin/env python3
"""Genera docs/instructivos/instructivo-carga-resumen-jornadas-ia-2026.pdf."""
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
    "instructivo-carga-resumen-jornadas-ia-2026.pdf"
)
LOGO = ROOT / "assets/logo-observatorio-ia.png"

OBS_URL = "https://claudiomlarrea.github.io/observatorio-ia/"
JORNADAS_URL = "https://claudiomlarrea.github.io/observatorio-ia/#jornadas-ia"
DRIVE_RESUMEN = "https://drive.google.com/drive/folders/1oEx8kOI1x4Hx2LppKv35DTIB6S48LXLa"

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
        "Carga de resumen · Jornadas IA 2026 · Observatorio de IA",
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
        c.setFont("Helvetica-Bold", 15)
        c.drawCentredString(w / 2, text_y - 24 * mm, "Presentación de resúmenes")
        c.setFont("Helvetica", 11)
        c.drawCentredString(w / 2, text_y - 36 * mm, "1° Jornadas internas de IA 2026")

        c.setFillColor(GOLD)
        c.rect(0, h * 0.36, w, 2, fill=1, stroke=0)

        c.setFillColor(colors.white)
        c.setFont("Helvetica", 11)
        for i, line in enumerate(
            [
                "Formato Word · Hasta 250 palabras · Cierre 10 de septiembre de 2026",
                JORNADAS_URL,
                "observatorioia@uccuyo.edu.ar",
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
        "1. ¿Quiénes deben presentar resumen?",
        "2. Fecha límite y dónde cargar",
        "3. Formato del archivo Word",
        "4. Encabezamiento (título, autores, unidad, correo)",
        "5. Contenido del resumen",
        "6. Qué no incluir",
        "7. Nombre del archivo",
        "8. Cómo subir el archivo en el Observatorio",
        "9. Consejos prácticos y contacto",
    ]:
        story.append(Paragraph(item, styles["OIABody"]))
    story.append(PageBreak())

    sections = [
        (
            "1. ¿Quiénes deben presentar resumen?",
            [
                "Quienes participen de la <b>1° Jornadas Internas de IA de la UCCuyo</b> "
                "con trabajos de investigación sobre Inteligencia Artificial y se inscriban "
                "como <b>expositor/a</b>.",
                "El resumen se carga desde la página del Observatorio de IA y es el texto "
                "que podrá publicarse en el número especial de la Revista Cuadernos.",
            ],
        ),
        (
            "2. Fecha límite y dónde cargar",
            [
                "<b>Fecha límite:</b> 10 de septiembre de 2026.",
                f"Sitio del Observatorio: <link href=\"{OBS_URL}\">{OBS_URL}</link>",
                f"Sección Jornadas (paso 2): <link href=\"{JORNADAS_URL}\">{JORNADAS_URL}</link>",
                "En el cuadro <b>2. Cargar resumen</b> usá el botón rojo homónimo: se abrirá "
                "Google Drive para subir el Word.",
            ],
        ),
        (
            "3. Formato del archivo Word",
            [
                "Archivo en <b>Microsoft Word (.docx)</b>.",
                "Extensión máxima: <b>250 palabras</b>.",
                "Tipografía: <b>Arial 10 pt</b>, interlineado sencillo.",
            ],
        ),
        (
            "4. Encabezamiento (título, autores, unidad, correo)",
            [
                "<b>Título:</b> en negrita, mayúsculas/minúsculas tipo oración, centrado.",
                "Ejemplo: «Inteligencia Artificial en la Educación»",
                "Dejar un renglón en blanco.",
                "<b>Autores:</b> en negrita, mayúsculas/minúsculas tipo oración, centrado. "
                "Nombre (iniciales) y apellido (como en el documento de identidad), sin título "
                "de grado, separados por comas. <b>Subrayar</b> al investigador que presentará "
                "la comunicación. Usar supraíndice si hay distintas instituciones.",
                "Dejar un renglón en blanco.",
                "<b>Unidad académica:</b> mayúsculas/minúsculas tipo oración, cursiva, centrado. "
                "Si hay más de una, respetar el orden de los supraíndices, separadas por comas.",
                "<b>Correo electrónico de contacto:</b> minúsculas, cursiva, centrado.",
                "Dejar un renglón en blanco antes del texto del resumen.",
            ],
        ),
        (
            "5. Contenido del resumen",
            [
                "El cuerpo del resumen debe incluir, de forma clara y concisa:",
                "• una breve introducción;",
                "• la metodología utilizada;",
                "• los resultados obtenidos;",
                "• un breve párrafo de conclusiones.",
            ],
        ),
        (
            "6. Qué no incluir",
            [
                "No se aceptan cuadros, gráficos ni referencias bibliográficas.",
                "Las abreviaturas deben definirse la primera vez que se usan en el texto.",
            ],
        ),
        (
            "7. Nombre del archivo",
            [
                "Usá este patrón (sin espacios; podés reemplazar espacios del título por "
                "guiones bajos o juntar palabras):",
                "<b>Area_Universidad_ApellidoPrimerAutor_TituloDelTrabajo.docx</b>",
            ],
        ),
        (
            "8. Cómo subir el archivo en el Observatorio",
            [
                "1. Abrí la sección Jornadas: "
                f'<link href="{JORNADAS_URL}">{JORNADAS_URL}</link>',
                "2. En el cuadro <b>2. Cargar resumen</b>, tocá <b>Cargar resumen</b>.",
                "3. En Google Drive: <b>Nuevo → Subir archivo</b> y elegí tu .docx.",
                "4. Verificá que el archivo quede en la carpeta de resúmenes.",
                f"Carpeta Drive: <link href=\"{DRIVE_RESUMEN}\">{DRIVE_RESUMEN}</link>",
                "Recordá también completar la <b>inscripción</b> (paso 1) y, si corresponde, "
                "la <b>presentación PowerPoint</b> (paso 3, hasta 5 diapositivas).",
            ],
        ),
        (
            "9. Consejos prácticos y contacto",
            [
                "Revisá el conteo de palabras antes de subir (máximo 250).",
                "Guardá una copia local del Word con el mismo nombre de archivo.",
                "Si el enlace de Drive pide permiso, escribí a observatorioia@uccuyo.edu.ar.",
                "Consultas: observatorioia@uccuyo.edu.ar",
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

    # ejemplo de nombre
    story.append(
        Paragraph(
            "Ejemplo de nombre de archivo: "
            "<b>Educacion_UCCuyo_Perez_InteligenciaArtificialEnLaEducacion.docx</b>",
            styles["OIAExample"],
        )
    )
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
        title="Instructivo — Presentación de resúmenes · Jornadas IA 2026",
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
