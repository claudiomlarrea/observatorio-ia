#!/usr/bin/env python3
"""Genera el PDF de instructivo de SACAU Aula (par de SACAU CRE)."""
from pathlib import Path
import shutil

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate

ROOT = Path(__file__).resolve().parents[2]
OUT_APP = Path(__file__).resolve().parent / "instructivo_completo.pdf"
OUT_OBS = ROOT / "docs/instructivos/instructivo-sacau-aula.pdf"

BRAND = HexColor("#7a1532")
SOFT = HexColor("#5c4f54")
GREEN = HexColor("#0d6e4f")


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
    canvas.drawString(1.8 * cm, A4[1] - 12, "Universidad Católica de Cuyo · SACAU Aula")
    canvas.setFillColor(SOFT)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(1.8 * cm, 1.1 * cm, "Observatorio IA · https://observatorio-ia.uccuyo.edu.ar/sacau-aula/")
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


def main():
    st = styles()
    OUT_APP.parent.mkdir(parents=True, exist_ok=True)
    OUT_OBS.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT_APP),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=2.2 * cm,
        bottomMargin=1.8 * cm,
    )
    story = []
    story.append(Paragraph("Instructivo de uso — SACAU Aula", st["title"]))
    story.append(
        Paragraph(
            "Universidad Católica de Cuyo · Observatorio de Inteligencia Artificial · "
            "Del crédito CRE al programa de cátedra.",
            st["small"],
        )
    )

    story.append(Paragraph("1. ¿Qué es SACAU Aula?", st["h2"]))
    story.append(
        Paragraph(
            "<b>SACAU CRE</b> convierte un plan de estudios de horas a créditos. "
            "<b>SACAU Aula</b> toma <b>una asignatura</b> de ese plan y arma el programa analítico "
            "en clave SACAU: presupuesto de esfuerzo del estudiante, trabajo autónomo con horas honestas, "
            "semáforo de IA, resultados de aprendizaje y cláusula de uso de inteligencia artificial.",
            st["body"],
        )
    )
    story.append(
        Paragraph(
            "El CRE (Res. 556/2025 y Res. 788-CS-2026 UCCuyo) mide el <b>tiempo total de trabajo del estudiante</b>: "
            "interacción pedagógica + trabajo autónomo. 1 CRE = 25 h (hasta 30 justificado). "
            "Un cuatrimestre de referencia son 30 CRE; un año, 60 CRE. "
            "Este instructivo explica cómo cargar cualquier plan y continuar hasta descargar el programa.",
            st["body"],
        )
    )

    story.append(Paragraph("2. Recorrido en tres pasos", st["h2"]))
    story.append(
        bullets(
            [
                "<b>Paso 1 — Cargar el plan.</b> En "
                "https://observatorio-ia.uccuyo.edu.ar/sacau-aula/ "
                "subí o arrastrá un Word (.docx), PDF (también escaneado) o CSV con materias y horas. "
                "Sirve el plan de cualquier carrera y universidad (por ejemplo Psicología, Res. 1098-CS-2013).",
                "<b>Paso 2 — Elegir la cátedra.</b> Aparece la lista de asignaturas. "
                "Usá el buscador (nombre, código o año) y pulsá <b>Continuar con esta cátedra</b>.",
                "<b>Paso 3 — Revisar y descargar.</b> El sistema calcula el CRE y propone presupuesto semanal, "
                "actividades, semáforo de IA, RA y cláusula. Ajustá lo que haga falta y bajá Word, PDF o JSON.",
            ],
            st,
        )
    )
    story.append(
        Paragraph(
            "No hace falta pasar antes por el convertidor. Si ya convertiste el plan en SACAU CRE, "
            "el botón <b>Aula</b> de cada materia abre esta misma pantalla con esa asignatura.",
            st["body"],
        )
    )

    story.append(Paragraph("3. Qué archivo cargar", st["h2"]))
    story.append(
        bullets(
            [
                "<b>Plan de estudios en Word o PDF</b> con tabla o listado de materias y carga horaria.",
                "<b>CSV</b> con columnas de nombre y horas (la plantilla del convertidor también sirve).",
                "Si el PDF está escaneado, el sistema aplica OCR. Los planes ya digitalizados "
                "(p. ej. Psicología 1098) se reconocen por el nombre del archivo.",
                "Un programa analítico suelto (una sola materia, sin horas de plan) no reemplaza el plan: "
                "cargá el plan y después elegí esa materia.",
            ],
            st,
        )
    )

    story.append(Paragraph("4. Ficha y presupuesto de esfuerzo", st["h2"]))
    story.append(
        Paragraph(
            "Una vez elegida la cátedra verás horas de interacción, horas autónomas, CRE, "
            "esfuerzo semanal y el peso de la materia sobre un cuatrimestre de 30 CRE (o un año de 60 si es anual). "
            "Podés corregir horas, régimen, tipología y semanas: el CRE se recalcula solo.",
            st["body"],
        )
    )
    story.append(
        Paragraph(
            "Si una sola materia pide más de 12 h/semana, el diagnóstico lo marca para que revises "
            "si es compatible con el resto del cuatrimestre.",
            st["body"],
        )
    )

    story.append(Paragraph("5. Actividades y semáforo de IA", st["h2"]))
    story.append(
        Paragraph(
            "El crédito autónomo es real solo si las actividades ocupan ese tiempo. "
            "Generá la propuesta según la tipología (teórica, taller, práctica, PPS, TIF u optativa) "
            "o cargá filas a mano. El semáforo no detecta trampas: audita si una IA resuelve la consigna "
            "en minutos y deja el CRE vacío.",
            st["body"],
        )
    )
    story.append(
        bullets(
            [
                "<b>Rojo · una IA lo resuelve</b> (ensayo casero, resumen, cuestionario domiciliario). "
                "Aplicá el rediseño: dossier de proceso, caso local, defensa breve.",
                "<b>Amarillo · la IA asiste</b> (guía de problemas, lectura). Pedí declaración de uso y justificación.",
                "<b>Verde · evidencia situada</b> (bitácora, práctica, coloquio, datos del estudiante). El CRE se puede defender.",
                "<b>Ajustar autónomo al presupuesto</b> hace que la última actividad absorba la diferencia de horas.",
            ],
            st,
        )
    )

    story.append(Paragraph("6. Resultados de aprendizaje y cláusula de IA", st["h2"]))
    story.append(
        Paragraph(
            "El crédito certifica resultados de aprendizaje, no asistencia. "
            "Proponé 4 a 6 RA de <b>esta</b> cátedra, con evidencia y criterio, y vinculalos a las actividades. "
            "Generá la cláusula de uso de IA (qué está permitido, qué hay que declarar, qué evidencia de proceso se pide) "
            "y editála con la voz del equipo docente.",
            st["body"],
        )
    )

    story.append(Paragraph("7. Diagnóstico y descargas", st["h2"]))
    story.append(
        bullets(
            [
                "El diagnóstico avisa si faltan horas autónomas, si hay RA sin actividad, si el semáforo está en rojo "
                "o si falta la cláusula de IA.",
                "<b>Word / PDF</b>: programa analítico para la facultad (ficha CRE, RA, actividades, cláusula, diagnóstico).",
                "<b>JSON</b>: guarda la ficha para volver a abrirla en SACAU Aula (Cargar ficha JSON).",
                "El documento es un <b>borrador de cátedra</b>. No reemplaza la aprobación de los órganos académicos "
                "ni la presentación ante instancias nacionales.",
            ],
            st,
        )
    )

    story.append(Paragraph("8. Relación con SACAU CRE", st["h2"]))
    story.append(
        Paragraph(
            "SACAU CRE trabaja el <b>plan</b> (todas las materias, umbrales, anexo Res. 911). "
            "SACAU Aula trabaja la <b>cátedra</b> (cómo se habitan esos créditos en el aula). "
            "Convertidor: https://observatorio-ia.uccuyo.edu.ar/sacau/ · "
            "Aula: https://observatorio-ia.uccuyo.edu.ar/sacau-aula/",
            st["body"],
        )
    )

    story.append(
        Paragraph(
            "Marco: RESOL-2025-556 · Res. 788-CS-2026 · Res. 911-CS-2026 UCCuyo. "
            "Consultas: observatorioia@uccuyo.edu.ar",
            st["center"],
        )
    )

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    shutil.copyfile(OUT_APP, OUT_OBS)
    print("wrote", OUT_APP)
    print("wrote", OUT_OBS)


if __name__ == "__main__":
    main()
