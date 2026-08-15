# Convertidor SACAU (UCCuyo)

Transformá un **plan de estudios en horas** al **SACAU / CRE**.

## Anexo curricular Res. 911

Debajo de la tabla de asignaturas hay un **Anexo curricular (Res. 911-CS-2026)** editable:

1. El sistema genera un borrador (perfil, competencias, resultados, flexibilidad, reconocimiento, movilidad y despliegue de horas).
2. El usuario lo adapta a su carrera/universidad.
3. Se incluye en la descarga Word/PDF.

Plantillas en `data/anexo_911_plantillas.json`.

## Normativa

Los PDF oficiales están en [`docs/normativa/`](docs/normativa/): RESOL-2025-556, Res. 788-CS-2026, Res. 911-CS-2026 e Informe CONFEDI 2026.

En la UI web: selector de **tipo de carrera** (grado / pregrado / art. 43) para los umbrales SACAU.

## Usar en el navegador

**https://observatorio-ia.uccuyo.edu.ar/sacau/**

1. Cargá tu plan en **Word (.docx)** o **PDF** (también escaneado / CSV).
2. Si el PDF es imagen, el sistema aplica **OCR** automáticamente.
3. Si reconoce un plan ya digitalizado (p. ej. Res. 1098-CS-2013), carga la grilla completa.
4. Ajustá tipologías y trabajo autónomo.
5. Descargá el plan en créditos: **Word**, **PDF** o CSV.

Consultas: observatorioia@uccuyo.edu.ar

## PDFs escaneados

Las tablas densas escaneadas suelen fragmentarse con OCR genérico. Por eso:

- se intenta **reconocer** resoluciones/planes ya cargados en `data/planes_reconocidos.json`;
- si no hay coincidencia, se hace OCR página a página y se propone una grilla editable para corregir.

Para sumar otro plan “reconocible”, agregá su JSON en `data/` y una entrada en `planes_reconocidos.json`.

## Streamlit (opcional)

```bash
cd sacau
pip install -r requirements.txt
# OCR local: tesseract-ocr + tesseract-ocr-spa
streamlit run app.py
```
