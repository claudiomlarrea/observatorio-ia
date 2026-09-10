/**
 * Catálogos automáticos — 1° Jornadas internas de IA 2026
 * Observatorio de Inteligencia Artificial · UCCuyo
 *
 * Lee las carpetas Drive de artículos y presentaciones, extrae títulos
 * (desde el nombre sugerido Area_Universidad_Apellido_Titulo o el título del Doc)
 * y regenera dos PDF ordenados alfabéticamente.
 *
 * Carpetas fuente:
 *  - Padre:     13j0Gk4SZmCl_2lo2lBgpt8AMGnP36afI  («Jornadas de IA 2026»)
 *  - Artículos: 1oEx8kOI1x4Hx2LppKv35DTIB6S48LXLa
 *  - PPT:       10Ma7p_Lo3tObfE0N_nXEgwqZogqQzXQE
 *
 * Instalación: ver PEGAR-JORNADAS-CATALOGOS.txt
 */

var JORNADAS_ARTICULOS_FOLDER_ID = "1oEx8kOI1x4Hx2LppKv35DTIB6S48LXLa";
var JORNADAS_PRESENTACIONES_FOLDER_ID = "10Ma7p_Lo3tObfE0N_nXEgwqZogqQzXQE";

var CATALOGO_ARTICULOS_NAME = "catalogo-articulos-jornadas-ia-2026.pdf";
var CATALOGO_PRESENTACIONES_NAME = "catalogo-presentaciones-jornadas-ia-2026.pdf";

var ARTICULOS_MIME_OK = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
  "application/msword": true,
  "application/pdf": true,
  "application/vnd.google-apps.document": true
};

var PRESENTACIONES_MIME_OK = {
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": true,
  "application/vnd.ms-powerpoint": true,
  "application/pdf": true,
  "application/vnd.google-apps.presentation": true
};

/**
 * Punto de entrada del trigger horario y ejecución manual.
 */
function actualizarCatalogosJornadas() {
  var arts = listarEntradas_(JORNADAS_ARTICULOS_FOLDER_ID, ARTICULOS_MIME_OK, "articulo");
  var ppts = listarEntradas_(
    JORNADAS_PRESENTACIONES_FOLDER_ID,
    PRESENTACIONES_MIME_OK,
    "presentacion"
  );
  emparejarAutoresEntreCatalogos_(arts, ppts);
  sanearEntradasCatalogo_(arts, ppts);
  arts = deduplicarEntradasCatalogo_(arts);
  ppts = deduplicarEntradasCatalogo_(ppts);

  arts.sort(function (a, b) {
    return String(a.title).localeCompare(String(b.title), "es", { sensitivity: "base" });
  });
  ppts.sort(function (a, b) {
    return String(a.title).localeCompare(String(b.title), "es", { sensitivity: "base" });
  });

  var core = regenerarCatalogosYProgramaCore_(arts, ppts);

  // Avisos a Investigación (no Observatorio). Ver JornadasNotificaciones.gs
  var notify = null;
  try {
    if (typeof notificarNuevasCargasDriveJornadas_ === "function") {
      notify = notificarNuevasCargasDriveJornadas_(arts, ppts);
    }
  } catch (errNotify) {
    notify = { ok: false, error: String(errNotify) };
  }
  core.notify = notify;
  return core;
}

/**
 * Regenera PDF en Drive, guarda ítems para la API del sitio y sincroniza programa/agenda.
 * Fuente de listado de catálogos = PROGRAMA (ponencias), no solo archivos Drive.
 */
function regenerarCatalogosYProgramaCore_(arts, ppts) {
  arts = arts || [];
  ppts = ppts || [];

  var programa = null;
  try {
    if (typeof sincronizarProgramaDesdeCatalogos_ === "function") {
      programa = sincronizarProgramaDesdeCatalogos_(arts, ppts);
    }
  } catch (errProg) {
    programa = { ok: false, error: String(errProg) };
  }

  // Catálogos = ponencias del programa (alfabético). Drive solo aporta flags de archivo.
  var catalogoArts = entradasCatalogoDesdePrograma_("articulo");
  var catalogoPpts = entradasCatalogoDesdePrograma_("presentacion");
  if (!catalogoArts.length) catalogoArts = arts;
  if (!catalogoPpts.length) catalogoPpts = ppts;

  var outFolder = getCatalogosFolder_();
  var pdfArts = escribirCatalogoPdf_(
    outFolder,
    CATALOGO_ARTICULOS_NAME,
    "Catálogo de artículos científicos",
    "1° Jornadas internas de Inteligencia Artificial 2026",
    catalogoArts,
    "artículos"
  );
  var pdfPpts = escribirCatalogoPdf_(
    outFolder,
    CATALOGO_PRESENTACIONES_NAME,
    "Catálogo de presentaciones PowerPoint",
    "1° Jornadas internas de Inteligencia Artificial 2026",
    catalogoPpts,
    "presentaciones"
  );

  var props = PropertiesService.getScriptProperties();
  var updatedAt = new Date().toISOString();
  props.setProperty("jornadas_catalogo_articulos_id", pdfArts.getId());
  props.setProperty("jornadas_catalogo_presentaciones_id", pdfPpts.getId());
  props.setProperty("jornadas_catalogo_updated_at", updatedAt);
  props.setProperty("jornadas_catalogo_articulos_n", String(catalogoArts.length));
  props.setProperty("jornadas_catalogo_presentaciones_n", String(catalogoPpts.length));
  props.setProperty(
    "jornadas_catalogo_articulos_items_json",
    JSON.stringify(resumenItemsCatalogo_(catalogoArts))
  );
  props.setProperty(
    "jornadas_catalogo_presentaciones_items_json",
    JSON.stringify(resumenItemsCatalogo_(catalogoPpts))
  );

  return {
    ok: true,
    updatedAt: updatedAt,
    programa: programa,
    fuenteCatalogos: "programa",
    articulos: {
      count: catalogoArts.length,
      pdfId: pdfArts.getId(),
      pdfUrl: pdfArts.getUrl(),
      items: resumenItemsCatalogo_(catalogoArts)
    },
    presentaciones: {
      count: catalogoPpts.length,
      pdfId: pdfPpts.getId(),
      pdfUrl: pdfPpts.getUrl(),
      items: resumenItemsCatalogo_(catalogoPpts)
    }
  };
}

/**
 * Lista de catálogo = ponencias del programa actual (orden alfabético).
 * kind: "articulo" | "presentacion"
 */
function entradasCatalogoDesdePrograma_(kind) {
  var site = null;
  try {
    if (typeof obtenerProgramaSitio_ === "function") {
      site = obtenerProgramaSitio_();
    }
  } catch (ignore) {}
  if (!site || !site.items || !site.items.length) return [];

  var isPpt = String(kind || "").indexOf("present") >= 0;
  var out = [];
  var i;
  for (i = 0; i < site.items.length; i++) {
    var it = site.items[i] || {};
    if (String(it.tipo || "").toLowerCase() !== "ponencia") continue;
    var title = String(it.titulo || "").replace(/\s+/g, " ").trim();
    if (!title) continue;
    var author = String(it.persona || "").replace(/\s+/g, " ").trim();
    var area = String(it.area || "").replace(/\s+/g, " ").trim();
    var tiene = isPpt ? !!it.pptOk : !!it.articuloOk;
    out.push({
      title: title,
      author: author,
      area: area,
      hora: String(it.hora || "").trim(),
      horaFin: String(it.horaFin || "").trim(),
      orden: Number(it.orden) || out.length + 1,
      fileName: "",
      fileId: isPpt ? it.pptFileId || "" : it.articuloFileId || "",
      fileUrl: "",
      kind: isPpt ? "presentacion" : "articulo",
      sinArchivo: !tiene
    });
  }
  // Conservar el orden del programa (el que manda / se reorganiza a mano).
  return out;
}

function resumenItemsCatalogo_(list) {
  list = list || [];
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var it = list[i] || {};
    out.push({
      title: it.title || "",
      author: it.author || "",
      area: it.area || "",
      fileName: it.fileName || "",
      fileId: it.fileId || "",
      sinArchivo: !!it.sinArchivo
    });
  }
  return out;
}

function parseCatalogoItemsProp_(raw) {
  if (!raw) return [];
  try {
    var arr = JSON.parse(raw);
    return Object.prototype.toString.call(arr) === "[object Array]" ? arr : [];
  } catch (e) {
    return [];
  }
}

/**
 * Diagnóstico público: ?action=estado
 * Sirve para ver si triggers, modo manual y conteos están OK.
 */
function estadoSistemaJornadas_() {
  var props = PropertiesService.getScriptProperties();
  var triggers = [];
  try {
    var hs = ScriptApp.getProjectTriggers();
    for (var i = 0; i < hs.length; i++) {
      triggers.push(hs[i].getHandlerFunction());
    }
  } catch (ignoreT) {}
  var prog = null;
  try {
    prog = obtenerProgramaSitio_();
  } catch (ignoreP) {}
  var agenda = null;
  try {
    agenda = obtenerProgramaAgenda_();
  } catch (ignoreA) {}
  var manual =
    props.getProperty("jornadas_programa_manual") === "1" ||
    (prog && prog.source === "manual");
  var pareo = null;
  try {
    pareo = informePareoCargasJornadas_();
  } catch (ignorePareo) {}
  return {
    ok: true,
    ahora: new Date().toISOString(),
    manual: !!manual,
    triggers: triggers,
    tieneTriggerCargas: triggers.indexOf("revisarCargasDriveJornadas") >= 0,
    tieneTriggerCatalogos: triggers.indexOf("actualizarCatalogosJornadas") >= 0,
    carpetas: {
      padreJornadas: "13j0Gk4SZmCl_2lo2lBgpt8AMGnP36afI",
      articulos: JORNADAS_ARTICULOS_FOLDER_ID,
      presentaciones: JORNADAS_PRESENTACIONES_FOLDER_ID,
      nota:
        "La carpeta padre «Jornadas de IA 2026» contiene dos subcarpetas distintas: Artículos y Presentaciones."
    },
    pareo: pareo
      ? {
          ponencias: pareo.totales && pareo.totales.ponencias,
          conArticulo: pareo.totales && pareo.totales.conArticulo,
          conPpt: pareo.totales && pareo.totales.conPpt,
          completos: pareo.totales && pareo.totales.completos,
          faltaPpt: pareo.totales && pareo.totales.faltaPpt,
          faltaArticulo: pareo.totales && pareo.totales.faltaArticulo
        }
      : null,
    catalogos: {
      updatedAt: props.getProperty("jornadas_catalogo_updated_at") || "",
      articulos: Number(props.getProperty("jornadas_catalogo_articulos_n") || 0),
      presentaciones: Number(
        props.getProperty("jornadas_catalogo_presentaciones_n") || 0
      ),
      articulosItems: parseCatalogoItemsProp_(
        props.getProperty("jornadas_catalogo_articulos_items_json")
      ).length
    },
    programa: {
      source: (prog && prog.source) || "",
      updatedAt: (prog && prog.updatedAt) || "",
      items: (prog && prog.items && prog.items.length) || 0
    },
    agenda: {
      source: (agenda && agenda.source) || "",
      updatedAt: (agenda && agenda.updatedAt) || "",
      sesiones: (agenda && agenda.sesiones && agenda.sesiones.length) || 0
    },
    sitio: {
      listado: "API ?action=programa (vivo)",
      agendaApp: "API ?action=programa_agenda (vivo)",
      catalogosVivos: "jornadas-catalogo.html / ?action=catalogos",
      controlCargas: "jornadas-cargas.html (artículo ↔ PowerPoint)",
      pdfAssets:
        "Copia estática en GitHub (puede atrasarse; no es la fuente de verdad)"
    }
  };
}

/**
 * ?action=pareo — cruza artículo y PowerPoint por ponencia del programa.
 * Sirve para ver quién cargó Word y todavía no subió el PPT (días después).
 */
function informePareoCargasJornadas_() {
  var site = null;
  try {
    site = obtenerProgramaSitio_();
  } catch (ignore) {}
  var items = [];
  var i;
  if (site && site.items) {
    for (i = 0; i < site.items.length; i++) {
      var it = site.items[i] || {};
      if (String(it.tipo || "").toLowerCase() !== "ponencia") continue;
      var art = !!it.articuloOk;
      var ppt = !!it.pptOk;
      var estado = "sin_archivos";
      if (art && ppt) estado = "completo";
      else if (art && !ppt) estado = "falta_ppt";
      else if (!art && ppt) estado = "falta_articulo";
      items.push({
        titulo: String(it.titulo || "").trim(),
        persona: String(it.persona || "").trim(),
        area: String(it.area || "").trim(),
        orden: Number(it.orden) || 0,
        hora: String(it.hora || "").trim(),
        articuloOk: art,
        pptOk: ppt,
        articuloFileId: it.articuloFileId || "",
        pptFileId: it.pptFileId || "",
        estado: estado
      });
    }
  }
  items.sort(function (a, b) {
    return (Number(a.orden) || 0) - (Number(b.orden) || 0);
  });
  // Preferir orden del programa; si no hay orden, dejar como vino.
  var totales = {
    ponencias: items.length,
    conArticulo: 0,
    conPpt: 0,
    completos: 0,
    faltaPpt: 0,
    faltaArticulo: 0,
    sinArchivos: 0
  };
  for (i = 0; i < items.length; i++) {
    if (items[i].articuloOk) totales.conArticulo++;
    if (items[i].pptOk) totales.conPpt++;
    if (items[i].estado === "completo") totales.completos++;
    if (items[i].estado === "falta_ppt") totales.faltaPpt++;
    if (items[i].estado === "falta_articulo") totales.faltaArticulo++;
    if (items[i].estado === "sin_archivos") totales.sinArchivos++;
  }
  return {
    ok: true,
    updatedAt: (site && site.updatedAt) || new Date().toISOString(),
    carpetas: {
      articulos:
        "https://drive.google.com/drive/folders/" + JORNADAS_ARTICULOS_FOLDER_ID,
      presentaciones:
        "https://drive.google.com/drive/folders/" +
        JORNADAS_PRESENTACIONES_FOLDER_ID,
      padre:
        "https://drive.google.com/drive/folders/13j0Gk4SZmCl_2lo2lBgpt8AMGnP36afI"
    },
    totales: totales,
    items: items
  };
}

/**
 * Listado rápido para el sitio (solo nombre de archivo → título/autor/área).
 * No abre Docs ni regenera PDF (evita la demora de minutos).
 */
function listarCatalogosRapido_() {
  var artsDrive = listarEntradasRapido_(
    JORNADAS_ARTICULOS_FOLDER_ID,
    ARTICULOS_MIME_OK,
    "articulo"
  );
  var pptsDrive = listarEntradasRapido_(
    JORNADAS_PRESENTACIONES_FOLDER_ID,
    PRESENTACIONES_MIME_OK,
    "presentacion"
  );
  emparejarAutoresEntreCatalogos_(artsDrive, pptsDrive);
  sanearEntradasCatalogo_(artsDrive, pptsDrive);
  artsDrive = deduplicarEntradasCatalogo_(artsDrive);
  pptsDrive = deduplicarEntradasCatalogo_(pptsDrive);

  // Mantener programa al día con Drive, pero el listado público sale del programa.
  var programaSync = null;
  try {
    if (typeof sincronizarProgramaDesdeCatalogos_ === "function") {
      programaSync = sincronizarProgramaDesdeCatalogos_(artsDrive, pptsDrive);
    }
  } catch (errProgSync) {
    programaSync = { ok: false, error: String(errProgSync) };
  }

  var arts = entradasCatalogoDesdePrograma_("articulo");
  var ppts = entradasCatalogoDesdePrograma_("presentacion");
  if (!arts.length) arts = artsDrive;
  if (!ppts.length) ppts = pptsDrive;

  var updatedAt = new Date().toISOString();
  try {
    var props = PropertiesService.getScriptProperties();
    props.setProperty(
      "jornadas_catalogo_articulos_items_json",
      JSON.stringify(resumenItemsCatalogo_(arts))
    );
    props.setProperty(
      "jornadas_catalogo_presentaciones_items_json",
      JSON.stringify(resumenItemsCatalogo_(ppts))
    );
    props.setProperty("jornadas_catalogo_articulos_n", String(arts.length));
    props.setProperty("jornadas_catalogo_presentaciones_n", String(ppts.length));
    if (!props.getProperty("jornadas_catalogo_updated_at")) {
      props.setProperty("jornadas_catalogo_updated_at", updatedAt);
    }
  } catch (ignoreCache) {}
  return {
    ok: true,
    updatedAt: updatedAt,
    fuente: "programa",
    programa: programaSync,
    articulos: {
      count: arts.length,
      items: resumenItemsCatalogo_(arts)
    },
    presentaciones: {
      count: ppts.length,
      items: resumenItemsCatalogo_(ppts)
    }
  };
}

function listarEntradasRapido_(folderId, mimeOk, kind) {
  var folder = DriveApp.getFolderById(folderId);
  var out = [];
  recolectarArchivosRapido_(folder, mimeOk, kind, out, 0);
  return out;
}

function recolectarArchivosRapido_(folder, mimeOk, kind, out, depth) {
  if (depth > 4) return;
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    var name = f.getName();
    var mime = String(f.getMimeType() || "");
    if (/^catalogo-/i.test(name)) continue;
    if (!archivoAceptado_(name, mime, mimeOk, kind)) continue;
    if (mime === "application/vnd.google-apps.shortcut") {
      try {
        var target = resolverAtajo_(f);
        if (target) {
          f = target;
          name = f.getName();
          mime = String(f.getMimeType() || "");
          if (!archivoAceptado_(name, mime, mimeOk, kind)) continue;
        }
      } catch (ignoreShortcut) {
        continue;
      }
    }
    var meta = parseNombreSugerido_(name);
    var title = humanizarTituloCatalogo_(
      meta.title || name.replace(/\.[^.]+$/, "")
    );
    var author = limpiarAutorCatalogo_(meta.author || "");
    out.push({
      title: normalizarTituloCatalogo_(title || name),
      author: normalizarTituloCatalogo_(author),
      area: normalizarAreaCatalogo_(meta.area || ""),
      universidad: normalizarTituloCatalogo_(meta.universidad || ""),
      fileName: name,
      fileId: f.getId(),
      fileUrl: f.getUrl(),
      mime: mime,
      kind: kind,
      updated: f.getLastUpdated() ? f.getLastUpdated().toISOString() : ""
    });
  }
  var subs = folder.getFolders();
  while (subs.hasNext()) {
    recolectarArchivosRapido_(subs.next(), mimeOk, kind, out, depth + 1);
  }
}

/**
 * Instalá UNA vez (Ejecutar → instalarTriggerCatalogosJornadas).
 * Regenera los PDF cada 15 minutos.
 */
function instalarTriggerCatalogosJornadas() {
  var handlers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < handlers.length; i++) {
    if (handlers[i].getHandlerFunction() === "actualizarCatalogosJornadas") {
      ScriptApp.deleteTrigger(handlers[i]);
    }
  }
  ScriptApp.newTrigger("actualizarCatalogosJornadas").timeBased().everyMinutes(15).create();
}

/**
 * Web app: ?action=catalogos | ?action=actualizar
 * Desplegar como aplicación web (ejecutar como yo; acceso: cualquiera).
 */
function doGet(e) {
  e = e || {};
  var p = e.parameter || {};
  var action = String(p.action || "catalogos").toLowerCase();

  if (action === "actualizar" || action === "run" || action === "update") {
    try {
      var result = actualizarCatalogosJornadas();
      return jsonOut_(result);
    } catch (err) {
      return jsonOut_({ ok: false, error: String(err) });
    }
  }

  if (action === "estado" || action === "health" || action === "status") {
    try {
      return jsonOut_(estadoSistemaJornadas_());
    } catch (errEst) {
      return jsonOut_({ ok: false, error: String(errEst) });
    }
  }

  if (
    action === "pareo" ||
    action === "cargas" ||
    action === "estado_cargas" ||
    action === "pairing"
  ) {
    try {
      return jsonOut_(informePareoCargasJornadas_());
    } catch (errPareo) {
      return jsonOut_({ ok: false, error: String(errPareo), items: [] });
    }
  }

  if (
    action === "listar_catalogos" ||
    action === "catalogos_list" ||
    action === "catalogos-items"
  ) {
    try {
      return jsonOut_(listarCatalogosRapido_());
    } catch (errList) {
      return jsonOut_({ ok: false, error: String(errList) });
    }
  }

  if (action === "programa" || action === "program") {
    try {
      return jsonOut_(obtenerProgramaSitio_());
    } catch (errProg) {
      return jsonOut_({ ok: false, error: String(errProg), items: [] });
    }
  }

  if (
    action === "programa_pdf" ||
    action === "programa-pdf" ||
    action === "pdf_programa"
  ) {
    try {
      return servirProgramaPdf_();
    } catch (errProgPdf) {
      return HtmlService.createHtmlOutput(
        "<p>No se pudo abrir el PDF del programa: " + String(errProgPdf) + "</p>"
      );
    }
  }

  if (
    action === "programa_agenda" ||
    action === "agenda" ||
    action === "programa-app"
  ) {
    try {
      return jsonOut_(obtenerProgramaAgenda_());
    } catch (errAg) {
      return jsonOut_({ ok: false, error: String(errAg), sesiones: [] });
    }
  }

  if (
    action === "editar_programa" ||
    action === "editar-programa" ||
    action === "programa_editor"
  ) {
    try {
      return servirEditorProgramaHtml_();
    } catch (errEd) {
      return HtmlService.createHtmlOutput(
        "<p>No se pudo abrir el editor de programa: " +
          String(errEd) +
          "</p><p>Pegá <code>JornadasProgramaEditor.gs</code> y <code>JornadasProgramaEditor.html</code> en este proyecto e Implementá una nueva versión.</p>"
      );
    }
  }

  if (action === "pdf" || action === "descargar") {
    try {
      return servirPdfCatalogo_(String(p.tipo || p.kind || "articulos"), String(p.id || ""));
    } catch (errPdf) {
      return HtmlService.createHtmlOutput(
        "<p>No se pudo servir el PDF: " +
          String(errPdf) +
          "</p><p>Ejecutá <code>actualizarCatalogosJornadas</code> y volvé a intentar.</p>"
      );
    }
  }

  if (action === "debug" || action === "listar") {
    try {
      return jsonOut_({
        ok: true,
        articulosFolder: JORNADAS_ARTICULOS_FOLDER_ID,
        presentacionesFolder: JORNADAS_PRESENTACIONES_FOLDER_ID,
        articulosRaw: listarTodoCrudo_(JORNADAS_ARTICULOS_FOLDER_ID),
        presentacionesRaw: listarTodoCrudo_(JORNADAS_PRESENTACIONES_FOLDER_ID),
        articulosAceptados: listarEntradas_(
          JORNADAS_ARTICULOS_FOLDER_ID,
          ARTICULOS_MIME_OK,
          "articulo"
        ),
        presentacionesAceptadas: listarEntradas_(
          JORNADAS_PRESENTACIONES_FOLDER_ID,
          PRESENTACIONES_MIME_OK,
          "presentacion"
        )
      });
    } catch (errDbg) {
      return jsonOut_({ ok: false, error: String(errDbg) });
    }
  }

  // catalogos (default): metadatos + URLs actuales (sin forzar regeneración)
  try {
    var props = PropertiesService.getScriptProperties();
    var artId = props.getProperty("jornadas_catalogo_articulos_id");
    var pptId = props.getProperty("jornadas_catalogo_presentaciones_id");
    var base =
      ScriptApp.getService().getUrl() ||
      "";
    var artItems = parseCatalogoItemsProp_(
      props.getProperty("jornadas_catalogo_articulos_items_json")
    );
    var pptItems = parseCatalogoItemsProp_(
      props.getProperty("jornadas_catalogo_presentaciones_items_json")
    );
    // Si hay conteo pero falta el JSON de ítems (deploy viejo), rellenar rápido.
    if (
      (!artItems.length && Number(props.getProperty("jornadas_catalogo_articulos_n") || 0) > 0) ||
      (!pptItems.length && Number(props.getProperty("jornadas_catalogo_presentaciones_n") || 0) > 0)
    ) {
      try {
        var live = listarCatalogosRapido_();
        artItems = (live.articulos && live.articulos.items) || artItems;
        pptItems = (live.presentaciones && live.presentaciones.items) || pptItems;
      } catch (ignoreLive) {}
    }
    var payload = {
      ok: true,
      updatedAt: props.getProperty("jornadas_catalogo_updated_at") || "",
      articulos: {
        count: Number(props.getProperty("jornadas_catalogo_articulos_n") || artItems.length || 0),
        pdfId: artId || "",
        pdfUrl: artId ? "https://drive.google.com/file/d/" + artId + "/view" : "",
        downloadUrl:
          "https://observatorio-ia.uccuyo.edu.ar/assets/jornadas/" +
          CATALOGO_ARTICULOS_NAME,
        items: artItems
      },
      presentaciones: {
        count: Number(
          props.getProperty("jornadas_catalogo_presentaciones_n") || pptItems.length || 0
        ),
        pdfId: pptId || "",
        pdfUrl: pptId ? "https://drive.google.com/file/d/" + pptId + "/view" : "",
        downloadUrl:
          "https://observatorio-ia.uccuyo.edu.ar/assets/jornadas/" +
          CATALOGO_PRESENTACIONES_NAME,
        items: pptItems
      }
    };
    return jsonOut_(payload);
  } catch (err2) {
    return jsonOut_({ ok: false, error: String(err2) });
  }
}

/**
 * Página intermedia de descarga. No usa data: URI (HtmlService lo bloquea).
 * Redirige a Drive con confirm=t o muestra enlaces claros.
 */
function servirPdfCatalogo_(tipo, overrideId) {
  tipo = String(tipo || "articulos").toLowerCase();
  var props = PropertiesService.getScriptProperties();
  var isPpt = tipo.indexOf("present") >= 0 || tipo === "ppt" || tipo === "pptx";
  var id = String(overrideId || "").trim();
  if (!id) {
    id = isPpt
      ? props.getProperty("jornadas_catalogo_presentaciones_id")
      : props.getProperty("jornadas_catalogo_articulos_id");
  }
  var fileName = isPpt ? CATALOGO_PRESENTACIONES_NAME : CATALOGO_ARTICULOS_NAME;

  if (!id) {
    return HtmlService.createHtmlOutput(
      "<p>Todavía no hay catálogo generado. En Apps Script ejecutá " +
        "<code>actualizarCatalogosJornadas</code> y luego reintentá.</p>"
    );
  }

  try {
    DriveApp.getFileById(id).setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );
  } catch (ignoreShare) {}

  var safeName = String(fileName).replace(/"/g, "");
  var viewUrl = "https://drive.google.com/file/d/" + id + "/view";
  // Descarga fiable desde el sitio (mismo origen). Drive uc?export=download
  // suele bajar un UUID sin .pdf; HtmlService tampoco puede servir el binario.
  var downloadUrl =
    "https://observatorio-ia.uccuyo.edu.ar/assets/jornadas/" + safeName;

  var html =
    "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\">" +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta http-equiv="refresh" content="0;url=' +
    downloadUrl +
    '">' +
    "<title>" +
    safeName +
    "</title>" +
    "<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:2rem auto;padding:0 1rem;line-height:1.45}" +
    "a.btn{display:inline-block;margin:.4rem .4rem .4rem 0;padding:.65rem 1rem;background:#7a1532;color:#fff;" +
    "text-decoration:none;border-radius:.5rem;font-weight:700}</style></head><body>" +
    '<h1 style="font-size:1.15rem">' +
    safeName +
    "</h1>" +
    "<p>Redirigiendo a la descarga…</p>" +
    '<a class="btn" href="' +
    downloadUrl +
    '" download="' +
    safeName +
    '">Descargar PDF</a> ' +
    '<a class="btn" href="' +
    viewUrl +
    '" target="_blank" rel="noopener">Abrir en Drive</a>' +
    "<script>window.location.replace(" +
    JSON.stringify(downloadUrl) +
    ");</script>" +
    "</body></html>";

  return HtmlService.createHtmlOutput(html).setTitle(safeName);
}

function doOptions() {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function getCatalogosFolder_() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty("jornadas_catalogos_folder_id");
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (ignore) {}
  }
  var folder = DriveApp.createFolder("OIA · Catálogos Jornadas IA 2026");
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  props.setProperty("jornadas_catalogos_folder_id", folder.getId());
  return folder;
}

/** Lista cruda (nombre + mime) para diagnosticar por qué no entra un archivo. */
function listarTodoCrudo_(folderId) {
  var folder = DriveApp.getFolderById(folderId);
  var out = [];
  function walk(fol, depth) {
    if (depth > 4) return;
    var files = fol.getFiles();
    while (files.hasNext()) {
      var f = files.next();
      out.push({
        name: f.getName(),
        mime: f.getMimeType(),
        id: f.getId(),
        folder: fol.getName()
      });
    }
    var subs = fol.getFolders();
    while (subs.hasNext()) walk(subs.next(), depth + 1);
  }
  walk(folder, 0);
  return out;
}

function listarEntradas_(folderId, mimeOk, kind) {
  var folder = DriveApp.getFolderById(folderId);
  var out = [];
  recolectarArchivos_(folder, mimeOk, kind, out, 0);
  return out;
}

/**
 * Recorre la carpeta y subcarpetas. Acepta por MIME o por extensión
 * (.doc/.docx/.pdf o .ppt/.pptx), para no perder archivos con MIME raro.
 */
function recolectarArchivos_(folder, mimeOk, kind, out, depth) {
  if (depth > 4) return;

  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    var name = f.getName();
    var mime = String(f.getMimeType() || "");
    if (/^catalogo-/i.test(name)) continue;
    if (!archivoAceptado_(name, mime, mimeOk, kind)) continue;

    // Atajo de Drive: intentar resolver destino
    if (mime === "application/vnd.google-apps.shortcut") {
      try {
        var target = resolverAtajo_(f);
        if (target) {
          f = target;
          name = f.getName();
          mime = String(f.getMimeType() || "");
          if (!archivoAceptado_(name, mime, mimeOk, kind)) continue;
        }
      } catch (ignoreShortcut) {
        continue;
      }
    }

    var meta = parseNombreSugerido_(name);
    var title = humanizarTituloCatalogo_(meta.title || "");
    var author = limpiarAutorCatalogo_(meta.author || "");
    try {
      var docTitle = leerTituloDesdeArchivo_(f.getId(), mime);
      if (
        docTitle &&
        !esTituloInstitucionalBoilerplate_(docTitle) &&
        !esTituloBasuraCuerpo_(docTitle)
      ) {
        title = humanizarTituloCatalogo_(docTitle);
      }
    } catch (ignoreDoc) {}
    if (
      mime === "application/vnd.google-apps.presentation" ||
      /\.pptx?$/i.test(name)
    ) {
      try {
        if (mime === "application/vnd.google-apps.presentation") {
          var slidesTitle = leerTituloGoogleSlides_(f.getId());
          if (
            slidesTitle &&
            !esTituloInstitucionalBoilerplate_(slidesTitle) &&
            !esTituloBasuraCuerpo_(slidesTitle)
          ) {
            title = humanizarTituloCatalogo_(slidesTitle);
          }
        }
      } catch (ignoreSlides) {}
    }
    // Preferir título del nombre sugerido si el del cuerpo es abstract/basura/largo
    if (
      !title ||
      esTituloInstitucionalBoilerplate_(title) ||
      esTituloBasuraCuerpo_(title)
    ) {
      title = humanizarTituloCatalogo_(meta.title || name.replace(/\.[^.]+$/, ""));
    }

    // Varios autores en el cuerpo del artículo → "Apellido et al."
    try {
      if (documentoTieneVariosAutores_(f.getId(), mime) && author) {
        author = formatearAutorEtAl_(author);
      }
    } catch (ignoreAut) {}

    out.push({
      title: normalizarTituloCatalogo_(title || name),
      author: normalizarTituloCatalogo_(author),
      area: normalizarAreaCatalogo_(meta.area || ""),
      universidad: normalizarTituloCatalogo_(meta.universidad || ""),
      fileName: name,
      fileId: f.getId(),
      fileUrl: f.getUrl(),
      mime: mime,
      kind: kind,
      updated: f.getLastUpdated() ? f.getLastUpdated().toISOString() : ""
    });
  }

  var subs = folder.getFolders();
  while (subs.hasNext()) {
    recolectarArchivos_(subs.next(), mimeOk, kind, out, depth + 1);
  }
}

function archivoAceptado_(name, mime, mimeOk, kind) {
  if (mimeOk[mime]) return true;
  var n = String(name || "").toLowerCase();
  if (kind === "articulo") {
    if (/\.(docx?|pdf|odt|rtf)$/i.test(n)) return true;
    if (mime.indexOf("word") >= 0 || mime.indexOf("document") >= 0) return true;
  }
  if (kind === "presentacion") {
    if (/\.(pptx?|pdf|odp)$/i.test(n)) return true;
    if (mime.indexOf("presentation") >= 0 || mime.indexOf("powerpoint") >= 0) return true;
  }
  return false;
}

/** Resuelve un atajo de Drive si el servicio avanzado Drive está activo; si no, null. */
function resolverAtajo_(shortcutFile) {
  try {
    if (typeof Drive === "undefined" || !Drive.Files) return null;
    var meta = Drive.Files.get(shortcutFile.getId(), { fields: "shortcutDetails" });
    var targetId =
      meta && meta.shortcutDetails && meta.shortcutDetails.targetId
        ? meta.shortcutDetails.targetId
        : "";
    if (!targetId) return null;
    return DriveApp.getFileById(targetId);
  } catch (e) {
    return null;
  }
}

/**
 * Convención: Area_Universidad_Apellido_Titulo.ext
 */
function parseNombreSugerido_(fileName) {
  var base = String(fileName || "").replace(/\.[^.]+$/, "");
  // Colapsar dobles extensiones residuales en el stem
  base = base.replace(/\.(docx?|pptx?|pdf)$/i, "");
  var parts = base.split("_").filter(function (p) {
    return p && String(p).trim();
  });
  if (parts.length >= 5 && pareceUniversidadArchivo_(parts[1])) {
    // Area_Universidad_Autor1_Autor2_Titulo… (p. ej. Gil_Ojeda_Del individuo…)
    // El expositor suele ser el 2º apellido; el título empieza en parts[4].
    return {
      area: parts[0].replace(/-/g, " "),
      universidad: parts[1].replace(/-/g, " "),
      author: parts[3].replace(/-/g, " "),
      coauthor: parts[2].replace(/-/g, " "),
      title: parts
        .slice(4)
        .join(" ")
        .replace(/-/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    };
  }
  if (parts.length >= 4) {
    return {
      area: parts[0].replace(/-/g, " "),
      universidad: parts[1].replace(/-/g, " "),
      author: parts[2].replace(/-/g, " "),
      title: parts
        .slice(3)
        .join(" ")
        .replace(/-/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    };
  }
  if (parts.length === 3) {
    return {
      area: parts[0].replace(/-/g, " "),
      universidad: "",
      author: parts[1].replace(/-/g, " "),
      title: parts[2].replace(/-/g, " ").replace(/\s+/g, " ").trim()
    };
  }
  return {
    area: "",
    universidad: "",
    author: "",
    title: base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
  };
}

function pareceUniversidadArchivo_(s) {
  s = String(s || "").replace(/\s+/g, "");
  return /^(uccuyo|uccuyosl|uccuyosa|unsl|uncuyo|observatorioia|observatoria)$/i.test(s);
}

/**
 * Detecta lista de coautores en el cuerpo (p. ej. "C. Larrea Arnau¹, J. La Malfa, …").
 * Conserva el apellido del nombre de archivo y agrega "et al." si hay 2+.
 */
function documentoTieneVariosAutores_(fileId, mime) {
  mime = String(mime || "");
  var line = "";
  try {
    if (mime === "application/vnd.google-apps.document") {
      line = leerLineaAutoresGoogleDoc_(fileId);
    } else if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mime === "application/msword"
    ) {
      line = leerLineaAutoresWord_(fileId);
    }
  } catch (e) {
    return false;
  }
  return contarAutoresEnLinea_(line) >= 2;
}

function leerLineaAutoresWord_(fileId) {
  try {
    if (typeof Drive === "undefined" || !Drive.Files) return "";
    var copied = Drive.Files.copy(
      { title: "TMP · extract authors jornadas" },
      fileId,
      { convert: true }
    );
    if (!copied || !copied.id) return "";
    try {
      return leerLineaAutoresGoogleDoc_(copied.id);
    } finally {
      try {
        DriveApp.getFileById(copied.id).setTrashed(true);
      } catch (ignoreTrash) {}
    }
  } catch (e) {
    return "";
  }
}

function leerLineaAutoresGoogleDoc_(fileId) {
  var doc = DocumentApp.openById(fileId);
  var body = doc.getBody();
  var n = body.getNumChildren();
  var vioTitulo = false;
  for (var i = 0; i < Math.min(n, 24); i++) {
    var child = body.getChild(i);
    if (child.getType() !== DocumentApp.ElementType.PARAGRAPH) continue;
    var t = String(child.asParagraph().getText() || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!t) continue;
    if (!vioTitulo) {
      if (!esLineaNoTituloArticulo_(t) && t.length >= 20) {
        vioTitulo = true;
      }
      continue;
    }
    // Primera línea sustancial tras el título: suele ser autores
    if (esLineaAutoresArticulo_(t)) return t;
    if (/^Resumen$/i.test(t) || /^Abstract$/i.test(t) || /^Introducci[oó]n$/i.test(t)) {
      return "";
    }
  }
  return "";
}

function esLineaAutoresArticulo_(t) {
  t = String(t || "").replace(/\s+/g, " ").trim();
  if (!t || t.length < 8) return false;
  if (esLineaNoTituloArticulo_(t) && !/^[A-ZÁÉÍÓÚÑ]\.\s+/.test(t)) return false;
  // Inicial + apellido, o varios separados por coma / "y"
  if (/^[A-ZÁÉÍÓÚÑ]\.\s+[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(t)) return true;
  if (/,/.test(t) && /\b(y|and)\b/i.test(t)) return true;
  if ((t.match(/,/g) || []).length >= 1 && /[A-Za-zÁÉÍÓÚáéíóúñÑ]{2,}/.test(t)) {
    // "Apellido1, Apellido2" sin iniciales
    if (!/@/.test(t) && !/^Observatorio/i.test(t)) return true;
  }
  return false;
}

function contarAutoresEnLinea_(line) {
  var t = String(line || "")
    .replace(/[¹º²³⁰-⁹]/g, "")
    .replace(/\d+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return 0;
  // Separar por coma y por " y " / " and "
  var parts = t.split(/\s*,\s*|\s+y\s+|\s+and\s+/i).filter(function (p) {
    p = String(p || "").trim();
    if (!p || p.length < 2) return false;
    if (/^Observatorio/i.test(p)) return false;
    if (/Universidad/i.test(p)) return false;
    return true;
  });
  return parts.length;
}

function formatearAutorEtAl_(author) {
  var a = String(author || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!a) return a;
  if (/\bet\s*al\.?\s*$/i.test(a)) return a.replace(/\s*\bet\s*al\.?\s*$/i, "").trim() + " et al.";
  return a + " et al.";
}

function leerTituloDesdeArchivo_(fileId, mime) {
  mime = String(mime || "");
  if (mime === "application/vnd.google-apps.document") {
    return leerTituloGoogleDoc_(fileId);
  }
  // .docx / .doc: convertir a Google Doc temporal (servicio avanzado Drive)
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/msword"
  ) {
    return leerTituloWordConvirtiendo_(fileId);
  }
  return "";
}

/**
 * Convierte Word → Google Doc, lee el título del cuerpo y elimina la copia.
 * Requiere: Servicios → Drive API (avanzado) activado en el proyecto.
 */
function leerTituloWordConvirtiendo_(fileId) {
  try {
    if (typeof Drive === "undefined" || !Drive.Files) return "";
    var copied = Drive.Files.copy(
      { title: "TMP · extract title jornadas" },
      fileId,
      { convert: true }
    );
    if (!copied || !copied.id) return "";
    try {
      return leerTituloGoogleDoc_(copied.id);
    } finally {
      try {
        DriveApp.getFileById(copied.id).setTrashed(true);
      } catch (ignoreTrash) {}
    }
  } catch (e) {
    return "";
  }
}

function esLineaNoTituloArticulo_(t) {
  t = String(t || "").replace(/\s+/g, " ").trim();
  if (!t || t.length < 12) return true;
  if (esTituloBasuraCuerpo_(t)) return true;
  if (/^INSTRUCCIONES/i.test(t)) return true;
  if (/^Texto del artículo/i.test(t)) return true;
  if (/^N\.\s*Apellido/i.test(t)) return true;
  if (/^Resumen$/i.test(t)) return true;
  if (/^Abstract$/i.test(t)) return true;
  if (/^Palabras\s*clave/i.test(t)) return true;
  if (/^Keywords$/i.test(t)) return true;
  if (/@/.test(t)) return true;
  if (/artículo\s+científico/i.test(t) && t.length < 90) return true;
  if (/^\d+\s*Observatorio/i.test(t)) return true;
  if (/Observatorio de Inteligencia Artificial,\s*Universidad/i.test(t)) return true;
  if (/Universidad Católica de Cuyo,\s*Argentina/i.test(t) && t.length < 120) return true;
  // Lista de autores: "C. Larrea Arnau¹, B. Arias¹, … y S. Young¹"
  if (
    /^[A-ZÁÉÍÓÚÑ]\.\s+[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(t) &&
    (/[,;]/.test(t) || /[¹º]|\d/.test(t) || /\by\s+[A-ZÁÉÍÓÚÑ]\./.test(t))
  ) {
    return true;
  }
  return false;
}

function leerTituloGoogleDoc_(fileId) {
  var doc = DocumentApp.openById(fileId);
  var name = doc.getName();
  var body = doc.getBody();
  var n = body.getNumChildren();
  var candidatos = [];
  for (var i = 0; i < Math.min(n, 20); i++) {
    var child = body.getChild(i);
    if (child.getType() !== DocumentApp.ElementType.PARAGRAPH) continue;
    var p = child.asParagraph();
    var t = String(p.getText() || "").replace(/\s+/g, " ").trim();
    if (esLineaNoTituloArticulo_(t)) continue;
    if (esTituloBasuraCuerpo_(t)) continue;
    var attr = p.getHeading();
    var score = 50;
    if (
      attr === DocumentApp.ParagraphHeading.TITLE ||
      attr === DocumentApp.ParagraphHeading.HEADING1
    ) {
      score += 1000;
    } else if (attr === DocumentApp.ParagraphHeading.HEADING2) {
      score += 500;
    } else if (i <= 3) {
      score += 200;
    }
    // Títulos reales: compactos. Penalizar párrafos largos (abstracts).
    if (t.length >= 20 && t.length <= 120) score += 150;
    if (t.length > 120) score -= 400;
    if (t.length > 160) score -= 400;
    candidatos.push({ t: t, score: score });
  }
  candidatos.sort(function (a, b) {
    return b.score - a.score;
  });
  if (candidatos.length) return candidatos[0].t;
  var parsed = parseNombreSugerido_(name);
  return parsed.title || name;
}

function leerTituloGoogleSlides_(fileId) {
  var pres = SlidesApp.openById(fileId);
  var name = pres.getName();
  try {
    var slides = pres.getSlides();
    if (slides && slides.length) {
      var shapes = slides[0].getShapes();
      var candidatos = [];
      for (var i = 0; i < shapes.length; i++) {
        if (!shapes[i].getText) continue;
        var raw = String(shapes[i].getText().asString() || "").trim();
        var lineas = raw.split(/\n+/);
        for (var L = 0; L < lineas.length; L++) {
          var t = String(lineas[L] || "").replace(/\s+/g, " ").trim();
          if (!t || t.length < 8 || t.length > 120) continue;
          if (esTituloInstitucionalBoilerplate_(t) || esTituloBasuraCuerpo_(t)) continue;
          if (esTituloPieDiapositiva_(t)) continue;
          var score = 40;
          if (L === 0) score += 30;
          if (i <= 2) score += 20;
          if (t.length >= 15 && t.length <= 90) score += 40;
          if (/\bIA\b|inteligencia|alerta|estudiantes|contabilidad|veterinar/i.test(t)) {
            score += 25;
          }
          candidatos.push({ t: t, score: score });
        }
      }
      candidatos.sort(function (a, b) {
        return b.score - a.score;
      });
      if (candidatos.length) return candidatos[0].t;
    }
  } catch (ignore) {}
  var parsed = parseNombreSugerido_(name);
  return parsed.title || name;
}

/** Pie / cabecera de diapositiva (URL, “Diapositiva N”, marca UCCuyo). */
function esTituloPieDiapositiva_(t) {
  var s = String(t || "").replace(/\s+/g, " ").trim();
  if (!s) return true;
  if (/diapositiva\s*\d/i.test(s)) return true;
  if (/github\.io/i.test(s)) return true;
  if (/observatorio[- ]?ia\.uccuyo/i.test(s)) return true;
  if (/claudiomlarrea\.github/i.test(s)) return true;
  if (/^https?:\/\//i.test(s)) return true;
  if (/#jornadas/i.test(s)) return true;
  if (/uc\s*cuyo/i.test(s) && /observatorio/i.test(s)) return true;
  if (/^universidad\s+cat/i.test(s)) return true;
  return false;
}

/**
 * Portadas de PPT/Docs institucionales: no sirven como título de catálogo.
 */
function esTituloInstitucionalBoilerplate_(t) {
  var s = String(t || "").replace(/\s+/g, " ").trim();
  if (!s) return true;
  if (/^universidad\s+cat[oó]lica\s+de\s+cuyo/i.test(s)) return true;
  if (/observatorio\s+de\s+(inteligencia\s+artificial|ia)\b/i.test(s) && s.length < 80) {
    return true;
  }
  if (/^uccuyo\b/i.test(s) && s.length < 40) return true;
  // Portada del evento (no es título de la ponencia)
  if (/jornadas\s+internas\s+de\s+inteligencia\s+artificial/i.test(s)) return true;
  if (/^\d+[\.º°]?\s*jornadas\b/i.test(s)) return true;
  return false;
}

/**
 * Abstract / primer párrafo del cuerpo colado como “título”.
 */
function esTituloBasuraCuerpo_(t) {
  var s = String(t || "").replace(/\s+/g, " ").trim();
  if (!s) return true;
  if (s.length > 140) return true;
  if (/https?:\/\//i.test(s)) return true;
  if (/www\./i.test(s)) return true;
  if (/diapositiva\s*\d/i.test(s)) return true;
  if (/\/\s*\d+\s*$/.test(s) && /diapositiva|slide/i.test(s)) return true;
  if (/github\.io/i.test(s)) return true;
  if (/#jornadas/i.test(s)) return true;
  if (/claudiomlarrea/i.test(s)) return true;
  if (esTituloPieDiapositiva_(s)) return true;
  // Pie concatenado: "Observatorio de IA - UC Cuyo - …"
  if (/observatorio de ia\b/i.test(s) && /uc\s*cuyo/i.test(s)) return true;
  if (/observatorio de ia\s*[-–—]/i.test(s) && /jornadas/i.test(s)) return true;
  // Nombre de archivo versionado colado como título
  if (/\bjornadas\s*2026\b/i.test(s) && /\bv\s*\d+\b/i.test(s)) return true;
  if (/^(el|la|los|las|este|esta|estos|estas|en)\s+/i.test(s) && s.length > 80) {
    return true;
  }
  if (/^el objetivo\b/i.test(s)) return true;
  if (/^este trabajo\b/i.test(s)) return true;
  if (/^la presente\b/i.test(s)) return true;
  if (/^en (este|el presente)\b/i.test(s)) return true;
  if (/^el prop[oó]sito\b/i.test(s)) return true;
  if (/^se presenta\b/i.test(s)) return true;
  if (/arquitectura\b/i.test(s) && /objetivo|trabajo|presentar/i.test(s)) return true;
  if ((s.match(/,/g) || []).length >= 3 && s.length > 100) return true;
  return false;
}

/** Título débil típico de nombre de archivo PPT (mejor usar el del artículo). */
function esTituloDebilCatalogo_(t) {
  var s = String(t || "").replace(/\s+/g, " ").trim();
  if (!s || s.length < 8) return true;
  if (esTituloBasuraCuerpo_(s) || esTituloInstitucionalBoilerplate_(s)) return true;
  if (/\bv\s*\d+\b/i.test(s)) return true;
  if (/\bjornadas\s*2026\b/i.test(s)) return true;
  if (/jornadas\s+internas/i.test(s)) return true;
  if (/_v\d+/i.test(s)) return true;
  return false;
}

function humanizarTituloCatalogo_(s) {
  s = String(s || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return s;
  // Tokens ASCII (evitar § … que a veces quedan literales en el PDF)
  var protect = [
    [/Py\s*M\s*Es/gi, "{{pymes}}"],
    [/PyMEs/gi, "{{pymes}}"],
    [/PYMES/g, "{{pymes}}"],
    [/Pymes/g, "{{pymes}}"],
    [/GEMEPH/gi, "{{gemeph}}"],
    [/\bIA\b/g, "{{ia}}"]
  ];
  var i;
  for (i = 0; i < protect.length; i++) {
    s = s.replace(protect[i][0], protect[i][1]);
  }
  s = s.replace(/([a-zà-ÿ0-9])([A-ZÁÉÍÓÚÑ])/g, "$1 $2");
  s = s.replace(/([A-ZÁÉÍÓÚÑ]+)([A-ZÁÉÍÓÚÑ][a-zà-ÿ])/g, "$1 $2");
  s = s
    .replace(/\{\{pymes\}\}/g, "PyMEs")
    .replace(/\{\{gemeph\}\}/g, "GEMEPH")
    .replace(/\{\{ia\}\}/g, "IA");
  return limpiarResiduosTituloCatalogo_(s);
}

/** MARKER_CATALOGOS_PYMES_20260908 — buscá este texto en Código.gs para verificar el pegado */
function limpiarResiduosTituloCatalogo_(s) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  // Quitar extensión de archivo pegada al título (…abogacia.docx)
  s = s.replace(
    /\.(docx?|pptx?|pdf|odt|odp|rtf|xlsx?|csv|zip)(\s|$)/gi,
    "$2"
  );
  s = s.replace(/\s+/g, " ").trim();
  // "I Ay …" / "IAy …" → "IA y …"
  s = s.replace(/\bI\s*Ay\b/gi, "IA y");
  s = s.replace(/\bIAy\b/g, "IA y");
  s = s.replace(/§\s*PyMEs\s*§/gi, "PyMEs");
  s = s.replace(/§\s*pymes\s*§/gi, "PyMEs");
  s = s.replace(/§\s*PYM\s*Es\s*§/gi, "PyMEs");
  s = s.replace(/§/g, "");
  s = s.replace(/\{\{pymes\}\}/gi, "PyMEs");
  s = s.replace(/\{\{gemeph\}\}/gi, "GEMEPH");
  s = s.replace(/\{\{ia\}\}/gi, "IA");
  s = s.replace(/\bPy\s+M\s+Es\b/gi, "PyMEs");
  s = s.replace(/\bPYM\s+Es\b/g, "PyMEs");
  // Ortografía frecuente en nombres de archivo
  s = s.replace(/\babogacia\b/gi, "abogacía");
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Pasada final: títulos limpios + PPT débil/portada toma el del artículo.
 */
function sanearEntradasCatalogo_(arts, ppts) {
  arts = arts || [];
  ppts = ppts || [];
  var i;
  for (i = 0; i < arts.length; i++) {
    arts[i].title = limpiarResiduosTituloCatalogo_(humanizarTituloCatalogo_(arts[i].title || ""));
    arts[i].author = limpiarAutorCatalogo_(arts[i].author || "") || arts[i].author;
  }
  for (i = 0; i < ppts.length; i++) {
    var p = ppts[i];
    p.title = limpiarResiduosTituloCatalogo_(humanizarTituloCatalogo_(p.title || ""));
    p.author = limpiarAutorCatalogo_(p.author || "") || p.author || "";
    if (
      !esTituloDebilCatalogo_(p.title) &&
      !esTituloInstitucionalBoilerplate_(p.title) &&
      !esTituloBasuraCuerpo_(p.title)
    ) {
      continue;
    }
    var best = buscarArticuloParaPresentacion_(arts, p);
    if (best) {
      p.title = best.title;
      if (!p.author) p.author = best.author;
      if (!p.area && best.area) p.area = best.area;
    } else {
      var meta = parseNombreSugerido_(p.fileName || "");
      var alt = limpiarResiduosTituloCatalogo_(humanizarTituloCatalogo_(meta.title || ""));
      if (alt && !esTituloDebilCatalogo_(alt) && !esTituloInstitucionalBoilerplate_(alt)) {
        p.title = alt;
      }
      if (!p.author && meta.author) {
        p.author = limpiarAutorCatalogo_(meta.author) || "";
      }
    }
  }
}

function buscarArticuloParaPresentacion_(arts, p) {
  var best = null;
  var bestScore = 0;
  var autorP =
    normalizarClaveAutorCatalogo_(p.author || "") ||
    normalizarClaveAutorCatalogo_(parseNombreSugerido_(p.fileName || "").author || "");
  var j;
  for (j = 0; j < arts.length; j++) {
    var a = arts[j];
    var score = puntajeSimilitudTitulo_(p.title, a.title);
    score += puntajeSimilitudTitulo_(p.fileName, a.fileName);
    score += puntajeSimilitudTitulo_(p.fileName, a.author + " " + a.title);
    var autorA = normalizarClaveAutorCatalogo_(a.author || "");
    if (autorP && autorA && (autorP === autorA || autorP.indexOf(autorA) >= 0 || autorA.indexOf(autorP) >= 0)) {
      score += 8;
    }
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return bestScore >= 2 ? best : null;
}

function limpiarAutorCatalogo_(author) {
  var a = String(author || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!a) return "";
  // Prefijo del template Area_Universidad_Apellido…
  a = a.replace(/^UCCuyo\s+/i, "").replace(/^Uccuyosl\s+/i, "");
  a = a.replace(/,/g, ", ").replace(/\s+/g, " ").trim();
  var stop =
    /^(uso|sistema|gemelo|digital|ia|ppt|pptx|doc|docx|pdf|v\d+|jornadas\d*|presentaci[oó]n|art[ií]culo|plantilla|observatorio|observatoria)$/i;
  if (stop.test(a.replace(/\s+/g, ""))) return "";
  return a;
}

/**
 * Misma ponencia subida varias veces (p. ej. Castillo ×3) → una sola entrada.
 * Clave: título + autor normalizados. Conserva el más reciente si hay fechas.
 */
function deduplicarEntradasCatalogo_(list) {
  list = list || [];
  var byKey = {};
  var order = [];
  var i;
  for (i = 0; i < list.length; i++) {
    var it = list[i] || {};
    var key =
      normalizarClaveDedupCatalogo_(it.title) +
      "|" +
      normalizarClaveDedupCatalogo_(it.author);
    if (!key || key === "|") {
      order.push(it);
      continue;
    }
    var prev = byKey[key];
    if (!prev) {
      byKey[key] = it;
      order.push({ __key: key });
      continue;
    }
    var prevTs = Date.parse(prev.updated || "") || 0;
    var nextTs = Date.parse(it.updated || "") || 0;
    if (nextTs >= prevTs) byKey[key] = it;
  }
  var out = [];
  for (i = 0; i < order.length; i++) {
    if (order[i].__key) out.push(byKey[order[i].__key]);
    else out.push(order[i]);
  }
  return out;
}

function normalizarClaveDedupCatalogo_(s) {
  s = String(s || "").toLowerCase();
  try {
    if (typeof s.normalize === "function") {
      s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
  } catch (ignoreNorm) {}
  return s.replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizarAreaCatalogo_(area) {
  var a = humanizarTituloCatalogo_(area);
  a = normalizarTituloCatalogo_(a);
  if (/observator/i.test(a)) return "Observatorio de IA";
  if (/^investig/i.test(a)) return "Investigación";
  if (/veterinar/i.test(a)) return "Veterinaria";
  if (/contabil/i.test(a) || /econom/i.test(a)) return a;
  return a;
}

/**
 * Si una presentación quedó sin autor usable, copiar el del artículo
 * más parecido (mismo tema / tokens de título).
 */
function emparejarAutoresEntreCatalogos_(arts, ppts) {
  arts = arts || [];
  ppts = ppts || [];
  var i;
  for (i = 0; i < ppts.length; i++) {
    var p = ppts[i];
    var autorOk = p.author && limpiarAutorCatalogo_(p.author);
    if (!autorOk) p.author = "";
    var best = null;
    var bestScore = 0;
    var j;
    for (j = 0; j < arts.length; j++) {
      var a = arts[j];
      if (!a.author) continue;
      var score = puntajeSimilitudTitulo_(p.title, a.title);
      score += puntajeSimilitudTitulo_(p.fileName, a.fileName) * 0.5;
      score += puntajeSimilitudTitulo_(p.fileName, a.author + " " + a.title);
      if (p.area && a.area && normalizarClaveSuave_(p.area) === normalizarClaveSuave_(a.area)) {
        score += 2;
      }
      if (
        autorOk &&
        normalizarClaveAutorCatalogo_(p.author) === normalizarClaveAutorCatalogo_(a.author)
      ) {
        score += 6;
      }
      if (
        !autorOk &&
        normalizarClaveAutorCatalogo_(parseNombreSugerido_(p.fileName || "").author) ===
          normalizarClaveAutorCatalogo_(a.author)
      ) {
        score += 5;
      }
      if (score > bestScore) {
        bestScore = score;
        best = a;
      }
    }
    if (best && bestScore >= 2) {
      if (!autorOk) p.author = best.author;
      if (!p.area && best.area) p.area = best.area;
      if (
        esTituloDebilCatalogo_(p.title) ||
        esTituloBasuraCuerpo_(p.title) ||
        esTituloInstitucionalBoilerplate_(p.title)
      ) {
        p.title = best.title;
      }
    } else if (esTituloDebilCatalogo_(p.title) || esTituloInstitucionalBoilerplate_(p.title)) {
      var meta = parseNombreSugerido_(p.fileName || "");
      if (meta.title && !esTituloDebilCatalogo_(meta.title) && !esTituloInstitucionalBoilerplate_(meta.title)) {
        p.title = humanizarTituloCatalogo_(meta.title);
      }
    }
    // Última pasada: nunca dejar placeholder raro ni título de portada del evento
    p.title = humanizarTituloCatalogo_(p.title || "");
  }
}

function normalizarClaveAutorCatalogo_(s) {
  return normalizarClaveSuave_(s)
    .replace(/\bet\s+al\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarClaveSuave_(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function puntajeSimilitudTitulo_(a, b) {
  var ta = normalizarClaveSuave_(a).split(/\s+/).filter(Boolean);
  var tb = normalizarClaveSuave_(b).split(/\s+/).filter(Boolean);
  if (!ta.length || !tb.length) return 0;
  var set = {};
  var i;
  for (i = 0; i < tb.length; i++) set[tb[i]] = true;
  var hit = 0;
  for (i = 0; i < ta.length; i++) {
    if (ta[i].length < 3) continue;
    if (set[ta[i]]) hit++;
  }
  return hit;
}

/**
 * Si el título viene casi todo en MAYÚSCULAS (típico de diapositiva o nombre
 * de archivo), lo pasa a mayúsculas iniciales para que el PDF no “cambie” de
 * tipografía respecto de ítems en minúsculas/mixtas.
 * También normaliza palabras SUELTAS en MAYÚSCULAS dentro de un título mixto.
 */
function esMayusculasDominante_(s) {
  var letters = String(s || "").replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
  if (letters.length < 4) return false;
  var up = 0;
  for (var i = 0; i < letters.length; i++) {
    var ch = letters.charAt(i);
    if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) up++;
  }
  return up / letters.length >= 0.75;
}

function palabraTodoMayusculas_(w) {
  var letters = String(w || "").replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
  if (letters.length < 2) return false;
  for (var i = 0; i < letters.length; i++) {
    var ch = letters.charAt(i);
    if (ch !== ch.toUpperCase() || ch === ch.toLowerCase()) return false;
  }
  return true;
}

function normalizarTituloCatalogo_(s) {
  s = String(s || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return s;
  // Unificar guiones tipográficos (evitan rarezas al exportar PDF)
  s = s.replace(/[—–−]/g, "-").replace(/[·•]/g, "-");

  var small = {
    de: 1,
    del: 1,
    la: 1,
    las: 1,
    el: 1,
    los: 1,
    y: 1,
    e: 1,
    o: 1,
    u: 1,
    en: 1,
    a: 1,
    al: 1,
    por: 1,
    para: 1,
    con: 1,
    un: 1,
    una: 1,
    unos: 1,
    unas: 1
  };

  function capitalizarPalabra(word, isFirst, preserveAcronym) {
    var bare = word.replace(/[.,;:!?»«"'”]+$/g, "");
    var trail = word.slice(bare.length);
    var letters = bare.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
    // Siglas cortas (IA, EPH, GEMEPH…): no pasar a “Ia” / “Gemeph”
    if (preserveAcronym && palabraTodoMayusculas_(bare) && letters.length >= 2 && letters.length <= 8) {
      return bare + trail;
    }
    var low = bare.toLocaleLowerCase("es-AR");
    if (!isFirst && small[low]) return low + trail;
    if (!bare) return word;
    return low.charAt(0).toLocaleUpperCase("es-AR") + low.slice(1) + trail;
  }

  if (esMayusculasDominante_(s)) {
    var parts = s.toLocaleLowerCase("es-AR").split(/(\s+|[-/:(])/);
    var out = [];
    var firstWord = true;
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (!part || /^(\s+|[-/:(])$/.test(part)) {
        out.push(part);
        continue;
      }
      out.push(capitalizarPalabra(part, firstWord, false));
      firstWord = false;
    }
    return out.join("");
  }

  // Título mixto: solo corregir tokens 100% MAYÚSCULAS largos de frase;
  // preservar siglas cortas (GEMEPH, IA, EPH…).
  return s.replace(/[^\s\-—·\/:(]+/g, function (word, offset) {
    if (!palabraTodoMayusculas_(word)) return word;
    var letters = word.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
    if (letters.length <= 8) return word; // sigla
    return capitalizarPalabra(word, offset === 0, false);
  });
}

/** Fuerza la misma familia/tamaño en todo el catálogo (evita saltos al exportar PDF). */
function estiloCatalogo_(p, sizePt, opt) {
  opt = opt || {};
  // Google Docs suele marcar el 1.er ítem como Heading/Title (serif distinta).
  p.setHeading(DocumentApp.ParagraphHeading.NORMAL);
  p.setFontFamily("Arial");
  p.setFontSize(sizePt);
  p.setBold(!!opt.bold);
  if (opt.color) p.setForegroundColor(opt.color);
  if (opt.align) p.setAlignment(opt.align);
  if (opt.spacingAfter != null) p.setSpacingAfter(opt.spacingAfter);

  // Atributos a nivel de run de texto: el export PDF a veces ignora el del párrafo.
  try {
    var text = p.editAsText();
    var n = text.getText().length;
    if (n > 0) {
      text.setFontFamily(0, n - 1, "Arial");
      text.setFontSize(0, n - 1, sizePt);
      text.setBold(0, n - 1, !!opt.bold);
      if (opt.color) text.setForegroundColor(0, n - 1, opt.color);
    }
  } catch (ignoreText) {}
  return p;
}

/** Recorre el cuerpo y vuelve a fijar Arial + NORMAL en cada párrafo. */
function forzarTipografiaCatalogo_(body) {
  var n = body.getNumChildren();
  for (var i = 0; i < n; i++) {
    var child = body.getChild(i);
    if (child.getType() !== DocumentApp.ElementType.PARAGRAPH) continue;
    var p = child.asParagraph();
    p.setHeading(DocumentApp.ParagraphHeading.NORMAL);
    try {
      var text = p.editAsText();
      var len = text.getText().length;
      if (len > 0) {
        var size = p.getFontSize() || 11;
        text.setFontFamily(0, len - 1, "Arial");
        text.setFontSize(0, len - 1, size);
      }
    } catch (ignore) {}
  }
}

function escribirCatalogoPdf_(folder, fileName, titulo, subtitulo, items, labelPlural) {
  // Borrar PDF previo con el mismo nombre en la carpeta de catálogos
  var existing = folder.getFilesByName(fileName);
  while (existing.hasNext()) {
    existing.next().setTrashed(true);
  }

  var doc = DocumentApp.create("TMP · " + fileName.replace(/\.pdf$/i, ""));
  var body = doc.getBody();
  body.clear();

  // Estilo base NORMAL (evita Title/Heading del documento nuevo)
  var baseAttrs = {};
  baseAttrs[DocumentApp.Attribute.FONT_FAMILY] = "Arial";
  baseAttrs[DocumentApp.Attribute.FONT_SIZE] = 11;
  baseAttrs[DocumentApp.Attribute.BOLD] = false;
  baseAttrs[DocumentApp.Attribute.HEADING] = DocumentApp.ParagraphHeading.NORMAL;
  body.setAttributes(baseAttrs);
  body.setFontFamily("Arial");
  body.setFontSize(11);

  var center = DocumentApp.HorizontalAlignment.CENTER;

  estiloCatalogo_(body.appendParagraph("UNIVERSIDAD CATÓLICA DE CUYO"), 12, {
    bold: true,
    align: center,
    spacingAfter: 2
  });

  estiloCatalogo_(body.appendParagraph("Observatorio de Inteligencia Artificial"), 11, {
    align: center,
    spacingAfter: 8
  });

  // Título del catálogo: mismo sans-serif, un poco más grande (NO Heading)
  estiloCatalogo_(body.appendParagraph(titulo), 14, {
    bold: true,
    align: center,
    spacingAfter: 4
  });

  estiloCatalogo_(body.appendParagraph(subtitulo), 11, {
    align: center,
    spacingAfter: 4
  });

  estiloCatalogo_(
    body.appendParagraph(
      "Actualizado: " +
        Utilities.formatDate(new Date(), "America/Argentina/Buenos_Aires", "dd/MM/yyyy HH:mm") +
        " (Argentina) · " +
        items.length +
        " " +
        labelPlural +
        " · Orden del programa"
    ),
    9,
    { align: center, color: "#555555", spacingAfter: 12 }
  );

  if (!items.length) {
    estiloCatalogo_(
      body.appendParagraph(
        "Todavía no hay ponencias en el programa. " +
          "Este catálogo se arma desde el programa oficial (misma fuente que el sitio)."
      ),
      11,
      {}
    );
  } else {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var tituloItem = String(it.title || "").replace(/\s+/g, " ").trim();
      var autorItem = String(it.author || "").replace(/\s+/g, " ").trim();
      var areaItem = String(it.area || "").replace(/\s+/g, " ").trim();
      var horaItem = String(it.hora || "").trim();
      var horaFinItem = String(it.horaFin || "").trim();
      // Orden del programa; opcional franja horaria.
      var line = i + 1 + ". ";
      if (horaItem) {
        line += horaItem + (horaFinItem ? "–" + horaFinItem : "") + " · ";
      }
      line += tituloItem;
      if (autorItem) line += " — " + autorItem;
      if (areaItem) line += " (" + areaItem + ")";
      if (it.sinArchivo) {
        line +=
          labelPlural && String(labelPlural).indexOf("present") >= 0
            ? " · sin PowerPoint en Drive"
            : " · sin artículo en Drive";
      }
      estiloCatalogo_(body.appendParagraph(line), 11, {
        bold: true,
        spacingAfter: 10
      });
    }
  }

  estiloCatalogo_(
    body.appendParagraph(
      "Generado automáticamente por el Observatorio de IA · UCCuyo · observatorioia@uccuyo.edu.ar"
    ),
    9,
    { color: "#666666", spacingAfter: 0 }
  );

  forzarTipografiaCatalogo_(body);
  doc.saveAndClose();

  var pdfBlob = exportDocAsPdf_(doc.getId(), fileName);
  var pdfFile = folder.createFile(pdfBlob);
  pdfFile.setName(fileName);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Eliminar Doc temporal
  try {
    DriveApp.getFileById(doc.getId()).setTrashed(true);
  } catch (ignoreTrash) {}

  return pdfFile;
}

function exportDocAsPdf_(docId, fileName) {
  var url = "https://docs.google.com/document/d/" + docId + "/export?format=pdf";
  var token = ScriptApp.getOAuthToken();
  var resp = UrlFetchApp.fetch(url, {
    headers: { Authorization: "Bearer " + token },
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() >= 300) {
    throw new Error("No se pudo exportar PDF (" + resp.getResponseCode() + ")");
  }
  return resp.getBlob().setName(fileName);
}
