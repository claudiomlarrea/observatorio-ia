"""Exportación CSV / Excel del plan convertido."""

from __future__ import annotations

from io import BytesIO

import pandas as pd

from .convert import totales_por_anio, totales_por_area
from .models import PlanConvertido
from .validate import ValidationResult


DETAIL_COLUMNS = [
    "codigo",
    "nombre",
    "anio",
    "area",
    "regimen",
    "tipologia",
    "horas_teoricas",
    "horas_practicas",
    "horas_interaccion",
    "horas_autonomas",
    "autonomas_fuente",
    "horas_totales",
    "valor_cre",
    "cre",
    "horas_estimadas",
    "notas",
]


def plan_to_dataframe(plan_conv: PlanConvertido) -> pd.DataFrame:
    rows = []
    for item in plan_conv.items:
        a = item.asignatura
        rows.append(
            {
                "codigo": a.codigo,
                "nombre": a.nombre,
                "anio": a.anio,
                "area": a.area,
                "regimen": a.regimen,
                "tipologia": a.tipologia,
                "horas_teoricas": a.horas_teoricas,
                "horas_practicas": a.horas_practicas,
                "horas_interaccion": item.horas_interaccion,
                "horas_autonomas": item.horas_autonomas,
                "autonomas_fuente": item.autonomas_fuente,
                "horas_totales": item.horas_totales,
                "valor_cre": item.valor_cre,
                "cre": item.cre,
                "horas_estimadas": a.horas_estimadas,
                "notas": a.notas,
            }
        )
    return pd.DataFrame(rows, columns=DETAIL_COLUMNS)


def resumen_anios_df(plan_conv: PlanConvertido) -> pd.DataFrame:
    rows = []
    for anio, tot in totales_por_anio(plan_conv.items).items():
        rows.append(
            {
                "anio": anio,
                "horas_interaccion": tot.horas_interaccion,
                "horas_autonomas": tot.horas_autonomas,
                "horas_totales": tot.horas_totales,
                "cre": tot.cre,
            }
        )
    return pd.DataFrame(rows)


def resumen_areas_df(plan_conv: PlanConvertido) -> pd.DataFrame:
    rows = []
    for area, tot in totales_por_area(plan_conv.items).items():
        rows.append(
            {
                "area": area,
                "horas_interaccion": tot.horas_interaccion,
                "horas_practicas": tot.horas_practicas,
                "horas_autonomas": tot.horas_autonomas,
                "horas_totales": tot.horas_totales,
                "cre": tot.cre,
            }
        )
    return pd.DataFrame(rows)


def validacion_df(resultado: ValidationResult) -> pd.DataFrame:
    return pd.DataFrame([c.__dict__ for c in resultado.checks])


def to_csv_bytes(plan_conv: PlanConvertido) -> bytes:
    return plan_to_dataframe(plan_conv).to_csv(index=False).encode("utf-8-sig")


def to_excel_bytes(
    plan_conv: PlanConvertido,
    validacion: ValidationResult | None = None,
) -> bytes:
    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        plan_to_dataframe(plan_conv).to_excel(writer, sheet_name="Asignaturas", index=False)
        resumen_anios_df(plan_conv).to_excel(writer, sheet_name="Por_anio", index=False)
        resumen_areas_df(plan_conv).to_excel(writer, sheet_name="Por_area", index=False)
        totales = plan_conv.totales
        pd.DataFrame(
            [
                {
                    "plan": plan_conv.plan.nombre,
                    "horas_teoricas": totales.horas_teoricas,
                    "horas_practicas": totales.horas_practicas,
                    "horas_interaccion": totales.horas_interaccion,
                    "horas_autonomas": totales.horas_autonomas,
                    "horas_totales": totales.horas_totales,
                    "cre": totales.cre,
                    "anios": totales.anios,
                    "cre_promedio_anual": totales.cre_promedio_anual,
                    "valor_cre_default": plan_conv.opciones.valor_cre_default,
                }
            ]
        ).to_excel(writer, sheet_name="Totales", index=False)
        if validacion is not None:
            validacion_df(validacion).to_excel(writer, sheet_name="Validacion", index=False)
    return buffer.getvalue()
