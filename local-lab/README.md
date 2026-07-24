# Laboratorio local — Encuestas docentes + Encuesta Clara

Trabajo en tu Mac **sin publicar** todavía en https://claudiomlarrea.github.io/observatorio-ia/

## Piezas

1. **Observatorio (esta carpeta del repo)** — sección `#encuestas` con flujo docentes.
2. **Encuesta Clara** — clon en `~/Documents/EncuestaClara-app` (carga Excel / Google Sheets + informe Word).
3. **Datos de prueba** — `local-lab/datos/encuesta_ia_alumnos_348.xlsx` (respuestas alumnos).
4. **Google Sheets docentes** — `1VGWlc-n_td6dctPdfvKmFxfKgBAdFV3P6J51Wjlg5r4`  
   Debe estar compartido como *Cualquier persona con el enlace → Lector* para la carga automática.

## Flujo deseado

Docente responde Forms → respuestas caen en Sheets → Encuesta Clara carga el Sheets → frecuencias + cualitativo → descarga informe ejecutivo Word → (más adelante) se publica en la pestaña Encuestas e informes.

> Nota: **EvaluAR** es la herramienta de exámenes en papel. El análisis de encuestas es **Encuesta Clara**.

## 1) Levantar Observatorio en local

```bash
cd /Users/claudiolarrea/Documents/Observatorio
python3 -m http.server 8765
```

Abrí: http://127.0.0.1:8765/#encuestas

## 2) Levantar Encuesta Clara en local

```bash
cd /Users/claudiolarrea/Documents/EncuestaClara-app
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

Probar con alumnos:

- Subí `local-lab/datos/encuesta_ia_alumnos_348.xlsx`, **o**
- Ruta local: `/Users/claudiolarrea/Documents/Observatorio/local-lab/datos/encuesta_ia_alumnos_348.xlsx`

Probar Sheets (cuando esté público):

```
http://localhost:8501/?sheet=1VGWlc-n_td6dctPdfvKmFxfKgBAdFV3P6J51Wjlg5r4
```

## 3) Generar informe de prueba por consola

```bash
cd /Users/claudiolarrea/Documents/EncuestaClara-app
source .venv/bin/activate
python scripts/generar_informe_local.py \
  --xlsx "/Users/claudiolarrea/Documents/Observatorio/local-lab/datos/encuesta_ia_alumnos_348.xlsx" \
  --out "/Users/claudiolarrea/Documents/Observatorio/local-lab/salida/informe_prueba_alumnos.docx"
```

## 4) Formulario Google docentes

Usá el Apps Script en OneDrive:

`…/Encuestas docentes 2026/AppsScript_crear_formulario_docentes.gs`

Luego vinculá las respuestas al Sheets `1VGWlc-n_…` (o usá la hoja que cree Forms) y compartila con enlace.

Cuando apruebes el flujo, recién ahí subimos Observatorio + Encuesta Clara a la web.
