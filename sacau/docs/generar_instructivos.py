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
    story.append(
        Paragraph(
            "Universidad Católica de Cuyo · Observatorio IA · Uso del sistema web · "
            "Actualizado con biblioteca normativa, tipo de carrera y anexo curricular Res. 911.",
            st["small"],
        )
    )

    story.append(Paragraph("1. ¿Qué hace el sistema?", st["h2"]))
    story.append(
        Paragraph(
            "Convierte un plan de estudios expresado en <b>horas</b> a un plan en <b>créditos CRE</b>, "
            "según el marco SACAU (RESOL-2025-556) y la definición institucional de UCCuyo "
            "(Res. 788-CS-2026: <b>1 CRE = 25 horas</b>, hasta 30 justificado; Res. 911-CS-2026: marco conceptual). "
            "Permite cargar Word, PDF (también escaneado) o CSV; revisar tipologías y horas; "
            "evaluar cumplimiento según tipo de carrera; redactar un <b>anexo curricular editable</b> "
            "(perfil, competencias, resultados de aprendizaje, flexibilidad, reconocimiento, movilidad); "
            "y descargar el plan en Word, PDF o CSV incluyendo ese anexo.",
            st["body"],
        )
    )

    story.append(Paragraph("2. Recorrido recomendado", st["h2"]))
    story.append(
        bullets(
            [
                "<b>Biblioteca normativa</b> (arriba): consultá RESOL-2025-556, Res. 788, Res. 911 e Informe CONFEDI.",
                "<b>1. Cargar plan</b>: subí Word (.docx), PDF o CSV. Si no tenés archivo, usá la plantilla CSV vacía.",
                "<b>2. Revisar y ajustar</b>: elegí <b>tipo de carrera</b> (grado / pregrado / pregrado regulado / art. 43), "
                "corregí tipologías, áreas, horas y overrides. Usá «Agregar asignatura» si falta una fila.",
                "<b>Anexo curricular (Res. 911)</b>: generá el borrador, editá cada punto a gusto de tu carrera/universidad "
                "y dejá marcado «Incluir anexo en descargas».",
                "<b>3. Ver créditos y descargar</b>: controlá totales y cumplimiento; bajá Word / PDF / CSV. "
                "Las descargas están siempre visibles arriba.",
            ],
            st,
        )
    )

    story.append(Paragraph("3. Biblioteca normativa", st["h2"]))
    story.append(
        Paragraph(
            "Reúne los documentos oficiales de referencia. No reemplazan el dictamen académico, "
            "pero permiten consultar la fuente mientras se trabaja el plan.",
            st["body"],
        )
    )
    story.append(
        bullets(
            [
                "<b>RESOL-2025-556</b>: SACAU nacional (CRE = interacción + autónomo; 25–30 h; ~60 CRE/año; mínimos de carrera).",
                "<b>Res. 788-CS-2026 UCCuyo</b>: 1 CRE = 25 h (hasta 30 justificado).",
                "<b>Res. 911-CS-2026 UCCuyo</b>: marco conceptual de adecuación curricular (competencias, perfil, RA, flexibilidad, reconocimiento, movilidad).",
                "<b>Informe SACAU/CRE CONFEDI 2026</b>: referencia comparativa de avance en ingenierías.",
            ],
            st,
        )
    )

    story.append(Paragraph("4. Tipo de carrera y cumplimiento", st["h2"]))
    story.append(
        bullets(
            [
                "<b>Grado</b>: mín. orientativo 240 CRE · 4 años · 2.100 h de interacción.",
                "<b>Pregrado</b>: mín. 120 CRE · 2 años · 1.100 h de interacción.",
                "<b>Pregrado regulado</b>: mín. 180 CRE · 3 años; la interacción sigue la regulación específica.",
                "<b>Art. 43 LES</b> (p. ej. Psicología): umbrales SACAU de grado + controles del estándar de la carrera (práctica, PPS, etc.).",
                "También se informa la <b>recomendación de no exceder +25%</b> sobre el mínimo de CRE.",
                "Las <b>horas autónomas se estiman</b> para calcular CRE; <b>no se verifican</b> en validez nacional (sí la interacción).",
            ],
            st,
        )
    )

    story.append(Paragraph("5. Botones y acciones principales", st["h2"]))
    story.append(
        bullets(
            [
                "<b>Instructivo completo / Biblioteca normativa</b>: acceso a guías y PDF oficiales.",
                "<b>Borrar plan y empezar de nuevo</b>: vacía el plan cargado.",
                "<b>Agregar asignatura</b>: suma una fila editable.",
                "<b>Edición en tabla</b>: al cambiar horas, tipología o CRE h, los totales y el CRE se recalculan solos.",
                "<b>Generar / regenerar borrador 911</b>: propone textos desarrollados del anexo curricular.",
                "<b>Vaciar anexo</b>: limpia los campos del anexo.",
                "<b>Incluir anexo en descargas</b>: si está marcado, Word/PDF llevan el anexo.",
                "<b>Word / PDF / CSV</b>: exportan el plan en créditos (Word/PDF pueden incluir el anexo 911).",
                "<b>Instructivo PDF</b> (en tipologías): guía corta de trabajo autónomo.",
            ],
            st,
        )
    )

    story.append(Paragraph("6. Columnas de la tabla de asignaturas", st["h2"]))
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

    story.append(Paragraph("7. Cálculo de créditos", st["h2"]))
    story.append(
        Paragraph(
            "1) Interacción = horas teóricas + horas prácticas.<br/>"
            "2) Autónomas = (interacción × ratio de tipología) + horas fijas, salvo override manual.<br/>"
            "3) CRE asignatura = (interacción + autónomas) ÷ CRE h, redondeado a "
            "<b>entero</b>. El CRE total del plan es la suma de los CRE de cada asignatura.<br/>"
            "4) CRE totales = suma de las asignaturas.",
            st["body"],
        )
    )
    story.append(
        Paragraph(
            "Ejemplo: teórica con 70 h de clase, ratio 1 y CRE h = 25 → autónomas 70 → total 140 h → "
            "CRE = 140/25 = 5.6 → se expresa como <b>6</b> CRE (enteros). Si CRE h = 30 → 140/30 ≈ 4.7 → <b>5</b> CRE. "
            "Por eso «subir CRE h» disminuye créditos.",
            st["body"],
        )
    )

    story.append(Paragraph("8. Anexo curricular (Res. 911-CS-2026)", st["h2"]))
    story.append(
        Paragraph(
            "La Res. 911 es un <b>marco conceptual</b> de adecuación curricular: no se “calcula” como el CRE, "
            "se <b>documenta y adapta</b>. El sistema propone un borrador desarrollado; la unidad académica lo edita.",
            st["body"],
        )
    )
    story.append(
        bullets(
            [
                "<b>Perfil de egreso</b>: identidad formativa, saberes, desempeños y contextos.",
                "<b>Competencias genéricas</b>: transversales (crítica, comunicación, ética, tecnologías, autonomía…).",
                "<b>Competencias específicas</b>: disciplinares/profesionales derivadas del perfil.",
                "<b>Resultados de aprendizaje</b>: qué se demuestra por tramos y al egreso; evidencias sugeridas.",
                "<b>Despliegue de horas y créditos</b>: el sistema completa totales IP/TA/CRE; vos explicás tipologías y coherencia pedagógica.",
                "<b>Flexibilidad curricular</b>: optativas, itinerarios, modalidades, correlatividades.",
                "<b>Reconocimiento de trayectos</b>: convalidaciones por CRE y resultados de aprendizaje (no solo nombres).",
                "<b>Movilidad</b>: intercambios, articulación interinstitucional, internacionalización.",
                "<b>Matriz de tributación</b>: escala A / M / B / NT (Res. 911).",
                "<b>Notas de la unidad académica</b>: gobernanza, cronograma y anexos locales.",
            ],
            st,
        )
    )
    story.append(
        Paragraph(
            "Flujo: cargar plan → (opcional) el sistema puede armar borrador al detectar materias → "
            "revisar/editar cada campo → marcar inclusión en descargas → exportar Word/PDF. "
            "Si regenerás el borrador habiendo editado, el sistema pide confirmación.",
            st["body"],
        )
    )

    story.append(Paragraph("9. Consejos para PDF escaneados", st["h2"]))
    story.append(
        bullets(
            [
                "Preferí Word o PDF en texto cuando sea posible.",
                "Si el OCR falla en tablas densas, usá la plantilla CSV o un archivo limpio.",
                "Siempre revisá tipologías y horas después de la carga automática.",
            ],
            st,
        )
    )

    story.append(Paragraph("10. Sitio", st["h2"]))
    story.append(
        Paragraph(
            "Sistema publicado en <b>https://observatorio-ia.uccuyo.edu.ar/sacau/</b> "
            "(Observatorio IA · Universidad Católica de Cuyo).",
            st["body"],
        )
    )
    story.append(
        Paragraph(
            "Marco: Res. 788-CS-2026 · Res. 911-CS-2026 · RESOL-2025-556 (SACAU).",
            st["center"],
        )
    )
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print("wrote", path)


if __name__ == "__main__":
    make_autonomo()
    make_completo()
