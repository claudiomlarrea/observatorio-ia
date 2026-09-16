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
 * Lista blanca (podés ampliar con agregarEditorPrograma("mail@…")):
 *   investigacion@uccuyo.edu.ar   ← preferida (dueña del proyecto)
 *   asistente.inv@uccuyo.edu.ar
 *   observatorioia@uccuyo.edu.ar
 *   claudio.larrea@hotmail.com
 *
 * El núcleo investigacion@ / observatorioia@ / asistente.inv@ siempre
 * está autorizado (no hace falta cambiar de cuenta en Chrome).
 *
 * Abrir: …/exec?action=editar_programa
 * (el sitio usa AccountChooser con Email=investigacion@…)
 */

var JORNADAS_PROP_PROGRAMA_MANUAL = "jornadas_programa_manual";
var JORNADAS_PROP_EDITORES = "jornadas_programa_editores_json";

/** Correos iniciales del equipo (minúsculas). */
var JORNADAS_EDITORES_DEFAULT = [
  "investigacion@uccuyo.edu.ar",
  "asistente.inv@uccuyo.edu.ar",
  "observatorioia@uccuyo.edu.ar",
  "claudio.larrea@hotmail.com"
];

function servirEditorProgramaHtml_() {
  var t = HtmlService.createTemplateFromFile("JornadasProgramaEditor");
  t.sitioUrl = "https://observatorio-ia.uccuyo.edu.ar/#jornadas-ia";
  t.email = emailUsuarioEditor_() || "";
  t.autorizado = !!editorProgramaAutorizado_();
  // Precargar programa en el HTML para no depender de google.script.run al abrir
  // (evita NetworkError HTTP 401 al primer “Recargar”).
  var initial = { ok: false };
  if (t.autorizado) {
    try {
      initial = payloadEditorOk_();
    } catch (errInit) {
      initial = {
        ok: false,
        error: String(errInit),
        email: t.email,
        autorizado: true
      };
    }
  }
  t.initialJson = JSON.stringify(initial);
  return t
    .evaluate()
    .setTitle("Editar programa · Jornadas IA 2026")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Agregar un correo a la lista blanca (ejecutar a mano en Apps Script).
 * Ejemplo: agregarEditorPrograma("juan@uccuyo.edu.ar");
 */
function agregarEditorPrograma(email) {
  return agregarEditorPrograma_(email);
}

/**
 * Restaura / fusiona la lista blanca con el núcleo del equipo
 * (incluye investigacion@ y observatorioia@). Ejecutar ▶ una vez.
 */
function restaurarEditoresPrograma() {
  PropertiesService.getScriptProperties().deleteProperty(JORNADAS_PROP_EDITORES);
  var list = cargarEditoresPrograma_();
  return {
    ok: true,
    editores: list,
    sesion: emailUsuarioEditor_() || "(sin correo detectado)",
    autorizado: !!editorProgramaAutorizado_()
  };
}

/** Diagnóstico: qué correo ve Apps Script con tu sesión actual. */
function diagnosticoEditorPrograma() {
  var active = "";
  var effective = "";
  try {
    active = (Session.getActiveUser() && Session.getActiveUser().getEmail()) || "";
  } catch (e1) {
    active = "(error: " + e1 + ")";
  }
  try {
    effective =
      (Session.getEffectiveUser() && Session.getEffectiveUser().getEmail()) || "";
  } catch (e2) {
    effective = "(error: " + e2 + ")";
  }
  var email = emailUsuarioEditor_();
  return {
    ok: true,
    activeUser: active,
    effectiveUser: effective,
    emailUsado: email || "(vacío)",
    autorizado: !!editorProgramaAutorizado_(),
    editores: cargarEditoresPrograma_(),
    nota:
      "Si emailUsado está vacío, la web app del editor debe estar en «Ejecutar como: Usuario que accede» + «Cualquier usuario de Google»."
  };
}

/**
 * Agregar un correo a la lista blanca (uso interno / alias con _).
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
  // Siempre permitir el núcleo del equipo (no depender solo de Script Properties).
  if (esEditorProgramaNucleo_(email)) return true;
  var list = cargarEditoresPrograma_();
  return list.indexOf(email) >= 0;
}

/** Correos del equipo que siempre pueden editar (sin cambiar de cuenta). */
function esEditorProgramaNucleo_(email) {
  email = normalizarEmailEditor_(email);
  if (!email) return false;
  if (JORNADAS_EDITORES_DEFAULT.indexOf(email) >= 0) return true;
  return /^(investigacion|asistente\.inv|observatorioia)@uccuyo\.edu\.ar$/.test(
    email
  );
}

function emailUsuarioEditor_() {
  var candidates = [];
  try {
    var a = Session.getActiveUser() && Session.getActiveUser().getEmail();
    if (a) candidates.push(a);
  } catch (ignore) {}
  try {
    var e = Session.getEffectiveUser() && Session.getEffectiveUser().getEmail();
    if (e) candidates.push(e);
  } catch (ignore2) {}
  var i;
  for (i = 0; i < candidates.length; i++) {
    var n = normalizarEmailEditor_(candidates[i]);
    if (n) return n;
  }
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
  function pushEmail(em) {
    em = normalizarEmailEditor_(em);
    if (!em || seen[em]) return;
    seen[em] = true;
    out.push(em);
  }
  for (i = 0; i < list.length; i++) pushEmail(list[i]);
  // Incorporar defaults nuevos (p. ej. hotmail) sin borrar los ya agregados a mano
  for (i = 0; i < JORNADAS_EDITORES_DEFAULT.length; i++) {
    pushEmail(JORNADAS_EDITORES_DEFAULT[i]);
  }
  var serialized = JSON.stringify(out);
  if (!raw || raw !== serialized) {
    PropertiesService.getScriptProperties().setProperty(
      JORNADAS_PROP_EDITORES,
      serialized
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
    // NO usar obtenerProgramaSitio_ (puede normalizar y reentrar).
    var rawPrev = PropertiesService.getScriptProperties().getProperty(
      typeof JORNADAS_PROP_PROGRAMA !== "undefined"
        ? JORNADAS_PROP_PROGRAMA
        : "jornadas_programa_site_json"
    );
    if (rawPrev) prev = JSON.parse(rawPrev);
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

  // Meta previa sin reconstruir agenda (obtenerProgramaAgenda_ pisaba el guardado).
  var agendaPrev = null;
  try {
    var rawAg = PropertiesService.getScriptProperties().getProperty(
      typeof JORNADAS_PROP_AGENDA !== "undefined"
        ? JORNADAS_PROP_AGENDA
        : "jornadas_programa_agenda_json"
    );
    if (rawAg) agendaPrev = JSON.parse(rawAg);
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
        "Una sola sala virtual. Se evaluará dividir en dos salas si al 16/9 hay 14 o más ponencias confirmadas."
    },
    sesiones: sesiones
  };
  agenda.meta.fechas = [JORNADAS_EVENTO_DIA];
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

/**
 * Panel liviano: solo reordenar ponencias (para cargas / equipo).
 * Abrir con la implementación EDITOR: ?action=ordenar_programa
 */
function servirOrdenarProgramaHtml_() {
  var email = emailUsuarioEditor_() || "";
  var autorizado = !!editorProgramaAutorizado_();
  var cargasUrl = "https://observatorio-ia.uccuyo.edu.ar/jornadas-cargas.html";
  if (!autorizado) {
    return HtmlService.createHtmlOutput(
      "<!doctype html><meta charset=utf-8><title>Ordenar programa</title>" +
        "<body style=\"font:16px/1.4 system-ui;max-width:36rem;margin:2rem auto;padding:0 1rem\">" +
        "<h1>No autorizado</h1>" +
        "<p>Sesión: <code>" +
        (email || "(sin correo — usá la web app «Usuario que accede»)") +
        "</code></p>" +
        "<p>Entrá con <strong>investigacion@uccuyo.edu.ar</strong> o " +
        "<strong>asistente.inv@uccuyo.edu.ar</strong> (también vale observatorioia@).</p>" +
        "<p><a href=\"" +
        cargasUrl +
        "\">Volver a cargas</a></p></body>"
    ).setTitle("Ordenar programa · no autorizado");
  }

  var data = payloadEditorOk_();
  var pons = [];
  var items = (data && data.items) || [];
  var i;
  for (i = 0; i < items.length; i++) {
    if (String(items[i].tipo || "") === "ponencia") pons.push(items[i]);
  }

  var rowsHtml = "";
  for (i = 0; i < pons.length; i++) {
    var it = pons[i];
    var clave = String(it.clave || it.persona || it.titulo || i);
    rowsHtml +=
      "<li data-clave=\"" +
      htmlEscaparEditor_(clave) +
      "\"><span class=\"t\">" +
      htmlEscaparEditor_(it.titulo) +
      "</span><span class=\"p\">" +
      htmlEscaparEditor_(it.persona) +
      "</span>" +
      "<span class=\"btns\">" +
      "<button type=\"button\" data-move=\"-1\">↑</button>" +
      "<button type=\"button\" data-move=\"1\">↓</button>" +
      "</span></li>";
  }

  var html =
    "<!doctype html><html><head><meta charset=utf-8>" +
    "<meta name=viewport content=\"width=device-width,initial-scale=1\">" +
    "<title>Ordenar ponencias · Jornadas IA</title>" +
    "<style>" +
    "body{font:15px/1.4 system-ui,sans-serif;margin:0;background:#f4f2ef;color:#1a1a1a}" +
    "header{background:#064a38;color:#fff;padding:.85rem 1rem;display:flex;flex-wrap:wrap;gap:.5rem;justify-content:space-between;align-items:center}" +
    "header a{color:#fff} main{max-width:40rem;margin:1rem auto;padding:0 1rem 2rem}" +
    "ol{list-style:none;padding:0;margin:0} li{background:#fff;border-radius:.5rem;padding:.75rem;margin:0 0 .5rem;display:grid;grid-template-columns:1fr auto;gap:.35rem .75rem;box-shadow:0 1px 0 rgba(0,0,0,.06)}" +
    ".t{font-weight:600;grid-column:1} .p{color:#555;font-size:.9rem;grid-column:1} .btns{grid-row:1/span 2;grid-column:2;display:flex;flex-direction:column;gap:.25rem}" +
    "button{appearance:none;border:1px solid #ccc;background:#fff;border-radius:.35rem;padding:.35rem .55rem;cursor:pointer;font:inherit}" +
    "button.primary{background:#064a38;color:#fff;border-color:#064a38;padding:.55rem 1rem;font-weight:600}" +
    ".msg{margin:.75rem 0;min-height:1.2em}.ok{color:#0d6b4c}.err{color:#7a1f2b}" +
    "</style></head><body>" +
    "<header><strong>Reordenar ponencias</strong><span>" +
    htmlEscaparEditor_(email) +
    " · <a href=\"" +
    cargasUrl +
    "\">Volver a cargas</a></span></header>" +
    "<main><p>Usá ↑ ↓ y después <strong>Guardar orden</strong>. Actualiza programa, catálogo y agenda.</p>" +
    "<p class=\"msg\" id=\"status\"></p>" +
    "<p><button type=\"button\" class=\"primary\" id=\"btnSave\">Guardar orden</button></p>" +
    "<ol id=\"list\">" +
    rowsHtml +
    "</ol></main>" +
    "<script>" +
    "var list=document.getElementById('list');" +
    "list.addEventListener('click',function(e){" +
    "var btn=e.target.closest('button[data-move]');if(!btn)return;" +
    "var li=btn.closest('li');var delta=Number(btn.getAttribute('data-move'));" +
    "var items=[].slice.call(list.children);var idx=items.indexOf(li);var j=idx+delta;" +
    "if(j<0||j>=items.length)return;" +
    "if(delta<0)list.insertBefore(li,items[j]);else list.insertBefore(items[j],li);" +
    "});" +
    "document.getElementById('btnSave').onclick=function(){" +
    "var status=document.getElementById('status');status.className='msg';status.textContent='Guardando…';" +
    "var claves=[].map.call(list.children,function(li){return li.getAttribute('data-clave');});" +
    "google.script.run.withSuccessHandler(function(res){" +
    "if(!res||!res.ok){status.className='msg err';status.textContent=(res&&res.error)||'Error';return;}" +
    "status.className='msg ok';status.textContent='Orden guardado. Ya podés volver a cargas o al sitio.';" +
    "}).withFailureHandler(function(err){status.className='msg err';status.textContent=String(err);})" +
    ".editorProgramaGuardarOrden(claves);" +
    "};" +
    "</script></body></html>";

  return HtmlService.createHtmlOutput(html)
    .setTitle("Ordenar ponencias · Jornadas IA")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function htmlEscaparEditor_(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** google.script.run — reordenar solo ponencias por lista de claves. */
function editorProgramaGuardarOrden(claves) {
  if (!editorProgramaAutorizado_()) {
    return {
      ok: false,
      error: "No autorizado. Usá investigacion@ o asistente.inv@.",
      email: emailUsuarioEditor_() || ""
    };
  }
  try {
    var published = reordenarProgramaPorClaves_(claves || []);
    return {
      ok: true,
      email: emailUsuarioEditor_(),
      updatedAt: published.updatedAt,
      message: "Orden guardado"
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/** Form POST desde jornadas-cargas.html (campo claves = JSON array). */
function guardarOrdenProgramaPost_(e) {
  var p = (e && e.parameter) || {};
  if (!editorProgramaAutorizado_()) {
    return HtmlService.createHtmlOutput(
      "<!doctype html><meta charset=utf-8><body style=\"font:16px system-ui;max-width:36rem;margin:2rem auto;padding:0 1rem\">" +
        "<h1>No autorizado</h1>" +
        "<p>Sesión: <code>" +
        htmlEscaparEditor_(emailUsuarioEditor_() || "(vacía)") +
        "</code></p>" +
        "<p>Abrí el enlace estando logueado con <strong>investigacion@uccuyo.edu.ar</strong> " +
        "o <strong>asistente.inv@uccuyo.edu.ar</strong>.</p>" +
        "<p>La web app del editor debe ser «Ejecutar como: Usuario que accede».</p>" +
        "<p><a href=\"https://observatorio-ia.uccuyo.edu.ar/jornadas-cargas.html\">Volver a cargas</a></p></body>"
    );
  }
  var raw = String(p.claves || p.orden || "[]");
  var claves = [];
  try {
    claves = JSON.parse(raw);
  } catch (ignore) {
    claves = String(raw)
      .split(/\n|,/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
  }
  var published = reordenarProgramaPorClaves_(claves);
  return HtmlService.createHtmlOutput(
    "<!doctype html><meta charset=utf-8><body style=\"font:16px system-ui;max-width:36rem;margin:2rem auto;padding:0 1rem\">" +
      "<h1>Orden guardado</h1>" +
      "<p>Por <code>" +
      htmlEscaparEditor_(emailUsuarioEditor_()) +
      "</code> · " +
      htmlEscaparEditor_(published.updatedAt || "") +
      "</p>" +
      "<p>Programa, catálogo y agenda ya usan este orden.</p>" +
      "<p><a href=\"https://observatorio-ia.uccuyo.edu.ar/jornadas-cargas.html\">Volver a cargas</a> · " +
      "<a href=\"https://observatorio-ia.uccuyo.edu.ar/#jornadas-ia\">Ver programa</a></p></body>"
  );
}

function reordenarProgramaPorClaves_(clavesOrden) {
  clavesOrden = clavesOrden || [];
  var site =
    typeof leerProgramaSitioCrudo_ === "function"
      ? leerProgramaSitioCrudo_()
      : null;
  if (!site || !site.items) {
    var raw = PropertiesService.getScriptProperties().getProperty(
      typeof JORNADAS_PROP_PROGRAMA !== "undefined"
        ? JORNADAS_PROP_PROGRAMA
        : "jornadas_programa_site_json"
    );
    site = raw ? JSON.parse(raw) : { items: [] };
  }
  var fijos = [];
  var pons = [];
  var i;
  for (i = 0; i < (site.items || []).length; i++) {
    var it = site.items[i];
    if (String(it.tipo || "") === "apertura" || String(it.tipo || "") === "indicaciones") {
      fijos.push(it);
    } else if (String(it.tipo || "") === "ponencia") {
      pons.push(it);
    }
  }

  function keyOf(it) {
    return normalizarClavePrograma_(it.clave || it.persona || it.titulo || "");
  }

  var byKey = {};
  for (i = 0; i < pons.length; i++) {
    var k = keyOf(pons[i]);
    if (k && !byKey[k]) byKey[k] = pons[i];
  }

  var ordered = [];
  var seen = {};
  for (i = 0; i < clavesOrden.length; i++) {
    var ck = normalizarClavePrograma_(clavesOrden[i]);
    if (!ck || seen[ck] || !byKey[ck]) continue;
    ordered.push(byKey[ck]);
    seen[ck] = true;
  }
  for (i = 0; i < pons.length; i++) {
    var k2 = keyOf(pons[i]);
    if (seen[k2]) continue;
    ordered.push(pons[i]);
    seen[k2] = true;
  }

  return publicarProgramaManualDesdeItems_(fijos.concat(ordered));
}
