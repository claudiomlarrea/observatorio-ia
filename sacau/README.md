# Convertidor SACAU (UCCuyo)

Transformá un **plan de estudios en horas** al **SACAU / CRE**.

## Usar en el navegador (sin terminal)

**https://observatorio-ia.uccuyo.edu.ar/sacau/**

1. Cargá tu plan en **Word (.docx)** o **PDF** (también CSV).
2. Revisá asignaturas detectadas: tipología, año, horas, overrides.
3. Ajustá coeficientes de trabajo autónomo.
4. Descargá el plan en créditos: **Word**, **PDF** o CSV.

Espejo: https://claudiomlarrea.github.io/observatorio-ia/sacau/

## Reglas embebidas

| Fuente | Criterio |
| --- | --- |
| Res. 788-CS-2026 UCCuyo | CRE = **25 h** (hasta **30 h** justificado) |
| RESOL-2025-556 | Grado ≥ **240 CRE**, ≥ **2.100 h** interacción, ~**60 CRE/año** |

## Streamlit (opcional)

```bash
cd sacau
pip install -r requirements.txt
streamlit run app.py
```

## Notas sobre la carga de archivos

- **Word (.docx)** y **PDF con texto** se parsean en el navegador.
- **PDF escaneados** (solo imagen) suelen no detectar filas: usá CSV o cargá a mano.
- El usuario siempre puede editar tipologías, horas autónomas y valor CRE por materia.

## Tests

```bash
cd sacau
pytest -q
```
