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
})();
