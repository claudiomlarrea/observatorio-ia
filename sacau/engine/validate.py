"""Validaciones SACAU nacionales e institucionales (UCCuyo / carrera)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .convert import totales_por_area
from .models import PlanConvertido


@dataclass
class CheckItem:
    id: str
    nivel: str  # ok | warning | error
    mensaje: str
    actual: float | None = None
    esperado: float | None = None
    unidad: str = ""


@dataclass
class ValidationResult:
    checks: list[CheckItem] = field(default_factory=list)

    @property
    def ok_count(self) -> int:
        return sum(1 for c in self.checks if c.nivel == "ok")

    @property
    def warning_count(self) -> int:
        return sum(1 for c in self.checks if c.nivel == "warning")

    @property
    def error_count(self) -> int:
        return sum(1 for c in self.checks if c.nivel == "error")

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok_count,
            "warnings": self.warning_count,
            "errors": self.error_count,
            "checks": [c.__dict__ for c in self.checks],
        }


def _cmp(
    check_id: str,
    actual: float,
    minimo: float,
    mensaje_ok: str,
    mensaje_fail: str,
    unidad: str = "",
    soft: bool = False,
) -> CheckItem:
    if actual >= minimo:
        return CheckItem(check_id, "ok", mensaje_ok, actual, minimo, unidad)
    return CheckItem(
        check_id,
        "warning" if soft else "error",
        mensaje_fail,
        actual,
        minimo,
        unidad,
    )


def validate_sacau(plan_conv: PlanConvertido, normas: dict[str, Any]) -> list[CheckItem]:
    sacau = normas.get("sacau", {})
    totales = plan_conv.totales
    checks: list[CheckItem] = []

    min_cre = float(sacau.get("grado_min_cre", 240))
    checks.append(
        _cmp(
            "sacau_min_cre",
            totales.cre,
            min_cre,
            f"CRE totales ({totales.cre:.1f}) cumplen el mínimo de grado ({min_cre}).",
            f"CRE totales ({totales.cre:.1f}) están por debajo del mínimo de grado ({min_cre}).",
            "CRE",
        )
    )

    min_inter = float(sacau.get("grado_min_horas_interaccion", 2100))
    checks.append(
        _cmp(
            "sacau_min_interaccion",
            totales.horas_interaccion,
            min_inter,
            f"Horas de interacción ({totales.horas_interaccion:.0f}) cumplen el mínimo ({min_inter:.0f}).",
            f"Horas de interacción ({totales.horas_interaccion:.0f}) están por debajo del mínimo ({min_inter:.0f}).",
            "h",
        )
    )

    ref_anual = float(sacau.get("cre_promedio_anual", 60))
    tolerancia = float(sacau.get("cre_anual_tolerancia", 10))
    if totales.anios:
        diff = abs(totales.cre_promedio_anual - ref_anual)
        if diff <= tolerancia:
            checks.append(
                CheckItem(
                    "sacau_cre_anual",
                    "ok",
                    f"Promedio anual {totales.cre_promedio_anual:.1f} CRE ≈ {ref_anual} (±{tolerancia}).",
                    totales.cre_promedio_anual,
                    ref_anual,
                    "CRE/año",
                )
            )
        else:
            checks.append(
                CheckItem(
                    "sacau_cre_anual",
                    "warning",
                    f"Promedio anual {totales.cre_promedio_anual:.1f} CRE se aleja de {ref_anual} (±{tolerancia}). Revisar redistribución.",
                    totales.cre_promedio_anual,
                    ref_anual,
                    "CRE/año",
                )
            )

    # Distinción interacción / autónomas presente
    if totales.horas_autonomas > 0 and totales.horas_interaccion > 0:
        checks.append(
            CheckItem(
                "sacau_distincion_horas",
                "ok",
                "El plan distingue horas de interacción y de trabajo autónomo.",
            )
        )
    else:
        checks.append(
            CheckItem(
                "sacau_distincion_horas",
                "warning",
                "Faltan horas autónomas estimadas: el SACAU requiere explicitar interacción y trabajo autónomo.",
            )
        )

    recomendacion_max = float(sacau.get("grado_recomendacion_max_cre", min_cre * 1.25))
    if totales.cre > recomendacion_max:
        checks.append(
            CheckItem(
                "sacau_recomendacion_max",
                "warning",
                f"CRE totales ({totales.cre:.1f}) superan la recomendación de no exceder 25% sobre el mínimo ({recomendacion_max:.0f}).",
                totales.cre,
                recomendacion_max,
                "CRE",
            )
        )

    return checks


def validate_psicologia(plan_conv: PlanConvertido, normas: dict[str, Any]) -> list[CheckItem]:
    psico = normas.get("psicologia", normas)
    totales = plan_conv.totales
    por_area = totales_por_area(plan_conv.items)
    checks: list[CheckItem] = []

    min_total = float(psico.get("min_horas_interaccion", 3000))
    checks.append(
        _cmp(
            "psico_min_interaccion",
            totales.horas_interaccion,
            min_total,
            f"Carga de interacción ({totales.horas_interaccion:.0f} h) ≥ {min_total:.0f} h del estándar.",
            f"Carga de interacción ({totales.horas_interaccion:.0f} h) < {min_total:.0f} h del estándar de Psicología.",
            "h",
        )
    )

    min_basica = float(psico.get("min_horas_formacion_basica", 1100))
    # FB + parte de FGC pueden mapear a formación básica; usamos FB estricta + FGC como aproximación documentada
    basica = por_area.get("FB", None)
    fgc = por_area.get("FGC", None)
    horas_basica = (basica.horas_interaccion if basica else 0) + (
        fgc.horas_interaccion if fgc else 0
    )
    checks.append(
        _cmp(
            "psico_min_basica",
            horas_basica,
            min_basica,
            f"Formación básica aproximada FB+FGC ({horas_basica:.0f} h) ≥ {min_basica:.0f} h.",
            f"Formación básica aproximada FB+FGC ({horas_basica:.0f} h) < {min_basica:.0f} h.",
            "h",
            soft=True,
        )
    )

    min_prof = float(psico.get("min_horas_formacion_profesional", 1900))
    fp = por_area.get("FP", None)
    horas_fp = fp.horas_interaccion if fp else 0
    checks.append(
        _cmp(
            "psico_min_profesional",
            horas_fp,
            min_prof,
            f"Formación profesional FP ({horas_fp:.0f} h) ≥ {min_prof:.0f} h.",
            f"Formación profesional FP ({horas_fp:.0f} h) < {min_prof:.0f} h (puede requerir reclasificación de áreas).",
            "h",
            soft=True,
        )
    )

    min_prac = float(psico.get("min_horas_practica", 500))
    checks.append(
        _cmp(
            "psico_min_practica",
            totales.horas_practicas,
            min_prac,
            f"Horas prácticas ({totales.horas_practicas:.0f}) ≥ {min_prac:.0f}.",
            f"Horas prácticas ({totales.horas_practicas:.0f}) < {min_prac:.0f}.",
            "h",
        )
    )

    min_prac_fp = float(psico.get("min_horas_practica_profesional", 400))
    prac_fp = fp.horas_practicas if fp else 0
    checks.append(
        _cmp(
            "psico_min_practica_fp",
            prac_fp,
            min_prac_fp,
            f"Prácticas en FP ({prac_fp:.0f} h) ≥ {min_prac_fp:.0f} h.",
            f"Prácticas en FP ({prac_fp:.0f} h) < {min_prac_fp:.0f} h.",
            "h",
        )
    )

    min_pps = float(psico.get("min_horas_pps", 250))
    pps_ids = set(psico.get("pps_codigos", ["50", "PPS"]))
    pps_horas = sum(
        i.asignatura.horas_practicas
        for i in plan_conv.items
        if i.asignatura.codigo in pps_ids or "práctica profesional" in i.asignatura.nombre.lower()
    )
    checks.append(
        _cmp(
            "psico_min_pps",
            pps_horas,
            min_pps,
            f"PPS ({pps_horas:.0f} h prácticas) ≥ {min_pps:.0f} h.",
            f"PPS ({pps_horas:.0f} h prácticas) < {min_pps:.0f} h.",
            "h",
        )
    )

    return checks


def validate_plan(
    plan_conv: PlanConvertido,
    normas_uccuyo: dict[str, Any],
    normas_carrera: dict[str, Any] | None = None,
) -> ValidationResult:
    checks = validate_sacau(plan_conv, normas_uccuyo)
    carrera = plan_conv.plan.carrera_clave
    if carrera == "psicologia" and normas_carrera:
        checks.extend(validate_psicologia(plan_conv, normas_carrera))
    return ValidationResult(checks=checks)
