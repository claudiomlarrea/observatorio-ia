(function () {
  var CFG = window.OBS_ENCUESTAS || {};
  var PUB = window.OBS_PUBLICACIONES || {};
  var formLink = document.getElementById("encuestas-docentes-form");
  var exportLink = document.getElementById("encuestas-docentes-export");
  var panelLink = document.getElementById("encuestas-docentes-panel");
  var informeEjLink = document.getElementById("encuestas-docentes-informe-ejecutivo");
  var informeInstLink = document.getElementById("encuestas-docentes-informe-institucional");
  var estado = document.getElementById("encuestas-docentes-estado");
  var publica = CFG.DOCENTES_PUBLICA === true;

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

  if (publica) {
    wire(formLink, String(CFG.DOCENTES_FORM_URL || "").trim());
    if (formLink) {
      formLink.hidden = false;
      formLink.removeAttribute("aria-disabled");
      formLink.removeAttribute("tabindex");
    }
    var soon = document.querySelector(".encuestas-docentes-actions [data-i18n='sec.encuestas.docentes.btnProximamente']");
    if (soon) soon.hidden = true;
  }

  wire(exportLink, appsUrl(CFG.ACTION_EXPORT));
  wire(panelLink, appsUrl(CFG.ACTION_EQUIPO));
  wire(informeEjLink, appsUrl(CFG.ACTION_INFORME_EJECUTIVO));
  wire(informeInstLink, appsUrl(CFG.ACTION_INFORME_INSTITUCIONAL));

  if (estado && publica && CFG.DOCENTES_FORM_URL) {
    var note =
      window.I18N && typeof window.I18N.t === "function"
        ? window.I18N.t("sec.encuestas.docentes.noteOpen")
        : "";
    if (!note || note === "sec.encuestas.docentes.noteOpen") {
      note =
        "La encuesta está abierta para docentes. El equipo del Observatorio puede descargar las respuestas " +
        "y publicar informes desde los enlaces de abajo (inicio de sesión Google con correo autorizado). Consultas: " +
        '<a href="mailto:observatorioia@uccuyo.edu.ar">observatorioia@uccuyo.edu.ar</a>.';
    }
    estado.innerHTML = note;
  }

  document.addEventListener("oia:langchange", function () {
    if (!(estado && publica && CFG.DOCENTES_FORM_URL)) return;
    var note =
      window.I18N && typeof window.I18N.t === "function"
        ? window.I18N.t("sec.encuestas.docentes.noteOpen")
        : "";
    if (!note || note === "sec.encuestas.docentes.noteOpen") return;
    estado.innerHTML = note;
  });
})();
