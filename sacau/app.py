"""
Convertidor SACAU — UCCuyo
Transforma planes de estudio en horas a Créditos de Referencia del Estudiante (CRE).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from engine.convert import convert_plan, totales_por_anio, totales_por_area
from engine.export import plan_to_dataframe, to_csv_bytes, to_excel_bytes
from engine.models import Asignatura, ConvertOptions, PlanEstudios, Tipologia
from engine.validate import validate_plan

DATA = ROOT / "data"

st.set_page_config(
    page_title="Convertidor SACAU | UCCuyo",
    page_icon="🎓",
    layout="wide",
)


@st.cache_data
def load_json(name: str) -> dict:
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def load_tipologias() -> dict[str, Tipologia]:
    raw = load_json("tipologias.json")
    return {t["id"]: Tipologia.from_dict(t) for t in raw["tipologias"]}


def tipologias_to_editor_df(tips: dict[str, Tipologia]) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "id": t.id,
                "nombre": t.nombre,
                "ratio_autonomo": t.ratio_autonomo,
                "autonomas_fijas": t.autonomas_fijas,
                "descripcion": t.descripcion,
            }
            for t in tips.values()
        ]
    )


def df_to_tipologias(df: pd.DataFrame) -> dict[str, Tipologia]:
    out: dict[str, Tipologia] = {}
    for _, row in df.iterrows():
        tid = str(row["id"]).strip()
        if not tid:
            continue
        out[tid] = Tipologia(
            id=tid,
            nombre=str(row.get("nombre", tid)),
            ratio_autonomo=float(row.get("ratio_autonomo", 1.0) or 0),
            autonomas_fijas=float(row.get("autonomas_fijas", 0) or 0),
            descripcion=str(row.get("descripcion", "") or ""),
        )
    return out


EDITOR_COLUMNS = [
    "codigo",
    "nombre",
    "anio",
    "area",
    "regimen",
    "tipologia",
    "horas_teoricas",
    "horas_practicas",
    "horas_autonomas_override",
    "valor_cre_override",
    "horas_estimadas",
    "notas",
]


def plan_to_editor_df(plan: PlanEstudios) -> pd.DataFrame:
    rows = []
    for a in plan.asignaturas:
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
                "horas_autonomas_override": a.horas_autonomas_override,
                "valor_cre_override": a.valor_cre_override,
                "horas_estimadas": a.horas_estimadas,
                "notas": a.notas,
            }
        )
    return pd.DataFrame(rows, columns=EDITOR_COLUMNS)


def editor_df_to_plan(df: pd.DataFrame, base: PlanEstudios) -> PlanEstudios:
    asignaturas: list[Asignatura] = []
    for _, row in df.iterrows():
        nombre = str(row.get("nombre", "") or "").strip()
        if not nombre:
            continue
        override_auto = row.get("horas_autonomas_override")
        override_cre = row.get("valor_cre_override")
        asignaturas.append(
            Asignatura(
                codigo=str(row.get("codigo", "") or ""),
                nombre=nombre,
                anio=int(row.get("anio", 1) or 1),
                area=str(row.get("area", "") or ""),
                horas_teoricas=float(row.get("horas_teoricas", 0) or 0),
                horas_practicas=float(row.get("horas_practicas", 0) or 0),
                regimen=str(row.get("regimen", "S") or "S"),
                tipologia=str(row.get("tipologia", "teorica") or "teorica"),
                horas_autonomas_override=(
                    None
                    if override_auto is None or (isinstance(override_auto, float) and pd.isna(override_auto))
                    else float(override_auto)
                ),
                valor_cre_override=(
                    None
                    if override_cre is None or (isinstance(override_cre, float) and pd.isna(override_cre))
                    else float(override_cre)
                ),
                horas_estimadas=bool(row.get("horas_estimadas", False)),
                notas=str(row.get("notas", "") or ""),
            )
        )
    return PlanEstudios(
        id=base.id,
        nombre=base.nombre,
        titulo=base.titulo,
        institucion=base.institucion,
        normativa=base.normativa,
        duracion_anios=base.duracion_anios or (max((a.anio for a in asignaturas), default=0)),
        carrera_clave=base.carrera_clave,
        asignaturas=asignaturas,
        metadata=base.metadata,
    )


def empty_plan() -> PlanEstudios:
    return PlanEstudios(
        id="plan-nuevo",
        nombre="Plan de estudios (nuevo)",
        titulo="",
        institucion="Universidad Católica de Cuyo",
        normativa="",
        duracion_anios=0,
        carrera_clave="",
        asignaturas=[
            Asignatura(
                codigo="01",
                nombre="Asignatura ejemplo",
                anio=1,
                area="FB",
                horas_teoricas=64,
                horas_practicas=0,
                regimen="S",
                tipologia="teorica",
            )
        ],
    )


def import_csv_to_plan(df: pd.DataFrame, base: PlanEstudios) -> PlanEstudios:
    # Normalizar nombres de columnas frecuentes
    rename = {
        "código": "codigo",
        "cod": "codigo",
        "asignatura": "nombre",
        "materia": "nombre",
        "año": "anio",
        "teo": "horas_teoricas",
        "practicas": "horas_practicas",
        "prácticas": "horas_practicas",
        "h_teoricas": "horas_teoricas",
        "h_practicas": "horas_practicas",
    }
    cols = {c: rename.get(str(c).strip().lower(), str(c).strip().lower()) for c in df.columns}
    df = df.rename(columns=cols)
    for col in EDITOR_COLUMNS:
        if col not in df.columns:
            df[col] = None if "override" in col else (False if col == "horas_estimadas" else "")
    if "horas_teoricas" not in df.columns:
        df["horas_teoricas"] = 0
    if "horas_practicas" not in df.columns:
        df["horas_practicas"] = 0
    return editor_df_to_plan(df[EDITOR_COLUMNS], base)


def nivel_emoji(nivel: str) -> str:
    return {"ok": "✅", "warning": "⚠️", "error": "❌"}.get(nivel, "•")


def main() -> None:
    normas_uccuyo = load_json("normas_uccuyo.json")
    normas_psico = load_json("normas_psicologia.json")
    tips_default = load_tipologias()

    st.title("Convertidor SACAU → CRE")
    st.caption(
        "Universidad Católica de Cuyo · Res. 788-CS-2026 (CRE = 25 h, hasta 30) · "
        "Marco nacional RESOL-2025-556 · Caso de prueba: Lic. en Psicología"
    )

    with st.sidebar:
        st.header("Fuente del plan")
        fuente = st.radio(
            "Origen",
            [
                "Lic. Psicología (precargado)",
                "Plan vacío",
                "Importar CSV",
            ],
            index=0,
        )
        uploaded = None
        if fuente == "Importar CSV":
            uploaded = st.file_uploader("CSV del plan", type=["csv"])

        st.divider()
        st.header("Parámetros CRE")
        valor_cre = st.number_input(
            "Valor CRE por defecto (horas)",
            min_value=float(normas_uccuyo["sacau"]["cre_rango_min"]),
            max_value=float(normas_uccuyo["sacau"]["cre_rango_max"]),
            value=float(normas_uccuyo.get("cre_default", 25)),
            step=1.0,
            help="UCCuyo: 25 h; puede extenderse a 30 por unidad curricular justificada.",
        )
        redondeo = st.selectbox(
            "Redondeo de CRE",
            options=[0.5, 0.25, 0.0],
            format_func=lambda x: "Sin redondeo" if x == 0 else f"Múltiplos de {x}",
            index=0,
        )
        aplicar_carrera = st.checkbox(
            "Validar estándares Psicología",
            value=True,
            help="Anexos ministeriales: 3000 h, prácticas y PPS.",
        )

    # Session: cargar plan base según fuente
    if "plan_base_key" not in st.session_state:
        st.session_state.plan_base_key = None

    key = fuente
    if fuente == "Importar CSV" and uploaded is not None:
        key = f"csv:{uploaded.name}:{uploaded.size}"

    if st.session_state.plan_base_key != key:
        if fuente.startswith("Lic. Psicología"):
            base = PlanEstudios.from_dict(load_json("psicologia_1098.json"))
        elif fuente == "Plan vacío":
            base = empty_plan()
        else:
            base = empty_plan()
            base.nombre = "Plan importado"
            if uploaded is not None:
                csv_df = pd.read_csv(uploaded)
                base = import_csv_to_plan(csv_df, base)
                base.nombre = f"Plan importado ({uploaded.name})"
        st.session_state.plan_base = base
        st.session_state.editor_df = plan_to_editor_df(base)
        st.session_state.tips_df = tipologias_to_editor_df(tips_default)
        st.session_state.plan_base_key = key

    base: PlanEstudios = st.session_state.plan_base

    tab_params, tab_plan, tab_result, tab_help = st.tabs(
        ["Coeficientes autónomos", "Editor del plan", "Resultados CRE", "Ayuda normativa"]
    )

    with tab_params:
        st.subheader("Tipologías de trabajo autónomo")
        st.write(
            "Las horas autónomas se estiman como "
            "`interacción × ratio + horas fijas`, salvo override por asignatura."
        )
        tips_edited = st.data_editor(
            st.session_state.tips_df,
            num_rows="dynamic",
            use_container_width=True,
            key="tips_editor",
        )
        st.session_state.tips_df = tips_edited

    with tab_plan:
        st.subheader(base.nombre)
        if base.normativa:
            st.caption(base.normativa)
        if base.metadata.get("nota"):
            st.info(base.metadata["nota"])
        edited = st.data_editor(
            st.session_state.editor_df,
            num_rows="dynamic",
            use_container_width=True,
            key="plan_editor",
            column_config={
                "anio": st.column_config.NumberColumn("Año", min_value=1, max_value=10, step=1),
                "horas_teoricas": st.column_config.NumberColumn("H. teóricas", min_value=0),
                "horas_practicas": st.column_config.NumberColumn("H. prácticas", min_value=0),
                "horas_autonomas_override": st.column_config.NumberColumn(
                    "Autónomas (override)",
                    help="Si se completa, reemplaza el cálculo por tipología.",
                    min_value=0,
                ),
                "valor_cre_override": st.column_config.NumberColumn(
                    "CRE h (override)",
                    help="25 por defecto; hasta 30 si se justifica.",
                    min_value=25,
                    max_value=30,
                ),
                "tipologia": st.column_config.SelectboxColumn(
                    "Tipología",
                    options=list(tips_default.keys()),
                ),
                "area": st.column_config.SelectboxColumn(
                    "Área",
                    options=["FB", "FP", "FGC", "FCI", "OTRA"],
                ),
                "regimen": st.column_config.SelectboxColumn("Régimen", options=["A", "S"]),
            },
        )
        st.session_state.editor_df = edited

        c1, c2 = st.columns(2)
        with c1:
            st.download_button(
                "Plantilla CSV vacía",
                data=plan_to_editor_df(empty_plan()).to_csv(index=False).encode("utf-8-sig"),
                file_name="plantilla_plan_sacau.csv",
                mime="text/csv",
            )
        with c2:
            if st.button("Restablecer plan de la fuente"):
                st.session_state.plan_base_key = None
                st.rerun()

    # Convertir
    tipologias = df_to_tipologias(st.session_state.tips_df)
    plan = editor_df_to_plan(st.session_state.editor_df, base)
    if aplicar_carrera and plan.carrera_clave != "psicologia" and fuente.startswith("Lic."):
        plan.carrera_clave = "psicologia"
    if not aplicar_carrera:
        plan.carrera_clave = "" if plan.carrera_clave == "psicologia" else plan.carrera_clave

    options = ConvertOptions(
        valor_cre_default=float(valor_cre),
        redondeo_cre=float(redondeo),
        tipologias=tipologias,
    )
    convertido = convert_plan(plan, options)
    carrera_normas = normas_psico if plan.carrera_clave == "psicologia" else None
    validacion = validate_plan(convertido, normas_uccuyo, carrera_normas)

    with tab_result:
        t = convertido.totales
        m1, m2, m3, m4, m5 = st.columns(5)
        m1.metric("Interacción", f"{t.horas_interaccion:,.0f} h")
        m2.metric("Autónomas", f"{t.horas_autonomas:,.0f} h")
        m3.metric("Totales estudiante", f"{t.horas_totales:,.0f} h")
        m4.metric("CRE totales", f"{t.cre:,.1f}")
        m5.metric("CRE / año", f"{t.cre_promedio_anual:,.1f}")

        st.subheader("Cumplimiento normativo")
        for check in validacion.checks:
            st.markdown(f"{nivel_emoji(check.nivel)} **{check.mensaje}**")

        st.subheader("Detalle por asignatura")
        detail = plan_to_dataframe(convertido)
        st.dataframe(detail, use_container_width=True, hide_index=True)

        c_a, c_b = st.columns(2)
        with c_a:
            st.markdown("**Por año**")
            anios_rows = [
                {
                    "Año": anio,
                    "Interacción": tot.horas_interaccion,
                    "Autónomas": tot.horas_autonomas,
                    "Totales": tot.horas_totales,
                    "CRE": tot.cre,
                }
                for anio, tot in totales_por_anio(convertido.items).items()
            ]
            st.dataframe(pd.DataFrame(anios_rows), hide_index=True, use_container_width=True)
        with c_b:
            st.markdown("**Por área**")
            area_rows = [
                {
                    "Área": area,
                    "Interacción": tot.horas_interaccion,
                    "Prácticas": tot.horas_practicas,
                    "Autónomas": tot.horas_autonomas,
                    "CRE": tot.cre,
                }
                for area, tot in totales_por_area(convertido.items).items()
            ]
            st.dataframe(pd.DataFrame(area_rows), hide_index=True, use_container_width=True)

        st.subheader("Exportar")
        x1, x2 = st.columns(2)
        with x1:
            st.download_button(
                "Descargar CSV",
                data=to_csv_bytes(convertido),
                file_name=f"{plan.id}_cre.csv",
                mime="text/csv",
            )
        with x2:
            st.download_button(
                "Descargar Excel",
                data=to_excel_bytes(convertido, validacion),
                file_name=f"{plan.id}_cre.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )

    with tab_help:
        st.markdown(
            """
### Qué convierte esta herramienta

Los planes tradicionales expresan **horas de interacción** (teóricas + prácticas).
El SACAU mide el **trabajo total del estudiante** = interacción + **trabajo autónomo**,
en unidades **CRE**.

| Norma | Criterio |
| --- | --- |
| Res. 788-CS-2026 UCCuyo | 1 CRE = **25 h** (hasta **30 h** justificado) |
| RESOL-2025-556 | Grado: mínimo **240 CRE**, **2.100 h** interacción, ~**60 CRE/año** |
| Anexos Psicología | Mínimo **3.000 h** interacción; **500 h** práctica (250 PPS) |

### Cómo usar

1. Elegí el plan precargado de Psicología o importá un CSV.
2. Ajustá coeficientes de trabajo autónomo según tipología.
3. Revisá/editá asignaturas (overrides de autónomas o valor CRE).
4. Mirá el panel de cumplimiento y exportá Excel para la comisión curricular.

### Próximas etapas (fuera de v1)

Matrices de tributación / competencias (Marco conceptual Res. 911-CS-2026),
parser de PDF y catálogo de Actividades Curriculares Acreditables (ACA).
"""
        )


if __name__ == "__main__":
    main()
