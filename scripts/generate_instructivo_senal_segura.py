#!/usr/bin/env python3
"""Genera docs/instructivos/instructivo-senal-segura.pdf (estilo instructivos OIA)."""
from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/instructivos/instructivo-senal-segura.pdf"
APP_URL = "https://xn--seal-segura-2db.com.ar/"
OBS_URL = "https://claudiomlarrea.github.io/observatorio-ia/#herramientas"

GREEN_DARK = colors.HexColor("#042f23")
SEA = colors.HexColor("#0f4f48")
GOLD = colors.HexColor("#c9a227")
TEXT = colors.HexColor("#1f1418")
MUTED = colors.HexColor("#5c4f54")


def _header_footer(canvas, doc) -> None:
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(GREEN_DARK)
    canvas.rect(0, h - 12 * mm, w, 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
    canvas.rect(0, h - 12 * mm, 3 * mm, 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(
        16 * mm,
        h - 7.5 * mm,
        "Señal Segura · Instructivo · Observatorio de IA · UCCuyo",
    )
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(w - 16 * mm, 10 * mm, f"Página {doc.page}")
    canvas.restoreState()


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=SEA,
            spaceAfter=6 * mm,
            alignment=TA_CENTER,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=17,
            textColor=SEA,
            spaceBefore=5 * mm,
            spaceAfter=2.5 * mm,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=TEXT,
            alignment=TA_JUSTIFY,
            spaceAfter=2.5 * mm,
        ),
        "note": ParagraphStyle(
            "note",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=9.5,
            leading=13,
            textColor=MUTED,
            spaceAfter=3 * mm,
        ),
        "li": ParagraphStyle(
            "li",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=13.5,
            textColor=TEXT,
        ),
        "meta": ParagraphStyle(
            "meta",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=6 * mm,
        ),
    }


def _bullets(items: list[str], style) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(item, style), leftIndent=2 * mm, bulletColor=SEA) for item in items],
        bulletType="bullet",
        start="•",
        leftIndent=6 * mm,
        spaceAfter=3 * mm,
    )


def build() -> Path:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=20 * mm,
        bottomMargin=16 * mm,
        title="Instructivo Señal Segura",
        author="Observatorio de Inteligencia Artificial · UCCuyo",
    )
    s = _styles()
    story = []

    story.append(Paragraph("Señal Segura", s["title"]))
    story.append(
        Paragraph(
            "Instructivo de uso · Herramienta de prevención y educación frente al grooming",
            s["meta"],
        )
    )
    story.append(
        Paragraph(
            f"Acceso: <link href='{APP_URL}' color='#0f4f48'><u>{APP_URL}</u></link><br/>"
            f"Observatorio: <link href='{OBS_URL}' color='#0f4f48'><u>{OBS_URL}</u></link>",
            s["meta"],
        )
    )

    story.append(Paragraph("1. ¿Qué es?", s["h2"]))
    story.append(
        Paragraph(
            "Señal Segura es una aplicación web instalable (PWA) que ayuda a identificar "
            "<b>señales de alerta</b> en chats o capturas. El análisis se hace en el dispositivo: "
            "no entra a WhatsApp ni lee conversaciones automáticamente. No diagnostica un delito "
            "ni identifica agresores; orienta para reconocer riesgos y pedir ayuda a tiempo.",
            s["body"],
        )
    )

    story.append(Paragraph("2. Cómo abrirla e instalarla", s["h2"]))
    story.append(
        Paragraph(
            "Ingresá desde el navegador al enlace de la app. En el celular podés instalarla:",
            s["body"],
        )
    )
    story.append(
        _bullets(
            [
                "<b>Android (Chrome):</b> menú ⋮ → “Instalar app” o “Agregar a la pantalla de inicio”.",
                "<b>iPhone (Safari):</b> Compartir → “Añadir a pantalla de inicio”.",
            ],
            s["li"],
        )
    )

    story.append(Paragraph("3. Analizar un chat (varios mensajes)", s["h2"]))
    story.append(
        Paragraph(
            "Las personas maliciosas suelen repartir el riesgo en varios mensajes. Por eso podés "
            "cargar <b>varias capturas o textos</b> antes de analizar:",
            s["body"],
        )
    )
    story.append(
        _bullets(
            [
                "En WhatsApp, juego o red social: sacá <b>capturas de pantalla</b> del chat (no fotos a otra pantalla).",
                "En Señal Segura tocá <b>Elegir de la galería</b> y seleccioná una o más imágenes (hasta 12).",
                "Si hace falta, pegá más texto y usá <b>Agregar texto</b>.",
                "Revisá la lista de fragmentos; podés <b>Quitar</b> alguno.",
                "Cuando estén todos, tocá <b>Buscar indicios</b>.",
            ],
            s["li"],
        )
    )
    story.append(
        Paragraph(
            "Tip: no subas capturas de la propia web de Señal Segura ni de material educativo; "
            "el sistema está pensado para chats reales.",
            s["note"],
        )
    )

    story.append(Paragraph("4. Cómo leer el resultado", s["h2"]))
    story.append(
        _bullets(
            [
                "<b>Nivel de riesgo</b> (bajo, medio, alto o crítico) y una acción sugerida.",
                "<b>Señales detectadas</b> (por ejemplo secretismo, pedido de fotos, cambio de app).",
                "<b>Qué podés hacer</b> y accesos a pedir ayuda.",
            ],
            s["li"],
        )
    )
    story.append(
        Paragraph(
            "<b>Importante:</b> el resultado identifica señales de alerta, pero no determina por sí "
            "solo que exista grooming ni identifica a una persona como agresora.",
            s["note"],
        )
    )

    story.append(Paragraph("5. Aprender y pedir ayuda", s["h2"]))
    story.append(
        Paragraph(
            "La sección <b>Aprender</b> tiene contenidos breves para chicos (8–12), adolescentes y adultos. "
            "En <b>Pedir ayuda</b> encontrás canales orientativos:",
            s["body"],
        )
    )
    story.append(
        _bullets(
            [
                "<b>Adulto de confianza</b> (familia, docente, referente).",
                "<b>Emergencia:</b> 911.",
                "<b>Orientación:</b> Línea 137 y WhatsApp 11-3133-1000.",
                "<b>Derechos de niñez:</b> Línea 102.",
                "<b>Denuncia:</b> fiscalía / dependencia policial de tu jurisdicción.",
            ],
            s["li"],
        )
    )

    story.append(Paragraph("6. Privacidad y uso responsable", s["h2"]))
    story.append(
        _bullets(
            [
                "El procesamiento de texto e imágenes se plantea en el dispositivo.",
                "Conservá evidencias (no borres chats) si vas a pedir ayuda o denunciar.",
                "Con menores, priorizá acompañamiento adulto y el menor dato personal posible.",
                "La app no reemplaza a profesionales, autoridades ni una denuncia formal.",
            ],
            s["li"],
        )
    )

    story.append(PageBreak())
    story.append(Paragraph("7. Problemas frecuentes", s["h2"]))
    story.append(
        _bullets(
            [
                "<b>Solo se abre la cámara:</b> usá el botón verde “Elegir de la galería” y elegí la captura en Google Fotos.",
                "<b>OCR ilegible:</b> usá captura de pantalla nítida o pegá el texto a mano.",
                "<b>Riesgo alto con capturas de la propia app:</b> cargá un chat real; el sistema evita falsos positivos educativos.",
                "<b>No ves la última versión:</b> cerrá la app/PWA y volvé a abrirla, o actualizá la página.",
            ],
            s["li"],
        )
    )

    story.append(Paragraph("8. Contacto institucional", s["h2"]))
    story.append(
        Paragraph(
            "Observatorio de Inteligencia Artificial · Universidad Católica de Cuyo<br/>"
            "Correo: <link href='mailto:observatorioia@uccuyo.edu.ar' color='#0f4f48'>"
            "<u>observatorioia@uccuyo.edu.ar</u></link>",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "Documento orientativo para uso educativo e institucional. Actualizado 2026.",
            s["note"],
        )
    )

    doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"OK → {path}")
