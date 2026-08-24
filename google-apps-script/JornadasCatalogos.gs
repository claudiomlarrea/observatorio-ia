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

  return {
    ok: true,
    updatedAt: updatedAt,
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
          "https://observatorio-ia.uccuyo.edu.ar/docs/jornadas/" +
          CATALOGO_ARTICULOS_NAME
      },
      presentaciones: {
        count: Number(props.getProperty("jornadas_catalogo_presentaciones_n") || 0),
        pdfId: pptId || "",
        pdfUrl: pptId ? "https://drive.google.com/file/d/" + pptId + "/view" : "",
        downloadUrl:
          "https://observatorio-ia.uccuyo.edu.ar/docs/jornadas/" +
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
    "https://observatorio-ia.uccuyo.edu.ar/docs/jornadas/" + safeName;

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
    if (mime === "application/vnd.google-apps.document") {
      try {
        var docTitle = leerTituloGoogleDoc_(f.getId());
        if (docTitle) title = docTitle;
      } catch (ignoreDoc) {}
    }
    if (mime === "application/vnd.google-apps.presentation") {
      try {
        var slidesTitle = leerTituloGoogleSlides_(f.getId());
        if (slidesTitle) title = slidesTitle;
      } catch (ignoreSlides) {}
    }

    out.push({
      title: title || name,
      author: meta.author || "",
      area: meta.area || "",
      universidad: meta.universidad || "",
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

function leerTituloGoogleDoc_(fileId) {
  var doc = DocumentApp.openById(fileId);
  var name = doc.getName();
  var body = doc.getBody();
  // Buscar primer párrafo con estilo Heading o texto sustancial
  var n = body.getNumChildren();
  for (var i = 0; i < Math.min(n, 12); i++) {
    var child = body.getChild(i);
    if (child.getType() !== DocumentApp.ElementType.PARAGRAPH) continue;
    var p = child.asParagraph();
    var t = String(p.getText() || "").trim();
    if (!t || t.length < 8) continue;
    var attr = p.getHeading();
    if (
      attr === DocumentApp.ParagraphHeading.TITLE ||
      attr === DocumentApp.ParagraphHeading.HEADING1 ||
      attr === DocumentApp.ParagraphHeading.HEADING2 ||
      i <= 2
    ) {
      // Evitar líneas de instrucciones de plantilla
      if (/^INSTRUCCIONES/i.test(t)) continue;
      if (/^Texto del artículo/i.test(t)) continue;
      if (/^N\.\s*Apellido/i.test(t)) continue;
      return t;
    }
  }
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

function escribirCatalogoPdf_(folder, fileName, titulo, subtitulo, items, labelPlural) {
  // Borrar PDF previo con el mismo nombre en la carpeta de catálogos
  var existing = folder.getFilesByName(fileName);
  while (existing.hasNext()) {
    existing.next().setTrashed(true);
  }

  var doc = DocumentApp.create("TMP · " + fileName.replace(/\.pdf$/i, ""));
  var body = doc.getBody();
  body.clear();

  var h = body.appendParagraph("UNIVERSIDAD CATÓLICA DE CUYO");
  h.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  h.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  var h2 = body.appendParagraph("Observatorio de Inteligencia Artificial");
  h2.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  var h3 = body.appendParagraph(titulo);
  h3.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  h3.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  var sub = body.appendParagraph(subtitulo);
  sub.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  var meta = body.appendParagraph(
    "Actualizado: " +
      Utilities.formatDate(new Date(), "America/Argentina/Buenos_Aires", "dd/MM/yyyy HH:mm") +
      " (Argentina) · " +
      items.length +
      " " +
      labelPlural +
      " · Orden alfabético por título"
  );
  meta.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  body.appendParagraph("");

  if (!items.length) {
    body.appendParagraph(
      "Todavía no hay archivos cargados en la carpeta correspondiente. " +
        "Este catálogo se actualizará automáticamente cuando se suban nuevos trabajos."
    );
  } else {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var line = i + 1 + ". " + it.title;
      if (it.author) line += " — " + it.author;
      if (it.area) line += " (" + it.area + ")";
      var p = body.appendParagraph(line);
      p.setSpacingAfter(6);
      if (it.fileName && it.fileName !== it.title) {
        var fn = body.appendParagraph("    Archivo: " + it.fileName);
        fn.setForegroundColor("#555555");
        fn.setFontSize(9);
      }
    }
  }

  body.appendParagraph("");
  var foot = body.appendParagraph(
    "Generado automáticamente por el Observatorio de IA · UCCuyo · observatorioia@uccuyo.edu.ar"
  );
  foot.setFontSize(9);
  foot.setForegroundColor("#666666");

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
