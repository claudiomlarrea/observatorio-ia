/**
 * Encuesta docentes — exportación (equipo), carga de informes (equipo) y descarga pública.
 * Requiere en PublicacionesWeb.gs:
 *   doGet:  var enc = routeEncuestaDocentesGet_(e); if (enc) return enc;
 *   doPost: var encPost = routeEncuestaDocentesPost_(e); if (encPost) return encPost;
 */

var ENCUESTA_DOCENTES_RESPUESTAS_ID = "1Tf0rz2Fe5ulXq4y3WFHnF2wH-Ma8zCt4SH5wB_vfBtc";

var ENCUESTA_DOCENTES_TEAM_EMAILS = [
  "investigacion@uccuyo.edu.ar",
  "jose.lamalfa@uccuyosl.edu.ar",
  "asistente.inv@uccuyo.edu.ar",
  "vincutec@uccuyo.edu.ar",
  "lpizarro@uccuyo.edu.ar",
  "barias@uccuyo.edu.ar",
  "claudio17larrea@gmail.com",
  "observatorioia@uccuyo.edu.ar"
];

var ENCUESTA_DOCENTES_PROP_EJECUTIVO = "encuesta_docentes_informe_ejecutivo_id";
var ENCUESTA_DOCENTES_PROP_INSTITUCIONAL = "encuesta_docentes_informe_institucional_id";

/** PDF de respaldo en GitHub Pages si aún no subieron informes docentes. */
var ENCUESTA_DOCENTES_FALLBACK_EJECUTIVO =
  "https://claudiomlarrea.github.io/observatorio-ia/docs/informes/informe_ejecutivo_ia_uccuyo_institucional.pdf";

function routeEncuestaDocentesGet_(e) {
  var action = param_(e, "action", "");
  if (action === "encuesta_docentes_export") return encuestaDocentesExport_(e);
  if (action === "encuesta_docentes_equipo") return encuestaDocentesPanelEquipo_(e);
  if (action === "encuesta_docentes_informe") return encuestaDocentesInformePublico_(e);
  return null;
}

function routeEncuestaDocentesPost_(e) {
  var payload = mergePostParams_(e);
  var action = val_(payload.action) || param_(e, "action", "");
  if (action === "encuesta_docentes_upload") return encuestaDocentesUpload_(e, payload);
  return null;
}

function isEncuestaDocentesTeam_(e) {
  var email = getEmail_();
  if (email && ENCUESTA_DOCENTES_TEAM_EMAILS.indexOf(email) >= 0) return true;
  if (isAuthorized_(e)) return true;
  return false;
}

function encuestaDocentesDeniedHtml_(titulo) {
  return (
    "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>" +
    titulo +
    "</title></head><body style=\"font-family:system-ui,sans-serif;max-width:36rem;margin:2rem auto;padding:0 1rem\">" +
    "<h2>Acceso solo equipo Observatorio</h2>" +
    "<p>Iniciá sesión en Google con un correo autorizado del Observatorio de IA " +
    "(investigación, coordinación, asistentes del equipo).</p>" +
    "<p>Si ya estás logueado con otra cuenta, cerrá sesión y volvé a intentar.</p>" +
    "<p><a href=\"https://claudiomlarrea.github.io/observatorio-ia/#encuestas\">Volver a Encuestas</a></p>" +
    "</body></html>"
  );
}

function encuestaDocentesExport_(e) {
  if (!isEncuestaDocentesTeam_(e)) {
    return ContentService.createTextOutput(encuestaDocentesDeniedHtml_("Exportar respuestas")).setMimeType(
      ContentService.MimeType.HTML
    );
  }
  try {
    var url =
      "https://docs.google.com/spreadsheets/d/" +
      ENCUESTA_DOCENTES_RESPUESTAS_ID +
      "/export?format=xlsx";
    var resp = UrlFetchApp.fetch(url, {
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true,
    });
    if (resp.getResponseCode() !== 200) {
      throw new Error("No se pudo exportar la planilla (código " + resp.getResponseCode() + ")");
    }
    var blob = resp.getBlob().setName("encuesta_docentes_respuestas.xlsx");
    var b64 = Utilities.base64Encode(blob.getBytes());
    var html =
      "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>Descarga</title></head><body>" +
      "<p>Descargando respuestas de la encuesta docentes…</p>" +
      '<a id="dl" download="encuesta_docentes_respuestas.xlsx" href="data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' +
      b64 +
      '">Si no inicia, hacé clic acá</a>' +
      "<script>document.getElementById('dl').click();</script></body></html>";
    return ContentService.createTextOutput(html).setMimeType(ContentService.MimeType.HTML);
  } catch (err) {
    return ContentService.createTextOutput(
      "<!DOCTYPE html><html lang=\"es\"><body><p>Error: " +
        String(err) +
        "</p></body></html>"
    ).setMimeType(ContentService.MimeType.HTML);
  }
}

function encuestaDocentesPanelEquipo_(e) {
  if (!isEncuestaDocentesTeam_(e)) {
    return ContentService.createTextOutput(encuestaDocentesDeniedHtml_("Cargar informes")).setMimeType(
      ContentService.MimeType.HTML
    );
  }
  var api = ScriptApp.getService().getUrl();
  var email = getEmail_() || "(correo no detectado)";
  var exportUrl = api + "?action=encuesta_docentes_export";
  var html =
    "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>Encuesta docentes · Equipo</title>" +
    "<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;color:#1e293b}" +
    "label{display:block;margin:1rem 0 .35rem;font-weight:600}input[type=file]{width:100%}" +
    ".btn{display:inline-block;margin:.5rem .5rem .5rem 0;padding:.55rem 1rem;border-radius:.5rem;" +
    "background:#7f1d1d;color:#fff;text-decoration:none;border:none;cursor:pointer;font-size:1rem}" +
    ".btn--ghost{background:#fff;color:#7f1d1d;border:1px solid #cbd5e1}#msg{margin-top:1rem}</style></head><body>" +
    "<h1>Encuesta docentes · Equipo OIA</h1>" +
    "<p>Sesión: <strong>" +
    email +
    "</strong></p>" +
    '<p><a class="btn btn--ghost" href="' +
    exportUrl +
    '">Descargar respuestas (Excel)</a></p>' +
    "<h2>Publicar informes en la web</h2>" +
    "<p>Subí los PDF que cualquier persona podrá descargar desde el Observatorio.</p>" +
    '<form id="f" method="post" action="' +
    api +
    '" enctype="application/x-www-form-urlencoded">' +
    '<input type="hidden" name="action" value="encuesta_docentes_upload">' +
    '<input type="hidden" name="_panel" value="1">' +
    "<label>Informe ejecutivo (PDF)</label>" +
    '<input type="file" id="ej" accept="application/pdf,.pdf">' +
    "<label>Informe institucional (PDF)</label>" +
    '<input type="file" id="inst" accept="application/pdf,.pdf">' +
    '<button class="btn" type="submit">Subir informes seleccionados</button>' +
    "</form>" +
    '<p id="msg"></p>' +
    '<p><a href="https://claudiomlarrea.github.io/observatorio-ia/#encuestas">Volver al sitio</a></p>' +
    "<script>(function(){var f=document.getElementById('f');var ej=document.getElementById('ej');" +
    "var inst=document.getElementById('inst');function read(file,cb){if(!file){cb('');return;}" +
    "var r=new FileReader();r.onload=function(){cb(r.result.split(',')[1]||'');};r.readAsDataURL(file);}" +
    "f.addEventListener('submit',function(ev){ev.preventDefault();var m=document.getElementById('msg');" +
    "m.textContent='Subiendo…';read(ej.files[0],function(b64e){read(inst.files[0],function(b64i){" +
    "if(!b64e&&!b64i){m.textContent='Seleccioná al menos un PDF.';return;}" +
    "var body='action=encuesta_docentes_upload&_panel=1';" +
    "if(b64e)body+='&informe_ejecutivo_b64='+encodeURIComponent(b64e);" +
    "if(b64i)body+='&informe_institucional_b64='+encodeURIComponent(b64i);" +
    "fetch(f.action,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'}," +
    "body:body,redirect:'follow'}).then(function(r){return r.text();}).then(function(t){" +
    "m.innerHTML=t.indexOf('Guardado')>=0||t.indexOf('ok')>=0?'Listo. Los enlaces públicos ya apuntan a estos archivos.':t;" +
    "}).catch(function(){m.textContent='Error de red al subir.';});});});});})();</script>" +
    "</body></html>";
  return ContentService.createTextOutput(html).setMimeType(ContentService.MimeType.HTML);
}

function encuestaDocentesUpload_(e, payload) {
  if (!isEncuestaDocentesTeam_(e)) {
    return panelEncuestaDocentesResponse_(false, "No autorizado", payload);
  }
  try {
    var props = PropertiesService.getScriptProperties();
    var folder = getEncuestaDocentesInformesFolder_();
    var b64Ej = val_(payload.informe_ejecutivo_b64);
    var b64Inst = val_(payload.informe_institucional_b64);
    if (!b64Ej && !b64Inst) {
      return panelEncuestaDocentesResponse_(false, "Seleccioná al menos un PDF", payload);
    }
    if (b64Ej) {
      var blobEj = Utilities.newBlob(Utilities.base64Decode(b64Ej), "application/pdf", "informe_ejecutivo_docentes.pdf");
      var oldEj = props.getProperty(ENCUESTA_DOCENTES_PROP_EJECUTIVO);
      if (oldEj) {
        try {
          DriveApp.getFileById(oldEj).setTrashed(true);
        } catch (_ignore) {}
      }
      var fileEj = folder.createFile(blobEj);
      fileEj.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      props.setProperty(ENCUESTA_DOCENTES_PROP_EJECUTIVO, fileEj.getId());
    }
    if (b64Inst) {
      var blobInst = Utilities.newBlob(
        Utilities.base64Decode(b64Inst),
        "application/pdf",
        "informe_institucional_docentes.pdf"
      );
      var oldInst = props.getProperty(ENCUESTA_DOCENTES_PROP_INSTITUCIONAL);
      if (oldInst) {
        try {
          DriveApp.getFileById(oldInst).setTrashed(true);
        } catch (_ignore) {}
      }
      var fileInst = folder.createFile(blobInst);
      fileInst.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      props.setProperty(ENCUESTA_DOCENTES_PROP_INSTITUCIONAL, fileInst.getId());
    }
    return panelEncuestaDocentesResponse_(true, "Informes guardados correctamente", payload);
  } catch (err) {
    return panelEncuestaDocentesResponse_(false, String(err), payload);
  }
}

function panelEncuestaDocentesResponse_(ok, message, payload) {
  if (val_(payload._panel) === "1") {
    var html =
      "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>Encuesta docentes</title></head><body>" +
      "<p>" +
      (ok ? "✅ " : "❌ ") +
      message +
      "</p>" +
      '<p><a href="' +
      ScriptApp.getService().getUrl() +
      '?action=encuesta_docentes_equipo">Volver al panel</a></p></body></html>';
    return ContentService.createTextOutput(html).setMimeType(ContentService.MimeType.HTML);
  }
  return json_({ ok: ok, message: message });
}

function getEncuestaDocentesInformesFolder_() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty("encuesta_docentes_informes_folder_id");
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (_e) {}
  }
  var folder = DriveApp.createFolder("OIA · Informes encuesta docentes");
  folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
  props.setProperty("encuesta_docentes_informes_folder_id", folder.getId());
  return folder;
}

function encuestaDocentesInformePublico_(e) {
  var tipo = param_(e, "tipo", "ejecutivo");
  var props = PropertiesService.getScriptProperties();
  var fileId = "";
  if (tipo === "institucional") {
    fileId = props.getProperty(ENCUESTA_DOCENTES_PROP_INSTITUCIONAL) || "";
  } else {
    fileId = props.getProperty(ENCUESTA_DOCENTES_PROP_EJECUTIVO) || "";
  }
  if (fileId) {
    try {
      var file = DriveApp.getFileById(fileId);
      var url = file.getDownloadUrl() || file.getUrl();
      return HtmlService.createHtmlOutput(
        '<meta http-equiv="refresh" content="0;url=' + url + '"><p>Redirigiendo al PDF…</p>'
      );
    } catch (_err) {}
  }
  if (tipo === "ejecutivo" || tipo === "institucional") {
    return HtmlService.createHtmlOutput(
      '<meta http-equiv="refresh" content="0;url=' +
        ENCUESTA_DOCENTES_FALLBACK_EJECUTIVO +
        '"><p>Redirigiendo al informe…</p>'
    );
  }
  return ContentService.createTextOutput("Tipo de informe no válido").setMimeType(
    ContentService.MimeType.TEXT
  );
}
