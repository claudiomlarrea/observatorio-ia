/**
 * Programa + agenda en vivo — Jornadas IA 2026
 *
 * Cada vez que se regeneran los catálogos desde Drive, arma el programa
 * provisional (apertura fija + una ponencia por expositor detectado) y lo
 * publica por la web app:
 *
 *   ?action=programa          → formato del sitio (#jornadas-ia)
 *   ?action=programa_agenda   → formato de la app jornadas-ia-2026/
 *
 * Pegá este archivo en el mismo proyecto que JornadasCatalogos.gs.
 * Después: actualizarCatalogosJornadas + Implementar → Nueva versión (para doGet).
 */

var JORNADAS_PROP_PROGRAMA = "jornadas_programa_site_json";
var JORNADAS_PROP_AGENDA = "jornadas_programa_agenda_json";
var JORNADAS_PROP_CONFIRMADOS = "jornadas_programa_confirmados_json";

var JORNADAS_EVENTO_DIA = "2026-10-06";
var JORNADAS_SALA = "Ponencia";
var JORNADAS_PONENCIA_INICIO = "15:25";
var JORNADAS_PONENCIA_MINUTOS = 10;

/**
 * Llamado desde actualizarCatalogosJornadas(arts, ppts).
 */
function sincronizarProgramaDesdeCatalogos_(arts, ppts) {
  arts = arts || [];
  ppts = ppts || [];
  var confirmados = cargarConfirmados_();
  var porClave = {};

  var i;
  for (i = 0; i < arts.length; i++) {
    acumularCargaPrograma_(porClave, arts[i], "articulo");
  }
  for (i = 0; i < ppts.length; i++) {
    acumularCargaPrograma_(porClave, ppts[i], "presentacion");
  }

  var claves = Object.keys(porClave).sort(function (a, b) {
    return a.localeCompare(b, "es", { sensitivity: "base" });
  });

  var items = bloquesFijosPrograma_();
  var sesiones = bloquesFijosAgenda_();
  var orden = items.length;
  var cursorMin = horaAMinutos_(JORNADAS_PONENCIA_INICIO);

  for (i = 0; i < claves.length; i++) {
    var row = porClave[claves[i]];
    if (!row || (!row.articuloOk && !row.pptOk)) continue;
    // No duplicar la apertura del Director como “ponencia” si solo hubiera material institucional
    if (esCargaInstitucionalPrograma_(row)) continue;

    var inicio = minutosAHora_(cursorMin);
    var fin = minutosAHora_(cursorMin + JORNADAS_PONENCIA_MINUTOS);
    cursorMin += JORNADAS_PONENCIA_MINUTOS;
    orden += 1;

    var persona = row.personaDisplay || row.claveDisplay || "Expositor/a";
    var titulo = row.titulo || "Ponencia";
    var area = row.area || "";
    var conf = !!confirmados[claves[i]];
    var id = "j-ponencia-" + slugPrograma_(claves[i]);

    items.push({
      orden: orden,
      hora: inicio,
      horaFin: fin,
      tipo: "ponencia",
      titulo: titulo,
      persona: persona,
      rol: "Expositor/a",
      area: area,
      sala: JORNADAS_SALA,
      articuloOk: !!row.articuloOk,
      pptOk: !!row.pptOk,
      confirmado: conf,
      notas: "Incluido automáticamente desde Drive (provisorio)",
      clave: claves[i],
      articuloFileId: row.articuloFileId || "",
      pptFileId: row.pptFileId || ""
    });

    sesiones.push({
      id: id,
      dia: JORNADAS_EVENTO_DIA,
      inicio: inicio,
      fin: fin,
      sala: JORNADAS_SALA,
      tipo: "ponencia",
      titulo: titulo,
      disertantes: [persona],
      moderadores: [],
      area: area,
      rol: "Expositor/a",
      articuloOk: !!row.articuloOk,
      pptOk: !!row.pptOk,
      confirmado: conf,
      notas: "Incluido automáticamente desde Drive (provisorio)"
    });
  }

  var updatedAt = new Date().toISOString();
  var site = {
    ok: true,
    source: "drive-auto",
    updatedAt: updatedAt,
    version: updatedAt.slice(0, 10),
    estado: "provisorio",
    evento: {
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

  var agenda = {
    ok: true,
    source: "drive-auto",
    updatedAt: updatedAt,
    meta: {
      titulo: "1° Jornadas internas de Inteligencia Artificial — UCCuyo",
      subtitulo: "Observatorio de Inteligencia Artificial",
      fechas: [JORNADAS_EVENTO_DIA],
      sede: "Virtual",
      salas: [JORNADAS_SALA],
      sitioOficial: "https://observatorio-ia.uccuyo.edu.ar/#jornadas-ia",
      fuente: "Programa automático desde cargas Drive · Jornadas IA 2026",
      estado: "provisorio",
      catalogoArticulos: "../assets/jornadas/catalogo-articulos-jornadas-ia-2026.pdf",
      catalogoPresentaciones:
        "../assets/jornadas/catalogo-presentaciones-jornadas-ia-2026.pdf",
      minutosPorPonencia: JORNADAS_PONENCIA_MINUTOS,
      notaFormato:
        "Una sola sala virtual. Se evaluará dividir en dos salas si al 10/9 hay 14 o más ponencias confirmadas."
    },
    sesiones: sesiones
  };

  var props = PropertiesService.getScriptProperties();
  props.setProperty(JORNADAS_PROP_PROGRAMA, JSON.stringify(site));
  props.setProperty(JORNADAS_PROP_AGENDA, JSON.stringify(agenda));

  return {
    ok: true,
    updatedAt: updatedAt,
    ponencias: claves.length,
    items: items.length,
    sesiones: sesiones.length
  };
}

/**
 * Marcar una ponencia como confirmada (por clave de apellido normalizada).
 * Ejemplo: confirmarPonenciaJornadas_("meretta");
 */
function confirmarPonenciaJornadas_(clave) {
  clave = normalizarClavePrograma_(clave);
  if (!clave) throw new Error("Falta clave (apellido)");
  var map = cargarConfirmados_();
  map[clave] = true;
  PropertiesService.getScriptProperties().setProperty(
    JORNADAS_PROP_CONFIRMADOS,
    JSON.stringify(map)
  );
  // Regenerar con catálogos actuales
  var arts = listarEntradas_(JORNADAS_ARTICULOS_FOLDER_ID, ARTICULOS_MIME_OK, "articulo");
  var ppts = listarEntradas_(
    JORNADAS_PRESENTACIONES_FOLDER_ID,
    PRESENTACIONES_MIME_OK,
    "presentacion"
  );
  return sincronizarProgramaDesdeCatalogos_(arts, ppts);
}

function obtenerProgramaSitio_() {
  var raw = PropertiesService.getScriptProperties().getProperty(JORNADAS_PROP_PROGRAMA);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {}
  }
  // Primera vez: construir ya
  var arts = listarEntradas_(JORNADAS_ARTICULOS_FOLDER_ID, ARTICULOS_MIME_OK, "articulo");
  var ppts = listarEntradas_(
    JORNADAS_PRESENTACIONES_FOLDER_ID,
    PRESENTACIONES_MIME_OK,
    "presentacion"
  );
  sincronizarProgramaDesdeCatalogos_(arts, ppts);
  raw = PropertiesService.getScriptProperties().getProperty(JORNADAS_PROP_PROGRAMA);
  return raw ? JSON.parse(raw) : { ok: false, items: [] };
}

function obtenerProgramaAgenda_() {
  var raw = PropertiesService.getScriptProperties().getProperty(JORNADAS_PROP_AGENDA);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {}
  }
  obtenerProgramaSitio_();
  raw = PropertiesService.getScriptProperties().getProperty(JORNADAS_PROP_AGENDA);
  return raw ? JSON.parse(raw) : { ok: false, sesiones: [] };
}

function bloquesFijosPrograma_() {
  return [
    {
      orden: 1,
      hora: "15:00",
      horaFin: "15:10",
      tipo: "apertura",
      titulo: "Palabras de apertura",
      persona: "Lic. María Laura Simonassi",
      rol: "Rectora",
      area: "",
      sala: JORNADAS_SALA,
      articuloOk: null,
      pptOk: null,
      confirmado: true,
      notas: ""
    },
    {
      orden: 2,
      hora: "15:10",
      horaFin: "15:20",
      tipo: "apertura",
      titulo: "Presentación del Observatorio de Inteligencia Artificial",
      persona: "Dr. Claudio Larrea",
      rol: "Director del Observatorio de IA",
      area: "Observatorio IA",
      sala: JORNADAS_SALA,
      articuloOk: null,
      pptOk: null,
      confirmado: true,
      notas: ""
    },
    {
      orden: 3,
      hora: "15:20",
      horaFin: "15:25",
      tipo: "indicaciones",
      titulo: "Indicaciones técnicas y dinámica de las ponencias",
      persona: "Observatorio de IA",
      rol: "Coordinación",
      area: "",
      sala: JORNADAS_SALA,
      articuloOk: null,
      pptOk: null,
      confirmado: true,
      notas: "10 minutos por ponencia"
    }
  ];
}

function bloquesFijosAgenda_() {
  return [
    {
      id: "j-apertura-1",
      dia: JORNADAS_EVENTO_DIA,
      inicio: "15:00",
      fin: "15:10",
      sala: JORNADAS_SALA,
      tipo: "apertura",
      titulo: "Palabras de apertura",
      disertantes: ["Lic. María Laura Simonassi"],
      moderadores: [],
      area: "",
      rol: "Rectora",
      articuloOk: null,
      pptOk: null,
      confirmado: true,
      notas: ""
    },
    {
      id: "j-apertura-2",
      dia: JORNADAS_EVENTO_DIA,
      inicio: "15:10",
      fin: "15:20",
      sala: JORNADAS_SALA,
      tipo: "apertura",
      titulo: "Presentación del Observatorio de Inteligencia Artificial",
      disertantes: ["Dr. Claudio Larrea"],
      moderadores: [],
      area: "Observatorio IA",
      rol: "Director del Observatorio de IA",
      articuloOk: null,
      pptOk: null,
      confirmado: true,
      notas: ""
    },
    {
      id: "j-indicaciones",
      dia: JORNADAS_EVENTO_DIA,
      inicio: "15:20",
      fin: "15:25",
      sala: JORNADAS_SALA,
      tipo: "indicaciones",
      titulo: "Indicaciones técnicas y dinámica de las ponencias",
      disertantes: [],
      moderadores: [],
      area: "",
      rol: "Coordinación",
      articuloOk: null,
      pptOk: null,
      confirmado: true,
      notas: "10 minutos por ponencia"
    }
  ];
}

function acumularCargaPrograma_(porClave, entry, kind) {
  if (!entry) return;
  var meta = parseNombreSugerido_(entry.fileName || "");
  var clave = normalizarClavePrograma_(meta.author || entry.author || "");
  if (!clave) {
    clave = normalizarClavePrograma_(entry.fileName || entry.title || "");
  }
  if (!clave) return;

  if (!porClave[clave]) {
    porClave[clave] = {
      clave: clave,
      claveDisplay: tituloAmigablePrograma_(meta.author || entry.author || clave),
      personaDisplay: "",
      titulo: "",
      area: "",
      articuloOk: false,
      pptOk: false,
      articuloFileId: "",
      pptFileId: ""
    };
  }
  var row = porClave[clave];
  var autorShow = String(entry.author || meta.author || "").trim();
  if (autorShow) {
    row.personaDisplay = elegirMejorTextoPrograma_(row.personaDisplay, autorShow);
  }
  if (!row.personaDisplay) row.personaDisplay = row.claveDisplay;

  var titulo = String(entry.title || meta.title || "").trim();
  titulo = limpiarTituloPrograma_(titulo, entry.fileName || "");
  row.titulo = elegirMejorTextoPrograma_(row.titulo, titulo);

  var area = String(entry.area || meta.area || "").trim();
  if (area && (!row.area || area.length > row.area.length)) row.area = area;

  if (kind === "articulo") {
    row.articuloOk = true;
    row.articuloFileId = entry.fileId || row.articuloFileId;
  }
  if (kind === "presentacion") {
    row.pptOk = true;
    row.pptFileId = entry.fileId || row.pptFileId;
  }
}

function esCargaInstitucionalPrograma_(row) {
  var t = normalizarClavePrograma_(row.titulo || "");
  var p = normalizarClavePrograma_(row.personaDisplay || "");
  if (t.indexOf("observatorio de inteligencia artificial") === 0 && t.length < 60) {
    return true;
  }
  if (p === "observatorio" || p === "observatorio de ia") return true;
  return false;
}

function limpiarTituloPrograma_(titulo, fileName) {
  titulo = String(titulo || "").replace(/\s+/g, " ").trim();
  if (!titulo) {
    var meta = parseNombreSugerido_(fileName);
    titulo = meta.title || String(fileName || "").replace(/\.[^.]+$/, "");
  }
  // CamelCase pegado → espacios
  if (/^[A-Za-zÁÉÍÓÚÑ0-9]+$/i.test(titulo) && /[a-z][A-Z]/.test(titulo)) {
    titulo = titulo.replace(/([a-z])([A-Z])/g, "$1 $2");
  }
  return tituloAmigablePrograma_(titulo);
}

function tituloAmigablePrograma_(s) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  if (!s) return s;
  if (typeof normalizarTituloCatalogo_ === "function") {
    return normalizarTituloCatalogo_(s);
  }
  return s;
}

function elegirMejorTextoPrograma_(actual, candidato) {
  actual = String(actual || "").trim();
  candidato = String(candidato || "").trim();
  if (!candidato) return actual;
  if (!actual) return candidato;
  // Preferir el más largo si no es basura de nombre de archivo
  if (candidato.length >= actual.length + 8) return candidato;
  if (/et\s+al\.?/i.test(candidato) && !/et\s+al\.?/i.test(actual)) return candidato;
  return actual;
}

function normalizarClavePrograma_(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bet\s+al\.?\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugPrograma_(s) {
  return normalizarClavePrograma_(s).replace(/\s+/g, "-") || "expositor";
}

function horaAMinutos_(hhmm) {
  var p = String(hhmm || "00:00").split(":");
  return Number(p[0] || 0) * 60 + Number(p[1] || 0);
}

function minutosAHora_(m) {
  m = Math.max(0, Math.floor(m));
  var h = Math.floor(m / 60);
  var min = m % 60;
  return (h < 10 ? "0" : "") + h + ":" + (min < 10 ? "0" : "") + min;
}

function cargarConfirmados_() {
  try {
    return (
      JSON.parse(
        PropertiesService.getScriptProperties().getProperty(JORNADAS_PROP_CONFIRMADOS) ||
          "{}"
      ) || {}
    );
  } catch (e) {
    return {};
  }
}
