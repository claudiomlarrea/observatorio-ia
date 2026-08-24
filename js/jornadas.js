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
  var box = document.getElementById("jornadas-catalogos");

  if (!btnArt && !btnPpt) return;

  if (!api) {
    // Sin API aún: ocultar bloque o dejar botones deshabilitados
    if (box) {
      var note = document.createElement("p");
      note.className = "jornadas-catalogos-pending";
      note.textContent =
        "Los catálogos PDF se activan cuando el equipo despliega el script de Apps Script (ver google-apps-script/PEGAR-JORNADAS-CATALOGOS.txt).";
      box.appendChild(note);
    }
    if (btnArt) {
      btnArt.setAttribute("aria-disabled", "true");
      btnArt.addEventListener("click", function (ev) {
        ev.preventDefault();
      });
    }
    if (btnPpt) {
      btnPpt.setAttribute("aria-disabled", "true");
      btnPpt.addEventListener("click", function (ev) {
        ev.preventDefault();
      });
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
      var artUrl =
        (data.articulos && (data.articulos.downloadUrl || data.articulos.pdfUrl)) || "";
      var pptUrl =
        (data.presentaciones &&
          (data.presentaciones.downloadUrl || data.presentaciones.pdfUrl)) ||
        "";
      if (btnArt && artUrl) {
        btnArt.href = artUrl;
        btnArt.removeAttribute("aria-disabled");
      }
      if (btnPpt && pptUrl) {
        btnPpt.href = pptUrl;
        btnPpt.removeAttribute("aria-disabled");
      }
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
      if (meta) {
        meta.hidden = false;
        meta.textContent =
          "No se pudo leer el catálogo automático. Probá más tarde o consultá a observatorioia@uccuyo.edu.ar.";
      }
    });
}
