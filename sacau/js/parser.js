/**
 * Extracción y parseo de planes desde texto / Word / PDF.
 */
(function (global) {
  "use strict";

  const SKIP_LINE =
    /^(universidad|facultad|resoluci[oó]n|anexo|p[aá]gina|total|horas\s*$|n[ºo°]|correlativ|perfil|alcance|certifico|dada en|resuelve|visto|considerando)/i;

  const AREA_HINTS = [
    { re: /\bFGC\b|formaci[oó]n general/i, area: "FGC" },
    { re: /\bFCI\b|complementaria institucional|teolog[ií]a|doctrina social|optativa/i, area: "FCI" },
    { re: /\bFP\b|formaci[oó]n profesional|pr[aá]ctica profesional|pps|psicopatolog|abordaje|cl[ií]nica/i, area: "FP" },
    { re: /\bFB\b|formaci[oó]n b[aá]sica|desarrollo|metodolog|neuro|estad[ií]st/i, area: "FB" },
  ];

  const TIPO_HINTS = [
    { re: /pr[aá]ctica profesional|pps/i, tipologia: "pps" },
    { re: /trabajo integrador|t\.?i\.?f|tesis|trabajo final/i, tipologia: "tif" },
    { re: /taller|seminario/i, tipologia: "taller" },
    { re: /optativa|electiva/i, tipologia: "optativa" },
    { re: /pr[aá]ctica|exploraci[oó]n|psicodiagn/i, tipologia: "practica_supervisada" },
  ];

  function guessArea(nombre) {
    for (const h of AREA_HINTS) if (h.re.test(nombre)) return h.area;
    return "OTRA";
  }

  function guessTipologia(nombre) {
    for (const h of TIPO_HINTS) if (h.re.test(nombre)) return h.tipologia;
    return "teorica";
  }

  function normalizeSpaces(s) {
    return String(s || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  function cleanNombre(nombre) {
    return normalizeSpaces(nombre)
      .replace(/^[\d.\-–—]+\s*/, "")
      .replace(/\s*\((te[oó]ricas?|pr[aá]cticas?)\)\s*/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function makeAsignatura(partial, index) {
    const nombre = cleanNombre(partial.nombre || "");
    if (!nombre || nombre.length < 3) return null;
    if (SKIP_LINE.test(nombre)) return null;
    const teo = Number(partial.horas_teoricas || 0);
    const prac = Number(partial.horas_practicas || 0);
    if (teo + prac <= 0 && !partial.allowZero) return null;
    return {
      codigo: String(partial.codigo || String(index + 1).padStart(2, "0")),
      nombre,
      anio: Number(partial.anio || 1),
      area: partial.area || guessArea(nombre),
      regimen: partial.regimen || "S",
      tipologia: partial.tipologia || guessTipologia(nombre),
      horas_teoricas: teo,
      horas_practicas: prac,
      horas_autonomas_override: null,
      valor_cre_override: null,
      horas_estimadas: Boolean(partial.horas_estimadas),
      notas: partial.notas || "",
    };
  }

  /**
   * Detecta filas tipo: [código] Nombre … teo prac
   * o Nombre … totalHoras
   */
  function parseTextLines(text) {
    const lines = String(text || "")
      .split(/\r?\n/)
      .map(normalizeSpaces)
      .filter(Boolean);

    let currentAnio = 1;
    const found = [];

    for (const line of lines) {
      const anioMatch = line.match(/(?:^|\b)(\d{1,2})\s*[°ºo.]?\s*a[nñ]o\b/i);
      if (anioMatch && Number(anioMatch[1]) >= 1 && Number(anioMatch[1]) <= 12) {
        currentAnio = Number(anioMatch[1]);
        continue;
      }
      if (SKIP_LINE.test(line) && !/\d{2,}/.test(line)) continue;

      // código + nombre + 2 horas
      let m = line.match(
        /^(\d{1,3}|[A-Z]{0,4}\d{1,3})[).\-\s]+(.+?)\s+(\d{1,4})(?:[.,](\d+))?\s+(\d{1,4})(?:[.,](\d+))?\s*$/
      );
      if (m) {
        found.push(
          makeAsignatura(
            {
              codigo: m[1],
              nombre: m[2],
              anio: currentAnio,
              horas_teoricas: Number(m[3]),
              horas_practicas: Number(m[5]),
            },
            found.length
          )
        );
        continue;
      }

      // nombre + teo + prac (sin código)
      m = line.match(/^(.{8,120}?)\s+(\d{2,4})\s+(\d{1,4})\s*$/);
      if (m && !/^(total|suma|carga)/i.test(m[1])) {
        found.push(
          makeAsignatura(
            {
              nombre: m[1],
              anio: currentAnio,
              horas_teoricas: Number(m[2]),
              horas_practicas: Number(m[3]),
            },
            found.length
          )
        );
        continue;
      }

      // nombre + una sola carga horaria
      m = line.match(/^(\d{1,3})[).\-\s]+(.{8,120}?)\s+(\d{2,4})\s*(?:h(?:oras?)?)?\s*$/i);
      if (m) {
        found.push(
          makeAsignatura(
            {
              codigo: m[1],
              nombre: m[2],
              anio: currentAnio,
              horas_teoricas: Number(m[3]),
              horas_practicas: 0,
            },
            found.length
          )
        );
        continue;
      }

      m = line.match(/^(.{10,120}?)\s+(\d{2,4})\s*(?:h(?:oras?)?)?\s*$/i);
      if (m && /[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(m[1]) && !/^(total|suma|carga|año)/i.test(m[1])) {
        found.push(
          makeAsignatura(
            {
              nombre: m[1],
              anio: currentAnio,
              horas_teoricas: Number(m[2]),
              horas_practicas: 0,
            },
            found.length
          )
        );
      }
    }

    return found.filter(Boolean);
  }

  function parseHtmlTables(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const found = [];
    let currentAnio = 1;
    const tables = [...doc.querySelectorAll("table")];

    for (const table of tables) {
      const rows = [...table.querySelectorAll("tr")];
      for (const tr of rows) {
        const cells = [...tr.querySelectorAll("th,td")].map((c) => normalizeSpaces(c.textContent));
        if (!cells.length) continue;
        const joined = cells.join(" ");
        const anioMatch = joined.match(/(\d{1,2})\s*[°ºo.]?\s*a[nñ]o/i);
        if (anioMatch) {
          currentAnio = Number(anioMatch[1]);
          continue;
        }
        if (/asignatura|materia|unidad curricular|h\.?\s*totales|te[oó]ricas/i.test(joined) && cells.length <= 8) {
          continue;
        }

        // Prefer cells: código, nombre, teo, prac
        const nums = cells
          .map((c, idx) => ({ idx, n: Number(String(c).replace(",", ".")) }))
          .filter((x) => Number.isFinite(x.n) && x.n >= 0 && String(cells[x.idx]).match(/^\d{1,4}([.,]\d+)?$/));

        const textCells = cells.filter((c) => /[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(c) && c.length >= 4);
        if (!textCells.length) continue;

        let codigo = "";
        let nombre = textCells.sort((a, b) => b.length - a.length)[0];
        const codeCell = cells.find((c) => /^\d{1,3}[A-Za-z]?$/.test(c));
        if (codeCell) codigo = codeCell;

        let teo = 0;
        let prac = 0;
        if (nums.length >= 2) {
          // Heurística: últimos dos enteros razonables como teo/prac
          const hourNums = nums.filter((x) => x.n <= 800);
          if (hourNums.length >= 2) {
            teo = hourNums[hourNums.length - 2].n;
            prac = hourNums[hourNums.length - 1].n;
            // Si el "prac" parece un total (teo+prac), ajustar
            if (hourNums.length >= 3) {
              const maybeTeo = hourNums[hourNums.length - 3].n;
              const maybePrac = hourNums[hourNums.length - 2].n;
              const maybeTot = hourNums[hourNums.length - 1].n;
              if (Math.abs(maybeTeo + maybePrac - maybeTot) <= 1) {
                teo = maybeTeo;
                prac = maybePrac;
              }
            }
          } else if (hourNums.length === 1) {
            teo = hourNums[0].n;
          }
        } else if (nums.length === 1) {
          teo = nums[0].n;
        }

        const asig = makeAsignatura(
          {
            codigo,
            nombre,
            anio: currentAnio,
            horas_teoricas: teo,
            horas_practicas: prac,
          },
          found.length
        );
        if (asig) found.push(asig);
      }
    }
    return found;
  }

  function dedupeAsignaturas(list) {
    const seen = new Set();
    const out = [];
    for (const a of list) {
      const key = `${a.nombre.toLowerCase()}|${a.anio}|${a.horas_teoricas}|${a.horas_practicas}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(a);
    }
    return out.map((a, i) => ({
      ...a,
      codigo: a.codigo || String(i + 1).padStart(2, "0"),
    }));
  }

  function parsePlanFromText(text, meta) {
    const fromLines = parseTextLines(text);
    return {
      id: meta.id || "plan-cargado",
      nombre: meta.nombre || "Plan cargado",
      titulo: meta.titulo || "",
      institucion: meta.institucion || "Universidad Católica de Cuyo",
      normativa: meta.normativa || "",
      duracion_anios: 0,
      carrera_clave: "",
      metadata: {
        fuente: meta.fuente || "archivo",
        advertencia:
          "Revisá y corregí las asignaturas detectadas. Los PDF escaneados o tablas complejas pueden requerir edición manual.",
        texto_extraido: String(text || "").slice(0, 20000),
      },
      asignaturas: dedupeAsignaturas(fromLines),
    };
  }

  function parsePlanFromHtml(html, meta) {
    const fromTables = parseHtmlTables(html);
    const text = new DOMParser().parseFromString(html, "text/html").body.textContent || "";
    const fromLines = parseTextLines(text);
    const merged = dedupeAsignaturas([...fromTables, ...fromLines]);
    return {
      id: meta.id || "plan-cargado",
      nombre: meta.nombre || "Plan cargado",
      titulo: "",
      institucion: "Universidad Católica de Cuyo",
      normativa: "",
      duracion_anios: 0,
      carrera_clave: "",
      metadata: {
        fuente: meta.fuente || "word",
        advertencia:
          "Revisá el plan detectado desde Word. Completá tipologías, años y horas si hace falta.",
        texto_extraido: text.slice(0, 20000),
      },
      asignaturas: merged,
    };
  }

  async function extractPdfText(arrayBuffer) {
    if (!global.pdfjsLib) throw new Error("PDF.js no está disponible");
    const pdf = await global.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const parts = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const line = content.items.map((it) => it.str).join(" ");
      parts.push(line);
      // Also rebuild roughly by Y position for better line breaks
      const byY = {};
      for (const it of content.items) {
        const y = Math.round(it.transform[5]);
        (byY[y] ||= []).push(it.str);
      }
      const ys = Object.keys(byY)
        .map(Number)
        .sort((a, b) => b - a);
      for (const y of ys) parts.push(byY[y].join(" "));
    }
    return parts.join("\n");
  }

  async function extractDocxHtml(arrayBuffer) {
    if (!global.mammoth) throw new Error("Mammoth no está disponible");
    const result = await global.mammoth.convertToHtml({ arrayBuffer });
    return result.value || "";
  }

  async function loadPlanFromFile(file) {
    const name = file.name || "plan";
    const lower = name.toLowerCase();
    const buf = await file.arrayBuffer();
    const meta = {
      id: "plan-" + Date.now(),
      nombre: `Plan cargado (${name})`,
      fuente: name,
    };

    if (lower.endsWith(".docx")) {
      const html = await extractDocxHtml(buf);
      return parsePlanFromHtml(html, meta);
    }
    if (lower.endsWith(".doc")) {
      throw new Error(
        "Los .doc antiguos no se pueden leer en el navegador. Guardá el archivo como .docx o PDF e intentá de nuevo."
      );
    }
    if (lower.endsWith(".pdf")) {
      const text = await extractPdfText(buf);
      const plan = parsePlanFromText(text, meta);
      if (!plan.asignaturas.length) {
        plan.metadata.advertencia =
          "No se detectaron asignaturas automáticamente (PDF escaneado o formato no tabular). Agregá filas manualmente o pegá una tabla en CSV.";
      }
      return plan;
    }
    if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
      const text = new TextDecoder("utf-8").decode(buf);
      // CSV with headers?
      if (/nombre|asignatura|horas/i.test(text.split(/\n/)[0] || "")) {
        return parseCsvPlan(text, meta);
      }
      return parsePlanFromText(text, meta);
    }
    throw new Error("Formato no soportado. Usá PDF, Word (.docx) o CSV.");
  }

  function parseCsvPlan(text, meta) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return parsePlanFromText(text, meta);
    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/^\ufeff/, ""));
    const idx = (names) => headers.findIndex((h) => names.some((n) => h.includes(n)));
    const iNombre = idx(["nombre", "asignatura", "materia"]);
    const iCod = idx(["codigo", "código", "cod"]);
    const iAnio = idx(["anio", "año", "year"]);
    const iArea = idx(["area", "área"]);
    const iTeo = idx(["teorica", "teórica", "teo"]);
    const iPrac = idx(["practica", "práctica", "prac"]);
    const iTotal = idx(["total", "horas_totales", "horas"]);
    const iTipo = idx(["tipologia", "tipología", "tipo"]);
    const iReg = idx(["regimen", "régimen"]);

    if (iNombre < 0) return parsePlanFromText(text, meta);

    const asignaturas = [];
    for (let r = 1; r < lines.length; r++) {
      const cols = lines[r].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
      if (!cols[iNombre]) continue;
      let teo = iTeo >= 0 ? Number(cols[iTeo] || 0) : 0;
      let prac = iPrac >= 0 ? Number(cols[iPrac] || 0) : 0;
      if (!teo && !prac && iTotal >= 0) teo = Number(cols[iTotal] || 0);
      asignaturas.push(
        makeAsignatura(
          {
            codigo: iCod >= 0 ? cols[iCod] : "",
            nombre: cols[iNombre],
            anio: iAnio >= 0 ? Number(cols[iAnio] || 1) : 1,
            area: iArea >= 0 ? cols[iArea] : "",
            tipologia: iTipo >= 0 ? cols[iTipo] : "",
            regimen: iReg >= 0 ? cols[iReg] : "S",
            horas_teoricas: teo,
            horas_practicas: prac,
          },
          asignaturas.length
        )
      );
    }
    return {
      id: meta.id || "plan-csv",
      nombre: meta.nombre || "Plan CSV",
      titulo: "",
      institucion: "Universidad Católica de Cuyo",
      normativa: "",
      duracion_anios: 0,
      carrera_clave: "",
      metadata: { fuente: meta.fuente || "csv" },
      asignaturas: dedupeAsignaturas(asignaturas.filter(Boolean)),
    };
  }

  function emptyPlan() {
    return {
      id: "plan-nuevo",
      nombre: "Plan de estudios (nuevo)",
      titulo: "",
      institucion: "Universidad Católica de Cuyo",
      normativa: "",
      duracion_anios: 0,
      carrera_clave: "",
      metadata: {},
      asignaturas: [
        {
          codigo: "01",
          nombre: "Asignatura ejemplo",
          anio: 1,
          area: "FB",
          regimen: "S",
          tipologia: "teorica",
          horas_teoricas: 64,
          horas_practicas: 0,
          horas_autonomas_override: null,
          valor_cre_override: null,
          horas_estimadas: false,
          notas: "",
        },
      ],
    };
  }

  global.SacauParser = {
    loadPlanFromFile,
    parsePlanFromText,
    parsePlanFromHtml,
    parseCsvPlan,
    emptyPlan,
    guessArea,
    guessTipologia,
  };
})(window);
