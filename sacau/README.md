# Convertidor SACAU (UCCuyo)

Transformá un **plan de estudios en horas** al **SACAU / CRE**.

## Usar en el navegador

**https://observatorio-ia.uccuyo.edu.ar/sacau/**

1. Cargá tu plan en **Word (.docx)** o **PDF** (también escaneado / CSV).
2. Si el PDF es imagen, el sistema aplica **OCR** automáticamente.
3. Si reconoce un plan ya digitalizado (p. ej. Res. 1098-CS-2013), carga la grilla completa.
4. Ajustá tipologías y trabajo autónomo.
5. Descargá el plan en créditos: **Word**, **PDF** o CSV.

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
