#!/bin/bash
# Restaura el panel «Cargar publicaciones» en el proyecto Apps Script del Observatorio.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
GS="$DIR/PublicacionesWeb.gs"
HTML="$DIR/PublicacionesAdmin.html"
PROYECTO_URL="https://script.google.com/home/projects/19z0bOktBiOQ0b8tA8EByQEm-oP9jNHFzvlyniDZmN-pSpdyXo1bc52ps/edit"

if [[ ! -f "$GS" || ! -f "$HTML" ]]; then
  echo "Faltan PublicacionesWeb.gs o PublicacionesAdmin.html en $DIR"
  exit 1
fi

pbcopy < "$GS"
echo "✓ PublicacionesWeb.gs copiado al portapapeles"
echo ""
echo "Se abre el proyecto Apps Script del Observatorio."
echo ""
echo "En esa pestaña (cuenta: investigacion@uccuyo.edu.ar):"
echo "  1. Panel izquierdo → PublicacionesWeb.gs (o SyncLookerOpenAlex.gs si ahí está el código)"
echo "  2. Cmd+A → Cmd+V → Cmd+S"
echo "  3. Implementar → Administrar implementaciones → lápiz → Nueva versión → Implementar"
echo ""
echo "Nota: el formulario ya no depende del archivo HTML PublicacionesAdmin."
echo ""
echo "Probar en el navegador:"
echo "  .../exec?action=admin&key=OIA-Privado-2026"
echo ""
open "$PROYECTO_URL" 2>/dev/null || true
