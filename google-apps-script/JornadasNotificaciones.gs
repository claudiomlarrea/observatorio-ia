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
 * Instalá UNA vez:
 * Ejecutar → instalarTriggersNotificacionesJornadas
 *
 * - Trigger cada 5 min: revisarCargasDriveJornadas (mails de artículos/PPT)
 * - Asegura trigger de catálogos cada 15 min si falta
 * - Forms solo si hay IDs configurados
 *
 * Luego: icono reloj (Activadores) a la izquierda → debe verse revisarCargasDriveJornadas.
 */
function instalarTriggersNotificacionesJornadas() {
  var handlers = ScriptApp.getProjectTriggers();
  var i;
  var hasCatalog = false;
  for (i = 0; i < handlers.length; i++) {
    var name = handlers[i].getHandlerFunction();
    if (
      name === "revisarCargasDriveJornadas" ||
      name === "onFormSubmitJornadas"
    ) {
      ScriptApp.deleteTrigger(handlers[i]);
    }
    if (name === "actualizarCatalogosJornadas") {
      hasCatalog = true;
    }
  }

  ScriptApp.newTrigger("revisarCargasDriveJornadas").timeBased().everyMinutes(5).create();

  if (!hasCatalog) {
    ScriptApp.newTrigger("actualizarCatalogosJornadas").timeBased().everyMinutes(15).create();
  }

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

  var pass = revisarCargasDriveJornadas();

  return {
    ok: true,
    driveTrigger: "revisarCargasDriveJornadas cada 5 min",
    catalogTrigger: hasCatalog
      ? "actualizarCatalogosJornadas (ya existía)"
      : "actualizarCatalogosJornadas cada 15 min (creado)",
    forms: forms,
    primeraPasada: pass,
    triggersAhora: listarTriggersJornadas_(),
    aviso:
      "Confirmá en Activadores (reloj) que figura revisarCargasDriveJornadas."
  };
}

/**
 * Ejecutar para ver si los activadores están instalados (registro de ejecución).
 */
function verificarTriggersNotificacionesJornadas() {
  var seenRaw =
    PropertiesService.getScriptProperties().getProperty(JORNADAS_PROP_SEEN) || "{}";
  var seen = {};
  try {
    seen = JSON.parse(seenRaw) || {};
  } catch (e) {
    seen = {};
  }
  return {
    ok: true,
    triggers: listarTriggersJornadas_(),
    seenCount: Object.keys(seen).length,
    seeded:
      PropertiesService.getScriptProperties().getProperty(JORNADAS_PROP_SEEDED) === "1"
  };
}

function listarTriggersJornadas_() {
  var handlers = ScriptApp.getProjectTriggers();
  var out = [];
  var i;
  for (i = 0; i < handlers.length; i++) {
    var t = handlers[i];
    out.push({
      funcion: t.getHandlerFunction(),
      tipo: String(t.getEventType()),
      fuente: String(t.getTriggerSource())
    });
  }
  return out;
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
 * Si llegó mail del artículo pero NO del PPT: olvidá las presentaciones
 * ya “marcadas” y volvé a avisar solo esas.
 */
function forzarAvisoPresentacionesJornadas() {
  return forzarAvisoPorKind_("presentacion");
}

/** Idem para artículos. */
function forzarAvisoArticulosJornadas() {
  return forzarAvisoPorKind_("articulo");
}

function forzarAvisoPorKind_(kind) {
  kind = String(kind || "");
  var props = PropertiesService.getScriptProperties();
  var prev = {};
  try {
    prev = JSON.parse(props.getProperty(JORNADAS_PROP_SEEN) || "{}") || {};
  } catch (e) {
    prev = {};
  }
  var entries =
    kind === "articulo"
      ? listarEntradas_(JORNADAS_ARTICULOS_FOLDER_ID, ARTICULOS_MIME_OK, "articulo")
      : listarEntradas_(
          JORNADAS_PRESENTACIONES_FOLDER_ID,
          PRESENTACIONES_MIME_OK,
          "presentacion"
        );
  var i;
  for (i = 0; i < entries.length; i++) {
    if (entries[i] && entries[i].fileId) {
      delete prev[String(entries[i].fileId)];
    }
  }
  props.setProperty(JORNADAS_PROP_SEEN, JSON.stringify(prev));
  props.setProperty(JORNADAS_PROP_SEEDED, "1");
  var result = revisarCargasDriveJornadas();
  result.forzado = kind;
  result.olvidados = entries.length;
  return result;
}

/**
 * Diagnóstico: qué ve el script en cada carpeta (sin mandar mails).
 */
function diagnosticarCargasDriveJornadas() {
  var arts = listarEntradas_(JORNADAS_ARTICULOS_FOLDER_ID, ARTICULOS_MIME_OK, "articulo");
  var ppts = listarEntradas_(
    JORNADAS_PRESENTACIONES_FOLDER_ID,
    PRESENTACIONES_MIME_OK,
    "presentacion"
  );
  var props = PropertiesService.getScriptProperties();
  var prev = {};
  try {
    prev = JSON.parse(props.getProperty(JORNADAS_PROP_SEEN) || "{}") || {};
  } catch (e) {
    prev = {};
  }
  function mapItems(list) {
    return list.map(function (x) {
      return {
        title: x.title,
        fileName: x.fileName,
        fileId: x.fileId,
        mime: x.mime,
        yaVisto: !!prev[String(x.fileId)]
      };
    });
  }
  return {
    ok: true,
    articulos: mapItems(arts),
    presentaciones: mapItems(ppts),
    seeded: props.getProperty(JORNADAS_PROP_SEEDED) === "1",
    seenTotal: Object.keys(prev).length
  };
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
 * Diff de archivos vs última corrida.
 * IMPORTANTE: solo marca “visto” DESPUÉS de enviar el mail.
 * Si se marcaba antes, un fallo de MailApp dejaba el archivo silenciado para siempre
 * (y solo reaparecía al forzar notificarTodasLasCargasActualesJornadas).
 */
function notificarNuevasCargasDriveJornadas_(arts, ppts) {
  arts = arts || [];
  ppts = ppts || [];

  var lock = LockService.getScriptLock();
  var gotLock = false;
  try {
    gotLock = lock.tryLock(30000);
  } catch (ignoreLock) {
    gotLock = false;
  }

  try {
    var props = PropertiesService.getScriptProperties();
    var prev = {};
    try {
      prev = JSON.parse(props.getProperty(JORNADAS_PROP_SEEN) || "{}") || {};
    } catch (errParse) {
      prev = {};
    }
    var seeded = props.getProperty(JORNADAS_PROP_SEEDED) === "1";
    var recentCutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;

    var currentIds = {};
    var nuevos = [];
    var i;
    for (i = 0; i < arts.length; i++) {
      collectEntrada_(
        arts[i],
        "artículo científico",
        prev,
        currentIds,
        seeded,
        recientesOk_(arts[i], recentCutoff),
        nuevos
      );
    }
    for (i = 0; i < ppts.length; i++) {
      collectEntrada_(
        ppts[i],
        "presentación PowerPoint",
        prev,
        currentIds,
        seeded,
        recientesOk_(ppts[i], recentCutoff),
        nuevos
      );
    }

    var enviados = [];
    var fallidos = [];
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
      try {
        enviarNotificacionJornadas_(
          "[Jornadas IA] Nueva carga — " + n.tipo,
          cuerpo
        );
        enviados.push(n.fileId);
      } catch (errSend) {
        fallidos.push({ id: n.fileId, error: String(errSend) });
        Logger.log("Jornadas notify fail " + n.fileId + ": " + errSend);
      }
    }

    // Vistos = previos que siguen + actuales que no fallaron el mail (o no pedían mail)
    var next = {};
    var id;
    for (id in currentIds) {
      if (!currentIds.hasOwnProperty(id)) continue;
      var failed = false;
      for (i = 0; i < fallidos.length; i++) {
        if (fallidos[i].id === id) {
          failed = true;
          break;
        }
      }
      if (failed) continue; // reintentar en la próxima corrida
      next[id] = true;
    }
    // Conservar ids previos ya notificados aunque salgan de la carpeta
    for (id in prev) {
      if (prev.hasOwnProperty(id)) next[id] = true;
    }

    props.setProperty(JORNADAS_PROP_SEEN, JSON.stringify(next));
    props.setProperty(JORNADAS_PROP_SEEDED, "1");

    return {
      ok: fallidos.length === 0,
      seeded: seeded,
      justSeeded: !seeded,
      nuevos: nuevos.length,
      enviados: enviados.length,
      fallidos: fallidos,
      items: nuevos
    };
  } finally {
    if (gotLock) {
      try {
        lock.releaseLock();
      } catch (ignoreRelease) {}
    }
  }
}

function recientesOk_(entry, recentCutoff) {
  if (!entry || !entry.fileId) return false;
  try {
    var f = DriveApp.getFileById(String(entry.fileId));
    var t = Math.max(f.getLastUpdated().getTime(), f.getDateCreated().getTime());
    return t >= recentCutoff;
  } catch (e) {
    return true; // si no se puede leer fecha, mejor avisar
  }
}

/**
 * Decide si un archivo debe generar mail.
 * currentIds: todos los ids actuales (para el set “visto”).
 */
function collectEntrada_(entry, tipoLabel, prev, currentIds, seeded, isRecent, nuevos) {
  if (!entry || !entry.fileId) return;
  var id = String(entry.fileId);
  currentIds[id] = true;
  var avisar = false;
  if (prev[id]) return; // ya notificado
  if (!seeded) {
    avisar = !!isRecent; // primera vez: solo recientes
  } else {
    avisar = true; // nuevo fileId
  }
  if (!avisar) return;
  nuevos.push({
    tipo: tipoLabel,
    title: entry.title || entry.fileName || id,
    author: entry.author || "",
    area: entry.area || "",
    fileName: entry.fileName || "",
    fileId: id
  });
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
