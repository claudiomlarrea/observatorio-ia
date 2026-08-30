/**
 * Notificaciones Jornadas IA 2026 — mismo criterio que Consejo de Investigación.
 *
 * Cuando alguien se inscribe (asistente / expositor) o carga artículo / PowerPoint,
 * el aviso llega SOLO a Secretaría de Investigación y al equipo listado abajo.
 * NO se envía a correos del Observatorio de IA.
 *
 * Pegá este archivo en el MISMO proyecto Apps Script que JornadasCatalogos.gs
 * (cuenta investigacion@uccuyo.edu.ar). Ver PEGAR-JORNADAS-NOTIFICACIONES.txt
 */

/** Destinatarios (Consejo / Investigación). Sin observatorioia@ ni miembros OIA. */
var JORNADAS_NOTIFY_TO = [
  "investigacion@uccuyo.edu.ar",
  "jose.lamalfa@uccuyosl.edu.ar",
  "vincutec@uccuyo.edu.ar",
  "asistente.inv@uccuyo.edu.ar",
  "phd.ariasv@gmail.com",
  "laurapizarro92@gmail.com"
];

/**
 * IDs de edición de los Forms (URL …/forms/d/ESTE_ID/edit).
 * También se pueden guardar con configurarFormIdsJornadas_("idAsist", "idExpo").
 */
var JORNADAS_FORM_ASISTENTES_ID = "";
var JORNADAS_FORM_EXPOSITORES_ID = "";

var JORNADAS_SITE_URL = "https://observatorio-ia.uccuyo.edu.ar/#jornadas-ia";
var JORNADAS_PROP_SEEN = "jornadas_notify_seen_ids";
var JORNADAS_PROP_SEEDED = "jornadas_notify_seeded";
var JORNADAS_PROP_FORM_ASIST = "jornadas_form_asistentes_id";
var JORNADAS_PROP_FORM_EXPO = "jornadas_form_expositores_id";

/**
 * Prueba: Ejecutar → probarNotificacionJornadas
 */
function probarNotificacionJornadas() {
  enviarNotificacionJornadas_(
    "[Prueba] Notificaciones Jornadas IA 2026",
    "Este es un correo de prueba del sistema de alertas de las Jornadas de IA.\n\n" +
      "Si lo recibís, la lista de destinatarios está bien configurada.\n\n" +
      "Sitio: " +
      JORNADAS_SITE_URL +
      "\n"
  );
  return { ok: true, to: JORNADAS_NOTIFY_TO.slice() };
}

/**
 * Guardá los IDs de los Forms (una vez) y luego ejecutá instalarTriggersNotificacionesJornadas.
 * Ejemplo:
 *   configurarFormIdsJornadas_("1AbC…", "1XyZ…");
 */
function configurarFormIdsJornadas_(asistentesFormId, expositoresFormId) {
  var props = PropertiesService.getScriptProperties();
  if (asistentesFormId) {
    props.setProperty(JORNADAS_PROP_FORM_ASIST, String(asistentesFormId).trim());
  }
  if (expositoresFormId) {
    props.setProperty(JORNADAS_PROP_FORM_EXPO, String(expositoresFormId).trim());
  }
  return {
    ok: true,
    asistentes: props.getProperty(JORNADAS_PROP_FORM_ASIST) || "",
    expositores: props.getProperty(JORNADAS_PROP_FORM_EXPO) || ""
  };
}

/**
 * Instalá UNA vez (después de configurar IDs de Forms):
 * Ejecutar → instalarTriggersNotificacionesJornadas
 *
 * - Trigger horario cada 15 min para cargas nuevas en Drive (artículos / PPT)
 * - Triggers onFormSubmit para asistentes y expositores (si hay IDs)
 */
function instalarTriggersNotificacionesJornadas() {
  var handlers = ScriptApp.getProjectTriggers();
  var i;
  for (i = 0; i < handlers.length; i++) {
    var name = handlers[i].getHandlerFunction();
    if (
      name === "revisarCargasDriveJornadas" ||
      name === "onFormSubmitJornadas"
    ) {
      ScriptApp.deleteTrigger(handlers[i]);
    }
  }

  ScriptApp.newTrigger("revisarCargasDriveJornadas").timeBased().everyMinutes(15).create();

  var asistId = formIdAsistentes_();
  var expoId = formIdExpositores_();
  var forms = [];
  if (asistId) {
    ScriptApp.newTrigger("onFormSubmitJornadas").forForm(asistId).onFormSubmit().create();
    forms.push("asistentes:" + asistId);
  }
  if (expoId) {
    ScriptApp.newTrigger("onFormSubmitJornadas").forForm(expoId).onFormSubmit().create();
    forms.push("expositores:" + expoId);
  }

  // Primera pasada: marca archivos actuales sin mandar correo de histórico
  revisarCargasDriveJornadas();

  return {
    ok: true,
    driveTrigger: "revisarCargasDriveJornadas cada 15 min",
    forms: forms,
    aviso:
      forms.length < 2
        ? "Falta configurar IDs de Forms (configurarFormIdsJornadas_). Drive ya queda cubierto."
        : "Forms y Drive listos."
  };
}

/**
 * Trigger horario / manual: avisa por cada archivo NUEVO en carpetas de carga.
 * También lo invoca actualizarCatalogosJornadas al regenerar PDF.
 */
function revisarCargasDriveJornadas() {
  var arts = listarEntradas_(JORNADAS_ARTICULOS_FOLDER_ID, ARTICULOS_MIME_OK, "articulo");
  var ppts = listarEntradas_(
    JORNADAS_PRESENTACIONES_FOLDER_ID,
    PRESENTACIONES_MIME_OK,
    "presentacion"
  );
  return notificarNuevasCargasDriveJornadas_(arts, ppts);
}

/**
 * Una sola vez si subiste archivos y no llegó mail:
 * trata TODO lo que hay hoy en las carpetas como “nuevo” y avisa.
 * (Puede reenviar aviso de archivos viejos si ya estaban.)
 */
function notificarTodasLasCargasActualesJornadas() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty(JORNADAS_PROP_SEEDED, "1");
  props.setProperty(JORNADAS_PROP_SEEN, "{}");
  return revisarCargasDriveJornadas();
}

/**
 * Reinicia el seguimiento: la próxima corrida siembra sin mails;
 * a partir de ahí solo avisa archivos realmente nuevos.
 */
function reiniciarSeguimientoCargasJornadas() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(JORNADAS_PROP_SEEN);
  props.deleteProperty(JORNADAS_PROP_SEEDED);
  return revisarCargasDriveJornadas();
}

/**
 * Trigger de Google Forms (asistentes o expositores).
 */
function onFormSubmitJornadas(e) {
  e = e || {};
  var form = e.source;
  var formId = "";
  try {
    formId = form && form.getId ? String(form.getId()) : "";
  } catch (ignoreId) {}

  var tipo = "inscripción";
  if (formId && formId === formIdAsistentes_()) tipo = "asistente";
  else if (formId && formId === formIdExpositores_()) tipo = "expositor";
  else {
    try {
      var title = form && form.getTitle ? String(form.getTitle() || "") : "";
      if (/expositor/i.test(title)) tipo = "expositor";
      else if (/asistente/i.test(title)) tipo = "asistente";
    } catch (ignoreTitle) {}
  }

  var lines = [];
  lines.push("Nueva inscripción a las 1° Jornadas internas de Inteligencia Artificial 2026.");
  lines.push("");
  lines.push("Tipo: " + tipo);
  lines.push("Fecha: " + Utilities.formatDate(new Date(), "America/Argentina/Buenos_Aires", "dd/MM/yyyy HH:mm"));

  try {
    var email = e.response && e.response.getRespondentEmail ? e.response.getRespondentEmail() : "";
    if (email) lines.push("Correo del/la encuestado/a: " + email);
  } catch (ignoreEmail) {}

  lines.push("");
  lines.push("Respuestas:");
  try {
    var items = e.response.getItemResponses();
    var i;
    for (i = 0; i < items.length; i++) {
      var q = items[i].getItem().getTitle();
      var a = items[i].getResponse();
      if (Object.prototype.toString.call(a) === "[object Array]") a = a.join(", ");
      lines.push("- " + q + ": " + a);
    }
  } catch (ignoreItems) {
    lines.push("(No se pudieron leer las respuestas individuales.)");
  }

  lines.push("");
  lines.push("Ver sección Jornadas: " + JORNADAS_SITE_URL);

  var asunto =
    tipo === "expositor"
      ? "[Jornadas IA] Nueva inscripción — expositor/a"
      : tipo === "asistente"
        ? "[Jornadas IA] Nueva inscripción — asistente"
        : "[Jornadas IA] Nueva inscripción";

  enviarNotificacionJornadas_(asunto, lines.join("\n"));
}

/**
 * Diff de archivos vs última corrida. Primera vez solo “siembra” (sin mail histórico).
 * Llamado desde JornadasCatalogos.actualizarCatalogosJornadas.
 */
function notificarNuevasCargasDriveJornadas_(arts, ppts) {
  arts = arts || [];
  ppts = ppts || [];
  var props = PropertiesService.getScriptProperties();
  var prev = {};
  try {
    prev = JSON.parse(props.getProperty(JORNADAS_PROP_SEEN) || "{}") || {};
  } catch (errParse) {
    prev = {};
  }
  var seeded = props.getProperty(JORNADAS_PROP_SEEDED) === "1";

  var next = {};
  var nuevos = [];
  var i;
  for (i = 0; i < arts.length; i++) {
    markEntrada_(arts[i], "artículo científico", prev, next, seeded, nuevos);
  }
  for (i = 0; i < ppts.length; i++) {
    markEntrada_(ppts[i], "presentación PowerPoint", prev, next, seeded, nuevos);
  }

  props.setProperty(JORNADAS_PROP_SEEN, JSON.stringify(next));
  if (!seeded) {
    props.setProperty(JORNADAS_PROP_SEEDED, "1");
    return { ok: true, seeded: true, nuevos: 0 };
  }

  for (i = 0; i < nuevos.length; i++) {
    var n = nuevos[i];
    var cuerpo =
      "Se cargó un nuevo archivo en las Jornadas de IA 2026.\n\n" +
      "Tipo: " +
      n.tipo +
      "\n" +
      "Título / nombre: " +
      n.title +
      "\n" +
      (n.author ? "Autor/expositor: " + n.author + "\n" : "") +
      (n.area ? "Área: " + n.area + "\n" : "") +
      "Archivo: " +
      n.fileName +
      "\n" +
      (n.fileId
        ? "Enlace Drive: https://drive.google.com/file/d/" + n.fileId + "/view\n"
        : "") +
      "\nSección Jornadas: " +
      JORNADAS_SITE_URL +
      "\n";
    enviarNotificacionJornadas_(
      "[Jornadas IA] Nueva carga — " + n.tipo,
      cuerpo
    );
  }

  return { ok: true, seeded: false, nuevos: nuevos.length, items: nuevos };
}

function markEntrada_(entry, tipoLabel, prev, next, seeded, nuevos) {
  if (!entry || !entry.fileId) return;
  var id = String(entry.fileId);
  next[id] = true;
  if (seeded && !prev[id]) {
    nuevos.push({
      tipo: tipoLabel,
      title: entry.title || entry.fileName || id,
      author: entry.author || "",
      area: entry.area || "",
      fileName: entry.fileName || "",
      fileId: id
    });
  }
}

function formIdAsistentes_() {
  var fromProp = PropertiesService.getScriptProperties().getProperty(JORNADAS_PROP_FORM_ASIST);
  return String(fromProp || JORNADAS_FORM_ASISTENTES_ID || "").trim();
}

function formIdExpositores_() {
  var fromProp = PropertiesService.getScriptProperties().getProperty(JORNADAS_PROP_FORM_EXPO);
  return String(fromProp || JORNADAS_FORM_EXPOSITORES_ID || "").trim();
}

function enviarNotificacionJornadas_(subject, body) {
  var to = JORNADAS_NOTIFY_TO.join(", ");
  var footer =
    "\n—\nSistema de alertas · Jornadas IA 2026\n" +
    "Destinatarios: Secretaría de Investigación / equipo (no Observatorio IA).\n";
  var text = String(body || "") + footer;
  var ok = false;
  try {
    MailApp.sendEmail({
      to: to,
      subject: String(subject || "[Jornadas IA]"),
      body: text
    });
    ok = true;
  } catch (errMail) {
    try {
      GmailApp.sendEmail(to, String(subject || "[Jornadas IA]"), text);
      ok = true;
    } catch (errGmail) {
      throw new Error(
        "No se pudo enviar notificación Jornadas: " +
          String(errMail) +
          " / " +
          String(errGmail)
      );
    }
  }
  return ok;
}
