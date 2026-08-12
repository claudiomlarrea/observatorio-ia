# Convertidor SACAU (UCCuyo)

Herramienta para transformar un **plan de estudios en horas** al
**Sistema Argentino de Créditos Académicos Universitarios (SACAU)**, usando el
**Crédito de Referencia del Estudiante (CRE)** definido por la UCCuyo.

## Usar en el navegador (sin terminal)

**URL institucional:** https://observatorio-ia.uccuyo.edu.ar/sacau/

**Espejo GitHub Pages:** https://claudiomlarrea.github.io/observatorio-ia/sacau/

Abrí el enlace, ajustá coeficientes o materias y descargá el CSV.

## Qué hace

- Estima **horas de trabajo autónomo** por tipología (editables).
- Calcula **CRE** por asignatura: `(interacción + autónomas) / valor_CRE`.
- Valida mínimos **SACAU** (Res. 556/2025) y, si aplica, estándares de
  **Psicología** (3.000 h, prácticas, PPS).
- Exporta **CSV** (web) y también **Excel** desde la app Streamlit.

## Requisitos institucionales embebidos

| Fuente | Criterio |
| --- | --- |
| Res. 788-CS-2026 UCCuyo | CRE = **25 h** (hasta **30 h** justificado) |
| RESOL-2025-556 | Grado ≥ **240 CRE**, ≥ **2.100 h** interacción, ~**60 CRE/año** |
| Anexos Psicología | ≥ **3.000 h** interacción; ≥ **500 h** práctica (≥ **250** PPS) |

## Alternativa local (Streamlit)

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

## Tests

```bash
cd sacau
pip install -r requirements.txt
pytest -q
```

## Estructura

```text
sacau/
  index.html             # UI web (GitHub Pages)
  css/ js/               # front estático
  app.py                 # UI Streamlit (opcional)
  engine/                # motor Python
  data/                  # normas + plan Psicología precargado
  tests/
```
