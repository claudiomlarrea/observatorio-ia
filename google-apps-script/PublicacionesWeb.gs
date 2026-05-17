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
var SOLO_FILA_OBSERVATORIO = true;
var PATRON_UNIDAD_OIA = /OIA|Observatorio de Inteligencia Artificial/i;
var ESTADO_PUBLICABLE = "publicado";

var AUTHORIZED_EMAILS = [
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
    return renderAdmin_();
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
  if (!isAuthorized_()) return json_({ ok: false, error: "unauthorized" });

  var row = payloadToRow_(payload);

  if (!row[0] || !row[1] || !row[6]) {
    return json_({ ok: false, error: "required_fields", message: "tipo, titulo y unidad son obligatorios" });
  }

  getSheet_().appendRow(row);
  return json_({ ok: true });
}

function renderAdmin_() {
  if (!isAuthorized_()) {
    return HtmlService.createHtmlOutput(
      "<h3>Acceso denegado</h3><p>Tu email no está autorizado para cargar publicaciones.</p>"
    ).setTitle("OIA - Acceso denegado");
  }
  return HtmlService.createHtmlOutputFromFile("PublicacionesAdmin").setTitle("OIA - Carga privada");
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
    if (normalizar_(o.estado) !== ESTADO_PUBLICABLE) continue;
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
    return {};
  }
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

  if (sendContactEmail_(subject, body, email)) {
    return contactResponse_(p, true);
  }
  return contactResponse_(p, false, "send_failed");
}

function sendContactEmail_(subject, body, replyToEmail) {
  var toList = [CONTACT_TO];
  if (CONTACT_COPY_TO && CONTACT_COPY_TO !== CONTACT_TO) {
    toList.push(CONTACT_COPY_TO);
  }
  var to = toList.join(",");

  var attempts = [
    function () {
      GmailApp.sendEmail(to, subject, body, { replyTo: replyToEmail });
    },
    function () {
      MailApp.sendEmail({
        to: to,
        subject: subject,
        body: body,
        replyTo: replyToEmail
      });
    },
    function () {
      MailApp.sendEmail(to, subject, body);
    }
  ];

  for (var i = 0; i < attempts.length; i++) {
    try {
      attempts[i]();
      return true;
    } catch (err) {
      Logger.log("sendContactEmail intento " + (i + 1) + ": " + err);
    }
  }
  return false;
}

function contactResponse_(p, ok, errCode, errMsg) {
  if (val_(p._redirect) === "1") {
    var url = ok ? CONTACT_REDIRECT_OK : CONTACT_REDIRECT_ERR;
    return HtmlService.createHtmlOutput(
      "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\">" +
        "<meta http-equiv=\"refresh\" content=\"0;url=" +
        url +
        "\">" +
        "</head><body><p>Redirigiendo…</p></body></html>"
    ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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

function isAuthorized_() {
  var email = getEmail_();
  return email && AUTHORIZED_EMAILS.indexOf(email) >= 0;
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
