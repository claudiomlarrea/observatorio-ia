# Consulta Congreso

App genérica del Observatorio de IA para **congresos, jornadas y reuniones**.

## Qué hace
- Carga un programa (JSON) y arma sola la botonera: Horario, Tema, Tipo, Disertante, Aula, atajos (Talleres / Pósteres / …), Agenda y Ahora.
- Instalación rápida en el celular (PWA) y uso offline.
- Descargas PDF (programa completo, talleres, pósteres, etc.).

## URLs
- App: `/consulta-congreso/`
- Cargar evento: `/consulta-congreso/cargar.html`
- Instalar: `/consulta-congreso/instalar.html`

## Formato JSON
Ver `data/evento.ejemplo.json`.

Campos clave de cada sesión:
`id`, `dia` (YYYY-MM-DD), `inicio`, `fin`, `sala`, `tipo`, `titulo`, `disertantes[]`, `moderadores[]`, `ejeId`.

Tipos reconocidos: `bienvenida`, `conferencia`, `plenaria`, `mesa`, `conversatorio`, `taller`, `poster`, `simposio`, `curso`, `acto`, `receso`.

Si hay sesiones `taller` / `poster` / `simposio` / `curso`, aparecen botones atajo automáticamente.

`meta.descargas[]`: `{ id, label, labelEn, href }` — `href` vacío se completa si cargás el PDF en `cargar.html`.
