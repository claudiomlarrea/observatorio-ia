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
  CARGAS_STATUS_URL: "jornadas-cargas.html?v=8",
  /**
   * Títulos / autores canónicos (portada Word + PPT revisados).
   * pptOk: true si ya revisamos el PowerPoint correspondiente.
   */
  TITULOS_CANON: {
    uso_ia: {
      match:
        /uso\s+de\s+(la\s+)?ia\s+en\s+estudiantes|uso\s+de\s+inteligencia\s+artificial\s+en\s+estudiantes|encuesta\s+alumnos\s+de\s+la\s+uc\s*cuyo/i,
      titulo:
        "Uso de inteligencia artificial en estudiantes de la Universidad Católica de Cuyo",
      persona: "José La Malfa",
      area: "Observatorio de IA",
      clave: "jose la malfa",
      articuloOk: true,
      pptOk: true,
      /** No cruzar con la encuesta de Marimon (UIC). */
      requirePersonaOrTitulo: /la\s*malfa|uso\s+de|encuesta\s+alumnos\s+de\s+la\s+uc/i,
    },
    gemeph: {
      match: /gemeph|gemelo\s+digital/i,
      titulo:
        "GEMEPH — Gemelo digital sociodemográfico de la EPH-INDEC. Exclusión digital, vulnerabilidad y brechas territoriales en Argentina",
      persona: "Larrea et al.",
      area: "Observatorio de IA",
      clave: "larrea",
      articuloOk: true,
      pptOk: true,
    },
    castillo: {
      match:
        /razonamiento\s+integrado|simulador\s+conversacional|argentina\s*2050|castillo/i,
      titulo:
        "Del contenido fragmentado al razonamiento integrado: uso de un simulador conversacional con IA en estudiantes de Medicina",
      persona: "Castillo et al.",
      area: "Salud",
      clave: "castillo",
      articuloOk: true,
      pptOk: true,
    },
    giboin: {
      match: /alerta\s+temprana|epidemiolog|giboin/i,
      titulo:
        "Sistema de Alerta Temprana (SAT) en Epidemiología Veterinaria, vínculo entre conocimiento científico e IA",
      persona: "Giboin",
      area: "Veterinaria",
      clave: "giboin",
      articuloOk: true,
      pptOk: true,
    },
    meretta: {
      match: /meretta|contabilidad\s*digital|pymes/i,
      titulo:
        "Inteligencia artificial aplicada a la Contabilidad Digital: un modelo metodológico para su integración en PyMEs",
      persona: "Meretta",
      area: "Contabilidad",
      clave: "meretta",
      articuloOk: true,
      pptOk: true,
      requirePersonaOrTitulo: /meretta|contabilidad|pymes/i,
    },
    derechos: {
      match: /derechos\s+humanos|eficacia\s+a\s+los\s+desc/i,
      titulo:
        "IA y Derechos Humanos: la IA como herramienta para dotar de eficacia a los DESC",
      persona: "Martinez, Maluf",
      area: "Derecho",
      clave: "martinez",
      articuloOk: true,
      pptOk: true,
    },
    lenguaje: {
      match: /lenguaje\s+cultural/i,
      titulo:
        "La Inteligencia Artificial como lenguaje cultural en la Educación Superior",
      persona: "Gil",
      area: "Asesoría Pedagógica",
      clave: "gil",
      articuloOk: true,
      pptOk: true,
    },
    abogacia: {
      match: /abogac/i,
      titulo:
        "Inteligencia artificial y enseñanza de la abogacía: una perspectiva humanista sobre el proceso de aprendizaje",
      persona: "Ojeda, Cali, Maluf",
      area: "Educación",
      clave: "ojeda cali maluf",
      articuloOk: true,
      pptOk: true,
    },
    garcia: {
      match: /quo\s*vadis|antropolog|antroplog|etica\s+y\s+antrop|ética\s+antrop/i,
      titulo:
        "Inteligencia artificial, conocimiento y educación: desafíos antropológicos y educativos desde Quo vadis, humanitas",
      persona: "García",
      area: "Cultura Religiosa y Pastoral",
      clave: "garcia quo vadis",
      articuloOk: true,
      pptOk: true,
    },
    dividuo: {
      match: /dividuo|dividualidad/i,
      titulo:
        "Del individuo al dividuo en el aula universitaria. La dividualidad como categoría pedagógico-didáctica para una práctica docente digital crítica ante la IA",
      persona: "Gil, Ojeda",
      area: "Asesoría Pedagógica",
      clave: "gil ojeda dividuo",
      articuloOk: true,
      pptOk: true,
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
  PROGRAMA_PDF_URL: "jornadas-programa-pdf.html?v=8",
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
  CATALOGO_ARTICULOS_PDF: "jornadas-catalogo.html?tipo=articulos&v=12",
  CATALOGO_PRESENTACIONES_PDF: "",
  CATALOGO_ARTICULOS_PDF_FALLBACK:
    "assets/jornadas/catalogo-articulos-jornadas-ia-2026.pdf?v=13",
  CATALOGO_PRESENTACIONES_PDF_FALLBACK: "",
};

/**
 * Aplica títulos/autores canónicos y quita duplicados (p. ej. Castillo ×2,
 * «Encuesta UC Cuyo» + «Uso de IA» de José La Malfa).
 */
window.JORNADAS_fixProgramaItems = function (items) {
  var canon =
    (window.JORNADAS_IA_2026 && window.JORNADAS_IA_2026.TITULOS_CANON) || {};
  items = items || [];
  var out = [];
  var seenIdx = {};

  function claveNorm(ck) {
    ck = String(ck || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    if (/^(jose\s+)?la\s+malfa$/.test(ck)) return "jose la malfa";
    if (/garcia|garcía|quo\s*vadis|antropolog|antroplog/.test(ck)) return "garcia quo vadis";
    return ck;
  }

  function mergeInto(dest, src) {
    if (src.articuloOk) dest.articuloOk = true;
    if (src.pptOk) dest.pptOk = true;
    if (src.articuloFileId && !dest.articuloFileId) {
      dest.articuloFileId = src.articuloFileId;
    }
    if (src.pptFileId && !dest.pptFileId) dest.pptFileId = src.pptFileId;
    if (src.hora && !dest.hora) dest.hora = src.hora;
    if (src.horaFin && !dest.horaFin) dest.horaFin = src.horaFin;
  }

  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {};
    if (String(it.tipo || "ponencia") === "ponencia") {
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
        if (key === "meretta" && !/meretta|contabilidad|pymes/i.test(blob)) {
          continue;
        }
        if (key === "giboin" && !/alerta|epidemiolog|giboin|veterinar/i.test(blob)) {
          continue;
        }
        // Encuesta UIC (Marimon) no es Uso IA
        if (
          key === "uso_ia" &&
          /internacional\s+de\s+catalu/i.test(blob)
        ) {
          continue;
        }
        it.titulo = rule.titulo;
        it.persona = rule.persona;
        if (rule.area) it.area = rule.area;
        if (rule.clave) it.clave = rule.clave;
        if (rule.articuloOk === true) it.articuloOk = true;
        if (rule.pptOk === true || it.pptFileId) it.pptOk = true;
        else if (rule.pptOk === false && !it.pptFileId) it.pptOk = false;
        break;
      }
      var ck = claveNorm(it.clave || it.titulo || "");
      if (ck && seenIdx[ck] != null) {
        mergeInto(out[seenIdx[ck]], it);
        continue;
      }
      if (ck) seenIdx[ck] = out.length;
    }
    out.push(it);
  }

  var orden = 0;
  for (var j = 0; j < out.length; j++) {
    orden++;
    out[j].orden = orden;
  }
  return out;
};

/** Idem para sesiones de la agenda app. */
window.JORNADAS_fixAgendaSesiones = function (sesiones) {
  var canon =
    (window.JORNADAS_IA_2026 && window.JORNADAS_IA_2026.TITULOS_CANON) || {};
  sesiones = sesiones || [];
  var out = [];
  var seen = {};
  for (var i = 0; i < sesiones.length; i++) {
    var s = sesiones[i] || {};
    if (String(s.tipo || "ponencia") === "ponencia") {
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
        if (key === "uso_ia" && /internacional\s+de\s+catalu/i.test(blob)) {
          continue;
        }
        s.titulo = rule.titulo;
        s.disertantes = String(rule.persona || "")
          .split(/\s*,\s*/)
          .filter(Boolean);
        if (rule.area) s.area = rule.area;
        if (rule.articuloOk === true) s.articuloOk = true;
        if (rule.pptOk === true || s.pptFileId) s.pptOk = true;
        else if (rule.pptOk === false && !s.pptFileId) s.pptOk = false;
        break;
      }
      var sk = String(s.titulo || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
      if (sk && seen[sk]) continue;
      if (sk) seen[sk] = true;
    }
    out.push(s);
  }
  return out;
};
