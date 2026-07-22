(function () {
  var cfg = window.JORNADAS_IA_2026;
  if (!cfg) return;

  var formLink = document.getElementById("jornadas-form-link");
  var resumenLink = document.getElementById("jornadas-resumen-link");
  var presentacionLink = document.getElementById("jornadas-presentacion-link");

  if (formLink && cfg.INSCRIPCION_FORM_URL) {
    formLink.href = String(cfg.INSCRIPCION_FORM_URL).trim();
  }

  if (resumenLink && cfg.RESUMEN_FOLDER_URL) {
    resumenLink.href = String(cfg.RESUMEN_FOLDER_URL).trim();
  }

  if (presentacionLink && cfg.PRESENTACION_FOLDER_URL) {
    presentacionLink.href = String(cfg.PRESENTACION_FOLDER_URL).trim();
  }
})();
