#!/usr/bin/env python3
"""Plantilla Word (.docx) Anexo I adaptada a la Convocatoria AURA 2026.

Basada en el Anexo I de Presentación de proyectos de investigación
(Secretaría de Investigación y Vinculación Tecnológica · UCCuyo),
con campos específicos del Plan Integral AURA.
"""
from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
OUT = (
    ROOT
    / "instituto-del-agua/documentos/plantillas"
    / "plantilla-proyecto-investigacion-extension-AURA-2026.docx"
)
LOGO_GOTA = ROOT / "instituto-del-agua/assets/logo-aura-gota.png"
LOGO_UCCUYO = ROOT / "instituto-del-agua/assets/logo-uccuyo.png"

GREEN = RGBColor(0x04, 0x2F, 0x23)
WATER = RGBColor(0x0E, 0x4F, 0x72)
INST = RGBColor(0x7A, 0x15, 0x32)
MUTED = RGBColor(0x5C, 0x4F, 0x54)
BLACK = RGBColor(0x1F, 0x14, 0x18)


def _set_run_font(run, *, size=10, bold=False, italic=False, color=None, name="Arial"):
    run.font.name = name
    run._element.rPr.rFonts.set(qn("w:eastAsia"), name)
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    if color is not None:
        run.font.color.rgb = color


def _shade_cell(cell, hex_color: str) -> None:
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), hex_color)
    shd.set(qn("w:val"), "clear")
    tcPr.append(shd)


def _set_cell_margins(cell, top=40, bottom=40, left=60, right=60) -> None:
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    for child in list(tcPr):
        if child.tag == qn("w:tcMar"):
            tcPr.remove(child)
    tcMar = OxmlElement("w:tcMar")
    for m, v in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        node = OxmlElement(f"w:{m}")
        node.set(qn("w:w"), str(v))
        node.set(qn("w:type"), "dxa")
        tcMar.append(node)
    tcPr.append(tcMar)


def _p(
    doc: Document,
    text: str,
    *,
    size=10,
    bold=False,
    italic=False,
    center=False,
    color=None,
    space_after=6,
    space_before=0,
    justify=True,
):
    p = doc.add_paragraph()
    if center:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif justify:
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    else:
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    r = p.add_run(text)
    _set_run_font(r, size=size, bold=bold, italic=italic, color=color)
    return p


def _heading(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(6)
    r = p.add_run(text)
    _set_run_font(r, size=11, bold=True, color=WATER)


def _field(doc: Document, label: str, hint: str = "") -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.space_before = Pt(2)
    r1 = p.add_run(label)
    _set_run_font(r1, size=10, bold=True, color=BLACK)
    if hint:
        r2 = p.add_run("  " + hint)
        _set_run_font(r2, size=9, italic=True, color=MUTED)


def _blank_lines(doc: Document, n: int = 2) -> None:
    for _ in range(n):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run("___________________________________________________________________________")
        _set_run_font(r, size=9, color=RGBColor(0xC8, 0xC0, 0xC4))


def _hint_box(doc: Document, lines: list[str]) -> None:
    _p(
        doc,
        "Recomendaciones / completar:",
        size=9,
        bold=True,
        italic=False,
        color=GREEN,
        space_before=4,
        space_after=2,
        justify=False,
    )
    for line in lines:
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.space_after = Pt(1)
        r = p.add_run(line)
        _set_run_font(r, size=9, italic=True, color=MUTED)


def _add_banner(doc: Document) -> None:
    table = doc.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    cell_logo = table.cell(0, 0)
    cell_text = table.cell(0, 1)
    cell_logo.width = Cm(2.6)
    cell_text.width = Cm(14.5)

    for cell in (cell_logo, cell_text):
        _shade_cell(cell, "0E4F72")
        _set_cell_margins(cell, top=80, bottom=80, left=80, right=80)

    p_logo = cell_logo.paragraphs[0]
    p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    logo = LOGO_GOTA if LOGO_GOTA.is_file() else LOGO_UCCUYO
    if logo.is_file():
        run = p_logo.add_run()
        run.add_picture(str(logo), width=Cm(1.85))

    lines = [
        ("UNIVERSIDAD CATÓLICA DE CUYO · Secretaría de Investigación y Extensión", 8, False),
        ("Plan Integral AURA · Convocatoria 2026", 13, True),
        (
            "Plantilla de presentación de proyectos de investigación y extensión "
            "(Anexo I adaptado)",
            9,
            False,
        ),
    ]
    first = True
    for text, size, bold in lines:
        p = cell_text.paragraphs[0] if first else cell_text.add_paragraph()
        first = False
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(text)
        _set_run_font(r, size=size, bold=bold, color=RGBColor(0xFF, 0xFF, 0xFF))

    gold = doc.add_table(rows=1, cols=1)
    gold.alignment = WD_TABLE_ALIGNMENT.CENTER
    gcell = gold.cell(0, 0)
    gcell.width = Cm(17.1)
    _shade_cell(gcell, "1A7FB5")
    _set_cell_margins(gcell, top=0, bottom=0, left=0, right=0)
    gp = gcell.paragraphs[0]
    gp.paragraph_format.space_before = Pt(0)
    gp.paragraph_format.space_after = Pt(0)
    gr = gp.add_run(" ")
    _set_run_font(gr, size=4, color=WATER)


def _add_cover_fields(doc: Document) -> None:
    _p(
        doc,
        "PRESENTACIÓN DE PROYECTO DE INVESTIGACIÓN Y/O EXTENSIÓN",
        size=12,
        bold=True,
        center=True,
        color=INST,
        space_before=12,
        space_after=10,
    )
    for label, hint in [
        ("Título del Proyecto:", "[sin abreviaturas]"),
        ("Director/a:", "[docente UCCuyo]"),
        ("Co-director/a:", "[si corresponde]"),
        ("Unidad Académica:", "[Facultad / Instituto / Colegio]"),
        ("Convocatoria / Año:", "Plan AURA · Investigación y Extensión · 2026"),
        ("Eje temático (letra a–j):", "[según bases de la convocatoria]"),
        ("Tipo de proyecto:", "Investigación / Extensión / Investigación y extensión"),
        ("Fecha de presentación:", "[dd/mm/aaaa]"),
    ]:
        _field(doc, label, hint)
        _blank_lines(doc, 1)


def _section_body(doc: Document) -> None:
    _heading(doc, "1. Identificación del proyecto")
    for label, hint in [
        ("Denominación del Proyecto:", ""),
        ("Denominación abreviada (opcional):", ""),
        ("Tipo de Proyecto:", "Básico / Aplicado / Innovación / Extensión / Mixto"),
        ("Duración estimada (meses):", "12 meses (según convocatoria AURA)"),
        ("Unidad Académica / Instituto / Centro:", ""),
        ("Área disciplinar:", ""),
        ("Eje temático AURA (a–j):", "Indicar letra y título del eje"),
    ]:
        _field(doc, label, hint)
        _blank_lines(doc, 1)
    _hint_box(
        doc,
        [
            "Título claro y sin abreviaturas.",
            "Indicar de forma explícita el eje temático de la convocatoria AURA.",
            "Área disciplinar según clasificaciones institucionales.",
        ],
    )

    _heading(doc, "2. Datos del Director/a y Co-director/a")
    for label, hint in [
        ("Director/a:", ""),
        ("Cargo académico:", ""),
        ("Formación académica:", ""),
        ("Categoría de investigador/a:", ""),
        ("Correo institucional:", "@uccuyo.edu.ar"),
        ("Co-director/a (si corresponde):", ""),
        ("Cargo académico:", ""),
        ("Formación académica:", ""),
        ("Categoría de investigador/a:", ""),
        ("Correo institucional:", ""),
    ]:
        _field(doc, label, hint)
        _blank_lines(doc, 1)
    _hint_box(
        doc,
        [
            "La dirección debe estar a cargo de un/a docente de la UCCuyo.",
            "Correo institucional obligatorio.",
            "Cumplir requisitos para dirigir según Ordenanza vigente.",
        ],
    )

    _heading(doc, "3. Equipo de investigación / extensión")
    _p(
        doc,
        "Integrantes, roles, filiación institucional y funciones específicas. "
        "La convocatoria AURA exige como mínimo dos (2) estudiantes por proyecto.",
        size=10,
        italic=True,
        color=MUTED,
        space_after=6,
    )
    table = doc.add_table(rows=5, cols=4)
    table.style = "Table Grid"
    headers = ["Nombre completo", "Filiación institucional", "Rol", "Función en el proyecto"]
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        _shade_cell(cell, "0E4F72")
        p = cell.paragraphs[0]
        r = p.add_run(h)
        _set_run_font(r, size=9, bold=True, color=RGBColor(0xFF, 0xFF, 0xFF))
    for row in table.rows[1:]:
        for cell in row.cells:
            cell.paragraphs[0].add_run(" ")
    _hint_box(
        doc,
        [
            "Incluir docentes y al menos dos estudiantes.",
            "Funciones alineadas con la metodología y el plan de trabajo.",
        ],
    )

    _heading(doc, "4. Resumen del proyecto (≈ 300 palabras)")
    _p(
        doc,
        "Síntesis del proyecto (problema, objetivo general, enfoque metodológico, "
        "población/unidad de análisis y resultados esperados):",
        size=10,
        space_after=4,
    )
    _blank_lines(doc, 5)

    _heading(doc, "5. Fundamentación (≈ 400–600 palabras)")
    _p(
        doc,
        "Justificación teórica, empírica y contextual del proyecto:",
        size=10,
        space_after=4,
    )
    _blank_lines(doc, 5)
    _hint_box(
        doc,
        [
            "Antecedentes empíricos relevantes y brechas de conocimiento.",
            "Relevancia institucional y marco conceptual.",
            "Justificación del valor agregado en contextos áridos / San Juan.",
        ],
    )

    _heading(doc, "6. Pertinencia, relevancia y alineación institucional (≈ 200–400 palabras)")
    _p(
        doc,
        "Justificar la importancia científica, social e institucional del proyecto.",
        size=10,
        space_after=4,
    )
    for label in [
        "Correspondencia con el PEI (citar ejes y líneas):",
        "Correspondencia con el Plan Estratégico de la Función I+D:",
        "Aporte institucional (carreras, estudiantes, comunidad):",
        "Contribución a líneas prioritarias de la unidad académica:",
        "Vinculación explícita con el Plan Integral AURA (Res. 418-CS-2024):",
        "Vinculación con el Plan de Integración Curricular AURA – Planificación 2026 "
        "(Res. 849-CS-2026):",
    ]:
        _field(doc, label)
        _blank_lines(doc, 2)

    _heading(doc, "7. Planteo del problema y objetivos (≈ 200–400 palabras)")
    for label in [
        "Planteo del problema de investigación / intervención:",
        "Objetivo general:",
        "Objetivos específicos:",
    ]:
        _field(doc, label)
        _blank_lines(doc, 3)
    _hint_box(
        doc,
        [
            "Regla de coherencia: Problema → Objetivo general → Objetivos específicos → Metodología.",
            "Identificar variables o dimensiones cuando corresponda.",
        ],
    )

    _heading(doc, "8. Originalidad y aporte al conocimiento (≈ 100–200 palabras)")
    _blank_lines(doc, 4)

    _heading(doc, "9. Marco teórico y estado del arte (≈ 600–800 palabras)")
    _blank_lines(doc, 6)
    _hint_box(
        doc,
        [
            "Conceptos, enfoques y teorías fundamentales.",
            "Estudios recientes (últimos 5 años); 30–40% de actualización recomendada.",
            "Estilo de citación único (APA 7ª, Vancouver, ISO 690, IEEE o Chicago).",
        ],
    )

    _heading(doc, "10. Metodología (≈ 800–900 palabras)")
    for label in [
        "Diseño del estudio / de la intervención:",
        "Población y muestra / destinatarios:",
        "Instrumentos y técnicas de recolección de datos:",
        "Procedimientos de análisis:",
        "Validación y fiabilidad:",
        "Consideraciones éticas:",
    ]:
        _field(doc, label)
        _blank_lines(doc, 2)

    _heading(doc, "11. Factibilidad y cronograma de actividades (≈ 200–300 palabras)")
    _p(
        doc,
        "Recursos disponibles, viabilidad temporal y plan de trabajo (12 meses):",
        size=10,
        space_after=6,
    )
    crono = doc.add_table(rows=7, cols=3)
    crono.style = "Table Grid"
    for i, h in enumerate(["Etapa / Actividad", "Período estimado", "Responsables"]):
        cell = crono.rows[0].cells[i]
        _shade_cell(cell, "064A38")
        r = cell.paragraphs[0].add_run(h)
        _set_run_font(r, size=9, bold=True, color=RGBColor(0xFF, 0xFF, 0xFF))
    for row in crono.rows[1:]:
        for cell in row.cells:
            cell.paragraphs[0].add_run(" ")
    _p(
        doc,
        "Incluir informe de avance a los 6 meses e informe final (oct. 2027).",
        size=9,
        italic=True,
        color=MUTED,
        space_before=6,
    )

    _heading(doc, "12. Impacto esperado y plan de difusión / transferencia (≈ 200–300 palabras)")
    for label in [
        "Impacto académico o científico:",
        "Impacto social o institucional:",
        "Indicadores de seguimiento:",
        "Plan de difusión (publicaciones, congresos, jornadas, etc.):",
        "Plan de transferencia (productos, herramientas, informes, etc.):",
    ]:
        _field(doc, label)
        _blank_lines(doc, 2)

    _heading(doc, "13. Presupuesto, sostenibilidad y alineación institucional (≈ 200–300 palabras)")
    _p(
        doc,
        "Tope estimado de la convocatoria AURA: hasta $1.000.000 por proyecto "
        "(presupuesto total de la convocatoria: $20.000.000).",
        size=9,
        italic=True,
        color=WATER,
        space_after=6,
    )
    for label in [
        "Presupuesto total estimado ($):",
        "Detalle por rubro (personal, insumos, viajes, difusión, otros):",
        "Fuentes de financiamiento (internas / externas / convocatoria AURA):",
        "Plan de sostenibilidad del proyecto:",
        "Alineación con PEI / líneas prioritarias / Ordenanza:",
    ]:
        _field(doc, label)
        _blank_lines(doc, 2)

    _heading(doc, "14. Bibliografía")
    _p(
        doc,
        "Citar las fuentes principales en un único estilo (APA 7ª edición u otro admitido).",
        size=10,
        italic=True,
        color=MUTED,
        space_after=4,
    )
    _blank_lines(doc, 6)

    _heading(doc, "15. Firmas")
    for label in [
        "Firma y aclaración del Director/a:",
        "Unidad Académica:",
        "Fecha:",
        "Conformidad del Consejo Directivo de la Unidad Académica (fecha / resolución):",
    ]:
        _field(doc, label)
        _blank_lines(doc, 2)


def build() -> Path:
    doc = Document()
    for section in doc.sections:
        section.top_margin = Cm(1.5)
        section.bottom_margin = Cm(1.8)
        section.left_margin = Cm(2.0)
        section.right_margin = Cm(2.0)
        footer = section.footer
        footer.is_linked_to_previous = False
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        fr = fp.add_run(
            "Plan AURA · Instituto del Agua / Secretarías de Investigación y Extensión · UCCuyo  ·  "
            "https://claudiomlarrea.github.io/observatorio-ia/instituto-del-agua/#convocatoria"
        )
        _set_run_font(fr, size=8, color=MUTED)

    style = doc.styles["Normal"]
    style.font.name = "Arial"
    style.font.size = Pt(10)
    style._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")

    _add_banner(doc)
    _p(
        doc,
        "INSTRUCCIONES (borrar este párrafo al enviar): Completar todos los campos. "
        "Basada en el Anexo I de Presentación de proyectos de investigación "
        "(Secretaría de Investigación y Vinculación Tecnológica). "
        "Nombre sugerido del archivo: AURA_UA_ApellidoDirector_TituloCorto.docx. "
        "Presentación: 15 de septiembre al 2 de octubre de 2026. "
        "Consultas: luisjimenez@uccuyo.edu.ar · investigacion@uccuyo.edu.ar",
        size=9,
        italic=True,
        color=MUTED,
        space_before=10,
        space_after=8,
    )
    _add_cover_fields(doc)
    _section_body(doc)

    _p(
        doc,
        "Anexo I adaptado · Convocatoria AURA 2026 · Universidad Católica de Cuyo",
        size=9,
        italic=True,
        color=MUTED,
        center=True,
        space_before=16,
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(OUT))
    return OUT


def main() -> None:
    path = build()
    print(f"Wrote {path} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
