(function () {
  var CFG = window.OBS_ENCUESTAS || {};
  var PUB = window.OBS_PUBLICACIONES || {};
  var formLink = document.getElementById("encuestas-docentes-form");
  var exportLink = document.getElementById("encuestas-docentes-export");
  var panelLink = document.getElementById("encuestas-docentes-panel");
  var informeEjLink = document.getElementById("encuestas-docentes-informe-ejecutivo");
  var informeInstLink = document.getElementById("encuestas-docentes-informe-institucional");
  var estado = document.getElementById("encuestas-docentes-estado");

  function appsUrl(actionQuery) {
    var base = PUB.APPS_SCRIPT_URL && String(PUB.APPS_SCRIPT_URL).trim();
    if (!base || !actionQuery) return "";
    return base + (base.indexOf("?") >= 0 ? "&" : "?") + "action=" + actionQuery;
  }

  function wire(link, href) {
    if (!link || !href) return;
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  wire(formLink, String(CFG.DOCENTES_FORM_URL || "").trim());
  wire(exportLink, appsUrl(CFG.ACTION_EXPORT));
  wire(panelLink, appsUrl(CFG.ACTION_EQUIPO));
  wire(informeEjLink, appsUrl(CFG.ACTION_INFORME_EJECUTIVO));
  wire(informeInstLink, appsUrl(CFG.ACTION_INFORME_INSTITUCIONAL));

  if (estado && CFG.DOCENTES_FORM_URL) {
    estado.innerHTML =
      "La encuesta está abierta para docentes. El equipo del Observatorio puede descargar las respuestas " +
      "y publicar informes desde los enlaces de abajo (inicio de sesión Google con correo autorizado). Consultas: " +
      '<a href="mailto:observatorioia@uccuyo.edu.ar">observatorioia@uccuyo.edu.ar</a>.';
  }
})();
