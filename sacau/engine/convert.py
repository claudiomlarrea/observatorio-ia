"""Conversión de horas de interacción + autónomas a CRE."""

from __future__ import annotations

from collections import defaultdict
from math import ceil

from .models import (
    Asignatura,
    AsignaturaConvertida,
    ConvertOptions,
    PlanConvertido,
    PlanEstudios,
    Tipologia,
    TotalesPlan,
)


def round_to_step(value: float, step: float) -> float:
    """Redondea al múltiplo de `step` más cercano (0 = exacto, con decimales)."""
    if not step or step <= 0:
        return float(value)
    rounded = round(value / step) * step
    decimals = 0 if step >= 1 else len(str(step).split(".")[-1]) if "." in str(step) else 0
    return round(rounded, min(6, decimals + 2))


def estimate_autonomous_hours(
    asignatura: Asignatura,
    tipologias: dict[str, Tipologia],
) -> tuple[float, str]:
    """Estima horas autónomas: override manual o coeficiente de tipología."""
    if asignatura.horas_autonomas_override is not None:
        return float(asignatura.horas_autonomas_override), "override"

    tip = tipologias.get(asignatura.tipologia) or tipologias.get("teorica")
    if tip is None:
        tip = Tipologia(id="teorica", nombre="Teórica", ratio_autonomo=1.0)

    estimadas = asignatura.horas_interaccion * tip.ratio_autonomo + tip.autonomas_fijas
    return float(estimadas), "tipologia"


def convert_asignatura(
    asignatura: Asignatura,
    options: ConvertOptions,
) -> AsignaturaConvertida:
    autonomas, fuente = estimate_autonomous_hours(asignatura, options.tipologias)
    totales = asignatura.horas_interaccion + autonomas
    valor_cre = (
        float(asignatura.valor_cre_override)
        if asignatura.valor_cre_override is not None
        else float(options.valor_cre_default)
    )
    if valor_cre <= 0:
        raise ValueError(f"Valor CRE inválido para {asignatura.codigo}: {valor_cre}")
    cre = round_to_step(totales / valor_cre, options.redondeo_cre)
    return AsignaturaConvertida(
        asignatura=asignatura,
        horas_autonomas=autonomas,
        horas_totales=totales,
        valor_cre=valor_cre,
        cre=cre,
        autonomas_fuente=fuente,
    )


def compute_totales(items: list[AsignaturaConvertida], duracion_anios: int = 0) -> TotalesPlan:
    teo = sum(i.asignatura.horas_teoricas for i in items)
    prac = sum(i.asignatura.horas_practicas for i in items)
    inter = sum(i.horas_interaccion for i in items)
    auto = sum(i.horas_autonomas for i in items)
    tot = sum(i.horas_totales for i in items)
    cre = sum(i.cre for i in items)

    anios = duracion_anios
    if not anios and items:
        anios = max(i.asignatura.anio for i in items)
    cre_anual = (cre / anios) if anios else 0.0

    return TotalesPlan(
        horas_teoricas=teo,
        horas_practicas=prac,
        horas_interaccion=inter,
        horas_autonomas=auto,
        horas_totales=tot,
        cre=cre,
        anios=anios,
        cre_promedio_anual=cre_anual,
    )


def totales_por_anio(items: list[AsignaturaConvertida]) -> dict[int, TotalesPlan]:
    buckets: dict[int, list[AsignaturaConvertida]] = defaultdict(list)
    for item in items:
        buckets[item.asignatura.anio].append(item)
    return {anio: compute_totales(grupo, duracion_anios=1) for anio, grupo in sorted(buckets.items())}


def totales_por_area(items: list[AsignaturaConvertida]) -> dict[str, TotalesPlan]:
    buckets: dict[str, list[AsignaturaConvertida]] = defaultdict(list)
    for item in items:
        buckets[item.asignatura.area or "SIN_AREA"].append(item)
    return {area: compute_totales(grupo) for area, grupo in sorted(buckets.items())}


def convert_plan(plan: PlanEstudios, options: ConvertOptions) -> PlanConvertido:
    items = [convert_asignatura(a, options) for a in plan.asignaturas]
    totales = compute_totales(items, duracion_anios=plan.duracion_anios)
    return PlanConvertido(plan=plan, items=items, totales=totales, opciones=options)


def suggest_cre_ceiling(horas_totales: float, valor_cre: float, step: float = 0.5) -> float:
    """Techo de CRE redondeando hacia arriba al paso indicado."""
    if valor_cre <= 0:
        return 0.0
    raw = horas_totales / valor_cre
    if not step or step <= 0:
        return raw
    return ceil(raw / step) * step
