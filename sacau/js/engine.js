/**
 * Motor SACAU (JS) — espejo de engine/convert.py + validate.py
 */
(function (global) {
  "use strict";

  function roundToStep(value, step) {
    if (!step || step <= 0) return Number(value);
    const rounded = Math.round(Number(value) / step) * step;
    // Evitar residuos de coma flotante (p. ej. 49.0000000002)
    const decimals = step >= 1 ? 0 : String(step).includes(".") ? String(step).split(".")[1].length : 0;
    return Number(rounded.toFixed(Math.min(6, decimals + 2)));
  }

  /** Cantidad de decimales a mostrar según el paso de redondeo. */
  function creDecimals(step) {
    const s = Number(step);
    if (!s || s <= 0) return 2; // exacto: hasta 2 decimales útiles
    if (s >= 1) return 0;
    if (s >= 0.5) return 1;
    return 2;
  }

  function formatCre(value, step) {
    const d = creDecimals(step);
    return Number(value || 0).toLocaleString("es-AR", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  }

  function estimateAutonomous(asig, tipologias) {
    if (asig.horas_autonomas_override != null && asig.horas_autonomas_override !== "") {
      return { horas: Number(asig.horas_autonomas_override), fuente: "override" };
    }
    const tip = tipologias[asig.tipologia] || tipologias.teorica || {
      ratio_autonomo: 1,
      autonomas_fijas: 0,
    };
    const inter = Number(asig.horas_teoricas || 0) + Number(asig.horas_practicas || 0);
    return {
      horas: inter * Number(tip.ratio_autonomo || 0) + Number(tip.autonomas_fijas || 0),
      fuente: "tipologia",
    };
  }

  function convertAsignatura(asig, options) {
    const inter = Number(asig.horas_teoricas || 0) + Number(asig.horas_practicas || 0);
    const { horas: autonomas, fuente } = estimateAutonomous(asig, options.tipologias);
    const totales = inter + autonomas;
    const valorCre =
      asig.valor_cre_override != null && asig.valor_cre_override !== ""
        ? Number(asig.valor_cre_override)
        : Number(options.valor_cre_default);
    const cre = roundToStep(totales / valorCre, options.redondeo_cre);
    return {
      asignatura: asig,
      horas_interaccion: inter,
      horas_autonomas: autonomas,
      horas_totales: totales,
      valor_cre: valorCre,
      cre,
      autonomas_fuente: fuente,
    };
  }

  function computeTotales(items, duracionAnios) {
    const tot = {
      horas_teoricas: 0,
      horas_practicas: 0,
      horas_interaccion: 0,
      horas_autonomas: 0,
      horas_totales: 0,
      cre: 0,
      anios: duracionAnios || 0,
      cre_promedio_anual: 0,
    };
    for (const i of items) {
      tot.horas_teoricas += Number(i.asignatura.horas_teoricas || 0);
      tot.horas_practicas += Number(i.asignatura.horas_practicas || 0);
      tot.horas_interaccion += i.horas_interaccion;
      tot.horas_autonomas += i.horas_autonomas;
      tot.horas_totales += i.horas_totales;
      tot.cre += i.cre;
    }
    if (!tot.anios && items.length) {
      tot.anios = Math.max(...items.map((i) => Number(i.asignatura.anio || 1)));
    }
    tot.cre_promedio_anual = tot.anios ? tot.cre / tot.anios : 0;
    return tot;
  }

  function groupBy(items, keyFn) {
    const map = {};
    for (const item of items) {
      const k = keyFn(item);
      (map[k] ||= []).push(item);
    }
    return map;
  }

  function convertPlan(plan, options) {
    const items = (plan.asignaturas || []).map((a) => convertAsignatura(a, options));
    return {
      plan,
      items,
      totales: computeTotales(items, plan.duracion_anios),
      opciones: options,
    };
  }

  function cmp(id, actual, minimo, okMsg, failMsg, unidad, soft) {
    if (actual >= minimo) {
      return { id, nivel: "ok", mensaje: okMsg, actual, esperado: minimo, unidad };
    }
    return {
      id,
      nivel: soft ? "warning" : "error",
      mensaje: failMsg,
      actual,
      esperado: minimo,
      unidad,
    };
  }

  function validateSacau(planConv, normas, tipoCarrera) {
    const sacau = normas.sacau || {};
    const tipos = normas.tipos_carrera || {};
    const tipo = tipoCarrera || planConv.plan.tipo_carrera || "grado";
    const cfg = tipos[tipo] || tipos.grado || {};
    const t = planConv.totales;
    const step = planConv.opciones?.redondeo_cre;
    const creTxt = (n) => formatCre(n, step);
    const checks = [];
    const label = cfg.label || "Grado";
    const minCre = Number(cfg.min_cre != null ? cfg.min_cre : sacau.grado_min_cre || 240);
    checks.push(
      cmp(
        "sacau_min_cre",
        t.cre,
        minCre,
        `CRE totales (${creTxt(t.cre)}) cumplen el mínimo de ${label} (${minCre}).`,
        `CRE totales (${creTxt(t.cre)}) están por debajo del mínimo de ${label} (${minCre}).`,
        "CRE"
      )
    );
    const minInter = cfg.min_horas_interaccion;
    if (minInter != null) {
      checks.push(
        cmp(
          "sacau_min_interaccion",
          t.horas_interaccion,
          Number(minInter),
          `Horas de interacción (${t.horas_interaccion.toFixed(0)}) cumplen el mínimo (${minInter}).`,
          `Horas de interacción (${t.horas_interaccion.toFixed(0)}) están por debajo del mínimo (${minInter}).`,
          "h"
        )
      );
    } else if (cfg.nota) {
      checks.push({
        id: "sacau_min_interaccion",
        nivel: "warning",
        mensaje: cfg.nota,
      });
    }
    const exceso = Number(sacau.exceso_max_sobre_minimo != null ? sacau.exceso_max_sobre_minimo : 0.25);
    const maxCreRec = minCre * (1 + exceso);
    if (t.cre > maxCreRec) {
      checks.push({
        id: "sacau_max_cre_rec",
        nivel: "warning",
        mensaje: `CRE totales (${creTxt(t.cre)}) exceden la recomendación de no superar +${Math.round(
          exceso * 100
        )}% del mínimo (${maxCreRec.toFixed(0)} CRE).`,
        actual: t.cre,
        esperado: maxCreRec,
        unidad: "CRE",
      });
    } else {
      checks.push({
        id: "sacau_max_cre_rec",
        nivel: "ok",
        mensaje: `CRE totales (${creTxt(t.cre)}) dentro de la recomendación (≤ ${maxCreRec.toFixed(
          0
        )} = mínimo + ${Math.round(exceso * 100)}%).`,
        actual: t.cre,
        esperado: maxCreRec,
        unidad: "CRE",
      });
    }
    const refAnual = Number(sacau.cre_promedio_anual || 60);
    const tol = Number(sacau.cre_anual_tolerancia || 10);
    if (t.anios) {
      const diff = Math.abs(t.cre_promedio_anual - refAnual);
      checks.push({
        id: "sacau_cre_anual",
        nivel: diff <= tol ? "ok" : "warning",
        mensaje:
          diff <= tol
            ? `Promedio anual ${creTxt(t.cre_promedio_anual)} CRE ≈ ${refAnual} (±${tol}).`
            : `Promedio anual ${creTxt(t.cre_promedio_anual)} CRE se aleja de ${refAnual} (±${tol}). Revisar redistribución.`,
        actual: t.cre_promedio_anual,
        esperado: refAnual,
        unidad: "CRE/año",
      });
    }
    if (t.horas_autonomas > 0 && t.horas_interaccion > 0) {
      checks.push({
        id: "sacau_distincion_horas",
        nivel: "ok",
        mensaje:
          "El plan distingue horas de interacción y de trabajo autónomo (las autónomas no se verifican en validez nacional).",
      });
    } else {
      checks.push({
        id: "sacau_distincion_horas",
        nivel: "warning",
        mensaje:
          "Faltan horas autónomas estimadas: el SACAU requiere explicitar interacción y trabajo autónomo.",
      });
    }
    return checks;
  }

  function validatePsicologia(planConv, normas) {
    const psico = normas.psicologia || normas;
    const t = planConv.totales;
    const byArea = groupBy(planConv.items, (i) => i.asignatura.area || "SIN_AREA");
    const areaTot = (area) =>
      byArea[area] ? computeTotales(byArea[area]) : { horas_interaccion: 0, horas_practicas: 0 };
    const checks = [];
    const minTotal = Number(psico.min_horas_interaccion || 3000);
    checks.push(
      cmp(
        "psico_min_interaccion",
        t.horas_interaccion,
        minTotal,
        `Carga de interacción (${t.horas_interaccion.toFixed(0)} h) ≥ ${minTotal} h del estándar.`,
        `Carga de interacción (${t.horas_interaccion.toFixed(0)} h) < ${minTotal} h del estándar de Psicología.`,
        "h"
      )
    );
    const basica = areaTot("FB").horas_interaccion + areaTot("FGC").horas_interaccion;
    const minBasica = Number(psico.min_horas_formacion_basica || 1100);
    checks.push(
      cmp(
        "psico_min_basica",
        basica,
        minBasica,
        `Formación básica aproximada FB+FGC (${basica.toFixed(0)} h) ≥ ${minBasica} h.`,
        `Formación básica aproximada FB+FGC (${basica.toFixed(0)} h) < ${minBasica} h.`,
        "h",
        true
      )
    );
    const fp = areaTot("FP");
    const minProf = Number(psico.min_horas_formacion_profesional || 1900);
    checks.push(
      cmp(
        "psico_min_profesional",
        fp.horas_interaccion,
        minProf,
        `Formación profesional FP (${fp.horas_interaccion.toFixed(0)} h) ≥ ${minProf} h.`,
        `Formación profesional FP (${fp.horas_interaccion.toFixed(0)} h) < ${minProf} h (puede requerir reclasificación de áreas).`,
        "h",
        true
      )
    );
    const minPrac = Number(psico.min_horas_practica || 500);
    checks.push(
      cmp(
        "psico_min_practica",
        t.horas_practicas,
        minPrac,
        `Horas prácticas (${t.horas_practicas.toFixed(0)}) ≥ ${minPrac}.`,
        `Horas prácticas (${t.horas_practicas.toFixed(0)}) < ${minPrac}.`,
        "h"
      )
    );
    const minPracFp = Number(psico.min_horas_practica_profesional || 400);
    checks.push(
      cmp(
        "psico_min_practica_fp",
        fp.horas_practicas,
        minPracFp,
        `Prácticas en FP (${fp.horas_practicas.toFixed(0)} h) ≥ ${minPracFp} h.`,
        `Prácticas en FP (${fp.horas_practicas.toFixed(0)} h) < ${minPracFp} h.`,
        "h"
      )
    );
    const ppsIds = new Set(psico.pps_codigos || ["50", "PPS"]);
    const ppsHoras = planConv.items.reduce((acc, i) => {
      const n = (i.asignatura.nombre || "").toLowerCase();
      if (ppsIds.has(String(i.asignatura.codigo)) || n.includes("práctica profesional")) {
        return acc + Number(i.asignatura.horas_practicas || 0);
      }
      return acc;
    }, 0);
    const minPps = Number(psico.min_horas_pps || 250);
    checks.push(
      cmp(
        "psico_min_pps",
        ppsHoras,
        minPps,
        `PPS (${ppsHoras.toFixed(0)} h prácticas) ≥ ${minPps} h.`,
        `PPS (${ppsHoras.toFixed(0)} h prácticas) < ${minPps} h.`,
        "h"
      )
    );
    return checks;
  }

  function validatePlan(planConv, normasUccuyo, normasCarrera, tipoCarrera) {
    const tipo =
      tipoCarrera ||
      planConv.plan.tipo_carrera ||
      (planConv.plan.carrera_clave === "psicologia" ? "art43" : "grado");
    const checks = validateSacau(planConv, normasUccuyo, tipo);
    const cfg = (normasUccuyo.tipos_carrera || {})[tipo] || {};
    const usarArt43 =
      Boolean(cfg.aplicar_art43) || planConv.plan.carrera_clave === "psicologia";
    if (usarArt43 && normasCarrera) {
      checks.push(...validatePsicologia(planConv, normasCarrera));
    }
    return { checks, tipo_carrera: tipo };
  }

  function toCsv(planConv) {
    const headers = [
      "codigo",
      "nombre",
      "anio",
      "area",
      "regimen",
      "tipologia",
      "horas_teoricas",
      "horas_practicas",
      "horas_interaccion",
      "horas_autonomas",
      "autonomas_fuente",
      "horas_totales",
      "valor_cre",
      "cre",
    ];
    const lines = [headers.join(",")];
    for (const i of planConv.items) {
      const a = i.asignatura;
      const row = [
        a.codigo,
        `"${String(a.nombre || "").replace(/"/g, '""')}"`,
        a.anio,
        a.area,
        a.regimen,
        a.tipologia,
        a.horas_teoricas,
        a.horas_practicas,
        i.horas_interaccion,
        i.horas_autonomas,
        i.autonomas_fuente,
        i.horas_totales,
        i.valor_cre,
        i.cre,
      ];
      lines.push(row.join(","));
    }
    return "\uFEFF" + lines.join("\n");
  }

  global.SacauEngine = {
    convertPlan,
    validatePlan,
    computeTotales,
    groupBy,
    toCsv,
    roundToStep,
    creDecimals,
    formatCre,
  };
})(window);
