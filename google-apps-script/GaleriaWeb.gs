/**
 * Galería de imágenes OIA — listado público + panel equipo (misma whitelist).
 *
 * Endpoints (vía doGet/doPost de PublicacionesWeb.gs):
 * - GET  ?action=galeria       → JSON público de álbumes
 * - GET  ?action=galeria_admin → panel HTML (solo AUTHORIZED_EMAILS)
 *
 * Guardado: google.script.run → saveGaleriaAlbumAdmin_(payload)
 *
 * Hoja "Galeria" en la misma planilla SPREADSHEET_ID:
 * id | titulo | descripcion | fotos | fecha | estado | creado_por | creado_en
 * fotos = IDs de Drive separados por coma o salto de línea.
 */
var HOJA_GALERIA = "Galeria";
var GALERIA_HEADERS = [
  "id",
  "titulo",
  "descripcion",
  "fotos",
  "fecha",
  "estado",
  "creado_por",
  "creado_en"
];

function routeGaleriaGet_(e) {
  var action = param_(e, "action", "");
  if (action === "galeria") {
    return jsonOrJsonp_(obtenerAlbumesGaleriaPublicos_(), e);
  }
  if (action === "galeria_admin") {
    return renderGaleriaAdmin_(e);
  }
  return null;
}

function getGaleriaSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(HOJA_GALERIA);
  if (!sh) {
    sh = ss.insertSheet(HOJA_GALERIA);
    sh.getRange(1, 1, 1, GALERIA_HEADERS.length).setValues([GALERIA_HEADERS]);
    sh.setFrozenRows(1);
  } else if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, GALERIA_HEADERS.length).setValues([GALERIA_HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function obtenerAlbumesGaleriaPublicos_() {
  var sh = getGaleriaSheet_();
  var last = sh.getLastRow();
  if (last < 2) {
    return { ok: true, generatedAt: new Date().toISOString(), albums: [] };
  }
  var rows = sh.getRange(2, 1, last, GALERIA_HEADERS.length).getValues();
  var albums = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var estado = String(r[5] || "publicado").toLowerCase().trim();
    if (estado === "borrador" || estado === "oculto") continue;
    var titulo = String(r[1] || "").trim();
    if (!titulo) continue;
    var photos = parseFotosGaleria_(r[3]);
    if (!photos.length) continue;
    var id = String(r[0] || "").trim() || slugGaleria_(titulo);
    albums.push({
      id: id,
      title: titulo,
      description: String(r[2] || "").trim(),
      photos: photos,
      fecha: String(r[4] || "").trim()
    });
  }
  albums.reverse();
  return { ok: true, generatedAt: new Date().toISOString(), albums: albums };
}

function parseFotosGaleria_(raw) {
  var s = String(raw == null ? "" : raw).trim();
  if (!s) return [];
  var parts = s.split(/[\n,;]+/);
  var out = [];
  var seen = {};
  for (var i = 0; i < parts.length; i++) {
    var id = extractDriveIdGaleria_(parts[i]);
    if (!id || seen[id]) continue;
    seen[id] = true;
    out.push(id);
  }
  return out;
}

function extractDriveIdGaleria_(chunk) {
  var t = String(chunk || "").trim();
  if (!t) return "";
  var m =
    t.match(/\/folders\/([a-zA-Z0-9_-]+)/) ||
    t.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    t.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    t.match(/^([a-zA-Z0-9_-]{20,})$/);
  return m ? m[1] : "";
}

function slugGaleria_(title) {
  var s = String(title || "")
    .toLowerCase()
    .replace(/[áàäâ]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùüû]/g, "u")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s || "album-" + Date.now();
}

/**
 * Si el valor es una carpeta de Drive, lista imágenes y las deja con enlace público.
 * Si son archivos, también asegura ANYONE_WITH_LINK.
 */
function resolveFotosFromInput_(raw) {
  var tokens = String(raw || "")
    .split(/[\n,;]+/)
    .map(function (x) {
      return String(x || "").trim();
    })
    .filter(Boolean);
  var ids = [];
  var seen = {};

  function pushId(id) {
    if (!id || seen[id]) return;
    seen[id] = true;
    ids.push(id);
  }

  for (var i = 0; i < tokens.length; i++) {
    var id = extractDriveIdGaleria_(tokens[i]);
    if (!id) continue;
    try {
      var folder = null;
      try {
        folder = DriveApp.getFolderById(id);
      } catch (_notFolder) {
        folder = null;
      }
      if (folder) {
        var files = folder.getFiles();
        while (files.hasNext()) {
          var f = files.next();
          var mime = String(f.getMimeType() || "");
          if (mime.indexOf("image/") !== 0) continue;
          try {
            f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (_share) {}
          pushId(f.getId());
        }
        continue;
      }
      var file = DriveApp.getFileById(id);
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (_share2) {}
      pushId(file.getId());
    } catch (err) {
      pushId(id);
    }
  }
  return ids;
}

function saveGaleriaAlbumAdmin_(payload) {
  try {
    payload = payload || {};
    if (!isAuthorizedForPayload_(payload)) {
      return {
        ok: false,
        message:
          "No autorizado. Abrí el panel desde «Ingreso equipo · Cargar álbum» en la Galería."
      };
    }
    var titulo = String(payload.titulo || "").trim();
    var descripcion = String(payload.descripcion || "").trim();
    var fecha = String(payload.fecha || "").trim();
    var estado = String(payload.estado || "publicado").trim() || "publicado";
    var fotosRaw = String(payload.fotos || "").trim();
    if (!titulo) return { ok: false, message: "Completá el título del evento." };
    if (!fotosRaw) {
      return {
        ok: false,
        message: "Pegá IDs o enlaces de Drive (archivos o una carpeta con fotos)."
      };
    }
    var photos = resolveFotosFromInput_(fotosRaw);
    if (!photos.length) {
      return { ok: false, message: "No se encontraron fotos de imagen en Drive." };
    }
    var id = String(payload.id || "").trim() || slugGaleria_(titulo);
    var email = getEmail_() || "";
    var sh = getGaleriaSheet_();
    sh.appendRow([
      id,
      titulo,
      descripcion,
      photos.join(","),
      fecha,
      estado,
      email,
      new Date().toISOString()
    ]);
    SpreadsheetApp.flush();
    return {
      ok: true,
      message: "Álbum guardado (" + photos.length + " fotos).",
      id: id,
      photos: photos.length
    };
  } catch (err) {
    return { ok: false, message: String(err) };
  }
}

function renderGaleriaAdmin_(e) {
  if (!isAuthorized_(e)) {
    return HtmlService.createHtmlOutput(
      "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>OIA - Acceso denegado</title></head><body>" +
        "<h3>Acceso denegado</h3>" +
        "<p>Iniciá sesión en Google con un correo autorizado del equipo " +
        "(por ejemplo <code>investigacion@uccuyo.edu.ar</code>) y volvé a abrir " +
        "<em>Ingreso equipo · Cargar álbum</em> desde la Galería de imágenes.</p>" +
        "<p>En la implementación de Apps Script, «Quién tiene acceso» debe ser " +
        "<strong>Cualquier usuario de Google</strong>.</p>" +
        "</body></html>"
    )
      .setTitle("OIA Galería - Acceso denegado")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createHtmlOutput(buildGaleriaAdminPanelHtml_())
    .setTitle("Carga de álbum · Galería OIA")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function buildGaleriaAdminPanelHtml_() {
  var email = escapeHtml_(getEmail_() || "");
  var sheetUrl =
    "https://docs.google.com/spreadsheets/d/" +
    SPREADSHEET_ID +
    "/edit";
  return (
    "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\">" +
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
    "<title>Carga de álbum · Galería</title>" +
    "<style>" +
    "body{font-family:Arial,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#1b1b1b}" +
    "h1{margin:0 0 12px}p.help{color:#444;line-height:1.45}" +
    "label{font-weight:600;font-size:14px;display:block;margin:14px 0 4px}" +
    "input,textarea{width:100%;box-sizing:border-box;padding:10px;border:1px solid #bbb;border-radius:8px}" +
    "textarea{min-height:120px;resize:vertical}" +
    "button{background:#7a1532;color:#fff;border:0;border-radius:8px;padding:10px 16px;cursor:pointer;margin-top:16px}" +
    "button:disabled{opacity:.6;cursor:wait}#msg{min-height:24px;font-weight:600;margin-top:10px}.ok{color:#0c6b2f}.err{color:#8a1f1f}" +
    ".btn-sheet{display:inline-block;padding:8px 12px;border-radius:8px;border:2px solid #7a1532;color:#7a1532;text-decoration:none;font-weight:600}" +
    "ol.steps{color:#444;line-height:1.5}" +
    "</style></head><body>" +
    "<h1>Cargar evento en la Galería</h1>" +
    "<p class=\"help\">Sesión: <strong>" +
    (email || "(sin correo)") +
    "</strong>. Solo correos autorizados del Observatorio.</p>" +
    "<ol class=\"steps\">" +
    "<li>Subí las fotos a una carpeta de Google Drive.</li>" +
    "<li>Compartilas (o la carpeta) con «Cualquier persona con el enlace» → Lector.</li>" +
    "<li>Pegá acá el enlace de la carpeta o los IDs/enlaces de cada archivo.</li>" +
    "</ol>" +
    "<p><a class=\"btn-sheet\" href=\"" +
    sheetUrl +
    "\" target=\"_blank\" rel=\"noopener noreferrer\">Abrir planilla Galería</a></p>" +
    "<form id=\"f\">" +
    "<label for=\"titulo\">Título del evento *</label>" +
    "<input id=\"titulo\" name=\"titulo\" required placeholder=\"Ej. Webinar EvaluAR — 13 de agosto de 2026\">" +
    "<label for=\"fecha\">Fecha</label>" +
    "<input id=\"fecha\" name=\"fecha\" type=\"date\">" +
    "<label for=\"descripcion\">Descripción breve</label>" +
    "<textarea id=\"descripcion\" name=\"descripcion\" placeholder=\"Qué fue el encuentro, quiénes participaron…\"></textarea>" +
    "<label for=\"fotos\">Fotos (carpeta o archivos de Drive) *</label>" +
    "<textarea id=\"fotos\" name=\"fotos\" required placeholder=\"Pegá un enlace de carpeta Drive, o un ID/enlace por línea\"></textarea>" +
    "<input type=\"hidden\" name=\"estado\" value=\"publicado\">" +
    "<button type=\"submit\" id=\"save-btn\">Publicar álbum</button>" +
    "<div id=\"msg\"></div>" +
    "</form>" +
    "<script>(function(){" +
    "var f=document.getElementById('f'),m=document.getElementById('msg'),b=document.getElementById('save-btn');" +
    "function setMsg(t,ok){m.textContent=t;m.className=ok?'ok':'err';}" +
    "f.addEventListener('submit',function(ev){" +
    "ev.preventDefault();if(!f.reportValidity())return;" +
    "if(b)b.disabled=true;setMsg('Guardando…',true);" +
    "var data={titulo:f.titulo.value,fecha:f.fecha.value,descripcion:f.descripcion.value,fotos:f.fotos.value,estado:'publicado'};" +
    "if(typeof google==='undefined'||!google.script||!google.script.run){" +
    "setMsg('Panel no disponible. Republicá Apps Script (Nueva versión).',false);if(b)b.disabled=false;return;}" +
    "google.script.run.withSuccessHandler(function(r){" +
    "if(b)b.disabled=false;" +
    "if(r&&r.ok){setMsg(r.message||'Guardado.',true);f.reset();}" +
    "else{setMsg((r&&r.message)||'No se pudo guardar',false);}" +
    "}).withFailureHandler(function(err){" +
    "if(b)b.disabled=false;setMsg(String(err||'Error'),false);" +
    "}).saveGaleriaAlbumAdmin_(data);" +
    "});" +
    "})();</script></body></html>"
  );
}
