/**
 * Panel de edición del programa — acceso por correo Google (lista blanca).
 *
 * Pegá este archivo + JornadasProgramaEditor.html en el proyecto
 * OIA · Catálogos Jornadas IA (junto a JornadasPrograma.gs).
 *
 * Implementación web app:
 *   Ejecutar como: Usuario que accede a la aplicación web
 *   Quién tiene acceso: Cualquier usuario de una cuenta de Google
 *   (Si está en «Ejecutar como: Yo», el correo llega vacío.)
 *
 * Lista blanca (podés ampliar con agregarEditorPrograma_("mail@…")):
 *   investigacion@uccuyo.edu.ar
 *   asistente.inv@uccuyo.edu.ar
 *   observatorioia@uccuyo.edu.ar
 *
 * Abrir: …/exec?action=editar_programa
 */

var JORNADAS_PROP_PROGRAMA_MANUAL = "jornadas_programa_manual";
var JORNADAS_PROP_EDITORES = "jornadas_programa_editores_json";

/** Correos iniciales del equipo (minúsculas). */
var JORNADAS_EDITORES_DEFAULT = [
  "investigacion@uccuyo.edu.ar",
  "asistente.inv@uccuyo.edu.ar",
  "observatorioia@uccuyo.edu.ar"
];

function servirEditorProgramaHtml_() {
  var t = HtmlService.createTemplateFromFile("JornadasProgramaEditor");
  t.sitioUrl = "https://observatorio-ia.uccuyo.edu.ar/#jornadas-ia";
  t.email = emailUsuarioEditor_() || "";
  t.autorizado = !!editorProgramaAutorizado_();
  return t
    .evaluate()
    .setTitle("Editar programa · Jornadas IA 2026")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Agregar un correo a la lista blanca (ejecutar a mano en Apps Script).
 * Ejemplo: agregarEditorPrograma_("juan@uccuyo.edu.ar");
 */
function agregarEditorPrograma_(email) {
  email = normalizarEmailEditor_(email);
  if (!email || email.indexOf("@") < 0) {
    throw new Error("Email inválido");
  }
  var list = cargarEditoresPrograma_();
  if (list.indexOf(email) < 0) list.push(email);
  PropertiesService.getScriptProperties().setProperty(
    JORNADAS_PROP_EDITORES,
    JSON.stringify(list)
  );
  return { ok: true, editores: list };
}

/** Quitar un correo de la lista blanca. */
function quitarEditorPrograma_(email) {
  email = normalizarEmailEditor_(email);
  var list = cargarEditoresPrograma_().filter(function (e) {
    return e !== email;
  });
  PropertiesService.getScriptProperties().setProperty(
    JORNADAS_PROP_EDITORES,
    JSON.stringify(list)
  );
  return { ok: true, editores: list };
}

function listarEditoresPrograma() {
  exigirEditorPrograma_();
  return { ok: true, editores: cargarEditoresPrograma_() };
}

/** google.script.run — estado inicial / refresco */
function editorProgramaCargar() {
  if (!editorProgramaAutorizado_()) {
    return {
      ok: false,
      error:
        "No autorizado. Entrá con un correo del equipo del Observatorio (Google).",
      email: emailUsuarioEditor_() || "",
      autorizado: false
    };
  }
  return payloadEditorOk_();
}

/**
 * google.script.run — guardar ítems (modo manual).
 * items: array formato sitio (#jornadas-ia).
 */
function editorProgramaGuardar(items) {
  exigirEditorPrograma_();
  try {
    var published = publicarProgramaManualDesdeItems_(items || []);
    return {
      ok: true,
      manual: true,
      email: emailUsuarioEditor_(),
      updatedAt: published.updatedAt,
      items: published.items,
      message:
        "Programa guardado por " +
        emailUsuarioEditor_() +
        ". Sitio y agenda en modo manual."
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/** google.script.run — regenerar desde Drive (sale del modo manual) */
function editorProgramaDesdeDrive() {
  exigirEditorPrograma_();
  try {
    PropertiesService.getScriptProperties().setProperty(
      JORNADAS_PROP_PROGRAMA_MANUAL,
      "0"
    );
    var arts = listarEntradas_(JORNADAS_ARTICULOS_FOLDER_ID, ARTICULOS_MIME_OK, "articulo");
    var ppts = listarEntradas_(
      JORNADAS_PRESENTACIONES_FOLDER_ID,
      PRESENTACIONES_MIME_OK,
      "presentacion"
    );
    var sync = sincronizarProgramaDesdeCatalogos_(arts, ppts);
    var data = obtenerProgramaSitio_();
    return {
      ok: true,
      manual: false,
      email: emailUsuarioEditor_(),
      updatedAt: (data && data.updatedAt) || "",
      items: (data && data.items) || [],
      sync: sync,
      message: "Programa regenerado desde Drive (modo automático)."
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function payloadEditorOk_() {
  var data = obtenerProgramaSitio_();
  return {
    ok: true,
    autorizado: true,
    email: emailUsuarioEditor_(),
    manual: esProgramaManual_(),
    updatedAt: (data && data.updatedAt) || "",
    source: (data && data.source) || "",
    items: (data && data.items) || []
  };
}

function esProgramaManual_() {
  return (
    PropertiesService.getScriptProperties().getProperty(JORNADAS_PROP_PROGRAMA_MANUAL) ===
    "1"
  );
}

function exigirEditorPrograma_() {
  if (!editorProgramaAutorizado_()) {
    throw new Error(
      "No autorizado. Usá un correo de la lista blanca del Observatorio."
    );
  }
}

function editorProgramaAutorizado_() {
  var email = emailUsuarioEditor_();
  if (!email) return false;
  var list = cargarEditoresPrograma_();
  return list.indexOf(email) >= 0;
}

function emailUsuarioEditor_() {
  try {
    var a = Session.getActiveUser() && Session.getActiveUser().getEmail();
    if (a) return normalizarEmailEditor_(a);
  } catch (ignore) {}
  try {
    var e = Session.getEffectiveUser() && Session.getEffectiveUser().getEmail();
    if (e) return normalizarEmailEditor_(e);
  } catch (ignore2) {}
  return "";
}

function normalizarEmailEditor_(s) {
  return String(s || "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function cargarEditoresPrograma_() {
  var raw = PropertiesService.getScriptProperties().getProperty(JORNADAS_PROP_EDITORES);
  var list = [];
  if (raw) {
    try {
      list = JSON.parse(raw) || [];
    } catch (e) {
      list = [];
    }
  }
  if (!list.length) list = JORNADAS_EDITORES_DEFAULT.slice();
  var seen = {};
  var out = [];
  var i;
  for (i = 0; i < list.length; i++) {
    var em = normalizarEmailEditor_(list[i]);
    if (!em || seen[em]) continue;
    seen[em] = true;
    out.push(em);
  }
  // Sembrar defaults si la prop estaba vacía
  if (!raw) {
    PropertiesService.getScriptProperties().setProperty(
      JORNADAS_PROP_EDITORES,
      JSON.stringify(out)
    );
  }
  return out;
}

/**
 * Publica items del panel: bloques fijos al inicio, recalcula horas
 * de ponencias, escribe sitio + agenda, activa modo manual.
 */
function publicarProgramaManualDesdeItems_(itemsIn) {
  itemsIn = itemsIn || [];
  var fijos = [];
  var ponencias = [];
  var i;
  for (i = 0; i < itemsIn.length; i++) {
    var it = normalizarItemEditor_(itemsIn[i]);
    if (!it) continue;
    if (it.tipo === "apertura" || it.tipo === "indicaciones") {
      fijos.push(it);
    } else {
      it.tipo = "ponencia";
      ponencias.push(it);
    }
  }

  if (!fijos.length) {
    fijos = bloquesFijosPrograma_();
  } else {
    var baseFijos = bloquesFijosPrograma_();
    for (i = 0; i < fijos.length && i < baseFijos.length; i++) {
      fijos[i].hora = baseFijos[i].hora;
      fijos[i].horaFin = baseFijos[i].horaFin;
      fijos[i].orden = baseFijos[i].orden;
      fijos[i].sala = JORNADAS_SALA;
      if (!fijos[i].tipo) fijos[i].tipo = baseFijos[i].tipo;
    }
  }

  var cursorMin = horaAMinutos_(JORNADAS_PONENCIA_INICIO);
  var orden = fijos.length;
  for (i = 0; i < ponencias.length; i++) {
    orden += 1;
    ponencias[i].orden = orden;
    ponencias[i].hora = minutosAHora_(cursorMin);
    ponencias[i].horaFin = minutosAHora_(cursorMin + JORNADAS_PONENCIA_MINUTOS);
    ponencias[i].sala = JORNADAS_SALA;
    ponencias[i].rol = ponencias[i].rol || "Expositor/a";
    if (!ponencias[i].clave) {
      ponencias[i].clave = normalizarClavePrograma_(
        ponencias[i].persona || ponencias[i].titulo || "ponencia-" + orden
      );
    }
    cursorMin += JORNADAS_PONENCIA_MINUTOS;
  }

  var items = fijos.concat(ponencias);
  for (i = 0; i < items.length; i++) {
    items[i].orden = i + 1;
  }

  var sesiones = itemsASesionesAgenda_(items);
  var updatedAt = new Date().toISOString();
  var prev = null;
  try {
    prev = obtenerProgramaSitio_();
  } catch (ignore) {}

  var site = {
    ok: true,
    source: "manual",
    editedBy: emailUsuarioEditor_() || "",
    updatedAt: updatedAt,
    version: updatedAt.slice(0, 10),
    estado: hayProvisionalEnItems_(items) ? "provisorio" : "confirmado",
    evento: (prev && prev.evento) || {
      titulo: "1° Jornadas internas de Inteligencia Artificial",
      fecha: JORNADAS_EVENTO_DIA,
      fechaTexto: "6 de octubre de 2026",
      horaInicio: "15:00",
      modalidad: "Virtual",
      minutosPorPonencia: JORNADAS_PONENCIA_MINUTOS,
      formatoSalas: "una_sala",
      notaFormato:
        "Por ahora una sola sala virtual. Se evaluará dividir en dos salas si al cierre de expositores hay 14 o más ponencias confirmadas."
    },
    items: items
  };

  var agendaPrev = null;
  try {
    agendaPrev = obtenerProgramaAgenda_();
  } catch (ignore2) {}

  var agenda = {
    ok: true,
    source: "manual",
    editedBy: emailUsuarioEditor_() || "",
    updatedAt: updatedAt,
    meta: (agendaPrev && agendaPrev.meta) || {
      titulo: "1° Jornadas internas de Inteligencia Artificial — UCCuyo",
      subtitulo: "Observatorio de Inteligencia Artificial",
      fechas: [JORNADAS_EVENTO_DIA],
      sede: "Virtual",
      salas: [JORNADAS_SALA],
      sitioOficial: "https://observatorio-ia.uccuyo.edu.ar/#jornadas-ia",
      fuente: "Programa editado por el equipo · Jornadas IA 2026",
      estado: site.estado,
      catalogoArticulos: "../assets/jornadas/catalogo-articulos-jornadas-ia-2026.pdf",
      catalogoPresentaciones:
        "../assets/jornadas/catalogo-presentaciones-jornadas-ia-2026.pdf",
      minutosPorPonencia: JORNADAS_PONENCIA_MINUTOS,
      notaFormato:
        "Una sola sala virtual. Se evaluará dividir en dos salas si al 10/9 hay 14 o más ponencias confirmadas."
    },
    sesiones: sesiones
  };
  agenda.meta.estado = site.estado;
  agenda.meta.fuente = "Programa editado por el equipo · Jornadas IA 2026";

  var props = PropertiesService.getScriptProperties();
  props.setProperty(JORNADAS_PROP_PROGRAMA, JSON.stringify(site));
  props.setProperty(JORNADAS_PROP_AGENDA, JSON.stringify(agenda));
  props.setProperty(JORNADAS_PROP_PROGRAMA_MANUAL, "1");

  var confMap = {};
  for (i = 0; i < ponencias.length; i++) {
    if (ponencias[i].confirmado && ponencias[i].clave) {
      confMap[ponencias[i].clave] = true;
    }
  }
  props.setProperty(JORNADAS_PROP_CONFIRMADOS, JSON.stringify(confMap));

  try {
    publicarProgramaPdfDrive_(site);
  } catch (ignorePdf) {}

  return { updatedAt: updatedAt, items: items };
}

function hayProvisionalEnItems_(items) {
  for (var i = 0; i < items.length; i++) {
    if (items[i].tipo === "ponencia" && !items[i].confirmado) return true;
  }
  return false;
}

function normalizarItemEditor_(raw) {
  if (!raw || typeof raw !== "object") return null;
  var titulo = String(raw.titulo || "").replace(/\s+/g, " ").trim();
  if (!titulo) return null;
  var tipo = String(raw.tipo || "ponencia").toLowerCase();
  if (tipo !== "apertura" && tipo !== "indicaciones" && tipo !== "ponencia") {
    tipo = "ponencia";
  }
  return {
    orden: Number(raw.orden) || 0,
    hora: String(raw.hora || ""),
    horaFin: String(raw.horaFin || ""),
    tipo: tipo,
    titulo: titulo,
    persona: String(raw.persona || "").replace(/\s+/g, " ").trim(),
    rol: String(raw.rol || "").replace(/\s+/g, " ").trim(),
    area: String(raw.area || "").replace(/\s+/g, " ").trim(),
    sala: JORNADAS_SALA,
    articuloOk: raw.articuloOk == null ? null : !!raw.articuloOk,
    pptOk: raw.pptOk == null ? null : !!raw.pptOk,
    confirmado: !!raw.confirmado,
    notas: String(raw.notas || ""),
    clave: String(raw.clave || ""),
    articuloFileId: String(raw.articuloFileId || ""),
    pptFileId: String(raw.pptFileId || "")
  };
}

function itemsASesionesAgenda_(items) {
  var out = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var id;
    if (it.tipo === "apertura" && i === 0) id = "j-apertura-1";
    else if (it.tipo === "apertura") id = "j-apertura-" + (i + 1);
    else if (it.tipo === "indicaciones") id = "j-indicaciones";
    else id = "j-ponencia-" + slugPrograma_(it.clave || it.persona || it.titulo || String(i));

    out.push({
      id: id,
      dia: JORNADAS_EVENTO_DIA,
      inicio: it.hora,
      fin: it.horaFin,
      sala: JORNADAS_SALA,
      tipo: it.tipo,
      titulo: it.titulo,
      disertantes: it.persona ? [it.persona] : [],
      moderadores: [],
      area: it.area || "",
      rol: it.rol || "",
      articuloOk: it.articuloOk,
      pptOk: it.pptOk,
      confirmado: !!it.confirmado,
      notas: it.notas || ""
    });
  }
  return out;
}
