"""Tests del motor SACAU / CRE."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from engine.convert import convert_plan, estimate_autonomous_hours, round_to_step
from engine.export import plan_to_dataframe, to_csv_bytes, to_excel_bytes
from engine.models import Asignatura, ConvertOptions, PlanEstudios, Tipologia
from engine.validate import validate_plan

DATA = ROOT / "data"


@pytest.fixture(scope="module")
def tipologias() -> dict[str, Tipologia]:
    raw = json.loads((DATA / "tipologias.json").read_text(encoding="utf-8"))
    return {t["id"]: Tipologia.from_dict(t) for t in raw["tipologias"]}


@pytest.fixture(scope="module")
def normas_uccuyo() -> dict:
    return json.loads((DATA / "normas_uccuyo.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def normas_psico() -> dict:
    return json.loads((DATA / "normas_psicologia.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def plan_psico() -> PlanEstudios:
    return PlanEstudios.from_dict(
        json.loads((DATA / "psicologia_1098.json").read_text(encoding="utf-8"))
    )


def test_round_to_step():
    assert round_to_step(3.2, 0.5) == 3.0
    assert round_to_step(3.3, 0.5) == 3.5
    assert round_to_step(3.24, 0.25) == 3.25
    assert round_to_step(3.24, 0) == 3.24


def test_estimate_autonomous_override(tipologias):
    a = Asignatura(
        codigo="X",
        nombre="Test",
        anio=1,
        area="FB",
        horas_teoricas=100,
        horas_practicas=0,
        tipologia="teorica",
        horas_autonomas_override=40,
    )
    horas, fuente = estimate_autonomous_hours(a, tipologias)
    assert horas == 40
    assert fuente == "override"


def test_estimate_autonomous_tipologia(tipologias):
    a = Asignatura(
        codigo="X",
        nombre="Test",
        anio=1,
        area="FB",
        horas_teoricas=80,
        horas_practicas=20,
        tipologia="teorica",
    )
    horas, fuente = estimate_autonomous_hours(a, tipologias)
    assert fuente == "tipologia"
    assert horas == 100.0  # ratio 1.0


def test_convert_simple(tipologias):
    plan = PlanEstudios(
        id="t",
        nombre="Test",
        duracion_anios=1,
        asignaturas=[
            Asignatura("01", "Materia", 1, "FB", 50, 0, tipologia="teorica"),
        ],
    )
    opts = ConvertOptions(valor_cre_default=25, redondeo_cre=0.5, tipologias=tipologias)
    conv = convert_plan(plan, opts)
    # interacción 50 + autónomas 50 = 100 → 4 CRE
    assert conv.items[0].cre == 4.0
    assert conv.totales.cre == 4.0


def test_psicologia_totales_interaccion(plan_psico):
    assert len(plan_psico.asignaturas) == 51
    inter = sum(a.horas_interaccion for a in plan_psico.asignaturas)
    assert inter == 3660
    prac = sum(a.horas_practicas for a in plan_psico.asignaturas)
    assert prac >= 500
    pps = next(a for a in plan_psico.asignaturas if a.codigo == "50")
    assert pps.horas_practicas == 250


def test_psicologia_conversion_y_sacau(plan_psico, tipologias, normas_uccuyo, normas_psico):
    opts = ConvertOptions(valor_cre_default=25, redondeo_cre=0.5, tipologias=tipologias)
    conv = convert_plan(plan_psico, opts)
    assert conv.totales.horas_interaccion == 3660
    assert conv.totales.horas_autonomas > 0
    assert conv.totales.cre >= 240

    result = validate_plan(conv, normas_uccuyo, normas_psico)
    by_id = {c.id: c for c in result.checks}
    assert by_id["sacau_min_cre"].nivel == "ok"
    assert by_id["sacau_min_interaccion"].nivel == "ok"
    assert by_id["psico_min_interaccion"].nivel == "ok"
    assert by_id["psico_min_practica"].nivel == "ok"
    assert by_id["psico_min_pps"].nivel == "ok"


def test_export_formats(plan_psico, tipologias, normas_uccuyo, normas_psico):
    opts = ConvertOptions(valor_cre_default=25, redondeo_cre=0.5, tipologias=tipologias)
    conv = convert_plan(plan_psico, opts)
    val = validate_plan(conv, normas_uccuyo, normas_psico)
    df = plan_to_dataframe(conv)
    assert "cre" in df.columns
    assert len(df) == 51
    csv_bytes = to_csv_bytes(conv)
    assert csv_bytes.startswith(b"\xef\xbb\xbf") or b"codigo" in csv_bytes
    xlsx = to_excel_bytes(conv, val)
    assert xlsx[:2] == b"PK"
