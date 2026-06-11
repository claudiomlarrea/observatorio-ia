#!/bin/bash
# Copia PublicacionesWeb.gs al portapapeles y abre Apps Script.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
GS="$DIR/PublicacionesWeb.gs"

if [[ ! -f "$GS" ]]; then
  echo "No se encontró PublicacionesWeb.gs"
  exit 1
fi

pbcopy < "$GS"
echo "✓ PublicacionesWeb.gs copiado al portapapeles ($(wc -l < "$GS" | tr -d ' ') líneas)"
echo ""
echo "Ahora en script.google.com:"
echo "  1. Abrí el proyecto Publicaciones OIA"
echo "  2. PublicacionesWeb.gs → Cmd+A → Cmd+V (pegar)"
echo "  3. Implementar → Administrar implementaciones → lápiz → Nueva versión → Implementar"
echo ""
open "https://script.google.com/home" 2>/dev/null || true
