# JHVT — Gemelo Digital Hídrico Jáchal–Vicuña

Prototipo completo del **Observatorio de Inteligencia Artificial** (UCCuyo) + **Instituto del Agua**.

## Publicado en GitHub Pages

**URL:** https://claudiomlarrea.github.io/observatorio-ia/gemelo-digital-vicuna/

También accesible desde el sitio del Observatorio → *Herramientas de análisis de datos*.

## Ver en local

```bash
cd ~/Documents/documentos/gemelo-digital-vicuna
python3 -m http.server 8090
```

http://localhost:8090

## Módulos incluidos

| Módulo | Descripción |
|--------|-------------|
| Escenarios | Pacífico · Jáchal · Híbrido |
| Deslizantes | Hidrología + % Vicuña (con valores) |
| **Presets** | 7 escenarios what-if predefinidos |
| **Mapa cuenca** | SVG interactivo (caudal = grosor) |
| **Radar** | Pacífico vs Jáchal en 7 dimensiones |
| **ODS / licencia social** | ODS 3, 6, 8 + score compuesto |
| **LCOW** | Costo nivelado 25 años |
| **Brina** | Rechazo de ósmosis inversa |
| **Solar** | MWp fotovoltaicos San Juan |
| **Timeline Vicuña** | Etapas 2030–2042 |
| **CSV histórico** | Carga caudales → ajusta factor |
| **Tour guiado** | 8 pasos para demo con Luis |
| **Exportar PDF** | Informe ejecutivo (imprimir) |

## Estructura

```
gemelo-digital-vicuna/
├── index.html
├── js/
│   ├── model.js        # Simulación hidráulica y costos
│   ├── extensions.js   # LCOW, ODS, brina, solar, radar
│   ├── presets.js      # Escenarios predefinidos
│   ├── viz.js          # Mapa, radar, timeline
│   ├── report.js       # Export PDF + tour
│   └── app.js          # Orquestación
├── data/caudales-ejemplo.csv
└── css/
```

## Demo sugerida con Luis Jiménez

1. **Tour guiado** (botón arriba)
2. Preset **Ciclo normal** → mostrar radar Jáchal > Pacífico en licencia social
3. Preset **Sequía 2030** → mostrar trade-off costo/calidad
4. **Cargar CSV ejemplo** → datos “reales”
5. **Exportar informe PDF** para Vicuña

## Contacto

- observatorioia@uccuyo.edu.ar
- institutodelagua@uccuyo.edu.ar
