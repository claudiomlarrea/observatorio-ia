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
  wirePrograma_();
})();

function wirePrograma_() {
  var list = document.getElementById("jornadas-programa-list");
  if (!list) return;

  var url = "data/jornadas-programa-2026.json?v=2";
  fetch(url, { credentials: "omit" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      renderPrograma_(list, data);
    })
    .catch(function () {
      list.innerHTML =
        "<li class=\"jornadas-programa-item\"><div class=\"jornadas-programa-body\">" +
        "<p class=\"jornadas-programa-titulo\">No se pudo cargar el programa. Reintentá más tarde.</p>" +
        "</div></li>";
    });
}

function renderPrograma_(list, data) {
  var items = (data && data.items) || [];
  if (!items.length) {
    list.innerHTML = "";
    return;
  }

  var tipoLabel = {
    apertura: "Apertura",
    indicaciones: "Indicaciones",
    ponencia: "Ponencia",
    cierre: "Cierre",
  };

  var html = "";
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var hora =
      it.hora + (it.horaFin ? "–" + it.horaFin : "");
    var tipo = tipoLabel[it.tipo] || it.tipo || "";
    var persona = [it.persona, it.rol].filter(Boolean).join(" · ");
    var area = it.area ? " · " + it.area : "";
    var tag = "";
    if (it.tipo === "ponencia") {
      if (it.confirmado) {
        tag =
          '<span class="jornadas-programa-tag jornadas-programa-tag--ok">Confirmada</span>';
      } else {
        tag = '<span class="jornadas-programa-tag">Provisional</span>';
      }
    }
    html +=
      '<li class="jornadas-programa-item">' +
      '<p class="jornadas-programa-hora">' +
      escapeHtml_(hora) +
      "</p>" +
      '<div class="jornadas-programa-body">' +
      (tipo
        ? '<p class="jornadas-programa-tipo">' + escapeHtml_(tipo) + "</p>"
        : "") +
      '<p class="jornadas-programa-titulo">' +
      escapeHtml_(it.titulo || "") +
      (tag ? " " + tag : "") +
      "</p>" +
      (persona
        ? '<p class="jornadas-programa-meta">' +
          escapeHtml_(persona + area) +
          "</p>"
        : "") +
      "</div></li>";
  }
  list.innerHTML = html;
}

function escapeHtml_(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wireCatalogos_(cfg) {
  var api = String(cfg.CATALOGOS_API_URL || "").trim();
  var btnArt = document.getElementById("jornadas-catalogo-articulos");
  var btnPpt = document.getElementById("jornadas-catalogo-presentaciones");
  var meta = document.getElementById("jornadas-catalogos-meta");

  if (!btnArt && !btnPpt) return;

  // Abrir PDF en pestaña (como el flayer e instructivos). El atributo download
  // en Arc/Chromium a veces guarda un UUID sin .pdf y no se puede abrir.
  var artPdf = String(cfg.CATALOGO_ARTICULOS_PDF || "").trim();
  var pptPdf = String(cfg.CATALOGO_PRESENTACIONES_PDF || "").trim();
  if (btnArt && artPdf) {
    btnArt.href = artPdf;
    btnArt.removeAttribute("download");
    btnArt.setAttribute("target", "_blank");
    btnArt.setAttribute("rel", "noopener noreferrer");
    btnArt.removeAttribute("aria-disabled");
  }
  if (btnPpt && pptPdf) {
    btnPpt.href = pptPdf;
    btnPpt.removeAttribute("download");
    btnPpt.setAttribute("target", "_blank");
    btnPpt.setAttribute("rel", "noopener noreferrer");
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
      // Preferir PDF regenerado en Drive (Apps Script) para que las cargas
      // nuevas impacten sin esperar un commit de assets/jornadas/.
      if (btnArt && data.articulos && data.articulos.pdfId) {
        btnArt.href =
          "https://drive.google.com/file/d/" +
          encodeURIComponent(data.articulos.pdfId) +
          "/view";
      }
      if (btnPpt && data.presentaciones && data.presentaciones.pdfId) {
        btnPpt.href =
          "https://drive.google.com/file/d/" +
          encodeURIComponent(data.presentaciones.pdfId) +
          "/view";
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
      if (meta && meta.hidden) {
        meta.hidden = false;
        meta.textContent = "Catálogos PDF listos para descargar.";
      }
    });
}
