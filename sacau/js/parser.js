/**
 * Extracción y parseo de planes desde texto / Word / PDF.
 */
(function (global) {
  "use strict";

  const SKIP_LINE =
    /^(universidad|facultad|resoluci[oó]n|anexo|p[aá]gina|total|horas\s*$|n[ºo°]|correlativ|perfil|alcance|certifico|dada en|resuelve|visto|considerando|plan de estudios?|materia\s+r[eé]gimen|carga horaria|modalidad|para cursarla|para rendir|aprobadas?:|regular:)/i;

  const ANIO_ORDINAL = {
    primer: 1,
    primero: 1,
    segundo: 2,
    tercer: 3,
    tercero: 3,
    cuarto: 4,
    quinto: 5,
    sexto: 6,
    septimo: 7,
    séptimo: 7,
    octavo: 8,
  };

  const REGIMEN_WORD =
    /(anual|cuatrimestral|bimestral|semestral|trimestral|m[oó]dulo(?:\s*\d+)?)/i;

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

  let currentDataBase = "data";

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

  function regimenFromWord(word) {
    const w = String(word || "").toLowerCase();
    if (w.startsWith("anual")) return "A";
    return "S";
  }

  function detectAnioFromLine(line) {
    const ordinal = line.match(
      /(?:^|\b)(primer[oa]?|segundo|tercer[oa]?|cuarto|quinto|sexto|s[eé]ptimo|octavo)\s+a[nñ]o\b/i
    );
    if (ordinal) {
      const key = ordinal[1]
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const mapped = ANIO_ORDINAL[key] || ANIO_ORDINAL[key.replace(/o$/, "")];
      if (mapped) return mapped;
    }
    const anioMatch = line.match(/(?:^|\b)(\d{1,2})\s*[°ºo.]?\s*a[nñ]o\b/i);
    if (anioMatch && Number(anioMatch[1]) >= 1 && Number(anioMatch[1]) <= 12) {
      return Number(anioMatch[1]);
    }
    return null;
  }

  function isLikelySubjectName(nombre) {
    const n = cleanNombre(nombre);
    if (!n || n.length < 4 || n.length > 120) return false;
    if (SKIP_LINE.test(n)) return false;
    if (/^(para |se |la materia|ciclo |cbc|especialidades|materias?\b|final\b)/i.test(n)) return false;
    if (/para cursar|para rendir|aprobad|regular:|se requer|excepto de|inscribir|correlativa de/i.test(n)) {
      return false;
    }
    if (/\b(es correlativa)\b/i.test(n)) return false;
    if (!/[A-Za-zÁÉÍÓÚáéíóúñÑ]{3,}/.test(n)) return false;
    if (/^\d+$/.test(n)) return false;
    // fragmentos basura del PDF de correlatividades
    if (/^(final materias|materias|para cursarla|para rendir final)$/i.test(n)) return false;
    return true;
  }

  function extractPlanMeta(text, meta) {
    const raw = String(text || "");
    const out = { ...meta };
    const inst =
      raw.match(/\bUniversidad\s+Nacional\s+de\s+[^\n.]{3,40}/i) ||
      raw.match(/\bUniversidad\s+Cat[oó]lica\s+de\s+Cuyo\b/i) ||
      raw.match(/\bUniversidad\s+[A-ZÁÉÍÓÚÑ][^\n.]{3,50}/) ||
      raw.match(/\bFacultad\s+de\s+[A-ZÁÉÍÓÚÑ][^\n.]{3,50}/) ||
      raw.match(/\b(UBA|UCCuyo)\b/);
    if (inst && !out.institucion) out.institucion = normalizeSpaces(inst[0] || inst[1]);
    const carrera = raw.match(
      /(?:carrera|licenciatura)\s+de\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúñÑ\s]{3,40})/i
    ) || raw.match(/Plan de Estudios?\s+de(?:\s+la\s+Carrera\s+de)?\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúñÑ\s]{3,40})/i);
    if (carrera && !out.nombre) {
      out.nombre = normalizeSpaces(carrera[1]).replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+CS\s*\d.*$/i, "").trim();
    }
    return out;
  }

  /**
   * Detecta filas tipo: [código] Nombre … teo prac
   * o Nombre … totalHoras
   * o Nombre Anual/Cuatrimestral 250 Obligatoria (planes de otras facultades)
   */
  function parseTextLines(text) {
    const rawLines = String(text || "")
      .split(/\r?\n/)
      .map(normalizeSpaces)
      .filter(Boolean);

    // Une cortes típicos de PDF: "... Módulo" + "1 Bimestral 50 ..."
    // o título partido + "Cuatrimestral 64 Optativa"
    const lines = [];
    for (let i = 0; i < rawLines.length; i++) {
      let cur = rawLines[i]
        .replace(/HorariaModalidad/gi, "Horaria Modalidad")
        // Solo separar si el régimen empieza con mayúscula (evita partir «Cuatrimestral»)
        .replace(
          /([a-záéíóúñ])(Anual|Cuatrimestral|Bimestral|Semestral|Trimestral)\b/g,
          "$1 $2"
        );
      const next = rawLines[i + 1];
      if (
        next &&
        !detectAnioFromLine(cur) &&
        (/m[oó]dulo\s*$/i.test(cur) ||
          (/[a-záéíóúñ]$/i.test(cur) &&
            /^(?:\d+\s+)?(?:Anual|Cuatrimestral|Bimestral|Semestral|Trimestral)\b/i.test(next) &&
            !detectAnioFromLine(next)) ||
          (/[a-záéíóúñ]$/i.test(cur) &&
            /\b(?:Anual|Cuatrimestral|Bimestral|Semestral|Trimestral)\s+\d{2,4}\b/i.test(next) &&
            !/\d{2,4}/.test(cur) &&
            !detectAnioFromLine(next) &&
            next.length < 80))
      ) {
        cur = `${cur} ${next}`.replace(/\s+/g, " ").trim();
        i += 1;
      }
      lines.push(cur);
    }

    let currentAnio = 1;
    let inCurriculum = false;
    const found = [];

    for (const line of lines) {

      const anioDetected = detectAnioFromLine(line);
      if (anioDetected != null) {
        currentAnio = anioDetected;
        inCurriculum = true;
        // Si la línea solo es el encabezado de año, seguir
        if (/^(.{0,20})?(primer|segundo|tercer|cuarto|quinto|sexto|\d{1,2}).{0,10}a[nñ]o.{0,20}$/i.test(line)) {
          continue;
        }
      }

      if (/^(cbc|ciclo |especialidades b[aá]sicas|asignaturas electivas)/i.test(line)) {
        inCurriculum = true;
        continue;
      }

      if (SKIP_LINE.test(line) && !/\d{2,}/.test(line)) continue;
      if (/^materia\b.*r[eé]gimen/i.test(line)) continue;

      // Nombre + régimen + carga (+ modalidad) — típico Medicina / FCM
      let m = line.match(
        new RegExp(
          `^(.{4,100}?)\\s+${REGIMEN_WORD.source}\\s+(\\d{2,4})\\s*(Obligatoria|Optativa|Electiva)?\\s*$`,
          "i"
        )
      );
      if (m && isLikelySubjectName(m[1])) {
        const tipologia = /optativa|electiva/i.test(m[4] || "")
          ? "optativa"
          : /pr[aá]ctica final|pfo/i.test(m[1])
            ? "pps"
            : guessTipologia(m[1]);
        found.push(
          makeAsignatura(
            {
              nombre: m[1],
              anio: currentAnio,
              regimen: regimenFromWord(m[2]),
              horas_teoricas: Number(m[3]),
              horas_practicas: 0,
              tipologia,
              notas: m[4] ? `Modalidad: ${m[4]}` : "",
            },
            found.length
          )
        );
        inCurriculum = true;
        continue;
      }

      // código + nombre + 2 horas (+ posibles h/semana y régimen OCR)
      m = line.match(
        /^(\d{1,3}|[A-Z]{1,4}\d{0,3})[).\-\s]+(.+?)\s+(\d{1,4})\s+(\d{1,4})(?:\s+(\d{1,2})\s*([ASas])?)?/
      );
      if (m && /[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(m[2])) {
        const nombre = m[2]
          .replace(/\b(FB|FP|FGC|FCI)\b/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        found.push(
          makeAsignatura(
            {
              codigo: m[1],
              nombre,
              anio: currentAnio,
              area: /\bFB\b/.test(line) ? "FB" : /\bFP\b/.test(line) ? "FP" : /\bFGC\b/.test(line) ? "FGC" : /\bFCI\b/.test(line) ? "FCI" : "",
              horas_teoricas: Number(m[3]),
              horas_practicas: Number(m[4]),
              regimen: (m[6] || "S").toUpperCase(),
            },
            found.length
          )
        );
        inCurriculum = true;
        continue;
      }

      // código + nombre + 2 horas (ancla fin de línea)
      m = line.match(
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
        inCurriculum = true;
        continue;
      }

      // nombre + teo + prac (sin código)
      m = line.match(/^(.{8,120}?)\s+(\d{2,4})\s+(\d{1,4})\s*$/);
      if (m && !/^(total|suma|carga)/i.test(m[1]) && isLikelySubjectName(m[1])) {
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
        inCurriculum = true;
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
        inCurriculum = true;
        continue;
      }

      m = line.match(/^(.{10,120}?)\s+(\d{2,4})\s*(?:h(?:oras?)?)?\s*$/i);
      if (m && /[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(m[1]) && !/^(total|suma|carga|año)/i.test(m[1]) && isLikelySubjectName(m[1])) {
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
        inCurriculum = true;
        continue;
      }

      // Planes tipo listado de materias sin horas (p. ej. correlatividades):
      // importar nombres para completar horas a mano.
      if (
        inCurriculum &&
        isLikelySubjectName(line) &&
        !/\d{3,}/.test(line) &&
        line.split(" ").length <= 12 &&
        /^[A-ZÁÉÍÓÚÑ]/.test(line) &&
        !/[.,;:]$/.test(line) &&
        !/^(MEDICINA|TOCOGINECOLOG[IÍ]A|PEDIATR[IÍ]A)\s*(\([A-Z]\))?\s*$/i.test(line) &&
        !/cursando|haber curs|estar curs|para cursarla|para rendir/i.test(line) &&
        !/;/.test(line) &&
        !/\b(y|de|el|la|los|las)$/i.test(line) &&
        line.length >= 6
      ) {
        const nombreLimpio = line
          .replace(/\s*\(Es correlativa[^)]*\)\s*/gi, " ")
          .replace(/\*+$/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (!isLikelySubjectName(nombreLimpio)) continue;
        found.push(
          makeAsignatura(
            {
              nombre: nombreLimpio,
              anio: currentAnio,
              horas_teoricas: 0,
              horas_practicas: 0,
              allowZero: true,
              horas_estimadas: true,
              notas: "Horas no informadas en el PDF; completar manualmente.",
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
        if (anioMatch && !/^\d{1,3}$/.test(cells[0] || "")) {
          currentAnio = Number(anioMatch[1]);
          continue;
        }
        if (/asignatura|materia|unidad curricular|h\.?\s*totales|te[oó]ricas|c[oó]digo/i.test(joined) && cells.length <= 8) {
          continue;
        }

        // Formato ejemplo UCCuyo: código | área | asignatura | teo | prac | régimen | año
        if (
          cells.length >= 5 &&
          /^\d{1,3}$/.test(cells[0] || "") &&
          /[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(cells[2] || cells[1] || "")
        ) {
          const hasArea = /^(FB|FP|FGC|FCI|OTRA)$/i.test(cells[1] || "");
          const nombre = hasArea ? cells[2] : cells[1];
          const area = hasArea ? cells[1].toUpperCase() : guessArea(nombre);
          const teoIdx = hasArea ? 3 : 2;
          const pracIdx = hasArea ? 4 : 3;
          const teo = Number(String(cells[teoIdx] || "0").replace(",", "."));
          const prac = Number(String(cells[pracIdx] || "0").replace(",", "."));
          const regimen = (cells[hasArea ? 5 : 4] || "S").toUpperCase().slice(0, 1);
          const anioCell = cells[hasArea ? 6 : 5];
          const anio = /^\d{1,2}$/.test(anioCell || "") ? Number(anioCell) : currentAnio;
          if (Number.isFinite(teo) && Number.isFinite(prac) && (teo > 0 || prac > 0) && nombre) {
            const asig = makeAsignatura(
              {
                codigo: cells[0],
                nombre,
                anio,
                area,
                regimen: regimen === "A" ? "A" : "S",
                horas_teoricas: teo,
                horas_practicas: prac,
              },
              found.length
            );
            if (asig) found.push(asig);
            continue;
          }
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
          const hourNums = nums.filter((x) => x.n <= 800);
          if (hourNums.length >= 2) {
            teo = hourNums[hourNums.length - 2].n;
            prac = hourNums[hourNums.length - 1].n;
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
    const asignaturas = dedupeAsignaturas(fromLines);
    const enriched = extractPlanMeta(text, meta || {});
    const conHoras = asignaturas.filter((a) => a.horas_teoricas + a.horas_practicas > 0).length;
    const sinHoras = asignaturas.length - conHoras;
    let advertencia =
      "Revisá y corregí las asignaturas detectadas. Los PDF escaneados o tablas complejas pueden requerir edición manual.";
    if (asignaturas.length && sinHoras > 0 && conHoras === 0) {
      advertencia =
        `Se detectaron ${asignaturas.length} materias sin carga horaria en el archivo (p. ej. plan de correlatividades). ` +
        "Completá horas teóricas/prácticas en la tabla o usá un PDF/CSV que informe horas.";
    } else if (sinHoras > 0) {
      advertencia =
        `Se cargaron ${asignaturas.length} materias (${sinHoras} sin horas en el origen). Revisá tipologías y completá horas faltantes.`;
    } else if (asignaturas.length) {
      advertencia = `Se detectaron ${asignaturas.length} materias. Revisá tipologías, años y horas antes de calcular CRE.`;
    }
    return {
      id: enriched.id || "plan-cargado",
      nombre: enriched.nombre || "Plan cargado",
      titulo: enriched.titulo || "",
      institucion: enriched.institucion || "",
      normativa: enriched.normativa || "",
      duracion_anios: 0,
      carrera_clave: "",
      metadata: {
        fuente: enriched.fuente || "archivo",
        advertencia,
        texto_extraido: String(text || "").slice(0, 20000),
      },
      asignaturas,
    };
  }

  function parsePlanFromHtml(html, meta) {
    const fromTables = parseHtmlTables(html);
    const text = new DOMParser().parseFromString(html, "text/html").body.textContent || "";
    const fromLines = parseTextLines(text);
    const merged = dedupeAsignaturas([...fromTables, ...fromLines]);
    const enriched = extractPlanMeta(text, meta || {});
    return {
      id: enriched.id || "plan-cargado",
      nombre: enriched.nombre || "Plan cargado",
      titulo: "",
      institucion: enriched.institucion || "",
      normativa: "",
      duracion_anios: 0,
      carrera_clave: "",
      metadata: {
        fuente: enriched.fuente || "word",
        advertencia:
          "Revisá el plan detectado desde Word. Completá tipologías, años y horas si hace falta.",
        texto_extraido: text.slice(0, 20000),
      },
      asignaturas: merged,
    };
  }

  /**
   * Une líneas rotas típicas de OCR de tablas (nombre partido + horas en la siguiente).
   */
  function preprocessOcrText(text) {
    const raw = String(text || "")
      .replace(/\u00a0/g, " ")
      .split(/\r?\n/)
      .map((l) => l.replace(/[|_[\]{}]+/g, " ").replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const out = [];
    for (let i = 0; i < raw.length; i++) {
      let line = raw[i];
      // Si la línea parece nombre sin horas y la siguiente trae horas, fusionar
      const hasHours = /\b\d{2,4}\b/.test(line);
      const looksName = /[A-Za-zÁÉÍÓÚáéíóúñÑ]{4,}/.test(line) && !/^=====/.test(line);
      if (looksName && !hasHours && i + 1 < raw.length) {
        const next = raw[i + 1];
        if (/\b\d{2,4}\b/.test(next) || /[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(next)) {
          line = `${line} ${next}`;
          i += 1;
          // A veces el nombre sigue en una tercera línea antes de las horas
          if (!/\b\d{2,4}\b/.test(line) && i + 1 < raw.length && /\b\d{2,4}\b/.test(raw[i + 1])) {
            line = `${line} ${raw[i + 1]}`;
            i += 1;
          }
        }
      }
      out.push(line);
    }
    return out.join("\n");
  }

  function matchKnownPlan(text, catalog) {
    const hay = String(text || "");
    for (const entry of catalog?.planes || []) {
      const hits = (entry.patterns || []).filter((p) =>
        hay.toLowerCase().includes(String(p).toLowerCase())
      );
      if (hits.length >= (entry.min_hits || 2)) {
        return { entry, hits };
      }
    }
    return null;
  }

  async function loadKnownPlanData(entry) {
    const base = String(currentDataBase || "data").replace(/\/$/, "");
    const res = await fetch(`${base}/${entry.data_file}?v=21`);
    if (!res.ok) throw new Error(`No se pudo cargar el plan reconocido (${entry.data_file})`);
    const data = await res.json();
    data.metadata = {
      ...(data.metadata || {}),
      reconocido: true,
      fuente_reconocimiento: entry.id,
      advertencia:
        "Plan escaneado reconocido. Se cargó la grilla digitalizada porque el OCR de tablas densas suele fragmentar filas. Revisá y editá lo que necesites.",
    };
    return data;
  }

  async function extractPdfText(arrayBuffer) {
    if (!global.pdfjsLib) throw new Error("PDF.js no está disponible");
    // PDF.js puede detachar el buffer: trabajar siempre sobre una copia.
    const data =
      arrayBuffer instanceof Uint8Array ? arrayBuffer.slice() : arrayBuffer.slice(0);
    const pdf = await global.pdfjsLib.getDocument({ data }).promise;
    const parts = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
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

  async function loadPlanFromFile(file, options = {}) {
    const name = file.name || "plan";
    const lower = name.toLowerCase();
    const onProgress = options.onProgress;
    const knownCatalog = options.knownCatalog || null;
    currentDataBase = options.dataBase || "data";

    // Reconocimiento temprano por nombre (docx/pdf/csv)
    if (knownCatalog) {
      const named =
        /1098/.test(lower) && /psicolog/.test(lower)
          ? (knownCatalog.planes || []).find((p) => p.id.includes("psicologia"))
          : null;
      if (named) {
        if (onProgress) {
          onProgress({
            phase: "known",
            message: `Plan reconocido: ${named.nombre}. Cargando grilla…`,
          });
        }
        return loadKnownPlanData(named);
      }
    }

    const buf = await file.arrayBuffer();
    // Copia estable: PDF.js / workers pueden detachar el ArrayBuffer original.
    const pdfBytes = new Uint8Array(buf.slice(0));
    const meta = {
      id: "plan-" + Date.now(),
      nombre: `Plan cargado (${name})`,
      fuente: name,
    };

    if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
      const text = new TextDecoder("utf-8").decode(buf);
      if (/nombre|asignatura|horas/i.test(text.split(/\n/)[0] || "")) {
        return parseCsvPlan(text, meta);
      }
      return parsePlanFromText(text, meta);
    }

    if (lower.endsWith(".docx")) {
      try {
        const html = await extractDocxHtml(buf);
        const plan = parsePlanFromHtml(html, meta);
        if (knownCatalog) {
          const match = matchKnownPlan(
            (plan.metadata && plan.metadata.texto_extraido) || html,
            knownCatalog
          );
          if (match?.entry && plan.asignaturas.length < 10) {
            return loadKnownPlanData(match.entry);
          }
        }
        return plan;
      } catch (err) {
        // Si Mammoth falla, intentar reconocimiento / mensaje claro
        if (knownCatalog) {
          const named = (knownCatalog.planes || []).find((p) =>
            /1098/.test(lower)
          );
          if (named) return loadKnownPlanData(named);
        }
        throw new Error(
          `No se pudo leer el Word (${err.message || err}). Probá un CSV con columnas nombre, horas_teoricas y horas_practicas, o la plantilla vacía.`
        );
      }
    }
    if (lower.endsWith(".doc")) {
      throw new Error(
        "Los .doc antiguos no se pueden leer en el navegador. Guardá el archivo como .docx, PDF o CSV."
      );
    }
    if (lower.endsWith(".pdf")) {
      // Atajo adicional por patrones de nombre
      if (knownCatalog) {
        const explicit = (knownCatalog.planes || []).find((p) =>
          (p.patterns || []).some((pat) => {
            const token = String(pat).replace(/\s+/g, "").toLowerCase();
            return token.length >= 8 && lower.replace(/\s+/g, "").includes(token.slice(0, 12));
          })
        );
        if (explicit) {
          if (onProgress) {
            onProgress({
              phase: "known",
              message: `Plan reconocido por el archivo: ${explicit.nombre}. Cargando grilla…`,
            });
          }
          return loadKnownPlanData(explicit);
        }
      }

      let text = "";
      let usedOcr = false;
      let needsOcr = true;
      try {
        needsOcr = global.SacauOcr ? await global.SacauOcr.pdfNeedsOcr(pdfBytes) : true;
      } catch (err) {
        console.warn("pdfNeedsOcr falló, se intenta extracción de texto", err);
        needsOcr = false;
      }

      if (!needsOcr) {
        try {
          text = await extractPdfText(pdfBytes);
        } catch (err) {
          console.warn("extractPdfText falló", err);
          text = "";
          needsOcr = true;
        }
      }

      if (needsOcr || parseTextLines(text).length < 3) {
        if (!global.SacauOcr) {
          throw new Error(
            "Este PDF parece escaneado y el motor OCR no está disponible. Probá recargar la página."
          );
        }
        usedOcr = true;
        const preview = await global.SacauOcr.ocrPdfArrayBuffer(pdfBytes, {
          onProgress,
          maxPages: Math.min(6, options.maxOcrPages || 40),
          scale: options.ocrScale || 1.6,
        });
        text = preview.text;

        if (knownCatalog) {
          const match = matchKnownPlan(text, knownCatalog);
          if (match?.entry) {
            if (onProgress) {
              onProgress({
                phase: "known",
                message: `Plan reconocido: ${match.entry.nombre}. Cargando grilla digitalizada…`,
              });
            }
            return loadKnownPlanData(match.entry);
          }
        }

        if (preview.totalPages > preview.pages) {
          const full = await global.SacauOcr.ocrPdfArrayBuffer(pdfBytes, {
            onProgress,
            maxPages: options.maxOcrPages || 40,
            scale: options.ocrScale || 1.6,
          });
          text = full.text;
        }
      } else if (knownCatalog) {
        const match = matchKnownPlan(text, knownCatalog);
        if (match?.entry) return loadKnownPlanData(match.entry);
      }

      const cleaned = preprocessOcrText(text);
      const plan = parsePlanFromText(cleaned, meta);
      plan.metadata.ocr = usedOcr;
      plan.metadata.texto_extraido = cleaned.slice(0, 25000);
      if (!plan.asignaturas.length) {
        plan.metadata.advertencia =
          "No se pudieron armar filas confiables desde el PDF. Probá un Word/PDF en texto o un CSV con las columnas de la plantilla.";
      } else if (usedOcr) {
        plan.metadata.advertencia =
          `OCR aplicado: se detectaron ${plan.asignaturas.length} asignaturas. Revisá tipologías, años y horas.`;
      }
      return plan;
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
      nombre: "Materias del plan",
      titulo: "",
      institucion: "Universidad Católica de Cuyo",
      normativa: "",
      duracion_anios: 0,
      carrera_clave: "",
      metadata: {
        advertencia:
          "Todavía no hay asignaturas. Subí un archivo arriba o usá «Agregar asignatura».",
      },
      asignaturas: [],
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
    preprocessOcrText,
    matchKnownPlan,
  };
})(window);
