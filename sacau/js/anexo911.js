/**
 * Anexo curricular editable (Res. 911-CS-2026 UCCuyo).
 * El sistema propone un borrador; el usuario lo adapta a su carrera.
 */
(function (global) {
  "use strict";

  const FIELD_ORDER = [
    "perfil_egreso",
    "competencias_genericas",
    "competencias_especificas",
    "resultados_aprendizaje",
    "despliegue_horas",
    "flexibilidad_curricular",
    "reconocimiento_trayectos",
    "movilidad",
    "matriz_tributacion",
    "notas_unidad_academica",
  ];

  function fillTemplate(text, vars) {
    return String(text || "").replace(/\{\{(\w+)\}\}/g, (_, k) =>
      vars[k] != null ? String(vars[k]) : ""
    );
  }

  function despliegueAuto(plan, conv) {
    const t = conv?.totales || {};
    const n = (plan.asignaturas || []).length;
    const inter = Number(t.horas_interaccion || 0);
    const auto = Number(t.horas_autonomas || 0);
    const tot = Number(t.horas_totales || 0);
    const cre = Number(t.cre || 0);
    const anios = Number(t.anios || plan.duracion_anios || 0);
    const creAnual = Number(t.cre_promedio_anual || 0);
    const areas = {};
    for (const a of plan.asignaturas || []) {
      const k = a.area || "OTRA";
      areas[k] = (areas[k] || 0) + 1;
    }
    const areaTxt = Object.keys(areas)
      .sort()
      .map((k) => `${k}: ${areas[k]} asignaturas`)
      .join("; ");
    return (
      `Síntesis automática del despliegue de horas del plan «${plan.nombre || "Plan"}»:\n` +
      `• Asignaturas: ${n}\n` +
      `• Interacción pedagógica: ${inter.toLocaleString("es-AR")} h\n` +
      `• Trabajo autónomo estimado: ${auto.toLocaleString("es-AR")} h\n` +
      `• Trabajo total del estudiante: ${tot.toLocaleString("es-AR")} h\n` +
      `• CRE totales: ${cre.toFixed(1)} · CRE/año: ${creAnual.toFixed(1)} · Duración: ${anios || "—"} año(s)\n` +
      `• Distribución por área (conteo): ${areaTxt || "sin datos"}\n` +
      `Esta síntesis se puede editar: no reemplaza el análisis pedagógico de la unidad académica.`
    );
  }

  function buildDraft(plantillas, plan, conv, tipoCarrera) {
    const tipo = tipoCarrera || plan.tipo_carrera || "grado";
    const carreraClave = plan.carrera_clave || "";
    const vars = {
      carrera: plan.nombre || plan.titulo || "la carrera",
      institucion: plan.institucion || "Universidad Católica de Cuyo",
      despliegue_auto: despliegueAuto(plan, conv),
    };
    const base = { ...(plantillas.base || {}) };
    const byTipo = (plantillas.por_tipo && plantillas.por_tipo[tipo]) || {};
    const byCarrera = (plantillas.por_carrera && plantillas.por_carrera[carreraClave]) || {};
    const out = {};
    for (const id of FIELD_ORDER) {
      const raw = byCarrera[id] || byTipo[id] || base[id] || "";
      out[id] = fillTemplate(raw, vars);
    }
    out._meta = {
      generado: new Date().toISOString().slice(0, 10),
      tipo_carrera: tipo,
      referencia: plantillas.referencia || "Res. 911-CS-2026",
      editado_por_usuario: false,
    };
    return out;
  }

  function refreshDespliegue(anexo, plan, conv) {
    if (!anexo) return anexo;
    const next = { ...anexo };
    const auto = despliegueAuto(plan, conv);
    // Si el usuario no personalizó mucho, regenerar bloque automático manteniendo notas manuales tras el auto.
    const prev = String(next.despliegue_horas || "");
    const marker = "Criterio institucional UCCuyo";
    if (!prev.trim() || prev.includes("Síntesis automática del despliegue")) {
      const manualTail = prev.includes(marker) ? prev.slice(prev.indexOf(marker)) : "";
      next.despliegue_horas = manualTail
        ? `${auto}\n\n${manualTail}`
        : `${auto}\n\nCriterio institucional UCCuyo (Res. 788-CS-2026): 1 CRE = 25 h (hasta 30 justificado).`;
    }
    return next;
  }

  function emptyAnexo(plantillas) {
    const out = {};
    for (const id of FIELD_ORDER) out[id] = "";
    out._meta = {
      generado: "",
      tipo_carrera: "",
      referencia: plantillas?.referencia || "Res. 911-CS-2026",
      editado_por_usuario: false,
    };
    return out;
  }

  function fields(plantillas) {
    return plantillas?.campos || FIELD_ORDER.map((id) => ({ id, label: id, ayuda: "" }));
  }

  global.SacauAnexo911 = {
    FIELD_ORDER,
    buildDraft,
    refreshDespliegue,
    emptyAnexo,
    fields,
    despliegueAuto,
  };
})(window);
