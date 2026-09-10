/**
 * 1° Jornadas internas de IA 2026 — Observatorio de IA (UCCuyo)
 *
 * FORM_ASISTENTES_URL / FORM_EXPOSITORES_URL: Google Forms de inscripción.
 * RESUMEN_FOLDER_URL / PRESENTACION_FOLDER_URL: carpetas Drive de carga.
 * CATALOGOS_API_URL: Apps Script (JornadasCatalogos.gs) que regenera los PDF.
 *   Ver google-apps-script/PEGAR-JORNADAS-CATALOGOS.txt
 */
window.JORNADAS_IA_2026 = {
  FORM_ASISTENTES_URL:
    "https://docs.google.com/forms/d/e/1FAIpQLSc1GgR1PuBtnud5xlOGQSYUGeSYPmk1OjhHpefMSnm5XuUnvg/viewform?usp=sharing&ouid=102865527515262890038",
  FORM_EXPOSITORES_URL:
    "https://docs.google.com/forms/d/e/1FAIpQLSdwoONOXU-N-r26LRvrYWBOA4SfKQjaJ4BDXTcJoD48whT7Tw/viewform?usp=sharing&ouid=102865527515262890038",
  /**
   * Carpetas de carga (DOS carpetas distintas; no usar la carpeta padre).
   * Padre «Jornadas de IA 2026»: …/folders/13j0Gk4SZmCl_2lo2lBgpt8AMGnP36afI
   *   ├─ Artículos científicos
   *   └─ Presentaciones PowerPoint
   */
  RESUMEN_FOLDER_URL:
    "https://drive.google.com/drive/folders/1oEx8kOI1x4Hx2LppKv35DTIB6S48LXLa",
  PRESENTACION_FOLDER_URL:
    "https://drive.google.com/drive/folders/10Ma7p_Lo3tObfE0N_nXEgwqZogqQzXQE",
  /**
   * Panel equipo: cruza artículo ↔ PowerPoint por ponencia.
   */
  CARGAS_STATUS_URL: "jornadas-cargas.html?v=2",
  /** Título canónico Ojeda (archivo mal nombrado Gil_Ojeda_…). */
  TITULO_DIVIDUO: "Del individuo al dividuo en el aula universitaria",
  /**
   * API pública (programa, catálogos). Debe ser «Ejecutar como: Yo» + Cualquier usuario.
   * No usar para el editor: esa implementación no ve el correo del visitante.
   */
  CATALOGOS_API_URL:
    "https://script.google.com/macros/s/AKfycbwqC9p3EUiTK2DnPHKLT30y0-I3yMcVLzO0S0yNWgvjQVhpDj6z3ScWqo3eJ7LkgDhwQA/exec",
  /**
   * Vista en vivo del programa (misma API que el listado). Imprimir → Guardar PDF.
   * El .pdf en assets/ es solo respaldo y puede quedar desfasado.
   */
  PROGRAMA_PDF_URL: "jornadas-programa-pdf.html?v=2",
  PROGRAMA_PDF_FALLBACK: "assets/jornadas/programa-jornadas-ia-2026.pdf?v=10",
  /**
   * Editor del programa (equipo). Implementación aparte:
   * «Ejecutar como: Usuario que accede» + cuenta Google.
   */
  PROGRAMA_EDITOR_URL:
    "https://script.google.com/macros/s/AKfycby-iPVY572kZOubTA_eFv0WRWCponjQde778ibv2daEYvIDdza6N6HFnyw-tDdmWSB9/exec?action=editar_programa",
  /**
   * Catálogo público = artículos (desde el programa).
   * El catálogo de PowerPoint quedó desactivado en la UI; el seguimiento
   * artículo↔PPT es jornadas-cargas.html. La carpeta Drive de PPT sigue activa.
   */
  CATALOGO_ARTICULOS_PDF: "jornadas-catalogo.html?tipo=articulos&v=6",
  CATALOGO_PRESENTACIONES_PDF: "",
  CATALOGO_ARTICULOS_PDF_FALLBACK:
    "assets/jornadas/catalogo-articulos-jornadas-ia-2026.pdf?v=13",
  CATALOGO_PRESENTACIONES_PDF_FALLBACK: "",
};

/** Corrige Ojeda «dividuo» en ítems del programa (API / JSON). */
window.JORNADAS_fixProgramaItems = function (items) {
  var titulo =
    (window.JORNADAS_IA_2026 && window.JORNADAS_IA_2026.TITULO_DIVIDUO) ||
    "Del individuo al dividuo en el aula universitaria";
  items = items || [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {};
    var blob =
      String(it.titulo || "") +
      " " +
      String(it.persona || "") +
      " " +
      String(it.clave || "");
    if (!/dividuo/i.test(blob)) continue;
    it.titulo = titulo;
    it.persona = "Ojeda";
    it.area = it.area || "Asesoría Pedagógica";
    it.articuloOk = true;
    it.pptOk = true;
  }
  return items;
};

/** Idem para sesiones de la agenda app. */
window.JORNADAS_fixAgendaSesiones = function (sesiones) {
  var titulo =
    (window.JORNADAS_IA_2026 && window.JORNADAS_IA_2026.TITULO_DIVIDUO) ||
    "Del individuo al dividuo en el aula universitaria";
  sesiones = sesiones || [];
  for (var i = 0; i < sesiones.length; i++) {
    var s = sesiones[i] || {};
    var people = Array.isArray(s.disertantes) ? s.disertantes.join(" ") : "";
    var blob = String(s.titulo || "") + " " + people;
    if (!/dividuo/i.test(blob)) continue;
    s.titulo = titulo;
    s.disertantes = ["Ojeda"];
    s.area = s.area || "Asesoría Pedagógica";
    s.articuloOk = true;
    s.pptOk = true;
  }
  return sesiones;
};
