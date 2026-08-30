/**
 * Catálogos automáticos — 1° Jornadas internas de IA 2026
 * Observatorio de Inteligencia Artificial · UCCuyo
 *
 * Lee las carpetas Drive de artículos y presentaciones, extrae títulos
 * (desde el nombre sugerido Area_Universidad_Apellido_Titulo o el título del Doc)
 * y regenera dos PDF ordenados alfabéticamente.
 *
 * Carpetas fuente:
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
  var ppts = listarEntradas_(JORNADAS_PRESENTACIONES_FOLDER_ID, PRESENTACIONES_MIME_OK, "presentacion");

  arts.sort(function (a, b) {
    return String(a.title).localeCompare(String(b.title), "es", { sensitivity: "base" });
  });
  ppts.sort(function (a, b) {
    return String(a.title).localeCompare(String(b.title), "es", { sensitivity: "base" });
  });

  var outFolder = getCatalogosFolder_();
  var pdfArts = escribirCatalogoPdf_(
    outFolder,
    CATALOGO_ARTICULOS_NAME,
    "Catálogo de artículos científicos",
    "1° Jornadas internas de Inteligencia Artificial 2026",
    arts,
    "artículos"
  );
  var pdfPpts = escribirCatalogoPdf_(
    outFolder,
    CATALOGO_PRESENTACIONES_NAME,
    "Catálogo de presentaciones PowerPoint",
    "1° Jornadas internas de Inteligencia Artificial 2026",
    ppts,
    "presentaciones"
  );

  var props = PropertiesService.getScriptProperties();
  var updatedAt = new Date().toISOString();
  props.setProperty("jornadas_catalogo_articulos_id", pdfArts.getId());
  props.setProperty("jornadas_catalogo_presentaciones_id", pdfPpts.getId());
  props.setProperty("jornadas_catalogo_updated_at", updatedAt);
  props.setProperty("jornadas_catalogo_articulos_n", String(arts.length));
  props.setProperty("jornadas_catalogo_presentaciones_n", String(ppts.length));

  // Avisos a Investigación (no Observatorio). Ver JornadasNotificaciones.gs
  var notify = null;
  try {
    if (typeof notificarNuevasCargasDriveJornadas_ === "function") {
      notify = notificarNuevasCargasDriveJornadas_(arts, ppts);
    }
  } catch (errNotify) {
    notify = { ok: false, error: String(errNotify) };
  }

  return {
    ok: true,
    updatedAt: updatedAt,
    notify: notify,
    articulos: {
      count: arts.length,
      pdfId: pdfArts.getId(),
      pdfUrl: pdfArts.getUrl(),
      items: arts
    },
    presentaciones: {
      count: ppts.length,
      pdfId: pdfPpts.getId(),
      pdfUrl: pdfPpts.getUrl(),
      items: ppts
    }
  };
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
    var payload = {
      ok: true,
      updatedAt: props.getProperty("jornadas_catalogo_updated_at") || "",
      articulos: {
        count: Number(props.getProperty("jornadas_catalogo_articulos_n") || 0),
        pdfId: artId || "",
        pdfUrl: artId ? "https://drive.google.com/file/d/" + artId + "/view" : "",
        downloadUrl:
          "https://observatorio-ia.uccuyo.edu.ar/assets/jornadas/" +
          CATALOGO_ARTICULOS_NAME
      },
      presentaciones: {
        count: Number(props.getProperty("jornadas_catalogo_presentaciones_n") || 0),
        pdfId: pptId || "",
        pdfUrl: pptId ? "https://drive.google.com/file/d/" + pptId + "/view" : "",
        downloadUrl:
          "https://observatorio-ia.uccuyo.edu.ar/assets/jornadas/" +
          CATALOGO_PRESENTACIONES_NAME
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
    var title = meta.title;
    var author = meta.author || "";
    try {
      var docTitle = leerTituloDesdeArchivo_(f.getId(), mime);
      if (docTitle && !esTituloInstitucionalBoilerplate_(docTitle)) {
        title = docTitle;
      }
    } catch (ignoreDoc) {}
    if (mime === "application/vnd.google-apps.presentation") {
      try {
        var slidesTitle = leerTituloGoogleSlides_(f.getId());
        // Portada institucional ≠ título de la ponencia: preferir nombre de archivo
        if (slidesTitle && !esTituloInstitucionalBoilerplate_(slidesTitle)) {
          title = slidesTitle;
        }
      } catch (ignoreSlides) {}
    }
    // Si el título quedó vacío o es basura de portada, usar el del nombre sugerido
    if (!title || esTituloInstitucionalBoilerplate_(title)) {
      title = meta.title || name;
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
      area: normalizarTituloCatalogo_(meta.area || ""),
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
  var parts = base.split("_").filter(function (p) {
    return p && String(p).trim();
  });
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
    var attr = p.getHeading();
    var score = t.length;
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
    // Preferir títulos descriptivos (más de ~40 caracteres)
    if (t.length >= 40) score += 150;
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
      for (var i = 0; i < shapes.length; i++) {
        if (!shapes[i].getText) continue;
        var t = String(shapes[i].getText().asString() || "").trim();
        if (t && t.length >= 6) return t.split("\n")[0].trim();
      }
    }
  } catch (ignore) {}
  var parsed = parseNombreSugerido_(name);
  return parsed.title || name;
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
  return false;
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
        " · Orden alfabético por título"
    ),
    9,
    { align: center, color: "#555555", spacingAfter: 12 }
  );

  if (!items.length) {
    estiloCatalogo_(
      body.appendParagraph(
        "Todavía no hay archivos cargados en la carpeta correspondiente. " +
          "Este catálogo se actualizará automáticamente cuando se suban nuevos trabajos."
      ),
      11,
      {}
    );
  } else {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var line = i + 1 + ". " + it.title;
      if (it.author) line += " — " + it.author;
      if (it.area) line += " (" + it.area + ")";
      // Todos los ítems (incluido el 1.º) con el mismo estilo
      estiloCatalogo_(body.appendParagraph(line), 11, {
        bold: true,
        spacingAfter: 2
      });
      if (it.fileName && it.fileName !== it.title) {
        estiloCatalogo_(body.appendParagraph("    Archivo: " + it.fileName), 9, {
          color: "#555555",
          spacingAfter: 10
        });
      }
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
