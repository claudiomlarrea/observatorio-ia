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
  // Modo manual: no reordenar ni pisar textos, pero SÍ anexar ponencias nuevas
  // detectadas en Drive (p. ej. Martinez) para que el programa no quede congelado.
  if (
    typeof esProgramaManual_ === "function"
      ? esProgramaManual_()
      : PropertiesService.getScriptProperties().getProperty(
          "jornadas_programa_manual"
        ) === "1"
  ) {
    return incorporarNuevasCargasEnProgramaManual_(arts, ppts);
  }

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
  fusionarCargasDuplicadasPrograma_(porClave);

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
        "Una sola sala virtual. Se evaluará dividir en dos salas si al 16/9 hay 14 o más ponencias confirmadas."
    },
    sesiones: sesiones
  };

  var props = PropertiesService.getScriptProperties();
  props.setProperty(JORNADAS_PROP_PROGRAMA, JSON.stringify(site));
  props.setProperty(JORNADAS_PROP_AGENDA, JSON.stringify(agenda));

  try {
    publicarProgramaPdfDrive_(site);
  } catch (ignorePdf) {}

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
  var data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (e) {}
  }
  if (!data) {
    // Primera vez: construir ya
    var arts = listarEntradas_(JORNADAS_ARTICULOS_FOLDER_ID, ARTICULOS_MIME_OK, "articulo");
    var ppts = listarEntradas_(
      JORNADAS_PRESENTACIONES_FOLDER_ID,
      PRESENTACIONES_MIME_OK,
      "presentacion"
    );
    sincronizarProgramaDesdeCatalogos_(arts, ppts);
    raw = PropertiesService.getScriptProperties().getProperty(JORNADAS_PROP_PROGRAMA);
    data = raw ? JSON.parse(raw) : { ok: false, items: [] };
  }
  // Solo normaliza en memoria. NO publicar aquí:
  // publicarProgramaManualDesdeItems_ vuelve a llamar obtenerProgramaSitio_
  // y eso colgaba el navegador (bucle infinito).
  if (data && data.items) {
    try {
      normalizarItemsDividuoOjeda_(data.items);
    } catch (ignoreNorm) {}
  }
  return data;
}

/** Lectura cruda del programa (sin normalizar ni publicar). */
function leerProgramaSitioCrudo_() {
  var raw = PropertiesService.getScriptProperties().getProperty(JORNADAS_PROP_PROGRAMA);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
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
  var autorRaw = autorUsablePrograma_(entry.author || "") || autorUsablePrograma_(meta.author || "");

  var clave = normalizarClavePrograma_(autorRaw);
  if (!clave || esClaveAutorBasuraPrograma_(clave)) {
    clave = buscarClavePorTituloPrograma_(porClave, entry.title || meta.title || "");
  }
  if (!clave || esClaveAutorBasuraPrograma_(clave)) {
    var fallback = normalizarClavePrograma_(entry.fileName || entry.title || "");
    if (!esClaveAutorBasuraPrograma_(fallback)) clave = fallback;
  }
  if (!clave || esClaveAutorBasuraPrograma_(clave)) return;

  if (!porClave[clave]) {
    porClave[clave] = {
      clave: clave,
      claveDisplay: tituloAmigablePrograma_(autorRaw || clave),
      personaDisplay: "",
      titulo: "",
      area: "",
      articuloOk: false,
      pptOk: false,
      articuloFileId: "",
      pptFileId: "",
      tituloDeArticulo: false
    };
  }
  var row = porClave[clave];
  if (autorRaw) {
    row.personaDisplay = elegirMejorTextoPrograma_(row.personaDisplay, autorRaw);
  }
  if (!row.personaDisplay) row.personaDisplay = row.claveDisplay;

  var titulo = String(entry.title || meta.title || "").trim();
  titulo = limpiarTituloPrograma_(titulo, entry.fileName || "");
  if (!esTituloBasuraPrograma_(titulo)) {
    if (kind === "articulo") {
      row.titulo = titulo;
      row.tituloDeArticulo = true;
    } else if (!row.tituloDeArticulo) {
      row.titulo = elegirMejorTituloPrograma_(row.titulo, titulo);
    } else if (esTituloBasuraPrograma_(row.titulo) || esTituloDebilPrograma_(row.titulo)) {
      row.titulo = titulo;
    }
  }

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

function autorUsablePrograma_(s) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (typeof limpiarAutorCatalogo_ === "function") {
    s = limpiarAutorCatalogo_(s);
  }
  if (!s || esClaveAutorBasuraPrograma_(normalizarClavePrograma_(s))) return "";
  return s;
}

function esClaveAutorBasuraPrograma_(clave) {
  clave = String(clave || "").trim();
  if (!clave) return true;
  return /^(uso|sistema|gemelo|digital|ia|ppt|pptx|doc|docx|pdf|v\d+|jornadas\d*|presentacion|articulo|plantilla|observatorio|observatoria|diapositiva)$/i.test(
    clave.replace(/\s+/g, "")
  );
}

function buscarClavePorTituloPrograma_(porClave, titulo) {
  titulo = normalizarClavePrograma_(titulo);
  if (!titulo || titulo.length < 10) return "";
  var keys = Object.keys(porClave || {});
  var best = "";
  var bestHit = 0;
  var tokens = titulo.split(/\s+/).filter(function (t) {
    return t.length >= 4;
  });
  if (!tokens.length) return "";
  for (var i = 0; i < keys.length; i++) {
    var row = porClave[keys[i]];
    var other = normalizarClavePrograma_(row.titulo || "");
    if (!other) continue;
    var hit = 0;
    for (var j = 0; j < tokens.length; j++) {
      if (other.indexOf(tokens[j]) >= 0) hit++;
    }
    if (hit >= 2 && hit > bestHit) {
      bestHit = hit;
      best = keys[i];
    }
  }
  return best;
}

/**
 * Une “Uso” + “La Malfa” u otras claves basura que apuntan al mismo expositor.
 */
function fusionarCargasDuplicadasPrograma_(porClave) {
  var changed = true;
  while (changed) {
    changed = false;
    var keys = Object.keys(porClave || {});
    var i;
    var j;
    for (i = 0; i < keys.length && !changed; i++) {
      for (j = i + 1; j < keys.length; j++) {
        var a = porClave[keys[i]];
        var b = porClave[keys[j]];
        if (!a || !b) continue;
        var mismaPersona =
          normalizarClavePrograma_(a.personaDisplay) &&
          normalizarClavePrograma_(a.personaDisplay) ===
            normalizarClavePrograma_(b.personaDisplay);
        var tituloCercano =
          puntajeSimilitudTituloPrograma_(a.titulo, b.titulo) >= 2 ||
          (a.articuloFileId && a.articuloFileId === b.articuloFileId) ||
          (a.pptFileId && a.pptFileId === b.pptFileId);
        if (!mismaPersona && !tituloCercano) continue;

        var keepKey = keys[i];
        var dropKey = keys[j];
        if (esClaveAutorBasuraPrograma_(keepKey) && !esClaveAutorBasuraPrograma_(dropKey)) {
          keepKey = keys[j];
          dropKey = keys[i];
        } else if (
          !porClave[keepKey].articuloOk &&
          porClave[dropKey].articuloOk &&
          !esClaveAutorBasuraPrograma_(dropKey)
        ) {
          keepKey = keys[j];
          dropKey = keys[i];
        }
        if (keepKey === dropKey) continue;
        mergeRowPrograma_(porClave[keepKey], porClave[dropKey]);
        delete porClave[dropKey];
        changed = true;
        break;
      }
    }
  }
}

function mergeRowPrograma_(keep, drop) {
  if (!keep || !drop) return;
  keep.personaDisplay = elegirMejorTextoPrograma_(keep.personaDisplay, drop.personaDisplay);
  if (drop.tituloDeArticulo && drop.titulo && !esTituloBasuraPrograma_(drop.titulo)) {
    keep.titulo = drop.titulo;
    keep.tituloDeArticulo = true;
  } else {
    keep.titulo = elegirMejorTituloPrograma_(keep.titulo, drop.titulo);
    if (drop.tituloDeArticulo) keep.tituloDeArticulo = true;
  }
  if (drop.area && (!keep.area || drop.area.length > keep.area.length)) keep.area = drop.area;
  keep.articuloOk = keep.articuloOk || drop.articuloOk;
  keep.pptOk = keep.pptOk || drop.pptOk;
  keep.articuloFileId = keep.articuloFileId || drop.articuloFileId;
  keep.pptFileId = keep.pptFileId || drop.pptFileId;
}

function puntajeSimilitudTituloPrograma_(a, b) {
  if (typeof puntajeSimilitudTitulo_ === "function") {
    return puntajeSimilitudTitulo_(a, b);
  }
  var ta = normalizarClavePrograma_(a).split(/\s+/).filter(Boolean);
  var tb = normalizarClavePrograma_(b).split(/\s+/).filter(Boolean);
  if (!ta.length || !tb.length) return 0;
  var set = {};
  var i;
  for (i = 0; i < tb.length; i++) set[tb[i]] = true;
  var hit = 0;
  for (i = 0; i < ta.length; i++) {
    if (ta[i].length < 3) continue;
    if (set[ta[i]]) hit++;
  }
  return hit;
}

function esCargaInstitucionalPrograma_(row) {
  var t = normalizarClavePrograma_(row.titulo || "");
  var p = normalizarClavePrograma_(row.personaDisplay || "");
  if (t.indexOf("observatorio de inteligencia artificial") === 0 && t.length < 60) {
    return true;
  }
  // PPT institucional del encuentro (no es una ponencia de investigación)
  if (t.indexOf("encuentro virtual") === 0) return true;
  if (p === "observatorio" || p === "observatorio de ia") return true;
  return false;
}

/**
 * En modo manual: conserva orden/textos editados y agrega al final las
 * ponencias nuevas detectadas en Drive (artículo y/o PPT).
 */
function incorporarNuevasCargasEnProgramaManual_(arts, ppts) {
  arts = arts || [];
  ppts = ppts || [];
  var site = null;
  try {
    site = obtenerProgramaSitio_();
  } catch (ignore) {}
  if (!site || !site.items || !site.items.length) {
    PropertiesService.getScriptProperties().setProperty(
      "jornadas_programa_manual",
      "0"
    );
    return sincronizarProgramaDesdeCatalogos_(arts, ppts);
  }

  var porClave = {};
  var i;
  for (i = 0; i < arts.length; i++) {
    acumularCargaPrograma_(porClave, arts[i], "articulo");
  }
  for (i = 0; i < ppts.length; i++) {
    acumularCargaPrograma_(porClave, ppts[i], "presentacion");
  }
  fusionarCargasDuplicadasPrograma_(porClave);

  var items = [];
  for (i = 0; i < site.items.length; i++) {
    items.push(site.items[i]);
  }

  // Limpiar títulos ya publicados (p. ej. “…abogacia.docx”, “I Ay …”)
  var titulosLimpios = sanearTitulosItemsPrograma_(items);

  var existentes = {};
  for (i = 0; i < items.length; i++) {
    var c1 = normalizarClavePrograma_(items[i].clave || "");
    var c2 = normalizarClavePrograma_(items[i].persona || "");
    if (c1) {
      existentes[c1] = true;
      existentes[c1.split(/\s+/).pop()] = true;
    }
    if (c2) {
      existentes[c2] = true;
      existentes[c2.split(/\s+/).pop()] = true;
    }
  }

  var confirmados = cargarConfirmados_();
  var nuevas = [];
  var claves = Object.keys(porClave).sort(function (a, b) {
    return a.localeCompare(b, "es", { sensitivity: "base" });
  });

  for (i = 0; i < claves.length; i++) {
    var clave = claves[i];
    var row = porClave[clave];
    if (!row || (!row.articuloOk && !row.pptOk)) continue;
    if (esCargaInstitucionalPrograma_(row)) continue;
    if (existentes[clave]) {
      actualizarFlagsCargaEnItems_(items, clave, row);
      continue;
    }
    var apellido = clave.split(/\s+/).pop();
    if (apellido && existentes[apellido]) {
      actualizarFlagsCargaEnItems_(items, apellido, row);
      continue;
    }
    // Mismo tema ya en el programa (título corto vs largo) → solo flags/título, no duplicar
    if (yaEstaTituloEnPrograma_(items, row.titulo)) {
      actualizarFlagsPorTituloEnItems_(items, row);
      continue;
    }

    nuevas.push({
      tipo: "ponencia",
      titulo: row.titulo || "Ponencia",
      persona: row.personaDisplay || row.claveDisplay || "Expositor/a",
      rol: "Expositor/a",
      area: row.area || "",
      sala: JORNADAS_SALA,
      articuloOk: !!row.articuloOk,
      pptOk: !!row.pptOk,
      confirmado: !!confirmados[clave],
      notas: "Incluido automáticamente desde Drive (provisorio)",
      clave: clave,
      articuloFileId: row.articuloFileId || "",
      pptFileId: row.pptFileId || ""
    });
    existentes[clave] = true;
    if (apellido) existentes[apellido] = true;
  }

  if (!nuevas.length) {
    if (titulosLimpios && typeof publicarProgramaManualDesdeItems_ === "function") {
      var republished = publicarProgramaManualDesdeItems_(items);
      return {
        ok: true,
        skipped: "manual",
        added: 0,
        cleanedTitles: true,
        updatedAt: republished.updatedAt
      };
    }
    return { ok: true, skipped: "manual", added: 0 };
  }

  if (typeof publicarProgramaManualDesdeItems_ !== "function") {
    return {
      ok: false,
      error: "Falta JornadasProgramaEditor.gs (publicarProgramaManualDesdeItems_)"
    };
  }

  var merged = items.concat(nuevas);
  var published = publicarProgramaManualDesdeItems_(merged);
  return {
    ok: true,
    mode: "manual-append",
    added: nuevas.length,
    claves: nuevas.map(function (n) {
      return n.clave;
    }),
    updatedAt: published.updatedAt
  };
}

function actualizarFlagsCargaEnItems_(items, claveNorm, row) {
  claveNorm = normalizarClavePrograma_(claveNorm);
  if (!claveNorm || !row) return;
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (String(it.tipo || "") !== "ponencia") continue;
    var c = normalizarClavePrograma_(it.clave || it.persona || "");
    if (!c) continue;
    if (c !== claveNorm && c.split(/\s+/).pop() !== claveNorm) continue;
    aplicarCargaAItemPrograma_(it, row);
  }
}

/** Empareja por similitud de título (p. ej. «Del individuo…» corto vs largo). */
function actualizarFlagsPorTituloEnItems_(items, row) {
  if (!row || !row.titulo) return;
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (String(it.tipo || "") !== "ponencia") continue;
    if (puntajeSimilitudTituloPrograma_(row.titulo, it.titulo) < 3) continue;
    aplicarCargaAItemPrograma_(it, row);
  }
}

function aplicarCargaAItemPrograma_(it, row) {
  if (!it || !row) return;
  if (row.articuloOk) it.articuloOk = true;
  if (row.pptOk) it.pptOk = true;
  if (row.articuloFileId) it.articuloFileId = row.articuloFileId;
  if (row.pptFileId) it.pptFileId = row.pptFileId;
  // Preferir título más completo (el del artículo suele ser el canónico)
  var tRow = String(row.titulo || "").replace(/\s+/g, " ").trim();
  var tIt = String(it.titulo || "").replace(/\s+/g, " ").trim();
  if (tRow && tRow.length > tIt.length + 8) {
    it.titulo = tRow;
  }
  if (
    row.personaDisplay &&
    (!it.persona || String(it.persona).length < String(row.personaDisplay).length)
  ) {
    // No pisar si ya hay varios expositores listados
    if (!/,/.test(String(it.persona || ""))) {
      it.persona = row.personaDisplay;
    }
  }
  if (row.area && !it.area) it.area = row.area;
}

/**
 * Títulos / autores canónicos (portada Word + PPT revisados).
 * Se aplican al listar/sincronizar el programa.
 */
var JORNADAS_TITULO_DIVIDUO =
  "Del individuo al dividuo en el aula universitaria. La dividualidad como categoría pedagógico-didáctica para una práctica docente digital crítica ante la IA";

var JORNADAS_TITULOS_CANON = [
  {
    id: "uso_ia",
    match: /uso\s+de\s+(la\s+)?ia\s+en\s+estudiantes|uso\s+de\s+inteligencia\s+artificial\s+en\s+estudiantes/i,
    titulo: "Uso de inteligencia artificial en estudiantes de la UCCuyo",
    persona: "La Malfa",
    area: "Observatorio de IA",
    clave: "la malfa",
    articuloOk: true,
    pptOk: true
  },
  {
    id: "gemeph",
    match: /gemeph|gemelo\s+digital/i,
    titulo:
      "GEMEPH — Gemelo digital sociodemográfico de la EPH-INDEC. Exclusión digital, vulnerabilidad y brechas territoriales en Argentina",
    persona: "Larrea et al.",
    area: "Observatorio de IA",
    clave: "larrea",
    articuloOk: true,
    pptOk: true
  },
  {
    id: "castillo",
    match: /razonamiento\s+integrado|simulador\s+conversacional|argentina\s*2050|^razonamiento$/i,
    titulo:
      "Del contenido fragmentado al razonamiento integrado: uso de un simulador conversacional con IA en estudiantes de Medicina",
    persona: "Castillo et al.",
    area: "Salud",
    clave: "castillo",
    articuloOk: true,
    pptOk: true
  },
  {
    id: "giboin",
    match: /alerta\s+temprana|epidemiolog|giboin/i,
    titulo:
      "Sistema de Alerta Temprana (SAT) en Epidemiología Veterinaria, vínculo entre conocimiento científico e IA",
    persona: "Giboin",
    area: "Veterinaria",
    clave: "giboin",
    articuloOk: true,
    pptOk: true
  },
  {
    id: "meretta",
    match: /meretta|contabilidad\s*digital|pymes/i,
    titulo:
      "Inteligencia artificial aplicada a la Contabilidad Digital: un modelo metodológico para su integración en PyMEs",
    persona: "Meretta",
    area: "Contabilidad",
    clave: "meretta",
    articuloOk: true,
    pptOk: true
  },
  {
    id: "derechos",
    match: /derechos\s+humanos|eficacia\s+a\s+los\s+desc/i,
    titulo:
      "IA y Derechos Humanos: la IA como herramienta para dotar de eficacia a los DESC",
    persona: "Martinez, Maluf",
    area: "Derecho",
    clave: "martinez",
    articuloOk: true,
    pptOk: true
  },
  {
    id: "lenguaje",
    match: /lenguaje\s+cultural/i,
    titulo:
      "La Inteligencia Artificial como lenguaje cultural en la Educación Superior",
    persona: "Gil",
    area: "Asesoría Pedagógica",
    clave: "gil",
    articuloOk: true,
    pptOk: true
  },
  {
    id: "abogacia",
    match: /abogac/i,
    titulo:
      "Inteligencia artificial y enseñanza de la abogacía: una perspectiva humanista sobre el proceso de aprendizaje",
    persona: "Ojeda, Cali, Maluf",
    area: "Educación",
    clave: "ojeda cali maluf",
    articuloOk: true,
    pptOk: false
  },
  {
    id: "dividuo",
    match: /dividuo|dividualidad/i,
    titulo: JORNADAS_TITULO_DIVIDUO,
    persona: "Gil, Ojeda",
    area: "Asesoría Pedagógica",
    clave: "gil ojeda dividuo",
    articuloOk: true,
    pptOk: true
  }
];

/**
 * Persiste títulos canónicos + dedupe en el programa publicado.
 */
function corregirPonenciaDividuoOjeda() {
  return normalizarYPublicarTitulosCanon_();
}

function normalizarYPublicarTitulosCanon_() {
  if (typeof publicarProgramaManualDesdeItems_ !== "function") {
    throw new Error("Falta publicarProgramaManualDesdeItems_");
  }
  var site = typeof leerProgramaSitioCrudo_ === "function"
    ? leerProgramaSitioCrudo_()
    : null;
  if (!site) {
    var raw = PropertiesService.getScriptProperties().getProperty(JORNADAS_PROP_PROGRAMA);
    site = raw ? JSON.parse(raw) : { items: [] };
  }
  var items = (site && site.items) || [];
  var touched = normalizarItemsTitulosCanon_(items);
  touched += dedupeProgramaItemsInPlace_(items);
  if (!touched) {
    return { ok: true, touched: 0, note: "ya estaba al día", updatedAt: site.updatedAt };
  }
  var published = publicarProgramaManualDesdeItems_(items);
  return {
    ok: true,
    touched: touched,
    titulo: JORNADAS_TITULO_DIVIDUO,
    updatedAt: published.updatedAt
  };
}

/** Alias histórico. */
function normalizarItemsDividuoOjeda_(items) {
  var n = normalizarItemsTitulosCanon_(items);
  n += dedupeProgramaItemsInPlace_(items);
  return n;
}

/** Quita ponencias duplicadas por clave (p. ej. Castillo ×2). Devuelve cuántas quitó. */
function dedupeProgramaItemsInPlace_(items) {
  items = items || [];
  var seen = {};
  var out = [];
  var removed = 0;
  var i;
  for (i = 0; i < items.length; i++) {
    var it = items[i] || {};
    if (String(it.tipo || "") === "ponencia") {
      var ck = String(it.clave || it.titulo || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
      if (ck && seen[ck]) {
        removed++;
        continue;
      }
      if (ck) seen[ck] = true;
    }
    out.push(it);
  }
  if (!removed) return 0;
  items.length = 0;
  for (i = 0; i < out.length; i++) {
    out[i].orden = i + 1;
    items.push(out[i]);
  }
  return removed;
}

/** Aplica títulos/autores/flags canónicos in-place. Devuelve cuántos ítems tocó. */
function normalizarItemsTitulosCanon_(items) {
  items = items || [];
  var rules =
    typeof JORNADAS_TITULOS_CANON !== "undefined" ? JORNADAS_TITULOS_CANON : [];
  var touched = 0;
  var i;
  var r;
  for (i = 0; i < items.length; i++) {
    var it = items[i] || {};
    if (String(it.tipo || "") !== "ponencia") continue;
    var blob =
      String(it.titulo || "") +
      " " +
      String(it.persona || "") +
      " " +
      String(it.clave || "") +
      " " +
      String(it.area || "");
    for (r = 0; r < rules.length; r++) {
      var rule = rules[r];
      if (!rule || !rule.match || !rule.match.test(blob)) continue;
      if (rule.id === "meretta" && !/meretta|contabilidad|pymes/i.test(blob)) {
        continue;
      }
      if (
        rule.id === "castillo" &&
        !/razonamiento|2050|simulador|castillo|salud/i.test(blob) &&
        !/^razonamiento$/i.test(String(it.persona || ""))
      ) {
        continue;
      }
      if (rule.id === "giboin" && !/alerta|epidemiolog|giboin|veterinar/i.test(blob)) {
        continue;
      }
      var changed = false;
      if (String(it.titulo || "") !== rule.titulo) {
        it.titulo = rule.titulo;
        changed = true;
      }
      if (String(it.persona || "") !== rule.persona) {
        it.persona = rule.persona;
        changed = true;
      }
      if (rule.area && String(it.area || "") !== rule.area) {
        it.area = rule.area;
        changed = true;
      }
      if (rule.clave && String(it.clave || "") !== rule.clave) {
        it.clave = rule.clave;
        changed = true;
      }
      if (rule.articuloOk === true && !it.articuloOk) {
        it.articuloOk = true;
        changed = true;
      }
      if (rule.pptOk === true && !it.pptOk) {
        it.pptOk = true;
        changed = true;
      }
      if (rule.pptOk === false && it.pptOk) {
        it.pptOk = false;
        changed = true;
      }
      if (changed) touched++;
      break;
    }
  }
  return touched;
}

function yaEstaTituloEnPrograma_(items, titulo) {
  var t = normalizarClavePrograma_(titulo || "");
  if (!t || t.length < 8) return false;
  for (var i = 0; i < items.length; i++) {
    var other = normalizarClavePrograma_(items[i].titulo || "");
    if (!other) continue;
    if (other === t) return true;
    if (/dividuo/.test(t) && /dividuo/.test(other)) return true;
    if (puntajeSimilitudTituloPrograma_(titulo, items[i].titulo) >= 3) return true;
  }
  return false;
}

/** Quita .docx/.pdf y corrige “I Ay” / “abogacia” en ítems del programa. */
function sanearTitulosItemsPrograma_(items) {
  items = items || [];
  var changed = false;
  for (var i = 0; i < items.length; i++) {
    var raw = String(items[i].titulo || "");
    if (!raw) continue;
    var clean =
      typeof limpiarResiduosTituloCatalogo_ === "function"
        ? limpiarResiduosTituloCatalogo_(raw)
        : raw
            .replace(/\.(docx?|pptx?|pdf)(\s|$)/gi, "$2")
            .replace(/\bI\s*Ay\b/gi, "IA y")
            .replace(/\babogacia\b/gi, "abogacía")
            .replace(/\s+/g, " ")
            .trim();
    if (typeof humanizarTituloCatalogo_ === "function") {
      clean = limpiarResiduosTituloCatalogo_(humanizarTituloCatalogo_(clean));
    }
    if (typeof normalizarTituloCatalogo_ === "function") {
      clean = normalizarTituloCatalogo_(clean);
    }
    // Títulos canónicos desde Word (Castillo, Meretta, Gil/Ojeda, etc.)
    if (typeof normalizarItemsTitulosCanon_ === "function") {
      // Se aplica al final del bucle sobre el array completo
    } else if (/dividuo/i.test(clean)) {
      clean = typeof JORNADAS_TITULO_DIVIDUO !== "undefined"
        ? JORNADAS_TITULO_DIVIDUO
        : clean;
    }
    if (clean && clean !== raw) {
      items[i].titulo = clean;
      changed = true;
    }
    // Persona: “UCCuyo Ojeda,Cali,Maluf” → “Ojeda, Cali, Maluf”
    var per = String(items[i].persona || "");
    var per2 = per
      .replace(/^UCCuyo\s+/i, "")
      .replace(/,/g, ", ")
      .replace(/\s+/g, " ")
      .trim();
    if (per2 && per2 !== per) {
      items[i].persona = per2;
      changed = true;
    }
  }
  if (typeof normalizarItemsTitulosCanon_ === "function") {
    if (normalizarItemsTitulosCanon_(items)) changed = true;
  }
  return changed;
}

function limpiarTituloPrograma_(titulo, fileName) {
  titulo = String(titulo || "").replace(/\s+/g, " ").trim();
  if (!titulo || esTituloBasuraPrograma_(titulo)) {
    var meta = parseNombreSugerido_(fileName);
    titulo = meta.title || String(fileName || "").replace(/\.[^.]+$/, "");
    titulo = String(titulo || "").replace(/\s+/g, " ").trim();
  }
  if (typeof humanizarTituloCatalogo_ === "function") {
    titulo = humanizarTituloCatalogo_(titulo);
  } else if (/[a-z][A-Z]/.test(titulo)) {
    titulo = titulo.replace(/([a-z])([A-Z])/g, "$1 $2");
  }
  titulo = titulo.replace(/\bPy\s+M\s+Es\b/gi, "PyMEs");
  if (esTituloBasuraPrograma_(titulo) || esTituloDebilPrograma_(titulo)) {
    var meta2 = parseNombreSugerido_(fileName);
    var alt = String(meta2.title || "").replace(/\s+/g, " ").trim();
    if (alt && !esTituloBasuraPrograma_(alt) && !esTituloDebilPrograma_(alt)) {
      titulo = typeof humanizarTituloCatalogo_ === "function" ? humanizarTituloCatalogo_(alt) : alt;
    }
  }
  return tituloAmigablePrograma_(titulo);
}

function esTituloBasuraPrograma_(t) {
  if (typeof esTituloBasuraCuerpo_ === "function") return esTituloBasuraCuerpo_(t);
  var s = String(t || "").replace(/\s+/g, " ").trim();
  if (!s) return true;
  if (/https?:\/\//i.test(s) || /github\.io/i.test(s) || /diapositiva\s*\d/i.test(s)) {
    return true;
  }
  if (/#jornadas/i.test(s)) return true;
  if (/observatorio de ia\b/i.test(s) && /uc\s*cuyo/i.test(s)) return true;
  return false;
}

function esTituloDebilPrograma_(t) {
  if (typeof esTituloDebilCatalogo_ === "function") return esTituloDebilCatalogo_(t);
  var s = String(t || "").replace(/\s+/g, " ").trim();
  if (!s || s.length < 8) return true;
  if (/\bv\s*\d+\b/i.test(s) || /\bjornadas\s*2026\b/i.test(s)) return true;
  return false;
}

function tituloAmigablePrograma_(s) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  if (!s) return s;
  if (typeof normalizarTituloCatalogo_ === "function") {
    return normalizarTituloCatalogo_(s);
  }
  return s;
}

function elegirMejorTituloPrograma_(actual, candidato) {
  actual = String(actual || "").trim();
  candidato = String(candidato || "").trim();
  if (!candidato || esTituloBasuraPrograma_(candidato)) return actual;
  if (!actual || esTituloBasuraPrograma_(actual) || esTituloDebilPrograma_(actual)) {
    return candidato;
  }
  if (esTituloDebilPrograma_(candidato) && !esTituloDebilPrograma_(actual)) return actual;
  // Preferir el más informativo, sin premiar pies de diapositiva largos
  if (candidato.length >= actual.length + 8 && !esTituloDebilPrograma_(candidato)) {
    return candidato;
  }
  return actual;
}

function elegirMejorTextoPrograma_(actual, candidato) {
  actual = String(actual || "").trim();
  candidato = String(candidato || "").trim();
  if (!candidato) return actual;
  if (!actual) return candidato;
  if (/et\s+al\.?/i.test(candidato) && !/et\s+al\.?/i.test(actual)) return candidato;
  if (candidato.length > actual.length + 3) return candidato;
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

/** Nombre del PDF de programa en la carpeta de catálogos Drive. */
var PROGRAMA_PDF_NAME = "programa-jornadas-ia-2026.pdf";
var JORNADAS_PROP_PROGRAMA_PDF_ID = "jornadas_programa_pdf_id";

/**
 * Regenera el PDF del programa en Drive (misma carpeta que los catálogos).
 * Se llama al guardar en el editor o al sincronizar desde Drive.
 */
function publicarProgramaPdfDrive_(site) {
  site = site || obtenerProgramaSitio_();
  if (!site || !site.items) throw new Error("Sin programa para PDF");

  var folder = getCatalogosFolder_();
  var existing = folder.getFilesByName(PROGRAMA_PDF_NAME);
  while (existing.hasNext()) {
    existing.next().setTrashed(true);
  }

  var evento = site.evento || {};
  var items = site.items || [];
  var estado = String(site.estado || "provisorio").toLowerCase();
  var nota =
    estado === "confirmado"
      ? "Programa confirmado."
      : "Programa provisorio — se actualiza a medida que se confirman las ponencias.";

  var doc = DocumentApp.create("TMP · " + PROGRAMA_PDF_NAME.replace(/\.pdf$/i, ""));
  var body = doc.getBody();
  body.clear();

  var center = DocumentApp.HorizontalAlignment.CENTER;
  estiloCatalogo_(
    body.appendParagraph(
      String(evento.titulo || "1° Jornadas internas de Inteligencia Artificial")
    ),
    16,
    { bold: true, align: center, color: "#7A1F2B", spacingAfter: 4 }
  );
  estiloCatalogo_(
    body.appendParagraph(
      String(evento.fechaTexto || "6 de octubre de 2026") +
        " · " +
        String(evento.horaInicio || "15:00") +
        " · " +
        String(evento.modalidad || "Virtual")
    ),
    10,
    { align: center, spacingAfter: 2 }
  );
  estiloCatalogo_(body.appendParagraph(nota), 9, {
    align: center,
    color: "#555555",
    spacingAfter: 12
  });

  var tipoLabel = {
    apertura: "APERTURA",
    indicaciones: "INDICACIONES",
    ponencia: "PONENCIA",
    cierre: "CIERRE",
    receso: "RECESO"
  };

  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {};
    var h0 = String(it.hora || "");
    var h1 = String(it.horaFin || "");
    estiloCatalogo_(body.appendParagraph(h0 + "–" + h1), 10, {
      bold: true,
      color: "#064a38",
      spacingBefore: 8,
      spacingAfter: 1
    });
    var tip = tipoLabel[String(it.tipo || "").toLowerCase()] || "ÍTEM";
    estiloCatalogo_(body.appendParagraph(tip), 8, {
      bold: true,
      color: "#555555",
      spacingAfter: 1
    });
    estiloCatalogo_(
      body.appendParagraph(String(it.titulo || "").replace(/\s+/g, " ").trim()),
      11,
      { bold: true, spacingAfter: 1 }
    );
    var parts = [];
    if (it.persona) parts.push(String(it.persona).trim());
    if (it.rol) parts.push(String(it.rol).trim());
    if (it.area) parts.push(String(it.area).trim());
    if (String(it.tipo || "").toLowerCase() === "ponencia" && !it.confirmado) {
      parts.push("Provisional");
    }
    if (parts.length) {
      estiloCatalogo_(body.appendParagraph(parts.join(" · ")), 9, {
        color: "#555555",
        spacingAfter: 2
      });
    }
  }

  estiloCatalogo_(
    body.appendParagraph(
      "Observatorio de Inteligencia Artificial · UCCuyo · observatorioia@uccuyo.edu.ar"
    ),
    8,
    { color: "#666666", align: center, spacingBefore: 14 }
  );

  if (typeof forzarTipografiaCatalogo_ === "function") {
    forzarTipografiaCatalogo_(body);
  }
  doc.saveAndClose();

  var pdfBlob = exportDocAsPdf_(doc.getId(), PROGRAMA_PDF_NAME);
  var pdfFile = folder.createFile(pdfBlob);
  pdfFile.setName(PROGRAMA_PDF_NAME);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  try {
    DriveApp.getFileById(doc.getId()).setTrashed(true);
  } catch (ignoreTrash) {}

  PropertiesService.getScriptProperties().setProperty(
    JORNADAS_PROP_PROGRAMA_PDF_ID,
    pdfFile.getId()
  );
  if (site.updatedAt) {
    PropertiesService.getScriptProperties().setProperty(
      "jornadas_programa_pdf_updated_at",
      String(site.updatedAt)
    );
  }
  return {
    ok: true,
    pdfId: pdfFile.getId(),
    pdfUrl: "https://drive.google.com/file/d/" + pdfFile.getId() + "/view"
  };
}

/**
 * ?action=programa_pdf — vista imprimible en vivo (sin Drive).
 * Drive «Anyone with link» suele fallar en cuentas del dominio UCCuyo
 * («Necesitas acceso»). Esta página siempre coincide con el programa guardado;
 * el visitante puede Imprimir → Guardar como PDF.
 */
function servirProgramaPdf_() {
  var site = obtenerProgramaSitio_() || {};
  var evento = site.evento || {};
  var items = site.items || [];
  var estado = String(site.estado || "provisorio").toLowerCase();
  var nota =
    estado === "confirmado"
      ? "Programa confirmado."
      : "Programa provisorio — se actualiza a medida que se confirman las ponencias.";

  var tipoLabel = {
    apertura: "APERTURA",
    indicaciones: "INDICACIONES",
    ponencia: "PONENCIA",
    cierre: "CIERRE",
    receso: "RECESO"
  };

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var blocks = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {};
    var parts = [];
    if (it.persona) parts.push(String(it.persona).trim());
    if (it.rol) parts.push(String(it.rol).trim());
    if (it.area) parts.push(String(it.area).trim());
    if (String(it.tipo || "").toLowerCase() === "ponencia" && !it.confirmado) {
      parts.push("Provisional");
    }
    blocks.push(
      '<article class="item">' +
        '<p class="hora">' +
        esc(it.hora) +
        "–" +
        esc(it.horaFin) +
        "</p>" +
        '<p class="tipo">' +
        esc(tipoLabel[String(it.tipo || "").toLowerCase()] || "ÍTEM") +
        "</p>" +
        '<p class="titulo">' +
        esc(it.titulo) +
        "</p>" +
        (parts.length ? '<p class="meta">' + esc(parts.join(" · ")) + "</p>" : "") +
        "</article>"
    );
  }

  var html =
    "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\">" +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    "<title>" +
    esc(evento.titulo || "Programa Jornadas IA") +
    "</title>" +
    "<style>" +
    "body{margin:0;background:#f6f4f1;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif}" +
    ".bar{position:sticky;top:0;display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;" +
    "justify-content:space-between;padding:.75rem 1rem;background:#064a38;color:#fff}" +
    ".bar button,.bar a{appearance:none;border:0;border-radius:.4rem;padding:.55rem .9rem;" +
    "font:700 .9rem system-ui,sans-serif;cursor:pointer;text-decoration:none}" +
    ".bar button{background:#fff;color:#064a38}" +
    ".bar a{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.45)}" +
    ".sheet{max-width:42rem;margin:1.25rem auto;padding:1.5rem 1.4rem 2rem;background:#fff;" +
    "box-shadow:0 8px 28px rgba(0,0,0,.08)}" +
    "h1{margin:0 0 .35rem;font-size:1.45rem;line-height:1.25;color:#7A1F2B;text-align:center}" +
    ".sub,.nota{text-align:center;margin:0}" +
    ".sub{font-size:.95rem}.nota{margin:.35rem 0 1.1rem;font-size:.85rem;color:#555;font-style:italic}" +
    ".item{margin:0 0 .85rem}.hora{margin:0;font:700 .95rem system-ui,sans-serif;color:#064a38}" +
    ".tipo{margin:.1rem 0;font:700 .72rem system-ui,sans-serif;letter-spacing:.04em;color:#666}" +
    ".titulo{margin:.1rem 0;font-size:1.02rem;font-weight:700}" +
    ".meta{margin:.15rem 0 0;font-size:.88rem;color:#555}" +
    ".foot{margin-top:1.4rem;text-align:center;font-size:.78rem;color:#666}" +
    "@media print{body{background:#fff}.bar{display:none}.sheet{box-shadow:none;margin:0;max-width:none}}" +
    "</style></head><body>" +
    '<div class="bar"><span>Programa en vivo · Jornadas IA</span><span>' +
    '<button type="button" onclick="window.print()">Imprimir / Guardar PDF</button> ' +
    '<a href="https://observatorio-ia.uccuyo.edu.ar/assets/jornadas/' +
    PROGRAMA_PDF_NAME +
    '" target="_blank" rel="noopener">Copia del sitio</a></span></div>' +
    '<main class="sheet">' +
    "<h1>" +
    esc(evento.titulo || "1° Jornadas internas de Inteligencia Artificial") +
    "</h1>" +
    '<p class="sub">' +
    esc(evento.fechaTexto || "6 de octubre de 2026") +
    " · " +
    esc(evento.horaInicio || "15:00") +
    " · " +
    esc(evento.modalidad || "Virtual") +
    "</p>" +
    '<p class="nota">' +
    esc(nota) +
    "</p>" +
    blocks.join("") +
    '<p class="foot">Observatorio de Inteligencia Artificial · UCCuyo · observatorioia@uccuyo.edu.ar</p>' +
    "</main></body></html>";

  return HtmlService.createHtmlOutput(html)
    .setTitle(String(evento.titulo || "Programa Jornadas IA"))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
