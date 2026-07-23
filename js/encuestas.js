(function () {
  var CFG = window.OBS_ENCUESTAS || {};
  var formLink = document.getElementById("encuestas-docentes-form");
  var estado = document.getElementById("encuestas-docentes-estado");
  if (!formLink) return;

  var url = String(CFG.DOCENTES_FORM_URL || "").trim();
  if (!url) return;

  formLink.href = url;
  formLink.target = "_blank";
  formLink.rel = "noopener noreferrer";
  formLink.textContent = "Responder encuesta a docentes";
  formLink.removeAttribute("aria-describedby");

  if (estado) {
    estado.innerHTML =
      "La encuesta a docentes ya está abierta. Completá el formulario y, cuando esté disponible, el informe se publicará en esta misma sección. Consultas: " +
      '<a href="mailto:observatorioia@uccuyo.edu.ar">observatorioia@uccuyo.edu.ar</a>.';
  }
})();
