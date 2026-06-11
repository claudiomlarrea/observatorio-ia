#!/bin/bash
# Copia PublicacionesWeb.gs al portapapeles y abre el proyecto en Apps Script.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
GS="$DIR/PublicacionesWeb.gs"
PROYECTO_URL="https://script.google.com/home/projects/19z0bOktBiOQ0b8tA8EByQEm-oP9jNHFzvlyniDZmN-pSpdyXo1bc52ps/edit"

if [[ ! -f "$GS" ]]; then
  echo "No se encontró PublicacionesWeb.gs"
  exit 1
fi

pbcopy < "$GS"
echo "✓ Código copiado al portapapeles ($(wc -l < "$GS" | tr -d ' ') líneas)"
echo ""
echo "Se abre el proyecto «Publicaciones Página Web» en el navegador."
echo ""
echo "En esa pestaña:"
echo "  1. Cuenta Google: Claudio Larrea Secretari (círculo arriba a la derecha)"
echo "  2. Panel izquierdo → PublicacionesWeb.gs"
echo "  3. Cmd+A → Cmd+V → Cmd+S"
echo "  4. Implementar → Administrar implementaciones → lápiz → Nueva versión → Implementar"
echo ""
open "$PROYECTO_URL" 2>/dev/null || true
