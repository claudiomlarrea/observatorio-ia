# Convertidor SACAU (UCCuyo)

Herramienta Streamlit para transformar un **plan de estudios en horas** al
**Sistema Argentino de Créditos Académicos Universitarios (SACAU)**, usando el
**Crédito de Referencia del Estudiante (CRE)** definido por la UCCuyo.

## Qué hace

- Estima **horas de trabajo autónomo** por tipología (editables).
- Calcula **CRE** por asignatura: `(interacción + autónomas) / valor_CRE`.
- Valida mínimos **SACAU** (Res. 556/2025) y, si aplica, estándares de
  **Psicología** (3.000 h, prácticas, PPS).
- Exporta **CSV** y **Excel** para comisiones curriculares.

## Requisitos institucionales embebidos

| Fuente | Criterio |
| --- | --- |
| Res. 788-CS-2026 UCCuyo | CRE = **25 h** (hasta **30 h** justificado) |
| RESOL-2025-556 | Grado ≥ **240 CRE**, ≥ **2.100 h** interacción, ~**60 CRE/año** |
| Anexos Psicología | ≥ **3.000 h** interacción; ≥ **500 h** práctica (≥ **250** PPS) |

## Cómo ejecutar

```bash
cd sacau
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

## Caso de prueba: Lic. en Psicología

El archivo [`data/psicologia_1098.json`](data/psicologia_1098.json) digitaliza el
despliegue del plan **Res. 1098-CS-2013** (años 1–6, 51 unidades curriculares).

Algunas asignaturas de 4º año tienen `horas_estimadas: true` porque el PDF
escaneado no permitió leer todas las celdas; se ajustaron para respetar el
**total anual publicado (750 h)**. Corregilas en el editor si tenés el dato exacto.

## Importar otro plan (CSV)

Columnas reconocidas (mínimo: `nombre`, `horas_teoricas`; recomendadas todas):

```text
codigo,nombre,anio,area,regimen,tipologia,horas_teoricas,horas_practicas,horas_autonomas_override,valor_cre_override,horas_estimadas,notas
```

Áreas sugeridas: `FB`, `FP`, `FGC`, `FCI`. Tipologías: ver `data/tipologias.json`.

## Tests

```bash
cd sacau
pip install -r requirements.txt
pytest -q
```

## Estructura

```text
sacau/
  app.py                 # UI Streamlit
  engine/                # motor de conversión y validación
  data/                  # normas + plan Psicología precargado
  tests/
```

## Fuera de alcance (v1)

- OCR / parsing automático de PDF.
- Matrices de tributación del Marco Res. 911-CS-2026.
- Publicación en el sitio público del Observatorio (se corre en local).
