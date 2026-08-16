/**
 * SACAU Aula — plantillas de actividades, RA y rediseños (por tipología).
 */
(function (global) {
  "use strict";

  const E = global.SacauAulaEngine;

  const TIPOLOGIA_LABEL = {
    teorica: "Teórica / teórico-práctica áulica",
    taller: "Taller / seminario",
    practica_supervisada: "Práctica supervisada en asignatura",
    pps: "Práctica Profesional Supervisada (PPS)",
    tif: "Trabajo integrador final / tesis de grado",
    optativa: "Optativa / electiva",
  };

  const REDISENOS = [
    {
      id: "ensayo",
      re: /ensayo|monograf|informe final|trabajo escrito domiciliario/,
      titulo: "Del ensayo casero al dossier de proceso",
      texto:
        "Reemplazá el ensayo o informe final domiciliario por un dossier: tres borradores fechados, declaración de prompts (si hubo IA), aplicación a un caso local o datos del estudiante, y defensa oral de 8–10 minutos. Las horas autónomas se sostienen; la evidencia pasa a ser humana y situada.",
    },
    {
      id: "resumen",
      re: /resumen|sintesis de lectura|glosa/,
      titulo: "De la glosa a la lectura con error",
      texto:
        "En vez de un resumen (una IA lo resuelve), pedí una bitácora de lectura: tesis del autor, dos objeciones propias, y la corrección de un error deliberado que vos insertás en un párrafo. Se declara cualquier asistencia de IA.",
    },
    {
      id: "ppt",
      re: /powerpoint|presentacion de tema|diapositivas/,
      titulo: "De las diapositivas al caso defendible",
      texto:
        "Sustituí la presentación genérica por un caso del medio local (institución, dato, paciente simulado, expediente) y una defensa de 7 minutos con preguntas. El archivo visual es apoyo, no la evidencia.",
    },
    {
      id: "cuestionario",
      re: /cuestionario|multiple choice|preguntas cerradas/,
      titulo: "Del cuestionario domiciliario al coloquio",
      texto:
        "Las preguntas cerradas en casa no miden RA en 2026. Pasalas a un coloquio breve, a un problema abierto con justificación, o a un examen presencial (EvaluAR si es papel).",
    },
    {
      id: "codigo",
      re: /codigo|programa|script/,
      titulo: "Del código entregable a la traza",
      texto:
        "Pedí repositorio con commits, explicación oral de una función crítica y una variante que el estudiante no puede haber copiado (dato o restricción tuya). La IA puede asistir; no puede defender.",
    },
  ];

  function packFor(tipologia) {
    const t = tipologia || "teorica";
    if (t === "taller") {
      return {
        ip: [
          { nombre: "Taller presencial / seminario", w: 8, desc: "Trabajo en aula o entorno mediado con conducción docente." },
          { nombre: "Devoluciones y cierre de entregas", w: 2, desc: "Instancias de retroalimentación y puesta en común." },
        ],
        ta: [
          { nombre: "Avance del proyecto o producto de taller", w: 4, desc: "Producción iterada con rastro de versiones." },
          { nombre: "Bitácora de proceso (individual o de equipo)", w: 3, desc: "Registro fechado de decisiones, roles y dificultades." },
          { nombre: "Preparación de la defensa o muestra", w: 2, desc: "Ensayo de oralidad y evidencias de respaldo." },
          { nombre: "Lectura técnica de apoyo", w: 1, desc: "Textos cortos aplicados al producto, no glosa genérica." },
        ],
      };
    }
    if (t === "practica_supervisada" || t === "pps") {
      return {
        ip: [
          { nombre: "Práctica en terreno, laboratorio o institución", w: 8, desc: "Interacción pedagógica en el espacio de desempeño." },
          { nombre: "Supervisión y ateneo", w: 2, desc: "Análisis de casos y devolución del equipo docente." },
        ],
        ta: [
          { nombre: "Registros y bitácora de práctica", w: 4, desc: "Evidencia primaria del estudiante (no reescribible por IA)." },
          { nombre: "Informe de caso situado", w: 3, desc: "Un caso real o simulado alto, con datos que el docente puede verificar." },
          { nombre: "Preparación de supervisión", w: 2, desc: "Preguntas, dilemas éticos y lectura puntual." },
          { nombre: "Estudio de protocolos y marco normativo", w: 1, desc: "Lectura aplicada a la práctica, con nota de pertinencia." },
        ],
      };
    }
    if (t === "tif") {
      return {
        ip: [
          { nombre: "Tutorías de dirección / codirección", w: 7, desc: "Interacción de orientación del trabajo integrador." },
          { nombre: "Instancias de avance (ateneo o predefensa)", w: 3, desc: "Puesta en común de avances y ajustes." },
        ],
        ta: [
          { nombre: "Revisión bibliográfica con mapa de fuentes", w: 3, desc: "Selección crítica; cada fuente con nota de uso. No listado generado." },
          { nombre: "Escritura con borradores fechados", w: 3, desc: "Tres hitos de texto con control de cambios o versiones." },
          { nombre: "Análisis / trabajo de campo / evidencia empírica", w: 3, desc: "Datos, corpus o caso que el director puede auditar." },
          { nombre: "Preparación de la defensa", w: 1, desc: "Oralidad, limitaciones y respuestas a objeciones." },
        ],
      };
    }
    return {
      ip: [
        { nombre: "Clases teórico-prácticas (presencial o mediada)", w: 8, desc: "Interacción docente–estudiante: explicación, diálogo, ejercitación guiada." },
        { nombre: "Evaluación presencial / coloquio", w: 2, desc: "Instancia de verificación en tiempo real (papel, oral o laboratorio)." },
      ],
      ta: [
        { nombre: "Lectura de bibliografía obligatoria con bitácora", w: 3, desc: "Tesis del texto, objeción propia y vínculo con la clase. No un resumen genérico." },
        { nombre: "Guía de problemas o casos", w: 2, desc: "Resolución con justificación; la IA puede asistir, no reemplazar el criterio." },
        { nombre: "Dossier de proceso (borradores + declaración de prompts)", w: 3, desc: "Producción escrita con rastro. Sustituye al ensayo casero." },
        { nombre: "Preparación de la instancia de evaluación", w: 1, desc: "Estudio activo: preguntas, esquemas, autoevaluación." },
        { nombre: "Estudio y consolidación", w: 1, desc: "Tiempo de cierre: releer apuntes, integrar núcleos, consultar dudas." },
      ],
    };
  }

  function distributeInt(total, weights) {
    const t = Math.max(0, Math.round(Number(total) || 0));
    const sumW = weights.reduce((a, b) => a + b, 0) || 1;
    const floors = weights.map((w) => Math.floor((t * w) / sumW));
    let rem = t - floors.reduce((a, b) => a + b, 0);
    const order = weights
      .map((w, i) => [w, i])
      .sort((a, b) => b[0] - a[0]);
    let k = 0;
    while (rem > 0 && order.length) {
      floors[order[k % order.length][1]] += 1;
      rem -= 1;
      k += 1;
    }
    return floors;
  }

  function makeAct(tipo, item, horas, raId) {
    const ia = E.classifyIa(item.nombre, item.desc, tipo);
    return {
      id: E.uid(tipo),
      tipo,
      nombre: item.nombre,
      horas,
      descripcion: item.desc,
      ia,
      rediseño: suggestRedesign(item.nombre, item.desc),
      ra_id: raId || "",
      semanas: "",
    };
  }

  function suggestRedesign(nombre, descripcion) {
    const t = `${nombre || ""} ${descripcion || ""}`.toLowerCase();
    for (const r of REDISENOS) {
      if (r.re.test(t)) return `${r.titulo}. ${r.texto}`;
    }
    if (E.classifyIa(nombre, descripcion, "ta") === "rojo") {
      return REDISENOS[0].texto;
    }
    if (E.classifyIa(nombre, descripcion, "ta") === "amarillo") {
      return "Mantené la actividad, pero exigí rastro: declaración de IA, una decisión que el estudiante debe justificar, y una verificación breve (oral, en clase o con dato local).";
    }
    return "";
  }

  function raTemplates(asignatura) {
    const nombre = asignatura.nombre || "la asignatura";
    const tip = TIPOLOGIA_LABEL[asignatura.tipologia] || "el espacio curricular";
    return [
      {
        id: E.uid("ra"),
        texto: `Explicar los núcleos conceptuales y el vocabulario de ${nombre}, situándolos en debates actuales del campo.`,
        evidencia: "Coloquio, guía justificada o mapa conceptual defendido en clase.",
        criterio: "Precisión, uso de fuentes y capacidad de distinguir lo esencial de lo accesorio.",
      },
      {
        id: E.uid("ra"),
        texto: `Aplicar métodos, técnicas o procedimientos de ${tip} a situaciones guiadas o casos del medio.`,
        evidencia: "Resolución de caso, práctica supervisada o producto de taller con versiones.",
        criterio: "Pertinencia del método, justificación de decisiones y corrección de errores.",
      },
      {
        id: E.uid("ra"),
        texto: "Documentar el propio proceso de aprendizaje (borradores, bitácora, declaración de herramientas) de modo que el CRE autónomo sea auditable.",
        evidencia: "Dossier de proceso o portafolio con hitos fechados.",
        criterio: "Trazabilidad, honestidad intelectual y mejora entre versiones.",
      },
      {
        id: E.uid("ra"),
        texto: "Argumentar una decisión o interpretación con fuentes, datos y criterio ético, incluyendo límites del propio saber.",
        evidencia: "Informe de caso situado, ateneo o ensayo breve con defensa.",
        criterio: "Calidad del argumento, honestidad de fuentes y reconocimiento de objeciones.",
      },
      {
        id: E.uid("ra"),
        texto: "Comunicar y defender oralmente un producto o posición de la cátedra ante preguntas no ensayadas.",
        evidencia: "Defensa, coloquio o supervisión (8–15 min).",
        criterio: "Claridad, respuesta a imprevistos y coherencia con el proceso presentado.",
      },
    ];
  }

  function redistributeHours(ficha) {
    const a = ficha.asignatura || {};
    const acts = ficha.actividades || [];
    if (!acts.length) return ficha;
    function byTipo(tipo, total) {
      const rows = acts.filter((x) => x.tipo === tipo);
      if (!rows.length) return;
      const weights = rows.map((x) => {
        const h = E.num(x.horas);
        return h > 0 ? h : 1;
      });
      const hours = distributeInt(total, weights);
      rows.forEach((row, i) => {
        row.horas = hours[i];
      });
    }
    byTipo("ip", E.num(a.horas_interaccion));
    byTipo("ta", E.num(a.horas_autonomas));
    return ficha;
  }

  function seedActivities(ficha) {
    const a = ficha.asignatura;
    const pack = packFor(a.tipologia);
    const ra = ficha.ra && ficha.ra.length ? ficha.ra : raTemplates(a);
    ficha.ra = ra;
    const ipHours = distributeInt(a.horas_interaccion, pack.ip.map((x) => x.w));
    const taHours = distributeInt(a.horas_autonomas, pack.ta.map((x) => x.w));
    const acts = [];
    pack.ip.forEach((item, i) => {
      acts.push(makeAct("ip", item, ipHours[i], ra[Math.min(i, ra.length - 1)].id));
    });
    pack.ta.forEach((item, i) => {
      const raIdx = Math.min(i + 1, ra.length - 1);
      acts.push(makeAct("ta", item, taHours[i], ra[raIdx].id));
    });
    ficha.actividades = acts;
    if (!String(ficha.contrato_ia || "").trim()) {
      ficha.contrato_ia = E.buildContrato(ficha);
    }
    return ficha;
  }

  function exampleFicha() {
    const ficha = E.emptyFicha({
      institucion: "Universidad Católica de Cuyo",
      unidad_academica: "Unidad académica (ejemplo)",
      carrera: "Carrera de ejemplo",
      docente: "Equipo de cátedra",
      ciclo: "1.er cuatrimestre",
      asignatura: {
        codigo: "MRI-1",
        nombre: "Metodología de la investigación",
        anio: 2,
        area: "FB",
        regimen: "S",
        tipologia: "teorica",
        horas_teoricas: 48,
        horas_practicas: 16,
        horas_interaccion: 64,
        horas_autonomas: 61,
        valor_cre: 25,
        cre: 5,
      },
      _meta: { origen: "ejemplo", editado: false },
    });
    E.syncHoras(ficha);
    return seedActivities(ficha);
  }

  function applyRedesign(act) {
    const suggestion = act.rediseño || suggestRedesign(act.nombre, act.descripcion);
    if (!suggestion) return act;
    if (/ensayo|monograf|informe final/i.test(act.nombre)) {
      act.nombre = "Dossier de proceso + defensa breve";
    } else if (/resumen|glosa/i.test(act.nombre)) {
      act.nombre = "Bitácora de lectura con error deliberado";
    } else if (/powerpoint|diapositiva|presentaci/i.test(act.nombre)) {
      act.nombre = "Caso local defendido oralmente";
    } else if (/cuestionario|multiple/i.test(act.nombre)) {
      act.nombre = "Coloquio o problema abierto justificado";
    }
    act.descripcion = suggestion;
    act.ia = "verde";
    act.rediseño = suggestion;
    return act;
  }

  global.SacauAulaCatalog = {
    TIPOLOGIA_LABEL,
    REDISENOS,
    packFor,
    suggestRedesign,
    raTemplates,
    seedActivities,
    redistributeHours,
    exampleFicha,
    applyRedesign,
  };
})(typeof window !== "undefined" ? window : globalThis);
