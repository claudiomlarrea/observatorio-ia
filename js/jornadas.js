(function () {
  var cfg = window.JORNADAS_IA_2026;
  if (!cfg) return;

  var asistentes = document.getElementById("jornadas-form-asistentes");
  var expositores = document.getElementById("jornadas-form-expositores");
  var resumenLink = document.getElementById("jornadas-resumen-link");
  var presentacionLink = document.getElementById("jornadas-presentacion-link");

  if (asistentes && cfg.FORM_ASISTENTES_URL) {
    asistentes.href = String(cfg.FORM_ASISTENTES_URL).trim();
  }
  if (expositores && cfg.FORM_EXPOSITORES_URL) {
    expositores.href = String(cfg.FORM_EXPOSITORES_URL).trim();
  }
  if (resumenLink && cfg.RESUMEN_FOLDER_URL) {
    resumenLink.href = String(cfg.RESUMEN_FOLDER_URL).trim();
  }
  if (presentacionLink && cfg.PRESENTACION_FOLDER_URL) {
    presentacionLink.href = String(cfg.PRESENTACION_FOLDER_URL).trim();
  }

  wireCatalogos_(cfg);
})();

function wireCatalogos_(cfg) {
  var api = String(cfg.CATALOGOS_API_URL || "").trim();
  var btnArt = document.getElementById("jornadas-catalogo-articulos");
  var btnPpt = document.getElementById("jornadas-catalogo-presentaciones");
  var meta = document.getElementById("jornadas-catalogos-meta");

  if (!btnArt && !btnPpt) return;

  // Descarga directa desde el sitio (mismo origen) — evita el sandbox de Apps Script
  // y los UUID sin .pdf de Drive uc?export=download.
  var artPdf = String(cfg.CATALOGO_ARTICULOS_PDF || "").trim();
  var pptPdf = String(cfg.CATALOGO_PRESENTACIONES_PDF || "").trim();
  if (btnArt && artPdf) {
    btnArt.href = artPdf;
    btnArt.setAttribute("download", "catalogo-articulos-jornadas-ia-2026.pdf");
    btnArt.removeAttribute("aria-disabled");
  }
  if (btnPpt && pptPdf) {
    btnPpt.href = pptPdf;
    btnPpt.setAttribute("download", "catalogo-presentaciones-jornadas-ia-2026.pdf");
    btnPpt.removeAttribute("aria-disabled");
  }

  if (!api) {
    if (meta) {
      meta.hidden = false;
      meta.textContent = "Catálogos PDF listos para descargar.";
    }
    return;
  }

  var url = api.replace(/\?.*$/, "") + "?action=catalogos";
  fetch(url, { credentials: "omit" })
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      if (!data || !data.ok) throw new Error((data && data.error) || "Sin catálogos");
      if (meta) {
        var nA = (data.articulos && data.articulos.count) || 0;
        var nP = (data.presentaciones && data.presentaciones.count) || 0;
        var when = data.updatedAt
          ? new Date(data.updatedAt).toLocaleString("es-AR", {
              dateStyle: "short",
              timeStyle: "short",
            })
          : "";
        meta.hidden = false;
        meta.textContent =
          nA +
          " artículo(s) · " +
          nP +
          " presentación(es)" +
          (when ? " · actualizado " + when : "");
      }
    })
    .catch(function () {
      if (meta && meta.hidden) {
        meta.hidden = false;
        meta.textContent = "Catálogos PDF listos para descargar.";
      }
    });
}
