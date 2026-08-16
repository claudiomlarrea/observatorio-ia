/**
 * Importa planillas Excel (CH / CS / genéricas) → sesiones Gestor de Eventos Científicos.
 * Requiere SheetJS (XLSX) en window.
 */
window.CC_EXCEL = (() => {
  const DEFAULT_DURATION_MIN = 10;
  const SKIP_TITLES = /^(brake|break|borrador|b\s*o\s*r\s*r\s*a\s*d\s*o\s*r|receso|coffee|almuerzo)$/i;

  const WEEKDAY_TO_JS = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miercoles: 3,
    miércoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
    sábado: 6,
  };

  /** Fallback RADU junio 2026 si no hay fechas en el draft */
  const WEEKDAY_FALLBACK_DIA = {
    jueves: "2026-06-04",
    viernes: "2026-06-05",
    miercoles: "2026-06-03",
    miércoles: "2026-06-03",
    sabado: "2026-06-06",
    sábado: "2026-06-06",
  };

  function cellStr(v) {
    if (v == null || v === "") return "";
    if (typeof v === "number" && Number.isFinite(v)) {
      // Excel time serial (fraction of day)
      if (v > 0 && v < 1) {
        const mins = Math.round(v * 24 * 60);
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
      return String(v);
    }
    return String(v).replace(/\s+/g, " ").trim();
  }

  function normHeader(h) {
    return cellStr(h)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function slug(text) {
    return String(text || "item")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function parseClock(raw) {
    const s = cellStr(raw).replace(",", ".");
    let m = s.match(/^(\d{1,2})[:.](\d{2})$/);
    if (m) return `${pad2(m[1])}:${m[2]}`;
    m = s.match(/^(\d{1,2})$/);
    if (m) return `${pad2(m[1])}:00`;
    return "";
  }

  function addMinutes(hhmm, mins) {
    const m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return hhmm;
    let total = Number(m[1]) * 60 + Number(m[2]) + mins;
    if (total < 0) total = 0;
    const h = Math.floor(total / 60) % 24;
    const mm = total % 60;
    return `${pad2(h)}:${pad2(mm)}`;
  }

  function parseRange(raw) {
    const s = cellStr(raw);
    const m = s.match(/(\d{1,2})[:.](\d{2})\s*[-–—]\s*(\d{1,2})[:.](\d{2})/);
    if (m) {
      return {
        inicio: `${pad2(m[1])}:${m[2]}`,
        fin: `${pad2(m[3])}:${m[4]}`,
      };
    }
    const one = parseClock(s);
    if (one) return { inicio: one, fin: addMinutes(one, DEFAULT_DURATION_MIN) };
    return null;
  }

  function extractWeekday(text) {
    const s = cellStr(text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const m = s.match(/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/);
    return m ? m[1] : "";
  }

  function extractDayNumber(text) {
    const s = cellStr(text);
    // Solo día de mes en encabezados tipo "Jueves 4" / "Jueves 4 11:30-13:00".
    // No confundir con horarios "Jueves 11.30" o "Jueves 17".
    const m = s.match(
      /\b(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s+(\d{1,2})(?=\s+\d{1,2}[:.]\d{2}|\s*[-–—]|\s*$)/i
    );
    if (!m) return null;
    const n = Number(m[1]);
    // Si el resto es solo la hora (sin segundo número de reloj), "Jueves 17" es hora, no día.
    const after = s.slice(m.index + m[0].length).trim();
    if (!after && n > 31) return null;
    if (!after && n <= 31) {
      // Ambiguo: "Jueves 4" = día; "Jueves 17" = casi seguro hora 17:00
      if (n > 12) return null;
    }
    return n;
  }

  /** "Jueves 11.30" / "Viernes 9.30" / "Jueves 17" → weekday + hora (sin día de mes) */
  function parseWeekdayTime(raw) {
    const s = cellStr(raw);
    if (!s) return null;
    const wd = extractWeekday(s);
    if (!wd) return null;
    const rest = s
      .replace(/\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i, "")
      .trim();
    const clock = parseClock(rest) || parseRange(rest)?.inicio;
    if (!clock) return null;
    return { weekday: wd, dayNum: null, inicio: clock };
  }

  function resolveDia(weekday, dayNum, opts = {}) {
    const year = opts.year || 2026;
    const month = opts.month || 6;
    if (dayNum != null && dayNum >= 1 && dayNum <= 31) {
      return `${year}-${pad2(month)}-${pad2(dayNum)}`;
    }
    const wd = String(weekday || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const fechas = Array.isArray(opts.fechas) ? opts.fechas : [];
    const want = WEEKDAY_TO_JS[wd];
    if (want != null && fechas.length) {
      for (const f of fechas) {
        const d = new Date(`${f}T12:00:00`);
        if (!Number.isNaN(d.getTime()) && d.getDay() === want) return f;
      }
    }
    if (WEEKDAY_FALLBACK_DIA[wd]) return WEEKDAY_FALLBACK_DIA[wd];
    if (fechas[0]) return fechas[0];
    return `${year}-${pad2(month)}-01`;
  }

  function suggestEjeFromName(filename) {
    const n = String(filename || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (/ciencias\s*humanas|\bch[_-]|\bch\b.*trabajo|trabajos_ciencias_humanas/.test(n)) {
      return { id: "eje-ch", nombre: "Ciencias Humanas" };
    }
    if (/ciencias\s*sociales|\bcs[_-]|\bcs\b.*trabajo|trabajos_ciencias_sociales/.test(n)) {
      return { id: "eje-cs", nombre: "Ciencias Sociales" };
    }
    return null;
  }

  function formatSala(aula) {
    const a = cellStr(aula);
    if (!a) return "";
    if (/^aula\b/i.test(a)) return a;
    if (/^\d+$/.test(a)) return `Aula ${a}`;
    return a;
  }

  function isSkipRow(title, speaker) {
    const t = cellStr(title);
    const s = cellStr(speaker);
    if (!t && !s) return true;
    if (SKIP_TITLES.test(t)) return true;
    if (SKIP_TITLES.test(s)) return true;
    return false;
  }

  function sheetToMatrix(sheet) {
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
  }

  function findHeaderRow(matrix, predicates) {
    const maxScan = Math.min(matrix.length, 12);
    for (let r = 0; r < maxScan; r++) {
      const headers = (matrix[r] || []).map(normHeader);
      if (predicates.every((fn) => headers.some(fn))) return { row: r, headers };
    }
    return null;
  }

  function colIndex(headers, ...names) {
    for (const name of names) {
      const i = headers.findIndex((h) => h === name || h.includes(name));
      if (i >= 0) return i;
    }
    return -1;
  }

  function detectFormat(matrix) {
    const ch = findHeaderRow(matrix, [
      (h) => h.includes("disertante") || h.includes("expositor"),
      (h) => h.includes("ponencia") || h.includes("titulo") || h === "titulo",
      (h) => h.includes("horario") || h === "hora",
    ]);
    if (ch) {
      const hasDia = ch.headers.some((h) => h === "dia" || h.startsWith("dia "));
      const hasAulaCols = ch.headers.some((h) => /^aula\s*\d+/.test(h));
      if (hasAulaCols) return { kind: "cs", ...ch };
      if (hasDia || ch.headers.some((h) => h.includes("horario"))) return { kind: "ch", ...ch };
    }
    const cs = findHeaderRow(matrix, [
      (h) => h.includes("expositor") || h.includes("disertante"),
      (h) => h.includes("titulo") || h.includes("ponencia"),
      (h) => /^aula\s*\d+/.test(h) || h.includes("aula"),
    ]);
    if (cs) return { kind: "cs", ...cs };
    return ch ? { kind: "ch", ...ch } : null;
  }

  function parseCH(matrix, meta, opts) {
    const det = detectFormat(matrix);
    if (!det || det.kind !== "ch") return [];
    const { row: headerRow, headers } = det;
    const iDia = colIndex(headers, "dia");
    const iHorario = colIndex(headers, "horario", "hora");
    const iSpeaker = colIndex(headers, "disertante", "expositor");
    const iTitle = colIndex(headers, "ponencia", "titulo", "titulo");
    const iModalidad = colIndex(headers, "modalidad");
    const iUniv = colIndex(headers, "universidad", "univ");
    const iAula = colIndex(headers, "aula", "sala");

    const sessions = [];
    let currentDia = opts.defaultDia || null;
    let currentWeekday = "";
    let currentAula = "";

    for (let r = headerRow + 1; r < matrix.length; r++) {
      const row = matrix[r] || [];
      const diaCell = iDia >= 0 ? cellStr(row[iDia]) : "";
      const horario = iHorario >= 0 ? cellStr(row[iHorario]) : "";
      const speaker = iSpeaker >= 0 ? cellStr(row[iSpeaker]) : "";
      const title = iTitle >= 0 ? cellStr(row[iTitle]) : "";
      const modalidad = iModalidad >= 0 ? cellStr(row[iModalidad]) : "";
      const univ = iUniv >= 0 ? cellStr(row[iUniv]) : "";
      const aula = iAula >= 0 ? cellStr(row[iAula]) : "";

      if (diaCell) {
        const wd = extractWeekday(diaCell);
        const dayNum = extractDayNumber(diaCell);
        if (wd) currentWeekday = wd;
        currentDia = resolveDia(wd || currentWeekday, dayNum, opts);
        // Block header may also embed a range; ignore for row slot
      }
      if (aula) currentAula = aula;

      if (isSkipRow(title, speaker)) continue;
      const range = parseRange(horario);
      if (!range || !currentDia) continue;

      const disertantes = [];
      if (speaker) disertantes.push(univ ? `${speaker} (${univ})` : speaker);

      let titulo = title || `Exposición ${sessions.length + 1}`;
      if (/virtual/i.test(modalidad)) titulo = `${titulo} · Virtual`;

      sessions.push({
        id: `exp-${currentDia}-${range.inicio}-${slug(currentAula || "sala")}-${slug(titulo)}-${sessions.length}`,
        dia: currentDia,
        inicio: range.inicio,
        fin: range.fin,
        sala: formatSala(currentAula),
        tipo: "exposicion",
        titulo,
        disertantes,
        moderadores: [],
        ejeId: meta.ejeId || "",
      });
    }
    return sessions;
  }

  function parseCS(matrix, meta, opts) {
    const det = detectFormat(matrix);
    if (!det) return [];
    const { row: headerRow, headers } = det;
    const iSpeaker = colIndex(headers, "expositor", "disertante");
    const iTitle = colIndex(headers, "titulo", "ponencia", "titulo");
    const iModalidad = colIndex(headers, "modalidad");
    const iUniv = colIndex(headers, "univ", "universidad");
    const aulaCols = headers
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => /^aula\s*\d+/.test(h) || h === "aula");

    // Prefer CS path when aula columns carry weekday+time
    const sessions = [];
    for (let r = headerRow + 1; r < matrix.length; r++) {
      const row = matrix[r] || [];
      const speaker = iSpeaker >= 0 ? cellStr(row[iSpeaker]) : "";
      const title = iTitle >= 0 ? cellStr(row[iTitle]) : "";
      const modalidad = iModalidad >= 0 ? cellStr(row[iModalidad]) : "";
      const univ = iUniv >= 0 ? cellStr(row[iUniv]) : "";

      if (isSkipRow(title, speaker)) continue;

      let slot = null;
      let aulaLabel = "";
      for (const { h, i } of aulaCols) {
        const cell = cellStr(row[i]);
        if (!cell) continue;
        const parsed = parseWeekdayTime(cell);
        if (parsed) {
          slot = parsed;
          const num = h.match(/(\d+)/);
          aulaLabel = num ? num[1] : cellStr(h);
          break;
        }
        // plain time in aula column
        const clock = parseClock(cell);
        if (clock) {
          slot = { weekday: "", dayNum: null, inicio: clock };
          const num = h.match(/(\d+)/);
          aulaLabel = num ? num[1] : cellStr(h);
          break;
        }
      }

      // CH-like fallback if this sheet was mis-detected
      if (!slot) {
        const iHorario = colIndex(headers, "horario", "hora");
        const iDia = colIndex(headers, "dia");
        const horario = iHorario >= 0 ? cellStr(row[iHorario]) : "";
        const range = parseRange(horario);
        if (range) {
          const diaCell = iDia >= 0 ? cellStr(row[iDia]) : "";
          const wd = extractWeekday(diaCell);
          const dayNum = extractDayNumber(diaCell);
          slot = { weekday: wd, dayNum, inicio: range.inicio, fin: range.fin };
          const iAula = colIndex(headers, "aula", "sala");
          if (iAula >= 0) aulaLabel = cellStr(row[iAula]);
        }
      }

      if (!slot || !slot.inicio) continue;
      const dia = resolveDia(slot.weekday, slot.dayNum, opts);
      const fin = slot.fin || addMinutes(slot.inicio, DEFAULT_DURATION_MIN);

      const disertantes = [];
      if (speaker) disertantes.push(univ ? `${speaker} (${univ})` : speaker);
      let titulo = title || `Exposición ${sessions.length + 1}`;
      if (/virtual/i.test(modalidad)) titulo = `${titulo} · Virtual`;

      sessions.push({
        id: `exp-${dia}-${slot.inicio}-${slug(aulaLabel || "sala")}-${slug(titulo)}-${sessions.length}`,
        dia,
        inicio: slot.inicio,
        fin,
        sala: formatSala(aulaLabel),
        tipo: "exposicion",
        titulo,
        disertantes,
        moderadores: [],
        ejeId: meta.ejeId || "",
      });
    }
    return sessions;
  }

  function parseWorkbook(workbook, filename, opts = {}) {
    const eje = suggestEjeFromName(filename);
    const meta = { ejeId: eje?.id || "", eje };
    const all = [];
    const warnings = [];

    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;
      const matrix = sheetToMatrix(sheet);
      if (!matrix.length) continue;
      const det = detectFormat(matrix);
      if (!det) {
        warnings.push(`Hoja "${name}": no se reconocieron columnas.`);
        continue;
      }
      const parsed =
        det.kind === "cs" ? parseCS(matrix, meta, opts) : parseCH(matrix, meta, opts);
      // If CH detector but few rows and CS-like aula cols, try CS
      if (!parsed.length && det.kind === "ch") {
        const alt = parseCS(matrix, meta, opts);
        all.push(...alt);
      } else {
        all.push(...parsed);
      }
    }

    return { sessions: all, eje, warnings, filename: filename || "" };
  }

  async function readFile(file, opts = {}) {
    if (typeof XLSX === "undefined") {
      throw new Error("Falta la librería XLSX (SheetJS)");
    }
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: "array", cellDates: true });
    return parseWorkbook(workbook, file.name || "", opts);
  }

  async function readUrl(url, opts = {}) {
    if (typeof XLSX === "undefined") {
      throw new Error("Falta la librería XLSX (SheetJS)");
    }
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const name = url.split("/").pop() || "planilla.xlsx";
    const workbook = XLSX.read(buf, { type: "array", cellDates: true });
    return parseWorkbook(workbook, name, opts);
  }

  /**
   * Une resultados de varias planillas en un evento draft.
   * Si baseEvent existe, conserva meta/ejes/sesiones previas y agrega las nuevas.
   */
  function buildEventFromImports(imports, baseEvent = null) {
    const base =
      baseEvent && typeof baseEvent === "object"
        ? JSON.parse(JSON.stringify(baseEvent))
        : null;
    const sesiones = Array.isArray(base?.sesiones) ? [...base.sesiones] : [];
    const ejes = Array.isArray(base?.ejes) ? [...base.ejes] : [];
    const warnings = [];
    const sources = [];

    for (const imp of imports) {
      if (!imp) continue;
      sources.push(imp.filename || "excel");
      if (imp.warnings?.length) warnings.push(...imp.warnings);
      if (imp.eje && !ejes.some((e) => e.id === imp.eje.id)) {
        const fechas = base?.meta?.fechas || [];
        ejes.push({
          id: imp.eje.id,
          dia: fechas[0] || "",
          nombre: imp.eje.nombre,
        });
      }
      for (const s of imp.sessions || []) {
        if (s.ejeId && !ejes.some((e) => e.id === s.ejeId) && imp.eje) {
          // already handled
        }
        sesiones.push(s);
      }
    }

    if (!sesiones.length) {
      throw new Error("No se extrajeron sesiones de las planillas");
    }

    const fechasFromSessions = [...new Set(sesiones.map((s) => s.dia).filter(Boolean))].sort();
    const salasFromSessions = [...new Set(sesiones.map((s) => s.sala).filter(Boolean))];

    for (const e of ejes) {
      if (!e.dia) e.dia = fechasFromSessions[0] || "";
    }

    const metaIn = base?.meta || {};
    const titulo =
      metaIn.titulo ||
      (sources.length
        ? `Programa desde Excel (${sources.map((s) => s.replace(/\.xlsx$/i, "")).join(" + ")})`
        : "Programa desde Excel");

    return {
      meta: {
        titulo,
        subtitulo: metaIn.subtitulo || "Cargado desde planillas Excel",
        fechas: metaIn.fechas?.length ? metaIn.fechas : fechasFromSessions,
        sede: metaIn.sede || "",
        salas: [...new Set([...(metaIn.salas || []), ...salasFromSessions])],
        organizador: metaIn.organizador || "Observatorio de IA · UCCuyo",
        sitioOficial: metaIn.sitioOficial || "https://observatorio-ia.uccuyo.edu.ar/",
        fuente: [metaIn.fuente, sources.length ? `Excel: ${sources.join(", ")}` : ""]
          .filter(Boolean)
          .join(" · "),
        descargas: Array.isArray(metaIn.descargas) ? metaIn.descargas : [],
      },
      ejes,
      sesiones,
      _importWarnings: warnings,
    };
  }

  function optsFromDraft(draft) {
    const fechas = draft?.meta?.fechas || [];
    let year = 2026;
    let month = 6;
    if (fechas[0]) {
      const m = String(fechas[0]).match(/^(\d{4})-(\d{2})/);
      if (m) {
        year = Number(m[1]);
        month = Number(m[2]);
      }
    }
    return { fechas, year, month, defaultDia: fechas[0] || null };
  }

  return {
    readFile,
    readUrl,
    parseWorkbook,
    buildEventFromImports,
    optsFromDraft,
    DEFAULT_DURATION_MIN,
  };
})();
