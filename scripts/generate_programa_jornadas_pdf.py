#!/usr/bin/env python3
"""Genera assets/jornadas/programa-jornadas-ia-2026.pdf desde data/jornadas-programa-2026.json."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/jornadas-programa-2026.json"
OUT = ROOT / "assets/jornadas/programa-jornadas-ia-2026.pdf"

WINE = colors.HexColor("#7A1F2B")
GREEN = colors.HexColor("#064a38")
MUTED = colors.HexColor("#555555")
INK = colors.HexColor("#1a1a1a")

TIPO_LABEL = {
    "apertura": "APERTURA",
    "indicaciones": "INDICACIONES",
    "ponencia": "PONENCIA",
    "cierre": "CIERRE",
    "receso": "RECESO",
}


def esc(s: str) -> str:
    return (
        str(s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def meta_line(item: dict) -> str:
    parts = []
    for key in ("persona", "rol", "area"):
        val = str(item.get(key) or "").strip()
        if val:
            parts.append(val)
    line = " · ".join(parts)
    if item.get("tipo") == "ponencia" and not item.get("confirmado"):
        line = (line + " · " if line else "") + "Provisional"
    return line


def build(data: dict) -> None:
    evento = data.get("evento") or {}
    items = data.get("items") or []
    estado = str(data.get("estado") or "provisorio").lower()
    nota = (
        "Programa provisorio — se actualiza a medida que se confirman las ponencias."
        if estado != "confirmado"
        else "Programa confirmado."
    )

    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "TitleProg",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=WINE,
        alignment=TA_CENTER,
        spaceAfter=4,
    )
    sub = ParagraphStyle(
        "SubProg",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        textColor=INK,
        alignment=TA_CENTER,
        spaceAfter=2,
    )
    note = ParagraphStyle(
        "NoteProg",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9,
        leading=12,
        textColor=MUTED,
        alignment=TA_CENTER,
        spaceAfter=14,
    )
    hora = ParagraphStyle(
        "HoraProg",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        textColor=GREEN,
        alignment=TA_LEFT,
        spaceBefore=8,
        spaceAfter=1,
    )
    tipo = ParagraphStyle(
        "TipoProg",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=MUTED,
        alignment=TA_LEFT,
        spaceAfter=1,
    )
    tit = ParagraphStyle(
        "TitProg",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=INK,
        alignment=TA_LEFT,
        spaceAfter=1,
    )
    who = ParagraphStyle(
        "WhoProg",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=MUTED,
        alignment=TA_LEFT,
        spaceAfter=2,
    )
    foot = ParagraphStyle(
        "FootProg",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=MUTED,
        alignment=TA_CENTER,
        spaceBefore=18,
    )

    story = []
    story.append(
        Paragraph(
            esc(evento.get("titulo") or "1° Jornadas internas de Inteligencia Artificial"),
            title,
        )
    )
    fecha = esc(evento.get("fechaTexto") or "")
    hora_i = esc(evento.get("horaInicio") or "15:00")
    mod = esc(evento.get("modalidad") or "Virtual")
    story.append(Paragraph(f"{fecha} · {hora_i} · {mod}", sub))
    story.append(Paragraph(esc(nota), note))

    for item in items:
        h0 = esc(item.get("hora") or "")
        h1 = esc(item.get("horaFin") or "")
        story.append(Paragraph(f"{h0}–{h1}", hora))
        label = TIPO_LABEL.get(str(item.get("tipo") or "").lower(), "ÍTEM")
        story.append(Paragraph(label, tipo))
        story.append(Paragraph(esc(item.get("titulo") or ""), tit))
        meta = meta_line(item)
        if meta:
            story.append(Paragraph(esc(meta), who))

    story.append(Spacer(1, 6 * mm))
    story.append(
        Paragraph(
            "Observatorio de Inteligencia Artificial · UCCuyo · observatorioia@uccuyo.edu.ar",
            foot,
        )
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=evento.get("titulo") or "Programa Jornadas IA",
        author="Observatorio de IA · UCCuyo",
    )
    doc.build(story)
    print(f"Wrote {OUT} ({len(items)} ítems)")


def main() -> int:
    if not DATA.is_file():
        print(f"Falta {DATA}", file=sys.stderr)
        return 1
    data = json.loads(DATA.read_text(encoding="utf-8"))
    build(data)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
