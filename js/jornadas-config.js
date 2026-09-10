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
  CARGAS_STATUS_URL: "jornadas-cargas.html?v=4",
  /**
   * Títulos / autores canónicos (portada de los .docx revisados).
   * El fix de programa/agenda los aplica por palabra clave.
   */
  TITULOS_CANON: {
    dividuo: {
      match: /dividuo|dividualidad/i,
      titulo:
        "Del individuo al dividuo en el aula universitaria. La dividualidad como categoría pedagógico-didáctica para una práctica docente digital crítica ante la IA",
      persona: "Gil, Ojeda",
      area: "Asesoría Pedagógica",
      clave: "gil ojeda dividuo",
    },
    lenguaje: {
      match: /lenguaje\s+cultural/i,
      titulo:
        "La Inteligencia Artificial como lenguaje cultural en la Educación Superior",
      persona: "Gil",
      area: "Asesoría Pedagógica",
      clave: "gil",
    },
    abogacia: {
      match: /abogac/i,
      titulo:
        "Inteligencia artificial y enseñanza de la abogacía: una perspectiva humanista sobre el proceso de aprendizaje",
      persona: "Ojeda, Cali, Maluf",
      area: "Educación",
      clave: "ojeda cali maluf",
    },
    derechos: {
      match: /derechos\s+humanos|eficacia\s+a\s+los\s+desc/i,
      titulo:
        "IA y Derechos Humanos: la IA como herramienta para dotar de eficacia a los DESC",
      persona: "Martinez, Maluf",
      area: "Derecho",
      clave: "martinez",
    },
    castillo: {
      match:
        /razonamiento\s+integrado|simulador\s+conversacional|argentina\s*2050|castillo/i,
      titulo:
        "Del contenido fragmentado al razonamiento integrado: uso de un simulador conversacional con IA en estudiantes de Medicina",
      persona: "Castillo et al.",
      area: "Salud",
      clave: "castillo",
    },
    meretta: {
      match: /contabilidad|pymes|meretta/i,
      titulo:
        "Inteligencia artificial aplicada a la Contabilidad Digital: un modelo metodológico para su integración en PyMEs",
      persona: "Meretta",
      area: "Contabilidad",
      clave: "meretta",
      /** Evitar cruzar con otras ponencias que digan solo «IA». */
      requirePersonaOrTitulo: /meretta|contabilidad|pymes/i,
    },
  },
  /** @deprecated usar TITULOS_CANON.dividuo.titulo */
  TITULO_DIVIDUO:
    "Del individuo al dividuo en el aula universitaria. La dividualidad como categoría pedagógico-didáctica para una práctica docente digital crítica ante la IA",
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
  PROGRAMA_PDF_URL: "jornadas-programa-pdf.html?v=4",
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
  CATALOGO_ARTICULOS_PDF: "jornadas-catalogo.html?tipo=articulos&v=8",
  CATALOGO_PRESENTACIONES_PDF: "",
  CATALOGO_ARTICULOS_PDF_FALLBACK:
    "assets/jornadas/catalogo-articulos-jornadas-ia-2026.pdf?v=13",
  CATALOGO_PRESENTACIONES_PDF_FALLBACK: "",
};

/**
 * Aplica títulos/autores canónicos (portadas Word) a ítems del programa.
 */
window.JORNADAS_fixProgramaItems = function (items) {
  var canon =
    (window.JORNADAS_IA_2026 && window.JORNADAS_IA_2026.TITULOS_CANON) || {};
  items = items || [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {};
    if (String(it.tipo || "ponencia") !== "ponencia") continue;
    var blob =
      String(it.titulo || "") +
      " " +
      String(it.persona || "") +
      " " +
      String(it.clave || "") +
      " " +
      String(it.area || "");
    for (var key in canon) {
      if (!Object.prototype.hasOwnProperty.call(canon, key)) continue;
      var rule = canon[key];
      if (!rule || !rule.match || !rule.match.test(blob)) continue;
      if (
        rule.requirePersonaOrTitulo &&
        !rule.requirePersonaOrTitulo.test(blob)
      ) {
        continue;
      }
      // Castillo: no pisar otras ponencias que digan solo «castillo» en notas
      if (key === "castillo") {
        if (
          !/razonamiento|2050|simulador|castillo|salud/i.test(blob) &&
          !/^razonamiento$/i.test(String(it.persona || ""))
        ) {
          continue;
        }
      }
      if (key === "meretta" && !/meretta|contabilidad|pymes/i.test(blob)) {
        continue;
      }
      it.titulo = rule.titulo;
      it.persona = rule.persona;
      if (rule.area) it.area = rule.area;
      if (rule.clave) it.clave = rule.clave;
      it.articuloOk = true;
      break;
    }
  }
  return items;
};

/** Idem para sesiones de la agenda app. */
window.JORNADAS_fixAgendaSesiones = function (sesiones) {
  var canon =
    (window.JORNADAS_IA_2026 && window.JORNADAS_IA_2026.TITULOS_CANON) || {};
  sesiones = sesiones || [];
  for (var i = 0; i < sesiones.length; i++) {
    var s = sesiones[i] || {};
    if (String(s.tipo || "ponencia") !== "ponencia") continue;
    var people = Array.isArray(s.disertantes) ? s.disertantes.join(" ") : "";
    var blob =
      String(s.titulo || "") + " " + people + " " + String(s.area || "");
    for (var key in canon) {
      if (!Object.prototype.hasOwnProperty.call(canon, key)) continue;
      var rule = canon[key];
      if (!rule || !rule.match || !rule.match.test(blob)) continue;
      if (
        rule.requirePersonaOrTitulo &&
        !rule.requirePersonaOrTitulo.test(blob)
      ) {
        continue;
      }
      if (key === "meretta" && !/meretta|contabilidad|pymes/i.test(blob)) {
        continue;
      }
      s.titulo = rule.titulo;
      s.disertantes = String(rule.persona || "")
        .split(/\s*,\s*/)
        .filter(Boolean);
      if (rule.area) s.area = rule.area;
      s.articuloOk = true;
      break;
    }
  }
  return sesiones;
};
