(function () {
  var CFG = window.OBS_ENCUESTAS || {};
  var formLink = document.getElementById("encuestas-docentes-form");
  var claraLink = document.getElementById("encuestas-clara-link");
  var estado = document.getElementById("encuestas-docentes-estado");

  var formUrl = String(CFG.DOCENTES_FORM_URL || "").trim();
  if (formLink && formUrl) {
    formLink.href = formUrl;
    formLink.target = "_blank";
    formLink.rel = "noopener noreferrer";
    formLink.textContent = "Responder encuesta a docentes";
    formLink.removeAttribute("aria-describedby");
    if (estado) {
      estado.innerHTML =
        "La encuesta a docentes está abierta. Completá el formulario; el análisis se hace con Encuesta Clara a partir del Google Sheets. Consultas: " +
        '<a href="mailto:observatorioia@uccuyo.edu.ar">observatorioia@uccuyo.edu.ar</a>.';
    }
  }

  if (claraLink) {
    var local = String(CFG.ENCUESTA_CLARA_LOCAL || "").trim();
    if (local) claraLink.href = local;
  }
})();
