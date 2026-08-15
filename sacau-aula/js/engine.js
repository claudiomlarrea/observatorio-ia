/**
 * SACAU Aula — motor pedagógico (presupuesto CRE, diagnóstico, semáforo IA).
 */
(function (global) {
  "use strict";

  const BRIDGE_KEY = "sacau_aula_bridge_v1";
  const PLAN_KEY = "sacau_aula_plan_v1";
  const FICHA_KEY = "sacau_aula_ficha_v1";

  const CRE_CUATRI = 30;
  const CRE_ANIO = 60;
  const SEMANAS_S = 16;
  const SEMANAS_A = 32;
  const H_SEMANA_ALERTA = 12;

  function semanasFor(regimen, override) {
    const n = Number(override);
    if (n > 0) return n;
    return String(regimen || "S").toUpperCase() === "A" ? SEMANAS_A : SEMANAS_S;
  }

  function denomCarga(regimen) {
    return String(regimen || "S").toUpperCase() === "A" ? CRE_ANIO : CRE_CUATRI;
  }

  function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback == null ? 0 : fallback;
  }

  function roundCre(horas, valorCre) {
    const v = num(valorCre, 25) || 25;
    return Math.max(0, Math.round(num(horas) / v));
  }

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeAsignatura(raw) {
    const a = raw || {};
    const teo = num(a.horas_teoricas);
    const prac = num(a.horas_practicas);
    const inter = num(a.horas_interaccion, teo + prac);
    const auto = num(a.horas_autonomas, a.horas_autonomas_override);
    const valor = num(a.valor_cre, 25) || 25;
    const totales = inter + auto;
    return {
      codigo: a.codigo || "",
      nombre: a.nombre || "",
      anio: num(a.anio, 1) || 1,
      area: a.area || "OTRA",
      regimen: a.regimen === "A" ? "A" : "S",
      tipologia: a.tipologia || "teorica",
      horas_teoricas: teo,
      horas_practicas: prac,
      horas_interaccion: inter,
      horas_autonomas: auto,
      horas_totales: totales,
      valor_cre: valor,
      cre: num(a.cre, roundCre(totales, valor)),
    };
  }

  function emptyFicha(seed) {
    const asignatura = normalizeAsignatura(seed && seed.asignatura ? seed.asignatura : seed);
    const semanas = semanasFor(asignatura.regimen, seed && seed.semanas);
    return {
      v: 1,
      id: (seed && seed.id) || uid("ficha"),
      updated: new Date().toISOString(),
      institucion: (seed && seed.institucion) || "Universidad Católica de Cuyo",
      unidad_academica: (seed && seed.unidad_academica) || "",
      carrera: (seed && seed.carrera) || "",
      docente: (seed && seed.docente) || "",
      ciclo: (seed && seed.ciclo) || "",
      semanas,
      asignatura,
      ra: (seed && seed.ra) || [],
      actividades: (seed && seed.actividades) || [],
      contrato_ia: (seed && seed.contrato_ia) || "",
      notas: (seed && seed.notas) || "",
      _meta: {
        editado: Boolean(seed && seed._meta && seed._meta.editado),
        origen: (seed && seed._meta && seed._meta.origen) || "manual",
      },
    };
  }

  function syncHoras(ficha) {
    const a = ficha.asignatura;
    a.horas_interaccion = num(a.horas_teoricas) + num(a.horas_practicas);
    a.horas_totales = a.horas_interaccion + num(a.horas_autonomas);
    a.valor_cre = num(a.valor_cre, 25) || 25;
    a.cre = roundCre(a.horas_totales, a.valor_cre);
    ficha.semanas = semanasFor(a.regimen, ficha.semanas);
    ficha.updated = new Date().toISOString();
    return ficha;
  }

  function budget(ficha) {
    const a = ficha.asignatura || normalizeAsignatura({});
    const semanas = semanasFor(a.regimen, ficha.semanas);
    const ip = num(a.horas_interaccion);
    const ta = num(a.horas_autonomas);
    const total = ip + ta;
    const valor = num(a.valor_cre, 25) || 25;
    const cre = num(a.cre, roundCre(total, valor));
    const hSemana = semanas ? total / semanas : 0;
    const hSemanaIp = semanas ? ip / semanas : 0;
    const hSemanaTa = semanas ? ta / semanas : 0;
    const denom = denomCarga(a.regimen);
    const pctCarga = denom ? (cre / denom) * 100 : 0;
    return {
      semanas,
      ip,
      ta,
      total,
      valor,
      cre,
      hSemana,
      hSemanaIp,
      hSemanaTa,
      denom,
      pctCarga,
      regimen: a.regimen,
    };
  }

  function sumHoras(acts, tipo) {
    return (acts || []).reduce((acc, x) => {
      if (tipo && x.tipo !== tipo) return acc;
      return acc + num(x.horas);
    }, 0);
  }

  function sumHorasIa(acts, tipo, ia) {
    return (acts || []).reduce((acc, x) => {
      if (tipo && x.tipo !== tipo) return acc;
      if (ia && x.ia !== ia) return acc;
      return acc + num(x.horas);
    }, 0);
  }

  function classifyIa(nombre, descripcion, tipo) {
    const t = `${nombre || ""} ${descripcion || ""}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (tipo === "ip") {
      if (/ensayo casero|informe final domiciliario|multiple choice domiciliario/.test(t)) {
        return "amarillo";
      }
      return "verde";
    }
    if (
      /ensayo|monograf|informe final|resumen de capitulo|resumen de libro|traducc|powerpoint|presentacion de tema|cuestionario cerrado|multiple choice|codigo fuente sin defensa|glosa de ia|reescritura literal/.test(
        t
      )
    ) {
      return "rojo";
    }
    if (
      /defensa|oral|coloquio|terreno|campo|laboratorio|bitacora|proceso|datos primarios|caso local|observacion|error deliberado|entrevista|practica supervisada|portfolio|portafolio|declaracion de prompts|borrador fechado/.test(
        t
      )
    ) {
      return "verde";
    }
    return "amarillo";
  }

  function iaLabel(ia) {
    if (ia === "rojo") return "Rojo · una IA lo resuelve";
    if (ia === "verde") return "Verde · evidencia situada";
    return "Amarillo · la IA asiste";
  }

  function diagnose(ficha) {
    const b = budget(ficha);
    const acts = ficha.actividades || [];
    const ra = ficha.ra || [];
    const sumIp = sumHoras(acts, "ip");
    const sumTa = sumHoras(acts, "ta");
    const taRojo = sumHorasIa(acts, "ta", "rojo");
    const checks = [];

    const gapIp = Math.round(b.ip - sumIp);
    if (!acts.filter((x) => x.tipo === "ip").length) {
      checks.push({
        id: "ip_vacio",
        nivel: "warning",
        mensaje: "Todavía no hay actividades de interacción pedagógica. Generá una propuesta o cargalas a mano.",
      });
    } else if (Math.abs(gapIp) > 2) {
      checks.push({
        id: "ip_gap",
        nivel: "warning",
        mensaje: `Las actividades de interacción suman ${sumIp} h y el presupuesto es ${b.ip} h (diferencia ${gapIp > 0 ? "+" : ""}${gapIp} h).`,
      });
    } else {
      checks.push({
        id: "ip_ok",
        nivel: "ok",
        mensaje: `Interacción pedagógica coherente: ${sumIp} h de actividades ≈ ${b.ip} h del CRE.`,
      });
    }

    const gapTa = Math.round(b.ta - sumTa);
    if (!acts.filter((x) => x.tipo === "ta").length) {
      checks.push({
        id: "ta_vacio",
        nivel: "error",
        mensaje: "El trabajo autónomo es la mitad del CRE y todavía no está desglosado. Sin esto el crédito es un número vacío.",
      });
    } else if (Math.abs(gapTa) > 2) {
      checks.push({
        id: "ta_gap",
        nivel: "warning",
        mensaje: `El autónomo declarado suma ${sumTa} h y el presupuesto es ${b.ta} h (diferencia ${gapTa > 0 ? "+" : ""}${gapTa} h). Ajustá horas o reconciliá el presupuesto.`,
      });
    } else {
      checks.push({
        id: "ta_ok",
        nivel: "ok",
        mensaje: `Trabajo autónomo cubierto: ${sumTa} h de actividades ≈ ${b.ta} h del CRE.`,
      });
    }

    const pctRojo = b.ta ? (taRojo / b.ta) * 100 : 0;
    if (taRojo > 0 && pctRojo >= 35) {
      checks.push({
        id: "ia_rojo",
        nivel: "error",
        mensaje: `${Math.round(pctRojo)} % del autónomo (${taRojo} h) está en rojo: una IA lo resuelve en minutos. Esas horas no son CRE real. Aplicá el rediseño.`,
      });
    } else if (taRojo > 0) {
      checks.push({
        id: "ia_rojo_parcial",
        nivel: "warning",
        mensaje: `Hay ${taRojo} h autónomas en rojo. Rediseñalas a evidencias de proceso, caso situado o defensa.`,
      });
    } else if (acts.some((x) => x.tipo === "ta")) {
      checks.push({
        id: "ia_ok",
        nivel: "ok",
        mensaje: "Ninguna actividad autónoma quedó en rojo. El crédito puede defenderse como tiempo de aprendizaje.",
      });
    }

    if (b.hSemana >= H_SEMANA_ALERTA) {
      checks.push({
        id: "carga_semana",
        nivel: "warning",
        mensaje: `Esta cátedra pide ${b.hSemana.toFixed(1)} h/semana. Revisá si es compatible con el resto del ${b.regimen === "A" ? "año" : "cuatrimestre"} (~${b.denom} CRE).`,
      });
    } else if (b.total > 0) {
      checks.push({
        id: "carga_ok",
        nivel: "ok",
        mensaje: `Esfuerzo semanal orientativo: ${b.hSemana.toFixed(1)} h (${b.hSemanaIp.toFixed(1)} de clase + ${b.hSemanaTa.toFixed(1)} autónomas).`,
      });
    }

    if (b.pctCarga >= 40) {
      checks.push({
        id: "peso_plan",
        nivel: "warning",
        mensaje: `Esta materia representa ${b.pctCarga.toFixed(0)} % de un ${b.regimen === "A" ? "año de 60 CRE" : "cuatrimestre de 30 CRE"}. Confirmá que el peso es intencional.`,
      });
    }

    if (!ra.length || ra.every((r) => !String(r.texto || "").trim())) {
      checks.push({
        id: "ra_vacio",
        nivel: "warning",
        mensaje: "Faltan resultados de aprendizaje de la cátedra. El CRE certifica RA, no horas de clase.",
      });
    } else {
      const used = new Set(acts.map((x) => x.ra_id).filter(Boolean));
      const huérfanos = ra.filter((r) => String(r.texto || "").trim() && !used.has(r.id));
      if (huérfanos.length) {
        checks.push({
          id: "ra_huerfanos",
          nivel: "warning",
          mensaje: `${huérfanos.length} resultado(s) de aprendizaje no tienen actividad asociada. Vinculalos o reformulalos.`,
        });
      } else {
        checks.push({
          id: "ra_ok",
          nivel: "ok",
          mensaje: "Cada resultado de aprendizaje tiene al menos una actividad que lo sostiene.",
        });
      }
    }

    if (!String(ficha.contrato_ia || "").trim()) {
      checks.push({
        id: "contrato",
        nivel: "warning",
        mensaje: "Generá la cláusula de uso de IA de la cátedra. El estudiante necesita reglas claras, no un silencio.",
      });
    } else {
      checks.push({
        id: "contrato_ok",
        nivel: "ok",
        mensaje: "Hay cláusula de uso de IA. Revisala antes de bajarla al programa.",
      });
    }

    const score = {
      ok: checks.filter((c) => c.nivel === "ok").length,
      warning: checks.filter((c) => c.nivel === "warning").length,
      error: checks.filter((c) => c.nivel === "error").length,
    };
    return { checks, score, budget: b, sumIp, sumTa, taRojo, pctRojo };
  }

  function reconcileAutonomo(ficha) {
    const b = budget(ficha);
    const tas = (ficha.actividades || []).filter((x) => x.tipo === "ta");
    if (!tas.length) return ficha;
    const sum = sumHoras(tas, "ta");
    const gap = Math.round(b.ta - sum);
    if (!gap) return ficha;
    const last = tas[tas.length - 1];
    last.horas = Math.max(0, num(last.horas) + gap);
    return ficha;
  }

  function buildContrato(ficha) {
    const a = ficha.asignatura || {};
    const tas = (ficha.actividades || []).filter((x) => x.tipo === "ta");
    const verdes = tas.filter((x) => x.ia === "verde").map((x) => x.nombre).filter(Boolean);
    const amarillas = tas.filter((x) => x.ia === "amarillo").map((x) => x.nombre).filter(Boolean);
    const rojas = tas.filter((x) => x.ia === "rojo").map((x) => x.nombre).filter(Boolean);
    const materia = a.nombre || "esta asignatura";
    const lines = [
      `Cláusula de uso de inteligencia artificial — ${materia}`,
      "",
      "Esta cátedra asume que el estudiante puede acceder a herramientas de IA. El CRE mide tiempo de trabajo académico real; por eso se evalúa el proceso y la defensa, no solo el producto final.",
      "",
      "Permitido (con declaración)",
      amarillas.length
        ? `• Usar IA como asistencia en: ${amarillas.join("; ")}.`
        : "• Usar IA como apoyo a la comprensión, siempre que el producto entregado sea propio y se declare el uso.",
      "• Declarar herramienta, propósito y una síntesis de los prompts en una nota al pie o bitácora.",
      "",
      "Esperado (evidencia de proceso)",
      verdes.length
        ? `• Las siguientes actividades requieren evidencia situada (no sustituible por IA): ${verdes.join("; ")}.`
        : "• Toda entrega sustancial incluye rastro de proceso: borradores, datos, bitácora o defensa breve.",
      "",
      "No permitido",
      rojas.length
        ? `• Presentar como propio el producto de una IA en: ${rojas.join("; ")}. Estas consignas deben rediseñarse o defenderse oralmente.`
        : "• Presentar como propio un texto, código o análisis generado por IA sin trabajo intelectual demostrable.",
      "• Inventar fuentes, datos o citas. La alucinación es responsabilidad del estudiante.",
      "",
      "Cómo se evalúa",
      "La rúbrica pondera argumentación situada, trazabilidad del proceso, uso ético de fuentes y capacidad de defensa. Un producto correcto sin proceso no acredita el RA ni el CRE de la actividad.",
    ];
    return lines.join("\n");
  }

  function fichaFromSeedItem(item, meta) {
    const asignatura = normalizeAsignatura(item);
    return emptyFicha({
      institucion: (meta && meta.institucion) || "Universidad Católica de Cuyo",
      carrera: (meta && meta.carrera) || "",
      asignatura,
      _meta: { origen: "sacau-cre", editado: false },
    });
  }

  function readJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function consumeBridge() {
    const bridge = readJson(BRIDGE_KEY);
    if (!bridge || !Array.isArray(bridge.items) || !bridge.items.length) {
      return { bridge: null, plan: readJson(PLAN_KEY) };
    }
    const plan = {
      v: 1,
      source: bridge.source || "sacau-cre",
      ts: bridge.ts || Date.now(),
      institucion: bridge.institucion || "Universidad Católica de Cuyo",
      carrera: bridge.carrera || "",
      tipo_carrera: bridge.tipo_carrera || "grado",
      valor_cre: bridge.valor_cre || 25,
      selected: bridge.selected,
      items: bridge.items,
    };
    try {
      writeJson(PLAN_KEY, plan);
      localStorage.removeItem(BRIDGE_KEY);
    } catch (_) {
      /* ignore quota */
    }
    return { bridge, plan };
  }

  function saveFicha(ficha) {
    try {
      writeJson(FICHA_KEY, ficha);
    } catch (_) {
      /* ignore */
    }
    return ficha;
  }

  function loadFicha() {
    const data = readJson(FICHA_KEY);
    if (!data || !data.asignatura) return null;
    return data;
  }

  function slug(ficha) {
    const n = (ficha.asignatura && ficha.asignatura.nombre) || ficha.id || "programa";
    return String(n)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "programa";
  }

  global.SacauAulaEngine = {
    BRIDGE_KEY,
    PLAN_KEY,
    FICHA_KEY,
    CRE_CUATRI,
    CRE_ANIO,
    SEMANAS_S,
    SEMANAS_A,
    uid,
    num,
    roundCre,
    semanasFor,
    normalizeAsignatura,
    emptyFicha,
    syncHoras,
    budget,
    sumHoras,
    sumHorasIa,
    classifyIa,
    iaLabel,
    diagnose,
    reconcileAutonomo,
    buildContrato,
    fichaFromSeedItem,
    consumeBridge,
    saveFicha,
    loadFicha,
    readJson,
    writeJson,
    slug,
  };
})(typeof window !== "undefined" ? window : globalThis);
