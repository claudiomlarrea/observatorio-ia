/**
 * Publicaciones OIA - API pública + panel privado con whitelist.
 * EDGE-PANEL-v2: formulario HTML directo (sin PublicacionesAdmin.html ni iframe).
 *
 * Endpoints:
 * - GET  ?action=public (o sin action): JSON para la web pública.
 * - GET  ?action=admin: panel HTML de carga (solo emails autorizados).
 * - GET  ?action=visit&site=secretaria|observatorio: +1 visita a esa página web (GitHub Pages).
 * - POST ?action=add: agrega publicación (solo emails autorizados).
 * - POST ?action=contact: envía consulta del formulario web (público).
 */

var SPREADSHEET_ID = "18xXPRok4kVF81hkEDDlfDf8Vx-KI2HeywZNFSXkozwU";
var CONTACT_TO = "observatorioia@uccuyo.edu.ar";
var CONTACT_COPY_TO = "investigacion@uccuyo.edu.ar";
var HOJA_PUBLICACIONES = "Hoja 1";
var HOJA_CONTACTOS = "Contactos web";
var SOLO_FILA_OBSERVATORIO = true;
var PATRON_UNIDAD_OIA = /OIA|Observatorio de Inteligencia Artificial/i;
var ESTADO_PUBLICABLE = "publicado";

/** Planilla Looker Studio — se actualiza al guardar desde el panel. */
var LOOKER_SHEET_ID = "10SKDfZJIZGSTOaOWgGmB46WPM0Bd0BvLe4aZ9jilA34";
var LOOKER_TAB = "indice_openalex";
var LOOKER_HEADERS = ["anio", "titulo", "autores", "doi", "url", "fuente", "fecha_sync"];

var ADMIN_ACCESS_KEY = "OIA-Privado-2026";

var AUTHORIZED_EMAILS = [
  "claudio.larrea@hotmail.com",
  "claudio17larrea@gmail.com",
  "investigacion@uccuyo.edu.ar",
  "observatorioia@uccuyo.edu.ar",
  "barias@uccuyo.edu.ar",
  "vincutec@uccuyo.edu.ar",
  "asistente.inv@uccuyo.edu.ar",
  "jose.lamalfa@uccuyosl.edu.ar",
  "laurapizarro92@gmail.com",
  "lpizarro@uccuyo.edu.ar"
];

/** Misma lista que Consejo / Producción Científica (Streamlit) + unidades transversales. */
var UNIDADES_ACADEMICAS = [
  "FDCSSL- Facultad de Derecho y Ciencias Sociales Sede San Luis",
  "FCMSL- Facultad de Ciencias Médicas Sede San Luis",
  "FCVSL- Facultad de Ciencias Veterinarias Sede San Luis",
  "FCEESL- Facultad de Ciencias Económicas y Empresariales Sede San Luis",
  "FBOSCO- Facultad Don Bosco",
  "FCEESJ- Facultad de Ciencias Económicas y Empresariales Sede San Juan",
  "FFyHSJ- Facultad de Filosofía y Humanidades",
  "ISDSM- Instituto Universitario Santa María",
  "ECRyPSJ- Escuela Cultura Religiosa y Pastoral",
  "FDCSSJ- Facultad de Derecho y Ciencias Sociales Sede San Juan",
  "FCMSJ- Facultad de Ciencias Médicas San Juan",
  "FEDSJ- Facultad de Educación",
  "ESEGSJ- Escuela de Seguridad",
  "FCQyTSJ- Facultad de Ciencias Químicas y Tecnológicas",
  "ISB- Instituto San Buenaventura",
  "Secretaría de Investigación",
  "Unidad de Vinculación Tecnológica",
  "OIA- Observatorio de Inteligencia Artificial",
  "Vicerrectora de Formación",
  "Departamento de Educación a Distancia"
];

function getUnidadesAcademicas_() {
  return UNIDADES_ACADEMICAS.slice();
}

function doGet(e) {
  var action = param_(e, "action", "public");
  if (action === "admin") {
    return renderAdmin_(e);
  }
  if (action === "visit") {
    return jsonOrJsonp_(registrarVisita_(param_(e, "site", "")), e);
  }
  if (action === "noticias") {
    return jsonOrJsonp_(obtenerNoticiasMedios_(), e);
  }

  var datos = obtenerItemsPublicos_();
  return jsonOrJsonp_({ ok: true, generatedAt: new Date().toISOString(), items: datos }, e);
}

function doPost(e) {
  var payload = mergePostParams_(e);
  var action = val_(payload.action) || param_(e, "action", "add");

  if (action === "contact") {
    return handleContact_(payload);
  }

  if (action !== "add") return json_({ ok: false, error: "invalid_action" });

  var fromPanel = val_(payload._panel) === "1";

  if (!isAuthorized_(e)) {
    if (fromPanel) return panelSaveResponse_(false, "No autorizado", payload);
    return json_({ ok: false, error: "unauthorized" });
  }

  var row = payloadToRow_(payload);

  if (!row[0] || !row[1] || !row[6]) {
    if (fromPanel) return panelSaveResponse_(false, "Completá tipo, título y unidad", payload);
    return json_({ ok: false, error: "required_fields", message: "tipo, titulo y unidad son obligatorios" });
  }

  try {
    getSheet_().appendRow(row);
    SpreadsheetApp.flush();
    mirrorPublicationToLooker_(payload);
  } catch (err) {
    if (fromPanel) return panelSaveResponse_(false, String(err), payload);
    return json_({ ok: false, error: "save_failed", message: String(err) });
  }

  if (fromPanel) return panelSaveResponse_(true, "Guardado correctamente", payload);
  return json_({ ok: true });
}

function panelAdminReturnUrl_(ok, message, payload) {
  var url = ScriptApp.getService().getUrl() + "?action=admin";
  var key = val_(payload && payload.key);
  if (key) url += "&key=" + encodeURIComponent(key);
  if (ok) return url + "&saved=1";
  return url + "&saved=0&err=" + encodeURIComponent(String(message || "error"));
}

function panelSaveResponse_(ok, message, payload) {
  return ContentService.createTextOutput(
    contactRedirectHtml_(panelAdminReturnUrl_(ok, message, payload))
  ).setMimeType(ContentService.MimeType.HTML);
}

/** Llamado desde el panel HTML con google.script.run (no abre página en blanco). */
function savePublicationAdmin_(payload) {
  try {
    payload = payload || {};
    if (!isAuthorizedForPayload_(payload)) {
      return {
        ok: false,
        message:
          "No autorizado. Abrí el panel desde «Ingreso equipo · Cargar publicaciones» en el sitio."
      };
    }
    var row = payloadToRow_(payload);
    if (!row[0] || !row[1] || !row[6]) {
      return { ok: false, message: "Completá tipo, título y unidad." };
    }
    getSheet_().appendRow(row);
    SpreadsheetApp.flush();
    mirrorPublicationToLooker_(payload);
    return { ok: true, message: "Guardado" };
  } catch (err) {
    return { ok: false, message: String(err) };
  }
}

/** Copia la publicación a la planilla de Looker (mismas columnas que OpenAlex). */
function mirrorPublicationToLooker_(p) {
  if (!LOOKER_SHEET_ID) return;
  try {
    var est = normalizar_(val_(p.estado) || ESTADO_PUBLICABLE);
    if (est === "borrador") return;

    var sh = SpreadsheetApp.openById(LOOKER_SHEET_ID).getSheetByName(LOOKER_TAB);
    if (!sh) sh = SpreadsheetApp.openById(LOOKER_SHEET_ID).insertSheet(LOOKER_TAB);

    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, LOOKER_HEADERS.length).setValues([LOOKER_HEADERS]);
    }

    var doi = normalizeDoiForLooker_(val_(p.doi));
    if (doi && lookerHasDoi_(sh, doi)) return;

    var anio = val_(p.anio);
    if (/^\d{4}\/\d/.test(anio)) {
      try {
        anio = String(new Date(anio).getFullYear());
      } catch (_e) {}
    }
    var link = val_(p.link);
    if (!link && doi) link = "https://doi.org/" + doi;
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

    sh.appendRow([
      anio,
      val_(p.titulo),
      val_(p.autores),
      doi,
      link,
      "Registro manual",
      now
    ]);
  } catch (err) {
    Logger.log("mirrorPublicationToLooker_: " + err);
  }
}

function normalizeDoiForLooker_(raw) {
  var s = String(raw || "").trim();
  s = s.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
  s = s.replace(/^doi:\s*/i, "");
  return s.trim();
}

function lookerHasDoi_(sh, doi) {
  var last = sh.getLastRow();
  if (last < 2) return false;
  var vals = sh.getRange(2, 4, last - 1, 1).getValues();
  var needle = doi.toLowerCase();
  for (var i = 0; i < vals.length; i++) {
    if (normalizeDoiForLooker_(vals[i][0]).toLowerCase() === needle) return true;
  }
  return false;
}

/** En el editor: elegí esta función y ▶ Ejecutar (autoriza permisos de la planilla). */
function authorizeSavePanel() {
  var r = savePublicationAdmin_({
    key: ADMIN_ACCESS_KEY,
    tipo: "Diario",
    titulo: "Prueba permisos panel",
    unidad: "OIA- Observatorio de Inteligencia Artificial",
    estado: "borrador"
  });
  Logger.log(JSON.stringify(r));
  return r;
}

function isAuthorizedForPayload_(p) {
  var email = getEmail_();
  if (email && AUTHORIZED_EMAILS.indexOf(email) >= 0) return true;
  return val_(p.key) === ADMIN_ACCESS_KEY;
}

function escapeHtml_(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildUnidadOptionsHtml_(defaultUnidad) {
  var out = [];
  var unidades = getUnidadesAcademicas_();
  for (var i = 0; i < unidades.length; i++) {
    var u = unidades[i];
    var sel = u === defaultUnidad ? " selected" : "";
    out.push('<option value="' + escapeHtml_(u) + '"' + sel + ">" + escapeHtml_(u) + "</option>");
  }
  return out.join("");
}

function buildAdminPanelHtml_(apiUrl, adminKey, defaultUnidad) {
  var unidadOpts = buildUnidadOptionsHtml_(defaultUnidad);
  return (
    "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\">" +
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
    "<title>Carga de Publicaciones</title>" +
    "<style>" +
    "body{font-family:Arial,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#1b1b1b}" +
    "h1{margin:0 0 16px}p.help{margin-top:0;color:#444}" +
    "form{display:grid;grid-template-columns:1fr 1fr;gap:12px}" +
    "label{font-weight:600;font-size:14px;margin-bottom:4px;display:block}" +
    "input,select,textarea{width:100%;box-sizing:border-box;padding:10px;border:1px solid #bbb;border-radius:8px}" +
    "textarea{min-height:96px;resize:vertical}.full{grid-column:1/-1}" +
    ".actions{grid-column:1/-1;display:flex;gap:10px;align-items:center}" +
    "button{background:#0b6b5d;color:#fff;border:0;border-radius:8px;padding:10px 14px;cursor:pointer}" +
    "button:disabled{opacity:.6;cursor:wait}#msg{min-height:24px;font-weight:600}.ok{color:#0c6b2f}.err{color:#8a1f1f}" +
    ".btn-sheet{display:inline-block;padding:10px 14px;border-radius:8px;border:2px solid #0b6b5d;color:#0b6b5d;background:#fff;font-weight:600;text-decoration:none}" +
    "@media(max-width:760px){form{grid-template-columns:1fr}}" +
    "</style></head><body>" +
    "<h1>Carga de Publicaciones</h1>" +
    "<p class=\"help\">Completá los datos y guardá. Verás un instante la página de Google y volverás al formulario con la confirmación.</p>" +
    "<p><a class=\"btn-sheet\" href=\"https://docs.google.com/spreadsheets/d/18xXPRok4kVF81hkEDDlfDf8Vx-KI2HeywZNFSXkozwU/edit#gid=0\" target=\"_blank\" rel=\"noopener noreferrer\">Abrir planilla en Google Sheets</a></p>" +
    "<form id=\"f\" method=\"post\" action=\"" +
    escapeHtml_(apiUrl) +
    "\" target=\"_top\" accept-charset=\"UTF-8\">" +
    "<input type=\"hidden\" name=\"action\" value=\"add\">" +
    "<input type=\"hidden\" name=\"_panel\" value=\"1\">" +
    "<input type=\"hidden\" name=\"key\" value=\"" +
    escapeHtml_(adminKey) +
    "\">" +
    "<div><label for=\"tipo\">Tipo *</label><select id=\"tipo\" name=\"tipo\" required>" +
    "<option value=\"Revista\">Revista</option><option value=\"Libro\">Libro</option>" +
    "<option value=\"Capítulo de libro\">Capítulo de libro</option><option value=\"Repositorio\">Informe</option>" +
    "<option value=\"Evento\">Evento</option><option value=\"Diario\">Diario</option></select></div>" +
    "<div><label for=\"anio\">Año</label><input id=\"anio\" name=\"anio\" type=\"number\" min=\"1900\" max=\"2100\"></div>" +
    "<div class=\"full\"><label for=\"titulo\">Título *</label><input id=\"titulo\" name=\"titulo\" required></div>" +
    "<div class=\"full\"><label for=\"autores\">Autor/es</label><input id=\"autores\" name=\"autores\"></div>" +
    "<div><label for=\"revista_o_medio\">Revista / medio</label><input id=\"revista_o_medio\" name=\"revista_o_medio\"></div>" +
    "<div><label for=\"doi\">DOI</label><input id=\"doi\" name=\"doi\"></div>" +
    "<div><label for=\"unidad\">Unidad *</label><select id=\"unidad\" name=\"unidad\" required>" +
    unidadOpts +
    "</select></div>" +
    "<div><label for=\"indexacion\">Indexación</label><input id=\"indexacion\" name=\"indexacion\"></div>" +
    "<div><label for=\"editorial\">Editorial</label><input id=\"editorial\" name=\"editorial\"></div>" +
    "<div><label for=\"isbn\">ISBN</label><input id=\"isbn\" name=\"isbn\"></div>" +
    "<div><label for=\"tipo_publicacion\">Tipo publicación</label><input id=\"tipo_publicacion\" name=\"tipo_publicacion\"></div>" +
    "<div><label for=\"link\">Link</label><input id=\"link\" name=\"link\" type=\"url\" placeholder=\"https://...\"></div>" +
    "<div><label for=\"evento\">Evento</label><input id=\"evento\" name=\"evento\"></div>" +
    "<div><label for=\"lugar\">Lugar</label><input id=\"lugar\" name=\"lugar\"></div>" +
    "<div><label for=\"fecha\">Fecha</label><input id=\"fecha\" name=\"fecha\"></div>" +
    "<input type=\"hidden\" name=\"estado\" value=\"publicado\">" +
    "<div class=\"full\"><label for=\"resumen\">Resumen</label><textarea id=\"resumen\" name=\"resumen\"></textarea></div>" +
    "<div class=\"full\"><label for=\"repositorio\">Repositorio</label><input id=\"repositorio\" name=\"repositorio\"></div>" +
    "<div class=\"actions\"><button type=\"submit\" id=\"save-btn\">Guardar publicación</button><span id=\"msg\"></span></div>" +
    "</form>" +
    "<script>(function(){var f=document.getElementById('f'),m=document.getElementById('msg'),b=document.getElementById('save-btn');" +
    "function setMsg(t,ok){m.textContent=t;m.className=ok?'ok':'err';}" +
    "var p=new URLSearchParams(window.location.search);" +
    "if(p.get('saved')==='1')setMsg('Guardado correctamente.',true);" +
    "if(p.get('saved')==='0')setMsg('No se pudo guardar: '+(p.get('err')||'error'),false);" +
    "f.addEventListener('submit',function(){if(!f.reportValidity())return;if(b)b.disabled=true;setMsg('Guardando…',true);});" +
    "})();</script></body></html>"
  );
}

function renderAdmin_(e) {
  if (!isAuthorized_(e)) {
    return ContentService.createTextOutput(
      "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>OIA - Acceso denegado</title></head><body>" +
        "<h3>Acceso denegado</h3>" +
        "<p>No se pudo validar el acceso. En las apps web de Google el correo con el que entraste " +
        "casi nunca se detecta automáticamente.</p>" +
        "<p><strong>Cómo entrar:</strong> usá el botón " +
        "<em>Ingreso equipo · Cargar publicaciones</em> en la sección Publicaciones del sitio " +
        "(ese enlace incluye la clave de acceso del Observatorio).</p>" +
        "<p>Si abriste esta página a mano, la URL debe terminar en " +
        "<code>?action=admin&amp;key=OIA-Privado-2026</code> " +
        "(no uses la clave de Secretaría de Investigación).</p>" +
        "</body></html>"
    ).setMimeType(ContentService.MimeType.HTML);
  }
  var apiUrl = ScriptApp.getService().getUrl();
  var adminKey = adminKeyFromRequest_(e) || ADMIN_ACCESS_KEY;
  var defaultUnidad = "OIA- Observatorio de Inteligencia Artificial";
  return ContentService.createTextOutput(
    buildAdminPanelHtml_(apiUrl, adminKey, defaultUnidad)
  ).setMimeType(ContentService.MimeType.HTML);
}

function obtenerItemsPublicos_() {
  var values = getSheet_().getDataRange().getDisplayValues();
  if (!values.length) return [];

  var startIdx = tieneHeader_(values[0]) ? 1 : 0;
  var out = [];

  for (var i = startIdx; i < values.length; i++) {
    var o = rowAToObj_(values[i]);
    if (!o.titulo && !o.autores && !o.evento) continue;
    if (SOLO_FILA_OBSERVATORIO && !PATRON_UNIDAD_OIA.test(String(o.unidad || ""))) continue;
    if (!esVisibleEnWeb_(o)) continue;
    o.categoria = inferirCategoria_(o);
    out.push(o);
  }

  out.sort(comparadorFechaReciente_);
  return out;
}

function getSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(HOJA_PUBLICACIONES);
  if (!sh) throw new Error("No existe la pestaña '" + HOJA_PUBLICACIONES + "'");
  return sh;
}

function esVisibleEnWeb_(o) {
  var est = normalizar_(o && o.estado);
  if (est === "borrador") return false;
  return true;
}

function payloadToRow_(p) {
  var estado = ESTADO_PUBLICABLE;
  return [
    val_(p.tipo),
    val_(p.titulo),
    val_(p.autores),
    val_(p.revista_o_medio),
    val_(p.doi),
    val_(p.anio),
    val_(p.unidad),
    val_(p.indexacion),
    val_(p.editorial),
    val_(p.isbn),
    val_(p.tipo_publicacion),
    val_(p.link),
    val_(p.evento),
    val_(p.lugar),
    val_(p.fecha),
    val_(p.resumen),
    val_(p.repositorio),
    estado
  ];
}

function rowAToObj_(row) {
  function g(i) {
    return row[i] != null ? String(row[i]).trim() : "";
  }
  var anio = g(5);
  if (/^\d{4}\/\d/.test(anio)) {
    try {
      anio = String(new Date(anio).getFullYear());
    } catch (_e) {}
  }
  return {
    tipo_origen: g(0),
    titulo: g(1),
    autores: g(2),
    revista_o_medio: g(3),
    doi: g(4),
    anio: anio,
    unidad: g(6),
    indexacion: g(7),
    editorial: g(8),
    isbn: g(9),
    tipo_publicacion: g(10),
    link: g(11),
    evento: g(12),
    lugar: g(13),
    fecha: g(14),
    resumen: g(15),
    repositorio: g(16),
    estado: g(17)
  };
}

function inferirCategoria_(o) {
  var t = normalizar_(o.tipo_origen);
  var tp = normalizar_(o.tipo_publicacion);
  if (t === "revista") return "revistas";
  if (t === "repositorio") return "repositorios";
  if (t === "evento") return "eventos";
  if (t === "diario") return "diarios";
  if (t === "libro" || t.indexOf("capitulo") >= 0) return "libros";
  if (tp.indexOf("libro") >= 0 || tp.indexOf("capitulo") >= 0) return "libros";
  if (o.doi && (o.revista_o_medio || t === "revista")) return "revistas";
  if (o.repositorio || t.indexOf("repo") === 0) return "repositorios";
  if (o.evento) return "eventos";
  if (o.resumen && o.revista_o_medio && !o.doi) return "diarios";
  return "otros";
}

function comparadorFechaReciente_(a, b) {
  var ya = parseNum_(a.anio);
  var yb = parseNum_(b.anio);
  if (yb !== ya) return yb - ya;
  return String(b.fecha || "").localeCompare(String(a.fecha || ""));
}

function parseNum_(s) {
  var n = parseInt(String(s || ""), 10);
  return isNaN(n) ? 0 : n;
}

function parseBody_(e) {
  var raw = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
  try {
    return JSON.parse(raw);
  } catch (_err) {
    return parseUrlEncoded_(raw);
  }
}

function parseUrlEncoded_(raw) {
  var out = {};
  if (!raw || String(raw).indexOf("=") < 0) return out;
  String(raw)
    .split("&")
    .forEach(function (pair) {
      var i = pair.indexOf("=");
      if (i < 0) return;
      var k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, " "));
      var v = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, " "));
      out[k] = v;
    });
  return out;
}

function mergePostParams_(e) {
  var out = {};
  var params = e && e.parameter ? e.parameter : {};
  var k;
  for (k in params) {
    if (params.hasOwnProperty(k)) out[k] = params[k];
  }
  var body = parseBody_(e);
  for (k in body) {
    if (body.hasOwnProperty(k)) out[k] = body[k];
  }
  return out;
}

var CONTACT_REDIRECT_OK =
  "https://claudiomlarrea.github.io/observatorio-ia/?enviado=1#contacto";
var CONTACT_REDIRECT_ERR =
  "https://claudiomlarrea.github.io/observatorio-ia/?enviado=0#contacto";

function handleContact_(p) {
  if (val_(p._gotcha)) {
    return contactResponse_(p, true);
  }

  var nombre = val_(p.nombre);
  var apellido = val_(p.apellido);
  var email = val_(p.email);
  var telefono = val_(p.telefono);
  var mensaje = val_(p.mensaje);

  if (!nombre || !email || !mensaje) {
    return contactResponse_(p, false, "required_fields");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return contactResponse_(p, false, "invalid_email");
  }

  var subject = "[Observatorio IA] Consulta desde la web";
  var body = [
    "Consulta desde el formulario de contacto del sitio web.",
    "",
    "Nombre: " + nombre + (apellido ? " " + apellido : ""),
    "Email: " + email,
    "Teléfono: " + (telefono || "(no indicado)"),
    "",
    "Mensaje:",
    mensaje
  ].join("\n");

  var logged = logContactToSheet_(nombre, apellido, email, telefono, mensaje);
  var mailed = sendContactEmail_(subject, body, email);

  if (mailed || logged) {
    return contactResponse_(p, true);
  }
  return contactResponse_(p, false, "send_failed");
}

function logContactToSheet_(nombre, apellido, email, telefono, mensaje) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName(HOJA_CONTACTOS);
    if (!sh) {
      sh = ss.insertSheet(HOJA_CONTACTOS);
      sh.appendRow([
        "Fecha",
        "Nombre",
        "Apellido",
        "Email",
        "Teléfono",
        "Mensaje"
      ]);
    }
    sh.appendRow([
      new Date(),
      nombre,
      apellido || "",
      email,
      telefono || "",
      mensaje
    ]);
    return true;
  } catch (err) {
    Logger.log("logContactToSheet_: " + err);
    return false;
  }
}

function sendContactEmail_(subject, body, replyToEmail) {
  var targets = [];
  if (CONTACT_COPY_TO) targets.push(CONTACT_COPY_TO);
  if (CONTACT_TO && targets.indexOf(CONTACT_TO) < 0) {
    targets.push(CONTACT_TO);
  }

  var i;
  for (i = 0; i < targets.length; i++) {
    if (sendContactEmailTo_(targets[i], subject, body, replyToEmail)) {
      return true;
    }
  }
  return false;
}

function sendContactEmailTo_(to, subject, body, replyToEmail) {
  var attempts = [];

  attempts.push(function () {
    GmailApp.sendEmail(to, subject, body);
  });
  if (replyToEmail) {
    attempts.push(function () {
      GmailApp.sendEmail(to, subject, body, { replyTo: replyToEmail });
    });
  }
  attempts.push(function () {
    MailApp.sendEmail(to, subject, body);
  });
  if (replyToEmail) {
    attempts.push(function () {
      MailApp.sendEmail({
        to: to,
        subject: subject,
        body: body,
        replyTo: replyToEmail
      });
    });
  }

  var j;
  for (j = 0; j < attempts.length; j++) {
    try {
      attempts[j]();
      return true;
    } catch (err) {
      Logger.log("sendContactEmailTo " + to + " intento " + (j + 1) + ": " + err);
    }
  }
  return false;
}

/** Sale del marco de script.google.com y vuelve al sitio en GitHub Pages. */
function contactRedirectHtml_(url) {
  var safe = String(url)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
  return (
    "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\">" +
    '<meta http-equiv="refresh" content="0;url=' +
    safe +
    '">' +
    "<script>var u=" +
    JSON.stringify(String(url)) +
    ";try{window.top.location.replace(u);}catch(e){window.location.replace(u);}</script>" +
    "</head><body><p>Volviendo al sitio del Observatorio…</p></body></html>"
  );
}

function contactResponse_(p, ok, errCode, errMsg) {
  if (val_(p._iframe) === "1") {
    var flag = ok ? "1" : "0";
    return HtmlService.createHtmlOutput(
      "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\"><script>" +
        "try{parent.postMessage({obsContact:'" +
        flag +
        "'},'*');}catch(e){}" +
        "</script></head><body></body></html>"
    ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  if (val_(p._redirect) === "1") {
    var url = ok ? CONTACT_REDIRECT_OK : CONTACT_REDIRECT_ERR;
    return HtmlService.createHtmlOutput(contactRedirectHtml_(url)).setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
  }
  if (ok) return json_({ ok: true });
  return json_({ ok: false, error: errCode || "error", message: errMsg || "" });
}

function param_(e, key, def) {
  var p = e && e.parameter ? e.parameter : {};
  return p[key] != null ? String(p[key]) : def;
}

function tieneHeader_(r0) {
  var c0 = normalizar_(r0 && r0[0]);
  return c0 === "tipo" || c0 === "categoria";
}

function val_(x) {
  return x == null ? "" : String(x).trim();
}

function normalizar_(x) {
  return String(x || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getEmail_() {
  try {
    return String(Session.getActiveUser().getEmail() || "").toLowerCase().trim();
  } catch (_e) {
    return "";
  }
}

function isAuthorized_(e) {
  var email = getEmail_();
  if (email && AUTHORIZED_EMAILS.indexOf(email) >= 0) return true;
  if (adminKeyFromRequest_(e) === ADMIN_ACCESS_KEY) return true;
  if (e) {
    var payload = mergePostParams_(e);
    if (val_(payload.key) === ADMIN_ACCESS_KEY) return true;
  }
  return false;
}

function adminKeyFromRequest_(e) {
  if (!e || !e.parameter) return "";
  return val_(e.parameter.key);
}

/** Visitas a las páginas en GitHub Pages (no a la sección Publicaciones). */
function registrarVisita_(site) {
  var props = PropertiesService.getScriptProperties();
  var sec = parseInt(props.getProperty("visitas_web_secretaria") || "0", 10) || 0;
  var obs = parseInt(props.getProperty("visitas_web_observatorio") || "0", 10) || 0;
  if (site === "secretaria") {
    sec++;
    props.setProperty("visitas_web_secretaria", String(sec));
  } else if (site === "observatorio") {
    obs++;
    props.setProperty("visitas_web_observatorio", String(obs));
  }
  return {
    ok: true,
    tipo: "paginas_web",
    secretaria: sec,
    observatorio: obs,
    paginas: {
      secretaria: "https://claudiomlarrea.github.io/secretaria-investigacion/",
      observatorio: "https://claudiomlarrea.github.io/observatorio-ia/"
    }
  };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function jsonOrJsonp_(obj, e) {
  var json = JSON.stringify(obj);
  var callback = param_(e, "callback", "");
  if (callback && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + "(" + json + ");").setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

var NOTICIAS_UCCUYO_API = "https://noticias.uccuyo.edu.ar/wp-json/wp/v2/posts";
var NOTICIAS_BUSQUEDAS_UCCUYO = [
  "observatorio inteligencia artificial",
  "observatorio de ia",
  "oia uccuyo",
  "boletin observatorio ia"
];
var NOTICIAS_GOOGLE_QUERIES = [
  '"Observatorio de Inteligencia Artificial" UCCuyo',
  '"Observatorio de IA" UCCuyo',
  "site:noticias.uccuyo.edu.ar observatorio inteligencia artificial"
];

function obtenerNoticiasMedios_() {
  var items = [];
  items = items.concat(fetchUccuyoNoticiasWp_());
  items = items.concat(fetchGoogleNewsRss_());
  items = items.concat(fetchPublicacionesMedios_());
  items = dedupeNoticias_(items);
  items = items.filter(function (it) {
    return !esMedioExcluidoNoticia_(it);
  });
  items.sort(comparadorNoticiaReciente_);
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    count: items.length,
    items: items
  };
}

function fetchUccuyoNoticiasWp_() {
  var out = [];
  var seen = {};
  NOTICIAS_BUSQUEDAS_UCCUYO.forEach(function (q) {
    try {
      var url =
        NOTICIAS_UCCUYO_API +
        "?search=" +
        encodeURIComponent(q) +
        "&per_page=20&_fields=id,date,link,title,excerpt";
      var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (resp.getResponseCode() !== 200) return;
      var posts = JSON.parse(resp.getContentText());
      if (!posts || !posts.length) return;
      posts.forEach(function (post) {
        var id = "uccuyo-" + post.id;
        if (seen[id]) return;
        var titulo = stripHtmlNoticia_(post.title && post.title.rendered);
        var excerpt = stripHtmlNoticia_(post.excerpt && post.excerpt.rendered);
        var texto = titulo + " " + excerpt;
        if (!esRelevanteOIA_(texto)) return;
        seen[id] = true;
        out.push({
          id: id,
          fuente: "Noticias UCCuyo",
          medio: "noticias.uccuyo.edu.ar",
          titulo: titulo,
          link: post.link,
          fecha: post.date,
          excerpt: excerpt,
          origen: "uccuyo_noticias"
        });
      });
    } catch (err) {
      Logger.log("fetchUccuyoNoticiasWp_: " + err);
    }
  });
  return out;
}

function fetchGoogleNewsRss_() {
  var out = [];
  var seen = {};
  NOTICIAS_GOOGLE_QUERIES.forEach(function (q) {
    try {
      var url =
        "https://news.google.com/rss/search?q=" +
        encodeURIComponent(q) +
        "&hl=es-419&gl=AR&ceid=AR:es-419";
      var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (resp.getResponseCode() !== 200) return;
      var doc = XmlService.parse(resp.getContentText());
      var channel = doc.getRootElement().getChild("channel");
      if (!channel) return;
      var rssItems = channel.getChildren("item");
      rssItems.forEach(function (item) {
        var rawTitle = item.getChildText("title") || "";
        var link = item.getChildText("link") || "";
        if (!link) return;
        var key = normalizarUrlNoticia_(link);
        if (seen[key]) return;
        var titulo = limpiarTituloGoogleNews_(rawTitle);
        var desc = stripHtmlNoticia_(item.getChildText("description") || "");
        var texto = titulo + " " + desc;
        if (!esRelevanteOIA_(texto)) return;
        seen[key] = true;
        var medio = extraerMedioGoogleNews_(rawTitle);
        out.push({
          id: "gnews-" + key.slice(0, 48),
          fuente: "Diario online",
          medio: medio,
          titulo: titulo,
          link: link,
          fecha: item.getChildText("pubDate") || "",
          excerpt: desc,
          origen: "google_news"
        });
      });
    } catch (err) {
      Logger.log("fetchGoogleNewsRss_: " + err);
    }
  });
  return out;
}

function fetchPublicacionesMedios_() {
  var values = getSheet_().getDataRange().getDisplayValues();
  if (!values.length) return [];
  var startIdx = tieneHeader_(values[0]) ? 1 : 0;
  var out = [];
  for (var i = startIdx; i < values.length; i++) {
    var o = rowAToObj_(values[i]);
    if (!esVisibleEnWeb_(o)) continue;
    if (!esPublicacionMedioOIA_(o)) continue;
    var cat = inferirCategoria_(o);
    var tipoNorm = normalizar_(o.tipo_origen);
    var esBoletin = tipoNorm.indexOf("boletin") >= 0 || normalizar_(o.tipo_publicacion).indexOf("boletin") >= 0;
    var link = val_(o.link);
    if (!link && o.doi) link = "https://doi.org/" + o.doi;
    if (!link) continue;
    out.push({
      id: "pub-" + i,
      fuente: esBoletin ? "Boletín" : "Medio registrado",
      medio: val_(o.revista_o_medio) || val_(o.unidad),
      titulo: val_(o.titulo),
      link: link,
      fecha: val_(o.fecha) || val_(o.anio),
      excerpt: val_(o.resumen),
      origen: esBoletin ? "boletin" : cat === "diarios" ? "diario_registrado" : "medio_registrado"
    });
  }
  return out;
}

function esPublicacionMedioOIA_(o) {
  var cat = inferirCategoria_(o);
  var tipoNorm = normalizar_(o.tipo_origen);
  var esBoletin = tipoNorm.indexOf("boletin") >= 0 || normalizar_(o.tipo_publicacion).indexOf("boletin") >= 0;
  if (cat !== "diarios" && !esBoletin) return false;
  var texto =
    val_(o.titulo) +
    " " +
    val_(o.resumen) +
    " " +
    val_(o.revista_o_medio) +
    " " +
    val_(o.unidad);
  if (PATRON_UNIDAD_OIA.test(val_(o.unidad))) return true;
  return esRelevanteOIA_(texto);
}

function esRelevanteOIA_(texto) {
  var t = normalizar_(texto);
  if (!t) return false;
  if (t.indexOf("observatorio de inteligencia artificial") >= 0) return true;
  if (t.indexOf("observatorio de ia") >= 0) return true;
  if (t.indexOf("observatorio de i.a") >= 0) return true;
  if (t.indexOf("oia de la uccuyo") >= 0) return true;
  if (t.indexOf("oia uccuyo") >= 0) return true;
  if (t.indexOf("observatorio") >= 0 && t.indexOf("inteligencia artificial") >= 0) return true;
  if (t.indexOf("observatorio") >= 0 && t.indexOf("uccuyo") >= 0 && /\bia\b/.test(t)) return true;
  return false;
}

function esMedioExcluidoNoticia_(item) {
  var blob = normalizar_(
    val_(item && item.medio) +
      " " +
      val_(item && item.link) +
      " " +
      val_(item && item.fuente) +
      " " +
      val_(item && item.titulo)
  );
  return blob.indexOf("diario de cuyo") >= 0 || blob.indexOf("diariodecuyo") >= 0;
}

function dedupeNoticias_(items) {
  var seen = {};
  var out = [];
  items.forEach(function (it) {
    var key = normalizarUrlNoticia_(it.link || it.id || "");
    if (!key || seen[key]) return;
    seen[key] = true;
    out.push(it);
  });
  return out;
}

function comparadorNoticiaReciente_(a, b) {
  return parseFechaNoticia_(b.fecha) - parseFechaNoticia_(a.fecha);
}

function parseFechaNoticia_(raw) {
  if (!raw) return 0;
  var s = String(raw).trim();
  if (/^\d{4}$/.test(s)) return parseInt(s, 10) * 10000;
  var t = Date.parse(s);
  return isNaN(t) ? 0 : t;
}

function normalizarUrlNoticia_(url) {
  return String(url || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/\?.*$/, "")
    .trim();
}

function stripHtmlNoticia_(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function limpiarTituloGoogleNews_(title) {
  var t = String(title || "").trim();
  var idx = t.lastIndexOf(" - ");
  if (idx > 0) return t.slice(0, idx).trim();
  return t;
}

function extraerMedioGoogleNews_(title) {
  var t = String(title || "").trim();
  var idx = t.lastIndexOf(" - ");
  if (idx > 0) return t.slice(idx + 3).trim();
  return "Google Noticias";
}

/** Ejecutar desde el editor (▶) para probar envío de correo y ver el error en Ejecuciones. */
function testContactEmail() {
  var ok = sendContactEmail_(
    "[Observatorio IA] Prueba manual",
    "Si recibís este correo, el formulario web puede enviar mensajes.",
    "test@example.com"
  );
  Logger.log("testContactEmail ok=" + ok);
}
