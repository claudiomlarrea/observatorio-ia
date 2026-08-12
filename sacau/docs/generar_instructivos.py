#!/usr/bin/env python3
"""Genera los PDF de instructivo del Convertidor SACAU → CRE."""
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Table, TableStyle

OUT = Path(__file__).resolve().parent
BRAND = HexColor("#7a1532")
SOFT = HexColor("#5c4f54")
LINE = HexColor("#e4dce0")


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "T",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=16,
            textColor=BRAND,
            spaceAfter=8,
            leading=20,
            alignment=TA_LEFT,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            textColor=BRAND,
            spaceBefore=12,
            spaceAfter=6,
            leading=15,
        ),
        "body": ParagraphStyle(
            "B",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            textColor=HexColor("#1f1418"),
            leading=13,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
        "small": ParagraphStyle(
            "S",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            textColor=SOFT,
            leading=11,
            spaceAfter=4,
        ),
        "bullet": ParagraphStyle(
            "Bu",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            textColor=HexColor("#1f1418"),
            leading=12.5,
            leftIndent=4,
        ),
        "center": ParagraphStyle(
            "C",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            textColor=SOFT,
            alignment=TA_CENTER,
            spaceBefore=10,
        ),
    }


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BRAND)
    canvas.rect(0, A4[1] - 18, A4[0], 18, fill=1, stroke=0)
    canvas.setFillColor(HexColor("#ffffff"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(1.8 * cm, A4[1] - 12, "Universidad Católica de Cuyo · Convertidor SACAU → CRE")
    canvas.setFillColor(SOFT)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(1.8 * cm, 1.1 * cm, "Observatorio IA · https://observatorio-ia.uccuyo.edu.ar/sacau/")
    canvas.drawRightString(A4[0] - 1.8 * cm, 1.1 * cm, f"Pág. {doc.page}")
    canvas.restoreState()


def bullets(items, st):
    return ListFlowable(
        [ListItem(Paragraph(i, st["bullet"]), leftIndent=8, bulletColor=BRAND) for i in items],
        bulletType="bullet",
        start="•",
        leftIndent=12,
        bulletFontSize=8,
    )


def make_autonomo():
    st = styles()
    path = OUT / "instructivo_trabajo_autonomo.pdf"
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=2.2 * cm,
        bottomMargin=1.8 * cm,
    )
    story = []
    story.append(Paragraph("Instructivo: estimar el trabajo autónomo", st["title"]))
    story.append(
        Paragraph(
            "Guía rápida del cuadro «Cómo estimar el trabajo autónomo» del Convertidor SACAU → CRE.",
            st["small"],
        )
    )
    story.append(Paragraph("¿Para qué sirve este cuadro?", st["h2"]))
    story.append(
        Paragraph(
            "El Sistema Argentino de Créditos Académicos Universitarios (SACAU) define el crédito (CRE) "
            "como la suma del tiempo de <b>interacción</b> (clases, talleres, prácticas supervisadas) y del "
            "<b>trabajo autónomo</b> del estudiante (estudio, lectura, informes, investigación). "
            "Este cuadro define cómo se estima el trabajo autónomo según el tipo de asignatura.",
            st["body"],
        )
    )
    story.append(Paragraph("Fórmula", st["h2"]))
    story.append(
        Paragraph(
            "<b>Horas autónomas ≈ horas de clase (teóricas + prácticas) × ratio + horas fijas</b>",
            st["body"],
        )
    )
    story.append(
        Paragraph(
            "Después, el crédito de la asignatura se calcula como:<br/>"
            "<b>CRE = (horas de interacción + horas autónomas) ÷ valor CRE (h)</b><br/>"
            "En UCCuyo, por Res. 788-CS-2026, el valor CRE por defecto es <b>25 h</b> (hasta <b>30 h</b> justificado).",
            st["body"],
        )
    )
    story.append(Paragraph("Tipologías sugeridas", st["h2"]))
    data = [
        [
            Paragraph("<b>Tipo</b>", st["small"]),
            Paragraph("<b>Descripción</b>", st["small"]),
            Paragraph("<b>Ratio</b>", st["small"]),
            Paragraph("<b>Horas fijas</b>", st["small"]),
            Paragraph("<b>Criterio</b>", st["small"]),
        ],
        ["teorica", "Teórica / teórico-práctica áulica", "1", "0", "Estudio y trabajos fuera del aula (~1:1)."],
        ["taller", "Taller / seminario", "0.5", "0", "Más peso presencial; autónomo moderado."],
        ["practica_supervisada", "Práctica supervisada en asignatura", "0.5", "0", "Informes y registros asociados a la práctica."],
        ["pps", "Práctica Profesional Supervisada", "0.25", "0", "Intensiva en terreno; poco autónomo extra."],
        ["tif", "Trabajo integrador final / tesis", "2", "50", "Alta carga de investigación y escritura."],
        ["optativa", "Optativa / electiva", "1", "0", "Misma lógica que teórica, salvo criterio de la unidad."],
    ]
    rows = [data[0]] + [[Paragraph(str(c), st["small"]) for c in r] for r in data[1:]]
    t = Table(rows, colWidths=[2.6 * cm, 4.2 * cm, 1.3 * cm, 1.8 * cm, 6.2 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), HexColor("#f4f0f1")),
                ("TEXTCOLOR", (0, 0), (-1, 0), BRAND),
                ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(t)
    story.append(Paragraph("Cómo usarlo en el sistema", st["h2"]))
    story.append(
        bullets(
            [
                "Podés editar el <b>Ratio</b> y las <b>Horas fijas</b> de cada tipología; el cambio se aplica a todas las asignaturas de ese tipo.",
                "Si una asignatura necesita un valor distinto, usá la columna <b>Aut. manual</b> en la tabla de asignaturas (reemplaza el cálculo automático).",
                "La columna <b>CRE h</b> no es el crédito de la materia: es cuántas horas equivalen a 1 CRE (mínimo 25, máximo 30). Subir ese valor <b>disminuye</b> los CRE de la fila.",
                "Los ratios son orientativos institucionales; la unidad académica puede ajustarlos con fundamento pedagógico.",
            ],
            st,
        )
    )
    story.append(Paragraph("Áreas de formación (siglas)", st["h2"]))
    story.append(
        bullets(
            [
                "<b>FB</b> — Formación Básica",
                "<b>FP</b> — Formación Profesional",
                "<b>FGC</b> — Formación General Complementaria",
                "<b>FCI</b> — Formación Complementaria Institucional",
                "<b>Rég. S / A</b> — Semestral / Anual",
            ],
            st,
        )
    )
    story.append(Paragraph("Marco: Res. 788-CS-2026 UCCuyo · RESOL-2025-556 (SACAU).", st["center"]))
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print("wrote", path)


def make_completo():
    st = styles()
    path = OUT / "instructivo_completo.pdf"
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=2.2 * cm,
        bottomMargin=1.8 * cm,
    )
    story = []
    story.append(Paragraph("Instructivo completo — Convertidor SACAU → CRE", st["title"]))
    story.append(Paragraph("Universidad Católica de Cuyo · Observatorio IA · Uso del sistema web", st["small"]))
    story.append(Paragraph("1. ¿Qué hace el sistema?", st["h2"]))
    story.append(
        Paragraph(
            "Convierte un plan de estudios expresado en <b>horas</b> a un plan en <b>créditos CRE</b>, "
            "según el marco SACAU (RESOL-2025-556) y la definición institucional de UCCuyo "
            "(Res. 788-CS-2026: <b>1 CRE = 25 horas</b>, hasta 30 justificado). "
            "Permite cargar Word, PDF (también escaneado) o CSV, revisar tipologías y horas, "
            "y descargar el plan resultante en Word, PDF o CSV.",
            st["body"],
        )
    )
    story.append(Paragraph("2. Recorrido recomendado", st["h2"]))
    story.append(
        bullets(
            [
                "<b>1. Cargar plan</b>: subí el archivo del plan en horas (Word .docx, PDF o CSV). Si no tenés archivo, descargá la plantilla CSV vacía y completá las filas.",
                "<b>2. Revisar y ajustar</b>: corregí tipologías, áreas, horas teóricas/prácticas y overrides. Usá «Agregar asignatura» si falta alguna fila.",
                "<b>3. Ver créditos y descargar</b>: controlá totales, cumplimiento SACAU y bajá Word / PDF / CSV. Las descargas están siempre visibles arriba.",
            ],
            st,
        )
    )
    story.append(Paragraph("3. Botones principales", st["h2"]))
    story.append(
        bullets(
            [
                "<b>Borrar plan y empezar de nuevo</b>: vacía el plan cargado.",
                "<b>Agregar asignatura</b>: suma una fila editable a la tabla.",
                "<b>Actualizar créditos</b>: recalcula totales con los cambios hechos.",
                "<b>Word / PDF / CSV</b>: exportan el plan ya convertido a créditos.",
                "<b>Instructivo de trabajo autónomo</b>: PDF corto sobre ratios y tipologías.",
            ],
            st,
        )
    )
    story.append(Paragraph("4. Columnas de la tabla", st["h2"]))
    story.append(
        bullets(
            [
                "<b>Área</b>: FB (Formación Básica), FP (Formación Profesional), FGC (Formación General Complementaria), FCI (Formación Complementaria Institucional).",
                "<b>Rég.</b>: S = Semestral, A = Anual.",
                "<b>Tipo</b>: tipología que define el ratio de trabajo autónomo.",
                "<b>Teó. / Prác.</b>: horas de interacción (clase / práctica).",
                "<b>Aut. manual</b>: si lo completás, reemplaza el cálculo automático de autónomas.",
                "<b>CRE h</b>: horas por cada CRE (25 a 30). No es el crédito de la asignatura. Si lo aumentás, el CRE de esa fila <b>baja</b>.",
                "<b>Inter. / Aut. / CRE</b>: resultados calculados (solo lectura).",
            ],
            st,
        )
    )
    story.append(Paragraph("5. Cálculo de créditos", st["h2"]))
    story.append(
        Paragraph(
            "1) Interacción = horas teóricas + horas prácticas.<br/>"
            "2) Autónomas = (interacción × ratio de tipología) + horas fijas, salvo override manual.<br/>"
            "3) CRE asignatura = (interacción + autónomas) ÷ CRE h, con el redondeo elegido (0.5 / 0.25 / sin redondeo).<br/>"
            "4) CRE totales = suma de las asignaturas.",
            st["body"],
        )
    )
    story.append(
        Paragraph(
            "Ejemplo: si una teórica tiene 70 h de clase, ratio 1 y CRE h = 25 → autónomas 70 → total 140 h → CRE = 140/25 = 5.6 → con redondeo 0.5 queda 5.5. "
            "Si pasás CRE h a 30, CRE = 140/30 ≈ 4.67 → 4.5. Por eso «subir CRE h» disminuye créditos.",
            st["body"],
        )
    )
    story.append(Paragraph("6. Cumplimiento SACAU (referencia)", st["h2"]))
    story.append(
        bullets(
            [
                "Grado: orientativamente ≥ 240 CRE y ≥ 2.100 h de interacción.",
                "Promedio anual de referencia: ~60 CRE/año (±10).",
                "Los avisos del panel «Cumplimiento SACAU» son orientativos; no reemplazan el dictamen académico-normativo.",
            ],
            st,
        )
    )
    story.append(Paragraph("7. Consejos para PDF escaneados", st["h2"]))
    story.append(
        bullets(
            [
                "Preferí Word o PDF en texto cuando sea posible.",
                "Si el OCR falla en tablas densas, usá la plantilla CSV o un PDF/Word limpio.",
                "Siempre revisá tipologías y horas después de la carga automática.",
            ],
            st,
        )
    )
    story.append(Paragraph("8. Contacto / sitio", st["h2"]))
    story.append(
        Paragraph(
            "Sistema publicado en <b>https://observatorio-ia.uccuyo.edu.ar/sacau/</b> "
            "(Observatorio IA · Universidad Católica de Cuyo).",
            st["body"],
        )
    )
    story.append(Paragraph("Marco: Res. 788-CS-2026 UCCuyo · RESOL-2025-556 (SACAU).", st["center"]))
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print("wrote", path)


if __name__ == "__main__":
    make_autonomo()
    make_completo()
