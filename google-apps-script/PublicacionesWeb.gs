/**
 * Publicaciones OIA - API pública + panel privado con whitelist.
 *
 * Endpoints:
 * - GET  ?action=public (o sin action): JSON para la web pública.
 * - GET  ?action=admin: panel HTML de carga (solo emails autorizados).
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

var ADMIN_ACCESS_KEY = "OIA-Privado-2026";

var AUTHORIZED_EMAILS = [
  "claudio.larrea@hotmail.com",
  "investigacion@uccuyo.edu.ar",
  "observatorioia@uccuyo.edu.ar",
  "barias@uccuyo.edu.ar",
  "vincutec@uccuyo.edu.ar",
  "asistente.inv@uccuyo.edu.ar",
  "jose.lamalfa@uccuyosl.edu.ar",
  "laurapizarro92@gmail.com",
  "lpizarro@uccuyo.edu.ar"
];

function doGet(e) {
  var action = param_(e, "action", "public");
  if (action === "admin") {
    return renderAdmin_(e);
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
  return HtmlService.createHtmlOutput(contactRedirectHtml_(panelAdminReturnUrl_(ok, message, payload))).setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL
  );
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
    return { ok: true, message: "Guardado" };
  } catch (err) {
    return { ok: false, message: String(err) };
  }
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

function renderAdmin_(e) {
  if (!isAuthorized_(e)) {
    return HtmlService.createHtmlOutput(
      "<h3>Acceso denegado</h3><p>Tu email no está autorizado para cargar publicaciones.</p>"
    ).setTitle("OIA - Acceso denegado");
  }
  var t = HtmlService.createTemplateFromFile("PublicacionesAdmin");
  t.apiUrl = ScriptApp.getService().getUrl();
  t.adminKey = adminKeyFromRequest_(e);
  return t
    .evaluate()
    .setTitle("OIA - Carga privada")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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
    if (normalizar_(o.estado) === "borrador") continue;
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

function payloadToRow_(p) {
  var estado = normalizar_(p.estado) === ESTADO_PUBLICABLE ? ESTADO_PUBLICABLE : "borrador";
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
    estado: g(17) || "borrador"
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

/** Ejecutar desde el editor (▶) para probar envío de correo y ver el error en Ejecuciones. */
function testContactEmail() {
  var ok = sendContactEmail_(
    "[Observatorio IA] Prueba manual",
    "Si recibís este correo, el formulario web puede enviar mensajes.",
    "test@example.com"
  );
  Logger.log("testContactEmail ok=" + ok);
}
