/**
 * Noticias del Observatorio — avisos cargados por el equipo (whitelist).
 *
 * - GET  ?action=noticias_admin → panel HTML
 * - Las filas de la hoja «NoticiasOIA» se suman en obtenerNoticiasMedios_()
 * - saveNoticiaAdmin_(payload) vía google.script.run
 *
 * Columnas: id | titulo | excerpt | link | fecha | fuente | medio | estado | creado_por | creado_en
 */
var HOJA_NOTICIAS_OIA = "NoticiasOIA";
var NOTICIAS_OIA_HEADERS = [
  "id",
  "titulo",
  "excerpt",
  "link",
  "fecha",
  "fuente",
  "medio",
  "estado",
  "creado_por",
  "creado_en"
];

function routeNoticiasGet_(e) {
  var action = param_(e, "action", "");
  if (action === "noticias_admin") {
    return renderNoticiasAdmin_(e);
  }
  return null;
}

function getNoticiasOiaSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(HOJA_NOTICIAS_OIA);
  if (!sh) {
    sh = ss.insertSheet(HOJA_NOTICIAS_OIA);
    sh.getRange(1, 1, 1, NOTICIAS_OIA_HEADERS.length).setValues([NOTICIAS_OIA_HEADERS]);
    sh.setFrozenRows(1);
  } else if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, NOTICIAS_OIA_HEADERS.length).setValues([NOTICIAS_OIA_HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function obtenerNoticiasEquipo_() {
  var sh = getNoticiasOiaSheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var rows = sh.getRange(2, 1, last, NOTICIAS_OIA_HEADERS.length).getValues();
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var estado = String(r[7] || "publicado").toLowerCase().trim();
    if (estado === "borrador" || estado === "oculto") continue;
    var titulo = String(r[1] || "").trim();
    var link = String(r[3] || "").trim();
    if (!titulo || !link) continue;
    var id = String(r[0] || "").trim() || "equipo-" + (i + 2);
    out.push({
      id: id,
      titulo: titulo,
      excerpt: String(r[2] || "").trim(),
      link: link,
      fecha: String(r[4] || "").trim(),
      fuente: String(r[5] || "Observatorio de IA").trim() || "Observatorio de IA",
      medio: String(r[6] || "Aviso").trim() || "Aviso",
      origen: "observatorio_equipo"
    });
  }
  return out;
}

function saveNoticiaAdmin_(payload) {
  try {
    payload = payload || {};
    if (!isAuthorizedForPayload_(payload)) {
      return {
        ok: false,
        message:
          "No autorizado. Abrí el panel desde «Ingreso equipo · Cargar noticia» en Noticias."
      };
    }
    var titulo = String(payload.titulo || "").trim();
    var link = String(payload.link || "").trim();
    var excerpt = String(payload.excerpt || "").trim();
    var fecha = String(payload.fecha || "").trim();
    var fuente = String(payload.fuente || "Observatorio de IA").trim() || "Observatorio de IA";
    var medio = String(payload.medio || "Aviso").trim() || "Aviso";
    var estado = String(payload.estado || "publicado").trim() || "publicado";
    if (!titulo) return { ok: false, message: "Completá el título." };
    if (!link) return { ok: false, message: "Completá el enlace (URL o ancla #del-sitio)." };
    var id =
      String(payload.id || "").trim() ||
      "equipo-" +
        String(titulo)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40) +
        "-" +
        Date.now().toString(36);
    var email = getEmail_() || "";
    getNoticiasOiaSheet_().appendRow([
      id,
      titulo,
      excerpt,
      link,
      fecha || new Date().toISOString().slice(0, 10),
      fuente,
      medio,
      estado,
      email,
      new Date().toISOString()
    ]);
    SpreadsheetApp.flush();
    return { ok: true, message: "Noticia publicada.", id: id };
  } catch (err) {
    return { ok: false, message: String(err) };
  }
}

function renderNoticiasAdmin_(e) {
  if (!isAuthorized_(e)) {
    return HtmlService.createHtmlOutput(
      "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>OIA - Acceso denegado</title></head><body>" +
        "<h3>Acceso denegado</h3>" +
        "<p>Iniciá sesión en Google con un correo autorizado del equipo y volvé a abrir " +
        "<em>Ingreso equipo · Cargar noticia</em>.</p>" +
        "</body></html>"
    )
      .setTitle("OIA Noticias - Acceso denegado")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createHtmlOutput(buildNoticiasAdminPanelHtml_())
    .setTitle("Cargar noticia · OIA")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function buildNoticiasAdminPanelHtml_() {
  var email = escapeHtml_(getEmail_() || "");
  var sheetUrl = "https://docs.google.com/spreadsheets/d/" + SPREADSHEET_ID + "/edit";
  return (
    "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\">" +
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
    "<title>Cargar noticia</title>" +
    "<style>" +
    "body{font-family:Arial,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#1b1b1b}" +
    "h1{margin:0 0 12px}p.help{color:#444}" +
    "label{font-weight:600;font-size:14px;display:block;margin:14px 0 4px}" +
    "input,textarea{width:100%;box-sizing:border-box;padding:10px;border:1px solid #bbb;border-radius:8px}" +
    "textarea{min-height:90px;resize:vertical}" +
    "button{background:#7a1532;color:#fff;border:0;border-radius:8px;padding:10px 16px;cursor:pointer;margin-top:16px}" +
    "button:disabled{opacity:.6;cursor:wait}#msg{min-height:24px;font-weight:600;margin-top:10px}.ok{color:#0c6b2f}.err{color:#8a1f1f}" +
    ".btn-sheet{display:inline-block;padding:8px 12px;border-radius:8px;border:2px solid #7a1532;color:#7a1532;text-decoration:none;font-weight:600}" +
    "</style></head><body>" +
    "<h1>Cargar noticia</h1>" +
    "<p class=\"help\">Sesión: <strong>" +
    (email || "(sin correo)") +
    "</strong>. Solo correos autorizados del Observatorio.</p>" +
    "<p><a class=\"btn-sheet\" href=\"" +
    sheetUrl +
    "\" target=\"_blank\" rel=\"noopener noreferrer\">Abrir planilla NoticiasOIA</a></p>" +
    "<form id=\"f\">" +
    "<label for=\"titulo\">Título *</label>" +
    "<input id=\"titulo\" name=\"titulo\" required>" +
    "<label for=\"fecha\">Fecha</label>" +
    "<input id=\"fecha\" name=\"fecha\" type=\"date\">" +
    "<label for=\"link\">Enlace * (URL externa o ancla del sitio, p. ej. #webinars)</label>" +
    "<input id=\"link\" name=\"link\" required placeholder=\"https://… o #seccion\">" +
    "<label for=\"excerpt\">Resumen breve</label>" +
    "<textarea id=\"excerpt\" name=\"excerpt\"></textarea>" +
    "<label for=\"medio\">Etiqueta / medio</label>" +
    "<input id=\"medio\" name=\"medio\" value=\"Aviso\">" +
    "<input type=\"hidden\" name=\"fuente\" value=\"Observatorio de IA\">" +
    "<input type=\"hidden\" name=\"estado\" value=\"publicado\">" +
    "<button type=\"submit\" id=\"save-btn\">Publicar noticia</button>" +
    "<div id=\"msg\"></div></form>" +
    "<script>(function(){" +
    "var f=document.getElementById('f'),m=document.getElementById('msg'),b=document.getElementById('save-btn');" +
    "function setMsg(t,ok){m.textContent=t;m.className=ok?'ok':'err';}" +
    "f.addEventListener('submit',function(ev){" +
    "ev.preventDefault();if(!f.reportValidity())return;" +
    "if(b)b.disabled=true;setMsg('Guardando…',true);" +
    "var data={titulo:f.titulo.value,fecha:f.fecha.value,link:f.link.value,excerpt:f.excerpt.value,medio:f.medio.value,fuente:'Observatorio de IA',estado:'publicado'};" +
    "if(typeof google==='undefined'||!google.script||!google.script.run){" +
    "setMsg('Panel no disponible. Republicá Apps Script (Nueva versión).',false);if(b)b.disabled=false;return;}" +
    "google.script.run.withSuccessHandler(function(r){" +
    "if(b)b.disabled=false;" +
    "if(r&&r.ok){setMsg(r.message||'Guardado.',true);f.reset();f.medio.value='Aviso';}" +
    "else{setMsg((r&&r.message)||'No se pudo guardar',false);}" +
    "}).withFailureHandler(function(err){" +
    "if(b)b.disabled=false;setMsg(String(err||'Error'),false);" +
    "}).saveNoticiaAdmin_(data);" +
    "});" +
    "})();</script></body></html>"
  );
}
