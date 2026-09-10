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
  CARGAS_STATUS_URL: "jornadas-cargas.html?v=1",
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
   * Catálogos en vivo = mismas ponencias que el programa (?action=programa).
   * Imprimir → Guardar PDF. Los PDF en assets/ son solo respaldo.
   */
  CATALOGO_ARTICULOS_PDF: "jornadas-catalogo.html?tipo=articulos&v=4",
  CATALOGO_PRESENTACIONES_PDF: "jornadas-catalogo.html?tipo=presentaciones&v=3",
  CATALOGO_ARTICULOS_PDF_FALLBACK:
    "assets/jornadas/catalogo-articulos-jornadas-ia-2026.pdf?v=13",
  CATALOGO_PRESENTACIONES_PDF_FALLBACK:
    "assets/jornadas/catalogo-presentaciones-jornadas-ia-2026.pdf?v=12",
};
